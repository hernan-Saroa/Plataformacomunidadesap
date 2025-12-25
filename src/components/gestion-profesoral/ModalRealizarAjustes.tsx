/**
 * Modal para Realizar Ajustes al PTA
 * Permite editar las actividades según los ajustes solicitados
 */

import { useState } from 'react';
import { X, Save, AlertCircle, CheckCircle2, TrendingUp, TrendingDown, BookOpen, Microscope, Users, Briefcase, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import { ButtonSIGL } from '../esap/gestion-legal/design-system/ButtonSIGL';
import { toast } from 'sonner@2.0.3';

interface Ajuste {
  id: string;
  codigo: string;
  tipo: string;
  componente: string;
  actividad: string;
  horasActuales: number;
  horasRequeridas: number;
  ajuste: number;
  descripcion: string;
  estado: 'pendiente' | 'completado';
}

interface ModalRealizarAjustesProps {
  isOpen: boolean;
  onClose: () => void;
  onGuardarAjustes: () => void;
}

export function ModalRealizarAjustes({ isOpen, onClose, onGuardarAjustes }: ModalRealizarAjustesProps) {
  const [ajustes, setAjustes] = useState<Ajuste[]>([
    {
      id: '1',
      codigo: 'DOC-002',
      tipo: 'OBLIGATORIO',
      componente: 'Docencia',
      actividad: 'Derecho Administrativo Avanzado',
      horasActuales: 90,
      horasRequeridas: 60,
      ajuste: -30,
      descripcion: 'Reducir horas según plan de estudios actualizado',
      estado: 'pendiente'
    },
    {
      id: '2',
      codigo: 'INV-001',
      tipo: 'OBLIGATORIO',
      componente: 'Investigación',
      actividad: 'Proyecto MinCiencias',
      horasActuales: 70,
      horasRequeridas: 140,
      ajuste: 70,
      descripcion: 'Aumentar horas según cronograma proyecto',
      estado: 'pendiente'
    },
    {
      id: '3',
      codigo: 'EXT-001',
      tipo: 'OBLIGATORIO',
      componente: 'Extensión',
      actividad: 'Convenio Gobernación',
      horasActuales: 88,
      horasRequeridas: 100,
      ajuste: 12,
      descripcion: 'Ajustar según convenio (Cláusula 5.2)',
      estado: 'pendiente'
    },
    {
      id: '4',
      codigo: 'ADM-003',
      tipo: 'URGENTE',
      componente: 'Complementarias',
      actividad: 'Proceso Acreditación',
      horasActuales: 48,
      horasRequeridas: 40,
      ajuste: -8,
      descripcion: 'Evaluar en fase sem subcontenido',
      estado: 'pendiente'
    }
  ]);

  // Pre-calcular las horas editadas basándose en el ajuste
  const [horasEditadas, setHorasEditadas] = useState<{ [key: string]: number }>(() => {
    const inicial: { [key: string]: number } = {};
    ajustes.forEach(ajuste => {
      // Calcular automáticamente: Horas Actuales + Ajuste = Nuevas Horas
      inicial[ajuste.id] = ajuste.horasActuales + ajuste.ajuste;
    });
    return inicial;
  });

  if (!isOpen) return null;

  const handleCambiarHoras = (ajusteId: string, nuevasHoras: number) => {
    setHorasEditadas(prev => ({
      ...prev,
      [ajusteId]: nuevasHoras
    }));
  };

  const handleMarcarCompletado = (ajusteId: string) => {
    const ajuste = ajustes.find(a => a.id === ajusteId);
    const horasActualizadas = horasEditadas[ajusteId];

    // Validación: debe ingresar un valor
    if (horasActualizadas === undefined || horasActualizadas === null) {
      toast.error('Debes ingresar las nuevas horas', {
        description: 'Completa el campo antes de aplicar el ajuste'
      });
      return;
    }

    // Validación: debe ser un número positivo
    if (horasActualizadas < 0) {
      toast.error('Las horas no pueden ser negativas', {
        description: 'Ingresa un valor válido mayor o igual a 0'
      });
      return;
    }

    // Validación: debe coincidir con las horas requeridas
    if (ajuste && horasActualizadas !== ajuste.horasRequeridas) {
      toast.error('Las horas no coinciden con lo requerido', {
        description: `Se requieren exactamente ${ajuste.horasRequeridas}h pero ingresaste ${horasActualizadas}h`
      });
      return;
    }

    // Si todo está correcto, marcar como completado
    if (ajuste) {
      setAjustes(prev => prev.map(a => 
        a.id === ajusteId ? { ...a, estado: 'completado' as const, horasActuales: horasActualizadas } : a
      ));
      
      toast.success('✓ Ajuste aplicado correctamente', {
        description: `${ajuste.actividad} actualizada a ${horasActualizadas}h`
      });

      // Verificar si es el último ajuste pendiente
      const pendientesRestantes = ajustes.filter(a => a.id !== ajusteId && a.estado === 'pendiente').length;
      if (pendientesRestantes === 0) {
        setTimeout(() => {
          toast.success('¡Todos los ajustes completados!', {
            description: 'Ya puedes guardar los cambios',
            duration: 4000
          });
        }, 500);
      }
    }
  };

  const handleRevertirAjuste = (ajusteId: string) => {
    const ajuste = ajustes.find(a => a.id === ajusteId);
    if (ajuste) {
      setAjustes(prev => prev.map(a => 
        a.id === ajusteId ? { ...a, estado: 'pendiente' as const } : a
      ));
      setHorasEditadas(prev => {
        const newHoras = { ...prev };
        delete newHoras[ajusteId];
        return newHoras;
      });
      toast.info('Ajuste revertido', {
        description: `Puedes volver a editar ${ajuste.actividad}`
      });
    }
  };

  const handleGuardarTodos = () => {
    const pendientes = ajustes.filter(a => a.estado === 'pendiente').length;
    
    // Validación: todos los ajustes deben estar completados
    if (pendientes > 0) {
      toast.warning(`Faltan ${pendientes} ajuste${pendientes > 1 ? 's' : ''} por completar`, {
        description: 'Debes aplicar todos los ajustes obligatorios antes de guardar',
        duration: 5000
      });
      return;
    }

    // Confirmar con el usuario antes de guardar
    const totalHorasModificadas = ajustes.reduce((acc, a) => acc + Math.abs(a.ajuste), 0);
    
    toast.success('Guardando cambios...', {
      description: `Se aplicarán ${ajustes.length} ajustes (${totalHorasModificadas}h modificadas)`
    });

    // Simular guardado (en producción sería una llamada al backend)
    setTimeout(() => {
      onGuardarAjustes();
      toast.success('✓ Ajustes guardados exitosamente', {
        description: 'El PTA ha sido actualizado. Ahora puedes reenviarlo para aprobación.',
        duration: 5000
      });
      onClose();
    }, 800);
  };

  const getIconoComponente = (componente: string) => {
    switch (componente) {
      case 'Docencia':
        return <BookOpen className="w-4 h-4 text-blue-600" />;
      case 'Investigación':
        return <Microscope className="w-4 h-4 text-indigo-600" />;
      case 'Extensión':
        return <Users className="w-4 h-4 text-green-600" />;
      case 'Complementarias':
        return <Briefcase className="w-4 h-4 text-orange-600" />;
      default:
        return null;
    }
  };

  const getColorTipo = (tipo: string) => {
    switch (tipo) {
      case 'OBLIGATORIO':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'URGENTE':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'SUGERIDO':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const ajustesCompletados = ajustes.filter(a => a.estado === 'completado').length;
  const totalAjustes = ajustes.length;
  const progreso = (ajustesCompletados / totalAjustes) * 100;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8 flex flex-col"
        style={{ maxHeight: 'calc(100vh - 4rem)' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#003DA5] to-[#1e5da8] px-6 py-5 text-white flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Realizar Ajustes al PTA</h2>
              <p className="text-sm text-white/90 mt-1">Actualiza las actividades según las observaciones recibidas</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Barra de progreso */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/90">
                Progreso: {ajustesCompletados} de {totalAjustes} ajustes completados
              </span>
              <span className="text-sm font-bold text-white">{progreso.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-400 transition-all duration-500"
                style={{ width: `${progreso}%` }}
              />
            </div>
          </div>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {ajustes.map((ajuste) => {
              const horasNuevas = horasEditadas[ajuste.id] ?? ajuste.horasActuales;
              const esValido = horasNuevas === ajuste.horasRequeridas;

              return (
                <div
                  key={ajuste.id}
                  className={`border-2 rounded-xl p-5 transition-all ${
                    ajuste.estado === 'completado'
                      ? 'bg-green-50 border-green-300'
                      : 'bg-white border-gray-200 hover:shadow-md'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-mono rounded">
                          {ajuste.codigo}
                        </span>
                        <span className={`px-2 py-1 text-xs font-bold rounded border ${getColorTipo(ajuste.tipo)}`}>
                          {ajuste.tipo}
                        </span>
                        <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {getIconoComponente(ajuste.componente)}
                          <span>{ajuste.componente}</span>
                        </div>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-1">{ajuste.actividad}</h3>
                      <p className="text-sm text-gray-600">{ajuste.descripcion}</p>
                    </div>
                    {ajuste.estado === 'completado' && (
                      <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                    )}
                  </div>

                  {/* Formulario de ajuste */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="grid grid-cols-4 gap-4 items-end">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Horas Actuales
                        </label>
                        <div className="px-3 py-2 bg-gray-200 rounded-lg text-gray-700 font-mono font-bold text-center">
                          {ajuste.horasActuales}h
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Ajuste
                        </label>
                        <div className={`px-3 py-2 rounded-lg font-mono font-bold text-center flex items-center justify-center gap-1 ${
                          ajuste.ajuste > 0 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {ajuste.ajuste > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {ajuste.ajuste > 0 ? '+' : ''}{ajuste.ajuste}h
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Nuevas Horas *
                        </label>
                        <input
                          type="number"
                          value={horasNuevas}
                          onChange={(e) => handleCambiarHoras(ajuste.id, Number(e.target.value))}
                          disabled={ajuste.estado === 'completado'}
                          className={`w-full px-3 py-2 border rounded-lg font-mono font-bold text-center transition-colors ${
                            ajuste.estado === 'completado'
                              ? 'bg-green-100 border-green-300 text-green-700'
                              : esValido
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-300 bg-white'
                          } disabled:cursor-not-allowed`}
                          min="0"
                        />
                        {!esValido && ajuste.estado === 'pendiente' && horasEditadas[ajuste.id] !== undefined && (
                          <p className="text-xs text-red-600 mt-1">
                            Se requieren {ajuste.horasRequeridas}h
                          </p>
                        )}
                      </div>

                      <div>
                        {ajuste.estado === 'pendiente' ? (
                          <ButtonSIGL
                            variant="primary"
                            size="sm"
                            onClick={() => handleMarcarCompletado(ajuste.id)}
                            disabled={!esValido || horasEditadas[ajuste.id] === undefined}
                            className="w-full"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Aplicar
                          </ButtonSIGL>
                        ) : (
                          <div className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-xs font-medium text-center">
                            ✓ Completado
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center flex-shrink-0">
          <div>
            {ajustesCompletados < totalAjustes ? (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Faltan {totalAjustes - ajustesCompletados} ajustes por completar
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">
                  ¡Todos los ajustes completados!
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <ButtonSIGL variant="outline" onClick={onClose}>
              Cancelar
            </ButtonSIGL>
            <ButtonSIGL
              variant="primary"
              onClick={handleGuardarTodos}
              disabled={ajustesCompletados < totalAjustes}
              className="bg-[#003DA5] hover:bg-[#002d7a] disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar Ajustes
            </ButtonSIGL>
          </div>
        </div>
      </motion.div>
    </div>
  );
}