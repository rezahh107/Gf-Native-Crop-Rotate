"""Chromium new-image lifecycle regression (isolated fixture, not Gravity Forms)."""
import hashlib
import json
import os
import shutil
from pathlib import Path
from tempfile import TemporaryDirectory
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = Path(os.environ.get('GFNCR_EVIDENCE_DIR', ROOT / 'evidence'))
OUTPUT.mkdir(parents=True, exist_ok=True)

A_COLORS = [(213, 32, 127), (20, 182, 196), (234, 154, 29), (51, 35, 83)]
B_COLORS = [(232, 33, 42), (36, 181, 78), (40, 83, 224), (237, 212, 32)]


def fixture(path, size, colors):
    im = Image.new('RGB', size)
    d = ImageDraw.Draw(im)
    w, h = size
    for (x, y), color in zip(((0, 0), (w//2, 0), (0, h//2), (w//2, h//2)), colors):
        d.rectangle((x, y, x+w//2-1, y+h//2-1), fill=color)
    im.save(path)


def snapshot(page, label):
    payload = page.evaluate('''() => {
      const img=document.querySelector('.gfncr-preview');
      const input=document.querySelector('#input_1_1');
      return {src:img.src, naturalWidth:img.naturalWidth, naturalHeight:img.naturalHeight,
        computedTransform:getComputedStyle(img).transform, inlineTransform:img.style.transform,
        marker:document.querySelector('[name="gfncr_confirm_1_1"]').value,
        fileCount:input.files.length, status:document.querySelector('.gfncr-status').textContent,
        controlsHidden:document.querySelector('.gfncr-controls').hidden};
    }''')
    page.screenshot(path=str(OUTPUT / (label+'.png')), full_page=True)
    (OUTPUT / (label+'.json')).write_text(json.dumps(payload,indent=2),encoding='utf-8')
    print('OBSERVATION', label, json.dumps(payload), flush=True)
    return payload


def select(page, path, w, h):
    before = page.locator('.gfncr-preview').get_attribute('src')
    page.locator('#input_1_1').set_input_files(str(path))
    page.wait_for_function('''([w,h,src]) => {
       const img=document.querySelector('.gfncr-preview');
       return !document.querySelector('.gfncr-controls').hidden && img.complete &&
          img.naturalWidth===w && img.naturalHeight===h && img.src!==src;
    }''', arg=[w, h, before or ''])


def export_info(page):
    return page.evaluate('''async () => {
      const form=document.querySelector('form');
      const file=new FormData(form).get('input_1');
      const bitmap=await createImageBitmap(file);
      const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
      const context=canvas.getContext('2d');context.drawImage(bitmap,0,0);
      const color=(x,y)=>Array.from(context.getImageData(x,y,1,1).data).slice(0,3);
      const w=bitmap.width,h=bitmap.height;
      const result={name:file.name,mime:file.type,size:file.size,width:w,height:h,
        corners:[color(Math.floor(w/4),Math.floor(h/4)),color(Math.floor(w*3/4),Math.floor(h/4)),
          color(Math.floor(w/4),Math.floor(h*3/4)),color(Math.floor(w*3/4),Math.floor(h*3/4))],
        inputSame:file===document.querySelector('#input_1_1').files[0],
        marker:new FormData(form).get('gfncr_confirm_1_1'),
        optedOut:document.querySelector('#opted-out').files.length};
      bitmap.close();return result;
    }''')


def confirmed(page, label):
    page.locator('.gfncr-confirm').click()
    page.wait_for_function("document.querySelector('[name=gfncr_confirm_1_1]').value === 'confirmed'")
    result=export_info(page)
    blob=bytes(page.evaluate('''async () => {
       const file=new FormData(document.querySelector('form')).get('input_1');
       return Array.from(new Uint8Array(await file.arrayBuffer()));
    }'''))
    assert len(blob)==result['size']
    (OUTPUT / (label+'.png')).write_bytes(blob)
    result['sha256']=hashlib.sha256(blob).hexdigest()
    with Image.open(OUTPUT / (label+'.png')) as exported:
        assert exported.size==(result['width'],result['height'])
        rgb=exported.convert('RGB');w,h=exported.size
        observed=[list(rgb.getpixel((x,y))) for x,y in (
            (w//4,h//4),(w*3//4,h//4),(w//4,h*3//4),(w*3//4,h*3//4))]
        assert observed==result['corners'],(observed,result)
    (OUTPUT / (label+'.json')).write_text(json.dumps(result,indent=2),encoding='utf-8')
    print('EXPORTED', label, json.dumps(result), flush=True)
    assert result['inputSame'] and result['marker']=='confirmed' and result['optedOut']==0, result
    return result


def pixels(result, colors):
    assert result['corners']==[list(c) for c in colors], result


def main():
    with TemporaryDirectory() as tmp:
        a,b=Path(tmp)/'asymmetric-A.png',Path(tmp)/'asymmetric-B.png'
        fixture(a,(320,200),A_COLORS)
        fixture(b,(240,160),B_COLORS)
        print('FIXTURE',json.dumps([{'name':p.name,'bytes':p.stat().st_size} for p in (a,b)]),flush=True)
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,executable_path=os.environ.get('GFNCR_CHROMIUM') or shutil.which('chromium'),args=['--no-sandbox'])
            print('CHROMIUM',browser.version,flush=True)
            page=browser.new_page(viewport={'width':980,'height':720},device_scale_factor=1)
            page.set_content((ROOT/'tests/browser-fixture.html').read_text().replace('<script src="../assets/js/handoff.js"></script>',''))
            page.add_script_tag(content=(ROOT/'assets/js/handoff.js').read_text())
            try:
                assert page.locator('.gfncr-editor').get_attribute('data-gfncr-field') == '1'
                assert page.locator('#input_1_1').get_attribute('name') == 'input_1'
                assert page.locator('[name=gfncr_confirm_1_1]').count() == 1
                select(page,a,320,200)
                assert page.locator('#input_1_1').evaluate('(el)=>el.files.length')==0
                page.locator('.gfncr-rotate').click()
                rotated=snapshot(page,'A-rotated-unconfirmed')
                assert rotated['inlineTransform']=='rotate(90deg)',rotated
                assert page.evaluate("document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))") is False
                # Real file input change; no editor Cancel/Confirm between A and B.
                select(page,b,240,160)
                state_b=snapshot(page,'B-selected-after-rotated-A')
                page.locator('.gfncr-crop').fill('50')
                output_b=confirmed(page,'B-unrotated-export')
                assert output_b['width']==120 and output_b['height']==80,output_b
                pixels(output_b,B_COLORS)
                # The RED assertion belongs to the real new-image change lifecycle, not fixture/setup.
                assert state_b['computedTransform']=='none',(
                    'PRI-FND-001 stale preview transform after changing image A -> B: '+json.dumps(state_b))
                print('REGRESSION B STARTS UNROTATED PASS',flush=True)
                # Intentional rotation of B: 90° clockwise quadrant oracle.
                select(page,b,240,160)
                page.locator('.gfncr-crop').fill('50')
                page.locator('.gfncr-rotate').click()
                rotated_b=snapshot(page,'B-intentional-rotation')
                assert rotated_b['computedTransform']!='none'
                b90=confirmed(page,'B-rotated-export')
                assert (b90['width'],b90['height'])==(80,120),b90
                pixels(b90,[B_COLORS[2],B_COLORS[0],B_COLORS[3],B_COLORS[1]])
                # Cancel -> reselect must restore base inline transform instead of deleting layout style.
                select(page,a,320,200)
                page.locator('.gfncr-preview').evaluate("el=>el.style.transform='scale(0.9)'")
                page.locator('.gfncr-rotate').click()
                after_rotate=snapshot(page,'layout-transform-plus-editor-rotation')
                assert 'scale(0.9)' in after_rotate['inlineTransform'],after_rotate
                page.locator('.gfncr-cancel').click()
                assert page.locator('.gfncr-preview').evaluate('(el)=>el.style.transform')=='scale(0.9)'
                select(page,b,240,160)
                after_cancel=snapshot(page,'B-reselect-after-cancel')
                assert after_cancel['inlineTransform']=='scale(0.9)',after_cancel
                assert page.locator('#input_1_1').evaluate('(el)=>el.files.length')==0
                assert page.locator('[name=gfncr_confirm_1_1]').input_value()==''
                print('CANCEL RESELECT + LAYOUT TRANSFORM PASS',flush=True)
                # Unsupported input must be cleared and deny submission.
                invalid=Path(tmp)/'unsupported.txt';invalid.write_text('unsupported')
                page.locator('#input_1_1').set_input_files(str(invalid))
                assert page.locator('#input_1_1').evaluate('(el)=>el.files.length')==0
                assert 'Only JPG/PNG' in page.locator('.gfncr-status').inner_text()
                assert page.evaluate("document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))") is False
                select(page,b,240,160)
                assert page.locator('[name=gfncr_confirm_1_1]').input_value()==''
                print('UNSUPPORTED + RETRY FAIL-CLOSED PASS',flush=True)
                # Decode error, no original-file fallback; successful subsequent retry.
                page.evaluate('''() => {
                   window.__originalBitmap = window.createImageBitmap;
                   window.createImageBitmap=() => Promise.reject(new Error('controlled decode failure'));
                }''')
                page.locator('#input_1_1').set_input_files(str(a))
                page.wait_for_function("document.querySelector('.gfncr-status').textContent.includes('Could not open')")
                assert page.locator('#input_1_1').evaluate('(i)=>i.files.length') == 0
                assert page.locator('[name=gfncr_confirm_1_1]').input_value() == ''
                assert page.evaluate("document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))") is False
                page.evaluate('() => {window.createImageBitmap=window.__originalBitmap;}')
                select(page,b,240,160)
                print('DECODE FAILURE/RETRY FAIL-CLOSED PASS',flush=True)
                # Export error: Canvas returns null, no edited or original file accepted.
                page.evaluate('''() => {
                   window.__originalToBlob=HTMLCanvasElement.prototype.toBlob;
                   HTMLCanvasElement.prototype.toBlob=function(cb){cb(null);};
                }''')
                page.locator('.gfncr-confirm').click()
                page.wait_for_function("document.querySelector('.gfncr-status').textContent.includes('could not be handed')")
                assert page.locator('#input_1_1').evaluate('(i)=>i.files.length') == 0
                assert page.locator('[name=gfncr_confirm_1_1]').input_value() == ''
                assert page.evaluate("document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))") is False
                page.evaluate('() => {HTMLCanvasElement.prototype.toBlob=window.__originalToBlob;}')
                select(page,b,240,160)
                page.locator('.gfncr-crop').fill('50')
                retried=confirmed(page,'B-after-export-failure-retry')
                assert (retried['width'],retried['height'])==(120,80),retried
                pixels(retried,B_COLORS)
                print('EXPORT FAILURE/RETRY FAIL-CLOSED PASS',flush=True)
                # Stale first decode may complete only after second image has become active.
                page.evaluate('''() => {const real=createImageBitmap;let calls=0;window.createImageBitmap=(file)=>{
                 if(++calls===1)return new Promise((resolve,reject)=>setTimeout(()=>real(file).then(resolve,reject),250));
                 return real(file);};}''')
                page.locator('#input_1_1').set_input_files(str(a))
                select(page,b,240,160)
                page.wait_for_timeout(350)
                stale=snapshot(page,'B-after-stale-A-decode')
                assert (stale['naturalWidth'],stale['naturalHeight'])==(240,160),stale
                page.locator('.gfncr-crop').fill('50')
                fresh=confirmed(page,'B-after-stale-A-export')
                assert (fresh['width'],fresh['height'])==(120,80),fresh
                pixels(fresh,B_COLORS)
                print('STALE ASYNC CHANGE PASS',flush=True)
                print('ALL BROWSER REGRESSIONS PASS',flush=True)
            finally:
                browser.close()

if __name__=='__main__': main()
