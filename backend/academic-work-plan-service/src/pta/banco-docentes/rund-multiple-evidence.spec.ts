import { ConflictException } from '@nestjs/common';
import {
  evidenceApprovalProblem, evidenceFields, hasOpenEvidenceReturn, RUND_MAX_EVIDENCES_PER_TYPE, RundEvidenceWorkflow,
} from './rund-evidence-workflow';
import { RundDocumentosService } from './rund-documentos.service';
import { BancoDocentesController } from './banco-docentes.controller';
import { RundExtraccionService } from './rund-extraccion.service';
import { dataReviewContext } from './rund-data-review';

const decided = (type: string, estado: string, version = `v-${type}-${estado}`, extra: any = {}) => ({
  id: `${type}-${estado}-${version}`, tipo_soporte: type, documento_perfil_id: version, documento_carpeta_id: `/file/${version}`,
  estado: estado === 'Pendiente' ? 'Pendiente' : estado,
  revisiones_campos: estado === 'Pendiente' ? {} : Object.fromEntries(evidenceFields(type).map(field => [field, { estado, documentoVersionId: version }])),
  ...extra,
});

describe('Varias evidencias por punto de control: reglas', () => {
  it('una devolución queda abierta solo si ninguna otra evidencia del punto puede acreditar la fila', () => {
    expect(hasOpenEvidenceReturn([decided('diploma_pregrado', 'Rechazado')])).toBe(true);
    expect(hasOpenEvidenceReturn([decided('diploma_pregrado', 'Rechazado'), decided('diploma_pregrado', 'Aprobado')])).toBe(false);
    expect(hasOpenEvidenceReturn([decided('diploma_pregrado', 'Rechazado'), decided('diploma_pregrado', 'Pendiente')])).toBe(false);
    // Otro tipo de soporte no cubre la fila devuelta.
    expect(hasOpenEvidenceReturn([decided('diploma_pregrado', 'Rechazado'), decided('hoja_vida_pro', 'Aprobado')])).toBe(true);
    // CC, CE y pasaporte comparten el mismo punto de identidad.
    expect(hasOpenEvidenceReturn([decided('documento_identidad', 'Rechazado'), decided('pasaporte', 'Aprobado')])).toBe(false);
    // Los soportes del trámite de edición no participan.
    expect(hasOpenEvidenceReturn([decided('soporte_edicion_perfil', 'Rechazado')])).toBe(false);
  });

  it('una devolución histórica registrada solo a nivel de soporte se sigue considerando', () => {
    expect(hasOpenEvidenceReturn([{ tipo_soporte: 'contrato', estado: 'Rechazado', documento_perfil_id: 'v1', revisiones_campos: {} }])).toBe(true);
  });

  it('aprueba con las evidencias admitidas aunque otra del mismo punto haya sido devuelta', () => {
    const supports = [decided('autorizacion_habeas_data', 'Rechazado', 'v1'), decided('autorizacion_habeas_data', 'Aprobado', 'v2')];
    expect(evidenceApprovalProblem('TRANSVERSAL', {}, supports)).toBeNull();
  });

  it('exige decidir cada evidencia vigente antes de aprobar', () => {
    const supports = [decided('autorizacion_habeas_data', 'Aprobado', 'v1'), decided('autorizacion_habeas_data', 'Pendiente', 'v2')];
    expect(evidenceApprovalProblem('TRANSVERSAL', {}, supports)).toMatch(/^Revise y apruebe/);
  });

  it('no acredita un dato obligatorio si todas sus evidencias fueron devueltas', () => {
    const supports = [decided('autorizacion_habeas_data', 'Rechazado', 'v1'), decided('autorizacion_habeas_data', 'Rechazado', 'v2')];
    expect(evidenceApprovalProblem('TRANSVERSAL', {}, supports)).toMatch(/al menos una evidencia válida/);
    expect(evidenceApprovalProblem('TRANSVERSAL', {}, [])).toMatch(/^Faltan soportes obligatorios/);
  });

  it('en identidad cada fila necesita al menos una evidencia admitida', () => {
    const fields = evidenceFields('documento_identidad');
    const partial = { ...decided('documento_identidad', 'Aprobado', 'cc'), revisiones_campos: Object.fromEntries(fields.map((field, index) =>
      [field, { estado: index === 0 ? 'Rechazado' : 'Aprobado', documentoVersionId: 'cc' }])) };
    expect(evidenceApprovalProblem('IDENTIDAD', {}, [partial])).toMatch(/al menos una evidencia válida/);
    const passport = { ...decided('pasaporte', 'Aprobado', 'pa'), revisiones_campos: { [fields[0]]: { estado: 'Aprobado', documentoVersionId: 'pa' },
      ...Object.fromEntries(fields.slice(1).map(field => [field, { estado: 'Rechazado', documentoVersionId: 'pa' }])) } };
    expect(evidenceApprovalProblem('IDENTIDAD', {}, [partial, passport])).toBeNull();
  });

  it('una evidencia admitida vencida impide aprobar; una devuelta vencida no', () => {
    const expired = { fecha_vencimiento: '2000-01-01' };
    expect(evidenceApprovalProblem('TRANSVERSAL', {}, [decided('autorizacion_habeas_data', 'Aprobado', 'v1', expired)])).toMatch(/vencidas/);
    expect(evidenceApprovalProblem('TRANSVERSAL', {}, [decided('autorizacion_habeas_data', 'Rechazado', 'v1', expired),
      decided('autorizacion_habeas_data', 'Aprobado', 'v2')])).toBeNull();
  });

  it('reviewBlock aprueba el espacio con la evidencia admitida y registra todas las decisiones', async () => {
    const supports = [decided('autorizacion_habeas_data', 'Rechazado', 'v1'), decided('autorizacion_habeas_data', 'Aprobado', 'v2')];
    const dataContext=dataReviewContext('TRANSVERSAL',{},supports.map(s=>({...s,estado_documento:'ACTIVO'})),[]);
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT * FROM academic_work_plan."Docente"')) return [{ id: 'docente' }];
      if (sql.includes('SELECT * FROM academic_work_plan."RundCampoEstado"')) return [{ bloque: 'TRANSVERSAL', version: 3, estado: 'En revisión' }];
      if (sql.includes('SELECT * FROM academic_work_plan."RundSoporteCampo"')) return supports;
      if (sql.includes('SELECT id, estado FROM academic_work_plan."RundDocumentoPerfil"'))return [{id:'v1',estado:'ACTIVO'},{id:'v2',estado:'ACTIVO'}];
      if (sql.includes('SELECT DISTINCT ON')) return [{bloque:'TRANSVERSAL',metadata:{campo:'autorizacion_habeas_data',estado:'Aprobado',huella:dataContext.autorizacion_habeas_data.huella}}];
      return [];
    });
    const runner = { query, connect: jest.fn(), release: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(), rollbackTransaction: jest.fn() };
    await expect(new RundEvidenceWorkflow({ createQueryRunner: () => runner } as any).reviewBlock('docente', 'TRANSVERSAL', 'revisor', undefined, undefined, 3))
      .resolves.toMatchObject({ estado: 'Aprobado' });
    const audit = query.mock.calls.find(([sql, params]) => sql.includes('RundAprobacionLog') && params?.includes('APROBAR'));
    expect(JSON.parse(audit![1][8]).soportes.map((s: any) => s.estado)).toEqual(['Rechazado', 'Aprobado']);
  });

  it('devolver una de dos evidencias deja el espacio en revisión y registra su posición', async () => {
    const first = decided('autorizacion_habeas_data', 'Pendiente', 'v1', { id: 'evidencia-1', createdAt: '2026-10-01T10:00:00Z', revisiones_campos: {} });
    const second = decided('autorizacion_habeas_data', 'Aprobado', 'v2', { id: 'evidencia-2', createdAt: '2026-10-02T10:00:00Z' });
    const states: string[] = [];
    const query = jest.fn(async (sql: string, params: any[] = []) => {
      if (sql.includes('SELECT * FROM academic_work_plan."Docente"')) return [{ id: 'docente' }];
      if (sql.includes('FROM academic_work_plan."RundSoporteCampo" WHERE id = $1')) return [first];
      if (sql.includes('SELECT id, estado FROM academic_work_plan."RundDocumentoPerfil"')) return [{ id: 'v1', estado: 'ACTIVO' }];
      if (sql.includes('SELECT version FROM')) return [{ version: 4 }];
      if (sql.startsWith('UPDATE academic_work_plan."RundSoporteCampo"')) { first.estado = params[0]; first.revisiones_campos = JSON.parse(params[3]); return []; }
      if (sql.includes('UPDATE academic_work_plan."RundCampoEstado" SET estado')) {
        states.push(sql.includes("'Devuelto'") ? 'Devuelto' : params[0]);
        // A covered return keeps its reason on the evidence, not on the block.
        if (!sql.includes("'Devuelto'")) expect(params[2]).toBeNull();
        return [];
      }
      if (sql.includes('FROM academic_work_plan."RundSoporteCampo" WHERE docente_id::text = $1 AND bloque = $2')) return [first, second];
      return [];
    });
    const runner = { query, connect: jest.fn(), release: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(), rollbackTransaction: jest.fn() };
    await new RundEvidenceWorkflow({ createQueryRunner: () => runner } as any).reviewSupport('docente', 'TRANSVERSAL', 'evidencia-1',
      { estado: 'Rechazado', observacion: 'No está firmado.', documentoVersionId: 'v1', blockVersion: 4 }, 'revisor');
    expect(states).toEqual(['En revisión']);
    const audit = query.mock.calls.find(([sql, params]) => sql.includes('RundAprobacionLog') && params?.includes('DEVOLVER_SOPORTE'));
    expect(JSON.parse(audit![1][8])).toMatchObject({ evidencia: 1, evidenciasVigentes: 2, estadoNuevo: 'Rechazado' });
    expect(runner.commitTransaction).toHaveBeenCalled();
  });
});

