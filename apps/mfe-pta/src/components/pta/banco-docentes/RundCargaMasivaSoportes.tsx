import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FolderUp } from 'lucide-react';
import type { RundSupportGroup } from './RundSupportList';
import { esSoporteDeTitulo, nomenclaturaSoporte } from '../../../utils/rundSoportesTabla';
import {
  CARPETAS_SIN_NOMENCLATURA_OBLIGATORIA, descripcionCargaMasiva, planificarCarga, resumenPlan, type GrupoCarga,
} from '../../../utils/rundCargaMasivaSoportes';
import { RUND_MAX_ARCHIVO_MB } from '../../../utils/rundEvidenceRules';
import './RundSoportesCodificacion.css';
import './RundCargaMasivaSoportes.css';

/** Tope por lote: la carga es secuencial y cada archivo es una petición. */
export const CARGA_MASIVA_MAX_ARCHIVOS = 300;

type Props = {
  bloque: string;
  /** Nombre de la carpeta, tal como se muestra en «Documentos de …». */
  etiquetaCarpeta: string;
  grupos: RundSupportGroup[];
  disabled?: boolean;
  /** Sube un archivo. Devuelve null si quedó cargado o el mensaje de error. */
  onSubir: (file: File, grupo: RundSupportGroup, opciones: { titulo?: string; descripcion: string }) => Promise<string | null>;
  /** Se llama una vez al terminar el lote para refrescar la vista. */
  onTerminado: () => Promise<void> | void;
};

type Resultado = 'pendiente' | 'cargando' | 'cargado' | { error: string };

const nombreDe = (evidencia: any): string => String(evidencia?.nombre_archivo || evidencia?.nombreArchivo || '');

export function RundCargaMasivaSoportes({ bloque, etiquetaCarpeta, grupos, disabled, onSubir, onTerminado }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [terminado, setTerminado] = useState(false);
  const [resultados, setResultados] = useState<Record<string, Resultado>>({});
  const boton = useRef<HTMLButtonElement>(null);
  const cerrarRef = useRef<() => void>(() => undefined);

  const gruposCarga: GrupoCarga[] = useMemo(() => grupos.map(grupo => ({
    tipoSoporte: grupo.field.tipoSoporte,
    nombresArchivo: grupo.evidences.map(nombreDe).filter(Boolean),
    titulos: grupo.titulos,
    puedeCargar: grupo.canManage && (esSoporteDeTitulo(grupo.field.tipoSoporte) || grupo.canUpload),
  })), [grupos]);

  const planActual = useMemo(() => planificarCarga(bloque, archivos, gruposCarga), [bloque, archivos, gruposCarga]);
  // Al iniciar la carga el plan se congela: al refrescar la vista los archivos ya cargados pasarían a «ya existe».
  const [congelado, setCongelado] = useState<typeof planActual | null>(null);
  const plan = congelado ?? planActual;
  const resumen = resumenPlan(plan);
  const nomenclaturaObligatoria = !CARPETAS_SIN_NOMENCLATURA_OBLIGATORIA.includes(bloque);
  const patrones = useMemo(() => [...new Set(grupos.map(grupo => nomenclaturaSoporte(grupo.field.tipoSoporte, 1)).filter(item => item !== '—'))], [grupos]);

  const cerrar = () => {
    if (cargando) return;
    setAbierto(false); setArchivos([]); setError(''); setTerminado(false); setResultados({}); setCongelado(null);
    boton.current?.focus();
  };
  cerrarRef.current = cerrar;
  useEffect(() => {
    if (!abierto) return undefined;
    const alPulsar = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); cerrarRef.current(); } };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [abierto]);

  const elegir = (lista: FileList | null) => {
    setTerminado(false); setResultados({}); setCongelado(null);
    const elegidos = Array.from(lista ?? []);
    if (elegidos.length > CARGA_MASIVA_MAX_ARCHIVOS) {
      setArchivos([]);
      setError(`Seleccione máximo ${CARGA_MASIVA_MAX_ARCHIVOS} archivos por carga.`);
      return;
    }
    setError('');
    setArchivos(elegidos);
  };

  const cargar = async () => {
    const validos = plan.filter(item => item.estado === 'valido');
    if (!validos.length || cargando) return;
    setCargando(true); setTerminado(false); setCongelado(plan);
    setResultados(Object.fromEntries(validos.map(item => [item.nombre, 'pendiente' as Resultado])));
    const fallidos = new Set<string>();
    try {
      for (const item of validos) {
        const tipo = item.tipoSoporte;
        const grupo = grupos.find(candidato => candidato.field.tipoSoporte === tipo);
        if (!tipo || !grupo) { setResultados(actual => ({ ...actual, [item.nombre]: { error: 'El soporte ya no está disponible.' } })); continue; }
        // Si falla el título n, los siguientes del mismo nivel quedarían emparejados con el título equivocado.
        if (fallidos.has(tipo) && item.numero !== undefined) {
          setResultados(actual => ({ ...actual, [item.nombre]: { error: 'No se cargó porque falló el documento anterior del mismo nivel.' } }));
          continue;
        }
        setResultados(actual => ({ ...actual, [item.nombre]: 'cargando' }));
        let problema: string | null;
        try {
          problema = await onSubir(item.file, grupo, { titulo: item.tituloNuevo, descripcion: descripcionCargaMasiva(item) });
        } catch (causa) {
          problema = causa instanceof Error && causa.message ? causa.message : 'No fue posible cargar el archivo.';
        }
        if (problema) fallidos.add(tipo);
        setResultados(actual => ({ ...actual, [item.nombre]: problema ? { error: problema } : 'cargado' }));
      }
    } finally {
      await onTerminado();
      setCargando(false); setTerminado(true);
    }
  };

  const cargados = Object.values(resultados).filter(item => item === 'cargado').length;
  const conError = Object.values(resultados).filter(item => typeof item === 'object').length;

  const destino = (item: (typeof plan)[number]) => {
    if (!item.soporte) return '—';
    return `${item.soporte}${item.numero ? ` · posición ${item.numero}` : ''}`;
  };
  const estadoFila = (item: (typeof plan)[number]) => {
    const resultado = resultados[item.nombre];
    if (resultado === 'cargado') return { clase: 'cargado', texto: 'Cargado' };
    if (resultado === 'cargando') return { clase: 'cargando', texto: 'Cargando…' };
    if (resultado === 'pendiente') return { clase: 'pendiente', texto: 'En espera' };
    if (resultado && typeof resultado === 'object') return { clase: 'rechazado', texto: `Error: ${resultado.error}` };
    if (item.estado === 'valido') return { clase: 'valido', texto: 'Se cargará' };
    return { clase: item.estado, texto: `${item.estado === 'rechazado' ? 'Rechazado' : 'Advertencia'}: ${item.motivo}` };
  };

  return (
    <>
      <button ref={boton} type="button" className="rund-documents__add-secondary" disabled={disabled} onClick={() => setAbierto(true)}
        aria-haspopup="dialog" title="Cargar varios documentos de esta carpeta a la vez">
        <FolderUp size={15} aria-hidden="true" /> Carga masiva
      </button>
      {abierto && createPortal(
        <div className="rund-soportes-modal" role="dialog" aria-modal="true" aria-label={`Carga masiva de ${etiquetaCarpeta}`}>
          <div className="rund-soportes-modal__caja rund-carga-masiva">
            <h3>Carga masiva · {etiquetaCarpeta}</h3>
            <p>
              Elija varios PDF de esta carpeta. Antes de cargar verá qué hará el sistema con cada archivo; nada se carga hasta que confirme.
              {nomenclaturaObligatoria
                ? ' El nombre de cada archivo debe cumplir la nomenclatura de la codificación; los que no la cumplen se rechazan con el motivo.'
                : ' En esta carpeta la nomenclatura no es obligatoria: se acepta cualquier nombre.'}
            </p>
            {nomenclaturaObligatoria && patrones.length > 0 && (
              <p className="rund-carga-masiva__patrones">Nomenclatura: {patrones.map(patron => <code key={patron}>{patron}</code>)}</p>
            )}
            <label htmlFor="rund-carga-masiva-archivos">Documentos (PDF, máximo {RUND_MAX_ARCHIVO_MB} MB cada uno)</label>
            <input id="rund-carga-masiva-archivos" type="file" multiple accept="application/pdf,.pdf" disabled={cargando}
              onChange={event => { elegir(event.target.files); }} />
            {error && <p role="alert" className="rund-soportes-modal__error">{error}</p>}

            {plan.length > 0 && <>
              <p role="status" className="rund-carga-masiva__resumen">
                <strong>{resumen.total}</strong> archivo{resumen.total === 1 ? '' : 's'}: <strong>{resumen.validos}</strong> se cargar{resumen.validos === 1 ? 'á' : 'án'},
                {' '}<strong>{resumen.rechazados}</strong> rechazado{resumen.rechazados === 1 ? '' : 's'}, <strong>{resumen.advertencias}</strong> advertencia{resumen.advertencias === 1 ? '' : 's'}.
                {terminado && <> Resultado: <strong>{cargados}</strong> cargado{cargados === 1 ? '' : 's'}{conError ? <>, <strong>{conError}</strong> con error</> : null}.</>}
              </p>
              <div className="rund-carga-masiva__tabla">
                <table>
                  <thead><tr><th scope="col">Archivo</th><th scope="col">Soporte destino</th><th scope="col">Título / datos del nombre</th><th scope="col">Resultado</th></tr></thead>
                  <tbody>
                    {plan.map(item => {
                      const estado = estadoFila(item);
                      return (
                        <tr key={item.nombre} data-estado={estado.clase}>
                          <td className="rund-carga-masiva__archivo">{item.nombre}</td>
                          <td>{destino(item)}</td>
                          <td>
                            {item.tituloExistente && <span>Título: {item.tituloExistente}</span>}
                            {item.tituloNuevo && <span>Se registrará el título «{item.tituloNuevo}». Puede editarlo luego desde la tabla.</span>}
                            {item.datos.length > 0 && <small>{item.datos.join(' · ')}</small>}
                            {!item.tituloExistente && !item.tituloNuevo && item.datos.length === 0 && '—'}
                          </td>
                          <td><span className={`rund-carga-masiva__estado rund-carga-masiva__estado--${estado.clase}`}>{estado.texto}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>}
            <footer>
              <button type="button" onClick={cerrar} disabled={cargando}>{terminado ? 'Cerrar' : 'Cancelar'}</button>
              {!terminado && <button type="button" className="rund-soportes-modal__confirmar" onClick={cargar} disabled={cargando || resumen.validos === 0}>
                {cargando ? 'Cargando…' : `Cargar ${resumen.validos} archivo${resumen.validos === 1 ? '' : 's'}`}
              </button>}
            </footer>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
