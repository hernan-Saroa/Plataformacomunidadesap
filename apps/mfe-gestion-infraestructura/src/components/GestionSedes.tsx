import React, { useEffect, useMemo, useState } from 'react';
import { Building, MapPin, Phone, Mail, Plus, ExternalLink, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Sede, BloqueEdificio } from '../services/infraestructuraService';
import { ModalNuevaSede } from './ModalNuevaSede';
import { ModalVerBloques } from './ModalVerBloques';

interface GestionSedesProps {
  sedes: Sede[];
  onSedeCreada?: (nuevaSede: Sede) => void;
  onSedeActualizada?: (sede: Sede) => void;
  onBloqueCreado?: (bloque: BloqueEdificio, sede: Sede) => void;
  onBloqueActualizado?: (bloque: BloqueEdificio, sede: Sede) => void;
  onBloqueEliminado?: (idBloque: string, sede: Sede) => void;
}

export const GestionSedes: React.FC<GestionSedesProps> = ({
  sedes,
  onSedeCreada,
  onSedeActualizada,
  onBloqueCreado,
  onBloqueActualizado,
  onBloqueEliminado,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);
  const [isModalBloquesOpen, setIsModalBloquesOpen] = useState(false);
  const [sedeBloquesActiva, setSedeBloquesActiva] = useState<Sede | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleExito = (sede: Sede) => {
    setIsModalOpen(false);
    if (sede && onSedeCreada) onSedeCreada(sede);
    if (sede && onSedeActualizada) onSedeActualizada(sede);
    if (!toast || toast.tipo !== 'ok') {
      setToast({ tipo: 'ok', texto: `Sede ${sede.codigo} guardada correctamente.` });
    }
  };

  const abrirVerBloques = (sede: Sede) => {
    setSedeBloquesActiva(sede);
    setIsModalBloquesOpen(true);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden relative">
      {toast && (
        <div className={`absolute top-4 right-4 z-[85] max-w-sm px-4 py-2.5 rounded-xl text-xs font-black border shadow-lg flex items-start gap-2 animate-in slide-in-from-top fade-in ${
          toast.tipo === 'ok'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-300 text-rose-700'
        }`}>
          {toast.tipo === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span className="leading-5">{toast.texto}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-1 text-slate-400 hover:text-slate-700"
            aria-label="Cerrar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-600" />
            Sedes Territoriales y Edificios
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Red de sedes centrales, territoriales y CETAP de la ESAP a nivel nacional
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm shadow-blue-500/20 transition-all duration-200 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Nueva Sede
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sedes.map((sede) => (
          <div
            key={sede.idSede}
            className={`rounded-xl border bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between ${
              sede.isActivo === false
                ? 'opacity-60 border-dashed border-slate-300 bg-slate-100/60 hover:bg-slate-100 hover:border-slate-400'
                : 'border-slate-200'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  {sede.tipo}
                </span>
                <span className="text-xs font-mono font-medium text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {sede.codigo}
                </span>
              </div>

              <h4 className={`text-base font-bold mb-2 leading-tight ${sede.isActivo === false ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                {sede.nombre}
              </h4>

              <div className="space-y-2 text-xs text-slate-600 mt-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{sede.direccion}, {sede.municipio}</span>
                </div>
                {sede.telefono && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{sede.telefono}</span>
                  </div>
                )}
                {sede.emailContacto && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{sede.emailContacto}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-200/60 flex items-center justify-between">
              <span className={`text-xs font-medium flex items-center gap-1.5 ${
                sede.isActivo === false
                  ? 'text-slate-500'
                  : 'text-emerald-600'
              }`}>
                <span className={`w-2 h-2 rounded-full ${sede.isActivo === false ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'}`} />
                {sede.isActivo === false ? 'Sede Inactiva' : 'Sede Activa'}
              </span>
              <button
                type="button"
                onClick={() => abrirVerBloques(sede)}
                aria-label={`Ver bloques de la sede ${sede.nombre}`}
                title="Ver y gestionar bloques y edificios de la sede"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 transition active:scale-95"
              >
                Ver Bloques
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ModalNuevaSede
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onExito={handleExito}
      />

      <ModalVerBloques
        open={isModalBloquesOpen}
        sede={sedeBloquesActiva}
        onClose={() => {
          setIsModalBloquesOpen(false);
          setSedeBloquesActiva(null);
        }}
        onBloqueCreado={onBloqueCreado}
        onBloqueActualizado={onBloqueActualizado}
        onBloqueEliminado={onBloqueEliminado}
      />
    </div>
  );
};
