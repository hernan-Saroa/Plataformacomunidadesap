/**
 * ════════════════════════════════════════════════════════════════════════════
 * PORTAL TRANSACCIONAL UNIFICADO V2.0 - ESAP
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Portal único y consistente para todos los usuarios con funcionalidades
 * específicas según su rol activo (Estudiante, Docente, Funcionario, Graduado, Aspirante).
 * 
 * ACTUALIZADO: Diciembre 24, 2025
 * COHERENTE CON: Módulos actualizados del Backoffice ESAP
 * 
 * ARQUITECTURA:
 * - Un solo diseño visual unificado
 * - Servicios y funcionalidades específicas por rol
 * - Integración con módulos actualizados:
 *   ✓ Control Interno OCIG (Auditorías)
 *   ✓ Control Disciplinario (Procesos)
 *   ✓ Gestión Legal SIGL v5.0
 *   ✓ Certificados Laborales
 *   ✓ Gestión Profesoral (PTA, Motor Reglas)
 *   ✓ Arquitectura Empresarial
 *   ✓ Comunidad Universitaria
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  GraduationCap, BookOpen, FileText, Calendar, Award, TrendingUp,
  Clock, CheckCircle2, AlertCircle, BarChart3, ChevronRight, Bell,
  Settings, Briefcase, Users, ClipboardList, Shield, Scale, Gavel,
  Building2, Activity, FileCheck, AlertTriangle, ArrowRight, Microscope,
  Target, Wallet, MessageSquare, Video, FileBadge, UserCheck, MapPin,
  Layers, FolderOpen, Zap, FileSpreadsheet, Download, Upload, Search,
  TrendingDown, DollarSign, UserPlus, Mail, Phone, Globe, Home, Package
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Separator } from '../ui/separator';

// Módulos especializados
import { MisExpedientesLegales } from './MisExpedientesLegales';
import { DashboardAreaAuditada } from './control-interno/DashboardAreaAuditada';
import { CommunitySection } from './CommunitySection';
import { PublicTitleVerification } from './PublicTitleVerification';
import { CertificadosLaboralesPortal } from './CertificadosLaboralesPortal';
import { SolicitarCertificadoLaboral } from './SolicitarCertificadoLaboral';
import { DocentesPTAPortal } from './gestion-profesoral/DocentesPTAPortal';
import { JobBoardPortal } from './JobBoardPortal';
import { NotificacionesArquitectura } from './NotificacionesArquitectura';
import { PerfilUsuarioEditable } from './PerfilUsuarioEditable';

interface UnifiedPortalViewV2Props {
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
  action?: string;
  highlighted?: boolean;
}

export function UnifiedPortalViewV2({ 
  userName, 
  userEmail, 
  activeRole, 
  roleData 
}: UnifiedPortalViewV2Props) {
  const [vistaActual, setVistaActual] = useState<string>('dashboard');

  // ════════════════════════════════════════════════════════════════════════════
  // CONFIGURACIÓN DE SERVICIOS POR ROL
  // ════════════════════════════════════════════════════════════════════════════
  
  const getServiciosDisponibles = (): ServicioConfig[] => {
    switch (activeRole) {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // ESTUDIANTES
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      case 'Estudiante':
        return [
          {
            id: 'mis-cursos',
            icon: <BookOpen className="w-6 h-6" />,
            title: 'Mis Cursos',
            description: 'Ver materias inscritas',
            color: 'from-blue-500 to-blue-600',
            badge: roleData?.materias_activas || 5,
            highlighted: true,
          },
          {
            id: 'calificaciones',
            icon: <BarChart3 className="w-6 h-6" />,
            title: 'Calificaciones',
            description: 'Historial académico',
            color: 'from-purple-500 to-purple-600',
          },
          {
            id: 'horarios',
            icon: <Calendar className="w-6 h-6" />,
            title: 'Horarios',
            description: 'Cronograma semanal',
            color: 'from-green-500 to-green-600',
          },
          {
            id: 'certificados',
            icon: <FileText className="w-6 h-6" />,
            title: 'Certificados Académicos',
            description: 'Solicitar documentos',
            color: 'from-orange-500 to-orange-600',
            action: 'solicitar-certificado-verificacion',
          },
          {
            id: 'matricula',
            icon: <ClipboardList className="w-6 h-6" />,
            title: 'Matrícula',
            description: 'Proceso de inscripción',
            color: 'from-red-500 to-red-600',
            badge: 1,
          },
          {
            id: 'biblioteca',
            icon: <BookOpen className="w-6 h-6" />,
            title: 'Biblioteca Virtual',
            description: 'Recursos digitales',
            color: 'from-indigo-500 to-indigo-600',
          },
          {
            id: 'comunidad',
            icon: <Users className="w-6 h-6" />,
            title: 'Directorio Comunidad',
            description: 'Buscar y conectar',
            color: 'from-teal-500 to-teal-600',
            action: 'community-section',
          },
          {
            id: 'bienestar',
            icon: <Activity className="w-6 h-6" />,
            title: 'Bienestar Universitario',
            description: 'Programas y servicios',
            color: 'from-pink-500 to-pink-600',
          },
        ];

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // DOCENTES
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      case 'Docente':
        return [
          {
            id: 'mis-cursos',
            icon: <GraduationCap className="w-6 h-6" />,
            title: 'Mis Cursos',
            description: 'Gestión de grupos',
            color: 'from-blue-500 to-blue-600',
            badge: roleData?.cursos_activos || 3,
            highlighted: true,
          },
          {
            id: 'calificaciones',
            icon: <FileCheck className="w-6 h-6" />,
            title: 'Registro de Notas',
            description: 'Calificar estudiantes',
            color: 'from-purple-500 to-purple-600',
            badge: roleData?.estudiantes_pendientes || 5,
          },
          {
            id: 'pta',
            icon: <Calendar className="w-6 h-6" />,
            title: 'Plan de Trabajo PTA',
            description: 'Gestión de actividades',
            color: 'from-green-500 to-green-600',
            badge: roleData?.actividades_pendientes || 2,
            action: 'docente-pta',
          },
          {
            id: 'asistencia',
            icon: <UserCheck className="w-6 h-6" />,
            title: 'Control de Asistencia',
            description: 'Registrar asistencia',
            color: 'from-orange-500 to-orange-600',
          },
          {
            id: 'investigacion',
            icon: <Microscope className="w-6 h-6" />,
            title: 'Investigación',
            description: 'Proyectos y publicaciones',
            color: 'from-indigo-500 to-indigo-600',
            badge: roleData?.proyectos_activos || 1,
          },
          {
            id: 'recursos',
            icon: <BookOpen className="w-6 h-6" />,
            title: 'Recursos Académicos',
            description: 'Material de apoyo',
            color: 'from-teal-500 to-teal-600',
          },
          {
            id: 'carpeta-digital',
            icon: <FolderOpen className="w-6 h-6" />,
            title: 'Mi Carpeta Digital',
            description: 'Documentos personales',
            color: 'from-cyan-500 to-cyan-600',
          },
          {
            id: 'capacitaciones',
            icon: <Target className="w-6 h-6" />,
            title: 'Capacitaciones',
            description: 'Formación docente',
            color: 'from-pink-500 to-pink-600',
          },
        ];

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // FUNCIONARIOS / ADMINISTRATIVOS
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      case 'Administrativo':
      case 'Funcionario':
        return [
          {
            id: 'gestion-legal',
            icon: <Scale className="w-6 h-6" />,
            title: 'Gestión Legal SIGL',
            description: 'Expedientes y procesos legales',
            color: 'from-blue-500 to-blue-600',
            badge: roleData?.expedientes_activos || 3,
            action: 'expedientes-legales',
            highlighted: true,
          },
          {
            id: 'certificados-laborales',
            icon: <FileBadge className="w-6 h-6" />,
            title: 'Certificados Laborales',
            description: 'Solicitar certificaciones',
            color: 'from-purple-500 to-purple-600',
            action: 'certificados-laborales',
          },
          {
            id: 'carpeta-digital',
            icon: <FolderOpen className="w-6 h-6" />,
            title: 'Mi Carpeta Digital',
            description: 'Documentos personales',
            color: 'from-green-500 to-green-600',
          },
          {
            id: 'control-interno',
            icon: <ClipboardList className="w-6 h-6" />,
            title: 'Control Interno',
            description: 'Auditorías y hallazgos',
            color: 'from-orange-500 to-orange-600',
            badge: roleData?.auditorias_pendientes || 2,
            action: 'control-interno',
          },
          {
            id: 'control-disciplinario',
            icon: <Gavel className="w-6 h-6" />,
            title: 'Control Disciplinario',
            description: 'Procesos disciplinarios',
            color: 'from-red-500 to-red-600',
            badge: roleData?.procesos_activos || 3,
            action: 'expedientes-legales',
          },
        ];

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // GRADUADOS
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      case 'Graduado':
        return [
          {
            id: 'bolsa-empleo',
            icon: <Briefcase className="w-6 h-6" />,
            title: 'Bolsa de Empleo',
            description: 'Ofertas laborales',
            color: 'from-blue-500 to-blue-600',
            badge: roleData?.ofertas_nuevas || 12,
            action: 'job-board',
            highlighted: true,
          },
          {
            id: 'certificados',
            icon: <FileBadge className="w-6 h-6" />,
            title: 'Certificados de Egresado',
            description: 'Documentos académicos',
            color: 'from-orange-500 to-orange-600',
            action: 'solicitar-certificado-verificacion',
          },
          {
            id: 'capacitaciones',
            icon: <GraduationCap className="w-6 h-6" />,
            title: 'Capacitaciones',
            description: 'Educación continua',
            color: 'from-purple-500 to-purple-600',
            badge: roleData?.cursos_disponibles || 3,
          },
          {
            id: 'networking',
            icon: <Users className="w-6 h-6" />,
            title: 'Red de Egresados',
            description: 'Conecta con la comunidad',
            color: 'from-green-500 to-green-600',
            action: 'community-section',
          },
          {
            id: 'eventos',
            icon: <Calendar className="w-6 h-6" />,
            title: 'Eventos Graduados',
            description: 'Actividades y reuniones',
            color: 'from-teal-500 to-teal-600',
            badge: 2,
          },
          {
            id: 'actualizacion-datos',
            icon: <UserPlus className="w-6 h-6" />,
            title: 'Actualizar Datos',
            description: 'Perfil profesional',
            color: 'from-indigo-500 to-indigo-600',
          },
        ];

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // ASPIRANTES
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      case 'Aspirante':
        return [
          {
            id: 'admisiones',
            icon: <FileText className="w-6 h-6" />,
            title: 'Proceso de Admisión',
            description: 'Inscripción y documentos',
            color: 'from-purple-500 to-purple-600',
            badge: roleData?.documentos_pendientes || 1,
            highlighted: true,
          },
          {
            id: 'programas',
            icon: <GraduationCap className="w-6 h-6" />,
            title: 'Programas Académicos',
            description: 'Conoce nuestra oferta',
            color: 'from-blue-500 to-blue-600',
          },
          {
            id: 'campus-virtual',
            icon: <Video className="w-6 h-6" />,
            title: 'Tour Virtual',
            description: 'Conoce nuestro campus',
            color: 'from-green-500 to-green-600',
          },
          {
            id: 'asesoria',
            icon: <MessageSquare className="w-6 h-6" />,
            title: 'Asesoría',
            description: 'Resuelve tus dudas',
            color: 'from-orange-500 to-orange-600',
          },
          {
            id: 'calendario',
            icon: <Calendar className="w-6 h-6" />,
            title: 'Calendario Académico',
            description: 'Fechas importantes',
            color: 'from-teal-500 to-teal-600',
          },
          {
            id: 'financiacion',
            icon: <Wallet className="w-6 h-6" />,
            title: 'Financiación',
            description: 'Opciones de pago',
            color: 'from-indigo-500 to-indigo-600',
          },
        ];

      default:
        return [];
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // DATOS DEL PERFIL SEGÚN ROL
  // ════════════════════════════════════════════════════════════════════════════
  
  const getPerfilData = () => {
    const fotoUsuario = roleData?.perfil?.foto;
    
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
          badgeText: 'Estudiante Activo',
          metricas: [
            { label: 'Materias Activas', value: roleData?.materias_activas || 5, color: 'blue' },
            { label: 'Créditos Cursados', value: roleData?.creditos_cursados || 120, color: 'purple' },
            { label: 'Promedio General', value: roleData?.promedio || '4.2', color: 'green' },
          ],
        };

      case 'Docente':
        return {
          ...baseData,
          cargo: roleData?.tipo_vinculacion || 'Docente de Planta',
          campo1Label: 'Vinculación',
          campo1Value: roleData?.tipo_vinculacion || 'Tiempo Completo',
          campo2Label: 'Código Docente',
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
      case 'Funcionario':
        return {
          ...baseData,
          cargo: roleData?.cargo || 'Funcionario Administrativo',
          campo1Label: 'Dependencia',
          campo1Value: roleData?.dependencia || 'Oficina de Planeación',
          campo2Label: 'Área',
          campo2Value: roleData?.area || 'Control Interno',
          campo3Label: 'Tipo Vinculación',
          campo3Value: roleData?.tipo_vinculacion || 'Planta',
          campo4Label: 'Código',
          campo4Value: roleData?.codigo_empleado || 'FUNC-001',
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
          badgeText: 'Funcionario',
          metricas: [
            { label: 'Solicitudes Pendientes', value: roleData?.solicitudes_pendientes || 5, color: 'orange' },
            { label: 'Procesos Activos', value: roleData?.procesos_activos || 3, color: 'blue' },
            { label: 'Tareas Completadas', value: roleData?.tareas_completadas || 24, color: 'green' },
          ],
        };

      case 'Graduado':
        return {
          ...baseData,
          cargo: roleData?.programa_graduado || 'Graduado ESAP',
          campo1Label: 'Programa',
          campo1Value: roleData?.programa_graduado || 'Administración Pública',
          campo2Label: 'Año Graduación',
          campo2Value: roleData?.ano_graduacion || '2020',
          campo3Label: 'Título Obtenido',
          campo3Value: roleData?.titulo || 'Profesional',
          campo4Label: 'Código',
          campo4Value: roleData?.codigo_graduado || 'GRAD-00234',
          badgeColor: 'bg-green-50 text-green-700 border-green-200',
          badgeText: 'Graduado',
          metricas: [
            { label: 'Ofertas Nuevas', value: roleData?.ofertas_nuevas || 12, color: 'blue' },
            { label: 'Capacitaciones', value: roleData?.cursos_disponibles || 3, color: 'purple' },
            { label: 'Postulaciones', value: roleData?.postulaciones || 5, color: 'green' },
          ],
        };

      case 'Aspirante':
        return {
          ...baseData,
          cargo: 'Aspirante',
          campo1Label: 'Programa Interés',
          campo1Value: roleData?.programa_interes || 'Administración Pública',
          campo2Label: 'Tipo Documento',
          campo2Value: roleData?.tipo_documento || 'CC',
          campo3Label: 'Número Documento',
          campo3Value: roleData?.numero_documento || '1234567890',
          campo4Label: 'Estado Admisión',
          campo4Value: roleData?.estado_admision || 'Documentos Pendientes',
          badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
          badgeText: 'Aspirante',
          metricas: [
            { label: 'Documentos Entregados', value: roleData?.documentos_entregados || 2, color: 'green' },
            { label: 'Documentos Pendientes', value: roleData?.documentos_pendientes || 1, color: 'orange' },
            { label: 'Progreso Admisión', value: roleData?.progreso || '65%', color: 'blue' },
          ],
        };

      default:
        return baseData;
    }
  };

  const serviciosDisponibles = getServiciosDisponibles();
  const perfilData = getPerfilData();

  // ════════════════════════════════════════════════════════════════════════════
  // MANEJO DE VISTAS ESPECIALIZADAS
  // ════════════════════════════════════════════════════════════════════════════

  const handleServicioClick = (servicio: ServicioConfig) => {
    if (servicio.action) {
      setVistaActual(servicio.action);
    } else {
      console.log('Servicio seleccionado:', servicio.id);
    }
  };

  const volverADashboard = () => {
    setVistaActual('dashboard');
  };

  // Renderizar vistas especializadas
  if (vistaActual === 'expedientes-legales') {
    return <MisExpedientesLegales onVolver={volverADashboard} />;
  }

  if (vistaActual === 'perfil-usuario') {
    return (
      <PerfilUsuarioEditable 
        onVolver={volverADashboard}
        userName={userName}
        userEmail={userEmail}
        activeRole={activeRole}
      />
    );
  }

  if (vistaActual === 'control-interno') {
    return <DashboardAreaAuditada onVolver={volverADashboard} />;
  }

  if (vistaActual === 'community-section') {
    return <CommunitySection onVolver={volverADashboard} />;
  }

  if (vistaActual === 'solicitar-certificado-verificacion') {
    return <PublicTitleVerification onBack={volverADashboard} />;
  }

  if (vistaActual === 'certificados-laborales') {
    return (
      <CertificadosLaboralesPortal 
        onBack={volverADashboard} 
        userEmail={userEmail}
        userName={userName}
      />
    );
  }

  if (vistaActual === 'docente-pta') {
    return <DocentesPTAPortal onVolver={volverADashboard} />;
  }

  if (vistaActual === 'job-board') {
    return <JobBoardPortal onVolver={volverADashboard} />;
  }

  if (vistaActual === 'notificaciones-arquitectura') {
    return <NotificacionesArquitectura onVolver={volverADashboard} />;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER PRINCIPAL - PORTAL UNIFICADO
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-20 md:pb-8">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="grid lg:grid-cols-12 gap-6 md:gap-8">
          {/* ══════════════════════════════════════════════════════════════════
              SIDEBAR IZQUIERDO - PERFIL USUARIO
              ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-4 space-y-6">
            {/* Perfil Card */}
            <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="relative h-24 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd]" />
              <CardContent className="pt-0 px-6 pb-6">
                <div className="flex flex-col items-center -mt-12">
                  <Avatar className="w-24 h-24 ring-4 ring-white shadow-xl">
                    <AvatarImage src={perfilData.foto} alt={perfilData.nombre} />
                    <AvatarFallback className="bg-gradient-to-br from-[#1e5da8] to-[#2a6dbd] text-white text-xl font-bold">
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
                  <div className="w-full space-y-3">
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
                    onClick={() => setVistaActual('perfil-usuario')}
                  >
                    <Settings className="w-4 h-4" />
                    Configurar Mi Perfil
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Accesos Rápidos */}
            <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#1e5da8]" />
                  Accesos Rápidos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="ghost" className="w-full justify-start gap-2 hover:bg-blue-50">
                  <Mail className="w-4 h-4 text-gray-600" />
                  <span className="text-sm">Correo Institucional</span>
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2 hover:bg-blue-50">
                  <Phone className="w-4 h-4 text-gray-600" />
                  <span className="text-sm">Directorio ESAP</span>
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2 hover:bg-blue-50">
                  <Globe className="w-4 h-4 text-gray-600" />
                  <span className="text-sm">Portal Web</span>
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2 hover:bg-blue-50">
                  <Bell className="w-4 h-4 text-gray-600" />
                  <span className="text-sm flex items-center justify-between w-full">
                    Notificaciones
                    <Badge className="bg-red-500 text-white text-xs">3</Badge>
                  </span>
                </Button>
              </CardContent>
            </Card>

            {/* Métricas Personales */}
            <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#1e5da8]" />
                  Métricas Personales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {perfilData.metricas?.map((metrica: any, index: number) => {
                  const colorClasses = {
                    red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
                    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
                    green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
                    purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
                    orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
                  };
                  
                  const colorClass = colorClasses[metrica.color as keyof typeof colorClasses] || colorClasses.blue;

                  return (
                    <div 
                      key={index} 
                      className={`flex items-center justify-between p-3 ${colorClass.bg} border ${colorClass.border} rounded-lg`}
                    >
                      <span className="text-sm text-gray-700">{metrica.label}</span>
                      <span className={`text-lg font-black ${colorClass.text}`}>
                        {metrica.value}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              CONTENIDO PRINCIPAL - SERVICIOS
              ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-8 space-y-6">
            {/* Header de Bienvenida */}
            <Card className="shadow-lg bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black mb-2">
                      ¡Bienvenido/a de nuevo, {userName.split(' ')[0]}!
                    </h2>
                    <p className="text-blue-100">
                      {activeRole === 'Estudiante' && 'Accede a tus cursos, calificaciones y servicios académicos'}
                      {activeRole === 'Docente' && 'Gestiona tus cursos, calificaciones y plan de trabajo académico'}
                      {(activeRole === 'Administrativo' || activeRole === 'Funcionario') && 'Gestiona tus procesos, solicitudes y servicios administrativos'}
                      {activeRole === 'Graduado' && 'Explora ofertas laborales, capacitaciones y networking'}
                      {activeRole === 'Aspirante' && 'Completa tu proceso de admisión y conoce la ESAP'}
                    </p>
                  </div>
                  <div className="hidden md:block">
                    <Home className="w-16 h-16 text-white/20" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Grid de Servicios */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-gray-900">Mis Servicios</h3>
                <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                  {serviciosDisponibles.length} servicios
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                {serviciosDisponibles.map((servicio) => (
                  <motion.div
                    key={servicio.id}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card 
                      className={`cursor-pointer overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border-2 ${
                        servicio.highlighted ? 'border-[#1e5da8] ring-2 ring-blue-100' : 'border-transparent hover:border-gray-200'
                      }`}
                      onClick={() => handleServicioClick(servicio)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${servicio.color} flex items-center justify-center text-white shadow-lg`}>
                            {servicio.icon}
                          </div>
                          {servicio.badge !== undefined && servicio.badge > 0 && (
                            <Badge className="bg-red-500 text-white font-bold">
                              {servicio.badge}
                            </Badge>
                          )}
                        </div>
                        <h4 className="text-base font-black text-gray-900 mb-1">
                          {servicio.title}
                        </h4>
                        <p className="text-sm text-gray-600 mb-3">
                          {servicio.description}
                        </p>
                        <div className="flex items-center text-[#1e5da8] text-sm font-semibold">
                          <span>Acceder</span>
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}