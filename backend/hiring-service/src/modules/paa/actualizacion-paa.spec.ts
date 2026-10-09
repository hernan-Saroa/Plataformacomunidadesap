import { MOTIVO_EDITADO_A_MANO, MOTIVO_ESTUDIO_CERRADO, iguales, planDeActualizacion } from './actualizacion-paa';

const ORIGEN = {
  objeto: 'Soporte',
  modalidad: 'CONTRATACION_DIRECTA',
  valorEstimado: 1000,
  objeto_contratar: 'Soporte',
  linea_paa: 'LINEA 1',
  plazo_ejecucion_dias: 360,
  lugar_ejecucion: 'Bogotá',
  responsable_area: 'Ana',
};

function actual(cambios: { estudio?: Record<string, unknown>; proceso?: object; estado?: any; nuevo?: object } = {}) {
  return {
    origenAnterior: ORIGEN,
    origenNuevo: { ...ORIGEN, ...cambios.nuevo },
    proceso: { objeto: 'Soporte', modalidad: 'CONTRATACION_DIRECTA', valorEstimado: 1000, ...cambios.proceso },
    estudio: {
      objeto_contratar: 'Soporte',
      linea_paa: 'LINEA 1',
      plazo_ejecucion_dias: 360,
      lugar_ejecucion: 'Bogotá',
      responsable_area: 'Ana',
      tipologia_contractual: 'Prestación de servicios',
      ...cambios.estudio,
    },
    estadoEstudio: cambios.estado === undefined ? 'BORRADOR' : cambios.estado,
  };
}

describe('planDeActualizacion', () => {
  it('sin cambios en lo que usa el proceso, no hace nada', () => {
    const plan = planDeActualizacion(actual());
    expect(plan.campos).toEqual([]);
    expect(plan.proceso).toEqual({});
    expect(plan.estudio).toEqual({});
  });

  it('aplica lo que sigue valiendo lo que puso el PAA', () => {
    const plan = planDeActualizacion(actual({ nuevo: { valorEstimado: 2000, plazo_ejecucion_dias: 180 } }));

    expect(plan.proceso).toEqual({ valorEstimado: 2000 });
    expect(plan.estudio).toEqual({ plazo_ejecucion_dias: 180 });
    expect(plan.origen).toMatchObject({ valorEstimado: 2000, plazo_ejecucion_dias: 180 });
    expect(plan.campos.every((c) => c.aplicado)).toBe(true);
  });

  it('respeta lo que el área corrigió a mano', () => {
    const plan = planDeActualizacion(
      actual({ nuevo: { lugar_ejecucion: 'Quibdó' }, estudio: { lugar_ejecucion: 'Medellín' } }),
    );
    expect(plan.estudio).toEqual({});
    expect(plan.campos).toEqual([
      expect.objectContaining({ campo: 'lugar_ejecucion', aplicado: false, motivo: MOTIVO_EDITADO_A_MANO }),
    ]);
  });

  it('no toca un estudio previo que ya está en revisión, y conserva su origen', () => {
    const plan = planDeActualizacion(actual({ nuevo: { objeto: 'Otro', objeto_contratar: 'Otro' }, estado: 'EN_REVISION' }));
    expect(plan.proceso).toEqual({});
    expect(plan.estudio).toEqual({});
    expect(plan.campos.map((c) => c.motivo)).toEqual([MOTIVO_ESTUDIO_CERRADO, MOTIVO_ESTUDIO_CERRADO]);
    // Si se devuelve, el objeto de la 3.1 sigue siendo el del PAA anterior y
    // la próxima versión lo podrá actualizar.
    expect(plan.origen.objeto).toBe('Soporte');
  });

  it('nunca toca lo que no controla el PAA', () => {
    const plan = planDeActualizacion(actual({ nuevo: { objeto_contratar: 'Otro' } }));
    expect(plan.estudio).not.toHaveProperty('tipologia_contractual');
  });

  it('compara números aunque uno llegue como texto', () => {
    expect(iguales('1000', 1000)).toBe(true);
    expect(iguales(null, '')).toBe(true);
    expect(iguales('Soporte ', 'Soporte')).toBe(true);
    expect(iguales(0, null)).toBe(false);
  });
});
