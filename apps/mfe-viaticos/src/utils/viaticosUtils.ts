import {
  Comisionado,
  CreateSolicitudRequest,
  EstadoSolicitudViatico,
  FormNuevaSolicitud,
  Geopolitica,
} from '../types/viaticos';

/**
 * Identificador por defecto del usuario que radica la solicitud.
 * Debe reemplazarse por el id de la sesión autenticada del portal
 * (p. ej. `authService.getCurrentUser()?.id`).
 */
export const USUARIO_ACTUAL_ID = 'USUARIO_NO_AUTENTICADO';

/**
 * Ayuda mostrada bajo el campo de descripción del objeto de comisión.
 * Las restricciones responden a la integración con el SIIF.
 */
export const AYUDA_OBJETO_SIIF =
  'No se permiten caracteres especiales, tildes ni la letra ñ (integración con el SIIF).';

/**
 * Estado inicial del formulario de nueva solicitud.
 * Los campos se alinean con el DTO backend `CreateSolicitudDto` (camelCase).
 */
export function formInicialNuevaSolicitud(): FormNuevaSolicitud {
  return {
    documentoComisionado: '',
    comisionadoId: '',
    objetoComision: '',
    destinoCiudad: '',
    destinoDepartamento: '',
    fechaInicio: '',
    fechaFin: '',
    rubroPresupuestal: '',
    prioridad: 'MEDIA',
    requiereTiquetes: true,
    montoViaticos: 0,
    montoGastosViaje: 0,
    diasComision: 1,
    aceptaHabeasData: false,
  };
}

/**
 * Sanea el objeto de la comisión: normaliza las tildes (conservando la letra
 * base, p. ej. `gestión` → `gestion`), reemplaza `ñ` → `n`, elimina caracteres
 * especiales, colapsa espacios múltiples y recorta hasta 250 caracteres.
 * Espejo de `sanitizeObjetoComision` del backend.
 *
 * No recorta espacios finales en tiempo de escritura para preservar la
 * separación entre palabras al digitar; el recorte definitivo se aplica al
 * construir el payload (`mapearARequestCreacion`).
 *
 * @example sanitizeObjetoComision('Comisión de gestión @#$%') // 'Comision de gestion '
 */
export function sanitizeObjetoComision(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/gi, 'n')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/ {2,}/g, ' ')
    .slice(0, 250);
}

/**
 * Construye el nombre completo del comisionado a partir de sus nombres y apellidos.
 */
