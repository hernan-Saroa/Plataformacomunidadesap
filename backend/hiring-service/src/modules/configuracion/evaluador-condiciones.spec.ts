import { ReglaActividad } from '../../entities/regla-actividad.entity';
import {
  cumpleCondicion,
  descripcion,
  proyectarFormulario,
  reglaAplica,
} from './evaluador-condiciones';

const regla = (parcial: Partial<ReglaActividad>): ReglaActividad =>
  ({
    id: 'r1',
    numeral: '3.1',
    modalidad: null,
    tipo: 'CAMPO_OBLIGATORIO',
    config: {},
    mensaje: null,
    orden: 100,
    conector: 'AND',
    condiciones: [],
    acciones: [],
    vigenteDesde: new Date(),
    vigenteHasta: null,
    ...parcial,
  }) as ReglaActividad;

describe('cumpleCondicion', () => {
  const contexto = {
    datos: { valor_estimado: 60_000_000, objeto: 'Compra de equipos', vacio: '   ' },
    modalidad: 'CONTRATACION_DIRECTA',
  };

  it('lee la modalidad del proceso, no de los datos del formulario', () => {
    // Es la condición más usada y la única que no sale del formulario.
    expect(
      cumpleCondicion(
        { campo: 'modalidad', operador: 'ES', valor: 'CONTRATACION_DIRECTA' },
        contexto,
      ),
    ).toBe(true);
  });

  it('compara números por valor y no por texto', () => {
    expect(
      cumpleCondicion({ campo: 'valor_estimado', operador: 'MAYOR_QUE', valor: 50_000_000 }, contexto),
    ).toBe(true);
    expect(
      cumpleCondicion({ campo: 'valor_estimado', operador: 'MENOR_QUE', valor: 50_000_000 }, contexto),
    ).toBe(false);
  });

  it('no da por cumplida una comparación numérica cuando falta el dato', () => {
    // Number(undefined) no es mayor ni menor que nada: sin este corte, una
    // regla de umbral se dispararía sobre un formulario vacío.
    const vacio = { datos: {}, modalidad: 'MINIMA_CUANTIA' };
    expect(cumpleCondicion({ campo: 'valor_estimado', operador: 'MAYOR_QUE', valor: 1 }, vacio)).toBe(
      false,
    );
    expect(cumpleCondicion({ campo: 'valor_estimado', operador: 'MENOR_QUE', valor: 1 }, vacio)).toBe(
      false,
    );
  });

  it('trata los espacios en blanco como vacío', () => {
    expect(cumpleCondicion({ campo: 'vacio', operador: 'ESTA_VACIO' }, contexto)).toBe(true);
    expect(cumpleCondicion({ campo: 'vacio', operador: 'TIENE_VALOR' }, contexto)).toBe(false);
  });

  it('ignora un operador que no conoce en vez de darlo por cumplido', () => {
    expect(
      cumpleCondicion({ campo: 'objeto', operador: 'INVENTADO' as any, valor: 'x' }, contexto),
    ).toBe(false);
  });
});

describe('reglaAplica', () => {
  const contexto = { datos: { valor_estimado: 60_000_000 }, modalidad: 'CONTRATACION_DIRECTA' };

  it('sin condiciones aplica siempre', () => {
    // Es como se comportaban todas las reglas antes de que existiera el campo.
    expect(reglaAplica(regla({}), contexto)).toBe(true);
  });

  it('con AND exige que se cumplan todas', () => {
    const r = regla({
      conector: 'AND',
      condiciones: [
        { campo: 'modalidad', operador: 'ES', valor: 'CONTRATACION_DIRECTA' },
        { campo: 'valor_estimado', operador: 'MAYOR_QUE', valor: 50_000_000 },
      ],
    });
    expect(reglaAplica(r, contexto)).toBe(true);

    r.condiciones[1].valor = 100_000_000;
    expect(reglaAplica(r, contexto)).toBe(false);
  });

  it('con OR basta una', () => {
    const r = regla({
      conector: 'OR',
      condiciones: [
        { campo: 'modalidad', operador: 'ES', valor: 'MINIMA_CUANTIA' },
        { campo: 'valor_estimado', operador: 'MAYOR_QUE', valor: 50_000_000 },
      ],
    });
    expect(reglaAplica(r, contexto)).toBe(true);
  });
});

