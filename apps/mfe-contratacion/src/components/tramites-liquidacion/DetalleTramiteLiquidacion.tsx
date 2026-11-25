import React, { useEffect, useState } from 'react';
import { Check, ExternalLink, Lock, RotateCcw, Send, Stamp, Upload, UserCheck, X } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { DocumentoTramiteLiquidacion, TramiteLiquidacionDetalle } from '../../types';
import { Aviso, Boton, BotonSecundario, campo, SelectorArchivo } from '../shared/PiezasPanel';
import { DocumentoVisible, VisorDocumento } from '../shared/VisorDocumento';
import { fechaLarga, hoyEnBogota, momento } from '../shared/fechas';
import { useDialogo } from '../shared/useDialogo';

export const COLOR_ESTADO_LIQUIDACION: Record<string, string> = {
  RADICADA: 'bg-blue-50 text-blue-800 border-blue-200',
  EN_REVISION: 'bg-amber-50 text-amber-800 border-amber-200',
  DEVUELTA: 'bg-red-50 text-red-800 border-red-200',
  ACTA: 'bg-amber-50 text-amber-800 border-amber-200',
  EN_VISTO_BUENO: 'bg-amber-50 text-amber-800 border-amber-200',
  EN_FIRMA: 'bg-blue-50 text-blue-800 border-blue-200',
  PERFECCIONADA: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  PUBLICADA: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  CERRADA: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  DESISTIDA: 'bg-slate-100 text-slate-600 border-slate-200',
};

const NOMBRE_ACCION: Record<string, string> = {
  RADICAR: 'Radicó',
  ASIGNAR: 'Asignó al abogado',
  APROBAR: 'Aprobó',
  DEVOLVER: 'Devolvió al área',
  REENVIAR: 'Reenvió',
  CORREGIR_DOCUMENTO: 'Corrigió un documento',
  ENVIAR_ACTA: 'Envió el acta al visto bueno',
  PERFECCIONAR: 'Subió el acta firmada',
  PUBLICAR: 'Cargó la liquidación en SECOP',
  CERRAR_EN_SECOP: 'Cerró el contrato en SECOP',
  CORREO_SUPERVISOR: 'Correo al supervisor',
  DESISTIR: 'Desistió',
};

const Tarjeta = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <section className="bg-white border border-gray-200 rounded-xl px-4 py-4 space-y-2.5">
    <h3 className="text-[13px] font-extrabold text-slate-800 m-0">{titulo}</h3>
    {children}
  </section>
);

const Etiqueta = ({ htmlFor, children, obligatorio }: { htmlFor: string; children: React.ReactNode; obligatorio?: boolean }) => (
  <label htmlFor={htmlFor} className="block text-xs font-bold text-gray-600 mb-1.5">
    {children} {obligatorio && <span className="text-red-600">*</span>}
  </label>
);

/**
 * Un trámite de liquidación o de cierre (151): por dónde va y lo que le toca a
 * quien mira. Lo usan el panel de la 10.2 y la bandeja.
 */
export function DetalleTramiteLiquidacion({
  id,
  inicial,
  onCambio,
  onVerProceso,
}: {
  id: string;
  inicial?: TramiteLiquidacionDetalle;
  onCambio?: (t: TramiteLiquidacionDetalle) => void;
  onVerProceso?: (procesoId: string) => void;
}) {
  const [t, setT] = useState<TramiteLiquidacionDetalle | null>(inicial ?? null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [visto, setVisto] = useState<DocumentoVisible | null>(null);
  const [candidatos, setCandidatos] = useState<{ id: string; nombre: string }[]>([]);
  const [abogadoId, setAbogadoId] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [pazYSalvoArchivo, setPazYSalvoArchivo] = useState<File | null>(null);
  const [firma, setFirma] = useState({ tipo: 'BILATERAL' as 'BILATERAL' | 'UNILATERAL', fechaActa: hoyEnBogota(), pazYSalvo: false });
  const [secop, setSecop] = useState({ fecha: hoyEnBogota(), secopNumero: '', secopUrl: '' });
  const dialogo = useDialogo();

  useEffect(() => {
    if (inicial) {
      setT(inicial);
      return;
    }
    contratacionService
      .tramiteLiquidacion(id)
      .then((d) => {
        setT(d);
        setError(null);
      })
      .catch((err: any) => setError(err.message));
  }, [id, inicial]);

  useEffect(() => {
    if (t?.acciones.asignar && !candidatos.length) {
      contratacionService.candidatosLiquidacion(t.clase).then(setCandidatos).catch(() => undefined);
    }
  }, [t?.acciones.asignar]);

  const hacer = async (accion: () => Promise<TramiteLiquidacionDetalle>, exito: string) => {
    setOcupado(true);
    try {
      const nuevo = await accion();
      setT(nuevo);
      setArchivo(null);
      setPazYSalvoArchivo(null);
      onCambio?.(nuevo);
      toast.success(exito);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setOcupado(false);
    }
  };

  if (error) return <Aviso tono="error" titulo="No se pudo abrir el trámite">{error}</Aviso>;
  if (!t) return <p className="text-[11.5px] text-slate-400 m-0">Cargando el trámite…</p>;

  const a = t.acciones;
  const cierre = t.clase === 'CIERRE';
  const ver = (d: DocumentoTramiteLiquidacion) =>
    setVisto({ nombre: d.archivoNombreOriginal ?? d.nombre, descargaUrl: d.archivoUrl, detalle: `${d.subidoPor ?? ''} · ${momento(d.createdAt)}` });

  const decidir = async (accion: 'APROBAR' | 'DEVOLVER') => {
    let observaciones: string | undefined;
    if (accion === 'DEVOLVER') {
      const motivo = await dialogo.pedirMotivo({
        titulo: 'Devolver',
        descripcion:
          a.escalonPendiente?.fase === 'VISTO_BUENO'
            ? 'Vuelve al abogado para ajustar el acta.'
            : 'Vuelve al área para que corrija; al reenviarla, la revisión empieza otra vez con el abogado.',
        etiqueta: 'Qué hay que corregir',
        confirmar: 'Devolver',
      });
      if (!motivo) return;
      observaciones = motivo;
    }
    await hacer(() => contratacionService.decidirLiquidacion(t.id, accion, observaciones), accion === 'APROBAR' ? 'Aprobado' : 'Devuelta');
  };

  const devolverAlArea = async () => {
    const motivo = await dialogo.pedirMotivo({
      titulo: 'Devolver al área',
      descripcion: 'El área corrige y la reenvía.',
      etiqueta: 'Qué hay que corregir',
      confirmar: 'Devolver',
    });
    if (!motivo) return;
    await hacer(() => contratacionService.devolverLiquidacionAlArea(t.id, motivo), 'Devuelta al área');
  };

  const reenviar = async () => {
    const nota = await dialogo.pedirMotivo({
      titulo: 'Reenviar',
      descripcion: cierre
        ? 'Vuelve a quien lo devolvió.'
        : 'La revisión empieza otra vez con el abogado.',
      etiqueta: 'Qué se corrigió',
      confirmar: 'Reenviar',
      opcional: true,
    });
    if (nota === null) return;
    await hacer(() => contratacionService.reenviarLiquidacion(t.id, nota || undefined), 'Reenviada');
  };

  const desistir = async () => {
    const motivo = await dialogo.pedirMotivo({
      titulo: `Desistir de la ${t.claseNombre.toLowerCase()}`,
      descripcion: 'El trámite se cierra sin efectos y la etapa 10 vuelve a esperar uno nuevo.',
      etiqueta: 'Por qué se desiste',
      confirmar: 'Desistir',
      tono: 'peligro',
    });
    if (!motivo) return;
    await hacer(() => contratacionService.desistirLiquidacion(t.id, motivo), 'Trámite desistido');
  };

  const evidencia = () => ({
    fecha: secop.fecha,
    secopNumero: secop.secopNumero.trim() || undefined,
    secopUrl: secop.secopUrl.trim() || undefined,
  });

  const otrosDocumentos = t.documentos.filter((d) => d.clase !== 'REQUISITO');
  const viva = t.rondas.find((r) => r.estado === 'EN_CURSO');
  const algoMeToca =
    a.asignar || a.devolverAlArea || a.decidir.length > 0 || a.reenviar || a.enviarActa || a.perfeccionar || a.publicar || a.cerrarEnSecop;

  const camposSecop = (prefijo: string) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      <div>
        <Etiqueta htmlFor={`${prefijo}-fecha`} obligatorio>
          {cierre ? 'Fecha del cierre en SECOP' : 'Fecha de publicación'}
        </Etiqueta>
        <input id={`${prefijo}-fecha`} type="date" max={hoyEnBogota()} className={campo} value={secop.fecha} onChange={(e) => setSecop((p) => ({ ...p, fecha: e.target.value }))} />
      </div>
      <div>
        <Etiqueta htmlFor={`${prefijo}-numero`}>Número en SECOP</Etiqueta>
        <input id={`${prefijo}-numero`} className={campo} value={secop.secopNumero} onChange={(e) => setSecop((p) => ({ ...p, secopNumero: e.target.value }))} />
      </div>
      <div className="sm:col-span-2">
        <Etiqueta htmlFor={`${prefijo}-url`}>Enlace en SECOP</Etiqueta>
        <input id={`${prefijo}-url`} className={campo} value={secop.secopUrl} onChange={(e) => setSecop((p) => ({ ...p, secopUrl: e.target.value }))} />
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <section className="bg-white border border-gray-200 rounded-xl px-4 py-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-[14px] font-black text-slate-900 m-0">
            {t.claseNombre} · {t.radicado}
          </h3>
          <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${COLOR_ESTADO_LIQUIDACION[t.estado] ?? ''}`}>{t.estadoNombre}</span>
        </div>
        {t.contrato && (
          <p className="text-[12px] text-slate-700 m-0">
            Contrato <strong>{t.contrato.numero}</strong> · {t.contrato.contratistaNombre}
            {t.proceso && onVerProceso && (
              <button type="button" className="ml-2 text-[11.5px] font-bold text-[#003DA5] hover:underline" onClick={() => onVerProceso(t.proceso!.id)}>
                Ver el proceso {t.proceso.radicado}
              </button>
            )}
          </p>
        )}
        <p className="text-[11.5px] text-slate-500 m-0">
          Radicada por {t.radicadaPor} el {momento(t.radicadaAt)}
          {t.liderNombre ? ` · ${cierre ? 'asignó' : 'líder'} ${t.liderNombre}` : ''}
          {t.abogadoNombre ? ` · abogado ${t.abogadoNombre}` : ''}
        </p>
        {t.observaciones && <p className="text-[12px] text-slate-700 m-0 whitespace-pre-line">{t.observaciones}</p>}
        {t.motivoCierre && <Aviso tono="error" titulo={t.estadoNombre}>{t.motivoCierre}</Aviso>}
        {(t.estado === 'PUBLICADA' || t.estado === 'CERRADA') && (
          <Aviso tono="ok" titulo={`${t.estado === 'CERRADA' ? 'Cerrado' : 'Publicada'} en SECOP II el ${fechaLarga(t.fechaPublicacion!)}`}>
            {t.estado === 'CERRADA' ? 'El contrato quedó cerrado sin liquidarse (PSPAG).' : 'El contrato quedó liquidado.'}
            {t.secopNumero ? ` SECOP ${t.secopNumero}.` : ''}
            {t.secopUrl && (
              <a href={t.secopUrl} target="_blank" rel="noreferrer" className="ml-1 font-bold underline inline-flex items-center gap-1">
                Ver en SECOP <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </Aviso>
        )}
      </section>

      {/* ------------------------------------------- lo que le toca a quien mira */}
      {algoMeToca && (
        <section className="bg-white border-2 border-[#003DA5] rounded-xl px-4 py-4 space-y-3">
          <h3 className="text-[13px] font-extrabold text-[#003DA5] m-0">Te toca</h3>

          {a.asignar && (
            <div className="space-y-2">
              <p className="text-[11.5px] text-slate-600 m-0">
                {cierre
                  ? 'Elige al abogado que revisa y cierra en SECOP II, o devuélvelo al área.'
                  : 'Elige al abogado. Quedas como la líder: revisas después del abogado y das el primer visto bueno.'}
              </p>
              <div className="max-w-sm">
                <Etiqueta htmlFor="liq-abogado" obligatorio>Abogado</Etiqueta>
                <select id="liq-abogado" className={campo} value={abogadoId} onChange={(e) => setAbogadoId(e.target.value)}>
                  <option value="">Elige…</option>
                  {candidatos.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <Boton
                icono={<UserCheck className="w-3.5 h-3.5" />}
                disabled={ocupado || !abogadoId}
                onClick={() => hacer(() => contratacionService.asignarLiquidacion(t.id, abogadoId), 'Asignada; pasa a revisión')}
              >
                Asignar
              </Boton>
            </div>
          )}

          {a.decidir.length > 0 && a.escalonPendiente && (
            <div className="space-y-2">
              <p className="text-[11.5px] text-slate-600 m-0">
                {a.escalonPendiente.fase === 'REVISION' ? 'Revisión' : 'Visto bueno del acta'} · escalón «{a.escalonPendiente.nombre}»
              </p>
              <div className="flex gap-2 flex-wrap">
                {a.decidir.includes('APROBAR') && (
                  <Boton icono={<Check className="w-3.5 h-3.5" />} disabled={ocupado} onClick={() => decidir('APROBAR')}>
                    {a.escalonPendiente.fase === 'VISTO_BUENO' ? 'Dar visto bueno' : 'Aprobar'}
                  </Boton>
                )}
                {a.decidir.includes('DEVOLVER') && (
                  <BotonSecundario icono={<RotateCcw className="w-3.5 h-3.5" />} disabled={ocupado} onClick={() => decidir('DEVOLVER')}>
                    Devolver
                  </BotonSecundario>
                )}
              </div>
            </div>
          )}

          {a.cerrarEnSecop && (
            <div className="space-y-2">
              <p className="text-[11.5px] text-slate-600 m-0">
                Revisa la solicitud, ciérrala en SECOP II y carga la evidencia: el contrato queda cerrado.
              </p>
              {camposSecop('cie')}
              <SelectorArchivo etiqueta="Evidencia del cierre en SECOP II" archivo={archivo} onElegir={setArchivo} id="cie-evidencia" />
              <Boton
                icono={<Lock className="w-3.5 h-3.5" />}
                disabled={ocupado || !archivo}
                onClick={() => hacer(() => contratacionService.cerrarEnSecop(t.id, evidencia(), archivo!), 'Contrato cerrado')}
              >
                Cerrar el contrato
              </Boton>
            </div>
          )}

          {a.devolverAlArea && (
            <BotonSecundario icono={<RotateCcw className="w-3.5 h-3.5" />} disabled={ocupado} onClick={devolverAlArea}>
              Devolver al área
            </BotonSecundario>
          )}

          {a.reenviar && (
            <div className="space-y-2">
              <p className="text-[11.5px] text-slate-600 m-0">Corrige los documentos de abajo y reenvía.</p>
              <Boton icono={<Send className="w-3.5 h-3.5" />} disabled={ocupado} onClick={reenviar}>Reenviar</Boton>
            </div>
          )}

          {a.enviarActa && (
            <div className="space-y-2">
              <p className="text-[11.5px] text-slate-600 m-0">Incorpora los ajustes de la revisión al acta y envíala al visto bueno.</p>
              <SelectorArchivo etiqueta="Acta de liquidación ajustada" archivo={archivo} onElegir={setArchivo} id="liq-acta" />
              <Boton
                icono={<Send className="w-3.5 h-3.5" />}
                disabled={ocupado || !archivo}
                onClick={() => hacer(() => contratacionService.enviarActaLiquidacion(t.id, archivo!), 'Acta enviada al visto bueno')}
              >
                Enviar al visto bueno
              </Boton>
            </div>
          )}

          {a.perfeccionar && (
            <div className="space-y-2">
              <p className="text-[11.5px] text-slate-600 m-0">
                Sube el acta firmada en su última versión: el contrato queda liquidado y el balance se congela.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <Etiqueta htmlFor="firma-tipo" obligatorio>Tipo de liquidación</Etiqueta>
                  <select id="firma-tipo" className={campo} value={firma.tipo} onChange={(e) => setFirma((f) => ({ ...f, tipo: e.target.value as any }))}>
                    <option value="BILATERAL">Bilateral (de común acuerdo)</option>
                    <option value="UNILATERAL">Unilateral (acto de la entidad)</option>
                  </select>
                </div>
                <div>
                  <Etiqueta htmlFor="firma-fecha" obligatorio>Fecha del acta</Etiqueta>
                  <input id="firma-fecha" type="date" max={hoyEnBogota()} className={campo} value={firma.fechaActa} onChange={(e) => setFirma((f) => ({ ...f, fechaActa: e.target.value }))} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-[12px] text-slate-700">
                <input type="checkbox" checked={firma.pazYSalvo} onChange={(e) => setFirma((f) => ({ ...f, pazYSalvo: e.target.checked }))} />
                Las partes quedan a paz y salvo
              </label>
              <SelectorArchivo etiqueta="Acta firmada" archivo={archivo} onElegir={setArchivo} id="liq-firmada" />
              {firma.pazYSalvo && (
                <SelectorArchivo etiqueta="Soporte del paz y salvo" archivo={pazYSalvoArchivo} onElegir={setPazYSalvoArchivo} id="liq-paz" />
              )}
              <Boton
                icono={<Stamp className="w-3.5 h-3.5" />}
                disabled={ocupado || !archivo || (firma.pazYSalvo && !pazYSalvoArchivo)}
                onClick={() =>
                  hacer(
                    () => contratacionService.perfeccionarLiquidacion(t.id, firma, archivo!, firma.pazYSalvo ? pazYSalvoArchivo : null),
                    'Acta firmada: el contrato quedó liquidado',
                  )
                }
              >
                Subir el acta firmada
              </Boton>
            </div>
          )}

          {a.publicar && (
            <div className="space-y-2">
              <p className="text-[11.5px] text-slate-600 m-0">Carga la liquidación en SECOP II; se le avisa al supervisor.</p>
              {camposSecop('liq')}
              <SelectorArchivo etiqueta="Evidencia de la publicación" archivo={archivo} onElegir={setArchivo} id="liq-secop" />
              <Boton
                icono={<Upload className="w-3.5 h-3.5" />}
                disabled={ocupado || !archivo}
                onClick={() => hacer(() => contratacionService.publicarLiquidacion(t.id, evidencia(), archivo!), 'Publicada; se le avisó al supervisor')}
              >
                Cargar la publicación
              </Boton>
            </div>
          )}
        </section>
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
                onSubir={(f) => hacer(() => contratacionService.subirDocumentoLiquidacion(t.id, r.id, f), 'Documento cargado')}
                ocupado={ocupado}
                id={r.id}
              />
            )}
          </div>
        ))}
        {otrosDocumentos.length > 0 && (
          <div className="pt-2 border-t border-gray-100 space-y-1">
            {otrosDocumentos.map((d) => (
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
                          : e.estado === 'DEVUELTO'
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
          Desistir de la {t.claseNombre.toLowerCase()}
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
      <SelectorArchivo etiqueta="Cargar otra versión" archivo={archivo} onElegir={setArchivo} obligatorio={false} id={`liq-reemplazo-${id}`} />
      {archivo && (
        <BotonSecundario icono={<Upload className="w-3.5 h-3.5" />} disabled={ocupado} onClick={() => { onSubir(archivo); setArchivo(null); }}>
          Subir
        </BotonSecundario>
      )}
    </div>
  );
}
