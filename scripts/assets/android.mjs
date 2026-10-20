import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {ROOT} from './common.mjs';
// Launcher icons and splash screens for the Capacitor Android project, rendered from art/src/brand.
// The PNGs are committed, so only rerun this (npm run assets:android) when the brand art changes.
const RES='android/app/src/main/res', BG='#141029';
const brand=f=>path.join(ROOT,'art/src/brand',f);
const out=async(p,img)=>{await fs.mkdir(path.dirname(path.join(ROOT,RES,p)),{recursive:true});await img.png().toFile(path.join(ROOT,RES,p));};
const render=(f,w,h=w)=>sharp(brand(f),{density:300}).resize(w,h);
const circle=s=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><circle cx="${s/2}" cy="${s/2}" r="${s/2}"/></svg>`);
// Legacy icons are 48dp, adaptive layers 108dp.
for(const [dpi,k] of Object.entries({mdpi:1,hdpi:1.5,xhdpi:2,xxhdpi:3,xxxhdpi:4})){
 const s=48*k,a=108*k;
 await out(`mipmap-${dpi}/ic_launcher.png`,render('app-icon.svg',s));
 await out(`mipmap-${dpi}/ic_launcher_round.png`,sharp(await render('app-icon.svg',s).png().toBuffer()).composite([{input:circle(s),blend:'dest-in'}]));
 await out(`mipmap-${dpi}/ic_launcher_foreground.png`,render('app-icon-foreground.svg',a));
 await out(`mipmap-${dpi}/ic_launcher_background.png`,render('app-icon-background.svg',a));
}
// Splash: the portrait art fills the screen; landscape shows it centred on the space colour.
const splash=async(p,w,h)=>{
 if(h>=w) return out(p,render('splash.svg',w,h).resize(w,h,{fit:'cover'}));
 const art=await sharp(brand('splash.svg'),{density:300}).resize({height:h}).png().toBuffer();
 await out(p,sharp({create:{width:w,height:h,channels:4,background:BG}}).composite([{input:art,gravity:'centre'}]));
};
await splash('drawable/splash.png',480,320);
for(const [dpi,[w,h]] of Object.entries({mdpi:[320,480],hdpi:[480,800],xhdpi:[720,1280],xxhdpi:[960,1600],xxxhdpi:[1280,1920]})){
 await splash(`drawable-port-${dpi}/splash.png`,w,h);
 await splash(`drawable-land-${dpi}/splash.png`,h,w);
}
console.log('android icons and splash screens written to',RES);
