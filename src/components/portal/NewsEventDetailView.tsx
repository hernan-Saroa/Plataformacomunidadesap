import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Share2,
  Download,
  Heart,
  MessageCircle,
  Bookmark,
  ChevronLeft,
  ExternalLink,
  CheckCircle,
  Eye,
  Tag,
  User,
  Mail,
  Phone,
  Globe,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Award,
  Bell,
  Link as LinkIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { copyToClipboard } from '@/utils/browser';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { toast } from 'sonner@2.0.3';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

interface NewsEvent {
  id: number;
  type: 'event' | 'news' | 'announcement' | 'achievement';
  title: string;
  description: string;
  fullContent?: string;
  date: string;
  time?: string;
  location?: string;
  image?: string;
  category: string;
  tags: string[];
  attendees?: number;
  views?: number;
  likes?: number;
  comments?: number;
  badge?: string;
  author?: {
    name: string;
    avatar: string;
    role: string;
  };
  organizer?: {
    name: string;
    email: string;
    phone?: string;
  };
  registrationUrl?: string;
  materials?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  relatedEvents?: Array<{
    id: number;
    title: string;
    date: string;
    image: string;
  }>;
}

interface NewsEventDetailViewProps {
  event: NewsEvent;
  onClose: () => void;
  onBack?: () => void;
}

