/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PORTAL TRANSACCIONAL - USUARIO AUDITADO
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Portal principal para usuarios externos/funcionarios que acceden a servicios
 * del Control Interno de Gestión y otros módulos.
 * 
 * Características:
 * - Dashboard con perfil y estadísticas del usuario
 * - Navegación por servicios (Control Interno, Disciplinario, RRHH, Documentos)
 * - Integración con PortalUsuarioAuditado
 * - Actividad de la comunidad
 * - Notificaciones y acceso rápido
 * 
 * USUARIO ASIGNADO: funcionario@esap.edu.co
 * 
 * VERSIÓN: 2.0
 * FECHA: 4 Enero 2026
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Phone, MapPin, Briefcase, Calendar, Clock,
  FileText, CheckCircle2, AlertCircle, TrendingUp,
  Bell, Search, Settings, LogOut, Shield, Scale,
  Users, Folder, ChevronRight, Activity, MessageSquare,
  ThumbsUp, Share2, Eye, ArrowLeft, Grid3x3, List,
  Mail, GraduationCap, BookOpen, Archive, ExternalLink, Rss,
  Lock, Unlock, EyeOff, Globe
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { PortalUsuarioAuditado } from './PortalUsuarioAuditado';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

interface UsuarioPortal {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  tipoDocumento: string;
  numeroDocumento: string;
  cargo: string;
  area: string;
  dependencia: string;
  telefono: string;
  extension: string;
  ubicacion: string;
  jefeInmediato: string;
  tipoContrato: string;
  antiguedad: string;
  horario: string;
  oficina: string;
  foto?: string;
  // Datos adicionales para perfil completo
  fechaNacimiento?: string;
  genero?: string;
  estadoCivil?: string;
  direccionResidencia?: string;
  ciudadResidencia?: string;
  telefonoPersonal?: string;
  contactoEmergencia?: string;
  telefonoEmergencia?: string;
  nivelEducativo?: string;
  profesion?: string;
  eps?: string;
  arl?: string;
  fondoPension?: string;
  fechaIngreso?: string;
  salario?: string;
  numeroCuenta?: string;
  banco?: string;
}

interface EstadisticaPortal {
  titulo: string;
  valor: number | string;
  total?: number;
  icono: any;
  color: string;
  estado?: 'normal' | 'alerta' | 'critico';
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
  icono: any;
  color: string;
}

interface ActividadComunidad {
  id: string;
  tipo: 'post' | 'evento' | 'notificacion';
  titulo: string;
  descripcion: string;
  fecha: string;
  autor?: string;
  likes?: number;
  comentarios?: number;
  icono: any;
  color: string;
}

// ════════════════════════════════════════════════════════════════════════════
// DATOS MOCK
// ════════════════════════════════════════════════════════════════════════════

const USUARIO_MOCK: UsuarioPortal = {
  id: 'func-001',
  nombre: 'Diego',
  apellidos: 'Trujillo',
  email: 'funcionario@esap.edu.co',
  tipoDocumento: 'CC',
  numeroDocumento: '1234567890',
  cargo: 'Administrativo',
  area: 'Planeación',
  dependencia: 'Oficina de Control Interno',
  telefono: '+57 601 234 5678',
  extension: '1234',
  ubicacion: 'Bogotá',
  jefeInmediato: 'Dr. García',
  tipoContrato: 'Indefinido',
  antiguedad: '5 años',
  horario: '8:00 - 17:00',
  oficina: 'Piso 3, OF. 301',
  // Datos adicionales completos
  fechaNacimiento: '15/03/1985',
  genero: 'Masculino',
  estadoCivil: 'Casado',
  direccionResidencia: 'Calle 45 # 23-67, Apto 501',
  ciudadResidencia: 'Bogotá D.C.',
  telefonoPersonal: '+57 301 234 5678',
  contactoEmergencia: 'María Trujillo (Esposa)',
  telefonoEmergencia: '+57 302 345 6789',
  nivelEducativo: 'Profesional',
  profesion: 'Administrador Público',
  eps: 'Compensar',
  arl: 'Positiva',
  fondoPension: 'Protección',
  fechaIngreso: '01/01/2020',
  salario: '$4.500.000',
  numeroCuenta: '****1234',
  banco: 'Bancolombia'
};

