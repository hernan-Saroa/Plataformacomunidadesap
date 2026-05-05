/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * MÓDULO DE ANUNCIOS OFICIALES - VERSIÓN UNIFICADA
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * DÍA 4 - FASE 1: UNIFICACIÓN COMPLETADA ✅
 * 
 * CARACTERÍSTICAS PRINCIPALES:
 * - ✅ Usa CommunityAnnouncementsService (API unificada)
 * - ✅ Tipos TypeScript desde community.types.ts
 * - ✅ Sistema de marcado de lectura por usuario
 * - ✅ Filtros avanzados (tipo, prioridad, vigencia, alcance)
 * - ✅ Notificaciones de anuncios urgentes
 * - ✅ Visualización de vigencia y vencimiento
 * - ✅ Paginación funcional
 * - ✅ Sincronización bidireccional Portal/Backoffice
 * 
 * CONSUMIDO POR:
 * - Portal Transaccional (Estudiantes, Docentes, Graduados)
 * - Backoffice Administrativo (Administradores de Comunicaciones)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Megaphone,
  Bell,
  AlertTriangle,
  Info,
  FileText,
  Calendar,
  Clock,
  Eye,
  EyeOff,
  Check,
  X,
  Plus,
  Search,
  Filter,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Download,
  ExternalLink,
  Pin,
  Award,
  Building2,
  Users,
  TrendingUp,
  Sparkles,
  ChevronRight,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Share2,
  Archive,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from 'sonner';
import { UnifiedStatsCards, StatCardData } from './UnifiedStatsCards';
import { InlineTip } from '../shared/InlineTip';
import { EmptyStatePremium } from './EmptyStatesPremium';
import { usePersistentTip } from '../../hooks';

// ✅ IMPORTAR SERVICIO UNIFICADO Y TIPOS
import { CommunityAnnouncementsService, CommunityStatsService } from '../../lib/services/communityService';
import type { CommunityAnnouncement, AnnouncementFilters } from '../../types/community.types';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROPS DEL COMPONENTE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface CommunityAnnouncementsModuleProps {
  userRole?: 'Estudiante' | 'Docente' | 'Administrativo' | 'Graduado';
  userId?: string;
  canManageAnnouncements?: boolean; // true para administradores de comunicaciones
}

