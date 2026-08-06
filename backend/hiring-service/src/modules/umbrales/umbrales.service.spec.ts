import { BadRequestException } from '@nestjs/common';


import {
  anioDeVigencia,
  convertirAPesos,
  formatoPesos,
  resolverModalidad,
  TramoResoluble,
  UmbralesService,
} from './umbrales.service';
import { Modalidad } from '../../entities/modalidad.entity';

/**
 * La conversión decide contra qué cifra se compara el valor estimado de un
 * proceso. Un error aquí no falla: solo hace que el sistema sugiera la
 * modalidad equivocada, que es exactamente lo que EFDS-1147 quiere evitar.
 */
describe('convertirAPesos', () => {
  const SMMLV_2026 = 1623500;

  describe('umbrales en SMMLV', () => {
    it('multiplica ambos límites por el salario del año', () => {
      const pesos = convertirAPesos(
        { limiteInferior: 100, limiteSuperior: 1000, unidad: 'SMMLV' },
        SMMLV_2026,
      );
      expect(pesos.inferior).toBe(162350000);
      expect(pesos.superior).toBe(1623500000);
    });

    it('conserva el null de "sin techo"', () => {
      // Licitación pública no tiene límite superior: por encima del piso, todo.
      const pesos = convertirAPesos(
        { limiteInferior: 1000, limiteSuperior: null, unidad: 'SMMLV' },
        SMMLV_2026,
      );
      expect(pesos.inferior).toBe(1623500000);
      expect(pesos.superior).toBeNull();
    });

    it('conserva el null de "sin piso"', () => {
      const pesos = convertirAPesos(
        { limiteInferior: null, limiteSuperior: 100, unidad: 'SMMLV' },
        SMMLV_2026,
      );
      expect(pesos.inferior).toBeNull();
      expect(pesos.superior).toBe(162350000);
    });

    it('trata el 0 como piso real y no como ausencia', () => {
      // Mínima cuantía arranca en 0. Si el 0 se confundiera con "sin piso",
      // el tramo seguiría funcionando, pero por accidente.
      const pesos = convertirAPesos(
        { limiteInferior: 0, limiteSuperior: 100, unidad: 'SMMLV' },
        SMMLV_2026,
      );
      expect(pesos.inferior).toBe(0);
    });

    it('rechaza convertir sin salario del año', () => {
      // Devolver el número de salarios como si fueran pesos daría un umbral
      // ~1.600.000 veces más bajo: todo proceso superaría el tope y todo se
      // volvería licitación pública, sin ningún error visible.
      const umbral = { limiteInferior: 1000, limiteSuperior: null, unidad: 'SMMLV' as const };
      expect(() => convertirAPesos(umbral, null)).toThrow(BadRequestException);
      expect(() => convertirAPesos(umbral, 0)).toThrow(BadRequestException);
      expect(() => convertirAPesos(umbral, Number.NaN)).toThrow(BadRequestException);
    });
  });

  describe('umbrales en PESOS', () => {
    it('devuelve los límites tal cual', () => {
      const pesos = convertirAPesos(
        { limiteInferior: 50000000, limiteSuperior: 200000000, unidad: 'PESOS' },
        SMMLV_2026,
      );
      expect(pesos.inferior).toBe(50000000);
      expect(pesos.superior).toBe(200000000);
    });

    it('no necesita el salario del año', () => {
      // Un umbral en pesos no depende del SMMLV: que falte no debe bloquearlo.
      expect(() =>
        convertirAPesos({ limiteInferior: 1, limiteSuperior: null, unidad: 'PESOS' }, null),
      ).not.toThrow();
    });
  });
});

/**
 * Un umbral abierto en 2025 y aún vigente en 2026 vale 1.000 SMMLV *de 2026*.
 * Si se leyera con el salario de su año de apertura, los umbrales quedarían
 * congelados y habría que recrearlos cada enero — justo lo que el modelo en
 * SMMLV existe para evitar.
 */
describe('anioDeVigencia', () => {
  it('usa el año en curso para un umbral abierto en años anteriores', () => {
    expect(anioDeVigencia('2025-01-01', new Date('2026-08-06T00:00:00Z'))).toBe(2026);
  });

  it('usa el año en curso para uno abierto este mismo año', () => {
    expect(anioDeVigencia('2026-03-15', new Date('2026-08-06T00:00:00Z'))).toBe(2026);
  });

  it('respeta el año de apertura de un umbral que aún no arranca', () => {
    // Programado para el año entrante: se lee con el salario de ese año.
    expect(anioDeVigencia('2027-01-01', new Date('2026-08-06T00:00:00Z'))).toBe(2027);
  });
});

