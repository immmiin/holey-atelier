import { chromium } from 'playwright';
const out = '/Users/minjeong/Desktop/holey/reference/vibe';
const pages = [['home','https://vibebevvy.com/'],['product','https://vibebevvy.com/products/purple-rain'],['collection','https://vibebevvy.com/collections/all'],['404','https://vibebevvy.com/pages/nope']];
const browser = await chromium.launch({ channel: 'chrome' });
for (const [w,h,tag] of [[1440,900,'desktop'],[375,812,'mobile']]) {
  const ctx = await browser.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:1 });
  const page = await ctx.newPage();
  for (const [name,url] of pages) {
    await page.goto(url,{waitUntil:'networkidle',timeout:60000}).catch(()=>{});
    // scroll through to trigger lazy stuff
    const H = await page.evaluate(()=>document.documentElement.scrollHeight);
    for (let y=0;y<H;y+=600){ await page.evaluate(y=>window.scrollTo(0,y),y); await page.waitForTimeout(120);}    
    await page.evaluate(()=>window.scrollTo(0,0)); await page.waitForTimeout(800);
    await page.screenshot({path:`${out}/${name}-${tag}-fold.png`});
    await page.screenshot({path:`${out}/${name}-${tag}-full.png`, fullPage:true});
    console.log('ok',name,tag,H);
  }
  await ctx.close();
}
await browser.close();
