/**
 * DialogoConfirmacion - Diálogo de Confirmación Limpio ESAP 2025
 * ✅ Diseño limpio y profesional
 * ✅ Sin gradientes fuertes
 * ✅ Altamente usable
 * ✅ Totalmente personalizable
 */

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { AlertCircle, CheckCircle, AlertTriangle, Info, Trash2, X } from 'lucide-react';

interface DialogoConfirmacionProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  titulo: string;
  mensaje: string;
  tipo?: 'peligro' | 'advertencia' | 'info' | 'exito';
  textoConfirmar?: string;
  textoCancelar?: string;
  icono?: 'eliminar' | 'advertencia' | 'info' | 'check';
}

export function DialogoConfirmacion({
  isOpen,
  onClose,
  onConfirm,
  titulo,
  mensaje,
  tipo = 'advertencia',
  textoConfirmar = 'Aceptar',
  textoCancelar = 'Cancelar',
  icono
}: DialogoConfirmacionProps) {
  
  const handleConfirmar = () => {
    onConfirm();
    onClose();
  };

  // Configuración de colores según el tipo (DISEÑO LIMPIO)
  const configs = {
    peligro: {
      bgHeader: 'bg-white',
      bgIcon: 'bg-red-50',
      colorIcon: 'text-red-600',
      borderIcon: 'border-red-200',
      bgBody: 'bg-red-50/30',
      borderColor: 'border-red-200',
      btnColor: 'bg-red-600 hover:bg-red-700',
      btnOutlineColor: 'border-red-300 text-red-700 hover:bg-red-50',
      badgeColor: 'bg-red-100 text-red-700 border-red-300',
      Icon: Trash2,
      badgeText: 'Acción Peligrosa'
    },
    advertencia: {
      bgHeader: 'bg-white',
      bgIcon: 'bg-orange-50',
      colorIcon: 'text-orange-600',
      borderIcon: 'border-orange-200',
      bgBody: 'bg-orange-50/30',
      borderColor: 'border-orange-200',
      btnColor: 'bg-orange-600 hover:bg-orange-700',
      btnOutlineColor: 'border-orange-300 text-orange-700 hover:bg-orange-50',
      badgeColor: 'bg-orange-100 text-orange-700 border-orange-300',
      Icon: AlertTriangle,
      badgeText: 'Advertencia'
    },
    info: {
      bgHeader: 'bg-white',
      bgIcon: 'bg-blue-50',
      colorIcon: 'text-blue-600',
      borderIcon: 'border-blue-200',
      bgBody: 'bg-blue-50/30',
      borderColor: 'border-blue-200',
      btnColor: 'bg-blue-600 hover:bg-blue-700',
      btnOutlineColor: 'border-blue-300 text-blue-700 hover:bg-blue-50',
      badgeColor: 'bg-blue-100 text-blue-700 border-blue-300',
      Icon: Info,
      badgeText: 'Información'
    },
    exito: {
      bgHeader: 'bg-white',
      bgIcon: 'bg-green-50',
      colorIcon: 'text-green-600',
      borderIcon: 'border-green-200',
      bgBody: 'bg-green-50/30',
      borderColor: 'border-green-200',
      btnColor: 'bg-green-600 hover:bg-green-700',
      btnOutlineColor: 'border-green-300 text-green-700 hover:bg-green-50',
      badgeColor: 'bg-green-100 text-green-700 border-green-300',
      Icon: CheckCircle,
      badgeText: 'Confirmación'
    }
  };

  const config = configs[tipo];
  const IconComponent = config.Icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="w-[95vw] max-w-[450px] lg:max-w-md p-0 overflow-hidden border-2 shadow-2xl">
        <DialogTitle className="sr-only">{titulo}</DialogTitle>
        <DialogDescription className="sr-only">{mensaje}</DialogDescription>

        {/* Header Limpio - Fondo Blanco */}
        <div className={`px-6 py-4 flex items-center justify-between border-b ${config.bgHeader}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${config.bgIcon} border-2 ${config.borderIcon}`}>
              <IconComponent className={`w-5 h-5 ${config.colorIcon}`} />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-base">{titulo}</h3>
              <Badge 
                variant="outline" 
                className={`mt-1 text-xs font-semibold border ${config.badgeColor}`}
              >
                {config.badgeText}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Cuerpo del mensaje */}
        <div className={`px-6 py-6 ${config.bgBody}`}>
          <div className="flex gap-4">
            {/* Icono grande */}
            <div className={`p-3 rounded-full ${config.bgIcon} border-2 ${config.borderIcon} flex-shrink-0`}>
              <IconComponent className={`w-8 h-8 ${config.colorIcon}`} />
            </div>
            
            {/* Mensaje */}
            <div className="flex-1">
              <p className="text-sm text-gray-700 leading-relaxed font-medium">
                {mensaje}
              </p>
            </div>
          </div>
        </div>

        {/* Footer con botones */}
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-end gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="font-semibold"
          >
            {textoCancelar}
          </Button>
          <Button
            onClick={handleConfirmar}
            className={`font-semibold text-white ${config.btnColor}`}
          >
            {textoConfirmar}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}