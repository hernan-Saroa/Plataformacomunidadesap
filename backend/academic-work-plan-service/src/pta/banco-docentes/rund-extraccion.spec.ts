import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { validateCandidates, allowedExtractionFields, extractionFieldsForDocument, extractionIds, extractionValueValidationError, extractionSuggestionQualityError, lockExtractionSuggestions, confirmExtractionSuggestions } from './rund-extraccion-fields';
import { localExtractionModel, localExtractionUrl, RundExtraccionService } from './rund-extraccion.service';
import { RundExtraccionController } from './rund-extraccion.controller';
import { BancoDocentesService } from './banco-docentes.service';
import * as localHttp from './rund-local-http';
import * as ocrClient from './rund-ocr-client';
import * as visualReader from './rund-visual-extraction';
import * as visualFieldsReader from './rund-visual-fields';

const id='11111111-1111-4111-8111-111111111111';
const pages=[{pagina:1,texto:'Título: Administrador Público',confianza:0.96}];
const candidate={campo:'pregrado',valor:'Administrador Público',evidencia:'Título: Administrador Público',pagina:1,confianza:0.95};

describe('Enrutamiento académico con Gemma visual',()=>{
  const previous={model:process.env.RUND_OLLAMA_MODEL,url:process.env.RUND_OCR_URL,provider:process.env.RUND_OCR_PROVIDER};
  beforeEach(()=>{process.env.RUND_OLLAMA_MODEL='gemma4:e4b';process.env.RUND_OCR_URL='http://localhost:8000';process.env.RUND_OCR_PROVIDER='RUND';});
  afterEach(()=>{
    jest.restoreAllMocks();
    for(const [key,value] of [['RUND_OLLAMA_MODEL',previous.model],['RUND_OCR_URL',previous.url],['RUND_OCR_PROVIDER',previous.provider]]){
      if(value===undefined)delete process.env[key!];else process.env[key!]=value;
    }
  });
  const execute=async(tipo_soporte='diploma_pregrado')=>{
    const saved:any[]=[],stages:string[]=[];
    const query=jest.fn(async(sql:string,args?:any[])=>{
      if(sql.includes('RundDocumentoPerfil" WHERE id='))return [{id:'pdf',estado:'ACTIVO',tipo_soporte}];
      if(sql.includes('p.nom_largo'))return [{}];
      if(sql.includes('Docente" WHERE id = $1 FOR UPDATE'))return [{id:'doc'}];
      if(sql.includes('SELECT j.id,d.estado'))return [{id:'job',estado:'ACTIVO'}];
      if(sql.includes('SELECT id FROM actualizada')){stages.push(args![2]);return [{id:'job'}];}
      if(sql.includes('INSERT INTO academic_work_plan."RundExtraccionSugerencia"'))saved.push(args);
      return [];
    });
    await (new RundExtraccionService({query,transaction:async(fn:any)=>fn({query})} as any,{read:async()=>Buffer.from('%PDF-fixture')} as any) as any)
      .process({id:'job',docente_id:'doc',documento_id:'pdf',lease_id:'lease'});
    return {saved,stages,query};
  };
  it('un título explícito fiable no necesita generar una interpretación ni cargar la visión',async()=>{
    jest.spyOn(ocrClient,'extractRundPdf').mockResolvedValue({motor:'fixture',paginas:[{pagina:1,texto:'Título de: Economista',confianza:0.98}]});
    const text=jest.spyOn(localHttp,'postLocalJson');const visual=jest.spyOn(visualReader,'extractVisualTitles');
    const result=await execute();
    expect(result.saved[0][2]).toBe('Economista');
    expect(text).not.toHaveBeenCalled();expect(visual).not.toHaveBeenCalled();
    expect(result.stages).toEqual(['OCR','VALIDANDO']);
  });
  it('un OCR ilegible va a dos lecturas visuales sin reconstruirlo con un pase de texto',async()=>{
    jest.spyOn(ocrClient,'extractRundPdf').mockResolvedValue({motor:'fixture',paginas:[{pagina:1,texto:'Título de: AENTACIONHDEIUAHTUNT',confianza:0.4}]});
    const text=jest.spyOn(localHttp,'postLocalJson');
    jest.spyOn(visualReader,'extractVisualTitles').mockResolvedValue({estado:'LECTURAS_VISUALES_COINCIDENTES',candidates:[{campo:'pregrado',valor:'Economista',evidencia:'Título de: Economista',confianza:0.9,pagina:1,baja_confianza:true}]});
    const result=await execute();
    expect(result.saved[0][2]).toBe('Economista');expect(result.saved[0][7]).toBe(true);
    expect(text).not.toHaveBeenCalled();expect(result.stages).toEqual(['OCR','VISION','VALIDANDO']);
    expect(result.query.mock.calls.some(([sql])=>/UPDATE auth\.personas|SET pregrado=/.test(sql))).toBe(false);
  });
  it('una palabra partida con alta confianza se coteja en el PDF en lugar de unirla por conjetura',async()=>{
    jest.spyOn(ocrClient,'extractRundPdf').mockResolvedValue({motor:'fixture',paginas:[{pagina:1,texto:'Título de: Magister en Administracion P ublica',confianza:.99}]});
    const visual=jest.spyOn(visualReader,'extractVisualTitles').mockResolvedValue({estado:'LECTURAS_VISUALES_COINCIDENTES',candidates:[{campo:'maestria',valor:'Magister en Administracion Publica',evidencia:'Magister en Administracion Publica',confianza:.9,pagina:1,baja_confianza:true}]});
    const result=await execute('diploma_maestria');
    expect(visual).toHaveBeenCalled();
    expect(result.saved.map(args=>args[2])).toEqual(['Magister en Administracion Publica']);
    expect(result.stages).toEqual(['OCR','VISION','VALIDANDO']);
  });
  it('conserva la abstención visual y no añade una conjetura de texto después',async()=>{
    jest.spyOn(ocrClient,'extractRundPdf').mockResolvedValue({motor:'fixture',paginas:[{pagina:1,texto:'borroso',confianza:0.3}]});
    const text=jest.spyOn(localHttp,'postLocalJson');
    jest.spyOn(visualReader,'extractVisualTitles').mockResolvedValue({estado:'SIN_COINCIDENCIA_VISUAL',candidates:[]});
    expect((await execute()).saved).toEqual([]);expect(text).not.toHaveBeenCalled();
  });
  it.each([
    ['documento_identidad','documentNumber','12345678'],
    ['contrato','actoAdministrativoVinculacion','Contrato 123 de 2026'],
    ['certificacion_investigacion','investigacion','Proyecto de formación docente'],
    ['acto_asignacion_nucleo','nucleoTematico','Administración Pública'],
  ])('enruta %s al lector visual compartido, preservando decisiones manuales',async(tipo,campo,valor)=>{
    jest.spyOn(ocrClient,'extractRundPdf').mockResolvedValue({motor:'fixture',paginas:[{pagina:1,texto:'ilegible',confianza:.2}]});
    const text=jest.spyOn(localHttp,'postLocalJson');const titles=jest.spyOn(visualReader,'extractVisualTitles');
    const visual=jest.spyOn(visualFieldsReader,'extractVisualFields').mockResolvedValue({estado:'LECTURAS_VISUALES_COINCIDENTES',candidates:[{campo,valor,evidencia:valor,confianza:.9,pagina:1,baja_confianza:true}]});
    const result=await execute(tipo);
    expect(result.saved[0][1]).toBe(campo);expect(result.saved[0][2]).toBe(valor);
    expect(visual.mock.calls[0][4]).toContain(campo);
    expect(text).not.toHaveBeenCalled();expect(titles).not.toHaveBeenCalled();
    expect(result.query.mock.calls.some(([sql])=>/UPDATE auth\.personas|UPDATE academic_work_plan\."RundCampoEstado"/.test(sql))).toBe(false);
  });
  it('un fallo visual no elimina los datos explícitos ya recuperados ni los convierte en error',async()=>{
    jest.spyOn(ocrClient,'extractRundPdf').mockResolvedValue({motor:'fixture',paginas:[{pagina:1,texto:'CON C.C. No. 12345678',confianza:.99}]});
    jest.spyOn(visualFieldsReader,'extractVisualFields').mockResolvedValue({estado:'LECTURA_VISUAL_NO_DISPONIBLE',candidates:[]});
    const text=jest.spyOn(localHttp,'postLocalJson');
    const result=await execute('documento_identidad');
    expect(result.saved.map(row=>row[1])).toEqual(['documentType','documentNumber']);
    expect(text).not.toHaveBeenCalled();
  });
  it.each([
    ['CÉDULA DE CIUDADANÍA','CC',false],
    ['PASAPORTE','PA',true],
  ])('contrasta un número visual con el tipo %s recuperado por OCR',async(text,type,acceptsLetters)=>{
    jest.spyOn(ocrClient,'extractRundPdf').mockResolvedValue({motor:'fixture',paginas:[{pagina:1,texto:text,confianza:.99}]});
    jest.spyOn(visualFieldsReader,'extractVisualFields').mockResolvedValue({estado:'LECTURAS_VISUALES_COINCIDENTES',candidates:[{campo:'documentNumber',valor:'AB123456',evidencia:'Número del documento AB123456',confianza:.9,pagina:1,baja_confianza:true}]});
    const result=await execute('documento_identidad');
    expect(result.saved.find(row=>row[1]==='documentType')?.[2]).toBe(type);
    expect(result.saved.some(row=>row[1]==='documentNumber')).toBe(acceptsLetters);
  });
  it('no fuerza extracción en tipos sin campos acreditables',async()=>{
    const ocr=jest.spyOn(ocrClient,'extractRundPdf');const visual=jest.spyOn(visualFieldsReader,'extractVisualFields');
    expect((await execute('autorizacion_habeas_data')).saved).toEqual([]);
    expect(ocr).not.toHaveBeenCalled();expect(visual).not.toHaveBeenCalled();
  });
});

