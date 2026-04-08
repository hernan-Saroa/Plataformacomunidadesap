import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

type EstadoCaso =
  | 'inicial'
  | 'en_revision'
  | 'asignado'
  | 'en_proceso'
  | 'requiere_accion'
  | 'pendiente_aprobacion'
  | 'en_espera'
  | 'completado'
  | 'archivado'
  | 'vencido';

interface HistorialItem {
  etapa: EstadoCaso;
  fechaInicio: Date;
  fechaFin: Date;
  duracionDias: number;
  usuario: {
    nombre: string;
    iniciales: string;
    color: string;
  };
  observaciones?: string;
  cumplePlazos?: 'excelente' | 'bueno' | 'riesgo';
}

interface WorkflowVisualCasoProps {
  estadoActual: EstadoCaso;
  moduloId: string;
  historial: HistorialItem[];
  fechaInicio: Date;
  fechaVencimiento: Date;
  diasRestantes: number;
}

/**
 * Visual simple del flujo del caso.
 * Muestra estado actual, días restantes y una línea de tiempo corta.
 */
export function WorkflowVisualCaso({
  estadoActual,
  moduloId,
  historial,
  fechaInicio,
  fechaVencimiento,
  diasRestantes,
}: WorkflowVisualCasoProps) {
  const badgeColor =
    estadoActual === 'completado'
      ? 'bg-green-100 text-green-800 border-green-200'
      : diasRestantes < 0 || estadoActual === 'vencido'
      ? 'bg-red-100 text-red-800 border-red-200'
      : 'bg-blue-100 text-blue-800 border-blue-200';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${badgeColor}`}>
          Estado: {estadoActual.replace('_', ' ')}
        </span>
        <span className="px-3 py-1 rounded-full border border-gray-200 text-gray-700 text-sm">
          Módulo: {moduloId}
        </span>
        <span
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-sm font-semibold ${
            diasRestantes < 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          {diasRestantes < 0 ? 'Vencido' : `${diasRestantes} días restantes`}
        </span>
        <span className="text-sm text-gray-600">
          Inicio: {fechaInicio.toLocaleDateString()} • Vence: {fechaVencimiento.toLocaleDateString()}
        </span>
      </div>

      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <h4 className="font-semibold text-sm text-gray-800 mb-3">Historial de Etapas</h4>
        <div className="space-y-3">
          {historial.map((item) => {
            const Icon = item.cumplePlazos === 'riesgo' ? AlertTriangle : CheckCircle2;
            const iconColor =
              item.cumplePlazos === 'riesgo'
                ? 'text-amber-500'
                : item.cumplePlazos === 'excelente'
                ? 'text-green-600'
                : 'text-blue-600';

            return (
              <div
                key={`${item.etapa}-${item.fechaInicio.toISOString()}`}
                className="flex items-start gap-3 rounded-lg border border-gray-100 p-3"
              >
                <Icon className={`w-5 h-5 mt-0.5 ${iconColor}`} />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium capitalize text-gray-900">{item.etapa.replace('_', ' ')}</span>
                    <span className="text-xs text-gray-500">
                      {item.fechaInicio.toLocaleDateString()} → {item.fechaFin.toLocaleDateString()}
                    </span>
                    <span className="text-xs text-gray-500">({item.duracionDias} días)</span>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs text-white"
                      style={{ backgroundColor: item.usuario.color }}
                    >
                      {item.usuario.iniciales} · {item.usuario.nombre}
                    </span>
                  </div>
                  {item.observaciones && <p className="text-sm text-gray-700">{item.observaciones}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
