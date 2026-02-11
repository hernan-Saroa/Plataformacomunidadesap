/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * MÓDULO DE POSTS DE COMUNIDAD - VERSIÓN UNIFICADA
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * DÍA 2 - FASE 1: UNIFICACIÓN COMPLETADA ✅
 * 
 * CAMBIOS PRINCIPALES:
 * - ✅ Usa communityService.ts (API unificada)
 * - ✅ Tipos TypeScript desde community.types.ts
 * - ✅ Loading states y manejo de errores
 * - ✅ Sincronización con Backoffice
 * - ✅ Moderación integrada
 * - ✅ Paginación funcional
 * 
 * CONSUMIDO POR:
 * - Portal Transaccional (Estudiantes, Docentes, Graduados)
 * - Backoffice Administrativo (Community Manager)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  ThumbsUp,
  MessageCircle,
  Share2,
  Bookmark,
  Send,
  Plus,
  Search,
  Filter,
  Clock,
  TrendingUp,
  Users,
  Eye,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Trophy,
  MoreVertical,
  Edit,
  Trash2,
  Pin,
  Flag,
  Lightbulb,
  Shield,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { toast } from 'sonner@2.0.3';
import { UnifiedStatsCards, StatCardData } from './UnifiedStatsCards';
import { InlineTip } from '../shared/InlineTip';
import { EmptyStatePremium } from './EmptyStatesPremium';
import { usePersistentTip } from '../../hooks';

// ✅ IMPORTAR SERVICIO UNIFICADO Y TIPOS
import { CommunityPostsService, CommunityStatsService } from '../../lib/services/communityService';
import type { CommunityPost, CommunityFilters } from '../../types/community.types';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROPS DEL COMPONENTE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface CommunityPostsModuleProps {
  userRole?: 'Estudiante' | 'Docente' | 'Administrativo' | 'Graduado';
  userId?: string;
  canModerate?: boolean; // true para Community Managers
}

