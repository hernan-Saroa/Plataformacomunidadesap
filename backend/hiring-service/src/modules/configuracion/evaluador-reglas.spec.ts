import { evaluarReglas, reglasAplicables, ContextoEvaluacion } from './evaluador-reglas';
import { ReglaActividad } from '../../entities/regla-actividad.entity';
import { CampoFormulario } from '../../entities/campo-formulario.entity';

const campo = (codigo: string, etiqueta: string, tipo = 'texto'): CampoFormulario =>
  ({ codigo, etiqueta, tipo, grupo: 'Prueba', obligatorio: true, activo: true } as CampoFormulario);

const regla = (p: Partial<ReglaActividad>): ReglaActividad =>
  ({
    id: 'r1',
    numeral: '3.1',
    modalidad: null,
    config: {},
    mensaje: null,
    orden: 100,
    vigenteDesde: new Date('2020-01-01'),
    vigenteHasta: null,
    ...p,
  }) as ReglaActividad;

const contexto = (p: Partial<ContextoEvaluacion> = {}): ContextoEvaluacion => ({
  datos: {},
  documentos: [],
  campos: [],
  ...p,
});

/**
 * El motor decide si una actividad puede darse por terminada. Un falso
 * negativo bloquea a un gestor que ya cumplió; un falso positivo deja avanzar
 * un proceso incompleto, que es peor porque solo se descubre en auditoría.
 */
describe('evaluarReglas', () => {
  describe('CAMPO_OBLIGATORIO', () => {
    it('reporta el campo vacío con su etiqueta', () => {
      // La etiqueta es lo que el gestor ve: un código como "objeto_contratar"
      // no le dice dónde tiene que escribir.
      const r = [regla({ tipo: 'CAMPO_OBLIGATORIO', config: { codigo: 'objeto' } })];
      const c = contexto({ campos: [campo('objeto', 'Objeto a contratar')] });

      const fallos = evaluarReglas(r, c);

      expect(fallos).toHaveLength(1);
      expect(fallos[0].codigo).toBe('objeto');
      expect(fallos[0].etiqueta).toBe('Objeto a contratar');
    });

    it('no reporta el campo diligenciado', () => {
      const r = [regla({ tipo: 'CAMPO_OBLIGATORIO', config: { codigo: 'objeto' } })];
      const c = contexto({
        campos: [campo('objeto', 'Objeto')],
        datos: { objeto: 'Adquisición de equipos' },
      });

      expect(evaluarReglas(r, c)).toHaveLength(0);
    });

    it('ignora la regla cuando el campo ya no existe', () => {
      // Al retirar un campo del formulario su regla queda huérfana. Tratarla
      // como incumplida bloquearía la actividad por algo que ninguna pantalla
      // pide.
      const r = [regla({ tipo: 'CAMPO_OBLIGATORIO', config: { codigo: 'retirado' } })];

      expect(evaluarReglas(r, contexto())).toHaveLength(0);
    });

    it('acepta el 0 como valor diligenciado', () => {
      // Un plazo de 0 días es un dato, no una ausencia.
      const r = [regla({ tipo: 'CAMPO_OBLIGATORIO', config: { codigo: 'plazo' } })];
      const c = contexto({
        campos: [campo('plazo', 'Plazo', 'numero')],
        datos: { plazo: 0 },
      });

      expect(evaluarReglas(r, c)).toHaveLength(0);
    });
  });

  describe('DOCUMENTO_REQUERIDO', () => {
    it('reporta cuando no hay adjuntos', () => {
      const r = [regla({ tipo: 'DOCUMENTO_REQUERIDO', config: { tipo: 'ADJUNTO', minimo: 1 } })];

      expect(evaluarReglas(r, contexto())).toHaveLength(1);
    });

    it('no reporta cuando el adjunto está', () => {
      const r = [regla({ tipo: 'DOCUMENTO_REQUERIDO', config: { tipo: 'ADJUNTO', minimo: 1 } })];
      const c = contexto({ documentos: [{ tipo: 'ADJUNTO', cantidad: 1 }] });

      expect(evaluarReglas(r, c)).toHaveLength(0);
    });

    it('no cuenta documentos de otro tipo', () => {
      // Un snapshot del formulario no sustituye al estudio previo firmado.
      const r = [regla({ tipo: 'DOCUMENTO_REQUERIDO', config: { tipo: 'ADJUNTO', minimo: 1 } })];
      const c = contexto({ documentos: [{ tipo: 'SNAPSHOT_FORMULARIO', cantidad: 3 }] });

      expect(evaluarReglas(r, c)).toHaveLength(1);
    });
  });

  describe('RANGO_VALOR', () => {
    const topeMinimaCuantia = regla({
      tipo: 'RANGO_VALOR',
      config: { codigo: 'valor', max: 172000000 },
      mensaje: 'Excede el tope de Mínima Cuantía',
    });

    it('reporta el valor sobre el tope', () => {
      const c = contexto({
        campos: [campo('valor', 'Valor estimado', 'moneda')],
        datos: { valor: 200000000 },
      });

      const fallos = evaluarReglas([topeMinimaCuantia], c);

      expect(fallos).toHaveLength(1);
      expect(fallos[0].mensaje).toBe('Excede el tope de Mínima Cuantía');
    });

    it('acepta el valor justo en el límite', () => {
      // El tope es inclusivo: un contrato por el monto exacto sigue siendo de
      // mínima cuantía.
      const c = contexto({
        campos: [campo('valor', 'Valor', 'moneda')],
        datos: { valor: 172000000 },
      });

      expect(evaluarReglas([topeMinimaCuantia], c)).toHaveLength(0);
    });

    it('no reporta el campo vacío', () => {
      // De eso se encarga CAMPO_OBLIGATORIO; reportarlo aquí también daría
      // dos mensajes por el mismo hueco.
      const c = contexto({ campos: [campo('valor', 'Valor', 'moneda')] });

      expect(evaluarReglas([topeMinimaCuantia], c)).toHaveLength(0);
    });
  });

  describe('REGLA_DERIVADA', () => {
    const causal = regla({
      tipo: 'REGLA_DERIVADA',
      config: {
        si_campo: 'modalidad',
        si_valor: ['Contratación Directa'],
        entonces_campo: 'causal',
      },
    });

    it('exige el campo cuando se cumple la condición', () => {
      const c = contexto({
        campos: [campo('causal', 'Causal normativa')],
        datos: { modalidad: 'Contratación Directa' },
      });

      expect(evaluarReglas([causal], c)).toHaveLength(1);
    });

    it('no lo exige cuando la condición no se cumple', () => {
      const c = contexto({
        campos: [campo('causal', 'Causal normativa')],
        datos: { modalidad: 'Licitación Pública' },
      });

      expect(evaluarReglas([causal], c)).toHaveLength(0);
    });
  });

  it('ignora un tipo de regla que no conoce', () => {
    // La base puede tener reglas más nuevas que el servicio desplegado.
    // Frenar el proceso por eso sería peor que ignorarlas.
    const r = [regla({ tipo: 'TIPO_FUTURO' as any })];

    expect(evaluarReglas(r, contexto())).toHaveLength(0);
  });

  it('devuelve los incumplimientos en el orden declarado', () => {
    // El orden importa: el gestor corrige de arriba abajo, y conviene que
    // siga el de la pantalla.
    const r = [
      regla({ tipo: 'CAMPO_OBLIGATORIO', config: { codigo: 'b' }, orden: 20 }),
      regla({ tipo: 'CAMPO_OBLIGATORIO', config: { codigo: 'a' }, orden: 10 }),
    ];
    const c = contexto({ campos: [campo('a', 'Primero'), campo('b', 'Segundo')] });

    expect(evaluarReglas(r, c).map((f) => f.codigo)).toEqual(['a', 'b']);
  });
});

