import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Download,
  FileText,
  Gavel,
  Megaphone,
  Plus,
  Undo2,
  UploadCloud,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  ActoAdjudicacion,
  AudienciaAdjudicacion,
  EstadoAdjudicacion,
  EstadoAudienciaAdjudicacion,
  EstadoInformeDefinitivoProceso,
  InformeDefinitivo,
  TipoPiezaAudiencia,
} from '../../types';
import {
  Aviso,
  Ayuda,
  Boton,
  BotonSecundario,
  campo,
  Marco,
  Pendiente,
  Titulo,
} from '../shared/PiezasPanel';
import { fechaLarga, momentoConHora } from '../shared/fechas';

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

const ETIQUETA_PIEZA: Record<TipoPiezaAudiencia, string> = {
  GRABACION: 'Grabación',
  OBSERVACION: 'Observación y respuesta',
  ANEXO: 'Anexo',
};

/** Vacío es "no viene", no cero. */
const aNumero = (texto: string): number | undefined => {
  const limpio = texto.trim();
  if (!limpio) return undefined;
  const numero = Number(limpio);
  return Number.isNaN(numero) ? undefined : numero;
};

/**
 * Etapa 7 · Adjudicación del proceso (EFDS-1159).
 *
 * Un solo panel para las cuatro actividades, con el mismo criterio del traslado:
 * para el usuario es un solo desenlace —audiencia, sobre económico, informe
 * definitivo y acto—, y partirlo obligaría a saltar entre pantallas para saber
 * en qué paso va.
 *
 * Lo que la pantalla insiste en decir es de dónde sale cada cosa: el informe
 * definitivo **propone** una ganadora y el acto **decide**. Cuando el acto se
 * aparta del informe, eso se ve.
 */
