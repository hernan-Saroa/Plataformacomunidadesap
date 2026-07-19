import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useEffect, useId, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  GraduationCap,
  Loader2,
  QrCode,
  RotateCcw,
  Search,
  Shield,
  X,
  XCircle,
} from 'lucide-react';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { Card, CardContent } from '@esap-mfe/shared-ui/card';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@esap-mfe/shared-ui/dialog';
import { Input } from '@esap-mfe/shared-ui/input';
import { toast } from 'sonner';
import graduadosService, {
  CertificadoGraduado,
  ValidacionPublicaResponse,
} from '../../../services/api/graduados.service';

interface ValidarCertificadoGradoProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
}

type EstadoCertificadoVista = 'VIGENTE' | 'REVOCADO' | 'ANULADO';

interface CertificadoVista {
  estado: EstadoCertificadoVista;
  numeroCertificado: string;
  codigoVerificacion: string;
  nombreGraduado: string;
  documento: string;
  programa: string;
  titulo: string;
  territorial: string;
  fechaGrado: string;
  acta: string;
  diploma: string;
  fechaEmision: string;
}

function DetalleCertificado({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={mono ? 'break-all font-mono text-sm text-slate-900' : 'text-sm font-medium text-slate-900'}>
        {value}
      </p>
    </div>
  );
}

const formatDateOnly = (value?: string) => {
  if (!value) {
    return 'No disponible';
  }

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
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const normalizeLookupValue = (rawValue: string) => {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return '';
  }

  try {
    const url = new URL(trimmed);
    const codeFromQuery =
      url.searchParams.get('verificationCode') ||
      url.searchParams.get('code') ||
      url.searchParams.get('qr');

    if (codeFromQuery) {
      return decodeURIComponent(codeFromQuery);
    }

    const segments = url.pathname.split('/').filter(Boolean);
    const verifyIndex = segments.findIndex(
      (segment) => segment.toLowerCase() === 'verificar-certificado',
    );

    if (verifyIndex >= 0 && segments[verifyIndex + 1]) {
      return decodeURIComponent(segments[verifyIndex + 1]);
    }
  } catch {
    return trimmed;
  }

  return trimmed;
};

const isCertificateNumber = (value: string) => {
  const normalized = value.trim().toUpperCase();
  return /^CERT-GR-\d{4}-\d{4}$/i.test(normalized) || normalized.startsWith('CERT-GR-');
};

const mapEstadoCertificado = (
  responseResult?: ValidacionPublicaResponse['resultado'],
  certificateStatus?: CertificadoGraduado['status'],
): EstadoCertificadoVista => {
  if (responseResult === 'REVOKED' || certificateStatus === 'REVOKED') {
    return 'REVOCADO';
  }

  if (responseResult === 'EXPIRED' || certificateStatus === 'EXPIRED') {
    return 'ANULADO';
  }

  return 'VIGENTE';
};

const mapCertificado = (
  certificado: CertificadoGraduado,
  responseResult?: ValidacionPublicaResponse['resultado'],
): CertificadoVista => ({
  estado: mapEstadoCertificado(responseResult, certificado.status),
  numeroCertificado: certificado.certificateNumber,
  codigoVerificacion: certificado.verificationCode,
  nombreGraduado: certificado.fullName,
  documento: certificado.idNumber,
  programa: certificado.programName,
  titulo: certificado.degreeTitle || certificado.programType || 'No especificado',
  territorial: certificado.seccionalName || certificado.campus || 'No especificado',
  fechaGrado: formatDateOnly(certificado.graduationDate),
  acta: certificado.actaNumber || 'No especificado',
  diploma: certificado.diplomaNumber || 'No especificado',
  fechaEmision: formatDateOnly(certificado.issueDate),
});

const statusMetaByResult: Record<
  ValidacionPublicaResponse['resultado'],
  {
    badgeClassName: string;
    cardClassName: string;
    iconClassName: string;
    title: string;
  }
> = {
  VALID: {
    badgeClassName: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    cardClassName: 'border-emerald-200 bg-emerald-50/70',
    iconClassName: 'text-emerald-600',
    title: 'Certificado válido',
  },
  REVOKED: {
    badgeClassName: 'border-red-200 bg-red-50 text-red-700',
    cardClassName: 'border-red-200 bg-red-50/70',
    iconClassName: 'text-red-600',
    title: 'Certificado revocado',
  },
  EXPIRED: {
    badgeClassName: 'border-amber-200 bg-amber-50 text-amber-700',
    cardClassName: 'border-amber-200 bg-amber-50/70',
    iconClassName: 'text-amber-600',
    title: 'Certificado anulado o expirado',
  },
  NOT_FOUND: {
    badgeClassName: 'border-slate-200 bg-slate-50 text-slate-700',
    cardClassName: 'border-slate-200 bg-slate-50',
    iconClassName: 'text-slate-600',
    title: 'Certificado no encontrado',
  },
};

