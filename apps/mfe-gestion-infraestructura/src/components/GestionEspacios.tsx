import React, { useEffect, useState } from 'react';
import { LayoutGrid, Wind, Monitor, Video, Users, Search, Filter, Plus, Pencil, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { EspacioFisico, Sede } from '../services/infraestructuraService';
import { ModalNuevoEspacio } from './ModalNuevoEspacio';

interface GestionEspaciosProps {
  espacios: EspacioFisico[];
  sedes: Sede[];
  onEspacioCreada?: (nuevoEspacio: EspacioFisico) => void;
  onEspacioActualizada?: (actualizado: EspacioFisico) => void;
}

export const GestionEspacios: React.FC<GestionEspaciosProps> = ({
  espacios,
  sedes,
  onEspacioCreada,
  onEspacioActualizada,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [espacioAEditar, setEspacioAEditar] = useState<EspacioFisico | null>(null);
  const [toast, setToast] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const espaciosFiltrados = espacios.filter((e) => {
    const matchText = (e.nombre ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (e.codigo ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = filtroTipo === 'TODOS' || e.tipo === filtroTipo;
    return matchText && matchTipo;
  });

  const abrirCrear = () => {
    setEspacioAEditar(null);
    setIsModalOpen(true);
  };

  const abrirEditar = (esp: EspacioFisico) => {
    setEspacioAEditar(esp);
    setIsModalOpen(true);
  };

  return (
    <div className="relative">
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr bg-gray-400 from-indigo-600 to-sky-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/30 ring-2 ring-indigo-100 shrink-0">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Inventario de Espacios Físicos y Aulas
              </h3>
              <p className="text-sm text-slate-600 font-medium mt-1">
                Gestión de capacidad, equipamiento y disponibilidad de ambientes de aprendizaje
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={abrirCrear}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-indigo-800 text-white text-sm font-bold shadow-md shadow-indigo-500/25 ring-1 ring-indigo-500/40 transition-all duration-200 active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Nuevo Espacio
          </button>
        </div>

        {/* Barra de Filtros */}
        <div className="p-6 bg-slate-50/60 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre o código de aula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 placeholder:text-slate-500 placeholder:font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition-all shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-600 shrink-0" />
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 shadow-sm"
            >
              <option value="TODOS">Todos los tipos</option>
              <option value="AULA">Aulas</option>
              <option value="AUDITORIO">Auditorios</option>
              <option value="LABORATORIO">Laboratorios</option>
              <option value="OFICINA">Oficinas</option>
              <option value="BIBLIOTECA">Bibliotecas</option>
              <option value="SALA_CONSEJO">Salas Consejo</option>
            </select>
          </div>
        </div>

        {/* Tabla de Espacios */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50/80 text-xs uppercase font-bold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Código & Espacio</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Capacidad</th>
                <th className="px-6 py-4">Equipamiento</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {espaciosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500 font-semibold">
                    No se encontraron espacios con los filtros actuales.
                  </td>
                </tr>
              )}
              {espaciosFiltrados.map((espacio) => {
                const inactivo = espacio.isActivo === false;
                return (
                  <tr key={espacio.idEspacio} className={`hover:bg-slate-50/60 transition-colors ${inactivo ? 'opacity-60 bg-slate-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <div className={`font-bold ${inactivo ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                        {espacio.nombre}
                      </div>
                      <div className="text-xs font-mono text-slate-500 mt-0.5">Piso {espacio.piso} • {espacio.codigo}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {espacio.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Users className="w-4 h-4 text-slate-500" />
                        {espacio.capacidad} puestos
                      </div>
                      {espacio.areaM2 && <div className="text-xs text-slate-500">{espacio.areaM2} m²</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {espacio.tieneAireAcondicionado && (
                          <span className="p-1 rounded bg-sky-50 text-sky-600" title="Aire Acondicionado">
                            <Wind className="w-4 h-4" />
                          </span>
                        )}
                        {espacio.tieneVideobeam && (
                          <span className="p-1 rounded bg-purple-50 text-purple-600" title="Proyector / VideoBeam">
                            <Video className="w-4 h-4" />
                          </span>
                        )}
                        {espacio.tieneComputadores && (
                          <span className="p-1 rounded bg-amber-50 text-amber-600" title="Equipos de Cómputo">
                            <Monitor className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          espacio.estado === 'DISPONIBLE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : espacio.estado === 'MANTENIMIENTO'
                            ? 'bg-amber-100 text-amber-800'
                            : espacio.estado === 'RESERVADO'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {espacio.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => abrirEditar(espacio)}
                        aria-label="Editar espacio"
                        title="Editar"
                        className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-indigo-50 text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div
          className={`absolute top-4 right-4 z-[85] shadow-lg rounded-xl border px-4 py-3 pr-10 font-bold text-sm flex items-start gap-2 max-w-sm ${
            toast.tipo === 'ok'
              ? 'bg-white border-emerald-300 text-emerald-800'
              : 'bg-white border-rose-300 text-rose-800'
          }`}
        >
          {toast.tipo === 'ok' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          )}
          <div className="flex-1 break-words">{toast.texto}</div>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Cerrar aviso"
            className="absolute top-2 right-2 p-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <ModalNuevoEspacio
        open={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEspacioAEditar(null); }}
        sedes={sedes}
        espacioAEditar={espacioAEditar}
        onExito={(nuevo) => {
          setIsModalOpen(false);
          setEspacioAEditar(null);
          if (espacioAEditar) {
            onEspacioActualizada?.(nuevo);
            setToast({ tipo: 'ok', texto: `Espacio ${nuevo.codigo} actualizado correctamente.` });
          } else {
            onEspacioCreada?.(nuevo);
            setToast({ tipo: 'ok', texto: `Espacio ${nuevo.codigo} creado correctamente.` });
          }
        }}
        onError={(msg) => {
          setToast({ tipo: 'err', texto: msg });
        }}
      />
    </div>
  );
};
