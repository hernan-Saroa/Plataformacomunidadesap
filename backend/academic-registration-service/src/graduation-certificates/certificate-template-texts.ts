export interface GraduationCertificateTemplateTexts {
  cityDatePrefix: string;
  institutionTitle: string;
  certificateTitle: string;
  addressee: string;
  introParagraph: string;
  degreeLabel: string;
  graduateNameLabel: string;
  documentLabel: string;
  issuePlaceDateLabel: string;
  registryLabel: string;
  closingText: string;
  signerTitle: string;
  validationMessage: string;
  footerAddress: string;
}

export interface GraduationCertificateTemplateSnapshot {
  schemaVersion: number;
  templateConfigId: number | null;
  templateVersion: string;
  templateUpdatedAt: string | null;
  validationBaseUrl: string | null;
  typographyFont: string;
  signerId: string | null;
  institutionLogoUrl: string | null;
  institutionLogoFilename: string | null;
  footerLogoUrl: string | null;
  footerLogoFilename: string | null;
  signerNameOverride: string | null;
  signatureUrlOverride: string | null;
  signatureFilenameOverride: string | null;
  texts: GraduationCertificateTemplateTexts;
}

type StoredGraduationCertificateTemplateTexts = {
  schemaVersion?: number;
  texts?: Partial<GraduationCertificateTemplateTexts>;
};

type GraduationCertificateTemplateSnapshotSource = {
  id?: number | null;
  version?: string | null;
  updatedAt?: Date | string | null;
  validationBaseUrl?: string | null;
  typographyFont?: string | null;
  signerId?: string | null;
  institutionLogoUrl?: string | null;
  institutionLogoFilename?: string | null;
  footerLogoUrl?: string | null;
  footerLogoFilename?: string | null;
  signerNameOverride?: string | null;
  signatureUrlOverride?: string | null;
  signatureFilenameOverride?: string | null;
  signerTitleOverride?: string | null;
  certificateContentHtml?: string | null;
};

export const DEFAULT_GRADUATION_CERTIFICATE_TEMPLATE_TEXTS: GraduationCertificateTemplateTexts =
  {
    cityDatePrefix: 'Bogota, D.C.,',
    institutionTitle:
      'ESCUELA SUPERIOR DE ADMINISTRACION PUBLICA - ESAP',
    certificateTitle: 'Verificacion de titulo',
    addressee: 'A QUIEN INTERESE',
    introParagraph:
      'De conformidad con los registros en el Sistema de Control Academico de la Escuela Superior de Administracion Publica -ESAP-, nos permitimos informar la verificacion del siguiente titulo academico:',
    degreeLabel: 'Titulo otorgado:',
    graduateNameLabel: 'Nombres y apellidos del egresado graduado:',
    documentLabel: 'Numero de documento de identificacion:',
    issuePlaceDateLabel: 'Lugar y fecha de expedicion del titulo:',
    registryLabel: 'Registro - Folio - Libro:',
    closingText: 'Cordialmente,',
    signerTitle: 'Direccion Tecnica Registro y Control',
    validationMessage:
      'Puede validar la autenticidad de esta verificacion en',
    footerAddress:
      'Sede Nacional - Bogota - Calle 44 No. 53 - 37 CAN\nPBX: 2202790 - Fax: (091) 2202790 Ext. 7205\nCorreo Electronico: ventanillaunica@esap.edu.co\nwww.esap.edu.co',
  };

function normalizeRequiredTemplateText(value: unknown, fallback: string): string {
  const text = String(value ?? '').trim();
  return text ? String(value) : fallback;
}

export function normalizeGraduationCertificateTemplateTexts(
  value?: Partial<GraduationCertificateTemplateTexts> | null,
): GraduationCertificateTemplateTexts {
  const defaults = DEFAULT_GRADUATION_CERTIFICATE_TEMPLATE_TEXTS;

  return {
    cityDatePrefix: normalizeRequiredTemplateText(
      value?.cityDatePrefix,
      defaults.cityDatePrefix,
    ),
    institutionTitle: normalizeRequiredTemplateText(
      value?.institutionTitle,
      defaults.institutionTitle,
    ),
    certificateTitle: normalizeRequiredTemplateText(
      value?.certificateTitle,
      defaults.certificateTitle,
    ),
    addressee: normalizeRequiredTemplateText(
      value?.addressee,
      defaults.addressee,
    ),
    introParagraph: normalizeRequiredTemplateText(
      value?.introParagraph,
      defaults.introParagraph,
    ),
    degreeLabel: normalizeRequiredTemplateText(
      value?.degreeLabel,
      defaults.degreeLabel,
    ),
    graduateNameLabel: normalizeRequiredTemplateText(
      value?.graduateNameLabel,
      defaults.graduateNameLabel,
    ),
    documentLabel: normalizeRequiredTemplateText(
      value?.documentLabel,
      defaults.documentLabel,
    ),
    issuePlaceDateLabel: normalizeRequiredTemplateText(
      value?.issuePlaceDateLabel,
      defaults.issuePlaceDateLabel,
    ),
    registryLabel: normalizeRequiredTemplateText(
      value?.registryLabel,
      defaults.registryLabel,
    ),
    closingText: normalizeRequiredTemplateText(
      value?.closingText,
      defaults.closingText,
    ),
    signerTitle: normalizeRequiredTemplateText(
      value?.signerTitle,
      defaults.signerTitle,
    ),
    validationMessage: normalizeRequiredTemplateText(
      value?.validationMessage,
      defaults.validationMessage,
    ),
    footerAddress: normalizeRequiredTemplateText(
      value?.footerAddress,
      defaults.footerAddress,
    ),
  };
}

