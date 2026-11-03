import React, { useEffect, useState } from 'react';
import { FilePlus2, Landmark, Pencil, Undo2, X } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { Cdp, CdpDelEstudioPrevio as EstadoCdpDelEstudio } from '../../types';
import { frenteAlEstimado } from '../cdp/PanelCdp';
import { useDialogo } from '../shared/useDialogo';
import { Aviso, Boton, BotonSecundario, campo, SelectorArchivo } from '../shared/PiezasPanel';

interface Props {
  procesoId: string;
  valorEstimado?: number | null;
  /** Lo que el formulario necesita para saber si puede ofrecer el envío. */
  onEstado?: (estado: EstadoCdpDelEstudio | null) => void;
}

const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const pesos = (valor: number | null | undefined) =>
  valor === null || valor === undefined ? '—' : formatoPesos.format(valor);

function aNumero(texto: string): number | null {
  const limpio = texto.replace(/[^\d]/g, '');
  if (!limpio) return null;
  const n = Number(limpio);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Cómo va el CDP, dicho para quien redacta el estudio previo. */
function situacion(cdp: Cdp): { titulo: string; detalle: string; tono: 'ok' | 'aviso' } {
  if (cdp.estado === 'EXPEDIDO') {
    return {
      titulo: `CDP ${cdp.numero} cargado`,
      detalle: `Por ${pesos(cdp.valor)} del ${cdp.fechaExpedicion}${
        cdp.rubro ? `, contra el rubro ${cdp.rubro}` : ''
      }. Lo cargó ${cdp.expedidoPor ?? 'el área'}. Al aprobarse el estudio previo, la etapa 4 se da por atendida con este certificado.`,
      tono: 'ok',
    };
  }
  // Una solicitud de cuando el CDP se tramitaba en el aplicativo (antes de la
  // 103). Nadie la va a atender: se retira y se carga el certificado.
  return {
    titulo: 'Quedó una solicitud de CDP sin atender',
    detalle:
      'Se pidió cuando el CDP se tramitaba en el aplicativo. Ahora se tramita por fuera: retírala y carga el certificado que expidió la Dirección Financiera.',
    tono: 'aviso',
  };
}

/**
 * El CDP desde el estudio previo (migraciones 100 y 103).
 *
 * Va aparte del formulario a propósito: el CDP es de otra dirección y tiene su
 * propio trámite, que desde la 103 va por fuera del aplicativo. Aquí el área
 * solo carga el certificado que ya tiene; si no lo carga aquí, lo carga en la
 * 4.2 cuando se apruebe el estudio previo.
 */
export function CdpDelEstudioPrevio({ procesoId, valorEstimado, onEstado }: Props) {
  const dialogo = useDialogo();
  const [estado, setEstado] = useState<EstadoCdpDelEstudio | null>(null);
  const [cargando, setCargando] = useState(false);
  const [trabajando, setTrabajando] = useState(false);

  const [valorTexto, setValorTexto] = useState('');
  const [rubro, setRubro] = useState('');
  const [numero, setNumero] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [soporte, setSoporte] = useState<File | null>(null);

  const poner = (nuevo: EstadoCdpDelEstudio | null) => {
    setEstado(nuevo);
    onEstado?.(nuevo);
  };

  useEffect(() => {
    contratacionService
      .cdpDelEstudioPrevio(procesoId)
      .then(poner)
      .catch(() => poner(null));
  }, [procesoId]);

  if (!estado || !estado.aplica) return null;

  const cdp = estado.cdp;
  const corrigiendo = cargando && cdp?.origen === 'REGISTRADO_EN_ETAPA_3';

  const abrir = () => {
    const base = cdp?.origen === 'REGISTRADO_EN_ETAPA_3' ? cdp : null;
    setValorTexto(
      base?.valor ? String(base.valor) : valorEstimado ? String(Math.round(valorEstimado)) : '',
    );
    setRubro(base?.rubro ?? '');
    setNumero(base?.numero ?? '');
    setFecha(base?.fechaExpedicion ?? new Date().toISOString().slice(0, 10));
    setSoporte(null);
    setCargando(true);
  };

  const ejecutar = async (accion: () => Promise<EstadoCdpDelEstudio>, exito: string) => {
    setTrabajando(true);
    try {
      poner(await accion());
      setCargando(false);
      toast.success(exito);
    } catch (err: any) {
      toast.error('No se pudo completar la acción', { description: err.message });
    } finally {
      setTrabajando(false);
    }
  };

  const valor = aNumero(valorTexto);
  const frente = cargando ? frenteAlEstimado(valor, valorEstimado) : null;
  const registroCompleto =
    !!numero.trim() && valor !== null && !!rubro.trim() && !!fecha && (corrigiendo || !!soporte);

  const registrar = () =>
    ejecutar(
      () =>
        contratacionService.registrarCdpDesdeElEstudioPrevio(
          procesoId,
          { numero: numero.trim(), valor: valor!, rubro: rubro.trim(), fechaExpedicion: fecha },
          soporte,
        ),
      corrigiendo ? 'CDP corregido' : 'CDP cargado',
    );

  const retirar = async () => {
    const motivo = await dialogo.pedirMotivo({
      titulo: cdp?.origen === 'REGISTRADO_EN_ETAPA_3' ? 'Retirar el CDP cargado' : 'Retirar la solicitud de CDP',
      descripcion:
        'Queda anulado en el expediente, con tu nombre y el motivo. Después puedes cargarlo otra vez.',
      confirmar: 'Retirar',
      tono: 'peligro',
      etiqueta: 'Motivo',
      opcional: true,
    });
    if (motivo === null) return;
    ejecutar(
      () => contratacionService.retirarCdpDesdeElEstudioPrevio(procesoId, motivo || undefined),
      'CDP retirado',
    );
  };

  const puedeRetirar =
    estado.puedeGestionar &&
    !!cdp &&
    (cdp.origen === 'REGISTRADO_EN_ETAPA_3' ||
      (cdp.origen === 'SOLICITADO_EN_ETAPA_3' && cdp.estado !== 'EXPEDIDO'));

  return (
    <section
      aria-label="CDP del proceso"
      className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3 space-y-2.5"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <Landmark className="w-4 h-4 text-[#003DA5]" />
        <h4 className="text-[12.5px] font-black text-slate-800 m-0">CDP del proceso</h4>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            estado.obligatorio ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {estado.obligatorio ? 'Obligatorio para enviar a revisión' : 'Opcional en esta etapa'}
        </span>
      </div>

      {cdp ? (
        (() => {
          const s = situacion(cdp);
          return (
            <Aviso tono={s.tono} titulo={s.titulo}>
              {s.detalle}
            </Aviso>
          );
        })()
      ) : (
        <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed">
          {estado.obligatorio
            ? 'Esta modalidad exige el CDP cargado antes de enviar el estudio previo. Se solicita y se expide por fuera del aplicativo; aquí se carga el certificado.'
            : 'Si ya tienes el CDP, puedes cargarlo ahora. Si no, lo cargas en la etapa 4, cuando se apruebe el estudio previo.'}
        </p>
      )}

      {estado.puedeGestionar && !cargando && (
        <div className="flex items-center gap-2 flex-wrap">
          {!cdp && (
            <Boton disabled={trabajando} onClick={abrir} icono={<FilePlus2 className="w-3.5 h-3.5" />}>
              Cargar el CDP
            </Boton>
          )}
          {cdp?.origen === 'REGISTRADO_EN_ETAPA_3' && (
            <Boton disabled={trabajando} onClick={abrir} icono={<Pencil className="w-3.5 h-3.5" />}>
              Corregir los datos
            </Boton>
          )}
          {puedeRetirar && (
            <BotonSecundario disabled={trabajando} onClick={retirar} icono={<Undo2 className="w-3.5 h-3.5" />}>
              Retirar
            </BotonSecundario>
          )}
        </div>
      )}

      {cargando && (
        <div className="space-y-2 pt-2 border-t border-gray-200">
          <p className="text-[11.5px] text-slate-600 m-0">
            Transcribe el certificado tal como lo expidió la Dirección Financiera y adjúntalo. Al
            aprobarse el estudio previo, la etapa 4 queda atendida con él.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Número del CDP"
              aria-label="Número del CDP"
              className={campo}
            />
            <input
              value={rubro}
              onChange={(e) => setRubro(e.target.value)}
              placeholder="Rubro presupuestal"
              aria-label="Rubro presupuestal"
              className={campo}
            />
            <input
              value={valorTexto}
              onChange={(e) => setValorTexto(e.target.value)}
              inputMode="numeric"
              placeholder="Valor certificado"
              aria-label="Valor certificado"
              className={`${campo} tabular-nums`}
            />
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              aria-label="Fecha de expedición"
              className={campo}
            />
          </div>
          {frente && (
            <Aviso
              tono={frente.tono}
              titulo={frente.tono === 'ok' ? 'Cubre el valor estimado' : 'No coincide con el valor estimado'}
            >
              {frente.texto}
            </Aviso>
          )}
          <SelectorArchivo
            etiqueta="Certificado expedido"
            archivo={soporte}
            onElegir={setSoporte}
            ayuda={
              corrigiendo
                ? 'Solo si quieres reemplazar el que ya está cargado.'
                : 'El CDP firmado: es la evidencia del certificado en el expediente.'
            }
          />
          <div className="flex items-center gap-2">
            <Boton
              disabled={trabajando || !registroCompleto}
              onClick={registrar}
              icono={<FilePlus2 className="w-3.5 h-3.5" />}
            >
              {corrigiendo ? 'Guardar la corrección' : 'Cargar el CDP'}
            </Boton>
            <BotonSecundario disabled={trabajando} onClick={() => setCargando(false)} icono={<X className="w-3.5 h-3.5" />}>
              Cancelar
            </BotonSecundario>
          </div>
        </div>
      )}

      {dialogo.elemento}
    </section>
  );
}
