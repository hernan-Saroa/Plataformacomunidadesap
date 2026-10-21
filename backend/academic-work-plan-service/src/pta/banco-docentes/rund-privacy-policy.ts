import { BadRequestException, ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';

const existingNotice = 'Autorizo de manera voluntaria, previa, explícita e informada a la Escuela Superior de Administración Pública (ESAP) para el tratamiento de mis datos personales de acuerdo con la Ley 1581 de 2012.';

export function rundPrivacyPolicy() {
  let policy = { version: 'aviso-existente-v1', texto: existingNotice, url: '', aprobacion: '', configurada: false };
  const file = process.env.RUND_PRIVACY_POLICY_FILE?.trim();
  if (file) {
    try {
      const data = JSON.parse(readFileSync(file, 'utf8'));
      if (!['version', 'texto', 'url', 'aprobacion'].every(key => typeof data[key] === 'string' && data[key].trim())
        || data.texto.length > 30000 || data.version.length > 200 || data.aprobacion.length > 2000) throw new Error();
      const url = new URL(data.url);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
      policy = { version: data.version, texto: data.texto, url: data.url, aprobacion: data.aprobacion, configurada: true };
    } catch { throw new ServiceUnavailableException('La política de tratamiento del backend está mal configurada.'); }
  }
  return { ...policy, huella: createHash('sha256').update(JSON.stringify(policy)).digest('hex') };
}

export function acceptedPrivacyPolicy(input: any) {
  if (input?.terminosAceptados !== true) throw new BadRequestException('Debe aceptar la política de tratamiento antes de enviar.');
  const policy = rundPrivacyPolicy();
  // Durante el despliegue gradual el formulario anterior muestra este mismo aviso,
  // pero no envía huella. La excepción solo aplica al aviso original sin configurar.
  const legacyNotice = input.politicaTratamientoHuella === undefined && !policy.configurada;
  if (!legacyNotice && input.politicaTratamientoHuella !== policy.huella) {
    throw new ConflictException('La política de tratamiento cambió o no fue consultada. Ingrese nuevamente y revise los términos.');
  }
  return { ...policy, aceptada: true, aceptadaEn: new Date().toISOString(),
    huellaVerificada: !legacyNotice, canalAceptacion: legacyNotice ? 'FORMULARIO_ANTERIOR' : 'AVISO_VERSIONADO' };
}
