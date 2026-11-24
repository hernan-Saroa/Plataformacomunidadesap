/**
 * Carpetas de la codificación documental del GGP (archivo CODIFICACION.xlsx), en su orden y denominación.
 * La clave `bloque` es la que está persistida en revisiones y estados; `Transversal` se conserva porque
 * guarda la autorización de tratamiento de datos que la activación del perfil sigue exigiendo.
 */
export type RundCarpeta = { bloque: string; codigo: string; nombre: string; descripcion: string };

export const RUND_CARPETAS: RundCarpeta[] = [
  { bloque: 'IDENTIDAD', codigo: '00', nombre: 'Datos básicos', descripcion: 'Documento de identidad, foto, tarjeta profesional y hoja de vida del docente.' },
  { bloque: 'FORMACION', codigo: '01', nombre: 'Títulos de formación', descripcion: 'Bachiller, pregrado, especialización, maestría, doctorado y posdoctorado, con espacio para títulos adicionales por nivel.' },
  { bloque: 'EXPERIENCIA_DOCENTE', codigo: '02', nombre: 'Experiencia docente', descripcion: 'Certificaciones de experiencia docente.' },
  { bloque: 'EXPERIENCIA_LABORAL', codigo: '03', nombre: 'Experiencia laboral', descripcion: 'Certificaciones de experiencia laboral.' },
  { bloque: 'ACADEMICO', codigo: '04', nombre: 'Experiencia investigativa', descripcion: 'Soportes de experiencia investigativa, núcleo temático y evaluación del docente.' },
  { bloque: 'PRODUCTIVIDAD_ACADEMICA', codigo: '05', nombre: 'Productividad académica', descripcion: 'Producción académica del docente: libros, ponencias y demás productos.' },
  { bloque: 'SEGUNDA_LENGUA', codigo: '06', nombre: 'Dominio de segunda lengua', descripcion: 'Certificaciones de dominio de segunda lengua. Se avalan todas las disponibles.' },
  { bloque: 'FORMACION_NO_FORMAL', codigo: '07', nombre: 'Formación no formal adicional', descripcion: 'Diplomados, seminarios, cursos, talleres, ponencias y menciones.' },
  { bloque: 'ESTUDIO_HOJA_VIDA', codigo: '08', nombre: 'Estudio hoja de vida', descripcion: 'Estudios de hoja de vida, evaluación docente y microcurrículo.' },
  { bloque: 'DOCUMENTOS_NO_VALIDOS', codigo: '09', nombre: 'Documentos no válidos', descripcion: 'Documentos que no corresponden a ninguna otra carpeta, duplicados o repetidos.' },
  { bloque: 'VINCULACION', codigo: '10', nombre: 'Novedades talento humano', descripcion: 'Resoluciones y actos administrativos que definen, asignan, modifican o finalizan una situación académica, salarial o administrativa.' },
  { bloque: 'TRANSVERSAL', codigo: 'T', nombre: 'Transversal', descripcion: 'Autorización de tratamiento de datos y observaciones de la revisión.' },
];

export const rundCarpeta = (bloque?: string | null): RundCarpeta | undefined => RUND_CARPETAS.find(item => item.bloque === bloque);
export const RUND_CARPETA_ORDEN: string[] = RUND_CARPETAS.map(item => item.bloque);
