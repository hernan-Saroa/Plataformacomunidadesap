/**
 * ModalHeaderClean - Header Limpio y Usable ESAP 2025
 * ✅ Diseño minimalista con fondo blanco/gris claro
 * ✅ Sin gradientes fuertes  
 * ✅ Iconos, títulos y subtítulos bien alineados
 * ✅ Botón de cerrar siempre visible
 * ✅ Soporte para ambas versiones de props (retrocompatibilidad)
 */

import { X, LucideIcon } from 'lucide-react';

interface ModalHeaderCleanProps {
  // Props versión original
  title?: string;
  subtitle?: string;
  onClose: () => void;
  
  // Props versión extendida (gestion-legal)
  titulo?: string;
  subtitulo?: string;
  icono?: LucideIcon;
  colorIcono?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'yellow';
  badgePrincipal?: string;
}

export function ModalHeaderClean({
  title,
  subtitle,
  titulo,
  subtitulo,
  icono: Icono,
  colorIcono = 'blue',
  badgePrincipal,
  onClose
}: ModalHeaderCleanProps) {
  // Usar props extendidas si están disponibles, sino usar props originales
  const tituloFinal = titulo || title || '';
  const subtituloFinal = subtitulo || subtitle;
  
  // Colores por tipo
  const coloresIcono = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
    yellow: 'bg-yellow-100 text-yellow-600',
  };

  const coloresBadge = {
    blue: 'bg-blue-600 text-white',
    green: 'bg-green-600 text-white',
    purple: 'bg-purple-600 text-white',
    orange: 'bg-orange-600 text-white',
    red: 'bg-red-600 text-white',
    yellow: 'bg-yellow-600 text-white',
  };

  return (
    <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          {/* Icono (solo si está presente) */}
          {Icono && (
            <div className={`p-3 rounded-xl ${coloresIcono[colorIcono]} flex-shrink-0`}>
              <Icono className="w-6 h-6" />
            </div>
          )}
          
          {/* Título y subtítulo */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-gray-900">
                {tituloFinal}
              </h2>
              {badgePrincipal && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${coloresBadge[colorIcono]}`}>
                  {badgePrincipal}
                </span>
              )}
            </div>
            {subtituloFinal && (
              <p className="text-sm text-gray-600 mt-1">
                {subtituloFinal}
              </p>
            )}
          </div>
        </div>
        
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="ml-4 p-2 hover:bg-white/50 rounded-lg transition-colors flex-shrink-0"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
