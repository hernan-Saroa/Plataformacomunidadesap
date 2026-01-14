/**
 * ModalNuevoProcesoDisciplinario - Modal para crear nuevo proceso disciplinario
 * ✅ Diseño limpio ESAP 2025
 * ✅ Formulario completo con validación
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { toast } from 'sonner@2.0.3';
import { 
  Gavel, User, FileText, AlertTriangle, Calendar, 
  Save, X, Upload, Plus, Building
} from 'lucide-react';
import { ModalHeaderClean } from './ModalHeaderClean';

interface ModalNuevoProcesoDisciplinarioProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (proceso: any) => void;
}

export function ModalNuevoProcesoDisciplinario({ 
  isOpen, 
  onClose,
  onSubmit 
}: ModalNuevoProcesoDisciplinarioProps) {
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    investigado: '',
    cargo: '',
    dependencia: '',
    tipoFalta: 'LEVE',
    descripcionHechos: '',
    investigador: '',
    documentosAdjuntos: [] as File[]
  });

  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  // Validar formulario
  const validarFormulario = (): boolean => {
    const nuevosErrores: Record<string, string> = {};

    if (!formData.investigado.trim()) {
      nuevosErrores.investigado = 'El nombre del investigado es obligatorio';
    }

    if (!formData.cargo.trim()) {
      nuevosErrores.cargo = 'El cargo es obligatorio';
    }

    if (!formData.dependencia.trim()) {
      nuevosErrores.dependencia = 'La dependencia es obligatoria';
    }

    if (!formData.descripcionHechos.trim()) {
      nuevosErrores.descripcionHechos = 'La descripción de hechos es obligatoria';
    } else if (formData.descripcionHechos.trim().length < 20) {
      nuevosErrores.descripcionHechos = 'La descripción debe tener al menos 20 caracteres';
    }

    if (!formData.investigador.trim()) {
      nuevosErrores.investigador = 'El investigador asignado es obligatorio';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  // Manejar envío
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validarFormulario()) {
      toast.error('Por favor, complete todos los campos obligatorios');
      return;
    }

    setGuardando(true);

    try {
      // Simular creación
      await new Promise(resolve => setTimeout(resolve, 1500));

      const nuevoProceso = {
        id: `PD-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`,
        ...formData,
        etapa: 'E1_AVOCAMIENTO',
        diasRestantes: 90,
        diasTotales: 90,
        ultimaActuacion: 'Auto de apertura de investigación',
        fechaUltimaActuacion: new Date(),
        fechaActualizacion: new Date(),
        documentos: formData.documentosAdjuntos
      };

      if (onSubmit) {
        onSubmit(nuevoProceso);
      }

      toast.success('Proceso disciplinario creado exitosamente', {
        description: `Proceso ${nuevoProceso.id} en etapa de Avocamiento`
      });

      onClose();
      
      // Resetear formulario
      setFormData({
        investigado: '',
        cargo: '',
        dependencia: '',
        tipoFalta: 'LEVE',
        descripcionHechos: '',
        investigador: '',
        documentosAdjuntos: []
      });
      setErrores({});

    } catch (error) {
      toast.error('Error al crear el proceso disciplinario');
    } finally {
      setGuardando(false);
    }
  };

  // Manejar cambio en inputs
  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo
    if (errores[field]) {
      setErrores(prev => {
        const nuevos = { ...prev };
        delete nuevos[field];
        return nuevos;
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogTitle className="sr-only">
          Nuevo Proceso Disciplinario
        </DialogTitle>
        <DialogDescription className="sr-only">
          Formulario para crear un nuevo proceso disciplinario contra un funcionario
        </DialogDescription>

        {/* Header Limpio ESAP 2025 */}
        <ModalHeaderClean
          icono={Gavel}
          titulo="Nuevo Proceso Disciplinario"
          subtitulo="Complete la información del funcionario investigado"
          colorIcono="blue"
          onClose={onClose}
        />

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            
            {/* SECCIÓN 1: Datos del Investigado */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <User className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900">Datos del Investigado</h3>
              </div>

              {/* Nombre completo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.investigado}
                  onChange={(e) => handleChange('investigado', e.target.value)}
                  placeholder="Ej: Juan Carlos Pérez López"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errores.investigado ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errores.investigado && (
                  <p className="text-sm text-red-600 mt-1">{errores.investigado}</p>
                )}
              </div>

              {/* Cargo y Dependencia */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cargo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.cargo}
                    onChange={(e) => handleChange('cargo', e.target.value)}
                    placeholder="Ej: Coordinador Académico"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errores.cargo ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errores.cargo && (
                    <p className="text-sm text-red-600 mt-1">{errores.cargo}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Dependencia <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.dependencia}
                    onChange={(e) => handleChange('dependencia', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errores.dependencia ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Seleccione...</option>
                    <option value="Rectoría Nacional">Rectoría Nacional</option>
                    <option value="Dirección Académica">Dirección Académica</option>
                    <option value="Dirección Financiera">Dirección Financiera</option>
                    <option value="Dirección Administrativa">Dirección Administrativa</option>
                    <option value="Talento Humano">Talento Humano</option>
                    <option value="Planeación Estratégica">Planeación Estratégica</option>
                    <option value="Territorial Bogotá">Territorial Bogotá</option>
                    <option value="Territorial Medellín">Territorial Medellín</option>
                    <option value="Territorial Cali">Territorial Cali</option>
                  </select>
                  {errores.dependencia && (
                    <p className="text-sm text-red-600 mt-1">{errores.dependencia}</p>
                  )}
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: Tipo de Falta */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-gray-900">Tipo de Falta</h3>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Clasificación de la Falta <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3 flex-wrap">
                  {['LEVE', 'GRAVE', 'GRAVÍSIMA'].map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => handleChange('tipoFalta', tipo)}
                      className={`px-4 py-2 rounded-lg border-2 font-semibold transition-all ${
                        formData.tipoFalta === tipo
                          ? tipo === 'LEVE' 
                            ? 'bg-green-100 border-green-500 text-green-700'
                            : tipo === 'GRAVE'
                            ? 'bg-orange-100 border-orange-500 text-orange-700'
                            : 'bg-red-100 border-red-500 text-red-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: Descripción de Hechos */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <FileText className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-gray-900">Descripción de los Hechos</h3>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descripción Detallada <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.descripcionHechos}
                  onChange={(e) => handleChange('descripcionHechos', e.target.value)}
                  placeholder="Describa los hechos que motivan el inicio del proceso disciplinario (mínimo 20 caracteres)"
                  rows={6}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                    errores.descripcionHechos ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <div className="flex justify-between items-center mt-1">
                  {errores.descripcionHechos && (
                    <p className="text-sm text-red-600">{errores.descripcionHechos}</p>
                  )}
                  <p className="text-xs text-gray-500 ml-auto">
                    {formData.descripcionHechos.length} caracteres
                  </p>
                </div>
              </div>
            </div>

            {/* SECCIÓN 4: Investigador Asignado */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Building className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-gray-900">Asignación</h3>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Investigador Asignado <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.investigador}
                  onChange={(e) => handleChange('investigador', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errores.investigador ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Seleccione un investigador...</option>
                  <option value="Dr. Carlos Mendoza">Dr. Carlos Mendoza</option>
                  <option value="Dra. Patricia Ruiz">Dra. Patricia Ruiz</option>
                  <option value="Dr. Roberto Castro">Dr. Roberto Castro</option>
                  <option value="Dra. Sandra Cruz">Dra. Sandra Cruz</option>
                  <option value="Dr. Ana López">Dr. Ana López</option>
                  <option value="Dra. Elena Morales">Dra. Elena Morales</option>
                </select>
                {errores.investigador && (
                  <p className="text-sm text-red-600 mt-1">{errores.investigador}</p>
                )}
              </div>
            </div>

          </div>
        </form>

        {/* Footer con Botones */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={guardando}
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={guardando}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {guardando ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Crear Proceso
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}