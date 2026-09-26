import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2,
  Layers,
  Wrench,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  FolderKanban,
  Settings,
} from 'lucide-react';
import {
  infraestructuraService,
  Sede,
  EspacioFisico,
  SolicitudMantenimiento,
  EstadisticasInfraestructura,
  CatalogoItem,
  BloqueEdificio,
  obtenerSesionUMI,
  hasPerm,
  tecnicoPerteneceASesionUMI,
} from '../services/infraestructuraService';
import { MetricasInfraestructura } from './MetricasInfraestructura';
import { GestionSedes } from './GestionSedes';
import { GestionEspacios } from './GestionEspacios';
import { SolicitudesMantenimientoView } from './SolicitudesMantenimiento';
import { NuevaSolicitudForm } from './NuevaSolicitudForm';
import { DetalleSolicitudModal } from './DetalleSolicitudModal';
import { AdminCategoriasServicioMini } from './AdminCategoriasServicioMini';
import { AdminParametrosUMI } from './AdminParametrosUMI';

type TabActiva = 'espacios' | 'sedes' | 'mantenimiento' | 'categorias' | 'parametros';
type VistaMantenimiento = 'todas' | 'remitidasTI' | 'asignadasMi';

interface Toast {
  tipo: 'exito' | 'error';
  titulo: string;
  mensaje: string;
}

