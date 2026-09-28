import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, KeySquare, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { buildApiUrl, CORS_CONFIG, getDefaultHeaders } from '../../../config/environment';
import { Modal } from './Modal';
import { Boton, BotonSecundario } from './PiezasPanel';
import { EvidenciaFirmaOtp } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onFirmado: (evidencia: EvidenciaFirmaOtp) => void;
  /** Qué se está firmando, para el correo y para la pantalla. */
  accionDetalle: string;
}

type Paso = 'enviando' | 'ingresando' | 'verificando' | 'error';

const construirUrlAuth = (ruta: string) => buildApiUrl('auth', `/api/v1${ruta}`);

const leerJson = async <T,>(res: Response): Promise<T | null> => {
  const texto = await res.text();
  if (!texto) return null;
  try {
    return JSON.parse(texto) as T;
  } catch {
    return { message: texto } as T;
  }
};

const datos = <T,>(payload: (T & { data?: T }) | null): T | null =>
  payload ? (payload.data ?? payload) : null;

const mensajeDeError = (cuerpo: any, defecto: string) => {
  const mensaje = cuerpo?.message ?? cuerpo?.error;
  return Array.isArray(mensaje) ? mensaje.join(', ') : (mensaje ?? defecto);
};

/**
 * Firma de la actividad con el token institucional (EFDS-2070).
 *
 * El código OTP lo genera y lo valida el auth-service —ahí vive el correo de
 * cada cuenta y el token de un solo uso—, no este módulo: Contratación solo
 * pide el código, lo deja escribir y reenvía el comprobante que el
 * auth-service devuelve al verificarlo. Es el mismo flujo que ya usa Control
 * Interno en `ModalFirmaOTP`, contra el mismo endpoint.
 */
