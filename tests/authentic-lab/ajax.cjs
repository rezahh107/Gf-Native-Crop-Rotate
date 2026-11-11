'use strict';
/**
 * Actual GF 3.1.1.1 legacy iframe and modern AJAX positive paths.
 * Execute only after the independent standard postback/Entry proof has passed.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const { chromium }=require('playwright');
const root=process.env.GFNCR_LAB_DIR;
const fixture=JSON.parse(fs.readFileSync(path.join(root,'fixture.json'),'utf8'));
const original=path.join(root,'synthetic-original.png');
const subjectSha=process.env.GFNCR_SUBJECT_SHA;
const url='http://127.0.0.1:8080';
const browserArgs={headless:true,args:['--no-sandbox']};

async function exercise(browser,mode,pagePath,expectedMethod){
  assert.ok(pagePath && typeof pagePath==='string','Missing real Ajax page');
  const page=await browser.newPage({viewport:{width:1280,height:850}});
  const requests=[],problems=[];
  const evidence={mode,expected_method:expectedMethod,subject_sha:subjectSha,fixture_form_id:fixture.form_id,requests,problems};
  page.on('request',req=>{
    if(req.method()!=='POST'||!req.url().startsWith(url)) return;
    let frame='unknown';
    try{frame=req.frame().parentFrame()?'subframe':'main';}catch(e){}
    requests.push({type:req.resourceType(),frame,method:'POST',path:new URL(req.url()).pathname,
      content_type:(req.headers()['content-type']||'').split(';')[0]});
  });
  page.on('pageerror',e=>problems.push({type:'pageerror',message:String(e.message).slice(0,150)}));
  try{
    await page.goto(url+pagePath,{waitUntil:'domcontentloaded'});
    const form='#gform_'+fixture.form_id;
    const input='#input_'+fixture.form_id+'_1';
    await page.locator(form).waitFor({timeout:10000});
    const actualMethod=await page.locator(form+' input[name="gform_submission_method"]').inputValue();
    evidence.rendered_method=actualMethod;
    assert.equal(actualMethod,expectedMethod,'GF actual native submission_method differs');
    assert.equal(await page.locator(input).getAttribute('name'),'input_1');
    assert.equal(await page.locator('.gfncr-editor').count(),1);
    await page.locator(input).setInputFiles(original);
    await page.waitForFunction(()=>{const ed=document.querySelector('.gfncr-editor');return ed&&!ed.querySelector('.gfncr-controls').hidden;},null,{timeout:10000});
    assert.equal(await page.locator(input).evaluate(e=>e.files.length),0,'Original remains in the native input');
    await page.locator('.gfncr-crop').fill('50');
    await page.locator('.gfncr-rotate').click();
    await page.locator('.gfncr-confirm').click();
    await page.waitForFunction(()=>document.querySelector('.gfncr-editor input[type="hidden"]')?.value==='confirmed',null,{timeout:10000});
    evidence.edited=await page.evaluate(async formSelector=>{
      const form=document.querySelector(formSelector);
      const f=new FormData(form).get('input_1');
      if(!(f instanceof File))throw Error('No native uploaded File');
      const hash=await crypto.subtle.digest('SHA-256',await f.arrayBuffer());
      const sha256=Array.from(new Uint8Array(hash)).map(x=>x.toString(16).padStart(2,'0')).join('');
      const bitmap=await createImageBitmap(f);
      const result={name:f.name,size:f.size,mime:f.type,width:bitmap.width,height:bitmap.height,sha256,
        marker:new FormData(form).get('gfncr_confirm_'+form.id.replace('gform_','')+'_1'),
        input_name:form.querySelector('input[type=file]').files[0]?.name};
      bitmap.close();return result;
    },form);
    assert.deepEqual([evidence.edited.width,evidence.edited.height],[100,200]);
    assert.equal(evidence.edited.mime,'image/png');
    assert.equal(evidence.edited.marker,'confirmed');
    assert.equal(evidence.edited.input_name,evidence.edited.name);
    assert.equal(evidence.edited.name,'synthetic-original-edited.png');
    await page.locator('#gform_submit_button_'+fixture.form_id).click();
    await page.locator('#gform_confirmation_message_'+fixture.form_id).waitFor({timeout:18000});
    evidence.confirmation_visible=true;
    assert.ok(requests.some(x=>x.method==='POST'),'No HTTP POST observed for '+mode);
    evidence.passed=true;
    console.log('REAL_GF_AJAX_BROWSER_PASS',JSON.stringify({
      mode,rendered_method:actualMethod,edited_sha256:evidence.edited.sha256,post_count:requests.length,
      request_types:requests.map(x=>x.type),frame_classes:requests.map(x=>x.frame),
    }));
  }catch(e){
    evidence.passed=false;
    evidence.failure=String(e.message).slice(0,350);
    console.error('REAL_GF_AJAX_BROWSER_FAIL',JSON.stringify({mode,method:evidence.rendered_method||null,failure:evidence.failure}));
    throw e;
  }finally{
    fs.writeFileSync(path.join(root,'ajax-'+mode+'.json'),JSON.stringify(evidence,null,2));
    await page.close();
  }
}
(async()=>{
 const browser=await chromium.launch(browserArgs);
 try{
   await exercise(browser,'iframe',fixture.legacy_url_path,'iframe');
   await exercise(browser,'ajax',fixture.modern_url_path,'ajax');
 }finally{await browser.close();}
})().catch(e=>{console.error('GF_REAL_AJAX_QUALIFICATION_INCOMPLETE',String(e.message).slice(0,200));process.exitCode=1;});