/**
 * Primer criterio de aceptación de EFDS-1147. Los tramos son los del seed ya
 * convertidos a pesos con el SMMLV de 2026.
 */
describe('resolverModalidad', () => {
  const MINIMA = 162350000; // 100 SMMLV
  const LICITACION = 1623500000; // 1.000 SMMLV

  const TRAMOS: TramoResoluble[] = [
    { modalidad: 'MINIMA_CUANTIA', inferior: 0, superior: MINIMA },
    { modalidad: 'ABREVIADA_MENOR_CUANTIA', inferior: MINIMA, superior: LICITACION },
    { modalidad: 'LICITACION_PUBLICA', inferior: LICITACION, superior: null },
  ];

  describe('cada rango sugiere su modalidad', () => {
    it('cuantía baja → mínima cuantía', () => {
      expect(resolverModalidad(45000000, TRAMOS).modalidad).toBe('MINIMA_CUANTIA');
    });

    it('cuantía media → selección abreviada de menor cuantía', () => {
      expect(resolverModalidad(800000000, TRAMOS).modalidad).toBe('ABREVIADA_MENOR_CUANTIA');
    });

    it('cuantía alta → licitación pública', () => {
      expect(resolverModalidad(5000000000, TRAMOS).modalidad).toBe('LICITACION_PUBLICA');
    });
  });

  describe('el valor exactamente igual al umbral', () => {
    // El borde que más se equivoca. Los tramos son [inferior, superior): el
    // valor igual a la frontera pertenece al tramo de arriba, nunca a los dos.
    it('cae en el tramo superior, no en el inferior', () => {
      expect(resolverModalidad(MINIMA, TRAMOS).modalidad).toBe('ABREVIADA_MENOR_CUANTIA');
      expect(resolverModalidad(LICITACION, TRAMOS).modalidad).toBe('LICITACION_PUBLICA');
    });

    it('un peso menos se queda en el tramo inferior', () => {
      expect(resolverModalidad(MINIMA - 1, TRAMOS).modalidad).toBe('MINIMA_CUANTIA');
      expect(resolverModalidad(LICITACION - 1, TRAMOS).modalidad).toBe(
        'ABREVIADA_MENOR_CUANTIA',
      );
    });
  });

  describe('carácter vinculante', () => {
    it('marca como forzosa solo la licitación pública', () => {
      expect(resolverModalidad(LICITACION, TRAMOS).forzosa).toBe(true);
    });

    it('deja el resto como orientación', () => {
      // La sugerencia no ata: el gestor puede elegir otra modalidad.
      expect(resolverModalidad(45000000, TRAMOS).forzosa).toBe(false);
      expect(resolverModalidad(800000000, TRAMOS).forzosa).toBe(false);
    });
  });

  describe('valores que no permiten sugerir', () => {
    it('trata el 0 como cuantía válida, no como ausencia', () => {
      // Un proceso de valor 0 es raro, pero es un dato: cae en mínima cuantía.
      const r = resolverModalidad(0, TRAMOS);
      expect(r.modalidad).toBe('MINIMA_CUANTIA');
      expect(r.advertencia).toBeNull();
    });

    it('no sugiere nada sin valor estimado', () => {
      // Los procesos anteriores a EFDS-1323 no tienen cuantía registrada.
      for (const vacio of [null, undefined, Number.NaN]) {
        const r = resolverModalidad(vacio, TRAMOS);
        expect(r.modalidad).toBeNull();
        expect(r.forzosa).toBe(false);
        expect(r.advertencia).toContain('valor estimado');
      }
    });

    it('rechaza un valor negativo', () => {
      const r = resolverModalidad(-1, TRAMOS);
      expect(r.modalidad).toBeNull();
      expect(r.advertencia).toContain('negativo');
    });
  });

  describe('configuración incompleta o solapada', () => {
    it('avisa cuando ningún tramo cubre la cuantía', () => {
      // Hueco entre 100 y 1.000 SMMLV: sin el tramo intermedio no hay respuesta.
      const conHueco = TRAMOS.filter((t) => t.modalidad !== 'ABREVIADA_MENOR_CUANTIA');
      const r = resolverModalidad(800000000, conHueco);
      expect(r.modalidad).toBeNull();
      expect(r.advertencia).toContain('Ningún umbral');
    });

    it('elige la modalidad más exigente si hay solape y lo reporta', () => {
      // Equivocarse hacia más garantías es menos grave que hacia menos.
      const solapados: TramoResoluble[] = [
        { modalidad: 'MINIMA_CUANTIA', inferior: 0, superior: LICITACION },
        { modalidad: 'ABREVIADA_MENOR_CUANTIA', inferior: MINIMA, superior: LICITACION },
      ];
      const r = resolverModalidad(800000000, solapados);
      expect(r.modalidad).toBe('ABREVIADA_MENOR_CUANTIA');
      expect(r.advertencia).toContain('solapados');
    });

    it('no sugiere nada si no hay umbrales configurados', () => {
      expect(resolverModalidad(45000000, []).modalidad).toBeNull();
    });
  });

  it('devuelve el tramo que decidió, para poder explicar la sugerencia', () => {
    // Sin esto la interfaz solo podría decir "es mínima cuantía" sin el porqué.
    const r = resolverModalidad(45000000, TRAMOS);
    expect(r.tramo).toEqual({ modalidad: 'MINIMA_CUANTIA', inferior: 0, superior: MINIMA });
  });
});

