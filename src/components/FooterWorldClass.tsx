import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Twitter, 
  Youtube, 
  Instagram,
  Linkedin,
  ExternalLink,
  Send,
  Building2,
  GraduationCap,
  FileText,
  Shield,
  ArrowRight,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { toast } from 'sonner@2.0.3';
import esapLogoWhite from 'figma:asset/2eabfe85218557ad27ece74d963c4a3b61b716be.png';

interface FooterWorldClassProps {
  variant?: 'light' | 'dark';
}

export function FooterWorldClass({ variant = 'dark' }: FooterWorldClassProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Por favor ingresa tu correo electrónico');
      return;
    }

    setLoading(true);
    // Simular envío
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);
    
    toast.success('¡Suscripción exitosa!', {
      description: 'Recibirás nuestras novedades en tu correo',
    });
    setEmail('');
  };

  const institucional = [
    { label: 'Acerca de ESAP', href: '#', icon: Building2 },
    { label: 'Misión y Visión', href: '#' },
    { label: 'Directivas', href: '#' },
    { label: 'Sedes y Regionales', href: '#' },
    { label: 'Trabaje con Nosotros', href: '#' },
    { label: 'Rendición de Cuentas', href: '#' },
  ];

  const academico = [
    { label: 'Programas Pregrado', href: '#', icon: GraduationCap },
    { label: 'Programas Posgrado', href: '#' },
    { label: 'Educación Continua', href: '#' },
    { label: 'Investigación', href: '#' },
    { label: 'Biblioteca Virtual', href: '#' },
    { label: 'Calendario Académico', href: '#' },
  ];

  const servicios = [
    { label: 'Portal Transaccional', href: '#', icon: FileText },
    { label: 'Certificados', href: '#' },
    { label: 'PQRS', href: '#' },
    { label: 'Notificaciones Judiciales', href: '#' },
    { label: 'Trámites y Servicios', href: '#' },
    { label: 'Soporte Técnico', href: '#' },
  ];

  const legal = [
    { label: 'Políticas de Privacidad', href: '#', icon: Shield },
    { label: 'Términos y Condiciones', href: '#' },
    { label: 'Tratamiento de Datos', href: '#' },
    { label: 'Transparencia', href: '#' },
    { label: 'Mapa del Sitio', href: '#' },
    { label: 'Accesibilidad', href: '#' },
  ];

  const socialMedia = [
    { 
      name: 'Facebook', 
      icon: Facebook, 
      href: 'https://facebook.com/esapoficial',
      color: 'hover:bg-blue-600'
    },
    { 
      name: 'Twitter', 
      icon: Twitter, 
      href: 'https://twitter.com/esapoficial',
      color: 'hover:bg-sky-500'
    },
    { 
      name: 'Instagram', 
      icon: Instagram, 
      href: 'https://instagram.com/esapoficial',
      color: 'hover:bg-pink-600'
    },
    { 
      name: 'YouTube', 
      icon: Youtube, 
      href: 'https://youtube.com/esapoficial',
      color: 'hover:bg-red-600'
    },
    { 
      name: 'LinkedIn', 
      icon: Linkedin, 
      href: 'https://linkedin.com/school/esap',
      color: 'hover:bg-blue-700'
    },
  ];

  const isDark = variant === 'dark';

  return (
    <footer className={`${isDark ? 'bg-gradient-to-b from-[#1e5da8] via-[#1557a0] to-[#0f3d7a] text-blue-100' : 'bg-gray-50 text-gray-700'} border-t ${isDark ? 'border-blue-800/50' : 'border-gray-200'}`}>
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Logo ESAP y Slogan Principal */}
        <div className="mb-12 pb-8 border-b border-blue-700/30">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex-shrink-0"
            >
              <img 
                src={esapLogoWhite} 
                alt="ESAP - Escuela Superior de Administración Pública" 
                className="h-20 w-auto object-contain drop-shadow-2xl"
              />
            </motion.div>

            {/* Información Institucional */}
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl font-black text-white mb-2">
                Escuela Superior de Administración Pública
              </h3>
              <p className="text-blue-200 text-sm leading-relaxed mb-3">
                Formando líderes de excelencia al servicio del Estado y la sociedad colombiana desde 1958.
              </p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                <span className="px-3 py-1 bg-cyan-400/20 text-cyan-200 rounded-full text-xs font-semibold border border-cyan-400/30">
                  Educación Pública de Calidad
                </span>
                <span className="px-3 py-1 bg-green-400/20 text-green-200 rounded-full text-xs font-semibold border border-green-400/30">
                  Acreditación de Alta Calidad
                </span>
                <span className="px-3 py-1 bg-purple-400/20 text-purple-200 rounded-full text-xs font-semibold border border-purple-400/30">
                  Investigación e Innovación
                </span>
              </div>
            </div>

            {/* Redes Sociales */}
            <div className="flex-shrink-0">
              <p className="text-sm font-semibold mb-3 text-white text-center">Síguenos:</p>
              <div className="flex gap-2">
                {socialMedia.map((social, index) => {
                  const Icon = social.icon;
                  return (
                    <motion.a
                      key={index}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.15, y: -3 }}
                      whileTap={{ scale: 0.95 }}
                      className={`w-10 h-10 rounded-full bg-blue-800/50 border border-blue-600/30 flex items-center justify-center transition-all ${social.color} text-white shadow-lg`}
                      aria-label={social.name}
                    >
                      <Icon className="w-5 h-5" />
                    </motion.a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Column 1: Institucional */}
          <div>
            <h4 className={`font-black text-sm uppercase tracking-wider mb-4 ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
              <Building2 className="w-4 h-4 text-cyan-400" />
              Institucional
            </h4>
            <ul className="space-y-3">
              {institucional.map((item, index) => (
                <motion.li 
                  key={index}
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.2 }}
                >
                  <a 
                    href={item.href}
                    className={`text-sm hover:text-cyan-300 transition-colors flex items-center gap-2 group`}
                  >
                    {item.label}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Column 2: Académico */}
          <div>
            <h4 className={`font-black text-sm uppercase tracking-wider mb-4 ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
              <GraduationCap className="w-4 h-4 text-cyan-400" />
              Académico
            </h4>
            <ul className="space-y-3">
              {academico.map((item, index) => (
                <motion.li 
                  key={index}
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.2 }}
                >
                  <a 
                    href={item.href}
                    className={`text-sm hover:text-cyan-300 transition-colors flex items-center gap-2 group`}
                  >
                    {item.label}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Column 3: Servicios */}
          <div>
            <h4 className={`font-black text-sm uppercase tracking-wider mb-4 ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
              <FileText className="w-4 h-4 text-cyan-400" />
              Servicios
            </h4>
            <ul className="space-y-3">
              {servicios.map((item, index) => (
                <motion.li 
                  key={index}
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.2 }}
                >
                  <a 
                    href={item.href}
                    className={`text-sm hover:text-cyan-300 transition-colors flex items-center gap-2 group`}
                  >
                    {item.label}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div>
            <h4 className={`font-black text-sm uppercase tracking-wider mb-4 ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
              <Shield className="w-4 h-4 text-cyan-400" />
              Legal
            </h4>
            <ul className="space-y-3">
              {legal.map((item, index) => (
                <motion.li 
                  key={index}
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.2 }}
                >
                  <a 
                    href={item.href}
                    className={`text-sm hover:text-cyan-300 transition-colors flex items-center gap-2 group`}
                  >
                    {item.label}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Column 5: Contacto */}
          <div>
            <h4 className={`font-black text-sm uppercase tracking-wider mb-4 ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
              <MapPin className="w-4 h-4 text-cyan-400" />
              Contacto
            </h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-cyan-300">Sede Principal - Bogotá</p>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-300" />
                  <span>Diagonal 40 No. 46A - 37<br />Bogotá D.C., Colombia</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 flex-shrink-0 text-blue-300" />
                <div>
                  <a href="tel:+576014440909" className="hover:text-cyan-300 transition-colors">
                    (601) 220 0700
                  </a>
                  <p className="text-xs text-blue-200">Línea Nacional: 018000 119 190</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 flex-shrink-0 text-blue-300" />
                <a href="mailto:correspondencia@esap.edu.co" className="hover:text-cyan-300 transition-colors">
                  correspondencia@esap.edu.co
                </a>
              </div>

              <div className="flex items-start gap-2 text-sm">
                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-300" />
                <span className="text-xs">
                  Lunes a Viernes<br />
                  8:00 AM - 5:00 PM
                </span>
              </div>
            </div>
          </div>
        </div>

        <Separator className={`my-8 ${isDark ? 'bg-blue-700/30' : 'bg-gray-200'}`} />

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <div className={isDark ? 'text-blue-200' : 'text-gray-600'}>
            <p>
              © {new Date().getFullYear()} <span className="font-semibold text-white">ESAP</span> - Escuela Superior de Administración Pública. 
              <span className="hidden sm:inline"> Todos los derechos reservados.</span>
            </p>
            <p className="text-xs mt-1">
              Entidad adscrita al Departamento Administrativo de la Función Pública
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className={`px-3 py-1 rounded-full ${isDark ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-green-100 text-green-700'} flex items-center gap-1`}>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Última actualización: {new Date().toLocaleDateString('es-CO', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Decorative Bottom Bar */}
      <div className="h-1 bg-gradient-to-r from-[#1e5da8] via-[#2a6dbd] to-[#1557a0]" />
    </footer>
  );
}