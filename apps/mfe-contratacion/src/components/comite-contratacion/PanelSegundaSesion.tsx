import React, { useEffect, useRef, useState } from 'react';
import { Check, Download, Eye, FileUp, History, Send, Undo2, Users } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  DecisionComite,
  DocumentoDelPliegoDefinitivo,
  EstadoSegundaSesion,
} from '../../types';
import {
  ARCHIVOS_ACEPTADOS,
  Aviso,
  Ayuda,
  Boton,
  BotonSecundario,
  Marco,
  SelectorArchivo,
  Titulo,
  campo,
} from '../shared/PiezasPanel';
import { momento } from '../shared/fechas';
import { useFirma } from '../shared/useFirma';
import { DocumentoVisible, VisorDocumento } from '../shared/VisorDocumento';
import { ActaDeLaSesion } from './ActaDeLaSesion';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const NUMERAL = '5.6.1';

const ROTULO: Record<DecisionComite, string> = {
  APROBADO: 'Aprobado',
  APROBADO_CON_CONDICIONES: 'Aprobado con condiciones',
  OBSERVADO: 'Observado',
  RECHAZADO: 'Rechazado',
};

/** En qué va la revisión del pliego definitivo, dicho para quien lo trabaja. */
const EN_QUE_VA: Record<string, { tono: 'ok' | 'aviso' | 'error'; titulo: string; texto: string }> = {
  BORRADOR: {
    tono: 'aviso',
    titulo: 'Pliego definitivo en preparación',
    texto:
      'Sube la versión definitiva solo de los documentos que cambian por las observaciones. Cuando termines, envíalo a revisión: lo aprueba el abogado revisor y después la directora.',
  },
  EN_REVISION: {
    tono: 'aviso',
    titulo: 'En revisión',
    texto: 'El abogado revisor y la directora lo están revisando. Mientras tanto no se cambia ningún documento.',
  },
  DEVUELTO: {
    tono: 'aviso',
    titulo: 'Devuelto para ajustar',
    texto:
      'Ajusta lo que se pidió y vuelve a enviarlo: la revisión empieza otra vez desde el abogado revisor.',
  },
  APROBADO: {
    tono: 'ok',
    titulo: 'Aprobado por el abogado revisor y la directora',
    texto: 'Ya puede ir a la segunda sesión del comité.',
  },
  NEGADO: {
    tono: 'error',
    titulo: 'Proceso negado',
    texto: 'La contratación terminó aquí.',
  },
};

/**
 * Actividad 5.6.1 · Pliego definitivo y segunda sesión del Comité (113).
 *
 * En licitación pública el proceso va dos veces al comité: la 3.7 y esta, ya
 * con el pliego definitivo y después de atender las observaciones. Repite la
 * revisión del abogado revisor y la directora sobre las versiones definitivas
 * —solo cambian los documentos que lo requieran, y queda el historial de cada
 * uno—, exige el CDP cargado, y el acta del comité puede llegar después.
 *
 * Enviar a revisión y decidirla van por el bloque genérico de aprobación que
 * el contenedor pone encima de este panel: aquí está lo propio de la actividad.
 */
