import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  CheckCircle2, User, Mail, Phone, GraduationCap, ArrowLeft, 
  Send, Sparkles, AlertCircle, FileText, Shield, MapPin, Loader2, 
  UserCircle, Building2, Check
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { motion } from 'motion/react';
import { PublicNavbar } from './PublicNavbar';
import esapLogoWhite from 'figma:asset/2eabfe85218557ad27ece74d963c4a3b61b716be.png';

interface VinculacionFormProps {
  onBack: () => void;
  onLoginClick?: () => void;
}

export function VinculacionForm({ onBack, onLoginClick }: VinculacionFormProps) {
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    tipoDocumento: '',
    numeroDocumento: '',
    email: '',
    celular: '',
    programaInteres: '',
    nivelEstudio: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [radicado, setRadicado] = useState('');

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.nombres || !formData.apellidos || !formData.tipoDocumento || 
        !formData.numeroDocumento || !formData.email || !formData.celular || 
        !formData.programaInteres || !formData.nivelEstudio) {
      toast.error('Por favor completa todos los campos requeridos');
      return false;
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Por favor ingresa un correo electrónico válido');
      return false;
    }

    // Validar celular (Colombia format)
    const phoneRegex = /^3\d{9}$/;
    const cleanPhone = formData.celular.replace(/\s+/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      toast.error('Por favor ingresa un número de celular válido (10 dígitos, debe iniciar con 3)');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    // Simular envío al backend con delay realista
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generar número de radicado
    const radicadoNumber = 'VIN-' + new Date().getFullYear() + '-' + Math.random().toString(36).substr(2, 8).toUpperCase();
    setRadicado(radicadoNumber);
    
    toast.success('¡Solicitud enviada exitosamente!', {
      description: 'Nos comunicaremos contigo en las próximas 24-48 horas',
      duration: 5000
    });
    
    setIsSubmitting(false);
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    setFormData({
      nombres: '', apellidos: '', tipoDocumento: '', numeroDocumento: '',
      email: '', celular: '', programaInteres: '', nivelEstudio: ''
    });
    setRadicado('');
  };

  // Pantalla de Confirmación Premium
  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Header/Navbar espaciado */}
        <div className="h-20" />

        {/* Main Content */}
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
          {/* Card Premium con Animación */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm overflow-hidden">
              {/* Header con Degradado Verde (Éxito) */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-8 text-white">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black">¡Solicitud Enviada Exitosamente!</h2>
                    <p className="text-green-50">Tu solicitud ha sido registrada correctamente</p>
                  </div>
                </div>
              </div>

              <CardContent className="p-8 space-y-6">
                {/* Mensaje Principal */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    ¿Qué sigue ahora?
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    Gracias por tu interés en la <strong>Escuela Superior de Administración Pública (ESAP)</strong>. 
                    Tu solicitud de vinculación ha sido recibida y está siendo procesada.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    Nuestro equipo de admisiones revisará tu información y se comunicará contigo en las próximas <strong className="text-blue-600">24 a 48 horas</strong> para continuar con el proceso de inscripción.
                  </p>
                </div>

                {/* Número de Radicado Destacado */}
                <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-2xl p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#1e5da8]" />
                    Número de Radicado
                  </h3>
                  <div className="bg-gradient-to-r from-[#1e5da8] to-blue-600 rounded-xl p-6 text-center mb-4">
                    <p className="text-sm text-blue-100 mb-2 font-medium">Tu número de seguimiento:</p>
                    <p className="text-3xl font-black text-white font-mono tracking-wider mb-2">
                      {radicado}
                    </p>
                    <p className="text-xs text-blue-100">
                      Guárdalo para consultas futuras
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 text-center">
                    💡 <strong>Tip:</strong> Toma una captura de pantalla o anota este número para futuras consultas
                  </p>
                </div>

                {/* Datos de la Solicitud */}
                <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <UserCircle className="w-5 h-5 text-[#1e5da8]" />
                    Resumen de tu Solicitud
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 font-medium">Nombre Completo</p>
                      <p className="font-bold text-lg text-gray-900">{formData.nombres} {formData.apellidos}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 font-medium">Documento</p>
                      <p className="font-bold text-lg text-gray-900">{formData.tipoDocumento} {formData.numeroDocumento}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 font-medium">Correo Electrónico</p>
                      <p className="font-bold text-lg text-[#1e5da8] break-all">{formData.email}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 font-medium">Celular</p>
                      <p className="font-bold text-lg text-gray-900">{formData.celular}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 font-medium">Programa de Interés</p>
                      <p className="font-bold text-lg text-gray-900">{formData.programaInteres}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 font-medium">Nivel de Estudio</p>
                      <p className="font-bold text-lg text-gray-900 capitalize">{formData.nivelEstudio}</p>
                    </div>
                  </div>
                </div>

                {/* Próximos Pasos */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 mb-3 text-lg">Próximos Pasos</p>
                      <ul className="space-y-2.5">
                        <li className="flex items-start gap-3">
                          <span className="text-green-600 font-bold mt-0.5">✓</span>
                          <span className="text-gray-700">Recibirás un correo de confirmación en <strong className="text-gray-900">{formData.email}</strong></span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-green-600 font-bold mt-0.5">✓</span>
                          <span className="text-gray-700">Un asesor académico te contactará en <strong className="text-blue-600">24-48 horas</strong></span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-green-600 font-bold mt-0.5">✓</span>
                          <span className="text-gray-700">Recibirás información detallada sobre el programa y proceso de admisión</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-green-600 font-bold mt-0.5">✓</span>
                          <span className="text-gray-700">Podrás agendar una cita con nuestro equipo de admisiones</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="flex-1 h-12 text-base border-2 hover:border-[#1e5da8] hover:text-[#1e5da8]"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    Nueva Solicitud
                  </Button>
                  <Button
                    onClick={onBack}
                    style={{ backgroundColor: '#1e5da8' }}
                    className="flex-1 h-12 text-base hover:opacity-90 shadow-lg hover:shadow-xl transition-all"
                  >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Volver al Inicio
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </main>

        {/* Footer Premium */}
        <footer className="bg-gray-900 text-gray-300 py-16 lg:py-20 mt-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
              
              {/* Brand */}
              <div>
                <img src={esapLogoWhite} alt="ESAP" className="h-12 mb-6" />
                <p className="text-gray-400 mb-6 leading-relaxed">
                  Transformando la educación pública en Colombia con tecnología de clase mundial.
                </p>
                <div className="flex gap-4">
                  <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-[#1e5da8] rounded-lg flex items-center justify-center transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </a>
                  <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-[#1e5da8] rounded-lg flex items-center justify-center transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                  </a>
                  <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-[#1e5da8] rounded-lg flex items-center justify-center transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  </a>
                </div>
              </div>

              {/* Enlaces Rápidos */}
              <div>
                <h3 className="text-white font-bold mb-4">Enlaces Rápidos</h3>
                <ul className="space-y-3">
                  <li><a href="#" className="hover:text-white transition-colors">Sobre Nosotros</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Programas Académicos</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Investigación</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Carreras</a></li>
                </ul>
              </div>

              {/* Servicios */}
              <div>
                <h3 className="text-white font-bold mb-4">Servicios</h3>
                <ul className="space-y-3">
                  <li><a href="#" className="hover:text-white transition-colors">Vinculaciones</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Verificación de Títulos</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Biblioteca Digital</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Campus Virtual</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Soporte Técnico</a></li>
                </ul>
              </div>

              {/* Contacto */}
              <div>
                <h3 className="text-white font-bold mb-4">Contacto</h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#1e5da8] flex-shrink-0 mt-1" />
                    <span className="text-sm">Calle 44 No. 53-37 CAN<br />Bogotá, Colombia</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-[#1e5da8] flex-shrink-0" />
                    <span className="text-sm">+57 (1) 220 0700</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-[#1e5da8] flex-shrink-0" />
                    <span className="text-sm">info@esap.edu.co</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-500 text-sm">
                © 2025 ESAP - Escuela Superior de Administración Pública. Todos los derechos reservados.
              </p>
              <div className="flex gap-6 text-sm">
                <a href="#" className="hover:text-white transition-colors">Privacidad</a>
                <a href="#" className="hover:text-white transition-colors">Términos</a>
                <a href="#" className="hover:text-white transition-colors">Cookies</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Public Navbar */}
      {onLoginClick && (
        <PublicNavbar 
          onLoginClick={onLoginClick}
          onNavigateToHome={onBack}
        />
      )}
      {/* Header/Navbar espaciado */}
      <div className="h-20" />

      {/* Main Content - con padding-top para el navbar flotante */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24 sm:pt-28 max-w-5xl">
        {/* Botón Volver - Diseño Premium */}
        <motion.button
          onClick={onBack}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.02, x: -4 }}
          whileTap={{ scale: 0.98 }}
          className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#1e5da8] border-2 border-gray-200 hover:border-[#1e5da8] text-gray-700 hover:text-white transition-all duration-200 font-semibold shadow-sm hover:shadow-md mb-8"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">Volver al Inicio</span>
        </motion.button>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-green-100 rounded-full mb-6">
            <Sparkles className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-900">Proceso de Vinculación 100% Digital</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 mb-4">
            Formulario de<br/>
            <span className="text-[#1e5da8]">Vinculaciones ESAP</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Inicia tu proceso de admisión en pocos minutos. Respuesta en menos de 24 horas.
          </p>
        </motion.div>

        {/* Main Card con animación */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm overflow-hidden">
            {/* Header con gradiente */}
            <div className="bg-gradient-to-r from-[#1e5da8] to-blue-600 p-8 text-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black">Solicitud de Admisión</h2>
                  <p className="text-blue-100">Completa el formulario para iniciar tu proceso</p>
                </div>
              </div>
            </div>

            <CardContent className="p-8">
              {/* Info Banner Premium */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 mb-8"
              >
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 mb-2 text-lg">¿Qué sucede después de enviar?</p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">Recibirás un <strong>número de radicado</strong> para seguimiento</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">Un asesor académico te contactará en <strong>24-48 horas</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">Correo de confirmación con información del programa</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </motion.div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Información Personal */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 pb-4 border-b-2 border-gray-200">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <User className="w-5 h-5 text-[#1e5da8]" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Información Personal</h3>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="nombres" className="text-base font-semibold text-gray-900">
                        Nombres <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="nombres"
                        value={formData.nombres}
                        onChange={(e) => handleInputChange('nombres', e.target.value)}
                        placeholder="Ej: Juan Carlos"
                        className="h-12 text-base border-2 focus:border-[#1e5da8]"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="apellidos" className="text-base font-semibold text-gray-900">
                        Apellidos <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="apellidos"
                        value={formData.apellidos}
                        onChange={(e) => handleInputChange('apellidos', e.target.value)}
                        placeholder="Ej: Rodríguez Pérez"
                        className="h-12 text-base border-2 focus:border-[#1e5da8]"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tipoDocumento" className="text-base font-semibold text-gray-900">
                        Tipo de Documento <span className="text-red-500">*</span>
                      </Label>
                      <Select value={formData.tipoDocumento} onValueChange={(v) => handleInputChange('tipoDocumento', v)}>
                        <SelectTrigger className="h-12 text-base border-2 focus:border-[#1e5da8]">
                          <SelectValue placeholder="Selecciona tu documento..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
                          <SelectItem value="TI">Tarjeta de Identidad</SelectItem>
                          <SelectItem value="CE">Cédula de Extranjería</SelectItem>
                          <SelectItem value="PP">Pasaporte</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="numeroDocumento" className="text-base font-semibold text-gray-900">
                        Número de Documento <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="numeroDocumento"
                        value={formData.numeroDocumento}
                        onChange={(e) => handleInputChange('numeroDocumento', e.target.value)}
                        placeholder="Ej: 1012345678"
                        className="h-12 text-base font-mono border-2 focus:border-[#1e5da8]"
                        required
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Información de Contacto */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 pb-4 border-b-2 border-gray-200">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <Mail className="w-5 h-5 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Información de Contacto</h3>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-base font-semibold text-gray-900">
                        Correo Electrónico <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="ejemplo@correo.com"
                        className="h-12 text-base border-2 focus:border-[#1e5da8]"
                        required
                      />
                      <p className="text-sm text-gray-500">Enviaremos información importante a este correo</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="celular" className="text-base font-semibold text-gray-900">
                        Número de Celular <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="celular"
                        value={formData.celular}
                        onChange={(e) => handleInputChange('celular', e.target.value)}
                        placeholder="300 123 4567"
                        className="h-12 text-base border-2 focus:border-[#1e5da8]"
                        required
                      />
                      <p className="text-sm text-gray-500">Formato: 10 dígitos, inicia con 3</p>
                    </div>
                  </div>
                </motion.div>

                {/* Información Académica */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 pb-4 border-b-2 border-gray-200">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Programa de Interés</h3>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="programaInteres" className="text-base font-semibold text-gray-900">
                        Programa Académico <span className="text-red-500">*</span>
                      </Label>
                      <Select value={formData.programaInteres} onValueChange={(v) => handleInputChange('programaInteres', v)}>
                        <SelectTrigger className="h-12 text-base border-2 focus:border-[#1e5da8]">
                          <SelectValue placeholder="Selecciona un programa..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin-publica">Administración Pública</SelectItem>
                          <SelectItem value="gestion-publica">Gestión Pública</SelectItem>
                          <SelectItem value="politicas-publicas">Políticas Públicas</SelectItem>
                          <SelectItem value="gobierno-territorio">Gobierno y Territorio</SelectItem>
                          <SelectItem value="ciencia-politica">Ciencia Política</SelectItem>
                          <SelectItem value="relaciones-internacionales">Relaciones Internacionales</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nivelEstudio" className="text-base font-semibold text-gray-900">
                        Nivel de Estudio <span className="text-red-500">*</span>
                      </Label>
                      <Select value={formData.nivelEstudio} onValueChange={(v) => handleInputChange('nivelEstudio', v)}>
                        <SelectTrigger className="h-12 text-base border-2 focus:border-[#1e5da8]">
                          <SelectValue placeholder="Selecciona el nivel..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pregrado">Pregrado</SelectItem>
                          <SelectItem value="especializacion">Especialización</SelectItem>
                          <SelectItem value="maestria">Maestría</SelectItem>
                          <SelectItem value="doctorado">Doctorado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </motion.div>

                {/* Nota Legal */}
                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6">
                  <div className="flex gap-4">
                    <Shield className="w-6 h-6 text-amber-600 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-gray-900 mb-2">Protección de Datos</p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        Al enviar este formulario, autorizas a ESAP para procesar tus datos personales de acuerdo con la Ley 1581 de 2012. 
                        Utilizaremos tu información únicamente para brindarte información sobre nuestros programas académicos y proceso de admisión.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-14 text-lg font-bold shadow-lg hover:shadow-xl transition-all"
                  style={{ backgroundColor: '#1e5da8' }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Enviando Solicitud...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Enviar Solicitud
                    </>
                  )}
                </Button>

                <p className="text-center text-sm text-gray-500">
                  Al enviar, recibirás un número de radicado para seguimiento
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Footer Premium */}
      <footer className="bg-gray-900 text-gray-300 py-16 lg:py-20 mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            
            {/* Brand */}
            <div>
              <img src={esapLogoWhite} alt="ESAP" className="h-12 mb-6" />
              <p className="text-gray-400 mb-6 leading-relaxed">
                Transformando la educación pública en Colombia con tecnología de clase mundial.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-[#1e5da8] rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-[#1e5da8] rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-[#1e5da8] rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              </div>
            </div>

            {/* Enlaces Rápidos */}
            <div>
              <h3 className="text-white font-bold mb-4">Enlaces Rápidos</h3>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-white transition-colors">Sobre Nosotros</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Programas Académicos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Investigación</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Carreras</a></li>
              </ul>
            </div>

            {/* Servicios */}
            <div>
              <h3 className="text-white font-bold mb-4">Servicios</h3>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-white transition-colors">Vinculaciones</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Verificación de Títulos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Biblioteca Digital</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Campus Virtual</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Soporte Técnico</a></li>
              </ul>
            </div>

            {/* Contacto */}
            <div>
              <h3 className="text-white font-bold mb-4">Contacto</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#1e5da8] flex-shrink-0 mt-1" />
                  <span className="text-sm">Calle 44 No. 53-37 CAN<br />Bogotá, Colombia</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-[#1e5da8] flex-shrink-0" />
                  <span className="text-sm">+57 (1) 220 0700</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-[#1e5da8] flex-shrink-0" />
                  <span className="text-sm">info@esap.edu.co</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © 2025 ESAP - Escuela Superior de Administración Pública. Todos los derechos reservados.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacidad</a>
              <a href="#" className="hover:text-white transition-colors">Términos</a>
              <a href="#" className="hover:text-white transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}