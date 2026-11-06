import React, { useEffect, useMemo, useState } from 'react';
import {
  Building,
  MapPin,
  Phone,
  Mail,
  Plus,
  ExternalLink,
  X,
  CheckCircle2,
  AlertCircle,
  Globe,
  Search,
  ChevronDown,
  ChevronRight,
  Layers,
  Info,
  ShieldCheck,
  ChevronUp,
} from 'lucide-react';
import { Sede, BloqueEdificio, infraestructuraService } from '../services/infraestructuraService';
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
  const [subTab, setSubTab] = useState<'central' | 'territoriales'>('central');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);
  const [isModalBloquesOpen, setIsModalBloquesOpen] = useState(false);
  const [sedeBloquesActiva, setSedeBloquesActiva] = useState<Sede | null>(null);

  // Estados para Direcciones Territoriales y CETAPs
  const [cargandoTerritoriales, setCargandoTerritoriales] = useState<boolean>(false);
  const [direccionesTerritoriales, setDireccionesTerritoriales] = useState<any[]>([]);
  const [territorialesExpandidas, setTerritorialesExpandidas] = useState<Set<string | number>>(new Set());
  const [filtroCetap, setFiltroCetap] = useState<string>('');
  const [filtroTipoInventario, setFiltroTipoInventario] = useState<'TODOS' | 'CON_INVENTARIO' | 'FALLBACK'>('TODOS');
  const [cargandoBloquesCetap, setCargandoBloquesCetap] = useState<boolean>(false);
  const [verTodosCetapsTerr, setVerTodosCetapsTerr] = useState<Record<string | number, boolean>>({});

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Cargar catálogo de territoriales con CETAPs cuando se active la pestaña
  useEffect(() => {
    if (subTab === 'territoriales' && direccionesTerritoriales.length === 0) {
      setCargandoTerritoriales(true);
      infraestructuraService
        .getTerritorialesConCetaps()
        .then((res) => {
          if (Array.isArray(res.direccionesTerritoriales)) {
            setDireccionesTerritoriales(res.direccionesTerritoriales);
            // Pre-expandir las territoriales que tienen CETAPs con inventario
            const conInventarioIds = res.direccionesTerritoriales
              .filter((t) => (t.cetaps || []).some((c: any) => Number(c.total_bloques) > 0))
              .map((t) => t.id);
            setTerritorialesExpandidas(new Set(conInventarioIds.length > 0 ? conInventarioIds : [res.direccionesTerritoriales[0]?.id]));
          }
        })
        .catch((err) => {
          console.warn('[GestionSedes] Error cargando territoriales:', err);
          setToast({ tipo: 'err', texto: 'No se pudo cargar la red de Direcciones Territoriales' });
        })
        .finally(() => setCargandoTerritoriales(false));
    }
  }, [subTab, direccionesTerritoriales.length]);

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

  const abrirBloquesDeCetap = async (cetap: any, territorial: any) => {
    try {
      setCargandoBloquesCetap(true);
      const bloques = await infraestructuraService.getBloquesPorCetap(cetap.id);
      const sedeCetapSintetica: Sede = {
        idSede: String(cetap.id),
        codigo: cetap.codigo,
        nombre: `CETAP ${cetap.nombre}`,
        tipo: 'CETAP',
        departamento: territorial.nombre,
        municipio: cetap.nombre,
        direccion: 'Sede física municipal de la ESAP',
        isActivo: cetap.activo !== false,
        alcanceUmi: true,
        bloques: bloques || [],
      };
      setSedeBloquesActiva(sedeCetapSintetica);
      setIsModalBloquesOpen(true);
    } catch (err) {
      console.warn('[GestionSedes] Error abriendo bloques de CETAP:', err);
      setToast({ tipo: 'err', texto: 'Error consultando los bloques del CETAP' });
    } finally {
      setCargandoBloquesCetap(false);
    }
  };

  const toggleExpandirTerritorial = (id: string | number) => {
    setTerritorialesExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpandirTodos = () => {
    if (territorialesExpandidas.size === direccionesTerritoriales.length) {
      setTerritorialesExpandidas(new Set());
    } else {
      setTerritorialesExpandidas(new Set(direccionesTerritoriales.map((t) => t.id)));
    }
  };

  // Filtrar exclusivamente Sedes Nivel Central (Bogotá D.C. urbanas)
  const sedesNivelCentral = useMemo(() => {
    return sedes.filter(
      (s) => s.tipo === 'SEDE_CENTRAL' || s.tipo === 'SEDE_ALTERNA' || s.codigo.startsWith('SEDE-'),
    );
  }, [sedes]);

  // Conteo global de CETAPs
  const { totalCetapsGlobal, conInventarioGlobal, enFallbackGlobal } = useMemo(() => {
    let total = 0;
    let conInv = 0;
    for (const t of direccionesTerritoriales) {
      const cList = t.cetaps || [];
      total += cList.length;
      conInv += cList.filter((c: any) => Number(c.total_bloques) > 0).length;
    }
    return {
      totalCetapsGlobal: total,
      conInventarioGlobal: conInv,
      enFallbackGlobal: total - conInv,
    };
  }, [direccionesTerritoriales]);

  // Territoriales y CETAPs filtrados por búsqueda y tipo de inventario
  const territorialesFiltradas = useMemo(() => {
    const term = filtroCetap.toLowerCase().trim();

    return direccionesTerritoriales
      .map((t) => {
        let cetaps = t.cetaps || [];

        // Filtro por tipo de inventario
        if (filtroTipoInventario === 'CON_INVENTARIO') {
          cetaps = cetaps.filter((c: any) => Number(c.total_bloques) > 0);
        } else if (filtroTipoInventario === 'FALLBACK') {
          cetaps = cetaps.filter((c: any) => Number(c.total_bloques) === 0);
        }

        // Filtro por término de búsqueda
        if (term) {
          const matchTerr = t.nombre.toLowerCase().includes(term) || (t.codigo && t.codigo.toLowerCase().includes(term));
          if (!matchTerr) {
            cetaps = cetaps.filter(
              (c: any) => c.nombre.toLowerCase().includes(term) || (c.codigo && c.codigo.toLowerCase().includes(term)),
            );
          }
        }

        return {
          ...t,
          cetapsFiltrados: cetaps,
        };
      })
      .filter((t) => {
        if (!term && filtroTipoInventario === 'TODOS') return true;
        return t.cetapsFiltrados.length > 0;
      });
  }, [direccionesTerritoriales, filtroCetap, filtroTipoInventario]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden relative">
      {toast && (
        <div
          className={`absolute top-4 right-4 z-[85] max-w-sm px-4 py-2.5 rounded-xl text-xs font-black border shadow-lg flex items-start gap-2 animate-in slide-in-from-top fade-in ${
            toast.tipo === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-700'
          }`}
        >
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

      {/* Header Principal con Título */}
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-600" />
            Estructura Territorial y Sedes Físicas
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Gestión diferenciada entre las Sedes Urbanas de Nivel Central y la Red Nacional de Direcciones Territoriales y CETAPs
          </p>
        </div>
        {subTab === 'central' && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm shadow-blue-500/20 transition-all duration-200 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Nueva Sede Central
          </button>
        )}
      </div>

      {/* Sub-pestañas de Segregación Operativa */}
      <div className="px-6 bg-slate-50 border-b border-slate-200 flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={() => setSubTab('central')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
            subTab === 'central'
              ? 'border-blue-600 text-blue-700 bg-white shadow-sm'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4 text-blue-600" />
          <span>Sedes Nivel Central - Bogotá D.C. ({sedesNivelCentral.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('territoriales')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
            subTab === 'territoriales'
              ? 'border-indigo-600 text-indigo-700 bg-white shadow-sm'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Globe className="w-4 h-4 text-indigo-600" />
          <span>Direcciones Territoriales y Red CETAP ({direccionesTerritoriales.length || 17})</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800">
            Nacional
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* VISTA 1: SEDES NIVEL CENTRAL (BOGOTÁ D.C.) */}
      {/* ========================================================= */}
      {subTab === 'central' && (
        <div className="p-6 space-y-6">
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-blue-950 mb-0.5">Sedes Físicas Metropolitanas de Nivel Central</p>
              Inmuebles corporativos y académicos ubicados en Bogotá D.C. atendidos directamente por la cuadrilla de la Unidad de Mantenimiento e Infraestructura (UMI).
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sedesNivelCentral.map((sede) => (
              <div
                key={sede.idSede}
                className={`rounded-2xl border bg-white hover:border-blue-300 hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between ${
                  sede.isActivo === false
                    ? 'opacity-60 border-dashed border-slate-300 bg-slate-50/60'
                    : 'border-slate-200/90'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                      {sede.tipo}
                    </span>
                    <span className="text-xs font-mono font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      {sede.codigo}
                    </span>
                  </div>

                  <h4
                    className={`text-base font-bold mb-2 leading-tight ${
                      sede.isActivo === false ? 'text-slate-500 line-through' : 'text-slate-800'
                    }`}
                  >
                    {sede.nombre}
                  </h4>

                  <div className="space-y-2 text-xs text-slate-600 mt-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {sede.direccion}, {sede.municipio}
                      </span>
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
                  <span
                    className={`text-xs font-medium flex items-center gap-1.5 ${
                      sede.isActivo === false ? 'text-slate-500' : 'text-emerald-600 font-semibold'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        sede.isActivo === false ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'
                      }`}
                    />
                    {sede.isActivo === false ? 'Sede Inactiva' : 'Sede Activa'}
                  </span>
                  <button
                    type="button"
                    onClick={() => abrirVerBloques(sede)}
                    aria-label={`Ver bloques de la sede ${sede.nombre}`}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 transition active:scale-95"
                  >
                    Ver Bloques
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VISTA 2: DIRECCIONES TERRITORIALES Y RED CETAP */}
      {/* ========================================================= */}
      {subTab === 'territoriales' && (
        <div className="p-6 space-y-6">
          {/* Banner Informativo a Ancho Completo */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-blue-50/70 to-slate-50 border border-indigo-200/80 text-xs text-indigo-950 flex items-start gap-3 shadow-sm">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0 mt-0.5 shadow-sm">
              <Globe className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-indigo-950 mb-1">
                Catálogo Maestro Nacional de Direcciones Territoriales y CETAPs
              </p>
              <p className="text-slate-600 leading-relaxed">
                Representa las <strong>17 Direcciones Territoriales</strong> y los <strong>290 Centros Territoriales de Administración Pública (CETAP)</strong> de la ESAP. Los centros con bloques censados permiten navegación detallada a nivel de aula y oficina; los demás operan bajo el mecanismo de radicación asistida (Fallback).
              </p>
            </div>
          </div>

          {/* Barra de Filtros y Búsqueda */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por territorial, municipio o código de CETAP..."
                value={filtroCetap}
                onChange={(e) => setFiltroCetap(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder:text-slate-400 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Botones de Filtro por Tipo de Inventario */}
              <div className="flex items-center p-1 bg-white rounded-xl border border-slate-200 text-xs font-semibold shadow-2xs">
                <button
                  type="button"
                  onClick={() => setFiltroTipoInventario('TODOS')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filtroTipoInventario === 'TODOS'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos ({totalCetapsGlobal})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipoInventario('CON_INVENTARIO')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    filtroTipoInventario === 'CON_INVENTARIO'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Con Inventario ({conInventarioGlobal})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipoInventario('FALLBACK')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    filtroTipoInventario === 'FALLBACK'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Fallback ({enFallbackGlobal})
                </button>
              </div>

              {/* Botón Expandir / Colapsar Todas */}
              <button
                type="button"
                onClick={toggleExpandirTodos}
                className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
              >
                {territorialesExpandidas.size === direccionesTerritoriales.length ? 'Colapsar Todas' : 'Expandir Todas'}
              </button>
            </div>
          </div>

          {cargandoTerritoriales ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold">Cargando catálogo territorial nacional...</p>
            </div>
          ) : territorialesFiltradas.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-slate-50/60 rounded-2xl border border-slate-200">
              <Globe className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-bold text-slate-700">No se encontraron CETAPs con los filtros actuales</p>
              <p className="text-xs text-slate-500 mt-1">Intente cambiar el texto de búsqueda o el filtro de inventario.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {territorialesFiltradas.map((terr) => {
                const estaExpandida = territorialesExpandidas.has(terr.id);
                const cetapsMostrados = terr.cetapsFiltrados || [];
                const totalCetapsTerr = (terr.cetaps || []).length;
                const cetapsConInventario = (terr.cetaps || []).filter((c: any) => Number(c.total_bloques) > 0).length;

                // Control de límite para no abrumar cuando hay 34 CETAPs
                const verTodos = verTodosCetapsTerr[terr.id] ?? false;
                const LIMITE_INICIAL = 6;
                const tieneMasDeLimite = cetapsMostrados.length > LIMITE_INICIAL;
                const listaRenderizar = verTodos ? cetapsMostrados : cetapsMostrados.slice(0, LIMITE_INICIAL);

                return (
                  <div
                    key={terr.id}
                    className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs hover:border-slate-300 transition-all"
                  >
                    {/* Fila Encabezado de la Dirección Territorial */}
                    <div
                      onClick={() => toggleExpandirTerritorial(terr.id)}
                      className="p-4 bg-slate-50/80 hover:bg-slate-100/70 cursor-pointer flex items-center justify-between gap-4 transition-colors select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-indigo-100/80 text-indigo-700 border border-indigo-200/50">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">{terr.nombre}</h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 text-slate-700">
                              {terr.codigo}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {totalCetapsTerr} CETAP(s) registrados ·{' '}
                            <span className="font-semibold text-blue-700">
                              {cetapsConInventario} con inventario detallado
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700">
                          {cetapsMostrados.length} de {totalCetapsTerr} CETAPs
                        </span>
                        <div className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
                          {estaExpandida ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Desglose de CETAPs al expandir */}
                    {estaExpandida && (
                      <div className="p-5 border-t border-slate-200 bg-slate-50/30 space-y-4">
                        {cetapsMostrados.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-2">
                            Sin CETAPs que coincidan con los filtros en esta territorial.
                          </p>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                              {listaRenderizar.map((cetap: any) => {
                                const tieneInventario = Number(cetap.total_bloques) > 0;
                                return (
                                  <div
                                    key={cetap.id}
                                    className={`rounded-2xl border bg-white hover:border-indigo-300 hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between ${
                                      tieneInventario ? 'border-blue-200 shadow-2xs' : 'border-slate-200'
                                    }`}
                                  >
                                    <div>
                                      <div className="flex items-start justify-between gap-3 mb-3">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                          tieneInventario 
                                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                                        }`}>
                                          CETAP
                                        </span>
                                        <span className="text-xs font-mono font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                          {cetap.codigo}
                                        </span>
                                      </div>

                                      <h4 className="text-base font-bold mb-2 leading-tight text-slate-800">
                                        CETAP {cetap.nombre}
                                      </h4>

                                      <div className="space-y-2 text-xs text-slate-600 mt-4">
                                        <div className="flex items-center gap-2">
                                          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                          <span className="truncate">
                                            Municipio de {cetap.municipio || cetap.nombre}, {terr.nombre}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                                          <span className="truncate">
                                            {tieneInventario
                                              ? `${cetap.total_bloques} Bloque(s) · ${cetap.total_espacios} Espacios Físicos`
                                              : 'Sin bloques censados (Modo Fallback)'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-5 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                                      <span
                                        className={`text-xs font-medium flex items-center gap-1.5 ${
                                          tieneInventario ? 'text-emerald-600 font-semibold' : 'text-slate-500'
                                        }`}
                                      >
                                        <span
                                          className={`w-2 h-2 rounded-full ${
                                            tieneInventario ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                                          }`}
                                        />
                                        {tieneInventario ? 'Inventario Activo' : 'Fallback Directo'}
                                      </span>

                                      {tieneInventario ? (
                                        <button
                                          type="button"
                                          disabled={cargandoBloquesCetap}
                                          onClick={() => abrirBloquesDeCetap(cetap, terr)}
                                          aria-label={`Ver bloques del CETAP ${cetap.nombre}`}
                                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 transition active:scale-95 disabled:opacity-50"
                                        >
                                          Ver Bloques
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </button>
                                      ) : (
                                        <span className="text-[11px] font-medium text-slate-400 italic">
                                          Radicación Asistida
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Botón Mostrar Más / Mostrar Menos */}
                            {tieneMasDeLimite && (
                              <div className="pt-2 flex justify-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setVerTodosCetapsTerr((prev) => ({
                                      ...prev,
                                      [terr.id]: !verTodos,
                                    }))
                                  }
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-2xs"
                                >
                                  {verTodos ? (
                                    <>
                                      <ChevronUp className="w-3.5 h-3.5" />
                                      Mostrar menos ({LIMITE_INICIAL} CETAPs)
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-3.5 h-3.5" />
                                      Ver los {cetapsMostrados.length} CETAPs de {terr.nombre}
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