export function PanelSegundaSesion({ procesoId, onCambio }: Props) {
  const firma = useFirma(NUMERAL, 'Registrar la segunda sesión del comité');
  const [estado, setEstado] = useState<EstadoSegundaSesion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [viendo, setViendo] = useState<DocumentoVisible | null>(null);

  const [registrando, setRegistrando] = useState(false);
  const [fecha, setFecha] = useState('');
  const [decision, setDecision] = useState<DecisionComite>('APROBADO');
  const [texto, setTexto] = useState('');
  const [acta, setActa] = useState<File | null>(null);

  /** Enviar a la cadena o retirarla, por el trámite genérico de aprobación. */
  const tramite = async (accion: () => Promise<unknown>, exito: string) => {
    setGuardando(true);
    try {
      await accion();
      toast.success(exito);
      cargar();
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const cargar = () => {
    setCargando(true);
    contratacionService
      .segundaSesionComite(procesoId)
      .then((r) => {
        setEstado(r);
        setError(null);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, [procesoId]);

  const hacer = async (accion: () => Promise<EstadoSegundaSesion>, exito: string) => {
    setGuardando(true);
    try {
      setEstado(await accion());
      setRegistrando(false);
      setTexto('');
      setActa(null);
      toast.success(exito);
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando && !estado) {
    return (
      <Marco>
        <p className="text-[11.5px] text-slate-400 m-0">Cargando el pliego definitivo…</p>
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

  if (!estado.aplica) {
    return (
      <Marco>
        <Titulo>Pliego definitivo y segunda sesión del Comité</Titulo>
        <Aviso tono="aviso" titulo="Esta modalidad no tiene segunda sesión">
          La segunda sesión del Comité con el pliego definitivo solo se adelanta en licitación
          pública.
        </Aviso>
      </Marco>
    );
  }

  const ultima = estado.sesiones[0] ?? null;
  const enQueVa = EN_QUE_VA[estado.estado];
  const cambiados = estado.documentos.filter((d) => d.nuevaVersion).length;
  const pideTexto = decision !== 'APROBADO';
  const completo = !!fecha && (!pideTexto || texto.trim().length >= 10);

  return (
    <Marco>
      <Titulo>Pliego definitivo y segunda sesión del Comité</Titulo>
      <Ayuda>
        Atendidas las observaciones, el pliego definitivo vuelve a pasar por el abogado revisor y
        la directora, y después por el Comité de Contratación. La resolución de apertura (5.7) va
        cuando el comité lo apruebe.
      </Ayuda>

      {/* ------------------------------------------------------- el CDP ---- */}
      {estado.cdp.cumplido ? (
        <Aviso tono="ok" titulo="CDP cargado">
          El proceso tiene su CDP: puede ir a revisión y a la segunda sesión del comité.
        </Aviso>
      ) : (
        <Aviso tono="error" titulo="Falta el CDP">
          {estado.cdp.motivo ?? 'El proceso no tiene CDP cargado.'} Sin el CDP el pliego definitivo
          no se envía a revisión ni pasa a la segunda sesión del comité. Se carga en la actividad 4.2.
        </Aviso>
      )}

      {enQueVa && (
        <Aviso tono={enQueVa.tono} titulo={enQueVa.titulo}>
          {enQueVa.texto}
        </Aviso>
      )}

      {/* --------------------------------------- versiones definitivas ---- */}
      <div className="space-y-1.5">
        <p className="text-xs font-bold text-gray-600 m-0">Documentos del proceso</p>
        <p className="text-[11px] text-slate-500 m-0">
          {cambiados === 0
            ? 'Todos conservan la versión del proyecto de pliego.'
            : `${cambiados} ${cambiados === 1 ? 'tiene' : 'tienen'} versión definitiva nueva; los demás conservan la del proyecto de pliego.`}
        </p>
        <ul className="list-none p-0 m-0 rounded-lg border border-gray-200 divide-y divide-gray-100">
          {estado.documentos.map((d) => (
            <FilaDocumento
              key={d.codigo}
              documento={d}
              puedeAjustar={estado.puedeAjustar}
              guardando={guardando}
              onVer={setViendo}
              onSubir={(archivo) =>
                hacer(
                  () => contratacionService.versionDefinitiva(procesoId, d.codigo, archivo),
                  `Versión definitiva de ${d.nombre} cargada`,
                )
              }
            />
          ))}
          {estado.documentos.length === 0 && (
            <li className="px-3.5 py-3 text-[11.5px] text-slate-500">
              La 5.1 no tiene documentos para esta modalidad.
            </li>
          )}
        </ul>
      </div>

      {/* --------------------------------------------- enviar a revisión -- */}
      {estado.puedeAjustar && (
        <div className="space-y-1">
          <Boton
            icono={<Send className="w-3.5 h-3.5" />}
            disabled={guardando || !estado.cdp.cumplido}
            title={estado.cdp.cumplido ? undefined : 'Falta el CDP cargado'}
            onClick={() =>
              tramite(
                () => contratacionService.enviarPliegoDefinitivo(procesoId),
                'Pliego definitivo enviado a revisión',
              )
            }
          >
            {estado.estado === 'DEVUELTO' ? 'Volver a enviar a revisión' : 'Enviar a revisión'}
          </Boton>
          <p className="text-[11px] text-slate-500 m-0">
            Lo revisa el abogado revisor y después la directora. Mientras esté en revisión no se
            cambia ningún documento.
          </p>
        </div>
      )}
      {estado.puedeRetirar && (
        <BotonSecundario
          icono={<Undo2 className="w-3.5 h-3.5" />}
          disabled={guardando}
          onClick={() =>
            tramite(
              () => contratacionService.retirarPliegoDefinitivo(procesoId),
              'Retirado de revisión: ya puedes cambiar documentos',
            )
          }
        >
          Retirar de revisión
        </BotonSecundario>
      )}

      {/* --------------------------------------------- la segunda sesión -- */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-gray-600 m-0">Segunda sesión del comité</p>

        {ultima ? (
          <div
            className={`rounded-lg border px-3.5 py-3 ${
              ultima.decision === 'RECHAZADO'
                ? 'border-red-200 bg-red-50'
                : ultima.decision === 'OBSERVADO'
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-emerald-200 bg-emerald-50'
            }`}
          >
            <p className="text-[13px] font-bold m-0 flex items-center gap-1.5 text-slate-800">
              <Users className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              {ROTULO[ultima.decision]}
            </p>
            <p className="text-[11.5px] text-slate-600 m-0 mt-0.5">
              Sesión del {momento(ultima.fecha)}
              {ultima.registradoPor ? ` · transcrita por ${ultima.registradoPor}` : ''}
            </p>
            {ultima.condiciones && (
              <p className="text-[11.5px] text-slate-700 m-0 mt-1 break-words">
                Condiciones: «{ultima.condiciones}»
              </p>
            )}
            {ultima.observaciones && (
              <p className="text-[11.5px] text-slate-700 m-0 mt-1 break-words">
                «{ultima.observaciones}»
              </p>
            )}
          </div>
        ) : (
          <p className="text-[11.5px] text-slate-500 m-0">Todavía no se ha registrado.</p>
        )}

        {ultima && (
          <ActaDeLaSesion
            procesoId={procesoId}
            sesion={ultima}
            puedeCargar={estado.puedeCargarActa}
            onCargada={() => {
              cargar();
              onCambio?.();
            }}
          />
        )}

        {estado.puedeRegistrar && !registrando && (
          <Boton icono={<Users className="w-3.5 h-3.5" />} onClick={() => setRegistrando(true)}>
            {ultima ? 'Registrar otra sesión' : 'Registrar lo que decidió el comité'}
          </Boton>
        )}

        {!estado.puedeRegistrar && !registrando && (
          <p className="text-[11.5px] text-slate-500 m-0">
            {estado.motivoNoDecide === 'SIN_ASIGNAR'
              ? `Lo registra quien ocupe el puesto ${estado.puesto ?? ''} y todavía no hay nadie: se asigna en la actividad 3.3.`
              : estado.motivoNoDecide === 'NO_ES_TUYO'
                ? `Lo registra ${estado.responsable?.nombre ?? 'otra persona'}${estado.puesto ? ` (${estado.puesto})` : ''}.`
                : estado.motivoNoDecide === 'SIN_PERMISO'
                  ? 'Tu rol no tiene el permiso para registrar el comité en esta etapa.'
                  : estado.motivoNoRegistra}
          </p>
        )}

        {registrando && (
          <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3 space-y-3">
            <label htmlFor="segunda-fecha" className="block text-xs font-bold text-gray-600">
              Fecha de la sesión <span className="text-red-600">*</span>
            </label>
            <input
              id="segunda-fecha"
              type="date"
              value={fecha}
              disabled={guardando}
              onChange={(e) => setFecha(e.target.value)}
              className={campo}
            />

            <label htmlFor="segunda-decision" className="block text-xs font-bold text-gray-600">
              Qué decidió <span className="text-red-600">*</span>
            </label>
            <select
              id="segunda-decision"
              value={decision}
              disabled={guardando}
              onChange={(e) => setDecision(e.target.value as DecisionComite)}
              className={campo}
            >
              <option value="APROBADO">Aprobado</option>
              <option value="APROBADO_CON_CONDICIONES">Aprobado con condiciones</option>
              <option value="OBSERVADO">Observado: hay que ajustar el pliego definitivo</option>
              <option value="RECHAZADO">Rechazado: el proceso no sale al mercado</option>
            </select>
            {decision === 'OBSERVADO' && (
              <Aviso tono="aviso" titulo="Vuelve a revisión">
                El pliego definitivo vuelve a quien lo envió. Al ajustarlo, la revisión empieza otra
                vez desde el abogado revisor y después vuelve al comité.
              </Aviso>
            )}
            {decision === 'RECHAZADO' && (
              <Aviso tono="aviso" titulo="El rechazo termina el proceso">
                La actividad queda negada y el proceso también.
              </Aviso>
            )}

            {pideTexto && (
              <>
                <label htmlFor="segunda-texto" className="block text-xs font-bold text-gray-600">
                  {decision === 'APROBADO_CON_CONDICIONES'
                    ? 'A qué queda condicionada la aprobación'
                    : decision === 'RECHAZADO'
                      ? 'Por qué se rechaza el proceso'
                      : 'Qué observó el comité'}{' '}
                  <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="segunda-texto"
                  rows={3}
                  value={texto}
                  disabled={guardando}
                  onChange={(e) => setTexto(e.target.value)}
                  className={campo}
                />
              </>
            )}

            <SelectorArchivo
              id="segunda-acta"
              etiqueta="Acta de la sesión"
              archivo={acta}
              onElegir={setActa}
              obligatorio={false}
              ayuda="Si todavía no llegó, registra la sesión sin ella y cárgala después: tiene hasta diez días y mientras falte queda en tus alertas."
            />

            <div className="flex items-center gap-2">
              <Boton
                icono={<Check className="w-3.5 h-3.5" strokeWidth={3} />}
                disabled={!completo || guardando}
                onClick={() =>
                  firma.conFirma((firmaOtp) =>
                    hacer(
                      () =>
                        contratacionService.registrarSegundaSesion(
                          procesoId,
                          {
                            fecha,
                            decision,
                            ...(decision === 'APROBADO_CON_CONDICIONES'
                              ? { condiciones: texto.trim() }
                              : {}),
                            ...(decision === 'OBSERVADO' || decision === 'RECHAZADO'
                              ? { observaciones: texto.trim() }
                              : {}),
                            firma: firmaOtp,
                          },
                          acta,
                        ),
                      decision === 'OBSERVADO'
                        ? 'Registrado: el pliego definitivo vuelve a revisión'
                        : decision === 'RECHAZADO'
                          ? 'Registrado: el comité rechazó el proceso'
                          : 'Registrado: ya se puede abrir el proceso',
                    ),
                  )
                }
              >
                Registrar la sesión
              </Boton>
              <button
                type="button"
                disabled={guardando}
                onClick={() => setRegistrando(false)}
                className="text-[11.5px] font-bold text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {estado.sesiones.length > 1 && (
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-gray-600 m-0">Sesiones anteriores</p>
            {estado.sesiones.slice(1).map((s) => (
              <div key={s.id} className="space-y-1">
                <p className="text-[11.5px] text-slate-600 m-0">
                  {momento(s.fecha)} · {ROTULO[s.decision]}
                  {s.observaciones ? ` — «${s.observaciones}»` : ''}
                </p>
                <ActaDeLaSesion
                  procesoId={procesoId}
                  sesion={s}
                  puedeCargar={estado.puedeCargarActa}
                  onCargada={cargar}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <VisorDocumento documento={viendo} onClose={() => setViendo(null)} />
      {firma.modal}
    </Marco>
  );
}

/** Un documento de la 5.1 con su versión vigente, su historial y la carga de la definitiva. */
function FilaDocumento({
  documento,
  puedeAjustar,
  guardando,
  onVer,
  onSubir,
}: {
  documento: DocumentoDelPliegoDefinitivo;
  puedeAjustar: boolean;
  guardando: boolean;
  onVer: (d: DocumentoVisible) => void;
  onSubir: (archivo: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [historial, setHistorial] = useState(false);
  const vigente = documento.vigente;

  return (
    <li className="px-3.5 py-2.5 space-y-1">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-slate-800 m-0 break-words">{documento.nombre}</p>
          <p className="text-[11px] text-slate-500 m-0 break-words">
            {vigente
              ? `${vigente.nombre} · ${momento(vigente.cargadoAt)}${vigente.subidoPor ? ` · ${vigente.subidoPor}` : ''}`
              : 'Sin cargar'}
          </p>
          <span
            className={`inline-block mt-1 text-[10.5px] font-bold rounded px-1.5 py-0.5 ${
              documento.nuevaVersion ? 'bg-blue-50 text-[#003DA5]' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {documento.nuevaVersion ? 'Versión definitiva nueva' : 'Conserva la versión aprobada'}
          </span>
        </div>

        {vigente?.descargaUrl && (
          <>
            <button
              type="button"
              onClick={() =>
                onVer({
                  nombre: vigente.nombre,
                  descargaUrl: vigente.descargaUrl!,
                  mimeType: vigente.mimeType ?? null,
                })
              }
              title={`Ver ${vigente.nombre}`}
              className="shrink-0 p-1 rounded-md text-[#003DA5] hover:bg-slate-50"
            >
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <a
              href={contratacionService.urlDescarga(vigente.descargaUrl)}
              target="_blank"
              rel="noreferrer"
              title={`Descargar ${vigente.nombre}`}
              className="shrink-0 p-1 rounded-md text-[#003DA5] hover:bg-slate-50"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </>
        )}

        {puedeAjustar && (
          <>
            <input
              ref={input}
              type="file"
              className="hidden"
              accept={ARCHIVOS_ACEPTADOS}
              onChange={(e) => {
                const elegido = e.target.files?.[0];
                e.target.value = '';
                if (elegido) onSubir(elegido);
              }}
            />
            <Boton
              icono={<FileUp className="w-3.5 h-3.5" />}
              disabled={guardando}
              onClick={() => input.current?.click()}
            >
              {vigente ? 'Nueva versión' : 'Cargar'}
            </Boton>
          </>
        )}
      </div>

      {documento.anteriores.length > 0 && (
        <button
          type="button"
          onClick={() => setHistorial((h) => !h)}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-700"
        >
          <History className="w-3 h-3" aria-hidden="true" />
          {historial ? 'Ocultar' : 'Ver'} {documento.anteriores.length}{' '}
          {documento.anteriores.length === 1 ? 'versión anterior' : 'versiones anteriores'}
        </button>
      )}
      {historial && (
        <ul className="list-none p-0 m-0 pl-4 space-y-0.5">
          {documento.anteriores.map((v) => (
            <li key={v.id} className="text-[11px] text-slate-500">
              {v.descargaUrl ? (
                <a
                  href={contratacionService.urlDescarga(v.descargaUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#003DA5] hover:underline"
                >
                  {v.nombre}
                </a>
              ) : (
                v.nombre
              )}{' '}
              · cargada {momento(v.cargadoAt)} · sustituida {momento(v.sustituidoAt)}
              {v.sustituidoPor ? ` por ${v.sustituidoPor}` : ''}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
