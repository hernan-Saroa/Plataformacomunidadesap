/**
 * RF004 - MODAL CREACIÓN DE AUDITORÍA (WIZARD)
 * Proceso guiado paso a paso para crear Plan Individual de Auditoría
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Users,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
  Info,
  Target,
  Shield,
  Clock,
  Send
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { ResponsiveModal } from '../shared/ResponsiveModal';
import { toast } from 'sonner@2.0.3';
import { COLORES_ESAP } from './utils/constantes';

// ============ TIPOS ============

interface AuditoriaFormData {
  // Paso 1: Selección
  procesoSeleccionado: string;
  codigoProceso: string;
  
  // Paso 2: Alcance y Objetivos
  alcance: string;
  objetivos: string;
  riesgos: string;
  
  // Paso 3: Equipo
  auditorLider: string;
  equipoAuditor: string[];
  
  // Paso 4: Criterios
  criteriosAuditoria: string[];
  normativaAplicable: string[];
  
  // Paso 5: Fechas
  fechaInicioPlaneacion: string;
  fechaInicioEjecucion: string;
  fechaInicioComunicacion: string;
  duracionPlaneacion: number;
  duracionEjecucion: number;
  duracionComunicacion: number;
  
  // Paso 6: Documentos
  generarAnuncio: boolean;
  generarCartaRepresentacion: boolean;
  generarProgramaIndividual: boolean;
  
  // Paso 7: Confirmación
  enviarNotificacionInmediata: boolean;
  observaciones: string;
}

interface ModalCrearAuditoriaProps {
  isOpen: boolean;
  onClose: () => void;
  onCrear: (data: AuditoriaFormData) => void;
  procesosDisponibles?: Array<{
    id: string;
    codigo: string;
    nombre: string;
    riesgo: string;
  }>;
}

// ============ CONSTANTES ============

const AUDITORES = [
  'Mario Oswaldo Bernal Rodriguez',
  'Catalina Rubio',
  'Nubia Pimiento',
  'Sandra Montero',
  'Fernando Ávila',
  'William Ramírez',
  'Lucila Villamil',
  'Alexandra Triviño',
  'Natalia Cañon',
  'Flor Mireya Murcia'
];

const CRITERIOS_SUGERIDOS = [
  'Cumplimiento normativo aplicable',
  'Eficacia de los controles implementados',
  'Eficiencia en el uso de recursos',
  'Gestión de riesgos del proceso',
  'Documentación de procedimientos',
  'Trazabilidad de operaciones',
  'Segregación de funciones',
  'Indicadores de desempeño'
];

const NORMATIVA_SUGERIDA = [
  'Ley 87 de 1993 - Control Interno',
  'Decreto 648 de 2017 - Control Interno',
  'MECI 2014',
  'Estatuto ESAP',
  'Manual de procesos y procedimientos',
  'Políticas institucionales'
];

const PASOS = [
  { numero: 1, titulo: 'Selección', icono: FileText },
  { numero: 2, titulo: 'Alcance', icono: Target },
  { numero: 3, titulo: 'Equipo', icono: Users },
  { numero: 4, titulo: 'Criterios', icono: Shield },
  { numero: 5, titulo: 'Fechas', icono: Calendar },
  { numero: 6, titulo: 'Documentos', icono: FileText },
  { numero: 7, titulo: 'Confirmar', icono: CheckCircle2 }
];

// ============ COMPONENTE PRINCIPAL ============

export function ModalCrearAuditoria({
  isOpen,
  onClose,
  onCrear,
  procesosDisponibles = []
}: ModalCrearAuditoriaProps) {
  const [pasoActual, setPasoActual] = useState(1);
  const [formData, setFormData] = useState<AuditoriaFormData>({
    procesoSeleccionado: '',
    codigoProceso: '',
    alcance: '',
    objetivos: '',
    riesgos: '',
    auditorLider: '',
    equipoAuditor: [],
    criteriosAuditoria: [],
    normativaAplicable: [],
    fechaInicioPlaneacion: '',
    fechaInicioEjecucion: '',
    fechaInicioComunicacion: '',
    duracionPlaneacion: 15,
    duracionEjecucion: 30,
    duracionComunicacion: 15,
    generarAnuncio: true,
    generarCartaRepresentacion: true,
    generarProgramaIndividual: true,
    enviarNotificacionInmediata: true,
    observaciones: ''
  });

  // Mock de procesos si no se proporcionan
  const procesos = procesosDisponibles.length > 0 ? procesosDisponibles : [
    { id: '1', codigo: 'AUD-2025-001', nombre: 'Gestión Financiera', riesgo: 'CRÍTICO' },
    { id: '2', codigo: 'AUD-2025-002', nombre: 'Gestión Contractual', riesgo: 'ALTO' },
    { id: '3', codigo: 'AUD-2025-003', nombre: 'Gestión de Talento Humano', riesgo: 'MEDIO' },
    { id: '4', codigo: 'AUD-2025-004', nombre: 'Gestión Documental', riesgo: 'BAJO' }
  ];

  // ============ HANDLERS ============

  const handleUpdateFormData = (field: keyof AuditoriaFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSiguiente = () => {
    // Validaciones por paso
    if (!validarPaso(pasoActual)) {
      return;
    }
    
    if (pasoActual < 7) {
      setPasoActual(pasoActual + 1);
    }
  };

  const handleAnterior = () => {
    if (pasoActual > 1) {
      setPasoActual(pasoActual - 1);
    }
  };

  const handleCrear = () => {
    if (!validarFormularioCompleto()) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }
    
    onCrear(formData);
    toast.success('Auditoría creada exitosamente');
    handleCerrar();
  };

  const handleCerrar = () => {
    setPasoActual(1);
    setFormData({
      procesoSeleccionado: '',
      codigoProceso: '',
      alcance: '',
      objetivos: '',
      riesgos: '',
      auditorLider: '',
      equipoAuditor: [],
      criteriosAuditoria: [],
      normativaAplicable: [],
      fechaInicioPlaneacion: '',
      fechaInicioEjecucion: '',
      fechaInicioComunicacion: '',
      duracionPlaneacion: 15,
      duracionEjecucion: 30,
      duracionComunicacion: 15,
      generarAnuncio: true,
      generarCartaRepresentacion: true,
      generarProgramaIndividual: true,
      enviarNotificacionInmediata: true,
      observaciones: ''
    });
    onClose();
  };

  const validarPaso = (paso: number): boolean => {
    switch (paso) {
      case 1:
        if (!formData.procesoSeleccionado) {
          toast.error('Debes seleccionar un proceso');
          return false;
        }
        return true;
      case 2:
        if (!formData.alcance || !formData.objetivos) {
          toast.error('Debes completar el alcance y objetivos');
          return false;
        }
        return true;
      case 3:
        if (!formData.auditorLider) {
          toast.error('Debes asignar un auditor líder');
          return false;
        }
        return true;
      case 5:
        if (!formData.fechaInicioPlaneacion) {
          toast.error('Debes programar la fecha de inicio');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const validarFormularioCompleto = (): boolean => {
    return !!(
      formData.procesoSeleccionado &&
      formData.alcance &&
      formData.objetivos &&
      formData.auditorLider &&
      formData.fechaInicioPlaneacion
    );
  };

  const toggleCriterio = (criterio: string) => {
    setFormData(prev => ({
      ...prev,
      criteriosAuditoria: prev.criteriosAuditoria.includes(criterio)
        ? prev.criteriosAuditoria.filter(c => c !== criterio)
        : [...prev.criteriosAuditoria, criterio]
    }));
  };

  const toggleNormativa = (normativa: string) => {
    setFormData(prev => ({
      ...prev,
      normativaAplicable: prev.normativaAplicable.includes(normativa)
        ? prev.normativaAplicable.filter(n => n !== normativa)
        : [...prev.normativaAplicable, normativa]
    }));
  };

  const toggleEquipo = (auditor: string) => {
    setFormData(prev => ({
      ...prev,
      equipoAuditor: prev.equipoAuditor.includes(auditor)
        ? prev.equipoAuditor.filter(a => a !== auditor)
        : [...prev.equipoAuditor, auditor]
    }));
  };

  // ============ RENDERIZADO POR PASO ============

  const renderPaso = () => {
    switch (pasoActual) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Selecciona del Programa Anual
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Elige el proceso que deseas auditar este período
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Proceso a Auditar *
              </label>
              {procesos.map((proceso) => (
                <button
                  key={proceso.id}
                  onClick={() => {
                    handleUpdateFormData('procesoSeleccionado', proceso.nombre);
                    handleUpdateFormData('codigoProceso', proceso.codigo);
                  }}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                    formData.procesoSeleccionado === proceso.nombre
                      ? 'border-[#003DA5] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900">
                          {proceso.nombre}
                        </span>
                        <Badge
                          className={
                            proceso.riesgo === 'CRÍTICO'
                              ? 'bg-red-100 text-red-800 border-red-200'
                              : proceso.riesgo === 'ALTO'
                              ? 'bg-orange-100 text-orange-800 border-orange-200'
                              : proceso.riesgo === 'MEDIO'
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                              : 'bg-green-100 text-green-800 border-green-200'
                          }
                        >
                          {proceso.riesgo}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">{proceso.codigo}</p>
                    </div>
                    {formData.procesoSeleccionado === proceso.nombre && (
                      <CheckCircle2 className="w-5 h-5 text-[#003DA5] flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alcance de la Auditoría *
              </label>
              <textarea
                value={formData.alcance}
                onChange={(e) => handleUpdateFormData('alcance', e.target.value)}
                rows={4}
                placeholder="Define el alcance: qué procesos, áreas, períodos se auditarán..."
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Objetivos de la Auditoría *
              </label>
              <textarea
                value={formData.objetivos}
                onChange={(e) => handleUpdateFormData('objetivos', e.target.value)}
                rows={4}
                placeholder="Define los objetivos específicos que se buscan alcanzar..."
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Riesgos del Proceso
              </label>
              <textarea
                value={formData.riesgos}
                onChange={(e) => handleUpdateFormData('riesgos', e.target.value)}
                rows={3}
                placeholder="Describe los principales riesgos identificados en el proceso..."
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] resize-none"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auditor Líder *
              </label>
              <select
                value={formData.auditorLider}
                onChange={(e) => handleUpdateFormData('auditorLider', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
              >
                <option value="">Seleccionar auditor líder...</option>
                {AUDITORES.map((auditor) => (
                  <option key={auditor} value={auditor}>
                    {auditor}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Equipo Auditor (opcional)
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Selecciona los miembros del equipo auditor
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {AUDITORES.filter(a => a !== formData.auditorLider).map((auditor) => (
                  <label
                    key={auditor}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.equipoAuditor.includes(auditor)}
                      onChange={() => toggleEquipo(auditor)}
                      className="w-4 h-4 text-[#003DA5] border-gray-300 rounded focus:ring-[#003DA5]"
                    />
                    <span className="text-sm text-gray-700">{auditor}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Criterios de Auditoría
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Selecciona los criterios aplicables
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {CRITERIOS_SUGERIDOS.map((criterio) => (
                  <label
                    key={criterio}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.criteriosAuditoria.includes(criterio)}
                      onChange={() => toggleCriterio(criterio)}
                      className="w-4 h-4 text-[#003DA5] border-gray-300 rounded focus:ring-[#003DA5]"
                    />
                    <span className="text-sm text-gray-700">{criterio}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Normativa Aplicable
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {NORMATIVA_SUGERIDA.map((normativa) => (
                  <label
                    key={normativa}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.normativaAplicable.includes(normativa)}
                      onChange={() => toggleNormativa(normativa)}
                      className="w-4 h-4 text-[#003DA5] border-gray-300 rounded focus:ring-[#003DA5]"
                    />
                    <span className="text-sm text-gray-700">{normativa}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
              <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900">
                  Programación de Etapas
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Las fechas se calcularán automáticamente basadas en la duración de cada etapa
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Inicio (Planeación) *
              </label>
              <input
                type="date"
                value={formData.fechaInicioPlaneacion}
                onChange={(e) => handleUpdateFormData('fechaInicioPlaneacion', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duración Planeación (días)
                </label>
                <input
                  type="number"
                  value={formData.duracionPlaneacion}
                  onChange={(e) => handleUpdateFormData('duracionPlaneacion', parseInt(e.target.value))}
                  min={1}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duración Ejecución (días)
                </label>
                <input
                  type="number"
                  value={formData.duracionEjecucion}
                  onChange={(e) => handleUpdateFormData('duracionEjecucion', parseInt(e.target.value))}
                  min={1}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duración Comunicación (días)
                </label>
                <input
                  type="number"
                  value={formData.duracionComunicacion}
                  onChange={(e) => handleUpdateFormData('duracionComunicacion', parseInt(e.target.value))}
                  min={1}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
                />
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Selecciona los documentos que deseas generar automáticamente
            </p>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-4 border-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.generarAnuncio}
                  onChange={(e) => handleUpdateFormData('generarAnuncio', e.target.checked)}
                  className="w-5 h-5 text-[#003DA5] border-gray-300 rounded focus:ring-[#003DA5]"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Oficio de Anuncio</p>
                  <p className="text-xs text-gray-500">Notificación oficial al área auditada</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 border-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.generarCartaRepresentacion}
                  onChange={(e) => handleUpdateFormData('generarCartaRepresentacion', e.target.checked)}
                  className="w-5 h-5 text-[#003DA5] border-gray-300 rounded focus:ring-[#003DA5]"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Carta de Representación</p>
                  <p className="text-xs text-gray-500">Solicitud de información al área</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 border-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.generarProgramaIndividual}
                  onChange={(e) => handleUpdateFormData('generarProgramaIndividual', e.target.checked)}
                  className="w-5 h-5 text-[#003DA5] border-gray-300 rounded focus:ring-[#003DA5]"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Programa Individual de Auditoría</p>
                  <p className="text-xs text-gray-500">Plan detallado de la auditoría</p>
                </div>
              </label>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-900 mb-2">
                    Resumen de la Auditoría
                  </p>
                  <div className="space-y-2 text-xs text-green-800">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span><strong>Proceso:</strong> {formData.procesoSeleccionado}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span><strong>Auditor Líder:</strong> {formData.auditorLider}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span><strong>Equipo:</strong> {formData.equipoAuditor.length} personas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span><strong>Inicio:</strong> {formData.fechaInicioPlaneacion}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span><strong>Duración Total:</strong> {formData.duracionPlaneacion + formData.duracionEjecucion + formData.duracionComunicacion} días</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enviarNotificacionInmediata}
                  onChange={(e) => handleUpdateFormData('enviarNotificacionInmediata', e.target.checked)}
                  className="w-4 h-4 text-[#003DA5] border-gray-300 rounded focus:ring-[#003DA5]"
                />
                <span className="text-sm text-gray-700">Enviar notificación inmediata al área auditada</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones Adicionales
              </label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => handleUpdateFormData('observaciones', e.target.value)}
                rows={3}
                placeholder="Observaciones o comentarios adicionales..."
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] resize-none"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ============ RENDER PRINCIPAL ============

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={handleCerrar}
      title="Crear Nueva Auditoría"
      maxWidth="max-w-3xl"
    >
      <div className="p-6">
        {/* Indicador de Pasos */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {PASOS.map((paso, index) => {
              const Icon = paso.icono;
              const esActual = paso.numero === pasoActual;
              const esCompletado = paso.numero < pasoActual;
              
              return (
                <div key={paso.numero} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        esActual
                          ? 'bg-[#003DA5] text-white scale-110'
                          : esCompletado
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {esCompletado ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <span className={`text-xs mt-1 hidden sm:block ${esActual ? 'font-medium' : ''}`}>
                      {paso.titulo}
                    </span>
                  </div>
                  {index < PASOS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 transition-colors ${
                        esCompletado ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-sm text-gray-600 text-center mt-4">
            Paso {pasoActual} de {PASOS.length}: {PASOS[pasoActual - 1].titulo}
          </p>
        </div>

        {/* Contenido del Paso */}
        <AnimatePresence mode="wait">
          <motion.div
            key={pasoActual}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderPaso()}
          </motion.div>
        </AnimatePresence>

        {/* Botones de Navegación */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleAnterior}
            disabled={pasoActual === 1}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCerrar}>
              Cancelar
            </Button>
            
            {pasoActual < 7 ? (
              <Button
                onClick={handleSiguiente}
                className="gap-2"
                style={{ backgroundColor: COLORES_ESAP.primario }}
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleCrear}
                className="gap-2"
                style={{ backgroundColor: COLORES_ESAP.exito }}
              >
                <Send className="w-4 h-4" />
                Crear Auditoría
              </Button>
            )}
          </div>
        </div>
      </div>
    </ResponsiveModal>
  );
}
