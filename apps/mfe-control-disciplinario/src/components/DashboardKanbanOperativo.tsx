/**
 * DASHBOARD KANBAN OPERATIVO V4 - CONTROL INTERNO DISCIPLINARIO
 * Versión RESPONSIVE con soporte completo para Mobile, Tablet y Desktop
 * INTEGRACIÓN COMPLETA: Editor de Documentos + Gestión Documental
 */

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
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
  ChevronsDown, ChevronsUp, ChevronUp, ChevronLeft, ChevronRight, Zap, Link2, UserCog, MessageCircle,
  ClipboardList, FileEdit, Loader2, CornerDownLeft
} from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { Avatar, AvatarFallback } from '@esap-mfe/shared-ui/avatar';
import { toast } from 'sonner';
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
import { ModalDevolverNoticia } from './ModalDevolverNoticia';
import { ModalRemitirCompetencia } from './ModalRemitirCompetencia';
import { SistemaComentarios } from './SistemaComentarios';
import { ModalAsociarNoticiaProceso } from './ModalAsociarNoticiaProceso'; // ✅ NUEVO
import { ModalAsociarNoticiaANoticia } from './ModalAsociarNoticiaANoticia'; // ✅ NUEVO: Modal para asociar noticia a noticia
import { ModalAsignarProfesional } from './ModalAsignarProfesional'; // ✅ NUEVO: Modal de asignación de profesional
import { authService } from '../../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';
import { ModalSolicitarReasignacion } from './ModalSolicitarReasignacion'; // ✅ NUEVO: Modal de solicitud de reasignación
import { ModalAprobarReasignacion } from './ModalAprobarReasignacion'; // ✅ NUEVO: Modal de aprobación de reasignación (Jefe OCID)
import { ModalRevisionAuto, type BorradorPendiente } from './ModalRevisionAuto'; // ✅ REFACTORIZADO: Modal unificado de revisión y aprobación
import { ModalAsociarProcesoAProceso } from './ModalAsociarProcesoAProceso'; // ✅ NUEVO: Modal para asociar proceso disciplinario a otro proceso
import { convertirProcesoABorrador } from './utils-aprobacion'; // ✅ NUEVO: Utilidades de conversión
import { obtenerAccionesPorEtapa, obtenerDescripcionEtapa, type EtapaProceso } from './accionesPorEtapa'; // ✅ NUEVO: Acciones por etapa
import { useResponsive } from './hooks/useResponsive'; // ✅ Hook responsive simplificado
import { ModalDetallesProceso } from './ModalDetallesProceso'; // ✅ Modal World Class con pestañas
import { ModalDetallesAsociacion } from './ModalDetallesAsociacion'; // ✅ Modal para ver detalles de asociación de procesos
import { WizardConvertirProcesoWorldClass } from './WizardConvertirProcesoWorldClass'; // ✅ Wizard conversión con disponibilidad de profesionales
import { ModalDetallesNoticia } from './ModalDetallesNoticia'; // ✅ Modal World Class detalles de noticia
import { disciplinaryService, DisciplinaryNews as ApiNoticia, DisciplinaryProcess as ApiProceso } from '../../../services/api/disciplinary.service';
import { entidadesRemisionService, EntidadRemision } from '../../../services/api/entidadesRemisionService';
// ✅ IMPORTAR SERVICIOS DE SUPABASE PARA PERSISTENCIA LOCAL (solo uso interno, datos principales vienen del backend)
import { noticiasService } from '../../../services/api/esapDataService';
import { Permissions } from '@esap-mfe/shared-types/permissions';
import { authService } from '../../../services/api/authService';
import {
  KanbanButtonPrimary,
  KanbanButtonSecondary,
  KanbanButtonTertiary,
  KanbanButtonDestructive,
  KanbanButtonSemantic,
  KanbanActionSection,
  KanbanActionRowPrimary,
  KanbanActionRowTertiary,
  KanbanAccentBar,
  KanbanViewToggle,
  KanbanToolbarCTA,
  KanbanCard,
  KanbanCardHeader,
  KanbanCardInfoSection,
  KanbanCardProfesional,
} from '../design-system/KanbanDesignStandard';

// ==================== UTILIDAD: Normalización de texto (sin tildes, minúsculas) ====================
function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Busca si `query` (ya normalizado) aparece en algún campo textual del item */
function itemMatchesSearch(item: Item, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;

  const fields: string[] = [];

  if (item.tipo === 'noticia') {
    const n = item as Noticia;
    fields.push(
      n.numero || '',
      n.origen || '',
      n.hechos || '',
      typeof n.denunciante === 'string' ? n.denunciante : (n.denunciante as any)?.nombre || '',
      typeof n.denunciado === 'string'
        ? n.denunciado
        : (n.denunciado as any)?.nombre || '',
      (n as any).radicador || '',
    );
  } else {
    const p = item as Proceso;
    fields.push(
      p.numeroProceso || '',
      (p as any).noticiaOrigen || '',
      typeof p.denunciante === 'string' ? p.denunciante : (p.denunciante as any)?.nombre || '',
      typeof p.denunciado === 'string'
        ? p.denunciado
        : (p.denunciado as any)?.nombre || '',
      typeof p.profesionalAsignado === 'string'
        ? p.profesionalAsignado
        : (p.profesionalAsignado as any)?.nombre || '',
      (p as any).hechos || '',
      p.etapaActual || '',
      p.estadoActual || '',
    );
  }

  return fields.some(f => normalizeText(f).includes(normalizedQuery));
}

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
  denunciante: Persona | string;
  denunciado: Persona | string;
  hechos: string;
  estado: 'pendiente' | 'en-valoracion' | 'asignada' | 'archivada' | 'remitida' | 'asociada' | 'devuelta';
  prioridad: 'alta' | 'media' | 'baja';
  diasPendientes: number;
  tipo: 'noticia';
  kanbanStage?: string;
  procesoAsociado?: {
    id: string;
    numeroProceso: string;
    fechaAsociacion: string;
    justificacion: string;
  };
  // ═══ Campos de remisión por competencia ═══
  numeroRC?: string;
  entidadRemision?: string;
  tipoRemision?: string;
  fechaRemision?: string;
  fundamentoLegalRemision?: string;
  justificacionRemision?: string;
  // ═══ Campos extendidos de creación ═══
  territorial?: string;
  fechaHechos?: string;
  cargo?: string;
  dependencia?: string;
  conductaSeleccionada?: string;
  conductaPersonalizada?: string;
  denunciados?: {
    id: string;
    nombre: string;
    identificacion: string;
    cargo: string;
    lugarHechos: string;
    apoderado?: { nombre: string; cedula: string; correo: string; celular: string };
  }[];
  denunciantes?: {
    id: string;
    nombre: string;
    identificacion: string;
    direccion: string;
    telefono: string;
    correo: string;
    cargo: string;
    entidad: string;
    tipo: 'Denunciante' | 'Víctima';
    apoderado?: { nombre: string; cedula: string; correo: string; celular: string };
  }[];
  hechosSeparados?: { id: string; descripcion: string; fecha?: string }[];
  archivosAdjuntos?: { nombre: string; tipo: string; tamano: number; fechaSubida: string; url: string }[];
  radicador?: string;
  fechaRegistro?: string;
}

interface Proceso {
  id: string;
  numeroProceso: string;
  noticiaOrigen: string;
  denunciante: Persona | string;
  denunciado: Persona | string;
  cedula: string;
  etapaActual: 'Recepción' | 'Valoración' | 'Indagación' | 'Investigación' | 'Juzgamiento' | 'Fallo';
  estadoActual: string;
  profesionalAsignado: Persona | string;
  profesionalAsignadoId?: string;
  semaforo: 'verde' | 'amarillo' | 'rojo';
  diasRestantes: number;
  porcentajeTiempo: number;
  borradores: any[];
  documentos: any[];
  pendienteAprobacion: boolean;
  ultimaActuacion: string;
  fechaCreacion: string;
  tipo: 'proceso';
  kanbanStage?: string;
  hechos?: string;
  cargo?: string;
  dependencia?: string;
  historialAuditoria?: any[];
  restaurado?: boolean; // ✅ NUEVO: Indica si el proceso fue restaurado
  // ═══ Campos heredados de la Noticia disciplinaria ═══
  territorial?: string;
  fechaHechos?: string;
  conductaSeleccionada?: string;
  conductaPersonalizada?: string;
  denunciados?: {
    id: string;
    nombre: string;
    identificacion: string;
    cargo: string;
    lugarHechos: string;
    apoderado?: { nombre: string; cedula: string; correo: string; celular: string };
  }[];
  denunciantes?: {
    id: string;
    nombre: string;
    identificacion: string;
    direccion: string;
    telefono: string;
    correo: string;
    cargo: string;
    entidad: string;
    tipo: 'Denunciante' | 'Víctima';
    apoderado?: { nombre: string; cedula: string; correo: string; celular: string };
  }[];
  hechosSeparados?: { id: string; descripcion: string; fecha?: string }[];
  archivosAdjuntos?: { nombre: string; tipo: string; tamano: number; fechaSubida: string }[];
  origenNoticia?: string;
  fechaRecepcionNoticia?: string;
  prioridadNoticia?: 'alta' | 'media' | 'baja';
  procesoAsociadoId?: string;
  procesoAsociadoNumero?: string;
  procesoAsociadoTipo?: 'conexo' | 'similar' | 'consolidado';
  procesoAsociadoFecha?: string;
  // ✅ NUEVO: Campos de consolidación
  procesoConsolidadoPrincipal?: string;
  procesosConsolidados?: string[];
  informacionConsolidada?: {
    radicado: string;
    fechaInicio: string;
    hechos: string;
    disciplinable: any;
  };
}

type Item = Noticia | Proceso;
type ModalType =
  | 'crear-noticia'
  | 'convertir-proceso'
  | 'devolver-noticia'
  | 'devolver-competencia'
  | 'ver-detalles'
  | 'ver-detalles-remision'  // ✅ NUEVO: Modal para ver detalles de remisión por competencia
  | 'ver-detalles-asociacion'  // ✅ NUEVO: Modal para ver detalles de asociación de procesos
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
  | 'asociar-noticia-noticia'  // ✅ NUEVO: Modal para asociar noticia a noticia
  | 'asociar-proceso-proceso'  // ✅ NUEVO: Modal para asociar proceso disciplinario a otro proceso (Valoración → Fallo)
  | 'asignar-profesional'  // ✅ NUEVO: Modal para asignar profesional en transición Recepción → Valoración
  | 'solicitar-reasignacion'  // ✅ NUEVO: Modal para solicitar reasignación (estados posteriores a Recepción)
  | 'aprobar-reasignacion'  // ✅ NUEVO: Modal para aprobar/rechazar reasignación (Jefe OCID)
  | null;

// ==================== DATOS DESDE SUPABASE ====================
// Los datos se cargan desde Supabase KV Store al montar el componente.
// Ya no se usan mocks hardcodeados — ver seedData.tsx para los datos iniciales.

// ==================== COMPONENTE TARJETA DE NOTICIA ====================
interface TarjetaNoticiaProps {
  noticia: Noticia;
  onConvertir: (noticia: Noticia) => void;
  onDevolver: (noticia: Noticia) => void;
  onDevolverCompetencia: (noticia: Noticia) => void;
  onArchivar: (noticia: Noticia) => void;
  onVerDetalles?: (noticia: Noticia) => void;
  onVerDetallesRemision?: (noticia: Noticia) => void; // ✅ NUEVO: Ver detalles de remisión
  onAsociarNoticiaProceso?: (noticia: Noticia) => void; // ✅ NUEVO: Asociar noticia a proceso
  onAsociarNoticiaNoticia?: (noticia: Noticia) => void; // ✅ NUEVO: Asociar noticia a noticia
  onVerProcesoAsociado?: (procesoId: string) => void; // ✅ NUEVO: Ver proceso asociado
  onEditarNoticia?: (noticia: Noticia) => void; // ✅ NUEVO: Editar noticia
  vistaCompacta: boolean;
  isMobile?: boolean;
  colapsada?: boolean; // NUEVO: Indica si la tarjeta está colapsada
  onToggleColapso?: () => void; // NUEVO: Toggle para colapsar/expandir
  etapa?: string; // ✅ NUEVO: Etapa actual para condicionales
}

