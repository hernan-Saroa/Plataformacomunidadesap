/**
 * Public Navbar - Navbar público compartido para todos los servicios
 * Diseño consistente con el Landing Page
 */

import { motion } from 'motion/react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Button } from '../ui/button';
import { useState } from 'react';
import { useIsMobile } from '../ui/use-mobile';
import esapLogoWhite from 'figma:asset/2eabfe85218557ad27ece74d963c4a3b61b716be.png';

interface PublicNavbarProps {
  onLoginClick: () => void;
  onNavigateToHome: () => void;
}

export function PublicNavbar({ onLoginClick, onNavigateToHome }: PublicNavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const shouldAnimate = !isMobile;

  const handleNavigateToSection = (sectionId: string) => {
    // Primero volver al home
    onNavigateToHome();
    // Luego hacer scroll a la sección (con un pequeño delay para que cargue el home)
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Navbar Superior Flotante - Diseño Moderno con Azul Medio */}
      <motion.nav 
        initial={shouldAnimate ? { y: -100, opacity: 0 } : false}
        animate={shouldAnimate ? { y: 0, opacity: 1 } : undefined}
        transition={shouldAnimate ? { duration: 0.6, delay: 0.2 } : undefined}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-6xl"
      >
        <div className="bg-[#1e5da8] rounded-2xl shadow-2xl px-4 sm:px-6 py-3 border border-blue-400/30">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <button 
              onClick={onNavigateToHome}
              className="flex items-center gap-3 hover:opacity-90 transition-opacity"
            >
              <img 
                src={esapLogoWhite} 
                alt="ESAP Logo" 
                className="h-8 sm:h-10 w-auto object-contain brightness-0 invert"
              />
              <div className="hidden sm:block">
                <p className="text-[9px] font-medium text-white/90 -mt-0.5">ComUNIdad</p>
              </div>
            </button>

            {/* Menú Desktop */}
            <div className="hidden md:flex items-center gap-6">
              <button 
                onClick={onNavigateToHome}
                className="text-sm font-semibold text-white/90 hover:text-white transition-colors"
              >
                Inicio
              </button>
              <button 
                onClick={() => handleNavigateToSection('servicios')}
                className="text-sm font-semibold text-white/90 hover:text-white transition-colors"
              >
                Servicios
              </button>
              <button 
                onClick={() => handleNavigateToSection('beneficios')}
                className="text-sm font-semibold text-white/90 hover:text-white transition-colors"
              >
                Beneficios
              </button>
              <button 
                onClick={() => handleNavigateToSection('contacto')}
                className="text-sm font-semibold text-white/90 hover:text-white transition-colors"
              >
                Contacto
              </button>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center gap-2">
              {/* Botón Login */}
              <Button
                onClick={onLoginClick}
                className="hidden sm:inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full font-semibold text-xs sm:text-sm transition-all duration-300 bg-white text-[#003DA5] hover:bg-blue-50 hover:scale-105 shadow-lg"
              >
                <span className="hidden sm:inline">Iniciar Sesión</span>
                <span className="sm:hidden">Entrar</span>
                <ArrowRight className="w-4 h-4" />
              </Button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5 text-white" />
                ) : (
                  <Menu className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: -10 } : false}
            animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
            exit={shouldAnimate ? { opacity: 0, y: -10 } : undefined}
            className="mt-2 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200"
          >
            <div className="p-4 space-y-2">
              <button
                onClick={onNavigateToHome}
                className="w-full text-left px-4 py-3 rounded-lg text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-[#1e5da8] transition-colors"
              >
                Inicio
              </button>
              <button
                onClick={() => handleNavigateToSection('servicios')}
                className="w-full text-left px-4 py-3 rounded-lg text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-[#1e5da8] transition-colors"
              >
                Servicios
              </button>
              <button
                onClick={() => handleNavigateToSection('beneficios')}
                className="w-full text-left px-4 py-3 rounded-lg text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-[#1e5da8] transition-colors"
              >
                Beneficios
              </button>
              <button
                onClick={() => handleNavigateToSection('contacto')}
                className="w-full text-left px-4 py-3 rounded-lg text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-[#1e5da8] transition-colors"
              >
                Contacto
              </button>
              
              {/* Botón Login en mobile */}
              <div className="pt-2 border-t border-gray-200">
                <Button
                  onClick={() => {
                    onLoginClick();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full font-semibold text-sm bg-[#1e5da8] text-white hover:bg-[#174a8a] shadow-lg"
                >
                  Iniciar Sesión
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.nav>
    </>
  );
}
