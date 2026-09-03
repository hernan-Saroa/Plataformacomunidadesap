/**
 * Página de gestión de Dependencias ESAP.
 *
 * Catálogo transversal (`auth.dependencias`) usado por viáticos (cupo
 * presupuestal de tiquetes por dependencia), estructura organizacional,
 * control interno y otros microservicios.
 *
 * Se accede desde "Configuración General > Dependencias" en el sidebar
 * del Backoffice. NO depende del remote mfe-viaticos: la página se
 * monta directamente sobre `auth-service` vía `dependenciasService`,
 * evitando que se renderice el shell de viáticos.
 */
import { Building2 } from 'lucide-react';
import DependenciasAdminPanel from './admin/DependenciasAdminPanel';

export default function DependenciasPage() {
  return (
    <div className="flex flex-col h-full bg-slate-50/40">
      <header className="px-6 py-5 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl text-white shadow-sm flex-shrink-0" style={{ backgroundColor: 'rgb(0, 61, 165)' }}>
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight truncate">
              Dependencias
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Configuración general · Catálogo transversal ESAP utilizado para asignar el
              cupo presupuestal de tiquetes por dependencia solicitante.
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <DependenciasAdminPanel />
        </div>
      </main>
    </div>
  );
}
