import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface UnsavedBannerProps {
  show: boolean;
  onDiscard: () => void;
  onSave: () => void;
}

export function UnsavedBanner({ show, onDiscard, onSave }: UnsavedBannerProps) {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    setIsMobile(window.innerWidth <= 767);
    
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 767);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const bottomPosition = isMobile ? '80px' : '24px';
  
  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 bg-[--esap-gray-900] text-white px-6 py-4 md:px-6 md:py-4 rounded-2xl flex flex-col md:flex-row items-center gap-5 z-[1000] max-w-[calc(100%-2rem)] md:max-w-[600px] transition-all duration-300 ${
        show ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'
      }`}
      style={{ 
        boxShadow: 'var(--esap-shadow-2xl)',
        bottom: bottomPosition
      }}
    >
      <AlertTriangle className="w-5 h-5 text-[--esap-warning] flex-shrink-0" />
      <div className="flex-1 text-center md:text-left">
        <div className="font-semibold text-sm mb-0.5">Tienes cambios sin guardar</div>
        <div className="text-[13px] text-[--esap-gray-400]">
          Recuerda guardar tu progreso antes de salir
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
        <button
          onClick={onDiscard}
          className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-transparent text-[--esap-gray-400] hover:opacity-80 transition-opacity"
        >
          Descartar
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-white text-[--esap-gray-900] hover:opacity-80 transition-opacity"
        >
          Guardar (Ctrl+S)
        </button>
      </div>
    </div>
  );
}
