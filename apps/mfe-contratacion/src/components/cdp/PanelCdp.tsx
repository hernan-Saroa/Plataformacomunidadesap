import React, { useEffect, useState } from 'react';
import { AlertTriangle, FilePlus2, Info, Paperclip } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { Cdp, EstadoRespaldo } from '../../types';
import { useDialogo } from '../shared/useDialogo';
import { useFirma } from '../shared/useFirma';
import { Aviso, Ayuda, Boton, campo, Marco, SelectorArchivo, SinPermiso, Titulo } from '../shared/PiezasPanel';

/** La actividad en que se carga el CDP (migración 103). */
const NUMERAL_CARGUE = '4.2';

interface Props {
  /** El numeral del riel. La 4.1, la 4.3 y la 4.4 ya no existen: un enlace viejo cae en la 4.2. */
  numeral?: string;
  procesoId: string;
  valorEstimado?: number | null;
  onCambio?: () => void;
}

const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

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
 */
export function frenteAlEstimado(
  valor: number | null,
  estimado: number | null | undefined,
): { tono: 'ok' | 'aviso'; texto: string } | null {
  if (valor === null || estimado === null || estimado === undefined) return null;
  const referencia = `el valor estimado del proceso (${formatoPesos.format(estimado)})`;
  // El texto nombra el valor certificado y no solo la diferencia: con cifras
  // largas, la diferencia cambia en los últimos dígitos ($1.999.985,
  // $1.999.850…) y, sin el valor al lado, el aviso parece no haberse movido.
  const certificado = formatoPesos.format(valor);
  if (valor === estimado) {
    return { tono: 'ok', texto: `${certificado} coincide con ${referencia}.` };
  }
  const diferencia = formatoPesos.format(Math.abs(valor - estimado));
  return valor < estimado
    ? {
        tono: 'aviso',
        texto: `${certificado} queda ${diferencia} por debajo de ${referencia}: no alcanza a cubrir lo que pide el contrato.`,
      }
    : {
        tono: 'aviso',
        texto: `${certificado} queda ${diferencia} por encima de ${referencia}: se aparta más de lo que pide el contrato.`,
      };
}

/**
 * El cargue del CDP (4.2).
 *
 * Desde la 103 el CDP se pide y se expide por fuera del aplicativo: aquí el
 * área solo carga el certificado que la Dirección Financiera ya expidió. Si lo
 * cargó desde el estudio previo, la 4.2 se cerró sola y aquí solo se consulta.
 */
