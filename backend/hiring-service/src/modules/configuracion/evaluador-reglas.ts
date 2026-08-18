import { CampoFormulario, TipoCampo } from '../../entities/campo-formulario.entity';
import { ReglaActividad } from '../../entities/regla-actividad.entity';
import { esVacio } from '../estudio-previo/estudio-previo.service';

/** Lo que el motor necesita saber del proceso para decidir. */
export interface ContextoEvaluacion {
  /** Valores del formulario de la actividad. */
  datos: Record<string, any>;
  /** Cuántos documentos hay por tipo, para DOCUMENTO_REQUERIDO. */
  documentos: { tipo: string; cantidad: number }[];
  /** Definición de los campos, para saber el tipo y la etiqueta. */
  campos: CampoFormulario[];
  /** Cuándo se instanció la actividad, para PLAZO_MINIMO. */
  iniciadaEn?: Date;
  /** Momento de la evaluación; inyectable para que las pruebas sean estables. */
  ahora?: Date;
}

/** Una condición que no se cumple. */
export interface Incumplimiento {
  tipo: string;
  /** Código del campo cuando la regla apunta a uno; permite marcarlo en pantalla. */
  codigo?: string;
  etiqueta?: string;
  grupo?: string;
  mensaje: string;
}

/**
 * Evalúa las reglas de una actividad y devuelve lo que falta.
 *
 * Es una función pura: recibe reglas y contexto, devuelve incumplimientos. No
 * consulta la base ni lanza excepciones, para que el mismo motor sirva tanto
 * al enviar —donde el resultado bloquea— como al listar procesos, donde solo
 * se cuenta cuánto falta.
 */
export function evaluarReglas(
  reglas: ReglaActividad[],
  contexto: ContextoEvaluacion,
): Incumplimiento[] {
  const porCodigo = new Map(contexto.campos.map((c) => [c.codigo, c]));
  const incumplimientos: Incumplimiento[] = [];

  for (const regla of [...reglas].sort((a, b) => a.orden - b.orden)) {
    const fallo = evaluarUna(regla, contexto, porCodigo);
    if (fallo) incumplimientos.push(fallo);
  }

  return incumplimientos;
}

function evaluarUna(
  regla: ReglaActividad,
  contexto: ContextoEvaluacion,
  porCodigo: Map<string, CampoFormulario>,
): Incumplimiento | null {
  const cfg = regla.config ?? {};

  switch (regla.tipo) {
    case 'CAMPO_OBLIGATORIO': {
      const campo = porCodigo.get(cfg.codigo);
      // Una regla que apunta a un campo retirado deja de aplicar. Tratarla
      // como incumplida bloquearía la actividad por un campo que ya no se
      // pide en ninguna pantalla.
      if (!campo) return null;

      const tipo: TipoCampo = campo.tipo;
      if (!esVacio(tipo, contexto.datos?.[cfg.codigo])) return null;

      return {
        tipo: regla.tipo,
        codigo: campo.codigo,
        etiqueta: campo.etiqueta,
        grupo: campo.grupo ?? undefined,
        mensaje: regla.mensaje ?? `Falta diligenciar ${campo.etiqueta}`,
      };
    }

    case 'DOCUMENTO_REQUERIDO': {
      const minimo = Number(cfg.minimo ?? 1);
      const cargados = contexto.documentos
        .filter((d) => !cfg.tipo || d.tipo === cfg.tipo)
        .reduce((suma, d) => suma + d.cantidad, 0);
      if (cargados >= minimo) return null;

      return {
        tipo: regla.tipo,
        mensaje: regla.mensaje ?? 'Falta adjuntar el documento requerido',
      };
    }

    case 'RANGO_VALOR': {
      const valor = contexto.datos?.[cfg.codigo];
      // Que el campo esté vacío es asunto de CAMPO_OBLIGATORIO. Reportarlo
      // aquí también daría dos mensajes por el mismo hueco.
      if (typeof valor !== 'number' || Number.isNaN(valor)) return null;

      const bajoMinimo = cfg.min !== undefined && valor < Number(cfg.min);
      const sobreMaximo = cfg.max !== undefined && valor > Number(cfg.max);
      if (!bajoMinimo && !sobreMaximo) return null;

      const campo = porCodigo.get(cfg.codigo);
      return {
        tipo: regla.tipo,
        codigo: cfg.codigo,
        etiqueta: campo?.etiqueta,
        grupo: campo?.grupo ?? undefined,
        mensaje: regla.mensaje ?? `${campo?.etiqueta ?? cfg.codigo} está fuera del rango permitido`,
      };
    }

    case 'PLAZO_MINIMO': {
      if (!contexto.iniciadaEn) return null;
      const dias = Number(cfg.dias ?? 0);
      const ahora = contexto.ahora ?? new Date();
      const transcurridos = Math.floor(
        (ahora.getTime() - contexto.iniciadaEn.getTime()) / 86_400_000,
      );
      if (transcurridos >= dias) return null;

      return {
        tipo: regla.tipo,
        mensaje:
          regla.mensaje ??
          `Deben transcurrir ${dias} días; van ${transcurridos}`,
      };
    }

    case 'BLOQUEA_AVANCE': {
      // Depende de que otra actividad esté aprobada —"sin CDP no se puede
      // continuar"—. Se resuelve fuera, donde se conocen las demás
      // actividades del proceso; aquí solo se traduce el resultado.
      if (cfg.cumplida === true) return null;

      return {
        tipo: regla.tipo,
        mensaje: regla.mensaje ?? `Requiere completar la actividad ${cfg.numeral ?? 'previa'}`,
      };
    }

    case 'REGLA_DERIVADA': {
      // El valor de un campo obliga a diligenciar otro: la causal cuando la
      // modalidad es directa, por ejemplo.
      const disparador = contexto.datos?.[cfg.si_campo];
      const coincide = Array.isArray(cfg.si_valor)
        ? cfg.si_valor.includes(disparador)
        : disparador === cfg.si_valor;
      if (!coincide) return null;

      const campo = porCodigo.get(cfg.entonces_campo);
      if (!campo) return null;
      if (!esVacio(campo.tipo, contexto.datos?.[cfg.entonces_campo])) return null;

      return {
        tipo: regla.tipo,
        codigo: campo.codigo,
        etiqueta: campo.etiqueta,
        grupo: campo.grupo ?? undefined,
        mensaje: regla.mensaje ?? `Falta diligenciar ${campo.etiqueta}`,
      };
    }

    default:
      // Un tipo desconocido no debe bloquear: significa que la base tiene una
      // regla más nueva que este servicio, y frenar el proceso por eso sería
      // peor que ignorarla hasta el próximo despliegue.
      return null;
  }
}

/**
 * Reglas que aplican a una modalidad: las generales más las suyas.
 *
 * Se filtra en memoria y no en SQL porque la vigencia y la modalidad son dos
 * condiciones sobre el mismo conjunto pequeño, y tenerlas juntas aquí evita
 * que una consulta olvide una de las dos.
 */
export function reglasAplicables(
  reglas: ReglaActividad[],
  modalidad: string | null,
  enFecha = new Date(),
): ReglaActividad[] {
  return reglas.filter((r) => {
    if (r.modalidad !== null && r.modalidad !== modalidad) return false;
    if (r.vigenteDesde > enFecha) return false;
    if (r.vigenteHasta && r.vigenteHasta <= enFecha) return false;
    return true;
  });
}
