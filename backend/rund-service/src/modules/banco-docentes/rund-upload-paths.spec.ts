import { resolve, join } from 'path';
import { localRundUploadPath, rundLegacyUploadDirectory, rundSupportLocalPath, rundUploadRelativePath, rundUploadUrlForFile } from './rund-upload-paths';

describe('Referencias de archivos RUND', () => {
  const root = resolve('uploads-prueba');
  const relative = 'carpeta-digital/DOCENTE PRUEBA/RUND/soporte.pdf';

  it.each(['/pta/api/v1/uploads/', '/rund/api/v1/uploads/', '/services/rund/api/v1/uploads/',
    '/services/pta/api/v1/uploads/', '/uploads/'])('reconoce %s sin mover el archivo', prefix => {
    expect(localRundUploadPath(prefix + relative, root)).toBe(join(root, relative));
    expect(rundUploadRelativePath(prefix + relative.replace(' ', '%20') + '?download=1')).toBe(relative);
  });

  it('genera una URL RUND a partir del archivo real con espacios y caracteres especiales', () => {
    const file = join(root, 'carpeta-digital', 'DOCENTE PRUEBA', 'RUND', 'soporte #1.pdf');
    const url = rundUploadUrlForFile(file, root);
    expect(url).toBe('/rund/api/v1/uploads/carpeta-digital/DOCENTE%20PRUEBA/RUND/soporte%20%231.pdf');
    expect(localRundUploadPath(url, root)).toBe(file);
  });

  it.each(['carpeta-digital/DOCENTE/RUND/../../../../archivo.pdf', 'carpeta-digital/DOCENTE/RUND/%2e%2e/archivo.pdf',
    'carpeta-digital/DOCENTE/RUND/%252e%252e/archivo.pdf', 'carpeta-digital/DOCENTE/RUND/a%2fb.pdf',
    'carpeta-digital/DOCENTE/RUND/a%5cb.pdf', 'carpeta-digital/DOCENTE/RUND/%00archivo.pdf',
    'carpeta-digital/DOCENTE/RUND/%GG.pdf', 'C:/archivo.pdf', 'carpeta-digital\\DOCENTE\\RUND\\archivo.pdf'])('rechaza la referencia insegura %s', path => {
    expect(localRundUploadPath('/rund/api/v1/uploads/' + path, root)).toBeNull();
  });

  it.each(['id-documento-auth', '/auth/api/v1/uploads/carpeta-digital/persona/archivo.pdf',
    'https://servidor.example/rund/api/v1/uploads/archivo.pdf', '//servidor/archivo.pdf',
    '/rund/api/v1/pta/banco-docentes/id/documentos/doc/contenido'])('no interpreta una referencia externa como archivo local: %s', reference => {
    expect(localRundUploadPath(reference, root)).toBeNull();
  });

  it.each(['..', '.', '../fuera', 'docente\\fuera', 'C:otro', ''])('no crea una carpeta fuera de uploads: %s', folder => {
    expect(() => rundLegacyUploadDirectory(folder, root)).toThrow();
  });

  it('no construye enlaces para archivos fuera del almacenamiento RUND', () => {
    expect(() => rundUploadUrlForFile(join(root, '..', 'fuera.pdf'), root)).toThrow();
    expect(() => rundUploadUrlForFile(join(root, 'solicitudes-pta', 'adjunto.pdf'), root)).toThrow();
  });

  it('diagnostica un documento versionado usando almacenamiento_ruta y no el endpoint de contenido', () => {
    expect(rundSupportLocalPath({ documento_perfil_id: 'version-1', documento_carpeta_id: '/rund/api/v1/pta/banco-docentes/id/documentos/doc/contenido',
      proveedor_almacenamiento: 'LOCAL', almacenamiento_ruta: 'rund-documentos/doc/IDENTIDAD/v1.pdf' }, root))
      .toBe(join(root, 'rund-documentos/doc/IDENTIDAD/v1.pdf'));
  });

  it('conserva LEGACY_LOCAL y no trata OpenKM ni una versión perdida como disco local', () => {
    expect(rundSupportLocalPath({ documento_perfil_id: 'version-1', proveedor_almacenamiento: 'LEGACY_LOCAL',
      almacenamiento_ruta: '/pta/api/v1/uploads/' + relative }, root)).toBe(join(root, relative));
    expect(rundSupportLocalPath({ documento_perfil_id: 'version-1', proveedor_almacenamiento: 'OPENKM',
      almacenamiento_ruta: '/okm:root/RUND/doc.pdf', documento_carpeta_id: '/uploads/' + relative }, root)).toBeNull();
    expect(rundSupportLocalPath({ documento_perfil_id: 'version-inexistente', documento_carpeta_id: '/uploads/' + relative }, root)).toBeNull();
  });
});