export function FirmaOtpModal({ isOpen, onClose, onFirmado, accionDetalle }: Props) {
  const [paso, setPaso] = useState<Paso>('enviando');
  const [codigo, setCodigo] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [restanteSeg, setRestanteSeg] = useState(300);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const enviarOtp = async () => {
    setPaso('enviando');
    setCodigo(['', '', '', '', '', '']);
    setError(null);

    try {
      const res = await fetch(construirUrlAuth('/signature-otp/request'), {
        method: 'POST',
        ...CORS_CONFIG,
        headers: getDefaultHeaders(),
        body: JSON.stringify({ actionDetail: accionDetalle }),
      });
      const cuerpo = await leerJson<{ message?: string; error?: string }>(res);
      if (!res.ok) throw new Error(mensajeDeError(cuerpo, `Error ${res.status}`));

      const respuesta = datos<{ email?: string; expiresInSeconds?: number }>(cuerpo as any);
      setEmail(respuesta?.email ?? null);
      setRestanteSeg(respuesta?.expiresInSeconds ?? 300);
      setPaso('ingresando');
      toast.success('Código enviado', {
        description: respuesta?.email
          ? `Se envió un código de 6 dígitos a ${respuesta.email}`
          : 'Se envió el código a tu correo institucional.',
      });
      setTimeout(() => refs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message ?? 'No fue posible enviar el código OTP');
      setPaso('error');
    }
  };

  useEffect(() => {
    if (isOpen) enviarOtp();
    // Solo al abrir: reenviar es una acción explícita del usuario, no algo
    // que deba dispararse de nuevo por cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (paso !== 'ingresando' || restanteSeg <= 0) return;
    const id = setInterval(() => setRestanteSeg((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [paso, restanteSeg]);

  const verificar = async () => {
    const code = codigo.join('');
    if (code.length !== 6) return;
    setPaso('verificando');

    try {
      const res = await fetch(construirUrlAuth('/signature-otp/verify'), {
        method: 'POST',
        ...CORS_CONFIG,
        headers: getDefaultHeaders(),
        body: JSON.stringify({ code }),
      });
      const cuerpo = await leerJson<{ message?: string; error?: string }>(res);
      if (!res.ok) throw new Error(mensajeDeError(cuerpo, `Error ${res.status}`));

      const respuesta = datos<{ fechaFirma?: string; metodo?: 'OTP_EMAIL'; id?: string }>(
        cuerpo as any,
      );
      const evidencia: EvidenciaFirmaOtp = {
        id: respuesta?.id ?? `OTP-${Date.now().toString(36).toUpperCase()}`,
        fechaFirma: respuesta?.fechaFirma ?? new Date().toISOString(),
        metodo: 'OTP_EMAIL',
      };
      toast.success('Firma verificada', { description: 'Identidad validada correctamente.' });
      onFirmado(evidencia);
    } catch (err: any) {
      toast.error('Código incorrecto', { description: err.message ?? 'Vuelve a intentarlo.' });
      setCodigo(['', '', '', '', '', '']);
      setPaso('ingresando');
      refs.current[0]?.focus();
    }
  };

  const cambiarDigito = (i: number, valor: string) => {
    if (!/^\d*$/.test(valor)) return;
    const nuevo = [...codigo];
    nuevo[i] = valor.slice(-1);
    setCodigo(nuevo);
    if (valor && i < 5) refs.current[i + 1]?.focus();
  };

  const alPegar = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pegado = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const nuevo = pegado.split('').concat(Array(6 - pegado.length).fill(''));
    setCodigo(nuevo);
    refs.current[Math.min(pegado.length, 5)]?.focus();
  };

  const formatearTiempo = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Firma con el token institucional"
      description={accionDetalle}
      size="small"
      icon={<KeySquare className="w-4.5 h-4.5" />}
    >
      {(paso === 'enviando' || paso === 'error') && (
        <div className="flex flex-col items-center text-center py-6 gap-3">
          {paso === 'enviando' ? (
            <Loader2 className="w-8 h-8 text-[#003DA5] animate-spin" />
          ) : (
            <AlertCircle className="w-8 h-8 text-red-500" />
          )}
          <p className="text-[12.5px] font-bold text-slate-800 m-0">
            {paso === 'enviando' ? 'Enviando el código…' : 'No se pudo enviar el código'}
          </p>
          {paso === 'error' && (
            <>
              <p className="text-[11.5px] text-slate-500 m-0">{error}</p>
              <div className="flex gap-2 mt-2">
                <BotonSecundario icono={null} onClick={onClose}>
                  Cancelar
                </BotonSecundario>
                <Boton icono={<KeySquare className="w-3.5 h-3.5" />} onClick={enviarOtp}>
                  Reintentar
                </Boton>
              </div>
            </>
          )}
        </div>
      )}

      {(paso === 'ingresando' || paso === 'verificando') && (
        <div className="space-y-4">
          <p className="text-[12px] text-slate-600 m-0 leading-relaxed">
            Ingresa el código de 6 dígitos enviado a{' '}
            <span className="font-bold text-slate-800">{email ?? 'tu correo institucional'}</span>.
          </p>

          <div className="flex justify-center gap-2" onPaste={alPegar}>
            {codigo.map((d, i) => (
              <input
                key={i}
                ref={(el) => (refs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                disabled={paso === 'verificando'}
                onChange={(e) => cambiarDigito(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !codigo[i] && i > 0) refs.current[i - 1]?.focus();
                }}
                className={`w-10 h-12 text-center text-xl font-bold border-2 rounded-lg outline-none transition-colors ${
                  d
                    ? 'border-[#003DA5] bg-blue-50 text-[#003DA5]'
                    : 'border-gray-200 bg-gray-50 focus:border-[#003DA5]'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 bg-gray-50 rounded-lg px-3 py-2">
            <span>Expira en</span>
            <span className={restanteSeg < 60 ? 'text-red-600' : 'text-[#003DA5]'}>
              {formatearTiempo(restanteSeg)}
            </span>
          </div>

          <div className="flex gap-2">
            <BotonSecundario
              icono={null}
              onClick={enviarOtp}
              disabled={paso === 'verificando' || restanteSeg > 240}
            >
              Reenviar
            </BotonSecundario>
            <Boton
              icono={<ShieldCheck className="w-3.5 h-3.5" />}
              onClick={verificar}
              disabled={paso === 'verificando' || codigo.join('').length !== 6}
            >
              {paso === 'verificando' ? 'Verificando…' : 'Firmar'}
            </Boton>
          </div>
        </div>
      )}
    </Modal>
  );
}
