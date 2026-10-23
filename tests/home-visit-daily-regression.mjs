import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  for(const [width,height] of [[1440,900],[390,844]]){
    const context=await browser.newContext({viewport:{width,height}});
    const methods=[];
    await context.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.pathname==='/officialwebsite/api/home-visits'){
        methods.push(route.request().method());
        return route.fulfill({json:{count:1234}});
      }
      if(url.hostname!=='www.magicj.cn')return route.abort();
      const response=await route.fetch({url:'http://127.0.0.1:4331'+url.pathname+url.search});
      return route.fulfill({response});
    });
    const page=await context.newPage();
    const ready=()=>page.waitForFunction(()=>document.querySelector('.home-visit-counter')?.dataset.count==='1234');
    await page.goto('https://www.magicj.cn/');await ready();
    assert.deepEqual(methods,['POST']);
    await page.reload();await ready();assert.deepEqual(methods,['POST','GET']);
    await page.evaluate(()=>localStorage.setItem('magicj.visit.day','2000-01-01'));
    const second=await context.newPage();
    await Promise.all([page.reload(),second.goto('https://www.magicj.cn/')]);
    await ready();await second.waitForFunction(()=>document.querySelector('.home-visit-counter')?.dataset.count==='1234');
    assert.equal(methods.filter(m=>m==='POST').length,2,'Concurrent tabs increment only once on new day');
    await second.close();
    await page.getByRole('button',{name:'访问计数设置'}).click();
    const checkbox=page.getByLabel('本人访问不统计（仅此浏览器）');
    const checkboxBox=await checkbox.boundingBox();
    await page.mouse.move(checkboxBox.x+checkboxBox.width/2,checkboxBox.y+checkboxBox.height/2,{steps:12});
    assert.equal(await checkbox.evaluate(el=>getComputedStyle(el).cursor),'pointer');
    assert.equal(await page.locator('.neon-cursor').evaluate(el=>getComputedStyle(el).display),'none');
    await page.mouse.click(checkboxBox.x+checkboxBox.width/2,checkboxBox.y+checkboxBox.height/2);
    assert.equal(await checkbox.isChecked(),true,'Actual mouse click checks box');
    const labelBox=await page.locator('.visit-settings label').boundingBox();
    await page.mouse.click(labelBox.x+labelBox.width-12,labelBox.y+labelBox.height/2);
    assert.equal(await checkbox.isChecked(),false,'Whole label toggles checkbox');
    await checkbox.check();
    const dialog=page.locator('.visit-settings');
    const box=await dialog.boundingBox();
    assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=height);
    assert.ok(Math.abs(box.x+box.width/2-width/2)<2,'Settings dialog centered');
    await page.screenshot({path:`${process.env.TEMP}/visit-settings-${width}.png`});
    await page.getByRole('button',{name:'完成',exact:true}).click();
    await page.evaluate(()=>localStorage.setItem('magicj.visit.day','2000-01-01'));
    await page.reload();await ready();assert.equal(methods.at(-1),'GET');
    await page.getByRole('button',{name:'访问计数设置'}).click();
    assert.equal(await page.getByLabel('本人访问不统计（仅此浏览器）').isChecked(),true);
    await page.getByLabel('本人访问不统计（仅此浏览器）').uncheck();
    await page.getByRole('button',{name:'完成',exact:true}).click();
    await page.reload();await ready();assert.equal(methods.at(-1),'POST');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    console.log(`PASS ${width}: daily deduplication, concurrent tabs, owner exclusion, opt-in, dialog bounds`);
    await context.close();
  }
} finally {await browser.close();}
