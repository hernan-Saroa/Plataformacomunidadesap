import React, { useEffect, useState } from 'react';
import { Check, CircleDollarSign, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { EstadoRegistroPresupuestal, EvidenciaFirmaOtp } from '../../types';
import {
  Aviso,
  Ayuda,
  Boton,
  campo,
  Marco,
  Pendiente,
  SelectorArchivo,
  Titulo,
} from '../shared/PiezasPanel';
import { fechaLarga, hoyEnBogota } from '../shared/fechas';
import { useFirma } from '../shared/useFirma';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const NUMERAL = '8.3';

const pesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** Los trámites de antes de la revisión de QA todavía pueden estar en estos. */
const ETIQUETA_ESTADO: Record<string, string> = {
  SOLICITADO: 'Solicitado antes del cambio: complétalo cargando el RP expedido',
  VERIFICADO: 'Verificado antes del cambio: complétalo cargando el RP expedido',
  EXPEDIDO: 'Cargado',
  RECHAZADO: 'Rechazado',
  ANULADO: 'Anulado',
};

/**
 * Actividad 8.3 · Registro presupuestal (EFDS-1163).
 *
 * Como el CDP desde la 103: la Dirección Financiera expide el RP por el canal
 * de siempre y aquí solo se carga el PDF con su número, valor, fecha y rubro
 * (revisión de QA, 2026-10-16). Ya no hay solicitud ni verificación dentro de
 * la plataforma.
 */
export function PanelRegistroPresupuestal({ procesoId, onCambio }: Props) {
  const firma = useFirma(NUMERAL, 'Cargar el registro presupuestal');
  const [estado, setEstado] = useState<EstadoRegistroPresupuestal | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [datos, setDatos] = useState({
    numero: '',
    valor: '',
    rubro: '',
    fechaExpedicion: hoyEnBogota(),
  });
  const [soporte, setSoporte] = useState<File | null>(null);

  const leer = () =>
    contratacionService
      .registroPresupuestal(procesoId)
      .then((respuesta) => {
        setEstado(respuesta);
        setError(null);
        // El valor del contrato como punto de partida: es lo que se compromete
        // casi siempre, y corregirlo es más rápido que escribirlo.
        if (respuesta.contrato) {
          setDatos((p) => (p.valor ? p : { ...p, valor: String(respuesta.contrato!.valor) }));
        }
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));

  useEffect(() => {
    setCargando(true);
    leer();
  }, [procesoId]);

  const cargar = async (firmaOtp?: EvidenciaFirmaOtp) => {
    if (!soporte) return;
    setGuardando(true);
    try {
      setEstado(
        await contratacionService.cargarRp(
          procesoId,
          {
            numero: datos.numero.trim(),
            valor: Number(datos.valor),
            fechaExpedicion: datos.fechaExpedicion,
            rubro: datos.rubro.trim() || undefined,
            firma: firmaOtp,
          },
          soporte,
        ),
      );
      setSoporte(null);
      toast.success('Registro presupuestal cargado; el gasto queda comprometido');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <Marco>
        <p className="text-[11.5px] text-slate-400 m-0">Cargando el registro presupuestal…</p>
      </Marco>
    );
  }

  if (error || !estado) {
    return (
      <Marco>
        <Aviso tono="error" titulo="No se pudo cargar la actividad">
          {error ?? 'Inténtalo de nuevo en un momento.'}
        </Aviso>
      </Marco>
    );
  }

  const rp = estado.rp;
  const completo =
    datos.numero.trim() && Number(datos.valor) > 0 && datos.fechaExpedicion && soporte;

  return (
    <Marco>
      <Titulo>Registro presupuestal</Titulo>
      <Ayuda>
        El RP lo expide la Dirección Financiera por el canal de siempre. Cuando lo tengas, carga
        aquí el PDF con sus datos: compromete los recursos del contrato contra el CDP del proceso.
      </Ayuda>

      {!estado.suscrito ? (
        <Pendiente
          falta="8.1"
          texto={`El registro presupuestal compromete recursos con quien ya firmó: ${
            estado.motivoNoSuscrito ?? 'el contrato todavía no está suscrito'
          }.`}
        />
      ) : null}

      {rp ? (
        <div
          className={`rounded-lg border px-3.5 py-3 ${
            rp.estado === 'EXPEDIDO' ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex items-start gap-2.5">
            <CircleDollarSign
              className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                rp.estado === 'EXPEDIDO' ? 'text-emerald-900' : 'text-slate-500'
              }`}
            />
            <div className="min-w-0 flex-1">
              <p
                className={`text-[12.5px] font-bold m-0 break-words ${
                  rp.estado === 'EXPEDIDO' ? 'text-emerald-900' : 'text-slate-800'
                }`}
              >
                {rp.numero ? `RP ${rp.numero}` : 'Registro sin número'} · {ETIQUETA_ESTADO[rp.estado]}
              </p>
              <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed break-words">
                {rp.valor !== null ? pesos.format(rp.valor) : 'Sin valor registrado'}
                {rp.rubro ? ` · Rubro ${rp.rubro}` : ''}
                {rp.fechaExpedicion ? ` · Expedido el ${fechaLarga(rp.fechaExpedicion)}` : ''}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Se advierte, no se bloquea: un contrato puede comprometerse por
          partes, y esa decisión es de la Dirección Financiera. */}
      {estado.advertencia ? (
        <Aviso tono="aviso" titulo="El monto no cubre el contrato">
          {estado.advertencia}
          {estado.contrato ? `. El contrato vale ${pesos.format(estado.contrato.valor)}.` : ''}
        </Aviso>
      ) : null}

      {estado.puedeCargar ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Cargar el RP expedido</p>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="rp-numero" className="block text-xs font-bold text-gray-600 mb-1.5">
                Número del RP <span className="text-red-600">*</span>
              </label>
              <input
                id="rp-numero"
                type="text"
                value={datos.numero}
                onChange={(e) => setDatos((p) => ({ ...p, numero: e.target.value }))}
                placeholder="RP-2026-0142"
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="rp-valor" className="block text-xs font-bold text-gray-600 mb-1.5">
                Valor comprometido <span className="text-red-600">*</span>
              </label>
              <input
                id="rp-valor"
                type="number"
                min={1}
                value={datos.valor}
                onChange={(e) => setDatos((p) => ({ ...p, valor: e.target.value }))}
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="rp-rubro" className="block text-xs font-bold text-gray-600 mb-1.5">
                Rubro presupuestal
              </label>
              <input
                id="rp-rubro"
                type="text"
                value={datos.rubro}
                onChange={(e) => setDatos((p) => ({ ...p, rubro: e.target.value }))}
                placeholder="Si se deja vacío, el del CDP"
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="rp-fecha" className="block text-xs font-bold text-gray-600 mb-1.5">
                Fecha de expedición <span className="text-red-600">*</span>
              </label>
              <input
                id="rp-fecha"
                type="date"
                max={hoyEnBogota()}
                value={datos.fechaExpedicion}
                onChange={(e) => setDatos((p) => ({ ...p, fechaExpedicion: e.target.value }))}
                className={campo}
              />
            </div>
          </div>

          <SelectorArchivo
            id="rp-soporte"
            etiqueta="PDF del RP expedido"
            archivo={soporte}
            onElegir={setSoporte}
          />

          <Boton
            icono={guardando ? <Check className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
            disabled={guardando || !completo}
            onClick={() => firma.conFirma(cargar)}
          >
            Cargar el RP
          </Boton>
        </div>
      ) : null}
      {firma.modal}
    </Marco>
  );
}
