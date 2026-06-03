/**
 * Componente: Validar Certificado de Graduado
 *
 * Portal público para validar certificados de graduados mediante:
 * - Escaneo de código QR
 * - Ingreso manual de código de verificación
 * - Búsqueda por número de certificado
 *
 * Muestra información completa del graduado y estado del certificado
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  FileText,
  Award,
  Building2,
  User,
  IdCard,
  GraduationCap,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import graduadosService, {
  ValidacionPublicaResponse,
  CertificadoGraduado
} from '../../services/api/graduados.service';

interface ValidarCertificadoGraduadoProps {
  onVolver: () => void;
  codigoInicial?: string;
}

/**
 * Función auxiliar: Formatear fecha
 */
const formatearFecha = (fecha: string): string => {
  if (!fecha) return '';

  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  const fechaObj = new Date(fecha + 'T00:00:00');
  const dia = fechaObj.getDate();
  const mes = meses[fechaObj.getMonth()];
  const año = fechaObj.getFullYear();

  return `${dia} de ${mes} de ${año}`;
};

export default function ValidarCertificadoGraduado({
  onVolver,
  codigoInicial,
}: ValidarCertificadoGraduadoProps) {
  // ========================================
  // ESTADO
  // ========================================

  const [modoValidacion, setModoValidacion] = useState<'qr' | 'codigo' | 'numero'>('codigo');
  const [codigoVerificacion, setCodigoVerificacion] = useState('');
  const [numeroCertificado, setNumeroCertificado] = useState('');
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<ValidacionPublicaResponse | null>(null);
  const [mostrarResultado, setMostrarResultado] = useState(false);

  // ========================================
  // HANDLERS
  // ========================================

  const validarPorCodigo = async (codigo: string) => {
    if (!codigo || codigo.length < 10) {
      toast.error('Por favor ingresa un codigo de verificacion valido');
      return;
    }

    setCargando(true);
    setMostrarResultado(false);

    try {
      const response = await graduadosService.validacion.validarQR(codigo);
      setResultado(response);
      setMostrarResultado(true);

      if (response.valido) {
        toast.success('Certificado valido', { duration: 3000 });
      } else {
        toast.error('Certificado no valido', { duration: 3000 });
      }
    } catch (error: any) {
      console.error('Error al validar:', error);
      toast.error('Error al validar el certificado. Intenta nuevamente.');
      setResultado({
        valido: false,
        mensaje: 'Error al conectar con el servidor',
        resultado: 'NOT_FOUND'
      });
      setMostrarResultado(true);
    } finally {
      setCargando(false);
    }
  };

  const handleValidarPorCodigo = async () => {
    await validarPorCodigo(codigoVerificacion);
  };

  const handleValidarPorNumero = async () => {
    if (!numeroCertificado) {
      toast.error('Por favor ingresa el número de certificado');
      return;
    }

    setCargando(true);
    setMostrarResultado(false);

    try {
      const response = await graduadosService.validacion.validarPorNumero(numeroCertificado);
      setResultado(response);
      setMostrarResultado(true);

      if (response.valido) {
        toast.success('Certificado válido', { duration: 3000 });
      } else {
        toast.error('Certificado no válido', { duration: 3000 });
      }

    } catch (error: any) {
      console.error('Error al validar:', error);
      toast.error('Error al validar el certificado. Intenta nuevamente.');
      setResultado({
        valido: false,
        mensaje: 'Error al conectar con el servidor',
        resultado: 'NOT_FOUND'
      });
      setMostrarResultado(true);
    } finally {
      setCargando(false);
    }
  };

  const handleNuevaValidacion = () => {
    setCodigoVerificacion('');
    setNumeroCertificado('');
    setResultado(null);
    setMostrarResultado(false);
  };

  useEffect(() => {
    if (codigoInicial) {
      setModoValidacion('codigo');
      setCodigoVerificacion(codigoInicial);
      void validarPorCodigo(codigoInicial);
    }
  }, [codigoInicial]);

  // ========================================
  // RENDER: Icono de estado
  // ========================================

  const renderIconoEstado = (resultado: string) => {
    switch (resultado) {
      case 'VALID':
        return (
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" />
          </div>
        );
      case 'REVOKED':
        return (
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-600" />
          </div>
        );
      case 'EXPIRED':
        return (
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-orange-600" />
          </div>
        );
      default:
        return (
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-gray-600" />
          </div>
        );
    }
  };

  // ========================================
  // RENDER: Resultado de validación
  // ========================================

  const renderResultado = () => {
    if (!resultado || !mostrarResultado) return null;

    const certificado = resultado.certificado;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Estado del certificado */}
        <div className="text-center">
          {renderIconoEstado(resultado.resultado)}

          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            {resultado.resultado === 'VALID' && '✓ Certificado Válido'}
            {resultado.resultado === 'REVOKED' && '✗ Certificado Revocado'}
            {resultado.resultado === 'EXPIRED' && '⏱ Certificado Expirado'}
            {resultado.resultado === 'NOT_FOUND' && '⚠ Certificado No Encontrado'}
          </h3>

          <p className="text-sm sm:text-base text-gray-600">
            {resultado.mensaje}
          </p>
        </div>

        {/* Información del certificado */}
        {certificado && resultado.valido && (
          <div className="bg-white border-2 border-gray-200 rounded-lg p-4 sm:p-6 space-y-6">
            {/* Información del graduado */}
            <div>
              <h4 className="font-bold text-base sm:text-lg text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Información del Graduado
              </h4>

              <div className="space-y-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start">
                  <span className="text-gray-600 sm:w-44 sm:flex-shrink-0">Nombre completo:</span>
                  <span className="font-semibold text-gray-900 break-words min-w-0 sm:flex-1">{certificado.fullName}</span>
                </div>

                <div className="flex flex-col gap-1 sm:flex-row sm:items-start">
                  <span className="text-gray-600 sm:w-44 sm:flex-shrink-0">Identificación:</span>
                  <span className="font-semibold text-gray-900 break-words min-w-0 sm:flex-1">{certificado.idNumber}</span>
                </div>

                <div className="flex flex-col gap-1 sm:flex-row sm:items-start">
                  <span className="text-gray-600 sm:w-44 sm:flex-shrink-0">Programa:</span>
                  <span className="font-semibold text-gray-900 break-words min-w-0 sm:flex-1">{certificado.programName}</span>
                </div>

                <div className="flex flex-col gap-1 sm:flex-row sm:items-start">
                  <span className="text-gray-600 sm:w-44 sm:flex-shrink-0">Tipo:</span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold self-start">
                    <GraduationCap className="w-4 h-4" />
                    {certificado.programType}
                  </span>
                </div>

                <div className="flex flex-col gap-1 sm:flex-row sm:items-start">
                  <span className="text-gray-600 sm:w-44 sm:flex-shrink-0">Título obtenido:</span>
                  <span className="font-semibold text-gray-900 break-words min-w-0 sm:flex-1">{certificado.degreeTitle}</span>
                </div>

                <div className="flex flex-col gap-1 sm:flex-row sm:items-start">
                  <span className="text-gray-600 sm:w-44 sm:flex-shrink-0">Fecha de grado:</span>
                  <span className="font-semibold text-gray-900 break-words min-w-0 sm:flex-1">
                    {formatearFecha(certificado.graduationDate)}
                  </span>
                </div>

                {certificado.campus && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start">
                    <span className="text-gray-600 sm:w-44 sm:flex-shrink-0">Sede:</span>
                    <span className="font-semibold text-gray-900 break-words min-w-0 sm:flex-1">{certificado.campus}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-bold text-base sm:text-lg text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Información del Certificado
              </h4>

              <div className="space-y-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start">
                  <span className="text-gray-600 sm:w-44 sm:flex-shrink-0">Número de certificado:</span>
                  <span className="font-mono font-semibold text-blue-600 text-xs sm:text-sm break-all min-w-0 sm:flex-1">
                    {certificado.certificateNumber}
                  </span>
                </div>

                <div className="flex flex-col gap-1 sm:flex-row sm:items-start">
                  <span className="text-gray-600 sm:w-44 sm:flex-shrink-0">Código de verificación:</span>
                  <span className="font-mono text-xs sm:text-sm text-gray-700 break-all min-w-0 sm:flex-1">
                    {certificado.verificationCode}
                  </span>
                </div>

                {certificado.actaNumber && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start">
                    <span className="text-gray-600 sm:w-44 sm:flex-shrink-0">Registro/Folio/Libro:</span>
                    <span className="font-semibold text-gray-900 break-words min-w-0 sm:flex-1">{certificado.actaNumber}</span>
                  </div>
                )}

                <div className="flex flex-col gap-1 sm:flex-row sm:items-start">
                  <span className="text-gray-600 sm:w-44 sm:flex-shrink-0">Fecha de emisión:</span>
                  <span className="font-semibold text-gray-900 break-words min-w-0 sm:flex-1">
                    {formatearFecha(certificado.issueDate)}
                  </span>
                </div>

                <div className="flex flex-col gap-1 sm:flex-row sm:items-start">
                  <span className="text-gray-600 sm:w-44 sm:flex-shrink-0">Estado:</span>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold self-start ${
                    certificado.status === 'VALID'
                      ? 'bg-green-100 text-green-700'
                      : certificado.status === 'REVOKED'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    <ShieldCheck className="w-4 h-4" />
                    {certificado.status === 'VALID' && 'Válido'}
                    {certificado.status === 'REVOKED' && 'Revocado'}
                    {certificado.status === 'EXPIRED' && 'Expirado'}
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Certificado revocado */}
        {certificado && resultado.resultado === 'REVOKED' && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-red-900 mb-2">Certificado Revocado</h4>
                <p className="text-sm text-red-800 mb-2">
                  Este certificado ha sido revocado y no tiene validez legal.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Botón nueva validación */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleNuevaValidacion}
            variant="outline"
            className="w-full sm:flex-1"
          >
            Nueva Validación
          </Button>
        </div>
      </motion.div>
    );
  };

  // ========================================
  // RENDER PRINCIPAL
  // ========================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 py-8 sm:py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-green-100 rounded-full mb-4">
            <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-green-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Validación de Certificados de Graduados
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Verifica la autenticidad de un certificado de graduado de la ESAP
          </p>
        </div>

        {/* Formulario de validación */}
        <div className="bg-white rounded-xl shadow-lg p-5 sm:p-8 mb-6">
          <AnimatePresence mode="wait">
            {!mostrarResultado ? (
              <motion.div
                key="formulario"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Selector de modo */}
                <div>
                  <Label className="mb-3 block">Selecciona el método de validación</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => setModoValidacion('codigo')}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        modoValidacion === 'codigo'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <QrCode className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                      <p className="text-sm font-semibold">Código QR</p>
                    </button>

                    <button
                      onClick={() => setModoValidacion('numero')}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        modoValidacion === 'numero'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <FileText className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                      <p className="text-sm font-semibold">No. Certificado</p>
                    </button>
                  </div>
                </div>

                {/* Input según modo */}
                {modoValidacion === 'codigo' && (
                  <div>
                    <Label htmlFor="codigoVerificacion">Código de Verificación</Label>
                    <Input
                      id="codigoVerificacion"
                      type="text"
                      placeholder="Ej: QR-GR-2025-0001-abc123def4"
                      value={codigoVerificacion}
                      onChange={(e) => setCodigoVerificacion(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Ingresa el código que aparece en el certificado o escanea el código QR
                    </p>
                  </div>
                )}

                {modoValidacion === 'numero' && (
                  <div>
                    <Label htmlFor="numeroCertificado">Número de Certificado</Label>
                    <Input
                      id="numeroCertificado"
                      type="text"
                      placeholder="Ej: CERT-GR-2025-0001"
                      value={numeroCertificado}
                      onChange={(e) => setNumeroCertificado(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Ingresa el número que aparece en el certificado
                    </p>
                  </div>
                )}

                {/* Botones */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={onVolver}
                    className="w-full sm:flex-1"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver
                  </Button>

                  <Button
                    onClick={
                      modoValidacion === 'codigo'
                        ? handleValidarPorCodigo
                        : handleValidarPorNumero
                    }
                    disabled={
                      cargando ||
                      (modoValidacion === 'codigo' && !codigoVerificacion) ||
                      (modoValidacion === 'numero' && !numeroCertificado)
                    }
                    className="w-full sm:flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {cargando ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Validando...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Validar
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            ) : (
              renderResultado()
            )}
          </AnimatePresence>
        </div>

        {/* Información adicional */}
        {!mostrarResultado && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
            <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              ¿Qué puedes validar?
            </h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Autenticidad del certificado de graduado</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Información académica del graduado</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Estado actual del certificado (válido, revocado, expirado)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Fecha de emisión y vigencia</span>
              </li>
            </ul>
          </div>
        )}

        {/* Botón volver cuando hay resultado */}
        {mostrarResultado && (
          <div className="mt-6">
            <Button
              variant="outline"
              onClick={onVolver}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
