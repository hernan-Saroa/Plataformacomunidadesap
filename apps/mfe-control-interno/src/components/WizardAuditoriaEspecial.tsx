/**
 * ============================================
 * RF018: WIZARD AUDITORÍA ESPECIAL (AD-HOC)
 * ============================================
 * 
 * Wizard rápido para creación de auditorías especiales
 * no programadas con workflow de aprobación acelerado
 * 
 * CARACTERÍSTICAS:
 * - Creación en 3 pasos (vs 5 pasos de auditoria regular)
 * - Workflow de aprobación simplificado
 * - Priorización automática según tipo
 * - Asignación rápida de equipo
 * - Justificación obligatoria
 * 
 * TIPOS:
 * 1. Denuncia / Irregularidad
 * 2. Solicitud Ente de Control
 * 3. Auditoría de Emergencia
 * 4. Seguimiento Urgente
 * 5. Revisión Específica
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Diciembre 2025
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle, Zap, FileWarning, Shield, Flag,
  Users, Calendar, Target, X, ArrowRight, ArrowLeft,
  CheckCircle, Clock, Building2, AlertCircle, Info,
  Check, Upload, FileText
} from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { toast } from 'sonner';

// ============ TIPOS ============

type TipoAuditoriaEspecial = 
  | 'denuncia'
  | 'ente_control'
  | 'emergencia'
  | 'seguimiento_urgente'
  | 'revision_especifica';

type Prioridad = 'critica' | 'alta' | 'media' | 'baja';

interface ConfigTipoAuditoria {
  id: TipoAuditoriaEspecial;
  label: string;
  descripcion: string;
  icon: React.ElementType;
  prioridadDefault: Prioridad;
  color: string;
  plazoMaximo: number; // días
  requiereAprobacion: boolean;
}

interface FormDataEspecial {
  // Paso 1: Tipo y Clasificación
  tipo: TipoAuditoriaEspecial | '';
  prioridad: Prioridad;
  
  // Paso 2: Información Básica
  titulo: string;
  descripcion: string;
  justificacion: string;
  areaObjetivo: string;
  solicitante: string;
  
  // Paso 3: Equipo y Fechas
  liderAsignado: string;
  equipoAsignado: string[];
  fechaInicioEstimada: string;
  duracionEstimada: number; // días
  
  // Documentos
  documentosAdjuntos: File[];
}

interface WizardProps {
  onClose: () => void;
  onSubmit: (data: FormDataEspecial) => void;
}

// ============ CONFIGURACIÓN DE TIPOS ============

const TIPOS_AUDITORIA_ESPECIAL: ConfigTipoAuditoria[] = [
  {
    id: 'denuncia',
    label: 'Denuncia / Irregularidad',
    descripcion: 'Auditoría iniciada por denuncia anónima o reporte de irregularidades',
    icon: AlertTriangle,
    prioridadDefault: 'critica',
    color: '#DC2626',
    plazoMaximo: 15,
    requiereAprobacion: false // Aprobación automática
  },
  {
    id: 'ente_control',
    label: 'Solicitud Ente de Control',
    descripcion: 'Requerimiento de Contraloría, Procuraduría u otro ente de control',
    icon: Shield,
    prioridadDefault: 'alta',
    color: '#EA580C',
    plazoMaximo: 30,
    requiereAprobacion: false // Aprobación automática
  },
  {
    id: 'emergencia',
    label: 'Auditoría de Emergencia',
    descripcion: 'Situación crítica que requiere atención inmediata',
    icon: Zap,
    prioridadDefault: 'critica',
    color: '#DC2626',
    plazoMaximo: 5,
    requiereAprobacion: false // Aprobación automática
  },
  {
    id: 'seguimiento_urgente',
    label: 'Seguimiento Urgente',
    descripcion: 'Seguimiento acelerado a planes de mejoramiento o hallazgos críticos',
    icon: Flag,
    prioridadDefault: 'alta',
    color: '#F59E0B',
    plazoMaximo: 10,
    requiereAprobacion: true
  },
  {
    id: 'revision_especifica',
    label: 'Revisión Específica',
    descripcion: 'Auditoría puntual sobre un tema o proceso específico',
    icon: Target,
    prioridadDefault: 'media',
    color: '#3B82F6',
    plazoMaximo: 20,
    requiereAprobacion: true
  }
];

// ============ DATOS MOCK ============

const AUDITORES_DISPONIBLES = [
  'Fernando Ávila García',
  'Lucila Villamil Pérez',
  'Natalia Cañón Ruiz',
  'Catalina Rubio Sánchez',
  'Jorge Alberto Mendoza'
];

const AREAS_DISPONIBLES = [
  'Dirección Administrativa',
  'Dirección Financiera',
  'Dirección de Talento Humano',
  'Dirección de Tecnología',
  'Vicerrectoría Académica',
  'Territoriales (Todas)',
  'Oficina de Planeación',
  'Oficina Jurídica',
  'Secretaría General'
];

// ============ COMPONENTE PRINCIPAL ============

export function WizardAuditoriaEspecial({ onClose, onSubmit }: WizardProps) {
  const [paso, setPaso] = useState(1);
  const [formData, setFormData] = useState<FormDataEspecial>({
    tipo: '',
    prioridad: 'media',
    titulo: '',
    descripcion: '',
    justificacion: '',
    areaObjetivo: '',
    solicitante: '',
    liderAsignado: '',
    equipoAsignado: [],
    fechaInicioEstimada: '',
    duracionEstimada: 10,
    documentosAdjuntos: []
  });

  const totalPasos = 3;
  const tipoConfig = TIPOS_AUDITORIA_ESPECIAL.find(t => t.id === formData.tipo);

  const handleSiguiente = () => {
    // Validaciones
    if (paso === 1 && !formData.tipo) {
      toast.error('Debes seleccionar un tipo de auditoría especial');
      return;
    }
    if (paso === 2) {
      if (!formData.titulo || !formData.justificacion || !formData.areaObjetivo) {
        toast.error('Completa todos los campos obligatorios');
        return;
      }
    }
    if (paso === 3) {
      if (!formData.liderAsignado || formData.equipoAsignado.length === 0 || !formData.fechaInicioEstimada) {
        toast.error('Debes asignar líder, equipo y fecha de inicio');
        return;
      }
    }
    
    if (paso < totalPasos) {
      setPaso(paso + 1);
    }
  };

  const handleAnterior = () => {
    if (paso > 1) {
      setPaso(paso - 1);
    }
  };

  const handleFinalizar = () => {
    onSubmit(formData);
    
    if (tipoConfig?.requiereAprobacion) {
      toast.success('Auditoría especial creada. Pendiente de aprobación del Jefe OCI.');
    } else {
      toast.success('Auditoría especial creada y aprobada automáticamente. ¡Puedes iniciar de inmediato!');
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8"
      >
        {/* HEADER */}
        <div className="p-6 border-b bg-gradient-to-r from-red-600 to-orange-600">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Nueva Auditoría Especial</h2>
                <p className="text-sm text-orange-100">Workflow acelerado - Aprobación rápida</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* PROGRESS BAR */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex items-center flex-1">
                <div className="flex-1">
                  <div className={`h-2 rounded-full transition-all ${
                    num <= paso ? 'bg-white' : 'bg-white/30'
                  }`} />
                </div>
                {num < 3 && <div className="w-2" />}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-orange-100">
            <span className={paso === 1 ? 'font-bold text-white' : ''}>Tipo y Prioridad</span>
            <span className={paso === 2 ? 'font-bold text-white' : ''}>Información</span>
            <span className={paso === 3 ? 'font-bold text-white' : ''}>Equipo y Fechas</span>
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="p-6 min-h-[500px]">
          <AnimatePresence mode="wait">
            {paso === 1 && (
              <PasoTipoPrioridad
                data={formData}
                tipos={TIPOS_AUDITORIA_ESPECIAL}
                onSelect={(tipo) => {
                  const config = TIPOS_AUDITORIA_ESPECIAL.find(t => t.id === tipo);
                  setFormData({
                    ...formData,
                    tipo,
                    prioridad: config?.prioridadDefault || 'media',
                    duracionEstimada: config?.plazoMaximo || 10
                  });
                }}
                onChangePrioridad={(prioridad) => setFormData({ ...formData, prioridad })}
              />
            )}

            {paso === 2 && (
              <PasoInformacion
                data={formData}
                tipoConfig={tipoConfig}
                areas={AREAS_DISPONIBLES}
                onChange={(field, value) => setFormData({ ...formData, [field]: value })}
              />
            )}

            {paso === 3 && (
              <PasoEquipoFechas
                data={formData}
                auditores={AUDITORES_DISPONIBLES}
                tipoConfig={tipoConfig}
                onChange={(field, value) => setFormData({ ...formData, [field]: value })}
              />
            )}
          </AnimatePresence>
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Paso {paso} de {totalPasos}
          </div>
          <div className="flex gap-3">
            {paso > 1 && (
              <Button onClick={handleAnterior} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>
            )}
            {paso < totalPasos ? (
              <Button onClick={handleSiguiente} style={{ background: '#DC2626' }}>
                Siguiente
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleFinalizar} style={{ background: '#10B981' }}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Crear Auditoría
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ============ PASOS ============

function PasoTipoPrioridad({ data, tipos, onSelect, onChangePrioridad }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Tipo de Auditoría Especial</h3>
        <p className="text-sm text-gray-600">Selecciona el tipo que mejor describe esta auditoría</p>
      </div>

      {/* Grid de tipos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tipos.map((tipo: ConfigTipoAuditoria) => {
          const Icon = tipo.icon;
          const isSelected = data.tipo === tipo.id;
          
          return (
            <button
              key={tipo.id}
              onClick={() => onSelect(tipo.id)}
              className={`
                p-4 border-2 rounded-xl text-left transition-all
                ${isSelected
                  ? 'border-red-600 bg-red-50 shadow-lg'
                  : 'border-gray-200 hover:border-red-300 hover:bg-red-50'
                }
              `}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-red-600' : 'bg-gray-200'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{tipo.label}</h4>
                    <Badge 
                      className="mt-1"
                      style={{ 
                        background: tipo.color,
                        color: 'white'
                      }}
                    >
                      {tipo.prioridadDefault.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                {isSelected && <CheckCircle className="w-5 h-5 text-red-600" />}
              </div>
              
              <p className="text-sm text-gray-600 mb-2">{tipo.descripcion}</p>
              
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Plazo: {tipo.plazoMaximo} días</span>
                </div>
                <div className="flex items-center gap-1">
                  {tipo.requiereAprobacion ? (
                    <>
                      <AlertCircle className="w-3 h-3" />
                      <span>Requiere aprobación</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3 h-3" />
                      <span>Aprobación automática</span>
                    </>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Ajuste de prioridad */}
      {data.tipo && (
        <Card className="p-4 border-2 border-orange-200 bg-orange-50">
          <h4 className="font-bold text-gray-900 mb-3">Ajustar Prioridad (opcional)</h4>
          <div className="grid grid-cols-4 gap-2">
            {(['critica', 'alta', 'media', 'baja'] as Prioridad[]).map((prioridad) => (
              <button
                key={prioridad}
                onClick={() => onChangePrioridad(prioridad)}
                className={`
                  p-2 rounded-lg font-bold text-sm transition-all
                  ${data.prioridad === prioridad
                    ? prioridad === 'critica' ? 'bg-red-600 text-white' :
                      prioridad === 'alta' ? 'bg-orange-600 text-white' :
                      prioridad === 'media' ? 'bg-yellow-600 text-white' :
                      'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }
                `}
              >
                {prioridad.toUpperCase()}
              </button>
            ))}
          </div>
        </Card>
      )}
    </motion.div>
  );
}