const docente = { id: '11111111-1111-1111-1111-111111111111', persona_id: '22222222-2222-4222-8222-222222222222', document_number: '123456' };
const pdf = { originalname: 'segundo.pdf', mimetype: 'application/pdf', size: 12, buffer: Buffer.from('%PDF-1.7\n') } as Express.Multer.File;
const category = { codigo: 'AUTORIZACIONES', nombre: 'Autorizaciones', mime_permitidos: ['application/pdf'], tamano_maximo_bytes: 10 * 1024 * 1024 };

function documentService(activeEvidences: number, runnerQuery: (sql: string, params?: any[]) => any = () => []) {
  const runner = {
    connect: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(), rollbackTransaction: jest.fn(), release: jest.fn(),
    isTransactionActive: true,
    query: jest.fn(async (sql: string, params?: any[]) => {
      if (sql.includes('"Docente"') && sql.includes('FOR UPDATE')) return [{ id: docente.id }];
      if (sql.includes('COUNT(*)::int AS total')) return [{ total: activeEvidences }];
      if (sql.includes('INSERT INTO academic_work_plan."RundDocumentoPerfil"')) return [{ id: params?.[0], docente_id: docente.id, version: 1, estado: 'ACTIVO', creado_por: 'cargador' }];
      return runnerQuery(sql, params);
    }),
  };
  const db = {
    createQueryRunner: () => runner,
    query: jest.fn(async (sql: string) => {
      if (sql.includes('FROM academic_work_plan."Docente" d')) return [docente];
      if (sql.includes('RundDocumentoCategoria')) return [category];
      if (sql.includes('COUNT(*)::int AS total')) return [{ total: activeEvidences }];
      return [];
    }),
  };
  const storage = { store: jest.fn().mockResolvedValue({ provider: 'LOCAL', storageId: 'x', storagePath: '/x' }), remove: jest.fn().mockResolvedValue(undefined) };
  return { service: new RundDocumentosService(db as any, storage as any), runner, storage };
}

