/**
 * MÓDULO: VALIDACIÓN PÚBLICA DE CERTIFICADOS LABORALES
 * - Portal público para validar certificados laborales ESAP
 * - Validación mediante código QR o número de certificado
 * - Muestra información completa del empleado y estado del certificado
 * - Registra cada validación en el sistema de auditoría
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Shield,
  QrCode,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  User,
  Calendar,
  Briefcase,
  Building2,
  Hash,
  Clock,
  Award,
  Download,
  MapPin,
  Phone,
  Mail,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';

interface CertificadoValidado {
  id: string;
  consecutivo: string;
  estado: 'activo' | 'revocado' | 'expirado';
  qrCode: string;
  empleado: {
    nombre: string;
    documento: string;
    cargo: string;
    dependencia: string;
    tipoVinculacion: string;
    fechaVinculacion: string;
    grado: string;
  };
  fechaGeneracion: string;
  generadoPor: string;
  hash: string;
}

export function ValidarCertificadoPublico() {
  const [metodoValidacion, setMetodoValidacion] = useState<'qr' | 'codigo'>('qr');
  const [codigoIngresado, setCodigoIngresado] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [certificadoValidado, setCertificadoValidado] = useState<CertificadoValidado | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  // Mock de validación
  const mockCertificado: CertificadoValidado = {
    id: 'CERT-LAB-001',
    consecutivo: 'ESAP-CERT-2025-04E23',
    estado: 'activo',
    qrCode: 'QR-LAB-ABC123',
    empleado: {
      nombre: 'María Fernanda Rodríguez López',
      documento: '52.345.678',
      cargo: 'Docente Tiempo Completo',
      dependencia: 'Dirección Territorial Bogotá',
      tipoVinculacion: 'Docente Tiempo Completo',
      fechaVinculacion: '2018-03-15',
      grado: 'Maestría en Educación'
    },
    fechaGeneracion: '2025-01-10T10:30:00Z',
    generadoPor: 'Admin Talento Humano',
    hash: 'sha256:a7f2c9b8d4e5f6a1b2c3d4e5f6a7b8c9'
  };

  const handleValidar = () => {
    if (!codigoIngresado.trim()) {
      toast.error('Campo requerido', {
        description: 'Por favor, ingresa el código del certificado'
      });
      return;
    }

    setIsValidating(true);
    
    // Simular validación
    setTimeout(() => {
      setCertificadoValidado(mockCertificado);
      setIsValidating(false);
      toast.success('Certificado válido', {
        description: 'El certificado laboral es auténtico y está activo'
      });
    }, 1500);
  };

  const handleScanQR = () => {
    setShowScanner(true);
    toast.info('Escanear QR', {
      description: 'Apunta la cámara al código QR del certificado'
    });
    
    // Simular escaneo después de 2 segundos
    setTimeout(() => {
      setShowScanner(false);
      setCertificadoValidado(mockCertificado);
      toast.success('QR escaneado', {
        description: 'Certificado validado correctamente'
      });
    }, 2000);
  };

  const handleReset = () => {
    setCertificadoValidado(null);
    setCodigoIngresado('');
  };

  const getEstadoBadge = (estado: string) => {
    const config = {
      activo: {
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: <CheckCircle className="w-4 h-4" />,
        label: 'Certificado Válido'
      },
      revocado: {
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: <XCircle className="w-4 h-4" />,
        label: 'Certificado Revocado'
      },
      expirado: {
        color: 'bg-gray-100 text-gray-800 border-gray-300',
        icon: <AlertCircle className="w-4 h-4" />,
        label: 'Certificado Expirado'
      }
    };
    const estilo = config[estado as keyof typeof config] || config.activo;
    return (
      <Badge className={`${estilo.color} border-2 px-4 py-2 text-base font-semibold flex items-center gap-2`}>
        {estilo.icon}
        {estilo.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section - Mobile Optimized */}
      <div className="bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white py-8 sm:py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="flex items-center justify-center mb-4 sm:mb-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center">
                <Shield className="w-10 h-10 sm:w-12 sm:h-12 text-white" strokeWidth={2} />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 px-4">
              Validación de Certificados Laborales
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-blue-100 max-w-3xl mx-auto px-4">
              Verifica la autenticidad de certificados laborales emitidos por la ESAP mediante código QR o número de certificado
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 -mt-6 sm:-mt-8 pb-8 sm:pb-12 md:pb-16">
        {!certificadoValidado ? (
          /* Sección de Validación */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="p-4 sm:p-6 md:p-8 shadow-2xl">
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2">
                  Selecciona el método de validación
                </h2>
                <p className="text-sm sm:text-base text-gray-600 px-2">
                  Puedes validar el certificado escaneando el código QR o ingresando el número manualmente
                </p>
              </div>

              {/* Toggle Método - Mobile Optimized */}
              <div className="flex justify-center mb-6 sm:mb-8">
                <div className="inline-flex rounded-lg border-2 border-gray-200 p-1 bg-gray-50 w-full sm:w-auto">
                  <button
                    onClick={() => setMetodoValidacion('qr')}
                    className={`flex-1 sm:flex-initial px-4 sm:px-6 py-3 rounded-md font-medium transition-all text-sm sm:text-base min-h-[48px] ${
                      metodoValidacion === 'qr'
                        ? 'bg-[#003DA5] text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <QrCode className="w-4 h-4 sm:w-5 sm:h-5 inline mr-2" />
                    <span className="hidden sm:inline">Escanear QR</span>
                    <span className="sm:hidden">QR</span>
                  </button>
                  <button
                    onClick={() => setMetodoValidacion('codigo')}
                    className={`flex-1 sm:flex-initial px-4 sm:px-6 py-3 rounded-md font-medium transition-all text-sm sm:text-base min-h-[48px] ${
                      metodoValidacion === 'codigo'
                        ? 'bg-[#003DA5] text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Hash className="w-4 h-4 sm:w-5 sm:h-5 inline mr-2" />
                    <span className="hidden sm:inline">Ingresar Código</span>
                    <span className="sm:hidden">Código</span>
                  </button>
                </div>
              </div>

              {/* Contenido según método */}
              {metodoValidacion === 'qr' ? (
                <div className="space-y-4 sm:space-y-6">
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 sm:p-6 md:p-8 border-2 border-dashed border-blue-300">
                    <div className="text-center">
                      {showScanner ? (
                        <div>
                          <div className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 mx-auto bg-black/80 rounded-xl flex items-center justify-center mb-4">
                            <div className="w-36 h-36 sm:w-40 sm:h-40 md:w-48 md:h-48 border-4 border-white/50 rounded-lg relative">
                              <div className="absolute top-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
                              <div className="absolute top-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
                              <div className="absolute bottom-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
                              <div className="absolute bottom-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
                              <motion.div
                                className="absolute top-0 left-0 right-0 h-1 bg-green-400"
                                animate={{ top: ['0%', '100%'] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                              />
                            </div>
                          </div>
                          <p className="text-gray-700 font-medium text-sm sm:text-base">Escaneando código QR...</p>
                        </div>
                      ) : (
                        <>
                          <QrCode className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 mx-auto mb-4 sm:mb-6 text-[#003DA5]" strokeWidth={1.5} />
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                            Escanea el código QR del certificado
                          </h3>
                          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 px-2">
                            Coloca el código QR del certificado frente a tu cámara
                          </p>
                          <Button
                            onClick={handleScanQR}
                            size="lg"
                            className="bg-[#003DA5] hover:bg-[#002873] text-white px-8 py-6 text-lg"
                          >
                            <QrCode className="w-6 h-6 mr-2" />
                            Activar Cámara
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-yellow-900 mb-1">Importante</h4>
                        <p className="text-sm text-yellow-800">
                          El código QR se encuentra en la parte inferior derecha del certificado laboral impreso o en el PDF digital.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Número de Certificado
                    </label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Ej: ESAP-CERT-2025-04E23"
                        value={codigoIngresado}
                        onChange={(e) => setCodigoIngresado(e.target.value.toUpperCase())}
                        className="pl-12 py-6 text-lg border-2"
                        onKeyPress={(e) => e.key === 'Enter' && handleValidar()}
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Ingresa el código que aparece en el certificado (ejemplo: ESAP-CERT-2025-04E23)
                    </p>
                  </div>

                  <Button
                    onClick={handleValidar}
                    disabled={isValidating || !codigoIngresado.trim()}
                    size="lg"
                    className="w-full bg-[#003DA5] hover:bg-[#002873] text-white py-6 text-lg"
                  >
                    {isValidating ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                        />
                        Validando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Validar Certificado
                      </>
                    )}
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>
        ) : (
          /* Resultado de la Validación */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Estado del Certificado */}
            <Card className="p-8 shadow-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="inline-block mb-4"
                >
                  <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-16 h-16 text-green-600" strokeWidth={2.5} />
                  </div>
                </motion.div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Certificado Verificado
                </h2>
                <p className="text-gray-600 mb-4">
                  Este certificado laboral es auténtico y fue emitido por la ESAP
                </p>
                {getEstadoBadge(certificadoValidado.estado)}
              </div>
            </Card>

            {/* Información del Empleado */}
            <Card className="p-8 shadow-xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <User className="w-7 h-7 text-[#003DA5]" />
                Información del Empleado
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                      Nombre Completo
                    </label>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {certificadoValidado.empleado.nombre}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                      Documento de Identidad
                    </label>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {certificadoValidado.empleado.documento}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                      Cargo
                    </label>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {certificadoValidado.empleado.cargo}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                      Tipo de Vinculación
                    </label>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {certificadoValidado.empleado.tipoVinculacion}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                      Dependencia
                    </label>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {certificadoValidado.empleado.dependencia}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                      Fecha de Vinculación
                    </label>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {new Date(certificadoValidado.empleado.fechaVinculacion).toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                      Grado Académico
                    </label>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {certificadoValidado.empleado.grado}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Información del Certificado */}
            <Card className="p-8 shadow-xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <FileText className="w-7 h-7 text-[#003DA5]" />
                Información del Certificado
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Número de Certificado
                  </label>
                  <p className="text-lg font-mono font-semibold text-gray-900 mt-1">
                    {certificadoValidado.consecutivo}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Fecha de Emisión
                  </label>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {new Date(certificadoValidado.fechaGeneracion).toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Generado Por
                  </label>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {certificadoValidado.generadoPor}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Hash de Verificación
                  </label>
                  <p className="text-sm font-mono text-gray-600 mt-1 break-all">
                    {certificadoValidado.hash}
                  </p>
                </div>
              </div>
            </Card>

            {/* Acciones */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleReset}
                variant="outline"
                size="lg"
                className="flex-1 border-2 border-[#003DA5] text-[#003DA5] hover:bg-blue-50"
              >
                <Search className="w-5 h-5 mr-2" />
                Validar Otro Certificado
              </Button>
              <Button
                onClick={() => toast.info('Descargando certificado...')}
                size="lg"
                className="flex-1 bg-[#003DA5] hover:bg-[#002873] text-white"
              >
                <Download className="w-5 h-5 mr-2" />
                Descargar Certificado
              </Button>
            </div>

            {/* Footer Info */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">
                    Verificación Registrada
                  </h4>
                  <p className="text-sm text-blue-800">
                    Esta validación ha sido registrada en el sistema de auditoría de la ESAP.
                    El certificado cuenta con firma electrónica y es válido para todos los efectos legales.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Información de Contacto */}
        <Card className="mt-8 p-8 bg-gradient-to-br from-gray-50 to-blue-50">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
            ¿Necesitas más información?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Phone className="w-6 h-6 text-[#003DA5]" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Teléfono</h4>
              <p className="text-gray-600">(601) 444 0555</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6 text-[#003DA5]" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Email</h4>
              <p className="text-gray-600">talentohumano@esap.edu.co</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Globe className="w-6 h-6 text-[#003DA5]" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Sitio Web</h4>
              <p className="text-gray-600">www.esap.edu.co</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
