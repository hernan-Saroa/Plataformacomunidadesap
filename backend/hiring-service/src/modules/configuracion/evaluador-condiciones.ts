import { Accion, Condicion, ReglaActividad } from '../../entities/regla-actividad.entity';

/** Lo que el formulario sabe de sí mismo al momento de evaluarse. */
export interface ContextoFormulario {
  datos: Record<string, any>;
  modalidad: string;
}

/**
 * Cómo queda un campo después de aplicar las reglas que le tocan.
 *
 * `visible` y `obligatorio` son independientes: un campo puede estar visible y
 * no ser obligatorio, y una regla puede volverlo obligatorio sin mostrarlo si
 * ya lo estaba.
 */
export interface EstadoCampo {
  visible: boolean;
  obligatorio: boolean;
  /** Qué reglas lo dejaron así; es lo que se muestra en la vista previa. */
  porque: string[];
}

const COMPARACIONES: Record<string, (real: any, esperado: any) => boolean> = {
  ES: (real, esperado) => String(real ?? '') === String(esperado ?? ''),
  NO_ES: (real, esperado) => String(real ?? '') !== String(esperado ?? ''),
  MAYOR_QUE: (real, esperado) => Number(real) > Number(esperado),
  MENOR_QUE: (real, esperado) => Number(real) < Number(esperado),
  ESTA_VACIO: (real) => real === undefined || real === null || String(real).trim() === '',
  TIENE_VALOR: (real) => real !== undefined && real !== null && String(real).trim() !== '',
};

/**
 * Si una condición se cumple en el contexto dado.
 *
 * `modalidad` se lee del proceso y no de los datos: es la única condición que
 * no sale del formulario, y es justo la más usada.
 */
export function cumpleCondicion(condicion: Condicion, contexto: ContextoFormulario): boolean {
  const comparar = COMPARACIONES[condicion.operador];
  // Un operador desconocido no se inventa: se ignora la condición en vez de
  // dar por buena una regla que nadie sabe leer.
  if (!comparar) return false;

  const real =
    condicion.campo === 'modalidad' ? contexto.modalidad : contexto.datos?.[condicion.campo];

  // Los numéricos con dato ausente no se comparan: `Number(undefined) > 5` es
  // false, pero `< 5` también, y eso dejaría pasar reglas por accidente.
  if (
    (condicion.operador === 'MAYOR_QUE' || condicion.operador === 'MENOR_QUE') &&
    (real === undefined || real === null || real === '')
  ) {
    return false;
  }

  return comparar(real, condicion.valor);
}

/** Si la regla aplica: todas sus condiciones (AND) o alguna (OR). */
export function reglaAplica(regla: ReglaActividad, contexto: ContextoFormulario): boolean {
  const condiciones = regla.condiciones ?? [];
  // Sin condiciones la regla es incondicional, que es como se comportaban
  // todas antes de que existiera este campo.
  if (condiciones.length === 0) return true;

  return regla.conector === 'OR'
    ? condiciones.some((c) => cumpleCondicion(c, contexto))
    : condiciones.every((c) => cumpleCondicion(c, contexto));
}

/**
 * Cómo queda cada campo del formulario tras aplicar las reglas.
 *
 * Es lo que hace posible la vista previa: en vez de describir las reglas, se
 * ejecutan y se muestra el formulario que producen.
 */
export function proyectarFormulario(
  reglas: ReglaActividad[],
  codigosDeCampos: string[],
  contexto: ContextoFormulario,
): Record<string, EstadoCampo> {
  const estado: Record<string, EstadoCampo> = {};
  for (const codigo of codigosDeCampos) {
    estado[codigo] = { visible: true, obligatorio: false, porque: [] };
  }

  for (const regla of reglas) {
    if (!reglaAplica(regla, contexto)) continue;

    for (const accion of regla.acciones ?? []) {
      aplicarAccion(estado, accion, regla);
    }

    // Las reglas del modelo anterior no tienen acciones: su tipo y su config
    // dicen lo mismo, y se siguen honrando mientras convivan las dos formas.
    if ((regla.acciones ?? []).length === 0) {
      aplicarLegado(estado, regla);
    }
  }

  return estado;
}

function aplicarAccion(
  estado: Record<string, EstadoCampo>,
  accion: Accion,
  regla: ReglaActividad,
): void {
  const campo = estado[accion.objetivo];
  if (!campo) return;

  const motivo = regla.mensaje ?? descripcion(regla);

  switch (accion.accion) {
    case 'EXIGIR_CAMPO':
      campo.obligatorio = true;
      // Exigir un campo oculto lo dejaría imposible de diligenciar.
      campo.visible = true;
      campo.porque.push(motivo);
      break;
    case 'MOSTRAR_CAMPO':
      campo.visible = true;
      campo.porque.push(motivo);
      break;
    case 'OCULTAR_CAMPO':
      campo.visible = false;
      // Un campo oculto no puede bloquear el envío.
      campo.obligatorio = false;
      campo.porque.push(motivo);
      break;
    default:
      // EXIGIR_DOCUMENTO y BLOQUEAR_AVANCE no afectan a un campo del
      // formulario; los resuelve el evaluador de reglas al enviar.
      break;
  }
}

function aplicarLegado(estado: Record<string, EstadoCampo>, regla: ReglaActividad): void {
  if (regla.tipo !== 'CAMPO_OBLIGATORIO') return;
  const campo = estado[regla.config?.codigo];
  if (!campo) return;

  campo.obligatorio = true;
  campo.porque.push(regla.mensaje ?? 'Campo obligatorio');
}

/** Frase legible de la regla, para cuando no tiene mensaje propio. */
export function descripcion(regla: ReglaActividad): string {
  const condiciones = regla.condiciones ?? [];
  const acciones = regla.acciones ?? [];
  if (acciones.length === 0) return regla.tipo;

  const queHace = acciones.map(frase).join(' y ');
  if (condiciones.length === 0) return queHace;

  const union = regla.conector === 'OR' ? ' o ' : ' y ';
  const cuando = condiciones.map(fraseCondicion).join(union);
  return `Si ${cuando}, ${queHace}`;
}

function frase(accion: Accion): string {
  switch (accion.accion) {
    case 'EXIGIR_CAMPO':
      return `exige ${accion.objetivo}`;
    case 'MOSTRAR_CAMPO':
      return `muestra ${accion.objetivo}`;
    case 'OCULTAR_CAMPO':
      return `oculta ${accion.objetivo}`;
    case 'EXIGIR_DOCUMENTO':
      return `exige el documento ${accion.objetivo}`;
    case 'BLOQUEAR_AVANCE':
      return `bloquea el avance hasta ${accion.objetivo}`;
    default:
      return accion.accion;
  }
}

function fraseCondicion(condicion: Condicion): string {
  const campo = condicion.campo === 'modalidad' ? 'la modalidad' : condicion.campo;
  switch (condicion.operador) {
    case 'ES':
      return `${campo} es ${condicion.valor}`;
    case 'NO_ES':
      return `${campo} no es ${condicion.valor}`;
    case 'MAYOR_QUE':
      return `${campo} supera ${condicion.valor}`;
    case 'MENOR_QUE':
      return `${campo} es menor que ${condicion.valor}`;
    case 'ESTA_VACIO':
      return `${campo} está vacío`;
    case 'TIENE_VALOR':
      return `${campo} tiene valor`;
    default:
      return `${campo} ${condicion.operador}`;
  }
}
