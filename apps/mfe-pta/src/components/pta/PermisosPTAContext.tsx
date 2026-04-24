/**
 * PermisosPTAContext — Control de acceso por rol para el modulo PTA
 *
 * FASE 4: Vinculado con permisos granulares de KV (67+ permisos PTA).
 * Deriva capacidades PTA desde:
 *   1. Permisos granulares almacenados en KV (via AuthContext.session.permisos)
 *   2. Fallback: mapa hardcodeado PERMISOS_POR_ROL (compat con fase anterior)
 *
 * Los permisos granulares tienen IDs como:
 *   - pta.backoffice.aprobar → puedeAprobar
 *   - pta.backoffice.exportar → puedeExportar
 *   - pta.backoffice.panel_sna → puedeVerSNA
 *   etc.
 *
 * El hook usePermisosPTAGranulares() permite consultar permisos PTA especificos.
 *
 * @version 3.0.0
 * @date 2026-03-13
 */

import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldAlert, ChevronDown, Eye, RefreshCw } from 'lucide-react';

export type RolPTA = 'admin' | 'decanatura' | 'jefatura' | 'director' | 'docente' | 'coord_grupo_dt';

export interface PerfilRolPTA {
  rol: RolPTA;
  nombre: string;
  email: string;
  territorial_ids: string[];   // IDs de territoriales asignadas (vacio = todas)
  programa_ids: string[];      // IDs de programas asignados (vacio = todos)
}

export interface PermisosPTA {
  vistasPerm: string[];
  puedeAprobar: boolean;
  puedeExportar: boolean;
  puedeVerSNA: boolean;
  puedeArbitrar: boolean;
  puedeEditarCatalogo: boolean;
  puedeCargarMasivo: boolean;
  puedeConcertar: boolean;
  nivelAprobacion: number; // 0=no aprueba, 1=jefatura, 2=decanatura, 3=gestion profesoral
  filtroTerritorial: string[] | null; // null = todas
  filtroPrograma: string[] | null;    // null = todos
  /** Origen de los permisos: 'granular' (KV) o 'hardcoded' (fallback) */
  source: 'granular' | 'hardcoded';
  /** Cantidad de permisos granulares PTA encontrados */
  granularCount: number;
}

// ============================================================================
// MAPEO: Permisos granulares → Vistas del modulo PTA
// ============================================================================

/**
 * Mapea IDs de permisos granulares (de permissions-config-updated.ts)
 * a nombres de vistas internas del modulo PTA.
 */
const PERMISO_TO_VISTA: Record<string, string> = {
  'pta.backoffice.ver_gestion': 'gestion',
  'pta.backoffice.ver_detalle': 'gestion',
  'pta.backoffice.tablero_control': 'tablero',
  'pta.backoffice.dashboard_directivo': 'directivo',
  'pta.backoffice.kanban': 'kanban',
  'pta.backoffice.workflow': 'workflow_visualizer',
  'pta.backoffice.gestion_territorial': 'territorial',
  'pta.backoffice.mapa_territorial': 'mapa_territorial',
  'pta.backoffice.seguimiento': 'seguimiento',
  'pta.backoffice.comparativo': 'comparativo',
  'pta.backoffice.panel_sna': 'sna',
  'pta.backoffice.programacion': 'programacion',
  'pta.backoffice.programacion_institucional': 'programacion_institucional',
  'pta.backoffice.carga_masiva': 'cargas',
  'pta.backoffice.simulador_carga': 'simulador_carga',
  'pta.backoffice.asignador_automatico': 'asignador_automatico',
  'pta.backoffice.alertas': 'alertas',
  'pta.backoffice.gestion_conflictos': 'gestion_conflictos',
  'pta.backoffice.comite_evaluacion': 'comite_evaluacion',
  'pta.backoffice.calendario': 'calendario_academico',
  'pta.backoffice.benchmarking': 'benchmarking',
  'pta.backoffice.indicadores': 'indicadores',
  'pta.backoffice.metricas_sla': 'metricas_sla',
  'pta.backoffice.verificacion_qr': 'verificacion_qr',
  'pta.backoffice.test_e2e': 'test_e2e',
  'pta.backoffice.sankey_transiciones': 'workflow_visualizer',
  'pta.backoffice.centro_reportes': 'centro_reportes',
  'pta.backoffice.reporte_nacional': 'reporte',
  'pta.backoffice.reporte_individual': 'reporte',
  'pta.backoffice.reporte_seguimiento': 'seguimiento',
  'pta.backoffice.exportar_actas': 'exportador_actas',
  'pta.backoffice.generador_resoluciones': 'generador_resoluciones',
  'pta.backoffice.acta_concertacion': 'acta_concertacion',
  'pta.backoffice.certificado_firma': 'certificado_firma',
  'pta.backoffice.editar_catalogo': 'catalogo',
  'pta.backoffice.catalogo_asignaturas': 'catalogo',
  'pta.backoffice.validador_gth': 'validador',
  'pta.backoffice.cronograma': 'cronograma',
  'pta.backoffice.notificaciones_config': 'preferencias_notificaciones',
  'pta.backoffice.pre_aprobacion_sni_snpi': 'pre_aprobacion_sni_snpi',
  'pta.backoffice.banco_docentes': 'banco_docentes', // ✅ Nuevo permiso
  'pta.backoffice.config_reglas': 'config_reglas',
};

