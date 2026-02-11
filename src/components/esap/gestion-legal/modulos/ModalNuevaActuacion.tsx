/**
 * ModalNuevaActuacion - Formulario para registrar nuevas actuaciones disciplinarias
 * ✅ Diseño corporativo ESAP 2025 con ModalHeaderClean
 * ✅ Validación completa y UX mejorada
 * ✅ Compatible con proceso disciplinario
 * ✅ TIPOS DE ACTUACIÓN CONFIGURABLES desde el sistema
 */

import { useState } from 'react';
import { Clock, Calendar, FileText, User, AlertCircle, Save, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { ModalHeaderClean } from '../../../design-system/ModalHeaderClean';
import { Button } from '../../../ui/button';
import { toast } from 'sonner@2.0.3';
import { useConfiguracionModulo } from '../config/ConfiguracionesSIGLContext';

interface ModalNuevaActuacionProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (actuacion: NuevaActuacionData) => void;
  procesoId: string;
}

export interface NuevaActuacionData {
  fecha: string;
  tipo: string;
  descripcion: string;
  responsable: string;
  estado: 'PENDIENTE' | 'COMPLETADA' | 'EN_REVISION';
  observaciones: string;
  archivoAdjunto?: string;
}

const RESPONSABLES_DISPONIBLES = [
  'Oficina Control Disciplinario Interno',
  'Jefe de Control Interno',
  'Abogado Disciplinario #1',
  'Abogado Disciplinario #2',
  'Secretaría General',
  'Otro'
];