export function formatearNombreComisionado(comisionado: Comisionado): string {
  return [
    comisionado.primerNombre,
    comisionado.segundoNombre,
    comisionado.primerApellido,
    comisionado.segundoApellido,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
}

/**
 * Calcula los días de comisión (inclusive) entre dos fechas ISO (yyyy-mm-dd).
 */
export function calcularDiasComision(fechaInicio: string, fechaFin: string): number {
  if (!fechaInicio || !fechaFin) return 0;
  const ini = new Date(`${fechaInicio}T00:00:00`);
  const fin = new Date(`${fechaFin}T00:00:00`);
  if (Number.isNaN(ini.getTime()) || Number.isNaN(fin.getTime())) return 0;
  const diff = Math.round((fin.getTime() - ini.getTime()) / 86_400_000);
  return Math.max(0, diff + 1);
}

export function esDiaHabil(fecha: Date): boolean {
  const dia = fecha.getDay();
  return dia !== 0 && dia !== 6;
}

export function contarDiasHabilesEntre(fechaInicio: Date, fechaFin: Date): number {
  let count = 0;
  const fecha = new Date(fechaInicio);
  while (fecha <= fechaFin) {
    if (esDiaHabil(fecha)) {
      count++;
    }
    fecha.setDate(fecha.getDate() + 1);
  }
  return count;
}

export function validarAnticipacionRadicacion(fechaInicio: string) {
  if (!fechaInicio) return null;
  const ahora = new Date();
  const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
  const esFinDeSemana = ahora.getDay() === 0 || ahora.getDay() === 6;
  const radicadoFueraJornada = horaActual >= 16 * 60 + 30 || esFinDeSemana;

  const inicio = new Date(`${fechaInicio}T00:00:00`);
  const diasHabiles = contarDiasHabilesEntre(ahora, inicio);
  const extemporanea = diasHabiles < 14;

  return {
    extemporanea,
    diasHabiles,
    radicadoFueraJornada,
  };
}

/**
 * Fecha de hoy en formato yyyy-mm-dd (hora local).
 */
export function hoyISO(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
}

/**
 * Valida el rango de fechas de la solicitud.
 * 1. Deben estar definidas.
 * 2. La fecha de inicio no puede ser anterior a hoy.
 * 3. La fecha fin no puede ser anterior a la fecha inicio.
 *
 * Devuelve el primer error encontrado o `null` si las fechas son correctas.
 */
export function validarFechasSolicitud(fechaInicio: string, fechaFin: string): string | null {
  if (!fechaInicio || !fechaFin) return 'Debe indicar las fechas de inicio y fin de la comisión.';
  if (fechaInicio < hoyISO()) return 'La fecha de inicio no puede ser anterior a hoy.';
  if (fechaFin < fechaInicio) return 'Debe ser posterior o igual a fecha inicio';
  return null;
}

/**
 * Mapea el formulario al payload `CreateSolicitudRequest` (camelCase) que
 * consume `viaticosService.crearSolicitudComision`, alineado con el DTO
 * backend `CreateSolicitudDto`.
 */
export function mapearARequestCreacion(
  form: FormNuevaSolicitud,
  comisionado: Comisionado,
  creadoPorUsuarioId: string = USUARIO_ACTUAL_ID,
): CreateSolicitudRequest {
  const aceptaHabeasData = form.aceptaHabeasData || comisionado.autorizacionHabeasData;
  return {
    comisionadoId: comisionado.id,
    destinoCiudad: form.destinoCiudad.trim(),
    destinoDepartamento: form.destinoDepartamento.trim(),
    fechaInicio: form.fechaInicio,
    fechaFin: form.fechaFin,
    objetoComision: sanitizeObjetoComision(form.objetoComision).trim(),
    prioridad: form.prioridad,
    rubroPresupuestal: form.rubroPresupuestal.trim(),
    requiereTiquetes: form.requiereTiquetes,
    montoViaticos: form.montoViaticos,
    montoGastosViaje: form.montoGastosViaje,
    diasComision: form.diasComision,
    creadoPorUsuarioId: creadoPorUsuarioId,
    aceptaHabeasData: aceptaHabeasData,
    ipRegistroHabeasData: aceptaHabeasData ? '127.0.0.1' : comisionado.ipRegistroHabeasData,
    documentos: [],
  };
}

export interface ConfigEstado {
  label: string;
  bg: string;
  text: string;
}

/**
 * Configuración de presentación (badge) para cada estado de solicitud.
 */
export const CONFIG_ESTADOS: Record<EstadoSolicitudViatico, ConfigEstado> = {
  BORRADOR: { label: 'Borrador', bg: 'bg-gray-100', text: 'text-gray-700' },
  SOLICITADO: { label: 'Solicitado', bg: 'bg-blue-100', text: 'text-blue-800' },
  APROBADO_JEFE: { label: 'Aprobado Jefe', bg: 'bg-indigo-100', text: 'text-indigo-800' },
  APROBADO_TALENTO_HUMANO: { label: 'Aprobado TH', bg: 'bg-purple-100', text: 'text-purple-800' },
  RESOLUCION_EMITIDA: { label: 'Resolución Emitida', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  TIQUETES_COMPRADOS: { label: 'Tiquetes Emitidos', bg: 'bg-cyan-100', text: 'text-cyan-800' },
  EN_COMISION: { label: 'En Comisión', bg: 'bg-amber-100', text: 'text-amber-800' },
  PENDIENTE_LEGALIZACION: { label: 'Por Legalizar', bg: 'bg-orange-100', text: 'text-orange-800' },
  LEGALIZADO: { label: 'Legalizado', bg: 'bg-green-100', text: 'text-green-800' },
  RECHAZADO: { label: 'Rechazado', bg: 'bg-red-100', text: 'text-red-800' },
  RADICADA: { label: 'Radicada', bg: 'bg-slate-100', text: 'text-slate-700' },
  EXTEMPORANEA: { label: 'Extemporánea', bg: 'bg-red-100', text: 'text-red-700' },
};

export function getConfigEstado(estado: string): ConfigEstado {
  return CONFIG_ESTADOS[estado as EstadoSolicitudViatico] || {
    label: estado,
    bg: 'bg-gray-100',
    text: 'text-gray-800',
  };
}

/**
 * Formatea un valor numérico como moneda colombiana.
 */
export function formatearMoneda(valor: number): string {
  if (!Number.isFinite(valor)) return '$0';
  return `$${Math.round(valor).toLocaleString('es-CO')}`;
}

/**
 * Conserva únicamente dígitos (para campos numéricos que no permiten texto).
 */
export function soloNumeros(valor: string): string {
  return valor.replace(/[^0-9]/g, '');
}

/**
 * Catálogo de departamentos de Colombia con sus ciudades principales.
 * Se usa para los selectores dependientes departamento → ciudad.
 */
export const DEPARTAMENTOS_COLOMBIA: Record<string, string[]> = {
  'Amazonas': ['Leticia', 'Puerto Nariño'],
  'Antioquia': ['Medellín', 'Bello', 'Envigado', 'Itagüí', 'Rionegro', 'Apartadó', 'Turbo'],
  'Arauca': ['Arauca', 'Saravena'],
  'Atlántico': ['Barranquilla', 'Soledad', 'Malambo', 'Puerto Colombia', 'Sabanagrande'],
  'Bogotá D.C.': ['Bogotá D.C.'],
  'Bolívar': ['Cartagena', 'Magangué', 'Turbaco', 'El Carmen de Bolívar'],
  'Boyacá': ['Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá', 'Paipa'],
  'Caldas': ['Manizales', 'Villamaría', 'Chinchiná'],
  'Caquetá': ['Florencia', 'San Vicente del Caguán'],
  'Casanare': ['Yopal', 'Aguazul'],
  'Cauca': ['Popayán', 'Santander de Quilichao', 'Puerto Tejada'],
  'Cesar': ['Valledupar', 'Aguachica', 'Codazzi'],
  'Chocó': ['Quibdó', 'Istmina'],
  'Córdoba': ['Montería', 'Cereté', 'Sahagún'],
  'Cundinamarca': ['Soacha', 'Zipaquirá', 'Chía', 'Facatativá', 'Girardot', 'Fusagasugá', 'Mosquera', 'Madrid', 'Cajicá'],
  'Guainía': ['Inírida'],
  'Guaviare': ['San José del Guaviare'],
  'Huila': ['Neiva', 'Pitalito', 'Garzón'],
  'La Guajira': ['Riohacha', 'Maicao', 'Uribia'],
  'Magdalena': ['Santa Marta', 'Ciénaga', 'Fundación'],
  'Meta': ['Villavicencio', 'Acacías', 'Granada'],
  'Nariño': ['Pasto', 'Tumaco', 'Ipiales', 'Túquerres'],
  'Norte de Santander': ['Cúcuta', 'Ocaña', 'Pamplona', 'Villa del Rosario'],
  'Putumayo': ['Mocoa', 'Puerto Asís'],
  'Quindío': ['Armenia', 'Calarcá'],
  'Risaralda': ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal'],
  'San Andrés y Providencia': ['San Andrés', 'Providencia'],
  'Santander': ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja', 'San Gil'],
  'Sucre': ['Sincelejo', 'Corozal', 'Sampués'],
  'Tolima': ['Ibagué', 'Espinal', 'Melgar'],
  'Valle del Cauca': ['Cali', 'Buenaventura', 'Palmira', 'Tuluá', 'Yumbo', 'Buga'],
  'Vaupés': ['Mitú'],
  'Vichada': ['Puerto Carreño'],
};

/**
 * Códigos DANE oficiales de cada departamento. Se usan en el catálogo estático
 * para que coincida con `auth.geopolitica.cod_departamento` (p. ej. Risaralda=66)
 * y el llamado de ciudades use el mismo código que la BD real.
 */
export const COD_DANE_DEPARTAMENTOS: Record<string, number> = {
  Amazonas: 91,
  Antioquia: 5,
  Arauca: 81,
  'Atlántico': 8,
  'Bogotá D.C.': 11,
  Bolívar: 13,
  Boyacá: 15,
  Caldas: 17,
  Caquetá: 18,
  Casanare: 85,
  Cauca: 19,
  Cesar: 20,
  Chocó: 27,
  Córdoba: 23,
  Cundinamarca: 25,
  Guainía: 94,
  Guaviare: 95,
  Huila: 41,
  'La Guajira': 44,
  Magdalena: 47,
  Meta: 50,
  Nariño: 52,
  'Norte de Santander': 54,
  Putumayo: 86,
  Quindío: 63,
  Risaralda: 66,
  'San Andrés y Providencia': 88,
  Santander: 68,
  Sucre: 70,
  Tolima: 73,
  'Valle del Cauca': 76,
  Vaupés: 97,
  Vichada: 99,
};

/**
 * Lista ordenada de departamentos para los selectores.
 */
export function departamentosDisponibles(): string[] {
  return Object.keys(DEPARTAMENTOS_COLOMBIA).sort((a, b) =>
    a.localeCompare(b, 'es'),
  );
}

/**
 * Ciudades de un departamento dado (vacío si el departamento no existe).
 */
export function ciudadesDeDepartamento(departamento: string): string[] {
  return DEPARTAMENTOS_COLOMBIA[departamento] || [];
}

/**
 * Construye una lista plana de `Geopolitica` a partir del catálogo estático.
 * Se usa como respaldo cuando el microservicio de auth (auth.geopolitica) no
 * está disponible; asigna identificadores sintéticos estables.
 */
export function fallbackGeopolitica(): Geopolitica[] {
  const lista: Geopolitica[] = [];
  let id = 1;
  departamentosDisponibles().forEach((depto) => {
    // Código DANE real del departamento (66 = Risaralda, 5 = Antioquia, …). Se
    // usa como codDepartamento para que el respaldo coincida con auth.geopolitica
    // y el llamado de ciudades sea estable (no depender de un id sintético).
    const codDane = COD_DANE_DEPARTAMENTOS[depto] ?? id;
    const deptoId = id++;
    lista.push({
      idGeopolitica: deptoId,
      codGeopolitica: String(codDane),
      codDepartamento: codDane,
      nomDivGeopolitica: depto,
      tipDivision: 'DEPTO',
    });
    (DEPARTAMENTOS_COLOMBIA[depto] || []).forEach((ciudad) => {
      lista.push({
        idGeopolitica: id++,
        codGeopolitica: String(codDane),
        codDepartamento: codDane,
        nomDivGeopolitica: ciudad,
        tipDivision: 'CIUDAD',
        idPadre: deptoId,
      });
    });
  });
  return lista;
}