/**
 * Deriva PermisosPTA desde los permisos granulares almacenados en KV.
 * Retorna null si no hay suficientes permisos PTA para derivar (fallback a hardcoded).
 */
function deriveFromGranular(
  allPermisos: string[],
  perfil: PerfilRolPTA,
): PermisosPTA | null {
  // Filtrar solo permisos PTA
  const ptaPerms = allPermisos.filter(p => p.startsWith('pta.'));
  
  // Si hay menos de 1 permiso PTA granular, no hay info suficiente
  if (ptaPerms.length === 0) return null;
  
  // Wildcard check
  const hasWildcard = allPermisos.includes('*');
  const has = (perm: string) => hasWildcard || allPermisos.includes(perm);

  // Derivar vistas
  const vistasSet = new Set<string>();
  for (const perm of ptaPerms) {
    const vista = PERMISO_TO_VISTA[perm];
    if (vista) vistasSet.add(vista);
  }
  // Si tiene wildcard, agregar todas las vistas
  if (hasWildcard) {
    Object.values(PERMISO_TO_VISTA).forEach(v => vistasSet.add(v));
  }
  const vistasPerm = Array.from(vistasSet);

  // Derivar nivel de aprobacion
  let nivelAprobacion = 0;
  if (has('pta.backoffice.aprobar')) {
    // Derivar nivel del rol PTA
    if (perfil.rol === 'admin') nivelAprobacion = 3;
    else if (perfil.rol === 'decanatura') nivelAprobacion = 2;
    else if (perfil.rol === 'jefatura') nivelAprobacion = 1;
    else nivelAprobacion = 1; // default si tiene permiso de aprobar
  }

  return {
    vistasPerm,
    puedeAprobar: has('pta.backoffice.aprobar') || has('pta.backoffice.aprobacion_masiva'),
    puedeExportar: has('pta.backoffice.exportar') || has('pta.backoffice.centro_reportes'),
    puedeVerSNA: has('pta.backoffice.panel_sna'),
    puedeArbitrar: has('pta.backoffice.arbitrar'),
    puedeEditarCatalogo: has('pta.backoffice.editar_catalogo'),
    puedeCargarMasivo: has('pta.backoffice.carga_masiva'),
    puedeConcertar: has('pta.backoffice.concertar') || has('pta.portal.concertar'),
    nivelAprobacion,
    filtroTerritorial: perfil.territorial_ids.length > 0 ? perfil.territorial_ids : null,
    filtroPrograma: perfil.programa_ids.length > 0 ? perfil.programa_ids : null,
    source: 'granular',
    granularCount: ptaPerms.length,
  };
}

// ============================================================================
// FALLBACK: Permisos hardcodeados por rol (compatibilidad Fase 3)
// ============================================================================

