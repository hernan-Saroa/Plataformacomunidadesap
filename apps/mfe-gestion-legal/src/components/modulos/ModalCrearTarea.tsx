/**
 * ModalCrearTarea - Modal para crear nuevas tareas asociadas a expedientes
 * ✅ Diseño corporativo ESAP 2025 con header azul #2962FF
 * ✅ Funcionalidad completa de creación de tareas
 * ✅ Validación de formulario
 * ✅ Asignación de responsables y fechas
 */

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { Label } from '@esap-mfe/shared-ui/label';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Card } from '@esap-mfe/shared-ui/card';
import {
  X, Target, Calendar, User, Flag,
  AlertCircle, CheckCircle, Clock
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { ExpedienteJudicial } from '../core/types';
import { ModalHeaderClean } from './ModalHeaderClean';

interface ModalCrearTareaProps {
  isOpen: boolean;
  onClose: () => void;
  expediente: ExpedienteJudicial;
  tareaInicial?: any;
  onGuardar?: (tarea: any) => void;
  modoEdicion?: boolean;
}

export function ModalCrearTarea({
  isOpen,
  onClose,
  expediente,
  tareaInicial,
  onGuardar,
  modoEdicion = false,
}: ModalCrearTareaProps) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [prioridad, setPrioridad] = useState<'Alta' | 'Media' | 'Baja'>('Media');
  const [responsableSeleccionado, setResponsableSeleccionado] = useState('');
  const [estado, setEstado] = useState<'Pendiente' | 'En proceso'>('Pendiente');
  const [enviandoTarea, setEnviandoTarea] = useState(false);

  const abogadoDelProceso = expediente.abogadoAsignado || 'Sin asignar (Temporal)';

  // Limpiar campos al abrir el modal (o cargar datos si es edición)
  useEffect(() => {
    if (isOpen) {
      if (modoEdicion && tareaInicial) {
        setTitulo(tareaInicial.titulo || '');
        setDescripcion(tareaInicial.descripcion || '');
        setFechaVencimiento(tareaInicial.vencimiento || '');
        setPrioridad(tareaInicial.prioridad || 'Media');
        setEstado(tareaInicial.estado === 'Completado' ? 'Pendiente' : (tareaInicial.estado || 'Pendiente'));
      } else {
        setTitulo('');
        setDescripcion('');
        setFechaVencimiento('');
        setPrioridad('Media');
        setEstado('Pendiente');
      }
      // El responsable siempre es el abogado a cargo del proceso
      setResponsableSeleccionado(abogadoDelProceso);
      setEnviandoTarea(false);
    }
  }, [isOpen, modoEdicion, tareaInicial]);

  const handleCrear = async () => {
    // Validación
    if (!titulo.trim()) {
      toast.error('❌ Campo requerido', {
        description: 'El título de la tarea es obligatorio'
      });
      return;
    }

    if (!descripcion.trim()) {
      toast.error('❌ Campo requerido', {
        description: 'La descripción de la tarea es obligatoria'
      });
      return;
    }

    if (!fechaVencimiento) {
      toast.error('❌ Campo requerido', {
        description: 'La fecha de vencimiento es obligatoria'
      });
      return;
    }

    // Enviar datos reales
    setEnviandoTarea(true);

    try {
      const diasCalc = calcularDiasRestantes(fechaVencimiento);

      const tareaData = {
        id: tareaInicial?.id || Date.now(),
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        vencimiento: fechaVencimiento,
        diasRestantes: diasCalc || 0,
        prioridad,
        responsable: responsableSeleccionado,
        responsableId: expediente.abogadoSustanciador,
        estado
      };

      if (onGuardar) {
        await onGuardar(tareaData);
      }

      // No necesitamos limpiar ni cerrar manualmente si el padre maneja el estado
      // y cierra el modal al completar.
      // Si el padre falla (throw), el catch atrapará el error y no cerraremos.

    } catch (error) {
      console.error('Error al guardar tarea', error);
      // El padre ya debería haber mostrado toast de error si falló la API
      // Pero por si acaso:
      // toast.error('Error al guardar tarea'); 
      // Mejor dejamos que el padre maneje errores de API.
    } finally {
      if (mounted) setEnviandoTarea(false);
    }
  };

  // Helper para manejar el estado de montaje y evitar updates en componente desmontado
  // (Aunque si el padre cierra el modal, este componente se desmonta)
  // Workaround simple
  let mounted = true;
  /* useEffect(() => { return () => { mounted = false; }; }, []); */
  // En function component, usar useRef es mejor, pero aquí simplificamos dado que
  // si se desmonta, el estado local ya no importa.



  const calcularDiasRestantes = (fecha: string) => {
    if (!fecha) return null;
    const hoy = new Date();
    const vencimiento = new Date(fecha);
    const diff = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const diasRestantes = calcularDiasRestantes(fechaVencimiento);

  const getSemaforoColor = (dias: number | null) => {
    if (dias === null) return null;
    if (dias < 0) return { color: '#DC2626', label: 'Vencida', bg: '#FEE2E2' };
    if (dias <= 5) return { color: '#DC2626', label: 'Urgente', bg: '#FEE2E2' };
    if (dias <= 15) return { color: '#F59E0B', label: 'Próxima', bg: '#FEF3C7' };
    return { color: '#10B981', label: 'En término', bg: '#D1FAE5' };
  };

  const semaforo = getSemaforoColor(diasRestantes);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="w-[95vw] max-w-[650px] lg:max-w-2xl max-h-[90vh] flex flex-col p-0 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <DialogTitle className="sr-only">
          {modoEdicion ? 'Editar Tarea' : 'Crear Nueva Tarea'} - Expediente {expediente.id}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Formulario para {modoEdicion ? 'editar la tarea' : 'crear una nueva tarea'} asociada al expediente {expediente.id}
        </DialogDescription>

        {/* ==================== HEADER LIMPIO Y USABLE ==================== */}
        <ModalHeaderClean
          titulo={modoEdicion ? 'Editar Tarea' : 'Crear Nueva Tarea'}
          subtitulo={`${modoEdicion ? 'Modificar' : 'Asignar'} tarea al expediente ${expediente.id}`}
          icono={Target}
          colorIcono={modoEdicion ? 'orange' : 'green'}
          badgePrincipal={expediente.etapa}
          onClose={onClose}
        />

        {/* ==================== CONTENIDO ==================== */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Información del expediente */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: '#2962FF' }}>
                <Target className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">
                  Expediente: <span style={{ color: '#2962FF' }}>{expediente.id}</span>
                </p>
                <p className="text-xs text-gray-600">
                  {expediente.demandante} vs ESAP
                </p>
              </div>
              <Badge style={{ background: '#2962FF', color: '#FFFFFF' }}>
                {expediente.etapa}
              </Badge>
            </div>
          </Card>

          {/* Título de la tarea */}
          <div>
            <Label className="text-sm font-bold text-gray-700 mb-2 block">
              📋 Título de la tarea <span className="text-red-500">*</span>
            </Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Presentar alegatos de conclusión"
              className="text-sm"
            />
            {titulo.trim() && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Título válido
              </p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <Label className="text-sm font-bold text-gray-700 mb-2 block">
              📝 Descripción detallada <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe la tarea, instrucciones específicas, documentos necesarios..."
              className="text-sm min-h-[100px]"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-500">
                {descripcion.length} caracteres
              </p>
              {descripcion.trim() && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Descripción completa
                </p>
              )}
            </div>
          </div>

          {/* Fecha y Prioridad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fecha de vencimiento */}
            <div>
              <Label className="text-sm font-bold text-gray-700 mb-2 block">
                📅 Fecha de vencimiento <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                className="text-sm"
                min={new Date().toISOString().split('T')[0]}
              />
              {semaforo && diasRestantes !== null && (
                <div className="mt-2 flex items-center gap-2">
                  <Badge
                    className="text-xs font-bold"
                    style={{
                      background: semaforo.bg,
                      color: semaforo.color,
                      border: `1px solid ${semaforo.color}`
                    }}
                  >
                    {semaforo.label}
                  </Badge>
                  <span className="text-xs text-gray-600">
                    {diasRestantes > 0 ? `${diasRestantes} días restantes` : 'Fecha vencida'}
                  </span>
                </div>
              )}
            </div>

            {/* Prioridad */}
            <div>
              <Label className="text-sm font-bold text-gray-700 mb-2 block">
                🚨 Prioridad
              </Label>
              <div className="flex gap-2">
                {(['Alta', 'Media', 'Baja'] as const).map((nivel) => (
                  <Button
                    key={nivel}
                    type="button"
                    variant={prioridad === nivel ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPrioridad(nivel)}
                    className="flex-1 font-bold text-xs"
                    style={
                      prioridad === nivel
                        ? {
                          background: nivel === 'Alta' ? '#DC2626' : nivel === 'Media' ? '#F59E0B' : '#10B981',
                          color: '#FFFFFF'
                        }
                        : {
                          borderColor: nivel === 'Alta' ? '#DC2626' : nivel === 'Media' ? '#F59E0B' : '#10B981',
                          color: nivel === 'Alta' ? '#DC2626' : nivel === 'Media' ? '#F59E0B' : '#10B981'
                        }
                    }
                  >
                    <Flag className="w-3 h-3 mr-1" />
                    {nivel}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Estado (solo en modo edición) */}
          {modoEdicion && (
            <div>
              <Label className="text-sm font-bold text-gray-700 mb-2 block">
                📊 Estado de la tarea
              </Label>
              <div className="flex gap-2">
                {(['Pendiente', 'En proceso'] as const).map((estadoOpcion) => (
                  <Button
                    key={estadoOpcion}
                    type="button"
                    variant={estado === estadoOpcion ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEstado(estadoOpcion)}
                    className="flex-1 font-bold text-xs"
                    style={
                      estado === estadoOpcion
                        ? {
                          background: estadoOpcion === 'En proceso' ? '#3B82F6' : '#F59E0B',
                          color: '#FFFFFF'
                        }
                        : {
                          borderColor: estadoOpcion === 'En proceso' ? '#3B82F6' : '#F59E0B',
                          color: estadoOpcion === 'En proceso' ? '#3B82F6' : '#F59E0B'
                        }
                    }
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {estadoOpcion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Estado (solo en creación) */}
          {!modoEdicion && (
            <div>
              <Label className="text-sm font-bold text-gray-700 mb-2 block">
                ⚡ Estado inicial
              </Label>
              <div className="flex gap-2">
                {(['Pendiente', 'En proceso'] as const).map((estadoOpt) => (
                  <Button
                    key={estadoOpt}
                    type="button"
                    variant={estado === estadoOpt ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEstado(estadoOpt)}
                    className="flex-1 font-bold text-xs"
                    style={
                      estado === estadoOpt
                        ? { background: '#2962FF', color: '#FFFFFF' }
                        : { borderColor: '#2962FF', color: '#2962FF' }
                    }
                  >
                    {estadoOpt}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Responsable — siempre el abogado a cargo del proceso */}
          <div>
            <Label className="text-sm font-bold text-gray-700 mb-3 block">
              👤 Responsable
            </Label>
            <Card className="p-3 bg-gray-50 border-gray-200 flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <User className="w-4 h-4 text-blue-700" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{abogadoDelProceso}</p>
                <p className="text-xs text-gray-500">Abogado a cargo del proceso</p>
              </div>
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            </Card>
          </div>

          {/* Alerta informativa */}
          <Card className="p-3 bg-amber-50 border-amber-300">
            <p className="text-xs text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              La tarea quedará registrada en el expediente y se notificará automáticamente al responsable asignado.
            </p>
          </Card>
        </div>

        {/* ==================== FOOTER STICKY CON BOTONES ==================== */}
        <div
          className="flex-shrink-0 bg-white border-t-2 px-6 py-4"
          style={{
            borderTopColor: '#2962FF',
            boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <Button variant="outline" onClick={onClose} className="font-bold">
              <X className="w-4 h-4 mr-1.5" />
              Cancelar
            </Button>
            <Button
              onClick={handleCrear}
              disabled={enviandoTarea}
              className="font-bold text-white"
              style={{ background: modoEdicion ? '#F57C00' : '#2962FF' }}
            >
              {enviandoTarea ? (
                <>
                  <div className="w-4 h-4 mr-1.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {modoEdicion ? 'Guardando...' : 'Creando...'}
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  {modoEdicion ? 'Guardar Cambios' : 'Crear Tarea'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