export function CommunityAnnouncementsModuleUnified({ 
  userRole = 'Estudiante',
  userId = 'user-current',
  canManageAnnouncements = false 
}: CommunityAnnouncementsModuleProps) {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ESTADO
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  const [announcements, setAnnouncements] = useState<CommunityAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAnnouncements, setTotalAnnouncements] = useState(0);
  const pageSize = 12;
  
  // Filtros
  const [filters, setFilters] = useState<AnnouncementFilters>({
    solo_vigentes: true // Por defecto, solo anuncios vigentes
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Estadísticas
  const [stats, setStats] = useState<StatCardData[]>([]);
  
  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<CommunityAnnouncement | null>(null);
  
  // Anuncios leídos por el usuario (en producción vendría del backend)
  const [readAnnouncements, setReadAnnouncements] = useState<Set<string>>(new Set());
  
  // Anuncios urgentes no leídos
  const [urgentUnread, setUrgentUnread] = useState<CommunityAnnouncement[]>([]);
  const [showUrgentBanner, setShowUrgentBanner] = useState(true);
  
  // Tips persistentes
  const { showTip: showFilterTip, dismissTip: dismissFilterTip } = usePersistentTip('community-announcements-filters');
  const { showTip: showReadTip, dismissTip: dismissReadTip } = usePersistentTip('community-announcements-read');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // EFECTOS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // Cargar anuncios al montar y cuando cambien filtros/página
  useEffect(() => {
    loadAnnouncements();
  }, [currentPage, filters]);

  // Cargar estadísticas
  useEffect(() => {
    loadStats();
  }, []);

  // Detectar anuncios urgentes no leídos
  useEffect(() => {
    const urgent = announcements.filter(a => 
      a.prioridad === 'Urgente' && 
      a.estado === 'Publicado' &&
      !readAnnouncements.has(a.id)
    );
    setUrgentUnread(urgent);
  }, [announcements, readAnnouncements]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FUNCIONES DE CARGA DE DATOS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const loadAnnouncements = async () => {
    try {
      setLoading(currentPage === 1);
      setError(null);
      
      const response = await CommunityAnnouncementsService.getAnnouncements(filters, currentPage, pageSize);
      
      setAnnouncements(response.data);
      setTotalPages(response.totalPages);
      setTotalAnnouncements(response.total);
      
    } catch (err) {
      setError('Error al cargar anuncios. Por favor, intenta nuevamente.');
      console.error('Error loading announcements:', err);
      toast.error('Error al cargar anuncios');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await CommunityStatsService.getStats();
      
      if (response.success && response.data) {
        const announcementStats = response.data.anuncios;
        
        const statsData: StatCardData[] = [
          {
            label: 'Anuncios Activos',
            value: announcementStats.activos,
            icon: Megaphone,
            trend: 'up',
            trendValue: '+5%',
            color: '#003DA5',
          },
          {
            label: 'Urgentes',
            value: announcementStats.urgentes,
            icon: AlertTriangle,
            color: '#DC2626',
          },
          {
            label: 'Vencidos',
            value: announcementStats.vencidos,
            icon: Clock,
            color: '#6B7280',
          },
          {
            label: 'Total Anuncios',
            value: announcementStats.total,
            icon: FileText,
            color: '#6B46C1',
          },
        ];
        
        setStats(statsData);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnnouncements();
    await loadStats();
    toast.success('Anuncios actualizados');
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FUNCIONES DE ACCIONES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleMarkAsRead = (announcementId: string) => {
    // En producción, esto llamaría a una API
    setReadAnnouncements(prev => new Set(prev).add(announcementId));
    
    // Actualizar contador de vistas (simulado)
    setAnnouncements(announcements.map(a => 
      a.id === announcementId 
        ? { ...a, vistas: a.vistas + 1 }
        : a
    ));
  };

  const handleMarkAsUnread = (announcementId: string) => {
    const newReadSet = new Set(readAnnouncements);
    newReadSet.delete(announcementId);
    setReadAnnouncements(newReadSet);
  };

  const handleViewAnnouncement = (announcement: CommunityAnnouncement) => {
    setSelectedAnnouncement(announcement);
    setShowDetailModal(true);
    
    // Marcar como leído automáticamente al abrir
    if (!readAnnouncements.has(announcement.id)) {
      handleMarkAsRead(announcement.id);
    }
  };

  const handleSearch = () => {
    setFilters(prev => ({
      ...prev,
      busqueda: searchQuery
    }));
    setCurrentPage(1);
  };

  const handleFilterChange = (key: keyof AnnouncementFilters, value: string | boolean | undefined) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (value !== undefined && value !== '') {
        newFilters[key] = value as any;
      } else {
        delete newFilters[key];
      }
      return newFilters;
    });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ solo_vigentes: true });
    setSearchQuery('');
    setCurrentPage(1);
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // UTILIDADES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getTypeIcon = (tipo: string) => {
    switch (tipo) {
      case 'Convocatoria': return Megaphone;
      case 'Comunicado': return FileText;
      case 'Aviso': return Bell;
      case 'Norma': return Award;
      case 'Evento': return Calendar;
      case 'Académico': return FileText;
      default: return Info;
    }
  };

  const getTypeColor = (tipo: string) => {
    switch (tipo) {
      case 'Convocatoria': return 'bg-blue-100 text-blue-700';
      case 'Comunicado': return 'bg-green-100 text-green-700';
      case 'Aviso': return 'bg-yellow-100 text-yellow-700';
      case 'Norma': return 'bg-purple-100 text-purple-700';
      case 'Evento': return 'bg-pink-100 text-pink-700';
      case 'Académico': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityBadge = (prioridad: string) => {
    switch (prioridad) {
      case 'Urgente':
        return (
          <Badge className="bg-red-600 text-white animate-pulse">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Urgente
          </Badge>
        );
      case 'Alta':
        return (
          <Badge className="bg-orange-600 text-white">
            <AlertCircle className="w-3 h-3 mr-1" />
            Alta
          </Badge>
        );
      case 'Media':
        return (
          <Badge className="bg-yellow-600 text-white">
            Media
          </Badge>
        );
      case 'Baja':
        return (
          <Badge variant="secondary">
            Baja
          </Badge>
        );
      default:
        return null;
    }
  };

  const getVigenciaStatus = (announcement: CommunityAnnouncement) => {
    if (announcement.es_permanente) {
      return { color: 'green', label: 'Permanente', icon: CheckCircle };
    }

    if (!announcement.fecha_vigencia_fin) {
      return { color: 'gray', label: 'Sin fecha límite', icon: Info };
    }

    const now = new Date();
    const fin = new Date(announcement.fecha_vigencia_fin);
    const diffDays = Math.ceil((fin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { color: 'red', label: 'Vencido', icon: X };
    } else if (diffDays === 0) {
      return { color: 'orange', label: 'Vence hoy', icon: AlertTriangle };
    } else if (diffDays <= 7) {
      return { color: 'yellow', label: `Vence en ${diffDays} día${diffDays > 1 ? 's' : ''}`, icon: Clock };
    } else {
      return { color: 'green', label: `Vigente hasta ${formatDate(announcement.fecha_vigencia_fin)}`, icon: CheckCircle };
    }
  };

  const isAnnouncementExpired = (announcement: CommunityAnnouncement) => {
    if (announcement.es_permanente) return false;
    if (!announcement.fecha_vigencia_fin) return false;
    return new Date(announcement.fecha_vigencia_fin) < new Date();
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDERIZADO
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const activeFiltersCount = Object.keys(filters).filter(key => 
    key !== 'busqueda' && key !== 'solo_vigentes'
  ).length;

  return (
    <div className="w-full space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* BANNER DE ANUNCIOS URGENTES */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {urgentUnread.length > 0 && showUrgentBanner && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <Card className="border-red-500 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 animate-pulse" />
                <div className="flex-1">
                  <h3 className="text-red-900 mb-1">
                    {urgentUnread.length} anuncio{urgentUnread.length > 1 ? 's' : ''} urgente{urgentUnread.length > 1 ? 's' : ''} sin leer
                  </h3>
                  <p className="text-sm text-red-700 mb-3">
                    Tienes anuncios importantes que requieren tu atención inmediata
                  </p>
                  <div className="flex gap-2">
                    {urgentUnread.slice(0, 2).map(announcement => (
                      <Button
                        key={announcement.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewAnnouncement(announcement)}
                        className="border-red-300 hover:bg-red-100"
                      >
                        Ver: {announcement.titulo.slice(0, 30)}...
                      </Button>
                    ))}
                    {urgentUnread.length > 2 && (
                      <span className="text-sm text-red-700 self-center">
                        +{urgentUnread.length - 2} más
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUrgentBanner(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* HEADER CON TÍTULO Y ACCIONES */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl">Anuncios Oficiales</h1>
          <p className="text-gray-600">
            {totalAnnouncements} anuncio{totalAnnouncements !== 1 ? 's' : ''} disponible{totalAnnouncements !== 1 ? 's' : ''}
            {' • '}
            {announcements.filter(a => !readAnnouncements.has(a.id)).length} sin leer
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          {canManageAnnouncements && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#003DA5] hover:bg-[#002d7a]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Anuncio
            </Button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ESTADÍSTICAS */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {stats.length > 0 && (
        <UnifiedStatsCards stats={stats} />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Barra de búsqueda */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar anuncios por título o contenido..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch}>
                Buscar
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge className="ml-2 bg-[#003DA5]">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Tip de filtros */}
            {showFilterTip && (
              <InlineTip
                type="info"
                message="Usa los filtros para encontrar anuncios por tipo, prioridad o vigencia"
                onDismiss={dismissFilterTip}
              />
            )}

            {/* Panel de filtros expandible */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 border-t">
                    <div>
                      <label className="text-sm mb-2 block">Tipo</label>
                      <Select
                        value={filters.tipo || ''}
                        onValueChange={(value) => handleFilterChange('tipo', value || undefined)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Todos</SelectItem>
                          <SelectItem value="Convocatoria">Convocatoria</SelectItem>
                          <SelectItem value="Comunicado">Comunicado</SelectItem>
                          <SelectItem value="Aviso">Aviso</SelectItem>
                          <SelectItem value="Norma">Norma</SelectItem>
                          <SelectItem value="Evento">Evento</SelectItem>
                          <SelectItem value="Académico">Académico</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm mb-2 block">Prioridad</label>
                      <Select
                        value={filters.prioridad || ''}
                        onValueChange={(value) => handleFilterChange('prioridad', value || undefined)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Todas</SelectItem>
                          <SelectItem value="Urgente">Urgente</SelectItem>
                          <SelectItem value="Alta">Alta</SelectItem>
                          <SelectItem value="Media">Media</SelectItem>
                          <SelectItem value="Baja">Baja</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm mb-2 block">Alcance</label>
                      <Select
                        value={filters.alcance || ''}
                        onValueChange={(value) => handleFilterChange('alcance', value || undefined)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Todos</SelectItem>
                          <SelectItem value="Nacional">Nacional</SelectItem>
                          <SelectItem value="Territorial">Territorial</SelectItem>
                          <SelectItem value="CETAP">CETAP</SelectItem>
                          <SelectItem value="Programa">Programa</SelectItem>
                          <SelectItem value="Facultad">Facultad</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm mb-2 block">Estado</label>
                      <Select
                        value={filters.estado || ''}
                        onValueChange={(value) => handleFilterChange('estado', value || undefined)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Todos</SelectItem>
                          <SelectItem value="Publicado">Publicado</SelectItem>
                          <SelectItem value="Borrador">Borrador</SelectItem>
                          <SelectItem value="Vencido">Vencido</SelectItem>
                          <SelectItem value="Archivado">Archivado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end gap-2">
                      <Button
                        variant="outline"
                        onClick={clearFilters}
                        className="flex-1"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Limpiar
                      </Button>
                    </div>
                  </div>

                  {/* Toggle solo vigentes */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <input
                      type="checkbox"
                      id="solo-vigentes"
                      checked={filters.solo_vigentes || false}
                      onChange={(e) => handleFilterChange('solo_vigentes', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="solo-vigentes" className="text-sm cursor-pointer">
                      Mostrar solo anuncios vigentes
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* CONTENIDO PRINCIPAL */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}

      {/* Estado de carga */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#003DA5]" />
        </div>
      )}

      {/* Estado de error */}
      {error && !loading && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-900">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadAnnouncements}
                  className="mt-3"
                >
                  Intentar nuevamente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de anuncios */}
      {!loading && !error && announcements.length === 0 && (
        <EmptyStatePremium
          icon={Megaphone}
          title="No hay anuncios disponibles"
          description={
            activeFiltersCount > 0
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Aún no se han publicado anuncios oficiales'
          }
          action={
            activeFiltersCount > 0 ? (
              <Button onClick={clearFilters} variant="outline">
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      )}

      {!loading && !error && announcements.length > 0 && (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {announcements.map((announcement, index) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                index={index}
                isRead={readAnnouncements.has(announcement.id)}
                onView={() => handleViewAnnouncement(announcement)}
                onMarkAsRead={() => handleMarkAsRead(announcement.id)}
                onMarkAsUnread={() => handleMarkAsUnread(announcement.id)}
                formatDate={formatDate}
                getTypeIcon={getTypeIcon}
                getTypeColor={getTypeColor}
                getPriorityBadge={getPriorityBadge}
                getVigenciaStatus={getVigenciaStatus}
                isAnnouncementExpired={isAnnouncementExpired}
                canManageAnnouncements={canManageAnnouncements}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* PAGINACIÓN */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </Button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (currentPage <= 3) {
                page = i + 1;
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={page}
                  variant={page === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={page === currentPage ? 'bg-[#003DA5]' : ''}
                >
                  {page}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL DE DETALLE DE ANUNCIO */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {selectedAnnouncement && (
        <AnnouncementDetailModal
          announcement={selectedAnnouncement}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedAnnouncement(null);
          }}
          isRead={readAnnouncements.has(selectedAnnouncement.id)}
          onMarkAsRead={() => handleMarkAsRead(selectedAnnouncement.id)}
          formatDate={formatDate}
          getTypeIcon={getTypeIcon}
          getTypeColor={getTypeColor}
          getPriorityBadge={getPriorityBadge}
          getVigenciaStatus={getVigenciaStatus}
        />
      )}

      {/* Tip de lectura */}
      {showReadTip && announcements.some(a => a.requiere_lectura) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 right-4 max-w-sm z-50"
        >
          <Card className="border-[#003DA5] shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-[#003DA5] flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm">
                    Algunos anuncios requieren confirmación de lectura. Haz clic para leerlos.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={dismissReadTip}
                    className="mt-2 h-auto p-0 text-xs"
                  >
                    Entendido
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPONENTE: TARJETA DE ANUNCIO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface AnnouncementCardProps {
  announcement: CommunityAnnouncement;
  index: number;
  isRead: boolean;
  onView: () => void;
  onMarkAsRead: () => void;
  onMarkAsUnread: () => void;
  formatDate: (date: string) => string;
  getTypeIcon: (tipo: string) => any;
  getTypeColor: (tipo: string) => string;
  getPriorityBadge: (prioridad: string) => React.ReactNode;
  getVigenciaStatus: (announcement: CommunityAnnouncement) => { color: string; label: string; icon: any };
  isAnnouncementExpired: (announcement: CommunityAnnouncement) => boolean;
  canManageAnnouncements: boolean;
}

function AnnouncementCard({
  announcement,
  index,
  isRead,
  onView,
  onMarkAsRead,
  onMarkAsUnread,
  formatDate,
  getTypeIcon,
  getTypeColor,
  getPriorityBadge,
  getVigenciaStatus,
  isAnnouncementExpired,
  canManageAnnouncements,
}: AnnouncementCardProps) {
  const TypeIcon = getTypeIcon(announcement.tipo);
  const vigenciaStatus = getVigenciaStatus(announcement);
  const VigenciaIcon = vigenciaStatus.icon;
  const isExpired = isAnnouncementExpired(announcement);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card 
        className={`hover:shadow-lg transition-all ${
          !isRead ? 'border-l-4 border-l-[#003DA5] bg-blue-50/50' : ''
        } ${isExpired ? 'opacity-75' : ''}`}
      >
        <CardContent className="p-6">
          <div className="flex gap-4">
            {/* Indicador visual de lectura */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isRead ? 'bg-gray-100' : 'bg-blue-100'
              }`}>
                <TypeIcon className={`w-5 h-5 ${isRead ? 'text-gray-600' : 'text-[#003DA5]'}`} />
              </div>
              {!isRead && announcement.requiere_lectura && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  <Eye className="w-3 h-3" />
                </Badge>
              )}
            </div>

            {/* Contenido principal */}
            <div className="flex-1 min-w-0">
              {/* Header con badges */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={getTypeColor(announcement.tipo)}>
                    <TypeIcon className="w-3 h-3 mr-1" />
                    {announcement.tipo}
                  </Badge>
                  {getPriorityBadge(announcement.prioridad)}
                  {announcement.aparece_en_inicio && (
                    <Badge className="bg-purple-100 text-purple-700">
                      <Pin className="w-3 h-3 mr-1" />
                      Destacado
                    </Badge>
                  )}
                  {isExpired && (
                    <Badge variant="secondary" className="bg-gray-200">
                      Vencido
                    </Badge>
                  )}
                </div>

                {canManageAnnouncements && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Share2 className="w-4 h-4 mr-2" />
                        Compartir
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Archive className="w-4 h-4 mr-2" />
                        Archivar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Título */}
              <h3 
                className={`mb-2 cursor-pointer hover:text-[#003DA5] transition-colors ${
                  !isRead ? '' : ''
                }`}
                onClick={onView}
              >
                {announcement.titulo}
              </h3>

              {/* Resumen o contenido */}
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {announcement.resumen || announcement.contenido}
              </p>

              {/* Metadata */}
              <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                <div className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  <span>{announcement.emisor_nombre}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(announcement.fecha_publicacion || announcement.fecha_creacion)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <VigenciaIcon className={`w-4 h-4 text-${vigenciaStatus.color}-600`} />
                  <span className={`text-${vigenciaStatus.color}-600`}>
                    {vigenciaStatus.label}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{announcement.vistas} vistas</span>
                </div>
              </div>

              {/* Alcance */}
              {announcement.alcance && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    Alcance: {announcement.alcance}
                  </Badge>
                </div>
              )}

              {/* Dirigido a */}
              {announcement.dirigido_a && announcement.dirigido_a.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <Users className="w-3 h-3 text-gray-500" />
                  <span className="text-xs text-gray-600">
                    Dirigido a: {announcement.dirigido_a.join(', ')}
                  </span>
                </div>
              )}

              <Separator className="my-3" />

              {/* Acciones */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onView}
                >
                  {isRead ? 'Ver detalles' : 'Leer anuncio'}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>

                {isRead ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onMarkAsUnread}
                  >
                    <EyeOff className="w-4 h-4 mr-2" />
                    Marcar como no leído
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onMarkAsRead}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Marcar como leído
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPONENTE: MODAL DE DETALLE DE ANUNCIO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface AnnouncementDetailModalProps {
  announcement: CommunityAnnouncement;
  isOpen: boolean;
  onClose: () => void;
  isRead: boolean;
  onMarkAsRead: () => void;
  formatDate: (date: string) => string;
  getTypeIcon: (tipo: string) => any;
  getTypeColor: (tipo: string) => string;
  getPriorityBadge: (prioridad: string) => React.ReactNode;
  getVigenciaStatus: (announcement: CommunityAnnouncement) => { color: string; label: string; icon: any };
}

function AnnouncementDetailModal({
  announcement,
  isOpen,
  onClose,
  isRead,
  onMarkAsRead,
  formatDate,
  getTypeIcon,
  getTypeColor,
  getPriorityBadge,
  getVigenciaStatus,
}: AnnouncementDetailModalProps) {
  const TypeIcon = getTypeIcon(announcement.tipo);
  const vigenciaStatus = getVigenciaStatus(announcement);
  const VigenciaIcon = vigenciaStatus.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl pr-8">{announcement.titulo}</DialogTitle>
          <DialogDescription>
            {announcement.emisor_nombre} • {announcement.emisor_dependencia}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Imagen de portada */}
          {announcement.imagen_portada && (
            <div className="relative h-64 -mx-6 -mt-2">
              <ImageWithFallback
                src={announcement.imagen_portada}
                alt={announcement.titulo}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Badges */}
          <div className="flex gap-2 flex-wrap">
            <Badge className={getTypeColor(announcement.tipo)}>
              <TypeIcon className="w-3 h-3 mr-1" />
              {announcement.tipo}
            </Badge>
            {getPriorityBadge(announcement.prioridad)}
            {announcement.aparece_en_inicio && (
              <Badge className="bg-purple-100 text-purple-700">
                <Pin className="w-3 h-3 mr-1" />
                Destacado en inicio
              </Badge>
            )}
            <Badge variant="outline" className="flex items-center gap-1">
              <VigenciaIcon className={`w-3 h-3 text-${vigenciaStatus.color}-600`} />
              <span className={`text-${vigenciaStatus.color}-600`}>
                {vigenciaStatus.label}
              </span>
            </Badge>
          </div>

          {/* Contenido principal */}
          <div>
            <h4 className="mb-3">Contenido del Anuncio</h4>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 whitespace-pre-line">
                {announcement.contenido}
              </p>
            </div>
          </div>

          <Separator />

          {/* Información adicional */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Vigencia */}
            <div>
              <h4 className="mb-3">Vigencia</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>Desde: {formatDate(announcement.fecha_vigencia_inicio)}</span>
                </div>
                {announcement.fecha_vigencia_fin && !announcement.es_permanente && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>Hasta: {formatDate(announcement.fecha_vigencia_fin)}</span>
                  </div>
                )}
                {announcement.es_permanente && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">Anuncio permanente</span>
                  </div>
                )}
              </div>
            </div>

            {/* Alcance y destinatarios */}
            <div>
              <h4 className="mb-3">Alcance</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-500" />
                  <span>Alcance: {announcement.alcance}</span>
                </div>
                {announcement.dirigido_a && announcement.dirigido_a.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-gray-600 mb-1">Dirigido a:</p>
                      <div className="flex gap-1 flex-wrap">
                        {announcement.dirigido_a.map((dest) => (
                          <Badge key={dest} variant="secondary" className="text-xs">
                            {dest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Archivos adjuntos */}
          {announcement.archivos && announcement.archivos.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="mb-3">Archivos Adjuntos ({announcement.archivos.length})</h4>
                <div className="space-y-2">
                  {announcement.archivos.map((archivo, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-gray-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">{archivo.nombre}</p>
                          <p className="text-xs text-gray-500">
                            {(archivo.tamano / 1024).toFixed(0)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a href={archivo.url} target="_blank" rel="noopener noreferrer">
                          <Download className="w-4 h-4" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Metadata */}
          <Separator />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <Eye className="w-5 h-5 mx-auto mb-1 text-gray-600" />
              <p className="text-xl">{announcement.vistas}</p>
              <p className="text-xs text-gray-600">Vistas</p>
            </div>
            <div>
              <Calendar className="w-5 h-5 mx-auto mb-1 text-gray-600" />
              <p className="text-sm">{formatDate(announcement.fecha_publicacion || announcement.fecha_creacion)}</p>
              <p className="text-xs text-gray-600">Publicado</p>
            </div>
            {announcement.aprobado_por && (
              <div>
                <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-600" />
                <p className="text-sm">Aprobado</p>
                <p className="text-xs text-gray-600">
                  {announcement.fecha_aprobacion && formatDate(announcement.fecha_aprobacion)}
                </p>
              </div>
            )}
            <div>
              <Info className="w-5 h-5 mx-auto mb-1 text-gray-600" />
              <p className="text-sm">{announcement.estado}</p>
              <p className="text-xs text-gray-600">Estado</p>
            </div>
          </div>

          {/* Confirmación de lectura */}
          {announcement.requiere_lectura && !isRead && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-[#003DA5] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-[#003DA5] mb-2">
                    Este anuncio requiere confirmación de lectura
                  </p>
                  <Button
                    size="sm"
                    onClick={onMarkAsRead}
                    className="bg-[#003DA5] hover:bg-[#002d7a]"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Confirmar que he leído
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CommunityAnnouncementsModuleUnified;
