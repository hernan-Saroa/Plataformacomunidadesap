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
  List, Columns3, Menu, Edit2, FileSignature, History
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
  ModalGestionAutos,
  ModalGestionEvidencias,
  ModalGestionOficios,
  ModalGestionActas,
  ModalHistorialAuditoria
} from './ModalesGestionDocumental';
import { ModalArchivarNoticia } from './ModalArchivarNoticia';

// ==================== TIPOS ====================
interface Noticia {
  id: string;
  numero: string;
  fechaRecepcion: string;
  origen: string;
  denunciado: string;
  hechos: string;
  estado: 'pendiente' | 'en-valoracion' | 'asignada' | 'archivada';
  prioridad: 'alta' | 'media' | 'baja';
  diasPendientes: number;
  tipo: 'noticia';
}

interface Proceso {
  id: string;
  numeroProceso: string;
  noticiaOrigen: string;
  denunciado: string;
  cedula: string;
  etapaActual: 'Recepción' | 'Valoración' | 'Indagación' | 'Investigación' | 'Juzgamiento' | 'Fallo';
  estadoActual: string;
  profesionalAsignado: string;
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
  | null;

// ==================== MOCK DATA ====================
const NOTICIAS_MOCK: Noticia[] = [
  {
    id: 'n1',
    numero: 'ND-2025-0260',
    fechaRecepcion: '2025-01-15',
    origen: 'Denuncia Ciudadana',
    denunciado: 'Juan Pérez Gómez',
    hechos: 'Presunto acoso laboral en Territorial Bogotá',
    estado: 'pendiente',
    prioridad: 'alta',
    diasPendientes: 3,
    tipo: 'noticia'
  },
  {
    id: 'n2',
    numero: 'ND-2025-0261',
    fechaRecepcion: '2025-01-16',
    origen: 'Oficio Interno',
    denunciado: 'María González Castro',
    hechos: 'Incumplimiento de deberes administrativos',
    estado: 'pendiente',
    prioridad: 'media',
    diasPendientes: 5,
    tipo: 'noticia'
  },
  {
    id: 'n3',
    numero: 'ND-2025-0262',
    fechaRecepcion: '2025-01-17',
    origen: 'Queja Formal',
    denunciado: 'Carlos Ramírez López',
    hechos: 'Uso indebido de recursos públicos',
    estado: 'pendiente',
    prioridad: 'alta',
    diasPendientes: 1,
    tipo: 'noticia'
  }
];

const PROCESOS_MOCK: Proceso[] = [
  {
    id: 'p1',
    numeroProceso: 'PD-2025-0025',
    noticiaOrigen: 'ND-2025-0152',
    denunciado: 'Ana María López Martínez',
    cedula: '52123456',
    etapaActual: 'Valoración',
    estadoActual: 'En Gestión',
    profesionalAsignado: 'Juan Pérez',
    semaforo: 'amarillo',
    diasRestantes: 3,
    porcentajeTiempo: 70,
    borradores: [],
    documentos: [],
    pendienteAprobacion: false,
    ultimaActuacion: 'Asignado para valoración',
    fechaCreacion: '2025-01-26',
    tipo: 'proceso'
  },
  {
    id: 'p2',
    numeroProceso: 'PD-2025-0018',
    noticiaOrigen: 'ND-2025-0089',
    denunciado: 'Roberto Sánchez Cruz',
    cedula: '77385960',
    etapaActual: 'Indagación',
    estadoActual: 'En Gestión',
    profesionalAsignado: 'María García',
    semaforo: 'verde',
    diasRestantes: 45,
    porcentajeTiempo: 25,
    borradores: [],
    documentos: [],
    pendienteAprobacion: true,
    ultimaActuacion: 'Recepción de descargos',
    fechaCreacion: '2024-12-15',
    tipo: 'proceso'
  },
  {
    id: 'p3',
    numeroProceso: 'PD-2025-0032',
    noticiaOrigen: 'ND-2025-0180',
    denunciado: 'Luis Hernández Silva',
    cedula: '88776655',
    etapaActual: 'Recepción',
    estadoActual: 'En Gestión',
    profesionalAsignado: 'Carlos Mendoza',
    semaforo: 'verde',
    diasRestantes: 28,
    porcentajeTiempo: 10,
    borradores: [],
    documentos: [],
    pendienteAprobacion: false,
    ultimaActuacion: 'Proceso creado',
    fechaCreacion: '2025-01-28',
    tipo: 'proceso'
  }
];

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
  onArchivar: (noticia: Noticia) => void;
  vistaCompacta: boolean;
  isMobile?: boolean;
}

