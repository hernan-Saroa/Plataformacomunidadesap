/**
 * ModalNuevoRiesgo - ESAP 2025 Standard
 * Modal para crear nuevos riesgos institucionales en la Matriz de Riesgos
 */

import { useState } from 'react';
import { AlertTriangle, Target, Shield, Activity, TrendingUp } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Textarea } from '../../../ui/textarea';
import { toast } from 'sonner@2.0.3';
import { ModalHeaderClean } from './ModalHeaderClean';

interface ModalNuevoRiesgoProps {
  isOpen: boolean;
  onClose: () => void;
  onGuardar?: (data: any) => void;
}

export function ModalNuevoRiesgo({ isOpen, onClose, onGuardar }: ModalNuevoRiesgoProps) {
  const [formData, setFormData] = useState({
    descripcion: '',
    proceso: '',
    tipoRiesgo: 'GESTION',
    causas: '',
    consecuencias: '',
    controles: '',
    responsable: '',
    probabilidadInherente: '3', // 1-5
    impactoInherente: '3', // 1-5
    probabilidadResidual: '2', // 1-5
    impactoResidual: '2', // 1-5
    etapa: 'IDENTIFICADO'
  });

  // Calcular zona de riesgo
  const calcularZonaRiesgo = (probabilidad: string, impacto: string): string => {
    const prob = parseInt(probabilidad);
    const imp = parseInt(impacto);
    const nivel = prob * imp;

    if (nivel >= 20) return 'EXTREMO';
    if (nivel >= 12) return 'ALTO';
    if (nivel >= 5) return 'MODERADO';
    return 'BAJO';
  };

  const zonaInherente = calcularZonaRiesgo(formData.probabilidadInherente, formData.impactoInherente);
  const zonaResidual = calcularZonaRiesgo(formData.probabilidadResidual, formData.impactoResidual);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.descripcion.trim()) {
      toast.error('La descripción del riesgo es obligatoria');
      return;
    }
    if (!formData.proceso.trim()) {
      toast.error('Debe especificar el proceso asociado');
      return;
    }
    if (!formData.responsable.trim()) {
      toast.error('Debe asignar un responsable');
      return;
    }

    const nuevoRiesgo = {
      ...formData,
      id: `R-2025-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      zonaInherente,
      zonaResidual,
      estado: 'ACTIVO',
      fechaIdentificacion: new Date(),
      fechaUltimaRevision: new Date()
    };

    if (onGuardar) {
      onGuardar(nuevoRiesgo);
    }

    toast.success('Riesgo creado exitosamente', {
      description: `${nuevoRiesgo.id} - ${formData.descripcion.substring(0, 50)}...`
    });

    onClose();
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  const getColorZona = (zona: string) => {
    switch (zona) {
      case 'EXTREMO': return { bg: '#FEE2E2', text: '#DC2626', label: '🔴 Extremo' };
      case 'ALTO': return { bg: '#FFEDD5', text: '#EA580C', label: '🟠 Alto' };
      case 'MODERADO': return { bg: '#FEF3C7', text: '#F59E0B', label: '🟡 Moderado' };
      default: return { bg: '#D1FAE5', text: '#10B981', label: '🟢 Bajo' };
    }
  };

  const colorInherente = getColorZona(zonaInherente);
  const colorResidual = getColorZona(zonaResidual);

  return (
    <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen md:min-h-0 flex items-start md:items-center justify-center p-0 md:p-4 md:py-8">
        <div className="bg-white rounded-none md:rounded-2xl shadow-2xl w-full md:max-w-4xl md:max-h-[90vh] overflow-hidden flex flex-col my-0 md:my-4">
          {/* Header con ModalHeaderClean */}
          <ModalHeaderClean
            titulo="Nuevo Riesgo Institucional"
            subtitulo="Registrar riesgo en la Matriz de Gestión de Riesgos"
            icono={AlertTriangle}
            colorIcono="red"
            badgePrincipal="CREAR RIESGO"
            onClose={onClose}
          />

          {/* Contenido del Modal */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {/* Sección 1: Identificación del Riesgo */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b-2 border-red-100">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-gray-900">Identificación del Riesgo</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion" className="text-sm font-semibold text-gray-700">
                  Descripción del Riesgo <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  id="descripcion"
                  placeholder="Ej: Posibilidad de que se venzan términos legales en procesos judiciales..."
                  value={formData.descripcion}
                  onChange={(e) => handleChange('descripcion', e.target.value)}
                  className="border-2 border-gray-300 focus:border-red-500 min-h-[80px]"
                  required
                />
                <p className="text-xs text-gray-500">
                  Describa claramente el evento de riesgo que podría ocurrir
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="proceso" className="text-sm font-semibold text-gray-700">
                    Proceso Asociado <span className="text-red-600">*</span>
                  </Label>
                  <select
                    id="proceso"
                    value={formData.proceso}
                    onChange={(e) => handleChange('proceso', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none"
                    required
                  >
                    <option value="">Seleccione proceso...</option>
                    <option value="Defensa Judicial">Defensa Judicial</option>
                    <option value="Órganos de Control">Órganos de Control</option>
                    <option value="Procesos Coactivos">Procesos Coactivos</option>
                    <option value="Juzgamiento Disciplinario">Juzgamiento Disciplinario</option>
                    <option value="Asesoría Jurídica">Asesoría Jurídica</option>
                    <option value="Gestión Contractual">Gestión Contractual</option>
                    <option value="Recursos Humanos">Recursos Humanos</option>
                    <option value="Gestión Financiera">Gestión Financiera</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipoRiesgo" className="text-sm font-semibold text-gray-700">
                    Tipo de Riesgo <span className="text-red-600">*</span>
                  </Label>
                  <select
                    id="tipoRiesgo"
                    value={formData.tipoRiesgo}
                    onChange={(e) => handleChange('tipoRiesgo', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none"
                    required
                  >
                    <option value="GESTION">📊 Gestión</option>
                    <option value="CORRUPCION">⚠️ Corrupción</option>
                    <option value="SEGURIDAD_DIGITAL">🔒 Seguridad Digital</option>
                    <option value="FISCAL">💰 Fiscal</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Sección 2: Análisis del Riesgo */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b-2 border-orange-100">
                <Target className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-gray-900">Análisis del Riesgo</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="causas" className="text-sm font-semibold text-gray-700">
                    Causas del Riesgo
                  </Label>
                  <Textarea
                    id="causas"
                    placeholder="Describa las causas o factores que originan el riesgo..."
                    value={formData.causas}
                    onChange={(e) => handleChange('causas', e.target.value)}
                    className="border-2 border-gray-300 focus:border-orange-500 min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="consecuencias" className="text-sm font-semibold text-gray-700">
                    Consecuencias del Riesgo
                  </Label>
                  <Textarea
                    id="consecuencias"
                    placeholder="Describa el impacto o consecuencias si se materializa..."
                    value={formData.consecuencias}
                    onChange={(e) => handleChange('consecuencias', e.target.value)}
                    className="border-2 border-gray-300 focus:border-orange-500 min-h-[80px]"
                  />
                </div>
              </div>
            </div>

            {/* Sección 3: Evaluación del Riesgo */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b-2 border-purple-100">
                <Activity className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-gray-900">Evaluación del Riesgo (Matriz 5x5)</h3>
              </div>

              {/* Riesgo Inherente */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-xl p-4">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-600" />
                  Riesgo Inherente (Sin controles)
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div className="space-y-2">
                    <Label htmlFor="probabilidadInherente" className="text-sm font-semibold text-gray-700">
                      Probabilidad (1-5)
                    </Label>
                    <select
                      id="probabilidadInherente"
                      value={formData.probabilidadInherente}
                      onChange={(e) => handleChange('probabilidadInherente', e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none"
                    >
                      <option value="1">1 - Raro (Ocurre cada 5+ años)</option>
                      <option value="2">2 - Improbable (Ocurre cada 2-5 años)</option>
                      <option value="3">3 - Posible (Ocurre anualmente)</option>
                      <option value="4">4 - Probable (Ocurre semestralmente)</option>
                      <option value="5">5 - Casi Seguro (Ocurre mensualmente)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="impactoInherente" className="text-sm font-semibold text-gray-700">
                      Impacto (1-5)
                    </Label>
                    <select
                      id="impactoInherente"
                      value={formData.impactoInherente}
                      onChange={(e) => handleChange('impactoInherente', e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none"
                    >
                      <option value="1">1 - Insignificante</option>
                      <option value="2">2 - Menor</option>
                      <option value="3">3 - Moderado</option>
                      <option value="4">4 - Mayor</option>
                      <option value="5">5 - Catastrófico</option>
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-3 border-2" style={{ borderColor: colorInherente.text }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">Zona de Riesgo Inherente:</span>
                    <span
                      className="px-4 py-2 rounded-full font-bold text-sm"
                      style={{
                        backgroundColor: colorInherente.bg,
                        color: colorInherente.text
                      }}
                    >
                      {colorInherente.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Nivel: {parseInt(formData.probabilidadInherente) * parseInt(formData.impactoInherente)} / 25
                  </p>
                </div>
              </div>

              {/* Riesgo Residual */}
              <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-4">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Riesgo Residual (Con controles aplicados)
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div className="space-y-2">
                    <Label htmlFor="probabilidadResidual" className="text-sm font-semibold text-gray-700">
                      Probabilidad (1-5)
                    </Label>
                    <select
                      id="probabilidadResidual"
                      value={formData.probabilidadResidual}
                      onChange={(e) => handleChange('probabilidadResidual', e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                    >
                      <option value="1">1 - Raro</option>
                      <option value="2">2 - Improbable</option>
                      <option value="3">3 - Posible</option>
                      <option value="4">4 - Probable</option>
                      <option value="5">5 - Casi Seguro</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="impactoResidual" className="text-sm font-semibold text-gray-700">
                      Impacto (1-5)
                    </Label>
                    <select
                      id="impactoResidual"
                      value={formData.impactoResidual}
                      onChange={(e) => handleChange('impactoResidual', e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                    >
                      <option value="1">1 - Insignificante</option>
                      <option value="2">2 - Menor</option>
                      <option value="3">3 - Moderado</option>
                      <option value="4">4 - Mayor</option>
                      <option value="5">5 - Catastrófico</option>
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-3 border-2" style={{ borderColor: colorResidual.text }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">Zona de Riesgo Residual:</span>
                    <span
                      className="px-4 py-2 rounded-full font-bold text-sm"
                      style={{
                        backgroundColor: colorResidual.bg,
                        color: colorResidual.text
                      }}
                    >
                      {colorResidual.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Nivel: {parseInt(formData.probabilidadResidual) * parseInt(formData.impactoResidual)} / 25
                  </p>
                </div>
              </div>
            </div>

            {/* Sección 4: Controles y Responsabilidades */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b-2 border-blue-100">
                <Shield className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900">Controles y Responsabilidades</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="controles" className="text-sm font-semibold text-gray-700">
                  Controles Existentes
                </Label>
                <Textarea
                  id="controles"
                  placeholder="Describa los controles preventivos, detectivos o correctivos implementados..."
                  value={formData.controles}
                  onChange={(e) => handleChange('controles', e.target.value)}
                  className="border-2 border-gray-300 focus:border-blue-500 min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="responsable" className="text-sm font-semibold text-gray-700">
                    Responsable del Riesgo <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="responsable"
                    placeholder="Nombre del responsable"
                    value={formData.responsable}
                    onChange={(e) => handleChange('responsable', e.target.value)}
                    className="border-2 border-gray-300 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="etapa" className="text-sm font-semibold text-gray-700">
                    Etapa del Riesgo
                  </Label>
                  <select
                    id="etapa"
                    value={formData.etapa}
                    onChange={(e) => handleChange('etapa', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="IDENTIFICADO">1️⃣ Identificado</option>
                    <option value="EVALUADO">2️⃣ Evaluado</option>
                    <option value="EN_TRATAMIENTO">3️⃣ En Tratamiento</option>
                    <option value="MONITOREADO">4️⃣ Monitoreado</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center gap-3 pt-4 border-t-2 border-gray-200">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1 border-2 border-gray-300 hover:bg-gray-50"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Crear Riesgo
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
