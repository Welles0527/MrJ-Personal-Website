const fs = require('node:fs'), http = require('node:http'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const { build } = require('esbuild'), { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const evidence = process.env.STUDIO_STATUS_EVIDENCE || fs.mkdtempSync(path.join(os.tmpdir(), 'studio-autosave-'));
const mock = `
let session={uid:'test-a',account:'test@example.test'};
const initial={items:[{id:'task',title:'验证用任务',cat:'其他',sub:'',done:false}],tree:[{id:'root',kind:'cat',label:'其他',parent:null,order:0},{id:'node',kind:'idea',itemId:'task',parent:'root',order:0}],bookmarks:[],trash:[]};
let docs=JSON.parse(localStorage.getItem('test-cloud')||'null')||{'test-a':{_id:'test-a',ownerId:'test-a',schemaVersion:1,revision:1,payload:JSON.stringify(initial)}};
const persist=()=>localStorage.setItem('test-cloud',JSON.stringify(docs));
const refresh=()=>{docs=JSON.parse(localStorage.getItem('test-cloud'))};
persist();window.testWrites=0;window.testAttempts=0;
window.cloudDoc=()=>{refresh();return structuredClone(docs[session.uid])};
window.remoteEdit=()=>{refresh();const d=docs[session.uid],data=JSON.parse(d.payload);data.items[0].title='远端修改';d.payload=JSON.stringify(data);d.revision++;persist()};
window.testAccount=uid=>{session=uid?{uid,account:uid}:null;window.dispatchEvent(new CustomEvent('site-auth-change',{detail:session}))};
window.testGate=kind=>{window[kind+'Gate']=new Promise(resolve=>window['release'+kind]=()=>{window[kind+'Gate']=null;resolve()})};
export const getCloudSession=async()=>session;
export const signInWithPassword=async()=>session;
export const signOut=async()=>{session=null;window.dispatchEvent(new CustomEvent('site-auth-change',{detail:null}))};
export const getCloudDb=()=>({collection:()=>({
doc:uid=>({get:async()=>{await window.readGate;if(window.failRead)throw Error('测试读取中断');refresh();const d=structuredClone(docs[uid]);if(d&&window.badRead&&window.testWrites)d.revision+=100;return {data:d?[d]:[]}}}),
where:q=>({update:async payload=>{window.testAttempts++;await window.writeGate;if(window.failWrite)throw Error('测试保存中断');refresh();const d=docs[q._id];if(q.revision!==d.revision)return {updated:0};window.testWrites++;docs[q._id]={...d,...payload};persist();if(window.lostResponse)throw Error('测试响应丢失');return {updated:1}}}),
add:async payload=>{window.testAttempts++;if(docs[payload._id])throw Error('duplicate');docs[payload._id]=payload;window.testWrites++;persist();return {id:payload._id}}
})});`;
(async () => {
  fs.mkdirSync(evidence, { recursive: true });
  const bundle = await build({ entryPoints: [path.join(root, 'src/scripts/inspiration-studio-cloud.ts')], bundle: true, format: 'esm', write: false, plugins: [{ name: 'test-auth', setup(b) {
    b.onResolve({ filter: /^\.\/site-auth$/ }, () => ({ path: 'mock', namespace: 'test' }));
    b.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: mock, loader: 'ts' }));
  } }] });
  const server = http.createServer((req, res) => {
    const cloud = req.url.includes('inspiration-studio-cloud.js'), js = req.url.includes('.js');
    res.setHeader('Content-Type', js ? 'application/javascript' : 'text/html; charset=utf-8');
    res.end(cloud ? bundle.outputFiles[0].text : js ? '' : fs.readFileSync(path.join(root, 'public/inspiration-studio.html')));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  const url='http://127.0.0.1:'+server.address().port;
  const newPage=async width=>{
    const context=await browser.newContext({viewport:{width,height:width===1440?900:844},acceptDownloads:true});
    const page=await context.newPage();
    page.on('dialog',d=>d.accept());
    const errors=[];page.on('pageerror',e=>errors.push(e.message));page.testErrors=errors;
    await page.clock.install({time:new Date('2026-10-28T00:00:00Z')});await page.clock.pauseAt(new Date('2026-10-28T00:00:01Z'));await page.goto(url);
    await page.waitForFunction(()=>!document.querySelector('#new').disabled);return page;
  };
  const edit=async(page,title)=>page.evaluate(title=>{
    const data=window.InspirationStudioStore.snapshot();data.items[0].title=title;
    window.InspirationStudioStore.replace(data);window.dispatchEvent(new Event('inspiration-studio-change'));
  },title);
  const drafts=page=>page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('magicj.inspiration-draft.v1:')).map(k=>JSON.parse(localStorage[k])));
  const saved=page=>page.waitForFunction(()=>document.querySelector('#syncStatus').textContent==='已保存至账号');
  // runFor advances browser timers; microtasks are explicitly settled without a fake-clock timeout.
  const advance=async(page,ms)=>{await page.clock.runFor(ms);await page.evaluate(()=>Promise.resolve());};
  try {
    for(const width of [1440,390]){
      const page=await newPage(width);
      await page.locator('[data-toggle="task"]').first().click();
      assert.equal(await page.locator('#new').isEnabled(),true);
      assert.equal((await drafts(page))[0].data.items[0].done,true);
      await advance(page,4000);assert.equal(await page.evaluate(()=>testWrites),0);
      await edit(page,'连续修改');await advance(page,4999);assert.equal(await page.evaluate(()=>testWrites),0);
      await advance(page,1);await saved(page);assert.equal(await page.evaluate(()=>testWrites),1);
      assert.equal((await drafts(page)).length,0);
      // A continuous stream has a hard deadline at ten seconds.
      await edit(page,'持续0');
      for(let i=1;i<=4;i++){await advance(page,2000);await edit(page,'持续'+i)}
      assert.equal(await page.evaluate(()=>testWrites),1);
      await advance(page,2000);await saved(page);assert.equal(await page.evaluate(()=>testWrites),2);
      // Upload in flight must not disable real editing or clear newer drafts.
      await page.evaluate(()=>testGate('write'));await edit(page,'上传批次');await advance(page,5000);
      await page.locator('[data-add-parent="node"]').first().click();await page.locator('#editor[open]').waitFor();
      await page.locator('#editor').evaluate(d=>d.close());
      await edit(page,'上传期间新增');assert.equal(await page.locator('#new').isEnabled(),true);
      await advance(page,10000);await page.evaluate(()=>releasewrite());
      await saved(page);assert.equal(await page.evaluate(()=>JSON.parse(cloudDoc().payload).items[0].title),'上传期间新增');
      assert.equal((await drafts(page)).length,0);
      // Failed writes retain edits and stop automatic retries until explicit sync.
      await page.evaluate(()=>{window.failWrite=true});await edit(page,'断网草稿');await advance(page,5000);
      await page.waitForFunction(()=>document.querySelector('#syncStatus').textContent.startsWith('未保存：'));
      const attempts=await page.evaluate(()=>testAttempts);await advance(page,30000);
      assert.equal(await page.evaluate(()=>testAttempts),attempts);
      await edit(page,'断网后继续编辑');assert.equal((await drafts(page))[0].data.items[0].title,'断网后继续编辑');
      assert.equal(await page.locator('#new').isEnabled(),true);
      await page.screenshot({path:path.join(evidence,'failure-'+width+'.png')});
      await page.reload();await page.waitForFunction(()=>!document.querySelector('#new').disabled);
      assert.equal(await page.evaluate(()=>InspirationStudioStore.snapshot().items[0].title),'断网后继续编辑');
      await page.locator('#studioSync').click();await saved(page);
      assert.equal(await page.evaluate(()=>JSON.parse(cloudDoc().payload).items[0].title),'断网后继续编辑');
      // A successful write with a lost response is recognized after reload, without a duplicate write.
      await page.evaluate(()=>{window.lostResponse=true});await edit(page,'响应丢失');await advance(page,5000);
      await page.waitForFunction(()=>document.querySelector('#syncStatus').textContent.startsWith('未保存：'));
      await page.reload();await page.waitForFunction(()=>document.querySelector('#syncStatus').textContent==='已同步');
      assert.equal((await drafts(page)).length,0);assert.equal(await page.evaluate(()=>testWrites),0);
      // Conflict retains both versions and never automatically overwrites the remote document.
      await edit(page,'本机冲突版本');await page.evaluate(()=>remoteEdit());await advance(page,5000);
      await page.waitForFunction(()=>document.querySelector('#syncStatus').textContent.includes('冲突'));
      await page.locator('#studioSync').click();await page.waitForFunction(()=>document.querySelector('#syncStatus').textContent.startsWith('同步失败：'));
      assert.equal(await page.evaluate(()=>JSON.parse(cloudDoc().payload).items[0].title),'远端修改');
      assert.equal(await page.evaluate(()=>InspirationStudioStore.snapshot().items[0].title),'本机冲突版本');
      const dl=page.waitForEvent('download');await page.getByRole('button',{name:'下载本机草稿',exact:true}).click();
      const file=await dl;const backup=JSON.parse(fs.readFileSync(await file.path(),'utf8'));assert.equal(backup.items[0].title,'本机冲突版本');
      assert.equal(await page.locator('#syncStatus').isVisible(),true);
      await page.screenshot({path:path.join(evidence,'conflict-'+width+'.png')});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.getByRole('button',{name:'保留草稿并读取云端',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('#syncStatus').textContent==='已同步');
      assert.equal(await page.evaluate(()=>InspirationStudioStore.snapshot().items[0].title),'远端修改');
      assert.equal(await page.getByRole('button',{name:'下载本机草稿',exact:true}).isVisible(),true);
      // Account switching never transfers the previous account's pending edits.
      await edit(page,'账号A待保存');await page.evaluate(()=>testAccount('test-b'));
      await page.waitForFunction(()=>document.querySelector('#syncStatus').textContent==='已同步');
      assert.equal(await page.evaluate(()=>InspirationStudioStore.snapshot().items.length),0);
      assert((await drafts(page)).some(d=>d.uid==='test-a'&&d.data.items[0].title==='账号A待保存'));
      await page.evaluate(()=>testAccount('test-a'));await page.waitForFunction(()=>document.querySelector('#syncStatus').textContent.includes('草稿'));
      assert.equal(await page.evaluate(()=>InspirationStudioStore.snapshot().items[0].title),'账号A待保存');
      // Export/logout must not proceed with unresolved saves; explicit sync flushes the queue.
      await page.locator('#studioSync').click();await saved(page);
      await page.locator('#studioLogout').click();await page.waitForFunction(()=>document.querySelector('#syncStatus').textContent==='登录后同步');
      assert.deepEqual(page.testErrors,[]);
      results.push({width,idle5s:true,max10s:true,editableDuringUpload:true,reloadRecovery:true,lostResponse:true,conflict:true,accountIsolation:true});
      await page.close();
    }
    // Offline reload restores the durable draft and keeps editing available without auto-retries.
    {
      const page=await newPage(1440);await page.evaluate(()=>{window.failWrite=true});await edit(page,'离线前草稿');
      await page.addInitScript(()=>{window.failRead=true});await page.reload();
      await page.waitForFunction(()=>document.querySelector('#syncStatus').textContent.startsWith('同步失败：'));
      assert.equal(await page.locator('#new').isEnabled(),true);
      assert.equal(await page.evaluate(()=>InspirationStudioStore.snapshot().items[0].title),'离线前草稿');
      await edit(page,'离线恢复后编辑');await advance(page,30000);assert.equal(await page.evaluate(()=>testAttempts),0);
      await page.evaluate(()=>{window.failRead=false});await page.locator('#studioSync').click();await saved(page);
      assert.equal(await page.evaluate(()=>JSON.parse(cloudDoc().payload).items[0].title),'离线恢复后编辑');await page.close();
    }
    // A failed read-back must retain the draft, even if the write itself succeeded.
    {
      const page=await newPage(1440);await page.evaluate(()=>{window.badRead=true});await edit(page,'核验不一致');await advance(page,5000);
      await page.waitForFunction(()=>document.querySelector('#syncStatus').textContent.includes('核验失败'));
      assert.equal((await drafts(page)).length,1);assert.equal(await page.locator('#new').isEnabled(),true);
      await page.evaluate(()=>{window.badRead=false});await page.locator('#studioSync').click();
      await page.waitForFunction(()=>document.querySelector('#syncStatus').textContent==='已同步');
      assert.equal((await drafts(page)).length,0);assert.equal(await page.evaluate(()=>testWrites),1);await page.close();
    }
    // Two live tabs must preserve independent drafts and reject a stale revision.
    {
      const first=await newPage(1440), second=await first.context().newPage();
      second.on('dialog',d=>d.accept());await second.clock.install({time:new Date('2026-10-28T00:00:00Z')});await second.clock.pauseAt(new Date('2026-10-28T00:00:01Z'));
      await second.goto(url);await second.waitForFunction(()=>!document.querySelector('#new').disabled);
      await first.evaluate(()=>testGate('write'));await second.evaluate(()=>testGate('write'));await edit(first,'窗口一版本');await edit(second,'窗口二版本');await first.waitForFunction(()=>Object.keys(localStorage).filter(k=>k.startsWith('magicj.inspiration-draft.v1:')).length===2);assert.equal((await drafts(first)).length,2);
      await advance(first,5000);await first.evaluate(()=>releasewrite());await saved(first);await second.evaluate(()=>releasewrite());
      await second.waitForFunction(()=>document.querySelector('#syncStatus').textContent.includes('冲突'));
      assert.equal((await drafts(second))[0].data.items[0].title,'窗口二版本');
      assert.equal(await second.evaluate(()=>JSON.parse(cloudDoc().payload).items[0].title),'窗口一版本');
      await first.close();await second.close();
    }
    // Divergent recovered drafts stay blocked across repeated sync, with both versions downloadable.
    {
      const page=await newPage(1440);await page.evaluate(()=>{window.failWrite=true});await edit(page,'恢复版本一');
      await page.evaluate(()=>{const k=Object.keys(localStorage).find(k=>k.startsWith('magicj.inspiration-draft.v1:'));const d=JSON.parse(localStorage[k]);d.data.items[0].title='恢复版本二';localStorage.setItem(k+'other',JSON.stringify(d))});
      await page.reload();await page.waitForFunction(()=>document.querySelector('#syncStatus').textContent.includes('多个'));
      await page.locator('#studioSync').click();await advance(page,15000);
      assert.equal(await page.evaluate(()=>testAttempts),0);assert.equal((await drafts(page)).length,2);await page.close();
    }
    // Storage failure must be visible and leave the latest in-memory draft available for download.
    const page=await newPage(1440);
    await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('magicj.inspiration-draft'))throw Error('quota');return original.call(this,k,v)}});
    await edit(page,'存储已满但仍可下载');assert.equal(await page.locator('#new').isDisabled(),true);
    assert.match(await page.locator('#syncStatus').innerText(),/本机草稿保存失败/);
    const dl=page.waitForEvent('download');await page.getByRole('button',{name:'下载本机草稿',exact:true}).click();
    const f=await dl;assert.equal(JSON.parse(fs.readFileSync(await f.path(),'utf8')).items[0].title,'存储已满但仍可下载');
    assert.deepEqual(page.testErrors,[]);await page.close();
    fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify(results,null,2));console.log('PASS',JSON.stringify(results),'offline recovery, read-back mismatch, two-tab conflict, multiple drafts, storage quota protected',evidence);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
