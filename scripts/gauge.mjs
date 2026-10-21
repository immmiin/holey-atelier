import sharp from 'sharp';
for (let n=1;n<=6;n++){
const {data,info}=await sharp(`public/socks/0${n}.webp`).raw().toBuffer({resolveWithObject:true});
const W=info.width,H=info.height,C=info.channels;
const res=[];
for (const fy of [0.08,0.25,0.4]) {
  const y=Math.round(H*fy); const row=[];
  for(let x=0;x<W;x++){const i=(y*W+x)*C; if(data[i+3]>250) row.push(data[i]+data[i+1]+data[i+2]);}
  const m=row.reduce((a,b)=>a+b,0)/row.length; const r=row.map(v=>v-m);
  let best=0,bl=0; for(let lag=3;lag<20;lag++){let s=0;for(let i=0;i+lag<r.length;i++)s+=r[i]*r[i+lag]; s/=r.length-lag; if(s>best){best=s;bl=lag}}
  res.push(bl);
}
console.log(n,W,H,res.join(' '));
}
