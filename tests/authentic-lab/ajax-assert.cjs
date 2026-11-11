'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.GFNCR_LAB_DIR;
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const standard=read('browser.json');
const iframe=read('ajax-iframe.json');
const modern=read('ajax-ajax.json');
const readback=read('ajax-readback.json');
const checks=[standard.positive.edited,iframe.edited,modern.edited];
assert.ok(iframe.passed && modern.passed,'An AJAX browser path did not produce a confirmation');
assert.equal(iframe.rendered_method,'iframe');
assert.equal(modern.rendered_method,'ajax');
assert.equal(readback.entry_count,3,'Wrong Entry count after actual postback + iframe + modern AJAX');
assert.equal(readback.entries.length,3);
const ids=new Set();
for (const entry of readback.entries) {
  assert.equal(entry.form_id,readback.form_id);
  assert.ok(Number.isSafeInteger(entry.entry_id)&&entry.entry_id>0);
  ids.add(entry.entry_id);
  assert.equal(entry.sha256,checks[0].sha256,'A stored Entry differs from browser-generated edited File');
  assert.equal(entry.size,checks[0].size);
  assert.equal(entry.width,100);
  assert.equal(entry.height,200);
  assert.equal(entry.mime,'image/png');
}
assert.equal(ids.size,3);
assert.ok(checks.every(c=>c.sha256===checks[0].sha256),'Submission modes generated different edited output');
const out={status:'REAL_GF_ALL_THREE_METHODS_SAVED_ENTRY_PASS',form_id:readback.form_id,entry_ids:[...ids].sort((a,b)=>a-b),
  modes:['postback','iframe','ajax'],stored_sha256:checks[0].sha256,stored_size:checks[0].size,
  dimensions:[100,200],all_entry_associations:true,byte_exact:true,
  iframe_http_request_types:iframe.requests.map(x=>x.type),
  ajax_http_request_types:modern.requests.map(x=>x.type)};
fs.writeFileSync(path.join(root,'ajax-assertion.json'),JSON.stringify(out,null,2));
console.log('REAL_GF_ALL_THREE_METHODS_SAVED_ENTRY_PASS',JSON.stringify(out));
