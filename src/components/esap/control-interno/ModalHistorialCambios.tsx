/**
 * MODAL DE HISTORIAL DE CAMBIOS - RF003
 * Muestra el historial completo de cambios y ampliaciones de una auditoría
 * con trazabilidad completa de modificaciones
 */

import { History, Clock, User, FileText, Calendar, TrendingUp, Download } from 'lucide-react';
import { ResponsiveModal } from '../shared/ResponsiveModal';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';
import { AmpliacionPlazo } from './ModalAmpliacionPlazo';

export interface HistorialCambio {
  id: string;
  tipo: 'creacion' | 'ampliacion' | 'reasignacion' | 'cambio_fechas' | 'cambio_estado';
  timestamp: string;
  usuario: string;
  descripcion: string;
  datosAnteriores?: any;
  datosNuevos?: any;
  etapaAfectada?: string;
}

interface ModalHistorialCambiosProps {
  isOpen: boolean;
  onClose: () => void;
  auditoria: {
    id: string;
    codigo: string;
    procesoAuditable: string;
  };
  ampliaciones?: AmpliacionPlazo[];
  historial?: HistorialCambio[];
}

const TIPO_CAMBIO_CONFIG = {
  creacion: {
    label: 'Creación',
    color: '#10B981',
    bgColor: '#D1FAE5',
    icon: FileText
  },
  ampliacion: {
    label: 'Ampliación de Plazo',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: Clock
  },
  reasignacion: {
    label: 'Reasignación',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: User
  },
  cambio_fechas: {
    label: 'Cambio de Fechas',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    icon: Calendar
  },
  cambio_estado: {
    label: 'Cambio de Estado',
    color: '#EC4899',
    bgColor: '#FCE7F3',
    icon: TrendingUp
  }
};