const PERMISOS_POR_ROL: Record<RolPTA, (perfil: PerfilRolPTA) => PermisosPTA> = {
  admin: () => ({
    vistasPerm: ['gestion','seguimiento_docs','solicitudes_pta','configuracion','programacion_institucional','cargas','programacion','tablero','reporte','seguimiento','directivo','territorial','catalogo','comparativo','sna','validador','test_e2e','workflow_visualizer','mapa_territorial','alertas','indicadores','acta_concertacion','simulador_carga','benchmarking','exportador_actas','comite_evaluacion','calendario_academico','asignador_automatico','kanban','metricas_sla','generador_resoluciones','gestion_conflictos','preferencias_notificaciones','verificacion_qr','centro_reportes','cronograma','pre_aprobacion_sni_snpi','banco_docentes'],
    puedeAprobar: true,
    puedeExportar: true,
    puedeVerSNA: true,
    puedeArbitrar: true,
    puedeEditarCatalogo: true,
    puedeCargarMasivo: true,
    puedeConcertar: true,
    nivelAprobacion: 3,
    filtroTerritorial: null,
    filtroPrograma: null,
    source: 'hardcoded',
    granularCount: 0,
  }),
  director: () => ({
    vistasPerm: ['gestion','seguimiento_docs','solicitudes_pta','programacion_institucional','tablero','reporte','seguimiento','directivo','territorial','catalogo','comparativo','sna','validador','test_e2e','workflow_visualizer','mapa_territorial','alertas','indicadores','benchmarking','metricas_sla','centro_reportes','cronograma','banco_docentes'],
    puedeAprobar: false,
    puedeExportar: true,
    puedeVerSNA: true,
    puedeArbitrar: true,
    puedeEditarCatalogo: false,
    puedeCargarMasivo: false,
    puedeConcertar: false,
    nivelAprobacion: 0,
    filtroTerritorial: null,
    filtroPrograma: null,
    source: 'hardcoded',
    granularCount: 0,
  }),
  decanatura: () => ({
    vistasPerm: ['gestion','seguimiento_docs','programacion_institucional','programacion','tablero','reporte','seguimiento','territorial','catalogo','comparativo','workflow_visualizer','indicadores','centro_reportes','banco_docentes'],
    puedeAprobar: true,
    puedeExportar: true,
    puedeVerSNA: false,
    puedeArbitrar: false,
    puedeEditarCatalogo: false,
    puedeCargarMasivo: false,
    puedeConcertar: true,
    nivelAprobacion: 2,
    filtroTerritorial: null,
    filtroPrograma: null,
    source: 'hardcoded',
    granularCount: 0,
  }),
  jefatura: (perfil) => ({
    vistasPerm: ['gestion','seguimiento_docs','programacion','tablero','seguimiento','territorial','catalogo','banco_docentes'],
    puedeAprobar: true,
    puedeExportar: true,
    puedeVerSNA: false,
    puedeArbitrar: false,
    puedeEditarCatalogo: false,
    puedeCargarMasivo: false,
    puedeConcertar: true,
    nivelAprobacion: 1,
    filtroTerritorial: perfil.territorial_ids.length > 0 ? perfil.territorial_ids : null,
    filtroPrograma: null,
    source: 'hardcoded',
    granularCount: 0,
  }),
  docente: () => ({
    vistasPerm: ['gestion'],
    puedeAprobar: false,
    puedeExportar: false,
    puedeVerSNA: false,
    puedeArbitrar: false,
    puedeEditarCatalogo: false,
    puedeCargarMasivo: false,
    puedeConcertar: true,
    nivelAprobacion: 0,
    filtroTerritorial: null,
    filtroPrograma: null,
    source: 'hardcoded',
    granularCount: 0,
  }),
  coord_grupo_dt: () => ({
    vistasPerm: ['gestion'],
    puedeAprobar: false,
    puedeExportar: false,
    puedeVerSNA: false,
    puedeArbitrar: false,
    puedeEditarCatalogo: false,
    puedeCargarMasivo: false,
    puedeConcertar: true,
    nivelAprobacion: 0,
    filtroTerritorial: null,
    filtroPrograma: null,
    source: 'hardcoded',
    granularCount: 0,
  }),
};

interface ContextValue {
  perfil: PerfilRolPTA;
  permisos: PermisosPTA;
  setPerfil: (perfil: PerfilRolPTA) => void;
  tieneVista: (vista: string) => boolean;
  rolLabel: string;
  rolColor: string;
  rolBg: string;
  /** true si el perfil activo es una simulacion (superuser eligio un rol diferente al suyo) */
  isSimulando: boolean;
  /** Rol PTA derivado automaticamente del AuthContext */
  rolDerivado: RolPTA;
  /** Verifica un permiso PTA granular especifico (delegado a AuthContext) */
  tienePermiso: (permisoId: string) => boolean;
  /** Verifica si tiene CUALQUIERA de los permisos PTA dados */
  tieneAlgunPermiso: (permisoIds: string[]) => boolean;
}

