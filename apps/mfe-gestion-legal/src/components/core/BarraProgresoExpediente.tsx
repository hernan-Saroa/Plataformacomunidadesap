/**
 * BarraProgresoExpediente - Barra de progreso con semáforo COMPARTIDA
 * ✅ Usada por ModalExpediente.tsx y ModalProcesoDisciplinario.tsx
 */

import { calcularProgreso } from './expedienteShared';

interface BarraProgresoExpedienteProps {
  diasTotales: number;
  diasRestantes: number;
  compact?: boolean;
  etapa?: string;
  columnasTablero?: any[];
  documentos?: any[];
  actuaciones?: any[];
}

export function BarraProgresoExpediente({
  diasTotales,
  diasRestantes,
  compact = false,
  etapa,
  columnasTablero,
  documentos,
  actuaciones
}: BarraProgresoExpedienteProps) {
  const { porcentajeTiempo, procesoVencido } = calcularProgreso(
    diasTotales,
    diasRestantes,
    etapa,
    columnasTablero,
    documentos,
    actuaciones
  );

  if (compact) {
    return (
      <div className="flex items-center gap-3 px-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Progreso</span>
          <span className={`text-sm font-black ${procesoVencido ? 'text-red-600' : 'text-blue-600'}`}>
            {porcentajeTiempo}%
          </span>
        </div>
        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
          <div
            className={`h-full transition-all duration-500 ${procesoVencido ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-green-400 to-blue-500'}`}
            style={{ width: `${porcentajeTiempo}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 bg-gray-50 border-b px-6 py-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-gray-700">
          Progreso del Proceso
          {procesoVencido && (
            <span className="ml-2 text-red-600 font-black">⚠ Vencido</span>
          )}
        </span>
        <span className={`text-xs font-black ${procesoVencido ? 'text-red-600' : 'text-blue-600'}`}>
          {porcentajeTiempo}%
        </span>
      </div>
      <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${procesoVencido ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-green-500 to-blue-500'}`}
          style={{ width: `${porcentajeTiempo}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-600">
          {diasTotales - diasRestantes} días transcurridos
        </span>
        <span className={`text-xs ${procesoVencido ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
          {procesoVencido
            ? `${Math.abs(diasRestantes)} días de mora`
            : `${diasRestantes} días restantes`
          }
        </span>
      </div>
    </div>
  );
}