function TarjetaNoticia({ noticia, onConvertir, onDevolver, onArchivar, vistaCompacta, isMobile }: TarjetaNoticiaProps) {
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
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: isDragging ? 0.95 : 1 }}
      className="cursor-move touch-none"
    >
      <Card 
        className="bg-white border border-gray-200 hover:shadow-md transition-all overflow-hidden"
      >
        {/* Barra superior azul ESAP */}
        <div 
          className="h-1"
          style={{ background: '#003DA5' }}
        />

        <div className={`${isMobile ? 'p-2.5' : 'p-3'}`}>
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
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

            <Badge
              className={`${isMobile ? 'text-xs px-2' : 'text-xs px-2'} font-semibold flex-shrink-0 ml-2 bg-gray-50 text-gray-700 border border-gray-200`}
            >
              NOTICIA
            </Badge>
          </div>

          {/* Denunciado */}
          <div className="mb-2 pb-2 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">Denunciado:</p>
            <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 ${isMobile ? 'line-clamp-1' : 'line-clamp-2'}`}>
              {noticia.denunciado}
            </p>
          </div>

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

          {/* Acciones */}
          <div className="space-y-1.5">
            <Button
              onClick={() => onConvertir(noticia)}
              size="sm"
              className={`w-full ${isMobile ? 'text-xs py-1.5' : 'text-xs'} font-bold`}
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <PlusCircle className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} mr-1.5`} />
              Convertir
            </Button>
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                onClick={() => onDevolver(noticia)}
                size="sm"
                variant="outline"
                className={`${isMobile ? 'text-xs py-1.5' : 'text-xs'}`}
              >
                <ArrowLeft className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1`} />
                {isMobile ? '' : 'Devolver'}
              </Button>
              <Button
                onClick={() => onArchivar(noticia)}
                size="sm"
                variant="outline"
                className={`${isMobile ? 'text-xs py-1.5' : 'text-xs'} text-red-600 hover:bg-red-50 border-red-200`}
              >
                <Archive className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1`} />
                {isMobile ? '' : 'Archivar'}
              </Button>
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
  vistaCompacta: boolean;
  isMobile?: boolean;
}

