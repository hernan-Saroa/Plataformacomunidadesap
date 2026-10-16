import { BadRequestException } from '@nestjs/common';
import { BancoDocenteEntity } from '../../entities/banco-docente.entity';
import { capturarDatosCarga, fechaCivilPersistencia } from './rund-carga-original';
import { CAMPOS_SOPORTE_RUND } from './rund-document-fields';
import { invalidateEditedEvidence } from './rund-evidence-workflow';
import { recordRundAccess } from './rund-access-audit';

export interface RundNativeWriteInput {
  payload: any; rawPayload: any;
  options: { bulkImport?: boolean; preserveTerritorial?: boolean; rejectExisting?: boolean; relaxValidation?: boolean; audit?: any };
  territorial?: { id: string; nombre: string; codigo?: string | null };
  emailFinal: string; phoneFinal: string | null; finalFullName: string;
  identity: { authPersonId: string; authUser: { id_user: string }; authUserCreated: boolean;
    personaChangedFields: string[]; profileChanges: Record<string, { anterior: any; nuevo: any }> };
}
export interface RundNativeWriteHooks {
  inicializarBloques: (id: string, actor: any, canal: any, manager: any) => Promise<any>;
  writeAuditWithManager: (manager: any, entry: any) => Promise<void>;
}

/** Solo SQL nativo RUND. El llamador conserva transaccion, validaciones previas y correo posterior. */
export async function upsertRundNativeProfileWithManager(manager: any, input: RundNativeWriteInput, hooks: RundNativeWriteHooks) {
  const { payload, rawPayload, options, territorial, emailFinal, phoneFinal, finalFullName } = input;
  const { authPersonId, authUser, authUserCreated, personaChangedFields, profileChanges } = input.identity;
      const targetPeriodoCarga = payload.periodoCarga || null;
      const existingDocente = targetPeriodoCarga
        ? await manager.findOne(BancoDocenteEntity, { where: { personaId: authPersonId, periodoCarga: targetPeriodoCarga } as any })
        : await manager.findOne(BancoDocenteEntity, { where: { personaId: authPersonId } });
      if (existingDocente && options.rejectExisting) {
        throw new BadRequestException({
          message: `El documento ${payload.documentNumber} ya existe en el Banco de Docentes para el periodo ${targetPeriodoCarga || 'sin periodo'}.`,
          columna: 'DOCUMENTO_IDENTIDAD',
          datoErrado: payload.documentNumber,
          valorEsperado: `Documento no registrado en el periodo ${targetPeriodoCarga || 'seleccionado'}`,
        });
      }

      let nextIdRund = payload.idRund || existingDocente?.idRund;
      if (!nextIdRund) {
        const seqRes = await manager.query(`SELECT nextval('rund.docente_id_rund_seq') AS next_val`);
        nextIdRund = `RUND-${String(seqRes[0].next_val).padStart(4, '0')}`;
      }

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

      let docente: BancoDocenteEntity;
      let action = existingDocente ? 'update' : 'insert';
      const changedFields: string[] = [];
      
      if (!existingDocente) {
        docente = await manager.save(BancoDocenteEntity, manager.create(BancoDocenteEntity, docenteData));
      } else {
        let hasChanges = false;
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
        
        if (!hasChanges && personaChangedFields.length === 0) {
          action = 'unchanged';
          docente = existingDocente; // No guardamos si no hay cambios
        } else if (!hasChanges) {
          docente = existingDocente;
        } else {
          docente = await manager.save(BancoDocenteEntity, { ...existingDocente, ...docenteData });
        }
      }

      // Â§6.2 â€” Initialize RUND approval blocks (BR-044) for new records
      if (action === 'insert') {
        try {
          await hooks.inicializarBloques(docente.id, rawPayload?.cargadoPor || null, rawPayload?.canal_origen || 'MASIVO', manager);
        } catch (e) {
          console.warn(`[RUND] Could not initialize blocks for docente ${docente.id}:`, e);
        }
      }

      if (existingDocente && action !== 'unchanged') {
        await invalidateEditedEvidence(manager, docente.id, [...personaChangedFields, ...changedFields], options.audit?.actorId || 'SISTEMA', options.audit?.ip);
      }

      // Inicializar ValidacionDocumental en el banco de docentes si no existe
      for (const item of CAMPOS_SOPORTE_RUND) {
        await manager.query(
          `INSERT INTO rund.validacion_documental (docente_id, campo_rund, tipo_documento_soporte, estado_documento)
           VALUES ($1, $2, $3, 'Sin cargar')
           ON CONFLICT (docente_id, campo_rund) DO NOTHING`,
          [docente.id, item.campo, item.tipo]
        );
      }

      if (action !== 'unchanged' && options.audit) {
        const auditAction = options.audit.accion || (action === 'insert' ? 'CREAR' : 'EDITAR');
        await hooks.writeAuditWithManager(manager, {
          docenteId: docente.id,
          bloque: 'GENERAL',
          accion: auditAction,
          actorId: options.audit.actorId,
          canalOrigen: options.audit.canalOrigen,
          campoAfectado: action === 'insert' ? undefined : [...personaChangedFields, ...changedFields].join(','),
          observacion: options.audit.observacion,
          soporteId: options.audit.soporteId,
          ip: options.audit.ip,
          metadata: {
            ...(options.audit.metadata || {}),
            periodoCarga: docente.periodoCarga || null,
            camposModificados: action === 'insert'
              ? ['num_identificacion', ...Object.keys(docenteData)]
              : [...personaChangedFields, ...changedFields],
            cambios: action === 'insert' ? undefined : profileChanges,
          },
        });
      }

      // La segunda comprobacion ocurre dentro de la misma transaccion que guarda
      // el perfil y su auditoria. Evita que un soporte rechazado concurrentemente
      // pueda autorizar una edicion entre la validacion inicial y el commit.
      if (options.audit?.requiredSupport) {
        const required = options.audit.requiredSupport;
        if (!existingDocente || existingDocente.id !== required.docenteId) {
          throw new BadRequestException('El soporte documental no corresponde al perfil que se intenta editar.');
        }
        const supportRows = await manager.query(
          `SELECT id FROM rund."RundSoporteCampo"
           WHERE id::text = $1 AND docente_id = $2
             AND tipo_soporte = $3
             AND documento_carpeta_id IS NOT NULL
             AND COALESCE(estado, '') <> 'Rechazado'
           LIMIT 1`,
          [required.id, required.docenteId, required.type],
        );
        if (!supportRows[0]) {
          throw new BadRequestException('El soporte documental de la edicion dejo de estar disponible o fue rechazado.');
        }
      }

      if (options.audit?.sensitiveAccess) {
        await recordRundAccess(manager, {
          ...options.audit.sensitiveAccess, actorId: options.audit.actorId, ip: options.audit.ip,
          docenteIds: [docente.id], fields: ['DOCUMENTO_IDENTIDAD'],
        });
      }
      return {
        action,
        previewId: rawPayload?.__previewId || null,
        sourceRowNumber: rawPayload?.__sourceRowNumber || null,
        personaId: authPersonId,
        docenteId: docente.id,
        usuarioId: authUser.id_user,
        documentNumber: payload.documentNumber!,
        fullName: finalFullName,
        email: emailFinal,
        territorialNombre: payload.territorialNombre || territorial?.nombre || null,
        authUserCreated,
        welcomeEmail: { sent: false, skipped: !authUserCreated },
        message: action === 'insert' ? 'Docente creado correctamente.' : action === 'unchanged' ? 'Docente ya existe sin cambios.' : 'Docente actualizado correctamente.',
      };
}
