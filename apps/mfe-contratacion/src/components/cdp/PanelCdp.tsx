import React, { useEffect, useState } from 'react';
import { AlertTriangle, FilePlus2, Info, Paperclip, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { Cdp, EstadoRespaldo } from '../../types';
import { useDialogo } from '../shared/useDialogo';
import { useFirma } from '../shared/useFirma';
import {
  Aviso,
  Ayuda,
  Boton,
  BotonSecundario,
  campo,
  Marco,
  SelectorArchivo,
  SinPermiso,
  Titulo,
} from '../shared/PiezasPanel';

/** La actividad en que se carga el CDP (migración 103). */
const NUMERAL_CARGUE = '4.2';

interface Props {
  /** El numeral del riel. La 4.1, la 4.3 y la 4.4 ya no existen: un enlace viejo cae en la 4.2. */
  numeral?: string;
  procesoId: string;
  valorEstimado?: number | null;
  onCambio?: () => void;
  /**
   * Sube cuando cambia algo fuera del panel, como retirar la 4.2 de aprobación.
   * Sin él, «Corregir» no aparecía hasta recargar la página (BUG-001).
   */
  recargarToken?: number;
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

/**
 * Cómo queda el valor certificado frente al estimado del proceso.
 *
 * Por debajo, el respaldo no alcanza a cubrir el contrato; por encima, se
 * aparta presupuesto que el contrato no pide. Ninguna de las dos bloquea —la
 * cuantía definitiva la decide la Financiera—, pero las dos se dicen.
 *
 * Desde la 152 el proceso puede llevar varios CDP: `otros` es lo que ya suman
 * los demás, y lo que se compara es el total.
 */
export function frenteAlEstimado(
  valor: number | null,
  estimado: number | null | undefined,
  otros = 0,
): { tono: 'ok' | 'aviso'; texto: string } | null {
  if (valor === null || estimado === null || estimado === undefined) return null;
  const total = valor + otros;
  const referencia = `el valor estimado del proceso (${formatoPesos.format(estimado)})`;
  // El texto nombra el valor certificado y no solo la diferencia: con cifras
  // largas, la diferencia cambia en los últimos dígitos ($1.999.985,
  // $1.999.850…) y, sin el valor al lado, el aviso parece no haberse movido.
  const certificado =
    otros > 0
      ? `Con los demás CDP, el respaldo suma ${formatoPesos.format(total)} y`
      : formatoPesos.format(valor);
  if (total === estimado) {
    return { tono: 'ok', texto: `${certificado} coincide con ${referencia}.` };
  }
  const diferencia = formatoPesos.format(Math.abs(total - estimado));
  return total < estimado
    ? {
        tono: 'aviso',
        texto: `${certificado} queda ${diferencia} por debajo de ${referencia}: no alcanza a cubrir lo que pide el contrato.`,
      }
    : {
        tono: 'aviso',
        texto: `${certificado} queda ${diferencia} por encima de ${referencia}: se aparta más de lo que pide el contrato.`,
      };
}

/** Lo que suman los CDP expedidos, salvo el que se está corrigiendo. */
const sumaDe = (cdps: Cdp[], salvo?: string) =>
  cdps
    .filter((c) => c.estado === 'EXPEDIDO' && c.id !== salvo && c.valor !== null)
    .reduce((suma, c) => suma + Number(c.valor), 0);

/**
 * El cargue del CDP (4.2).
 *
 * Desde la 103 el CDP se pide y se expide por fuera del aplicativo: aquí el
 * área solo carga el certificado que la Dirección Financiera ya expidió. Si lo
 * cargó desde el estudio previo, la 4.2 se cerró sola y aquí solo se consulta.
 *
 * Desde la 152 el proceso puede llevar uno o más CDP: mientras la 4.2 siga en
 * manos del área se agregan, se corrigen o se quitan, y se envía al final.
 */
export function PanelCdp({ procesoId, valorEstimado, onCambio, recargarToken }: Props) {
  const firma = useFirma(NUMERAL_CARGUE, 'Cargue del CDP');
  const dialogo = useDialogo();
  const [respaldo, setRespaldo] = useState<EstadoRespaldo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);

  /** Si el formulario está abierto con la 4.2 que ya tiene CDP. */
  const [agregando, setAgregando] = useState(false);
  const [valorTexto, setValorTexto] = useState('');
  /**
   * Si el valor se está tecleando todavía.
   *
   * Mientras tanto no se compara con el estimado: al primer dígito el aviso ya
   * decía que $1 no cubre el contrato, y lo que se veía era un juicio sobre
   * una cifra a medio escribir.
   */
  const [escribiendoValor, setEscribiendoValor] = useState(false);
  const [numero, setNumero] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [rubro, setRubro] = useState('');
  const [soporte, setSoporte] = useState<File | null>(null);
  /** Soporte para un CDP que quedó sin él, por id. */
  const [soportes, setSoportes] = useState<Record<string, File | null>>({});
  /**
   * El CDP que se está corrigiendo (BUG-001): con la 4.2 retirada de
   * aprobación o devuelta, el formulario vuelve con sus datos y el certificado
   * pasa a ser opcional —si no llega otro, se conserva el que estaba—.
   */
  const [corrigiendo, setCorrigiendo] = useState<Cdp | null>(null);

  const limpiar = () => {
    setNumero('');
    setValorTexto('');
    setFecha(new Date().toISOString().slice(0, 10));
    setRubro('');
    setSoporte(null);
    setCorrigiendo(null);
    setAgregando(false);
  };

  const empezarCorreccion = (actual: Cdp) => {
    setNumero(actual.numero ?? '');
    setValorTexto(actual.valor !== null && actual.valor !== undefined ? String(actual.valor) : '');
    setFecha(actual.fechaExpedicion ?? new Date().toISOString().slice(0, 10));
    setRubro(actual.rubro ?? '');
    setSoporte(null);
    setCorrigiendo(actual);
    setAgregando(false);
  };

  const cargar = async () => {
    setCargando(true);
    try {
      const estado = await contratacionService.respaldoCdp(procesoId);
      setRespaldo(estado);
      // Sin pisar lo que se esté escribiendo: `cargar` se vuelve a llamar
      // después de cada acción. El rubro solo puede venir de una solicitud de
      // antes de la 103.
      const pendiente = (estado.cdps ?? (estado.cdp ? [estado.cdp] : [])).find(
        (c) => c.estado !== 'EXPEDIDO',
      );
      setRubro((actual) => actual || pendiente?.rubro || '');
    } catch (err: any) {
      toast.error('No se pudo cargar el CDP', { id: 'cdp-carga', description: err.message });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [procesoId, recargarToken]);

  const ejecutar = async (accion: () => Promise<unknown>, exito: string) => {
    setTrabajando(true);
    try {
      await accion();
      toast.success(exito);
      await cargar();
      onCambio?.();
      return true;
    } catch (err: any) {
      toast.error('No se pudo completar la acción', { description: err.message });
      return false;
    } finally {
      setTrabajando(false);
    }
  };

  // Solo la primera vez: al releer con datos ya en pantalla, el panel no se vacía.
  if (cargando && !respaldo) {
    return <p className="text-xs text-slate-500 m-0 px-4 py-3">Cargando…</p>;
  }
  if (!respaldo) {
    return <p className="text-xs text-red-600 m-0 px-4 py-3">No se pudo cargar el respaldo</p>;
  }

  if (!respaldo.aplica) {
    return (
      <Marco>
        <Aviso tono="ok" titulo="Esta modalidad no requiere CDP">
          La entidad no compromete gasto, así que no hay disponibilidad presupuestal que
          certificar. El proceso puede abrirse sin este requisito.
        </Aviso>
      </Marco>
    );
  }

  const todos = respaldo.cdps ?? (respaldo.cdp ? [respaldo.cdp] : []);
  const expedidos = todos.filter((c) => c.estado === 'EXPEDIDO');
  const pendiente = todos.find((c) => c.estado !== 'EXPEDIDO') ?? null;
  const puedeAgregar = respaldo.puedeAgregar ?? (respaldo.puedeCargar && expedidos.length === 0);
  const total = respaldo.valorTotal ?? sumaDe(expedidos);
  const formularioAbierto = !!corrigiendo || agregando || (expedidos.length === 0 && puedeAgregar);

  // ---------------------------------------------------- el formulario ----

  const valor = aNumero(valorTexto);
  const otros = sumaDe(expedidos, corrigiendo?.id);
  const frente = frenteAlEstimado(valor, valorEstimado, otros);
  const completo =
    !!rubro.trim() && !!numero.trim() && valor !== null && !!fecha && (!!soporte || !!corrigiendo);

  /*
   * Confirmar antes de cargar, con la comparación a la vista.
   *
   * Cargar el CDP desbloquea la apertura, y el valor es una cifra larga que se
   * teclea a mano: si no cuadra con el estimado, eso se tiene que ver antes de
   * confirmar, no en el aviso de después.
   */
  const confirmarCargue = async (enviar: boolean) => {
    if (!completo) return;
    const resumen =
      `CDP ${numero.trim()} por ${formatoPesos.format(valor!)} del ${fecha}, ` +
      `contra el rubro ${rubro.trim()}, ` +
      (soporte ? `con el soporte «${soporte.name}».` : 'con el soporte que ya estaba.');
    const despues = corrigiendo
      ? enviar
        ? 'Al confirmar, la corrección queda en la traza y la actividad se vuelve a enviar a aprobación.'
        : 'Al confirmar, la corrección queda en la traza. La actividad se envía después.'
      : enviar
        ? 'Al confirmar, el proceso queda respaldado y la apertura deja de estar bloqueada.'
        : 'Queda cargado y puedes agregar otro CDP antes de enviar la actividad.';
    const confirmado = await dialogo.confirmar({
      titulo:
        frente?.tono === 'aviso'
          ? 'El valor no coincide con el estimado del proceso'
          : corrigiendo
            ? 'Confirmar la corrección del CDP'
            : 'Confirmar el cargue del CDP',
      descripcion: `${resumen}${frente ? ` ${frente.texto}` : ''} ${despues}`,
      confirmar: corrigiendo
        ? enviar
          ? 'Guardar y volver a enviar'
          : 'Guardar'
        : enviar
          ? 'Cargar el CDP'
          : 'Cargar y agregar otro',
    });
    if (!confirmado) return;
    const datos = {
      rubro: rubro.trim(),
      numero: numero.trim(),
      valor: valor!,
      fechaExpedicion: fecha,
      enviar,
    };
    const accion = (firmaOtp?: Parameters<typeof contratacionService.cargarCdp>[1]['firma']) =>
      ejecutar(
        async () => {
          if (corrigiendo) {
            await contratacionService.corregirCdp(
              procesoId,
              corrigiendo.id,
              { ...datos, firma: firmaOtp },
              soporte,
            );
          } else {
            await contratacionService.cargarCdp(procesoId, { ...datos, firma: firmaOtp }, soporte!);
          }
        },
        corrigiendo
          ? enviar
            ? 'CDP corregido y enviado de nuevo'
            : 'CDP corregido'
          : enviar
            ? 'CDP cargado'
            : 'CDP cargado: puedes agregar otro',
      ).then((ok) => {
        if (!ok) return;
        limpiar();
        // Tras «Cargar y agregar otro», el formulario queda listo para el siguiente.
        if (!enviar && !corrigiendo) setAgregando(true);
      });
    // Sin enviar no se cierra la actividad, así que no hay firma que pedir.
    if (enviar) firma.conFirma(accion);
    else accion();
  };

  const enviarLaActividad = async () => {
    const confirmado = await dialogo.confirmar({
      titulo: 'Enviar el cargue del CDP',
      descripcion:
        `${expedidos.length === 1 ? 'Un CDP' : `${expedidos.length} CDP`} por ${pesos(total)}: ` +
        `${expedidos.map((c) => c.numero).join(', ')}. ` +
        (frenteAlEstimado(total, valorEstimado)?.tono === 'aviso'
          ? `${frenteAlEstimado(total, valorEstimado)!.texto} `
          : '') +
        'Al confirmar, la actividad pasa a aprobación (o se cierra, si no la pide) y ya no se agregan más.',
      confirmar: 'Enviar',
    });
    if (!confirmado) return;
    firma.conFirma((firmaOtp) =>
      ejecutar(() => contratacionService.enviarCargueCdp(procesoId, firmaOtp), 'Cargue del CDP enviado'),
    );
  };

  const quitar = async (cdp: Cdp) => {
    const motivo = await dialogo.pedirMotivo({
      titulo: `Quitar el CDP ${cdp.numero}`,
      descripcion: 'Queda anulado en el expediente, con tu nombre y el motivo.',
      confirmar: 'Quitar',
      tono: 'peligro',
      etiqueta: 'Motivo',
      opcional: true,
    });
    if (motivo === null) return;
    ejecutar(() => contratacionService.quitarCdp(procesoId, cdp.id, motivo || undefined), 'CDP quitado');
  };

  const formulario = (
    <div className="space-y-2.5">
      <Titulo>
        {corrigiendo
          ? `Corregir el CDP ${corrigiendo.numero}`
          : expedidos.length > 0
            ? 'Agregar otro CDP'
            : 'Cargar el CDP'}
      </Titulo>
      <Ayuda>
        {corrigiendo
          ? 'Corrige lo que haga falta. Si no adjuntas otro certificado, se conserva el que estaba.'
          : 'El CDP se solicita y se expide por fuera del aplicativo. Transcribe el certificado tal como lo expidió la Dirección Financiera y adjúntalo. Si el proceso lleva más de uno, cárgalos uno a uno.'}
      </Ayuda>
      {pendiente && !corrigiendo && (
        <Aviso tono="aviso" titulo="Quedó una solicitud de antes">
          Este proceso pidió el CDP cuando se tramitaba en el aplicativo
          {pendiente.solicitadoPor ? ` (lo pidió ${pendiente.solicitadoPor})` : ''}. Al cargar el
          certificado, la solicitud queda atendida con él.
        </Aviso>
      )}
      <input
        value={rubro}
        onChange={(e) => setRubro(e.target.value)}
        placeholder="Rubro presupuestal (p. ej. A-02-02-02-008)"
        aria-label="Rubro presupuestal"
        className={campo}
      />
      <div className="grid grid-cols-3 gap-2.5">
        <input
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder="Número"
          aria-label="Número del CDP"
          className={campo}
        />
        <input
          value={valorTexto}
          onChange={(e) => setValorTexto(e.target.value)}
          onFocus={() => setEscribiendoValor(true)}
          onBlur={() => setEscribiendoValor(false)}
          inputMode="numeric"
          placeholder="Valor"
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
      {frente && !escribiendoValor && (
        <Aviso
          tono={frente.tono}
          titulo={frente.tono === 'ok' ? 'Cubre el valor estimado' : 'No coincide con el valor estimado'}
        >
          {frente.texto}
        </Aviso>
      )}
      <SelectorArchivo
        etiqueta={corrigiendo ? 'Reemplazar el certificado' : 'Certificado expedido'}
        archivo={soporte}
        onElegir={setSoporte}
        obligatorio={!corrigiendo}
        ayuda={
          corrigiendo
            ? 'Opcional: solo si el certificado cambió. El anterior queda en el expediente.'
            : 'El CDP firmado: es la evidencia del certificado en el expediente.'
        }
      />
      <div className="flex items-center gap-2 flex-wrap">
        <Boton
          disabled={trabajando || !completo}
          onClick={() => confirmarCargue(true)}
          icono={<FilePlus2 className="w-3.5 h-3.5" />}
        >
          {corrigiendo ? 'Guardar y volver a enviar' : 'Cargar el CDP'}
        </Boton>
        <BotonSecundario
          disabled={trabajando || !completo}
          onClick={() => confirmarCargue(false)}
          icono={corrigiendo ? <Pencil className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        >
          {corrigiendo ? 'Guardar sin enviar' : 'Cargar y agregar otro'}
        </BotonSecundario>
        {(corrigiendo || agregando) && (
          <button
            type="button"
            onClick={limpiar}
            disabled={trabajando}
            className="text-[11.5px] font-bold text-slate-500 hover:underline"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );

  // ------------------------------------------------------ sin cargar ----

  if (expedidos.length === 0 && !puedeAgregar) {
    return (
      <Marco>
        <Titulo>Cargar el CDP</Titulo>
        <Ayuda>
          Todavía no se ha cargado. Lo carga el área solicitante con el certificado que expidió la
          Dirección Financiera.
        </Ayuda>
        <SinPermiso quien="el área solicitante" />
      </Marco>
    );
  }

  if (expedidos.length === 0) {
    return (
      <Marco>
        {formulario}
        {dialogo.elemento}
        {firma.modal}
      </Marco>
    );
  }

  // ------------------------------------------------------- cargados ----

  const frenteTotal = frenteAlEstimado(total, valorEstimado);
  const enviada = !puedeAgregar;

  return (
    <Marco>
      <Aviso
        tono="ok"
        titulo={
          expedidos.length === 1 ? `CDP ${expedidos[0].numero} cargado` : `${expedidos.length} CDP cargados`
        }
      >
        {expedidos.length === 1
          ? `Por ${pesos(expedidos[0].valor)} del ${expedidos[0].fechaExpedicion}${
              expedidos[0].rubro ? `, contra el rubro ${expedidos[0].rubro}` : ''
            }.`
          : `Suman ${pesos(total)}.`}{' '}
        La partida quedó apartada y el proceso ya puede abrirse.
        {!enviada && ' La actividad sigue abierta: puedes agregar otro CDP antes de enviarla.'}
      </Aviso>
      {frenteTotal?.tono === 'aviso' && (
        <p className="text-[11px] font-bold text-amber-700 m-0 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          {frenteTotal.texto}
        </p>
      )}

      <ul className="list-none m-0 p-0 space-y-2" aria-label="CDP del proceso">
        {expedidos.map((c) => {
          const editable = !!respaldo.puedeCorregir && c.origen === 'ETAPA_4' && !corrigiendo;
          return (
            <li key={c.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2 space-y-1.5">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <p className="text-[12px] font-black text-slate-800 m-0">CDP {c.numero}</p>
                  <p className="text-[11px] text-slate-600 m-0 tabular-nums">
                    {pesos(c.valor)} · {c.fechaExpedicion}
                    {c.rubro ? ` · rubro ${c.rubro}` : ''}
                  </p>
                </div>
                {editable && (
                  <div className="flex items-center gap-1.5">
                    <BotonSecundario
                      disabled={trabajando}
                      onClick={() => empezarCorreccion(c)}
                      icono={<Pencil className="w-3.5 h-3.5" />}
                    >
                      Corregir
                    </BotonSecundario>
                    <BotonSecundario
                      disabled={trabajando}
                      onClick={() => quitar(c)}
                      icono={<Trash2 className="w-3.5 h-3.5" />}
                    >
                      Quitar
                    </BotonSecundario>
                  </div>
                )}
              </div>
              <Origen cdp={c} conSoporte={!!c.documentoId} />
              {!c.documentoId && respaldo.puedeCargar && (
                <div className="flex items-end gap-2 flex-wrap">
                  <SelectorArchivo
                    etiqueta={`Soporte del CDP ${c.numero}`}
                    archivo={soportes[c.id] ?? null}
                    onElegir={(f) => setSoportes((s) => ({ ...s, [c.id]: f }))}
                    ayuda="Carga el certificado firmado para que quede en el expediente."
                  />
                  <Boton
                    disabled={trabajando || !soportes[c.id]}
                    onClick={() =>
                      ejecutar(
                        () => contratacionService.adjuntarCdp(procesoId, soportes[c.id]!, c.id),
                        'Soporte del CDP adjuntado',
                      ).then((ok) => ok && setSoportes((s) => ({ ...s, [c.id]: null })))
                    }
                    icono={<Paperclip className="w-3.5 h-3.5" />}
                  >
                    Adjuntar soporte
                  </Boton>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {formularioAbierto ? (
        <div className="pt-2 border-t border-gray-200">{formulario}</div>
      ) : (
        !enviada && (
          <>
            {respaldo.puedeCorregir && (
              <Ayuda>
                La actividad no está en revisión: puedes agregar, corregir o quitar CDP. Al enviarla
                pasa a aprobación con todos los cargados.
              </Ayuda>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {respaldo.puedeEnviar !== false && (
                <Boton disabled={trabajando} onClick={enviarLaActividad} icono={<Send className="w-3.5 h-3.5" />}>
                  Enviar la actividad
                </Boton>
              )}
              <BotonSecundario
                disabled={trabajando}
                onClick={() => {
                  limpiar();
                  setAgregando(true);
                }}
                icono={<Plus className="w-3.5 h-3.5" />}
              >
                Agregar otro CDP
              </BotonSecundario>
            </div>
          </>
        )
      )}
      {dialogo.elemento}
      {firma.modal}
    </Marco>
  );
}

// ------------------------------------------------------------- piezas ----

/**
 * De dónde sale el dato.
 *
 * No hay enlace con KLIC ni está previsto por ahora, así que el certificado se
 * transcribe a mano y el soporte cargado en el expediente es la única evidencia
 * de que existe. Quien consulta debe saberlo, y saber si esa evidencia está.
 */
const Origen = ({ cdp, conSoporte }: { cdp: Cdp; conSoporte: boolean }) => {
  const quien =
    cdp.origen === 'REGISTRADO_EN_ETAPA_3'
      ? 'Cargado por el área solicitante desde el estudio previo'
      : `Cargado por ${cdp.expedidoPor ?? 'el área solicitante'}`;
  return (
    <p className="text-[10.5px] text-slate-500 m-0 flex items-start gap-1.5 leading-relaxed">
      <Info className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
      {conSoporte
        ? `${quien}. El soporte adjunto es la evidencia del certificado.`
        : `${quien}. Aún sin soporte adjunto: el certificado no tiene evidencia en el expediente.`}
    </p>
  );
};
