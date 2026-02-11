/**
 * ============================================
 * VALIDAR CERTIFICADO DE GRADO - MODAL
 * ============================================
 * 
 * Componente modal para validar la autenticidad de certificados de grado
 * emitidos por la ESAP mediante código QR.
 * 
 * FUNCIONALIDAD:
 * - Modal premium con diseño corporativo ESAP
 * - Validación por código QR
 * - Escaneo con cámara (opcional)
 * - Resultados con información del graduado
 * - Estados: VIGENTE, REVOCADO, NO VÁLIDO
 * 
 * ÚLTIMA ACTUALIZACIÓN: 15 Enero 2026
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  QrCode,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  FileText,
  User,
  Calendar,
  Building,
  Shield,
  GraduationCap,
  Award,
  Camera,
  X
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';

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
}

export function ValidarCertificadoGrado({ isOpen, onClose }: ValidarCertificadoGradoProps) {
  const [codigoQR, setCodigoQR] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidacionResult | null>(null);

  // ✅ Manejo de teclas (ESC para cerrar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isValidating) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isValidating]);

  // ✅ Reset cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setCodigoQR('');
      setValidationResult(null);
      setIsValidating(false);
    }
  }, [isOpen]);

  const handleValidar = async () => {
    if (!codigoQR.trim()) {
      toast.error('Por favor ingresa un código QR');
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    // Simular llamado al servicio de validación
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock de respuesta - En producción sería una llamada real al backend
    const mockResult: ValidacionResult = {
      isValid: codigoQR.length > 5, // Simulación simple
      certificado: codigoQR.length > 5 ? {
        consecutivo: 'GRAD-2024-001234',
        codigoQR: codigoQR,
        graduado: {
          nombre: 'Ana María Gutiérrez Sánchez',
          documento: '1.015.234.567',
          programa: 'Especialización en Gestión Pública',
          territorial: 'Dirección Territorial Bogotá',
          cohorte: '2023-II'
        },
        fechaGrado: '2024-12-15T14:00:00',
        numeroActa: 'ACTA-CD-024-2024',
        numeroFolio: 'FOLIO-152-2024',
        tituloOtorgado: 'Especialista en Gestión Pública',
        firmadoPor: 'Dr. Carlos Alberto Ramírez - Rector Nacional ESAP',
        estado: 'VIGENTE'
      } : undefined,
      error: codigoQR.length <= 5 ? 'Código QR inválido o certificado no encontrado' : undefined
    };

    setValidationResult(mockResult);
    setIsValidating(false);

    if (mockResult.isValid) {
      toast.success('Certificado de grado validado correctamente');
    } else {
      toast.error('Certificado no válido');
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
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative"
            style={{
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* Botón de Cerrar - Fijo en la esquina */}
            <button
              onClick={onClose}
              className="sticky top-4 right-4 float-right z-10 p-2 bg-white hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 transition-colors shadow-lg border border-gray-200"
              title="Cerrar (ESC)"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Contenido del Modal */}
            <div className="p-8">
              {/* Header */}
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
                    fontSize: '36px',
                    lineHeight: '44px',
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
                  Verifica la autenticidad de un certificado de grado emitido por la ESAP ingresando el código QR
                </p>
              </motion.div>

              {/* Card Principal */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card className="bg-white rounded-2xl p-8 shadow-xl border-2 border-[#E5E7EB]">
                  {/* Formulario de Validación */}
                  {!validationResult && (
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
                          Código QR del Certificado
                        </label>
                        <div className="relative">
                          <QrCode 
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                            style={{ color: '#9CA3AF' }}
                          />
                          <Input
                            id="codigoQR"
                            type="text"
                            placeholder="Ej: ESAP-GRAD-2025-ABC123XYZ"
                            value={codigoQR}
                            onChange={(e) => setCodigoQR(e.target.value.toUpperCase())}
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
                        <p 
                          className="mt-2 text-sm"
                          style={{ color: '#6B7280' }}
                        >
                          El código QR se encuentra impreso en la parte inferior del certificado
                        </p>
                      </div>

                      {/* Info Card */}
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
                            <p 
                              className="text-sm"
                              style={{ color: '#6B7280' }}
                            >
                              Todos los certificados de grado emitidos por la ESAP incluyen un código QR único que permite verificar su autenticidad en tiempo real. Este sistema garantiza la integridad y validez del documento.
                            </p>
                          </div>
                        </div>
                      </Card>

                      {/* Botón de Validar */}
                      <Button
                        onClick={handleValidar}
                        disabled={isValidating || !codigoQR.trim()}
                        className="w-full py-6 text-base font-semibold transition-all"
                        style={{
                          background: isValidating || !codigoQR.trim() ? '#D1D5DB' : '#003DA5',
                          color: '#FFFFFF'
                        }}
                      >
                        {isValidating ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Validando certificado de grado...
                          </>
                        ) : (
                          <>
                            <Search className="w-5 h-5 mr-2" />
                            Validar Certificado
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Resultado de Validación */}
                  {validationResult && (
                    <div className="space-y-6">
                      {validationResult.isValid && validationResult.certificado ? (
                        <>
                          {/* Header de Éxito */}
                          <div className="text-center py-6">
                            <div 
                              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                              style={{
                                background: validationResult.certificado.estado === 'VIGENTE' 
                                  ? '#ECFDF5' 
                                  : '#FEE2E2'
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

                          {/* Detalles del Certificado */}
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
                                <label 
                                  className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                                  style={{ color: '#6B7280' }}
                                >
                                  Consecutivo
                                </label>
                                <p 
                                  className="font-semibold"
                                  style={{
                                    fontSize: '14px',
                                    color: '#003DA5'
                                  }}
                                >
                                  {validationResult.certificado.consecutivo}
                                </p>
                              </div>

                              <div>
                                <label 
                                  className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                                  style={{ color: '#6B7280' }}
                                >
                                  Código QR
                                </label>
                                <p 
                                  className="font-mono font-semibold"
                                  style={{
                                    fontSize: '14px',
                                    color: '#1F2937'
                                  }}
                                >
                                  {validationResult.certificado.codigoQR}
                                </p>
                              </div>

                              <div>
                                <label 
                                  className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                                  style={{ color: '#6B7280' }}
                                >
                                  <User className="w-3 h-3 inline mr-1" />
                                  Nombre del Graduado
                                </label>
                                <p 
                                  className="font-medium"
                                  style={{
                                    fontSize: '14px',
                                    color: '#1F2937'
                                  }}
                                >
                                  {validationResult.certificado.graduado.nombre}
                                </p>
                              </div>

                              <div>
                                <label 
                                  className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                                  style={{ color: '#6B7280' }}
                                >
                                  Documento de Identidad
                                </label>
                                <p 
                                  className="font-medium"
                                  style={{
                                    fontSize: '14px',
                                    color: '#1F2937'
                                  }}
                                >
                                  CC {validationResult.certificado.graduado.documento}
                                </p>
                              </div>

                              <div className="md:col-span-2">
                                <label 
                                  className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                                  style={{ color: '#6B7280' }}
                                >
                                  <Award className="w-3 h-3 inline mr-1" />
                                  Título Otorgado
                                </label>
                                <p 
                                  className="font-medium"
                                  style={{
                                    fontSize: '14px',
                                    color: '#1F2937'
                                  }}
                                >
                                  {validationResult.certificado.tituloOtorgado}
                                </p>
                              </div>

                              <div className="md:col-span-2">
                                <label 
                                  className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                                  style={{ color: '#6B7280' }}
                                >
                                  <FileText className="w-3 h-3 inline mr-1" />
                                  Programa Académico
                                </label>
                                <p 
                                  className="font-medium"
                                  style={{
                                    fontSize: '14px',
                                    color: '#1F2937'
                                  }}
                                >
                                  {validationResult.certificado.graduado.programa}
                                </p>
                              </div>

                              <div>
                                <label 
                                  className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                                  style={{ color: '#6B7280' }}
                                >
                                  <Building className="w-3 h-3 inline mr-1" />
                                  Territorial
                                </label>
                                <p 
                                  className="font-medium"
                                  style={{
                                    fontSize: '14px',
                                    color: '#1F2937'
                                  }}
                                >
                                  {validationResult.certificado.graduado.territorial}
                                </p>
                              </div>

                              <div>
                                <label 
                                  className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                                  style={{ color: '#6B7280' }}
                                >
                                  Cohorte
                                </label>
                                <p 
                                  className="font-medium"
                                  style={{
                                    fontSize: '14px',
                                    color: '#1F2937'
                                  }}
                                >
                                  {validationResult.certificado.graduado.cohorte}
                                </p>
                              </div>

                              <div>
                                <label 
                                  className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                                  style={{ color: '#6B7280' }}
                                >
                                  <Calendar className="w-3 h-3 inline mr-1" />
                                  Fecha de Grado
                                </label>
                                <p 
                                  className="font-medium"
                                  style={{
                                    fontSize: '14px',
                                    color: '#1F2937'
                                  }}
                                >
                                  {new Date(validationResult.certificado.fechaGrado).toLocaleDateString('es-CO', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>

                              <div>
                                <label 
                                  className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                                  style={{ color: '#6B7280' }}
                                >
                                  Número de Acta
                                </label>
                                <p 
                                  className="font-medium"
                                  style={{
                                    fontSize: '14px',
                                    color: '#1F2937'
                                  }}
                                >
                                  {validationResult.certificado.numeroActa}
                                </p>
                              </div>

                              <div>
                                <label 
                                  className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                                  style={{ color: '#6B7280' }}
                                >
                                  Número de Folio
                                </label>
                                <p 
                                  className="font-medium"
                                  style={{
                                    fontSize: '14px',
                                    color: '#1F2937'
                                  }}
                                >
                                  {validationResult.certificado.numeroFolio}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-300">
                              <label 
                                className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                                style={{ color: '#6B7280' }}
                              >
                                <Shield className="w-3 h-3 inline mr-1" />
                                Firmado Electrónicamente Por
                              </label>
                              <p 
                                className="font-medium"
                                style={{
                                  fontSize: '14px',
                                  color: '#1F2937'
                                }}
                              >
                                {validationResult.certificado.firmadoPor}
                              </p>
                            </div>
                          </Card>

                          {/* Alerta adicional si está revocado o anulado */}
                          {validationResult.certificado.estado !== 'VIGENTE' && (
                            <Card className="p-4 bg-red-50 border-2 border-red-300">
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
                                    Certificado Revocado o Anulado
                                  </h4>
                                  <p 
                                    className="text-sm"
                                    style={{ color: '#6B7280' }}
                                  >
                                    Este certificado ha sido revocado y no tiene validez. Por favor contacte con la Dirección de Registro Académico ESAP para más información.
                                  </p>
                                </div>
                              </div>
                            </Card>
                          )}
                        </>
                      ) : (
                        /* Resultado Inválido */
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
                          
                          <p 
                            className="text-base mb-6"
                            style={{ color: '#6B7280' }}
                          >
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
                                <ul 
                                  className="text-sm space-y-1 list-disc list-inside"
                                  style={{ color: '#6B7280' }}
                                >
                                  <li>El código QR ingresado no corresponde a ningún certificado emitido</li>
                                  <li>El certificado puede haber sido falsificado</li>
                                  <li>Puede haber un error en el código ingresado</li>
                                </ul>
                              </div>
                            </div>
                          </Card>
                        </div>
                      )}

                      {/* Botón de Nueva Validación */}
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}