/**
 * Validar Certificado de Grado - Modal
 * Permite verificar la autenticidad de certificados de grado mediante código QR o número de certificado.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  QrCode,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Shield,
  GraduationCap,
  User,
  Camera,
  X
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import esapLogoWhite from 'figma:asset/2eabfe85218557ad27ece74d963c4a3b61b716be.png';
import { ESAPLogoSVG } from '../../assets/ESAPLogoSVG';
import graduadosService, { CertificadoGraduado } from '../../../services/api/graduados.service';

interface ValidacionResult {
  isValid: boolean;
  certificado?: {
    consecutivo: string;
    codigoQR: string;
    graduado: {
      nombre: string;
      documento: string;
      programa: string;
      territorial: string;
      cohorte: string;
    };
    fechaGrado: string;
    numeroActa: string;
    numeroFolio: string;
    tituloOtorgado: string;
    firmadoPor: string;
    estado: 'VIGENTE' | 'REVOCADO' | 'ANULADO';
  };
  error?: string;
}

interface ValidarCertificadoGradoProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
}

export function ValidarCertificadoGrado({ isOpen, onClose, onBack }: ValidarCertificadoGradoProps) {
  const [codigoQR, setCodigoQR] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidacionResult | null>(null);

  const mapEstadoCertificado = (status?: CertificadoGraduado['status']): ValidacionResult['certificado']['estado'] => {
    if (status === 'REVOKED') return 'REVOCADO';
    if (status === 'EXPIRED') return 'ANULADO';
    return 'VIGENTE';
  };

  const mapCertificado = (certificado: CertificadoGraduado): ValidacionResult['certificado'] => ({
    consecutivo: certificado.certificateNumber,
    codigoQR: certificado.verificationCode || codigoQR,
    graduado: {
      nombre: certificado.fullName,
      documento: certificado.idNumber,
      programa: certificado.programName,
      territorial: certificado.seccionalName || certificado.campus || 'No especificado',
      cohorte: 'No especificado'
    },
    fechaGrado: certificado.graduationDate,
    numeroActa: certificado.actaNumber || 'No especificado',
    numeroFolio: certificado.diplomaNumber || 'No especificado',
    tituloOtorgado: certificado.degreeTitle,
    firmadoPor: [certificado.signerName, certificado.signerPosition].filter(Boolean).join(' - ') || 'No especificado',
    estado: mapEstadoCertificado(certificado.status)
  });

  const formatDateOnly = (value?: string) => {
    if (!value) return '';
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]) - 1;
      const day = Number(isoMatch[3]);
      const parsed = new Date(year, month, day, 12, 0, 0);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('es-CO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleValidar = async () => {
    if (!codigoQR.trim()) return;

    setIsValidating(true);
    setValidationResult(null);

    try {
      const codigoIngresado = codigoQR.trim();
      const isNumeroCertificado = /^CERT-GR-\d{4}-\d{4}$/i.test(codigoIngresado);
      const response = isNumeroCertificado
        ? await graduadosService.validacion.validarPorNumero(codigoIngresado)
        : await graduadosService.validacion.validarQR(codigoIngresado);

      const certificado = response.certificado;
      const isValid = Boolean(certificado);
      const result: ValidacionResult = isValid
        ? {
            isValid: true,
            certificado: mapCertificado(certificado as CertificadoGraduado)
          }
        : {
            isValid: false,
            error: response.mensaje || 'Certificado no existente o no encontrado'
          };

      setValidationResult(result);

      if (response.valido) {
        toast.success('Certificado de grado validado correctamente');
      } else {
        toast.error(response.mensaje || 'Certificado no valido');
      }
    } catch (error) {
      console.error('Error al validar certificado:', error);
      setValidationResult({
        isValid: false,
        error: 'Error al validar el certificado. Intenta nuevamente.'
      });
      toast.error('Error al validar el certificado');
    } finally {
      setIsValidating(false);
    }
  };

  const handleReset = () => {
    setCodigoQR('');
    setValidationResult(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[9999] p-4"
          style={{
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
          onClick={onClose}
        >
          {onBack && (
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
                    {/* <img 
                      src={esapLogoWhite} 
                      alt="ESAP Logo" 
                      className="h-8 sm:h-10 w-auto object-contain brightness-0 invert"
                    /> */}
                    <ESAPLogoSVG
                      variant="color"
                    />
                    <div className="hidden sm:block">
                      <p className="text-xs font-semibold text-white">Validador de Certificados</p>
                      <p className="text-[9px] font-medium text-white/70 -mt-0.5">Certificados de Grado</p>
                    </div>
                  </div>

                  {/* Botón Volver */}
                  <button
                    onClick={onBack}
                    className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full font-semibold text-xs sm:text-sm transition-all duration-300 bg-white text-[#003DA5] hover:bg-blue-50 hover:scale-105 shadow-lg"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Volver</span>
                    <span className="sm:hidden">Atrás</span>
                  </button>
                </div>
              </div>
            </motion.nav>
          )}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className={!onBack ? 'bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative' : 'max-w-4xl w-full max-h-[90vh] overflow-y-auto relative'}
            style={!onBack ? { boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' } : undefined}
          >
            {!onBack && (
              <button
                onClick={onClose}
                className="sticky top-4 right-4 float-right z-10 p-2 bg-white hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 transition-colors shadow-lg border border-gray-200"
                title="Cerrar (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <div className="p-8">

              <div className="max-w-4xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-center mb-8"
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
                      fontSize: '32px',
                      lineHeight: '40px',
                      letterSpacing: '-0.5px',
                      color: '#1F2937'
                    }}
                  >
                    Validar Certificado de Grado
                  </h1>

                  <p
                    className="font-normal max-w-2xl mx-auto"
                    style={{
                      fontSize: '16px',
                      lineHeight: '24px',
                      color: '#6B7280'
                    }}
                  >
                    Verifica la autenticidad de un certificado de grado emitido por la ESAP ingresando el código QR o el número de certificado.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <Card className="bg-white rounded-2xl p-8 shadow-xl border-2 border-[#E5E7EB]">
                    {!validationResult ? (
                      <div className="space-y-6">
                        <div>
                          <label
                            htmlFor="codigoQR"
                            className="block font-semibold mb-3"
                            style={{
                              fontSize: '14px',
                              lineHeight: '20px',
                              color: '#1F2937'
                            }}
                          >
                            Código QR o Número de Certificado
                          </label>
                          <div className="relative">
                            <QrCode
                              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                              style={{ color: '#9CA3AF' }}
                            />
                            <Input
                              id="codigoQR"
                              type="text"
                              placeholder="Ej: QR-GR-2026-0040-lv0329kxdf o CERT-GR-2026-0040"
                              value={codigoQR}
                              onChange={(e) => setCodigoQR(e.target.value)}
                              className="pl-12 pr-14 py-6 text-base border-2"
                              disabled={isValidating}
                              onKeyPress={(e) => e.key === 'Enter' && handleValidar()}
                            />
                            <button
                              type="button"
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#003DA5] transition-colors"
                              title="Escanear con cámara"
                            >
                              <Camera className="w-5 h-5" />
                            </button>
                          </div>
                          <p className="mt-2 text-sm" style={{ color: '#6B7280' }}>
                            El código QR o el número de certificado se encuentran impresos en el certificado.
                          </p>
                        </div>

                        <Card className="p-4 bg-blue-50 border-2 border-blue-200">
                          <div className="flex items-start gap-3">
                            <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <h4
                                className="font-semibold mb-1"
                                style={{
                                  fontSize: '14px',
                                  color: '#1F2937'
                                }}
                              >
                                Sistema de Verificación Seguro
                              </h4>
                              <p className="text-sm" style={{ color: '#6B7280' }}>
                                Todos los certificados de grado emitidos por la ESAP incluyen un código QR único y un número de certificado irrepetible que permiten verificar su autenticidad en tiempo real.
                              </p>
                            </div>
                          </div>
                        </Card>

                        <Button
                          onClick={handleValidar}
                          disabled={isValidating || !codigoQR.trim()}
                          className="w-full py-6 text-base font-semibold transition-all"
                          style={{
                            background: isValidating || !codigoQR.trim() ? '#D1D5DB' : 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                            boxShadow: '0 8px 24px rgba(0, 61, 165, 0.25)'
                          }}
                        >
                          <div className="flex items-center justify-center gap-3 text-white">
                            {isValidating ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Validando certificado...</span>
                              </>
                            ) : (
                              <>
                                <QrCode className="w-6 h-6" strokeWidth={2.5} />
                                <span>Validar Certificado</span>
                              </>
                            )}
                          </div>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {validationResult.isValid && validationResult.certificado ? (
                          <>
                            <div className="text-center py-6">
                              <div
                                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                                style={{
                                  background: validationResult.certificado.estado === 'VIGENTE' ? '#ECFDF5' : '#FEE2E2'
                                }}
                              >
                                {validationResult.certificado.estado === 'VIGENTE' ? (
                                  <CheckCircle className="w-8 h-8 text-green-600" strokeWidth={2.5} />
                                ) : (
                                  <XCircle className="w-8 h-8 text-red-600" strokeWidth={2.5} />
                                )}
                              </div>

                              <h2
                                className="font-bold mb-2"
                                style={{
                                  fontSize: '24px',
                                  lineHeight: '32px',
                                  color: '#1F2937'
                                }}
                              >
                                {validationResult.certificado.estado === 'VIGENTE'
                                  ? 'Certificado de Grado Válido'
                                  : 'Certificado Revocado o Anulado'}
                              </h2>

                              <Badge
                                variant="outline"
                                className={`text-sm px-4 py-1 ${
                                  validationResult.certificado.estado === 'VIGENTE'
                                    ? 'bg-green-100 text-green-800 border-green-300'
                                    : 'bg-red-100 text-red-800 border-red-300'
                                }`}
                              >
                                {validationResult.certificado.estado}
                              </Badge>
                            </div>

                            <Card className="p-6 bg-gray-50 border-2">
                              <h3
                                className="font-bold mb-4 flex items-center gap-2"
                                style={{
                                  fontSize: '16px',
                                  lineHeight: '24px',
                                  color: '#1F2937'
                                }}
                              >
                                <GraduationCap className="w-5 h-5 text-[#003DA5]" />
                                Información del Certificado de Grado
                              </h3>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: '#6B7280' }}>
                                    Consecutivo
                                  </label>
                                  <p className="font-semibold" style={{ fontSize: '14px', color: '#003DA5' }}>
                                    {validationResult.certificado.consecutivo}
                                  </p>
                                </div>

                                <div>
                                  <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: '#6B7280' }}>
                                    Código QR
                                  </label>
                                  <p className="font-mono font-semibold" style={{ fontSize: '14px', color: '#1F2937' }}>
                                    {validationResult.certificado.codigoQR}
                                  </p>
                                </div>

                                <div>
                                  <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: '#6B7280' }}>
                                    <User className="w-3 h-3 inline mr-1" />
                                    Nombre del Graduado
                                  </label>
                                  <p className="font-medium" style={{ fontSize: '14px', color: '#1F2937' }}>
                                    {validationResult.certificado.graduado.nombre}
                                  </p>
                                </div>

                                <div>
                                  <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: '#6B7280' }}>
                                    Documento
                                  </label>
                                  <p className="font-medium" style={{ fontSize: '14px', color: '#1F2937' }}>
                                    {validationResult.certificado.graduado.documento}
                                  </p>
                                </div>

                                <div>
                                  <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: '#6B7280' }}>
                                    Programa Académico
                                  </label>
                                  <p className="font-medium" style={{ fontSize: '14px', color: '#1F2937' }}>
                                    {validationResult.certificado.graduado.programa}
                                  </p>
                                </div>

                                <div>
                                  <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: '#6B7280' }}>
                                    Territorial / Campus
                                  </label>
                                  <p className="font-medium" style={{ fontSize: '14px', color: '#1F2937' }}>
                                    {validationResult.certificado.graduado.territorial}
                                  </p>
                                </div>

                                <div>
                                  <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: '#6B7280' }}>
                                    Fecha de Grado
                                  </label>
                                  <p className="font-medium" style={{ fontSize: '14px', color: '#1F2937' }}>
                                    {formatDateOnly(validationResult.certificado.fechaGrado)}
                                  </p>
                                </div>

                                <div>
                                  <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: '#6B7280' }}>
                                    Número de Acta
                                  </label>
                                  <p className="font-medium" style={{ fontSize: '14px', color: '#1F2937' }}>
                                    {validationResult.certificado.numeroActa}
                                  </p>
                                </div>

                                <div>
                                  <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: '#6B7280' }}>
                                    Número de Folio
                                  </label>
                                  <p className="font-medium" style={{ fontSize: '14px', color: '#1F2937' }}>
                                    {validationResult.certificado.numeroFolio}
                                  </p>
                                </div>

                                <div>
                                  <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: '#6B7280' }}>
                                    Título Otorgado
                                  </label>
                                  <p className="font-medium" style={{ fontSize: '14px', color: '#1F2937' }}>
                                    {validationResult.certificado.tituloOtorgado}
                                  </p>
                                </div>

                                <div>
                                  <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: '#6B7280' }}>
                                    Firmado por
                                  </label>
                                  <p className="font-medium" style={{ fontSize: '14px', color: '#1F2937' }}>
                                    {validationResult.certificado.firmadoPor}
                                  </p>
                                </div>
                              </div>
                            </Card>
                          </>
                        ) : (
                          <div className="text-center py-8">
                            <div
                              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                              style={{
                                background: '#FEE2E2'
                              }}
                            >
                              <XCircle className="w-8 h-8 text-red-600" strokeWidth={2.5} />
                            </div>

                            <h2
                              className="font-bold mb-2"
                              style={{
                                fontSize: '24px',
                                lineHeight: '32px',
                                color: '#1F2937'
                              }}
                            >
                              Certificado No Válido
                            </h2>

                            <p className="text-base mb-6" style={{ color: '#6B7280' }}>
                              {validationResult.error || 'No se encontró ningún certificado de grado con el código QR ingresado'}
                            </p>

                            <Card className="p-4 bg-red-50 border-2 border-red-200 text-left">
                              <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <h4
                                    className="font-semibold mb-1"
                                    style={{
                                      fontSize: '14px',
                                      color: '#1F2937'
                                    }}
                                  >
                                    ¿Qué significa esto?
                                  </h4>
                                  <ul className="text-sm space-y-1 list-disc list-inside" style={{ color: '#6B7280' }}>
                                    <li>El código QR ingresado no corresponde a ningún certificado emitido</li>
                                    <li>El certificado puede haber sido falsificado</li>
                                    <li>Puede haber un error en el código ingresado</li>
                                  </ul>
                                </div>
                              </div>
                            </Card>
                          </div>
                        )}

                        <Button
                          onClick={handleReset}
                          variant="outline"
                          className="w-full py-4 border-2 font-semibold"
                        >
                          Validar Otro Certificado
                        </Button>
                      </div>
                    )}
                  </Card>
                </motion.div>

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
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
