import { chromium } from 'playwright';
const out = '/Users/minjeong/Desktop/holey/reference/vibe';
const [,, name='home', url='https://vibebevvy.com/'] = process.argv;
const browser = await chromium.launch({ channel: 'chrome' });
const page = await (await browser.newContext({ viewport:{width:1440,height:900} })).newPage();
await page.goto(url,{waitUntil:'networkidle',timeout:60000}).catch(()=>{});
const H = await page.evaluate(()=>{const w=document.querySelector('.page-wrapper');return w?w.scrollHeight:document.documentElement.scrollHeight});
let i=0;
for (let y=0;y<H;y+=850){
  await page.evaluate(y=>{const w=document.querySelector('.page-wrapper'); (w||window).scrollTo(0,y)},y);
  await page.waitForTimeout(1300);
  await page.screenshot({path:`${out}/${name}-desktop-s${String(i++).padStart(2,'0')}.png`});
}
console.log(H,i); await browser.close();
