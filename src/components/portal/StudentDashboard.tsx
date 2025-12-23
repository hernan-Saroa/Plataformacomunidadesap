import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Calendar,
  FileText,
  Award,
  Bell,
  MessageSquare,
  CreditCard,
  Download,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  GraduationCap,
  BarChart3,
  Zap,
  Search,
  Home,
  UserPlus,
  Send,
  Share2,
  Star,
  Target,
  Globe,
  Settings,
  ExternalLink,
  Building2,
  MapPin,
  Newspaper,
  PartyPopper,
  Megaphone,
  BookMarked,
  ClipboardList,
  UserCheck,
  School,
  TrendingDown,
  ArrowRight,
  Eye,
  Building,
  Sparkles,
  ArrowLeft,
  X,
  Upload,
  Shield,
  Phone,
  Mail,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { OnboardingTour } from '../shared/OnboardingTour';
import { GlobalSearch } from '../shared/GlobalSearch';
import { Tooltip } from '../ui/tooltip-enhanced';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { Input } from '../ui/input';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { VerificationCertificateDisplay } from './VerificationCertificateDisplay';
import esapLogoWhite from 'figma:asset/2eabfe85218557ad27ece74d963c4a3b61b716be.png';
import { NewsEventDetailView } from './NewsEventDetailView';
import { CommunitySection } from './CommunitySection';
import { ProfilePage } from './ProfilePage';
import type { VerificationCertificate } from '../../types';
import { toast } from 'sonner@2.0.3';

interface StudentDashboardProps {
  userName: string;
  userEmail: string;
  onLogout?: () => void;
}

