import React from 'react';
import { Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import {
  calcularTiempoLimite,
  calcularDiasHabilesRestantes,
  clasificarEstadoPlazo,
  EstadoTiempoLimite,
} from '../utils/diasHabilesUtils';
import { useFestivos } from '../hooks/useFestivos';

export interface ContadorDiasHabilesBadgeProps {
  /** Fecha límite o fecha objetivo (YYYY-MM-DD o Date) */
  fechaLimite?: string | Date | null;
  /** Fecha de inicio para cálculo de plazo completo */
  fechaInicio?: string | Date | null;
  /** Días hábiles de plazo otorgados */
  diasPlazo?: number;
  /** Días hábiles ya calculados directamente (opcional) */
  diasHabiles?: number | null;
  /** Si es extemporánea */
  extemporanea?: boolean;
  /** Texto prefijo opcional */
  prefijo?: string;
  /** Tamaño del badge */
  tamano?: 'sm' | 'md';
  /** Mostrar icono */
  conIcono?: boolean;
  /** Clases CSS adicionales */
  className?: string;
}

/**
 * Badge visual profesional para visualización de días hábiles y tiempo límite.
 */
export const ContadorDiasHabilesBadge: React.FC<ContadorDiasHabilesBadgeProps> = ({
  fechaLimite,
  fechaInicio,
  diasPlazo,
  diasHabiles,
  extemporanea,
  prefijo,
  tamano = 'sm',
  conIcono = true,
  className = '',
}) => {
  const { festivos } = useFestivos();

  // Caso 1: Días hábiles proporcionados directamente
  if (typeof diasHabiles === 'number') {
    let colorClase = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    let Icono = CheckCircle;

    if (extemporanea || diasHabiles < 5) {
      colorClase = 'bg-amber-50 text-amber-700 border-amber-300';
      Icono = AlertTriangle;
    }

    const textoDias = `${diasHabiles} ${diasHabiles === 1 ? 'día hábil' : 'días hábiles'}`;
    const textoCompleto = prefijo ? `${prefijo}: ${textoDias}` : textoDias;

    return (
      <span
        className={`inline-flex items-center gap-1 font-semibold rounded-full border px-2 py-0.5 ${
          tamano === 'sm' ? 'text-[10px]' : 'text-xs'
        } ${colorClase} ${className}`}
        title={`${textoCompleto} (excluye fines de semana y festivos oficiales de Auth)`}
      >
        {conIcono && <Icono className={tamano === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />}
        <span>{textoCompleto}</span>
      </span>
    );
  }

  // Caso 2: Cálculo a partir de fecha de inicio y días de plazo
  if (fechaInicio && diasPlazo) {
    const res = calcularTiempoLimite(fechaInicio, diasPlazo, festivos);
    return renderBadgePorEstado(res.estado, res.diasRestantes, res.fechaVencimiento, prefijo, tamano, conIcono, className);
  }

  // Caso 3: Cálculo a partir de fecha límite directa
  if (fechaLimite) {
    const diasRestantes = calcularDiasHabilesRestantes(fechaLimite, new Date(), festivos);
    const estado: EstadoTiempoLimite = clasificarEstadoPlazo(diasRestantes);
    return renderBadgePorEstado(estado, diasRestantes, String(fechaLimite), prefijo, tamano, conIcono, className);
  }

  return null;
};

function renderBadgePorEstado(
  estado: EstadoTiempoLimite,
  diasRestantes: number,
  fechaVencimiento: string,
  prefijo?: string,
  tamano: 'sm' | 'md' = 'sm',
  conIcono: boolean = true,
  className: string = '',
) {
  let colorClase = 'bg-slate-100 text-slate-700 border-slate-200';
  let Icono = Clock;
  let etiqueta = '';

  switch (estado) {
    case 'VIGENTE':
      colorClase = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      Icono = CheckCircle;
      etiqueta = `${diasRestantes} ${diasRestantes === 1 ? 'día hábil' : 'días hábiles'}`;
      break;
    case 'POR_VENCER':
      colorClase = 'bg-amber-50 text-amber-800 border-amber-300';
      Icono = AlertTriangle;
      etiqueta = diasRestantes === 0 ? 'Vence hoy' : `${diasRestantes} d. hábiles restantes`;
      break;
    case 'VENCIDO':
      colorClase = 'bg-rose-50 text-rose-700 border-rose-200';
      Icono = XCircle;
      const diasPos = Math.abs(diasRestantes);
      etiqueta = `Vencido hace ${diasPos} ${diasPos === 1 ? 'día' : 'días'}`;
      break;
    case 'SIN_PLAZO':
    default:
      colorClase = 'bg-slate-100 text-slate-600 border-slate-200';
      Icono = Clock;
      etiqueta = 'Sin límite';
      break;
  }

  const textoFinal = prefijo ? `${prefijo}: ${etiqueta}` : etiqueta;

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full border px-2 py-0.5 ${
        tamano === 'sm' ? 'text-[10px]' : 'text-xs'
      } ${colorClase} ${className}`}
      title={`Vence: ${fechaVencimiento} (conteo en días hábiles sin sábados, domingos ni festivos oficiales)`}
    >
      {conIcono && <Icono className={tamano === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />}
      <span>{textoFinal}</span>
    </span>
  );
}

export default ContadorDiasHabilesBadge;
