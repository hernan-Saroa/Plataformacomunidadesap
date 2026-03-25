/**
 * FooterExpediente - Footer con acciones COMPARTIDO
 * ✅ Usada por ModalExpediente.tsx y ModalProcesoDisciplinario.tsx
 */

import { X, Bell, Share2, Download, ExternalLink, CheckCircle } from 'lucide-react';
import { Button } from '../../../ui/button';

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
  hasChanges = false,
  labelId = 'Expediente'
}: FooterExpedienteProps) {
  return (
    <div className="flex-shrink-0 bg-gradient-to-r from-gray-50 to-white border-t-2 border-gray-200 px-6 py-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button variant="outline" onClick={onClose} className="font-bold">
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
            className="font-bold text-xs"
          >
            <Bell className="w-3.5 h-3.5 mr-1" />
            Notificar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onCompartir}
            className="font-bold text-xs"
          >
            <Share2 className="w-3.5 h-3.5 mr-1" />
            Compartir
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDescargarPDF}
            className="font-bold text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            PDF
          </Button>
          {onAbrirPestana && (
            <Button
              size="sm"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
              className="font-bold text-xs"
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
              className="font-bold text-xs"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
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
