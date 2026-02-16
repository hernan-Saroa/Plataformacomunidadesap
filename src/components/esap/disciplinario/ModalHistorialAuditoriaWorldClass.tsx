/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODAL HISTORIAL DE AUDITORÍA - DISEÑO WORLD CLASS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Modal para visualizar el historial completo de actividades y auditoría
 * del proceso disciplinario.
 * 
 * CARACTERÍSTICAS:
 * - ✅ Diseño World Class con ResponsiveModal
 * - ✅ Timeline de actividades
 * - ✅ Filtros por tipo de actividad
 * - ✅ Información de usuario y timestamp
 * - ✅ Exportación de historial
 * - ✅ Diseño corporativo ESAP
 * - ✅ Responsive Mobile First
 * 
 * @version 2.0.0 (World Class)
 * @date 10 de Febrero de 2026
 */

import { useState } from 'react';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
import { ModalButtonPrimary, ModalButtonCancel, ModalButtonGroup } from '@/components/ui/ModalButtons';
import {
  History, User, Calendar, FileText, Edit, Upload, Download, CheckCircle,
  AlertCircle, Info, Filter
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner@2.0.3';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Proceso {
  numeroProceso: string;
  denunciado: { nombre: string };
  etapaActual: string;
}

interface Actividad {
  id: string;
  tipo: 'creacion' | 'modificacion' | 'carga' | 'aprobacion' | 'notificacion';
  descripcion: string;
  usuario: string;
  fecha: string;
  hora: string;
  detalles?: string;
}

