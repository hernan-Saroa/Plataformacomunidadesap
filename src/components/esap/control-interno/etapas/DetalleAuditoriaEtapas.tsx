/**
 * DETALLE DE AUDITORÍA CON 3 ETAPAS
 * Vista completa del ciclo de auditoría: Planeación → Ejecución → Comunicación
 * RF005, RF006, RF009
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, FileText, ClipboardCheck, MessageSquare, CheckCircle2,
  Calendar, User, MapPin, Clock, AlertCircle, Download, Eye, Plus,
  ChevronRight, CheckCircle
} from 'lucide-react';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { PlaneacionForm } from './PlaneacionForm';
import { EjecucionForm } from './EjecucionForm';
import { ComunicacionForm } from './ComunicacionForm';

interface Auditoria {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  territorial: string;
  sede: string;
  responsable: string;
  fechaInicio: string;
  fechaFin: string;
  estado: string;
}

interface Etapa {
  id: 'planeacion' | 'ejecucion' | 'comunicacion';
  nombre: string;
  estado: 'pendiente' | 'en-progreso' | 'completada';
  porcentajeAvance: number;
  fechaInicio?: string;
  fechaFin?: string;
  color: string;
  icono: any;
}

interface DetalleAuditoriaEtapasProps {
  auditoria: Auditoria;
  onVolver: () => void;
}

export function DetalleAuditoriaEtapas({ auditoria, onVolver }: DetalleAuditoriaEtapasProps) {
  const [etapaActiva, setEtapaActiva] = useState<'planeacion' | 'ejecucion' | 'comunicacion' | null>(null);

  const [etapas, setEtapas] = useState<Etapa[]>([
    {
      id: 'planeacion',
      nombre: 'Planeación',
      estado: 'completada',
      porcentajeAvance: 100,
      fechaInicio: '2024-11-15',
      fechaFin: '2024-11-30',
      color: '#3B82F6',
      icono: FileText
    },
    {
      id: 'ejecucion',
      nombre: 'Ejecución',
      estado: 'en-progreso',
      porcentajeAvance: 65,
      fechaInicio: '2024-12-01',
      fechaFin: '2024-12-20',
      color: '#F59E0B',
      icono: ClipboardCheck
    },
    {
      id: 'comunicacion',
      nombre: 'Comunicación',
      estado: 'pendiente',
      porcentajeAvance: 0,
      color: '#10B981',
      icono: MessageSquare
    }
  ]);

  const getEstadoEtapaColor = (estado: string) => {
    switch (estado) {
      case 'completada': return '#10B981';
      case 'en-progreso': return '#3B82F6';
      case 'pendiente': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getEstadoEtapaLabel = (estado: string) => {
    switch (estado) {
      case 'completada': return 'Completada';
      case 'en-progreso': return 'En Progreso';
      case 'pendiente': return 'Pendiente';
      default: return estado;
    }
  };

  const handleVolverALista = () => {
    setEtapaActiva(null);
  };

  // Si hay una etapa seleccionada, renderizarla
  if (etapaActiva) {
    const etapaData = etapas.find(e => e.id === etapaActiva);
    
    return (
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7280' }}>
          <button onClick={onVolver} className="hover:underline">
            Auditorías
          </button>
          <ChevronRight className="w-4 h-4" />
          <button onClick={handleVolverALista} className="hover:underline">
            {auditoria.codigo}
          </button>
          <ChevronRight className="w-4 h-4" />
          <span style={{ color: '#1F2937' }}>{etapaData?.nombre}</span>
        </div>

        {/* Renderizar componente de etapa */}
        {etapaActiva === 'planeacion' && (
          <PlaneacionForm 
            auditoria={auditoria} 
            onVolver={handleVolverALista}
          />
        )}
        {etapaActiva === 'ejecucion' && (
          <EjecucionForm 
            auditoria={auditoria} 
            onVolver={handleVolverALista}
          />
        )}
        {etapaActiva === 'comunicacion' && (
          <ComunicacionForm 
            auditoria={auditoria} 
            onVolver={handleVolverALista}
          />
        )}
      </div>
    );
  }

  // Vista principal con las 3 etapas
  return (
    <div className="space-y-6">
      {/* HEADER CON BOTÓN VOLVER */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onVolver}
          className="border-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Lista
        </Button>
      </div>

      {/* INFO DE LA AUDITORÍA */}
      <motion.div
        className="p-6 rounded-2xl border-2"
        style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-black" style={{ color: '#1F2937' }}>
                {auditoria.codigo}
              </h2>
              <Badge style={{ background: '#F0FDF4', color: '#10B981' }}>
                {auditoria.tipo}
              </Badge>
            </div>
            <h3 className="text-lg mb-4" style={{ color: '#4B5563' }}>
              {auditoria.nombre}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7280' }}>
                <User className="w-4 h-4" />
                <div>
                  <div className="text-xs" style={{ color: '#9CA3AF' }}>Responsable</div>
                  <div style={{ color: '#1F2937' }}>{auditoria.responsable}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7280' }}>
                <MapPin className="w-4 h-4" />
                <div>
                  <div className="text-xs" style={{ color: '#9CA3AF' }}>Territorial</div>
                  <div style={{ color: '#1F2937' }}>{auditoria.territorial}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7280' }}>
                <Calendar className="w-4 h-4" />
                <div>
                  <div className="text-xs" style={{ color: '#9CA3AF' }}>Fecha Inicio</div>
                  <div style={{ color: '#1F2937' }}>
                    {new Date(auditoria.fechaInicio).toLocaleDateString('es-CO')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7280' }}>
                <Clock className="w-4 h-4" />
                <div>
                  <div className="text-xs" style={{ color: '#9CA3AF' }}>Fecha Fin</div>
                  <div style={{ color: '#1F2937' }}>
                    {new Date(auditoria.fechaFin).toLocaleDateString('es-CO')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="border-2"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>

        {/* Barra de progreso general */}
        <div className="mt-6 pt-6 border-t-2" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center justify-between mb-2 text-sm">
            <span style={{ color: '#6B7280' }}>Progreso General de la Auditoría</span>
            <span className="font-bold" style={{ color: '#F97316' }}>
              {Math.round(etapas.reduce((sum, e) => sum + e.porcentajeAvance, 0) / etapas.length)}%
            </span>
          </div>
          <div className="h-3 rounded-full" style={{ background: '#E5E7EB' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                background: '#F97316',
                width: `${Math.round(etapas.reduce((sum, e) => sum + e.porcentajeAvance, 0) / etapas.length)}%`
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* TÍTULO DE ETAPAS */}
      <div>
        <h3 className="text-lg font-black mb-2" style={{ color: '#1F2937' }}>
          Etapas del Proceso de Auditoría
        </h3>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          Selecciona una etapa para gestionarla
        </p>
      </div>

      {/* LAS 3 ETAPAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {etapas.map((etapa, index) => {
          const Icono = etapa.icono;
          const puedeAcceder = index === 0 || etapas[index - 1].estado === 'completada';

          return (
            <motion.div
              key={etapa.id}
              className="relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <button
                onClick={() => puedeAcceder && setEtapaActiva(etapa.id)}
                disabled={!puedeAcceder}
                className={`w-full p-6 rounded-2xl border-2 text-left transition-all ${
                  puedeAcceder ? 'hover:shadow-lg hover:scale-105 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                }`}
                style={{
                  background: '#FFFFFF',
                  borderColor: etapa.estado === 'en-progreso' ? etapa.color : '#E5E7EB'
                }}
              >
                {/* Número de etapa */}
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center font-black text-white"
                  style={{ background: etapa.color }}
                >
                  {index + 1}
                </div>

                {/* Icono y nombre */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl" style={{ background: `${etapa.color}20` }}>
                    <Icono className="w-6 h-6" style={{ color: etapa.color }} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black mb-1" style={{ color: '#1F2937' }}>
                      {etapa.nombre}
                    </h4>
                    <Badge
                      style={{
                        background: `${getEstadoEtapaColor(etapa.estado)}20`,
                        color: getEstadoEtapaColor(etapa.estado)
                      }}
                    >
                      {getEstadoEtapaLabel(etapa.estado)}
                    </Badge>
                  </div>
                </div>

                {/* Fechas */}
                {etapa.fechaInicio && (
                  <div className="mb-3 text-xs" style={{ color: '#6B7280' }}>
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {new Date(etapa.fechaInicio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                    {etapa.fechaFin && (
                      <>
                        {' - '}
                        {new Date(etapa.fechaFin).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                      </>
                    )}
                  </div>
                )}

                {/* Progreso */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: '#6B7280' }}>Progreso</span>
                    <span className="font-bold" style={{ color: etapa.color }}>
                      {etapa.porcentajeAvance}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: '#E5E7EB' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        background: etapa.color,
                        width: `${etapa.porcentajeAvance}%`
                      }}
                    />
                  </div>
                </div>

                {/* Indicador de completado */}
                {etapa.estado === 'completada' && (
                  <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: '#10B981' }}>
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-semibold">Etapa Completada</span>
                  </div>
                )}

                {/* Indicador de bloqueado */}
                {!puedeAcceder && (
                  <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: '#6B7280' }}>
                    <AlertCircle className="w-4 h-4" />
                    <span>Completa la etapa anterior primero</span>
                  </div>
                )}
              </button>

              {/* Flecha entre etapas */}
              {index < etapas.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <ChevronRight className="w-8 h-8" style={{ color: '#D1D5DB' }} />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* INFORMACIÓN ADICIONAL */}
      <motion.div
        className="p-6 rounded-2xl border-2"
        style={{ background: '#FEF3C7', borderColor: '#FCD34D' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
          <div>
            <h4 className="font-bold mb-1" style={{ color: '#92400E' }}>
              Proceso Secuencial
            </h4>
            <p className="text-sm" style={{ color: '#78350F' }}>
              Las etapas deben completarse de forma secuencial. No puedes avanzar a la siguiente etapa
              hasta que la anterior esté completada al 100%.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