describe('proyectarFormulario', () => {
  const campos = ['objeto', 'justificacion', 'valor_estimado'];
  const contexto = { datos: { valor_estimado: 60_000_000 }, modalidad: 'CONTRATACION_DIRECTA' };

  it('los campos arrancan visibles y no obligatorios', () => {
    const estado = proyectarFormulario([], campos, contexto);
    expect(estado.objeto).toEqual({ visible: true, obligatorio: false, porque: [] });
  });

  it('muestra y exige un campo cuando la condición se cumple', () => {
    const r = regla({
      condiciones: [{ campo: 'modalidad', operador: 'ES', valor: 'CONTRATACION_DIRECTA' }],
      acciones: [{ accion: 'EXIGIR_CAMPO', objetivo: 'justificacion' }],
      mensaje: 'La contratación directa exige justificación',
    });

    const estado = proyectarFormulario([r], campos, contexto);
    expect(estado.justificacion.obligatorio).toBe(true);
    expect(estado.justificacion.porque).toContain('La contratación directa exige justificación');
  });

  it('no exige nada cuando la condición no se cumple', () => {
    const r = regla({
      condiciones: [{ campo: 'modalidad', operador: 'ES', valor: 'LICITACION_PUBLICA' }],
      acciones: [{ accion: 'EXIGIR_CAMPO', objetivo: 'justificacion' }],
    });

    const estado = proyectarFormulario([r], campos, contexto);
    expect(estado.justificacion.obligatorio).toBe(false);
  });

  it('exigir un campo lo hace visible: uno oculto sería imposible de llenar', () => {
    const ocultar = regla({
      id: 'r1',
      acciones: [{ accion: 'OCULTAR_CAMPO', objetivo: 'justificacion' }],
    });
    const exigir = regla({
      id: 'r2',
      acciones: [{ accion: 'EXIGIR_CAMPO', objetivo: 'justificacion' }],
    });

    const estado = proyectarFormulario([ocultar, exigir], campos, contexto);
    expect(estado.justificacion).toMatchObject({ visible: true, obligatorio: true });
  });

  it('ocultar un campo lo libera de ser obligatorio', () => {
    // Si no, el formulario no se podría enviar por un campo que nadie ve.
    const exigir = regla({
      id: 'r1',
      acciones: [{ accion: 'EXIGIR_CAMPO', objetivo: 'justificacion' }],
    });
    const ocultar = regla({
      id: 'r2',
      acciones: [{ accion: 'OCULTAR_CAMPO', objetivo: 'justificacion' }],
    });

    const estado = proyectarFormulario([exigir, ocultar], campos, contexto);
    expect(estado.justificacion).toMatchObject({ visible: false, obligatorio: false });
  });

  it('honra las reglas del modelo anterior, que no tienen acciones', () => {
    // Las once reglas vigentes son de esa forma: si se ignoraran, la vista
    // previa mostraría un formulario sin ninguna obligación.
    const vieja = regla({ tipo: 'CAMPO_OBLIGATORIO', config: { codigo: 'objeto' } });

    const estado = proyectarFormulario([vieja], campos, contexto);
    expect(estado.objeto.obligatorio).toBe(true);
  });

  it('ignora acciones que apuntan a un campo inexistente', () => {
    const r = regla({ acciones: [{ accion: 'EXIGIR_CAMPO', objetivo: 'no_existe' }] });

    expect(() => proyectarFormulario([r], campos, contexto)).not.toThrow();
  });
});

describe('descripcion', () => {
  it('traduce la regla a una frase legible', () => {
    const r = regla({
      condiciones: [
        { campo: 'modalidad', operador: 'ES', valor: 'CONTRATACION_DIRECTA' },
        { campo: 'valor_estimado', operador: 'MAYOR_QUE', valor: 50_000_000 },
      ],
      acciones: [
        { accion: 'MOSTRAR_CAMPO', objetivo: 'justificacion' },
        { accion: 'EXIGIR_CAMPO', objetivo: 'justificacion' },
      ],
    });

    expect(descripcion(r)).toBe(
      'Si la modalidad es CONTRATACION_DIRECTA y valor_estimado supera 50000000, ' +
        'muestra justificacion y exige justificacion',
    );
  });

  it('sin condiciones describe solo lo que hace', () => {
    const r = regla({ acciones: [{ accion: 'EXIGIR_CAMPO', objetivo: 'objeto' }] });
    expect(descripcion(r)).toBe('exige objeto');
  });
});
