/**
 * StickyNavbar Component
 * 
 * Navbar sticky con:
 * - Scroll suave a secciones
 * - Indicador de sección activa
 * - Animación al hacer scroll
 * - Responsive
 * - Accesibilidad completa
 */

import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Menu, X, ChevronUp } from 'lucide-react';
import { Button } from '../ui/button';
import { MicrointeractionWrapper } from './MicrointeractionWrapper';
import { useAccessibility } from '../../hooks/useAccessibility';

interface NavLink {
  id: string;
  label: string;
  href: string;
}

interface StickyNavbarProps {
  logo?: React.ReactNode;
  logoScrolled?: React.ReactNode;
  links: NavLink[];
  ctaLabel?: string;
  onCtaClick?: () => void;
  logoSrc?: string;
  logoScrolledSrc?: string;
  logoAlt?: string;
  backgroundColor?: string;
  scrollThreshold?: number;
}

export function StickyNavbar({
  logo,
  logoScrolled,
  links,
  ctaLabel = 'Comenzar',
  onCtaClick,
  logoSrc,
  logoScrolledSrc,
  logoAlt = 'Logo',
  backgroundColor = 'bg-white',
  scrollThreshold = 50,
}: StickyNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const [showBackToTop, setShowBackToTop] = useState(false);

  const { scrollY } = useScroll();
  const { ariaProps } = useAccessibility();

  // Manejar scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
      const scrolled = currentScroll > scrollThreshold;
      setIsScrolled(scrolled);
      setShowBackToTop(currentScroll > 500);

      // Detectar sección activa
      const sections = links.map((link) => {
        const element = document.querySelector(link.href);
        if (element) {
          const rect = element.getBoundingClientRect();
          return {
            id: link.id,
            top: rect.top,
            bottom: rect.bottom,
          };
        }
        return null;
      }).filter(Boolean);

      const active = sections.find(
        (section) => section && section.top <= 150 && section.bottom >= 150
      );

      if (active) {
        setActiveSection(active.id);
      }
    };

    // Set initial state
    handleScroll();
    
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, [links, scrollThreshold]);

  // Scroll suave a sección
  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      const yOffset = -80; // Offset for fixed navbar
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
      window.scrollTo({ top: y, behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  };

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cerrar menú móvil al presionar Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Navbar */}
      <motion.nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? `${backgroundColor} shadow-lg border-b border-gray-200` 
            : 'bg-transparent'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
        {...ariaProps.region('Navegación principal', 'navigation')}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <a 
              href="#hero" 
              className="flex-shrink-0 h-10 flex items-center" 
              onClick={(e) => { e.preventDefault(); scrollToSection('#hero'); }}
            >
              {!isScrolled && logo}
              {isScrolled && logoScrolled}
              {!isScrolled && !logo && logoScrolled}
              {isScrolled && !logoScrolled && logo}
            </a>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {links.map((link) => (
                <MicrointeractionWrapper key={link.id} type="button">
                  <button
                    onClick={() => scrollToSection(link.href)}
                    className={`px-3 lg:px-4 py-2 rounded-lg font-medium transition-all ${
                      activeSection === link.id
                        ? isScrolled
                          ? 'text-[#1e5da8] bg-blue-50'
                          : 'text-white bg-white/10'
                        : isScrolled
                          ? 'text-gray-700 hover:text-[#1e5da8] hover:bg-gray-100'
                          : 'text-white/90 hover:text-white hover:bg-white/10'
                    }`}
                    aria-current={activeSection === link.id ? 'page' : undefined}
                  >
                    {link.label}
                  </button>
                </MicrointeractionWrapper>
              ))}

              {/* CTA Button */}
              {onCtaClick && (
                <MicrointeractionWrapper type="button" enableRipple>
                  <Button
                    onClick={onCtaClick}
                    className={`ml-2 lg:ml-4 transition-all ${
                      isScrolled
                        ? 'bg-[#1e5da8] text-white hover:bg-blue-700'
                        : 'bg-white text-[#1e5da8] hover:bg-blue-50'
                    }`}
                  >
                    {ctaLabel}
                  </Button>
                </MicrointeractionWrapper>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <MicrointeractionWrapper type="button">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className={`p-2 rounded-lg transition-colors ${
                    isScrolled
                      ? 'text-gray-900 hover:bg-gray-100'
                      : 'text-white hover:bg-white/10'
                  }`}
                  aria-expanded={isMobileMenuOpen}
                  aria-label="Menú de navegación"
                >
                  {isMobileMenuOpen ? (
                    <X className="w-6 h-6" />
                  ) : (
                    <Menu className="w-6 h-6" />
                  )}
                </button>
              </MicrointeractionWrapper>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-200"
          >
            <div className="container mx-auto px-4 py-4 space-y-2">
              {links.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.href)}
                  className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                    activeSection === link.id
                      ? 'text-[#1e5da8] bg-blue-50'
                      : 'text-gray-700 hover:text-[#1e5da8] hover:bg-gray-100'
                  }`}
                >
                  {link.label}
                </button>
              ))}

              {onCtaClick && (
                <Button
                  onClick={() => {
                    onCtaClick();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-[#1e5da8] text-white hover:bg-blue-700"
                >
                  {ctaLabel}
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </motion.nav>

      {/* Back to Top Button */}
      {showBackToTop && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed bottom-6 right-6 z-40"
        >
          <MicrointeractionWrapper type="button" enableRipple>
            <button
              onClick={scrollToTop}
              className="w-12 h-12 bg-[#1e5da8] text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center transition-colors"
              aria-label="Volver arriba"
            >
              <ChevronUp className="w-6 h-6" />
            </button>
          </MicrointeractionWrapper>
        </motion.div>
      )}
    </>
  );
}