describe('Varias evidencias por punto de control: carga y retiro', () => {
  const input = { categoria: 'AUTORIZACIONES', bloque: 'TRANSVERSAL', tipoSoporte: 'autorizacion_habeas_data' };

  it('agrega una segunda evidencia con su propia fila de revisión y la registra como adicional', async () => {
    const { service, runner } = documentService(1);
    await service.create(docente.id, input, pdf, 'cargador', '10.0.0.1');
    const sql = runner.query.mock.calls.map(([statement]) => statement);
    expect(sql.some(statement => statement.includes('INSERT INTO academic_work_plan."RundSoporteCampo"'))).toBe(true);
    expect(sql.some(statement => statement.includes('UPDATE academic_work_plan."RundSoporteCampo"'))).toBe(false);
    const audit = runner.query.mock.calls.find(([statement, params]) => statement.includes("'RUND_DOCUMENTAL'") && params?.includes('CARGAR_DOCUMENTO'));
    expect(JSON.parse(audit![1][7])).toMatchObject({ tipoSoporte: 'autorizacion_habeas_data', evidencia: 2, evidenciasVigentes: 2, evidenciaAdicional: true });
    expect(runner.commitTransaction).toHaveBeenCalled();
  });

  it('solo reutiliza una fila de revisión vacía, nunca la de otra evidencia vigente', async () => {
    const { service, runner } = documentService(0);
    await service.create(docente.id, input, pdf, 'cargador');
    const lookup = runner.query.mock.calls.find(([statement]) => statement.includes('SELECT s.id FROM academic_work_plan."RundSoporteCampo" s'))![0];
    expect(lookup).toContain("d.estado = 'ACTIVO'");
    expect(lookup).toContain('d.id IS NULL');
  });

  it(`rechaza una evidencia adicional al llegar al máximo de ${RUND_MAX_EVIDENCES_PER_TYPE}`, async () => {
    const { service, storage } = documentService(RUND_MAX_EVIDENCES_PER_TYPE);
    await expect(service.create(docente.id, input, pdf, 'cargador')).rejects.toBeInstanceOf(ConflictException);
    expect(storage.store).not.toHaveBeenCalled();
  });

  it('retirar una de varias evidencias deja el espacio en revisión, no como soporte faltante', async () => {
    const current = { id: 'doc-2', docente_id: docente.id, bloque: 'TRANSVERSAL', tipo_soporte: 'autorizacion_habeas_data', rund_soporte_id: 'soporte-2',
      categoria_codigo: 'AUTORIZACIONES', version: 1, nombre_archivo: 'segundo.pdf', estado: 'ACTIVO' };
    const states: string[] = [];
    const { service, runner } = documentService(1, (sql, params) => {
      if (sql.startsWith('SELECT id FROM') && sql.includes('WHERE id = $1')) return [{ id: params?.[0] }];
      if (sql.includes('SELECT tipo_soporte, documento_carpeta_id')) return [{ tipo_soporte: 'autorizacion_habeas_data', documento_carpeta_id: '/file/1' }];
      if (sql.includes('UPDATE academic_work_plan."RundCampoEstado" SET estado = $1')) states.push(params?.[0]);
      return [];
    });
    (service as any).dataSource.query = jest.fn(async (sql: string) => sql.includes('FROM academic_work_plan."Docente" d') ? [docente] : [current]);
    await service.remove(docente.id, current.id, 'cargador');
    expect(states).toEqual(['En revisión']);
    const audit = runner.query.mock.calls.find(([statement, params]) => statement.includes("'RUND_DOCUMENTAL'") && params?.includes('ELIMINAR_DOCUMENTO'));
    expect(JSON.parse(audit![1][7])).toMatchObject({ tipoSoporte: 'autorizacion_habeas_data', evidenciasVigentes: 1 });
  });
});

