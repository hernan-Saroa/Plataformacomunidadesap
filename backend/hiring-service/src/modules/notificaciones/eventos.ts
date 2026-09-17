/**
 * Qué se puede avisar, a quién, y cómo se reconoce en la trazabilidad (EFDS-1183).
 *
 * Funciones puras: deciden a quién le llega cada aviso, y un error aquí no falla
 * ruidosamente —simplemente alguien deja de enterarse—, así que tienen que poder
 * probarse sin base de datos.
 */

import { quienLaHace } from './quien-la-hace';
import { SE_HABILITA_AL_ASIGNAR_ABOGADO, SIN_PANEL } from './secuencia';

/** Lo que puede pasar en un proceso y merece un aviso. */
export type EventoAviso =
  | 'HABILITADA'
  | 'VENCE_PLAZO'
  | 'DEVUELTA'
  | 'ENVIADA_A_APROBACION'
  | 'APROBADA'
  | 'RECIBIDO_EN_CONTRATACION'
  | 'PROCESO_RADICADO'
  | 'DOCUMENTO_ADJUNTO';

/**
 * El papel que alguien cumple en un proceso concreto.
 *
 * Es lo que distingue «avisar al gestor» —todos los que tienen el rol en la
 * entidad— de «avisar al abogado de este proceso», que es casi siempre lo que
 * se quiere decir.
 */
export type PapelAviso =
  | 'QUIEN_ENVIO'
  | 'QUIEN_APRUEBA'
  | 'ABOGADO'
  | 'CONTRATACION'
  | 'RADICADOR'
  | 'BANDEJA_CONTRATACION'
  | 'EQUIPO_FINANCIERO'
  | 'COMITE_EVALUADOR'
  | 'SUPERVISOR'
  | 'REPARTE_PROCESOS'
  | 'DESIGNA_COMITE_Y_SUPERVISOR'
  | 'REASIGNA_SUPERVISION'
  | 'ARCHIVA_EXPEDIENTE';

/**
 * Lo que rige mientras nadie cambie un aviso.
 *
 * Solo papeles: lo sugerido nunca nombra un rol, porque los roles y sus
 * permisos se configuran. Donde no hay nadie del proceso, el papel se resuelve
 * por el permiso de quien puede hacerlo.
 */
export interface Sugerido {
  activo: boolean;
  papeles: PapelAviso[];
}

export interface DefinicionEvento {
  codigo: EventoAviso;
  /** Cómo lo lee quien configura. */
  nombre: string;
  /** Para qué sirve el aviso, dicho a quien decide si encenderlo. */
  ayuda: string;
  /**
   * La única actividad en la que ocurre, o `null` si ocurre en cualquiera.
   *
   * Radicar, recibir y asignar abogado son momentos del proceso con su propia
   * actividad; devolver, aprobar o registrar le pasan a cualquiera.
   */
  numeral: string | null;
  /**
   * Lo que rige mientras nadie lo cambie.
   *
   * Vive aquí y no sembrado en la base: así funciona en las 55 actividades sin
   * que alguien tenga que configurarlas una por una, y la tabla solo guarda lo
   * que la Dirección decidió distinto.
   */
  sugerido: Sugerido;
  /**
   * Avisos que no se configuran: salen siempre, a quien les corresponde.
   *
   * Enviar a aprobación, aprobar y devolver solo existen donde la actividad
   * tiene aprobación, y el destinatario no se puede decir con una dependencia,
   * un rol ni una persona: es quien la envió o quien la aprueba *en ese
   * proceso*. Ofrecer apagarlos sería ofrecer que la aprobación deje de
   * funcionar sin que nadie se entere.
   */
  siempre?: boolean;
  /**
   * Lo sugerido cuando depende de la actividad.
   *
   * «Le toca a alguien» no le toca a la misma persona en la 4.1 que en la 9.2:
   * el CDP lo expide la Financiera y los pagos los tramita el supervisor.
   */
  sugeridoEn?: (numeral: string) => Sugerido;
  /** La ayuda cuando depende de la actividad: no sale igual en todas. */
  ayudaEn?: (numeral: string) => string;
}

/**
 * A quién le toca cada actividad, encendido donde se trabaja en la plataforma.
 *
 * Donde no hay pantalla viene apagado: le diría a alguien que empiece algo que
 * no puede hacer aquí, y lo enciende quien sepa que sirve.
 */
