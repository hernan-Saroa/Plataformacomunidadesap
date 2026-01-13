/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PERFIL DE USUARIO COMPLETO - PORTAL TRANSACCIONAL
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Versión avanzada del perfil con:
 * - Tabs organizacionales
 * - Campos editables y no editables
 * - Control granular de privacidad
 * - Auto-guardado inteligente
 * - Historial de cambios
 * - Exportar datos (GDPR)
 * - Vista previa pública
 * - Progreso de completitud
 * - Drag & Drop foto de perfil
 * 
 * FECHA: 4 Enero 2026
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '../../ui/avatar';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  Shield,
  Eye,
  EyeOff,
  Camera,
  Lock,
  Check,
  Save,
  Download,
  History,
  AlertCircle,
  FileText,
  Clock,
  X,
  Upload,
  Globe,
  Home,
  IdCard,
  Users,
  Building2,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Info
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface PerfilUsuarioCompletoPTProps {
  usuario: {
    nombre: string;
    apellidos: string;
    email: string;
    telefono: string;
    extension: string;
    cargo: string;
    area: string;
    dependencia: string;
    ubicacion: string;
    rol: 'Administrativo' | 'Docente' | 'Estudiante';
  };
  onVolver: () => void;
}

interface DatosPersonales {
  nombres: string;
  apellidos: string;
  documentoTipo: string;
  documentoNumero: string;
  fechaNacimiento: string;
  genero: string;
  estadoCivil: string;
  nacionalidad: string;
  email: string;
  telefono: string;
  celular: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  pais: string;
  biografia: string;
}

interface DatosLaborales {
  cargo: string;
  dependencia: string;
  area: string;
  tipoContrato: string;
  fechaIngreso: string;
  extension: string;
  sede: string;
  jornada: string;
}

interface DatosAcademicos {
  programa: string;
  codigoEstudiante: string;
  semestre: string;
  modalidad: string;
  sede: string;
  promedio: string;
}

interface CambioHistorial {
  id: string;
  fecha: Date;
  campo: string;
  valorAnterior: string;
  valorNuevo: string;
  categoria: 'personal' | 'laboral' | 'academico' | 'privacidad' | 'foto';
}

