/**
 * En este MFE, los originales RUND viven en rund-service. Solo cambia el destino
 * de transporte: la referencia persistida también puede ser documentoVersionId.
 */
export function rundUploadEndpoint(endpoint: string): string {
  const match = endpoint.match(/^\/(?:services\/)?(?:pta|rund)\/api\/v1\/(.+)$/);
  if (!match) return endpoint;
  const path = match[1];
  const staticOriginal = /^uploads\/(?:rund-documentos(?:\/|$)|carpeta-digital\/[^/]+\/RUND(?:\/|$))/i.test(path);
  const versionedOriginal = /^(?:pta\/)?banco-docentes\/[^/]+\/documentos\/[^/]+\/contenido(?:[?#]|$)/.test(path);
  return staticOriginal || versionedOriginal ? '/rund/api/v1/' + path : endpoint;
}
