/**
 * COMPONENTE KANBAN GENÉRICO REUTILIZABLE
 * Para todos los módulos de Gestión Legal
 */

import { useState, ReactNode } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { motion } from 'motion/react';
import { LucideIcon, FileText, MessageSquare, History, List, Columns3, Plus } from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';

export interface EtapaKanban {
  id: string;
  label: string;
  color: string;
}

export interface CampoTarjeta {
  label: string;
  valor: string;
  emoji?: string;
}

export interface ItemKanban {
  id: string;
  etapa: string;
  titulo: string;
  subtitulo?: string;
  badge: {
    texto: string;
    className: string;
  };
  campos: CampoTarjeta[];
  indicador?: {
    texto: string;
    className: string;
    icon: ReactNode;
  };
  colorBarra?: string;
}

export interface ConfigKanban {
  titulo: string;
  descripcion: string;
  iconoModulo: LucideIcon;
  colorIcono: string;
  etapas: EtapaKanban[];
  items: ItemKanban[];
  tipoItem: string; // Para el DnD
  nombreBotonNuevo: string;
  onNuevoItem?: () => void;
  onVerDetalle?: (item: ItemKanban) => void;
}

function TarjetaGenerica({ item, config, onVerDetalle }: { item: ItemKanban; config: ConfigKanban; onVerDetalle?: (item: ItemKanban) => void }) {
  const [{ isDragging }, drag] = useDrag({
    type: config.tipoItem,
    item: item,
    collect: (monitor) => ({ isDragging: monitor.isDragging() })
  });

  const IconoModulo = config.iconoModulo;

  return (
    <motion.div
      ref={drag}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: isDragging ? 0.95 : 1 }}
      className="cursor-move"
    >
      <Card className="bg-white border border-gray-200 hover:shadow-md transition-all" style={{ height: '380px', minHeight: '380px', maxHeight: '380px' }}>
        <div className="h-1" style={{ background: item.colorBarra || config.colorIcono }} />
        
        <div className="p-3 flex flex-col overflow-y-auto" style={{ height: 'calc(100% - 4px)' }}>
          {/* Header */}
          <div 
            className="flex items-start justify-between mb-2 cursor-pointer hover:bg-gray-50 -mx-3 -mt-0 px-3 pt-2 pb-2 rounded-t-lg" 
            onClick={onVerDetalle ? () => onVerDetalle(item) : undefined}
          >
            <div className="flex items-center gap-2 flex-1">
              <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${config.colorIcono}20` }}>
                <IconoModulo className="w-4 h-4" style={{ color: config.colorIcono }} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm truncate text-gray-900">{item.titulo}</h4>
                {item.subtitulo && <p className="text-xs text-gray-500 truncate">{item.subtitulo}</p>}
              </div>
            </div>
            <Badge className={`text-xs px-2 font-semibold ml-2 ${item.badge.className}`}>
              {item.badge.texto}
            </Badge>
          </div>

          {/* Campos dinámicos */}
          {item.campos.map((campo, idx) => (
            <div key={idx} className="mb-2 pb-2 border-b border-gray-200">
              <p className="text-xs text-gray-500 mb-0.5">{campo.emoji} {campo.label}:</p>
              <p className="font-bold text-sm text-gray-900 line-clamp-1">{campo.valor}</p>
            </div>
          ))}

          {/* Indicador de tiempo/alerta */}
          {item.indicador && (
            <div className="flex items-center justify-between mb-3">
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${item.indicador.className}`}>
                {item.indicador.icon}
                <span className="text-xs font-semibold">{item.indicador.texto}</span>
              </div>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="mt-auto space-y-1.5">
            <Button className="w-full text-xs py-2 text-white" style={{ backgroundColor: config.colorIcono }} size="sm">
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

function ColumnaKanban({ 
  etapa, 
  items, 
  config,
  onDrop 
}: { 
  etapa: EtapaKanban; 
  items: ItemKanban[]; 
  config: ConfigKanban;
  onDrop: (item: ItemKanban, etapa: string) => void;
}) {
  const [{ isOver }, drop] = useDrop({
    accept: config.tipoItem,
    drop: (item: ItemKanban) => onDrop(item, etapa.id),
    collect: (monitor) => ({ isOver: monitor.isOver() })
  });

  return (
    <div 
      ref={drop} 
      className={`flex flex-col h-full transition-all ${isOver ? 'bg-blue-50' : 'bg-gray-50'}`} 
      style={{ minWidth: '320px', maxWidth: '320px' }}
    >
      <div className="p-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: etapa.color }} />
            <h3 className="font-bold text-sm text-gray-900">{etapa.label}</h3>
          </div>
          <Badge className="bg-gray-100 text-gray-700">{items.length}</Badge>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {items.map((item) => (
          <TarjetaGenerica key={item.id} item={item} config={config} onVerDetalle={config.onVerDetalle} />
        ))}
      </div>
    </div>
  );
}

export function KanbanGenerico({ config }: { config: ConfigKanban }) {
  const [items, setItems] = useState<ItemKanban[]>(config.items);
  const [vistaActual, setVistaActual] = useState<'kanban' | 'lista'>('kanban');

  const handleDrop = (item: ItemKanban, nuevaEtapa: string) => {
    setItems(prevItems =>
      prevItems.map(i =>
        i.id === item.id ? { ...i, etapa: nuevaEtapa } : i
      )
    );
    toast.success(`${item.titulo} movido a ${config.etapas.find(e => e.id === nuevaEtapa)?.label}`);
  };

  const itemsPorEtapa = (etapaId: string) => items.filter(item => item.etapa === etapaId);

  const IconoModulo = config.iconoModulo;

  // Calcular estadísticas
  const totalItems = items.length;
  const itemsConAlerta = items.filter(i => i.indicador?.className.includes('red')).length;
  const itemsEnProceso = items.filter(i => !i.etapa.includes('COMPLETADO') && !i.etapa.includes('CERRADO') && !i.etapa.includes('ENVIADO') && !i.etapa.includes('RESPONDIDA') && !i.etapa.includes('RESPONDIDO') && !i.etapa.includes('TERMINADO')).length;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${config.colorIcono}20` }}>
                <IconoModulo className="w-6 h-6" style={{ color: config.colorIcono }} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{config.titulo}</h1>
                <p className="text-sm text-gray-600">{config.descripcion}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Estadísticas rápidas */}
              <div className="hidden md:flex items-center gap-3 mr-4 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-sm font-semibold text-gray-700">{totalItems}</span>
                  <span className="text-xs text-gray-500">Total</span>
                </div>
                <div className="w-px h-4 bg-gray-300" />
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <span className="text-sm font-semibold text-gray-700">{itemsEnProceso}</span>
                  <span className="text-xs text-gray-500">En Proceso</span>
                </div>
                <div className="w-px h-4 bg-gray-300" />
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-sm font-semibold text-gray-700">{itemsConAlerta}</span>
                  <span className="text-xs text-gray-500">Alertas</span>
                </div>
              </div>
              
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
              <Button className="text-white" style={{ backgroundColor: config.colorIcono }} onClick={config.onNuevoItem}>
                <Plus className="w-4 h-4 mr-2" />
                {config.nombreBotonNuevo}
              </Button>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        {vistaActual === 'kanban' ? (
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex h-full gap-4 p-4" style={{ minWidth: 'max-content' }}>
              {config.etapas.map((etapa) => (
                <ColumnaKanban
                  key={etapa.id}
                  etapa={etapa}
                  items={itemsPorEtapa(etapa.id)}
                  config={config}
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
    </DndProvider>
  );
}