function TarjetaProceso({ 
  proceso, 
  onVerDetalles, 
  onAprobarBorrador, 
  onVerExpediente, 
  onGestionAutos,
  onGestionEvidencias,
  onGestionOficios,
  onGestionActas,
  vistaCompacta, 
  isMobile 
}: TarjetaProcesoProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'ITEM',
    item: { ...proceso, tipoItem: 'proceso' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const [showActions, setShowActions] = useState(false);

  const semaforoIndicator = {
    verde: { color: '#10B981', label: 'En término' },
    amarillo: { color: '#F59E0B', label: 'Próximo a vencer' },
    rojo: { color: '#DC2626', label: 'Vencido' }
  };

  const semaforo = semaforoIndicator[proceso.semaforo];

  return (
    <motion.div
      ref={drag}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: isDragging ? 0.95 : 1 }}
      className="cursor-move touch-none"
    >
      <Card 
        className="bg-white border border-gray-200 hover:shadow-md transition-all overflow-hidden"
      >
        {/* Barra superior azul ESAP */}
        <div 
          className="h-1"
          style={{ background: '#003DA5' }}
        />

        <div className={`${isMobile ? 'p-2.5' : 'p-3'}`}>
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
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

          {/* Denunciado */}
          <div className="mb-2 pb-2 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">Denunciado:</p>
            <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 ${isMobile ? 'line-clamp-1' : 'line-clamp-2'}`}>
              {proceso.denunciado}
            </p>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
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
          </div>

          {/* Profesional - Ocultar en mobile compacto */}
          {!vistaCompacta && !isMobile && (
            <div className="flex items-center gap-2 mb-2.5 pb-2.5 border-b border-gray-200">
              <Avatar className="w-6 h-6">
                <AvatarFallback 
                  className="text-xs"
                  style={{ background: '#E0EDFF', color: '#003DA5' }}
                >
                  {proceso.profesionalAsignado.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">{proceso.profesionalAsignado}</p>
                <p className="text-xs text-gray-500">Responsable</p>
              </div>
            </div>
          )}

          {/* Métricas */}
          <div className="grid grid-cols-3 gap-1.5 mb-2.5">
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

          {/* Última actuación - Solo desktop */}
          {!vistaCompacta && !isMobile && (
            <div className="mb-2.5">
              <p className="text-xs text-gray-500 mb-0.5">Última actuación:</p>
              <p className="text-xs text-gray-700 line-clamp-1">{proceso.ultimaActuacion}</p>
            </div>
          )}

          {/* Acciones Principales - Siempre Visibles */}
          <div className="space-y-1.5 pt-2.5 border-t border-gray-200">
            {/* Acción Principal: Ver Expediente */}
            <Button
              onClick={() => onVerExpediente(proceso)}
              size="sm"
              className={`w-full ${isMobile ? 'text-xs py-1.5' : 'text-xs'} font-bold`}
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Archive className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1.5`} />
              {isMobile ? 'Expediente' : 'Ver Expediente'}
            </Button>

            {/* Acciones rápidas Mobile (Solo en Vista Detallada) */}
            {!vistaCompacta && isMobile && (
              <Button
                onClick={() => onVerDetalles(proceso)}
                size="sm"
                variant="outline"
                className="w-full text-xs py-1.5"
              >
                <Eye className="w-2.5 h-2.5 mr-1.5" />
                Ver Detalles
              </Button>
            )}

            {/* Gestión Documental - Grid compacto (Solo Desktop en Vista Detallada) */}
            {!vistaCompacta && !isMobile && (
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  onClick={() => {
                    if (onGestionAutos) {
                      onGestionAutos(proceso);
                    } else {
                      toast.info('Autos y Providencias', {
                        description: proceso.numeroProceso
                      });
                    }
                  }}
                  size="sm"
                  variant="outline"
                  className={`${isMobile ? 'text-xs py-1.5' : 'text-xs'} justify-start`}
                >
                  <Scale className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1`} />
                  Autos
                </Button>
                
                <Button
                  onClick={() => {
                    if (onGestionEvidencias) {
                      onGestionEvidencias(proceso);
                    } else {
                      toast.info('Evidencias', {
                        description: proceso.numeroProceso
                      });
                    }
                  }}
                  size="sm"
                  variant="outline"
                  className={`${isMobile ? 'text-xs py-1.5' : 'text-xs'} justify-start`}
                >
                  <Archive className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1`} />
                  Evidencias
                </Button>

                <Button
                  onClick={() => {
                    if (onGestionOficios) {
                      onGestionOficios(proceso);
                    } else {
                      toast.info('Oficios', {
                        description: proceso.numeroProceso
                      });
                    }
                  }}
                  size="sm"
                  variant="outline"
                  className={`${isMobile ? 'text-xs py-1.5' : 'text-xs'} justify-start`}
                >
                  <Mail className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1`} />
                  Oficios
                </Button>

                <Button
                  onClick={() => {
                    if (onGestionActas) {
                      onGestionActas(proceso);
                    } else {
                      toast.info('Actas', {
                        description: proceso.numeroProceso
                      });
                    }
                  }}
                  size="sm"
                  variant="outline"
                  className={`${isMobile ? 'text-xs py-1.5' : 'text-xs'} justify-start`}
                >
                  <FileCheck className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1`} />
                  Actas
                </Button>
              </div>
            )}

            {/* Aprobación si está pendiente */}
            {proceso.pendienteAprobacion && (
              <Button
                onClick={() => onAprobarBorrador(proceso)}
                size="sm"
                className={`w-full ${isMobile ? 'text-xs py-1.5' : 'text-xs'} bg-green-600 hover:bg-green-700 text-white font-bold`}
              >
                <CheckCircle className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1.5`} />
                Aprobar Borrador
              </Button>
            )}

            {/* Ver más opciones - Toggle (Solo Desktop en Vista Detallada) */}
            {!vistaCompacta && !isMobile && (
              <button
                onClick={() => setShowActions(!showActions)}
                className="w-full text-xs py-2 text-gray-600 hover:text-gray-900 font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                {showActions ? (
                  <>
                    <ChevronDown className="w-3 h-3 rotate-180 transition-transform" />
                    Menos opciones
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3 transition-transform" />
                    Más opciones
                  </>
                )}
              </button>
            )}
          </div>

          {/* Acciones Adicionales Expandibles - Solo Desktop */}
          <AnimatePresence>
            {showActions && !vistaCompacta && !isMobile && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1.5 pt-1.5"
              >
                <Button
                  onClick={() => onVerDetalles(proceso)}
                  size="sm"
                  variant="outline"
                  className={`w-full ${isMobile ? 'text-xs py-1.5' : 'text-xs'} font-bold`}
                  style={{ borderColor: '#003DA5', color: '#003DA5' }}
                >
                  <Eye className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1.5`} />
                  {isMobile ? 'Detalles' : 'Ver Detalles Completos'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
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
  onConvertirNoticia: (noticia: Noticia) => void;
  onArchivarNoticia: (noticia: Noticia) => void;
  onVerDetallesNoticia?: (noticia: Noticia) => void;
  onDevolverNoticia?: (noticia: Noticia) => void;
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
  onConvertirNoticia,
  onArchivarNoticia,
  onVerDetallesNoticia,
  onDevolverNoticia,
  isMobile
}: VistaListaProps) {
  const [filtroEtapa, setFiltroEtapa] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const itemsFiltrados = items.filter(item => {
    const matchSearch = item.tipo === 'noticia' 
      ? (item as Noticia).numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item as Noticia).denunciado.toLowerCase().includes(searchTerm.toLowerCase())
      : (item as Proceso).numeroProceso.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item as Proceso).denunciado.toLowerCase().includes(searchTerm.toLowerCase());
    
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
            <option value="Recepción">Recepción (Noticias)</option>
            <option value="Valoración">Valoración</option>
            <option value="Indagación">Indagación</option>
            <option value="Investigación">Investigación</option>
            <option value="Juzgamiento">Juzgamiento</option>
            <option value="Fallo">Fallo</option>
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
                      {isNoticia ? noticia!.denunciado : proceso!.denunciado}
                    </p>
                    {proceso && proceso.cedula && (
                      <p className="text-xs text-gray-600 mt-0.5">CC: {proceso.cedula}</p>
                    )}
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
                  {proceso && (
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback style={{ background: '#E0EDFF', color: '#003DA5', fontSize: '9px' }}>
                          {proceso.profesionalAsignado.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-xs font-medium text-gray-700 truncate flex-1">
                        {proceso.profesionalAsignado}
                      </p>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-gray-200 flex-wrap">
                    {isNoticia ? (
                      <>
                        {onVerDetallesNoticia && (
                          <button
                            onClick={() => onVerDetallesNoticia(noticia!)}
                            className="flex-1 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors text-xs font-semibold flex items-center justify-center gap-1.5"
                            style={{ color: '#003DA5', border: '1px solid #E0EDFF' }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver
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
                        <button
                          onClick={() => onVerDetalles(proceso!)}
                          className="flex-1 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors text-xs font-semibold flex items-center justify-center gap-1.5"
                          style={{ color: '#003DA5', border: '1px solid #E0EDFF' }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Detalles
                        </button>
                        <button
                          onClick={() => onVerExpediente(proceso!)}
                          className="flex-1 px-3 py-2 rounded-lg hover:bg-purple-50 transition-colors text-xs font-semibold flex items-center justify-center gap-1.5"
                          style={{ color: '#7C3AED', border: '1px solid #EDE9FE' }}
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          Expediente
                        </button>
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
                          {isNoticia ? noticia!.denunciado : proceso!.denunciado}
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
                      {proceso ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="w-7 h-7">
                            <AvatarFallback style={{ background: '#E0EDFF', color: '#003DA5', fontSize: '10px' }}>
                              {proceso.profesionalAsignado.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-xs font-medium" style={{ color: '#4B5563' }}>
                            {proceso.profesionalAsignado}
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
                            {/* Ver Detalles de Noticia */}
                            {onVerDetallesNoticia && (
                              <button
                                onClick={() => onVerDetallesNoticia(noticia!)}
                                className="p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                title="Ver detalles de la noticia"
                              >
                                <Eye className="w-4 h-4" style={{ color: '#003DA5' }} />
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
                            {/* Acción: Ver Detalles */}
                            <button
                              onClick={() => onVerDetalles(proceso!)}
                              className="p-2 rounded-lg hover:bg-blue-50 transition-colors"
                              title="Ver detalles del proceso"
                            >
                              <Eye className="w-4 h-4" style={{ color: '#003DA5' }} />
                            </button>
                            
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
                            
                            {/* Acción: Aprobar Borrador (condicional) */}
                            {proceso!.pendienteAprobacion && (
                              <button
                                onClick={() => onAprobarBorrador(proceso!)}
                                className="p-2 rounded-lg hover:bg-amber-50 transition-colors"
                                title="Aprobar borrador pendiente"
                              >
                                <CheckCircle className="w-4 h-4 text-amber-600" />
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
  onDrop: (item: Item, nuevaEtapa: string) => void;
  onConvertirNoticia: (noticia: Noticia) => void;
  onDevolverNoticia: (noticia: Noticia) => void;
  onArchivarNoticia: (noticia: Noticia) => void;
  onVerDetalles: (proceso: Proceso) => void;
  onAprobarBorrador: (proceso: Proceso) => void;
  onVerExpediente: (proceso: Proceso) => void;
  onGestionAutos?: (proceso: Proceso) => void;
  onGestionEvidencias?: (proceso: Proceso) => void;
  onGestionOficios?: (proceso: Proceso) => void;
  onGestionActas?: (proceso: Proceso) => void;
  vistaCompacta: boolean;
  isMobile?: boolean;
}

function ColumnaKanban({ 
  etapa, 
  items, 
  color, 
  icono,
  onDrop, 
  onConvertirNoticia,
  onDevolverNoticia,
  onArchivarNoticia,
  onVerDetalles, 
  onAprobarBorrador, 
  onVerExpediente,
  onGestionAutos,
  onGestionEvidencias,
  onGestionOficios,
  onGestionActas,
  vistaCompacta,
  isMobile
}: ColumnaKanbanProps) {
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

  const itemsFiltrados = items.filter(item => {
    if (item.tipo === 'noticia') {
      return etapa === 'Recepción';
    }
    return item.tipo === 'proceso' && item.etapaActual === etapa;
  });

  const noticias = itemsFiltrados.filter(i => i.tipo === 'noticia') as Noticia[];
  const procesos = itemsFiltrados.filter(i => i.tipo === 'proceso') as Proceso[];

  const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
  const columnWidth = isMobile ? 'w-72' : isTablet ? 'w-64' : 'w-80';

  return (
    <div
      ref={drop}
      className={`flex-shrink-0 ${columnWidth}`}
    >
      <Card 
        className="h-full border transition-all"
        style={{
          borderColor: isOver && canDrop ? color : '#E5E7EB',
          background: isOver && canDrop ? '#F9FAFB' : '#FFFFFF',
          opacity: isOver && !canDrop ? 0.5 : 1
        }}
      >
        {/* Header de Columna */}
        <div 
          className={`${isMobile ? 'p-3' : 'p-4'} border-b sticky top-0 z-10 bg-gray-50`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div 
                className={`${isMobile ? 'p-1.5' : 'p-2'} rounded-lg bg-white border border-gray-200`}
              >
                {icono}
              </div>
              <h3 className={`font-black ${isMobile ? 'text-xs' : 'text-sm'} text-gray-800`}>
                {etapa}
              </h3>
            </div>
            <Badge
              className={`font-semibold ${isMobile ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'} bg-white border border-gray-200 text-gray-700`}
            >
              {itemsFiltrados.length}
            </Badge>
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
          className={`${isMobile ? 'p-2' : 'p-3'} space-y-3 overflow-y-auto`} 
          style={{ maxHeight: isMobile ? 'calc(100vh - 380px)' : 'calc(100vh - 280px)' }}
        >
          {/* Renderizar Noticias primero */}
          {noticias.map((noticia) => (
            <TarjetaNoticia
              key={noticia.id}
              noticia={noticia}
              onConvertir={onConvertirNoticia}
              onDevolver={onDevolverNoticia}
              onArchivar={onArchivarNoticia}
              vistaCompacta={vistaCompacta}
              isMobile={isMobile}
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
              vistaCompacta={vistaCompacta}
              isMobile={isMobile}
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
    </div>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================
export function DashboardKanbanOperativo() {
  const [items, setItems] = useState<Item[]>([...NOTICIAS_MOCK, ...PROCESOS_MOCK]);
  const [modalActivo, setModalActivo] = useState<ModalType>(null);
  const [itemSeleccionado, setItemSeleccionado] = useState<any>(null);
  const [tipoVista, setTipoVista] = useState<'kanban' | 'lista'>('kanban');
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [vistaCompacta, setVistaCompacta] = useState(false);

  // Estados para formularios
  const [formNuevaNoticia, setFormNuevaNoticia] = useState({
    denunciado: '',
    hechos: '',
    origen: 'Denuncia Ciudadana',
    prioridad: 'media' as 'alta' | 'media' | 'baja'
  });

  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Detectar tamaño de pantalla con breakpoints mejorados
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      
      // Auto-activar vista compacta en mobile y tablet
      if (width < 1024) {
        setVistaCompacta(true);
      } else {
        setVistaCompacta(false);
      }
      
      // Auto-cambiar a vista lista en mobile pequeño
      if (width < 640 && tipoVista === 'kanban') {
        setTipoVista('lista');
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [tipoVista]);

  // Detectar touch para usar TouchBackend
  const isTouchDevice = () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  };

  const etapas = [
    { nombre: 'Recepción', color: '#6B7280', icono: <FileCheck className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} /> },
    { nombre: 'Valoración', color: '#6B7280', icono: <Eye className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} /> },
    { nombre: 'Indagación', color: '#6B7280', icono: <Search className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} /> },
    { nombre: 'Investigación', color: '#003DA5', icono: <Scale className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} style={{ color: '#003DA5' }} /> },
    { nombre: 'Juzgamiento', color: '#6B7280', icono: <AlertTriangle className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} /> },
    { nombre: 'Fallo', color: '#6B7280', icono: <CheckCircle className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} /> }
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
        setItems(prev => prev.map(i => 
          i.id === item.id && i.tipo === 'proceso'
            ? { ...i, etapaActual: nuevaEtapa as any }
            : i
        ));
        toast.success('Proceso Movido', {
          description: `${item.numeroProceso} → ${nuevaEtapa}`
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

  const handleVerDetalles = (proceso: Proceso) => {
    setItemSeleccionado(proceso);
    setModalActivo('ver-detalles');
  };

  const handleAprobarBorrador = (proceso: Proceso) => {
    setItemSeleccionado(proceso);
    setModalActivo('aprobar-borrador');
  };

  const handleConfirmarAprobacion = () => {
    setItems(prev => prev.map(i =>
      i.id === itemSeleccionado.id && i.tipo === 'proceso'
        ? { ...i, pendienteAprobacion: false }
        : i
    ));
    toast.success('Borrador Aprobado', {
      description: itemSeleccionado.numeroProceso
    });
    setModalActivo(null);
    setItemSeleccionado(null);
  };

  const handleVerExpediente = (proceso: Proceso) => {
    toast.info('Expediente', {
      description: proceso.numeroProceso
    });
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

  // Calcular estadísticas
  const noticias = items.filter(i => i.tipo === 'noticia') as Noticia[];
  const procesos = items.filter(i => i.tipo === 'proceso') as Proceso[];
  const procesosPendientesAprobacion = procesos.filter(p => p.pendienteAprobacion).length;
  const procesosEnTermino = procesos.filter(p => p.semaforo === 'verde').length;

  // ==================== RENDER ====================
  return (
    <DndProvider backend={isTouchDevice() ? TouchBackend : HTML5Backend}>
      <div className="space-y-3 md:space-y-4">
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
                etapa={etapa.nombre}
                items={items}
                color={etapa.color}
                icono={etapa.icono}
                onDrop={handleDropItem}
                onConvertirNoticia={handleConvertirNoticia}
                onDevolverNoticia={handleDevolverNoticia}
                onArchivarNoticia={handleArchivarNoticia}
                onVerDetalles={handleVerDetalles}
                onAprobarBorrador={handleAprobarBorrador}
                onVerExpediente={handleVerExpediente}
                onGestionAutos={handleGestionAutos}
                onGestionEvidencias={handleGestionEvidencias}
                onGestionOficios={handleGestionOficios}
                onGestionActas={handleGestionActas}
                vistaCompacta={vistaCompacta}
                isMobile={isMobile}
              />
            ))}
            </div>
          </div>
        ) : (
          <VistaLista
            items={items}
            onVerDetalles={handleVerDetalles}
            onAprobarBorrador={handleAprobarBorrador}
            onVerExpediente={handleVerExpediente}
            onGestionAutos={handleGestionAutos}
            onGestionEvidencias={handleGestionEvidencias}
            onGestionOficios={handleGestionOficios}
            onGestionActas={handleGestionActas}
            onConvertirNoticia={handleConvertirNoticia}
            onArchivarNoticia={handleArchivarNoticia}
            onVerDetallesNoticia={(noticia) => {
              setItemSeleccionado(noticia);
              setModalActivo('ver-detalles');
            }}
            onDevolverNoticia={handleDevolverNoticia}
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
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
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
                          {itemSeleccionado.denunciado}
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
                        <p className="text-sm text-gray-700">{itemSeleccionado.denunciado}</p>
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

                {/* Modal: Archivar Noticia - REEMPLAZADO POR COMPONENTE MODAL COMPLETO */}

                {/* Modal: Aprobar Borrador */}
                {modalActivo === 'aprobar-borrador' && itemSeleccionado && (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-green-100">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-black text-gray-900`}>
                          Aprobar Borrador
                        </h3>
                      </div>
                      <button onClick={() => setModalActivo(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 rounded-xl border-2 border-green-200">
                        <p className="text-sm font-bold text-green-700 mb-1">Proceso:</p>
                        <p className="text-sm text-gray-900"> {itemSeleccionado.numeroProceso}</p>
                      </div>
                      <p className="text-sm text-gray-600">
                        Al aprobar, el documento pasará a estado final y se notificará al profesional asignado.
                      </p>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <Button onClick={() => setModalActivo(null)} variant="outline" className="flex-1">
                        Cancelar
                      </Button>
                      <Button onClick={handleConfirmarAprobacion} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                        <Check className="w-4 h-4 mr-2" />
                        Aprobar
                      </Button>
                    </div>
                  </>
                )}

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
                                <p className="text-gray-600">Estado:</p>
                                <p className="font-bold text-gray-900">{(itemSeleccionado as Noticia).estado}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Fecha:</p>
                                <p className="font-bold text-gray-900">{(itemSeleccionado as Noticia).fechaCreacion}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Profesional:</p>
                                <p className="font-bold text-gray-900">{(itemSeleccionado as Noticia).profesionalAsignado}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Días Pendientes:</p>
                                <p className="font-bold text-orange-600">{(itemSeleccionado as Noticia).diasPendientes} días</p>
                              </div>
                            </div>
                          </div>

                          {/* Denunciado */}
                          <div>
                            <h5 className="text-sm font-bold text-gray-700 mb-2">DENUNCIADO</h5>
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="font-bold text-gray-900">{(itemSeleccionado as Noticia).denunciado}</p>
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
                                <p className="text-gray-600">Profesional:</p>
                                <p className="font-bold text-gray-900"> {(itemSeleccionado as Proceso).profesionalAsignado}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Días Restantes:</p>
                                <p className="font-bold text-gray-900"> {(itemSeleccionado as Proceso).diasRestantes}d</p>
                              </div>
                            </div>
                          </div>

                          {/* Denunciado */}
                          <div>
                            <h5 className="text-sm font-bold text-gray-700 mb-2">DENUNCIADO</h5>
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="font-bold text-gray-900 mb-1"> {(itemSeleccionado as Proceso).denunciado}</p>
                              <p className="text-sm text-gray-600">Cédula: {(itemSeleccionado as Proceso).cedula}</p>
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
            <ModalGestionAutos
              proceso={itemSeleccionado}
              onClose={() => setModalActivo(null)}
              onCrearAuto={() => {
                toast.success('Documento creado', {
                  description: 'Auto generado exitosamente'
                });
                setModalActivo(null);
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
            <ModalGestionOficios
              proceso={itemSeleccionado}
              onClose={() => setModalActivo(null)}
              onCrearOficio={() => {
                toast.success('Oficio creado', {
                  description: 'Comunicación oficial generada exitosamente'
                });
                setModalActivo(null);
              }}
            />
          )}

          {modalActivo === 'gestion-actas' && itemSeleccionado && (
            <ModalGestionActas
              proceso={itemSeleccionado}
              onClose={() => setModalActivo(null)}
            />
          )}

          {modalActivo === 'historial-auditoria' && itemSeleccionado && (
            <ModalHistorialAuditoria
              proceso={itemSeleccionado}
              onClose={() => setModalActivo(null)}
            />
          )}

          {/* Modal Archivar Noticia - Completo con validaciones */}
          {modalActivo === 'archivar-noticia' && itemSeleccionado && (
            <ModalArchivarNoticia
              noticia={{
                id: itemSeleccionado.id,
                numeroRadicado: itemSeleccionado.numero,
                denunciado: {
                  nombre: itemSeleccionado.denunciado,
                  identificacion: itemSeleccionado.cedula || 'N/A'
                }
              }}
              onClose={() => {
                setModalActivo(null);
                setItemSeleccionado(null);
              }}
              onConfirm={handleConfirmarArchivo}
            />
          )}
        </AnimatePresence>
      </div>
    </DndProvider>
  );
}