export const ROL_STYLES: Record<RolPTA, { label: string; color: string; bg: string }> = {
  admin: { label: 'Administrador Sistema', color: '#059669', bg: '#D1FAE5' },
  director: { label: 'Director Academico', color: '#7C3AED', bg: '#F3E8FF' },
  decanatura: { label: 'Decanatura', color: '#003DA5', bg: '#EFF6FF' },
  jefatura: { label: 'Jefatura de Zona', color: '#D97706', bg: '#FEF3C7' },
  docente: { label: 'Docente', color: '#6B7280', bg: '#F3F4F6' },
  coord_grupo_dt: { label: 'Coordinador Grupo Acad', color: '#6B7280', bg: '#F3F4F6' },
};

// ============================================================================
// MAPEO: AuthContext.rol / persona.cargo → RolPTA
// ============================================================================

function deriveRolPTA(
  rol: string,
  cargo?: string,
  dependencia?: string,
  isSuperUser?: boolean,
): RolPTA {
  if (isSuperUser) return 'admin';

  const r = (rol || '').toLowerCase().trim();
  const c = (cargo || '').toLowerCase().trim();
  const d = (dependencia || '').toLowerCase().trim();

  if (r.includes('super') || r.includes('administrador') || r === 'admin') return 'admin';
  if (r.includes('gestion profesoral') || r.includes('gestión profesoral')) return 'admin';
  if (c.includes('gestion profesoral') || c.includes('gestión profesoral')) return 'admin';
  if (d.includes('gestion profesoral') || d.includes('gestión profesoral')) return 'admin';
  if (r.includes('director') || r.includes('subdirector')) return 'director';
  if (c.includes('director acad') || c.includes('subdirector acad')) return 'director';
  if (r.includes('decano') || r.includes('decanatura')) return 'decanatura';
  if (c.includes('decano') || c.includes('decanatura')) return 'decanatura';
  if (d.includes('decanatura')) return 'decanatura';
  if (r.includes('jefe') || r.includes('jefatura')) return 'jefatura';
  if (c.includes('jefe de zona') || c.includes('jefatura')) return 'jefatura';
  if (r.includes('docente') || r.includes('profesor') || r.includes('catedra')) return 'docente';
  if (c.includes('docente') || c.includes('profesor')) return 'docente';
  if (r.includes('coordinador acad') || c.includes('coordinador acad')) return 'decanatura';
  if (r.includes('coordinador grupo acad') || c.includes('coordinador grupo acad')) return 'coord_grupo_dt';
  if (r.includes('administrativo') || r.includes('profesional')) return 'admin';
  return 'admin';
}

function deriveTerritorialIds(persona: any): string[] {
  if (!persona) return [];
  if (Array.isArray(persona.territorial_ids) && persona.territorial_ids.length > 0) {
    return persona.territorial_ids;
  }
  if (Array.isArray(persona.territoriales)) {
    return persona.territoriales.map((t: any) => t.id || t).filter(Boolean);
  }
  if (persona.territorial || persona.sede_territorial) {
    const terName = (persona.territorial || persona.sede_territorial || '').toUpperCase();
    const TERRITORIAL_NAME_TO_ID: Record<string, string> = {
      'SEDE CENTRAL': 'ter-01', 'CENTRAL': 'ter-01', 'BOGOTA': 'ter-01',
      'ANTIOQUIA': 'ter-02', 'ATLANTICO': 'ter-03', 'BOLIVAR': 'ter-04',
      'BOYACA': 'ter-05', 'CALDAS': 'ter-06', 'CAUCA': 'ter-07',
      'CHOCO': 'ter-08', 'CUNDINAMARCA': 'ter-09', 'HUILA': 'ter-10',
      'META': 'ter-11', 'NARINO': 'ter-12', 'NARIÑO': 'ter-12',
      'NORTE DE SANTANDER': 'ter-13', 'RISARALDA': 'ter-14',
      'SANTANDER': 'ter-15', 'TOLIMA': 'ter-16', 'VALLE': 'ter-17',
    };
    const matched = Object.entries(TERRITORIAL_NAME_TO_ID)
      .find(([name]) => terName.includes(name));
    if (matched) return [matched[1]];
  }
  return [];
}

function deriveProgramaIds(persona: any): string[] {
  if (!persona) return [];
  if (Array.isArray(persona.programa_ids) && persona.programa_ids.length > 0) {
    return persona.programa_ids;
  }
  if (Array.isArray(persona.programas)) {
    return persona.programas.map((p: any) => p.id || p).filter(Boolean);
  }
  return [];
}

// ============================================================================
// CONTEXT
// ============================================================================

const PermisosPTACtx = createContext<ContextValue | null>(null);

