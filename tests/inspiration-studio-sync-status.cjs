const fs = require('node:fs'), http = require('node:http'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const { build } = require('esbuild'), { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const evidence = process.env.STUDIO_STATUS_EVIDENCE || fs.mkdtempSync(path.join(os.tmpdir(), 'studio-status-'));
const mock = `
let session={uid:'test-a',account:'test@example.test'};
const data={items:[{id:'task',title:'验证用任务',cat:'其他',sub:'',done:false}],tree:[{id:'root',kind:'cat',label:'其他',parent:null,order:0},{id:'node',kind:'idea',itemId:'task',parent:'root',order:0}],bookmarks:[],trash:[]};
let doc={_id:'test-a',ownerId:'test-a',schemaVersion:1,revision:1,payload:JSON.stringify(data)};
window.testWrites=0;
window.testGate=kind=>{window[kind+'Gate']=new Promise(resolve=>window['release'+kind]=()=>{window[kind+'Gate']=null;resolve()})};
export const getCloudSession=async()=>session;
export const signInWithPassword=async()=>session;
export const signOut=async()=>{session=null};
export const getCloudDb=()=>({collection:()=>({
doc:()=>({get:async()=>{await window.readGate;if(window.failRead)throw Error('测试网络中断');return {data:[structuredClone(doc)]}}}),
where:q=>({update:async payload=>{await window.writeGate;if(window.failWrite)throw Error('测试保存中断');if(q.revision!==doc.revision)return {updated:0};window.testWrites++;doc={...doc,...payload};return {updated:1}}}),
add:async()=>{throw Error('unexpected add')}
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
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: width === 1440 ? 900 : 844 } });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:' + server.address().port);
      const ready = () => page.waitForFunction(() => !document.querySelector('#new').disabled);
      const blockedClick = async expected => {
        await page.locator('[data-edit="task"]').first().click();
        assert.match(await page.locator('#toast').innerText(), expected);
        assert.doesNotMatch(await page.locator('#toast').innerText(), /请先登录/);
        assert.equal(await page.locator('dialog[open]').count(), 0);
      };
      await ready();
      await page.evaluate(() => window.testGate('write'));
      await page.locator('[data-toggle="task"]').first().click();
      await page.waitForFunction(() => document.querySelector('#syncStatus').textContent === '正在保存…');
      await blockedClick(/正在保存到云端/);
      await page.screenshot({ path: path.join(evidence, 'saving-' + width + '.png') });
      await page.evaluate(() => window.releasewrite()); await ready();
      assert.equal(await page.locator('#syncStatus').innerText(), '已保存至账号');
      await page.evaluate(() => window.testGate('read'));
      await page.locator('#studioSync').click();
      await blockedClick(/正在读取最新云端数据/);
      await page.evaluate(() => window.releaseread()); await ready();
      await page.evaluate(() => { window.failWrite = true; });
      await page.locator('[data-toggle="task"]').first().click();
      await page.waitForFunction(() => document.querySelector('#syncStatus').textContent.startsWith('未保存：'));
      await blockedClick(/测试保存中断.*点击同步/);
      await page.evaluate(() => { window.failWrite = false; window.failRead = true; });
      await page.locator('#studioSync').click();
      await page.waitForFunction(() => document.querySelector('#syncStatus').textContent.startsWith('同步失败：'));
      await blockedClick(/测试网络中断.*点击同步/);
      await page.evaluate(() => { window.failRead = false; }); await page.locator('#studioSync').click(); await ready();
      await page.locator('[data-add-parent="node"]').first().click();
      await page.locator('#editor[open]').waitFor();
      assert.equal(await page.evaluate(() => window.testWrites), 1);
      assert.deepEqual(errors, []);
      results.push({ width, saving: true, syncing: true, failedSave: true, failedRead: true, recoveredEditor: true });
      await page.close();
    }
    fs.writeFileSync(path.join(evidence, 'result.json'), JSON.stringify(results, null, 2));
    console.log('PASS', JSON.stringify(results));
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });

