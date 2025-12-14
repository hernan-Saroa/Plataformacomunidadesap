/**
 * SISTEMA DE NOTIFICACIONES
 * Centro de notificaciones y alertas del módulo legal
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Bell, Mail, MessageSquare, AlertTriangle, CheckCircle, Clock,
  X, Settings, Filter, Search, Eye, Archive
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { toast } from 'sonner@2.0.3';

interface Notificacion {
  id: string;
  tipo: 'Alerta' | 'Recordatorio' | 'Información' | 'Urgente';
  categoria: 'Prescripción' | 'Término' | 'Audiencia' | 'Documento' | 'Sistema';
  titulo: string;
  mensaje: string;
  expediente?: string;
  fecha: string;
  hora: string;
  leida: boolean;
  prioridad: 'Alta' | 'Media' | 'Baja';
  destinatario: string;
}

const NOTIFICACIONES_MOCK: Notificacion[] = [
  {
    id: '1',
    tipo: 'Urgente',
    categoria: 'Prescripción',
    titulo: '🚨 ALERTA CRÍTICA DE PRESCRIPCIÓN',
    mensaje: 'El expediente PD-2025-0125 tiene menos de 45 días para prescribir. Requiere atención inmediata.',
    expediente: 'PD-2025-0125',
    fecha: '2025-01-02',
    hora: '09:00',
    leida: false,
    prioridad: 'Alta',
    destinatario: 'Dr. Carlos Mendoza'
  },
  {
    id: '2',
    tipo: 'Recordatorio',
    categoria: 'Audiencia',
    titulo: '📅 Audiencia programada mañana',
    mensaje: 'Recuerda: Audiencia de descargos del expediente PD-2025-0098 mañana a las 14:00 hrs (Virtual)',
    expediente: 'PD-2025-0098',
    fecha: '2025-01-01',
    hora: '15:30',
    leida: false,
    prioridad: 'Alta',
    destinatario: 'Dra. María Torres'
  },
  {
    id: '3',
    tipo: 'Alerta',
    categoria: 'Término',
    titulo: '⚠️ Término procesal por vencer',
    mensaje: 'El plazo de descargos del expediente PD-2025-0125 vence en 3 días. Revisar estado actual.',
    expediente: 'PD-2025-0125',
    fecha: '2025-01-01',
    hora: '10:00',
    leida: true,
    prioridad: 'Media',
    destinatario: 'Dr. Carlos Mendoza'
  },
  {
    id: '4',
    tipo: 'Información',
    categoria: 'Documento',
    titulo: '📄 Documento firmado',
    mensaje: 'El auto de avocamiento del expediente PD-2024-0234 ha sido firmado por el Jefe de la Oficina Jurídica.',
    expediente: 'PD-2024-0234',
    fecha: '2024-12-30',
    hora: '16:45',
    leida: true,
    prioridad: 'Baja',
    destinatario: 'Dr. Luis Ramírez'
  },
  {
    id: '5',
    tipo: 'Urgente',
    categoria: 'Término',
    titulo: '🚨 Término vencido',
    mensaje: 'El término para presentar alegatos en el expediente PD-2024-0156 venció hoy. Verificar estado.',
    expediente: 'PD-2024-0156',
    fecha: '2024-12-29',
    hora: '18:00',
    leida: true,
    prioridad: 'Alta',
    destinatario: 'Dr. Carlos Mendoza'
  },
  {
    id: '6',
    tipo: 'Información',
    categoria: 'Sistema',
    titulo: 'ℹ️ Actualización del sistema',
    mensaje: 'El módulo de Gestión Legal ha sido actualizado. Nuevas funcionalidades disponibles.',
    fecha: '2024-12-28',
    hora: '08:00',
    leida: true,
    prioridad: 'Baja',
    destinatario: 'Todos'
  }
];

export function SistemaNotificaciones() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>(NOTIFICACIONES_MOCK);
  const [filtro, setFiltro] = useState<'todas' | 'no-leidas'>('todas');
  const [busqueda, setBusqueda] = useState('');

  const notificacionesFiltradas = notificaciones.filter(notif => {
    const matchFiltro = filtro === 'todas' || !notif.leida;
    const matchBusqueda = notif.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
                         notif.mensaje.toLowerCase().includes(busqueda.toLowerCase());
    return matchFiltro && matchBusqueda;
  });

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  const handleMarcarLeida = (id: string) => {
    setNotificaciones(notificaciones.map(n =>
      n.id === id ? { ...n, leida: true } : n
    ));
    toast.success('Notificación marcada como leída');
  };

  const handleMarcarTodasLeidas = () => {
    setNotificaciones(notificaciones.map(n => ({ ...n, leida: true })));
    toast.success('Todas las notificaciones marcadas como leídas');
  };

  const handleEliminar = (id: string) => {
    setNotificaciones(notificaciones.filter(n => n.id !== id));
    toast.success('Notificación eliminada');
  };

  const getTipoStyle = (tipo: string) => {
    const estilos: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      'Urgente': {
        bg: '#FEE2E2',
        text: '#991B1B',
        icon: <AlertTriangle className="w-5 h-5" />
      },
      'Alerta': {
        bg: '#FEF3C7',
        text: '#92400E',
        icon: <AlertTriangle className="w-5 h-5" />
      },
      'Recordatorio': {
        bg: '#E0F2FE',
        text: '#075985',
        icon: <Clock className="w-5 h-5" />
      },
      'Información': {
        bg: '#D1FAE5',
        text: '#065F46',
        icon: <CheckCircle className="w-5 h-5" />
      }
    };
    return estilos[tipo] || estilos['Información'];
  };

  const getCategoriaColor = (categoria: string) => {
    const colores: Record<string, string> = {
      'Prescripción': '#DC2626',
      'Término': '#F59E0B',
      'Audiencia': '#6F42C1',
      'Documento': '#10B981',
      'Sistema': '#6B7280'
    };
    return colores[categoria] || '#6B7280';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold mb-2" style={{ color: '#6F42C1' }}>
            Centro de Notificaciones
          </h2>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Sistema de alertas y recordatorios procesales
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleMarcarTodasLeidas}
            disabled={noLeidas === 0}
            className="border-2"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Marcar todas leídas
          </Button>
          <Button variant="outline" className="border-2">
            <Settings className="w-4 h-4 mr-2" />
            Configurar
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 border-2 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ background: '#FEE2E2' }}>
              <AlertTriangle className="w-6 h-6" style={{ color: '#DC2626' }} />
            </div>
            {noLeidas > 0 && (
              <Badge style={{ background: '#DC2626', color: '#FFFFFF' }}>
                {noLeidas}
              </Badge>
            )}
          </div>
          <p className="text-3xl font-black mb-1" style={{ color: '#1F2937' }}>
            {noLeidas}
          </p>
          <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
            No Leídas
          </p>
        </Card>

        <Card className="p-5 border-2 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ background: '#F3E8FF' }}>
              <Bell className="w-6 h-6" style={{ color: '#6F42C1' }} />
            </div>
          </div>
          <p className="text-3xl font-black mb-1" style={{ color: '#1F2937' }}>
            {notificaciones.length}
          </p>
          <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
            Total Notificaciones
          </p>
        </Card>

        <Card className="p-5 border-2 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ background: '#FEE2E2' }}>
              <AlertTriangle className="w-6 h-6" style={{ color: '#DC2626' }} />
            </div>
          </div>
          <p className="text-3xl font-black mb-1" style={{ color: '#1F2937' }}>
            {notificaciones.filter(n => n.tipo === 'Urgente').length}
          </p>
          <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
            Urgentes
          </p>
        </Card>

        <Card className="p-5 border-2 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ background: '#E0F2FE' }}>
              <Clock className="w-6 h-6" style={{ color: '#0284C7' }} />
            </div>
          </div>
          <p className="text-3xl font-black mb-1" style={{ color: '#1F2937' }}>
            {notificaciones.filter(n => n.categoria === 'Audiencia').length}
          </p>
          <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
            Recordatorios
          </p>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
            <Input
              placeholder="Buscar notificaciones..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10 border-2"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filtro === 'todas' ? 'default' : 'outline'}
              onClick={() => setFiltro('todas')}
              className="border-2"
              style={filtro === 'todas' ? { background: '#6F42C1', color: '#FFFFFF' } : {}}
            >
              Todas
            </Button>
            <Button
              variant={filtro === 'no-leidas' ? 'default' : 'outline'}
              onClick={() => setFiltro('no-leidas')}
              className="border-2"
              style={filtro === 'no-leidas' ? { background: '#6F42C1', color: '#FFFFFF' } : {}}
            >
              No leídas ({noLeidas})
            </Button>
          </div>
        </div>
      </Card>

      {/* Lista de Notificaciones */}
      <div className="space-y-3">
        {notificacionesFiltradas.map((notif, index) => {
          const tipoStyle = getTipoStyle(notif.tipo);
          const categoriaColor = getCategoriaColor(notif.categoria);

          return (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <Card
                className={`p-4 border-2 transition-all hover:shadow-lg ${
                  !notif.leida ? 'ring-2 ring-purple-200' : ''
                }`}
                style={{
                  borderColor: !notif.leida ? '#6F42C1' : '#E5E7EB',
                  background: !notif.leida ? '#FDFCFF' : '#FFFFFF'
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Icono */}
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: tipoStyle.bg }}
                  >
                    <div style={{ color: tipoStyle.text }}>
                      {tipoStyle.icon}
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            className="text-xs font-bold"
                            style={{ background: tipoStyle.bg, color: tipoStyle.text }}
                          >
                            {notif.tipo}
                          </Badge>
                          <Badge
                            className="text-xs"
                            style={{ background: `${categoriaColor}20`, color: categoriaColor }}
                          >
                            {notif.categoria}
                          </Badge>
                          {notif.expediente && (
                            <Badge className="text-xs" style={{ background: '#F3E8FF', color: '#6F42C1' }}>
                              {notif.expediente}
                            </Badge>
                          )}
                          {!notif.leida && (
                            <Badge className="text-xs" style={{ background: '#6F42C1', color: '#FFFFFF' }}>
                              Nueva
                            </Badge>
                          )}
                        </div>
                        <p className="font-bold mb-1" style={{ color: '#1F2937' }}>
                          {notif.titulo}
                        </p>
                        <p className="text-sm mb-2" style={{ color: '#6B7280' }}>
                          {notif.mensaje}
                        </p>
                        <div className="flex items-center gap-3 text-xs" style={{ color: '#9CA3AF' }}>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(notif.fecha).toLocaleDateString('es-ES')} • {notif.hora}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Avatar className="w-4 h-4">
                              <AvatarFallback style={{ background: '#F3E8FF', color: '#6F42C1', fontSize: '8px' }}>
                                {notif.destinatario.split(' ').slice(0, 2).map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span>{notif.destinatario}</span>
                          </div>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex gap-2 ml-4">
                        {!notif.leida && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMarcarLeida(notif.id)}
                            title="Marcar como leída"
                          >
                            <Eye className="w-4 h-4" style={{ color: '#6F42C1' }} />
                          </Button>
                        )}
                        {notif.expediente && (
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Ver expediente"
                          >
                            <MessageSquare className="w-4 h-4" style={{ color: '#0284C7' }} />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEliminar(notif.id)}
                          title="Eliminar"
                        >
                          <X className="w-4 h-4" style={{ color: '#DC2626' }} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}

        {/* Empty State */}
        {notificacionesFiltradas.length === 0 && (
          <Card className="p-12 border-2 text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#F3E8FF' }}>
              <CheckCircle className="w-8 h-8" style={{ color: '#6F42C1' }} />
            </div>
            <p className="font-bold text-lg mb-2" style={{ color: '#1F2937' }}>
              ¡Todo al día!
            </p>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              No tienes notificaciones pendientes
            </p>
          </Card>
        )}
      </div>

      {/* Configuración de Alertas */}
      <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
        <h3 className="font-bold text-lg mb-4" style={{ color: '#1F2937' }}>
          Configuración de Alertas Automáticas
        </h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
            <div className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-5 h-5" style={{ accentColor: '#6F42C1' }} />
              <div>
                <p className="font-medium text-sm" style={{ color: '#1F2937' }}>
                  Alertas de prescripción crítica
                </p>
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  Cuando un expediente tenga menos de 90 días para prescribir
                </p>
              </div>
            </div>
            <Badge style={{ background: '#FEE2E2', color: '#991B1B' }}>
              Urgente
            </Badge>
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
            <div className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-5 h-5" style={{ accentColor: '#6F42C1' }} />
              <div>
                <p className="font-medium text-sm" style={{ color: '#1F2937' }}>
                  Recordatorios de audiencias
                </p>
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  24 horas antes de cada audiencia programada
                </p>
              </div>
            </div>
            <Badge style={{ background: '#E0F2FE', color: '#075985' }}>
              Alta
            </Badge>
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
            <div className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-5 h-5" style={{ accentColor: '#6F42C1' }} />
              <div>
                <p className="font-medium text-sm" style={{ color: '#1F2937' }}>
                  Términos procesales próximos a vencer
                </p>
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  3 días antes del vencimiento de términos
                </p>
              </div>
            </div>
            <Badge style={{ background: '#FEF3C7', color: '#92400E' }}>
              Media
            </Badge>
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
            <div className="flex items-center gap-3">
              <input type="checkbox" className="w-5 h-5" style={{ accentColor: '#6F42C1' }} />
              <div>
                <p className="font-medium text-sm" style={{ color: '#1F2937' }}>
                  Notificaciones de sistema
                </p>
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  Actualizaciones y cambios en el módulo
                </p>
              </div>
            </div>
            <Badge style={{ background: '#F3F4F6', color: '#6B7280' }}>
              Baja
            </Badge>
          </label>
        </div>
      </Card>
    </div>
  );
}
