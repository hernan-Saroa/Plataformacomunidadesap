import React, { useEffect, useState } from 'react';
import { AlarmClock, FileCheck2, Gavel, Handshake, Paperclip, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  AlertaPlazo,
  BalanceLiquidacion,
  DatosLiquidacion,
  EstadoLiquidacion,
  TipoLiquidacion,
} from '../../types';
import {
  Aviso,
  Ayuda,
  Boton,
  BotonSecundario,
  campo,
  Marco,
  Pendiente,
  SelectorArchivo,
  Titulo,
} from '../shared/PiezasPanel';
import { fechaLarga, hoyEnBogota, momento } from '../shared/fechas';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const pesos = (valor: number | null | undefined) =>
  valor == null
    ? '—'
    : new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(valor);

const ETIQUETA_TIPO: Record<TipoLiquidacion, string> = {
  BILATERAL: 'De común acuerdo',
  UNILATERAL: 'Unilateral',
};

const VACIO = {
  fechaActa: hoyEnBogota(),
  pazYSalvo: false,
  observaciones: '',
};

/**
 * Actividad 10.2 · Acta de liquidación (EFDS-1172).
 *
 * Lo primero que se ve es la cuenta regresiva del plazo, no el formulario: es
 * la alerta que pide RF-SIS-03 y el dato que decide qué se puede hacer hoy.
 *
 * La liquidación unilateral solo se ofrece cuando la potestad existe. Antes se
 * explica desde cuándo estará disponible, en vez de mostrar un botón que el
 * servicio va a rechazar.
 */
