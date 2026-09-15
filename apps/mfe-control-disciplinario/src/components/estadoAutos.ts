/**
 * Estados consolidados de los autos de un proceso, para el panel visual y la
 * alerta emergente del rol Profesional / Secretario / Jefe.
 *
 * Se derivan del estado del auto en el backend (LegalAuto.estado):
 *   BORRADOR                       -> "Pendientes"   (auto creado, sin enviar a revisión)
 *   REVISION_JEFE                  -> "En revisión"
 *   APROBADO / FIRMADO / NOTIFICADO-> "Aprobados"
 *   DEVUELTO                       -> "Devueltos"
 */

export type EstadoAutoUI = 'pendientes' | 'en_revision' | 'aprobados' | 'devueltos';

export type AutoEstadoBackend =
  | 'BORRADOR'
  | 'REVISION_JEFE'
  | 'APROBADO'
  | 'FIRMADO'
  | 'DEVUELTO'
  | 'NOTIFICADO';

export interface EstadoUIMeta {
  key: EstadoAutoUI;
  label: string;
  color: string;
  colorSuave: string;
}

/** Orden fijo para dona, tarjetas y modal */
export const ESTADOS_UI_ORDEN: EstadoAutoUI[] = [
  'pendientes',
  'en_revision',
  'aprobados',
  'devueltos',
];

export const ESTADO_UI_META: Record<EstadoAutoUI, EstadoUIMeta> = {
  pendientes: { key: 'pendientes', label: 'Pendientes', color: '#64748B', colorSuave: '#F1F5F9' },
  en_revision: { key: 'en_revision', label: 'En revisión', color: '#F59E0B', colorSuave: '#FEF3C7' },
  aprobados: { key: 'aprobados', label: 'Aprobados', color: '#10B981', colorSuave: '#D1FAE5' },
  devueltos: { key: 'devueltos', label: 'Devueltos', color: '#EF4444', colorSuave: '#FEE2E2' },
};

export function mapAutoStatusToUI(estado?: string | null): EstadoAutoUI | null {
  switch ((estado || '').toUpperCase()) {
    case 'BORRADOR':
      return 'pendientes';
    case 'REVISION_JEFE':
      return 'en_revision';
    case 'APROBADO':
    case 'FIRMADO':
    case 'NOTIFICADO':
      return 'aprobados';
    case 'DEVUELTO':
      return 'devueltos';
    default:
      return null;
  }
}

export type ConteosEstado = Record<EstadoAutoUI, number>;

export const CONTEOS_VACIOS: ConteosEstado = {
  pendientes: 0,
  en_revision: 0,
  aprobados: 0,
  devueltos: 0,
};

/**
 * Reduce una lista de autos a un mapa processId -> estado UI, usando el auto
 * MÁS RECIENTE de cada proceso (por createdAt). Solo considera procesos cuyo id
 * esté en `procesoIdsVisibles` (alcance por rol del dashboard).
 */
export function construirMapaEstadoPorProceso(
  autos: Array<{ processId?: string; estado?: string; createdAt?: string }>,
  procesoIdsVisibles?: Set<string> | null,
): Map<string, EstadoAutoUI> {
  const ultimoPorProceso = new Map<string, { estado: EstadoAutoUI; fecha: number }>();

  for (const auto of autos) {
    const pid = auto.processId;
    if (!pid) continue;
    if (procesoIdsVisibles && !procesoIdsVisibles.has(pid)) continue;

    const estadoUI = mapAutoStatusToUI(auto.estado);
    if (!estadoUI) continue;

    const fecha = auto.createdAt ? new Date(auto.createdAt).getTime() : 0;
    const actual = ultimoPorProceso.get(pid);
    if (!actual || fecha >= actual.fecha) {
      ultimoPorProceso.set(pid, { estado: estadoUI, fecha });
    }
  }

  const resultado = new Map<string, EstadoAutoUI>();
  for (const [pid, { estado }] of ultimoPorProceso) {
    resultado.set(pid, estado);
  }
  return resultado;
}

export function contarEstados(mapa: Map<string, EstadoAutoUI>): ConteosEstado {
  const conteos: ConteosEstado = { ...CONTEOS_VACIOS };
  for (const estado of mapa.values()) {
    conteos[estado] += 1;
  }
  return conteos;
}
