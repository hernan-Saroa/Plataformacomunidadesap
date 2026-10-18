import type { BancoDocenteEntity } from '../../entities/banco-docente.entity';
import type { RundNativeWriteInput } from './rund-native-profile-write';
import { capturarDatosCarga, fechaCivilPersistencia } from './rund-carga-original';

/** Calcula datos y diferencias sin manager, secuencia, auditoria o persistencia. */
export function planRundNativeProfile(input: RundNativeWriteInput, existingDocente: BancoDocenteEntity | null, nextIdRund: string | undefined) {
  const {payload,rawPayload,options,territorial,emailFinal}=input;
  const {authPersonId,profileChanges}=input.identity;
      const docenteData: Partial<BancoDocenteEntity> = {
        personaId: authPersonId,
        territorialId: options.preserveTerritorial ? existingDocente?.territorialId || '' : territorial?.id || existingDocente?.territorialId || '',
        territorialReportada: payload.territorialNombre || existingDocente?.territorialReportada || null,
        datosCargaMasiva: options.bulkImport ? capturarDatosCarga(rawPayload) : existingDocente?.datosCargaMasiva || null,
        sedeId: existingDocente?.sedeId || null,
        tipoVinculacion: payload.tipoVinculacion,
        dedicacion: payload.dedicacion,
        escalafon: payload.escalafon ?? existingDocente?.escalafon ?? null,
        horasAsignables: payload.horasAsignables,
        estado: payload.estado,
        ordenListado: payload.orderIndex ?? existingDocente?.ordenListado ?? null,
        vinculacionDisplay: payload.vinculacionLabel ?? existingDocente?.vinculacionDisplay ?? null,
        dedicacionDisplay: payload.dedicacionLabel ?? existingDocente?.dedicacionDisplay ?? null,
        dedicacionHorasSemana: payload.dedicacionHorasSemana ?? existingDocente?.dedicacionHorasSemana ?? null,
        nucleoTematico: payload.nucleoTematico ?? existingDocente?.nucleoTematico ?? null,
        nivelFormacion: payload.nivelFormacion ?? existingDocente?.nivelFormacion ?? null,
        perfilAcademicoPro: payload.perfilAcademicoPro ?? existingDocente?.perfilAcademicoPro ?? null,
        perfilAcademico: payload.perfilAcademico ?? existingDocente?.perfilAcademico ?? null,
        pregrado: payload.pregrado ?? existingDocente?.pregrado ?? null,
        especializacion: payload.especializacion ?? existingDocente?.especializacion ?? null,
        maestria: payload.maestria ?? existingDocente?.maestria ?? null,
        doctorado: payload.doctorado ?? existingDocente?.doctorado ?? null,
        posDoctorado: payload.posDoctorado ?? existingDocente?.posDoctorado ?? null,
        investigacion: payload.investigacion ?? existingDocente?.investigacion ?? null,
        origenVinculacion: payload.origenVinculacion ?? existingDocente?.origenVinculacion ?? null,
        actoAdministrativoVinculacion: payload.actoAdministrativoVinculacion ?? existingDocente?.actoAdministrativoVinculacion ?? null,
        correoInstitucional: emailFinal,
        correoAlternativo: payload.correoAlternativo ?? existingDocente?.correoAlternativo ?? null,
        sexoBiologico: payload.sexoBiologico ?? existingDocente?.sexoBiologico ?? null,
        ultimaEvaluacion: payload.ultimaEvaluacion ?? existingDocente?.ultimaEvaluacion ?? null,
        situacionAdministrativa: payload.situacionAdministrativa ?? existingDocente?.situacionAdministrativa ?? null,
        situacionCategoria: payload.situacionCategoria ?? existingDocente?.situacionCategoria ?? null,
        fechaInicioVinculacion: fechaCivilPersistencia(payload.fechaInicioVinculacion) ?? existingDocente?.fechaInicioVinculacion ?? null,
        fechaFinVinculacion: fechaCivilPersistencia(payload.fechaFinVinculacion) ?? existingDocente?.fechaFinVinculacion ?? null,
        puntajeSalarial: payload.puntajeSalarial ?? existingDocente?.puntajeSalarial ?? null,
        edadReferencia: payload.edadReferencia ?? existingDocente?.edadReferencia ?? null,
        rangoEdad: payload.rangoEdad ?? existingDocente?.rangoEdad ?? null,
        regimenNormativo: payload.regimenNormativo ?? existingDocente?.regimenNormativo ?? null,
        periodoCarga: payload.periodoCarga ?? existingDocente?.periodoCarga ?? null,
        observaciones: payload.observaciones ?? existingDocente?.observaciones ?? null,
        idRund: nextIdRund,
        // Â§6 â€” Canal de origen para auditorÃ­a
        canalOrigen: existingDocente?.canalOrigen || rawPayload?.canal_origen || 'MASIVO',
        // Â§4/Â§5.4 â€” Estado segÃºn canal: MODALâ†’Activo, AUTOGESTIONâ†’Pendiente, MASIVOâ†’Activo
        estadoAprobacion: rawPayload?.canal_origen === 'AUTOGESTION' ? 'PENDIENTE_APROBACION' : (existingDocente?.estadoAprobacion || 'PENDIENTE_APROBACION'),
      };

  let hasChanges=false;
  const changedFields: string[]=[];
  if(existingDocente) {
        const fieldsToCheck: (keyof BancoDocenteEntity)[] = ['tipoVinculacion', 'dedicacion', 'escalafon', 'horasAsignables', 'estado', 'ordenListado', 'vinculacionDisplay', 'dedicacionDisplay', 'dedicacionHorasSemana', 'nucleoTematico', 'nivelFormacion', 'perfilAcademicoPro', 'perfilAcademico', 'pregrado', 'especializacion', 'maestria', 'doctorado', 'posDoctorado', 'investigacion', 'origenVinculacion', 'actoAdministrativoVinculacion', 'correoInstitucional', 'correoAlternativo', 'sexoBiologico', 'ultimaEvaluacion', 'situacionAdministrativa', 'situacionCategoria', 'fechaInicioVinculacion', 'fechaFinVinculacion', 'puntajeSalarial', 'edadReferencia', 'rangoEdad', 'regimenNormativo', 'periodoCarga', 'observaciones', 'idRund'];
        
        fieldsToCheck.push('territorialReportada', 'datosCargaMasiva');
        for (const field of fieldsToCheck) {
          const newVal = docenteData[field];
          const oldVal = existingDocente[field];
          const changed = field === 'datosCargaMasiva' ? JSON.stringify(newVal) !== JSON.stringify(oldVal) : String(newVal) !== String(oldVal);
          if (newVal !== undefined && newVal !== null && changed) {
            hasChanges = true;
            changedFields.push(String(field));
            profileChanges[String(field)] = field === 'puntajeSalarial' || field === 'datosCargaMasiva'
              ? { anterior: '[PROTEGIDO]', nuevo: '[PROTEGIDO]' }
              : { anterior: oldVal ?? null, nuevo: newVal ?? null };
          }
        }
        
    // El escritor asignara un identificador; la observacion no consume la secuencia.
    if(!nextIdRund) {hasChanges=true;if(!changedFields.includes('idRund'))changedFields.push('idRund');}
  }
  return {docenteData,changedFields,hasChanges};
}
