import { dataApprovalProblem, dataReviewContext, RUND_DATA_FIELDS } from './rund-data-review';
import { RundEvidenceWorkflow } from './rund-evidence-workflow';

const profile={id:'teacher',personaId:'person',tip_identificacion:'CC',num_identificacion:'12345678',nom_largo:'DOCENTE DE PRUEBA',gen_tercero:'F',sexoBiologico:'Mujer',fec_nacimiento:'1980-01-01',pregrado:'Derecho',maestria:'Gestión pública'};
const support=(type='documento_identidad',id='identity')=>({id,tipo_soporte:type,documento_carpeta_id:'/test/'+id,estado:'Aprobado'});
const reviewed=(block:string,context:any,ids=Object.keys(context))=>ids.map(campo=>({bloque:block,actor_id:'reviewer',metadata:{campo,estado:'Aprobado',huella:context[campo].huella}}));

describe('Validación independiente de datos y soportes',()=>{
  it.each([null,''])('el tipo CC sin número de identificación (%s) no es un dato válido para aprobar',number=>{
    const incomplete={...profile,num_identificacion:number};
    const context=dataReviewContext('IDENTIDAD',incomplete,[],[]);
    expect(context.DOCUMENTO_IDENTIDAD.puedeValidar).toBe(false);
    const accepted=dataReviewContext('IDENTIDAD',incomplete,[],reviewed('IDENTIDAD',context));
    expect(dataApprovalProblem(accepted)).toMatch(/Valide individualmente/);
  });
  it('una cédula admitida permite revisar cinco datos, pero no valida ninguno automáticamente',()=>{
    const context=dataReviewContext('IDENTIDAD',profile,[support()],[]);
    expect(Object.values(context)).toHaveLength(5);
    expect(Object.values(context).every(value=>value.puedeValidar&&value.estado==='Pendiente')).toBe(true);
    expect(dataApprovalProblem(context)).toMatch(/individualmente/);
    const one=dataReviewContext('IDENTIDAD',profile,[support()],reviewed('IDENTIDAD',context,['NOMBRE_COMPLETO']));
    expect(one.NOMBRE_COMPLETO.estado).toBe('Aprobado');
    expect(one.DOCUMENTO_IDENTIDAD.estado).toBe('Pendiente');
  });
  it('el revisor puede validar sin archivos y un soporte de maestría solo se asocia con su propio dato',()=>{
    const context=dataReviewContext('FORMACION',profile,[support('diploma_maestria','master')],[]);
    expect(context.diploma_maestria.puedeValidar).toBe(true);
    expect(context.diploma_pregrado.puedeValidar).toBe(true);
    expect(context.diploma_pregrado.soportes).toEqual([]);
    expect(context.diploma_maestria.soportes).toHaveLength(1);
    expect(context.hoja_vida_pro.puedeValidar).toBe(false);
    const academic=dataReviewContext('ACADEMICO',{nucleoTematico:'Gestión'},[support('diploma_maestria')],[]).acto_asignacion_nucleo;
    expect(academic.puedeValidar).toBe(true);expect(academic.soportes).toEqual([]);
  });
  it.each(Object.keys(RUND_DATA_FIELDS))('exige decisiones de los datos presentes en %s y permite aprobar tras revisarlos',block=>{
    const fullProfile:any={...profile};
    for(const def of RUND_DATA_FIELDS[block])for(const key of def.keys)fullProfile[key]||='Dato registrado';
    const supports:any[]=[];
    const initial=dataReviewContext(block,fullProfile,supports,[]);
    expect(dataApprovalProblem(initial)).toBeTruthy();
    const accepted=dataReviewContext(block,fullProfile,supports,reviewed(block,initial));
    expect(dataApprovalProblem(accepted)).toBeNull();
  });
  it('cambiar el dato o reemplazar el documento exige una nueva revisión',()=>{
    const current={...support(),documento_perfil_id:'v1',estado_documento:'ACTIVO'};
    const context=dataReviewContext('IDENTIDAD',profile,[current],[]);
    const reviews=reviewed('IDENTIDAD',context);
    expect(dataReviewContext('IDENTIDAD',{...profile,nom_largo:'NOMBRE CORREGIDO'},[current],reviews).NOMBRE_COMPLETO.estado).toBe('Pendiente');
    expect(dataReviewContext('IDENTIDAD',profile,[{...current,documento_perfil_id:'v2'}],reviews).NOMBRE_COMPLETO.estado).toBe('Pendiente');
    const removed=dataReviewContext('IDENTIDAD',profile,[{...current,estado_documento:'ELIMINADO'}],reviews).NOMBRE_COMPLETO;
    expect(removed.puedeValidar).toBe(true);expect(removed.estado).toBe('Pendiente');
  });
  it('un dato devuelto impide aprobar aunque sea opcional y todos los soportes estén admitidos',()=>{
    const initial=dataReviewContext('CONTACTO',{correoInstitucional:'docente@esap.edu.co'},[],[]);
    const reviews=reviewed('CONTACTO',initial);reviews[0].metadata.estado='Rechazado';
    expect(dataApprovalProblem(dataReviewContext('CONTACTO',{correoInstitucional:'docente@esap.edu.co'},[],reviews))).toMatch(/devueltos/);
  });
});

