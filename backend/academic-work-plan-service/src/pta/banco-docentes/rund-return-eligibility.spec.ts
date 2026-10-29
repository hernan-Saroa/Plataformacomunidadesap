import { canReturnEvidenceBlock, EVIDENCE_TYPES, RundEvidenceWorkflow, requiredEvidence, evidenceFields } from './rund-evidence-workflow';
import { dataReviewContext, RUND_DATA_FIELDS } from './rund-data-review';

const blocks = ['IDENTIDAD','FORMACION','VINCULACION','ACADEMICO','TRANSVERSAL'];
describe('Devolución con evidencia del bloque', () => {
  it.each([...blocks,'CONTACTO'])('aprueba %s con revisión humana completa sin soportes ni dependencia del OCR', async block => {
    const supports:any[]=[];
    const profile:any={id:'docente'};
    for(const def of RUND_DATA_FIELDS[block])if(def.required)for(const key of def.keys)profile[key]='Dato registrado';
    const context=dataReviewContext(block,profile,supports,[]);
    const reviews=Object.entries(context).filter(([,value])=>value.requiereRevision).map(([campo,value])=>({bloque:block,metadata:{campo,huella:value.huella,estado:'Aprobado'}}));
    const query=jest.fn(async(sql:string)=>{
      if(sql.includes('RundExtraccion'))throw new Error('La aprobación documental no debe consultar el OCR');
      if(sql.includes('SELECT * FROM academic_work_plan."Docente"'))return [{id:'docente'}];
      if(sql.includes('SELECT d.*'))return [profile];
      if(sql.includes('SELECT DISTINCT ON'))return reviews;
      if(sql.includes('SELECT * FROM academic_work_plan."RundCampoEstado"'))return [{bloque:block,version:1,estado:'En revisión'}];
      if(sql.includes('SELECT * FROM academic_work_plan."RundSoporteCampo"'))return supports;
      if(sql.includes('SELECT bloque, estado'))return blocks.map(bloque=>({bloque,estado:'Aprobado'}));
      return [];
    });
    const runner={query,connect:jest.fn(),release:jest.fn(),startTransaction:jest.fn(),commitTransaction:jest.fn(),rollbackTransaction:jest.fn()};
    await expect(new RundEvidenceWorkflow({createQueryRunner:()=>runner} as any).reviewBlock('docente',block,'revisor',undefined,undefined,1)).resolves.toMatchObject({estado:'Aprobado'});
    expect(runner.commitTransaction).toHaveBeenCalled();
  });
  it.each(blocks)('impide devolver %s sin soporte documental, sin escribir decisiones', async block => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('"Docente"')) return [{ id: 'docente' }];
      if (sql.includes('"RundCampoEstado"')) return [{ bloque: block, version: 1, estado: 'Soporte faltante' }];
      return [];
    });
    const runner = { query, connect: jest.fn(), release: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(), rollbackTransaction: jest.fn() };
    const flow = new RundEvidenceWorkflow({ createQueryRunner: () => runner } as any);
    await expect(flow.reviewBlock('docente', block, 'revisor', 'Corrija los documentos.', undefined, 1)).rejects.toThrow('Cargue al menos un soporte');
    expect(runner.rollbackTransaction).toHaveBeenCalled();
    expect(runner.commitTransaction).not.toHaveBeenCalled();
    expect(query.mock.calls.some(([sql]) => /^\s*(UPDATE|INSERT)\b/.test(sql))).toBe(false);
  });
  it.each(blocks)('exige un documento propio de %s y conserva la devolución de cargas parciales o vencidas', block => {
    const valid = { bloque: block, tipo_soporte: EVIDENCE_TYPES[block][0], documento_perfil_id: 'v1', estado_documento: 'ACTIVO', estado: 'Pendiente' };
    expect(canReturnEvidenceBlock(block, [valid])).toBe(true);
    expect(canReturnEvidenceBlock(block, [{ ...valid, fecha_vencimiento: '2000-01-01' }])).toBe(true);
    for (const changes of [{ estado_documento: 'ELIMINADO' }, { estado_documento: 'REEMPLAZADO' }, { estado_documento: 'NO_DISPONIBLE' },
      { bloque: 'CONTACTO' }, { tipo_soporte: 'soporte_edicion_perfil' }, { tipo_soporte: null },
      { documento_perfil_id: null, documento_carpeta_id: '' }]) {
      expect(canReturnEvidenceBlock(block, [{ ...valid, ...changes }])).toBe(false);
    }
    expect(canReturnEvidenceBlock(block, [{ ...valid, documento_perfil_id: null, documento_carpeta_id: '/archivo-legacy' }])).toBe(true);
  });
  it('Contacto conserva la revisión sin documentos', () => expect(canReturnEvidenceBlock('CONTACTO', [])).toBe(true));
});
