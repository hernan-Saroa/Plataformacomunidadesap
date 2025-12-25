/**
 * VISTA DE APROBACIÓN DEL PTA
 * 
 * Componente para que directores y coordinadores aprueben o rechacen PTAs
 * Incluye validación, comentarios y observaciones
 * 
 * Fecha: 23 de diciembre de 2024
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  MessageSquare,
  User,
  Calendar,
  FileText,
  Eye,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner@2.0.3';
import { PTAResumenVisual } from './PTAResumenVisual';
import { PTAFlujoAprobacion } from './PTAFlujoAprobacion';

interface PTAAprobacionViewProps {
  pta: any;
  docente?: any;
  rol: 'director' | 'programacion';
  onAprobar: (ptaId: string, observaciones: string) => void;
  onRechazar: (ptaId: string, motivo: string, observaciones: string) => void;
  onCancelar?: () => void;
}

export function PTAAprobacionView({
  pta,
  docente,
  rol,
  onAprobar,
  onRechazar,
  onCancelar
}: PTAAprobacionViewProps) {
  
  const [vistaActual, setVistaActual] = useState<'resumen' | 'decision'>('resumen');
  const [decision, setDecision] = useState<'aprobar' | 'rechazar' | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [enviando, setEnviando] = useState(false);
  
  // Validaciones automáticas
  const validaciones = [
    {
      id: 'horas',
      nombre: 'Distribución de horas',
      valido: pta.horas_totales <= pta.horas_programables,
      mensaje: pta.horas_totales <= pta.horas_programables
        ? 'Las horas asignadas están dentro del límite'
        : `Excede ${pta.horas_totales - pta.horas_programables}h el límite permitido`
    },
    {
      id: 'docencia',
      nombre: 'Componente de docencia',
      valido: pta.componenteDocencia && pta.componenteDocencia.horas > 0,
      mensaje: pta.componenteDocencia?.horas > 0
        ? 'Componente de docencia registrado correctamente'
        : 'No tiene componente de docencia registrado'
    },
    {
      id: 'investigacion',
      nombre: 'Límite de investigación',
      valido: !pta.componenteInvestigacion || pta.componenteInvestigacion.porcentaje <= 50,
      mensaje: pta.componenteInvestigacion?.porcentaje <= 50
        ? 'Investigación dentro del límite (≤50%)'
        : `Investigación excede el límite máximo (${pta.componenteInvestigacion?.porcentaje}% > 50%)`
    },
    {
      id: 'extension',
      nombre: 'Límite de extensión',
      valido: !pta.componenteExtension || pta.componenteExtension.porcentaje <= 25,
      mensaje: pta.componenteExtension?.porcentaje <= 25
        ? 'Extensión dentro del límite (≤25%)'
        : `Extensión excede el límite máximo (${pta.componenteExtension?.porcentaje}% > 25%)`
    }
  ];
  
  const erroresCriticos = validaciones.filter(v => !v.valido);
  const puedeAprobar = erroresCriticos.length === 0;
  
  const handleEnviarDecision = async () => {
    if (!decision) {
      toast.error('Debe seleccionar una decisión (aprobar o rechazar)');
      return;
    }
    
    if (decision === 'rechazar' && !motivoRechazo.trim()) {
      toast.error('Debe especificar el motivo del rechazo');
      return;
    }
    
    setEnviando(true);
    
    try {
      if (decision === 'aprobar') {
        onAprobar(pta.id, observaciones);
        toast.success(
          rol === 'director'
            ? 'PTA aprobado. Enviado a Programación Académica'
            : 'PTA aprobado exitosamente'
        );
      } else {
        onRechazar(pta.id, motivoRechazo, observaciones);
        toast.success('PTA rechazado. El docente fue notificado para realizar correcciones');
      }
    } catch (error) {
      toast.error('Error al procesar la decisión');
    } finally {
      setEnviando(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Revisión y Aprobación de PTA
            </h2>
            <p className="text-purple-100">
              {rol === 'director' ? 'Aprobación Director Territorial' : 'Aprobación Programación Académica'}
            </p>
          </div>
          <Badge className="bg-white/20 text-white border-white/30">
            {rol === 'director' ? 'Nivel 1' : 'Nivel 2'}
          </Badge>
        </div>
        
        {/* Información del docente */}
        {docente && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/10 rounded-lg">
            <div>
              <p className="text-xs text-purple-100 mb-1">Docente</p>
              <p className="font-medium">{docente.nombre || 'No especificado'}</p>
            </div>
            <div>
              <p className="text-xs text-purple-100 mb-1">Cédula</p>
              <p className="font-medium">{docente.cedula || 'No especificada'}</p>
            </div>
            <div>
              <p className="text-xs text-purple-100 mb-1">Territorial</p>
              <p className="font-medium">{docente.territorial || 'Nacional'}</p>
            </div>
            <div>
              <p className="text-xs text-purple-100 mb-1">Período</p>
              <p className="font-medium">{pta.periodo || '2025-1'}</p>
            </div>
          </div>
        )}
      </Card>
      
      {/* Flujo de aprobación */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Estado del Flujo de Aprobación</h3>
        <PTAFlujoAprobacion pta={pta} mostrarDetalle={true} />
      </Card>
      
      {/* Navegación */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setVistaActual('resumen')}
          className={`px-4 py-2 font-medium transition-colors ${
            vistaActual === 'resumen'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Eye className="w-4 h-4 inline mr-2" />
          Ver Resumen del PTA
        </button>
        <button
          onClick={() => setVistaActual('decision')}
          className={`px-4 py-2 font-medium transition-colors ${
            vistaActual === 'decision'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <MessageSquare className="w-4 h-4 inline mr-2" />
          Tomar Decisión
        </button>
      </div>
      
      {/* Contenido según vista */}
      {vistaActual === 'resumen' && (
        <PTAResumenVisual pta={pta} docente={docente} />
      )}
      
      {vistaActual === 'decision' && (
        <div className="space-y-6">
          {/* Validaciones automáticas */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Validaciones Automáticas
            </h3>
            
            <div className="space-y-3">
              {validaciones.map((validacion) => (
                <div
                  key={validacion.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    validacion.valido
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  {validacion.valido ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${validacion.valido ? 'text-green-900' : 'text-red-900'}`}>
                      {validacion.nombre}
                    </p>
                    <p className={`text-sm ${validacion.valido ? 'text-green-700' : 'text-red-700'}`}>
                      {validacion.mensaje}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            {erroresCriticos.length > 0 && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-orange-900">
                      Advertencia: {erroresCriticos.length} validación(es) fallida(s)
                    </p>
                    <p className="text-sm text-orange-700 mt-1">
                      Se recomienda rechazar el PTA y solicitar correcciones al docente.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>
          
          {/* Decisión */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Tomar Decisión</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Aprobar */}
              <button
                onClick={() => setDecision('aprobar')}
                disabled={!puedeAprobar}
                className={`p-6 rounded-lg border-2 transition-all ${
                  decision === 'aprobar'
                    ? 'border-green-600 bg-green-50'
                    : !puedeAprobar
                    ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                    : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    decision === 'aprobar' ? 'bg-green-600' : 'bg-green-100'
                  }`}>
                    <ThumbsUp className={`w-8 h-8 ${
                      decision === 'aprobar' ? 'text-white' : 'text-green-600'
                    }`} />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-gray-900 mb-1">Aprobar PTA</p>
                    <p className="text-sm text-gray-600">
                      {rol === 'director'
                        ? 'Enviar a Programación Académica'
                        : 'Aprobación Final del PTA'}
                    </p>
                  </div>
                </div>
              </button>
              
              {/* Rechazar */}
              <button
                onClick={() => setDecision('rechazar')}
                className={`p-6 rounded-lg border-2 transition-all ${
                  decision === 'rechazar'
                    ? 'border-red-600 bg-red-50'
                    : 'border-gray-300 hover:border-red-400 hover:bg-red-50'
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    decision === 'rechazar' ? 'bg-red-600' : 'bg-red-100'
                  }`}>
                    <ThumbsDown className={`w-8 h-8 ${
                      decision === 'rechazar' ? 'text-white' : 'text-red-600'
                    }`} />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-gray-900 mb-1">Rechazar PTA</p>
                    <p className="text-sm text-gray-600">
                      Devolver al docente para correcciones
                    </p>
                  </div>
                </div>
              </button>
            </div>
            
            {/* Campo de motivo si rechaza */}
            {decision === 'rechazar' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4"
              >
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Motivo del Rechazo *
                </label>
                <Textarea
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  placeholder="Especifique claramente los motivos del rechazo y las correcciones necesarias..."
                  rows={4}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este motivo será visible para el docente
                </p>
              </motion.div>
            )}
            
            {/* Campo de observaciones */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Observaciones {decision === 'rechazar' && '(Opcional)'}
              </label>
              <Textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Agregue observaciones adicionales, sugerencias o comentarios..."
                rows={3}
                className="w-full"
              />
            </div>
            
            {/* Botones de acción */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                {decision && (
                  <p className="text-sm text-gray-600">
                    {decision === 'aprobar' ? (
                      <span className="text-green-700">
                        ✓ Preparado para aprobar el PTA
                      </span>
                    ) : (
                      <span className="text-red-700">
                        ✗ Preparado para rechazar el PTA
                      </span>
                    )}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                {onCancelar && (
                  <Button variant="outline" onClick={onCancelar}>
                    Cancelar
                  </Button>
                )}
                
                <Button
                  onClick={handleEnviarDecision}
                  disabled={!decision || (decision === 'rechazar' && !motivoRechazo.trim()) || enviando}
                  className={
                    decision === 'aprobar'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }
                >
                  <Send className="w-4 h-4 mr-2" />
                  {enviando
                    ? 'Procesando...'
                    : decision === 'aprobar'
                    ? 'Confirmar Aprobación'
                    : 'Confirmar Rechazo'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