export function NewsEventDetailView({ event, onClose, onBack }: NewsEventDetailViewProps) {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');

  const handleRegister = () => {
    setIsRegistered(true);
    toast.success('¡Registro exitoso!', {
      description: 'Te hemos enviado la confirmación a tu correo institucional',
      duration: 4000,
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: event.description,
        url: window.location.href,
      });
    } else {
      copyToClipboard(window.location.href);
      toast.success('Enlace copiado al portapapeles');
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    toast.success(isLiked ? 'Me gusta eliminado' : '¡Te gusta este contenido!');
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    toast.success(isSaved ? 'Eliminado de guardados' : '¡Guardado exitosamente!');
  };

  const handleCommentSubmit = () => {
    if (comment.trim()) {
      toast.success('Comentario publicado exitosamente');
      setComment('');
    }
  };

  const getTypeIcon = () => {
    switch (event.type) {
      case 'event':
        return <Calendar className="w-5 h-5" />;
      case 'news':
        return <TrendingUp className="w-5 h-5" />;
      case 'announcement':
        return <Bell className="w-5 h-5" />;
      case 'achievement':
        return <Award className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  const getTypeColor = () => {
    switch (event.type) {
      case 'event':
        return 'from-blue-500 to-blue-600';
      case 'news':
        return 'from-green-500 to-green-600';
      case 'announcement':
        return 'from-orange-500 to-orange-600';
      case 'achievement':
        return 'from-purple-500 to-purple-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="min-h-screen py-4 px-4 sm:py-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          className="max-w-5xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header con imagen de fondo */}
          <div className="relative h-[300px] sm:h-[400px] bg-gradient-to-br from-[#1e5da8] to-[#174a8a]">
            {event.image ? (
              <>
                <ImageWithFallback
                  src={event.image}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white/20">
                  {getTypeIcon()}
                </div>
              </div>
            )}

            {/* Botones de navegación */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
              {onBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="bg-white/90 backdrop-blur-sm hover:bg-white"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Volver
                </Button>
              )}
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="bg-white/90 backdrop-blur-sm hover:bg-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Badges y categoría */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2">
              <Badge className={`bg-gradient-to-r ${getTypeColor()} text-white border-0`}>
                <span className="flex items-center gap-1">
                  {getTypeIcon()}
                  {event.category}
                </span>
              </Badge>
            </div>

            {/* Título y metadata */}
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <div className="max-w-3xl">
                {event.badge && (
                  <Badge className="mb-3 bg-yellow-500 text-white border-0">
                    {event.badge}
                  </Badge>
                )}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
                  {event.title}
                </h1>
                <div className="flex flex-wrap gap-4 text-white/90 text-sm">
                  {event.date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{event.date}</span>
                    </div>
                  )}
                  {event.time && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{event.time}</span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  {event.attendees && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{event.attendees} asistentes</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Barra de acciones */}
          <div className="border-b bg-gray-50 px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant={isLiked ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleLike}
                  className={isLiked ? 'bg-red-500 hover:bg-red-600 text-white' : ''}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  <span className="ml-2">{event.likes || 0}</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowComments(!showComments)}>
                  <MessageCircle className="w-4 h-4" />
                  <span className="ml-2">{event.comments || 0}</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="w-4 h-4" />
                  <span className="ml-2 hidden sm:inline">Compartir</span>
                </Button>
                <Button
                  variant={isSaved ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleSave}
                  className={isSaved ? 'bg-[#1e5da8] hover:bg-[#174a8a]' : ''}
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Eye className="w-4 h-4" />
                <span>{event.views || 0} vistas</span>
              </div>
            </div>
          </div>

          {/* Contenido principal */}
          <div className="p-6 sm:p-8">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Columna principal */}
              <div className="lg:col-span-2 space-y-6">
                {/* Descripción */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Descripción</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">{event.description}</p>
                  {event.fullContent && (
                    <div className="prose prose-blue max-w-none">
                      <p className="text-gray-700 leading-relaxed">{event.fullContent}</p>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {event.tags && event.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Etiquetas
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {event.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Autor (si existe) */}
                {event.author && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">Autor</h3>
                      <div className="flex items-center gap-4">
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={event.author.avatar} />
                          <AvatarFallback>{event.author.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-bold text-gray-900">{event.author.name}</h4>
                          <p className="text-sm text-gray-600">{event.author.role}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Materiales de descarga */}
                {event.materials && event.materials.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Download className="w-5 h-5 text-[#1e5da8]" />
                        Materiales
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {event.materials.map((material, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          className="w-full justify-between"
                          asChild
                        >
                          <a href={material.url} download>
                            <span className="flex items-center gap-2">
                              <Download className="w-4 h-4" />
                              {material.name}
                            </span>
                            <Badge variant="outline" className="ml-2">
                              {material.type}
                            </Badge>
                          </a>
                        </Button>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Sección de comentarios */}
                <AnimatePresence>
                  {showComments && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-[#1e5da8]" />
                            Comentarios
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Formulario de comentario */}
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Escribe tu comentario..."
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              rows={3}
                            />
                            <div className="flex justify-end">
                              <Button
                                onClick={handleCommentSubmit}
                                disabled={!comment.trim()}
                                className="bg-[#1e5da8] hover:bg-[#174a8a]"
                              >
                                Publicar comentario
                              </Button>
                            </div>
                          </div>
                          <Separator />
                          {/* Mensaje si no hay comentarios */}
                          <div className="text-center py-8 text-gray-500">
                            <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p>Sé el primero en comentar</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* CTA de registro (si es evento) */}
                {event.type === 'event' && (
                  <Card className="border-2 border-[#1e5da8]">
                    <CardContent className="p-6 space-y-4">
                      {isRegistered ? (
                        <div className="text-center space-y-3">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 mb-1">¡Estás registrado!</h3>
                            <p className="text-sm text-gray-600">
                              Te enviamos la confirmación a tu correo
                            </p>
                          </div>
                          <Button variant="outline" className="w-full gap-2">
                            <Calendar className="w-4 h-4" />
                            Agregar al calendario
                          </Button>
                        </div>
                      ) : (
                        <>
                          <h3 className="font-bold text-gray-900 text-center">
                            ¿Quieres asistir?
                          </h3>
                          <Button
                            onClick={handleRegister}
                            className="w-full bg-[#1e5da8] hover:bg-[#174a8a] gap-2"
                            size="lg"
                          >
                            <CheckCircle className="w-5 h-5" />
                            Registrarme ahora
                          </Button>
                          <p className="text-xs text-center text-gray-600">
                            Confirma tu asistencia con un clic
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Información del organizador */}
                {event.organizer && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Organizador</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{event.organizer.name}</span>
                      </div>
                      {event.organizer.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <a
                            href={`mailto:${event.organizer.email}`}
                            className="text-[#1e5da8] hover:underline"
                          >
                            {event.organizer.email}
                          </a>
                        </div>
                      )}
                      {event.organizer.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <a
                            href={`tel:${event.organizer.phone}`}
                            className="text-[#1e5da8] hover:underline"
                          >
                            {event.organizer.phone}
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Enlace de registro externo */}
                {event.registrationUrl && (
                  <Card className="bg-gradient-to-br from-blue-50 to-purple-50">
                    <CardContent className="p-6">
                      <Button
                        asChild
                        className="w-full bg-[#1e5da8] hover:bg-[#174a8a] gap-2"
                      >
                        <a href={event.registrationUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                          Más información
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Eventos relacionados */}
                {event.relatedEvents && event.relatedEvents.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Eventos Relacionados</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {event.relatedEvents.map((relatedEvent) => (
                        <div
                          key={relatedEvent.id}
                          className="flex gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                            <ImageWithFallback
                              src={relatedEvent.image}
                              alt={relatedEvent.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">
                              {relatedEvent.title}
                            </h4>
                            <p className="text-xs text-gray-600">{relatedEvent.date}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}