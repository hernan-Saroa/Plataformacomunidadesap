import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  Check,
  FileUp,
  Info,
  Paperclip,
  Receipt,
  Undo2,
} from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { DatosPago, EstadoPago, EstadoPagos, PagoContrato, TipoSoportePago } from '../../types';
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

const pesos = (valor: number | null) =>
  valor == null
    ? '—'
    : new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(valor);

/** Cómo se pinta cada estado. El color tiene que decir lo mismo que la palabra. */
const TONO: Record<EstadoPago, { fondo: string; texto: string; etiqueta: string }> = {
  RADICADO: { fondo: 'bg-blue-50 border-blue-200', texto: 'text-[#003DA5]', etiqueta: 'Radicada' },
  AVALADO: {
    fondo: 'bg-amber-50 border-amber-200',
    texto: 'text-amber-900',
    etiqueta: 'Avalada · falta trámite',
  },
  DEVUELTO: {
    fondo: 'bg-orange-50 border-orange-200',
    texto: 'text-orange-900',
    etiqueta: 'Devuelta',
  },
  TRAMITADO: {
    fondo: 'bg-emerald-50 border-emerald-200',
    texto: 'text-emerald-900',
    etiqueta: 'Pago tramitado',
  },
  ANULADO: { fondo: 'bg-slate-50 border-slate-200', texto: 'text-slate-500', etiqueta: 'Anulada' },
};

const ETIQUETA_SOPORTE: Record<TipoSoportePago, string> = {
  SEGURIDAD_SOCIAL: 'Seguridad social',
  RUT: 'RUT',
  CERTIFICACION_BANCARIA: 'Certificación bancaria',
  OTRO: 'Otro anexo',
};

const VACIO = {
  periodoDesde: hoyEnBogota(),
  periodoHasta: hoyEnBogota(),
  valor: '',
};

/**
 * Actividad 9.4 · Trámite de pagos (EFDS-1170).
 *
 * Tres actos con tres responsables, y la pantalla los mantiene separados: se
 * radica la cuenta, el supervisor la avala o la devuelve, y Financiera la
 * tramita. El botón de avalar solo aparece para quien de verdad puede darlo.
 *
 * La integración con Click quedó fuera del alcance, así que los soportes se
 * cargan a mano. Se dice de frente en la pantalla: es la carga triple que la
 * historia quería quitar, y esconderla haría creer que el problema se resolvió.
 */