describe('F014: abstención al procesar y consultar resultados OCR',()=>{
  it.each(['AENTACIONHDEIUAHTUNT','Economista'])('procesa %s sin guardar basura ni cambiar el perfil',async valor=>{
    const originalFetch=global.fetch;
    const provider=process.env.RUND_OCR_PROVIDER, token=process.env.RUND_OCR_TOKEN;
    process.env.RUND_OCR_PROVIDER='LOCAL';process.env.RUND_OCR_TOKEN='token-local-de-prueba-de-32-caracteres';
    const text=`TÍTULO DE: ${valor}`;
    global.fetch=jest.fn().mockResolvedValueOnce(new Response(JSON.stringify({paginas:[{pagina:1,texto:text,confianza:0.99}]})));
    const modelCall=jest.spyOn(localHttp,'postLocalJson').mockResolvedValue({message:{content:JSON.stringify({sugerencias:[{...candidate,valor,evidencia:text}]})}});
    const document={id:'pdf',estado:'ACTIVO',tipo_soporte:'diploma_pregrado',proveedor_almacenamiento:'LOCAL',almacenamiento_ruta:'fixture'};
    const query=jest.fn(async(sql:string)=>{
      if(sql.includes('RundDocumentoPerfil" WHERE id='))return [document];
      if(sql.includes('p.nom_largo'))return [{pregrado:'Economista'}];
      if(sql.includes('Docente" WHERE id = $1 FOR UPDATE'))return [{id:'doc'}];
      if(sql.includes('SELECT j.id,d.estado'))return [{id:'job',estado:'ACTIVO'}];
      if(sql.includes('SELECT id FROM actualizada'))return [{id:'job'}];
      return [];
    });
    const db={query,transaction:async(work:any)=>work({query})};
    const storage={read:jest.fn().mockResolvedValue(Buffer.from('%PDF-1.7 fixture'))};
    try{
      await (new RundExtraccionService(db as any,storage as any) as any).process({id:'job',docente_id:'doc',documento_id:'pdf',lease_id:'lease'});
      const inserts=query.mock.calls.filter(([sql])=>sql.includes('INSERT INTO academic_work_plan."RundExtraccionSugerencia"'));
      expect(inserts).toHaveLength(valor==='Economista'?1:0);
      expect(query.mock.calls.some(([sql])=>/UPDATE auth\.personas|SET pregrado=/.test(sql))).toBe(false);
      const completion=query.mock.calls.find(([sql])=>sql.includes('perfil_base=$3::jsonb'))! as any[];
      expect(JSON.parse(completion[1][3]).resultado).toBe(valor==='Economista'?'CON_SUGERENCIAS':'SIN_LECTURA_FIABLE');
    }finally{
      global.fetch=originalFetch;
      modelCall.mockRestore();
      if(provider===undefined)delete process.env.RUND_OCR_PROVIDER;else process.env.RUND_OCR_PROVIDER=provider;
      if(token===undefined)delete process.env.RUND_OCR_TOKEN;else process.env.RUND_OCR_TOKEN=token;
    }
  });
  it('marca un resultado histórico incoherente al consultar sin borrar su trazabilidad',async()=>{
    const previous=process.env.RUND_OCR_ENABLED;process.env.RUND_OCR_ENABLED='true';
    const bad={id:'old',campo:'pregrado',valor:'AENTACIONHDEIUAHTUNT',valor_previo:'Economista',estado:'PENDIENTE',confianza:0.99,evidencia:'TÍTULO DE: AENTACIONHDEIUAHTUNT'};
    const query=jest.fn(async(sql:string)=>{
      if(sql.includes('COALESCE((SELECT jsonb_agg'))return [{id:'job',estado:'COMPLETADO',tipo_soporte:'diploma_pregrado',sugerencias:[bad]}];
      if(sql.includes('p.nom_largo'))return [{pregrado:'Economista'}];
      return [];
    });
    try{
      const result=await new RundExtraccionService({query} as any,{} as any).list('doc',{actorId:'GGP',roles:['GESTION_PROFESORAL'],fullAccess:true});
      expect(result.jobs[0].sugerencias[0]).toMatchObject({id:'old',lectura_no_confiable:expect.any(String)});
      expect(result.jobs[0].campos_esperados).toEqual(['Pregrado']);
      expect(query.mock.calls.some(([sql])=>/UPDATE|DELETE/.test(sql))).toBe(false);
    }finally{if(previous===undefined)delete process.env.RUND_OCR_ENABLED;else process.env.RUND_OCR_ENABLED=previous;}
  });
});
describe('F014: extracción de candidatos no confiables',()=>{
  it('permite solo campos sustentados por el tipo de soporte',()=>{
    expect(allowedExtractionFields('diploma_pregrado')).toEqual(['pregrado']);
    expect(extractionFieldsForDocument({categoria_codigo:'IDENTIDAD'})).toContain('nombreCompleto');
    expect(allowedExtractionFields('autorizacion_habeas_data')).toEqual([]);
    expect(allowedExtractionFields('documento_identidad')).toEqual([
      'documentType','documentNumber','nombreCompleto','genero','sexoBiologico','fechaNacimiento',
    ]);
  });
  it('conserva evidencia y no confirma automáticamente aun con alta confianza',()=>{
    const [result]=validateCandidates({sugerencias:[candidate]},pages,['pregrado']);
    expect(result).toMatchObject({campo:'pregrado',valor:'Administrador Público',baja_confianza:false});
    expect(result).not.toHaveProperty('estado');
  });
  it('conserva las tildes y ñ del OCR y normaliza el valor sin modificar su evidencia',()=>{
    const texto='TÍTULO DE: Administracio\u0301n Pu\u0301blica';
    const [result]=validateCandidates({sugerencias:[{...candidate,valor:'Administración Pública',evidencia:texto}]},[{pagina:1,texto,confianza:0.99}],['pregrado']);
    expect(result).toMatchObject({valor:'Administración Pública',evidencia:texto});
    const name='Jose\u0301 Mun\u0303oz';
    const [person]=validateCandidates({sugerencias:[{campo:'nombreCompleto',valor:name,evidencia:name,pagina:1,confianza:0.99}]},[{pagina:1,texto:name,confianza:0.99}],['nombreCompleto']);
    expect(person).toMatchObject({valor:'José Muñoz',evidencia:name});
  });
  it.each([
    ['documentType','NIT'],['documentNumber','12-34'],['nombreCompleto','DANIELA 123'],
    ['genero','Desconocido'],['sexoBiologico','No definido'],['fechaNacimiento','1996-02-31'],
    ['escalafon','X'.repeat(101)],['perfilAcademico',`Docente\u0000oculto`],
  ])('rechaza antes de persistir un valor incompatible: %s', (field,value)=>{
    expect(extractionValueValidationError(field,value)).toEqual(expect.any(String));
  });
  it('valida la coherencia entre tipo y número de documento',()=>{
    const page={pagina:1,texto:'CÉDULA DE CIUDADANÍA\nNÚMERO\nAB12345',confianza:0.99};
    const result=validateCandidates({sugerencias:[
      {campo:'documentType',valor:'CC',pagina:1,evidencia:'CÉDULA DE CIUDADANÍA',confianza:0.99},
      {campo:'documentNumber',valor:'AB12345',pagina:1,evidencia:'NÚMERO\nAB12345',confianza:0.99},
    ]},[page],['documentType','documentNumber']);
    expect(result.map(item=>item.campo)).toEqual(['documentType']);
  });
  it.each([{campo:'estado'},{campo:'puntajeSalarial'},{pagina:7},{evidencia:'Texto inventado'},{valor:''},{valor:123}])('descarta respuestas inválidas: %p',change=>{
    expect(validateCandidates({sugerencias:[{...candidate,...change}]},pages,['pregrado'])).toEqual([]);
  });
  it('no acepta la confianza declarada por el modelo si el OCR es débil',()=>{
    expect(validateCandidates({sugerencias:[candidate]},[{...pages[0],confianza:0.3}],['pregrado'])).toEqual([]);
  });
  it.each(['AENTACIONHDEIUAHTUNT','XQZZZZZZZZ','UNIVERSIDAD_NACIONAL_123'])('se abstiene ante un título incoherente incluso con confianza alta: %s', valor=>{
    const text=`Título de: ${valor}`;
    expect(validateCandidates({sugerencias:[{...candidate,valor,evidencia:text,confianza:0.99}]},[{pagina:1,texto:text,confianza:0.99}],['pregrado'])).toEqual([]);
  });
  it('acepta Economista únicamente cuando se leyó literalmente como título otorgado',()=>{
    const text='EL CONSEJO DE LA FACULTAD OTORGA EL\nTÍTULO DE: ECONOMISTA';
    expect(validateCandidates({sugerencias:[{...candidate,valor:'Economista',evidencia:text}]},[{pagina:1,texto:text,confianza:0.98}],['pregrado']))
      .toEqual([expect.objectContaining({campo:'pregrado',valor:'Economista'})]);
    expect(validateCandidates({sugerencias:[{...candidate,valor:'Economista',evidencia:'TÍTULO DE: Ecnn…'}]},[{pagina:1,texto:'TÍTULO DE: Ecnn…',confianza:0.99}],['pregrado'])).toEqual([]);
  });
  it('no usa texto administrativo ni coincidencias parciales como título',()=>{
    for(const text of ['EN NOMBRE Y REPRESENTACIÓN DE LA UNIVERSIDAD NACIONAL','Título: PSEUDOECONOMISTA']) {
      const valor=text.startsWith('EN NOMBRE')?'REPRESENTACIÓN DE LA UNIVERSIDAD':'ECONOMISTA';
      expect(validateCandidates({sugerencias:[{...candidate,valor,evidencia:text}]},[{pagina:1,texto:text,confianza:0.99}],['pregrado'])).toEqual([]);
    }
  });
  it('no presta la confianza de la página a una línea ilegible del título',()=>{
    const page={...pages[0],confianza:0.99,lineas:[{texto:pages[0].texto,confianza:0.4}]};
    expect(validateCandidates({sugerencias:[candidate]},[page],['pregrado'])).toEqual([]);
    expect(validateCandidates({sugerencias:[candidate]},[{...page,confianza:0.2,lineas:[{texto:pages[0].texto,confianza:0.98}]}],['pregrado'])).toHaveLength(1);
  });
  it.each(['maestria','fechaNacimiento'])('una cita parcial de %s conserva la confianza de su línea original',campo=>{
    const title=campo==='maestria'?'Magíster en Economía':'1961-01-19';
    const quote=campo==='maestria'?title:'19 de enero de 1961';
    const line=campo==='maestria'?`Universidad de prueba · Título de ${quote} otorgado al titular`:`FECHA DE NACIMIENTO: ${quote}`;
    const page={pagina:1,texto:`Encabezado legible\n${line}`,confianza:0.99,lineas:[{texto:'Encabezado legible',confianza:0.99},{texto:line,confianza:0.2}]};
    const value={campo,valor:title,evidencia:quote,pagina:1,confianza:0.99};
    expect(validateCandidates({sugerencias:[value]},[page],[campo])).toEqual([]);
    expect(validateCandidates({sugerencias:[value]},[{...page,lineas:page.lineas.map(item=>({...item,confianza:0.99}))}],[campo])).toHaveLength(1);
  });
  it.each([
    ['doctorado','Magíster en Economía'],['maestria','Doctor en Economía'],
    ['especializacion','Magíster en Economía'],['posDoctorado','Doctor en Economía'],
    ['pregrado','Doctor en Economía'],
  ])('no reclasifica %s con un título de otro nivel: %s',(campo,valor)=>{
    const text=`Título de: ${valor}`;
    expect(validateCandidates({sugerencias:[{campo,valor,evidencia:text,pagina:1,confianza:0.99}]},[{pagina:1,texto:text,confianza:0.99}],[campo])).toEqual([]);
  });
  it.each([
    ['especializacion','Especialista en Finanzas'],['maestria','Magíster en Economía'],
    ['doctorado','Doctor en Ciencias Económicas'],['posDoctorado','Estancia posdoctoral en Economía'],
  ])('conserva un título legible correspondiente a %s',(campo,valor)=>{
    const text=`Título de: ${valor}`;
    expect(validateCandidates({sugerencias:[{campo,valor,evidencia:text,pagina:1,confianza:0.99}]},[{pagina:1,texto:text,confianza:0.99}],[campo])).toHaveLength(1);
  });
  it.each([undefined,null,NaN,Infinity,1.01,-0.1,0.84,'0.99','0x1',true])('no propone datos con confianza ausente o insuficiente: %s',confianza=>{
    expect(validateCandidates({sugerencias:[{...candidate,confianza}]},pages,['pregrado'])).toEqual([]);
  });
  it('evalúa solo las líneas de la cita localizada, sin mezclar una mención borrosa en otra parte',()=>{
    const valor='Magíster en Economía';
    const lineas=[{texto:`Mención borrosa: ${valor}`,confianza:0.2},{texto:`Título de: ${valor}`,confianza:0.99}];
    const page={pagina:1,texto:lineas.map(line=>line.texto).join('\n'),confianza:0.99,lineas};
    const value={campo:'maestria',valor,pagina:1,evidencia:lineas[1].texto,confianza:0.99};
    expect(validateCandidates({sugerencias:[value]},[page],['maestria'])).toHaveLength(1);
    expect(validateCandidates({sugerencias:[{...value,evidencia:valor}]},[page],['maestria'])).toEqual([]);
  });
  it.each(['constructor','toString','__proto__'])('no acepta campos heredados del objeto: %s',campo=>{
    expect(extractionValueValidationError(campo,'Economista')).toEqual(expect.any(String));
    expect(validateCandidates({sugerencias:[{...candidate,campo}]},pages,[campo])).toEqual([]);
  });
  it.each(['genero','sexoBiologico'])('no escoge %s cuando la cita contiene marcadores contradictorios',campo=>{
    const texto='SEXO: F M';
    expect(validateCandidates({sugerencias:[{campo,valor:campo==='genero'?'Femenino':'Mujer',pagina:1,evidencia:texto,confianza:0.99}]},[{pagina:1,texto,confianza:0.99}],[campo])).toEqual([]);
  });
  it('las fechas también deben estar respaldadas por la cita, sin inventar un día distinto',()=>{
    const page={pagina:1,texto:'FECHA DE NACIMIENTO 19 DE ENERO DE 1961',confianza:0.99};
    const data={campo:'fechaNacimiento',valor:'1961-01-19',evidencia:page.texto,pagina:1,confianza:0.99};
    expect(validateCandidates({sugerencias:[data]},[page],['fechaNacimiento'])).toHaveLength(1);
    expect(validateCandidates({sugerencias:[{...data,valor:'1961-01-20'}]},[page],['fechaNacimiento'])).toEqual([]);
  });
  it('descarta un valor inventado aunque el modelo cite un fragmento real',()=>{
    expect(validateCandidates({sugerencias:[{...candidate,valor:'Administrador de empresas'}]},pages,['pregrado'])).toEqual([]);
  });
  it('no confunde el nivel académico con el nombre del título',()=>{
    const page={pagina:1,texto:'Diploma de Pregrado. Título: Ingeniería Civil',confianza:0.98};
    expect(validateCandidates({sugerencias:[{...candidate,valor:'Pregrado',evidencia:page.texto}]},[page],['pregrado'])).toEqual([]);
  });
  it('no duplica campos ni acepta fechas imposibles',()=>{
    expect(validateCandidates({sugerencias:[candidate,candidate]},pages,['pregrado'])).toHaveLength(1);
    expect(validateCandidates({sugerencias:[{...candidate,campo:'fechaNacimiento',valor:'2000-02-31'}]},pages,['fechaNacimiento'])).toEqual([]);
  });
  it('acepta los datos normalizados de una cédula cuando todos están sustentados por el OCR',()=>{
    const identityPage={pagina:1,texto:'CÉDULA DE CIUDADANÍA\nNÚMERO\n1.026.302.654\nPALENCIA MENDOZA\nAPELLIDOS\nDANIELA PATRICIA\nNOMBRES\nA+\nF\nESTATURA\nG.S. RH\nSEXO',confianza:0.97};
    const suggestions=[
      {campo:'documentType',valor:'CC',pagina:1,evidencia:'CÉDULA DE CIUDADANÍA',confianza:0.96},
      {campo:'documentNumber',valor:'1026302654',pagina:1,evidencia:'NÚMERO 1026302654',confianza:0.96},
      {campo:'nombreCompleto',valor:'DANIELA PATRICIA PALENCIA MENDOZA',pagina:1,evidencia:'DANIELA PATRICIA PALENCIA MENDOZA',confianza:0.95},
      {campo:'genero',valor:'F',pagina:1,evidencia:'SEXO F',confianza:0.94},
      {campo:'sexoBiologico',valor:'F',pagina:1,evidencia:'SEXO F',confianza:0.94},
    ];
    expect(validateCandidates({sugerencias:suggestions},[identityPage],allowedExtractionFields('documento_identidad')).map(item=>item.campo))
      .toEqual(['documentType','documentNumber','nombreCompleto','genero','sexoBiologico']);
    const normalized=validateCandidates({sugerencias:suggestions},[identityPage],allowedExtractionFields('documento_identidad'));
    expect(normalized.find(item=>item.campo==='genero')?.valor).toBe('Femenino');
    expect(normalized.find(item=>item.campo==='sexoBiologico')?.valor).toBe('Mujer');
    expect(normalized.find(item=>item.campo==='nombreCompleto')?.evidencia).toBe('PALENCIA MENDOZA\nAPELLIDOS\nDANIELA PATRICIA\nNOMBRES');
    expect(normalized.find(item=>item.campo==='genero')?.evidencia).toBe('F\nESTATURA\nG.S. RH\nSEXO');
  });
  it('rechaza género o sexo deducidos sin un marcador explícito en la evidencia',()=>{
    const page={pagina:1,texto:'NOMBRES DANIELA PATRICIA',confianza:0.99};
    expect(validateCandidates({sugerencias:[{campo:'genero',valor:'Femenino',pagina:1,evidencia:page.texto,confianza:0.99}]},[page],['genero'])).toEqual([]);
  });
  it.each(['LCEDULADECIUDADANIA','CÉDULA\nDE CIUDADANÍA'])('recupera la etiqueta documental unida o dividida por OCR conservando la cita: %s',text=>{
    const page={pagina:1,texto:text,confianza:0.96};
    const result=validateCandidates({sugerencias:[{campo:'documentType',valor:'CC',pagina:1,evidencia:'Cédula de ciudadanía',confianza:0.97}]},[page],['documentType']);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({valor:'CC',evidencia:text});
  });
  it.each(['CIUDADANIA','CC','CÉDULADEEXTRANJERÍA','CEDULA DE CIUDADANIA O CEDULA DE EXTRANJERIA'])('no completa CC sin una etiqueta inequívoca en el documento: %s',text=>{
    expect(validateCandidates({sugerencias:[{campo:'documentType',valor:'CC',pagina:1,evidencia:text,confianza:1}]},[{pagina:1,texto:text,confianza:1}],['documentType'])).toEqual([]);
  });
  it.each(['https://ollama.com','http://example.com','http://user:pass@localhost','file:///tmp/doc'])('no envía documentos a direcciones públicas: %s',url=>{
    expect(()=>localExtractionUrl(url)).toThrow();
  });
  it.each(['http://localhost:8091','http://rund-ocr:8091','http://192.168.1.10:8091'])('permite infraestructura local: %s',url=>{
    expect(localExtractionUrl(url)).toBe(url);
  });
  it('permite los modelos locales de las instalaciones compatibles y rechaza variantes no soportadas',()=>{
    expect(localExtractionModel('qwen3.5:4b')).toBe('qwen3.5:4b');
    expect(localExtractionModel('gemma4:e4b')).toBe('gemma4:e4b');
    expect(()=>localExtractionModel('qwen3.5:cloud')).toThrow('MODELO_LOCAL_REQUERIDO');
    expect(()=>localExtractionModel('gemma4:rund-e2b-text')).toThrow('MODELO_LOCAL_REQUERIDO');
    expect(()=>localExtractionModel('gemma4:e4b-cloud')).toThrow('MODELO_LOCAL_REQUERIDO');
  });
});

