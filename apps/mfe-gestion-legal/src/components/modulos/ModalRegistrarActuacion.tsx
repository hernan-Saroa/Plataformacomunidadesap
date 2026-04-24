/**
 * ModalRegistrarActuacion - Registro de actuaciones procesales
 * ✅ Diseño corporativo ESAP 2025 Premium
 * ✅ Formulario completo de actuaciones judiciales
 * ✅ Validación y guardado
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@esap-mfe/shared-ui/dialog';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { Card } from '@esap-mfe/shared-ui/card';
import { Input } from '@esap-mfe/shared-ui/input';
import {
  Activity, Save, X, AlertCircle, Calendar,
  FileText, User, Clock, CheckCircle, Gavel
} from 'lucide-react';
import { toast } from 'sonner';
import { ModalHeaderClean } from './ModalHeaderClean';
import { DialogoConfirmacion } from './DialogoConfirmacion';

interface ModalRegistrarActuacionProps {
  isOpen: boolean;
  onClose: () => void;
  onGuardar: (actuacion: any, file?: File) => Promise<void> | void;
  expedienteId: string;
  radicado?: string; // Display-friendly identifier
}

const TIPOS_ACTUACION = [
  'Aporte de Pruebas',
  'Contestación',
  'Asignación',
  'Auto Interlocutorio',
  'Sentencia',
  'Traslado',
  'Notificación',
  'Recurso',
  'Memorial',
  'Audiencia',
  'Inspección Judicial',
  'Prueba Testimonial',
  'Diligencia',
  'Otro'
];

const ESTADOS_ACTUACION = [
  'Completado',
  'En Proceso',
  'Pendiente',
  'Programado'
];

export function ModalRegistrarActuacion({
  isOpen,
  onClose,
  onGuardar,
  expedienteId,
  radicado
}: ModalRegistrarActuacionProps) {

  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState(new Date().toTimeString().slice(0, 5));
  const [tipo, setTipo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [responsable, setResponsable] = useState('');
  const [estado, setEstado] = useState('Completado');
  const [observaciones, setObservaciones] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [mostrarConfirmCancelar, setMostrarConfirmCancelar] = useState(false);

  /**
   * Validar formulario
   */
  const validarFormulario = (): boolean => {
    const nuevosErrores: Record<string, string> = {};

    if (!fecha) nuevosErrores.fecha = 'Selecciona la fecha de la actuación';
    if (!tipo) nuevosErrores.tipo = 'Selecciona el tipo de actuación';
    if (!descripcion.trim()) nuevosErrores.descripcion = 'Describe la actuación realizada';
    if (descripcion.trim().length < 10) nuevosErrores.descripcion = 'La descripción debe tener al menos 10 caracteres';
    if (!responsable.trim()) nuevosErrores.responsable = 'Indica el responsable de la actuación';

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  /**
   * Guardar actuación
   */
  const handleGuardar = async () => {
    if (!validarFormulario()) {
      toast.error('❌ Formulario incompleto', {
        description: 'Por favor corrige los errores marcados'
      });
      return;
    }

    setGuardando(true);
    // toast.loading('💾 Guardando actuación...', { id: 'guardar-actuacion' }); // Parent does toast

    try {
      // Construir fecha ISO válida
      const fechaISO = new Date(`${fecha}T${hora}:00`).toISOString();

      const nuevaActuacion = {
        fecha: fechaISO,
        tipo,
        descripcion,
        responsable,
        estado,
        observaciones,
        expedienteId,
        registradoPor: 'funcionario@esap.edu.co'
      };

      await onGuardar(nuevaActuacion, archivo || undefined);

      // Success handled by parent or here if needed, but safer to rely on parent completion
      // Cleaning up
      limpiarFormulario();
      onClose();

    } catch (error) {
      console.error('Error in modal guardar:', error);
      // Toast error handled by parent? or here.
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Limpiar formulario
   */
  const limpiarFormulario = () => {
    setFecha(new Date().toISOString().split('T')[0]);
    setHora(new Date().toTimeString().slice(0, 5));
    setTipo('');
    setDescripcion('');
    setResponsable('');
    setEstado('Completado');
    setObservaciones('');
    setErrores({});
    setArchivo(null);
  };

  /**
   * Cancelar
   */
  const handleCancelar = () => {
    if (tipo || descripcion || responsable || observaciones) {
      setMostrarConfirmCancelar(true);
    } else {
      onClose();
    }
  };

  const confirmarCancelacion = () => {
    limpiarFormulario();
    setMostrarConfirmCancelar(false);
    onClose();
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleCancelar}>
      <DialogContent hideCloseButton className="!max-w-[600px] !max-h-[72vh] overflow-y-auto flex flex-col p-0 gap-0">
        <DialogTitle className="sr-only">Registrar Actuación Procesal</DialogTitle>
        <DialogDescription className="sr-only">
          Formulario para registrar actuaciones procesales en el expediente {expedienteId}
        </DialogDescription>

        {/* Header */}
        <ModalHeaderClean
          titulo="Registrar Actuación Procesal"
          subtitulo={`Expediente ${radicado || expedienteId} - Nueva actuación judicial`}
          icono={Activity}
          colorIcono="blue"
          badges={
            <Badge variant="outline" className="font-semibold text-xs border-blue-300 text-blue-700">
              <Gavel className="w-3 h-3 mr-1" />
              Registro Oficial
            </Badge>
          }
          onClose={handleCancelar}
        />

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-5">

            {/* Información del expediente */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-gray-700">Expediente:</span>
                <span className="text-gray-900 font-mono">{radicado || expedienteId}</span>
              </div>
            </Card>

            {/* Fecha y Hora */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Fecha de la Actuación *
                </label>
                <Input
                  type="date"
                  value={fecha}
                  onChange={(e) => {
                    setFecha(e.target.value);
                    setErrores({ ...errores, fecha: '' });
                  }}
                  className={`text-sm font-semibold ${errores.fecha ? 'border-red-500' : ''}`}
                />
                {errores.fecha && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errores.fecha}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Hora
                </label>
                <Input
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  className="text-sm font-semibold"
                />
              </div>
            </div>

            {/* Tipo de Actuación */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                <Activity className="w-4 h-4 inline mr-1" />
                Tipo de Actuación *
              </label>
              <select
                value={tipo}
                onChange={(e) => {
                  setTipo(e.target.value);
                  setErrores({ ...errores, tipo: '' });
                }}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 ${errores.tipo ? 'border-red-500' : 'border-gray-300'
                  }`}
              >
                <option value="">Selecciona el tipo de actuación...</option>
                {TIPOS_ACTUACION.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {errores.tipo && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errores.tipo}
                </p>
              )}
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Descripción de la Actuación *
              </label>
              <textarea
                placeholder="Describe detalladamente la actuación procesal realizada..."
                value={descripcion}
                onChange={(e) => {
                  setDescripcion(e.target.value);
                  setErrores({ ...errores, descripcion: '' });
                }}
                rows={4}
                className={`w-full px-4 py-3 text-sm border rounded-lg resize-none ${errores.descripcion ? 'border-red-500' : 'border-gray-300'
                  }`}
              />
              <div className="flex items-center justify-between mt-1">
                {errores.descripcion ? (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errores.descripcion}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">Mínimo 10 caracteres</p>
                )}
                <span className={`text-xs ${descripcion.length < 10 ? 'text-red-600' : 'text-gray-500'}`}>
                  {descripcion.length} caracteres
                </span>
              </div>
            </div>

            {/* Responsable */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Responsable de la Actuación *
              </label>
              <Input
                placeholder="Ej: Dra. Ana María López"
                value={responsable}
                onChange={(e) => {
                  setResponsable(e.target.value);
                  setErrores({ ...errores, responsable: '' });
                }}
                className={`text-sm ${errores.responsable ? 'border-red-500' : ''}`}
              />
              {errores.responsable && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errores.responsable}
                </p>
              )}
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                <CheckCircle className="w-4 h-4 inline mr-1" />
                Estado de la Actuación
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500"
              >
                {ESTADOS_ACTUACION.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                📝 Observaciones Adicionales (Opcional)
              </label>
              <textarea
                placeholder="Información complementaria, comentarios o notas internas..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg resize-none"
              />
            </div>

            {/* Documento Adjunto */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                📎 Documento Adjunto (Opcional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  id="archivo-actuacion"
                  accept=".pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                        toast.error('Solo se permiten archivos PDF');
                        e.target.value = '';
                        return;
                      }
                      if (file.size > 50 * 1024 * 1024) {
                        toast.error('El archivo no puede superar los 50MB');
                        e.target.value = '';
                        return;
                      }
                      setArchivo(file);
                    }
                  }}
                  className="hidden"
                />
                <label
                  htmlFor="archivo-actuacion"
                  className="flex flex-col items-center cursor-pointer"
                >
                  {archivo ? (
                    <div className="flex items-center gap-2 text-green-700">
                      <FileText className="w-6 h-6" />
                      <span className="text-sm font-semibold">{archivo.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setArchivo(null);
                        }}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <FileText className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">
                        Haz clic para seleccionar un archivo
                      </span>
                      <span className="text-xs text-gray-400 mt-1">
                        Solo archivos PDF (máx. 50MB)
                      </span>
                    </>
                  )}
                </label>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t bg-gray-50 px-6 py-4 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={handleCancelar}
            disabled={guardando}
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleGuardar}
            disabled={guardando}
            style={{ background: '#003DA5', color: '#FFFFFF' }}
            className="font-bold"
          >
            {guardando ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar Actuación
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

      <DialogoConfirmacion
        isOpen={mostrarConfirmCancelar}
        onClose={() => setMostrarConfirmCancelar(false)}
        onConfirm={confirmarCancelacion}
        titulo="Cancelar Registro"
        mensaje="¿Estás seguro de cancelar? Se perderán los datos ingresados en el formulario de actuación."
        tipo="advertencia"
        textoConfirmar="Sí, cancelar"
        textoCancelar="Seguir editando"
      />
    </>
  );
}