import type { EnteControlPM } from './ConfiguracionesSIGLContext';

export type EstadoGuardado = 'idle' | 'saving' | 'saved' | 'error';

// Leyenda del guardado automático en el encabezado de Configuraciones SIGL.
export function textoEstadoGuardado(estado: EstadoGuardado): string {
  switch (estado) {
    case 'saving': return 'Guardando…';
    case 'saved': return 'Cambios guardados';
    case 'error': return 'Error al guardar';
    default: return '⚡ Guardado automático activo';
  }
}

// Cuántos planes (activos o archivados) tienen asociado el ente. El plan guarda el id del
// ente en `origen`.
export function contarPlanesDeEnte(planes: ReadonlyArray<{ origen?: string | null }>, enteId: string): number {
  return planes.filter(p => p.origen === enteId).length;
}

export interface EnteControlVisual {
  nombre: string;
  icono: string;
  color: string;
  activo: boolean;
}

// Datos de pantalla de un ente a partir de la configuración vigente. Un plan registrado
// con un ente inactivo conserva su nombre/ícono/color; si el ente ya no existe en la
// configuración (planes antiguos con 'OTRO', 'RIESGO'...), se muestra el valor guardado.
export function resolverEnteControl(entes: ReadonlyArray<EnteControlPM>, enteId: string): EnteControlVisual {
  const ente = entes.find(e => e.id === enteId);
  if (ente) return { nombre: ente.nombre, icono: ente.icono, color: ente.color, activo: ente.activo };
  return { nombre: enteId || 'Sin ente', icono: '📄', color: '#6B7280', activo: false };
}

// Fondo suave (≈10 % de opacidad) para el badge de un ente a partir de su color #RRGGBB.
export function colorFondoSuave(color: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? `${color}1A` : '#F3F4F6';
}

// Agrupa planes por ente: primero los entes activos de la configuración (aunque no tengan
// planes) y luego cualquier otro ente con planes registrados (inactivos o ya inexistentes),
// para no ocultar planes existentes.
export function agruparPlanesPorEnte<T extends { enteControl: string }>(
  planes: ReadonlyArray<T>,
  entes: ReadonlyArray<EnteControlPM>,
): Record<string, T[]> {
  const grupos: Record<string, T[]> = {};
  entes.filter(e => e.activo).forEach(e => { grupos[e.id] = []; });
  planes.forEach(p => {
    (grupos[p.enteControl] ??= []).push(p);
  });
  return grupos;
}

// Genera un id único para un nuevo ente de control, evitando colisiones ante clics rápidos.
export function generarIdEnteControlPM(
  existentes: ReadonlyArray<{ id: string }>,
  ahora: number = Date.now(),
): string {
  const usados = new Set(existentes.map(e => e.id));
  const base = `ente-${ahora}`;
  if (!usados.has(base)) return base;
  let sufijo = 1;
  while (usados.has(`${base}-${sufijo}`)) sufijo += 1;
  return `${base}-${sufijo}`;
}

// Valida la lista antes de enviarla al servidor: evita que el autoguardado dispare un 400
// mientras el usuario borra el texto de un nombre para escribir el nuevo.
export function validarEntesControlPM(entes: ReadonlyArray<EnteControlPM>): string | null {
  const ids = new Set<string>();
  for (const ente of entes) {
    const id = typeof ente.id === 'string' ? ente.id.trim() : '';
    const nombre = typeof ente.nombre === 'string' ? ente.nombre.trim() : '';
    if (!id || !nombre || typeof ente.activo !== 'boolean') {
      return 'Todos los entes de control deben tener un nombre válido.';
    }
    if (ids.has(id)) {
      return `El identificador de ente "${id}" está repetido.`;
    }
    ids.add(id);
  }
  return null;
}