export function PerfilUsuarioCompletoPT({ usuario, onVolver }: PerfilUsuarioCompletoPTProps) {
  // Estados principales
  const [datosPersonales, setDatosPersonales] = useState<DatosPersonales>({
    nombres: usuario.nombre,
    apellidos: usuario.apellidos,
    documentoTipo: 'CC',
    documentoNumero: '1012345678',
    fechaNacimiento: '1990-05-15',
    genero: 'Masculino',
    estadoCivil: 'Soltero',
    nacionalidad: 'Colombiana',
    email: usuario.email,
    telefono: usuario.telefono,
    celular: '+57 310 555 7890',
    direccion: 'Calle 44 #53-37',
    ciudad: 'Bogotá D.C.',
    departamento: 'Cundinamarca',
    pais: 'Colombia',
    biografia: 'Profesional comprometido con la excelencia en el servicio público y la gestión administrativa institucional.',
  });

  const [datosLaborales, setDatosLaborales] = useState<DatosLaborales>({
    cargo: usuario.cargo,
    dependencia: usuario.dependencia,
    area: usuario.area,
    tipoContrato: 'Planta Permanente',
    fechaIngreso: '2020-03-01',
    extension: usuario.extension,
    sede: 'Bogotá',
    jornada: 'Diurna',
  });

  const [datosAcademicos, setDatosAcademicos] = useState<DatosAcademicos>({
    programa: 'Administración Pública',
    codigoEstudiante: 'EST-2024-001',
    semestre: '6',
    modalidad: 'Presencial',
    sede: 'Bogotá',
    promedio: '4.2',
  });

  const [privacidadDatos, setPrivacidadDatos] = useState<Record<string, boolean>>({
    telefono: false,
    celular: false,
    email: true,
    direccion: false,
    fechaNacimiento: false,
    documentoNumero: false,
    biografia: true,
    ciudad: true,
  });

  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [autoGuardando, setAutoGuardando] = useState(false);
  const [ultimoGuardado, setUltimoGuardado] = useState<Date>(new Date());
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [tabActual, setTabActual] = useState('personal');

  // Historial de cambios (mock data)
  const [historialCambios] = useState<CambioHistorial[]>([
    {
      id: '1',
      fecha: new Date('2025-01-04T10:30:00'),
      campo: 'Celular',
      valorAnterior: '+57 310 555 0000',
      valorNuevo: '+57 310 555 7890',
      categoria: 'personal'
    },
    {
      id: '2',
      fecha: new Date('2025-01-03T15:45:00'),
      campo: 'Email',
      valorAnterior: 'Privado',
      valorNuevo: 'Público',
      categoria: 'privacidad'
    },
    {
      id: '3',
      fecha: new Date('2025-01-02T09:20:00'),
      campo: 'Biografía',
      valorAnterior: '',
      valorNuevo: 'Profesional comprometido...',
      categoria: 'personal'
    },
    {
      id: '4',
      fecha: new Date('2025-01-01T14:10:00'),
      campo: 'Foto de perfil',
      valorAnterior: 'Sin foto',
      valorNuevo: 'Actualizada',
      categoria: 'foto'
    },
  ]);

  // Auto-guardado
  useEffect(() => {
    const timer = setTimeout(() => {
      if (autoGuardando) {
        setAutoGuardando(false);
        setUltimoGuardado(new Date());
        toast.success('Cambios guardados automáticamente', { duration: 2000 });
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [autoGuardando]);

  const handleAutoGuardar = () => {
    setAutoGuardando(true);
  };

  const handleCambioDatosPersonales = (campo: keyof DatosPersonales, valor: string) => {
    setDatosPersonales(prev => ({ ...prev, [campo]: valor }));
    handleAutoGuardar();
  };

  const handleCambioDatosLaborales = (campo: keyof DatosLaborales, valor: string) => {
    setDatosLaborales(prev => ({ ...prev, [campo]: valor }));
    handleAutoGuardar();
  };

  const togglePrivacidad = (campo: string) => {
    setPrivacidadDatos(prev => ({
      ...prev,
      [campo]: !prev[campo]
    }));
    handleAutoGuardar();
    toast.success(
      privacidadDatos[campo] ? 'Campo configurado como privado' : 'Campo configurado como público',
      { duration: 2000 }
    );
  };

  // Drag & Drop para foto
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleArchivoFoto(e.dataTransfer.files[0]);
    }
  };

  const handleCambioFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleArchivoFoto(e.target.files[0]);
    }
  };

  const handleArchivoFoto = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona una imagen válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFotoPerfil(reader.result as string);
      handleAutoGuardar();
      toast.success('Foto de perfil actualizada', { duration: 2000 });
    };
    reader.readAsDataURL(file);
  };

  // Calcular completitud del perfil
  const calcularCompletitud = () => {
    let campos = 0;
    let completados = 0;

    Object.entries(datosPersonales).forEach(([, value]) => {
      campos++;
      if (value && value.toString().trim() !== '') completados++;
    });

    if (fotoPerfil) completados += 2; // La foto vale doble
    campos += 2;

    return Math.round((completados / campos) * 100);
  };

  const completitud = calcularCompletitud();

  // Exportar datos (GDPR Compliance)
  const handleExportarDatos = () => {
    const datosExportar = {
      informacionPersonal: datosPersonales,
      informacionLaboral: datosLaborales,
      informacionAcademica: datosAcademicos,
      configuracionPrivacidad: privacidadDatos,
      metadata: {
        fechaExportacion: new Date().toISOString(),
        nombreCompleto: `${datosPersonales.nombres} ${datosPersonales.apellidos}`,
        rol: usuario.rol,
      }
    };

    const blob = new Blob([JSON.stringify(datosExportar, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `perfil_esap_${datosPersonales.nombres}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Datos exportados exitosamente', {
      description: 'Tu información ha sido descargada en formato JSON',
      duration: 3000,
    });
  };

  const formatearFecha = (fecha: Date) => {
    const ahora = new Date();
    const diferencia = ahora.getTime() - fecha.getTime();
    const segundos = Math.floor(diferencia / 1000);
    
    if (segundos < 60) return 'Hace unos segundos';
    if (segundos < 3600) return `Hace ${Math.floor(segundos / 60)} minutos`;
    return fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  };

  const formatearFechaCompleta = (fecha: Date) => {
    return fecha.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoriaColor = (categoria: string) => {
    const colores = {
      personal: 'bg-blue-100 text-blue-700 border-blue-300',
      laboral: 'bg-purple-100 text-purple-700 border-purple-300',
      academico: 'bg-green-100 text-green-700 border-green-300',
      privacidad: 'bg-orange-100 text-orange-700 border-orange-300',
      foto: 'bg-pink-100 text-pink-700 border-pink-300',
    };
    return colores[categoria as keyof typeof colores] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Sticky */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onVolver}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group px-3 py-2 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium">Volver al Dashboard</span>
              </button>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Mi Perfil</h1>
                <p className="text-xs text-gray-500">Gestiona tu información y privacidad</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMostrarPreview(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Vista Pública
              </button>
              
              <button
                onClick={handleExportarDatos}
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar
              </button>

              <button
                onClick={() => setMostrarHistorial(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <History className="w-4 h-4" />
                Historial
              </button>

              {/* Auto-save indicator */}
              <AnimatePresence mode="wait">
                {autoGuardando ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-2 text-sm text-[#F57C00] bg-orange-50 px-3 py-2 rounded-lg border border-orange-200"
                  >
                    <Save className="w-4 h-4 animate-pulse" />
                    <span className="font-medium">Guardando...</span>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200"
                  >
                    <Check className="w-4 h-4" />
                    <span className="font-medium">Guardado {formatearFecha(ultimoGuardado)}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Progress bar de completitud */}
          <div className="pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#2962FF]" />
                <span className="text-sm font-bold text-gray-700">Completitud del perfil</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-[#2962FF]">{completitud}%</span>
                {completitud === 100 && (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                )}
              </div>
            </div>
            <Progress value={completitud} className="h-2.5 bg-gray-200" style={{
              ['--progress-background' as any]: completitud === 100 ? '#4CAF50' : '#2962FF'
            }} />
            {completitud < 100 && (
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Completa tu perfil para mejorar tu visibilidad en la comunidad ESAP
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Main Content - Tabs - Sin grid wrapper ya que el portal maneja el layout */}
        <div>
            <Card className="border-0 shadow-md">
              <Tabs value={tabActual} onValueChange={setTabActual} className="w-full">
                <div className="border-b border-gray-200 px-6 pt-6">
                  <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-lg">
                    <TabsTrigger value="personal" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#2962FF] data-[state=active]:shadow-sm">
                      <User className="w-4 h-4" />
                      <span className="hidden sm:inline">Personal</span>
                    </TabsTrigger>
                    <TabsTrigger value="laboral" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#2962FF] data-[state=active]:shadow-sm">
                      <Briefcase className="w-4 h-4" />
                      <span className="hidden sm:inline">Laboral</span>
                    </TabsTrigger>
                    <TabsTrigger value="privacidad" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#2962FF] data-[state=active]:shadow-sm">
                      <Shield className="w-4 h-4" />
                      <span className="hidden sm:inline">Privacidad</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Tab: Personal */}
                <TabsContent value="personal" className="p-6 space-y-6">
                  {/* Información de Identidad */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <IdCard className="w-5 h-5 text-[#2962FF]" />
                      Información de Identidad
                      <Badge className="bg-gray-100 text-gray-600 text-xs">Campos bloqueados</Badge>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <CampoPerfilBloqueado
                        label="Nombres"
                        value={datosPersonales.nombres}
                        icono={User}
                      />
                      <CampoPerfilBloqueado
                        label="Apellidos"
                        value={datosPersonales.apellidos}
                        icono={User}
                      />
                      <CampoPerfilBloqueado
                        label="Tipo de Documento"
                        value={datosPersonales.documentoTipo}
                      />
                      <CampoPerfilBloqueado
                        label="Número de Documento"
                        value={datosPersonales.documentoNumero}
                        privado={!privacidadDatos.documentoNumero}
                        onTogglePrivacidad={() => togglePrivacidad('documentoNumero')}
                      />
                      <CampoPerfilBloqueado
                        label="Fecha de Nacimiento"
                        value={new Date(datosPersonales.fechaNacimiento).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
                        icono={Calendar}
                        privado={!privacidadDatos.fechaNacimiento}
                        onTogglePrivacidad={() => togglePrivacidad('fechaNacimiento')}
                      />
                      <CampoPerfilBloqueado
                        label="Género"
                        value={datosPersonales.genero}
                      />
                      <CampoPerfilBloqueado
                        label="Estado Civil"
                        value={datosPersonales.estadoCivil}
                      />
                      <CampoPerfilBloqueado
                        label="Nacionalidad"
                        value={datosPersonales.nacionalidad}
                        icono={Globe}
                      />
                    </div>
                  </div>

                  {/* Información de Contacto */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Phone className="w-5 h-5 text-[#2962FF]" />
                      Información de Contacto
                      <Badge className="bg-blue-100 text-blue-700 text-xs">Editable</Badge>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <CampoPerfilEditable
                        label="Email Institucional"
                        value={datosPersonales.email}
                        onChange={(val) => handleCambioDatosPersonales('email', val)}
                        icono={Mail}
                        privado={!privacidadDatos.email}
                        onTogglePrivacidad={() => togglePrivacidad('email')}
                        bloqueado
                      />
                      <CampoPerfilEditable
                        label="Teléfono Fijo"
                        value={datosPersonales.telefono}
                        onChange={(val) => handleCambioDatosPersonales('telefono', val)}
                        icono={Phone}
                        privado={!privacidadDatos.telefono}
                        onTogglePrivacidad={() => togglePrivacidad('telefono')}
                      />
                      <CampoPerfilEditable
                        label="Celular"
                        value={datosPersonales.celular}
                        onChange={(val) => handleCambioDatosPersonales('celular', val)}
                        icono={Phone}
                        privado={!privacidadDatos.celular}
                        onTogglePrivacidad={() => togglePrivacidad('celular')}
                        className="sm:col-span-2"
                      />
                    </div>
                  </div>

                  {/* Información de Residencia */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Home className="w-5 h-5 text-[#2962FF]" />
                      Información de Residencia
                      <Badge className="bg-blue-100 text-blue-700 text-xs">Editable</Badge>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <CampoPerfilEditable
                        label="Dirección"
                        value={datosPersonales.direccion}
                        onChange={(val) => handleCambioDatosPersonales('direccion', val)}
                        icono={MapPin}
                        privado={!privacidadDatos.direccion}
                        onTogglePrivacidad={() => togglePrivacidad('direccion')}
                        className="sm:col-span-2"
                      />
                      <CampoPerfilEditable
                        label="Ciudad"
                        value={datosPersonales.ciudad}
                        onChange={(val) => handleCambioDatosPersonales('ciudad', val)}
                        privado={!privacidadDatos.ciudad}
                        onTogglePrivacidad={() => togglePrivacidad('ciudad')}
                      />
                      <CampoPerfilEditable
                        label="Departamento"
                        value={datosPersonales.departamento}
                        onChange={(val) => handleCambioDatosPersonales('departamento', val)}
                      />
                      <CampoPerfilBloqueado
                        label="País"
                        value={datosPersonales.pais}
                        icono={Globe}
                      />
                    </div>
                  </div>

                  {/* Biografía */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#2962FF]" />
                      Biografía Profesional
                      <Badge className="bg-blue-100 text-blue-700 text-xs">Editable</Badge>
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-gray-700">
                          Describe brevemente tu trayectoria profesional
                        </label>
                        <button
                          onClick={() => togglePrivacidad('biografia')}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border"
                          style={{
                            backgroundColor: privacidadDatos.biografia ? '#E3F2FD' : '#FFEBEE',
                            color: privacidadDatos.biografia ? '#2962FF' : '#F44336',
                            borderColor: privacidadDatos.biografia ? '#2962FF' : '#F44336'
                          }}
                        >
                          {privacidadDatos.biografia ? (
                            <>
                              <Eye className="w-4 h-4" />
                              Público
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-4 h-4" />
                              Privado
                            </>
                          )}
                        </button>
                      </div>
                      <textarea
                        value={datosPersonales.biografia}
                        onChange={(e) => handleCambioDatosPersonales('biografia', e.target.value.slice(0, 500))}
                        rows={5}
                        maxLength={500}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#2962FF] focus:ring-2 focus:ring-[#2962FF]/20 transition-all text-sm resize-none"
                        placeholder="Cuéntanos sobre tu experiencia, áreas de especialización y logros profesionales..."
                      />
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">
                          {datosPersonales.biografia.length} / 500 caracteres
                        </span>
                        <span className={`font-medium ${datosPersonales.biografia.length > 450 ? 'text-orange-600' : 'text-gray-400'}`}>
                          {datosPersonales.biografia.length > 450 && '¡Casi alcanzas el límite!'}
                        </span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab: Laboral */}
                <TabsContent value="laboral" className="p-6 space-y-6">
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-[#2962FF]" />
                      Información Laboral
                      <Badge className="bg-gray-100 text-gray-600 text-xs">Administrado por Talento Humano</Badge>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <CampoPerfilBloqueado
                        label="Cargo"
                        value={datosLaborales.cargo}
                        icono={Briefcase}
                      />
                      <CampoPerfilBloqueado
                        label="Dependencia"
                        value={datosLaborales.dependencia}
                        icono={Building2}
                      />
                      <CampoPerfilBloqueado
                        label="Área"
                        value={datosLaborales.area}
                      />
                      <CampoPerfilBloqueado
                        label="Tipo de Contrato"
                        value={datosLaborales.tipoContrato}
                      />
                      <CampoPerfilBloqueado
                        label="Fecha de Ingreso"
                        value={new Date(datosLaborales.fechaIngreso).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
                        icono={Calendar}
                      />
                      <CampoPerfilEditable
                        label="Extensión"
                        value={datosLaborales.extension}
                        onChange={(val) => handleCambioDatosLaborales('extension', val)}
                        icono={Phone}
                      />
                      <CampoPerfilBloqueado
                        label="Sede"
                        value={datosLaborales.sede}
                        icono={Building2}
                      />
                      <CampoPerfilBloqueado
                        label="Jornada"
                        value={datosLaborales.jornada}
                        icono={Clock}
                      />
                    </div>
                  </div>

                  {/* Info adicional */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-bold text-blue-900 mb-1">Información Administrada</h4>
                        <p className="text-sm text-blue-700">
                          Los datos laborales son administrados por la Oficina de Talento Humano. 
                          Si encuentras alguna inconsistencia, por favor contacta a tu coordinador de área.
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab: Privacidad */}
                <TabsContent value="privacidad" className="p-6 space-y-6">
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-[#2962FF]" />
                      Control de Privacidad
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Controla qué información es visible para otros usuarios de la plataforma ESAP.
                    </p>

                    <div className="space-y-4">
                      {[
                        { key: 'documentoNumero', label: 'Número de Documento', icono: IdCard },
                        { key: 'fechaNacimiento', label: 'Fecha de Nacimiento', icono: Calendar },
                        { key: 'email', label: 'Email Institucional', icono: Mail },
                        { key: 'telefono', label: 'Teléfono Fijo', icono: Phone },
                        { key: 'celular', label: 'Celular', icono: Phone },
                        { key: 'direccion', label: 'Dirección', icono: MapPin },
                        { key: 'ciudad', label: 'Ciudad', icono: MapPin },
                        { key: 'biografia', label: 'Biografía Profesional', icono: FileText },
                      ].map((campo) => (
                        <div 
                          key={campo.key}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${privacidadDatos[campo.key] ? 'bg-blue-100' : 'bg-gray-200'}`}>
                              <campo.icono className={`w-5 h-5 ${privacidadDatos[campo.key] ? 'text-[#2962FF]' : 'text-gray-500'}`} />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{campo.label}</p>
                              <p className="text-xs text-gray-500">
                                {privacidadDatos[campo.key] 
                                  ? 'Visible para otros usuarios' 
                                  : 'Solo visible para ti y administradores'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => togglePrivacidad(campo.key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all border-2 ${
                              privacidadDatos[campo.key]
                                ? 'bg-[#2962FF] text-white border-[#2962FF] hover:bg-[#1E4BA0]'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {privacidadDatos[campo.key] ? (
                              <>
                                <Eye className="w-4 h-4" />
                                Público
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-4 h-4" />
                                Privado
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Información Legal */}
                  <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-[#2962FF] rounded-full flex items-center justify-center flex-shrink-0">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 mb-2">Protección de Datos Personales</h4>
                        <p className="text-sm text-gray-600 mb-3">
                          Tu información está protegida según la <strong>Ley 1581 de 2012</strong> de protección de datos personales 
                          y el <strong>Decreto 1377 de 2013</strong>. ESAP garantiza el tratamiento responsable de tus datos.
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Lock className="w-4 h-4" />
                          <span>Los datos privados solo son visibles para ti y usuarios autorizados</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
        </div>
      </div>

      {/* Modal: Vista Previa Pública */}
      <Dialog open={mostrarPreview} onOpenChange={setMostrarPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#2962FF]" />
              Vista Pública de tu Perfil
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                Así es como otros usuarios ven tu perfil en la plataforma ESAP.
                Solo se muestran los campos que has marcado como públicos.
              </p>
            </div>

            <div className="text-center py-6 border-b">
              <Avatar className="w-24 h-24 mx-auto border-4 border-white shadow-lg">
                {fotoPerfil ? (
                  <AvatarImage src={fotoPerfil} />
                ) : (
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${datosPersonales.nombres} ${datosPersonales.apellidos}`} />
                )}
              </Avatar>
              <h3 className="text-xl font-bold mt-4">{datosPersonales.nombres} {datosPersonales.apellidos}</h3>
              <p className="text-gray-600">{datosLaborales.cargo}</p>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-gray-900">Información Pública</h4>
              {privacidadDatos.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{datosPersonales.email}</span>
                </div>
              )}
              {privacidadDatos.telefono && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{datosPersonales.telefono}</span>
                </div>
              )}
              {privacidadDatos.ciudad && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{datosPersonales.ciudad}, {datosPersonales.pais}</span>
                </div>
              )}
              {privacidadDatos.biografia && (
                <div className="mt-4">
                  <h5 className="font-semibold text-gray-900 mb-2">Biografía</h5>
                  <p className="text-sm text-gray-600">{datosPersonales.biografia}</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Historial de Cambios */}
      <Dialog open={mostrarHistorial} onOpenChange={setMostrarHistorial}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-[#2962FF]" />
              Historial de Cambios
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {historialCambios.map((cambio) => (
              <motion.div
                key={cambio.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                  {cambio.categoria === 'personal' && <User className="w-5 h-5 text-blue-600" />}
                  {cambio.categoria === 'laboral' && <Briefcase className="w-5 h-5 text-purple-600" />}
                  {cambio.categoria === 'privacidad' && <Shield className="w-5 h-5 text-orange-600" />}
                  {cambio.categoria === 'foto' && <Camera className="w-5 h-5 text-pink-600" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-gray-900">{cambio.campo}</h4>
                    <Badge className={`text-xs ${getCategoriaColor(cambio.categoria)}`}>
                      {cambio.categoria}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="text-red-600 line-through">{cambio.valorAnterior}</span>
                    {' → '}
                    <span className="text-green-600 font-medium">{cambio.valorNuevo}</span>
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {formatearFechaCompleta(cambio.fecha)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════

function CampoPerfilBloqueado({ 
  label, 
  value, 
  icono: Icono,
  privado,
  onTogglePrivacidad
}: { 
  label: string; 
  value: string; 
  icono?: any;
  privado?: boolean;
  onTogglePrivacidad?: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          {Icono && <Icono className="w-4 h-4 text-[#2962FF]" />}
          {label}
          <Lock className="w-3 h-3 text-gray-400" title="Campo bloqueado" />
        </label>
        {onTogglePrivacidad && (
          <button
            onClick={onTogglePrivacidad}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title={privado ? "Hacer público" : "Hacer privado"}
          >
            {privado ? (
              <EyeOff className="w-4 h-4 text-gray-500" />
            ) : (
              <Eye className="w-4 h-4 text-[#2962FF]" />
            )}
          </button>
        )}
      </div>
      <div className="px-4 py-3 bg-gray-100 border-2 border-gray-300 rounded-xl text-sm text-gray-700 font-medium cursor-not-allowed opacity-75">
        {value}
      </div>
    </div>
  );
}

function CampoPerfilEditable({ 
  label, 
  value, 
  onChange,
  icono: Icono,
  privado,
  onTogglePrivacidad,
  placeholder,
  className,
  bloqueado
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void;
  icono?: any;
  privado?: boolean;
  onTogglePrivacidad?: () => void;
  placeholder?: string;
  className?: string;
  bloqueado?: boolean;
}) {
  return (
    <div className={`space-y-2 ${className || ''}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          {Icono && <Icono className="w-4 h-4 text-[#2962FF]" />}
          {label}
          {bloqueado && <Lock className="w-3 h-3 text-gray-400" title="Campo bloqueado" />}
        </label>
        {onTogglePrivacidad && (
          <button
            onClick={onTogglePrivacidad}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors border"
            style={{
              backgroundColor: privado ? '#FFEBEE' : '#E3F2FD',
              color: privado ? '#F44336' : '#2962FF',
              borderColor: privado ? '#F44336' : '#2962FF'
            }}
          >
            {privado ? (
              <>
                <EyeOff className="w-3 h-3" />
                Privado
              </>
            ) : (
              <>
                <Eye className="w-3 h-3" />
                Público
              </>
            )}
          </button>
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={bloqueado}
        className={`w-full px-4 py-3 border-2 rounded-xl transition-all text-sm font-medium ${
          bloqueado 
            ? 'bg-gray-100 border-gray-300 text-gray-700 cursor-not-allowed opacity-75'
            : 'bg-white border-gray-200 text-gray-900 focus:border-[#2962FF] focus:ring-2 focus:ring-[#2962FF]/20 hover:border-gray-300'
        }`}
      />
    </div>
  );
}