const SERVICIOS_MOCK: ServicioPortal[] = [
  {
    id: 'control-interno-gestion',
    codigo: 'OCIG',
    titulo: 'Control Interno de Gestión',
    descripcion: 'Auditorías y seguimiento de controles administrativos',
    categoria: 'Control Interno de Gestión',
    estado: 'Requiere atención',
    badge: 'Gestión',
    pendientes: 2,
    icono: Shield,
    color: '#2962FF'
  },
  {
    id: 'plan-mejoramiento',
    codigo: 'PMI',
    titulo: 'Plan de Mejoramiento',
    descripcion: 'Seguimiento a planes de mejoramiento institucional',
    categoria: 'Control Interno de Gestión',
    estado: 'Disponible',
    badge: 'Gestión',
    icono: TrendingUp,
    color: '#00C853'
  },
  {
    id: 'control-disciplinario',
    codigo: 'CD',
    titulo: 'Control Interno Disciplinario',
    descripcion: 'Procesos disciplinarios y seguimiento',
    categoria: 'Control Interno Disciplinario',
    estado: 'Disponible',
    badge: 'Disciplinario',
    icono: Scale,
    color: '#F57C00'
  },
  {
    id: 'rrhh',
    codigo: 'RRHH',
    titulo: 'Recursos Humanos',
    descripcion: 'Gestión de solicitudes y trámites de personal',
    categoria: 'RRHH',
    estado: 'Disponible',
    badge: 'RRHH',
    icono: Users,
    color: '#7B1FA2'
  },
  {
    id: 'documentos',
    codigo: 'DOC',
    titulo: 'Gestión Documental',
    descripcion: 'Consulta y gestión de documentos institucionales',
    categoria: 'Documentos',
    estado: 'Disponible',
    badge: 'Documentos',
    icono: Folder,
    color: '#0097A7'
  }
];

const ACTIVIDADES_COMUNIDAD: ActividadComunidad[] = [
  {
    id: 'act-001',
    tipo: 'post',
    titulo: 'ESAP Comunicaciones',
    descripcion: 'Felicitamos a nuestros estudiantes de Administración Pública por su participación en el Foro Internacional de Políticas Públicas para la comunidad...',
    fecha: 'Hace 1 hora',
    autor: 'Oficina de Comunicaciones Institucionales',
    likes: 45,
    comentarios: 8,
    icono: MessageSquare,
    color: '#2962FF'
  },
  {
    id: 'act-002',
    tipo: 'evento',
    titulo: 'ESAP Comunicaciones',
    descripcion: 'Recordatorio: Conferencia sobre "Transformación Digital en el Sector Público" este viernes 27 de diciembre a las 10:00 AM. Inscripciones...',
    fecha: 'Hace 2 horas',
    autor: 'Oficina de Comunicaciones Institucionales',
    likes: 26,
    comentarios: 12,
    icono: Calendar,
    color: '#7B1FA2'
  },
  {
    id: 'act-003',
    tipo: 'notificacion',
    titulo: 'ESAP Comunicaciones',
    descripcion: 'Felicitaciones a nuestro egresado Carlos Méndez Romero (2020), nombrado Director de Gestión Pública en la Alcaldía de Medellín. ¡Orgullo ESAP!',
    fecha: 'Hace 3 horas',
    autor: 'Oficina de Comunicaciones Institucionales',
    likes: 156,
    comentarios: 24,
    icono: ThumbsUp,
    color: '#00C853'
  }
];

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

interface PortalTransaccionalUsuarioProps {
  onLogout?: () => void;
}

