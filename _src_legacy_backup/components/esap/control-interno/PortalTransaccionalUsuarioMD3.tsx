/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PORTAL TRANSACCIONAL - MATERIAL DESIGN 3 WORLD-CLASS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Portal optimizado con principios de Material Design 3:
 * - Elevation system (sombras consistentes)
 * - Motion design (animaciones fluidas y con propósito)
 * - Surface containers con tints
 * - Spacing 8dp grid system
 * - Typography scale MD3
 * - Interactive states (hover, active, focus)
 * - Responsive mobile-first
 * 
 * USUARIO ASIGNADO: funcionario@esap.edu.co
 * 
 * VERSIÓN: 3.0 MD3
 * FECHA: 4 Enero 2026
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  Calendar,
  FileText,
  Shield,
  User,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  Upload,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  ExternalLink,
  LogOut,
  Settings,
  Camera,
  Eye,
  EyeOff,
  Facebook,
  Twitter,
  Linkedin,
  Activity,
  AlertCircle,
  Target,
  Scale,
  Folder,
  Lock,
  Check,
  Users,
  Zap,
  Grid3x3,
  List,
  SlidersHorizontal,
  Info,
  TrendingUp,
  ArrowLeft,
  X,
  Briefcase,
  Link2,
  UserCog,
  Database,
  Globe,
  Save,
  History,
  Menu
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Textarea } from '../../ui/textarea';
import { PerfilUsuarioCompletoPT } from './PerfilUsuarioCompletoPT';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { PortalUsuarioAuditado } from './PortalUsuarioAuditado';
import { ESAPLogo } from '../../assets/ESAPLogo';
import { BreadcrumbNavegacion, StickyNavBar } from './BreadcrumbNavegacion';
import { useIsMobile } from '../../../hooks/useIsMobile';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

interface UsuarioPortal {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  cargo: string;
  area: string;
  dependencia: string;
  telefono: string;
  celular?: string;
  extension: string;
  ubicacion: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  documentoTipo?: string;
  documentoNumero?: string;
  biografia?: string;
  foto?: string;
  antiguedad?: string;
}

interface CampoPrivacidad {
  esPublico: boolean;
}

interface ServicioPortal {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  estado: 'Disponible' | 'Requiere atención' | 'En proceso' | 'Completado';
  badge?: string;
  pendientes?: number;
  prioridad?: 'alta' | 'media' | 'baja';
  icono: any;
}

interface EstadisticaCard {
  titulo: string;
  valor: number | string;
  icono: any;
  color: string;
  cambio?: string;
  tendencia?: 'up' | 'down' | 'neutral';
}

// ════════════════════════════════════════════════════════════════════════════
// DATOS MOCK
// ════════════════════════════════════════════════════════════════════════════

const USUARIO_MOCK: UsuarioPortal = {
  id: '1',
  nombre: 'Diego',
  apellidos: 'Trujillo Ramírez',
  email: 'funcionario@esap.edu.co',
  cargo: 'Funcionario Administrativo',
  area: 'Planeación',
  dependencia: 'Oficina de Control Interno',
  telefono: '+57 601 234 5678',
  extension: '1234',
  ubicacion: 'Bogotá',
  foto: '',
  antiguedad: '3 años'
};

const ESTADISTICAS: EstadisticaCard[] = [
  {
    titulo: 'Procesos Activos',
    valor: 5,
    icono: Activity,
    color: '#2962FF',
    cambio: '+2 esta semana',
    tendencia: 'up'
  },
  {
    titulo: 'Pendientes',
    valor: 3,
    icono: AlertCircle,
    color: '#F57C00',
    cambio: '2 próximos a vencer',
    tendencia: 'neutral'
  },
  {
    titulo: 'Completados',
    valor: 12,
    icono: CheckCircle2,
    color: '#00C853',
    cambio: '+4 este mes',
    tendencia: 'up'
  },
  {
    titulo: 'Cumplimiento',
    valor: '92%',
    icono: Target,
    color: '#6200EA',
    cambio: '+5% vs mes anterior',
    tendencia: 'up'
  }
];

const SERVICIOS_MOCK: ServicioPortal[] = [
  {
    id: '1',
    codigo: 'OCI-001',
    titulo: 'Control Interno de Gestión',
    descripcion: 'Gestiona investigaciones, auditorías y seguimiento de procesos disciplinarios',
    categoria: 'Control Interno',
    estado: 'Requiere atención',
    badge: '3 pendientes',
    pendientes: 3,
    prioridad: 'alta',
    icono: Shield
  },
  {
    id: '2',
    codigo: 'DISC-002',
    titulo: 'Procesos Disciplinarios',
    descripcion: 'Seguimiento y gestión de procesos disciplinarios en curso',
    categoria: 'Control Interno',
    estado: 'En proceso',
    badge: '1 en curso',
    pendientes: 1,
    prioridad: 'media',
    icono: Scale
  },
  {
    id: '3',
    codigo: 'RRHH-003',
    titulo: 'Recursos Humanos',
    descripcion: 'Solicitudes de certificados, permisos y gestión de personal',
    categoria: 'Recursos Humanos',
    estado: 'Disponible',
    prioridad: 'baja',
    icono: Users
  },
  {
    id: '4',
    codigo: 'DOC-004',
    titulo: 'Gestión Documental',
    descripcion: 'Consulta y carga de documentos institucionales',
    categoria: 'Documentos',
    estado: 'Disponible',
    prioridad: 'baja',
    icono: Folder
  }
];

