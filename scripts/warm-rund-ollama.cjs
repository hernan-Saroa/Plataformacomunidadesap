// Prepara el contexto real de extracción antes de habilitar cargas documentales.
const fs=require('node:fs');
const path=require('node:path');
const service=path.resolve(__dirname,'../backend/academic-work-plan-service');
const env=require(path.join(service,'node_modules/dotenv')).parse(fs.readFileSync(path.resolve(__dirname,'../.env.rund-ocr.local')));
require(path.join(service,'node_modules/ts-node')).register({transpileOnly:true,project:path.join(service,'tsconfig.json')});
const {postLocalJson}=require(path.join(service,'src/pta/banco-docentes/rund-local-http.ts'));
(async()=>{
  const url=new URL(env.RUND_OLLAMA_URL);
  if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('La preparación automática requiere Ollama local.');
  const started=Date.now();
  const result=await postLocalJson(`${url.href.replace(/\/$/,'')}/api/chat`,{model:env.RUND_OLLAMA_MODEL,stream:false,think:false,keep_alive:'10m',
      options:{num_ctx:16384,num_predict:10,temperature:0},messages:[{role:'user',content:'Responde solamente: listo'}]});
  if(!result.message?.content)throw new Error(result.error||'El modelo local no respondió.');
  console.log(JSON.stringify({modelo:env.RUND_OLLAMA_MODEL,respuesta:result.message.content,segundos:Math.round((Date.now()-started)/1000)}));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
