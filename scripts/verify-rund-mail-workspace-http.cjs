/* React/jsdom + transporte/lector productivos contra HTTP/JWT/SQL reales.
 * Solo se invoca dentro del PostgreSQL temporal del verificador de integración.
 * El proxy de prefijo y la incorporación de cookie son fixtures, no un navegador.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {spawn}=require('node:child_process'),{randomBytes}=require('node:crypto');
module.exports=async function verifyWorkspaceHttp(pgConfig,runtime,check,ctx){
  assert.equal(pgConfig.database,'rund_integration');assert.equal(pgConfig.host,'127.0.0.1');
  assert.match(path.basename(runtime),/^esap-rund-integration-/);
  const root=path.resolve(__dirname,'..'),front=path.join(root,'apps/mfe-rund'),authRoot=path.join(root,'backend/auth-service');
  const dep=n=>require(require.resolve(n,{paths:[authRoot,root]})),compiled=f=>require(path.join(authRoot,'dist',f));
  const {actor,other,secret,token,viewRole,fresh,admin,mailRow,recon,rawCase,grant,snapshot,identities,deliveries}=ctx;
  const key=randomBytes(32).toString('hex'),originalJwt=process.env.JWT_SECRET;
  let authApp,proxy,control,current,baseline,releaseAuth,releaseRead,holdAuth=false,authHeld=false,readHeld=false;
  const release=()=>{holdAuth=false;releaseAuth?.();releaseAuth=undefined;releaseRead?.();releaseRead=undefined;ctx.setReadHook(undefined);};
  const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(`http://127.0.0.1:${server.address().port}`)));
  const close=server=>server?new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}):Promise.resolve();
  const json=(res,status,value)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'private, no-store'});res.end(JSON.stringify(value));};
  const stable=async()=>({data:Object.fromEntries(Object.entries(await snapshot()).filter(([name])=>!['identidad_correo_revision','identidad_correo_revision_cierre'].includes(name))),
    owner:await identities(),deliveries:deliveries()});
  const runs=[];
  try{
    process.env.JWT_SECRET=secret;
    const {Module}=dep('@nestjs/common'),{NestFactory}=dep('@nestjs/core');
    const {AuthController}=compiled('auth/auth.controller'),{AuthService}=compiled('auth/auth.service');
    const {UsersService}=compiled('users/users.service'),{LoginProtectionService}=compiled('auth/login-protection.service');
    const {JwtStrategy}=compiled('auth/strategies/jwt.strategy'),{JwtAuthGuard}=compiled('auth/guards/jwt-auth.guard');
    class AuthFixtureModule{}
    Module({controllers:[AuthController],providers:[JwtStrategy,JwtAuthGuard,
      {provide:AuthService,useValue:{}},{provide:UsersService,useValue:{}},{provide:LoginProtectionService,useValue:{}}]})(AuthFixtureModule);
    authApp=await NestFactory.create(AuthFixtureModule,{logger:false,abortOnError:false});
    authApp.use(async(req,res,next)=>{
      if(holdAuth&&req.path==='/me'){
        holdAuth=false;authHeld=true;await new Promise(resolve=>{releaseAuth=resolve;});authHeld=false;
      }next();
    });
    await authApp.listen(0,'127.0.0.1');const authUrl=await authApp.getUrl();
    if(originalJwt===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=originalJwt;
    for(const url of [authUrl,ctx.rundUrl])assert.equal(new URL(url).hostname,'127.0.0.1');
    proxy=http.createServer((req,res)=>{
      const match=/^\/services\/(auth|rund)\/api\/v1(?=\/|\?|$)/.exec(req.url);
      if(!match){json(res,404,{message:'Ruta fuera del fixture'});return;}
      const target=new URL(req.url.slice(match[0].length)||'/',match[1]==='auth'?authUrl:ctx.rundUrl);
      assert.equal(target.hostname,'127.0.0.1');
      const upstream=http.request(target,{method:req.method,headers:{...req.headers,host:target.host}},response=>{
        res.writeHead(response.statusCode,response.headers);response.pipe(res);
      });upstream.on('error',()=>{if(!res.headersSent)json(res,502,{message:'Upstream ficticio no disponible'});else res.destroy();});
      req.pipe(upstream);
    });
    const proxyUrl=await listen(proxy);
    control=http.createServer(async(req,res)=>{
      try{
        if(req.headers['x-fixture-key']!==key){json(res,403,{});return;}
        const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');
        if(body.op==='setup'){
          release();await grant(true);const ids=[];
          for(let i=0;i<(body.many?26:1);i++){
            const item=await fresh(),mail=await mailRow(item.id);
            const result=await admin.query(`INSERT INTO rund.identidad_correo_revision(intencion_id,intento_id,estado_correo_inicial,registrada_por)
              VALUES($1,$2,'ENVIANDO',$3) RETURNING caso_id`,[item.id,mail.intento_id,actor]);
            ids.push({caseId:result.rows[0].caso_id,intention:item.id});
          }
          current=ids[0];
          if(body.otherOwner)await ctx.send('/'+current.caseId+'/asumir',{method:'POST',body:{},bearer:token(other)});
          if(body.accepted){const mail=await mailRow(current.intention);await recon.registrarResultado(current.intention,mail.intento_id,'ACEPTADO');await recon.conciliar(current.intention);}
          baseline=await stable();
          const ordered=(await admin.query('SELECT caso_id,estado FROM rund.identidad_correo_revision ORDER BY creada_en,caso_id')).rows;
          const expiredCookie=new (dep('@nestjs/jwt').JwtService)({secret}).sign({sub:actor,roles:['ADMIN'],exp:Math.floor(Date.now()/1000)-10});
          json(res,200,{actor,person:other,ids,position:ordered.findIndex(r=>r.caso_id===current.caseId),
            pendingPageIds:ordered.filter(r=>r.estado==='PENDIENTE').slice(0,25).map(r=>r.caso_id),
            cookie:token(actor,undefined,{personId:other}),viewCookie:token(actor,[viewRole]),expiredCookie});
        }else if(body.op==='grant'){await grant(body.enabled===true);json(res,200,{});
        }else if(body.op==='state'){json(res,200,{review:await rawCase(current.caseId),authHeld,readHeld});
        }else if(body.op==='hold-auth'){holdAuth=true;json(res,200,{});
        }else if(body.op==='hold-read'){
          ctx.setReadHook(async()=>{ctx.setReadHook(undefined);readHeld=true;await new Promise(resolve=>{releaseRead=resolve;});readHeld=false;});json(res,200,{});
        }else if(body.op==='release'){release();json(res,200,{});
        }else if(body.op==='drop-next'){ctx.dropNextResponse();json(res,200,{});
        }else if(body.op==='verify'){assert.deepEqual(await stable(),baseline);json(res,200,{unchanged:true});
        }else json(res,400,{});
      }catch{json(res,500,{message:'Falló una invariante del fixture HTTP'});}
    });
    const controlUrl=await listen(control),empty=path.join(runtime,'empty-env');fs.mkdirSync(empty);
    const configPath=path.join(root,'tmp/rund-mail-http-vitest.config.mjs');
    fs.writeFileSync(configPath,`import config from '../apps/mfe-rund/vitest.config.ts';\nexport default {...config,envDir:${JSON.stringify(empty)},test:{...config.test,include:['src/components/pta/banco-docentes/RundMailReviewWorkspace.http.integration.tsx'],threads:false,testTimeout:20000,hookTimeout:20000}};\n`);
    for(const mode of ['direct','gateway']){
      await check('Bandeja HTTP integrada: '+mode+' con principal Auth, permisos RUND, SQL y recuperación reales',async()=>{
        const report=path.join(root,`tmp/rund-mail-http-${mode}-tests.json`),log=path.join(root,`tmp/rund-mail-http-${mode}.log`);
        const output=fs.createWriteStream(log);
        const code=await new Promise((resolve,reject)=>{
          const child=spawn(process.execPath,[path.join(root,'node_modules/vitest/vitest.mjs'),'run','--config',configPath,'--reporter=json','--outputFile',report],{
            cwd:front,windowsHide:true,env:{...process.env,VITE_API_MODE:mode,VITE_API_URL:proxyUrl+'/services/',VITE_AUTH_URL:authUrl,VITE_RUND_URL:ctx.rundUrl,
              RUND_MAIL_WORKSPACE_CONTROL_URL:controlUrl,RUND_MAIL_WORKSPACE_CONTROL_KEY:key}});
          child.stdout.pipe(output,{end:false});child.stderr.pipe(output,{end:false});
          const timer=setTimeout(()=>child.kill(),180000);
          child.once('error',error=>{clearTimeout(timer);output.end();reject(error);});
          child.once('close',code=>{clearTimeout(timer);output.end(()=>resolve(code));});
        });
        assert.equal(code,0,`Verificación ${mode} falló; revisar log local ${path.basename(log)}.`);
        const result=JSON.parse(fs.readFileSync(report,'utf8'));assert.equal(result.numFailedTests,0);assert(result.numPassedTests>=10);
        const assertions=result.testResults.flatMap(test=>test.assertionResults);assert(assertions.every(a=>a.status==='passed'));
        runs.push({mode,tests:result.numPassedTests,names:assertions.map(a=>a.fullName),exitCode:code});
      });
    }
  }finally{
    release();await grant(true);await close(control);await close(proxy);if(authApp)await authApp.close();
    if(originalJwt===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=originalJwt;
  }
  fs.writeFileSync(path.join(root,'tmp/rund-mail-http-runs.json'),JSON.stringify({passed:true,runs,loopbackOnly:true,syntheticDataOnly:true,
    realReactJsdomShellReaderAndMfeTransport:true,realAuthAndRundControllersGuardsAndJwt:true,realTemporaryPostgres:true,
    browserCookieAttachmentSimulated:true,prefixProxyIsFixtureNotActualGateway:true,noRealSmtp:true,fixtureApplicationsStopped:true},null,2)+'\n');
};
