import { identityWriteCommand, IdentityWriteCommand } from '../../common/auth-identity-command';
import { nativeBusinessContext } from './rund-native-business-context';
import type { RundNativeWriteInput } from './rund-native-profile-write';

/**
 * Contrato liviano del escritor de identidad por API. BancoDocentesService solo conoce este archivo:
 * así no importa la maquinaria de coordinación (que a su vez importa BancoDocentesService) y se evita un ciclo.
 */
export const RUND_IDENTITY_WRITER = 'RUND_IDENTITY_WRITER';
export type RundIdentityWriteInput = Omit<RundNativeWriteInput, 'identity'>;
export type RundIdentityWritePlan = { ok: true; input: RundIdentityWriteInput; command: IdentityWriteCommand } | { ok: false; reason: string };

export interface RundIdentityWriter {
  /** Decide si la solicitud puede coordinarse con Auth; si no, el llamador conserva el escritor anterior. */
  plan(input: RundIdentityWriteInput): RundIdentityWritePlan;
  /** Aplica la identidad en Auth y confirma el perfil nativo. Devuelve el mismo resultado que el escritor anterior. */
  write(plan: Extract<RundIdentityWritePlan, { ok: true }>): Promise<any>;
}

/** Activa la escritura de identidad por Auth (diario durable). Apagada por defecto. */
export const identityWriteViaAuthEnabled = () => process.env.RUND_IDENTITY_WRITE_VIA_AUTH_API === 'true';

const CONTEXT_OPTIONS = ['bulkImport', 'preserveTerritorial', 'rejectExisting', 'relaxValidation', 'audit'] as const;

/** Solo los datos que el contexto persistido admite; el territorial se normaliza a texto como exige el contrato. */
export function normalizeIdentityWriteInput(input: RundIdentityWriteInput): RundIdentityWriteInput {
  const t: any = input.territorial;
  const territorial = t && t.id !== undefined && t.id !== null
    ? { id: String(t.id), nombre: t.nombre, ...(t.codigo !== undefined ? { codigo: t.codigo } : {}) } : undefined;
  // Las opciones internas del llamador (territoriales, outerManager, previewOnly...) no forman parte del contexto persistido.
  const options: RundIdentityWriteInput['options'] = {};
  for (const key of CONTEXT_OPTIONS) if ((input.options as any)?.[key] !== undefined) (options as any)[key] = (input.options as any)[key];
  return { payload: input.payload, rawPayload: input.rawPayload, options, ...(territorial ? { territorial } : {}),
    emailFinal: input.emailFinal, phoneFinal: input.phoneFinal, finalFullName: input.finalFullName };
}

/** Mismo mapeo que usa la entrada manual: lo que Auth necesita para crear o actualizar persona y cuenta. */
export function identityWriteCommandFor(input: RundIdentityWriteInput): IdentityWriteCommand {
  const { payload, options, territorial } = input;
  return identityWriteCommand({
    version: 1, actorId: options?.audit?.actorId,
    payload: { documentNumber: payload.documentNumber, documentType: payload.documentType ?? null,
      primer_nombre: payload.primer_nombre || null, primer_apellido: payload.primer_apellido || null, segundo_apellido: payload.segundo_apellido || null,
      genero: payload.genero ?? null,
      fechaNacimiento: payload.fechaNacimiento ? new Date(payload.fechaNacimiento).toISOString().slice(0, 10) : null },
    options: { relaxValidation: Boolean(options.relaxValidation), preserveTerritorial: Boolean(options.preserveTerritorial) },
    territorial: territorial ? { id: String(territorial.id) } : null,
    emailFinal: input.emailFinal, phoneFinal: input.phoneFinal, finalFullName: input.finalFullName });
}

/** Valida con las mismas reglas del contexto persistido; lo que no encaje sigue por el escritor anterior. */
export function identityWritePlan(raw: RundIdentityWriteInput): RundIdentityWritePlan {
  try {
    const input = normalizeIdentityWriteInput(raw);
    const command = identityWriteCommandFor(input);
    nativeBusinessContext(command, input);
    return { ok: true, input, command };
  } catch (error: any) {
    return { ok: false, reason: String(error?.message || 'Contexto incompatible.') };
  }
}
