// Real local engines, synthetic PDFs and a mocked database. No business writes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {randomUUID,createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),service=path.join(root,'backend/academic-work-plan-service');
Object.assign(process.env,require(path.join(service,'node_modules/dotenv')).parse(fs.readFileSync(path.join(service,'.env'))));
require(path.join(service,'node_modules/ts-node')).register({transpileOnly:true,project:path.join(service,'tsconfig.json')});
const {jsPDF}=require('jspdf');
const {RundExtraccionService}=require(path.join(service,'src/pta/banco-docentes/rund-extraccion.service'));
const {extractionComparisonValue,EXTRACTION_FIELDS_BY_BLOCK}=require(path.join(service,'src/pta/banco-docentes/rund-extraccion-fields'));
const output=path.join(root,'.local/rund-visual-scopes');
const ocr=require(path.join(service,'src/pta/banco-docentes/rund-ocr-client'));
const originalOcr=ocr.extractRundPdf;let activeCase;
ocr.extractRundPdf=async(...args)=>{const result=await originalOcr(...args);fs.writeFileSync(path.join(output,activeCase+'.ocr.json'),JSON.stringify(result,null,2));return result;};
const cases=[
 {name:'identidad',type:'documento_identidad',lines:['CEDULA DE CIUDADANIA','NUMERO 12345678','NOMBRES: JUAN','APELLIDOS: GARCIA LOPEZ','FECHA DE NACIMIENTO: 19-FEB-1980','SEXO: M'],expected:{documentType:'CC',documentNumber:'12345678',nombreCompleto:'JUAN GARCIA LOPEZ',fechaNacimiento:'1980-02-19',genero:'Masculino',sexoBiologico:'Hombre'}},
 {name:'formacion',type:'diploma_maestria',lines:['DIPLOMA','Se otorga el titulo de:','Magister en Administracion Publica'],expected:{maestria:'Magister en Administracion Publica'}},
 {name:'vinculacion',type:'contrato',lines:['ACTO DE VINCULACION:','Contrato 123 de 2026','Fecha de inicio de la vinculacion:','1 de enero de 2026','Fecha de terminacion de la vinculacion:','31 de diciembre de 2026'],expected:{actoAdministrativoVinculacion:'Contrato 123 de 2026',fechaInicioVinculacion:'2026-01-01',fechaFinVinculacion:'2026-12-31'}},
 {name:'academico',type:'acto_asignacion_nucleo',lines:['NUCLEO TEMATICO ASIGNADO:','Gestion Publica y Gobierno'],expected:{nucleoTematico:'Gestion Publica y Gobierno'}},
 {name:'investigacion',type:'certificacion_investigacion',lines:['CERTIFICACION DE INVESTIGACION','Se certifica la participacion del titular en:','Proyecto de gestion territorial 2026'],expected:{investigacion:'Proyecto de gestion territorial 2026'}},
 {name:'sin-extraccion-requerida',type:'autorizacion_habeas_data',lines:['AUTORIZACION DE DATOS PERSONALES'],expected:{}},
];
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 assert.deepEqual(EXTRACTION_FIELDS_BY_BLOCK.CONTACTO,[]);
 assert.deepEqual(EXTRACTION_FIELDS_BY_BLOCK.TRANSVERSAL,[]);
 for(const fixture of cases){
  activeCase=fixture.name;
  const pdf=new jsPDF({unit:'pt'});pdf.setFontSize(12);pdf.text('DOCUMENTO FICTICIO DE PRUEBA - SIN VALIDEZ',45,150);
  pdf.setFontSize(18);let top=220;
  for(const line of fixture.lines){const lines=pdf.splitTextToSize(line,505);pdf.text(lines,45,top);top+=lines.length*24+10;}
  const content=Buffer.from(pdf.output('arraybuffer')),id=randomUUID(),saved=[],stages=[];
  let metadata;
  fs.writeFileSync(path.join(output,fixture.name+'.pdf'),content);
  const query=async(sql,args)=>{
   if(/UPDATE\s+auth\.personas|UPDATE\s+academic_work_plan\."(?:Docente|RundCampoEstado)"/.test(sql))throw new Error('No se permiten cambios de perfil o aprobación en esta verificación.');
   if(sql.includes('RundDocumentoPerfil" WHERE id='))return [{id,estado:'ACTIVO',tipo_soporte:fixture.type,checksum_sha256:createHash('sha256').update(content).digest('hex')}];
   if(sql.includes('p.nom_largo'))return [{}];
   if(sql.includes('Docente" WHERE id = $1 FOR UPDATE'))return [{id}];
   if(sql.includes('SELECT j.id,d.estado'))return [{id,estado:'ACTIVO'}];
   if(sql.includes('SELECT id FROM actualizada')){stages.push(args[2]);console.log(fixture.name+': '+args[2]);return [{id}];}
   if(sql.includes('INSERT INTO academic_work_plan."RundExtraccionSugerencia"'))saved.push({campo:args[1],valor:args[2],pagina:args[4],confianza:args[6]});
   if(sql.includes('perfil_base=$3::jsonb'))metadata=JSON.parse(args[3]);
   return [];
  };
  const db={query,transaction:fn=>fn({query})};
  const started=Date.now();
  await new RundExtraccionService(db,{read:async()=>content}).process({id,documento_id:id,docente_id:id,lease_id:randomUUID()});
  fs.writeFileSync(path.join(output,fixture.name+'.json'),JSON.stringify({saved,stages,metadata},null,2));
  for(const [campo,expected] of Object.entries(fixture.expected)){
   const actual=saved.find(item=>item.campo===campo);
   assert(actual,`${fixture.name}: falta ${campo}`);
   assert.equal(extractionComparisonValue(campo,actual.valor),extractionComparisonValue(campo,expected),`${fixture.name}: ${campo}`);
  }
  assert.equal(saved.length,Object.keys(fixture.expected).length,fixture.name+': no debe producir campos de otra pestaña');
  console.log(JSON.stringify({caso:fixture.name,camposVerificados:saved.map(item=>item.campo),ms:Date.now()-started}));
 }
 console.log('RUND: rutas locales verificadas por pestaña con PDF ficticios, sin escrituras de negocio.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
