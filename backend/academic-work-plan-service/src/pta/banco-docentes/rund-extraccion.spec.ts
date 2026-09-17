import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { validateCandidates, allowedExtractionFields, extractionFieldsForDocument, extractionIds, lockExtractionSuggestions, confirmExtractionSuggestions } from './rund-extraccion-fields';
import { localExtractionUrl, RundExtraccionService } from './rund-extraccion.service';
import { RundExtraccionController } from './rund-extraccion.controller';
import { BancoDocentesService } from './banco-docentes.service';

const id='11111111-1111-4111-8111-111111111111';
const pages=[{pagina:1,texto:'Título: Administrador Público',confianza:0.96}];
const candidate={campo:'pregrado',valor:'Administrador Público',evidencia:'Título: Administrador Público',pagina:1,confianza:0.95};
describe('F014: extracción de candidatos no confiables',()=>{
  it('permite solo campos sustentados por el tipo de soporte',()=>{
    expect(allowedExtractionFields('diploma_pregrado')).toEqual(['pregrado']);
    expect(extractionFieldsForDocument({categoria_codigo:'IDENTIDAD'})).toContain('nombreCompleto');
    expect(allowedExtractionFields('autorizacion_habeas_data')).toEqual([]);
    expect(allowedExtractionFields('documento_identidad')).not.toContain('genero');
    expect(allowedExtractionFields('documento_identidad')).not.toContain('documentNumber');
  });
  it('conserva evidencia y no confirma automáticamente aun con alta confianza',()=>{
    const [result]=validateCandidates({sugerencias:[candidate]},pages,['pregrado']);
    expect(result).toMatchObject({campo:'pregrado',valor:'Administrador Público',baja_confianza:false});
    expect(result).not.toHaveProperty('estado');
  });
  it.each([{campo:'estado'},{campo:'puntajeSalarial'},{pagina:7},{evidencia:'Texto inventado'},{valor:''},{valor:123}])('descarta respuestas inválidas: %p',change=>{
    expect(validateCandidates({sugerencias:[{...candidate,...change}]},pages,['pregrado'])).toEqual([]);
  });
  it('no acepta la confianza declarada por el modelo si el OCR es débil',()=>{
    expect(validateCandidates({sugerencias:[candidate]},[{...pages[0],confianza:0.3}],['pregrado'])[0].baja_confianza).toBe(true);
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
  it.each(['https://ollama.com','http://example.com','http://user:pass@localhost','file:///tmp/doc'])('no envía documentos a direcciones públicas: %s',url=>{
    expect(()=>localExtractionUrl(url)).toThrow();
  });
  it.each(['http://localhost:8091','http://rund-ocr:8091','http://192.168.1.10:8091'])('permite infraestructura local: %s',url=>{
    expect(localExtractionUrl(url)).toBe(url);
  });
});

describe('F014: validación humana obligatoria',()=>{
  const suggestion={id,estado:'PENDIENTE',documento_estado:'ACTIVO',trabajo_estado:'COMPLETADO',campo:'pregrado',valor:'Título nuevo',valor_previo:'Título anterior'};
  function dbFor(s:any=suggestion,old='Título anterior'){
    return {query:jest.fn(async(sql:string)=>sql.includes('SELECT s.*')?[s]:sql.includes('p.nom_largo')?[{pregrado:old}]:[])};
  }
  it('verifica la vigencia del documento y el valor anterior antes de usar una sugerencia',async()=>{
    await expect(lockExtractionSuggestions(dbFor(),'doc',[id],{pregrado:'Título nuevo'})).resolves.toHaveLength(1);
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

describe('F014: cola independiente del flujo documental',()=>{
  const previous=process.env.RUND_OCR_ENABLED;
  afterEach(()=>{if(previous===undefined)delete process.env.RUND_OCR_ENABLED;else process.env.RUND_OCR_ENABLED=previous;});
  it('no consulta BD ni motores cuando está desactivado',async()=>{
    delete process.env.RUND_OCR_ENABLED;
    const db={query:jest.fn()}; const storage={read:jest.fn()};const service=new RundExtraccionService(db as any,storage as any);
    service.onModuleInit();await service.tick();service.onModuleDestroy();
    expect(db.query).not.toHaveBeenCalled();expect(storage.read).not.toHaveBeenCalled();
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
});
