import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Info, Lock, Save } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { CampoFormularioPaa, CamposDelFormularioPaa, DocumentoPaa } from '../../types';
import { useAlcance } from '../../auth/alcance';

const ORIGEN: Record<CamposDelFormularioPaa['origen'], string> = {
  guardada: '',
  vigencia_anterior:
    'Esta vigencia todavía no tiene su configuración: se propone la del año anterior. Al guardar queda como propia de este año, sin tocar la anterior.',
  formato:
    'Todavía no hay configuración: se propone una a partir del formato, con los datos de contacto y las columnas repetidas ocultos. Guárdala para fijarla.',
};

const USO: Record<CampoFormularioPaa['uso'], { etiqueta: string; clase: string }> = {
  identificador: { etiqueta: 'Identifica la línea', clase: 'bg-blue-100 text-blue-800' },
  proceso: { etiqueta: 'Alimenta el proceso', clase: 'bg-emerald-100 text-emerald-800' },
  informativo: { etiqueta: 'Informativo', clase: 'bg-gray-100 text-gray-600' },
};

/**
 * Qué columnas del PAA ve quien crea un proceso, por región y vigencia.
 *
 * Es configuración de presentación: ocultar un campo no lo borra de la línea
 * ni cambia lo que el PAA le da al proceso —el objeto, el valor o la modalidad
 * llegan aunque estén ocultos—. Por eso cada campo dice para qué lo usa el
 * sistema, para que nadie crea que ocultando el valor deja de aplicarse.
 */
export function CamposDelFormulario() {
  const { puede } = useAlcance();
  const editable = puede('editar', 'PAA');
  const [documentos, setDocumentos] = useState<DocumentoPaa[]>([]);
  const [region, setRegion] = useState('');
  const [anio, setAnio] = useState<number | null>(null);
  const [datos, setDatos] = useState<CamposDelFormularioPaa | null>(null);
  const [campos, setCampos] = useState<CampoFormularioPaa[]>([]);
  const [cambiado, setCambiado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const regiones = documentos.flatMap((d) => d.regiones);
  // Los años son los del documento de la región: cada territorio abre los suyos.
  const vigencias = documentos.find((d) => d.regiones.some((r) => r.id === region))?.vigencias ?? [];
  const anioPorDefecto = (doc?: DocumentoPaa) => (doc?.vigencias.find((x) => x.vigente) ?? doc?.vigencias[0])?.anio ?? null;

  useEffect(() => {
    contratacionService.paa
      .documentos()
      .then((d) => {
        setDocumentos(d);
        const primera = d.flatMap((x) => x.regiones)[0];
        setRegion((actual) => actual || primera?.id || '');
        setAnio((actual) => actual ?? anioPorDefecto(d.find((x) => x.id === primera?.documentoId)));
      })
      .catch((err: any) => setError(err.message));
  }, []);

  const elegirRegion = (id: string) => {
    setRegion(id);
    const doc = documentos.find((d) => d.regiones.some((r) => r.id === id));
    setAnio((actual) => (doc?.vigencias.some((v) => v.anio === actual) ? actual : anioPorDefecto(doc)));
  };

  useEffect(() => {
    if (!region || !anio) return;
    setDatos(null);
    contratacionService.paa
      .campos(region, anio)
      .then((d) => {
        setDatos(d);
        setCampos(d.campos);
        setCambiado(false);
      })
      .catch((err: any) => setError(err.message));
  }, [region, anio]);

  const cambiar = (clave: string, cambio: Partial<CampoFormularioPaa>) => {
    setCampos((lista) => lista.map((c) => (c.clave === clave ? { ...c, ...cambio } : c)));
    setCambiado(true);
  };

  const mover = (indice: number, hacia: -1 | 1) => {
    setCampos((lista) => {
      const destino = indice + hacia;
      if (destino < 0 || destino >= lista.length) return lista;
      const nueva = [...lista];
      [nueva[indice], nueva[destino]] = [nueva[destino], nueva[indice]];
      return nueva;
    });
    setCambiado(true);
  };

  const guardar = async () => {
    if (!region || !anio) return;
    setGuardando(true);
    try {
      const d = await contratacionService.paa.guardarCampos(
        region,
        anio,
        campos.map((c) => ({
          clave: c.clave,
          visible: c.visible,
          etiqueta: c.etiqueta.trim() && c.etiqueta.trim() !== c.etiquetaFormato ? c.etiqueta.trim() : null,
        })),
      );
      setDatos(d);
      setCampos(d.campos);
      setCambiado(false);
      toast.success('Formulario guardado', { description: `${d.region.nombre} · PAA ${d.vigencia.anio}` });
    } catch (err: any) {
      toast.error('No se guardó el formulario', { description: err.message });
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

  const nuevas = campos.filter((c) => c.estado === 'nueva').length;
  const huerfanas = campos.filter((c) => c.estado === 'huerfana').length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="campos-region" className="block text-xs font-bold text-gray-600 mb-1">
            Región
          </label>
          <select
            id="campos-region"
            value={region}
            onChange={(e) => elegirRegion(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white"
          >
            {regiones.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="campos-vigencia" className="block text-xs font-bold text-gray-600 mb-1">
            Vigencia
          </label>
          <select
            id="campos-vigencia"
            value={anio ?? ''}
            onChange={(e) => setAnio(Number(e.target.value))}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white"
          >
            {vigencias.map((v) => (
              <option key={v.id} value={v.anio}>
                {v.anio}
                {v.vigente ? ' (vigente)' : ''}
              </option>
            ))}
          </select>
        </div>
        {editable && (
          <button
            type="button"
            onClick={guardar}
            disabled={guardando || !datos || (!cambiado && datos.origen === 'guardada')}
            className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold rounded-lg text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
            {guardando ? 'Guardando…' : 'Guardar formulario'}
          </button>
        )}
      </div>

      {datos && datos.origen !== 'guardada' && (
        <p className="m-0 flex items-start gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
          {ORIGEN[datos.origen]}
        </p>
      )}
      {(nuevas > 0 || huerfanas > 0) && (
        <p className="m-0 flex items-start gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
          {nuevas > 0 && `${nuevas} columna(s) nueva(s) en el PAA: decide si se muestran. `}
          {huerfanas > 0 && `${huerfanas} campo(s) ya no vienen en el archivo: se conservan por si vuelven, pero no se muestran.`}
        </p>
      )}

      {!datos ? (
        <p className="m-0 text-xs text-gray-400">Cargando los campos…</p>
      ) : (
        <ol className="cambios-paa m-0 rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
          {campos.map((c, i) => (
            <li key={c.clave} className={`flex flex-wrap items-center gap-3 px-3 py-2 ${c.estado === 'huerfana' ? 'opacity-50' : ''}`}>
              <input
                type="checkbox"
                aria-label={`Mostrar ${c.etiqueta}`}
                checked={c.visible}
                disabled={!editable || c.siempreVisible || c.estado === 'huerfana'}
                onChange={(e) => cambiar(c.clave, { visible: e.target.checked })}
                className="w-4 h-4"
              />
              <div className="min-w-0 flex-1">
                {editable ? (
                  <input
                    aria-label={`Nombre de ${c.etiquetaFormato}`}
                    value={c.etiqueta}
                    onChange={(e) => cambiar(c.clave, { etiqueta: e.target.value })}
                    className="w-full px-2 py-1 text-sm rounded-md border border-transparent hover:border-gray-300 focus:outline-none focus:border-[#003DA5]"
                  />
                ) : (
                  <p className="m-0 text-sm text-slate-800">{c.etiqueta}</p>
                )}
                {c.etiqueta !== c.etiquetaFormato && (
                  <p className="m-0 text-xs text-gray-400">Columna del PAA: {c.etiquetaFormato}</p>
                )}
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap ${USO[c.uso].clase}`}>
                {USO[c.uso].etiqueta}
              </span>
              {c.siempreVisible && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500" title="Sin él no se sabe qué línea se eligió">
                  <Lock className="w-3 h-3" aria-hidden="true" />
                  Siempre visible
                </span>
              )}
              {c.estado === 'nueva' && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">Nueva</span>}
              {c.estado === 'huerfana' && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">Ya no viene</span>}
              {editable && (
                <span className="inline-flex gap-1">
                  <button type="button" aria-label={`Subir ${c.etiqueta}`} onClick={() => mover(i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30">
                    <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <button type="button" aria-label={`Bajar ${c.etiqueta}`} onClick={() => mover(i, 1)} disabled={i === campos.length - 1} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30">
                    <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
