/**
 * ProgramacionAcademicaInstitucionalPTA — Vista VA01
 * 
 * Permite a Coordinadores y Directores:
 * 1. Crear oferta academica del periodo (asignaturas, grupos, horarios)
 * 2. Asignar docentes a asignaturas con dual-list picker
 * 3. Pre-cargar componentes Investigacion/Extension
 * 4. Generar PTAs pre-cargados masivamente
 * 5. Notificar masivamente a docentes
 * 
 * Ref: REQUERIMIENTOS v11 - PARTE XXV, Seccion 25.3.1
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen, Users, FileText, Plus, Search, ChevronRight, ChevronLeft,
  Check, X, AlertTriangle, Send, Save, Trash2, GraduationCap,
  Clock, MapPin, Calendar, ArrowRight, ArrowLeft, RefreshCw,
  Eye, BarChart3, Zap, Bell, Loader2, Filter, ChevronDown,
  Building2, FlaskConical, Globe, ListChecks, CheckCircle2,
} from 'lucide-react';
import {
  getCatalogoProgramas, getCatalogoAsignaturas, getCatalogoTerritoriales,
  getDocentesDisponibles, crearPTAPreCarga, notificarDocentePTA,
  getAllPTAs, getOfertaAcademica, saveOfertaAcademica,
  getAsignacionesDocentes, saveAsignacionDocente,
  generarPTAsMasivos, notificarDocentesMasivo,
  getSyncProgramasStatus, saveCustomAsignaturas, deleteCustomAsignatura,
} from '../../services/api/ptaApi';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { Permissions } from '@esap-mfe/shared-types';

interface Props {
  onBack?: () => void;
  periodo?: string;
}

type TabView = 'oferta' | 'asignacion' | 'precarga';

interface OfertaItem {
  id: string;
  asignatura_id: string;
  asignatura_nombre: string;
  programa_id: string;
  programa_nombre: string;
  grupo: string;
  creditos: number;
  horas: number;
  horario: string;
  modalidad: string;
  cupos: number;
  docente_asignado_id?: string;
  docente_asignado_nombre?: string;
}

interface AsignacionDocente {
  docente_id: string;
  docente_nombre: string;
  cedula: string;
  dedicacion: string;
  territorial: string;
  horas_programables: number;
  asignaturas_asignadas: { oferta_id: string; nombre: string; horas: number; programa: string }[];
  investigacion: { proyecto: string; rol: string; horas: number } | null;
  extension: { actividad: string; horas: number }[];
  total_precargado: number;
  porcentaje: number;
  horas_pendientes: number;
}

const HORARIOS_OPCIONES = [
  'Lu-Mi 6:00am-8:00am', 'Lu-Mi 8:00am-10:00am', 'Lu-Mi 2:00pm-4:00pm', 'Lu-Mi 6:00pm-8:00pm',
  'Ma-Ju 6:00am-8:00am', 'Ma-Ju 8:00am-10:00am', 'Ma-Ju 2:00pm-4:00pm', 'Ma-Ju 6:00pm-8:00pm',
  'Vi 6:00am-10:00am', 'Vi 2:00pm-6:00pm', 'Sa 7:00am-12:00pm', 'Sa 1:00pm-6:00pm',
  'Virtual Sincrono', 'Virtual Asincrono',
];

const MODALIDADES = ['Presencial', 'Virtual', 'Mixta', 'Distancia'];
const GRUPOS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'N1', 'N2', 'N3'];

const PROYECTOS_INVESTIGACION = [
  { id: 'pry-2025-001', nombre: 'Modernizacion de la Gestion Publica Territorial', area: 'Gestion Publica' },
  { id: 'pry-2025-002', nombre: 'Politicas Publicas para el Posconflicto', area: 'Politicas Publicas' },
  { id: 'pry-2025-003', nombre: 'Transformacion Digital del Estado', area: 'TIC y Gobierno Digital' },
  { id: 'pry-2025-004', nombre: 'Derechos Humanos en Territorios', area: 'DDHH' },
  { id: 'pry-2025-005', nombre: 'Economia Publica y Desarrollo Local', area: 'Economia' },
  { id: 'pry-2025-006', nombre: 'Formacion Ciudadana y Participacion', area: 'Participacion' },
];

const ROLES_INVESTIGACION = [
  { id: 'lider', nombre: 'Investigador Lider de Proyecto', max_porcentaje: 50 },
  { id: 'coinvestigador', nombre: 'Coinvestigador', max_porcentaje: 30 },
  { id: 'asistente', nombre: 'Asistente de Investigacion', max_porcentaje: 15 },
];

export function ProgramacionAcademicaInstitucionalPTA({ onBack, periodo = '2025-2' }: Props) {
  const { hasPermission } = useAuth();
  const [tab, setTab] = useState<TabView>('oferta');
  const [loading, setLoading] = useState(true);
  const [programas, setProgramas] = useState<any[]>([]);
  const [asignaturasCatalogo, setAsignaturasCatalogo] = useState<any[]>([]);
  const [territoriales, setTerritoriales] = useState<any[]>([]);
  const [docentes, setDocentes] = useState<any[]>([]);
  const [filtroTerritorial, setFiltroTerritorial] = useState('');
  const [filtroPrograma, setFiltroPrograma] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Oferta Academica
  const [oferta, setOferta] = useState<OfertaItem[]>([]);
  const [showAddOferta, setShowAddOferta] = useState(false);
  const [newOfertaPrograma, setNewOfertaPrograma] = useState('');
  const [selectedAsignaturas, setSelectedAsignaturas] = useState<Set<string>>(new Set());

  // Asignacion Docentes
  const [asignaciones, setAsignaciones] = useState<AsignacionDocente[]>([]);
  const [selectedDocente, setSelectedDocente] = useState<AsignacionDocente | null>(null);
  const [docenteSearch, setDocenteSearch] = useState('');

  // Pre-carga
  const [generando, setGenerando] = useState(false);
  const [ptasGenerados, setPtasGenerados] = useState<any[]>([]);
  const [notificando, setNotificando] = useState(false);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncInfo, setSyncInfo] = useState<{ total_real: number; total_static: number; programas: any[] } | null>(null);

  // Track whether oferta was loaded from persistence (to avoid overwriting on mount)
  const [ofertaLoaded, setOfertaLoaded] = useState(false);
  const saveTimerRef = useMemo(() => ({ current: null as ReturnType<typeof setTimeout> | null }), []);
  const saveOfertaDebounced = useCallback((items: OfertaItem[], per: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await saveOfertaAcademica({ periodo: per, items });
        console.log('[VA01] Oferta auto-guardada:', items.length, 'items');
      } catch (e) { console.error('[VA01] Error auto-guardando oferta:', e); }
    }, 2000);
  }, []);

  // Auto-save oferta when it changes (after initial load)
  useEffect(() => {
    if (!ofertaLoaded || oferta.length === 0) return;
    if (hasPermission(Permissions.PTA_PROGRAMACION_ACADEMICA_OFERTA_EDIT) || hasPermission(Permissions.PTA_PROGRAMACION_ACADEMICA_MANAGE)) {
      saveOfertaDebounced(oferta, periodo);
    }
  }, [oferta, ofertaLoaded, periodo, hasPermission]);

  // Load initial data
  useEffect(() => {
    loadData();
  }, [periodo]);

  const loadData = async () => {
    setLoading(true);
    setOfertaLoaded(false);
    try {
      // Load catalogs, docentes, AND persisted oferta in parallel
      const [progsRes, terRes, docsRes, ofertaRes] = await Promise.all([
        getCatalogoProgramas(),
        getCatalogoTerritoriales(),
        getDocentesDisponibles(periodo),
        getOfertaAcademica(periodo),
      ]);

      // Programs — now includes real programs from Programas Académicos module
      const progsData = progsRes.success ? (progsRes.data || []) : [];
      setProgramas(progsData);
      const progSourceInfo = progsRes.totalReal > 0
        ? `${progsData.length} programas (${progsRes.totalStatic || 0} catálogo PTA + ${progsRes.totalReal} de Programas Académicos)`
        : `${progsData.length} programas del catálogo PTA`;
      console.log('[VA01] Programas cargados:', progSourceInfo);

      // Load sync info in background
      if (progsRes.totalReal > 0) {
        getSyncProgramasStatus().then(res => {
          if (res.success && res.data) {
            setSyncInfo(res.data);
            setLastSyncTime(res.data.synced_at);
          }
        }).catch(() => {});
      }

      if (terRes.success) setTerritoriales(terRes.data || []);
      if (docsRes.success) {
        const docsData = docsRes.data || [];
        setDocentes(docsData);
        setAsignaciones(docsData.map((d: any) => {
          let horasProg = 800;
          const ded = (d.dedicacion || 'Tiempo Completo').toLowerCase();
          if (ded.includes('medio')) horasProg = 400;
          else if (ded.includes('catedra') || ded.includes('cátedra')) {
            horasProg = (d.semanas_vinculacion || 18) * 12;
          }
          return {
            docente_id: d.id,
            docente_nombre: d.nombre || `Docente ${d.id.slice(-4)}`,
            cedula: d.cedula || '',
            dedicacion: d.dedicacion || 'Tiempo Completo',
            territorial: d.territorial_id || d.territorial || '',
            horas_programables: horasProg,
            asignaturas_asignadas: [],
            investigacion: null,
            extension: [],
            total_precargado: 0,
            porcentaje: 0,
            horas_pendientes: horasProg,
          };
        }));
        if (docsData.length > 0) {
          console.log(`[VA01] ${docsData.length} docentes cargados`);
        }
      }

      // PRIORITY 1: Load persisted oferta from KV
      let ofertaCargada = false;
      if (ofertaRes.success && ofertaRes.data?.items && ofertaRes.data.items.length > 0) {
        // Enrich program names with latest catalog
        const progMap = new Map(progsData.map((p: any) => [p.id, p.nombre]));
        const enrichedItems = ofertaRes.data.items.map((item: any) => ({
          ...item,
          programa_nombre: progMap.get(item.programa_id) || item.programa_nombre || item.programa_id,
        }));
        setOferta(enrichedItems);
        ofertaCargada = true;
        console.log(`[VA01] Oferta cargada de KV: ${enrichedItems.length} items`);
        toast.success(`Oferta académica cargada: ${enrichedItems.length} asignaturas`, { duration: 2000 });
      }

      // PRIORITY 2: Reconstruct oferta from existing PTAs if no persisted oferta
      if (!ofertaCargada) {
        const existingPtas = await getAllPTAs({ periodo });
        if (existingPtas.success && existingPtas.data?.length > 0) {
          const progMap = new Map(progsData.map((p: any) => [p.id, p.nombre]));
          const ofertaFromPtas: OfertaItem[] = [];
          existingPtas.data.forEach((pta: any) => {
            (pta.asignaturas || []).forEach((asig: any, idx: number) => {
              ofertaFromPtas.push({
                id: `of-${pta.id}-${idx}`,
                asignatura_id: asig.id || asig.asignatura_id || `as-auto-${idx}`,
                asignatura_nombre: asig.nombre || asig.asignatura || 'Asignatura',
                programa_id: asig.programa_id || 'ap-diurno',
                programa_nombre: progMap.get(asig.programa_id) || asig.programa || 'AP Diurno',
                grupo: asig.grupo || 'A1',
                creditos: asig.creditos || 3,
                horas: asig.total_horas_calculadas || asig.horas || 144,
                horario: asig.horario || 'Lu-Mi 6:00pm-8:00pm',
                modalidad: asig.modalidad || 'Presencial',
                cupos: asig.cupos || 40,
                docente_asignado_id: pta.docente_id,
                docente_asignado_nombre: pta.docente_nombre,
              });
            });
          });
          if (ofertaFromPtas.length > 0) {
            setOferta(ofertaFromPtas);
            ofertaCargada = true;
            console.log(`[VA01] Oferta reconstruida de PTAs: ${ofertaFromPtas.length} items`);
          }
        }
      }

      // No generar oferta demo si no hay datos.
      if (!ofertaCargada) {
        setOferta([]);
      }

      setOfertaLoaded(true);
    } catch (err) {
      console.error('Error loading data:', err);
      toast.error('Error cargando datos iniciales');
      setOfertaLoaded(true);
    }
    setLoading(false);
  };

  const generateDemoOferta = (progsData?: any[]) => {
    // Resolve program name from catalog if available
    const progMap = new Map((progsData || programas).map((p: any) => [p.id, p.nombre]));
    const progName = (id: string, fallback: string) => progMap.get(id) || fallback;

    const demoOferta: OfertaItem[] = [
      { id: 'of-1', asignatura_id: 'as-001', asignatura_nombre: 'Fundamentos de Administracion Publica', programa_id: 'ap-diurno', programa_nombre: progName('ap-diurno', 'AP Diurno'), grupo: 'A1', creditos: 3, horas: 144, horario: 'Lu-Mi 6:00pm-8:00pm', modalidad: 'Presencial', cupos: 40 },
      { id: 'of-2', asignatura_id: 'as-009', asignatura_nombre: 'Politicas Publicas', programa_id: 'ap-diurno', programa_nombre: progName('ap-diurno', 'AP Diurno'), grupo: 'A1', creditos: 3, horas: 144, horario: 'Ma-Ju 6:00pm-8:00pm', modalidad: 'Presencial', cupos: 35 },
      { id: 'of-3', asignatura_id: 'as-004', asignatura_nombre: 'Derecho Administrativo', programa_id: 'ap-diurno', programa_nombre: progName('ap-diurno', 'AP Diurno'), grupo: 'B1', creditos: 4, horas: 192, horario: 'Lu-Mi 8:00am-10:00am', modalidad: 'Presencial', cupos: 45 },
      { id: 'of-4', asignatura_id: 'as-007', asignatura_nombre: 'Finanzas Publicas', programa_id: 'ap-diurno', programa_nombre: progName('ap-diurno', 'AP Diurno'), grupo: 'A1', creditos: 3, horas: 144, horario: 'Vi 6:00am-10:00am', modalidad: 'Mixta', cupos: 50 },
      { id: 'of-5', asignatura_id: 'as-003', asignatura_nombre: 'Derecho Constitucional', programa_id: 'ap-diurno', programa_nombre: progName('ap-diurno', 'AP Diurno'), grupo: 'A2', creditos: 3, horas: 144, horario: 'Ma-Ju 2:00pm-4:00pm', modalidad: 'Presencial', cupos: 40 },
      { id: 'of-6', asignatura_id: 'as-010', asignatura_nombre: 'Gestion del Talento Humano', programa_id: 'ap-diurno', programa_nombre: progName('ap-diurno', 'AP Diurno'), grupo: 'A1', creditos: 3, horas: 144, horario: 'Sa 7:00am-12:00pm', modalidad: 'Virtual', cupos: 60 },
      { id: 'of-7', asignatura_id: 'as-022', asignatura_nombre: 'Planeacion del Desarrollo', programa_id: 'ap-diurno', programa_nombre: progName('ap-diurno', 'AP Diurno'), grupo: 'B2', creditos: 3, horas: 144, horario: 'Lu-Mi 2:00pm-4:00pm', modalidad: 'Presencial', cupos: 35 },
      { id: 'of-8', asignatura_id: 'as-025', asignatura_nombre: 'Gobierno Digital', programa_id: 'ap-diurno', programa_nombre: progName('ap-diurno', 'AP Diurno'), grupo: 'A1', creditos: 3, horas: 144, horario: 'Virtual Sincrono', modalidad: 'Virtual', cupos: 80 },
    ];
    setOferta(demoOferta);
  };

  // Sync programas from Programas Académicos module
  const handleSyncProgramas = async () => {
    setSyncing(true);
    try {
      // Reload programas catalog (which merges static + real from KV)
      const [progsRes, syncRes] = await Promise.all([
        getCatalogoProgramas(),
        getSyncProgramasStatus(),
      ]);
      if (progsRes.success) {
        const progsData = progsRes.data || [];
        setProgramas(progsData);

        // Enrich existing oferta with updated program names
        const progMap = new Map(progsData.map((p: any) => [p.id, p.nombre]));
        setOferta(prev => prev.map(o => ({
          ...o,
          programa_nombre: progMap.get(o.programa_id) || o.programa_nombre,
        })));

        const realCount = progsRes.totalReal || 0;
        const staticCount = progsRes.totalStatic || 0;
        toast.success(`Sincronización completada`, {
          description: `${progsData.length} programas (${staticCount} catálogo + ${realCount} de Programas Académicos)`,
        });
      }
      if (syncRes.success && syncRes.data) {
        setSyncInfo(syncRes.data);
      }
      setLastSyncTime(new Date().toISOString());
    } catch (err) {
      console.error('Error syncing programas:', err);
      toast.error('Error al sincronizar programas');
    }
    setSyncing(false);
  };

  // Load asignaturas when programa changes
  useEffect(() => {
    if (newOfertaPrograma) {
      getCatalogoAsignaturas(newOfertaPrograma).then(res => {
        if (res.success) setAsignaturasCatalogo(res.data || []);
      });
    }
  }, [newOfertaPrograma]);

  const ofertaDisponible = useMemo(() => {
    return oferta.filter(o => !o.docente_asignado_id);
  }, [oferta]);

  const ofertaFiltrada = useMemo(() => {
    let items = oferta;
    if (filtroPrograma) items = items.filter(o => o.programa_id === filtroPrograma);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(o =>
        o.asignatura_nombre.toLowerCase().includes(q) ||
        o.programa_nombre.toLowerCase().includes(q) ||
        o.docente_asignado_nombre?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [oferta, filtroPrograma, searchQuery]);

  const docentesFiltrados = useMemo(() => {
    let items = asignaciones;
    if (filtroTerritorial) items = items.filter(d => d.territorial === filtroTerritorial);
    if (docenteSearch.trim()) {
      const q = docenteSearch.toLowerCase();
      items = items.filter(d =>
        d.docente_nombre.toLowerCase().includes(q) ||
        d.cedula.includes(q)
      );
    }
    return items;
  }, [asignaciones, filtroTerritorial, docenteSearch]);

  const handleAddOfertaItems = () => {
    const newItems: OfertaItem[] = [];
    selectedAsignaturas.forEach(asigId => {
      const asig = asignaturasCatalogo.find(a => a.id === asigId);
      if (!asig) return;
      const prog = programas.find(p => p.id === newOfertaPrograma);
      newItems.push({
        id: `of-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        asignatura_id: asig.id,
        asignatura_nombre: asig.nombre,
        programa_id: newOfertaPrograma,
        programa_nombre: prog?.nombre || newOfertaPrograma,
        grupo: 'A1',
        creditos: asig.creditos || 3,
        horas: (asig.creditos || 3) * 48,
        horario: 'Lu-Mi 6:00pm-8:00pm',
        modalidad: 'Presencial',
        cupos: 40,
      });
    });
    setOferta(prev => [...prev, ...newItems]);
    setSelectedAsignaturas(new Set());
    setShowAddOferta(false);
    toast.success(`${newItems.length} asignaturas agregadas a la oferta`);
  };

  const handleRemoveOferta = (id: string) => {
    setOferta(prev => prev.filter(o => o.id !== id));
  };

  const handleUpdateOferta = (id: string, field: string, value: any) => {
    setOferta(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
  };

  const handleAsignarDocente = (docenteIdx: number, ofertaId: string) => {
    const of = oferta.find(o => o.id === ofertaId);
    if (!of) return;

    setAsignaciones(prev => prev.map((a, i) => {
      if (i !== docenteIdx) return a;
      const yaAsignada = a.asignaturas_asignadas.some(as => as.oferta_id === ofertaId);
      if (yaAsignada) return a;
      const newAsig = [...a.asignaturas_asignadas, {
        oferta_id: ofertaId,
        nombre: of.asignatura_nombre,
        horas: of.horas,
        programa: of.programa_nombre,
      }];
      const total = newAsig.reduce((s, x) => s + x.horas, 0) +
        (a.investigacion?.horas || 0) +
        a.extension.reduce((s, x) => s + x.horas, 0);
      return {
        ...a,
        asignaturas_asignadas: newAsig,
        total_precargado: total,
        porcentaje: Math.round((total / a.horas_programables) * 100),
        horas_pendientes: a.horas_programables - total,
      };
    }));

    setOferta(prev => prev.map(o =>
      o.id === ofertaId
        ? { ...o, docente_asignado_id: asignaciones[docenteIdx].docente_id, docente_asignado_nombre: asignaciones[docenteIdx].docente_nombre }
        : o
    ));
  };

  const handleDesasignarDocente = (docenteIdx: number, ofertaId: string) => {
    setAsignaciones(prev => prev.map((a, i) => {
      if (i !== docenteIdx) return a;
      const newAsig = a.asignaturas_asignadas.filter(as => as.oferta_id !== ofertaId);
      const total = newAsig.reduce((s, x) => s + x.horas, 0) +
        (a.investigacion?.horas || 0) +
        a.extension.reduce((s, x) => s + x.horas, 0);
      return {
        ...a,
        asignaturas_asignadas: newAsig,
        total_precargado: total,
        porcentaje: Math.round((total / a.horas_programables) * 100),
        horas_pendientes: a.horas_programables - total,
      };
    }));

    setOferta(prev => prev.map(o =>
      o.id === ofertaId ? { ...o, docente_asignado_id: undefined, docente_asignado_nombre: undefined } : o
    ));
  };

  const handleAsignarInvestigacion = (docenteIdx: number, proyecto: string, rol: string, horas: number) => {
    setAsignaciones(prev => prev.map((a, i) => {
      if (i !== docenteIdx) return a;
      const inv = { proyecto, rol, horas };
      const total = a.asignaturas_asignadas.reduce((s, x) => s + x.horas, 0) + horas + a.extension.reduce((s, x) => s + x.horas, 0);
      return {
        ...a,
        investigacion: inv,
        total_precargado: total,
        porcentaje: Math.round((total / a.horas_programables) * 100),
        horas_pendientes: a.horas_programables - total,
      };
    }));
  };

  const handleGenerarPTAs = async () => {
    setGenerando(true);
    try {
      const docentesConAsignacion = asignaciones.filter(a => a.asignaturas_asignadas.length > 0 || a.investigacion);
      if (docentesConAsignacion.length === 0) {
        toast.warning('No hay docentes con asignaciones para generar PTAs');
        setGenerando(false);
        return;
      }

      const ptasData = docentesConAsignacion.map(a => ({
        docente_id: a.docente_id,
        docente_nombre: a.docente_nombre,
        cedula: a.cedula,
        dedicacion: a.dedicacion,
        periodo,
        territorial: a.territorial,
        horas_programables: a.horas_programables,
        asignaturas: a.asignaturas_asignadas.map(as => {
          const of = oferta.find(o => o.id === as.oferta_id);
          return {
            id: of?.asignatura_id || as.oferta_id,
            nombre: as.nombre,
            programa: as.programa,
            programa_id: of?.programa_id || '',
            grupo: of?.grupo || 'A1',
            creditos: of?.creditos || 3,
            horas: as.horas,
            horario: of?.horario || '',
            modalidad: of?.modalidad || 'Presencial',
          };
        }),
        investigacion: a.investigacion,
        extension: a.extension,
        total_precargado: a.total_precargado,
        porcentaje_precargado: a.porcentaje,
        horas_pendientes: a.horas_pendientes,
        origen: 'institucional',
        estado: 'PROPUESTO_POR_DIRECCION',
      }));

      // Create PTAs via the existing precarga endpoint
      let creados = 0;
      for (const ptaData of ptasData) {
        const res = await crearPTAPreCarga(ptaData);
        if (res.success) creados++;
      }

      setPtasGenerados(ptasData);
      toast.success(`${creados} PTAs pre-cargados generados exitosamente`, {
        description: `Periodo ${periodo} - Listos para notificar a los docentes`,
      });
    } catch (err) {
      console.error('Error generating PTAs:', err);
      toast.error('Error al generar PTAs masivos');
    }
    setGenerando(false);
  };

  const handleNotificarMasivo = async () => {
    setNotificando(true);
    try {
      const docentesANotificar = ptasGenerados.length > 0
        ? ptasGenerados
        : asignaciones.filter(a => a.asignaturas_asignadas.length > 0);

      let notificados = 0;
      for (const d of docentesANotificar) {
        // Use existing notify endpoint
        const ptaId = `pta-${d.docente_id}-${periodo}`;
        await notificarDocentePTA(ptaId, {
          mensaje: `La Direccion le ha asignado carga academica para el periodo ${periodo}. Revise su PTA y responda antes de la fecha limite.`,
          notificado_por: 'Coordinacion Academica',
          fecha_limite: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        });
        notificados++;
      }

      toast.success(`${notificados} docentes notificados`, {
        description: 'Los docentes recibiran la notificacion en su portal',
      });
    } catch (err) {
      console.error('Error notifying:', err);
      toast.error('Error al notificar masivamente');
    }
    setNotificando(false);
  };

  // Stats
  const stats = useMemo(() => ({
    totalAsignaturas: oferta.length,
    asignadas: oferta.filter(o => o.docente_asignado_id).length,
    sinAsignar: oferta.filter(o => !o.docente_asignado_id).length,
    totalDocentes: asignaciones.length,
    docentesConCarga: asignaciones.filter(a => a.asignaturas_asignadas.length > 0).length,
    horasTotales: oferta.reduce((s, o) => s + o.horas, 0),
    programasActivos: new Set(oferta.map(o => o.programa_id)).size,
  }), [oferta, asignaciones]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
        <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: '#003DA5' }} />
        <span style={{ fontSize: '0.95rem', color: '#6B7280' }}>Cargando programacion academica...</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: 12, marginBottom: 20,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            {onBack && (
              <button onClick={onBack} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                borderRadius: 6, display: 'flex', alignItems: 'center',
              }}>
                <ChevronLeft style={{ width: 20, height: 20, color: '#6B7280' }} />
              </button>
            )}
            <GraduationCap style={{ width: 28, height: 28, color: '#003DA5' }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: 0 }}>
              Programacion Academica Institucional
            </h2>
          </div>
          <p style={{ fontSize: '0.88rem', color: '#6B7280', marginLeft: onBack ? 34 : 38 }}>
            Vista VA01 - Crear oferta, asignar docentes y generar PTAs pre-cargados para el periodo {periodo}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={handleSyncProgramas}
            disabled={syncing}
            title="Sincronizar programas desde módulo Programas Académicos"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              borderRadius: 10, border: '1px solid #A7F3D0', cursor: syncing ? 'wait' : 'pointer',
              background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
              fontSize: '0.82rem', fontWeight: 600, color: '#065F46',
              transition: 'all 0.15s ease',
              opacity: syncing ? 0.7 : 1,
            }}
          >
            <RefreshCw style={{
              width: 15, height: 15,
              animation: syncing ? 'spin 1s linear infinite' : 'none',
            }} />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
            {syncInfo && syncInfo.total_real > 0 && (
              <span style={{
                padding: '1px 7px', borderRadius: 10,
                background: '#059669', color: 'white', fontSize: '0.68rem', fontWeight: 700,
              }}>
                {syncInfo.total_real}
              </span>
            )}
          </button>
          {lastSyncTime && (
            <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>
              {new Date(lastSyncTime).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 10,
            background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
            border: '1px solid #BFDBFE',
          }}>
            <Calendar style={{ width: 16, height: 16, color: '#1E40AF' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E40AF' }}>
              Periodo {periodo}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 10, marginBottom: 20,
      }}>
        {[
          { label: 'Asignaturas', value: stats.totalAsignaturas, icon: BookOpen, color: '#003DA5', bg: '#EFF6FF' },
          { label: 'Asignadas', value: stats.asignadas, icon: CheckCircle2, color: '#059669', bg: '#D1FAE5' },
          { label: 'Sin Asignar', value: stats.sinAsignar, icon: AlertTriangle, color: '#D97706', bg: '#FEF3C7' },
          { label: 'Docentes', value: stats.totalDocentes, icon: Users, color: '#7C3AED', bg: '#F3E8FF' },
          { label: 'Con Carga', value: stats.docentesConCarga, icon: Zap, color: '#0891B2', bg: '#ECFEFF' },
          { label: 'Horas Oferta', value: stats.horasTotales.toLocaleString(), icon: Clock, color: '#DC2626', bg: '#FEF2F2' },
          { label: 'Programas', value: stats.programasActivos, icon: Building2, color: '#6B21A8', bg: '#FAF5FF' },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            style={{
              padding: '12px 14px', borderRadius: 10, background: s.bg,
              border: `1px solid ${s.color}20`, display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <s.icon style={{ width: 18, height: 18, color: s.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 500 }}>{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 2, marginBottom: 16, borderBottom: '2px solid #E5E7EB', paddingBottom: 0,
      }}>
        {[
          { key: 'oferta' as TabView, label: 'Oferta Academica', icon: BookOpen, count: oferta.length },
          { key: 'asignacion' as TabView, label: 'Asignacion Docentes', icon: Users, count: stats.docentesConCarga },
          { key: 'precarga' as TabView, label: 'Pre-carga PTAs', icon: FileText, count: ptasGenerados.length },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 18px', border: 'none', cursor: 'pointer',
              borderBottom: tab === t.key ? '3px solid #003DA5' : '3px solid transparent',
              background: tab === t.key ? '#EFF6FF' : 'transparent',
              color: tab === t.key ? '#003DA5' : '#6B7280',
              fontWeight: 600, fontSize: '0.88rem', borderRadius: '8px 8px 0 0',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <t.icon style={{ width: 16, height: 16 }} />
            {t.label}
            {t.count > 0 && (
              <span style={{
                background: tab === t.key ? '#003DA5' : '#9CA3AF',
                color: 'white', borderRadius: 20, padding: '1px 7px',
                fontSize: '0.7rem', fontWeight: 700,
              }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {tab === 'oferta' && (
          <motion.div key="oferta" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <OfertaAcademicaTab
              oferta={ofertaFiltrada}
              programas={programas}
              asignaturasCatalogo={asignaturasCatalogo}
              filtroPrograma={filtroPrograma}
              setFiltroPrograma={setFiltroPrograma}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              showAddOferta={showAddOferta}
              setShowAddOferta={setShowAddOferta}
              newOfertaPrograma={newOfertaPrograma}
              setNewOfertaPrograma={setNewOfertaPrograma}
              selectedAsignaturas={selectedAsignaturas}
              setSelectedAsignaturas={setSelectedAsignaturas}
              onAdd={hasPermission(Permissions.PTA_PROGRAMACION_ACADEMICA_OFERTA_EDIT) || hasPermission(Permissions.PTA_PROGRAMACION_ACADEMICA_MANAGE) ? handleAddOfertaItems : undefined}
              onRemove={hasPermission(Permissions.PTA_PROGRAMACION_ACADEMICA_OFERTA_EDIT) || hasPermission(Permissions.PTA_PROGRAMACION_ACADEMICA_MANAGE) ? handleRemoveOferta : undefined}
              onUpdate={hasPermission(Permissions.PTA_PROGRAMACION_ACADEMICA_OFERTA_EDIT) || hasPermission(Permissions.PTA_PROGRAMACION_ACADEMICA_MANAGE) ? handleUpdateOferta : undefined}
              onSyncProgramas={handleSyncProgramas}
              syncing={syncing}
              syncInfo={syncInfo}
              lastSyncTime={lastSyncTime}
              onReloadAsignaturas={(progId: string) => {
                getCatalogoAsignaturas(progId).then(res => {
                  if (res.success) setAsignaturasCatalogo(res.data || []);
                });
              }}
            />
          </motion.div>
        )}

        {tab === 'asignacion' && (
          <motion.div key="asignacion" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <AsignacionDocentesTab
              docentes={docentesFiltrados}
              ofertaDisponible={ofertaDisponible}
              allOferta={oferta}
              territoriales={territoriales}
              filtroTerritorial={filtroTerritorial}
              setFiltroTerritorial={setFiltroTerritorial}
              docenteSearch={docenteSearch}
              setDocenteSearch={setDocenteSearch}
              selectedDocente={selectedDocente}
              setSelectedDocente={setSelectedDocente}
              onAsignar={hasPermission(Permissions.PTA_PROGRAMACION_ACADEMICA_ASIGNACION_MANAGE) || hasPermission(Permissions.PTA_PROGRAMACION_ACADEMICA_MANAGE) ? (dIdx, ofId) => handleAsignarDocente(
                asignaciones.findIndex(a => a.docente_id === docentesFiltrados[dIdx].docente_id),
                ofId
              ) : undefined}
              onDesasignar={hasPermission(Permissions.PTA_PROGRAMACION_ACADEMICA_ASIGNACION_MANAGE) || hasPermission(Permissions.PTA_PROGRAMACION_ACADEMICA_MANAGE) ? (dIdx, ofId) => handleDesasignarDocente(
                asignaciones.findIndex(a => a.docente_id === docentesFiltrados[dIdx].docente_id),
                ofId
              ) : undefined}
              onAsignarInvestigacion={hasPermission(Permissions.PTA_PROGRAMACION_ACADEMICA_ASIGNACION_MANAGE) || hasPermission(Permissions.PTA_PROGRAMACION_ACADEMICA_MANAGE) ? (dIdx, pry, rol, hrs) => handleAsignarInvestigacion(
                asignaciones.findIndex(a => a.docente_id === docentesFiltrados[dIdx].docente_id),
                pry, rol, hrs
              ) : undefined}
            />
          </motion.div>
        )}

        {tab === 'precarga' && (
          <motion.div key="precarga" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <PreCargaPTAsTab
              asignaciones={asignaciones}
              ptasGenerados={ptasGenerados}
              generando={generando}
              notificando={notificando}
              onGenerar={hasPermission(Permissions.PTA_PROGRAMACION_ACADEMICA_PRECARGA_MANAGE) || hasPermission(Permissions.PTA_PROGRAMACION_ACADEMICA_MANAGE) ? handleGenerarPTAs : undefined}
              onNotificar={hasPermission(Permissions.PTA_PROGRAMACION_ACADEMICA_NOTIFICAR) || hasPermission(Permissions.PTA_PROGRAMACION_ACADEMICA_MANAGE) ? handleNotificarMasivo : undefined}
              periodo={periodo}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Sub-component: Oferta Academica Tab
// ═══════════════════════════════════════════════════════════════════════

function OfertaAcademicaTab({
  oferta, programas, asignaturasCatalogo, filtroPrograma, setFiltroPrograma,
  searchQuery, setSearchQuery, showAddOferta, setShowAddOferta,
  newOfertaPrograma, setNewOfertaPrograma, selectedAsignaturas, setSelectedAsignaturas,
  onAdd, onRemove, onUpdate,
  onSyncProgramas, syncing, syncInfo, lastSyncTime, onReloadAsignaturas,
}: any) {
  const [showCreateCustom, setShowCreateCustom] = useState(false);
  const [customNombre, setCustomNombre] = useState('');
  const [customNucleo, setCustomNucleo] = useState('');
  const [customCreditos, setCustomCreditos] = useState(3);
  const [customSemestre, setCustomSemestre] = useState(1);
  const [savingCustom, setSavingCustom] = useState(false);

  const isRealPrograma = newOfertaPrograma?.startsWith('programa:');
  const customAsigs = asignaturasCatalogo.filter((a: any) => a.source === 'custom');
  const heuristicAsigs = asignaturasCatalogo.filter((a: any) => a.source === 'heuristic' || (!a.source && a.programa_origen));
  const staticAsigs = asignaturasCatalogo.filter((a: any) => !a.source && !a.programa_origen);

  const handleCreateCustomAsignatura = async () => {
    if (!customNombre.trim() || !newOfertaPrograma) return;
    setSavingCustom(true);
    try {
      const res = await saveCustomAsignaturas(newOfertaPrograma, [{
        nombre: customNombre.trim(),
        nucleo: customNucleo.trim() || 'General',
        creditos: customCreditos,
        semestre: customSemestre,
      }]);
      if (res.success) {
        toast.success(`Asignatura "${customNombre}" creada para este programa`);
        setCustomNombre('');
        setCustomNucleo('');
        setCustomCreditos(3);
        setCustomSemestre(1);
        setShowCreateCustom(false);
        // Reload asignaturas to show the new one
        onReloadAsignaturas(newOfertaPrograma);
      } else {
        toast.error('Error al crear asignatura personalizada');
      }
    } catch (err) {
      console.error('Error creating custom asignatura:', err);
      toast.error('Error al crear asignatura');
    }
    setSavingCustom(false);
  };

  const handleDeleteCustomAsignatura = async (asigId: string) => {
    try {
      const res = await deleteCustomAsignatura(newOfertaPrograma, asigId);
      if (res.success) {
        toast.success('Asignatura personalizada eliminada');
        onReloadAsignaturas(newOfertaPrograma);
      }
    } catch (err) {
      console.error('Error deleting custom asignatura:', err);
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 10, marginBottom: 14,
      }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ width: 14, height: 14, color: '#9CA3AF', position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Buscar asignatura o docente..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 12px 8px 32px', borderRadius: 8, border: '1px solid #E5E7EB',
                fontSize: '0.82rem', width: 260, outline: 'none',
              }}
            />
          </div>
          <select
            value={filtroPrograma}
            onChange={e => setFiltroPrograma(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB',
              fontSize: '0.82rem', color: '#374151', cursor: 'pointer',
            }}
          >
            <option value="">Todos los programas</option>
            {programas.filter((p: any) => !p.source).length > 0 && (
              <optgroup label="Catálogo PTA">
                {programas.filter((p: any) => !p.source).map((p: any, idx: number) => (
                  <option key={`pta-${p.id}-${idx}`} value={p.id}>{p.nombre}</option>
                ))}
              </optgroup>
            )}
            {programas.filter((p: any) => p.source === 'programas-academicos').length > 0 && (
              <optgroup label="Programas Académicos (BD)">
                {programas.filter((p: any) => p.source === 'programas-academicos').map((p: any, idx: number) => (
                  <option key={`bd-${p.id}-${idx}`} value={p.id}>{p.nombre}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        <button
          onClick={() => setShowAddOferta(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
            borderRadius: 8, border: 'none', background: '#003DA5', color: 'white',
            fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus style={{ width: 16, height: 16 }} />
          Agregar Asignaturas
        </button>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddOferta && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginBottom: 16, overflow: 'hidden' }}
          >
            <div style={{
              padding: 20, borderRadius: 12, background: '#F9FAFB',
              border: '1px solid #E5E7EB',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>
                  Agregar Asignaturas a la Oferta
                </h4>
                <button onClick={() => setShowAddOferta(false)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                }}>
                  <X style={{ width: 18, height: 18, color: '#6B7280' }} />
                </button>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>
                  Programa Academico
                </label>
                <select
                  value={newOfertaPrograma}
                  onChange={e => setNewOfertaPrograma(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    border: '1px solid #D1D5DB', fontSize: '0.85rem',
                  }}
                >
                  <option value="">Seleccionar programa...</option>
                  {programas.filter((p: any) => !p.source).length > 0 && (
                    <optgroup label="Catálogo PTA">
                      {programas.filter((p: any) => !p.source).map((p: any, idx: number) => (
                        <option key={`pta2-${p.id}-${idx}`} value={p.id}>{p.nombre} ({p.nivel})</option>
                      ))}
                    </optgroup>
                  )}
                  {programas.filter((p: any) => p.source === 'programas-academicos').length > 0 && (
                    <optgroup label="Programas Académicos (BD)">
                      {programas.filter((p: any) => p.source === 'programas-academicos').map((p: any, idx: number) => (
                        <option key={`bd2-${p.id}-${idx}`} value={p.id}>{p.nombre} ({p.nivel})</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Source info for real programs */}
              {isRealPrograma && newOfertaPrograma && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
                  padding: '6px 12px', borderRadius: 8,
                  background: customAsigs.length > 0 ? '#ECFDF5' : '#FEF3C7',
                  border: `1px solid ${customAsigs.length > 0 ? '#A7F3D0' : '#FDE68A'}`,
                  fontSize: '0.75rem', flexWrap: 'wrap',
                }}>
                  <Building2 style={{ width: 13, height: 13, flexShrink: 0 }} />
                  <span style={{ color: '#374151' }}>
                    Programa de <strong>BD Supabase</strong> —{' '}
                    {customAsigs.length > 0 && <span style={{ color: '#059669' }}>{customAsigs.length} propias</span>}
                    {customAsigs.length > 0 && heuristicAsigs.length > 0 && ' + '}
                    {heuristicAsigs.length > 0 && <span style={{ color: '#6B7280' }}>{heuristicAsigs.length} mapeadas</span>}
                    {customAsigs.length === 0 && heuristicAsigs.length === 0 && (
                      <span style={{ color: '#D97706' }}>sin asignaturas, cree una</span>
                    )}
                  </span>
                  <button
                    onClick={() => setShowCreateCustom(!showCreateCustom)}
                    style={{
                      marginLeft: 'auto', padding: '2px 10px', borderRadius: 6,
                      border: '1px solid #059669', background: '#ECFDF5', color: '#059669',
                      fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <Plus style={{ width: 12, height: 12 }} />
                    Crear Asignatura
                  </button>
                </div>
              )}

              {/* Inline custom asignatura creation form */}
              <AnimatePresence>
                {showCreateCustom && isRealPrograma && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden', marginBottom: 10 }}
                  >
                    <div style={{
                      padding: 14, borderRadius: 10,
                      background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)',
                      border: '1px solid #A7F3D0',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <h5 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#065F46' }}>
                          Crear Asignatura Personalizada
                        </h5>
                        <button onClick={() => setShowCreateCustom(false)} style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                        }}>
                          <X style={{ width: 16, height: 16, color: '#6B7280' }} />
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={{ fontSize: '0.72rem', fontWeight: 600, display: 'block', marginBottom: 2, color: '#374151' }}>
                            Nombre de la Asignatura *
                          </label>
                          <input
                            type="text"
                            value={customNombre}
                            onChange={e => setCustomNombre(e.target.value)}
                            placeholder="Ej: Gerencia Pública Avanzada"
                            style={{
                              width: '100%', padding: '7px 10px', borderRadius: 6,
                              border: '1px solid #D1D5DB', fontSize: '0.82rem',
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 600, display: 'block', marginBottom: 2, color: '#374151' }}>
                            Núcleo Temático
                          </label>
                          <input
                            type="text"
                            value={customNucleo}
                            onChange={e => setCustomNucleo(e.target.value)}
                            placeholder="Ej: Gestión Pública"
                            style={{
                              width: '100%', padding: '7px 10px', borderRadius: 6,
                              border: '1px solid #D1D5DB', fontSize: '0.82rem',
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.72rem', fontWeight: 600, display: 'block', marginBottom: 2, color: '#374151' }}>
                              Créditos
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={customCreditos}
                              onChange={e => setCustomCreditos(Number(e.target.value))}
                              style={{
                                width: '100%', padding: '7px 10px', borderRadius: 6,
                                border: '1px solid #D1D5DB', fontSize: '0.82rem',
                              }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.72rem', fontWeight: 600, display: 'block', marginBottom: 2, color: '#374151' }}>
                              Semestre
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={12}
                              value={customSemestre}
                              onChange={e => setCustomSemestre(Number(e.target.value))}
                              style={{
                                width: '100%', padding: '7px 10px', borderRadius: 6,
                                border: '1px solid #D1D5DB', fontSize: '0.82rem',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 10 }}>
                        <button
                          onClick={() => setShowCreateCustom(false)}
                          style={{
                            padding: '6px 12px', borderRadius: 6, border: '1px solid #D1D5DB',
                            background: 'white', fontSize: '0.78rem', cursor: 'pointer',
                          }}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleCreateCustomAsignatura}
                          disabled={!customNombre.trim() || savingCustom}
                          style={{
                            padding: '6px 14px', borderRadius: 6, border: 'none',
                            background: customNombre.trim() && !savingCustom ? '#059669' : '#D1D5DB',
                            color: 'white', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4,
                          }}
                        >
                          {savingCustom ? (
                            <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />
                          ) : (
                            <Plus style={{ width: 14, height: 14 }} />
                          )}
                          Crear y Guardar en KV
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {asignaturasCatalogo.length > 0 && (
                <div style={{
                  maxHeight: 250, overflow: 'auto', borderRadius: 8,
                  border: '1px solid #E5E7EB', background: 'white',
                }}>
                  {asignaturasCatalogo.map((asig: any) => (
                    <label
                      key={asig.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                        borderBottom: '1px solid #F3F4F6', cursor: 'pointer',
                        background: selectedAsignaturas.has(asig.id) ? '#EFF6FF'
                          : asig.source === 'custom' ? '#F0FDF410' : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAsignaturas.has(asig.id)}
                        onChange={e => {
                          const newSet = new Set(selectedAsignaturas);
                          if (e.target.checked) newSet.add(asig.id);
                          else newSet.delete(asig.id);
                          setSelectedAsignaturas(newSet);
                        }}
                        style={{ accentColor: '#003DA5' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '0.83rem', fontWeight: 600, color: '#111827' }}>{asig.nombre}</span>
                          {asig.source === 'custom' && (
                            <span style={{
                              padding: '0px 5px', borderRadius: 4, background: '#D1FAE5',
                              color: '#065F46', fontSize: '0.62rem', fontWeight: 700,
                            }}>
                              PROPIA
                            </span>
                          )}
                          {asig.source === 'heuristic' && (
                            <span style={{
                              padding: '0px 5px', borderRadius: 4, background: '#FEF3C7',
                              color: '#92400E', fontSize: '0.62rem', fontWeight: 700,
                            }}>
                              MAPEADA
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                          {asig.nucleo} | {asig.creditos} creditos | Sem. {asig.semestre}
                          {asig.programa_origen && (
                            <span style={{ color: '#9CA3AF' }}> (origen: {asig.programa_origen})</span>
                          )}
                        </div>
                      </div>
                      {asig.source === 'custom' && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteCustomAsignatura(asig.id); }}
                          title="Eliminar asignatura personalizada"
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 3,
                            borderRadius: 4, flexShrink: 0,
                          }}
                        >
                          <Trash2 style={{ width: 13, height: 13, color: '#DC2626' }} />
                        </button>
                      )}
                    </label>
                  ))}
                </div>
              )}

              {/* Empty state for no asignaturas */}
              {asignaturasCatalogo.length === 0 && newOfertaPrograma && (
                <div style={{
                  padding: 24, textAlign: 'center', borderRadius: 8,
                  border: '2px dashed #D1D5DB', background: '#F9FAFB',
                }}>
                  <BookOpen style={{ width: 28, height: 28, margin: '0 auto 8px', color: '#9CA3AF', opacity: 0.5 }} />
                  <p style={{ fontSize: '0.85rem', color: '#6B7280', marginBottom: 6 }}>
                    No hay asignaturas para este programa
                  </p>
                  {isRealPrograma && (
                    <button
                      onClick={() => setShowCreateCustom(true)}
                      style={{
                        padding: '6px 14px', borderRadius: 8, border: 'none',
                        background: '#059669', color: 'white', fontSize: '0.8rem',
                        fontWeight: 600, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <Plus style={{ width: 14, height: 14 }} />
                      Crear Primera Asignatura
                    </button>
                  )}
                </div>
              )}

              {selectedAsignaturas.size > 0 && (
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    onClick={() => setSelectedAsignaturas(new Set())}
                    style={{
                      padding: '8px 14px', borderRadius: 8, border: '1px solid #D1D5DB',
                      background: 'white', fontSize: '0.82rem', cursor: 'pointer',
                    }}
                  >
                    Limpiar
                  </button>
                  <button
                    onClick={onAdd}
                    style={{
                      padding: '8px 18px', borderRadius: 8, border: 'none',
                      background: '#003DA5', color: 'white', fontSize: '0.82rem',
                      fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Agregar {selectedAsignaturas.size} asignaturas
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div style={{
        borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden', background: 'white',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>#</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Asignatura</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Programa</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>Grupo</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>Cred.</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>Horas</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Horario</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>Modalidad</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Docente</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#374151' }}></th>
              </tr>
            </thead>
            <tbody>
              {oferta.map((item: OfertaItem, idx: number) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: '1px solid #F3F4F6',
                    background: item.docente_asignado_id ? '#F0FDF4' : (idx % 2 === 0 ? 'white' : '#FAFAFA'),
                  }}
                >
                  <td style={{ padding: '8px 12px', color: '#9CA3AF', fontSize: '0.78rem' }}>{idx + 1}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#111827', maxWidth: 200 }}>
                    {item.asignatura_nombre}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#6B7280', fontSize: '0.78rem' }}>
                    {item.programa_nombre}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <select
                      value={item.grupo}
                      onChange={e => onUpdate(item.id, 'grupo', e.target.value)}
                      style={{
                        padding: '3px 6px', borderRadius: 6, border: '1px solid #E5E7EB',
                        fontSize: '0.78rem', width: 55, textAlign: 'center',
                      }}
                    >
                      {GRUPOS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>
                    {item.creditos}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#003DA5' }}>
                    {item.horas}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <select
                      value={item.horario}
                      onChange={e => onUpdate(item.id, 'horario', e.target.value)}
                      style={{
                        padding: '3px 6px', borderRadius: 6, border: '1px solid #E5E7EB',
                        fontSize: '0.75rem', width: 150,
                      }}
                    >
                      {HORARIOS_OPCIONES.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <select
                      value={item.modalidad}
                      onChange={e => onUpdate(item.id, 'modalidad', e.target.value)}
                      style={{
                        padding: '3px 6px', borderRadius: 6, border: '1px solid #E5E7EB',
                        fontSize: '0.75rem', width: 90,
                      }}
                    >
                      {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {item.docente_asignado_nombre ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 8px', borderRadius: 6,
                        background: '#D1FAE5', color: '#065F46',
                        fontSize: '0.75rem', fontWeight: 600,
                      }}>
                        <CheckCircle2 style={{ width: 12, height: 12 }} />
                        {item.docente_asignado_nombre}
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '0.75rem', color: '#D97706', fontWeight: 500,
                        fontStyle: 'italic',
                      }}>
                        Sin asignar
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <button
                      onClick={() => onRemove(item.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: 4, borderRadius: 4,
                      }}
                    >
                      <Trash2 style={{ width: 14, height: 14, color: '#DC2626' }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {oferta.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
            <BookOpen style={{ width: 32, height: 32, margin: '0 auto 8px', opacity: 0.4 }} />
            <p style={{ fontSize: '0.9rem' }}>No hay asignaturas en la oferta. Agregue asignaturas para comenzar.</p>
          </div>
        )}
      </div>

      {/* Programas source info banner */}
      {programas.filter((p: any) => p.source === 'programas-academicos').length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginTop: 12,
          padding: '8px 14px', borderRadius: 8,
          background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
          border: '1px solid #A7F3D0', fontSize: '0.78rem', color: '#065F46',
          flexWrap: 'wrap',
        }}>
          <Building2 style={{ width: 14, height: 14, flexShrink: 0 }} />
          <span>
            <strong>{programas.filter((p: any) => p.source === 'programas-academicos').length}</strong> programas
            vinculados desde <strong>Programas Académicos</strong> (KV)
          </span>
          {syncInfo && syncInfo.programas && (
            <span style={{ color: '#047857', fontSize: '0.72rem' }}>
              | {syncInfo.programas.filter((p: any) => p.asignaturas_custom > 0).length} con asignaturas propias
            </span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            {lastSyncTime && (
              <span style={{ fontSize: '0.68rem', color: '#6B7280' }}>
                Sync: {new Date(lastSyncTime).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <span style={{
              padding: '2px 8px', borderRadius: 12,
              background: '#059669', color: 'white', fontWeight: 700, fontSize: '0.68rem',
            }}>
              Conectado
            </span>
          </div>
        </div>
      )}

      {/* Summary */}
      <div style={{
        display: 'flex', gap: 16, marginTop: 10, padding: '12px 16px',
        borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB',
        fontSize: '0.82rem', color: '#6B7280', flexWrap: 'wrap', alignItems: 'center',
      }}>
        <span><strong>{oferta.length}</strong> asignaturas en oferta</span>
        <span>|</span>
        <span><strong>{oferta.reduce((s: number, o: OfertaItem) => s + o.horas, 0).toLocaleString()}</strong> horas totales</span>
        <span>|</span>
        <span><strong>{oferta.reduce((s: number, o: OfertaItem) => s + o.creditos, 0)}</strong> creditos</span>
        <span>|</span>
        <span style={{ color: oferta.filter((o: OfertaItem) => !o.docente_asignado_id).length > 0 ? '#D97706' : '#059669', fontWeight: 600 }}>
          {oferta.filter((o: OfertaItem) => !o.docente_asignado_id).length} sin asignar
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: '#059669', fontSize: '0.72rem' }}>
          <Save style={{ width: 12, height: 12 }} />
          Auto-guardado en KV
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Sub-component: Asignacion Docentes Tab
// ═══════════════════════════════════════════════════════════════════════

function AsignacionDocentesTab({
  docentes, ofertaDisponible, allOferta, territoriales,
  filtroTerritorial, setFiltroTerritorial, docenteSearch, setDocenteSearch,
  selectedDocente, setSelectedDocente, onAsignar, onDesasignar,
  onAsignarInvestigacion,
}: any) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [showInvModal, setShowInvModal] = useState<number | null>(null);
  const [invProyecto, setInvProyecto] = useState('');
  const [invRol, setInvRol] = useState('');
  const [invHoras, setInvHoras] = useState(200);

  return (
    <div>
      {/* Filters */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ width: 14, height: 14, color: '#9CA3AF', position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Buscar docente por nombre o cedula..."
            value={docenteSearch}
            onChange={e => setDocenteSearch(e.target.value)}
            style={{
              padding: '8px 12px 8px 32px', borderRadius: 8, border: '1px solid #E5E7EB',
              fontSize: '0.82rem', width: 280, outline: 'none',
            }}
          />
        </div>
        <select
          value={filtroTerritorial}
          onChange={e => setFiltroTerritorial(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB',
            fontSize: '0.82rem', color: '#374151', cursor: 'pointer',
          }}
        >
          <option value="">Todas las territoriales</option>
          {territoriales.map((t: any) => (
            <option key={t.id} value={t.id}>{t.nombre}</option>
          ))}
        </select>
      </div>

      {/* Docentes List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {docentes.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
            <Users style={{ width: 32, height: 32, margin: '0 auto 8px', opacity: 0.4 }} />
            <p style={{ fontSize: '0.9rem' }}>No se encontraron docentes disponibles para el periodo.</p>
            <p style={{ fontSize: '0.78rem' }}>Verifique que existan docentes registrados en el sistema.</p>
          </div>
        )}

        {docentes.map((doc: AsignacionDocente, idx: number) => {
          const isExpanded = expandedIdx === idx;
          const pctColor = doc.porcentaje >= 100 ? '#059669' : doc.porcentaje >= 50 ? '#D97706' : '#DC2626';

          return (
            <motion.div
              key={doc.docente_id}
              layout
              style={{
                borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden',
                background: isExpanded ? '#FAFBFF' : 'white',
              }}
            >
              {/* Docente Header */}
              <div
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', cursor: 'pointer',
                  borderBottom: isExpanded ? '1px solid #E5E7EB' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: '#EFF6FF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, color: '#003DA5', fontSize: '0.85rem',
                  }}>
                    {doc.docente_nombre.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>{doc.docente_nombre}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                      CC {doc.cedula || 'N/A'} | {doc.dedicacion} | {doc.horas_programables}h programables
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Progress bar */}
                  <div style={{ width: 120, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      flex: 1, height: 6, borderRadius: 10, background: '#E5E7EB', overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${Math.min(doc.porcentaje, 100)}%`, height: '100%',
                        borderRadius: 10, background: pctColor,
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: pctColor, minWidth: 36 }}>
                      {doc.porcentaje}%
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 600,
                    color: doc.asignaturas_asignadas.length > 0 ? '#059669' : '#9CA3AF',
                  }}>
                    {doc.asignaturas_asignadas.length} asig.
                  </span>
                  <ChevronDown style={{
                    width: 16, height: 16, color: '#9CA3AF',
                    transform: isExpanded ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }} />
                </div>
              </div>

              {/* Expanded Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ padding: 16 }}>
                      {/* Summary bar */}
                      <div style={{
                        display: 'flex', gap: 20, marginBottom: 16, padding: '10px 14px',
                        borderRadius: 8, background: '#F3F4F6', fontSize: '0.8rem',
                        flexWrap: 'wrap',
                      }}>
                        <span>Docencia: <strong>{doc.asignaturas_asignadas.reduce((s: number, a: any) => s + a.horas, 0)}h</strong> ({Math.round(doc.asignaturas_asignadas.reduce((s: number, a: any) => s + a.horas, 0) / doc.horas_programables * 100)}%)</span>
                        <span>Investigacion: <strong>{doc.investigacion?.horas || 0}h</strong> ({Math.round((doc.investigacion?.horas || 0) / doc.horas_programables * 100)}%)</span>
                        <span>Extension: <strong>{doc.extension.reduce((s: number, a: any) => s + a.horas, 0)}h</strong></span>
                        <span style={{ fontWeight: 700, color: pctColor }}>
                          Total: {doc.total_precargado}h / {doc.horas_programables}h
                        </span>
                        <span style={{ color: '#D97706' }}>
                          Pendiente: {doc.horas_pendientes}h
                        </span>
                      </div>

                      {/* Dual list: Available ↔ Assigned */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, marginBottom: 16 }}>
                        {/* Available */}
                        <div>
                          <h5 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                            Asignaturas disponibles
                          </h5>
                          <div style={{
                            maxHeight: 220, overflow: 'auto', borderRadius: 8,
                            border: '1px solid #E5E7EB', background: 'white',
                          }}>
                            {ofertaDisponible.length === 0 ? (
                              <div style={{ padding: 20, textAlign: 'center', color: '#9CA3AF', fontSize: '0.78rem' }}>
                                Todas las asignaturas estan asignadas
                              </div>
                            ) : (
                              ofertaDisponible.map((of: OfertaItem) => (
                                <div
                                  key={of.id}
                                  style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '8px 12px', borderBottom: '1px solid #F3F4F6',
                                  }}
                                >
                                  <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827' }}>
                                      {of.asignatura_nombre}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#6B7280' }}>
                                      {of.programa_nombre} - {of.grupo} | {of.creditos} cred | {of.horas}h
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => onAsignar(idx, of.id)}
                                    style={{
                                      background: '#003DA5', border: 'none', borderRadius: 6,
                                      padding: '4px 8px', cursor: 'pointer', display: 'flex',
                                    }}
                                  >
                                    <ArrowRight style={{ width: 14, height: 14, color: 'white' }} />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Arrow indicator */}
                        <div style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center',
                          justifyContent: 'center', gap: 8, color: '#9CA3AF',
                        }}>
                          <ArrowRight style={{ width: 20, height: 20 }} />
                          <ArrowLeft style={{ width: 20, height: 20 }} />
                        </div>

                        {/* Assigned */}
                        <div>
                          <h5 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                            Asignaturas asignadas
                          </h5>
                          <div style={{
                            maxHeight: 220, overflow: 'auto', borderRadius: 8,
                            border: '1px solid #D1FAE5', background: '#F0FDF4',
                          }}>
                            {doc.asignaturas_asignadas.length === 0 ? (
                              <div style={{ padding: 20, textAlign: 'center', color: '#9CA3AF', fontSize: '0.78rem' }}>
                                Sin asignaturas asignadas
                              </div>
                            ) : (
                              doc.asignaturas_asignadas.map((as: any) => (
                                <div
                                  key={as.oferta_id}
                                  style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '8px 12px', borderBottom: '1px solid #A7F3D0',
                                  }}
                                >
                                  <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#065F46' }}>
                                      {as.nombre}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#047857' }}>
                                      {as.programa} | {as.horas}h
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => onDesasignar(idx, as.oferta_id)}
                                    style={{
                                      background: '#DC2626', border: 'none', borderRadius: 6,
                                      padding: '4px 8px', cursor: 'pointer', display: 'flex',
                                    }}
                                  >
                                    <X style={{ width: 14, height: 14, color: 'white' }} />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Investigacion & Extension */}
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {/* Investigacion */}
                        <div style={{
                          flex: 1, minWidth: 250, padding: 12, borderRadius: 8,
                          border: '1px solid #E5E7EB', background: 'white',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <h6 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <FlaskConical style={{ width: 14, height: 14 }} />
                              Investigacion
                            </h6>
                            {!doc.investigacion && (
                              <button
                                onClick={() => setShowInvModal(idx)}
                                style={{
                                  padding: '4px 10px', borderRadius: 6, border: '1px solid #7C3AED',
                                  background: '#FAF5FF', color: '#7C3AED', fontSize: '0.72rem',
                                  fontWeight: 600, cursor: 'pointer',
                                }}
                              >
                                + Asignar
                              </button>
                            )}
                          </div>
                          {doc.investigacion ? (
                            <div style={{
                              padding: '8px 10px', borderRadius: 6, background: '#F3E8FF',
                              border: '1px solid #DDD6FE', fontSize: '0.78rem',
                            }}>
                              <div style={{ fontWeight: 600, color: '#6B21A8' }}>{doc.investigacion.proyecto}</div>
                              <div style={{ color: '#7C3AED', fontSize: '0.72rem' }}>
                                Rol: {doc.investigacion.rol} | {doc.investigacion.horas}h ({Math.round(doc.investigacion.horas / doc.horas_programables * 100)}%)
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: '#9CA3AF', fontStyle: 'italic' }}>
                              Sin proyecto de investigacion asignado
                            </div>
                          )}
                        </div>

                        {/* Extension */}
                        <div style={{
                          flex: 1, minWidth: 250, padding: 12, borderRadius: 8,
                          border: '1px solid #E5E7EB', background: 'white',
                        }}>
                          <h6 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Globe style={{ width: 14, height: 14 }} />
                            Extension
                          </h6>
                          <div style={{ fontSize: '0.75rem', color: '#9CA3AF', fontStyle: 'italic', marginTop: 6 }}>
                            Sin asignacion (el docente completara en su portal)
                          </div>
                        </div>
                      </div>

                      {/* Summary box */}
                      <div style={{
                        marginTop: 12, padding: '10px 14px', borderRadius: 8,
                        background: doc.porcentaje >= 80 ? '#ECFDF5' : '#FEF3C7',
                        border: `1px solid ${doc.porcentaje >= 80 ? '#6EE7B7' : '#FDE68A'}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        flexWrap: 'wrap', gap: 8,
                      }}>
                        <div style={{ fontSize: '0.82rem' }}>
                          <strong>Resumen Pre-carga:</strong>{' '}
                          Docencia: {doc.asignaturas_asignadas.reduce((s: number, a: any) => s + a.horas, 0)}h ({Math.round(doc.asignaturas_asignadas.reduce((s: number, a: any) => s + a.horas, 0) / doc.horas_programables * 100)}%) |{' '}
                          Investigacion: {doc.investigacion?.horas || 0}h ({Math.round((doc.investigacion?.horas || 0) / doc.horas_programables * 100)}%) |{' '}
                          <strong>Total: {doc.total_precargado}h ({doc.porcentaje}%)</strong>
                        </div>
                        <span style={{
                          fontSize: '0.78rem', fontWeight: 700,
                          color: doc.horas_pendientes > 0 ? '#D97706' : '#059669',
                        }}>
                          {doc.horas_pendientes > 0
                            ? `${doc.horas_pendientes}h pendientes para docente`
                            : 'Carga completa'
                          }
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Investigacion Modal */}
              {showInvModal === idx && (
                <div style={{
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }}
                  onClick={() => setShowInvModal(null)}
                >
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{
                      background: 'white', borderRadius: 14, padding: 24,
                      width: '90%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                    }}
                  >
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, color: '#111827' }}>
                      Asignar Investigacion - {doc.docente_nombre}
                    </h4>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Proyecto SNI</label>
                      <select
                        value={invProyecto}
                        onChange={e => setInvProyecto(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.85rem' }}
                      >
                        <option value="">Seleccionar proyecto...</option>
                        {PROYECTOS_INVESTIGACION.map(p => (
                          <option key={p.id} value={p.nombre}>{p.nombre} ({p.area})</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Rol</label>
                      <select
                        value={invRol}
                        onChange={e => setInvRol(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.85rem' }}
                      >
                        <option value="">Seleccionar rol...</option>
                        {ROLES_INVESTIGACION.map(r => (
                          <option key={r.id} value={r.nombre}>{r.nombre} (max {r.max_porcentaje}%)</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                        Horas: <strong>{invHoras}</strong> ({Math.round(invHoras / doc.horas_programables * 100)}%)
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={doc.horas_programables * 0.5}
                        step={8}
                        value={invHoras}
                        onChange={e => setInvHoras(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#7C3AED' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#9CA3AF' }}>
                        <span>0h</span>
                        <span>Max: {doc.horas_programables * 0.5}h (50%)</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button
                        onClick={() => setShowInvModal(null)}
                        style={{
                          padding: '8px 16px', borderRadius: 8, border: '1px solid #D1D5DB',
                          background: 'white', fontSize: '0.82rem', cursor: 'pointer',
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => {
                          if (invProyecto && invRol) {
                            onAsignarInvestigacion(idx, invProyecto, invRol, invHoras);
                            setShowInvModal(null);
                            setInvProyecto('');
                            setInvRol('');
                            setInvHoras(200);
                            toast.success('Investigacion asignada');
                          }
                        }}
                        disabled={!invProyecto || !invRol}
                        style={{
                          padding: '8px 18px', borderRadius: 8, border: 'none',
                          background: invProyecto && invRol ? '#7C3AED' : '#D1D5DB',
                          color: 'white', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Asignar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Sub-component: Pre-carga PTAs Tab
// ═══════════════════════════════════════════════════════════════════════

function PreCargaPTAsTab({
  asignaciones, ptasGenerados, generando, notificando,
  onGenerar, onNotificar, periodo,
}: any) {
  const docentesConCarga = asignaciones.filter((a: AsignacionDocente) => a.asignaturas_asignadas.length > 0 || a.investigacion);
  const totalHorasPreCargadas = docentesConCarga.reduce((s: number, a: AsignacionDocente) => s + a.total_precargado, 0);
  const promedioCobertura = docentesConCarga.length > 0
    ? Math.round(docentesConCarga.reduce((s: number, a: AsignacionDocente) => s + a.porcentaje, 0) / docentesConCarga.length)
    : 0;

  return (
    <div>
      {/* Overview */}
      <div style={{
        padding: 20, borderRadius: 12, marginBottom: 20,
        background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)',
        border: '1px solid #BFDBFE',
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ListChecks style={{ width: 22, height: 22, color: '#003DA5' }} />
          Resumen de Pre-carga - Periodo {periodo}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'white', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#003DA5' }}>{docentesConCarga.length}</div>
            <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>Docentes con carga asignada</div>
          </div>
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'white', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>{totalHorasPreCargadas.toLocaleString()}</div>
            <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>Horas pre-cargadas</div>
          </div>
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'white', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#7C3AED' }}>{promedioCobertura}%</div>
            <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>Cobertura promedio PTA</div>
          </div>
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'white', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#D97706' }}>
              {docentesConCarga.reduce((s: number, a: AsignacionDocente) => s + a.horas_pendientes, 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>Horas pendientes (docentes)</div>
          </div>
        </div>
      </div>

      {/* Table of docentes to generate */}
      <div style={{
        borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden',
        background: 'white', marginBottom: 16,
      }}>
        <div style={{
          padding: '12px 16px', background: '#F9FAFB',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>
            Docentes con Pre-carga Lista
          </h4>
          <span style={{
            padding: '3px 10px', borderRadius: 20, background: '#D1FAE5',
            color: '#065F46', fontSize: '0.75rem', fontWeight: 600,
          }}>
            {docentesConCarga.length} docentes
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Docente</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>Dedicacion</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>Asignaturas</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>Inv.</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>Pre-cargado</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>%</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>Pendiente</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {docentesConCarga.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 30, textAlign: 'center', color: '#9CA3AF' }}>
                    No hay docentes con carga asignada. Vaya a la pestana "Asignacion Docentes" para asignar.
                  </td>
                </tr>
              ) : (
                docentesConCarga.map((doc: AsignacionDocente, idx: number) => (
                  <tr key={doc.docente_id} style={{ borderBottom: '1px solid #F3F4F6', background: idx % 2 === 0 ? 'white' : '#FAFAFA' }}>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{doc.docente_nombre}</div>
                      <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>CC {doc.cedula || 'N/A'}</div>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: '0.78rem' }}>
                      {doc.dedicacion === 'Medio Tiempo' ? 'MT' : 'TC'}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>
                      {doc.asignaturas_asignadas.length}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      {doc.investigacion ? (
                        <span style={{
                          padding: '2px 6px', borderRadius: 4, background: '#F3E8FF',
                          color: '#7C3AED', fontSize: '0.72rem', fontWeight: 600,
                        }}>
                          {doc.investigacion.horas}h
                        </span>
                      ) : (
                        <span style={{ color: '#D1D5DB' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#003DA5' }}>
                      {doc.total_precargado}h
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span style={{
                        fontWeight: 700,
                        color: doc.porcentaje >= 80 ? '#059669' : doc.porcentaje >= 50 ? '#D97706' : '#DC2626',
                      }}>
                        {doc.porcentaje}%
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: '#D97706', fontWeight: 600 }}>
                      {doc.horas_pendientes}h
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      {ptasGenerados.some((p: any) => p.docente_id === doc.docente_id) ? (
                        <span style={{
                          padding: '3px 8px', borderRadius: 6, background: '#D1FAE5',
                          color: '#065F46', fontSize: '0.72rem', fontWeight: 600,
                        }}>
                          Generado
                        </span>
                      ) : (
                        <span style={{
                          padding: '3px 8px', borderRadius: 6, background: '#FEF3C7',
                          color: '#92400E', fontSize: '0.72rem', fontWeight: 600,
                        }}>
                          Pendiente
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap',
        padding: '16px 0', borderTop: '1px solid #E5E7EB',
      }}>
        <button
          onClick={onGenerar}
          disabled={generando || docentesConCarga.length === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px',
            borderRadius: 10, border: 'none', fontSize: '0.9rem', fontWeight: 700,
            cursor: generando || docentesConCarga.length === 0 ? 'not-allowed' : 'pointer',
            background: generando || docentesConCarga.length === 0 ? '#D1D5DB' : '#003DA5',
            color: 'white',
          }}
        >
          {generando ? (
            <Loader2 className="animate-spin" style={{ width: 18, height: 18 }} />
          ) : (
            <FileText style={{ width: 18, height: 18 }} />
          )}
          {generando ? 'Generando PTAs...' : `Generar ${docentesConCarga.length} PTAs Pre-cargados`}
        </button>

        <button
          onClick={onNotificar}
          disabled={notificando || ptasGenerados.length === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px',
            borderRadius: 10, border: 'none', fontSize: '0.9rem', fontWeight: 700,
            cursor: notificando || ptasGenerados.length === 0 ? 'not-allowed' : 'pointer',
            background: notificando || ptasGenerados.length === 0 ? '#D1D5DB' : '#059669',
            color: 'white',
          }}
        >
          {notificando ? (
            <Loader2 className="animate-spin" style={{ width: 18, height: 18 }} />
          ) : (
            <Bell style={{ width: 18, height: 18 }} />
          )}
          {notificando ? 'Notificando...' : `Notificar ${ptasGenerados.length || docentesConCarga.length} Docentes`}
        </button>
      </div>

      {/* Warning note */}
      <div style={{
        padding: '12px 16px', borderRadius: 10, background: '#FEF3C7',
        border: '1px solid #FDE68A', display: 'flex', gap: 10, alignItems: 'flex-start',
        fontSize: '0.8rem', color: '#92400E',
      }}>
        <AlertTriangle style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong>Nota importante:</strong> Al generar PTAs pre-cargados, cada docente recibira una propuesta institucional
          con estado <strong>PROPUESTO_POR_DIRECCION</strong>. Los docentes podran aceptar, modificar u objetar la propuesta
          desde su portal. Las horas marcadas como "pendientes" deberan ser completadas por el docente con actividades complementarias.
        </div>
      </div>
    </div>
  );
}
