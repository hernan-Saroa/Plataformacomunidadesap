/**
 * ModalNuevaSolicitudInforme - Formulario para crear nueva solicitud de informe
 * DISEÑO LIMPIO ESAP 2025
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Textarea } from '../../../ui/textarea';
import { Label } from '../../../ui/label';
import {
  FileText, Calendar, User, Building, Clock, X, AlertCircle,
  CheckCircle, Target
} from 'lucide-react';
import { ModalHeaderClean } from './ModalHeaderClean';

interface ModalNuevaSolicitudInformeProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NuevaSolicitudData) => void;
}

export interface NuevaSolicitudData {
  solicitante: string;
  areaSolicitante: string;
  asunto: string;
  descripcion: string;
  fechaLimite: string;
  tipoPrioridad: 'NORMAL' | 'URGENTE' | 'CRÍTICA';
  entregable: string;
}

export function ModalNuevaSolicitudInforme({
  isOpen,
  onClose,
  onSubmit
}: ModalNuevaSolicitudInformeProps) {
  const [formData, setFormData] = useState<NuevaSolicitudData>({
    solicitante: '',
    areaSolicitante: '',
    asunto: '',
    descripcion: '',
    fechaLimite: '',
    tipoPrioridad: 'NORMAL',
    entregable: ''
  });

  const [errores, setErrores] = useState<Record<string, string>>({});

  const handleChange = (field: keyof NuevaSolicitudData, value: string) => {
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

  const validarFormulario = (): boolean => {
    const nuevosErrores: Record<string, string> = {};

    if (!formData.solicitante.trim()) {
      nuevosErrores.solicitante = 'El nombre del solicitante es obligatorio';
    }

    if (!formData.areaSolicitante.trim()) {
      nuevosErrores.areaSolicitante = 'El área solicitante es obligatoria';
    }

    if (!formData.asunto.trim()) {
      nuevosErrores.asunto = 'El asunto es obligatorio';
    }

    if (!formData.descripcion.trim()) {
      nuevosErrores.descripcion = 'La descripción es obligatoria';
    }

    if (!formData.fechaLimite) {
      nuevosErrores.fechaLimite = 'La fecha límite es obligatoria';
    } else {
      // Validar que la fecha sea futura
      const fechaSeleccionada = new Date(formData.fechaLimite);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      if (fechaSeleccionada < hoy) {
        nuevosErrores.fechaLimite = 'La fecha límite debe ser futura';
      }
    }

    if (!formData.entregable.trim()) {
      nuevosErrores.entregable = 'El tipo de entregable es obligatorio';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = () => {
    if (validarFormulario()) {
      onSubmit(formData);
      // Resetear formulario
      setFormData({
        solicitante: '',
        areaSolicitante: '',
        asunto: '',
        descripcion: '',
        fechaLimite: '',
        tipoPrioridad: 'NORMAL',
        entregable: ''
      });
      setErrores({});
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="max-w-2xl h-[90vh] flex flex-col p-0">
        <DialogTitle className="sr-only">
          Nueva Solicitud de Informe
        </DialogTitle>
        <DialogDescription className="sr-only">
          Formulario para registrar una nueva solicitud de informe con información del solicitante, detalle de la solicitud y plazo de entrega.
        </DialogDescription>
        
        {/* Header Limpio */}
        <ModalHeaderClean
          titulo="Nueva Solicitud de Informe"
          subtitulo="Registrar nueva solicitud con plazo de entrega"
          icono={FileText}
          onClose={onClose}
        />

        {/* Contenido del formulario - SOLO ESTO HACE SCROLL */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
          <div className="space-y-6">
            {/* SECCIÓN: Información del Solicitante */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <User className="w-4 h-4 text-gray-600" />
                <h3 className="font-bold text-gray-900">Información del Solicitante</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="solicitante">
                    Nombre del Solicitante <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="solicitante"
                    value={formData.solicitante}
                    onChange={(e) => handleChange('solicitante', e.target.value)}
                    placeholder="Ej: María Fernanda López"
                    className={errores.solicitante ? 'border-red-500' : ''}
                  />
                  {errores.solicitante && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errores.solicitante}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="areaSolicitante">
                    Área/Dependencia <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="areaSolicitante"
                    value={formData.areaSolicitante}
                    onChange={(e) => handleChange('areaSolicitante', e.target.value)}
                    placeholder="Ej: Rectoría Nacional"
                    className={errores.areaSolicitante ? 'border-red-500' : ''}
                  />
                  {errores.areaSolicitante && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errores.areaSolicitante}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* SECCIÓN: Detalle de la Solicitud */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <FileText className="w-4 h-4 text-gray-600" />
                <h3 className="font-bold text-gray-900">Detalle de la Solicitud</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="asunto">
                  Asunto <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="asunto"
                  value={formData.asunto}
                  onChange={(e) => handleChange('asunto', e.target.value)}
                  placeholder="Ej: Informe trimestral de procesos judiciales activos"
                  className={errores.asunto ? 'border-red-500' : ''}
                />
                {errores.asunto && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errores.asunto}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">
                  Descripción Detallada <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => handleChange('descripcion', e.target.value)}
                  placeholder="Describa detalladamente qué información requiere, alcance del informe, destinatarios, etc."
                  rows={4}
                  className={errores.descripcion ? 'border-red-500' : ''}
                />
                {errores.descripcion && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errores.descripcion}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="entregable">
                  Tipo de Entregable <span className="text-red-600">*</span>
                </Label>
                <select
                  id="entregable"
                  value={formData.entregable}
                  onChange={(e) => handleChange('entregable', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md text-sm ${
                    errores.entregable ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Seleccione tipo de entregable</option>
                  <option value="Informe ejecutivo PDF">Informe ejecutivo PDF</option>
                  <option value="Informe detallado Word">Informe detallado Word</option>
                  <option value="Base de datos Excel">Base de datos Excel</option>
                  <option value="Presentación PowerPoint">Presentación PowerPoint</option>
                  <option value="Dashboard en línea">Dashboard en línea</option>
                  <option value="Concepto jurídico">Concepto jurídico</option>
                  <option value="Otro">Otro</option>
                </select>
                {errores.entregable && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errores.entregable}
                  </p>
                )}
              </div>
            </div>

            {/* SECCIÓN: Plazo y Prioridad */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Clock className="w-4 h-4 text-gray-600" />
                <h3 className="font-bold text-gray-900">Plazo y Prioridad</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fechaLimite">
                    Fecha Límite de Entrega <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="fechaLimite"
                    type="date"
                    value={formData.fechaLimite}
                    onChange={(e) => handleChange('fechaLimite', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={errores.fechaLimite ? 'border-red-500' : ''}
                  />
                  {errores.fechaLimite && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errores.fechaLimite}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipoPrioridad">
                    Nivel de Prioridad <span className="text-red-600">*</span>
                  </Label>
                  <select
                    id="tipoPrioridad"
                    value={formData.tipoPrioridad}
                    onChange={(e) => handleChange('tipoPrioridad', e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="NORMAL">🟢 Normal (Rutinaria)</option>
                    <option value="URGENTE">🟡 Urgente (Plazo corto)</option>
                    <option value="CRÍTICA">🔴 Crítica (Máxima prioridad)</option>
                  </select>
                </div>
              </div>

              {/* Indicador de días restantes calculado dinámicamente */}
              {formData.fechaLimite && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div className="text-xs text-blue-900">
                      <p className="font-bold">
                        Días para entrega: {Math.ceil(
                          (new Date(formData.fechaLimite).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                        )} días
                      </p>
                      <p className="text-blue-700 mt-1">
                        Fecha seleccionada: {new Date(formData.fechaLimite).toLocaleDateString('es-CO', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Info de ayuda */}
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-purple-900">
                  <p className="font-bold mb-1">💡 Recomendaciones para Solicitudes Efectivas:</p>
                  <ul className="list-disc list-inside space-y-1 text-purple-700">
                    <li>Sea específico en el asunto y la descripción</li>
                    <li>Defina claramente el alcance y destinatarios del informe</li>
                    <li>Proporcione suficiente tiempo para la elaboración (mínimo 5 días hábiles recomendado)</li>
                    <li>Indique formato de entrega preferido</li>
                    <li>Para solicitudes urgentes, coordine previamente con el equipo jurídico</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="flex-shrink-0 border-t bg-gray-50 px-6 py-4 flex items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            <span className="text-red-600">*</span> Campos obligatorios
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onClose}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              style={{ background: '#003DA5' }}
              className="text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Registrar Solicitud
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}