export function PermisosPTAProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  // Derivar rol PTA desde AuthContext
  const rolDerivado = useMemo<RolPTA>(() => {
    if (!auth.isAuthenticated) return 'docente';
    return deriveRolPTA(
      auth.userRole,
      auth.userPersona?.cargo,
      auth.userPersona?.dependencia,
      auth.isSuperUser,
    );
  }, [auth.isAuthenticated, auth.userRole, auth.userPersona?.cargo, auth.userPersona?.dependencia, auth.isSuperUser]);

  // Construir perfil real desde AuthContext
  const perfilReal = useMemo<PerfilRolPTA>(() => ({
    rol: rolDerivado,
    nombre: auth.userName || 'Usuario',
    email: auth.userEmail || '',
    territorial_ids: deriveTerritorialIds(auth.userPersona),
    programa_ids: deriveProgramaIds(auth.userPersona),
  }), [rolDerivado, auth.userName, auth.userEmail, auth.userPersona]);

  // Estado del perfil: perfil real, o perfil simulado (solo superusers)
  const [perfilOverride, setPerfilOverride] = useState<PerfilRolPTA | null>(null);

  // Cuando cambia el auth, resetear override
  useEffect(() => {
    setPerfilOverride(null);
  }, [auth.userEmail, auth.userRole]);

  // Perfil efectivo: override si existe y es superuser, sino perfil real
  const perfil = (auth.isSuperUser && perfilOverride) ? perfilOverride : perfilReal;
  const isSimulando = auth.isSuperUser && perfilOverride !== null;

  const setPerfil = (newPerfil: PerfilRolPTA) => {
    if (auth.isSuperUser) {
      setPerfilOverride(newPerfil);
      console.log('[PermisosPTA] Superuser simulando rol:', newPerfil.rol, newPerfil.nombre);
    } else {
      console.warn('[PermisosPTA] setPerfil ignorado: solo superusers pueden simular roles');
    }
  };

  // ── DERIVAR PERMISOS: granular (KV) > hardcoded (fallback) ──────────
  const permisos = useMemo<PermisosPTA>(() => {
    const allPerms = auth.session?.permisos || [];
    
    // Intentar derivar desde permisos granulares
    const granular = deriveFromGranular(allPerms, perfil);
    if (granular) {
      console.log(`[PermisosPTA] Usando permisos GRANULARES: ${granular.granularCount} permisos PTA, ${granular.vistasPerm.length} vistas`);
      return granular;
    }

    // Fallback: mapa hardcodeado por rol
    const hardcoded = PERMISOS_POR_ROL[perfil.rol](perfil);
    console.log(`[PermisosPTA] Fallback HARDCODED para rol '${perfil.rol}': ${hardcoded.vistasPerm.length} vistas`);
    return hardcoded;
  }, [auth.session?.permisos, perfil]);

  const tieneVista = useCallback((vista: string) => permisos.vistasPerm.includes(vista), [permisos]);

  // Delegado a AuthContext para verificar permisos granulares
  const tienePermiso = useCallback((permisoId: string) => {
    return auth.hasPermission(permisoId);
  }, [auth]);

  const tieneAlgunPermiso = useCallback((permisoIds: string[]) => {
    return auth.hasAnyPermission(permisoIds);
  }, [auth]);

  const { label: rolLabel, color: rolColor, bg: rolBg } = ROL_STYLES[perfil.rol];

  return (
    <PermisosPTACtx.Provider value={{
      perfil, permisos, setPerfil, tieneVista,
      rolLabel, rolColor, rolBg,
      isSimulando, rolDerivado,
      tienePermiso, tieneAlgunPermiso,
    }}>
      {children}
    </PermisosPTACtx.Provider>
  );
}

export function usePermisosPTA() {
  const ctx = useContext(PermisosPTACtx);
  if (!ctx) throw new Error('usePermisosPTA must be used inside PermisosPTAProvider');
  return ctx;
}

// ============================================================================
// usePermisosPTAGranulares — Hook especializado para permisos PTA granulares
// ============================================================================

/**
 * Hook que expone helpers granulares para verificar permisos PTA especificos.
 * Consume AuthContext directamente para verificacion rapida.
 *
 * Uso:
 * ```tsx
 * const { puede, puedeAccion, sourceInfo } = usePermisosPTAGranulares();
 * if (puede('pta.backoffice.aprobar')) { ... }
 * if (puedeAccion('aprobar')) { ... }  // shorthand: busca pta.backoffice.{accion}
 * ```
 */