const CATEGORIAS = ['Todos', 'Control Interno', 'Recursos Humanos', 'Documentos', 'Auditorías'];

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

interface PortalTransaccionalUsuarioMD3Props {
  onLogout?: () => void;
}

export function PortalTransaccionalUsuarioMD3({ onLogout }: PortalTransaccionalUsuarioMD3Props) {
  // ✅ Hook responsive mobile-first
  const isMobile = useIsMobile(1024); // < 1024px = mobile/tablet
  
  const [vistaActual, setVistaActual] = useState<'dashboard' | 'servicio' | 'perfil'>('dashboard');
  const [servicioActivo, setServicioActivo] = useState<ServicioPortal | null>(null);
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [vistaServicios, setVistaServicios] = useState<'grid' | 'list'>('grid');
  const [busqueda, setBusqueda] = useState('');
  
  // Estados para foto de perfil
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);
  
  // ✅ Estado para sidebar mobile
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  const serviciosFiltrados = SERVICIOS_MOCK.filter(servicio => {
    const matchCategoria = categoriaActiva === 'Todos' || servicio.categoria === categoriaActiva;
    const matchBusqueda = servicio.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
                          servicio.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
                          servicio.codigo.toLowerCase().includes(busqueda.toLowerCase());
    return matchCategoria && matchBusqueda;
  });

  const handleAbrirServicio = (servicio: ServicioPortal) => {
    if (servicio.id === '1') {
      setServicioActivo(servicio);
      setVistaActual('servicio');
    } else {
      toast.info('Servicio en construcción', {
        description: `${servicio.titulo} estará disponible próximamente`
      });
    }
  };

  const handleVolverDashboard = () => {
    setVistaActual('dashboard');
    setServicioActivo(null);
  };

  const handleVerPerfil = () => {
    setVistaActual('perfil');
  };

  const handleSeleccionarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!tiposPermitidos.includes(file.type)) {
      toast.error('Formato no válido', { description: 'Solo JPG, PNG o WEBP' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Archivo muy grande', { description: 'Máximo 5MB' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewFoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGuardarCambios = () => {
    if (previewFoto) {
      setFotoPerfil(previewFoto);
      setPreviewFoto(null);
      toast.success('Foto actualizada correctamente');
    }
  };

  const handleEliminarFoto = () => {
    setFotoPerfil(null);
    setPreviewFoto(null);
    toast.success('Foto eliminada');
  };

  // Breadcrumb dinámico
  const breadcrumbItems = (() => {
    const items: { label: string; onClick?: () => void; active?: boolean }[] = [
      { label: 'Inicio', onClick: handleVolverDashboard }
    ];
    
    if (vistaActual === 'perfil') {
      items.push({ label: 'Mi Perfil', active: true });
    } else if (vistaActual === 'servicio' && servicioActivo) {
      items.push(
        { label: servicioActivo.categoria, onClick: handleVolverDashboard },
        { label: servicioActivo.titulo, active: true }
      );
    }
    
    return items;
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER MD3 con Glass Morphism y Breadcrumb */}
      <HeaderMD3 
        usuario={USUARIO_MOCK} 
        fotoPerfil={fotoPerfil} 
        onLogout={onLogout}
        breadcrumbItems={breadcrumbItems}
        vistaActual={vistaActual}
      />

      {/* ✅ BOTÓN HAMBURGER FLOTANTE - Solo visible en mobile */}
      {isMobile && (
        <motion.button
          onClick={() => setSidebarMobileOpen(true)}
          className="fixed bottom-6 left-6 z-50 w-14 h-14 bg-gradient-to-br from-[#2962FF] to-[#1E88E5] text-white rounded-full shadow-2xl hover:shadow-3xl flex items-center justify-center group transition-all hover:scale-110"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          title="Abrir menú"
        >
          <Menu className="w-6 h-6" />
          
          {/* Tooltip */}
          <span className="absolute -top-12 left-0 bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Abrir menú
            <span className="absolute bottom-0 left-6 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></span>
          </span>
        </motion.button>
      )}

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* ✅ SIDEBAR MD3 - Overlay en mobile, sticky en desktop */}
          <AnimatePresence>
            {(sidebarMobileOpen || !isMobile) && (
              <>
                {/* Overlay oscuro - Solo mobile */}
                {isMobile && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 bg-black/50 z-40"
                    onClick={() => setSidebarMobileOpen(false)}
                  />
                )}
                
                {/* Sidebar */}
                <motion.div 
                  className={`
                    ${isMobile 
                      ? 'fixed top-0 left-0 bottom-0 w-80 bg-white z-50 overflow-y-auto shadow-2xl' 
                      : 'lg:col-span-3'
                    }
                  `}
                  initial={{ x: isMobile ? -320 : -20, opacity: isMobile ? 1 : 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: isMobile ? -320 : 0, opacity: isMobile ? 1 : 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                >
                  {/* Botón cerrar - Solo mobile */}
                  {isMobile && (
                    <button
                      onClick={() => setSidebarMobileOpen(false)}
                      className="absolute top-4 right-4 z-10 min-w-[44px] min-h-[44px] w-11 h-11 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                  )}
                  
                  {/* Contenido del sidebar */}
                  <div className={`${isMobile ? 'p-4' : 'lg:sticky lg:top-24'} space-y-6`}>
                    <SidebarMD3
                      usuario={USUARIO_MOCK}
                      fotoPerfil={fotoPerfil}
                      previewFoto={previewFoto}
                      modoEdicion={vistaActual === 'perfil'}
                      onVerPerfil={() => {
                        handleVerPerfil();
                        if (isMobile) setSidebarMobileOpen(false);
                      }}
                      onSeleccionarFoto={handleSeleccionarFoto}
                    />

                    {/* Accesos Rápidos MD3 */}
                    <AccesosRapidosMD3 
                      onClickAcceso={isMobile ? () => setSidebarMobileOpen(false) : undefined}
                    />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* CONTENIDO PRINCIPAL - 9 columnas */}
          <motion.div 
            className="lg:col-span-9"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
          >
            <AnimatePresence mode="wait">
              {vistaActual === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className="space-y-6"
                >
                  {/* Estadísticas MD3 */}
                  <EstadisticasMD3 estadisticas={ESTADISTICAS} />

                  {/* Servicios MD3 */}
                  <ServiciosMD3
                    servicios={serviciosFiltrados}
                    categorias={CATEGORIAS}
                    categoriaActiva={categoriaActiva}
                    setCategoriaActiva={setCategoriaActiva}
                    vistaServicios={vistaServicios}
                    setVistaServicios={setVistaServicios}
                    busqueda={busqueda}
                    setBusqueda={setBusqueda}
                    onAbrirServicio={handleAbrirServicio}
                  />
                </motion.div>
              )}

              {vistaActual === 'servicio' && servicioActivo && (
                <motion.div
                  key="servicio"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                >
                  <PortalUsuarioAuditado onVolver={handleVolverDashboard} />
                </motion.div>
              )}

              {vistaActual === 'perfil' && (
                <motion.div
                  key="perfil"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                >
                  <PerfilUsuarioCompletoPT
                    usuario={USUARIO_MOCK}
                    onVolver={handleVolverDashboard}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Botón FAB para volver al dashboard - Solo visible si no estamos en dashboard */}
      <AnimatePresence>
        {vistaActual !== 'dashboard' && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={handleVolverDashboard}
            className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-[#2962FF] to-[#1E88E5] text-white rounded-full shadow-2xl hover:shadow-3xl flex items-center justify-center group transition-all hover:scale-110"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="Volver al Dashboard"
          >
            <svg 
              className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            
            {/* Tooltip */}
            <span className="absolute -top-12 right-0 bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Volver al Dashboard
              <span className="absolute bottom-0 right-6 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* FOOTER PORTAL TRANSACCIONAL (Simple y minimalista) */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="container mx-auto px-4 text-center">
          <ESAPLogo variant="white" className="h-12 w-auto mx-auto mb-4" />
          <p className="text-gray-400 text-sm">
            © 2026 ESAP - Escuela Superior de Administración Pública
          </p>
        </div>
      </footer>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTES MD3
// ════════════════════════════════════════════════════════════════════════════

function HeaderMD3({ 
  usuario, 
  fotoPerfil, 
  onLogout, 
  breadcrumbItems, 
  vistaActual 
}: { 
  usuario: UsuarioPortal; 
  fotoPerfil: string | null; 
  onLogout?: () => void;
  breadcrumbItems?: { label: string; onClick?: () => void; active?: boolean }[];
  vistaActual: 'dashboard' | 'servicio' | 'perfil';
}) {
  return (
    <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
              onClick={breadcrumbItems?.[0]?.onClick}
              className="cursor-pointer"
            >
              <ESAPLogo 
                variant="color"
                className="h-10 sm:h-11 w-auto"
              />
            </motion.div>
            <div className="hidden md:block border-l border-gray-300 pl-3">
              <p className="text-sm font-semibold text-gray-900">Portal Transaccional</p>
              <p className="text-xs text-gray-500">Control Interno de Gestión</p>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            {/* Búsqueda Global (Desktop) */}
            <div className="hidden lg:flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar en el portal..."
                  className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#2962FF]/20 focus:border-[#2962FF] focus:bg-white transition-all w-64 hover:bg-white"
                />
              </div>
            </div>

            {/* Notificaciones */}
            <motion.button 
              className="relative p-2.5 hover:bg-gray-100 rounded-full transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Bell className="w-5 h-5 text-gray-700" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#F57C00] rounded-full ring-2 ring-white"></span>
            </motion.button>

            {/* Configuración */}
            <motion.button 
              className="hidden sm:flex p-2.5 hover:bg-gray-100 rounded-full transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Settings className="w-5 h-5 text-gray-700" />
            </motion.button>

            {/* Divider */}
            <div className="w-px h-8 bg-gray-200 hidden sm:block" />

            {/* Usuario */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-gray-900">{usuario.nombre}</p>
                <p className="text-xs text-gray-600">{usuario.cargo}</p>
              </div>
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                {fotoPerfil || usuario.foto ? (
                  <img
                    src={fotoPerfil || usuario.foto || ''}
                    alt={usuario.nombre}
                    className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 shadow-sm"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2962FF] to-[#1e40af] flex items-center justify-center text-white font-semibold text-sm shadow-md">
                    {usuario.nombre.charAt(0)}{usuario.apellidos.charAt(0)}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Logout */}
            {onLogout && (
              <motion.button
                onClick={onLogout}
                className="p-2.5 hover:bg-red-50 text-red-600 rounded-full transition-colors"
                title="Cerrar sesión"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <LogOut className="w-5 h-5" />
              </motion.button>
            )}
          </div>
        </div>

        {/* Breadcrumb - Solo mostrar si no estamos en dashboard */}
        {breadcrumbItems && breadcrumbItems.length > 1 && vistaActual !== 'dashboard' && (
          <div className="border-t border-gray-200/50 py-3">
            <BreadcrumbNavegacion items={breadcrumbItems} />
          </div>
        )}
      </div>
    </div>
  );
}

function SidebarMD3({
  usuario,
  fotoPerfil,
  previewFoto,
  modoEdicion,
  onVerPerfil,
  onSeleccionarFoto
}: {
  usuario: UsuarioPortal;
  fotoPerfil: string | null;
  previewFoto: string | null;
  modoEdicion: boolean;
  onVerPerfil: () => void;
  onSeleccionarFoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <Card className="overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border-0">
      {/* Header con gradiente y avatar */}
      <div className="bg-gradient-to-br from-[#1e40af] via-[#2962FF] to-[#3b82f6] p-6 relative overflow-hidden">
        {/* Pattern de fondo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '24px 24px'
          }} />
        </div>

        {/* Avatar */}
        <div className="relative z-10 flex flex-col items-center">
          <motion.div 
            className="relative mb-3"
            whileHover={{ scale: modoEdicion ? 1.05 : 1 }}
            transition={{ duration: 0.2 }}
          >
            {previewFoto || fotoPerfil || usuario.foto ? (
              <img
                src={previewFoto || fotoPerfil || usuario.foto || ''}
                alt={usuario.nombre}
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-[#2962FF] text-2xl font-bold border-4 border-white shadow-xl">
                {usuario.nombre.charAt(0)}{usuario.apellidos.charAt(0)}
              </div>
            )}
            
            {modoEdicion && onSeleccionarFoto && (
              <label
                htmlFor="foto-sidebar-md3"
                className="absolute -bottom-1 -right-1 w-10 h-10 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center cursor-pointer shadow-lg border-2 border-[#2962FF] transition-all hover:scale-110"
                title="Cambiar foto"
              >
                <Camera className="w-5 h-5 text-[#2962FF]" />
                {!fotoPerfil && !previewFoto && !usuario.foto && (
                  <motion.span 
                    className="absolute -top-1 -right-1 w-3 h-3 bg-[#F57C00] rounded-full ring-2 ring-white"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
                <input
                  id="foto-sidebar-md3"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={onSeleccionarFoto}
                  className="hidden"
                />
              </label>
            )}
          </motion.div>
          
          <h3 className="font-bold text-white text-center mb-1">{usuario.nombre}</h3>
          <p className="text-sm text-white/90 text-center">{usuario.cargo}</p>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-5 space-y-4">
        {/* Botón Ver Perfil - MD3 Filled Button */}
        <motion.button
          onClick={onVerPerfil}
          className="w-full px-5 py-3 bg-[#2962FF] text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all relative overflow-hidden group"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <User className="w-4 h-4" />
            Ver perfil completo
          </span>
          <motion.div
            className="absolute inset-0 bg-white/10"
            initial={{ x: '-100%' }}
            whileHover={{ x: '100%' }}
            transition={{ duration: 0.5 }}
          />
        </motion.button>

        {/* Info de contacto compacta */}
        <div className="space-y-2.5 pt-3 border-t border-gray-100">
          <InfoItem icono={Mail} texto={usuario.email} />
          <InfoItem icono={Phone} texto={`Ext. ${usuario.extension}`} />
          <InfoItem icono={MapPin} texto={usuario.ubicacion} />
          <InfoItem icono={Briefcase} texto={usuario.area} />
        </div>

        {/* Badge de estado */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-green-700">Activo</span>
            </div>
            <span className="text-xs text-green-600">{usuario.antiguedad}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function InfoItem({ icono: Icono, texto }: { icono: any; texto: string }) {
  return (
    <div className="flex items-center gap-2.5 text-xs text-gray-600 hover:text-gray-900 transition-colors group">
      <Icono className="w-3.5 h-3.5 flex-shrink-0 group-hover:text-[#2962FF] transition-colors" />
      <span className="truncate">{texto}</span>
    </div>
  );
}

function EstadisticasMD3({ estadisticas }: { estadisticas: EstadisticaCard[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {estadisticas.map((stat, index) => (
        <motion.div
          key={stat.titulo}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.1, ease: [0.4, 0, 0.2, 1] }}
        >
          <EstadisticaCardMD3 {...stat} />
        </motion.div>
      ))}
    </div>
  );
}

function EstadisticaCardMD3({ titulo, valor, icono: Icono, color, cambio, tendencia }: EstadisticaCard) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="p-5 border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-gray-50 overflow-hidden relative group">
        {/* Background pattern */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-5 group-hover:opacity-10 transition-opacity">
          <Icono className="w-full h-full" style={{ color }} />
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md"
              style={{ backgroundColor: `${color}15` }}
            >
              <Icono className="w-6 h-6" style={{ color }} />
            </div>
            {tendencia && (
              <TendenciaIndicador tendencia={tendencia} />
            )}
          </div>

          {/* Valor */}
          <div className="mb-2">
            <p className="text-3xl font-bold text-gray-900">{valor}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-1">{titulo}</p>
          </div>

          {/* Cambio */}
          {cambio && (
            <p className="text-xs text-gray-600 flex items-center gap-1">
              <Info className="w-3 h-3" />
              {cambio}
            </p>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

function TendenciaIndicador({ tendencia }: { tendencia: 'up' | 'down' | 'neutral' }) {
  const config = {
    up: { color: '#00C853', rotate: 0 },
    down: { color: '#F44336', rotate: 180 },
    neutral: { color: '#FF9800', rotate: 90 }
  };

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <div 
        className="w-6 h-6 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${config[tendencia].color}15` }}
      >
        <TrendingUp 
          className="w-3.5 h-3.5" 
          style={{ 
            color: config[tendencia].color,
            transform: `rotate(${config[tendencia].rotate}deg)`
          }} 
        />
      </div>
    </motion.div>
  );
}

function ServiciosMD3({
  servicios,
  categorias,
  categoriaActiva,
  setCategoriaActiva,
  vistaServicios,
  setVistaServicios,
  busqueda,
  setBusqueda,
  onAbrirServicio
}: {
  servicios: ServicioPortal[];
  categorias: string[];
  categoriaActiva: string;
  setCategoriaActiva: (cat: string) => void;
  vistaServicios: 'grid' | 'list';
  setVistaServicios: (vista: 'grid' | 'list') => void;
  busqueda: string;
  setBusqueda: (val: string) => void;
  onAbrirServicio: (servicio: ServicioPortal) => void;
}) {
  return (
    <Card className="p-6 border-0 shadow-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#F57C00]" />
            Mis Servicios
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {servicios.length} servicio{servicios.length !== 1 ? 's' : ''} disponible{servicios.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Controles */}
        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => setVistaServicios('grid')}
            className={`p-2 rounded-lg transition-all ${
              vistaServicios === 'grid' 
                ? 'bg-[#2962FF] text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Grid3x3 className="w-4 h-4" />
          </motion.button>
          <motion.button
            onClick={() => setVistaServicios('list')}
            className={`p-2 rounded-lg transition-all ${
              vistaServicios === 'list' 
                ? 'bg-[#2962FF] text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <List className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Búsqueda y filtros */}
      <div className="space-y-4 mb-6">
        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar servicios..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-12 pr-4 h-12 rounded-xl border-gray-200 focus:border-[#2962FF] focus:ring-[#2962FF]/20"
          />
        </div>

        {/* Chips de categorías - MD3 Filter Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal className="w-4 h-4 text-gray-500" />
          {categorias.map((categoria) => (
            <motion.button
              key={categoria}
              onClick={() => setCategoriaActiva(categoria)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                categoriaActiva === categoria
                  ? 'bg-[#2962FF] text-white border-[#2962FF] shadow-md'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {categoria}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Grid de servicios */}
      <div className={vistaServicios === 'grid' 
        ? 'grid grid-cols-1 md:grid-cols-2 gap-4' 
        : 'space-y-3'
      }>
        {servicios.map((servicio, index) => (
          <motion.div
            key={servicio.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <ServicioCardMD3
              servicio={servicio}
              onClick={onAbrirServicio}
              vista={vistaServicios}
            />
          </motion.div>
        ))}
      </div>

      {servicios.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No se encontraron servicios</p>
        </div>
      )}
    </Card>
  );
}

function ServicioCardMD3({
  servicio,
  onClick,
  vista
}: {
  servicio: ServicioPortal;
  onClick: (servicio: ServicioPortal) => void;
  vista: 'grid' | 'list';
}) {
  const Icono = servicio.icono;
  
  const estadoConfig = {
    'Disponible': { color: '#00C853', bg: '#E8F5E9' },
    'Requiere atención': { color: '#F57C00', bg: '#FFF3E0' },
    'En proceso': { color: '#2962FF', bg: '#E3F2FD' },
    'Completado': { color: '#6200EA', bg: '#F3E5F5' }
  };

  const prioridadConfig = {
    alta: { color: '#F44336', label: 'Alta' },
    media: { color: '#FF9800', label: 'Media' },
    baja: { color: '#4CAF50', label: 'Baja' }
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: vista === 'grid' ? 1.02 : 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className="p-5 border-0 shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden relative group bg-gradient-to-br from-white to-gray-50"
        onClick={() => onClick(servicio)}
      >
        {/* Barra de prioridad (solo si existe) */}
        {servicio.prioridad && (
          <div 
            className="absolute top-0 left-0 right-0 h-1"
            style={{ backgroundColor: prioridadConfig[servicio.prioridad].color }}
          />
        )}

        <div className={vista === 'grid' ? 'space-y-3' : 'flex items-center gap-4'}>
          {/* Icono */}
          <div 
            className={`${vista === 'grid' ? 'w-14 h-14' : 'w-12 h-12'} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow`}
            style={{ backgroundColor: estadoConfig[servicio.estado].bg }}
          >
            <Icono 
              className={`${vista === 'grid' ? 'w-7 h-7' : 'w-6 h-6'}`}
              style={{ color: estadoConfig[servicio.estado].color }}
            />
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 mb-1 truncate group-hover:text-[#2962FF] transition-colors">
                  {servicio.titulo}
                </h3>
                <p className="text-xs text-gray-500 font-medium">{servicio.codigo}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#2962FF] group-hover:translate-x-1 transition-all flex-shrink-0" />
            </div>

            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{servicio.descripcion}</p>

            {/* Footer con badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge 
                className="text-xs px-2.5 py-1 rounded-full font-medium border"
                style={{ 
                  backgroundColor: estadoConfig[servicio.estado].bg,
                  color: estadoConfig[servicio.estado].color,
                  borderColor: estadoConfig[servicio.estado].color
                }}
              >
                {servicio.estado}
              </Badge>
              
              {servicio.badge && (
                <Badge className="bg-[#F57C00]/10 text-[#F57C00] border-[#F57C00]/20 text-xs px-2.5 py-1 rounded-full font-medium">
                  {servicio.badge}
                </Badge>
              )}

              {servicio.prioridad && (
                <div className="flex items-center gap-1 text-xs font-medium" style={{ color: prioridadConfig[servicio.prioridad].color }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: prioridadConfig[servicio.prioridad].color }} />
                  {prioridadConfig[servicio.prioridad].label}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ripple effect simulation */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-[#2962FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        />
      </Card>
    </motion.div>
  );
}

function PerfilMD3({
  usuario,
  fotoPerfil,
  previewFoto,
  onVolver,
  onSeleccionarFoto,
  onGuardarCambios,
  onEliminarFoto
}: {
  usuario: UsuarioPortal;
  fotoPerfil: string | null;
  previewFoto: string | null;
  onVolver: () => void;
  onSeleccionarFoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGuardarCambios: () => void;
  onEliminarFoto: () => void;
}) {
  // Estados locales para campos editables
  const [datosEditables, setDatosEditables] = useState({
    telefono: usuario.telefono,
    extension: usuario.extension,
    celular: '+57 310 555 7890',
    biografia: 'Funcionario comprometido con la excelencia en el servicio público y el control interno institucional.',
  });

  // Estados de privacidad para cada campo sensible
  const [privacidadDatos, setPrivacidadDatos] = useState<Record<string, boolean>>({
    telefono: false, // No público por defecto
    celular: false,
    email: true, // Público por defecto
    biografia: true,
    documentoNumero: false,
  });

  const [autoGuardando, setAutoGuardando] = useState(false);
  const [ultimoGuardado, setUltimoGuardado] = useState<Date>(new Date());

  // Auto-guardado
  useEffect(() => {
    const timer = setTimeout(() => {
      if (autoGuardando) {
        setAutoGuardando(false);
        setUltimoGuardado(new Date());
        toast.success('Cambios guardados automáticamente', { duration: 2000 });
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [autoGuardando]);

  const handleCambioDato = (campo: keyof typeof datosEditables, valor: string) => {
    setDatosEditables(prev => ({ ...prev, [campo]: valor }));
    setAutoGuardando(true);
  };

  const togglePrivacidad = (campo: string) => {
    setPrivacidadDatos(prev => ({
      ...prev,
      [campo]: !prev[campo]
    }));
    setAutoGuardando(true);
    toast.success(
      privacidadDatos[campo] ? 'Campo configurado como privado' : 'Campo configurado como público',
      { duration: 2000 }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 border-0 shadow-md">
        <button
          onClick={onVolver}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Volver al dashboard</span>
        </button>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <User className="w-6 h-6 text-[#2962FF]" />
            Mi Perfil
          </h1>
          
          {/* Indicador de guardado automático */}
          <div className="flex items-center gap-2 text-sm">
            {autoGuardando ? (
              <span className="text-[#F57C00] flex items-center gap-2">
                <div className="w-2 h-2 bg-[#F57C00] rounded-full animate-pulse" />
                Guardando...
              </span>
            ) : (
              <span className="text-green-600 flex items-center gap-2">
                <Check className="w-4 h-4" />
                Guardado {ultimoGuardado.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Preview de foto */}
      <AnimatePresence>
        {previewFoto && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <Card className="p-6 border-2 border-[#F57C00] bg-gradient-to-br from-orange-50 via-white to-yellow-50 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#F57C00] rounded-full flex items-center justify-center shadow-md">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Nueva foto seleccionada</h3>
                    <p className="text-sm text-gray-600">¿Te gusta cómo se ve?</p>
                  </div>
                </div>
                <motion.button 
                  onClick={onEliminarFoto} 
                  className="p-2 hover:bg-red-100 rounded-full transition-colors"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5 text-red-600" />
                </motion.button>
              </div>

              <div className="flex items-center gap-6">
                <motion.img
                  src={previewFoto}
                  alt="Preview"
                  className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-xl"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                />
                <motion.button
                  onClick={onGuardarCambios}
                  className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-semibold flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Check className="w-5 h-5" />
                  Sí, usar esta foto
                </motion.button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Información Personal - Campos NO editables */}
      <Card className="p-6 border-0 shadow-md">
        <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
          <Info className="w-5 h-5 text-[#2962FF]" />
          Información Personal
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-normal ml-2">
            Campos bloqueados
          </span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CampoPerfilBloqueadoMD3 
            label="Nombres" 
            value={usuario.nombre} 
            icono={User}
          />
          <CampoPerfilBloqueadoMD3 
            label="Apellidos" 
            value={usuario.apellidos} 
            icono={User}
          />
          <CampoPerfilBloqueadoMD3 
            label="Tipo de Documento" 
            value="Cédula de Ciudadanía" 
          />
          <CampoPerfilBloqueadoMD3 
            label="Número de Documento" 
            value="1012345678" 
            privado={!privacidadDatos.documentoNumero}
            onTogglePrivacidad={() => togglePrivacidad('documentoNumero')}
          />
          <CampoPerfilBloqueadoMD3 
            label="Email Institucional" 
            value={usuario.email} 
            icono={Mail}
            privado={!privacidadDatos.email}
            onTogglePrivacidad={() => togglePrivacidad('email')}
          />
        </div>
      </Card>

      {/* Información de Contacto - Campos EDITABLES */}
      <Card className="p-6 border-0 shadow-md">
        <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
          <Phone className="w-5 h-5 text-[#2962FF]" />
          Información de Contacto
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-normal ml-2">
            Editable
          </span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CampoPerfilEditableMD3
            label="Teléfono Fijo"
            value={datosEditables.telefono}
            onChange={(val) => handleCambioDato('telefono', val)}
            icono={Phone}
            privado={!privacidadDatos.telefono}
            onTogglePrivacidad={() => togglePrivacidad('telefono')}
          />
          <CampoPerfilEditableMD3
            label="Extensión"
            value={datosEditables.extension}
            onChange={(val) => handleCambioDato('extension', val)}
            placeholder="1234"
          />
          <CampoPerfilEditableMD3
            label="Celular"
            value={datosEditables.celular}
            onChange={(val) => handleCambioDato('celular', val)}
            icono={Phone}
            privado={!privacidadDatos.celular}
            onTogglePrivacidad={() => togglePrivacidad('celular')}
            className="sm:col-span-2"
          />
        </div>
      </Card>

      {/* Biografía - Campo EDITABLE */}
      <Card className="p-6 border-0 shadow-md">
        <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#2962FF]" />
          Biografía Profesional
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-normal ml-2">
            Editable
          </span>
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700">
              Describe brevemente tu trayectoria profesional
            </label>
            <button
              onClick={() => togglePrivacidad('biografia')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border"
              style={{
                backgroundColor: privacidadDatos.biografia ? '#E3F2FD' : '#FFEBEE',
                color: privacidadDatos.biografia ? '#2962FF' : '#F44336',
                borderColor: privacidadDatos.biografia ? '#2962FF' : '#F44336'
              }}
            >
              {privacidadDatos.biografia ? (
                <>
                  <Eye className="w-4 h-4" />
                  Público
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4" />
                  Privado
                </>
              )}
            </button>
          </div>
          <textarea
            value={datosEditables.biografia}
            onChange={(e) => handleCambioDato('biografia', e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#2962FF] focus:ring-2 focus:ring-[#2962FF]/20 transition-all text-sm resize-none"
            placeholder="Cuéntanos sobre tu experiencia y áreas de especialización..."
          />
          <p className="text-xs text-gray-500">
            {datosEditables.biografia.length} / 500 caracteres
          </p>
        </div>
      </Card>

      {/* Información Laboral */}
      <Card className="p-6 border-0 shadow-md">
        <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-[#2962FF]" />
          Información Laboral
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CampoPerfilBloqueadoMD3 label="Cargo" value={usuario.cargo} />
          <CampoPerfilBloqueadoMD3 label="Área" value={usuario.area} />
          <CampoPerfilBloqueadoMD3 label="Dependencia" value={usuario.dependencia} />
          <CampoPerfilBloqueadoMD3 label="Ubicación" value={usuario.ubicacion} icono={MapPin} />
        </div>
      </Card>

      {/* Información de Privacidad */}
      <Card className="p-6 border-0 shadow-md bg-gradient-to-br from-blue-50 to-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-[#2962FF] rounded-full flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 mb-2">Control de Privacidad</h3>
            <p className="text-sm text-gray-600 mb-4">
              Los campos marcados como <strong>públicos</strong> serán visibles para otros usuarios de la plataforma. 
              Los campos <strong>privados</strong> solo serán visibles para ti y los administradores.
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Lock className="w-4 h-4" />
              Tu información está protegida según la Ley 1581 de 2012 de protección de datos personales.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function CampoPerfilMD3({ label, value, icono: Icono }: { label: string; value: string; icono?: any }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        {Icono && <Icono className="w-4 h-4 text-[#2962FF]" />}
        {label}
      </label>
      <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 font-medium hover:bg-gray-100 transition-colors">
        {value}
      </div>
    </div>
  );
}

// Componente para campos NO editables (bloqueados)
function CampoPerfilBloqueadoMD3({ 
  label, 
  value, 
  icono: Icono,
  privado,
  onTogglePrivacidad
}: { 
  label: string; 
  value: string; 
  icono?: any;
  privado?: boolean;
  onTogglePrivacidad?: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          {Icono && <Icono className="w-4 h-4 text-[#2962FF]" />}
          {label}
          <Lock className="w-3 h-3 text-gray-400" title="Campo bloqueado" />
        </label>
        {onTogglePrivacidad && (
          <button
            onClick={onTogglePrivacidad}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title={privado ? "Hacer público" : "Hacer privado"}
          >
            {privado ? (
              <EyeOff className="w-4 h-4 text-gray-500" />
            ) : (
              <Eye className="w-4 h-4 text-[#2962FF]" />
            )}
          </button>
        )}
      </div>
      <div className="px-4 py-3 bg-gray-100 border-2 border-gray-300 rounded-xl text-sm text-gray-700 font-medium cursor-not-allowed opacity-75">
        {value}
      </div>
    </div>
  );
}

// Componente para campos EDITABLES
function CampoPerfilEditableMD3({ 
  label, 
  value, 
  onChange,
  icono: Icono,
  privado,
  onTogglePrivacidad,
  placeholder,
  className
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void;
  icono?: any;
  privado?: boolean;
  onTogglePrivacidad?: () => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className || ''}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          {Icono && <Icono className="w-4 h-4 text-[#2962FF]" />}
          {label}
        </label>
        {onTogglePrivacidad && (
          <button
            onClick={onTogglePrivacidad}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors border"
            style={{
              backgroundColor: privado ? '#FFEBEE' : '#E3F2FD',
              color: privado ? '#F44336' : '#2962FF',
              borderColor: privado ? '#F44336' : '#2962FF'
            }}
          >
            {privado ? (
              <>
                <EyeOff className="w-3 h-3" />
                Privado
              </>
            ) : (
              <>
                <Eye className="w-3 h-3" />
                Público
              </>
            )}
          </button>
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#2962FF] focus:ring-2 focus:ring-[#2962FF]/20 transition-all text-sm font-medium hover:border-gray-300"
      />
    </div>
  );
}

function AccesosRapidosMD3({ onClickAcceso }: { onClickAcceso?: () => void }) {
  // Programas internos de ESAP para acceso rápido
  const accesos = [
    {
      id: 'correo',
      titulo: 'Correo Electrónico',
      descripcion: 'Acceso al correo institucional',
      icono: Mail,
      color: '#2962FF',
      bgColor: '#E3F2FD',
      url: 'https://outlook.office.com/',
      externo: true
    },
    {
      id: 'humanosoft',
      titulo: 'HumanoSoft',
      descripcion: 'Sistema de gestión de recurso humano',
      icono: UserCog,
      color: '#F57C00',
      bgColor: '#FFF3E0',
      url: '#',
      externo: true
    },
    {
      id: 'arca',
      titulo: 'ARCA',
      descripcion: 'Sistema académico y de gestión estudiantil',
      icono: Database,
      color: '#00C853',
      bgColor: '#E8F5E9',
      url: '#',
      externo: true
    },
  ];

  const handleClick = (acceso: typeof accesos[0]) => {
    // Cerrar sidebar mobile si está abierto
    onClickAcceso?.();
    
    if (acceso.externo && acceso.url !== '#') {
      window.open(acceso.url, '_blank', 'noopener,noreferrer');
    } else if (acceso.url !== '#') {
      window.location.href = acceso.url;
    } else {
      toast.info(`${acceso.titulo} próximamente`, {
        description: 'Esta funcionalidad estará disponible pronto'
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2962FF] to-[#1e40af] px-5 py-4">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Acceso Rápido
          </h3>
          <p className="text-xs text-white/80 mt-0.5">Aplicativos institucionales</p>
        </div>

        {/* Grid de accesos */}
        <div className="p-4 space-y-2">
          {accesos.map((acceso, index) => {
            const IconoAcceso = acceso.icono;
            return (
              <motion.button
                key={acceso.id}
                onClick={() => handleClick(acceso)}
                className="w-full text-left p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 group relative overflow-hidden"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-3 relative z-10">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow"
                    style={{ backgroundColor: acceso.bgColor }}
                  >
                    <IconoAcceso className="w-5 h-5" style={{ color: acceso.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-gray-900 text-sm truncate group-hover:text-[#2962FF] transition-colors">
                        {acceso.titulo}
                      </p>
                      {acceso.externo && acceso.url !== '#' && (
                        <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-[#2962FF] flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{acceso.descripcion}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#2962FF] group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>

                {/* Hover effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-[#2962FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                  initial={false}
                />
              </motion.button>
            );
          })}
        </div>

        {/* Footer con badge */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-600 flex items-center gap-1.5">
            <Info className="w-3 h-3" />
            {accesos.length} aplicativo{accesos.length !== 1 ? 's' : ''} disponible{accesos.length !== 1 ? 's' : ''}
          </p>
        </div>
      </Card>
    </motion.div>
  );
}