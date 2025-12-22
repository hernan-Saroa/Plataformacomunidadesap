/**
 * ============================================
 * FORMULARIO COMPLETO: REQUERIMIENTO DE ÓRGANO DE CONTROL
 * ============================================
 * 
 * REQ-MOD02-001/002 - Implementación COMPLETA PASO 2 y PASO 3
 * 
 * FUNCIONALIDADES:
 * ✅ Selección de órgano de control (parametrizado)
 * ✅ Tipo de requerimiento (INFORMACION / AJUSTE)
 * ✅ Cálculo automático de plazos según órgano
 * ✅ Plazo reducido para AJUSTE (10 días)
 * ✅ Fecha de recepción y vencimiento
 * ✅ Descripción detallada del requerimiento
 * ✅ Asignación de abogado responsable
 * ✅ Selección de territorial
 * ✅ Carga de documentos adjuntos
 * ✅ Visualización del plazo calculado
 * ✅ Información de plazos por órgano
 * ✅ Validaciones completas
 */

import { useState, useEffect } from 'react';
import {
  AlertCircle,
  Calendar,
  FileText,
  User,
  Building2,
  Shield,
  Clock,
  Paperclip,
  Plus,
  X,
  Info,
  CheckCircle,
} from 'lucide-react';
import { InputSIGL, TextareaSIGL } from '../design-system';
import { SelectSIGL } from '../design-system';
import { ButtonSIGL } from '../design-system';
import { CardSIGL } from '../design-system';
import { BadgeSIGL } from '../design-system';
import {
  sumarDiasHabiles,
  calcularInfoPlazo,
  validarFechaRecepcion,
  formatearFecha,
} from '../../../../utils/calcularDiasHabiles';

type OrganoControl =
  | 'Contraloría General de la República'
  | 'Procuraduría General de la Nación'
  | 'Defensoría del Pueblo'
  | 'DANE'
  | 'Superintendencia de Educación'
  | 'Otro';

type TipoRequerimiento = 'INFORMACION' | 'AJUSTE';

interface FormData {
  organoControl: OrganoControl;
  tipo: TipoRequerimiento;
  numeroRadicado: string;
  fechaRecepcion: string;
  descripcion: string;
  abogadoAsignado: string;
  territorial: string;
  documentos: File[];
}

// Configuración de plazos (REQ-MOD02-001 PASO 3)
const PLAZOS_ORGANOS: Record<OrganoControl, number> = {
  'Contraloría General de la República': 30,
  'Procuraduría General de la Nación': 20,
  'Defensoría del Pueblo': 15,
  'DANE': 30,
  'Superintendencia de Educación': 30,
  'Otro': 30,
};

const ABOGADOS_DISPONIBLES = [
  'Dra. María López',
  'Dr. Carlos Ramírez',
  'Dr. Luis García',
  'Dra. Ana Martínez',
  'Dr. Pedro Sánchez',
];

const TERRITORIALES = [
  'Nacional',
  'Antioquia',
  'Cundinamarca',
  'Valle del Cauca',
  'Atlántico',
  'Santander',
  'Bolívar',
  'Boyacá',
  'Caldas',
  'Cauca',
];

// Convertir a formato SelectOption[]
const ORGANOS_OPTIONS = Object.keys(PLAZOS_ORGANOS).map((organo) => ({
  value: organo,
  label: organo,
}));

const ABOGADOS_OPTIONS = ABOGADOS_DISPONIBLES.map((abogado) => ({
  value: abogado,
  label: abogado,
}));

const TERRITORIALES_OPTIONS = TERRITORIALES.map((territorial) => ({
  value: territorial,
  label: territorial,
}));

