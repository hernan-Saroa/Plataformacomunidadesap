/**
 * Lo que una actividad puede pedirle al gestor, dicho como se le pide.
 *
 * El catálogo interno guarda un `tipo` de campo —texto, seleccion, adjunto— que
 * describe cómo se almacena el dato. Quien configura no piensa así: piensa en
 * que el gestor tiene que adjuntar el estudio o dar su visto bueno. Este
 * archivo traduce entre las dos formas de hablar.
 *
 * Ninguna de estas peticiones lleva condiciones ni excepciones por modalidad:
 * una actividad pide lo mismo en todas las que la recorren. Lo que varía entre
 * modalidades es si la recorre o no, y eso ya lo resuelve la aplicabilidad.
 */
export type Peticion =
  | 'ADJUNTAR_DOCUMENTO'
  | 'ESCRIBIR_JUSTIFICACION'
  | 'REGISTRAR_FECHA'
  | 'MARCAR_CASILLA'
  | 'APROBACION_RESPONSABLE'
  // Las cuatro siguientes ya existen en los formularios del estudio previo.
  // No se ofrecen al agregar —para eso están las de arriba, que cubren cómo se
  // cierra una actividad— pero hay que saber decirlas: sin ellas, los nueve
  // campos de la 3.1 se leerían todos como «escribir una justificación».
  | 'ESCRIBIR_TEXTO'
  | 'ELEGIR_OPCION'
  | 'REGISTRAR_VALOR'
  | 'REGISTRAR_NUMERO';

export interface FormaPeticion {
  nombre: string;
  /** Qué tendrá que hacer el gestor, en una línea. */
  ayuda: string;
  /** El tipo con el que se guarda el campo en el formulario. */
  tipo: string;
  /** Texto por defecto de la etiqueta, para no empezar en blanco. */
  etiqueta: string;
}

export const PETICIONES: Record<Peticion, FormaPeticion> = {
  ADJUNTAR_DOCUMENTO: {
    nombre: 'Adjuntar un documento',
    ayuda: 'El gestor debe subir un archivo para terminar la actividad',
    tipo: 'archivo',
    etiqueta: 'Documento firmado',
  },
  ESCRIBIR_JUSTIFICACION: {
    nombre: 'Escribir una justificación',
    ayuda: 'El gestor debe escribir un texto explicando lo realizado',
    tipo: 'texto_largo',
    etiqueta: 'Justificación',
  },
  REGISTRAR_FECHA: {
    nombre: 'Registrar una fecha',
    ayuda: 'El gestor debe indicar cuándo se realizó',
    tipo: 'fecha',
    etiqueta: 'Fecha de realización',
  },
  MARCAR_CASILLA: {
    nombre: 'Marcar una casilla',
    ayuda: 'El gestor solo confirma que la actividad se hizo',
    tipo: 'casilla',
    etiqueta: 'Confirmo que se realizó',
  },
  APROBACION_RESPONSABLE: {
    nombre: 'Aprobación de un responsable',
    ayuda: 'Alguien más debe revisar y dar el visto bueno',
    // Quién aprueba no se fija aquí: cambia de un proceso a otro, así que el
    // gestor lo elige al diligenciar con el buscador de personas.
    tipo: 'responsable',
    etiqueta: 'Visto bueno de',
  },
  ESCRIBIR_TEXTO: {
    nombre: 'Escribir un dato',
    ayuda: 'Una línea corta: un nombre, una referencia, un cargo',
    tipo: 'texto',
    etiqueta: 'Dato',
  },
  ELEGIR_OPCION: {
    nombre: 'Elegir de una lista',
    ayuda: 'El gestor escoge entre las opciones definidas',
    tipo: 'seleccion',
    etiqueta: 'Opción',
  },
  REGISTRAR_VALOR: {
    nombre: 'Registrar un valor en pesos',
    ayuda: 'Un importe en moneda',
    tipo: 'moneda',
    etiqueta: 'Valor',
  },
  REGISTRAR_NUMERO: {
    nombre: 'Registrar un número',
    ayuda: 'Una cantidad: días, unidades, porcentaje',
    tipo: 'numero',
    etiqueta: 'Cantidad',
  },
};

/**
 * Las que se ofrecen al agregar, de lo más frecuente a lo más específico.
 *
 * Solo estas cinco: son las formas en que se cierra una actividad. Las otras
 * cuatro describen campos que ya existen en los formularios del estudio previo,
 * pero pedir «un dato» o «una cantidad» sin decir de qué obliga a inventarse la
 * etiqueta desde cero, y eso lo resuelve mejor quien construye la etapa.
 */
export const ORDEN_PETICIONES: Peticion[] = [
  'ADJUNTAR_DOCUMENTO',
  'ESCRIBIR_JUSTIFICACION',
  'REGISTRAR_FECHA',
  'MARCAR_CASILLA',
  'APROBACION_RESPONSABLE',
];

/** De qué petición viene un campo ya guardado. */
export function peticionDe(tipo: string): Peticion {
  const todas = Object.keys(PETICIONES) as Peticion[];
  const encontrada = todas.find((p) => PETICIONES[p].tipo === tipo);
  return encontrada ?? 'ESCRIBIR_TEXTO';
}
