import {
  canViewRundSensitiveData,
  findRundSensitiveFields,
  getRequestRoleCodes,
  maskIdentityDocument,
  protectRundSensitiveData,
} from './banco-docentes-sensitive-data';

describe('RBAC de datos sensibles RUND', () => {
  it('normaliza roles y solo concede acceso completo a GGP o SUPER_ADMIN', () => {
    expect(getRequestRoleCodes({ roles: [{ code: 'gestion_profesoral' }, 'Docente'] }))
      .toEqual(['GESTION_PROFESORAL', 'DOCENTE']);
    expect(canViewRundSensitiveData({ roles: ['GESTION_PROFESORAL'] })).toBe(true);
    expect(canViewRundSensitiveData({ roles: ['SUPER_ADMIN'] })).toBe(true);
    expect(canViewRundSensitiveData({ roles: ['ADMIN'] })).toBe(false);
    expect(canViewRundSensitiveData({ roles: ['DOCENTE'] })).toBe(false);
    expect(canViewRundSensitiveData({ roles: ['CONSULTOR'] })).toBe(false);
  });

  it('enmascara la cedula y oculta el puntaje para roles no autorizados', () => {
    const source = {
      docente_id: 'docente-1',
      documento_identidad: '1020304050',
      puntaje_salarial: 145.5,
      nombre_completo: 'MARIA LOPEZ',
    };

    const result = protectRundSensitiveData(source, false);
    expect(result).toMatchObject({
      documento_identidad: '******4050',
      puntaje_salarial: null,
      nombre_completo: 'MARIA LOPEZ',
      proteccion_datos: {
        acceso_completo: false,
        campos_enmascarados: ['DOCUMENTO_IDENTIDAD', 'PUNTAJE_SALARIAL'],
      },
    });
    expect(source.documento_identidad).toBe('1020304050');
    expect(source.puntaje_salarial).toBe(145.5);
  });

  it('protege alias legacy que pueden aparecer en respuestas del perfil RUND', () => {
    const result = protectRundSensitiveData({
      documentoIdentidad: '1020304050',
      puntajeSalarial: 145.5,
      persona: { identificacion: '1020304050' },
    }, false);

    expect(result.documentoIdentidad).toBe('******4050');
    expect(result.puntajeSalarial).toBeNull();
    expect(result.persona.identificacion).toBe('******4050');
    expect(result.proteccion_datos.campos_sensibles).toEqual([
      'DOCUMENTO_IDENTIDAD',
      'PUNTAJE_SALARIAL',
    ]);
  });

  it('protege tambien los campos anidados de la tarjeta RUND', () => {
    const source = {
      docenteId: 'docente-1',
      bloques: {
        IDENTIDAD: { campos: [{ campo: 'DOCUMENTO_IDENTIDAD', valor: '12345678', editable: false }] },
        VINCULACION: { campos: [{ campo: 'PUNTAJE_SALARIAL', valor: 200.25, editable: true }] },
      },
    };

    const result: any = protectRundSensitiveData(source, false);
    expect(result.bloques.IDENTIDAD.campos[0]).toMatchObject({ valor: '****5678', restringido: true });
    expect(result.bloques.VINCULACION.campos[0]).toMatchObject({ valor: null, editable: false, restringido: true });
    expect(findRundSensitiveFields(source)).toEqual(['DOCUMENTO_IDENTIDAD', 'PUNTAJE_SALARIAL']);
  });

  it('mantiene los valores completos para un rol autorizado', () => {
    const source = { documento_identidad: '1020304050', puntaje_salarial: 145.5 };
    const result = protectRundSensitiveData(source, true);
    expect(result.documento_identidad).toBe('1020304050');
    expect(result.puntaje_salarial).toBe(145.5);
    expect(result.proteccion_datos.acceso_completo).toBe(true);
  });

  it('enmascara documentos cortos sin revelar caracteres', () => {
    expect(maskIdentityDocument('1234')).toBe('****');
    expect(maskIdentityDocument(null)).toBeNull();
  });
});
