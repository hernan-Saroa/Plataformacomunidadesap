/**
 * SystemSelector - Selector de Sistema para Usuarios con Acceso Dual
 * Diseño premium con colores ESAP y UX optimizada
 */

import { motion } from 'motion/react';
import { Building2, Users, ArrowRight, LogOut, Shield, BarChart3, MessageSquare, Check } from 'lucide-react';
import { useState } from 'react';
import esapLogo from 'figma:asset/1a688049d0ee8e121a6f2fff3a4cd08b5a2451ba.png';

interface SystemSelectorProps {
  userName: string;
  userEmail: string;
  userRoles: string[];
  onSelectSystem: (system: 'backoffice' | 'portal') => void;
  onLogout: () => void;
}

export function SystemSelector({
  userName,
  userEmail,
  userRoles,
  onSelectSystem,
  onLogout
}: SystemSelectorProps) {
  const [hoveredSystem, setHoveredSystem] = useState<string | null>(null);

  const systems = [
    {
      id: 'backoffice',
      name: 'Backoffice Administrativo',
      subtitle: 'Sistema de gestión interna ESAP',
      icon: Building2,
      badge: '19 Módulos',
      color: '#003DA5',
      lightColor: '#E3F2FD',
      features: [
        'Dashboard Ejecutivo con 25+ KPIs',
        'Gestión de Usuarios y Personas',
        'Estructura Organizacional (17 Territoriales)',
        'Programas Académicos y Estudiantes',
        'Certificados Laborales y Académicos',
        'Control Interno y Auditoría',
        'Reportes y Analytics Avanzados',
        'Roles y Permisos'
      ]
    },
    {
      id: 'portal',
      name: 'Portal Transaccional',
      subtitle: 'Red social universitaria ESAP',
      icon: Users,
      badge: '12 Módulos',
      color: '#10b981',
      lightColor: '#D1FAE5',
      features: [
        'Red Social y Feed de Publicaciones',
        'Grupos y Comunidades Académicas',
        'Eventos y Calendario Universitario',
        'Bolsa de Empleo y Oportunidades',
        'Mensajería y Notificaciones',
        'Perfil Profesional y Conexiones',
        'Noticias y Anuncios Institucionales',
        'Servicios Académicos y Certificados'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-6xl"
      >
        {/* Header */}
        <div className="text-center mb-8 lg:mb-12">
          {/* Logo con glassmorphism */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="flex justify-center mb-8"
          >
            <div className="relative">
              {/* Glow azul ESAP */}
              <div className="absolute inset-0 bg-[#003DA5] rounded-3xl blur-2xl opacity-20" />
              
              {/* Container del logo */}
              <div className="relative bg-gradient-to-br from-[#003DA5] to-[#0052cc] p-6 rounded-3xl shadow-2xl">
                <img
                  src={esapLogo}
                  alt="ESAP"
                  className="h-16 w-auto"
                />
              </div>
            </div>
          </motion.div>

          {/* Welcome Message */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-center gap-3 mb-3">
              <Shield className="w-7 h-7 text-[#003DA5]" />
              <h1 className="text-3xl lg:text-4xl font-bold text-slate-800">
                Bienvenido, <span className="text-[#003DA5]">{userName}</span>
              </h1>
            </div>
            
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Tienes acceso a <span className="font-bold text-[#003DA5]">ambos sistemas</span>
              <br />
              Selecciona dónde deseas ingresar:
            </p>
            
            {/* User Info */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              <div className="px-4 py-2 bg-white rounded-full border border-slate-200 text-slate-700 text-sm shadow-sm">
                {userEmail}
              </div>
              <div className="px-4 py-2 bg-gradient-to-r from-[#003DA5] to-[#0052cc] rounded-full font-bold text-white text-sm shadow-lg">
                {userRoles.join(' + ')}
              </div>
            </div>
          </motion.div>
        </div>

        {/* System Cards */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {systems.map((system, index) => {
            const Icon = system.icon;
            const isHovered = hoveredSystem === system.id;

            return (
              <motion.div
                key={system.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                onMouseEnter={() => setHoveredSystem(system.id)}
                onMouseLeave={() => setHoveredSystem(null)}
              >
                <motion.button
                  onClick={() => onSelectSystem(system.id as 'backoffice' | 'portal')}
                  className="w-full text-left h-full group"
                  whileHover={{ y: -6 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  {/* Card principal */}
                  <div className="bg-white rounded-3xl shadow-xl border-2 border-slate-200 overflow-hidden h-full hover:shadow-2xl transition-all duration-300"
                    style={{
                      borderColor: isHovered ? system.color : undefined
                    }}
                  >
                    {/* Header con color del sistema */}
                    <div 
                      className="p-6 lg:p-8 relative overflow-hidden"
                      style={{ backgroundColor: system.color }}
                    >
                      {/* Pattern decorativo */}
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0" style={{
                          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                          backgroundSize: '24px 24px'
                        }} />
                      </div>

                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                          {/* Icon */}
                          <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                            <Icon className="w-10 h-10 text-white" />
                          </div>
                          
                          {/* Badge */}
                          <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-bold text-white">
                            {system.badge}
                          </div>
                        </div>
                        
                        <h2 className="text-2xl lg:text-3xl font-bold mb-2 text-white">
                          {system.name}
                        </h2>
                        <p className="text-white/90 text-sm">
                          {system.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="p-6 lg:p-8">
                      <div className="space-y-3 mb-6">
                        {system.features.map((feature, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + idx * 0.05 }}
                            className="flex items-start gap-3 text-slate-700"
                          >
                            <div 
                              className="p-1 rounded-full flex-shrink-0 mt-0.5"
                              style={{ backgroundColor: system.lightColor }}
                            >
                              <Check className="w-4 h-4" style={{ color: system.color }} />
                            </div>
                            <span className="text-sm leading-relaxed">{feature}</span>
                          </motion.div>
                        ))}
                      </div>

                      {/* Action Button */}
                      <motion.div 
                        className="w-full py-4 px-6 rounded-2xl font-bold text-white flex items-center justify-center gap-3 shadow-lg"
                        style={{ backgroundColor: system.color }}
                        whileHover={{ 
                          boxShadow: `0 20px 40px ${system.color}40`,
                          scale: 1.02
                        }}
                      >
                        <span>Ingresar a {system.name}</span>
                        <motion.div
                          animate={{ x: isHovered ? 6 : 0 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                        >
                          <ArrowRight className="w-5 h-5" />
                        </motion.div>
                      </motion.div>
                    </div>
                  </div>
                </motion.button>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col items-center gap-6"
        >
          {/* Logout Button */}
          <motion.button
            onClick={onLogout}
            className="px-8 py-3 bg-white border-2 border-slate-300 rounded-2xl text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-400 transition-all duration-300 flex items-center gap-3 shadow-md"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
