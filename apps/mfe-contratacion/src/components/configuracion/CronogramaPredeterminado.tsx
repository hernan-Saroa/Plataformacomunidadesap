import React, { useEffect, useState } from 'react';
import { AlertTriangle, CalendarRange, Check, Plus, Trash2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  CanalCronograma,
  CronogramaPredeterminado as Predeterminado,
  DestinoCronograma,
  FilaPredeterminada,
  ResumenPredeterminado,
} from '../../types';
import { Boton, campo } from '../shared/PiezasPanel';

const DESTINOS: { valor: DestinoCronograma; nombre: string }[] = [
  { valor: 'QUIEN_LA_HACE', nombre: 'Quien la hace' },
  { valor: 'ABOGADO_ESTRUCTURADOR', nombre: 'Abogado estructurador' },
  { valor: 'ABOGADO_REVISOR', nombre: 'Abogado revisor' },
  { valor: 'GESTOR_DE_ARCHIVO', nombre: 'Gestor de archivo' },
];

const CANALES: { valor: CanalCronograma; nombre: string }[] = [
  { valor: 'CAMPANA', nombre: 'Campanita' },
  { valor: 'CORREO', nombre: 'Correo' },
  { valor: 'AMBOS', nombre: 'Campanita y correo' },
];

const NOMBRE_ETAPA: Record<number, string> = {
  5: 'Elaboración y publicación del proceso',
  6: 'Recepción y evaluación de ofertas',
  7: 'Adjudicación',
  8: 'Perfeccionamiento y legalización',
  9: 'Ejecución y supervisión',
  10: 'Seguimiento, control y liquidación',
};

/** Una fila mientras se edita: los números van como texto hasta guardar. */
interface Fila {
  incluida: boolean;
  numeral: string | null;
  nombre: string;
  etapa: number;
  diaInicio: string;
  diaFin: string;
  tipoDias: 'HABILES' | 'CALENDARIO';
  diasAntes: string;
  avisarA: DestinoCronograma[];
  canal: CanalCronograma;
  correos: string;
  nota: string | null;
}

const listaDeCorreos = (texto: string) =>
  texto
    .split(/[,;\s]+/)
    .map((c) => c.trim())
    .filter(Boolean);

const entero = (t: string) => (/^\d+$/.test(t.trim()) ? Number(t) : NaN);

const deConfiguracion = (
  base: { numeral: string | null; nombre: string; etapa: number },
  c: FilaPredeterminada | null,
): Fila => ({
  incluida: !!c,
  numeral: base.numeral,
  nombre: base.nombre,
  etapa: base.etapa,
  diaInicio: c?.diaInicio === null || c?.diaInicio === undefined ? '' : String(c.diaInicio),
  diaFin: c ? String(c.diaFin) : '',
  tipoDias: c?.tipoDias ?? 'HABILES',
  diasAntes: c?.diasAntes === null || c?.diasAntes === undefined ? '' : String(c.diasAntes),
  avisarA: c?.avisarA?.length ? c.avisarA : ['QUIEN_LA_HACE'],
  canal: c?.canal ?? 'CAMPANA',
  correos: (c?.correos ?? []).join(', '),
  nota: c?.nota ?? null,
});

/**
 * Cronograma predeterminado por modalidad — Configuración (140, EFDS-1152).
 *
 * Para cada actividad de las etapas 5 a 10, en qué día empieza y en qué día
 * termina contado desde el día cero, en días hábiles o calendario, y el aviso
 * por defecto. En la 5.2 se elige el día cero y el cronograma se carga como
 * propuesta: aquí no se toca el de ningún proceso.
 */