function aQuienLeToca(numeral: string): Sugerido {
  const destino = quienLaHace(numeral);
  if (!destino) return { activo: false, papeles: [] };
  const sinPantalla = SIN_PANEL.has(numeral) && numeral !== SE_HABILITA_AL_ASIGNAR_ABOGADO;
  return { activo: !sinPantalla, ...destino };
}

/** En el orden en que importan: primero lo que para el trabajo de alguien. */
export const EVENTOS: DefinicionEvento[] = [
  {
    codigo: 'HABILITADA',
    nombre: 'Le toca a alguien hacerla',
    ayuda:
      'Cuando se termina lo que venía antes y esta actividad ya se puede trabajar, para que quien la hace sepa que es su turno.',
    numeral: null,
    sugerido: { activo: false, papeles: [] },
    // Encendido, a quien hace cada actividad: es el aviso que más trabajo
    // destraba, y apagado hasta que alguien configurara las 63 no avisaba nada.
    sugeridoEn: aQuienLeToca,
    ayudaEn: (numeral) =>
      numeral === SE_HABILITA_AL_ASIGNAR_ABOGADO
        ? 'Sale cuando, en la 3.3, la Dirección se hace cargo del proceso y elige al abogado: ahí le toca revisarlo.'
        : SIN_PANEL.has(numeral)
          ? 'Sale cuando el proceso llega a esta actividad. Se hace fuera de la plataforma, así que no detiene a las siguientes.'
          : 'Sale cuando se termina lo que venía antes y esta actividad ya se puede trabajar, para que quien la hace sepa que es su turno.',
  },
  {
    codigo: 'VENCE_PLAZO',
    nombre: 'Se vence el plazo',
    ayuda:
      'Sale cuando faltan pocos días hábiles para el plazo de la actividad, y otra vez si se vence. Solo en las actividades con plazo.',
    numeral: null,
    sugerido: { activo: false, papeles: [] },
    // A los mismos que les tocó hacerla: son quienes pueden entregarla a tiempo.
    sugeridoEn: aQuienLeToca,
  },
  {
    codigo: 'DEVUELTA',
    nombre: 'Se devuelve una actividad',
    ayuda: 'Para que quien la trabajó sepa que tiene algo que corregir.',
    numeral: null,
    siempre: true,
    sugerido: { activo: true, papeles: ['QUIEN_ENVIO'] },
  },
  {
    codigo: 'ENVIADA_A_APROBACION',
    nombre: 'Se envía a aprobación',
    ayuda: 'Para que quien aprueba sepa que tiene algo esperando su visto bueno.',
    numeral: null,
    siempre: true,
    sugerido: { activo: true, papeles: ['QUIEN_APRUEBA'] },
  },
  {
    codigo: 'APROBADA',
    nombre: 'Se aprueba una actividad',
    ayuda: 'Para que quien la envió sepa que puede seguir con la siguiente.',
    numeral: null,
    siempre: true,
    sugerido: { activo: true, papeles: ['QUIEN_ENVIO'] },
  },
  {
    codigo: 'RECIBIDO_EN_CONTRATACION',
    nombre: 'Contratación recibe el proceso',
    ayuda: 'Para que el área que radicó sepa que su proceso ya entró a la Dirección.',
    numeral: '3.3',
    sugerido: { activo: false, papeles: ['RADICADOR'] },
  },
  {
    codigo: 'PROCESO_RADICADO',
    nombre: 'Se crea un proceso',
    ayuda: 'Sale cuando el área crea el proceso, para que la Dirección sepa que viene uno nuevo.',
    numeral: '3.1',
    sugerido: { activo: true, papeles: ['REPARTE_PROCESOS'] },
  },
  {
    codigo: 'DOCUMENTO_ADJUNTO',
    nombre: 'Se adjunta un documento',
    ayuda: 'Para enterarse cuando llega un soporte nuevo al expediente.',
    numeral: null,
    sugerido: { activo: false, papeles: ['ABOGADO'] },
  },
];

