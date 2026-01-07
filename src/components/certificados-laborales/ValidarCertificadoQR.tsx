import React, { useState } from 'react';
import { motion } from 'motion/react';
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
  ExternalLink,
  Camera
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { QRScannerModal } from './QRScannerModal';
import { certificadosService } from '../../services/api/certificados.service';

interface ValidacionResult {
  isValid: boolean;
  certificado?: {
    consecutivo: string;
    codigoQR: string;
    empleado: {
      nombre: string;
      documento: string;
      cargo: string;
      dependencia: string;
    };
    fechaEmision: string;
    fechaVigencia?: string;
    firmadoPor: string;
    estado: 'VIGENTE' | 'VENCIDO' | 'ANULADO';
  };
  error?: string;
}

export function ValidarCertificadoQR() {
  const [codigoQR, setCodigoQR] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidacionResult | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const getVal = (...vals: (string | undefined | null)[]) => {
    for (const v of vals) {
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return 'No disponible';
  };

  const parseDateString = (value?: string | null) => {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : value;
  };

  const handleValidar = async () => {
    if (!codigoQR.trim()) {
      toast.error('Por favor ingresa un código QR');
      return;
    }

    const codigoNormalizado = codigoQR.trim().toUpperCase();
    setCodigoQR(codigoNormalizado);
    setIsValidating(true);
    setValidationResult(null);

    try {
      // Usar verify directo (existe en el backend) para obtener datos completos
      const response = await certificadosService.validacion.verificarCertificadoLaboral(codigoNormalizado);
      console.log('Respuesta verificación certificado:', response);

      const expiracion = response?.expiration_date ? new Date(response.expiration_date) : null;
      const ahora = new Date();
      const estadoCalculado = response?.status
        ? response.status === 'VALID'
          ? 'VIGENTE'
          : response.status === 'REVOKED'
            ? 'ANULADO'
            : response.status === 'EXPIRED'
              ? 'VENCIDO'
              : 'VIGENTE'
        : expiracion && !isNaN(expiracion.getTime()) && expiracion > ahora
          ? 'VIGENTE'
          : (expiracion && !isNaN(expiracion.getTime()) ? 'VENCIDO' : 'VIGENTE');

      const fechaEmisionValida = parseDateString(
        response?.issue_date
        || response?.issuance_timestamp
        || response?.created_at
        || response?.issueDate
        || response?.issuanceTimestamp
        || response?.createdAt
      );

      const certificado = {
        consecutivo: getVal(response?.certificate_number, response?.certificateNumber, response?.consecutivo),
        codigoQR: response?.verification_code || codigoNormalizado,
        empleado: {
          nombre: getVal(response?.full_name, response?.nombreCompleto, response?.fullName),
          documento: getVal(response?.id_number, response?.documento, response?.idNumber),
          cargo: getVal(response?.position_category, response?.cargo, response?.positionCategory),
          dependencia: getVal(response?.department, response?.dependencia, response?.departmentName, response?.position_location, response?.positionLocation)
        },
        fechaEmision: fechaEmisionValida,
        fechaVigencia: parseDateString(response?.expiration_date),
        firmadoPor: getVal(response?.signer_name, response?.firmante, response?.signerName),
        estado: estadoCalculado
      };

      setValidationResult({ isValid: true, certificado });
      toast.success('Certificado validado correctamente', {
        description: 'La verificación fue registrada'
      });
    } catch (err: any) {
      console.error('Error al validar certificado:', err);
      const message = err?.response?.data?.message || err?.message || 'Código QR inválido o certificado no encontrado';
      setValidationResult({ isValid: false, error: message });
      toast.error('Certificado no válido', {
        description: 'El código ingresado no existe o no es válido'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleReset = () => {
    setCodigoQR('');
    setValidationResult(null);
  };

  const handleQRCodeScanned = (scannedCode: string) => {
    const normalized = (scannedCode ?? '').toUpperCase();
    setCodigoQR(normalized);
    setIsScannerOpen(false);
    handleValidar();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F6FF] to-[#E0EEFF] py-12 px-4">
      <div className="max-w-4xl mx-auto">
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
            Validar Certificado Laboral
          </h1>
          
          <p 
            className="font-normal max-w-2xl mx-auto"
            style={{
              fontSize: '16px',
              lineHeight: '24px',
              color: '#6B7280'
            }}
          >
            Verifica la autenticidad de un certificado laboral emitido por la ESAP ingresando el codigo QR o el consecutivo
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
                    Codigo QR o consecutivo del certificado
                  </label>
                  <div className="relative">
                    <QrCode 
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                      style={{ color: '#9CA3AF' }}
                    />
                    <Input
                      id="codigoQR"
                      type="text"
                      placeholder="Ej: QR-CERT-2025-ABC123XYZ o 12_620_700_20_CD 010"
                      value={codigoQR}
                      onChange={(e) => setCodigoQR(e.target.value.toUpperCase())}
                      className="pl-12 pr-14 py-6 text-base border-2"
                      disabled={isValidating}
                      onKeyPress={(e) => e.key === 'Enter' && handleValidar()}
                    />
                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
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
                    Puedes usar el codigo QR o el consecutivo que aparece en el certificado
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
                        Sistema de verificacion seguro
                      </h4>
                      <p 
                        className="text-sm"
                        style={{ color: '#6B7280' }}
                      >
                        Todos los certificados laborales emitidos por la ESAP incluyen un codigo QR unico y un consecutivo que permiten verificar su autenticidad en tiempo real. Este sistema garantiza la integridad y validez del documento.
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
                      Validando certificado...
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
                            : validationResult.certificado.estado === 'VENCIDO'
                            ? '#FEF3C7'
                            : '#FEE2E2'
                        }}
                      >
                        {validationResult.certificado.estado === 'VIGENTE' ? (
                          <CheckCircle className="w-8 h-8 text-green-600" strokeWidth={2.5} />
                        ) : validationResult.certificado.estado === 'VENCIDO' ? (
                          <AlertCircle className="w-8 h-8 text-yellow-600" strokeWidth={2.5} />
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
                          ? 'Certificado Válido' 
                          : validationResult.certificado.estado === 'VENCIDO'
                          ? 'Certificado Vencido'
                          : 'Certificado Anulado'}
                      </h2>
                      
                      <Badge 
                        variant="outline"
                        className={`text-sm px-4 py-1 ${
                          validationResult.certificado.estado === 'VIGENTE'
                            ? 'bg-green-100 text-green-800 border-green-300'
                            : validationResult.certificado.estado === 'VENCIDO'
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                            : 'bg-red-100 text-red-800 border-red-300'
                        }`}
                      >
                        {validationResult.certificado.estado}
                      </Badge>
                    </div>

                    {/* Detalles del Certificado */}
                    <Card className="p-6 bg-gray-50 border-2">
                      <h3 
                        className="font-bold mb-4"
                        style={{
                          fontSize: '16px',
                          lineHeight: '24px',
                          color: '#1F2937'
                        }}
                      >
                        Información del Certificado
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
                            Nombre Completo
                          </label>
                          <p 
                            className="font-medium"
                            style={{
                              fontSize: '14px',
                              color: '#1F2937'
                            }}
                          >
                            {validationResult.certificado.empleado.nombre}
                          </p>
                        </div>

                        <div>
                          <label 
                            className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                            style={{ color: '#6B7280' }}
                          >
                            Documento
                          </label>
                          <p 
                            className="font-medium"
                            style={{
                              fontSize: '14px',
                              color: '#1F2937'
                            }}
                          >
                            CC {validationResult.certificado.empleado.documento}
                          </p>
                        </div>

                        <div>
                          <label 
                            className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                            style={{ color: '#6B7280' }}
                          >
                            <FileText className="w-3 h-3 inline mr-1" />
                            Cargo
                          </label>
                          <p 
                            className="font-medium"
                            style={{
                              fontSize: '14px',
                              color: '#1F2937'
                            }}
                          >
                            {validationResult.certificado.empleado.cargo}
                          </p>
                        </div>

                        <div>
                          <label 
                            className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                            style={{ color: '#6B7280' }}
                          >
                            <Building className="w-3 h-3 inline mr-1" />
                            Dependencia
                          </label>
                          <p 
                            className="font-medium"
                            style={{
                              fontSize: '14px',
                              color: '#1F2937'
                            }}
                          >
                            {validationResult.certificado.empleado.dependencia}
                          </p>
                        </div>

                        <div>
                          <label 
                            className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                            style={{ color: '#6B7280' }}
                          >
                            <Calendar className="w-3 h-3 inline mr-1" />
                            Fecha de Emisión
                          </label>
                          {validationResult.certificado.fechaEmision ? (
                            <p 
                              className="font-medium"
                              style={{
                                fontSize: '14px',
                                color: '#1F2937'
                              }}
                            >
                              {new Date(validationResult.certificado.fechaEmision).toLocaleDateString('es-CO', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          ) : (
                            <p className="font-medium" style={{ fontSize: '14px', color: '#6B7280' }}>
                              No disponible
                            </p>
                          )}
                        </div>

                        {validationResult.certificado.fechaVigencia && (
                          <div>
                            <label 
                              className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                              style={{ color: '#6B7280' }}
                            >
                              Fecha de Vigencia
                            </label>
                            <p 
                              className="font-medium"
                              style={{
                                fontSize: '14px',
                                color: '#1F2937'
                              }}
                            >
                              {new Date(validationResult.certificado.fechaVigencia).toLocaleDateString('es-CO', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        )}
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

                    {/* Alerta adicional si está vencido o anulado */}
                    {validationResult.certificado.estado !== 'VIGENTE' && (
                      <Card className={`p-4 border-2 ${
                        validationResult.certificado.estado === 'VENCIDO'
                          ? 'bg-yellow-50 border-yellow-300'
                          : 'bg-red-50 border-red-300'
                      }`}>
                        <div className="flex items-start gap-3">
                          <AlertCircle 
                            className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                              validationResult.certificado.estado === 'VENCIDO'
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}
                          />
                          <div>
                            <h4 
                              className="font-semibold mb-1"
                              style={{
                                fontSize: '14px',
                                color: '#1F2937'
                              }}
                            >
                              {validationResult.certificado.estado === 'VENCIDO'
                                ? 'Certificado Vencido'
                                : 'Certificado Anulado'}
                            </h4>
                            <p 
                              className="text-sm"
                              style={{ color: '#6B7280' }}
                            >
                              {validationResult.certificado.estado === 'VENCIDO'
                                ? 'Este certificado ha superado su fecha de vigencia. Para obtener un certificado actualizado, el empleado debe solicitarlo nuevamente.'
                                : 'Este certificado ha sido anulado y no tiene validez. Por favor contacte con Talento Humano ESAP para más información.'}
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
                        color: '#DC2626'
                      }}
                    >
                      ⚠️ Código No Encontrado
                    </h2>

                    <p
                      className="text-base mb-4 font-medium"
                      style={{ color: '#991B1B' }}
                    >
                      El código ingresado no existe en el sistema
                    </p>

                    <p
                      className="text-sm mb-6"
                      style={{ color: '#6B7280' }}
                    >
                      Código buscado: <span className="font-mono font-bold text-red-600">{codigoQR}</span>
                    </p>

                    <Card className="p-5 bg-red-50 border-2 border-red-300 text-left mb-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold mb-2" style={{ fontSize: '15px', color: '#991B1B' }}>
                            ❌ No se encontró ningún certificado con este código
                          </h4>
                          <p className="text-sm mb-3" style={{ color: '#6B7280' }}>
                            Esto puede significar que:
                          </p>
                          <ul className="text-sm space-y-2 list-none" style={{ color: '#4B5563' }}>
                            <li className="flex items-start gap-2">
                              <span className="text-red-500 font-bold">•</span>
                              <span><strong>El código no corresponde a ningún certificado emitido</strong> por la ESAP</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-red-500 font-bold">•</span>
                              <span><strong>El certificado puede ser falso</strong> o fraudulento</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-red-500 font-bold">•</span>
                              <span>Hay un <strong>error en el código ingresado</strong> (verifica mayúsculas, números y guiones)</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4 bg-yellow-50 border-2 border-yellow-300 text-left">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold mb-1" style={{ fontSize: '14px', color: '#92400E' }}>
                            💡 Recomendaciones
                          </h4>
                          <ul className="text-sm space-y-1" style={{ color: '#78716C' }}>
                            <li>• Verifica que hayas ingresado el código correctamente</li>
                            <li>• Intenta escanear el código QR con la cámara</li>
                            <li>• Si el problema persiste, contacta con Talento Humano ESAP</li>
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
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onQRDetected={handleQRCodeScanned}
      />
    </div>
  );
}

