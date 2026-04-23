/**
 * ModalCrearProcesoCoactivo - Modal para crear un nuevo proceso coactivo
 * DISEÑO LIMPIO ESAP 2025
 */

import { useState } from 'react';
import { X, Plus, User, Building2, DollarSign, Calendar, FileText, CheckCircle, AlertTriangle, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { ModalHeaderClean } from '../modulos/ModalHeaderClean';

interface ModalCrearProcesoCoactivoProps {
  isOpen: boolean;
  onClose: () => void;
  onCrear?: (proceso: any) => void;
}

export function ModalCrearProcesoCoactivo({
  isOpen,
  onClose,
  onCrear
}: ModalCrearProcesoCoactivoProps) {
  const [paso, setPaso] = useState<1 | 2 | 3>(1);

  // Paso 1: Tipo y datos del deudor
  const [tipoDeudor, setTipoDeudor] = useState<'PERSONA' | 'EMPRESA'>('PERSONA');
  const [nombreDeudor, setNombreDeudor] = useState('');
  const [documentoDeudor, setDocumentoDeudor] = useState('');
  const [correoDeudor, setCorreoDeudor] = useState('');
  const [telefonoDeudor, setTelefonoDeudor] = useState('');
  const [direccionDeudor, setDireccionDeudor] = useState('');

  // Paso 2: Obligaciones
  const [obligaciones, setObligaciones] = useState<{
    concepto: string;
    valor: string;
    periodo: string;
  }[]>([{ concepto: '', valor: '', periodo: '' }]);

  // Paso 3: Información del proceso
  const [responsable, setResponsable] = useState('');
  const [fechaLimite, setFechaLimite] = useState('');
  const [fechaEjecutoria, setFechaEjecutoria] = useState('');
  const [tipoInteresAplicable, setTipoInteresAplicable] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const agregarObligacion = () => {
    setObligaciones([...obligaciones, { concepto: '', valor: '', periodo: '' }]);
  };

  const eliminarObligacion = (index: number) => {
    if (obligaciones.length > 1) {
      setObligaciones(obligaciones.filter((_, i) => i !== index));
    }
  };

  const actualizarObligacion = (index: number, campo: string, valor: string) => {
    const nuevas = [...obligaciones];
    nuevas[index] = { ...nuevas[index], [campo]: valor };
    setObligaciones(nuevas);
  };

  const calcularValorTotal = () => {
    return obligaciones.reduce((total, obl) => {
      const valor = parseFloat(obl.valor) || 0;
      return total + valor;
    }, 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const validarPaso1 = () => {
    if (!nombreDeudor.trim()) {
      toast.error('Ingrese el nombre del deudor');
      return false;
    }
    if (!documentoDeudor.trim()) {
      toast.error('Ingrese el documento del deudor');
      return false;
    }
    if (!correoDeudor.trim() || !correoDeudor.includes('@')) {
      toast.error('Ingrese un correo válido');
      return false;
    }
    return true;
  };

  const validarPaso2 = () => {
    const obligacionesValidas = obligaciones.filter(
      obl => obl.concepto.trim() && obl.valor.trim() && parseFloat(obl.valor) > 0
    );

    if (obligacionesValidas.length === 0) {
      toast.error('Debe agregar al menos una obligación válida');
      return false;
    }

    if (calcularValorTotal() === 0) {
      toast.error('El valor total debe ser mayor a cero');
      return false;
    }

    return true;
  };

  const handleContinuar = () => {
    if (paso === 1 && validarPaso1()) {
      setPaso(2);
    } else if (paso === 2 && validarPaso2()) {
      setPaso(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!responsable) {
      toast.error('Seleccione un responsable');
      return;
    }

    if (!fechaLimite) {
      toast.error('Ingrese la fecha límite');
      return;
    }

    if (!fechaEjecutoria) {
      toast.error('Ingrese la fecha de ejecutoria del título');
      return;
    }

    if (!tipoInteresAplicable) {
      toast.error('Seleccione el tipo de interés aplicable');
      return;
    }

    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const procesoId = `PC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

      const nuevoProceso = {
        id: procesoId,
        deudor: {
          tipo: tipoDeudor,
          nombre: nombreDeudor,
          documento: documentoDeudor,
          correo: correoDeudor,
          telefono: telefonoDeudor,
          direccion: direccionDeudor
        },
        obligaciones: obligaciones.filter(obl => obl.concepto.trim() && parseFloat(obl.valor) > 0),
        valorTotal: calcularValorTotal(),
        responsable,
        fechaLimite: new Date(fechaLimite),
        fechaEjecutoria: new Date(fechaEjecutoria),
        tipoInteresAplicable,
        observaciones,
        etapa: 'PERSUASIVA',
        fechaCreacion: new Date()
      };

      toast.success(`✅ Proceso Coactivo creado exitosamente`, {
        description: `${procesoId} - ${nombreDeudor}`
      });

      onCrear?.(nuevoProceso);
      onClose();
    } catch (error) {
      toast.error('Error al crear el proceso coactivo');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const responsablesDisponibles = [
    'Dra. María Fernández',
    'Dr. Carlos Pérez',
    'Dra. Ana Rodríguez',
    'Dr. Luis Martínez'
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[9998]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl bg-white rounded-2xl shadow-2xl z-[9999] max-h-[90vh] overflow-y-auto"
          >
            {/* Header ESAP 2025 - Limpio */}
            <div className="px-6 py-5 bg-white border-b flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-red-50 border-2 border-red-200">
                  <Plus className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900">Crear Nuevo Proceso Coactivo</h2>
                  <p className="text-sm text-gray-600">Paso {paso} de 3</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Indicador de Pasos */}
            <div className="px-6 py-4 border-b bg-gray-50">
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${paso === 1 ? 'bg-red-600 text-white' : paso > 1 ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
                    }`}>
                    {paso > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
                  </div>
                  <span className={`text-sm font-semibold ${paso === 1 ? 'text-red-600' : paso > 1 ? 'text-green-600' : 'text-gray-500'}`}>
                    Deudor
                  </span>
                </div>
                <div className="w-16 h-0.5 bg-gray-300" />
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${paso === 2 ? 'bg-red-600 text-white' : paso > 2 ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
                    }`}>
                    {paso > 2 ? <CheckCircle className="w-5 h-5" /> : '2'}
                  </div>
                  <span className={`text-sm font-semibold ${paso === 2 ? 'text-red-600' : paso > 2 ? 'text-green-600' : 'text-gray-500'}`}>
                    Obligaciones
                  </span>
                </div>
                <div className="w-16 h-0.5 bg-gray-300" />
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${paso === 3 ? 'bg-red-600 text-white' : 'bg-gray-300 text-gray-600'
                    }`}>
                    3
                  </div>
                  <span className={`text-sm font-semibold ${paso === 3 ? 'text-red-600' : 'text-gray-500'}`}>
                    Proceso
                  </span>
                </div>
              </div>
            </div>

            {/* Contenido */}
            <form onSubmit={handleSubmit} className="p-6">

              {/* PASO 1: Información del Deudor */}
              {paso === 1 && (
                <div className="space-y-6">

                  {/* Tipo de Deudor */}
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-3">
                      Tipo de Deudor *
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setTipoDeudor('PERSONA')}
                        className={`p-6 rounded-lg border-2 transition-all ${tipoDeudor === 'PERSONA'
                          ? 'border-red-600 bg-red-50'
                          : 'border-gray-300 bg-white hover:border-gray-400'
                          }`}
                      >
                        <User className="w-8 h-8 mx-auto mb-2 text-red-600" />
                        <p className="text-sm font-bold text-gray-900">Persona Natural</p>
                        <p className="text-xs text-gray-600 mt-1">Cédula de ciudadanía</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoDeudor('EMPRESA')}
                        className={`p-6 rounded-lg border-2 transition-all ${tipoDeudor === 'EMPRESA'
                          ? 'border-red-600 bg-red-50'
                          : 'border-gray-300 bg-white hover:border-gray-400'
                          }`}
                      >
                        <Building2 className="w-8 h-8 mx-auto mb-2 text-red-600" />
                        <p className="text-sm font-bold text-gray-900">Persona Jurídica</p>
                        <p className="text-xs text-gray-600 mt-1">NIT</p>
                      </button>
                    </div>
                  </div>

                  {/* Datos del Deudor */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        {tipoDeudor === 'PERSONA' ? 'Nombre Completo' : 'Razón Social'} *
                      </label>
                      <input
                        type="text"
                        value={nombreDeudor}
                        onChange={(e) => setNombreDeudor(e.target.value)}
                        placeholder={tipoDeudor === 'PERSONA' ? 'Ej: Juan Carlos Pérez López' : 'Ej: Constructora ABC S.A.S.'}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        {tipoDeudor === 'PERSONA' ? 'Cédula' : 'NIT'} *
                      </label>
                      <input
                        type="text"
                        value={documentoDeudor}
                        onChange={(e) => setDocumentoDeudor(e.target.value)}
                        placeholder={tipoDeudor === 'PERSONA' ? '1234567890' : '900123456-7'}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 outline-none font-mono"
                        maxLength={11}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Correo Electrónico *
                      </label>
                      <input
                        type="email"
                        value={correoDeudor}
                        onChange={(e) => setCorreoDeudor(e.target.value)}
                        placeholder="correo@ejemplo.com"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Teléfono *
                      </label>
                      <input
                        type="tel"
                        value={telefonoDeudor}
                        onChange={(e) => setTelefonoDeudor(e.target.value)}
                        placeholder="3001234567"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 outline-none"
                        maxLength={15}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Dirección *
                      </label>
                      <input
                        type="text"
                        value={direccionDeudor}
                        onChange={(e) => setDireccionDeudor(e.target.value)}
                        placeholder="Calle 123 # 45-67"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t">
                    <button
                      type="button"
                      onClick={handleContinuar}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {/* PASO 2: Obligaciones */}
              {paso === 2 && (
                <div className="space-y-6">

                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-bold text-blue-900">💰 Registro de Obligaciones</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Ingrese cada obligación pendiente que conforma la deuda total del proceso coactivo
                    </p>
                  </div>

                  {obligaciones.map((obligacion, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-bold text-gray-900">Obligación #{index + 1}</p>
                        {obligaciones.length > 1 && (
                          <button
                            type="button"
                            onClick={() => eliminarObligacion(index)}
                            className="text-xs text-red-600 hover:text-red-700 font-semibold"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            Concepto *
                          </label>
                          <input
                            type="text"
                            value={obligacion.concepto}
                            onChange={(e) => actualizarObligacion(index, 'concepto', e.target.value)}
                            placeholder="Ej: Matrícula semestre 2024-1"
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            Valor *
                          </label>
                          <input
                            type="number"
                            value={obligacion.valor}
                            onChange={(e) => actualizarObligacion(index, 'valor', e.target.value)}
                            placeholder="0"
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 outline-none text-sm font-mono"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            Período
                          </label>
                          <input
                            type="text"
                            value={obligacion.periodo}
                            onChange={(e) => actualizarObligacion(index, 'periodo', e.target.value)}
                            placeholder="Ej: 2024-1"
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 outline-none text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={agregarObligacion}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-400 rounded-lg text-gray-700 font-semibold hover:border-red-500 hover:text-red-600 transition-colors"
                  >
                    + Agregar Otra Obligación
                  </button>

                  {/* Total */}
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-red-900">Valor Total de la Deuda</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(calcularValorTotal())}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setPaso(1)}
                      className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Volver
                    </button>
                    <button
                      type="button"
                      onClick={handleContinuar}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {/* PASO 3: Información del Proceso */}
              {paso === 3 && (
                <div className="space-y-6">

                  {/* Resumen */}
                  <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                    <p className="text-xs text-gray-600 font-bold mb-2">Resumen del Proceso</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Deudor:</p>
                        <p className="font-bold text-gray-900">{nombreDeudor}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Valor Total:</p>
                        <p className="font-bold text-red-600">{formatCurrency(calcularValorTotal())}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Documento:</p>
                        <p className="font-mono text-gray-900">{documentoDeudor}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Obligaciones:</p>
                        <p className="font-bold text-gray-900">{obligaciones.length}</p>
                      </div>
                    </div>
                  </div>

                  {/* Datos del Proceso */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Responsable Asignado *
                      </label>
                      <select
                        value={responsable}
                        onChange={(e) => setResponsable(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 outline-none"
                        required
                      >
                        <option value="">Seleccione un responsable</option>
                        {responsablesDisponibles.map(resp => (
                          <option key={resp} value={resp}>{resp}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Fecha Límite de Gestión *
                      </label>
                      <input
                        type="date"
                        value={fechaLimite}
                        onChange={(e) => setFechaLimite(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Fecha de Ejecutoria (Título) *
                      </label>
                      <input
                        type="date"
                        value={fechaEjecutoria}
                        onChange={(e) => setFechaEjecutoria(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Tipo de Interés Aplicable *
                      </label>
                      <select
                        value={tipoInteresAplicable}
                        onChange={(e) => setTipoInteresAplicable(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 outline-none"
                        required
                      >
                        <option value="">Seleccione un tipo de interés</option>
                        <option value="USURA">Tasa de Usura Vigente</option>
                        <option value="DIAN">Interés DIAN</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Observaciones (Opcional)
                    </label>
                    <textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Observaciones adicionales sobre el proceso..."
                      rows={4}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 outline-none resize-none"
                    />
                  </div>

                  {/* Alerta */}
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-blue-900">Importante</p>
                      <p className="text-xs text-blue-700 mt-1">
                        El proceso se creará en la etapa IDENTIFICADO y se notificará automáticamente al responsable asignado.
                        Se generará un radicado único y se registrará en el módulo de Control de Términos.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setPaso(2)}
                      disabled={isSubmitting}
                      className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Volver
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !responsable || !fechaLimite}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Creando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Crear Proceso Coactivo
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
