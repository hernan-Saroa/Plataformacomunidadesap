import React from 'react';
import { CheckCircle, Clock, XCircle } from 'lucide-react';

interface VisualizadorPTAAjustesProps {
  usuario: {
    nombre?: string;
    email?: string;
    rol?: string;
  };
  onLogout?: () => void;
}

type EstadoAjuste = 'PENDIENTE' | 'EN_REVISION' | 'ACEPTADA' | 'RECHAZADA';

interface AjustePTA {
  id: string;
  docente: string;
  periodo: string;
  estado: EstadoAjuste;
  solicitadoPor: string;
  fechaSolicitud: string;
  comentarios: string;
}

const ESTADO_STYLES: Record<
  EstadoAjuste,
  { badge: string; text: string; icon: JSX.Element }
> = {
  PENDIENTE: {
    badge: 'bg-amber-100 text-amber-700 border border-amber-200',
    text: 'Pendiente por revisar',
    icon: <Clock className="w-4 h-4" />,
  },
  EN_REVISION: {
    badge: 'bg-blue-100 text-blue-700 border border-blue-200',
    text: 'En revisión',
    icon: <Clock className="w-4 h-4" />,
  },
  ACEPTADA: {
    badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    text: 'Ajuste aceptado',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  RECHAZADA: {
    badge: 'bg-rose-100 text-rose-700 border border-rose-200',
    text: 'Ajuste rechazado',
    icon: <XCircle className="w-4 h-4" />,
  },
};

const ajustesDemo: AjustePTA[] = [
  {
    id: 'PTA-2025-2-00847',
    docente: 'Juan Pérez',
    periodo: '2025-2',
    estado: 'EN_REVISION',
    solicitadoPor: 'Coordinación Académica',
    fechaSolicitud: '2025-02-10',
    comentarios: 'Ajustar horas de investigación y adicionar asignatura Gestión Pública.',
  },
  {
    id: 'PTA-2025-2-00848',
    docente: 'María López',
    periodo: '2025-2',
    estado: 'PENDIENTE',
    solicitadoPor: 'Decanatura',
    fechaSolicitud: '2025-02-08',
    comentarios: 'Verificar distribución de horas de extensión.',
  },
  {
    id: 'PTA-2025-2-00849',
    docente: 'Carlos Rodríguez',
    periodo: '2025-2',
    estado: 'ACEPTADA',
    solicitadoPor: 'Coordinación Académica',
    fechaSolicitud: '2025-02-05',
    comentarios: 'Ajuste aprobado. Se actualizó la carga académica.',
  },
];

export const VisualizadorPTAAjustes: React.FC<VisualizadorPTAAjustesProps> = ({
  usuario,
  onLogout,
}) => {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
            Plan de Trabajo Académico
          </p>
          <h1 className="text-xl font-semibold text-slate-900">PTAs con ajustes solicitados</h1>
          <p className="text-sm text-slate-600">
            Revisa y gestiona las observaciones pendientes de corrección.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">{usuario?.nombre || 'Usuario'}</p>
            <p className="text-xs text-slate-500">{usuario?.email || 'usuario@esap.edu.co'}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid gap-4 md:grid-cols-2">
          {ajustesDemo.map((ajuste) => {
            const estado = ESTADO_STYLES[ajuste.estado];
            return (
              <article
                key={ajuste.id}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                      {ajuste.id}
                    </p>
                    <h2 className="text-lg font-semibold text-slate-900">{ajuste.docente}</h2>
                    <p className="text-sm text-slate-600">Período {ajuste.periodo}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${estado.badge}`}>
                    {estado.icon}
                    {estado.text}
                  </span>
                </div>

                <dl className="mt-4 space-y-2 text-sm text-slate-700">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Solicitado por</dt>
                    <dd className="font-medium">{ajuste.solicitadoPor}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Fecha de solicitud</dt>
                    <dd className="font-medium">{ajuste.fechaSolicitud}</dd>
                  </div>
                </dl>

                <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
                  {ajuste.comentarios}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button className="px-3 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800">
                    Abrir PTA
                  </button>
                  <button className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
                    Ver historial
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
};
