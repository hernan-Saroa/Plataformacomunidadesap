/**
 * ModalHeaderClean - Header Limpio y Usable ESAP 2025
 * ✅ Diseño minimalista con fondo blanco/gris claro
 * ✅ Sin gradientes fuertes
 * ✅ Iconos, títulos y subtítulos bien alineados
 * ✅ Botón de cerrar siempre visible
 */

import { X } from 'lucide-react';

interface ModalHeaderCleanProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
}

export function ModalHeaderClean({
  title,
  subtitle,
  onClose
}: ModalHeaderCleanProps) {
  return (
    <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-gray-600">
              {subtitle}
            </p>
          )}
        </div>
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
