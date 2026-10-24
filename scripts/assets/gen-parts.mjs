// Splits buildings with a moving part into three sprites so the game can animate the part:
// <id>.anim.back (everything drawn before the part), <id>.anim.part, <id>.anim.front (drawn after).
// Each keeps the full 256 canvas; the part's anchor is its pivot. Run by assets:gen.
import {read,write,round} from './common.mjs';

// Part group id and pivot (in the 256 canvas) per building sprite. Motions live in the game code.
export const PARTS = {
 'building.shield-generator':{file:'shield-generator',part:'orb',pivot:[128,82]},
 'building.missile-launcher':{file:'missile-launcher',part:'rack',pivot:[128,165]},
 'building.flak':{file:'flak',part:'barrel',pivot:[128,162]},
 'building.prism-dome':{file:'prism-dome',part:'prism',pivot:[128,135]},
 'building.ruby-laser':{file:'ruby-laser',part:'barrel',pivot:[128,150]},
 'building.observatory':{file:'observatory',part:'dome',pivot:[128,145]},
 'building.sawmill.t1':{file:'sawmill-t1',part:'blade',pivot:[152,166]},
 'building.sawmill.t2':{file:'sawmill-t2',part:'blade',pivot:[145,151]},
 'building.battery':{file:'battery',part:'barrel',pivot:[128,150]},
 'building.power-wind':{file:'power-wind',part:'blades',pivot:[128,99]},
 'building.air-filter':{file:'air-filter',part:'fan',pivot:[128,129]},
 'building.pump.t1':{file:'pump-t1',part:'pump-arm',pivot:[126,133]},
 'building.pump.t2':{file:'pump-t2',part:'pump-arm',pivot:[130,90]},
 'building.mine.t1':{file:'mine-t1',part:'cart',pivot:[105,211]},
 'building.mine.t2':{file:'mine-t2',part:'cart',pivot:[105,211]},
 'building.market':{file:'market',part:'flag',pivot:[179,91]},
};

/** Index range [start, end) of the element <g id="..."> including its children. */
function groupRange(s,id){
 const start=s.indexOf(`<g id="${id}"`);
 if(start<0)throw new Error(`group ${id} not found`);
 let depth=0,i=start;
 for(;;){
  const open=s.indexOf('<g',i),close=s.indexOf('</g>',i);
  if(close<0)throw new Error(`unbalanced group ${id}`);
  if(open>=0&&open<close){depth++;i=open+2;}
  else{depth--;i=close+4;if(depth===0)return [start,i];}
 }
}

const assets=[];
for(const [id,{file,part,pivot}] of Object.entries(PARTS)){
 const s=read(`art/src/buildings/${file}.svg`);
 const rootEnd=s.indexOf('>',s.indexOf('<svg'))+1, close=s.lastIndexOf('</svg>');
 const [a,b]=groupRange(s,part);
 const root=s.slice(0,rootEnd);
 const layers={back:s.slice(rootEnd,a),part:s.slice(a,b).replace(`id="${part}"`,`id="part-${part}"`),front:s.slice(b,close)};
 for(const [layer,body] of Object.entries(layers)){
  const src=`art/src/buildings/anim/${file}-${layer}.svg`;
  write(src,`${root}${body}</svg>\n`);
  assets.push({id:`${id}.anim.${layer}`,category:'buildings',src,out:`public/assets/sprites/buildings/anim/${file}-${layer}.png`,viewBox:[256,256],
   anchor:layer==='part'?[round(pivot[0]/256*1000)/1000,round(pivot[1]/256*1000)/1000]:[0.5,0.9375],frames:1,parts:[],tags:['buildings','anim',layer],phase:'P1'});
 }
}
write('art/manifest/parts.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Animated parts: ${Object.keys(PARTS).length} buildings, ${assets.length} sprites`);