export function ModalNuevaActuacion({ isOpen, onClose, onSave, procesoId }: ModalNuevaActuacionProps) {
  // ✅ Obtener tipos de actuaciones desde configuraciones centralizadas
  const { tiposActuacionesActivos } = useConfiguracionModulo('juzgamiento');
  
  const [formData, setFormData] = useState<NuevaActuacionData>({
    fecha: new Date().toISOString().split('T')[0], // Fecha actual por defecto
    tipo: '',
    descripcion: '',
    responsable: '',
    estado: 'COMPLETADA',
    observaciones: '',
    archivoAdjunto: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof NuevaActuacionData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fecha) {
      newErrors.fecha = 'La fecha de la actuación es obligatoria';
    }
    if (!formData.tipo) {
      newErrors.tipo = 'Seleccione el tipo de actuación';
    }
    if (!formData.descripcion.trim()) {
      newErrors.descripcion = 'La descripción de la actuación es obligatoria';
    }
    if (!formData.responsable) {
      newErrors.responsable = 'Seleccione el responsable de la actuación';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('⚠️ Formulario incompleto', {
        description: 'Por favor complete todos los campos obligatorios',
        duration: 3000
      });
      return;
    }

    // Guardar actuación
    onSave(formData);

    // Limpiar formulario
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      tipo: '',
      descripcion: '',
      responsable: '',
      estado: 'COMPLETADA',
      observaciones: '',
      archivoAdjunto: ''
    });
    setErrors({});

    // Cerrar modal
    onClose();

    toast.success('✅ Actuación registrada exitosamente', {
      description: `La actuación "${formData.tipo}" ha sido agregada al proceso ${procesoId}`,
      duration: 4000
    });
  };

  const handleCancelar = () => {
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      tipo: '',
      descripcion: '',
      responsable: '',
      estado: 'COMPLETADA',
      observaciones: '',
      archivoAdjunto: ''
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancelar}>
      <DialogContent 
        hideCloseButton
        className="w-[95vw] max-w-[750px] lg:max-w-3xl !max-h-[85vh] flex flex-col p-0 gap-0"
      >
        {/* Títulos ocultos para accesibilidad */}
        <DialogTitle className="sr-only">Nueva Actuación Disciplinaria</DialogTitle>
        <DialogDescription className="sr-only">
          Formulario de registro de nueva actuación para el proceso disciplinario {procesoId}
        </DialogDescription>

        {/* Header - flex-shrink-0 (siempre visible) */}
        <ModalHeaderClean
          icono={Clock}
          colorIcono="blue"
          titulo="Nueva Actuación Disciplinaria"
          subtitulo={`Proceso ${procesoId}`}
          badgePrincipal="Formulario de Registro"
          onClose={handleCancelar}
        />

        {/* Formulario (scrollable) */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Contenedor scrollable del formulario */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-5">
              
              {/* Sección 1: Datos Básicos */}
              <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg border-l-4 border-l-blue-600">
                <h3 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  DATOS DE LA ACTUACIÓN
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Fecha */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Fecha de la Actuación <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="date"
                        value={formData.fecha}
                        onChange={(e) => handleInputChange('fecha', e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className={`w-full pl-10 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                          errors.fecha 
                            ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      />
                    </div>
                    {errors.fecha && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.fecha}
                      </p>
                    )}
                  </div>

                  {/* Tipo de Actuación */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Tipo de Actuación <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={formData.tipo}
                      onChange={(e) => handleInputChange('tipo', e.target.value)}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                        errors.tipo 
                          ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    >
                      <option value="">Seleccione un tipo...</option>
                      {tiposActuacionesActivos.map(tipo => (
                        <option key={tipo.id} value={tipo.nombre}>{tipo.nombre}</option>
                      ))}
                    </select>
                    {errors.tipo && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.tipo}
                      </p>
                    )}
                  </div>

                  {/* Estado */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Estado de la Actuación
                    </label>
                    <select
                      value={formData.estado}
                      onChange={(e) => handleInputChange('estado', e.target.value as any)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="COMPLETADA">✅ Completada</option>
                      <option value="EN_REVISION">🔍 En Revisión</option>
                      <option value="PENDIENTE">⏳ Pendiente</option>
                    </select>
                  </div>

                  {/* Responsable */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Responsable <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={formData.responsable}
                      onChange={(e) => handleInputChange('responsable', e.target.value)}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                        errors.responsable 
                          ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    >
                      <option value="">Seleccione un responsable...</option>
                      {RESPONSABLES_DISPONIBLES.map(resp => (
                        <option key={resp} value={resp}>{resp}</option>
                      ))}
                    </select>
                    {errors.responsable && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.responsable}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sección 2: Descripción y Observaciones */}
              <div className="bg-gradient-to-br from-green-50 to-white p-4 rounded-lg border-l-4 border-l-green-600">
                <h3 className="text-sm font-bold text-green-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  DESCRIPCIÓN Y OBSERVACIONES
                </h3>
                
                <div className="space-y-4">
                  {/* Descripción */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Descripción de la Actuación <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => handleInputChange('descripcion', e.target.value)}
                      rows={4}
                      placeholder="Ej: Se notifica al disciplinado sobre el inicio del proceso disciplinario mediante oficio No. 001-2025, adjuntando copia del pliego de cargos..."
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 resize-none ${
                        errors.descripcion 
                          ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {errors.descripcion && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.descripcion}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Describa de forma clara y precisa la actuación realizada
                    </p>
                  </div>

                  {/* Observaciones */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Observaciones Adicionales (Opcional)
                    </label>
                    <textarea
                      value={formData.observaciones}
                      onChange={(e) => handleInputChange('observaciones', e.target.value)}
                      rows={3}
                      placeholder="Ej: Se envió copia al correo institucional del disciplinado. Pendiente acuse de recibo físico..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Información complementaria relevante para el proceso
                    </p>
                  </div>

                  {/* Archivo Adjunto (Opcional) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Documento Adjunto (Opcional)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                      <FileText className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 mb-2">
                        Arrastra un archivo o haz clic para seleccionar
                      </p>
                      <Button
                        type="button"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = '.pdf,.doc,.docx';
                          input.onchange = (e: any) => {
                            const file = e.target?.files?.[0];
                            if (file) {
                              handleInputChange('archivoAdjunto', file.name);
                              toast.success('✅ Archivo adjuntado', {
                                description: file.name,
                                duration: 2000
                              });
                            }
                          };
                          input.click();
                        }}
                        className="text-xs"
                        style={{ background: '#003DA5' }}
                      >
                        Seleccionar Archivo
                      </Button>
                      {formData.archivoAdjunto && (
                        <p className="text-xs text-green-600 mt-2 font-semibold">
                          ✓ {formData.archivoAdjunto}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Formatos permitidos: PDF, DOC, DOCX (máx. 10 MB)
                    </p>
                  </div>
                </div>
              </div>

              {/* Sección informativa */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-blue-900 mb-1">
                      ℹ️ Información Importante
                    </p>
                    <p className="text-xs text-blue-800">
                      Todas las actuaciones registradas quedarán documentadas en el expediente disciplinario 
                      y servirán como soporte del debido proceso. Asegúrese de registrar la información de 
                      manera completa y precisa.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Footer con botones (siempre visible) */}
          <div className="border-t bg-white px-6 py-4 flex flex-col sm:flex-row gap-3 justify-end flex-shrink-0">
            <Button
              type="button"
              onClick={handleCancelar}
              className="w-full sm:w-auto px-6 py-2 border-2 border-gray-300 bg-white text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto px-6 py-2 font-bold rounded-lg text-white flex items-center justify-center gap-2"
              style={{ background: '#003DA5' }}
            >
              <Save className="w-4 h-4" />
              Guardar Actuación
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}