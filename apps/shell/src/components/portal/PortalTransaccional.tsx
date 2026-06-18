/**
 * Portal Transaccional - Vista principal del usuario autenticado (Legacy PTA)
 *
 * Migrado desde `PlataformaDeGestion-PTA-mergue_full` para que el layout académico
 * quede igual al portal original.
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useIsMobile } from '../ui/use-mobile';
import {
  Search,
  Mail,
  Phone,
  MapPin,
  Building2,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Target,
  ExternalLink,
  Grid3X3,
  List,
  AlertTriangle,
  Info,
  FileText,
  Shield,
  Users,
  FolderOpen,
  Sparkles,
  Camera,
  ArrowUpRight,
  Calendar,
  Briefcase,
  Activity,
  FileSignature,
  Settings,
  ChevronLeft,
  ChevronDown,
  Download,
  Eye,
  Plus,
  Zap,
  XCircle,
  GripVertical,
} from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { motion, AnimatePresence } from 'motion/react';
import { colors, radius } from '../esap/shared/designTokens';
import { CardSkeleton, EmptyStateIllustration } from '../ui/CardSkeleton';
import { PerfilUsuarioEditable } from './PerfilUsuarioEditable';
import { getEstadisticasPortal, inicializarDatosPortal, uploadFotoPerfil, getPerfilPortal } from './portalApi';
import { MisCertificadosLaborales } from './recursos-humanos/MisCertificadosLaborales';
import { MisDocumentos } from './gestion-documental/MisDocumentos';
import { PortalDocentePTA } from './pta/PortalDocentePTA';
import { MisAuditoriasControlInterno } from './control-interno/MisAuditoriasControlInterno';
import { toast } from 'sonner';
import { PortalSettings } from './PortalSettings';
import { AyudaView } from './AyudaView';

interface PortalTransaccionalProps {
  userName: string;
  userEmail: string;
  userPersonId: string;
  activeRole: string;
  activeRoleCode?: string;
  userPermissions?: string[];
  adminData?: {
    area?: string;
    cargo?: string;
    dependencia?: string;
    codigo_empleado?: string;
    solicitudes_pendientes?: number;
    reportes_generados?: number;
  };
  onLogout?: () => void;
  navbarNavigateTo?: string | null;
}

interface Servicio {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  categoria: string;
  badges: { label: string; color: string; bgColor: string }[];
  prioridad?: string;
  prioridadColor?: string;
  /** Roles del portal que pueden ver este servicio (fallback si no hay permiso). */
  visiblePara?: string[];
  /** Permiso requerido para ver este servicio. Tiene prioridad sobre visiblePara. */
  requierePermiso?: string;
}

type InternalView =
  | { type: 'dashboard' }
  | { type: 'mi-perfil' }
  | { type: 'certificado-laboral' }
  | { type: 'gestion-documental' }
  | { type: 'carpeta-digital' }
  | { type: 'pta' }
  | { type: 'mis-auditorias' }
  | { type: 'configuracion' }
  | { type: 'ayuda' };

const CATEGORIAS = ['Todos', 'Recursos Humanos', 'Carpeta Digital', 'Académico', 'Control Interno'];

function SkeletonPulse({
  width,
  height,
  borderRadius = 6,
  style,
}: {
  width: number | string;
  height: number | string;
  borderRadius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite ease-in-out',
        ...style,
      }}
    />
  );
}

const shimmerStyleId = 'portal-shimmer-style';

const DND_ITEM_TYPE = 'PORTAL_SERVICE';

const normalizeRoleCode = (role?: string | null) =>
  String(role || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');

const roleCodeMatches = (roleCode: string, allowedRoles?: string[]) => {
  if (!allowedRoles?.length) return false;
  const normalizedRole = normalizeRoleCode(roleCode);
  return allowedRoles.some((allowedRole) => normalizeRoleCode(allowedRole) === normalizedRole);
};

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const updated = [...items];
  const [moved] = updated.splice(fromIndex, 1);
  updated.splice(toIndex, 0, moved);
  return updated;
}

function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function formatNumber(n: number): string {
  try {
    return new Intl.NumberFormat('es-CO').format(n);
  } catch {
    return String(n);
  }
}