export function parseGraduationCertificateTemplateTexts(
  raw?: string | null,
): GraduationCertificateTemplateTexts | null {
  const trimmed = String(raw || '').trim();
  if (!trimmed || !trimmed.startsWith('{')) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      trimmed,
    ) as StoredGraduationCertificateTemplateTexts;
    return normalizeGraduationCertificateTemplateTexts(parsed?.texts);
  } catch (_error) {
    return null;
  }
}

export function serializeGraduationCertificateTemplateTexts(
  texts: GraduationCertificateTemplateTexts,
): string {
  return JSON.stringify(
    {
      schemaVersion: 1,
      texts: normalizeGraduationCertificateTemplateTexts(texts),
    },
    null,
    2,
  );
}

export function buildGraduationCertificateTemplateSnapshot(
  source?: GraduationCertificateTemplateSnapshotSource | null,
): GraduationCertificateTemplateSnapshot {
  const parsedTexts =
    parseGraduationCertificateTemplateTexts(source?.certificateContentHtml) ||
    DEFAULT_GRADUATION_CERTIFICATE_TEMPLATE_TEXTS;

  const texts = normalizeGraduationCertificateTemplateTexts({
    ...parsedTexts,
    signerTitle:
      source?.signerTitleOverride ||
      parsedTexts.signerTitle ||
      DEFAULT_GRADUATION_CERTIFICATE_TEMPLATE_TEXTS.signerTitle,
  });

  return {
    schemaVersion: 1,
    templateConfigId:
      typeof source?.id === 'number' ? source.id : null,
    templateVersion: String(source?.version || '1.0.0'),
    templateUpdatedAt: source?.updatedAt
      ? new Date(source.updatedAt).toISOString()
      : null,
    validationBaseUrl: source?.validationBaseUrl
      ? String(source.validationBaseUrl).replace(/\/$/, '')
      : null,
    typographyFont: String(
      source?.typographyFont || 'Arial Narrow, Arial, sans-serif',
    ),
    signerId: source?.signerId || null,
    institutionLogoUrl: source?.institutionLogoUrl || null,
    institutionLogoFilename: source?.institutionLogoFilename || null,
    footerLogoUrl: source?.footerLogoUrl || null,
    footerLogoFilename: source?.footerLogoFilename || null,
    signerNameOverride: source?.signerNameOverride || null,
    signatureUrlOverride: source?.signatureUrlOverride || null,
    signatureFilenameOverride: source?.signatureFilenameOverride || null,
    texts,
  };
}

export function parseGraduationCertificateTemplateSnapshot(
  raw?: unknown,
): GraduationCertificateTemplateSnapshot | null {
  if (!raw) {
    return null;
  }

  let parsed: any = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('{')) {
      return null;
    }

    try {
      parsed = JSON.parse(trimmed);
    } catch (_error) {
      return null;
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const texts = normalizeGraduationCertificateTemplateTexts(parsed.texts);

  return {
    schemaVersion:
      Number.parseInt(String(parsed.schemaVersion || '1'), 10) || 1,
    templateConfigId:
      typeof parsed.templateConfigId === 'number'
        ? parsed.templateConfigId
        : null,
    templateVersion: String(parsed.templateVersion || '1.0.0'),
    templateUpdatedAt: parsed.templateUpdatedAt
      ? String(parsed.templateUpdatedAt)
      : null,
    validationBaseUrl: parsed.validationBaseUrl
      ? String(parsed.validationBaseUrl).replace(/\/$/, '')
      : null,
    typographyFont: String(
      parsed.typographyFont || 'Arial Narrow, Arial, sans-serif',
    ),
    signerId: parsed.signerId ? String(parsed.signerId) : null,
    institutionLogoUrl: parsed.institutionLogoUrl
      ? String(parsed.institutionLogoUrl)
      : null,
    institutionLogoFilename: parsed.institutionLogoFilename
      ? String(parsed.institutionLogoFilename)
      : null,
    footerLogoUrl: parsed.footerLogoUrl ? String(parsed.footerLogoUrl) : null,
    footerLogoFilename: parsed.footerLogoFilename
      ? String(parsed.footerLogoFilename)
      : null,
    signerNameOverride: parsed.signerNameOverride
      ? String(parsed.signerNameOverride)
      : null,
    signatureUrlOverride: parsed.signatureUrlOverride
      ? String(parsed.signatureUrlOverride)
      : null,
    signatureFilenameOverride: parsed.signatureFilenameOverride
      ? String(parsed.signatureFilenameOverride)
      : null,
    texts,
  };
}
