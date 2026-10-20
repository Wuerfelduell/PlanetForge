import './gen-parts.mjs';
import {manifest,write} from './common.mjs';
const m=manifest();
write('art/manifest.json',JSON.stringify(m,null,2)+'\n');
console.log(`Asset setup: ${m.assets.length} entries`);
