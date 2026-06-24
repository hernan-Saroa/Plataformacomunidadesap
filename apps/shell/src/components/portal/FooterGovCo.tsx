/**
 * FooterGovCo - Footer estilo gov.co para servicios públicos
 * Cumple con estándares del gobierno colombiano
 */

import React from 'react';
import { ExternalLink, Phone, Mail, MapPin, Facebook, Twitter, Youtube, Instagram } from 'lucide-react';
import { ESAPLogo } from '../assets/ESAPLogo';

// Logo GOV.CO oficial (placeholder - en producción se usaría el oficial)
const LOGO_GOVCO_SVG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40"%3E%3Ctext x="10" y="25" font-family="Arial" font-size="18" font-weight="bold" fill="%23004884"%3EGOV.CO%3C/text%3E%3C/svg%3E';

interface FooterGovCoProps {
  variant?: 'light' | 'dark';
}

export function FooterGovCo({ variant = 'light' }: FooterGovCoProps) {
  const sedes = [
    {
      nombre: 'Sede Principal - Bogotá',
      direccion: 'Diagonal 40 No. 46A - 37, Bogotá D.C.',
      telefono: '(601) 220 0700',
      linea: 'Línea Nacional: 018000 110 950',
      email: 'correspondencia@esap.edu.co',
      horario: 'Lunes a Viernes: 8:00 a.m. - 5:00 p.m.',
    },
  ];

  const enlacesObligatorios = [
    { titulo: 'Políticas', url: '#' },
    { titulo: 'Mapa del sitio', url: '#' },
    { titulo: 'Términos y condiciones', url: '#' },
  ];

  const enlacesTransparencia = [
    { titulo: 'Sede Electrónica', url: '#' },
    { titulo: 'Notificaciones judiciales', url: '#' },
    { titulo: 'PQRSDF', url: '#' },
  ];

  return (
    <footer className="bg-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Sección Superior - Información de Contacto */}
      <div className="bg-white border-t border-gray-200 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          {/* Header con Logo */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 pb-6 border-b border-gray-200">
            <div className="mb-4 sm:mb-0">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Escuela Superior de Administración Pública
              </h2>
              <p className="text-sm text-gray-600">ESAP - Entidad adscrita al Departamento Administrativo de la Función Pública</p>
            </div>
            <div className="flex items-center gap-4">
              <ESAPLogo 
                variant="color"
                className="shrink-0"
                style={{ width: '216px', height: '64px' }}
              />
            </div>
          </div>

          {/* Grid de Sedes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {sedes.map((sede, index) => (
              <div key={index} className="border-l-4 border-[#003DA5] pl-4">
                <h3 className="font-bold text-gray-900 mb-3 text-sm">{sede.nombre}</h3>
                
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-[#003DA5] flex-shrink-0 mt-0.5" />
                    <p className="leading-snug">{sede.direccion}</p>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 text-[#003DA5] flex-shrink-0 mt-0.5" />
                    <div>
                      <p>{sede.telefono}</p>
                      {sede.linea && <p className="text-xs text-gray-600 mt-0.5">{sede.linea}</p>}
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Mail className="w-4 h-4 text-[#003DA5] flex-shrink-0 mt-0.5" />
                    <a href={`mailto:${sede.email}`} className="text-[#003DA5] hover:underline">
                      {sede.email}
                    </a>
                  </div>

                  <p className="text-xs text-gray-600 mt-3 pt-2 border-t border-gray-200">
                    {sede.horario}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Redes Sociales */}
          <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
            <span className="text-sm font-semibold text-gray-700">Síguenos:</span>
            <div className="flex gap-2">
              <a 
                href="https://twitter.com/ESAP_CO" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-100 hover:bg-[#003DA5] rounded-full flex items-center justify-center transition-colors group"
                aria-label="Twitter ESAP"
              >
                <Twitter className="w-5 h-5 text-gray-700 group-hover:text-white" />
              </a>
              <a 
                href="https://www.facebook.com/ESAPCOLOMBIA" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-100 hover:bg-[#003DA5] rounded-full flex items-center justify-center transition-colors group"
                aria-label="Facebook ESAP"
              >
                <Facebook className="w-5 h-5 text-gray-700 group-hover:text-white" />
              </a>
              <a 
                href="https://www.youtube.com/@ESAPCOLOMBIA" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-100 hover:bg-[#003DA5] rounded-full flex items-center justify-center transition-colors group"
                aria-label="YouTube ESAP"
              >
                <Youtube className="w-5 h-5 text-gray-700 group-hover:text-white" />
              </a>
              <a 
                href="https://www.instagram.com/esapcolombia/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-100 hover:bg-[#003DA5] rounded-full flex items-center justify-center transition-colors group"
                aria-label="Instagram ESAP"
              >
                <Instagram className="w-5 h-5 text-gray-700 group-hover:text-white" />
              </a>
            </div>
          </div>

          {/* Enlaces Obligatorios */}
          <div className="flex flex-wrap gap-6 pt-6 mt-6 border-t border-gray-200 text-sm">
            {enlacesObligatorios.map((enlace, index) => (
              <a 
                key={index}
                href={enlace.url} 
                className="text-[#003DA5] hover:underline font-medium flex items-center gap-1"
              >
                {enlace.titulo}
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
            <span className="text-gray-400">|</span>
            {enlacesTransparencia.map((enlace, index) => (
              <a 
                key={index}
                href={enlace.url} 
                className="text-[#003DA5] hover:underline font-medium flex items-center gap-1"
              >
                {enlace.titulo}
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Franja GOV.CO - Azul Oscuro */}
      <div className="bg-[#004884] py-6">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Logo Oficial GOV.CO */}
              <div className="bg-white rounded-lg px-4 py-2.5 flex items-center">
                <img 
                  src={LOGO_GOVCO_SVG} 
                  alt="GOV.CO - Portal Único del Estado Colombiano" 
                  className="h-8 w-auto object-contain"
                />
              </div>
              <p className="text-white text-sm max-w-md">
                El portal único del Estado Colombiano para la realización de trámites y acceso a servicios de información.
              </p>
            </div>
            <a 
              href="https://www.gov.co" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-white hover:bg-gray-100 text-[#004884] px-6 py-2.5 rounded-md font-semibold text-sm transition-colors flex items-center gap-2.5"
            >
              <img 
                src={LOGO_GOVCO_SVG} 
                alt="GOV.CO" 
                className="h-5 w-auto object-contain"
              />
              <span>Ir a GOV.CO</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Barra Inferior - Entidades del Estado */}
      <div className="bg-gray-100 border-t border-gray-200 py-4">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-600 text-center sm:text-left">
              © 2025 ESAP - Escuela Superior de Administración Pública. Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>Última actualización:</span>
              <span className="font-semibold">{new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}