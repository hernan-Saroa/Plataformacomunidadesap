/**
 * ============================================
 * VALIDADOR PÚBLICO DE CERTIFICADOS - LANDING PAGE
 * ============================================
 * 
 * Componente público que permite a cualquier usuario validar
 * certificados emitidos por la ESAP sin necesidad de autenticación.
 * 
 * FUNCIONALIDAD:
 * - Selector de tipo de certificado (Laboral o Grado)
 * - Integración con ValidarCertificadoQR (laborales)
 * - Integración con ValidarCertificadoGrado (académicos)
 * - Acceso público desde el landing page
 * 
 * ÚLTIMA ACTUALIZACIÓN: 14 Enero 2026
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  QrCode,
  Briefcase,
  GraduationCap,
  ArrowLeft,
  CheckCircle,
  Shield,
  Home
} from 'lucide-react';
import { ValidarCertificadoQR } from '../certificados-laborales/ValidarCertificadoQR';
import { ValidarCertificadoGrado } from '../esap/registro-academico/ValidarCertificadoGrado';
import { Card } from '../ui/card';
import { FooterWorldClass } from '../FooterWorldClass';
import esapLogoWhite from 'figma:asset/2eabfe85218557ad27ece74d963c4a3b61b716be.png';

interface ValidadorCertificadosPublicoProps {
  onBack: () => void;
}

type TipoCertificado = 'selector' | 'laboral' | 'grado';

export function ValidadorCertificadosPublico({ onBack }: ValidadorCertificadosPublicoProps) {
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoCertificado>('selector');

  // Vista principal: Selector de tipo de certificado + Modales
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F6FF] to-[#E0EEFF]">
      {/* ✅ Modal de Certificado de Grado */}
      <ValidarCertificadoGrado 
        isOpen={tipoSeleccionado === 'grado'} 
        onClose={() => setTipoSeleccionado('selector')} 
      />

      {/* Si el usuario seleccionó Certificado Laboral - Vista completa */}
      {tipoSeleccionado === 'laboral' && (
        <ValidarCertificadoQR onBack={() => setTipoSeleccionado('selector')} />
      )}

      {/* Vista del selector - Solo se muestra si tipoSeleccionado es 'selector' */}
      {tipoSeleccionado === 'selector' && (
        <>
      {/* Navbar Superior Flotante - Similar al Landing */}
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
                <p className="text-xs font-semibold text-white">Validador de Certificados</p>
                <p className="text-[9px] font-medium text-white/70 -mt-0.5">Sistema oficial ESAP</p>
              </div>
            </div>

            {/* Botón Volver al Inicio */}
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full font-semibold text-xs sm:text-sm transition-all duration-300 bg-white text-[#003DA5] hover:bg-blue-50 hover:scale-105 shadow-lg"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Volver al Inicio</span>
              <span className="sm:hidden">Inicio</span>
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Contenido Principal */}
      <div className="pt-28 pb-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div 
              className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{
                background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                boxShadow: '0 8px 24px rgba(0, 61, 165, 0.25)'
              }}
            >
              <QrCode className="w-10 h-10 text-white" strokeWidth={2.5} />
            </div>
            
            <h1 
              className="font-bold mb-3"
              style={{
                fontSize: '36px',
                lineHeight: '44px',
                letterSpacing: '-0.5px',
                color: '#1F2937'
              }}
            >
              Validar Certificados ESAP
            </h1>
            
            <p 
              className="font-normal max-w-2xl mx-auto"
              style={{
                fontSize: '16px',
                lineHeight: '24px',
                color: '#6B7280'
              }}
            >
              Verifica la autenticidad de certificados emitidos por la Escuela Superior de Administración Pública
            </p>
          </motion.div>

          {/* Selector de Tipo de Certificado */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
          >
            {/* Card: Certificado Laboral */}
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <Card 
                onClick={() => setTipoSeleccionado('laboral')}
                className="relative overflow-hidden cursor-pointer transition-all hover:shadow-2xl border-2 border-[#E5E7EB] hover:border-[#003DA5] group"
              >
                <div className="p-8">
                  {/* Icono */}
                  <div 
                    className="w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"
                    style={{
                      background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
                      boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
                    }}
                  >
                    <Briefcase className="w-8 h-8 text-white" strokeWidth={2.5} />
                  </div>

                  {/* Contenido */}
                  <h3 
                    className="font-bold mb-3"
                    style={{
                      fontSize: '22px',
                      lineHeight: '28px',
                      color: '#1F2937'
                    }}
                  >
                    Certificado Laboral
                  </h3>

                  <p 
                    className="font-normal mb-6"
                    style={{
                      fontSize: '14px',
                      lineHeight: '20px',
                      color: '#6B7280'
                    }}
                  >
                    Valida certificados laborales emitidos por el área de Talento Humano de la ESAP
                  </p>

                  {/* Lista de características */}
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Verificación de vínculo laboral</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Validación con código QR</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Información de cargo y dependencia</span>
                    </li>
                  </ul>

                  {/* Botón */}
                  <div 
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white group-hover:shadow-lg transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)'
                    }}
                  >
                    <span>Validar Ahora</span>
                    <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Badge */}
                <div 
                  className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold text-white"
                  style={{
                    background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)'
                  }}
                >
                  Laboral
                </div>
              </Card>
            </motion.div>

            {/* Card: Certificado de Grado */}
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <Card 
                onClick={() => setTipoSeleccionado('grado')}
                className="relative overflow-hidden cursor-pointer transition-all hover:shadow-2xl border-2 border-[#E5E7EB] hover:border-[#003DA5] group"
              >
                <div className="p-8">
                  {/* Icono */}
                  <div 
                    className="w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"
                    style={{
                      background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                      boxShadow: '0 4px 12px rgba(0, 61, 165, 0.3)'
                    }}
                  >
                    <GraduationCap className="w-8 h-8 text-white" strokeWidth={2.5} />
                  </div>

                  {/* Contenido */}
                  <h3 
                    className="font-bold mb-3"
                    style={{
                      fontSize: '22px',
                      lineHeight: '28px',
                      color: '#1F2937'
                    }}
                  >
                    Certificado de Grado
                  </h3>

                  <p 
                    className="font-normal mb-6"
                    style={{
                      fontSize: '14px',
                      lineHeight: '20px',
                      color: '#6B7280'
                    }}
                  >
                    Valida certificados académicos y títulos emitidos por la Dirección de Registro Académico
                  </p>

                  {/* Lista de características */}
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Verificación de título académico</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Validación con código QR</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Información de programa y acta</span>
                    </li>
                  </ul>

                  {/* Botón */}
                  <div 
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white group-hover:shadow-lg transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)'
                    }}
                  >
                    <span>Validar Ahora</span>
                    <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Badge */}
                <div 
                  className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold text-white"
                  style={{
                    background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)'
                  }}
                >
                  Académico
                </div>
              </Card>
            </motion.div>
          </motion.div>

          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="p-6 bg-blue-50 border-2 border-blue-200">
              <div className="flex items-start gap-4">
                <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 
                    className="font-bold mb-2"
                    style={{
                      fontSize: '16px',
                      color: '#1F2937'
                    }}
                  >
                    Sistema de Verificación Seguro
                  </h4>
                  <p 
                    className="font-normal"
                    style={{
                      fontSize: '14px',
                      lineHeight: '20px',
                      color: '#6B7280'
                    }}
                  >
                    Todos los certificados emitidos por la ESAP incluyen un código QR único que permite verificar 
                    su autenticidad en tiempo real. Este sistema garantiza la integridad y validez de cada documento 
                    mediante tecnología de encriptación y trazabilidad completa.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Footer Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center mt-8"
          >
            <Card className="inline-flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-sm border-2">
              <Shield className="w-5 h-5 text-[#003DA5]" />
              <span 
                className="font-medium"
                style={{
                  fontSize: '14px',
                  color: '#1F2937'
                }}
              >
                Sistema oficial de validación - Escuela Superior de Administración Pública
              </span>
            </Card>
          </motion.div>
        </div>
        
        {/* Footer del Landing */}
        <FooterWorldClass />
      </div>
        </>
      )}
    </div>
  );
}