export const PAPELES: { codigo: PapelAviso; nombre: string }[] = [
  { codigo: 'QUIEN_ENVIO', nombre: 'Quien envió la actividad' },
  { codigo: 'QUIEN_APRUEBA', nombre: 'Quien la aprueba' },
  { codigo: 'ABOGADO', nombre: 'El abogado del proceso' },
  { codigo: 'CONTRATACION', nombre: 'Quien lo recibió en Contratación' },
  { codigo: 'RADICADOR', nombre: 'Quien radicó el proceso' },
  { codigo: 'BANDEJA_CONTRATACION', nombre: 'Quien puede recibirlo en Contratación' },
  { codigo: 'EQUIPO_FINANCIERO', nombre: 'El equipo financiero' },
  { codigo: 'COMITE_EVALUADOR', nombre: 'El comité evaluador' },
  { codigo: 'SUPERVISOR', nombre: 'El supervisor del contrato' },
  { codigo: 'REPARTE_PROCESOS', nombre: 'Quien reparte los procesos en Contratación' },
  { codigo: 'DESIGNA_COMITE_Y_SUPERVISOR', nombre: 'Quien designa el comité y el supervisor' },
  { codigo: 'REASIGNA_SUPERVISION', nombre: 'Quien reasigna la supervisión' },
  { codigo: 'ARCHIVA_EXPEDIENTE', nombre: 'Quien archiva el expediente' },
];

const CODIGOS_EVENTO = new Set(EVENTOS.map((e) => e.codigo));

/**
 * Los eventos que pueden pasar en una actividad.
 *
 * «Le toca a alguien» está en todas: toda actividad tiene un momento en que
 * le toca a alguien, aunque se haga fuera de la plataforma.
 */
export function eventosDeActividad(numeral: string): DefinicionEvento[] {
  return EVENTOS.filter((e) => e.numeral === null || e.numeral === numeral);
}

const CODIGOS_PAPEL = new Set(PAPELES.map((p) => p.codigo));

export const esEvento = (valor: unknown): valor is EventoAviso =>
  typeof valor === 'string' && CODIGOS_EVENTO.has(valor as EventoAviso);

export const esPapel = (valor: unknown): valor is PapelAviso =>
  typeof valor === 'string' && CODIGOS_PAPEL.has(valor as PapelAviso);

/** Cómo quedó configurado un aviso en una actividad. */
export interface AvisoConfigurado {
  evento: EventoAviso;
  /** Si alguien lo cambió, o rige lo sugerido. */
  personalizado: boolean;
  activo: boolean;
  papeles: PapelAviso[];
  roles: string[];
  /** Ids de persona nombrados uno a uno, como en la pestaña de Aprobación. */
  personas: string[];
  /** Ids de `auth.dependencias`: avisa a todas las personas de cada una. */
  dependencias: string[];
}

/** Lee una fila de `hiring.avisos`, descartando lo que no tenga forma válida. */
export function leerAviso(fila: {
  evento: string;
  activo: boolean;
  papeles: unknown;
  roles: unknown;
  personas?: unknown;
  dependencias?: unknown;
}): AvisoConfigurado | null {
  if (!esEvento(fila.evento)) return null;
  const lista = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x) : [];

  return {
    evento: fila.evento,
    personalizado: true,
    activo: fila.activo === true,
    papeles: lista(fila.papeles).filter(esPapel),
    roles: lista(fila.roles),
    personas: lista(fila.personas),
    // Los ids llegan como número o como texto según quién los guardó.
    dependencias: Array.isArray(fila.dependencias)
      ? fila.dependencias.filter((x) => x !== null && x !== '').map(String)
      : [],
  };
}

/** El aviso de un evento, con lo que alguien configuró o, si nadie lo tocó, lo sugerido. */
export function avisoQueRige(
  evento: EventoAviso,
  configurado: AvisoConfigurado | undefined,
  numeral?: string,
): AvisoConfigurado {
  const definicion = EVENTOS.find((e) => e.codigo === evento);
  const sugerido =
    (numeral && definicion?.sugeridoEn?.(numeral)) || definicion?.sugerido || { activo: false, papeles: [] };

  // Los papeles son siempre los del evento: se avisan solos y no se eligen.
  // Lo que se elige —dependencias, roles, personas— es lo que se suma.
  if (configurado && !definicion?.siempre) {
    return { ...configurado, papeles: sugerido.papeles };
  }
  return {
    evento,
    personalizado: false,
    activo: definicion?.siempre ? true : sugerido.activo,
    papeles: sugerido.papeles,
    roles: [],
    personas: [],
    dependencias: [],
  };
}

/** Lo que interesa de una fila de trazabilidad. */
export interface TrazaLeida {
  procesoId: string | null;
  entidad: string;
  accion: string;
  detalle: Record<string, any> | null;
  usuarioId: string | null;
  usuarioNombre: string | null;
}

