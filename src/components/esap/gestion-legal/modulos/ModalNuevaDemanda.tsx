/**
 * ModalNuevaDemanda - Formulario para registrar nuevas demandas judiciales
 * ✅ Diseño corporativo ESAP 2025 premium con ModalSIGLPremium
 * ✅ Validación completa y UX mejorada
 * ✅ Botones SIEMPRE visibles en el footer
 * ✅ MÚLTIPLES DEMANDANTES con UI mejorada
 * ✅ MODAL 30% MÁS ANCHO para mejor visualización
 */

import { useState, useEffect } from 'react';
import { Scale, User, Calendar, FileText, Building2, AlertCircle, Save, Upload, Loader2, MapPin, DollarSign, Gavel, Plus, X, UserPlus } from 'lucide-react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { ModalSIGLPremium } from '../design-system/ModalSIGLPremium';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { ModalHeaderClean } from './ModalHeaderClean';
import { Button } from '../../../ui/button';
import { toast } from 'sonner';
import { legalService } from '../../../../services/api/legal.service';
import { useConfiguracionModulo } from '../config/ConfiguracionesSIGLContext';

interface ModalNuevaDemandaProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (demanda: NuevaDemandaData) => void;
}

export interface NuevaDemandaData {
  numeroRadicado: string;
  medioControl: string;
  tipoProceso: string;
  demandante: string;
  tipoPersona: 'natural' | 'juridica';
  identificacionDemandante: string;
  // Campos de contacto del demandante
  demandanteDireccion?: string;
  demandanteTelefono?: string;
  demandanteEmail?: string;
  demandanteApoderado?: string;
  // Datos del demandado
  demandado?: string;
  tipoIdDemandado?: string;
  numeroIdDemandado?: string;
  demandadoDireccion?: string;
  demandadoTelefono?: string;
  demandadoEmail?: string;
  demandantes: Array<{
    id: string;
    nombre: string;
    tipoPersona: 'natural' | 'juridica';
    identificacion: string;
  }>;
  cuantia: string;
  juzgado: string;
  ciudad: string;
  departamento: string;
  fechaNotificacion: string;
  fechaVencimiento: string;
  abogadoAsignado: string;
  etapa: 'NOTIFICADA' | 'CONTESTACIÓN' | 'PROBATORIA' | 'ALEGATOS';
  pretensiones: string;
  hechos: string;
  observaciones: string;
}

interface Abogado {
  id: string;
  nombreCompleto: string;
}

const MEDIOS_CONTROL = [
  'REPARACIÓN DIRECTA',
  'NULIDAD Y RESTABLECIMIENTO',
  'ACCIÓN DE GRUPO',
  'ACCIÓN POPULAR',
  'CONTROVERSIAS CONTRACTUALES',
  'TUTELA',
  'OTRO'
];

// Tipos de Procesos Judiciales ahora vienen de ConfiguracionesSIGLContext
// (se obtienen con useConfiguracionModulo en el componente)

const DEPARTAMENTOS = [
  'Cundinamarca',
  'Antioquia',
  'Valle del Cauca',
  'Atlántico',
  'Santander',
  'Bolívar',
  'Tolima',
  'Boyacá',
  'Otro'
];

const INITIAL_FORM_DATA: NuevaDemandaData = {
  numeroRadicado: '',
  medioControl: '',
  demandante: '',
  tipoProceso: '',
  tipoPersona: 'natural',
  identificacionDemandante: '',
  // Campos de contacto del demandante
  demandanteDireccion: '',
  demandanteTelefono: '',
  demandanteEmail: '',
  demandanteApoderado: '',
  // Datos del demandado (ESAP por defecto)
  demandado: 'ESAP - Escuela Superior de Administración Pública',
  tipoIdDemandado: 'NIT',
  numeroIdDemandado: '899.999.061-4',
  demandadoDireccion: 'Calle 44 #53-37, Bogotá D.C.',
  demandadoTelefono: '+57 601 220 2790',
  demandadoEmail: 'juridica@esap.edu.co',
  cuantia: '',
  juzgado: '',
  ciudad: '',
  departamento: '',
  fechaNotificacion: '',
  fechaVencimiento: '',
  abogadoAsignado: '',
  etapa: 'NOTIFICADA',
  pretensiones: '',
  hechos: '',
  observaciones: ''
};