/**
 * Segundo criterio de aceptación de EFDS-1147: superado el umbral, la
 * licitación pública es obligatoria y no se admite una modalidad de menor
 * cuantía. La validación vive en el backend porque es regla de negocio: quien
 * llame la API saltándose el formulario debe encontrarse el mismo rechazo.
 */
describe('exigirModalidadPermitida', () => {
  const LICITACION = 1623500000; // 1.000 SMMLV
  const SUPERA = 5000000000;
  const NO_SUPERA = 800000000;

  const modalidad = (codigo: string, determinadaPorCuantia = true): Modalidad =>
    ({ codigo, nombre: codigo, orden: 10, activa: true, determinadaPorCuantia }) as Modalidad;

  /** Service con `sugerir` sustituido: la resolución ya se prueba aparte. */
  const servicioCon = (forzosa: boolean) => {
    const service = new UmbralesService({} as any);
    jest.spyOn(service, 'sugerir').mockResolvedValue({
      modalidad: forzosa ? 'LICITACION_PUBLICA' : 'ABREVIADA_MENOR_CUANTIA',
      tramo: { modalidad: 'LICITACION_PUBLICA', inferior: LICITACION, superior: null },
      forzosa,
      advertencia: null,
    });
    return service;
  };

  it('rechaza una modalidad de menor cuantía cuando el valor supera el umbral', async () => {
    await expect(
      servicioCon(true).exigirModalidadPermitida(SUPERA, modalidad('MINIMA_CUANTIA')),
    ).rejects.toThrow(BadRequestException);
  });

  it('explica el motivo y cita el umbral aplicado', async () => {
    // Un "modalidad no permitida" a secas dejaría al gestor sin saber qué
    // corregir ni por qué.
    await expect(
      servicioCon(true).exigirModalidadPermitida(SUPERA, modalidad('MINIMA_CUANTIA')),
    ).rejects.toThrow(/supera el umbral de licitación pública/);

    try {
      await servicioCon(true).exigirModalidadPermitida(SUPERA, modalidad('MINIMA_CUANTIA'));
      fail('debió rechazar');
    } catch (e: any) {
      expect(e.message).toContain(formatoPesos(SUPERA));
      expect(e.message).toContain(formatoPesos(LICITACION));
    }
  });

  it('deja pasar la licitación pública, que no puede rechazarse a sí misma', async () => {
    await expect(
      servicioCon(true).exigirModalidadPermitida(SUPERA, modalidad('LICITACION_PUBLICA')),
    ).resolves.toBeUndefined();
  });

  it('no bloquea las modalidades que se eligen por causal', async () => {
    // Contratación directa, 092/2017 y enajenación proceden cualquiera sea el
    // monto: bloquearlas impediría contrataciones que la ley permite.
    for (const codigo of ['CONTRATACION_DIRECTA', 'REGIMEN_ESPECIAL_092', 'ENAJENACION_SUBASTA']) {
      await expect(
        servicioCon(true).exigirModalidadPermitida(SUPERA, modalidad(codigo, false)),
      ).resolves.toBeUndefined();
    }
  });

  it('no interviene cuando la cuantía no obliga a licitación', async () => {
    // Por debajo del umbral la sugerencia orienta pero no ata.
    await expect(
      servicioCon(false).exigirModalidadPermitida(NO_SUPERA, modalidad('MINIMA_CUANTIA')),
    ).resolves.toBeUndefined();
  });
});

describe('formatoPesos', () => {
  it('describe los valores ausentes en vez de imprimir NaN', () => {
    // El mensaje de error no puede salir con "$NaN" delante del usuario.
    expect(formatoPesos(null)).toBe('sin valor');
    expect(formatoPesos(undefined)).toBe('sin valor');
    expect(formatoPesos(Number.NaN)).toBe('sin valor');
  });
});
