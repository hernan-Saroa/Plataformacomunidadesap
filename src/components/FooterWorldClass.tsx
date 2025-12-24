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
    <footer className={`${isDark ? 'bg-gradient-to-b from-gray-900 to-gray-950 text-gray-300' : 'bg-gray-50 text-gray-700'} border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Column 1: Institucional */}
          <div>
            <h4 className={`font-black text-sm uppercase tracking-wider mb-4 ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
              <Building2 className="w-4 h-4 text-[#1e5da8]" />
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
                    className={`text-sm hover:text-[#1e5da8] transition-colors flex items-center gap-2 group`}
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
              <GraduationCap className="w-4 h-4 text-[#1e5da8]" />
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
                    className={`text-sm hover:text-[#1e5da8] transition-colors flex items-center gap-2 group`}
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
              <FileText className="w-4 h-4 text-[#1e5da8]" />
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
                    className={`text-sm hover:text-[#1e5da8] transition-colors flex items-center gap-2 group`}
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
              <Shield className="w-4 h-4 text-[#1e5da8]" />
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
                    className={`text-sm hover:text-[#1e5da8] transition-colors flex items-center gap-2 group`}
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
              <MapPin className="w-4 h-4 text-[#1e5da8]" />
              Contacto
            </h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#1e5da8]">Sede Principal - Bogotá</p>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                  <span>Diagonal 40 No. 46A - 37<br />Bogotá D.C., Colombia</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 flex-shrink-0 text-gray-400" />
                <div>
                  <a href="tel:+576014440909" className="hover:text-[#1e5da8] transition-colors">
                    (601) 220 0700
                  </a>
                  <p className="text-xs text-gray-500">Línea Nacional: 018000 119 190</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 flex-shrink-0 text-gray-400" />
                <a href="mailto:correspondencia@esap.edu.co" className="hover:text-[#1e5da8] transition-colors">
                  correspondencia@esap.edu.co
                </a>
              </div>

              <div className="flex items-start gap-2 text-sm">
                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                <span className="text-xs">
                  Lunes a Viernes<br />
                  8:00 AM - 5:00 PM
                </span>
              </div>
            </div>
          </div>
        </div>

        <Separator className={`my-8 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`} />

        {/* Social Media & Certifications */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          {/* Social Media */}
          <div className="lg:col-span-1">
            <p className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Síguenos en:
            </p>
            <div className="flex gap-3">
              {socialMedia.map((social, index) => {
                const Icon = social.icon;
                return (
                  <motion.a
                    key={index}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className={`w-10 h-10 rounded-full ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-300'} flex items-center justify-center transition-colors ${social.color} hover:text-white`}
                    aria-label={social.name}
                  >
                    <Icon className="w-5 h-5" />
                  </motion.a>
                );
              })}
            </div>
          </div>

          {/* Certifications & Badges */}
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-6 justify-center lg:justify-end">
              {/* GOV.CO Badge */}
              <motion.a
                href="https://www.gov.co"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border-2 border-blue-600 hover:shadow-lg transition-shadow"
              >
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white font-black text-xs">GOV</span>
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-blue-600 leading-none">GOV.CO</p>
                  <p className="text-xs text-gray-600 leading-none">Portal Oficial</p>
                </div>
                <ExternalLink className="w-3 h-3 text-blue-600" />
              </motion.a>

              {/* ISO Certification */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200"
              >
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <div className="text-left">
                  <p className="text-xs font-black text-emerald-700 leading-none">ISO 9001:2015</p>
                  <p className="text-xs text-emerald-600 leading-none">Certificado</p>
                </div>
              </motion.div>

              {/* Ministerio de Educación */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200"
              >
                <Shield className="w-6 h-6 text-blue-600" />
                <div className="text-left">
                  <p className="text-xs font-black text-blue-700 leading-none">MinEducación</p>
                  <p className="text-xs text-blue-600 leading-none">Acreditada</p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        <Separator className={`my-8 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`} />

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <div className={isDark ? 'text-gray-400' : 'text-gray-600'}>
            <p>
              © {new Date().getFullYear()} <span className="font-semibold">ESAP</span> - Escuela Superior de Administración Pública. 
              <span className="hidden sm:inline"> Todos los derechos reservados.</span>
            </p>
            <p className="text-xs mt-1">
              Entidad adscrita al Departamento Administrativo de la Función Pública
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className={`px-3 py-1 rounded-full ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'} flex items-center gap-1`}>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
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