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
import { SistemaComentarios } from './SistemaComentarios';
import { disciplinaryService, DisciplinaryNews as ApiNoticia, DisciplinaryProcess as ApiProceso } from '../../../services/api/disciplinary.service';

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
  denunciante: Persona;
  denunciado: Persona;
  hechos: string;
  estado: 'pendiente' | 'en-valoracion' | 'asignada' | 'archivada';
  prioridad: 'alta' | 'media' | 'baja';
  diasPendientes: number;
  etapaActual?: string;
  tipo: 'noticia';
}

interface Proceso {
  id: string;
  numeroProceso: string;
  noticiaOrigen: string;
  denunciante: Persona;
  denunciado: Persona;
  cedula: string; // Mantener por compatibilidad
  etapaActual: 'Recepción' | 'Valoración' | 'Indagación' | 'Investigación' | 'Juzgamiento' | 'Fallo';
  estadoActual: string;
  profesionalAsignado: Persona;
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
  | null;

// ==================== MOCK DATA ====================
const NOTICIAS_MOCK: Noticia[] = [
  {
    id: 'n1',
    numero: 'ND-2025-0260',
    fechaRecepcion: '2025-01-15',
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
    tipo: 'noticia',
    etapaActual: 'Recepción'
  },
  {
    id: 'n2',
    numero: 'ND-2025-0261',
    fechaRecepcion: '2025-01-16',
    origen: 'Oficio Interno',
    denunciante: {
      nombre: 'Laura Martínez Díaz',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '52987654'
    },
    denunciado: {
      nombre: 'María González Castro',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '52123456'
    },
    hechos: 'Incumplimiento de deberes administrativos',
    estado: 'pendiente',
    prioridad: 'media',
    diasPendientes: 5,
    tipo: 'noticia',
    etapaActual: 'Recepción'
  },
  {
    id: 'n3',
    numero: 'ND-2025-0262',
    fechaRecepcion: '2025-01-17',
    origen: 'Queja Formal',
    denunciante: {
      nombre: 'Anónimo',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: 'N/A'
    },
    denunciado: {
      nombre: 'Carlos Ramírez López',
      tipoIdentificacion: 'CE',
      numeroIdentificacion: '123456789'
    },
    hechos: 'Uso indebido de recursos públicos',
    estado: 'pendiente',
    prioridad: 'alta',
    diasPendientes: 1,
    tipo: 'noticia',
    etapaActual: 'Recepción'
  }
];

const PROCESOS_MOCK: Proceso[] = [
  {
    id: 'p1',
    numeroProceso: 'PD-2025-0025',
    noticiaOrigen: 'ND-2025-0152',
    denunciante: {
      nombre: 'Carlos Alberto Mora',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '79123456'
    },
    denunciado: {
      nombre: 'Ana María López Martínez',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '52123456'
    },
    cedula: '52123456',
    etapaActual: 'Valoración',
    estadoActual: 'En Gestión',
    profesionalAsignado: {
      nombre: 'Juan Carlos Pérez Rodríguez',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '80456789'
    },
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
    denunciante: {
      nombre: 'Gloria Patricia Vargas',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '52987654'
    },
    denunciado: {
      nombre: 'Roberto Sánchez Cruz',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '77385960'
    },
    cedula: '77385960',
    etapaActual: 'Indagación',
    estadoActual: 'En Gestión',
    profesionalAsignado: {
      nombre: 'María García Londoño',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '52345678'
    },
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
    denunciante: {
      nombre: 'Anónimo',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: 'N/A'
    },
    denunciado: {
      nombre: 'Luis Hernández Silva',
      tipoIdentificacion: 'CE',
      numeroIdentificacion: '88776655'
    },
    cedula: '88776655',
    etapaActual: 'Recepción',
    estadoActual: 'En Gestión',
    profesionalAsignado: {
      nombre: 'Carlos Mendoza Ramírez',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '1015678901'
    },
    semaforo: 'verde',
    diasRestantes: 28,
    porcentajeTiempo: 10,
    borradores: [],
    documentos: [],
    pendienteAprobacion: false,
    ultimaActuacion: 'Proceso creado',
    fechaCreacion: '2025-01-28',
    tipo: 'proceso'
  },
  {
    id: 'p4',
    numeroProceso: 'PD-2025-0045',
    noticiaOrigen: 'ND-2025-0201',
    denunciante: {
      nombre: 'Sandra Milena Castro',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '52445566'
    },
    denunciado: {
      nombre: 'Jorge Luis Ramírez',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '79556677'
    },
    cedula: '79556677',
    etapaActual: 'Investigación',
    estadoActual: 'En Gestión',
    profesionalAsignado: {
      nombre: 'María García Londoño',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '52345678'
    },
    semaforo: 'amarillo',
    diasRestantes: 15,
    porcentajeTiempo: 75,
    borradores: [],
    documentos: [],
    pendienteAprobacion: false,
    ultimaActuacion: 'Pruebas recaudadas',
    fechaCreacion: '2024-11-20',
    tipo: 'proceso'
  },
  {
    id: 'p5',
    numeroProceso: 'PD-2024-0892',
    noticiaOrigen: 'ND-2024-0654',
    denunciante: {
      nombre: 'Ricardo Parra Moreno',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '80998877'
    },
    denunciado: {
      nombre: 'Patricia Gómez Díaz',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '52778899'
    },
    cedula: '52778899',
    etapaActual: 'Juzgamiento',
    estadoActual: 'En Gestión',
    profesionalAsignado: {
      nombre: 'Juan Carlos Pérez Rodríguez',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '80456789'
    },
    semaforo: 'verde',
    diasRestantes: 30,
    porcentajeTiempo: 40,
    borradores: [],
    documentos: [],
    pendienteAprobacion: false,
    ultimaActuacion: 'Audiencia programada',
    fechaCreacion: '2024-10-05',
    tipo: 'proceso'
  },
  {
    id: 'p6',
    numeroProceso: 'PD-2024-0765',
    noticiaOrigen: 'ND-2024-0543',
    denunciante: {
      nombre: 'Liliana Torres Vega',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '52334455'
    },
    denunciado: {
      nombre: 'Fernando Castro Ruiz',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '79223344'
    },
    cedula: '79223344',
    etapaActual: 'Fallo',
    estadoActual: 'En Gestión',
    profesionalAsignado: {
      nombre: 'Carlos Mendoza Ramírez',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '1015678901'
    },
    semaforo: 'verde',
    diasRestantes: 8,
    porcentajeTiempo: 20,
    borradores: [],
    documentos: [],
    pendienteAprobacion: true,
    ultimaActuacion: 'Elaboración de fallo',
    fechaCreacion: '2024-09-15',
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
  onDevolverCompetencia: (noticia: Noticia) => void;
  onArchivar: (noticia: Noticia) => void;
  onVerDetalles?: (noticia: Noticia) => void;
  vistaCompacta: boolean;
  isMobile?: boolean;
}

function TarjetaNoticia({ noticia, onConvertir, onDevolver, onDevolverCompetencia, onArchivar, onVerDetalles, vistaCompacta, isMobile }: TarjetaNoticiaProps) {
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
      className="cursor-move touch-none w-full"
    >
      <Card
        className="bg-white border border-gray-200 hover:shadow-md transition-all flex flex-col w-full"
        style={{
          height: vistaCompacta ? (isMobile ? '340px' : '380px') : (isMobile ? '440px' : '500px'),
          minHeight: vistaCompacta ? (isMobile ? '340px' : '380px') : (isMobile ? '440px' : '500px'),
          maxHeight: vistaCompacta ? (isMobile ? '340px' : '380px') : (isMobile ? '440px' : '500px')
        }}
      >
        {/* Barra superior azul ESAP */}
        <div
          className="h-1 flex-shrink-0"
          style={{ background: '#003DA5' }}
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

            <Badge
              className={`${isMobile ? 'text-xs px-2' : 'text-xs px-2'} font-semibold flex-shrink-0 ml-2 bg-gray-50 text-gray-700 border border-gray-200`}
            >
              NOTICIA
            </Badge>
          </div>

          {/* Denunciante */}
          <div className="mb-2 pb-2 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">👤 Denunciante:</p>
            <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-1`}>
              {(noticia.denunciante || { nombre: 'Sin denunciante', tipoIdentificacion: 'CC', numeroIdentificacion: 'N/A' }).nombre}
            </p>
            <p className="text-xs text-gray-600">
              {`${(noticia.denunciante || { tipoIdentificacion: 'CC', numeroIdentificacion: 'N/A' }).tipoIdentificacion} ${(noticia.denunciante || { tipoIdentificacion: 'CC', numeroIdentificacion: 'N/A' }).numeroIdentificacion}`}
            </p>
          </div>

          {/* Denunciado */}
          <div className="mb-2 pb-2 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">⚠️ Denunciado:</p>
            <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-1`}>
              {(noticia as any).denunciado?.nombre || 'Sin denunciado'}
            </p>
            <p className="text-xs text-gray-600">
              {`${(noticia as any).denunciado?.tipoIdentificacion || 'CC'} ${(noticia as any).denunciado?.numeroIdentificacion || 'N/A'}`}
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
          <div className="space-y-1.5 mt-auto pt-2">
            <Button
              onClick={() => onConvertir(noticia)}
              size="sm"
              className={`w-full ${isMobile ? 'text-xs py-1.5' : 'text-xs'} font-bold`}
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <PlusCircle className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} mr-1.5`} />
              Convertir
            </Button>
            <div className={`grid grid-cols-3 gap-1`}>
              <Button
                onClick={() => onDevolver(noticia)}
                size="sm"
                variant="outline"
                className={`${isMobile ? 'text-[10px] py-1 px-0.5' : 'text-[11px] px-1.5'} truncate min-w-0`}
                title="Devolver noticia"
              >
                <ArrowLeft className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} ${isMobile ? '' : 'mr-0.5'} flex-shrink-0`} />
                {!isMobile && <span className="truncate">Devolver</span>}
              </Button>
              <Button
                onClick={() => onDevolverCompetencia(noticia)}
                size="sm"
                variant="outline"
                className={`${isMobile ? 'text-[10px] py-1 px-0.5' : 'text-[11px] px-1.5'} text-purple-600 hover:bg-purple-50 border-purple-300 hover:border-purple-500 truncate min-w-0`}
                title="Remitir por competencia"
              >
                <Send className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} ${isMobile ? '' : 'mr-0.5'} flex-shrink-0`} />
                {!isMobile && <span className="truncate">Compet.</span>}
              </Button>
              <Button
                onClick={() => onArchivar(noticia)}
                size="sm"
                variant="outline"
                className={`${isMobile ? 'text-[10px] py-1 px-0.5' : 'text-[11px] px-1.5'} text-red-600 hover:bg-red-50 border-red-200 truncate min-w-0`}
                title="Archivar noticia"
              >
                <Archive className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} ${isMobile ? '' : 'mr-0.5'} flex-shrink-0`} />
                {!isMobile && <span className="truncate">Archivar</span>}
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
  onComentarios?: (proceso: Proceso) => void;
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
  onComentarios,
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

  const semaforoIndicator = {
    verde: { color: '#10B981', label: 'En término' },
    amarillo: { color: '#F59E0B', label: 'Próximo a vencer' },
    rojo: { color: '#DC2626', label: 'Vencido' }
  };

  const semaforo = semaforoIndicator[proceso.semaforo];
  const denunciante = proceso.denunciante || { nombre: 'Sin denunciante', tipoIdentificacion: 'CC', numeroIdentificacion: 'N/A' };
  const denunciado = proceso.denunciado || { nombre: 'Sin denunciado', tipoIdentificacion: 'CC', numeroIdentificacion: 'N/A' };
  const profesionalAsignado = typeof proceso.profesionalAsignado === 'string'
    ? { nombre: proceso.profesionalAsignado, tipoIdentificacion: 'CC', numeroIdentificacion: 'N/A' }
    : (proceso.profesionalAsignado || { nombre: 'Sin asignar', tipoIdentificacion: 'CC', numeroIdentificacion: 'N/A' });

  return (
    <motion.div
      ref={drag}
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
          <div
            className="flex items-start justify-between mb-1.5 cursor-pointer hover:bg-gray-50 -mx-2.5 -mt-2.5 px-2.5 pt-2.5 pb-1.5 rounded-t-lg transition-colors"
            onClick={() => onVerDetalles(proceso)}
          >
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
              {denunciante.nombre}
            </p>
            <p className="text-xs text-gray-600">
              {denunciante.tipoIdentificacion} {denunciante.numeroIdentificacion}
            </p>
          </div>

          {/* Denunciado */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">⚠️ Denunciado:</p>
            <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-1`}>
              {denunciado.nombre}
            </p>
            <p className="text-xs text-gray-600">
              {denunciado.tipoIdentificacion} {denunciado.numeroIdentificacion}
            </p>
          </div>

          {/* Profesional Asignado */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Avatar className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} flex-shrink-0`}>
                <AvatarFallback
                  className="text-xs"
                  style={{ background: '#E0EDFF', color: '#003DA5' }}
                >
                  {profesionalAsignado.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">👨‍💼 Profesional:</p>
                <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-1`}>
                  {profesionalAsignado.nombre}
                </p>
                <p className="text-xs text-gray-600">
                  {profesionalAsignado.tipoIdentificacion} {profesionalAsignado.numeroIdentificacion}
                </p>
              </div>
            </div>
          </div>

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
          </div>

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

          {/* Última actuación - Solo desktop */}
          {!vistaCompacta && !isMobile && (
            <div className="mb-1.5">
              <p className="text-xs text-gray-500 mb-0.5">Última actuación:</p>
              <p className="text-xs text-gray-700 line-clamp-1">{proceso.ultimaActuacion}</p>
            </div>
          )}

          {/* Acciones Principales - Siempre Visibles */}
          <div className="space-y-1 pt-2 border-t border-gray-200 mt-auto flex-shrink-0">
            {/* Acción Principal: Ver Expediente */}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onVerExpediente(proceso);
              }}
              size="sm"
              className={`w-full ${isMobile ? 'text-xs py-1.5' : 'text-xs'} font-bold truncate`}
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Archive className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1 flex-shrink-0`} />
              <span className="truncate">Expediente</span>
            </Button>

            {/* Gestión Documental - Grid compacto - SIEMPRE VISIBLE */}
            <div className="space-y-1">
              {/* Primera fila: Autos y Evidencias */}
              <div className="grid grid-cols-2 gap-1">
                <Button
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
                  size="sm"
                  variant="outline"
                  className={`${isMobile ? 'text-[10px] py-1 px-1' : 'text-[11px] px-2'} justify-start truncate min-w-0`}
                >
                  <Scale className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-0.5 flex-shrink-0`} />
                  <span className="truncate">Autos</span>
                </Button>

                <Button
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
                  size="sm"
                  variant="outline"
                  className={`${isMobile ? 'text-[10px] py-1 px-1' : 'text-[11px] px-2'} justify-start truncate min-w-0`}
                >
                  <Archive className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-0.5 flex-shrink-0`} />
                  <span className="truncate">Evidencias</span>
                </Button>
              </div>

              {/* Segunda fila: Oficios y Actas */}
              <div className="grid grid-cols-2 gap-1">
                <Button
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
                  size="sm"
                  variant="outline"
                  className={`${isMobile ? 'text-[10px] py-1 px-1' : 'text-[11px] px-2'} justify-start truncate min-w-0`}
                >
                  <Mail className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-0.5 flex-shrink-0`} />
                  <span className="truncate">Oficios</span>
                </Button>

                <Button
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
                  size="sm"
                  variant="outline"
                  className={`${isMobile ? 'text-[10px] py-1 px-1' : 'text-[11px] px-2'} justify-start truncate min-w-0`}
                >
                  <FileCheck className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-0.5 flex-shrink-0`} />
                  <span className="truncate">Actas</span>
                </Button>
              </div>

              {/* Tercera fila: Comentarios (ancho completo y destacado) */}
              <Button
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
                size="sm"
                className={`w-full ${isMobile ? 'text-[10px] py-1.5' : 'text-[11px] py-2'} font-bold`}
                style={{
                  background: '#003DA5',
                  color: '#FFFFFF'
                }}
              >
                <MessageSquare className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} mr-1 flex-shrink-0`} />
                <span className="truncate">💬 Comentarios del Proceso</span>
              </Button>
            </div>

            {/* Aprobación si está pendiente */}
            {proceso.pendienteAprobacion && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onAprobarBorrador(proceso);
                }}
                size="sm"
                className={`w-full ${isMobile ? 'text-xs py-1.5' : 'text-xs'} bg-green-600 hover:bg-green-700 text-white font-bold`}
              >
                <CheckCircle className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1.5`} />
                Aprobar Borrador
              </Button>
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
  onComentarios,
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
      (typeof (item as Noticia).denunciado === 'string'
        ? (item as Noticia).denunciado.toLowerCase().includes(searchTerm.toLowerCase())
        : (item as Noticia).denunciado.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
      : (item as Proceso).numeroProceso.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (typeof (item as Proceso).denunciado === 'string'
        ? (item as Proceso).denunciado.toLowerCase().includes(searchTerm.toLowerCase())
        : (item as Proceso).denunciado.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchEtapa = filtroEtapa === 'todos' ||
      (item.tipo === 'noticia' && filtroEtapa === 'Recepción') ||
      (item.tipo === 'proceso' && (item as Proceso).etapaActual === filtroEtapa);

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
                  {proceso && (
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback style={{ background: '#E0EDFF', color: '#003DA5', fontSize: '9px' }}>
                          {profesionalAsignado.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-xs font-medium text-gray-700 truncate flex-1">
                        {profesionalAsignado.nombre}
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
                            {isNoticia ? noticia!.denunciado.nombre : (typeof proceso!.denunciado === 'string' ? proceso!.denunciado : proceso!.denunciado.nombre)}
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
                                {profesionalAsignado.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <p className="text-xs font-medium" style={{ color: '#4B5563' }}>
                              {profesionalAsignado.nombre}
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
  diasEstimados?: number;
  onDrop: (item: Item, nuevaEtapa: string) => void;
  onConvertirNoticia: (noticia: Noticia) => void;
  onDevolverNoticia: (noticia: Noticia) => void;
  onDevolverCompetencia: (noticia: Noticia) => void;
  onArchivarNoticia: (noticia: Noticia) => void;
  onVerDetallesNoticia?: (noticia: Noticia) => void;
  onVerDetalles: (proceso: Proceso) => void;
  onAprobarBorrador: (proceso: Proceso) => void;
  onVerExpediente: (proceso: Proceso) => void;
  onGestionAutos?: (proceso: Proceso) => void;
  onGestionEvidencias?: (proceso: Proceso) => void;
  onGestionOficios?: (proceso: Proceso) => void;
  onGestionActas?: (proceso: Proceso) => void;
  onComentarios?: (proceso: Proceso) => void;
  vistaCompacta: boolean;
  isMobile?: boolean;
  colapsada?: boolean;
  onToggleColapso?: () => void;
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
  onVerDetalles,
  onAprobarBorrador,
  onVerExpediente,
  onGestionAutos,
  onGestionEvidencias,
  onGestionOficios,
  onGestionActas,
  onComentarios,
  vistaCompacta,
  isMobile,
  colapsada = false,
  onToggleColapso
}: ColumnaKanbanProps) {
  const [expandTimeout, setExpandTimeout] = useState<NodeJS.Timeout | null>(null);

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'ITEM',
    drop: (item: any) => {
      onDrop(item, etapa);
    },
    canDrop: () => true,
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
      const etapaItem = (item as any).etapaActual || 'Recepción';
      return etapa === etapaItem;
    }
    return item.tipo === 'proceso' && item.etapaActual === etapa;
  });

  const noticias = itemsFiltrados.filter(i => i.tipo === 'noticia') as Noticia[];
  const procesos = itemsFiltrados.filter(i => i.tipo === 'proceso') as Proceso[];

  // Si está colapsada, mostrar versión minimal
  if (colapsada) {
    // Calcular indicadores para columna colapsada
    const procesosRojos = procesos.filter(p => p.semaforo === 'rojo').length;
    const procesosAmarillos = procesos.filter(p => p.semaforo === 'amarillo').length;
    const procesosVerdes = procesos.filter(p => p.semaforo === 'verde').length;

    return (
      <motion.div
        ref={drop}
        className={`flex-shrink-0`}
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
      className={`flex-shrink-0`}
      initial={{ width: colapsada ? 64 : 320 }}
      animate={{ width: colapsada ? 64 : 320 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
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
              onDevolverCompetencia={onDevolverCompetencia}
              onArchivar={onArchivarNoticia}
              onVerDetalles={onVerDetallesNoticia}
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
              onComentarios={onComentarios}
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
    </motion.div>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================
export function DashboardKanbanOperativo({ onNavigateToExpediente }: { onNavigateToExpediente?: () => void }) {
  const [items, setItems] = useState<Item[]>([...NOTICIAS_MOCK, ...PROCESOS_MOCK]);
  const [modalActivo, setModalActivo] = useState<ModalType>(null);
  const [itemSeleccionado, setItemSeleccionado] = useState<any>(null);
  const [tipoVista, setTipoVista] = useState<'kanban' | 'lista'>('kanban');
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [vistaCompacta, setVistaCompacta] = useState(false);
  const [columnasColapsadas, setColumnasColapsadas] = useState<Set<string>>(new Set());

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
  const STORAGE_KEY = 'kanban-disciplinario-items';

  const persistItems = (data: Item[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('No se pudo persistir items en localStorage', e);
    }
  };

  const loadPersistedItems = (): Item[] | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('No se pudo leer items persistidos', e);
      return null;
    }
  };

  // Transformadores desde el backend real
  const stageLabelMap: Record<string, string> = {
    EVALUACION: 'Valoración',
    INDAGACION_PREVIA: 'Indagación',
    INVESTIGACION: 'Investigación',
    JUZGAMIENTO: 'Juzgamiento'
  };

  const mapEstadoNoticia = (estado?: ApiNoticia['estado']) => {
    switch (estado) {
      case 'ASIGNADA':
        return 'asignada';
      case 'EN_VALORACION':
        return 'en-valoracion';
      case 'DEVUELTA':
        return 'archivada';
      default:
        return 'pendiente';
    }
  };

  const toNoticiaFromApi = (noticia: ApiNoticia): Noticia => {
    const fechaRecepcion = (noticia as any)?.fechaRecepcion;
    const fecha = fechaRecepcion ? new Date(fechaRecepcion) : new Date();
    const hoy = new Date();
    const dias = Math.max(1, Math.ceil((hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24)));
    const denuncianteFuente: any = (noticia as any).denunciante;
    const disciplinableFuente: any = (noticia as any).disciplinable || (noticia as any).denunciado;
    const denuncianteRaw: any = Array.isArray(denuncianteFuente) ? (denuncianteFuente[0] || {}) : (denuncianteFuente || {});
    const denunciadoRaw: any = Array.isArray(disciplinableFuente) ? (disciplinableFuente[0] || {}) : (disciplinableFuente || {});

    return {
      id: (noticia as any).id || `n${Date.now()}`,
      numero: (noticia as any).radicado || (noticia as any).numero || `ND-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
      fechaRecepcion: fecha.toISOString().split('T')[0],
      origen: (noticia as any).origen || 'Noticia',
      denunciante: {
        nombre: denuncianteRaw.nombre || 'Sin denunciante',
        tipoIdentificacion: denuncianteRaw.tipoIdentificacion || 'CC',
        numeroIdentificacion: denuncianteRaw.cedula || denuncianteRaw.numeroIdentificacion || denuncianteRaw.telefono || 'N/A'
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
      tipo: 'noticia',
      etapaActual: (noticia as any).etapaActual || 'Recepción'
    };
  };

  const normalizeNoticia = (raw: any): Noticia => {
    // Si ya es una noticia bien formada, aplicar normalización defensiva
    const denuncianteFuente = raw.denunciante;
    const disciplinableFuente = raw.disciplinable || raw.denunciado;
    const denuncianteRaw = Array.isArray(denuncianteFuente) ? (denuncianteFuente[0] || {}) : (denuncianteFuente || {});
    const denunciadoRaw = Array.isArray(disciplinableFuente) ? (disciplinableFuente[0] || {}) : (disciplinableFuente || {});

    return {
      ...raw,
      tipo: raw.tipo || 'noticia',
      denunciante: {
        nombre: denuncianteRaw.nombre || 'Sin nombre',
        tipoIdentificacion: denuncianteRaw.tipoIdentificacion || 'CC',
        numeroIdentificacion: denuncianteRaw.numeroIdentificacion || denuncianteRaw.cedula || 'Sin identificación'
      },
      denunciado: {
        nombre: denunciadoRaw.nombre || raw.disciplinable?.nombre || 'Sin nombre',
        tipoIdentificacion: denunciadoRaw.tipoIdentificacion || 'CC',
        numeroIdentificacion: denunciadoRaw.numeroIdentificacion || denunciadoRaw.cedula || raw.disciplinable?.cedula || 'Sin identificación',
        cargo: denunciadoRaw.cargo || raw.disciplinable?.cargo || 'Sin cargo'
      },
      hechos: raw.hechos || '',
      prioridad: raw.prioridad || 'media',
      diasPendientes: raw.diasPendientes || 0,
      etapaActual: raw.etapaActual || 'Recepción',
      estado: raw.estado || 'pendiente',
      adjuntos: raw.adjuntos || []
    };
  };

  const toProcesoFromApi = (proceso: ApiProceso, currentStages: any[] = []): Proceso => {
    let etapa = proceso.etapaActual;

    // Normalize Stage:
    // 1. Try to find exact or case-insensitive match in current configuration
    const match = currentStages.find(s => s.etapa === etapa || s.etapa.toUpperCase() === etapa.toUpperCase());
    if (match) {
      etapa = match.etapa;
    } else {
      // 2. Fallback to legacy map if not found (e.g. for 'EVALUACION' enum)
      etapa = stageLabelMap[etapa] || etapa;
      // 3. Final fallback: Title Case if it looks like an uppercase constant
      if (etapa === etapa.toUpperCase() && etapa.length > 3) {
        etapa = etapa.charAt(0).toUpperCase() + etapa.slice(1).toLowerCase();
      }
    }

    const fechaVenc = proceso.fechaVencimientoEtapa ? new Date(proceso.fechaVencimientoEtapa) : null;
    const fechaCreacion = proceso.createdAt ? new Date(proceso.createdAt) : new Date();
    const hoy = new Date();
    const diasRestantes = fechaVenc ? Math.ceil((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const totalDias = fechaVenc ? Math.max(1, Math.round((fechaVenc.getTime() - fechaCreacion.getTime()) / (1000 * 60 * 60 * 24))) : 1;
    const transcurridos = totalDias - diasRestantes;
    const porcentajeTiempo = Math.min(100, Math.max(0, Math.round((transcurridos / totalDias) * 100)));
    const semaforo: 'verde' | 'amarillo' | 'rojo' = diasRestantes <= 0
      ? 'rojo'
      : (diasRestantes <= 7 || porcentajeTiempo >= 80 ? 'amarillo' : 'verde');
    const abogado = proceso.abogadoAsignadoNombre || (proceso as any).abogadoAsignado?.nombreCompleto || 'Sin asignar';

    return {
      id: proceso.id,
      numeroProceso: proceso.radicadoProceso,
      noticiaOrigen: proceso.news?.radicado || 'N/A',
      denunciante: {
        nombre: proceso.news?.denunciante?.nombre || 'Sin denunciante',
        tipoIdentificacion: 'CC',
        numeroIdentificacion: (proceso.news?.denunciante as any)?.cedula || 'N/A'
      },
      denunciado: {
        nombre: proceso.news?.disciplinable?.nombre || 'Sin disciplinable',
        tipoIdentificacion: 'CC',
        numeroIdentificacion: proceso.news?.disciplinable?.cedula || 'N/A'
      },
      cedula: proceso.news?.disciplinable?.cedula || 'N/A',
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
      borradores: [],
      documentos: [],
      pendienteAprobacion: false,
      ultimaActuacion: 'Actualizado desde backend',
      fechaCreacion: fechaCreacion.toISOString().split('T')[0],
      tipo: 'proceso',
      hechos: proceso.news?.hechos,
    };
  };

  // Estados para configuración de etapas
  const [stageConfigs, setStageConfigs] = useState<any[]>([]);

  // Cargar datos reales desde el microservicio (con fallback a mock)
  useEffect(() => {
    const cargarDatos = async () => {
      // 1. Intentar cargar de localStorage primero
      const storedItems = localStorage.getItem('kanban-disciplinario-items');
      const storedConfig = localStorage.getItem('kanban-disciplinario-config');

      if (storedItems) {
        try {
          const parsed = JSON.parse(storedItems);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setItems(parsed);
          }
        } catch (e) {
          console.error('Error parsing localStorage items:', e);
        }
      }

      if (storedConfig) {
        try {
          const parsedConfig = JSON.parse(storedConfig);
          if (Array.isArray(parsedConfig)) {
            setStageConfigs(parsedConfig);
          }
        } catch (e) {
          console.error('Error parsing localStorage config:', e);
        }
      }

      // 2. Cargar desde backend para actualizar
      try {
        const [noticiasApi, procesosApi, stagesApi] = await Promise.all([
          disciplinaryService.getAllNoticias(),
          disciplinaryService.getAllProcesos(),
          disciplinaryService.getStageConfiguration()
        ]);

        // Ensure stages are available for mapping
        let activeStages = Array.isArray(stagesApi) ? stagesApi.filter(s => s.activo !== false) : [];

        // 3. Ordenar etapas según requerimiento exacto
        const STANDARD_ORDER = ['Recepción', 'Valoración', 'Indagación', 'Investigación', 'Juzgamiento', 'Fallo'];

        activeStages.sort((a, b) => {
          // Normalizar para comparación (ignorar mayúsculas/tildes en la comparación del orden)
          const nameA = a.etapa.trim();
          const nameB = b.etapa.trim();

          // Buscar índice flexiblemente
          const indexA = STANDARD_ORDER.findIndex(o =>
            o.localeCompare(nameA, undefined, { sensitivity: 'base' }) === 0 ||
            o.toUpperCase() === nameA.toUpperCase()
          );
          const indexB = STANDARD_ORDER.findIndex(o =>
            o.localeCompare(nameB, undefined, { sensitivity: 'base' }) === 0 ||
            o.toUpperCase() === nameB.toUpperCase()
          );

          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return 0; // Mantener orden de llegada para nuevas etapas
        });

        // Helper para normalizar nombres de etapas (Match robusto)
        const normalizeStageName = (inputName: string, configStages: any[]) => {
          if (!inputName) return 'Recepción';

          // 1. Búsqueda exacta o sw insensible
          const cleanInput = inputName.trim();
          const match = configStages.find(s =>
            s.etapa === cleanInput ||
            s.etapa.localeCompare(cleanInput, undefined, { sensitivity: 'base' }) === 0
          );

          if (match) return match.etapa;

          // 2. Fallback a mapeo legacy si es necesario
          const legacyMap: Record<string, string> = {
            'EVALUACION': 'Valoración',
            'INDAGACION_PREVIA': 'Indagación',
            'INVESTIGACION': 'Investigación',
            'JUZGAMIENTO': 'Juzgamiento',
            'RECEPCION': 'Recepción'
          };
          const mapped = legacyMap[cleanInput.toUpperCase()];
          if (mapped) {
            // Verificar si el mapeado existe en la config actual
            const matchMapped = configStages.find(s => s.etapa.localeCompare(mapped, undefined, { sensitivity: 'base' }) === 0);
            if (matchMapped) return matchMapped.etapa;
          }

          // 3. Si parece una constante (MAYUSCULAS), intentar convertir a Title Case y buscar de nuevo
          if (cleanInput === cleanInput.toUpperCase() && cleanInput.length > 3) {
            const titleCase = cleanInput.charAt(0).toUpperCase() + cleanInput.slice(1).toLowerCase();
            const matchTitle = configStages.find(s => s.etapa.localeCompare(titleCase, undefined, { sensitivity: 'base' }) === 0);
            if (matchTitle) return matchTitle.etapa;
            return titleCase; // Devolver TitleCase aunque no esté en config, para que se vea bonito
          }

          return cleanInput;
        };

        const mappedNoticias = (noticiasApi || []).map(n => {
          const not = toNoticiaFromApi(n);
          // Aplicar normalización extra a la etapa de la noticia
          return { ...normalizeNoticia(not), etapaActual: normalizeStageName(not.etapaActual, activeStages) };
        });

        const mappedProcesos = (procesosApi || []).map(p => {
          // Pasar el helper o usar la lógica dentro
          // Reusamos toProcesoFromApi pero inyectando el nombre normalizado
          const proc = toProcesoFromApi(p, activeStages); // Ya tiene lógica básica, pero mejoremosla
          proc.etapaActual = normalizeStageName(p.etapaActual, activeStages) as any;
          return proc;
        });

        const normalizedItems = [...mappedNoticias, ...mappedProcesos];

        setItems(normalizedItems);
        localStorage.setItem('kanban-disciplinario-items', JSON.stringify(normalizedItems));

        if (activeStages.length > 0) {
          setStageConfigs(activeStages);
          localStorage.setItem('kanban-disciplinario-config', JSON.stringify(activeStages));
        }

      } catch (error) {
        console.error('Error cargando datos reales de disciplinario', error);
        toast.error('No fue posible cargar datos reales, se muestran datos demo.');
        const fallbackNoticias = NOTICIAS_MOCK.map(normalizeNoticia);
        const fallbackProcesos = PROCESOS_MOCK;
        const fallback = [...fallbackNoticias, ...fallbackProcesos];
        setItems(fallback);
        localStorage.setItem('kanban-disciplinario-items', JSON.stringify(fallback));

        // Fallback or keep existing stageConfigs if empty
        if (stageConfigs.length === 0) {
          // No default config? leave empty or set defaults?
          // Let the hardcoded fallback below handle it if stageConfigs is empty
        }
      }
    };

    cargarDatos();
  }, []); // Run once


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

  // Icon mapping helper
  const getStageIcon = (nombre: string) => {
    const n = nombre.toLowerCase();
    const iconClass = `${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`;
    const activeIconClass = `${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`;

    if (n.includes('recep')) return <FileCheck className={iconClass} />;
    if (n.includes('valor')) return <Eye className={iconClass} />;
    if (n.includes('indaga')) return <Search className={iconClass} />;
    if (n.includes('investiga')) return <Scale className={activeIconClass} style={{ color: '#003DA5' }} />;
    if (n.includes('juzga')) return <AlertTriangle className={iconClass} />;
    if (n.includes('fallo')) return <CheckCircle className={iconClass} />;
    return <FolderOpen className={iconClass} />;
  };

  // Build dynamic etapas from config or fallback
  const etapas = stageConfigs.length > 0
    ? stageConfigs.map(cfg => ({
      nombre: cfg.etapa,
      color: cfg.etapa.toLowerCase().includes('investiga') ? '#003DA5' : '#6B7280',
      icono: getStageIcon(cfg.etapa),
      diasEstimados: Number(cfg.diasHabiles) || 0
    }))
    : [
      { nombre: 'Recepción', color: '#6B7280', icono: <FileCheck className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} />, diasEstimados: 3 },
      { nombre: 'Valoración', color: '#6B7280', icono: <Eye className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} />, diasEstimados: 10 },
      { nombre: 'Indagación', color: '#6B7280', icono: <Search className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} />, diasEstimados: 40 },
      { nombre: 'Investigación', color: '#003DA5', icono: <Scale className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} style={{ color: '#003DA5' }} />, diasEstimados: 60 },
      { nombre: 'Juzgamiento', color: '#6B7280', icono: <AlertTriangle className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} />, diasEstimados: 50 },
      { nombre: 'Fallo', color: '#6B7280', icono: <CheckCircle className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} />, diasEstimados: 10 }
    ];

  const mapearOrigenNoticia = (valor: string) => {
    const limpio = (valor || '').toString().trim().toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    switch (limpio) {
      case 'QUEJOSO':
        return 'QUEJOSO';
      case 'ANONIMO':
        return 'ANONIMO';
      case 'INFORMANTE':
      case 'OFICIO':
      case 'DE OFICIO':
        return 'OFICIO';
      case 'REMISION':
      case 'REMISION POR COMPETENCIA':
        return 'REMISION';
      default:
        return 'ANONIMO';
    }
  };

  // ==================== HANDLERS ====================
  const handleDropItem = async (item: Item, nuevaEtapa: string) => {
    if (!item) return;

    // Actualizar estado local inmediatamente
    setItems(prev => {
      const updated = prev.map(i =>
        i.id === item.id ? { ...i, etapaActual: nuevaEtapa as any } : i
      );
      localStorage.setItem('kanban-disciplinario-items', JSON.stringify(updated));
      return updated;
    });

    // Si es proceso, actualizar backend
    if (item.tipo === 'proceso') {
      try {
        await disciplinaryService.cambiarEtapa(item.id, nuevaEtapa);
        toast.success('Proceso Movido', {
          description: `${item.numeroProceso} → ${nuevaEtapa}`
        });
      } catch (error) {
        console.error('Error actualizando etapa en backend:', error);
        toast.error('No se pudo actualizar en el servidor');
      }
    } else if (item.tipo === 'noticia') {
      toast.success('Noticia Movida', {
        description: `${item.numero} → ${nuevaEtapa}`
      });
    }
  };

  const handleCrearNoticia = async (data: any) => {
    const denuncianteFromForm = data.denunciantes?.[0] || {};
    const disciplinablesFromForm = Array.isArray(data.disciplinable) ? data.disciplinable : [];
    const denunciadoFromForm = disciplinablesFromForm[0] || data.denunciado || {};

    try {
      // Subir evidencias (si hay)
      const urls: string[] = [];
      if (data.evidencias?.length > 0) {
        for (const file of data.evidencias) {
          try {
            const uploaded = await disciplinaryService.uploadFile(file);
            if (uploaded?.url) {
              urls.push(uploaded.url);
            }
          } catch (uploadError) {
            console.error('Error uploading file:', uploadError);
            toast.warning(`No se pudo subir el archivo: ${file.name}`);
          }
        }
      }

      // También revisar archivosAdjuntos por compatibilidad
      if (data.archivosAdjuntos && Array.isArray(data.archivosAdjuntos)) {
        for (const file of data.archivosAdjuntos as File[]) {
          try {
            const uploaded = await disciplinaryService.uploadFile(file);
            if (uploaded?.url) {
              urls.push(uploaded.url);
            }
          } catch (uploadError) {
            console.error('Error uploading file:', uploadError);
            toast.warning(`No se pudo subir el archivo: ${file.name}`);
          }
        }
      }

      const emailDen = (denuncianteFromForm.correo || denuncianteFromForm.email || '').trim();
      const denunciantePayload: any = {
        nombre: denuncianteFromForm.nombre || 'Sin denunciante',
        cedula: denuncianteFromForm.identificacion || denuncianteFromForm.numeroIdentificacion || 'N/A',
        cargo: denuncianteFromForm.cargo,
      };
      if (emailDen && emailDen.includes('@')) {
        denunciantePayload.email = emailDen;
      }

      const payload = {
        origen: mapearOrigenNoticia(data.origen || 'QUEJOSO'),
        territorial: data.territorial || 'Dirección Nacional',
        dependenciaDenunciado: denunciadoFromForm.dependencia || 'Por determinar',
        hechos: data.descripcionHechos || '',
        denunciante: [denunciantePayload],
        disciplinable: disciplinablesFromForm.length > 0
          ? disciplinablesFromForm.map((d: any) => ({
            nombre: d.nombre || 'Sin denunciado',
            cedula: d.identificacion || d.numeroIdentificacion || 'N/A',
            cargo: d.cargo,
            dependencia: d.dependencia
          }))
          : [{
            nombre: denunciadoFromForm.nombre || 'Sin denunciado',
            cedula: denunciadoFromForm.identificacion || denunciadoFromForm.numeroIdentificacion || 'N/A',
            cargo: denunciadoFromForm.cargo,
            dependencia: denunciadoFromForm.dependencia
          }],
        adjuntos: urls,
      };

      const apiNoticia = await disciplinaryService.radicarNoticia(payload as any);
      let nuevaNoticia = normalizeNoticia(apiNoticia);

      // Si el backend no devuelve el disciplinable, usar el que viene del formulario
      if (!nuevaNoticia.denunciado?.nombre || nuevaNoticia.denunciado.nombre.startsWith('Sin')) {
        const firstDisc = disciplinablesFromForm[0] || payload.disciplinable?.[0];
        if (firstDisc) {
          nuevaNoticia = normalizeNoticia({
            ...nuevaNoticia,
            denunciado: {
              nombre: firstDisc.nombre,
              tipoIdentificacion: 'CC',
              numeroIdentificacion: firstDisc.cedula || firstDisc.identificacion || firstDisc.numeroIdentificacion || 'N/A',
              cargo: firstDisc.cargo
            }
          });
        }
      }

      setItems(prev => {
        const updated = [...prev, nuevaNoticia];
        localStorage.setItem('kanban-disciplinario-items', JSON.stringify(updated));
        return updated;
      });

      toast.success('Noticia creada correctamente', {
        description: `${nuevaNoticia.numero} en Recepción`
      });
    } catch (error) {
      console.error('Error al crear noticia', error);
      toast.error('Error al crear la noticia');
    } finally {
      setModalActivo(null);
    }
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

    const denuncianteFallback: Persona = itemSeleccionado?.denunciante || {
      nombre: 'Sin denunciante',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: 'N/A'
    };

    const denunciadoFallback: Persona = itemSeleccionado?.denunciado || {
      nombre: 'Sin denunciado',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: 'N/A'
    };

    const nuevoProceso: Proceso = {
      id: `p${Date.now()}`,
      numeroProceso: `PD-2025-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
      noticiaOrigen: itemSeleccionado.numero,
      denunciante: denuncianteFallback,
      denunciado: denunciadoFallback,
      cedula: '00000000',
      etapaActual: 'Recepción',
      estadoActual: 'En Gestión',
      profesionalAsignado: {
        nombre: profesionalSeleccionado,
        tipoIdentificacion: 'CC',
        numeroIdentificacion: 'N/A'
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

    // Obtener nombre del área
    const areas: Record<string, string> = {
      'personeria': 'Personería Municipal',
      'contraloria': 'Contraloría',
      'procuraduria': 'Procuraduría',
      'fiscalia': 'Fiscalía General',
      'control-interno': 'Control Interno de Gestión',
      'recursos-humanos': 'Recursos Humanos',
      'otra': 'Otra Entidad'
    };

    const nombreArea = areas[areaDestinoRemision] || areaDestinoRemision;

    toast.success('Remitido por Competencia', {
      description: `${itemSeleccionado.numero} → ${numeroRC} (${nombreArea})`
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

  const handleVerDetallesNoticia = (noticia: Noticia) => {
    setItemSeleccionado(noticia);
    setModalActivo('ver-detalles');
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
                  className={`${isTablet ? 'px-2 py-1.5' : 'px-3 py-2'} rounded-md text-sm font-semibold flex items-center gap-1.5 transition-all ${tipoVista === 'kanban'
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
                  className={`${isTablet ? 'px-2 py-1.5' : 'px-3 py-2'} rounded-md text-sm font-semibold flex items-center gap-1.5 transition-all ${tipoVista === 'lista'
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
                  diasEstimados={etapa.diasEstimados}
                  onDrop={handleDropItem}
                  onConvertirNoticia={handleConvertirNoticia}
                  onDevolverNoticia={handleDevolverNoticia}
                  onDevolverCompetencia={handleDevolverCompetencia}
                  onArchivarNoticia={handleArchivarNoticia}
                  onVerDetallesNoticia={handleVerDetallesNoticia}
                  onVerDetalles={handleVerDetalles}
                  onAprobarBorrador={handleAprobarBorrador}
                  onVerExpediente={handleVerExpediente}
                  onGestionAutos={handleGestionAutos}
                  onGestionEvidencias={handleGestionEvidencias}
                  onGestionOficios={handleGestionOficios}
                  onGestionActas={handleGestionActas}
                  onComentarios={handleComentarios}
                  vistaCompacta={vistaCompacta}
                  isMobile={isMobile}
                  colapsada={columnasColapsadas.has(etapa.nombre)}
                  onToggleColapso={() => toggleColumnaColapsada(etapa.nombre)}
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
            onComentarios={handleComentarios}
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
          {modalActivo && itemSeleccionado && (() => {
            // Normalizar item seleccionado para evitar crashes por campos undefined
            // Solo normalizar si los campos críticos están undefined
            const itemSeguro = (itemSeleccionado.denunciante && itemSeleccionado.denunciado)
              ? itemSeleccionado
              : normalizeNoticia(itemSeleccionado);

            return (
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
                  {/* Modal: Convertir a Proceso */}
                  {modalActivo === 'convertir-proceso' && itemSeguro && (
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
                              {itemSeguro.numero}
                            </p>
                          </div>
                          <p className="font-bold text-gray-900 mb-1">
                            {itemSeguro.denunciado.nombre}
                          </p>
                          <p className="text-xs text-gray-600 mb-2">
                            {itemSeguro.denunciado.tipoIdentificacion} {itemSeguro.denunciado.numeroIdentificacion}
                          </p>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {itemSeguro.hechos}
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
                  {modalActivo === 'devolver-noticia' && itemSeguro && (
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
                          <p className="text-sm font-bold mb-1">{itemSeguro.numero}</p>
                          <p className="text-sm text-gray-700">{itemSeguro.denunciado.nombre}</p>
                          <p className="text-xs text-gray-600">
                            {itemSeguro.denunciado.tipoIdentificacion} {itemSeguro.denunciado.numeroIdentificacion}
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
                  {modalActivo === 'devolver-competencia' && itemSeguro && (
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
                          <p className="text-sm font-bold mb-1 text-purple-900">{itemSeguro.numero}</p>
                          <p className="text-sm text-gray-700">{itemSeguro.denunciado.nombre}</p>
                          <p className="text-xs text-gray-600">
                            {itemSeguro.denunciado.tipoIdentificacion} {itemSeguro.denunciado.numeroIdentificacion}
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
                            <option value="">Seleccionar área...</option>
                            <option value="personeria">Personería Municipal</option>
                            <option value="contraloria">Contraloría</option>
                            <option value="procuraduria">Procuraduría</option>
                            <option value="fiscalia">Fiscalía General de la Nación</option>
                            <option value="control-interno">Control Interno de Gestión</option>
                            <option value="recursos-humanos">Recursos Humanos</option>
                            <option value="otra">Otra entidad...</option>
                          </select>
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

                  {/* Modal: Aprobar Borrador */}
                  {modalActivo === 'aprobar-borrador' && itemSeguro && (
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
                  {modalActivo === 'ver-detalles' && itemSeguro && (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-blue-100">
                            <Eye className="w-6 h-6" style={{ color: '#003DA5' }} />
                          </div>
                          <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-black`} style={{ color: '#003DA5' }}>
                            {itemSeguro.tipo === 'noticia' ? 'Detalles de la Noticia' : 'Detalles del Proceso'}
                          </h3>
                        </div>
                        <button onClick={() => setModalActivo(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                          <X className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>

                      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                        {/* VISTA PARA NOTICIAS */}
                        {itemSeguro.tipo === 'noticia' && (
                          <>
                            {/* Información de la Noticia */}
                            <div className="p-4 bg-orange-50 rounded-xl border-2 border-orange-200">
                              <h4 className="font-bold text-orange-900 mb-2">{(itemSeguro as Noticia).numero}</h4>
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
                                {(() => {
                                  const den = (itemSeleccionado as Noticia).denunciante || { nombre: 'Sin denunciante', tipoIdentificacion: 'CC', numeroIdentificacion: 'N/A' };
                                  return (
                                    <>
                                      <p className="font-bold text-gray-900">{den.nombre}</p>
                                      <p className="text-sm text-gray-600">
                                        <span className="font-semibold">{den.tipoIdentificacion}:</span> {den.numeroIdentificacion}
                                      </p>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Denunciado */}
                            <div>
                              <h5 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                ⚠️ DENUNCIADO
                              </h5>
                              <div className="p-3 bg-red-50 rounded-lg border border-red-200 space-y-1">
                                {(() => {
                                  const den = (itemSeleccionado as Noticia).denunciado || { nombre: 'Sin denunciado', tipoIdentificacion: 'CC', numeroIdentificacion: 'N/A' };
                                  return (
                                    <>
                                      <p className="font-bold text-gray-900">{den.nombre}</p>
                                      <p className="text-sm text-gray-600">
                                        <span className="font-semibold">{den.tipoIdentificacion}:</span> {den.numeroIdentificacion}
                                      </p>
                                    </>
                                  );
                                })()}
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
                        {itemSeguro.tipo === 'proceso' && (
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
                                <p className="font-bold text-gray-900">{(itemSeleccionado as Proceso).profesionalAsignado.nombre}</p>
                                <p className="text-sm text-gray-600">
                                  <span className="font-semibold">{(itemSeleccionado as Proceso).profesionalAsignado.tipoIdentificacion}:</span> {(itemSeleccionado as Proceso).profesionalAsignado.numeroIdentificacion}
                                </p>
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
            );
          })()}
        </AnimatePresence>

        {/* MODAL: CREAR NOTICIA (sin depender de itemSeleccionado) */}
        <AnimatePresence>
          {modalActivo === 'crear-noticia' && (
            <CreateNoticiaModal
              onClose={() => setModalActivo(null)}
              onSave={handleCrearNoticia}
            />
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

          {modalActivo === 'comentarios-proceso' && itemSeleccionado && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
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
        </AnimatePresence>
      </div>
    </DndProvider>
  );
}




