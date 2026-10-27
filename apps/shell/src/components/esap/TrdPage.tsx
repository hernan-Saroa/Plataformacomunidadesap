/**
 * Página de Gestión de Tablas de Retención Documental (TRD / TVD) ESAP.
 *
 * Catálogo maestro transversal (`auth`) que centraliza:
 * - Versiones de TRD y TVD institucionales con rango de fechas, decreto/resolución y convalidación AGN/CDA.
 * - Parametrización de series, subseries y dependencias asociadas (ej. 150 - 250 - 05 para V4 vigente).
 * - Soporte para garantizar que cambios en la parametrización no alteren expedientes o documentos históricos ya radicados.
 *
 * Se accede desde "Configuración General > Retención Documental (TRD)" en el sidebar del Backoffice.
 */
import React from 'react';
import { FolderArchive, ShieldCheck } from 'lucide-react';
import TrdAdminPanel from './admin/TrdAdminPanel';

export default function TrdPage() {
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
            <FolderArchive className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1
                className="text-lg sm:text-xl font-bold tracking-tight truncate"
                style={{ color: '#0F172A' }}
              >
                Tabla de Retención Documental (TRD / TVD)
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#003DA5] border border-blue-200">
                <ShieldCheck className="w-3 h-3" />
                Catálogo Transversal
              </span>
            </div>
            <p
              className="text-xs sm:text-xs font-medium mt-0.5"
              style={{ color: '#64748B' }}
            >
              Configuración de versiones TRD/TVD, rangos de vigencia, actos administrativos de adopción, códigos de serie y subserie institucionales.
            </p>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <TrdAdminPanel />
        </div>
      </main>
    </div>
  );
}
