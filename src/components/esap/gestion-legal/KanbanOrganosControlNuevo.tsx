/**
 * ============================================
 * KANBAN ÓRGANOS DE CONTROL - FUNCIONALIDADES COMPLETAS
 * ============================================
 * 
 * REQ-MOD02-001/002: Implementación COMPLETA con modales funcionales
 * 
 * NUEVAS FUNCIONALIDADES:
 * ✅ Botón "Nuevo Requerimiento" funcional
 * ✅ Botón "Notas" en tarjetas (modal de comentarios)
 * ✅ Botón "Historial" en tarjetas (timeline de cambios)
 * ✅ Modal de detalle completo
 * ✅ Drag & Drop funcional
 */

import { useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  FileText,
  Clock,
  Eye,
  MessageSquare,
  History,
  AlertCircle,
  CheckCircle,
  Plus,
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';
import {
  ModalNotas,
  ModalHistorial,
  ModalNuevoRequerimiento,
} from './ModalesRequerimiento';
import { ModalDetalleRequerimiento } from './defensa-judicial/ModalDetalleRequerimiento';
import {
  sumarDiasHabiles,
  calcularInfoPlazo,
  calcularDiasHabilesRestantes,
  determinarColorAlerta,
  formatearFecha,
} from '../../../utils/calcularDiasHabiles';

// ==================== TIPOS ====================

type OrganoControl =
  | 'Contraloría General de la República'
  | 'Procuraduría General de la Nación'
  | 'Defensoría del Pueblo'
  | 'DANE'
  | 'Superintendencia de Educación'
  | 'Otro';

type TipoRequerimiento = 'INFORMACION' | 'AJUSTE';

type EstadoRequerimiento =
  | 'RECIBIDO'
  | 'EN_PREPARACION'
  | 'EN_REVISION'
  | 'APROBADA'
  | 'ENVIADA'
  | 'RESUELTA';

type ColorAlerta = 'VERDE' | 'AMARILLO' | 'ROJO' | 'VENCIDO';

interface Nota {
  id: string;
  autor: string;
  fecha: Date;
  contenido: string;
}

interface HistorialItem {
  id: string;
  fecha: Date;
  accion: string;
  usuario: string;
  detalles?: string;
}

interface Requerimiento {
  id: string;
  organoControl: OrganoControl;
  tipo: TipoRequerimiento;
  numeroRadicado: string;
  fechaRecepcion: Date;
  fechaVencimiento: Date;
  diasTotales: number;
  diasRestantes: number;
  colorAlerta: ColorAlerta;
  descripcion: string;
  respuestaDraft: string;
  abogadoAsignado: string;
  estado: EstadoRequerimiento;
  territorial: string;
  documentosAdjuntos: number;
  observacionesRevision?: string;
  fechaEnvio?: Date;
  createdAt: Date;
  updatedAt: Date;
  notas?: Nota[];
  historial?: HistorialItem[];
}

// ==================== CONFIGURACIÓN ====================

const ESTADOS: { id: EstadoRequerimiento; label: string; color: string }[] = [
  { id: 'RECIBIDO', label: 'Recibido', color: '#6366F1' },
  { id: 'EN_PREPARACION', label: 'Análisis', color: '#F59E0B' },
  { id: 'EN_REVISION', label: 'Elaboración Respuesta', color: '#8B5CF6' },
  { id: 'APROBADA', label: 'Revisión', color: '#EC4899' },
  { id: 'ENVIADA', label: 'Enviado', color: '#10B981' },
  { id: 'RESUELTA', label: 'Resuelta', color: '#6B7280' },
];

// ==================== MOCK DATA ====================

const REQUERIMIENTOS_MOCK: Requerimiento[] = [
  {
    id: 'OC-2025-00001',
    organoControl: 'Contraloría General de la República',
    tipo: 'INFORMACION',
    numeroRadicado: 'CGR-2025-0457',
    fechaRecepcion: new Date('2025-01-05'),
    fechaVencimiento: new Date('2025-02-15'),
    diasTotales: 30,
    diasRestantes: 10,
    colorAlerta: 'AMARILLO',
    descripcion: 'Informe de gestión presupuestal cuarto trimestre 2024',
    respuestaDraft: '',
    abogadoAsignado: 'María González Pérez',
    estado: 'RECIBIDO',
    territorial: 'Nacional',
    documentosAdjuntos: 3,
    createdAt: new Date('2025-01-05'),
    updatedAt: new Date('2025-01-18'),
    notas: [
      {
        id: 'N1',
        autor: 'María González Pérez',
        fecha: new Date('2025-01-06'),
        contenido: 'Solicité información adicional al área de presupuesto',
      },
    ],
    historial: [
      {
        id: 'H1',
        fecha: new Date('2025-01-05 10:30'),
        accion: 'Requerimiento Creado',
        usuario: 'Sistema',
        detalles: 'Registro inicial del requerimiento',
      },
    ],
  },
  {
    id: 'OC-2025-00002',
    organoControl: 'Procuraduría General de la Nación',
    tipo: 'AJUSTE',
    numeroRadicado: 'PGN-2025-0123',
    fechaRecepcion: new Date('2025-01-15'),
    fechaVencimiento: new Date('2025-01-25'),
    diasTotales: 10,
    diasRestantes: 3,
    colorAlerta: 'ROJO',
    descripcion: 'Hallazgo en proceso de contratación - Convenio 2024-045',
    respuestaDraft: 'En proceso de consolidación...',
    abogadoAsignado: 'Dr. Carlos Mendoza López',
    estado: 'EN_PREPARACION',
    territorial: 'Territorial Antioquia',
    documentosAdjuntos: 5,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-20'),
    historial: [
      {
        id: 'H2',
        fecha: new Date('2025-01-15 14:00'),
        accion: 'Requerimiento Creado',
        usuario: 'Sistema',
      },
      {
        id: 'H3',
        fecha: new Date('2025-01-16 09:15'),
        accion: 'Movido a Análisis',
        usuario: 'Dr. Carlos Mendoza',
        detalles: 'Iniciando revisión del hallazgo',
      },
    ],
  },
  {
    id: 'OC-2025-00003',
    organoControl: 'Defensoría del Pueblo',
    tipo: 'INFORMACION',
    numeroRadicado: 'DEF-2025-0089',
    fechaRecepcion: new Date('2025-01-10'),
    fechaVencimiento: new Date('2025-01-28'),
    diasTotales: 15,
    diasRestantes: 8,
    colorAlerta: 'AMARILLO',
    descripcion: 'Solicitud de información sobre acciones de tutela',
    respuestaDraft: 'Borrador de respuesta en elaboración...',
    abogadoAsignado: 'Dra. Ana Martínez',
    estado: 'EN_REVISION',
    territorial: 'Territorial Bogotá',
    documentosAdjuntos: 2,
    createdAt: new Date('2025-01-10'),
    updatedAt: new Date('2025-01-19'),
  },
  {
    id: 'OC-2025-00004',
    organoControl: 'DANE',
    tipo: 'INFORMACION',
    numeroRadicado: 'DANE-2025-0234',
    fechaRecepcion: new Date('2025-01-08'),
    fechaVencimiento: new Date('2025-02-10'),
    diasTotales: 30,
    diasRestantes: 20,
    colorAlerta: 'VERDE',
    descripcion: 'Información estadística de egresados 2024',
    respuestaDraft: 'Respuesta aprobada y lista para envío',
    abogadoAsignado: 'Dr. Luis Ramírez',
    estado: 'APROBADA',
    territorial: 'Nacional',
    documentosAdjuntos: 8,
    createdAt: new Date('2025-01-08'),
    updatedAt: new Date('2025-01-19'),
  },
  {
    id: 'OC-2025-00005',
    organoControl: 'Superintendencia de Educación',
    tipo: 'AJUSTE',
    numeroRadicado: 'SUP-2025-0567',
    fechaRecepcion: new Date('2025-01-12'),
    fechaVencimiento: new Date('2025-02-15'),
    diasTotales: 30,
    diasRestantes: 25,
    colorAlerta: 'VERDE',
    descripcion: 'Seguimiento a plan de mejoramiento institucional',
    respuestaDraft: '',
    abogadoAsignado: 'Dra. Patricia Rojas',
    estado: 'ENVIADA',
    territorial: 'Nacional',
    documentosAdjuntos: 12,
    fechaEnvio: new Date('2025-01-18'),
    createdAt: new Date('2025-01-12'),
    updatedAt: new Date('2025-01-18'),
  },
  {
    id: 'OC-2024-00999',
    organoControl: 'Contraloría General de la República',
    tipo: 'INFORMACION',
    numeroRadicado: 'CGR-2024-9876',
    fechaRecepcion: new Date('2024-12-15'),
    fechaVencimiento: new Date('2025-01-15'),
    diasTotales: 30,
    diasRestantes: -5,
    colorAlerta: 'VENCIDO',
    descripcion: 'Informe final de ejecución presupuestal 2024 - Caso cerrado',
    respuestaDraft: 'Respuesta enviada y aceptada',
    abogadoAsignado: 'Dr. Jorge Castillo',
    estado: 'RESUELTA',
    territorial: 'Nacional',
    documentosAdjuntos: 15,
    fechaEnvio: new Date('2025-01-10'),
    createdAt: new Date('2024-12-15'),
    updatedAt: new Date('2025-01-15'),
  },
];

// ==================== TARJETA REQUERIMIENTO ====================

function TarjetaRequerimiento({
  req,
  onVerDetalle,
  onVerNotas,
  onVerHistorial,
}: {
  req: Requerimiento;
  onVerDetalle: () => void;
  onVerNotas: () => void;
  onVerHistorial: () => void;
}) {
  const [{ isDragging }, drag] = useDrag({
    type: 'REQUERIMIENTO',
    item: req,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const getAlertaIcon = () => {
    if (req.colorAlerta === 'VERDE') return <CheckCircle className="w-3.5 h-3.5" />;
    if (req.colorAlerta === 'AMARILLO') return <Clock className="w-3.5 h-3.5" />;
    return <AlertCircle className="w-3.5 h-3.5" />;
  };

  const getAlertaColor = () => {
    if (req.colorAlerta === 'VERDE') return 'bg-green-100 text-green-800';
    if (req.colorAlerta === 'AMARILLO') return 'bg-yellow-100 text-yellow-800';
    if (req.colorAlerta === 'ROJO') return 'bg-red-100 text-red-800';
    return 'bg-red-900 text-white';
  };

  return (
    <motion.div
      ref={drag}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: isDragging ? 0.95 : 1 }}
      className="cursor-move"
    >
      <Card className="bg-white border border-gray-200 hover:shadow-md transition-all">
        {/* Barra superior de color según alerta */}
        <div
          className={`h-1 ${
            req.colorAlerta === 'ROJO'
              ? 'bg-red-600'
              : req.colorAlerta === 'AMARILLO'
              ? 'bg-yellow-500'
              : 'bg-green-500'
          }`}
        />

        <div className="p-3 flex flex-col">
          {/* Header con ID y Órgano */}
          <div
            className="flex items-start justify-between mb-2 cursor-pointer hover:bg-gray-50 -mx-3 px-3 pt-2 pb-2 rounded-t-lg"
            onClick={onVerDetalle}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="p-1.5 rounded-lg bg-red-50 flex-shrink-0">
                <Shield className="w-4 h-4 text-red-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm truncate text-gray-900">{req.id}</h4>
                <p className="text-xs text-gray-500 truncate">{req.numeroRadicado}</p>
              </div>
            </div>
            <Badge
              className={`text-xs px-2 font-semibold ml-2 flex-shrink-0 ${
                req.tipo === 'INFORMACION'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-orange-100 text-orange-800'
              }`}
            >
              {req.tipo === 'INFORMACION' ? 'INFO' : 'AJUSTE'}
            </Badge>
          </div>

          {/* Órgano de Control */}
          <div className="mb-2 pb-2 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-1">🏛️ Órgano:</p>
            <p className="font-bold text-xs text-gray-900 line-clamp-2">{req.organoControl}</p>
          </div>

          {/* Descripción */}
          <div className="mb-2 pb-2 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-1">📄 Descripción:</p>
            <p className="text-xs text-gray-700 line-clamp-2">{req.descripcion}</p>
          </div>

          {/* Responsable */}
          <div className="mb-2 pb-2 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-1">👨‍⚖️ Responsable:</p>
            <p className="font-bold text-xs text-gray-900 truncate">{req.abogadoAsignado}</p>
            <p className="text-xs text-gray-600">{req.territorial}</p>
          </div>

          {/* Días restantes */}
          <div className="flex items-center justify-between mb-3">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${getAlertaColor()}`}>
              {getAlertaIcon()}
              <span className="text-xs font-semibold">
                {req.diasRestantes < 0 ? 'VENCIDO' : `${req.diasRestantes} días`}
              </span>
            </div>
          </div>

          {/* Botones de acción - FUNCIONALES */}
          <div className="mt-auto space-y-1.5">
            <Button
              className="w-full text-xs py-2 bg-red-600 hover:bg-red-700 text-white"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onVerDetalle();
              }}
            >
              <Eye className="w-3.5 h-3.5 mr-1.5" />
              Ver Detalles
            </Button>
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                variant="outline"
                className="text-xs py-2"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onVerNotas();
                }}
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1" />
                Notas
              </Button>
              <Button
                variant="outline"
                className="text-xs py-2"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onVerHistorial();
                }}
              >
                <History className="w-3.5 h-3.5 mr-1" />
                Historial
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ==================== COLUMNA KANBAN ====================

function ColumnaKanban({
  estado,
  requerimientos,
  onDrop,
  onVerDetalle,
  onVerNotas,
  onVerHistorial,
}: {
  estado: typeof ESTADOS[0];
  requerimientos: Requerimiento[];
  onDrop: (item: Requerimiento, estado: EstadoRequerimiento) => void;
  onVerDetalle: (req: Requerimiento) => void;
  onVerNotas: (req: Requerimiento) => void;
  onVerHistorial: (req: Requerimiento) => void;
}) {
  const [{ isOver }, drop] = useDrop({
    accept: 'REQUERIMIENTO',
    drop: (item: Requerimiento) => onDrop(item, estado.id),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  return (
    <div
      ref={drop}
      className={`flex flex-col h-full transition-all rounded-lg ${
        isOver ? 'bg-red-50 ring-2 ring-red-300' : 'bg-gray-50'
      }`}
      style={{ minWidth: '340px', maxWidth: '340px' }}
    >
      {/* Header de columna */}
      <div className="p-3 border-b border-gray-200 bg-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: estado.color }} />
            <h3 className="font-bold text-sm text-gray-900">{estado.label}</h3>
          </div>
          <Badge className="bg-gray-100 text-gray-700 font-bold">{requerimientos.length}</Badge>
        </div>
      </div>

      {/* Contenido scrolleable */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {requerimientos.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No hay requerimientos</p>
          </div>
        ) : (
          requerimientos.map((req) => (
            <TarjetaRequerimiento
              key={req.id}
              req={req}
              onVerDetalle={() => onVerDetalle(req)}
              onVerNotas={() => onVerNotas(req)}
              onVerHistorial={() => onVerHistorial(req)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================

export function KanbanOrganosControl() {
  const [requerimientos, setRequerimientos] = useState<Requerimiento[]>(REQUERIMIENTOS_MOCK);
  const [requerimientoSeleccionado, setRequerimientoSeleccionado] = useState<Requerimiento | null>(
    null
  );
  const [modalNotasVisible, setModalNotasVisible] = useState(false);
  const [modalHistorialVisible, setModalHistorialVisible] = useState(false);
  const [modalNuevoVisible, setModalNuevoVisible] = useState(false);

  const handleDrop = (item: Requerimiento, nuevoEstado: EstadoRequerimiento) => {
    setRequerimientos((prev) =>
      prev.map((req) => (req.id === item.id ? { ...req, estado: nuevoEstado, updatedAt: new Date() } : req))
    );
    toast.success(`Requerimiento ${item.id} movido a ${nuevoEstado.replace('_', ' ')}`);
  };

  const handleAgregarNota = (contenido: string) => {
    if (!requerimientoSeleccionado) return;
    
    const nuevaNota: Nota = {
      id: `N-${Date.now()}`,
      autor: 'Usuario Actual', // En producción sería el usuario autenticado
      fecha: new Date(),
      contenido,
    };

    setRequerimientos((prev) =>
      prev.map((req) =>
        req.id === requerimientoSeleccionado.id
          ? { ...req, notas: [...(req.notas || []), nuevaNota] }
          : req
      )
    );

    // Actualizar el requerimiento seleccionado
    setRequerimientoSeleccionado((prev) =>
      prev ? { ...prev, notas: [...(prev.notas || []), nuevaNota] } : null
    );
  };

  const handleNuevoRequerimiento = (data: any) => {
    console.log('✅ Creando nuevo requerimiento:', data);
    
    // Calcular información completa de plazo usando días hábiles
    const fechaRecepcion = new Date(data.fechaRecepcion);
    const plazoTotal = data.plazoCalculado || 30;
    const infoPlazo = calcularInfoPlazo(fechaRecepcion, plazoTotal);
    
    // Crear nuevo requerimiento
    const nuevoReq: Requerimiento = {
      id: `OC-2025-${String(requerimientos.length + 1).padStart(5, '0')}`,
      organoControl: data.organoControl,
      tipo: data.tipo,
      numeroRadicado: data.numeroRadicado || `RAD-${Date.now()}`,
      fechaRecepcion: fechaRecepcion,
      fechaVencimiento: infoPlazo.fechaVencimiento,
      diasTotales: infoPlazo.diasTotales,
      diasRestantes: infoPlazo.diasRestantes,
      colorAlerta: infoPlazo.colorAlerta,
      descripcion: data.descripcion || data.asunto || 'Sin descripción',
      respuestaDraft: '',
      abogadoAsignado: data.abogadoAsignado || data.responsable || 'Sin asignar',
      estado: 'RECIBIDO', // Nuevo requerimiento inicia en RECIBIDO
      territorial: data.territorial || 'Nacional',
      documentosAdjuntos: data.documentos?.length || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      notas: [],
      historial: [
        {
          id: `H-${Date.now()}`,
          fecha: new Date(),
          accion: 'Requerimiento Creado',
          usuario: 'Sistema',
          detalles: `${data.organoControl} • ${data.tipo} • ${infoPlazo.diasTotales} días hábiles`,
        },
      ],
    };
    
    // Agregar a la lista de requerimientos
    setRequerimientos((prev) => [nuevoReq, ...prev]);
    
    // Mostrar toast de éxito con información detallada
    toast.success('✅ Requerimiento creado exitosamente', {
      description: `${data.numeroRadicado} • Vence: ${infoPlazo.fechaVencimientoFormateada} • ${infoPlazo.textoRestante}`,
    });
    
    // Cerrar modal
    setModalNuevoVisible(false);
  };

  const handleActualizarRequerimiento = (updates: Partial<Requerimiento>) => {
    if (!requerimientoSeleccionado) return;

    setRequerimientos((prev) =>
      prev.map((req) =>
        req.id === requerimientoSeleccionado.id
          ? { ...req, ...updates, updatedAt: new Date() }
          : req
      )
    );

    // Actualizar el requerimiento seleccionado para reflejar cambios en el modal
    setRequerimientoSeleccionado((prev) =>
      prev ? { ...prev, ...updates, updatedAt: new Date() } : null
    );
  };

  const requerimientosPorEstado = (estado: EstadoRequerimiento) =>
    requerimientos.filter((req) => req.estado === estado);

  // Estadísticas
  const totalRequerimientos = requerimientos.length;
  const requerimientosConAlerta = requerimientos.filter(
    (req) => req.colorAlerta === 'ROJO' || req.colorAlerta === 'VENCIDO'
  ).length;
  const requerimientosEnProceso = requerimientos.filter((req) => req.estado !== 'RESUELTA').length;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white p-4 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Tablero Kanban Operativo</h1>
              <p className="text-sm text-gray-600">Órganos de Control • REQ-MOD02-001/002</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-6 px-4 py-2 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-lg font-bold text-gray-900">{totalRequerimientos}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">En Proceso</p>
                <p className="text-lg font-bold text-blue-600">{requerimientosEnProceso}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Con Alerta</p>
                <p className="text-lg font-bold text-red-600">{requerimientosConAlerta}</p>
              </div>
            </div>
            {/* BOTÓN NUEVO REQUERIMIENTO - FUNCIONAL */}
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => setModalNuevoVisible(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Requerimiento
            </Button>
          </div>
        </div>
      </div>

      {/* Kanban */}
      <DndProvider backend={HTML5Backend}>
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
          <div className="flex gap-4 h-full min-w-max">
            {ESTADOS.map((estado) => (
              <ColumnaKanban
                key={estado.id}
                estado={estado}
                requerimientos={requerimientosPorEstado(estado.id)}
                onDrop={handleDrop}
                onVerDetalle={setRequerimientoSeleccionado}
                onVerNotas={(req) => {
                  setRequerimientoSeleccionado(req);
                  setModalNotasVisible(true);
                }}
                onVerHistorial={(req) => {
                  setRequerimientoSeleccionado(req);
                  setModalHistorialVisible(true);
                }}
              />
            ))}
          </div>
        </div>
      </DndProvider>

      {/* MODALES FUNCIONALES */}
      
      {/* Modal Detalle - NO se superpone con Notas/Historial */}
      {requerimientoSeleccionado && !modalNotasVisible && !modalHistorialVisible && (
        <ModalDetalleRequerimiento
          isOpen={true}
          onClose={() => setRequerimientoSeleccionado(null)}
          requerimiento={requerimientoSeleccionado}
          onActualizar={handleActualizarRequerimiento}
          usuarioActual={{
            nombre: 'Usuario Demo',
            rol: 'ADMIN', // Simular rol ADMIN para testing - en producción vendría del contexto de autenticación
            email: 'admin@esap.edu.co',
          }}
          rolUsuario='ADMIN'
        />
      )}

      {/* Modal Notas */}
      <ModalNotas
        isOpen={modalNotasVisible}
        onClose={() => {
          setModalNotasVisible(false);
          // No cerrar requerimientoSeleccionado para mantener el contexto
        }}
        requerimientoId={requerimientoSeleccionado?.id || ''}
        notas={requerimientoSeleccionado?.notas || []}
        onAgregarNota={handleAgregarNota}
      />

      {/* Modal Historial */}
      <ModalHistorial
        isOpen={modalHistorialVisible}
        onClose={() => {
          setModalHistorialVisible(false);
          // No cerrar requerimientoSeleccionado para mantener el contexto
        }}
        requerimientoId={requerimientoSeleccionado?.id || ''}
        historial={requerimientoSeleccionado?.historial || []}
      />

      {/* Modal Nuevo Requerimiento */}
      <ModalNuevoRequerimiento
        isOpen={modalNuevoVisible}
        onClose={() => setModalNuevoVisible(false)}
        onSubmit={handleNuevoRequerimiento}
      />
    </div>
  );
}