export const GestionInfraestructuraModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabActiva>('mantenimiento');
  const [loading, setLoading] = useState<boolean>(true);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [espacios, setEspacios] = useState<EspacioFisico[]>([]);
  const [mantenimientos, setMantenimientos] = useState<SolicitudMantenimiento[]>([]);
  const [remitidasTI, setRemitidasTI] = useState<SolicitudMantenimiento[]>([]);
  const [catalogoCS, setCatalogoCS] = useState<CatalogoItem[]>([]);
  const [vistaMantenimiento, setVistaMantenimiento] = useState<VistaMantenimiento>('todas');
  const [mostrarFormulario, setMostrarFormulario] = useState<boolean>(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const [abrirDetalle, setAbrirDetalle] = useState<boolean>(false);
  const [idSolicitudSeleccionada, setIdSolicitudSeleccionada] = useState<string | null>(null);

  const [stats, setStats] = useState<EstadisticasInfraestructura>({
    total: 0,
    disponibles: 0,
    enMantenimiento: 0,
    reservadas: 0,
    porcentajeOcupacion: 0,
  });

  const sesionUmi = useMemo(() => obtenerSesionUMI(), []);
  const rolesNorm = useMemo(() => new Set((sesionUmi.roles ?? []).map((r: unknown) => String(r ?? '').trim().toUpperCase())), [sesionUmi]);
  const [catalogoTecnicos, setCatalogoTecnicos] = useState<CatalogoItem[]>([]);
  const [tieneVinculoTecnico, setTieneVinculoTecnico] = useState<boolean>(false);
  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      try {
        const tecnicos = await infraestructuraService.getTecnicos(false);
        if (cancelado) return;
        const listaSegura = Array.isArray(tecnicos) ? tecnicos : [];
        setCatalogoTecnicos(listaSegura);
        const cods = await infraestructuraService.listarCodigosTecnicosDeSesionUMI ? infraestructuraService.listarCodigosTecnicosDeSesionUMI(sesionUmi, listaSegura) : Promise.resolve<string[]>([]);
        if (cancelado) return;
        const vinculo = listaSegura.some((t) => tecnicoPerteneceASesionUMI(t, sesionUmi)) || (Array.isArray(cods) && cods.length > 0);
        if (cancelado) return;
        setTieneVinculoTecnico(!!vinculo);
      } catch (err) {
        console.error('[UMI-ERROR cargar tecnicos GIM]', err);
        setCatalogoTecnicos([]);
      }
    };
    cargar();
    return () => { cancelado = true; };
  }, [sesionUmi]);
  const esRolTecnico = useMemo(() => {
    const rolesTec = ['TECNICO_UMI','TECNICO_ELECTRICO_ESPECIALIZADO','TECNICO_UMI_MULTIPROPOSITO'];
    for (const r of rolesTec) if (rolesNorm.has(r)) return true;
    return false;
  }, [rolesNorm]);
  const esTecnico = tieneVinculoTecnico || esRolTecnico;
  const esSoloSolicitante = useMemo(() => {
    if (esTecnico) return false;
    if (rolesNorm.has('SUPER_ADMIN')) return false;
    if (!rolesNorm.has('SOLICITANTE_INFRA') && !rolesNorm.has('USER')) return false;
    const otros = ['ADMIN','GESTOR_MANTENIMIENTO','ADMINISTRADOR_FUNCIONAL','ADMINISTRADOR_FUNCIONAL_INFRA','COORDINADOR_INFRAESTRUCTURA','UMI','INFRAESTRUCTURA','ANALISTA_ASIGNADOR_UMI','CONSULTA_CALIDAD_INFRA','ADMINISTRADOR_MODULO_INFRA'];
    for (const r of otros) if (rolesNorm.has(r)) return false;
    return true;
  }, [rolesNorm, esTecnico]);
  const puedeVerInventarioGlobal = hasPerm(sesionUmi, ['infraestructura.view_all', 'infraestructura.view_all_ti', 'infraestructura.param.espacios_cru', 'infraestructura.param.sedes_cru', 'infraestructura.param.territorial_crud', 'infraestructura.param.categories_cru', 'infraestructura.param.categories_crud']);
  // ERS L70 P2 ANALISTA_ASIGNADOR (Encargado UMI): NO gestiona inventario/sedes/espacios (eso P5/P6).
  // Necesita VIEW sólo para RADICAR correctamente y saber de qué espacio se trata (lectura operativa).
  // Pero NO ve los tabs de inventario completo, salvo view_all o param.*
  // P5 ADMINISTRADOR_FUNCIONAL_INFRA con param.approve_config / read_all / reportes_gestion SI ve inventario bypass.
  const rolesNormP5 = new Set((sesionUmi.roles ?? []).map((r: string) => String(r).toUpperCase().trim()));
  const bypassRolesInventario = rolesNormP5.has('ADMINISTRADOR_FUNCIONAL_INFRA') || rolesNormP5.has('ADMINISTRADOR_FUNCIONAL') || rolesNormP5.has('COORDINADOR_INFRAESTRUCTURA') || rolesNormP5.has('SUPER_ADMIN');
  const puedeVerEspacios = bypassRolesInventario || hasPerm(sesionUmi, ['infraestructura.view_all', 'infraestructura.view_all_ti', 'infraestructura.param.espacios_cru', 'infraestructura.param.territorial_crud']);
  const puedeVerSedes = bypassRolesInventario || hasPerm(sesionUmi, ['infraestructura.view_all', 'infraestructura.view_all_ti', 'infraestructura.param.sedes_cru', 'infraestructura.param.territorial_crud']);
  const puedeVerMantenimiento = bypassRolesInventario || hasPerm(sesionUmi, [
    'infraestructura.view_all',
    'infraestructura.view_all_ti',
    'infraestructura.solicitud.create',
    'infraestructura.solicitud.read',
    'infraestructura.solicitud.read_all',
    'infraestructura.solicitud.read_assigned',
    'infraestructura.solicitud.read_own',
    'infraestructura.solicitud.read_rejection_reason_own',
    'infraestructura.solicitud.edit',
    'infraestructura.solicitud.assign',
    'infraestructura.solicitud.reject',
    'infraestructura.solicitud.redistribute',
    'infraestructura.solicitud.forward_ti',
    'infraestructura.solicitud.confirmar_recepcion_insumos',
    'infraestructura.solicitud.cierre_tecnico',
    'infraestructura.solicitud.close_with_evidence',
    'infraestructura.solicitud.execute_assigned',
    'infraestructura.solicitud.conformidad',
    'infraestructura.solicitud.calificacion',
    'infraestructura.reportes.gestion',
    'infraestructura.reportes.consolidados',
  ]);
  const puedeVerCategorias = bypassRolesInventario || hasPerm(sesionUmi, ['infraestructura.param.categories_cru', 'infraestructura.param.categories_crud', 'infraestructura.view_all', 'infraestructura.view_all_ti']);
  const puedeVerParametros = bypassRolesInventario || hasPerm(sesionUmi, [
    'infraestructura.param.sla_cru',
    'infraestructura.param.sla_times_edit',
    'infraestructura.param.tecnicos_cru',
    'infraestructura.param.technicians_crud',
    'infraestructura.param.reglas_cru',
    'infraestructura.param.rules_edit',
    'infraestructura.param.categories_cru',
    'infraestructura.param.categories_crud',
    'infraestructura.view_all',
  ]);
  // Métricas Globales (ERS P2 KPIs operativos).
  // - SA/P5/P6/P7 = Siempre (view_all/reportes/param*)
  // - P2 ANALISTA_ASIGNADOR_UMI = OPERATIVO (asign, reject, redistribute, forward_ti, read_all): se requieren SUS KPIs
  // - P1 / P3 / P4 = NO verán métricas globales
  const puedeVerMetricasGlobales = puedeVerInventarioGlobal || tieneCualquieraPermiso([
    'infraestructura.view_all','infraestructura.view_all_ti',
    'infraestructura.reportes.consolidados','infraestructura.reportes.gestion',
    'infraestructura.param.sla_cru','infraestructura.param.tecnicos_cru','infraestructura.param.reglas_cru','infraestructura.param.categories_cru',
    // KPIs para P2 OPERATIVO (no inventario, no reportes): lee asignaciones bandeja
    'infraestructura.solicitud.assign','infraestructura.solicitud.reject','infraestructura.solicitud.redistribute','infraestructura.solicitud.forward_ti','infraestructura.solicitud.read_all',
  ]);
  function tieneCualquieraPermiso(codigos: string[]) {
    for (const c of codigos) if (hasPerm(sesionUmi, c)) return true;
    return false;
  }
  const puedeRadicarSolicitud = !esTecnico && hasPerm(sesionUmi, 'infraestructura.solicitud.create');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        sedesRes,
        espaciosRes,
        mantenimientosRes,
        remitidasTIRes,
        statsRes,
        csRes,
      ] = await Promise.allSettled([
        infraestructuraService.getSedes(),
        infraestructuraService.getEspacios(),
        infraestructuraService.getMantenimientos({ incluirTI: false }),
        infraestructuraService.getMantenimientos({ incluirTI: true }),
        infraestructuraService.getEstadisticas(),
        infraestructuraService.getCatalogo('CATEGORIA_SERVICIO'),
      ]);
      const extraer = <T,>(r: PromiseSettledResult<T>, fallback: T): T =>
        r.status === 'fulfilled' ? r.value : fallback;
      const sedesData = extraer(sedesRes, [] as any[]);
      const espaciosData = extraer(espaciosRes, [] as any[]);
      const mantenimientosData = extraer(mantenimientosRes, [] as any[]);
      const remitidasTIData = extraer(remitidasTIRes, [] as any[]);
      const statsData = extraer<any>(statsRes, {});
      const csData = extraer(csRes, [] as any[]);
      setSedes(Array.isArray(sedesData) ? sedesData : []);
      setEspacios(Array.isArray(espaciosData) ? espaciosData : []);
      setMantenimientos(Array.isArray(mantenimientosData) ? mantenimientosData : []);
      setRemitidasTI((Array.isArray(remitidasTIData) ? remitidasTIData : []).filter((s: any) => s.areaResponsableActual === 'TI'));
      setStats(statsData && typeof statsData === 'object' ? statsData : {});
      setCatalogoCS(Array.isArray(csData) ? csData : []);
      const fallidos = ([
        ['sedes', sedesRes],
        ['espacios', espaciosRes],
        ['mantenimientos', mantenimientosRes],
        ['remitidasTI', remitidasTIRes],
        ['estadisticas', statsRes],
        ['catalogoCS', csRes],
      ] as Array<[string, PromiseSettledResult<any>]>)
        .filter(([, r]) => r.status === 'rejected')
        .map(([k, r]) => `${k}=${(r as PromiseRejectedResult).reason?.message || String((r as PromiseRejectedResult).reason)}`);
      if (fallidos.length > 0) {
        console.warn('[GIM] fetchData endpoints fallidos (no bloquean resto):', fallidos.join(' | '));
      }
    } catch (err) {
      console.error('Error crítico al cargar datos de infraestructura:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (loading) return;
    const tabsOrden = [
      { clave: 'espacios', puede: puedeVerEspacios },
      { clave: 'sedes', puede: puedeVerSedes },
      { clave: 'mantenimiento', puede: puedeVerMantenimiento },
      { clave: 'categorias', puede: puedeVerCategorias },
      { clave: 'parametros', puede: puedeVerParametros },
    ] as const;
    const actualValida = tabsOrden.find((t) => t.clave === activeTab);
    if (actualValida && actualValida.puede) return;
    const primera = tabsOrden.find((t) => t.puede);
    if (primera && primera.clave !== activeTab) setActiveTab(primera.clave);
  }, [loading, puedeVerEspacios, puedeVerSedes, puedeVerMantenimiento, puedeVerCategorias, puedeVerParametros, activeTab]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  const manejarExitoRadicacion = async (nueva: SolicitudMantenimiento) => {
    setMostrarFormulario(false);
    const esTI = nueva.areaResponsableActual === 'TI' || nueva.tipoAtencion === 'TECNOLOGICA';
    setToast({
      tipo: 'exito',
      titulo: 'Solicitud radicada con éxito',
      mensaje: esTI
        ? `Su solicitud ${nueva.consecutivo} fue clasificada como TECNOLÓGICA y remitida automáticamente a la Oficina de Tecnologías de la Información.`
        : `Su solicitud ${nueva.consecutivo} quedó en estado RECIBIDA y será analizada por el equipo UMI.`,
    });
    setVistaMantenimiento(esTI ? 'remitidasTI' : 'todas');
    setActiveTab('mantenimiento');
    await fetchData();
  };

  const manejarGestionar = (idSolicitud: string) => {
    setIdSolicitudSeleccionada(idSolicitud);
    setAbrirDetalle(true);
  };

  const renderToast = () => {
    if (!toast) return null;
    const esExito = toast.tipo === 'exito';
    return (
      <div className="fixed top-4 right-4 z-[60] max-w-sm w-full animate-in slide-in-from-right duration-200">
        <div
          className={`flex items-start gap-3 p-4 rounded-2xl border shadow-lg ${
            esExito
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {esExito ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-bold text-sm">{toast.titulo}</p>
            <p className="text-xs mt-1 opacity-90">{toast.mensaje}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              esExito ? 'hover:bg-emerald-100' : 'hover:bg-rose-100'
            }`}
            aria-label="Cerrar notificación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-6 relative">
      {renderToast()}
      {mostrarFormulario && (
        <NuevaSolicitudForm
          onClose={() => setMostrarFormulario(false)}
          onExito={manejarExitoRadicacion}
        />
      )}
      <DetalleSolicitudModal
        open={abrirDetalle}
        idSolicitud={idSolicitudSeleccionada}
        catalogoCS={catalogoCS}
        onClose={() => {
          setAbrirDetalle(false);
          setIdSolicitudSeleccionada(null);
        }}
        onCambioExitoso={async () => {
          await fetchData();
        }}
      />

      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-300 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-400 bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-100">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Gestión de Infraestructura
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                ESAP Institucional
              </span>
            </div>
            <p className="text-sm text-slate-600 font-medium mt-0.5">
              Administración centralizada de sedes, bloques, aulas, laboratorios y órdenes de mantenimiento
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-sm font-bold transition-all duration-200 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
          {puedeRadicarSolicitud && (
            <button
              type="button"
              onClick={() => setMostrarFormulario(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-md shadow-amber-500/25 ring-1 ring-amber-500/30 transition-all active:scale-95"
            >
              <Wrench className="w-4 h-4" />
              Radicar Solicitud
            </button>
          )}
        </div>
      </div>

      {/* Métricas Globales (solo UMI / Admin / Técnico / Calidad) */}
      {puedeVerMetricasGlobales && <MetricasInfraestructura stats={stats} />}

      {/* Navegación por Pestañas */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px overflow-x-auto">
        {puedeVerEspacios && (
          <button
            type="button"
            onClick={() => setActiveTab('espacios')}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-bold text-sm transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'espacios'
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            Espacios y Aulas ({espacios.length})
          </button>
        )}

        {puedeVerSedes && (
          <button
            type="button"
            onClick={() => setActiveTab('sedes')}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-bold text-sm transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'sedes'
                ? 'border-blue-600 text-blue-600 bg-white shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Sedes Territoriales ({sedes.length})
          </button>
        )}

        {puedeVerMantenimiento && (
          <button
            type="button"
            onClick={() => setActiveTab('mantenimiento')}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-bold text-sm transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'mantenimiento'
                ? 'border-amber-600 text-amber-600 bg-white shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
            }`}
          >
            <Wrench className="w-4 h-4" />
            Mantenimiento ({mantenimientos.length})
          </button>
        )}

        {puedeVerCategorias && (
          <button
            type="button"
            onClick={() => setActiveTab('categorias')}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-bold text-sm transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'categorias'
                ? 'border-violet-600 text-violet-600 bg-white shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            Categorías Servicio ({catalogoCS.length})
          </button>
        )}

        {puedeVerParametros && (
          <button
            type="button"
            onClick={() => setActiveTab('parametros')}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-bold text-sm transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'parametros'
                ? 'border-emerald-600 text-emerald-600 bg-white shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
            }`}
          >
            <Settings className="w-4 h-4" />
            Parámetros UMI
          </button>
        )}
      </div>

      {/* Vista de Contenido Activo */}
      <div className="transition-all duration-300">
        {activeTab === 'espacios' && puedeVerEspacios && (
          <GestionEspacios
            espacios={espacios}
            sedes={sedes}
            onEspacioCreada={(nuevoEspacio) => {
              setEspacios((prev) => {
                const existe = prev.some((e) => e.idEspacio === nuevoEspacio.idEspacio);
                if (existe) return prev.map((e) => (e.idEspacio === nuevoEspacio.idEspacio ? nuevoEspacio : e));
                const merged = [...prev, nuevoEspacio];
                merged.sort((a, b) => {
                  const sedeA = a.bloque?.sede?.nombre ?? '';
                  const sedeB = b.bloque?.sede?.nombre ?? '';
                  if (sedeA !== sedeB) return sedeA.localeCompare(sedeB);
                  const blqA = a.bloque?.codigo ?? '';
                  const blqB = b.bloque?.codigo ?? '';
                  if (blqA !== blqB) return blqA.localeCompare(blqB);
                  return (a.codigo || '').localeCompare(b.codigo || '');
                });
                return merged;
              });
            }}
            onEspacioActualizada={(actualizado) => {
              setEspacios((prev) => prev.map((e) => (e.idEspacio === actualizado.idEspacio ? actualizado : e)));
            }}
          />
        )}
        {activeTab === 'sedes' && puedeVerSedes && (
          <GestionSedes
            sedes={sedes}
            onSedeCreada={(nuevaSede) => {
              setSedes((prev) => {
                const existe = prev.some((s) => s.idSede === nuevaSede.idSede);
                if (existe) return prev.map((s) => (s.idSede === nuevaSede.idSede ? nuevaSede : s));
                const merged = [...prev, nuevaSede];
                merged.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
                return merged;
              });
            }}
            onSedeActualizada={(sedeEditada) => {
              setSedes((prev) => prev.map((s) => (s.idSede === sedeEditada.idSede ? sedeEditada : s)));
            }}
            onBloqueCreado={(bloque, sede) => {
              setSedes((prev) =>
                prev.map((s) => {
                  if (s.idSede !== sede.idSede) return s;
                  const base = [...(s.bloques ?? []).filter((b) => b.idBloque !== bloque.idBloque), bloque];
                  base.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
                  return { ...s, bloques: base };
                }),
              );
            }}
            onBloqueActualizado={(bloque, sede) => {
              setSedes((prev) =>
                prev.map((s) => {
                  if (s.idSede !== sede.idSede) return s;
                  const base = (s.bloques ?? [])
                    .map((b) => (b.idBloque === bloque.idBloque ? bloque : b))
                    .slice();
                  base.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
                  return { ...s, bloques: base };
                }),
              );
            }}
            onBloqueEliminado={(idBloque, sede) => {
              setSedes((prev) =>
                prev.map((s) => {
                  if (s.idSede !== sede.idSede) return s;
                  return {
                    ...s,
                    bloques: (s.bloques ?? []).filter((b) => b.idBloque !== idBloque),
                  };
                }),
              );
            }}
          />
        )}
        {activeTab === 'mantenimiento' && puedeVerMantenimiento && (
          <SolicitudesMantenimientoView
            mantenimientos={mantenimientos}
            remitidasTI={remitidasTI}
            vista={vistaMantenimiento}
            onChangeVista={setVistaMantenimiento}
            onNuevaSolicitud={() => setMostrarFormulario(true)}
            onGestionar={manejarGestionar}
            loading={loading}
            onRefresh={fetchData}
            catalogoCS={catalogoCS}
          />
        )}
        {activeTab === 'categorias' && puedeVerCategorias && <AdminCategoriasServicioMini />}
        {activeTab === 'parametros' && puedeVerParametros && <AdminParametrosUMI />}
      </div>
    </div>
  );
};
