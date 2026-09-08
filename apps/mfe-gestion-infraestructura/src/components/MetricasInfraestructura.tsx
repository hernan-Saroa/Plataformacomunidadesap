import React from 'react';
import { Building2, CheckCircle2, Wrench, Calendar, Sparkles } from 'lucide-react';
import { EstadisticasInfraestructura } from '../services/infraestructuraService';

interface MetricasProps {
  stats: EstadisticasInfraestructura;
}

export const MetricasInfraestructura: React.FC<MetricasProps> = ({ stats }) => {
  const cards = [
    {
      title: 'Total Espacios Físicos',
      value: stats.total,
      subtitle: 'Aulas, Auditorios y Labs',
      icon: Building2,
      color: 'from-blue-600 to-indigo-700',
      textColor: 'text-blue-600',
      bgLight: 'bg-blue-50',
    },
    {
      title: 'Espacios Disponibles',
      value: stats.disponibles,
      subtitle: 'Listos para asignación académica',
      icon: CheckCircle2,
      color: 'from-emerald-500 to-teal-700',
      textColor: 'text-emerald-600',
      bgLight: 'bg-emerald-50',
    },
    {
      title: 'En Mantenimiento',
      value: stats.enMantenimiento,
      subtitle: 'Órdenes activas en curso',
      icon: Wrench,
      color: 'from-amber-500 to-orange-600',
      textColor: 'text-amber-600',
      bgLight: 'bg-amber-50',
    },
    {
      title: 'Tasa de Disponibilidad',
      value: `${100 - stats.porcentajeOcupacion}%`,
      subtitle: 'Capacidad operativa global',
      icon: Sparkles,
      color: 'from-purple-600 to-pink-600',
      textColor: 'text-purple-600',
      bgLight: 'bg-purple-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  {card.title}
                </p>
                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                  {card.value}
                </h3>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.bgLight} ${card.textColor} group-hover:scale-110 transition-transform duration-300 shadow-inner`}>
                <Icon className="w-6 h-6" strokeWidth={2.2} />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-medium text-slate-500">
              <span>{card.subtitle}</span>
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${card.color} opacity-80`} />
          </div>
        );
      })}
    </div>
  );
};
