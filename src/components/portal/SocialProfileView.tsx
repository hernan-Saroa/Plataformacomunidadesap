import { useState } from 'react';
import { 
  X, 
  Settings, 
  Camera, 
  MapPin, 
  Calendar, 
  Mail, 
  Phone,
  Briefcase,
  GraduationCap,
  Award,
  Users,
  Heart,
  MessageCircle,
  Share2,
  BookMarked,
  TrendingUp,
  Link as LinkIcon,
  Edit3,
  MoreHorizontal,
  UserPlus,
  UserCheck
} from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { toast } from 'sonner@2.0.3';

interface SocialProfileViewProps {
  isOpen: boolean;
  onClose: () => void;
  userData: {
    nombre: string;
    email: string;
    programa: string;
    foto?: string;
  };
  isOwnProfile?: boolean;
}

export function SocialProfileView({ 
  isOpen, 
  onClose, 
  userData, 
  isOwnProfile = true 
}: SocialProfileViewProps) {
  const [activeTab, setActiveTab] = useState<'posts' | 'about' | 'activity'>('posts');
  const [isFollowing, setIsFollowing] = useState(false);

  if (!isOpen) return null;

  // Mock data social
  const profileData = {
    coverImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&h=300&fit=crop',
    avatar: userData.foto || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    nombre: userData.nombre,
    username: '@' + userData.nombre.toLowerCase().replace(' ', '.'),
    programa: userData.programa,
    semestre: '6to Semestre',
    bio: '🎓 Estudiante ESAP | 💼 Apasionado por la administración pública | 🌟 Liderando cambios en mi comunidad',
    ubicacion: 'Bogotá, Colombia',
    miembroDesde: 'Febrero 2022',
    stats: {
      publicaciones: 48,
      seguidores: 234,
      siguiendo: 189,
    },
    intereses: ['Políticas Públicas', 'Liderazgo', 'Gobierno Digital', 'Gestión Territorial'],
  };

  const recentPosts = [
    {
      id: 1,
      type: 'post',
      content: '¡Increíble conferencia sobre transformación digital en el sector público! 🚀 #ESAP #GobiernoDigital',
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop',
      likes: 42,
      comments: 8,
      timestamp: 'Hace 2 horas',
    },
    {
      id: 2,
      type: 'achievement',
      content: '🏆 Obtuve la certificación en Gestión Pública Moderna',
      likes: 67,
      comments: 12,
      timestamp: 'Hace 1 día',
    },
    {
      id: 3,
      type: 'post',
      content: 'Compartiendo mi proyecto final sobre descentralización territorial. ¿Alguien más trabajando en temas similares?',
      likes: 28,
      comments: 15,
      timestamp: 'Hace 3 días',
    },
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover Image */}
        <div className="relative h-48 bg-gradient-to-r from-[#003DA5] to-[#1e5da8] overflow-hidden">
          <img 
            src={profileData.coverImage} 
            alt="Cover" 
            className="w-full h-full object-cover opacity-40"
          />
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          {isOwnProfile && (
            <button
              onClick={() => toast.info('Cambiar portada', { description: 'Próximamente' })}
              className="absolute bottom-4 right-4 px-4 py-2 bg-white/90 hover:bg-white backdrop-blur-sm rounded-lg flex items-center gap-2 text-sm font-semibold transition-all shadow-lg"
            >
              <Camera className="w-4 h-4" />
              Cambiar portada
            </button>
          )}
        </div>

        {/* Profile Header */}
        <div className="relative px-6 pb-4">
          {/* Avatar */}
          <div className="relative -mt-20 mb-4">
            <Avatar className="w-32 h-32 border-4 border-white shadow-xl">
              <AvatarImage src={profileData.avatar} alt={profileData.nombre} />
              <AvatarFallback className="bg-[#003DA5] text-white text-3xl">
                {profileData.nombre.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {isOwnProfile && (
              <button 
                onClick={() => toast.info('Cambiar foto', { description: 'Próximamente' })}
                className="absolute bottom-2 right-2 w-10 h-10 bg-[#003DA5] hover:bg-[#002d7a] rounded-full flex items-center justify-center text-white shadow-lg transition-all"
              >
                <Camera className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-black text-gray-900">{profileData.nombre}</h2>
                <Badge className="bg-blue-100 text-[#003DA5] hover:bg-blue-200">
                  <GraduationCap className="w-3 h-3 mr-1" />
                  Estudiante
                </Badge>
              </div>
              <p className="text-gray-600 mb-1">{profileData.username}</p>
              <p className="text-sm text-gray-500 mb-3">
                {profileData.programa} · {profileData.semestre}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {isOwnProfile ? (
                <>
                  <Button
                    onClick={() => toast.info('Editar perfil')}
                    className="gap-2 bg-gray-900 hover:bg-gray-800"
                  >
                    <Edit3 className="w-4 h-4" />
                    Editar perfil
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toast.info('Más opciones')}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => {
                      setIsFollowing(!isFollowing);
                      toast.success(isFollowing ? 'Dejaste de seguir' : '¡Ahora sigues a este usuario!');
                    }}
                    className={`gap-2 ${isFollowing ? 'bg-gray-600 hover:bg-gray-700' : 'bg-[#003DA5] hover:bg-[#002d7a]'}`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-4 h-4" />
                        Siguiendo
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Seguir
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => toast.info('Enviar mensaje')}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Mensaje
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toast.info('Más opciones')}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Bio */}
          <p className="text-gray-700 mb-4 leading-relaxed">
            {profileData.bio}
          </p>

          {/* Info Pills */}
          <div className="flex flex-wrap gap-4 mb-4 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-gray-400" />
              {profileData.ubicacion}
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gray-400" />
              Se unió en {profileData.miembroDesde}
            </div>
            <div className="flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-gray-400" />
              {userData.email}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mb-4">
            <button className="text-center hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors">
              <div className="text-xl font-black text-gray-900">{profileData.stats.publicaciones}</div>
              <div className="text-sm text-gray-600">Publicaciones</div>
            </button>
            <button className="text-center hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors">
              <div className="text-xl font-black text-gray-900">{profileData.stats.seguidores}</div>
              <div className="text-sm text-gray-600">Seguidores</div>
            </button>
            <button className="text-center hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors">
              <div className="text-xl font-black text-gray-900">{profileData.stats.siguiendo}</div>
              <div className="text-sm text-gray-600">Siguiendo</div>
            </button>
          </div>

          {/* Intereses */}
          <div className="flex flex-wrap gap-2 mb-4">
            {profileData.intereses.map((interes, idx) => (
              <Badge 
                key={idx} 
                variant="secondary" 
                className="text-xs px-3 py-1 bg-blue-50 text-[#003DA5] hover:bg-blue-100"
              >
                {interes}
              </Badge>
            ))}
          </div>

          <Separator className="my-4" />

          {/* Tabs */}
          <div className="flex gap-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('posts')}
              className={`pb-3 px-2 font-semibold transition-all relative ${
                activeTab === 'posts'
                  ? 'text-[#003DA5]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Publicaciones
              {activeTab === 'posts' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#003DA5]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`pb-3 px-2 font-semibold transition-all relative ${
                activeTab === 'about'
                  ? 'text-[#003DA5]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Acerca de
              {activeTab === 'about' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#003DA5]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`pb-3 px-2 font-semibold transition-all relative ${
                activeTab === 'activity'
                  ? 'text-[#003DA5]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Actividad
              {activeTab === 'activity' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#003DA5]" />
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-6 pb-6 max-h-96 overflow-y-auto">
          {activeTab === 'posts' && (
            <div className="space-y-4">
              {recentPosts.map((post) => (
                <div 
                  key={post.id} 
                  className="bg-gray-50 rounded-2xl p-4 hover:bg-gray-100 transition-colors"
                >
                  <p className="text-gray-800 mb-3">{post.content}</p>
                  {post.image && (
                    <img 
                      src={post.image} 
                      alt="Post" 
                      className="w-full h-48 object-cover rounded-xl mb-3"
                    />
                  )}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex gap-4">
                      <button className="flex items-center gap-1.5 hover:text-red-500 transition-colors">
                        <Heart className="w-4 h-4" />
                        {post.likes}
                      </button>
                      <button className="flex items-center gap-1.5 hover:text-[#003DA5] transition-colors">
                        <MessageCircle className="w-4 h-4" />
                        {post.comments}
                      </button>
                      <button className="flex items-center gap-1.5 hover:text-[#003DA5] transition-colors">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-xs">{post.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-4 pt-4">
              <div className="bg-gray-50 rounded-2xl p-4">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-[#003DA5]" />
                  Educación
                </h3>
                <div className="space-y-2">
                  <div>
                    <p className="font-semibold text-gray-800">ESAP - Escuela Superior de Administración Pública</p>
                    <p className="text-sm text-gray-600">{profileData.programa}</p>
                    <p className="text-sm text-gray-500">2022 - Presente</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#003DA5]" />
                  Logros
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      🏆
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Certificación en Gestión Pública</p>
                      <p className="text-xs text-gray-500">Noviembre 2025</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      ⭐
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Estudiante Destacado</p>
                      <p className="text-xs text-gray-500">Junio 2025</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-[#003DA5]" />
                  Experiencia
                </h3>
                <div className="space-y-2">
                  <div>
                    <p className="font-semibold text-gray-800">Pasante - Alcaldía Local</p>
                    <p className="text-sm text-gray-600">Departamento de Planeación</p>
                    <p className="text-sm text-gray-500">Ene 2025 - Presente</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-3 pt-4">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <TrendingUp className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-800"><span className="font-semibold">Completó</span> el curso de Gobierno Digital</p>
                  <p className="text-xs text-gray-500">Hace 2 días</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <Users className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-800"><span className="font-semibold">Se unió</span> al grupo de Políticas Públicas</p>
                  <p className="text-xs text-gray-500">Hace 5 días</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <BookMarked className="w-5 h-5 text-purple-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-800"><span className="font-semibold">Guardó</span> un artículo sobre descentralización</p>
                  <p className="text-xs text-gray-500">Hace 1 semana</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
