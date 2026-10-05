import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, Info, Landmark, Paperclip, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { EstadoParticipacion, EstadoRespaldo } from '../../types';
import { momento } from '../shared/fechas';
import { useDialogo } from '../shared/useDialogo';
import { useFirma } from '../shared/useFirma';
import {
  Aviso,
  Boton,
  BotonSecundario,
  campo,
  Marco,
  Ayuda,
  Pendiente,
  SelectorArchivo,
  SinPermiso,
  Titulo,
} from '../shared/PiezasPanel';
import { PasoDeLaActividad, PasosDeLaActividad } from '../shared/PasosDeLaActividad';

interface Props {
  /** Cuál de las dos actividades del ciclo se está viendo: 4.1 o 4.2. */
  numeral: string;
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
  if (valor === estimado) return { tono: 'ok', texto: `Coincide con ${referencia}.` };
  const diferencia = formatoPesos.format(Math.abs(valor - estimado));
  return valor < estimado
    ? {
        tono: 'aviso',
        texto: `Queda ${diferencia} por debajo de ${referencia}: no alcanza a cubrir lo que pide el contrato.`,
      }
    : {
        tono: 'aviso',
        texto: `Queda ${diferencia} por encima de ${referencia}: se aparta más de lo que pide el contrato.`,
      };
}

/**
 * Una actividad del ciclo del CDP (etapa 4).
 *
 * Cada numeral muestra su propio paso y no el ciclo entero: el riel es
 * navegación, y si las dos llevaran al mismo contenido, seleccionar una u
 * otra daría igual y el usuario no sabría dónde está parado.
 */
