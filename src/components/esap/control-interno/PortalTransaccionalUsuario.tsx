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
  ThumbsUp, Share2, Eye, ArrowLeft
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
  email: string;
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
  nombre: 'Diego Trujillo',
  email: 'funcionario@esap.edu.co',
  cargo: 'Funcionario Administrativo',
  area: 'Planeación',
  dependencia: 'Oficina de Control Interno',
  telefono: '+57 301 234 5678',
  extension: '1234',
  ubicacion: 'Bogotá',
  jefeInmediato: 'Dr. García',
  tipoContrato: 'Indefinido',
  antiguedad: '5 años',
  horario: '8:00 - 17:00',
  oficina: 'Piso 3, OF. 301'
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
  const [vistaActual, setVistaActual] = useState<'dashboard' | 'servicio'>('dashboard');
  const [servicioActivo, setServicioActivo] = useState<ServicioPortal | null>(null);
  const [categoriaActiva, setCategoriaActiva] = useState<string>('Todos');
  const [busqueda, setBusqueda] = useState('');

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

  // Si está viendo un servicio específico
  if (vistaActual === 'servicio' && servicioActivo) {
    // Solo Control Interno de Gestión tiene vista completa
    if (servicioActivo.id === 'control-interno-gestion') {
      return (
        <div className="min-h-screen bg-gray-50">
          {/* Header fijo con navegación */}
          <HeaderPortal usuario={USUARIO_MOCK} onLogout={onLogout} />
          
          <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* SIDEBAR IZQUIERDO - Información del Usuario */}
              <div className="lg:col-span-1">
                <Card className="p-6 sticky top-24">
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
                      {USUARIO_MOCK.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <h3 className="font-bold text-gray-900">{USUARIO_MOCK.nombre}</h3>
                    <p className="text-sm text-gray-600">{USUARIO_MOCK.cargo}</p>
                  </div>

                  {/* Información de contacto */}
                  <div className="space-y-4 border-t border-gray-200 pt-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Teléfono</p>
                      <p className="text-sm text-gray-900">{USUARIO_MOCK.telefono}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Extensión</p>
                      <p className="text-sm text-gray-900">{USUARIO_MOCK.extension}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Ubicación</p>
                      <p className="text-sm text-gray-900">{USUARIO_MOCK.oficina}</p>
                    </div>
                  </div>

                  {/* Información laboral */}
                  <div className="space-y-4 border-t border-gray-200 pt-4 mt-4">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Información Laboral</h4>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Cargo</p>
                      <p className="text-sm text-gray-900">{USUARIO_MOCK.cargo}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Área</p>
                      <p className="text-sm text-gray-900">{USUARIO_MOCK.area}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Dependencia</p>
                      <p className="text-sm text-gray-900">{USUARIO_MOCK.dependencia}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Jefe inmediato</p>
                      <p className="text-sm text-gray-900">{USUARIO_MOCK.jefeInmediato}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Tipo contrato</p>
                      <p className="text-sm text-gray-900">{USUARIO_MOCK.tipoContrato}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Antigüedad</p>
                      <p className="text-sm text-gray-900">{USUARIO_MOCK.antiguedad}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Horario</p>
                      <p className="text-sm text-gray-900">{USUARIO_MOCK.horario}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Oficina</p>
                      <p className="text-sm text-gray-900">{USUARIO_MOCK.oficina}</p>
                    </div>
                  </div>

                  {/* Acceso rápido */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Acceso Rápido</h4>
                    <div className="space-y-2">
                      <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                        <Shield className="w-4 h-4" />
                        <span>Correo Institucional</span>
                      </button>
                      <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                        <Users className="w-4 h-4" />
                        <span>Humano Soft</span>
                      </button>
                      <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                        <Briefcase className="w-4 h-4" />
                        <span>ARCA ESAP</span>
                      </button>
                      <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                        <Bell className="w-4 h-4" />
                        <span>Notificaciones</span>
                      </button>
                      <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                        <Settings className="w-4 h-4" />
                        <span>Configuración</span>
                      </button>
                      <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                        <Activity className="w-4 h-4" />
                        <span>Actualizar</span>
                      </button>
                    </div>
                  </div>
                </Card>
              </div>

              {/* CONTENIDO PRINCIPAL */}
              <div className="lg:col-span-2">
                <Card className="p-6">
                  <button
                    onClick={handleVolverDashboard}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">Volver a Servicios</span>
                  </button>

                  <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] rounded-xl mb-6">
                    <div className="w-16 h-16 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h1 className="text-2xl font-bold text-white mb-1">{servicioActivo.titulo}</h1>
                      <p className="text-white/90 text-sm">{servicioActivo.descripcion}</p>
                    </div>
                    <Badge className="bg-white/20 text-white border border-white/30 backdrop-blur-sm">
                      {servicioActivo.badge}
                    </Badge>
                  </div>

                  {/* Auditorías pendientes */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-amber-900">Auditorías pendientes</h3>
                        <p className="text-sm text-amber-700 mt-1">
                          Tienes <strong>2 auditorías</strong> que requieren tu atención y respuesta
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-amber-600">2</div>
                        <div className="text-xs text-amber-600">/ 12</div>
                      </div>
                    </div>
                  </div>

                  {/* Portal de auditorías embebido */}
                  <PortalUsuarioAuditado hideHeader={true} />
                </Card>
              </div>

              {/* COLUMNA DERECHA - Actividad */}
              <div className="lg:col-span-1">
                <ActividadComunidadPanel />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Para otros servicios, mostrar mensaje informativo
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderPortal usuario={USUARIO_MOCK} onLogout={onLogout} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Card className="p-8">
            <button
              onClick={handleVolverDashboard}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Volver a Servicios</span>
            </button>

            <div className="text-center py-12">
              <div 
                className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ backgroundColor: `${servicioActivo.color}20` }}
              >
                <servicioActivo.icono className="w-12 h-12" style={{ color: servicioActivo.color }} />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-3">{servicioActivo.titulo}</h2>
              <p className="text-gray-600 mb-8">{servicioActivo.descripcion}</p>

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
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Vista principal del Dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <HeaderPortal usuario={USUARIO_MOCK} onLogout={onLogout} />

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMNA PRINCIPAL */}
          <div className="lg:col-span-2 space-y-6">
            {/* PERFIL Y ESTADÍSTICAS */}
            <PerfilUsuario usuario={USUARIO_MOCK} />
            <EstadisticasUsuario />

            {/* MIS SERVICIOS */}
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
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
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
          </div>

          {/* COLUMNA LATERAL */}
          <div className="lg:col-span-1 space-y-6">
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

function PerfilUsuario({ usuario }: { usuario: UsuarioPortal }) {
  const [verMas, setVerMas] = useState(false);

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] h-24"></div>
      <div className="px-6 pb-6">
        <div className="flex items-start gap-4 -mt-12 mb-4">
          <div className="w-24 h-24 rounded-full border-4 border-white bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
            {usuario.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div className="flex-1 mt-14">
            <h2 className="text-2xl font-bold text-gray-900">{usuario.nombre}</h2>
            <p className="text-sm text-gray-600">{usuario.cargo}</p>
          </div>
          <button className="mt-14 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Ver perfil completo
          </button>
        </div>

        {/* INFORMACIÓN BÁSICA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Briefcase className="w-4 h-4 text-gray-500" />
            <span>{usuario.area}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span>{usuario.ubicacion}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Phone className="w-4 h-4 text-gray-500" />
            <span>{usuario.telefono}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <User className="w-4 h-4 text-gray-500" />
            <span>{usuario.email}</span>
          </div>
        </div>

        {/* INFORMACIÓN DETALLADA (COLAPSABLE) */}
        <AnimatePresence>
          {verMas && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-200 pt-4 mt-4 overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoItem label="Dependencia" value={usuario.dependencia} />
                <InfoItem label="Jefe Inmediato" value={usuario.jefeInmediato} />
                <InfoItem label="Tipo Contrato" value={usuario.tipoContrato} />
                <InfoItem label="Antigüedad" value={usuario.antiguedad} />
                <InfoItem label="Horario" value={usuario.horario} />
                <InfoItem label="Oficina" value={usuario.oficina} />
                <InfoItem label="Extensión" value={usuario.extension} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setVerMas(!verMas)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-4"
        >
          {verMas ? 'Ver menos' : 'Ver más información'}
        </button>
      </div>
    </Card>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
      <p className="text-sm text-gray-900">{value}</p>
    </div>
  );
}

function EstadisticasUsuario() {
  const estadisticas: EstadisticaPortal[] = [
    {
      titulo: 'Procesos Activos',
      valor: 5,
      icono: Activity,
      color: '#2962FF',
      estado: 'normal'
    },
    {
      titulo: 'Auditorías Pendientes',
      valor: 2,
      icono: AlertCircle,
      color: '#F57C00',
      estado: 'alerta'
    },
    {
      titulo: 'Tareas del Mes',
      valor: '24/30',
      icono: CheckCircle2,
      color: '#00C853',
      estado: 'normal'
    },
    {
      titulo: 'Documentos Procesados',
      valor: 48,
      icono: FileText,
      color: '#7B1FA2',
      estado: 'normal'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {estadisticas.map((stat) => (
        <Card key={stat.titulo} className="p-4 border-l-4" style={{ borderLeftColor: stat.color }}>
          <div className="flex items-center justify-between mb-2">
            <stat.icono className="w-5 h-5" style={{ color: stat.color }} />
            {stat.estado === 'alerta' && (
              <Badge className="bg-orange-100 text-orange-800 border border-orange-200 text-xs">
                Requiere atención
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-600 mb-1">{stat.titulo}</p>
          <p className="text-2xl font-bold text-gray-900">{stat.valor}</p>
        </Card>
      ))}
    </div>
  );
}

function TarjetaServicio({ servicio, onClick }: { servicio: ServicioPortal; onClick: () => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className="p-5 cursor-pointer hover:shadow-lg transition-all border-l-4"
        style={{ borderLeftColor: servicio.color }}
        onClick={onClick}
      >
        <div className="flex items-start justify-between mb-3">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${servicio.color}20` }}
          >
            <servicio.icono className="w-6 h-6" style={{ color: servicio.color }} />
          </div>
          {servicio.badge && (
            <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-xs">
              {servicio.badge}
            </Badge>
          )}
        </div>

        <h3 className="font-semibold text-gray-900 mb-2">{servicio.titulo}</h3>
        <p className="text-sm text-gray-600 mb-3">{servicio.descripcion}</p>

        <div className="flex items-center justify-between">
          {servicio.pendientes !== undefined && servicio.pendientes > 0 ? (
            <Badge className={
              servicio.estado === 'Requiere atención' 
                ? 'bg-red-100 text-red-800 border border-red-200'
                : 'bg-gray-100 text-gray-800 border border-gray-200'
            }>
              {servicio.pendientes} {servicio.pendientes === 1 ? 'pendiente' : 'pendientes'}
            </Badge>
          ) : (
            <Badge className="bg-green-100 text-green-800 border border-green-200">
              {servicio.estado}
            </Badge>
          )}
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </Card>
    </motion.div>
  );
}

function ActividadComunidadPanel() {
  return (
    <Card className="p-6 sticky top-24">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-bold text-gray-900">Actividad de la Comunidad</h2>
      </div>

      <div className="space-y-4">
        {ACTIVIDADES_COMUNIDAD.map((actividad) => (
          <div key={actividad.id} className="border-b border-gray-100 pb-4 last:border-0">
            <div className="flex items-start gap-3 mb-2">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${actividad.color}20` }}
              >
                <actividad.icono className="w-5 h-5" style={{ color: actividad.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{actividad.titulo}</h3>
                <p className="text-xs text-gray-600 mb-2">{actividad.autor}</p>
                <p className="text-sm text-gray-700 line-clamp-3 mb-2">{actividad.descripcion}</p>
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{actividad.fecha}</span>
                  {actividad.likes !== undefined && (
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      <span>{actividad.likes}</span>
                    </div>
                  )}
                  {actividad.comentarios !== undefined && (
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      <span>{actividad.comentarios}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full mt-4 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium">
        Ver toda la actividad
      </button>
    </Card>
  );
}
