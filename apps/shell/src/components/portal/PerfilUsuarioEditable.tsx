import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { Progress } from '../ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { 
  ArrowLeft, 
  Upload, 
  Eye, 
  EyeOff, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  User, 
  Briefcase, 
  GraduationCap,
  Shield,
  CheckCircle2,
  Camera,
  Bell,
  Lock,
  Globe,
  Save,
  Check,
  AlertCircle,
  Download,
  History,
  ExternalLink,
  X,
  Clock,
  FileEdit,
  UserCircle,
  Gamepad2,
  Trophy
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { motion, AnimatePresence } from 'motion/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface PerfilUsuarioEditableProps {
  onVolver: () => void;
  userName: string;
  userEmail: string;
  activeRole: string;
}

interface CampoPrivacidad {
  esPublico: boolean;
}

interface DatosPersonales {
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  celular: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  pais: string;
  fechaNacimiento: string;
  documentoTipo: string;
  documentoNumero: string;
  genero: string;
  estadoCivil: string;
  biografia: string;
}

interface DatosAcademicos {
  programa: string;
  codigoEstudiante: string;
  semestre: string;
  modalidad: string;
  sede: string;
  jornada: string;
}

interface DatosLaborales {
  cargo: string;
  dependencia: string;
  area: string;
  tipoContrato: string;
  fechaIngreso: string;
  extension: string;
}

interface CambioHistorial {
  id: string;
  fecha: Date;
  campo: string;
  valorAnterior: string;
  valorNuevo: string;
  categoria: 'personal' | 'laboral' | 'privacidad' | 'foto';
}

