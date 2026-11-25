import React, { useEffect, useState } from 'react';
import { FileCheck2, Send } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { SituacionTramiteLiquidacion } from '../../types';
import { Aviso, Boton, campo, SelectorArchivo } from '../shared/PiezasPanel';
import { momento } from '../shared/fechas';
import { DetalleTramiteLiquidacion } from './DetalleTramiteLiquidacion';

/**
 * La liquidación o el cierre del contrato, desde el proceso (151).
 *
 * Vive en la 10.2. Antes de radicar dice qué le toca al contrato —liquidación,
 * o cierre si es PSPAG— y qué falta de la etapa 9; radicar abre la etapa 10.
 * Después muestra el trámite con lo que le toca a quien mira.
 */
export function PanelTramiteLiquidacion({
  procesoId,
  onCambio,
  onSituacion,
}: {
  procesoId: string;
  onCambio?: () => void;
  onSituacion?: (s: SituacionTramiteLiquidacion) => void;
}) {
  const [s, setS] = useState<SituacionTramiteLiquidacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [documentos, setDocumentos] = useState<Record<string, File>>({});
  const [observaciones, setObservaciones] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const leer = () =>
    contratacionService
      .situacionTramiteLiquidacion(procesoId)
      .then((d) => {
        setS(d);
        setError(null);
        onSituacion?.(d);
      })
      .catch((err: any) => setError(err.message));

  useEffect(() => {
    leer();
  }, [procesoId]);

  if (error) return <Aviso tono="error" titulo="No se pudo leer la liquidación del contrato">{error}</Aviso>;
  if (!s) return <p className="text-[11.5px] text-slate-400 m-0">Cargando…</p>;

  if (s.tramite) {
    return (
      <DetalleTramiteLiquidacion
        id={s.tramite.id}
        inicial={s.tramite}
        onCambio={() => {
          leer();
          onCambio?.();
        }}
      />
    );
  }

  if (!s.clase) return <Aviso tono="aviso" titulo="Todavía no hay contrato">{s.motivoNoPuede}</Aviso>;

  const nombre = s.claseNombre!.toLowerCase();
  const faltanDocs = s.requisitos.filter((r) => r.obligatorio && !documentos[r.id]);

  const radicar = async () => {
    setOcupado(true);
    try {
      await contratacionService.radicarTramiteLiquidacion(procesoId, documentos, observaciones.trim() || undefined);
      toast.success(`${s.claseNombre} radicada: la etapa 10 queda abierta`);
      setDocumentos({});
      setObservaciones('');
      await leer();
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <section className="bg-white border border-gray-200 rounded-xl px-4 py-4 space-y-3">
      <div className="flex items-center gap-2">
        <FileCheck2 className="w-4 h-4 text-[#003DA5]" />
        <h3 className="text-[13.5px] font-extrabold text-slate-800 m-0">Radicar la {nombre} del contrato</h3>
      </div>
      <p className="text-[12px] text-slate-600 m-0">
        {s.clase === 'CIERRE'
          ? 'Es un contrato de prestación de servicios profesionales y de apoyo a la gestión con persona natural: no se liquida. El área radica el memorando, el asignador líder lo reparte y el abogado lo cierra en SECOP II.'
          : 'El área radica la documentación; el abogado y la líder la revisan, la líder y la jefe dan visto bueno al acta, el área la sube firmada y el abogado la carga en SECOP II.'}{' '}
        Al radicar se abre la etapa 10.
      </p>

      {!s.puedeRadicar && s.motivoNoPuede && (
        <Aviso tono="aviso" titulo="Todavía no se puede radicar">
          {s.faltan.length ? (
            <>
              Antes hay que terminar:
              <ul className="m-0 mt-1 pl-4 list-disc">
                {s.faltan.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <span className="block mt-1">La 9.2 y la 9.3 siguen abiertas hasta el final: no hace falta cerrarlas.</span>
            </>
          ) : (
            s.motivoNoPuede
          )}
        </Aviso>
      )}

      {s.puedeRadicar && (
        <div className="space-y-2.5">
          {s.requisitos.map((r) => (
            <div key={r.id}>
              <SelectorArchivo
                etiqueta={r.nombre}
                archivo={documentos[r.id] ?? null}
                onElegir={(f) =>
                  setDocumentos((d) => {
                    const copia = { ...d };
                    if (f) copia[r.id] = f;
                    else delete copia[r.id];
                    return copia;
                  })
                }
                obligatorio={r.obligatorio}
                id={`liq-req-${r.id}`}
              />
              {r.descripcion && <p className="text-[11px] text-slate-500 m-0 mt-0.5">{r.descripcion}</p>}
            </div>
          ))}
          <div>
            <label htmlFor="liq-observaciones" className="block text-xs font-bold text-gray-600 mb-1.5">Observaciones</label>
            <textarea id="liq-observaciones" rows={3} className={campo} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </div>
          <Boton icono={<Send className="w-3.5 h-3.5" />} disabled={ocupado || faltanDocs.length > 0} onClick={radicar}>
            Radicar la {nombre}
          </Boton>
        </div>
      )}

      {s.anteriores.length > 0 && (
        <div className="pt-2 border-t border-gray-100">
          <p className="text-[11px] font-bold text-slate-500 m-0">Trámites desistidos</p>
          {s.anteriores.map((t) => (
            <p key={t.id} className="text-[11.5px] text-slate-600 m-0">
              {t.radicado} · {momento(t.radicadaAt)}{t.motivoCierre ? ` · ${t.motivoCierre}` : ''}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
