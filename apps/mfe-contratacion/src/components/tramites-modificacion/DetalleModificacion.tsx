import React, { useEffect, useState } from 'react';
import { ArrowLeft, Ban, Check, ExternalLink, FileText, Inbox, RotateCcw, Send, Stamp, Upload, UserCheck, X } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { DocumentoTramiteModificacion, TramiteModificacionDetalle } from '../../types';
import { Aviso, Boton, BotonSecundario, campo, SelectorArchivo } from '../shared/PiezasPanel';
import { DocumentoVisible, VisorDocumento } from '../shared/VisorDocumento';
import { fechaLarga, hoyEnBogota, momento } from '../shared/fechas';
import { useDialogo } from '../shared/useDialogo';

const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export const COLOR_ESTADO: Record<string, string> = {
  RADICADA: 'bg-blue-50 text-blue-800 border-blue-200',
  RECIBIDA: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  EN_REVISION: 'bg-amber-50 text-amber-800 border-amber-200',
  DEVUELTA: 'bg-red-50 text-red-800 border-red-200',
  MINUTA: 'bg-amber-50 text-amber-800 border-amber-200',
  EN_VISTO_BUENO: 'bg-amber-50 text-amber-800 border-amber-200',
  EN_FIRMA: 'bg-blue-50 text-blue-800 border-blue-200',
  PERFECCIONADA: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  PUBLICADA: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  DESISTIDA: 'bg-slate-100 text-slate-600 border-slate-200',
  NEGADA: 'bg-slate-100 text-slate-600 border-slate-200',
};

const NOMBRE_ACCION: Record<string, string> = {
  RADICAR: 'Radicó',
  RECIBIR: 'Dio por recibida',
  ASIGNAR: 'Asignó abogado y revisor',
  APROBAR: 'Aprobó',
  DEVOLVER: 'Devolvió',
  NEGAR: 'Negó',
  REENVIAR: 'Reenvió a revisión',
  CORREGIR_DOCUMENTO: 'Corrigió un documento',
  ENVIAR_MINUTA: 'Envió la minuta al visto bueno',
  PERFECCIONAR: 'Subió la minuta firmada',
  PUBLICAR: 'Cargó la publicación en SECOP',
  CORREO_SUPERVISOR: 'Correo al supervisor',
  DESISTIR: 'Desistió',
};

const Tarjeta = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <section className="bg-white border border-gray-200 rounded-xl px-4 py-4 space-y-2.5">
    <h3 className="text-[13px] font-extrabold text-slate-800 m-0">{titulo}</h3>
    {children}
  </section>
);

/** Lo que cada cambio pide o hizo, en una línea. */
function resumenDelCambio(c: TramiteModificacionDetalle['cambios'][number]): string {
  switch (c.efecto) {
    case 'ADICION':
      return [
        c.valorAdicionado ? pesos.format(c.valorAdicionado) : null,
        c.cdp?.numero ? `CDP ${c.cdp.numero}` : null,
        c.valorDespues ? `valor ${pesos.format(c.valorAntes ?? 0)} → ${pesos.format(c.valorDespues)}` : null,
      ].filter(Boolean).join(' · ');
    case 'PRORROGA':
      return [`${c.diasProrroga} días`, c.plazoDespues ? `plazo ${c.plazoAntes} → ${c.plazoDespues} días` : null].filter(Boolean).join(' · ');
    case 'CESION':
      return `a ${c.cesionarioNombre} (${c.cesionarioDocumento})`;
    case 'SUSPENSION':
      return `desde ${c.suspensionDesde}${c.suspensionHasta ? ` hasta ${c.suspensionHasta}` : ''}`;
    case 'REANUDACION':
      return `el ${c.reanudadaEl}`;
    case 'TERMINACION_ANTICIPADA':
      return `${c.terminacionCausal === 'UNILATERAL' ? 'unilateral' : 'mutuo acuerdo'}, el ${c.terminacionEl}`;
    default:
      return c.descripcion ?? '';
  }
}

