export const MANUAL_CAPTURE_LABELS = {
  orderIndex:'Orden del listado', documentNumber:'Documento de identidad', documentType:'Tipo de documento', fullName:'Nombre completo',
  primer_nombre:'Primer nombre', segundo_nombre:'Segundo nombre', primer_apellido:'Primer apellido', segundo_apellido:'Segundo apellido',
  territorialNombre:'Territorial', vinculacionLabel:'Vinculación reportada', tipoVinculacion:'Tipo de vinculación', regimenNormativo:'Régimen normativo',
  dedicacionLabel:'Dedicación reportada', dedicacion:'Dedicación', escalafon:'Categoría / escalafón', nucleoTematico:'Núcleo temático',
  nivelFormacion:'Nivel de formación', perfilAcademicoPro:'Perfil académico PRO', perfilAcademico:'Perfil académico', pregrado:'Pregrado',
  especializacion:'Especialización', maestria:'Maestría', doctorado:'Doctorado', posDoctorado:'Posdoctorado', investigacion:'Investigación',
  origenVinculacion:'Origen de vinculación', actoAdministrativoVinculacion:'Acto administrativo', correoInstitucional:'Correo institucional',
  correoAlternativo:'Correo personal', telefono:'Teléfono', ultimaEvaluacion:'Última evaluación', situacionAdministrativa:'Situación administrativa',
  fechaInicioVinculacion:'Inicio de vinculación', fechaFinVinculacion:'Fin de vinculación', puntajeSalarial:'Puntaje salarial', genero:'Género',
  sexoBiologico:'Sexo biológico', fechaNacimiento:'Fecha de nacimiento', edadReferencia:'Edad de referencia', rangoEdad:'Rango de edad',
  horasAsignables:'Horas programables PTA', dedicacionHorasSemana:'Horas semanales', situacionCategoria:'Situación / categoría', estado:'Estado',
  periodoCarga:'Período académico', observaciones:'Observaciones', idRund:'ID RUND solicitado',
} as const;
export type ManualCaptureField=keyof typeof MANUAL_CAPTURE_LABELS;
export interface ManualCaptureReview {
  version:1; solicitudId:string; intencionId:string;
  campos:Record<ManualCaptureField,string|number|null>;
  proteccionDatos:{accesoCompleto:boolean;camposEnmascarados:ManualCaptureField[]};
}

/** Valida el contrato público antes de mostrarlo; rechaza estructuras/campos privados inesperados. */
export function validateManualCapture(raw:unknown,id:string):ManualCaptureReview {
  const data=raw as ManualCaptureReview;
  const record=(v:unknown):v is Record<string,unknown>=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v);
  const exact=(v:unknown,keys:string[])=>record(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(v,k));
  const fail=()=>{throw new Error('No fue posible revisar la captura de la solicitud RUND.');};
  const fields=Object.keys(MANUAL_CAPTURE_LABELS);
  if(!exact(data,['version','solicitudId','intencionId','campos','proteccionDatos'])||data.version!==1||data.solicitudId!==id
    ||typeof data.intencionId!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(data.intencionId)
    ||!exact(data.campos,fields)||!exact(data.proteccionDatos,['accesoCompleto','camposEnmascarados']))fail();
  for(const value of Object.values(data.campos))if(!(value===null||typeof value==='number'&&Number.isFinite(value)
    ||typeof value==='string'&&!value.includes('\0')&&value.length<=512*1024))fail();
  const {accesoCompleto,camposEnmascarados}=data.proteccionDatos;
  if(typeof accesoCompleto!=='boolean'||!Array.isArray(camposEnmascarados)
    ||JSON.stringify(camposEnmascarados)!==JSON.stringify(accesoCompleto?[]:['documentNumber','puntajeSalarial']))fail();
  if(!accesoCompleto&&(data.campos.puntajeSalarial!==null
    ||data.campos.documentNumber!==null&&(typeof data.campos.documentNumber!=='string'||!/^\*+(?:[^*]{4})?$/.test(data.campos.documentNumber))))fail();
  return data;
}