describe('Transacción de revisión de datos',()=>{
  const setup=(options:any={})=>{
    const supports=options.supports??[support()];
    const reviews:any[]=options.reviews??[];
    const query=jest.fn(async(sql:string,args:any[]=[])=>{
      if(sql.includes('SELECT * FROM academic_work_plan."Docente"'))return [profile];
      if(sql.includes('SELECT d.*'))return [profile];
      if(sql.includes('SELECT * FROM academic_work_plan."RundCampoEstado"'))return [{bloque:'IDENTIDAD',version:3,estado:'En revisión'}];
      if(sql.includes('SELECT * FROM academic_work_plan."RundSoporteCampo"'))return supports;
      if(sql.includes('SELECT DISTINCT ON'))return reviews;
      if(sql.includes('INSERT INTO academic_work_plan."RundAprobacionLog"')){
        if(options.auditFailure)throw new Error('AUDIT_FAILURE');
        const metadata=JSON.parse(args[8]);reviews.push({bloque:args[2],actor_id:args[4],observacion:args[6],metadata});
      }
      return [];
    });
    const runner={query,connect:jest.fn(),startTransaction:jest.fn(),commitTransaction:jest.fn(),rollbackTransaction:jest.fn(),release:jest.fn()};
    const flow=new RundEvidenceWorkflow({createQueryRunner:()=>runner} as any);
    const context=dataReviewContext('IDENTIDAD',profile,supports,[]);
    return {flow,runner,query,context};
  };
  it('aprobar un dato registra el actor y no cambia la revisión de los archivos',async()=>{
    const {flow,runner,query,context}=setup();
    await flow.reviewData('teacher','IDENTIDAD','NOMBRE_COMPLETO',{estado:'Aprobado',huella:context.NOMBRE_COMPLETO.huella,blockVersion:3},'reviewer');
    expect(runner.commitTransaction).toHaveBeenCalled();
    expect(query.mock.calls.some(([sql])=>sql.includes('UPDATE academic_work_plan."RundSoporteCampo"'))).toBe(false);
    const audit=query.mock.calls.find(([sql,args])=>sql.includes('RundAprobacionLog')&&args.includes('APROBAR_DATO'))!;
    expect(audit[1][4]).toBe('reviewer');
    expect(JSON.parse(audit[1][8]).campo).toBe('NOMBRE_COMPLETO');
  });
  it.each(['sin archivos','Pendiente','Rechazado','vencido'])('permite validar los datos y aprobar el bloque con soporte %s',async scenario=>{
    const supports=scenario==='sin archivos'?[]:[{...support(),estado:scenario==='vencido'?'Aprobado':scenario,...(scenario==='vencido'?{fecha_vencimiento:'2000-01-01'}:{})}];
    const initial=dataReviewContext('IDENTIDAD',profile,supports,[]);
    const {flow,runner,query}=setup({supports,reviews:reviewed('IDENTIDAD',initial)});
    await flow.reviewData('teacher','IDENTIDAD','NOMBRE_COMPLETO',{estado:'Aprobado',huella:initial.NOMBRE_COMPLETO.huella,blockVersion:3},'reviewer');
    await expect(flow.reviewBlock('teacher','IDENTIDAD','reviewer',undefined,undefined,3)).resolves.toMatchObject({estado:'Aprobado'});
    const audit=query.mock.calls.find(([sql,args])=>sql.includes('RundAprobacionLog')&&args.includes('APROBAR_DATO'))!;
    expect(JSON.parse(audit[1][8])).toMatchObject({criterioRevision:'DECISION_REVISOR',sinSoporteAdmitido:true,soportes:[]});
    expect(query.mock.calls.some(([sql])=>sql.includes('UPDATE academic_work_plan."RundSoporteCampo"'))).toBe(false);
    expect(runner.commitTransaction).toHaveBeenCalled();
  });
  it('permite devolver un dato incorrecto aun sin soporte, exigiendo un motivo',async()=>{
    const {flow,context,runner}=setup({supports:[]});
    await expect(flow.reviewData('teacher','IDENTIDAD','NOMBRE_COMPLETO',{estado:'Rechazado',huella:context.NOMBRE_COMPLETO.huella,blockVersion:3},'reviewer')).rejects.toThrow(/corrección/);
    await flow.reviewData('teacher','IDENTIDAD','NOMBRE_COMPLETO',{estado:'Rechazado',observacion:'El apellido está incorrecto.',huella:context.NOMBRE_COMPLETO.huella,blockVersion:3},'reviewer');
    expect(runner.commitTransaction).toHaveBeenCalled();
  });
  it.each([{huella:'obsoleta',blockVersion:3},{huella:'',blockVersion:2}])('rechaza una revisión obsoleta: %p',async invalid=>{
    const {flow,runner}=setup();
    await expect(flow.reviewData('teacher','IDENTIDAD','NOMBRE_COMPLETO',{estado:'Aprobado',...invalid},'reviewer')).rejects.toThrow(/cambi/);
    expect(runner.rollbackTransaction).toHaveBeenCalled();
  });
  it('revierte la revisión si falla la auditoría',async()=>{
    const {flow,runner,context}=setup({auditFailure:true});
    await expect(flow.reviewData('teacher','IDENTIDAD','NOMBRE_COMPLETO',{estado:'Aprobado',huella:context.NOMBRE_COMPLETO.huella,blockVersion:3},'reviewer')).rejects.toThrow('AUDIT_FAILURE');
    expect(runner.rollbackTransaction).toHaveBeenCalled();expect(runner.commitTransaction).not.toHaveBeenCalled();
  });
});
