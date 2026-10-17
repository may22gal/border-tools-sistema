<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/src/bootstrap.php';
try{$configPath=getenv('BT_CONFIG_FILE');BT\requireThat($configPath&&is_file($configPath),'Configuración no disponible',503);BT\requireTransport(require $configPath);}catch(BT\Problem $e){http_response_code($e->status);exit(htmlspecialchars($e->getMessage(),ENT_QUOTES,'UTF-8'));}
// This renders the existing, unchanged application. Only connected-mode plumbing differs.
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; worker-src 'self' blob: https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://cdnjs.cloudflare.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
$source=dirname(__DIR__,2).'/index.html';
$html=file_get_contents($source);
if($html===false){http_response_code(503);exit('Aplicación no disponible');}
// No administrative records are loaded from localStorage, including on startup or network failure.
$html=str_replace('let S=loadState();',"let S={version:VERSION,config:{diagnosticoEstandar:250,requireTransferApproval:false,moduleFlags:{}}};ARRAY_KEYS.forEach(k=>S[k]=[]);",$html);
$html=str_replace('onchange="S.config.requireTransferApproval=this.checked;save();toast(this.checked?\'Las transferencias pendientes ya no cuentan hasta confirmarlas\':\'Las transferencias pendientes cuentan como cobradas\');render(\'permisos\')"','onchange="BTSettings({requireTransferApproval:this.checked})"',$html);
$html=str_replace('onchange="S.config.diagnosticoEstandar=Number(this.value)||250;save();toast(\'Costo de diagnóstico actualizado ✓\')"','onchange="BTSettings({diagnosticoEstandar:this.value})"',$html);
// URI values embedded in legacy inline handlers must escape apostrophes too.
$html=str_replace('encodeURIComponent(msg)',"encodeURIComponent(msg).replace(/'/g,'%27')",$html);
$html=str_replace('encodeURIComponent(x.nombre)',"encodeURIComponent(x.nombre).replace(/'/g,'%27')",$html);
$html=str_replace('</body>','<script src="assets/connected.js"></script></body>',$html);
echo $html;
