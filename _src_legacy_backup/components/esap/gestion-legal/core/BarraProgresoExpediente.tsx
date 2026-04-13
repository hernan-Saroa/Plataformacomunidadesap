/**
 * BarraProgresoExpediente - Barra de progreso con semáforo COMPARTIDA
 * ✅ Usada por ModalExpediente.tsx y ModalProcesoDisciplinario.tsx
 */

import { calcularProgreso } from './expedienteShared';

interface BarraProgresoExpedienteProps {
  diasTotales: number;
  diasRestantes: number;
}

export function BarraProgresoExpediente({ diasTotales, diasRestantes }: BarraProgresoExpedienteProps) {
  const { porcentajeTiempo, procesoVencido } = calcularProgreso(diasTotales, diasRestantes);

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
