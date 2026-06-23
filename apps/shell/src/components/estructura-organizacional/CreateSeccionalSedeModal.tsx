/**
 * MODAL - CREAR/EDITAR SECCIONAL O SEDE
 * Formulario para crear o editar seccionales y sedes ESAP
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Building2, MapPin, Hash, AlertCircle, Loader2,
  Phone, Mail, Users, GraduationCap, Eye, FileText,
  CheckCircle, ClipboardList
} from 'lucide-react';
import { toast } from 'sonner';
import { estructuraService, type CreateSeccionalData, type CreateSedeData } from '../../services/estructuraService';
import type { Seccional, Sede, Geopolitica } from '../../services/api/types';

type TipoEntidad = 'seccional' | 'sede';

interface CreateSeccionalSedeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tipo: TipoEntidad;
  seccionales: Seccional[];
  editItem?: Seccional | Sede | null;
}

export function CreateSeccionalSedeModal({
  isOpen,
  onClose,
  onSuccess,
  tipo,
  seccionales,
  editItem,
}: CreateSeccionalSedeModalProps) {
  const isEditMode = !!editItem;
  const [loading, setLoading] = useState(false);
  const [departamentos, setDepartamentos] = useState<Geopolitica[]>([]);
  const [ciudades, setCiudades] = useState<Geopolitica[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(false);

  // Form state para Seccional
  const [seccionalForm, setSeccionalForm] = useState({
    codSeccional: '',
    nomSeccional: '',
    idUbiSeccional: undefined as number | undefined,
  });

  // Form state para Sede (extendido con nuevos campos)
  const [sedeForm, setSedeForm] = useState({
    codSede: '',
    nomSede: '',
    idGeopolitica: undefined as number | undefined,
    idSeccional: undefined as number | undefined,
    dirSede: '',
    telSede: '',
    emailSede: '',
    capacidadEstudiantes: undefined as number | undefined,
    capacidadDocentes: undefined as number | undefined,
    sedeAct: 'ACTIVO',
    permiteInscripciones: true,
    permiteMatriculas: true,
    visiblePortal: true,
    observaciones: '',
  });

  const [selectedDepartamento, setSelectedDepartamento] = useState<number | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cargar departamentos al abrir
  useEffect(() => {
    if (isOpen) {
      cargarDepartamentos();
    }
  }, [isOpen]);

  // Cargar datos en modo edicion
  useEffect(() => {
    if (editItem && isOpen) {
      if (tipo === 'seccional') {
        const seccional = editItem as Seccional;
        setSeccionalForm({
          codSeccional: seccional.codSeccional || '',
          nomSeccional: seccional.nomSeccional,
          idUbiSeccional: seccional.idUbiSeccional,
        });
        if (seccional.ubicacion?.idPadre) {
          setSelectedDepartamento(seccional.ubicacion.idPadre);
          cargarCiudades(seccional.ubicacion.idPadre);
        }
      } else {
        const sede = editItem as Sede;
        setSedeForm({
          codSede: sede.codSede || '',
          nomSede: sede.nomSede,
          idGeopolitica: sede.idGeopolitica,
          idSeccional: sede.idSeccional,
          dirSede: sede.dirSede || '',
          telSede: sede.telSede || '',
          emailSede: sede.emailSede || '',
          capacidadEstudiantes: sede.capacidadEstudiantes,
          capacidadDocentes: sede.capacidadDocentes,
          sedeAct: sede.sedeAct || 'ACTIVO',
          permiteInscripciones: sede.permiteInscripciones ?? true,
          permiteMatriculas: sede.permiteMatriculas ?? true,
          visiblePortal: sede.visiblePortal ?? true,
          observaciones: sede.observaciones || '',
        });
        if (sede.geopolitica?.idPadre) {
          setSelectedDepartamento(sede.geopolitica.idPadre);
          cargarCiudades(sede.geopolitica.idPadre);
        }
      }
    }
  }, [editItem, isOpen, tipo]);

  // Reset form al cerrar
  useEffect(() => {
    if (!isOpen) {
      setSeccionalForm({ codSeccional: '', nomSeccional: '', idUbiSeccional: undefined });
      setSedeForm({
        codSede: '',
        nomSede: '',
        idGeopolitica: undefined,
        idSeccional: undefined,
        dirSede: '',
        telSede: '',
        emailSede: '',
        capacidadEstudiantes: undefined,
        capacidadDocentes: undefined,
        sedeAct: 'ACTIVO',
        permiteInscripciones: true,
        permiteMatriculas: true,
        visiblePortal: true,
        observaciones: '',
      });
      setSelectedDepartamento(undefined);
      setCiudades([]);
      setErrors({});
    }
  }, [isOpen]);

  const cargarDepartamentos = async () => {
    try {
      setLoadingGeo(true);
      const response = await estructuraService.listarDepartamentos();
      setDepartamentos(response.data);
    } catch (error) {
      console.error('Error cargando departamentos:', error);
    } finally {
      setLoadingGeo(false);
    }
  };

  const cargarCiudades = async (idDepartamento: number) => {
    try {
      setLoadingGeo(true);
      const response = await estructuraService.listarCiudadesPorDepartamento(idDepartamento);
      setCiudades(response.data);
    } catch (error) {
      console.error('Error cargando ciudades:', error);
    } finally {
      setLoadingGeo(false);
    }
  };

  const handleDepartamentoChange = (idDepartamento: number) => {
    setSelectedDepartamento(idDepartamento);
    setCiudades([]);
    if (tipo === 'seccional') {
      setSeccionalForm(prev => ({ ...prev, idUbiSeccional: undefined }));
    } else {
      setSedeForm(prev => ({ ...prev, idGeopolitica: undefined }));
    }
    if (idDepartamento) {
      cargarCiudades(idDepartamento);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (tipo === 'seccional') {
      if (!seccionalForm.nomSeccional.trim()) {
        newErrors.nomSeccional = 'El nombre es obligatorio';
      } else if (seccionalForm.nomSeccional.length > 100) {
        newErrors.nomSeccional = 'El nombre no puede exceder 100 caracteres';
      }
      if (seccionalForm.codSeccional && seccionalForm.codSeccional.length > 20) {
        newErrors.codSeccional = 'El codigo no puede exceder 20 caracteres';
      }
    } else {
      if (!sedeForm.nomSede.trim()) {
        newErrors.nomSede = 'El nombre es obligatorio';
      } else if (sedeForm.nomSede.length > 50) {
        newErrors.nomSede = 'El nombre no puede exceder 50 caracteres';
      }
      if (sedeForm.codSede && sedeForm.codSede.length > 20) {
        newErrors.codSede = 'El codigo no puede exceder 20 caracteres';
      }
      if (!sedeForm.idSeccional) {
        newErrors.idSeccional = 'Debe seleccionar una seccional';
      }
      // Campos obligatorios
      if (!sedeForm.emailSede || !sedeForm.emailSede.trim()) {
        newErrors.emailSede = 'El correo electronico es obligatorio';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sedeForm.emailSede)) {
        newErrors.emailSede = 'El email no tiene un formato valido';
      }
      if (sedeForm.capacidadEstudiantes === undefined || sedeForm.capacidadEstudiantes === null) {
        newErrors.capacidadEstudiantes = 'La capacidad de estudiantes es obligatoria';
      }
      if (sedeForm.capacidadDocentes === undefined || sedeForm.capacidadDocentes === null) {
        newErrors.capacidadDocentes = 'La capacidad de docentes es obligatoria';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Por favor corrige los errores del formulario');
      return;
    }

    setLoading(true);

    try {
      if (tipo === 'seccional') {
        const data: CreateSeccionalData = {
          codSeccional: seccionalForm.codSeccional.trim() || undefined,
          nomSeccional: seccionalForm.nomSeccional.trim(),
          // Coerción a número: el id_ubi_seccional (bigint) llega como string del
          // backend y @IsNumber() lo rechazaría al guardar.
          idUbiSeccional: seccionalForm.idUbiSeccional
            ? Number(seccionalForm.idUbiSeccional)
            : undefined,
        };

        if (isEditMode) {
          await estructuraService.actualizarSeccional((editItem as Seccional).idSeccional, data);
          toast.success('Seccional actualizada exitosamente');
        } else {
          await estructuraService.crearSeccional(data);
          toast.success('Seccional creada exitosamente');
        }
      } else {
        const data: CreateSedeData = {
          codSede: sedeForm.codSede.trim() || undefined,
          nomSede: sedeForm.nomSede.trim(),
          idGeopolitica: sedeForm.idGeopolitica ? Number(sedeForm.idGeopolitica) : undefined,
          idSeccional: sedeForm.idSeccional ? Number(sedeForm.idSeccional) : undefined,
          dirSede: sedeForm.dirSede.trim() || undefined,
          telSede: sedeForm.telSede.trim() || undefined,
          emailSede: sedeForm.emailSede.trim(),
          capacidadEstudiantes: sedeForm.capacidadEstudiantes ? Number(sedeForm.capacidadEstudiantes) : undefined,
          capacidadDocentes: sedeForm.capacidadDocentes ? Number(sedeForm.capacidadDocentes) : undefined,
          sedeAct: sedeForm.sedeAct || undefined,
          permiteInscripciones: sedeForm.permiteInscripciones,
          permiteMatriculas: sedeForm.permiteMatriculas,
          visiblePortal: sedeForm.visiblePortal,
          observaciones: sedeForm.observaciones.trim() || undefined,
        };

        if (isEditMode) {
          await estructuraService.actualizarSede((editItem as Sede).idSede, data);
          toast.success('Sede actualizada exitosamente');
        } else {
          await estructuraService.crearSede(data);
          toast.success('Sede creada exitosamente');
        }
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error guardando:', error);
      toast.error(error.response?.data?.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const titulo = tipo === 'seccional'
    ? (isEditMode ? 'Editar Seccional' : 'Nueva Seccional')
    : (isEditMode ? 'Editar Sede' : 'Nueva Sede');

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
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <motion.div
              className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#003DA5] to-blue-600 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{titulo}</h2>
                      <p className="text-sm text-gray-600">
                        {tipo === 'seccional' ? 'Direccion Territorial ESAP' : 'Sede asociada a una seccional'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                {tipo === 'seccional' ? (
                  <>
                    {/* Codigo Seccional */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Codigo (opcional)
                      </label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={seccionalForm.codSeccional}
                          onChange={(e) => setSeccionalForm(prev => ({ ...prev, codSeccional: e.target.value.toUpperCase() }))}
                          placeholder="SEC01"
                          maxLength={20}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
                        />
                      </div>
                    </div>

                    {/* Nombre Seccional */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        value={seccionalForm.nomSeccional}
                        onChange={(e) => setSeccionalForm(prev => ({ ...prev, nomSeccional: e.target.value }))}
                        placeholder="Direccion Territorial Bogota"
                        maxLength={100}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] ${
                          errors.nomSeccional ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.nomSeccional && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.nomSeccional}
                        </p>
                      )}
                    </div>

                    {/* Ubicacion Seccional */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        Ubicacion (Ciudad)
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <select
                          value={selectedDepartamento || ''}
                          onChange={(e) => handleDepartamentoChange(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
                          disabled={loadingGeo}
                        >
                          <option value="">Departamento...</option>
                          {departamentos.map(d => (
                            <option key={d.idGeopolitica} value={d.idGeopolitica}>
                              {d.nomDivGeopolitica}
                            </option>
                          ))}
                        </select>
                        <select
                          value={seccionalForm.idUbiSeccional || ''}
                          onChange={(e) => setSeccionalForm(prev => ({ ...prev, idUbiSeccional: Number(e.target.value) || undefined }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
                          disabled={!selectedDepartamento || loadingGeo}
                        >
                          <option value="">Ciudad...</option>
                          {ciudades.map(c => (
                            <option key={c.idGeopolitica} value={c.idGeopolitica}>
                              {c.nomDivGeopolitica}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* ==================== INFORMACION BASICA ==================== */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 border-b pb-2">
                        <Building2 className="w-4 h-4 text-[#003DA5]" />
                        Informacion Basica
                      </h3>

                      {/* Seccional */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Seccional *
                        </label>
                        <select
                          value={sedeForm.idSeccional || ''}
                          onChange={(e) => setSedeForm(prev => ({ ...prev, idSeccional: Number(e.target.value) || undefined }))}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] ${
                            errors.idSeccional ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Seleccionar seccional...</option>
                          {seccionales.map(s => (
                            <option key={s.idSeccional} value={s.idSeccional}>
                              {s.nomSeccional}
                            </option>
                          ))}
                        </select>
                        {errors.idSeccional && (
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.idSeccional}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Codigo Sede */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Codigo (opcional)
                          </label>
                          <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={sedeForm.codSede}
                              onChange={(e) => setSedeForm(prev => ({ ...prev, codSede: e.target.value.toUpperCase() }))}
                              placeholder="SD001"
                              maxLength={20}
                              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
                            />
                          </div>
                        </div>

                        {/* Estado */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Estado
                          </label>
                          <select
                            value={sedeForm.sedeAct}
                            onChange={(e) => setSedeForm(prev => ({ ...prev, sedeAct: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
                          >
                            <option value="ACTIVO">Activo</option>
                            <option value="INACTIVO">Inactivo</option>
                            <option value="SUSPENDIDO">Suspendido</option>
                          </select>
                        </div>
                      </div>

                      {/* Nombre Sede */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nombre *
                        </label>
                        <input
                          type="text"
                          value={sedeForm.nomSede}
                          onChange={(e) => setSedeForm(prev => ({ ...prev, nomSede: e.target.value }))}
                          placeholder="Sede Principal Bogota"
                          maxLength={50}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] ${
                            errors.nomSede ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors.nomSede && (
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.nomSede}
                          </p>
                        )}
                      </div>

                      {/* Ubicacion Sede */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <MapPin className="w-4 h-4 inline mr-1" />
                          Ubicacion (Ciudad)
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <select
                            value={selectedDepartamento || ''}
                            onChange={(e) => handleDepartamentoChange(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
                            disabled={loadingGeo}
                          >
                            <option value="">Departamento...</option>
                            {departamentos.map(d => (
                              <option key={d.idGeopolitica} value={d.idGeopolitica}>
                                {d.nomDivGeopolitica}
                              </option>
                            ))}
                          </select>
                          <select
                            value={sedeForm.idGeopolitica || ''}
                            onChange={(e) => setSedeForm(prev => ({ ...prev, idGeopolitica: Number(e.target.value) || undefined }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
                            disabled={!selectedDepartamento || loadingGeo}
                          >
                            <option value="">Ciudad...</option>
                            {ciudades.map(c => (
                              <option key={c.idGeopolitica} value={c.idGeopolitica}>
                                {c.nomDivGeopolitica}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Capacidades */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <GraduationCap className="w-4 h-4 inline mr-1" />
                            Capacidad Estudiantes *
                          </label>
                          <input
                            type="number"
                            value={sedeForm.capacidadEstudiantes ?? ''}
                            onChange={(e) => setSedeForm(prev => ({
                              ...prev,
                              capacidadEstudiantes: e.target.value ? Number(e.target.value) : undefined
                            }))}
                            placeholder="500"
                            min={0}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] ${
                              errors.capacidadEstudiantes ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                          {errors.capacidadEstudiantes && (
                            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {errors.capacidadEstudiantes}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Users className="w-4 h-4 inline mr-1" />
                            Capacidad Docentes *
                          </label>
                          <input
                            type="number"
                            value={sedeForm.capacidadDocentes ?? ''}
                            onChange={(e) => setSedeForm(prev => ({
                              ...prev,
                              capacidadDocentes: e.target.value ? Number(e.target.value) : undefined
                            }))}
                            placeholder="50"
                            min={0}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] ${
                              errors.capacidadDocentes ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                          {errors.capacidadDocentes && (
                            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {errors.capacidadDocentes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ==================== CONTACTO ==================== */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 border-b pb-2">
                        <Phone className="w-4 h-4 text-[#003DA5]" />
                        Contacto
                      </h3>

                      {/* Direccion */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <MapPin className="w-4 h-4 inline mr-1" />
                          Direccion
                        </label>
                        <input
                          type="text"
                          value={sedeForm.dirSede}
                          onChange={(e) => setSedeForm(prev => ({ ...prev, dirSede: e.target.value }))}
                          placeholder="Calle 44 No. 53-37"
                          maxLength={250}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Telefono */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Phone className="w-4 h-4 inline mr-1" />
                            Telefono
                          </label>
                          <input
                            type="tel"
                            value={sedeForm.telSede}
                            onChange={(e) => setSedeForm(prev => ({ ...prev, telSede: e.target.value }))}
                            placeholder="(601) 220-2790"
                            maxLength={50}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
                          />
                        </div>

                        {/* Email */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Mail className="w-4 h-4 inline mr-1" />
                            Correo Electronico *
                          </label>
                          <input
                            type="email"
                            value={sedeForm.emailSede}
                            onChange={(e) => setSedeForm(prev => ({ ...prev, emailSede: e.target.value }))}
                            placeholder="sede@esap.edu.co"
                            maxLength={100}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] ${
                              errors.emailSede ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                          {errors.emailSede && (
                            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {errors.emailSede}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ==================== CONFIGURACION ==================== */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 border-b pb-2">
                        <ClipboardList className="w-4 h-4 text-[#003DA5]" />
                        Configuracion
                      </h3>

                      {/* Switches de configuracion */}
                      <div className="grid grid-cols-3 gap-3">
                        <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                          <input
                            type="checkbox"
                            checked={sedeForm.permiteInscripciones}
                            onChange={(e) => setSedeForm(prev => ({ ...prev, permiteInscripciones: e.target.checked }))}
                            className="w-4 h-4 rounded text-[#003DA5] focus:ring-[#003DA5]"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Inscripciones</p>
                          </div>
                        </label>

                        <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                          <input
                            type="checkbox"
                            checked={sedeForm.permiteMatriculas}
                            onChange={(e) => setSedeForm(prev => ({ ...prev, permiteMatriculas: e.target.checked }))}
                            className="w-4 h-4 rounded text-[#003DA5] focus:ring-[#003DA5]"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Matriculas</p>
                          </div>
                        </label>

                        <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                          <input
                            type="checkbox"
                            checked={sedeForm.visiblePortal}
                            onChange={(e) => setSedeForm(prev => ({ ...prev, visiblePortal: e.target.checked }))}
                            className="w-4 h-4 rounded text-[#003DA5] focus:ring-[#003DA5]"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Visible Portal</p>
                          </div>
                        </label>
                      </div>

                      {/* Observaciones */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <FileText className="w-4 h-4 inline mr-1" />
                          Observaciones
                        </label>
                        <textarea
                          value={sedeForm.observaciones}
                          onChange={(e) => setSedeForm(prev => ({ ...prev, observaciones: e.target.value }))}
                          placeholder="Notas adicionales sobre la sede..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] resize-none"
                        />
                      </div>
                    </div>
                  </>
                )}
              </form>

              {/* Actions */}
              <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <motion.button
                  type="submit"
                  onClick={handleSubmit}
                  className="flex-1 px-4 py-2.5 bg-[#003DA5] text-white rounded-xl font-medium hover:bg-[#002d7a] transition-colors flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isEditMode ? 'Guardar Cambios' : 'Crear'}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