export function PanelLiquidacion({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoLiquidacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [tipo, setTipo] = useState<TipoLiquidacion | null>(null);
  const [datos, setDatos] = useState(VACIO);
  const [acta, setActa] = useState<File | null>(null);
  const [soporte, setSoporte] = useState<File | null>(null);

  const leer = () =>
    contratacionService
      .liquidacion(procesoId)
      .then((respuesta) => {
        setEstado(respuesta);
        setError(null);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));

  useEffect(() => {
    setCargando(true);
    leer();
  }, [procesoId]);

  const limpiar = () => {
    setTipo(null);
    setDatos(VACIO);
    setActa(null);
    setSoporte(null);
  };

  const liquidar = async () => {
    if (!tipo || !acta) return;

    const cuerpo: DatosLiquidacion = {
      tipo,
      fechaActa: datos.fechaActa,
      pazYSalvo: datos.pazYSalvo,
      ...(datos.observaciones.trim() ? { observaciones: datos.observaciones.trim() } : {}),
    };

    setGuardando(true);
    try {
      setEstado(await contratacionService.liquidar(procesoId, cuerpo, acta, soporte));
      limpiar();
      toast.success('Contrato liquidado');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const anular = async () => {
    const motivo = window.prompt('¿Por qué se anula el acta de liquidación?')?.trim();
    if (!motivo) return;

    setGuardando(true);
    try {
      setEstado(await contratacionService.anularLiquidacion(procesoId, motivo));
      toast.success('Acta anulada; puedes elaborar otra');
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
        <p className="text-[11.5px] text-slate-400 m-0">Cargando la liquidación…</p>
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

  // El paz y salvo se declara con soporte o no se declara.
  const completo = tipo && acta && (!datos.pazYSalvo || soporte);

  return (
    <Marco>
      <Titulo>Liquidación del contrato</Titulo>
      <Ayuda>
        Las partes liquidan de común acuerdo dentro de los cuatro meses siguientes a la
        terminación. Si no se logra, la entidad puede liquidar unilateralmente en los dos meses
        adicionales.
      </Ayuda>

      {/* Lo primero, antes del formulario: es lo que decide qué se puede hacer. */}
      {estado.alerta ? <CuentaRegresiva alerta={estado.alerta} /> : null}

      {!estado.admiteLiquidacion ? (
        <Pendiente
          falta="9.1"
          texto={`Todavía no hay contrato que liquidar: ${
            estado.motivoNoAdmite ?? 'el contrato no está en ejecución'
          }.`}
        />
      ) : null}

      {estado.admiteLiquidacion && !estado.tieneInformeFinal ? (
        <Pendiente
          falta="10.1"
          texto="Falta el informe final de ejecución: la liquidación va sobre el informe que dice cómo se ejecutó."
        />
      ) : null}

      {estado.admiteLiquidacion && estado.tieneInformeFinal && !estado.ventana ? (
        <Aviso tono="aviso" titulo="No se puede calcular el plazo de liquidación">
          Falta el acta de inicio o el plazo del contrato, y sin fecha de terminación no hay desde
          cuándo contar los cuatro meses.
        </Aviso>
      ) : null}

      {estado.acta ? (
        <>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3">
            <div className="flex items-start gap-2.5">
              {estado.acta.tipo === 'BILATERAL' ? (
                <Handshake className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-900" />
              ) : (
                <Gavel className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-900" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-bold text-emerald-900 m-0">
                  Liquidado {ETIQUETA_TIPO[estado.acta.tipo].toLowerCase()} el{' '}
                  {fechaLarga(estado.acta.fechaActa)}
                </p>
                <p className="text-[11.5px] text-emerald-900 m-0 mt-0.5 leading-relaxed break-words">
                  {estado.acta.liquidadoPor ? `Por ${estado.acta.liquidadoPor}` : ''}
                  {estado.acta.pazYSalvo
                    ? ' · las partes quedan a paz y salvo'
                    : ' · sin paz y salvo'}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                  {[
                    [estado.acta.documento, 'Acta'],
                    [estado.acta.pazYSalvoDocumento, 'Paz y salvo'],
                  ].map(([doc, etiqueta]: any) =>
                    doc?.url ? (
                      <a
                        key={etiqueta}
                        href={contratacionService.urlDescarga(doc.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-[#003DA5] hover:underline"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        {etiqueta}
                      </a>
                    ) : null,
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Que se haya liquidado fuera de término va dicho, no escondido. */}
          {estado.acta.momentoDelPlazo === 'VENCIDO' ? (
            <Aviso tono="aviso" titulo="Se liquidó fuera del término legal">
              El plazo había vencido el {estado.acta.unilateralHasta}. Queda registrado en el acta.
            </Aviso>
          ) : null}

          {estado.acta.observaciones ? (
            <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3">
              <p className="text-[12.5px] font-bold text-slate-800 m-0 mb-1">
                Salvedades y observaciones
              </p>
              <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed whitespace-pre-line break-words">
                {estado.acta.observaciones}
              </p>
            </div>
          ) : null}

          <Balance titulo="Balance financiero del acta" balance={estado.acta.balance} congelado />

          <BotonSecundario
            icono={<Undo2 className="w-3.5 h-3.5" />}
            disabled={guardando}
            onClick={anular}
          >
            Anular el acta
          </BotonSecundario>
        </>
      ) : null}

      {estado.historial.length > 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-2">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Actas anuladas</p>
          {estado.historial.map((a, indice) => (
            <div key={`${a.fechaActa}-${indice}`} className="border-l-2 border-slate-200 pl-2.5">
              <p className="text-[11.5px] font-bold text-slate-700 m-0">
                {ETIQUETA_TIPO[a.tipo]} · {fechaLarga(a.fechaActa)}
              </p>
              <p className="text-[11px] text-slate-500 m-0 mt-0.5 leading-relaxed break-words">
                Anulada {a.anuladoAt ? `el ${momento(a.anuladoAt)}` : ''}
                {a.anuladoPor ? ` por ${a.anuladoPor}` : ''}
                {a.motivoAnulacion ? ` · ${a.motivoAnulacion}` : ''}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {!estado.acta && estado.puedeLiquidarBilateral ? (
        <Balance titulo="Balance de la ejecución" balance={estado.balanceActual} />
      ) : null}

      {!estado.acta && estado.puedeLiquidarBilateral && !tipo ? (
        <div className="space-y-2">
          <Boton icono={<Handshake className="w-3.5 h-3.5" />} onClick={() => setTipo('BILATERAL')}>
            Liquidar de común acuerdo
          </Boton>

          {estado.puedeLiquidarUnilateral ? (
            <BotonSecundario
              icono={<Gavel className="w-3.5 h-3.5" />}
              onClick={() => setTipo('UNILATERAL')}
            >
              Liquidar unilateralmente
            </BotonSecundario>
          ) : (
            /* No se muestra un botón que el servicio va a rechazar: se explica
               desde cuándo existe la potestad. */
            <p className="text-[11.5px] text-slate-500 m-0 leading-relaxed">
              {estado.motivoNoUnilateral}
            </p>
          )}
        </div>
      ) : null}

      {tipo ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">
            Acta de liquidación · {ETIQUETA_TIPO[tipo].toLowerCase()}
          </p>

          <div>
            <label htmlFor="liq-fecha" className="block text-xs font-bold text-gray-600 mb-1.5">
              Fecha del acta <span className="text-red-600">*</span>
            </label>
            <input
              id="liq-fecha"
              type="date"
              value={datos.fechaActa}
              onChange={(e) => setDatos((p) => ({ ...p, fechaActa: e.target.value }))}
              className={campo}
            />
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={datos.pazYSalvo}
              onChange={(e) => setDatos((p) => ({ ...p, pazYSalvo: e.target.checked }))}
              className="mt-0.5"
            />
            <span className="text-[11.5px] text-slate-600 leading-relaxed">
              Las partes quedan a paz y salvo
              <span className="block text-[11px] text-slate-400">
                Si lo marcas, adjunta el soporte: sin él el expediente afirmaría algo que no
                puede probar.
              </span>
            </span>
          </label>

          <div>
            <label htmlFor="liq-obs" className="block text-xs font-bold text-gray-600 mb-1.5">
              Salvedades y observaciones
            </label>
            <textarea
              id="liq-obs"
              rows={3}
              value={datos.observaciones}
              onChange={(e) => setDatos((p) => ({ ...p, observaciones: e.target.value }))}
              placeholder="Salvedades del contratista, saldos a favor, pendientes"
              className={campo}
            />
          </div>

          <SelectorArchivo
            id="liq-acta"
            etiqueta={tipo === 'BILATERAL' ? 'Acta firmada' : 'Resolución de liquidación'}
            ayuda={
              tipo === 'BILATERAL'
                ? 'Suscrita por las dos partes.'
                : 'El acto administrativo de la entidad.'
            }
            archivo={acta}
            onElegir={setActa}
          />

          {datos.pazYSalvo ? (
            <SelectorArchivo
              id="liq-paz"
              etiqueta="Soporte del paz y salvo"
              ayuda="El documento que lo acredita."
              archivo={soporte}
              onElegir={setSoporte}
            />
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Boton
              icono={<FileCheck2 className="w-3.5 h-3.5" />}
              disabled={guardando || !completo}
              onClick={liquidar}
            >
              Liquidar
            </Boton>
            <BotonSecundario
              icono={<Undo2 className="w-3.5 h-3.5" />}
              disabled={guardando}
              onClick={limpiar}
            >
              Cancelar
            </BotonSecundario>
          </div>
        </div>
      ) : null}
    </Marco>
  );
}

/**
 * La alerta de plazos, con el color que corresponde al momento.
 *
 * Va arriba de todo y no como un aviso más: es la que dice cuánto tiempo queda,
 * y llegar tarde a una liquidación se la quita de las manos a la entidad.
 */
function CuentaRegresiva({ alerta }: { alerta: AlertaPlazo }) {
  const tono =
    alerta.momento === 'VENCIDO'
      ? 'border-red-200 bg-red-50 text-red-900'
      : alerta.momento === 'UNILATERAL'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : // Dentro del acuerdo, pero con menos de un mes, ya conviene que se note.
          alerta.dias <= 30
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : 'border-blue-200 bg-blue-50 text-[#003DA5]';

  return (
    <div className={`rounded-lg border px-3.5 py-3 ${tono}`}>
      <div className="flex items-start gap-2.5">
        <AlarmClock className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p className="text-[12px] font-bold m-0 leading-relaxed break-words">{alerta.mensaje}</p>
      </div>
    </div>
  );
}

/** Las cifras del contrato, con o sin la marca de congelado. */
function Balance({
  titulo,
  balance,
  congelado = false,
}: {
  titulo: string;
  balance: BalanceLiquidacion | null;
  congelado?: boolean;
}) {
  if (!balance) return null;

  const filas: Array<[string, string]> = [
    ['Valor del contrato', pesos(balance.valorContrato)],
    ['Pagado', pesos(balance.valorPagado)],
    [balance.saldo < 0 ? 'Pagado de más' : 'Saldo sin ejecutar', pesos(Math.abs(balance.saldo))],
    ['Cuentas tramitadas', String(balance.cuentasTramitadas)],
  ];

  if (balance.cuentasPendientes > 0) {
    filas.push(['Cuentas sin tramitar', String(balance.cuentasPendientes)]);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3">
      <p className="text-[12.5px] font-bold text-slate-800 m-0 mb-2">
        {titulo}
        {congelado ? (
          <span className="ml-1.5 text-[10.5px] font-bold text-slate-400">
            · congelado al liquidar
          </span>
        ) : null}
      </p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 m-0">
        {filas.map(([etiqueta, valor]) => (
          <React.Fragment key={etiqueta}>
            <dt className="text-[11.5px] text-slate-500 m-0">{etiqueta}</dt>
            <dd className="text-[11.5px] font-bold text-slate-800 m-0 text-right tabular-nums">
              {valor}
            </dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  );
}
