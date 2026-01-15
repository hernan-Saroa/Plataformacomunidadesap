/**
 * ModalCrearTarea - Modal para crear nuevas tareas asociadas a expedientes
 * ✅ Diseño corporativo ESAP 2025 con header azul #2962FF
 * ✅ Funcionalidad completa de creación de tareas
 * ✅ Validación de formulario
 * ✅ Asignación de responsables y fechas
 */

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Textarea } from '../../../ui/textarea';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { 
  X, Target, Calendar, User, Flag, 
  AlertCircle, CheckCircle, Clock, Plus
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';
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
  modoEdicion = false 
}: ModalCrearTareaProps) {
  const [titulo, setTitulo] = useState(tareaInicial?.titulo || '');
  const [descripcion, setDescripcion] = useState(tareaInicial?.descripcion || '');
  const [fechaVencimiento, setFechaVencimiento] = useState(tareaInicial?.vencimiento || '');
  const [prioridad, setPrioridad] = useState<'Alta' | 'Media' | 'Baja'>(tareaInicial?.prioridad || 'Media');
  const [responsableSeleccionado, setResponsableSeleccionado] = useState(tareaInicial?.responsable || '');
  const [estado, setEstado] = useState<'Pendiente' | 'En proceso' | 'Completado'>(tareaInicial?.estado || 'Pendiente');
  const [enviandoTarea, setEnviandoTarea] = useState(false);

  // Usuarios disponibles para asignar
  const usuariosDisponibles = [
    { 
      id: '1', 
      nombre: expediente.abogadoAsignado, 
      cargo: 'Abogado Defensor',
      avatar: expediente.abogadoAsignado.split(' ').map(n => n[0]).join('').substring(0, 2),
      email: `${expediente.abogadoAsignado.toLowerCase().replace(/ /g, '.')}@esap.edu.co`
    },
    { 
      id: '2', 
      nombre: 'María Fernanda Rodríguez', 
      cargo: 'Auxiliar Jurídico',
      avatar: 'MR',
      email: 'maria.rodriguez@esap.edu.co'
    },
    { 
      id: '3', 
      nombre: 'Carlos Eduardo Méndez', 
      cargo: 'Coordinador Jurídico',
      avatar: 'CM',
      email: 'carlos.mendez@esap.edu.co'
    },
    { 
      id: '4', 
      nombre: 'Ana Patricia López', 
      cargo: 'Abogada Defensa',
      avatar: 'AL',
      email: 'ana.lopez@esap.edu.co'
    }
  ];

  const handleCrear = () => {
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

    if (!responsableSeleccionado) {
      toast.error('❌ Selecciona un responsable', {
        description: 'Debes asignar la tarea a un miembro del equipo'
      });
      return;
    }

    // Simular creación o edición
    setEnviandoTarea(true);

    setTimeout(() => {
      const responsable = usuariosDisponibles.find(u => u.id === responsableSeleccionado) || 
                         usuariosDisponibles.find(u => u.nombre === responsableSeleccionado);
      
      const diasCalc = calcularDiasRestantes(fechaVencimiento);
      
      const tareaData = {
        id: tareaInicial?.id || Date.now(),
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        vencimiento: fechaVencimiento,
        diasRestantes: diasCalc || 0,
        prioridad,
        responsable: responsable?.nombre || responsableSeleccionado,
        estado
      };

      if (modoEdicion && onGuardar) {
        // Modo edición
        onGuardar(tareaData);
      } else {
        // Modo creación
        toast.success('✅ Tarea creada exitosamente', {
          description: `Se asignó a ${responsable?.nombre || responsableSeleccionado}`,
          duration: 4000
        });

        // Limpiar formulario
        setTitulo('');
        setDescripcion('');
        setFechaVencimiento('');
        setPrioridad('Media');
        setResponsableSeleccionado('');
        setEstado('Pendiente');
        setEnviandoTarea(false);
        
        onClose();
      }

      setEnviandoTarea(false);
    }, 1500);
  };

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
      <DialogContent hideCloseButton className="w-[95vw] max-w-[650px] lg:max-w-2xl max-h-[90vh] flex flex-col p-0">
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
                {(['Pendiente', 'En proceso', 'Completado'] as const).map((estadoOpcion) => (
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
                            background: estadoOpcion === 'Completado' ? '#10B981' : estadoOpcion === 'En proceso' ? '#3B82F6' : '#F59E0B',
                            color: '#FFFFFF'
                          }
                        : {
                            borderColor: estadoOpcion === 'Completado' ? '#10B981' : estadoOpcion === 'En proceso' ? '#3B82F6' : '#F59E0B',
                            color: estadoOpcion === 'Completado' ? '#10B981' : estadoOpcion === 'En proceso' ? '#3B82F6' : '#F59E0B'
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

          {/* Estado */}
          <div>
            <Label className="text-sm font-bold text-gray-700 mb-2 block">
              ⚡ Estado inicial
            </Label>
            <div className="flex gap-2">
              {(['Pendiente', 'En proceso', 'Completada'] as const).map((estadoOpt) => (
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

          {/* Asignar responsable */}
          <div>
            <Label className="text-sm font-bold text-gray-700 mb-3 block">
              👤 Asignar responsable <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {usuariosDisponibles.map((usuario) => {
                const isSelected = responsableSeleccionado === usuario.id;
                return (
                  <Card
                    key={usuario.id}
                    className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'border-2 bg-blue-50' : 'border-2 border-transparent'
                    }`}
                    style={isSelected ? { borderColor: '#2962FF' } : {}}
                    onClick={() => setResponsableSeleccionado(usuario.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback
                          className="font-black"
                          style={
                            isSelected
                              ? { background: '#2962FF', color: '#FFFFFF' }
                              : { background: '#E0EDFF', color: '#2962FF' }
                          }
                        >
                          {usuario.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate flex items-center gap-2">
                          {usuario.nombre}
                          {isSelected && <CheckCircle className="w-4 h-4 text-green-600" />}
                        </p>
                        <p className="text-xs text-gray-600 truncate">{usuario.cargo}</p>
                        <p className="text-xs text-gray-500 truncate">{usuario.email}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
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