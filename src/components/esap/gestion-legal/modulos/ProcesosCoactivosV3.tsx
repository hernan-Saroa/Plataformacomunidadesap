/**
 * ModuloProcesosCoactivosV3 - MOD-07: Procesos Coactivos
 * DISEÑO 100% IDÉNTICO A DEFENSA JUDICIAL
 * ✅ Responsive mobile-first FUNCIONAL
 * ✅ Sin drag & drop (simplificado)
 * ✅ Tarjetas 320px con bloque "Última Actuación"
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Plus, FileText, FolderOpen, AlertTriangle, Clock, Calendar,
  User, Eye, ChevronDown, DollarSign, TrendingUp,
  AlertCircle, CheckCircle, List, Columns3,
  Scale, Filter, Search, Download, Upload, RefreshCw, Paperclip,
  MessageSquare, FileCheck, Send, Archive, Mail, Edit
} from 'lucide-react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { toast } from 'sonner@2.0.3';
import { procesosCoactivos } from '../data/datosProcesosCoactivos';
import type { ProcesoCoactivo } from '../core/types';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleFilters } from '../design-system/ModuleFilters';
import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';

// Transformar datos para el componente (agregar campos calculados)
const procesosCoactivosMock: Array<ProcesoCoactivo & { diasHastaPrescripcion: number }> = procesosCoactivos.map(p => ({
  ...p,
  diasHastaPrescripcion: p.diasPrescripcion
}));

export function ModuloProcesosCoactivosV3() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [tipoVista, setTipoVista] = useState<'kanban' | 'lista'>('kanban');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState<string>('TODAS');
  const [filtroMonto, setFiltroMonto] = useState<string>('TODOS');

  // Detectar tamaño de pantalla
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

  // Agrupar procesos por etapa
  const procesosPorEtapa = {
    IDENTIFICADO: procesosCoactivosMock.filter(p => p.etapa === 'IDENTIFICADO'),
    PERSUASIVO: procesosCoactivosMock.filter(p => p.etapa === 'PERSUASIVO'),
    PREJURIDICO: procesosCoactivosMock.filter(p => p.etapa === 'PREJURIDICO'),
    MANDAMIENTO: procesosCoactivosMock.filter(p => p.etapa === 'MANDAMIENTO'),
  };

  // Calcular estadísticas
  const totalProcesos = procesosCoactivosMock.length;
  const procesosCriticos = procesosCoactivosMock.filter(p => p.diasHastaPrescripcion <= 30).length;
  const procesosEnTermino = procesosCoactivosMock.filter(p => p.diasHastaPrescripcion > 90).length;

  const etapas = [
    { 
      nombre: 'Identificado', 
      color: '#6B7280', 
      icono: <FileCheck className="w-4 h-4 text-gray-600" />, 
      diasEstimados: 15,
      procesos: procesosPorEtapa.IDENTIFICADO
    },
    { 
      nombre: 'Persuasivo', 
      color: '#F59E0B', 
      icono: <Mail className="w-4 h-4 text-amber-600" />, 
      diasEstimados: 30,
      procesos: procesosPorEtapa.PERSUASIVO
    },
    { 
      nombre: 'Prejurídico', 
      color: '#3B82F6', 
      icono: <FileText className="w-4 h-4 text-blue-600" />, 
      diasEstimados: 45,
      procesos: procesosPorEtapa.PREJURIDICO
    },
    { 
      nombre: 'Mandamiento', 
      color: '#003DA5', 
      icono: <Scale className="w-4 h-4" style={{ color: '#003DA5' }} />, 
      diasEstimados: 60,
      procesos: procesosPorEtapa.MANDAMIENTO
    },
  ];

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header con ModuleHeader */}
      <ModuleHeader
        title={isMobile ? 'Kanban Operativo' : 'Tablero Kanban Operativo'}
        subtitle="Gestión de cobro coactivo de obligaciones"
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
            label: 'Nuevo Proceso',
            labelMobile: 'Nuevo',
            icon: <Plus className="w-4 h-4" />,
            onClick: () => toast.info('Nuevo Proceso Coactivo'),
            variant: 'primary'
          }
        ]}
        infoTooltip={
          <ModuleInfoTooltip
            title="Guía de Procesos Coactivos"
            variant="icon"
            sections={[
              {
                label: "💰 Propósito del Módulo",
                content: "Gestión del cobro judicial de obligaciones a favor de ESAP: matrículas impagas, multas administrativas, sanciones pecuniarias, reintegros de becas, devoluciones de pagos indebidos y otros créditos a favor de la institución.",
                type: "default"
              },
              {
                label: "⚖️ Jurisdicción Coactiva",
                content: "ESAP como entidad pública tiene jurisdicción coactiva para cobrar obligaciones dinerarias a favor del Estado. El proceso coactivo es AUTÓNOMO (ESAP es juez y parte) según Ley 1066/2006 y Código de Procedimiento Administrativo.",
                type: "info"
              },
              {
                label: "🔄 Flujo de Trabajo (4 Etapas)",
                content: "1️⃣ IDENTIFICADO: Deuda detectada y certificada (0-15 días) → 2️⃣ PERSUASIVO: Carta de cobro amigable pre-jurídica (16-45 días) → 3️⃣ PREJURÍDICO: Resolución de cobro y notificación al deudor (46-90 días) → 4️⃣ MANDAMIENTO DE PAGO: Inicio formal del proceso coactivo judicial (91+ días).",
                type: "premium"
              },
              {
                label: "⏰ Prescripción de la Obligación",
                content: "Las obligaciones tributarias prescriben en 5 AÑOS desde su exigibilidad (Ley 1437/2011). El semáforo muestra: 🟢 Verde (>2 años): Tiempo suficiente | 🟡 Amarillo (1-2 años): Atención requerida | 🔴 Rojo (<1 año): URGENTE - Riesgo de pérdida de cobro.",
                type: "warning"
              },
              {
                label: "📊 Montos y Capitalización",
                content: "El sistema calcula automáticamente: Capital (deuda original) + Intereses moratorios (DTF + 2 puntos) + Costas procesales. Se actualiza diariamente para garantizar exactitud en el cobro.",
                type: "default"
              },
              {
                label: "🔗 Integración con Otros Módulos",
                content: "Este módulo se conecta con: • Órganos de Control (requerimientos de Contraloría sobre cartera) • Términos e Informes (plazos de prescripción) • Centro Comunicaciones (notificaciones de pagos).",
                type: "success"
              },
              {
                label: "💡 Cómo Usar",
                content: "1️⃣ Click 'Nuevo Proceso' cuando se detecta obligación impaga → 2️⃣ Arrastra tarjetas entre etapas según avance → 3️⃣ Monitorea semáforo de prescripción CONSTANTEMENTE → 4️⃣ Usa botón 'Pagos' para registrar abonos → 5️⃣ Click 'Expediente' para documentos completos.",
                type: "default"
              },
              {
                label: "⏭️ Siguiente Paso",
                content: "Si el deudor no paga después del Mandamiento de Pago, el proceso escala a REMATE de bienes (embargo y subasta). Si hay pagos parciales, se reclasifica a 'Acuerdo de Pago' en módulo de Acuerdos.",
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
            label: 'Total Procesos',
            value: totalProcesos,
            icon: <FileText className="w-4 h-4 text-orange-600" />,
            color: 'orange'
          },
          {
            label: 'Criticos',
            value: procesosCriticos,
            icon: <AlertCircle className="w-4 h-4 text-red-600" />,
            color: 'red'
          },
          {
            label: 'En Término',
            value: procesosEnTermino,
            icon: <CheckCircle className="w-4 h-4 text-green-600" />,
            color: 'green'
          }
        ]}
      />

      {/* Filtros */}
      <ModuleFilters
        filters={[
          {
            label: 'Etapa',
            value: filtroEtapa,
            onChange: (value) => setFiltroEtapa(value as string),
            options: [
              { label: 'Todas', value: 'TODAS' },
              { label: 'Identificado', value: 'IDENTIFICADO' },
              { label: 'Persuasivo', value: 'PERSUASIVO' },
              { label: 'Prejurídico', value: 'PREJURIDICO' },
              { label: 'Mandamiento', value: 'MANDAMIENTO' }
            ]
          },
          {
            label: 'Monto',
            value: filtroMonto,
            onChange: (value) => setFiltroMonto(value as string),
            options: [
              { label: 'Todos', value: 'TODOS' },
              { label: 'Menos de $100M', value: 'MENOS_100M' },
              { label: 'Entre $100M y $500M', value: 'ENTRE_100M_500M' },
              { label: 'Más de $500M', value: 'MAS_500M' }
            ]
          }
        ]}
      />

      {/* Tablero Kanban */}
      {tipoVista === 'kanban' && (
        <div className="relative">
          {/* Indicador de scroll en mobile/tablet */}
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
              <ColumnaKanban
                key={etapa.nombre}
                etapa={etapa}
                isMobile={isMobile}
                isTablet={isTablet}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== COMPONENTE COLUMNA KANBAN ====================
interface ColumnaKanbanProps {
  etapa: {
    nombre: string;
    color: string;
    icono: React.ReactNode;
    diasEstimados: number;
    procesos: ProcesoCoactivo[];
  };
  isMobile: boolean;
  isTablet: boolean;
}

function ColumnaKanban({ etapa, isMobile, isTablet }: ColumnaKanbanProps) {
  return (
    <motion.div
      className="flex-shrink-0"
      initial={{ width: 320 }}
      animate={{ width: 320 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <Card className="h-full border border-gray-200 bg-white">
        {/* Header de Columna */}
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
                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {etapa.diasEstimados} días
                </p>
              </div>
            </div>
            <Badge className={`font-semibold ${isMobile ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'} bg-white border border-gray-200 text-gray-700`}>
              {etapa.procesos.length}
            </Badge>
          </div>
        </div>

        {/* Lista de Procesos */}
        <div 
          className={`${isMobile ? 'p-2' : 'p-3'} space-y-3 overflow-y-auto`} 
          style={{ maxHeight: isMobile ? 'calc(100vh - 380px)' : 'calc(100vh - 280px)' }}
        >
          {etapa.procesos.map((proceso) => (
            <TarjetaProceso
              key={proceso.id}
              proceso={proceso}
              isMobile={isMobile}
            />
          ))}

          {etapa.procesos.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-xs font-semibold">
                Sin procesos en {etapa.nombre}
              </p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ==================== COMPONENTE TARJETA PROCESO ====================
interface TarjetaProcesoProps {
  proceso: ProcesoCoactivo & { diasHastaPrescripcion: number };
  isMobile: boolean;
}

function TarjetaProceso({ proceso, isMobile }: TarjetaProcesoProps) {
  // Determinar semáforo
  const getSemaforoColor = (diasPrescripcion: number) => {
    if (diasPrescripcion <= 180) return { color: '#DC2626', label: 'Urgente' };
    if (diasPrescripcion <= 365) return { color: '#F59E0B', label: 'Atención' };
    return { color: '#10B981', label: 'Normal' };
  };

  const semaforo = getSemaforoColor(proceso.diasHastaPrescripcion);
  // Generar última actuación desde timeline o usar fecha de actualización
  const ultimaActuacion = proceso.timeline && proceso.timeline.length > 0 
    ? proceso.timeline[proceso.timeline.length - 1].descripcion
    : `Proceso en etapa de ${proceso.etapa}`;

  return (
    <Card className="bg-white border border-gray-200 hover:shadow-md transition-all">
      {/* Barra superior azul ESAP */}
      <div className="h-1" style={{ background: '#003DA5' }} />

      <div className={`${isMobile ? 'p-2.5' : 'p-3'}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div 
              className={`${isMobile ? 'p-1' : 'p-1.5'} rounded-lg flex-shrink-0`}
              style={{ background: '#E0EDFF' }}
            >
              <DollarSign className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} style={{ color: '#003DA5' }} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} truncate`} style={{ color: '#003DA5' }}>
                {proceso.id}
              </h4>
              <p className="text-xs text-gray-600 truncate">
                {proceso.montoTotal.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
              </p>
            </div>
          </div>
        </div>

        {/* Deudor */}
        <div className="mb-2 pb-2 border-b border-gray-200">
          <p className="text-xs text-gray-500 mb-0.5">👤 Deudor:</p>
          <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-1`}>
            {proceso.deudor}
          </p>
        </div>

        {/* Profesional Asignado */}
        <div className="mb-2 pb-2 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Avatar className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} flex-shrink-0`}>
              <AvatarFallback 
                className="text-xs"
                style={{ background: '#E0EDFF', color: '#003DA5' }}
              >
                {proceso.responsable.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">👨‍💼 Responsable:</p>
              <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-1`}>
                {proceso.responsable}
              </p>
            </div>
          </div>
        </div>

        {/* Semáforo */}
        <div className="flex items-center gap-1.5 mb-2">
          <Badge 
            className="text-xs flex items-center gap-1 font-semibold bg-gray-50 border border-gray-200"
            style={{ color: semaforo.color }}
          >
            <div 
              className="w-2 h-2 rounded-full"
              style={{ background: semaforo.color }}
            />
            {proceso.diasHastaPrescripcion} días prescripción
          </Badge>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <div className={`text-center ${isMobile ? 'p-1' : 'p-1.5'} rounded-lg bg-gray-50 border border-gray-100`}>
            <p className="text-xs font-bold text-gray-700">{proceso.montoCapital.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p>
            <p className="text-xs text-gray-500">Capital</p>
          </div>
          <div className={`text-center ${isMobile ? 'p-1' : 'p-1.5'} rounded-lg bg-gray-50 border border-gray-100`}>
            <p className="text-xs font-bold text-gray-700">{proceso.montoIntereses.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p>
            <p className="text-xs text-gray-500">Intereses</p>
          </div>
        </div>

        {/* Última Actuación - BLOQUE AZUL */}
        <div className="mb-2 p-2 rounded-lg" style={{ backgroundColor: '#F0F7FF', border: '1px solid #BFDBFE' }}>
          <p className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: '#003DA5' }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#003DA5' }}></span>
            ÚLTIMA ACTUACIÓN
          </p>
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-700 line-clamp-2 mb-1`}>
            {ultimaActuacion}
          </p>
          <p className="text-xs text-gray-500">
            📅 {proceso.fechaActualizacion.toLocaleDateString('es-CO')}
          </p>
        </div>

        {/* Acciones */}
        <div className="space-y-1 pt-2 border-t border-gray-200">
          <Button
            onClick={() => toast.info('Ver Expediente', { description: proceso.id })}
            size="sm"
            className={`w-full ${isMobile ? 'text-xs py-1.5' : 'text-xs'} font-bold`}
            style={{ background: '#003DA5', color: '#FFFFFF' }}
          >
            <Archive className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1 flex-shrink-0`} />
            Expediente
          </Button>

          <div className="grid grid-cols-2 gap-1">
            <Button
              onClick={() => toast.info('Documentos')}
              size="sm"
              variant="outline"
              className={`${isMobile ? 'text-[10px] py-1 px-1' : 'text-[11px] px-2'} justify-start`}
            >
              <Paperclip className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-0.5`} />
              Docs
            </Button>
            
            <Button
              onClick={() => toast.info('Pagos')}
              size="sm"
              variant="outline"
              className={`${isMobile ? 'text-[10px] py-1 px-1' : 'text-[11px] px-2'} justify-start`}
            >
              <DollarSign className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-0.5`} />
              Pagos
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