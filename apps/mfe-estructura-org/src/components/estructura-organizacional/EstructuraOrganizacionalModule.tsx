/**
 * MODULO - ESTRUCTURA ORGANIZACIONAL ESAP
 * Sistema completo de gestion de estructura territorial jerarquica
 * Usa las tablas auth.seccionales, auth.sedes y auth.geopolitica
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2, Plus, Search, Download, Upload, MapPin,
  ChevronRight, GitBranch, Network, Users, Loader2, ChevronDown, Pencil, Trash2,
  GraduationCap, RefreshCw, AlertTriangle, Layers, Lock, ToggleLeft, ToggleRight,
  CheckCircle2, XCircle
} from 'lucide-react';
import { Card, Button, Badge, Input, ConfirmationDialog } from '@esap-mfe/shared-ui';
import { toast } from 'sonner';
import { Toaster } from '@esap-mfe/shared-ui/sonner';
import { estructuraService } from '../../services/estructuraService';
import { buildApiUrl, CORS_CONFIG } from '../../../config/environment';
import { CreateSeccionalSedeModal } from './CreateSeccionalSedeModal';
import { AsignarUsuariosModal } from './AsignarUsuariosModal';
import { ImportarEstructuraView } from './ImportarEstructuraView';
import { useAuth } from '../../hooks';
import type { Seccional, Sede, EstadisticasEstructuraOrganizacional } from '../../services/api/types';
import { Permissions } from '@esap-mfe/shared-types';

type TipoCreacion = 'seccional' | 'sede';

// Estado del diálogo de confirmación de eliminación.
// - confirm-*         : borrado PERMANENTE del catálogo maestro (cascada).
// - remove-*-periodo  : quitar SOLO de un periodo (no toca el catálogo ni otros periodos).
type ConfirmDeleteState =
  | { kind: 'confirm-seccional'; seccional: Seccional; sedesCount: number }
  | { kind: 'confirm-sede'; sede: Sede }
  | { kind: 'remove-seccional-periodo'; seccional: Seccional; periodo: string }
  | { kind: 'remove-sede-periodo'; sede: Sede; periodo: string };

const ESTRUCTURA_PERIOD_STORAGE_KEY = 'esap.periodo.estructura-organizacional';
const CATALOG_PERIOD_CHANGE_EVENT = 'esap:academic-catalog-period-changed';
const getPeriodCode = (period: any) =>
  String(
    period?.codigo ||
      period?.periodo ||
      (period?.anio && period?.semestre ? `${period.anio}-${period.semestre}` : ''),
  ).trim();
const normalizeCatalogKey = (value?: string | null) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
const getPeriodCreationTime = (period: any) => {
  const value = period?.createdAt || period?.created_at || period?.fechaCreacion;
  const timestamp = value ? new Date(value).getTime() : Number.NaN;
  return Number.isNaN(timestamp) ? 0 : timestamp;
};
const sortPeriodsByCreation = (periods: any[]) =>
  [...periods].sort((a, b) => {
    const creationDifference = getPeriodCreationTime(b) - getPeriodCreationTime(a);
    if (creationDifference !== 0) return creationDifference;
    if (Number(b?.anio || 0) !== Number(a?.anio || 0)) {
      return Number(b?.anio || 0) - Number(a?.anio || 0);
    }
    return Number(b?.semestre || 0) - Number(a?.semestre || 0);
  });

export function EstructuraOrganizacionalModule() {
  const [busqueda, setBusqueda] = useState('');
  const [seccionales, setSeccionales] = useState<Seccional[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [seccionalesOriginales, setSeccionalesOriginales] = useState<Seccional[]>([]);
  const [sedesOriginales, setSedesOriginales] = useState<Sede[]>([]);
  const [periodo, setPeriodo] = useState('');
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [loadingPeriodos, setLoadingPeriodos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [estadisticas, setEstadisticas] = useState<EstadisticasEstructuraOrganizacional | null>(null);
  const [vistaActual, setVistaActual] = useState<'lista' | 'arbol' | 'importar'>('arbol');

  // ── Modo Vista: Catálogo Maestro vs Activación por Periodo ──
  const [modoVista, setModoVista] = useState<'catalogo' | 'periodo'>('catalogo');
  const [subVista, setSubVista] = useState<'arbol' | 'lista'>('arbol');
  const [subVistaPeriodo, setSubVistaPeriodo] = useState<'arbol' | 'lista'>('arbol');
  const [filtroActivacion, setFiltroActivacion] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  // Ids de las sedes activas EN EL PERIODO seleccionado (exacto, por id de sede).
  // Es la fuente de verdad por-periodo que devuelve el backend; evita el matching
  // ambiguo por código/nombre que hacía que periodos distintos se vieran iguales.
  const [activeSedeIds, setActiveSedeIds] = useState<Set<number>>(new Set());
  // Ids de las sedes MIEMBRO del periodo seleccionado (las que "pertenecen" a él,
  // activas o inactivas). La vista de periodo solo muestra estas: así un periodo
  // es independiente y solo contiene lo que se le agregó/importó.
  const [memberSedeIds, setMemberSedeIds] = useState<Set<number>>(new Set());
  const [activacionEnCurso, setActivacionEnCurso] = useState(false);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tipoCreacion, setTipoCreacion] = useState<TipoCreacion>('sede');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPeriodoDropdown, setShowPeriodoDropdown] = useState(false);
  const [busquedaPeriodo, setBusquedaPeriodo] = useState('');
  const [editItem, setEditItem] = useState<Seccional | Sede | null>(null);
  // Confirmación de eliminación (mantenemos el contenido aparte del flag `open`
  // para que no parpadee al cerrarse durante la animación de salida).
  const [confirmState, setConfirmState] = useState<ConfirmDeleteState | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showAsignarModal, setShowAsignarModal] = useState(false);
  const [sinTerritorial, setSinTerritorial] = useState(0);
  const [sinCetap, setSinCetap] = useState(0);
  const { hasRole, hasPermission } = useAuth();
  const isSuperAdmin = hasRole('SUPER_ADMIN') || hasPermission(Permissions.ESTRUCTURA_ORGANIZACIONAL_MANAGE);

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarDatos();
    loadPeriodos();
  }, []);

  // Aplicar filtro de periodo cuando cambien los datos o el periodo seleccionado
  useEffect(() => {
    applyPeriodFilter();
  }, [periodo, periodos, seccionalesOriginales, sedesOriginales]);

  const loadPeriodos = async () => {
    try {
      setLoadingPeriodos(true);
      const data = await estructuraService.obtenerPeriodos();
      const list = Array.isArray(data) ? data : [];
      const sorted = sortPeriodsByCreation(list);
      setPeriodos(sorted);
      if (sorted.length > 0) {
        const savedPeriodCode = localStorage.getItem(ESTRUCTURA_PERIOD_STORAGE_KEY) || '';
        const savedPeriod = sorted.find(
          (item) => getPeriodCode(item) === savedPeriodCode,
        );
        const actual = sorted.find(p => p.estado === 'en_curso');
        setPeriodo(getPeriodCode(savedPeriod || actual || sorted[0]));
      } else {
        setPeriodo('');
      }
    } catch (e) {
      console.error('Error cargando periodos:', e);
      setPeriodos([]);
      setPeriodo('');
    } finally {
      setLoadingPeriodos(false);
    }
  };

  useEffect(() => {
    if (periodo) {
      localStorage.setItem(ESTRUCTURA_PERIOD_STORAGE_KEY, periodo);
      window.dispatchEvent(
        new CustomEvent(CATALOG_PERIOD_CHANGE_EVENT, {
          detail: {
            source: 'estructura-organizacional',
            storageKey: ESTRUCTURA_PERIOD_STORAGE_KEY,
            periodCode: periodo,
          },
        }),
      );
    }
  }, [periodo]);

  // Lista de periodos filtrada por el buscador del dropdown.
  const periodosFiltrados = periodos.filter((p) => {
    const q = busquedaPeriodo.trim().toLowerCase();
    if (!q) return true;
    return (
      String(p.codigo || '').toLowerCase().includes(q) ||
      String(p.anio ?? '').toLowerCase().includes(q) ||
      String(p.estado || '').toLowerCase().includes(q)
    );
  });

  // Activa cualquier periodo (estado en_curso) en todo el sistema, directamente.
  const applyPeriodFilter = async () => {
    if (seccionalesOriginales.length === 0 && sedesOriginales.length === 0) return;

    // Siempre mostrar datos master en el estado principal
    setSeccionales(seccionalesOriginales);
    setSedes(sedesOriginales);

    try {
      const p = periodos.find(x => x.codigo === periodo);
      if (!p || !p.id) {
        setActiveSedeIds(new Set());
        setMemberSedeIds(new Set());
        return;
      }

      const response =
        await estructuraService.obtenerEstadoSedesPeriodo(periodo);
      const status = (response as any)?.data || response;
      setActiveSedeIds(
        new Set<number>(
          (status?.idSedesActivas || []).map((id: unknown) => Number(id)),
        ),
      );
      setMemberSedeIds(
        new Set<number>(
          (status?.idSedesMiembro || []).map((id: unknown) => Number(id)),
        ),
      );
    } catch (err) {
      console.error('Error filtrando por periodo:', err);
      setActiveSedeIds(new Set());
      setMemberSedeIds(new Set());
    }
  };

  // ── Vista por PERIODO: se muestran todas las sedes del catálogo maestro ──
  // El filtro Todos/Activos/Inactivos opera sobre todo el catálogo para permitir
  // activar o desactivar cualquier sede en el periodo seleccionado.
  const sedesMiembro = sedesOriginales;
  const sedesFiltradas = filtroActivacion === 'todos'
    ? sedesMiembro
    : filtroActivacion === 'activos'
      ? sedesMiembro.filter(s => activeSedeIds.has(Number(s.idSede)))
      : sedesMiembro.filter(s => !activeSedeIds.has(Number(s.idSede)));

  // Seccionales filtradas: solo las que tengan al menos una sede visible según el filtro actual.
  const seccionalesFiltradas = seccionalesOriginales.filter(sec =>
    sedesFiltradas.some(s => s.idSeccional === sec.idSeccional),
  );

  // Toggle handler para activar/desactivar CETAP en periodo (persistente)
  const handleToggleSedePeriodStatus = async (idSede: number, activo: boolean) => {
    if (activacionEnCurso) return;
    const sede = sedesOriginales.find(s => s.idSede === idSede);
    if (!sede) return;
    if (!periodo) {
      toast.error('Seleccione un periodo académico primero');
      return;
    }
    // Snapshot para revertir si falla la petición
    const prevIds = activeSedeIds;
    setActivacionEnCurso(true);

    // Actualización optimista local (por id de sede)
    setActiveSedeIds(prev => {
      const next = new Set(prev);
      if (activo) next.add(Number(idSede)); else next.delete(Number(idSede));
      return next;
    });

    try {
      await estructuraService.toggleSedePeriodStatus(idSede, periodo, activo);
      await applyPeriodFilter();
      toast.success(activo ? `CETAP "${sede.nomSede}" activado en ${periodo}` : `CETAP "${sede.nomSede}" desactivado en ${periodo}`);
    } catch (error: any) {
      setActiveSedeIds(prevIds);
      console.error('Error actualizando estado del CETAP en periodo:', error);
      toast.error(error?.response?.data?.message || 'No se pudo actualizar el estado del CETAP en el periodo');
    } finally {
      setActivacionEnCurso(false);
    }
  };

  // Acciones masivas (persistentes). Operan SOLO sobre los miembros del periodo
  // (nunca sobre todo el catálogo global) para no "contaminar" el periodo con
  // sedes que no le pertenecen.
  const handleActivarTodos = async () => {
    if (activacionEnCurso) return;
    if (!periodo) {
      toast.error('Seleccione un periodo académico primero');
      return;
    }
    const allSedeIds = sedesOriginales.map(s => Number(s.idSede));
    if (allSedeIds.length === 0) {
      toast.info('No hay sedes en el catálogo para activar.');
      return;
    }
    const prevIds = activeSedeIds;
    setActivacionEnCurso(true);
    setActiveSedeIds(new Set(allSedeIds));
    try {
      const res = await estructuraService.bulkToggleSedePeriodStatus(periodo, true, allSedeIds);
      const n = res?.data?.actualizados ?? allSedeIds.length;
      const omitidos = res?.data?.omitidos ?? 0;
      await applyPeriodFilter();
      if (omitidos > 0) {
        toast.warning(`${n} CETAPs activados y ${omitidos} omitidos`);
        return;
      }
      toast.success(`${n} CETAPs activados en ${periodo}`);
    } catch (error: any) {
      setActiveSedeIds(prevIds);
      console.error('Error activando todos los CETAPs:', error);
      toast.error(error?.response?.data?.message || 'No se pudieron activar todos los CETAPs');
    } finally {
      setActivacionEnCurso(false);
    }
  };

  const handleDesactivarTodos = async () => {
    if (activacionEnCurso) return;
    if (!periodo) {
      toast.error('Seleccione un periodo académico primero');
      return;
    }
    const allSedeIds = sedesOriginales.map(s => Number(s.idSede));
    if (allSedeIds.length === 0) {
      toast.info('No hay sedes en el catálogo para desactivar.');
      return;
    }
    const prevIds = activeSedeIds;
    setActivacionEnCurso(true);
    setActiveSedeIds(new Set());
    try {
      const res = await estructuraService.bulkToggleSedePeriodStatus(periodo, false, allSedeIds);
      const n = res?.data?.actualizados ?? allSedeIds.length;
      const omitidos = res?.data?.omitidos ?? 0;
      await applyPeriodFilter();
      if (omitidos > 0) {
        toast.warning(`${n} CETAPs desactivados y ${omitidos} omitidos`);
        return;
      }
      toast.success(`Todos los CETAPs desactivados en ${periodo}`);
    } catch (error: any) {
      setActiveSedeIds(prevIds);
      console.error('Error desactivando todos los CETAPs:', error);
      toast.error(error?.response?.data?.message || 'No se pudieron desactivar todos los CETAPs');
    } finally {
      setActivacionEnCurso(false);
    }
  };

  // Toggle handler para activar/desactivar TODA una territorial en periodo (persistente)
  const handleToggleSeccionalPeriodStatus = async (idSeccional: number, activo: boolean) => {
    if (activacionEnCurso) return;
    if (!periodo) {
      toast.error('Seleccione un periodo académico primero');
      return;
    }
    // Todas las sedes de la seccional en el catálogo.
    const sedesDeLaSeccional = sedesOriginales.filter(
      s => s.idSeccional === idSeccional,
    );
    if (sedesDeLaSeccional.length === 0) return;

    const prevIds = activeSedeIds;
    setActivacionEnCurso(true);

    setActiveSedeIds(prev => {
      const next = new Set(prev);
      sedesDeLaSeccional.forEach(sede => {
        const id = Number(sede.idSede);
        if (activo) next.add(id); else next.delete(id);
      });
      return next;
    });

    const seccional = seccionalesOriginales.find(s => s.idSeccional === idSeccional);
    const nombre = seccional?.nomSeccional || 'Territorial';

    try {
      const idSedes = sedesDeLaSeccional
        .map(s => Number(s.idSede))
        .filter(n => Number.isFinite(n));
      const res = await estructuraService.bulkToggleSedePeriodStatus(periodo, activo, idSedes);
      const actualizados = res?.data?.actualizados ?? idSedes.length;
      const omitidos = res?.data?.omitidos ?? 0;
      await applyPeriodFilter();
      if (omitidos > 0) {
        toast.warning(
          `Territorial "${nombre}": ${actualizados} CETAPs actualizados y ${omitidos} omitidos`,
        );
        return;
      }
      toast.success(activo ? `Territorial "${nombre}" y sus ${actualizados} CETAPs activados` : `Territorial "${nombre}" y sus ${actualizados} CETAPs desactivados`);
    } catch (error: any) {
      setActiveSedeIds(prevIds);
      console.error('Error actualizando territorial en periodo:', error);
      toast.error(error?.response?.data?.message || 'No se pudo actualizar la territorial en el periodo');
    } finally {
      setActivacionEnCurso(false);
    }
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [estructuraResponse, statsResponse] = await Promise.all([
        estructuraService.obtenerEstructura(),
        estructuraService.obtenerEstadisticas(),
      ]);
      setSeccionalesOriginales(estructuraResponse.data.seccionales);
      setSedesOriginales(estructuraResponse.data.sedes);
      setEstadisticas(statsResponse.data);
    } catch (error) {
      console.error('Error cargando estructura organizacional:', error);
      toast.error('Error al cargar la estructura organizacional');
    } finally {
      setLoading(false);
    }
    // El conteo de usuarios sin asignar requiere un endpoint que aún no existe en el backend.
    // Se omite para no generar un 404 en consola; la alerta de "sin asignar" queda desactivada.
  };

  const handleCrear = (tipo: TipoCreacion) => {
    setTipoCreacion(tipo);
    setEditItem(null);
    setShowCreateModal(true);
    setShowDropdown(false);
  };

  const handleEditar = (tipo: TipoCreacion, item: Seccional | Sede) => {
    setTipoCreacion(tipo);
    setEditItem(item);
    setShowCreateModal(true);
  };

  // Abre el diálogo de confirmación de eliminación.
  const abrirConfirmacion = (estado: ConfirmDeleteState) => {
    setConfirmState(estado);
    setConfirmOpen(true);
  };

  const handleEliminarSeccional = (seccional: Seccional) => {
    // El conteo SIEMPRE se hace contra el catálogo maestro (`sedesOriginales`),
    // nunca contra la lista filtrada por periodo (`sedes`/`sedesFiltradas`).
    // La eliminación es una operación del catálogo permanente, independiente del
    // periodo: así no se mezclan ni se cuentan mal las sedes entre periodos, y el
    // conteo coincide con lo que el backend eliminará en cascada.
    const sedesCount = sedesOriginales.filter(s => s.idSeccional === seccional.idSeccional).length;
    abrirConfirmacion({ kind: 'confirm-seccional', seccional, sedesCount });
  };

  const handleEliminarSede = (sede: Sede) => {
    abrirConfirmacion({ kind: 'confirm-sede', sede });
  };

  // Quitar SOLO del periodo actual (vista "Activación por Periodo").
  const handleQuitarSeccionalDePeriodo = (seccional: Seccional) => {
    if (!periodo) {
      toast.error('Seleccione un periodo académico primero');
      return;
    }
    abrirConfirmacion({ kind: 'remove-seccional-periodo', seccional, periodo });
  };

  const handleQuitarSedeDePeriodo = (sede: Sede) => {
    if (!periodo) {
      toast.error('Seleccione un periodo académico primero');
      return;
    }
    abrirConfirmacion({ kind: 'remove-sede-periodo', sede, periodo });
  };

  // Ejecuta la acción confirmada en el diálogo.
  const ejecutarEliminacion = async () => {
    if (!confirmState) return;

    try {
      if (confirmState.kind === 'confirm-seccional') {
        // Borrado PERMANENTE en cascada (catálogo maestro, todos los periodos).
        await estructuraService.eliminarSeccional(confirmState.seccional.idSeccional);
        toast.success(
          confirmState.sedesCount > 0
            ? `Seccional y sus ${confirmState.sedesCount} ${confirmState.sedesCount === 1 ? 'sede eliminadas' : 'sedes eliminadas'} exitosamente`
            : 'Seccional eliminada exitosamente',
        );
        cargarDatos();
      } else if (confirmState.kind === 'confirm-sede') {
        await estructuraService.eliminarSede(confirmState.sede.idSede);
        toast.success('Sede eliminada exitosamente');
        cargarDatos();
      } else if (confirmState.kind === 'remove-seccional-periodo') {
        // Quitar SOLO del periodo: no toca el catálogo maestro ni otros periodos.
        await estructuraService.quitarSeccionalDePeriodo(
          confirmState.seccional.idSeccional,
          confirmState.periodo,
        );
        toast.success(
          `Territorial "${confirmState.seccional.nomSeccional}" quitada del periodo ${confirmState.periodo}`,
        );
        await applyPeriodFilter();
      } else if (confirmState.kind === 'remove-sede-periodo') {
        await estructuraService.quitarSedeDePeriodo(
          confirmState.sede.idSede,
          confirmState.periodo,
        );
        toast.success(
          `Sede "${confirmState.sede.nomSede}" quitada del periodo ${confirmState.periodo}`,
        );
        await applyPeriodFilter();
      }
    } catch (error: any) {
      console.error('Error eliminando:', error);
      toast.error(error.response?.data?.message || 'Error al eliminar');
    }
  };

  const handleExportar = () => {
    try {
      const seccionalesMap = new Map(seccionalesOriginales.map(s => [s.idSeccional, s]));

      // Una fila por sede (CETAP), enlazada con su seccional
      const rows = sedesOriginales.map(sede => {
        const sec = sede.idSeccional ? seccionalesMap.get(sede.idSeccional) : undefined;
        return {
          'Seccional': sec?.nomSeccional ?? '',
          'Codigo Seccional': sec?.codSeccional ?? '',
          'CETAP / Sede': sede.nomSede ?? '',
          'Codigo Sede': sede.codSede ?? '',
          'Ubicacion': sede.geopolitica?.nomDivGeopolitica ?? '',
          'Estado': sede.sedeAct ?? '',
          'Capacidad Estudiantes': sede.capacidadEstudiantes ?? 0,
          'Capacidad Docentes': sede.capacidadDocentes ?? 0,
        };
      });

      // Incluir seccionales que aún no tienen sedes para no perderlas en el reporte
      const seccionalesConSedes = new Set(sedesOriginales.map(s => s.idSeccional));
      seccionalesOriginales
        .filter(s => !seccionalesConSedes.has(s.idSeccional))
        .forEach(sec => {
          rows.push({
            'Seccional': sec.nomSeccional ?? '',
            'Codigo Seccional': sec.codSeccional ?? '',
            'CETAP / Sede': '',
            'Codigo Sede': '',
            'Ubicacion': sec.ubicacion?.nomDivGeopolitica ?? '',
            'Estado': '',
            'Capacidad Estudiantes': 0,
            'Capacidad Docentes': 0,
          });
        });

      if (rows.length === 0) {
        toast.error('No hay datos para exportar');
        return;
      }

      const headers = Object.keys(rows[0]);
      const escapar = (val: any) => {
        const texto = String(val ?? '');
        return /[",\n;]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
      };
      const csv = [
        headers.join(','),
        ...rows.map(r => headers.map(h => escapar((r as Record<string, any>)[h])).join(',')),
      ].join('\n');

      // BOM UTF-8 para que Excel respete los acentos
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `estructura_organizacional_${new Date().toISOString().split('T')[0]}.csv`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Estructura exportada (${rows.length} registros)`);
    } catch (error) {
      console.error('Error exportando estructura organizacional:', error);
      toast.error('Error al exportar la estructura organizacional');
    }
  };

  const handleImportar = () => {
    setVistaActual('importar');
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditItem(null);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 space-y-6">
      {vistaActual === 'importar' ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
        <ImportarEstructuraView
          onBack={() => {
            setVistaActual('arbol');
            cargarDatos();
          }}
          onSuccess={() => {
            setVistaActual('arbol');
            cargarDatos();
          }}
          periodos={periodos}
          periodoSeleccionado={periodo}
          onPeriodoChange={(p) => setPeriodo(p)}
        />
        </motion.div>
      ) : (
        <>
          {/* ═══ HEADER CARD — Unified World Class Design ═══ */}
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm">
            {/* Row 1: Title + Tabs + Actions */}
            <div className="px-6 md:px-8 py-4 md:py-5">
              <div className="flex items-center justify-between gap-4">
                {/* Left: Icon + Title */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#EBF0FA' }}>
                    <Building2 className="w-5 h-5 text-[#003DA5]" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">Estructura Organizacional</h1>
                    <p className="text-[11px] text-gray-400 mt-0.5">Gestión de seccionales y sedes ESAP</p>
                  </div>
                </div>

                {/* Center: Tabs + Period */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-1">
                    <button
                      onClick={() => setModoVista('catalogo')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-semibold text-sm ${
                        modoVista === 'catalogo'
                          ? 'bg-white text-[#003DA5] shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Catálogo Maestro
                    </button>
                    <button
                      onClick={() => setModoVista('periodo')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-semibold text-sm ${
                        modoVista === 'periodo'
                          ? 'bg-[#003DA5] text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <ToggleRight className="w-3.5 h-3.5" />
                      Activación por Periodo
                    </button>
                  </div>

                  {/* Period Selector — Only in Periodo mode */}
                  {modoVista === 'periodo' && (
                  <div className="relative" style={{ zIndex: 50 }}>
                    <button
                      onClick={() => setShowPeriodoDropdown(!showPeriodoDropdown)}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all duration-200 group cursor-pointer bg-[#003DA5]/10 border-[#003DA5]/20 hover:bg-[#003DA5]/15"
                    >
                      <GraduationCap className="w-4 h-4 text-[#003DA5]" />
                      <span className="text-sm font-bold text-[#003DA5]">
                        {periodos.find(p => p.codigo === periodo)?.codigo || periodo}
                      </span>
                      {periodos.find(p => p.codigo === periodo)?.estado === 'en_curso' && (
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      )}
                      <motion.div
                        animate={{ rotate: showPeriodoDropdown ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-3.5 h-3.5 text-[#003DA5]/50" />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {showPeriodoDropdown && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowPeriodoDropdown(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.97 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="absolute left-0 mt-2 w-64 bg-white backdrop-blur-2xl rounded-xl shadow-2xl border border-gray-200 p-1.5 z-50 ring-1 ring-black/5"
                          >
                            <div className="px-3 py-1.5 mb-1 flex items-center justify-between">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Periodos Académicos</p>
                              <span className="text-[10px] text-gray-400">{periodos.length}</span>
                            </div>

                            {/* Buscador — útil cuando hay varios periodos */}
                            {periodos.length > 4 && (
                              <div className="px-1.5 mb-1.5">
                                <div className="relative">
                                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                  <input
                                    type="text"
                                    value={busquedaPeriodo}
                                    onChange={(e) => setBusquedaPeriodo(e.target.value)}
                                    placeholder="Buscar periodo..."
                                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30"
                                  />
                                </div>
                              </div>
                            )}

                            <div className="max-h-56 overflow-y-auto space-y-0.5">
                              {periodosFiltrados.length === 0 ? (
                                <div className="px-3 py-4 text-center text-xs text-gray-400">
                                  No se encontraron periodos
                                </div>
                              ) : periodosFiltrados.map((p) => {
                                const esActivo = p.estado === 'en_curso';
                                const esSeleccionado = p.codigo === periodo;
                                return (
                                  <div
                                    key={p.codigo}
                                    className={`flex items-center gap-1 rounded-lg transition-all duration-150 ${
                                      esSeleccionado ? 'bg-[#003DA5] text-white shadow-sm' : 'hover:bg-gray-100'
                                    }`}
                                  >
                                    <button
                                      onClick={() => { setPeriodo(p.codigo); setShowPeriodoDropdown(false); setBusquedaPeriodo(''); }}
                                      className="flex-1 flex items-center justify-between px-3 py-2.5 text-left min-w-0"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                                          esActivo ? 'bg-green-400' : (p.estado === 'finalizado' || p.estado === 'cerrado') ? 'bg-gray-300' : 'bg-amber-400'
                                        }`} />
                                        <span className={`text-sm font-bold ${esSeleccionado ? 'text-white' : 'text-gray-700'}`}>{p.codigo}</span>
                                        {esActivo && (
                                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                                            esSeleccionado ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'
                                          }`}>Actual</span>
                                        )}
                                      </div>
                                      {esSeleccionado && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                  )}
                </div>

                {/* Right: Actions (contextual) */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={cargarDatos}
                    className="p-2 bg-gray-50 text-gray-500 hover:text-[#003DA5] hover:bg-blue-50 border border-gray-200 rounded-lg transition-all duration-200 group"
                    title="Actualizar datos"
                  >
                    <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                  </button>

                  {modoVista === 'catalogo' && (
                  <>
                    {(hasPermission(Permissions.ESTRUCTURA_ORGANIZACIONAL_IMPORT) || hasPermission(Permissions.ESTRUCTURA_ORGANIZACIONAL_MANAGE)) && (
                      <button
                        onClick={handleImportar}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-[#003DA5] bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg transition-all duration-200"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Importar</span>
                      </button>
                    )}

                    <button
                      onClick={handleExportar}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-[#003DA5] bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg transition-all duration-200"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">Exportar</span>
                    </button>

                    {(isSuperAdmin || hasPermission(Permissions.ESTRUCTURA_ORGANIZACIONAL_NODE_CREATE)) && (
                      <div className="relative">
                        <button
                          onClick={() => setShowDropdown(!showDropdown)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-[#003DA5] hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-all duration-200 shadow-sm hover:shadow cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="hidden sm:inline">Crear</span>
                          <motion.div animate={{ rotate: showDropdown ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </motion.div>
                        </button>
                        <AnimatePresence>
                          {showDropdown && (
                            <>
                              <div className="fixed inset-0 z-20" onClick={() => setShowDropdown(false)} />
                              <motion.div
                                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                className="absolute right-0 mt-2 w-72 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200/50 p-1.5 z-30 ring-1 ring-black/5"
                              >
                                <div className="px-3 py-1.5 mb-1">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Layers className="w-3 h-3" />
                                    Crear Registro Master
                                  </span>
                                </div>
                                <button
                                  onClick={() => { handleCrear('seccional'); setShowDropdown(false); }}
                                  className="w-full p-2.5 rounded-lg hover:bg-gray-50 transition-all text-left flex items-center gap-3 group"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-50 to-green-100 text-green-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <Building2 className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold text-gray-900 group-hover:text-green-700 transition-colors">Nueva Seccional</div>
                                    <div className="text-[10px] text-gray-400 leading-tight">Dirección territorial regional</div>
                                  </div>
                                </button>
                                <button
                                  onClick={() => { handleCrear('sede'); setShowDropdown(false); }}
                                  className="w-full p-2.5 rounded-lg hover:bg-gray-50 transition-all text-left flex items-center gap-3 group mt-0.5"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 text-orange-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <MapPin className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold text-gray-900 group-hover:text-orange-700 transition-colors">Nuevo CETAP</div>
                                    <div className="text-[10px] text-gray-400 leading-tight">Sede para oferta educativa</div>
                                  </div>
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── BANNER CONTEXTUAL DE PERIODO — Solo en modo Activación ── */}
          {modoVista === 'periodo' && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="rounded-xl bg-gradient-to-r from-[#003DA5] to-blue-600 px-5 py-3 shadow-lg"
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* Left: Context label */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                    <ToggleRight className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-white/90 text-sm font-medium">Gestionando activación de sedes para <span className="font-bold text-white">{periodo}</span></p>
                </div>

                {/* Filtros rápidos */}
                <div className="flex items-center gap-1 bg-white/15 rounded-lg p-0.5 backdrop-blur">
                  <button
                    onClick={() => setFiltroActivacion('todos')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      filtroActivacion === 'todos' ? 'bg-white text-[#003DA5] shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >Todos</button>
                  <button
                    onClick={() => setFiltroActivacion('activos')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                      filtroActivacion === 'activos' ? 'bg-green-400 text-white shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  ><CheckCircle2 className="w-3 h-3" />Activos</button>
                  <button
                    onClick={() => setFiltroActivacion('inactivos')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                      filtroActivacion === 'inactivos' ? 'bg-red-400 text-white shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  ><XCircle className="w-3 h-3" />Inactivos</button>
                </div>

                {/* Acciones masivas */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleActivarTodos}
                    disabled={activacionEnCurso}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-white/15 hover:bg-white/25 rounded-lg transition-colors border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Activar Todos
                  </button>
                  <button
                    onClick={handleDesactivarTodos}
                    disabled={activacionEnCurso}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-white/15 hover:bg-white/25 rounded-lg transition-colors border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle className="w-3 h-3" />
                    Desactivar Todos
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Búsqueda + Sub-vista toggle */}
          <Card className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por nombre o código..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Toggle de sub-vistas */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => modoVista === 'catalogo' ? setSubVista('lista') : setSubVistaPeriodo('lista')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                    (modoVista === 'catalogo' ? subVista : subVistaPeriodo) === 'lista'
                      ? 'bg-white text-[#003DA5] shadow-sm font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Network className="w-4 h-4" />
                  <span className="text-sm">Organigrama</span>
                </button>
                <button
                  onClick={() => modoVista === 'catalogo' ? setSubVista('arbol') : setSubVistaPeriodo('arbol')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                    (modoVista === 'catalogo' ? subVista : subVistaPeriodo) === 'arbol'
                      ? 'bg-[#003DA5] text-white shadow-sm font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <GitBranch className="w-4 h-4" />
                  <span className="text-sm">Vista Árbol</span>
                </button>
              </div>
            </div>
          </Card>

          {/* Alerta usuarios sin asignar */}
          {(sinTerritorial > 0 || sinCetap > 0) && (
            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="flex-1 text-sm text-amber-800">
                {sinTerritorial > 0 && (
                  <span className="font-medium">{sinTerritorial} usuario(s) sin territorial</span>
                )}
                {sinTerritorial > 0 && sinCetap > 0 && <span> · </span>}
                {sinCetap > 0 && (
                  <span className="font-medium">{sinCetap} usuario(s) sin CETAP</span>
                )}
              </div>
              <button
                onClick={() => setShowAsignarModal(true)}
                className="text-sm font-medium text-amber-800 underline hover:text-amber-900 shrink-0"
              >
                Asignar ahora
              </button>
            </div>
          )}

          {/* Vista según modo y sub-vista */}
          {loading ? (
            <Card className="p-12">
              <div className="flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-[#003DA5]" />
                <p className="text-sm text-gray-600">Cargando estructura organizacional...</p>
              </div>
            </Card>
          ) : modoVista === 'catalogo' ? (
            subVista === 'arbol' ? (
              <VistaArbolSeccionalesSedes
                busqueda={busqueda}
                seccionales={seccionalesOriginales}
                sedes={sedesOriginales}
                estadisticas={estadisticas}
                onEditarSeccional={(seccional) => handleEditar('seccional', seccional)}
                onEditarSede={(sede) => handleEditar('sede', sede)}
                onEliminarSeccional={handleEliminarSeccional}
                onEliminarSede={handleEliminarSede}
                activeSedeIds={new Set()}
                periodo=""
                onToggleActive={() => {}}
                onToggleSeccionalActive={() => {}}
                modo="catalogo"
              />
            ) : (
              <VistaListaTerritorialesCetap
                busqueda={busqueda}
                seccionales={seccionalesOriginales}
                sedes={sedesOriginales}
                activeSedeIds={new Set()}
                periodo=""
                onToggleActive={() => {}}
                onToggleSeccionalActive={() => {}}
                modo="catalogo"
              />
            )
          ) : (
            subVistaPeriodo === 'arbol' ? (
              <VistaArbolSeccionalesSedes
                busqueda={busqueda}
                seccionales={seccionalesFiltradas}
                sedes={sedesFiltradas}
                estadisticas={estadisticas}
                onEditarSeccional={() => {}}
                onEditarSede={() => {}}
                onEliminarSeccional={handleQuitarSeccionalDePeriodo}
                onEliminarSede={handleQuitarSedeDePeriodo}
                activeSedeIds={activeSedeIds}
                periodo={periodo}
                onToggleActive={handleToggleSedePeriodStatus}
                onToggleSeccionalActive={handleToggleSeccionalPeriodStatus}
                modo="periodo"
              />
            ) : (
              <VistaListaTerritorialesCetap
                busqueda={busqueda}
                seccionales={seccionalesFiltradas}
                sedes={sedesFiltradas}
                activeSedeIds={activeSedeIds}
                periodo={periodo}
                onToggleActive={handleToggleSedePeriodStatus}
                onToggleSeccionalActive={handleToggleSeccionalPeriodStatus}
                modo="periodo"
              />
            )
          )}
        </>
      )}

      {/* Modal Crear/Editar Seccional/Sede */}
      <CreateSeccionalSedeModal
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        onSuccess={cargarDatos}
        tipo={tipoCreacion}
        seccionales={seccionalesOriginales}
        sedes={sedesOriginales}
        editItem={editItem}
      />

      {/* Diálogo de confirmación de eliminación / quitar de periodo */}
      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={ejecutarEliminacion}
        // Quitar de un periodo NO es destructivo permanente -> warning. Borrar del
        // catálogo maestro sí lo es -> danger.
        variant={
          confirmState?.kind === 'remove-seccional-periodo' || confirmState?.kind === 'remove-sede-periodo'
            ? 'warning'
            : 'danger'
        }
        title={
          confirmState?.kind === 'confirm-seccional'
            ? (confirmState.sedesCount > 0 ? 'Eliminar seccional y sus sedes' : 'Eliminar seccional')
            : confirmState?.kind === 'confirm-sede'
              ? 'Eliminar sede'
              : confirmState?.kind === 'remove-seccional-periodo'
                ? 'Quitar seccional del periodo'
                : 'Quitar sede del periodo'
        }
        description={
          confirmState?.kind === 'confirm-seccional'
            ? (confirmState.sedesCount > 0
                ? `La seccional "${confirmState.seccional.nomSeccional}" tiene ${confirmState.sedesCount} ${confirmState.sedesCount === 1 ? 'sede asociada' : 'sedes asociadas'}. Si continúas, se eliminará la seccional JUNTO CON ${confirmState.sedesCount === 1 ? 'esa sede' : `sus ${confirmState.sedesCount} sedes`}.`
                : `¿Estás seguro de eliminar la seccional "${confirmState.seccional.nomSeccional}"?`)
            : confirmState?.kind === 'confirm-sede'
              ? `¿Estás seguro de eliminar la sede "${confirmState.sede.nomSede}"?`
              : confirmState?.kind === 'remove-seccional-periodo'
                ? `Se quitará la territorial "${confirmState.seccional.nomSeccional}" y sus sedes SOLO del periodo ${confirmState.periodo}. Seguirá existiendo en el catálogo maestro y en los demás periodos.`
                : confirmState?.kind === 'remove-sede-periodo'
                  ? `Se quitará la sede "${confirmState.sede.nomSede}" SOLO del periodo ${confirmState.periodo}. Seguirá existiendo en el catálogo maestro y en los demás periodos.`
                  : ''
        }
        confirmText={
          confirmState?.kind === 'confirm-seccional' && confirmState.sedesCount > 0
            ? 'Sí, eliminar todo'
            : confirmState?.kind === 'remove-seccional-periodo' || confirmState?.kind === 'remove-sede-periodo'
              ? 'Sí, quitar del periodo'
              : 'Sí, eliminar'
        }
        cancelText="Cancelar"
      />

      {/* Modal Asignar Usuarios */}
      <AsignarUsuariosModal
        isOpen={showAsignarModal}
        onClose={() => setShowAsignarModal(false)}
        onSuccess={cargarDatos}
        territoriales={seccionalesOriginales
          .filter(s => s.codSeccional?.toUpperCase() !== 'SCENT')
          .map(s => ({
            id: String(s.idSeccional),
            nombre: s.nomSeccional,
            cetap: sedesOriginales
              .filter(sede => sede.idSeccional === s.idSeccional)
              .map(sede => ({ id: String(sede.idSede), nombre: sede.nomSede }))
          }))
        }
      />
    </div>
  );
}

// ============================================================================
// VISTA ARBOL SECCIONALES Y SEDES
// ============================================================================

interface VistaArbolProps {
  busqueda: string;
  seccionales: Seccional[];
  sedes: Sede[];
  estadisticas: EstadisticasEstructuraOrganizacional | null;
  onEditarSeccional: (seccional: Seccional) => void;
  onEditarSede: (sede: Sede) => void;
  onEliminarSeccional: (seccional: Seccional) => void;
  onEliminarSede: (sede: Sede) => void;
  activeSedeIds: Set<number>;
  periodo: string;
  onToggleActive: (idSede: number, activo: boolean) => void;
  onToggleSeccionalActive: (idSeccional: number, activo: boolean) => void;
  modo: 'catalogo' | 'periodo';
}

function VistaArbolSeccionalesSedes({
  busqueda,
  seccionales,
  sedes,
  estadisticas,
  onEditarSeccional,
  onEditarSede,
  onEliminarSeccional,
  onEliminarSede,
  activeSedeIds,
  periodo,
  onToggleActive,
  onToggleSeccionalActive,
  modo,
}: VistaArbolProps) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission(Permissions.ESTRUCTURA_ORGANIZACIONAL_NODE_EDIT) || hasPermission(Permissions.ESTRUCTURA_ORGANIZACIONAL_MANAGE);
  const canDelete = hasPermission(Permissions.ESTRUCTURA_ORGANIZACIONAL_NODE_DELETE) || hasPermission(Permissions.ESTRUCTURA_ORGANIZACIONAL_MANAGE);
  
  const [expandidosSedeCentral, setExpandidosSedeCentral] = useState(true); // ✅ CERRADO por defecto
  const [seccionalesExpandidas, setSeccionalesExpandidas] = useState<Record<number, boolean>>({});

  const toggleSeccional = (id: number) => {
    setSeccionalesExpandidas(prev => ({
      ...prev,
      [id]: !(prev[id] ?? false)
    }));
  };

  // Filtrar seccionales por busqueda
  const filtrarSeccional = (seccional: Seccional): boolean => {
    if (busqueda === '') return true;
    const searchLower = busqueda.toLowerCase();
    return (
      seccional.nomSeccional.toLowerCase().includes(searchLower) ||
      seccional.codSeccional?.toLowerCase().includes(searchLower) ||
      seccional.ubicacion?.nomDivGeopolitica?.toLowerCase().includes(searchLower) ||
      false
    );
  };

  // Filtrar sedes por busqueda
  const filtrarSede = (sede: Sede): boolean => {
    if (busqueda === '') return true;
    const searchLower = busqueda.toLowerCase();
    return (
      sede.nomSede.toLowerCase().includes(searchLower) ||
      sede.codSede?.toLowerCase().includes(searchLower) ||
      sede.geopolitica?.nomDivGeopolitica?.toLowerCase().includes(searchLower) ||
      false
    );
  };

  const sedeCentral = seccionales.find(
    (seccional) => seccional.codSeccional?.toUpperCase() === 'SCENT'
  ) ?? null;

  // Filtrar territoriales (excluye sede central) que coinciden con la busqueda o tienen sedes que coinciden
  const territorialesFiltradas = seccionales
    .filter((seccional) => seccional.idSeccional !== sedeCentral?.idSeccional)
    .map(seccional => {
      const seccionalMatch = filtrarSeccional(seccional);
      const sedesHijas = sedes.filter(s => s.idSeccional === seccional.idSeccional && filtrarSede(s));

      if (seccionalMatch || sedesHijas.length > 0) {
        return {
          seccional,
          sedes: sedesHijas.length > 0 ? sedesHijas : sedes.filter(s => s.idSeccional === seccional.idSeccional)
        };
      }
      return null;
    }).filter(Boolean) as Array<{ seccional: Seccional; sedes: Sede[] }>;

  const isSedeActiva = (sede: Sede) => {
    if (!periodo) return false;
    return activeSedeIds.has(Number(sede.idSede));
  };

  const localActiveSedesCount = sedes.filter(isSedeActiva).length;
  const localActiveSeccionalesCount = seccionales.filter(sec =>
    sec.codSeccional?.toUpperCase() === 'SCENT' ||
    sedes.some(s => s.idSeccional === sec.idSeccional && isSedeActiva(s))
  ).length;

  const currentTotalSeccionales = seccionales.length;
  const currentTotalSedes = sedes.length;
  const currentTotalEstudiantes = sedes.reduce((sum, s) => sum + (s.capacidadEstudiantes || 0), 0);
  const currentTotalDocentes = sedes.reduce((sum, s) => sum + (s.capacidadDocentes || 0), 0);

  return (
    <Card className="p-6">
      {/* Estadisticas */}
      <div className="mb-6 flex items-center gap-6 text-sm text-gray-600 flex-wrap">
        {modo === 'catalogo' ? (
          <>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-green-600" />
              <span className="font-medium">{currentTotalSeccionales} Seccionales</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-600" />
              <span className="font-medium">{currentTotalSedes} CETAPs</span>
            </div>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span className="font-medium">{currentTotalEstudiantes} Estudiantes</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              <span className="font-medium">{currentTotalDocentes} Docentes</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
              <Lock className="w-3 h-3" />
              <span>Catálogo permanente</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-green-600" />
              <span className="font-medium">{localActiveSeccionalesCount} de {currentTotalSeccionales} Seccionales Activas</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-600" />
              <span className="font-medium">{localActiveSedesCount} de {currentTotalSedes} CETAPs Activos</span>
            </div>
          </>
        )}
      </div>

      <div className="space-y-2">
        {territorialesFiltradas.length === 0 && !sedeCentral ? (
          <div className="text-center py-8 text-gray-500">
            No se encontraron resultados para "{busqueda}"
          </div>
        ) : (
          <div className="space-y-2">
            {sedeCentral && (
              <div className="mb-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white">
                  <button
                    onClick={() => setExpandidosSedeCentral(!expandidosSedeCentral)}
                    className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 transition-colors"
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform ${expandidosSedeCentral ? 'rotate-90' : ''}`} />
                  </button>
                  <Badge className="bg-blue-100 text-blue-700 border-0">
                    Sede Central
                  </Badge>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {sedeCentral.nomSeccional}
                      </span>
                      {sedeCentral.codSeccional && (
                        <span className="text-sm text-gray-500">({sedeCentral.codSeccional})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      {sedeCentral.ubicacion && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {sedeCentral.ubicacion.nomDivGeopolitica}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {territorialesFiltradas.length} Territoriales
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <AnimatePresence>
              {expandidosSedeCentral && (
                <motion.div
                  key="territoriales-sede-central"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="ml-6 space-y-2 overflow-hidden"
                >
                  {territorialesFiltradas.map((item, index) => {
                    if (!item) return null;
                    const { seccional, sedes: sedesSeccional } = item;
                    const isExpandida = seccionalesExpandidas[seccional.idSeccional] ?? false;
                    const isTerritorialActiva = sedesSeccional.some(s => isSedeActiva(s));

                    return (
                      <div
                        key={seccional.idSeccional ?? `seccional-${index}`}
                        className="group"
                      >
                        <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                          modo === 'catalogo' || isTerritorialActiva
                            ? 'border-gray-200 hover:border-[#003DA5] hover:shadow-md bg-white'
                            : 'border-dashed border-gray-300 bg-gray-50/50 opacity-70 hover:opacity-100 hover:bg-white hover:border-[#003DA5] hover:shadow-md'
                        }`}>
                          <button
                            onClick={() => toggleSeccional(seccional.idSeccional)}
                            className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 transition-colors"
                          >
                            <ChevronRight className={`w-4 h-4 transition-transform ${isExpandida ? 'rotate-90' : ''}`} />
                          </button>

                          <Badge className={modo === 'catalogo' || isTerritorialActiva ? "bg-green-100 text-green-700 border-0" : "bg-gray-100 text-gray-400 border border-gray-200"}>
                            Territorial
                          </Badge>
                          {modo === 'periodo' && !isTerritorialActiva && (
                            <Badge className="bg-gray-100 text-gray-400 border border-gray-200 text-xs">
                              Inactiva en Periodo
                            </Badge>
                          )}

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{seccional.nomSeccional}</span>
                              {seccional.codSeccional && (
                                <span className="text-sm text-gray-500">({seccional.codSeccional})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                              {seccional.ubicacion && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {seccional.ubicacion.nomDivGeopolitica}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {sedesSeccional.length} Sedes
                              </span>
                              <span className="flex items-center gap-1" title="Total estudiantes">
                                <GraduationCap className="w-3 h-3 text-blue-500" />
                                {sedesSeccional.reduce((sum, s) => sum + (s.capacidadEstudiantes ?? 0), 0)}
                              </span>
                              <span className="flex items-center gap-1" title="Total docentes">
                                <Users className="w-3 h-3 text-green-500" />
                                {sedesSeccional.reduce((sum, s) => sum + (s.capacidadDocentes ?? 0), 0)}
                              </span>
                            </div>
                          </div>

                          {modo === 'catalogo' && (
                          <div className="flex items-center gap-1">
                            {canEdit && (
                              <button
                                onClick={() => onEditarSeccional(seccional)}
                                className="p-2 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
                                title="Editar seccional"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => onEliminarSeccional(seccional)}
                                className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                                title="Eliminar seccional"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          )}

                          {/* Toggle activar/desactivar TODA la territorial — solo en Periodo */}
                          {modo === 'periodo' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onToggleSeccionalActive(seccional.idSeccional, !isTerritorialActiva); }}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border shrink-0 cursor-pointer ${
                                isTerritorialActiva
                                  ? 'bg-green-50 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                                  : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200'
                              }`}
                              title={isTerritorialActiva ? `Desactivar ${seccional.nomSeccional} y todos sus CETAPs` : `Activar ${seccional.nomSeccional} y todos sus CETAPs`}
                            >
                              {isTerritorialActiva ? (
                                <><CheckCircle2 className="w-3.5 h-3.5" />Activa</>
                              ) : (
                                <><XCircle className="w-3.5 h-3.5" />Inactiva</>
                              )}
                            </button>
                          )}

                          {/* Quitar la territorial SOLO de este periodo — solo en Periodo */}
                          {modo === 'periodo' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onEliminarSeccional(seccional); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0 cursor-pointer"
                              title={`Quitar "${seccional.nomSeccional}" de este periodo`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Sedes de esta seccional */}
                        <AnimatePresence>
                          {isExpandida && sedesSeccional.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25 }}
                              className="mt-2 ml-6 space-y-1 overflow-hidden"
                            >
                              {sedesSeccional.map((sede, sedeIndex) => {
                                const active = isSedeActiva(sede);
                                return (
                                <div
                                  key={sede.idSede ?? `sede-${sedeIndex}`}
                                  className="group"
                                >
                                  <div className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${
                                    modo === 'catalogo' || active
                                      ? 'border-gray-200 hover:border-[#003DA5] hover:shadow-sm bg-gray-50'
                                      : 'border-dashed border-gray-300 bg-gray-50/50 opacity-60 saturate-50 hover:opacity-100 hover:saturate-100 hover:bg-gray-50'
                                  }`}>
                                    <div className="w-6" />

                                    <Badge className={`${modo === 'catalogo' || active ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-400 border border-gray-200'} border-0 text-xs`}>
                                      CETAP
                                    </Badge>
                                    {modo === 'periodo' && !active && (
                                      <Badge className="bg-gray-100 text-gray-400 border border-gray-200 text-[10px] py-0 px-1.5 font-normal">
                                        Inactivo en Periodo
                                      </Badge>
                                    )}

                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-sm font-medium ${modo === 'catalogo' || active ? 'text-gray-900' : 'text-gray-400'}`}>{sede.nomSede}</span>
                                        {sede.codSede && (
                                          <span className="text-xs text-gray-500">({sede.codSede})</span>
                                        )}
                                        {sede.sedeAct && sede.sedeAct !== 'ACTIVO' && (
                                          <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                                            {sede.sedeAct}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3 text-xs text-gray-600 mt-0.5">
                                        {sede.geopolitica && (
                                          <span className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {sede.geopolitica.nomDivGeopolitica}
                                          </span>
                                        )}
                                        <span className="flex items-center gap-1" title="Capacidad de estudiantes">
                                          <GraduationCap className="w-3 h-3 text-blue-500" />
                                          {sede.capacidadEstudiantes ?? 0}
                                        </span>
                                        <span className="flex items-center gap-1" title="Capacidad de docentes">
                                          <Users className="w-3 h-3 text-green-500" />
                                          {sede.capacidadDocentes ?? 0}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Toggle Switch — solo en Periodo */}
                                    {modo === 'periodo' && (
                                      <div className="flex items-center shrink-0 mr-2">
                                        <button
                                          type="button"
                                          onClick={() => onToggleActive(sede.idSede, !active)}
                                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            active ? 'bg-[#003DA5]' : 'bg-gray-200'
                                          }`}
                                          title={active ? 'Desactivar en este periodo' : 'Activar en este periodo'}
                                        >
                                          <span
                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                              active ? 'translate-x-4' : 'translate-x-0'
                                            }`}
                                          />
                                        </button>
                                        {/* Quitar la sede SOLO de este periodo */}
                                        <button
                                          type="button"
                                          onClick={() => onEliminarSede(sede)}
                                          className="ml-1 p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                                          title={`Quitar "${sede.nomSede}" de este periodo`}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}

                                    {/* Botones de accion para Sede — solo en Catálogo */}
                                    {modo === 'catalogo' && (
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => onEditarSede(sede)}
                                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
                                          title="Editar sede"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => onEliminarSede(sede)}
                                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                                          title="Eliminar sede"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// VISTA ORGANIGRAMA - ESTRUCTURA JERÁRQUICA ESAP (WORLD-CLASS)
// ============================================================================

function VistaListaTerritorialesCetap({
  busqueda,
  seccionales,
  sedes,
  activeSedeIds,
  periodo,
  onToggleActive,
  onToggleSeccionalActive,
  modo,
}: {
  busqueda: string;
  seccionales: Seccional[];
  sedes: Sede[];
  activeSedeIds: Set<number>;
  periodo: string;
  onToggleActive: (idSede: number, activo: boolean) => void;
  onToggleSeccionalActive: (idSeccional: number, activo: boolean) => void;
  modo: 'catalogo' | 'periodo';
}) {
  const [territorialExpandida, setTerritorialExpandida] = useState<number | null>(null);
  const [hoveredTerritorial, setHoveredTerritorial] = useState<number | null>(null);

  const sedeCentral = seccionales.find(
    (seccional) => seccional.codSeccional?.toUpperCase() === 'SCENT'
  ) ?? null;

  const searchLower = busqueda.trim().toLowerCase();

  const territorialesFiltradas = seccionales
    .filter((seccional) => seccional.idSeccional !== sedeCentral?.idSeccional)
    .map((seccional) => {
      const sedesTerritorial = sedes.filter((sede) => sede.idSeccional === seccional.idSeccional);

      if (!searchLower) {
        return { seccional, sedes: sedesTerritorial };
      }

      const matchSeccional =
        seccional.nomSeccional.toLowerCase().includes(searchLower) ||
        (seccional.codSeccional ?? '').toLowerCase().includes(searchLower) ||
        (seccional.ubicacion?.nomDivGeopolitica ?? '').toLowerCase().includes(searchLower);

      const sedesFiltradas = sedesTerritorial.filter(
        (sede) =>
          sede.nomSede.toLowerCase().includes(searchLower) ||
          (sede.codSede ?? '').toLowerCase().includes(searchLower) ||
          (sede.geopolitica?.nomDivGeopolitica ?? '').toLowerCase().includes(searchLower)
      );

      if (matchSeccional || sedesFiltradas.length > 0) {
        return {
          seccional,
          sedes: sedesFiltradas.length > 0 ? sedesFiltradas : sedesTerritorial,
        };
      }

      return null;
    })
    .filter(Boolean) as Array<{ seccional: Seccional; sedes: Sede[] }>;

  const isSedeActiva = (sede: Sede) => {
    if (!periodo) return false;
    return activeSedeIds.has(Number(sede.idSede));
  };

  const totalCetap = territorialesFiltradas.reduce((acc, item) => acc + item.sedes.length, 0);
  const totalTerritoriales = territorialesFiltradas.length;
  const activeSedesCount = sedes.filter(isSedeActiva).length;
  const activeSeccionalesCount = seccionales.filter(sec =>
    sec.codSeccional?.toUpperCase() !== 'SCENT' &&
    sedes.some(s => s.idSeccional === sec.idSeccional && isSedeActiva(s))
  ).length;

  return (
    <>
      <Toaster position="bottom-right" richColors />
      <div className="space-y-6">
        {/* Dashboard de Métricas - Diseño Mejorado */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5" />
            <div className="relative p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#003DA5] to-[#0052CC] flex items-center justify-center shadow-lg">
                  <Building2 className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <Badge className="bg-blue-100 text-blue-700 border-0">Nacional</Badge>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 mb-1">1</p>
                <p className="text-sm text-gray-600">{sedeCentral?.nomSeccional || 'Sede Central'}</p>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5" />
            <div className="relative p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2962FF] to-[#1E40AF] flex items-center justify-center shadow-lg">
                  <MapPin className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <Badge className="bg-blue-100 text-blue-700 border-0">Activas</Badge>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{modo === 'periodo' ? `${activeSeccionalesCount} de ${totalTerritoriales}` : totalTerritoriales}</p>
                <p className="text-sm text-gray-600">{modo === 'periodo' ? 'Territoriales Activas' : 'Unidades Territoriales'}</p>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/5" />
            <div className="relative p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                  <Network className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <Badge className="bg-orange-100 text-orange-700 border-0">Red</Badge>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{modo === 'periodo' ? `${activeSedesCount} de ${totalCetap}` : totalCetap}</p>
                <p className="text-sm text-gray-600">{modo === 'periodo' ? 'CETAP Activos' : 'CETAP en Colombia'}</p>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5" />
            <div className="relative p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#003DA5] to-[#2962FF] flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <Badge className="bg-blue-100 text-blue-700 border-0">Total</Badge>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {modo === 'periodo' ? `${Math.round((activeSedesCount / (totalCetap || 1)) * 100)}%` : (totalTerritoriales + totalCetap).toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">{modo === 'periodo' ? 'Cobertura Activa' : 'Unidades Totales'}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Organigrama Jerárquico - Diseño World-Class */}
        <Card className="relative overflow-hidden">
          {/* Background decorativo */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-blue-50/30" />

          <div className="relative p-8 md:p-12">
            {/* NIVEL 1: SEDE CENTRAL - Diseño Premium */}
            <div className="flex flex-col items-center mb-16">
              <div className="relative z-10">
                {/* Tarjeta Sede Central */}
                <div
                  className="relative px-10 py-8 rounded-3xl border-4 shadow-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 50%, #2962FF 100%)',
                    borderColor: '#002D7A',
                    minWidth: '420px',
                    maxWidth: '420px'
                  }}
                >
                  {/* Decoración de fondo */}
                  <div className="absolute inset-0 rounded-3xl overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-16 -translate-x-16" />
                  </div>

                  <div className="relative">
                    <div className="flex items-center gap-5 mb-5">
                      <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-xl border border-white/30">
                        <Building2 className="w-9 h-9 text-white" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1">
                        <Badge className="bg-white/30 text-white border-white/40 border mb-2 backdrop-blur">
                          Sede Nacional
                        </Badge>
                        <h3 className="text-2xl font-bold text-white mb-1">ESAP Colombia</h3>
                        <div className="flex items-center gap-2 text-blue-100">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm">
                            {sedeCentral?.ubicacion?.nomDivGeopolitica ?? 'Sede principal'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 pt-4 border-t border-white/30">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-blue-100">Territoriales</p>
                          <p className="text-lg font-bold text-white">{totalTerritoriales}</p>
                        </div>
                      </div>
                      <div className="w-px h-10 bg-white/30" />
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                          <Network className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-blue-100">CETAP</p>
                          <p className="text-lg font-bold text-white">{totalCetap}</p>
                        </div>
                      </div>
                      <div className="w-px h-10 bg-white/30" />
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                          <Users className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-blue-100">Cobertura</p>
                          <p className="text-lg font-bold text-white">100%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conector SVG mejorado */}
                <svg className="absolute left-1/2 -translate-x-1/2" style={{ top: '100%', width: '2px', height: '60px' }}>
                  <defs>
                    <linearGradient id="connector-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#003DA5" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#2962FF" stopOpacity="0.6" />
                    </linearGradient>
                  </defs>
                  <line x1="1" y1="0" x2="1" y2="60" stroke="url(#connector-gradient)" strokeWidth="2" />
                  <circle cx="1" cy="60" r="4" fill="#2962FF" />
                </svg>
              </div>
            </div>

            {/* NIVEL 2: TERRITORIALES - Grid Optimizado */}
            <div className="relative">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {territorialesFiltradas.map((item, index) => {
                  const { seccional, sedes: sedesTerritorial } = item;
                  const isExpanded = territorialExpandida === seccional.idSeccional;
                  const isHovered = hoveredTerritorial === seccional.idSeccional;
                  const isTerritorialActiva = sedesTerritorial.some(s => isSedeActiva(s));
                  const sedesActivasCount = sedesTerritorial.filter(s => isSedeActiva(s)).length;

                  return (
                    <div
                      key={seccional.idSeccional ?? `seccional-${index}`}
                      className="relative"
                      onMouseEnter={() => setHoveredTerritorial(seccional.idSeccional)}
                      onMouseLeave={() => setHoveredTerritorial(null)}
                    >
                      {/* Línea conectora SVG */}
                      <svg
                        className="absolute left-1/2 -translate-x-1/2"
                        style={{ bottom: '100%', width: '2px', height: '24px' }}
                      >
                        <line
                          x1="1"
                          y1="0"
                          x2="1"
                          y2="24"
                          stroke={isHovered || isExpanded ? '#2962FF' : '#BFDBFE'}
                          strokeWidth="2"
                          className="transition-colors duration-300"
                        />
                      </svg>

                      {/* Tarjeta Territorial - Diseño Premium */}
                      <div
                        className={`relative rounded-2xl border-2 overflow-hidden transition-all duration-300 ${isExpanded ? 'shadow-2xl scale-[1.02]' : 'shadow-lg hover:shadow-xl'
                          }`}
                        style={{
                          borderColor: isExpanded ? '#2962FF' : isHovered ? '#93C5FD' : (modo === 'periodo' && !isTerritorialActiva ? '#D1D5DB' : '#E5E7EB'),
                          background: isExpanded
                            ? 'linear-gradient(135deg, #2962FF 0%, #1E40AF 100%)'
                            : (modo === 'periodo' && !isTerritorialActiva ? '#F9FAFB' : 'white'),
                          opacity: modo === 'periodo' && !isTerritorialActiva && !isExpanded ? 0.7 : 1,
                        }}
                      >
                        {/* Decoración superior */}
                        {!isExpanded && (
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400" />
                        )}

                        <div className="p-5">
                          {/* Header */}
                          <div className="flex items-start gap-3 mb-4">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${isExpanded
                                ? 'bg-white/20 backdrop-blur-xl border border-white/30'
                                : 'bg-gradient-to-br from-blue-50 to-blue-100'
                                }`}
                            >
                              <MapPin
                                className="w-6 h-6"
                                style={{ color: isExpanded ? 'white' : '#2962FF' }}
                                strokeWidth={2.5}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <Badge
                                className="mb-2 border-0"
                                style={{
                                  background: isExpanded ? 'rgba(255,255,255,0.25)' : '#DBEAFE',
                                  color: isExpanded ? 'white' : '#1E40AF'
                                }}
                              >
                                Territorial
                              </Badge>
                              <h4
                                className="font-bold text-base line-clamp-2 mb-1.5 leading-tight"
                                style={{ color: isExpanded ? 'white' : '#111827' }}
                              >
                                {seccional.nomSeccional}
                              </h4>
                              <div className="flex items-center gap-1.5">
                                <MapPin
                                  className="w-3.5 h-3.5 shrink-0"
                                  style={{ color: isExpanded ? 'rgba(255,255,255,0.8)' : '#6B7280' }}
                                />
                                <p
                                  className="text-sm truncate"
                                  style={{ color: isExpanded ? 'rgba(255,255,255,0.9)' : '#6B7280' }}
                                >
                                  {seccional.ubicacion?.nomDivGeopolitica ?? 'Sin ubicación'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Stats */}
                          <div
                            className="flex items-center gap-3 py-3 px-3 rounded-xl mb-3"
                            style={{
                              background: isExpanded
                                ? 'rgba(255,255,255,0.15)'
                                : 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)'
                            }}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <Network
                                className="w-4 h-4 shrink-0"
                                style={{ color: isExpanded ? 'white' : '#2962FF' }}
                              />
                              <div>
                                <p
                                  className="text-xs"
                                  style={{ color: isExpanded ? 'rgba(255,255,255,0.8)' : '#6B7280' }}
                                >
                                  CETAP
                                </p>
                                <p
                                  className="text-lg font-bold leading-none"
                                  style={{ color: isExpanded ? 'white' : '#111827' }}
                                >
                                  {sedesTerritorial.length}
                                </p>
                              </div>
                            </div>
                            <div className="w-px h-10" style={{ background: isExpanded ? 'rgba(255,255,255,0.3)' : '#BFDBFE' }} />
                            <div className="flex items-center gap-2 flex-1">
                              <Network
                                className="w-4 h-4 shrink-0"
                                style={{ color: isExpanded ? 'white' : '#2962FF' }}
                              />
                              <div>
                                <p
                                  className="text-xs"
                                  style={{ color: isExpanded ? 'rgba(255,255,255,0.8)' : '#6B7280' }}
                                >
                                  Código
                                </p>
                                <p
                                  className="text-lg font-bold leading-none"
                                  style={{ color: isExpanded ? 'white' : '#111827' }}
                                >
                                  {seccional.codSeccional ?? 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            {/* Toggle territorial — solo en Periodo */}
                            {modo === 'periodo' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onToggleSeccionalActive(seccional.idSeccional, !isTerritorialActiva); }}
                                className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 flex items-center justify-center gap-2 border ${
                                  isTerritorialActiva
                                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200'
                                }`}
                                title={isTerritorialActiva ? 'Desactivar territorial completa' : 'Activar territorial completa'}
                              >
                                {isTerritorialActiva ? (
                                  <><CheckCircle2 className="w-4 h-4" />{sedesActivasCount}/{sedesTerritorial.length} Activos</>
                                ) : (
                                  <><XCircle className="w-4 h-4" />Inactiva</>
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => setTerritorialExpandida(isExpanded ? null : seccional.idSeccional)}
                              className={`${modo === 'periodo' ? 'flex-1' : 'w-full'} py-2.5 rounded-xl font-medium text-sm transition-all duration-300 flex items-center justify-center gap-2`}
                              style={{
                                background: isExpanded
                                  ? 'rgba(255,255,255,0.2)'
                                  : 'linear-gradient(135deg, #2962FF 0%, #1E40AF 100%)',
                                color: 'white',
                                border: isExpanded ? '1px solid rgba(255,255,255,0.3)' : 'none'
                              }}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronRight className="w-4 h-4 rotate-90" />
                                  Ocultar CETAP
                                </>
                              ) : (
                                <>
                                  <ChevronRight className="w-4 h-4 -rotate-90" />
                                  Ver {sedesTerritorial.length} CETAP
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* NIVEL 3: CETAP (expandible) - Diseño Mejorado */}
                        <AnimatePresence>
                          {isExpanded && sedesTerritorial.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="border-t-2 border-white/30 bg-gradient-to-b from-white/15 to-white/5 backdrop-blur-xl p-4 overflow-hidden"
                            >
                              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/20">
                                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                  <Network className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-white/80">CETAP Asociados</p>
                                  <p className="text-sm font-bold text-white">{sedesTerritorial.length} Unidades</p>
                                </div>
                              </div>

                              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar-white pr-1">
                                {sedesTerritorial.map((sede, sedeIndex) => {
                                  const active = isSedeActiva(sede);
                                  return (
                                  <div
                                    key={sede.idSede ?? `sede-${sedeIndex}`}
                                    className={`group bg-white rounded-xl p-3 hover:shadow-md transition-all duration-200 ${
                                      modo === 'catalogo' || active ? '' : 'opacity-60 saturate-50 border border-dashed border-gray-200 hover:opacity-100 hover:saturate-100'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-start gap-3 min-w-0">
                                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${
                                          modo === 'catalogo' || active ? 'from-orange-100 to-orange-200 text-orange-700' : 'from-gray-100 to-gray-200 text-gray-400'
                                        }`}>
                                          <span className="text-xs font-bold">
                                            {sedeIndex + 1}
                                          </span>
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <p className={`text-sm font-semibold line-clamp-1 ${modo === 'catalogo' || active ? 'text-gray-900' : 'text-gray-400 line-through decoration-gray-300'}`}>
                                              {sede.nomSede}
                                            </p>
                                            {modo === 'periodo' && !active && (
                                              <Badge className="bg-gray-100 text-gray-400 border border-gray-200 text-[10px] py-0 px-1 font-normal">
                                                Inactivo
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <MapPin className="w-3 h-3 text-gray-500 shrink-0" />
                                            <p className="text-xs text-gray-600 truncate">
                                              {sede.geopolitica?.nomDivGeopolitica ?? 'Sin ubicación'}
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-1.5 mt-1">
                                            <Badge className="text-xs bg-gray-100 text-gray-700 border-0">
                                              {sede.codSede || 'SIN-COD'}
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {modo === 'periodo' && (
                                      <div className="flex items-center shrink-0 self-center">
                                        <button
                                          type="button"
                                          onClick={() => onToggleActive(sede.idSede, !active)}
                                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            active ? 'bg-[#003DA5]' : 'bg-gray-200'
                                          }`}
                                          title={active ? 'Desactivar en este periodo' : 'Activar en este periodo'}
                                        >
                                          <span
                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                              active ? 'translate-x-4' : 'translate-x-0'
                                            }`}
                                          />
                                        </button>
                                      </div>
                                      )}
                                    </div>
                                  </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Estilos mejorados */}
        <style>{`
        .custom-scrollbar-white::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar-white::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar-white::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.4);
          border-radius: 3px;
        }
        .custom-scrollbar-white::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.6);
        }
      `}</style>
      </div>
    </>
  );
}
