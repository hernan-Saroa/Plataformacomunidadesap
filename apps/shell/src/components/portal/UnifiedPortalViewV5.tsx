/**
 * ════════════════════════════════════════════════════════════════════════════
 * PORTAL TRANSACCIONAL V5.0 - MICROSOFT DYNAMICS + LINKEDIN STYLE - ESAP
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * DISEÑO HÍBRIDO PROFESIONAL:
 * ✓ Base: Microsoft Dynamics 365 (corporativo, data-driven)
 * ✓ Social: LinkedIn Professional (networking, comunidad, feed)
 * ✓ Command Bar + KPIs numéricos
 * ✓ Mis Servicios profesional (Grid/List)
 * ✓ Feed de Actividad Social
 * ✓ Perfil Profesional visible
 * ✓ Red de Contactos y Networking
 * ✓ Eventos y Oportunidades
 * ✓ Paleta monocromática ESAP
 * ✓ Footer en todas las vistas
 * 
 * ACTUALIZADO: Diciembre 24, 2025
 * VERSIÓN: 5.0 - Enterprise Social
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap, BookOpen, FileText, Calendar, Award, TrendingUp,
  Clock, CheckCircle2, AlertCircle, BarChart3, ChevronRight, Bell,
  Settings, Briefcase, Users, ClipboardList, Shield, Scale, Gavel,
  Building2, Activity, FileCheck, AlertTriangle, ArrowRight, Microscope,
  Target, Wallet, MessageSquare, Video, FileBadge, UserCheck, MapPin,
  Layers, FolderOpen, Zap, FileSpreadsheet, Download, Upload, Search,
  TrendingDown, DollarSign, UserPlus, Mail, Phone, Globe, Home, Package,
  Star, Eye, ExternalLink, ChevronDown, ChevronUp, Play, Pause, MoreVertical,
  Filter, Calendar as CalendarIcon, PieChart, BarChart, LineChart, X,
  Plus, Edit, Trash2, Send, Paperclip, Image as ImageIcon, Menu, Grid3x3,
  List, RefreshCw, Share2, Printer, Copy, Heart, MessageCircle, Repeat2,
  Bookmark, ThumbsUp, UserCircle2, Rss, Network, TrendingUpIcon, PenTool
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { Progress } from '../ui/progress';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

// Módulos especializados
import { MisExpedientesLegalesV2 } from './MisExpedientesLegalesV2';
import { DashboardAreaAuditada } from './control-interno/DashboardAreaAuditada';
import { CommunitySection } from './CommunitySection';
import { PublicTitleVerification } from './PublicTitleVerification';
import { CertificadosLaboralesPortal } from './CertificadosLaboralesPortal';
import { SolicitarCertificadoLaboral } from './SolicitarCertificadoLaboral';
import { DocentesPTAPortal } from './gestion-profesoral/DocentesPTAPortal';
import { JobBoardPortal } from './JobBoardPortal';
import { NotificacionesArquitectura } from './NotificacionesArquitectura';
import { PerfilUsuarioEditable } from './PerfilUsuarioEditable';
import { FooterWorldClass } from '../FooterWorldClass';
import { PortalTransaccionalFirmaCompleto } from '../esap/firma-electronica/PortalTransaccionalFirmaCompleto';
import { PORTAL_EXTERNAL_URLS } from '../../config/environment';

interface UnifiedPortalViewV5Props {
  userName: string;
  userEmail: string;
  activeRole: string;
  roleData?: any;
}

interface ServiceItem {
  id: string;
  category: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  status?: 'available' | 'pending' | 'attention' | 'disabled';
  badge?: string;
  quickStats?: { label: string; value: string | number }[];
}

interface SocialPost {
  id: string;
  author: {
    name: string;
    role: string;
    avatar?: string;
  };
  timestamp: string;
  content: string;
  type: 'announcement' | 'event' | 'achievement' | 'opportunity';
  likes: number;
  comments: number;
  image?: string;
}

interface NetworkContact {
  id: string;
  name: string;
  role: string;
  department?: string;
  avatar?: string;
  mutualConnections?: number;
}

export function UnifiedPortalViewV5({ 
  userName, 
  userEmail, 
  activeRole, 
  roleData 
}: UnifiedPortalViewV5Props) {
  const outlookUrl = PORTAL_EXTERNAL_URLS.outlook;
  const humanosoftUrl = PORTAL_EXTERNAL_URLS.humanosoft;
  const arcaUrl = PORTAL_EXTERNAL_URLS.arca;
  const [vistaActual, setVistaActual] = useState<string>('dashboard');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [mostrarPerfilCompleto, setMostrarPerfilCompleto] = useState(false);
  const [perfilTab, setPerfilTab] = useState<'personal' | 'laboral' | 'privacidad' | 'historial'>('personal');
  const [servicioAbierto, setServicioAbierto] = useState<string | null>(null);

  // ════════════════════════════════════════════════════════════════════════════
  // SERVICES CONFIGURATION BY ROLE (Same as V4.0)
  // ════════════════════════════════════════════════════════════════════════════
  
  const getServicesData = (): ServiceItem[] => {
    switch (activeRole) {
      case 'Estudiante':
        return [
          {
            id: 'consulta-notas',
            category: 'Académico',
            title: 'Consulta de Notas',
            description: 'Historial académico y calificaciones por semestre',
            icon: <Award className="w-5 h-5" />,
            action: () => setServicioAbierto('consulta-notas'),
            status: 'available',
            quickStats: [
              { label: 'Promedio actual', value: roleData?.promedio || '4.2' },
              { label: 'Semestres cursados', value: roleData?.semestres || '6' }
            ]
          },
          {
            id: 'horarios',
            category: 'Académico',
            title: 'Horarios de Clase',
            description: 'Visualización de horario semanal y calendario académico',
            icon: <Calendar className="w-5 h-5" />,
            action: () => setServicioAbierto('horarios'),
            status: 'available',
            quickStats: [
              { label: 'Materias activas', value: roleData?.materias_activas || '5' }
            ]
          },
          {
            id: 'matricula',
            category: 'Académico',
            title: 'Matrícula Académica',
            description: 'Inscripción de materias y gestión de matrícula',
            icon: <FileText className="w-5 h-5" />,
            action: () => setServicioAbierto('matricula'),
            status: 'pending',
            badge: 'Próximamente'
          },
          {
            id: 'biblioteca',
            category: 'Académico',
            title: 'Biblioteca Virtual',
            description: 'Acceso a recursos bibliográficos y bases de datos',
            icon: <BookOpen className="w-5 h-5" />,
            action: () => setServicioAbierto('biblioteca'),
            status: 'available'
          },
          {
            id: 'estado-cuenta',
            category: 'Financiero',
            title: 'Estado de Cuenta',
            description: 'Consulta de pagos, deudas y estados financieros',
            icon: <DollarSign className="w-5 h-5" />,
            action: () => setServicioAbierto('estado-cuenta'),
            status: 'available',
            quickStats: [
              { label: 'Saldo pendiente', value: '$0' }
            ]
          },
          {
            id: 'pagos',
            category: 'Financiero',
            title: 'Pagos en Línea',
            description: 'Realizar pagos de matrícula, derechos y otros conceptos',
            icon: <Wallet className="w-5 h-5" />,
            action: () => setServicioAbierto('pagos'),
            status: 'available'
          },
          {
            id: 'certificados',
            category: 'Trámites',
            title: 'Solicitud de Certificados',
            description: 'Certificados de estudio, notas y otros documentos',
            icon: <FileBadge className="w-5 h-5" />,
            action: () => setServicioAbierto('certificados'),
            status: 'available'
          },
          {
            id: 'soporte',
            category: 'Servicios',
            title: 'Soporte Técnico',
            description: 'Ayuda con plataformas digitales y sistemas',
            icon: <MessageSquare className="w-5 h-5" />,
            action: () => setServicioAbierto('soporte'),
            status: 'available'
          }
        ];

      case 'Docente':
        return [
          {
            id: 'cursos-activos',
            category: 'Académico',
            title: 'Mis Cursos',
            description: 'Gestión de cursos, estudiantes y contenidos',
            icon: <GraduationCap className="w-5 h-5" />,
            action: () => setServicioAbierto('cursos-activos'),
            status: 'available',
            quickStats: [
              { label: 'Cursos activos', value: roleData?.cursos_activos || '3' },
              { label: 'Total estudiantes', value: roleData?.total_estudiantes || '95' }
            ]
          },
          {
            id: 'calificaciones',
            category: 'Académico',
            title: 'Registro de Calificaciones',
            description: 'Ingreso y gestión de notas de estudiantes',
            icon: <FileCheck className="w-5 h-5" />,
            action: () => setServicioAbierto('calificaciones'),
            status: 'attention',
            badge: roleData?.estudiantes_pendientes ? `${roleData.estudiantes_pendientes} pendientes` : undefined,
            quickStats: [
              { label: 'Pendientes', value: roleData?.estudiantes_pendientes || '15' }
            ]
          },
          {
            id: 'asistencia',
            category: 'Académico',
            title: 'Control de Asistencia',
            description: 'Registro y seguimiento de asistencia',
            icon: <UserCheck className="w-5 h-5" />,
            action: () => setServicioAbierto('asistencia'),
            status: 'available'
          },
          {
            id: 'pta',
            category: 'Gestión',
            title: 'Plan de Trabajo Académico (PTA)',
            description: 'Registro y seguimiento de actividades académicas',
            icon: <ClipboardList className="w-5 h-5" />,
            action: () => setServicioAbierto('docente-pta'),
            status: 'available',
            quickStats: [
              { label: 'Horas registradas', value: roleData?.horas_pta || '120/160' }
            ]
          },
          {
            id: 'materiales',
            category: 'Académico',
            title: 'Material de Clase',
            description: 'Carga y gestión de recursos educativos',
            icon: <FolderOpen className="w-5 h-5" />,
            action: () => setServicioAbierto('material-clase'),
            status: 'available'
          },
          {
            id: 'horarios-docente',
            category: 'Gestión',
            title: 'Mi Horario',
            description: 'Consulta de horarios de clase y disponibilidad',
            icon: <Calendar className="w-5 h-5" />,
            action: () => setServicioAbierto('horarios-docente'),
            status: 'available'
          },
          {
            id: 'documentos-firmar',
            category: 'Documentos',
            title: 'Mis Documentos por Firmar',
            description: 'Documentos asignados a mí que requieren mi firma electrónica',
            icon: <PenTool className="w-5 h-5" />,
            action: () => setServicioAbierto('documentos-firmar'),
            status: 'available',
            badge: 'Digital',
            quickStats: [
              { label: 'Asignados a mí', value: roleData?.docs_pendientes || '2' },
              { label: 'Firmados este mes', value: roleData?.docs_firmados || '8' }
            ]
          }
        ];

      case 'Administrativo':
      case 'Funcionario':
        return [
          {
            id: 'expedientes-legales',
            category: 'Control Interno Disciplinario',
            title: 'Expedientes Legales',
            description: 'Gestión de procesos disciplinarios y legales',
            icon: <Scale className="w-5 h-5" />,
            action: () => setServicioAbierto('expedientes-legales'),
            status: 'available',
            badge: 'Disciplinario',
            quickStats: [
              { label: 'Procesos activos', value: roleData?.procesos_activos || '5' }
            ]
          },
          {
            id: 'control-interno',
            category: 'Control Interno de Gestión',
            title: 'Control Interno de Gestión',
            description: 'Auditorías y seguimiento de controles administrativos',
            icon: <Shield className="w-5 h-5" />,
            action: () => setServicioAbierto('control-interno'),
            status: 'attention',
            badge: 'Gestión',
            quickStats: [
              { label: 'Auditorías pendientes', value: roleData?.auditorias_pendientes || '2' }
            ]
          },
          {
            id: 'investigaciones-disciplinarias',
            category: 'Control Interno Disciplinario',
            title: 'Investigaciones Disciplinarias',
            description: 'Seguimiento a procesos de investigación disciplinaria',
            icon: <Gavel className="w-5 h-5" />,
            action: () => setServicioAbierto('investigaciones-disciplinarias'),
            status: 'available',
            badge: 'Disciplinario'
          },
          {
            id: 'certificados-laborales',
            category: 'RRHH',
            title: 'Certificados Laborales',
            description: 'Solicitud de certificaciones de vinculación laboral',
            icon: <FileBadge className="w-5 h-5" />,
            action: () => setServicioAbierto('certificados-laborales'),
            status: 'available'
          },
          {
            id: 'documentos-firmar',
            category: 'Documentos',
            title: 'Mis Documentos por Firmar',
            description: 'Documentos asignados a mí que requieren mi firma electrónica',
            icon: <PenTool className="w-5 h-5" />,
            action: () => setServicioAbierto('documentos-firmar'),
            status: 'available',
            badge: 'Digital',
            quickStats: [
              { label: 'Asignados a mí', value: roleData?.docs_pendientes || '3' },
              { label: 'Firmados este mes', value: roleData?.docs_firmados || '12' }
            ]
          },
          {
            id: 'vacaciones',
            category: 'RRHH',
            title: 'Gestión de Vacaciones',
            description: 'Solicitud y aprobación de vacaciones',
            icon: <Calendar className="w-5 h-5" />,
            action: () => setServicioAbierto('vacaciones'),
            status: 'available'
          },
          {
            id: 'documentos-admin',
            category: 'Documentos',
            title: 'Repositorio Documental',
            description: 'Acceso a documentos institucionales',
            icon: <FolderOpen className="w-5 h-5" />,
            action: () => setServicioAbierto('documentos-admin'),
            status: 'available'
          },
          {
            id: 'plan-mejoramiento',
            category: 'Control Interno de Gestión',
            title: 'Plan de Mejoramiento',
            description: 'Seguimiento a planes de mejoramiento institucional',
            icon: <TrendingUp className="w-5 h-5" />,
            action: () => setServicioAbierto('plan-mejoramiento'),
            status: 'available',
            badge: 'Gestión'
          }
        ];

      case 'Graduado':
        return [
          {
            id: 'job-board',
            category: 'Empleo',
            title: 'Bolsa de Empleo',
            description: 'Ofertas laborales y oportunidades profesionales',
            icon: <Briefcase className="w-5 h-5" />,
            action: () => setServicioAbierto('job-board'),
            status: 'available',
            quickStats: [
              { label: 'Ofertas nuevas', value: roleData?.ofertas_nuevas || '12' },
              { label: 'Postulaciones', value: roleData?.postulaciones || '5' }
            ]
          },
          {
            id: 'networking',
            category: 'Comunidad',
            title: 'Red de Egresados',
            description: 'Conexión con la comunidad de graduados ESAP',
            icon: <Users className="w-5 h-5" />,
            action: () => setServicioAbierto('community-section'),
            status: 'available',
            badge: '2,450+ egresados'
          },
          {
            id: 'capacitaciones',
            category: 'Formación',
            title: 'Educación Continua',
            description: 'Cursos, diplomados y programas de actualización',
            icon: <GraduationCap className="w-5 h-5" />,
            action: () => setServicioAbierto('capacitaciones'),
            status: 'available',
            quickStats: [
              { label: 'Cursos disponibles', value: roleData?.cursos_disponibles || '8' }
            ]
          },
          {
            id: 'certificados-graduado',
            category: 'Trámites',
            title: 'Certificados y Documentos',
            description: 'Solicitud de certificados de grado y actas',
            icon: <FileBadge className="w-5 h-5" />,
            action: () => setServicioAbierto('certificados-graduado'),
            status: 'available'
          },
          {
            id: 'verificacion-titulo',
            category: 'Servicios',
            title: 'Verificación de Título',
            description: 'Validación de título para empleadores',
            icon: <FileCheck className="w-5 h-5" />,
            action: () => setServicioAbierto('solicitar-certificado-verificacion'),
            status: 'available'
          }
        ];

      case 'Aspirante':
        return [
          {
            id: 'inscripcion',
            category: 'Admisiones',
            title: 'Proceso de Inscripción',
            description: 'Completar formulario y documentación requerida',
            icon: <FileText className="w-5 h-5" />,
            action: () => setServicioAbierto('inscripcion'),
            status: 'attention',
            badge: roleData?.progreso ? `${roleData.progreso} completado` : 'En progreso',
            quickStats: [
              { label: 'Progreso', value: roleData?.progreso || '65%' }
            ]
          },
          {
            id: 'documentos',
            category: 'Admisiones',
            title: 'Carga de Documentos',
            description: 'Subir documentos requeridos para admisión',
            icon: <Upload className="w-5 h-5" />,
            action: () => setServicioAbierto('documentos'),
            status: 'pending',
            badge: roleData?.documentos_pendientes ? `${roleData.documentos_pendientes} pendiente(s)` : undefined,
            quickStats: [
              { label: 'Pendientes', value: roleData?.documentos_pendientes || '1' }
            ]
          },
          {
            id: 'programas',
            category: 'Información',
            title: 'Programas Académicos',
            description: 'Información sobre programas disponibles',
            icon: <BookOpen className="w-5 h-5" />,
            action: () => setServicioAbierto('programas'),
            status: 'available'
          },
          {
            id: 'pago-inscripcion',
            category: 'Financiero',
            title: 'Pago de Inscripción',
            description: 'Realizar pago de derechos de inscripción',
            icon: <DollarSign className="w-5 h-5" />,
            action: () => setServicioAbierto('pago-inscripcion'),
            status: 'available'
          },
          {
            id: 'asesoria',
            category: 'Servicios',
            title: 'Asesoría y Soporte',
            description: 'Chat con asesor para resolver dudas',
            icon: <MessageSquare className="w-5 h-5" />,
            action: () => setServicioAbierto('asesoria'),
            status: 'available',
            badge: 'Disponible 24/7'
          }
        ];

      default:
        return [];
    }
  };

  const servicesData = getServicesData();
  const categories = ['all', ...Array.from(new Set(servicesData.map(s => s.category)))];
  
  const filteredServices = servicesData.filter(service => {
    const matchesSearch = service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // ════════════════════════════════════════════════════════════════════════════
  // KPI CARDS DATA (Same as V4.0)
  // ════════════════════════════════════════════════════════════════════════════
  
  const getKPICards = () => {
    switch (activeRole) {
      case 'Estudiante':
        return [
          { label: 'Promedio General', value: roleData?.promedio || '4.2', icon: <Award className="w-5 h-5" />, color: 'text-blue-600' },
          { label: 'Materias Activas', value: roleData?.materias_activas || '5', icon: <BookOpen className="w-5 h-5" />, color: 'text-blue-600' },
          { label: 'Créditos Cursados', value: `${roleData?.creditos_cursados || '120'}/160`, icon: <TrendingUp className="w-5 h-5" />, color: 'text-blue-600' },
          { label: 'Entregas Pendientes', value: roleData?.entregas_pendientes || '3', icon: <Clock className="w-5 h-5" />, color: 'text-orange-600' }
        ];
      case 'Docente':
        return [
          { label: 'Cursos Activos', value: roleData?.cursos_activos || '3', icon: <GraduationCap className="w-5 h-5" />, color: 'text-blue-600' },
          { label: 'Total Estudiantes', value: roleData?.total_estudiantes || '95', icon: <Users className="w-5 h-5" />, color: 'text-blue-600' },
          { label: 'Calificaciones Pendientes', value: roleData?.estudiantes_pendientes || '15', icon: <FileCheck className="w-5 h-5" />, color: 'text-orange-600' },
          { label: 'Horas PTA', value: roleData?.horas_pta || '120/160', icon: <Clock className="w-5 h-5" />, color: 'text-blue-600' }
        ];
      case 'Administrativo':
      case 'Funcionario':
        return [
          { label: 'Procesos Activos', value: roleData?.procesos_activos || '5', icon: <Scale className="w-5 h-5" />, color: 'text-blue-600' },
          { label: 'Auditorías Pendientes', value: roleData?.auditorias_pendientes || '2', icon: <Shield className="w-5 h-5" />, color: 'text-orange-600' },
          { label: 'Tareas del Mes', value: `${roleData?.tareas_completadas || '24'}/30`, icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-green-600' },
          { label: 'Documentos Procesados', value: roleData?.documentos_procesados || '48', icon: <FileText className="w-5 h-5" />, color: 'text-blue-600' }
        ];
      case 'Graduado':
        return [
          { label: 'Ofertas Disponibles', value: roleData?.ofertas_nuevas || '12', icon: <Briefcase className="w-5 h-5" />, color: 'text-blue-600' },
          { label: 'Postulaciones Activas', value: roleData?.postulaciones || '5', icon: <Send className="w-5 h-5" />, color: 'text-blue-600' },
          { label: 'Cursos Disponibles', value: roleData?.cursos_disponibles || '8', icon: <GraduationCap className="w-5 h-5" />, color: 'text-blue-600' },
          { label: 'Red de Contactos', value: '2,450+', icon: <Users className="w-5 h-5" />, color: 'text-blue-600' }
        ];
      case 'Aspirante':
        return [
          { label: 'Progreso Admisión', value: roleData?.progreso || '65%', icon: <Target className="w-5 h-5" />, color: 'text-blue-600' },
          { label: 'Documentos Pendientes', value: roleData?.documentos_pendientes || '1', icon: <FileText className="w-5 h-5" />, color: 'text-orange-600' },
          { label: 'Programa Seleccionado', value: roleData?.programa_interes || 'Admin. Pública', icon: <GraduationCap className="w-5 h-5" />, color: 'text-blue-600', isText: true },
          { label: 'Estado', value: 'En proceso', icon: <Activity className="w-5 h-5" />, color: 'text-blue-600', isText: true }
        ];
      default:
        return [];
    }
  };

  const kpiCards = getKPICards();

  // ════════════════════════════════════════════════════════════════════════════
  // SOCIAL FEED DATA - LinkedIn Style
  // ════════════════════════════════════════════════════════════════════════════
  
  const socialFeed: SocialPost[] = [
    {
      id: '1',
      author: {
        name: 'ESAP Comunicaciones',
        role: 'Oficina de Comunicaciones Institucionales',
        avatar: undefined
      },
      timestamp: 'Hace 2 horas',
      content: 'Felicitamos a nuestros estudiantes de Administración Pública por su participación en el Foro Internacional de Políticas Públicas 2024. Un orgullo para la comunidad ESAP.',
      type: 'announcement',
      likes: 45,
      comments: 8
    },
    {
      id: '2',
      author: {
        name: 'ESAP Comunicaciones',
        role: 'Oficina de Comunicaciones Institucionales',
        avatar: undefined
      },
      timestamp: 'Hace 5 horas',
      content: 'Recordatorio: Conferencia sobre "Transformación Digital en el Sector Público" este viernes 27 de diciembre a las 10:00 AM. Inscripciones abiertas.',
      type: 'event',
      likes: 28,
      comments: 12
    },
    {
      id: '3',
      author: {
        name: 'ESAP Comunicaciones',
        role: 'Oficina de Comunicaciones Institucionales',
        avatar: undefined
      },
      timestamp: 'Hace 1 día',
      content: 'Felicitaciones a nuestro egresado Carlos Mendoza (Promoción 2020), nombrado Director de Gestión Pública en la Alcaldía de Medellín. ¡Orgullo ESAP!',
      type: 'achievement',
      likes: 156,
      comments: 24
    },
    {
      id: '4',
      author: {
        name: 'ESAP Comunicaciones',
        role: 'Oficina de Comunicaciones Institucionales',
        avatar: undefined
      },
      timestamp: 'Hace 2 días',
      content: 'Nueva convocatoria: Ministerio de Hacienda busca 15 analistas de políticas públicas. Requisito: Profesional en Administración Pública. Aplica ahora en nuestra bolsa de empleo.',
      type: 'opportunity',
      likes: 89,
      comments: 15
    },
    {
      id: '5',
      author: {
        name: 'ESAP Comunicaciones',
        role: 'Oficina de Comunicaciones Institucionales',
        avatar: undefined
      },
      timestamp: 'Hace 3 días',
      content: '📢 Recordatorio: El periodo de inscripciones para el semestre 2025-I cierra el 15 de enero. No pierdas la oportunidad de hacer parte de la mejor escuela de administración pública del país.',
      type: 'announcement',
      likes: 67,
      comments: 5
    },
    {
      id: '6',
      author: {
        name: 'ESAP Comunicaciones',
        role: 'Oficina de Comunicaciones Institucionales',
        avatar: undefined
      },
      timestamp: 'Hace 4 días',
      content: '🎓 ESAP ocupa el primer lugar en formación de servidores públicos según el ranking ColombiaCheck 2024. Gracias por confiar en nuestra excelencia académica.',
      type: 'achievement',
      likes: 234,
      comments: 32
    }
  ];

  // ════════════════════════════════════════════════════════════════════════════
  // NETWORK CONTACTS - People You May Know
  // ════════════════════════════════════════════════════════════════════════════
  
  const suggestedContacts: NetworkContact[] = [
    {
      id: '1',
      name: 'Ana Gómez',
      role: 'Estudiante',
      department: 'Administración Pública - Semestre 6',
      mutualConnections: 5
    },
    {
      id: '2',
      name: 'Dr. Jorge López',
      role: 'Docente',
      department: 'Facultad de Derecho',
      mutualConnections: 12
    },
    {
      id: '3',
      name: 'Laura Martínez',
      role: 'Egresada',
      department: 'Ministerio del Interior',
      mutualConnections: 8
    }
  ];

  // ════════════════════════════════════════════════════════════════════════════
  // STATUS BADGE HELPER
  // ════════════════════════════════════════════════════════════════════════════
  
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Disponible</Badge>;
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Próximamente</Badge>;
      case 'attention':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Requiere atención</Badge>;
      case 'disabled':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200">No disponible</Badge>;
      default:
        return null;
    }
  };

  // ══════════��═════════════════════════════════════════════════════════════════
  // POST TYPE ICON HELPER
  // ════════════════════════════════════════════════════════════════════════════
  
  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return <Rss className="w-4 h-4 text-blue-600" />;
      case 'event':
        return <CalendarIcon className="w-4 h-4 text-purple-600" />;
      case 'achievement':
        return <Award className="w-4 h-4 text-green-600" />;
      case 'opportunity':
        return <Briefcase className="w-4 h-4 text-orange-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDERIZADO DE CONTENIDO DE SERVICIOS
  // ════════════════════════════════════════════════════════════════════════════

  const renderServicioContent = () => {
    const servicio = servicesData.find(s => s.id === servicioAbierto);
    if (!servicio) return null;

    // Renderizar componentes específicos según el servicio
    if (servicioAbierto === 'documentos-firmar') {
      return <PortalTransaccionalFirmaCompleto />;
    }

    // Contenido genérico por defecto
    return (
      <div className="space-y-6">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] rounded-lg p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <div className="text-white">{servicio.icon}</div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-semibold mb-1">{servicio.title}</h2>
              <p className="text-blue-100">{servicio.description}</p>
            </div>
            {servicio.badge && (
              <Badge className="bg-white/20 text-white border-white/30">
                {servicio.badge}
              </Badge>
            )}
          </div>
        </div>

        {/* Quick Stats si existen */}
        {servicio.quickStats && servicio.quickStats.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {servicio.quickStats.map((stat, idx) => (
              <Card key={idx} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600 mb-1">{stat.label}</div>
                  <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Main Content Area */}
        <Card className="border border-gray-200">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-lg">Información del Servicio</CardTitle>
            <CardDescription>
              Gestiona y consulta la información relacionada con este servicio
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-[#1e5da8]" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Este servicio está en desarrollo</p>
                  <p className="text-xs text-gray-600 mt-1">
                    La funcionalidad completa estará disponible próximamente. 
                    Por ahora puedes ver la información básica del servicio.
                  </p>
                </div>
              </div>

              {/* Placeholder Content */}
              <div className="border border-gray-200 rounded-lg p-6 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  {servicio.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{servicio.title}</h3>
                <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">
                  {servicio.description}
                </p>
                <div className="flex gap-2 justify-center">
                  <Button className="bg-[#1e5da8] hover:bg-[#1557a0]">
                    <Play className="w-4 h-4 mr-2" />
                    Iniciar
                  </Button>
                  <Button variant="outline">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Ayuda
                  </Button>
                </div>
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-[#1e5da8]" />
                    <h4 className="font-medium text-gray-900">Documentación</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Consulta la guía de uso y preguntas frecuentes sobre este servicio.
                  </p>
                  <Button variant="link" className="px-0 mt-2 text-[#1e5da8]">
                    Ver documentación →
                  </Button>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Phone className="w-4 h-4 text-[#1e5da8]" />
                    <h4 className="font-medium text-gray-900">Soporte</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    ¿Necesitas ayuda? Contacta a nuestro equipo de soporte técnico.
                  </p>
                  <Button variant="link" className="px-0 mt-2 text-[#1e5da8]">
                    Contactar soporte →
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => setServicioAbierto(null)}
            className="gap-2"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Volver a Servicios
          </Button>
          <Button className="bg-[#1e5da8] hover:bg-[#1557a0]">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Completar acción
          </Button>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════════════
  // MANEJO DE VISTAS ESPECIALIZADAS
  // ═══════════════════════════════════════════════════════════════════════════

  const volverADashboard = () => {
    setVistaActual('dashboard');
  };

  const ViewWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1">
        {children}
      </div>
      <FooterWorldClass />
    </div>
  );

  // Renderizar vistas especializadas CON FOOTER
  if (vistaActual === 'expedientes-legales') {
    return (
      <ViewWrapper>
        <MisExpedientesLegalesV2 onVolver={volverADashboard} />
      </ViewWrapper>
    );
  }

  if (vistaActual === 'perfil-usuario') {
    return (
      <ViewWrapper>
        <PerfilUsuarioEditable 
          onVolver={volverADashboard}
          userName={userName}
          userEmail={userEmail}
          activeRole={activeRole}
        />
      </ViewWrapper>
    );
  }

  if (vistaActual === 'control-interno') {
    return (
      <ViewWrapper>
        <DashboardAreaAuditada onVolver={volverADashboard} />
      </ViewWrapper>
    );
  }

  if (vistaActual === 'community-section') {
    return (
      <ViewWrapper>
        <CommunitySection onVolver={volverADashboard} />
      </ViewWrapper>
    );
  }

  if (vistaActual === 'solicitar-certificado-verificacion') {
    return (
      <ViewWrapper>
        <PublicTitleVerification onBack={volverADashboard} />
      </ViewWrapper>
    );
  }

  if (vistaActual === 'certificados-laborales') {
    return (
      <ViewWrapper>
        <CertificadosLaboralesPortal 
          onBack={volverADashboard} 
          userEmail={userEmail}
          userName={userName}
        />
      </ViewWrapper>
    );
  }

  if (vistaActual === 'docente-pta') {
    return (
      <ViewWrapper>
        <DocentesPTAPortal onVolver={volverADashboard} />
      </ViewWrapper>
    );
  }

  if (vistaActual === 'job-board') {
    return (
      <ViewWrapper>
        <JobBoardPortal onVolver={volverADashboard} />
      </ViewWrapper>
    );
  }

  if (vistaActual === 'notificaciones-arquitectura') {
    return (
      <ViewWrapper>
        <NotificacionesArquitectura onVolver={volverADashboard} />
      </ViewWrapper>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER PRINCIPAL - PORTAL V5.0 HYBRID STYLE
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-0">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ══════════════════════════════════════════════════════════════════
            COMMAND BAR - Microsoft Dynamics Style
            ═════════════════════════════════════════════════════════════════ */}
        <div className="bg-white border-b border-gray-200 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{userName}</h1>
              <p className="text-sm text-gray-600 mt-1">{activeRole} • {userEmail}</p>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-gray-300"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-gray-300"
                onClick={() => setVistaActual('perfil-usuario')}
              >
                <Settings className="w-4 h-4" />
                Configuración
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-gray-300 relative"
              >
                <Bell className="w-4 h-4" />
                Notificaciones
                <Badge className="absolute -top-2 -right-2 bg-red-600 text-white w-5 h-5 flex items-center justify-center p-0 text-xs rounded-full">
                  3
                </Badge>
              </Button>
            </div>
          </div>
        </div>

        <div className="py-6">
          
          {/* ══════════════════════════════════════════════════════════════════
              MAIN LAYOUT - 3 Column Grid (LinkedIn Style)
              ══════════════════════════════════════════════════════════════════ */}
          <div className="grid lg:grid-cols-12 gap-6">
            
            {/* ══════════════════════════════════════════════════════════════════
                LEFT SIDEBAR - Profile Card
                ══════════════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-3 space-y-4">
              {/* Professional Profile Card */}
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-0">
                  {/* Header background */}
                  <div className="h-16 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd]" />
                  
                  {/* Profile content */}
                  <div className="px-4 pb-4 -mt-8">
                    <Avatar className="w-16 h-16 ring-4 ring-white">
                      <AvatarImage src={roleData?.perfil?.foto} />
                      <AvatarFallback className="bg-[#1e5da8] text-white text-xl font-semibold">
                        {userName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <h3 className="mt-3 font-semibold text-gray-900">
                      {userName}
                    </h3>
                    <p className="text-sm text-gray-600 mb-1">{activeRole}</p>
                    <p className="text-xs text-gray-500 mb-3">{userEmail}</p>
                    
                    <Button 
                      className="w-full bg-[#1e5da8] hover:bg-[#1557a0]"
                      size="sm"
                      onClick={() => {
                        setMostrarPerfilCompleto(true);
                        setServicioAbierto(null);
                      }}
                    >
                      Ver perfil completo
                    </Button>

                    <Separator className="my-4" />

                    {/* Profile Details */}
                    <div className="space-y-3">
                      {/* Información de Contacto */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-2 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          Contacto
                        </h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Teléfono</span>
                            <span className="font-medium text-gray-900">
                              {roleData?.telefono || '+57 301 234 5678'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Extensión</span>
                            <span className="font-medium text-gray-900">
                              {roleData?.extension || '1234'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Ubicación</span>
                            <span className="font-medium text-gray-900 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {roleData?.ubicacion || 'Bogotá'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Separator className="my-3" />

                      {/* Información Profesional/Académica */}
                      {activeRole === 'Estudiante' && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <GraduationCap className="w-3 h-3" />
                            Información Académica
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Programa</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.programa || 'Admin. Pública'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Código</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.codigo || '2020123456'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Semestre</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.semestre || '6to Semestre'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Promedio</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.promedio || '4.2'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Créditos</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.creditos_cursados || '120'}/160
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Fecha ingreso</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.fecha_ingreso || 'Ago 2020'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Sede</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.sede || 'Bogotá'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeRole === 'Docente' && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            Información Profesional
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Facultad</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.facultad || 'Administración'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Departamento</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.departamento || 'Gestión Pública'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Vinculación</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.vinculacion || 'Tiempo Completo'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Nivel</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.nivel || 'Asociado'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Formación</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.formacion || 'Doctor'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Antigüedad</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.años_esap || '8 años'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Cursos activos</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.cursos_activos || '3'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Investigaciones</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.investigaciones || '5 activas'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {(activeRole === 'Administrativo' || activeRole === 'Funcionario') && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            Información Laboral
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Cargo</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.cargo || 'Coordinador'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Área</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.area || 'Control Interno'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Dependencia</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.dependencia || 'Oficina CIG'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Jefe inmediato</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.jefe || 'Dr. García'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Tipo contrato</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.tipo_contrato || 'Indefinido'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Antigüedad</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.antiguedad || '5 años'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Horario</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.horario || '8:00 - 17:00'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Oficina</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.oficina || 'Piso 3, Of. 301'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeRole === 'Graduado' && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            Información Profesional
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Título ESAP</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.titulo || 'Admin. Pública'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Promoción</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.promocion || '2020'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Empresa actual</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.empresa || 'Alcaldía Medellín'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Cargo actual</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.cargo_actual || 'Director Gestión'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Sector</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.sector || 'Público'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Experiencia</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.experiencia || '4 años'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Estudios post.</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.estudios_post || 'Maestría'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeRole === 'Aspirante' && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Información de Admisión
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Programa</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.programa_interes || 'Admin. Pública'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Modalidad</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.modalidad || 'Presencial'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Periodo</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.periodo || '2025-I'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Estado</span>
                              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                                En proceso
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Progreso</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.progreso || '65%'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Nivel educativo</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.nivel_educativo || 'Bachiller'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Documentos</span>
                              <span className="font-medium text-gray-900">
                                {roleData?.documentos_cargados || '4'}/5
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Pago realizado</span>
                              <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                                Sí
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Access Card */}
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#1e5da8]" />
                    Acceso Rápido
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-sm hover:bg-blue-50 hover:text-[#1e5da8]"
                    onClick={() => window.open(outlookUrl, '_blank', 'noopener,noreferrer')}
                  >
                    <Mail className="w-4 h-4" />
                    Correo Institucional
                  </Button>
                  {humanosoftUrl ? (
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 text-sm hover:bg-blue-50 hover:text-[#1e5da8]"
                      onClick={() => window.open(humanosoftUrl, '_blank', 'noopener,noreferrer')}
                    >
                      <Users className="w-4 h-4" />
                      Humano Soft
                    </Button>
                  ) : null}
                  {arcaUrl ? (
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 text-sm hover:bg-blue-50 hover:text-[#1e5da8]"
                      onClick={() => window.open(arcaUrl, '_blank', 'noopener,noreferrer')}
                    >
                      <GraduationCap className="w-4 h-4" />
                      ARCA ESAP
                    </Button>
                  ) : null}
                  <Separator className="my-2" />
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-sm hover:bg-blue-50 hover:text-[#1e5da8]"
                    onClick={() => setVistaActual('notificaciones-arquitectura')}
                  >
                    <Bell className="w-4 h-4" />
                    Notificaciones
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-sm hover:bg-blue-50 hover:text-[#1e5da8]"
                    onClick={() => setVistaActual('perfil-usuario')}
                  >
                    <Settings className="w-4 h-4" />
                    Configuración
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-sm hover:bg-blue-50 hover:text-[#1e5da8]"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Actualizar
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                CENTER CONTENT - Main Dashboard
                ══════════════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* KPI CARDS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiCards.map((kpi, idx) => (
                  <Card key={idx} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                          {kpi.label}
                        </span>
                        <div className={kpi.color}>{kpi.icon}</div>
                      </div>
                      <div className="text-2xl font-semibold text-gray-900">
                        {kpi.value}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* MIS SERVICIOS, PERFIL COMPLETO O SERVICIO ABIERTO */}
              {!mostrarPerfilCompleto && !servicioAbierto ? (
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader className="border-b border-gray-200 bg-white">
                    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-semibold text-gray-900">Mis Servicios</CardTitle>
                        <CardDescription className="text-sm text-gray-600 mt-1">
                          Accede a todos los servicios disponibles para tu rol
                        </CardDescription>
                      </div>
                    
                    <div className="flex gap-2 items-center w-full lg:w-auto">
                      <div className="relative flex-1 lg:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Buscar..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 pr-4 border-gray-300"
                        />
                      </div>
                      
                      <div className="flex gap-1 border border-gray-300 rounded-md p-1">
                        <Button
                          variant={viewMode === 'grid' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('grid')}
                          className={viewMode === 'grid' ? 'bg-[#1e5da8]' : ''}
                        >
                          <Grid3x3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'list' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('list')}
                          className={viewMode === 'list' ? 'bg-[#1e5da8]' : ''}
                        >
                          <List className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Category Filter */}
                  <div className="flex gap-2 mt-4 flex-wrap">
                    {categories.map((cat) => (
                      <Button
                        key={cat}
                        variant={selectedCategory === cat ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCategory(cat)}
                        className={selectedCategory === cat ? 'bg-[#1e5da8]' : 'border-gray-300'}
                      >
                        {cat === 'all' ? 'Todos' : cat}
                      </Button>
                    ))}
                  </div>
                </CardHeader>
                
                <CardContent className="p-6">
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredServices.map((service) => (
                        <motion.div
                          key={service.id}
                          whileHover={{ y: -2 }}
                          className="group"
                        >
                          <Card className="h-full border border-gray-200 hover:border-[#1e5da8] hover:shadow-md transition-all cursor-pointer"
                                onClick={service.action}>
                            <CardContent className="p-5">
                              <div className="flex items-start justify-between mb-3">
                                <div className="w-10 h-10 bg-[#1e5da8]/10 rounded-lg flex items-center justify-center text-[#1e5da8]">
                                  {service.icon}
                                </div>
                                {service.badge && (
                                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                                    {service.badge}
                                  </Badge>
                                )}
                              </div>
                              
                              <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-[#1e5da8] transition-colors">
                                {service.title}
                              </h3>
                              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                {service.description}
                              </p>
                              
                              {service.quickStats && service.quickStats.length > 0 && (
                                <div className="space-y-1 pt-3 border-t border-gray-100">
                                  {service.quickStats.map((stat, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs">
                                      <span className="text-gray-600">{stat.label}</span>
                                      <span className="font-semibold text-gray-900">{stat.value}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              <div className="mt-4 flex items-center justify-between">
                                {getStatusBadge(service.status)}
                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1e5da8] group-hover:translate-x-1 transition-all" />
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredServices.map((service) => (
                        <motion.div
                          key={service.id}
                          whileHover={{ x: 4 }}
                          className="group"
                        >
                          <div className="border border-gray-200 rounded-lg p-4 hover:border-[#1e5da8] hover:bg-blue-50/50 transition-all cursor-pointer"
                               onClick={service.action}>
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-[#1e5da8]/10 rounded-lg flex items-center justify-center text-[#1e5da8] flex-shrink-0">
                                {service.icon}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-gray-900 group-hover:text-[#1e5da8] transition-colors">
                                    {service.title}
                                  </h3>
                                  <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-xs">
                                    {service.category}
                                  </Badge>
                                  {service.badge && (
                                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                                      {service.badge}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">
                                  {service.description}
                                </p>
                              </div>
                              
                              {service.quickStats && service.quickStats.length > 0 && (
                                <div className="hidden lg:flex gap-6 flex-shrink-0">
                                  {service.quickStats.map((stat, idx) => (
                                    <div key={idx} className="text-center">
                                      <div className="text-lg font-semibold text-gray-900">{stat.value}</div>
                                      <div className="text-xs text-gray-600">{stat.label}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              <div className="flex items-center gap-3 flex-shrink-0">
                                {getStatusBadge(service.status)}
                                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#1e5da8] group-hover:translate-x-1 transition-all" />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  
                  {filteredServices.length === 0 && (
                    <div className="text-center py-12">
                      <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">No se encontraron servicios</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              ) : mostrarPerfilCompleto ? (
                /* MI PERFIL COMPLETO */
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader className="border-b border-gray-200 bg-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-semibold text-gray-900">Mi Perfil</CardTitle>
                        <CardDescription className="text-sm text-gray-600 mt-1">
                          Gestiona tu información y privacidad
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMostrarPerfilCompleto(false);
                          setServicioAbierto(null);
                        }}
                        className="gap-2"
                      >
                        <X className="w-4 h-4" />
                        Volver a Servicios
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6">
                    {/* Profile Header */}
                    <div className="flex items-start gap-6 mb-6 pb-6 border-b border-gray-200">
                      <Avatar className="w-24 h-24 ring-4 ring-[#1e5da8]/10">
                        <AvatarImage src={roleData?.perfil?.foto} />
                        <AvatarFallback className="bg-[#1e5da8] text-white text-3xl font-semibold">
                          {userName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h2 className="text-2xl font-semibold text-gray-900">{userName}</h2>
                        <p className="text-base text-gray-600 mt-1">{activeRole}</p>
                        <p className="text-sm text-gray-500 mt-1">{userEmail}</p>
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" size="sm" className="gap-2">
                            <Edit className="w-4 h-4" />
                            Editar perfil
                          </Button>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Eye className="w-4 h-4" />
                            Ver perfil público
                          </Button>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          Completitud del perfil: <span className="font-bold">84%</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">Completa tu perfil para mejorar tu visibilidad</p>
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-4 mb-6 border-b border-gray-200">
                      <button
                        className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                          perfilTab === 'personal'
                            ? 'text-[#1e5da8] border-b-2 border-[#1e5da8]'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        onClick={() => setPerfilTab('personal')}
                      >
                        <UserCircle2 className="w-4 h-4 inline-block mr-2" />
                        Personal
                      </button>
                      <button
                        className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                          perfilTab === 'laboral'
                            ? 'text-[#1e5da8] border-b-2 border-[#1e5da8]'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        onClick={() => setPerfilTab('laboral')}
                      >
                        <Briefcase className="w-4 h-4 inline-block mr-2" />
                        Laboral
                      </button>
                      <button
                        className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                          perfilTab === 'privacidad'
                            ? 'text-[#1e5da8] border-b-2 border-[#1e5da8]'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        onClick={() => setPerfilTab('privacidad')}
                      >
                        <Shield className="w-4 h-4 inline-block mr-2" />
                        Privacidad
                      </button>
                      <button
                        className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                          perfilTab === 'historial'
                            ? 'text-[#1e5da8] border-b-2 border-[#1e5da8]'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        onClick={() => setPerfilTab('historial')}
                      >
                        <Clock className="w-4 h-4 inline-block mr-2" />
                        Historial
                      </button>
                    </div>

                    {/* Tab Content */}
                    <div className="space-y-6">
                      {perfilTab === 'personal' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                              Información Básica
                            </h3>
                            <div className="space-y-4">
                              <div>
                                <label className="text-xs font-medium text-gray-600">Nombres</label>
                                <Input defaultValue={userName.split(' ')[0]} className="mt-1" />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">Apellidos</label>
                                <Input defaultValue={userName.split(' ').slice(1).join(' ')} className="mt-1" />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">Email institucional</label>
                                <Input defaultValue={userEmail} className="mt-1" disabled />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">Celular</label>
                                <Input defaultValue={roleData?.telefono || '+57 301 234 5678'} className="mt-1" />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">Teléfono fijo</label>
                                <Input defaultValue={roleData?.telefono_fijo || '+57 (601) 444-0909'} className="mt-1" />
                              </div>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                              Identificación
                            </h3>
                            <div className="space-y-4">
                              <div>
                                <label className="text-xs font-medium text-gray-600">Tipo de documento</label>
                                <Input defaultValue="Cédula de Ciudadanía" className="mt-1" disabled />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">Número de documento</label>
                                <Input defaultValue="1012345678" className="mt-1" disabled />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">Fecha de nacimiento</label>
                                <Input type="date" defaultValue="1990-05-15" className="mt-1" />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">Género</label>
                                <Input defaultValue="Masculino" className="mt-1" />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">Estado civil</label>
                                <Input defaultValue="Soltero/a" className="mt-1" />
                              </div>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                              Ubicación
                            </h3>
                            <div className="space-y-4">
                              <div>
                                <label className="text-xs font-medium text-gray-600">Dirección de residencia</label>
                                <Input defaultValue="Calle 44 #53-37" className="mt-1" />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">Ciudad</label>
                                <Input defaultValue="Bogotá D.C." className="mt-1" />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">Departamento</label>
                                <Input defaultValue="Cundinamarca" className="mt-1" />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">País</label>
                                <Input defaultValue="Colombia" className="mt-1" />
                              </div>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                              Biografía
                            </h3>
                            <Textarea 
                              placeholder="Escribe una breve biografía profesional..."
                              className="min-h-[120px]"
                              defaultValue={`Profesional en ${activeRole === 'Estudiante' ? 'formación en Administración Pública' : 'Administración Pública'} con ${roleData?.antiguedad || '5 años'} de experiencia en gestión de procesos institucionales y control interno.`}
                            />
                            <p className="text-xs text-gray-500 mt-2">121/300 caracteres</p>
                          </div>
                        </div>
                      )}

                      {perfilTab === 'laboral' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                              Información Institucional
                            </h3>
                            <div className="space-y-4">
                              {activeRole === 'Estudiante' && (
                                <>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600">Código estudiantil</label>
                                    <Input defaultValue={roleData?.codigo || '2020123456'} className="mt-1" disabled />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600">Programa académico</label>
                                    <Input defaultValue={roleData?.programa || 'Administración Pública'} className="mt-1" disabled />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600">Semestre actual</label>
                                    <Input defaultValue={roleData?.semestre || '6to Semestre'} className="mt-1" disabled />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600">Sede</label>
                                    <Input defaultValue={roleData?.sede || 'Bogotá'} className="mt-1" disabled />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600">Fecha de ingreso</label>
                                    <Input defaultValue={roleData?.fecha_ingreso || 'Agosto 2020'} className="mt-1" disabled />
                                  </div>
                                </>
                              )}
                              {(activeRole === 'Administrativo' || activeRole === 'Funcionario') && (
                                <>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600">Cargo</label>
                                    <Input defaultValue={roleData?.cargo || 'Coordinador'} className="mt-1" disabled />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600">Área</label>
                                    <Input defaultValue={roleData?.area || 'Control Interno'} className="mt-1" disabled />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600">Dependencia</label>
                                    <Input defaultValue={roleData?.dependencia || 'Oficina CIG'} className="mt-1" disabled />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600">Jefe inmediato</label>
                                    <Input defaultValue={roleData?.jefe || 'Dr. García'} className="mt-1" disabled />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600">Tipo de contrato</label>
                                    <Input defaultValue={roleData?.tipo_contrato || 'Indefinido'} className="mt-1" disabled />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600">Antigüedad</label>
                                    <Input defaultValue={roleData?.antiguedad || '5 años'} className="mt-1" disabled />
                                  </div>
                                </>
                              )}
                              {activeRole === 'Docente' && (
                                <>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600">Facultad</label>
                                    <Input defaultValue={roleData?.facultad || 'Administración'} className="mt-1" disabled />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600">Departamento</label>
                                    <Input defaultValue={roleData?.departamento || 'Gestión Pública'} className="mt-1" disabled />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600">Tipo de vinculación</label>
                                    <Input defaultValue={roleData?.vinculacion || 'Tiempo Completo'} className="mt-1" disabled />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600">Nivel</label>
                                    <Input defaultValue={roleData?.nivel || 'Asociado'} className="mt-1" disabled />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600">Máxima formación</label>
                                    <Input defaultValue={roleData?.formacion || 'Doctor'} className="mt-1" disabled />
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          <div>
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                              Información de Contacto Laboral
                            </h3>
                            <div className="space-y-4">
                              <div>
                                <label className="text-xs font-medium text-gray-600">Extensión</label>
                                <Input defaultValue={roleData?.extension || '1234'} className="mt-1" />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">Oficina</label>
                                <Input defaultValue={roleData?.oficina || 'Piso 3, Of. 301'} className="mt-1" />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">Horario de atención</label>
                                <Input defaultValue={roleData?.horario || '8:00 AM - 5:00 PM'} className="mt-1" />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">Email alternativo</label>
                                <Input defaultValue="" placeholder="email@personal.com" className="mt-1" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {perfilTab === 'privacidad' && (
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                              Control de Privacidad
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                              Controla qué información es visible para otros usuarios de la comunidad ESAP.
                            </p>
                            
                            <div className="space-y-4 border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-sm text-gray-900">Email institucional</p>
                                  <p className="text-xs text-gray-600">Permite que otros te contacten por email</p>
                                </div>
                                <input type="checkbox" defaultChecked className="w-4 h-4" />
                              </div>
                              <Separator />
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-sm text-gray-900">Teléfono</p>
                                  <p className="text-xs text-gray-600">Muestra tu número de contacto</p>
                                </div>
                                <input type="checkbox" className="w-4 h-4" />
                              </div>
                              <Separator />
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-sm text-gray-900">Ubicación</p>
                                  <p className="text-xs text-gray-600">Ciudad y departamento</p>
                                </div>
                                <input type="checkbox" defaultChecked className="w-4 h-4" />
                              </div>
                              <Separator />
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-sm text-gray-900">Biografía</p>
                                  <p className="text-xs text-gray-600">Perfil profesional visible</p>
                                </div>
                                <input type="checkbox" defaultChecked className="w-4 h-4" />
                              </div>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                              Datos Públicos
                            </h3>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex gap-2">
                                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-blue-900 mb-1">Los datos privados solo son visibles para ti y los administradores del sistema.</p>
                                  <p className="text-xs text-blue-700">5/9 campos públicos</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {perfilTab === 'historial' && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                            Historial de Cambios
                          </h3>
                          <div className="space-y-3">
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                              <div className="w-2 h-2 bg-[#1e5da8] rounded-full mt-2"></div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">Actualización de teléfono celular</p>
                                <p className="text-xs text-gray-600">Hace 2 días - 22 de diciembre, 2024</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                              <div className="w-2 h-2 bg-[#1e5da8] rounded-full mt-2"></div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">Cambio de configuración de privacidad</p>
                                <p className="text-xs text-gray-600">Hace 1 semana - 17 de diciembre, 2024</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                              <div className="w-2 h-2 bg-gray-300 rounded-full mt-2"></div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">Actualización de fotografía de perfil</p>
                                <p className="text-xs text-gray-600">Hace 3 semanas - 3 de diciembre, 2024</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-6 border-t border-gray-200">
                        <Button className="bg-[#1e5da8] hover:bg-[#1557a0]">
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Guardar cambios
                        </Button>
                        <Button variant="outline" onClick={() => {
                          setMostrarPerfilCompleto(false);
                          setServicioAbierto(null);
                        }}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : servicioAbierto ? (
                /* SERVICIO ABIERTO */
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader className="border-b border-gray-200 bg-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-semibold text-gray-900">
                          {servicesData.find(s => s.id === servicioAbierto)?.title || 'Servicio'}
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-600 mt-1">
                          {servicesData.find(s => s.id === servicioAbierto)?.description || 'Gestiona tu servicio'}
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setServicioAbierto(null)}
                        className="gap-2"
                      >
                        <X className="w-4 h-4" />
                        Volver a Servicios
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6">
                    {renderServicioContent()}
                  </CardContent>
                </Card>
              ) : null}
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                RIGHT SIDEBAR - Social Feed (LinkedIn Style)
                ══════════════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-3 space-y-4">
              
              {/* Social Feed */}
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3 border-b border-gray-200">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Rss className="w-4 h-4 text-[#1e5da8]" />
                    Actividad de la Comunidad
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-100">
                    {socialFeed.map((post) => (
                      <div key={post.id} className="p-4 hover:bg-gray-50 transition-colors">
                        {/* Post Header */}
                        <div className="flex items-start gap-3 mb-3">
                          <Avatar className="w-10 h-10 flex-shrink-0">
                            <AvatarFallback className="bg-[#1e5da8] text-white text-xs">
                              {post.author.name.substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm text-gray-900 truncate">
                              {post.author.name}
                            </h4>
                            <p className="text-xs text-gray-600 truncate">{post.author.role}</p>
                            <p className="text-xs text-gray-500">{post.timestamp}</p>
                          </div>
                          {getPostTypeIcon(post.type)}
                        </div>
                        
                        {/* Post Content */}
                        <p className="text-sm text-gray-700 mb-3 line-clamp-3">
                          {post.content}
                        </p>
                        
                        {/* Post Actions */}
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <button className="flex items-center gap-1 hover:text-[#1e5da8] transition-colors">
                            <ThumbsUp className="w-4 h-4" />
                            <span>{post.likes}</span>
                          </button>
                          <button className="flex items-center gap-1 hover:text-[#1e5da8] transition-colors">
                            <MessageCircle className="w-4 h-4" />
                            <span>{post.comments}</span>
                          </button>
                          <button className="flex items-center gap-1 hover:text-[#1e5da8] transition-colors ml-auto">
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-4 border-t border-gray-200">
                    <Button 
                      variant="outline" 
                      className="w-full border-[#1e5da8] text-[#1e5da8] hover:bg-blue-50"
                      size="sm"
                    >
                      Ver más publicaciones
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming Events */}
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-[#1e5da8]" />
                    Próximos Eventos
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <div className="flex gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex-shrink-0 w-12 h-12 bg-[#1e5da8] text-white rounded-lg flex flex-col items-center justify-center">
                      <span className="text-xs font-semibold">DIC</span>
                      <span className="text-lg font-bold">27</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-gray-900">
                        Transformación Digital
                      </h4>
                      <p className="text-xs text-gray-600">10:00 AM - Virtual</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                    <div className="flex-shrink-0 w-12 h-12 bg-green-600 text-white rounded-lg flex flex-col items-center justify-center">
                      <span className="text-xs font-semibold">ENE</span>
                      <span className="text-lg font-bold">15</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-gray-900">
                        Inicio Matrícula 2025-I
                      </h4>
                      <p className="text-xs text-gray-600">Todo el día</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Footer World-Class */}
      <div className="mt-12">
        <FooterWorldClass />
      </div>
    </div>
  );
}
