/**
 * ModuleInfoTooltip - Componente para mostrar información contextual de módulos
 * Discreto pero útil para explicar propósito, historia o cambios importantes
 * 
 * USO:
 * <ModuleInfoTooltip
 *   title="Acerca de este módulo"
 *   sections={[
 *     { label: "Propósito", content: "..." },
 *     { label: "Nota", content: "...", type: "info" }
 *   ]}
 * />
 */

import { useState } from 'react';
import { Info, X, Lightbulb, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';

interface InfoSection {
  label: string;
  content: string;
  type?: 'default' | 'info' | 'success' | 'warning' | 'premium';
}

interface ModuleInfoTooltipProps {
  title: string;
  sections: InfoSection[];
  variant?: 'icon' | 'badge';
}

export function ModuleInfoTooltip({ 
  title, 
  sections,
  variant = 'icon'
}: ModuleInfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getIconForType = (type?: string) => {
    switch (type) {
      case 'info':
        return <Info className="w-4 h-4 text-blue-600" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      case 'premium':
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      default:
        return <Lightbulb className="w-4 h-4 text-gray-600" />;
    }
  };

  const getColorForType = (type?: string) => {
    switch (type) {
      case 'info':
        return 'bg-blue-50 border-blue-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'premium':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      {variant === 'icon' ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors rounded-md hover:bg-gray-100"
          title="Información del módulo"
        >
          <Info className="w-4 h-4" />
          <span className="hidden sm:inline">Info</span>
        </button>
      ) : (
        <Badge
          onClick={() => setIsOpen(!isOpen)}
          className="cursor-pointer bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
        >
          <Info className="w-3 h-3 mr-1" />
          Acerca de
        </Badge>
      )}

      {/* Popover Card */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Popover */}
          <Card className="absolute right-0 top-full mt-2 z-50 w-80 md:w-96 shadow-lg border-2">
            {/* Header */}
            <div className="p-4 pb-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900">{title}</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sections */}
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {sections.map((section, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${getColorForType(section.type)}`}
                >
                  <div className="flex items-start gap-2">
                    {getIconForType(section.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 mb-1">
                        {section.label}
                      </p>
                      <p className="text-xs text-gray-700 leading-relaxed">
                        {section.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-3 pt-2 border-t bg-gray-50">
              <p className="text-xs text-gray-500 text-center">
                Sistema SIGL v5.0 · Backoffice ESAP
              </p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
