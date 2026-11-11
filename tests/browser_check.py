"""Isolated real Chromium FileList/Canvas experiment; never a Gravity Forms integration test."""
from pathlib import Path
import os
import shutil
from tempfile import TemporaryDirectory
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent
with TemporaryDirectory() as tmp:
    original = Path(tmp) / 'original.png'
    image = Image.new('RGB', (400, 200), '#eb2525')
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 199, 199), fill='#28a0e5')
    image.save(original)
    original_bytes = original.read_bytes()
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('GFNCR_CHROMIUM') or shutil.which('chromium'), headless=True, args=['--no-sandbox'])
        page = browser.new_page()
        page.set_content((root / 'browser-fixture.html').read_text().replace('<script src="../assets/js/handoff.js"></script>', ''))
        page.add_script_tag(content=(root.parent / 'assets/js/handoff.js').read_text())
        page.locator('#input_1_1').set_input_files(str(original))
        page.wait_for_function("document.querySelector('.gfncr-preview').src.startsWith('blob:')")
        assert page.locator('#input_1_1').evaluate('(i)=>i.files.length') == 0, 'original was not cleared'
        assert page.evaluate("document.querySelector('form').dispatchEvent(new Event('submit', {bubbles:true,cancelable:true}))") is False, 'unconfirmed submit not blocked'
        page.locator('.gfncr-crop').fill('50')
        page.locator('.gfncr-rotate').click()
        page.locator('.gfncr-confirm').click()
        page.wait_for_function("document.querySelector('input[name=gfncr_confirm_1_1]').value === 'confirmed'")
        values = page.evaluate('''async () => {
            const form = document.querySelector('form');
            const file = new FormData(form).get('input_1');
            const bitmap = await createImageBitmap(file);
            const bytes = new Uint8Array(await file.arrayBuffer());
            return { name: file.name, size: file.size, mime: file.type, width:bitmap.width,
                height:bitmap.height, inputIsFile:file===document.querySelector('#input_1_1').files[0],
                signature: Array.from(bytes.slice(0, 8)), confirmed:new FormData(form).get('gfncr_confirm_1_1'),
                optedOut:document.querySelector('#opted-out').files.length };
        }''')
        assert values['width'] == 100 and values['height'] == 200, values
        assert values['size'] != len(original_bytes), values
        assert values['mime'] == 'image/png' and values['name'] == 'original-edited.png', values
        assert values['confirmed'] == 'confirmed' and values['optedOut'] == 0, values
        assert values['signature'] == [137,80,78,71,13,10,26,10], values
        print('BROWSER CONFIRM PASS',values)
        page.locator('#input_1_1').set_input_files(str(original))
        page.wait_for_function("!document.querySelector('.gfncr-controls').hidden")
        assert page.locator('input[name="gfncr_confirm_1_1"]').input_value() == '', 'old confirmation survived reselection'
        assert page.locator('#input_1_1').evaluate('(i)=>i.files.length') == 0, 'old edited file survived reselection'
        page.locator('.gfncr-cancel').click()
        assert page.locator('#input_1_1').evaluate('(i)=>i.files.length') == 0
        assert page.locator('input[name="gfncr_confirm_1_1"]').input_value() == ''
        print('BROWSER RESELECT/CANCEL PASS')
        invalid = Path(tmp) / 'invalid.txt'
        invalid.write_text('not an image')
        page.locator('#input_1_1').set_input_files(str(invalid))
        assert page.locator('#input_1_1').evaluate('(i)=>i.files.length') == 0
        assert 'Only JPG/PNG' in page.locator('.gfncr-status').inner_text()
        assert page.evaluate("document.querySelector('form').dispatchEvent(new Event('submit', {bubbles:true,cancelable:true}))") is False
        print('BROWSER UNSUPPORTED FORMAT FAIL-CLOSED PASS')
        browser.close()
