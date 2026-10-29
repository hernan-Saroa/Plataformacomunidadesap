import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, Lock, MapPin, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  BusquedaLineasPaa,
  DetalleLineaPaa,
  OpcionesDeCreacionPaa,
  ProcesoResumen,
} from '../../types';
import { Modal } from '../shared/Modal';
import { pesos, valorPaa } from './formato';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreado: (proceso: ProcesoResumen) => void;
}

/** Lo que tarda en buscar después de la última tecla. */
const ESPERA_BUSQUEDA_MS = 300;

/**
 * Crear un proceso desde una línea del Plan Anual de Adquisiciones.
 *
 * Reemplaza al formulario en el que se tecleaban objeto, valor y modalidad.
 * Se elige la región, se busca la línea en el PAA vigente de esa región y se
 * ve lo que trae —en los campos que la región decidió mostrar— antes de
 * confirmar. Lo que la línea no diga, o diga mal, se completa en la 3.1.
 *
 * La vigencia no se elige: es la vigente del PAA de la región —cada territorio
 * carga el suyo y cambia de año por su cuenta—, la única de la que pueden
 * nacer procesos. Se muestra para que quede claro de qué PAA salen los datos.
 */
export function CrearProcesoDesdePaa({ isOpen, onClose, onCreado }: Props) {
  const [opciones, setOpciones] = useState<OpcionesDeCreacionPaa | null>(null);
  const [errorOpciones, setErrorOpciones] = useState<string | null>(null);
  const [region, setRegion] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<BusquedaLineasPaa | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [elegida, setElegida] = useState<DetalleLineaPaa | null>(null);
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setErrorOpciones(null);
    contratacionService.paa
      .opcionesDeCreacion()
      .then((o) => {
        setOpciones(o);
        // Con una sola región lista no hay nada que elegir.
        const listas = o.regiones.filter((r) => r.vigente);
        if (listas.length === 1) setRegion(listas[0].id);
      })
      .catch((err: any) => setErrorOpciones(err.message));
  }, [isOpen]);

  const elegidaRegion = opciones?.regiones.find((r) => r.id === region) ?? null;
  const vigente = elegidaRegion?.vigente ?? null;

  useEffect(() => {
    if (!region || !vigente) return;
    setBuscando(true);
    const temporizador = setTimeout(() => {
      contratacionService.paa
        .buscarLineas(region, busqueda)
        .then(setResultados)
        .catch((err: any) => toast.error('No se pudo buscar en el PAA', { description: err.message }))
        .finally(() => setBuscando(false));
    }, ESPERA_BUSQUEDA_MS);
    return () => clearTimeout(temporizador);
  }, [region, busqueda, vigente?.versionId]);

  const verMas = async () => {
    if (!resultados) return;
    setBuscando(true);
    try {
      const siguiente = await contratacionService.paa.buscarLineas(region, busqueda, resultados.pagina + 1);
      setResultados({ ...siguiente, lineas: [...resultados.lineas, ...siguiente.lineas] });
    } catch (err: any) {
      toast.error('No se pudo buscar en el PAA', { description: err.message });
    } finally {
      setBuscando(false);
    }
  };

  const elegir = async (id: string) => {
    try {
      setElegida(await contratacionService.paa.linea(id));
    } catch (err: any) {
      toast.error('No se pudo leer la línea', { description: err.message });
    }
  };

  const cerrar = () => {
    setElegida(null);
    setBusqueda('');
    setResultados(null);
    onClose();
  };

  const crear = async () => {
    if (!elegida) return;
    setCreando(true);
    try {
      const proceso = await contratacionService.crearProceso(elegida.id);
      cerrar();
      onCreado(proceso);
    } catch (err: any) {
      // Se queda en la línea elegida: el motivo suele ser que alguien la tomó
      // o que la cuantía no admite la modalidad, y hay que poder leerlo.
      toast.error('No se pudo crear el proceso', { description: err.message });
    } finally {
      setCreando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={cerrar}
      title="Nuevo proceso contractual"
      description={
        vigente
          ? `Desde una línea del PAA ${vigente.anio} de ${elegidaRegion?.documento} · versión ${vigente.versionNumero}`
          : 'Desde una línea del Plan Anual de Adquisiciones'
      }
      icon={<Plus className="w-5 h-5 text-white" />}
      size="large"
      footer={
        elegida ? (
          <>
            <button
              type="button"
              onClick={crear}
              disabled={creando || !!elegida.enUso}
              className="px-3.5 py-2 text-xs font-extrabold rounded-lg text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm active:scale-95 disabled:opacity-50 transition-all"
            >
              {creando ? 'Creando…' : 'Crear y abrir estudio previo'}
            </button>
            <button
              type="button"
              onClick={() => setElegida(null)}
              className="px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-700 hover:border-[#003DA5] hover:text-[#003DA5]"
            >
              Elegir otra línea
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={cerrar}
            className="px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-700 hover:border-[#003DA5] hover:text-[#003DA5]"
          >
            Cancelar
          </button>
        )
      }
    >
      {errorOpciones ? (
        <Alerta>{errorOpciones}</Alerta>
      ) : !opciones ? (
        <p className="text-xs text-gray-400 m-0">Consultando el Plan Anual de Adquisiciones…</p>
      ) : !opciones.listo ? (
        <Alerta>{opciones.motivo}</Alerta>
      ) : elegida ? (
        <LineaElegida linea={elegida} onVolver={() => setElegida(null)} />
      ) : (
        <div className="space-y-3">
          <div>
            <p className="block text-xs font-bold text-gray-600 mb-1.5 m-0">Región</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Región">
              {opciones.regiones.map((r) => {
                const activa = region === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    role="radio"
                    aria-checked={activa}
                    disabled={!r.vigente}
                    title={r.motivo ?? undefined}
                    onClick={() => {
                      setRegion(r.id);
                      setResultados(null);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                      activa
                        ? 'bg-[#003DA5] border-[#003DA5] text-white'
                        : 'bg-white border-gray-300 text-slate-700 hover:border-[#003DA5]'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                    {r.nombre}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-1.5 mb-0">
              Cada región tiene su bloque en el PAA de su territorio: solo se ven las líneas de la que elijas.
            </p>
            {opciones.regiones
              .filter((r) => !r.vigente)
              .map((r) => (
                <p key={r.id} className="text-xs text-amber-800 mt-1 mb-0">
                  {r.motivo}
                </p>
              ))}
          </div>

          {region && (
            <div>
              <label htmlFor="buscar-linea" className="block text-xs font-bold text-gray-600 mb-1.5">
                Línea del PAA
              </label>
              <div className="relative">
                <Search
                  className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="buscar-linea"
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Código (LINEA 12), código interno u objeto"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20"
                />
              </div>

              <div className="mt-2 rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {resultados?.lineas.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => elegir(l.id)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 flex items-start gap-3"
                  >
                    <span className="font-mono text-xs font-bold text-[#003DA5] whitespace-nowrap pt-0.5">{l.codigo}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-slate-700 line-clamp-2">{l.objeto ?? 'Sin objeto'}</span>
                      <span className="block text-xs text-gray-500 mt-0.5">
                        {pesos(l.valorTotal)} · {l.modalidad ?? 'Sin modalidad'}
                      </span>
                    </span>
                    {l.enUso && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600 whitespace-nowrap">
                        <Lock className="w-3 h-3" aria-hidden="true" />
                        {l.enUso.radicado}
                      </span>
                    )}
                  </button>
                ))}
                {resultados && resultados.lineas.length === 0 && !buscando && (
                  <p className="px-3 py-4 text-xs text-gray-500 m-0">
                    Ninguna línea de esta región coincide con «{busqueda}».
                  </p>
                )}
                {buscando && <p className="px-3 py-2 text-xs text-gray-400 m-0">Buscando…</p>}
              </div>
              {resultados && resultados.lineas.length < resultados.total && !buscando && (
                <button
                  type="button"
                  onClick={verMas}
                  className="mt-2 text-xs font-bold text-[#003DA5] hover:underline"
                >
                  Ver más ({resultados.total - resultados.lineas.length} restantes)
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/** Lo que trae la línea elegida, en los campos que su región muestra. Solo lectura. */
function LineaElegida({ linea, onVolver }: { linea: DetalleLineaPaa; onVolver: () => void }) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onVolver}
        className="inline-flex items-center gap-1 text-xs font-bold text-[#003DA5] hover:underline"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
        Volver a la búsqueda
      </button>

      <div className="rounded-lg border border-gray-200 bg-slate-50 px-3 py-2.5">
        <p className="m-0 text-sm font-extrabold text-slate-800">
          <span className="font-mono text-[#003DA5]">{linea.codigo}</span> · {linea.region.nombre}
        </p>
        <p className="m-0 mt-0.5 text-xs text-gray-500">
          PAA {linea.vigencia.anio} · versión {linea.version.numero}
        </p>
      </div>

      {linea.enUso && (
        <Alerta>
          Esta línea ya originó el proceso {linea.enUso.radicado}. Una línea admite un solo proceso mientras ese
          siga en curso o adjudicado.
        </Alerta>
      )}

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 m-0">
        {linea.campos.map((c) => (
          <div key={c.clave} className={c.clave === 'objeto' ? 'sm:col-span-2' : undefined}>
            <dt className="text-xs font-bold text-gray-500">{c.etiqueta}</dt>
            <dd className="m-0 text-sm text-slate-800 break-words">{valorPaa(c.clave, c.valor)}</dd>
          </div>
        ))}
      </dl>

      {!linea.enUso && (
        <p className="flex items-start gap-1.5 text-xs text-gray-500 m-0">
          <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
          El proceso nace con el objeto, la modalidad y el valor de esta línea, y la 3.1 con lo que el PAA ya
          dice. Lo que haya que ajustar se ajusta en el estudio previo.
        </p>
      )}
    </div>
  );
}

function Alerta({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
      <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" aria-hidden="true" />
      <p className="text-xs text-amber-900 m-0 leading-relaxed">{children}</p>
    </div>
  );
}