export function usePermisosPTAGranulares() {
  const auth = useAuth();
  const ctx = useContext(PermisosPTACtx);

  const puede = useCallback((permisoId: string): boolean => {
    return auth.isSuperUser || auth.hasPermission(permisoId);
  }, [auth]);

  /** Shorthand: verifica pta.backoffice.{accion} o pta.portal.{accion} */
  const puedeAccion = useCallback((accion: string): boolean => {
    return auth.isSuperUser 
      || auth.hasPermission(`pta.backoffice.${accion}`)
      || auth.hasPermission(`pta.portal.${accion}`);
  }, [auth]);

  /** Verifica si tiene acceso a una vista PTA por nombre */
  const puedeVista = useCallback((vista: string): boolean => {
    if (auth.isSuperUser) return true;
    // Buscar si algun permiso granular mapea a esta vista
    const permisosForVista = Object.entries(PERMISO_TO_VISTA)
      .filter(([, v]) => v === vista)
      .map(([p]) => p);
    if (permisosForVista.length === 0) return ctx?.tieneVista(vista) ?? false;
    return permisosForVista.some(p => auth.hasPermission(p));
  }, [auth, ctx]);

  /** Info del origen de permisos para debug */
  const sourceInfo = useMemo(() => ({
    source: ctx?.permisos.source || 'unknown',
    granularCount: ctx?.permisos.granularCount || 0,
    totalPermisos: auth.session?.permisos?.length || 0,
    ptaPermisos: (auth.session?.permisos || []).filter(p => p.startsWith('pta.')).length,
  }), [ctx, auth.session?.permisos]);

  return { puede, puedeAccion, puedeVista, sourceInfo };
}

// ============================================================================
// SelectorRolPTA — Muestra informacion del perfil y rol actual
// ============================================================================

export function SelectorRolPTA() {
  const auth = useAuth();
  const { perfil, permisos, rolLabel, rolColor, rolBg } = usePermisosPTA();
  const [refreshing, setRefreshing] = useState(false);

  // Refrescar permisos sin re-login (vía ruta /auth/permissions-by-name/:roleName)
  const handleRefreshPermisos = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const roleName = auth.session?.rol || auth.userRole || '';
      if (!roleName) {
        console.warn('[PermisosPTA] No se puede refrescar: sin rol activo');
        setRefreshing(false);
        return;
      }
      const { publicAnonKey } = await import('../../utils/supabase/info');
      const res = await fetch(
        `http://localhost:5000/api/auth/permissions-by-name/${encodeURIComponent(roleName)}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.permisos)) {
        // Actualizar permisos en la sesión via localStorage + reload contexto
        const stored = localStorage.getItem('esap-auth-session');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.permisos = data.permisos;
          parsed._timestamp = Date.now();
          localStorage.setItem('esap-auth-session', JSON.stringify(parsed));
          // Force page reload to pick up new permissions
          window.location.reload();
        }
        console.log(`[PermisosPTA] Permisos refrescados: ${data.permisos.length} permisos`);
      } else {
        console.warn('[PermisosPTA] No se pudieron refrescar permisos:', data);
      }
    } catch (err) {
      console.error('[PermisosPTA] Error refrescando permisos:', err);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap max-w-[220px]"
      style={{
        border: `1.5px solid ${rolColor}20`,
        background: rolBg,
        color: rolColor,
      }}
    >
      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: rolColor }} />
      <span className="truncate">{auth.userName || perfil.nombre}</span>
      <span className="px-1.5 py-0.5 rounded text-[0.6rem] font-bold uppercase shrink-0"
        style={{ background: `${rolColor}15` }}>{rolLabel}</span>
      <span
        className="px-1 rounded text-[0.5rem] font-bold shrink-0"
        style={{
          background: permisos.source === 'granular' ? '#D1FAE5' : '#FEF3C7',
          color: permisos.source === 'granular' ? '#059669' : '#D97706',
        }}
      >
        {permisos.source === 'granular' ? `KV:${permisos.granularCount}` : 'FB'}
      </span>
      <span
        onClick={(e) => { e.stopPropagation(); handleRefreshPermisos(); }}
        role="button"
        tabIndex={0}
        title="Refrescar permisos desde servidor"
        className="w-4 h-4 rounded border border-gray-200 inline-flex items-center justify-center shrink-0 cursor-pointer hover:bg-gray-100"
        style={{ background: refreshing ? '#F3F4F6' : 'white' }}
      >
        <RefreshCw className="w-2.5 h-2.5 text-gray-400" style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
      </span>
    </div>
  );
}