export function PortalTransaccionalUsuario({ onLogout }: PortalTransaccionalUsuarioProps) {
  const [vistaActual, setVistaActual] = useState<'dashboard' | 'servicio' | 'perfil'>('dashboard');
  const [servicioActivo, setServicioActivo] = useState<ServicioPortal | null>(null);
  const [categoriaActiva, setCategoriaActiva] = useState<string>('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [vistaServicio, setVistaServicio] = useState<'grid' | 'lista'>('grid');

  const categorias = ['Todos', 'Control Interno de Gestión', 'Control Interno Disciplinario', 'RRHH', 'Documentos'];

  const serviciosFiltrados = SERVICIOS_MOCK.filter(servicio => {
    const matchCategoria = categoriaActiva === 'Todos' || servicio.categoria === categoriaActiva;
    const matchBusqueda = servicio.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
                          servicio.descripcion.toLowerCase().includes(busqueda.toLowerCase());
    return matchCategoria && matchBusqueda;
  });

  const handleAbrirServicio = (servicio: ServicioPortal) => {
    setServicioActivo(servicio);
    setVistaActual('servicio');
  };

  const handleVolverDashboard = () => {
    setVistaActual('dashboard');
    setServicioActivo(null);
  };

  const handleVerPerfilCompleto = () => {
    setVistaActual('perfil');
  };

  // Vista principal del Dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <HeaderPortal usuario={USUARIO_MOCK} onLogout={onLogout} />

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* SIDEBAR IZQUIERDO - Información del Usuario */}
          <div className="space-y-6">
            <SidebarUsuario usuario={USUARIO_MOCK} onVerPerfilCompleto={handleVerPerfilCompleto} />
            <AccesoRapidoPanel />
          </div>

          {/* COLUMNA PRINCIPAL - 2 columnas - CAMBIA SEGÚN LA VISTA */}
          <div className="lg:col-span-2 space-y-6">
            {vistaActual === 'dashboard' && (
              <>
                {/* ESTADÍSTICAS */}
                <EstadisticasUsuario />

                {/* MIS SERVICIOS */}
                <ServiciosPanel
                  categorias={categorias}
                  categoriaActiva={categoriaActiva}
                  setCategoriaActiva={setCategoriaActiva}
                  busqueda={busqueda}
                  setBusqueda={setBusqueda}
                  vistaServicio={vistaServicio}
                  setVistaServicio={setVistaServicio}
                  serviciosFiltrados={serviciosFiltrados}
                  handleAbrirServicio={handleAbrirServicio}
                />
              </>
            )}

            {vistaActual === 'perfil' && (
              <PerfilCompletoPanel usuario={USUARIO_MOCK} onVolver={handleVolverDashboard} />
            )}

            {vistaActual === 'servicio' && servicioActivo && (
              <ServicioDetallePanel 
                servicio={servicioActivo} 
                onVolver={handleVolverDashboard}
              />
            )}
          </div>

          {/* COLUMNA DERECHA - Actividad - 1 columna - SIEMPRE VISIBLE */}
          <div className="lg:col-span-1">
            <ActividadComunidadPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTES
// ════════════════════════════════════════════════════════════════════════════

function HeaderPortal({ usuario, onLogout }: { usuario: UsuarioPortal; onLogout?: () => void }) {
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo ESAP */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-[#1e5da8] to-[#2a6dbd] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">ESAP</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold text-gray-900">Escuela Superior de</h1>
                <h2 className="text-xs text-gray-600">Administración Pública</h2>
              </div>
            </div>
          </div>

          {/* Búsqueda y Usuario */}
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar servicios, trámites..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>
            </div>

            {/* Notificaciones */}
            <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Usuario */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-gray-900">{usuario.nombre}</p>
                <p className="text-xs text-gray-600">{usuario.cargo}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                {usuario.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
            </div>

            {/* Logout */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-5 h-5 text-gray-600" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EstadisticasUsuario() {
  const estadisticas: EstadisticaPortal[] = [
    {
      titulo: 'PROCESOS ACTIVOS',
      valor: 5,
      icono: Activity,
      color: '#3B82F6',
      estado: 'normal'
    },
    {
      titulo: 'AUDITORÍAS PENDIENTES',
      valor: 2,
      icono: AlertCircle,
      color: '#FF9800',
      estado: 'alerta'
    },
    {
      titulo: 'TAREAS DEL MES',
      valor: '24/30',
      icono: CheckCircle2,
      color: '#4CAF50',
      estado: 'normal'
    },
    {
      titulo: 'DOCUMENTOS PROCESADOS',
      valor: 48,
      icono: FileText,
      color: '#6366F1',
      estado: 'normal'
    }
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {estadisticas.map((stat) => (
        <Card key={stat.titulo} className="p-5 hover:shadow-md transition-shadow bg-white">
          {/* Título e ícono */}
          <div className="flex items-start justify-between mb-6">
            <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-wide leading-tight pr-2">
              {stat.titulo}
            </h3>
            <stat.icono className="w-5 h-5 flex-shrink-0" style={{ color: stat.color }} />
          </div>
          
          {/* Número grande centrado */}
          <div className="flex items-center justify-center">
            <p className="text-5xl font-bold text-gray-900">{stat.valor}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

function TarjetaServicio({ servicio, onClick }: { servicio: ServicioPortal; onClick: () => void }) {
  const esControlInterno = servicio.id === 'control-interno-gestion';
  
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <Card
        className={`p-5 cursor-pointer hover:shadow-lg transition-all ${
          esControlInterno ? 'border-2 border-red-500' : 'border border-gray-200'
        }`}
        onClick={onClick}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <servicio.icono className="w-6 h-6 text-gray-600" />
          </div>
          {servicio.badge && (
            <Badge className="bg-blue-100 text-blue-700 border-0 text-[11px] px-2.5 py-0.5 font-medium">
              {servicio.badge}
            </Badge>
          )}
        </div>

        <h3 className="font-bold text-gray-900 mb-2 text-sm leading-tight">{servicio.titulo}</h3>
        <p className="text-xs text-gray-600 mb-4 leading-relaxed">{servicio.descripcion}</p>

        <div className="space-y-2">
          {servicio.pendientes !== undefined && servicio.pendientes > 0 && (
            <p className="text-xs text-gray-700">
              Auditorías pendientes: <span className="font-bold">{servicio.pendientes}</span>
            </p>
          )}

          {servicio.estado === 'Requiere atención' && (
            <Badge className="bg-orange-100 text-orange-700 border-0 text-[11px] px-2.5 py-1 font-medium">
              Requiere atención
            </Badge>
          )}

          {servicio.estado === 'Disponible' && !servicio.pendientes && (
            <Badge className="bg-green-100 text-green-700 border-0 text-[11px] px-2.5 py-1 font-medium">
              Disponible
            </Badge>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

function ActividadComunidadPanel() {
  const actividadesConIconos = [
    {
      id: 'act-001',
      titulo: 'ESAP Comunicaciones',
      autor: 'Oficina de Comunicaciones Institucionales',
      descripcion: 'Felicitamos a nuestros estudiantes de Administración Pública por su participación en el Foro Internacional de Políticas Públicas para la comunidad...',
      fecha: 'Hace 1 día',
      likes: 45,
      comentarios: 8,
      icono: Rss,
      iconColor: '#FF9800'
    },
    {
      id: 'act-002',
      titulo: 'ESAP Comunicaciones',
      autor: 'Oficina de Comunicaciones Institucionales',
      descripcion: 'Recordatorio: Conferencia sobre "Transformación Digital en el Sector Público" este viernes 27 de diciembre a las 10:00 AM. Inscripciones...',
      fecha: 'Hace 5 hrs',
      likes: 26,
      comentarios: 12,
      icono: FileText,
      iconColor: '#9C27B0'
    },
    {
      id: 'act-003',
      titulo: 'ESAP Comunicaciones',
      autor: 'Oficina de Comunicaciones Institucionals',
      descripcion: 'Felicitaciones a nuestro egresado Carlos Méndez Romero (Promoción 2020), nombrado Director de Gestión Pública en la Alcaldía de Medellín. ¡Orgullo ESAP!',
      fecha: 'Hace 1 día',
      likes: 156,
      comentarios: 24,
      icono: BookOpen,
      iconColor: '#4CAF50'
    }
  ];

  return (
    <Card className="p-5 sticky top-24">
      <div className="flex items-center gap-2 mb-5">
        <Rss className="w-4 h-4 text-[#2962FF]" />
        <h2 className="text-sm font-bold text-gray-900">Actividad de la Comunidad</h2>
      </div>

      <div className="space-y-4">
        {actividadesConIconos.map((actividad) => (
          <div key={actividad.id} className="pb-4 border-b border-gray-100 last:border-0">
            <div className="flex items-start gap-3">
              {/* Avatar circular azul "ES" */}
              <div className="w-10 h-10 rounded-full bg-[#2962FF] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                ES
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-gray-900">{actividad.titulo}</h3>
                    <p className="text-xs text-gray-600">{actividad.autor}</p>
                  </div>
                  
                  {/* Ícono de color a la derecha */}
                  <div 
                    className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${actividad.iconColor}15` }}
                  >
                    <actividad.icono className="w-4 h-4" style={{ color: actividad.iconColor }} />
                  </div>
                </div>

                <p className="text-xs text-gray-700 mb-2 line-clamp-2 leading-relaxed">{actividad.descripcion}</p>

                {/* Footer con likes, comentarios y fecha */}
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" />
                    <span>{actividad.likes}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    <span>{actividad.comentarios}</span>
                  </div>
                  <button className="ml-auto hover:text-gray-700 transition-colors">
                    <Share2 className="w-3 h-3" />
                  </button>
                </div>

                <p className="text-xs text-gray-400 mt-1.5">{actividad.fecha}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 text-center">
        <button className="text-xs text-[#2962FF] hover:text-[#1e4fc9] font-medium transition-colors">
          Ver más publicaciones →
        </button>
      </div>
    </Card>
  );
}

function SidebarUsuario({ usuario, onVerPerfilCompleto }: { usuario: UsuarioPortal; onVerPerfilCompleto: () => void }) {
  return (
    <Card className="p-0 sticky top-24 overflow-hidden shadow-lg z-20">
      {/* Header azul con avatar */}
      <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 px-6 pt-8 pb-6 text-center">
        <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-blue-600 text-2xl font-bold mx-auto mb-4 shadow-md">
          DI
        </div>
        <h3 className="text-base font-bold text-white mb-1">{usuario.nombre}</h3>
        <p className="text-sm text-white mb-1">{usuario.cargo}</p>
        <p className="text-xs text-white/90">{usuario.email}</p>
      </div>

      {/* Contenido del perfil */}
      <div className="px-6 py-4">
        <button 
          onClick={onVerPerfilCompleto}
          className="w-full px-4 py-2.5 text-sm font-semibold bg-[#5B7FE8] text-white rounded-lg hover:bg-[#4169E1] transition-colors mb-4"
        >
          Ver perfil completo
        </button>

        {/* CONTACTO */}
        <div className="border-t border-gray-200 pt-3 mb-3">
          <h4 className="text-xs font-bold text-gray-900 mb-2.5 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" />
            CONTACTO
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Teléfono</span>
              <span className="text-gray-900 font-medium">+57 301 234 5678</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Extensión</span>
              <span className="text-gray-900 font-medium">1234</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Ubicación</span>
              <span className="text-gray-900 font-medium flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Bogotá
              </span>
            </div>
          </div>
        </div>

        {/* INFORMACIÓN LABORAL */}
        <div className="border-t border-gray-200 pt-3">
          <h4 className="text-xs font-bold text-gray-900 mb-2.5 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5" />
            INFORMACIÓN LABORAL
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Cargo</span>
              <span className="text-gray-900 font-medium text-right">Funcionario Administrativo</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Área</span>
              <span className="text-gray-900 font-medium">Planeación</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Dependencia</span>
              <span className="text-gray-900 font-medium text-right">Oficina de Control Interno</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Jefe inmediato</span>
              <span className="text-gray-900 font-medium">Dr. García</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Tipo contrato</span>
              <span className="text-gray-900 font-medium">Indefinido</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Antigüedad</span>
              <span className="text-gray-900 font-medium">5 años</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Horario</span>
              <span className="text-gray-900 font-medium">8:00 - 17:00</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Oficina</span>
              <span className="text-gray-900 font-medium">Piso 3, Of. 301</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function AccesoRapidoPanel() {
  return (
    <Card className="p-5">
      <h2 className="text-sm font-bold text-gray-900 mb-3">Acceso Rápido</h2>
      <div className="grid grid-cols-2 gap-4">
        <button className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
          <FileText className="w-4 h-4" />
          Documentos
        </button>
        <button className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
          <Users className="w-4 h-4" />
          RRHH
        </button>
        <button className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
          <Scale className="w-4 h-4" />
          Disciplinario
        </button>
        <button className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
          <Shield className="w-4 h-4" />
          Control Interno
        </button>
      </div>
    </Card>
  );
}

function ServiciosPanel({
  categorias,
  categoriaActiva,
  setCategoriaActiva,
  busqueda,
  setBusqueda,
  vistaServicio,
  setVistaServicio,
  serviciosFiltrados,
  handleAbrirServicio
}: {
  categorias: string[];
  categoriaActiva: string;
  setCategoriaActiva: (categoria: string) => void;
  busqueda: string;
  setBusqueda: (busqueda: string) => void;
  vistaServicio: 'grid' | 'lista';
  setVistaServicio: (vista: 'grid' | 'lista') => void;
  serviciosFiltrados: ServicioPortal[];
  handleAbrirServicio: (servicio: ServicioPortal) => void;
}) {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Mis Servicios</h2>
        <p className="text-sm text-gray-600">
          Accede a todos los servicios disponibles para tu rol
        </p>
      </div>

      {/* BÚSQUEDA */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar servicios, trámites..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* TABS DE CATEGORÍAS */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaActiva(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                categoriaActiva === cat
                  ? 'bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        
        {/* Botones de vista Grid/Lista */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 flex-shrink-0">
          <button
            onClick={() => setVistaServicio('grid')}
            className={`p-2 rounded-md transition-colors ${
              vistaServicio === 'grid' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            title="Vista en cuadrícula"
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setVistaServicio('lista')}
            className={`p-2 rounded-md transition-colors ${
              vistaServicio === 'lista' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            title="Vista en lista"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* GRID DE SERVICIOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {serviciosFiltrados.map((servicio) => (
          <TarjetaServicio
            key={servicio.id}
            servicio={servicio}
            onClick={() => handleAbrirServicio(servicio)}
          />
        ))}
      </div>

      {serviciosFiltrados.length === 0 && (
        <div className="text-center py-12">
          <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No se encontraron servicios
          </h3>
          <p className="text-sm text-gray-600">
            Intenta con otros términos de búsqueda
          </p>
        </div>
      )}
    </Card>
  );
}

function PerfilCompletoPanel({ usuario, onVolver }: { usuario: UsuarioPortal; onVolver: () => void }) {
  const [modoEdicion, setModoEdicion] = useState(false);
  
  // Estado de privacidad - qué información es visible en la comunidad
  const [privacidad, setPrivacidad] = useState({
    nombre: true,
    cargo: true,
    area: true,
    ubicacion: true,
    telefono: false,
    extension: true,
    email: true,
    nivelEducativo: true,
    profesion: true,
    antiguedad: true,
    foto: true
  });

  const handleTogglePrivacidad = (campo: string) => {
    setPrivacidad(prev => ({ ...prev, [campo]: !prev[campo] }));
    toast.success(`Configuración de privacidad actualizada`, {
      description: `Tu ${campo} ahora es ${!privacidad[campo as keyof typeof privacidad] ? 'visible' : 'privado'} en la comunidad`
    });
  };

  const handleGuardarCambios = () => {
    toast.success('Cambios guardados exitosamente');
    setModoEdicion(false);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onVolver}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Volver a Dashboard</span>
          </button>

          <button
            onClick={() => setModoEdicion(!modoEdicion)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Settings className="w-4 h-4" />
            {modoEdicion ? 'Cancelar edición' : 'Editar perfil'}
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Perfil Completo</h1>
        <p className="text-sm text-gray-600 mb-6">Información detallada del funcionario</p>

        {/* Card azul con información principal */}
        <div className="bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-blue-600 text-2xl font-bold">
                {usuario.nombre.charAt(0)}{usuario.apellidos.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-1">
                  {usuario.nombre} {usuario.apellidos}
                </h2>
                <p className="text-white/90 text-sm">{usuario.cargo}</p>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border border-white/30 backdrop-blur-sm">
              Funcionario
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/20">
            <div>
              <p className="text-white/80 text-xs mb-1">Antigüedad</p>
              <p className="text-2xl font-bold text-white">{usuario.antiguedad}</p>
            </div>
            <div>
              <p className="text-white/80 text-xs mb-1">Área</p>
              <p className="text-base font-semibold text-white">{usuario.area}</p>
            </div>
            <div>
              <p className="text-white/80 text-xs mb-1">Tipo Contrato</p>
              <p className="text-base font-semibold text-white">{usuario.tipoContrato}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* INFORMACIÓN PERSONAL - NO EDITABLE */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-bold text-gray-900">Información Personal</h3>
          <Badge className="ml-2 bg-gray-100 text-gray-700 border-0 text-xs">
            🔒 No editable
          </Badge>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Datos personales de identificación (protegidos y no modificables)
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Nombre</label>
            <Input 
              value={usuario.nombre} 
              disabled 
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Apellidos</label>
            <Input 
              value={usuario.apellidos} 
              disabled 
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Tipo de Documento</label>
            <Input 
              value={usuario.tipoDocumento} 
              disabled 
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Número de Documento</label>
            <Input 
              value={usuario.numeroDocumento} 
              disabled 
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Correo Electrónico Institucional</label>
            <Input 
              value={usuario.email} 
              disabled 
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Fecha de Nacimiento</label>
            <Input 
              value={usuario.fechaNacimiento || 'No registrado'} 
              disabled 
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Género</label>
            <Input 
              value={usuario.genero || 'No registrado'} 
              disabled 
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Estado Civil</label>
            <Input 
              value={usuario.estadoCivil || 'No registrado'} 
              disabled 
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
        </div>
      </Card>

      {/* INFORMACIÓN DE CONTACTO - EDITABLE */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Phone className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">Información de Contacto</h3>
          <Badge className="ml-2 bg-blue-100 text-blue-700 border-0 text-xs">
            ✏️ Editable
          </Badge>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Datos de contacto que puedes actualizar
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Teléfono Personal</label>
            <Input 
              value={usuario.telefonoPersonal || ''} 
              disabled={!modoEdicion}
              className={modoEdicion ? '' : 'bg-gray-50'}
              placeholder="Ingresa tu teléfono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Teléfono Laboral</label>
            <Input 
              value={usuario.telefono} 
              disabled={!modoEdicion}
              className={modoEdicion ? '' : 'bg-gray-50'}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Extensión</label>
            <Input 
              value={usuario.extension} 
              disabled={!modoEdicion}
              className={modoEdicion ? '' : 'bg-gray-50'}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Ciudad</label>
            <Input 
              value={usuario.ciudadResidencia || usuario.ubicacion} 
              disabled={!modoEdicion}
              className={modoEdicion ? '' : 'bg-gray-50'}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Dirección de Residencia</label>
            <Input 
              value={usuario.direccionResidencia || ''} 
              disabled={!modoEdicion}
              className={modoEdicion ? '' : 'bg-gray-50'}
              placeholder="Ingresa tu dirección"
            />
          </div>
        </div>
      </Card>

      {/* CONTACTO DE EMERGENCIA - EDITABLE */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-bold text-gray-900">Contacto de Emergencia</h3>
          <Badge className="ml-2 bg-orange-100 text-orange-700 border-0 text-xs">
            ✏️ Editable
          </Badge>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Información de contacto en caso de emergencia
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Nombre Completo</label>
            <Input 
              value={usuario.contactoEmergencia || ''} 
              disabled={!modoEdicion}
              className={modoEdicion ? '' : 'bg-gray-50'}
              placeholder="Nombre del contacto"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Teléfono de Emergencia</label>
            <Input 
              value={usuario.telefonoEmergencia || ''} 
              disabled={!modoEdicion}
              className={modoEdicion ? '' : 'bg-gray-50'}
              placeholder="Número de contacto"
            />
          </div>
        </div>
      </Card>

      {/* INFORMACIÓN LABORAL - NO EDITABLE */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-bold text-gray-900">Información Laboral</h3>
          <Badge className="ml-2 bg-gray-100 text-gray-700 border-0 text-xs">
            🔒 No editable
          </Badge>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Datos laborales asignados por la institución
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Cargo</label>
            <Input 
              value={usuario.cargo} 
              disabled 
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Área</label>
            <Input 
              value={usuario.area} 
              disabled 
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Dependencia</label>
            <Input 
              value={usuario.dependencia} 
              disabled 
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Jefe Inmediato</label>
            <Input 
              value={usuario.jefeInmediato} 
              disabled 
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Tipo de Contrato</label>
            <Input 
              value={usuario.tipoContrato} 
              disabled 
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Fecha de Ingreso</label>
            <Input 
              value={usuario.fechaIngreso || 'No registrado'} 
              disabled 
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Horario</label>
            <Input 
              value={usuario.horario} 
              disabled 
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Oficina</label>
            <Input 
              value={usuario.oficina} 
              disabled 
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
        </div>
      </Card>

      {/* INFORMACIÓN ACADÉMICA - EDITABLE */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">Información Académica</h3>
          <Badge className="ml-2 bg-blue-100 text-blue-700 border-0 text-xs">
            ✏️ Editable
          </Badge>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Formación y nivel educativo
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Nivel Educativo</label>
            <Input 
              value={usuario.nivelEducativo || ''} 
              disabled={!modoEdicion}
              className={modoEdicion ? '' : 'bg-gray-50'}
              placeholder="Ej: Profesional, Especialización"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Profesión</label>
            <Input 
              value={usuario.profesion || ''} 
              disabled={!modoEdicion}
              className={modoEdicion ? '' : 'bg-gray-50'}
              placeholder="Ej: Administrador Público"
            />
          </div>
        </div>
      </Card>

      {/* SEGURIDAD SOCIAL - NO EDITABLE (SENSIBLE) */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-bold text-gray-900">Seguridad Social y Nómina</h3>
          <Badge className="ml-2 bg-gray-100 text-gray-700 border-0 text-xs">
            🔒 Información sensible
          </Badge>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Información confidencial protegida
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">EPS</label>
            <Input 
              value={usuario.eps || 'No registrado'} 
              disabled 
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">ARL</label>
            <Input 
              value={usuario.arl || 'No registrado'} 
              disabled 
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Fondo de Pensión</label>
            <Input 
              value={usuario.fondoPension || 'No registrado'} 
              disabled 
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Salario</label>
            <Input 
              value={usuario.salario || 'No registrado'} 
              disabled 
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Banco</label>
            <Input 
              value={usuario.banco || 'No registrado'} 
              disabled 
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Número de Cuenta</label>
            <Input 
              value={usuario.numeroCuenta || 'No registrado'} 
              disabled 
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
        </div>
      </Card>

      {/* CONFIGURACIÓN DE PRIVACIDAD - CONTROL DE VISIBILIDAD EN LA COMUNIDAD */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-bold text-gray-900">Configuración de Privacidad</h3>
          <Badge className="ml-2 bg-purple-100 text-purple-700 border-0 text-xs">
            🌐 Visible en la Comunidad
          </Badge>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Controla qué información de tu perfil deseas compartir públicamente con la comunidad ESAP
        </p>

        {/* Alerta informativa */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1 text-sm">Información sobre la privacidad</h4>
              <p className="text-xs text-blue-700 leading-relaxed">
                Los datos marcados como <strong>visibles</strong> serán compartidos en tu perfil público de la comunidad ESAP. Los datos marcados como <strong>privados</strong> solo serán visibles para ti y el personal administrativo autorizado.
              </p>
            </div>
          </div>
        </div>

        {/* Grid de switches de privacidad */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nombre completo */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-gray-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Nombre completo</p>
                <p className="text-xs text-gray-600">Diego Trujillo</p>
              </div>
            </div>
            <button
              onClick={() => handleTogglePrivacidad('nombre')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                privacidad.nombre ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  privacidad.nombre ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Cargo */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <Briefcase className="w-4 h-4 text-gray-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Cargo</p>
                <p className="text-xs text-gray-600">{usuario.cargo}</p>
              </div>
            </div>
            <button
              onClick={() => handleTogglePrivacidad('cargo')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                privacidad.cargo ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  privacidad.cargo ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Área */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <Folder className="w-4 h-4 text-gray-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Área</p>
                <p className="text-xs text-gray-600">{usuario.area}</p>
              </div>
            </div>
            <button
              onClick={() => handleTogglePrivacidad('area')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                privacidad.area ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  privacidad.area ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Ubicación */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-gray-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Ubicación</p>
                <p className="text-xs text-gray-600">{usuario.ubicacion}</p>
              </div>
            </div>
            <button
              onClick={() => handleTogglePrivacidad('ubicacion')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                privacidad.ubicacion ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  privacidad.ubicacion ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Teléfono */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-gray-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Teléfono laboral</p>
                <p className="text-xs text-gray-600">{usuario.telefono}</p>
              </div>
            </div>
            <button
              onClick={() => handleTogglePrivacidad('telefono')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                privacidad.telefono ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  privacidad.telefono ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Extensión */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-gray-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Extensión</p>
                <p className="text-xs text-gray-600">{usuario.extension}</p>
              </div>
            </div>
            <button
              onClick={() => handleTogglePrivacidad('extension')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                privacidad.extension ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  privacidad.extension ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Email */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-gray-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Correo electrónico</p>
                <p className="text-xs text-gray-600">{usuario.email}</p>
              </div>
            </div>
            <button
              onClick={() => handleTogglePrivacidad('email')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                privacidad.email ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  privacidad.email ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Nivel Educativo */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-4 h-4 text-gray-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Nivel educativo</p>
                <p className="text-xs text-gray-600">{usuario.nivelEducativo}</p>
              </div>
            </div>
            <button
              onClick={() => handleTogglePrivacidad('nivelEducativo')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                privacidad.nivelEducativo ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  privacidad.nivelEducativo ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Profesión */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <BookOpen className="w-4 h-4 text-gray-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Profesión</p>
                <p className="text-xs text-gray-600">{usuario.profesion}</p>
              </div>
            </div>
            <button
              onClick={() => handleTogglePrivacidad('profesion')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                privacidad.profesion ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  privacidad.profesion ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Antigüedad */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-gray-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Antigüedad</p>
                <p className="text-xs text-gray-600">{usuario.antiguedad}</p>
              </div>
            </div>
            <button
              onClick={() => handleTogglePrivacidad('antiguedad')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                privacidad.antiguedad ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  privacidad.antiguedad ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Resumen de privacidad */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-700">
                  <strong>{Object.values(privacidad).filter(Boolean).length}</strong> campos visibles
                </span>
              </div>
              <span className="text-gray-400">|</span>
              <div className="flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">
                  <strong>{Object.values(privacidad).filter(v => !v).length}</strong> campos privados
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Botón guardar cambios */}
      {modoEdicion && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Los cambios solo afectarán los campos editables marcados con ✏️
            </p>
            <button
              onClick={handleGuardarCambios}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Guardar Cambios
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

function ServicioDetallePanel({ servicio, onVolver }: { servicio: ServicioPortal; onVolver: () => void }) {
  const esControlInterno = servicio.id === 'control-interno-gestion';
  
  return (
    <Card className="p-6">
      <button
        onClick={onVolver}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Volver a Servicios</span>
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">{servicio.titulo}</h1>
      <p className="text-sm text-gray-600 mb-6">{servicio.descripcion}</p>

      {/* Card azul con estadística */}
      {esControlInterno && (
        <div className="bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-1">{servicio.titulo}</h2>
                <p className="text-white/90 text-sm">{servicio.descripcion}</p>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border border-white/30 backdrop-blur-sm">
              {servicio.badge}
            </Badge>
          </div>

          <div className="mt-6 pt-6 border-t border-white/20">
            <p className="text-white/80 text-sm mb-2">Auditorías pendientes</p>
            <div className="text-5xl font-bold text-white">2</div>
          </div>
        </div>
      )}

      {/* Información del Servicio */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Información del Servicio</h3>
        <p className="text-sm text-gray-600 mb-4">
          Gestiona y consulta la información relacionada con este servicio
        </p>

        {esControlInterno ? (
          <PortalUsuarioAuditado hideHeader={true} />
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <h3 className="font-semibold text-blue-900 mb-1">Funcionalidad próximamente</h3>
                <p className="text-sm text-blue-700">
                  Este servicio estará disponible en las próximas actualizaciones del portal. 
                  Estamos trabajando para ofrecerte la mejor experiencia.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}