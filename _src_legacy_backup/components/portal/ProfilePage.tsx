import { useState } from 'react';
import { 
  Camera, 
  MapPin, 
  Mail,
  Phone,
  Plus,
  Edit2,
  Users,
  ArrowLeft,
  Save,
  X,
  Trash2,
  CreditCard,
  UserCheck,
  CheckCircle,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner@2.0.3';

interface ProfilePageProps {
  userData: {
    nombre: string;
    email: string;
    programa: string;
    foto?: string;
  };
  isOwnProfile?: boolean;
  onBack?: () => void;
}

export function ProfilePage({ 
  userData, 
  isOwnProfile = true,
  onBack
}: ProfilePageProps) {
  // Estados de edición por sección
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);

  // Mock data profesional - En producción vendría de props o API
  const [profileData, setProfileData] = useState({
    coverImage: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=300&fit=crop',
    avatar: userData.foto || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    nombre: userData.nombre,
    titulo: 'Estudiante de Administración Pública',
    programa: userData.programa,
    semestre: '6to Semestre',
    documento: '1.234.567.890',
    email: userData.email,
    rolAsignado: 'Estudiante',
    estado: 'Activo',
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
      { id: 1, nombre: 'Políticas Públicas', endorsements: 12 },
      { id: 2, nombre: 'Gestión Territorial', endorsements: 10 },
      { id: 3, nombre: 'Análisis de Datos', endorsements: 8 },
      { id: 4, nombre: 'Investigación Social', endorsements: 7 },
      { id: 5, nombre: 'Gestión de Proyectos', endorsements: 6 },
      { id: 6, nombre: 'Gobierno Digital', endorsements: 5 },
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
      { id: 1, idioma: 'Español', nivel: 'Nativo' },
      { id: 2, idioma: 'Inglés', nivel: 'Intermedio' },
    ],

    conexiones: 234,
  });

  // Datos temporales para edición
  const [tempData, setTempData] = useState<any>(null);

  // Función para iniciar edición
  const startEditing = (section: string, itemId?: number) => {
    setEditingSection(section);
    setEditingItemId(itemId || null);
    
    // Guardar datos temporales
    if (itemId) {
      const item = (profileData as any)[section].find((i: any) => i.id === itemId);
      setTempData({ ...item });
    } else if (section === 'acercaDe') {
      setTempData(profileData.acercaDe);
    } else if (section === 'infoBasica') {
      setTempData({
        titulo: profileData.titulo,
        ubicacion: profileData.ubicacion,
        telefono: profileData.telefono,
      });
    }
  };

  // Función para cancelar edición
  const cancelEditing = () => {
    setEditingSection(null);
    setEditingItemId(null);
    setTempData(null);
  };

  // Función para guardar cambios
  const saveChanges = () => {
    if (editingSection === 'acercaDe') {
      setProfileData({ ...profileData, acercaDe: tempData });
      toast.success('Información actualizada correctamente');
    } else if (editingSection === 'infoBasica') {
      setProfileData({
        ...profileData,
        titulo: tempData.titulo,
        ubicacion: tempData.ubicacion,
        telefono: tempData.telefono,
      });
      toast.success('Información básica actualizada');
    } else if (editingItemId) {
      const updatedItems = (profileData as any)[editingSection].map((item: any) =>
        item.id === editingItemId ? tempData : item
      );
      setProfileData({ ...profileData, [editingSection]: updatedItems });
      toast.success('Cambios guardados correctamente');
    }
    
    cancelEditing();
  };

  // Función para agregar nuevo item
  const addNewItem = (section: string) => {
    const newId = Math.max(...(profileData as any)[section].map((i: any) => i.id), 0) + 1;
    
    let newItem: any = { id: newId };
    
    if (section === 'experiencia') {
      newItem = {
        ...newItem,
        cargo: 'Nuevo Cargo',
        organizacion: 'Organización',
        tipo: 'Empleo',
        ubicacion: 'Ciudad, País',
        periodo: 'Mes Año - Presente',
        descripcion: 'Descripción de responsabilidades...',
        logo: '💼',
      };
    } else if (section === 'educacion') {
      newItem = {
        ...newItem,
        institucion: 'Institución',
        titulo: 'Título',
        periodo: 'Año - Año',
        estado: 'En curso',
        descripcion: 'Descripción...',
        logo: '🎓',
      };
    } else if (section === 'certificaciones') {
      newItem = {
        ...newItem,
        nombre: 'Nombre de la Certificación',
        emisor: 'Organización Emisora',
        fecha: 'Mes Año',
        credencial: 'Credencial ID: XXX',
        logo: '📜',
      };
    } else if (section === 'habilidades') {
      newItem = {
        ...newItem,
        nombre: 'Nueva Habilidad',
        endorsements: 0,
      };
    } else if (section === 'proyectos') {
      newItem = {
        ...newItem,
        nombre: 'Nombre del Proyecto',
        descripcion: 'Descripción del proyecto...',
        periodo: 'Año - Año',
        estado: 'En desarrollo',
      };
    } else if (section === 'idiomas') {
      newItem = {
        ...newItem,
        idioma: 'Idioma',
        nivel: 'Nivel',
      };
    }
    
    const updatedItems = [...(profileData as any)[section], newItem];
    setProfileData({ ...profileData, [section]: updatedItems });
    startEditing(section, newId);
  };

  // Función para eliminar item
  const deleteItem = (section: string, itemId: number) => {
    const updatedItems = (profileData as any)[section].filter((item: any) => item.id !== itemId);
    setProfileData({ ...profileData, [section]: updatedItems });
    toast.success('Elemento eliminado');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con Cover */}
      <div className="relative h-48 sm:h-64 bg-gradient-to-r from-[#003DA5] to-[#0052d4] overflow-hidden">
        <img 
          src={profileData.coverImage} 
          alt="Cover" 
          className="w-full h-full object-cover opacity-30"
        />
        
        {/* Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-4 left-4 px-4 py-2 bg-white/90 hover:bg-white rounded-lg flex items-center gap-2 transition-all shadow-lg backdrop-blur-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>
        )}

        {isOwnProfile && (
          <button
            onClick={() => toast.info('Cambiar foto de portada')}
            className="absolute bottom-4 right-4 px-4 py-2 bg-white rounded-lg flex items-center gap-2 font-medium hover:bg-gray-50 transition-all shadow-md"
          >
            <Camera className="w-4 h-4" />
            Editar portada
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-20 sm:-mt-24 pb-12">
        {/* Profile Header Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <Avatar className="w-32 h-32 sm:w-40 sm:h-40 border-4 border-white shadow-xl bg-white">
                <AvatarImage src={profileData.avatar} alt={profileData.nombre} />
                <AvatarFallback className="bg-[#003DA5] text-white text-4xl">
                  {profileData.nombre.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {isOwnProfile && (
                <button 
                  onClick={() => toast.info('Cambiar foto de perfil')}
                  className="absolute bottom-2 right-2 w-10 h-10 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center border-2 border-gray-200 shadow-md transition-all"
                >
                  <Camera className="w-5 h-5 text-gray-600" />
                </button>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {editingSection === 'infoBasica' ? (
                // Modo edición info básica
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Título profesional</label>
                    <Input
                      value={tempData.titulo}
                      onChange={(e) => setTempData({ ...tempData, titulo: e.target.value })}
                      placeholder="Ej: Estudiante de Administración Pública"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                    <Input
                      value={tempData.ubicacion}
                      onChange={(e) => setTempData({ ...tempData, ubicacion: e.target.value })}
                      placeholder="Ciudad, País"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <Input
                      value={tempData.telefono}
                      onChange={(e) => setTempData({ ...tempData, telefono: e.target.value })}
                      placeholder="+57 300 123 4567"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={saveChanges} className="gap-2">
                      <Save className="w-4 h-4" />
                      Guardar
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEditing}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                // Modo visualización
                <>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">{profileData.nombre}</h1>
                      <p className="text-lg text-gray-700 mb-1">{profileData.titulo}</p>
                      <p className="text-gray-600">
                        {profileData.programa} · {profileData.semestre}
                      </p>
                    </div>
                    
                    {isOwnProfile ? (
                      <Button
                        variant="outline"
                        className="gap-2 border-[#003DA5] text-[#003DA5] hover:bg-[#003DA5] hover:text-white font-semibold"
                        onClick={() => startEditing('infoBasica')}
                      >
                        <Edit2 className="w-4 h-4" />
                        Editar info
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

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      <span>CC {profileData.documento}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {profileData.email}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-[#003DA5]" />
                      <span className="font-medium text-[#003DA5]">{profileData.rolAsignado}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-600">{profileData.estado}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Acerca de */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Acerca de</h2>
            {isOwnProfile && editingSection !== 'acercaDe' && (
              <Button variant="ghost" size="sm" onClick={() => startEditing('acercaDe')}>
                <Edit2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {editingSection === 'acercaDe' ? (
            <div className="space-y-3">
              <Textarea
                value={tempData}
                onChange={(e) => setTempData(e.target.value)}
                rows={6}
                className="resize-none"
                placeholder="Describe tu experiencia, objetivos y pasiones profesionales..."
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveChanges} className="gap-2">
                  <Save className="w-4 h-4" />
                  Guardar
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEditing}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-gray-700 leading-relaxed">
              {profileData.acercaDe}
            </p>
          )}
        </div>

        {/* Experiencia */}
        <ExperienciaSection
          items={profileData.experiencia}
          isOwnProfile={isOwnProfile}
          editingItemId={editingItemId}
          editingSection={editingSection}
          tempData={tempData}
          setTempData={setTempData}
          startEditing={startEditing}
          saveChanges={saveChanges}
          cancelEditing={cancelEditing}
          addNewItem={addNewItem}
          deleteItem={deleteItem}
        />

        {/* Educación */}
        <EducacionSection
          items={profileData.educacion}
          isOwnProfile={isOwnProfile}
          editingItemId={editingItemId}
          editingSection={editingSection}
          tempData={tempData}
          setTempData={setTempData}
          startEditing={startEditing}
          saveChanges={saveChanges}
          cancelEditing={cancelEditing}
          addNewItem={addNewItem}
          deleteItem={deleteItem}
        />

        {/* Certificaciones */}
        <CertificacionesSection
          items={profileData.certificaciones}
          isOwnProfile={isOwnProfile}
          editingItemId={editingItemId}
          editingSection={editingSection}
          tempData={tempData}
          setTempData={setTempData}
          startEditing={startEditing}
          saveChanges={saveChanges}
          cancelEditing={cancelEditing}
          addNewItem={addNewItem}
          deleteItem={deleteItem}
        />

        {/* Habilidades */}
        <HabilidadesSection
          items={profileData.habilidades}
          isOwnProfile={isOwnProfile}
          editingItemId={editingItemId}
          editingSection={editingSection}
          tempData={tempData}
          setTempData={setTempData}
          startEditing={startEditing}
          saveChanges={saveChanges}
          cancelEditing={cancelEditing}
          addNewItem={addNewItem}
          deleteItem={deleteItem}
        />

        {/* Proyectos */}
        <ProyectosSection
          items={profileData.proyectos}
          isOwnProfile={isOwnProfile}
          editingItemId={editingItemId}
          editingSection={editingSection}
          tempData={tempData}
          setTempData={setTempData}
          startEditing={startEditing}
          saveChanges={saveChanges}
          cancelEditing={cancelEditing}
          addNewItem={addNewItem}
          deleteItem={deleteItem}
        />

        {/* Idiomas */}
        <IdiomasSection
          items={profileData.idiomas}
          isOwnProfile={isOwnProfile}
          editingItemId={editingItemId}
          editingSection={editingSection}
          tempData={tempData}
          setTempData={setTempData}
          startEditing={startEditing}
          saveChanges={saveChanges}
          cancelEditing={cancelEditing}
          addNewItem={addNewItem}
          deleteItem={deleteItem}
        />
      </div>
    </div>
  );
}