export function PerfilUsuarioEditable({ onVolver, userName, userEmail, activeRole }: PerfilUsuarioEditableProps) {
  const [autoGuardando, setAutoGuardando] = useState(false);
  const [ultimoGuardado, setUltimoGuardado] = useState<Date>(new Date());
  const [mostrarPreview, setMostrarPreview] = useState(false);

  // Estados para datos personales
  const [datosPersonales, setDatosPersonales] = useState<DatosPersonales>({
    nombres: userName.split(' ')[0] || 'Diego',
    apellidos: userName.split(' ').slice(1).join(' ') || 'Trujillo Medina',
    email: userEmail,
    telefono: '+57 (601) 444-0909',
    celular: '+57 310 555 7890',
    direccion: 'Calle 44 #53-37',
    ciudad: 'Bogotá D.C.',
    departamento: 'Cundinamarca',
    pais: 'Colombia',
    fechaNacimiento: '1990-05-15',
    documentoTipo: 'CC',
    documentoNumero: '1012345678',
    genero: 'Masculino',
    estadoCivil: 'Soltero',
    biografia: 'Profesional en administración pública con 5 años de experiencia en gestión de procesos institucionales y control interno.',
  });

  const [datosAcademicos, setDatosAcademicos] = useState<DatosAcademicos>({
    programa: 'Administración Pública',
    codigoEstudiante: 'EST-2024-001',
    semestre: '6',
    modalidad: 'Presencial',
    sede: 'Bogotá',
    jornada: 'Diurna',
  });

  const [datosLaborales, setDatosLaborales] = useState<DatosLaborales>({
    cargo: activeRole || 'Funcionario Administrativo',
    dependencia: 'Oficina de Control Interno',
    area: 'Gestión Administrativa',
    tipoContrato: 'Planta Permanente',
    fechaIngreso: '2020-03-01',
    extension: '1234',
  });

  // Estados de privacidad para cada campo
  const [privacidadDatos, setPrivacidadDatos] = useState<Record<string, CampoPrivacidad>>({
    telefono: { esPublico: false },
    celular: { esPublico: false },
    direccion: { esPublico: false },
    fechaNacimiento: { esPublico: true },
    documentoNumero: { esPublico: false },
    email: { esPublico: true },
    ciudad: { esPublico: true },
    departamento: { esPublico: true },
    biografia: { esPublico: true },
  });

  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [misPuntajes, setMisPuntajes] = useState<any[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('esap_error_game_leaderboard');
      if (saved) {
        const parsed = JSON.parse(saved);
        setMisPuntajes(parsed.filter((p: any) => p.name === userName));
      }
    } catch (e) {
      console.error(e);
    }
  }, [userName]);

  // Historial de cambios (mock data)
  const [historialCambios] = useState<CambioHistorial[]>([
    {
      id: '1',
      fecha: new Date('2024-12-24T10:30:00'),
      campo: 'Celular',
      valorAnterior: '+57 310 555 0000',
      valorNuevo: '+57 310 555 7890',
      categoria: 'personal'
    },
    {
      id: '2',
      fecha: new Date('2024-12-23T15:45:00'),
      campo: 'Email',
      valorAnterior: 'Privado',
      valorNuevo: 'Público',
      categoria: 'privacidad'
    },
    {
      id: '3',
      fecha: new Date('2024-12-22T09:20:00'),
      campo: 'Biografía',
      valorAnterior: '',
      valorNuevo: 'Profesional en administración pública...',
      categoria: 'personal'
    },
    {
      id: '4',
      fecha: new Date('2024-12-21T14:10:00'),
      campo: 'Foto de perfil',
      valorAnterior: 'Sin foto',
      valorNuevo: 'Actualizada',
      categoria: 'foto'
    },
    {
      id: '5',
      fecha: new Date('2024-12-20T11:00:00'),
      campo: 'Dependencia',
      valorAnterior: 'Oficina de Planeación',
      valorNuevo: 'Oficina de Control Interno',
      categoria: 'laboral'
    },
  ]);

  // Auto-guardado
  useEffect(() => {
    const timer = setTimeout(() => {
      if (autoGuardando) {
        setAutoGuardando(false);
        setUltimoGuardado(new Date());
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [autoGuardando]);

  const handleAutoGuardar = () => {
    setAutoGuardando(true);
  };

  const handleCambioDatos = (campo: keyof DatosPersonales, valor: string) => {
    setDatosPersonales(prev => ({ ...prev, [campo]: valor }));
    handleAutoGuardar();
  };

  const togglePrivacidad = (campo: string) => {
    setPrivacidadDatos(prev => ({
      ...prev,
      [campo]: { esPublico: !prev[campo]?.esPublico }
    }));
    handleAutoGuardar();
    toast.success(
      privacidadDatos[campo]?.esPublico ? 'Campo configurado como privado' : 'Campo configurado como público',
      { duration: 2000 }
    );
  };

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
        rol: activeRole,
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

    // Campos personales
    Object.entries(datosPersonales).forEach(([key, value]) => {
      campos++;
      if (value && value.toString().trim() !== '') completados++;
    });

    // Foto de perfil
    campos++;
    if (fotoPerfil) completados++;

    return Math.round((completados / campos) * 100);
  };

  const completitud = calcularCompletitud();

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
      personal: 'bg-blue-100 text-blue-700',
      laboral: 'bg-purple-100 text-purple-700',
      privacidad: 'bg-orange-100 text-orange-700',
      foto: 'bg-green-100 text-green-700',
    };
    return colores[categoria as keyof typeof colores] || 'bg-gray-100 text-gray-700';
  };

  const getCategoriaIcon = (categoria: string) => {
    const iconos = {
      personal: <User className="w-4 h-4" />,
      laboral: <Briefcase className="w-4 h-4" />,
      privacidad: <Shield className="w-4 h-4" />,
      foto: <Camera className="w-4 h-4" />,
    };
    return iconos[categoria as keyof typeof iconos] || <FileEdit className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Mejorado */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onVolver}
                className="gap-2 hover:bg-gray-100"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Volver al Dashboard</span>
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-lg sm:text-xl font-black text-gray-900">Mi Perfil</h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">
                  Gestiona tu información y privacidad
                </p>
              </div>
            </div>

            {/* Actions + Auto-save */}
            <div className="flex items-center gap-2">
              {/* Preview Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMostrarPreview(true)}
                className="gap-2 hidden sm:flex"
              >
                <Eye className="w-4 h-4" />
                Vista Pública
              </Button>

              {/* Export Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportarDatos}
                className="gap-2 hidden sm:flex"
              >
                <Download className="w-4 h-4" />
                Exportar
              </Button>

              {/* Auto-save indicator */}
              <AnimatePresence mode="wait">
                {autoGuardando ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-2 text-sm text-blue-600"
                  >
                    <Save className="w-4 h-4 animate-pulse" />
                    <span className="hidden md:inline">Guardando...</span>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-2 text-sm text-green-600"
                  >
                    <Check className="w-4 h-4" />
                    <span className="hidden md:inline">Guardado {formatearFecha(ultimoGuardado)}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Progress bar de completitud */}
          <div className="pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-600">Completitud del perfil</span>
              <span className="text-xs font-black text-[#1e5da8]">{completitud}%</span>
            </div>
            <Progress value={completitud} className="h-2" />
            {completitud < 100 && (
              <p className="text-xs text-gray-500 mt-1">
                Completa tu perfil para mejorar tu visibilidad en la comunidad ESAP
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar - Foto y Vista Rápida */}
          <div className="lg:col-span-4 space-y-6">
            {/* Tarjeta de Foto de Perfil con Drag & Drop */}
            <Card className="shadow-lg overflow-hidden">
              <div className="relative h-32 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd]" />
              <CardContent className="pt-0 px-6 pb-6">
                <div className="flex flex-col items-center -mt-16">
                  <div
                    className={`relative group ${dragActive ? 'scale-105' : ''} transition-transform`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <Avatar className="w-32 h-32 border-4 border-white shadow-xl">
                      {fotoPerfil && <AvatarImage src={fotoPerfil} />}
                      <AvatarFallback className="bg-[#1e5da8] text-white text-3xl">
                        {datosPersonales.nombres[0]}{datosPersonales.apellidos[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Overlay de cambio de foto */}
                    <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <div className="text-center text-white">
                        <Camera className="w-6 h-6 mx-auto mb-1" />
                        <span className="text-xs font-semibold">Cambiar</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCambioFoto}
                        className="hidden"
                      />
                    </label>

                    {dragActive && (
                      <div className="absolute inset-0 flex items-center justify-center bg-blue-500/80 rounded-full">
                        <Upload className="w-8 h-8 text-white animate-bounce" />
                      </div>
                    )}
                  </div>

                  <h2 className="mt-4 text-xl font-black text-gray-900 text-center">
                    {datosPersonales.nombres} {datosPersonales.apellidos}
                  </h2>
                  <Badge className="mt-2 bg-[#1e5da8]">
                    {activeRole}
                  </Badge>

                  <Separator className="w-full my-4" />

                  {/* Vista Rápida */}
                  <div className="w-full space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-700 truncate">{datosPersonales.email}</span>
                    </div>
                    {datosPersonales.celular && (
                      <div className="flex items-center gap-3 text-sm">
                        <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-700">{datosPersonales.celular}</span>
                      </div>
                    )}
                    {datosPersonales.ciudad && (
                      <div className="flex items-center gap-3 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-700">{datosPersonales.ciudad}, {datosPersonales.pais}</span>
                      </div>
                    )}
                  </div>

                  <Separator className="w-full my-4" />

                  {/* Quick Actions */}
                  <div className="w-full space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMostrarPreview(true)}
                      className="w-full gap-2 justify-start"
                    >
                      <Eye className="w-4 h-4" />
                      Ver Perfil Público
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportarDatos}
                      className="w-full gap-2 justify-start"
                    >
                      <Download className="w-4 h-4" />
                      Exportar Datos
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card de Privacidad */}
            <Card className="shadow-lg border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#1e5da8]" />
                  Control de Privacidad
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-gray-600">
                  Controla qué información es visible para otros usuarios de la comunidad ESAP.
                </p>

                {/* Resumen */}
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-700">Datos Públicos</span>
                    <span className="text-sm font-black text-[#1e5da8]">
                      {Object.values(privacidadDatos).filter(c => c.esPublico).length}/{Object.keys(privacidadDatos).length}
                    </span>
                  </div>
                  <Progress 
                    value={(Object.values(privacidadDatos).filter(c => c.esPublico).length / Object.keys(privacidadDatos).length) * 100} 
                    className="h-1"
                  />
                </div>

                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Los datos privados solo son visibles para ti y los administradores del sistema.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Estadísticas del perfil */}
            {completitud === 100 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <CardContent className="p-6 text-center">
                    <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                    <h3 className="font-black text-green-900 mb-2">¡Perfil Completo!</h3>
                    <p className="text-xs text-green-700">
                      Tu perfil está 100% completo. Los perfiles completos tienen mayor visibilidad en la comunidad.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Main Content - Tabs con Inline Editing */}
          <div className="lg:col-span-8">
            <Card className="shadow-lg">
              <Tabs defaultValue="personal" className="w-full">
                <CardHeader className="border-b">
                  <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
                    <TabsTrigger value="personal" className="gap-2">
                      <User className="w-4 h-4" />
                      <span className="hidden sm:inline">Personal</span>
                    </TabsTrigger>
                    {(activeRole === 'Funcionario' || activeRole === 'Administrativo') && (
                      <TabsTrigger value="laboral" className="gap-2">
                        <Briefcase className="w-4 h-4" />
                        <span className="hidden sm:inline">Laboral</span>
                      </TabsTrigger>
                    )}
                    {activeRole === 'Estudiante' && (
                      <TabsTrigger value="academico" className="gap-2">
                        <GraduationCap className="w-4 h-4" />
                        <span className="hidden sm:inline">Académico</span>
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="privacidad" className="gap-2">
                      <Lock className="w-4 h-4" />
                      <span className="hidden sm:inline">Privacidad</span>
                    </TabsTrigger>
                    <TabsTrigger value="historial" className="gap-2">
                      <History className="w-4 h-4" />
                      <span className="hidden sm:inline">Historial</span>
                    </TabsTrigger>
                    <TabsTrigger value="logros" className="gap-2">
                      <Gamepad2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Logros</span>
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>

                <CardContent className="pt-6">
                  {/* TAB: Datos Personales */}
                  <TabsContent value="personal" className="space-y-6 mt-0">
                    {/* Biografía */}
                    <div className="space-y-2">
                      <Label htmlFor="biografia" className="text-sm font-semibold text-gray-700">
                        Biografía
                      </Label>
                      <Textarea
                        id="biografia"
                        value={datosPersonales.biografia}
                        onChange={(e) => handleCambioDatos('biografia', e.target.value)}
                        placeholder="Escribe una breve descripción sobre ti..."
                        className="min-h-[100px] resize-none"
                        maxLength={300}
                      />
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{datosPersonales.biografia.length}/300 caracteres</span>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={privacidadDatos.biografia?.esPublico}
                            onCheckedChange={() => togglePrivacidad('biografia')}
                            className="data-[state=checked]:bg-[#1e5da8]"
                          />
                          <span className="font-medium">
                            {privacidadDatos.biografia?.esPublico ? 'Público' : 'Privado'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Grid de campos personales */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Nombres */}
                      <div className="space-y-2">
                        <Label htmlFor="nombres" className="text-sm font-semibold text-gray-700">
                          Nombres *
                        </Label>
                        <Input
                          id="nombres"
                          value={datosPersonales.nombres}
                          onChange={(e) => handleCambioDatos('nombres', e.target.value)}
                          className="font-medium"
                        />
                      </div>

                      {/* Apellidos */}
                      <div className="space-y-2">
                        <Label htmlFor="apellidos" className="text-sm font-semibold text-gray-700">
                          Apellidos *
                        </Label>
                        <Input
                          id="apellidos"
                          value={datosPersonales.apellidos}
                          onChange={(e) => handleCambioDatos('apellidos', e.target.value)}
                          className="font-medium"
                        />
                      </div>

                      {/* Email con toggle de privacidad */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                            Email Institucional *
                          </Label>
                          <div className="flex items-center gap-2">
                            {privacidadDatos.email?.esPublico ? (
                              <Globe className="w-3 h-3 text-green-600" />
                            ) : (
                              <Lock className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </div>
                        <div className="relative">
                          <Input
                            id="email"
                            type="email"
                            value={datosPersonales.email}
                            onChange={(e) => handleCambioDatos('email', e.target.value)}
                            className="font-medium pr-20"
                          />
                          <Switch
                            checked={privacidadDatos.email?.esPublico}
                            onCheckedChange={() => togglePrivacidad('email')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 data-[state=checked]:bg-[#1e5da8]"
                          />
                        </div>
                      </div>

                      {/* Celular con toggle */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="celular" className="text-sm font-semibold text-gray-700">
                            Celular
                          </Label>
                          <div className="flex items-center gap-2">
                            {privacidadDatos.celular?.esPublico ? (
                              <Globe className="w-3 h-3 text-green-600" />
                            ) : (
                              <Lock className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </div>
                        <div className="relative">
                          <Input
                            id="celular"
                            value={datosPersonales.celular}
                            onChange={(e) => handleCambioDatos('celular', e.target.value)}
                            className="font-medium pr-20"
                          />
                          <Switch
                            checked={privacidadDatos.celular?.esPublico}
                            onCheckedChange={() => togglePrivacidad('celular')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 data-[state=checked]:bg-[#1e5da8]"
                          />
                        </div>
                      </div>

                      {/* Teléfono con toggle */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="telefono" className="text-sm font-semibold text-gray-700">
                            Teléfono Fijo
                          </Label>
                          <div className="flex items-center gap-2">
                            {privacidadDatos.telefono?.esPublico ? (
                              <Globe className="w-3 h-3 text-green-600" />
                            ) : (
                              <Lock className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </div>
                        <div className="relative">
                          <Input
                            id="telefono"
                            value={datosPersonales.telefono}
                            onChange={(e) => handleCambioDatos('telefono', e.target.value)}
                            className="font-medium pr-20"
                          />
                          <Switch
                            checked={privacidadDatos.telefono?.esPublico}
                            onCheckedChange={() => togglePrivacidad('telefono')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 data-[state=checked]:bg-[#1e5da8]"
                          />
                        </div>
                      </div>

                      {/* Fecha Nacimiento con toggle */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="fechaNacimiento" className="text-sm font-semibold text-gray-700">
                            Fecha de Nacimiento
                          </Label>
                          <div className="flex items-center gap-2">
                            {privacidadDatos.fechaNacimiento?.esPublico ? (
                              <Globe className="w-3 h-3 text-green-600" />
                            ) : (
                              <Lock className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </div>
                        <div className="relative">
                          <Input
                            id="fechaNacimiento"
                            type="date"
                            value={datosPersonales.fechaNacimiento}
                            onChange={(e) => handleCambioDatos('fechaNacimiento', e.target.value)}
                            className="font-medium pr-20"
                          />
                          <Switch
                            checked={privacidadDatos.fechaNacimiento?.esPublico}
                            onCheckedChange={() => togglePrivacidad('fechaNacimiento')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 data-[state=checked]:bg-[#1e5da8]"
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Información de Identificación */}
                    <div>
                      <h3 className="text-sm font-black text-gray-900 mb-4">Identificación</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="documentoTipo" className="text-sm font-semibold text-gray-700">
                            Tipo de Documento *
                          </Label>
                          <Select
                            value={datosPersonales.documentoTipo}
                            onValueChange={(value) => {
                              handleCambioDatos('documentoTipo', value);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
                              <SelectItem value="CE">Cédula de Extranjería</SelectItem>
                              <SelectItem value="TI">Tarjeta de Identidad</SelectItem>
                              <SelectItem value="PAS">Pasaporte</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="documentoNumero" className="text-sm font-semibold text-gray-700">
                              Número de Documento *
                            </Label>
                            <div className="flex items-center gap-2">
                              {privacidadDatos.documentoNumero?.esPublico ? (
                                <Globe className="w-3 h-3 text-green-600" />
                              ) : (
                                <Lock className="w-3 h-3 text-gray-400" />
                              )}
                            </div>
                          </div>
                          <div className="relative">
                            <Input
                              id="documentoNumero"
                              value={datosPersonales.documentoNumero}
                              onChange={(e) => handleCambioDatos('documentoNumero', e.target.value)}
                              className="font-medium pr-20"
                            />
                            <Switch
                              checked={privacidadDatos.documentoNumero?.esPublico}
                              onCheckedChange={() => togglePrivacidad('documentoNumero')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 data-[state=checked]:bg-[#1e5da8]"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="genero" className="text-sm font-semibold text-gray-700">
                            Género
                          </Label>
                          <Select
                            value={datosPersonales.genero}
                            onValueChange={(value) => handleCambioDatos('genero', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Masculino">Masculino</SelectItem>
                              <SelectItem value="Femenino">Femenino</SelectItem>
                              <SelectItem value="Otro">Otro</SelectItem>
                              <SelectItem value="Prefiero no decir">Prefiero no decir</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="estadoCivil" className="text-sm font-semibold text-gray-700">
                            Estado Civil
                          </Label>
                          <Select
                            value={datosPersonales.estadoCivil}
                            onValueChange={(value) => handleCambioDatos('estadoCivil', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Soltero">Soltero/a</SelectItem>
                              <SelectItem value="Casado">Casado/a</SelectItem>
                              <SelectItem value="Union Libre">Unión Libre</SelectItem>
                              <SelectItem value="Divorciado">Divorciado/a</SelectItem>
                              <SelectItem value="Viudo">Viudo/a</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Ubicación */}
                    <div>
                      <h3 className="text-sm font-black text-gray-900 mb-4">Ubicación</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2 sm:col-span-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="direccion" className="text-sm font-semibold text-gray-700">
                              Dirección de Residencia
                            </Label>
                            <div className="flex items-center gap-2">
                              {privacidadDatos.direccion?.esPublico ? (
                                <Globe className="w-3 h-3 text-green-600" />
                              ) : (
                                <Lock className="w-3 h-3 text-gray-400" />
                              )}
                            </div>
                          </div>
                          <div className="relative">
                            <Input
                              id="direccion"
                              value={datosPersonales.direccion}
                              onChange={(e) => handleCambioDatos('direccion', e.target.value)}
                              className="font-medium pr-20"
                            />
                            <Switch
                              checked={privacidadDatos.direccion?.esPublico}
                              onCheckedChange={() => togglePrivacidad('direccion')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 data-[state=checked]:bg-[#1e5da8]"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="ciudad" className="text-sm font-semibold text-gray-700">
                              Ciudad
                            </Label>
                            <div className="flex items-center gap-2">
                              {privacidadDatos.ciudad?.esPublico ? (
                                <Globe className="w-3 h-3 text-green-600" />
                              ) : (
                                <Lock className="w-3 h-3 text-gray-400" />
                              )}
                            </div>
                          </div>
                          <div className="relative">
                            <Input
                              id="ciudad"
                              value={datosPersonales.ciudad}
                              onChange={(e) => handleCambioDatos('ciudad', e.target.value)}
                              className="font-medium pr-20"
                            />
                            <Switch
                              checked={privacidadDatos.ciudad?.esPublico}
                              onCheckedChange={() => togglePrivacidad('ciudad')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 data-[state=checked]:bg-[#1e5da8]"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="departamento" className="text-sm font-semibold text-gray-700">
                              Departamento
                            </Label>
                            <div className="flex items-center gap-2">
                              {privacidadDatos.departamento?.esPublico ? (
                                <Globe className="w-3 h-3 text-green-600" />
                              ) : (
                                <Lock className="w-3 h-3 text-gray-400" />
                              )}
                            </div>
                          </div>
                          <div className="relative">
                            <Input
                              id="departamento"
                              value={datosPersonales.departamento}
                              onChange={(e) => handleCambioDatos('departamento', e.target.value)}
                              className="font-medium pr-20"
                            />
                            <Switch
                              checked={privacidadDatos.departamento?.esPublico}
                              onCheckedChange={() => togglePrivacidad('departamento')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 data-[state=checked]:bg-[#1e5da8]"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="pais" className="text-sm font-semibold text-gray-700">
                            País
                          </Label>
                          <Input
                            id="pais"
                            value={datosPersonales.pais}
                            onChange={(e) => handleCambioDatos('pais', e.target.value)}
                            className="font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* TAB: Datos Laborales */}
                  {(activeRole === 'Funcionario' || activeRole === 'Administrativo') && (
                    <TabsContent value="laboral" className="space-y-6 mt-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="cargo" className="text-sm font-semibold text-gray-700">
                            Cargo
                          </Label>
                          <Input
                            id="cargo"
                            value={datosLaborales.cargo}
                            onChange={(e) => {
                              setDatosLaborales({ ...datosLaborales, cargo: e.target.value });
                              handleAutoGuardar();
                            }}
                            className="font-medium"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="dependencia" className="text-sm font-semibold text-gray-700">
                            Dependencia
                          </Label>
                          <Input
                            id="dependencia"
                            value={datosLaborales.dependencia}
                            onChange={(e) => {
                              setDatosLaborales({ ...datosLaborales, dependencia: e.target.value });
                              handleAutoGuardar();
                            }}
                            className="font-medium"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="area" className="text-sm font-semibold text-gray-700">
                            Área
                          </Label>
                          <Input
                            id="area"
                            value={datosLaborales.area}
                            onChange={(e) => {
                              setDatosLaborales({ ...datosLaborales, area: e.target.value });
                              handleAutoGuardar();
                            }}
                            className="font-medium"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="tipoContrato" className="text-sm font-semibold text-gray-700">
                            Tipo de Contrato
                          </Label>
                          <Select
                            value={datosLaborales.tipoContrato}
                            onValueChange={(value) => {
                              setDatosLaborales({ ...datosLaborales, tipoContrato: value });
                              handleAutoGuardar();
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Planta Permanente">Planta Permanente</SelectItem>
                              <SelectItem value="Contrato Fijo">Contrato Fijo</SelectItem>
                              <SelectItem value="Prestación de Servicios">Prestación de Servicios</SelectItem>
                              <SelectItem value="Temporal">Temporal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="fechaIngreso" className="text-sm font-semibold text-gray-700">
                            Fecha de Ingreso
                          </Label>
                          <Input
                            id="fechaIngreso"
                            type="date"
                            value={datosLaborales.fechaIngreso}
                            onChange={(e) => {
                              setDatosLaborales({ ...datosLaborales, fechaIngreso: e.target.value });
                              handleAutoGuardar();
                            }}
                            className="font-medium"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="extension" className="text-sm font-semibold text-gray-700">
                            Extensión
                          </Label>
                          <Input
                            id="extension"
                            value={datosLaborales.extension}
                            onChange={(e) => {
                              setDatosLaborales({ ...datosLaborales, extension: e.target.value });
                              handleAutoGuardar();
                            }}
                            className="font-medium"
                          />
                        </div>
                      </div>
                    </TabsContent>
                  )}

                  {/* TAB: Datos Académicos */}
                  {activeRole === 'Estudiante' && (
                    <TabsContent value="academico" className="space-y-6 mt-0">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-700">
                          <strong>Nota:</strong> Los datos académicos son gestionados por la institución y no pueden ser modificados directamente.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-700">Programa Académico</Label>
                          <Input value={datosAcademicos.programa} disabled className="bg-gray-50" />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-700">Código Estudiante</Label>
                          <Input value={datosAcademicos.codigoEstudiante} disabled className="bg-gray-50" />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-700">Semestre</Label>
                          <Input value={datosAcademicos.semestre} disabled className="bg-gray-50" />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-700">Modalidad</Label>
                          <Input value={datosAcademicos.modalidad} disabled className="bg-gray-50" />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-700">Sede</Label>
                          <Input value={datosAcademicos.sede} disabled className="bg-gray-50" />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-700">Jornada</Label>
                          <Input value={datosAcademicos.jornada} disabled className="bg-gray-50" />
                        </div>
                      </div>
                    </TabsContent>
                  )}

                  {/* TAB: Privacidad */}
                  <TabsContent value="privacidad" className="space-y-6 mt-0">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h3 className="font-black text-blue-900 mb-2">Controla tu privacidad</h3>
                      <p className="text-sm text-blue-700">
                        Decide qué información quieres compartir con la comunidad ESAP. Los cambios se guardan automáticamente.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {Object.entries(privacidadDatos).map(([campo, config]) => {
                        const labels: Record<string, { title: string; description: string; icon: React.ReactNode }> = {
                          email: { 
                            title: 'Email Institucional', 
                            description: 'Permite que otros usuarios te contacten por correo',
                            icon: <Mail className="w-5 h-5" />
                          },
                          telefono: { 
                            title: 'Teléfono Fijo', 
                            description: 'Comparte tu número de teléfono fijo',
                            icon: <Phone className="w-5 h-5" />
                          },
                          celular: { 
                            title: 'Celular', 
                            description: 'Comparte tu número de celular',
                            icon: <Phone className="w-5 h-5" />
                          },
                          direccion: { 
                            title: 'Dirección', 
                            description: 'Muestra tu dirección de residencia',
                            icon: <MapPin className="w-5 h-5" />
                          },
                          ciudad: { 
                            title: 'Ciudad', 
                            description: 'Muestra tu ciudad de residencia',
                            icon: <MapPin className="w-5 h-5" />
                          },
                          departamento: { 
                            title: 'Departamento', 
                            description: 'Muestra tu departamento de residencia',
                            icon: <MapPin className="w-5 h-5" />
                          },
                          fechaNacimiento: { 
                            title: 'Fecha de Nacimiento', 
                            description: 'Comparte tu fecha de nacimiento',
                            icon: <Calendar className="w-5 h-5" />
                          },
                          documentoNumero: { 
                            title: 'Número de Documento', 
                            description: 'Muestra tu número de identificación',
                            icon: <User className="w-5 h-5" />
                          },
                          biografia: { 
                            title: 'Biografía', 
                            description: 'Comparte información sobre ti',
                            icon: <User className="w-5 h-5" />
                          },
                        };

                        const info = labels[campo];
                        if (!info) return null;

                        return (
                          <div 
                            key={campo}
                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                          >
                            <div className="flex items-start gap-3 flex-1">
                              <div className={`p-2 rounded-lg ${config.esPublico ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                {info.icon}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{info.title}</h4>
                                <p className="text-sm text-gray-600 mt-0.5">{info.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 ml-4">
                              <span className={`text-sm font-semibold ${config.esPublico ? 'text-green-600' : 'text-gray-500'}`}>
                                {config.esPublico ? 'Público' : 'Privado'}
                              </span>
                              <Switch
                                checked={config.esPublico}
                                onCheckedChange={() => togglePrivacidad(campo)}
                                className="data-[state=checked]:bg-green-600"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>

                  {/* TAB: Historial de Cambios */}
                  <TabsContent value="historial" className="space-y-6 mt-0">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h3 className="font-black text-blue-900 mb-2 flex items-center gap-2">
                        <History className="w-5 h-5" />
                        Historial de Cambios
                      </h3>
                      <p className="text-sm text-blue-700">
                        Registro completo de todas las modificaciones realizadas a tu perfil.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {historialCambios.map((cambio, index) => (
                        <motion.div
                          key={cambio.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${getCategoriaColor(cambio.categoria)}`}>
                                {getCategoriaIcon(cambio.categoria)}
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">{cambio.campo}</h4>
                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                  <Clock className="w-3 h-3" />
                                  {formatearFechaCompleta(cambio.fecha)}
                                </p>
                              </div>
                            </div>
                            <Badge variant="secondary" className={getCategoriaColor(cambio.categoria)}>
                              {cambio.categoria}
                            </Badge>
                          </div>
                          
                          <div className="mt-3 pl-12">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-xs text-gray-500 block mb-1">Valor Anterior</span>
                                <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 font-medium truncate">
                                  {cambio.valorAnterior || '—'}
                                </div>
                              </div>
                              <div>
                                <span className="text-xs text-gray-500 block mb-1">Valor Nuevo</span>
                                <div className="p-2 bg-green-50 border border-green-200 rounded text-green-700 font-medium truncate">
                                  {cambio.valorNuevo}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {historialCambios.length === 0 && (
                      <div className="text-center py-12">
                        <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="font-semibold text-gray-900 mb-1">No hay cambios registrados</h3>
                        <p className="text-sm text-gray-500">
                          Los cambios que realices aparecerán aquí
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB: Logros */}
                  <TabsContent value="logros" className="space-y-6 mt-0">
                    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center shadow-sm">
                          <Gamepad2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-black text-blue-900 text-lg">Tus Puntajes y Logros</h3>
                          <p className="text-sm text-blue-700">Historial de mini-juegos en la plataforma.</p>
                        </div>
                      </div>

                      {misPuntajes.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {misPuntajes.map((score, i) => (
                            <div key={i} className="bg-white border border-blue-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center font-bold border border-amber-200">
                                    <Trophy className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-gray-800 text-sm">Trivia de Errores</h4>
                                    <p className="text-xs text-gray-500 font-mono">{score.date}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-2 pt-4 border-t border-gray-100">
                                <div>
                                  <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Puntaje</span>
                                  <span className="block text-2xl font-black text-[#1e5da8]">{score.score} <span className="text-sm text-blue-400 font-medium">pts</span></span>
                                </div>
                                <div className="text-right">
                                  <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tiempo</span>
                                  <span className="text-lg font-bold text-gray-700 font-mono">{score.time}s</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-10 bg-white/60 rounded-xl border border-dashed border-blue-200">
                          <Gamepad2 className="w-12 h-12 text-blue-300 mx-auto mb-3" />
                          <p className="font-bold text-blue-800">Aún no tienes puntajes registrados</p>
                          <p className="text-sm text-blue-600 max-w-sm mx-auto mt-1">Explora la plataforma y participa en nuestros mini-juegos para acumular puntos.</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal Preview Perfil Público */}
      <Dialog open={mostrarPreview} onOpenChange={setMostrarPreview}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#1e5da8]" />
              Vista Previa - Perfil Público
            </DialogTitle>
            <DialogDescription>
              Así es como otros usuarios de la comunidad ESAP ven tu perfil
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Header del perfil público */}
            <div className="bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] rounded-lg p-6 text-white">
              <div className="flex items-start gap-4">
                <Avatar className="w-20 h-20 border-4 border-white shadow-xl">
                  {fotoPerfil && <AvatarImage src={fotoPerfil} />}
                  <AvatarFallback className="bg-white text-[#1e5da8] text-2xl font-bold">
                    {datosPersonales.nombres[0]}{datosPersonales.apellidos[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-2xl font-black">
                    {datosPersonales.nombres} {datosPersonales.apellidos}
                  </h2>
                  <p className="text-blue-100 mt-1">{activeRole}</p>
                  {privacidadDatos.biografia?.esPublico && datosPersonales.biografia && (
                    <p className="text-sm text-blue-50 mt-3">
                      {datosPersonales.biografia}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Información visible públicamente */}
            <div className="space-y-4">
              <h3 className="font-black text-gray-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-green-600" />
                Información Pública
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {privacidadDatos.email?.esPublico && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="font-medium text-gray-900">{datosPersonales.email}</p>
                    </div>
                  </div>
                )}

                {privacidadDatos.celular?.esPublico && datosPersonales.celular && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Celular</p>
                      <p className="font-medium text-gray-900">{datosPersonales.celular}</p>
                    </div>
                  </div>
                )}

                {privacidadDatos.telefono?.esPublico && datosPersonales.telefono && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Teléfono</p>
                      <p className="font-medium text-gray-900">{datosPersonales.telefono}</p>
                    </div>
                  </div>
                )}

                {privacidadDatos.ciudad?.esPublico && datosPersonales.ciudad && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Ubicación</p>
                      <p className="font-medium text-gray-900">
                        {datosPersonales.ciudad}
                        {privacidadDatos.departamento?.esPublico && `, ${datosPersonales.departamento}`}
                      </p>
                    </div>
                  </div>
                )}

                {privacidadDatos.fechaNacimiento?.esPublico && datosPersonales.fechaNacimiento && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Fecha de Nacimiento</p>
                      <p className="font-medium text-gray-900">
                        {new Date(datosPersonales.fechaNacimiento).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Información privada */}
              <div className="mt-6">
                <h3 className="font-black text-gray-900 flex items-center gap-2 mb-4">
                  <Lock className="w-5 h-5 text-gray-400" />
                  Información Privada
                </h3>
                <div className="p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
                  <Lock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    Los campos configurados como privados no son visibles para otros usuarios
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
            <Button variant="outline" onClick={() => setMostrarPreview(false)}>
              Cerrar
            </Button>
            <Button 
              onClick={() => {
                setMostrarPreview(false);
                toast.success('Esta es una vista previa de tu perfil público');
              }}
              className="bg-[#1e5da8] hover:bg-[#1557a0]"
            >
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
