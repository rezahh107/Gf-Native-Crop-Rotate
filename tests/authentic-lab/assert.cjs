'use strict';
/* Compare genuine GFAPI readback, on-disk file, browser File and validation observations. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=process.env.GFNCR_LAB_DIR;
const browser=JSON.parse(fs.readFileSync(path.join(dir,'browser.json'),'utf8'));
const stored=JSON.parse(fs.readFileSync(path.join(dir,'readback.json'),'utf8'));
const fixture=JSON.parse(fs.readFileSync(path.join(dir,'fixture.json'),'utf8'));
const validations=fs.readFileSync(path.join(dir,'validation.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const negative=validations.find(x=>x.file_present && !x.marker_confirmed);
const positive=validations.find(x=>x.file_present && x.marker_confirmed);
assert.ok(negative, 'Missing unconfirmed original at real GF validation boundary');
assert.equal(negative.result_valid_at_priority_20,false,'Server accepted unconfirmed original');
assert.ok(positive,'Missing confirmed edited File at real GF validation boundary');
assert.equal(positive.result_valid_at_priority_20,true,'Valid edited upload rejected at GF validation boundary');
assert.equal(positive.file_name,'synthetic-original-edited.png');
assert.equal(positive.tmp_sha256,browser.positive.edited.sha256,'Incoming PHP upload differs from browser File');
assert.equal(stored.entry_count,1,'Negative created an Entry or positive not persisted');
assert.equal(stored.entry_form_id,fixture.form_id,'Entry associated to wrong form');
assert.ok(Number.isInteger(stored.entry_id) && stored.entry_id>0);
assert.equal(stored.field_1_exists,true);
assert.equal(stored.stored_sha256,browser.positive.edited.sha256,'Stored bytes differ from confirmed edited File');
assert.deepEqual([stored.stored_width,stored.stored_height],[100,200]);
assert.equal(stored.stored_mime,'image/png');
assert.equal(stored.stored_size,browser.positive.edited.size);
const result={status:'REAL_GF_EDITED_ENTRY_PASS',form_id:fixture.form_id,entry_id:stored.entry_id,
  source_subject_sha:process.env.GFNCR_SUBJECT_SHA,
  original_sha256:process.env.GFNCR_ORIGINAL_SHA256,
  edited_sha256:stored.stored_sha256,
  edited_width:stored.stored_width,edited_height:stored.stored_height,
  validation:{unconfirmed_rejected:true,confirmed_passed:true},
  entry_association:true,bytes_exact:true};
fs.writeFileSync(path.join(dir,'assertion.json'),JSON.stringify(result,null,2));
console.log('REAL_GF_EDITED_ENTRY_PASS',JSON.stringify(result));
