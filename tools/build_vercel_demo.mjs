// Portable static preview. Production PHP keeps the original UI and shared assets.
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'), out=path.join(root,'dist');
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(path.join(out,'assets/vendor'),{recursive:true});
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace('x.fechaAnulacion=stamp()','x.fechaAnulacion=new Date().toISOString().slice(0,19).replace("T"," ")');
const scripts=['demo-adapter.js','supplier-finance.js','printer-settings.js','service-print.js','help.js'];
// Insert before the LAST </body>: earlier occurrences live inside print templates in the app's own JavaScript.
const end=html.lastIndexOf('</body>');if(end<0)throw new Error('index.html has no </body>');
html=html.slice(0,end)+scripts.map(n=>`<script src="/assets/${n}"></script>`).join('\n')+'\n'+html.slice(end);
fs.writeFileSync(path.join(out,'index.html'),html);
fs.copyFileSync(path.join(root,'demo/static/demo-adapter.js'),path.join(out,'assets/demo-adapter.js'));
for(const name of [...scripts.slice(1),'vendor/qz-tray-2.3.0.js','vendor/QZ-LICENSE.txt'])fs.copyFileSync(path.join(root,'backend/public/assets',name),path.join(out,'assets',name));
// Standalone recovery page: exports what each browser saved locally. Same origin, so it can read that data.
if(fs.existsSync(path.join(root,'rescate.html')))fs.copyFileSync(path.join(root,'rescate.html'),path.join(out,'rescate.html'));
console.log('Static demo built with shared supplier, report and printing assets. No PHP or private files published.');