export function FormularioRequerimientoOrganoControl({
  onGuardar,
  onCancelar,
}: {
  onGuardar: (data: FormData) => void;
  onCancelar: () => void;
}) {
  const [formData, setFormData] = useState<FormData>({
    organoControl: 'Contraloría General de la República',
    tipo: 'INFORMACION',
    numeroRadicado: '',
    fechaRecepcion: new Date().toISOString().split('T')[0],
    descripcion: '',
    abogadoAsignado: 'Dra. María López',
    territorial: 'Nacional',
    documentos: [],
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [mostrarInfoPlazos, setMostrarInfoPlazos] = useState(false);

  // Calcular plazo automáticamente (REQ-MOD02-001 PASO 3)
  const plazoCalculado =
    formData.tipo === 'AJUSTE' ? 10 : PLAZOS_ORGANOS[formData.organoControl];

  const fechaVencimientoCalculada = sumarDiasHabiles(
    formData.fechaRecepcion,
    plazoCalculado
  );

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Limpiar error cuando el usuario edita
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const nuevosArchivos = Array.from(e.target.files);
      setFormData((prev) => ({
        ...prev,
        documentos: [...prev.documentos, ...nuevosArchivos],
      }));
    }
  };

  const handleRemoveFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      documentos: prev.documentos.filter((_, i) => i !== index),
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.numeroRadicado.trim()) {
      newErrors.numeroRadicado = 'El número de radicado es obligatorio';
    }

    if (!formData.descripcion.trim()) {
      newErrors.descripcion = 'La descripción del requerimiento es obligatoria';
    } else if (formData.descripcion.trim().length < 50) {
      newErrors.descripcion = 'La descripción debe tener al menos 50 caracteres';
    }

    if (!formData.fechaRecepcion) {
      newErrors.fechaRecepcion = 'La fecha de recepción es obligatoria';
    } else {
      const validacion = validarFechaRecepcion(new Date(formData.fechaRecepcion));
      if (!validacion.valida) {
        newErrors.fechaRecepcion = validacion.error;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      // Enviar datos completos incluyendo plazo y fecha de vencimiento
      const datosCompletos = {
        ...formData,
        plazoCalculado,
        fechaVencimiento: fechaVencimientoCalculada,
        asunto: formData.descripcion, // Alias para compatibilidad
        responsable: formData.abogadoAsignado, // Alias para compatibilidad
      };
      
      onGuardar(datosCompletos);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Banner Informativo */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
            <Info className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-blue-900 mb-1">REQ-MOD02-001/002: Registro de Requerimiento</h4>
            <p className="text-sm text-blue-800">
              Complete todos los campos obligatorios. El sistema calculará automáticamente el plazo de respuesta según el órgano de control y el tipo de requerimiento.
            </p>
          </div>
        </div>
      </div>

      {/* Sección 1: Órgano y Tipo */}
      <CardSIGL className="p-6 bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200">
        <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-600" />
          1. Identificación del Órgano de Control
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Órgano de Control */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Órgano de Control *
            </label>
            <SelectSIGL
              value={formData.organoControl}
              onChange={(value) => handleChange('organoControl', value)}
              required
              options={ORGANOS_OPTIONS}
              searchable
              placeholder="Selecciona el órgano de control..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Plazo estándar: {PLAZOS_ORGANOS[formData.organoControl]} días hábiles
            </p>
          </div>

          {/* Tipo de Requerimiento */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Tipo de Requerimiento *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleChange('tipo', 'INFORMACION')}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  formData.tipo === 'INFORMACION'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="font-bold text-sm text-gray-900">Información</div>
                <div className="text-xs text-gray-600">Solicitud de datos</div>
              </button>
              <button
                type="button"
                onClick={() => handleChange('tipo', 'AJUSTE')}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  formData.tipo === 'AJUSTE'
                    ? 'border-orange-500 bg-orange-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="font-bold text-sm text-gray-900">Ajuste</div>
                <div className="text-xs text-gray-600">Corrección de info</div>
              </button>
            </div>
            {formData.tipo === 'AJUSTE' && (
              <div className="mt-2 p-2 bg-orange-100 border border-orange-300 rounded-lg">
                <p className="text-xs text-orange-800 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Plazo reducido a 10 días hábiles
                </p>
              </div>
            )}
          </div>
        </div>
      </CardSIGL>

      {/* Sección 2: Datos del Requerimiento */}
      <CardSIGL className="p-6 border-2">
        <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-600" />
          2. Datos del Requerimiento
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Número de Radicado */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Número de Radicado / Oficio *
            </label>
            <InputSIGL
              value={formData.numeroRadicado}
              onChange={(e) => handleChange('numeroRadicado', e.target.value)}
              placeholder="Ej: CGR-2025-0045 o PGN-2025-0123"
              error={errors.numeroRadicado}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Ingrese el número de radicado tal como aparece en el oficio
            </p>
          </div>

          {/* Fecha de Recepción */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Fecha de Recepción *
            </label>
            <InputSIGL
              type="date"
              value={formData.fechaRecepcion}
              onChange={(e) => handleChange('fechaRecepcion', e.target.value)}
              error={errors.fechaRecepcion}
              required
              max={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-gray-500 mt-1">Fecha en que se recibió el requerimiento</p>
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Descripción del Requerimiento *
          </label>
          <TextareaSIGL
            value={formData.descripcion}
            onChange={(e) => handleChange('descripcion', e.target.value)}
            placeholder="Describa detalladamente el contenido del requerimiento recibido del órgano de control. Incluya: ¿Qué información solicitan? ¿Qué documentos requieren? ¿Cuál es el propósito de la solicitud?"
            rows={5}
            error={errors.descripcion}
            required
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-500">Mínimo 50 caracteres</p>
            <p
              className={`text-xs font-bold ${
                formData.descripcion.length >= 50 ? 'text-green-600' : 'text-gray-400'
              }`}
            >
              {formData.descripcion.length} / 50
            </p>
          </div>
        </div>
      </CardSIGL>

      {/* Sección 3: Asignación */}
      <CardSIGL className="p-6 border-2">
        <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-green-600" />
          3. Asignación de Responsable y Territorial
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Abogado Asignado */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Abogado Responsable *
            </label>
            <SelectSIGL
              value={formData.abogadoAsignado}
              onChange={(value) => handleChange('abogadoAsignado', value)}
              required
              options={ABOGADOS_OPTIONS}
            />
            <p className="text-xs text-gray-500 mt-1">
              Abogado que preparará la respuesta
            </p>
          </div>

          {/* Territorial */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Territorial *
            </label>
            <SelectSIGL
              value={formData.territorial}
              onChange={(value) => handleChange('territorial', value)}
              options={TERRITORIALES_OPTIONS}
            />
            <p className="text-xs text-gray-500 mt-1">Sede territorial afectada</p>
          </div>
        </div>
      </CardSIGL>

      {/* Sección 4: Documentos Adjuntos */}
      <CardSIGL className="p-6 border-2">
        <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
          <Paperclip className="w-5 h-5 text-gray-600" />
          4. Documentos Adjuntos (Opcional)
        </h3>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
          <div className="text-center mb-4">
            <Paperclip className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-2">
              Adjunte el oficio original y documentos relacionados
            </p>
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              />
              <ButtonSIGL type="button" variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Seleccionar Archivos
              </ButtonSIGL>
            </label>
          </div>

          {formData.documentos.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-bold text-gray-700 mb-2">
                Archivos seleccionados ({formData.documentos.length}):
              </p>
              {formData.documentos.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    className="p-1 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardSIGL>

      {/* Sección 5: Cálculo Automático de Plazo (REQ-MOD02-001 PASO 3) */}
      <CardSIGL className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-300">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600" />
            Plazo Calculado Automáticamente
          </h3>
          <button
            type="button"
            onClick={() => setMostrarInfoPlazos(!mostrarInfoPlazos)}
            className="text-sm text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1"
          >
            <Info className="w-4 h-4" />
            Ver info plazos
          </button>
        </div>

        <div className="bg-white rounded-lg p-4 border-2 border-purple-300 shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-xs text-purple-600 mb-1 font-bold">Órgano</div>
              <div className="font-bold text-sm text-purple-900">
                {formData.organoControl}
              </div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-xs text-purple-600 mb-1 font-bold">Plazo</div>
              <div className="font-bold text-3xl text-purple-900">{plazoCalculado}</div>
              <div className="text-xs text-purple-600">días hábiles</div>
              <div className="text-xs text-purple-700 mt-1">
                {formData.tipo === 'AJUSTE' ? '⚡ Plazo reducido (ajuste)' : 'Plazo estándar'}
              </div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-xs text-purple-600 mb-1 font-bold">Vencimiento</div>
              <div className="font-bold text-sm text-purple-900">
                {formatearFecha(fechaVencimientoCalculada)}
              </div>
            </div>
          </div>

          {mostrarInfoPlazos && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900">
                  <p className="font-bold mb-2">Plazos por órgano (REQ-MOD02-001 PASO 3):</p>
                  <ul className="space-y-1">
                    <li className="flex items-center gap-2">
                      <BadgeSIGL variant="info" size="sm">
                        30d
                      </BadgeSIGL>
                      Contraloría General de la República
                    </li>
                    <li className="flex items-center gap-2">
                      <BadgeSIGL variant="info" size="sm">
                        20d
                      </BadgeSIGL>
                      Procuraduría General de la Nación
                    </li>
                    <li className="flex items-center gap-2">
                      <BadgeSIGL variant="info" size="sm">
                        15d
                      </BadgeSIGL>
                      Defensoría del Pueblo
                    </li>
                    <li className="flex items-center gap-2">
                      <BadgeSIGL variant="info" size="sm">
                        30d
                      </BadgeSIGL>
                      DANE, Superintendencia y otros
                    </li>
                    <li className="flex items-center gap-2 mt-2 pt-2 border-t border-blue-300">
                      <BadgeSIGL variant="warning" size="sm">
                        10d
                      </BadgeSIGL>
                      <strong>Requerimientos de AJUSTE (plazo reducido)</strong>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardSIGL>

      {/* Botones de acción */}
      <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-200">
        <ButtonSIGL type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </ButtonSIGL>
        <ButtonSIGL type="submit" variant="primary" className="bg-red-600 hover:bg-red-700">
          <CheckCircle className="w-4 h-4 mr-2" />
          Crear Requerimiento
        </ButtonSIGL>
      </div>
    </form>
  );
}