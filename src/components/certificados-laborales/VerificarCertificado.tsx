/**
 * Página Pública de Verificación de Certificados Laborales
 * Permite verificar la autenticidad de certificados mediante código QR o consecutivo
 * Registra cada verificación en la base de datos
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { certificadosService } from '../../services/api/certificados.service';

export function VerificarCertificado() {
  const { codigo } = useParams<{ codigo?: string }>();
  const navigate = useNavigate();
  const [isValidating, setIsValidating] = useState(true);
  const [certificado, setCertificado] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    html.style.overflow = prevHtmlOverflow || 'auto';
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  // Verificar automáticamente cuando se carga el componente
  useEffect(() => {
    const verificarCertificado = async () => {
      if (!codigo) {
        setError('No se proporcionó un código de verificación');
        setIsValidating(false);
        return;
      }

      console.log('🔍 Verificando certificado con código:', codigo);
      setIsValidating(true);
      setError(null);
      const codigoNormalizado = codigo.trim().toUpperCase();

      try {
        // Llamar al endpoint que registra la verificación
        const response = await certificadosService.validacion.verificarCertificadoLaboral(codigoNormalizado);
        const responseMessage = typeof response?.message === 'string' ? response.message : '';
        const isNotFoundMessage = responseMessage.toLowerCase().includes('no encontrado');
        const hasCertificateData = Boolean(
          response?.verification_code ||
            response?.certificate_number ||
            response?.full_name,
        );
        const hasErrorResponse =
          response?.statusCode >= 400 ||
          response?.error ||
          isNotFoundMessage ||
          !hasCertificateData;

        if (hasErrorResponse) {
          const message =
            responseMessage ||
            'No se pudo verificar el certificado';
          setError(message);
          setCertificado(null);
          toast.error('Error de verificacion', {
            description: 'El certificado no existe o el codigo es invalido'
          });
          return;
        }

        console.log('✅ Certificado verificado - Response completo:', response);
        console.log('📊 Datos del certificado:', {
          nombre: response.full_name,
          documento: response.id_number,
          cargo: response.position_category,
          vinculacion: response.career_category,
          departamento: response.department,
          fecha_vinculacion: response.hiring_date,
          status: response.status
        });

        setCertificado(response);
        toast.success('Certificado verificado exitosamente', {
          description: 'La verificación ha sido registrada en el sistema'
        });
      } catch (err: any) {
        console.error('❌ Error al verificar certificado:', err);
        console.error('❌ Detalles del error:', {
          message: err.message,
          response: err.response,
          data: err.response?.data
        });
        setError(err.response?.data?.message || err.message || 'No se pudo verificar el certificado');
        setCertificado(null);
        toast.error('Error de verificación', {
          description: 'El certificado no existe o el código es inválido'
        });
      } finally {
        setIsValidating(false);
      }
    };

    verificarCertificado();
  }, [codigo]);

  const handleVolverAlInicio = () => {
    navigate('/');
  };

  const parseDateOnly = (fechaStr: string) => {
    if (!fechaStr) return null;
    const isoMatch = fechaStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]) - 1;
      const day = Number(isoMatch[3]);
      return new Date(year, month, day, 12, 0, 0);
    }
    const parsed = new Date(fechaStr);
    if (isNaN(parsed.getTime())) return null;
    return parsed;
  };

  const normalizarCodigo = (value?: string | number | null) => {
    if (value === null || value === undefined) return '';
    const raw = String(value).trim();
    if (!raw) return '';
    const digits = raw.replace(/\D+/g, '');
    return digits || raw.replace(/\s+/g, '');
  };

  const esCodigoCero = (value: string) => Boolean(value) && /^0+$/.test(value);

  const construirCargoVariable = (
    careerCategory?: string | null,
    codCargo?: string | number | null,
    codGrade?: string | number | null,
  ) => {
    const careerRaw = String(careerCategory || '').replace(/\s+/g, ' ').trim();
    const codCargoRaw = normalizarCodigo(codCargo);
    const codGradeRaw = normalizarCodigo(codGrade);

    const esNoDefinido = /no\s+definido/i.test(careerRaw);
    const cargoEsCero = esCodigoCero(codCargoRaw);
    const gradoEsCero = esCodigoCero(codGradeRaw);

    if (esNoDefinido && cargoEsCero && gradoEsCero) {
      return 'No Definido';
    }

    const hasLeadingCode = /^\d+\s+/.test(careerRaw);
    let baseText = careerRaw;
    if (hasLeadingCode) {
      baseText = careerRaw.replace(/^\d+\s+/, '').trim();
    }
    if (/grado/i.test(baseText)) {
      const antesGrado = baseText.split(/grado/i)[0].trim();
      if (antesGrado) {
        baseText = antesGrado;
      }
    }
    if (!baseText) {
      baseText = careerRaw;
    }

    let cargoCode = codCargoRaw;
    if (cargoCode.length > 4) {
      cargoCode = cargoCode.slice(0, 4);
    }

    const parts: string[] = [];
    if (baseText) parts.push(baseText);
    if (cargoCode) parts.push(cargoCode);
    if (!hasLeadingCode && (codGradeRaw || gradoEsCero)) {
      parts.push(`Grado ${codGradeRaw || '0'}`);
    }

    return parts.join(' ').replace(/\s+/g, ' ').trim();
  };

  const formatearFecha = (fechaStr: string) => {
    try {
      const fecha = parseDateOnly(fechaStr);
      if (!fecha) return 'Fecha no disponible';
      return fecha.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return 'Fecha no disponible';
    }
  };

  const getEstadoBadge = (estado: string) => {
    const config = {
      VALID: {
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: <CheckCircle className="w-4 h-4" />,
        label: 'Certificado Válido'
      },
      REVOKED: {
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: <XCircle className="w-4 h-4" />,
        label: 'Certificado Revocado'
      },
      EXPIRED: {
        color: 'bg-gray-100 text-gray-800 border-gray-300',
        icon: <AlertCircle className="w-4 h-4" />,
        label: 'Certificado Expirado'
      }
    };
    const estilo = config[estado as keyof typeof config] || config.VALID;
    return (
      <Badge className={`${estilo.color} border-2 px-4 py-2 text-base font-semibold flex items-center gap-2`}>
        {estilo.icon}
        {estilo.label}
      </Badge>
    );
  };

  const cargoCalculado = certificado
    ? construirCargoVariable(
        certificado?.career_category || certificado?.careerCategory || certificado?.career_category_name || certificado?.position_category || certificado?.positionCategory || certificado?.cargo,
        certificado?.cod_cargo || certificado?.codCargo || certificado?.request?.cod_cargo || certificado?.request?.codCargo,
        certificado?.cod_grade || certificado?.codGrade || certificado?.request?.cod_grade || certificado?.request?.codGrade,
      )
    : '';
  const tipoVinculacion = certificado?.position_category || certificado?.positionCategory || certificado?.tipo_vinculacion || '';
  const dependenciaMostrar =
    certificado?.department ||
    certificado?.request?.department ||
    certificado?.request?.departmentName ||
    certificado?.position_location ||
    certificado?.positionLocation ||
    '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Shield className="w-12 h-12 text-white" strokeWidth={2} />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Verificación de Certificados Laborales ESAP
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Verifica la autenticidad de certificados laborales mediante el código de verificación
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-24">
        {isValidating ? (
          /* Estado de Carga - Verificando */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="p-12 shadow-2xl">
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  className="inline-block mb-6"
                >
                  <Shield className="w-20 h-20 text-[#003DA5]" strokeWidth={2} />
                </motion.div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">
                  Verificando Certificado...
                </h2>
                <p className="text-lg text-gray-600">
                  Estamos validando la autenticidad del certificado
                </p>
                <div className="mt-6 flex items-center justify-center gap-2">
                  <div className="w-3 h-3 bg-[#003DA5] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-3 h-3 bg-[#003DA5] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-3 h-3 bg-[#003DA5] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </Card>
          </motion.div>
        ) : error ? (
          /* Error de Verificación */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="p-8 shadow-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-white">
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="inline-block mb-4"
                >
                  <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="w-16 h-16 text-red-600" strokeWidth={2.5} />
                  </div>
                </motion.div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Certificado No Encontrado
                </h2>
                <p className="text-gray-600 mb-6">
                  {error}
                </p>
                <Button
                  onClick={handleVolverAlInicio}
                  size="lg"
                  className="bg-[#003DA5] hover:bg-[#002873] text-white"
                >
                  Volver al Inicio
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : certificado && (
          /* Resultado de la Verificación */
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
                  ✅ Certificado Verificado
                </h2>
                <p className="text-gray-600 mb-4">
                  Este certificado laboral es auténtico y fue emitido por la ESAP
                </p>
                {getEstadoBadge(certificado.status)}
              </div>
            </Card>

            {/* Información del Empleado */}
            <Card className="p-8 shadow-xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <User className="w-7 h-7 text-[#003DA5]" />
                Información del Empleado
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Nombre Completo
                  </label>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {certificado.full_name}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Documento de Identidad
                  </label>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {certificado.id_number}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Cargo
                  </label>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {cargoCalculado || certificado.position_category}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Tipo de Vinculación
                  </label>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {tipoVinculacion || 'No especificado'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Dependencia
                  </label>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {dependenciaMostrar || 'No especificado'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Fecha de Vinculación
                  </label>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {formatearFecha(certificado.hiring_date)}
                  </p>
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
                    {certificado.certificate_number}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Fecha de Emisión
                  </label>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {formatearFecha(certificado.issuance_timestamp)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Firmante
                  </label>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {certificado.signer_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {certificado.signer_position}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Código de Verificación
                  </label>
                  <p className="text-sm font-mono text-gray-600 mt-1 break-all">
                    {certificado.verification_code}
                  </p>
                </div>
              </div>
            </Card>

            {/* Botón para volver al inicio */}
            <Button
              onClick={handleVolverAlInicio}
              variant="outline"
              size="lg"
              className="w-full border-2 border-[#003DA5] text-[#003DA5] hover:bg-blue-50"
            >
              Volver al Inicio
            </Button>

            {/* Footer Info */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">
                    ✓ Verificación Registrada
                  </h4>
                  <p className="text-sm text-blue-800">
                    Esta verificación ha sido registrada en el sistema de auditoría de la ESAP con fecha {new Date().toLocaleString('es-CO')}.
                    El certificado cuenta con firma electrónica y es válido para todos los efectos legales.
                  </p>
                </div>
              </div>
            </div>

            <div className="h-16 sm:h-24" />
          </motion.div>
        )}
      </div>
    </div>
  );
}