/** Una modificación radicada: lo que trae, por dónde va y lo que le toca a quien mira (150). */
export function DetalleModificacion({ id, onVolver, onVerProceso }: { id: string; onVolver: () => void; onVerProceso?: (procesoId: string) => void }) {
  const [t, setT] = useState<TramiteModificacionDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [visto, setVisto] = useState<DocumentoVisible | null>(null);
  const [candidatos, setCandidatos] = useState<{ id: string; nombre: string }[]>([]);
  const [asignacion, setAsignacion] = useState({ abogadoId: '', revisorId: '' });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [firma, setFirma] = useState({ numero: '', fechaSuscripcion: hoyEnBogota(), rpNumero: '', rpFechaExpedicion: hoyEnBogota() });
  const [publicacion, setPublicacion] = useState({ fechaPublicacion: hoyEnBogota(), secopNumero: '', secopUrl: '' });
  const dialogo = useDialogo();

  const leer = () =>
    contratacionService
      .tramiteModificacion(id)
      .then((d) => {
        setT(d);
        setError(null);
      })
      .catch((err: any) => setError(err.message));

  useEffect(() => {
    leer();
  }, [id]);

  useEffect(() => {
    if (t?.acciones.asignar && !candidatos.length) {
      contratacionService.candidatosModificacion().then(setCandidatos).catch(() => undefined);
    }
  }, [t?.acciones.asignar]);

  const hacer = async (accion: () => Promise<TramiteModificacionDetalle>, exito: string) => {
    setOcupado(true);
    try {
      setT(await accion());
      setArchivo(null);
      toast.success(exito);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setOcupado(false);
    }
  };

  if (error) return <Aviso tono="error" titulo="No se pudo abrir la modificación">{error}</Aviso>;
  if (!t) return <p className="text-[11.5px] text-slate-400 m-0">Cargando la modificación…</p>;

  const a = t.acciones;
  const ver = (d: DocumentoTramiteModificacion) =>
    setVisto({ nombre: d.archivoNombreOriginal ?? d.nombre, descargaUrl: d.archivoUrl, detalle: `${d.subidoPor ?? ''} · ${momento(d.createdAt)}` });

  const decidir = async (accion: 'APROBAR' | 'DEVOLVER' | 'NEGAR') => {
    let observaciones: string | undefined;
    if (accion !== 'APROBAR') {
      const motivo = await dialogo.pedirMotivo({
        titulo: accion === 'DEVOLVER' ? 'Devolver la modificación' : 'Negar la modificación',
        descripcion:
          accion === 'DEVOLVER'
            ? t.estado === 'EN_VISTO_BUENO'
              ? 'Vuelve al abogado para ajustar la minuta.'
              : 'Vuelve al área para que corrija; al reenviarla, la revisión empieza otra vez desde el primer escalón.'
            : 'La modificación termina sin perfeccionarse. Queda el registro con el motivo.',
        etiqueta: accion === 'DEVOLVER' ? 'Qué hay que corregir' : 'Por qué se niega',
        confirmar: accion === 'DEVOLVER' ? 'Devolver' : 'Negar la modificación',
        tono: accion === 'NEGAR' ? 'peligro' : 'normal',
      });
      if (!motivo) return;
      observaciones = motivo;
    }
    await hacer(
      () => contratacionService.decidirModificacion(t.id, accion, observaciones),
      accion === 'APROBAR' ? 'Aprobado' : accion === 'DEVOLVER' ? 'Devuelta' : 'Modificación negada',
    );
  };

  const desistir = async () => {
    const motivo = await dialogo.pedirMotivo({
      titulo: 'Desistir de la modificación',
      descripcion: 'La modificación se cierra sin perfeccionarse y no cambia el contrato.',
      etiqueta: 'Por qué se desiste',
      confirmar: 'Desistir',
      tono: 'peligro',
    });
    if (!motivo) return;
    await hacer(() => contratacionService.desistirModificacion(t.id, motivo), 'Modificación desistida');
  };

  const recibir = async () => {
    const nota = await dialogo.pedirMotivo({
      titulo: 'Dar por recibida la notificación',
      descripcion: 'El trámite sigue por fuera de la plataforma; aquí queda el registro.',
      etiqueta: 'Nota para el área',
      confirmar: 'Dar por recibida',
      opcional: true,
    });
    if (nota === null) return;
    await hacer(() => contratacionService.recibirModificacion(t.id, nota || undefined), 'Notificación recibida');
  };

  const reenviar = async () => {
    const nota = await dialogo.pedirMotivo({
      titulo: 'Reenviar a revisión',
      descripcion: 'La revisión empieza otra vez desde el primer escalón.',
      etiqueta: 'Qué se corrigió',
      confirmar: 'Reenviar',
      opcional: true,
    });
    if (nota === null) return;
    await hacer(() => contratacionService.reenviarModificacion(t.id, nota || undefined), 'Reenviada a revisión');
  };

  const minutas = t.documentos.filter((d) => d.clase !== 'REQUISITO');
  const viva = t.rondas.find((r) => r.estado === 'EN_CURSO');

  return (
    <div className="space-y-4">
      <button type="button" onClick={onVolver} className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#003DA5] hover:underline">
        <ArrowLeft className="w-3.5 h-3.5" /> Volver a la bandeja
      </button>

      <section className="bg-white border border-gray-200 rounded-xl px-4 py-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-[15px] font-black text-slate-900 m-0">{t.radicado}</h2>
          <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${COLOR_ESTADO[t.estado] ?? ''}`}>{t.estadoNombre}</span>
          <span className="text-[10.5px] font-bold text-slate-500">{t.vinculada ? 'Contrato de la plataforma' : 'Notificación · contrato antiguo'}</span>
        </div>
        <p className="text-[12.5px] text-slate-700 m-0">
          Contrato <strong>{t.contratoNumero}</strong>
          {t.contrato ? ` · ${t.contrato.contratistaNombre} · ${pesos.format(t.contrato.valor)}` : ''}
          {t.contrato && onVerProceso && (
            <button type="button" className="ml-2 text-[11.5px] font-bold text-[#003DA5] hover:underline" onClick={() => onVerProceso(t.contrato!.procesoId)}>
              Ver el proceso
            </button>
          )}
        </p>
        <p className="text-[11.5px] text-slate-500 m-0">
          {t.tipos.map((x) => x.nombre).join(' + ')} · radicada por {t.radicadaPor} el {momento(t.radicadaAt)}
          {t.abogadoNombre ? ` · abogado ${t.abogadoNombre}` : ''}
          {t.revisorNombre ? ` · revisor ${t.revisorNombre}` : ''}
        </p>
        <p className="text-[12px] text-slate-700 m-0 whitespace-pre-line">{t.justificacion}</p>
        {t.motivoCierre && <Aviso tono="error" titulo={t.estadoNombre}>{t.motivoCierre}</Aviso>}
        {t.notaRecibido && <Aviso tono="ok" titulo="Nota de Contratación">{t.notaRecibido}</Aviso>}
        {t.estado === 'PUBLICADA' && (
          <Aviso tono="ok" titulo={`${t.numeroModificacion} · publicada el ${fechaLarga(t.fechaPublicacion!)}`}>
            Suscrita el {fechaLarga(t.fechaSuscripcion!)}{t.secopNumero ? ` · SECOP ${t.secopNumero}` : ''}.
            {t.secopUrl && (
              <a href={t.secopUrl} target="_blank" rel="noreferrer" className="ml-1 font-bold underline inline-flex items-center gap-1">
                Ver en SECOP <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </Aviso>
        )}
      </section>

      {/* ------------------------------------------- lo que le toca a quien mira */}
      {(a.recibir || a.asignar || a.decidir.length > 0 || a.reenviar || a.enviarMinuta || a.perfeccionar || a.publicar) && (
        <section className="bg-white border-2 border-[#003DA5] rounded-xl px-4 py-4 space-y-3">
          <h3 className="text-[13px] font-extrabold text-[#003DA5] m-0">Te toca</h3>

          {a.recibir && (
            <Boton icono={<Inbox className="w-3.5 h-3.5" />} disabled={ocupado} onClick={recibir}>
              Dar por recibida
            </Boton>
          )}

          {a.asignar && (
            <div className="space-y-2">
              <p className="text-[11.5px] text-slate-600 m-0">Elige al abogado y al revisor. La revisión empieza con el abogado.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(['abogadoId', 'revisorId'] as const).map((clave) => (
                  <div key={clave}>
                    <label htmlFor={`asig-${clave}`} className="block text-xs font-bold text-gray-600 mb-1.5">
                      {clave === 'abogadoId' ? 'Abogado' : 'Revisor'} <span className="text-red-600">*</span>
                    </label>
                    <select id={`asig-${clave}`} className={campo} value={asignacion[clave]} onChange={(e) => setAsignacion((s) => ({ ...s, [clave]: e.target.value }))}>
                      <option value="">Elige…</option>
                      {candidatos.map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <Boton
                icono={<UserCheck className="w-3.5 h-3.5" />}
                disabled={ocupado || !asignacion.abogadoId || !asignacion.revisorId || asignacion.abogadoId === asignacion.revisorId}
                onClick={() => hacer(() => contratacionService.asignarModificacion(t.id, asignacion.abogadoId, asignacion.revisorId), 'Asignada; pasa a revisión')}
              >
                Asignar
              </Boton>
            </div>
          )}

          {a.decidir.length > 0 && a.escalonPendiente && (
            <div className="space-y-2">
              <p className="text-[11.5px] text-slate-600 m-0">
                {a.escalonPendiente.fase === 'REVISION' ? 'Revisión' : 'Visto bueno de la minuta'} · escalón «{a.escalonPendiente.nombre}»
              </p>
              <div className="flex gap-2 flex-wrap">
                {a.decidir.includes('APROBAR') && (
                  <Boton icono={<Check className="w-3.5 h-3.5" />} disabled={ocupado} onClick={() => decidir('APROBAR')}>Aprobar</Boton>
                )}
                {a.decidir.includes('DEVOLVER') && (
                  <BotonSecundario icono={<RotateCcw className="w-3.5 h-3.5" />} disabled={ocupado} onClick={() => decidir('DEVOLVER')}>Devolver</BotonSecundario>
                )}
                {a.decidir.includes('NEGAR') && (
                  <BotonSecundario icono={<Ban className="w-3.5 h-3.5" />} disabled={ocupado} onClick={() => decidir('NEGAR')}>Negar</BotonSecundario>
                )}
              </div>
            </div>
          )}

          {a.reenviar && (
            <div className="space-y-2">
              <p className="text-[11.5px] text-slate-600 m-0">Corrige los documentos de abajo y reenvía.</p>
              <Boton icono={<Send className="w-3.5 h-3.5" />} disabled={ocupado} onClick={reenviar}>Reenviar a revisión</Boton>
            </div>
          )}

          {a.enviarMinuta && (
            <div className="space-y-2">
              <SelectorArchivo etiqueta="Minuta de la modificación" archivo={archivo} onElegir={setArchivo} id="mod-minuta" />
              <Boton icono={<Send className="w-3.5 h-3.5" />} disabled={ocupado || !archivo} onClick={() => hacer(() => contratacionService.enviarMinutaModificacion(t.id, archivo!), 'Minuta enviada al visto bueno')}>
                Enviar al visto bueno
              </Boton>
            </div>
          )}

          {a.perfeccionar && (
            <div className="space-y-2">
              <p className="text-[11.5px] text-slate-600 m-0">Al subir la minuta firmada la modificación queda perfeccionada y el contrato cambia.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="firma-numero" className="block text-xs font-bold text-gray-600 mb-1.5">Número de la modificación <span className="text-red-600">*</span></label>
                  <input id="firma-numero" className={campo} placeholder="Modificación No. 1" value={firma.numero} onChange={(e) => setFirma((f) => ({ ...f, numero: e.target.value }))} />
                </div>
                <div>
                  <label htmlFor="firma-fecha" className="block text-xs font-bold text-gray-600 mb-1.5">Fecha de suscripción <span className="text-red-600">*</span></label>
                  <input id="firma-fecha" type="date" max={hoyEnBogota()} className={campo} value={firma.fechaSuscripcion} onChange={(e) => setFirma((f) => ({ ...f, fechaSuscripcion: e.target.value }))} />
                </div>
                {a.pideRp && (
                  <>
                    <div>
                      <label htmlFor="firma-rp" className="block text-xs font-bold text-gray-600 mb-1.5">Número del RP de la adición <span className="text-red-600">*</span></label>
                      <input id="firma-rp" className={campo} value={firma.rpNumero} onChange={(e) => setFirma((f) => ({ ...f, rpNumero: e.target.value }))} />
                    </div>
                    <div>
                      <label htmlFor="firma-rp-fecha" className="block text-xs font-bold text-gray-600 mb-1.5">Fecha del RP <span className="text-red-600">*</span></label>
                      <input id="firma-rp-fecha" type="date" max={hoyEnBogota()} className={campo} value={firma.rpFechaExpedicion} onChange={(e) => setFirma((f) => ({ ...f, rpFechaExpedicion: e.target.value }))} />
                    </div>
                  </>
                )}
              </div>
              <SelectorArchivo etiqueta="Minuta firmada" archivo={archivo} onElegir={setArchivo} id="mod-firmada" />
              <Boton
                icono={<Stamp className="w-3.5 h-3.5" />}
                disabled={ocupado || !archivo || !firma.numero.trim() || (a.pideRp && !firma.rpNumero.trim())}
                onClick={() =>
                  hacer(
                    () =>
                      contratacionService.perfeccionarModificacion(
                        t.id,
                        a.pideRp ? firma : { numero: firma.numero, fechaSuscripcion: firma.fechaSuscripcion },
                        archivo!,
                      ),
                    'Modificación perfeccionada: el contrato ya cambió',
                  )
                }
              >
                Perfeccionar
              </Boton>
            </div>
          )}

          {a.publicar && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="pub-fecha" className="block text-xs font-bold text-gray-600 mb-1.5">Fecha de publicación <span className="text-red-600">*</span></label>
                  <input id="pub-fecha" type="date" max={hoyEnBogota()} className={campo} value={publicacion.fechaPublicacion} onChange={(e) => setPublicacion((p) => ({ ...p, fechaPublicacion: e.target.value }))} />
                </div>
                <div>
                  <label htmlFor="pub-numero" className="block text-xs font-bold text-gray-600 mb-1.5">Número en SECOP</label>
                  <input id="pub-numero" className={campo} value={publicacion.secopNumero} onChange={(e) => setPublicacion((p) => ({ ...p, secopNumero: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="pub-url" className="block text-xs font-bold text-gray-600 mb-1.5">Enlace en SECOP</label>
                  <input id="pub-url" className={campo} value={publicacion.secopUrl} onChange={(e) => setPublicacion((p) => ({ ...p, secopUrl: e.target.value }))} />
                </div>
              </div>
              <SelectorArchivo etiqueta="Evidencia de la publicación" archivo={archivo} onElegir={setArchivo} id="mod-secop" />
              <Boton
                icono={<Upload className="w-3.5 h-3.5" />}
                disabled={ocupado || !archivo}
                onClick={() =>
                  hacer(
                    () =>
                      contratacionService.publicarModificacionTramite(
                        t.id,
                        {
                          fechaPublicacion: publicacion.fechaPublicacion,
                          secopNumero: publicacion.secopNumero.trim() || undefined,
                          secopUrl: publicacion.secopUrl.trim() || undefined,
                        },
                        archivo!,
                      ),
                    'Publicada; se le avisó al supervisor',
                  )
                }
              >
                Cargar la publicación
              </Boton>
            </div>
          )}
        </section>
      )}

      {t.cambios.length > 0 && (
        <Tarjeta titulo="Cambios">
          {t.cambios.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
              <p className="text-[12px] text-slate-700 m-0">
                <strong>{c.tipoNombre}</strong> {resumenDelCambio(c)}
                {c.estado === 'APROBADA' && <span className="ml-2 text-[10px] font-bold text-emerald-700">aplicado al contrato</span>}
              </p>
            </div>
          ))}
        </Tarjeta>
      )}

      {!t.vinculada && Object.values(t.datosContrato ?? {}).some(Boolean) && (
        <Tarjeta titulo="Lo que el área contó del contrato">
          {Object.entries(t.datosContrato).filter(([, v]) => v).map(([k, v]) => (
            <p key={k} className="text-[12px] text-slate-700 m-0">
              <span className="font-bold capitalize">{k}:</span> {String(v)}
            </p>
          ))}
        </Tarjeta>
      )}

      <Tarjeta titulo="Documentos">
        {t.requisitos.map((r) => (
          <div key={r.id} className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] font-semibold text-slate-800">{r.nombre}</span>
              {r.obligatorio && <span className="text-[10px] font-bold text-red-700">obligatorio</span>}
              {r.documento ? (
                <button type="button" className="text-[11.5px] font-bold text-[#003DA5] hover:underline" onClick={() => ver(r.documento!)}>
                  Ver{r.documento.version > 1 ? ` (versión ${r.documento.version})` : ''}
                </button>
              ) : (
                <span className="text-[11px] text-slate-500">sin cargar</span>
              )}
            </div>
            {a.corregirDocumentos && (
              <ReemplazarDocumento
                onSubir={(f) => hacer(() => contratacionService.subirDocumentoModificacion(t.id, r.id, f), 'Documento cargado')}
                ocupado={ocupado}
                id={r.id}
              />
            )}
          </div>
        ))}
        {minutas.length > 0 && (
          <div className="pt-2 border-t border-gray-100 space-y-1">
            {minutas.map((d) => (
              <div key={d.id} className={`flex items-center gap-2 ${d.vigente ? '' : 'opacity-60'}`}>
                <span className="text-[12px] text-slate-700">{d.nombre}{d.version > 1 ? ` · versión ${d.version}` : ''}</span>
                <button type="button" className="text-[11.5px] font-bold text-[#003DA5] hover:underline" onClick={() => ver(d)}>Ver</button>
              </div>
            ))}
          </div>
        )}
      </Tarjeta>

      {t.rondas.length > 0 && (
        <Tarjeta titulo={viva ? `${viva.fase === 'REVISION' ? 'Revisión' : 'Visto bueno'} en curso` : 'Revisiones'}>
          {[...t.rondas].reverse().map((r) => (
            <div key={r.id} className="space-y-1">
              <p className="text-[11px] font-bold text-slate-500 m-0">
                {r.fase === 'REVISION' ? 'Revisión' : 'Visto bueno'} · ronda {r.ronda} · {r.estado.toLowerCase().replace('_', ' ')}
              </p>
              <div className="flex flex-wrap gap-2">
                {r.escalones.map((e) => (
                  <span
                    key={e.orden}
                    className={`text-[11px] px-2 py-0.5 rounded-full border ${
                      e.estado === 'APROBADO'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : e.estado === 'PENDIENTE'
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : e.estado === 'DEVUELTO' || e.estado === 'NEGADO'
                            ? 'bg-red-50 border-red-200 text-red-800'
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    {e.orden}. {e.nombre} · {e.estado.toLowerCase()}
                    {e.decididoPor ? ` · ${e.decididoPor}` : ''}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </Tarjeta>
      )}

      <Tarjeta titulo="Historial">
        {t.eventos.map((e) => (
          <div key={e.id}>
            <p className="text-[11.5px] text-slate-700 m-0">
              <strong>{e.por}</strong> · {NOMBRE_ACCION[e.accion] ?? e.accion} · <span className="text-slate-500">{momento(e.at)}</span>
            </p>
            {e.observaciones && <p className="text-[11.5px] text-slate-600 m-0 pl-3 whitespace-pre-line">{e.observaciones}</p>}
          </div>
        ))}
      </Tarjeta>

      {a.desistir && (
        <BotonSecundario icono={<X className="w-3.5 h-3.5" />} disabled={ocupado} onClick={desistir}>
          Desistir de la modificación
        </BotonSecundario>
      )}

      <VisorDocumento documento={visto} onClose={() => setVisto(null)} />
      {dialogo.elemento}
    </div>
  );
}

/** Cargar o reemplazar un documento requerido, mientras el área puede corregir. */
function ReemplazarDocumento({ onSubir, ocupado, id }: { onSubir: (f: File) => void; ocupado: boolean; id: string }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  return (
    <div className="flex items-end gap-2 flex-wrap pl-3">
      <SelectorArchivo etiqueta="Cargar otra versión" archivo={archivo} onElegir={setArchivo} obligatorio={false} id={`reemplazo-${id}`} />
      {archivo && (
        <BotonSecundario icono={<Upload className="w-3.5 h-3.5" />} disabled={ocupado} onClick={() => { onSubir(archivo); setArchivo(null); }}>
          Subir
        </BotonSecundario>
      )}
    </div>
  );
}
