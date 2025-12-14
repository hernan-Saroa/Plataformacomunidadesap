/**
 * CALENDARIO DE AUDIENCIAS
 * Sistema de programación y gestión de audiencias disciplinarias
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, Clock, Plus, ChevronLeft, ChevronRight, Video,
  MapPin, Users, FileText, Edit, Trash2, X, Save, AlertCircle
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { toast } from 'sonner@2.0.3';

interface Audiencia {
  id: string;
  expediente: string;
  investigado: string;
  tipo: 'Descargos' | 'Práctica Pruebas' | 'Alegatos' | 'Lectura Fallo';
  fecha: string;
  hora: string;
  duracion: number;
  modalidad: 'Presencial' | 'Virtual';
  lugar: string;
  abogado: string;
  estado: 'Programada' | 'Realizada' | 'Cancelada' | 'Reprogramada';
  observaciones: string;
  linkVirtual?: string;
}

const AUDIENCIAS_MOCK: Audiencia[] = [
  {
    id: '1',
    expediente: 'PD-2025-0125',
    investigado: 'Ana María López Martínez',
    tipo: 'Descargos',
    fecha: '2025-01-15',
    hora: '09:00',
    duracion: 60,
    modalidad: 'Presencial',
    lugar: 'Sala de Audiencias - Piso 3',
    abogado: 'Dr. Carlos Mendoza',
    estado: 'Programada',
    observaciones: 'Traer documentos de soporte'
  },
  {
    id: '2',
    expediente: 'PD-2025-0098',
    investigado: 'Roberto Sánchez Cruz',
    tipo: 'Práctica Pruebas',
    fecha: '2025-01-15',
    hora: '14:00',
    duracion: 90,
    modalidad: 'Virtual',
    lugar: 'Plataforma Teams',
    abogado: 'Dra. María Torres',
    estado: 'Programada',
    observaciones: 'Interrogatorio de testigos',
    linkVirtual: 'https://teams.microsoft.com/l/meetup/...'
  },
  {
    id: '3',
    expediente: 'PD-2024-0234',
    investigado: 'Patricia Herrera Gómez',
    tipo: 'Lectura Fallo',
    fecha: '2025-01-16',
    hora: '10:00',
    duracion: 30,
    modalidad: 'Presencial',
    lugar: 'Despacho del Jefe Jurídico',
    abogado: 'Dr. Luis Ramírez',
    estado: 'Programada',
    observaciones: 'Notificar personalmente'
  }
];

export function CalendarioAudiencias() {
  const [audiencias, setAudiencias] = useState<Audiencia[]>(AUDIENCIAS_MOCK);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [vistaCalendario, setVistaCalendario] = useState<'mes' | 'semana' | 'dia'>('mes');
  const [modalOpen, setModalOpen] = useState(false);
  const [audienciaActual, setAudienciaActual] = useState<Audiencia | null>(null);

  // Formulario
  const [formData, setFormData] = useState<Partial<Audiencia>>({
    modalidad: 'Presencial',
    tipo: 'Descargos',
    estado: 'Programada'
  });

  const handleNuevaAudiencia = () => {
    setAudienciaActual(null);
    setFormData({
      modalidad: 'Presencial',
      tipo: 'Descargos',
      estado: 'Programada',
      duracion: 60
    });
    setModalOpen(true);
  };

  const handleEditarAudiencia = (audiencia: Audiencia) => {
    setAudienciaActual(audiencia);
    setFormData(audiencia);
    setModalOpen(true);
  };

  const handleEliminarAudiencia = (id: string) => {
    if (confirm('¿Está seguro de eliminar esta audiencia?')) {
      setAudiencias(audiencias.filter(a => a.id !== id));
      toast.success('Audiencia eliminada correctamente');
    }
  };

  const handleGuardarAudiencia = () => {
    if (!formData.expediente || !formData.fecha || !formData.hora) {
      toast.error('Complete los campos obligatorios');
      return;
    }

    if (audienciaActual) {
      setAudiencias(audiencias.map(a =>
        a.id === audienciaActual.id ? { ...a, ...formData } as Audiencia : a
      ));
      toast.success('Audiencia actualizada correctamente');
    } else {
      const nuevaAudiencia: Audiencia = {
        id: Date.now().toString(),
        ...formData as Audiencia
      };
      setAudiencias([...audiencias, nuevaAudiencia]);
      toast.success('Audiencia programada correctamente', {
        description: `${formData.tipo} - ${formData.fecha} ${formData.hora}`
      });
    }
    setModalOpen(false);
    setFormData({});
  };

  const audienciasPorFecha = (fecha: Date) => {
    const fechaStr = fecha.toISOString().split('T')[0];
    return audiencias.filter(a => a.fecha === fechaStr);
  };

  const getTipoColor = (tipo: string) => {
    const colores: Record<string, string> = {
      'Descargos': '#F59E0B',
      'Práctica Pruebas': '#8B5CF6',
      'Alegatos': '#EC4899',
      'Lectura Fallo': '#10B981'
    };
    return colores[tipo] || '#6B7280';
  };

  const getEstadoColor = (estado: string) => {
    const colores: Record<string, { bg: string; text: string }> = {
      'Programada': { bg: '#E0F2FE', text: '#075985' },
      'Realizada': { bg: '#D1FAE5', text: '#065F46' },
      'Cancelada': { bg: '#FEE2E2', text: '#991B1B' },
      'Reprogramada': { bg: '#FEF3C7', text: '#92400E' }
    };
    return colores[estado] || { bg: '#F3F4F6', text: '#6B7280' };
  };

  const audienciasHoy = audienciasPorFecha(new Date());
  const totalSemana = audiencias.filter(a => {
    const fecha = new Date(a.fecha);
    const hoy = new Date();
    const diff = Math.floor((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff < 7;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold mb-2" style={{ color: '#6F42C1' }}>
            Calendario de Audiencias
          </h2>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Programación y gestión de audiencias disciplinarias
          </p>
        </div>
        <Button
          onClick={handleNuevaAudiencia}
          className="font-bold"
          style={{ background: '#6F42C1', color: '#FFFFFF' }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Audiencia
        </Button>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 border-2 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ background: '#E0F2FE' }}>
              <Calendar className="w-6 h-6" style={{ color: '#0284C7' }} />
            </div>
          </div>
          <p className="text-3xl font-black mb-1" style={{ color: '#1F2937' }}>
            {audienciasHoy.length}
          </p>
          <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
            Audiencias Hoy
          </p>
        </Card>

        <Card className="p-5 border-2 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ background: '#F3E8FF' }}>
              <Clock className="w-6 h-6" style={{ color: '#6F42C1' }} />
            </div>
          </div>
          <p className="text-3xl font-black mb-1" style={{ color: '#1F2937' }}>
            {totalSemana}
          </p>
          <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
            Esta Semana
          </p>
        </Card>

        <Card className="p-5 border-2 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ background: '#FEF3C7' }}>
              <Video className="w-6 h-6" style={{ color: '#F59E0B' }} />
            </div>
          </div>
          <p className="text-3xl font-black mb-1" style={{ color: '#1F2937' }}>
            {audiencias.filter(a => a.modalidad === 'Virtual').length}
          </p>
          <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
            Virtuales
          </p>
        </Card>

        <Card className="p-5 border-2 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ background: '#D1FAE5' }}>
              <MapPin className="w-6 h-6" style={{ color: '#10B981' }} />
            </div>
          </div>
          <p className="text-3xl font-black mb-1" style={{ color: '#1F2937' }}>
            {audiencias.filter(a => a.modalidad === 'Presencial').length}
          </p>
          <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
            Presenciales
          </p>
        </Card>
      </div>

      {/* Lista de Audiencias */}
      <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg" style={{ color: '#1F2937' }}>
            Próximas Audiencias
          </h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-2">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="border-2">
              Hoy
            </Button>
            <Button variant="outline" size="sm" className="border-2">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {audiencias
            .sort((a, b) => new Date(a.fecha + ' ' + a.hora).getTime() - new Date(b.fecha + ' ' + b.hora).getTime())
            .slice(0, 10)
            .map((audiencia, index) => {
              const tipoColor = getTipoColor(audiencia.tipo);
              const estadoStyle = getEstadoColor(audiencia.estado);

              return (
                <motion.div
                  key={audiencia.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <Card className="p-4 border-2 hover:shadow-lg transition-all">
                    <div className="flex items-start gap-4">
                      {/* Fecha y Hora */}
                      <div
                        className="flex-shrink-0 w-20 text-center p-3 rounded-xl"
                        style={{ background: `${tipoColor}15` }}
                      >
                        <p className="text-xs font-bold mb-1" style={{ color: tipoColor }}>
                          {new Date(audiencia.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).toUpperCase()}
                        </p>
                        <p className="text-lg font-black" style={{ color: tipoColor }}>
                          {audiencia.hora}
                        </p>
                      </div>

                      {/* Info Principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                className="text-xs font-bold"
                                style={{ background: `${tipoColor}20`, color: tipoColor }}
                              >
                                {audiencia.tipo}
                              </Badge>
                              <Badge
                                className="text-xs"
                                style={{ background: estadoStyle.bg, color: estadoStyle.text }}
                              >
                                {audiencia.estado}
                              </Badge>
                            </div>
                            <p className="font-bold" style={{ color: '#1F2937' }}>
                              {audiencia.expediente} - {audiencia.investigado}
                            </p>
                            <p className="text-sm" style={{ color: '#6B7280' }}>
                              {audiencia.abogado} • {audiencia.duracion} minutos
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditarAudiencia(audiencia)}
                            >
                              <Edit className="w-4 h-4" style={{ color: '#6F42C1' }} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEliminarAudiencia(audiencia.id)}
                            >
                              <Trash2 className="w-4 h-4" style={{ color: '#DC2626' }} />
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm" style={{ color: '#6B7280' }}>
                          {audiencia.modalidad === 'Virtual' ? (
                            <>
                              <div className="flex items-center gap-1">
                                <Video className="w-4 h-4" />
                                <span>Virtual</span>
                              </div>
                              {audiencia.linkVirtual && (
                                <a
                                  href={audiencia.linkVirtual}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  Unirse a la reunión →
                                </a>
                              )}
                            </>
                          ) : (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{audiencia.lugar}</span>
                            </div>
                          )}
                        </div>

                        {audiencia.observaciones && (
                          <div className="mt-2 p-2 rounded-lg" style={{ background: '#F9FAFB' }}>
                            <p className="text-xs" style={{ color: '#6B7280' }}>
                              📝 {audiencia.observaciones}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
        </div>
      </Card>

      {/* Modal de Audiencia */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setModalOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto z-50"
            >
              <Card className="p-6 border-2" style={{ background: '#FFFFFF' }}>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl" style={{ background: '#F3E8FF' }}>
                      <Calendar className="w-6 h-6" style={{ color: '#6F42C1' }} />
                    </div>
                    <h3 className="text-xl font-black" style={{ color: '#6F42C1' }}>
                      {audienciaActual ? 'Editar Audiencia' : 'Nueva Audiencia'}
                    </h3>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {/* Formulario */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-bold mb-2">Expediente *</Label>
                      <Input
                        placeholder="PD-2025-XXXX"
                        value={formData.expediente || ''}
                        onChange={(e) => setFormData({ ...formData, expediente: e.target.value })}
                        className="border-2"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-bold mb-2">Tipo de Audiencia *</Label>
                      <select
                        value={formData.tipo || 'Descargos'}
                        onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                        className="w-full p-2 border-2 rounded-lg"
                      >
                        <option value="Descargos">Descargos</option>
                        <option value="Práctica Pruebas">Práctica Pruebas</option>
                        <option value="Alegatos">Alegatos</option>
                        <option value="Lectura Fallo">Lectura Fallo</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-bold mb-2">Investigado</Label>
                    <Input
                      placeholder="Nombre completo"
                      value={formData.investigado || ''}
                      onChange={(e) => setFormData({ ...formData, investigado: e.target.value })}
                      className="border-2"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-bold mb-2">Fecha *</Label>
                      <Input
                        type="date"
                        value={formData.fecha || ''}
                        onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                        className="border-2"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-bold mb-2">Hora *</Label>
                      <Input
                        type="time"
                        value={formData.hora || ''}
                        onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                        className="border-2"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-bold mb-2">Duración (min)</Label>
                      <Input
                        type="number"
                        placeholder="60"
                        value={formData.duracion || ''}
                        onChange={(e) => setFormData({ ...formData, duracion: parseInt(e.target.value) })}
                        className="border-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-bold mb-2">Modalidad *</Label>
                      <select
                        value={formData.modalidad || 'Presencial'}
                        onChange={(e) => setFormData({ ...formData, modalidad: e.target.value as any })}
                        className="w-full p-2 border-2 rounded-lg"
                      >
                        <option value="Presencial">Presencial</option>
                        <option value="Virtual">Virtual</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-sm font-bold mb-2">Abogado Sustanciador</Label>
                      <Input
                        placeholder="Dr./Dra."
                        value={formData.abogado || ''}
                        onChange={(e) => setFormData({ ...formData, abogado: e.target.value })}
                        className="border-2"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-bold mb-2">
                      {formData.modalidad === 'Virtual' ? 'Link Virtual' : 'Lugar'}
                    </Label>
                    <Input
                      placeholder={formData.modalidad === 'Virtual' ? 'https://...' : 'Sala de Audiencias'}
                      value={formData.modalidad === 'Virtual' ? (formData.linkVirtual || '') : (formData.lugar || '')}
                      onChange={(e) => setFormData({
                        ...formData,
                        [formData.modalidad === 'Virtual' ? 'linkVirtual' : 'lugar']: e.target.value
                      })}
                      className="border-2"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-bold mb-2">Observaciones</Label>
                    <textarea
                      placeholder="Notas adicionales..."
                      value={formData.observaciones || ''}
                      onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                      rows={3}
                      className="w-full p-3 border-2 rounded-lg"
                    />
                  </div>
                </div>

                {/* Botones */}
                <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t-2">
                  <Button variant="outline" onClick={() => setModalOpen(false)} className="border-2">
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleGuardarAudiencia}
                    className="font-bold"
                    style={{ background: '#6F42C1', color: '#FFFFFF' }}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Audiencia
                  </Button>
                </div>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Info */}
      <Card className="p-4 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg" style={{ background: '#E0F2FE' }}>
            <AlertCircle className="w-5 h-5" style={{ color: '#0284C7' }} />
          </div>
          <div>
            <p className="text-sm font-bold mb-1" style={{ color: '#1F2937' }}>
              📅 Recordatorios Automáticos
            </p>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              El sistema enviará notificaciones automáticas 24 horas antes de cada audiencia 
              al abogado sustanciador y al investigado (si está registrado su email).
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
