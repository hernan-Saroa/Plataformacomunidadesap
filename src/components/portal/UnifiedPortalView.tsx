/**
 * Portal Transaccional Unificado - ESAP
 * 
 * Diseño único y consistente para todos los usuarios del Portal Transaccional.
 * Solo varía la información personal y los servicios/módulos disponibles según el rol activo.
 * 
 * PRINCIPIO: Un solo diseño, múltiples configuraciones de servicios.
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  GraduationCap,
  BookOpen,
  FileText,
  Calendar,
  Award,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  ChevronRight,
  Bell,
  Settings,
  Briefcase,
  Users,
  ClipboardList,
  Shield,
  Scale,
  Gavel,
  Building2,
  Activity,
  FileCheck,
  AlertTriangle,
  ArrowRight,
  Microscope,
  Target,
  Wallet,
  MessageSquare,
  Video,
  FileBadge,
  UserCheck,
  MapPin,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Separator } from '../ui/separator';

// Módulos especializados que se pueden abrir
import { MisExpedientesLegales } from './MisExpedientesLegales';
import { DashboardAreaAuditada } from './control-interno/DashboardAreaAuditada';
import { CommunitySection } from './CommunitySection';
import { PublicTitleVerification } from './PublicTitleVerification';

interface UnifiedPortalViewProps {
  userName: string;
  userEmail: string;
  activeRole: string;
  roleData?: any;
}

// Configuración de servicios por rol
interface ServicioConfig {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  badge?: number;
  action?: string; // Acción que ejecuta (abrir vista específica, etc.)
}

export function UnifiedPortalView({ 
  userName, 
  userEmail, 
  activeRole, 
  roleData 
}: UnifiedPortalViewProps) {
  const [vistaActual, setVistaActual] = useState<string>('dashboard');

  // ============================================
  // CONFIGURACIÓN DE SERVICIOS POR ROL
  // ============================================
  
  const getServiciosDisponibles = (): ServicioConfig[] => {
    switch (activeRole) {
      case 'Estudiante':
        return [
          {
            id: 'certificados',
            icon: <FileText className="w-6 h-6" />,
            title: 'Certificados',
            description: 'Solicitar documentos',
            color: 'from-green-500 to-green-600',
            badge: 0,
            action: 'solicitar-certificado-verificacion',
          },
          {
            id: 'comunidad',
            icon: <Users className="w-6 h-6" />,
            title: 'Directorio Comunidad',
            description: 'Buscar y conectar',
            color: 'from-blue-500 to-blue-600',
            badge: 0,
            action: 'community-section',
          },
        ];

      case 'Docente':
        return [
          {
            id: 'gestion-academica',
            icon: <GraduationCap className="w-6 h-6" />,
            title: 'Gestión Académica',
            description: 'Mis cursos y grupos',
            color: 'from-blue-500 to-blue-600',
            badge: 3,
          },
          {
            id: 'calificaciones',
            icon: <FileCheck className="w-6 h-6" />,
            title: 'Registro de Notas',
            description: 'Calificar estudiantes',
            color: 'from-purple-500 to-purple-600',
            badge: 5,
          },
          {
            id: 'pta',
            icon: <Calendar className="w-6 h-6" />,
            title: 'Plan de Trabajo',
            description: 'Mi PTA',
            color: 'from-green-500 to-green-600',
            badge: 0,
          },
          {
            id: 'asistencia',
            icon: <UserCheck className="w-6 h-6" />,
            title: 'Control de Asistencia',
            description: 'Registrar asistencia',
            color: 'from-orange-500 to-orange-600',
            badge: 0,
          },
          {
            id: 'investigacion',
            icon: <Microscope className="w-6 h-6" />,
            title: 'Investigación',
            description: 'Proyectos y publicaciones',
            color: 'from-indigo-500 to-indigo-600',
            badge: 0,
          },
          {
            id: 'recursos',
            icon: <BookOpen className="w-6 h-6" />,
            title: 'Recursos Académicos',
            description: 'Material de apoyo',
            color: 'from-teal-500 to-teal-600',
            badge: 0,
          },
        ];

      case 'Administrativo':
        return [
          {
            id: 'control-disciplinario',
            icon: <Gavel className="w-6 h-6" />,
            title: 'Control Disciplinario',
            description: 'Procesos disciplinarios',
            color: 'from-indigo-500 to-indigo-600',
            badge: 3,
            action: 'expedientes-legales',
          },
          {
            id: 'control-gestion',
            icon: <ClipboardList className="w-6 h-6" />,
            title: 'Control de Gestión',
            description: 'Auditorías y hallazgos',
            color: 'from-blue-500 to-blue-600',
            badge: 2,
            action: 'control-interno',
          },
          {
            id: 'gestion-legal',
            icon: <Scale className="w-6 h-6" />,
            title: 'Gestión Legal',
            description: 'Procesos judiciales',
            color: 'from-purple-600 to-purple-700',
            badge: 3,
            action: 'expedientes-legales',
          },
        ];

      case 'Graduado':
        return [
          {
            id: 'bolsa-empleo',
            icon: <Briefcase className="w-6 h-6" />,
            title: 'Bolsa de Empleo',
            description: 'Ofertas laborales',
            color: 'from-blue-500 to-blue-600',
            badge: 12,
          },
          {
            id: 'capacitaciones',
            icon: <GraduationCap className="w-6 h-6" />,
            title: 'Capacitaciones',
            description: 'Educación continua',
            color: 'from-purple-500 to-purple-600',
            badge: 3,
          },
          {
            id: 'networking',
            icon: <Users className="w-6 h-6" />,
            title: 'Red de Egresados',
            description: 'Conecta con la comunidad',
            color: 'from-green-500 to-green-600',
            badge: 0,
          },
          {
            id: 'certificados',
            icon: <FileBadge className="w-6 h-6" />,
            title: 'Certificados',
            description: 'Documentos de egresado',
            color: 'from-orange-500 to-orange-600',
            badge: 0,
          },
        ];

      case 'Aspirante':
        return [
          {
            id: 'programas',
            icon: <GraduationCap className="w-6 h-6" />,
            title: 'Programas Académicos',
            description: 'Conoce nuestra oferta',
            color: 'from-blue-500 to-blue-600',
            badge: 0,
          },
          {
            id: 'admisiones',
            icon: <FileText className="w-6 h-6" />,
            title: 'Proceso de Admisión',
            description: 'Inscríbete aquí',
            color: 'from-purple-500 to-purple-600',
            badge: 1,
          },
          {
            id: 'campus-virtual',
            icon: <Video className="w-6 h-6" />,
            title: 'Tour Virtual',
            description: 'Conoce nuestro campus',
            color: 'from-green-500 to-green-600',
            badge: 0,
          },
          {
            id: 'asesoria',
            icon: <MessageSquare className="w-6 h-6" />,
            title: 'Asesoría',
            description: 'Resuelve tus dudas',
            color: 'from-orange-500 to-orange-600',
            badge: 0,
          },
        ];

      default:
        return [];
    }
  };

  // ============================================
  // DATOS DEL PERFIL SEGÚN ROL
  // ============================================
  
  const getPerfilData = () => {
    // Determinar la foto según rol y datos
    let fotoUsuario = roleData?.perfil?.foto;
    
    const baseData = {
      nombre: userName,
      email: userEmail,
      foto: fotoUsuario,
      estado: 'Activo',
    };

    switch (activeRole) {
      case 'Estudiante':
        return {
          ...baseData,
          cargo: roleData?.programa || 'Estudiante',
          campo1Label: 'Programa',
          campo1Value: roleData?.programa || 'Administración Pública',
          campo2Label: 'Código',
          campo2Value: roleData?.codigo_estudiante || 'EST-00234',
          campo3Label: 'Semestre',
          campo3Value: roleData?.semestre || '6',
          campo4Label: 'Promedio',
          campo4Value: roleData?.promedio || '4.2',
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
          badgeText: 'Estudiante',
          metricas: [
            { label: 'Materias Activas', value: roleData?.materias_activas || 5, color: 'blue' },
            { label: 'Créditos Cursados', value: roleData?.creditos_cursados || 120, color: 'purple' },
            { label: 'Promedio', value: roleData?.promedio || '4.2', color: 'green' },
          ],
        };

      case 'Docente':
        return {
          ...baseData,
          cargo: roleData?.tipo_vinculacion || 'Docente',
          campo1Label: 'Tipo',
          campo1Value: roleData?.tipo_vinculacion || 'Tiempo Completo',
          campo2Label: 'Código',
          campo2Value: roleData?.codigo_docente || 'DOC-00234',
          campo3Label: 'Departamento',
          campo3Value: roleData?.departamento || 'Administración Pública',
          campo4Label: 'Dedicación',
          campo4Value: roleData?.horas_semanales ? `${roleData.horas_semanales}h/sem` : '40h/sem',
          badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
          badgeText: 'Docente',
          metricas: [
            { label: 'Cursos Activos', value: roleData?.cursos_activos || 3, color: 'purple' },
            { label: 'Estudiantes', value: roleData?.total_estudiantes || 85, color: 'blue' },
            { label: 'Horas PTA', value: roleData?.horas_pta || 120, color: 'green' },
          ],
        };

      case 'Administrativo':
        return {
          ...baseData,
          cargo: roleData?.cargo || 'Funcionario Administrativo',
          campo1Label: 'Dependencia',
          campo1Value: roleData?.dependencia || 'Oficina de Control Interno',
          campo2Label: 'Área',
          campo2Value: roleData?.area || 'Planeación',
          campo3Label: 'Correo',
          campo3Value: userEmail,
          campo4Label: 'Código',
          campo4Value: roleData?.codigo_empleado || 'FUNC-001',
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
          badgeText: 'Administrativo',
          metricas: [
            { label: 'Pendientes', value: roleData?.solicitudes_pendientes || 5, color: 'red' },
            { label: 'Completados', value: roleData?.reportes_generados || 12, color: 'blue' },
            { label: 'Eficiencia', value: '94%', color: 'green' },
          ],
        };

      case 'Graduado':
        return {
          ...baseData,
          cargo: roleData?.programa_graduado || 'Graduado',
          campo1Label: 'Programa',
          campo1Value: roleData?.programa_graduado || 'Administración Pública',
          campo2Label: 'Año Graduación',
          campo2Value: roleData?.ano_graduacion || '2020',
          campo3Label: 'Título',
          campo3Value: roleData?.titulo || 'Profesional',
          campo4Label: 'Código',
          campo4Value: roleData?.codigo_graduado || 'GRAD-00234',
          badgeColor: 'bg-green-50 text-green-700 border-green-200',
          badgeText: 'Graduado',
          metricas: [
            { label: 'Ofertas Laborales', value: 12, color: 'blue' },
            { label: 'Capacitaciones', value: 3, color: 'purple' },
            { label: 'Certificados', value: 8, color: 'green' },
          ],
        };

      case 'Aspirante':
        return {
          ...baseData,
          cargo: 'Aspirante',
          campo1Label: 'Programa Interés',
          campo1Value: roleData?.programa_interes || 'No especificado',
          campo2Label: 'Tipo Documento',
          campo2Value: roleData?.tipo_documento || 'CC',
          campo3Label: 'Documento',
          campo3Value: roleData?.numero_documento || '1234567890',
          campo4Label: 'Estado',
          campo4Value: roleData?.estado_admision || 'En Proceso',
          badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
          badgeText: 'Aspirante',
          metricas: [
            { label: 'Programas Visitados', value: 3, color: 'blue' },
            { label: 'Documentos', value: 2, color: 'purple' },
            { label: 'Progreso', value: '40%', color: 'orange' },
          ],
        };

      default:
        return baseData;
    }
  };

  const serviciosDisponibles = getServiciosDisponibles();
  const perfilData = getPerfilData();

  // ============================================
  // MANEJO DE VISTAS ESPECIALIZADAS
  // ============================================

  const handleServicioClick = (servicio: ServicioConfig) => {
    if (servicio.action) {
      setVistaActual(servicio.action);
    } else {
      // Por ahora solo muestra un mensaje
      console.log('Servicio seleccionado:', servicio.id);
    }
  };

  const volverADashboard = () => {
    setVistaActual('dashboard');
  };

  // Si está en una vista especializada, renderizarla
  if (vistaActual === 'expedientes-legales') {
    return <MisExpedientesLegales onVolver={volverADashboard} />;
  }

  if (vistaActual === 'control-interno') {
    return <DashboardAreaAuditada onVolver={volverADashboard} />;
  }

  if (vistaActual === 'community-section') {
    return <CommunitySection onVolver={volverADashboard} />;
  }

  if (vistaActual === 'solicitar-certificado-verificacion') {
    return (
      <PublicTitleVerification 
        onBack={volverADashboard}
      />
    );
  }

  // ============================================
  // RENDER PRINCIPAL - PORTAL UNIFICADO
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-20 md:pb-0">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-12 gap-8">
          {/* ============================================
              SIDEBAR IZQUIERDO - PERFIL
              (IDÉNTICO PARA TODOS, SOLO CAMBIAN DATOS)
              ============================================ */}
          <div className="lg:col-span-4 space-y-6">
            {/* Perfil Card */}
            <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
              <div className="relative h-24 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd]" />
              <CardContent className="pt-0 px-6 pb-6">
                <div className="flex flex-col items-center -mt-12">
                  <Avatar className="w-24 h-24 ring-4 ring-white shadow-xl">
                    <AvatarImage src={perfilData.foto} alt={perfilData.nombre} />
                    <AvatarFallback className="bg-gradient-to-br from-[#1e5da8] to-[#2a6dbd] text-white text-xl">
                      {perfilData.nombre.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="mt-4 text-lg font-black text-gray-900 text-center">
                    {perfilData.nombre}
                  </h3>
                  <p className="text-sm text-gray-600 text-center mb-3 px-2">
                    {perfilData.cargo}
                  </p>
                  <Badge variant="secondary" className={`text-xs font-semibold ${perfilData.badgeColor}`}>
                    {perfilData.badgeText}
                  </Badge>

                  <Separator className="w-full my-5" />

                  {/* Información Usuario */}
                  <div className="w-full space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm text-gray-600 flex-shrink-0">{perfilData.campo1Label}</span>
                      <span className="text-sm font-bold text-gray-900 text-right break-words">
                        {perfilData.campo1Value}
                      </span>
                    </div>
                    {perfilData.campo2Label && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{perfilData.campo2Label}</span>
                        <span className="text-sm font-black text-[#1e5da8]">
                          {perfilData.campo2Value}
                        </span>
                      </div>
                    )}
                    {perfilData.campo3Label && (
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm text-gray-600 flex-shrink-0">{perfilData.campo3Label}</span>
                        <span className="text-sm font-bold text-gray-900 text-right break-words">
                          {perfilData.campo3Value}
                        </span>
                      </div>
                    )}
                    {perfilData.campo4Label && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{perfilData.campo4Label}</span>
                        <span className="text-sm font-bold text-gray-900">
                          {perfilData.campo4Value}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Estado</span>
                      <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 text-xs font-semibold">
                        {perfilData.estado}
                      </Badge>
                    </div>
                  </div>

                  <Separator className="w-full my-5" />

                  <Button 
                    variant="outline" 
                    className="w-full gap-2 hover:bg-[#1e5da8] hover:text-white hover:border-[#1e5da8] transition-all duration-300 font-semibold"
                  >
                    <Settings className="w-4 h-4" />
                    Ver Mi Perfil
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Métricas Rápidas */}
            <Card className="shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#1e5da8]" />
                  Métricas Personales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {perfilData.metricas?.map((metrica: any, index: number) => {
                  const colorClasses = {
                    red: { bg: 'bg-red-50', text: 'text-red-600', icon: AlertCircle },
                    blue: { bg: 'bg-blue-50', text: 'text-blue-600', icon: FileCheck },
                    green: { bg: 'bg-green-50', text: 'text-green-600', icon: CheckCircle2 },
                    purple: { bg: 'bg-purple-50', text: 'text-purple-600', icon: Activity },
                    orange: { bg: 'bg-orange-50', text: 'text-orange-600', icon: TrendingUp },
                  };
                  
                  const colorClass = colorClasses[metrica.color as keyof typeof colorClasses] || colorClasses.blue;
                  const Icon = colorClass.icon;

                  return (
                    <div key={index} className={`flex items-center justify-between p-3 ${colorClass.bg} rounded-lg`}>
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${colorClass.text}`} />
                        <span className="text-sm font-semibold text-gray-900">{metrica.label}</span>
                      </div>
                      <span className={`text-xl font-bold ${colorClass.text}`}>
                        {metrica.value}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* ============================================
              CONTENIDO PRINCIPAL
              (SERVICIOS SEGÚN ROL ACTIVO)
              ============================================ */}
          <div className="lg:col-span-8 space-y-8">
            {/* Banner de Bienvenida */}
            <Card className="overflow-hidden bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-8">
                <div className="flex items-center justify-between gap-6">
                  <div className="flex-1">
                    <h2 className="text-3xl font-black mb-3">
                      ¡Bienvenido, {userName}! 👋
                    </h2>
                    <p className="text-blue-100 mb-5 text-lg">
                      {activeRole === 'Estudiante' && 'Portal del estudiante para gestión académica y servicios universitarios.'}
                      {activeRole === 'Docente' && 'Portal docente para gestión académica y seguimiento de actividades.'}
                      {activeRole === 'Administrativo' && 'Panel administrativo para gestión de procesos internos y control institucional.'}
                      {activeRole === 'Graduado' && 'Portal del egresado para oportunidades laborales y educación continua.'}
                      {activeRole === 'Aspirante' && 'Portal de admisiones para iniciar tu proceso de inscripción.'}
                    </p>
                    {perfilData.metricas && perfilData.metricas.length > 0 && (
                      <div className="flex flex-wrap gap-3">
                        {perfilData.metricas.slice(0, 2).map((metrica: any, index: number) => (
                          <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                            <p className="text-xs text-blue-100 mb-1">{metrica.label}</p>
                            <p className="text-xl font-bold">{metrica.value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Briefcase className="w-24 h-24 text-white/20" />
                </div>
              </CardContent>
            </Card>

            {/* Módulos/Servicios Disponibles */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {activeRole === 'Estudiante' && 'Servicios Estudiantiles'}
                  {activeRole === 'Docente' && 'Servicios Docentes'}
                  {activeRole === 'Administrativo' && 'Módulos Administrativos'}
                  {activeRole === 'Graduado' && 'Servicios para Egresados'}
                  {activeRole === 'Aspirante' && 'Servicios de Admisión'}
                </h3>
                <Badge variant="outline" className="text-xs">
                  {serviciosDisponibles.length} servicios disponibles
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {serviciosDisponibles.map((servicio) => (
                  <ServicioCard
                    key={servicio.id}
                    servicio={servicio}
                    onClick={() => handleServicioClick(servicio)}
                  />
                ))}
              </div>
            </div>

            {/* Notificaciones/Pendientes - Solo si hay badges */}
            {serviciosDisponibles.some(s => s.badge && s.badge > 0) && (
              <Card className="shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-orange-600" />
                      Notificaciones
                    </CardTitle>
                    <Badge variant="destructive" className="text-xs">
                      {serviciosDisponibles.filter(s => s.badge && s.badge > 0).reduce((sum, s) => sum + (s.badge || 0), 0)} pendientes
                    </Badge>
                  </div>
                  <CardDescription>Requieren tu atención</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {serviciosDisponibles
                    .filter(s => s.badge && s.badge > 0)
                    .map((servicio) => (
                      <div
                        key={servicio.id}
                        className="flex items-start gap-3 p-4 rounded-lg transition-colors border-2 bg-orange-50 border-orange-200 hover:bg-orange-100"
                      >
                        {servicio.icon}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-gray-900">{servicio.title}</span>
                            <Badge variant="destructive" className="text-xs">
                              {servicio.badge} {servicio.badge === 1 ? 'pendiente' : 'pendientes'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700">{servicio.description}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs h-8 px-3"
                          onClick={() => handleServicioClick(servicio)}
                        >
                          Ver
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}

            {/* Actividad Reciente */}
            <Card className="shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#1e5da8]" />
                  Actividad Reciente
                </CardTitle>
                <CardDescription>Últimas acciones en el portal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 mb-0.5">
                      Inicio de sesión exitoso
                    </p>
                    <p className="text-xs text-gray-600">
                      Acceso al Portal Transaccional como {activeRole}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Hace unos momentos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE DE TARJETA DE SERVICIO
// ============================================

interface ServicioCardProps {
  servicio: ServicioConfig;
  onClick: () => void;
}

function ServicioCard({ servicio, onClick }: ServicioCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl border-2 border-gray-200 hover:border-[#1e5da8] transition-all bg-white p-6 text-left shadow-sm hover:shadow-lg"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${servicio.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
      {servicio.badge !== undefined && servicio.badge > 0 && (
        <Badge className="absolute top-3 right-3 bg-red-500 text-white border-none font-bold">
          {servicio.badge}
        </Badge>
      )}
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${servicio.color} flex items-center justify-center text-white mb-4 shadow-md group-hover:scale-110 transition-transform`}>
        {servicio.icon}
      </div>
      <h3 className="font-bold text-gray-900 mb-1 text-base">{servicio.title}</h3>
      <p className="text-xs text-gray-600">{servicio.description}</p>
      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#1e5da8] group-hover:translate-x-1 transition-all absolute bottom-4 right-4" />
    </motion.button>
  );
}