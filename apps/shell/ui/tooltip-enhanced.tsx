import * as React from 'react';
import { useState } from 'react';

// Componente simplificado de Tooltip sin dependencias externas
interface TooltipProps {
  children: React.ReactNode;
  content: string | React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delayDuration?: number;
  shortcut?: string; // Para mostrar atajos de teclado
}

export function Tooltip({ 
  children, 
  content, 
  side = 'top', 
  delayDuration = 300,
  shortcut 
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    const id = setTimeout(() => {
      setIsVisible(true);
    }, delayDuration);
    setTimeoutId(id);
  };

  const hideTooltip = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setIsVisible(false);
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap pointer-events-none animate-in fade-in-0 zoom-in-95 ${positionClasses[side]} max-w-xs`}
        >
          <div className="flex items-center gap-2">
            <span>{content}</span>
            {shortcut && (
              <kbd className="px-1.5 py-0.5 bg-gray-700 border border-gray-600 rounded text-xs font-mono">
                {shortcut}
              </kbd>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
