import { rundDocumentBlock } from './rundDocumentScope';

/** Contacto revisa datos; los demás bloques requieren evidencia documental propia. */
export function canReturnRundBlock(block?: { bloque?: string; soportes?: any[]; puedeDevolver?: boolean }): boolean {
  if (!block?.bloque) return false;
  if (block.bloque === 'CONTACTO') return true;
  if (block.puedeDevolver === false) return false;
  return (block.soportes || []).some(s => {
    const type = s.tipo_soporte || s.tipo;
    if (['soporte_edicion_perfil', 'soporte_cambio_estado_perfil'].includes(type)) return false;
    if (rundDocumentBlock({ tipoSoporte: type }) !== block.bloque || (s.bloque && s.bloque !== block.bloque)) return false;
    if (s.documento_perfil_id) return !('estado_documento' in s) || s.estado_documento === 'ACTIVO';
    return Boolean(String(s.documento_carpeta_id || '').trim());
  });
}
