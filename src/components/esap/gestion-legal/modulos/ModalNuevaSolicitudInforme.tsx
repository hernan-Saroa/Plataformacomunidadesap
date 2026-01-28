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
      <DialogContent hideCloseButton className="w-[95vw] !max-w-[680px] lg:max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogTitle className="sr-only">
          Nueva Solicitud de Informe
        </DialogTitle>
        <DialogDescription className="sr-only">
          Formulario para registrar una nueva solicitud de informe con información del solicitante, detalle de la solicitud y plazo de entrega.
        </DialogDescription>
        
        {/* Header Limpio */}
        <ModalHeaderClean
          titulo="Nueva Solicitud"
          subtitulo="Registro de solicitud de informe"
          icono={FileText}
          onClose={onClose}
        />

        {/* Contenido del formulario - SOLO ESTO HACE SCROLL */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
          <div className="space-y-4">
            {/* Grid de 2 columnas para aprovechar el ancho */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="solicitante" className="text-xs font-semibold">
                  Solicitante <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="solicitante"
                  value={formData.solicitante}
                  onChange={(e) => handleChange('solicitante', e.target.value)}
                  placeholder="Nombre completo"
                  className={`text-sm h-9 ${errores.solicitante ? 'border-red-500' : ''}`}
                />
                {errores.solicitante && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errores.solicitante}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="areaSolicitante" className="text-xs font-semibold">
                  Área/Dependencia <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="areaSolicitante"
                  value={formData.areaSolicitante}
                  onChange={(e) => handleChange('areaSolicitante', e.target.value)}
                  placeholder="Ej: Rectoría Nacional"
                  className={`text-sm h-9 ${errores.areaSolicitante ? 'border-red-500' : ''}`}
                />
                {errores.areaSolicitante && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errores.areaSolicitante}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="asunto" className="text-xs font-semibold">
                Asunto <span className="text-red-600">*</span>
              </Label>
              <Input
                id="asunto"
                value={formData.asunto}
                onChange={(e) => handleChange('asunto', e.target.value)}
                placeholder="Título breve"
                className={`text-sm h-9 ${errores.asunto ? 'border-red-500' : ''}`}
              />
              {errores.asunto && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errores.asunto}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descripcion" className="text-xs font-semibold">
                Descripción <span className="text-red-600">*</span>
              </Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => handleChange('descripcion', e.target.value)}
                placeholder="Detalle breve de la solicitud"
                rows={3}
                className={`text-sm ${errores.descripcion ? 'border-red-500' : ''}`}
              />
              {errores.descripcion && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errores.descripcion}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="entregable" className="text-xs font-semibold">
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
                  <option value="">Seleccionar</option>
                  <option value="Informe ejecutivo PDF">Informe PDF</option>
                  <option value="Informe detallado Word">Informe Word</option>
                  <option value="Base de datos Excel">Excel</option>
                  <option value="Presentación PowerPoint">PowerPoint</option>
                  <option value="Dashboard en línea">Dashboard</option>
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

              <div className="space-y-1.5">
                <Label htmlFor="fechaLimite" className="text-xs font-semibold">
                  Fecha Límite <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="fechaLimite"
                  type="date"
                  value={formData.fechaLimite}
                  onChange={(e) => handleChange('fechaLimite', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={`text-sm h-9 ${errores.fechaLimite ? 'border-red-500' : ''}`}
                />
                {errores.fechaLimite && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errores.fechaLimite}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tipoPrioridad" className="text-xs font-semibold">
                Prioridad <span className="text-red-600">*</span>
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(['NORMAL', 'URGENTE', 'CRÍTICA'] as const).map((prioridad) => (
                  <button
                    key={prioridad}
                    type="button"
                    onClick={() => handleChange('tipoPrioridad', prioridad)}
                    className={`px-4 py-2 rounded text-xs font-bold transition-all ${
                      formData.tipoPrioridad === prioridad
                        ? prioridad === 'NORMAL'
                          ? 'bg-green-500 text-white'
                          : prioridad === 'URGENTE'
                          ? 'bg-orange-500 text-white'
                          : 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {prioridad}
                  </button>
                ))}
              </div>
            </div>

            {/* Recomendaciones */}
            <div className="p-3 rounded" style={{ background: '#E0EDFF' }}>
              <p className="text-xs font-bold mb-1.5" style={{ color: '#003DA5' }}>
                💡 Recomendaciones:
              </p>
              <ul className="text-xs text-gray-600 space-y-1 ml-4">
                <li>• Sea específico en el asunto y la descripción</li>
                <li>• Defina claramente el formato del entregable</li>
              </ul>
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