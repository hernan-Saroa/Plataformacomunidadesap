/**
 * FooterExpediente - Footer con acciones COMPARTIDO
 * ✅ Usada por ModalExpediente.tsx y ModalProcesoDisciplinario.tsx
 */

import { X, Bell, Share2, Download, ExternalLink, CheckCircle, Archive } from 'lucide-react';
import { Button } from '@esap-mfe/shared-ui/button';

interface FooterExpedienteProps {
  expedienteId: string;
  totalArchivos: number;
  totalActuaciones: number;
  /** Tercer conteo: tareas (DJ) o decisiones (JD) */
  tercerConteo: { label: string; valor: number; color: string };
  onClose: () => void;
  onNotificar: () => void;
  onCompartir: () => void;
  onDescargarPDF: () => void;
  onAbrirPestana?: () => void;
  onGuardar?: () => void;
  /** Bug 2: callback opcional para archivar el proceso (juzgamiento disciplinario) */
  onArchivar?: () => void;
  hasChanges?: boolean;
  labelId?: string; // "Expediente" o "Proceso"
}

export function FooterExpediente({
  expedienteId,
  totalArchivos,
  totalActuaciones,
  tercerConteo,
  onClose,
  onNotificar,
  onCompartir,
  onDescargarPDF,
  onAbrirPestana,
  onGuardar,
  onArchivar,
  hasChanges = false,
  labelId = 'Expediente'
}: FooterExpedienteProps) {
  return (
    <div className="flex-shrink-0 bg-gradient-to-r from-gray-50 to-white border-t-2 border-gray-200 px-6 py-2">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button variant="outline" onClick={onClose} className="font-bold text-xs px-2.5" style={{ minHeight: 0, height: '28px' }}>
            <X className="w-3.5 h-3.5 mr-1.5" />
            Cerrar
          </Button>
          <div className="text-xs text-gray-600 hidden md:block">
            {labelId} <strong className="font-black" style={{ color: '#003DA5' }}>{expedienteId}</strong> ·
            <strong className="text-green-600"> {totalArchivos} archivos</strong> ·
            <strong className="text-blue-600"> {totalActuaciones} actuaciones</strong> ·
            <strong style={{ color: tercerConteo.color }}> {tercerConteo.valor} {tercerConteo.label}</strong>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={onNotificar}
            className="font-bold text-xs px-2.5"
            style={{ minHeight: 0, height: '28px' }}
          >
            <Bell className="w-3.5 h-3.5 mr-1" />
            Notificar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onCompartir}
            className="font-bold text-xs px-2.5"
            style={{ minHeight: 0, height: '28px' }}
          >
            <Share2 className="w-3.5 h-3.5 mr-1" />
            Compartir
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDescargarPDF}
            className="font-bold text-xs px-2.5"
            style={{ minHeight: 0, height: '28px' }}
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            PDF
          </Button>
          {onArchivar && (
            <Button
              variant="outline"
              size="sm"
              onClick={onArchivar}
              className="font-bold text-xs text-orange-600 border-orange-300 hover:bg-orange-50 px-2.5"
              style={{ minHeight: 0, height: '28px' }}
            >
              <Archive className="w-3.5 h-3.5 mr-1" />
              Archivar
            </Button>
          )}
          {onAbrirPestana && (
            <Button
              size="sm"
              style={{ background: '#003DA5', color: '#FFFFFF', minHeight: 0, height: '28px' }}
              className="font-bold text-xs px-2.5"
              onClick={onAbrirPestana}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              Abrir en Pestaña
            </Button>
          )}
          {hasChanges && onGuardar && (
            <Button
              size="sm"
              onClick={onGuardar}
              className="font-bold text-xs px-2.5"
              style={{ background: '#003DA5', color: '#FFFFFF', minHeight: 0, height: '28px' }}
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              Guardar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