describe('F014: validación humana obligatoria',()=>{
  const suggestion={id,estado:'PENDIENTE',documento_estado:'ACTIVO',trabajo_estado:'COMPLETADO',campo:'pregrado',valor:'Título nuevo',valor_previo:'Título anterior',confianza:0.96,evidencia:'Título: Título nuevo'};
  function dbFor(s:any=suggestion,old='Título anterior'){
    return {query:jest.fn(async(sql:string)=>sql.includes('SELECT s.*')?[s]:sql.includes('p.nom_largo')?[{pregrado:old}]:[])};
  }
  it('verifica la vigencia del documento y el valor anterior antes de usar una sugerencia',async()=>{
    await expect(lockExtractionSuggestions(dbFor(),'doc',[id],{pregrado:'Título nuevo'})).resolves.toHaveLength(1);
  });
  it('bloquea aplicar una lectura histórica incoherente y permite su corrección humana explícita',async()=>{
    const bad={...suggestion,valor:'AENTACIONHDEIUAHTUNT',confianza:0.99,evidencia:'TÍTULO DE: AENTACIONHDEIUAHTUNT'};
    expect(extractionSuggestionQualityError(bad)).toEqual(expect.any(String));
    await expect(lockExtractionSuggestions(dbFor(bad),'doc',[id],{pregrado:bad.valor})).rejects.toThrow('no es fiable');
    await expect(lockExtractionSuggestions(dbFor(bad),'doc',[id],{pregrado:'Economista'})).resolves.toHaveLength(1);
  });
  it.each([{estado:'APROBADA'},{documento_estado:'REEMPLAZADO'},{documento_estado:'ELIMINADO'},{trabajo_estado:'PROCESANDO'}])('bloquea resultados obsoletos: %p',async change=>{
    await expect(lockExtractionSuggestions(dbFor({...suggestion,...change}),'doc',[id],{pregrado:'Título nuevo'})).rejects.toBeInstanceOf(ConflictException);
  });
  it('evita sobrescribir un dato modificado simultáneamente',async()=>{
    await expect(lockExtractionSuggestions(dbFor(suggestion,'Otro título'),'doc',[id],{pregrado:'Título nuevo'})).rejects.toBeInstanceOf(ConflictException);
  });
  it('rechaza sugerencias de otro docente',async()=>{
    await expect(lockExtractionSuggestions({query:jest.fn().mockResolvedValue([])},'otro',[id],{pregrado:'Título nuevo'})).rejects.toBeInstanceOf(ConflictException);
  });
  it('registra corrección, operador y motivo',async()=>{
    const db=dbFor();
    await confirmExtractionSuggestions(db,[suggestion],{pregrado:'Título corregido'},'GGP','Revisado con diploma');
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE'),[id,'CORREGIDA','Título corregido','GGP','Revisado con diploma']);
  });
  it.each([['invalido'],[id,id],{},null])('rechaza selección malformada',input=>{
    expect(()=>extractionIds(input)).toThrow(BadRequestException);
  });
  it('no permite ver ni encolar texto sensible a usuarios sin acceso al PDF original',async()=>{
    const service={list:jest.fn(),enqueue:jest.fn()};const controller=new RundExtraccionController(service as any);
    await expect(controller.list(id,{user:{userId:'user',roles:['DOCENTE']}})).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.list).not.toHaveBeenCalled();
  });
  it('el perfil conserva su requisito de soporte y justificación al aprobar sugerencias',async()=>{
    const service=Object.create(BancoDocentesService.prototype);
    service.resolveDocenteId=jest.fn().mockResolvedValue('doc');
    service.docenteRepo={findOne:jest.fn().mockResolvedValue({id:'doc'})};
    await expect(service.updateDocente('doc',{rundSuggestionIds:[id],rundSensitiveAccess:{fullAccess:true}})).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('F014: aplicación directa y segura',()=>{
  const actor={actorId:'REVISOR',roles:['GESTION_PROFESORAL'],fullAccess:true};
  const transactionDb=(query:jest.Mock)=>({transaction:jest.fn(async(work:any)=>work({query}))});

  it.each([{valorCorregido:'',motivo:'Corregir'}, {valorCorregido:'Dato correcto',motivo:' '}, {valorCorregido:123,motivo:'Corrección humana'}])('rechaza una corrección incompleta antes de abrir la transacción: %p',async correction=>{
    const db=transactionDb(jest.fn());
    const service=new RundExtraccionService(db as any,{} as any);
    await expect(service.confirm('doc-1',id,actor,correction as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it('permite transcribir manualmente con motivo un valor real aunque su lectura OCR tuviera baja confianza',async()=>{
    const selected={id,campo:'pregrado',valor:'Economista',valor_previo:'Economista',estado:'PENDIENTE',documento_estado:'ACTIVO',trabajo_estado:'COMPLETADO',confianza:0.2,evidencia:'TÍTULO DE: Economista'};
    const query=jest.fn(async(sql:string)=>sql.includes('SELECT s.id,s.campo')||sql.includes('SELECT s.*')?[selected]:sql.includes('p.nom_largo')?[{pregrado:'Economista'}]:[]);
    const service=new RundExtraccionService(transactionDb(query) as any,{} as any);
    await expect(service.confirm('doc',id,actor)).rejects.toThrow('no es fiable');
    await expect(service.confirm('doc',id,actor,{valorCorregido:'Economista',motivo:'Transcrito y verificado visualmente en el diploma.'})).resolves.toMatchObject({confirmed:true,changed:false});
    expect(query).toHaveBeenCalledWith(expect.stringContaining('RundAprobacionLog'),expect.arrayContaining(['CORREGIR_SUGERENCIA_OCR']));
  });

  it('confirma M y Masculino como coincidencia sin reescribir el perfil',async()=>{
    const selected={id,campo:'genero',valor:'Masculino',valor_previo:'M',trabajo_id:'job-1',documento_id:'pdf-1',estado:'PENDIENTE',documento_estado:'ACTIVO',trabajo_estado:'COMPLETADO',confianza:0.96,evidencia:'SEXO M'};
    const query=jest.fn(async(sql:string)=>{
      if(sql.includes('SELECT s.id,s.campo')||sql.includes('SELECT s.*'))return [selected];
      if(sql.includes('p.nom_largo'))return [{gen_tercero:'M'}];
      return [];
    });
    const service=new RundExtraccionService(transactionDb(query) as any,{} as any);
    await expect(service.confirm('doc-1',id,actor)).resolves.toMatchObject({confirmed:true,changed:false});
    expect(query.mock.calls.some(([sql])=>String(sql).includes('UPDATE auth.personas'))).toBe(false);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('RundAprobacionLog'),expect.arrayContaining(['CONFIRMAR_COINCIDENCIA_OCR']));
  });

  it('advierte en la interfaz pero permite que la decisión humana aplique un dato diferente',async()=>{
    const selected={id,campo:'genero',valor:'Femenino',valor_previo:'M',trabajo_id:'job-1',documento_id:'pdf-1',estado:'PENDIENTE',documento_estado:'ACTIVO',trabajo_estado:'COMPLETADO',confianza:0.96,evidencia:'SEXO F'};
    const query=jest.fn(async(sql:string)=>{
      if(sql.includes('SELECT s.id,s.campo'))return [selected];
      if(sql.includes('SELECT s.*'))return [selected];
      if(sql.includes('p.nom_largo'))return [{gen_tercero:'M'}];
      if(sql.includes("campo IN ('documentNumber','nombreCompleto')"))return [
        {campo:'documentNumber',valor:'1118860393',valor_previo:'12630026'},
        {campo:'nombreCompleto',valor:'DANIELA PATRICIA PALENCIA MENDOZA',valor_previo:'ALVARO LUIS MERCADO SUAREZ'},
      ];
      return [];
    });
    const service=new RundExtraccionService(transactionDb(query) as any,{} as any);
    await expect(service.confirm('doc-1',id,actor)).resolves.toMatchObject({confirmed:true,changed:true,campo:'genero'});
    expect(query).toHaveBeenCalledWith(expect.stringContaining('SET gen_tercero=$2'),['doc-1','F']);
  });

  it('permite corregir el número documental si no pertenece a otra persona registrada',async()=>{
    const selected={id,campo:'documentNumber',valor:'1118860393',valor_previo:'12630026',trabajo_id:'job-1',documento_id:'pdf-1',estado:'PENDIENTE',documento_estado:'ACTIVO',trabajo_estado:'COMPLETADO',confianza:0.96,evidencia:'NÚMERO 1118860393'};
    const query=jest.fn(async(sql:string)=>{
      if(sql.includes('SELECT s.id,s.campo'))return [selected];
      if(sql.includes('SELECT s.*'))return [selected];
      if(sql.includes('p.nom_largo'))return [{num_identificacion:'12630026'}];
      if(sql.includes('AS document_type'))return [{document_type:'CC'}];
      return [];
    });
    const service=new RundExtraccionService(transactionDb(query) as any,{} as any);
    await expect(service.confirm('doc-1',id,actor)).resolves.toMatchObject({confirmed:true,changed:true,campo:'documentNumber',valor:'1118860393'});
    expect(query).toHaveBeenCalledWith("SELECT set_config('app.rund_ocr_suggestion_id',$1,true)",[id]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('SET num_identificacion=$2'),['doc-1','1118860393']);
  });

  it('rechaza antes de escribir un numero alfanumerico incompatible con una cedula',async()=>{
    const selected={id,campo:'documentNumber',valor:'AB12345',valor_previo:'12630026',trabajo_id:'job-1',documento_id:'pdf-1',estado:'PENDIENTE',documento_estado:'ACTIVO',trabajo_estado:'COMPLETADO',confianza:0.96,evidencia:'NÚMERO AB12345'};
    const query=jest.fn(async(sql:string)=>{
      if(sql.includes('SELECT s.id,s.campo'))return [selected];
      if(sql.includes('SELECT s.*'))return [selected];
      if(sql.includes('p.nom_largo'))return [{num_identificacion:'12630026'}];
      if(sql.includes('AS document_type'))return [{document_type:'CC'}];
      return [];
    });
    const service=new RundExtraccionService(transactionDb(query) as any,{} as any);
    await expect(service.confirm('doc-1',id,actor)).rejects.toThrow('debe contener');
    expect(query.mock.calls.some(([sql])=>String(sql).includes('SET num_identificacion=$2'))).toBe(false);
  });

  it('evita crear dos personas con el mismo número documental',async()=>{
    const selected={id,campo:'documentNumber',valor:'1118860393',valor_previo:'12630026',trabajo_id:'job-1',documento_id:'pdf-1',estado:'PENDIENTE',documento_estado:'ACTIVO',trabajo_estado:'COMPLETADO',confianza:0.96,evidencia:'NÚMERO 1118860393'};
    const query=jest.fn(async(sql:string)=>{
      if(sql.includes('SELECT s.id,s.campo'))return [selected];
      if(sql.includes('SELECT s.*'))return [selected];
      if(sql.includes('p.nom_largo'))return [{num_identificacion:'12630026'}];
      if(sql.includes('AS document_type'))return [{document_type:'CC'}];
      if(sql.includes('SELECT p.id_person FROM auth.personas'))return [{id_person:'otra-persona'}];
      return [];
    });
    const service=new RundExtraccionService(transactionDb(query) as any,{} as any);
    await expect(service.confirm('doc-1',id,actor)).rejects.toThrow('ya está asociado');
    expect(query.mock.calls.some(([sql])=>String(sql).includes('SET num_identificacion=$2'))).toBe(false);
  });

  it('aplica únicamente el valor exacto de la sugerencia y deja trazabilidad',async()=>{
    const selected={id,campo:'pregrado',valor:'Administración Pública',valor_previo:'Derecho',trabajo_id:'job-1',documento_id:'pdf-1',estado:'PENDIENTE',documento_estado:'ACTIVO',trabajo_estado:'COMPLETADO',confianza:0.96,evidencia:'Título: Administración Pública'};
    const query=jest.fn(async(sql:string)=>{
      if(sql.includes('SELECT s.id,s.campo'))return [selected];
      if(sql.includes('SELECT s.*'))return [selected];
      if(sql.includes('p.nom_largo'))return [{pregrado:'Derecho'}];
      if(sql.includes("campo IN ('documentNumber','nombreCompleto')"))return [];
      return [];
    });
    const service=new RundExtraccionService(transactionDb(query) as any,{} as any);
    await expect(service.confirm('doc-1',id,actor)).resolves.toMatchObject({confirmed:true,changed:true,campo:'pregrado',valor:'Administración Pública'});
    expect(query).toHaveBeenCalledWith(expect.stringContaining('SET pregrado=$2'),['doc-1','Administración Pública']);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('RundAprobacionLog'),expect.arrayContaining(['APLICAR_SUGERENCIA_OCR']));
    expect(query.mock.calls.some(([sql])=>String(sql).includes("SET estado = $2"))).toBe(true);
  });
});

describe('F014: cola independiente del flujo documental',()=>{
  const previous=process.env.RUND_OCR_ENABLED;
  afterEach(()=>{if(previous===undefined)delete process.env.RUND_OCR_ENABLED;else process.env.RUND_OCR_ENABLED=previous;});
  it('no consulta BD ni motores cuando está desactivado',async()=>{
    delete process.env.RUND_OCR_ENABLED;
    const db={query:jest.fn()}; const storage={read:jest.fn()};const service=new RundExtraccionService(db as any,storage as any);
    service.onModuleInit();await service.tick();service.onModuleDestroy();
    expect(db.query).not.toHaveBeenCalled();expect(storage.read).not.toHaveBeenCalled();
  });
  it('las cargas nuevas no inician OCR sin una selección explícita por defecto',async()=>{
    process.env.RUND_OCR_ENABLED='true';
    const previousAuto=process.env.RUND_EXTRACCION_AUTOMATICA;
    delete process.env.RUND_EXTRACCION_AUTOMATICA;
    const db={query:jest.fn(async(_sql:string)=>[])};
    try{
      await new RundExtraccionService(db as any,{} as any).tick();
      expect(db.query.mock.calls.some(([sql])=>String(sql).includes('INSERT INTO academic_work_plan."RundExtraccionTrabajo"'))).toBe(false);
      expect(db.query.mock.calls.some(([sql])=>String(sql).includes('SELECT * FROM reservado'))).toBe(true);
    }finally{if(previousAuto===undefined)delete process.env.RUND_EXTRACCION_AUTOMATICA;else process.env.RUND_EXTRACCION_AUTOMATICA=previousAuto;}
  });
  it('un fallo del OCR no propaga errores al flujo principal ni escribe el perfil',async()=>{
    process.env.RUND_OCR_ENABLED='true';
    const db={query:jest.fn().mockRejectedValue(new Error('BD caída'))};
    const service=new RundExtraccionService(db as any,{} as any);
    await expect(service.tick()).resolves.toBeUndefined();
    expect(db.query.mock.calls.flat().join(' ')).not.toContain('UPDATE auth.personas');
  });
  it('mantiene la reserva mientras el motor trabaja y libera el heartbeat al terminar',async()=>{
    jest.useFakeTimers();process.env.RUND_OCR_ENABLED='true';
    const job={id,lease_id:id};let done!:()=>void;
    const db={query:jest.fn(async(sql:string)=>sql.includes('SELECT * FROM reservado')?[job]:[])};
    const service=new RundExtraccionService(db as any,{} as any);
    const processJob=jest.spyOn(service as any,'process').mockImplementation(()=>new Promise<void>(r=>{done=r;}));
    try {
      const pending=service.tick();await jest.advanceTimersByTimeAsync(1);
      expect(processJob).toHaveBeenCalledWith(job);
      await service.tick();expect(processJob).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(20000);
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining("lease_hasta=now()+interval '90 seconds'"),[id,id]);
      done();await pending;const count=db.query.mock.calls.length;
      await jest.advanceTimersByTimeAsync(40000);expect(db.query).toHaveBeenCalledTimes(count);
    }finally{await service.onModuleDestroy();jest.useRealTimers();}
  });
  it('libera el worker y registra un reintento si una operación de procesamiento nunca termina',async()=>{
    jest.useFakeTimers();process.env.RUND_OCR_ENABLED='true';
    const job={id,lease_id:id};
    const db={query:jest.fn(async(sql:string)=>sql.includes('SELECT * FROM reservado')?[job]:[])};
    const service=new RundExtraccionService(db as any,{} as any);
    (service as any).processingTimeoutMs=100;
    const processJob=jest.spyOn(service as any,'process')
      .mockImplementationOnce(()=>new Promise(()=>undefined)).mockResolvedValueOnce(undefined);
    try {
      const pending=service.tick();
      await jest.advanceTimersByTimeAsync(101);await pending;
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining("disponible_en=now()+interval '1 minute'"),[id,id,'EXTRACCION_TIMEOUT']);
      const calls=db.query.mock.calls.length;
      await jest.advanceTimersByTimeAsync(20000);expect(db.query).toHaveBeenCalledTimes(calls);
      await service.tick();expect(processJob).toHaveBeenCalledTimes(2);
    }finally{await service.onModuleDestroy();jest.useRealTimers();}
  });
});
