/**
 * ModalNuevaConsulta - Modal para crear nueva consulta jurídica
 * ✅ Diseño corporativo ESAP 2025
 * ✅ Header limpio profesional
 * ✅ Formulario completo con validaciones
 */

import { useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { 
  FileQuestion, Building2, User, Calendar, Clock, AlertTriangle,
  CheckCircle, Send, X, Plus, FileText, Scale
} from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Textarea } from '../../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { ModalHeaderClean } from './ModalHeaderClean';

import type { TemaJuridico, PrioridadConsulta } from '../core/types';

interface ModalNuevaConsultaProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: NuevaConsultaData) => void;
}

export interface NuevaConsultaData {
  temaJuridico: TemaJuridico;
  solicitante: string;
  funcionarioSolicitante: string;
  cargo: string;
  consulta: string;
  prioridad: PrioridadConsulta;
  documentosAdjuntos?: File[];
}

export function ModalNuevaConsulta({ isOpen, onClose, onSubmit }: ModalNuevaConsultaProps) {
  const [formData, setFormData] = useState<Partial<NuevaConsultaData>>({
    temaJuridico: 'Contractual',
    prioridad: 'MEDIA'
  });
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.solicitante?.trim()) {
      toast.error('⚠️ Error de validación', { description: 'Debe ingresar la dependencia solicitante' });
      return;
    }
    if (!formData.funcionarioSolicitante?.trim()) {
      toast.error('⚠️ Error de validación', { description: 'Debe ingresar el nombre del funcionario' });
      return;
    }
    if (!formData.consulta?.trim()) {
      toast.error('⚠️ Error de validación', { description: 'Debe ingresar la consulta jurídica' });
      return;
    }

    setEnviando(true);
    
    try {
      // Simulación de envío
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const nuevaConsulta: NuevaConsultaData = {
        temaJuridico: formData.temaJuridico || 'Contractual',
        solicitante: formData.solicitante!,
        funcionarioSolicitante: formData.funcionarioSolicitante!,
        cargo: formData.cargo || '',
        consulta: formData.consulta!,
        prioridad: formData.prioridad || 'MEDIA'
      };

      if (onSubmit) {
        onSubmit(nuevaConsulta);
      }

      const consecutivo = `CJ-2025-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;
      
      toast.success('✅ Consulta Jurídica Registrada', {
        description: `${consecutivo} - ${formData.temaJuridico}`,
        duration: 4000
      });

      // Resetear formulario
      setFormData({
        temaJuridico: 'Contractual',
        prioridad: 'MEDIA'
      });
      
      onClose();
    } catch (error) {
      toast.error('❌ Error al registrar consulta', {
        description: 'Por favor intente nuevamente'
      });
    } finally {
      setEnviando(false);
    }
  };

  const handleCancel = () => {
    if (formData.solicitante || formData.consulta) {
      if (!window.confirm('¿Está seguro que desea cancelar? Se perderán los datos ingresados.')) {
        return;
      }
    }
    setFormData({
      temaJuridico: 'Contractual',
      prioridad: 'MEDIA'
    });
    onClose();
  };

  const getPrioridadBadge = (prioridad: PrioridadConsulta) => {
    const configs = {
      'URGENTE': { bg: '#DC2626', label: '🔴 Urgente' },
      'ALTA': { bg: '#F59E0B', label: '🟠 Alta' },
      'MEDIA': { bg: '#10B981', label: '🟡 Media' },
      'BAJA': { bg: '#6B7280', label: '⚪ Baja' }
    };
    const config = configs[prioridad];
    return (
      <Badge style={{ background: config.bg, color: '#FFFFFF', border: 'none' }}>
        {config.label}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="w-[95vw] max-w-[650px] lg:max-w-2xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogTitle className="sr-only">Nueva Consulta Jurídica</DialogTitle>
        <DialogDescription className="sr-only">
          Registrar nueva solicitud de asesoría jurídica interna
        </DialogDescription>

        {/* HEADER - flex-shrink-0 (siempre visible) */}
        <ModalHeaderClean
          icono={FileQuestion}
          colorIcono="blue"
          titulo="Nueva Consulta Jurídica"
          subtitulo="Registrar solicitud de asesoría jurídica interna"
          badgePrincipal="Formulario de Registro"
          onClose={onClose}
        />

        {/* CONTENIDO - flex-1 overflow-y-auto (solo esto hace scroll) */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información de la Consulta */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3 mb-4">
                <Scale className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-gray-900">Clasificación de la Consulta</h3>
                  <p className="text-sm text-gray-600">Seleccione el tema jurídico y la prioridad</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="temaJuridico" className="text-sm font-bold text-gray-700">
                    Tema Jurídico <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.temaJuridico}
                    onValueChange={(value) => setFormData({ ...formData, temaJuridico: value as TemaJuridico })}
                  >
                    <SelectTrigger id="temaJuridico">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Contractual">📋 Contractual</SelectItem>
                      <SelectItem value="Laboral">👥 Laboral</SelectItem>
                      <SelectItem value="Disciplinario">⚖️ Disciplinario</SelectItem>
                      <SelectItem value="Presupuestal">💰 Presupuestal</SelectItem>
                      <SelectItem value="Administrativo">🏛️ Administrativo</SelectItem>
                      <SelectItem value="Otros">📁 Otros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prioridad" className="text-sm font-bold text-gray-700">
                    Prioridad <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.prioridad}
                    onValueChange={(value) => setFormData({ ...formData, prioridad: value as PrioridadConsulta })}
                  >
                    <SelectTrigger id="prioridad">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="URGENTE">🔴 Urgente (24 horas)</SelectItem>
                      <SelectItem value="ALTA">🟠 Alta (3 días)</SelectItem>
                      <SelectItem value="MEDIA">🟡 Media (5 días)</SelectItem>
                      <SelectItem value="BAJA">⚪ Baja (10 días)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Información del Solicitante */}
            <Card className="p-4 bg-gray-50 border-gray-200">
              <div className="flex items-start gap-3 mb-4">
                <Building2 className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-gray-900">Datos del Solicitante</h3>
                  <p className="text-sm text-gray-600">Dependencia y funcionario que realiza la consulta</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="solicitante" className="text-sm font-bold text-gray-700">
                    Dependencia Solicitante <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="solicitante"
                    placeholder="Ej: Dirección de Contratación, Talento Humano..."
                    value={formData.solicitante || ''}
                    onChange={(e) => setFormData({ ...formData, solicitante: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="funcionario" className="text-sm font-bold text-gray-700">
                      Funcionario Solicitante <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="funcionario"
                      placeholder="Nombre completo del funcionario"
                      value={formData.funcionarioSolicitante || ''}
                      onChange={(e) => setFormData({ ...formData, funcionarioSolicitante: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cargo" className="text-sm font-bold text-gray-700">
                      Cargo
                    </Label>
                    <Input
                      id="cargo"
                      placeholder="Ej: Coordinador, Profesional Especializado..."
                      value={formData.cargo || ''}
                      onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Consulta */}
            <Card className="p-4 bg-gray-50 border-gray-200">
              <div className="flex items-start gap-3 mb-4">
                <FileText className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-gray-900">Consulta Jurídica</h3>
                  <p className="text-sm text-gray-600">Describa detalladamente la consulta</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="consulta" className="text-sm font-bold text-gray-700">
                  Pregunta o Solicitud de Concepto <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="consulta"
                  placeholder="Describa la consulta jurídica de forma clara y detallada, incluyendo el contexto y los aspectos normativos relevantes..."
                  value={formData.consulta || ''}
                  onChange={(e) => setFormData({ ...formData, consulta: e.target.value })}
                  rows={8}
                  required
                  className="resize-none"
                />
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Mínimo 50 caracteres</span>
                  <span>{(formData.consulta || '').length} caracteres</span>
                </div>
              </div>
            </Card>

            {/* Información Importante */}
            <Card className="p-4 bg-amber-50 border-amber-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-bold text-amber-900">Información Importante</h4>
                  <ul className="text-sm text-amber-800 space-y-1 list-disc pl-5">
                    <li>La consulta será asignada automáticamente al profesional con experticia en el tema</li>
                    <li>Los plazos de respuesta se cuentan desde el momento de radicación</li>
                    <li>Recibirá notificación por correo electrónico cuando se emita el concepto jurídico</li>
                    <li>Puede adjuntar documentos complementarios después del registro inicial</li>
                  </ul>
                </div>
              </div>
            </Card>
          </form>
        </div>

        {/* FOOTER - flex-shrink-0 (siempre visible) */}
        <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
          <p className="text-xs text-gray-600">
            Los campos marcados con <span className="text-red-500 font-bold">*</span> son obligatorios
          </p>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={enviando}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={enviando}
              style={{ background: '#2962FF', color: '#FFFFFF' }}
            >
              {enviando ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Registrar Consulta
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}