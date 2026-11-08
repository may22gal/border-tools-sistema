// Portable static preview. Production PHP keeps the original UI and shared assets.
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'), out=path.join(root,'dist');
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(path.join(out,'assets/vendor'),{recursive:true});
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace('x.fechaAnulacion=stamp()','x.fechaAnulacion=new Date().toISOString().slice(0,19).replace("T"," ")');
const scripts=['demo-adapter.js','supplier-finance.js','printer-settings.js','service-print.js'];
html=html.replace('</body>',scripts.map(n=>`<script src="/assets/${n}"></script>`).join('\n')+'\n</body>');
fs.writeFileSync(path.join(out,'index.html'),html);
fs.copyFileSync(path.join(root,'demo/static/demo-adapter.js'),path.join(out,'assets/demo-adapter.js'));
for(const name of [...scripts.slice(1),'vendor/qz-tray-2.3.0.js','vendor/QZ-LICENSE.txt'])fs.copyFileSync(path.join(root,'backend/public/assets',name),path.join(out,'assets',name));
console.log('Static demo built with shared supplier, report and printing assets. No PHP or private files published.');
