import type { RundAuthWriteInput, RundAuthWriteNormalization } from './rund-auth-identity-write';

/** Propuesta pura compartida por el escritor vigente y la previsualizacion. */
export function planRundAuthPersona(input: RundAuthWriteInput, normalization: RundAuthWriteNormalization, authPersona: any) {
  const {payload,options,territorial,emailFinal,phoneFinal,finalFullName}=input;
  const {formatDateOnly,splitFullName,normalizeLookupText}=normalization;
  const personaChangedFields: string[]=[];
  const profileChanges: Record<string,{anterior:any;nuevo:any}>={};
  // Auth usa bigint: transmitir el ID textual evita redondearlo antes de validar la FK.
  const authSeccionalId = !options.preserveTerritorial && territorial?.id ? territorial.id : null;
  const firstName = payload.primer_nombre || splitFullName(finalFullName).primer_nombre || 'Docente';
  const lastName = payload.primer_apellido || splitFullName(finalFullName).primer_apellido || null;
  const genderText = normalizeLookupText(payload.genero || 'N');
  const gender = ['m', 'masculino'].includes(genderText) ? 'M'
    : ['f', 'femenino'].includes(genderText) ? 'F'
      : (payload.genero || 'N').trim().toUpperCase().slice(0, 20);

  if(authPersona) {
    const personaCandidates: Record<string, any> = {
      tip_identificacion: payload.documentType || authPersona.tip_identificacion || 'CC',
      nom_largo: finalFullName,
      nom_tercero: firstName,
      pri_apellido: lastName,
      seg_apellido: payload.segundo_apellido,
      gen_tercero: gender || authPersona.gen_tercero || 'N',
      fec_nacimiento: payload.fechaNacimiento || authPersona.fec_nacimiento || null,
      dir_email: emailFinal,
      tel_celular: phoneFinal || authPersona.tel_celular || null,
      id_seccional: authSeccionalId || authPersona.id_seccional || null,
    };
    for (const [field, nextValue] of Object.entries(personaCandidates)) {
      const previousValue = authPersona[field];
      const normalizedPrevious = field === 'fec_nacimiento'
        ? formatDateOnly(previousValue)
        : String(previousValue ?? '').trim();
      const normalizedNext = field === 'fec_nacimiento'
        ? formatDateOnly(nextValue)
        : String(nextValue ?? '').trim();
      if (normalizedNext !== normalizedPrevious) {
        personaChangedFields.push(field);
        profileChanges[field] = { anterior: previousValue ?? null, nuevo: nextValue ?? null };
      }
    }
  }
  return {authSeccionalId,firstName,lastName,gender,personaChangedFields,profileChanges};
}