export function CronogramaPredeterminado() {
  const [resumen, setResumen] = useState<ResumenPredeterminado[]>([]);
  const [modalidad, setModalidad] = useState('');
  const [datos, setDatos] = useState<Predeterminado | null>(null);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cambiado, setCambiado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    contratacionService
      .resumenCronogramaPredeterminado()
      .then((r) => {
        setResumen(r);
        setModalidad((m) => m || r[0]?.modalidad || '');
      })
      .catch((err: any) => setError(err.message));
  }, []);

  const cargar = (d: Predeterminado) => {
    setDatos(d);
    setFilas([
      ...d.actividades.map((a) => deConfiguracion(a, a.configuracion)),
      ...d.propias.map((p) => deConfiguracion({ numeral: null, nombre: p.nombre ?? '', etapa: p.etapa ?? 5 }, p)),
    ]);
    setCambiado(false);
  };

  useEffect(() => {
    if (!modalidad) return;
    setDatos(null);
    contratacionService
      .cronogramaPredeterminado(modalidad)
      .then(cargar)
      .catch((err: any) => setError(err.message));
  }, [modalidad]);

  const cambiar = (i: number, cambio: Partial<Fila>) => {
    setFilas((fs) => fs.map((f, j) => (j === i ? { ...f, ...cambio } : f)));
    setCambiado(true);
  };

  const agregarPropia = (etapa: number) => {
    setFilas((fs) => [
      ...fs,
      { ...deConfiguracion({ numeral: null, nombre: '', etapa }, null), incluida: true },
    ]);
    setCambiado(true);
  };

  const quitar = (i: number) => {
    setFilas((fs) => fs.filter((_, j) => j !== i));
    setCambiado(true);
  };

  const incluidas = filas.filter((f) => f.incluida);
  const problema = incluidas
    .map((f) => {
      const n = f.numeral ?? `«${f.nombre.trim() || 'actividad propia'}»`;
      if (!f.numeral && !f.nombre.trim()) return 'Ponle nombre a la actividad propia';
      const fin = entero(f.diaFin);
      if (!(fin >= 0 && fin <= 730)) return `${n}: el día de fin es un número de 0 a 730`;
      if (f.diaInicio.trim()) {
        const ini = entero(f.diaInicio);
        if (!(ini >= 0 && ini <= 730)) return `${n}: el día de inicio es un número de 0 a 730`;
        if (ini > fin) return `${n}: empieza después de terminar`;
      }
      if (f.diasAntes.trim() && !(entero(f.diasAntes) >= 0 && entero(f.diasAntes) <= 90)) {
        return `${n}: los días de aviso van de 0 a 90`;
      }
      const malo = listaDeCorreos(f.correos).find((c) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c));
      if (malo) return `${n}: el correo ${malo} no es válido`;
      if (!f.avisarA.length && !listaDeCorreos(f.correos).length) return `${n}: di a quién se le avisa`;
      return null;
    })
    .find(Boolean);

  const guardar = async () => {
    if (problema || !modalidad) return;
    setGuardando(true);
    try {
      const d = await contratacionService.guardarCronogramaPredeterminado(
        modalidad,
        incluidas.map((f) => ({
          numeral: f.numeral,
          nombre: f.numeral ? null : f.nombre.trim(),
          etapa: f.numeral ? null : f.etapa,
          diaInicio: f.diaInicio.trim() ? Number(f.diaInicio) : null,
          diaFin: Number(f.diaFin),
          tipoDias: f.tipoDias,
          diasAntes: f.diasAntes.trim() ? Number(f.diasAntes) : null,
          avisarA: f.avisarA,
          canal: f.canal,
          correos: listaDeCorreos(f.correos),
          nota: f.nota,
        })),
      );
      cargar(d);
      setResumen((r) => r.map((x) => (x.modalidad === modalidad ? { ...x, actividades: incluidas.length } : x)));
      toast.success(`Cronograma predeterminado de ${d.nombre} guardado`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (error) {
    return (
      <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-red-800 m-0">{error}</p>
      </div>
    );
  }

  const etapas = [...new Set(filas.map((f) => f.etapa))].sort((a, b) => a - b);

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-4 space-y-4">
      <div className="flex items-start gap-2.5">
        <CalendarRange className="w-5 h-5 mt-0.5 text-[#003DA5] flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 m-0">Cronograma predeterminado por modalidad</p>
          <p className="text-xs text-slate-600 m-0 mt-0.5 leading-relaxed">
            Con qué cronograma arranca un proceso de cada modalidad. Para cada actividad se dice en qué
            día empieza y en qué día debe estar cumplida, contados desde el <b>día cero</b>, y cómo se
            avisa. El día cero se elige en la 5.2 al cargarlo, y las fechas quedan como propuesta que
            el abogado revisa antes de guardar. Los días hábiles saltan fines de semana y festivos, y
            no cuentan el día cero. Lo que no se incluye no se programa.
          </p>
        </div>
      </div>

      <label className="block">
        <span className="block text-xs font-bold text-gray-600 mb-1.5">Modalidad</span>
        <select
          aria-label="Modalidad del cronograma predeterminado"
          value={modalidad}
          onChange={(e) => {
            if (cambiado) toast.message('Los cambios sin guardar de la otra modalidad se descartaron');
            setModalidad(e.target.value);
          }}
          className={campo}
          style={{ maxWidth: 420 }}
        >
          {resumen.map((r) => (
            <option key={r.modalidad} value={r.modalidad}>
              {r.nombre} · {r.actividades === 0 ? 'sin configurar' : `${r.actividades} ${r.actividades === 1 ? 'actividad' : 'actividades'}`}
            </option>
          ))}
        </select>
      </label>

      {!datos ? (
        <p className="text-xs text-slate-400 m-0">Cargando…</p>
      ) : (
        <>
          {etapas.map((etapa) => (
            <div key={etapa} className="space-y-1.5">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500 m-0">
                Etapa {etapa} · {NOMBRE_ETAPA[etapa]}
              </p>
              {filas.map((f, i) => {
                if (f.etapa !== etapa) return null;
                const etiqueta = f.numeral ?? (f.nombre.trim() || 'actividad propia');
                return (
                  <div
                    key={f.numeral ?? `propia-${i}`}
                    className={`rounded-lg border px-3 py-2 space-y-1.5 ${
                      f.incluida ? 'border-[#003DA5]/20 bg-white' : 'border-gray-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {f.numeral ? (
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 flex-1">
                          <input
                            type="checkbox"
                            aria-label={`Incluir la ${f.numeral}`}
                            checked={f.incluida}
                            onChange={(e) => cambiar(i, { incluida: e.target.checked })}
                          />
                          {f.numeral} · {f.nombre}
                        </label>
                      ) : (
                        <>
                          <input
                            type="text"
                            aria-label="Nombre de la actividad propia"
                            placeholder="Nombre de la actividad (visita técnica, mesa de trabajo…)"
                            value={f.nombre}
                            maxLength={200}
                            onChange={(e) => cambiar(i, { nombre: e.target.value })}
                            className={`${campo} flex-1`}
                          />
                          <button
                            type="button"
                            onClick={() => quitar(i)}
                            aria-label={`Quitar la actividad ${etiqueta}`}
                            className="text-xs font-bold text-red-700 hover:underline inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Quitar
                          </button>
                        </>
                      )}
                    </div>

                    {f.incluida ? (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="text-xs text-slate-500 flex items-center gap-1.5">
                            Empieza el día
                            <input
                              type="number"
                              min={0}
                              max={730}
                              aria-label={`Día de inicio de ${etiqueta}`}
                              placeholder="—"
                              value={f.diaInicio}
                              onChange={(e) => cambiar(i, { diaInicio: e.target.value })}
                              className={campo}
                              style={{ width: 80 }}
                            />
                          </label>
                          <label className="text-xs text-slate-500 flex items-center gap-1.5">
                            termina el día
                            <input
                              type="number"
                              min={0}
                              max={730}
                              aria-label={`Día de fin de ${etiqueta}`}
                              value={f.diaFin}
                              onChange={(e) => cambiar(i, { diaFin: e.target.value })}
                              className={campo}
                              style={{ width: 80 }}
                            />
                          </label>
                          <select
                            aria-label={`Tipo de días de ${etiqueta}`}
                            value={f.tipoDias}
                            onChange={(e) => cambiar(i, { tipoDias: e.target.value as Fila['tipoDias'] })}
                            className={campo}
                            style={{ width: 130 }}
                          >
                            <option value="HABILES">hábiles</option>
                            <option value="CALENDARIO">calendario</option>
                          </select>
                          <label className="text-xs text-slate-500 flex items-center gap-1.5">
                            · avisar
                            <input
                              type="number"
                              min={0}
                              max={90}
                              aria-label={`Días de aviso de ${etiqueta}`}
                              placeholder="general"
                              value={f.diasAntes}
                              onChange={(e) => cambiar(i, { diasAntes: e.target.value })}
                              className={campo}
                              style={{ width: 80 }}
                            />
                            días antes por
                          </label>
                          <select
                            aria-label={`Canal del aviso de ${etiqueta}`}
                            value={f.canal}
                            onChange={(e) => cambiar(i, { canal: e.target.value as CanalCronograma })}
                            className={campo}
                            style={{ width: 170 }}
                          >
                            {CANALES.map((c) => (
                              <option key={c.valor} value={c.valor}>
                                {c.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          <span className="text-xs text-slate-500">A quién:</span>
                          {DESTINOS.map((d) => (
                            <label key={d.valor} className="text-xs text-slate-700 flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={f.avisarA.includes(d.valor)}
                                onChange={(e) =>
                                  cambiar(i, {
                                    avisarA: e.target.checked
                                      ? [...f.avisarA, d.valor]
                                      : f.avisarA.filter((x) => x !== d.valor),
                                  })
                                }
                              />
                              {!f.numeral && d.valor === 'QUIEN_LA_HACE' ? 'Quien lleva el cronograma (5.2)' : d.nombre}
                            </label>
                          ))}
                          <input
                            type="text"
                            aria-label={`Otros correos de ${etiqueta}`}
                            placeholder="Otros correos, separados por coma"
                            value={f.correos}
                            onChange={(e) => cambiar(i, { correos: e.target.value })}
                            className={campo}
                            style={{ width: 260 }}
                          />
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => agregarPropia(etapa)}
                className="text-xs font-bold text-[#003DA5] hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar una actividad propia a la etapa {etapa}
              </button>
            </div>
          ))}

          {problema ? <p className="text-xs text-red-700 m-0">{problema}</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            <Boton icono={<Check className="w-3.5 h-3.5" />} disabled={guardando || !!problema || !cambiado} onClick={guardar}>
              {guardando ? 'Guardando…' : `Guardar el cronograma de ${datos.nombre}`}
            </Boton>
            {cambiado ? (
              <button
                type="button"
                onClick={() => cargar(datos)}
                className="text-xs font-bold text-slate-500 hover:underline inline-flex items-center gap-1"
              >
                <Undo2 className="w-3.5 h-3.5" /> Descartar los cambios
              </button>
            ) : datos.actualizadoPor ? (
              <span className="text-xs text-slate-500">Lo configuró por última vez {datos.actualizadoPor}.</span>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