describe('Varias evidencias por punto de control: carga desde el punto', () => {
  const request = { user: { userId: 'CARGADOR', roles: ['SUPER_ADMIN'] }, rundPermissions: new Set(['banco-docentes.rund.manage']) };
  const body = { tipoSoporte: 'autorizacion_habeas_data' };
  const setup = () => {
    const documentos = {
      list: jest.fn().mockResolvedValue([{ id: 'doc-1', tipoSoporte: 'autorizacion_habeas_data', estado: 'ACTIVO' }, { id: 'doc-2', tipoSoporte: 'autorizacion_habeas_data', estado: 'ACTIVO' }]),
      create: jest.fn().mockResolvedValue({ id: 'nuevo' }),
      replace: jest.fn().mockResolvedValue({ id: 'reemplazo' }),
      protectMetadata: jest.fn((document: any) => document),
    };
    const validator = { validate: jest.fn().mockResolvedValue({ validated: false }) };
    return { documentos, controller: new BancoDocentesController({} as any, validator as any, documentos as any) };
  };

  it('modo agregar crea otra evidencia sin reemplazar las vigentes', async () => {
    const { documentos, controller } = setup();
    await controller.vincularSoporte('docente', 'TRANSVERSAL', { ...body, modo: 'agregar' }, request, pdf);
    expect(documentos.create).toHaveBeenCalledWith('docente', expect.objectContaining({ tipoSoporte: 'autorizacion_habeas_data', bloque: 'TRANSVERSAL' }), pdf, 'CARGADOR', undefined);
    expect(documentos.replace).not.toHaveBeenCalled();
  });

  it('reemplaza exactamente la evidencia indicada y conserva el comportamiento anterior sin modo', async () => {
    const { documentos, controller } = setup();
    await controller.vincularSoporte('docente', 'TRANSVERSAL', { ...body, documentoId: 'doc-2' }, request, pdf);
    expect(documentos.replace).toHaveBeenLastCalledWith('docente', 'doc-2', pdf, 'CARGADOR', undefined, undefined, undefined);
    await controller.vincularSoporte('docente', 'TRANSVERSAL', body, request, pdf);
    expect(documentos.replace).toHaveBeenLastCalledWith('docente', 'doc-1', pdf, 'CARGADOR', undefined, undefined, undefined);
    expect(documentos.create).not.toHaveBeenCalled();
  });

  it('no reemplaza otra evidencia si la seleccionada ya no está vigente', async () => {
    const { documentos, controller } = setup();
    await expect(controller.vincularSoporte('docente', 'TRANSVERSAL', { ...body, documentoId: 'retirada' }, request, pdf)).rejects.toBeInstanceOf(ConflictException);
    expect(documentos.replace).not.toHaveBeenCalled();
    expect(documentos.create).not.toHaveBeenCalled();
  });
});

