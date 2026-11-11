import { assertRundEvidenceData, standaloneSupportCategory } from './rund-evidence-data';
import {
  EVIDENCE_TYPES, IDENTITY_TYPES, RUND_REQUIRED_BLOCKS, RUND_REVIEW_BLOCKS, currentBlockRows, evidenceSummary, STANDALONE_SUPPORT_TYPES, evidenceFields, evidenceGroup, requiredEvidence, validateEvidenceType,
} from './rund-evidence-workflow';

// RUND-002: soportes de la codificación documental del GGP sin campo en RUND.
describe('codificación documental RUND', () => {
  const nuevos = Object.entries(STANDALONE_SUPPORT_TYPES).flatMap(([bloque, tipos]) => tipos.map(tipo => [bloque, tipo] as const));

  it.each(nuevos)('acepta %s como soporte del bloque %s', (bloque, tipo) => {
    expect(() => validateEvidenceType(bloque, tipo)).not.toThrow();
    expect(EVIDENCE_TYPES[bloque]).toContain(tipo);
  });

  it('no acepta un soporte nuevo en un bloque ajeno', () => {
    expect(() => validateEvidenceType('VINCULACION', 'hoja_vida')).toThrow();
    expect(() => validateEvidenceType('FORMACION', 'tarjeta_profesional')).toThrow();
  });

  it('son opcionales: las fichas ya aprobadas no pierden su estado ni exigen archivos nuevos', () => {
    const docente = { investigacion: 'Sí', especializacion: 'X' };
    for (const bloque of ['IDENTIDAD', 'FORMACION', 'ACADEMICO']) {
      const exigidos = requiredEvidence(bloque, docente).flat();
      for (const tipo of STANDALONE_SUPPORT_TYPES[bloque]) expect(exigidos).not.toContain(tipo);
    }
  });

  it('la cédula, CE y pasaporte siguen siendo un solo punto de control sin absorber los soportes nuevos', () => {
    expect(requiredEvidence('IDENTIDAD', {})).toEqual([IDENTITY_TYPES]);
    expect(evidenceGroup('cedula_extranjeria')).toEqual(IDENTITY_TYPES);
    expect(evidenceGroup('hoja_vida')).toEqual(['hoja_vida']);
    expect(evidenceFields('tarjeta_profesional')).toEqual(['tarjeta_profesional']);
  });

  it('permite cargar un soporte sin campo en RUND sin consultar ni exigir datos del perfil', async () => {
    const query = jest.fn();
    for (const [, tipo] of nuevos) await expect(assertRundEvidenceData({ query }, 'docente-1', tipo)).resolves.toBeUndefined();
    expect(query).not.toHaveBeenCalled();
  });

  it('conserva el requisito de dato previo en los soportes que acreditan una fila', async () => {
    const query = jest.fn().mockResolvedValue([{ pregrado: null }]);
    await expect(assertRundEvidenceData({ query }, 'docente-1', 'diploma_pregrado')).rejects.toThrow('Registre primero el dato');
  });

  it.each([
    ['hoja_vida', 'IDENTIDAD'], ['tarjeta_profesional', 'IDENTIDAD'], ['diploma_bachiller', 'TITULOS'],
    ['experiencia_docente', 'EXPERIENCIA'], ['experiencia_laboral', 'EXPERIENCIA'], ['experiencia_investigativa', 'EXPERIENCIA'],
    ['productividad_academica', 'CERTIFICADOS'], ['dominio_segunda_lengua', 'CERTIFICADOS'],
    ['formacion_no_formal', 'CERTIFICADOS'], ['estudio_hoja_vida', 'CERTIFICADOS'],
  ])('clasifica %s en la categoría documental %s', (tipo, categoria) => {
    expect(standaloneSupportCategory(tipo)).toBe(categoria);
  });

  it('no reclasifica soportes anteriores', () => {
    expect(standaloneSupportCategory('diploma_pregrado')).toBeNull();
    expect(standaloneSupportCategory('hoja_vida_pro')).toBeNull();
  });

  it('un bloque duplicado por carrera se resuelve siempre con la misma fila', () => {
    const rows = [
      { bloque: 'IDENTIDAD', version: 7, createdAt: '2026-11-08T13:02:21.936Z', id: 'b' },
      { bloque: 'IDENTIDAD', version: 7, createdAt: '2026-11-08T13:02:21.935Z', id: 'a' },
      { bloque: 'ACADEMICO', version: 3, createdAt: '2026-11-08T13:02:21.950Z', id: 'c' },
      { bloque: 'ACADEMICO', version: 5, createdAt: '2026-11-08T13:02:21.951Z', id: 'd' },
    ];
    const unico = currentBlockRows(rows);
    expect(unico.map(row => row.bloque)).toEqual(['IDENTIDAD', 'ACADEMICO']);
    expect(unico.map(row => row.id)).toEqual(['a', 'd']);
    expect([...currentBlockRows([...rows].reverse())].map(row => row.id).sort()).toEqual(['a', 'd']);
  });

  it('la activación del perfil no cambia: siguen obligatorios los mismos cinco bloques', () => {
    expect(RUND_REQUIRED_BLOCKS).toEqual(['IDENTIDAD', 'FORMACION', 'VINCULACION', 'ACADEMICO', 'TRANSVERSAL']);
  });

  it('las carpetas nuevas son revisables pero opcionales para activar el perfil', () => {
    const nuevas = ['EXPERIENCIA_DOCENTE', 'EXPERIENCIA_LABORAL', 'PRODUCTIVIDAD_ACADEMICA', 'SEGUNDA_LENGUA',
      'FORMACION_NO_FORMAL', 'ESTUDIO_HOJA_VIDA', 'DOCUMENTOS_NO_VALIDOS'];
    for (const bloque of nuevas) {
      expect(RUND_REVIEW_BLOCKS).toContain(bloque);
      expect(RUND_REQUIRED_BLOCKS).not.toContain(bloque);
      expect(requiredEvidence(bloque, {})).toEqual([]);
    }
    const aprobados = Object.fromEntries(RUND_REQUIRED_BLOCKS.map(bloque => [bloque, 'Aprobado']));
    expect(evidenceSummary(Object.entries({ ...aprobados, EXPERIENCIA_DOCENTE: 'Soporte faltante' }).map(([bloque, estado]) => ({ bloque, estado }))).activable).toBe(true);
  });

  it('una carpeta devuelta sí devuelve el perfil, aunque sea opcional', () => {
    const aprobados = Object.fromEntries(RUND_REQUIRED_BLOCKS.map(bloque => [bloque, 'Aprobado']));
    const resumen = evidenceSummary(Object.entries({ ...aprobados, SEGUNDA_LENGUA: 'Devuelto' }).map(([bloque, estado]) => ({ bloque, estado })));
    expect(resumen.estado).toBe('DEVUELTO');
    expect(resumen.activable).toBe(false);
  });

  it('cada soporte nuevo solo es válido en su carpeta', () => {
    expect(() => validateEvidenceType('EXPERIENCIA_DOCENTE', 'experiencia_docente')).not.toThrow();
    expect(() => validateEvidenceType('ACADEMICO', 'experiencia_docente')).toThrow();
    expect(() => validateEvidenceType('ACADEMICO', 'experiencia_investigativa')).not.toThrow();
    expect(() => validateEvidenceType('DOCUMENTOS_NO_VALIDOS', 'documento_no_valido')).not.toThrow();
  });
});
