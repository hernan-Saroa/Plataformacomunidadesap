/**
 * DASHBOARD KANBAN OPERATIVO V4 - CONTROL INTERNO DISCIPLINARIO
 * Versión RESPONSIVE con soporte completo para Mobile, Tablet y Desktop
 * INTEGRACIÓN COMPLETA: Editor de Documentos + Gestión Documental
 */

import { useState, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, FileText, FolderOpen, AlertTriangle, Clock, Calendar,
  User, MoreVertical, Eye, Edit, Send, X, Check, Ban, Forward,
  Upload, Download, CheckCircle, Scale, Archive, Activity,
  MessageSquare, Trash2, ArrowLeft, Filter, Search, Bell,
  ChevronDown, Users, FileCheck, XCircle, PlusCircle, Settings,
  Maximize2, Minimize2, TrendingUp, AlertCircle, Phone, Mail,
  MapPin, Info, ExternalLink, RefreshCw, Paperclip, UserCheck,
  List, Columns3, Menu, Edit2, FileSignature, History,
  ChevronsDown, ChevronsUp, ChevronUp, Zap, Link2, UserCog, MessageCircle
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { toast } from 'sonner@2.0.3';
import { CreateNoticiaModal } from '../CreateNoticiaModal';
import { EditorDocumentos } from './EditorDocumentos';
import { ModalSubirDocumento } from './ModalSubirDocumento';
import {
  ModalGestionEvidencias,
  ModalHistorialAuditoria
} from './ModalesGestionDocumental';
import { WizardCrearAutoWorldClass } from './WizardCrearAutoWorldClass';
import { WizardOficiosWorldClass } from './WizardOficiosWorldClass';
import { WizardActasWorldClass } from './WizardActasWorldClass';
import { ModalArchivarNoticia } from './ModalArchivarNoticia';
import { SistemaComentarios } from './SistemaComentarios';
import { ModalAsociarNoticiaProceso } from './ModalAsociarNoticiaProceso'; // ✅ NUEVO
import { ModalAsignarProfesional } from './ModalAsignarProfesional'; // ✅ NUEVO: Modal de asignación de profesional
import { ModalSolicitarReasignacion } from './ModalSolicitarReasignacion'; // ✅ NUEVO: Modal de solicitud de reasignación
import { ModalAprobarReasignacion } from './ModalAprobarReasignacion'; // ✅ NUEVO: Modal de aprobación de reasignación (Jefe OCID)
import { ModalRevisionAuto } from './ModalRevisionAuto'; // ✅ REFACTORIZADO: Modal unificado de revisión y aprobación
import { ModalAsociarProcesoAProceso } from './ModalAsociarProcesoAProceso'; // ✅ NUEVO: Modal para asociar proceso disciplinario a otro proceso
import { convertirProcesoABorrador } from './utils-aprobacion'; // ✅ NUEVO: Utilidades de conversión
import { obtenerAccionesPorEtapa, obtenerDescripcionEtapa, type EtapaProceso } from './accionesPorEtapa'; // ✅ NUEVO: Acciones por etapa
import { useResponsive } from './hooks/useResponsive'; // ✅ Hook responsive simplificado
// import { ModalGenerarAuto } from './ModalGenerarAuto'; // ✅ ELIMINADO
// import type { PlantillaAuto } from './SeccionPlantillasAutos'; // ✅ ELIMINADO

// ==================== TIPOS ====================
interface Persona {
  nombre: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA' | 'NIT';
  numeroIdentificacion: string;
}

interface Noticia {
  id: string;
  numero: string;
  fechaRecepcion: string;
  origen: string;
  denunciante: Persona | string; // ✅ Puede ser objeto Persona o string
  denunciado: Persona | string; // ✅ Puede ser objeto Persona o string
  hechos: string;
  estado: 'pendiente' | 'en-valoracion' | 'asignada' | 'archivada';
  prioridad: 'alta' | 'media' | 'baja';
  diasPendientes: number;
  tipo: 'noticia';
  // ✅ NUEVO: Información de asociación a proceso
  procesoAsociado?: {
    id: string;
    numeroProceso: string;
    fechaAsociacion: string;
    justificacion: string;
  };
}

interface Proceso {
  id: string;
  numeroProceso: string;
  noticiaOrigen: string;
  denunciante: Persona | string; // ✅ Puede ser objeto Persona o string
  denunciado: Persona | string; // ✅ Puede ser objeto Persona o string
  cedula: string; // Mantener por compatibilidad
  etapaActual: 'Recepción' | 'Valoración' | 'Indagación' | 'Investigación' | 'Juzgamiento' | 'Fallo';
  estadoActual: string;
  profesionalAsignado: Persona | string; // ✅ Puede ser objeto Persona o string
  profesionalAsignadoId?: string; // ID del profesional para filtrado
  semaforo: 'verde' | 'amarillo' | 'rojo';
  diasRestantes: number;
  porcentajeTiempo: number;
  borradores: any[];
  documentos: any[];
  pendienteAprobacion: boolean;
  ultimaActuacion: string;
  fechaCreacion: string;
  tipo: 'proceso';
  hechos?: string;
  cargo?: string;
  dependencia?: string;
  historialAuditoria?: any[];
}

type Item = Noticia | Proceso;
type ModalType = 
  | 'crear-noticia'
  | 'convertir-proceso'
  | 'devolver-noticia'
  | 'devolver-competencia'
  | 'ver-detalles'
  | 'aprobar-borrador'
  | 'archivar-noticia'
  | 'editor-documentos'
  | 'subir-documentos'
  | 'gestion-autos'
  | 'gestion-evidencias'
  | 'gestion-oficios'
  | 'gestion-actas'
  | 'historial-auditoria'
  | 'expediente-completo'
  | 'comentarios-proceso'
  | 'asociar-noticia-proceso'  // ✅ NUEVO: Modal para asociar noticia a proceso
  | 'asociar-proceso-proceso'  // ✅ NUEVO: Modal para asociar proceso disciplinario a otro proceso (Valoración → Fallo)
  | 'asignar-profesional'  // ✅ NUEVO: Modal para asignar profesional en transición Recepción → Valoración
  | 'solicitar-reasignacion'  // ✅ NUEVO: Modal para solicitar reasignación (estados posteriores a Recepción)
  | 'aprobar-reasignacion'  // ✅ NUEVO: Modal para aprobar/rechazar reasignación (Jefe OCID)
  | null;

// ==================== MOCK DATA ====================
// ✅ DATOS MOCK COMPLETOS - Importados desde archivo separado
import { PROCESOS_KANBAN_COMPLETO } from './procesosKanbanMock';

const NOTICIAS_MOCK: Noticia[] = [
  // ✅ NOTICIA SIN ASOCIAR
  {
    id: 'n1',
    numero: 'NOT-2026-0260',
    fechaRecepcion: '2026-01-15',
    origen: 'Denuncia Ciudadana',
    denunciante: {
      nombre: 'Pedro Sánchez Ruiz',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '1012345678'
    },
    denunciado: {
      nombre: 'Juan Pérez Gómez',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '80123456'
    },
    hechos: 'Presunto acoso laboral en Territorial Bogotá',
    estado: 'pendiente',
    prioridad: 'alta',
    diasPendientes: 3,
    tipo: 'noticia'
  },
  
  // ✅ NOTICIA ASOCIADA 1 (MOCKUP)
  {
    id: 'n2',
    numero: 'NOT-2026-0145',
    fechaRecepcion: '2026-02-01',
    origen: 'Denuncia Anónima Web',
    denunciante: {
      nombre: 'Ciudadano Anónimo',
      tipoIdentificacion: 'Anónimo',
      numeroIdentificacion: 'N/A'
    },
    denunciado: {
      nombre: 'María Fernanda Rodríguez Castro',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '52987654'
    },
    hechos: 'Presunto uso indebido de recursos institucionales. La servidora habría utilizado vehículo oficial para desplazamientos personales.',
    estado: 'pendiente',
    prioridad: 'media',
    diasPendientes: 8,
    tipo: 'noticia',
    procesoAsociado: {
      id: 'p1',
      numeroProceso: 'PROC-2026-0025',
      fechaAsociacion: '2026-02-05T10:30:00',
      justificacion: 'Hechos similares al proceso en curso. Misma servidora denunciada.'
    }
  },
  
  // ✅ NOTICIA ASOCIADA 2 (MOCKUP)
  {
    id: 'n3',
    numero: 'NOT-2026-0167',
    fechaRecepcion: '2026-02-03',
    origen: 'Traslado Contraloría',
    denunciante: {
      nombre: 'Contraloría General República',
      tipoIdentificacion: 'NIT',
      numeroIdentificacion: '899999061'
    },
    denunciado: {
      nombre: 'María Fernanda Rodríguez Castro',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '52987654'
    },
    hechos: 'Hallazgo fiscal sobre irregularidades en caja menor. Monto $3.500.000 sin soportes.',
    estado: 'en-valoracion',
    prioridad: 'alta',
    diasPendientes: 6,
    tipo: 'noticia',
    procesoAsociado: {
      id: 'p1',
      numeroProceso: 'PROC-2026-0025',
      fechaAsociacion: '2026-02-07T14:15:00',
      justificacion: 'Hallazgo de Contraloría relacionado. Misma servidora investigada.'
    }
  }
];

// ✅ Usar procesos completos importados (12 procesos en 6 estados)
const PROCESOS_MOCK: Proceso[] = PROCESOS_KANBAN_COMPLETO;

const PROFESIONALES = [
  'Juan Carlos Pérez',
  'Ana María López',
  'Carlos Rodríguez',
  'María García'
];

// ==================== COMPONENTE TARJETA DE NOTICIA ====================
interface TarjetaNoticiaProps {
  noticia: Noticia;
  onConvertir: (noticia: Noticia) => void;
  onDevolver: (noticia: Noticia) => void;
  onDevolverCompetencia: (noticia: Noticia) => void;
  onArchivar: (noticia: Noticia) => void;
  onVerDetalles?: (noticia: Noticia) => void;
  onAsociarNoticiaProceso?: (noticia: Noticia) => void; // ✅ NUEVO: Asociar noticia a proceso
  onVerProcesoAsociado?: (procesoId: string) => void; // ✅ NUEVO: Ver proceso asociado
  onEditarNoticia?: (noticia: Noticia) => void; // ✅ NUEVO: Editar noticia
  vistaCompacta: boolean;
  isMobile?: boolean;
  colapsada?: boolean; // NUEVO: Indica si la tarjeta está colapsada
  onToggleColapso?: () => void; // NUEVO: Toggle para colapsar/expandir
  etapa?: string; // ✅ NUEVO: Etapa actual para condicionales
}

function TarjetaNoticia({ noticia, onConvertir, onDevolver, onDevolverCompetencia, onArchivar, onVerDetalles, onAsociarNoticiaProceso, onVerProcesoAsociado, onEditarNoticia, vistaCompacta, isMobile, colapsada, onToggleColapso, etapa }: TarjetaNoticiaProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'ITEM',
    item: { ...noticia, tipoItem: 'noticia' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  return (
    <motion.div
      ref={drag}
      id={`noticia-${noticia.id}`} // ✅ NUEVO: ID para scroll automático desde proceso
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: isDragging ? 0.95 : 1 }}
      className="cursor-move touch-none w-full"
    >
      <Card 
        className={`bg-white border transition-all flex flex-col w-full ${
          noticia.procesoAsociado 
            ? 'border-purple-300 hover:shadow-lg hover:shadow-purple-100' 
            : 'border-gray-200 hover:shadow-md'
        }`}
        style={{ 
          height: vistaCompacta ? (isMobile ? '340px' : '380px') : (isMobile ? '440px' : '500px'),
          minHeight: vistaCompacta ? (isMobile ? '340px' : '380px') : (isMobile ? '440px' : '500px'),
          maxHeight: vistaCompacta ? (isMobile ? '340px' : '380px') : (isMobile ? '440px' : '500px')
        }}
      >
        {/* Barra superior - Morado si está asociada, Azul ESAP si no */}
        <div 
          className="h-1 flex-shrink-0"
          style={{ background: noticia.procesoAsociado ? '#9333EA' : '#003DA5' }}
        />

        <div className={`${isMobile ? 'p-2.5' : 'p-3'} flex-1 flex flex-col overflow-y-auto min-h-0`}>
          {/* Header */}
          <div 
            className={`flex items-start justify-between mb-2 ${onVerDetalles ? 'cursor-pointer hover:bg-gray-50 -mx-3 -mt-3 px-3 pt-3 pb-2 rounded-t-lg transition-colors' : ''}`}
            onClick={onVerDetalles ? () => onVerDetalles(noticia) : undefined}
          >
            <div className="flex items-center gap-2 flex-1">
              <div 
                className={`${isMobile ? 'p-1' : 'p-1.5'} rounded-lg flex-shrink-0 bg-orange-50`}
              >
                <FileText className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-orange-600`} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} truncate text-gray-900`}>
                  {noticia.numero}
                </h4>
                <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-500 truncate`}>{noticia.origen}</p>
              </div>
            </div>

            <div className="flex flex-col gap-1 ml-2">
              <Badge
                className={`${isMobile ? 'text-xs px-2' : 'text-xs px-2'} font-semibold flex-shrink-0 bg-gray-50 text-gray-700 border border-gray-200`}
              >
                NOTICIA
              </Badge>
              {/* ✅ NUEVO: Badge si está asociada a proceso */}
              {noticia.procesoAsociado && (
                <Badge
                  className={`${isMobile ? 'text-[10px] px-1.5' : 'text-xs px-2'} font-bold flex-shrink-0 bg-purple-100 text-purple-700 border border-purple-300 flex items-center gap-1`}
                >
                  <Link2 className="w-2.5 h-2.5" />
                  ASOCIADA
                </Badge>
              )}
            </div>
          </div>

          {/* Denunciante */}
          <div className="mb-2 pb-2 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">👤 Denunciante:</p>
            <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-1`}>
              {noticia.denunciante ? (typeof noticia.denunciante === 'string' ? noticia.denunciante : noticia.denunciante.nombre) : 'Sin información'}
            </p>
            {noticia.denunciante && typeof noticia.denunciante !== 'string' && (
              <p className="text-xs text-gray-600">
                {noticia.denunciante.tipoIdentificacion} {noticia.denunciante.numeroIdentificacion}
              </p>
            )}
          </div>

          {/* Denunciado */}
          <div className="mb-2 pb-2 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">⚠️ Denunciado:</p>
            <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-1`}>
              {noticia.denunciado ? (typeof noticia.denunciado === 'string' ? noticia.denunciado : noticia.denunciado.nombre) : 'Sin información'}
            </p>
            {noticia.denunciado && typeof noticia.denunciado !== 'string' && (
              <p className="text-xs text-gray-600">
                {noticia.denunciado.tipoIdentificacion} {noticia.denunciado.numeroIdentificacion}
              </p>
            )}
          </div>

          {/* ✅ NUEVO: Proceso Asociado */}
          {noticia.procesoAsociado && (
            <div className="mb-2 pb-2 border-b border-purple-200 bg-purple-50 -mx-3 px-3 py-2">
              <div className="flex items-center gap-1.5 mb-1">
                <Link2 className="w-3 h-3 text-purple-600" />
                <p className="text-xs font-bold text-purple-700">Asociada a Proceso:</p>
              </div>
              <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-purple-900`}>
                {noticia.procesoAsociado.numeroProceso}
              </p>
              <p className="text-xs text-purple-600">
                Asociado el {new Date(noticia.procesoAsociado.fechaAsociacion).toLocaleDateString('es-CO')}
              </p>
              {onVerProcesoAsociado && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onVerProcesoAsociado(noticia.procesoAsociado!.id);
                  }}
                  className="mt-1 text-xs text-purple-700 hover:text-purple-900 font-semibold underline"
                >
                  Ver proceso →
                </button>
              )}
            </div>
          )}

          {/* Hechos - Ocultar en mobile compacto */}
          {!vistaCompacta && !isMobile && (
            <div className="mb-3">
              <p className="text-xs text-gray-700 line-clamp-2">
                {noticia.hechos}
              </p>
            </div>
          )}

          {/* Días Pendientes */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50">
              <Clock className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-gray-600`} />
              <span className={`${isMobile ? 'text-xs' : 'text-xs'} font-semibold text-gray-700`}>
                {noticia.diasPendientes} días
              </span>
            </div>
            {!isMobile && (
              <span className="text-xs text-gray-500">
                {new Date(noticia.fechaRecepcion).toLocaleDateString('es-CO')}
              </span>
            )}
          </div>

          {/* Acciones - Diseño Corporativo Azul/Blanco ESAP en 2 Columnas */}
          <div className="space-y-1.5 mt-auto pt-2">
            {/* Fila 1: Convertir + Editar */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onConvertir(noticia)}
                className={`flex items-center justify-center gap-1 ${isMobile ? 'px-2 py-1.5' : 'px-2.5 py-2'} rounded-lg font-semibold transition-all shadow-sm hover:shadow-md text-white text-xs`}
                style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}
                title="Convertir a proceso"
              >
                <PlusCircle className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} flex-shrink-0`} />
                <span className="truncate">Convertir</span>
              </button>
              
              {/* ✅ Botón Editar - Solo en Recepción y Valoración */}
              {onEditarNoticia && (etapa === 'Recepción' || etapa === 'Valoración') && (
                <button
                  onClick={() => onEditarNoticia(noticia)}
                  className={`flex items-center justify-center gap-1 ${isMobile ? 'px-2 py-1.5' : 'px-2.5 py-2'} rounded-lg font-semibold transition-all shadow-sm hover:shadow-md text-white text-xs`}
                  style={{ background: 'linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)' }}
                  title="Editar noticia para completar información"
                >
                  <Edit className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} flex-shrink-0`} />
                  <span className="truncate">Editar</span>
                </button>
              )}
            </div>
            
            {/* Fila 2: Asociar/Ver Proceso + Ver Detalles */}
            <div className="grid grid-cols-2 gap-1.5">
              {/* Botón Asociar a Proceso o Ver Proceso Asociado */}
              {noticia.procesoAsociado ? (
                onVerProcesoAsociado && (
                  <button
                    onClick={() => onVerProcesoAsociado(noticia.procesoAsociado!.id)}
                    className={`flex items-center justify-center gap-1 ${isMobile ? 'px-2 py-1.5' : 'px-2.5 py-2'} rounded-lg font-semibold transition-all shadow-sm hover:shadow-md text-white text-xs`}
                    style={{ background: 'linear-gradient(135deg, #0D47A1 0%, #1565C0 100%)' }}
                    title={`Ver proceso ${noticia.procesoAsociado.numeroProceso}`}
                  >
                    <ExternalLink className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} flex-shrink-0`} />
                    <span className="truncate">Ver Proceso</span>
                  </button>
                )
              ) : (
                onAsociarNoticiaProceso && (
                  <button
                    onClick={() => onAsociarNoticiaProceso(noticia)}
                    className={`flex items-center justify-center gap-1 ${isMobile ? 'px-2 py-1.5' : 'px-2.5 py-2'} rounded-lg font-semibold transition-all shadow-sm hover:shadow-md text-white text-xs`}
                    style={{ background: 'linear-gradient(135deg, #1565C0 0%, #1E88E5 100%)' }}
                    title="Asociar noticia a proceso existente"
                  >
                    <Link2 className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} flex-shrink-0`} />
                    <span className="truncate">Asociar</span>
                  </button>
                )
              )}
              
              {/* Botón Ver Detalles */}
              {onVerDetalles && (
                <button
                  onClick={() => onVerDetalles(noticia)}
                  className={`flex items-center justify-center gap-1 ${isMobile ? 'px-2 py-1.5' : 'px-2.5 py-2'} rounded-lg font-semibold transition-all shadow-sm hover:shadow-md border-2 text-xs`}
                  style={{ 
                    background: '#FFFFFF',
                    borderColor: '#2962FF',
                    color: '#003DA5'
                  }}
                  title="Ver detalles completos"
                >
                  <FileText className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} flex-shrink-0`} />
                  <span className="truncate">Detalles</span>
                </button>
              )}
            </div>
            
            {/* Fila 3: Acciones Secundarias */}
            <div className="grid grid-cols-3 gap-1 pt-0.5">
              <button
                onClick={() => onDevolver(noticia)}
                className={`flex items-center justify-center gap-0.5 ${isMobile ? 'px-1 py-1' : 'px-1.5 py-1.5'} rounded-md border-2 transition-all text-xs font-medium bg-white`}
                style={{ borderColor: '#90CAF9', color: '#1565C0' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#2962FF';
                  e.currentTarget.style.background = '#E3F2FD';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#90CAF9';
                  e.currentTarget.style.background = '#FFFFFF';
                }}
                title="Devolver noticia"
              >
                <ArrowLeft className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} flex-shrink-0`} />
                {!isMobile && <span className="truncate text-[10px]">Devolver</span>}
              </button>
              <button
                onClick={() => onDevolverCompetencia(noticia)}
                className={`flex items-center justify-center gap-0.5 ${isMobile ? 'px-1 py-1' : 'px-1.5 py-1.5'} rounded-md border-2 transition-all text-xs font-medium bg-white`}
                style={{ borderColor: '#64B5F6', color: '#0D47A1' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#1976D2';
                  e.currentTarget.style.background = '#BBDEFB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#64B5F6';
                  e.currentTarget.style.background = '#FFFFFF';
                }}
                title="Remitir por competencia"
              >
                <Send className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} flex-shrink-0`} />
                {!isMobile && <span className="truncate text-[10px]">Compet.</span>}
              </button>
              <button
                onClick={() => onArchivar(noticia)}
                className={`flex items-center justify-center gap-0.5 ${isMobile ? 'px-1 py-1' : 'px-1.5 py-1.5'} rounded-md border-2 transition-all text-xs font-medium bg-white`}
                style={{ borderColor: '#BDBDBD', color: '#616161' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#757575';
                  e.currentTarget.style.background = '#F5F5F5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#BDBDBD';
                  e.currentTarget.style.background = '#FFFFFF';
                }}
                title="Archivar noticia"
              >
                <Archive className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} flex-shrink-0`} />
                {!isMobile && <span className="truncate text-[10px]">Archivar</span>}
              </button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ==================== COMPONENTE TARJETA DE PROCESO ====================
interface TarjetaProcesoProps {
  proceso: Proceso;
  onVerDetalles: (proceso: Proceso) => void;
  onAprobarBorrador: (proceso: Proceso) => void;
  onVerExpediente: (proceso: Proceso) => void;
  onGestionAutos?: (proceso: Proceso) => void;
  onGestionEvidencias?: (proceso: Proceso) => void;
  onGestionOficios?: (proceso: Proceso) => void;
  onGestionActas?: (proceso: Proceso) => void;
  onComentarios?: (proceso: Proceso) => void;
  onSolicitarReasignacion?: (proceso: Proceso) => void; // ✅ NUEVO: Solicitar reasignación a otro profesional
  onAsociarProcesoProceso?: (proceso: Proceso) => void; // ✅ NUEVO: Asociar proceso a otro proceso (estados post-Recepción)
  noticiasAsociadas?: Noticia[]; // ✅ NUEVO: Lista de noticias asociadas a este proceso
  onVerNoticiaAsociada?: (noticia: Noticia) => void; // ✅ NUEVO: Ver detalles de noticia asociada
  vistaCompacta: boolean;
  isMobile?: boolean;
  colapsada?: boolean; // NUEVO: Indica si la tarjeta está colapsada
  onToggleColapso?: () => void; // NUEVO: Toggle para colapsar/expandir
  onEditarProceso?: (proceso: Proceso) => void; // ✅ NUEVO: Editar proceso (reemplaza Ver Detalles)
}

function TarjetaProceso({ 
  proceso, 
  onVerDetalles, 
  onAprobarBorrador, 
  onVerExpediente, 
  onGestionAutos,
  onGestionEvidencias,
  onGestionOficios,
  onSolicitarReasignacion,
  onAsociarProcesoProceso, // ✅ NUEVO: Asociar proceso a otro proceso
  onGestionActas,
  onComentarios,
  noticiasAsociadas = [], // ✅ NUEVO
  onVerNoticiaAsociada, // ✅ NUEVO
  vistaCompacta, 
  isMobile,
  colapsada,
  onToggleColapso,
  onEditarProceso // ✅ NUEVO: Editar proceso
}: TarjetaProcesoProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'ITEM',
    item: { ...proceso, tipoItem: 'proceso' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  // ✅ NUEVO: Estado para expandir/colapsar sección de noticias asociadas
  const [noticiasExpanded, setNoticiasExpanded] = useState(false);

  // ✅ NUEVO: Obtener acciones disponibles según la etapa
  const accionesDisponibles = obtenerAccionesPorEtapa(
    proceso.etapaActual as EtapaProceso,
    proceso.pendienteAprobacion
  );

  const semaforoIndicator = {
    verde: { color: '#10B981', label: 'En término' },
    amarillo: { color: '#F59E0B', label: 'Próximo a vencer' },
    rojo: { color: '#DC2626', label: 'Vencido' }
  };

  const semaforo = semaforoIndicator[proceso.semaforo];

  return (
    <motion.div
      ref={drag}
      id={`proceso-${proceso.id}`} // ✅ NUEVO: ID para scroll automático desde noticia
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: isDragging ? 0.95 : 1 }}
      className="cursor-move touch-none w-full"
    >
      <Card 
        className="bg-white border border-gray-200 hover:shadow-md transition-all flex flex-col w-full"
        style={{ 
          height: vistaCompacta ? (isMobile ? '500px' : '560px') : (isMobile ? '600px' : '680px'),
          minHeight: vistaCompacta ? (isMobile ? '500px' : '560px') : (isMobile ? '600px' : '680px'),
          maxHeight: vistaCompacta ? (isMobile ? '500px' : '560px') : (isMobile ? '600px' : '680px')
        }}
      >
        {/* Barra superior azul ESAP */}
        <div 
          className="h-1 flex-shrink-0"
          style={{ background: '#003DA5' }}
        />

        <div className={`${isMobile ? 'p-2' : 'p-2.5'} flex-1 flex flex-col overflow-y-auto min-h-0`}>
          {/* Header */}
          <div className="flex items-start justify-between mb-1.5">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div 
                className={`${isMobile ? 'p-1' : 'p-1.5'} rounded-lg flex-shrink-0`}
                style={{ background: '#E0EDFF' }}
              >
                <Scale className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} style={{ color: '#003DA5' }} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} truncate`} style={{ color: '#003DA5' }}>
                  {proceso.numeroProceso}
                </h4>
                <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-600 truncate`}>
                  {isMobile ? proceso.noticiaOrigen : `Noticia: ${proceso.noticiaOrigen}`}
                </p>
              </div>
            </div>
          </div>

          {/* Denunciante */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">👤 Denunciante:</p>
            <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-1`}>
              {proceso.denunciante ? (typeof proceso.denunciante === 'string' ? proceso.denunciante : proceso.denunciante.nombre) : 'Sin información'}
            </p>
            {proceso.denunciante && typeof proceso.denunciante !== 'string' && (
              <p className="text-xs text-gray-600">
                {proceso.denunciante.tipoIdentificacion} {proceso.denunciante.numeroIdentificacion}
              </p>
            )}
          </div>

          {/* Denunciado */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">⚠️ Denunciado:</p>
            <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-1`}>
              {proceso.denunciado ? (typeof proceso.denunciado === 'string' ? proceso.denunciado : proceso.denunciado.nombre) : 'Sin información'}
            </p>
            {proceso.denunciado && typeof proceso.denunciado !== 'string' && (
              <p className="text-xs text-gray-600">
                {proceso.denunciado.tipoIdentificacion} {proceso.denunciado.numeroIdentificacion}
              </p>
            )}
          </div>

          {/* Profesional Asignado */}
          {proceso.profesionalAsignado && (
            <div className="mb-1.5 pb-1.5 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Avatar className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} flex-shrink-0`}>
                  <AvatarFallback 
                    className="text-xs"
                    style={{ background: '#E0EDFF', color: '#003DA5' }}
                  >
                    {(typeof proceso.profesionalAsignado === 'string' ? proceso.profesionalAsignado : proceso.profesionalAsignado.nombre)?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'SA'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">👨‍💼 Profesional:</p>
                  <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-1`}>
                    {typeof proceso.profesionalAsignado === 'string' ? proceso.profesionalAsignado : proceso.profesionalAsignado.nombre}
                  </p>
                  {typeof proceso.profesionalAsignado !== 'string' && (
                    <p className="text-xs text-gray-600">
                      {proceso.profesionalAsignado.tipoIdentificacion} {proceso.profesionalAsignado.numeroIdentificacion}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Badges */}
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            {proceso.pendienteAprobacion && (
              <Badge className={`${isMobile ? 'text-xs' : 'text-xs'} bg-red-50 text-red-700 border border-red-200 flex items-center gap-1 font-semibold`}>
                <AlertCircle className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} />
                {isMobile ? 'Pend.' : 'Pendiente'}
              </Badge>
            )}
            <Badge 
              className={`${isMobile ? 'text-xs' : 'text-xs'} flex items-center gap-1 font-semibold bg-gray-50 border border-gray-200`}
              style={{ color: semaforo.color }}
            >
              <div 
                className={`${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full`}
                style={{ background: semaforo.color }}
              />
              {proceso.diasRestantes} días
            </Badge>
            
            {/* ✅ NUEVO: Badge de Noticias Asociadas */}
            {noticiasAsociadas.length > 0 && (
              <Badge 
                className={`${isMobile ? 'text-xs' : 'text-xs'} flex items-center gap-1 font-semibold bg-purple-100 text-purple-700 border border-purple-300 cursor-pointer hover:bg-purple-200 transition-colors`}
                onClick={(e) => {
                  e.stopPropagation();
                  setNoticiasExpanded(!noticiasExpanded);
                }}
                title={`${noticiasAsociadas.length} ${noticiasAsociadas.length === 1 ? 'noticia asociada' : 'noticias asociadas'}`}
              >
                <Link2 className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} />
                {noticiasAsociadas.length} {noticiasAsociadas.length === 1 ? 'noticia' : 'noticias'}
                {noticiasExpanded ? (
                  <ChevronUp className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} />
                ) : (
                  <ChevronDown className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} />
                )}
              </Badge>
            )}
          </div>

          {/* ✅ NUEVO: Sección Expandible de Noticias Asociadas */}
          {noticiasAsociadas.length > 0 && noticiasExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mb-2 overflow-hidden"
            >
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 space-y-1.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Link2 className="w-3 h-3 text-purple-700" />
                  <p className="text-xs font-bold text-purple-900">
                    Noticias Asociadas ({noticiasAsociadas.length})
                  </p>
                </div>
                
                <div className="space-y-1">
                  {noticiasAsociadas.map((noticia) => (
                    <div
                      key={noticia.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onVerNoticiaAsociada?.(noticia);
                      }}
                      className={`
                        ${isMobile ? 'p-1.5' : 'p-2'} 
                        bg-white border border-purple-200 rounded 
                        hover:bg-purple-50 hover:border-purple-400 
                        transition-all cursor-pointer
                        group
                      `}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`${isMobile ? 'text-xs' : 'text-xs'} font-bold text-purple-900 truncate`}>
                            {noticia.numero}
                          </p>
                          <p className="text-xs text-purple-700 truncate">
                            {noticia.denunciado ? (typeof noticia.denunciado === 'string' ? noticia.denunciado : noticia.denunciado.nombre) : 'Sin información'}
                          </p>
                          {noticia.procesoAsociado && (
                            <p className="text-xs text-purple-600 mt-0.5">
                              Asociado el {new Date(noticia.procesoAsociado.fechaAsociacion).toLocaleDateString('es-CO', { 
                                day: '2-digit', 
                                month: '2-digit' 
                              })}
                            </p>
                          )}
                        </div>
                        <ExternalLink className="w-3 h-3 text-purple-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Métricas */}
          <div className="grid grid-cols-3 gap-1.5 mb-1.5">
            <div 
              className={`text-center ${isMobile ? 'p-1' : 'p-1.5'} rounded-lg bg-gray-50 border border-gray-100`}
            >
              <p className={`${isMobile ? 'text-xs' : 'text-xs'} font-bold text-gray-700`}>{proceso.borradores.length}</p>
              <p className="text-xs text-gray-500">{isMobile ? 'B' : 'Borr.'}</p>
            </div>
            <div 
              className={`text-center ${isMobile ? 'p-1' : 'p-1.5'} rounded-lg bg-gray-50 border border-gray-100`}
            >
              <p className={`${isMobile ? 'text-xs' : 'text-xs'} font-bold text-gray-700`}>{proceso.documentos.length}</p>
              <p className="text-xs text-gray-500">Docs</p>
            </div>
            <div 
              className={`text-center ${isMobile ? 'p-1' : 'p-1.5'} rounded-lg bg-gray-50 border border-gray-100`}
            >
              <p className={`${isMobile ? 'text-xs' : 'text-xs'} font-bold text-gray-700`}>
                {proceso.porcentajeTiempo}%
              </p>
              <p className="text-xs text-gray-500">{isMobile ? 'T' : 'Tiempo'}</p>
            </div>
          </div>

          {/* Última actuación - SIEMPRE VISIBLE */}
          <div className="mb-2 p-2 rounded-lg" style={{ backgroundColor: '#F0F7FF', border: '1px solid #BFDBFE' }}>
            <p className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: '#003DA5' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#003DA5' }}></span>
              ÚLTIMA ACTUACIÓN
            </p>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-700 line-clamp-2 mb-1`}>
              {proceso.ultimaActuacion}
            </p>
            <p className="text-xs text-gray-500">
              📅 {proceso.fechaCreacion}
            </p>
          </div>

          {/* Acciones - Diseño Corporativo Azul/Blanco ESAP en 2 Columnas */}
          <div className="space-y-1.5 pt-2 border-t border-gray-200 mt-auto flex-shrink-0">
            {/* Fila 1: Expediente + Editar */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onVerExpediente(proceso);
                }}
                className={`flex items-center justify-center gap-1 ${isMobile ? 'px-2 py-1.5' : 'px-2.5 py-2'} rounded-lg font-semibold transition-all shadow-sm hover:shadow-md text-white text-xs`}
                style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}
                title="Ver expediente completo"
              >
                <Archive className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} flex-shrink-0`} />
                <span className="truncate">Expediente</span>
              </button>
              
              {/* ✅ Botón Editar - Reemplaza "Detalles" en TODOS los estados */}
              {onEditarProceso && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditarProceso(proceso);
                  }}
                  className={`flex items-center justify-center gap-1 ${isMobile ? 'px-2 py-1.5' : 'px-2.5 py-2'} rounded-lg font-semibold transition-all shadow-sm hover:shadow-md text-white text-xs`}
                  style={{ background: 'linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)' }}
                  title="Editar proceso"
                >
                  <Edit className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} flex-shrink-0`} />
                  <span className="truncate">Editar</span>
                </button>
              )}
            </div>

            {/* Fila 2: Autos + Evidencias */}
            <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onGestionAutos) {
                      onGestionAutos(proceso);
                    } else {
                      toast.info('Autos y Providencias', {
                        description: proceso.numeroProceso
                      });
                    }
                  }}
                  className={`flex items-center justify-center gap-1 ${isMobile ? 'px-2 py-1.5' : 'px-2.5 py-2'} rounded-lg font-semibold transition-all shadow-sm hover:shadow-md text-white text-xs`}
                  style={{ background: 'linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)' }}
                  title="Gestión de Autos"
                >
                  <Scale className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} flex-shrink-0`} />
                  <span className="truncate">Autos</span>
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onGestionEvidencias) {
                      onGestionEvidencias(proceso);
                    } else {
                      toast.info('Evidencias', {
                        description: proceso.numeroProceso
                      });
                    }
                  }}
                  className={`flex items-center justify-center gap-1 ${isMobile ? 'px-2 py-1.5' : 'px-2.5 py-2'} rounded-lg font-semibold transition-all shadow-sm hover:shadow-md text-white text-xs`}
                  style={{ background: 'linear-gradient(135deg, #0D47A1 0%, #1565C0 100%)' }}
                  title="Gestión de Evidencias"
                >
                  <FolderOpen className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} flex-shrink-0`} />
                  <span className="truncate">Evidencias</span>
                </button>
              </div>

              {/* Fila 3: Oficios + Actas */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onGestionOficios) {
                      onGestionOficios(proceso);
                    } else {
                      toast.info('Oficios', {
                        description: proceso.numeroProceso
                      });
                    }
                  }}
                  className={`flex items-center justify-center gap-1 ${isMobile ? 'px-2 py-1.5' : 'px-2.5 py-2'} rounded-lg font-semibold transition-all shadow-sm hover:shadow-md text-white text-xs`}
                  style={{ background: 'linear-gradient(135deg, #1565C0 0%, #1E88E5 100%)' }}
                  title="Gestión de Oficios"
                >
                  <Mail className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} flex-shrink-0`} />
                  <span className="truncate">Oficios</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onGestionActas) {
                      onGestionActas(proceso);
                    } else {
                      toast.info('Actas', {
                        description: proceso.numeroProceso
                      });
                    }
                  }}
                  className={`flex items-center justify-center gap-1 ${isMobile ? 'px-2 py-1.5' : 'px-2.5 py-2'} rounded-lg font-semibold transition-all shadow-sm hover:shadow-md text-white text-xs`}
                  style={{ background: 'linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)' }}
                  title="Gestión de Actas"
                >
                  <FileCheck className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} flex-shrink-0`} />
                  <span className="truncate">Actas</span>
                </button>
              </div>

              {/* Fila 4: Comentarios (ancho completo) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onComentarios) {
                    onComentarios(proceso);
                  } else {
                    toast.info('Comentarios', {
                      description: proceso.numeroProceso
                    });
                  }
                }}
                className={`w-full flex items-center justify-center gap-1.5 ${isMobile ? 'px-2 py-1.5' : 'px-2.5 py-2'} rounded-lg font-semibold transition-all shadow-sm hover:shadow-md text-white text-xs`}
                style={{ background: 'linear-gradient(135deg, #0D47A1 0%, #1565C0 100%)' }}
                title="Comentarios del proceso"
              >
                <MessageSquare className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} flex-shrink-0`} />
                <span className="truncate">Comentarios del Proceso</span>
              </button>

              {/* Fila 5: Solicitar Reasignación (condicional) */}
              {proceso.etapaActual !== 'Recepción' && onSolicitarReasignacion && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSolicitarReasignacion(proceso);
                  }}
                  className={`w-full flex items-center justify-center gap-1.5 ${isMobile ? 'px-2 py-1.5' : 'px-2.5 py-2'} rounded-lg font-semibold transition-all shadow-sm hover:shadow-md border-2 text-xs bg-white`}
                  style={{ 
                    borderColor: '#2962FF',
                    color: '#003DA5'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#003DA5';
                    e.currentTarget.style.background = '#E3F2FD';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#2962FF';
                    e.currentTarget.style.background = '#FFFFFF';
                  }}
                  title="Solicitar reasignación del proceso"
                >
                  <UserCheck className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} flex-shrink-0`} />
                  <span className="truncate">Solicitar Reasignación</span>
                </button>
              )}

              {/* Fila 5b: Asociar Proceso a Proceso (condicional - Solo estados post-Recepción) */}
              {proceso.etapaActual !== 'Recepción' && onAsociarProcesoProceso && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAsociarProcesoProceso(proceso);
                  }}
                  className={`w-full flex items-center justify-center gap-1.5 ${isMobile ? 'px-2 py-1.5' : 'px-2.5 py-2'} rounded-lg font-semibold transition-all shadow-sm hover:shadow-md text-white text-xs`}
                  style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)' }}
                  title="Asociar este proceso con otro proceso disciplinario"
                >
                  <Link2 className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} flex-shrink-0`} />
                  <span className="truncate">Asociar Proceso</span>
                </button>
              )}

            {/* Fila 6: Aprobar Documento (condicional) */}
            {proceso.pendienteAprobacion && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAprobarBorrador(proceso);
                }}
                className={`w-full flex items-center justify-center gap-1.5 ${isMobile ? 'px-2 py-1.5' : 'px-2.5 py-2'} rounded-lg font-semibold transition-all shadow-sm hover:shadow-md text-white text-xs`}
                style={{ background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)' }}
                title="Aprobar documento de actuación pendiente (auto, oficio, acta o resolución) para que pueda ser notificado oficialmente"
              >
                <CheckCircle className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} flex-shrink-0`} />
                <span className="truncate">Aprobar Documento</span>
              </button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ==================== COMPONENTE VISTA LISTA ====================
interface VistaListaProps {
  items: Item[];
  onVerDetalles: (proceso: Proceso) => void;
  onAprobarBorrador: (proceso: Proceso) => void;
  onVerExpediente: (proceso: Proceso) => void;
  onGestionAutos?: (proceso: Proceso) => void;
  onGestionEvidencias?: (proceso: Proceso) => void;
  onGestionOficios?: (proceso: Proceso) => void;
  onGestionActas?: (proceso: Proceso) => void;
  onComentarios?: (proceso: Proceso) => void;
  onSolicitarReasignacion?: (proceso: Proceso) => void; // ✅ AGREGADO: Coherencia con Kanban
  onAsociarProcesoProceso?: (proceso: Proceso) => void; // ✅ NUEVO: Asociar proceso a proceso
  onConvertirNoticia: (noticia: Noticia) => void;
  onArchivarNoticia: (noticia: Noticia) => void;
  onVerDetallesNoticia?: (noticia: Noticia) => void;
  onDevolverNoticia?: (noticia: Noticia) => void;
  onDevolverCompetencia?: (noticia: Noticia) => void; // ✅ AGREGADO: Coherencia con Kanban
  onAsociarNoticiaProceso?: (noticia: Noticia) => void; // ✅ AGREGADO: Coherencia con Kanban
  onVerProcesoAsociado?: (procesoId: string) => void; // ✅ AGREGADO: Coherencia con Kanban
  onVerNoticiaAsociada?: (noticia: Noticia) => void; // ✅ AGREGADO: Coherencia con Kanban
  onEditarNoticia?: (noticia: Noticia) => void; // ✅ AGREGADO: Coherencia con Kanban
  onEditarProceso?: (proceso: Proceso) => void; // ✅ NUEVO: Editar proceso (reemplaza Ver Detalles)
  isMobile?: boolean;
}

function VistaLista({
  items,
  onVerDetalles,
  onAprobarBorrador,
  onVerExpediente,
  onGestionAutos,
  onGestionEvidencias,
  onGestionOficios,
  onGestionActas,
  onComentarios,
  onSolicitarReasignacion,
  onAsociarProcesoProceso, // ✅ NUEVO: Asociar proceso a proceso
  onConvertirNoticia,
  onArchivarNoticia,
  onVerDetallesNoticia,
  onDevolverNoticia,
  onDevolverCompetencia,
  onAsociarNoticiaProceso,
  onVerProcesoAsociado,
  onVerNoticiaAsociada,
  onEditarNoticia,
  onEditarProceso, // ✅ NUEVO: Editar proceso
  isMobile
}: VistaListaProps) {
  const [filtroEtapa, setFiltroEtapa] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const itemsFiltrados = items.filter(item => {
    const matchSearch = item.tipo === 'noticia' 
      ? (item as Noticia).numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ((item as Noticia).denunciado && (typeof (item as Noticia).denunciado === 'string' 
          ? (item as Noticia).denunciado.toLowerCase().includes(searchTerm.toLowerCase())
          : (item as Noticia).denunciado.nombre?.toLowerCase().includes(searchTerm.toLowerCase())))
      : (item as Proceso).numeroProceso.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ((item as Proceso).denunciado && (typeof (item as Proceso).denunciado === 'string'
          ? (item as Proceso).denunciado.toLowerCase().includes(searchTerm.toLowerCase())
          : (item as Proceso).denunciado.nombre?.toLowerCase().includes(searchTerm.toLowerCase())));
    
    const matchEtapa = filtroEtapa === 'todos' || 
      (item.tipo === 'noticia' && filtroEtapa === 'Recepción') ||
      (item.tipo === 'proceso' && (item as Proceso).etapaActual === filtroEtapa);
    
    return matchSearch && matchEtapa;
  });

  const getSemaforoColor = (semaforo?: string) => {
    switch(semaforo) {
      case 'verde': return { bg: '#D1FAE5', color: '#059669', text: 'En término' };
      case 'amarillo': return { bg: '#FEF3C7', color: '#D97706', text: 'Próximo a vencer' };
      case 'rojo': return { bg: '#FEE2E2', color: '#DC2626', text: 'Vencido' };
      default: return { bg: '#F3F4F6', color: '#6B7280', text: 'N/A' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtros Responsive */}
      <Card className={`${isMobile ? 'p-3' : 'p-4'}`}>
        <div className="flex flex-col gap-3">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-gray-400`} />
            <input
              type="text"
              placeholder={isMobile ? "Buscar..." : "Buscar por número o denunciado..."}
              className={`w-full ${isMobile ? 'pl-9 pr-3 py-2 text-sm' : 'pl-10 pr-4 py-2.5'} rounded-lg border-2 focus:outline-none focus:border-[#003DA5]`}
              style={{ borderColor: '#E5E7EB' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className={`${isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-2.5'} rounded-lg border-2 focus:outline-none font-semibold`}
            style={{ borderColor: '#E5E7EB', color: '#4B5563' }}
            value={filtroEtapa}
            onChange={(e) => setFiltroEtapa(e.target.value)}
          >
            <option value="todos">Todas las etapas</option>
            <option value="Recepción">Recepción (Noticias) - 3 días</option>
            <option value="Valoración">Valoración - 10 días</option>
            <option value="Indagación">Indagación - 40 días</option>
            <option value="Investigación">Investigación - 60 días</option>
            <option value="Juzgamiento">Juzgamiento - 50 días</option>
            <option value="Fallo">Fallo - 10 días</option>
          </select>
        </div>
      </Card>

      {/* Vista Tabla Desktop / Tarjetas Mobile */}
      {isMobile ? (
        /* Vista de Tarjetas para Mobile */
        <div className="space-y-3">
          {itemsFiltrados.map((item) => {
            const isNoticia = item.tipo === 'noticia';
            const noticia = isNoticia ? (item as Noticia) : null;
            const proceso = !isNoticia ? (item as Proceso) : null;
            const semaforo = proceso ? getSemaforoColor(proceso.semaforo) : null;

            return (
              <Card key={item.id} className="overflow-hidden border-2" style={{ borderColor: '#E5E7EB' }}>
                {/* Barra superior con color de tipo */}
                <div 
                  className="h-1" 
                  style={{ background: isNoticia ? '#F59E0B' : '#003DA5' }}
                />
                
                <div className="p-3 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {isNoticia ? (
                        <div className="p-1.5 rounded-lg bg-orange-100 flex-shrink-0">
                          <FileText className="w-4 h-4 text-orange-600" />
                        </div>
                      ) : (
                        <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: '#E0EDFF' }}>
                          <FolderOpen className="w-4 h-4" style={{ color: '#003DA5' }} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm truncate" style={{ color: isNoticia ? '#F59E0B' : '#003DA5' }}>
                          {isNoticia ? noticia!.numero : proceso!.numeroProceso}
                        </p>
                        <p className="text-xs text-gray-500">
                          {isNoticia ? 'Noticia' : 'Proceso'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Denunciado */}
                  <div className="pb-2 border-b border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Denunciado:</p>
                    <p className="font-bold text-sm text-gray-900">
                      {isNoticia 
                        ? (typeof noticia!.denunciado === 'string' ? noticia!.denunciado : noticia!.denunciado.nombre)
                        : (typeof proceso!.denunciado === 'string' ? proceso!.denunciado : proceso!.denunciado.nombre)}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {isNoticia 
                        ? (typeof noticia!.denunciado !== 'string' && `${noticia!.denunciado.tipoIdentificacion} ${noticia!.denunciado.numeroIdentificacion}`)
                        : (typeof proceso!.denunciado !== 'string' ? `${proceso!.denunciado.tipoIdentificacion} ${proceso!.denunciado.numeroIdentificacion}` : proceso!.cedula ? `CC: ${proceso!.cedula}` : '')}
                    </p>
                  </div>

                  {/* Info Row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      className="text-xs"
                      style={{
                        background: isNoticia ? '#FEF3C7' : '#E0EDFF',
                        color: isNoticia ? '#D97706' : '#003DA5'
                      }}
                    >
                      {isNoticia ? 'Recepción' : proceso!.etapaActual}
                    </Badge>
                    
                    {proceso && semaforo && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: semaforo.bg }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: semaforo.color }} />
                        <span className="text-xs font-semibold" style={{ color: semaforo.color }}>
                          {proceso.diasRestantes}d
                        </span>
                      </div>
                    )}
                    
                    {isNoticia && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-orange-50">
                        <Clock className="w-3 h-3 text-orange-600" />
                        <span className="text-xs font-semibold text-orange-700">
                          {noticia!.diasPendientes}d
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Profesional (solo procesos) */}
                  {proceso && proceso.profesionalAsignado && (
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback style={{ background: '#E0EDFF', color: '#003DA5', fontSize: '9px' }}>
                          {(typeof proceso.profesionalAsignado === 'string' ? proceso.profesionalAsignado : proceso.profesionalAsignado.nombre)?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'SA'}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-xs font-medium text-gray-700 truncate flex-1">
                        {typeof proceso.profesionalAsignado === 'string' ? proceso.profesionalAsignado : proceso.profesionalAsignado.nombre}
                      </p>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-gray-200 flex-wrap">
                    {isNoticia ? (
                      <>
                        {onEditarNoticia && (
                          <button
                            onClick={() => onEditarNoticia(noticia!)}
                            className="flex-1 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors text-xs font-semibold flex items-center justify-center gap-1.5"
                            style={{ color: '#1976D2', border: '1px solid #E3F2FD' }}
                            title="Editar noticia"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Editar
                          </button>
                        )}
                        <button
                          onClick={() => onConvertirNoticia(noticia!)}
                          className="flex-1 px-3 py-2 rounded-lg hover:bg-green-50 transition-colors text-xs font-semibold flex items-center justify-center gap-1.5"
                          style={{ color: '#059669', border: '1px solid #D1FAE5' }}
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          Convertir
                        </button>
                        {onDevolverCompetencia && (
                          <button
                            onClick={() => onDevolverCompetencia(noticia!)}
                            className="px-3 py-2 rounded-lg hover:bg-amber-50 transition-colors"
                            style={{ border: '1px solid #FEF3C7' }}
                            title="Devolver por competencia"
                          >
                            <XCircle className="w-3.5 h-3.5 text-amber-600" />
                          </button>
                        )}
                        <button
                          onClick={() => onArchivarNoticia(noticia!)}
                          className="px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                          style={{ border: '1px solid #FEE2E2' }}
                          title="Archivar"
                        >
                          <Archive className="w-3.5 h-3.5 text-red-600" />
                        </button>
                      </>
                    ) : (
                      <>
                        {/* ✅ Botón Editar - Reemplaza "Detalles" */}
                        {onEditarProceso && (
                          <button
                            onClick={() => onEditarProceso(proceso!)}
                            className="flex-1 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors text-xs font-semibold flex items-center justify-center gap-1.5"
                            style={{ color: '#1976D2', border: '1px solid #E3F2FD' }}
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Editar
                          </button>
                        )}
                        <button
                          onClick={() => onVerExpediente(proceso!)}
                          className="flex-1 px-3 py-2 rounded-lg hover:bg-purple-50 transition-colors text-xs font-semibold flex items-center justify-center gap-1.5"
                          style={{ color: '#7C3AED', border: '1px solid #EDE9FE' }}
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          Expediente
                        </button>
                        {onComentarios && (
                          <button
                            onClick={() => onComentarios(proceso!)}
                            className="px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                            style={{ border: '1px solid #E0EDFF' }}
                            title="Comentarios"
                          >
                            <MessageCircle className="w-3.5 h-3.5" style={{ color: '#003DA5' }} />
                          </button>
                        )}
                        {onSolicitarReasignacion && (
                          <button
                            onClick={() => onSolicitarReasignacion(proceso!)}
                            className="px-3 py-2 rounded-lg hover:bg-orange-50 transition-colors"
                            style={{ border: '1px solid #FEF3C7' }}
                            title="Solicitar reasignación"
                          >
                            <UserCog className="w-3.5 h-3.5 text-orange-600" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

          {itemsFiltrados.length === 0 && (
            <Card className="p-12">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: '#D1D5DB' }} />
                <p className="text-sm font-bold" style={{ color: '#6B7280' }}>
                  No se encontraron resultados
                </p>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                  Intenta ajustar los filtros de búsqueda
                </p>
              </div>
            </Card>
          )}
        </div>
      ) : (
        /* Vista de Tabla para Desktop/Tablet */
        <Card className="border-2 overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0" style={{ background: '#F9FAFB' }}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: '#6B7280' }}>
                  Número / Tipo
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: '#6B7280' }}>
                  Denunciado
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: '#6B7280' }}>
                  Etapa / Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: '#6B7280' }}>
                  Responsable
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase" style={{ color: '#6B7280' }}>
                  Semáforo
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase" style={{ color: '#6B7280' }}>
                  Tiempo
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: '#6B7280' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {itemsFiltrados.map((item, index) => {
                const isNoticia = item.tipo === 'noticia';
                const noticia = isNoticia ? (item as Noticia) : null;
                const proceso = !isNoticia ? (item as Proceso) : null;
                const semaforo = proceso ? getSemaforoColor(proceso.semaforo) : null;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 transition-colors"
                    style={{ borderTop: index > 0 ? '1px solid #E5E7EB' : 'none' }}
                  >
                    {/* Número / Tipo */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {isNoticia ? (
                          <div className="p-1.5 rounded-lg bg-orange-100">
                            <FileText className="w-4 h-4 text-orange-600" />
                          </div>
                        ) : (
                          <div className="p-1.5 rounded-lg" style={{ background: '#E0EDFF' }}>
                            <FolderOpen className="w-4 h-4" style={{ color: '#003DA5' }} />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-sm" style={{ color: '#1F2937' }}>
                            {isNoticia ? noticia!.numero : proceso!.numeroProceso}
                          </p>
                          <p className="text-xs" style={{ color: '#9CA3AF' }}>
                            {isNoticia ? 'Noticia' : 'Proceso'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Denunciado */}
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-semibold text-sm" style={{ color: '#1F2937' }}>
                          {isNoticia 
                            ? (noticia!.denunciado ? (typeof noticia!.denunciado === 'string' ? noticia!.denunciado : noticia!.denunciado.nombre) : 'Sin información')
                            : (proceso!.denunciado ? (typeof proceso!.denunciado === 'string' ? proceso!.denunciado : proceso!.denunciado.nombre) : 'Sin información')}
                        </p>
                        {proceso && proceso.cedula && (
                          <p className="text-xs" style={{ color: '#6B7280' }}>
                            CC: {proceso.cedula}
                          </p>
                        )}
                        {proceso && proceso.cargo && (
                          <p className="text-xs" style={{ color: '#9CA3AF' }}>
                            {proceso.cargo}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Etapa / Estado */}
                    <td className="px-4 py-4">
                      <div>
                        <Badge
                          className="mb-1"
                          style={{
                            background: isNoticia ? '#FEF3C7' : '#E0EDFF',
                            color: isNoticia ? '#D97706' : '#003DA5'
                          }}
                        >
                          {isNoticia ? 'Recepción' : proceso!.etapaActual}
                        </Badge>
                        {proceso && (
                          <p className="text-xs" style={{ color: '#6B7280' }}>
                            {proceso.estadoActual}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Responsable */}
                    <td className="px-4 py-4">
                      {proceso && proceso.profesionalAsignado ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="w-7 h-7">
                            <AvatarFallback style={{ background: '#E0EDFF', color: '#003DA5', fontSize: '10px' }}>
                              {(typeof proceso.profesionalAsignado === 'string' ? proceso.profesionalAsignado : proceso.profesionalAsignado.nombre)?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'SA'}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-xs font-medium" style={{ color: '#4B5563' }}>
                            {typeof proceso.profesionalAsignado === 'string' ? proceso.profesionalAsignado : proceso.profesionalAsignado.nombre}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs" style={{ color: '#9CA3AF' }}>Sin asignar</p>
                      )}
                    </td>

                    {/* Semáforo */}
                    <td className="px-4 py-4 text-center">
                      {proceso && semaforo ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: semaforo.bg }}>
                          <div className="w-2 h-2 rounded-full" style={{ background: semaforo.color }} />
                          <span className="text-xs font-semibold" style={{ color: semaforo.color }}>
                            {semaforo.text}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: '#9CA3AF' }}>N/A</span>
                      )}
                    </td>

                    {/* Tiempo */}
                    <td className="px-4 py-4 text-center">
                      {isNoticia ? (
                        <div>
                          <p className="text-sm font-bold" style={{ color: '#F59E0B' }}>
                            {noticia!.diasPendientes} días
                          </p>
                          <p className="text-xs" style={{ color: '#9CA3AF' }}>pendientes</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-bold" style={{ 
                            color: proceso!.diasRestantes < 5 ? '#DC2626' : proceso!.diasRestantes < 10 ? '#F59E0B' : '#10B981'
                          }}>
                            {proceso!.diasRestantes} días
                          </p>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${proceso!.porcentajeTiempo}%`,
                                background: proceso!.porcentajeTiempo >= 80 ? '#DC2626' : proceso!.porcentajeTiempo >= 60 ? '#F59E0B' : '#10B981'
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {isNoticia ? (
                          <>
                            {/* Editar Noticia */}
                            {onEditarNoticia && (
                              <button
                                onClick={() => onEditarNoticia(noticia!)}
                                className="p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                title="Editar noticia"
                              >
                                <Edit className="w-4 h-4" style={{ color: '#1976D2' }} />
                              </button>
                            )}

                            {/* Asociar a Proceso */}
                            {onAsociarNoticiaProceso && (
                              <button
                                onClick={() => onAsociarNoticiaProceso(noticia!)}
                                className="p-2 rounded-lg hover:bg-purple-50 transition-colors"
                                title="Asociar a proceso existente"
                              >
                                <Link2 className="w-4 h-4 text-purple-600" />
                              </button>
                            )}

                            {/* Ver Proceso Asociado */}
                            {noticia!.procesoAsociadoId && onVerProcesoAsociado && (
                              <button
                                onClick={() => onVerProcesoAsociado(noticia!.procesoAsociadoId!)}
                                className="p-2 rounded-lg hover:bg-indigo-50 transition-colors"
                                title="Ver proceso asociado"
                              >
                                <ExternalLink className="w-4 h-4 text-indigo-600" />
                              </button>
                            )}

                            {/* Convertir a Proceso */}
                            <button
                              onClick={() => onConvertirNoticia(noticia!)}
                              className="p-2 rounded-lg hover:bg-green-50 transition-colors"
                              title="Convertir a proceso disciplinario"
                            >
                              <PlusCircle className="w-4 h-4 text-green-600" />
                            </button>

                            {/* Devolver Noticia */}
                            {onDevolverNoticia && (
                              <button
                                onClick={() => onDevolverNoticia(noticia!)}
                                className="p-2 rounded-lg hover:bg-yellow-50 transition-colors"
                                title="Devolver noticia"
                              >
                                <ArrowLeft className="w-4 h-4 text-yellow-600" />
                              </button>
                            )}

                            {/* Devolver por Competencia */}
                            {onDevolverCompetencia && (
                              <button
                                onClick={() => onDevolverCompetencia(noticia!)}
                                className="p-2 rounded-lg hover:bg-amber-50 transition-colors"
                                title="Devolver por competencia"
                              >
                                <XCircle className="w-4 h-4 text-amber-600" />
                              </button>
                            )}

                            {/* Archivar Noticia */}
                            <button
                              onClick={() => onArchivarNoticia(noticia!)}
                              className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                              title="Archivar noticia"
                            >
                              <Archive className="w-4 h-4 text-red-600" />
                            </button>
                          </>
                        ) : (
                          <>
                            {/* ✅ Acción: Editar Proceso - Reemplaza "Ver Detalles" */}
                            {onEditarProceso && (
                              <button
                                onClick={() => onEditarProceso(proceso!)}
                                className="p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                title="Editar proceso"
                              >
                                <Edit className="w-4 h-4" style={{ color: '#1976D2' }} />
                              </button>
                            )}
                            
                            {/* Acción: Ver Expediente Completo */}
                            <button
                              onClick={() => onVerExpediente(proceso!)}
                              className="p-2 rounded-lg hover:bg-purple-50 transition-colors"
                              title="Ver expediente completo"
                            >
                              <FolderOpen className="w-4 h-4 text-purple-600" />
                            </button>
                            
                            {/* Acción: Gestionar Autos */}
                            {onGestionAutos && (
                              <button
                                onClick={() => onGestionAutos(proceso!)}
                                className="p-2 rounded-lg hover:bg-green-50 transition-colors"
                                title="Gestionar autos"
                              >
                                <Scale className="w-4 h-4 text-green-600" />
                              </button>
                            )}
                            
                            {/* Acción: Gestionar Evidencias */}
                            {onGestionEvidencias && (
                              <button
                                onClick={() => onGestionEvidencias(proceso!)}
                                className="p-2 rounded-lg hover:bg-indigo-50 transition-colors"
                                title="Gestionar evidencias"
                              >
                                <Paperclip className="w-4 h-4 text-indigo-600" />
                              </button>
                            )}
                            
                            {/* Acción: Gestionar Oficios */}
                            {onGestionOficios && (
                              <button
                                onClick={() => onGestionOficios(proceso!)}
                                className="p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                title="Gestionar oficios"
                              >
                                <Send className="w-4 h-4 text-blue-600" />
                              </button>
                            )}
                            
                            {/* Acción: Gestionar Actas */}
                            {onGestionActas && (
                              <button
                                onClick={() => onGestionActas(proceso!)}
                                className="p-2 rounded-lg hover:bg-teal-50 transition-colors"
                                title="Gestionar actas"
                              >
                                <FileSignature className="w-4 h-4 text-teal-600" />
                              </button>
                            )}
                            
                            {/* Acción: Aprobar Documento (condicional) */}
                            {proceso!.pendienteAprobacion && (
                              <button
                                onClick={() => onAprobarBorrador(proceso!)}
                                className="p-2 rounded-lg hover:bg-green-50 transition-colors"
                                title="Aprobar documento de actuación pendiente (auto, acta, oficio o resolución)"
                              >
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </button>
                            )}

                            {/* Acción: Comentarios */}
                            {onComentarios && (
                              <button
                                onClick={() => onComentarios(proceso!)}
                                className="p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                title="Comentarios y observaciones"
                              >
                                <MessageCircle className="w-4 h-4" style={{ color: '#003DA5' }} />
                              </button>
                            )}

                            {/* Acción: Solicitar Reasignación */}
                            {onSolicitarReasignacion && (
                              <button
                                onClick={() => onSolicitarReasignacion(proceso!)}
                                className="p-2 rounded-lg hover:bg-orange-50 transition-colors"
                                title="Solicitar reasignación del proceso"
                              >
                                <UserCog className="w-4 h-4 text-orange-600" />
                              </button>
                            )}

                            {/* Ver Noticia Asociada */}
                            {proceso!.noticiaAsociada && onVerNoticiaAsociada && (
                              <button
                                onClick={() => onVerNoticiaAsociada(proceso!.noticiaAsociada!)}
                                className="p-2 rounded-lg hover:bg-purple-50 transition-colors"
                                title="Ver noticia asociada"
                              >
                                <History className="w-4 h-4 text-purple-600" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {itemsFiltrados.length === 0 && (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: '#D1D5DB' }} />
              <p className="text-sm font-bold" style={{ color: '#6B7280' }}>
                No se encontraron resultados
              </p>
              <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                Intenta ajustar los filtros de búsqueda
              </p>
            </div>
          )}
        </div>
      </Card>
      )}
    </div>
  );
}

// ==================== COMPONENTE COLUMNA KANBAN ====================
interface ColumnaKanbanProps {
  etapa: string;
  items: Item[];
  color: string;
  icono: React.ReactNode;
  diasEstimados?: number;
  onDrop: (item: Item, nuevaEtapa: string) => void;
  onConvertirNoticia: (noticia: Noticia) => void;
  onDevolverNoticia: (noticia: Noticia) => void;
  onDevolverCompetencia: (noticia: Noticia) => void;
  onArchivarNoticia: (noticia: Noticia) => void;
  onVerDetallesNoticia?: (noticia: Noticia) => void;
  onAsociarNoticiaProceso?: (noticia: Noticia) => void; // ✅ NUEVO
  onVerProcesoAsociado?: (procesoId: string) => void; // ✅ NUEVO
  onVerNoticiaAsociada?: (noticia: Noticia) => void; // ✅ NUEVO: Ver noticia asociada desde proceso
  onEditarNoticia?: (noticia: Noticia) => void; // ✅ NUEVO: Editar noticia
  onVerDetalles: (proceso: Proceso) => void;
  onAprobarBorrador: (proceso: Proceso) => void;
  onVerExpediente: (proceso: Proceso) => void;
  onGestionAutos?: (proceso: Proceso) => void;
  onGestionEvidencias?: (proceso: Proceso) => void;
  onGestionOficios?: (proceso: Proceso) => void;
  onGestionActas?: (proceso: Proceso) => void;
  onComentarios?: (proceso: Proceso) => void;
  onSolicitarReasignacion?: (proceso: Proceso) => void; // ✅ NUEVO: Solicitar reasignación
  onAsociarProcesoProceso?: (proceso: Proceso) => void; // ✅ NUEVO: Asociar proceso a otro proceso (post-Recepción)
  onEditarProceso?: (proceso: Proceso) => void; // ✅ NUEVO: Editar proceso (reemplaza Ver Detalles)
  vistaCompacta: boolean;
  isMobile?: boolean;
  colapsada?: boolean;
  onToggleColapso?: () => void;
  tarjetasColapsadas?: Set<string>; // NUEVO: Set de IDs de tarjetas colapsadas
  onToggleColapsoTarjeta?: (id: string) => void; // NUEVO: Toggle para tarjetas individuales
}

function ColumnaKanban({ 
  etapa, 
  items, 
  color, 
  icono,
  diasEstimados,
  onDrop, 
  onConvertirNoticia,
  onDevolverNoticia,
  onDevolverCompetencia,
  onArchivarNoticia,
  onVerDetallesNoticia,
  onAsociarNoticiaProceso, // ✅ NUEVO
  onVerProcesoAsociado, // ✅ NUEVO
  onVerNoticiaAsociada, // ✅ NUEVO
  onEditarNoticia, // ✅ NUEVO: Editar noticia
  onVerDetalles, 
  onAprobarBorrador, 
  onVerExpediente,
  onGestionAutos,
  onGestionEvidencias,
  onGestionOficios,
  onGestionActas,
  onComentarios,
  onSolicitarReasignacion, // ✅ NUEVO
  onAsociarProcesoProceso, // ✅ NUEVO: Asociar proceso a proceso
  onEditarProceso, // ✅ NUEVO: Editar proceso
  vistaCompacta,
  isMobile,
  colapsada = false,
  onToggleColapso,
  tarjetasColapsadas,
  onToggleColapsoTarjeta
}: ColumnaKanbanProps) {
  const [expandTimeout, setExpandTimeout] = useState<NodeJS.Timeout | null>(null);

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'ITEM',
    drop: (item: any) => {
      onDrop(item, etapa);
    },
    canDrop: (item: any) => {
      if (item.tipo === 'noticia') {
        return etapa === 'Recepción';
      }
      return true;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  });

  // Auto-expandir columna al hacer drag sobre ella (si está colapsada)
  useEffect(() => {
    if (isOver && canDrop && colapsada && onToggleColapso) {
      // Expandir después de 800ms de hover
      const timeout = setTimeout(() => {
        onToggleColapso();
      }, 800);
      setExpandTimeout(timeout);
    } else if (expandTimeout) {
      clearTimeout(expandTimeout);
      setExpandTimeout(null);
    }

    return () => {
      if (expandTimeout) {
        clearTimeout(expandTimeout);
      }
    };
  }, [isOver, canDrop, colapsada]);

  const itemsFiltrados = items.filter(item => {
    if (item.tipo === 'noticia') {
      return etapa === 'Recepción';
    }
    return item.tipo === 'proceso' && item.etapaActual === etapa;
  });

  const noticias = itemsFiltrados.filter(i => i.tipo === 'noticia') as Noticia[];
  const procesos = itemsFiltrados.filter(i => i.tipo === 'proceso') as Proceso[];

  // ✅ NUEVO: Función para obtener noticias asociadas a un proceso específico
  const getNoticiasAsociadas = (procesoId: string): Noticia[] => {
    return (items.filter(item => item.tipo === 'noticia') as Noticia[])
      .filter(noticia => noticia.procesoAsociado?.id === procesoId);
  };

  // Si está colapsada, mostrar versión minimal
  if (colapsada) {
    // Calcular indicadores para columna colapsada
    const procesosRojos = procesos.filter(p => p.semaforo === 'rojo').length;
    const procesosAmarillos = procesos.filter(p => p.semaforo === 'amarillo').length;
    const procesosVerdes = procesos.filter(p => p.semaforo === 'verde').length;

    return (
      <motion.div 
        ref={drop} 
        className={`flex-shrink-0 h-full`}
        initial={{ width: 64 }}
        animate={{ width: 64 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <Card 
          className={`h-full border transition-all cursor-pointer group ${
            isOver && canDrop ? 'shadow-lg border-blue-500 bg-blue-50' : 'hover:shadow-md hover:border-blue-300'
          }`}
          style={{ 
            borderColor: isOver && canDrop ? '#3B82F6' : '#E5E7EB', 
            background: isOver && canDrop ? '#EFF6FF' : '#FFFFFF' 
          }}
          onClick={onToggleColapso}
        >
          <div className="flex flex-col items-center py-4 px-2 gap-3">
            {/* Indicador de drag over */}
            {isOver && canDrop && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 border-2 border-blue-500 border-dashed rounded-lg pointer-events-none"
              />
            )}
            {/* Botón expandir */}
            <button
              className="p-2 rounded-lg bg-gray-50 group-hover:bg-blue-50 transition-colors"
              title={`Expandir ${etapa}`}
            >
              <Maximize2 className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
            </button>

            {/* Icono de etapa */}
            <div className="p-2 rounded-lg bg-gray-50 border border-gray-200 group-hover:border-blue-200">
              {icono}
            </div>

            {/* Indicadores de semáforo - Solo si hay procesos */}
            {procesos.length > 0 && (
              <div className="flex flex-col gap-1 py-2">
                {procesosRojos > 0 && (
                  <div className="flex items-center gap-1" title={`${procesosRojos} vencidos`}>
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-xs font-bold text-red-600">{procesosRojos}</span>
                  </div>
                )}
                {procesosAmarillos > 0 && (
                  <div className="flex items-center gap-1" title={`${procesosAmarillos} próximos a vencer`}>
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-xs font-bold text-amber-600">{procesosAmarillos}</span>
                  </div>
                )}
                {procesosVerdes > 0 && (
                  <div className="flex items-center gap-1" title={`${procesosVerdes} en término`}>
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs font-bold text-green-600">{procesosVerdes}</span>
                  </div>
                )}
              </div>
            )}

            {/* Indicador de noticias - Solo en Recepción */}
            {etapa === 'Recepción' && noticias.length > 0 && (
              <div className="py-2">
                <div className="flex items-center gap-1" title={`${noticias.length} noticias`}>
                  <FileText className="w-3 h-3 text-orange-600" />
                  <span className="text-xs font-bold text-orange-600">{noticias.length}</span>
                </div>
              </div>
            )}

            {/* Nombre vertical */}
            <div className="flex-1 flex items-center justify-center py-4">
              <h3 
                className="font-black text-xs text-gray-800 whitespace-nowrap"
                style={{ 
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed'
                }}
              >
                {etapa}
              </h3>
            </div>

            {/* Badge contador total */}
            <Badge
              className="font-semibold text-xs px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 group-hover:bg-blue-100"
            >
              {itemsFiltrados.length}
            </Badge>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Versión expandida normal
  return (
    <motion.div
      ref={drop}
      className="h-full"
    >
      <Card 
        className="h-full border transition-all flex flex-col"
        style={{
          borderColor: isOver && canDrop ? color : '#E5E7EB',
          background: isOver && canDrop ? '#F9FAFB' : '#FFFFFF',
          opacity: isOver && !canDrop ? 0.5 : 1
        }}
      >
        {/* Header de Columna */}
        <div 
          className={`${isMobile ? 'p-3' : 'p-4'} border-b sticky top-0 z-10 bg-gray-50 flex-shrink-0`}
        >
          <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-1">
                <div 
                  className={`${isMobile ? 'p-1.5' : 'p-2'} rounded-lg bg-white border border-gray-200`}
                >
                  {icono}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-black ${isMobile ? 'text-xs' : 'text-sm'} text-gray-800`}>
                    {etapa}
                  </h3>
                  {diasEstimados && (
                    <p className="text-[10px] text-gray-500 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {diasEstimados} días
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className={`font-semibold ${isMobile ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'} bg-white border border-gray-200 text-gray-700`}
                >
                  {itemsFiltrados.length}
                </Badge>
                {/* Botón colapsar */}
                {onToggleColapso && (
                  <button
                    onClick={onToggleColapso}
                    className="p-1.5 rounded-lg hover:bg-white transition-colors"
                    title={`Colapsar ${etapa}`}
                  >
                    <Minimize2 className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                )}
              </div>
            </div>

            {/* Indicador de Noticias en Recepción */}
            {etapa === 'Recepción' && noticias.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                <FileText className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-orange-600`} />
                <span className={`${isMobile ? 'text-xs' : 'text-xs'} font-bold text-orange-600`}>
                {noticias.length} {noticias.length === 1 ? 'noticia' : 'noticias'}
              </span>
            </div>
          )}
        </div>

        {/* Lista de Items */}
        <div 
          className={`${isMobile ? 'p-2' : 'p-3'} space-y-3 overflow-y-auto flex-1`} 
          style={{ maxHeight: isMobile ? 'calc(100vh - 380px)' : 'calc(100vh - 280px)' }}
        >
          {/* Renderizar Noticias primero */}
          {noticias.map((noticia) => (
            <TarjetaNoticia
              key={noticia.id}
              noticia={noticia}
              onConvertir={onConvertirNoticia}
              onDevolver={onDevolverNoticia}
              onDevolverCompetencia={onDevolverCompetencia}
              onArchivar={onArchivarNoticia}
              onVerDetalles={onVerDetallesNoticia}
              onAsociarNoticiaProceso={onAsociarNoticiaProceso} // ✅ NUEVO
              onVerProcesoAsociado={onVerProcesoAsociado} // ✅ NUEVO
              onEditarNoticia={onEditarNoticia} // ✅ NUEVO: Editar noticia
              vistaCompacta={vistaCompacta}
              isMobile={isMobile}
              colapsada={tarjetasColapsadas?.has(noticia.id)}
              onToggleColapso={() => onToggleColapsoTarjeta?.(noticia.id)}
              etapa={etapa} // ✅ NUEVO: Pasar etapa para condicionales
            />
          ))}

          {/* Separador */}
          {noticias.length > 0 && procesos.length > 0 && (
            <div className="flex items-center gap-2 py-2">
              <div className="flex-1 h-px bg-gray-300" />
              <span className="text-xs font-bold text-gray-500">PROCESOS</span>
              <div className="flex-1 h-px bg-gray-300" />
            </div>
          )}

          {/* Renderizar Procesos */}
          {procesos.map((proceso) => (
            <TarjetaProceso
              key={proceso.id}
              proceso={proceso}
              onVerDetalles={onVerDetalles}
              onAprobarBorrador={onAprobarBorrador}
              onVerExpediente={onVerExpediente}
              onGestionAutos={onGestionAutos}
              onGestionEvidencias={onGestionEvidencias}
              onGestionOficios={onGestionOficios}
              onGestionActas={onGestionActas}
              onComentarios={onComentarios}
              onSolicitarReasignacion={onSolicitarReasignacion} // ✅ NUEVO: Solicitar reasignación
              onAsociarProcesoProceso={onAsociarProcesoProceso} // ✅ NUEVO: Asociar proceso a otro proceso
              onEditarProceso={onEditarProceso} // ✅ NUEVO: Editar proceso (reemplaza Ver Detalles)
              noticiasAsociadas={getNoticiasAsociadas(proceso.id)} // ✅ NUEVO: Noticias asociadas a este proceso
              onVerNoticiaAsociada={onVerNoticiaAsociada} // ✅ NUEVO: Handler para ver noticia
              vistaCompacta={vistaCompacta}
              isMobile={isMobile}
              colapsada={tarjetasColapsadas?.has(proceso.id)}
              onToggleColapso={() => onToggleColapsoTarjeta?.(proceso.id)}
            />
          ))}

          {/* Empty State */}
          {itemsFiltrados.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <FolderOpen className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} mx-auto mb-3 opacity-30`} />
              <p className="text-xs font-semibold">
                {etapa === 'Recepción' ? 'Sin items' : 'Sin procesos'}
              </p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================
export function DashboardKanbanOperativo({ 
  onNavigateToExpediente,
  filtroProfesionalId 
}: { 
  onNavigateToExpediente?: () => void;
  filtroProfesionalId?: string | null;
}) {
  // ✅ NUEVO: Hook responsive centralizado
  const { isMobile, isTablet, isDesktop, width } = useResponsive();
  
  const [items, setItems] = useState<Item[]>([...NOTICIAS_MOCK, ...PROCESOS_MOCK]);
  const [modalActivo, setModalActivo] = useState<ModalType>(null);
  const [itemSeleccionado, setItemSeleccionado] = useState<any>(null);
  const [tipoVista, setTipoVista] = useState<'kanban' | 'lista'>('kanban');
  const [vistaCompacta, setVistaCompacta] = useState(false);
  const [columnasColapsadas, setColumnasColapsadas] = useState<Set<string>>(new Set());
  const [tarjetasColapsadas, setTarjetasColapsadas] = useState<Set<string>>(new Set()); // NUEVO: Estado para tarjetas colapsadas
  
  // ✅ NUEVO: Estado para editar noticias y procesos (usa el mismo modal)
  const [noticiaAEditar, setNoticiaAEditar] = useState<Noticia | null>(null);
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);

  // Estados para formularios
  const [formNuevaNoticia, setFormNuevaNoticia] = useState({
    denunciado: '',
    hechos: '',
    origen: 'Denuncia Ciudadana',
    prioridad: 'media' as 'alta' | 'media' | 'baja'
  });

  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [areaDestinoRemision, setAreaDestinoRemision] = useState('');
  
  // ✅ NUEVO: Estado para entidades de remisión configuradas
  const [entidadesRemision, setEntidadesRemision] = useState<Array<{id: string, nombre: string, correo: string, activo: boolean}>>([]);
  
  // ✅ NUEVO: Estado para solicitudes de reasignación pendientes
  const [solicitudesReasignacion, setSolicitudesReasignacion] = useState<any[]>([]);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<any>(null);
  
  // ✅ ELIMINADO: Estados y handlers de Generar Auto - Ya cubierto con funciones maduras
  // const [plantillasAutos, setPlantillasAutos] = useState<PlantillaAuto[]>([]);
  // const [modalGenerarAuto, setModalGenerarAuto] = useState(false);
  // const [procesoParaAuto, setProcesoParaAuto] = useState<Proceso | null>(null);

  // ✅ ELIMINADO: Carga de plantillas desde localStorage
  // useEffect(() => {
  //   try {
  //     const configString = localStorage.getItem('disciplinario-configuracion');
  //     if (configString) {
  //       const config = JSON.parse(configString);
  //       if (config.plantillasAutos) {
  //         setPlantillasAutos(config.plantillasAutos);
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Error al cargar plantillas de autos:', error);
  //   }
  // }, []);

  // ✅ NUEVO: Cargar entidades de remisión desde localStorage
  useEffect(() => {
    try {
      const configString = localStorage.getItem('disciplinario-configuracion');
      if (configString) {
        const config = JSON.parse(configString);
        if (config.entidadesRemision) {
          // Filtrar solo las entidades activas
          setEntidadesRemision(config.entidadesRemision.filter((e: any) => e.activo));
        }
      }
    } catch (error) {
      console.error('Error al cargar entidades de remisión:', error);
    }
  }, []);

  // ✅ Auto-activar vista compacta en mobile y tablet
  useEffect(() => {
    if (width < 1024) {
      setVistaCompacta(true);
    } else {
      setVistaCompacta(false);
    }
  }, [width]);

  // Detectar touch para usar TouchBackend
  const isTouchDevice = () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  };

  const etapas = [
    { nombre: 'Recepción', color: '#6B7280', icono: <FileCheck className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} />, diasEstimados: 3 },
    { nombre: 'Valoración', color: '#6B7280', icono: <Eye className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} />, diasEstimados: 10 },
    { nombre: 'Indagación', color: '#6B7280', icono: <Search className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} />, diasEstimados: 40 },
    { nombre: 'Investigación', color: '#003DA5', icono: <Scale className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} style={{ color: '#003DA5' }} />, diasEstimados: 60 },
    { nombre: 'Juzgamiento', color: '#6B7280', icono: <AlertTriangle className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} />, diasEstimados: 50 },
    { nombre: 'Fallo', color: '#6B7280', icono: <CheckCircle className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} />, diasEstimados: 10 }
  ];

  // ==================== HANDLERS ====================
  const handleDropItem = (item: Item, nuevaEtapa: string) => {
    if (item.tipo === 'noticia') {
      if (nuevaEtapa !== 'Recepción') {
        toast.error('Las noticias solo pueden estar en Recepción', {
          description: 'Usa "Convertir a Proceso"'
        });
        return;
      }
    } else if (item.tipo === 'proceso') {
      if (item.etapaActual !== nuevaEtapa) {
        const etapaAnterior = item.etapaActual;
        
        // ✅ NUEVO: Interceptar transición Recepción → Valoración para asignar profesional
        if (etapaAnterior === 'Recepción' && nuevaEtapa === 'Valoración') {
          setItemSeleccionado(item);
          setModalActivo('asignar-profesional');
          return; // No continuar con el movimiento hasta que se asigne el profesional
        }
        
        const usuario = 'Usuario Actual'; // En producción vendría del contexto de autenticación
        
        setItems(prev => prev.map(i => 
          i.id === item.id && i.tipo === 'proceso'
            ? { 
                ...i, 
                etapaActual: nuevaEtapa as any,
                ultimaModificacion: new Date()
              }
            : i
        ));
        
        // Registrar en trazabilidad/historial
        const eventoTrazabilidad = {
          id: `evt-${Date.now()}`,
          tipo: 'cambio-estado' as const,
          titulo: `Cambio de etapa: ${etapaAnterior} → ${nuevaEtapa}`,
          descripcion: `El proceso fue movido de "${etapaAnterior}" a "${nuevaEtapa}" mediante arrastrar y soltar`,
          usuario: usuario,
          fecha: new Date(),
          procesoId: item.id,
          etapaAnterior: etapaAnterior,
          etapaNueva: nuevaEtapa
        };
        
        // En producción, esto se guardaría en el backend
        console.log('📋 Trazabilidad - Movimiento de proceso:', eventoTrazabilidad);
        
        toast.success('Proceso Movido', {
          description: `${item.numeroProceso} → ${nuevaEtapa} (registrado en trazabilidad)`
        });
      }
    }
  };

  const handleCrearNoticia = (data: any) => {
    const nuevaNoticia: Noticia = {
      id: `n${Date.now()}`,
      numero: `ND-2025-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
      fechaRecepcion: new Date().toISOString().split('T')[0],
      origen: data.origen || 'Denuncia Ciudadana',
      denunciado: data.denunciado?.nombre || '',
      hechos: data.descripcionHechos || '',
      estado: 'pendiente',
      prioridad: 'media',
      diasPendientes: 0,
      tipo: 'noticia'
    };

    setItems(prev => [...prev, nuevaNoticia]);
    toast.success('Noticia Creada', {
      description: `${nuevaNoticia.numero} en Recepción`
    });
    setModalActivo(null);
  };

  const handleConvertirNoticia = (noticia: Noticia) => {
    setItemSeleccionado(noticia);
    setProfesionalSeleccionado('');
    setObservaciones('');
    setModalActivo('convertir-proceso');
  };

  // ✅ NUEVO: Función para editar noticia
  const handleEditarNoticia = (noticia: Noticia) => {
    setNoticiaAEditar(noticia);
    setMostrarModalEditar(true);
  };

  // ✅ NUEVO: Función para guardar edición de noticia
  const handleGuardarEdicion = (data: any) => {
    if (!noticiaAEditar) return;

    // Determinar si es noticia o proceso
    const itemOriginal = items.find(item => item.id === noticiaAEditar.id);
    const esProceso = itemOriginal?.tipo === 'proceso';

    // Actualizar la noticia o proceso en el estado
    setItems(prevItems => prevItems.map(item => {
      if (item.id === noticiaAEditar.id && esProceso) {
        // Actualizar proceso - MISMOS CAMPOS EN TODOS LOS ESTADOS
        return {
          ...item,
          denunciado: data.denunciado ? {
            nombre: data.denunciado.nombre || 'Sin nombre',
            tipoIdentificacion: 'CC' as const,
            numeroIdentificacion: data.denunciado.identificacion || 'Sin identificación'
          } : 'Sin información',
          hechos: data.hechosSeparados?.map((h: any, idx: number) => 
            `Hecho ${idx + 1}: ${h.descripcion}`
          ).join('\\n\\n') || data.descripcionHechos,
          hechosSeparados: data.hechosSeparados,
          conductasSeleccionadas: data.conductasSeleccionadas,
          cargo: data.denunciado?.cargo,
          dependencia: data.denunciado?.dependencia,
          territorial: data.territorial
        };
      }
      if (item.tipo === 'noticia' && item.id === noticiaAEditar.id) {
        return {
          ...item,
          origen: data.origen,
          fechaRecepcion: data.fechaQueja,
          fechaHechos: data.fechaHechos,
          territorial: data.territorial,
          denunciado: data.denunciado ? {
            nombre: data.denunciado.nombre || 'Sin nombre',
            tipoIdentificacion: 'CC' as const,
            numeroIdentificacion: data.denunciado.identificacion || 'Sin identificación'
          } : 'Sin información',
          hechos: data.hechosSeparados?.map((h: any, idx: number) => 
            `Hecho ${idx + 1}: ${h.descripcion}`
          ).join('\n\n') || data.descripcionHechos,
          hechosSeparados: data.hechosSeparados,
          conductasSeleccionadas: data.conductasSeleccionadas,
          cargo: data.denunciado.cargo,
          dependencia: data.denunciado.dependencia
        };
      }
      return item;
    }));

    setMostrarModalEditar(false);
    setNoticiaAEditar(null);
    
    toast.success(esProceso ? 'Proceso actualizado' : 'Noticia actualizada', {
      description: 'La información ha sido actualizada exitosamente'
    });
  };

  // ✅ NUEVO: Función para editar proceso - USA EL MISMO WIZARD EN TODOS LOS ESTADOS
  const handleEditarProceso = (proceso: Proceso) => {
    // Convertir el proceso a formato de noticia para el wizard
    const noticiaDesdeProceso: Noticia = {
      id: proceso.id,
      numero: proceso.numeroProceso,
      fechaRecepcion: proceso.fechaCreacion,
      origen: 'Proceso Disciplinario',
      denunciante: proceso.denunciante,
      denunciado: proceso.denunciado,
      hechos: proceso.hechos || '',
      estado: 'en-valoracion',
      prioridad: 'media',
      diasPendientes: proceso.diasRestantes,
      tipo: 'noticia',
      cargo: proceso.cargo,
      dependencia: proceso.dependencia,
      territorial: proceso.territorial,
      hechosSeparados: proceso.hechosSeparados,
      conductasSeleccionadas: proceso.conductasSeleccionadas
    };
    
    setNoticiaAEditar(noticiaDesdeProceso);
    setMostrarModalEditar(true);
  };

  const handleConfirmarConversion = () => {
    if (!profesionalSeleccionado) {
      toast.error('Error', { description: 'Selecciona un profesional' });
      return;
    }

    const nuevoProceso: Proceso = {
      id: `p${Date.now()}`,
      numeroProceso: `PD-2025-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
      noticiaOrigen: itemSeleccionado.numero,
      denunciado: itemSeleccionado.denunciado,
      cedula: '00000000',
      etapaActual: 'Recepción',
      estadoActual: 'En Gestión',
      profesionalAsignado: profesionalSeleccionado,
      semaforo: 'verde',
      diasRestantes: 30,
      porcentajeTiempo: 0,
      borradores: [],
      documentos: [],
      pendienteAprobacion: false,
      ultimaActuacion: 'Noticia convertida',
      fechaCreacion: new Date().toISOString().split('T')[0],
      tipo: 'proceso'
    };

    setItems(prev => [
      ...prev.filter(i => i.id !== itemSeleccionado.id),
      nuevoProceso
    ]);
    
    toast.success('Proceso Creado', {
      description: `${nuevoProceso.numeroProceso} → ${profesionalSeleccionado}`
    });

    setModalActivo(null);
    setItemSeleccionado(null);
  };

  const handleDevolverNoticia = (noticia: Noticia) => {
    setItemSeleccionado(noticia);
    setObservaciones('');
    setModalActivo('devolver-noticia');
  };

  const handleConfirmarDevolucion = () => {
    toast.info('Noticia Devuelta', {
      description: itemSeleccionado.numero
    });
    setItems(prev => prev.filter(i => i.id !== itemSeleccionado.id));
    setModalActivo(null);
    setItemSeleccionado(null);
  };

  const handleDevolverCompetencia = (noticia: Noticia) => {
    setItemSeleccionado(noticia);
    setObservaciones('');
    setAreaDestinoRemision('');
    setModalActivo('devolver-competencia');
  };

  const handleConfirmarDevolucionCompetencia = () => {
    // Validar que se haya seleccionado un área
    if (!areaDestinoRemision) {
      toast.error('Error de Validación', {
        description: 'Debes seleccionar el área/entidad de destino'
      });
      return;
    }

    if (!observaciones.trim()) {
      toast.error('Error de Validación', {
        description: 'Debes escribir la justificación de la remisión'
      });
      return;
    }

    // Generar nuevo número RC (Remisión por Competencia)
    const año = new Date().getFullYear();
    const numeroRC = `RC-${año}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`;
    
    // ✅ Obtener nombre y correo de la entidad configurada
    const entidadSeleccionada = entidadesRemision.find(e => e.id === areaDestinoRemision);
    const nombreArea = entidadSeleccionada?.nombre || areaDestinoRemision;
    const correoArea = entidadSeleccionada?.correo || '';
    
    toast.success('Remitido por Competencia', {
      description: correoArea 
        ? `${itemSeleccionado.numero} → ${numeroRC}\nEntidad: ${nombreArea}\nCorreo: ${correoArea}`
        : `${itemSeleccionado.numero} → ${numeroRC} (${nombreArea})`
    });
    
    // Remover la noticia del listado (ya que fue remitida a otra área)
    setItems(prev => prev.filter(i => i.id !== itemSeleccionado.id));
    setModalActivo(null);
    setItemSeleccionado(null);
    setAreaDestinoRemision('');
    setObservaciones('');
  };

  const handleArchivarNoticia = (noticia: Noticia) => {
    setItemSeleccionado(noticia);
    setModalActivo('archivar-noticia');
  };

  const handleConfirmarArchivo = () => {
    setItems(prev => prev.filter(i => i.id !== itemSeleccionado.id));
    toast.success('Noticia Archivada', {
      description: itemSeleccionado.numero
    });
    setModalActivo(null);
    setItemSeleccionado(null);
  };

  // ✅ NUEVO: Handler para asignar profesional en transición Recepción → Valoración
  const handleAsignarProfesional = (profesionalId: string, profesionalNombre: string, observaciones: string) => {
    if (!itemSeleccionado) return;

    const usuario = 'Usuario Actual'; // En producción vendría del contexto de autenticación
    
    // Actualizar el proceso con el profesional asignado y moverlo a Valoración
    setItems(prev => prev.map(i => 
      i.id === itemSeleccionado.id && i.tipo === 'proceso'
        ? { 
            ...i, 
            etapaActual: 'Valoración' as any,
            profesionalAsignado: {
              nombre: profesionalNombre,
              tipoIdentificacion: 'CC' as const,
              numeroIdentificacion: profesionalId
            },
            profesionalAsignadoId: profesionalId,
            ultimaActuacion: `Asignado a ${profesionalNombre}`,
            ultimaModificacion: new Date()
          }
        : i
    ));
    
    // Registrar en trazabilidad
    const eventoTrazabilidad = {
      id: `evt-${Date.now()}`,
      tipo: 'asignacion-profesional' as const,
      titulo: `Proceso asignado a ${profesionalNombre}`,
      descripcion: `El proceso fue movido de "Recepción" a "Valoración" y asignado al profesional ${profesionalNombre}. ${observaciones ? `Observaciones: ${observaciones}` : ''}`,
      usuario: usuario,
      fecha: new Date(),
      procesoId: itemSeleccionado.id,
      profesionalAsignado: profesionalNombre,
      observaciones: observaciones
    };
    
    console.log('📋 Trazabilidad - Asignación de profesional:', eventoTrazabilidad);
    
    toast.success('Profesional Asignado', {
      description: `${itemSeleccionado.numeroProceso} → ${profesionalNombre} (Valoración)`
    });
    
    setModalActivo(null);
    setItemSeleccionado(null);
  };

  // ✅ NUEVO: Handler para solicitar reasignación (estados posteriores a Recepción)
  const handleSolicitarReasignacion = (proceso: Proceso) => {
    // Validar que el proceso no esté en Recepción
    if (proceso.etapaActual === 'Recepción') {
      toast.error('No se puede reasignar', {
        description: 'Los procesos en Recepción se asignan directamente sin autorización'
      });
      return;
    }
    
    setItemSeleccionado(proceso);
    setModalActivo('solicitar-reasignacion');
  };

  const handleConfirmarSolicitudReasignacion = (profesionalId: string, profesionalNombre: string, justificacion: string, prioridad: 'urgente' | 'normal') => {
    if (!itemSeleccionado) return;

    const usuario = 'Usuario Actual'; // En producción vendría del contexto de autenticación
    
    // Crear solicitud de reasignación
    const nuevaSolicitud = {
      id: `sol-${Date.now()}`,
      procesoNumero: itemSeleccionado.numeroProceso,
      procesoId: itemSeleccionado.id,
      etapaActual: itemSeleccionado.etapaActual,
      profesionalActual: {
        nombre: itemSeleccionado.profesionalAsignado ? (typeof itemSeleccionado.profesionalAsignado === 'string' ? itemSeleccionado.profesionalAsignado : itemSeleccionado.profesionalAsignado.nombre) : 'Sin asignar',
        id: itemSeleccionado.profesionalAsignadoId || '0'
      },
      profesionalNuevo: {
        nombre: profesionalNombre,
        id: profesionalId,
        cargo: 'Profesional Especializado', // En producción vendría de la BD
        especialidad: 'Derecho Disciplinario', // En producción vendría de la BD
        cargaActual: '8/12' // En producción vendría de la BD
      },
      solicitadoPor: usuario,
      fechaSolicitud: new Date().toISOString(),
      justificacion: justificacion,
      prioridad: prioridad,
      denunciado: itemSeleccionado.denunciado ? (typeof itemSeleccionado.denunciado === 'string' ? itemSeleccionado.denunciado : itemSeleccionado.denunciado.nombre) : 'Sin información',
      estado: 'pendiente' as const
    };

    setSolicitudesReasignacion(prev => [...prev, nuevaSolicitud]);

    // Registrar en trazabilidad
    const eventoTrazabilidad = {
      id: `evt-${Date.now()}`,
      tipo: 'solicitud-reasignacion' as const,
      titulo: `Solicitud de reasignación a ${profesionalNombre}`,
      descripcion: `Se solicitó la reasignación del proceso desde ${itemSeleccionado.profesionalAsignado ? (typeof itemSeleccionado.profesionalAsignado === 'string' ? itemSeleccionado.profesionalAsignado : itemSeleccionado.profesionalAsignado.nombre) : 'Sin asignar'} hacia ${profesionalNombre}. Justificación: ${justificacion}`,
      usuario: usuario,
      fecha: new Date(),
      procesoId: itemSeleccionado.id,
      prioridad: prioridad
    };

    console.log('📋 Trazabilidad - Solicitud de reasignación:', eventoTrazabilidad);

    toast.success('Solicitud Enviada al Jefe OCID', {
      description: `Reasignación de ${itemSeleccionado.numeroProceso} a ${profesionalNombre} (${prioridad === 'urgente' ? 'URGENTE' : 'Normal'})`
    });

    setModalActivo(null);
    setItemSeleccionado(null);
  };

  // ✅ NUEVO: Handler para aprobar reasignación (Jefe OCID)
  const handleAprobarReasignacion = (solicitudId: string, observaciones: string) => {
    const solicitud = solicitudesReasignacion.find(s => s.id === solicitudId);
    if (!solicitud) return;

    const usuario = 'Jefe OCID'; // En producción vendría del contexto de autenticación

    // Actualizar el proceso con el nuevo profesional asignado
    setItems(prev => prev.map(i => 
      i.id === solicitud.procesoId && i.tipo === 'proceso'
        ? { 
            ...i, 
            profesionalAsignado: {
              nombre: solicitud.profesionalNuevo.nombre,
              tipoIdentificacion: 'CC' as const,
              numeroIdentificacion: solicitud.profesionalNuevo.id
            },
            profesionalAsignadoId: solicitud.profesionalNuevo.id,
            ultimaActuacion: `Reasignado a ${solicitud.profesionalNuevo.nombre}`,
            ultimaModificacion: new Date()
          }
        : i
    ));

    // Marcar solicitud como aprobada
    setSolicitudesReasignacion(prev => prev.map(s => 
      s.id === solicitudId 
        ? { ...s, estado: 'aprobada' as const, fechaResolucion: new Date().toISOString(), observacionesJefe: observaciones }
        : s
    ));

    // Registrar en trazabilidad
    const eventoTrazabilidad = {
      id: `evt-${Date.now()}`,
      tipo: 'aprobacion-reasignacion' as const,
      titulo: `Reasignación aprobada por Jefe OCID`,
      descripcion: `El proceso fue reasignado de ${solicitud.profesionalActual.nombre} a ${solicitud.profesionalNuevo.nombre}. ${observaciones ? `Observaciones: ${observaciones}` : ''}`,
      usuario: usuario,
      fecha: new Date(),
      procesoId: solicitud.procesoId,
      solicitudId: solicitudId
    };

    console.log('📋 Trazabilidad - Aprobación de reasignación:', eventoTrazabilidad);

    toast.success('Reasignación Aprobada', {
      description: `${solicitud.procesoNumero} → ${solicitud.profesionalNuevo.nombre}`
    });

    setModalActivo(null);
    setSolicitudSeleccionada(null);
  };

  const handleRechazarReasignacion = (solicitudId: string, motivoRechazo: string) => {
    const solicitud = solicitudesReasignacion.find(s => s.id === solicitudId);
    if (!solicitud) return;

    const usuario = 'Jefe OCID'; // En producción vendría del contexto de autenticación

    // Marcar solicitud como rechazada
    setSolicitudesReasignacion(prev => prev.map(s => 
      s.id === solicitudId 
        ? { ...s, estado: 'rechazada' as const, fechaResolucion: new Date().toISOString(), motivoRechazo: motivoRechazo }
        : s
    ));

    // Registrar en trazabilidad
    const eventoTrazabilidad = {
      id: `evt-${Date.now()}`,
      tipo: 'rechazo-reasignacion' as const,
      titulo: `Solicitud de reasignación rechazada`,
      descripcion: `El Jefe de OCID rechazó la solicitud de reasignación del proceso ${solicitud.procesoNumero}. Motivo: ${motivoRechazo}`,
      usuario: usuario,
      fecha: new Date(),
      procesoId: solicitud.procesoId,
      solicitudId: solicitudId
    };

    console.log('📋 Trazabilidad - Rechazo de reasignación:', eventoTrazabilidad);

    toast.info('Solicitud Rechazada', {
      description: `${solicitud.procesoNumero} permanece con ${solicitud.profesionalActual.nombre}`
    });

    setModalActivo(null);
    setSolicitudSeleccionada(null);
  };

  // ✅ NUEVO: Handler para asociar noticia a proceso
  const handleAsociarNoticiaProceso = (noticia: Noticia) => {
    setItemSeleccionado(noticia);
    setModalActivo('asociar-noticia-proceso');
  };

  const handleConfirmarAsociacion = (noticiaId: string, procesoId: string, justificacion: string) => {
    // Encontrar proceso y noticia
    const proceso = items.find(i => i.id === procesoId && i.tipo === 'proceso') as Proceso;
    const noticia = items.find(i => i.id === noticiaId && i.tipo === 'noticia') as Noticia;

    if (!proceso || !noticia) {
      toast.error('Error al asociar noticia');
      return;
    }

    // En una implementación real, aquí se haría:
    // 1. POST a /api/noticias/:noticiaId/asociar-proceso
    // 2. Body: { procesoId, justificacion }
    // 3. Se registra en historial del proceso
    // 4. Se marca la noticia como asociada

    console.log('Asociación registrada:', {
      noticiaId,
      noticiaNumero: noticia.numero,
      procesoId,
      procesoNumero: proceso.numeroProceso,
      justificacion,
      timestamp: new Date().toISOString()
    });

    // ✅ Actualizar la noticia con información del proceso asociado
    setItems(prev => prev.map(item => {
      if (item.id === noticiaId && item.tipo === 'noticia') {
        return {
          ...item,
          procesoAsociado: {
            id: procesoId,
            numeroProceso: proceso.numeroProceso,
            fechaAsociacion: new Date().toISOString(),
            justificacion: justificacion
          }
        } as Noticia;
      }
      return item;
    }));

    // Cerrar modal
    setModalActivo(null);
    setItemSeleccionado(null);
  };

  // ✅ NUEVO: Handler para ver proceso asociado
  const handleVerProcesoAsociado = (procesoId: string) => {
    const proceso = items.find(i => i.id === procesoId && i.tipo === 'proceso') as Proceso;
    
    if (proceso) {
      // Scroll hasta el proceso en el tablero (si está visible)
      const procesoElement = document.getElementById(`proceso-${procesoId}`);
      if (procesoElement) {
        procesoElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight temporal
        procesoElement.classList.add('ring-4', 'ring-purple-500', 'ring-opacity-50');
        setTimeout(() => {
          procesoElement.classList.remove('ring-4', 'ring-purple-500', 'ring-opacity-50');
        }, 2000);
      }
      
      // Abrir modal de detalles del proceso
      setItemSeleccionado(proceso);
      setModalActivo('ver-detalles');
      
      toast.info('Navegando al proceso asociado', {
        description: proceso.numeroProceso
      });
    } else {
      toast.error('Proceso no encontrado en el tablero actual');
    }
  };

  const handleVerDetallesNoticia = (noticia: Noticia) => {
    setItemSeleccionado(noticia);
    setModalActivo('ver-detalles');
  };

  // ✅ NUEVO: Handler para ver noticia asociada desde el proceso
  const handleVerNoticiaAsociada = (noticia: Noticia) => {
    // Scroll hasta la noticia (si está visible)
    const noticiaElement = document.getElementById(`noticia-${noticia.id}`);
    if (noticiaElement) {
      noticiaElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Highlight temporal (2 segundos)
      noticiaElement.classList.add('ring-4', 'ring-purple-500', 'ring-opacity-50');
      setTimeout(() => {
        noticiaElement.classList.remove('ring-4', 'ring-purple-500', 'ring-opacity-50');
      }, 2000);
    }
    
    // Abrir modal de detalles de la noticia
    setItemSeleccionado(noticia);
    setModalActivo('ver-detalles');
    
    toast.info('Navegando a noticia asociada', {
      description: noticia.numero
    });
  };

  const handleVerDetalles = (proceso: Proceso) => {
    setItemSeleccionado(proceso);
    setModalActivo('ver-detalles');
  };

  // ✅ NUEVO: Handler para asociar proceso a proceso (estados post-Recepción)
  const handleAsociarProcesoProceso = (proceso: Proceso) => {
    // Validar que el proceso no esté en Recepción
    if (proceso.etapaActual === 'Recepción') {
      toast.error('No disponible en Recepción', {
        description: 'La asociación de procesos solo está disponible desde Valoración en adelante'
      });
      return;
    }
    
    setItemSeleccionado(proceso);
    setModalActivo('asociar-proceso-proceso');
  };

  const handleConfirmarAsociacionProcesoProceso = (procesoOrigenId: string, procesoDestinoId: string, justificacion: string, tipoAsociacion: 'conexo' | 'similar' | 'consolidado') => {
    if (!itemSeleccionado) return;

    const usuario = 'Usuario Actual'; // En producción vendría del contexto de autenticación
    const procesoOrigen = items.find(i => i.id === procesoOrigenId && i.tipo === 'proceso') as Proceso;
    const procesoDestino = items.find(i => i.id === procesoDestinoId && i.tipo === 'proceso') as Proceso;

    if (!procesoOrigen || !procesoDestino) {
      toast.error('Error', { description: 'No se encontraron los procesos para asociar' });
      return;
    }

    // Registrar en trazabilidad
    const eventoTrazabilidad = {
      id: `evt-${Date.now()}`,
      tipo: 'asociacion-proceso-proceso' as const,
      titulo: `Proceso asociado a otro proceso (${tipoAsociacion})`,
      descripcion: `El proceso ${procesoOrigen.numeroProceso} fue asociado al proceso ${procesoDestino.numeroProceso}. Tipo: ${tipoAsociacion}. Justificación: ${justificacion}`,
      usuario: usuario,
      fecha: new Date(),
      procesoOrigenId: procesoOrigenId,
      procesoDestinoId: procesoDestinoId,
      tipoAsociacion: tipoAsociacion,
      justificacion: justificacion
    };

    console.log('📋 Trazabilidad - Asociación proceso-proceso:', eventoTrazabilidad);

    toast.success('Procesos Asociados Exitosamente', {
      description: `${procesoOrigen.numeroProceso} ↔ ${procesoDestino.numeroProceso} (${tipoAsociacion})`
    });

    // Cerrar modal
    setModalActivo(null);
    setItemSeleccionado(null);
  };

  // ==================== FUNCIÓN HELPER: OBTENER DOCUMENTOS PENDIENTES ====================
  const obtenerDocumentosPendientes = (proceso: Proceso) => {
    // En producción, esto vendría del proceso.borradores
    // Por ahora, generamos mock basado en la etapa
    const documentosMock = [];
    
    if (proceso.etapaActual === 'Valoración' || proceso.etapaActual === 'Indagación') {
      documentosMock.push({
        id: 'doc-1',
        tipo: 'auto' as const,
        titulo: 'Auto de Apertura de Indagación Preliminar',
        descripcion: 'Auto que ordena la apertura de indagación preliminar para verificar competencia y procedencia del proceso disciplinario.',
        creadoPor: proceso.profesionalAsignado ? (typeof proceso.profesionalAsignado === 'string' ? proceso.profesionalAsignado : proceso.profesionalAsignado.nombre) : 'Sin asignar',
        fechaCreacion: new Date().toLocaleDateString('es-CO'),
        etapaRelacionada: proceso.etapaActual,
        contenido: `<div class="document-preview">
          <h3>AUTO No. ${proceso.numeroProceso}-AI-001</h3>
          <p><strong>DESPACHO:</strong> Oficina de Control Interno Disciplinario - ESAP</p>
          <p><strong>ASUNTO:</strong> Apertura de Indagación Preliminar</p>
          <br/>
          <p>El Jefe de la Oficina de Control Interno Disciplinario, en uso de sus facultades legales y reglamentarias, 
          especialmente las conferidas por la Ley 734 de 2002,</p>
          <br/>
          <p><strong>CONSIDERANDO:</strong></p>
          <p>Que se recibió noticia disciplinaria con radicado ${proceso.numeroProceso}, sobre presuntas irregularidades...</p>
          <br/>
          <p><strong>RESUELVE:</strong></p>
          <p>ARTÍCULO PRIMERO: Abrir indagación preliminar...</p>
        </div>`
      });
    }

    if (proceso.etapaActual === 'Indagación' || proceso.etapaActual === 'Investigación') {
      documentosMock.push({
        id: 'doc-2',
        tipo: 'auto' as const,
        titulo: 'Auto de Apertura de Investigación Disciplinaria',
        descripcion: 'Auto que ordena la apertura formal de investigación disciplinaria tras encontrar mérito suficiente en la indagación preliminar.',
        creadoPor: proceso.profesionalAsignado ? (typeof proceso.profesionalAsignado === 'string' ? proceso.profesionalAsignado : proceso.profesionalAsignado.nombre) : 'Sin asignar',
        fechaCreacion: new Date().toLocaleDateString('es-CO'),
        etapaRelacionada: 'Investigación',
        contenido: `<div class="document-preview">
          <h3>AUTO No. ${proceso.numeroProceso}-AI-002</h3>
          <p><strong>APERTURA DE INVESTIGACIÓN FORMAL</strong></p>
          <br/>
          <p>Tras valorar las pruebas recaudadas en la etapa de indagación preliminar, se encuentra mérito suficiente 
          para continuar con investigación formal...</p>
        </div>`
      });
    }

    if (proceso.etapaActual === 'Investigación') {
      documentosMock.push({
        id: 'doc-3',
        tipo: 'auto' as const,
        titulo: 'Pliego de Cargos',
        descripcion: 'Auto de formulación de cargos disciplinarios contra el denunciado, con calificación provisional de la falta.',
        creadoPor: proceso.profesionalAsignado ? (typeof proceso.profesionalAsignado === 'string' ? proceso.profesionalAsignado : proceso.profesionalAsignado.nombre) : 'Sin asignar',
        fechaCreacion: new Date().toLocaleDateString('es-CO'),
        etapaRelacionada: 'Juzgamiento',
        contenido: `<div class="document-preview">
          <h3>AUTO DE FORMULACIÓN DE CARGOS</h3>
          <p><strong>Proceso No.:</strong> ${proceso.numeroProceso}</p>
          <p><strong>Investigado:</strong> ${proceso.denunciado ? (typeof proceso.denunciado === 'string' ? proceso.denunciado : proceso.denunciado.nombre) : 'Sin información'}</p>
          <br/>
          <p><strong>HECHOS PROBADOS:</strong></p>
          <p>1. El día... se presentó la siguiente situación...</p>
          <br/>
          <p><strong>CALIFICACIÓN PROVISIONAL:</strong> Falta Gravísima</p>
        </div>`
      });

      documentosMock.push({
        id: 'doc-4',
        tipo: 'oficio' as const,
        titulo: 'Oficio de Citación a Audiencia',
        descripcion: 'Oficio citando al investigado a audiencia de formulación de cargos.',
        creadoPor: proceso.profesionalAsignado ? (typeof proceso.profesionalAsignado === 'string' ? proceso.profesionalAsignado : proceso.profesionalAsignado.nombre) : 'Sin asignar',
        fechaCreacion: new Date().toLocaleDateString('es-CO'),
        etapaRelacionada: 'Juzgamiento',
        contenido: `<div class="document-preview">
          <h3>OFICIO No. ${proceso.numeroProceso}-OFC-001</h3>
          <p>Señor(a): ${proceso.denunciado.nombre}</p>
          <p>ASUNTO: Citación a audiencia de formulación de cargos</p>
          <br/>
          <p>Me permito citarle a la audiencia que se llevará a cabo el día...</p>
        </div>`
      });
    }

    if (proceso.etapaActual === 'Juzgamiento') {
      documentosMock.push({
        id: 'doc-5',
        tipo: 'acta' as const,
        titulo: 'Acta de Audiencia de Descargos',
        descripcion: 'Acta que registra el desarrollo de la audiencia en la que el investigado presentó sus descargos.',
        creadoPor: proceso.profesionalAsignado ? (typeof proceso.profesionalAsignado === 'string' ? proceso.profesionalAsignado : proceso.profesionalAsignado.nombre) : 'Sin asignar',
        fechaCreacion: new Date().toLocaleDateString('es-CO'),
        etapaRelacionada: 'Juzgamiento',
        contenido: `<div class="document-preview">
          <h3>ACTA No. ${proceso.numeroProceso}-ACTA-001</h3>
          <p><strong>AUDIENCIA DE DESCARGOS</strong></p>
          <p>Fecha: ${new Date().toLocaleDateString('es-CO')}</p>
          <br/>
          <p>Siendo las 10:00 a.m., se dio inicio a la audiencia de descargos...</p>
        </div>`
      });
    }

    return documentosMock;
  };

  const handleAprobarBorrador = (proceso: Proceso) => {
    setItemSeleccionado(proceso);
    setModalActivo('aprobar-borrador');
  };

  // ✅ REFACTORIZADO: Handler de aprobación con comentarios (nuevo modal)
  const handleConfirmarAprobacion = (comentarios: string) => {
    if (!itemSeleccionado || itemSeleccionado.tipo !== 'proceso') return;
    
    setItems(prev => prev.map(i =>
      i.id === itemSeleccionado.id && i.tipo === 'proceso'
        ? { 
            ...i, 
            pendienteAprobacion: false,
            documentosAprobados: [...(i.documentosAprobados || []), {
              id: `doc-${Date.now()}`,
              titulo: `Auto de ${i.etapaActual}`,
              fecha: new Date().toISOString(),
              comentariosJefe: comentarios,
              estado: 'aprobado'
            }]
          }
        : i
    ));
    
    toast.success('Documento Aprobado', {
      description: `${itemSeleccionado.numeroProceso} - Documento aprobado exitosamente`
    });
    
    setModalActivo(null);
    setItemSeleccionado(null);
  };

  // ✅ NUEVO: Handler de devolución de documentos
  const handleDevolverDocumento = (motivo: string, comentarios: string, archivos: File[]) => {
    if (!itemSeleccionado || itemSeleccionado.tipo !== 'proceso') return;
    
    toast.warning('Documento Devuelto', {
      description: `El documento ha sido devuelto al profesional para correcciones`
    });
    
    setModalActivo(null);
    setItemSeleccionado(null);
  };

  const handleVerExpediente = (proceso: Proceso) => {
    if (onNavigateToExpediente) {
      onNavigateToExpediente();
      toast.success('Navegando a Expediente Electrónico', {
        description: `Abriendo expediente del proceso ${proceso.numeroProceso}`
      });
    } else {
      toast.info('Expediente', {
        description: proceso.numeroProceso
      });
    }
  };

  const handleGestionAutos = (proceso: Proceso) => {
    setItemSeleccionado(proceso);
    setModalActivo('gestion-autos');
  };

  // ✅ ELIMINADO: Handlers de generación de autos - Ya cubierto con funciones maduras
  // const handleGenerarAutoContextual = (proceso: Proceso) => {
  //   setProcesoParaAuto(proceso);
  //   setModalGenerarAuto(true);
  // };

  // const handleGenerarDocumento = (plantillaId: string, datosCompletos: any) => {
  //   ... código de generación eliminado
  // };

  const handleGestionEvidencias = (proceso: Proceso) => {
    setItemSeleccionado(proceso);
    setModalActivo('gestion-evidencias');
  };

  const handleGestionOficios = (proceso: Proceso) => {
    setItemSeleccionado(proceso);
    setModalActivo('gestion-oficios');
  };

  const handleGestionActas = (proceso: Proceso) => {
    setItemSeleccionado(proceso);
    setModalActivo('gestion-actas');
  };

  const handleComentarios = (proceso: Proceso) => {
    setItemSeleccionado(proceso);
    setModalActivo('comentarios-proceso');
  };

  // Toggle colapsar/expandir columna
  const toggleColumnaColapsada = (nombreEtapa: string) => {
    setColumnasColapsadas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nombreEtapa)) {
        newSet.delete(nombreEtapa);
      } else {
        newSet.add(nombreEtapa);
      }
      return newSet;
    });
  };

  // Colapsar/Expandir todas las columnas
  const toggleTodasColumnas = () => {
    if (columnasColapsadas.size > 0) {
      // Si hay columnas colapsadas, expandir todas
      setColumnasColapsadas(new Set());
      toast.success('Columnas expandidas', {
        description: 'Todas las columnas ahora están visibles'
      });
    } else {
      // Si todas están expandidas, colapsar todas
      const todasLasEtapas = etapas.map(e => e.nombre);
      setColumnasColapsadas(new Set(todasLasEtapas));
      toast.success('Columnas colapsadas', {
        description: 'Espacio optimizado en el tablero'
      });
    }
  };

  // ==================== FUNCIONES PARA COLAPSAR/EXPANDIR TARJETAS ====================
  
  // Toggle colapso de tarjeta individual
  const toggleTarjetaColapsada = (id: string) => {
    setTarjetasColapsadas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Colapsar todas las tarjetas
  const colapsarTodasTarjetas = () => {
    const todasLasIds = items.map(item => item.id);
    setTarjetasColapsadas(new Set(todasLasIds));
    toast.success('Tarjetas colapsadas', {
      description: 'Todas las tarjetas ahora muestran vista compacta'
    });
  };

  // Expandir todas las tarjetas
  const expandirTodasTarjetas = () => {
    setTarjetasColapsadas(new Set());
    toast.success('Tarjetas expandidas', {
      description: 'Todas las tarjetas ahora muestran información completa'
    });
  };

  // Calcular estadísticas
  const noticias = items.filter(i => i.tipo === 'noticia') as Noticia[];
  const procesos = items.filter(i => i.tipo === 'proceso') as Proceso[];
  const procesosPendientesAprobacion = procesos.filter(p => p.pendienteAprobacion).length;
  const procesosEnTermino = procesos.filter(p => p.semaforo === 'verde').length;

  // Filtrar por profesional si está activo el filtro
  const itemsFiltrados = filtroProfesionalId 
    ? items.filter(item => {
        if (item.tipo === 'proceso') {
          return (item as Proceso).profesionalAsignadoId === filtroProfesionalId;
        }
        return false; // No mostrar noticias cuando hay filtro de profesional
      })
    : items;

  // Obtener nombre del profesional filtrado
  const profesionalFiltrado = filtroProfesionalId ? (() => {
    const profesionales = [
      { id: '1', nombre: 'Juan Pérez Rodríguez' },
      { id: '2', nombre: 'María Torres Gómez' },
      { id: '3', nombre: 'Carlos Mendoza Silva' },
      { id: '4', nombre: 'Ana González López' }
    ];
    return profesionales.find(p => p.id === filtroProfesionalId);
  })() : null;

  // ==================== RENDER ====================
  return (
    <DndProvider backend={isTouchDevice() ? TouchBackend : HTML5Backend}>
      <div className="space-y-3 md:space-y-4">
        {/* Banner de Filtro Activo por Profesional */}
        {filtroProfesionalId && profesionalFiltrado && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl border-2 flex items-center justify-between gap-3"
            style={{ background: '#E0EDFF', borderColor: '#003DA5' }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: '#003DA5' }}>
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: '#003DA5' }}>
                  Filtrado por Profesional
                </p>
                <p className="text-xs" style={{ color: '#003DA5' }}>
                  Mostrando solo los procesos de: <span className="font-bold">{profesionalFiltrado.nombre}</span>
                </p>
              </div>
            </div>
            <Badge
              className="font-bold px-3 py-1"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              {itemsFiltrados.length} proceso{itemsFiltrados.length !== 1 ? 's' : ''}
            </Badge>
          </motion.div>
        )}

        {/* Header Responsive Mejorado */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex-1">
            <h2 
              className="font-black leading-tight"
              style={{ 
                color: '#003DA5',
                fontSize: isMobile ? '1.25rem' : isTablet ? '1.375rem' : '1.5rem'
              }}
            >
              {isMobile ? 'Kanban Operativo' : 'Tablero Kanban Operativo'}
            </h2>
            {!isMobile && (
              <p className="text-sm text-gray-600 mt-0.5">
                Gestión visual del flujo disciplinario
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Toggle de Vista - Solo Desktop y Tablet */}
            {!isMobile && (
              <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: '#F3F4F6' }}>
                <button
                  onClick={() => setTipoVista('kanban')}
                  className={`${isTablet ? 'px-2 py-1.5' : 'px-3 py-2'} rounded-md text-sm font-semibold flex items-center gap-1.5 transition-all ${
                    tipoVista === 'kanban'
                      ? 'bg-white shadow-sm' 
                      : 'hover:bg-gray-200'
                  }`}
                  style={{ 
                    color: tipoVista === 'kanban' ? '#003DA5' : '#6B7280'
                  }}
                >
                  <Columns3 className={`${isTablet ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                  {!isTablet && 'Kanban'}
                </button>
                <button
                  onClick={() => setTipoVista('lista')}
                  className={`${isTablet ? 'px-2 py-1.5' : 'px-3 py-2'} rounded-md text-sm font-semibold flex items-center gap-1.5 transition-all ${
                    tipoVista === 'lista'
                      ? 'bg-white shadow-sm' 
                      : 'hover:bg-gray-200'
                  }`}
                  style={{ 
                    color: tipoVista === 'lista' ? '#003DA5' : '#6B7280'
                  }}
                >
                  <List className={`${isTablet ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                  {!isTablet && 'Lista'}
                </button>
              </div>
            )}
            
            {/* Toggle de Vista Mobile */}
            {isMobile && (
              <button
                onClick={() => setTipoVista(tipoVista === 'kanban' ? 'lista' : 'kanban')}
                className="px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all"
                style={{ 
                  background: '#F3F4F6',
                  color: '#003DA5'
                }}
              >
                {tipoVista === 'kanban' ? (
                  <>
                    <List className="w-4 h-4" />
                    Lista
                  </>
                ) : (
                  <>
                    <Columns3 className="w-4 h-4" />
                    Kanban
                  </>
                )}
              </button>
            )}

            {/* Botón Expandir/Colapsar Todo - Solo en vista Kanban */}
            {tipoVista === 'kanban' && !isMobile && (
              <button
                onClick={toggleTodasColumnas}
                className="px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all hover:bg-gray-100 border-2 border-gray-300 hover:border-blue-400"
                style={{ color: '#003DA5' }}
                title={columnasColapsadas.size > 0 ? 'Expandir todas las columnas' : 'Colapsar todas las columnas'}
              >
                {columnasColapsadas.size > 0 ? (
                  <>
                    <Maximize2 className="w-4 h-4" />
                    {!isTablet && 'Expandir'}
                  </>
                ) : (
                  <>
                    <Minimize2 className="w-4 h-4" />
                    {!isTablet && 'Colapsar'}
                  </>
                )}
              </button>
            )}

            {/* BOTONES COLAPSAR/EXPANDIR TODAS LAS TARJETAS */}
            {tipoVista === 'kanban' && !isMobile && (
              <div className="flex items-center gap-2">
                <button
                  onClick={colapsarTodasTarjetas}
                  className="px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all hover:bg-blue-50 border-2 border-blue-300 hover:border-blue-500"
                  style={{ color: '#1e5da8' }}
                  title="Colapsar todas las tarjetas"
                >
                  <ChevronsDown className="w-4 h-4" />
                  {!isTablet && <span>Colapsar Todas</span>}
                </button>
                <button
                  onClick={expandirTodasTarjetas}
                  className="px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all hover:bg-green-50 border-2 border-green-300 hover:border-green-500"
                  style={{ color: '#059669' }}
                  title="Expandir todas las tarjetas"
                >
                  <ChevronsUp className="w-4 h-4" />
                  {!isTablet && <span>Expandir Todas</span>}
                </button>
              </div>
            )}

            <Button
              onClick={() => setModalActivo('crear-noticia')}
              size="sm"
              className={`bg-orange-600 hover:bg-orange-700 text-white font-bold ${isMobile ? 'flex-1 sm:flex-none' : ''}`}
            >
              <Plus className={`${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'} mr-1.5`} />
              {isMobile ? 'Nueva' : 'Nueva Noticia'}
            </Button>
          </div>
        </div>

        {/* Estadísticas Responsive Mejoradas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
          <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
            <div className={`flex items-center ${isMobile ? 'gap-2 p-2.5' : 'gap-3 p-3'}`}>
              <div 
                className={`${isMobile ? 'p-2' : 'p-2.5'} rounded-lg bg-orange-50 flex-shrink-0`}
              >
                <FileText className={`${isMobile ? 'w-4 h-4' : isTablet ? 'w-4.5 h-4.5' : 'w-5 h-5'} text-orange-600`} />
              </div>
              <div className="min-w-0">
                <p 
                  className="font-black text-gray-900 leading-none"
                  style={{ fontSize: isMobile ? '1.5rem' : isTablet ? '1.625rem' : '1.75rem' }}
                >
                  {noticias.length}
                </p>
                <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-500 mt-0.5`}>
                  Noticias
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
            <div className={`flex items-center ${isMobile ? 'gap-2 p-2.5' : 'gap-3 p-3'}`}>
              <div 
                className={`${isMobile ? 'p-2' : 'p-2.5'} rounded-lg flex-shrink-0`}
                style={{ background: '#E0EDFF' }}
              >
                <FolderOpen className={`${isMobile ? 'w-4 h-4' : isTablet ? 'w-4.5 h-4.5' : 'w-5 h-5'}`} style={{ color: '#003DA5' }} />
              </div>
              <div className="min-w-0">
                <p 
                  className="font-black text-gray-900 leading-none"
                  style={{ fontSize: isMobile ? '1.5rem' : isTablet ? '1.625rem' : '1.75rem' }}
                >
                  {procesos.length}
                </p>
                <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-500 mt-0.5`}>
                  Procesos
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
            <div className={`flex items-center ${isMobile ? 'gap-2 p-2.5' : 'gap-3 p-3'}`}>
              <div 
                className={`${isMobile ? 'p-2' : 'p-2.5'} rounded-lg bg-red-50 flex-shrink-0`}
              >
                <AlertCircle className={`${isMobile ? 'w-4 h-4' : isTablet ? 'w-4.5 h-4.5' : 'w-5 h-5'} text-red-600`} />
              </div>
              <div className="min-w-0">
                <p 
                  className="font-black text-gray-900 leading-none"
                  style={{ fontSize: isMobile ? '1.5rem' : isTablet ? '1.625rem' : '1.75rem' }}
                >
                  {procesosPendientesAprobacion}
                </p>
                <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-500 mt-0.5 truncate`}>
                  {isMobile ? 'Pendientes' : 'Pendientes'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
            <div className={`flex items-center ${isMobile ? 'gap-2 p-2.5' : 'gap-3 p-3'}`}>
              <div 
                className={`${isMobile ? 'p-2' : 'p-2.5'} rounded-lg bg-green-50 flex-shrink-0`}
              >
                <CheckCircle className={`${isMobile ? 'w-4 h-4' : isTablet ? 'w-4.5 h-4.5' : 'w-5 h-5'} text-green-600`} />
              </div>
              <div className="min-w-0">
                <p 
                  className="font-black text-gray-900 leading-none"
                  style={{ fontSize: isMobile ? '1.5rem' : isTablet ? '1.625rem' : '1.75rem' }}
                >
                  {procesosEnTermino}
                </p>
                <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-500 mt-0.5 truncate`}>
                  {isMobile ? 'En término' : 'En Término'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Vista Kanban o Lista según selección */}
        {tipoVista === 'kanban' ? (
          <div className="flex-1 overflow-hidden">
            {/* Contenedor con scroll horizontal SIMPLE Y FUNCIONAL */}
            <div 
              className="h-full overflow-x-auto overflow-y-hidden pb-4"
              style={{
                overflowX: 'auto',
                overflowY: 'hidden',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'thin',
                scrollbarColor: '#CBD5E0 #F7FAFC',
              }}
            >
              {/* Flex container de columnas con padding derecho para scroll completo */}
              <div 
                className="inline-flex gap-4 h-full" 
                style={{ 
                  // Cálculo explícito del ancho mínimo:
                  // 6 columnas × 320px + 5 gaps × 16px + padding 32px = 2032px
                  minWidth: isMobile 
                    ? `${etapas.length * 100}vw` 
                    : isTablet 
                      ? `${(etapas.length * 340) + ((etapas.length - 1) * 16) + 32}px`
                      : `${(etapas.length * 320) + ((etapas.length - 1) * 16) + 32}px`,
                  paddingLeft: '1rem',
                  paddingRight: '1rem',
                }}
              >
                {etapas.map((etapa) => (
                  <div
                    key={etapa.nombre}
                    className="flex-shrink-0"
                    style={{
                      width: isMobile ? 'calc(100vw - 32px)' : isTablet ? '340px' : '320px',
                      minWidth: isMobile ? 'calc(100vw - 32px)' : isTablet ? '340px' : '320px',
                    }}
                  >
                    <ColumnaKanban
                      etapa={etapa.nombre}
                      items={itemsFiltrados}
                      color={etapa.color}
                      icono={etapa.icono}
                      diasEstimados={etapa.diasEstimados}
                      onDrop={handleDropItem}
                      onConvertirNoticia={handleConvertirNoticia}
                      onDevolverNoticia={handleDevolverNoticia}
                      onDevolverCompetencia={handleDevolverCompetencia}
                      onArchivarNoticia={handleArchivarNoticia}
                      onVerDetallesNoticia={handleVerDetallesNoticia}
                      onAsociarNoticiaProceso={handleAsociarNoticiaProceso}
                      onVerProcesoAsociado={handleVerProcesoAsociado}
                      onVerNoticiaAsociada={handleVerNoticiaAsociada}
                      onEditarNoticia={handleEditarNoticia}
                      onVerDetalles={handleVerDetalles}
                      onAprobarBorrador={handleAprobarBorrador}
                      onVerExpediente={handleVerExpediente}
                      onGestionAutos={handleGestionAutos}
                      onGestionEvidencias={handleGestionEvidencias}
                      onGestionOficios={handleGestionOficios}
                      onGestionActas={handleGestionActas}
                      onComentarios={handleComentarios}
                      onSolicitarReasignacion={handleSolicitarReasignacion}
                      onAsociarProcesoProceso={handleAsociarProcesoProceso} // ✅ NUEVO: Asociar proceso a proceso
                      onEditarProceso={handleEditarProceso} // ✅ NUEVO: Editar proceso
                      vistaCompacta={vistaCompacta}
                      isMobile={isMobile}
                      colapsada={columnasColapsadas.has(etapa.nombre)}
                      onToggleColapso={() => toggleColumnaColapsada(etapa.nombre)}
                      tarjetasColapsadas={tarjetasColapsadas}
                      onToggleColapsoTarjeta={toggleTarjetaColapsada}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <VistaLista
            items={itemsFiltrados}
            onVerDetalles={handleVerDetalles}
            onAprobarBorrador={handleAprobarBorrador}
            onVerExpediente={handleVerExpediente}
            onGestionAutos={handleGestionAutos}
            onGestionEvidencias={handleGestionEvidencias}
            onGestionOficios={handleGestionOficios}
            onGestionActas={handleGestionActas}
            onComentarios={handleComentarios}
            onSolicitarReasignacion={handleSolicitarReasignacion}
            onAsociarProcesoProceso={handleAsociarProcesoProceso} // ✅ NUEVO: Asociar proceso a proceso
            onConvertirNoticia={handleConvertirNoticia}
            onArchivarNoticia={handleArchivarNoticia}
            onVerDetallesNoticia={(noticia) => {
              setItemSeleccionado(noticia);
              setModalActivo('ver-detalles');
            }}
            onDevolverNoticia={handleDevolverNoticia}
            onDevolverCompetencia={handleDevolverCompetencia}
            onAsociarNoticiaProceso={handleAsociarNoticiaProceso}
            onVerProcesoAsociado={handleVerProcesoAsociado}
            onVerNoticiaAsociada={handleVerNoticiaAsociada}
            onEditarNoticia={handleEditarNoticia}
            onEditarProceso={handleEditarProceso} // ✅ NUEVO: Editar proceso
            isMobile={isMobile}
          />
        )}

        {/* MODALES - (mantener igual pero responsive) */}
        <AnimatePresence>
          {modalActivo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-start justify-center pt-16 sm:pt-20 z-[150] p-4"
              onClick={() => setModalActivo(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className={`bg-white rounded-2xl ${isMobile ? 'p-4' : 'p-6'} ${isMobile ? 'max-w-full mx-2' : 'max-w-lg'} w-full shadow-2xl max-h-[90vh] overflow-y-auto`}
                style={{
                  maxWidth: isMobile ? 'calc(100vw - 2rem)' : '32rem'
                }}
              >
                {/* Modal: Crear Noticia */}
                {modalActivo === 'crear-noticia' && (
                  <CreateNoticiaModal
                    onClose={() => setModalActivo(null)}
                    onSave={handleCrearNoticia}
                  />
                )}

                {/* Modal: Convertir a Proceso */}
                {modalActivo === 'convertir-proceso' && itemSeleccionado && (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-100">
                          <PlusCircle className="w-6 h-6" style={{ color: '#003DA5' }} />
                        </div>
                        <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-black`} style={{ color: '#003DA5' }}>
                          Convertir a Proceso
                        </h3>
                      </div>
                      <button
                        onClick={() => setModalActivo(null)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <X className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-orange-50 rounded-xl border-2 border-orange-200">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-orange-600" />
                          <p className="text-sm font-bold text-orange-700">
                            {itemSeleccionado.numero}
                          </p>
                        </div>
                        <p className="font-bold text-gray-900 mb-1">
                          {itemSeleccionado.denunciado.nombre}
                        </p>
                        <p className="text-xs text-gray-600 mb-2">
                          {itemSeleccionado.denunciado.tipoIdentificacion} {itemSeleccionado.denunciado.numeroIdentificacion}
                        </p>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {itemSeleccionado.hechos}
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-bold text-gray-700 mb-2 block">
                          Profesional *
                        </label>
                        <select
                          value={profesionalSeleccionado}
                          onChange={(e) => setProfesionalSeleccionado(e.target.value)}
                          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Seleccionar...</option>
                          {PROFESIONALES.map((prof) => (
                            <option key={prof} value={prof}>{prof}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-bold text-gray-700 mb-2 block">
                          Observaciones
                        </label>
                        <textarea
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          placeholder="Observaciones..."
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <Button
                        onClick={() => setModalActivo(null)}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleConfirmarConversion}
                        className="flex-1 font-bold"
                        style={{ background: '#003DA5', color: '#FFFFFF' }}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Crear
                      </Button>
                    </div>
                  </>
                )}

                {/* Modal: Devolver Noticia */}
                {modalActivo === 'devolver-noticia' && itemSeleccionado && (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-yellow-100">
                          <ArrowLeft className="w-6 h-6 text-yellow-600" />
                        </div>
                        <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-black text-gray-900`}>
                          Devolver Noticia
                        </h3>
                      </div>
                      <button onClick={() => setModalActivo(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-yellow-50 rounded-xl border-2 border-yellow-200">
                        <p className="text-sm font-bold mb-1">{itemSeleccionado.numero}</p>
                        <p className="text-sm text-gray-700">{itemSeleccionado.denunciado.nombre}</p>
                        <p className="text-xs text-gray-600">
                          {itemSeleccionado.denunciado.tipoIdentificacion} {itemSeleccionado.denunciado.numeroIdentificacion}
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-bold text-gray-700 mb-2 block">
                          Motivo de Devolución *
                        </label>
                        <textarea
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={4}
                          placeholder="Explica el motivo de la devolución..."
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <Button onClick={() => setModalActivo(null)} variant="outline" className="flex-1">
                        Cancelar
                      </Button>
                      <Button onClick={handleConfirmarDevolucion} className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white">
                        Devolver
                      </Button>
                    </div>
                  </>
                )}

                {/* Modal: Devolver por Competencia */}
                {modalActivo === 'devolver-competencia' && itemSeleccionado && (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-purple-100">
                          <Send className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-black text-gray-900`}>
                          Remitir por Competencia
                        </h3>
                      </div>
                      <button onClick={() => setModalActivo(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
                        <p className="text-sm font-bold mb-1 text-purple-900">{itemSeleccionado.numero}</p>
                        <p className="text-sm text-gray-700">{itemSeleccionado.denunciado.nombre}</p>
                        <p className="text-xs text-gray-600">
                          {itemSeleccionado.denunciado.tipoIdentificacion} {itemSeleccionado.denunciado.numeroIdentificacion}
                        </p>
                      </div>

                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-start gap-2">
                          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-blue-900 mb-1">Remisión por Competencia</p>
                            <p className="text-xs text-blue-700">
                              Esta noticia no es competencia del área de Control Interno Disciplinario. 
                              Se generará un nuevo número RC (Remisión por Competencia) y se remitirá al área correspondiente.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-bold text-gray-700 mb-2 block">
                          Área/Entidad de Destino *
                        </label>
                        <select
                          value={areaDestinoRemision}
                          onChange={(e) => setAreaDestinoRemision(e.target.value)}
                          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                        >
                          <option value="">Seleccionar área/entidad...</option>
                          {entidadesRemision.length > 0 ? (
                            entidadesRemision.map((entidad) => (
                              <option key={entidad.id} value={entidad.id}>
                                {entidad.nombre}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="personeria">Personería Municipal</option>
                              <option value="contraloria">Contraloría</option>
                              <option value="procuraduria">Procuraduría</option>
                              <option value="fiscalia">Fiscalía General de la Nación</option>
                            </>
                          )}
                        </select>
                        {entidadesRemision.length === 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            💡 Configura entidades personalizadas en <span className="font-bold">Configuración → Entidades de Remisión</span>
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-sm font-bold text-gray-700 mb-2 block">
                          Justificación de la Remisión *
                        </label>
                        <textarea
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          rows={4}
                          placeholder="Explica por qué esta noticia no corresponde a Control Interno Disciplinario y debe ser remitida..."
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <Button onClick={() => setModalActivo(null)} variant="outline" className="flex-1">
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleConfirmarDevolucionCompetencia} 
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Remitir
                      </Button>
                    </div>
                  </>
                )}

                {/* Modal: Archivar Noticia - REEMPLAZADO POR COMPONENTE MODAL COMPLETO */}

                {/* Modal: Ver Detalles del Proceso - COMPLETO CON EDITOR */}
                {modalActivo === 'ver-detalles' && itemSeleccionado && (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-100">
                          <Eye className="w-6 h-6" style={{ color: '#003DA5' }} />
                        </div>
                        <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-black`} style={{ color: '#003DA5' }}>
                          {itemSeleccionado.tipo === 'noticia' ? 'Detalles de la Noticia' : 'Detalles del Proceso'}
                        </h3>
                      </div>
                      <button onClick={() => setModalActivo(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>

                    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                      {/* VISTA PARA NOTICIAS */}
                      {itemSeleccionado.tipo === 'noticia' && (
                        <>
                          {/* Información de la Noticia */}
                          <div className="p-4 bg-orange-50 rounded-xl border-2 border-orange-200">
                            <h4 className="font-bold text-orange-900 mb-2">{(itemSeleccionado as Noticia).numero}</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-gray-600">Origen:</p>
                                <p className="font-bold text-gray-900">{(itemSeleccionado as Noticia).origen}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Fecha Recepción:</p>
                                <p className="font-bold text-gray-900">{new Date((itemSeleccionado as Noticia).fechaRecepcion).toLocaleDateString('es-CO')}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Estado:</p>
                                <p className="font-bold text-gray-900 capitalize">{(itemSeleccionado as Noticia).estado.replace('-', ' ')}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Prioridad:</p>
                                <p className={`font-bold ${
                                  (itemSeleccionado as Noticia).prioridad === 'alta' ? 'text-red-600' :
                                  (itemSeleccionado as Noticia).prioridad === 'media' ? 'text-orange-600' : 'text-gray-600'
                                } capitalize`}>{(itemSeleccionado as Noticia).prioridad}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Días Pendientes:</p>
                                <p className="font-bold text-orange-600">{(itemSeleccionado as Noticia).diasPendientes} días</p>
                              </div>
                            </div>
                          </div>

                          {/* Denunciante */}
                          <div>
                            <h5 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                              👤 DENUNCIANTE
                            </h5>
                            <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                              <p className="font-bold text-gray-900">{(itemSeleccionado as Noticia).denunciante.nombre}</p>
                              <p className="text-sm text-gray-600">
                                <span className="font-semibold">{(itemSeleccionado as Noticia).denunciante.tipoIdentificacion}:</span> {(itemSeleccionado as Noticia).denunciante.numeroIdentificacion}
                              </p>
                            </div>
                          </div>

                          {/* Denunciado */}
                          <div>
                            <h5 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                              ⚠️ DENUNCIADO
                            </h5>
                            <div className="p-3 bg-red-50 rounded-lg border border-red-200 space-y-1">
                              <p className="font-bold text-gray-900">{(itemSeleccionado as Noticia).denunciado.nombre}</p>
                              <p className="text-sm text-gray-600">
                                <span className="font-semibold">{(itemSeleccionado as Noticia).denunciado.tipoIdentificacion}:</span> {(itemSeleccionado as Noticia).denunciado.numeroIdentificacion}
                              </p>
                            </div>
                          </div>

                          {/* Hechos */}
                          <div>
                            <h5 className="text-sm font-bold text-gray-700 mb-2">HECHOS</h5>
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-700">{(itemSeleccionado as Noticia).hechos}</p>
                            </div>
                          </div>
                        </>
                      )}

                      {/* VISTA PARA PROCESOS */}
                      {itemSeleccionado.tipo === 'proceso' && (
                        <>
                          {/* Información del Proceso */}
                          <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                            <h4 className="font-bold text-blue-900 mb-2"> {(itemSeleccionado as Proceso).numeroProceso}</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-gray-600">Noticia Origen:</p>
                                <p className="font-bold text-gray-900"> {(itemSeleccionado as Proceso).noticiaOrigen}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Etapa:</p>
                                <p className="font-bold text-gray-900"> {(itemSeleccionado as Proceso).etapaActual}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Días Restantes:</p>
                                <p className="font-bold text-gray-900"> {(itemSeleccionado as Proceso).diasRestantes}d</p>
                              </div>
                            </div>
                          </div>

                          {/* Denunciante */}
                          <div>
                            <h5 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                              👤 DENUNCIANTE
                            </h5>
                            <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                              <p className="font-bold text-gray-900">{(itemSeleccionado as Proceso).denunciante.nombre}</p>
                              <p className="text-sm text-gray-600">
                                <span className="font-semibold">{(itemSeleccionado as Proceso).denunciante.tipoIdentificacion}:</span> {(itemSeleccionado as Proceso).denunciante.numeroIdentificacion}
                              </p>
                            </div>
                          </div>

                          {/* Denunciado */}
                          <div>
                            <h5 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                              ⚠️ DENUNCIADO
                            </h5>
                            <div className="p-3 bg-red-50 rounded-lg border border-red-200 space-y-1">
                              <p className="font-bold text-gray-900 mb-1"> {(itemSeleccionado as Proceso).denunciado.nombre}</p>
                              <p className="text-sm text-gray-600">
                                <span className="font-semibold">{(itemSeleccionado as Proceso).denunciado.tipoIdentificacion}:</span> {(itemSeleccionado as Proceso).denunciado.numeroIdentificacion}
                              </p>
                            </div>
                          </div>

                          {/* Profesional Asignado */}
                          <div>
                            <h5 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                              👨‍💼 PROFESIONAL ASIGNADO
                            </h5>
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-1">
                              <p className="font-bold text-gray-900">
                                {(itemSeleccionado as Proceso).profesionalAsignado 
                                  ? (typeof (itemSeleccionado as Proceso).profesionalAsignado === 'string' 
                                      ? (itemSeleccionado as Proceso).profesionalAsignado 
                                      : (itemSeleccionado as Proceso).profesionalAsignado.nombre)
                                  : 'Sin asignar'}
                              </p>
                              {typeof (itemSeleccionado as Proceso).profesionalAsignado !== 'string' && (itemSeleccionado as Proceso).profesionalAsignado && (
                                <p className="text-sm text-gray-600">
                                  <span className="font-semibold">{(itemSeleccionado as Proceso).profesionalAsignado.tipoIdentificacion}:</span> {(itemSeleccionado as Proceso).profesionalAsignado.numeroIdentificacion}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* NUEVA SECCIÓN: Gestión Documental - SOLO PROCESOS */}
                          <div>
                            <h5 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                              <FileSignature className="w-4 h-4" style={{ color: '#003DA5' }} />
                              GESTIÓN DOCUMENTAL
                            </h5>
                        <div className="grid grid-cols-2 gap-2">
                          {/* Autos */}
                          <Button
                            onClick={() => {
                              setModalActivo('gestion-autos');
                            }}
                            size="sm"
                            variant="outline"
                            className="w-full justify-start"
                          >
                            <Scale className="w-3.5 h-3.5 mr-2" style={{ color: '#8B5CF6' }} />
                            <div className="text-left">
                              <p className="text-xs font-bold">Autos</p>
                              <p className="text-xs text-gray-500">Providencias</p>
                            </div>
                          </Button>

                          {/* Evidencias */}
                          <Button
                            onClick={() => {
                              setModalActivo('gestion-evidencias');
                            }}
                            size="sm"
                            variant="outline"
                            className="w-full justify-start"
                          >
                            <Archive className="w-3.5 h-3.5 mr-2" style={{ color: '#F59E0B' }} />
                            <div className="text-left">
                              <p className="text-xs font-bold">Evidencias</p>
                              <p className="text-xs text-gray-500">Pruebas</p>
                            </div>
                          </Button>

                          {/* Oficios */}
                          <Button
                            onClick={() => {
                              setModalActivo('gestion-oficios');
                            }}
                            size="sm"
                            variant="outline"
                            className="w-full justify-start"
                          >
                            <Mail className="w-3.5 h-3.5 mr-2" style={{ color: '#06B6D4' }} />
                            <div className="text-left">
                              <p className="text-xs font-bold">Oficios</p>
                              <p className="text-xs text-gray-500">Comunicaciones</p>
                            </div>
                          </Button>

                          {/* Notificaciones */}
                          <Button
                            onClick={() => {
                              toast.info('Notificaciones', {
                                description: 'Gestionar notificaciones del proceso'
                              });
                            }}
                            size="sm"
                            variant="outline"
                            className="w-full justify-start"
                          >
                            <Bell className="w-3.5 h-3.5 mr-2" style={{ color: '#10B981' }} />
                            <div className="text-left">
                              <p className="text-xs font-bold">Notificaciones</p>
                              <p className="text-xs text-gray-500">Avisos</p>
                            </div>
                          </Button>

                          {/* Actas */}
                          <Button
                            onClick={() => {
                              setModalActivo('gestion-actas');
                            }}
                            size="sm"
                            variant="outline"
                            className="w-full justify-start"
                          >
                            <FileCheck className="w-3.5 h-3.5 mr-2" style={{ color: '#DC2626' }} />
                            <div className="text-left">
                              <p className="text-xs font-bold">Actas</p>
                              <p className="text-xs text-gray-500">Diligencias</p>
                            </div>
                          </Button>

                          {/* Historial */}
                          <Button
                            onClick={() => {
                              setModalActivo('historial-auditoria');
                            }}
                            size="sm"
                            variant="outline"
                            className="w-full justify-start"
                          >
                            <History className="w-3.5 h-3.5 mr-2" style={{ color: '#6B7280' }} />
                            <div className="text-left">
                              <p className="text-xs font-bold">Historial</p>
                              <p className="text-xs text-gray-500">Auditoría</p>
                            </div>
                          </Button>
                        </div>
                      </div>

                      {/* Acciones Rápidas */}
                      <div>
                        <h5 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                          <Settings className="w-4 h-4" style={{ color: '#003DA5' }} />
                          ACCIONES RÁPIDAS
                        </h5>
                        <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => {
                            setModalActivo('editor-documentos');
                          }}
                          size="sm"
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-2" />
                          Editor
                        </Button>
                        <Button
                          onClick={() => {
                            setModalActivo('subir-documentos');
                          }}
                          size="sm"
                          className="w-full" style={{ background: '#003DA5', color: '#FFFFFF' }}
                        >
                          <Upload className="w-3.5 h-3.5 mr-2" />
                          Subir Docs
                        </Button>
                      </div>
                      </div>

                          {/* Métricas - SOLO PROCESOS */}
                          <div>
                            <h5 className="text-sm font-bold text-gray-700 mb-2">ESTADÍSTICAS</h5>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="p-3 bg-purple-50 rounded-lg text-center">
                                <p className="text-2xl font-black text-purple-700"> {(itemSeleccionado as Proceso).borradores?.length || 0}</p>
                                <p className="text-xs text-gray-600">Borradores</p>
                              </div>
                              <div className="p-3 bg-blue-50 rounded-lg text-center">
                                <p className="text-2xl font-black text-blue-700"> {(itemSeleccionado as Proceso).documentos?.length || 0}</p>
                                <p className="text-xs text-gray-600">Documentos</p>
                              </div>
                              <div className="p-3 bg-green-50 rounded-lg text-center">
                                <p className="text-2xl font-black text-green-700"> {(itemSeleccionado as Proceso).porcentajeTiempo}%</p>
                                <p className="text-xs text-gray-600">Tiempo</p>
                              </div>
                            </div>
                          </div>

                          {/* Última Actuación - SOLO PROCESOS */}
                          <div>
                            <h5 className="text-sm font-bold text-gray-700 mb-2">ÚLTIMA ACTUACIÓN</h5>
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-700"> {(itemSeleccionado as Proceso).ultimaActuacion}</p>
                              <p className="text-xs text-gray-500 mt-1"> {(itemSeleccionado as Proceso).fechaCreacion}</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Botones Finales */}
                    <div className="flex gap-2 mt-4">
                      <Button onClick={() => setModalActivo(null)} variant="outline" className="flex-1">
                        Cerrar
                      </Button>
                      {itemSeleccionado.tipo === 'proceso' && (
                        <Button 
                          onClick={() => handleVerExpediente(itemSeleccionado as Proceso)} 
                          className="flex-1"
                          style={{ background: '#8B5CF6', color: '#FFFFFF' }}
                        >
                          <Archive className="w-4 h-4 mr-2" />
                          Expediente Completo
                        </Button>
                      )}
                      {itemSeleccionado.tipo === 'noticia' && (
                        <Button 
                          onClick={() => {
                            setModalActivo(null);
                            handleConvertirNoticia(itemSeleccionado as Noticia);
                          }} 
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                          <PlusCircle className="w-4 h-4 mr-2" />
                          Convertir a Proceso
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODALES DE GESTIÓN DOCUMENTAL */}
        <AnimatePresence>
          {modalActivo === 'gestion-autos' && itemSeleccionado && (
            <WizardCrearAutoWorldClass
              proceso={itemSeleccionado}
              onClose={() => setModalActivo(null)}
              onAutoCreado={() => {
                toast.success('Auto creado exitosamente', {
                  description: 'El auto ha sido generado y guardado correctamente'
                });
              }}
            />
          )}

          {modalActivo === 'gestion-evidencias' && itemSeleccionado && (
            <ModalGestionEvidencias
              proceso={itemSeleccionado}
              onClose={() => setModalActivo(null)}
              onSubirEvidencia={() => {
                toast.success('Evidencias subidas', {
                  description: 'Archivos cargados exitosamente al expediente'
                });
                setModalActivo(null);
              }}
            />
          )}

          {modalActivo === 'gestion-oficios' && itemSeleccionado && (
            <WizardOficiosWorldClass
              proceso={itemSeleccionado}
              onClose={() => setModalActivo(null)}
              onOficioCreado={() => {
                toast.success('Oficio creado exitosamente', {
                  description: 'El oficio ha sido generado y guardado correctamente'
                });
                setModalActivo(null);
              }}
            />
          )}

          {modalActivo === 'gestion-actas' && itemSeleccionado && (
            <WizardActasWorldClass
              proceso={itemSeleccionado}
              onClose={() => setModalActivo(null)}
              onActaCreada={() => {
                toast.success('Acta creada exitosamente', {
                  description: 'El acta ha sido generada y guardada correctamente'
                });
                setModalActivo(null);
              }}
            />
          )}

          {modalActivo === 'comentarios-proceso' && itemSeleccionado && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 z-[150] p-4"
              onClick={() => setModalActivo(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
              >
                {/* Header */}
                <div className="p-6 border-b" style={{ background: 'linear-gradient(135deg, #003DA5 0%, #0056D6 100%)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-white/20">
                        <MessageSquare className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-white">
                          Comentarios del Proceso
                        </h2>
                        <p className="text-sm text-white/80 mt-1">
                          {itemSeleccionado.numeroProceso} - Trazabilidad Completa
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setModalActivo(null)} 
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className="w-6 h-6 text-white" />
                    </button>
                  </div>
                </div>

                {/* Contenido */}
                <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 160px)' }}>
                  <SistemaComentarios
                    numeroProceso={itemSeleccionado.numeroProceso}
                    etapaActual={itemSeleccionado.etapaActual}
                    profesionalActual={itemSeleccionado.profesionalAsignado}
                  />
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50">
                  <Button 
                    onClick={() => setModalActivo(null)} 
                    variant="outline" 
                    className="w-full"
                  >
                    Cerrar
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {modalActivo === 'historial-auditoria' && itemSeleccionado && (
            <ModalHistorialAuditoria
              proceso={itemSeleccionado}
              onClose={() => setModalActivo(null)}
            />
          )}

          {/* ✅ MODAL: Subir Documentos/Evidencias */}
          <ModalSubirDocumento
            isOpen={modalActivo === 'subir-documentos' && !!itemSeleccionado}
            proceso={{
              numeroProceso: itemSeleccionado?.numeroProceso || itemSeleccionado?.numero || 'CD-2025-XXX',
              etapaActual: itemSeleccionado?.etapaActual || 'Valoración'
            }}
            onClose={() => {
              setModalActivo(null);
              setItemSeleccionado(null);
            }}
            onConfirm={(documentos) => {
              console.log('Documentos cargados:', documentos);
              toast.success('Documentos Cargados', {
                description: `${documentos.length} documento(s) agregado(s) al proceso`
              });
              setModalActivo(null);
              setItemSeleccionado(null);
              }}
            />

          {/* Modal Archivar Noticia - Completo con validaciones */}
          {modalActivo === 'archivar-noticia' && itemSeleccionado && (
            <ModalArchivarNoticia
              noticia={{
                id: itemSeleccionado.id,
                numeroRadicado: itemSeleccionado.numero,
                denunciado: {
                  nombre: itemSeleccionado.denunciado.nombre,
                  identificacion: `${itemSeleccionado.denunciado.tipoIdentificacion} ${itemSeleccionado.denunciado.numeroIdentificacion}`
                }
              }}
              onClose={() => {
                setModalActivo(null);
                setItemSeleccionado(null);
              }}
              onConfirm={handleConfirmarArchivo}
            />
          )}

          {/* ✅ NUEVO: Modal Asociar Noticia a Proceso Existente */}
          {modalActivo === 'asociar-noticia-proceso' && itemSeleccionado && (
            <ModalAsociarNoticiaProceso
              isOpen={true}
              onClose={() => {
                setModalActivo(null);
                setItemSeleccionado(null);
              }}
              noticia={itemSeleccionado}
              procesosDisponibles={items.filter(i => i.tipo === 'proceso') as Proceso[]}
              onAsociar={handleConfirmarAsociacion}
            />
          )}

          {/* ✅ NUEVO: Modal Asociar Proceso a Proceso (estados post-Recepción) */}
          {modalActivo === 'asociar-proceso-proceso' && itemSeleccionado && (
            <ModalAsociarProcesoAProceso
              isOpen={true}
              onClose={() => {
                setModalActivo(null);
                setItemSeleccionado(null);
              }}
              procesoOrigen={itemSeleccionado as Proceso}
              procesosDisponibles={items.filter(i => i.tipo === 'proceso' && i.id !== itemSeleccionado.id) as Proceso[]}
              onAsociar={handleConfirmarAsociacionProcesoProceso}
            />
          )}

          {/* ✅ NUEVO: Modal Asignar Profesional en transición Recepción → Valoración */}
          {modalActivo === 'asignar-profesional' && itemSeleccionado && (
            <ModalAsignarProfesional
              proceso={itemSeleccionado}
              onClose={() => {
                setModalActivo(null);
                setItemSeleccionado(null);
              }}
              onAsignar={handleAsignarProfesional}
            />
          )}

          {/* ✅ NUEVO: Modal Solicitar Reasignación (estados posteriores a Recepción) */}
          {modalActivo === 'solicitar-reasignacion' && itemSeleccionado && (
            <ModalSolicitarReasignacion
              proceso={itemSeleccionado}
              onClose={() => {
                setModalActivo(null);
                setItemSeleccionado(null);
              }}
              onSolicitar={handleConfirmarSolicitudReasignacion}
            />
          )}

          {/* ✅ NUEVO: Modal Aprobar Reasignación (Jefe OCID) */}
          {modalActivo === 'aprobar-reasignacion' && solicitudSeleccionada && (
            <ModalAprobarReasignacion
              solicitud={solicitudSeleccionada}
              onClose={() => {
                setModalActivo(null);
                setSolicitudSeleccionada(null);
              }}
              onAprobar={handleAprobarReasignacion}
              onRechazar={handleRechazarReasignacion}
            />
          )}
        </AnimatePresence>

        {/* ✅ REFACTORIZADO: Modal Unificado de Revisión y Aprobación */}
        <AnimatePresence>
          {modalActivo === 'aprobar-borrador' && itemSeleccionado && itemSeleccionado.tipo === 'proceso' && (
            <ModalRevisionAuto
              borrador={convertirProcesoABorrador(itemSeleccionado)}
              onClose={() => {
                setModalActivo(null);
                setItemSeleccionado(null);
              }}
              onAprobar={handleConfirmarAprobacion}
              onDevolver={handleDevolverDocumento}
              mostrarBotonDevolver={true}
              tituloModal="Revisión y Aprobación de Documento"
              descripcionModal={`${itemSeleccionado.numeroProceso} - ${itemSeleccionado.etapaActual}`}
            />
          )}
        </AnimatePresence>

        {/* ✅ NUEVO: Modal Editar Noticia y Proceso - MISMO WIZARD PARA TODOS */}
        {mostrarModalEditar && noticiaAEditar && (
          <CreateNoticiaModal
            onClose={() => {
              setMostrarModalEditar(false);
              setNoticiaAEditar(null);
            }}
            onSave={handleGuardarEdicion}
            noticiaToEdit={noticiaAEditar}
            isEditMode={true}
          />
        )}

        {/* ✅ ELIMINADO: Modal Generar Auto Contextual - Ya cubierto con funciones maduras */}
      </div>
    </DndProvider>
  );
}