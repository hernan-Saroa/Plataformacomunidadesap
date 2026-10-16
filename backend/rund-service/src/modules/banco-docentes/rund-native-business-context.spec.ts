import { nativeBusinessContext, nativeBusinessFingerprint, restoreNativeBusinessContext } from './rund-native-business-context';

describe('Contexto durable de escritura nativa',()=>{
  const command={version:1 as const,actorId:'ACTOR',payload:{documentNumber:'FICTICIO',documentType:'CC',primer_nombre:'ANA',primer_apellido:'PRUEBA',
    segundo_apellido:null,genero:'F',fechaNacimiento:'2000-01-01'},options:{relaxValidation:false,preserveTerritorial:true},territorial:null,
    emailFinal:'ficticio@example.test',phoneFinal:null,finalFullName:'ANA PRUEBA'};
  const input=()=>({payload:{documentNumber:'FICTICIO',periodoCarga:'2095-2',fechaInicioVinculacion:new Date('2095-07-01T00:00:00Z')},
    rawPayload:{DOCUMENTO_IDENTIDAD:'FICTICIO',FECHA_NACIMIENTO:new Date('2000-01-01T00:00:00Z'),canal_origen:'MODAL',cargadoPor:'ACTOR',tokenAcceso:'NO GUARDAR'},
    options:{preserveTerritorial:true,audit:{actorId:'ACTOR',canalOrigen:'MODAL'}},emailFinal:command.emailFinal,phoneFinal:null,finalFullName:command.finalFullName});
  it('congela datos originales conocidos, sin credenciales o referencias mutables, y restaura fechas de TypeORM',()=>{
    const original=input(),context=nativeBusinessContext(command,original),hash=nativeBusinessFingerprint(context);
    expect(JSON.stringify(context)).not.toContain('NO GUARDAR');expect(context.escritura.rawPayload.FECHA_NACIMIENTO).toBe('2000-01-01');
    original.payload.periodoCarga='OTRO';expect(context.escritura.payload.periodoCarga).toBe('2095-2');
    const restored=restoreNativeBusinessContext(JSON.parse(JSON.stringify(context)));
    expect(restored.escritura.payload.fechaInicioVinculacion).toEqual(new Date('2095-07-01T00:00:00Z'));
    expect(nativeBusinessFingerprint(restored)).toBe(hash);
  });
  it('la huella ignora orden JSON, pero incluye periodo, soporte y auditoria',()=>{
    const first=nativeBusinessContext(command,input());
    const reordered=JSON.parse(JSON.stringify(first));reordered.escritura.payload=Object.fromEntries(Object.entries(reordered.escritura.payload).reverse());
    expect(nativeBusinessFingerprint(reordered)).toBe(nativeBusinessFingerprint(first));
    for(const change of [(x:any)=>{x.escritura.payload.periodoCarga='2095-1';},(x:any)=>{x.escritura.options.audit.soporteId='SOPORTE';},
      (x:any)=>{x.escritura.options.audit.metadata={observacion:'CAMBIO'};}]){
      const copy=JSON.parse(JSON.stringify(first));change(copy);expect(nativeBusinessFingerprint(copy)).not.toBe(nativeBusinessFingerprint(first));
    }
  });
  it.each(['actor','periodo','documento','correo','opciones','territorial','canal','soporte'])('rechaza contexto incompatible %s',kind=>{
    const value:any=input();
    if(kind==='actor')value.options.audit.actorId='OTRO';if(kind==='periodo')value.payload.periodoCarga='';if(kind==='documento')value.payload.documentNumber='OTRO';
    if(kind==='correo')value.emailFinal='otro@example.test';if(kind==='opciones')value.options.outerManager={};if(kind==='territorial')value.territorial={id:'1',nombre:'NO COINCIDE'};
    if(kind==='canal')value.rawPayload.canal_origen='MASIVO';if(kind==='soporte')value.options.audit.requiredSupport={id:'x',type:'otro',docenteId:'y'};
    expect(()=>nativeBusinessContext(command,value)).toThrow();
  });
  it.each(['ciclo','binario','funcion','credencial','infinito'])('no persiste valores no JSON o sensibles %s',kind=>{
    const value:any=input();value.options.audit.metadata={};
    if(kind==='ciclo')value.options.audit.metadata.circular=value.options.audit.metadata;
    if(kind==='binario')value.options.audit.metadata.archivo=Buffer.from('FICTICIO');
    if(kind==='funcion')value.options.audit.metadata.fn=()=>true;
    if(kind==='credencial')value.options.audit.metadata.password_hash='NO GUARDAR';
    if(kind==='infinito')value.options.audit.metadata.numero=Infinity;
    expect(()=>nativeBusinessContext(command,value)).toThrow();
  });
});
