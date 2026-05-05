/**
 * ModalComentariosOrgano - Gestión de comentarios y actuaciones
 * DISEÑO LIMPIO ESAP 2025
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import { Avatar, AvatarFallback } from '@esap-mfe/shared-ui/avatar';
import {
  MessageSquare, X, Send, AlertCircle, CheckCircle,
  Clock, User, TrendingUp, Filter, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { ocService } from '../../../../services/api/legal.service';
import { authService } from '../../../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';

interface Comentario {
  id: string;
  autorNombre: string;
  autorCargo: string; // Mapped from backend or default
  contenido: string;
  createdAt: Date;
  tipo: 'ACTUACION' | 'COMENTARIO' | 'ALERTA';
}

interface ModalComentariosOrganoProps {
  isOpen: boolean;
  onClose: () => void;
  requerimientoId: string;
  radicado?: string;
}

export function ModalComentariosOrgano({
  isOpen,
  onClose,
  requerimientoId,
  radicado
}: ModalComentariosOrganoProps) {
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [tipoComentario, setTipoComentario] = useState<'ACTUACION' | 'COMENTARIO' | 'ALERTA'>('COMENTARIO');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');



  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [loading, setLoading] = useState(false);

  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (isOpen && requerimientoId) {
      fetchComentarios();
    }
  }, [isOpen, requerimientoId]);

  const fetchComentarios = async () => {
    setLoading(true);
    try {
      const data = await ocService.getComentariosByRequerimiento(requerimientoId);
      const ordenados = data.map((c: any) => ({
        id: c.id,
        autorNombre: c.autorNombre || 'Usuario Sistema',
        autorCargo: c.autorCargo || 'Funcionario',
        contenido: c.contenido,
        createdAt: new Date(c.createdAt),
        tipo: c.tipo || 'COMENTARIO'
      })).sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());

      setComentarios(ordenados);
    } catch (error) {
      console.error('Error cargando comentarios:', error);
      toast.error('Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };
  // Mock data de comentarios (REDUCIDOS)
  const comentariosMock: Comentario[] = [
    {
      id: 'com-001',
      usuario: 'Dra. Responsable',
      cargo: 'Jefa Área Jurídica',
      contenido: 'Comentario de ejemplo para referencia',
      fecha: new Date('2024-12-11T09:30:00'),
      tipo: 'actuacion'
    },
  ];

  // Filtrar comentarios
  const comentariosFiltrados = filtroTipo === 'todos'
    ? comentarios
    : comentarios.filter(c => c.tipo === filtroTipo);

  const getTipoConfig = (tipo: string) => {
    // Validar mayúsculas/minúsculas por si acaso
    const t = tipo.toUpperCase();
    switch (t) {
      case 'ACTUACION':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          color: '#10B981',
          bg: '#D1FAE5',
          label: 'Actuación'
        };
      case 'ALERTA':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          color: '#F59E0B',
          bg: '#FEF3C7',
          label: 'Alerta'
        };
      default:
        return {
          icon: <MessageSquare className="w-4 h-4" />,
          color: '#3B82F6',
          bg: '#DBEAFE',
          label: 'Comentario'
        };
    }
  };





  const handleEnviarComentario = async () => {
    if (!nuevoComentario.trim()) {
      toast.error('El comentario no puede estar vacío');
      return;
    }

    setEnviando(true);
    try {
      await ocService.createComentario(requerimientoId, {
        contenido: nuevoComentario,
        tipo: tipoComentario,
        autorNombre: authService.getCurrentUser()?.fullName || 'Usuario'
      });

      toast.success(tipoComentario === 'ACTUACION' ? 'Actuación registrada' : 'Comentario agregado', {
        icon: <CheckCircle className="w-4 h-4" />
      });

      setNuevoComentario('');
      fetchComentarios();
    } catch (error) {
      console.error('Error enviando comentario:', error);
      toast.error('Error al guardar');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="fixed !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 w-[95vw] max-w-[750px] lg:max-w-3xl !max-h-[85vh] overflow-hidden flex flex-col p-0 !z-[9999]">
        <DialogTitle className="sr-only">
          Comentarios y Actuaciones del Requerimiento {requerimientoId}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Historial de comentarios, actuaciones y alertas del requerimiento {requerimientoId} con toda la trazabilidad de las gestiones realizadas.
        </DialogDescription>

        {/* Header */}
        <div className="px-6 py-5 bg-white border-b flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Comentarios y Actuaciones</h2>
              <p className="text-sm text-gray-600">{radicado || requerimientoId} • {comentariosFiltrados.length} registros</p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* INFORMACIÓN */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-bold mb-1">💡 Sobre los Comentarios:</p>
                <p className="text-xs text-blue-700">
                  Este espacio registra TODA la trazabilidad del requerimiento: actuaciones formales, comentarios de coordinación,
                  alertas automáticas y notas internas. Todo queda documentado en el historial del expediente.
                </p>
              </div>
            </div>
          </div>

          {/* AGREGAR NUEVO COMENTARIO */}
          {authService.hasPermission(Permissions.GESTION_LEGAL_ORGANOS_CONTROL_ELABORAR) && <div className="space-y-3 border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold text-gray-900 flex-1">✍️ Agregar Comentario o Actuación</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant={tipoComentario === 'COMENTARIO' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTipoComentario('COMENTARIO')}
                  className="text-xs"
                >
                  💬 Comentario
                </Button>
                <Button
                  variant={tipoComentario === 'ACTUACION' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTipoComentario('ACTUACION')}
                  className="text-xs"
                  style={tipoComentario === 'ACTUACION' ? { background: '#10B981' } : {}}
                >
                  ✅ Actuación
                </Button>
                <Button
                  variant={tipoComentario === 'ALERTA' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTipoComentario('ALERTA')}
                  className="text-xs"
                  style={tipoComentario === 'ALERTA' ? { background: '#F59E0B' } : {}}
                >
                  ⚠️ Alerta
                </Button>
              </div>
            </div>

            <Textarea
              value={nuevoComentario}
              onChange={(e) => setNuevoComentario(e.target.value)}
              placeholder={
                tipoComentario === 'ACTUACION'
                  ? 'Describe la actuación realizada (Ej: "Se solicitó información al área de contratación")'
                  : tipoComentario === 'ALERTA'
                    ? 'Describe la alerta o advertencia (Ej: "Se requiere coordinación urgente con el área financiera")'
                    : 'Escribe tu comentario o nota interna sobre el requerimiento...'
              }
              rows={4}
              className="text-sm"
              disabled={enviando}
            />



            <div className="flex justify-end pt-2">
              <Button
                onClick={handleEnviarComentario}
                size="sm"
                style={{ background: '#003DA5' }}
                className="text-white"
                disabled={!nuevoComentario.trim() || enviando}
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3 mr-1" />
                    Publicar {tipoComentario === 'ACTUACION' ? 'Actuación' : tipoComentario === 'ALERTA' ? 'Alerta' : 'Comentario'}
                  </>
                )}
              </Button>
            </div>
          </div>}


          {/* FILTROS */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-bold text-gray-900">Filtrar por tipo:</span>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={filtroTipo === 'todos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroTipo('todos')}
                className="text-xs"
              >
                Todos ({comentarios.length})
              </Button>
              <Button
                variant={filtroTipo === 'ACTUACION' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroTipo('ACTUACION')}
                className="text-xs"
                style={filtroTipo === 'ACTUACION' ? { background: '#10B981' } : {}}
              >
                ✅ Actuaciones ({comentarios.filter(c => c.tipo === 'ACTUACION').length})
              </Button>
              <Button
                variant={filtroTipo === 'COMENTARIO' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroTipo('COMENTARIO')}
                className="text-xs"
              >
                💬 Comentarios ({comentarios.filter(c => c.tipo === 'COMENTARIO').length})
              </Button>
              <Button
                variant={filtroTipo === 'ALERTA' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroTipo('ALERTA')}
                className="text-xs"
                style={filtroTipo === 'ALERTA' ? { background: '#F59E0B' } : {}}
              >
                ⚠️ Alertas ({comentarios.filter(c => c.tipo === 'ALERTA').length})
              </Button>
            </div>
          </div>

          {/* TIMELINE DE COMENTARIOS */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-600" />
              Historial ({comentariosFiltrados.length})
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Cargando comentarios...</span>
              </div>
            ) : comentariosFiltrados.length > 0 ? (
              <div className="space-y-3">
                {comentariosFiltrados.map((comentario, idx) => {
                  const config = getTipoConfig(comentario.tipo);
                  return (
                    <div key={comentario.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center shadow-md"
                          style={{ backgroundColor: config.bg }}
                        >
                          <div style={{ color: config.color }}>
                            {config.icon}
                          </div>
                        </div>
                        {idx < comentariosFiltrados.length - 1 && (
                          <div className="w-0.5 h-full min-h-[60px] bg-gray-300 mt-2" />
                        )}
                      </div>

                      <div className="flex-1 pb-4">
                        <div
                          className="p-4 rounded-lg border-2"
                          style={{
                            backgroundColor: config.bg,
                            borderColor: config.color
                          }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback
                                  className="text-xs font-bold"
                                  style={{ backgroundColor: config.color, color: '#FFFFFF' }}
                                >
                                  {comentario.autorNombre.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-bold text-gray-900">{comentario.autorNombre}</p>
                                <p className="text-xs text-gray-600">{comentario.autorCargo}</p>
                              </div>
                            </div>
                            <Badge
                              className="text-xs"
                              style={{ backgroundColor: config.color, color: '#FFFFFF' }}
                            >
                              {config.label}
                            </Badge>
                          </div>

                          <p className="text-sm text-gray-800 mb-2 whitespace-pre-line">{comentario.contenido}</p>

                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Clock className="w-3 h-3" />
                            <span>
                              {comentario.createdAt.toLocaleDateString('es-CO', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric'
                              })}
                              {' '}a las{' '}
                              {comentario.createdAt.toLocaleTimeString('es-CO', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-600">No hay comentarios {filtroTipo !== 'todos' ? `de tipo ${filtroTipo.toLowerCase()}` : 'registrados'}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Sé el primero en agregar una nota al expediente
                </p>
              </div>
            )}
          </div>

          {/* ESTADÍSTICAS */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-center">
              <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-green-900">
                {comentarios.filter(c => c.tipo === 'ACTUACION').length}
              </p>
              <p className="text-xs text-green-700">Actuaciones</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
              <MessageSquare className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-blue-900">
                {comentarios.filter(c => c.tipo === 'COMENTARIO').length}
              </p>
              <p className="text-xs text-blue-700">Comentarios</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-center">
              <AlertCircle className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-yellow-900">
                {comentarios.filter(c => c.tipo === 'ALERTA').length}
              </p>
              <p className="text-xs text-yellow-700">Alertas</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 border-t bg-gray-50 px-6 py-4 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={onClose}
          >
            <X className="w-4 h-4 mr-2" />
            Cerrar
          </Button>
        </div>
      </DialogContent >
    </Dialog >
  );
}