export function PanelCdp({ numeral, procesoId, valorEstimado, onCambio }: Props) {
  // La 4.3 y la 4.4 se juntaron con la 4.2 (096): un enlace viejo cae en esta.
  const actividad = numeral === '4.1' ? '4.1' : '4.2';
  const firma = useFirma(actividad, `Actividad ${actividad} del CDP`);
  const dialogo = useDialogo();
  const [respaldo, setRespaldo] = useState<EstadoRespaldo | null>(null);
  /**
   * Quién lleva la solicitud, que no vive en el estado del respaldo.
   *
   * Se pide aparte y no se añade al payload del CDP a propósito: para
   * resolverlo allí, el servicio del CDP tendría que preguntarle al de
   * participación, y ese ya le pregunta a él desde que tomar el proceso puede
   * radicar la solicitud. Serían dos servicios dependiendo el uno del otro.
   */
  const [participacion, setParticipacion] = useState<EstadoParticipacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);

  const [valorTexto, setValorTexto] = useState('');
  const [numero, setNumero] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [motivo, setMotivo] = useState('');
  /** El rubro contra el que la Financiera verifica y expide. */
  const [rubro, setRubro] = useState('');
  const [soporte, setSoporte] = useState<File | null>(null);

  const cargar = async () => {
    setCargando(true);
    try {
      // Las dos a la vez: quién la lleva se lee junto al estado del CDP, y en
      // serie el panel parpadearía dos veces al abrirse.
      const [estado, quienes] = await Promise.all([
        contratacionService.respaldoCdp(procesoId),
        contratacionService.participacion(procesoId),
      ]);
      setRespaldo(estado);
      setParticipacion(quienes);
      // Sin pisar lo que se esté escribiendo: `cargar` se vuelve a llamar
      // después de cada acción, y un setState plano borraría el rubro a medio
      // teclear si la recarga llega antes de enviarlo.
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
  const estado = cdp?.estado ?? null;
  const financiera = participacion?.financiera ?? null;
  const puedeTomarla = participacion?.puedeTomarFinanciera === true;

  /*
   * Hacerse cargo de la solicitud, el mismo paso en la 4.1 y en la 4.2.
   *
   * La 4.1 se aprueba sola al radicarse, así que al entrar al proceso se abre
   * la 4.2; si el botón solo estuviera en la 4.1, la Financiera tendría que
   * volver atrás a buscarlo.
   */
  const pasoCargo: PasoDeLaActividad = !cdp
    ? {
        titulo: 'Hacerse cargo en la Dirección Financiera',
        estado: 'espera',
        detalle: 'Cuando llegue la solicitud, alguien de la Dirección Financiera la toma.',
      }
    : financiera
      ? {
          titulo: 'Hacerse cargo en la Dirección Financiera',
          estado: 'hecho',
          detalle: `${financiera.nombre}${financiera.esMio ? ' (tú)' : ''} · desde el ${momento(
            financiera.asignadoAt,
          )}`,
        }
      : puedeTomarla
        ? {
            titulo: 'Hacerse cargo en la Dirección Financiera',
            estado: 'te-toca',
            detalle:
              'La solicitud llegó y todavía no la lleva nadie. Quien se haga cargo verifica la disponibilidad y expide el CDP.',
            children: (
              <Boton
                disabled={trabajando}
                onClick={() =>
                  ejecutar(
                    () => contratacionService.tomarSolicitudCdp(procesoId),
                    'Ya estás a cargo de esta solicitud.',
                  )
                }
                icono={<Landmark className="w-3.5 h-3.5" />}
              >
                Hacerme cargo
              </Boton>
            ),
          }
        : {
            titulo: 'Hacerse cargo en la Dirección Financiera',
            estado: 'le-toca',
            detalle:
              'Todavía no la lleva nadie: está esperando a que alguien de la Dirección Financiera se haga cargo.',
          };

  // ------------------------------------------------------------ 4.1 ------
  /*
   * Dejó de ser un formulario.
   *
   * El estudio previo aprobado ya es la solicitud formal, así que al cerrarse
   * la etapa 3 la solicitud se radica sola y aquí no hay nada que diligenciar:
   * lo que queda es ver qué se pidió y quién de la Financiera se hace cargo.
   */
  if (actividad === '4.1') {
    // ---------------------------------------- paso 1 · la solicitud ----
    const pasoSolicitud: PasoDeLaActividad = cdp
      ? {
          titulo: 'Radicar la solicitud de CDP',
          estado: 'hecho',
          // El rubro solo se nombra si lo hay: el automático nace sin él —lo
          // pone la Financiera al expedir— y un «rubro —» se lee como un dato
          // que falta por diligenciar, que es justo lo que ya no es.
          detalle: `${cdp.solicitadoPor ? `${cdp.solicitadoPor} · ` : ''}por ${
            cdp.valor !== null ? formatoPesos.format(cdp.valor) : '—'
          }${cdp.rubro ? ` contra el rubro ${cdp.rubro}` : ''}`,
        }
      : {
          titulo: 'Radicar la solicitud de CDP',
          estado: 'espera',
          detalle:
            'Se radica sola al cerrarse la última actividad de la etapa 3 que aplique: el estudio previo aprobado es la solicitud.',
        };

    // ------------------------------------ paso 3 · lo que sigue --------
    const verificada = estado === 'VERIFICADO' || estado === 'EXPEDIDO';
    const pasoVerificacion: PasoDeLaActividad = verificada
      ? {
          titulo: 'Verificar la disponibilidad presupuestal',
          estado: 'hecho',
          detalle: `Confirmada${cdp?.rubro ? ` en el rubro ${cdp.rubro}` : ''}.`,
        }
      : estado === 'RECHAZADO'
        ? {
            titulo: 'Verificar la disponibilidad presupuestal',
            estado: 'le-toca',
            etiqueta: 'Rechazada',
            detalle: cdp?.observaciones ?? 'La Dirección Financiera rechazó la solicitud.',
          }
        : financiera
          ? {
              titulo: 'Verificar la disponibilidad presupuestal',
              estado: 'despues',
              etiqueta: 'Sigue en 4.2',
              detalle: financiera.esMio
                ? 'Te toca a ti: indica el rubro y confirma que tiene saldo.'
                : `${financiera.nombre} indica el rubro y confirma que tiene saldo.`,
            }
          : {
              titulo: 'Verificar la disponibilidad presupuestal',
              estado: 'espera',
              detalle: 'Empieza en cuanto la solicitud tenga quien la lleve.',
            };

    return (
      <Marco>
        <Titulo>Solicitud de CDP</Titulo>
        <Ayuda>
          La solicitud la recibe la Dirección Financiera, que verifica la disponibilidad y expide
          el certificado.
        </Ayuda>
        <PasosDeLaActividad pasos={[pasoSolicitud, pasoCargo, pasoVerificacion]} />
      </Marco>
    );
  }

  // ------------------------------------------------------------ 4.2 ------
  /*
   * Verificar, expedir y adjuntar, en una sola pantalla.
   *
   * Eran la 4.2, la 4.3 y la 4.4 (hasta la migración 096). Las hace la misma
   * persona de la Financiera una detrás de otra y con el certificado ya en la
   * mano, así que van en un formulario y una sola confirmación. Un enlace viejo
   * a la 4.3 o la 4.4 cae aquí.
   */
  if (!cdp) return <Marco><Pendiente falta="4.1" texto="Aún no se ha radicado la solicitud de CDP." /></Marco>;
  if (estado === 'RECHAZADO') {
    return (
      <Marco>
        <Aviso tono="error" titulo="Solicitud rechazada">
          {cdp.observaciones}
        </Aviso>
      </Marco>
    );
  }
  if (estado === 'EXPEDIDO') {
    const frente = frenteAlEstimado(cdp.valor, valorEstimado);
    return (
      <Marco>
        <Aviso tono="ok" titulo={`CDP ${cdp.numero} expedido`}>
          Por {cdp.valor !== null ? formatoPesos.format(cdp.valor) : '—'} el{' '}
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
        <Origen conSoporte={respaldo.soporteAdjunto} />
        {/* Solo para los CDP expedidos antes de que el soporte fuera con la
            expedición: los de ahora no pueden quedar sin él. */}
        {!respaldo.soporteAdjunto && respaldo.puedeGestionar && (
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
  // Mientras nadie la ha tomado, lo que toca es hacerse cargo: se ofrece
  // aquí mismo y la expedición espera a que la solicitud tenga quien la
  // lleve, como dice la 4.1.
  if (!financiera) {
    return (
      <Marco>
        <Titulo>Expedir el CDP</Titulo>
        <Ayuda>
          Antes de expedir, alguien de la Dirección Financiera se hace cargo de la solicitud.
        </Ayuda>
        <PasosDeLaActividad
          pasos={[
            pasoCargo,
            {
              titulo: 'Verificar la disponibilidad y expedir el CDP',
              estado: 'espera',
              detalle: 'Se habilita en cuanto la solicitud tenga quien la lleve.',
            },
          ]}
        />
      </Marco>
    );
  }
  if (!respaldo.puedeGestionar) {
    return <Marco><SinPermiso quien="la Dirección Financiera" /></Marco>;
  }

  const valor = aNumero(valorTexto);
  const frente = frenteAlEstimado(valor, valorEstimado);
  const completo = !!rubro.trim() && !!numero.trim() && valor !== null && !!fecha && !!soporte;

  /*
   * Confirmar antes de expedir, con la comparación a la vista.
   *
   * Expedir aparta la partida y desbloquea la apertura, y el valor es una
   * cifra larga que se teclea a mano: si no cuadra con el estimado, eso se
   * tiene que ver antes de confirmar, no en el aviso de después.
   */
  const expedir = async () => {
    if (!completo) return;
    const resumen =
      `CDP ${numero.trim()} por ${formatoPesos.format(valor!)} del ${fecha}, ` +
      `contra el rubro ${rubro.trim()}, con el soporte «${soporte!.name}».`;
    const confirmado = await dialogo.confirmar({
      titulo:
        frente?.tono === 'aviso'
          ? 'El valor no coincide con el estimado del proceso'
          : 'Confirmar la expedición del CDP',
      descripcion: `${resumen}${frente ? ` ${frente.texto}` : ''} Al confirmar, la partida queda apartada para el proceso y la apertura deja de estar bloqueada.`,
      confirmar: 'Expedir el CDP',
    });
    if (!confirmado) return;
    firma.conFirma((firmaOtp) =>
      ejecutar(
        () =>
          contratacionService.expedirCdpConSoporte(
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
        'CDP expedido',
      ),
    );
  };

  return (
    <Marco>
      <Titulo>Expedir el CDP</Titulo>
      <Ayuda>
        Indica el rubro con saldo para cubrir{' '}
        {cdp.valor !== null ? formatoPesos.format(cdp.valor) : 'el valor solicitado'}, registra el
        certificado emitido y adjúntalo. Si no hay saldo, rechaza indicando el motivo.
      </Ayuda>
      {/* El rubro se escribe aquí porque la solicitud llega sin él: el
          estudio previo no lo captura y la radicación automática no tiene de
          dónde sacarlo. Un área que lo conociera pudo adelantarlo, y entonces
          llega escrito y solo hay que confirmarlo o corregirlo. */}
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
        ayuda="El CDP firmado: es la evidencia del certificado en el expediente."
      />
      <div className="flex items-center gap-2 flex-wrap">
        <Boton
          disabled={trabajando || !completo}
          onClick={expedir}
          icono={<Check className="w-3.5 h-3.5" strokeWidth={3} />}
        >
          Expedir el CDP
        </Boton>
      </div>
      <div className="pt-2 border-t border-gray-200 space-y-2">
        <Ayuda>¿No hay saldo? Indica el motivo para que el área sepa qué corregir.</Ayuda>
        <input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Motivo del rechazo"
          aria-label="Motivo del rechazo"
          className={campo}
        />
        <BotonSecundario
          disabled={trabajando || !motivo.trim()}
          onClick={() =>
            ejecutar(
              () => contratacionService.rechazarCdp(procesoId, motivo.trim()),
              'Solicitud rechazada',
            )
          }
          icono={<Undo2 className="w-3.5 h-3.5" />}
        >
          Rechazar solicitud
        </BotonSecundario>
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
 * registra a mano y el soporte cargado en el expediente es la única evidencia
 * de que existe. Quien consulta debe saberlo, y saber si esa evidencia está.
 */
const Origen = ({ conSoporte }: { conSoporte: boolean }) => (
  <p className="text-[10.5px] text-slate-500 m-0 flex items-start gap-1.5 leading-relaxed">
    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
    {conSoporte
      ? 'Registrado por la Dirección Financiera. El soporte adjunto es la evidencia del certificado.'
      : 'Registrado por la Dirección Financiera. Aún sin soporte adjunto: el certificado no tiene evidencia en el expediente.'}
  </p>
);
