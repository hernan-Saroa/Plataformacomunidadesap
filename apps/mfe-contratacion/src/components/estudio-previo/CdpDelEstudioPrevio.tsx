import React, { useEffect, useState } from 'react';
import { FilePlus2, Landmark, Pencil, Send, Undo2, X } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { Cdp, CdpDelEstudioPrevio as EstadoCdpDelEstudio } from '../../types';
import { frenteAlEstimado } from '../cdp/PanelCdp';
import { momento } from '../shared/fechas';
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
  if (cdp.origen === 'REGISTRADO_EN_ETAPA_3') {
    return {
      titulo: `CDP ${cdp.numero} registrado`,
      detalle: `Por ${pesos(cdp.valor)} del ${cdp.fechaExpedicion}, contra el rubro ${cdp.rubro}. Lo registró ${
        cdp.expedidoPor ?? 'el área'
      }. Al aprobarse el estudio previo, la etapa 4 se da por atendida con este certificado.`,
      tono: 'ok',
    };
  }
  const quien = cdp.solicitadoPor ? `Lo solicitó ${cdp.solicitadoPor}` : 'Solicitado';
  const cuando = cdp.solicitadoAt ? ` el ${momento(cdp.solicitadoAt)}` : '';
  if (cdp.estado === 'EXPEDIDO') {
    return {
      titulo: `CDP ${cdp.numero} expedido por la Dirección Financiera`,
      detalle: `Por ${pesos(cdp.valor)}${cdp.rubro ? `, contra el rubro ${cdp.rubro}` : ''}. ${quien}${cuando}.`,
      tono: 'ok',
    };
  }
  if (cdp.estado === 'VERIFICADO') {
    return {
      titulo: 'Disponibilidad verificada, falta la expedición',
      detalle: `La Dirección Financiera confirmó el saldo${cdp.rubro ? ` en el rubro ${cdp.rubro}` : ''}. ${quien}${cuando}.`,
      tono: 'ok',
    };
  }
  return {
    titulo: 'CDP solicitado · en trámite en la Dirección Financiera',
    detalle: `${quien}${cuando} por ${pesos(cdp.valor)}. Solicitarlo no envía el estudio previo: eso lo sigues haciendo tú.`,
    tono: 'ok',
  };
}

/**
 * La gestión del CDP desde el estudio previo (migración 100).
 *
 * Va aparte del formulario a propósito: el CDP es de otra dirección y tiene su
 * propio trámite, así que pedirlo no es guardar el estudio previo ni enviarlo.
 * Lo que ofrece son los dos caminos de la etapa 3: pedirlo a la Financiera o
 * registrar el que el área ya tiene. Lo que aquí no se gestione se pide solo al
 * aprobarse el estudio previo, como siempre.
 */
