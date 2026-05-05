/**
 * COMPONENTE - GESTIÓN DE ASIGNACIONES MÚLTIPLES DE SEDES
 * Permite asignar un usuario a múltiples sedes con diferentes configuraciones
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, Plus, X, MapPin, Star, Calendar, AlertCircle, 
  Check, Edit2, Trash2, ChevronDown
} from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Button } from '@esap-mfe/shared-ui/button';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { toast } from 'sonner';
import type { CreateAsignacionSedeDTO } from '../../types';
import { estructuraService } from '../../services/estructuraService';

interface GestionAsignacionesSedesProps {
  asignaciones: CreateAsignacionSedeDTO[];
  onChange: (asignaciones: CreateAsignacionSedeDTO[]) => void;
  sedePrincipalId?: string;
  onSedePrincipalChange?: (sedeId: string | undefined) => void;
  className?: string;
  required?: boolean;
  error?: string;
}

export function GestionAsignacionesSedes({
  asignaciones,
  onChange,
  sedePrincipalId,
  onSedePrincipalChange,
  className = '',
  required = false,
  error,
}: GestionAsignacionesSedesProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [loadingSedes, setLoadingSedes] = useState(false);

  // Fallback local (si falla el endpoint)
  const fallbackSedesDisponibles = [
    { id: '1', codigo: 'SEDE-NAL', nombre: 'Sede Nacional', nivel: 'nacional' as const, ciudad: 'Bogotá D.C.' },
    { id: '2', codigo: 'DIR-BOG', nombre: 'Dirección Territorial Bogotá', nivel: 'territorial' as const, ciudad: 'Bogotá D.C.' },
    { id: '3', codigo: 'DIR-ANT', nombre: 'Dirección Territorial Antioquia', nivel: 'territorial' as const, ciudad: 'Medellín' },
    { id: '4', codigo: 'CRE-MED', nombre: 'Centro Regional Medellín', nivel: 'regional' as const, ciudad: 'Medellín' },
    { id: '5', codigo: 'DIR-VAL', nombre: 'Dirección Territorial Valle del Cauca', nivel: 'territorial' as const, ciudad: 'Cali' },
  ];
  const [sedesDisponibles, setSedesDisponibles] = useState(fallbackSedesDisponibles);

  useEffect(() => {
    const loadSedes = async () => {
      try {
        setLoadingSedes(true);
        const response = await estructuraService.obtenerEstructura();
        const seccionales = response.data?.seccionales || [];
        const sedes = response.data?.sedes || [];

        if (sedes.length === 0) {
          setSedesDisponibles(fallbackSedesDisponibles);
          return;
        }

        const seccionalById = new Map<number, string>(
          seccionales.map((sec: any) => [sec.idSeccional, sec.nomSeccional]),
        );

        const sedesMapped = sedes.map((sede: any) => ({
          id: String(sede.idSede),
          codigo: sede.codSede || `SEDE-${sede.idSede}`,
          nombre: sede.nomSede,
          nivel: 'sede' as const,
          ciudad: sede.geopolitica?.nomDivGeopolitica || seccionalById.get(sede.idSeccional) || 'Sin ubicación',
        }));

        setSedesDisponibles(sedesMapped);
      } catch (error) {
        console.error('Error cargando sedes desde estructura-organizacional:', error);
        setSedesDisponibles(fallbackSedesDisponibles);
      } finally {
        setLoadingSedes(false);
      }
    };

    loadSedes();
  }, []);

  const handleAgregarAsignacion = (asignacion: CreateAsignacionSedeDTO) => {
    // Validar que no esté duplicada
    if (asignaciones.some(a => a.unidadId === asignacion.unidadId)) {
      toast.error('Esta sede ya está asignada al usuario');
      return;
    }

    const nuevasAsignaciones = [...asignaciones, asignacion];
    onChange(nuevasAsignaciones);

    // Si es la primera asignación y se marca como principal, actualizar sede principal
    if (asignacion.esPrincipal && onSedePrincipalChange) {
      onSedePrincipalChange(asignacion.unidadId);
    }

    toast.success('Sede asignada correctamente');
    setShowAddModal(false);
  };

  const handleEditarAsignacion = (index: number, asignacion: CreateAsignacionSedeDTO) => {
    const nuevasAsignaciones = [...asignaciones];
    nuevasAsignaciones[index] = asignacion;
    onChange(nuevasAsignaciones);

    // Si se marca como principal, actualizar y desmarcar las demás
    if (asignacion.esPrincipal && onSedePrincipalChange) {
      onSedePrincipalChange(asignacion.unidadId);
      // Desmarcar otras como principales
      nuevasAsignaciones.forEach((a, i) => {
        if (i !== index) a.esPrincipal = false;
      });
      onChange(nuevasAsignaciones);
    }

    toast.success('Asignación actualizada');
    setEditingIndex(null);
  };

  const handleEliminarAsignacion = (index: number) => {
    const asignacion = asignaciones[index];
    const nuevasAsignaciones = asignaciones.filter((_, i) => i !== index);
    onChange(nuevasAsignaciones);

    // Si era la sede principal, limpiar
    if (asignacion.esPrincipal && onSedePrincipalChange) {
      onSedePrincipalChange(undefined);
    }

    toast.success('Sede eliminada de las asignaciones');
  };

  const handleMarcarPrincipal = (index: number) => {
    const nuevasAsignaciones = asignaciones.map((a, i) => ({
      ...a,
      esPrincipal: i === index,
    }));
    onChange(nuevasAsignaciones);

    if (onSedePrincipalChange) {
      onSedePrincipalChange(asignaciones[index].unidadId);
    }

    toast.success('Sede principal actualizada');
  };

  const getSedeName = (unidadId: string) => {
    return sedesDisponibles.find(s => s.id === unidadId)?.nombre || 'Sede desconocida';
  };

  const getSedeInfo = (unidadId: string) => {
    return sedesDisponibles.find(s => s.id === unidadId);
  };

  const nivelColors = {
    nacional: { bg: 'bg-blue-100', text: 'text-blue-700' },
    territorial: { bg: 'bg-green-100', text: 'text-green-700' },
    regional: { bg: 'bg-purple-100', text: 'text-purple-700' },
    sede: { bg: 'bg-orange-100', text: 'text-orange-700' },
  };

  const ambitoLabels: Record<string, string> = {
    nacional: 'Nacional',
    territorial: 'Territorial',
    regional: 'Regional',
    local: 'Local',
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700">
          Asignación de Sedes
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {asignaciones.length == 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAddModal(true)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Agregar Sede
        </Button>
        )}
      </div>

      {/* Lista de asignaciones */}
      {asignaciones.length === 0 ? (
        <Card className="p-6 text-center border-dashed">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-1">
            No hay sedes asignadas
          </p>
          <p className="text-xs text-gray-500">
            {required ? 'Debe asignar al menos una sede al usuario' : 'Agregue sedes para este usuario'}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {asignaciones.map((asignacion, index) => {
            const sede = getSedeInfo(asignacion.unidadId);
            if (!sede) return null;

            const color = nivelColors[sede.nivel] || nivelColors.regional;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="group"
              >
                <Card className={`p-4 hover:shadow-md transition-all ${
                  asignacion.esPrincipal ? 'border-2 border-[#003DA5] bg-blue-50/50' : ''
                }`}>
                  <div className="flex items-start gap-3">
                    {/* Ícono de sede */}
                    <div className={`w-10 h-10 rounded-lg ${color.bg} flex items-center justify-center flex-shrink-0`}>
                      <Building2 className={`w-5 h-5 ${color.text}`} />
                    </div>

                    {/* Información */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{sede.nombre}</span>
                        {asignacion.esPrincipal && (
                          <Badge className="bg-[#003DA5] text-white gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            Principal
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <span className="font-mono text-xs">{sede.codigo}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {sede.ciudad}
                        </span>
                        <Badge variant="secondary" className={`${color.bg} ${color.text} border-0`}>
                          {sede.nivel}
                        </Badge>
                        <Badge variant="outline">
                          Ámbito: {ambitoLabels[asignacion.ambitoAcceso]}
                        </Badge>
                      </div>

                      {asignacion.observaciones && (
                        <p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
                          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {asignacion.observaciones}
                        </p>
                      )}

                      {(asignacion.fechaInicio || asignacion.fechaFin) && (
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {asignacion.fechaInicio ? new Date(asignacion.fechaInicio).toLocaleDateString() : 'Desde siempre'}
                          </span>
                          {asignacion.fechaFin && (
                            <>
                              <span>→</span>
                              <span>{new Date(asignacion.fechaFin).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!asignacion.esPrincipal && (
                        <button
                          type="button"
                          onClick={() => handleMarcarPrincipal(index)}
                          className="w-8 h-8 rounded-lg hover:bg-blue-50 flex items-center justify-center text-blue-600 transition-colors"
                          title="Marcar como principal"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditingIndex(index)}
                        className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEliminarAsignacion(index)}
                        className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-600 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}

      {/* Información adicional */}
      <p className="mt-2 text-xs text-gray-500">
        {asignaciones.length === 0 
          ? 'El usuario debe tener al menos una sede asignada'
          : `${asignaciones.length} sede${asignaciones.length > 1 ? 's' : ''} asignada${asignaciones.length > 1 ? 's' : ''}. ${asignaciones.some(a => a.esPrincipal) ? '' : 'Marque una como principal.'}`
        }
      </p>

      {/* Modal Agregar/Editar */}
      {(showAddModal || editingIndex !== null) && (
        <FormularioAsignacionSede
          isOpen={showAddModal || editingIndex !== null}
          onClose={() => {
            setShowAddModal(false);
            setEditingIndex(null);
          }}
          onSave={(asignacion) => {
            if (editingIndex !== null) {
              handleEditarAsignacion(editingIndex, asignacion);
            } else {
              handleAgregarAsignacion(asignacion);
            }
          }}
          asignacion={editingIndex !== null ? asignaciones[editingIndex] : undefined}
          sedesDisponibles={sedesDisponibles}
          sedesYaAsignadas={asignaciones.map(a => a.unidadId)}
          loadingSedes={loadingSedes}
        />
      )}
    </div>
  );
}

// ============================================================================
// FORMULARIO DE ASIGNACIÓN
// ============================================================================

interface FormularioAsignacionSedeProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (asignacion: CreateAsignacionSedeDTO) => void;
  asignacion?: CreateAsignacionSedeDTO;
  sedesDisponibles: any[];
  sedesYaAsignadas: string[];
  loadingSedes?: boolean;
}

function FormularioAsignacionSede({
  isOpen,
  onClose,
  onSave,
  asignacion,
  sedesDisponibles,
  sedesYaAsignadas,
  loadingSedes = false,
}: FormularioAsignacionSedeProps) {
  const [formData, setFormData] = useState<CreateAsignacionSedeDTO>(
    asignacion || {
      unidadId: '',
      ambitoAcceso: 'local',
      esPrincipal: false,
      fechaInicio: new Date().toISOString().split('T')[0],
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!formData.unidadId) {
      toast.error('Debe seleccionar una sede');
      return;
    }

    onSave(formData);
  };

  const sedesFiltradas = sedesDisponibles.filter(
    s => !sedesYaAsignadas.includes(s.id) || s.id === asignacion?.unidadId
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-xl shadow-2xl z-50 max-h-[90vh] overflow-y-auto"
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">
              {asignacion ? 'Editar Asignación de Sede' : 'Agregar Sede'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Selector de Sede */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sede <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.unidadId}
                onChange={(e) => setFormData({ ...formData, unidadId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
                required
                disabled={!!asignacion} // No permitir cambiar sede en edición
              >
                <option value="">Seleccionar sede...</option>
                {loadingSedes && <option value="" disabled>Cargando sedes...</option>}
                {sedesFiltradas.map((sede) => (
                  <option key={sede.id} value={sede.id}>
                    {sede.nombre} ({sede.codigo}) - {sede.ciudad}
                  </option>
                ))}
              </select>
            </div>

            {/* Ámbito de Acceso */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ámbito de Acceso <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.ambitoAcceso}
                onChange={(e) => setFormData({ ...formData, ambitoAcceso: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
                required
              >
                <option value="local">Local - Solo esta sede</option>
                <option value="regional">Regional - Esta sede y centros regionales</option>
                <option value="territorial">Territorial - Esta territorial y subordinados</option>
                <option value="nacional">Nacional - Toda la estructura</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Define qué información puede ver el usuario desde esta sede
              </p>
            </div>

            {/* Marcar como Principal */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <input
                type="checkbox"
                id="esPrincipal"
                checked={formData.esPrincipal}
                onChange={(e) => setFormData({ ...formData, esPrincipal: e.target.checked })}
                className="mt-1 w-4 h-4 text-[#003DA5] border-gray-300 rounded focus:ring-[#003DA5]"
              />
              <label htmlFor="esPrincipal" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 font-medium text-gray-900">
                  <Star className="w-4 h-4 text-[#003DA5]" />
                  Marcar como sede principal
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Esta será la sede principal del usuario en el sistema
                </p>
              </label>
            </div>

            {/* Fecha Inicio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Inicio
              </label>
              <input
                type="date"
                value={formData.fechaInicio}
                onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
              />
            </div>

            {/* Fecha Fin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Fin (Opcional)
              </label>
              <input
                type="date"
                value={formData.fechaFin || ''}
                onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value || undefined })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
                min={formData.fechaInicio}
              />
              <p className="mt-1 text-xs text-gray-500">
                Dejar vacío si la asignación no tiene fecha de expiración
              </p>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                value={formData.observaciones || ''}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] resize-none"
                placeholder="Notas adicionales sobre esta asignación..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-[#003DA5] hover:bg-[#002d7a]">
              <Check className="w-4 h-4 mr-2" />
              {asignacion ? 'Guardar Cambios' : 'Agregar Sede'}
            </Button>
          </div>
        </form>
      </motion.div>
    </>
  );
}