function PasoInformacion({ data, tipoConfig, areas, onChange }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Información de la Auditoría</h3>
        <p className="text-sm text-gray-600">Describe el alcance y justificación</p>
      </div>

      {/* Tipo seleccionado */}
      {tipoConfig && (
        <Card className="p-4 border-2" style={{ borderColor: tipoConfig.color, background: `${tipoConfig.color}10` }}>
          <div className="flex items-center gap-3">
            {tipoConfig.icon && <tipoConfig.icon className="w-5 h-5" style={{ color: tipoConfig.color }} />}
            <div>
              <p className="font-bold text-gray-900">{tipoConfig.label}</p>
              <p className="text-sm text-gray-600">Plazo máximo: {tipoConfig.plazoMaximo} días</p>
            </div>
          </div>
        </Card>
      )}

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Título de la Auditoría *
        </label>
        <input
          type="text"
          value={data.titulo}
          onChange={(e) => onChange('titulo', e.target.value)}
          placeholder="Ej: Auditoría de emergencia - Fuga de información"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Descripción Breve
        </label>
        <textarea
          value={data.descripcion}
          onChange={(e) => onChange('descripcion', e.target.value)}
          rows={2}
          placeholder="Describe brevemente qué se va a auditar..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Justificación *
        </label>
        <textarea
          value={data.justificacion}
          onChange={(e) => onChange('justificacion', e.target.value)}
          rows={3}
          placeholder="Explica por qué es necesaria esta auditoría especial (denuncia, solicitud oficial, incidente, etc.)..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
        <p className="text-xs text-gray-500 mt-1">
          La justificación debe ser clara y específica para auditorías especiales
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Área Objetivo *
          </label>
          <select
            value={data.areaObjetivo}
            onChange={(e) => onChange('areaObjetivo', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Seleccionar área...</option>
            {areas.map((area: string) => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Solicitante
          </label>
          <input
            type="text"
            value={data.solicitante}
            onChange={(e) => onChange('solicitante', e.target.value)}
            placeholder="Ej: Jefe OCI, Contraloría, Director General"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Documentos Adjuntos (opcional)
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600 mb-2">Arrastra archivos aquí o haz clic para seleccionar</p>
          <input
            type="file"
            multiple
            onChange={(e) => {
              if (e.target.files) {
                onChange('documentosAdjuntos', Array.from(e.target.files));
              }
            }}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <Button variant="outline" size="sm" as="span" className="cursor-pointer">
              Seleccionar archivos
            </Button>
          </label>
        </div>
        {data.documentosAdjuntos.length > 0 && (
          <div className="mt-2 space-y-1">
            {data.documentosAdjuntos.map((file: File, idx: number) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="w-4 h-4" />
                <span>{file.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function PasoEquipoFechas({ data, auditores, tipoConfig, onChange }: any) {
  const toggleMiembro = (auditor: string) => {
    const equipo = data.equipoAsignado.includes(auditor)
      ? data.equipoAsignado.filter((m: string) => m !== auditor)
      : [...data.equipoAsignado, auditor];
    onChange('equipoAsignado', equipo);
  };

  const auditoresDisponibles = auditores.filter((a: string) => a !== data.liderAsignado);
  const fechaMin = new Date().toISOString().split('T')[0];
  
  let fechaMaxRecomendada = new Date();
  if (tipoConfig) {
    fechaMaxRecomendada.setDate(fechaMaxRecomendada.getDate() + tipoConfig.plazoMaximo);
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Equipo Auditor y Cronograma</h3>
        <p className="text-sm text-gray-600">Asigna el equipo y define las fechas de ejecución</p>
      </div>

      {/* Alert de urgencia */}
      {data.prioridad === 'critica' && (
        <Card className="p-4 border-2 border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-900">
              <p className="font-bold mb-1">Auditoría de Prioridad CRÍTICA</p>
              <p>Se requiere inicio inmediato. El equipo debe estar disponible de forma prioritaria.</p>
            </div>
          </div>
        </Card>
      )}

      {/* Líder */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Auditor Líder *
        </label>
        <select
          value={data.liderAsignado}
          onChange={(e) => onChange('liderAsignado', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">Seleccionar líder...</option>
          {auditores.map((auditor: string) => (
            <option key={auditor} value={auditor}>{auditor}</option>
          ))}
        </select>
      </div>

      {/* Equipo */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Miembros del Equipo * (mínimo 1)
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {auditoresDisponibles.map((auditor: string) => (
            <button
              key={auditor}
              onClick={() => toggleMiembro(auditor)}
              className={`
                p-3 border-2 rounded-lg text-left transition-all flex items-center gap-2
                ${data.equipoAsignado.includes(auditor)
                  ? 'border-red-600 bg-red-50'
                  : 'border-gray-200 hover:border-red-300'
                }
              `}
            >
              <div className={`
                w-5 h-5 rounded border-2 flex items-center justify-center
                ${data.equipoAsignado.includes(auditor)
                  ? 'border-red-600 bg-red-600'
                  : 'border-gray-300'
                }
              `}>
                {data.equipoAsignado.includes(auditor) && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">{auditor}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Fecha de Inicio Estimada *
          </label>
          <input
            type="date"
            value={data.fechaInicioEstimada}
            onChange={(e) => onChange('fechaInicioEstimada', e.target.value)}
            min={fechaMin}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          {tipoConfig && (
            <p className="text-xs text-gray-500 mt-1">
              Plazo máximo recomendado: {tipoConfig.plazoMaximo} días
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Duración Estimada (días)
          </label>
          <input
            type="number"
            value={data.duracionEstimada}
            onChange={(e) => onChange('duracionEstimada', parseInt(e.target.value))}
            min="1"
            max={tipoConfig?.plazoMaximo || 30}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {/* Resumen */}
      {data.liderAsignado && data.equipoAsignado.length > 0 && (
        <Card className="p-4 border-2 border-green-200 bg-green-50">
          <h4 className="font-bold text-gray-900 mb-3">Resumen de Asignación:</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Equipo Total:</span>
              <span className="font-bold text-gray-900">{1 + data.equipoAsignado.length} personas</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Duración:</span>
              <span className="font-bold text-gray-900">{data.duracionEstimada} días</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Aprobación:</span>
              <span className="font-bold text-green-700">
                {tipoConfig?.requiereAprobacion ? 'Requiere aprobación Jefe OCI' : 'Automática ✓'}
              </span>
            </div>
          </div>
        </Card>
      )}
    </motion.div>
  );
}