// Componente de Experiencia
function ExperienciaSection({ items, isOwnProfile, editingItemId, editingSection, tempData, setTempData, startEditing, saveChanges, cancelEditing, addNewItem, deleteItem }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Experiencia</h2>
        {isOwnProfile && (
          <Button variant="ghost" size="sm" onClick={() => addNewItem('experiencia')}>
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>
      <div className="space-y-6">
        {items.map((exp: any) => (
          <div key={exp.id}>
            {editingSection === 'experiencia' && editingItemId === exp.id ? (
              // Modo edición
              <div className="space-y-3 p-4 border-2 border-[#003DA5] rounded-lg bg-blue-50/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                    <Input
                      value={tempData.cargo}
                      onChange={(e) => setTempData({ ...tempData, cargo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Organización</label>
                    <Input
                      value={tempData.organizacion}
                      onChange={(e) => setTempData({ ...tempData, organizacion: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <Input
                      value={tempData.tipo}
                      onChange={(e) => setTempData({ ...tempData, tipo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                    <Input
                      value={tempData.ubicacion}
                      onChange={(e) => setTempData({ ...tempData, ubicacion: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Periodo</label>
                    <Input
                      value={tempData.periodo}
                      onChange={(e) => setTempData({ ...tempData, periodo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Emoji</label>
                    <Input
                      value={tempData.logo}
                      onChange={(e) => setTempData({ ...tempData, logo: e.target.value })}
                      maxLength={2}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <Textarea
                    value={tempData.descripcion}
                    onChange={(e) => setTempData({ ...tempData, descripcion: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={saveChanges} className="gap-2">
                    <Save className="w-4 h-4" />
                    Guardar
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEditing}>
                    Cancelar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => {
                      deleteItem('experiencia', exp.id);
                      cancelEditing();
                    }}
                    className="ml-auto gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </Button>
                </div>
              </div>
            ) : (
              // Modo visualización
              <div className="flex gap-4 group">
                <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center text-3xl flex-shrink-0">
                  {exp.logo}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{exp.cargo}</h3>
                      <p className="text-gray-700 mb-1">{exp.organizacion} · {exp.tipo}</p>
                      <p className="text-sm text-gray-600 mb-1">{exp.periodo}</p>
                      <p className="text-sm text-gray-600 mb-3">{exp.ubicacion}</p>
                      <p className="text-gray-700 leading-relaxed">
                        {exp.descripcion}
                      </p>
                    </div>
                    {isOwnProfile && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing('experiencia', exp.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Componente de Educación
function EducacionSection({ items, isOwnProfile, editingItemId, editingSection, tempData, setTempData, startEditing, saveChanges, cancelEditing, addNewItem, deleteItem }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Educación</h2>
        {isOwnProfile && (
          <Button variant="ghost" size="sm" onClick={() => addNewItem('educacion')}>
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>
      <div className="space-y-6">
        {items.map((edu: any) => (
          <div key={edu.id}>
            {editingSection === 'educacion' && editingItemId === edu.id ? (
              <div className="space-y-3 p-4 border-2 border-[#003DA5] rounded-lg bg-blue-50/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Institución</label>
                    <Input
                      value={tempData.institucion}
                      onChange={(e) => setTempData({ ...tempData, institucion: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                    <Input
                      value={tempData.titulo}
                      onChange={(e) => setTempData({ ...tempData, titulo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Periodo</label>
                    <Input
                      value={tempData.periodo}
                      onChange={(e) => setTempData({ ...tempData, periodo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <Input
                      value={tempData.estado}
                      onChange={(e) => setTempData({ ...tempData, estado: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Emoji</label>
                    <Input
                      value={tempData.logo}
                      onChange={(e) => setTempData({ ...tempData, logo: e.target.value })}
                      maxLength={2}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <Textarea
                    value={tempData.descripcion}
                    onChange={(e) => setTempData({ ...tempData, descripcion: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={saveChanges} className="gap-2">
                    <Save className="w-4 h-4" />
                    Guardar
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEditing}>
                    Cancelar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => {
                      deleteItem('educacion', edu.id);
                      cancelEditing();
                    }}
                    className="ml-auto gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-4 group">
                <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center text-3xl flex-shrink-0">
                  {edu.logo}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{edu.institucion}</h3>
                      <p className="text-gray-700 mb-1">{edu.titulo}</p>
                      <p className="text-sm text-gray-600 mb-3">{edu.periodo}</p>
                      <p className="text-gray-700 leading-relaxed">
                        {edu.descripcion}
                      </p>
                    </div>
                    {isOwnProfile && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing('educacion', edu.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Componente de Certificaciones
function CertificacionesSection({ items, isOwnProfile, editingItemId, editingSection, tempData, setTempData, startEditing, saveChanges, cancelEditing, addNewItem, deleteItem }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Licencias y Certificaciones</h2>
        {isOwnProfile && (
          <Button variant="ghost" size="sm" onClick={() => addNewItem('certificaciones')}>
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>
      <div className="space-y-5">
        {items.map((cert: any) => (
          <div key={cert.id}>
            {editingSection === 'certificaciones' && editingItemId === cert.id ? (
              <div className="space-y-3 p-4 border-2 border-[#003DA5] rounded-lg bg-blue-50/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <Input
                      value={tempData.nombre}
                      onChange={(e) => setTempData({ ...tempData, nombre: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Emisor</label>
                    <Input
                      value={tempData.emisor}
                      onChange={(e) => setTempData({ ...tempData, emisor: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                    <Input
                      value={tempData.fecha}
                      onChange={(e) => setTempData({ ...tempData, fecha: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Credencial</label>
                    <Input
                      value={tempData.credencial}
                      onChange={(e) => setTempData({ ...tempData, credencial: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Emoji</label>
                    <Input
                      value={tempData.logo}
                      onChange={(e) => setTempData({ ...tempData, logo: e.target.value })}
                      maxLength={2}
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={saveChanges} className="gap-2">
                    <Save className="w-4 h-4" />
                    Guardar
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEditing}>
                    Cancelar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => {
                      deleteItem('certificaciones', cert.id);
                      cancelEditing();
                    }}
                    className="ml-auto gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-4 group">
                <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center text-3xl flex-shrink-0">
                  {cert.logo}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{cert.nombre}</h3>
                      <p className="text-gray-700 mb-1">{cert.emisor}</p>
                      <p className="text-sm text-gray-600 mb-1">Emitido en {cert.fecha}</p>
                      <p className="text-xs text-gray-500">{cert.credencial}</p>
                    </div>
                    {isOwnProfile && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing('certificaciones', cert.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Componente de Habilidades
function HabilidadesSection({ items, isOwnProfile, editingItemId, editingSection, tempData, setTempData, startEditing, saveChanges, cancelEditing, addNewItem, deleteItem }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Habilidades</h2>
        {isOwnProfile && (
          <Button variant="ghost" size="sm" onClick={() => addNewItem('habilidades')}>
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((skill: any) => (
          <div key={skill.id}>
            {editingSection === 'habilidades' && editingItemId === skill.id ? (
              <div className="p-3 border-2 border-[#003DA5] rounded-xl bg-blue-50/50 space-y-2">
                <Input
                  value={tempData.nombre}
                  onChange={(e) => setTempData({ ...tempData, nombre: e.target.value })}
                  placeholder="Nombre de la habilidad"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveChanges} className="gap-1">
                    <Save className="w-3 h-3" />
                    Guardar
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEditing}>
                    Cancelar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => {
                      deleteItem('habilidades', skill.id);
                      cancelEditing();
                    }}
                    className="ml-auto"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                <span className="font-medium text-gray-900">{skill.nombre}</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    {skill.endorsements}
                  </div>
                  {isOwnProfile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditing('habilidades', skill.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Componente de Proyectos
function ProyectosSection({ items, isOwnProfile, editingItemId, editingSection, tempData, setTempData, startEditing, saveChanges, cancelEditing, addNewItem, deleteItem }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Proyectos</h2>
        {isOwnProfile && (
          <Button variant="ghost" size="sm" onClick={() => addNewItem('proyectos')}>
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>
      <div className="space-y-5">
        {items.map((proyecto: any) => (
          <div key={proyecto.id}>
            {editingSection === 'proyectos' && editingItemId === proyecto.id ? (
              <div className="space-y-3 p-4 border-2 border-[#003DA5] rounded-lg bg-blue-50/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <Input
                      value={tempData.nombre}
                      onChange={(e) => setTempData({ ...tempData, nombre: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Periodo</label>
                    <Input
                      value={tempData.periodo}
                      onChange={(e) => setTempData({ ...tempData, periodo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <Input
                      value={tempData.estado}
                      onChange={(e) => setTempData({ ...tempData, estado: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <Textarea
                    value={tempData.descripcion}
                    onChange={(e) => setTempData({ ...tempData, descripcion: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={saveChanges} className="gap-2">
                    <Save className="w-4 h-4" />
                    Guardar
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEditing}>
                    Cancelar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => {
                      deleteItem('proyectos', proyecto.id);
                      cancelEditing();
                    }}
                    className="ml-auto gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="group">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{proyecto.nombre}</h3>
                      <Badge variant="secondary" className="text-sm">
                        {proyecto.estado}
                      </Badge>
                    </div>
                    <p className="text-gray-700 leading-relaxed mb-2">
                      {proyecto.descripcion}
                    </p>
                    <p className="text-sm text-gray-600">{proyecto.periodo}</p>
                  </div>
                  {isOwnProfile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditing('proyectos', proyecto.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Componente de Idiomas
function IdiomasSection({ items, isOwnProfile, editingItemId, editingSection, tempData, setTempData, startEditing, saveChanges, cancelEditing, addNewItem, deleteItem }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Idiomas</h2>
        {isOwnProfile && (
          <Button variant="ghost" size="sm" onClick={() => addNewItem('idiomas')}>
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        {items.map((idioma: any) => (
          <div key={idioma.id}>
            {editingSection === 'idiomas' && editingItemId === idioma.id ? (
              <div className="p-3 border-2 border-[#003DA5] rounded-xl bg-blue-50/50 space-y-2 min-w-[200px]">
                <Input
                  value={tempData.idioma}
                  onChange={(e) => setTempData({ ...tempData, idioma: e.target.value })}
                  placeholder="Idioma"
                />
                <Input
                  value={tempData.nivel}
                  onChange={(e) => setTempData({ ...tempData, nivel: e.target.value })}
                  placeholder="Nivel"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveChanges} className="gap-1">
                    <Save className="w-3 h-3" />
                    Guardar
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEditing}>
                    Cancelar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => {
                      deleteItem('idiomas', idioma.id);
                      cancelEditing();
                    }}
                    className="ml-auto"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="px-5 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group relative">
                <span className="font-medium text-gray-900">{idioma.idioma}</span>
                <span className="text-gray-600 ml-2">· {idioma.nivel}</span>
                {isOwnProfile && (
                  <button
                    onClick={() => startEditing('idiomas', idioma.id)}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-gray-200"
                  >
                    <Edit2 className="w-3 h-3 text-gray-600" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}