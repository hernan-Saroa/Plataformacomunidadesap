/**
 * MOD-06: Órganos de Control
 * DISEÑO 100% COHERENTE CON DEFENSA JUDICIAL
 * Gestión de requerimientos de entidades de control
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Plus, FileText, FolderOpen, Clock, ChevronDown,
  AlertCircle, CheckCircle, List, Columns3,
  Building2, Filter, Search, Download,
  MessageSquare, FileCheck, Send, Archive, Calendar,
  Eye, AlertTriangle, TrendingUp, Target, Mail
} from 'lucide-react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { toast } from 'sonner@2.0.3';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleFilters } from '../design-system/ModuleFilters';
import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';

// Types
interface RequerimientoOrganoControl {
  id: string;
  numeroOficio: string;
  organismo: 'CGR' | 'PROCURADURIA' | 'CONTRALORIA_TERRITORIAL' | 'FISCALIA' | 'DEFENSORIA' | 'PERSONERIA';
  asunto: string;
  responsable: string;
  fechaRadicacion: Date;
  fechaVencimiento: Date;
  diasRestantes: number;
  diasTotales: number;
  etapa: 'RECIBIDO' | 'ANALISIS' | 'RESPUESTA' | 'ENVIADO';
  ultimaActuacion?: string;
  documentos?: number;
}

// Datos mock
const requerimientosMock: RequerimientoOrganoControl[] = [
  {
    id: 'REQ-CGR-2024-001',
    numeroOficio: 'CGR-OF-2024-00125',
    organismo: 'CGR',
    asunto: 'Solicitud de información sobre contratación 2024',
    responsable: 'Dra. María Fernández',
    fechaRadicacion: new Date('2024-12-10'),
    fechaVencimiento: new Date('2024-12-30'),
    diasRestantes: 5,
    diasTotales: 20,
    etapa: 'RESPUESTA',
    ultimaActuacion: 'Proyecto de respuesta en revisión de Oficina Jurídica',
    documentos: 8
  },
  {
    id: 'REQ-PROC-2024-002',
    numeroOficio: 'PROC-2024-00589',
    organismo: 'PROCURADURIA',
    asunto: 'Verificación cumplimiento sentencias tutelas',
    responsable: 'Dr. Carlos Méndez',
    fechaRadicacion: new Date('2024-12-15'),
    fechaVencimiento: new Date('2025-01-05'),
    diasRestantes: 11,
    diasTotales: 21,
    etapa: 'ANALISIS',
    ultimaActuacion: 'Recopilación de información de territoriales',
    documentos: 5
  },
  {
    id: 'REQ-CTR-2024-003',
    numeroOficio: 'CTR-ANT-2024-045',
    organismo: 'CONTRALORIA_TERRITORIAL',
    asunto: 'Auditoría gestión recursos públicos Q4',
    responsable: 'Dra. Laura González',
    fechaRadicacion: new Date('2024-12-01'),
    fechaVencimiento: new Date('2024-12-25'),
    diasRestantes: 0,
    diasTotales: 24,
    etapa: 'ENVIADO',
    ultimaActuacion: 'Respuesta enviada el 24/12/2024 con 15 anexos',
    documentos: 15
  },
  {
    id: 'REQ-FISC-2024-004',
    numeroOficio: 'FISC-2024-00789',
    organismo: 'FISCALIA',
    asunto: 'Información sobre proceso disciplinario funcionario',
    responsable: 'Dr. Juan Pérez',
    fechaRadicacion: new Date('2024-12-20'),
    fechaVencimiento: new Date('2025-01-10'),
    diasRestantes: 16,
    diasTotales: 21,
    etapa: 'RECIBIDO',
    ultimaActuacion: 'Requerimiento recibido, pendiente asignación',
    documentos: 1
  },
  {
    id: 'REQ-DEF-2024-005',
    numeroOficio: 'DEF-2024-00234',
    organismo: 'DEFENSORIA',
    asunto: 'Derecho de petición acceso información pública',
    responsable: 'Dra. Ana López',
    fechaRadicacion: new Date('2024-12-18'),
    fechaVencimiento: new Date('2025-01-02'),
    diasRestantes: 8,
    diasTotales: 15,
    etapa: 'ANALISIS',
    ultimaActuacion: 'Validación de información con área de sistemas',
    documentos: 3
  },
  {
    id: 'REQ-PER-2024-006',
    numeroOficio: 'PER-BOG-2024-156',
    organismo: 'PERSONERIA',
    asunto: 'Verificación atención derechos de petición',
    responsable: 'Dra. Patricia Silva',
    fechaRadicacion: new Date('2024-12-05'),
    fechaVencimiento: new Date('2024-12-20'),
    diasRestantes: -5,
    diasTotales: 15,
    etapa: 'RESPUESTA',
    ultimaActuacion: 'Respuesta en proceso de firma del Director',
    documentos: 6
  },
];

export function OrganosControl() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [tipoVista, setTipoVista] = useState<'kanban' | 'lista'>('kanban');

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Agrupar por etapa
  const requerimientosPorEtapa = {
    RECIBIDO: requerimientosMock.filter(r => r.etapa === 'RECIBIDO'),
    ANALISIS: requerimientosMock.filter(r => r.etapa === 'ANALISIS'),
    RESPUESTA: requerimientosMock.filter(r => r.etapa === 'RESPUESTA'),
    ENVIADO: requerimientosMock.filter(r => r.etapa === 'ENVIADO'),
  };

  // Estadísticas
  const totalRequerimientos = requerimientosMock.length;
  const urgentes = requerimientosMock.filter(r => r.diasRestantes <= 5 && r.diasRestantes > 0).length;
  const vencidos = requerimientosMock.filter(r => r.diasRestantes < 0).length;
  const enTermino = requerimientosMock.filter(r => r.diasRestantes > 5).length;

  const etapas = [
    { 
      nombre: 'Recibido', 
      color: '#6B7280', 
      icono: <Mail className="w-4 h-4 text-gray-600" />, 
      diasEstimados: 2,
      requerimientos: requerimientosPorEtapa.RECIBIDO
    },
    { 
      nombre: 'Análisis', 
      color: '#F59E0B', 
      icono: <Search className="w-4 h-4 text-amber-600" />, 
      diasEstimados: 10,
      requerimientos: requerimientosPorEtapa.ANALISIS
    },
    { 
      nombre: 'Respuesta', 
      color: '#3B82F6', 
      icono: <FileCheck className="w-4 h-4 text-blue-600" />, 
      diasEstimados: 5,
      requerimientos: requerimientosPorEtapa.RESPUESTA
    },
    { 
      nombre: 'Enviado', 
      color: '#10B981', 
      icono: <CheckCircle className="w-4 h-4 text-green-600" />, 
      diasEstimados: 0,
      requerimientos: requerimientosPorEtapa.ENVIADO
    },
  ];

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header con ModuleHeader */}
      <ModuleHeader
        title={isMobile ? 'Kanban Operativo' : 'Tablero Kanban Operativo'}
        subtitle="Gestión de requerimientos de órganos de control"
        toggleView={{
          current: tipoVista,
          onChange: (view) => setTipoVista(view as 'kanban' | 'lista'),
          options: [
            { label: 'Kanban', icon: <Columns3 className="w-4 h-4" />, value: 'kanban' },
            { label: 'Lista', icon: <List className="w-4 h-4" />, value: 'lista' }
          ]
        }}
        buttons={[
          {
            label: 'Nuevo Requerimiento',
            labelMobile: 'Nuevo',
            icon: <Plus className="w-4 h-4" />,
            onClick: () => toast.info('Nuevo Requerimiento'),
            variant: 'primary'
          }
        ]}
        infoTooltip={
          <ModuleInfoTooltip
            title="Guía de Órganos de Control"
            variant="icon"
            sections={[
              {
                label: "🔗 Procedencia del Flujo",
                content: "Los requerimientos llegan desde: 1) Correos clasificados por IA desde Centro de Comunicaciones (notificaciones de Contraloría, Procuraduría, Fiscalía), 2) Oficios directos recibidos físicamente, 3) Plataformas digitales de órganos de control.",
                type: "info"
              },
              {
                label: "⚖️ Propósito del Módulo",
                content: "Gestión de requerimientos, solicitudes de información y procesos de responsabilidad fiscal/disciplinaria iniciados por órganos de control externo: Contraloría General, Procuraduría, Fiscalía, Personerías, Defensoría del Pueblo.",
                type: "default"
              },
              {
                label: "🔄 Flujo de Trabajo",
                content: "1️⃣ RECIBIDO: Requerimiento notificado del órgano de control → 2️⃣ EN ANÁLISIS: Área jurídica revisa solicitud y coordina con áreas técnicas → 3️⃣ INFORMACIÓN CONSOLIDADA: Respuestas recopiladas de áreas → 4️⃣ BORRADOR: Oficio de respuesta redactado → 5️⃣ RESPUESTA ENVIADA: Entregada al órgano de control.",
                type: "premium"
              },
              {
                label: "⏰ Términos Legales",
                content: "Plazos según norma: • Contraloría: 10 días hábiles (Ley 610/2000) | • Procuraduría: 15 días hábiles (Ley 734/2002) | • Fiscalía: Según oficio | • Personería: 10 días hábiles. ⚠️ NO son prorrogables.",
                type: "warning"
              },
              {
                label: "📊 Tipos de Requerimientos",
                content: "• Solicitud información: Datos, documentos, contratos | • Proceso de responsabilidad fiscal: Posible detrimento patrimonial | • Proceso disciplinario: Conductas irregulares funcionarios | • Querella/Denuncia: Posibles delitos | • Traslado para respuesta de PQRS ciudadanas.",
                type: "default"
              },
              {
                label: "👥 Coordinación Interáreas",
                content: "Requiere trabajo colaborativo con: Talento Humano (info funcionarios), Contratación (contratos), Financiera (presupuesto), Académica (programas), TI (datos digitales). El sistema notifica automáticamente a las áreas requeridas.",
                type: "default"
              },
              {
                label: "🔗 Integración con Otros Módulos",
                content: "Se conecta con: • Centro Comunicaciones (recepción de oficios) • Términos e Informes (control de plazos perentorios) • Defensa Judicial (si el requerimiento deriva en demanda) • Juzgamiento (si hay proceso disciplinario a funcionarios).",
                type: "success"
              },
              {
                label: "💡 Cómo Usar",
                content: "1️⃣ Click 'Nuevo Requerimiento' al recibir oficio → 2️⃣ Clasifica órgano y tipo de solicitud → 3️⃣ Sistema calcula término legal automáticamente → 4️⃣ Asigna responsable y áreas de apoyo → 5️⃣ Consolida información y redacta respuesta → 6️⃣ Envía y adjunta soporte de entrega.",
                type: "default"
              },
              {
                label: "⏭️ Siguiente Paso",
                content: "Según resultado del requerimiento: • Si órgano inicia proceso fiscal/disciplinario → Derivar a Defensa Judicial | • Si requiere acciones internas → Derivar a Juzgamiento | • Si necesita plan de mejora → Derivar a Planes de Mejoramiento.",
                type: "info"
              }
            ]}
          />
        }
      />

      {/* Métricas */}
      <ModuleMetrics
        metrics={[
          {
            label: 'Total',
            value: totalRequerimientos,
            icon: <Building2 className="w-5 h-5" />,
            color: 'blue'
          },
          {
            label: 'Urgentes',
            value: urgentes,
            icon: <AlertCircle className="w-5 h-5" />,
            color: 'red'
          },
          {
            label: 'Vencidos',
            value: vencidos,
            icon: <AlertTriangle className="w-5 h-5" />,
            color: 'orange'
          },
          {
            label: 'En término',
            value: enTermino,
            icon: <CheckCircle className="w-5 h-5" />,
            color: 'green'
          }
        ]}
      />

      {/* Filtros */}
      <ModuleFilters
        filters={[
          {
            label: 'Organismo',
            icon: <Building2 className="w-4 h-4" />,
            options: [
              { label: 'CGR', value: 'CGR' },
              { label: 'Procuraduría', value: 'PROCURADURIA' },
              { label: 'Contraloría Territorial', value: 'CONTRALORIA_TERRITORIAL' },
              { label: 'Fiscalía', value: 'FISCALIA' },
              { label: 'Defensoría', value: 'DEFENSORIA' },
              { label: 'Personería', value: 'PERSONERIA' }
            ]
          },
          {
            label: 'Etapa',
            icon: <Columns3 className="w-4 h-4" />,
            options: [
              { label: 'Recibido', value: 'RECIBIDO' },
              { label: 'Análisis', value: 'ANALISIS' },
              { label: 'Respuesta', value: 'RESPUESTA' },
              { label: 'Enviado', value: 'ENVIADO' }
            ]
          }
        ]}
      />

      {/* Tablero Kanban */}
      {tipoVista === 'kanban' && (
        <div className="relative">
          {(isMobile || isTablet) && (
            <div className="absolute top-2 right-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md border border-gray-200">
              <p className="text-xs font-bold text-gray-600 flex items-center gap-1">
                <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
                Desliza
              </p>
            </div>
          )}
          
          <div 
            className={`flex gap-3 md:gap-4 overflow-x-auto pb-4 ${isMobile ? '-mx-4 px-4' : ''} scroll-smooth`}
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#CBD5E0 #F7FAFC',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {etapas.map((etapa) => (
              <ColumnaKanban key={etapa.nombre} etapa={etapa} isMobile={isMobile} isTablet={isTablet} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Componente Columna Kanban
interface ColumnaKanbanProps {
  etapa: {
    nombre: string;
    color: string;
    icono: React.ReactNode;
    diasEstimados: number;
    requerimientos: RequerimientoOrganoControl[];
  };
  isMobile: boolean;
  isTablet: boolean;
}

function ColumnaKanban({ etapa, isMobile, isTablet }: ColumnaKanbanProps) {
  return (
    <motion.div className="flex-shrink-0" initial={{ width: 320 }} animate={{ width: 320 }}>
      <Card className="h-full border border-gray-200 bg-white">
        <div className={`${isMobile ? 'p-3' : 'p-4'} border-b bg-gray-50`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-1">
              <div className={`${isMobile ? 'p-1.5' : 'p-2'} rounded-lg bg-white border border-gray-200`}>
                {etapa.icono}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-black ${isMobile ? 'text-xs' : 'text-sm'} text-gray-800`}>
                  {etapa.nombre}
                </h3>
                {etapa.diasEstimados > 0 && (
                  <p className="text-[10px] text-gray-500 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {etapa.diasEstimados} días
                  </p>
                )}
              </div>
            </div>
            <Badge className={`font-semibold ${isMobile ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'} bg-white border border-gray-200 text-gray-700`}>
              {etapa.requerimientos.length}
            </Badge>
          </div>
        </div>

        <div 
          className={`${isMobile ? 'p-2' : 'p-3'} space-y-3 overflow-y-auto`} 
          style={{ maxHeight: isMobile ? 'calc(100vh - 400px)' : 'calc(100vh - 300px)' }}
        >
          {etapa.requerimientos.map((req) => (
            <TarjetaRequerimiento key={req.id} requerimiento={req} isMobile={isMobile} />
          ))}

          {etapa.requerimientos.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-xs font-semibold">Sin requerimientos en {etapa.nombre}</p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// Componente Tarjeta Requerimiento
interface TarjetaRequerimientoProps {
  requerimiento: RequerimientoOrganoControl;
  isMobile: boolean;
}

function TarjetaRequerimiento({ requerimiento, isMobile }: TarjetaRequerimientoProps) {
  const getSemaforoColor = (diasRestantes: number) => {
    if (diasRestantes < 0) return { color: '#DC2626', label: 'Vencido' };
    if (diasRestantes <= 5) return { color: '#F59E0B', label: 'Urgente' };
    return { color: '#10B981', label: 'En término' };
  };

  const getOrganoIcon = (organo: string) => {
    switch(organo) {
      case 'CGR': return '🏛️';
      case 'CONTRALORIA_TERRITORIAL': return '📊';
      case 'PROCURADURIA': return '⚖️';
      case 'FISCALIA': return '🔍';
      case 'DEFENSORIA': return '🛡️';
      case 'PERSONERIA': return '📜';
      default: return '📋';
    }
  };

  const semaforo = getSemaforoColor(requerimiento.diasRestantes);
  const porcentajeTiempo = Math.round(((requerimiento.diasTotales - requerimiento.diasRestantes) / requerimiento.diasTotales) * 100);

  return (
    <Card className="bg-white border border-gray-200 hover:shadow-md transition-all">
      <div className="h-1" style={{ background: '#003DA5' }} />

      <div className={`${isMobile ? 'p-2.5' : 'p-3'}`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={`${isMobile ? 'p-1' : 'p-1.5'} rounded-lg flex-shrink-0`} style={{ background: '#E0EDFF' }}>
              <Building2 className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} style={{ color: '#003DA5' }} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} truncate`} style={{ color: '#003DA5' }}>
                {requerimiento.id}
              </h4>
              <p className="text-xs text-gray-600 truncate">
                {getOrganoIcon(requerimiento.organismo)} {requerimiento.organismo}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-2 pb-2 border-b border-gray-200">
          <p className="text-xs text-gray-500 mb-0.5">📄 Asunto:</p>
          <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-2`}>
            {requerimiento.asunto}
          </p>
        </div>

        <div className="mb-2 pb-2 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Avatar className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} flex-shrink-0`}>
              <AvatarFallback className="text-xs" style={{ background: '#E0EDFF', color: '#003DA5' }}>
                {requerimiento.responsable.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">👨‍💼 Responsable:</p>
              <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-1`}>
                {requerimiento.responsable}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mb-2">
          <Badge className="text-xs flex items-center gap-1 font-semibold bg-gray-50 border border-gray-200" style={{ color: semaforo.color }}>
            <div className="w-2 h-2 rounded-full" style={{ background: semaforo.color }} />
            {Math.abs(requerimiento.diasRestantes)} días {requerimiento.diasRestantes < 0 ? 'vencido' : 'restantes'}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-1.5 mb-2">
          <div className={`text-center ${isMobile ? 'p-1' : 'p-1.5'} rounded-lg bg-gray-50 border border-gray-100`}>
            <p className="text-xs font-bold text-gray-700">{requerimiento.documentos || 0}</p>
            <p className="text-xs text-gray-500">Docs</p>
          </div>
          <div className={`text-center ${isMobile ? 'p-1' : 'p-1.5'} rounded-lg bg-gray-50 border border-gray-100`}>
            <p className="text-xs font-bold text-gray-700">{requerimiento.diasTotales - requerimiento.diasRestantes}</p>
            <p className="text-xs text-gray-500">Días</p>
          </div>
          <div className={`text-center ${isMobile ? 'p-1' : 'p-1.5'} rounded-lg bg-gray-50 border border-gray-100`}>
            <p className="text-xs font-bold text-gray-700">{porcentajeTiempo}%</p>
            <p className="text-xs text-gray-500">Tiempo</p>
          </div>
        </div>

        <div className="mb-2 p-2 rounded-lg" style={{ backgroundColor: '#F0F7FF', border: '1px solid #BFDBFE' }}>
          <p className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: '#003DA5' }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#003DA5' }}></span>
            ÚLTIMA ACTUACIÓN
          </p>
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-700 line-clamp-2 mb-1`}>
            {requerimiento.ultimaActuacion || 'Sin actuaciones registradas'}
          </p>
          <p className="text-xs text-gray-500">
            📅 {requerimiento.fechaRadicacion.toLocaleDateString('es-CO')}
          </p>
        </div>

        <div className="space-y-1 pt-2 border-t border-gray-200">
          <Button
            onClick={() => toast.info('Ver Requerimiento', { description: requerimiento.id })}
            size="sm"
            className={`w-full ${isMobile ? 'text-xs py-1.5' : 'text-xs'} font-bold`}
            style={{ background: '#003DA5', color: '#FFFFFF' }}
          >
            <Archive className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1`} />
            Ver Requerimiento
          </Button>

          <div className="grid grid-cols-2 gap-1">
            <Button
              onClick={() => toast.info('Documentos')}
              size="sm"
              variant="outline"
              className={`${isMobile ? 'text-[10px] py-1 px-1' : 'text-[11px] px-2'} justify-start`}
            >
              <FileCheck className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-0.5`} />
              Docs
            </Button>
            
            <Button
              onClick={() => toast.info('Respuesta')}
              size="sm"
              variant="outline"
              className={`${isMobile ? 'text-[10px] py-1 px-1' : 'text-[11px] px-2'} justify-start`}
            >
              <Send className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-0.5`} />
              Respuesta
            </Button>
          </div>

          <Button
            onClick={() => toast.info('Comentarios')}
            size="sm"
            className={`w-full ${isMobile ? 'text-xs py-1.5' : 'text-xs'} font-bold`}
            style={{ background: '#003DA5', color: '#FFFFFF' }}
          >
            <MessageSquare className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1`} />
            Comentarios
          </Button>
        </div>
      </div>
    </Card>
  );
}