export function ModalNuevaDemanda({ isOpen, onClose, onSave }: ModalNuevaDemandaProps) {
  const [formData, setFormData] = useState<NuevaDemandaData>(INITIAL_FORM_DATA);
  // const [formData, setFormData] = useState<NuevaDemandaData>({
  //   numeroRadicado: '',
  //   medioControl: '',
  //   tipoProceso: '',
  //   demandantes: [],
  //   cuantia: '',
  //   juzgado: '',
  //   ciudad: '',
  //   departamento: '',
  //   fechaNotificacion: '',
  //   fechaVencimiento: '',
  //   abogadoAsignado: '',
  //   etapa: 'NOTIFICADA',
  //   pretensiones: '',
  //   hechos: '',
  //   observaciones: ''
  // });

  // Estado para el demandante temporal que se está agregando
  const [nuevoDemandante, setNuevoDemandante] = useState({
    nombre: '',
    tipoPersona: 'natural' as 'natural' | 'juridica',
    identificacion: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [abogados, setAbogados] = useState<Abogado[]>([]);
  const [loadingAbogados, setLoadingAbogados] = useState(false);

  // ✅ Obtener tipos de procesos desde configuración centralizada
  const { tiposProcesosActivos } = useConfiguracionModulo('defensa-judicial');

  // ✅ Auto-calcular fecha de vencimiento cuando cambia tipoProceso o fechaNotificacion
  useEffect(() => {
    if (formData.tipoProceso && formData.fechaNotificacion) {
      const tipoSeleccionado = tiposProcesosActivos.find(t => t.id === formData.tipoProceso);
      if (tipoSeleccionado && tipoSeleccionado.plazo) {
        const fechaNotif = new Date(formData.fechaNotificacion);
        const fechaVenc = new Date(fechaNotif);
        fechaVenc.setDate(fechaVenc.getDate() + tipoSeleccionado.plazo);
        const fechaVencStr = fechaVenc.toISOString().split('T')[0];

        if (formData.fechaVencimiento !== fechaVencStr) {
          setFormData(prev => ({ ...prev, fechaVencimiento: fechaVencStr }));
        }
      }
    }
  }, [formData.tipoProceso, formData.fechaNotificacion, tiposProcesosActivos]);

  // Cargar abogados desde la API y resetear formulario al abrir
  useEffect(() => {
    if (isOpen) {
      loadAbogados();
      setFormData(INITIAL_FORM_DATA);
      setErrors({});
    }
  }, [isOpen]);

  const loadAbogados = async () => {
    try {
      setLoadingAbogados(true);
      const data = await legalService.getAbogadosDashboard();
      setAbogados(data.map((a: any) => ({
        id: a.id,
        nombreCompleto: a.nombreCompleto || `${a.nombre || ''} ${a.apellido || ''}`.trim() || 'Abogado'
      })));
    } catch (error) {
      console.error('Error cargando abogados:', error);
      // Fallback a lista vacía
      setAbogados([]);
    } finally {
      setLoadingAbogados(false);
    }
  };

  // ✅ Helpers de validación de formato
  const onlyNumbers = (value: string): string => value.replace(/[^0-9]/g, '');
  const onlyLetters = (value: string): string => value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
  const phoneFormat = (value: string): string => value.replace(/[^0-9+\s-]/g, '');
  const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleInputChange = (field: keyof NuevaDemandaData, value: string) => {
    let filteredValue = value;

    // Aplicar filtros según el campo
    switch (field) {
      case 'cuantia':
        // Solo números para cuantía, máximo 9 dígitos
        filteredValue = onlyNumbers(value);
        // Si el valor actual es "0", no permitir más dígitos
        if (formData.cuantia === '0' && filteredValue.length > 1) {
          filteredValue = '0';
        }
        // Si empieza con 0 y tiene más de 1 dígito, mantener solo el primer dígito no-cero
        if (filteredValue.startsWith('0') && filteredValue.length > 1) {
          filteredValue = '0';
        }
        // Limitar a 9 dígitos
        if (filteredValue.length > 9) {
          filteredValue = filteredValue.slice(0, 9);
        }
        break;
      case 'identificacionDemandante':
        // Solo números si es persona natural
        if (formData.tipoPersona === 'natural') {
          filteredValue = onlyNumbers(value);
        }
        break;
      case 'demandante':
      case 'demandanteApoderado':
        // Solo letras y espacios para nombres
        filteredValue = onlyLetters(value);
        break;
      case 'demandanteTelefono':
      case 'demandadoTelefono':
        // Formato teléfono internacional
        filteredValue = phoneFormat(value);
        break;
      case 'demandado':
        // Solo letras y espacios para nombre del demandado
        filteredValue = onlyLetters(value);
        break;
      case 'numeroIdDemandado':
        // Validación según tipo de identificación
        if (formData.tipoIdDemandado === 'CC') {
          // Cédula de Ciudadanía: solo números
          filteredValue = value.replace(/[^0-9]/g, '');
        } else if (formData.tipoIdDemandado === 'NIT') {
          // NIT: números, puntos y guiones (ej: 899.999.061-4)
          filteredValue = value.replace(/[^0-9.\-]/g, '');
        } else if (formData.tipoIdDemandado === 'CE') {
          // Cédula Extranjería: números y letras (ej: E-123456 o 123456)
          filteredValue = value.replace(/[^0-9a-zA-Z\-]/g, '');
        }
        break;
      case 'numeroRadicado':
        // Máximo 23 caracteres para el radicado
        if (value.length > 23) {
          filteredValue = value.slice(0, 23);
        }
        break;
      default:
        filteredValue = value;
    }

    setFormData(prev => ({ ...prev, [field]: filteredValue }));
    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Agregar demandante a la lista
  const handleAgregarDemandante = () => {
    if (!nuevoDemandante.nombre.trim()) {
      toast.error('⚠️ Nombre incompleto', {
        description: 'Ingrese el nombre completo del demandante'
      });
      return;
    }
    if (!nuevoDemandante.identificacion.trim()) {
      toast.error('⚠️ Identificación incompleta', {
        description: 'Ingrese la identificación del demandante'
      });
      return;
    }

    const demandante = {
      id: `DEM-${Date.now()}`,
      nombre: nuevoDemandante.nombre,
      tipoPersona: nuevoDemandante.tipoPersona,
      identificacion: nuevoDemandante.identificacion
    };

    setFormData(prev => ({
      ...prev,
      demandantes: [...prev.demandantes, demandante]
    }));

    // Limpiar formulario de nuevo demandante
    setNuevoDemandante({
      nombre: '',
      tipoPersona: 'natural',
      identificacion: ''
    });

    toast.success('✅ Demandante agregado', {
      description: `${demandante.nombre} agregado a la lista`
    });
  };

  // Eliminar demandante de la lista
  const handleEliminarDemandante = (id: string) => {
    setFormData(prev => ({
      ...prev,
      demandantes: prev.demandantes.filter(d => d.id !== id)
    }));
    
    toast.info('🗑️ Demandante eliminado', {
      description: 'El demandante ha sido removido de la lista'
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.numeroRadicado.trim()) {
      newErrors.numeroRadicado = 'El número de radicado es obligatorio';
    }
    if (!formData.medioControl) {
      newErrors.medioControl = 'Seleccione el medio de control';
    }
    if (!formData.tipoProceso) {
      newErrors.tipoProceso = 'Seleccione el tipo de proceso';
    }
    if (!formData.demandante.trim()) {
      newErrors.demandante = 'El nombre del demandante es obligatorio';
    }
    if (!formData.identificacionDemandante.trim()) {
      newErrors.identificacionDemandante = 'La identificación es obligatoria';
    }
    if (formData.demandantes.length === 0) {
      newErrors.demandantes = 'Debe agregar al menos un demandante';
    }
    if (!formData.juzgado.trim()) {
      newErrors.juzgado = 'El juzgado es obligatorio';
    }
    if (!formData.ciudad.trim()) {
      newErrors.ciudad = 'La ciudad es obligatoria';
    }
    if (!formData.fechaNotificacion) {
      newErrors.fechaNotificacion = 'La fecha de notificación es obligatoria';
    }
    if (!formData.abogadoAsignado) {
      newErrors.abogadoAsignado = 'Debe asignar un abogado responsable';
    }
    if (!formData.pretensiones.trim()) {
      newErrors.pretensiones = 'Las pretensiones son obligatorias';
    }

    // ✅ Validación de formato de correo electrónico
    if (formData.demandanteEmail && !isValidEmail(formData.demandanteEmail)) {
      newErrors.demandanteEmail = 'El correo debe tener formato válido (ej: usuario@dominio.com)';
    }
    if (formData.demandadoEmail && !isValidEmail(formData.demandadoEmail)) {
      newErrors.demandadoEmail = 'El correo debe tener formato válido (ej: usuario@dominio.com)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('⚠️ Formulario incompleto', {
        description: 'Por favor complete todos los campos obligatorios marcados con *'
      });
      return;
    }

    onSave(formData);

    toast.success('✅ Demanda registrada exitosamente', {
      description: `Radicado: ${formData.numeroRadicado}`,
      duration: 4000
    });

    // Resetear formulario
    setFormData({
      numeroRadicado: '',
      medioControl: '',
      tipoProceso: '',
      demandante: '',
      tipoPersona: 'natural',
      identificacionDemandante: '',
      demandanteDireccion: '',
      demandanteTelefono: '',
      demandanteEmail: '',
      demandanteApoderado: '',
      demandado: 'ESAP - Escuela Superior de Administración Pública',
      tipoIdDemandado: 'NIT',
      numeroIdDemandado: '899.999.061-4',
      demandadoDireccion: 'Calle 44 #53-37, Bogotá D.C.',
      demandadoTelefono: '+57 601 220 2790',
      demandadoEmail: 'juridica@esap.edu.co',
      demandantes: [],
      cuantia: '',
      juzgado: '',
      ciudad: '',
      departamento: '',
      fechaNotificacion: '',
      fechaVencimiento: '',
      abogadoAsignado: '',
      etapa: 'NOTIFICADA',
      pretensiones: '',
      hechos: '',
      observaciones: ''
    });
    setNuevoDemandante({
      nombre: '',
      tipoPersona: 'natural',
      identificacion: ''
    });
    setErrors({});

    onClose();
  };

  return (
    <ModalSIGLPremium
      isOpen={isOpen}
      onClose={onClose}
      title="Nueva Demanda Judicial"
      subtitle="Registro de demanda contra ESAP"
      icon={<Scale className="w-6 h-6 text-white" />}
      size="lg"
      height="full"
      headerColor="blue"
      badges={[
        {
          label: 'Formulario de Registro',
          bg: 'rgba(255, 255, 255, 0.2)',
          color: '#FFFFFF',
          className: 'border border-white/30'
        }
      ]}
      footerInfo={
        <p className="text-xs text-gray-600">
          Los campos marcados con <span className="text-red-600 font-bold">*</span> son obligatorios
        </p>
      }
      footerActions={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="font-bold"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            className="font-bold text-white"
            style={{ background: '#003DA5' }}
          >
            <Save className="w-4 h-4 mr-2" />
            Registrar Demanda
          </Button>
        </>
      }
      ariaDescription="Formulario de registro de nueva demanda judicial contra ESAP"
    >
      <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">

        {/* Sección 1: Datos del Proceso */}
        <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg border-l-4 border-l-blue-600">
          <h3 className="text-sm font-black text-blue-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            DATOS DEL PROCESO JUDICIAL
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Número de Radicado */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Número de Radicado <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.numeroRadicado}
                onChange={(e) => handleInputChange('numeroRadicado', e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${errors.numeroRadicado
                  ? 'border-red-500 focus:ring-red-500 bg-red-50'
                  : 'border-gray-300 focus:ring-blue-500'
                  }`}
                placeholder="Ej: 11001333300120240001 (23 dígitos)"
              />
              {errors.numeroRadicado && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3 h-3" />
                  {errors.numeroRadicado}
                </p>
              )}
            </div>

            {/* Medio de Control */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Medio de Control <span className="text-red-600">*</span>
              </label>
              <select
                value={formData.medioControl}
                onChange={(e) => handleInputChange('medioControl', e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 font-semibold ${errors.medioControl
                  ? 'border-red-500 focus:ring-red-500 bg-red-50'
                  : 'border-gray-300 focus:ring-blue-500'
                  }`}
              >
                <option value="">Seleccione...</option>
                {MEDIOS_CONTROL.map(medio => (
                  <option key={medio} value={medio}>{medio}</option>
                ))}
              </select>
              {errors.medioControl && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3 h-3" />
                  {errors.medioControl}
                </p>
              )}
            </div>

            {/* Tipo de Proceso (Dinámico desde Configuraciones) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Tipo de Proceso <span className="text-red-600">*</span>
              </label>
              <select
                value={formData.tipoProceso}
                onChange={(e) => handleInputChange('tipoProceso', e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 font-semibold ${errors.tipoProceso
                  ? 'border-red-500 focus:ring-red-500 bg-red-50'
                  : 'border-gray-300 focus:ring-blue-500'
                  }`}
              >
                <option value="">Seleccione tipo de proceso...</option>
                {tiposProcesosActivos.map(tipo => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nombre} ({tipo.plazo} días)
                  </option>
                ))}
              </select>
              {formData.tipoProceso && (
                <p className="text-xs text-gray-500 mt-1 italic">
                  {tiposProcesosActivos.find(t => t.id === formData.tipoProceso)?.descripcion}
                </p>
              )}
              {errors.tipoProceso && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3 h-3" />
                  {errors.tipoProceso}
                </p>
              )}
            </div>

            {/* Etapa */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Etapa Procesal
              </label>
              <select
                value={formData.etapa}
                onChange={(e) => handleInputChange('etapa', e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                <option value="NOTIFICADA">Notificada</option>
                <option value="CONTESTACIÓN">Contestación</option>
                <option value="PROBATORIA">Probatoria</option>
                <option value="ALEGATOS">Alegatos</option>
              </select>
            </div>

            {/* Cuantía */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Cuantía (COP)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.cuantia}
                  onChange={(e) => handleInputChange('cuantia', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: 50.000.000"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sección 2: Datos del Demandante */}
        <div className="bg-gradient-to-br from-orange-50 to-white p-4 rounded-lg border-l-4 border-l-orange-500">
          <h3 className="text-sm font-black text-orange-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-orange-600" />
            DATOS DEL DEMANDANTE
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tipo de Persona */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-2">
                Tipo de Persona
              </label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoPersona"
                    value="natural"
                    checked={formData.tipoPersona === 'natural'}
                    onChange={(e) => handleInputChange('tipoPersona', e.target.value)}
                    className="w-4 h-4"
                    style={{ accentColor: '#003DA5' }}
                  />
                  <span className="text-sm font-semibold text-gray-700">Natural</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoPersona"
                    value="juridica"
                    checked={formData.tipoPersona === 'juridica'}
                    onChange={(e) => handleInputChange('tipoPersona', e.target.value)}
                    className="w-4 h-4"
                    style={{ accentColor: '#003DA5' }}
                  />
                  <span className="text-sm font-semibold text-gray-700">Jurídica</span>
                </label>
                <input
                  type="text"
                  value={formData.identificacionDemandante}
                  onChange={(e) => handleInputChange('identificacionDemandante', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errors.identificacionDemandante
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  placeholder={formData.tipoPersona === 'natural' ? 'Ej: 1234567890' : 'Ej: 900123456-1'}
                />
                {errors.identificacionDemandante && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.identificacionDemandante}
                  </p>
                )}
              </div>
            </div>

            {/* Nombre Completo */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Nombre Completo / Razón Social <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.demandante}
                onChange={(e) => handleInputChange('demandante', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errors.demandante
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
                  }`}
                placeholder="Nombre completo del demandante"
              />
              {errors.demandante && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.demandante}
                </p>
              )}
            </div>

            {/* Dirección */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Dirección de Notificación
              </label>
              <input
                type="text"
                value={formData.demandanteDireccion || ''}
                onChange={(e) => handleInputChange('demandanteDireccion', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Calle 100 #15-20, Bogotá D.C."
              />
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="text"
                value={formData.demandanteTelefono || ''}
                onChange={(e) => handleInputChange('demandanteTelefono', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: +57 310 123 4567"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={formData.demandanteEmail || ''}
                onChange={(e) => handleInputChange('demandanteEmail', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errors.demandanteEmail
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
                  }`}
                placeholder="Ej: demandante@email.com"
              />
              {errors.demandanteEmail && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.demandanteEmail}
                </p>
              )}
            </div>

            {/* Apoderado del demandante */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Apoderado del Demandante
              </label>
              <input
                type="text"
                value={formData.demandanteApoderado || ''}
                onChange={(e) => handleInputChange('demandanteApoderado', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nombre del abogado representante del demandante"
              />
            </div>
          </div>
        </div>

        {/* Sección 3: Datos del Demandado */}
        <div className="bg-gradient-to-br from-yellow-50 to-white p-4 rounded-lg border-l-4 border-l-yellow-600">
          <h3 className="text-sm font-black text-yellow-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-yellow-600" />
            DATOS DEL DEMANDADO
            <Badge className="ml-2 text-xs bg-yellow-100 text-yellow-800 border-yellow-200">Pre-llenado</Badge>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombre del demandado */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Nombre / Razón Social
              </label>
              <input
                type="text"
                value={formData.demandado}
                onChange={(e) => handleInputChange('demandado', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ESAP - Escuela Superior de Administración Pública"
              />
            </div>

            {/* Tipo ID */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Tipo de Identificación
              </label>
              <select
                value={formData.tipoIdDemandado}
                onChange={(e) => handleInputChange('tipoIdDemandado', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="NIT">NIT</option>
                <option value="CC">Cédula de Ciudadanía</option>
                <option value="CE">Cédula Extranjería</option>
              </select>
            </div>

            {/* Número ID */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Número de Identificación
              </label>
              <input
                type="text"
                value={formData.numeroIdDemandado}
                onChange={(e) => handleInputChange('numeroIdDemandado', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="899.999.061-4"
              />
            </div>

            {/* Dirección */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Dirección
              </label>
              <input
                type="text"
                value={formData.demandadoDireccion}
                onChange={(e) => handleInputChange('demandadoDireccion', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Calle 44 #53-37, Bogotá D.C."
              />
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="text"
                value={formData.demandadoTelefono}
                onChange={(e) => handleInputChange('demandadoTelefono', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+57 601 220 2790"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={formData.demandadoEmail}
                onChange={(e) => handleInputChange('demandadoEmail', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errors.demandadoEmail
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
                  }`}
                placeholder="juridica@esap.edu.co"
              />
              {errors.demandadoEmail && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.demandadoEmail}
                </p>
              )}
            </div>
          </div>




        </div>

        {/* Sección 3: Juzgado y Ubicación */}
        <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-lg border-l-4 border-l-purple-600">
          <h3 className="text-sm font-black text-purple-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-600" />
            JUZGADO Y UBICACIÓN
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Juzgado */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Juzgado / Tribunal <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <Gavel className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.juzgado}
                  onChange={(e) => handleInputChange('juzgado', e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${errors.juzgado
                    ? 'border-red-500 focus:ring-red-500 bg-red-50'
                    : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  placeholder="Ej: Juzgado 10 Administrativo del Circuito de Bogotá"
                />
              </div>
              {errors.juzgado && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3 h-3" />
                  {errors.juzgado}
                </p>
              )}
            </div>

            {/* Departamento */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Departamento
              </label>
              <select
                value={formData.departamento}
                onChange={(e) => handleInputChange('departamento', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                <option value="">Seleccione...</option>
                {DEPARTAMENTOS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Ciudad */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Ciudad <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.ciudad}
                  onChange={(e) => handleInputChange('ciudad', e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${errors.ciudad
                    ? 'border-red-500 focus:ring-red-500 bg-red-50'
                    : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  placeholder="Ej: Bogotá D.C."
                />
              </div>
              {errors.ciudad && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3 h-3" />
                  {errors.ciudad}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sección 4: Fechas y Asignación */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5" style={{ color: '#003DA5' }} />
            Fechas y Asignación
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Fecha de Notificación <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                value={formData.fechaNotificacion}
                onChange={(e) => handleInputChange('fechaNotificacion', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errors.fechaNotificacion ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
              />
              {errors.fechaNotificacion && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.fechaNotificacion}
                </p>
              )}
            </div>

            {/* Fecha de Vencimiento - Auto-calculada */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Fecha de Vencimiento
                <span className="ml-2 text-xs font-normal text-gray-500">(auto-calculada)</span>
              </label>
              <div className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-semibold">
                {formData.fechaVencimiento ? (
                  <>
                    📅 {new Date(formData.fechaVencimiento + 'T00:00:00').toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                    {formData.tipoProceso && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({tiposProcesosActivos.find(t => t.id === formData.tipoProceso)?.plazo} días desde notificación)
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-gray-400 italic">Seleccione tipo de proceso y fecha de notificación</span>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Abogado Responsable <span className="text-red-600">*</span>
              </label>
              <select
                value={formData.abogadoAsignado}
                onChange={(e) => handleInputChange('abogadoAsignado', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errors.abogadoAsignado ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                disabled={loadingAbogados}
              >
                <option value="">{loadingAbogados ? 'Cargando abogados...' : 'Seleccione un abogado...'}</option>
                {abogados.map((abogado) => (
                  <option key={abogado.id} value={abogado.nombreCompleto}>
                    {abogado.nombreCompleto}
                  </option>
                ))}
              </select>
              {errors.abogadoAsignado && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.abogadoAsignado}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sección 5: Detalles del Proceso */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-lg border-l-4 border-l-gray-600">
          <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            DETALLES DEL PROCESO
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Pretensiones <span className="text-red-600">*</span>
              </label>
              <textarea
                value={formData.pretensiones}
                onChange={(e) => handleInputChange('pretensiones', e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${errors.pretensiones ? 'border-red-500 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                placeholder="Describa las pretensiones de la demanda..."
              />
              {errors.pretensiones && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3 h-3" />
                  {errors.pretensiones}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Hechos</label>
              <textarea
                value={formData.hechos}
                onChange={(e) => handleInputChange('hechos', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Resumen de los hechos de la demanda..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Observaciones Adicionales</label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => handleInputChange('observaciones', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Notas u observaciones relevantes..."
              />
            </div>
          </div>
        </div>
      </form>
    </ModalSIGLPremium>
  );
}
