import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  MinusCircle,
  Package,
  Paperclip,
  Plus,
  Undo2,
} from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  BalanceEjecucion,
  DatosEntregable,
  DatosInformeFinal,
  EntregableInforme,
  EstadoInformeFinal,
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

const VACIO = {
  fechaElaboracion: hoyEnBogota(),
  conclusion: '',
};

const ENTREGABLE_VACIO = {
  descripcion: '',
  fechaEntrega: '',
  observacion: '',
};

/**
 * Actividad 10.1 · Informe final de ejecución (EFDS-1171).
 *
 * Lo que el supervisor firma para cerrar su vigilancia, y sobre lo que después
 * se liquida el contrato.
 *
 * La pantalla insiste en una distinción que el usuario no tiene por qué
 * suponer: el balance del informe está **congelado** —dice lo que era cierto el
 * día en que se firmó— y el balance de hoy puede ser otro. Cuando difieren, se
 * ven los dos.
 */
export function PanelInformeFinal({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoInformeFinal | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [elaborando, setElaborando] = useState(false);
  const [datos, setDatos] = useState(VACIO);
  const [informe, setInforme] = useState<File | null>(null);

  const [agregando, setAgregando] = useState(false);
  const [entregable, setEntregable] = useState(ENTREGABLE_VACIO);
  const [soporte, setSoporte] = useState<File | null>(null);

  const leer = () =>
    contratacionService
      .informeFinal(procesoId)
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

  const ejecutar = async (accion: () => Promise<EstadoInformeFinal>, exito: string) => {
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

  const elaborar = async () => {
    if (!informe) return;

    const cuerpo: DatosInformeFinal = {
      fechaElaboracion: datos.fechaElaboracion,
      conclusion: datos.conclusion.trim(),
    };

    const listo = await ejecutar(
      () => contratacionService.elaborarInformeFinal(procesoId, cuerpo, informe),
      'Informe final elaborado; el balance queda congelado',
    );
    if (listo) {
      setDatos(VACIO);
      setInforme(null);
      setElaborando(false);
    }
  };

  const agregarEntregable = async () => {
    if (!entregable.descripcion.trim()) return;

    const cuerpo: DatosEntregable = {
      descripcion: entregable.descripcion.trim(),
      ...(entregable.fechaEntrega ? { fechaEntrega: entregable.fechaEntrega } : {}),
      ...(entregable.observacion.trim() ? { observacion: entregable.observacion.trim() } : {}),
    };

    const listo = await ejecutar(
      () => contratacionService.agregarEntregable(procesoId, cuerpo, soporte),
      'Entregable sumado al consolidado',
    );
    if (listo) {
      setEntregable(ENTREGABLE_VACIO);
      setSoporte(null);
      setAgregando(false);
    }
  };

  const anular = () => {
    const motivo = window.prompt('¿Por qué se anula el informe final?')?.trim();
    if (!motivo) return;
    return ejecutar(
      () => contratacionService.anularInformeFinal(procesoId, motivo),
      'Informe anulado; puedes elaborar otro',
    );
  };

  if (cargando) {
    return (
      <Marco>
        <p className="text-[11.5px] text-slate-400 m-0">Cargando el informe final…</p>
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

  const completo = informe && datos.conclusion.trim().length >= 20;

  return (
    <Marco>
      <Titulo>Informe final de ejecución</Titulo>
      <Ayuda>
        El supervisor cierra su vigilancia con el consolidado de entregables y el balance de la
        ejecución. Es lo que soporta la liquidación del contrato.
      </Ayuda>

      {!estado.admiteInforme ? (
        <Pendiente
          falta="9.1"
          texto={`Todavía no hay ejecución que informar: ${
            estado.motivoNoAdmite ?? 'el contrato no está en ejecución'
          }.`}
        />
      ) : null}

      {estado.admiteInforme && !estado.supervisor ? (
        <Pendiente
          falta="8.2"
          texto="Falta designar el supervisor del contrato: es quien firma el informe final."
        />
      ) : null}

      {/* Se avisa, no se bloquea: el balance no las incluirá, pero cerrar con un
          cobro en disputa es decisión de la entidad. */}
      {estado.advertencia && !estado.informe ? (
        <Aviso tono="aviso" titulo="Quedan cuentas de cobro sin tramitar">
          {estado.advertencia}
        </Aviso>
      ) : null}

      {estado.informe ? (
        <>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3">
            <div className="flex items-start gap-2.5">
              <ClipboardCheck className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-900" />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-bold text-emerald-900 m-0">
                  Informe del {fechaLarga(estado.informe.fechaElaboracion)}
                </p>
                <p className="text-[11.5px] text-emerald-900 m-0 mt-0.5 leading-relaxed break-words">
                  {estado.informe.elaboradoPor
                    ? `Firmado por ${estado.informe.elaboradoPor}`
                    : 'Firmado por el supervisor'}
                </p>
                {estado.informe.documento?.url ? (
                  <a
                    href={contratacionService.urlDescarga(estado.informe.documento.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 mt-1.5 text-[11.5px] font-bold text-[#003DA5] hover:underline"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    {estado.informe.documento.nombre}
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3">
            <p className="text-[12.5px] font-bold text-slate-800 m-0 mb-1">Conclusión</p>
            <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed whitespace-pre-line break-words">
              {estado.informe.conclusion}
            </p>
          </div>

          <Balance titulo="Balance del informe" balance={estado.informe.balance} congelado />

          {/* Solo cuando difieren: si son iguales, mostrarlos dos veces sería
              ruido. Cuando difieren, es información que cambia decisiones. */}
          {estado.balanceActual &&
          estado.balanceActual.valorPagado !== estado.informe.balance.valorPagado ? (
            <Aviso tono="aviso" titulo="El balance de hoy ya no es el del informe">
              Hoy van {pesos(estado.balanceActual.valorPagado)} pagados. El informe congeló{' '}
              {pesos(estado.informe.balance.valorPagado)}: si la diferencia importa, anúlalo y
              elabora otro.
            </Aviso>
          ) : null}

          <Entregables entregables={estado.informe.entregables} />

          {estado.esSupervisor ? (
            <div className="flex flex-wrap gap-2">
              {!agregando ? (
                <BotonSecundario
                  icono={<Plus className="w-3.5 h-3.5" />}
                  disabled={guardando}
                  onClick={() => setAgregando(true)}
                >
                  Sumar entregable
                </BotonSecundario>
              ) : null}
              <BotonSecundario
                icono={<Undo2 className="w-3.5 h-3.5" />}
                disabled={guardando}
                onClick={anular}
              >
                Anular el informe
              </BotonSecundario>
            </div>
          ) : null}

          {agregando ? (
            <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
              <p className="text-[12.5px] font-bold text-slate-800 m-0">Nuevo entregable</p>

              <div>
                <label htmlFor="ent-desc" className="block text-xs font-bold text-gray-600 mb-1.5">
                  Qué se entregó <span className="text-red-600">*</span>
                </label>
                <input
                  id="ent-desc"
                  type="text"
                  value={entregable.descripcion}
                  onChange={(e) =>
                    setEntregable((p) => ({ ...p, descripcion: e.target.value }))
                  }
                  placeholder="Informe técnico del cuarto trimestre"
                  className={campo}
                />
              </div>

              <div>
                <label
                  htmlFor="ent-fecha"
                  className="block text-xs font-bold text-gray-600 mb-1.5"
                >
                  Fecha de entrega
                </label>
                <input
                  id="ent-fecha"
                  type="date"
                  value={entregable.fechaEntrega}
                  onChange={(e) =>
                    setEntregable((p) => ({ ...p, fechaEntrega: e.target.value }))
                  }
                  className={campo}
                />
                {/* Se dice antes de que lo tomen por un olvido. */}
                <p className="text-[11px] text-slate-500 m-0 mt-1">
                  Déjala vacía si el entregable se pactó y no se cumplió: el informe también
                  sirve para decir qué faltó.
                </p>
              </div>

              <div>
                <label htmlFor="ent-obs" className="block text-xs font-bold text-gray-600 mb-1.5">
                  Observación
                </label>
                <textarea
                  id="ent-obs"
                  rows={2}
                  value={entregable.observacion}
                  onChange={(e) =>
                    setEntregable((p) => ({ ...p, observacion: e.target.value }))
                  }
                  className={campo}
                />
              </div>

              <SelectorArchivo
                id="ent-soporte"
                etiqueta="Soporte (opcional)"
                ayuda="Solo si el entregable no está ya en el expediente."
                archivo={soporte}
                onElegir={setSoporte}
              />

              <div className="flex flex-wrap gap-2">
                <Boton
                  icono={<Plus className="w-3.5 h-3.5" />}
                  disabled={guardando || !entregable.descripcion.trim()}
                  onClick={agregarEntregable}
                >
                  Sumar
                </Boton>
                <BotonSecundario
                  icono={<Undo2 className="w-3.5 h-3.5" />}
                  disabled={guardando}
                  onClick={() => {
                    setEntregable(ENTREGABLE_VACIO);
                    setSoporte(null);
                    setAgregando(false);
                  }}
                >
                  Cancelar
                </BotonSecundario>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {/* Los anulados se conservan: explican que un contrato tenga dos balances. */}
      {estado.historial.length > 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-2">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Informes anulados</p>
          {estado.historial.map((i, indice) => (
            <div
              key={`${i.fechaElaboracion}-${indice}`}
              className="border-l-2 border-slate-200 pl-2.5"
            >
              <p className="text-[11.5px] font-bold text-slate-700 m-0">
                Del {fechaLarga(i.fechaElaboracion)} · {pesos(i.balance?.valorPagado)} pagados
              </p>
              <p className="text-[11px] text-slate-500 m-0 mt-0.5 leading-relaxed break-words">
                Anulado {i.anuladoAt ? `el ${momento(i.anuladoAt)}` : ''}
                {i.anuladoPor ? ` por ${i.anuladoPor}` : ''}
                {i.motivoAnulacion ? ` · ${i.motivoAnulacion}` : ''}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Antes de firmar, contra qué se firma. */}
      {estado.puedeElaborar && !estado.informe ? (
        <Balance titulo="Balance de la ejecución" balance={estado.balanceActual} />
      ) : null}

      {estado.puedeElaborar && estado.esSupervisor && !elaborando ? (
        <Boton
          icono={<ClipboardCheck className="w-3.5 h-3.5" />}
          onClick={() => setElaborando(true)}
        >
          Elaborar el informe final
        </Boton>
      ) : null}

      {estado.puedeElaborar && elaborando ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Informe final</p>

          <div>
            <label htmlFor="inf-fecha" className="block text-xs font-bold text-gray-600 mb-1.5">
              Fecha del informe <span className="text-red-600">*</span>
            </label>
            <input
              id="inf-fecha"
              type="date"
              value={datos.fechaElaboracion}
              onChange={(e) => setDatos((p) => ({ ...p, fechaElaboracion: e.target.value }))}
              className={campo}
            />
          </div>

          <div>
            <label
              htmlFor="inf-conclusion"
              className="block text-xs font-bold text-gray-600 mb-1.5"
            >
              Conclusión sobre la ejecución <span className="text-red-600">*</span>
            </label>
            <textarea
              id="inf-conclusion"
              rows={4}
              value={datos.conclusion}
              onChange={(e) => setDatos((p) => ({ ...p, conclusion: e.target.value }))}
              placeholder="Cómo se ejecutó el contrato, qué se cumplió y qué quedó pendiente"
              className={campo}
            />
            <p className="text-[11px] text-slate-500 m-0 mt-1">
              Es lo que la liquidación lee sin abrir el archivo.
            </p>
          </div>

          <SelectorArchivo
            id="inf-archivo"
            etiqueta="Informe firmado"
            ayuda="El informe final suscrito por el supervisor."
            archivo={informe}
            onElegir={setInforme}
          />

          <div className="flex flex-wrap gap-2">
            <Boton
              icono={<ClipboardCheck className="w-3.5 h-3.5" />}
              disabled={guardando || !completo}
              onClick={elaborar}
            >
              Elaborar
            </Boton>
            <BotonSecundario
              icono={<Undo2 className="w-3.5 h-3.5" />}
              disabled={guardando}
              onClick={() => {
                setDatos(VACIO);
                setInforme(null);
                setElaborando(false);
              }}
            >
              Cancelar
            </BotonSecundario>
          </div>
        </div>
      ) : null}
    </Marco>
  );
}

/** Las cifras de la ejecución, con o sin la marca de congelado. */
function Balance({
  titulo,
  balance,
  congelado = false,
}: {
  titulo: string;
  balance: BalanceEjecucion | null;
  congelado?: boolean;
}) {
  if (!balance) return null;

  const filas: Array<[string, string]> = [
    ['Valor del contrato', pesos(balance.valorContrato)],
    ['Pagado', pesos(balance.valorPagado)],
    ['Saldo', pesos(balance.saldo)],
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
            · congelado al firmar
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
      {balance.fechaInicio ? (
        <p className="text-[11px] text-slate-400 m-0 mt-2">
          En ejecución desde el {fechaLarga(balance.fechaInicio)}
        </p>
      ) : null}
    </div>
  );
}

/** El consolidado que pide el criterio de la historia. */
function Entregables({ entregables }: { entregables: EntregableInforme[] }) {
  if (entregables.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-white px-3.5 py-3">
        <p className="text-[11.5px] text-slate-400 m-0">
          El consolidado de entregables está vacío.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-2">
      <p className="text-[12.5px] font-bold text-slate-800 m-0 flex items-center gap-1.5">
        <Package className="w-3.5 h-3.5 text-slate-400" />
        Consolidado de entregables
      </p>
      {entregables.map((e) => (
        <div key={e.id} className="flex items-start gap-2 border-l-2 border-slate-200 pl-2.5">
          {/* Entregado y no entregado se distinguen de un vistazo: el informe
              final también sirve para decir qué faltó. */}
          {e.fechaEntrega ? (
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-600" />
          ) : (
            <MinusCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] font-bold text-slate-700 m-0 break-words">
              {e.descripcion}
            </p>
            <p className="text-[11px] text-slate-500 m-0 mt-0.5 leading-relaxed break-words">
              {e.fechaEntrega ? `Entregado el ${fechaLarga(e.fechaEntrega)}` : 'Sin entregar'}
              {e.observacion ? ` · ${e.observacion}` : ''}
            </p>
            {e.documento?.url ? (
              <a
                href={contratacionService.urlDescarga(e.documento.url)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 mt-1 text-[11px] font-bold text-[#003DA5] hover:underline"
              >
                <Paperclip className="w-3 h-3" />
                {e.documento.nombre}
              </a>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
