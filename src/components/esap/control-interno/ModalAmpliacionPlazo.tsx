/**
 * MODAL DE AMPLIACIÓN DE PLAZOS - RF003
 * Permite solicitar ampliaciones de etapas con validación de 1 año máximo
 * Solo accesible para Administrador y Jefe de Control Interno
 */

import { useState } from 'react';
import { Clock, AlertTriangle, Calendar, FileText, Save, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { ResponsiveModal } from '../shared/ResponsiveModal';
import { toast } from 'sonner@2.0.3';

export interface AmpliacionPlazo {
  id: string;
  auditoriaId: string;
  etapaAfectada: 'planeacion' | 'ejecucion' | 'comunicacion';
  fechaOriginal: string;
  nuevaFechaLimite: string;
  diasAmpliados: number;
  justificacion: string;
  usuarioAutorizo: string;
  fechaAutorizacion: string;
  estado: 'aprobada';
}

export interface AuditoriaProgramadaConAmpliaciones {
  id: string;
  codigo: string;
  procesoAuditable: string;
  fechaInicioOriginal?: string;
  fechas: {
    planeacion: { inicio: string; fin: string; duracionDias: number };
    ejecucion: { inicio: string; fin: string; duracionDias: number };
    comunicacion: { inicio: string; fin: string; duracionDias: number };
  };
  ampliaciones?: AmpliacionPlazo[];
}

interface ModalAmpliacionPlazoProps {
  isOpen: boolean;
  onClose: () => void;
  auditoria: AuditoriaProgramadaConAmpliaciones;
  usuarioActual: {
    nombre: string;
    rol: 'Admin' | 'Jefe' | 'Auditor' | 'Consulta';
  };
  onAprobar: (ampliacion: AmpliacionPlazo) => void;
}

const ETAPAS_LABELS = {
  planeacion: 'Planeación',
  ejecucion: 'Ejecución',
  comunicacion: 'Comunicación'
};

export function ModalAmpliacionPlazo({
  isOpen,
  onClose,
  auditoria,
  usuarioActual,
  onAprobar
}: ModalAmpliacionPlazoProps) {
  const [etapaSeleccionada, setEtapaSeleccionada] = useState<'planeacion' | 'ejecucion' | 'comunicacion'>('planeacion');
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [justificacion, setJustificacion] = useState('');

  // Validar que auditoria existe
  if (!auditoria) {
    return null;
  }

  // Validar permisos
  const tienePermiso = usuarioActual.rol === 'Admin' || usuarioActual.rol === 'Jefe';

  // Calcular fecha inicio original (si no existe, usar fecha inicio de planeación)
  const fechaInicioOriginal = auditoria.fechaInicioOriginal || auditoria.fechas?.planeacion?.inicio || '';

  // Obtener fecha actual de la etapa seleccionada
  const fechaActualEtapa = auditoria.fechas?.[etapaSeleccionada]?.fin || '';

  // Calcular días de diferencia
  const calcularDiasAmpliacin = () => {
    if (!nuevaFecha) return 0;
    const fechaActual = new Date(fechaActualEtapa);
    const fechaNueva = new Date(nuevaFecha);
    const diff = fechaNueva.getTime() - fechaActual.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Validar límite de 1 año desde inicio original
  const validarLimiteUnAño = () => {
    if (!nuevaFecha) return { valido: false, mensaje: 'Selecciona una fecha' };

    const inicio = new Date(fechaInicioOriginal);
    const nueva = new Date(nuevaFecha);
    const diffDias = (nueva.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDias > 365) {
      return {
        valido: false,
        mensaje: `Excede límite de 1 año. Días transcurridos: ${Math.ceil(diffDias)} (máximo 365)`
      };
    }

    if (nueva <= new Date(fechaActualEtapa)) {
      return {
        valido: false,
        mensaje: 'La nueva fecha debe ser posterior a la fecha actual de la etapa'
      };
    }

    return { valido: true, mensaje: 'Ampliación válida' };
  };

  const diasAmpliacion = calcularDiasAmpliacin();
  const validacion = validarLimiteUnAño();

  const handleAprobar = () => {
    // Validar permisos
    if (!tienePermiso) {
      toast.error('No tienes permisos para autorizar ampliaciones de plazo');
      return;
    }

    // Validar fecha
    if (!validacion.valido) {
      toast.error(validacion.mensaje);
      return;
    }

    // Validar justificación
    if (!justificacion || justificacion.trim().length < 20) {
      toast.error('Debes proporcionar una justificación de al menos 20 caracteres');
      return;
    }

    const ampliacion: AmpliacionPlazo = {
      id: `amp-${Date.now()}`,
      auditoriaId: auditoria.id,
      etapaAfectada: etapaSeleccionada,
      fechaOriginal: fechaActualEtapa,
      nuevaFechaLimite: nuevaFecha,
      diasAmpliados: diasAmpliacion,
      justificacion: justificacion.trim(),
      usuarioAutorizo: usuarioActual.nombre,
      fechaAutorizacion: new Date().toISOString(),
      estado: 'aprobada'
    };

    onAprobar(ampliacion);
    toast.success(`Ampliación aprobada: +${diasAmpliacion} días en ${ETAPAS_LABELS[etapaSeleccionada]}`);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setEtapaSeleccionada('planeacion');
    setNuevaFecha('');
    setJustificacion('');
  };

  // Si no tiene permiso, mostrar mensaje
  if (!tienePermiso) {
    return (
      <ResponsiveModal
        isOpen={isOpen}
        onClose={onClose}
        title="Ampliación de Plazo"
        icon={<Clock className="w-6 h-6" style={{ color: '#F97316' }} />}
        maxWidth="lg"
      >
        <div className="text-center py-8">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4" style={{ color: '#DC2626' }} />
          <h3 className="text-lg font-bold mb-2" style={{ color: '#1F2937' }}>
            Acceso Restringido
          </h3>
          <p style={{ color: '#6B7280' }}>
            Solo los usuarios con rol de <strong>Administrador</strong> o <strong>Jefe de Control Interno</strong> pueden autorizar ampliaciones de plazo.
          </p>
          <p className="text-sm mt-2" style={{ color: '#6B7280' }}>
            Tu rol actual: <Badge>{usuarioActual.rol}</Badge>
          </p>
        </div>
      </ResponsiveModal>
    );
  }

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Ampliación de Plazo - ${auditoria.codigo}`}
      subtitle={auditoria.procesoAuditable}
      icon={<Clock className="w-6 h-6" style={{ color: '#F97316' }} />}
      maxWidth="2xl"
      footer={
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              resetForm();
            }}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleAprobar}
            disabled={!validacion.valido || !justificacion || justificacion.length < 20}
            className="flex-1"
            style={{ background: validacion.valido ? '#10B981' : '#9CA3AF', color: '#FFFFFF' }}
          >
            <Save className="w-4 h-4 mr-2" />
            Aprobar Ampliación
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Información de la auditoría */}
        <div className="rounded-xl p-4" style={{ background: '#F3F4F6', borderLeft: '4px solid #003DA5' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span style={{ color: '#6B7280' }}>Fecha Inicio Original:</span>
              <p className="font-bold" style={{ color: '#1F2937' }}>
                {new Date(fechaInicioOriginal).toLocaleDateString('es-CO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Código de Auditoría:</span>
              <p className="font-bold" style={{ color: '#1F2937' }}>{auditoria.codigo}</p>
            </div>
          </div>
        </div>

        {/* Alerta de límite */}
        <div className="rounded-xl p-4" style={{ background: '#FEF3C7', borderLeft: '4px solid #F59E0B' }}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#F59E0B' }} />
            <div>
              <h4 className="font-bold mb-1" style={{ color: '#92400E' }}>
                Límite de Ampliación
              </h4>
              <p className="text-sm" style={{ color: '#92400E' }}>
                Las auditorías solo pueden ampliarse hasta un máximo de <strong>1 año (365 días)</strong> desde la fecha de inicio original. La ampliación se aplica a etapas individuales, no a fechas absolutas.
              </p>
            </div>
          </div>
        </div>

        {/* Selector de etapa */}
        <div>
          <label className="block mb-2 font-bold text-sm" style={{ color: '#1F2937' }}>
            Etapa a Ampliar *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['planeacion', 'ejecucion', 'comunicacion'] as const).map((etapa) => {
              const fechaEtapa = auditoria.fechas[etapa];
              const isSelected = etapaSeleccionada === etapa;

              return (
                <button
                  key={etapa}
                  onClick={() => setEtapaSeleccionada(etapa)}
                  className="p-4 rounded-xl border-2 text-left transition-all hover:shadow-md"
                  style={{
                    background: isSelected ? '#EFF6FF' : '#FFFFFF',
                    borderColor: isSelected ? '#003DA5' : '#E5E7EB'
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm" style={{ color: isSelected ? '#003DA5' : '#1F2937' }}>
                      {ETAPAS_LABELS[etapa]}
                    </span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#003DA5' }}>
                        <div className="w-2 h-2 rounded-full" style={{ background: '#FFFFFF' }} />
                      </div>
                    )}
                  </div>
                  <div className="text-xs space-y-1" style={{ color: '#6B7280' }}>
                    <p>Inicio: {new Date(fechaEtapa.inicio).toLocaleDateString('es-CO')}</p>
                    <p>Fin actual: <strong>{new Date(fechaEtapa.fin).toLocaleDateString('es-CO')}</strong></p>
                    <p>Duración: {fechaEtapa.duracionDias} días</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Nueva fecha límite */}
        <div>
          <label className="block mb-2 font-bold text-sm" style={{ color: '#1F2937' }}>
            Nueva Fecha Límite *
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
            <input
              type="date"
              value={nuevaFecha}
              onChange={(e) => setNuevaFecha(e.target.value)}
              min={fechaActualEtapa}
              className="w-full pl-11 pr-4 py-3 border-2 rounded-xl text-sm"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>

          {/* Indicador de días ampliados */}
          {nuevaFecha && (
            <div className="mt-3 flex items-center justify-between p-3 rounded-lg" style={{ background: diasAmpliacion > 0 ? '#F3F4F6' : '#FEE2E2' }}>
              <span className="text-sm" style={{ color: '#6B7280' }}>Días de ampliación:</span>
              <Badge
                className="text-base"
                style={{
                  background: diasAmpliacion > 0 ? '#10B981' : '#DC2626',
                  color: '#FFFFFF'
                }}
              >
                +{diasAmpliacion} días
              </Badge>
            </div>
          )}

          {/* Validación */}
          {nuevaFecha && (
            <div className={`mt-2 p-3 rounded-lg flex items-start gap-2 ${validacion.valido ? 'bg-green-50' : 'bg-red-50'}`}>
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${validacion.valido ? 'text-green-600' : 'text-red-600'}`} />
              <p className={`text-sm ${validacion.valido ? 'text-green-800' : 'text-red-800'}`}>
                {validacion.mensaje}
              </p>
            </div>
          )}
        </div>

        {/* Justificación */}
        <div>
          <label className="block mb-2 font-bold text-sm" style={{ color: '#1F2937' }}>
            Justificación de la Ampliación * <span className="font-normal" style={{ color: '#6B7280' }}>(mínimo 20 caracteres)</span>
          </label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 w-5 h-5" style={{ color: '#9CA3AF' }} />
            <textarea
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
              rows={4}
              placeholder="Describe detalladamente los motivos que justifican la ampliación del plazo de esta etapa..."
              className="w-full pl-11 pr-4 py-3 border-2 rounded-xl text-sm resize-none"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs" style={{ color: justificacion.length < 20 ? '#DC2626' : '#10B981' }}>
              {justificacion.length} / 20 caracteres mínimo
            </span>
            {justificacion.length >= 20 && (
              <Badge style={{ background: '#10B98120', color: '#10B981' }}>
                Justificación válida
              </Badge>
            )}
          </div>
        </div>

        {/* Información del autorizador */}
        <div className="rounded-xl p-4" style={{ background: '#EFF6FF', borderLeft: '4px solid #3B82F6' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#003DA5', color: '#FFFFFF' }}>
              {usuarioActual.nombre.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: '#1F2937' }}>Autorizado por:</p>
              <p className="text-sm" style={{ color: '#6B7280' }}>{usuarioActual.nombre} ({usuarioActual.rol})</p>
            </div>
          </div>
        </div>
      </div>
    </ResponsiveModal>
  );
}