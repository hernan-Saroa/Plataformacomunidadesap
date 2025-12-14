import { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  CheckCircle,
  XCircle,
  MessageSquare,
  Send,
  FileText,
  User,
  Calendar,
  Clock,
  BookOpen,
  Target,
  AlertCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { toast } from 'sonner@2.0.3';

interface PTARevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  pta: any;
  onAprobar: (data: any) => void;
  onRechazar: (data: any) => void;
  onSolicitarAjustes: (data: any) => void;
}

export function PTARevisionModal({
  isOpen,
  onClose,
  pta,
  onAprobar,
  onRechazar,
  onSolicitarAjustes
}: PTARevisionModalProps) {
  const [accion, setAccion] = useState<'aprobar' | 'rechazar' | 'ajustes' | null>(null);
  const [comentarios, setComentarios] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!accion) {
      toast.error('Por favor selecciona una acción');
      return;
    }

    if (!comentarios.trim() && accion !== 'aprobar') {
      toast.error('Por favor escribe comentarios para esta acción');
      return;
    }

    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const data = {
        pta_id: pta.id,
        accion,
        comentarios,
        fecha_revision: new Date().toISOString(),
        revisor: 'Sistema' // En producción vendría del usuario logueado
      };

      switch (accion) {
        case 'aprobar':
          onAprobar(data);
          toast.success('¡PTA aprobado exitosamente!');
          break;
        case 'rechazar':
          onRechazar(data);
          toast.success('PTA rechazado');
          break;
        case 'ajustes':
          onSolicitarAjustes(data);
          toast.success('Solicitud de ajustes enviada');
          break;
      }

      onClose();
    } catch (error) {
      toast.error('Hubo un error al procesar la revisión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (nombre: string) => {
    const parts = nombre.split(' ');
    return parts.length >= 2 
      ? `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
      : nombre.slice(0, 2).toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isOpen || !pta) return null;

  const totalHoras = pta.componente_ensenanza.horas + 
                     pta.componente_investigacion.horas + 
                     pta.componente_extension.horas + 
                     pta.componente_apoyo_institucional.horas;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd]">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 border-2 border-white">
              <AvatarFallback className="bg-white text-[#1e5da8]">
                {getInitials(pta.docente_nombre)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Revisar PTA
              </h2>
              <p className="text-sm text-blue-100 mt-1">
                {pta.codigo} - {pta.docente_nombre}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Información General */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Calendar className="w-4 h-4" />
                Periodo Académico
              </div>
              <p className="font-bold text-gray-900">{pta.periodo_nombre}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <User className="w-4 h-4" />
                Territorial
              </div>
              <p className="font-bold text-gray-900">{pta.territorial}</p>
            </div>
          </div>

          {/* Distribución de Tiempo */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Distribución de Tiempo ({totalHoras}h semanales)
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-gray-700">Enseñanza</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">
                    {pta.componente_ensenanza.horas}h
                  </span>
                  <Badge className="bg-blue-100 text-blue-700">
                    {pta.componente_ensenanza.porcentaje}%
                  </Badge>
                </div>
              </div>
              <Progress value={pta.componente_ensenanza.porcentaje} className="h-2" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-sm text-gray-700">Investigación</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">
                    {pta.componente_investigacion.horas}h
                  </span>
                  <Badge className="bg-purple-100 text-purple-700">
                    {pta.componente_investigacion.porcentaje}%
                  </Badge>
                </div>
              </div>
              <Progress value={pta.componente_investigacion.porcentaje} className="h-2" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm text-gray-700">Extensión</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">
                    {pta.componente_extension.horas}h
                  </span>
                  <Badge className="bg-green-100 text-green-700">
                    {pta.componente_extension.porcentaje}%
                  </Badge>
                </div>
              </div>
              <Progress value={pta.componente_extension.porcentaje} className="h-2" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-sm text-gray-700">Apoyo Institucional</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">
                    {pta.componente_apoyo_institucional.horas}h
                  </span>
                  <Badge className="bg-amber-100 text-amber-700">
                    {pta.componente_apoyo_institucional.porcentaje}%
                  </Badge>
                </div>
              </div>
              <Progress value={pta.componente_apoyo_institucional.porcentaje} className="h-2" />
            </div>
          </div>

          {/* Asignaturas */}
          {pta.asignaturas && pta.asignaturas.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Asignaturas Asignadas ({pta.asignaturas.length})
              </h3>
              <div className="space-y-2">
                {pta.asignaturas.map((asignatura: any, idx: number) => (
                  <div key={idx} className="bg-gray-50 rounded p-3">
                    <p className="font-medium text-gray-900">{asignatura.nombre}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                      <span>Grupo: {asignatura.grupo}</span>
                      <span>•</span>
                      <span>{asignatura.estudiantes} estudiantes</span>
                      <span>•</span>
                      <span>{asignatura.horas_semana}h/semana</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Objetivos */}
          {pta.objetivos_periodo && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Objetivos del Periodo
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{pta.objetivos_periodo}</p>
            </div>
          )}

          {/* Estrategias Pedagógicas */}
          {pta.estrategias_pedagogicas && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Estrategias Pedagógicas</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{pta.estrategias_pedagogicas}</p>
            </div>
          )}

          {/* Decisión de Revisión */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
            <h3 className="font-semibold text-gray-900 mb-4">Decisión de Revisión</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <button
                onClick={() => setAccion('aprobar')}
                className={`
                  p-4 rounded-lg border-2 transition-all
                  ${accion === 'aprobar'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                  }
                `}
              >
                <CheckCircle className={`w-6 h-6 mx-auto mb-2 ${
                  accion === 'aprobar' ? 'text-green-600' : 'text-gray-400'
                }`} />
                <p className={`text-sm font-medium ${
                  accion === 'aprobar' ? 'text-green-900' : 'text-gray-700'
                }`}>
                  Aprobar
                </p>
              </button>

              <button
                onClick={() => setAccion('ajustes')}
                className={`
                  p-4 rounded-lg border-2 transition-all
                  ${accion === 'ajustes'
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/50'
                  }
                `}
              >
                <AlertCircle className={`w-6 h-6 mx-auto mb-2 ${
                  accion === 'ajustes' ? 'text-amber-600' : 'text-gray-400'
                }`} />
                <p className={`text-sm font-medium ${
                  accion === 'ajustes' ? 'text-amber-900' : 'text-gray-700'
                }`}>
                  Solicitar Ajustes
                </p>
              </button>

              <button
                onClick={() => setAccion('rechazar')}
                className={`
                  p-4 rounded-lg border-2 transition-all
                  ${accion === 'rechazar'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-red-300 hover:bg-red-50/50'
                  }
                `}
              >
                <XCircle className={`w-6 h-6 mx-auto mb-2 ${
                  accion === 'rechazar' ? 'text-red-600' : 'text-gray-400'
                }`} />
                <p className={`text-sm font-medium ${
                  accion === 'rechazar' ? 'text-red-900' : 'text-gray-700'
                }`}>
                  Rechazar
                </p>
              </button>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Comentarios {accion !== 'aprobar' && <span className="text-red-500">*</span>}
              </Label>
              <textarea
                rows={4}
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
                placeholder={
                  accion === 'aprobar' 
                    ? 'Comentarios opcionales sobre la aprobación...'
                    : accion === 'ajustes'
                    ? 'Detalla los ajustes que deben realizarse...'
                    : 'Explica las razones del rechazo...'
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !accion}
            className={`
              ${accion === 'aprobar' ? 'bg-green-600 hover:bg-green-700' :
                accion === 'rechazar' ? 'bg-red-600 hover:bg-red-700' :
                'bg-[#1e5da8] hover:bg-[#1a4d8f]'}
            `}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Procesando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {accion === 'aprobar' ? 'Aprobar PTA' :
                 accion === 'rechazar' ? 'Rechazar PTA' :
                 accion === 'ajustes' ? 'Solicitar Ajustes' :
                 'Selecciona una Acción'}
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
