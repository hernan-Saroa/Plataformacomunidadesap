import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search, Send } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  CambioARadicar,
  ContratoBuscado,
  ParaRadicarModificacion,
  TramiteModificacionDetalle,
} from '../../types';
import { Aviso, Boton, BotonSecundario, campo, SelectorArchivo } from '../shared/PiezasPanel';
import { hoyEnBogota } from '../shared/fechas';

const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const Etiqueta = ({ htmlFor, children, obligatorio }: { htmlFor: string; children: React.ReactNode; obligatorio?: boolean }) => (
  <label htmlFor={htmlFor} className="block text-xs font-bold text-gray-600 mb-1.5">
    {children} {obligatorio && <span className="text-red-600">*</span>}
  </label>
);

/**
 * Radicar una modificación (150).
 *
 * Primero el número del contrato: si está en la plataforma la modificación se
 * vincula —solo ahora, nunca después— y lleva el flujo completo; si no, es una
 * notificación de un contrato antiguo, y basta con los tipos y los documentos.
 */
export function RadicarModificacion({
  onVolver,
  onRadicada,
}: {
  onVolver: () => void;
  onRadicada: (t: TramiteModificacionDetalle) => void;
}) {
  const [catalogo, setCatalogo] = useState<ParaRadicarModificacion | null>(null);
  const [numero, setNumero] = useState('');
  const [buscado, setBuscado] = useState<ContratoBuscado | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [cambios, setCambios] = useState<Record<string, CambioARadicar>>({});
  const [justificacion, setJustificacion] = useState('');
  const [datosContrato, setDatosContrato] = useState({ contratista: '', objeto: '', valor: '', plazo: '', supervisor: '', secopUrl: '' });
  const [archivos, setArchivos] = useState<Record<string, File | null>>({});
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    contratacionService
      .paraRadicarModificacion()
      .then(setCatalogo)
      .catch((err: any) => toast.error('No se pudieron leer los tipos de modificación', { description: err.message }));
  }, []);

  const vinculado = buscado?.encontrado ? buscado : null;

  const buscar = async () => {
    if (!numero.trim()) return;
    setBuscando(true);
    try {
      setBuscado(await contratacionService.buscarContratoParaModificar(numero.trim()));
      setElegidos([]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBuscando(false);
    }
  };

  const tipoDe = (codigo: string) => catalogo?.tipos.find((t) => t.codigo === codigo);
  const admite = (codigo: string) => vinculado?.tipos.find((t) => t.codigo === codigo);

  const alternar = (codigo: string) => {
    setElegidos((lista) => {
      if (lista.includes(codigo)) return lista.filter((c) => c !== codigo);
      // Lo que va solo reemplaza la selección; y nada se suma a lo que va solo.
      if (tipoDe(codigo)?.vaSola) return [codigo];
      return [...lista.filter((c) => !tipoDe(c)?.vaSola), codigo];
    });
  };

  const cambio = (codigo: string) => cambios[codigo] ?? { tipo: codigo };
  const poner = (codigo: string, valor: Partial<CambioARadicar>) =>
    setCambios((c) => ({ ...c, [codigo]: { ...cambio(codigo), ...valor, tipo: codigo } }));

  const requisitos = useMemo(
    () =>
      (catalogo?.requisitos ?? []).filter(
        (r) => r.tiposModificacion.length === 0 || r.tiposModificacion.some((t) => elegidos.includes(t)),
      ),
    [catalogo, elegidos],
  );

  const faltan = requisitos.filter((r) => r.obligatorio && !archivos[r.id]).map((r) => r.nombre);
  const listo = !!buscado && elegidos.length > 0 && justificacion.trim().length >= 10 && faltan.length === 0;

  const radicar = async () => {
    if (!buscado || !listo) return;
    setEnviando(true);
    try {
      const datos = Object.fromEntries(
        Object.entries(datosContrato)
          .filter(([, v]) => v.trim())
          .map(([k, v]) => [k, k === 'valor' ? Number(v) : v.trim()]),
      );
      const tramite = await contratacionService.radicarModificacion(
        {
          contratoNumero: vinculado ? vinculado.contrato.numero : numero.trim(),
          contratoId: vinculado?.contrato.id,
          cambios: elegidos.map((c) => (vinculado ? cambio(c) : { tipo: c })),
          justificacion: justificacion.trim(),
          ...(vinculado ? {} : { datosContrato: datos }),
        },
        Object.fromEntries(Object.entries(archivos).filter(([id, f]) => f && requisitos.some((r) => r.id === id))) as Record<string, File>,
      );
      toast.success(`Modificación radicada: ${tramite.radicado}`);
      onRadicada(tramite);
    } catch (err: any) {
      toast.error('No se pudo radicar', { description: err.message });
    } finally {
      setEnviando(false);
    }
  };

  const camposDelCambio = (codigo: string) => {
    const tipo = tipoDe(codigo);
    if (!tipo || !vinculado) return null;
    const c = cambio(codigo);
    const id = (s: string) => `mod-${codigo}-${s}`;
    switch (tipo.efecto) {
      case 'ADICION':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <Etiqueta htmlFor={id('valor')} obligatorio>Valor adicionado</Etiqueta>
              <input id={id('valor')} type="number" min={1} className={campo} value={c.valorAdicionado ?? ''}
                onChange={(e) => poner(codigo, { valorAdicionado: Number(e.target.value) || undefined })} />
            </div>
            <div>
              <Etiqueta htmlFor={id('cdp')} obligatorio>Número del CDP</Etiqueta>
              <input id={id('cdp')} className={campo} value={c.cdp?.numero ?? ''}
                onChange={(e) => poner(codigo, { cdp: { ...(c.cdp ?? { valor: 0, fechaExpedicion: '', rubro: '' }), numero: e.target.value } })} />
            </div>
            <div>
              <Etiqueta htmlFor={id('cdp-valor')} obligatorio>Valor del CDP</Etiqueta>
              <input id={id('cdp-valor')} type="number" min={1} className={campo} value={c.cdp?.valor || ''}
                onChange={(e) => poner(codigo, { cdp: { ...(c.cdp ?? { numero: '', fechaExpedicion: '', rubro: '' }), valor: Number(e.target.value) } })} />
            </div>
            <div>
              <Etiqueta htmlFor={id('cdp-fecha')} obligatorio>Fecha de expedición del CDP</Etiqueta>
              <input id={id('cdp-fecha')} type="date" max={hoyEnBogota()} className={campo} value={c.cdp?.fechaExpedicion ?? ''}
                onChange={(e) => poner(codigo, { cdp: { ...(c.cdp ?? { numero: '', valor: 0, rubro: '' }), fechaExpedicion: e.target.value } })} />
            </div>
            <div className="sm:col-span-2">
              <Etiqueta htmlFor={id('cdp-rubro')} obligatorio>Rubro</Etiqueta>
              <input id={id('cdp-rubro')} className={campo} value={c.cdp?.rubro ?? ''}
                onChange={(e) => poner(codigo, { cdp: { ...(c.cdp ?? { numero: '', valor: 0, fechaExpedicion: '' }), rubro: e.target.value } })} />
            </div>
          </div>
        );
      case 'PRORROGA':
        return (
          <div>
            <Etiqueta htmlFor={id('dias')} obligatorio>Días de prórroga</Etiqueta>
            <input id={id('dias')} type="number" min={1} className={campo} value={c.diasProrroga ?? ''}
              onChange={(e) => poner(codigo, { diasProrroga: Number(e.target.value) || undefined })} />
          </div>
        );
      case 'CESION':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <Etiqueta htmlFor={id('ces-nombre')} obligatorio>Cesionario</Etiqueta>
              <input id={id('ces-nombre')} className={campo} value={c.cesionario?.nombre ?? ''}
                onChange={(e) => poner(codigo, { cesionario: { documento: c.cesionario?.documento ?? '', tipo: c.cesionario?.tipo ?? 'NATURAL', nombre: e.target.value } })} />
            </div>
            <div>
              <Etiqueta htmlFor={id('ces-doc')} obligatorio>Documento del cesionario</Etiqueta>
              <input id={id('ces-doc')} className={campo} value={c.cesionario?.documento ?? ''}
                onChange={(e) => poner(codigo, { cesionario: { nombre: c.cesionario?.nombre ?? '', tipo: c.cesionario?.tipo ?? 'NATURAL', documento: e.target.value } })} />
            </div>
            <div>
              <Etiqueta htmlFor={id('ces-tipo')} obligatorio>Tipo de persona</Etiqueta>
              <select id={id('ces-tipo')} className={campo} value={c.cesionario?.tipo ?? 'NATURAL'}
                onChange={(e) => poner(codigo, { cesionario: { nombre: c.cesionario?.nombre ?? '', documento: c.cesionario?.documento ?? '', tipo: e.target.value as 'NATURAL' | 'JURIDICA' } })}>
                <option value="NATURAL">Natural</option>
                <option value="JURIDICA">Jurídica</option>
              </select>
            </div>
          </div>
        );
      case 'SUSPENSION':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <Etiqueta htmlFor={id('desde')} obligatorio>Suspendido desde</Etiqueta>
              <input id={id('desde')} type="date" className={campo} value={c.suspensionDesde ?? ''}
                onChange={(e) => poner(codigo, { suspensionDesde: e.target.value })} />
            </div>
            <div>
              <Etiqueta htmlFor={id('hasta')}>Hasta (prevista)</Etiqueta>
              <input id={id('hasta')} type="date" className={campo} value={c.suspensionHasta ?? ''}
                onChange={(e) => poner(codigo, { suspensionHasta: e.target.value || undefined })} />
            </div>
          </div>
        );
      case 'REANUDACION':
        return (
          <div>
            <Etiqueta htmlFor={id('reanuda')} obligatorio>Fecha de reanudación</Etiqueta>
            <input id={id('reanuda')} type="date" className={campo} value={c.reanudadaEl ?? ''}
              onChange={(e) => poner(codigo, { reanudadaEl: e.target.value })} />
          </div>
        );
      case 'TERMINACION_ANTICIPADA':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <Etiqueta htmlFor={id('causal')} obligatorio>Causal</Etiqueta>
              <select id={id('causal')} className={campo} value={c.terminacionCausal ?? ''}
                onChange={(e) => poner(codigo, { terminacionCausal: (e.target.value || undefined) as CambioARadicar['terminacionCausal'] })}>
                <option value="">Elige la causal</option>
                <option value="MUTUO_ACUERDO">Mutuo acuerdo</option>
                <option value="UNILATERAL">Decisión unilateral motivada</option>
              </select>
            </div>
            <div>
              <Etiqueta htmlFor={id('termina')} obligatorio>Fecha de terminación</Etiqueta>
              <input id={id('termina')} type="date" className={campo} value={c.terminacionEl ?? ''}
                onChange={(e) => poner(codigo, { terminacionEl: e.target.value })} />
            </div>
          </div>
        );
      default:
        return (
          <div>
            <Etiqueta htmlFor={id('desc')} obligatorio={tipo.efecto === 'OTRO'}>Qué se modifica</Etiqueta>
            <input id={id('desc')} className={campo} maxLength={300} value={c.descripcion ?? ''}
              onChange={(e) => poner(codigo, { descripcion: e.target.value })} />
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={onVolver} className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#003DA5] hover:underline">
        <ArrowLeft className="w-3.5 h-3.5" /> Volver a la bandeja
      </button>

      <section className="bg-white border border-gray-200 rounded-xl px-4 py-4 space-y-3">
        <h2 className="text-[13px] font-extrabold text-slate-800 m-0">1. Contrato que se modifica</h2>
        <div className="flex gap-2 items-end flex-wrap">
          <div className="flex-1" style={{ minWidth: 220 }}>
            <Etiqueta htmlFor="mod-numero" obligatorio>Número del contrato</Etiqueta>
            <input
              id="mod-numero"
              className={campo}
              value={numero}
              onChange={(e) => {
                setNumero(e.target.value);
                setBuscado(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && buscar()}
            />
          </div>
          <BotonSecundario icono={<Search className="w-3.5 h-3.5" />} onClick={buscar} disabled={buscando || !numero.trim()}>
            Buscar
          </BotonSecundario>
        </div>

        {vinculado && (
          <Aviso tono="ok" titulo={`Contrato ${vinculado.contrato.numero} en la plataforma: se vincula`}>
            {vinculado.contrato.contratistaNombre} · {pesos.format(vinculado.contrato.valor)} · {vinculado.contrato.objeto}. La
            modificación pasa por revisión, minuta, visto bueno y firma, y al perfeccionarse cambia el contrato. El vínculo
            no se puede hacer después.
          </Aviso>
        )}
        {buscado && !buscado.encontrado && (
          <>
            <Aviso tono="aviso" titulo="Contrato que no está en la plataforma: se radica como notificación">
              Le llega a la Dirección de Contratación con los documentos, y el trámite se hace por fuera. Puedes contar
              lo que sepas del contrato; nada de esto es obligatorio.
            </Aviso>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {([
                ['contratista', 'Contratista'],
                ['objeto', 'Objeto'],
                ['valor', 'Valor inicial'],
                ['plazo', 'Plazo'],
                ['supervisor', 'Supervisor'],
                ['secopUrl', 'Enlace en SECOP'],
              ] as const).map(([clave, etiqueta]) => (
                <div key={clave}>
                  <Etiqueta htmlFor={`mod-ant-${clave}`}>{etiqueta}</Etiqueta>
                  <input
                    id={`mod-ant-${clave}`}
                    type={clave === 'valor' ? 'number' : 'text'}
                    className={campo}
                    value={datosContrato[clave]}
                    onChange={(e) => setDatosContrato((d) => ({ ...d, [clave]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {buscado && (
        <section className="bg-white border border-gray-200 rounded-xl px-4 py-4 space-y-3">
          <h2 className="text-[13px] font-extrabold text-slate-800 m-0">2. Qué se modifica</h2>
          <p className="text-[11.5px] text-slate-500 m-0">
            Puedes marcar varios cambios para una misma minuta. Los que van solos no se combinan.
          </p>
          <div className="space-y-2">
            {(catalogo?.tipos ?? []).map((t) => {
              const regla = admite(t.codigo);
              const bloqueado = !!vinculado && regla && !regla.puede;
              return (
                <div key={t.codigo} className="rounded-lg border border-gray-200 px-3 py-2.5 space-y-2">
                  <label className={`flex items-start gap-2 ${bloqueado ? 'opacity-60' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      disabled={bloqueado}
                      checked={elegidos.includes(t.codigo)}
                      onChange={() => alternar(t.codigo)}
                      className="w-4 h-4 mt-0.5 rounded border-gray-300 text-[#003DA5] focus:ring-[#003DA5]"
                    />
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-bold text-slate-800">
                        {t.nombre}
                        {t.vaSola && <span className="ml-2 text-[10px] font-bold text-amber-700">va sola</span>}
                      </span>
                      {t.descripcion && <span className="block text-[11px] text-slate-500">{t.descripcion}</span>}
                      {bloqueado && <span className="block text-[11px] text-red-700">No se puede: {regla?.motivo}</span>}
                    </span>
                  </label>
                  {elegidos.includes(t.codigo) && camposDelCambio(t.codigo)}
                </div>
              );
            })}
          </div>

          <div>
            <Etiqueta htmlFor="mod-justificacion" obligatorio>Justificación</Etiqueta>
            <textarea
              id="mod-justificacion"
              rows={3}
              className={campo}
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
              placeholder="Por qué se necesita la modificación"
            />
          </div>
        </section>
      )}

      {buscado && elegidos.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-xl px-4 py-4 space-y-3">
          <h2 className="text-[13px] font-extrabold text-slate-800 m-0">3. Documentos</h2>
          {requisitos.length === 0 && (
            <p className="text-[11.5px] text-slate-500 m-0">Estos tipos no piden documentos.</p>
          )}
          {requisitos.map((r) => (
            <SelectorArchivo
              key={r.id}
              id={`mod-doc-${r.id}`}
              etiqueta={r.nombre}
              ayuda={r.descripcion ?? undefined}
              obligatorio={r.obligatorio}
              archivo={archivos[r.id] ?? null}
              onElegir={(f) => setArchivos((a) => ({ ...a, [r.id]: f }))}
            />
          ))}
        </section>
      )}

      {buscado && (
        <div className="flex items-center gap-3 flex-wrap">
          <Boton icono={<Send className="w-3.5 h-3.5" />} onClick={radicar} disabled={!listo || enviando}>
            {enviando ? 'Radicando…' : vinculado ? 'Radicar la modificación' : 'Radicar la notificación'}
          </Boton>
          {!listo && (
            <p className="text-[11px] text-slate-500 m-0">
              {elegidos.length === 0
                ? 'Elige al menos un tipo de modificación.'
                : justificacion.trim().length < 10
                  ? 'Escribe la justificación.'
                  : faltan.length
                    ? `Faltan: ${faltan.join(', ')}.`
                    : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