export function CdpDelEstudioPrevio({ procesoId, valorEstimado, onEstado }: Props) {
  const dialogo = useDialogo();
  const [estado, setEstado] = useState<EstadoCdpDelEstudio | null>(null);
  const [modo, setModo] = useState<'solicitar' | 'registrar' | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  const [valorTexto, setValorTexto] = useState('');
  const [rubro, setRubro] = useState('');
  const [numero, setNumero] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [observaciones, setObservaciones] = useState('');
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
  const corrigiendo = modo === 'registrar' && cdp?.origen === 'REGISTRADO_EN_ETAPA_3';

  const abrir = (nuevo: 'solicitar' | 'registrar') => {
    const base = nuevo === 'registrar' && cdp?.origen === 'REGISTRADO_EN_ETAPA_3' ? cdp : null;
    setValorTexto(
      base?.valor ? String(base.valor) : valorEstimado ? String(Math.round(valorEstimado)) : '',
    );
    setRubro(base?.rubro ?? '');
    setNumero(base?.numero ?? '');
    setFecha(base?.fechaExpedicion ?? new Date().toISOString().slice(0, 10));
    setObservaciones('');
    setSoporte(null);
    setModo(nuevo);
  };

  const ejecutar = async (accion: () => Promise<EstadoCdpDelEstudio>, exito: string) => {
    setTrabajando(true);
    try {
      poner(await accion());
      setModo(null);
      toast.success(exito);
    } catch (err: any) {
      toast.error('No se pudo completar la acción', { description: err.message });
    } finally {
      setTrabajando(false);
    }
  };

  const valor = aNumero(valorTexto);
  const frente = modo === 'registrar' ? frenteAlEstimado(valor, valorEstimado) : null;
  const registroCompleto =
    !!numero.trim() && valor !== null && !!rubro.trim() && !!fecha && (corrigiendo || !!soporte);

  const solicitar = () =>
    ejecutar(
      () =>
        contratacionService.solicitarCdpDesdeElEstudioPrevio(procesoId, {
          valor: valor ?? undefined,
          rubro: rubro.trim() || undefined,
          observaciones: observaciones.trim() || undefined,
        }),
      'Solicitud de CDP enviada a la Dirección Financiera',
    );

  const registrar = () =>
    ejecutar(
      () =>
        contratacionService.registrarCdpDesdeElEstudioPrevio(
          procesoId,
          { numero: numero.trim(), valor: valor!, rubro: rubro.trim(), fechaExpedicion: fecha },
          soporte,
        ),
      corrigiendo ? 'CDP corregido' : 'CDP registrado',
    );

  const retirar = async () => {
    const motivo = await dialogo.pedirMotivo({
      titulo: cdp?.origen === 'REGISTRADO_EN_ETAPA_3' ? 'Retirar el CDP registrado' : 'Retirar la solicitud de CDP',
      descripcion:
        'Queda anulado en el expediente, con tu nombre y el motivo. Después puedes solicitarlo o registrarlo otra vez.',
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
      (cdp.origen === 'SOLICITADO_EN_ETAPA_3' && cdp.estado === 'SOLICITADO'));

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
        <>
          {estado.rechazado && (
            <Aviso tono="error" titulo="La Dirección Financiera rechazó la solicitud anterior">
              {estado.rechazado.observaciones ?? 'Sin motivo registrado.'} Puedes volver a solicitarlo o
              registrar uno que ya tengas.
            </Aviso>
          )}
          <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed">
            {estado.obligatorio
              ? 'Esta modalidad exige gestionar el CDP antes de enviar el estudio previo: solicítalo a la Dirección Financiera o registra el que ya tienes.'
              : 'Puedes adelantarlo ahora, si lo necesitas. Si no, se solicita solo cuando se apruebe el estudio previo.'}
          </p>
        </>
      )}

      {estado.puedeGestionar && modo === null && (
        <div className="flex items-center gap-2 flex-wrap">
          {!cdp && (
            <>
              <Boton disabled={trabajando} onClick={() => abrir('solicitar')} icono={<Send className="w-3.5 h-3.5" />}>
                Solicitar el CDP
              </Boton>
              <Boton
                disabled={trabajando}
                onClick={() => abrir('registrar')}
                icono={<FilePlus2 className="w-3.5 h-3.5" />}
              >
                Ya tengo el CDP
              </Boton>
            </>
          )}
          {cdp?.origen === 'REGISTRADO_EN_ETAPA_3' && (
            <Boton disabled={trabajando} onClick={() => abrir('registrar')} icono={<Pencil className="w-3.5 h-3.5" />}>
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

      {modo === 'solicitar' && (
        <div className="space-y-2 pt-2 border-t border-gray-200">
          <p className="text-[11.5px] text-slate-600 m-0">
            La solicitud llega a la bandeja de la Dirección Financiera, que verifica la disponibilidad y
            expide el certificado. El rubro es opcional: si no lo conoces, lo pone la Financiera.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <input
              value={valorTexto}
              onChange={(e) => setValorTexto(e.target.value)}
              inputMode="numeric"
              placeholder="Valor a respaldar"
              aria-label="Valor a respaldar"
              className={`${campo} tabular-nums`}
            />
            <input
              value={rubro}
              onChange={(e) => setRubro(e.target.value)}
              placeholder="Rubro presupuestal (opcional)"
              aria-label="Rubro presupuestal"
              className={campo}
            />
          </div>
          <input
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Observaciones para la Dirección Financiera (opcional)"
            aria-label="Observaciones"
            className={campo}
          />
          <div className="flex items-center gap-2">
            <Boton disabled={trabajando || valor === null} onClick={solicitar} icono={<Send className="w-3.5 h-3.5" />}>
              Enviar la solicitud
            </Boton>
            <BotonSecundario disabled={trabajando} onClick={() => setModo(null)} icono={<X className="w-3.5 h-3.5" />}>
              Cancelar
            </BotonSecundario>
          </div>
        </div>
      )}

      {modo === 'registrar' && (
        <div className="space-y-2 pt-2 border-t border-gray-200">
          <p className="text-[11.5px] text-slate-600 m-0">
            Transcribe el certificado tal como lo expidió la Dirección Financiera y adjúntalo. Queda
            registrado como expedido y no hace falta solicitarlo.
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
              {corrigiendo ? 'Guardar la corrección' : 'Registrar el CDP'}
            </Boton>
            <BotonSecundario disabled={trabajando} onClick={() => setModo(null)} icono={<X className="w-3.5 h-3.5" />}>
              Cancelar
            </BotonSecundario>
          </div>
        </div>
      )}

      {dialogo.elemento}
    </section>
  );
}
