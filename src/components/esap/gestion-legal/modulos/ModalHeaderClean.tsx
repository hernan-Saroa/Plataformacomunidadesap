/**
 * ModalHeaderClean - Header Limpio y Usable ESAP 2025
 * ✅ Diseño minimalista con fondo blanco/gris claro
 * ✅ Sin gradientes fuertes
 * ✅ Totalmente reutilizable
 */

import { X, LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface BadgeConfig {
  texto: string;
  color: 'azul' | 'naranja' | 'verde' | 'rojo' | 'gris' | 'morado';
}

interface ModalHeaderCleanProps {
  titulo: string;
  subtitulo?: string;
  icono: LucideIcon;
  colorIcono?: string; // Color del icono y borde (ej: 'purple', 'blue', 'orange')
  badges?: ReactNode | BadgeConfig[]; // Badges personalizados o array de configuración
  badgePrincipal?: string; // Badge principal (ej: "CONTESTACIÓN")
  actions?: ReactNode; // Botones de acción (ej: Editar, Archivar)
  onClose: () => void;
}

export function ModalHeaderClean({
  titulo,
  subtitulo,
  icono: Icono,
  colorIcono = 'blue',
  badges,
  badgePrincipal,
  actions,
  onClose
}: ModalHeaderCleanProps) {

  // Validación defensiva: Si no hay icono, usar un icono por defecto
  if (!Icono) {
    console.error('ModalHeaderClean: No se proporcionó un icono válido');
    return null;
  }

  // Configuración de colores según el tema
  const colores = {
    purple: {
      bgIcon: 'bg-purple-50',
      borderIcon: 'border-purple-200',
      colorIcon: 'text-purple-600',
      bgBadge: 'bg-purple-100',
      textBadge: 'text-purple-700',
      borderBadge: 'border-purple-300'
    },
    blue: {
      bgIcon: 'bg-blue-50',
      borderIcon: 'border-blue-200',
      colorIcon: 'text-blue-600',
      bgBadge: 'bg-blue-100',
      textBadge: 'text-blue-700',
      borderBadge: 'border-blue-300'
    },
    orange: {
      bgIcon: 'bg-orange-50',
      borderIcon: 'border-orange-200',
      colorIcon: 'text-orange-600',
      bgBadge: 'bg-orange-100',
      textBadge: 'text-orange-700',
      borderBadge: 'border-orange-300'
    },
    green: {
      bgIcon: 'bg-green-50',
      borderIcon: 'border-green-200',
      colorIcon: 'text-green-600',
      bgBadge: 'bg-green-100',
      textBadge: 'text-green-700',
      borderBadge: 'border-green-300'
    },
    red: {
      bgIcon: 'bg-red-50',
      borderIcon: 'border-red-200',
      colorIcon: 'text-red-600',
      bgBadge: 'bg-red-100',
      textBadge: 'text-red-700',
      borderBadge: 'border-red-300'
    },
    indigo: {
      bgIcon: 'bg-indigo-50',
      borderIcon: 'border-indigo-200',
      colorIcon: 'text-indigo-600',
      bgBadge: 'bg-indigo-100',
      textBadge: 'text-indigo-700',
      borderBadge: 'border-indigo-300'
    }
  };

  const tema = colores[colorIcono as keyof typeof colores] || colores.blue;

  // Función para renderizar badges según el color
  const renderBadge = (badge: BadgeConfig, index: number) => {
    const estilosBadge = {
      azul: 'bg-blue-100 text-blue-700 border-blue-300',
      naranja: 'bg-orange-100 text-orange-700 border-orange-300',
      verde: 'bg-green-100 text-green-700 border-green-300',
      rojo: 'bg-red-100 text-red-700 border-red-300',
      gris: 'bg-gray-100 text-gray-700 border-gray-300',
      morado: 'bg-purple-100 text-purple-700 border-purple-300'
    };

    return (
      <span
        key={index}
        className={`inline-flex items-center rounded-md px-2 py-0.5 ${estilosBadge[badge.color]} font-semibold text-xs border`}
      >
        {badge.texto}
      </span>
    );
  };

  // Determinar si badges es un array de configuración o ReactNode
  const isBadgeConfigArray = Array.isArray(badges) && badges.length > 0 && badges[0] && typeof badges[0] === 'object' && 'texto' in badges[0];

  return (
    <div className="px-6 py-5 bg-white border-b flex-shrink-0">
      {/* Ocultar el botón X automático del DialogContent */}
      <style>{`
        .config-dialog-close {
          display: none !important;
        }
      `}</style>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4 flex-1">
          {/* Icono */}
          <div className={`p-3 rounded-xl ${tema.bgIcon} border-2 ${tema.borderIcon} flex-shrink-0`}>
            <Icono className={`w-6 h-6 ${tema.colorIcon}`} />
          </div>

          {/* Título y Badges */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-black text-gray-900">
                {titulo}
              </h2>
              {badgePrincipal && (
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 ${tema.bgBadge} ${tema.textBadge} ${tema.borderBadge} font-bold text-xs border`}>
                  {badgePrincipal}
                </span>
              )}
            </div>

            {subtitulo && (
              <p className="text-sm text-gray-600 mb-2">
                {subtitulo}
              </p>
            )}

            {badges && (
              <div className="flex items-center gap-2 flex-wrap">
                {isBadgeConfigArray
                  ? (badges as BadgeConfig[]).map((badge, index) => renderBadge(badge, index))
                  : badges as ReactNode
                }
              </div>
            )}
          </div>
        </div>

        {/* Acciones y Botón Cerrar */}
        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-7 h-7" />
          </button>
        </div>
      </div>
    </div>
  );
}
