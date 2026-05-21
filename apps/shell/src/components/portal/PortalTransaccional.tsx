/**
 * Portal Transaccional - Vista principal del usuario autenticado (Legacy PTA)
 *
 * Migrado desde `PlataformaDeGestion-PTA-mergue_full` para que el layout académico
 * quede igual al portal original.
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
import { NotificationsProvider } from '../esap/NotificationsContext';
import { PortalNotificationBell } from './PortalNotificationBell';
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
    { icon: <Mail className="w-4 h-4 text-gray-400" />, value: userEmail || '' },
    { icon: <Phone className="w-4 h-4 text-gray-400" />, value: 'Ext. 1234' },
    { icon: <MapPin className="w-4 h-4 text-gray-400" />, value: 'Sede Central - Bogotá' },
    ...(adminData?.area ? [{ icon: <Briefcase className="w-4 h-4 text-gray-400" />, value: adminData.area }] : []),
  ];

  const renderLeftPanel = (contactItems: { icon: any; value: string }[]) => (
    <div className="space-y-5" style={{ flex: '0 0 340px', minWidth: 320 }}>
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div
          className="relative h-32 overflow-hidden"
          style={{ background: 'linear-gradient(180deg, #F1F5F9 0%, #FFFFFF 100%)' }}
        >
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full"
            style={{
              top: '60%',
              width: 150,
              height: 150,
              background: 'rgba(255,255,255,0.45)',
              border: '2px solid rgba(255,255,255,0.9)',
            }}
          />
        </div>
        <div className="-mt-12 px-6 pb-6">
          <button
            type="button"
            onClick={triggerFotoPicker}
            className="group relative w-24 h-24 rounded-full bg-white border-4 border-white shadow-sm mx-auto flex items-center justify-center overflow-hidden"
            title="Cambiar foto"
          >
            {fotoUrl ? (
              <img src={fotoUrl} alt="" className="w-full h-full object-cover object-center" style={{ transform: 'scale(1.12)' }} />
            ) : (
              <div className="w-full h-full bg-[#F1F5F9] border border-gray-200 flex items-center justify-center text-[#003DA5] text-xl font-black">
                {iniciales}
              </div>
            )}
            <div className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background: 'rgba(0,0,0,0)',
                transition: 'background 150ms ease',
              }}
            >
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 border border-gray-200 rounded-xl p-2 shadow-sm">
                <Camera className="w-4 h-4 text-gray-700" />
              </div>
            </div>
          </button>

          <div className="mt-3 text-center">
            <div className="text-[20px] font-black text-[#003DA5] tracking-tight">{userName}</div>
            <div className="mt-1 text-[14px] font-semibold text-gray-500 flex items-center justify-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-gray-400" />
              {activeRole}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCurrentView({ type: 'mi-perfil' })}
            className="mt-4 w-full h-11 rounded-2xl bg-[#003DA5] hover:bg-[#002868] text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
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
          className="w-full px-6 py-4 flex items-center justify-between"
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
              className="px-6 pb-5 overflow-hidden"
            >
              <div className="space-y-3">
                {contactItems.map((it) => (
                  <div
                    key={it.value}
                    className="flex items-center gap-3 text-[13px] font-semibold text-gray-600 rounded-2xl p-2 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
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

      {/* Slot para componentes del contenido (ej: Progreso PTA) */}
      <div id="portal-left-sidebar-slot" className="space-y-5" />
    </div>
  );

  const renderWithLeftLayout = (center: React.ReactNode, centerStyle: React.CSSProperties = { flex: '1 1 720px', minWidth: 380 }) => {
    const contactItems = buildContactItems();
    return (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          gap: 24,
        }}
      >
        {renderLeftPanel(contactItems)}
        <div style={centerStyle}>{center}</div>
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
      case 'pta':
        return renderWithLeftLayout(
          <PortalDocentePTA
            userPersonId={userPersonId}
            userName={userName}
            userEmail={userEmail}
            onBack={() => setCurrentView({ type: 'dashboard' })}
          />,
        );
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
      { label: 'Correo Electrónico', desc: 'Acceso al correo institucional', icon: <Mail className="w-4 h-4 text-gray-500" />, external: true },
      { label: 'HumanoSoft', desc: 'Sistema de gestión de recurso humano', icon: <Users className="w-4 h-4 text-gray-500" />, external: false },
      { label: 'ARCA', desc: 'Sistema académico y de gestión estudiantil', icon: <Building2 className="w-4 h-4 text-gray-500" />, external: false },
    ];

    const contactItems = [
      { icon: <Mail className="w-4 h-4 text-gray-400" />, value: userEmail || '' },
      { icon: <Phone className="w-4 h-4 text-gray-400" />, value: 'Ext. 1234' },
      { icon: <MapPin className="w-4 h-4 text-gray-400" />, value: 'Sede Central - Bogotá' },
      ...(adminData?.area ? [{ icon: <Briefcase className="w-4 h-4 text-gray-400" />, value: adminData.area }] : []),
    ];

    return (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          gap: 24,
        }}
      >
        {/* Left */}
        <div className="hidden lg:flex flex-col w-[280px] xl:w-[300px] shrink-0 gap-6 sticky top-24 h-fit">
          <div className="relative bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-32 bg-[#003DA5]/5 pointer-events-none" style={{backgroundColor: ''}} />
            <div className="relative -mt-12 px-6 pb-6">
              <div className="relative flex items-center justify-center mx-auto group mb-4 mt-6">
              <button
                type="button"
                onClick={triggerFotoPicker}
                className="group relative w-24 h-24 rounded-full border-3 border-white shadow-sm bg-[#003DA5]/5"
                title="Cambiar foto"
              >
                {fotoUrl ? (
                  <img src={fotoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#003DA5] text-xl font-black">
                    {iniciales}
                  </div>
                )}
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'rgba(255, 255, 255, 0)',
                    transition: 'background 150ms ease',
                  }}
                >
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full w-full h-full flex items-center justify-center" style={{background: '#637aa3'}}>
                    <Camera className="w-5 h-5 text-gray-700 text-white" />
                  </div>
                </div>

              <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white" />
              </button>
              </div>

              
              <div className="text-center relative z-10 w-full mt-1">
                <div className="text-[20px] font-black text-[#003DA5]">{userName}</div>
                <div className="flex items-center justify-center gap-1.5 text-[13px] font-semibold text-gray-500 mb-4">
                  <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                  {activeRole}
                </div>
              </div>

              <div className="flex justify-center flex-wrap gap-1.5 mb-5"></div>

              <button
                type="button"
                onClick={() => setCurrentView({ type: 'mi-perfil' })}
                className="mt-4 w-full h-11 rounded-2xl bg-[#003DA5] hover:bg-[#002868] text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
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
              className="w-full px-6 py-4 flex items-center justify-between"
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
                  className="px-6 pb-5 overflow-hidden"
                >
                  <div className="space-y-3">
                    {contactItems.map((it) => (
                      <div key={it.value} className="flex items-center gap-3 text-[13px] font-semibold text-gray-600 rounded-2xl p-2 hover:bg-gray-50 transition-colors">
                        <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
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
        </div>

        {/* Center */}
        <div className="space-y-5" style={{ flex: '1 1 520px', minWidth: 380 }}>
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm px-6 py-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-full bg-[#003DA5] text-white flex items-center justify-center font-black">
                {iniciales}
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-black text-gray-900 truncate">
                  {getGreeting()}, {userName?.split(' ')[0] || userName}
                </div>
                <div className="text-[12px] text-gray-500">{datePretty}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={triggerFotoPicker}
                disabled={uploadingFoto}
                className={`hidden sm:inline-flex w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 items-center justify-center ${
                  uploadingFoto ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-100'
                }`}
                title="Cambiar foto"
              >
                <Camera className="w-4 h-4 text-gray-600" />
              </button>
              <div className="h-10 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Sesión activa
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
              <div className="px-6 pt-5 pb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-[16px] font-black text-gray-900">Mis Servicios</div>
                </div>

                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setVistaGrid('list')}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                      vistaGrid === 'list' ? 'bg-white shadow-sm' : 'hover:bg-white/60'
                    }`}
                    title="Lista"
                  >
                    <List className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setVistaGrid('grid')}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                      vistaGrid === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-white/60'
                    }`}
                    title="Grid"
                  >
                    <Grid3X3 className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="px-6 pb-5">
                <div className="flex flex-wrap gap-2">
                  {CATEGORIAS.filter(cat => cat === 'Todos' || serviciosOrdenados.some(s => s.categoria === cat)).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoriaActiva(cat)}
                      className={`h-9 px-4 rounded-xl text-xs font-black transition-colors border ${
                        categoriaActiva === cat
                          ? 'bg-[#003DA5] text-white border-[#003DA5]'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <DndProvider backend={HTML5Backend}>
              <div className={vistaGrid === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'flex flex-col gap-3'}>
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
                    />
                  ))}
              </div>
            </DndProvider>
          </div>
        </div>

        {/* Right */}
        <div style={{ flex: '0 0 320px', minWidth: 300 }}>
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 text-center">
              <div className="text-[14px] font-black text-gray-900">Acceso Rápido</div>
              <div className="text-[12px] text-gray-500">Aplicativos Institucionales</div>
            </div>
            <div className="px-2 py-2">
              {quickApps.map((app) => (
                <button
                  key={app.label}
                  onClick={() => toast.info(app.label, { description: app.desc })}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
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
                  <ArrowUpRight className="w-4 h-4 text-gray-300" />
                </button>
              ))}
            </div>
            <div className="px-6 py-3 border-t border-gray-100 text-[12px] text-gray-500 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              {quickApps.length} aplicativos disponibles
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <NotificationsProvider>
      <div className="min-h-[calc(100vh-64px)]" style={{ background: '#F3F4F6' }}>
        <div className="w-full max-w-[1360px] mx-auto px-4 md:px-6 lg:px-8 xl:px-4 py-4 md:py-6 lg:py-8 flex justify-center items-start lg:gap-6 xl:gap-8">
          <input ref={fotoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFotoUpload} />
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView.type}
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
    </NotificationsProvider>
  );
}

function ServiceCard({
  service,
  index,
  onMove,
  onClick,
  view,
}: {
  service: Servicio;
  index: number;
  onMove: (from: number, to: number) => void;
  onClick: () => void;
  view: 'grid' | 'list';
}) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: DND_ITEM_TYPE,
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

  const [, drop] = useDrop(() => ({
    accept: DND_ITEM_TYPE,
    hover(item: any) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  }));

  drag(drop(ref));

  const priorityDot =
    service.prioridad === 'Alta'
      ? '#EF4444'
      : service.prioridad === 'Media'
        ? '#F59E0B'
        : '#9CA3AF';

  const containerClass =
    view === 'grid'
      ? 'bg-white border border-gray-200/80 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer p-5 relative'
      : 'bg-white border border-gray-200/80 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer p-4 relative';

  return (
    <div
      ref={ref}
      className={containerClass}
      style={{
        opacity: isDragging ? 0.35 : 1,
        transform: isDragging ? 'scale(0.98)' : 'scale(1)',
      }}
      onClick={onClick}
    >
      <div className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400">
        <GripVertical className="w-4 h-4" />
      </div>

      <div className="flex items-start gap-4">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: service.iconBg, color: service.iconColor }}
        >
          {service.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 pr-10">
            <div className="text-[14px] font-black text-gray-900 truncate">{service.nombre}</div>
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-500">
              {service.codigo}
            </span>
          </div>
          <div className="text-[12px] text-gray-500 mt-1 line-clamp-2">{service.descripcion}</div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {service.badges.map((b) => (
                <span
                  key={b.label}
                  className="text-[11px] font-black px-3 py-1 rounded-xl"
                  style={{ color: b.color, background: b.bgColor }}
                >
                  {b.label}
                </span>
              ))}
            </div>

            {service.prioridad && (
              <div className="flex items-center gap-2 text-[12px] font-black text-gray-500">
                <span className="w-2 h-2 rounded-full" style={{ background: priorityDot }} />
                {service.prioridad}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
