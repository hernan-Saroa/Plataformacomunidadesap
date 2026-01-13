import React, { useState } from 'react';
import esapLogoWhite from 'figma:asset/2eabfe85218557ad27ece74d963c4a3b61b716be.png';
import esapStudentsReal from 'figma:asset/9366aaa7d27856d9aef10bd134f20dbe9d256906.png';
import { 
  ArrowRight, Users, Award, Zap, Star, Shield, Sparkles, TrendingUp, 
  CheckCircle, Globe, Rocket, Clock, Briefcase, Layers, Check
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { FooterWorldClass } from '../FooterWorldClass';
import { NewsletterSection } from '../NewsletterSection';
import { SolicitarCertificadoLaboral } from './SolicitarCertificadoLaboral';
import { PublicTitleVerification } from './PublicTitleVerification';
import { EnrollmentActivationModal } from './EnrollmentActivationModal';

interface LandingPageProps {
  onIrALogin?: () => void;
  onLoginClick?: () => void;
  onNavigate?: (section: string) => void;
}

export function LandingPage({ onIrALogin, onLoginClick, onNavigate }: LandingPageProps) {
  const [vistaActual, setVistaActual] = useState<'landing' | 'certificados-laborales' | 'certificados-graduados'>('landing');
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  
  const handleLoginClick = () => {
    if (onIrALogin) {
      onIrALogin();
    } else if (onLoginClick) {
      onLoginClick();
    }
  };

  // Handler para cuando el usuario completa exitosamente el enrolamiento
  const handleEnrollmentSuccess = (userData: any) => {
    console.log('✅ Enrolamiento exitoso para:', userData);
    // Redirigir al login después del enrolamiento exitoso
    setTimeout(() => {
      handleLoginClick();
    }, 500);
  };

  // Handler para abrir el modal de enrolamiento
  const handleActivateNowClick = () => {
    setIsEnrollmentModalOpen(true);
  };
  
  const prefersReducedMotion = useReducedMotion();
  
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 300], [1, 0.95]);

  const services = [
    {
      icon: <Award className="w-7 h-7" />,
      title: 'Validación de Certificados de Graduados',
      description: 'Cada certificado tiene un QR único para validación pública. Sistema de trazabilidad completa que registra cada validación.',
      action: () => setVistaActual('certificados-graduados'),
      gradient: 'from-emerald-600 to-emerald-700',
      badge: 'Seguro'
    },
    {
      icon: <Briefcase className="w-7 h-7" />,
      title: 'Certificados Laborales',
      description: 'Solicita tu certificado laboral de forma automática. Validamos tu identidad por correo y generas tu certificado al instante.',
      action: () => {
        if (onNavigate) {
          onNavigate('solicitar-certificados-laborales');
        } else {
          setVistaActual('certificados-laborales');
        }
      },
      gradient: 'from-sky-600 to-blue-700',
      badge: 'Abierto'
    }
  ];

  const stats = [
    { 
      value: '+17 mil', 
      label: 'Estudiantes',
      icon: <Users className="w-6 h-6" />,
      trend: 'Comunidad universitaria'
    },
    { 
      value: '66', 
      label: 'Años de Trayectoria',
      icon: <Award className="w-6 h-6" />,
      trend: 'Desde 1958'
    },
    { 
      value: '84%', 
      label: 'Cobertura Nacional',
      icon: <Globe className="w-6 h-6" />,
      trend: 'Todo el país'
    },
    { 
      value: '348', 
      label: 'Entidades Aliadas',
      icon: <Star className="w-6 h-6" />,
      trend: 'Red institucional'
    }
  ];

  const testimonials = [
    {
      name: 'María González Pérez',
      role: 'Estudiante de Administración Pública - 4to Semestre',
      content: 'ComUNIdad de ESAP transformó completamente mi experiencia universitaria. Ya no tengo que ir presencialmente para hacer trámites, todo es digital y rápido. Puedo consultar mis notas, inscribirme a cursos y solicitar certificados desde mi celular. ¡Increíble!',
      rating: 5,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
      location: 'Bogotá, Colombia'
    },
    {
      name: 'Carlos Andrés Ramírez',
      role: 'Egresado 2023 - Especialista en Gestión Pública',
      content: 'El networking que logré a través de la comunidad ESAP fue fundamental para mi carrera. Hoy trabajo en el sector público y la plataforma me permitió conectar con profesores y egresados. Los certificados con QR único son perfectos: las entidades los escanean y validan mi título instantáneamente.',
      rating: 5,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
      location: 'Medellín, Colombia'
    },
    {
      name: 'Ana Lucía Martínez',
      role: 'Aspirante - Programa de Derecho Administrativo',
      content: 'El proceso de vinculación fue sorprendentemente rápido y profesional. Llené el formulario en línea y me contactaron en menos de 12 horas con toda la información. Sin filas, sin papeleos. La atención personalizada es de primer nivel.',
      rating: 5,
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
      location: 'Cali, Colombia'
    }
  ];

  const universities = [
    'Universidad Nacional',
    'ESAP',
    'Universidad de los Andes',
    'Pontificia Javeriana',
    'Universidad del Rosario'
  ];

  // Renderizar vista de certificados laborales si está activa
  if (vistaActual === 'certificados-laborales') {
    return (
      <SolicitarCertificadoLaboral 
        onBack={() => setVistaActual('landing')}
        onLoginClick={handleLoginClick}
      />
    );
  }

  // Renderizar vista de certificados de graduados si está activa
  if (vistaActual === 'certificados-graduados') {
    return (
      <PublicTitleVerification 
        onBack={() => setVistaActual('landing')}
        onLoginClick={handleLoginClick}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      {/* Navbar Superior Flotante - Diseño Moderno con Azul Medio */}
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[95%] max-w-6xl"
      >
        <div className="bg-[#1e5da8] rounded-2xl shadow-2xl px-4 sm:px-6 py-3 border border-blue-400/30 backdrop-blur-xl"
          style={{
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)'
          }}
        >
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img 
                src={esapLogoWhite} 
                alt="ESAP Logo" 
                className="h-8 sm:h-10 w-auto object-contain brightness-0 invert"
              />
              <div className="hidden sm:block">
                <p className="text-[9px] font-medium text-white/90 -mt-0.5">ComUNIdad</p>
              </div>
            </div>

            {/* Menú Desktop */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#hero" className="text-sm font-semibold text-white/90 hover:text-white transition-colors">
                Inicio
              </a>
              <a href="#servicios" className="text-sm font-semibold text-white/90 hover:text-white transition-colors">
                Servicios
              </a>
              <a href="#beneficios" className="text-sm font-semibold text-white/90 hover:text-white transition-colors">
                Beneficios
              </a>
              <a href="#contacto" className="text-sm font-semibold text-white/90 hover:text-white transition-colors">
                Contacto
              </a>
            </div>

            {/* Botón Login */}
            <Button
              onClick={handleLoginClick}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full font-semibold text-xs sm:text-sm transition-all duration-300 bg-white text-[#003DA5] hover:bg-blue-50 hover:scale-105 shadow-lg"
            >
              <span className="hidden sm:inline">Iniciar Sesión</span>
              <span className="sm:hidden">Entrar</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section - World Class */}
      <section id="hero" className="relative min-h-[85vh] sm:min-h-[80vh] lg:min-h-screen flex items-center justify-center overflow-hidden pt-20 sm:pt-24 lg:pt-16">
        {/* Animated Background - OPTIMIZADO */}
        <div className="absolute inset-0 z-0" style={{ willChange: 'transform' }}>
          {/* Gradient Base */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 25%, #1e5da8 50%, #2563eb 75%, #3b82f6 100%)',
              transform: 'translateZ(0)', // Forzar GPU acceleration
            }}
          />
          
          {/* Animated Gradient Overlay - OPTIMIZADO: Reducida duración y solo si no prefiere movimiento reducido */}
          {!prefersReducedMotion && (
            <motion.div 
              className="absolute inset-0 opacity-30"
              style={{ willChange: 'opacity, transform' }}
              animate={{
                background: [
                  'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)',
                  'radial-gradient(circle at 80% 50%, rgba(168, 85, 247, 0.3) 0%, transparent 50%)',
                  'radial-gradient(circle at 50% 80%, rgba(34, 211, 238, 0.3) 0%, transparent 50%)',
                  'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)',
                ]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }} // Aumentado a 20s para reducir re-renders
            />
          )}
          
          {/* Grid Pattern */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
            }}
          />
          
          {/* Floating Elements - OPTIMIZADO: Solo si no prefiere movimiento reducido */}
          {!prefersReducedMotion && (
            <>
              <motion.div
                className="absolute top-20 left-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl hidden sm:block"
                style={{ willChange: 'transform' }}
                animate={{
                  x: [0, 50, 0],
                  y: [0, 30, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} // Aumentado a 12s
              />
              <motion.div
                className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl hidden sm:block"
                style={{ willChange: 'transform' }}
                animate={{
                  x: [0, -50, 0],
                  y: [0, -30, 0],
                  scale: [1, 1.2, 1],
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} // Aumentado a 15s
              />
            </>
          )}
        </div>

        {/* Hero Content - OPTIMIZADO */}
        <motion.div 
          className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 xl:py-16 max-w-7xl"
          style={{ 
            opacity: heroOpacity, 
            scale: heroScale,
            willChange: 'transform, opacity',
            transform: 'translateZ(0)', // GPU acceleration
          }}
        >
          <div className="grid md:grid-cols-2 gap-8 sm:gap-8 lg:gap-10 items-center pb-4 sm:pb-4 lg:pb-8">
            
            {/* Left Column - Text Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-center lg:text-left"
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full mb-3 sm:mb-6"
              >
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span className="text-white text-sm font-semibold">ComUNIdad Universitaria</span>
                <motion.div
                  className="w-2 h-2 bg-green-400 rounded-full"
                  animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>

              {/* Main Heading */}
              <h1 className="text-4xl xs:text-5xl sm:text-5xl md:text-6xl lg:text-6xl xl:text-7xl font-black text-white mb-3 sm:mb-4 lg:mb-6 tracking-tight leading-tight break-words">
                La Escuela
                <span className="block bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mt-1 sm:mt-2">
                  del Futuro, Hoy
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-sm xs:text-base sm:text-lg md:text-xl lg:text-xl xl:text-2xl text-blue-100 mb-4 sm:mb-6 lg:mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                En la  <span className="font-semibold text-white">ComUNIdad ESAP</span> de Colombia. 
                Todos tus trámites, servicios académicos y comunidad <span className="font-semibold text-white">en un solo lugar</span>.
              </p>

              {/* Stats Pills */}
              <div className="flex flex-wrap gap-2 sm:gap-3 justify-center lg:justify-start mb-4 sm:mb-6 lg:mb-8">
                <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full">
                  <span className="text-white font-bold text-sm sm:text-base">66 años</span>
                  <span className="text-blue-200 text-xs sm:text-sm ml-1 sm:ml-2">de Historia</span>
                </div>
                <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full">
                  <span className="text-white font-bold text-sm sm:text-base">84%</span>
                  <span className="text-blue-200 text-xs sm:text-sm ml-1 sm:ml-2">Cobertura</span>
                </div>
                <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full">
                  <span className="text-white font-bold text-sm sm:text-base">+17 mil</span>
                  <span className="text-blue-200 text-xs sm:text-sm ml-1 sm:ml-2">Estudiantes</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col xs:flex-row gap-3 justify-center lg:justify-start">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={handleActivateNowClick}
                    size="lg"
                    className="w-full xs:w-auto px-6 py-3 xs:px-7 xs:py-4 sm:px-8 sm:py-6 bg-white text-[#1e5da8] hover:bg-blue-50 shadow-2xl shadow-blue-500/50 group relative overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2 font-bold text-sm xs:text-base sm:text-lg">
                      Actívate Ahora
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 opacity-0 group-hover:opacity-20"
                      initial={false}
                    />
                  </Button>
                </motion.div>
              </div>

              {/* Trust Indicators */}
              <div className="mt-4 sm:mt-8 lg:mt-12 pt-4 sm:pt-6 lg:pt-8 border-t border-white/10">
                <p className="text-blue-200 text-xs sm:text-sm mb-3 sm:mb-4">Respaldado por:</p>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-6 justify-center lg:justify-start opacity-80">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                    <span className="text-white text-xs sm:text-sm font-semibold">ESAP</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                    <span className="text-white text-xs sm:text-sm font-semibold">100% Digital</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                    <span className="text-white text-xs sm:text-sm font-semibold">Certificados digitales</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                    <span className="text-white text-xs sm:text-sm font-semibold">24/7</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Visual */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative mt-8 md:mt-0"
            >
              {/* Floating Card */}
              <motion.div
                className="relative"
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20">
                  <img
                    src={esapStudentsReal}
                    alt="Estudiantes ESAP - Escuela Superior de Administración Pública Colombia"
                    className="w-full h-[300px] xs:h-[350px] sm:h-[400px] md:h-[450px] lg:h-[500px] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 via-blue-900/20 to-transparent" />
                  
                  {/* Floating Stats */}
                  <motion.div
                    className="absolute top-6 right-6 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center">
                        <Globe className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">84%</p>
                        <p className="text-xs text-gray-600">Cobertura Nacional</p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -top-4 -left-4 w-24 h-24 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-3xl blur-2xl opacity-60" />
                <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-br from-purple-400 to-pink-500 rounded-3xl blur-2xl opacity-60" />
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-4 sm:bottom-8 lg:bottom-10 left-1/2 transform -translate-x-1/2 z-20 hidden sm:flex"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-white/60 text-xs font-medium">Descubre más</span>
            <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-1">
              <motion.div
                className="w-1.5 h-1.5 bg-white rounded-full"
                animate={{ y: [0, 20, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Stats Section - Glassmorphism */}
      <section className="relative -mt-8 sm:-mt-12 lg:-mt-20 z-20 pb-8 sm:pb-12 lg:pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-12"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center group"
                >
                  <div className="mb-3 sm:mb-4 flex justify-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-[#1e5da8] to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                      <div className="text-white scale-75 sm:scale-90 lg:scale-100">
                        {stat.icon}
                      </div>
                    </div>
                  </div>
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-gray-900 mb-1 sm:mb-2 bg-gradient-to-r from-[#1e5da8] to-blue-600 bg-clip-text text-transparent">
                    {stat.value}
                  </h3>
                  <p className="text-gray-600 font-medium mb-1.5 sm:mb-2 text-xs sm:text-sm lg:text-base">{stat.label}</p>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 bg-green-100 text-green-700 rounded-full text-[10px] sm:text-xs font-semibold">
                    <TrendingUp className="w-3 h-3" />
                    {stat.trend}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Services Section - Interactive Cards */}
      <section id="servicios" className="py-8 sm:py-10 lg:py-12 xl:py-16 bg-gradient-to-b from-white to-gray-50 scroll-mt-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-10 lg:mb-12"
          >
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-100 text-emerald-700 rounded-full mb-4 sm:mb-6 font-semibold text-xs sm:text-sm">
              <Rocket className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Servicios Destacados
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-gray-900 mb-4 sm:mb-6 leading-tight">
              Descubre lo que puedes hacer
              <span className="block bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                con ComUNIdad
              </span>
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto">
              Accede a los servicios más importantes de ESAP. Rápido, fácil y 100% digital.
            </p>
          </motion.div>

          {/* Services Grid - Optimizado para laptops */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7 xl:gap-8 max-w-7xl mx-auto">
            {services.map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                whileHover={{ scale: 1.05 }}
                className="group cursor-pointer"
                onClick={service.action}
              >
                <Card className="h-full border-2 border-gray-200 hover:border-transparent transition-all duration-300 overflow-hidden relative">
                  {/* Gradient Background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${service.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  
                  <CardContent className="p-6 lg:p-8 xl:p-10 relative z-10">
                    {/* Badge */}
                    <div className="absolute top-6 right-6">
                      <span className="px-3 py-1 bg-white/90 text-gray-900 rounded-full text-xs font-bold shadow-lg">
                        {service.badge}
                      </span>
                    </div>

                    {/* Icon */}
                    <div className="mb-6">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-white group-hover:to-white rounded-3xl flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-lg">
                        <div className="text-[#1e5da8] group-hover:text-white transition-colors">
                          {service.icon}
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <h3 className="text-2xl font-bold text-gray-900 group-hover:text-white mb-4 transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-gray-600 group-hover:text-white/90 mb-6 leading-relaxed transition-colors">
                      {service.description}
                    </p>

                    {/* CTA */}
                    <div className="flex items-center gap-2 text-[#1e5da8] group-hover:text-white font-bold transition-colors">
                      <span>Comenzar ahora</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Two Environments Section */}
      <section className="py-6 sm:py-8 lg:py-12 xl:py-16 bg-gradient-to-br from-blue-900 via-[#1e5da8] to-purple-900 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, white 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-10 lg:mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full mb-6 text-white font-semibold text-sm">
              <Layers className="w-4 h-4" />
              Dos Ambientes, Una Experiencia
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-white mb-4 sm:mb-6 leading-tight">
              Diseñada para todos
              <span className="block bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                los roles en ESAP
              </span>
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-blue-100 max-w-3xl mx-auto px-4">
              ComUNIdad tiene dos experiencias completamente diferentes pero conectadas entre sí.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Ambiente 1: Portal Transaccional */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Card className="h-full bg-white/95 backdrop-blur-sm border-2 border-white/50 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-2">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 mb-3 sm:mb-4">
                    Portal Transaccional
                    <span className="block text-base sm:text-lg font-semibold text-emerald-600 mt-1.5 sm:mt-2">
                      La Comunidad ESAP
                    </span>
                  </h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Para <strong>estudiantes, docentes, administrativos y graduados</strong>. 
                    Mucho más que trámites: es el corazón comunitario de ESAP.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Servicios Académicos</p>
                        <p className="text-sm text-gray-600">Calificaciones, certificados, pagos, horarios</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Red Social Comunitaria</p>
                        <p className="text-sm text-gray-600">Noticias, eventos, notificaciones, blogs</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Directorio de Personas</p>
                        <p className="text-sm text-gray-600">Busca estudiantes, docentes, mentores, alumni</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Perfil Universitario Digital</p>
                        <p className="text-sm text-gray-600">Hoja de vida completa y portafolio digital</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-emerald-600">Para toda la comunidad</span>
                      <Users className="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Ambiente 2: Backoffice Administrativo */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <Card className="h-full bg-white/95 backdrop-blur-sm border-2 border-white/50 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-2">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 mb-3 sm:mb-4">
                    Backoffice Administrativo
                    <span className="block text-base sm:text-lg font-semibold text-blue-600 mt-1.5 sm:mt-2">
                      Gestión Interna
                    </span>
                  </h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Para <strong>personal administrativo y directivo</strong>. 
                    Herramientas avanzadas para gestión eficiente de ESAP.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Gestión de Usuarios</p>
                        <p className="text-sm text-gray-600">Administra estudiantes, docentes y personal</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Roles y Permisos</p>
                        <p className="text-sm text-gray-600">Control granular de accesos y permisos</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Auditoría y Trazabilidad</p>
                        <p className="text-sm text-gray-600">Registro completo de todas las acciones</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Dashboard Ejecutivo</p>
                        <p className="text-sm text-gray-600">Métricas e informes en tiempo real</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-blue-600">Personal autorizado</span>
                      <Shield className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Connection Visual */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="mt-16 text-center"
          >
            <div className="inline-flex items-center gap-4 px-6 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <span className="text-white font-semibold">Portal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-white/30" />
                <Zap className="w-5 h-5 text-yellow-400" />
                <div className="w-8 h-0.5 bg-white/30" />
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <span className="text-white font-semibold">Backoffice</span>
              </div>
            </div>
            <p className="text-blue-200 mt-4 text-sm">
              Dos sistemas conectados. Una experiencia perfecta.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Newsletter Section - MOVIDO ANTES DEL CTA */}
      <NewsletterSection />

      {/* Footer World Class - Conforme a Normativas del Gobierno Colombiano */}
      <FooterWorldClass />

      {/* Modal de Enrolamiento - Actívate Ahora */}
      <EnrollmentActivationModal
        isOpen={isEnrollmentModalOpen}
        onClose={() => setIsEnrollmentModalOpen(false)}
        onSuccess={handleEnrollmentSuccess}
      />
    </div>
  );
}
