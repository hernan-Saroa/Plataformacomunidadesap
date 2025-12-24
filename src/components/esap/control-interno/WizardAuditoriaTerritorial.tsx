/**
 * ============================================
 * RF017: WIZARD AUDITORÍA TERRITORIAL
 * ============================================
 * 
 * Wizard especializado para crear auditorías a las 16 territoriales
 * con cronograma fijo de 4 días de ejecución presencial
 * 
 * CARACTERÍSTICAS:
 * - Ejecución presencial: 4 días fijos
 * - Equipo típico: 3 personas
 * - Planeación: 5 días
 * - Comunicación: 10 días
 * - Total: 19 días calendario
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Diciembre 2025
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin, Calendar, Users, Clock, CheckCircle, ArrowRight,
  ArrowLeft, X, Building2, Plane, User, FileText, Target,
  AlertTriangle, Info, Check, Briefcase, Mail, Phone
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

interface Territorial {
  id: string;
  nombre: string;
  ciudad: string;
  departamento: string;
  region: string;
  codigo: string;
  director: string;
  email: string;
  telefono: string;
}

interface FormDataAuditoriaTerritorial {
  // Paso 1: Territorial
  territorialId: string;
  territorial: Territorial | null;
  
  // Paso 2: Información General
  titulo: string;
  objetivoGeneral: string;
  alcance: string;
  
  // Paso 3: Cronograma (4 días fijos)
  fechaInicio: string;
  fechaFinEjecucion: string; // Auto-calculado: inicio + 4 días
  fechaFinComunicacion: string; // Auto-calculado: fin ejecución + 10 días
  
  // Paso 4: Equipo Auditor
  lider: string;
  miembros: string[];
  
  // Paso 5: Logística
  modalidadTransporte: 'Aéreo' | 'Terrestre' | 'Mixto';
  hospedaje: boolean;
  presupuestoEstimado: number;
  observaciones: string;
}

interface WizardProps {
  onClose: () => void;
  onSubmit: (data: FormDataAuditoriaTerritorial) => void;
  territoriales: Territorial[];
}

// ============ DATOS MOCK ============

const AUDITORES_DISPONIBLES = [
  'Fernando Ávila García',
  'Lucila Villamil Pérez',
  'Natalia Cañón Ruiz',
  'Catalina Rubio Sánchez',
  'Jorge Alberto Mendoza',
  'Diana Patricia Torres',
  'Carlos Eduardo Gómez'
];

// ============ COMPONENTE PRINCIPAL ============

export function WizardAuditoriaTerritorial({ onClose, onSubmit, territoriales }: WizardProps) {
  const [paso, setPaso] = useState(1);
  const [formData, setFormData] = useState<FormDataAuditoriaTerritorial>({
    territorialId: '',
    territorial: null,
    titulo: '',
    objetivoGeneral: '',
    alcance: '',
    fechaInicio: '',
    fechaFinEjecucion: '',
    fechaFinComunicacion: '',
    lider: '',
    miembros: [],
    modalidadTransporte: 'Aéreo',
    hospedaje: true,
    presupuestoEstimado: 0,
    observaciones: ''
  });

  const totalPasos = 5;

  // Calcular fechas automáticamente
  const calcularFechas = (fechaInicio: string) => {
    if (!fechaInicio) return;
    
    const inicio = new Date(fechaInicio);
    
    // Ejecución: 4 días fijos
    const finEjecucion = new Date(inicio);
    finEjecucion.setDate(finEjecucion.getDate() + 4);
    
    // Comunicación: + 10 días después de ejecución
    const finComunicacion = new Date(finEjecucion);
    finComunicacion.setDate(finComunicacion.getDate() + 10);
    
    setFormData({
      ...formData,
      fechaInicio,
      fechaFinEjecucion: finEjecucion.toISOString().split('T')[0],
      fechaFinComunicacion: finComunicacion.toISOString().split('T')[0]
    });
  };

  const handleSiguiente = () => {
    // Validaciones por paso
    if (paso === 1 && !formData.territorialId) {
      toast.error('Debes seleccionar una territorial');
      return;
    }
    if (paso === 2 && (!formData.titulo || !formData.objetivoGeneral)) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    if (paso === 3 && !formData.fechaInicio) {
      toast.error('Debes seleccionar la fecha de inicio');
      return;
    }
    if (paso === 4 && (!formData.lider || formData.miembros.length === 0)) {
      toast.error('Debes asignar un líder y al menos un miembro');
      return;
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
    // Validación final
    if (formData.presupuestoEstimado === 0) {
      toast.error('Debes ingresar un presupuesto estimado');
      return;
    }
    
    onSubmit(formData);
    toast.success('Auditoría territorial creada exitosamente');
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
        <div className="p-6 border-b" style={{ background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Nueva Auditoría Territorial</h2>
                <p className="text-sm text-blue-100">Cronograma fijo: 4 días de ejecución presencial</p>
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
            {[1, 2, 3, 4, 5].map((num) => (
              <div key={num} className="flex items-center flex-1">
                <div className="flex-1">
                  <div className={`h-2 rounded-full transition-all ${
                    num <= paso ? 'bg-white' : 'bg-white/30'
                  }`} />
                </div>
                {num < 5 && <div className="w-2" />}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-blue-100">
            <span className={paso === 1 ? 'font-bold text-white' : ''}>Territorial</span>
            <span className={paso === 2 ? 'font-bold text-white' : ''}>Información</span>
            <span className={paso === 3 ? 'font-bold text-white' : ''}>Cronograma</span>
            <span className={paso === 4 ? 'font-bold text-white' : ''}>Equipo</span>
            <span className={paso === 5 ? 'font-bold text-white' : ''}>Logística</span>
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="p-6 min-h-[500px]">
          <AnimatePresence mode="wait">
            {paso === 1 && (
              <PasoSeleccionarTerritorial
                territoriales={territoriales}
                selected={formData.territorialId}
                onSelect={(id) => {
                  const terr = territoriales.find(t => t.id === id);
                  setFormData({ ...formData, territorialId: id, territorial: terr || null });
                }}
              />
            )}

            {paso === 2 && (
              <PasoInformacionGeneral
                data={formData}
                onChange={(field, value) => setFormData({ ...formData, [field]: value })}
              />
            )}

            {paso === 3 && (
              <PasoCronograma
                data={formData}
                onChange={calcularFechas}
              />
            )}

            {paso === 4 && (
              <PasoEquipoAuditor
                data={formData}
                auditores={AUDITORES_DISPONIBLES}
                onChange={(field, value) => setFormData({ ...formData, [field]: value })}
              />
            )}

            {paso === 5 && (
              <PasoLogistica
                data={formData}
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
              <Button
                onClick={handleAnterior}
                variant="outline"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>
            )}
            {paso < totalPasos ? (
              <Button
                onClick={handleSiguiente}
                style={{ background: '#003DA5' }}
              >
                Siguiente
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleFinalizar}
                style={{ background: '#10B981' }}
              >
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

// ============ PASOS DEL WIZARD ============

function PasoSeleccionarTerritorial({ territoriales, selected, onSelect }: any) {
  const [busqueda, setBusqueda] = useState('');
  
  const territorialesFiltradas = territoriales.filter((t: Territorial) =>
    t.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    t.ciudad.toLowerCase().includes(busqueda.toLowerCase()) ||
    t.region.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Selecciona la Territorial</h3>
        <p className="text-sm text-gray-600">Elige la sede territorial que será auditada</p>
      </div>

      {/* Búsqueda */}
      <input
        type="text"
        placeholder="Buscar por nombre, ciudad o región..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
      />

      {/* Grid de territoriales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
        {territorialesFiltradas.map((terr: Territorial) => (
          <button
            key={terr.id}
            onClick={() => onSelect(terr.id)}
            className={`
              p-4 border-2 rounded-xl text-left transition-all
              ${selected === terr.id
                ? 'border-blue-600 bg-blue-50 shadow-lg'
                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              }
            `}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <MapPin className={`w-5 h-5 ${selected === terr.id ? 'text-blue-600' : 'text-gray-400'}`} />
                <div>
                  <h4 className="font-bold text-gray-900">{terr.nombre}</h4>
                  <p className="text-sm text-gray-600">{terr.ciudad}, {terr.departamento}</p>
                </div>
              </div>
              {selected === terr.id && (
                <CheckCircle className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                <span>{terr.region}</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {terr.codigo}
              </Badge>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function PasoInformacionGeneral({ data, onChange }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Información General</h3>
        <p className="text-sm text-gray-600">Define el alcance y objetivos de la auditoría</p>
      </div>

      {/* Territorial seleccionada */}
      {data.territorial && (
        <Card className="p-4 bg-blue-50 border-2 border-blue-200">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-bold text-gray-900">{data.territorial.nombre}</p>
              <p className="text-sm text-gray-600">{data.territorial.ciudad} - {data.territorial.region}</p>
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
          placeholder="Ej: Auditoría de Gestión Territorial 2025"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Objetivo General *
        </label>
        <textarea
          value={data.objetivoGeneral}
          onChange={(e) => onChange('objetivoGeneral', e.target.value)}
          rows={3}
          placeholder="Describe el objetivo principal de esta auditoría territorial..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Alcance
        </label>
        <textarea
          value={data.alcance}
          onChange={(e) => onChange('alcance', e.target.value)}
          rows={3}
          placeholder="Define qué procesos o áreas serán incluidos en la auditoría..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
      </div>
    </motion.div>
  );
}

