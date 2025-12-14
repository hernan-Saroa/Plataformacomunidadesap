/**
 * APROBACIONES PENDIENTES - Lista Priorizada con Acciones Directas
 * Gestión centralizada de aprobaciones sin navegación redundante
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle, Clock, AlertCircle, TrendingUp, Search,
  Filter, Download, Check, X, Eye, FileText, User, Calendar
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';

type TipoAprobacion = 'plan-auditoria' | 'informe' | 'plan-mejora';

interface Aprobacion {
  id: string;
  tipo: TipoAprobacion;
  titulo: string;
  descripcion: string;
  solicitante: string;
  fechaSolicitud: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
  territorial: string;
  sede: string;
  relacionado: string;
  documentos: number;
}

const MOCK_APROBACIONES: Aprobacion[] = [
  {
    id: '1',
    tipo: 'plan-auditoria',
    titulo: 'Plan Anual de Auditorías 2025',
    descripcion: 'Plan de auditorías para el año fiscal 2025 con alcance nacional',
    solicitante: 'María González',
    fechaSolicitud: '2024-11-25',
    prioridad: 'Alta',
    territorial: 'Nacional',
    sede: 'Bogotá - Sede Central',
    relacionado: 'PLAN-2025-001',
    documentos: 3
  },
  {
    id: '2',
    tipo: 'informe',
    titulo: 'Informe Final - Auditoría Financiera',
    descripcion: 'Informe final de auditoría de gestión financiera Q3 2024',
    solicitante: 'Carlos Ramírez',
    fechaSolicitud: '2024-11-27',
    prioridad: 'Alta',
    territorial: 'Cundinamarca',
    sede: 'Bogotá - Sede Central',
    relacionado: 'AUD-2024-001',
    documentos: 5
  },
  {
    id: '3',
    tipo: 'plan-mejora',
    titulo: 'Plan de Mejora - Controles de Activos',
    descripcion: 'Plan de acción para mejorar controles de activos fijos',
    solicitante: 'Ana Martínez',
    fechaSolicitud: '2024-11-28',
    prioridad: 'Media',
    territorial: 'Valle del Cauca',
    sede: 'Cali',
    relacionado: 'HAL-2024-003',
    documentos: 2
  }
];

export function AprobacionesPendientes() {
  const [aprobaciones, setAprobaciones] = useState<Aprobacion[]>(MOCK_APROBACIONES);
  const [aprobacionSeleccionada, setAprobacionSeleccionada] = useState<Aprobacion | null>(null);
  const [modalDetalles, setModalDetalles] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // Métricas calculadas
  const totalPendientes = aprobaciones.length;
  const altaPrioridad = aprobaciones.filter(a => a.prioridad === 'Alta').length;
  const vencenHoy = 2; // Mock
  const aprobacionesHoy = 5; // Mock

  const handleAprobar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Lógica de aprobación
    console.log('Aprobar:', id);
  };

  const handleRechazar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Lógica de rechazo
    console.log('Rechazar:', id);
  };

  const handleVerDetalles = (aprobacion: Aprobacion) => {
    setAprobacionSeleccionada(aprobacion);
    setModalDetalles(true);
  };

  const getTipoLabel = (tipo: TipoAprobacion) => {
    switch (tipo) {
      case 'plan-auditoria': return 'Plan de Auditoría';
      case 'informe': return 'Informe';
      case 'plan-mejora': return 'Plan de Mejora';
      default: return tipo;
    }
  };

  const getTipoColor = (tipo: TipoAprobacion) => {
    switch (tipo) {
      case 'plan-auditoria': return '#3B82F6';
      case 'informe': return '#8B5CF6';
      case 'plan-mejora': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'Alta': return '#EF4444';
      case 'Media': return '#F59E0B';
      case 'Baja': return '#10B981';
      default: return '#6B7280';
    }
  };

  return (
    <div className="space-y-6">
      {/* MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          className="p-6 rounded-2xl border-2"
          style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
          whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm mb-2" style={{ color: '#6B7280' }}>Pendientes</p>
              <h3 className="text-3xl font-black" style={{ color: '#1F2937' }}>{totalPendientes}</h3>
              <p className="text-xs mt-2" style={{ color: '#F59E0B' }}>
                <Clock className="w-3 h-3 inline mr-1" />
                Requieren acción
              </p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: '#FFF7ED' }}>
              <CheckCircle className="w-6 h-6" style={{ color: '#F97316' }} />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="p-6 rounded-2xl border-2"
          style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
          whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm mb-2" style={{ color: '#6B7280' }}>Alta Prioridad</p>
              <h3 className="text-3xl font-black" style={{ color: '#EF4444' }}>{altaPrioridad}</h3>
              <p className="text-xs mt-2" style={{ color: '#EF4444' }}>
                <AlertCircle className="w-3 h-3 inline mr-1" />
                Urgentes
              </p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: '#FEE2E2' }}>
              <AlertCircle className="w-6 h-6" style={{ color: '#EF4444' }} />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="p-6 rounded-2xl border-2"
          style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
          whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm mb-2" style={{ color: '#6B7280' }}>Vencen Hoy</p>
              <h3 className="text-3xl font-black" style={{ color: '#F59E0B' }}>{vencenHoy}</h3>
              <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                <Clock className="w-3 h-3 inline mr-1" />
                Atención inmediata
              </p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: '#FEF3C7' }}>
              <Clock className="w-6 h-6" style={{ color: '#F59E0B' }} />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="p-6 rounded-2xl border-2"
          style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
          whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm mb-2" style={{ color: '#6B7280' }}>Aprobadas Hoy</p>
              <h3 className="text-3xl font-black" style={{ color: '#10B981' }}>{aprobacionesHoy}</h3>
              <p className="text-xs mt-2" style={{ color: '#10B981' }}>
                <TrendingUp className="w-3 h-3 inline mr-1" />
                Procesadas
              </p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: '#F0FDF4' }}>
              <CheckCircle className="w-6 h-6" style={{ color: '#10B981' }} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* BARRA DE HERRAMIENTAS */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between p-4 rounded-2xl border-2" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
        {/* Búsqueda */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Buscar por título, solicitante, territorial..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border-2 outline-none transition-colors"
            style={{ borderColor: '#E5E7EB' }}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {/* Controles */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="border-2">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>

          <Button variant="outline" size="sm" className="border-2">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* LISTA DE APROBACIONES */}
      <div className="space-y-4">
        {aprobaciones.map((aprobacion) => (
          <motion.div
            key={aprobacion.id}
            className="p-6 rounded-2xl border-2 hover:shadow-lg transition-all cursor-pointer"
            style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
            whileHover={{ y: -2 }}
            onClick={() => handleVerDetalles(aprobacion)}
          >
            <div className="flex items-start gap-4">
              {/* Icono del tipo */}
              <div className="p-3 rounded-xl flex-shrink-0" style={{ background: `${getTipoColor(aprobacion.tipo)}20` }}>
                <FileText className="w-6 h-6" style={{ color: getTipoColor(aprobacion.tipo) }} />
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge style={{ background: getTipoColor(aprobacion.tipo), color: '#FFFFFF' }}>
                        {getTipoLabel(aprobacion.tipo)}
                      </Badge>
                      <Badge style={{ background: getPrioridadColor(aprobacion.prioridad), color: '#FFFFFF' }}>
                        {aprobacion.prioridad}
                      </Badge>
                      <span className="text-xs" style={{ color: '#6B7280' }}>{aprobacion.relacionado}</span>
                    </div>
                    <h3 className="font-black text-lg mb-2" style={{ color: '#1F2937' }}>
                      {aprobacion.titulo}
                    </h3>
                    <p className="text-sm mb-3" style={{ color: '#6B7280' }}>
                      {aprobacion.descripcion}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" style={{ color: '#6B7280' }} />
                    <div>
                      <p className="text-xs" style={{ color: '#6B7280' }}>Solicitante</p>
                      <p className="font-bold text-sm" style={{ color: '#1F2937' }}>{aprobacion.solicitante}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" style={{ color: '#6B7280' }} />
                    <div>
                      <p className="text-xs" style={{ color: '#6B7280' }}>Fecha Solicitud</p>
                      <p className="font-bold text-sm" style={{ color: '#1F2937' }}>
                        {new Date(aprobacion.fechaSolicitud).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: '#6B7280' }}>Territorial</p>
                    <p className="font-bold text-sm" style={{ color: '#1F2937' }}>{aprobacion.territorial}</p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: '#6B7280' }}>Documentos</p>
                    <p className="font-bold text-sm" style={{ color: '#1F2937' }}>{aprobacion.documentos} archivos</p>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-3 pt-4 border-t-2" style={{ borderColor: '#E5E7EB' }}>
                  <Button 
                    size="sm" 
                    style={{ background: '#10B981', color: '#FFFFFF' }}
                    onClick={(e) => handleAprobar(aprobacion.id, e)}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Aprobar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-2"
                    style={{ borderColor: '#EF4444', color: '#EF4444' }}
                    onClick={(e) => handleRechazar(aprobacion.id, e)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Rechazar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-2"
                    onClick={(e) => { e.stopPropagation(); handleVerDetalles(aprobacion); }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Detalles
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-2"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* MODAL DE DETALLES */}
      <Dialog open={modalDetalles} onOpenChange={setModalDetalles}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: aprobacionSeleccionada ? `${getTipoColor(aprobacionSeleccionada.tipo)}20` : '#F9FAFB' }}>
                <FileText className="w-6 h-6" style={{ color: aprobacionSeleccionada ? getTipoColor(aprobacionSeleccionada.tipo) : '#6B7280' }} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-black" style={{ color: '#1F2937' }}>
                  {aprobacionSeleccionada?.titulo}
                </h3>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  {aprobacionSeleccionada?.relacionado}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {aprobacionSeleccionada && (
            <div className="space-y-6">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge style={{ background: getTipoColor(aprobacionSeleccionada.tipo), color: '#FFFFFF' }}>
                  {getTipoLabel(aprobacionSeleccionada.tipo)}
                </Badge>
                <Badge style={{ background: getPrioridadColor(aprobacionSeleccionada.prioridad), color: '#FFFFFF' }}>
                  Prioridad {aprobacionSeleccionada.prioridad}
                </Badge>
              </div>

              {/* Descripción */}
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: '#6B7280' }}>Descripción</label>
                <p style={{ color: '#1F2937' }}>{aprobacionSeleccionada.descripcion}</p>
              </div>

              {/* Información */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold mb-1 block" style={{ color: '#6B7280' }}>Solicitante</label>
                  <p className="font-bold" style={{ color: '#1F2937' }}>{aprobacionSeleccionada.solicitante}</p>
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block" style={{ color: '#6B7280' }}>Fecha Solicitud</label>
                  <p className="font-bold" style={{ color: '#1F2937' }}>
                    {new Date(aprobacionSeleccionada.fechaSolicitud).toLocaleDateString('es-CO')}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block" style={{ color: '#6B7280' }}>Territorial</label>
                  <p className="font-bold" style={{ color: '#1F2937' }}>{aprobacionSeleccionada.territorial}</p>
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block" style={{ color: '#6B7280' }}>Sede</label>
                  <p className="font-bold" style={{ color: '#1F2937' }}>{aprobacionSeleccionada.sede}</p>
                </div>
              </div>

              {/* Documentos adjuntos */}
              <div className="p-4 rounded-xl" style={{ background: '#F9FAFB' }}>
                <label className="text-xs font-bold mb-3 block" style={{ color: '#6B7280' }}>
                  Documentos Adjuntos ({aprobacionSeleccionada.documentos})
                </label>
                <div className="space-y-2">
                  {Array.from({ length: aprobacionSeleccionada.documentos }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border-2" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5" style={{ color: '#F97316' }} />
                        <div>
                          <p className="font-bold text-sm" style={{ color: '#1F2937' }}>
                            Documento_{i + 1}.pdf
                          </p>
                          <p className="text-xs" style={{ color: '#6B7280' }}>2.5 MB</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-3">
                <Button 
                  className="flex-1" 
                  style={{ background: '#10B981', color: '#FFFFFF' }}
                  onClick={() => {
                    handleAprobar(aprobacionSeleccionada.id, {} as React.MouseEvent);
                    setModalDetalles(false);
                  }}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Aprobar
                </Button>
                <Button 
                  className="flex-1"
                  variant="outline"
                  className="border-2"
                  style={{ borderColor: '#EF4444', color: '#EF4444' }}
                  onClick={() => {
                    handleRechazar(aprobacionSeleccionada.id, {} as React.MouseEvent);
                    setModalDetalles(false);
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}