export function CommunityPostsModuleUnified({ 
  userRole = 'Estudiante',
  userId = 'user-current',
  canModerate = false 
}: CommunityPostsModuleProps) {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ESTADO
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('todos');
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const pageSize = 10;
  
  // Estadísticas
  const [stats, setStats] = useState<any>(null);
  
  // Crear post
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('General');
  const [newPostTags, setNewPostTags] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  
  const [showTip, setShowTip] = usePersistentTip('tip_posts_unified', true);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CARGAR DATOS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  const loadPosts = async (showLoadingIndicator = true) => {
    try {
      if (showLoadingIndicator) {
        setLoading(true);
      }
      setError(null);
      
      // Construir filtros
      const filters: CommunityFilters = {
        busqueda: searchQuery || undefined,
        categoria: categoriaFilter !== 'todos' ? categoriaFilter : undefined,
        estado: estadoFilter !== 'todos' ? estadoFilter : undefined,
        // Solo mostrar posts publicados en Portal (estudiantes/docentes)
        // En Backoffice se muestran todos
        ...(canModerate ? {} : { estado: 'Publicado' })
      };
      
      // ✅ LLAMADA AL SERVICIO UNIFICADO
      const response = await CommunityPostsService.getPosts(filters, currentPage, pageSize);
      
      setPosts(response.data);
      setTotalPages(response.totalPages);
      setTotalPosts(response.total);
      
    } catch (err: any) {
      console.error('Error cargando posts:', err);
      setError(err.message || 'Error al cargar posts');
      toast.error('Error al cargar posts', {
        description: 'No se pudieron cargar los posts. Intenta de nuevo.'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const loadStats = async () => {
    try {
      const response = await CommunityStatsService.getStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    }
  };
  
  // Cargar al montar y cuando cambien filtros/página
  useEffect(() => {
    loadPosts();
  }, [currentPage, categoriaFilter, estadoFilter]);
  
  useEffect(() => {
    loadStats();
  }, []);
  
  // Búsqueda con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== undefined) {
        setCurrentPage(1);
        loadPosts();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ACCIONES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPosts(false);
    await loadStats();
    toast.success('Actualizado', {
      description: 'Los posts se han actualizado correctamente.'
    });
  };
  
  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      toast.error('Error', {
        description: 'El contenido del post no puede estar vacío.'
      });
      return;
    }
    
    try {
      setCreating(true);
      
      // ✅ CREAR POST CON SERVICIO UNIFICADO
      const response = await CommunityPostsService.createPost({
        contenido: newPostContent,
        categoria: newPostCategory as any,
        etiquetas: newPostTags,
        permite_comentarios: true
      }, userId);
      
      if (response.success) {
        toast.success('¡Post creado!', {
          description: response.message || 'Tu post ha sido creado exitosamente.'
        });
        
        // Limpiar formulario
        setNewPostContent('');
        setNewPostCategory('General');
        setNewPostTags([]);
        setShowCreateModal(false);
        
        // Recargar posts
        await loadPosts(false);
      } else {
        throw new Error(response.error || 'Error al crear post');
      }
      
    } catch (err: any) {
      console.error('Error creando post:', err);
      toast.error('Error al crear post', {
        description: err.message || 'No se pudo crear el post.'
      });
    } finally {
      setCreating(false);
    }
  };
  
  const handleLike = async (postId: string) => {
    try {
      const response = await CommunityPostsService.likePost(postId, userId);
      
      if (response.success) {
        // Actualizar post localmente (optimistic update)
        setPosts(posts.map(p => 
          p.id === postId ? { ...p, likes: p.likes + 1 } : p
        ));
        
        toast.success('¡Like agregado!');
      }
    } catch (err: any) {
      console.error('Error dando like:', err);
      toast.error('Error', { description: 'No se pudo dar like.' });
    }
  };
  
  const handleDelete = async (postId: string) => {
    if (!confirm('¿Estás seguro de eliminar este post?')) return;
    
    try {
      const response = await CommunityPostsService.deletePost(postId, userId);
      
      if (response.success) {
        toast.success('Post eliminado', {
          description: 'El post ha sido eliminado exitosamente.'
        });
        
        await loadPosts(false);
      }
    } catch (err: any) {
      console.error('Error eliminando post:', err);
      toast.error('Error', { description: 'No se pudo eliminar el post.' });
    }
  };
  
  const handleModerate = async (postId: string, action: 'aprobar' | 'rechazar') => {
    try {
      const response = await CommunityPostsService.moderatePost(
        postId, 
        { 
          accion: action,
          razon_rechazo: action === 'rechazar' ? 'Contenido inapropiado' : undefined
        },
        userId
      );
      
      if (response.success) {
        toast.success(`Post ${action === 'aprobar' ? 'aprobado' : 'rechazado'}`, {
          description: response.message
        });
        
        await loadPosts(false);
      }
    } catch (err: any) {
      console.error('Error moderando post:', err);
      toast.error('Error', { description: 'No se pudo moderar el post.' });
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STATS CARDS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  const statsCards: StatCardData[] = stats ? [
    { 
      id: 'posts-active',
      title: 'Posts Activos', 
      value: stats.posts.publicados, 
      icon: MessageSquare, 
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
      lightBg: '#EFF6FF',
      iconColor: '#3B82F6',
      description: 'Publicaciones activas',
      change: `+${stats.posts.esta_semana}`,
      trend: 'up' as const,
    },
    { 
      id: 'engagement',
      title: 'Interacciones', 
      value: stats.interacciones.total_likes + stats.interacciones.total_comentarios, 
      icon: TrendingUp, 
      gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      lightBg: '#D1FAE5',
      iconColor: '#10B981',
      description: 'Likes y comentarios',
      change: '+8.5%',
      trend: 'up' as const,
    },
    { 
      id: 'users-active',
      title: 'Usuarios Activos', 
      value: stats.interacciones.usuarios_activos, 
      icon: Users, 
      gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
      lightBg: '#EDE9FE',
      iconColor: '#8B5CF6',
      description: 'Activos este mes',
      change: '+12%',
      trend: 'up' as const,
    },
    { 
      id: 'posts-today',
      title: 'Posts Hoy', 
      value: stats.posts.hoy, 
      icon: Clock, 
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      lightBg: '#FEF3C7',
      iconColor: '#F59E0B',
      description: 'Últimas 24 horas',
      change: `+${stats.posts.hoy}`,
      trend: 'up' as const,
    },
  ] : [];

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDERIZADO
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'Publicado':
        return <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle className="w-3 h-3 mr-1" />Publicado</Badge>;
      case 'En Revisión':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300"><Clock className="w-3 h-3 mr-1" />En Revisión</Badge>;
      case 'Rechazado':
        return <Badge className="bg-red-100 text-red-700 border-red-300"><AlertCircle className="w-3 h-3 mr-1" />Rechazado</Badge>;
      default:
        return null;
    }
  };
  
  const renderPost = (post: CommunityPost) => (
    <Card key={post.id} className="hover:shadow-lg transition-all">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4 flex-1">
            <Avatar className="w-12 h-12">
              <AvatarImage src={post.autor_foto} />
              <AvatarFallback>{post.autor_nombre.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h4 className="font-bold text-gray-900">{post.autor_nombre}</h4>
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  {post.autor_rol}
                </Badge>
                {post.es_oficial && (
                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                    <Shield className="w-3 h-3 mr-1" />
                    Oficial
                  </Badge>
                )}
                {post.es_destacado && (
                  <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                    <Trophy className="w-3 h-3 mr-1" />
                    Destacado
                  </Badge>
                )}
                {canModerate && getEstadoBadge(post.estado)}
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(post.fecha_creacion).toLocaleString('es-CO')}
              </p>
            </div>
          </div>
          
          {/* Acciones */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canModerate && post.estado === 'En Revisión' && (
                <>
                  <DropdownMenuItem onClick={() => handleModerate(post.id, 'aprobar')}>
                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                    Aprobar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleModerate(post.id, 'rechazar')}>
                    <AlertCircle className="w-4 h-4 mr-2 text-red-600" />
                    Rechazar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => handleDelete(post.id)} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Contenido */}
        <div className="mb-4">
          <p className="text-gray-700 whitespace-pre-wrap">{post.contenido}</p>
        </div>

        {/* Imágenes */}
        {post.imagenes && post.imagenes.length > 0 && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <img src={post.imagenes[0]} alt="Post" className="w-full max-h-96 object-cover" />
          </div>
        )}

        {/* Etiquetas */}
        {post.etiquetas && post.etiquetas.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.etiquetas.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        <Separator className="my-4" />

        {/* Footer - Estadísticas */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => handleLike(post.id)}
              className="flex items-center gap-1 hover:text-blue-600 transition-colors"
            >
              <ThumbsUp className="w-4 h-4" />
              <span>{post.likes}</span>
            </button>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              <span>{post.comentarios}</span>
            </div>
            <div className="flex items-center gap-1">
              <Share2 className="w-4 h-4" />
              <span>{post.compartidos}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <Eye className="w-3 h-3" />
            <span>{post.vistas} vistas</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER PRINCIPAL
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-[#003DA5]" />
            Comunidad ESAP
          </h1>
          <p className="text-gray-600 mt-1">
            {canModerate 
              ? 'Gestiona y modera publicaciones de la comunidad' 
              : 'Comparte y conecta con la comunidad universitaria'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Post
          </Button>
        </div>
      </div>

      {/* Tip Informativo */}
      {showTip && (
        <InlineTip
          icon={Lightbulb}
          title="🎉 ¡Sistema Unificado Activo!"
          description="Este módulo ahora está sincronizado entre el Portal y el Backoffice. Los posts que crees aquí se verán en ambos sistemas en tiempo real."
          variant="info"
          onClose={() => setShowTip(false)}
        />
      )}

      {/* Stats */}
      {stats && <UnifiedStatsCards stats={statsCards} />}

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Buscar posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <select
                value={categoriaFilter}
                onChange={(e) => setCategoriaFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="todos">Todas las categorías</option>
                <option value="General">General</option>
                <option value="Académico">Académico</option>
                <option value="Deportes">Deportes</option>
                <option value="Cultura">Cultura</option>
                <option value="Investigación">Investigación</option>
                <option value="Graduados">Graduados</option>
              </select>
            </div>
            {canModerate && (
              <div>
                <select
                  value={estadoFilter}
                  onChange={(e) => setEstadoFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="Publicado">Publicado</option>
                  <option value="En Revisión">En Revisión</option>
                  <option value="Rechazado">Rechazado</option>
                </select>
              </div>
            )}
            <div className="text-sm text-gray-600 flex items-center">
              {totalPosts} posts encontrados
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#003DA5]" />
          <span className="ml-3 text-gray-600">Cargando posts...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className="border-2 border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
            <h3 className="font-bold text-red-900 mb-2">Error al cargar posts</h3>
            <p className="text-sm text-red-700 mb-4">{error}</p>
            <Button onClick={() => loadPosts()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Posts List */}
      {!loading && !error && (
        <>
          {posts.length === 0 ? (
            <EmptyStatePremium
              icon={MessageSquare}
              title="No hay posts aún"
              description="Sé el primero en compartir algo con la comunidad"
              action={{
                label: 'Crear primer post',
                onClick: () => setShowCreateModal(true)
              }}
            />
          ) : (
            <div className="space-y-4">
              {posts.map(renderPost)}
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-gray-600">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}

      {/* Modal Crear Post */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6"
            >
              <h2 className="text-2xl font-bold mb-4">Crear Nuevo Post</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Categoría
                  </label>
                  <select
                    value={newPostCategory}
                    onChange={(e) => setNewPostCategory(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="General">General</option>
                    <option value="Académico">Académico</option>
                    <option value="Deportes">Deportes</option>
                    <option value="Cultura">Cultura</option>
                    <option value="Investigación">Investigación</option>
                    <option value="Graduados">Graduados</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Contenido
                  </label>
                  <Textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="¿Qué quieres compartir con la comunidad?"
                    rows={6}
                    className="w-full"
                  />
                </div>

                {userRole === 'Estudiante' && (
                  <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      ℹ️ Tu post será revisado por moderadores antes de publicarse.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreatePost}
                  disabled={creating || !newPostContent.trim()}
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Publicando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Publicar
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CommunityPostsModuleUnified;