/** Un evento reconocido, con la actividad donde ocurrió. */
export interface EventoOcurrido {
  evento: EventoAviso;
  numeral: string;
  procesoId: string;
  /** Quién lo hizo: no se le avisa a él. */
  actorId: string | null;
  actorNombre: string | null;
  /** Lo que el aviso necesita contar, como las observaciones de una devolución. */
  observaciones: string | null;
  /** Solo en «se vence el plazo»: hasta cuándo, y si ya pasó. */
  plazo?: { vence: string; vencido: boolean };
}

/**
 * Qué eventos representa una fila de trazabilidad, si alguno.
 *
 * La trazabilidad registra todo —también las consultas— y cada servicio lo
 * describe a su manera: el reparto no guarda numeral porque su actividad es
 * fija, y la aprobación genérica sí porque sirve a todas. Aquí se traducen esas
 * formas a un solo vocabulario.
 *
 * Registrar una actividad no es un aviso aparte: donde hay aprobadores es
 * enviarla a aprobación, y donde no, cerrarla —y eso lo cuenta el «le toca» de
 * la siguiente—. Ofrecer los dos era avisar dos veces de lo mismo.
 *
 * Lo que no se reconoce devuelve una lista vacía y no avisa. Es a propósito: un
 * panel nuevo que registre sus eventos no dispara nada hasta que se diga aquí
 * qué significan.
 */
export function eventosDeTraza(t: TrazaLeida): EventoOcurrido[] {
  const uno = eventoUnico(t);
  return uno ? [uno] : [];
}

function eventoUnico(t: TrazaLeida): EventoOcurrido | null {
  if (!t.procesoId) return null;

  const detalle = t.detalle ?? {};
  const numeral = typeof detalle.numeral === 'string' ? detalle.numeral : null;
  // El panel de la modalidad llama suyo al numeral: 'actividad'.
  const enActividad = typeof detalle.actividad === 'string' ? detalle.actividad : numeral;

  const ocurrido = (evento: EventoAviso, en: string | null): EventoOcurrido | null =>
    en
      ? {
          evento,
          numeral: en,
          procesoId: t.procesoId as string,
          actorId: t.usuarioId ?? null,
          actorNombre: t.usuarioNombre ?? null,
          observaciones:
            typeof detalle.observaciones === 'string' && detalle.observaciones.trim()
              ? detalle.observaciones.trim()
              : null,
        }
      : null;

  switch (`${t.entidad}:${t.accion}`) {
    case 'proceso:CREAR':
      return ocurrido('PROCESO_RADICADO', '3.1');
    case 'participacion_proceso:RADICAR':
      return ocurrido('RECIBIDO_EN_CONTRATACION', '3.3');
    case 'participacion_proceso:DESIGNAR':
      // Asignar el abogado es el «le toca» de la 3.4: desde ahí puede revisar.
      return detalle.papel === 'ABOGADO' ? ocurrido('HABILITADA', SE_HABILITA_AL_ASIGNAR_ABOGADO) : null;

    // La aprobación genérica guarda el numeral; el estudio previo es la 3.1.
    case 'aprobacion_actividad:ENVIAR':
      return ocurrido('ENVIADA_A_APROBACION', numeral);
    case 'aprobacion_actividad:APROBAR':
      return ocurrido('APROBADA', numeral);
    case 'aprobacion_actividad:DEVOLVER':
      return ocurrido('DEVUELTA', numeral);
    // La modalidad (3.5) tiene su propio panel y su propia traza: sin estos
    // tres casos, enviarla a aprobación y decidirla no avisaban a nadie.
    case 'modalidad_proceso:ENVIAR':
      return ocurrido('ENVIADA_A_APROBACION', enActividad);
    case 'modalidad_proceso:APROBAR':
      return ocurrido('APROBADA', enActividad);
    case 'modalidad_proceso:DEVOLVER':
      return ocurrido('DEVUELTA', enActividad);

    case 'estudio_previo:ENVIAR':
      return ocurrido('ENVIADA_A_APROBACION', '3.1');
    case 'estudio_previo:APROBAR':
      return ocurrido('APROBADA', '3.1');
    case 'estudio_previo:DEVOLVER':
      return ocurrido('DEVUELTA', '3.1');

    case 'registros_actividad:GUARDAR':
      return t.detalle?.estado === 'EN_REVISION' ? ocurrido('ENVIADA_A_APROBACION', numeral) : null;
    case 'documento_actividad:ADJUNTAR':
      return ocurrido('DOCUMENTO_ADJUNTO', numeral);

    default:
      return null;
  }
}

