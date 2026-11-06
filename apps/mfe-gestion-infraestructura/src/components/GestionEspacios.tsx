import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutGrid,
  Wind,
  Monitor,
  Video,
  Users,
  Search,
  Filter,
  Plus,
  Pencil,
  CheckCircle2,
  AlertCircle,
  X,
  Building2,
  Globe,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
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
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [filtroAmbito, setFiltroAmbito] = useState<'TODOS' | 'CENTRAL' | 'REGIONAL'>('TODOS');
  const [filtroUbicacionTexto, setFiltroUbicacionTexto] = useState('TODAS');

  // Filtros de Equipamiento
  const [soloAire, setSoloAire] = useState(false);
  const [soloVideoBeam, setSoloVideoBeam] = useState(false);
  const [soloComputadores, setSoloComputadores] = useState(false);

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [elementosPorPagina, setElementosPorPagina] = useState(10);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [espacioAEditar, setEspacioAEditar] = useState<EspacioFisico | null>(null);
  const [toast, setToast] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Reset a página 1 cuando cambia cualquier filtro
  useEffect(() => {
    setPaginaActual(1);
  }, [searchTerm, filtroTipo, filtroEstado, filtroAmbito, filtroUbicacionTexto, soloAire, soloVideoBeam, soloComputadores, elementosPorPagina]);

  // Lista de nombres de sedes o edificios para el selector
  const listaUbicacionesUnicas = useMemo(() => {
    const setUbicaciones = new Set<string>();
    for (const e of espacios) {
      if (e.bloque?.sede?.nombre) {
        setUbicaciones.add(e.bloque.sede.nombre);
      } else if (e.bloque?.nombre) {
        setUbicaciones.add(e.bloque.nombre);
      }
    }
    return Array.from(setUbicaciones).sort();
  }, [espacios]);

  // Filtrado de espacios
  const espaciosFiltrados = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return espacios.filter((e) => {
      // Texto: busca en código, nombre del espacio, o en el bloque/sede
      const matchText =
        !term ||
        (e.nombre ?? '').toLowerCase().includes(term) ||
        (e.codigo ?? '').toLowerCase().includes(term) ||
        (e.bloque?.nombre ?? '').toLowerCase().includes(term) ||
        (e.bloque?.sede?.nombre ?? '').toLowerCase().includes(term);

      // Tipo de espacio
      const matchTipo = filtroTipo === 'TODOS' || e.tipo === filtroTipo;

      // Estado
      const matchEstado =
        filtroEstado === 'TODOS' ||
        e.estado?.toUpperCase() === filtroEstado.toUpperCase() ||
        (filtroEstado === 'DISPONIBLE' && (e.estado === 'DISPONIBLE' || e.estado === 'OPERATIVO'));

      // Ámbito: Nivel Central (Bogotá) vs Regional (CETAP)
      let matchAmbito = true;
      const esCentral = !!e.bloque?.sede?.idSede && !e.bloque?.idCetap;
      if (filtroAmbito === 'CENTRAL') matchAmbito = esCentral;
      else if (filtroAmbito === 'REGIONAL') matchAmbito = !esCentral;

      // Ubicación específica
      let matchUbicacion = true;
      if (filtroUbicacionTexto !== 'TODAS') {
        const nomUbic = e.bloque?.sede?.nombre || e.bloque?.nombre || '';
        matchUbicacion = nomUbic === filtroUbicacionTexto;
      }

      // Equipamiento
      const matchAire = !soloAire || !!e.tieneAireAcondicionado;
      const matchVideo = !soloVideoBeam || !!e.tieneVideobeam;
      const matchPC = !soloComputadores || !!e.tieneComputadores;

      return (
        matchText &&
        matchTipo &&
        matchEstado &&
        matchAmbito &&
        matchUbicacion &&
        matchAire &&
        matchVideo &&
        matchPC
      );
    });
  }, [
    espacios,
    searchTerm,
    filtroTipo,
    filtroEstado,
    filtroAmbito,
    filtroUbicacionTexto,
    soloAire,
    soloVideoBeam,
    soloComputadores,
  ]);

  // Paginación derivada
  const totalPaginas = Math.ceil(espaciosFiltrados.length / elementosPorPagina) || 1;
  const indiceInicio = (paginaActual - 1) * elementosPorPagina;
  const indiceFin = Math.min(indiceInicio + elementosPorPagina, espaciosFiltrados.length);
  const espaciosPaginados = useMemo(() => {
    return espaciosFiltrados.slice(indiceInicio, indiceFin);
  }, [espaciosFiltrados, indiceInicio, indiceFin]);

  const abrirCrear = () => {
    setEspacioAEditar(null);
    setIsModalOpen(true);
  };

  const abrirEditar = (esp: EspacioFisico) => {
    setEspacioAEditar(esp);
    setIsModalOpen(true);
  };

  const limpiarFiltros = () => {
    setSearchTerm('');
    setFiltroTipo('TODOS');
    setFiltroEstado('TODOS');
    setFiltroAmbito('TODOS');
    setFiltroUbicacionTexto('TODAS');
    setSoloAire(false);
    setSoloVideoBeam(false);
    setSoloComputadores(false);
  };

  const totalFiltrosActivos = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (filtroTipo !== 'TODOS') count++;
    if (filtroEstado !== 'TODOS') count++;
    if (filtroAmbito !== 'TODOS') count++;
    if (filtroUbicacionTexto !== 'TODAS') count++;
    if (soloAire) count++;
    if (soloVideoBeam) count++;
    if (soloComputadores) count++;
    return count;
  }, [
    searchTerm,
    filtroTipo,
    filtroEstado,
    filtroAmbito,
    filtroUbicacionTexto,
    soloAire,
    soloVideoBeam,
    soloComputadores,
  ]);

  const hayFiltrosActivos = totalFiltrosActivos > 0;

  return (
    <div className="relative">
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
        {/* Header Principal */}
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md shrink-0 ring-2 ring-blue-100"
              style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
            >
              <LayoutGrid className="w-5 h-5" style={{ color: '#ffffff' }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Inventario de Espacios Físicos
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  {espacios.length} espacios registrados
                </span>
              </div>
              <p className="text-sm text-slate-600 font-medium mt-1">
                Catálogo nacional de ambientes de aprendizaje, aulas, laboratorios y oficinas en Bogotá y CETAPs regionales
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={abrirCrear}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-500/25 ring-1 ring-blue-500/40 transition-all duration-200 active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Nuevo Espacio
          </button>
        </div>

        {/* Barra de Filtros y Búsqueda Multicriterio */}
        <div className="p-5 bg-slate-50/80 border-b border-slate-200 space-y-3.5">
          {/* Fila 1: Filtro de Ubicación (Primero) + Buscador + Ámbito + Tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Selector de Sedes / Edificios (Primer filtro) */}
            <div className="relative">
              <select
                value={filtroUbicacionTexto}
                onChange={(e) => setFiltroUbicacionTexto(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 shadow-2xs"
                title="Filtrar por sede, edificio o CETAP específico"
              >
                <option value="TODAS">Todas las Sedes / Edificios ({listaUbicacionesUnicas.length})</option>
                {listaUbicacionesUnicas.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Buscador de texto */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por código, aula o edificio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition shadow-2xs font-medium"
              />
            </div>

            {/* 3. Selector de Ámbito (Central vs Regional) */}
            <div className="relative">
              <select
                value={filtroAmbito}
                onChange={(e) => setFiltroAmbito(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 shadow-2xs"
              >
                <option value="TODOS">Todos los ámbitos (Central y Regiones)</option>
                <option value="CENTRAL">Sedes Nivel Central (Bogotá D.C.)</option>
                <option value="REGIONAL">CETAPs Regionales</option>
              </select>
            </div>

            {/* 4. Selector de Tipo de Espacio */}
            <div className="relative">
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 shadow-2xs"
              >
                <option value="TODOS">Todos los tipos de espacio</option>
                <option value="AULA">Aulas de Clase</option>
                <option value="AUDITORIO">Auditorios</option>
                <option value="LABORATORIO">Laboratorios / TIC</option>
                <option value="OFICINA">Oficinas / Coordinación</option>
                <option value="BIBLIOTECA">Bibliotecas</option>
                <option value="SALA_CONSEJO">Salas de Consejo</option>
                <option value="LOCATIVO">Locativos / Baños / Cafetería</option>
              </select>
            </div>
          </div>

          {/* Fila 2: Estado Operativo + Toggles de Equipamiento + Botón Remover Filtros */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2.5 flex-wrap flex-1">
              {/* Selector de Estado Operativo */}
              <div className="relative min-w-[190px]">
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 shadow-2xs"
                >
                  <option value="TODOS">Todos los estados</option>
                  <option value="DISPONIBLE">Disponibles / Operativos</option>
                  <option value="MANTENIMIENTO">En Mantenimiento</option>
                  <option value="RESERVADO">Reservados</option>
                  <option value="INACTIVO">Inactivos</option>
                </select>
              </div>

              {/* Botones de Equipamiento Rápido */}
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSoloAire(!soloAire)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    soloAire
                      ? 'bg-sky-100 text-sky-800 border border-sky-300'
                      : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                  }`}
                  title="Filtrar con aire acondicionado"
                >
                  <Wind className="w-3.5 h-3.5 text-sky-600" />
                  Aire
                </button>

                <button
                  type="button"
                  onClick={() => setSoloVideoBeam(!soloVideoBeam)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    soloVideoBeam
                      ? 'bg-purple-100 text-purple-800 border border-purple-300'
                      : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                  }`}
                  title="Filtrar con proyector / videobeam"
                >
                  <Video className="w-3.5 h-3.5 text-purple-600" />
                  VideoBeam
                </button>

                <button
                  type="button"
                  onClick={() => setSoloComputadores(!soloComputadores)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    soloComputadores
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                  }`}
                  title="Filtrar con equipos de cómputo"
                >
                  <Monitor className="w-3.5 h-3.5 text-amber-600" />
                  Cómputo
                </button>
              </div>

              {/* Botón Estético de Remover / Limpiar Filtros */}
              {hayFiltrosActivos ? (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all shadow-2xs hover:shadow active:scale-95"
                  title="Restablecer todos los filtros y búsqueda"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                  <span>Remover filtros</span>
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-200 text-rose-800 text-[10px] font-black">
                    {totalFiltrosActivos}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/70 text-slate-400 border border-slate-200 text-xs font-medium cursor-not-allowed opacity-75"
                >
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sin filtros activos</span>
                </button>
              )}
            </div>

            {/* Indicador de resultados */}
            <div className="text-xs font-bold text-slate-500 shrink-0 self-center">
              {espaciosFiltrados.length} espacio(s) encontrados
            </div>
          </div>
        </div>

        {/* Tabla de Espacios */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50/80 text-xs uppercase font-bold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Código & Espacio</th>
                <th className="px-6 py-4">Ubicación / Sede</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Capacidad</th>
                <th className="px-6 py-4">Equipamiento</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {espaciosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500 font-semibold bg-slate-50/40">
                    <LayoutGrid className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No se encontraron espacios con los filtros actuales.
                  </td>
                </tr>
              ) : (
                espaciosPaginados.map((espacio) => {
                  const inactivo = espacio.isActivo === false;
                  const nombreUbicacion =
                    espacio.bloque?.sede?.nombre ||
                    espacio.bloque?.nombre ||
                    'Ubicación asignada';
                  const esRegional = !espacio.bloque?.sede?.idSede || !!espacio.bloque?.idCetap;

                  return (
                    <tr
                      key={espacio.idEspacio}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        inactivo ? 'opacity-60 bg-slate-50/30' : ''
                      }`}
                    >
                      <td className="px-6 py-3.5">
                        <div
                          className={`font-bold text-sm ${
                            inactivo ? 'line-through text-slate-500' : 'text-slate-900'
                          }`}
                        >
                          {espacio.nombre}
                        </div>
                        <div className="text-xs font-mono text-slate-500 mt-0.5">
                          Piso {espacio.piso} • {espacio.codigo}
                        </div>
                      </td>

                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                          {esRegional ? (
                            <Globe className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          )}
                          <span className="truncate max-w-[320px]" title={nombreUbicacion}>
                            {nombreUbicacion}
                          </span>
                        </div>
                        {espacio.bloque?.codigo && (
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            Bloque: {espacio.bloque.codigo}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {espacio.tipo}
                        </span>
                      </td>

                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          {espacio.capacidad} puestos
                        </div>
                        {espacio.areaM2 && (
                          <div className="text-[11px] text-slate-500">{espacio.areaM2} m²</div>
                        )}
                      </td>

                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {espacio.tieneAireAcondicionado && (
                            <span
                              className="p-1 rounded-md bg-sky-50 text-sky-700 border border-sky-200"
                              title="Aire Acondicionado"
                            >
                              <Wind className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {espacio.tieneVideobeam && (
                            <span
                              className="p-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200"
                              title="Proyector / VideoBeam"
                            >
                              <Video className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {espacio.tieneComputadores && (
                            <span
                              className="p-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200"
                              title="Equipos de Cómputo"
                            >
                              <Monitor className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {!espacio.tieneAireAcondicionado &&
                            !espacio.tieneVideobeam &&
                            !espacio.tieneComputadores && (
                              <span className="text-slate-400 text-xs italic">-</span>
                            )}
                        </div>
                      </td>

                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            espacio.estado === 'DISPONIBLE' || espacio.estado === 'OPERATIVO'
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

                      <td className="px-6 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => abrirEditar(espacio)}
                          aria-label={`Editar espacio ${espacio.nombre}`}
                          title="Editar espacio"
                          className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-indigo-50 text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Barra Inferior de Paginación */}
        {espaciosFiltrados.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-semibold">
            {/* Selector de tamaño de página e información de rango */}
            <div className="flex items-center gap-3">
              <span>
                Mostrando <strong className="text-slate-800">{indiceInicio + 1}</strong> a{' '}
                <strong className="text-slate-800">{indiceFin}</strong> de{' '}
                <strong className="text-slate-800">{espaciosFiltrados.length}</strong> espacios
              </span>

              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-slate-500 font-normal">Por pág:</span>
                <select
                  value={elementosPorPagina}
                  onChange={(e) => setElementosPorPagina(Number(e.target.value))}
                  className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Botones de Navegación de Páginas */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={paginaActual === 1}
                onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Anterior
              </button>

              <div className="px-3 py-1 text-slate-700 font-bold">
                Pág. {paginaActual} de {totalPaginas}
              </div>

              <button
                type="button"
                disabled={paginaActual === totalPaginas}
                onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1"
              >
                Siguiente
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
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
        onClose={() => {
          setIsModalOpen(false);
          setEspacioAEditar(null);
        }}
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