export function ValidarCertificadoGrado({
  isOpen,
  onClose,
  onBack,
}: ValidarCertificadoGradoProps) {
  const descriptionId = useId();
  const [lookupValue, setLookupValue] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [response, setResponse] = useState<ValidacionPublicaResponse | null>(null);

  const isLandingMode = Boolean(onBack);

  const certificado = useMemo(
    () => (response?.certificado ? mapCertificado(response.certificado, response.resultado) : null),
    [response],
  );

  useEffect(() => {
    if (!isOpen) {
      setLookupValue('');
      setResponse(null);
      setIsValidating(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setLookupValue('');
    setResponse(null);
    setIsValidating(false);
    onClose();
  };

  const handleBack = () => {
    setLookupValue('');
    setResponse(null);
    setIsValidating(false);
    onBack?.();
  };

  const handleValidar = async () => {
    const normalizedValue = normalizeLookupValue(lookupValue);

    if (!normalizedValue) {
      toast.error('Ingrese un código QR, enlace o número de certificado.');
      return;
    }

    setIsValidating(true);
    setResponse(null);

    try {
      const validationResponse = isCertificateNumber(normalizedValue)
        ? await graduadosService.validacion.validarPorNumero(normalizedValue.toUpperCase())
        : await graduadosService.validacion.validarQR(normalizedValue);

      setResponse(validationResponse);

      if (validationResponse.valido) {
        toast.success('Certificado de grado validado correctamente.');
      } else {
        toast.error(validationResponse.mensaje || 'No fue posible validar el certificado.');
      }
    } catch (error) {
      console.error('Error al validar certificado de grado:', error);
      setResponse({
        valido: false,
        mensaje: 'Se presentó un error al consultar la validación del certificado.',
        resultado: 'NOT_FOUND',
      });
      toast.error('Error al validar el certificado. Intente nuevamente.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleReset = () => {
    setLookupValue('');
    setResponse(null);
  };

  const statusMeta = response ? statusMetaByResult[response.resultado] : null;
  const modalMaxHeight = 'min(calc(100dvh - 2rem), 720px)';

  const renderLookupForm = (mode: 'modal' | 'landing') => (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <label
          htmlFor="grado-certificate-lookup"
          className={`block font-semibold ${
            mode === 'landing' ? 'mb-2 sm:mb-3 text-sm sm:text-base' : 'mb-2 text-sm'
          } text-slate-900`}
        >
          Código QR, enlace de verificación o número de certificado
        </label>

        <div className="relative">
          <QrCode
            className={`pointer-events-none absolute left-3 ${
              mode === 'landing' ? 'sm:left-4' : ''
            } top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400`}
          />
          <Input
            id="grado-certificate-lookup"
            type="text"
            value={lookupValue}
            onChange={(event) => setLookupValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !isValidating) {
                event.preventDefault();
                void handleValidar();
              }
            }}
            placeholder="Ej: QR-GR-2026-0040-abc123def4 o CERT-GR-2026-0040"
            className={`bg-white ${
              mode === 'landing'
                ? 'h-12 sm:h-14 pl-10 sm:pl-12 rounded-xl border-2 border-slate-200 bg-slate-50 shadow-sm shadow-slate-200/80 focus-visible:bg-white'
                : 'h-12 pl-10 rounded-xl border border-slate-200 bg-slate-50 shadow-sm shadow-slate-200/70 focus-visible:bg-white'
            }`}
            disabled={isValidating}
          />
        </div>

        <p className={`mt-2 text-sm ${mode === 'landing' ? '' : 'text-slate-600'}`} style={{ color: '#6B7280' }}>
          Si copiaste el enlace completo del QR, el sistema extrae automáticamente el código de
          validación.
        </p>
      </div>

      {!response ? (
        <Card
          className={`shadow-none ${
            mode === 'landing'
              ? 'rounded-xl border-2 border-blue-200 bg-blue-50'
              : 'border-blue-200 bg-blue-50/70'
          }`}
        >
          <CardContent className={mode === 'landing' ? 'pt-4 sm:pt-5' : 'pt-4'}>
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 text-[#003DA5]" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">Sistema de verificación seguro</p>
                <p className="text-sm text-slate-600">
                  Todos los certificados de grado emitidos por la ESAP incluyen un código QR único y
                  un número de certificado irrepetible para validar su autenticidad en tiempo real.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className={`flex gap-3 ${mode === 'landing' ? 'flex-col' : 'flex-col sm:flex-row'}`}>
        <Button
          type="button"
          onClick={() => void handleValidar()}
          disabled={isValidating || !lookupValue.trim()}
          className={
            mode === 'landing'
              ? 'h-12 w-full text-base font-semibold'
              : 'sm:min-w-[220px]'
          }
        >
          {isValidating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Validando...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Verificar certificado
            </>
          )}
        </Button>

        {response ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className={mode === 'landing' ? 'h-12 w-full text-base font-semibold' : undefined}
          >
            <RotateCcw className="h-4 w-4" />
            Validar otro certificado
          </Button>
        ) : null}
      </div>
    </div>
  );

  const renderResults = () => {
    if (!response || !statusMeta) {
      return null;
    }

    return (
      <div className="space-y-4 pt-6">
        <Card className={`${statusMeta.cardClassName} shadow-none`}>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                {response.resultado === 'VALID' ? (
                  <CheckCircle2 className={`mt-0.5 h-6 w-6 ${statusMeta.iconClassName}`} />
                ) : (
                  <XCircle className={`mt-0.5 h-6 w-6 ${statusMeta.iconClassName}`} />
                )}
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-slate-900">{statusMeta.title}</p>
                  <p className="text-sm text-slate-700">
                    {response.mensaje || 'No fue posible obtener el estado del certificado.'}
                  </p>
                </div>
              </div>

              <Badge variant="outline" className={statusMeta.badgeClassName}>
                {certificado?.estado || 'SIN ESTADO'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {certificado ? (
          <>
            <Card className="border-slate-200 shadow-none">
              <CardContent className="space-y-5 pt-6">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-[#003DA5]" />
                  <p className="text-base font-semibold text-slate-900">Información del certificado</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <DetalleCertificado label="Número de certificado" value={certificado.numeroCertificado} mono />
                  <DetalleCertificado label="Código de verificación" value={certificado.codigoVerificacion} mono />
                  <DetalleCertificado label="Graduado" value={certificado.nombreGraduado} />
                  <DetalleCertificado label="Documento" value={certificado.documento} />
                  <DetalleCertificado label="Programa académico" value={certificado.programa} />
                  <DetalleCertificado label="Título otorgado" value={certificado.titulo} />
                  <DetalleCertificado label="Territorial / campus" value={certificado.territorial} />
                  <DetalleCertificado label="Acta" value={certificado.acta} />
                  <DetalleCertificado label="Fecha de grado" value={certificado.fechaGrado} />
                  <DetalleCertificado label="Fecha de emisión" value={certificado.fechaEmision} />
                  <DetalleCertificado label="Diploma" value={certificado.diploma} />
                  <DetalleCertificado label="Estado" value={certificado.estado} />
                </div>
              </CardContent>
            </Card>

            {certificado.estado !== 'VIGENTE' ? (
              <Card className="border-amber-200 bg-amber-50/70 shadow-none">
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-amber-900">
                        Este certificado no se encuentra vigente
                      </p>
                      <p className="text-sm text-amber-800">
                        Verifique con el equipo de Verificación de títulos antes de usar este documento como soporte
                        oficial.
                      </p>
                    </div>
                  </div>

                </CardContent>
              </Card>
            ) : null}
          </>
        ) : (
          <Card className="border-slate-200 shadow-none">
            <CardContent className="flex items-start gap-3 pt-6">
              <FileText className="mt-0.5 h-5 w-5 text-slate-500" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">
                  No se encontró información del certificado
                </p>
                <p className="text-sm text-slate-600">
                  Revise el código ingresado o intente con el número del certificado en el formato
                  `CERT-GR-AAAA-0000`.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  if (isLandingMode) {
    if (!isOpen) {
      return null;
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F0F6FF] to-[#E0EEFF] py-6 sm:py-12 px-3 sm:px-4">
        <nav className="fixed top-2 sm:top-4 left-1/2 z-[200] w-[95%] max-w-6xl -translate-x-1/2">
          <div
            className="rounded-xl sm:rounded-2xl border border-blue-400/30 bg-[#1e5da8] px-3 py-2.5 shadow-2xl backdrop-blur-xl sm:px-6 sm:py-3"
            style={{
              boxShadow:
                '0 10px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Validador de Certificados</p>
                  <p className="text-[10px] font-medium text-white/70">Certificados de Grado</p>
                </div>
              </div>

              <button
                onClick={handleBack}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#003DA5] shadow-lg transition-all duration-300 hover:scale-105 hover:bg-blue-50 sm:min-h-[44px] sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Volver</span>
              </button>
            </div>
          </div>
        </nav>

        <div className="mx-auto max-w-4xl pt-16 sm:pt-20">
          <div className="mb-6 text-center sm:mb-8">
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl sm:mb-6 sm:h-20 sm:w-20 sm:rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                boxShadow: '0 8px 24px rgba(0, 61, 165, 0.25)',
              }}
            >
              <QrCode className="h-8 w-8 text-white sm:h-10 sm:w-10" strokeWidth={2.5} />
            </div>

            <h1
              className="mb-2 px-4 text-2xl font-bold sm:mb-3 sm:text-3xl lg:text-4xl"
              style={{
                lineHeight: '1.2',
                letterSpacing: '-0.5px',
                color: '#1F2937',
              }}
            >
              Validar Certificado de Grado
            </h1>

            <p
              className="mx-auto max-w-2xl px-4 text-sm font-normal sm:text-base"
              style={{
                lineHeight: '1.5',
                color: '#6B7280',
              }}
            >
              Verifique la autenticidad de un certificado académico emitido por la ESAP mediante el
              código QR, el enlace del QR o el consecutivo.
            </p>
          </div>

          <Card className="rounded-xl border-2 border-[#E5E7EB] bg-white p-4 shadow-xl sm:rounded-2xl sm:p-6 lg:p-8">
            <CardContent className="space-y-0 p-0">
              {renderLookupForm('landing')}
              {renderResults()}
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
            <Card className="inline-flex items-center gap-2 border-2 bg-white/80 px-6 py-3 backdrop-blur-sm">
              <Shield className="h-5 w-5 text-[#003DA5]" />
              <span className="font-medium text-slate-900">
                Sistema oficial de validación - Escuela Superior de Administración Pública
              </span>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogPortal>
        <DialogOverlay />

        <div className="pointer-events-none fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto p-2 py-4 sm:items-center sm:p-4">
          <DialogPrimitive.Content
            aria-describedby={descriptionId}
            className="pointer-events-auto flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl focus:outline-none"
            style={{
              width: 'min(calc(100vw - 1rem), 560px)',
              maxWidth: '560px',
              maxHeight: modalMaxHeight,
            }}
          >
            <DialogHeader className="relative shrink-0 border-b bg-slate-50 px-4 py-4 text-left sm:px-5 sm:py-4">
              <button
                type="button"
                onClick={handleClose}
                className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-start gap-3 pr-10">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#003DA5] text-white shadow-sm">
                  <QrCode className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <DialogTitle className="text-xl text-slate-900">
                    Validación de certificados de grado
                  </DialogTitle>
                  <DialogDescription id={descriptionId} className="max-w-2xl text-sm text-slate-600">
                    Verifique certificados académicos y títulos emitidos por el equipo de Verificación de títulos mediante el
                    código QR, el enlace del QR o el número del certificado.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3.5 sm:px-5 sm:py-4">
              <div className="space-y-4">
                <Card className="border-blue-200 bg-blue-50/70 shadow-none">
                  <CardContent className="pt-4 sm:pt-4">
                    {renderLookupForm('modal')}
                  </CardContent>
                </Card>

                {renderResults()}
              </div>
            </div>

            <DialogFooter className="shrink-0 flex-col-reverse gap-2 border-t bg-slate-50 px-4 py-3 sm:flex-row sm:justify-between sm:px-5 sm:py-3.5">
              <div className="flex flex-col gap-2 sm:flex-row">
                {onBack ? (
                  <Button type="button" variant="outline" onClick={handleBack} className="w-full sm:w-auto">
                    Volver
                  </Button>
                ) : null}
              </div>
              <Button type="button" variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                Cerrar
              </Button>
            </DialogFooter>
          </DialogPrimitive.Content>
        </div>
      </DialogPortal>
    </Dialog>
  );
}
