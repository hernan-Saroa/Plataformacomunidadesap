/**
 * TEST: Gestión de Auditorías
 * Componente de prueba para testear el módulo de auditorías
 */

import { GestionAuditoriasSimple } from './GestionAuditoriasSimple';

interface TestGestionAuditoriasProps {
  onBack: () => void;
}

export function TestGestionAuditorias({ onBack }: TestGestionAuditoriasProps) {
  return (
    <div className="min-h-screen" style={{ background: '#F3F4F6' }}>
      {/* Header de prueba */}
      <div className="p-4 border-b-2" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black" style={{ color: '#003DA5' }}>
              TEST: Gestión de Auditorías
            </h1>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Módulo completo con 4 vistas funcionales
            </p>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-lg font-bold transition-colors"
              style={{ background: '#E5E7EB', color: '#1F2937' }}
            >
              ← Volver
            </button>
          )}
        </div>
      </div>

      {/* Contenedor principal */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <GestionAuditoriasSimple />
        </div>
      </div>
    </div>
  );
}