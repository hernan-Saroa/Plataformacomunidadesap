/**
 * MODAL - CREAR/EDITAR UNIDAD ORGANIZACIONAL
 * Formulario completo para crear o editar unidades territoriales ESAP
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Hash,
  AlertCircle,
  CheckCircle,
  Users,
  Calendar,
  FileText,
  Globe
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import type { UnidadOrganizacional, NivelEstructura, EstadoEstructura } from '../../types/estructura-organizacional.types';

interface CreateUnidadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (unidad: Partial<UnidadOrganizacional>) => void;
  unidadEdit?: UnidadOrganizacional | null;
  unidadesExistentes: UnidadOrganizacional[];
}

export function CreateUnidadModal({ 
  isOpen, 
  onClose, 
  onSave, 
  unidadEdit,
  unidadesExistentes 
}: CreateUnidadModalProps) {
  const isEditMode = !!unidadEdit;

  // Form state
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    nombreCorto: '',
    nivel: 'cetap' as NivelEstructura,
    padreId: '' as string,
    departamento: '',
    ciudad: '',
    direccion: '',
    telefono: '',
    email: '',
    capacidadEstudiantes: '',
    capacidadDocentes: '',
    estado: 'activa' as EstadoEstructura,
    permiteInscripciones: true,
    permiteMatriculas: true,
    visiblePortal: true,
    observaciones: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load data in edit mode
  useEffect(() => {
    if (unidadEdit) {
      setFormData({
        codigo: unidadEdit.codigo,
        nombre: unidadEdit.nombre,
        nombreCorto: unidadEdit.nombreCorto,
        nivel: unidadEdit.nivel,
        padreId: unidadEdit.padreId || '',
        departamento: unidadEdit.departamento || '',
        ciudad: unidadEdit.ciudad || '',
        direccion: unidadEdit.direccion || '',
        telefono: unidadEdit.telefono || '',
        email: unidadEdit.email || '',
        capacidadEstudiantes: unidadEdit.capacidadEstudiantes?.toString() || '',
        capacidadDocentes: unidadEdit.capacidadDocentes?.toString() || '',
        estado: unidadEdit.estado,
        permiteInscripciones: unidadEdit.permiteInscripciones ?? true,
        permiteMatriculas: unidadEdit.permiteMatriculas ?? true,
        visiblePortal: unidadEdit.visiblePortal ?? true,
        observaciones: unidadEdit.observaciones || '',
      });
    }
  }, [unidadEdit]);

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.codigo.trim()) {
      newErrors.codigo = 'El código es obligatorio';
    } else if (!/^[A-Z0-9-]+$/.test(formData.codigo)) {
      newErrors.codigo = 'Solo letras mayúsculas, números y guiones';
    } else {
      // Check for duplicate code
      const isDuplicate = unidadesExistentes.some(u => 
        u.codigo === formData.codigo && (!isEditMode || u.id !== unidadEdit?.id)
      );
      if (isDuplicate) {
        newErrors.codigo = 'Este código ya existe';
      }
    }

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    }

    if (!formData.nombreCorto.trim()) {
      newErrors.nombreCorto = 'El nombre corto es obligatorio';
    }

    if (formData.nivel !== 'nacional' && !formData.padreId) {
      newErrors.padreId = 'Debe seleccionar una unidad padre';
    }

    if (!formData.departamento.trim()) {
      newErrors.departamento = 'El departamento es obligatorio';
    }

    if (!formData.ciudad.trim()) {
      newErrors.ciudad = 'La ciudad es obligatoria';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (formData.capacidadEstudiantes && parseInt(formData.capacidadEstudiantes) < 0) {
      newErrors.capacidadEstudiantes = 'Debe ser un número positivo';
    }

    if (formData.capacidadDocentes && parseInt(formData.capacidadDocentes) < 0) {
      newErrors.capacidadDocentes = 'Debe ser un número positivo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Por favor corrige los errores del formulario');
      return;
    }

    const unidadData: Partial<UnidadOrganizacional> = {
      codigo: formData.codigo.trim().toUpperCase(),
      nombre: formData.nombre.trim(),
      nombreCorto: formData.nombreCorto.trim(),
      nivel: formData.nivel,
      padreId: formData.padreId || null,
      departamento: formData.departamento.trim(),
      ciudad: formData.ciudad.trim(),
      direccion: formData.direccion.trim() || undefined,
      telefono: formData.telefono.trim() || undefined,
      email: formData.email.trim() || undefined,
      capacidadEstudiantes: formData.capacidadEstudiantes ? parseInt(formData.capacidadEstudiantes) : undefined,
      capacidadDocentes: formData.capacidadDocentes ? parseInt(formData.capacidadDocentes) : undefined,
      estado: formData.estado,
      permiteInscripciones: formData.permiteInscripciones,
      permiteMatriculas: formData.permiteMatriculas,
      visiblePortal: formData.visiblePortal,
      observaciones: formData.observaciones.trim() || undefined,
    };

    onSave(unidadData);
    onClose();
    
    toast.success(
      isEditMode ? 'Unidad Actualizada' : 'Unidad Creada',
      {
        description: `${unidadData.nombre} ha sido ${isEditMode ? 'actualizada' : 'creada'} exitosamente.`,
        icon: <CheckCircle className="w-5 h-5 text-green-600" />
      }
    );
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Get parent options based on selected level
  const getParentOptions = (): UnidadOrganizacional[] => {
    if (formData.nivel === 'nacional') return [];
    
    // ESTRUCTURA CORRECTA ESAP:
    // Nacional (1) → Territorial (16) → CETAP (293)
    const nivelesPermitidos: Record<NivelEstructura, NivelEstructura[]> = {
      nacional: [],
      territorial: ['nacional'],
      regional: ['territorial'], // Deprecated pero compatible
      sede: ['territorial', 'regional'], // Deprecated pero compatible
      cetap: ['territorial'], // ✅ Nuevo: CETAP dependen de Territorial
    };

    const allowedParentLevels = nivelesPermitidos[formData.nivel] || [];
    return unidadesExistentes.filter(u => 
      allowedParentLevels.includes(u.nivel) && 
      (!isEditMode || u.id !== unidadEdit?.id)
    );
  };

  const departamentosColombia = [
    'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá', 'Caldas',
    'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca',
    'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño',
    'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 'San Andrés y Providencia',
    'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
            <motion.div
              className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col"
              style={{ boxShadow: 'var(--esap-shadow-2xl)' }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 flex-shrink-0"
                style={{ background: 'linear-gradient(to bottom, #F9FAFB 0%, #FFFFFF 100%)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                        boxShadow: 'var(--esap-shadow-md)'
                      }}
                    >
                      <Building2 className="w-5 h-5 text-white" strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                        {isEditMode ? 'Editar Unidad Organizacional' : 'Nueva Unidad Organizacional'}
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                        {isEditMode ? 'Modifica los datos de la unidad' : 'Crea una nueva Territorial o CETAP'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors flex-shrink-0"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-4 sm:p-6 flex-1 overflow-y-auto">
                <div className="space-y-4 sm:space-y-6">
                  {/* Información Básica */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[--esap-primary]" />
                      Información Básica
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {/* Código */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Código *
                        </label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={formData.codigo}
                            onChange={(e) => handleChange('codigo', e.target.value.toUpperCase())}
                            placeholder="DIR-BOG"
                            className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[--esap-primary] ${
                              errors.codigo ? 'border-red-500' : 'border-gray-300'
                            }`}
                            disabled={isEditMode}
                          />
                        </div>
                        {errors.codigo && (
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.codigo}
                          </p>
                        )}
                      </div>

                      {/* Nivel */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nivel *
                        </label>
                        <select
                          value={formData.nivel}
                          onChange={(e) => handleChange('nivel', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[--esap-primary]"
                        >
                          <option value="nacional">Nacional</option>
                          <option value="territorial">Territorial</option>
                          <option value="cetap">CETAP</option>
                        </select>
                      </div>

                      {/* Nombre */}
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nombre Completo *
                        </label>
                        <input
                          type="text"
                          value={formData.nombre}
                          onChange={(e) => handleChange('nombre', e.target.value)}
                          placeholder="Dirección Territorial Bogotá"
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[--esap-primary] ${
                            errors.nombre ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors.nombre && (
                          <p className="text-xs text-red-600 mt-1">{errors.nombre}</p>
                        )}
                      </div>

                      {/* Nombre Corto */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nombre Corto *
                        </label>
                        <input
                          type="text"
                          value={formData.nombreCorto}
                          onChange={(e) => handleChange('nombreCorto', e.target.value)}
                          placeholder="Bogotá"
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[--esap-primary] ${
                            errors.nombreCorto ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors.nombreCorto && (
                          <p className="text-xs text-red-600 mt-1">{errors.nombreCorto}</p>
                        )}
                      </div>

                      {/* Unidad Padre */}
                      {formData.nivel !== 'nacional' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unidad Padre *
                          </label>
                          <select
                            value={formData.padreId}
                            onChange={(e) => handleChange('padreId', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[--esap-primary] ${
                              errors.padreId ? 'border-red-500' : 'border-gray-300'
                            }`}
                          >
                            <option value="">Seleccionar...</option>
                            {getParentOptions().map(unidad => (
                              <option key={unidad.id} value={unidad.id}>
                                {unidad.nombre} ({unidad.codigo})
                              </option>
                            ))}
                          </select>
                          {errors.padreId && (
                            <p className="text-xs text-red-600 mt-1">{errors.padreId}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ubicación */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[--esap-primary]" />
                      Ubicación
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Departamento */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Departamento *
                        </label>
                        <select
                          value={formData.departamento}
                          onChange={(e) => handleChange('departamento', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[--esap-primary] ${
                            errors.departamento ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Seleccionar...</option>
                          {departamentosColombia.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                        {errors.departamento && (
                          <p className="text-xs text-red-600 mt-1">{errors.departamento}</p>
                        )}
                      </div>

                      {/* Ciudad */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ciudad *
                        </label>
                        <input
                          type="text"
                          value={formData.ciudad}
                          onChange={(e) => handleChange('ciudad', e.target.value)}
                          placeholder="Bogotá D.C."
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[--esap-primary] ${
                            errors.ciudad ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors.ciudad && (
                          <p className="text-xs text-red-600 mt-1">{errors.ciudad}</p>
                        )}
                      </div>

                      {/* Dirección */}
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Dirección
                        </label>
                        <input
                          type="text"
                          value={formData.direccion}
                          onChange={(e) => handleChange('direccion', e.target.value)}
                          placeholder="Calle 44 No. 53-37"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[--esap-primary]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contacto */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[--esap-primary]" />
                      Información de Contacto
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Teléfono */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Teléfono
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="tel"
                            value={formData.telefono}
                            onChange={(e) => handleChange('telefono', e.target.value)}
                            placeholder="+57 (1) 220 5555"
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[--esap-primary]"
                          />
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            placeholder="bogota@esap.edu.co"
                            className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[--esap-primary] ${
                              errors.email ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                        </div>
                        {errors.email && (
                          <p className="text-xs text-red-600 mt-1">{errors.email}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Capacidades */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4 text-[--esap-primary]" />
                      Capacidades
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Capacidad Estudiantes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Capacidad de Estudiantes
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.capacidadEstudiantes}
                          onChange={(e) => handleChange('capacidadEstudiantes', e.target.value)}
                          placeholder="5000"
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[--esap-primary] ${
                            errors.capacidadEstudiantes ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>

                      {/* Capacidad Docentes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Capacidad de Docentes
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.capacidadDocentes}
                          onChange={(e) => handleChange('capacidadDocentes', e.target.value)}
                          placeholder="200"
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[--esap-primary] ${
                            errors.capacidadDocentes ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Configuración */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-[--esap-primary]" />
                      Configuración
                    </h3>
                    <div className="space-y-3">
                      {/* Estado */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Estado
                        </label>
                        <select
                          value={formData.estado}
                          onChange={(e) => handleChange('estado', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[--esap-primary]"
                        >
                          <option value="activa">Activa</option>
                          <option value="inactiva">Inactiva</option>
                          <option value="en_configuracion">En Configuración</option>
                          <option value="cerrada_temporal">Cerrada Temporal</option>
                        </select>
                      </div>

                      {/* Checkboxes */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permiteInscripciones}
                            onChange={(e) => handleChange('permiteInscripciones', e.target.checked)}
                            className="w-4 h-4 text-[--esap-primary] rounded focus:ring-2 focus:ring-[--esap-primary]"
                          />
                          <span className="text-sm text-gray-700">Permite Inscripciones</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permiteMatriculas}
                            onChange={(e) => handleChange('permiteMatriculas', e.target.checked)}
                            className="w-4 h-4 text-[--esap-primary] rounded focus:ring-2 focus:ring-[--esap-primary]"
                          />
                          <span className="text-sm text-gray-700">Permite Matrículas</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.visiblePortal}
                            onChange={(e) => handleChange('visiblePortal', e.target.checked)}
                            className="w-4 h-4 text-[--esap-primary] rounded focus:ring-2 focus:ring-[--esap-primary]"
                          />
                          <span className="text-sm text-gray-700">Visible en Portal</span>
                        </label>
                      </div>

                      {/* Observaciones */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Observaciones
                        </label>
                        <textarea
                          value={formData.observaciones}
                          onChange={(e) => handleChange('observaciones', e.target.value)}
                          placeholder="Notas adicionales sobre esta unidad..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[--esap-primary] resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 pt-4 border-t border-gray-200 flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-5 py-3 border border-gray-300 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <motion.button
                    type="submit"
                    className="flex-1 px-5 py-3 text-white rounded-xl font-semibold transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                      boxShadow: 'var(--esap-shadow-md)'
                    }}
                    whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0, 61, 165, 0.3)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isEditMode ? 'Guardar Cambios' : 'Crear Unidad'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}