import React, { useEffect, useMemo, useState } from 'react';
import { CircleCheck, ClipboardCheck, FileText, MessageSquare } from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { CampoFormulario, EstudioPrevio, RevisionEstudioPrevio } from '../../types';
import { ListaDeDocumentos } from '../shared/ListaDeDocumentos';
import { VerSoportes } from '../shared/VerSoporte';
import { fechaLarga } from '../shared/fechas';

const pesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** El valor de un campo como se lee en un documento, no como se edita. */
export function valorLegible(campo: CampoFormulario, valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === '') return null;
  switch (campo.tipo) {
    case 'moneda': {
      const n = Number(valor);
      return Number.isFinite(n) ? pesos.format(n) : String(valor);
    }
    case 'numero': {
      const n = Number(valor);
      return Number.isFinite(n) ? n.toLocaleString('es-CO') : String(valor);
    }
    case 'fecha':
      return /^\d{4}-\d{2}-\d{2}/.test(String(valor)) ? fechaLarga(String(valor).slice(0, 10)) : String(valor);
    case 'casilla':
      return valor === true || valor === 'true' ? 'Sí' : 'No';
    case 'archivo':
      return 'Se entrega en Documentos';
    default:
      return String(valor);
  }
}

/**
 * El estudio previo para leerlo, no para editarlo.
 *
 * Es la otra mitad de la queja que abrió la reestructuración: el abogado
 * revisaba sobre el formulario de quien redactó, con los campos apagados, y
 * se sentía volviendo al mismo punto. Aquí el estudio se presenta como el
 * documento que es —secciones y valores—, con sus soportes y su historial,
 * como el modal de revisión de autos del módulo disciplinario.
 */
export function LecturaEstudioPrevio({ estudio, procesoId }: { estudio: EstudioPrevio; procesoId: string }) {
  const [seccion, setSeccion] = useState<'estudio' | 'documentos' | 'historial'>('estudio');
  const [revisiones, setRevisiones] = useState<RevisionEstudioPrevio[]>([]);

  useEffect(() => {
    contratacionService
      .revisiones(procesoId)
      .then(setRevisiones)
      .catch(() => undefined);
  }, [procesoId, estudio.version]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, CampoFormulario[]>();
    for (const campo of [...estudio.definicionCampos].sort((a, b) => a.orden - b.orden)) {
      const clave = campo.grupo ?? 'General';
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave)!.push(campo);
    }
    return Array.from(mapa.entries());
  }, [estudio.definicionCampos]);

  const devoluciones = revisiones.filter((r) => r.decision === 'DEVUELTO').length;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 pt-3 flex gap-1 border-b border-gray-200">
        {(
          [
            { id: 'estudio' as const, label: 'Estudio previo', icono: FileText },
            { id: 'documentos' as const, label: 'Documentos', icono: ClipboardCheck },
            { id: 'historial' as const, label: 'Historial', icono: MessageSquare, n: revisiones.length },
          ]
        ).map((t) => {
          const Icono = t.icono;
          const activa = seccion === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSeccion(t.id)}
              aria-pressed={activa}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] whitespace-nowrap transition-colors ${
                activa ? 'border-[#003DA5] text-[#003DA5] font-black' : 'border-transparent text-slate-500 font-bold'
              }`}
              style={{ borderBottomWidth: 2, marginBottom: -1 }}
            >
              <Icono className="w-3.5 h-3.5" />
              {t.label}
              {'n' in t && t.n ? (
                <span className="text-[11px] font-bold px-1.5 rounded-full bg-slate-100 text-slate-500">{t.n}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="p-4 space-y-5">
        {seccion === 'estudio' && (
          <>
            <p className="text-[12px] text-slate-500 m-0">
              Versión {estudio.version}
              {devoluciones
                ? ` · devuelto ${devoluciones === 1 ? 'una vez' : `${devoluciones} veces`} antes`
                : ' · primera revisión'}
            </p>
            {grupos.map(([grupo, campos]) => (
              <section key={grupo} aria-label={grupo}>
                <h4 className="text-[12px] font-black uppercase tracking-wide text-[#003DA5] m-0 mb-2 pb-1.5 border-b border-gray-200">
                  {grupo}
                </h4>
                <dl className="m-0 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                  {campos.map((campo) => {
                    const texto = valorLegible(campo, estudio.datos?.[campo.codigo]);
                    return (
                      <div
                        key={campo.codigo}
                        className={campo.tipo === 'texto_largo' ? 'md:col-span-2 min-w-0' : 'min-w-0'}
                      >
                        <dt className="text-[12px] font-bold text-slate-500">{campo.etiqueta}</dt>
                        <dd
                          className={`m-0 mt-0.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                            texto ? 'text-slate-900' : campo.obligatorio ? 'text-amber-700 italic' : 'text-slate-400 italic'
                          }`}
                        >
                          {texto ?? (campo.obligatorio ? 'Obligatorio y sin diligenciar' : 'Sin diligenciar')}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </section>
            ))}
          </>
        )}

        {seccion === 'documentos' && (
          <ListaDeDocumentos
            procesoId={procesoId}
            numeral="3.1"
            titulo="Documentos radicados con el estudio previo"
            bloqueo="Estás revisando: los documentos los carga el área que radicó"
          />
        )}

        {seccion === 'historial' && (
          <section aria-label="Historial de revisión">
            {revisiones.length === 0 ? (
              <p className="text-[12px] text-slate-500 m-0 py-6 text-center">
                Es la primera vez que se revisa: no hay decisiones anteriores.
              </p>
            ) : (
              <ul className="m-0 p-0 list-none space-y-3">
                {revisiones.map((r) => (
                  <li key={r.id} className="flex items-start gap-2.5">
                    {r.decision === 'APROBADO' ? (
                      <CircleCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <MessageSquare className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-slate-800 m-0">
                        {r.decision === 'APROBADO' ? 'Aprobado' : r.decision === 'NEGADO' ? 'Negado' : 'Devuelto'}
                        <span className="text-slate-400 font-semibold"> · versión {r.versionRevisada}</span>
                      </p>
                      {r.observaciones ? (
                        <p className="text-[12px] text-slate-600 m-0 mt-0.5 leading-relaxed">{r.observaciones}</p>
                      ) : null}
                      <VerSoportes soportes={r.soportes} />
                      <p className="text-[11.5px] text-slate-400 m-0 mt-0.5 tabular-nums">
                        {r.revisadoPor} · {new Date(r.createdAt).toLocaleString('es-CO')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
