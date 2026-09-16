import { describe, expect, it } from 'vitest';
import {
  buildCabezotePerfilDocente,
  CABEZOTE_RESTRINGIDO,
  CABEZOTE_SIN_DATO,
  type CabezoteCampoClave,
} from './rundPerfilCabezote';

const PERFIL_GGP = {
  docente_id: 'docente-1',
  nombre_completo: 'MARIA LOPEZ RUIZ',
  vinculacion: 'Planta',
  categoria: 'Asociado',
  territorial: 'Antioquia',
  estado: 'ACTIVO',
  puntaje_salarial: 145.5,
  ultima_evaluacion: 'Sobresaliente 2025-2',
  canal_origen: 'MASIVO',
  id_rund: 'RUND-001',
  periodo_carga: '2026-1',
  proteccion_datos: { acceso_completo: true, campos_sensibles: ['PUNTAJE_SALARIAL'], campos_enmascarados: [] },
};

const PERFIL_RESTRINGIDO = {
  ...PERFIL_GGP,
  puntaje_salarial: null,
  proteccion_datos: {
    acceso_completo: false,
    campos_sensibles: ['PUNTAJE_SALARIAL'],
    campos_enmascarados: ['PUNTAJE_SALARIAL'],
  },
};

function valorDe(perfil: any, clave: CabezoteCampoClave): string {
  const campo = buildCabezotePerfilDocente(perfil).campos.find((c) => c.clave === clave);
  return campo?.valor ?? '';
}

