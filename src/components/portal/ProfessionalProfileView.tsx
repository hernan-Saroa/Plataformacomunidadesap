import { useState } from 'react';
import { 
  X, 
  Camera, 
  MapPin, 
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Award,
  BookOpen,
  FileText,
  ExternalLink,
  Plus,
  Edit2,
  Check,
  Star,
  TrendingUp,
  Users,
  Target,
  Link as LinkIcon,
  Building
} from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { toast } from 'sonner@2.0.3';

interface ProfessionalProfileViewProps {
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

export function ProfessionalProfileView({ 
  isOpen, 
  onClose, 
  userData, 
  isOwnProfile = true 
}: ProfessionalProfileViewProps) {
  if (!isOpen) return null;

  // Mock data profesional
  const profileData = {
    coverImage: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=300&fit=crop',
    avatar: userData.foto || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    nombre: userData.nombre,
    titulo: 'Estudiante de Administración Pública',
    programa: userData.programa,
    semestre: '6to Semestre',
    ubicacion: 'Bogotá, Colombia',
    email: userData.email,
    telefono: '+57 300 123 4567',
    acercaDe: 'Estudiante comprometida con la transformación del sector público colombiano. Apasionada por las políticas públicas inclusivas y la modernización del Estado. Busco contribuir al desarrollo de mejores prácticas en la gestión territorial y el fortalecimiento institucional.',
    
    experiencia: [
      {
        id: 1,
        cargo: 'Pasante de Investigación',
        organizacion: 'Alcaldía de Bogotá',
        tipo: 'Pasantía',
        ubicacion: 'Bogotá, Colombia',
        periodo: 'Ene 2025 - Presente · 4 meses',
        descripcion: 'Apoyo en la investigación y análisis de políticas públicas para el Departamento de Planeación. Elaboración de informes técnicos y propuestas de mejora en procesos administrativos.',
        logo: '🏛️',
      },
      {
        id: 2,
        cargo: 'Voluntaria',
        organizacion: 'Fundación Colombia Líder',
        tipo: 'Voluntariado',
        ubicacion: 'Bogotá, Colombia',
        periodo: 'Jun 2024 - Dic 2024 · 7 meses',
        descripcion: 'Coordinación de proyectos comunitarios enfocados en participación ciudadana y liderazgo juvenil en localidades de Bogotá.',
        logo: '🤝',
      },
    ],

    educacion: [
      {
        id: 1,
        institucion: 'ESAP - Escuela Superior de Administración Pública',
        titulo: 'Pregrado en Administración Pública Territorial',
        periodo: '2022 - 2026',
        estado: 'En curso',
        descripcion: 'Énfasis en gestión territorial, políticas públicas y modernización del Estado. Promedio actual: 4.3/5.0',
        logo: '🎓',
      },
      {
        id: 2,
        institucion: 'Colegio San Francisco de Asís',
        titulo: 'Bachiller Académico',
        periodo: '2010 - 2021',
        estado: 'Finalizado',
        descripcion: 'Énfasis en ciencias sociales y humanidades.',
        logo: '📚',
      },
    ],

    certificaciones: [
      {
        id: 1,
        nombre: 'Certificación en Gobierno Digital',
        emisor: 'MinTIC - Ministerio TIC Colombia',
        fecha: 'Nov 2025',
        credencial: 'Credencial ID: GD-2025-4567',
        logo: '💻',
      },
      {
        id: 2,
        nombre: 'Gestión Pública Moderna',
        emisor: 'ESAP - Educación Continua',
        fecha: 'Ago 2025',
        credencial: 'Credencial ID: GPM-2025-8901',
        logo: '📜',
      },
      {
        id: 3,
        nombre: 'Liderazgo en el Sector Público',
        emisor: 'Función Pública',
        fecha: 'May 2025',
        credencial: 'Credencial ID: LSP-2025-3456',
        logo: '🎖️',
      },
    ],

    habilidades: [
      { nombre: 'Políticas Públicas', endorsements: 12 },
      { nombre: 'Gestión Territorial', endorsements: 10 },
      { nombre: 'Análisis de Datos', endorsements: 8 },
      { nombre: 'Investigación Social', endorsements: 7 },
      { nombre: 'Gestión de Proyectos', endorsements: 6 },
      { nombre: 'Gobierno Digital', endorsements: 5 },
    ],

    proyectos: [
      {
        id: 1,
        nombre: 'Análisis de Descentralización en Colombia',
        descripcion: 'Proyecto de investigación sobre los efectos de la descentralización fiscal en municipios de categoría 3 y 4.',
        periodo: '2024 - 2025',
        estado: 'En desarrollo',
      },
    ],

    idiomas: [
      { idioma: 'Español', nivel: 'Nativo' },
      { idioma: 'Inglés', nivel: 'Intermedio' },
    ],

    conexiones: 234,
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-gray-50 rounded-none sm:rounded-2xl max-w-5xl w-full shadow-2xl my-4 sm:my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con Cover */}
        <div className="relative h-32 bg-gradient-to-r from-[#003DA5] to-[#0052d4] overflow-hidden">
          <img 
            src={profileData.coverImage} 
            alt="Cover" 
            className="w-full h-full object-cover opacity-30"
          />
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center transition-all shadow-lg"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>

          {isOwnProfile && (
            <button
              onClick={() => toast.info('Cambiar foto de portada')}
              className="absolute bottom-3 right-3 px-3 py-1.5 bg-white rounded-lg flex items-center gap-1.5 text-sm font-medium hover:bg-gray-50 transition-all shadow-md"
            >
              <Camera className="w-3.5 h-3.5" />
              Editar
            </button>
          )}
        </div>

        {/* Main Content */}
        <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Profile Header */}
          <div className="bg-white px-6 pb-6 border-b border-gray-200">
            {/* Avatar & Basic Info */}
            <div className="flex flex-col sm:flex-row gap-4 -mt-16">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-white shadow-xl bg-white">
                  <AvatarImage src={profileData.avatar} alt={profileData.nombre} />
                  <AvatarFallback className="bg-[#003DA5] text-white text-3xl">
                    {profileData.nombre.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {isOwnProfile && (
                  <button 
                    onClick={() => toast.info('Cambiar foto de perfil')}
                    className="absolute bottom-1 right-1 w-8 h-8 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center border border-gray-200 shadow-md transition-all"
                  >
                    <Camera className="w-4 h-4 text-gray-600" />
                  </button>
                )}
              </div>

              {/* Info & Actions */}
              <div className="flex-1 sm:mt-16">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">{profileData.nombre}</h1>
                    <p className="text-base text-gray-700 mb-1">{profileData.titulo}</p>
                    <p className="text-sm text-gray-600">
                      {profileData.programa} · {profileData.semestre}
                    </p>
                  </div>
                  
                  {isOwnProfile ? (
                    <Button
                      variant="outline"
                      className="gap-2 border-[#003DA5] text-[#003DA5] hover:bg-[#003DA5] hover:text-white font-semibold"
                      onClick={() => toast.info('Editar perfil')}
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar perfil
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button className="gap-2 bg-[#003DA5] hover:bg-[#002d7a] font-semibold">
                        <Plus className="w-4 h-4" />
                        Conectar
                      </Button>
                      <Button variant="outline" className="gap-2 font-semibold">
                        <Mail className="w-4 h-4" />
                        Mensaje
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {profileData.ubicacion}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {profileData.conexiones} conexiones
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4" />
                    {profileData.email}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4" />
                    {profileData.telefono}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Acerca de */}
          <div className="bg-white px-6 py-5 mb-2 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">Acerca de</h2>
              {isOwnProfile && (
                <Button variant="ghost" size="sm" onClick={() => toast.info('Editar acerca de')}>
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {profileData.acercaDe}
            </p>
          </div>

          {/* Experiencia */}
          <div className="bg-white px-6 py-5 mb-2 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Experiencia</h2>
              {isOwnProfile && (
                <Button variant="ghost" size="sm" onClick={() => toast.info('Agregar experiencia')}>
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="space-y-5">
              {profileData.experiencia.map((exp) => (
                <div key={exp.id} className="flex gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-2xl flex-shrink-0">
                    {exp.logo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">{exp.cargo}</h3>
                    <p className="text-sm text-gray-700">{exp.organizacion} · {exp.tipo}</p>
                    <p className="text-sm text-gray-600">{exp.periodo}</p>
                    <p className="text-sm text-gray-600">{exp.ubicacion}</p>
                    <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                      {exp.descripcion}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Educación */}
          <div className="bg-white px-6 py-5 mb-2 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Educación</h2>
              {isOwnProfile && (
                <Button variant="ghost" size="sm" onClick={() => toast.info('Agregar educación')}>
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="space-y-5">
              {profileData.educacion.map((edu) => (
                <div key={edu.id} className="flex gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-2xl flex-shrink-0">
                    {edu.logo}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{edu.institucion}</h3>
                    <p className="text-sm text-gray-700">{edu.titulo}</p>
                    <p className="text-sm text-gray-600">{edu.periodo}</p>
                    <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                      {edu.descripcion}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Certificaciones */}
          <div className="bg-white px-6 py-5 mb-2 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Licencias y Certificaciones</h2>
              {isOwnProfile && (
                <Button variant="ghost" size="sm" onClick={() => toast.info('Agregar certificación')}>
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="space-y-4">
              {profileData.certificaciones.map((cert) => (
                <div key={cert.id} className="flex gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-2xl flex-shrink-0">
                    {cert.logo}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{cert.nombre}</h3>
                    <p className="text-sm text-gray-700">{cert.emisor}</p>
                    <p className="text-sm text-gray-600">Emitido en {cert.fecha}</p>
                    <p className="text-xs text-gray-500 mt-1">{cert.credencial}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Habilidades */}
          <div className="bg-white px-6 py-5 mb-2 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Habilidades</h2>
              {isOwnProfile && (
                <Button variant="ghost" size="sm" onClick={() => toast.info('Agregar habilidad')}>
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profileData.habilidades.map((skill, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="font-medium text-gray-900">{skill.nombre}</span>
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    {skill.endorsements}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Proyectos */}
          <div className="bg-white px-6 py-5 mb-2 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Proyectos</h2>
              {isOwnProfile && (
                <Button variant="ghost" size="sm" onClick={() => toast.info('Agregar proyecto')}>
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="space-y-4">
              {profileData.proyectos.map((proyecto) => (
                <div key={proyecto.id}>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{proyecto.nombre}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {proyecto.estado}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed mb-1">
                    {proyecto.descripcion}
                  </p>
                  <p className="text-sm text-gray-600">{proyecto.periodo}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Idiomas */}
          <div className="bg-white px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Idiomas</h2>
              {isOwnProfile && (
                <Button variant="ghost" size="sm" onClick={() => toast.info('Agregar idioma')}>
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {profileData.idiomas.map((idioma, idx) => (
                <div 
                  key={idx} 
                  className="px-4 py-2 bg-gray-50 rounded-lg"
                >
                  <span className="font-medium text-gray-900">{idioma.idioma}</span>
                  <span className="text-sm text-gray-600 ml-2">· {idioma.nivel}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