export function PanelAdjudicacion({ procesoId, onCambio }: Props) {
  const [audiencia, setAudiencia] = useState<EstadoAudienciaAdjudicacion | null>(null);
  const [definitivo, setDefinitivo] = useState<EstadoInformeDefinitivoProceso | null>(null);
  const [acto, setActo] = useState<EstadoAdjudicacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Audiencia
  const [celebrando, setCelebrando] = useState(false);
  const [celebradaAt, setCelebradaAt] = useState('');
  const [presididaPor, setPresididaPor] = useState('');
  const [resumen, setResumen] = useState('');
  const [actaArchivo, setActaArchivo] = useState<File | null>(null);

  // Sobre económico
  const [abriendoSobre, setAbriendoSobre] = useState(false);
  const [sobreOferta, setSobreOferta] = useState('');
  const [sobreValor, setSobreValor] = useState('');
  const [sobreEvidencia, setSobreEvidencia] = useState<File | null>(null);

  // Informe definitivo
  const [documentoDefinitivo, setDocumentoDefinitivo] = useState<File | null>(null);
  const [medioDefinitivo, setMedioDefinitivo] = useState('');
  const [evidenciaDefinitivo, setEvidenciaDefinitivo] = useState<File | null>(null);

  // Acto
  const [adjudicando, setAdjudicando] = useState(false);
  const [adjudicatario, setAdjudicatario] = useState('');
  const [numeroActo, setNumeroActo] = useState('');
  const [fechaActo, setFechaActo] = useState('');
  const [valorAdjudicado, setValorAdjudicado] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [actoArchivo, setActoArchivo] = useState<File | null>(null);
  const [medioActo, setMedioActo] = useState('');
  const [evidenciaActo, setEvidenciaActo] = useState<File | null>(null);

  const leer = () =>
    Promise.all([
      contratacionService.audienciaAdjudicacion(procesoId),
      contratacionService.informeDefinitivo(procesoId),
      contratacionService.adjudicacion(procesoId),
    ])
      .then(([a, d, ac]) => {
        setAudiencia(a);
        setDefinitivo(d);
        setActo(ac);
        setError(null);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));

  useEffect(() => {
    setCargando(true);
    leer();
  }, [procesoId]);

  const conGuardado = async (accion: () => Promise<void>, exito: string) => {
    setGuardando(true);
    try {
      await accion();
      await leer();
      toast.success(exito);
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const celebrar = () =>
    conGuardado(async () => {
      await contratacionService.celebrarAudiencia(
        procesoId,
        { celebradaAt: new Date(celebradaAt).toISOString(), presididaPor: presididaPor.trim(), resumen },
        actaArchivo as File,
      );
      setCelebrando(false);
      setCelebradaAt('');
      setPresididaPor('');
      setResumen('');
      setActaArchivo(null);
    }, 'Audiencia registrada');

  const abrirSobre = () =>
    conGuardado(async () => {
      await contratacionService.abrirSobreEconomico(
        procesoId,
        { oferenteId: sobreOferta, valorOfertado: aNumero(sobreValor) as number },
        sobreEvidencia,
      );
      setAbriendoSobre(false);
      setSobreOferta('');
      setSobreValor('');
      setSobreEvidencia(null);
    }, 'Sobre económico abierto');

  const generarDefinitivo = () =>
    conGuardado(async () => {
      await contratacionService.generarInformeDefinitivo(procesoId, documentoDefinitivo);
      setDocumentoDefinitivo(null);
    }, 'Informe definitivo generado');

  const publicarDefinitivo = () =>
    conGuardado(async () => {
      await contratacionService.publicarInformeDefinitivo(
        procesoId,
        medioDefinitivo.trim(),
        evidenciaDefinitivo as File,
      );
      setMedioDefinitivo('');
      setEvidenciaDefinitivo(null);
    }, 'Informe definitivo publicado');

  const adjudicar = () =>
    conGuardado(async () => {
      await contratacionService.adjudicar(
        procesoId,
        {
          oferenteId: adjudicatario,
          numeroActo: numeroActo.trim(),
          fechaActo,
          valorAdjudicado: aNumero(valorAdjudicado) as number,
          justificacion: justificacion.trim() || undefined,
        },
        actoArchivo as File,
      );
      setAdjudicando(false);
      setAdjudicatario('');
      setNumeroActo('');
      setFechaActo('');
      setValorAdjudicado('');
      setJustificacion('');
      setActoArchivo(null);
    }, 'Proceso adjudicado');

  const publicarActo = () =>
    conGuardado(async () => {
      await contratacionService.publicarActoAdjudicacion(
        procesoId,
        { medioPublicacion: medioActo.trim() },
        evidenciaActo as File,
      );
      setMedioActo('');
      setEvidenciaActo(null);
    }, 'Acto notificado y publicado');

  const revocar = async () => {
    const motivo = window.prompt('¿Por qué se revoca el acto de adjudicación?')?.trim();
    if (!motivo) return;
    await conGuardado(
      () => contratacionService.revocarActoAdjudicacion(procesoId, motivo).then(() => undefined),
      'Acto revocado',
    );
  };

  const anularAudiencia = async () => {
    const motivo = window.prompt('¿Por qué se anula la audiencia?')?.trim();
    if (!motivo) return;
    await conGuardado(
      () => contratacionService.anularAudiencia(procesoId, motivo).then(() => undefined),
      'Audiencia anulada',
    );
  };

  if (cargando) {
    return (
      <Marco>
        <Titulo>Adjudicación del proceso</Titulo>
        <p className="text-[12.5px] text-slate-500 m-0">Cargando…</p>
      </Marco>
    );
  }

  if (error || !audiencia || !definitivo || !acto) {
    return (
      <Marco>
        <Titulo>Adjudicación del proceso</Titulo>
        <Aviso tono="error" titulo="No se pudo cargar la adjudicación">
          {error ?? 'Intenta de nuevo.'}
        </Aviso>
      </Marco>
    );
  }

  const laAudiencia = audiencia.audiencia;
  const elDefinitivo = definitivo.informe;
  const elActo = acto.acto;

  // El adjudicatario elegido contra el que propone el informe: la contradicción
  // se muestra mientras se llena el formulario, no después de guardar.
  const seApartaDelInforme =
    !!adjudicatario &&
    !!acto.ganadoraPropuesta &&
    adjudicatario !== acto.ganadoraPropuesta.oferenteId;

  return (
    <Marco>
      <Titulo>Adjudicación del proceso</Titulo>
      <Ayuda>
        Cerrado el traslado, la entidad celebra la audiencia —donde la modalidad lo exige, allí se
        abre el sobre económico—, produce el informe de evaluación definitivo y adjudica por acto
        del Ordenador del Gasto. El informe propone; el acto decide.
      </Ayuda>

      {!audiencia.trasladoCerrado && (
        <Pendiente
          falta="6.6"
          texto="El traslado del informe de evaluación sigue abierto: mientras corra, la evaluación todavía se puede mover."
        />
      )}

      {/* ------------------------------------------ 7.1 y 7.2 · audiencia --- */}

      {audiencia.aplica ? (
        <div className="space-y-2.5">
          <p className="text-[12.5px] font-bold text-slate-800 m-0 pt-1">
            Audiencia de adjudicación
          </p>

          {laAudiencia ? (
            <ResumenAudiencia audiencia={laAudiencia} />
          ) : (
            <p className="text-[12px] text-slate-500 m-0">
              Todavía no se ha registrado la audiencia.
            </p>
          )}

          {audiencia.puedeCelebrar &&
            (celebrando ? (
              <div className="border border-gray-200 rounded-lg p-3 space-y-2.5">
                <label className="block">
                  <span className="text-[11.5px] text-slate-500">
                    Fecha y hora en que se celebró
                  </span>
                  <input
                    type="datetime-local"
                    className={campo}
                    value={celebradaAt}
                    onChange={(e) => setCelebradaAt(e.target.value)}
                  />
                </label>
                <input
                  className={campo}
                  placeholder="Quién la presidió, tal como firma el acta"
                  value={presididaPor}
                  onChange={(e) => setPresididaPor(e.target.value)}
                />
                <textarea
                  className={`${campo} min-h-[64px]`}
                  placeholder="Resumen de lo que ocurrió (opcional)"
                  value={resumen}
                  onChange={(e) => setResumen(e.target.value)}
                />
                <label className="flex items-center gap-2 text-[12px] text-slate-600 cursor-pointer">
                  <UploadCloud size={15} className="text-slate-400" />
                  <span>{actaArchivo?.name ?? 'Adjuntar el acta de la audiencia'}</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => setActaArchivo(e.target.files?.[0] ?? null)}
                  />
                </label>
                <div className="flex gap-2">
                  <Boton
                    icono={<Gavel className="w-3.5 h-3.5" />}
                    onClick={celebrar}
                    disabled={guardando || !celebradaAt || !presididaPor.trim() || !actaArchivo}
                  >
                    Registrar audiencia
                  </Boton>
                  <BotonSecundario
                    icono={<X className="w-3.5 h-3.5" />}
                    onClick={() => setCelebrando(false)}
                  >
                    Cancelar
                  </BotonSecundario>
                </div>
              </div>
            ) : (
              <BotonSecundario
                icono={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setCelebrando(true)}
              >
                Registrar la audiencia
              </BotonSecundario>
            ))}

          {laAudiencia && (
            <BotonSecundario
              icono={<Undo2 className="w-3.5 h-3.5" />}
              onClick={anularAudiencia}
              disabled={guardando}
            >
              Anular la audiencia
            </BotonSecundario>
          )}

          {/* El sobre económico solo donde la matriz lo deja. */}
          {laAudiencia &&
            (audiencia.aplicaSobreEconomico ? (
              abriendoSobre ? (
                <div className="border border-gray-200 rounded-lg p-3 space-y-2.5">
                  <select
                    className={campo}
                    value={sobreOferta}
                    onChange={(e) => setSobreOferta(e.target.value)}
                  >
                    <option value="">¿De qué oferta es el sobre?</option>
                    {audiencia.ofertas.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.numero}. {o.nombre}
                      </option>
                    ))}
                  </select>
                  <input
                    className={campo}
                    placeholder="Valor que traía el sobre"
                    value={sobreValor}
                    onChange={(e) => setSobreValor(e.target.value)}
                  />
                  <label className="flex items-center gap-2 text-[12px] text-slate-600 cursor-pointer">
                    <UploadCloud size={15} className="text-slate-400" />
                    <span>
                      {sobreEvidencia?.name ?? 'Adjuntar evidencia de la apertura (opcional)'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => setSobreEvidencia(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <div className="flex gap-2">
                    <Boton
                      icono={<Plus className="w-3.5 h-3.5" />}
                      onClick={abrirSobre}
                      disabled={guardando || !sobreOferta || aNumero(sobreValor) == null}
                    >
                      Abrir sobre
                    </Boton>
                    <BotonSecundario
                      icono={<X className="w-3.5 h-3.5" />}
                      onClick={() => setAbriendoSobre(false)}
                    >
                      Cancelar
                    </BotonSecundario>
                  </div>
                </div>
              ) : (
                <BotonSecundario
                  icono={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => setAbriendoSobre(true)}
                >
                  Abrir un sobre económico
                </BotonSecundario>
              )
            ) : (
              <p className="text-[11.5px] text-slate-500 m-0">
                Esta modalidad no abre sobre económico en audiencia
                {audiencia.motivoNoAplicaSobre ? `: ${audiencia.motivoNoAplicaSobre}` : '.'}
              </p>
            ))}
        </div>
      ) : (
        <Aviso tono="aviso" titulo="Esta modalidad no celebra audiencia de adjudicación">
          {audiencia.motivoNoAplica ?? 'La modalidad del proceso no adelanta audiencia.'}
        </Aviso>
      )}

      {/* ----------------------------------- 7.3 · informe definitivo ------- */}

      <div className="space-y-2.5">
        <p className="text-[12.5px] font-bold text-slate-800 m-0 pt-1">
          Informe de evaluación definitivo
        </p>

        {definitivo.audienciaPendiente && (
          <Pendiente
            falta="7.1"
            texto="La audiencia todavía no se ha registrado: el informe definitivo se genera después de ella."
          />
        )}

        {elDefinitivo ? (
          <ResumenDefinitivo informe={elDefinitivo} />
        ) : (
          <p className="text-[12px] text-slate-500 m-0">Todavía no se ha generado.</p>
        )}

        {definitivo.puedeGenerar && (
          <div className="border border-gray-200 rounded-lg p-3 space-y-2.5">
            <p className="text-[11.5px] text-slate-500 m-0">
              Congela el resultado vigente del comité —no el que se trasladó— y resuelve qué cambió
              desde el preliminar.
            </p>
            <label className="flex items-center gap-2 text-[12px] text-slate-600 cursor-pointer">
              <UploadCloud size={15} className="text-slate-400" />
              <span>{documentoDefinitivo?.name ?? 'Adjuntar el informe definitivo'}</span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => setDocumentoDefinitivo(e.target.files?.[0] ?? null)}
              />
            </label>
            <Boton
              icono={<FileText className="w-3.5 h-3.5" />}
              onClick={generarDefinitivo}
              disabled={guardando || (!elDefinitivo && !documentoDefinitivo)}
            >
              {elDefinitivo ? 'Actualizar informe definitivo' : 'Generar informe definitivo'}
            </Boton>
          </div>
        )}

        {definitivo.puedePublicar && (
          <div className="border border-gray-200 rounded-lg p-3 space-y-2.5">
            <input
              className={campo}
              placeholder="Dónde se publicó el informe definitivo"
              value={medioDefinitivo}
              onChange={(e) => setMedioDefinitivo(e.target.value)}
            />
            <label className="flex items-center gap-2 text-[12px] text-slate-600 cursor-pointer">
              <UploadCloud size={15} className="text-slate-400" />
              <span>{evidenciaDefinitivo?.name ?? 'Adjuntar el soporte de la publicación'}</span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => setEvidenciaDefinitivo(e.target.files?.[0] ?? null)}
              />
            </label>
            <Boton
              icono={<Megaphone className="w-3.5 h-3.5" />}
              onClick={publicarDefinitivo}
              disabled={guardando || !evidenciaDefinitivo || medioDefinitivo.trim().length < 10}
            >
              Publicar informe definitivo
            </Boton>
          </div>
        )}
      </div>

      {/* -------------------------------------------- 7.4 · el acto --------- */}

      <div className="space-y-2.5">
        <p className="text-[12.5px] font-bold text-slate-800 m-0 pt-1">Acto de adjudicación</p>

        {!acto.informeDefinitivoPublicado && (
          <Pendiente
            falta="7.3"
            texto="El informe definitivo no se ha publicado: adjudicar sin él sería firmar sobre una evaluación que todavía se puede mover."
          />
        )}

        {acto.ganadoraPropuesta && !elActo && (
          <p className="text-[12px] text-slate-600 m-0">
            El informe definitivo propone a <strong>{acto.ganadoraPropuesta.nombre}</strong>
            {acto.ganadoraPropuesta.valorEvaluado != null && (
              <> por {pesos(acto.ganadoraPropuesta.valorEvaluado)}</>
            )}
            . El acto puede apartarse de esa propuesta, pero entonces tiene que decir por qué.
          </p>
        )}

        {elActo && <ResumenActo acto={elActo} />}

        {acto.puedeAdjudicar &&
          (adjudicando ? (
            <div className="border border-gray-200 rounded-lg p-3 space-y-2.5">
              <select
                className={campo}
                value={adjudicatario}
                onChange={(e) => setAdjudicatario(e.target.value)}
              >
                <option value="">¿A quién se adjudica?</option>
                {acto.ofertas.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.numero}. {o.nombre}
                  </option>
                ))}
              </select>
              <input
                className={campo}
                placeholder="Número de la resolución"
                value={numeroActo}
                onChange={(e) => setNumeroActo(e.target.value)}
              />
              <label className="block">
                <span className="text-[11.5px] text-slate-500">Fecha de la resolución</span>
                <input
                  type="date"
                  className={campo}
                  value={fechaActo}
                  onChange={(e) => setFechaActo(e.target.value)}
                />
              </label>
              <input
                className={campo}
                placeholder="Valor por el que se adjudica"
                value={valorAdjudicado}
                onChange={(e) => setValorAdjudicado(e.target.value)}
              />

              {seApartaDelInforme && (
                <Aviso tono="aviso" titulo="El acto se aparta del informe definitivo">
                  El informe propone a {acto.ganadoraPropuesta?.nombre}. Adjudicar a otro es
                  legítimo —el ganador que no firma, por ejemplo— pero no puede quedar en el
                  expediente sin decir por qué.
                </Aviso>
              )}
              {seApartaDelInforme && (
                <textarea
                  className={`${campo} min-h-[64px]`}
                  placeholder="Por qué se adjudica a una oferta distinta de la que ganó la evaluación"
                  value={justificacion}
                  onChange={(e) => setJustificacion(e.target.value)}
                />
              )}

              <label className="flex items-center gap-2 text-[12px] text-slate-600 cursor-pointer">
                <UploadCloud size={15} className="text-slate-400" />
                <span>{actoArchivo?.name ?? 'Adjuntar la resolución firmada'}</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setActoArchivo(e.target.files?.[0] ?? null)}
                />
              </label>

              <div className="flex gap-2">
                <Boton
                  icono={<Award className="w-3.5 h-3.5" />}
                  onClick={adjudicar}
                  disabled={
                    guardando ||
                    !adjudicatario ||
                    !numeroActo.trim() ||
                    !fechaActo ||
                    aNumero(valorAdjudicado) == null ||
                    !actoArchivo ||
                    (seApartaDelInforme && justificacion.trim().length === 0)
                  }
                >
                  Adjudicar
                </Boton>
                <BotonSecundario
                  icono={<X className="w-3.5 h-3.5" />}
                  onClick={() => setAdjudicando(false)}
                >
                  Cancelar
                </BotonSecundario>
              </div>
            </div>
          ) : (
            <Boton icono={<Award className="w-3.5 h-3.5" />} onClick={() => setAdjudicando(true)}>
              Adjudicar el proceso
            </Boton>
          ))}

        {elActo && !elActo.publicadoAt && (
          <div className="border border-gray-200 rounded-lg p-3 space-y-2.5">
            <input
              className={campo}
              placeholder="Dónde se publicó y cómo se notificó el acto"
              value={medioActo}
              onChange={(e) => setMedioActo(e.target.value)}
            />
            <label className="flex items-center gap-2 text-[12px] text-slate-600 cursor-pointer">
              <UploadCloud size={15} className="text-slate-400" />
              <span>{evidenciaActo?.name ?? 'Adjuntar el soporte de la publicación'}</span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => setEvidenciaActo(e.target.files?.[0] ?? null)}
              />
            </label>
            <Boton
              icono={<Megaphone className="w-3.5 h-3.5" />}
              onClick={publicarActo}
              disabled={guardando || !evidenciaActo || medioActo.trim().length < 10}
            >
              Notificar y publicar
            </Boton>
          </div>
        )}

        {elActo && (
          <BotonSecundario
            icono={<Undo2 className="w-3.5 h-3.5" />}
            onClick={revocar}
            disabled={guardando}
          >
            Revocar el acto
          </BotonSecundario>
        )}

        {acto.revocados.length > 0 && (
          <div className="pt-1">
            <p className="text-[11.5px] font-bold text-slate-600 m-0">Actos revocados</p>
            <ul className="list-none p-0 m-0 mt-1 space-y-1">
              {acto.revocados.map((r) => (
                <li key={r.id} className="text-[11.5px] text-slate-500">
                  {r.numeroActo} · {r.motivoRevocacion}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Marco>
  );
}

/** La audiencia con su acta, sus piezas y los sobres que se abrieron. */
function ResumenAudiencia({ audiencia }: { audiencia: AudienciaAdjudicacion }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[12.5px] font-bold text-slate-800 m-0">
          Celebrada el {momentoConHora(audiencia.celebradaAt)}
        </p>
        {audiencia.acta && (
          <a
            className="text-[11.5px] text-blue-700 inline-flex items-center gap-1"
            href={contratacionService.urlDescarga(audiencia.acta.archivoUrl)}
          >
            <Download size={12} /> {audiencia.acta.nombre}
          </a>
        )}
      </div>
      <p className="text-[11.5px] text-slate-500 m-0">Presidida por {audiencia.presididaPor}</p>
      {audiencia.resumen && (
        <p className="text-[12px] text-slate-600 m-0 whitespace-pre-wrap">{audiencia.resumen}</p>
      )}

      {audiencia.piezas.length > 0 && (
        <ul className="list-none p-0 m-0 mt-1 space-y-1">
          {audiencia.piezas.map((p) => (
            <li key={p.id} className="text-[11.5px] text-slate-600">
              <span className="font-bold">{ETIQUETA_PIEZA[p.tipo]}</span> · {p.descripcion}
              {p.archivoUrl && (
                <a
                  className="text-blue-700 inline-flex items-center gap-1 ml-1"
                  href={contratacionService.urlDescarga(p.archivoUrl)}
                >
                  <Download size={11} /> abrir
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      {audiencia.sobres.length > 0 && (
        <div className="mt-1.5 pt-1.5 border-t border-gray-100">
          <p className="text-[11.5px] font-bold text-slate-600 m-0">Sobres económicos</p>
          <ul className="list-none p-0 m-0 mt-1 space-y-1">
            {audiencia.sobres.map((s) => (
              <li key={s.id} className="text-[11.5px] text-slate-600">
                {s.oferta ? `${s.oferta.numero}. ${s.oferta.nombre}` : 'Oferta retirada'} ·{' '}
                {pesos(s.valorOfertado)}
                {/* Que el sobre traiga algo distinto de lo declarado es el
                    hecho por el que se abre delante de todos. */}
                {s.coincideConLoDeclarado === false && (
                  <span className="ml-1.5 inline-flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-bold rounded-md border bg-amber-50 text-amber-800 border-amber-200">
                    <AlertTriangle size={11} /> No coincide con lo declarado (
                    {pesos(s.valorDeclarado)})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** El definitivo, con lo que cambió respecto de lo que se notificó. */
function ResumenDefinitivo({ informe }: { informe: InformeDefinitivo }) {
  const { cambios, resultado } = informe;

  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[12.5px] font-bold text-slate-800 m-0">
          Ganadora: {resultado.ganadora.nombre}
          <span className="ml-2 inline-block px-2 py-0.5 text-[10.5px] font-bold rounded-md border bg-slate-50 text-slate-700 border-slate-200">
            {informe.estado}
          </span>
        </p>
        {informe.informe && (
          <a
            className="text-[11.5px] text-blue-700 inline-flex items-center gap-1"
            href={contratacionService.urlDescarga(informe.informe.archivoUrl)}
          >
            <Download size={12} /> {informe.informe.nombre}
          </a>
        )}
      </div>

      {cambios.cambioLaGanadora ? (
        <Aviso tono="aviso" titulo="La ganadora cambió respecto del informe trasladado">
          A los oferentes se les notificó otro resultado.
          {cambios.motivoRectificacion && <> El comité rectificó: {cambios.motivoRectificacion}</>}
        </Aviso>
      ) : cambios.huboRectificacion ? (
        <p className="text-[11.5px] text-slate-500 m-0">
          El comité rectificó su resultado después del traslado
          {cambios.motivoRectificacion ? `: ${cambios.motivoRectificacion}` : '.'}
        </p>
      ) : (
        <p className="text-[11.5px] text-slate-500 m-0">
          Sin cambios respecto del informe trasladado.
        </p>
      )}

      {cambios.subsanacionesAceptadas.length > 0 && (
        <div>
          <p className="text-[11.5px] font-bold text-slate-600 m-0">Subsanaciones aceptadas</p>
          <ul className="list-none p-0 m-0 mt-1 space-y-0.5">
            {cambios.subsanacionesAceptadas.map((s) => (
              <li key={s.id} className="text-[11.5px] text-slate-600">
                {s.oferente} · {s.asunto}
              </li>
            ))}
          </ul>
        </div>
      )}

      {informe.publicadoAt && (
        <p className="text-[11.5px] text-slate-500 m-0">
          Publicado el {momentoConHora(informe.publicadoAt)} por {informe.publicadoPor}.
        </p>
      )}
    </div>
  );
}

/** El acto vigente: a quién, por cuánto y con qué resolución. */
function ResumenActo({ acto }: { acto: ActoAdjudicacion }) {
  return (
    <div className="border border-emerald-200 bg-emerald-50/40 rounded-lg p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[12.5px] font-bold text-slate-800 m-0">
          <CheckCircle2 size={13} className="inline mr-1 text-emerald-700" />
          Adjudicado a {acto.adjudicatario?.nombre ?? 'oferta retirada'}
        </p>
        {acto.acto && (
          <a
            className="text-[11.5px] text-blue-700 inline-flex items-center gap-1"
            href={contratacionService.urlDescarga(acto.acto.archivoUrl)}
          >
            <Download size={12} /> {acto.acto.nombre}
          </a>
        )}
      </div>
      <p className="text-[12px] text-slate-600 m-0">
        Resolución {acto.numeroActo} del {fechaLarga(acto.fechaActo)} ·{' '}
        {pesos(acto.valorAdjudicado)}
      </p>
      {acto.publicadoAt ? (
        <p className="text-[11.5px] text-slate-500 m-0">
          Notificado el {momentoConHora(acto.notificadoAt ?? acto.publicadoAt)} y publicado el{' '}
          {momentoConHora(acto.publicadoAt)}.
        </p>
      ) : (
        <p className="text-[11.5px] text-slate-500 m-0">
          Todavía sin notificar ni publicar.
        </p>
      )}
    </div>
  );
}