/**
 * Los destinatarios finales: sin repetidos y sin quien hizo la acción.
 *
 * Alguien puede entrar por rol y por papel a la vez —el abogado asignado que
 * además tiene el rol configurado—, y recibir dos avisos iguales le enseña a
 * ignorarlos. A quien hizo la acción no se le avisa lo que acaba de hacer.
 */
export function destinatariosFinales(
  candidatos: (string | null | undefined)[],
  actorId: string | null,
): string[] {
  const unicos = new Set<string>();
  for (const id of candidatos) {
    if (id && id !== actorId) unicos.add(id);
  }
  return [...unicos];
}

/** El texto del aviso, dicho para quien lo recibe. */
export function mensajeDeAviso(
  ocurrido: Pick<EventoOcurrido, 'evento' | 'numeral' | 'actorNombre' | 'observaciones' | 'plazo'>,
  actividad: string | null,
  radicado: string | null,
): { titulo: string; mensaje: string; prioridad: 'Media' | 'Alta' } {
  const que = `${ocurrido.numeral}${actividad ? ` · ${actividad}` : ''}`;
  const proceso = radicado ? ` del proceso ${radicado}` : '';
  const elProceso = radicado ? ` ${radicado}` : '';
  const quien = ocurrido.actorNombre ? ` por ${ocurrido.actorNombre}` : '';

  switch (ocurrido.evento) {
    case 'HABILITADA':
      if (ocurrido.numeral === SE_HABILITA_AL_ASIGNAR_ABOGADO) {
        return {
          titulo: 'Te toca revisar un proceso',
          mensaje: `Te asignaron el proceso${elProceso}${quien}: revisa su estudio previo.`,
          prioridad: 'Media',
        };
      }
      return {
        titulo: 'Te toca una actividad',
        mensaje: `${que}${proceso} ya se puede trabajar: se terminó lo que venía antes.`,
        prioridad: 'Media',
      };
    case 'VENCE_PLAZO': {
      const fecha = ocurrido.plazo ? fechaLarga(ocurrido.plazo.vence) : 'su fecha';
      return ocurrido.plazo?.vencido
        ? {
            titulo: 'Se venció el plazo de una actividad',
            mensaje: `${que}${proceso} tenía plazo hasta el ${fecha} y sigue sin entregarse.`,
            prioridad: 'Alta',
          }
        : {
            titulo: 'Se acerca el plazo de una actividad',
            mensaje: `${que}${proceso} vence el ${fecha}.`,
            prioridad: 'Media',
          };
    }
    case 'DEVUELTA':
      return {
        titulo: 'Te devolvieron una actividad',
        mensaje: `${que}${proceso} fue devuelta${quien}${
          ocurrido.observaciones ? `: «${ocurrido.observaciones}»` : '.'
        }`,
        // La única que para el trabajo de alguien hasta que la atienda.
        prioridad: 'Alta',
      };
    case 'ENVIADA_A_APROBACION':
      return {
        titulo: 'Una actividad espera tu aprobación',
        mensaje: `${que}${proceso} fue enviada a aprobación${quien}.`,
        prioridad: 'Media',
      };
    case 'APROBADA':
      return {
        titulo: 'Se aprobó una actividad',
        mensaje: `${que}${proceso} fue aprobada${quien}.`,
        prioridad: 'Media',
      };
    case 'RECIBIDO_EN_CONTRATACION':
      return {
        titulo: 'Contratación recibió el proceso',
        mensaje: `El proceso${elProceso} fue recibido en la Dirección de Contratación${quien}.`,
        prioridad: 'Media',
      };
    case 'PROCESO_RADICADO':
      return {
        titulo: 'Hay un proceso nuevo',
        mensaje: `Se creó el proceso${elProceso}${quien}.`,
        prioridad: 'Media',
      };
    case 'DOCUMENTO_ADJUNTO':
      return {
        titulo: 'Se adjuntó un documento',
        mensaje: `Se adjuntó un documento en ${que}${proceso}${quien}.`,
        prioridad: 'Media',
      };
  }
}

/** «17 de septiembre de 2026»: la fecha como se lee en un aviso. */
function fechaLarga(ymd: string): string {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
