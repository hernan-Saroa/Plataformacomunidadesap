import { BadRequestException, HttpException, ServiceUnavailableException } from '@nestjs/common';
import { BancoDocenteEntity } from '../../entities/banco-docente.entity';
import type { RundAuthWriteNormalization } from './rund-auth-identity-write';
import type { RundNativeWriteInput } from './rund-native-profile-write';
import { planRundAuthPersona } from './rund-auth-persona-plan';
import { planRundNativeProfile } from './rund-native-profile-plan';
import type { AuthIdentityClient } from '../../common/auth-identity.client';

/** Lecturas del estado actual. No llama escritores, genera IDs ni reserva recursos.
 * Auth entrega una observación mínima; el manager solo consulta perfiles RUND.
 */
export async function previewRundBulkRow(manager: Pick<any, 'findOne'>,
  input: Omit<RundNativeWriteInput, 'identity'>, normalization: RundAuthWriteNormalization,
  identities: Pick<AuthIdentityClient, 'previsualizacionMasiva'>) {
  try {
    const { payload, options, emailFinal, finalFullName, territorial, rawPayload } = input;
    const observed = await identities.previsualizacionMasiva(payload.documentNumber, emailFinal);
    const persona = observed.persona, user = observed.usuario;
    if (observed.conflictoCorreo) throw new BadRequestException({ message: `El correo ${emailFinal} ya está en uso por otra persona o usuario.`,
      columna: 'CORREO_INSTITUCIONAL', datoErrado: emailFinal, valorEsperado: 'Correo único' });
    if (!observed.rolDocenteDisponible) throw new BadRequestException('No existe el rol DOCENTE en auth.role.');
    const existing = persona ? await manager.findOne(BancoDocenteEntity, {
      where: { personaId: persona.id_person, ...(payload.periodoCarga ? { periodoCarga: payload.periodoCarga } : {}) },
    }) : null;
    if (existing && options.rejectExisting) throw new BadRequestException({
      message: `El documento ${payload.documentNumber} ya existe en el Banco de Docentes para el periodo ${payload.periodoCarga || 'sin periodo'}.`,
      columna: 'DOCUMENTO_IDENTIDAD', datoErrado: payload.documentNumber,
      valorEsperado: `Documento no registrado en el periodo ${payload.periodoCarga || 'seleccionado'}` });
    const proposal = planRundAuthPersona(input, normalization, persona);
    if (user && String(user.username || '').trim().toLowerCase() !== emailFinal) proposal.personaChangedFields.push('username');
    const native = planRundNativeProfile({ ...input, identity: {
      authPersonId: persona?.id_person || '', authUser: { id_user: user?.id_user || '' }, authUserCreated: !user,
      personaChangedFields: proposal.personaChangedFields, profileChanges: proposal.profileChanges,
    } }, existing || null, payload.idRund || existing?.idRund || undefined);
    const action = !existing ? 'insert' : !native.hasChanges && !proposal.personaChangedFields.length ? 'unchanged' : 'update';
    return { action, previewId: rawPayload?.__previewId || null, sourceRowNumber: rawPayload?.__sourceRowNumber || null,
      personaId: persona?.id_person || null, docenteId: existing?.id || null, usuarioId: user?.id_user || null,
      documentNumber: payload.documentNumber, fullName: finalFullName, email: emailFinal,
      territorialNombre: payload.territorialNombre || territorial?.nombre || null, authUserCreated: !user,
      welcomeEmail: { sent: false, skipped: Boolean(user) },
      message: action === 'insert' ? 'Previsualización: docente por crear.'
        : action === 'update' ? 'Previsualización: docente por actualizar.' : 'Previsualización: docente sin cambios.' };
  } catch (error) {
    if (error instanceof HttpException) throw error;
    throw new ServiceUnavailableException('No fue posible previsualizar la fila de la carga RUND.');
  }
}