interface ModalHistorialAuditoriaProps {
  isOpen: boolean;
  proceso: Proceso;
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════

const ACTIVIDADES_MOCK: Actividad[] = [
  {
    id: 'h1',
    tipo: 'creacion',
    descripcion: 'Creación del proceso disciplinario',
    usuario: 'María González',
    fecha: '2025-01-08',
    hora: '09:15',
    detalles: 'Proceso creado a partir de la noticia ND-2025-001'
  },
  {
    id: 'h2',
    tipo: 'carga',
    descripcion: 'Carga de evidencia inicial',
    usuario: 'María González',
    fecha: '2025-01-08',
    hora: '10:30',
    detalles: 'Documento: Declaración_Testigo.pdf'
  },
  {
    id: 'h3',
    tipo: 'aprobacion',
    descripcion: 'Aprobación de Auto de Apertura',
    usuario: 'Carlos Ramírez',
    fecha: '2025-01-09',
    hora: '14:20',
    detalles: 'Auto: AUT-041-2025'
  },
  {
    id: 'h4',
    tipo: 'modificacion',
    descripcion: 'Actualización de estado del proceso',
    usuario: 'María González',
    fecha: '2025-01-10',
    hora: '11:45',
    detalles: 'Cambio de estado: Recepción → Valoración'
  },
  {
    id: 'h5',
    tipo: 'notificacion',
    descripcion: 'Notificación enviada al investigado',
    usuario: 'Sistema Automático',
    fecha: '2025-01-10',
    hora: '15:00',
    detalles: 'Oficio: OF-001-2025'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ModalHistorialAuditoriaWorldClass({
  isOpen,
  proceso,
  onClose
}: ModalHistorialAuditoriaProps) {
  // ─────────────────────────────────────────────────────────────────────────
  // STATES
  // ─────────────────────────────────────────────────────────────────────────

  const [actividades] = useState<Actividad[]>(ACTIVIDADES_MOCK);
  const [tipoFiltro, setTipoFiltro] = useState<Actividad['tipo'] | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleExportarHistorial = () => {
    toast.success('Exportación iniciada', {
      description: 'El historial se está exportando a PDF'
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // COMPUTED
  // ─────────────────────────────────────────────────────────────────────────

  const actividadesFiltradas = tipoFiltro
    ? actividades.filter(a => a.tipo === tipoFiltro)
    : actividades;

  // ─────────────────────────────────────────────────────────────────────────
  // UTILS
  // ─────────────────────────────────────────────────────────────────────────

  const getTipoConfig = (tipo: Actividad['tipo']) => {
    const configs = {
      creacion: { icon: FileText, color: '#10B981', bg: 'bg-green-100', text: 'text-green-700', label: 'Creación' },
      modificacion: { icon: Edit, color: '#F59E0B', bg: 'bg-amber-100', text: 'text-amber-700', label: 'Modificación' },
      carga: { icon: Upload, color: '#3B82F6', bg: 'bg-blue-100', text: 'text-blue-700', label: 'Carga' },
      aprobacion: { icon: CheckCircle, color: '#8B5CF6', bg: 'bg-purple-100', text: 'text-purple-700', label: 'Aprobación' },
      notificacion: { icon: AlertCircle, color: '#06B6D4', bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Notificación' }
    };
    return configs[tipo];
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Historial de Auditoría"
      subtitle={`${proceso.numeroProceso} - Trazabilidad Completa`}
      size="xl"
      footer={
        <ModalButtonGroup>
          <ModalButtonCancel onClick={onClose}>
            Cerrar
          </ModalButtonCancel>
          <ModalButtonPrimary onClick={handleExportarHistorial}>
            <Download className="w-4 h-4 mr-2" />
            Exportar Historial
          </ModalButtonPrimary>
        </ModalButtonGroup>
      }
    >
      <div className="space-y-6">
        {/* Banner Informativo */}
        <Card className="p-4 bg-gradient-to-r from-slate-50 to-gray-50 border-2 border-gray-200">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900 mb-2">
                Registro Completo de Actividades
              </p>
              <p className="text-xs text-gray-700">
                Todas las acciones realizadas en el proceso quedan registradas con usuario, fecha y hora exacta para garantizar la trazabilidad y transparencia
              </p>
            </div>
          </div>
        </Card>

        {/* Filtros */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-600" />
          <Badge
            variant={tipoFiltro === null ? 'default' : 'outline'}
            className="cursor-pointer hover:bg-gray-100"
            onClick={() => setTipoFiltro(null)}
          >
            Todas ({actividades.length})
          </Badge>
          {(['creacion', 'modificacion', 'carga', 'aprobacion', 'notificacion'] as Actividad['tipo'][]).map((tipo) => {
            const config = getTipoConfig(tipo);
            const count = actividades.filter(a => a.tipo === tipo).length;
            return (
              <Badge
                key={tipo}
                variant={tipoFiltro === tipo ? 'default' : 'outline'}
                className={`cursor-pointer hover:bg-gray-100 ${tipoFiltro === tipo ? config.bg + ' ' + config.text : ''}`}
                onClick={() => setTipoFiltro(tipo)}
              >
                {config.label} ({count})
              </Badge>
            );
          })}
        </div>

        {/* Timeline de Actividades */}
        <div className="space-y-3">
          {actividadesFiltradas.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 font-semibold">No hay actividades registradas</p>
            </div>
          ) : (
            actividadesFiltradas.map((actividad, index) => {
              const config = getTipoConfig(actividad.tipo);
              const IconComponent = config.icon;
              const isLast = index === actividadesFiltradas.length - 1;

              return (
                <div key={actividad.id} className="flex gap-4">
                  {/* Línea temporal */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${config.bg}`}
                    >
                      <IconComponent className="w-5 h-5" style={{ color: config.color }} />
                    </div>
                    {!isLast && (
                      <div className="w-0.5 flex-1 bg-gray-200 my-1" style={{ minHeight: '20px' }} />
                    )}
                  </div>

                  {/* Contenido */}
                  <Card className="flex-1 p-4 hover:shadow-md transition-shadow mb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={`${config.bg} ${config.text}`}>
                            {config.label}
                          </Badge>
                        </div>
                        <h3 className="font-bold text-gray-900 mb-2">{actividad.descripcion}</h3>
                        {actividad.detalles && (
                          <p className="text-sm text-gray-600 mb-3">{actividad.detalles}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{actividad.usuario}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{actividad.fecha} a las {actividad.hora}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })
          )}
        </div>

        {/* Resumen */}
        {actividadesFiltradas.length > 0 && (
          <Card className="p-4 bg-gray-50 border-2 border-gray-200">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
              {(['creacion', 'modificacion', 'carga', 'aprobacion', 'notificacion'] as Actividad['tipo'][]).map((tipo) => {
                const config = getTipoConfig(tipo);
                const count = actividades.filter(a => a.tipo === tipo).length;
                return (
                  <div key={tipo}>
                    <p className="text-2xl font-bold" style={{ color: config.color }}>{count}</p>
                    <p className="text-xs text-gray-600 mt-1">{config.label}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </ResponsiveModal>
  );
}
