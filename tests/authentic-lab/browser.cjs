'use strict';
/**
 * Real Playwright Chromium -> real installed WP/GF browser qualification.
 * Do not run against a mock page; asserts native GF identifiers and request.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

async function main() {
  const root = process.env.GFNCR_LAB_DIR;
  const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixture.json')));
  const original = path.join(root, 'synthetic-original.png');
  const originalBytes = fs.readFileSync(original);
  const target = 'http://127.0.0.1:8080' + fixture.url_path;
  const browser = await chromium.launch({headless:true, args:['--no-sandbox']});
  const page = await browser.newPage({viewport:{width:1280,height:850}});
  const requests = [];
  page.on('request', (req) => {
    if (req.method() !== 'POST' || !req.url().startsWith('http://127.0.0.1:8080')) return;
    const body = req.postDataBuffer();
    requests.push({
      body_observable: !!body,
      method:'POST',
      contains_original_filename: !!body && body.includes(Buffer.from('synthetic-original.png')),
      contains_edited_filename: !!body && body.includes(Buffer.from('synthetic-original-edited.png')),
      contains_confirmation: !!body && body.includes(Buffer.from('confirmed')),
      content_type: req.headers()['content-type']?.split(';')[0] || '',
    });
  });
  try {
    await page.goto(target, {waitUntil:'domcontentloaded'});
    const formSelector = '#gform_' + fixture.form_id;
    const inputSelector = '#input_' + fixture.form_id + '_1';
    await page.locator(formSelector).waitFor();
    assert.equal(await page.locator(inputSelector).getAttribute('name'), 'input_1');
    assert.equal(await page.locator(inputSelector).getAttribute('type'), 'file');
    assert.equal(await page.locator(inputSelector).evaluate(el=>el.multiple),false);
    assert.equal(await page.locator('.gfncr-editor').count(),1,'GF must have rendered the opted-in editor');
    const initial = await page.locator('input[name="gfncr_confirm_' + fixture.form_id + '_1"]').inputValue();
    assert.equal(initial, '');

    // Bypass the client event guards deliberately. Real WordPress/GF must reject original without marker.
    const afterBefore = fs.existsSync(path.join(root,'after-submission.json'));
    assert.equal(afterBefore, false, 'Unexpected submission before negative test');
    const [, negativePreflight] = await Promise.all([
      page.waitForNavigation({waitUntil:'domcontentloaded'}),
      page.evaluate(({bytes,sel}) => {
        const input=document.querySelector(sel);
        const transfer=new DataTransfer();
        transfer.items.add(new File([new Uint8Array(bytes)], 'synthetic-original.png', {type:'image/png'}));
        input.files=transfer.files; // no change event: intentionally bypass browser controller
        const prepared = new FormData(input.form).get('input_1');
        const state={input_name:input.files[0]?.name||'',formdata_name:prepared?.name||'',method:input.form.method,enctype:input.form.enctype};
        setTimeout(()=>HTMLFormElement.prototype.submit.call(input.form),0);
        return state;
      }, {bytes:Array.from(originalBytes),sel:inputSelector})
    ]);
    fs.writeFileSync(path.join(root,'negative-preflight.json'),JSON.stringify({form:negativePreflight,requests},null,2));
    assert.equal(negativePreflight.input_name, 'synthetic-original.png');
    assert.equal(negativePreflight.formdata_name, 'synthetic-original.png');
    assert.equal(negativePreflight.method, 'post');
    assert.equal(negativePreflight.enctype, 'multipart/form-data');
    assert.ok(requests.some(x=>x.contains_original_filename && !x.contains_confirmation),
      'Negative request not observed as uploaded multipart: ' + JSON.stringify(requests));
    assert.equal(fs.existsSync(path.join(root,'after-submission.json')), false,
      'An unconfirmed original created an Entry');
    const negativeHasError = await page.locator('#gform_' + fixture.form_id + ' .gfield_validation_message, .gform_validation_errors').count();
    assert.ok(negativeHasError>0,'No Gravity Forms validation rejection appeared');

    // Fresh form for positive proof; do not call GF API for upload.
    await page.goto(target,{waitUntil:'domcontentloaded'});
    await page.locator(inputSelector).setInputFiles(original);
    await page.waitForFunction(() => {
      const editor=document.querySelector('.gfncr-editor');
      return editor && !editor.querySelector('.gfncr-controls').hidden;
    });
    assert.equal(await page.locator(inputSelector).evaluate(el=>el.files.length),0,'Unedited original was not removed');
    await page.locator('.gfncr-crop').fill('50');
    await page.locator('.gfncr-rotate').click();
    await page.locator('.gfncr-confirm').click();
    await page.waitForFunction(() => document.querySelector('.gfncr-editor input[type="hidden"]')?.value === 'confirmed');
    const edited = await page.evaluate(async ({formSelector})=>{
      const form = document.querySelector(formSelector);
      const file = new FormData(form).get('input_1');
      if (!(file instanceof File)) throw new Error('Native file input does not contain a File');
      const buffer = await file.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256',buffer);
      const sha256 = Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
      const bitmap = await createImageBitmap(file);
      const result={name:file.name,size:file.size,mime:file.type,sha256,width:bitmap.width,height:bitmap.height,
        marker: new FormData(form).get('gfncr_confirm_' + form.id.replace('gform_','') + '_1'),
        input_name:document.querySelector(formSelector+' input[type="file"]').files[0]?.name};
      bitmap.close();return result;
    },{formSelector});
    assert.deepEqual([edited.width,edited.height],[100,200]);
    assert.equal(edited.name,'synthetic-original-edited.png');
    assert.equal(edited.mime,'image/png');
    assert.equal(edited.marker,'confirmed');
    assert.equal(edited.input_name,edited.name);
    assert.notEqual(edited.sha256,crypto.createHash('sha256').update(originalBytes).digest('hex'));
    await Promise.all([
      page.waitForNavigation({waitUntil:'domcontentloaded'}),
      page.locator('#gform_submit_button_' + fixture.form_id).click()
    ]);
    const succeeded = await page.locator('#gform_confirmation_message_' + fixture.form_id).count();
    assert.ok(succeeded>0, 'Genuine Gravity Forms confirmation missing; inspect server validation before claiming persistence');
    assert.ok(requests.some(x=>x.contains_edited_filename && x.contains_confirmation && !x.contains_original_filename),
      'Genuine outgoing positive request did not carry edited File + marker');
    const evidence={qualification:'AUTHENTIC_CHROMIUM_HTTP',browser:browser.version(),fixture,negative:{
      original_http_post_seen:true,server_rejection_visible:true,no_entry_created:true,
    },positive:{edited,confirmation_visible:true},requests};
    fs.writeFileSync(path.join(root,'browser.json'),JSON.stringify(evidence,null,2));
    console.log('REAL_GF_BROWSER_POSTBACK_PASS',JSON.stringify({
      width:edited.width,height:edited.height,size:edited.size,sha256:edited.sha256,
      real_http_post:true,confirmation_visible:true,negative_rejected:true,
    }));
  } finally { await browser.close(); }
}
main().catch(err=>{console.error('REAL_GF_BROWSER_QUALIFICATION_FAIL',err.message);process.exitCode=1;});