export function PanelPagos({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoPagos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [radicando, setRadicando] = useState(false);
  const [datos, setDatos] = useState(VACIO);
  const [factura, setFactura] = useState<File | null>(null);
  const [informe, setInforme] = useState<File | null>(null);

  const [soporteDe, setSoporteDe] = useState<string | null>(null);
  const [tipoSoporte, setTipoSoporte] = useState<TipoSoportePago>('SEGURIDAD_SOCIAL');
  const [archivoSoporte, setArchivoSoporte] = useState<File | null>(null);

  const leer = () =>
    contratacionService
      .pagos(procesoId)
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
    setDatos(VACIO);
    setFactura(null);
    setInforme(null);
    setRadicando(false);
  };

  const limpiarSoporte = () => {
    setSoporteDe(null);
    setTipoSoporte('SEGURIDAD_SOCIAL');
    setArchivoSoporte(null);
  };

  /** Envuelve la acción para no repetir el guardando/toast/onCambio en cada una. */
  const ejecutar = async (accion: () => Promise<EstadoPagos>, exito: string) => {
    setGuardando(true);
    try {
      setEstado(await accion());
      toast.success(exito);
      onCambio?.();
      return true;
    } catch (err: any) {
      toast.error(err.message);
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const radicar = async () => {
    if (!factura || !informe) return;

    const cuerpo: DatosPago = {
      periodoDesde: datos.periodoDesde,
      periodoHasta: datos.periodoHasta,
      valor: Number(datos.valor),
    };

    const listo = await ejecutar(
      () => contratacionService.radicarPago(procesoId, cuerpo, factura, informe),
      'Cuenta de cobro radicada',
    );
    if (listo) limpiar();
  };

  const cargarSoporte = async () => {
    if (!soporteDe || !archivoSoporte) return;

    const listo = await ejecutar(
      () =>
        contratacionService.cargarSoportePago(procesoId, soporteDe, tipoSoporte, archivoSoporte),
      'Soporte cargado',
    );
    if (listo) limpiarSoporte();
  };

  const avalar = (pagoId: string) => {
    const observacion = window.prompt('Observación al avalar (opcional)')?.trim();
    return ejecutar(
      () => contratacionService.avalarPago(procesoId, pagoId, observacion || undefined),
      'Cuenta avalada; queda el trámite de Financiera',
    );
  };

  const devolver = (pagoId: string) => {
    const motivo = window.prompt('¿Qué debe corregir el contratista?')?.trim();
    if (!motivo) return;
    return ejecutar(
      () => contratacionService.devolverPago(procesoId, pagoId, motivo),
      'Cuenta devuelta para corrección',
    );
  };

  const tramitar = (pagoId: string) => {
    const referencia = window.prompt('¿Con qué referencia se tramitó el pago?')?.trim();
    if (!referencia) return;
    return ejecutar(
      () => contratacionService.tramitarPago(procesoId, pagoId, referencia),
      'Pago tramitado',
    );
  };

  const anular = (pagoId: string) => {
    const motivo = window.prompt('¿Por qué se anula la cuenta de cobro?')?.trim();
    if (!motivo) return;
    return ejecutar(
      () => contratacionService.anularPago(procesoId, pagoId, motivo),
      'Cuenta anulada',
    );
  };

  if (cargando) {
    return (
      <Marco>
        <p className="text-[11.5px] text-slate-400 m-0">Cargando el trámite de pagos…</p>
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

  const completo = factura && informe && Number(datos.valor) > 0;

  return (
    <Marco>
      <Titulo>Trámite de pagos</Titulo>
      <Ayuda>
        El contratista presenta su cuenta de cobro con la factura y el informe de actividades, el
        supervisor la avala y la Dirección Financiera tramita el pago.
      </Ayuda>

      {!estado.admitePagos ? (
        <Pendiente
          falta="9.1"
          texto={`Todavía no hay cuentas que cobrar: ${
            estado.motivoNoAdmite ?? 'el contrato no está en ejecución'
          }.`}
        />
      ) : null}

      {/* Se dice de frente en vez de disimularlo: es lo que la historia quería
          quitar, y esconderlo haría creer que el problema ya se resolvió. */}
      {estado.admitePagos && !estado.integracionClick ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
            <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed">
              La integración con Click no está disponible: la seguridad social, el RUT y demás
              soportes se cargan a mano con cada cuenta.
            </p>
          </div>
        </div>
      ) : null}

      {estado.contrato && estado.admitePagos ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3">
          <div className="flex items-start gap-2.5">
            <Banknote className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#003DA5]" />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-bold text-slate-800 m-0">
                Contrato {estado.contrato.numero} · {pesos(estado.contrato.valor)}
              </p>
              <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed tabular-nums">
                Cobrado {pesos(estado.resumen.cobrado)} · tramitado{' '}
                {pesos(estado.resumen.tramitado)} · saldo {pesos(estado.resumen.saldo)}
              </p>
              {estado.contrato.fechaInicio ? (
                <p className="text-[11px] text-slate-400 m-0 mt-0.5">
                  En ejecución desde el {fechaLarga(estado.contrato.fechaInicio)}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Se avisa, no se bloquea: la decisión de pagar es de la entidad. */}
      {estado.resumen.advertencia ? (
        <Aviso tono="aviso" titulo="Lo cobrado supera el valor del contrato">
          {estado.resumen.advertencia}
        </Aviso>
      ) : null}

      {estado.pagos.length > 0 ? (
        <div className="space-y-2.5">
          {estado.pagos.map((pago) => (
            <CuentaDeCobro
              key={pago.id}
              pago={pago}
              esSupervisor={estado.esSupervisor}
              guardando={guardando}
              onAvalar={() => avalar(pago.id)}
              onDevolver={() => devolver(pago.id)}
              onTramitar={() => tramitar(pago.id)}
              onAnular={() => anular(pago.id)}
              onSoporte={() => setSoporteDe(pago.id)}
              soporteAbierto={soporteDe === pago.id}
              tipoSoporte={tipoSoporte}
              onTipoSoporte={setTipoSoporte}
              archivoSoporte={archivoSoporte}
              onArchivoSoporte={setArchivoSoporte}
              onGuardarSoporte={cargarSoporte}
              onCancelarSoporte={limpiarSoporte}
            />
          ))}
        </div>
      ) : null}

      {estado.puedeRadicar && !radicando ? (
        <Boton icono={<Receipt className="w-3.5 h-3.5" />} onClick={() => setRadicando(true)}>
          Radicar cuenta de cobro
        </Boton>
      ) : null}

      {estado.puedeRadicar && radicando ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Nueva cuenta de cobro</p>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="pago-desde" className="block text-xs font-bold text-gray-600 mb-1.5">
                Periodo desde <span className="text-red-600">*</span>
              </label>
              <input
                id="pago-desde"
                type="date"
                value={datos.periodoDesde}
                min={estado.contrato?.fechaInicio ?? undefined}
                onChange={(e) => setDatos((p) => ({ ...p, periodoDesde: e.target.value }))}
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="pago-hasta" className="block text-xs font-bold text-gray-600 mb-1.5">
                Periodo hasta <span className="text-red-600">*</span>
              </label>
              <input
                id="pago-hasta"
                type="date"
                value={datos.periodoHasta}
                min={datos.periodoDesde}
                onChange={(e) => setDatos((p) => ({ ...p, periodoHasta: e.target.value }))}
                className={campo}
              />
            </div>
          </div>

          <div>
            <label htmlFor="pago-valor" className="block text-xs font-bold text-gray-600 mb-1.5">
              Valor cobrado <span className="text-red-600">*</span>
            </label>
            <input
              id="pago-valor"
              type="number"
              min={1}
              value={datos.valor}
              onChange={(e) => setDatos((p) => ({ ...p, valor: e.target.value }))}
              placeholder="0"
              className={campo}
            />
            {Number(datos.valor) > 0 ? (
              <p className="text-[11px] text-slate-500 m-0 mt-1 tabular-nums">
                {pesos(Number(datos.valor))}
              </p>
            ) : null}
          </div>

          <SelectorArchivo
            id="pago-factura"
            etiqueta="Factura o cuenta de cobro"
            ayuda="Lo que se cobra."
            archivo={factura}
            onElegir={setFactura}
          />

          <SelectorArchivo
            id="pago-informe"
            etiqueta="Informe de actividades"
            ayuda="Lo que sustenta que la prestación se cumplió."
            archivo={informe}
            onElegir={setInforme}
          />

          <div className="flex flex-wrap gap-2">
            <Boton
              icono={<Receipt className="w-3.5 h-3.5" />}
              disabled={guardando || !completo}
              onClick={radicar}
            >
              Radicar
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

interface CuentaProps {
  pago: PagoContrato;
  esSupervisor: boolean;
  guardando: boolean;
  onAvalar: () => void;
  onDevolver: () => void;
  onTramitar: () => void;
  onAnular: () => void;
  onSoporte: () => void;
  soporteAbierto: boolean;
  tipoSoporte: TipoSoportePago;
  onTipoSoporte: (tipo: TipoSoportePago) => void;
  archivoSoporte: File | null;
  onArchivoSoporte: (archivo: File | null) => void;
  onGuardarSoporte: () => void;
  onCancelarSoporte: () => void;
}

/** Una cuenta de cobro con sus documentos y lo que se puede hacer con ella. */
function CuentaDeCobro({
  pago,
  esSupervisor,
  guardando,
  onAvalar,
  onDevolver,
  onTramitar,
  onAnular,
  onSoporte,
  soporteAbierto,
  tipoSoporte,
  onTipoSoporte,
  archivoSoporte,
  onArchivoSoporte,
  onGuardarSoporte,
  onCancelarSoporte,
}: CuentaProps) {
  const tono = TONO[pago.estado];
  const cerrada = pago.estado === 'TRAMITADO' || pago.estado === 'ANULADO';

  return (
    <div className={`rounded-lg border px-3.5 py-3 space-y-2.5 ${tono.fondo}`}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <p className={`text-[12.5px] font-bold m-0 ${tono.texto}`}>
            Pago {pago.numero} · {pesos(pago.valor)}
          </p>
          <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed">
            Del {fechaLarga(pago.periodoDesde)} al {fechaLarga(pago.periodoHasta)}
          </p>
        </div>
        <span
          className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-white/70 ${tono.texto}`}
        >
          {tono.etiqueta}
        </span>
      </div>

      {/* El motivo de la devolución va destacado: es lo que hay que corregir. */}
      {pago.estado === 'DEVUELTO' && pago.motivoDevolucion ? (
        <div className="flex items-start gap-2 text-[11.5px] text-orange-900">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span className="break-words">{pago.motivoDevolucion}</span>
        </div>
      ) : null}

      {pago.estado === 'ANULADO' && pago.motivoAnulacion ? (
        <p className="text-[11.5px] text-slate-500 m-0 break-words">{pago.motivoAnulacion}</p>
      ) : null}

      {pago.avaladoPor && pago.estado !== 'DEVUELTO' ? (
        <p className="text-[11px] text-slate-500 m-0">
          Avalada por {pago.avaladoPor}
          {pago.avaladoAt ? ` el ${momento(pago.avaladoAt)}` : ''}
          {pago.observacionAval ? ` · ${pago.observacionAval}` : ''}
        </p>
      ) : null}

      {pago.estado === 'TRAMITADO' ? (
        <p className="text-[11px] text-emerald-900 m-0">
          Tramitado{pago.tramitadoAt ? ` el ${momento(pago.tramitadoAt)}` : ''}
          {pago.referenciaPago ? ` · referencia ${pago.referenciaPago}` : ''}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {[pago.factura, pago.informe].map((doc, indice) =>
          doc?.url ? (
            <a
              key={`${doc.url}-${indice}`}
              href={contratacionService.urlDescarga(doc.url)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-[#003DA5] hover:underline"
            >
              <Paperclip className="w-3.5 h-3.5" />
              {indice === 0 ? 'Factura' : 'Informe'}
            </a>
          ) : null,
        )}
        {pago.soportes.map((soporte) =>
          soporte.documento?.url ? (
            <a
              key={soporte.id}
              href={contratacionService.urlDescarga(soporte.documento.url)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[11.5px] text-slate-600 hover:underline"
            >
              <Paperclip className="w-3.5 h-3.5" />
              {ETIQUETA_SOPORTE[soporte.tipo]}
            </a>
          ) : null,
        )}
      </div>

      {!cerrada ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {/* Avalar y devolver solo para quien puede: un botón que siempre
              falla es peor que no mostrarlo. */}
          {esSupervisor && (pago.estado === 'RADICADO' || pago.estado === 'AVALADO') ? (
            <>
              {pago.estado === 'RADICADO' ? (
                <BotonSecundario
                  icono={<Check className="w-3.5 h-3.5" strokeWidth={3} />}
                  disabled={guardando}
                  onClick={onAvalar}
                >
                  Avalar
                </BotonSecundario>
              ) : null}
              <BotonSecundario
                icono={<Undo2 className="w-3.5 h-3.5" />}
                disabled={guardando}
                onClick={onDevolver}
              >
                Devolver
              </BotonSecundario>
            </>
          ) : null}

          {pago.estado === 'AVALADO' ? (
            <BotonSecundario
              icono={<Banknote className="w-3.5 h-3.5" />}
              disabled={guardando}
              onClick={onTramitar}
            >
              Tramitar el pago
            </BotonSecundario>
          ) : null}

          <BotonSecundario
            icono={<FileUp className="w-3.5 h-3.5" />}
            disabled={guardando}
            onClick={onSoporte}
          >
            Cargar soporte
          </BotonSecundario>

          <BotonSecundario
            icono={<Undo2 className="w-3.5 h-3.5" />}
            disabled={guardando}
            onClick={onAnular}
          >
            Anular
          </BotonSecundario>
        </div>
      ) : null}

      {soporteAbierto ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 space-y-2.5">
          <div>
            <label
              htmlFor={`soporte-tipo-${pago.id}`}
              className="block text-xs font-bold text-gray-600 mb-1.5"
            >
              Qué se adjunta
            </label>
            <select
              id={`soporte-tipo-${pago.id}`}
              value={tipoSoporte}
              onChange={(e) => onTipoSoporte(e.target.value as TipoSoportePago)}
              className={campo}
            >
              {(Object.keys(ETIQUETA_SOPORTE) as TipoSoportePago[]).map((tipo) => (
                <option key={tipo} value={tipo}>
                  {ETIQUETA_SOPORTE[tipo]}
                </option>
              ))}
            </select>
          </div>

          <SelectorArchivo
            id={`soporte-archivo-${pago.id}`}
            etiqueta="Soporte"
            ayuda="El documento que acompaña la cuenta."
            archivo={archivoSoporte}
            onElegir={onArchivoSoporte}
          />

          <div className="flex flex-wrap gap-2">
            <Boton
              icono={<FileUp className="w-3.5 h-3.5" />}
              disabled={guardando || !archivoSoporte}
              onClick={onGuardarSoporte}
            >
              Cargar
            </Boton>
            <BotonSecundario
              icono={<Undo2 className="w-3.5 h-3.5" />}
              disabled={guardando}
              onClick={onCancelarSoporte}
            >
              Cancelar
            </BotonSecundario>
          </div>
        </div>
      ) : null}
    </div>
  );
}
