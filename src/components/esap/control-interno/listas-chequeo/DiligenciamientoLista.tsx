/**
 * DILIGENCIAMIENTO DE LISTA DE CHEQUEO
 * 
 * Componente para llenar listas de chequeo durante la ejecución de auditorías:
 * - Respuestas: Cumple / No Cumple / No Aplica
 * - Observaciones por ítem
 * - Adjuntar evidencias
 * - Generación automática de hallazgos
 * - Cálculo de % cumplimiento en tiempo real
 * - Guardado automático de progreso
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Save,
  Send,
  CheckCircle,
  XCircle,
  MinusCircle,
  AlertTriangle,
  Paperclip,
  FileText,
  TrendingUp,
  Eye,
  Download,
  ChevronDown,
  ChevronRight,
  Clock,
  User,
  Calendar,
  Target,
  Award,
  Info,
  AlertCircle,
  CheckSquare,
  X
} from 'lucide-react';
import { Card } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Label } from '../../../ui/label';
import { Textarea } from '../../../ui/textarea';
import { Badge } from '../../../ui/badge';
import { toast } from 'sonner@2.0.3';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../ui/dialog';
import { RadioGroup, RadioGroupItem } from '../../../ui/radio-group';
import { Progress } from '../../../ui/progress';
import { Separator } from '../../../ui/separator';
import { ScrollArea } from '../../../ui/scroll-area';
import { Input } from '../../../ui/input';

// ==================== TIPOS ====================

interface ItemRespuesta {
  id: string;
  numero: string;
  criterio: string;
  normativaReferencia: string;
  esCritico: boolean;
  respuesta?: 'cumple' | 'no-cumple' | 'no-aplica';
  observaciones?: string;
  evidencias?: string[];
  fechaRespuesta?: string;
  respondidoPor?: string;
}

interface SeccionRespuesta {
  id: string;
  orden: number;
  nombre: string;
  descripcion: string;
  items: ItemRespuesta[];
}

interface ListaDiligenciada {
  id: string;
  codigo: string;
  nombre: string;
  version: string;
  proceso: string;
  auditoriaId: string;
  nombreAuditoria: string;
  secciones: SeccionRespuesta[];
  
  // Configuración
  permiteNoAplica: boolean;
  requiereEvidencias: boolean;
  generaHallazgosAutomaticos: boolean;
  
  // Estado de diligenciamiento
  fechaInicio?: string;
  fechaUltimoCambio?: string;
  responsable: string;
  estado: 'en-progreso' | 'completada';
  
  // Resultados
  totalItems: number;
  itemsCompletados: number;
  cumplimiento: number;
  noCumplimientos: number;
  noAplica: number;
}

interface ResultadosDiligenciamiento {
  totalItems: number;
  itemsRespondidos: number;
  itemsCumple: number;
  itemsNoCumple: number;
  itemsNoAplica: number;
  itemsPendientes: number;
  porcentajeCumplimiento: number;
  porcentajeProgreso: number;
  itemsCriticosPendientes: number;
  hallazgosPotenciales: number;
}

interface DiligenciamientoListaProps {
  lista: ListaDiligenciada;
  onGuardar: (lista: ListaDiligenciada) => void;
  onEnviar: (lista: ListaDiligenciada, generarHallazgos: boolean) => void;
  onCerrar: () => void;
}

export function DiligenciamientoLista({
  lista: listaInicial,
  onGuardar,
  onEnviar,
  onCerrar
}: DiligenciamientoListaProps) {
  const [lista, setLista] = useState<ListaDiligenciada>(listaInicial);
  const [seccionExpandida, setSeccionExpandida] = useState<string | null>(
    listaInicial.secciones[0]?.id || null
  );
  const [guardadoAutomatico, setGuardadoAutomatico] = useState(true);
  const [ultimoGuardado, setUltimoGuardado] = useState<Date>(new Date());
  const [isResumenOpen, setIsResumenOpen] = useState(false);
  const [isEnviarOpen, setIsEnviarOpen] = useState(false);
  const [generarHallazgos, setGenerarHallazgos] = useState(true);

  // ==================== CÁLCULOS ====================

  const calcularResultados = (): ResultadosDiligenciamiento => {
    let totalItems = 0;
    let itemsRespondidos = 0;
    let itemsCumple = 0;
    let itemsNoCumple = 0;
    let itemsNoAplica = 0;
    let itemsCriticosPendientes = 0;
    let hallazgosPotenciales = 0;

    lista.secciones.forEach(seccion => {
      seccion.items.forEach(item => {
        totalItems++;
        
        if (item.respuesta) {
          itemsRespondidos++;
          if (item.respuesta === 'cumple') itemsCumple++;
          else if (item.respuesta === 'no-cumple') {
            itemsNoCumple++;
            hallazgosPotenciales++;
          }
          else if (item.respuesta === 'no-aplica') itemsNoAplica++;
        } else {
          if (item.esCritico) itemsCriticosPendientes++;
        }
      });
    });

    const itemsPendientes = totalItems - itemsRespondidos;
    const porcentajeProgreso = totalItems > 0 ? Math.round((itemsRespondidos / totalItems) * 100) : 0;
    
    // Cumplimiento sobre items aplicables (excluyendo No Aplica)
    const itemsAplicables = itemsRespondidos - itemsNoAplica;
    const porcentajeCumplimiento = itemsAplicables > 0 
      ? Math.round((itemsCumple / itemsAplicables) * 100) 
      : 0;

    return {
      totalItems,
      itemsRespondidos,
      itemsCumple,
      itemsNoCumple,
      itemsNoAplica,
      itemsPendientes,
      porcentajeCumplimiento,
      porcentajeProgreso,
      itemsCriticosPendientes,
      hallazgosPotenciales
    };
  };

  const resultados = calcularResultados();

  // ==================== FUNCIONES ====================

  const handleRespuestaItem = (
    seccionId: string,
    itemId: string,
    respuesta: 'cumple' | 'no-cumple' | 'no-aplica'
  ) => {
    setLista(prev => ({
      ...prev,
      secciones: prev.secciones.map(seccion => {
        if (seccion.id === seccionId) {
          return {
            ...seccion,
            items: seccion.items.map(item => {
              if (item.id === itemId) {
                return {
                  ...item,
                  respuesta,
                  fechaRespuesta: new Date().toISOString(),
                  respondidoPor: lista.responsable
                };
              }
              return item;
            })
          };
        }
        return seccion;
      })
    }));

    if (guardadoAutomatico) {
      // Simular guardado automático
      setTimeout(() => {
        setUltimoGuardado(new Date());
      }, 500);
    }
  };

  const handleObservaciones = (
    seccionId: string,
    itemId: string,
    observaciones: string
  ) => {
    setLista(prev => ({
      ...prev,
      secciones: prev.secciones.map(seccion => {
        if (seccion.id === seccionId) {
          return {
            ...seccion,
            items: seccion.items.map(item => {
              if (item.id === itemId) {
                return {
                  ...item,
                  observaciones
                };
              }
              return item;
            })
          };
        }
        return seccion;
      })
    }));
  };

  const handleAgregarEvidencia = (
    seccionId: string,
    itemId: string,
    evidencia: string
  ) => {
    setLista(prev => ({
      ...prev,
      secciones: prev.secciones.map(seccion => {
        if (seccion.id === seccionId) {
          return {
            ...seccion,
            items: seccion.items.map(item => {
              if (item.id === itemId) {
                return {
                  ...item,
                  evidencias: [...(item.evidencias || []), evidencia]
                };
              }
              return item;
            })
          };
        }
        return seccion;
      })
    }));
    toast.success('Evidencia agregada');
  };

  const handleGuardarProgreso = () => {
    const listaActualizada: ListaDiligenciada = {
      ...lista,
      fechaUltimoCambio: new Date().toISOString(),
      itemsCompletados: resultados.itemsRespondidos,
      cumplimiento: resultados.porcentajeCumplimiento,
      noCumplimientos: resultados.itemsNoCumple,
      noAplica: resultados.itemsNoAplica
    };

    onGuardar(listaActualizada);
    setUltimoGuardado(new Date());
    toast.success('Progreso guardado', {
      description: `${resultados.porcentajeProgreso}% completado`
    });
  };

  const handleEnviarLista = () => {
    // Validar que todos los ítems críticos estén respondidos
    if (resultados.itemsCriticosPendientes > 0) {
      toast.error('Hay ítems críticos sin responder', {
        description: `Completa ${resultados.itemsCriticosPendientes} ítems críticos antes de enviar`
      });
      return;
    }

    setIsEnviarOpen(true);
  };

  const confirmarEnvio = () => {
    const listaCompletada: ListaDiligenciada = {
      ...lista,
      estado: 'completada',
      fechaUltimoCambio: new Date().toISOString(),
      itemsCompletados: resultados.itemsRespondidos,
      cumplimiento: resultados.porcentajeCumplimiento,
      noCumplimientos: resultados.itemsNoCumple,
      noAplica: resultados.itemsNoAplica
    };

    onEnviar(listaCompletada, generarHallazgos);
    setIsEnviarOpen(false);
    
    toast.success('Lista enviada exitosamente', {
      description: generarHallazgos && resultados.hallazgosPotenciales > 0
        ? `Se generarán ${resultados.hallazgosPotenciales} hallazgos`
        : 'Sin hallazgos identificados'
    });
  };

  // ==================== RENDER ====================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">{lista.codigo}</Badge>
            <Badge className="bg-purple-100 text-purple-800 border-0">
              {lista.nombreAuditoria}
            </Badge>
          </div>
          <h2 className="text-2xl text-gray-900">{lista.nombre}</h2>
          <p className="text-sm text-gray-600 mt-1">
            Proceso: {lista.proceso} • Versión {lista.version}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsResumenOpen(true)} className="gap-2">
            <Eye className="w-4 h-4" />
            Ver Resumen
          </Button>
          <Button variant="outline" onClick={handleGuardarProgreso} className="gap-2">
            <Save className="w-4 h-4" />
            Guardar
          </Button>
          <Button variant="outline" onClick={onCerrar}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Barra de progreso general */}
      <Card className="p-5 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700 mb-1">Progreso de Diligenciamiento</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-900">
                  {resultados.itemsRespondidos} / {resultados.totalItems} ítems
                </span>
                <span className="text-gray-600">•</span>
                <span className="text-gray-900">{resultados.porcentajeProgreso}% completado</span>
              </div>
            </div>
            {guardadoAutomatico && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Último guardado: {ultimoGuardado.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
          <Progress value={resultados.porcentajeProgreso} className="h-3" />
          
          {/* Resumen de respuestas */}
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-gray-700">{resultados.itemsCumple} Cumple</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-gray-700">{resultados.itemsNoCumple} No Cumple</span>
            </div>
            <div className="flex items-center gap-2">
              <MinusCircle className="w-4 h-4 text-gray-600" />
              <span className="text-gray-700">{resultados.itemsNoAplica} No Aplica</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-gray-700">{resultados.itemsPendientes} Pendientes</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Alertas */}
      {resultados.itemsCriticosPendientes > 0 && (
        <Card className="p-4 bg-red-50 border-2 border-red-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-red-900">
                Hay {resultados.itemsCriticosPendientes} ítems críticos sin responder
              </p>
              <p className="text-sm text-red-700 mt-1">
                Los ítems críticos son obligatorios antes de enviar la lista
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Secciones */}
      <div className="space-y-3">
        {lista.secciones.map(seccion => {
          const itemsSeccion = seccion.items.length;
          const itemsRespondidos = seccion.items.filter(i => i.respuesta).length;
          const progreso = Math.round((itemsRespondidos / itemsSeccion) * 100);
          const isExpanded = seccionExpandida === seccion.id;

          return (
            <Card key={seccion.id} className="overflow-hidden">
              {/* Header de sección */}
              <button
                onClick={() => setSeccionExpandida(isExpanded ? null : seccion.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 text-left">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        Sección {seccion.orden}
                      </Badge>
                      <h3 className="text-gray-900">{seccion.nombre}</h3>
                      <Badge variant="outline" className="text-xs">
                        {itemsRespondidos}/{itemsSeccion}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{seccion.descripcion}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32">
                    <Progress value={progreso} className="h-2" />
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">
                    {progreso}%
                  </span>
                </div>
              </button>

              {/* Ítems de la sección */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Separator />
                    <div className="p-4 space-y-4 bg-gray-50">
                      {seccion.items.map(item => (
                        <ItemDiligenciamiento
                          key={item.id}
                          item={item}
                          seccionId={seccion.id}
                          permiteNoAplica={lista.permiteNoAplica}
                          requiereEvidencias={lista.requiereEvidencias}
                          onRespuesta={handleRespuestaItem}
                          onObservaciones={handleObservaciones}
                          onAgregarEvidencia={handleAgregarEvidencia}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>

      {/* Acciones finales */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-900 mb-1">¿Terminaste de diligenciar la lista?</p>
            <p className="text-sm text-gray-600">
              {resultados.porcentajeProgreso === 100
                ? 'Todos los ítems han sido respondidos. Puedes enviar la lista.'
                : `Faltan ${resultados.itemsPendientes} ítems por responder`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleGuardarProgreso} className="gap-2">
              <Save className="w-4 h-4" />
              Guardar Progreso
            </Button>
            <Button
              onClick={handleEnviarLista}
              disabled={resultados.itemsCriticosPendientes > 0}
              className="bg-[#003DA5] hover:bg-[#002873] gap-2"
            >
              <Send className="w-4 h-4" />
              Enviar Lista Completada
            </Button>
          </div>
        </div>
      </Card>

      {/* Modales */}
      <ModalResumen
        isOpen={isResumenOpen}
        onClose={() => setIsResumenOpen(false)}
        lista={lista}
        resultados={resultados}
      />

      <ModalEnviar
        isOpen={isEnviarOpen}
        onClose={() => setIsEnviarOpen(false)}
        onConfirmar={confirmarEnvio}
        resultados={resultados}
        generaHallazgosAutomaticos={lista.generaHallazgosAutomaticos}
        generarHallazgos={generarHallazgos}
        setGenerarHallazgos={setGenerarHallazgos}
      />
    </div>
  );
}

// ==================== COMPONENTE ÍTEM ====================

interface ItemDiligenciamientoProps {
  item: ItemRespuesta;
  seccionId: string;
  permiteNoAplica: boolean;
  requiereEvidencias: boolean;
  onRespuesta: (seccionId: string, itemId: string, respuesta: 'cumple' | 'no-cumple' | 'no-aplica') => void;
  onObservaciones: (seccionId: string, itemId: string, observaciones: string) => void;
  onAgregarEvidencia: (seccionId: string, itemId: string, evidencia: string) => void;
}

function ItemDiligenciamiento({
  item,
  seccionId,
  permiteNoAplica,
  requiereEvidencias,
  onRespuesta,
  onObservaciones,
  onAgregarEvidencia
}: ItemDiligenciamientoProps) {
  const [observacionesLocal, setObservacionesLocal] = useState(item.observaciones || '');
  const [nuevaEvidencia, setNuevaEvidencia] = useState('');
  const [mostrarEvidencias, setMostrarEvidencias] = useState(false);

  const handleGuardarObservaciones = () => {
    if (observacionesLocal !== item.observaciones) {
      onObservaciones(seccionId, item.id, observacionesLocal);
      toast.success('Observaciones guardadas');
    }
  };

  const handleAgregarEvidencia = () => {
    if (nuevaEvidencia.trim()) {
      onAgregarEvidencia(seccionId, item.id, nuevaEvidencia);
      setNuevaEvidencia('');
    }
  };

  return (
    <Card className={`p-4 ${item.respuesta ? 'border-2 border-gray-200' : 'border-2 border-orange-200 bg-orange-50'}`}>
      {/* Criterio */}
      <div className="mb-3">
        <div className="flex items-start gap-2 mb-2">
          <Badge variant="outline" className="text-xs">{item.numero}</Badge>
          {item.esCritico && (
            <Badge className="bg-red-100 text-red-800 border-0 text-xs">
              Crítico
            </Badge>
          )}
          {item.respuesta && (
            <Badge className={`${
              item.respuesta === 'cumple' ? 'bg-green-100 text-green-800' :
              item.respuesta === 'no-cumple' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            } border-0 text-xs`}>
              {item.respuesta === 'cumple' ? 'Cumple' :
               item.respuesta === 'no-cumple' ? 'No Cumple' : 'No Aplica'}
            </Badge>
          )}
        </div>
        <p className="text-gray-900 mb-2">{item.criterio}</p>
        {item.normativaReferencia && (
          <p className="text-xs text-gray-600">
            <span className="font-medium">Normativa:</span> {item.normativaReferencia}
          </p>
        )}
      </div>

      {/* Respuesta */}
      <div className="mb-3">
        <Label className="text-gray-900 mb-2">Respuesta *</Label>
        <RadioGroup
          value={item.respuesta || ''}
          onValueChange={(value: any) => onRespuesta(seccionId, item.id, value)}
          className="flex gap-4 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="cumple" id={`${item.id}-cumple`} />
            <Label htmlFor={`${item.id}-cumple`} className="flex items-center gap-1 cursor-pointer">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Cumple
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no-cumple" id={`${item.id}-no-cumple`} />
            <Label htmlFor={`${item.id}-no-cumple`} className="flex items-center gap-1 cursor-pointer">
              <XCircle className="w-4 h-4 text-red-600" />
              No Cumple
            </Label>
          </div>
          {permiteNoAplica && (
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no-aplica" id={`${item.id}-no-aplica`} />
              <Label htmlFor={`${item.id}-no-aplica`} className="flex items-center gap-1 cursor-pointer">
                <MinusCircle className="w-4 h-4 text-gray-600" />
                No Aplica
              </Label>
            </div>
          )}
        </RadioGroup>
      </div>

      {/* Observaciones */}
      <div className="mb-3">
        <Label className="text-gray-900 mb-2">
          Observaciones {item.respuesta === 'no-cumple' && <span className="text-red-500">*</span>}
        </Label>
        <Textarea
          value={observacionesLocal}
          onChange={(e) => setObservacionesLocal(e.target.value)}
          onBlur={handleGuardarObservaciones}
          placeholder="Describe los hallazgos, detalles o justificaciones..."
          rows={3}
          className="mt-2"
        />
      </div>

      {/* Evidencias */}
      {(requiereEvidencias || item.evidencias?.length) && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-gray-900">
              Evidencias {requiereEvidencias && <span className="text-red-500">*</span>}
            </Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMostrarEvidencias(!mostrarEvidencias)}
              className="text-xs h-7"
            >
              {mostrarEvidencias ? 'Ocultar' : 'Mostrar'} ({item.evidencias?.length || 0})
            </Button>
          </div>
          
          {mostrarEvidencias && (
            <div className="space-y-2 mt-2">
              {item.evidencias && item.evidencias.length > 0 && (
                <div className="space-y-1">
                  {item.evidencias.map((evidencia, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded border">
                      <Paperclip className="w-3 h-3 text-gray-600" />
                      <span className="text-gray-900">{evidencia}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={nuevaEvidencia}
                  onChange={(e) => setNuevaEvidencia(e.target.value)}
                  placeholder="Nombre del archivo o descripción de la evidencia"
                  className="text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleAgregarEvidencia}
                  disabled={!nuevaEvidencia.trim()}
                  className="gap-1"
                >
                  <Paperclip className="w-3 h-3" />
                  Agregar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ==================== MODAL RESUMEN ====================

interface ModalResumenProps {
  isOpen: boolean;
  onClose: () => void;
  lista: ListaDiligenciada;
  resultados: ResultadosDiligenciamiento;
}

function ModalResumen({ isOpen, onClose, lista, resultados }: ModalResumenProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Resumen de Diligenciamiento</DialogTitle>
          <DialogDescription>
            {lista.nombre} - {lista.codigo}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {/* Progreso general */}
            <Card className="p-5 bg-blue-50 border-2 border-blue-200">
              <h4 className="text-gray-900 mb-3">Progreso General</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Total de ítems</p>
                  <p className="text-2xl text-gray-900">{resultados.totalItems}</p>
                </div>
                <div>
                  <p className="text-gray-600">Ítems respondidos</p>
                  <p className="text-2xl text-gray-900">{resultados.itemsRespondidos}</p>
                </div>
                <div>
                  <p className="text-gray-600">Progreso</p>
                  <p className="text-2xl text-gray-900">{resultados.porcentajeProgreso}%</p>
                </div>
                <div>
                  <p className="text-gray-600">Cumplimiento</p>
                  <p className="text-2xl text-gray-900">{resultados.porcentajeCumplimiento}%</p>
                </div>
              </div>
              <Progress value={resultados.porcentajeProgreso} className="h-3 mt-4" />
            </Card>

            {/* Distribución de respuestas */}
            <Card className="p-5">
              <h4 className="text-gray-900 mb-3">Distribución de Respuestas</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-gray-700">Cumple</span>
                    </div>
                    <span className="text-gray-900">{resultados.itemsCumple}</span>
                  </div>
                  <Progress
                    value={(resultados.itemsCumple / resultados.totalItems) * 100}
                    className="h-2 bg-green-100 [&>div]:bg-green-600"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-gray-700">No Cumple</span>
                    </div>
                    <span className="text-gray-900">{resultados.itemsNoCumple}</span>
                  </div>
                  <Progress
                    value={(resultados.itemsNoCumple / resultados.totalItems) * 100}
                    className="h-2 bg-red-100 [&>div]:bg-red-600"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <div className="flex items-center gap-2">
                      <MinusCircle className="w-4 h-4 text-gray-600" />
                      <span className="text-gray-700">No Aplica</span>
                    </div>
                    <span className="text-gray-900">{resultados.itemsNoAplica}</span>
                  </div>
                  <Progress
                    value={(resultados.itemsNoAplica / resultados.totalItems) * 100}
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <span className="text-gray-700">Pendientes</span>
                    </div>
                    <span className="text-gray-900">{resultados.itemsPendientes}</span>
                  </div>
                  <Progress
                    value={(resultados.itemsPendientes / resultados.totalItems) * 100}
                    className="h-2 bg-orange-100 [&>div]:bg-orange-600"
                  />
                </div>
              </div>
            </Card>

            {/* Alertas */}
            {resultados.itemsCriticosPendientes > 0 && (
              <Card className="p-4 bg-red-50 border-2 border-red-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-red-900">
                      {resultados.itemsCriticosPendientes} ítems críticos pendientes
                    </p>
                    <p className="text-sm text-red-700">
                      Deben completarse antes de enviar la lista
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Hallazgos potenciales */}
            {resultados.hallazgosPotenciales > 0 && (
              <Card className="p-4 bg-orange-50 border-2 border-orange-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-orange-900">
                      {resultados.hallazgosPotenciales} hallazgos potenciales identificados
                    </p>
                    <p className="text-sm text-orange-700">
                      Se generarán automáticamente al enviar la lista
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Resumen por sección */}
            <Card className="p-5">
              <h4 className="text-gray-900 mb-3">Resumen por Sección</h4>
              <div className="space-y-3">
                {lista.secciones.map(seccion => {
                  const totalSeccion = seccion.items.length;
                  const respondidos = seccion.items.filter(i => i.respuesta).length;
                  const progreso = Math.round((respondidos / totalSeccion) * 100);
                  
                  return (
                    <div key={seccion.id}>
                      <div className="flex items-center justify-between mb-1 text-sm">
                        <span className="text-gray-700">{seccion.nombre}</span>
                        <span className="text-gray-900">{respondidos}/{totalSeccion}</span>
                      </div>
                      <Progress value={progreso} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ==================== MODAL ENVIAR ====================

interface ModalEnviarProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmar: () => void;
  resultados: ResultadosDiligenciamiento;
  generaHallazgosAutomaticos: boolean;
  generarHallazgos: boolean;
  setGenerarHallazgos: (value: boolean) => void;
}

function ModalEnviar({
  isOpen,
  onClose,
  onConfirmar,
  resultados,
  generaHallazgosAutomaticos,
  generarHallazgos,
  setGenerarHallazgos
}: ModalEnviarProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar Lista Completada</DialogTitle>
          <DialogDescription>
            Confirma el envío de la lista de chequeo diligenciada
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Resumen */}
          <Card className="p-4 bg-blue-50 border border-blue-200">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Total ítems:</span>
                <span className="text-gray-900">{resultados.totalItems}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Completados:</span>
                <span className="text-gray-900">{resultados.itemsRespondidos}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Cumplimiento:</span>
                <span className="text-gray-900">{resultados.porcentajeCumplimiento}%</span>
              </div>
            </div>
          </Card>

          {/* Opción de generar hallazgos */}
          {generaHallazgosAutomaticos && resultados.hallazgosPotenciales > 0 && (
            <Card className="p-4 bg-orange-50 border border-orange-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-orange-900 mb-2">
                    Se identificaron {resultados.hallazgosPotenciales} ítems marcados como &quot;No Cumple&quot;
                  </p>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="generar-hallazgos" className="text-sm text-orange-800">
                      Generar hallazgos automáticamente
                    </Label>
                    <input
                      type="checkbox"
                      id="generar-hallazgos"
                      checked={generarHallazgos}
                      onChange={(e) => setGenerarHallazgos(e.target.checked)}
                      className="rounded"
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Advertencia */}
          <Card className="p-4 bg-gray-50 border border-gray-200">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700">
                Una vez enviada, la lista quedará marcada como completada y no se podrá modificar.
              </p>
            </div>
          </Card>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={onConfirmar}
            className="bg-[#003DA5] hover:bg-[#002873]"
          >
            Confirmar Envío
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
