import sharp from 'sharp';
const out=[];const comps=[];
for (let n=1;n<=6;n++){
const {data,info}=await sharp(`public/socks/0${n}.webp`).raw().toBuffer({resolveWithObject:true});
const W=info.width,H=info.height,C=info.channels;
let sx=0,sy=0,c=0;
for(let y=Math.round(H*0.855);y<H;y++)for(let x=0;x<W*0.3;x++){const i=(y*W+x)*C;const r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
 if(a>250&&Math.min(r,g,b)>185&&Math.max(r,g,b)-Math.min(r,g,b)<40){sx+=x;sy+=y;c++;}}
const hx=sx/c,hy=sy/c; out.push([+(hx/W).toFixed(4),+(hy/H).toFixed(4)]);
const L=Math.max(0,Math.round(hx-110)),T=Math.max(0,Math.round(hy-110));
const crop=await sharp(`public/socks/0${n}.webp`).extract({left:L,top:T,width:220,height:Math.min(220,H-T)}).composite([{input:Buffer.from(`<svg width="220" height="220"><circle cx="${hx-L}" cy="${hy-T}" r="5" fill="red"/></svg>`)}]).flatten({background:'#888'}).png().toBuffer();
comps.push({input:crop,left:(n-1)*225,top:0});
}
console.log(JSON.stringify(out));
await sharp({create:{width:1350,height:220,channels:3,background:'#888'}}).composite(comps).png().toFile(process.env.TMPDIR+'holes.png');
