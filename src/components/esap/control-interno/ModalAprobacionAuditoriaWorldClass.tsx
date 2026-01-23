/**
 * ============================================
 * MODAL APROBACIÓN AUDITORÍA - WORLD CLASS
 * ============================================
 * 
 * Modal de confirmación para aprobar auditorías
 * Usa ModalWorldClass como base
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Enero 2025
 */

import { useState } from 'react';
import { CheckCircle, AlertTriangle, FileText, Calendar, User, Shield } from 'lucide-react';
import { ModalWorldClass } from './ModalWorldClass';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

interface Auditoria {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  territorial: string;
  auditorLider: {
    nombre: string;
    cargo: string;
  };
  fechaInicio: string;
  fechaFin: string;
  riesgo: 'Alto' | 'Medio' | 'Bajo';
}

interface ModalAprobacionAuditoriaProps {
  auditoria: Auditoria | null;
  open: boolean;
  onClose: () => void;
  onAprobar: (auditoria: Auditoria, observaciones: string) => void;
}

// ============ COMPONENTE PRINCIPAL ============

export function ModalAprobacionAuditoriaWorldClass({
  auditoria,
  open,
  onClose,
  onAprobar
}: ModalAprobacionAuditoriaProps) {
  const [observaciones, setObservaciones] = useState('');
  const [confirmado, setConfirmado] = useState(false);

  if (!auditoria) return null;

  // Badges dinámicos
  const badges = [
    { 
      label: 'Pendiente de aprobación', 
      variant: 'warning' as const 
    },
    { 
      label: `Riesgo ${auditoria.riesgo}`,
      icon: <Shield className="w-3.5 h-3.5" />,
      variant: 
        auditoria.riesgo === 'Alto' ? 'danger' :
        auditoria.riesgo === 'Medio' ? 'warning' :
        'success' as const
    }
  ];

  const handleAprobar = () => {
    if (!confirmado) {
      toast.error('Debes confirmar la aprobación marcando la casilla');
      return;
    }

    onAprobar(auditoria, observaciones);
    toast.success('Auditoría aprobada correctamente', {
      description: `${auditoria.codigo} ha sido aprobada y pasará a ejecución.`
    });
    onClose();
    setObservaciones('');
    setConfirmado(false);
  };

  return (
    <ModalWorldClass
      isOpen={open}
      onClose={onClose}
      titulo="Aprobar Auditoría"
      codigo={auditoria.codigo}
      icono={<CheckCircle className="w-6 h-6" />}
      badges={badges}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleAprobar}
            disabled={!confirmado}
            className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Aprobar Auditoría
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Información de la auditoría */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-3">
            Información de la Auditoría
          </h3>
          <div className="space-y-2">
            <InfoRow
              icon={<FileText className="w-4 h-4" />}
              label="Título"
              value={auditoria.titulo}
            />
            <InfoRow
              icon={<Calendar className="w-4 h-4" />}
              label="Período"
              value={`${auditoria.fechaInicio} - ${auditoria.fechaFin}`}
            />
            <InfoRow
              icon={<User className="w-4 h-4" />}
              label="Auditor Líder"
              value={`${auditoria.auditorLider.nombre} (${auditoria.auditorLider.cargo})`}
            />
            <InfoRow
              icon={<Shield className="w-4 h-4" />}
              label="Nivel de Riesgo"
              value={auditoria.riesgo}
            />
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Descripción del Alcance
          </label>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-700 leading-relaxed">
              {auditoria.descripcion}
            </p>
          </div>
        </div>

        {/* Observaciones (opcional) */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Observaciones de Aprobación (Opcional)
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Escribe aquí cualquier observación o recomendación para el equipo auditor..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
          />
          <p className="text-xs text-gray-500 mt-2">
            Las observaciones serán visibles para el equipo auditor
          </p>
        </div>

        {/* Confirmación */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-amber-900 mb-2">
                Confirma que deseas aprobar esta auditoría
              </h4>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmado}
                  onChange={(e) => setConfirmado(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 leading-relaxed">
                  Confirmo que he revisado toda la información de esta auditoría y autorizo 
                  su inicio en la fase de ejecución. El equipo auditor podrá comenzar las 
                  actividades de campo según el cronograma establecido.
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </ModalWorldClass>
  );
}

// ============ COMPONENTE AUXILIAR ============

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 text-blue-600 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-blue-700 font-medium mb-0.5">{label}</p>
        <p className="text-sm text-gray-900">{value}</p>
      </div>
    </div>
  );
}