describe('REQ-RUND-F002 — modelo de vista del cabezote', () => {
  it('expone los seis campos de vinculacion en orden, siempre de solo lectura', () => {
    const cabezote = buildCabezotePerfilDocente(PERFIL_GGP);

    expect(cabezote.campos.map((campo) => campo.clave)).toEqual([
      'TIPO_VINCULACION',
      'CATEGORIA_ESCALAFON',
      'TERRITORIAL',
      'ESTADO_VINCULACION',
      'PUNTAJE_SALARIAL',
      'ULTIMA_EVALUACION',
    ]);
    expect(cabezote.soloLectura).toBe(true);
    expect(cabezote.nombreCompleto).toBe('MARIA LOPEZ RUIZ');
    expect(cabezote.iniciales).toBe('ML');
  });

  it('resuelve los valores de vinculacion, categoria, territorial y estado', () => {
    const cabezote = buildCabezotePerfilDocente(PERFIL_GGP);

    expect(valorDe(PERFIL_GGP, 'TIPO_VINCULACION')).toBe('Planta');
    expect(valorDe(PERFIL_GGP, 'CATEGORIA_ESCALAFON')).toBe('Asociado');
    expect(valorDe(PERFIL_GGP, 'TERRITORIAL')).toBe('Antioquia');
    expect(cabezote.estado).toEqual({ codigo: 'ACTIVO', activo: true, etiqueta: 'Activo' });
    expect(cabezote.idRund).toBe('RUND-001');
    expect(cabezote.periodoCarga).toBe('2026-1');
  });

  it('marca como inactivos los estados de retiro', () => {
    ['INACTIVO', 'Retirado', 'RETIRADO_DOCENTE', 'Terminado', 'Desvinculado'].forEach((estado) => {
      const cabezote = buildCabezotePerfilDocente({ ...PERFIL_GGP, estado });
      expect(cabezote.estado.codigo).toBe('INACTIVO');
      expect(cabezote.estado.etiqueta).toBe('Inactivo');
    });
    expect(buildCabezotePerfilDocente({ ...PERFIL_GGP, estado: null, activo: false }).estado.activo).toBe(false);
  });

  describe('EFDS-1900 — puntaje salarial', () => {
    it.each([undefined, {}, { acceso_completo: 'true' }, { acceso_completo: 1 }])('oculta el puntaje sin autorización booleana explícita: %j', (proteccion_datos) => {
      expect(valorDe({ ...PERFIL_GGP, proteccion_datos }, 'PUNTAJE_SALARIAL')).toBe(CABEZOTE_RESTRINGIDO);
    });

    it('conserva un puntaje cero y no convierte espacios en cero', () => {
      expect(valorDe({ ...PERFIL_GGP, puntaje_salarial: 0 }, 'PUNTAJE_SALARIAL')).toBe('0');
      expect(valorDe({ ...PERFIL_GGP, puntaje_salarial: '  ' }, 'PUNTAJE_SALARIAL')).toBe(CABEZOTE_SIN_DATO);
    });
    it('formatea el puntaje en notacion colombiana para un rol autorizado', () => {
      expect(valorDe(PERFIL_GGP, 'PUNTAJE_SALARIAL')).toBe('145,5');
      expect(buildCabezotePerfilDocente(PERFIL_GGP).puntajeRestringido).toBe(false);
    });

    it('muestra el aviso de restriccion para un rol sin acceso completo', () => {
      expect(valorDe(PERFIL_RESTRINGIDO, 'PUNTAJE_SALARIAL')).toBe(CABEZOTE_RESTRINGIDO);
      expect(buildCabezotePerfilDocente(PERFIL_RESTRINGIDO).puntajeRestringido).toBe(true);
    });

    it('distingue un perfil sin puntaje de un perfil restringido', () => {
      const sinPuntaje = { ...PERFIL_GGP, puntaje_salarial: null };
      expect(valorDe(sinPuntaje, 'PUNTAJE_SALARIAL')).toBe(CABEZOTE_SIN_DATO);
      expect(buildCabezotePerfilDocente(sinPuntaje).puntajeRestringido).toBe(false);
    });

    it('no reconstruye el puntaje desde alias cuando el rol esta restringido', () => {
      const conAlias = { ...PERFIL_RESTRINGIDO, puntajeSalarial: 145.5 };
      expect(valorDe(conAlias, 'PUNTAJE_SALARIAL')).toBe(CABEZOTE_RESTRINGIDO);
    });
  });

  describe('EFDS-1898 — ultima evaluacion y su origen', () => {
    it('acompana el valor con el canal RUND que lo registro', () => {
      const campo = buildCabezotePerfilDocente(PERFIL_GGP).campos.find((c) => c.clave === 'ULTIMA_EVALUACION');
      expect(campo?.valor).toBe('Sobresaliente 2025-2');
      expect(campo?.nota).toBe('Origen: carga masiva RUND');
    });

    it('prefiere el origen declarado por el backend sobre el canal del perfil', () => {
      const campo = buildCabezotePerfilDocente({
        ...PERFIL_GGP,
        canal_origen: 'MASIVO',
        ultima_evaluacion_origen: 'INTEROPERABILIDAD',
      }).campos.find((c) => c.clave === 'ULTIMA_EVALUACION');
      expect(campo?.nota).toBe('Origen: interoperabilidad');
    });

    it('anuncia que el dato depende del modulo de evaluacion cuando no existe', () => {
      const campo = buildCabezotePerfilDocente({ ...PERFIL_GGP, ultima_evaluacion: null })
        .campos.find((c) => c.clave === 'ULTIMA_EVALUACION');
      expect(campo?.valor).toBe('Sin evaluación registrada');
      expect(campo?.nota).toBe('Pendiente del módulo de evaluación docente');
      expect(campo?.ausente).toBe(true);
    });
  });

  it('acepta la proyeccion camelCase de autogestion', () => {
    const cabezote = buildCabezotePerfilDocente({
      primer_nombre: 'JUAN',
      primer_apellido: 'PEREZ',
      tipoVinculacion: 'Hora cátedra',
      escalafon: 'Auxiliar',
      territorialNombre: 'Valle',
      estadoVinculacion: 'ACTIVO',
      ultimaEvaluacion: '2024-1',
      canalOrigen: 'AUTOGESTION',
      idRund: 'RUND-009',
      periodoCarga: '2025-2',
      proteccion_datos: { acceso_completo: false },
    });

    expect(cabezote.nombreCompleto).toBe('JUAN PEREZ');
    expect(cabezote.campos.find((c) => c.clave === 'TIPO_VINCULACION')?.valor).toBe('Hora cátedra');
    expect(cabezote.campos.find((c) => c.clave === 'CATEGORIA_ESCALAFON')?.valor).toBe('Auxiliar');
    expect(cabezote.campos.find((c) => c.clave === 'TERRITORIAL')?.valor).toBe('Valle');
    expect(cabezote.campos.find((c) => c.clave === 'ULTIMA_EVALUACION')?.nota)
      .toBe('Origen: autogestión del docente');
  });

  it('atenua los campos sin dato en lugar de mostrar marcadores vacios', () => {
    const cabezote = buildCabezotePerfilDocente({
      ...PERFIL_GGP,
      vinculacion: 'N/A',
      categoria: '   ',
      territorial: '--',
    });

    ['TIPO_VINCULACION', 'CATEGORIA_ESCALAFON', 'TERRITORIAL'].forEach((clave) => {
      const campo = cabezote.campos.find((c) => c.clave === clave);
      expect(campo?.valor).toBe(CABEZOTE_SIN_DATO);
      expect(campo?.ausente).toBe(true);
    });
  });

  it('no se cae con un perfil vacio o nulo', () => {
    const cabezote = buildCabezotePerfilDocente(null);
    expect(cabezote.nombreCompleto).toBe('Docente sin nombre registrado');
    expect(cabezote.iniciales).toBe('D');
    expect(cabezote.campos).toHaveLength(6);
  });

  it('distingue una territorial pendiente de validar de una no registrada', () => {
    const perfil = { ...PERFIL_GGP, territorial: null, territorial_pendiente_validacion: true };
    expect(valorDe(perfil, 'TERRITORIAL')).toBe('Pendiente de validar');
    expect(valorDe({ ...perfil, territorial_pendiente_validacion: false }, 'TERRITORIAL')).toBe(CABEZOTE_SIN_DATO);
  });
});
