/**
 * Qué se puede avisar, a quién, y cómo se reconoce en la trazabilidad (EFDS-1183).
 *
 * Funciones puras: deciden a quién le llega cada aviso, y un error aquí no falla
 * ruidosamente —simplemente alguien deja de enterarse—, así que tienen que poder
 * probarse sin base de datos.
 */

/** Lo que puede pasar en un proceso y merece un aviso. */
export type EventoAviso =
  | 'DEVUELTA'
  | 'ENVIADA_A_APROBACION'
  | 'APROBADA'
  | 'ABOGADO_ASIGNADO'
  | 'RECIBIDO_EN_CONTRATACION'
  | 'PROCESO_RADICADO'
  | 'REGISTRADA'
  | 'DOCUMENTO_ADJUNTO';

/**
 * El papel que alguien cumple en un proceso concreto.
 *
 * Es lo que distingue «avisar al gestor» —todos los que tienen el rol en la
 * entidad— de «avisar al abogado de este proceso», que es casi siempre lo que
 * se quiere decir.
 */
export type PapelAviso = 'QUIEN_ENVIO' | 'QUIEN_APRUEBA' | 'ABOGADO' | 'CONTRATACION' | 'RADICADOR';

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
  sugerido: { activo: boolean; papeles: PapelAviso[] };
}

/** En el orden en que importan: primero lo que para el trabajo de alguien. */
export const EVENTOS: DefinicionEvento[] = [
  {
    codigo: 'DEVUELTA',
    nombre: 'Se devuelve una actividad',
    ayuda: 'Para que quien la trabajó sepa que tiene algo que corregir.',
    numeral: null,
    sugerido: { activo: true, papeles: ['QUIEN_ENVIO'] },
  },
  {
    codigo: 'ENVIADA_A_APROBACION',
    nombre: 'Se envía a aprobación',
    ayuda: 'Para que quien aprueba sepa que tiene algo esperando su visto bueno.',
    numeral: null,
    sugerido: { activo: true, papeles: ['QUIEN_APRUEBA'] },
  },
  {
    codigo: 'APROBADA',
    nombre: 'Se aprueba una actividad',
    ayuda: 'Para que quien la envió sepa que puede seguir con la siguiente.',
    numeral: null,
    sugerido: { activo: true, papeles: ['QUIEN_ENVIO'] },
  },
  {
    codigo: 'ABOGADO_ASIGNADO',
    nombre: 'Se asigna o cambia el abogado',
    ayuda: 'Para que el abogado sepa que tiene un proceso nuevo a su cargo.',
    numeral: '3.4',
    sugerido: { activo: true, papeles: ['ABOGADO'] },
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
    nombre: 'Se radica un proceso',
    ayuda: 'Para que la Dirección sepa que llegó un proceso nuevo a la bandeja.',
    numeral: '3.1',
    sugerido: { activo: false, papeles: [] },
  },
  {
    codigo: 'REGISTRADA',
    nombre: 'Se registra una actividad',
    ayuda: 'Para seguir el avance de un proceso sin tener que entrar a mirarlo.',
    numeral: null,
    sugerido: { activo: false, papeles: ['ABOGADO'] },
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
];

const CODIGOS_EVENTO = new Set(EVENTOS.map((e) => e.codigo));

/** Los eventos que pueden pasar en una actividad. */
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
}

/** Lee una fila de `hiring.avisos`, descartando lo que no tenga forma válida. */
export function leerAviso(fila: {
  evento: string;
  activo: boolean;
  papeles: unknown;
  roles: unknown;
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
  };
}

/** El aviso de un evento, con lo que alguien configuró o, si nadie lo tocó, lo sugerido. */
export function avisoQueRige(
  evento: EventoAviso,
  configurado: AvisoConfigurado | undefined,
): AvisoConfigurado {
  if (configurado) return configurado;
  const definicion = EVENTOS.find((e) => e.codigo === evento);
  return {
    evento,
    personalizado: false,
    activo: definicion?.sugerido.activo ?? false,
    papeles: definicion?.sugerido.papeles ?? [],
    roles: [],
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
}

/**
 * Qué eventos representa una fila de trazabilidad, si alguno.
 *
 * La trazabilidad registra todo —también las consultas— y cada servicio lo
 * describe a su manera: el reparto no guarda numeral porque su actividad es
 * fija, y la aprobación genérica sí porque sirve a todas. Aquí se traducen esas
 * formas a un solo vocabulario.
 *
 * Registrar donde hay aprobadores es a la vez registrar y enviar a aprobación,
 * así que una fila puede producir dos eventos.
 *
 * Lo que no se reconoce devuelve una lista vacía y no avisa. Es a propósito: un
 * panel nuevo que registre sus eventos no dispara nada hasta que se diga aquí
 * qué significan.
 */
export function eventosDeTraza(t: TrazaLeida): EventoOcurrido[] {
  const uno = eventoUnico(t);
  if (!uno) return [];

  if (uno.evento === 'REGISTRADA' && t.detalle?.estado === 'EN_REVISION') {
    return [uno, { ...uno, evento: 'ENVIADA_A_APROBACION' }];
  }
  return [uno];
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
      return detalle.papel === 'ABOGADO' ? ocurrido('ABOGADO_ASIGNADO', '3.4') : null;

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
      return ocurrido('REGISTRADA', numeral);
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
  ocurrido: Pick<EventoOcurrido, 'evento' | 'numeral' | 'actorNombre' | 'observaciones'>,
  actividad: string | null,
  radicado: string | null,
): { titulo: string; mensaje: string; prioridad: 'Media' | 'Alta' } {
  const que = `${ocurrido.numeral}${actividad ? ` · ${actividad}` : ''}`;
  const proceso = radicado ? ` del proceso ${radicado}` : '';
  const elProceso = radicado ? ` ${radicado}` : '';
  const quien = ocurrido.actorNombre ? ` por ${ocurrido.actorNombre}` : '';

  switch (ocurrido.evento) {
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
    case 'ABOGADO_ASIGNADO':
      return {
        titulo: 'Tienes un proceso asignado',
        mensaje: `Se asignó abogado al proceso${elProceso}${quien}.`,
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
        titulo: 'Se radicó un proceso',
        mensaje: `Se radicó el proceso${elProceso}${quien}.`,
        prioridad: 'Media',
      };
    case 'REGISTRADA':
      return {
        titulo: 'Se registró una actividad',
        mensaje: `${que}${proceso} fue registrada${quien}.`,
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