function PasoCronograma({ data, onChange }: any) {
  const fechaMin = new Date().toISOString().split('T')[0];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Cronograma de Auditoría</h3>
        <p className="text-sm text-gray-600">Auditoría territorial con ejecución presencial de 4 días</p>
      </div>

      {/* Información del cronograma fijo */}
      <Card className="p-4 bg-amber-50 border-2 border-amber-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-bold mb-1">Cronograma Estándar Territorial:</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li><strong>Planeación:</strong> 5 días (previo al inicio)</li>
              <li><strong>Ejecución Presencial:</strong> 4 días fijos en la territorial</li>
              <li><strong>Comunicación:</strong> 10 días (elaboración de informe)</li>
              <li><strong>Total:</strong> 19 días calendario</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Fecha de inicio */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Fecha de Inicio de Ejecución Presencial *
        </label>
        <input
          type="date"
          value={data.fechaInicio}
          onChange={(e) => onChange(e.target.value)}
          min={fechaMin}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
        <p className="text-xs text-gray-500 mt-1">
          Esta será la fecha en que el equipo auditor viaja a la territorial
        </p>
      </div>

      {/* Cronograma calculado */}
      {data.fechaInicio && (
        <Card className="p-4 border-2 border-blue-200 bg-blue-50">
          <h4 className="font-bold text-gray-900 mb-3">Cronograma Calculado:</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Inicio Ejecución:</span>
              </div>
              <span className="font-bold text-gray-900">
                {new Date(data.fechaInicio).toLocaleDateString('es-CO', { 
                  weekday: 'short', 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Fin Ejecución (4 días):</span>
              </div>
              <span className="font-bold text-gray-900">
                {data.fechaFinEjecucion && new Date(data.fechaFinEjecucion).toLocaleDateString('es-CO', { 
                  weekday: 'short', 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Fin Comunicación (+10 días):</span>
              </div>
              <span className="font-bold text-gray-900">
                {data.fechaFinComunicacion && new Date(data.fechaFinComunicacion).toLocaleDateString('es-CO', { 
                  weekday: 'short', 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </span>
            </div>

            <div className="pt-3 border-t border-blue-300">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900">Duración Total:</span>
                <span className="text-lg font-black text-blue-600">19 días</span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </motion.div>
  );
}

function PasoEquipoAuditor({ data, auditores, onChange }: any) {
  const toggleMiembro = (auditor: string) => {
    const miembros = data.miembros.includes(auditor)
      ? data.miembros.filter((m: string) => m !== auditor)
      : [...data.miembros, auditor];
    onChange('miembros', miembros);
  };

  const auditoresDisponibles = auditores.filter((a: string) => a !== data.lider);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Equipo Auditor</h3>
        <p className="text-sm text-gray-600">Asigna el líder y miembros del equipo (típicamente 3 personas)</p>
      </div>

      {/* Líder */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Auditor Líder *
        </label>
        <select
          value={data.lider}
          onChange={(e) => onChange('lider', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">Seleccionar líder...</option>
          {auditores.map((auditor: string) => (
            <option key={auditor} value={auditor}>{auditor}</option>
          ))}
        </select>
      </div>

      {/* Miembros */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Miembros del Equipo * (mínimo 1, recomendado 2-3)
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {auditoresDisponibles.map((auditor: string) => (
            <button
              key={auditor}
              onClick={() => toggleMiembro(auditor)}
              className={`
                p-3 border-2 rounded-lg text-left transition-all flex items-center gap-2
                ${data.miembros.includes(auditor)
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
                }
              `}
            >
              <div className={`
                w-5 h-5 rounded border-2 flex items-center justify-center
                ${data.miembros.includes(auditor)
                  ? 'border-blue-600 bg-blue-600'
                  : 'border-gray-300'
                }
              `}>
                {data.miembros.includes(auditor) && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">{auditor}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Resumen del equipo */}
      {data.lider && data.miembros.length > 0 && (
        <Card className="p-4 border-2 border-green-200 bg-green-50">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 mb-2">Equipo Conformado:</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge style={{ background: '#DC2626', color: 'white' }}>Líder</Badge>
                  <span className="text-sm text-gray-700">{data.lider}</span>
                </div>
                {data.miembros.map((miembro: string, idx: number) => (
                  <div key={miembro} className="flex items-center gap-2">
                    <Badge variant="outline">Miembro {idx + 1}</Badge>
                    <span className="text-sm text-gray-700">{miembro}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm font-bold text-green-700 mt-2">
                Total: {1 + data.miembros.length} personas
              </p>
            </div>
          </div>
        </Card>
      )}
    </motion.div>
  );
}

function PasoLogistica({ data, onChange }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Logística y Presupuesto</h3>
        <p className="text-sm text-gray-600">Planifica los aspectos logísticos de la auditoría territorial</p>
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Modalidad de Transporte
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['Aéreo', 'Terrestre', 'Mixto'] as const).map((modalidad) => (
            <button
              key={modalidad}
              onClick={() => onChange('modalidadTransporte', modalidad)}
              className={`
                p-3 border-2 rounded-lg font-medium transition-all
                ${data.modalidadTransporte === modalidad
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-700 hover:border-blue-300'
                }
              `}
            >
              <Plane className="w-5 h-5 mx-auto mb-1" />
              {modalidad}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.hospedaje}
            onChange={(e) => onChange('hospedaje', e.target.checked)}
            className="w-5 h-5"
          />
          <span className="text-sm font-bold text-gray-700">
            Requiere hospedaje para el equipo auditor
          </span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Presupuesto Estimado (COP) *
        </label>
        <input
          type="number"
          value={data.presupuestoEstimado}
          onChange={(e) => onChange('presupuestoEstimado', parseFloat(e.target.value))}
          placeholder="0"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
        <p className="text-xs text-gray-500 mt-1">
          Incluye: transporte, hospedaje, alimentación y viáticos
        </p>
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Observaciones Adicionales
        </label>
        <textarea
          value={data.observaciones}
          onChange={(e) => onChange('observaciones', e.target.value)}
          rows={3}
          placeholder="Cualquier observación adicional sobre logística, restricciones, etc..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      {/* Resumen final */}
      <Card className="p-4 border-2" style={{ borderColor: '#003DA5', background: '#EFF6FF' }}>
        <h4 className="font-bold text-gray-900 mb-3">Resumen de la Auditoría:</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Territorial:</span>
            <span className="font-bold text-gray-900">{data.territorial?.nombre}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Duración:</span>
            <span className="font-bold text-gray-900">4 días presenciales + 10 días comunicación</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Equipo:</span>
            <span className="font-bold text-gray-900">{1 + data.miembros.length} personas</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Transporte:</span>
            <span className="font-bold text-gray-900">{data.modalidadTransporte}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Presupuesto:</span>
            <span className="font-bold text-blue-600">
              ${data.presupuestoEstimado.toLocaleString('es-CO')}
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
