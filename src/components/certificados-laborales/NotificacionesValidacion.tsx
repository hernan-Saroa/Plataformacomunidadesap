import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Settings,
  CheckCircle,
  AlertCircle,
  Webhook,
  Plus,
  Trash2,
  Edit,
  Save,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Checkbox } from '../ui/checkbox';

interface CanalNotificacion {
  id: string;
  tipo: 'EMAIL' | 'SMS' | 'WEBHOOK' | 'PUSH';
  nombre: string;
  destino: string;
  activo: boolean;
  eventos: string[];
}

interface EventoNotificacion {
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: 'VALIDACION' | 'SISTEMA' | 'SEGURIDAD';
}

export function NotificacionesValidacion() {
  const [canales, setCanales] = useState<CanalNotificacion[]>([
    {
      id: '1',
      tipo: 'EMAIL',
      nombre: 'Notificación a Talento Humano',
      destino: 'talento.humano@esap.edu.co',
      activo: true,
      eventos: ['VALIDACION_EXITOSA', 'VALIDACION_FALLIDA', 'CERTIFICADO_VENCIDO']
    },
    {
      id: '2',
      tipo: 'WEBHOOK',
      nombre: 'Integración con Sistema Interno',
      destino: 'https://api.esap.interno/webhooks/certificados',
      activo: true,
      eventos: ['VALIDACION_EXITOSA', 'INTENTO_FRAUDULENTO']
    },
    {
      id: '3',
      tipo: 'SMS',
      nombre: 'Alertas de Seguridad',
      destino: '+57 300 123 4567',
      activo: false,
      eventos: ['INTENTO_FRAUDULENTO', 'MULTIPLES_VALIDACIONES']
    }
  ]);

  const [editandoCanal, setEditandoCanal] = useState<CanalNotificacion | null>(null);
  const [nuevoCanal, setNuevoCanal] = useState<Partial<CanalNotificacion> | null>(null);

  const eventosDisponibles: EventoNotificacion[] = [
    {
      codigo: 'VALIDACION_EXITOSA',
      nombre: 'Validación Exitosa',
      descripcion: 'Se valida exitosamente un certificado',
      categoria: 'VALIDACION'
    },
    {
      codigo: 'VALIDACION_FALLIDA',
      nombre: 'Validación Fallida',
      descripcion: 'Se intenta validar un código QR inválido',
      categoria: 'VALIDACION'
    },
    {
      codigo: 'CERTIFICADO_VENCIDO',
      nombre: 'Certificado Vencido',
      descripcion: 'Se valida un certificado que está vencido',
      categoria: 'VALIDACION'
    },
    {
      codigo: 'CERTIFICADO_ANULADO',
      nombre: 'Certificado Anulado',
      descripcion: 'Se valida un certificado que fue anulado',
      categoria: 'VALIDACION'
    },
    {
      codigo: 'INTENTO_FRAUDULENTO',
      nombre: 'Intento Fraudulento Detectado',
      descripcion: 'Se detecta un patrón sospechoso de validación',
      categoria: 'SEGURIDAD'
    },
    {
      codigo: 'MULTIPLES_VALIDACIONES',
      nombre: 'Múltiples Validaciones',
      descripcion: 'Un mismo certificado es validado múltiples veces en corto tiempo',
      categoria: 'SEGURIDAD'
    },
    {
      codigo: 'ERROR_SISTEMA',
      nombre: 'Error del Sistema',
      descripcion: 'Ocurre un error durante el proceso de validación',
      categoria: 'SISTEMA'
    }
  ];

  const getTipoIcon = (tipo: CanalNotificacion['tipo']) => {
    switch (tipo) {
      case 'EMAIL': return <Mail className="w-5 h-5" />;
      case 'SMS': return <MessageSquare className="w-5 h-5" />;
      case 'WEBHOOK': return <Webhook className="w-5 h-5" />;
      case 'PUSH': return <Smartphone className="w-5 h-5" />;
    }
  };

  const handleToggleCanal = (id: string) => {
    setCanales(prev => prev.map(c => 
      c.id === id ? { ...c, activo: !c.activo } : c
    ));

    const canal = canales.find(c => c.id === id);
    toast.success(
      canal?.activo ? 'Canal desactivado' : 'Canal activado',
      { duration: 2000 }
    );
  };

  const handleEliminarCanal = (id: string) => {
    setCanales(prev => prev.filter(c => c.id !== id));
    toast.success('Canal eliminado', { duration: 2000 });
  };

  const handleGuardarCanal = () => {
    if (editandoCanal) {
      setCanales(prev => prev.map(c => 
        c.id === editandoCanal.id ? editandoCanal : c
      ));
      toast.success('Canal actualizado', { duration: 2000 });
      setEditandoCanal(null);
    } else if (nuevoCanal && nuevoCanal.tipo && nuevoCanal.nombre && nuevoCanal.destino) {
      const nuevo: CanalNotificacion = {
        id: Date.now().toString(),
        tipo: nuevoCanal.tipo,
        nombre: nuevoCanal.nombre,
        destino: nuevoCanal.destino,
        activo: true,
        eventos: nuevoCanal.eventos || []
      };
      setCanales(prev => [...prev, nuevo]);
      toast.success('Canal creado exitosamente', { duration: 2000 });
      setNuevoCanal(null);
    }
  };

  const handleToggleEvento = (canalId: string, eventoId: string) => {
    setCanales(prev => prev.map(c => {
      if (c.id === canalId) {
        const eventos = c.eventos.includes(eventoId)
          ? c.eventos.filter(e => e !== eventoId)
          : [...c.eventos, eventoId];
        return { ...c, eventos };
      }
      return c;
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 md:py-8 px-3 sm:px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 sm:mb-6 md:mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
              <div 
                className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                  boxShadow: '0 4px 12px rgba(0, 61, 165, 0.2)'
                }}
              >
                <Bell className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">
                  Notificaciones de Validación
                </h1>
                <p className="text-xs sm:text-sm md:text-base text-gray-600">
                  Configura alertas automáticas cuando se validen certificados
                </p>
              </div>
            </div>

            <Button
              onClick={() => setNuevoCanal({ tipo: 'EMAIL', eventos: [] })}
              className="bg-[#003DA5] hover:bg-[#002873] min-h-[48px] w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Canal
            </Button>
          </div>

          {/* Info Banner */}
          <Card className="p-3 sm:p-4 bg-blue-50 border-2 border-blue-200 mb-4 sm:mb-6">
            <div className="flex items-start gap-2 sm:gap-3">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">Sistema de Notificaciones Automáticas</h3>
                <p className="text-xs sm:text-sm text-gray-700">
                  Recibe alertas en tiempo real cada vez que se valide un certificado laboral. Configura múltiples canales y personaliza los eventos que deseas monitorear.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Formulario Nuevo/Editar Canal */}
        <AnimatePresence>
          {(nuevoCanal || editandoCanal) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <Card className="p-6 border-2 border-[#003DA5]">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editandoCanal ? 'Editar Canal' : 'Nuevo Canal de Notificación'}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNuevoCanal(null);
                      setEditandoCanal(null);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <Label htmlFor="nombre">Nombre del Canal</Label>
                    <Input
                      id="nombre"
                      type="text"
                      placeholder="Ej: Notificaciones Equipo TH"
                      value={(editandoCanal || nuevoCanal)?.nombre || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (editandoCanal) {
                          setEditandoCanal({ ...editandoCanal, nombre: value });
                        } else if (nuevoCanal) {
                          setNuevoCanal({ ...nuevoCanal, nombre: value });
                        }
                      }}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tipo">Tipo de Canal</Label>
                    <select
                      id="tipo"
                      value={(editandoCanal || nuevoCanal)?.tipo || 'EMAIL'}
                      onChange={(e) => {
                        const value = e.target.value as CanalNotificacion['tipo'];
                        if (editandoCanal) {
                          setEditandoCanal({ ...editandoCanal, tipo: value });
                        } else if (nuevoCanal) {
                          setNuevoCanal({ ...nuevoCanal, tipo: value });
                        }
                      }}
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
                    >
                      <option value="EMAIL">Email</option>
                      <option value="SMS">SMS</option>
                      <option value="WEBHOOK">Webhook</option>
                      <option value="PUSH">Push Notification</option>
                    </select>
                  </div>
                </div>

                <div className="mb-6">
                  <Label htmlFor="destino">
                    {(editandoCanal || nuevoCanal)?.tipo === 'EMAIL' && 'Dirección de Email'}
                    {(editandoCanal || nuevoCanal)?.tipo === 'SMS' && 'Número de Teléfono'}
                    {(editandoCanal || nuevoCanal)?.tipo === 'WEBHOOK' && 'URL del Webhook'}
                    {(editandoCanal || nuevoCanal)?.tipo === 'PUSH' && 'ID del Dispositivo'}
                  </Label>
                  <Input
                    id="destino"
                    type="text"
                    placeholder={
                      (editandoCanal || nuevoCanal)?.tipo === 'EMAIL' ? 'ejemplo@esap.edu.co' :
                      (editandoCanal || nuevoCanal)?.tipo === 'SMS' ? '+57 300 123 4567' :
                      (editandoCanal || nuevoCanal)?.tipo === 'WEBHOOK' ? 'https://api.ejemplo.com/webhook' :
                      'device-id-12345'
                    }
                    value={(editandoCanal || nuevoCanal)?.destino || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (editandoCanal) {
                        setEditandoCanal({ ...editandoCanal, destino: value });
                      } else if (nuevoCanal) {
                        setNuevoCanal({ ...nuevoCanal, destino: value });
                      }
                    }}
                    className="mt-2"
                  />
                </div>

                <div className="mb-6">
                  <Label className="mb-3 block">Eventos a Notificar</Label>
                  <div className="grid md:grid-cols-2 gap-4">
                    {eventosDisponibles.map((evento) => (
                      <Card key={evento.codigo} className="p-4 border hover:border-[#003DA5] transition-colors">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id={`evento-${evento.codigo}`}
                            checked={(editandoCanal || nuevoCanal)?.eventos?.includes(evento.codigo) || false}
                            onCheckedChange={(checked) => {
                              const currentEventos = (editandoCanal || nuevoCanal)?.eventos || [];
                              const newEventos = checked
                                ? [...currentEventos, evento.codigo]
                                : currentEventos.filter(e => e !== evento.codigo);
                              
                              if (editandoCanal) {
                                setEditandoCanal({ ...editandoCanal, eventos: newEventos });
                              } else if (nuevoCanal) {
                                setNuevoCanal({ ...nuevoCanal, eventos: newEventos });
                              }
                            }}
                          />
                          <div>
                            <label 
                              htmlFor={`evento-${evento.codigo}`}
                              className="font-semibold text-sm text-gray-900 cursor-pointer block"
                            >
                              {evento.nombre}
                            </label>
                            <p className="text-xs text-gray-600 mt-1">{evento.descripcion}</p>
                            <Badge 
                              variant="outline" 
                              className={`mt-2 text-xs ${
                                evento.categoria === 'SEGURIDAD' ? 'border-red-300 text-red-800' :
                                evento.categoria === 'VALIDACION' ? 'border-blue-300 text-blue-800' :
                                'border-gray-300 text-gray-800'
                              }`}
                            >
                              {evento.categoria}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setNuevoCanal(null);
                      setEditandoCanal(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleGuardarCanal}
                    className="bg-[#003DA5] hover:bg-[#002873]"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editandoCanal ? 'Guardar Cambios' : 'Crear Canal'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lista de Canales */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-4"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Canales Configurados ({canales.length})
          </h2>

          {canales.map((canal) => (
            <Card key={canal.id} className="p-6 border-2 hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-3 rounded-xl ${
                    canal.tipo === 'EMAIL' ? 'bg-blue-100' :
                    canal.tipo === 'SMS' ? 'bg-green-100' :
                    canal.tipo === 'WEBHOOK' ? 'bg-purple-100' :
                    'bg-orange-100'
                  }`}>
                    {getTipoIcon(canal.tipo)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg text-gray-900">{canal.nombre}</h3>
                      <Badge variant="outline">{canal.tipo}</Badge>
                      {canal.activo ? (
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-600">
                          Inactivo
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mb-3">{canal.destino}</p>

                    <div className="flex flex-wrap gap-2">
                      {canal.eventos.map((eventoId) => {
                        const evento = eventosDisponibles.find(e => e.codigo === eventoId);
                        return evento ? (
                          <Badge key={eventoId} variant="outline" className="text-xs">
                            {evento.nombre}
                          </Badge>
                        ) : null;
                      })}
                      {canal.eventos.length === 0 && (
                        <span className="text-xs text-gray-400 italic">Sin eventos configurados</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <Switch
                    checked={canal.activo}
                    onCheckedChange={() => handleToggleCanal(canal.id)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditandoCanal(canal)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEliminarCanal(canal.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {canales.length === 0 && (
            <Card className="p-12 border-2 border-dashed">
              <div className="text-center">
                <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No hay canales configurados
                </h3>
                <p className="text-gray-600 mb-6">
                  Crea tu primer canal de notificación para recibir alertas automáticas
                </p>
                <Button
                  onClick={() => setNuevoCanal({ tipo: 'EMAIL', eventos: [] })}
                  className="bg-[#003DA5] hover:bg-[#002873]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primer Canal
                </Button>
              </div>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}