export function PortalTransaccional({
  userName,
  userEmail,
  userPersonId,
  activeRole,
  activeRoleCode,
  userPermissions,
  adminData,
  onLogout,
  navbarNavigateTo,
}: PortalTransaccionalProps) {
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [vistaGrid, setVistaGrid] = useState<'grid' | 'list'>('grid');
  const [currentView, setCurrentView] = useState<InternalView>({ type: 'dashboard' });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const [windowWidth, setWindowWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280));

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isTablet = windowWidth >= 640 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;
  const isLargeDesktop = windowWidth >= 1280;
  const isXLDesktop = windowWidth >= 1536;

  useEffect(() => {
    if (!document.getElementById(shimmerStyleId)) {
      const style = document.createElement('style');
      style.id = shimmerStyleId;
      style.textContent = `
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes progressPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    if (!navbarNavigateTo) return;
    const section = navbarNavigateTo.split('::')[0];
    const viewMap: Record<string, InternalView> = {
      dashboard: { type: 'dashboard' },
      inicio: { type: 'dashboard' },
      'mi-perfil': { type: 'mi-perfil' },
      'certificado-laboral': { type: 'certificado-laboral' },
      'carpeta-digital': { type: 'carpeta-digital' },
      configuracion: { type: 'configuracion' },
      ayuda: { type: 'ayuda' },
      pta: { type: 'pta' },
      'mis-auditorias': { type: 'mis-auditorias' },
      'control-interno': { type: 'mis-auditorias' },
      'control-interno-gestion': { type: 'mis-auditorias' },
    };
    const target = viewMap[section];
    if (target) {
      setCurrentView(target);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [navbarNavigateTo]);

  const [statsData, setStatsData] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const initRef = useRef(false);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [isContactInfoOpen, setIsContactInfoOpen] = useState(false);
  const [ptaVista, setPtaVista] = useState<string>('v01_dashboard');

  useEffect(() => {
    const handlePTAViewChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.vista) {
        setPtaVista(customEvent.detail.vista);
      }
    };
    const handleGeneralViewChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.view) {
        setCurrentView({ type: customEvent.detail.view });
      }
    };
    window.addEventListener('pta-view-change', handlePTAViewChange);
    window.addEventListener('portal-view-change', handleGeneralViewChange);
    return () => {
      window.removeEventListener('pta-view-change', handlePTAViewChange);
      window.removeEventListener('portal-view-change', handleGeneralViewChange);
    };
  }, []);

  useEffect(() => {
    setIsContactInfoOpen(currentView.type === 'dashboard');
  }, [currentView.type]);

  useEffect(() => {
    if (!userPersonId || initRef.current) return;
    initRef.current = true;

    async function loadPortalData() {
      try {
        await inicializarDatosPortal(userPersonId);
        const [statsRes, perfilRes] = await Promise.all([
          getEstadisticasPortal(userPersonId),
          getPerfilPortal(userPersonId).catch(() => null),
        ]);
        if (statsRes?.success) setStatsData(statsRes.data);
        if (perfilRes?.data?.perfil?.fotoUrl) setFotoUrl(perfilRes.data.perfil.fotoUrl);
      } catch (err) {
        console.error('[Portal] Error cargando datos:', err);
      } finally {
        setStatsLoading(false);
      }
    }

    loadPortalData();
  }, [userPersonId]);

  useEffect(() => {
    if (currentView.type === 'dashboard' && userPersonId && !statsLoading) {
      getEstadisticasPortal(userPersonId)
        .then((res) => {
          if (res?.success) setStatsData(res.data);
        })
        .catch((err) => console.error('[Portal] Error recargando stats:', err));
    }
  }, [currentView.type]);

  const handleFotoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadingFoto(true);
      try {
        const res = await uploadFotoPerfil(file, userPersonId);
        if (!res?.data?.url) throw new Error('No se recibió la URL de la foto');
        setFotoUrl(res.data.url);
        toast.success('Foto de perfil actualizada');
      } catch (err) {
        console.error('[Portal] Error subiendo foto:', err);
        toast.error('Error al subir la foto');
      } finally {
        setUploadingFoto(false);
      }
    },
    [userPersonId],
  );

  const triggerFotoPicker = useCallback(() => {
    if (uploadingFoto) return;
    const el = fotoInputRef.current;
    if (!el) return;
    try {
      el.value = '';
    } catch {
      // ignore
    }
    el.click();
  }, [uploadingFoto]);

  const iniciales = (userName || 'Usuario')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const todayFormatted = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleServiceClick = (servicioId: string) => {
    if (servicioId === 'cert-laboral') {
      setCurrentView({ type: 'certificado-laboral' });
    } else if (servicioId === 'gesdoc') {
      setCurrentView({ type: 'carpeta-digital' });
    } else if (servicioId === 'pta-docente') {
      setCurrentView({ type: 'pta' });
    } else if (servicioId === 'control-interno-gestion') {
      setCurrentView({ type: 'mis-auditorias' });
    }
  };

  const sd = statsData || {};
  const servicios: Servicio[] = useMemo(() => {
    const base: Servicio[] = [
      {
        id: 'cert-laboral',
        nombre: 'Certificado Laboral',
        codigo: 'CERT-003',
        descripcion: 'Genera y descarga certificados laborales firmados',
        icon: <FileText style={{ width: 18, height: 18 }} />,
        iconBg: '#EFF6FF',
        iconColor: '#2563EB',
        categoria: 'Recursos Humanos',
        badges: [
          { label: 'Auto-firma', color: '#059669', bgColor: '#ECFDF5' },
          { label: 'Disponible', color: '#2563EB', bgColor: '#EFF6FF' },
        ],
        prioridad: 'Media',
        prioridadColor: '#D97706',
        visiblePara: ['SUPER_ADMIN', 'RECTOR', 'SECRETARIO_GENERAL', 'SUBDIRECTOR_ACADEMICO', 'SUBDIRECTOR_PROYECCION', 'SUBDIRECTOR_ALTO_GOBIERNO', 'JEFE_JURIDICA', 'JEFE_PLANEACION', 'DOCENTE'],
        requierePermiso: 'portal-transaccional.certificado-laboral.view',
      },
      {
        id: 'gesdoc',
        nombre: 'Carpeta Digital',
        codigo: 'DOC-004',
        descripcion: 'Tus documentos institucionales organizados y seguros',
        icon: <FolderOpen style={{ width: 18, height: 18 }} />,
        iconBg: '#ECFDF5',
        iconColor: '#059669',
        categoria: 'Carpeta Digital',
        badges: [{ label: 'Disponible', color: '#059669', bgColor: '#ECFDF5' }],
        prioridad: 'Baja',
        prioridadColor: '#6B7280',
        visiblePara: ['DOCENTE', 'ESTUDIANTE', 'USUARIO_AUDITADO', 'SUPER_ADMIN', 'JEFE_OCI', 'AUDITOR_LIDER', 'AUDITOR_SENIOR', 'AUDITOR_JUNIOR', 'PROFESIONAL_OCI', 'ADMIN_CI', 'RECTOR', 'SECRETARIO_GENERAL', 'SUBDIRECTOR_ACADEMICO', 'SUBDIRECTOR_PROYECCION', 'SUBDIRECTOR_ALTO_GOBIERNO', 'JEFE_JURIDICA', 'JEFE_PLANEACION'],
        requierePermiso: 'portal-transaccional.carpeta-digital.view',
      },
      {
        id: 'pta-docente',
        nombre: 'Plan de Trabajo Académico (PTA)',
        codigo: 'PTA-001',
        descripcion: 'Gestiona tu Plan de Trabajo Académico (PTA) del periodo...',
        icon: <Sparkles style={{ width: 18, height: 18 }} />,
        iconBg: '#F5F3FF',
        iconColor: '#7C3AED',
        categoria: 'Académico',
        badges: [
          { label: 'Periodo 2026-1', color: '#2563EB', bgColor: '#EFF6FF' },
          { label: 'En plazo', color: '#059669', bgColor: '#ECFDF5' },
        ],
        prioridad: 'Alta',
        prioridadColor: '#DC2626',
        visiblePara: ['DOCENTE', 'SUPER_ADMIN'],
        requierePermiso: 'portal-transaccional.pta.view',
      },
      {
        id: 'control-interno-gestion',
        nombre: 'Control Interno de Gestión',
        codigo: 'OCIG-001',
        descripcion: 'Responde hallazgos, sube documentos y comunícate con el equipo auditor',
        icon: <Shield style={{ width: 18, height: 18 }} />,
        iconBg: '#FEF2F2',
        iconColor: '#DC2626',
        categoria: 'Control Interno',
        badges: [
          { label: 'Mis auditorías', color: '#1D4ED8', bgColor: '#EFF6FF' },
        ],
        prioridad: 'Media',
        prioridadColor: '#D97706',
        visiblePara: ['USUARIO_AUDITADO', 'JEFE_OCI', 'AUDITOR_LIDER', 'AUDITOR_SENIOR', 'AUDITOR_JUNIOR', 'PROFESIONAL_OCI', 'ADMIN_CI', 'RECTOR', 'SECRETARIO_GENERAL', 'SUBDIRECTOR_ACADEMICO', 'SUBDIRECTOR_PROYECCION', 'SUBDIRECTOR_ALTO_GOBIERNO', 'JEFE_JURIDICA', 'JEFE_PLANEACION', 'SUPER_ADMIN'],
        requierePermiso: 'portal-transaccional.mis-auditorias.view',
      },
    ];

    // Filtrar servicios: si tiene requierePermiso, verificar permisos del usuario.
    // Si los permisos del portal aun no llegan, usar visiblePara como fallback por rol.
    const perms = new Set(userPermissions || []);
    const hasPortalPermissions = [...perms].some((permission) => permission.startsWith('portal-transaccional.'));
    const filteredBase = base.filter(s => {
      if (s.requierePermiso && hasPortalPermissions && perms.has(s.requierePermiso)) return true;
      if (s.visiblePara) return roleCodeMatches(activeRoleCode || activeRole, s.visiblePara);
      return !s.requierePermiso || !hasPortalPermissions;
    });

    // Merge with persisted ordering
    const storageKey = `portal_services_order_${userPersonId}_${activeRole}`;
    const saved = safeLocalStorageGet(storageKey);
    if (saved) {
      try {
        const order = JSON.parse(saved) as string[];
        const map = new Map(filteredBase.map((s) => [s.id, s]));
        const ordered: Servicio[] = [];
        order.forEach((id) => {
          const item = map.get(id);
          if (item) ordered.push(item);
        });
        filteredBase.forEach((s) => {
          if (!order.includes(s.id)) ordered.push(s);
        });
        return ordered;
      } catch {
        return base;
      }
    }

    return filteredBase;
  }, [userPersonId, activeRole, userPermissions]);

  const [serviciosOrdenados, setServiciosOrdenados] = useState<Servicio[]>(servicios);
  useEffect(() => setServiciosOrdenados(servicios), [servicios]);

  const persistOrder = useCallback(
    (next: Servicio[]) => {
      const storageKey = `portal_services_order_${userPersonId}_${activeRole}`;
      safeLocalStorageSet(storageKey, JSON.stringify(next.map((s) => s.id)));
    },
    [userPersonId, activeRole],
  );

  const handleMoveService = useCallback(
    (fromIndex: number, toIndex: number) => {
      setServiciosOrdenados((prev) => {
        const next = moveItem(prev, fromIndex, toIndex);
        persistOrder(next);
        return next;
      });
    },
    [persistOrder],
  );

  const statsCards = [
    {
      label: 'Pendientes',
      value: sd?.pendientes ?? 0,
      icon: <Clock style={{ width: 18, height: 18, color: '#D97706' }} />,
      bg: '#FEF3C7',
      bgAccent: '#FFF7ED',
    },
    {
      label: 'Completados',
      value: sd?.completados ?? 0,
      icon: <CheckCircle2 style={{ width: 18, height: 18, color: '#059669' }} />,
      bg: '#D1FAE5',
      bgAccent: '#ECFDF5',
    },
    {
      label: 'Procesos Activos',
      value: sd?.procesosActivos ?? 0,
      icon: <Activity style={{ width: 18, height: 18, color: '#2563EB' }} />,
      bg: '#EFF6FF',
      bgAccent: '#F5FAFF',
    },
    {
      label: 'Cumplimiento',
      value: `${sd?.cumplimiento ?? 0}%`,
      icon: <Target style={{ width: 18, height: 18, color: '#7C3AED' }} />,
      bg: '#F5F3FF',
      bgAccent: '#F5F3FF',
      isPercentage: true,
      percentValue: sd?.cumplimiento ?? 0,
    },
  ];

  const quickLinks = [
    {
      label: 'Correo Electrónico',
      desc: 'Acceso al correo institucional',
      icon: <Mail style={{ width: 16, height: 16, color: '#6B7280' }} />,
      external: true,
    },
    {
      label: 'HumanoSoft',
      desc: 'Sistema de gestión de recurso humano',
      icon: <Users style={{ width: 16, height: 16, color: '#6B7280' }} />,
      external: false,
    },
    {
      label: 'ARCA',
      desc: 'Sistema académico y de gestión estudiantil',
      icon: <Building2 style={{ width: 16, height: 16, color: '#6B7280' }} />,
      external: false,
    },
  ];

  const buildContactItems = () => [
    { icon: <Mail className="w-4 h-4 text-blue-500" />, value: userEmail || '', color: 'bg-blue-50 border-blue-100' },
    { icon: <Phone className="w-4 h-4 text-emerald-500" />, value: 'Ext. 1234', color: 'bg-emerald-50 border-emerald-100' },
    { icon: <MapPin className="w-4 h-4 text-red-500" />, value: 'Sede Central - Bogotá', color: 'bg-red-50 border-red-100' },
    ...(adminData?.area ? [{ icon: <Briefcase className="w-4 h-4 text-purple-500" />, value: adminData.area, color: 'bg-purple-50 border-purple-100' }] : []),
  ];

  const renderLeftPanelMobile = (contactItems: { icon: any; value: string }[]) => (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={triggerFotoPicker}
          className="group relative w-14 h-14 rounded-full border-2 border-white shadow-sm bg-[#003DA5]/5 shrink-0 overflow-hidden"
          title="Cambiar foto"
          style={{ width: '56px', height: '56px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
        >
          {fotoUrl ? (
            <img src={fotoUrl} alt="" className="w-full h-full object-cover" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#003DA5] text-base font-black" style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {iniciales}
            </div>
          )}
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-black text-[#003DA5] tracking-tight truncate">{userName}</div>
          <div className="text-[12px] font-semibold text-gray-500 flex items-center gap-1.5 mt-0.5">
            <Briefcase className="w-3 h-3 text-gray-400 shrink-0" />
            <span className="truncate">{activeRole}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCurrentView({ type: 'mi-perfil' })}
          className="h-9 px-4 rounded-xl bg-[#003DA5] hover:bg-[#002868] text-white font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0"
        >
          <Users className="w-3.5 h-3.5" />
          Perfil
        </button>
      </div>
      {/* Contacto colapsable en mobile */}
      <AnimatePresence initial={false}>
        {isContactInfoOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
              {contactItems.map((it) => (
                <div key={it.value} className="flex items-center gap-2 text-[12px] text-gray-500 bg-gray-50 rounded-lg px-2.5 py-1.5">
                  {it.icon}
                  <span className="truncate max-w-[180px]">{it.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setIsContactInfoOpen((p) => !p)}
        className="mt-2 text-[11px] font-bold text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
      >
        <ChevronDown className={`w-3 h-3 transition-transform ${isContactInfoOpen ? 'rotate-180' : ''}`} />
        {isContactInfoOpen ? 'Menos info' : 'Ver contacto'}
      </button>
    </div>
  );

  const renderLeftPanelDesktop = (contactItems: { icon: any; value: string }[], extraContent?: React.ReactNode) => (
    <div className="flex flex-col shrink-0 gap-5 sticky top-24" style={{ width: isXLDesktop ? 300 : 260 }}>
      <div className="relative bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-32 bg-[#003DA5]/5 pointer-events-none" />
        <div className="relative -mt-12 px-5 pb-5">
          <div className="relative flex items-center justify-center mx-auto group mb-3 mt-6">
            <button
              type="button"
              onClick={triggerFotoPicker}
              className="group relative w-20 h-20 rounded-full border-3 border-white shadow-sm bg-[#003DA5]/5 overflow-hidden"
              title="Cambiar foto"
              style={{ width: '80px', height: '80px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            >
              {fotoUrl ? (
                <img src={fotoUrl} alt="" className="w-full h-full object-cover" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#003DA5] text-lg font-black" style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {iniciales}
                </div>
              )}
              <div className="absolute inset-0" style={{ background: 'rgba(255, 255, 255, 0)', transition: 'background 150ms ease' }}>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full w-full h-full flex items-center justify-center" style={{ background: '#637aa3' }}>
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
            </button>
          </div>
          <div className="mt-2 text-center">
            <div className="text-[18px] font-black text-[#003DA5] tracking-tight leading-tight">{userName}</div>
            <div className="mt-1 text-[13px] font-semibold text-gray-500 flex items-center justify-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-gray-400" />
              {activeRole}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCurrentView({ type: 'mi-perfil' })}
            className="mt-3 w-full h-10 rounded-2xl bg-[#003DA5] hover:bg-[#002868] text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Users className="w-4 h-4" />
            Gestionar Perfil
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setIsContactInfoOpen((p) => !p)}
          className="w-full px-5 py-3.5 flex items-center justify-between"
        >
          <div className="text-[11px] font-black tracking-widest text-gray-400">INFORMACIÓN DE CONTACTO</div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isContactInfoOpen ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence initial={false}>
          {isContactInfoOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-5 pb-4 overflow-hidden"
            >
              <div className="space-y-2">
                {contactItems.map((it: any) => (
                  <div key={it.value} className="flex items-center gap-3 text-[13px] font-semibold text-gray-600 rounded-xl p-2 hover:bg-gray-50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${it.color || 'bg-gray-50 border-gray-100'}`}>
                      {it.icon}
                    </div>
                    <div className="min-w-0 truncate">{it.value}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Contenido extra (ej: Acceso Rápido) */}
      {extraContent}

      {/* Slot para componentes del contenido (ej: Progreso PTA) */}
      <div id="portal-left-sidebar-slot" className="space-y-5" />
    </div>
  );

  const renderLeftPanel = (contactItems: { icon: any; value: string }[]) => (
    isDesktop ? renderLeftPanelDesktop(contactItems) : renderLeftPanelMobile(contactItems)
  );

  const renderWithLeftLayout = (center: React.ReactNode) => {
    const contactItems = buildContactItems();
    if (!isDesktop) {
      return (
        <div className="space-y-4">
          {renderLeftPanelMobile(contactItems)}
          <div className="min-w-0">{center}</div>
        </div>
      );
    }
    return (
      <div id="id-render-with-left-layout" className="flex items-start gap-8">
        {renderLeftPanelDesktop(contactItems)}
        <div className="flex-1 min-w-0">{center}</div>
      </div>
    );
  };

  const renderMainContent = () => {
    switch (currentView.type) {
      case 'mi-perfil':
        return (
          <PerfilUsuarioEditable
            userName={userName}
            userEmail={userEmail}
            activeRole={activeRole}
            onVolver={() => setCurrentView({ type: 'dashboard' })}
          />
        );
      case 'certificado-laboral':
        return renderWithLeftLayout(
          <MisCertificadosLaborales personaId={userPersonId} userName={userName} onBack={() => setCurrentView({ type: 'dashboard' })} />,
        );
      case 'gestion-documental':
      case 'carpeta-digital':
        return renderWithLeftLayout(
          <MisDocumentos personaId={userPersonId} userName={userName} onBack={() => setCurrentView({ type: 'dashboard' })} />,
        );
      case 'pta': {
        const ptaContent = (
          <PortalDocentePTA
            userPersonId={userPersonId}
            userName={userName}
            userEmail={userEmail}
            onBack={() => setCurrentView({ type: 'dashboard' })}
          />
        );
        const isPTAFullWidth = ptaVista === 'v09_imprimir';
        const contactItems = buildContactItems();
        return (
          <div className={isDesktop ? "flex items-start gap-8" : "space-y-4"}>
            {isDesktop ? (
              !isPTAFullWidth && renderLeftPanelDesktop(contactItems)
            ) : (
              !isPTAFullWidth && renderLeftPanelMobile(contactItems)
            )}
            <div className={isPTAFullWidth ? "w-full min-w-0 ml-4" : isDesktop ? "flex-1 min-w-0 ml-4" : "min-w-0 ml-4"}>
              {ptaContent}
            </div>
          </div>
        );
      }
      case 'mis-auditorias':
        return renderWithLeftLayout(
          <MisAuditoriasControlInterno
            personaId={userPersonId}
            userName={userName}
            onBack={() => setCurrentView({ type: 'dashboard' })}
          />,
        );
      case 'configuracion':
        return <PortalSettings userName={userName} userEmail={userEmail} onBack={() => setCurrentView({ type: 'dashboard' })} />;
      case 'ayuda':
        return (
          <AyudaView
            onBack={() => setCurrentView({ type: 'dashboard' })}
            onNavigate={(s: string) => {
              const viewMap: Record<string, InternalView> = {
                configuracion: { type: 'configuracion' },
                'mi-perfil': { type: 'mi-perfil' },
                'certificado-laboral': { type: 'certificado-laboral' },
                'carpeta-digital': { type: 'carpeta-digital' },
              };
              const target = viewMap[s];
              if (target) setCurrentView(target);
            }}
          />
        );
      case 'dashboard':
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => {
    const datePretty = (() => {
      const txt = todayFormatted || '';
      return txt ? txt.charAt(0).toUpperCase() + txt.slice(1) : '';
    })();

    const quickApps = [
      { label: 'Correo Electrónico', desc: 'Acceso al correo institucional', icon: <Mail className="w-4 h-4 text-gray-500" />, external: true, activo: true },
      { label: 'HumanoSoft', desc: 'Sistema de gestión de recurso humano', icon: <Users className="w-4 h-4 text-gray-500" />, external: false, activo: true },
      { label: 'ARCA', desc: 'Sistema académico y de gestión estudiantil', icon: <Building2 className="w-4 h-4 text-gray-500" />, external: false, activo: false },
    ];

    const contactItems = [
      { icon: <Mail className="w-4 h-4 text-blue-500" />, value: userEmail || '', color: 'bg-blue-50 border-blue-100' },
      { icon: <Phone className="w-4 h-4 text-emerald-500" />, value: 'Ext. 1234', color: 'bg-emerald-50 border-emerald-100' },
      { icon: <MapPin className="w-4 h-4 text-red-500" />, value: 'Sede Central - Bogotá', color: 'bg-red-50 border-red-100' },
      ...(adminData?.area ? [{ icon: <Briefcase className="w-4 h-4 text-purple-500" />, value: adminData.area, color: 'bg-purple-50 border-purple-100' }] : []),
    ];

    /* ── Quick Apps panel (reutilizable) ── */
    const renderQuickApps = () => (
      <div className="bg-white rounded-2xl lg:rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <div className="text-[14px] font-black text-gray-900">Acceso Rápido</div>
          <div className="text-[12px] text-gray-500">Aplicativos Institucionales</div>
        </div>
        <div className="px-2 py-1.5">
          {quickApps.map((app) => (
            <button
              key={app.label}
              onClick={() => toast.info(app.label, { description: app.desc })}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left ${!app.activo ? 'opacity-50' : ''}`}
              disabled={!app.activo}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                  {app.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-black text-gray-900 truncate flex items-center gap-2">
                    {app.label}
                    {app.external && <ExternalLink className="w-3.5 h-3.5 text-gray-400" />}
                  </div>
                  <div className="text-[12px] text-gray-500 truncate">{app.desc}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`w-2 h-2 rounded-full ${app.activo ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                <span className={`text-[10px] font-bold ${app.activo ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {app.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </button>
          ))}
        </div>
        <div className="px-5 py-2.5 border-t border-gray-100 text-[12px] text-gray-500 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          {quickApps.filter(a => a.activo).length} de {quickApps.length} activos
        </div>
      </div>
    );

    /* ── Greeting header ── */
    const renderGreeting = () => (
      <div className="bg-white rounded-2xl lg:rounded-3xl border border-gray-200/80 shadow-sm px-4 sm:px-6 py-3.5 sm:py-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar solo en desktop — en mobile ya está en el perfil card */}
          {isDesktop && (
            <div className="w-11 h-11 rounded-full bg-[#003DA5] text-white flex items-center justify-center font-black text-sm shrink-0">
              {iniciales}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-[14px] sm:text-[15px] font-black text-gray-900">
              {getGreeting()}, {userName?.split(' ')[0] || userName}
            </div>
            <div className="text-[11px] sm:text-[12px] text-gray-500">{datePretty}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={triggerFotoPicker}
            disabled={uploadingFoto}
            className={`hidden sm:inline-flex w-9 h-9 rounded-lg bg-gray-50 border border-gray-200 items-center justify-center ${
              uploadingFoto ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-100'
            }`}
            title="Cambiar foto"
          >
            <Camera className="w-4 h-4 text-gray-600" />
          </button>
          <div className="h-8 sm:h-9 px-3 sm:px-4 rounded-lg sm:rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">Sesión activa</span>
            <span className="sm:hidden">Activa</span>
          </div>
        </div>
      </div>
    );

    /* ── Services section ── */
    const renderServices = () => (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl lg:rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="text-[15px] sm:text-[16px] font-black text-gray-900">Mis Servicios</div>
            </div>
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl p-0.5 sm:p-1">
              <button
                type="button"
                onClick={() => setVistaGrid('list')}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-md sm:rounded-lg flex items-center justify-center transition-colors ${
                  vistaGrid === 'list' ? 'bg-white shadow-sm' : 'hover:bg-white/60'
                }`}
                title="Lista"
              >
                <List className="w-4 h-4 text-gray-600" />
              </button>
              <button
                type="button"
                onClick={() => setVistaGrid('grid')}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-md sm:rounded-lg flex items-center justify-center transition-colors ${
                  vistaGrid === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-white/60'
                }`}
                title="Grid"
              >
                <Grid3X3 className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Categorías — scroll horizontal con fade indicator */}
          <div className="px-4 sm:px-6 pb-4 sm:pb-5 relative">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1" style={{ WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory' }}>
              {CATEGORIAS.filter(cat => cat === 'Todos' || serviciosOrdenados.some(s => s.categoria === cat)).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoriaActiva(cat)}
                  className={`h-8 sm:h-9 px-3 sm:px-4 rounded-lg sm:rounded-xl text-xs font-black transition-colors border whitespace-nowrap shrink-0 ${
                    categoriaActiva === cat
                      ? 'bg-[#003DA5] text-white border-[#003DA5]'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                  style={{ scrollSnapAlign: 'start' }}
                >
                  {cat}
                </button>
              ))}
            </div>
            {/* Fade indicator — solo visible en mobile */}
            {!isDesktop && (
              <div className="absolute top-0 right-4 bottom-1 w-8 pointer-events-none" style={{ background: 'linear-gradient(to right, transparent, white)' }} />
            )}
          </div>
        </div>

        <DndProvider backend={HTML5Backend}>
          <div className={
            vistaGrid === 'grid'
              ? `grid gap-3 sm:gap-4 ${isDesktop ? 'grid-cols-2' : windowWidth >= 640 ? 'grid-cols-2' : 'grid-cols-1'}`
              : 'flex flex-col gap-3'
          }>
            {serviciosOrdenados
              .filter((s) => (categoriaActiva === 'Todos' ? true : s.categoria === categoriaActiva))
              .map((s, idx) => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  index={idx}
                  view={vistaGrid}
                  onMove={handleMoveService}
                  onClick={() => handleServiceClick(s.id)}
                  compact={!isDesktop}
                />
              ))}
          </div>
        </DndProvider>
      </div>
    );

    /* ── LAYOUT PRINCIPAL RESPONSIVE ── */
    if (!isDesktop) {
      /* ▸ Mobile & Tablet: vertical stack */
      return (
        <div className="space-y-3">
          {renderLeftPanelMobile(contactItems)}
          {renderGreeting()}
          {renderServices()}
          {/* Stats cards */}
          {statsLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-3.5 flex items-center gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-lg bg-gray-200 shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-12" />
                    <div className="h-3 bg-gray-100 rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {statsCards.map((sc) => (
                <div key={sc.label} className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 flex items-center gap-3 hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: sc.bg }}>{sc.icon}</div>
                  <div className="min-w-0">
                    <div className="text-[16px] font-black text-gray-900">{typeof sc.value === 'number' ? formatNumber(sc.value) : sc.value}</div>
                    <div className="text-[10px] font-semibold text-gray-500 truncate">{sc.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      );
    }

    if (!isLargeDesktop) {
      /* ▸ Desktop (1024–1279px): 2 columnas, sin right panel, Quick Apps debajo */
      return (
        <div className="flex items-stretch gap-8" style={{ minHeight: 'calc(100vh - 64px - 4rem)' }}>
          {renderLeftPanelDesktop(contactItems, renderQuickApps())}
          <div className="flex-1 min-w-0 flex flex-col gap-5 ml-4">
            {renderGreeting()}
            {renderServices()}
            {/* Stats cards */}
            {statsLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-gray-200 shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-5 bg-gray-200 rounded w-10" />
                      <div className="h-3 bg-gray-100 rounded w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {statsCards.map((sc) => (
                  <div key={sc.label} className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 flex items-center gap-3 hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: sc.bg }}>{sc.icon}</div>
                    <div className="min-w-0">
                      <div className="text-[18px] font-black text-gray-900">{typeof sc.value === 'number' ? formatNumber(sc.value) : sc.value}</div>
                      <div className="text-[11px] font-semibold text-gray-500 truncate">{sc.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Actividad Reciente — timeline real */}
            <div className="flex-1 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col min-h-[180px]">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-[15px] font-black text-gray-900">Actividad Reciente</div>
                </div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Hoy</span>
              </div>
              <div className="flex-1 p-5">
                <div className="space-y-4">
                  {/* Item 1: Sesión activa */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                        <Shield className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div className="w-px flex-1 bg-gray-200 mt-2" />
                    </div>
                    <div className="flex-1 min-w-0 pb-4">
                      <div className="text-[13px] font-bold text-gray-900">Sesión iniciada</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">Acceso al Portal Transaccional como {activeRole}</div>
                      <div className="text-[10px] font-semibold text-gray-400 mt-1">{datePretty}</div>
                    </div>
                  </div>
                  {/* Item 2: Perfil */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div className="w-px flex-1 bg-gray-200 mt-2" />
                    </div>
                    <div className="flex-1 min-w-0 pb-4">
                      <div className="text-[13px] font-bold text-gray-900">Perfil verificado</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">Tu información de contacto está actualizada</div>
                      <div className="text-[10px] font-semibold text-emerald-500 mt-1">✓ Completo</div>
                    </div>
                  </div>
                  {/* Item 3: Servicios */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-gray-900">{serviciosOrdenados.length} servicios disponibles</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">Explora tus servicios activos en el portal</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      );
    }

    /* ▸ Large Desktop (1280px+): 3 columnas completas */
    return (
      <div className="flex items-stretch gap-8" style={{ minHeight: 'calc(100vh - 64px - 4rem)' }}>
        {renderLeftPanelDesktop(contactItems, renderQuickApps())}
        <div className="flex-1 min-w-0 flex flex-col gap-5 ml-4">
          {renderGreeting()}
          {renderServices()}
          {/* Stats cards */}
          {statsLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[1,2,3,4].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-gray-200 shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-5 bg-gray-200 rounded w-10" />
                    <div className="h-3 bg-gray-100 rounded w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {statsCards.map((sc) => (
                <div
                  key={sc.label}
                  className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 flex items-center gap-3 hover:shadow-md hover:scale-[1.02] transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: sc.bg }}>
                    {sc.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[18px] font-black text-gray-900">
                      {typeof sc.value === 'number' ? formatNumber(sc.value) : sc.value}
                    </div>
                    <div className="text-[11px] font-semibold text-gray-500 truncate">{sc.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Actividad Reciente — timeline real */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col min-h-[200px]">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-[15px] font-black text-gray-900">Actividad Reciente</div>
              </div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Hoy</span>
            </div>
            <div className="flex-1 p-5">
              <div className="space-y-4">
                {/* Item 1: Sesión activa */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                      <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="w-px flex-1 bg-gray-200 mt-2" />
                  </div>
                  <div className="flex-1 min-w-0 pb-4">
                    <div className="text-[13px] font-bold text-gray-900">Sesión iniciada</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">Acceso al Portal Transaccional como {activeRole}</div>
                    <div className="text-[10px] font-semibold text-gray-400 mt-1">{datePretty}</div>
                  </div>
                </div>
                {/* Item 2: Perfil */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="w-px flex-1 bg-gray-200 mt-2" />
                  </div>
                  <div className="flex-1 min-w-0 pb-4">
                    <div className="text-[13px] font-bold text-gray-900">Perfil verificado</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">Tu información de contacto está actualizada</div>
                    <div className="text-[10px] font-semibold text-emerald-500 mt-1">✓ Completo</div>
                  </div>
                </div>
                {/* Item 3: Servicios */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-gray-900">{serviciosOrdenados.length} servicios disponibles</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">Explora tus servicios activos en el portal</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
      <div className="min-h-[calc(100vh-64px)]" style={{ background: '#F3F4F6' }}>
        <div className="w-full max-w-[1000px] mx-auto px-6 sm:px-10 md:px-14 lg:px-16 py-5 sm:py-6 md:py-8">
          <input ref={fotoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFotoUpload} />
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView.type}
              className="w-full"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderMainContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
  );
}

function ServiceCard({
  service,
  index,
  onMove,
  onClick,
  view,
  compact = false,
}: {
  service: Servicio;
  index: number;
  onMove: (from: number, to: number) => void;
  onClick: () => void;
  view: 'grid' | 'list';
  compact?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: DND_ITEM_TYPE,
    item: () => ({ index }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: DND_ITEM_TYPE,
    collect: (monitor) => ({ isOver: monitor.isOver() }),
    hover(item: any, monitor) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      // Get the bounding rect of the hover target
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      // Get the vertical middle point
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      // Get mouse position
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      // Get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the item's height
      // Dragging downwards: only move when cursor is below 50%
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      // Dragging upwards: only move when cursor is above 50%
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  const priorityDot =
    service.prioridad === 'Alta'
      ? '#EF4444'
      : service.prioridad === 'Media'
        ? '#F59E0B'
        : '#9CA3AF';

  const containerClass =
    view === 'grid'
      ? `bg-white border border-gray-200/80 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-lg hover:border-[#003DA5]/20 transition-all duration-200 cursor-pointer ${compact ? 'p-4' : 'p-5 sm:p-6'} relative overflow-hidden ${isDragging ? '' : 'hover:-translate-y-0.5'}`
      : `bg-white border border-gray-200/80 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-lg hover:border-[#003DA5]/20 transition-all duration-200 cursor-pointer ${compact ? 'p-4' : 'p-4 sm:p-5'} relative overflow-hidden ${isDragging ? '' : 'hover:-translate-y-0.5'}`;

  return (
    <div
      ref={ref}
      className={containerClass}
      style={{
        opacity: isDragging ? 0.4 : isOver ? 0.85 : 1,
        transform: isDragging ? 'scale(0.96)' : 'scale(1)',
        boxShadow: isOver && !isDragging ? '0 0 0 2px #003DA5' : undefined,
      }}
      onClick={onClick}
    >
      {!compact && (
        <div className="absolute top-3 sm:top-4 right-3 sm:right-4 w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400">
          <GripVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
      )}

      <div className="flex items-start gap-3 sm:gap-4">
        <div
          className={`${compact ? 'w-9 h-9 rounded-xl' : 'w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl'} flex items-center justify-center flex-shrink-0`}
          style={{ background: service.iconBg, color: service.iconColor }}
        >
          {service.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className={`flex items-center gap-2 ${compact ? 'pr-2' : 'pr-10'}`}>
            <div className="text-[13px] sm:text-[14px] font-black text-gray-900">{service.nombre}</div>
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg bg-gray-50 border border-gray-200 text-gray-500 shrink-0">
              {service.codigo}
            </span>
          </div>
          <div className="text-[11px] sm:text-[12px] text-gray-500 mt-1.5 line-clamp-2">{service.descripcion}</div>

          <div className="mt-3.5 sm:mt-4 flex flex-wrap items-center gap-2">
            {service.badges.map((b) => (
              <span
                key={b.label}
                className="text-[10px] sm:text-[11px] font-black px-2.5 sm:px-3 py-1 rounded-lg sm:rounded-xl"
                style={{ color: b.color, background: b.bgColor }}
              >
                {b.label}
              </span>
            ))}

            {service.prioridad && (
              <span className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-black text-gray-500 ml-auto">
                <span className="w-2 h-2 rounded-full" style={{ background: priorityDot }} />
                {service.prioridad}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
