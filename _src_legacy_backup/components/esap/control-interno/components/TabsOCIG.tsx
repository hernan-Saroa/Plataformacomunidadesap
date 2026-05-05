/**
 * ═════════════════════════════════════════════════════════════════════════
 * TABS OCI - COMPONENTE REUTILIZABLE
 * ═════════════════════════════════════════════════════════════════════════
 * 
 * Sistema de tabs para módulos OCI
 * Estilo según especificaciones de diseño ESAP
 * 
 * @version 1.0
 */

import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

// ═════════════════════════════════════════════════════════════════════════
// TIPOS
// ═════════════════════════════════════════════════════════════════════════

export interface Tab {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: number | string;
  content: ReactNode;
  disabled?: boolean;
}

interface TabsOCIProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

// ═════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════

export function TabsOCI({
  tabs,
  activeTab,
  onTabChange,
  className = '',
}: TabsOCIProps) {
  
  const activeTabData = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className={className}>
      {/* HEADER DE TABS */}
      <div className="border-b border-gray-200 bg-white">
        <div className="flex items-center gap-1 px-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTab;

            return (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && onTabChange(tab.id)}
                disabled={tab.disabled}
                className={`
                  relative flex items-center gap-2 px-4 py-3 text-sm font-medium
                  border-b-2 transition-all whitespace-nowrap
                  ${isActive
                    ? 'border-[#2874A6] text-[#1B4F72] bg-[#E8F4F8]'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }
                  ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {Icon && <Icon className="w-4 h-4" />}
                <span>{tab.label}</span>
                
                {/* Badge */}
                {tab.badge !== undefined && (
                  <span
                    className={`
                      px-1.5 py-0.5 rounded-full text-xs font-semibold
                      ${isActive
                        ? 'bg-[#2874A6] text-white'
                        : 'bg-gray-200 text-gray-700'
                      }
                    `}
                  >
                    {tab.badge}
                  </span>
                )}

                {/* Indicador activo */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2874A6]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENIDO DEL TAB */}
      <div className="bg-gray-50">
        {activeTabData?.content}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═════════════════════════════════════════════════════════════════════════

export default TabsOCI;