function TarjetaNoticia({ noticia, onConvertir, onDevolver, onDevolverCompetencia, onArchivar, onVerDetalles, onVerDetallesRemision, onAsociarNoticiaProceso, onAsociarNoticiaNoticia, onVerProcesoAsociado, onEditarNoticia, vistaCompacta, isMobile, colapsada, onToggleColapso, etapa }: TarjetaNoticiaProps) {
  const esJefe = authService.hasRole('rol-jefe-oci') || authService.isSuperAdmin();
  const canConvert = authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESSOS_CONVERTIR);
  const canEdit = authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_NOTICIAS_DISCIPLINARIAS_EDIT);
  const canViewDetail = authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_NOTICIA_DISCIPLINARIA_VIEW_DETAIL);
  const canDevolve = authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_NOTICIAS_DISCIPLINARIAS_DEVOLVER);
  const canRedimir = authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_NOTICIAS_DISCIPLINARIAS_REDIMIR);
  const canArchive = authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESSOS_ARCHIVAR);
  const canAssociate = authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_ASOCIAR);

  const [hoverReenviar, setHoverReenviar] = useState(false);

  const [{ isDragging }, drag] = useDrag({
    type: 'ITEM',
    item: { ...noticia, tipoItem: 'noticia' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });
  const dragRef = useRef<HTMLDivElement>(null);
  drag(dragRef);

  // ✅ NUEVO: Determinar si la noticia tiene remisión
  const tieneRemision = !!(noticia as any).numeroRC || noticia.entidadRemision || noticia.estado === 'remitida';

  return (
    <div
      ref={dragRef}
      className="cursor-grab active:cursor-grabbing touch-none w-full select-none"
      style={noticia.estado === 'devuelta' && esJefe ? { filter: 'grayscale(60%) brightness(0.87) opacity(0.75)', transition: 'filter 0.3s' } : undefined}
    >
      <motion.div
        id={`noticia-${noticia.id}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: isDragging ? 0.5 : 1, scale: isDragging ? 0.95 : 1 }}
      >
        <KanbanCard
          accentColor={noticia.procesoAsociado ? '#9333EA' : tieneRemision ? '#7C3AED' : '#F59E0B'}
          className={`${noticia.procesoAsociado ? 'border-purple-300 hover:shadow-purple-100' : ''} ${tieneRemision ? 'border-l-4' : ''}`}
          style={tieneRemision ? { borderLeftColor: '#7C3AED' } : undefined}
        >
          {/* Header — KanbanCardHeader */}
          <KanbanCardHeader
            icon={<FileText className={`w-4 h-4 ${tieneRemision ? 'text-purple-600' : 'text-orange-600'}`} />}
            iconBg={tieneRemision ? '#EDE9FE' : '#FEF3C7'}
            title={noticia.numero}
            subtitle={noticia.origen}
            rightContent={
              <div className="flex items-center gap-1">
                {noticia.estado === 'devuelta' && esJefe && (
                  <span className="flex-shrink-0 p-1 rounded-full bg-red-100 border border-red-300" title="Noticia devuelta">
                    <CornerDownLeft className="w-3 h-3 text-red-500" />
                  </span>
                )}
                {noticia.procesoAsociado ? (
                  <span className="flex-shrink-0 p-1 rounded-full bg-purple-100 border border-purple-300" title="Asociada a proceso">
                    <Link2 className="w-2.5 h-2.5 text-purple-700" />
                  </span>
                ) : null}
                {tieneRemision ? (
                  <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-purple-100 border border-purple-300 text-purple-700 text-[10px] font-bold" title="Remitida por competencia">
                    RC: {(noticia as any).numeroRC || noticia.numeroRC || 'OK'}
                  </span>
                ) : null}
              </div>
            }
          />

          {/* Partes: Denunciante y Denunciado — KanbanCardInfoSection */}
          <KanbanCardInfoSection>
            <div className="flex items-start gap-2.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex-shrink-0 pt-0.5 min-w-[30px]">DTE</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-800 truncate leading-tight">
                  {noticia.denunciante ? (typeof noticia.denunciante === 'string' ? noticia.denunciante : noticia.denunciante.nombre) : 'Sin información'}
                </p>
                {noticia.denunciante && typeof noticia.denunciante !== 'string' && (
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
                    {noticia.denunciante.tipoIdentificacion} {noticia.denunciante.numeroIdentificacion}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex-shrink-0 pt-0.5 min-w-[30px]">DDO</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-800 truncate leading-tight">
                  {noticia.denunciado ? (typeof noticia.denunciado === 'string' ? noticia.denunciado : noticia.denunciado.nombre) : 'Sin información'}
                </p>
                {noticia.denunciado && typeof noticia.denunciado !== 'string' && (
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
                    {noticia.denunciado.tipoIdentificacion} {noticia.denunciado.numeroIdentificacion}
                  </p>
                )}
              </div>
            </div>
          </KanbanCardInfoSection>

          {/* Proceso Asociado — compacto */}
          {noticia.procesoAsociado && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-1.5">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-purple-500 uppercase tracking-wider">Asociada</p>
                  <p className="text-xs font-bold text-purple-900 truncate">{noticia.procesoAsociado.numeroProceso}</p>
                </div>
                {onVerProcesoAsociado && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onVerProcesoAsociado(noticia.procesoAsociado!.id); }}
                    className="p-1 rounded hover:bg-purple-200 transition-colors flex-shrink-0"
                    title="Ver asociado"
                  >
                    <ExternalLink className="w-3 h-3 text-purple-600" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ✅ NUEVO: Remisión por Competencia - Aviso visual clicable */}
          {tieneRemision && onVerDetallesRemision && (
            <div
              className="bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-purple-100 transition-colors"
              onClick={(e) => { e.stopPropagation(); onVerDetallesRemision(noticia); }}
              title="Ver detalles de remisión"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1">
                    <Send className="w-2.5 h-2.5" />
                    Remitida por Competencia
                  </p>
                  <p className="text-xs font-bold text-purple-900 truncate">
                    RC: {(noticia as any).numeroRC || noticia.numeroRC || '—'}
                  </p>
                  {(noticia as any).entidadRemision || noticia.entidadRemision ? (
                    <p className="text-[10px] text-purple-700 truncate">
                      → {(noticia as any).entidadRemision || noticia.entidadRemision}
                    </p>
                  ) : null}
                </div>
                <ExternalLink className="w-3 h-3 text-purple-500 flex-shrink-0" />
              </div>
            </div>
          )}

          {/* Hechos — solo desktop no compacto */}
          {!vistaCompacta && !isMobile && (
            <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
              {noticia.hechos}
            </p>
          )}

          {/* Indicador de días */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-gray-600">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-semibold">{noticia.diasPendientes} días</span>
            </div>
            <span className="text-gray-400 text-[11px]">
              {new Date(noticia.fechaRecepcion).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' })}
            </span>
          </div>

          {/* ═══ Acciones ═══ */}
          {/* Jefe con devuelta: todo deshabilitado */}
          {esJefe && noticia.estado === 'devuelta' ? (
            <div style={{ pointerEvents: 'none' }}>
              <KanbanActionSection>
                <KanbanActionRowPrimary>
                  {onVerDetalles && canViewDetail && (
                    <KanbanButtonSecondary onClick={() => onVerDetalles(noticia)} icon={<Eye className="w-3.5 h-3.5" />} title="Ver detalles">Detalles</KanbanButtonSecondary>
                  )}
                  {canConvert && (
                    <KanbanButtonPrimary onClick={() => onConvertir(noticia)} icon={<PlusCircle className="w-3.5 h-3.5" />} title="Convertir a proceso">Convertir</KanbanButtonPrimary>
                  )}
                </KanbanActionRowPrimary>
              </KanbanActionSection>
            </div>
          ) : (
            <KanbanActionSection>
              <KanbanActionRowPrimary>
                {onVerDetalles && canViewDetail && (
                  <KanbanButtonSecondary onClick={() => onVerDetalles(noticia)} icon={<Eye className="w-3.5 h-3.5" />} title="Ver detalles">Detalles</KanbanButtonSecondary>
                )}
                {canConvert && esJefe ? (
                  <KanbanButtonPrimary onClick={() => onConvertir(noticia)} icon={<PlusCircle className="w-3.5 h-3.5" />} title="Convertir a proceso">Convertir</KanbanButtonPrimary>
                ) : (
                  onEditarNoticia && canEdit && etapa && (normalizeText(etapa).includes('recep') || normalizeText(etapa).includes('recib') || normalizeText(etapa).includes('valora')) && (
                    <KanbanButtonPrimary onClick={() => onEditarNoticia(noticia)} icon={<Edit className="w-3.5 h-3.5" />} title="Editar noticia">Editar</KanbanButtonPrimary>
                  )
                )}
              </KanbanActionRowPrimary>

              {/* Botones secundarios del Jefe — solo cuando NO está devuelta */}
              {esJefe && (
                <KanbanActionRowTertiary>
                  {onEditarNoticia && canEdit && etapa && (normalizeText(etapa).includes('recep') || normalizeText(etapa).includes('recib') || normalizeText(etapa).includes('valora')) && (
                    <KanbanButtonTertiary onClick={() => onEditarNoticia(noticia)} icon={<Edit className="w-3.5 h-3.5" />} title="Editar noticia" />
                  )}
                  {!noticia.procesoAsociado && onAsociarNoticiaNoticia && canAssociate && (
                    <KanbanButtonTertiary onClick={() => onAsociarNoticiaNoticia(noticia)} icon={<Link2 className="w-3.5 h-3.5" />} title="Asociar a otra noticia" />
                  )}
                  {!noticia.procesoAsociado && onAsociarNoticiaProceso && canAssociate && (
                    <KanbanButtonTertiary onClick={() => onAsociarNoticiaProceso(noticia)} icon={<Link2 className="w-3.5 h-3.5" />} title="Asociar a proceso" />
                  )}
                  {canDevolve && <KanbanButtonTertiary onClick={() => onDevolver(noticia)} icon={<ArrowLeft className="w-3.5 h-3.5" />} title="Devolver" />}
                  {canRedimir && <KanbanButtonTertiary onClick={() => onDevolverCompetencia(noticia)} icon={<Send className="w-3.5 h-3.5" />} title="Remitir por competencia" />}
                  {canArchive && <KanbanButtonDestructive onClick={() => onArchivar(noticia)} icon={<Archive className="w-3.5 h-3.5" />} title="Archivar" />}
                </KanbanActionRowTertiary>
              )}

              {/* Badge "Noticia Devuelta" para el Profesional — hover convierte en Reenviar */}
              {!esJefe && noticia.estado === 'devuelta' && (
                <div
                  className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg mt-1 cursor-pointer transition-all select-none ${
                    hoverReenviar ? 'bg-green-500 border border-green-600' : 'bg-orange-50 border border-orange-200'
                  }`}
                  onMouseEnter={() => setHoverReenviar(true)}
                  onMouseLeave={() => setHoverReenviar(false)}
                  onClick={() => {
                    disciplinaryService.changeNewsStatus(noticia.id, 'EN_VALORACION')
                      .then(() => toast.success('Noticia reenviada para valoración'))
                      .catch(() => toast.error('Error al reenviar noticia'));
                  }}
                  title={hoverReenviar ? 'Clic para reenviar a valoración' : 'Noticia devuelta'}
                >
                  {hoverReenviar ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-white flex-shrink-0" />
                      <span className="text-xs font-semibold text-white">Reenviar Noticia</span>
                    </>
                  ) : (
                    <>
                      <CornerDownLeft className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                      <span className="text-xs font-semibold text-orange-700">Noticia Devuelta</span>
                    </>
                  )}
                </div>
              )}
            </KanbanActionSection>
          )}
        </KanbanCard>
      </motion.div>
    </div>
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
  onVerDetallesAsociacion?: (proceso: Proceso) => void; // ✅ NUEVO: Ver detalles de asociación
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
  onVerDetallesAsociacion, // ✅ NUEVO: Ver detalles de asociación
  vistaCompacta,
  isMobile,
  colapsada,
  onToggleColapso,
  onEditarProceso // ✅ NUEVO: Editar proceso
}: TarjetaProcesoProps) {
  const canViewDetail = authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_VIEW_DETAIL);
  const canViewExpediente = authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_EXPIDIENTE);
  const canEdit = authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_EDIT);
  const canReassign = authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_REASIGNACION);
  const canAssociate = authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_ASOCIAR_PROCESOS);
  const canApprove = authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_REVISION_APROBACION_APROBAR);

  const [{ isDragging }, drag] = useDrag({
    type: 'ITEM',
    item: { ...proceso, tipoItem: 'proceso' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });
  const dragRef = useRef<HTMLDivElement>(null);
  drag(dragRef);

  // ✅ NUEVO: Estado para expandir/colapsar sección de noticias asociadas
  const [noticiasExpanded, setNoticiasExpanded] = useState(false);

  // ✅ Validación defensiva: asegurar que noticiasAsociadas sea siempre un array
  const noticiasSeguras = Array.isArray(noticiasAsociadas) ? noticiasAsociadas : [];

  // ✅ NUEVO: Expandir automáticamente cuando hay noticias asociadas
  useEffect(() => {
    if (noticiasSeguras.length > 0 && !noticiasExpanded) {
      setNoticiasExpanded(true);
    }
  }, [noticiasSeguras.length, noticiasExpanded]);


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
    <div
      ref={dragRef}
      className="cursor-grab active:cursor-grabbing touch-none w-full select-none"
    >
      <motion.div
        id={`proceso-${proceso.id}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: isDragging ? 0.5 : 1, scale: isDragging ? 0.95 : 1 }}
      >
        <KanbanCard accentColor="#003DA5">
          {/* Header — KanbanCardHeader */}
          <KanbanCardHeader
            icon={<Scale className="w-4 h-4" style={{ color: '#003DA5' }} />}
            iconBg="#E0EDFF"
            title={proceso.numeroProceso}
            titleColor="#003DA5"
            subtitle={`Noticia: ${proceso.noticiaOrigen}`}
            rightContent={
              <div
                className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-offset-1"
                style={{ background: semaforo.color, ringColor: semaforo.color + '40' }}
                title={`${semaforo.label} · ${proceso.diasRestantes} días`}
              />
            }
          />

          {/* Partes: Denunciante y Denunciado — KanbanCardInfoSection */}
          <KanbanCardInfoSection>
            <div className="flex items-start gap-2.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex-shrink-0 pt-0.5 min-w-[30px]">DTE</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-800 truncate leading-tight">
                  {proceso.denunciante ? (typeof proceso.denunciante === 'string' ? proceso.denunciante : proceso.denunciante.nombre) : 'Sin información'}
                </p>
                {proceso.denunciante && typeof proceso.denunciante !== 'string' && (
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
                    {proceso.denunciante.tipoIdentificacion} {proceso.denunciante.numeroIdentificacion}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex-shrink-0 pt-0.5 min-w-[30px]">DDO</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-800 truncate leading-tight">
                  {proceso.denunciado ? (typeof proceso.denunciado === 'string' ? proceso.denunciado : proceso.denunciado.nombre) : 'Sin información'}
                </p>
                {proceso.denunciado && typeof proceso.denunciado !== 'string' && (
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
                    {proceso.denunciado.tipoIdentificacion} {proceso.denunciado.numeroIdentificacion}
                  </p>
                )}
              </div>
            </div>
          </KanbanCardInfoSection>

          {/* Profesional Asignado — KanbanCardProfesional */}
          {proceso.profesionalAsignado && (
            <KanbanCardProfesional
              nombre={typeof proceso.profesionalAsignado === 'string' ? proceso.profesionalAsignado : proceso.profesionalAsignado.nombre}
            />
          )}

          {/* Badges — fila compacta */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {proceso.pendienteAprobacion && (
              <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Pendiente
              </span>
            )}
            <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-gray-50 border border-gray-200 flex items-center gap-1" style={{ color: semaforo.color }}>
              <span className="w-2 h-2 rounded-full" style={{ background: semaforo.color }} />
              {proceso.diasRestantes}d
            </span>
            {noticiasSeguras.length > 0 && (
              <button
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-300 flex items-center gap-0.5 hover:bg-purple-200 transition-colors"
                onClick={(e) => { e.stopPropagation(); setNoticiasExpanded(!noticiasExpanded); }}
                title={`${noticiasSeguras.length} noticias asociadas`}
              >
                <Link2 className="w-2.5 h-2.5" />
                {noticiasSeguras.length}
                {noticiasExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
              </button>
            )}
            {/* ✅ NUEVO: Badge de proceso asociado - CLICKEABLE */}
            {proceso.procesoAsociadoId && (
              <button
                onClick={(e) => { e.stopPropagation(); onVerDetallesAsociacion?.(proceso); }}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-300 flex items-center gap-0.5 hover:bg-blue-200 transition-colors cursor-pointer"
                title={`Ver detalles de asociación: ${proceso.procesoAsociadoNumero}`}
              >
                <Link2 className="w-2.5 h-2.5" />
                {proceso.procesoAsociadoTipo === 'conexo' ? 'Conexo' : proceso.procesoAsociadoTipo === 'similar' ? 'Similar' : proceso.procesoAsociadoTipo === 'consolidado' ? 'Consolidado' : 'Asociado'}
              </button>
            )}

            {/* ✅ NUEVO: Badge de proceso restaurado */}
            {proceso.restaurado && (
              <div
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-300 flex items-center gap-0.5"
                title="Este proceso fue restaurado desde archivados"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                Restaurado
              </div>
            )}
          </div>

          {/* Noticias Asociadas Expandible */}
          {noticiasSeguras.length > 0 && noticiasExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 space-y-1">
                <p className="text-[10px] font-bold text-purple-900 uppercase">Noticias ({noticiasSeguras.length})</p>
                {noticiasSeguras.map((noticia) => (
                  <div
                    key={noticia.id}
                    onClick={(e) => { e.stopPropagation(); onVerNoticiaAsociada?.(noticia); }}
                    className="p-1.5 bg-white border border-purple-200 rounded hover:bg-purple-50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-purple-900 truncate">{noticia.numero}</p>
                      <ExternalLink className="w-2.5 h-2.5 text-purple-500 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Métricas — fila compacta inline - CLICKEABLE */}
          {proceso.procesoAsociadoId && (
            <div
              className="mt-2 pt-2 border-t border-blue-200 bg-blue-50 p-2 rounded-md cursor-pointer hover:bg-blue-100 transition-colors"
              onClick={(e) => { e.stopPropagation(); onVerDetallesAsociacion?.(proceso); }}
              title="Ver detalles de la asociación"
            >
              <div className="flex items-center gap-1.5">
                <Link2 className="w-3 h-3 text-blue-600" />
                <span className="text-[10px] font-bold text-blue-800">Proceso Asociado:</span>
              </div>
              <p className="text-[11px] text-blue-900 font-semibold mt-1">{proceso.procesoAsociadoNumero}</p>
              <p className="text-[9px] text-blue-700">Tipo: {proceso.procesoAsociadoTipo === 'conexo' ? 'Conexo' : proceso.procesoAsociadoTipo === 'similar' ? 'Similar' : proceso.procesoAsociadoTipo === 'consolidado' ? 'Consolidado' : 'Asociado'}</p>
              {proceso.procesoAsociadoFecha && (
                <p className="text-[9px] text-blue-600">Asociado el: {new Date(proceso.procesoAsociadoFecha).toLocaleDateString('es-CO')}</p>
              )}
            </div>
          )}
          <div className="flex items-center gap-3 text-xs py-1">
            <div className="flex items-center gap-1.5 text-gray-600">
              <FileEdit className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-semibold">{proceso.borradores?.length || 0}</span>
            </div>
            <span className="text-gray-200">|</span>
            <div className="flex items-center gap-1.5 text-gray-600">
              <FolderOpen className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-semibold">{proceso.documentos?.length || 0}</span>
            </div>
            <span className="text-gray-200">|</span>
            <div className="flex items-center gap-1.5 text-gray-600">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-semibold">{proceso.porcentajeTiempo}%</span>
            </div>
          </div>

          {/* Última actuación */}
          <AnimatePresence>
            {proceso.ultimaActuacion && proceso.ultimaActuacion.trim() !== '' && (
              <motion.div
                key="ultima-actuacion"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-2.5 rounded-lg" style={{ backgroundColor: '#F0F7FF', border: '1px solid #DBEAFE' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#003DA5' }}>Última actuación</p>
                  <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">{proceso.ultimaActuacion}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══ Acciones — Design Standard World Class ═══ */}
          <KanbanActionSection>
            <KanbanActionRowPrimary>
              {onVerDetalles && canViewDetail && (
                <KanbanButtonSecondary
                  onClick={(e) => { e.stopPropagation(); onVerDetalles(proceso); }}
                  icon={<FileText className="w-3.5 h-3.5" />}
                  title="Ver detalles"
                >
                  Detalles
                </KanbanButtonSecondary>
              )}
              {onVerExpediente && canViewExpediente && (
                <KanbanButtonPrimary
                  onClick={(e) => { e.stopPropagation(); onVerExpediente(proceso); }}
                  icon={<Archive className="w-3.5 h-3.5" />}
                  title="Expediente"
                >
                  Exp.
                </KanbanButtonPrimary>
              )}
            </KanbanActionRowPrimary>

            <KanbanActionRowTertiary>
              {onEditarProceso && canEdit && (
                <KanbanButtonTertiary
                  onClick={(e) => { e.stopPropagation(); onEditarProceso(proceso); }}
                  icon={<Edit className="w-3.5 h-3.5" />}
                  title="Editar proceso"
                />
              )}
              {proceso.etapaActual !== 'Recepción' && onSolicitarReasignacion && canReassign && (
                <KanbanButtonTertiary
                  onClick={(e) => { e.stopPropagation(); onSolicitarReasignacion(proceso); }}
                  icon={<UserCheck className="w-3.5 h-3.5" />}
                  title="Reasignar profesional"
                />
              )}
              {proceso.etapaActual !== 'Recepción' && onAsociarProcesoProceso && canAssociate && (
                <KanbanButtonTertiary
                  onClick={(e) => { e.stopPropagation(); onAsociarProcesoProceso(proceso); }}
                  icon={<Link2 className="w-3.5 h-3.5" />}
                  title="Asociar a otro proceso"
                />
              )}
            </KanbanActionRowTertiary>

            {proceso.pendienteAprobacion && canApprove && (
              <KanbanButtonSemantic
                variant="success"
                onClick={(e) => { e.stopPropagation(); onAprobarBorrador(proceso); }}
                icon={<CheckCircle className="w-3.5 h-3.5" />}
                title="Aprobar documento pendiente"
              >
                Aprobar Documento
              </KanbanButtonSemantic>
            )}
          </KanbanActionSection>
        </KanbanCard>
      </motion.div>
    </div>
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
  onAsociarNoticiaNoticia?: (noticia: Noticia) => void; // ✅ NUEVO: Asociar noticia a noticia
  onVerProcesoAsociado?: (procesoId: string) => void; // ✅ AGREGADO: Coherencia con Kanban
  onVerNoticiaAsociada?: (noticia: Noticia) => void; // ✅ AGREGADO: Coherencia con Kanban
  onEditarNoticia?: (noticia: Noticia) => void; // ✅ AGREGADO: Coherencia con Kanban
  onEditarProceso?: (proceso: Proceso) => void; // ✅ NUEVO: Editar proceso (reemplaza Ver Detalles)
  onCambiarEtapa?: (proceso: Proceso, nuevaEtapa: string) => void; // ✅ NUEVO: Handler para cambiar etapa
  etapasConfig?: any[]; // ✅ NUEVO: Configuración de etapas desde backend
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
  onAsociarNoticiaNoticia,
  onVerProcesoAsociado,
  onVerNoticiaAsociada,
  onEditarNoticia,
  onEditarProceso, // ✅ NUEVO: Editar proceso
  onCambiarEtapa, // ✅ NUEVO: Handler para cambiar etapa
  etapasConfig,
  isMobile
}: VistaListaProps) {
  const [filtroEtapa, setFiltroEtapa] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const itemsFiltrados = items.filter(item => {
    if (item.tipo === 'noticia' && (item as Noticia).procesoAsociado) {
      return false;
    }

    const matchSearch = item.tipo === 'noticia'
      ? (item as Noticia).numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ((item as Noticia).denunciado && (typeof (item as Noticia).denunciado === 'string'
        ? (item as Noticia).denunciado.toLowerCase().includes(searchTerm.toLowerCase())
        : (item as Noticia).denunciado.nombre?.toLowerCase().includes(searchTerm.toLowerCase())))
      : (item as Proceso).numeroProceso.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ((item as Proceso).denunciado && (typeof (item as Proceso).denunciado === 'string'
        ? (item as Proceso).denunciado.toLowerCase().includes(searchTerm.toLowerCase())
        : (item as Proceso).denunciado.nombre?.toLowerCase().includes(searchTerm.toLowerCase())));

    // Filtrar por etapa comparando ID de etapa parametrizada contra kanbanStage del item
    const matchEtapa = filtroEtapa === 'todos' || item.kanbanStage === filtroEtapa;

    return matchSearch && matchEtapa;
  });

  const getSemaforoColor = (semaforo?: string) => {
    switch (semaforo) {
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
            style={{ borderColor: '#E5E7EB', color: '#000000', backgroundColor: '#FFFFFF' }}
            value={filtroEtapa}
            onChange={(e) => setFiltroEtapa(e.target.value)}
          >
            <option value="todos">Todas las etapas</option>
            {(() => {
              if (etapasConfig && etapasConfig.length > 0) {
                return etapasConfig
                  .filter(etapa => etapa.activo !== false)
                  .sort((a, b) => (a.orden || 0) - (b.orden || 0))
                  .map((etapa) => {
                    const nombreEtapa = etapa.etapa || etapa.nombre || 'Sin nombre';
                    return (
                      <option key={etapa.id || `etapa-${Math.random()}`} value={etapa.id}>
                        {nombreEtapa}
                      </option>
                    );
                  });
              } else {
                // Fallback options con IDs fijos para mantener consistencia
                return (
                  <>
                    <option value="recepcion">Recepción (Noticias) - 3 días</option>
                    <option value="valoracion">Valoración - 10 días</option>
                    <option value="indagacion">Indagación - 40 días</option>
                    <option value="investigacion">Investigación - 60 días</option>
                    <option value="juzgamiento">Juzgamiento - 50 días</option>
                    <option value="fallo">Fallo - 10 días</option>
                    <option value="archivo">Archivo - Completado</option>
                  </>
                );
              }
            })()}
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
                        ? (!noticia!.denunciado ? 'N/A' : typeof noticia!.denunciado === 'string' ? noticia!.denunciado : noticia!.denunciado.nombre)
                        : (!proceso!.denunciado ? 'N/A' : typeof proceso!.denunciado === 'string' ? proceso!.denunciado : proceso!.denunciado.nombre)}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {isNoticia
                        ? (noticia!.denunciado && typeof noticia!.denunciado !== 'string' && `${noticia!.denunciado.tipoIdentificacion} ${noticia!.denunciado.numeroIdentificacion}`)
                        : (proceso!.denunciado && typeof proceso!.denunciado !== 'string' ? `${proceso!.denunciado.tipoIdentificacion} ${proceso!.denunciado.numeroIdentificacion}` : proceso!.cedula ? `CC: ${proceso!.cedula}` : '')}
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

                  {/* Acciones — Design Standard (compact mode) */}
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-200">
                    {isNoticia ? (
                      <>
                        <KanbanActionRowPrimary>
                          {onVerDetallesNoticia && (
                            <KanbanButtonSecondary
                              onClick={() => onVerDetallesNoticia(noticia!)}
                              icon={<Eye className="w-3 h-3" />}
                              title="Ver detalles"
                            >
                              Detalles
                            </KanbanButtonSecondary>
                          )}
                          <KanbanButtonPrimary
                            onClick={() => onConvertirNoticia(noticia!)}
                            icon={<PlusCircle className="w-3 h-3" />}
                          >
                            Convertir
                          </KanbanButtonPrimary>
                        </KanbanActionRowPrimary>
                        <KanbanActionRowTertiary>
                          {onEditarNoticia && (
                            <KanbanButtonTertiary compact onClick={() => onEditarNoticia(noticia!)} icon={<Edit className="w-3 h-3" />} title="Editar noticia" />
                          )}
                          {onDevolverNoticia && (
                            <KanbanButtonTertiary compact onClick={() => onDevolverNoticia(noticia!)} icon={<ArrowLeft className="w-3 h-3" />} title="Devolver" />
                          )}
                          {onDevolverCompetencia && (
                            <KanbanButtonTertiary compact onClick={() => onDevolverCompetencia(noticia!)} icon={<Send className="w-3 h-3" />} title="Remitir por competencia" />
                          )}
                          <KanbanButtonDestructive compact onClick={() => onArchivarNoticia(noticia!)} icon={<Archive className="w-3 h-3" />} title="Archivar" />
                        </KanbanActionRowTertiary>
                      </>
                    ) : (
                      <>
                        <KanbanActionRowPrimary>
                          <KanbanButtonSecondary
                            onClick={() => onVerDetalles(proceso!)}
                            icon={<FileText className="w-3 h-3" />}
                            title="Ver detalles"
                          >
                            Detalles
                          </KanbanButtonSecondary>
                          <KanbanButtonPrimary
                            onClick={() => onVerExpediente(proceso!)}
                            icon={<FolderOpen className="w-3 h-3" />}
                          >
                            Exp.
                          </KanbanButtonPrimary>
                        </KanbanActionRowPrimary>
                        <KanbanActionRowTertiary>
                          {onEditarProceso && (
                            <KanbanButtonTertiary compact onClick={() => onEditarProceso(proceso!)} icon={<Edit className="w-3 h-3" />} title="Editar proceso" />
                          )}
                          {onSolicitarReasignacion && (
                            <KanbanButtonTertiary compact onClick={() => onSolicitarReasignacion(proceso!)} icon={<UserCheck className="w-3 h-3" />} title="Reasignar profesional" />
                          )}
                          {onAsociarProcesoProceso && (
                            <KanbanButtonTertiary compact onClick={() => onAsociarProcesoProceso(proceso!)} icon={<Link2 className="w-3 h-3" />} title="Asociar a otro proceso" />
                          )}
                        </KanbanActionRowTertiary>
                        {proceso!.pendienteAprobacion && (
                          <KanbanButtonSemantic variant="success" onClick={() => onAprobarBorrador(proceso!)} icon={<CheckCircle className="w-3 h-3" />}>
                            Aprobar Documento
                          </KanbanButtonSemantic>
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
                  <th className="px-4 py-3 text-xs font-bold uppercase" style={{ color: '#6B7280' }}>
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
                          {isNoticia ? (
                            <Badge
                              className="mb-1"
                              style={{ background: '#FEF3C7', color: '#D97706' }}
                            >
                              Recepción
                            </Badge>
                          ) : (
                            <EtapaSelector
                              etapaActual={proceso!.etapaActual}
                              etapasConfig={etapasConfig}
                              onCambiarEtapa={(nuevaEtapa) => onCambiarEtapa?.(proceso!, nuevaEtapa)}
                            />
                          )}
                          {proceso && (
                            <p
                              className="text-xs font-semibold px-1.5 py-0.5 rounded-full inline-block"
                              style={
                                proceso.estadoActual === 'CERRADO'
                                  ? { color: '#92400E', background: '#FEF3C7' }
                                  : proceso.estadoActual === 'ARCHIVADO'
                                    ? { color: '#6B7280', background: '#F3F4F6' }
                                    : { color: '#6B7280' }
                              }
                              title={proceso.estadoActual === 'CERRADO' ? 'Trasladado a Oficina Jurídica' : undefined}
                            >
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

                      {/* Acciones — Design Standard (tabla) */}
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1.5 min-w-[180px]">
                          {isNoticia ? (
                            <>
                              <KanbanActionRowPrimary>
                                {onVerDetallesNoticia && (
                                  <KanbanButtonSecondary onClick={() => onVerDetallesNoticia(noticia!)} icon={<Eye className="w-3 h-3" />} title="Ver detalles">
                                    Detalles
                                  </KanbanButtonSecondary>
                                )}
                                <KanbanButtonPrimary onClick={() => onConvertirNoticia(noticia!)} icon={<PlusCircle className="w-3 h-3" />} title="Convertir a proceso">
                                  Convertir
                                </KanbanButtonPrimary>
                              </KanbanActionRowPrimary>
                              <KanbanActionRowTertiary>
                                {onEditarNoticia && (
                                  <KanbanButtonTertiary compact onClick={() => onEditarNoticia(noticia!)} icon={<Edit className="w-3.5 h-3.5" />} title="Editar noticia" />
                                )}
                                {onDevolverNoticia && (
                                  <KanbanButtonTertiary compact onClick={() => onDevolverNoticia(noticia!)} icon={<ArrowLeft className="w-3.5 h-3.5" />} title="Devolver" />
                                )}
                                {onDevolverCompetencia && (
                                  <KanbanButtonTertiary compact onClick={() => onDevolverCompetencia(noticia!)} icon={<Send className="w-3.5 h-3.5" />} title="Remitir por competencia" />
                                )}
                                <KanbanButtonDestructive compact onClick={() => onArchivarNoticia(noticia!)} icon={<Archive className="w-3.5 h-3.5" />} title="Archivar" />
                              </KanbanActionRowTertiary>
                            </>
                          ) : (
                            <>
                              <KanbanActionRowPrimary>
                                <KanbanButtonSecondary onClick={() => onVerDetalles(proceso!)} icon={<FileText className="w-3 h-3" />} title="Ver detalles">
                                  Detalles
                                </KanbanButtonSecondary>
                                <KanbanButtonPrimary onClick={() => onVerExpediente(proceso!)} icon={<FolderOpen className="w-3 h-3" />} title="Expediente">
                                  Exp.
                                </KanbanButtonPrimary>
                              </KanbanActionRowPrimary>
                              <KanbanActionRowTertiary>
                                {onEditarProceso && (
                                  <KanbanButtonTertiary compact onClick={() => onEditarProceso(proceso!)} icon={<Edit className="w-3.5 h-3.5" />} title="Editar proceso" />
                                )}
                                {onSolicitarReasignacion && (
                                  <KanbanButtonTertiary compact onClick={() => onSolicitarReasignacion(proceso!)} icon={<UserCheck className="w-3.5 h-3.5" />} title="Reasignar" />
                                )}
                                {onAsociarProcesoProceso && (
                                  <KanbanButtonTertiary compact onClick={() => onAsociarProcesoProceso(proceso!)} icon={<Link2 className="w-3.5 h-3.5" />} title="Asociar a otro proceso" />
                                )}
                              </KanbanActionRowTertiary>
                              {proceso!.pendienteAprobacion && (
                                <KanbanButtonSemantic variant="success" onClick={() => onAprobarBorrador(proceso!)} icon={<CheckCircle className="w-3 h-3" />} title="Aprobar documento pendiente">
                                  Aprobar Documento
                                </KanbanButtonSemantic>
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
  icono: ReactNode;
  diasEstimados?: number;
  etapasConfig?: any[]; // ✅ NUEVO: Configuración de etapas con orden
  onDrop: (item: Item, nuevaEtapa: string) => void;
  onConvertirNoticia: (noticia: Noticia) => void;
  onDevolverNoticia: (noticia: Noticia) => void;
  onDevolverCompetencia: (noticia: Noticia) => void;
  onArchivarNoticia: (noticia: Noticia) => void;
  onVerDetallesNoticia?: (noticia: Noticia) => void;
  onVerDetallesRemision?: (noticia: Noticia) => void; // ✅ NUEVO: Ver detalles de remisión
  onAsociarNoticiaProceso?: (noticia: Noticia) => void; // ✅ NUEVO
  onAsociarNoticiaNoticia?: (noticia: Noticia) => void; // ✅ NUEVO: Asociar noticia a noticia
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
  onVerDetallesAsociacion?: (proceso: Proceso) => void; // ✅ NUEVO: Ver detalles de asociación
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
  etapasConfig = [], // ✅ NUEVO
  onDrop,
  onConvertirNoticia,
  onDevolverNoticia,
  onDevolverCompetencia,
  onArchivarNoticia,
  onVerDetallesNoticia,
  onVerDetallesRemision, // ✅ NUEVO: Ver detalles de remisión
  onAsociarNoticiaProceso, // ✅ NUEVO
  onAsociarNoticiaNoticia, // ✅ NUEVO: Asociar noticia a noticia
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
  onVerDetallesAsociacion, // ✅ NUEVO: Ver detalles de asociación
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
      // ✅ NUEVO: Validar orden de etapas desde backend config
      if (etapasConfig.length > 0) {
        // Obtener el orden de la etapa actual (donde está el item)
        let itemOrden: number = 0;

        if (item.tipo === 'noticia') {
          // Las noticias siempre están en Recepción (orden 1 o 0)
          // Solo pueden pasar a la siguiente etapa (orden + 1)
          const etapaRecepcion = etapasConfig.find(e =>
            e.etapa?.toLowerCase().includes('recep') ||
            e.etapa?.toLowerCase().includes('recib')
          );
          itemOrden = etapaRecepcion?.orden ?? 0;
        } else {
          // Para procesos, buscar la etapa actual del proceso
          const etapaActualProceso = etapasConfig.find(e =>
            e.etapa === item.etapaActual ||
            e.etapa.toLowerCase() === item.etapaActual?.toLowerCase()
          );
          itemOrden = etapaActualProceso?.orden ?? 0;
        }

        // Obtener el orden de la etapa de destino
        const etapaDestino = etapasConfig.find(e =>
          e.etapa === etapa ||
          e.etapa.toLowerCase() === etapa.toLowerCase()
        );
        const etapaDestinoOrden = etapaDestino?.orden ?? itemOrden + 1;

        // Solo permitir drop si es la siguiente etapa en el orden
        return etapaDestinoOrden === itemOrden + 1;
      }

      // Fallback: lógica original si no hay configuración
      // ✅ Usar comparación normalizada para soportar etapas con/sin tildes
      const etapaNormalizadaDrop = normalizeText(etapa);
      const etapaInicialNormalizadaDrop = normalizeText(etapaInicial);

      if (item.tipo === 'noticia') {
        return etapaNormalizadaDrop === etapaInicialNormalizadaDrop || etapa === 'Valoración' || normalizeText(etapa) === normalizeText('Valoración');
      }
      return true;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  });
  const dropRef = useRef<HTMLDivElement>(null);
  drop(dropRef);

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

  // ✅ NUEVO: Obtener la etapa inicial (orden 1) desde la configuración
  const etapaInicial = etapasConfig.length > 0
    ? (() => {
      const primeraEtapa = etapasConfig.sort((a, b) => (a.orden || 0) - (b.orden || 0))[0];
      return primeraEtapa?.etapa || primeraEtapa?.nombre || 'RECEPCION';
    })()
    : 'RECEPCION';

  // Normalizar para comparación (sin tilde, minúsculas)
  const normalizeEtapa = (e: string) => e?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
  const etapaNormalizada = normalizeEtapa(etapa);
  const etapaInicialNormalizada = normalizeEtapa(etapaInicial);

  const itemsFiltrados = items.filter(item => {
    if (item.tipo === 'noticia') {
      const noticia = item as Noticia;
      if (noticia.procesoAsociado) return false;
      // Las noticias se muestran en la etapa inicial (orden 1) - comparar de forma normalizada
      return etapaNormalizada === etapaInicialNormalizada;
    }
    return item.tipo === 'proceso' && item.etapaActual === etapa;
  });

  // Ordenar noticias: más reciente primero (fechaRecepcion desc)
  const noticias = (itemsFiltrados.filter(i => i.tipo === 'noticia') as Noticia[])
    .sort((a, b) => new Date(b.fechaRecepcion).getTime() - new Date(a.fechaRecepcion).getTime());

  // Ordenar procesos: más reciente primero (fechaInicio/fechaCreacion desc)
  const procesos = (itemsFiltrados.filter(i => i.tipo === 'proceso') as Proceso[])
    .sort((a, b) => {
      const fa = (a as any).fechaInicio || (a as any).fechaCreacion || '';
      const fb = (b as any).fechaInicio || (b as any).fechaCreacion || '';
      return new Date(fb).getTime() - new Date(fa).getTime();
    });

  // ✅ NUEVO: Función para obtener noticias asociadas a un proceso específico
  const getNoticiasAsociadas = (procesoId: string): Noticia[] => {
    return items.filter(item => item.tipo === 'noticia' && item.estado === 'asociada' && item.procesoAsociado?.id === procesoId) as Noticia[];
  };

  // ✅ NUEVO: Función para filtrar procesos que ya tienen noticias asociadas
  const getProcesosSinNoticiasAsociadas = (procesos: Proceso[]): Proceso[] => {
    return procesos.filter(proceso => {
      // Verificar si el proceso ya tiene noticias asociadas en cache
      const noticiasAsociadas = getNoticiasAsociadas(proceso.id);
      return noticiasAsociadas.length === 0;
    });
  };

  // Si está colapsada, mostrar versión minimal
  if (colapsada) {
    // Calcular indicadores para columna colapsada
    const procesosRojos = procesos.filter(p => p.semaforo === 'rojo').length;
    const procesosAmarillos = procesos.filter(p => p.semaforo === 'amarillo').length;
    const procesosVerdes = procesos.filter(p => p.semaforo === 'verde').length;

    return (
      <div ref={dropRef} className="flex-shrink-0 h-full">
        <motion.div
          className={`flex-shrink-0 h-full`}
          initial={{ width: 64 }}
          animate={{ width: 64 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <Card
            className={`h-full border transition-all cursor-pointer group ${isOver && canDrop ? 'shadow-lg border-blue-500 bg-blue-50' : 'hover:shadow-md hover:border-blue-300'
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

              {/* Indicador de noticias - Solo en etapa inicial (orden 1) */}
              {etapaNormalizada === etapaInicialNormalizada && noticias.length > 0 && (
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
      </div>
    );
  }

  // Versión expandida normal
  return (
    <div ref={dropRef} className="h-full">
      <Card
        className="h-full border transition-all flex flex-col overflow-hidden"
        style={{
          borderColor: isOver && canDrop ? color : '#E2E8F0',
          background: isOver && canDrop ? '#F8FAFC' : '#F8FAFC',
          opacity: isOver && !canDrop ? 0.5 : 1,
          borderRadius: '12px',
        }}
      >
        {/* Color accent bar — Design Standard */}
        <KanbanAccentBar color={color} />

        {/* Header de Columna */}
        <div
          className={`${isMobile ? 'px-3 py-3' : 'px-4 py-3.5'} border-b sticky top-0 z-10 bg-white flex-shrink-0`}
          style={{ borderColor: '#E2E8F0' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 flex-1">
              <div
                className={`${isMobile ? 'w-7 h-7' : 'w-8 h-8'} rounded-lg flex items-center justify-center flex-shrink-0`}
                style={{ background: `${color}14` }}
              >
                {icono}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-bold ${isMobile ? 'text-xs' : 'text-[13px]'} text-gray-800 tracking-tight`}>
                  {etapa}
                </h3>
                {diasEstimados && (
                  <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {diasEstimados} días
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={`font-bold ${isMobile ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2.5 py-1'} rounded-full`}
                style={{ background: `${color}18`, color: color, border: `1px solid ${color}30` }}
              >
                {itemsFiltrados.length}
              </Badge>
              {/* Botón colapsar — cuadrado */}
              {onToggleColapso && (
                <button
                  onClick={onToggleColapso}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                  title={`Colapsar ${etapa}`}
                >
                  <Minimize2 className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Indicador de Noticias en etapa inicial (orden 1) */}
          {etapaNormalizada === etapaInicialNormalizada && noticias.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2.5 px-2 py-1.5 bg-orange-50 rounded-lg">
              <FileText className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-orange-600`} />
              <span className="text-[11px] font-bold text-orange-600">
                {noticias.length} {noticias.length === 1 ? 'noticia' : 'noticias'}
              </span>
            </div>
          )}
        </div>

        {/* Lista de Items — scroll vertical independiente (patrón Trello) */}
        <div
          className={`${isMobile ? 'p-2' : 'p-3'} space-y-3 overflow-y-auto flex-1 kanban-column-scroll`}
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#2962FF #F1F5F9',
          }}
        >
          {/* Renderizar Noticias primero — más reciente arriba */}
          {noticias.map((noticia) => (
            <TarjetaNoticia
              key={noticia.id}
              noticia={noticia}
              onConvertir={onConvertirNoticia}
              onDevolver={onDevolverNoticia}
              onDevolverCompetencia={onDevolverCompetencia}
              onArchivar={onArchivarNoticia}
              onVerDetalles={onVerDetallesNoticia}
              onVerDetallesRemision={onVerDetallesRemision} // ✅ NUEVO: Ver detalles de remisión
              onAsociarNoticiaProceso={onAsociarNoticiaProceso} // ✅ NUEVO
              onAsociarNoticiaNoticia={onAsociarNoticiaNoticia} // ✅ NUEVO: Asociar noticia a noticia
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
            <div className="flex items-center gap-2.5 py-1">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Procesos</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          )}

          {/* Renderizar Procesos — más reciente arriba */}
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
              onVerDetallesAsociacion={onVerDetallesAsociacion} // ✅ NUEVO: Ver detalles de asociación
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
            <div className="text-center py-16 text-gray-300">
              <FolderOpen className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} mx-auto mb-3 opacity-40`} />
              <p className="text-xs font-medium text-gray-400">
                {etapaNormalizada === etapaInicialNormalizada ? 'Sin items' : 'Sin procesos'}
              </p>
              <p className="text-[11px] text-gray-300 mt-1">en esta etapa</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ==================== COMPONENTE VISTA ARCHIVADOS — WORLD CLASS ====================
interface VistaArchivadosProps {
  items: Array<any>;
  onDesarchivar: (item: any) => void;
  onVerDetalles: (item: any) => void;
  isMobile: boolean;
}

function VistaArchivados({ items, onDesarchivar, onVerDetalles, isMobile }: VistaArchivadosProps) {
  const [searchArchivo, setSearchArchivo] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'noticia' | 'proceso'>('todos');
  const [ordenarPor, setOrdenarPor] = useState<'reciente' | 'antiguo'>('reciente');

  const itemsFiltrados = items
    .filter(item => {
      if (filtroTipo !== 'todos' && item.tipo !== filtroTipo) return false;
      if (searchArchivo) {
        const term = searchArchivo.toLowerCase();
        const numero = (item.numero || item.numeroProceso || '').toLowerCase();
        const denunciado = typeof item.denunciado === 'string'
          ? item.denunciado.toLowerCase()
          : (item.denunciado?.nombre || '').toLowerCase();
        const hechos = (item.hechos || '').toLowerCase();
        return numero.includes(term) || denunciado.includes(term) || hechos.includes(term);
      }
      return true;
    })
    .sort((a, b) => {
      const fa = new Date(a.fechaArchivo).getTime();
      const fb = new Date(b.fechaArchivo).getTime();
      return ordenarPor === 'reciente' ? fb - fa : fa - fb;
    });

  const totalNoticias = items.filter(i => i.tipo === 'noticia').length;
  const totalProcesos = items.filter(i => i.tipo === 'proceso').length;

  return (
    <div className="flex-1 overflow-hidden flex flex-col px-4 pb-4">
      {/* Header con estadísticas */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#003DA5' }}
            >
              <Archive className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Registro de Archivados</h3>
              <p className="text-xs text-gray-500">
                {items.length} elemento{items.length !== 1 ? 's' : ''} archivado{items.length !== 1 ? 's' : ''} —
                {totalNoticias} noticia{totalNoticias !== 1 ? 's' : ''}, {totalProcesos} proceso{totalProcesos !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Controles de filtro y búsqueda */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={searchArchivo}
                onChange={(e) => setSearchArchivo(e.target.value)}
                placeholder="Buscar archivado..."
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5]/20 outline-none transition-all w-48"
              />
            </div>

            {/* Filtro por tipo */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-gray-100">
              {([
                { value: 'todos', label: 'Todos' },
                { value: 'noticia', label: 'Noticias' },
                { value: 'proceso', label: 'Procesos' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFiltroTipo(opt.value)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${filtroTipo === opt.value
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-500 hover:bg-gray-200'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Orden */}
            <button
              onClick={() => setOrdenarPor(prev => prev === 'reciente' ? 'antiguo' : 'reciente')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-gray-600 bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-all"
              title={ordenarPor === 'reciente' ? 'Más recientes primero' : 'Más antiguos primero'}
            >
              <History className="w-3 h-3" />
              {ordenarPor === 'reciente' ? 'Recientes' : 'Antiguos'}
            </button>
          </div>
        </div>
      </div>

      {/* Lista de archivados */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white">
        {itemsFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
              <Archive className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-sm font-bold text-gray-400 mb-1">
              {items.length === 0 ? 'Sin elementos archivados' : 'Sin resultados'}
            </p>
            <p className="text-xs text-gray-400 text-center max-w-xs">
              {items.length === 0
                ? 'Las noticias y procesos que archives aparecerán aquí para consulta y trazabilidad.'
                : 'Intenta con otros términos de búsqueda o cambia los filtros.'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {/* Cabecera de tabla */}
            {!isMobile && (
              <div className="grid grid-cols-[auto_1fr_140px_140px_120px_120px_100px] gap-3 px-4 py-2.5 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider sticky top-0 z-10 border-b border-gray-200">
                <div className="w-8">Tipo</div>
                <div>Identificación / Detalle</div>
                <div>Denunciado</div>
                <div>Profesional</div>
                <div>Fecha Archivo</div>
                <div>Tiempo en Flujo</div>
                <div className="text-center">Acciones</div>
              </div>
            )}

            {itemsFiltrados.map((item, index) => {
              const isNoticia = item.tipo === 'noticia';
              const numero = isNoticia ? item.numero : item.numeroProceso;
              const denunciado = typeof item.denunciado === 'string'
                ? item.denunciado
                : item.denunciado?.nombre || '—';
              const profesional = isNoticia
                ? '—'
                : (typeof item.profesionalAsignado === 'string'
                  ? item.profesionalAsignado
                  : item.profesionalAsignado?.nombre || '—');
              const fechaArchivo = item.fechaArchivo
                ? new Date(item.fechaArchivo).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—';
              const fechaInicio = isNoticia ? item.fechaRecepcion : (item.fechaCreacion || item.fechaInicio);
              const diasEnFlujo = fechaInicio
                ? Math.floor((new Date(item.fechaArchivo).getTime() - new Date(fechaInicio).getTime()) / (1000 * 60 * 60 * 24))
                : 0;
              const hechos = item.hechos || '—';

              if (isMobile) {
                return (
                  <div key={item.id} className="p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          backgroundColor: isNoticia ? '#FEF3C7' : '#DBEAFE',
                        }}
                      >
                        {isNoticia
                          ? <FileText className="w-4 h-4" style={{ color: '#D97706' }} />
                          : <Scale className="w-4 h-4" style={{ color: '#003DA5' }} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-gray-900 truncate">{numero}</span>
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                            style={{
                              backgroundColor: isNoticia ? '#FEF3C7' : '#DBEAFE',
                              color: isNoticia ? '#92400E' : '#1E40AF'
                            }}
                          >
                            {isNoticia ? 'Noticia' : 'Proceso'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate mb-1.5">{hechos}</p>
                        <div className="flex items-center gap-3 text-[10px] text-gray-400">
                          <span>{fechaArchivo}</span>
                          <span>{diasEnFlujo}d en flujo</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <KanbanButtonTertiary compact onClick={() => onVerDetalles(item)} icon={<Eye className="w-3.5 h-3.5" />} title="Ver detalles" className="!flex-none !w-8" />
                        <KanbanButtonSemantic variant="success" onClick={() => onDesarchivar(item)} icon={<RefreshCw className="w-3.5 h-3.5" />} title="Restaurar al flujo activo" className="!w-auto !px-2 !py-1.5" />
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[auto_1fr_140px_140px_120px_120px_100px] gap-3 px-4 py-3 items-center hover:bg-gray-50/80 transition-colors group"
                >
                  {/* Tipo */}
                  <div className="w-8">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: isNoticia ? '#FEF3C7' : '#DBEAFE',
                      }}
                    >
                      {isNoticia
                        ? <FileText className="w-3.5 h-3.5" style={{ color: '#D97706' }} />
                        : <Scale className="w-3.5 h-3.5" style={{ color: '#003DA5' }} />
                      }
                    </div>
                  </div>

                  {/* Identificación / Detalle */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-gray-900 truncate">{numero}</span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0"
                        style={{
                          backgroundColor: isNoticia ? '#FEF3C7' : '#DBEAFE',
                          color: isNoticia ? '#92400E' : '#1E40AF'
                        }}
                      >
                        {isNoticia ? 'Noticia' : 'Proceso'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate">{hechos}</p>
                  </div>

                  {/* Denunciado */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-3 h-3 text-gray-400" />
                      </div>
                      <span className="text-[11px] text-gray-700 truncate">{denunciado}</span>
                    </div>
                  </div>

                  {/* Profesional */}
                  <div className="min-w-0">
                    <span className="text-[11px] text-gray-600 truncate block">{profesional}</span>
                  </div>

                  {/* Fecha Archivo */}
                  <div>
                    <span className="text-[11px] text-gray-600">{fechaArchivo}</span>
                  </div>

                  {/* Tiempo en Flujo */}
                  <div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-[11px] font-semibold text-gray-600">{diasEnFlujo} días</span>
                    </div>
                  </div>

                  {/* Acciones — Design Standard */}
                  <div className="flex items-center justify-center gap-1">
                    <KanbanButtonSecondary onClick={() => onVerDetalles(item)} icon={<Eye className="w-3 h-3" />} title="Ver detalles" className="!text-[10px] !px-2 !py-1">
                      Ver
                    </KanbanButtonSecondary>
                    <KanbanButtonSemantic variant="success" onClick={() => onDesarchivar(item)} icon={<RefreshCw className="w-3 h-3" />} title="Restaurar al flujo activo" className="!text-[10px] !px-2 !py-1">
                      Restaurar
                    </KanbanButtonSemantic>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== SELECTOR DE ETAPA (Vista Lista) ====================
const ETAPAS_LISTA: { nombre: string; color: string; bg: string }[] = [
  { nombre: 'Recepción', color: '#6B7280', bg: '#F3F4F6' },
  { nombre: 'Valoración', color: '#D97706', bg: '#FEF3C7' },
  { nombre: 'Indagación', color: '#2563EB', bg: '#DBEAFE' },
  { nombre: 'Investigación', color: '#003DA5', bg: '#E0EDFF' },
  { nombre: 'Juzgamiento', color: '#7C3AED', bg: '#EDE9FE' },
  { nombre: 'Fallo', color: '#059669', bg: '#D1FAE5' },
];

function EtapaSelector({ etapaActual, etapasConfig, onCambiarEtapa }: {
  etapaActual: string;
  etapasConfig?: any[];
  onCambiarEtapa: (nuevaEtapa: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const normalizeStage = (value: string) =>
    value
      ?.toString()
      .normalize('NFD')
      .replace(/[ -]/g, (c) => c)
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

  const stageLabelMapLocal: Record<string, string> = {
    RECEPCION: 'Recepción',
    VALORACION: 'Valoración',
    INDAGACION_PREVIA: 'Indagación',
    INVESTIGACION: 'Investigación',
    EVALUACION: 'Evaluación',
    JUZGAMIENTO: 'Juzgamiento',
    SEGUNDA_INSTANCIA: 'Segunda Instancia',
    FALLO: 'Fallo',
    ARCHIVO: 'Archivo'
  };

  const formatStageLabel = (stage: string) => {
    if (!stage) return '';
    const normalized = stage.trim();
    if (stageLabelMapLocal[normalized]) return stageLabelMapLocal[normalized];
    if (normalized.includes('_')) {
      return normalized
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const stageColorMap: Record<string, { color: string; bg: string }> = {
    Recepción: { color: '#6B7280', bg: '#F3F4F6' },
    Valoración: { color: '#6B7280', bg: '#F3F4F6' },
    Indagación: { color: '#6B7280', bg: '#F3F4F6' },
    Investigación: { color: '#003DA5', bg: '#DBEAFE' },
    Evaluación: { color: '#6B7280', bg: '#F3F4F6' },
    Juzgamiento: { color: '#7C3AED', bg: '#EDE9FE' },
    'Segunda Instancia': { color: '#6B7280', bg: '#F3F4F6' },
    Fallo: { color: '#059669', bg: '#D1FAE5' },
    Archivo: { color: '#059669', bg: '#D1FAE5' }
  };

  const etapasOrdenadas = etapasConfig && etapasConfig.length > 0
    ? [...etapasConfig]
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
      .map((etapa) => {
        const raw = etapa.etapa || etapa.nombre || etapa.label || '';
        const nombre = formatStageLabel(raw);
        const palette = stageColorMap[nombre] || { color: '#374151', bg: '#F9FAFB' };
        return {
          nombre,
          color: etapa.color || palette.color,
          bg: etapa.bg || palette.bg
        };
      })
    : ETAPAS_LISTA;

  const etapaActualNormalizada = normalizeStage(formatStageLabel(etapaActual));
  const currentIdxFound = etapasOrdenadas.findIndex(e => normalizeStage(e.nombre) === etapaActualNormalizada);
  const currentIdx = currentIdxFound === -1 ? 0 : currentIdxFound;
  const current = etapasOrdenadas[currentIdx] || etapasOrdenadas[0];

  useEffect(() => {
    if (!abierto) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [abierto]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setAbierto(!abierto)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold border transition-all hover:shadow-sm group"
        style={{
          background: current.bg,
          color: current.color,
          borderColor: `${current.color}33`,
        }}
        title="Cambiar etapa del proceso"
      >
        {formatStageLabel(etapaActual)}
        <ChevronDown className={`w-3 h-3 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full mt-1 z-50 w-44 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden"
          >
            <div className="px-2.5 py-1.5 border-b border-gray-100 bg-gray-50">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Cambiar Etapa</p>
            </div>
            {etapasOrdenadas.map((etapa, idx) => {
              const isActive = normalizeStage(etapa.nombre) === etapaActualNormalizada;
              const isPast = idx < currentIdx;
              const isNext = idx === currentIdx + 1;
              return (
                <button
                  key={etapa.nombre}
                  onClick={() => {
                    if (!isActive) {
                      onCambiarEtapa(etapa.nombre);
                    }
                    setAbierto(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-left transition-all ${isActive
                    ? 'font-black bg-blue-50'
                    : 'font-medium hover:bg-gray-50'
                    }`}
                  style={{ color: isActive ? current.color : '#374151' }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 border-2"
                    style={{
                      backgroundColor: isActive ? etapa.color : isPast ? etapa.color : 'transparent',
                      borderColor: etapa.color,
                      opacity: isActive || isPast ? 1 : 0.4,
                    }}
                  />
                  <span className="flex-1 truncate">{etapa.nombre}</span>
                  {isActive && (
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: '#003DA5' }}>
                      ACTUAL
                    </span>
                  )}
                  {isNext && !isActive && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#DBEAFE', color: '#003DA5' }}>
                      SIG.
                    </span>
                  )}
                  {isPast && !isActive && (
                    <CheckCircle className="w-3 h-3 flex-shrink-0 opacity-40" style={{ color: etapa.color }} />
                  )}
                </button>
              );
            })}
            <div className="px-2.5 py-1.5 border-t border-gray-100 bg-gray-50">
              <p className="text-[8px] text-gray-400 leading-tight">
                <AlertTriangle className="w-2.5 h-2.5 inline-block mr-0.5 -mt-0.5" />
                Los cambios quedan registrados en trazabilidad
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================
// --- FUNCIONES UTILITARIAS DE MAPEOPROCESO_MIGRADO ---
export const toNoticiaFromApi = (noticia: ApiNoticia): Noticia => {
  const fechaRecepcion = (noticia as any)?.fechaRecepcion;
  const fecha = fechaRecepcion ? new Date(fechaRecepcion) : new Date();
  const hoy = new Date();
  const dias = Math.max(1, Math.ceil((hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24)));
  const denuncianteFuente: any = (noticia as any).denunciante;
  const disciplinableFuente: any = (noticia as any).disciplinable || (noticia as any).denunciado;
  const denuncianteList = Array.isArray(denuncianteFuente) ? denuncianteFuente : (denuncianteFuente ? [denuncianteFuente] : []);
  const disciplinableList = Array.isArray(disciplinableFuente) ? disciplinableFuente : (disciplinableFuente ? [disciplinableFuente] : []);
  const denuncianteRaw: any = denuncianteList[0] || {};
  const denunciadoRaw: any = disciplinableList[0] || {};
  const fechaQuejaRaw = (noticia as any).fechaQueja;
  const fechaQueja = fechaQuejaRaw ? new Date(fechaQuejaRaw) : undefined;

  const mapDetalle = (rawItem: any): NoticiaPersonaDetalle => ({
    nombre: rawItem.nombre || 'Sin nombre',
    cedula: rawItem.cedula || rawItem.numeroIdentificacion || rawItem.identificacion,
    cargo: rawItem.cargo,
    dependencia: rawItem.dependencia,
    email: rawItem.email,
    telefono: rawItem.telefono,
    direccion: rawItem.direccion,
    entidad: rawItem.entidad
  });

  const mapEstadoNoticia = (estado?: ApiNoticia['estado']) => {
    switch (estado) {
      case 'ASIGNADA': return 'asignada';
      case 'EN_VALORACION': return 'en-valoracion';
      case 'DEVUELTA': return 'devuelta' as any;
      case 'ARCHIVADA': return 'archivada';
      default: return 'pendiente';
    }
  };

  return {
    id: (noticia as any).id || `n${Date.now()}`,
    numero: (noticia as any).radicado || (noticia as any).numero || `ND-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
    fechaRecepcion: fecha.toISOString().split('T')[0],
    fechaQueja: fechaQueja ? fechaQueja.toISOString().split('T')[0] : undefined,
    origen: (noticia as any).origen || 'Noticia',
    territorial: (noticia as any).territorial,
    dependenciaDenunciado: (noticia as any).dependenciaDenunciado,
    denunciante: {
      nombre: denuncianteRaw.nombre || 'Sin denunciante',
      tipoIdentificacion: denuncianteRaw.tipoIdentificacion || 'CC',
      numeroIdentificacion: denuncianteRaw.cedula || denuncianteRaw.numeroIdentificacion || denuncianteRaw.identificacion || denuncianteRaw.telefono || 'N/A'
    },
    denunciado: {
      nombre: denunciadoRaw.nombre || 'Sin disciplinable',
      tipoIdentificacion: denunciadoRaw.tipoIdentificacion || 'CC',
      numeroIdentificacion: denunciadoRaw.cedula || denunciadoRaw.numeroIdentificacion || denunciadoRaw.identificacion || 'N/A'
    },
    denunciantes: denuncianteList.map(mapDetalle),
    disciplinables: disciplinableList.map(mapDetalle),
    hechos: (noticia as any).hechos || '',
    conductas: (noticia as any).conductas || [],
    adjuntos: (noticia as any).adjuntos || [],
    estado: mapEstadoNoticia((noticia as any).estado) as any,
    prioridad: (noticia as any).prioridad || 'media',
    diasPendientes: (noticia as any).diasPendientes ?? dias,
    tipo: 'noticia',
    kanbanStage: (noticia as any).kanbanStage,
    etapaActual: (noticia as any).kanbanStage || (noticia as any).etapaActual || 'Recepcion',
    procesoAsociado: (noticia as any).procesoAsociadoId ? {
      id: (noticia as any).procesoAsociadoId,
      numeroProceso: (noticia as any).procesoAsociadoNumero || '',
      fechaAsociacion: (noticia as any).procesoAsociadoFecha ? new Date((noticia as any).procesoAsociadoFecha).toISOString() : undefined,
      justificacion: (noticia as any).procesoAsociadoJustificacion || ''
    } : undefined
  };
};

export const normalizeNoticia = (raw: any): Noticia => {
  const denuncianteFuente = raw.denunciantes || raw.denunciante;
  const disciplinableFuente = raw.disciplinables || raw.disciplinable || raw.denunciado;
  const denuncianteList = Array.isArray(denuncianteFuente) ? denuncianteFuente : (denuncianteFuente ? [denuncianteFuente] : []);
  const disciplinableList = Array.isArray(disciplinableFuente) ? disciplinableFuente : (disciplinableFuente ? [disciplinableFuente] : []);
  const denuncianteRaw = denuncianteList[0] || {};
  const denunciadoRaw = disciplinableList[0] || {};

  const mapDetalle = (item: any): NoticiaPersonaDetalle => ({
    nombre: item.nombre || 'Sin nombre',
    cedula: item.cedula || item.numeroIdentificacion || item.identificacion,
    cargo: item.cargo,
    dependencia: item.dependencia,
    email: item.email,
    telefono: item.telefono,
    direccion: item.direccion,
    entidad: item.entidad
  });

  return {
    ...raw,
    tipo: raw.tipo || 'noticia',
    fechaQueja: raw.fechaQueja || raw.fechaRecepcion,
    territorial: raw.territorial,
    dependenciaDenunciado: raw.dependenciaDenunciado,
    denunciantes: denuncianteList.map(mapDetalle),
    disciplinables: disciplinableList.map(mapDetalle),
    denunciante: {
      nombre: denuncianteRaw.nombre || 'Sin nombre',
      tipoIdentificacion: denuncianteRaw.tipoIdentificacion || 'CC',
      numeroIdentificacion: denuncianteRaw.numeroIdentificacion || denuncianteRaw.cedula || denuncianteRaw.identificacion || 'Sin identificacion'
    },
    denunciado: {
      nombre: denunciadoRaw.nombre || raw.disciplinable?.nombre || 'Sin nombre',
      tipoIdentificacion: denunciadoRaw.tipoIdentificacion || 'CC',
      numeroIdentificacion: denunciadoRaw.numeroIdentificacion || denunciadoRaw.cedula || denunciadoRaw.identificacion || raw.disciplinable?.cedula || 'Sin identificacion',
      cargo: denunciadoRaw.cargo || raw.disciplinable?.cargo || 'Sin cargo'
    },
    hechos: raw.hechos || raw.descripcionHechos || '',
    conductas: raw.conductas || raw.conductasSeleccionadas || [],
    prioridad: raw.prioridad || 'media',
    diasPendientes: raw.diasPendientes || 0,
    etapaActual: raw.kanbanStage || raw.etapaActual || 'Recepcion',
    estado: raw.estado || 'pendiente',
    adjuntos: raw.adjuntos || []
  };
};

export const toProcesoFromApi = (proceso: ApiProceso, currentStages: any[] = []): Proceso => {
  const stageLabelMap: Record<string, string> = { RECEPCION: 'Recepción', VALORACION: 'Valoración', INDAGACION_PREVIA: 'Indagación', INVESTIGACION: 'Investigación', EVALUACION: 'Evaluación', JUZGAMIENTO: 'Juzgamiento', INDAGACION: 'Indagación', FALLO: 'Fallo', SEGUNDA_INSTANCIA: 'Segunda Instancia' };
  let etapa = proceso.kanbanStage || proceso.etapaActual;

  const normComp = (s: string) => s?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase() || '';
  const match = currentStages.find(s => s.etapa === etapa || normComp(s.etapa) === normComp(etapa));
  if (match) {
    etapa = match.etapa;
  } else {
    etapa = stageLabelMap[etapa] || etapa;
    if (etapa === etapa.toUpperCase() && etapa.length > 3) {
      etapa = etapa.charAt(0).toUpperCase() + etapa.slice(1).toLowerCase();
    }
  }

  const fechaVenc = proceso.fechaVencimientoEtapa ? new Date(proceso.fechaVencimientoEtapa) : null;
  const fechaCreacion = proceso.createdAt ? new Date(proceso.createdAt) : new Date();
  const hoy = new Date();
  const diasRestantes = fechaVenc ? Math.ceil((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  const porcentajeTiempo = proceso.timePercentage !== undefined
    ? Math.round(proceso.timePercentage)
    : (() => {
      const totalDias = fechaVenc ? Math.max(1, Math.round((fechaVenc.getTime() - fechaCreacion.getTime()) / (1000 * 60 * 60 * 24))) : 1;
      const transcurridos = totalDias - diasRestantes;
      return Math.min(100, Math.max(0, Math.round((transcurridos / totalDias) * 100)));
    })();

  const semaforo: 'verde' | 'amarillo' | 'rojo' = diasRestantes <= 0 ? 'rojo' : (diasRestantes <= 7 || porcentajeTiempo >= 80 ? 'amarillo' : 'verde');
  const abogado = proceso.abogadoAsignadoNombre || (proceso as any).abogadoAsignado?.nombreCompleto || 'Sin asignar';
  const denuncianteData = Array.isArray(proceso.news?.denunciante) ? proceso.news?.denunciante?.[0] : proceso.news?.denunciante;
  const disciplinableData = Array.isArray(proceso.news?.disciplinable) ? proceso.news?.disciplinable?.[0] : proceso.news?.disciplinable;

  return {
    id: proceso.id,
    numeroProceso: proceso.radicadoProceso,
    noticiaOrigen: proceso.news?.radicado || 'N/A',
    denunciante: {
      nombre: (denuncianteData as any)?.nombre || 'Sin denunciante',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: (denuncianteData as any)?.cedula || 'N/A'
    },
    denunciado: {
      nombre: (disciplinableData as any)?.nombre || 'Sin disciplinable',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: (disciplinableData as any)?.cedula || 'N/A'
    },
    cedula: (disciplinableData as any)?.cedula || 'N/A',
    etapaActual: etapa as any,
    estadoActual: proceso.estado || 'ACTIVO',
    profesionalAsignado: {
      nombre: abogado,
      tipoIdentificacion: 'CC',
      numeroIdentificacion: (proceso as any).abogadoAsignado?.id || '',
    },
    semaforo,
    diasRestantes,
    porcentajeTiempo,
    borradores: proceso.draftsCount !== undefined ? Array(proceso.draftsCount).fill({}) : [],
    documentos: proceso.documentsCount !== undefined ? Array(proceso.documentsCount).fill({}) : [],
    pendienteAprobacion: false,
    ultimaActuacion: proceso.ultimaActuacion || 'Sin actuaciones registradas',
    fechaCreacion: fechaCreacion.toISOString().split('T')[0],
    tipo: 'proceso',
    kanbanStage: proceso.kanbanStage,
    hechos: proceso.news?.hechos,
    kanbanNotice: proceso.kanbanNotice || null,
    procesoAsociadoId: proceso.procesoAsociadoId,
    procesoAsociadoNumero: proceso.procesoAsociadoNumero,
    procesoAsociadoTipo: proceso.procesoAsociadoTipo,
    procesoAsociadoFecha: proceso.procesoAsociadoFecha,
    procesoAsociadoJustificacion: proceso.procesoAsociadoJustificacion,
  };
};

// ==================== COMPONENTE PRINCIPAL ====================
export function DashboardKanbanOperativo({
  onNavigateToExpediente,
  filtroProfesionalId,
  onEnviarARevision,
  onNavigateToRevision,
  revisionLog,
}: {
  onNavigateToExpediente?: () => void;
  filtroProfesionalId?: string | null;
  onEnviarARevision?: (borrador: BorradorPendiente) => void;
  onNavigateToRevision?: () => void;
  revisionLog?: { borradorId: string; procesoId: string; accion: 'aprobado' | 'devuelto'; comentarios: string; motivo?: string; fecha: string }[];
}) {
  // ✅ NUEVO: Hook responsive centralizado
  const { isMobile, isTablet, isDesktop, width } = useResponsive();

  // ✅ DATOS DESDE BACKEND (API REST) - Carga lazy desde disciplinaryService
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [itemSeleccionado, setItemSeleccionado] = useState<any>(null);
  const [tipoVista, setTipoVista] = useState<'kanban' | 'lista' | 'archivados'>('kanban');

  // ✅ Auto-switch from kanban to lista on mobile
  useEffect(() => {
    if (isMobile && tipoVista === 'kanban') {
      setTipoVista('lista');
    }
  }, [isMobile, tipoVista]);

  // ✅ Medir ancho REAL del contenedor (no del viewport)
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(width);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // ✅ ESTADO PARA MODALES
  const [modalActivo, setModalActivo] = useState<ModalType>(null);

  // ✅ BÚSQUEDA GLOBAL COLAPSABLE — ícono → campo expandido
  const [busquedaGlobal, setBusquedaGlobal] = useState('');
  const [showBusquedaGlobal, setShowBusquedaGlobal] = useState(false);
  const busquedaInputRef = useRef<HTMLInputElement>(null);
  const kanbanScrollRef = useRef<HTMLDivElement>(null);

  // ✅ CSS PARA SCROLL VERTICAL AZUL
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .kanban-column-scroll::-webkit-scrollbar {
        width: 8px;
      }
      .kanban-column-scroll::-webkit-scrollbar-track {
        background: #F1F5F9;
        border-radius: 4px;
      }
      .kanban-column-scroll::-webkit-scrollbar-thumb {
        background: #2962FF;
        border-radius: 4px;
      }
      .kanban-column-scroll::-webkit-scrollbar-thumb:hover {
        background: #003DA5;
      }
      .kanban-column-scroll::-webkit-scrollbar-thumb:active {
        background: #002266;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);




  // ✅ FILTRO POR TIPO: todos, noticia, proceso
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'noticia' | 'proceso'>('todos');

  const navegarKanban = (direccion: 'prev' | 'next') => {
    const container = kanbanScrollRef.current;
    if (!container) return;
    const scrollAmount = container.clientWidth * 0.75;
    container.scrollBy({ left: direccion === 'next' ? scrollAmount : -scrollAmount, behavior: 'smooth' });
  };

  // ✅ Archivados: inician vacíos, se llenan al archivar noticias/procesos (persistido en Supabase vía update de estado)
  const [itemsArchivados, setItemsArchivados] = useState<Array<Item & { fechaArchivo: string; motivoArchivo: string }>>([]);
  const [vistaCompacta, setVistaCompacta] = useState(false);
  const [columnasColapsadas, setColumnasColapsadas] = useState<Set<string>>(new Set());
  const [tarjetasColapsadas, setTarjetasColapsadas] = useState<Set<string>>(new Set()); // NUEVO: Estado para tarjetas colapsadas

  // ✅ NUEVO: Estado para editar noticias y procesos (usa el mismo modal)
  const [noticiaAEditar, setNoticiaAEditar] = useState<Noticia | null>(null);
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);

  // ✅ NUEVO: Estado para modal de confirmación de restauración
  const [itemParaRestaurar, setItemParaRestaurar] = useState<any>(null);
  const [mostrarModalRestaurar, setMostrarModalRestaurar] = useState(false);

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
  const [isConvirtiendo, setIsConvirtiendo] = useState(false); // ✅ NUEVO: Estado para prevenir duplicados
  const [isRemitiendo, setIsRemitiendo] = useState(false); // ✅ NUEVO: Estado para loading de remisión

  // ✅ NUEVO: Estado para entidades de remisión configuradas (cargadas desde backend)
  const [entidadesRemision, setEntidadesRemision] = useState<EntidadRemision[]>([]);
  const [entidadesLoading, setEntidadesLoading] = useState(true);
  const [entidadesError, setEntidadesError] = useState<string | null>(null);

  // ✅ NUEVO: Estado para profesionales cargados desde el backend
  const [profesionalesList, setProfesionalesList] = useState<{ id: string; nombre: string }[]>([]);
  const [profesionalesLoading, setProfesionalesLoading] = useState(true);

  // ✅ NUEVO: Estado para solicitudes de reasignación pendientes
  const [solicitudesReasignacion, setSolicitudesReasignacion] = useState<any[]>([]);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<any>(null);

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

  // ✅ NUEVO: Cargar entidades de remisión desde el backend
  const cargarEntidadesRemision = async () => {
    setEntidadesLoading(true);
    setEntidadesError(null);
    try {
      const entidades = await entidadesRemisionService.getActivas();
      setEntidadesRemision(entidades);
    } catch (error: any) {
      console.error('Error al cargar entidades de remisión:', error);
      setEntidadesError(error?.message || 'Error al cargar entidades de remisión');
      // Fallback: intentar cargar desde localStorage si el backend falla
      try {
        const configString = localStorage.getItem('disciplinario-configuracion');
        if (configString) {
          const config = JSON.parse(configString);
          if (config.entidadesRemision) {
            setEntidadesRemision(config.entidadesRemision.filter((e: any) => e.activo));
          }
        }
      } catch (localError) {
        console.error('Error al cargar desde localStorage:', localError);
      }
    } finally {
      setEntidadesLoading(false);
    }
  };

  // ✅ NUEVO: Cargar profesionales desde el backend
  const cargarProfesionales = async () => {
    setProfesionalesLoading(true);
    try {
      const profesionales = await disciplinaryService.getProfesionales();
      console.log('[DashboardKanban] Profesionales recibidos del backend:', profesionales);

      // Mapear al formato esperado: { id, nombre }
      const profesionalesFormateados = profesionales.map((p: any) => ({
        id: p.id,
        nombre: p.nombreCompleto || p.nombre || p.email || `Profesional ${p.id}`
      }));

      console.log('[DashboardKanban] Profesionales formateados:', profesionalesFormateados);
      setProfesionalesList(profesionalesFormateados);
    } catch (error: any) {
      console.error('Error al cargar profesionales:', error);
      // Fallback vacío si falla
      setProfesionalesList([]);
    } finally {
      setProfesionalesLoading(false);
    }
  };

  useEffect(() => {
    cargarEntidadesRemision();
  }, []);

  // ✅ NUEVO: Cargar profesionales al inicio
  useEffect(() => {
    cargarProfesionales();
  }, []);

  // ✅ NUEVO: Cargar configuración de etapas desde el backend
  const [etapasConfig, setEtapasConfig] = useState<any[]>([]);
  const [etapasLoading, setEtapasLoading] = useState(true);
  const [datosCargados, setDatosCargados] = useState(false);

  // ✅ NUEVO: Función helper para obtener datos de arrays seguros (evita errores cuando backend retorna objeto en vez de array)
  const getDataArray = <T,>(data: any): T[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.data && Array.isArray(data.data)) return data.data;
    return [];
  };

  const cargarEtapas = async () => {
    setEtapasLoading(true);
    try {
      const etapas = await disciplinaryService.getStageConfiguration();
      const hasPermissionNoticia = authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_NOTICIAS_DISCIPLINARIAS_MANAGE)
      console.log('[DashboardKanban] Etapas cargadas desde backend:', etapas);
      // Si no tienen orden, asignar orden por defecto basado en índice
      const etapasOrdenadas = (getDataArray<any>(etapas) || []).map((etapa, idx) => ({
        ...etapa,
        orden: etapa.orden ?? (idx + 1)
      }));
      if (!hasPermissionNoticia) {
        etapasOrdenadas.shift()
      }
      setEtapasConfig(etapasOrdenadas);
    } catch (error: any) {
      console.error('Error al cargar etapas:', error);
      // Usar etapas por defecto si falla
      setEtapasConfig([]);
    } finally {
      setEtapasLoading(false);
    }
  };

  // ✅ NUEVO: Cargar noticias y procesos desde el backend
  const cargarDatos = async () => {
    setLoading(true);
    setDataError(null);
    try {
      const canViewAll = authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_VIEW_ALL);
      const canViewMine = authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_VIEW_MINE);
      const hasPermissionNoticia = authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_NOTICIAS_DISCIPLINARIAS_MANAGE);
      
      console.log('hasPermissionNoticia', hasPermissionNoticia);
      console.log('canViewAll', canViewAll);
      console.log('canViewMine', canViewMine);
      
      const user = authService.getUser();
      const currentUserId = user?.id;

      // Cargar noticias y procesos en paralelo (filtrados por profesional si hay filtro activo o permiso restringido)
      const [noticiasRaw, procesosRaw] = await Promise.all([
        hasPermissionNoticia ?
          (filtroProfesionalId || (!canViewAll && canViewMine && currentUserId))
            ? disciplinaryService.getMisNoticias(filtroProfesionalId || currentUserId)
            : disciplinaryService.getAllNoticias()
          : [],
        (filtroProfesionalId || (!canViewAll && canViewMine && currentUserId))
          ? disciplinaryService.getMisProcesos(filtroProfesionalId || currentUserId)
          : disciplinaryService.getAllProcesos()
      ]);

      const noticiasData = getDataArray<ApiNoticia>(noticiasRaw);
      const procesosData = getDataArray<ApiProceso>(procesosRaw);

      console.log('[DashboardKanban] Noticias recibidas:', noticiasData.length);
      console.log('[DashboardKanban] Procesos recibidos:', procesosData.length);

      // Filtrar solo items activos
      const noticiasFiltradas = noticiasData.filter(n => (n as any).activo !== false);
      const procesosFiltrados = procesosData.filter(p => (p as any).activo !== false);

      // Separar noticias archivadas de las activas. Excluir ASIGNADA porque ya tienen proceso asociado
      const noticiasActivas = noticiasFiltradas.filter(n => {
        const estado = (n as any).estado;
        return estado !== 'ARCHIVADA' && estado !== 'ASIGNADA';
      });
      const noticiasArchivadas = noticiasFiltradas.filter(n => (n as any).estado === 'ARCHIVADA');

      // Transformar noticias al formato interno
      const noticiasTransformadas = noticiasActivas.map(n => toNoticiaFromApi(n, etapasConfig));
      const archivadosTransformados = noticiasArchivadas.map(n => ({
        ...toNoticiaFromApi(n, etapasConfig),
        fechaArchivo: (n as any).updatedAt || new Date().toISOString(),
        motivoArchivo: (n as any).motivoArchivo || 'Archivado'
      }));

      // Transformar procesos al formato interno
      const procesosTransformados = procesosFiltrados.map(p => toProcesoFromApi(p, etapasConfig));

      // Separar procesos archivados (en etapa 'Archivo') de los activos
      const procesosActivos = procesosTransformados.filter(p =>
        p.etapaActual !== 'Archivo' && p.estadoActual !== 'ARCHIVADO'
      );
      const procesosArchivados = procesosTransformados.filter(p =>
        p.etapaActual === 'Archivo' || p.estadoActual === 'ARCHIVADO'
      );

      // Transformar procesos archivados al formato de archivados
      const procesosArchivadosTransformados = procesosArchivados.map(p => ({
        ...p,
        fechaArchivo: (p as any).fechaCreacion || new Date().toISOString(),
        motivoArchivo: 'Completado - Archivo'
      }));

      // Combinar noticias y procesos activos
      const todosLosItems: Item[] = [
        ...noticiasTransformadas,
        ...procesosActivos
      ];

      // Combinar archivados de noticias y procesos
      const todosLosArchivados = [
        ...archivadosTransformados,
        ...procesosArchivadosTransformados
      ];

      console.log('[DashboardKanban] Total items para Kanban:', todosLosItems.length);
      console.log('[DashboardKanban] Total items archivados:', todosLosArchivados.length);

      setItems(todosLosItems);
      setItemsArchivados(todosLosArchivados as any);
      setDatosCargados(true);
    } catch (error: any) {
      console.error('Error al cargar datos:', error);
      setDataError(error?.message || 'Error al cargar datos del servidor');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Cargar etapas primero, luego cargar datos cuando estén listas
  useEffect(() => {
    cargarEtapas();
  }, []);

  // ✅ NUEVO: Cargar noticias y procesos cuando las etapas estén listas
  useEffect(() => {
    if (!etapasLoading && etapasConfig !== undefined) {
      cargarDatos();
    }
  }, [etapasLoading, etapasConfig]);

  // ==================== TRANSFORMADORES DE DATOS DESDE API ====================
  const stageLabelMap: Record<string, string> = {
    RECEPCION: 'Recepción',
    VALORACION: 'Valoración',
    INDAGACION_PREVIA: 'Indagación',
    INVESTIGACION: 'Investigación',
    EVALUACION: 'Evaluación',
    JUZGAMIENTO: 'Juzgamiento',
    INDAGACION: 'Indagación',
    FALLO: 'Fallo',
    SEGUNDA_INSTANCIA: 'Segunda Instancia'
  };

  // Normalizar estado de noticia
  const mapEstadoNoticia = (estado?: string) => {
    switch (estado) {
      case 'ASIGNADA':
        return 'asignada';
      case 'EN_VALORACION':
        return 'en-valoracion';
      case 'DEVUELTA':
        return 'devuelta';
      case 'ARCHIVADA':
        return 'archivada';
      case 'REMITIDA':
        return 'remitida';
      default:
        return 'pendiente';
    }
  };

  // Transformar noticia desde API al formato interno
  // ✅ MEJORADA: Usa la primera etapa de etapasConfig cuando no viene del backend
  const toNoticiaFromApi = (noticia: ApiNoticia, currentStages: any[] = []): Noticia => {
    const fechaRecepcion = (noticia as any)?.fechaRecepcion;
    const fecha = fechaRecepcion ? new Date(fechaRecepcion) : new Date();
    const hoy = new Date();
    const dias = Math.max(1, Math.ceil((hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24)));

    const denuncianteFuente: any = (noticia as any).denunciante;
    const disciplinableFuente: any = (noticia as any).disciplinable || (noticia as any).denunciado;
    const denuncianteList = Array.isArray(denuncianteFuente) ? denuncianteFuente : (denuncianteFuente ? [denuncianteFuente] : []);
    const disciplinableList = Array.isArray(disciplinableFuente) ? disciplinableFuente : (disciplinableFuente ? [disciplinableFuente] : []);
    const denuncianteRaw: any = denuncianteList[0] || {};
    const denunciadoRaw: any = disciplinableList[0] || {};
    const fechaQuejaRaw = (noticia as any).fechaQueja;
    const fechaQueja = fechaQuejaRaw ? new Date(fechaQuejaRaw) : undefined;

    // ✅ OBTENER ETAPA: usar kanbanStage del backend, o buscar en stages, o usar primera etapa config
    let etapaRaw = (noticia as any).kanbanStage || (noticia as any).etapaActual;
    let etapaNormalizada: string;

    if (etapaRaw) {
      // Buscar coincidencia en etapas del backend por id o por nombre
      const match = currentStages.find(s => s.id === etapaRaw || s.etapa === etapaRaw || s.nombre === etapaRaw || s.etapa?.toUpperCase() === etapaRaw.toUpperCase() || s.nombre?.toUpperCase() === etapaRaw.toUpperCase());
      if (match) {
        etapaNormalizada = match.etapa || match.nombre || etapaRaw;
      } else {
        // Fallback a mapeo legacy
        etapaNormalizada = stageLabelMap[etapaRaw] || etapaRaw;
        // Fallback final: Title Case (solo si es uppercase)
        if (etapaNormalizada === etapaNormalizada.toUpperCase() && etapaNormalizada.length > 3) {
          etapaNormalizada = etapaNormalizada.charAt(0).toUpperCase() + etapaNormalizada.slice(1).toLowerCase();
        }
      }
    } else {
      // ✅ NUEVO: Si no hay etapa, usar la primera etapa de la configuración (menor orden)
      if (currentStages.length > 0) {
        const etapasOrdenadas = [...currentStages].sort((a, b) => (a.orden || 0) - (b.orden || 0));
        const primeraEtapa = etapasOrdenadas[0];
        etapaNormalizada = primeraEtapa?.etapa || primeraEtapa?.nombre || 'Recepcion';
      } else {
        etapaNormalizada = 'Recepcion';
      }
    }

    return {
      id: (noticia as any).id || `n${Date.now()}`,
      numero: (noticia as any).radicado || (noticia as any).numero || `ND-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
      fechaRecepcion: fecha.toISOString().split('T')[0],
      fechaQueja: fechaQueja ? fechaQueja.toISOString().split('T')[0] : undefined,
      origen: (noticia as any).origen || 'Noticia',
      territorial: (noticia as any).territorial,
      dependenciaDenunciado: (noticia as any).dependenciaDenunciado,
      denunciante: {
        nombre: denuncianteRaw.nombre || 'Sin denunciante',
        tipoIdentificacion: denuncianteRaw.tipoIdentificacion || 'CC',
        numeroIdentificacion: denuncianteRaw.cedula || denuncianteRaw.numeroIdentificacion || denuncianteRaw.identificacion || 'N/A'
      },
      denunciado: {
        nombre: denunciadoRaw.nombre || 'Sin disciplinable',
        tipoIdentificacion: denunciadoRaw.tipoIdentificacion || 'CC',
        numeroIdentificacion: denunciadoRaw.cedula || denunciadoRaw.numeroIdentificacion || 'N/A'
      },
      hechos: (noticia as any).hechos || '',
      estado: mapEstadoNoticia((noticia as any).estado) as any,
      prioridad: (noticia as any).prioridad || 'media',
      diasPendientes: (noticia as any).diasPendientes ?? dias,
      tipo: 'noticia' as const,
      etapaActual: etapaNormalizada,
      // ✅ NUEVO: Mapear campos de remisión por competencia
      numeroRC: (noticia as any).numeroRC || (noticia as any).radicadoRemision || undefined,
      entidadRemision: (noticia as any).entidadRemision || (noticia as any).entidadDestino || undefined,
      tipoRemision: (noticia as any).tipoRemision || (noticia as any).tipoRemisionPor || undefined,
      fechaRemision: (noticia as any).fechaRemision || (noticia as any).fechaRemisionPorCompetencia || undefined,
      fundamentoLegalRemision: (noticia as any).fundamentoLegalRemision || (noticia as any).fundamentoLegal || undefined,
      justificacionRemision: (noticia as any).justificacionRemision || (noticia as any).observacionesRemision || undefined,
      conductaSeleccionada: (noticia as any).conductas?.[0] || (noticia as any).conductaSeleccionada || '',
      archivosAdjuntos: ((noticia as any).adjuntos || []).map((path: string) => ({
        nombre: path.split('/').pop() || path,
        tipo: path.toLowerCase().includes('pdf') ? 'application/pdf' : path.toLowerCase().includes('jpg') || path.toLowerCase().includes('png') ? 'image' : path.toLowerCase().includes('mp4') || path.toLowerCase().includes('avi') ? 'video' : 'application/octet-stream',
        tamano: 0,
        fechaSubida: new Date().toISOString(),
        url: path,
        fullUrl: disciplinaryService.getFileUrl(path),
      }))
    };
  };

  // Normalizar noticia desde cualquier fuente
  const normalizeNoticia = (raw: any): Noticia => {
    const denuncianteFuente = raw.denunciantes || raw.denunciante;
    const disciplinableFuente = raw.disciplinables || raw.disciplinable || raw.denunciado;
    const denuncianteList = Array.isArray(denuncianteFuente) ? denuncianteFuente : (denuncianteFuente ? [denuncianteFuente] : []);
    const disciplinableList = Array.isArray(disciplinableFuente) ? disciplinableFuente : (disciplinableFuente ? [disciplinableFuente] : []);
    const denuncianteRaw = denuncianteList[0] || {};
    const denunciadoRaw = disciplinableList[0] || {};

    return {
      ...raw,
      tipo: raw.tipo || 'noticia',
      fechaQueja: raw.fechaQueja || raw.fechaRecepcion,
      territorial: raw.territorial,
      dependenciaDenunciado: raw.dependenciaDenunciado,
      denunciante: {
        nombre: denuncianteRaw.nombre || 'Sin nombre',
        tipoIdentificacion: denuncianteRaw.tipoIdentificacion || 'CC',
        numeroIdentificacion: denuncianteRaw.numeroIdentificacion || denuncianteRaw.cedula || 'Sin identificacion'
      },
      denunciado: {
        nombre: denunciadoRaw.nombre || 'Sin nombre',
        tipoIdentificacion: denunciadoRaw.tipoIdentificacion || 'CC',
        numeroIdentificacion: denunciadoRaw.numeroIdentificacion || denunciadoRaw.cedula || 'Sin identificacion',
        cargo: denunciadoRaw.cargo || 'Sin cargo'
      },
      hechos: raw.hechos || raw.descripcionHechos || '',
      conductas: raw.conductas || raw.conductasSeleccionadas || [],
      prioridad: raw.prioridad || 'media',
      diasPendientes: raw.diasPendientes || 0,
      etapaActual: raw.kanbanStage || raw.etapaActual || 'Recepción',
      estado: raw.estado || 'pendiente'
    };
  };

  // Transformar proceso desde API al formato interno
  const toProcesoFromApi = (proceso: ApiProceso, currentStages: any[] = []): Proceso => {
    let etapa = proceso.kanbanStage || proceso.etapaActual;

    // Si no hay etapa definida, usar 'Recepción' por defecto
    if (!etapa) {
      etapa = 'Recepción';
    } else {
      // Normalizar etapa: buscar coincidencia por id o por nombre en las etapas del backend
      const match = currentStages.find(s => s.id === etapa || s.etapa === etapa || s.nombre === etapa || s.etapa?.toUpperCase() === etapa.toUpperCase() || s.nombre?.toUpperCase() === etapa.toUpperCase());
      if (match) {
        etapa = match.etapa || match.nombre || etapa;
      } else {
        // Fallback a mapeo legacy
        etapa = stageLabelMap[etapa] || etapa;
        // Fallback final: Title Case (solo si es uppercase)
        if (etapa === etapa.toUpperCase() && etapa.length > 3) {
          etapa = etapa.charAt(0).toUpperCase() + etapa.slice(1).toLowerCase();
        }
      }
    }

    const fechaVenc = proceso.fechaVencimientoEtapa ? new Date(proceso.fechaVencimientoEtapa) : null;
    const fechaCreacion = proceso.createdAt ? new Date(proceso.createdAt) : new Date();
    const hoy = new Date();
    const diasRestantes = fechaVenc ? Math.ceil((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const porcentajeTiempo = proceso.timePercentage !== undefined
      ? Math.round(proceso.timePercentage)
      : (() => {
        const totalDias = fechaVenc ? Math.max(1, Math.round((fechaVenc.getTime() - fechaCreacion.getTime()) / (1000 * 60 * 60 * 24))) : 1;
        const transcurridos = totalDias - diasRestantes;
        return Math.min(100, Math.max(0, Math.round((transcurridos / totalDias) * 100)));
      })();

    const semaforo: 'verde' | 'amarillo' | 'rojo' = diasRestantes <= 0
      ? 'rojo'
      : (diasRestantes <= 7 || porcentajeTiempo >= 80 ? 'amarillo' : 'verde');

    const abogado = proceso.abogadoAsignadoNombre || (proceso as any).abogadoAsignado?.nombreCompleto || 'Sin asignar';

    // ✅ NUEVO: Mapear campos de asociación a proceso desde el backend
    const procesoAsociadoId = (proceso as any).procesoAsociadoId || undefined;
    const procesoAsociadoNumero = (proceso as any).procesoAsociadoNumero || undefined;
    const procesoAsociadoTipo = (proceso as any).procesoAsociadoTipo || undefined;
    const procesoAsociadoFecha = (proceso as any).procesoAsociadoFecha || undefined;

    // ✅ NUEVO: Mapear campos de consolidación
    const procesoConsolidadoPrincipal = (proceso as any).procesoConsolidadoPrincipal || undefined;
    const procesosConsolidados = (proceso as any).procesosConsolidados || undefined;
    const informacionConsolidada = (proceso as any).informacionConsolidada || undefined;

    return {
      id: proceso.id,
      numeroProceso: proceso.radicadoProceso,
      noticiaOrigen: proceso.news?.radicado || 'N/A',
      denunciante: {
        nombre: (proceso.news?.denunciante as any)?.nombre || 'Sin denunciante',
        tipoIdentificacion: 'CC',
        numeroIdentificacion: (proceso.news?.denunciante as any)?.cedula || 'N/A'
      },
      denunciado: {
        nombre: (proceso.news?.disciplinable as any)?.nombre || 'Sin disciplinable',
        tipoIdentificacion: 'CC',
        numeroIdentificacion: (proceso.news?.disciplinable as any)?.cedula || 'N/A'
      },
      cedula: (proceso.news?.disciplinable as any)?.cedula || 'N/A',
      etapaActual: etapa as any,
      estadoActual: proceso.estado || 'ACTIVO',
      profesionalAsignado: {
        nombre: abogado,
        tipoIdentificacion: 'CC',
        numeroIdentificacion: (proceso as any).abogadoAsignado?.id || '',
      },
      semaforo,
      diasRestantes,
      porcentajeTiempo,
      borradores: proceso.draftsCount !== undefined ? Array(proceso.draftsCount).fill({}) : [],
      documentos: proceso.documentsCount !== undefined ? Array(proceso.documentsCount).fill({}) : [],
      pendienteAprobacion: false,
      ultimaActuacion: proceso.ultimaActuacion || 'Sin actuaciones registradas',
      fechaCreacion: fechaCreacion.toISOString().split('T')[0],
      tipo: 'proceso' as const,
      hechos: proceso.news?.hechos,
      // ✅ NUEVO: Incluir campos de asociación
      procesoAsociadoId,
      procesoAsociadoNumero,
      procesoAsociadoTipo,
      procesoAsociadoFecha,
      // ✅ NUEVO: Incluir campos de consolidación
      procesoConsolidadoPrincipal,
      procesosConsolidados,
      informacionConsolidada,
    };
  };



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

  // ✅ ETAPAS: Si hay etapas configuradas en backend, usarlas ordenadas por 'orden'.
  // Si no hay config, usar valores por defecto
  const etapas = etapasConfig.length > 0
    ? etapasConfig
      .filter(etapa => etapa.activo !== false)
      .sort((a, b) => (a.orden || 0) - (b.orden || 0))
      .map((etapa) => ({
        nombre: etapa.etapa,
        color: etapa.color || '#6B7280',
        icono: getIconoPorEtapa(etapa.etapa),
        diasEstimados: etapa.diasHabiles || 0
      }))
    : [
      { nombre: 'Recepción', color: '#6B7280', icono: <FileCheck className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} />, diasEstimados: 3 },
      { nombre: 'Valoración', color: '#6B7280', icono: <Eye className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} />, diasEstimados: 10 },
      { nombre: 'Indagación', color: '#6B7280', icono: <Search className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} />, diasEstimados: 40 },
      { nombre: 'Investigación', color: '#003DA5', icono: <Scale className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} style={{ color: '#003DA5' }} />, diasEstimados: 60 },
      { nombre: 'Juzgamiento', color: '#6B7280', icono: <AlertTriangle className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} />, diasEstimados: 50 },
      { nombre: 'Fallo', color: '#6B7280', icono: <CheckCircle className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} />, diasEstimados: 10 },
      { nombre: 'Archivo', color: '#059669', icono: <CheckCircle className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-green-600`} />, diasEstimados: 0 }
    ];

  // ✅ Función helper para obtener icono según nombre de etapa
  function getIconoPorEtapa(nombreEtapa: string) {
    const nombre = nombreEtapa?.toLowerCase() || '';
    if (nombre.includes('recep')) return <FileCheck className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} />;
    if (nombre.includes('valora')) return <Eye className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} />;
    if (nombre.includes('indag')) return <Search className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} />;
    if (nombre.includes('investig')) return <Scale className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} style={{ color: '#003DA5' }} />;
    if (nombre.includes('juzg')) return <AlertTriangle className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} />;
    if (nombre.includes('fallo')) return <CheckCircle className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} />;
    if (nombre.includes('archiv')) return <CheckCircle className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-green-600`} />;
    return <FolderOpen className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} />;
  }

  const normalizeStageKey = (value: string) =>
    value
      ?.toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[_\s]+/g, ' ')
      .trim()
      .toLowerCase();

  const backendStageForLabel = (label: string) => {
    const normalizedLabel = normalizeStageKey(label);

    const mappedStage = etapasConfig.find(stageConfig => {
      const raw = stageConfig.etapa || stageConfig.nombre || stageConfig.label || '';
      const normalizedRaw = normalizeStageKey(raw);
      return normalizedRaw === normalizedLabel || normalizedRaw.includes(normalizedLabel) || normalizedLabel.includes(normalizedRaw);
    });
    if (mappedStage?.etapa) {
      return mappedStage.etapa.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    }

    const fallbackMap: Record<string, string> = {
      'recepcion': 'RECEPCION',
      'valoracion': 'VALORACION',
      'indagacion': 'INDAGACION_PREVIA',
      'indagacion previa': 'INDAGACION_PREVIA',
      'investigacion': 'INVESTIGACION',
      'evaluacion': 'EVALUACION',
      'juzgamiento': 'JUZGAMIENTO',
      'fallo': 'FALLO',
      'segunda instancia': 'SEGUNDA_INSTANCIA',
      'archivo': 'ARCHIVO'
    };

    return fallbackMap[normalizedLabel] || normalizedLabel.replace(/\s+/g, '_').toUpperCase();
  };

  const getStageOrderForLabel = (label: string) => {
    const normalizedLabel = normalizeStageKey(label);

    const mappedStage = etapasConfig.find(stageConfig => {
      const raw = stageConfig.etapa || stageConfig.nombre || stageConfig.label || '';
      const normalizedRaw = normalizeStageKey(raw);
      return normalizedRaw === normalizedLabel || normalizedRaw.includes(normalizedLabel) || normalizedLabel.includes(normalizedRaw);
    });
    if (mappedStage?.orden !== undefined) {
      return mappedStage.orden;
    }

    // Fallback orders based on typical sequence
    const fallbackOrders: Record<string, number> = {
      'recepcion': 1,
      'valoracion': 2,
      'indagacion': 3,
      'indagacion previa': 3,
      'investigacion': 4,
      'evaluacion': 5,
      'juzgamiento': 6,
      'fallo': 7,
      'segunda instancia': 8,
      'archivo': 9
    };

    return fallbackOrders[normalizedLabel] || 1;
  };

  // ==================== HANDLERS ====================
  const handleDropItem = async (item: Item, nuevaEtapa: string) => {
    // ✅ NUEVO: Validar permiso de movimiento en Kanban
    if (!authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_KANBAN_MOVE)) {
      toast.error('No tiene permiso para mover elementos en el Kanban');
      return;
    }

    // ✅ NUEVO: Validar orden de etapas desde backend config
    if (etapasConfig.length > 0) {
      // Obtener el orden de la etapa actual del item
      let itemOrden: number = 0;
      let etapaActualItem: string = 'Recepción';

      if (item.tipo === 'noticia') {
        // Las noticias siempre están en Recepción
        const etapaRecepcion = etapasConfig.find(e =>
          e.etapa?.toLowerCase().includes('recep') ||
          e.etapa?.toLowerCase().includes('recib')
        );
        itemOrden = etapaRecepcion?.orden ?? 0;
        etapaActualItem = etapaRecepcion?.etapa || 'Recepción';
      } else {
        // Para procesos, buscar la etapa actual
        const etapaActualProceso = etapasConfig.find(e =>
          e.etapa === item.etapaActual ||
          e.etapa.toLowerCase() === item.etapaActual?.toLowerCase()
        );
        itemOrden = etapaActualProceso?.orden ?? 0;
        etapaActualItem = etapaActualProceso?.etapa || item.etapaActual;
      }

      // Obtener el orden de la etapa de destino
      const etapaDestino = etapasConfig.find(e =>
        e.etapa === nuevaEtapa ||
        e.etapa.toLowerCase() === nuevaEtapa.toLowerCase()
      );
      const etapaDestinoOrden = etapaDestino?.orden ?? itemOrden + 1;

      // Validar que solo permita mover a la siguiente etapa en el orden
      if (etapaDestinoOrden !== itemOrden + 1) {
        toast.error('No puede saltar etapas', {
          description: `Debe avanzar secuencialmente. La etapa actual es "${etapaActualItem}" (orden ${itemOrden}).`
        });
        return;
      }
    }

    if (item.tipo === 'noticia') {
      if (nuevaEtapa === 'Valoración') {
        // ✅ Arrastrar noticia de Recepción a Valoración → activa wizard de conversión a proceso
        handleConvertirNoticia(item as Noticia);
        return;
      } else if (nuevaEtapa !== 'Recepción') {
        toast.error('Primero debe convertir la noticia a proceso', {
          description: 'Arrastre a Valoración o use el botón "Convertir"'
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

        // ✅ NUEVO: Persistir cambio de etapa en la base de datos
        const toastId = toast.loading('Cambiando etapa del proceso...');
        try {
          const backendStage = backendStageForLabel(nuevaEtapa);
          const stageOrder = getStageOrderForLabel(nuevaEtapa);

          // Llamar al backend para cambiar la etapa
          await disciplinaryService.cambiarEtapa(item.id, backendStage, stageOrder);
          toast.success('Etapa actualizada', {
            id: toastId,
            description: `${item.numeroProceso} → ${nuevaEtapa}`
          });
        } catch (error: any) {
          console.error('Error al cambiar etapa en BD:', error);
          toast.error('Error al guardar cambio', {
            id: toastId,
            description: error?.message || 'No se pudo persistir el cambio en la base de datos'
          });
          // Continuamos con la actualización local aunque haya error en el backend
        }

        // Actualizar estado local
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

        console.log('📋 Trazabilidad - Movimiento de proceso:', eventoTrazabilidad);
      }
    }
  };

  // ✅ NUEVO: Handler para crear noticia - guarda en backend y usa primera etapa de configuración
  const handleCrearNoticia = async (data: any) => {
    // Determinar la primera etapa desde la configuración del backend (menor orden)
    let etapaInicial = 'Recepcion'; // Valor por defecto (sin tilde para el backend)
    if (etapasConfig.length > 0) {
      const etapasOrdenadas = [...etapasConfig].sort((a, b) => (a.orden || 0) - (b.orden || 0));
      if (etapasOrdenadas.length > 0) {
        etapaInicial = etapasOrdenadas[0].etapa;
      }
    }

    // Extraer primer denunciado y denunciante para campos principales
    const primerDenunciado = data.denunciados?.[0] || data.denunciado;
    const primerDenunciante = data.denunciantes?.[0];
    const denunciadoPersona = primerDenunciado?.nombre
      ? { nombre: primerDenunciado.nombre, tipoIdentificacion: 'CC' as const, numeroIdentificacion: primerDenunciado.identificacion || '' }
      : (data.denunciado?.nombre || '');
    const denunciantePersona = primerDenunciante?.nombre
      ? { nombre: primerDenunciante.nombre, tipoIdentificacion: 'CC' as const, numeroIdentificacion: primerDenunciante.identificacion || '' }
      : 'Sin información';

    // Convertir archivos File a metadata serializable
    const archivosMetadata = (data.archivosAdjuntos || []).map((f: File | any) => ({
      nombre: f.name || f.nombre || 'archivo',
      tipo: f.type || f.tipo || 'application/octet-stream',
      tamano: f.size || f.tamano || 0,
      fechaSubida: new Date().toISOString().split('T')[0]
    }));

    // ✅ MAPEO DE VALORES AL FORMATO DEL BACKEND
    // origen: debe ser uno de ANONIMO, QUEJOSO, OFICIO, REMISION, POR_DETERMINAR
    const origenMap: Record<string, string> = {
      'Anónimo': 'ANONIMO',
      'Anonimo': 'ANONIMO',
      'Denuncia Ciudadana': 'QUEJOSO',
      'Quejoso': 'QUEJOSO',
      'Oficio': 'OFICIO',
      'Remisión': 'REMISION',
      'Remision': 'REMISION',
      'Por Determinar': 'POR_DETERMINAR',
      'Por determinar': 'POR_DETERMINAR'
    };

    const origenNormalizado = origenMap[data.origen] || 'POR_DETERMINAR';

    // ✅ NUEVO: Intentar guardar en el backend
    const toastId = toast.loading('Creando noticia en el sistema...');

    try {
      // Preparar datos para el backend
      const newsData = {
        origen: origenNormalizado,
        radicador: data.radicador || 'Usuario Actual',
        territorial: data.territorial || undefined,
        dependenciaDenunciado: primerDenunciado?.dependencia || primerDenunciado?.lugarHechos || data.denunciado?.dependencia || '',
        fechaQueja: data.fechaQueja || new Date().toISOString().split('T')[0],
        fechaHechos: data.fechaHechos || undefined,
        hechos: data.hechosSeparados?.length > 0
          ? data.hechosSeparados.map((h: any, idx: number) => `Hecho ${idx + 1}: ${h.descripcion}`).join('\n\n')
          : (data.descripcionHechos || ''),
        conductas: data.conductaSeleccionada ? [data.conductaSeleccionada] : [],
        prioridad: (data.prioridad || 'media').toUpperCase(),
        // Denunciante
        denunciante: primerDenunciante ? {
          nombre: primerDenunciante.nombre,
          tipoIdentificacion: 'CC',
          numeroIdentificacion: primerDenunciante.identificacion || '',
          telefono: primerDenunciante.telefono || '',
          correo: primerDenunciante.correo || '',
          direccion: primerDenunciante.direccion || '',
          entidad: primerDenunciante.entidad || '',
          cargo: primerDenunciante.cargo || ''
        } : undefined,
        // Denunciado/Disciplinable
        disciplinable: primerDenunciado ? {
          nombre: primerDenunciado.nombre,
          tipoIdentificacion: primerDenunciado.tipoIdentificacion || 'CC',
          numeroIdentificacion: primerDenunciado.identificacion || '',
          cargo: primerDenunciado.cargo || '',
          dependencia: primerDenunciado.dependencia || primerDenunciado.lugarHechos || ''
        } : undefined
      };

      console.log('[DashboardKanban] Enviando datos al backend:', JSON.stringify(newsData, null, 2));

      // Llamar al backend para crear la noticia
      const noticiaCreada = await disciplinaryService.radicarNoticia(newsData, data.archivosAdjuntos || []);

      console.log('[DashboardKanban] Noticia creada en backend:', noticiaCreada);

      // Transformar la respuesta del backend al formato interno
      const nuevaNoticia = toNoticiaFromApi(noticiaCreada);

      // Asegurar que use la etapa inicial correcta
      nuevaNoticia.etapaActual = etapaInicial;

      // Agregar al estado
      setItems(prev => [...prev, nuevaNoticia]);

      toast.success('Noticia Creada', {
        id: toastId,
        description: `${nuevaNoticia.numero} en ${etapaInicial}`
      });
      setModalActivo(null);
    } catch (error: any) {
      console.error('[DashboardKanban] Error al crear noticia en backend:', error);

      // ✅ Fallback: crear localmente si el backend falla
      console.log('[DashboardKanban] Creando noticia localmente como fallback...');

      const nuevaNoticiaLocal: Noticia = {
        id: `n${Date.now()}`,
        numero: `NOT-2026-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
        fechaRecepcion: data.fechaQueja || new Date().toISOString().split('T')[0],
        fechaRegistro: new Date().toISOString(),
        radicador: data.radicador || 'Usuario Actual',
        origen: data.origen || 'Denuncia Ciudadana',
        territorial: data.territorial || undefined,
        fechaHechos: data.fechaHechos || undefined,
        cargo: primerDenunciado?.cargo || data.denunciado?.cargo || undefined,
        dependencia: primerDenunciado?.lugarHechos || data.denunciado?.dependencia || undefined,
        conductaSeleccionada: data.conductaSeleccionada || undefined,
        conductaPersonalizada: data.conductaPersonalizada || undefined,
        denunciante: denunciantePersona,
        denunciado: denunciadoPersona,
        denunciados: data.denunciados || [],
        denunciantes: data.denunciantes || [],
        hechos: data.descripcionHechos || '',
        hechosSeparados: data.hechosSeparados || [],
        archivosAdjuntos: archivosMetadata,
        estado: 'pendiente',
        prioridad: 'media',
        diasPendientes: 0,
        tipo: 'noticia',
        etapaActual: etapaInicial // ✅ Usar etapa desde configuración
      };

      setItems(prev => [...prev, nuevaNoticiaLocal]);

      // Persistir en Supabase como fallback secundario
      noticiasService.create(nuevaNoticiaLocal).catch(err => {
        console.error('[DashboardKanban] Error al guardar noticia en Supabase:', err);
      });

      toast.warning('Noticia creada localmente', {
        id: toastId,
        description: 'No se pudo guardar en el servidor. La noticia se guardó localmente.'
      });
      setModalActivo(null);
    }
  };

  const handleConvertirNoticia = (noticia: Noticia) => {
    if (!authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESSOS_CONVERTIR)) {
      toast.error('No tiene permisos para convertir noticias a procesos');
      return;
    }
    setItemSeleccionado(noticia);
    setProfesionalSeleccionado('');
    setObservaciones('');
    setModalActivo('convertir-proceso');
  };

  // ✅ NUEVO: Función para editar noticia
  const handleEditarNoticia = (noticia: Noticia) => {
    if (!authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_NOTICIAS_DISCIPLINARIAS_EDIT)) {
      toast.error('No tiene permisos para editar noticias');
      return;
    }
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
        const primerDenunciadoEdit = data.denunciados?.[0] || data.denunciado;
        return {
          ...item,
          origen: data.origen,
          fechaRecepcion: data.fechaQueja,
          fechaHechos: data.fechaHechos,
          territorial: data.territorial,
          denunciado: primerDenunciadoEdit ? {
            nombre: primerDenunciadoEdit.nombre || 'Sin nombre',
            tipoIdentificacion: 'CC' as const,
            numeroIdentificacion: primerDenunciadoEdit.identificacion || primerDenunciadoEdit.numeroIdentificacion || 'Sin identificación'
          } : 'Sin información',
          denunciados: data.denunciados || item.denunciados || [],
          denunciantes: data.denunciantes || item.denunciantes || [],
          hechos: data.hechosSeparados?.length > 0
            ? data.hechosSeparados.map((h: any, idx: number) => `Hecho ${idx + 1}: ${h.descripcion}`).join('\n\n')
            : (data.descripcionHechos || (item as any).hechos || ''),
          hechosSeparados: data.hechosSeparados,
          conductaSeleccionada: data.conductaSeleccionada,
          cargo: primerDenunciadoEdit?.cargo,
          dependencia: primerDenunciadoEdit?.dependencia || primerDenunciadoEdit?.lugarHechos
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

  const handleConfirmarConversion = async () => {
    if (!profesionalSeleccionado) {
      toast.error('Error', { description: 'Selecciona un profesional' });
      return;
    }

    if (!itemSeleccionado) return;

    // ✅ NUEVO: Verificar si la noticia ya tiene proceso asociado (prevención adicional)
    if ((itemSeleccionado as Noticia).procesoAsociado) {
      toast.error('Esta noticia ya tiene un proceso asociado');
      return;
    }

    const noticiaLeg = itemSeleccionado as Noticia;

    // ✅ NUEVO: Obtener el nombre del profesional seleccionado (disponible en todo el ámbito)
    const profesionalObj = profesionalesList.find((p: any) => p.id === profesionalSeleccionado);
    const nombreProfesional = profesionalObj?.nombre || profesionalSeleccionado;

    // ✅ NUEVO: Activar estado de loading
    setIsConvirtiendo(true);

    let procesoCreado = false;

    try {
      const abogadoId = profesionalSeleccionado;
      const procesoApi = await disciplinaryService.asignarProceso({
        newsId: itemSeleccionado.id,
        abogadoId,
        abogadoNombre: nombreProfesional
      });

      const nuevoProceso = toProcesoFromApi(procesoApi, etapasConfig);

      setItems(prev => [
        ...prev.filter(i => i.id !== itemSeleccionado.id),
        nuevoProceso
      ]);

      toast.success('Proceso Creado', {
        description: `${nuevoProceso.numeroProceso} → ${nombreProfesional}`
      });

      setModalActivo(null);
      setItemSeleccionado(null);
      procesoCreado = true;
    } catch (error) {
      console.error('Error convirtiendo noticia a proceso:', error);
      // fallback local para no bloquear operación en entornos sin endpoint
    } finally {
      // ✅ NUEVO: Siempre desactivar el estado de loading
      setIsConvirtiendo(false);
    }

    // ✅ Fallback local: crear proceso sin llamar al backend
    if (!procesoCreado) {
      // ✅ Obtener la siguiente etapa después de Recepción
      const siguienteEtapa = etapasConfig.length > 0
        ? etapasConfig
          .sort((a, b) => (a.orden || 0) - (b.orden || 0))
          .find(e => (e.orden || 0) > 1)?.etapa || 'Valoración'
        : 'Valoración';

      const nuevoProceso: Proceso = {
        id: `p${Date.now()}`,
        numeroProceso: `P-2025-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
        noticiaOrigen: itemSeleccionado.numero,
        denunciante: itemSeleccionado.denunciante,
        denunciado: itemSeleccionado.denunciado,
        cedula: typeof itemSeleccionado.denunciado === 'object' ? itemSeleccionado.denunciado.numeroIdentificacion : '00000000',
        etapaActual: siguienteEtapa as any, // ✅ Cambiar a siguiente etapa (Valoración)
        estadoActual: 'En Gestión',
        profesionalAsignado: {
          nombre: nombreProfesional,
          tipoIdentificacion: 'CC',
          numeroIdentificacion: profesionalSeleccionado
        },
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

      toast.success('Proceso Creado (local)', {
        description: `${nuevoProceso.numeroProceso} → ${nombreProfesional}`
      });

      setModalActivo(null);
      setItemSeleccionado(null);
    }
  };

  // ✅ NUEVO: Handler del wizard de conversión con datos enriquecidos integrando API real
  const handleConversionDesdeWizard = async (datos: {
    tipoProceso: string;
    faltaPresunta: string;
    etapaInicial: string;
    descripcionAdicional: string;
    profesionalId: string;
    profesionalNombre: string;
    observaciones: string;
  }) => {
    if (!itemSeleccionado) return;

    // Indicador visual de persistencia
    const toastId = toast.loading('Asignando profesional y creando proceso...');

    try {
      // ✅ Persistir en el backend usando API real
      const procesoApi = await disciplinaryService.asignarProceso({
        newsId: itemSeleccionado.id,
        abogadoId: datos.profesionalId,
        abogadoNombre: datos.profesionalNombre,
        observaciones: datos.observaciones,
      });

      // ✅ Mapear la respuesta de la API al formato que usa la UI
      const nuevoProceso = toProcesoFromApi(procesoApi, etapasConfig);

      // ✅ Actualizar el tablón sin necesidad de recargar la página completa
      setItems(prev => [
        ...prev.filter(i => i.id !== itemSeleccionado.id), // Eliminar la noticia original
        nuevoProceso, // Agregar el nuevo proceso
      ]);

      toast.success('Proceso Disciplinario Creado', {
        id: toastId,
        description: `${nuevoProceso.numeroProceso} asignado a ${datos.profesionalNombre} · Etapa: Valoración`
      });

      setModalActivo(null);
      setItemSeleccionado(null);
    } catch (err: any) {
      console.error('[DashboardKanban] Error al crear proceso en la API:', err);
      toast.error('Error al crear el proceso disciplinario', {
        id: toastId,
        description: err.message || 'Error de conexión con el servidor',
      });
    }
  };

  const handleDevolverNoticia = (noticia: Noticia) => {
    if (!authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESSOS_DEVOLVER)) {
      toast.error('No tiene permisos para devolver noticias');
      return;
    }
    setItemSeleccionado(noticia);
    setObservaciones('');
    setModalActivo('devolver-noticia');
  };

  const handleConfirmarDevolucion = async (datos: {
    motivo: string; motivoLabel: string;
    observaciones: string; numeroDevolucion: string;
  }) => {
    const noticiaId = itemSeleccionado.id;
    const noticiaNumero = itemSeleccionado.numero;
    setModalActivo(null);
    setItemSeleccionado(null);
    try {
      await disciplinaryService.returnNews(noticiaId, datos.observaciones);
      // Solo actualizar estado local si el backend confirmó
      setItems(prev => prev.map(item => {
        if (item.id === noticiaId && item.tipo === 'noticia') {
          return {
            ...item,
            estado: 'devuelta' as any,
            bitacora: [
              ...(item as any).bitacora || [],
              {
                fecha: new Date().toISOString(),
                accion: 'Devolucion',
                detalle: `${datos.numeroDevolucion} — Motivo: ${datos.motivoLabel}. ${datos.observaciones}`,
                usuario: 'Usuario Actual',
              }
            ],
          };
        }
        return item;
      }));
      toast.success('Noticia Devuelta Exitosamente', {
        description: `${noticiaNumero} → ${datos.numeroDevolucion}\nMotivo: ${datos.motivoLabel}`,
      });
    } catch (err) {
      console.error('[DashboardKanban] Error al devolver noticia en backend:', err);
      toast.error('Error al devolver la noticia', {
        description: 'No se pudo guardar la devolución. Intenta de nuevo.',
      });
    }
  };

  const handleDevolverCompetencia = (noticia: Noticia) => {
    setItemSeleccionado(noticia);
    setObservaciones('');
    setAreaDestinoRemision('');
    setModalActivo('devolver-competencia');
  };

  const handleConfirmarDevolucionCompetencia = async (datos: {
    entidadId: string; entidadNombre: string; entidadCorreo: string;
    tipoRemision: string; justificacion: string; fundamentoLegal: string; numeroRC: string;
  }) => {
    // ✅ NUEVO: Llamar al backend API para remitir por competencia
    const toastId = toast.loading('Remitiendo noticia por competencia...');

    try {
      await disciplinaryService.remitirPorCompetencia({
        newsId: itemSeleccionado.id,
        radicado: itemSeleccionado.numero,
        emailDestinatario: datos.entidadCorreo,
        entidadDestino: datos.entidadNombre,
        justificacion: `${datos.numeroRC} — Tipo: ${datos.tipoRemision}. Fundamento: ${datos.fundamentoLegal || 'N/A'}. ${datos.justificacion}`,
        usuarioRemision: 'Sistema'
      });

      toast.success('Remitida por Competencia', {
        id: toastId,
        description: datos.entidadCorreo
          ? `${itemSeleccionado.numero} → ${datos.numeroRC}\nEntidad: ${datos.entidadNombre}\nCorreo: ${datos.entidadCorreo}`
          : `${itemSeleccionado.numero} → ${datos.numeroRC}\nEntidad: ${datos.entidadNombre}`,
      });
    } catch (error: any) {
      console.error('Error al remitir por competencia:', error);
      toast.error('Error al remitir', {
        id: toastId,
        description: error?.message || 'No se pudo completar la remisión'
      });
      // Continuar con la actualización local aunque haya error en el backend
    }

    // Actualizar estado de la noticia a 'remitida' pero mantenerla visible en el Kanban
    setItems(prev => prev.map(item => {
      if (item.id === itemSeleccionado.id && item.tipo === 'noticia') {
        return {
          ...item,
          estado: 'remitida' as any,
          // ✅ NUEVO: Guardar información de remisión en la noticia
          numeroRC: datos.numeroRC,
          entidadRemision: datos.entidadNombre,
          tipoRemision: datos.tipoRemision,
          fechaRemision: new Date().toISOString(),
          fundamentoLegalRemision: datos.fundamentoLegal,
          justificacionRemision: datos.justificacion,
          bitacora: [
            ...(item as any).bitacora || [],
            {
              fecha: new Date().toISOString(),
              accion: 'Remision por Competencia',
              detalle: `${datos.numeroRC} — Remitida a: ${datos.entidadNombre}. Tipo: ${datos.tipoRemision}. Fundamento: ${datos.fundamentoLegal || 'N/A'}. ${datos.justificacion}`,
              usuario: 'Usuario Actual',
            }
          ],
        };
      }
      return item;
    }));
    // ✅ NOTA: La noticia ya no se elimina del Kanban - se mantiene visible con indicador de remisión
    setModalActivo(null);
    setItemSeleccionado(null);
  };

  const handleArchivarNoticia = (noticia: Noticia) => {
    if (!authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESSOS_ARCHIVAR)) {
      toast.error('No tiene permisos para archivar noticias');
      return;
    }
    setItemSeleccionado(noticia);
    setModalActivo('archivar-noticia');
  };

  const handleConfirmarArchivo = async () => {
    const noticiaAArchivar = itemSeleccionado;
    setModalActivo(null);
    setItemSeleccionado(null);

    try {
      await disciplinaryService.archiveNews(noticiaAArchivar.id, 'Archivado por el operador disciplinario');
    } catch (err) {
      console.error('[DashboardKanban] Error al archivar en backend:', err);
      toast.error('Error al archivar', {
        description: 'No se pudo archivar la noticia. Intenta de nuevo.',
      });
      return;
    }

    // Solo actualizar UI si el backend confirmó el archivo
    const itemArchivado = {
      ...noticiaAArchivar,
      estado: 'archivada' as any,
      fechaArchivo: new Date().toISOString(),
      motivoArchivo: 'Archivado por el operador disciplinario',
      bitacora: [
        ...(noticiaAArchivar as any).bitacora || [],
        {
          fecha: new Date().toISOString(),
          accion: 'Archivo de Noticia',
          detalle: `Noticia ${noticiaAArchivar.numero || noticiaAArchivar.numeroProceso} archivada por el operador disciplinario.`,
          usuario: 'Usuario Actual',
        }
      ],
    };
    setItemsArchivados(prev => [itemArchivado, ...prev]);
    setItems(prev => prev.filter(i => i.id !== noticiaAArchivar.id));
    toast.success('Noticia Archivada Exitosamente', {
      description: `${noticiaAArchivar.numero || noticiaAArchivar.numeroProceso} — La noticia ha sido archivada. Puedes consultarla en la pestaña "Archivados".`,
    });
  };

  const handleDesarchivar = (item: any) => {
    setItemParaRestaurar(item);
    setMostrarModalRestaurar(true);
  };

  // ✅ Función para determinar el estado apropiado al restaurar un proceso
  const determinarEstadoRestauracion = (proceso: any): string => {
    

    // Estado por defecto basado en la etapa
    return 'activo';
  };

  const confirmarRestauracion = async () => {
    if (!itemParaRestaurar) return;

    const item = itemParaRestaurar;
    // Restaurar al flujo activo
    const { fechaArchivo, motivoArchivo, ...itemRestaurado } = item;

    try {
      if (item.tipo === 'noticia') {
        itemRestaurado.estado = 'pendiente';
        // Persistir restauración en el backend para noticias
        await disciplinaryService.restoreNews(item.id);
      } else {
        // Para procesos, llamar directamente al servicio disciplinario (bypass API gateway)
        console.log('Restoring process:', item.id, 'Calling disciplinary service directly');

        try {
          // Call disciplinary service directly on port 3005
          const response = await fetch(`http://localhost:3005/disciplinary-processes/${item.id}/restore`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('esap_auth_token') || localStorage.getItem('esap_access_token') || ''}`,
            },
            body: JSON.stringify({}),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Direct service call failed:', response.status, errorText);
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
          }

          const result = await response.json();
          console.log('Restore successful:', result);
        } catch (directError) {
          console.error('Direct service call failed, trying gateway fallback:', directError);

          // Fallback to gateway if direct call fails
          try {
            const gatewayResponse = await fetch(`/control-disciplinario/api/v1/disciplinary-processes/${item.id}/restore`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({}),
            });
            if (!gatewayResponse.ok) {
              throw new Error(`Gateway error! status: ${gatewayResponse.status}`);
            }
          } catch (gatewayError) {
            console.error('Both direct and gateway calls failed');
            throw gatewayError;
          }
        }

        itemRestaurado.restaurado = true; // El backend ya lo actualizó, pero marcamos localmente
      }

      setItems(prev => [...prev, itemRestaurado]);
      setItemsArchivados(prev => prev.filter(i => i.id !== item.id));

      toast.success('Restaurado al Flujo Activo', {
        description: `${item.numero || item.numeroProceso} ha sido restaurado y aparecerá nuevamente en el tablero.`,
      });
    } catch (err) {
      console.error('[DashboardKanban] Error al restaurar en backend:', err);
      toast.error('Error al restaurar elemento');
      return;
    }

    // Cerrar modal
    setMostrarModalRestaurar(false);
    setItemParaRestaurar(null);
  };

  // ✅ NUEVO: Handler para asignar profesional en transición Recepción → Valoración
  // ✅ MODIFICADO: Ahora sigue el orden de etapas desde la configuración del backend Y persiste en BD
  const handleAsignarProfesional = async (profesionalId: string, profesionalNombre: string, observaciones: string) => {
    if (!authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_NOTICIAS_DISCIPLINARIAS_ASIGNAR)) {
      toast.error('No tiene permisos para asignar profesionales');
      return;
    }
    if (!itemSeleccionado) return;

    const usuario = 'Usuario Actual'; // En producción vendría del contexto de autenticación

    // ✅ NUEVO: Determinar la siguiente etapa basándose en el orden de etapasConfig
    let siguienteEtapa = 'Valoración'; // Valor por defecto

    if (etapasConfig.length > 0) {
      // Obtener la etapa actual del proceso
      const etapaActual = etapasConfig.find(e =>
        e.etapa === itemSeleccionado.etapaActual ||
        e.etapa.toLowerCase() === itemSeleccionado.etapaActual?.toLowerCase()
      );
      const ordenActual = etapaActual?.orden ?? 0;

      // Buscar la siguiente etapa (orden + 1)
      const siguiente = etapasConfig.find(e => e.orden === ordenActual + 1);
      if (siguiente) {
        siguienteEtapa = siguiente.etapa;
      }
    }

    // Mapear el nombre de la etapa al formato del backend
    const stageMap: Record<string, string> = {
      'Recepción': 'RECEPCION',
      'Valoración': 'VALORACION',
      'Indagación': 'INDAGACION_PREVIA',
      'Investigación': 'INVESTIGACION',
      'Juzgamiento': 'JUZGAMIENTO',
      'Fallo': 'FALLO',
      'Archivo': 'ARCHIVO'
    };
    const backendStage = stageMap[siguienteEtapa] || siguienteEtapa.toUpperCase();
    const stageOrder = getStageOrderForLabel(siguienteEtapa);

    // ✅ NUEVO: Persistir cambio de etapa y asignación de profesional en la base de datos
    const toastId = toast.loading('Asignando profesional y cambiando etapa...');
    try {
      // Llamar al backend para cambiar la etapa y asignar el profesional
      await disciplinaryService.cambiarEtapa(itemSeleccionado.id, backendStage, stageOrder);

      // También actualizar el proceso con el profesional asignado usando updateProcess
      await disciplinaryService.updateProcess(itemSeleccionado.id, {
        etapaActual: backendStage,
        kanbanStage: stageOrder,
        abogadoId: profesionalId
      });

      toast.success('Profesional Asignado y Etapa Actualizada', {
        id: toastId,
        description: `${itemSeleccionado.numeroProceso} → ${profesionalNombre} (${siguienteEtapa})`
      });
    } catch (error: any) {
      console.error('Error al guardar asignación en BD:', error);
      toast.error('Error al guardar', {
        id: toastId,
        description: error?.message || 'No se pudo persistir la asignación en la base de datos'
      });
      // Continuamos con la actualización local aunque haya error en el backend
    }

    // Actualizar el proceso con el profesional asignado y moverlo a la siguiente etapa
    setItems(prev => prev.map(i =>
      i.id === itemSeleccionado.id && i.tipo === 'proceso'
        ? {
          ...i,
          etapaActual: siguienteEtapa as any,
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
      descripcion: `El proceso fue movido de "Recepción" a "${siguienteEtapa}" y asignado al profesional ${profesionalNombre}. ${observaciones ? `Observaciones: ${observaciones}` : ''}`,
      usuario: usuario,
      fecha: new Date(),
      procesoId: itemSeleccionado.id,
      profesionalAsignado: profesionalNombre,
      observaciones: observaciones
    };

    console.log('📋 Trazabilidad - Asignación de profesional:', eventoTrazabilidad);

    toast.success('Profesional Asignado', {
      description: `${itemSeleccionado.numeroProceso} → ${profesionalNombre} (${siguienteEtapa})`
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
    // Limpiar estado previo antes de abrir el modal
    setModalActivo(null);
    setItemSeleccionado(null);

    // Establecer el nuevo estado
    setItemSeleccionado(noticia);
    setModalActivo('asociar-noticia-proceso');
  };

  const handleAsociarNoticiaNoticia = (noticia: Noticia) => {
    // Limpiar estado previo antes de abrir el modal
    setModalActivo(null);
    setItemSeleccionado(null);

    // Establecer el nuevo estado
    setItemSeleccionado(noticia);
    setModalActivo('asociar-noticia-noticia');
  };

  const handleConfirmarAsociacionNoticiaANoticia = async (
    noticiaId: string,
    noticiaDestinoId: string,
    justificacion: string
  ) => {
    const noticia = items.find(i => i.id === noticiaId && i.tipo === 'noticia') as Noticia;
    const noticiaDestino = items.find(i => i.id === noticiaDestinoId && i.tipo === 'noticia') as Noticia;

    if (!noticia || !noticiaDestino) {
      toast.error('Error al asociar noticia');
      return;
    }

    const toastId = toast.loading('Asociando noticia a noticia...');
    try {
      await disciplinaryService.asociarNoticiaANoticia(noticiaId, noticiaDestinoId, justificacion);

      setItems(prev => prev.map(item => {
        if (item.id === noticiaId && item.tipo === 'noticia') {
          return {
            ...item,
            procesoAsociado: {
              id: noticiaDestinoId,
              numeroProceso: noticiaDestino.numero,
              fechaAsociacion: new Date().toISOString(),
              justificacion,
            },
          } as Noticia;
        }
        return item;
      }));

      toast.success('Noticia asociada', {
        id: toastId,
        description: `${noticia.numero} asociada a ${noticiaDestino.numero}`
      });
    } catch (error: any) {
      console.error('Error al asociar noticia a noticia:', error);
      toast.error('Error al asociar noticia', {
        id: toastId,
        description: error?.message || 'No se pudo persistir la asociación en la base de datos'
      });
      return;
    }
  };

  const handleConfirmarAsociacion = async (noticiaId: string, procesoId: string, justificacion: string) => {
    // Encontrar proceso y noticia
    const proceso = items.find(i => i.id === procesoId && i.tipo === 'proceso') as Proceso;
    const noticia = items.find(i => i.id === noticiaId && i.tipo === 'noticia') as Noticia;

    if (!proceso || !noticia) {
      toast.error('Error al asociar noticia');
      return;
    }

    const toastId = toast.loading('Asociando noticia al proceso...');
    try {
      await disciplinaryService.asociarNoticiaAProceso(noticiaId, procesoId, justificacion);

      // Invalidar cache de noticias asociadas para este proceso
      invalidateNoticiasAsociadasCache(procesoId);

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

      toast.success('Noticia asociada', {
        id: toastId,
        description: `${noticia.numero} asociada a ${proceso.numeroProceso}`
      });
    } catch (error: any) {
      console.error('Error al asociar noticia:', error);
      toast.error('Error al asociar noticia', {
        id: toastId,
        description: error?.message || 'No se pudo persistir la asociación en la base de datos'
      });
      return;
    }

    setModalActivo(null);
    setItemSeleccionado(null);
  };

  // ✅ NUEVO: Handler para ver elemento asociado (proceso o noticia)
  const handleVerProcesoAsociado = (asociadoId: string) => {
    const proceso = items.find(i => i.id === asociadoId && i.tipo === 'proceso') as Proceso;
    const noticia = items.find(i => i.id === asociadoId && i.tipo === 'noticia') as Noticia;

    if (proceso) {
      const procesoElement = document.getElementById(`proceso-${asociadoId}`);
      if (procesoElement) {
        procesoElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        procesoElement.classList.add('ring-4', 'ring-purple-500', 'ring-opacity-50');
        setTimeout(() => {
          procesoElement.classList.remove('ring-4', 'ring-purple-500', 'ring-opacity-50');
        }, 2000);
      }

      setItemSeleccionado(proceso);
      setModalActivo('ver-detalles');

      toast.info('Navegando al proceso asociado', {
        description: proceso.numeroProceso,
      });
    } else if (noticia) {
      const noticiaElement = document.getElementById(`noticia-${asociadoId}`);
      if (noticiaElement) {
        noticiaElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        noticiaElement.classList.add('ring-4', 'ring-purple-500', 'ring-opacity-50');
        setTimeout(() => {
          noticiaElement.classList.remove('ring-4', 'ring-purple-500', 'ring-opacity-50');
        }, 2000);
      }

      setItemSeleccionado(noticia);
      setModalActivo('ver-detalles');

      toast.info('Navegando a la noticia asociada', {
        description: noticia.numero,
      });
    } else {
      toast.error('Elemento asociado no encontrado en el tablero actual');
    }
  };

  const handleVerDetallesNoticia = (noticia: Noticia) => {
    setItemSeleccionado(noticia);
    setModalActivo('ver-detalles');
  };

  // ✅ NUEVO: Handler para ver detalles de remisión (clic en el cuadrito de remisión)
  const handleVerDetallesRemision = (noticia: Noticia) => {
    setItemSeleccionado(noticia);
    setModalActivo('ver-detalles-remision');
  };

  // ✅ NUEVO: Handler para ver detalles de asociación de procesos (clic en el proceso asociado)
  const handleVerDetallesAsociacion = (proceso: Proceso) => {
    setItemSeleccionado(proceso);
    setModalActivo('ver-detalles-asociacion');
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
    // Limpiar estado previo antes de abrir el modal
    setModalActivo(null);
    setItemSeleccionado(null);

    // Establecer el nuevo estado
    setItemSeleccionado(proceso);
    setModalActivo('asociar-proceso-proceso');
  };

  const handleConfirmarAsociacionProcesoProceso = async (procesoOrigenId: string, procesoDestinoId: string, justificacion: string, tipoAsociacion: 'conexo' | 'similar' | 'consolidado') => {
    if (!itemSeleccionado) return;

    const usuario = 'Usuario Actual'; // En producción vendría del contexto de autenticación
    const procesoOrigen = items.find(i => i.id === procesoOrigenId && i.tipo === 'proceso') as Proceso;
    const procesoDestino = items.find(i => i.id === procesoDestinoId && i.tipo === 'proceso') as Proceso;

    if (!procesoOrigen || !procesoDestino) {
      toast.error('Error', { description: 'No se encontraron los procesos para asociar' });
      return;
    }

    // Llamar al backend para persistir la asociacion
    try {
      await disciplinaryService.asociarProcesoAProceso(procesoOrigenId, procesoDestinoId, tipoAsociacion, justificacion);

      // Actualizar el estado local con la informacion de la asociacion
      setItems(prevItems => prevItems.map(item => {
        if (item.id === procesoOrigenId && item.tipo === 'proceso') {
          return { ...item, procesoAsociadoId: procesoDestinoId, procesoAsociadoNumero: procesoDestino.numeroProceso, procesoAsociadoTipo: tipoAsociacion, procesoAsociadoFecha: new Date().toISOString() } as Proceso;
        }
        return item;
      }));

      toast.success('Procesos Asociados', { description: `${procesoOrigen.numeroProceso} -> ${procesoDestino.numeroProceso}` });
    } catch (error: any) {
      console.error('Error al asociar:', error);
      toast.error('Error', { description: error?.message || 'No se pudo asociar' });
      return;
    }

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
          <p>Señor(a): ${proceso.denunciado ? (typeof proceso.denunciado === 'string' ? proceso.denunciado : proceso.denunciado.nombre) : 'Sin información'}</p>
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

  // ✅ NUEVO: Handler específico para cambio de etapa desde la vista lista (sin restricciones de secuencia)
  const handleCambiarEtapaLista = async (proceso: Proceso, nuevaEtapa: string) => {
    if (proceso.etapaActual === nuevaEtapa) return;

    const etapaAnterior = proceso.etapaActual;
    const usuario = 'Usuario Actual';

    const backendStage = backendStageForLabel(nuevaEtapa);
    const stageOrder = getStageOrderForLabel(nuevaEtapa);

    // Persistir cambio de etapa en la base de datos
    const toastId = toast.loading('Cambiando etapa del proceso...');
    try {
      await disciplinaryService.cambiarEtapa(proceso.id, backendStage, stageOrder);

      toast.success('Etapa actualizada', {
        id: toastId,
        description: `${proceso.numeroProceso} → ${nuevaEtapa}`
      });
    } catch (error: any) {
      console.error('Error al cambiar etapa en BD:', error);
      toast.error('Error al guardar cambio', {
        id: toastId,
        description: error?.message || 'No se pudo persistir el cambio en la base de datos'
      });
      return;
    }

    // Actualizar estado local
    setItems(prev => prev.map(i =>
      i.id === proceso.id && i.tipo === 'proceso'
        ? {
          ...i,
          etapaActual: nuevaEtapa as any,
          ultimaModificacion: new Date()
        }
        : i
    ));

    // Registrar en trazabilidad
    const eventoTrazabilidad = {
      id: `evt-${Date.now()}`,
      tipo: 'cambio-estado' as const,
      titulo: `Cambio de etapa: ${etapaAnterior} → ${nuevaEtapa}`,
      descripcion: `El proceso fue movido de "${etapaAnterior}" a "${nuevaEtapa}" mediante selector de etapa`,
      usuario: usuario,
      fecha: new Date(),
      procesoId: proceso.id,
      etapaAnterior: etapaAnterior,
      etapaNueva: nuevaEtapa
    };

    console.log('📋 Trazabilidad - Cambio de etapa (Lista):', eventoTrazabilidad);
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
  const normalizedGlobalQuery = normalizeText(busquedaGlobal.trim());

  const itemsFiltrados = (filtroProfesionalId
    ? items.filter(item => {
      if (item.tipo === 'proceso') {
        return (item as Proceso).profesionalAsignadoId === filtroProfesionalId;
      }
      return false; // No mostrar noticias cuando hay filtro de profesional
    })
    : items
  ).filter(item => {
    // Filtro por tipo
    if (filtroTipo !== 'todos' && item.tipo !== filtroTipo) return false;
    // Filtro por búsqueda
    return itemMatchesSearch(item, normalizedGlobalQuery);
  });

  // ✅ También filtrar archivados por búsqueda global
  const itemsArchivadosFiltrados = itemsArchivados.filter(item =>
    itemMatchesSearch(item, normalizedGlobalQuery)
  );

  // Obtener nombre del profesional filtrado
  const profesionalFiltrado = filtroProfesionalId
    ? profesionalesList.find(p => p.id === filtroProfesionalId)
    : null;

  // ==================== RENDER ====================

  // ✅ Estado de carga desde Supabase
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5">
        <div className="w-12 h-12 border-[3px] rounded-full animate-spin" style={{ borderColor: '#E2E8F0', borderTopColor: '#003DA5' }} />
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-600">Cargando datos</p>
          <p className="text-xs text-gray-400 mt-1">Conectando con Supabase...</p>
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5">
        <div className="p-3 rounded-full bg-red-50">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-red-600">Error al cargar datos</p>
          <p className="text-xs text-gray-500 max-w-md mt-1">{dataError}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm"
          style={{ background: '#003DA5' }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div ref={containerRef} className="space-y-4 w-full max-w-full" style={{ minWidth: 0 }}>
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

        {/* Header World Class Responsive - usa containerWidth real */}
        <div className="w-full max-w-full bg-white rounded-xl border border-gray-200/80 px-5 py-3.5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-4 w-full">
            {/* Título - ocupa espacio disponible, se trunca si es necesario */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#003DA510' }}>
                  <Columns3 className="w-5 h-5" style={{ color: '#003DA5' }} />
                </div>
                <h2
                  className="font-bold leading-tight truncate tracking-tight"
                  style={{
                    color: '#003DA5',
                    fontSize: containerWidth < 500 ? '1rem' : containerWidth < 700 ? '1.1rem' : '1.25rem'
                  }}
                >
                  Kanban
                </h2>
              </div>
            </div>

            {/* ✅ BÚSQUEDA GLOBAL COLAPSABLE — lupa → campo expandido con animación */}
            <div className="flex items-center flex-shrink-0">
              <AnimatePresence mode="wait">
                {!showBusquedaGlobal ? (
                  <motion.button
                    key="search-icon"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => {
                      setShowBusquedaGlobal(true);
                      setTimeout(() => busquedaInputRef.current?.focus(), 80);
                    }}
                    className="rounded-lg hover:bg-blue-50 transition-colors group flex items-center justify-center"
                    title="Buscar en todo el tablero"
                    style={{ color: '#003DA5', width: 36, height: 36, minWidth: 36, minHeight: 36 }}
                  >
                    <Search style={{ width: 20, height: 20 }} className="group-hover:scale-110 transition-transform" />
                  </motion.button>
                ) : (
                  <motion.div
                    key="search-field"
                    initial={{ width: 36, opacity: 0.5 }}
                    animate={{ width: containerWidth < 500 ? 180 : containerWidth < 700 ? 220 : 280, opacity: 1 }}
                    exit={{ width: 36, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    className="relative flex items-center overflow-hidden"
                  >
                    <Search className="absolute left-2.5 w-4 h-4 pointer-events-none" style={{ color: '#003DA5' }} />
                    <input
                      ref={busquedaInputRef}
                      type="text"
                      value={busquedaGlobal}
                      onChange={(e) => setBusquedaGlobal(e.target.value)}
                      onBlur={() => {
                        if (!busquedaGlobal.trim()) setShowBusquedaGlobal(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setBusquedaGlobal('');
                          setShowBusquedaGlobal(false);
                        }
                      }}
                      placeholder="Buscar noticias, procesos..."
                      className="w-full pl-8 pr-8 py-2 rounded-xl border text-sm focus:outline-none transition-all focus:ring-2 focus:ring-[#003DA5]/20"
                      style={{
                        borderColor: busquedaGlobal ? '#003DA5' : '#E2E8F0',
                        backgroundColor: '#FAFBFC',
                      }}
                    />
                    {busquedaGlobal && (
                      <button
                        onClick={() => {
                          setBusquedaGlobal('');
                          busquedaInputRef.current?.focus();
                        }}
                        className="absolute right-2 p-0.5 rounded-full hover:bg-gray-200 transition-colors"
                        title="Limpiar búsqueda"
                      >
                        <X className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Badge indicador de filtro activo */}
              {busquedaGlobal.trim() && !showBusquedaGlobal && (
                <span
                  className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: '#003DA5' }}
                >
                  {itemsFiltrados.length + itemsArchivadosFiltrados.length}
                </span>
              )}
            </div>

            {/* Controles — Design Standard: Filtro Tipo + ViewToggle + CTA */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Filtro por tipo */}
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-gray-100">
                {([
                  { value: 'todos', label: 'Todos' },
                  { value: 'noticia', label: 'Noticias' },
                  { value: 'proceso', label: 'Procesos' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFiltroTipo(opt.value)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${filtroTipo === opt.value
                      ? 'bg-white shadow-sm text-gray-900'
                      : 'text-gray-500 hover:bg-gray-200'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <KanbanViewToggle
                options={[
                  ...(isMobile ? [] : [{ value: 'kanban', icon: <Columns3 style={{ width: 16, height: 16 }} />, label: 'Kanban' }]),
                  { value: 'lista', icon: <List style={{ width: 16, height: 16 }} />, label: 'Lista' },
                  { value: 'archivados', icon: <Archive style={{ width: 16, height: 16 }} />, label: 'Archivados', badge: itemsArchivados.length > 0 ? itemsArchivados.length : undefined },
                ]}
                active={tipoVista}
                onChange={(id) => setTipoVista(id as any)}
              />

              {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_NOTICIAS_DISCIPLINARIAS_CREATE) && (
                <KanbanToolbarCTA
                  onClick={() => setModalActivo('crear-noticia')}
                  icon={<Plus style={{ width: 16, height: 16 }} />}
                >
                  Nueva
                </KanbanToolbarCTA>
              )}
            </div>
          </div>
        </div>

        {/* Estadísticas - Responsive: 2 cols en estrecho, 4 cols en ancho */}


        {/* CSS para kanban-scroll-container */}
        <style>{`
          .kanban-scroll-container {
            /* Scroll horizontal personalizado para contenedor de columnas kanban */
          }

          .kanban-scroll-container::-webkit-scrollbar {
            height: 8px;
          }

          .kanban-scroll-container::-webkit-scrollbar-track {
            background: #F1F5F9;
            border-radius: 4px;
          }

          .kanban-scroll-container::-webkit-scrollbar-thumb {
            background: #CBD5E1;
            border-radius: 4px;
          }

          .kanban-scroll-container::-webkit-scrollbar-thumb:hover {
            background: #94A3B8;
          }

          .kanban-scroll-container::-webkit-scrollbar-thumb:active {
            background: #64748B;
          }


        `}</style>

        {/* Vista Kanban, Lista o Archivados según selección */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2
                className="w-12 h-12 mx-auto mb-4 animate-spin"
                style={{ color: '#003DA5' }}
              />
              <p className="text-lg font-semibold text-gray-700">
                Cargando noticias y procesos...
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Obteniendo datos del servidor
              </p>
            </div>
          </div>
        )}

        {!loading && tipoVista === 'kanban' && itemsFiltrados.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 px-4">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: '#F3F4F6' }}>
                <FolderOpen className="w-10 h-10" style={{ color: '#9CA3AF' }} />
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: '#374151' }}>
                No hay procesos registrados
              </h3>
              <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
                Actualmente no existen noticias ni procesos disciplinarios en el sistema. Puede crear una nueva noticia haciendo clic en el botón "Nueva".
              </p>
              {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_NOTICIAS_DISCIPLINARIAS_CREATE) && (
                <Button
                  onClick={() => setModalActivo('crear-noticia')}
                  className="px-6 py-2.5 text-white font-semibold rounded-xl shadow-md"
                  style={{ background: '#003DA5' }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Nueva Noticia
                </Button>
              )}
            </div>
          </div>
        )}

        {tipoVista === 'kanban' && itemsFiltrados.length > 0 && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Wrapper relativo para el area kanban */}
            <div className="relative flex-1 min-h-0">
              {/* Botones sticky: siempre centrados en la parte visible de la pantalla */}
              <div style={{ position: 'sticky', top: '50vh', transform: 'translateY(-50%)', height: 0, zIndex: 30, pointerEvents: 'none' }}>
                <button
                  onClick={() => navegarKanban('prev')}
                  className="absolute left-2 flex items-center justify-center w-9 h-9 rounded-full shadow-lg hover:shadow-xl"
                  style={{ background: 'linear-gradient(135deg, #2962FF, #003DA5)', color: '#FFFFFF', pointerEvents: 'auto', transform: 'translateY(-50%)' }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navegarKanban('next')}
                  className="absolute right-2 flex items-center justify-center w-9 h-9 rounded-full shadow-lg hover:shadow-xl"
                  style={{ background: 'linear-gradient(135deg, #2962FF, #003DA5)', color: '#FFFFFF', pointerEvents: 'auto', transform: 'translateY(-50%)' }}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              {/* Contenedor Kanban: scroll horizontal con barra azul visible en la parte inferior */}
              <div
                ref={kanbanScrollRef}
                className="pb-2 kanban-scroll-container"
                style={{
                  height: '80vh', // Fixed height for internal scroll per drawer like control-interno
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#2962FF #E5E7EB',
                }}
              >
                <div
                  className="flex gap-4 h-full items-stretch"
                  style={{
                    width: 'max-content',
                    paddingLeft: '2.5rem',
                    paddingRight: '2.5rem',
                    paddingBottom: '0.5rem',
                  }}
                >
                  {etapas.map((etapa) => {
                    const isColapsada = columnasColapsadas.has(etapa.nombre);
                    return (
                      <div
                        key={etapa.nombre}
                        className="flex-shrink-0 h-full"
                        style={{
                          width: isColapsada && !isMobile ? '64px' : isMobile ? 'calc(100vw - 32px)' : isTablet ? '280px' : '320px',
                          transition: 'width 0.3s ease-in-out',
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
                          onVerDetallesRemision={handleVerDetallesRemision} // ✅ NUEVO: Ver detalles de remisión
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
                          onVerDetallesAsociacion={handleVerDetallesAsociacion} // ✅ NUEVO: Ver detalles de asociación
                          vistaCompacta={vistaCompacta}
                          isMobile={isMobile}
                          colapsada={columnasColapsadas.has(etapa.nombre)}
                          onToggleColapso={() => toggleColumnaColapsada(etapa.nombre)}
                          etapasConfig={etapasConfig}
                          tarjetasColapsadas={tarjetasColapsadas}
                          onToggleColapsoTarjeta={toggleTarjetaColapsada}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Estilos personalizados para el scrollbar horizontal azul */}
            <style>{`
              /* Scrollbar horizontal azul para el kanban */
              .kanban-scroll-container::-webkit-scrollbar {
                height: 12px;
                display: block !important;
              }
              .kanban-scroll-container::-webkit-scrollbar-track {
                background: #F3F4F6;
                border-radius: 8px;
                margin: 0 8px;
              }
              .kanban-scroll-container::-webkit-scrollbar-thumb {
                background: linear-gradient(to right, #2962FF, #003DA5);
                border-radius: 8px;
                border: 2px solid #F3F4F6;
              }
              .kanban-scroll-container::-webkit-scrollbar-thumb:hover {
                background: linear-gradient(to right, #003DA5, #2962FF);
              }

              /* Optimización responsive */
              @media (max-width: 640px) {
                .kanban-scroll-container::-webkit-scrollbar {
                  height: 10px;
                }
              }
            `}</style>
          </div>
        )}

        {tipoVista === 'lista' && (
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
            onAsociarNoticiaNoticia={handleAsociarNoticiaNoticia}
            onVerProcesoAsociado={handleVerProcesoAsociado}
            onVerNoticiaAsociada={handleVerNoticiaAsociada}
            onEditarNoticia={handleEditarNoticia}
            onEditarProceso={handleEditarProceso} // ✅ NUEVO: Editar proceso
            onCambiarEtapa={handleCambiarEtapaLista} // ✅ NUEVO: Handler específico para cambio de etapa en lista
            etapasConfig={etapasConfig}
            isMobile={isMobile}
          />
        )}

        {/* ═══ Vista Archivados ═══ */}
        {tipoVista === 'archivados' && (
          <VistaArchivados
            items={itemsArchivadosFiltrados}
            onDesarchivar={handleDesarchivar}
            onVerDetalles={(item) => {
              setItemSeleccionado(item);
              if (item.tipo === 'noticia') {
                setModalActivo('ver-detalles');
              } else {
                setModalActivo('ver-detalles');
              }
            }}
            isMobile={isMobile}
          />
        )}

        {/* MODALES - (mantener igual pero responsive) */}
        <AnimatePresence>
          {modalActivo && modalActivo !== 'ver-detalles' && modalActivo !== 'convertir-proceso' && modalActivo !== 'devolver-noticia' && modalActivo !== 'devolver-competencia' && modalActivo !== 'archivar-noticia' && modalActivo !== 'crear-noticia' && createPortal(
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.60)', padding: '4vh 4vw' }}
              onClick={(e) => e.target === e.currentTarget && setModalActivo(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 12 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                style={{ width: '92vw', height: '88vh', maxWidth: 840, maxHeight: '95vh', minHeight: 'min(480px, 80vh)' }}
              >
                {/* Modal: Crear Noticia → MOVIDO a bloque independiente (tiene su propio createPortal) */}

                {/* Modal: Convertir a Proceso → reemplazado por WizardConvertirProcesoWorldClass */}

                {/* Modal: Devolver Noticia → World Class Component */}
                {/* MOVIDO A COMPONENTE INDEPENDIENTE: ModalDevolverNoticia */}
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-2 block">
                    Profesional *
                  </label>
                  {profesionalesLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-sm text-gray-500">Cargando profesionales...</span>
                    </div>
                  ) : profesionalesList.length === 0 ? (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-sm text-amber-700">No hay profesionales disponibles</p>
                      <button
                        onClick={cargarProfesionales}
                        className="mt-2 px-3 py-1.5 bg-amber-600 text-white text-xs rounded-lg hover:bg-amber-700"
                      >
                        Reintentar
                      </button>
                    </div>
                  ) : (
                    <select
                      value={profesionalSeleccionado}
                      onChange={(e) => setProfesionalSeleccionado(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar...</option>
                      {profesionalesList.map((prof: any) => (
                        <option key={prof.id} value={prof.id}>{prof.nombre}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Modal: Devolver por Competencia → World Class Component */}
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

                      {/* ✅ Carga de entidades desde backend */}
                      {entidadesLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                          <span className="ml-2 text-sm text-gray-600">Cargando entidades...</span>
                        </div>
                      ) : entidadesError ? (
                        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                          <p className="text-sm text-red-700 font-semibold">Error al cargar entidades</p>
                          <p className="text-xs text-red-600 mt-1">{entidadesError}</p>
                          <button
                            onClick={cargarEntidadesRemision}
                            className="mt-2 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700"
                          >
                            Reintentar
                          </button>
                        </div>
                      ) : entidadesRemision.length === 0 ? (
                        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                          <p className="text-sm text-amber-700 font-semibold">⚠️ No hay entidades de remisión configuradas</p>
                          <p className="text-xs text-amber-600 mt-1">
                            Para remitir noticias por competencia, primero debe configurar las entidades en la sección de configuración del sistema.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <label className="text-sm font-bold text-gray-700 mb-2 block">
                            Área/Entidad de Destino *
                          </label>
                          <select
                            value={areaDestinoRemision}
                            onChange={(e) => setAreaDestinoRemision(e.target.value)}
                            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                            disabled={false}
                          >
                            <option value="">Seleccionar área/entidad...</option>
                            {entidadesRemision.map((entidad) => (
                              <option key={entidad.id} value={entidad.id}>
                                {entidad.nombre}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            💡 Selecciona una de las {entidadesRemision.length} entidades configuradas
                          </p>
                        </div>
                      )}

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
                        disabled={isRemitiendo || !areaDestinoRemision || !observaciones.trim()}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold"
                      >
                        {isRemitiendo ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Remitir
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
                {/* MOVIDO A COMPONENTE INDEPENDIENTE: ModalRemitirCompetencia */}

                {/* Modal: Archivar Noticia - REEMPLAZADO POR COMPONENTE MODAL COMPLETO */}

                {/* Modal: Ver Detalles del Proceso - MOVIDO A ModalDetallesProceso (ver abajo) */}
                {modalActivo === 'ver-detalles-noticia-legacy' && itemSeleccionado && (
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
                                <p className={`font-bold ${(itemSeleccionado as Noticia).prioridad === 'alta' ? 'text-red-600' :
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

                          {/* ═══════════════════════════════════════════════ */}
                          {/* SECCIÓN ARCHIVOS - Disponible en todas las etapas */}
                          {/* ═══════════════════════════════════════════════ */}
                          <div className="rounded-xl border-2 overflow-hidden" style={{ borderColor: '#2962FF' }}>
                            {/* Cabecera de sección Archivos */}
                            <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}>
                              <FolderOpen className="w-4 h-4 text-white flex-shrink-0" />
                              <h5 className="text-sm font-black text-white tracking-wide uppercase">Archivos</h5>
                              <span className="ml-auto text-xs text-white/70 font-medium">
                                {(itemSeleccionado as Proceso).etapaActual}
                              </span>
                            </div>

                            {/* Grid 2×2 de tipos de archivo */}
                            <div className="grid grid-cols-2 gap-px bg-gray-200">
                              {/* ── Autos ── */}
                              {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESSOS_AUTOS_CREATE) && (
                                <button
                                  onClick={() => setModalActivo('gestion-autos')}
                                  className="group flex flex-col items-center gap-2 p-4 bg-white hover:bg-purple-50 transition-colors"
                                >
                                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow" style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)' }}>
                                    <Scale className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="text-center">
                                    <p className="text-sm font-bold text-gray-900">Autos</p>
                                    <p className="text-xs text-gray-500">Providencias</p>
                                  </div>
                                </button>
                              )}

                              {/* ── Evidencias ── */}
                              <button
                                onClick={() => setModalActivo('gestion-evidencias')}
                                className="group flex flex-col items-center gap-2 p-4 bg-white hover:bg-amber-50 transition-colors"
                              >
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow" style={{ background: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)' }}>
                                  <Archive className="w-5 h-5 text-white" />
                                </div>
                                <div className="text-center">
                                  <p className="text-sm font-bold text-gray-900">Evidencias</p>
                                  <p className="text-xs text-gray-500">Pruebas y documentos</p>
                                </div>
                              </button>

                              {/* ── Oficios ── */}
                              <button
                                onClick={() => setModalActivo('gestion-oficios')}
                                className="group flex flex-col items-center gap-2 p-4 bg-white hover:bg-cyan-50 transition-colors"
                              >
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow" style={{ background: 'linear-gradient(135deg, #0891B2 0%, #06B6D4 100%)' }}>
                                  <Mail className="w-5 h-5 text-white" />
                                </div>
                                <div className="text-center">
                                  <p className="text-sm font-bold text-gray-900">Oficios</p>
                                  <p className="text-xs text-gray-500">Comunicaciones</p>
                                </div>
                              </button>

                              {/* ── Actas ── */}
                              <button
                                onClick={() => setModalActivo('gestion-actas')}
                                className="group flex flex-col items-center gap-2 p-4 bg-white hover:bg-red-50 transition-colors"
                              >
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow" style={{ background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)' }}>
                                  <FileCheck className="w-5 h-5 text-white" />
                                </div>
                                <div className="text-center">
                                  <p className="text-sm font-bold text-gray-900">Actas</p>
                                  <p className="text-xs text-gray-500">Diligencias</p>
                                </div>
                              </button>
                            </div>

                            {/* Fila inferior: Historial de auditoría */}
                            <div className="bg-gray-50 border-t border-gray-200 px-3 py-2">
                              <button
                                onClick={() => setModalActivo('historial-auditoria')}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white transition-colors text-xs font-semibold text-gray-600 hover:text-gray-900"
                              >
                                <History className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                                <span>Historial de Auditoría</span>
                                <ChevronDown className="w-3 h-3 ml-auto text-gray-400 -rotate-90" />
                              </button>
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
                              {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_EXPIDENTE_ELECTRONICO_DOC_UPLOAD) && (
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
                              )}
                            </div>
                          </div>

                          {/* Métricas - SOLO PROCESOS */}
                          <div>
                            <h5 className="text-sm font-bold text-gray-700 mb-2">ESTADÍSTICAS</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
            </motion.div>,
            document.body
          )}
        </AnimatePresence>

        {/* ✅ MODAL CREAR NOTICIA — Independiente (tiene su propio createPortal) */}
        {modalActivo === 'crear-noticia' && (
          <CreateNoticiaModal
            onClose={() => setModalActivo(null)}
            onSave={handleCrearNoticia}
          />
        )}

        {/* MODALES DE GESTIÓN DOCUMENTAL */}
        <AnimatePresence>
          {modalActivo === 'gestion-autos' && itemSeleccionado && (
            <WizardCrearAutoWorldClass
              key="modal-gestion-autos"
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
              key="modal-gestion-evidencias"
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
              key="modal-gestion-oficios"
              proceso={itemSeleccionado}
              onClose={() => setModalActivo(null)}
              onOficioCreado={() => {
                toast.success('Oficio creado exitosamente', {
                  description: 'El oficio ha sido generado y guardado correctamente'
                });
                // No cerrar el modal - el componente cambiará automáticamente a la vista de lista
              }}
            />
          )}

          {modalActivo === 'gestion-actas' && itemSeleccionado && (
            <WizardActasWorldClass
              key="modal-gestion-actas"
              proceso={itemSeleccionado}
              onClose={() => setModalActivo(null)}
            />
          )}



          {modalActivo === 'historial-auditoria' && itemSeleccionado && (
            <ModalHistorialAuditoria
              key="modal-historial-auditoria"
              proceso={itemSeleccionado}
              onClose={() => setModalActivo(null)}
            />
          )}

          {/* ✅ MODAL: Subir Documentos/Evidencias */}
          <ModalSubirDocumento
            key="modal-subir-documentos"
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
              key="modal-archivar-noticia"
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

          {/* ✅ Modal Devolver Noticia — World Class */}
          {modalActivo === 'devolver-noticia' && itemSeleccionado && itemSeleccionado.tipo === 'noticia' && (
            <ModalDevolverNoticia
              key="modal-devolver-noticia"
              noticia={{
                id: itemSeleccionado.id,
                numero: itemSeleccionado.numero,
                origen: (itemSeleccionado as any).origen || 'N/A',
                fechaRecepcion: (itemSeleccionado as any).fechaRecepcion || new Date().toISOString(),
                denunciante: {
                  nombre: typeof itemSeleccionado.denunciante === 'string' ? itemSeleccionado.denunciante : itemSeleccionado.denunciante?.nombre || 'Sin informacion',
                  identificacion: typeof itemSeleccionado.denunciante !== 'string' && itemSeleccionado.denunciante?.numeroIdentificacion
                    ? `${itemSeleccionado.denunciante.tipoIdentificacion} ${itemSeleccionado.denunciante.numeroIdentificacion}` : undefined,
                },
                denunciado: {
                  nombre: typeof itemSeleccionado.denunciado === 'string' ? itemSeleccionado.denunciado : itemSeleccionado.denunciado?.nombre || 'Sin informacion',
                  identificacion: typeof itemSeleccionado.denunciado !== 'string' && itemSeleccionado.denunciado?.numeroIdentificacion
                    ? `${itemSeleccionado.denunciado.tipoIdentificacion} ${itemSeleccionado.denunciado.numeroIdentificacion}` : undefined,
                },
                hechos: (itemSeleccionado as any).hechos,
              }}
              onClose={() => { setModalActivo(null); setItemSeleccionado(null); }}
              onConfirm={handleConfirmarDevolucion}
            />
          )}

          {/* ✅ Modal Remitir por Competencia — World Class */}
          {modalActivo === 'devolver-competencia' && itemSeleccionado && itemSeleccionado.tipo === 'noticia' && (
            <ModalRemitirCompetencia
              key="modal-remitir-competencia"
              noticia={{
                id: itemSeleccionado.id,
                numero: itemSeleccionado.numero,
                origen: (itemSeleccionado as any).origen || 'N/A',
                fechaRecepcion: (itemSeleccionado as any).fechaRecepcion || new Date().toISOString(),
                denunciante: {
                  nombre: typeof itemSeleccionado.denunciante === 'string' ? itemSeleccionado.denunciante : itemSeleccionado.denunciante?.nombre || 'Sin informacion',
                  identificacion: typeof itemSeleccionado.denunciante !== 'string' && itemSeleccionado.denunciante?.numeroIdentificacion
                    ? `${itemSeleccionado.denunciante.tipoIdentificacion} ${itemSeleccionado.denunciante.numeroIdentificacion}` : undefined,
                },
                denunciado: {
                  nombre: typeof itemSeleccionado.denunciado === 'string' ? itemSeleccionado.denunciado : itemSeleccionado.denunciado?.nombre || 'Sin informacion',
                  identificacion: typeof itemSeleccionado.denunciado !== 'string' && itemSeleccionado.denunciado?.numeroIdentificacion
                    ? `${itemSeleccionado.denunciado.tipoIdentificacion} ${itemSeleccionado.denunciado.numeroIdentificacion}` : undefined,
                  cargo: (itemSeleccionado as any).cargo,
                },
                hechos: (itemSeleccionado as any).hechos,
              }}
              entidadesConfiguradas={entidadesRemision}
              onClose={() => { setModalActivo(null); setItemSeleccionado(null); }}
              onConfirm={handleConfirmarDevolucionCompetencia}
            />
          )}

          {/* ✅ NUEVO: Modal Asociar Noticia a Proceso Existente */}
          <ModalAsociarNoticiaProceso
            key="modal-asociar-noticia-proceso"
            isOpen={modalActivo === 'asociar-noticia-proceso' && !!itemSeleccionado}
            onClose={() => {
              setModalActivo(null);
              setItemSeleccionado(null);
            }}
            noticia={itemSeleccionado?.tipo === 'noticia' ? itemSeleccionado as Noticia : null}
            procesosDisponibles={items.filter(i => i.tipo === 'proceso') as Proceso[]}
            onAsociar={handleConfirmarAsociacion}
          />

          {/* ✅ NUEVO: Modal Asociar Noticia a Otra Noticia */}
          <ModalAsociarNoticiaANoticia
            key="modal-asociar-noticia-noticia"
            isOpen={modalActivo === 'asociar-noticia-noticia' && !!itemSeleccionado}
            onClose={() => {
              setModalActivo(null);
              setItemSeleccionado(null);
            }}
            noticia={itemSeleccionado?.tipo === 'noticia' ? itemSeleccionado as Noticia : null}
            noticiasDisponibles={items.filter(i => i.tipo === 'noticia' && i.id !== itemSeleccionado?.id) as Noticia[]}
            onAsociar={handleConfirmarAsociacionNoticiaANoticia}
          />

          {/* ✅ NUEVO: Modal Asociar Proceso a Proceso (estados post-Recepción) */}
          <ModalAsociarProcesoAProceso
            key="modal-asociar-proceso-proceso"
            isOpen={modalActivo === 'asociar-proceso-proceso' && !!itemSeleccionado}
            onClose={() => {
              setModalActivo(null);
              setItemSeleccionado(null);
            }}
            procesoOrigen={itemSeleccionado?.tipo === 'proceso' ? itemSeleccionado as Proceso : null}
            procesosDisponibles={items.filter(i => i.tipo === 'proceso' && i.id !== itemSeleccionado?.id) as Proceso[]}
            onAsociar={handleConfirmarAsociacionProcesoProceso}
          />

          {/* ✅ NUEVO: Modal Asignar Profesional en transición Recepción → Valoración */}
          {modalActivo === 'asignar-profesional' && itemSeleccionado && (
            <ModalAsignarProfesional
              key="modal-asignar-profesional"
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
              key="modal-solicitar-reasignacion"
              proceso={itemSeleccionado}
              profesionales={profesionalesList.map((p: any) => ({
                id: p.id,
                nombreCompleto: p.nombre,
                nombre: p.nombre,
                cargo: 'Profesional de Control Interno Disciplinario',
                estado: 'activo',
                capacidadMaxima: 15,
                procesosAsignados: 0,
                territorial: '',
                tipoContrato: 'Planta'
              }))}
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
              key="modal-aprobar-reasignacion"
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
              key="modal-aprobar-borrador"
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

        {/* ✅ MODAL DETALLES PROCESO - World Class con pestañas */}
        {modalActivo === 'ver-detalles' && itemSeleccionado && itemSeleccionado.tipo === 'proceso' && (
          <ModalDetallesProceso
            proceso={itemSeleccionado as Proceso}
            onClose={() => { setModalActivo(null); setItemSeleccionado(null); }}
            onReabrir={() => {
              setModalActivo('ver-detalles');
            }}
            onGestionAutos={() => setModalActivo('gestion-autos')}
            onGestionEvidencias={() => setModalActivo('gestion-evidencias')}
            onGestionOficios={() => setModalActivo('gestion-oficios')}
            onGestionActas={() => setModalActivo('gestion-actas')}
            onHistorial={() => setModalActivo('historial-auditoria')}
            onExpediente={() => {
              setModalActivo(null);
              handleVerExpediente(itemSeleccionado as Proceso);
            }}
            onActualizarProceso={(updates) => {
              const procesoId = (itemSeleccionado as Proceso).id;
              setItemSeleccionado((prev: any) => prev ? { ...prev, ...updates } : prev);
              setItems((prev) => prev.map((item) =>
                item.tipo === 'proceso' && item.id === procesoId
                  ? ({ ...item, ...updates } as Item)
                  : item
              ));
            }}
            onEnviarARevision={onEnviarARevision}
            onNavigateToRevision={onNavigateToRevision ? () => {
              setModalActivo(null);
              setItemSeleccionado(null);
              onNavigateToRevision();
            } : undefined}
          />
        )}

        {/* ══ DETALLES DE NOTICIA — World Class Completo ══ */}
        {modalActivo === 'ver-detalles' && itemSeleccionado && itemSeleccionado.tipo === 'noticia' && (
          <ModalDetallesNoticia
            noticia={itemSeleccionado as Noticia}
            onClose={() => setModalActivo(null)}
            onEditar={(noticia) => handleEditarNoticia(noticia as Noticia)}
            onConvertir={(noticia) => handleConvertirNoticia(noticia as Noticia)}
            onDownload={async (url, filename) => {
              await disciplinaryService.downloadFileFromUrl(disciplinaryService.getFileUrl(url), filename);
            }}
          />
        )}

        {/* NUEVO: MODAL DETALLES ASOCIACION - Ver detalles de asociacion entre procesos */}
        {modalActivo === 'ver-detalles-asociacion' && itemSeleccionado && itemSeleccionado.tipo === 'proceso' && (() => {
          const procesoOrigen = itemSeleccionado as Proceso;
          const procesoDestino = items.find(item =>
            item.tipo === 'proceso' && item.id === procesoOrigen.procesoAsociadoId
          ) as Proceso | undefined;

          return (
            <ModalDetallesAsociacion
              isOpen={modalActivo === 'ver-detalles-asociacion'}
              onClose={() => {
                setModalActivo(null);
                setItemSeleccionado(null);
              }}
              procesoOrigen={procesoOrigen}
              procesoDestino={procesoDestino}
              tipoAsociacion={procesoOrigen.procesoAsociadoTipo}
              fechaAsociacion={procesoOrigen.procesoAsociadoFecha}
              onVerProceso={handleVerProcesoAsociado}
            />
          );
        })()}

        {/* ✅ NUEVO: MODAL DETALLES REMISIÓN — Ver información completa de remisión por competencia */}
        {modalActivo === 'ver-detalles-remision' && itemSeleccionado && itemSeleccionado.tipo === 'noticia' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setModalActivo(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="bg-purple-600 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Send className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Remisión por Competencia</h2>
                    <p className="text-white text-sm">Noticia: {itemSeleccionado.numero}</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalActivo(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                <div className="space-y-4">
                  {/* Número RC */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-xs font-bold text-purple-600 uppercase mb-1">Número de Radicado de Remisión</p>
                    <p className="text-xl font-bold text-purple-900">{(itemSeleccionado as any).numeroRC || itemSeleccionado.numeroRC || '—'}</p>
                  </div>

                  {/* Entidad de Remisión */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Entidad Destino</p>
                    <p className="text-base font-semibold text-gray-900">{(itemSeleccionado as any).entidadRemision || itemSeleccionado.entidadRemision || '—'}</p>
                  </div>

                  {/* Tipo de Remisión */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Remisión</p>
                    <p className="text-base font-semibold text-gray-900">{(itemSeleccionado as any).tipoRemision || itemSeleccionado.tipoRemision || '—'}</p>
                  </div>

                  {/* Fecha de Remisión */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Fecha de Remisión</p>
                    <p className="text-base font-semibold text-gray-900">
                      {itemSeleccionado.fechaRemision
                        ? new Date(itemSeleccionado.fechaRemision).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
                        : ((itemSeleccionado as any).fechaRemision
                          ? new Date((itemSeleccionado as any).fechaRemision).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
                          : '—')}
                    </p>
                  </div>

                  {/* Fundamento Legal */}
                  {(itemSeleccionado as any).fundamentoLegalRemision || itemSeleccionado.fundamentoLegalRemision ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-1">Fundamento Legal</p>
                      <p className="text-base text-gray-700">{(itemSeleccionado as any).fundamentoLegalRemision || itemSeleccionado.fundamentoLegalRemision}</p>
                    </div>
                  ) : null}

                  {/* Justificación */}
                  {(itemSeleccionado as any).justificacionRemision || itemSeleccionado.justificacionRemision ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-1">Justificación</p>
                      <p className="text-base text-gray-700">{(itemSeleccionado as any).justificacionRemision || itemSeleccionado.justificacionRemision}</p>
                    </div>
                  ) : null}
                </div>

                {/* Actions */}
                <div className="mt-6 pt-4 border-t border-gray-200 flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setModalActivo(null)}
                    className="gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cerrar
                  </Button>
                  {/* <Button
                    onClick={() => {
                      // Abrir detalles completos de la noticia
                      setModalActivo('ver-detalles');
                    }}
                    className="gap-2 bg-purple-600 hover:bg-purple-700"
                  >
                    <Eye className="w-4 h-4" />
                    Ver Detalles Completos
                  </Button> */}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* ══ DETALLES DE NOTICIA — World Class Completo ══ */}
        {modalActivo === 'ver-detalles' && itemSeleccionado && itemSeleccionado.tipo === 'noticia' && (
          <ModalDetallesNoticia
            noticia={itemSeleccionado as Noticia}
            onClose={() => { setModalActivo(null); setItemSeleccionado(null); }}
            onEditar={(n) => handleEditarNoticia(n as any)}
            onConvertir={(n) => handleConvertirNoticia(n as any)}
            onDownload={async (url, filename) => {
              await disciplinaryService.downloadFileFromUrl(disciplinaryService.getFileUrl(url), filename);
            }}
          />
        )}

        {/* ✅ ELIMINADO: Modal Generar Auto Contextual - Ya cubierto con funciones maduras */}

        {/* ✅ WIZARD: Convertir Noticia a Proceso — World Class con disponibilidad de profesionales */}
        <AnimatePresence>
          {modalActivo === 'convertir-proceso' && itemSeleccionado && itemSeleccionado.tipo === 'noticia' && (() => {
            const noticia = itemSeleccionado as any;
            const denunciado = typeof noticia.denunciado === 'string'
              ? { nombre: noticia.denunciado, tipoIdentificacion: 'CC', numeroIdentificacion: '—' }
              : noticia.denunciado;
            const denunciante = noticia.denunciante
              ? typeof noticia.denunciante === 'string'
                ? { nombre: noticia.denunciante }
                : { nombre: noticia.denunciante.nombre, tipoIdentificacion: noticia.denunciante.tipoIdentificacion, numeroIdentificacion: noticia.denunciante.numeroIdentificacion }
              : undefined;
            return (
              <WizardConvertirProcesoWorldClass
                noticia={{
                  id: noticia.id,
                  numero: noticia.numero,
                  hechos: noticia.hechos ?? '',
                  fechaRecepcion: noticia.fechaRecepcion,
                  origen: noticia.origen,
                  prioridad: noticia.prioridad,
                  denunciado: {
                    nombre: denunciado.nombre,
                    tipoIdentificacion: denunciado.tipoIdentificacion,
                    numeroIdentificacion: denunciado.numeroIdentificacion,
                    cargo: noticia.cargo,
                    dependencia: noticia.dependencia,
                  },
                  denunciante,
                }}
                onConfirmar={handleConversionDesdeWizard}
                onCerrar={() => setModalActivo(null)}
              />
            );
          })()}
        </AnimatePresence>

        {/* Modal de Confirmación de Restauración */}
        <AnimatePresence>
          {mostrarModalRestaurar && itemParaRestaurar && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[1000]"
              onClick={() => setMostrarModalRestaurar(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              >
                {/* Header */}
                <div className="p-6 border-b bg-gradient-to-r from-green-50 to-emerald-50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100">
                      <RefreshCw className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Confirmar Restauración</h2>
                      <p className="text-sm text-gray-600">Restaurar al flujo activo</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-green-900 mb-1">¿Restaurar este elemento?</h4>
                        <p className="text-sm text-green-800 mb-3">
                          El elemento será restaurado al flujo activo y volverá a aparecer en el tablero.
                        </p>
                        <div className="bg-white rounded p-3 space-y-1">
                          <p className="text-sm"><strong>Tipo:</strong> {itemParaRestaurar.tipo === 'noticia' ? 'Noticia' : 'Proceso'}</p>
                          <p className="text-sm"><strong>Número:</strong> {itemParaRestaurar.numero || itemParaRestaurar.numeroProceso}</p>
                          <p className="text-sm"><strong>Estado:</strong> Archivado</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setMostrarModalRestaurar(false);
                        setItemParaRestaurar(null);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={confirmarRestauracion}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Restaurar
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DndProvider>
  );
}
