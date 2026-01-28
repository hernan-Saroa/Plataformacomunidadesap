/**
 * ModalNuevoIndicador - ESAP 2025 Standard
 * Modal para crear nuevos indicadores del Plan de Acción Institucional
 */

import { useState } from 'react';
import { X, Target, Calendar, Users, TrendingUp } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Textarea } from '../../../ui/textarea';
import { toast } from 'sonner@2.0.3';
import { ModalHeaderClean } from './ModalHeaderClean';
import { useConfiguracionesSIGL } from '../config/ConfiguracionesSIGLContext';

interface ModalNuevoIndicadorProps {
  isOpen: boolean;
  onClose: () => void;
  onGuardar?: (data: any) => void;
}

export function ModalNuevoIndicador({ isOpen, onClose, onGuardar }: ModalNuevoIndicadorProps) {
  // Obtener ejes estratégicos desde el Context
  const { getEjesEstrategicosActivos } = useConfiguracionesSIGL();
  const ejesActivos = getEjesEstrategicosActivos();

  // 🐛 DEBUG: Ver si los ejes están cargando
  console.log('🔍 Ejes Estratégicos Activos:', ejesActivos);

  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    ejeEstrategico: 'GESTION_INSTITUCIONAL',
    responsable: '',
    meta: '',
    unidadMedida: '%',
    fechaInicio: '',
    fechaFin: '',
    prioridad: 'MEDIA',
    periodicidad: 'TRIMESTRAL',
    tipoIndicador: 'EFICIENCIA'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.nombre.trim()) {
      toast.error('El nombre del indicador es obligatorio');
      return;
    }
    if (!formData.meta || parseFloat(formData.meta) <= 0) {
      toast.error('La meta debe ser un valor mayor a cero');
      return;
    }
    if (!formData.responsable.trim()) {
      toast.error('Debe asignar un responsable');
      return;
    }

    // Generar código automático si no se proporcionó
    const codigoFinal = formData.codigo || `AUTO-${Date.now()}`;

    const nuevoIndicador = {
      ...formData,
      codigo: codigoFinal,
      id: `IND-${Date.now()}`,
      valorActual: 0,
      avance: 0,
      estado: 'EN_TIEMPO',
      fechaInicio: new Date(formData.fechaInicio),
      fechaFin: new Date(formData.fechaFin),
      ultimaActualizacion: new Date()
    };

    if (onGuardar) {
      onGuardar(nuevoIndicador);
    }

    toast.success('Indicador creado exitosamente', {
      description: `${codigoFinal} - ${formData.nombre}`
    });

    onClose();
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen md:min-h-0 flex items-start md:items-center justify-center p-0 md:p-4 md:py-8">
        <div className="bg-white rounded-none md:rounded-2xl shadow-2xl w-full md:max-w-3xl md:max-h-[90vh] overflow-hidden flex flex-col my-0 md:my-4">
          {/* Header con ModalHeaderClean */}
          <ModalHeaderClean
            titulo="Nuevo Indicador PEI"
            subtitulo="Crear indicador del Plan Estratégico Institucional"
            icono={Target}
            colorIcono="blue"
            badgePrincipal="CREAR INDICADOR"
            onClose={onClose}
          />

          {/* Contenido del Modal */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {/* Sección 1: Información Básica */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b-2 border-blue-100">
                <Target className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900">Información Básica</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo" className="text-sm font-semibold text-gray-700">
                    Código del Indicador <span className="text-gray-400">(opcional)</span>
                  </Label>
                  <Input
                    id="codigo"
                    placeholder="Ej: GI-001"
                    value={formData.codigo}
                    onChange={(e) => handleChange('codigo', e.target.value)}
                    className="border-2 border-gray-300 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500">
                    Si no lo especifica, se generará automáticamente
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ejeEstrategico" className="text-sm font-semibold text-gray-700">
                    Eje Estratégico <span className="text-red-600">*</span>
                  </Label>
                  <select
                    id="ejeEstrategico"
                    value={formData.ejeEstrategico}
                    onChange={(e) => handleChange('ejeEstrategico', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    required
                  >
                    {ejesActivos.map(eje => (
                      <option key={eje.id} value={eje.id}>{eje.icono} {eje.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre" className="text-sm font-semibold text-gray-700">
                  Nombre del Indicador <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="nombre"
                  placeholder="Ej: Reducción de términos vencidos en procesos judiciales"
                  value={formData.nombre}
                  onChange={(e) => handleChange('nombre', e.target.value)}
                  className="border-2 border-gray-300 focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion" className="text-sm font-semibold text-gray-700">
                  Descripción <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  id="descripcion"
                  placeholder="Describa el objetivo y alcance del indicador..."
                  value={formData.descripcion}
                  onChange={(e) => handleChange('descripcion', e.target.value)}
                  rows={3}
                  className="border-2 border-gray-300 focus:border-blue-500 resize-none"
                  required
                />
              </div>
            </div>

            {/* Sección 2: Meta y Medición */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b-2 border-orange-100">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-gray-900">Meta y Medición</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="meta" className="text-sm font-semibold text-gray-700">
                    Meta <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="meta"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="100"
                    value={formData.meta}
                    onChange={(e) => handleChange('meta', e.target.value)}
                    className="border-2 border-gray-300 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unidadMedida" className="text-sm font-semibold text-gray-700">
                    Unidad de Medida <span className="text-red-600">*</span>
                  </Label>
                  <select
                    id="unidadMedida"
                    value={formData.unidadMedida}
                    onChange={(e) => handleChange('unidadMedida', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="%">% (Porcentaje)</option>
                    <option value="Número"># (Número)</option>
                    <option value="Días">Días</option>
                    <option value="Procesos">Procesos</option>
                    <option value="Documentos">Documentos</option>
                    <option value="Personas">Personas</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipoIndicador" className="text-sm font-semibold text-gray-700">
                    Tipo de Indicador <span className="text-red-600">*</span>
                  </Label>
                  <select
                    id="tipoIndicador"
                    value={formData.tipoIndicador}
                    onChange={(e) => handleChange('tipoIndicador', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="EFICIENCIA">⚡ Eficiencia</option>
                    <option value="EFICACIA">🎯 Eficacia</option>
                    <option value="GESTION">📊 Gestión</option>
                    <option value="TRANSPARENCIA">🔍 Transparencia</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prioridad" className="text-sm font-semibold text-gray-700">
                    Prioridad <span className="text-red-600">*</span>
                  </Label>
                  <select
                    id="prioridad"
                    value={formData.prioridad}
                    onChange={(e) => handleChange('prioridad', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="ALTA">🔴 Alta</option>
                    <option value="MEDIA">🟡 Media</option>
                    <option value="BAJA">🟢 Baja</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="periodicidad" className="text-sm font-semibold text-gray-700">
                    Periodicidad <span className="text-red-600">*</span>
                  </Label>
                  <select
                    id="periodicidad"
                    value={formData.periodicidad}
                    onChange={(e) => handleChange('periodicidad', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="MENSUAL">📅 Mensual</option>
                    <option value="TRIMESTRAL">📊 Trimestral</option>
                    <option value="SEMESTRAL">📈 Semestral</option>
                    <option value="ANUAL">📆 Anual</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Sección 3: Responsable y Fechas */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b-2 border-green-100">
                <Users className="w-5 h-5 text-green-600" />
                <h3 className="font-bold text-gray-900">Responsable y Cronograma</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsable" className="text-sm font-semibold text-gray-700">
                  Responsable del Indicador <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="responsable"
                  placeholder="Ej: Dr. Carlos Mendoza Torres"
                  value={formData.responsable}
                  onChange={(e) => handleChange('responsable', e.target.value)}
                  className="border-2 border-gray-300 focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fechaInicio" className="text-sm font-semibold text-gray-700">
                    Fecha de Inicio <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="fechaInicio"
                    type="date"
                    value={formData.fechaInicio}
                    onChange={(e) => handleChange('fechaInicio', e.target.value)}
                    className="border-2 border-gray-300 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fechaFin" className="text-sm font-semibold text-gray-700">
                    Fecha Límite <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="fechaFin"
                    type="date"
                    value={formData.fechaFin}
                    onChange={(e) => handleChange('fechaFin', e.target.value)}
                    className="border-2 border-gray-300 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Footer con Acciones */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="px-6 border-2 border-gray-300 hover:bg-gray-100"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold"
              >
                <Target className="w-4 h-4 mr-2" />
                Crear Indicador
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}