export function ModalHistorialCambios({
  isOpen,
  onClose,
  auditoria,
  ampliaciones = [],
  historial = []
}: ModalHistorialCambiosProps) {
  
  // Combinar ampliaciones con historial general
  const historialCompleto: HistorialCambio[] = [
    ...historial,
    ...ampliaciones.map((amp): HistorialCambio => ({
      id: amp.id,
      tipo: 'ampliacion',
      timestamp: amp.fechaAutorizacion,
      usuario: amp.usuarioAutorizo,
      descripcion: `Ampliación de ${amp.diasAmpliados} días en etapa de ${amp.etapaAfectada}`,
      datosAnteriores: { fecha: amp.fechaOriginal },
      datosNuevos: { fecha: amp.nuevaFechaLimite },
      etapaAfectada: amp.etapaAfectada
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const exportarHistorial = () => {
    // Preparar datos para CSV
    const csvRows: string[] = [];
    
    csvRows.push(`HISTORIAL DE CAMBIOS - ${auditoria.codigo}`);
    csvRows.push(`Proceso: ${auditoria.procesoAuditable}`);
    csvRows.push(`Fecha de exportación: ${new Date().toLocaleDateString('es-CO')}`);
    csvRows.push('');
    
    csvRows.push(['Fecha', 'Tipo', 'Usuario', 'Descripción', 'Etapa'].join(','));
    
    historialCompleto.forEach(cambio => {
      const fecha = new Date(cambio.timestamp).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      const tipo = TIPO_CAMBIO_CONFIG[cambio.tipo]?.label || cambio.tipo;
      
      csvRows.push([
        fecha,
        tipo,
        `"${cambio.usuario}"`,
        `"${cambio.descripcion}"`,
        cambio.etapaAfectada || 'N/A'
      ].join(','));
    });
    
    // Descargar
    const csvContent = csvRows.join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Historial_${auditoria.codigo}_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Historial exportado correctamente');
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Historial de Cambios - ${auditoria.codigo}`}
      subtitle={auditoria.procesoAuditable}
      icon={<History className="w-6 h-6" style={{ color: '#3B82F6' }} />}
      maxWidth="3xl"
      footer={
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full justify-between">
          <div className="text-sm" style={{ color: '#6B7280' }}>
            Total de registros: <strong>{historialCompleto.length}</strong>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportarHistorial}
            disabled={historialCompleto.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Historial
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Resumen de ampliaciones */}
        {ampliaciones.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: '#FEF3C7', borderLeft: '4px solid #F59E0B' }}>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5" style={{ color: '#F59E0B' }} />
              <h4 className="font-bold" style={{ color: '#92400E' }}>
                Resumen de Ampliaciones
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg p-3" style={{ background: '#FFFFFF' }}>
                <p style={{ color: '#6B7280' }}>Total Ampliaciones</p>
                <p className="text-xl font-black" style={{ color: '#F59E0B' }}>
                  {ampliaciones.length}
                </p>
              </div>
              <div className="rounded-lg p-3" style={{ background: '#FFFFFF' }}>
                <p style={{ color: '#6B7280' }}>Días Totales Ampliados</p>
                <p className="text-xl font-black" style={{ color: '#F59E0B' }}>
                  +{ampliaciones.reduce((sum, amp) => sum + amp.diasAmpliados, 0)}
                </p>
              </div>
              <div className="rounded-lg p-3" style={{ background: '#FFFFFF' }}>
                <p style={{ color: '#6B7280' }}>Última Ampliación</p>
                <p className="text-xs font-bold" style={{ color: '#1F2937' }}>
                  {new Date(ampliaciones[0]?.fechaAutorizacion || '').toLocaleDateString('es-CO')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Timeline de cambios */}
        <div className="space-y-3">
          <h4 className="font-bold text-sm" style={{ color: '#1F2937' }}>
            Línea de Tiempo de Cambios
          </h4>

          {historialCompleto.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-16 h-16 mx-auto mb-4" style={{ color: '#D1D5DB' }} />
              <p style={{ color: '#6B7280' }}>No hay cambios registrados en esta auditoría</p>
            </div>
          ) : (
            <div className="relative">
              {/* Línea vertical del timeline */}
              <div
                className="absolute left-4 sm:left-6 top-0 bottom-0 w-0.5"
                style={{ background: '#E5E7EB' }}
              />

              {/* Items del timeline */}
              <div className="space-y-4">
                {historialCompleto.map((cambio, index) => {
                  const config = TIPO_CAMBIO_CONFIG[cambio.tipo];
                  const IconComponent = config?.icon || FileText;

                  return (
                    <div key={cambio.id} className="relative pl-12 sm:pl-16">
                      {/* Icono en la línea de tiempo */}
                      <div
                        className="absolute left-0 sm:left-2 w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: config?.bgColor || '#F3F4F6' }}
                      >
                        <IconComponent className="w-4 h-4" style={{ color: config?.color || '#6B7280' }} />
                      </div>

                      {/* Contenido del cambio */}
                      <div
                        className="rounded-xl p-4 hover:shadow-md transition-all"
                        style={{ background: '#FFFFFF', border: `1px solid ${config?.color || '#E5E7EB'}` }}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              className="text-xs"
                              style={{
                                background: config?.bgColor || '#F3F4F6',
                                color: config?.color || '#6B7280'
                              }}
                            >
                              {config?.label || cambio.tipo}
                            </Badge>
                            {cambio.etapaAfectada && (
                              <Badge variant="outline" className="text-xs">
                                {cambio.etapaAfectada}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs" style={{ color: '#6B7280' }}>
                            {new Date(cambio.timestamp).toLocaleString('es-CO', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        <p className="text-sm mb-2" style={{ color: '#1F2937' }}>
                          {cambio.descripcion}
                        </p>

                        <div className="flex items-center gap-2 text-xs" style={{ color: '#6B7280' }}>
                          <User className="w-3 h-3" />
                          <span>Por: <strong>{cambio.usuario}</strong></span>
                        </div>

                        {/* Detalles de ampliación */}
                        {cambio.tipo === 'ampliacion' && cambio.datosAnteriores && cambio.datosNuevos && (
                          <div className="mt-3 grid grid-cols-2 gap-2 p-3 rounded-lg" style={{ background: '#F9FAFB' }}>
                            <div>
                              <p className="text-xs mb-1" style={{ color: '#6B7280' }}>Fecha anterior:</p>
                              <p className="text-sm font-bold" style={{ color: '#DC2626' }}>
                                {new Date(cambio.datosAnteriores.fecha).toLocaleDateString('es-CO')}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs mb-1" style={{ color: '#6B7280' }}>Nueva fecha:</p>
                              <p className="text-sm font-bold" style={{ color: '#10B981' }}>
                                {new Date(cambio.datosNuevos.fecha).toLocaleDateString('es-CO')}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Justificación de ampliación */}
                        {cambio.tipo === 'ampliacion' && ampliaciones.find(a => a.id === cambio.id)?.justificacion && (
                          <div className="mt-3 p-3 rounded-lg" style={{ background: '#FEF3C7' }}>
                            <p className="text-xs mb-1 font-bold" style={{ color: '#92400E' }}>
                              Justificación:
                            </p>
                            <p className="text-xs" style={{ color: '#92400E' }}>
                              {ampliaciones.find(a => a.id === cambio.id)?.justificacion}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </ResponsiveModal>
  );
}
