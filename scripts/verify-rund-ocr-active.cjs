// Comprueba el backend local con identidades sintéticas de prueba y JWT de un minuto.
// Solo consulta un UUID inexistente. No modifica perfiles ni muestra tokens.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const service=path.resolve(__dirname,'../backend/academic-work-plan-service');
const env=require(path.join(service,'node_modules/dotenv')).parse(fs.readFileSync(path.join(service,'.env')));
const jwt=require(path.join(service,'node_modules/jsonwebtoken'));
(async()=>{
  const id=randomUUID();
  const url=`http://127.0.0.1:${Number(env.PORT||3003)}/pta/banco-docentes/${id}/extracciones`;
  const request=async roles=>{
    const headers=roles?{Authorization:`Bearer ${jwt.sign({sub:randomUUID(),username:'PRUEBA_LOCAL_OCR',roles},env.JWT_SECRET||'esap-super-secret-jwt-key-2024',{expiresIn:60})}`} : {};
    return fetch(url,{headers,signal:AbortSignal.timeout(20000)});
  };
  assert.equal((await request()).status,401,'Sin sesión debe rechazar la consulta');
  assert.equal((await request(['DOCENTE'])).status,403,'Un docente no puede revisar extracciones GGP');
  const response=await request(['GESTION_PROFESORAL']);
  assert.equal(response.status,200,'GGP debe poder consultar sugerencias');
  const result=await response.json();
  assert.equal(result.data.enabled,true,'El proceso PTA debe cargar la activación');
  assert.deepEqual(result.data.jobs,[]);assert.deepEqual(result.data.documents,[]);
  console.log('Backend local activo: JWT obligatorio, acceso GGP y módulo OCR habilitado verificados por HTTP.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
