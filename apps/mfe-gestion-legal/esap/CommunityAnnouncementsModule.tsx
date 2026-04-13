import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  Calendar,
  Eye,
  Bell,
  Edit,
  Trash2,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  TrendingUp,
  FileText,
  Send,
  Lightbulb,
  Zap,
} from 'lucide-react';
import { Card, CardContent } from '@esap-mfe/shared-ui/card';
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

export function CommunityAnnouncementsModule() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showTip, setShowTip] = usePersistentTip('tip_convocatorias', true);

  // Convocatorias de ejemplo
  const announcements = [
    {
      id: 1,
      title: 'Convocatoria Docente - Administración Pública',
      description: 'Se requiere docente con maestría en Administración Pública para dictado de cursos de pregrado. Contrato por 6 meses.',
      category: 'Docencia',
      deadline: '30 Nov 2025',
      image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&h=300&fit=crop',
      priority: 'high',
      status: 'active',
      views: 1234,
      applicants: 45,
      department: 'Facultad de Administración',
      publishedDate: 'Hace 2 días',
    },
    {
      id: 2,
      title: 'Becas de Investigación 2025',
      description: 'Apoyo económico para proyectos de investigación en gestión pública. Hasta $10.000.000 por proyecto.',
      category: 'Investigación',
      deadline: '15 Dic 2025',
      image: 'https://images.unsplash.com/photo-1532619675605-1ede6c2ed2b0?w=600&h=300&fit=crop',
      priority: 'high',
      status: 'active',
      views: 2156,
      applicants: 78,
      department: 'Dirección de Investigación',
      publishedDate: 'Hace 1 semana',
    },
    {
      id: 3,
      title: 'Convocatoria Movilidad Académica Internacional',
      description: 'Intercambio con universidades de España y Portugal. Cupos limitados para estudiantes destacados.',
      category: 'Movilidad',
      deadline: '5 Dic 2025',
      image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=300&fit=crop',
      priority: 'medium',
      status: 'active',
      views: 3421,
      applicants: 123,
      department: 'Relaciones Internacionales',
      publishedDate: 'Hace 3 días',
    },
    {
      id: 4,
      title: 'Auxiliares de Investigación - GovTech',
      description: 'Buscamos estudiantes para apoyar proyecto de transformación digital del Estado.',
      category: 'Auxiliar',
      deadline: '20 Nov 2025',
      image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=300&fit=crop',
      priority: 'medium',
      status: 'active',
      views: 987,
      applicants: 34,
      department: 'Centro de Innovación',
      publishedDate: 'Hace 5 días',
    },
    {
      id: 5,
      title: 'Convocatoria Práctica DNP',
      description: 'Prácticas profesionales en el Departamento Nacional de Planeación. 6 meses de duración.',
      category: 'Prácticas',
      deadline: '25 Oct 2025',
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=300&fit=crop',
      priority: 'low',
      status: 'closed',
      views: 4532,
      applicants: 234,
      department: 'Dirección de Prácticas',
      publishedDate: 'Hace 1 mes',
    },
  ];

  // Stats
  const stats: StatCardData[] = [
    { 
      id: 'active-announcements',
      title: 'Convocatorias Activas', 
      value: 8, 
      icon: Megaphone, 
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
      lightBg: '#EFF6FF',
      iconColor: '#3B82F6',
      description: 'En curso actualmente',
      change: '+2',
      trend: 'up' as const,
    },
    { 
      id: 'total-applications',
      title: 'Total Postulaciones', 
      value: 514, 
      icon: Users, 
      gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      lightBg: '#D1FAE5',
      iconColor: '#10B981',
      description: 'Postulantes registrados',
      change: '+45',
      trend: 'up' as const,
    },
    { 
      id: 'closed-month',
      title: 'Cerradas Este Mes', 
      value: 3, 
      icon: CheckCircle, 
      gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
      lightBg: '#EDE9FE',
      iconColor: '#8B5CF6',
      description: 'Finalizadas en el mes',
      change: '100%',
      trend: 'neutral' as const,
    },
    { 
      id: 'avg-applicants',
      title: 'Promedio Postulantes', 
      value: 64, 
      icon: TrendingUp, 
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      lightBg: '#FEF3C7',
      iconColor: '#F59E0B',
      description: 'Por convocatoria',
      change: '+12%',
      trend: 'up' as const,
    },
  ];

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      high: { label: 'Alta', className: 'bg-red-100 text-red-700' },
      medium: { label: 'Media', className: 'bg-yellow-100 text-yellow-700' },
      low: { label: 'Baja', className: 'bg-green-100 text-green-700' },
    };
    const config = priorityConfig[priority as keyof typeof priorityConfig];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Activa', className: 'bg-green-100 text-green-700' },
      closed: { label: 'Cerrada', className: 'bg-gray-100 text-gray-700' },
      draft: { label: 'Borrador', className: 'bg-blue-100 text-blue-700' },
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const handleModerateAnnouncement = (announcementId: number, action: string) => {
    toast.success(`Convocatoria ${action}`, {
      description: `La convocatoria #${announcementId} ha sido ${action} exitosamente.`,
    });
  };

  const renderAnnouncement = (announcement: typeof announcements[0]) => (
    <Card key={announcement.id} className="overflow-hidden hover:shadow-lg transition-all">
      <div className="relative h-40">
        <ImageWithFallback
          src={announcement.image}
          alt={announcement.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge className="bg-white/90 backdrop-blur-sm text-gray-900">
            {announcement.category}
          </Badge>
          {getPriorityBadge(announcement.priority)}
          {getStatusBadge(announcement.status)}
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
            <DropdownMenuItem onClick={() => handleModerateAnnouncement(announcement.id, 'editada')}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleModerateAnnouncement(announcement.id, 'publicada')}>
              <Send className="w-4 h-4 mr-2" />
              Publicar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => handleModerateAnnouncement(announcement.id, 'eliminada')}
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
          {announcement.title}
        </h3>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{announcement.description}</p>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4 text-[#1e5da8]" />
            <span>Cierre: {announcement.deadline}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileText className="w-4 h-4 text-[#1e5da8]" />
            <span>{announcement.department}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4 text-[#1e5da8]" />
            <span>{announcement.applicants} postulantes</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>{announcement.publishedDate}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm pt-3 border-t">
          <div className="flex items-center gap-1 text-gray-600">
            <Eye className="w-4 h-4" />
            <span>{announcement.views} vistas</span>
          </div>
          <Button size="sm" variant="outline" className="gap-2">
            <Bell className="w-3 h-3" />
            Ver postulantes
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const expiringSoonCount = announcements.filter(a => {
    // Mock logic: announcements expiring in less than 7 days
    return a.status === 'active' && a.priority === 'high';
  }).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Contextual Tip */}
      <AnimatePresence>
        {showTip && expiringSoonCount > 0 && (
          <InlineTip
            title="⚡ Convocatorias por Vencer"
            message={`Tienes ${expiringSoonCount} convocatorias de alta prioridad activas. El sistema las cierra automáticamente al vencer la fecha límite.`}
            variant="warning"
            icon={<Zap className="w-5 h-5" />}
            dismissible={true}
            onDismiss={() => setShowTip(false)}
          />
        )}
        {showTip && expiringSoonCount === 0 && (
          <InlineTip
            title="📢 Gestión de Convocatorias"
            message="Publica convocatorias destacadas en el Portal. Los usuarios reciben notificaciones y pueden postularse directamente desde su dashboard."
            variant="success"
            icon={<Lightbulb className="w-5 h-5" />}
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
              <Megaphone className="w-7 h-7 text-[#1e5da8]" />
            </div>
            Gestión de Convocatorias
          </h2>
          <p className="text-gray-600 mt-1">
            Administra convocatorias y anuncios oficiales
          </p>
        </div>
        <Button className="gap-2 bg-[#1e5da8] hover:bg-[#174a8a]">
          <Plus className="w-4 h-4" />
          Nueva Convocatoria
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
                placeholder="Buscar convocatorias por título, categoría o departamento..."
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

      {/* Grid de convocatorias o Empty State */}
      {announcements.length === 0 ? (
        <EmptyStatePremium
          type={searchQuery ? 'no-search' : 'no-announcements'}
          title={searchQuery ? 'No se encontraron convocatorias' : '¡Aún no hay convocatorias!'}
          description={searchQuery
            ? 'No hay convocatorias que coincidan con tu búsqueda. Intenta con otros términos.'
            : 'Las convocatorias oficiales aparecerán aquí. Publica becas, oportunidades de empleo, o anuncios importantes para la comunidad.'}
          actionLabel={searchQuery ? undefined : 'Crear Primera Convocatoria'}
          onAction={searchQuery ? undefined : () => toast.info('Abriendo formulario de convocatoria...')}
          secondaryActionLabel={searchQuery ? 'Limpiar búsqueda' : undefined}
          onSecondaryAction={searchQuery ? () => {
            setSearchQuery('');
            toast.success('Búsqueda limpiada');
          } : undefined}
          tips={[
            'Las convocatorias se cierran automáticamente al vencer',
            'Puedes establecer prioridades (alta, media, baja)',
            'Los postulantes reciben notificaciones en tiempo real',
            'Exporta la lista de aplicantes en cualquier momento'
          ]}
          showTips={true}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {announcements.map(renderAnnouncement)}
        </div>
      )}
    </motion.div>
  );
}