/**
 * Una regla derogada no se borra: un proceso aprobado bajo ella debe poder
 * auditarse con las reglas vigentes entonces, no con las de hoy.
 */
describe('reglasAplicables', () => {
  it('incluye las reglas generales', () => {
    const r = [regla({ modalidad: null })];

    expect(reglasAplicables(r, 'MINIMA_CUANTIA')).toHaveLength(1);
  });

  it('incluye las de la modalidad pedida', () => {
    const r = [regla({ modalidad: 'MINIMA_CUANTIA' })];

    expect(reglasAplicables(r, 'MINIMA_CUANTIA')).toHaveLength(1);
  });

  it('excluye las de otra modalidad', () => {
    const r = [regla({ modalidad: 'LICITACION_PUBLICA' })];

    expect(reglasAplicables(r, 'MINIMA_CUANTIA')).toHaveLength(0);
  });

  it('excluye las que aún no entran en vigencia', () => {
    const r = [regla({ vigenteDesde: new Date('2030-01-01') })];

    expect(reglasAplicables(r, null, new Date('2026-01-01'))).toHaveLength(0);
  });

  it('excluye las derogadas', () => {
    const r = [regla({ vigenteHasta: new Date('2025-01-01') })];

    expect(reglasAplicables(r, null, new Date('2026-01-01'))).toHaveLength(0);
  });

  it('conserva la regla vigente en la fecha consultada, aunque hoy esté derogada', () => {
    // Es lo que permite auditar una aprobación pasada con sus propias reglas.
    const r = [
      regla({ vigenteDesde: new Date('2024-01-01'), vigenteHasta: new Date('2025-06-01') }),
    ];

    expect(reglasAplicables(r, null, new Date('2024-06-01'))).toHaveLength(1);
  });
});
