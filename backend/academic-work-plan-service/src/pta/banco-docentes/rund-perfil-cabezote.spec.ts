import {
  buildRundPerfilCabezote,
  normalizarEstadoVinculacion,
  resolverUltimaEvaluacion,
  RUND_CABEZOTE_CAMPOS,
} from './rund-perfil-cabezote';
import { protectRundSensitiveData } from './banco-docentes-sensitive-data';

const filaListado = {
  docente_id: 'docente-1',
  persona_id: 'persona-1',
  nombre_completo: 'MARIA LOPEZ RUIZ',
  vinculacion: 'Planta',
  vinculacion_codigo: 'PL',
  categoria: 'Asociado',
  territorial: 'Antioquia',
  estado: 'ACTIVO',
  puntaje_salarial: 145.5,
  ultima_evaluacion: 'Sobresaliente 2025-2',
  canal_origen: 'MASIVO',
  id_rund: 'RUND-001',
  periodo_carga: '2026-1',
};

describe('REQ-RUND-F002 — cabezote del perfil docente', () => {
  it('entrega los siete campos del cabezote y lo marca de solo lectura', () => {
    const cabezote = buildRundPerfilCabezote(filaListado);

    expect(cabezote).toMatchObject({
      nombre_completo: 'MARIA LOPEZ RUIZ',
      tipo_vinculacion: 'Planta',
      categoria: 'Asociado',
      territorial: 'Antioquia',
      estado_vinculacion: 'ACTIVO',
      puntaje_salarial: 145.5,
      ultima_evaluacion: 'Sobresaliente 2025-2',
      solo_lectura: true,
    });
    expect(cabezote.campos).toEqual(RUND_CABEZOTE_CAMPOS);
    expect(RUND_CABEZOTE_CAMPOS).toHaveLength(7);
  });

  it('no expone la cedula ni ningun campo editable del perfil', () => {
    const cabezote: any = buildRundPerfilCabezote({
      ...filaListado,
      documento_identidad: '1020304050',
      telefono: '3001234567',
      correo_personal: 'personal@correo.com',
    });

    expect(cabezote.documento_identidad).toBeUndefined();
    expect(cabezote.telefono).toBeUndefined();
    expect(cabezote.correo_personal).toBeUndefined();
    expect(Object.keys(cabezote)).not.toContain('editable');
  });

  it('acepta camelCase y las proyecciones alternas del perfil', () => {
    const cabezote = buildRundPerfilCabezote({
      docenteId: 'docente-9',
      personaId: 'persona-9',
      primer_nombre: 'JUAN',
      primer_apellido: 'PEREZ',
      tipoVinculacion: 'Hora catedra',
      escalafon: 'Auxiliar',
      territorialNombre: 'Valle',
      estadoVinculacion: 'ACTIVO',
      puntajeSalarial: '210,75',
      ultimaEvaluacion: '2024-1',
      canalOrigen: 'MODAL',
      idRund: 'RUND-009',
      periodoCarga: '2025-2',
    });

    expect(cabezote).toMatchObject({
      docente_id: 'docente-9',
      nombre_completo: 'JUAN PEREZ',
      tipo_vinculacion: 'Hora catedra',
      categoria: 'Auxiliar',
      territorial: 'Valle',
      puntaje_salarial: 210.75,
      ultima_evaluacion_origen: 'REGISTRO_MANUAL_RUND',
      id_rund: 'RUND-009',
    });
  });

  it('descarta marcadores vacios en lugar de mostrarlos como dato', () => {
    const cabezote = buildRundPerfilCabezote({
      ...filaListado,
      categoria: 'N/A',
      territorial: '   ',
      ultima_evaluacion: '--',
    });

    expect(cabezote.categoria).toBeNull();
    expect(cabezote.territorial).toBeNull();
    expect(cabezote.ultima_evaluacion).toBeNull();
    expect(cabezote.ultima_evaluacion_origen).toBe('SIN_REGISTRO');
  });

  describe('estado de vinculacion', () => {
    it('agrupa los estados de retiro como INACTIVO y conserva el detalle', () => {
      ['INACTIVO', 'Retirado', 'RETIRADO_DOCENTE', 'Terminado', 'Desvinculado'].forEach((estado) => {
        expect(normalizarEstadoVinculacion({ estado })).toEqual({ codigo: 'INACTIVO', detalle: estado });
      });
    });

    it('trata cualquier otro estado registrado como ACTIVO', () => {
      expect(normalizarEstadoVinculacion({ estado: 'ACTIVO' }).codigo).toBe('ACTIVO');
      expect(normalizarEstadoVinculacion({ estado: 'En tramite' }).codigo).toBe('ACTIVO');
    });

    it('usa el indicador de usuario cuando el perfil no trae estado', () => {
      expect(normalizarEstadoVinculacion({ activo: false }).codigo).toBe('INACTIVO');
      expect(normalizarEstadoVinculacion({ activo_efectivo: true }).codigo).toBe('ACTIVO');
      expect(normalizarEstadoVinculacion({}).codigo).toBe('ACTIVO');
    });
  });

  describe('EFDS-1898 — origen de ultima evaluacion', () => {
    it('traza el canal RUND que registro el valor', () => {
      const casos: Array<[string, string]> = [
        ['MASIVO', 'CARGA_MASIVA_RUND'],
        ['MODAL', 'REGISTRO_MANUAL_RUND'],
        ['API', 'INTEROPERABILIDAD'],
        ['AUTOGESTION', 'AUTOGESTION_DOCENTE'],
      ];
      casos.forEach(([canal, origen]) => {
        expect(resolverUltimaEvaluacion({ ultima_evaluacion: '2025-1', canal_origen: canal }).origen).toBe(origen);
      });
    });

    it('no afirma procedencia cuando el dato no existe', () => {
      expect(resolverUltimaEvaluacion({ canal_origen: 'MASIVO' })).toEqual({ valor: null, origen: 'SIN_REGISTRO' });
    });

    it('cae en REGISTRO_RUND si el canal es desconocido o falta', () => {
      expect(resolverUltimaEvaluacion({ ultima_evaluacion: '2025-1' }).origen).toBe('REGISTRO_RUND');
      expect(resolverUltimaEvaluacion({ ultima_evaluacion: '2025-1', canal_origen: 'OTRO' }).origen).toBe('REGISTRO_RUND');
    });
  });

  describe('EFDS-1900 — RBAC del puntaje salarial', () => {
    it('anula el puntaje del cabezote para un rol sin acceso completo', () => {
      const protegido: any = protectRundSensitiveData(buildRundPerfilCabezote(filaListado), false);

      expect(protegido.puntaje_salarial).toBeNull();
      expect(protegido.proteccion_datos.acceso_completo).toBe(false);
      expect(protegido.proteccion_datos.campos_enmascarados).toContain('PUNTAJE_SALARIAL');
    });

    it('conserva los demas campos del cabezote al enmascarar', () => {
      const protegido: any = protectRundSensitiveData(buildRundPerfilCabezote(filaListado), false);

      expect(protegido).toMatchObject({
        nombre_completo: 'MARIA LOPEZ RUIZ',
        tipo_vinculacion: 'Planta',
        categoria: 'Asociado',
        territorial: 'Antioquia',
        estado_vinculacion: 'ACTIVO',
        ultima_evaluacion: 'Sobresaliente 2025-2',
        solo_lectura: true,
      });
    });

    it('entrega el puntaje completo a GGP y SUPER_ADMIN', () => {
      const protegido: any = protectRundSensitiveData(buildRundPerfilCabezote(filaListado), true);

      expect(protegido.puntaje_salarial).toBe(145.5);
      expect(protegido.proteccion_datos.acceso_completo).toBe(true);
      expect(protegido.proteccion_datos.campos_enmascarados).toEqual([]);
    });

    it('no deriva ningun texto del puntaje que pueda sobrevivir al enmascaramiento', () => {
      const protegido = protectRundSensitiveData(buildRundPerfilCabezote(filaListado), false);

      expect(JSON.stringify(protegido)).not.toContain('145.5');
      expect(JSON.stringify(protegido)).not.toContain('145,5');
    });
  });

  it('no falla cuando el perfil llega vacio o nulo', () => {
    expect(buildRundPerfilCabezote(null)).toMatchObject({
      nombre_completo: 'Docente sin nombre registrado',
      tipo_vinculacion: null,
      categoria: null,
      territorial: null,
      estado_vinculacion: 'ACTIVO',
      puntaje_salarial: null,
      ultima_evaluacion: null,
      ultima_evaluacion_origen: 'SIN_REGISTRO',
      solo_lectura: true,
    });
  });

  it('no presenta un identificador territorial huérfano como nombre', () => {
    expect(buildRundPerfilCabezote({ territorialId: '24' })).toMatchObject({
      territorial: null, territorial_pendiente_validacion: true,
    });
    expect(buildRundPerfilCabezote({ territorial: 'Antioquia', territorial_id: '32' })).toMatchObject({
      territorial: 'Antioquia', territorial_pendiente_validacion: false,
    });
    expect(buildRundPerfilCabezote({}).territorial_pendiente_validacion).toBe(false);
  });

  it('no convierte un puntaje vacío en cero y conserva el cero registrado', () => {
    expect(buildRundPerfilCabezote({ puntaje_salarial: '  ' }).puntaje_salarial).toBeNull();
    expect(buildRundPerfilCabezote({ puntaje_salarial: 0 }).puntaje_salarial).toBe(0);
  });
});
