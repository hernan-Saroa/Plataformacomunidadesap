import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  QrCode,
  Briefcase,
  GraduationCap,
  ArrowLeft,
  CheckCircle,
  Shield,
  Home,
} from 'lucide-react';
import { ValidarCertificadoQR } from '../certificados-laborales/ValidarCertificadoQR';
import { ValidarCertificadoGrado } from '../esap/registro-academico/ValidarCertificadoGrado';
import { Card } from '../ui/card';
import { ESAPLogo } from '../assets/ESAPLogo';

interface ValidadorCertificadosPublicoProps {
  onBack: () => void;
}

type TipoCertificado = 'selector' | 'laboral' | 'grado';

export function ValidadorCertificadosPublico({
  onBack,
}: ValidadorCertificadosPublicoProps) {
  const [tipoSeleccionado, setTipoSeleccionado] =
    useState<TipoCertificado>('selector');

  if (tipoSeleccionado === 'laboral') {
    return <ValidarCertificadoQR onBack={() => setTipoSeleccionado('selector')} />;
  }

  if (tipoSeleccionado === 'grado') {
    return (
      <ValidarCertificadoGrado
        isOpen
        onClose={() => setTipoSeleccionado('selector')}
        onBack={() => setTipoSeleccionado('selector')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F6FF] to-[#E0EEFF]">
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="fixed top-4 left-1/2 z-[200] w-[95%] max-w-6xl -translate-x-1/2"
      >
        <div
          className="rounded-2xl border border-blue-400/30 bg-[#1e5da8] px-4 py-3 shadow-2xl backdrop-blur-xl sm:px-6"
          style={{
            boxShadow:
              '0 10px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ESAPLogo variant="white" className="h-8 w-auto sm:h-10" />
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-white">
                  Validador de Certificados
                </p>
                <p className="text-[9px] font-medium text-white/70 -mt-0.5">
                  Sistema oficial ESAP
                </p>
              </div>
            </div>

            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#003DA5] shadow-lg transition-all duration-300 hover:scale-105 hover:bg-blue-50 sm:px-5 sm:text-sm"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Volver al Inicio</span>
              <span className="sm:hidden">Inicio</span>
            </button>
          </div>
        </div>
      </motion.nav>

      <div className="px-4 pt-28 pb-12">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center"
          >
            <div
              className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                boxShadow: '0 8px 24px rgba(0, 61, 165, 0.25)',
              }}
            >
              <QrCode className="h-10 w-10 text-white" strokeWidth={2.5} />
            </div>

            <h1
              className="mb-3 font-bold"
              style={{
                fontSize: '36px',
                lineHeight: '44px',
                letterSpacing: '-0.5px',
                color: '#1F2937',
              }}
            >
              Validar Certificados ESAP
            </h1>

            <p
              className="mx-auto max-w-2xl font-normal"
              style={{
                fontSize: '16px',
                lineHeight: '24px',
                color: '#6B7280',
              }}
            >
              Verifica la autenticidad de certificados emitidos por la Escuela
              Superior de Administracion Publica
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2"
          >
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <Card
                onClick={() => setTipoSeleccionado('laboral')}
                className="group relative cursor-pointer overflow-hidden border-2 border-[#E5E7EB] transition-all hover:border-[#003DA5] hover:shadow-2xl"
              >
                <div className="p-8">
                  <div
                    className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                    style={{
                      background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
                      boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)',
                    }}
                  >
                    <Briefcase className="h-8 w-8 text-white" strokeWidth={2.5} />
                  </div>

                  <h3
                    className="mb-3 font-bold"
                    style={{
                      fontSize: '22px',
                      lineHeight: '28px',
                      color: '#1F2937',
                    }}
                  >
                    Certificado Laboral
                  </h3>

                  <p
                    className="mb-6 font-normal"
                    style={{
                      fontSize: '14px',
                      lineHeight: '20px',
                      color: '#6B7280',
                    }}
                  >
                    Valida certificados laborales emitidos por el area de Talento
                    Humano de la ESAP
                  </p>

                  <ul className="mb-6 space-y-2">
                    <li className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      <span>Verificacion de vinculo laboral</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      <span>Validacion con codigo QR</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      <span>Informacion de cargo y dependencia</span>
                    </li>
                  </ul>

                  <div
                    className="inline-flex items-center gap-2 rounded-lg px-6 py-3 font-semibold text-white transition-all group-hover:shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
                    }}
                  >
                    <span>Validar Ahora</span>
                    <ArrowLeft className="h-4 w-4 rotate-180 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>

                <div
                  className="absolute top-4 right-4 rounded-full px-3 py-1 text-xs font-semibold text-white"
                  style={{
                    background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
                  }}
                >
                  Laboral
                </div>
              </Card>
            </motion.div>

            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <Card
                onClick={() => setTipoSeleccionado('grado')}
                className="group relative cursor-pointer overflow-hidden border-2 border-[#E5E7EB] transition-all hover:border-[#003DA5] hover:shadow-2xl"
              >
                <div className="p-8">
                  <div
                    className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                    style={{
                      background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                      boxShadow: '0 4px 12px rgba(0, 61, 165, 0.3)',
                    }}
                  >
                    <GraduationCap className="h-8 w-8 text-white" strokeWidth={2.5} />
                  </div>

                  <h3
                    className="mb-3 font-bold"
                    style={{
                      fontSize: '22px',
                      lineHeight: '28px',
                      color: '#1F2937',
                    }}
                  >
                    Certificado de Grado
                  </h3>

                  <p
                    className="mb-6 font-normal"
                    style={{
                      fontSize: '14px',
                      lineHeight: '20px',
                      color: '#6B7280',
                    }}
                  >
                    Valida certificados academicos y titulos emitidos por la
                    Direccion de Registro Academico
                  </p>

                  <ul className="mb-6 space-y-2">
                    <li className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      <span>Verificacion de titulo academico</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      <span>Validacion con codigo QR</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      <span>Informacion de programa y acta</span>
                    </li>
                  </ul>

                  <div
                    className="inline-flex items-center gap-2 rounded-lg px-6 py-3 font-semibold text-white transition-all group-hover:shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                    }}
                  >
                    <span>Validar Ahora</span>
                    <ArrowLeft className="h-4 w-4 rotate-180 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>

                <div
                  className="absolute top-4 right-4 rounded-full px-3 py-1 text-xs font-semibold text-white"
                  style={{
                    background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                  }}
                >
                  Academico
                </div>
              </Card>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="border-2 border-blue-200 bg-blue-50 p-6">
              <div className="flex items-start gap-4">
                <Shield className="mt-1 h-6 w-6 flex-shrink-0 text-blue-600" />
                <div>
                  <h4
                    className="mb-2 font-bold"
                    style={{
                      fontSize: '16px',
                      color: '#1F2937',
                    }}
                  >
                    Sistema de Verificacion Seguro
                  </h4>
                  <p
                    className="font-normal"
                    style={{
                      fontSize: '14px',
                      lineHeight: '20px',
                      color: '#6B7280',
                    }}
                  >
                    Todos los certificados emitidos por la ESAP incluyen un codigo
                    QR unico que permite verificar su autenticidad en tiempo real.
                    Este sistema garantiza la integridad y validez de cada
                    documento mediante tecnologia de encriptacion y trazabilidad
                    completa.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 text-center"
          >
            <Card className="inline-flex items-center gap-2 border-2 bg-white/80 px-6 py-3 backdrop-blur-sm">
              <Shield className="h-5 w-5 text-[#003DA5]" />
              <span
                className="font-medium"
                style={{
                  fontSize: '14px',
                  color: '#1F2937',
                }}
              >
                Sistema oficial de validacion - Escuela Superior de Administracion
                Publica
              </span>
            </Card>
          </motion.div>
        </div>

        <footer className="mt-16 bg-gray-900 py-12 text-white">
          <div className="container mx-auto px-4 text-center">
            <ESAPLogo variant="white" className="mx-auto mb-4 h-12 w-auto" />
            <p className="text-sm text-gray-400">
              © 2026 ESAP - Escuela Superior de Administracion Publica
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
