/**
 * KANBAN DEFENSA JUDICIAL - Gestión Visual de Expedientes Judiciales
 * 4 Jurisdicciones: Constitucional, Contencioso, Laboral, Ordinaria
 */

import { useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { motion } from 'motion/react';
import {
  Scale, FileText, Clock, Eye, MessageSquare, History, AlertCircle,
  CheckCircle, XCircle, List, Columns3, Plus, Filter, Send
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';
import { FormularioExpedienteJudicial } from './defensa-judicial/FormularioExpedienteJudicial';

type Jurisdiccion = 'CONSTITUCIONAL' | 'CONTENCIOSO' | 'LABORAL' | 'ORDINARIA';
type Etapa = 'ADMISION' | 'CONTESTACION' | 'PRUEBAS' | 'ALEGATOS' | 'SENTENCIA' | 'CERRADO';
type ColorAlerta = 'VERDE' | 'AMARILLO' | 'ROJO' | 'VENCIDO';

interface Expediente {
  id: string;
  jurisdiccion: Jurisdiccion;
  demandante: { nombre: string; identificacion: string };
  demandado: { nombre: string; identificacion: string };
  juzgado: string;
  medioControl: string;
  abogadoAsignado: { nombre: string; identificacion: string };
  etapa: Etapa;
  diasRestantes: number;
  colorAlerta: ColorAlerta;
  fechaNotificacion: string;
  valorDemanda?: number;
}

const ETAPAS: { id: Etapa; label: string; color: string }[] = [
  { id: 'ADMISION', label: 'Admisión', color: '#6366F1' },
  { id: 'CONTESTACION', label: 'Contestación', color: '#F59E0B' },
  { id: 'PRUEBAS', label: 'Pruebas', color: '#8B5CF6' },
  { id: 'ALEGATOS', label: 'Alegatos', color: '#EC4899' },
  { id: 'SENTENCIA', label: 'Sentencia', color: '#10B981' },
  { id: 'CERRADO', label: 'Cerrado', color: '#6B7280' },
];

const EXPEDIENTES_MOCK: Expediente[] = [
  {
    id: 'PJ-2025-00001',
    jurisdiccion: 'CONSTITUCIONAL',
    demandante: { nombre: 'Juan Pérez Gómez', identificacion: 'CC 80123456' },
    demandado: { nombre: 'ESAP', identificacion: 'NIT 899999027-1' },
    juzgado: 'Juzgado 25 Civil Municipal de Bogotá',
    medioControl: 'Acción de Tutela',
    abogadoAsignado: { nombre: 'Dr. Luis Ramírez Torres', identificacion: 'CC 79456123' },
    etapa: 'ADMISION',
    diasRestantes: 2,
    colorAlerta: 'ROJO',
    fechaNotificacion: '2024-12-10',
    valorDemanda: 0,
  },
  {
    id: 'PJ-2025-00002',
    jurisdiccion: 'CONTENCIOSO',
    demandante: { nombre: 'María Rodríguez Silva', identificacion: 'CC 52987654' },
    demandado: { nombre: 'ESAP - Rectoría Nacional', identificacion: 'NIT 899999027-1' },
    juzgado: 'Tribunal Administrativo de Cundinamarca',
    medioControl: 'Acción de Nulidad y Restablecimiento',
    abogadoAsignado: { nombre: 'Dra. Patricia González Ruiz', identificacion: 'CC 52123789' },
    etapa: 'CONTESTACION',
    diasRestantes: 8,
    colorAlerta: 'AMARILLO',
    fechaNotificacion: '2024-11-15',
    valorDemanda: 50000000,
  },
  {
    id: 'PJ-2025-00003',
    jurisdiccion: 'LABORAL',
    demandante: { nombre: 'Carlos Méndez Silva', identificacion: 'CC 79445566' },
    demandado: { nombre: 'ESAP - Territorial Antioquia', identificacion: 'NIT 899999027-1' },
    juzgado: 'Juzgado Laboral del Circuito de Medellín',
    medioControl: 'Proceso Ordinario Laboral',
    abogadoAsignado: { nombre: 'Dr. Carlos Mendoza López', identificacion: 'CC 1015678901' },
    etapa: 'PRUEBAS',
    diasRestantes: 15,
    colorAlerta: 'AMARILLO',
    fechaNotificacion: '2024-10-01',
    valorDemanda: 120000000,
  },
];

function TarjetaExpediente({ expediente, onVerDetalle }: { expediente: Expediente; onVerDetalle: (exp: Expediente) => void }) {
  const [{ isDragging }, drag] = useDrag({
    type: 'EXPEDIENTE',
    item: expediente,
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const getColorAlerta = (color: ColorAlerta) => {
    switch (color) {
      case 'VERDE': return { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle };
      case 'AMARILLO': return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock };
      case 'ROJO': return { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle };
      case 'VENCIDO': return { bg: 'bg-red-900', text: 'text-white', icon: XCircle };
    }
  };

  const alertaColor = getColorAlerta(expediente.colorAlerta);
  const AlertIcon = alertaColor.icon;

  return (
    <motion.div
      ref={drag}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: isDragging ? 0.95 : 1 }}
      className="cursor-move"
    >
      <Card className="bg-white border border-gray-200 hover:shadow-md transition-all" style={{ height: '380px', minHeight: '380px', maxHeight: '380px' }}>
        <div className="h-1 bg-blue-600" style={{ background: '#003DA5' }} />
        
        <div className="p-3 flex flex-col overflow-y-auto" style={{ height: 'calc(100% - 4px)' }}>
          {/* Header */}
          <div className="flex items-start justify-between mb-2 cursor-pointer hover:bg-gray-50 -mx-3 -mt-0 px-3 pt-2 pb-2 rounded-t-lg" onClick={() => onVerDetalle(expediente)}>
            <div className="flex items-center gap-2 flex-1">
              <div className="p-1.5 rounded-lg bg-blue-50">
                <Scale className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm truncate text-gray-900">{expediente.id}</h4>
                <p className="text-xs text-gray-500 truncate">{expediente.medioControl}</p>
              </div>
            </div>
            <Badge className="text-xs px-2 font-semibold ml-2 bg-blue-50 text-blue-700 border border-blue-200">
              {expediente.jurisdiccion}
            </Badge>
          </div>

          {/* Demandante */}
          <div className="mb-2 pb-2 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">👤 Demandante:</p>
            <p className="font-bold text-sm text-gray-900 line-clamp-1">{expediente.demandante.nombre}</p>
            <p className="text-xs text-gray-600">{expediente.demandante.identificacion}</p>
          </div>

          {/* Demandado */}
          <div className="mb-2 pb-2 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">⚖️ Demandado:</p>
            <p className="font-bold text-sm text-gray-900 line-clamp-1">{expediente.demandado.nombre}</p>
            <p className="text-xs text-gray-600">{expediente.demandado.identificacion}</p>
          </div>

          {/* Abogado Asignado */}
          <div className="mb-3 pb-2 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">👨‍⚖️ Abogado:</p>
            <p className="font-bold text-sm text-gray-900 line-clamp-1">{expediente.abogadoAsignado.nombre}</p>
            <p className="text-xs text-gray-600">{expediente.abogadoAsignado.identificacion}</p>
          </div>

          {/* Juzgado */}
          <div className="mb-3">
            <p className="text-xs text-gray-700 line-clamp-2">{expediente.juzgado}</p>
          </div>

          {/* Días Restantes */}
          <div className="flex items-center justify-between mb-3">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${alertaColor.bg}`}>
              <AlertIcon className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">{expediente.diasRestantes < 0 ? 'VENCIDO' : `${expediente.diasRestantes} días`}</span>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="mt-auto space-y-1.5">
            <Button className="w-full text-xs py-2 bg-blue-600 hover:bg-blue-700 text-white" size="sm">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Expediente
            </Button>
            <div className="grid grid-cols-2 gap-1.5">
              <Button variant="outline" className="text-xs py-2" size="sm">
                <MessageSquare className="w-3.5 h-3.5 mr-1" />
                Comentarios
              </Button>
              <Button variant="outline" className="text-xs py-2" size="sm">
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

function ColumnaKanban({ etapa, expedientes, onDrop }: { etapa: typeof ETAPAS[0]; expedientes: Expediente[]; onDrop: (item: Expediente, etapa: Etapa) => void }) {
  const [{ isOver }, drop] = useDrop({
    accept: 'EXPEDIENTE',
    drop: (item: Expediente) => onDrop(item, etapa.id),
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  return (
    <div ref={drop} className={`flex flex-col h-full transition-all ${isOver ? 'bg-blue-50' : 'bg-gray-50'}`} style={{ minWidth: '320px', maxWidth: '320px' }}>
      <div className="p-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: etapa.color }} />
            <h3 className="font-bold text-sm text-gray-900">{etapa.label}</h3>
          </div>
          <Badge className="bg-gray-100 text-gray-700">{expedientes.length}</Badge>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {expedientes.map((exp) => (
          <TarjetaExpediente key={exp.id} expediente={exp} onVerDetalle={() => toast.info(`Ver detalles: ${exp.id}`)} />
        ))}
      </div>
    </div>
  );
}

export function KanbanDefensaJudicial() {
  const [expedientes, setExpedientes] = useState<Expediente[]>(EXPEDIENTES_MOCK);
  const [vistaActual, setVistaActual] = useState<'kanban' | 'lista'>('kanban');
  const [formularioAbierto, setFormularioAbierto] = useState(false);

  const handleDrop = (item: Expediente, nuevaEtapa: Etapa) => {
    const etapaAnterior = item.etapa;
    const usuario = 'Usuario Actual'; // En producción vendría del contexto de autenticación
    
    setExpedientes(prevExpedientes =>
      prevExpedientes.map(exp =>
        exp.id === item.id ? { 
          ...exp, 
          etapa: nuevaEtapa,
          ultimaModificacion: new Date()
        } : exp
      )
    );
    
    // Registrar en trazabilidad/historial
    const eventoTrazabilidad = {
      id: `evt-${Date.now()}`,
      tipo: 'cambio-estado' as const,
      titulo: `Cambio de etapa: ${etapaAnterior} → ${nuevaEtapa}`,
      descripcion: `El expediente fue movido de "${etapaAnterior}" a "${nuevaEtapa}" mediante arrastrar y soltar`,
      usuario: usuario,
      fecha: new Date(),
      expedienteId: item.id,
      etapaAnterior: etapaAnterior,
      etapaNueva: nuevaEtapa
    };
    
    // En producción, esto se guardaría en el backend
    console.log('📋 Trazabilidad - Movimiento de expediente:', eventoTrazabilidad);
    
    toast.success(`Expediente ${item.id} movido a ${nuevaEtapa}`, {
      description: 'Cambio registrado en trazabilidad'
    });
  };

  const expedientesPorEtapa = (etapa: Etapa) => expedientes.filter(exp => exp.etapa === etapa);

  // Estadísticas
  const totalExpedientes = expedientes.length;
  const expedientesConAlerta = expedientes.filter(exp => exp.colorAlerta === 'ROJO' || exp.colorAlerta === 'VENCIDO').length;
  const expedientesEnProceso = expedientes.filter(exp => exp.etapa !== 'CERRADO').length;

  const handleExpedienteCreado = (expedienteId: string) => {
    // Aquí podrías recargar la lista o agregar el expediente nuevo
    toast.success(`Expediente ${expedienteId} agregado al tablero`);
    // Recargar expedientes (en producción sería una llamada al API)
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Scale className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Tablero Kanban Operativo</h1>
                <p className="text-sm text-gray-600">Defensa Judicial de 4 Jurisdicciones</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Estadísticas rápidas */}
              <div className="hidden md:flex items-center gap-3 mr-4 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-sm font-semibold text-gray-700">{totalExpedientes}</span>
                  <span className="text-xs text-gray-500">Total</span>
                </div>
                <div className="w-px h-4 bg-gray-300" />
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <span className="text-sm font-semibold text-gray-700">{expedientesEnProceso}</span>
                  <span className="text-xs text-gray-500">En Proceso</span>
                </div>
                <div className="w-px h-4 bg-gray-300" />
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-sm font-semibold text-gray-700">{expedientesConAlerta}</span>
                  <span className="text-xs text-gray-500">Alertas</span>
                </div>
              </div>

              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </Button>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <Button
                  variant={vistaActual === 'kanban' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setVistaActual('kanban')}
                  className={vistaActual === 'kanban' ? 'bg-white shadow-sm' : ''}
                >
                  <Columns3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={vistaActual === 'lista' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setVistaActual('lista')}
                  className={vistaActual === 'lista' ? 'bg-white shadow-sm' : ''}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setFormularioAbierto(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Expediente
              </Button>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        {vistaActual === 'kanban' ? (
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex h-full gap-4 p-4" style={{ minWidth: 'max-content' }}>
              {ETAPAS.map((etapa) => (
                <ColumnaKanban
                  key={etapa.id}
                  etapa={etapa}
                  expedientes={expedientesPorEtapa(etapa.id)}
                  onDrop={handleDrop}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-6">
            <div className="text-center text-gray-500">Vista de lista en desarrollo</div>
          </div>
        )}
      </div>

      {/* Modal Formulario Creación */}
      <FormularioExpedienteJudicial
        isOpen={formularioAbierto}
        onClose={() => setFormularioAbierto(false)}
        onExpedienteCreado={handleExpedienteCreado}
      />
    </DndProvider>
  );
}