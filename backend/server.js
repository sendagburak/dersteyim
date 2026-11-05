const bootTime=Date.now();
const fs=require('node:fs');
const path=require('node:path');
const express=require('express');
const config=require('./config');
const {db,checkIntegrity,closeDatabase}=require('./db');
const {mailStatus}=require('./mailer');
const {startNotificationWorker,stopNotificationWorker}=require('./notificationWorker');
const {ensureSetup}=require('../scripts/setup');
const installation=require('./installation');
const app=express();
let localShutdown,controlToken;const serverInstanceId=require('node:crypto').randomUUID();
app.post('/internal/shutdown',(req,res)=>{if(!localShutdown||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||req.get('X-Control-Token')!==controlToken)return res.status(403).json({success:false});res.json({success:true});setTimeout(localShutdown,100);});
if(config.TRUST_PROXY)app.set('trust proxy',1);
app.disable('x-powered-by');
app.use((req,res,next)=>{
  res.set({'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'same-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"});
  if(config.APP_MODE==='school'&&!/^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(req.get('host')||''))return res.status(403).json({success:false,message:'Yalnızca bu bilgisayardaki uygulamaya erişilebilir.'});
  // Cookie-based requests must come from the same origin; API clients use Bearer tokens.
  if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.get('origin')&&req.get('origin')!==`${req.protocol}://${req.get('host')}`)return res.status(403).json({success:false,message:'Farklı kaynaktan gelen işlem reddedildi.'});
  next();
});
app.use(express.json({limit:'1mb'}));
app.get('/api/setup/status',(_req,res)=>res.json(installation.state()));
app.post('/api/setup/local',(req,res)=>{installation.requireLocal(req);res.status(201).json(installation.createLocalAccount(req.body?.username,req.body?.password));});
app.post('/api/setup/open-credentials',async(req,res)=>{installation.requireLocal(req);await require('./localFiles').openCredentialsFolder();res.json({success:true,message:'Giriş bilgileri klasörü açıldı.'});});
app.get('/api/health',(_req,res)=>{const health=checkIntegrity();res.status(health.healthy?200:503).json({status:health.healthy?'UP':'DEGRADED',application:'dersteyim',instanceId:serverInstanceId,version:'1.3.2',coldStartMs:global.coldStartDuration||0,memory:{heapUsedMB:Math.round(process.memoryUsage().heapUsed/1048576)},timezone:config.TIMEZONE,turkeyTime:config.formatTurkeyDateTime(),uptimeSeconds:Math.floor(process.uptime()),database:{status:health.healthy?'HEALTHY':'ERROR'}});});
app.get('/api/system-info',(_req,res)=>res.json({name:'VarYok',version:'1.3.2',license:'MIT',institution:'Niğde İl Millî Eğitim Müdürlüğü — YEĞİTEK Birimi'}));
app.use('/api',(req,res,next)=>{if(config.APP_MODE==='school'){const s=installation.state();if(!s.activated)return res.status(423).json({success:false,message:s.message||'Bu okul bilgisayarı henüz yetkilendirilmedi.',code:'ACTIVATION_REQUIRED'});req.boundSchool=s.school.id;}next();});
app.use('/api',require('./routes/api'));
app.use('/api',(_req,res)=>res.status(404).json({success:false,message:'API yolu bulunamadı.'}));
const dist=path.join(config.ROOT,'client','dist');
app.use(express.static(dist,{index:false,maxAge:0}));
app.get(/.*/,(req,res)=>{if(path.extname(req.path))return res.status(404).send('Dosya bulunamadı.');if(!fs.existsSync(path.join(dist,'index.html')))return res.status(503).send('Arayüz derlenmemiş. Proje klasöründe npm run build çalıştırın.');res.set('Cache-Control','no-store').sendFile(path.join(dist,'index.html'));});
app.use((err,req,res,next)=>{
  if(res.headersSent)return next(err);
  let status=err.status||500,message=err.message;
  if(/UNIQUE constraint failed/.test(message)){status=409;message='Bu kayıt zaten mevcut veya ders programında çakışma var.';}
  else if(/schedule_teacher_conflict/.test(message)){status=409;message='Öğretmenin bu eğitim yılında aynı saat için başka dersi var.';}
  else if(/FOREIGN KEY constraint failed/.test(message)){status=400;message='İlişkili kayıt bulunamadı veya kullanımda.';}
  else if(err.type==='entity.too.large'){status=413;message='Dosya/istek boyutu sınırı aşıldı.';}
  else if(err.type==='entity.parse.failed'){status=400;message='İstek içeriği geçersiz JSON.';}
  if(status>=500){console.error(`[${req.method} ${req.path}]`,err.stack);message='İşlem tamamlanamadı. Sunucu günlüğünü kontrol edin.';}
  res.status(status).json({success:false,message});
});
function startServer(){
  const start=bootTime;
  if(!fs.existsSync(path.join(dist,'index.html')))throw new Error('Arayüz eksik. npm run build çalıştırın.');
  ensureSetup();
  if(!checkIntegrity().healthy)throw new Error('Veritabanı bütünlük kontrolü başarısız.');
  global.coldStartDuration=Date.now()-start;
  const server=app.listen(config.PORT,config.HOST,(error)=>{if(error)return;global.coldStartDuration=Date.now()-bootTime;controlToken=require('node:crypto').randomBytes(32).toString('hex');fs.writeFileSync(path.join(config.DATA_DIR,'server-control.json'),JSON.stringify({pid:process.pid,port:config.PORT,token:controlToken,instanceId:serverInstanceId}),{mode:0o600});console.log(`VarYok 1.3.2 hazır: http://${config.HOST}:${config.PORT} (${Date.now()-start} ms)`);console.log(mailStatus().message);startNotificationWorker();});
  server.on('error',err=>{console.error(err.code==='EADDRINUSE'?`Port ${config.PORT} kullanımda. Diğer uygulamayı kapatın veya .env içindeki PORT değerini değiştirin.`:`Sunucu açılamadı: ${err.message}`);closeDatabase();process.exitCode=1;});
  let closing=false;
  const shutdown=async()=>{if(closing)return;closing=true;setTimeout(()=>process.exit(1),30000).unref();const httpDone=new Promise(resolve=>server.close(resolve));await Promise.all([httpDone,stopNotificationWorker()]);try{fs.unlinkSync(path.join(config.DATA_DIR,'server-control.json'));}catch{}closeDatabase();process.exit(0);};
  localShutdown=shutdown;
  process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);return server;
}
if(require.main===module){try{startServer();}catch(e){console.error(`Başlatma hatası: ${e.message}`);closeDatabase();process.exitCode=1;}}
module.exports={app,startServer};
