import { useState } from 'react';
import { Bell, Check, AlertTriangle, Info, FileText, X } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface NotificacionesPanelProps {
  className?: string;
}

interface Notificacion {
  id: string;
  tipo: 'Alerta' | 'Info' | 'Acción Requerida' | 'Sistema';
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
  link?: string;
}

export function NotificacionesPanel({ className = '' }: NotificacionesPanelProps) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([
    {
      id: '1',
      tipo: 'Alerta',
      titulo: 'Conflicto de horario detectado',
      mensaje: 'Se detectó un cruce de horario para Juan Torres',
      fecha: '2025-02-20 10:30',
      leida: false,
      link: '/conflictos/1'
    },
    {
      id: '2',
      tipo: 'Acción Requerida',
      titulo: 'PTA pendiente de revisión',
      mensaje: '3 PTAs están esperando tu revisión',
      fecha: '2025-02-20 09:15',
      leida: false,
      link: '/ptas/revision'
    },
    {
      id: '3',
      tipo: 'Info',
      titulo: 'Evaluación docente iniciada',
      mensaje: 'El periodo de evaluación 2025-I ha comenzado',
      fecha: '2025-02-19 08:00',
      leida: true
    },
    {
      id: '4',
      tipo: 'Sistema',
      titulo: 'Actualización del sistema',
      mensaje: 'Nueva versión disponible con mejoras',
      fecha: '2025-02-18 14:00',
      leida: true
    }
  ]);

  const marcarComoLeida = (id: string) => {
    setNotificaciones(notificaciones.map(n => 
      n.id === id ? { ...n, leida: true } : n
    ));
  };

  const getTipoIcon = (tipo: Notificacion['tipo']) => {
    switch (tipo) {
      case 'Alerta': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'Acción Requerida': return <FileText className="w-5 h-5 text-amber-600" />;
      case 'Info': return <Info className="w-5 h-5 text-blue-600" />;
      case 'Sistema': return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTipoColor = (tipo: Notificacion['tipo']) => {
    switch (tipo) {
      case 'Alerta': return 'bg-red-100 text-red-700';
      case 'Acción Requerida': return 'bg-amber-100 text-amber-700';
      case 'Info': return 'bg-blue-100 text-blue-700';
      case 'Sistema': return 'bg-gray-100 text-gray-700';
    }
  };

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
          <p className="text-gray-600 mt-1">{noLeidas} sin leer</p>
        </div>
        <Button size="sm" variant="outline">Marcar todas como leídas</Button>
      </div>

      <div className="space-y-3">
        {notificaciones.map((notif) => (
          <Card
            key={notif.id}
            className={`p-6 ${!notif.leida ? 'border-l-4 border-l-[#1e5da8] bg-blue-50' : ''}`}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-1">{getTipoIcon(notif.tipo)}</div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900">{notif.titulo}</h3>
                    <Badge className={getTipoColor(notif.tipo)}>{notif.tipo}</Badge>
                  </div>
                  {!notif.leida && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => marcarComoLeida(notif.id)}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-gray-700 mb-2">{notif.mensaje}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{notif.fecha}</span>
                  {notif.link && (
                    <Button size="sm" variant="link" className="text-[#1e5da8]">
                      Ver detalles →
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
