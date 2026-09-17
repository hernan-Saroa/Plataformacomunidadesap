import React, { useState } from 'react';
import { LayoutGrid, Wind, Monitor, Video, Users, Search, Filter, Plus } from 'lucide-react';
import { EspacioFisico } from '../services/infraestructuraService';

interface GestionEspaciosProps {
  espacios: EspacioFisico[];
}

export const GestionEspacios: React.FC<GestionEspaciosProps> = ({ espacios }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('TODOS');

  const espaciosFiltrados = espacios.filter((e) => {
    const matchText = e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      e.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = filtroTipo === 'TODOS' || e.tipo === filtroTipo;
    return matchText && matchTipo;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-indigo-600" />
            Inventario de Espacios Físicos y Aulas
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Gestión de capacidad, equipamiento y disponibilidad de ambientes de aprendizaje
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-all duration-200 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Nuevo Espacio
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="p-6 bg-slate-50/60 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre o código de aula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="TODOS">Todos los tipos</option>
            <option value="AULA">Aulas</option>
            <option value="AUDITORIO">Auditorios</option>
            <option value="LABORATORIO">Laboratorios</option>
            <option value="OFICINA">Oficinas</option>
          </select>
        </div>
      </div>

      {/* Tabla de Espacios */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
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
            {espaciosFiltrados.map((espacio) => (
              <tr key={espacio.idEspacio} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900">{espacio.nombre}</div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">Piso {espacio.piso} • {espacio.codigo}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                    {espacio.tipo}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <Users className="w-4 h-4 text-slate-400" />
                    {espacio.capacidad} puestos
                  </div>
                  {espacio.areaM2 && <div className="text-xs text-slate-400">{espacio.areaM2} m²</div>}
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
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {espacio.estado}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    type="button"
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