describe('Varias evidencias por punto de control: OCR por selección y orden', () => {
  const previous = process.env.RUND_OCR_ENABLED;
  beforeEach(() => { process.env.RUND_OCR_ENABLED = 'true'; });
  afterEach(() => { if (previous === undefined) delete process.env.RUND_OCR_ENABLED; else process.env.RUND_OCR_ENABLED = previous; });
  const actor = { actorId: 'GGP', roles: ['GESTION_PROFESORAL'], fullAccess: true, ip: '10.0.0.9' };
  const ids = ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'];
  const service = (query: jest.Mock) => new RundExtraccionService({ query, transaction: jest.fn(async (work: any) => work({ query })) } as any, {} as any);

  it('reprocesa en el orden elegido y conserva las decisiones documentales y los datos confirmados', async () => {
    const query=jest.fn(async(sql:string)=>{
      if(sql.includes('RundDocumentoPerfil')&&sql.includes('FOR UPDATE'))return ids.map(id=>({id,estado:'ACTIVO',tipo_soporte:'documento_identidad',nombre_archivo:`${id}.pdf`}));
      if(sql.includes('SELECT id, estado, documento_id'))return [{id:'old-job',estado:'COMPLETADO'}];
      if(sql.includes('SELECT * FROM sustituidas'))return [{id:'old-suggestion'}];
      if(sql.includes('INSERT INTO academic_work_plan."RundExtraccionTrabajo"'))return ids.map(id=>({id}));
      return sql.includes('"Docente"')?[{id:'docente'}]:[];
    });
    await expect(service(query).reprocess('docente',[ids[1],ids[0]],actor)).resolves.toEqual({queued:2,reprocessed:true});
    const archive=query.mock.calls.find(([sql])=>sql.includes('SELECT * FROM sustituidas'))!;
    expect(archive[0]).toContain("s.estado='PENDIENTE'");
    const insert=query.mock.calls.find(([sql])=>sql.includes('INSERT INTO academic_work_plan."RundExtraccionTrabajo"'))!;
    expect(insert[1][0]).toEqual([ids[1],ids[0]]);
    expect(query.mock.calls.some(([sql])=>/UPDATE (auth\.personas|academic_work_plan\."(Docente|RundCampoEstado|RundSoporteCampo)")/.test(sql))).toBe(false);
    const audit=query.mock.calls.find(([sql,params])=>sql.includes('RundAprobacionLog')&&params?.includes('REPROCESAR_EXTRACCION_OCR'))!;
    expect(JSON.parse(audit[1][5]).sugerenciasSustituidas).toEqual(['old-suggestion']);
  });
  it.each(['PENDIENTE','PROCESANDO'])('rechaza reprocesar un PDF %s sin sustituir sugerencias ni duplicar trabajos', async estado => {
    const query=jest.fn(async(sql:string)=>{
      if(sql.includes('RundDocumentoPerfil')&&sql.includes('FOR UPDATE'))return ids.map(id=>({id,estado:'ACTIVO',tipo_soporte:'documento_identidad'}));
      if(sql.includes('SELECT id, estado, documento_id'))return [{id:'active-job',estado}];
      return sql.includes('"Docente"')?[{id:'docente'}]:[];
    });
    await expect(service(query).reprocess('docente',ids,actor)).rejects.toBeInstanceOf(ConflictException);
    expect(query.mock.calls.some(([sql])=>sql.includes('WITH sustituidas')||sql.includes('INSERT INTO academic_work_plan."RundExtraccionTrabajo"'))).toBe(false);
  });
  it.each(['REEMPLAZADO','ELIMINADO','OTRO_DOCENTE'])('no reprocesa documentos %s', async estado => {
    const query=jest.fn(async(sql:string)=>sql.includes('RundDocumentoPerfil')?estado==='OTRO_DOCENTE'?[]:[{id:ids[0],estado,tipo_soporte:'documento_identidad'}]:[{id:'docente'}]);
    await expect(service(query).reprocess('docente',[ids[0]],actor)).rejects.toBeInstanceOf(ConflictException);
    expect(query.mock.calls.some(([sql])=>sql.includes('WITH sustituidas'))).toBe(false);
  });

  it('encola las evidencias seleccionadas en el orden indicado y deja trazabilidad del lote', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM academic_work_plan."RundDocumentoPerfil"') && sql.includes('ANY($1::text[])') && sql.includes('FOR UPDATE')) {
        return [{ id: ids[1], estado: 'ACTIVO', tipo_soporte: 'diploma_maestria', nombre_archivo: 'segunda.pdf' },
          { id: ids[0], estado: 'ACTIVO', tipo_soporte: 'diploma_maestria', nombre_archivo: 'primera.pdf' }];
      }
      if (sql.includes('"Docente"')) return [{ id: 'docente' }];
      return [];
    });
    await expect(service(query).enqueueBatch('docente', [ids[1], ids[0]], actor)).resolves.toEqual({ queued: 2 });
    const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO academic_work_plan."RundExtraccionTrabajo"'))!;
    expect(insert[0]).toContain('WITH ORDINALITY');
    expect(insert[1][0]).toEqual([ids[1], ids[0]]);
    const audit = query.mock.calls.find(([sql, params]) => sql.includes('RundAprobacionLog') && params?.includes('SOLICITAR_EXTRACCION_OCR'))!;
    expect(JSON.parse(audit[1][5]).orden.map((item: any) => item.nombreArchivo)).toEqual(['segunda.pdf', 'primera.pdf']);
  });

  it.each([[[]], [['no-es-uuid']], [[ids[0], ids[0]]], [Array.from({ length: 21 }, (_, i) => `${String(i).padStart(8, '0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`)]])(
    'rechaza una selección inválida sin abrir transacción: %p', async selection => {
      const query = jest.fn();
      await expect(service(query).enqueueBatch('docente', selection, actor)).rejects.toThrow(/entre 1 y 20/);
      expect(query).not.toHaveBeenCalled();
    });

  it('no encola el lote si una evidencia ya fue retirada', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FOR UPDATE') && sql.includes('ANY($1::text[])')) return [{ id: ids[0], estado: 'ELIMINADO', tipo_soporte: 'diploma_maestria' }];
      return sql.includes('"Docente"') ? [{ id: 'docente' }] : [];
    });
    await expect(service(query).enqueueBatch('docente', ids, actor)).rejects.toBeInstanceOf(ConflictException);
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO academic_work_plan."RundExtraccionTrabajo"'))).toBe(false);
  });

  it('reordena solo análisis en espera y conserva su turno inicial en la cola', async () => {
    const jobs = [{ id: ids[0], estado: 'PENDIENTE', nombre_archivo: 'a.pdf' }, { id: ids[1], estado: 'PENDIENTE', nombre_archivo: 'b.pdf' }];
    const query = jest.fn(async (sql: string) => sql.includes('FOR UPDATE OF j') ? jobs : sql.includes('"Docente"') ? [{ id: 'docente' }] : []);
    await expect(service(query).reorderQueue('docente', [ids[1], ids[0]], actor)).resolves.toEqual({ reordered: 2 });
    const update = query.mock.calls.find(([sql]) => sql.includes('UPDATE academic_work_plan."RundExtraccionTrabajo" j'))!;
    // Reuses the slots the jobs already held instead of moving them ahead of other profiles.
    expect(update[0]).toContain('row_number() OVER (ORDER BY creado_en, id)');
    expect(update[0]).not.toContain('MIN(creado_en)');
    expect(update[1]).toEqual([[ids[1], ids[0]], 'docente']);
    jobs[0].estado = 'PROCESANDO';
    await expect(service(query).reorderQueue('docente', ids, actor)).rejects.toThrow(/ya comenzó/);
  });

  it('marca como desactualizada la sugerencia de una evidencia cuando otra ya cambió el dato', async () => {
    const suggestion = (id: string, valor_previo: string) => ({ id, campo: 'maestria', valor: 'Maestría X', valor_previo, estado: 'PENDIENTE' });
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM academic_work_plan."RundExtraccionTrabajo" j JOIN')) return [
        { id: 'job-2', estado: 'PENDIENTE', creado_en: '2026-10-02T00:00:00Z', sugerencias: [] },
        { id: 'job-1', estado: 'COMPLETADO', creado_en: '2026-10-01T00:00:00Z', sugerencias: [suggestion('s-old', 'Sin título'), suggestion('s-new', 'Maestría actual')] },
      ];
      if (sql.includes('d."personaId"') || sql.includes('FROM academic_work_plan."Docente"')) return [{ maestria: 'Maestría actual' }];
      return [];
    });
    const result: any = await service(query).list('docente', actor);
    const flags = Object.fromEntries(result.jobs[1].sugerencias.map((s: any) => [s.id, s.desactualizada]));
    expect(flags).toEqual({ 's-old': true, 's-new': false });
    expect(result.jobs[0].posicion_cola).toBe(1);
  });
  it('permite reordenar una cola acumulada de varios lotes de hasta 100 trabajos', async () => {
    const jobs=Array.from({length:30},(_,i)=>({id:`${String(i).padStart(8,'0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,estado:'PENDIENTE',nombre_archivo:`${i}.pdf`}));
    const query=jest.fn(async(sql:string)=>sql.includes('FOR UPDATE OF j')?jobs:sql.includes('"Docente"')?[{id:'docente'}]:[]);
    await expect(service(query).reorderQueue('docente',jobs.map(job=>job.id).reverse(),actor)).resolves.toEqual({reordered:30});
  });
});

describe('OCR limitado a los datos que acredita cada evidencia', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { extractionFieldsForDocument, extractionFieldInScope, lockExtractionSuggestions, EXTRACTION_FIELDS } = require('./rund-extraccion-fields');
  const { EXTRACTION_FIELDS_BY_BLOCK } = require('./rund-extraccion-fields');
  const { EVIDENCE_TYPES: types } = require('./rund-evidence-workflow');

  it('cada tipo de evidencia solo propone datos de su propia pestaña', () => {
    for (const [block, blockTypes] of Object.entries(types) as [string, string[]][]) {
      for (const type of blockTypes) {
        for (const field of extractionFieldsForDocument({ tipo_soporte: type })) {
          expect(EXTRACTION_FIELDS_BY_BLOCK[block]).toContain(field);
        }
      }
    }
    expect(extractionFieldsForDocument({ tipo_soporte: 'diploma_maestria', categoria_codigo: 'TITULOS' })).toEqual(['maestria']);
    expect(extractionFieldsForDocument({ tipo_soporte: 'autorizacion_habeas_data' })).toEqual([]);
  });

  it('un anexo general "Otros" no se analiza y uno categorizado se limita a su categoría', () => {
    expect(extractionFieldsForDocument({ categoria_codigo: 'OTROS' })).toEqual([]);
    expect(extractionFieldsForDocument({ categoria_codigo: 'TITULOS' })).not.toContain('nombreCompleto');
    expect(extractionFieldInScope({ categoria_codigo: 'IDENTIDAD' }, 'nombreCompleto')).toBe(true);
    expect(extractionFieldInScope({ tipo_soporte: 'diploma_maestria' }, 'nombreCompleto')).toBe(false);
    expect(Object.keys(EXTRACTION_FIELDS).length).toBeGreaterThan(0);
  });

  it('no aplica una sugerencia que el documento de origen no acredita', async () => {
    const row = { id: 's-1', campo: 'nombreCompleto', valor_previo: 'DOCENTE', estado: 'PENDIENTE', documento_estado: 'ACTIVO', trabajo_estado: 'COMPLETADO',
      tipo_soporte: null, categoria_codigo: 'OTROS' };
    const db = { query: jest.fn(async (sql: string) => sql.includes('RundExtraccionSugerencia') ? [row]
      : sql.includes('d."personaId"::text = p.id_person') || sql.includes('JOIN auth.personas p ON p.id_person::text') ? [{ nom_largo: 'DOCENTE' }] : []) };
    await expect(lockExtractionSuggestions(db, 'docente', ['s-1'], { nombreCompleto: 'OTRA PERSONA' })).rejects.toThrow('no acredita');
  });

  it('marca como fuera de alcance las sugerencias antiguas de un anexo sin datos acreditables', async () => {
    process.env.RUND_OCR_ENABLED = 'true';
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM academic_work_plan."RundExtraccionTrabajo" j JOIN')) return [
        { id: 'j-1', estado: 'COMPLETADO', categoria_codigo: 'OTROS', tipo_soporte: null, sugerencias: [{ id: 's-1', campo: 'nombreCompleto', valor_previo: 'A', estado: 'PENDIENTE' }] },
        { id: 'j-2', estado: 'COMPLETADO', categoria_codigo: 'IDENTIDAD', tipo_soporte: 'documento_identidad', sugerencias: [{ id: 's-2', campo: 'nombreCompleto', valor_previo: 'A', estado: 'PENDIENTE' }] },
      ];
      if (sql.includes('FROM academic_work_plan."Docente" d JOIN auth.personas')) return [{ nom_largo: 'A' }];
      return [];
    });
    const result: any = await new RundExtraccionService({ query } as any, {} as any).list('docente', { actorId: 'GGP', roles: [], fullAccess: true });
    expect(result.jobs.map((job: any) => job.sugerencias[0].fuera_de_alcance)).toEqual([true, false]);
    delete process.env.RUND_OCR_ENABLED;
  });
});

describe('Correcciones de la revisión: identidad, soportes históricos y filas vacías', () => {
  const request = { user: { userId: 'CARGADOR', roles: ['SUPER_ADMIN'] }, rundPermissions: new Set(['banco-docentes.rund.manage']) };

  it('reemplaza una evidencia de pasaporte desde el punto de identidad', async () => {
    const documentos = {
      list: jest.fn().mockResolvedValue([{ id: 'cc', tipoSoporte: 'documento_identidad', estado: 'ACTIVO' }, { id: 'pa', tipoSoporte: 'pasaporte', estado: 'ACTIVO' }]),
      create: jest.fn(), replace: jest.fn().mockResolvedValue({ id: 'nuevo' }), protectMetadata: jest.fn((d: any) => d),
    };
    const controller = new BancoDocentesController({} as any, { validate: jest.fn().mockResolvedValue({}) } as any, documentos as any);
    await controller.vincularSoporte('docente', 'IDENTIDAD', { tipoSoporte: 'documento_identidad', documentoId: 'pa' }, request, pdf);
    expect(documentos.replace).toHaveBeenCalledWith('docente', 'pa', pdf, 'CARGADOR', undefined, undefined, undefined);
  });

  it('envía el modo de carga al servicio sin cambiar a los llamadores anteriores', async () => {
    const documentos = { list: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue({ id: 'x' }), replace: jest.fn(), protectMetadata: jest.fn((d: any) => d) };
    const controller = new BancoDocentesController({} as any, { validate: jest.fn().mockResolvedValue({}) } as any, documentos as any);
    const body = { tipoSoporte: 'autorizacion_habeas_data' };
    await controller.vincularSoporte('docente', 'TRANSVERSAL', body, request, pdf);
    expect(documentos.create.mock.calls[0][1]).toMatchObject({ nuevaEvidencia: false, soporteHistoricoId: undefined });
    await controller.vincularSoporte('docente', 'TRANSVERSAL', { ...body, modo: 'agregar' }, request, pdf);
    expect(documentos.create.mock.calls[1][1]).toMatchObject({ nuevaEvidencia: true });
    await controller.vincularSoporte('docente', 'TRANSVERSAL', { ...body, soporteHistoricoId: 'legacy-1' }, request, pdf);
    expect(documentos.create.mock.calls[2][1]).toMatchObject({ nuevaEvidencia: false, soporteHistoricoId: 'legacy-1' });
  });

  const lookup = async (data: any, rows: any[] = []) => {
    const { service, runner } = documentService(0, sql => sql.includes('SELECT s.id FROM academic_work_plan."RundSoporteCampo" s') ? rows : []);
    const result = service.create(docente.id, { categoria: 'AUTORIZACIONES', bloque: 'TRANSVERSAL', tipoSoporte: 'autorizacion_habeas_data', ...data }, pdf, 'cargador');
    return { result, runner };
  };
  const sqlOf = (runner: any, text: string) => runner.query.mock.calls.find(([sql]: any[]) => sql.includes(text));

  it('un llamador anterior sigue sobrescribiendo un soporte sin versión vigente, como antes', async () => {
    const { result, runner } = await lookup({}, [{ id: 'legacy-row' }]);
    await result;
    const select = sqlOf(runner, 'SELECT s.id FROM academic_work_plan."RundSoporteCampo" s')[0];
    expect(select).not.toContain("COALESCE(TRIM(s.documento_carpeta_id), '') = ''");
    expect(sqlOf(runner, 'UPDATE academic_work_plan."RundSoporteCampo"')[1]).toEqual(expect.arrayContaining(['legacy-row', false]));
  });

  it('agregar otra evidencia solo reutiliza filas vacías y les asigna la fecha de la nueva carga', async () => {
    const { result, runner } = await lookup({ nuevaEvidencia: true }, [{ id: 'empty-row' }]);
    await result;
    expect(sqlOf(runner, 'SELECT s.id FROM academic_work_plan."RundSoporteCampo" s')[0]).toContain("COALESCE(TRIM(s.documento_carpeta_id), '') = ''");
    expect(sqlOf(runner, 'UPDATE academic_work_plan."RundSoporteCampo"')[1]).toEqual(expect.arrayContaining(['empty-row', true]));
  });

  it('reemplazar un soporte histórico exige que siga sin versión vigente', async () => {
    const ok = await lookup({ soporteHistoricoId: 'legacy-1' }, [{ id: 'legacy-1' }]);
    await ok.result;
    expect(sqlOf(ok.runner, 'WHERE s.id::text = $1')[1]).toEqual(['legacy-1', docente.id, ['autorizacion_habeas_data']]);
    const stale = await lookup({ soporteHistoricoId: 'legacy-1' }, []);
    await expect(stale.result).rejects.toThrow('histórica ya cambió');
    expect(stale.runner.rollbackTransaction).toHaveBeenCalled();
  });

  it('una fila sin archivo no cubre una devolución abierta', () => {
    const empty = { id: 'vacia', tipo_soporte: 'diploma_pregrado', estado: 'Pendiente', documento_carpeta_id: null, revisiones_campos: {} };
    expect(hasOpenEvidenceReturn([decided('diploma_pregrado', 'Rechazado'), empty])).toBe(true);
  });
});

describe('Motivo de devolución a nivel de bloque', () => {
  it('una devolución sin otra evidencia que respalde el dato deja el bloque devuelto con su motivo', async () => {
    const only = decided('autorizacion_habeas_data', 'Pendiente', 'v1', { id: 'unica', createdAt: '2026-10-01T10:00:00Z', revisiones_campos: {} });
    const updates: any[] = [];
    const query = jest.fn(async (sql: string, params: any[] = []) => {
      if (sql.includes('SELECT * FROM academic_work_plan."Docente"')) return [{ id: 'docente' }];
      if (sql.includes('FROM academic_work_plan."RundSoporteCampo" WHERE id = $1')) return [only];
      if (sql.includes('SELECT id, estado FROM academic_work_plan."RundDocumentoPerfil"')) return [{ id: 'v1', estado: 'ACTIVO' }];
      if (sql.includes('SELECT version FROM')) return [{ version: 2 }];
      if (sql.startsWith('UPDATE academic_work_plan."RundSoporteCampo"')) { only.estado = params[0]; only.revisiones_campos = JSON.parse(params[3]); return []; }
      if (sql.includes('UPDATE academic_work_plan."RundCampoEstado" SET estado')) { updates.push({ sql, params }); return []; }
      if (sql.includes('FROM academic_work_plan."RundSoporteCampo" WHERE docente_id::text = $1 AND bloque = $2')) return [only];
      return [];
    });
    const runner = { query, connect: jest.fn(), release: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(), rollbackTransaction: jest.fn() };
    await new RundEvidenceWorkflow({ createQueryRunner: () => runner } as any).reviewSupport('docente', 'TRANSVERSAL', 'unica',
      { estado: 'Rechazado', observacion: 'Falta la firma.', documentoVersionId: 'v1', blockVersion: 2 }, 'revisor');
    const returned = updates.find(update => update.sql.includes("'Devuelto'"));
    expect(returned.params).toEqual(['docente', 'TRANSVERSAL', 'Falta la firma.']);
  });
});

describe('Revisión conjunta por documento', () => {
  it.each([
    ['IDENTIDAD','documento_identidad'], ['FORMACION','diploma_pregrado'],
    ['VINCULACION','contrato'], ['VINCULACION','acto_administrativo_dedicacion'],
    ['ACADEMICO','acto_asignacion_nucleo'], ['TRANSVERSAL','autorizacion_habeas_data'],
  ])('revisa los datos que acredita el soporte de %s / %s sin aprobar el bloque', async (block, type) => {
    const support=decided(type,'Pendiente','v1',{id:'support'});
    const query=jest.fn(async(sql:string,params:any[]=[])=>{
      if(sql.includes('SELECT * FROM academic_work_plan."Docente"'))return [{id:'docente'}];
      if(sql.includes('FROM academic_work_plan."RundSoporteCampo" WHERE id = $1'))return [support];
      if(sql.includes('SELECT id, estado FROM academic_work_plan."RundDocumentoPerfil"'))return [{id:'v1',estado:'ACTIVO'}];
      if(sql.includes('SELECT version FROM'))return [{version:4}];
      if(sql.startsWith('UPDATE academic_work_plan."RundSoporteCampo"')){support.estado=params[0];support.revisiones_campos=JSON.parse(params[3]);return [];}
      if(sql.includes('FROM academic_work_plan."RundSoporteCampo" WHERE docente_id::text'))return [support];
      return [];
    });
    const runner={query,connect:jest.fn(),release:jest.fn(),startTransaction:jest.fn(),commitTransaction:jest.fn(),rollbackTransaction:jest.fn()};
    await new RundEvidenceWorkflow({createQueryRunner:()=>runner} as any).reviewSupport('docente',block,'support',
      {estado:'Aprobado',alcance:'documento',documentoVersionId:'v1',blockVersion:4},'revisor');
    expect(Object.keys(support.revisiones_campos)).toEqual(evidenceFields(type));
    expect(Object.values(support.revisiones_campos).every((decision:any)=>decision.estado==='Aprobado'&&decision.documentoVersionId==='v1')).toBe(true);
    expect(query.mock.calls.filter(([sql])=>sql.includes('UPDATE academic_work_plan."RundCampoEstado"'))).toHaveLength(1);
    expect(query.mock.calls.some(([,params])=>params?.includes('APROBAR'))).toBe(false);
    expect(query.mock.calls.some(([,params])=>params?.includes('APROBAR_SOPORTE'))).toBe(true);
    expect(runner.commitTransaction).toHaveBeenCalled();
  });
});