export function StudentDashboard({ userName, userEmail, onLogout }: StudentDashboardProps) {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [activeSection, setActiveSection] = useState<string>('inicio');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [generatedCertificate, setGeneratedCertificate] = useState<VerificationCertificate | null>(null);
  const [selectedNewsEvent, setSelectedNewsEvent] = useState<any | null>(null);
  


  // Datos mock del estudiante
  const studentData = {
    programa: 'Administración Pública Territorial',
    semestre: 6,
    promedio: 4.2,
    creditosAprobados: 84,
    creditosTotales: 140,
    materiasActuales: 5,
    estado: 'Activo',
    codigoEstudiante: '2021-0234',
    documento: '1.234.567.890',
    rolAsignado: 'Estudiante',
    perfil: {
      foto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
      ubicacion: 'Bogotá, Colombia',
    },
  };

  // Servicios principales (Quick Actions)
  // SINCRONIZADO CON BACKOFFICE: Solo servicios implementados
  const mainServices = [
    {
      id: 'certificado-titulo',
      title: 'Verificación de Títulos',
      description: 'Validación instantánea con código QR único y trazabilidad completa. Certificados con firma digital ONAC reconocida legalmente.',
      icon: Award,
      color: 'from-blue-500 to-blue-600',
      badge: 'Seguro',
      action: 'request',
    },
  ];

  // Noticias y anuncios de la universidad
  const newsAndEvents = [
    {
      id: 1,
      type: 'event' as const,
      title: 'Webinar: Transformación Digital en el Sector Público',
      description: 'Expertos nacionales e internacionales discutirán sobre las mejores prácticas en transformación digital para entidades públicas.',
      fullContent: 'En este webinar exploraremos cómo la transformación digital está revolucionando la gestión pública en Colombia y el mundo. Contaremos con panelistas de renombre internacional que compartirán casos de éxito, desafíos y oportunidades en la implementación de tecnologías emergentes en entidades gubernamentales. Los asistentes podrán participar en sesiones interactivas de Q&A y recibirán un certificado de asistencia avalado por ESAP.',
      date: '15 Nov 2025',
      time: '3:00 PM - 6:00 PM',
      location: 'Virtual - Zoom',
      image: 'https://images.unsplash.com/photo-1582192904915-d89c7250b235?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      category: 'Evento',
      attendees: 234,
      views: 1456,
      likes: 89,
      comments: 23,
      tags: ['Virtual', 'Gratuito', 'Certificado'],
      author: {
        name: 'Dr. Carlos Rodríguez',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
        role: 'Director de Extensión ESAP',
      },
      organizer: {
        name: 'Dirección de Extensión ESAP',
        email: 'extension@esap.edu.co',
        phone: '+57 601 2222800',
      },
      registrationUrl: 'https://esap.edu.co/eventos/transformacion-digital',
      materials: [
        { name: 'Agenda del Webinar', url: '/docs/agenda.pdf', type: 'PDF' },
        { name: 'Presentación Introductoria', url: '/docs/intro.pptx', type: 'PPTX' },
      ],
      relatedEvents: [
        {
          id: 5,
          title: 'Taller: Gobierno Digital',
          date: '20 Nov 2025',
          image: 'https://images.unsplash.com/photo-1758413350815-7b06dbbfb9a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
        },
      ],
    },
    {
      id: 2,
      type: 'news' as const,
      title: 'ESAP firma convenio con la Procuraduría General de la Nación',
      description: 'Nuevo acuerdo interinstitucional permitirá a estudiantes realizar prácticas profesionales en la Procuraduría y fortalecer su formación.',
      fullContent: 'La Escuela Superior de Administración Pública - ESAP y la Procuraduría General de la Nación firmaron un convenio marco de cooperación que beneficiará a más de 500 estudiantes anualmente. El acuerdo incluye: prácticas profesionales remuneradas, acceso a bases de datos especializadas, participación en proyectos de investigación conjuntos, y capacitaciones en temas de control disciplinario y veeduría ciudadana. Este convenio fortalece el compromiso de la ESAP con la formación integral de servidores públicos de excelencia.',
      date: 'Hace 2 días',
      image: 'https://images.unsplash.com/photo-1568632234163-6786c4f9f282?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      category: 'Noticia',
      views: 2345,
      likes: 156,
      comments: 45,
      tags: ['Convenios', 'Prácticas', 'Procuraduría'],
      author: {
        name: 'Oficina de Comunicaciones',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop',
        role: 'ESAP',
      },
    },
    {
      id: 3,
      type: 'announcement' as const,
      title: 'Inscripciones abiertas: Especialización en Gestión Pública Digital',
      description: 'Ya están abiertas las inscripciones para el nuevo programa de especialización. Cupos limitados. Descuento especial para egresados.',
      fullContent: 'La ESAP se complace en anunciar la apertura de inscripciones para el nuevo programa de Especialización en Gestión Pública Digital. Este programa de vanguardia está diseñado para formar líderes capaces de gestionar la transformación digital en entidades públicas. Incluye módulos sobre: Gobierno Digital, Analítica de Datos, Ciberseguridad en el Sector Público, Innovación y Servicios Digitales. Duración: 2 semestres. Modalidad: Virtual con encuentros presenciales. Descuento del 20% para egresados ESAP. ¡Cupos limitados!',
      date: 'Hace 3 días',
      category: 'Anuncio',
      views: 3456,
      likes: 234,
      comments: 67,
      tags: ['Posgrado', 'Inscripciones', 'Especialización'],
      badge: 'Nuevo',
      registrationUrl: 'https://esap.edu.co/programas/especializacion-gestion-digital',
      organizer: {
        name: 'Oficina de Admisiones',
        email: 'admisiones@esap.edu.co',
        phone: '+57 601 2222800 ext. 234',
      },
    },
    {
      id: 4,
      type: 'achievement',
      title: 'Estudiantes ESAP ganan premio nacional de investigación',
      description: 'El proyecto "Políticas Públicas para el Desarrollo Rural" obtuvo el primer lugar en el Congreso Nacional de Administración Pública.',
      date: 'Hace 5 días',
      image: 'https://images.unsplash.com/photo-1738949538943-e54722a44ffc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      category: 'Logro',
      tags: ['Investigación', 'Reconocimiento'],
    },
  ];

  // Convocatorias docentes
  const teacherCalls = [
    {
      id: 1,
      title: 'Docente Cátedra - Derecho Administrativo',
      department: 'Facultad de Derecho',
      type: 'Cátedra',
      deadline: '30 Nov 2025',
      requirements: 'Título profesional + Maestría',
      status: 'Abierta',
    },
    {
      id: 2,
      title: 'Docente Tiempo Completo - Gestión Pública',
      department: 'Facultad de Administración',
      type: 'Planta',
      deadline: '15 Dic 2025',
      requirements: 'Doctorado + Experiencia investigativa',
      status: 'Abierta',
    },
  ];



  // Blogs académicos y documentos de investigación
  const academicBlogs = [
    {
      id: 1,
      type: 'blog',
      title: 'La Nueva Era de la Gestión Pública en Colombia',
      author: 'Dr. Carlos Rodríguez',
      authorRole: 'Docente ESAP - Investigador',
      authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
      excerpt: 'Un análisis profundo sobre cómo la transformación digital está revolucionando la administración pública en Colombia y América Latina.',
      image: 'https://images.unsplash.com/photo-1759772238028-718e57eb31f8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      publishDate: '10 Nov 2025',
      readTime: '8 min',
      category: 'Gestión Pública',
      tags: ['Transformación Digital', 'Gobierno', 'Innovación'],
      views: 1245,
      likes: 89,
    },
    {
      id: 2,
      type: 'research',
      title: 'Políticas Públicas para el Desarrollo Territorial Sostenible',
      author: 'Dra. María Fernández',
      authorRole: 'Coordinadora de Investigación',
      authorAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop',
      excerpt: 'Paper de investigación sobre estrategias efectivas para el desarrollo territorial en regiones rurales colombianas.',
      image: 'https://images.unsplash.com/photo-1761160803166-da886bb7efcc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      publishDate: '8 Nov 2025',
      readTime: '15 min',
      category: 'Investigación',
      tags: ['Desarrollo Territorial', 'Sostenibilidad', 'Políticas Públicas'],
      views: 2134,
      likes: 156,
      citations: 12,
    },
  ];

  // Categorías de investigación
  const researchCategories = [
    { name: 'Gestión Pública', count: 45, color: 'from-blue-500 to-blue-600' },
    { name: 'Políticas Públicas', count: 38, color: 'from-green-500 to-green-600' },
    { name: 'Derecho Administrativo', count: 32, color: 'from-purple-500 to-purple-600' },
    { name: 'Economía Pública', count: 28, color: 'from-orange-500 to-orange-600' },
    { name: 'Desarrollo Territorial', count: 25, color: 'from-pink-500 to-pink-600' },
    { name: 'Participación Ciudadana', count: 22, color: 'from-indigo-500 to-indigo-600' },
  ];

  // Ofertas de empleo - SINCRONIZADO CON BACKOFFICE (JobBoardManagementModulePremium)
  const jobOffers = [
    {
      id: 1,
      title: 'Analista de Políticas Públicas',
      company: 'Ministerio del Interior',
      logo: 'https://images.unsplash.com/photo-1568632234163-6786c4f9f282?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200',
      location: 'Bogotá D.C.',
      salary: '$4.500.000 - $6.000.000 COP',
      posted: 'Hace 5 días',
      tags: ['Políticas Públicas', 'Análisis', 'Gobierno'],
      applicationsCount: 45,
      viewsCount: 320,
    },
    {
      id: 2,
      title: 'Coordinador de Proyectos Sociales',
      company: 'Departamento de Planeación',
      logo: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200',
      location: 'Medellín',
      salary: '$5.000.000 - $7.000.000 COP',
      posted: 'Hace 7 días',
      tags: ['Proyectos', 'Social', 'Coordinación'],
      applicationsCount: 38,
      viewsCount: 280,
    },
    {
      id: 3,
      title: 'Asesor en Gestión Territorial',
      company: 'Gobernación de Antioquia',
      logo: 'https://images.unsplash.com/photo-1739298061740-5ed03045b280?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200',
      location: 'Medellín',
      salary: '$4.000.000 - $5.500.000 COP',
      posted: 'Hace 10 días',
      tags: ['Territorial', 'Asesoría', 'Gobierno'],
      applicationsCount: 28,
      viewsCount: 195,
    },
    {
      id: 4,
      title: 'Practicante de Administración Pública',
      company: 'Alcaldía de Bogotá',
      logo: 'https://images.unsplash.com/photo-1698047681469-8e0c19e80a66?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200',
      location: 'Bogotá D.C.',
      salary: '$1.500.000 COP',
      posted: 'Hace 3 días',
      tags: ['Práctica', 'Estudiantes', 'Administración'],
      applicationsCount: 67,
      viewsCount: 450,
    },
    {
      id: 5,
      title: 'Consultor en Derecho Público',
      company: 'Contraloría General',
      logo: 'https://images.unsplash.com/photo-1763739527636-d3d8cac52d6b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200',
      location: 'Bogotá D.C.',
      salary: '$6.000.000 - $8.000.000 COP',
      posted: 'Hace 15 días',
      tags: ['Consultoría', 'Derecho', 'Público'],
      applicationsCount: 22,
      viewsCount: 180,
    },
    {
      id: 6,
      title: 'Asesor en Gestión Pública Digital',
      company: 'DNP - Departamento Nacional de Planeación',
      logo: 'https://images.unsplash.com/photo-1496180470114-6ef490f3ff22?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200',
      location: 'Bogotá D.C.',
      salary: '$7.000.000 - $9.500.000 COP',
      posted: 'Hace 4 días',
      tags: ['Digital', 'Innovación', 'Gobierno'],
      applicationsCount: 52,
      viewsCount: 380,
    },
  ];

  const handleServiceClick = (serviceId: string) => {
    setSelectedService(serviceId);
    
    // Si es verificación de títulos, generar automáticamente
    if (serviceId === 'certificado-titulo') {
      handleGenerateAutoCertificate();
      return;
    }
    
    // Navegar a la sección correspondiente
    if (serviceId === 'certificado-estudios') {
      setActiveSection('certificados');
    } else if (serviceId === 'certificado-laboral') {
      setActiveSection('certificado-laboral');
    } else if (serviceId === 'convocatorias-docentes') {
      setActiveSection('convocatorias');
    }
  };

  // Función para generar certificado automáticamente (estudiante logueado)
  const handleGenerateAutoCertificate = () => {
    const now = new Date().toISOString();
    const qrCodeValue = `QR-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
    
    // Generar datos del graduado basado en el usuario actual
    const mockCertificate: VerificationCertificate = {
      id: `CERT-${Date.now()}`,
      certificateNumber: `ESAP-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      qrCode: qrCodeValue,
      qrUrl: `${window.location.origin}/verificar-certificado/${qrCodeValue}`,
      status: 'active',
      generatedAt: now,
      expiresAt: undefined,
      graduate: {
        documentNumber: `1${Math.floor(Math.random() * 999999999).toString().padStart(9, '0')}`,
        documentIssueDate: '2015-03-15',
        fullName: userName || 'Estudiante ESAP',
        titleType: 'Pregrado',
        programName: studentData.programa,
        diplomaNumber: `DIP-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        graduationDate: new Date(2023, 5, 15).toISOString(),
        gpa: studentData.promedio,
        honors: studentData.promedio >= 4.5 ? 'Cum Laude' : undefined,
      },
      requester: {
        name: userName || 'Estudiante ESAP',
        email: userEmail,
        type: 'graduado',
        notes: 'Certificado solicitado desde el Portal Transaccional',
      },
      viewCount: 0,
      qrScanCount: 0,
      scanHistory: [],
      createdAt: now,
      updatedAt: now,
    };

    // Simular delay de generación
    toast.loading('Generando tu certificado...', { duration: 1500 });
    
    setTimeout(() => {
      setGeneratedCertificate(mockCertificate);
      setActiveSection('certificados');
      toast.success('¡Certificado generado exitosamente!', {
        description: 'El certificado ha sido enviado a tu correo electrónico',
        duration: 4000,
      });
    }, 1500);
  };

  const renderNewsCard = (item: typeof newsAndEvents[0]) => {
    return (
      <Card 
        key={item.id} 
        className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group shadow-sm"
        onClick={() => setSelectedNewsEvent(item)}
      >
        {item.image && (
          <div className="relative h-52 overflow-hidden">
            <ImageWithFallback
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-4 left-4">
              <Badge className="bg-white/90 backdrop-blur-sm text-gray-900 font-semibold">
                {item.category}
              </Badge>
            </div>
            {item.badge && (
              <div className="absolute top-4 right-4">
                <Badge className="bg-red-500 text-white font-semibold shadow-lg">
                  {item.badge}
                </Badge>
              </div>
            )}
          </div>
        )}
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-black text-gray-900 group-hover:text-[#1e5da8] transition-colors line-clamp-2 flex-1">
              {item.title}
            </h3>
          </div>
          <p className="text-sm text-gray-600 mb-4 line-clamp-3 leading-relaxed">{item.description}</p>
          
          {item.type === 'event' && (
            <div className="space-y-2.5 mb-4">
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span className="font-semibold">{item.date} • {item.time}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{item.location}</span>
              </div>
              {item.attendees && (
                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{item.attendees} personas interesadas</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs font-semibold">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">{item.date}</span>
            </div>
          </div>

          <Button 
            className="w-full mt-4 gap-2 bg-[#1e5da8] hover:bg-[#003DA5] transition-all duration-300 font-semibold"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedNewsEvent(item);
            }}
          >
            {item.type === 'event' ? 'Ver detalles y registrarme' : 'Leer más'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-20 md:pb-0">
      {/* Onboarding Tour */}
      {showOnboarding && (
        <OnboardingTour
          context="portal"
          onComplete={() => setShowOnboarding(false)}
        />
      )}

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Sidebar Izquierdo - Perfil */}
          <div className="lg:col-span-4 space-y-6">
            {/* Perfil Card */}
            <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
              <div className="relative h-24 bg-gradient-to-r from-[#003DA5] to-[#1e5da8]" />
              <CardContent className="pt-0 px-6 pb-6">
                <div className="flex flex-col items-center -mt-12">
                  <Avatar className="w-24 h-24 ring-4 ring-white shadow-xl">
                    <AvatarImage src={studentData.perfil.foto} alt={userName} />
                    <AvatarFallback className="bg-gradient-to-br from-[#003DA5] to-[#1e5da8] text-white text-xl">
                      {userName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="mt-4 text-lg font-black text-gray-900 text-center">{userName}</h3>
                  <p className="text-sm text-gray-600 text-center mb-3 px-2">
                    {studentData.programa}
                  </p>
                  <Badge variant="secondary" className="text-xs font-semibold">
                    Semestre {studentData.semestre}
                  </Badge>

                  <Separator className="w-full my-5" />

                  {/* Información Usuario */}
                  <div className="w-full space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Documento</span>
                      <span className="text-sm font-bold text-gray-900">CC {studentData.documento}</span>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm text-gray-600 flex-shrink-0">Correo</span>
                      <span className="text-sm font-bold text-gray-900 text-right break-words">{userEmail}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Rol Asignado</span>
                      <span className="text-sm font-black text-[#003DA5]">
                        {studentData.rolAsignado}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Estado</span>
                      <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 text-xs font-semibold">
                        {studentData.estado}
                      </Badge>
                    </div>
                  </div>

                  <Separator className="w-full my-5" />

                  <Button 
                    variant="outline" 
                    className="w-full gap-2 hover:bg-[#1e5da8] hover:text-white hover:border-[#1e5da8] transition-all duration-300 font-semibold"
                    onClick={() => setActiveSection('perfil')}
                  >
                    <Settings className="w-4 h-4" />
                    Ver Mi Perfil
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contenido Principal */}
          <div className="lg:col-span-8 space-y-8">
            {/* Banner de Bienvenida */}
            <Card className="overflow-hidden bg-gradient-to-r from-[#003DA5] to-[#1e5da8] text-white shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-8">
                <div className="flex items-center justify-between gap-6">
                  <div className="flex-1">
                    <h2 className="text-3xl font-black mb-3">
                      ¡Bienvenido, {userName}! 👋
                    </h2>
                    <p className="text-blue-100 mb-5 text-lg">
                      Tu centro de servicios y recursos universitarios. Todo lo que necesitas en un solo lugar.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 font-semibold">
                        {studentData.materiasActuales} materias activas
                      </Badge>
                      <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 font-semibold">
                        Promedio: {studentData.promedio}
                      </Badge>
                      <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 font-semibold">
                        {studentData.creditosAprobados} créditos aprobados
                      </Badge>
                    </div>
                  </div>
                  <div className="hidden md:block flex-shrink-0">
                    <div className="w-28 h-28 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                      <GraduationCap className="w-16 h-16" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Navegación Principal - Diseño tipo Notion/Linear */}
            <div className="space-y-8">
              {/* Pills de Navegación */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <Button
                  variant={activeSection === 'inicio' ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-2 flex-shrink-0"
                  onClick={() => { setActiveSection('inicio'); setSelectedService(null); }}
                >
                  <Home className="w-4 h-4" />
                  <span>Inicio</span>
                </Button>
                <Button
                  variant={activeSection === 'certificados' ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-2 flex-shrink-0"
                  onClick={() => setActiveSection('certificados')}
                >
                  <Award className="w-4 h-4" />
                  <span>Certificados</span>
                </Button>
                <Button
                  variant={activeSection === 'comunidad' ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-2 flex-shrink-0"
                  onClick={() => setActiveSection('comunidad')}
                >
                  <Users className="w-4 h-4" />
                  <span>Comunidad</span>
                </Button>
                </div>
              </div>

              {/* Contenido Dinámico por Sección */}
              <AnimatePresence mode="wait">
                {activeSection === 'inicio' && (
                  <motion.div
                    key="inicio"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-8"
                  >
                    {/* Servicios Principales */}
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-black text-gray-900">Servicios Principales</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {mainServices.map((service) => {
                          const Icon = service.icon;
                          return (
                            <motion.div
                              key={service.id}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Card
                                className="cursor-pointer hover:shadow-xl transition-all duration-300 border hover:border-[#1e5da8] group h-full shadow-sm"
                                onClick={() => handleServiceClick(service.id)}
                              >
                                <CardContent className="p-6">
                                  <div className="flex items-start justify-between mb-4">
                                    <div
                                      className={`w-14 h-14 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-md`}
                                    >
                                      <Icon className="w-7 h-7 text-white" />
                                    </div>
                                    <Badge variant="secondary" className="text-xs font-semibold">
                                      {service.badge}
                                    </Badge>
                                  </div>
                                  <h4 className="text-lg font-black text-gray-900 mb-2 group-hover:text-[#1e5da8] transition-colors">
                                    {service.title}
                                  </h4>
                                  <p className="text-sm text-gray-600 leading-relaxed">{service.description}</p>
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>

                  </motion.div>
                )}

                {activeSection === 'certificados' && (
                  <motion.div
                    key="certificados"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-8"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                        <Award className="w-6 h-6 text-[#1e5da8]" />
                        Certificados y Documentos
                      </h3>
                    </div>

                    {generatedCertificate ? (
                      <div>
                        <VerificationCertificateDisplay 
                          certificate={generatedCertificate}
                          onClose={() => {
                            setGeneratedCertificate(null);
                            setActiveSection('inicio');
                          }}
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {mainServices.filter(s => s.id.includes('certificado')).map((service) => {
                          const Icon = service.icon;
                          return (
                            <motion.div
                              key={service.id}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Card
                                className="cursor-pointer hover:shadow-xl transition-all duration-300 border hover:border-[#1e5da8] group h-full shadow-sm"
                                onClick={() => handleServiceClick(service.id)}
                              >
                                <CardContent className="p-6">
                                  <div className="flex items-start justify-between mb-4">
                                    <div
                                      className={`w-14 h-14 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-md`}
                                    >
                                      <Icon className="w-7 h-7 text-white" />
                                    </div>
                                    <Badge variant="secondary" className="text-xs font-semibold">
                                      {service.badge}
                                    </Badge>
                                  </div>
                                  <h4 className="text-lg font-black text-gray-900 mb-2 group-hover:text-[#1e5da8] transition-colors">
                                    {service.title}
                                  </h4>
                                  <p className="text-sm text-gray-600 leading-relaxed">{service.description}</p>
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeSection === 'convocatorias' && (
                  <motion.div
                    key="convocatorias"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CommunitySection />
                  </motion.div>
                )}

                {activeSection === 'certificado-laboral' && (
                  <motion.div
                    key="certificado-laboral"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CommunitySection />
                  </motion.div>
                )}

                {activeSection === 'perfil' && (
                  <motion.div
                    key="perfil"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ProfilePage
                      userData={{
                        nombre: userName,
                        email: userEmail,
                        programa: studentData.programa,
                        foto: studentData.perfil.foto,
                      }}
                      isOwnProfile={true}
                      onBack={() => setActiveSection('inicio')}
                    />
                  </motion.div>
                )}

                {activeSection === 'comunidad' && (
                  <motion.div
                    key="comunidad"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CommunitySection />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Igual al LandingPage */}
      <footer className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-[#0f172a] to-gray-900 hidden md:block">
        {/* Pattern animado de fondo */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(30, 93, 168, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(37, 99, 235, 0.3) 0%, transparent 50%)',
          }} />
        </div>

        {/* Gradient overlay superior */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#1e5da8] to-transparent" />

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
            
            {/* Brand */}
            <div>
              <img src={esapLogoWhite} alt="ESAP" className="h-11 mb-5 hover:scale-105 transition-transform" />
              <p className="text-gray-400 mb-5 leading-relaxed">
                Transformando la educación pública en Colombia con tecnología de clase mundial.
              </p>

              {/* Social Media */}
              <div className="flex gap-2.5 mb-5">
                <a href="#" className="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-700 hover:from-[#1e5da8] hover:to-[#2563eb] rounded-lg flex items-center justify-center transition-all duration-300 shadow-lg group">
                  <svg className="w-4.5 h-4.5 text-gray-300 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-700 hover:from-[#1e5da8] hover:to-[#2563eb] rounded-lg flex items-center justify-center transition-all duration-300 shadow-lg group">
                  <svg className="w-4.5 h-4.5 text-gray-300 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-700 hover:from-[#1e5da8] hover:to-[#2563eb] rounded-lg flex items-center justify-center transition-all duration-300 shadow-lg group">
                  <svg className="w-4.5 h-4.5 text-gray-300 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-400 text-xs font-semibold">Sistema Activo</span>
                </div>
              </div>
            </div>

            {/* Enlaces Rápidos */}
            <div>
              <h3 className="text-white font-black mb-5 flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-[#1e5da8] to-[#2563eb] rounded-full" />
                Enlaces
              </h3>
              <ul className="space-y-2.5">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group text-sm">
                    <ChevronRight className="w-3.5 h-3.5 text-[#1e5da8] group-hover:translate-x-1 transition-transform" />
                    Sobre Nosotros
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group text-sm">
                    <ChevronRight className="w-3.5 h-3.5 text-[#1e5da8] group-hover:translate-x-1 transition-transform" />
                    Programas
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group text-sm">
                    <ChevronRight className="w-3.5 h-3.5 text-[#1e5da8] group-hover:translate-x-1 transition-transform" />
                    Investigación
                  </a>
                </li>
              </ul>
            </div>

            {/* Servicios */}
            <div>
              <h3 className="text-white font-black mb-5 flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-[#1e5da8] to-[#2563eb] rounded-full" />
                Servicios
              </h3>
              <ul className="space-y-2.5">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group text-sm">
                    <ChevronRight className="w-3.5 h-3.5 text-[#1e5da8] group-hover:translate-x-1 transition-transform" />
                    Biblioteca
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group text-sm">
                    <ChevronRight className="w-3.5 h-3.5 text-[#1e5da8] group-hover:translate-x-1 transition-transform" />
                    Campus Virtual
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group text-sm">
                    <ChevronRight className="w-3.5 h-3.5 text-[#1e5da8] group-hover:translate-x-1 transition-transform" />
                    Becas
                  </a>
                </li>
              </ul>
            </div>

            {/* Contacto */}
            <div>
              <h3 className="text-white font-black mb-5 flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-[#1e5da8] to-[#2563eb] rounded-full" />
                Contacto
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2.5">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#1e5da8] to-[#2563eb] rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-0.5">Dirección</p>
                    <p className="text-gray-300 text-xs leading-relaxed">Calle 44 No. 53-37<br />Bogotá</p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#1e5da8] to-[#2563eb] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-0.5">Teléfono</p>
                    <p className="text-gray-300 text-xs">+57 (1) 220 0700</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 pt-6">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
              <p className="text-gray-500 text-xs text-center lg:text-left">
                © 2025 ESAP. Todos los derechos reservados.
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-4">
                <a href="#" className="text-gray-400 hover:text-white text-xs transition-colors flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#1e5da8]" />
                  Privacidad
                </a>
                <a href="#" className="text-gray-400 hover:text-white text-xs transition-colors flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#1e5da8]" />
                  Términos
                </a>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-500/10 to-red-500/10 border border-pink-500/20 rounded-full">
                  <span className="text-xs text-gray-400">Hecho con</span>
                  <span className="text-red-500">❤️</span>
                  <span className="text-xs text-gray-400">en Colombia</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal de detalles de noticias/eventos */}
      <AnimatePresence>
        {selectedNewsEvent && (
          <NewsEventDetailView
            event={selectedNewsEvent}
            onClose={() => setSelectedNewsEvent(null)}
          />
        )}
      </AnimatePresence>

      {/* Bottom Navigation - Mobile Only (Crítico para UX) */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-bottom"
        style={{ 
          boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.08)',
          paddingBottom: 'max(8px, env(safe-area-inset-bottom))'
        }}
      >
        <div className="flex justify-around items-center py-2 max-w-[600px] mx-auto px-2">
          <button 
            onClick={() => { setActiveSection('inicio'); setSelectedService(null); }}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-semibold transition-all active:scale-95 ${
              activeSection === 'inicio' 
                ? 'text-[#1e5da8] bg-blue-50' 
                : 'text-gray-500'
            }`}
          >
            <Home className={`w-5 h-5 ${activeSection === 'inicio' ? 'scale-110' : ''}`} strokeWidth={2} />
            <span>Inicio</span>
          </button>
          
          <button 
            onClick={() => setActiveSection('certificados')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-semibold transition-all active:scale-95 ${
              activeSection === 'certificados' 
                ? 'text-[#1e5da8] bg-blue-50' 
                : 'text-gray-500'
            }`}
          >
            <Award className={`w-5 h-5 ${activeSection === 'certificados' ? 'scale-110' : ''}`} strokeWidth={2} />
            <span>Servicios</span>
          </button>

          <button 
            onClick={() => setActiveSection('perfil')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-semibold transition-all active:scale-95 ${
              activeSection === 'perfil' 
                ? 'text-[#1e5da8] bg-blue-50' 
                : 'text-gray-500'
            }`}
          >
            <Settings className={`w-5 h-5 ${activeSection === 'perfil' ? 'scale-110' : ''}`} strokeWidth={2} />
            <span>Perfil</span>
          </button>
        </div>
      </nav>


    </div>
  );
}