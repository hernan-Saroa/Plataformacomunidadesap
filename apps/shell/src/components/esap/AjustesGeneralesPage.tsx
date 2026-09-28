/**
 * Página de Ajustes Generales ESAP.
 *
 * Catálogo maestro transversal (`auth`) que centraliza:
 * - Salario Mínimo Legal Vigente (SMMLV) monetario.
 * - Días Festivos Nacionales de Colombia con sincronización automática vía API.
 *
 * Se accede desde "Configuración General > Ajustes Generales" en el sidebar del Backoffice.
 */
import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import AjustesGeneralesPanel from './admin/AjustesGeneralesPanel';

export default function AjustesGeneralesPage() {
  return (
    <div
      className="flex flex-col h-full bg-slate-50/50"
      style={{ minHeight: '100%', backgroundColor: '#F8FAFC' }}
    >
      {/* HEADER DE PÁGINA ESAP */}
      <header
        className="px-6 py-5 border-b shadow-sm"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
      >
        <div className="flex items-center gap-3.5 max-w-6xl mx-auto">
          <div
            className="p-2.5 rounded-xl text-white shadow-sm flex-shrink-0"
            style={{ backgroundColor: '#003DA5' }}
          >
            <SlidersHorizontal className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1
              className="text-lg sm:text-xl font-bold tracking-tight truncate"
              style={{ color: '#0F172A' }}
            >
              Ajustes Generales
            </h1>
            <p
              className="text-xs sm:text-xs font-medium mt-0.5"
              style={{ color: '#64748B' }}
            >
              Configuración de datos maestros transversales: Salario Mínimo (SMMLV) y Días Festivos Nacionales.
            </p>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <AjustesGeneralesPanel />
        </div>
      </main>
    </div>
  );
}
