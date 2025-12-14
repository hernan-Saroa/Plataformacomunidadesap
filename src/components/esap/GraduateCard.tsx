import { motion } from 'motion/react';
import { GraduationCap, Award, Calendar, TrendingUp, Eye, CheckCircle, FileCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

export interface GraduateCardProps {
  id: string;
  nombre: string;
  apellido: string;
  documento: string;
  programa: string;
  tituloObtenido: string;
  fechaGrado: string;
  promedio: number;
  onViewDetails?: () => void;
  onGenerateCertificate?: () => void;
}

/**
 * Componente unificado de carta de graduado
 * Diseño premium inspirado en Linear, Notion y Arc Browser
 */
export function GraduateCard({
  nombre,
  apellido,
  documento,
  programa,
  tituloObtenido,
  fechaGrado,
  promedio,
  onViewDetails,
  onGenerateCertificate,
}: GraduateCardProps) {
  
  // Color scheme unificado en azul ESAP para entidad gubernamental
  const getGradeColor = (grade: number) => {
    if (grade >= 4.5) {
      return {
        bg: 'from-blue-50 to-indigo-50',
        border: 'border-blue-300',
        icon: 'text-[#1e5da8]',
        badge: 'bg-[#1e5da8] text-white border-white',
        gradient: 'from-[#1e5da8] to-[#154a85]',
      };
    } else if (grade >= 4.0) {
      return {
        bg: 'from-blue-50 to-sky-50',
        border: 'border-blue-200',
        icon: 'text-blue-600',
        badge: 'bg-blue-500 text-white border-white',
        gradient: 'from-blue-500 to-blue-600',
      };
    } else if (grade >= 3.5) {
      return {
        bg: 'from-slate-50 to-blue-50',
        border: 'border-slate-200',
        icon: 'text-slate-600',
        badge: 'bg-slate-500 text-white border-white',
        gradient: 'from-slate-500 to-slate-600',
      };
    } else {
      return {
        bg: 'from-gray-50 to-slate-50',
        border: 'border-gray-200',
        icon: 'text-gray-600',
        badge: 'bg-gray-500 text-white border-white',
        gradient: 'from-gray-500 to-slate-600',
      };
    }
  };

  const colors = getGradeColor(promedio);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group relative bg-white rounded-2xl border-2 border-gray-200 overflow-hidden hover:shadow-2xl hover:border-[#1e5da8]/40 transition-all duration-300"
    >
      {/* Header con gradiente de color basado en promedio */}
      <div className={`h-2 bg-gradient-to-r ${colors.gradient}`} />

      {/* Card Content */}
      <div className="p-5">
        {/* Avatar y nombre */}
        <div className="flex items-start gap-4 mb-5">
          {/* Avatar con icono de graduación */}
          <div className={`relative flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br ${colors.bg} border-2 ${colors.border} flex items-center justify-center shadow-lg`}>
            <GraduationCap className={`w-8 h-8 ${colors.icon}`} strokeWidth={2.5} />
            
            {/* Badge de promedio en esquina */}
            <div className={`absolute -bottom-2 -right-2 px-2 py-0.5 rounded-lg ${colors.badge} border-2 shadow-sm`}>
              <span className="text-xs font-bold">{promedio.toFixed(1)}</span>
            </div>
          </div>

          {/* Información principal */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 mb-1 truncate group-hover:text-[#1e5da8] transition-colors">
              {nombre} {apellido}
            </h3>
            <p className="text-sm text-gray-600 mb-2 line-clamp-1">
              {tituloObtenido}
            </p>
            
            {/* Badge de documento verificado */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#1e5da8]/10 to-[#154a85]/10 border border-[#1e5da8]/30">
              <CheckCircle className="w-3.5 h-3.5 text-[#1e5da8]" strokeWidth={2.5} />
              <span className="text-xs font-bold text-[#1e5da8] font-mono">{documento}</span>
            </div>
          </div>
        </div>

        {/* Información detallada */}
        <div className="space-y-3 mb-5">
          {/* Programa */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200 group-hover:bg-[#1e5da8]/5 group-hover:border-[#1e5da8]/20 transition-all">
            <Award className="w-4 h-4 text-[#1e5da8] flex-shrink-0 mt-0.5" strokeWidth={2} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-0.5">Programa</p>
              <p className="text-sm font-semibold text-gray-900 line-clamp-2">{programa}</p>
            </div>
          </div>

          {/* Grid: Graduación y Promedio */}
          <div className="grid grid-cols-2 gap-3">
            {/* Fecha de graduación */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" strokeWidth={2} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-0.5">Graduación</p>
                <p className="text-xs font-semibold text-gray-900">
                  {formatDate(fechaGrado)}
                </p>
              </div>
            </div>

            {/* Promedio destacado */}
            <div className={`flex items-start gap-2 p-3 rounded-xl bg-gradient-to-br ${colors.bg} border-2 ${colors.border}`}>
              <TrendingUp className={`w-4 h-4 ${colors.icon} flex-shrink-0 mt-0.5`} strokeWidth={2} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600 mb-0.5">Promedio</p>
                <p className={`font-bold ${colors.icon}`}>{promedio.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de acción - MOBILE FIRST OPTIMIZED */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onViewDetails}
                className="group/btn w-full px-4 py-2.5 sm:py-3 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center gap-2 border-2 border-gray-300 hover:border-[#1e5da8] hover:text-[#1e5da8] shadow-sm hover:shadow-md"
              >
                <Eye className="w-4 h-4 transition-transform group-hover/btn:scale-110" strokeWidth={2} />
                <span className="text-sm">Ver</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>Ver información completa del graduado</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onGenerateCertificate}
                className="group/btn w-full px-4 py-2.5 sm:py-3 bg-gradient-to-r from-[#1e5da8] to-[#154a85] text-white rounded-xl font-semibold hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-md"
              >
                <FileCheck className="w-4 h-4 transition-transform group-hover/btn:rotate-12" strokeWidth={2} />
                <span className="text-sm">Certificado</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>Generar certificado de graduación</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Hover effect border */}
      <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-[#1e5da8]/20 pointer-events-none transition-all" />
    </motion.div>
  );
}