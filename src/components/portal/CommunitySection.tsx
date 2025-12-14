import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Calendar,
  Newspaper,
  Award,
  MessageSquare,
  Sparkles,
  TrendingUp,
  BookOpen,
  Target,
  Heart,
  Share2,
  Eye,
  Clock,
  MapPin,
  ChevronRight,
  Search,
  Filter,
  Plus,
  Bell,
  Star,
  UserPlus,
  Building2,
  Briefcase,
  GraduationCap,
  Trophy,
  Zap,
  ArrowRight,
  Flame,
  ThumbsUp,
  MessageCircle,
  Bookmark,
  Send,
  Image as ImageIcon,
  Video,
  FileText,
  Link as LinkIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { NewsEventDetailView } from './NewsEventDetailView';
import { MOCK_USERS_WITH_SEDES as MOCK_USERS } from '../../data/mockUsersWithSedes';

interface CommunitySectionProps {
  onEventSelect?: (event: any) => void;
}

export function CommunitySection({ onEventSelect }: CommunitySectionProps) {
  const [activeTab, setActiveTab] = useState('events'); // Cambiado de 'feed' a 'events'
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [directorySearch, setDirectorySearch] = useState('');
  const [directoryRoleFilter, setDirectoryRoleFilter] = useState('all');

  // Posts de la comunidad
  const communityPosts = [
    {
      id: 1,
      type: 'discussion',
      author: {
        name: 'María Fernández García',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
        program: 'Administración Pública',
        badge: 'Activo',
      },
      content: '¿Alguien más está aplicando al programa de prácticas del DNP? Me gustaría compartir experiencias y prepararnos juntos para las entrevistas. 🎯',
      timestamp: 'Hace 2 horas',
      likes: 24,
      comments: 8,
      shares: 3,
      tags: ['Prácticas', 'DNP', 'Oportunidades'],
    },
    {
      id: 2,
      type: 'achievement',
      author: {
        name: 'Carlos Rodríguez',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
        program: 'Gestión Territorial',
        badge: 'Destacado',
      },
      content: '¡Acabo de defender mi proyecto de grado con mención de honor! Gracias a todos los que me apoyaron en este proceso. La investigación estará disponible próximamente en el repositorio institucional. 🎓✨',
      image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=400&fit=crop',
      timestamp: 'Hace 5 horas',
      likes: 156,
      comments: 42,
      shares: 18,
      tags: ['Logro', 'Investigación', 'Proyecto de Grado'],
    },
    {
      id: 3,
      type: 'resource',
      author: {
        name: 'Ana Gómez Torres',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
        program: 'Administración Pública',
        badge: 'Mentor',
      },
      content: 'Comparto este material de estudio sobre Políticas Públicas que me ayudó mucho en mi último semestre. Espero les sea útil. 📚',
      attachments: [
        { name: 'Guía de Políticas Públicas.pdf', type: 'PDF', size: '2.4 MB' },
      ],
      timestamp: 'Hace 1 día',
      likes: 89,
      comments: 23,
      shares: 34,
      tags: ['Recursos', 'Estudio', 'Políticas Públicas'],
    },
    {
      id: 4,
      type: 'question',
      author: {
        name: 'Jorge Martínez',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
        program: 'Administración Pública',
      },
      content: '¿Recomendaciones de bibliografía para el curso de Gestión Financiera Pública? El profesor mencionó varios libros pero me gustaría saber cuáles son los más útiles según su experiencia.',
      timestamp: 'Hace 3 horas',
      likes: 15,
      comments: 12,
      shares: 2,
      tags: ['Ayuda', 'Bibliografía', 'Gestión Financiera'],
    },
  ];

  // Eventos próximos
  const upcomingEvents = [
    {
      id: 1,
      type: 'event' as const,
      title: 'Feria de Empleo ESAP 2025',
      description: 'Más de 40 empresas del sector público y privado buscan talento ESAP. Inscripciones abiertas.',
      fullContent: 'La Feria de Empleo ESAP 2025 es el evento más importante del año para conectar estudiantes y egresados con oportunidades laborales. Este año contaremos con la participación de más de 40 empresas líderes del sector público y privado, incluyendo ministerios, alcaldías, gobernaciones, ONGs y empresas consultoras. Habrá charlas sobre preparación de hojas de vida, simulacros de entrevistas, y networking directo con reclutadores.',
      date: '25 Nov 2025',
      time: '8:00 AM - 5:00 PM',
      location: 'Campus Principal ESAP',
      image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&h=300&fit=crop',
      category: 'Evento',
      attendees: 456,
      views: 2345,
      likes: 234,
      comments: 67,
      tags: ['Empleo', 'Networking', 'Oportunidades'],
      author: {
        name: 'Dirección de Bienestar',
        avatar: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop',
        role: 'ESAP',
      },
      organizer: {
        name: 'Dirección de Bienestar Universitario',
        email: 'bienestar@esap.edu.co',
        phone: '+57 601 2222800 ext. 345',
      },
    },
    {
      id: 2,
      type: 'event' as const,
      title: 'Hackathon: GovTech Challenge',
      description: 'Resuelve desafíos reales del sector público con tecnología. Premios de hasta $5.000.000.',
      fullContent: 'El GovTech Challenge es un hackathon de 48 horas donde equipos multidisciplinarios trabajarán en soluciones tecnológicas para problemas reales del sector público colombiano. Los retos incluyen: digitalización de trámites, transparencia en contratación pública, participación ciudadana digital, y analítica de datos para toma de decisiones. Los ganadores recibirán premios en efectivo, mentoría especializada, y la oportunidad de implementar sus soluciones en entidades reales.',
      date: '2-4 Dic 2025',
      time: '48 horas continuas',
      location: 'Auditorio Principal + Virtual',
      image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&h=300&fit=crop',
      category: 'Evento',
      attendees: 89,
      views: 1234,
      likes: 156,
      comments: 34,
      tags: ['Tecnología', 'Innovación', 'Competencia'],
      author: {
        name: 'Centro de Innovación ESAP',
        avatar: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=100&h=100&fit=crop',
        role: 'ESAP',
      },
      organizer: {
        name: 'Centro de Innovación y Emprendimiento',
        email: 'innovacion@esap.edu.co',
      },
    },
    {
      id: 3,
      type: 'event' as const,
      title: 'Charla: Liderazgo en el Sector Público',
      description: 'Conversatorio con directivos de alto nivel sobre competencias de liderazgo transformacional.',
      date: '18 Nov 2025',
      time: '4:00 PM - 6:00 PM',
      location: 'Virtual - Teams',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=300&fit=crop',
      category: 'Evento',
      attendees: 234,
      tags: ['Liderazgo', 'Virtual', 'Desarrollo'],
    },
  ];

  // Noticias destacadas
  const highlightedNews = [
    {
      id: 1,
      type: 'news' as const,
      title: 'ESAP entre las mejores escuelas de gobierno de Latinoamérica',
      description: 'Ranking internacional reconoce la excelencia académica y el impacto social de la institución.',
      fullContent: 'La Escuela Superior de Administración Pública ha sido reconocida entre las 10 mejores escuelas de gobierno de Latinoamérica según el ranking QS 2025. Este logro se debe a la calidad académica de sus programas, el impacto de sus investigaciones, y la trayectoria destacada de sus egresados en el servicio público. El rector destacó que este reconocimiento impulsa el compromiso de la institución con la excelencia y la transformación del Estado colombiano.',
      date: 'Hace 1 día',
      image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=300&fit=crop',
      category: 'Noticia',
      views: 5678,
      likes: 456,
      comments: 123,
      tags: ['Reconocimiento', 'Ranking', 'Excelencia'],
      author: {
        name: 'Oficina de Comunicaciones',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop',
        role: 'ESAP',
      },
    },
    {
      id: 2,
      type: 'news' as const,
      title: 'Nueva Maestría en Transformación Digital del Estado',
      description: 'Abre convocatoria para el programa de posgrado más innovador del año.',
      date: 'Hace 2 días',
      image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&h=300&fit=crop',
      category: 'Noticia',
      tags: ['Posgrado', 'Innovación'],
    },
  ];

  // Grupos de estudio
  const studyGroups = [
    {
      id: 1,
      name: 'Políticas Públicas Avanzadas',
      description: 'Grupo de estudio para análisis de casos reales',
      members: 24,
      category: 'Académico',
      active: true,
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&h=200&fit=crop',
    },
    {
      id: 2,
      name: 'Preparación Concurso CNSC',
      description: 'Nos preparamos juntos para la carrera administrativa',
      members: 67,
      category: 'Empleo',
      active: true,
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=200&h=200&fit=crop',
    },
    {
      id: 3,
      name: 'Investigación en Gestión Territorial',
      description: 'Compartimos papers y discutimos metodologías',
      members: 18,
      category: 'Investigación',
      active: true,
      image: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=200&h=200&fit=crop',
    },
    {
      id: 4,
      name: 'Alumni Networking',
      description: 'Red de egresados para oportunidades laborales',
      members: 156,
      category: 'Networking',
      active: true,
      image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=200&h=200&fit=crop',
    },
  ];

  // Top contributors
  const topContributors = [
    {
      name: 'Laura Sánchez',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      posts: 45,
      helpful: 123,
      badge: 'Experto',
    },
    {
      name: 'Diego Martínez',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop',
      posts: 38,
      helpful: 98,
      badge: 'Mentor',
    },
    {
      name: 'Carolina Rojas',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop',
      posts: 32,
      helpful: 87,
      badge: 'Colaborador',
    },
  ];

  const renderPost = (post: typeof communityPosts[0]) => (
    <Card key={post.id} className="hover:shadow-lg transition-all">
      <CardContent className="p-6">
        {/* Header del post */}
        <div className="flex items-start gap-4 mb-4">
          <Avatar className="w-12 h-12">
            <AvatarImage src={post.author.avatar} />
            <AvatarFallback>{post.author.name.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold text-gray-900">{post.author.name}</h4>
              {post.author.badge && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  {post.author.badge}
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600">{post.author.program}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" />
              {post.timestamp}
            </p>
          </div>
        </div>

        {/* Contenido */}
        <p className="text-gray-700 mb-4 leading-relaxed">{post.content}</p>

        {/* Imagen adjunta */}
        {post.image && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <ImageWithFallback
              src={post.image}
              alt="Post image"
              className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}

        {/* Archivos adjuntos */}
        {post.attachments && post.attachments.length > 0 && (
          <div className="mb-4 space-y-2">
            {post.attachments.map((file: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <FileText className="w-5 h-5 text-[#1e5da8]" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">{file.type} • {file.size}</p>
                </div>
                <Button size="sm" variant="ghost">
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.map((tag, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <Separator className="my-4" />

        {/* Acciones */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-[#1e5da8]">
              <ThumbsUp className="w-4 h-4" />
              <span>{post.likes}</span>
            </Button>
            <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-[#1e5da8]">
              <MessageCircle className="w-4 h-4" />
              <span>{post.comments}</span>
            </Button>
            <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-[#1e5da8]">
              <Share2 className="w-4 h-4" />
              <span>{post.shares}</span>
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-[#1e5da8]">
            <Bookmark className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderEventCard = (event: any) => (
    <Card
      key={event.id}
      className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => setSelectedEvent(event)}
    >
      <div className="relative h-40">
        <ImageWithFallback
          src={event.image}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 left-3">
          <Badge className="bg-white/90 backdrop-blur-sm text-gray-900">
            {event.category}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4">
        <h4 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#1e5da8] transition-colors">
          {event.title}
        </h4>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{event.description}</p>
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Calendar className="w-3 h-3" />
            <span>{event.date}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <MapPin className="w-3 h-3" />
              <span>{event.location}</span>
            </div>
          )}
          {event.attendees && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Users className="w-3 h-3" />
              <span>{event.attendees} interesados</span>
            </div>
          )}
        </div>
        <Button size="sm" className="w-full gap-2 bg-[#1e5da8] hover:bg-[#174a8a]">
          Ver detalles
          <ArrowRight className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-[#1e5da8]/10 rounded-lg">
              <Users className="w-7 h-7 text-[#1e5da8]" />
            </div>
            Comunidad ESAP
          </h2>
          <p className="text-gray-600 mt-1">
            Conecta, comparte y crece con la comunidad universitaria
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 h-auto">
          <TabsTrigger value="events" className="gap-2 py-3">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Eventos</span>
          </TabsTrigger>
          <TabsTrigger value="news" className="gap-2 py-3">
            <Newspaper className="w-4 h-4" />
            <span className="hidden sm:inline">Noticias</span>
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-2 py-3">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Grupos</span>
          </TabsTrigger>
          <TabsTrigger value="directory" className="gap-2 py-3">
            <GraduationCap className="w-4 h-4" />
            <span className="hidden sm:inline">Directorio</span>
          </TabsTrigger>
        </TabsList>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4 mt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Buscar eventos..." className="pl-9" />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filtros
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingEvents.map(renderEventCard)}
          </div>
        </TabsContent>

        {/* News Tab */}
        <TabsContent value="news" className="space-y-4 mt-6">
          <div className="grid sm:grid-cols-2 gap-4">
            {highlightedNews.map((news) => (
              <Card
                key={news.id}
                className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => setSelectedEvent(news)}
              >
                <div className="relative h-48">
                  <ImageWithFallback
                    src={news.image}
                    alt={news.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-white/90 backdrop-blur-sm text-gray-900">
                      {news.category}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-5">
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#1e5da8] transition-colors">
                    {news.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{news.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{news.date}</span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {news.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {news.likes}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-4 mt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Buscar grupos..." className="pl-9" />
            </div>
            <Button className="gap-2 bg-[#1e5da8] hover:bg-[#174a8a]">
              <Plus className="w-4 h-4" />
              Crear grupo
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {studyGroups.map((group) => (
              <Card key={group.id} className="hover:shadow-lg transition-all">
                <div className="relative h-32 overflow-hidden">
                  <ImageWithFallback
                    src={group.image}
                    alt={group.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <Badge className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-900">
                    {group.category}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold text-gray-900 mb-1">{group.name}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{group.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{group.members} miembros</span>
                    </div>
                    <Button size="sm" className="bg-[#1e5da8] hover:bg-[#174a8a]">
                      Unirse
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Directory Tab */}
        <TabsContent value="directory" className="space-y-4 mt-6">
          {/* Barra de búsqueda y filtros */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, programa..."
                className="pl-9"
                value={directorySearch}
                onChange={(e) => setDirectorySearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant={directoryRoleFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDirectoryRoleFilter('all')}
                className={directoryRoleFilter === 'all' ? 'bg-[#1e5da8]' : ''}
              >
                Todos
              </Button>
              <Button
                variant={directoryRoleFilter === 'Estudiante' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDirectoryRoleFilter('Estudiante')}
                className={directoryRoleFilter === 'Estudiante' ? 'bg-[#1e5da8]' : ''}
              >
                Estudiantes
              </Button>
              <Button
                variant={directoryRoleFilter === 'Docente' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDirectoryRoleFilter('Docente')}
                className={directoryRoleFilter === 'Docente' ? 'bg-[#1e5da8]' : ''}
              >
                Docentes
              </Button>
              <Button
                variant={directoryRoleFilter === 'Graduado' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDirectoryRoleFilter('Graduado')}
                className={directoryRoleFilter === 'Graduado' ? 'bg-[#1e5da8]' : ''}
              >
                Graduados
              </Button>
            </div>
          </div>

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <GraduationCap className="w-5 h-5 text-blue-700" />
                </div>
                <p className="text-2xl font-black text-blue-900">
                  {MOCK_USERS.filter((u) => u.roles.some((r) => r.name === 'Estudiante')).length}
                </p>
                <p className="text-xs text-blue-700">Estudiantes</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Users className="w-5 h-5 text-orange-700" />
                </div>
                <p className="text-2xl font-black text-orange-900">
                  {MOCK_USERS.filter((u) => u.roles.some((r) => r.name === 'Docente')).length}
                </p>
                <p className="text-xs text-orange-700">Docentes</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Trophy className="w-5 h-5 text-green-700" />
                </div>
                <p className="text-2xl font-black text-green-900">
                  {MOCK_USERS.filter((u) => u.roles.some((r) => r.name === 'Graduado')).length}
                </p>
                <p className="text-xs text-green-700">Graduados</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Building2 className="w-5 h-5 text-purple-700" />
                </div>
                <p className="text-2xl font-black text-purple-900">
                  {MOCK_USERS.filter((u) => u.roles.some((r) => r.name === 'Administrativo')).length}
                </p>
                <p className="text-xs text-purple-700">Administrativos</p>
              </CardContent>
            </Card>
          </div>

          {/* Grid de usuarios */}
          <div className="space-y-2">
            {MOCK_USERS
              .filter((user) => {
                if (user.status !== 'active') return false;
                if (directoryRoleFilter !== 'all') {
                  if (!user.roles.some((r) => r.name === directoryRoleFilter)) return false;
                }
                if (directorySearch) {
                  const searchLower = directorySearch.toLowerCase();
                  const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
                  const program = user.program?.toLowerCase() || '';
                  const email = user.email.toLowerCase();
                  return fullName.includes(searchLower) || program.includes(searchLower) || email.includes(searchLower);
                }
                return true;
              })
              .map((user) => {
                const primaryRole = user.roles[0];
                const roleColors: Record<string, { bg: string; text: string; border: string }> = {
                  Estudiante: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
                  Docente: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
                  Graduado: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
                  Administrativo: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
                  Aspirante: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
                };
                const roleColor = roleColors[primaryRole.name] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };

                return (
                  <Card key={user.id} className="hover:shadow-md transition-all cursor-pointer group">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <Avatar className="w-14 h-14 flex-shrink-0">
                          <AvatarImage src={user.avatar || undefined} />
                          <AvatarFallback className="text-sm">
                            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>

                        {/* Información principal */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-gray-900 group-hover:text-[#1e5da8] transition-colors truncate">
                              {user.firstName} {user.lastName}
                            </h4>
                            <Badge className={`${roleColor.bg} ${roleColor.text} border ${roleColor.border} text-xs flex-shrink-0`}>
                              {primaryRole.name}
                            </Badge>
                          </div>
                          
                          {/* Información secundaria */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                            {user.program && (
                              <span className="flex items-center gap-1 truncate">
                                <GraduationCap className="w-3 h-3 flex-shrink-0" />
                                {user.program}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {user.location || 'Sin ubicación'}
                            </span>
                            {user.email && (
                              <span className="hidden md:flex items-center gap-1 text-gray-500">
                                {user.email}
                              </span>
                            )}
                          </div>

                          {/* Roles adicionales */}
                          {user.roles.length > 1 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {user.roles.slice(1, 3).map((role, idx) => (
                                <Badge key={idx} variant="outline" className="text-[10px] px-2 py-0.5">
                                  {role.name}
                                </Badge>
                              ))}
                              {user.roles.length > 3 && (
                                <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                  +{user.roles.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Botones de acción */}
                        <div className="flex gap-2 flex-shrink-0">
                          <Button size="sm" variant="outline" className="text-xs hover:bg-blue-50 hover:text-[#1e5da8] hover:border-[#1e5da8]">
                            <UserPlus className="w-4 h-4" />
                            <span className="hidden lg:inline ml-1">Conectar</span>
                          </Button>
                          <Button size="sm" className="text-xs bg-[#1e5da8] hover:bg-[#174a8a]">
                            Ver Perfil
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>

          {/* Mensaje si no hay resultados */}
          {MOCK_USERS.filter((user) => {
            if (user.status !== 'active') return false;
            if (directoryRoleFilter !== 'all') {
              if (!user.roles.some((r) => r.name === directoryRoleFilter)) return false;
            }
            if (directorySearch) {
              const searchLower = directorySearch.toLowerCase();
              const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
              const program = user.program?.toLowerCase() || '';
              const email = user.email.toLowerCase();
              return fullName.includes(searchLower) || program.includes(searchLower) || email.includes(searchLower);
            }
            return true;
          }).length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No se encontraron resultados</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Intenta ajustar los filtros o buscar con otros términos
              </p>
              <Button variant="outline" onClick={() => { setDirectorySearch(''); setDirectoryRoleFilter('all'); }}>
                Limpiar filtros
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de detalle de evento/noticia */}
      <AnimatePresence>
        {selectedEvent && (
          <NewsEventDetailView
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}