export function PanelCdp({ procesoId, valorEstimado, onCambio }: Props) {
  const firma = useFirma(NUMERAL_CARGUE, 'Cargue del CDP');
  const dialogo = useDialogo();
  const [respaldo, setRespaldo] = useState<EstadoRespaldo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);

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

  const cargar = async () => {
    setCargando(true);
    try {
      const estado = await contratacionService.respaldoCdp(procesoId);
      setRespaldo(estado);
      // Sin pisar lo que se esté escribiendo: `cargar` se vuelve a llamar
      // después de cada acción. El rubro solo puede venir de una solicitud de
      // antes de la 103.
      setRubro((actual) => actual || estado.cdp?.rubro || '');
    } catch (err: any) {
      toast.error('No se pudo cargar el CDP', { id: 'cdp-carga', description: err.message });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [procesoId]);

  const ejecutar = async (accion: () => Promise<unknown>, exito: string) => {
    setTrabajando(true);
    try {
      await accion();
      toast.success(exito);
      await cargar();
      onCambio?.();
    } catch (err: any) {
      toast.error('No se pudo completar la acción', { description: err.message });
    } finally {
      setTrabajando(false);
    }
  };

  if (cargando) {
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

  const cdp = respaldo.cdp;

  if (cdp?.estado === 'EXPEDIDO') {
    const frente = frenteAlEstimado(cdp.valor, valorEstimado);
    return (
      <Marco>
        <Aviso tono="ok" titulo={`CDP ${cdp.numero} cargado`}>
          Por {cdp.valor !== null ? formatoPesos.format(cdp.valor) : '—'} del{' '}
          {cdp.fechaExpedicion}
          {cdp.rubro ? `, contra el rubro ${cdp.rubro}` : ''}. La partida quedó apartada y el
          proceso ya puede abrirse.
        </Aviso>
        {frente?.tono === 'aviso' && (
          <p className="text-[11px] font-bold text-amber-700 m-0 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
            {frente.texto}
          </p>
        )}
        <Origen cdp={cdp} conSoporte={respaldo.soporteAdjunto} />
        {!respaldo.soporteAdjunto && respaldo.puedeCargar && (
          <>
            <SelectorArchivo
              etiqueta="Soporte del CDP"
              archivo={soporte}
              onElegir={setSoporte}
              ayuda="Carga el certificado firmado para que quede en el expediente."
            />
            <Boton
              disabled={trabajando || !soporte}
              onClick={() =>
                ejecutar(
                  () => contratacionService.adjuntarCdp(procesoId, soporte!),
                  'Soporte del CDP adjuntado',
                )
              }
              icono={<Paperclip className="w-3.5 h-3.5" />}
            >
              Adjuntar soporte
            </Boton>
          </>
        )}
      </Marco>
    );
  }

  if (!respaldo.puedeCargar) {
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

  const valor = aNumero(valorTexto);
  const frente = frenteAlEstimado(valor, valorEstimado);
  const completo = !!rubro.trim() && !!numero.trim() && valor !== null && !!fecha && !!soporte;

  /*
   * Confirmar antes de cargar, con la comparación a la vista.
   *
   * Cargar el CDP desbloquea la apertura, y el valor es una cifra larga que se
   * teclea a mano: si no cuadra con el estimado, eso se tiene que ver antes de
   * confirmar, no en el aviso de después.
   */
  const confirmarCargue = async () => {
    if (!completo) return;
    const resumen =
      `CDP ${numero.trim()} por ${formatoPesos.format(valor!)} del ${fecha}, ` +
      `contra el rubro ${rubro.trim()}, con el soporte «${soporte!.name}».`;
    const confirmado = await dialogo.confirmar({
      titulo:
        frente?.tono === 'aviso'
          ? 'El valor no coincide con el estimado del proceso'
          : 'Confirmar el cargue del CDP',
      descripcion: `${resumen}${frente ? ` ${frente.texto}` : ''} Al confirmar, el proceso queda respaldado y la apertura deja de estar bloqueada.`,
      confirmar: 'Cargar el CDP',
    });
    if (!confirmado) return;
    firma.conFirma((firmaOtp) =>
      ejecutar(
        () =>
          contratacionService.cargarCdp(
            procesoId,
            {
              rubro: rubro.trim(),
              numero: numero.trim(),
              valor: valor!,
              fechaExpedicion: fecha,
              firma: firmaOtp,
            },
            soporte!,
          ),
        'CDP cargado',
      ),
    );
  };

  return (
    <Marco>
      <Titulo>Cargar el CDP</Titulo>
      <Ayuda>
        El CDP se solicita y se expide por fuera del aplicativo. Transcribe el certificado tal como
        lo expidió la Dirección Financiera y adjúntalo.
      </Ayuda>
      {cdp && (
        <Aviso tono="aviso" titulo="Quedó una solicitud de antes">
          Este proceso pidió el CDP cuando se tramitaba en el aplicativo
          {cdp.solicitadoPor ? ` (lo pidió ${cdp.solicitadoPor})` : ''}. Al cargar el certificado, la
          solicitud queda atendida con él.
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
        etiqueta="Certificado expedido"
        archivo={soporte}
        onElegir={setSoporte}
        ayuda="El CDP firmado: es la evidencia del certificado en el expediente."
      />
      <div className="flex items-center gap-2 flex-wrap">
        <Boton
          disabled={trabajando || !completo}
          onClick={confirmarCargue}
          icono={<FilePlus2 className="w-3.5 h-3.5" />}
        >
          Cargar el CDP
        </Boton>
      </div>
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
