import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Plus,
  Search,
  Filter,
  MapPin,
  Users,
  Clock,
  Eye,
  Heart,
  Share2,
  Edit,
  Trash2,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Lightbulb,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@esap-mfe/shared-ui/card';
import { Button } from '@esap-mfe/shared-ui/button';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Input } from '@esap-mfe/shared-ui/input';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@esap-mfe/shared-ui/dropdown-menu';
import { toast } from 'sonner';
import { UnifiedStatsCards, StatCardData } from './UnifiedStatsCards';
import { InlineTip } from '../shared/InlineTip';
import { EmptyStatePremium } from './EmptyStatesPremium';
import { usePersistentTip } from '../../hooks';

export function CommunityEventsModule() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showTip, setShowTip] = usePersistentTip('tip_eventos', true);

  // Eventos de ejemplo
  const events = [
    {
      id: 1,
      title: 'Feria de Empleo ESAP 2025',
      description: 'Más de 40 empresas del sector público y privado buscan talento ESAP.',
      date: '25 Nov 2025',
      time: '8:00 AM - 5:00 PM',
      location: 'Campus Principal ESAP',
      image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&h=300&fit=crop',
      category: 'Empleo',
      attendees: 456,
      capacity: 500,
      views: 2345,
      likes: 234,
      status: 'upcoming',
      organizer: 'Dirección de Bienestar',
    },
    {
      id: 2,
      title: 'Hackathon: GovTech Challenge',
      description: 'Resuelve desafíos reales del sector público con tecnología.',
      date: '2-4 Dic 2025',
      time: '48 horas continuas',
      location: 'Auditorio Principal + Virtual',
      image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&h=300&fit=crop',
      category: 'Tecnología',
      attendees: 89,
      capacity: 100,
      views: 1234,
      likes: 156,
      status: 'upcoming',
      organizer: 'Centro de Innovación',
    },
    {
      id: 3,
      title: 'Charla: Liderazgo en el Sector Público',
      description: 'Conversatorio con directivos de alto nivel.',
      date: '18 Nov 2025',
      time: '4:00 PM - 6:00 PM',
      location: 'Virtual - Teams',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=300&fit=crop',
      category: 'Liderazgo',
      attendees: 234,
      capacity: 300,
      views: 867,
      likes: 123,
      status: 'upcoming',
      organizer: 'Rectoría',
    },
    {
      id: 4,
      title: 'Seminario de Políticas Públicas',
      description: 'Análisis de casos exitosos en América Latina.',
      date: '10 Nov 2025',
      time: '9:00 AM - 1:00 PM',
      location: 'Auditorio Principal',
      image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&h=300&fit=crop',
      category: 'Académico',
      attendees: 187,
      capacity: 200,
      views: 654,
      likes: 98,
      status: 'completed',
      organizer: 'Facultad de Administración',
    },
  ];

  // Stats
  const stats: StatCardData[] = [
    { 
      id: 'active-events',
      title: 'Eventos Activos', 
      value: 12, 
      icon: Calendar, 
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
      lightBg: '#EFF6FF',
      iconColor: '#3B82F6',
      description: 'Eventos en curso',
      change: '+3',
      trend: 'up' as const,
    },
    { 
      id: 'total-attendees',
      title: 'Total Asistentes', 
      value: 966, 
      icon: Users, 
      gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      lightBg: '#D1FAE5',
      iconColor: '#10B981',
      description: 'Participantes registrados',
      change: '+15%',
      trend: 'up' as const,
    },
    { 
      id: 'completed',
      title: 'Completados', 
      value: 8, 
      icon: CheckCircle, 
      gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
      lightBg: '#EDE9FE',
      iconColor: '#8B5CF6',
      description: 'Finalizados este mes',
      change: '100%',
      trend: 'neutral' as const,
    },
    { 
      id: 'attendance',
      title: 'Promedio Asistencia', 
      value: 78, 
      suffix: '%',
      icon: TrendingUp, 
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      lightBg: '#FEF3C7',
      iconColor: '#F59E0B',
      description: 'Tasa de asistencia',
      change: '+5%',
      trend: 'up' as const,
    },
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      upcoming: { label: 'Próximo', className: 'bg-blue-100 text-blue-700' },
      ongoing: { label: 'En curso', className: 'bg-green-100 text-green-700' },
      completed: { label: 'Completado', className: 'bg-gray-100 text-gray-700' },
      cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-700' },
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const handleModerateEvent = (eventId: number, action: string) => {
    toast.success(`Evento ${action}`, {
      description: `El evento #${eventId} ha sido ${action} exitosamente.`,
    });
  };

  const renderEvent = (event: typeof events[0]) => (
    <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-all">
      <div className="relative h-48">
        <ImageWithFallback
          src={event.image}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge className="bg-white/90 backdrop-blur-sm text-gray-900">
            {event.category}
          </Badge>
          {getStatusBadge(event.status)}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm hover:bg-white"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleModerateEvent(event.id, 'editado')}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => handleModerateEvent(event.id, 'cancelado')}
              className="text-red-600"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancelar
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleModerateEvent(event.id, 'eliminado')}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CardContent className="p-5">
        <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">
          {event.title}
        </h3>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{event.description}</p>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4 text-[#1e5da8]" />
            <span>{event.date}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4 text-[#1e5da8]" />
            <span>{event.time}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-[#1e5da8]" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4 text-[#1e5da8]" />
            <span>{event.attendees}/{event.capacity} registrados</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Capacidad</span>
            <span>{Math.round((event.attendees / event.capacity) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-[#1e5da8] h-2 rounded-full transition-all"
              style={{ width: `${(event.attendees / event.capacity) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-gray-600">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{event.views}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              <span>{event.likes}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Por: {event.organizer}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const upcomingEventsCount = events.filter(e => e.status === 'upcoming').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Contextual Tip */}
      <AnimatePresence>
        {showTip && upcomingEventsCount > 0 && (
          <InlineTip
            title="📅 Próximos Eventos"
            message={`Tienes ${upcomingEventsCount} eventos próximos. Los asistentes reciben notificaciones automáticas 24h antes del evento.`}
            variant="info"
            icon={<Calendar className="w-5 h-5" />}
            dismissible={true}
            onDismiss={() => setShowTip(false)}
          />
        )}
        {showTip && upcomingEventsCount === 0 && (
          <InlineTip
            title="✨ Gestión de Eventos ESAP"
            message="Crea eventos para conectar a la comunidad. Los eventos se sincronizan con calendarios y notifican automáticamente a los interesados."
            variant="success"
            icon={<Sparkles className="w-5 h-5" />}
            dismissible={true}
            onDismiss={() => setShowTip(false)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-[#1e5da8]/10 rounded-lg">
              <Calendar className="w-7 h-7 text-[#1e5da8]" />
            </div>
            Gestión de Eventos
          </h2>
          <p className="text-gray-600 mt-1">
            Administra eventos y actividades de la comunidad
          </p>
        </div>
        <Button className="gap-2 bg-[#1e5da8] hover:bg-[#174a8a]">
          <Plus className="w-4 h-4" />
          Crear Evento
        </Button>
      </div>

      {/* Stats */}
      <UnifiedStatsCards stats={stats} columns={4} />

      {/* Búsqueda y filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar eventos por título, categoría o ubicación..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid de eventos o Empty State */}
      {events.length === 0 ? (
        <EmptyStatePremium
          type={searchQuery ? 'no-search' : 'no-events'}
          title={searchQuery ? 'No se encontraron eventos' : '¡Aún no hay eventos!'}
          description={searchQuery
            ? 'No hay eventos que coincidan con tu búsqueda. Intenta con otros términos.'
            : 'Los eventos de la comunidad aparecerán aquí. Crea el primer evento para conectar a la comunidad ESAP.'}
          actionLabel={searchQuery ? undefined : 'Crear Primer Evento'}
          onAction={searchQuery ? undefined : () => toast.info('Abriendo formulario de evento...')}
          secondaryActionLabel={searchQuery ? 'Limpiar búsqueda' : undefined}
          onSecondaryAction={searchQuery ? () => {
            setSearchQuery('');
            toast.success('Búsqueda limpiada');
          } : undefined}
          tips={[
            'Los eventos se sincronizan automáticamente con calendarios',
            'Puedes limitar la capacidad de asistentes por evento',
            'Las notificaciones llegan 24h antes del evento',
            'Exporta la lista de asistentes confirmados a Excel'
          ]}
          showTips={true}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(renderEvent)}
        </div>
      )}
    </motion.div>
  );
}
