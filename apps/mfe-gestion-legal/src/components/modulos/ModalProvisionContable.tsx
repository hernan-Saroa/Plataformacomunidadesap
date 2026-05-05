import { useState } from 'react';
// @ts-ignore
import { toast } from 'sonner';
import { AlertCircle, DollarSign, Save, TrendingUp, Calendar, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { Label } from '@esap-mfe/shared-ui/label';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@esap-mfe/shared-ui/select';
import { legalService } from '../../../../services/api/legal.service';
import type { ExpedienteJudicial } from '../core/types';

interface ModalProvisionContableProps {
  isOpen: boolean;
  onClose: () => void;
  expediente: ExpedienteJudicial;
  onUpdate?: () => void;
}

const RIESGO_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
  Bajo:  { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  Medio: { color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',     dot: 'bg-amber-500'   },
  Alto:  { color: 'text-red-700',     bg: 'bg-red-50 border-red-200',         dot: 'bg-red-500'     },
};

export function ModalProvisionContable({ isOpen, onClose, expediente, onUpdate }: ModalProvisionContableProps) {
  const [guardando, setGuardando] = useState(false);
  const [formData, setFormData] = useState({
    nivelRiesgo: (expediente as any).nivelRiesgo || '',
    provisionContable: Number((expediente as any).provisionContable) || 0,
    fechaEstimacionProvision: (expediente as any).fechaEstimacionProvision
      ? String((expediente as any).fechaEstimacionProvision).substring(0, 10)
      : '',
    observacionesProvision: (expediente as any).observacionesProvision || (expediente as any).observacionProvision || '',
  });

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      const id = (expediente as any).uuid || expediente.id;
      await legalService.updateExpediente(id, {
        nivelRiesgo: formData.nivelRiesgo || null,
        provisionContable: formData.provisionContable || null,
        fechaEstimacionProvision: formData.fechaEstimacionProvision || null,
        observacionProvision: formData.observacionesProvision || null,
      } as any);
      toast.success('Provisión contable actualizada');
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error('Error al guardar provisión', error);
      toast.error('Error al guardar la provisión contable');
    } finally {
      setGuardando(false);
    }
  };

  const riesgoStyle = formData.nivelRiesgo ? RIESGO_CONFIG[formData.nivelRiesgo] : null;
  const superaCuantia = Number(expediente.cuantia) > 0 && formData.provisionContable > Number(expediente.cuantia);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="z-[99999] p-0 overflow-hidden rounded-2xl" style={{ width: '460px', maxWidth: '90vw' }}>
        <DialogTitle className="sr-only">Valoración y Provisión Contable</DialogTitle>
        <DialogDescription className="sr-only">
          Registre el nivel de riesgo y la provisión contable del expediente
        </DialogDescription>

        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-400 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base leading-tight">Valoración y Provisión Contable</h2>
              <p className="text-amber-100 text-xs mt-0.5">Exp. {expediente.id}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 bg-white">

          {/* Nivel de Riesgo */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Nivel de Riesgo
            </Label>
            <Select
              value={formData.nivelRiesgo}
              onValueChange={(value) => setFormData({ ...formData, nivelRiesgo: value })}
            >
              <SelectTrigger className={`h-10 border rounded-lg text-sm font-medium transition-colors ${riesgoStyle ? `${riesgoStyle.bg} ${riesgoStyle.color} border-current` : 'bg-gray-50 border-gray-200'}`}>
                <SelectValue placeholder="Seleccione nivel de riesgo..." />
              </SelectTrigger>
              <SelectContent className="z-[100000]">
                {Object.entries(RIESGO_CONFIG).map(([nivel, style]) => (
                  <SelectItem key={nivel} value={nivel}>
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                      {nivel}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Provisión + Fecha en dos columnas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                Provisión (COP)
              </Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={formData.provisionContable === 0 ? '' : String(Math.floor(formData.provisionContable))}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  if (!raw || raw.startsWith('0')) {
                    setFormData({ ...formData, provisionContable: 0 });
                    return;
                  }
                  setFormData({ ...formData, provisionContable: parseInt(raw.slice(0, 12), 10) });
                }}
                className="h-10 bg-gray-50 border-gray-200 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Fecha estimación
              </Label>
              <Input
                type="date"
                value={formData.fechaEstimacionProvision}
                onChange={(e) => setFormData({ ...formData, fechaEstimacionProvision: e.target.value })}
                className="h-10 bg-gray-50 border-gray-200 text-sm"
              />
            </div>
          </div>

          {/* Aviso supera cuantía */}
          {superaCuantia && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                La provisión supera la cuantía. Se asume que incluye intereses de mora, multas o costas acumuladas.
              </p>
            </div>
          )}

          {/* Justificación */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Justificación
            </Label>
            <Textarea
              placeholder="Detalle los motivos que sustentan la valoración y el monto..."
              value={formData.observacionesProvision}
              onChange={(e) => setFormData({ ...formData, observacionesProvision: e.target.value })}
              className="bg-gray-50 border-gray-200 text-sm min-h-[80px] resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={guardando} className="text-gray-600">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleGuardar}
            disabled={guardando}
            className="bg-amber-500 hover:bg-amber-600 text-white border-0 shadow-sm"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {guardando ? 'Guardando...' : 'Guardar Provisión'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
