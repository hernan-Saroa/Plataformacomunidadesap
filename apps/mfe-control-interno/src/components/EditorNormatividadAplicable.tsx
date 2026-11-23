/**
 * Normatividad aplicable de una auditoría (EFDS-2451): registro manual con tipo,
 * cargue masivo desde la plantilla Excel y edición o borrado de cada norma.
 */
import { useRef, useState } from 'react';
import { BookOpen, Plus, Trash2, Pencil, Check, X, Upload, Download, AlertTriangle } from 'lucide-react';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { toast } from 'sonner';
import {
  ETIQUETA_TIPO_NORMA,
  descargarPlantillaNormatividad,
  leerPlantillaNormatividad,
  type FilaRechazada,
  type NormaAplicable,
  type TipoNorma,
} from './services/normatividad';

const NORMA_VACIA: NormaAplicable = { identificacion: '', descripcion: '', tipo: 'general' };
const MIN_DESCRIPCION = 5;

const COLOR_TIPO: Record<TipoNorma, { backgroundColor: string; color: string }> = {
  general: { backgroundColor: '#EDE9FE', color: '#5B21B6' },
  // Ámbar para que se distinga de la general sobre la tarjeta morada
  especifica: { backgroundColor: '#FEF3C7', color: '#92400E' },
};

const claseCampo = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white';

interface Props {
  normas: NormaAplicable[];
  onChange: (normas: NormaAplicable[]) => void;
}

export function EditorNormatividadAplicable({ normas, onChange }: Props) {
  const [nueva, setNueva] = useState<NormaAplicable>(NORMA_VACIA);
  const [editando, setEditando] = useState<number | null>(null);
  const [borrador, setBorrador] = useState<NormaAplicable>(NORMA_VACIA);
  const [cargando, setCargando] = useState(false);
  const [rechazadas, setRechazadas] = useState<FilaRechazada[]>([]);
  const inputArchivo = useRef<HTMLInputElement>(null);

  const generales = normas.filter((n) => n.tipo === 'general').length;
  const especificas = normas.length - generales;

  const agregar = () => {
    if (nueva.descripcion.trim().length < MIN_DESCRIPCION) {
      toast.error(`La norma debe tener al menos ${MIN_DESCRIPCION} caracteres`);
      return;
    }
    onChange([
      ...normas,
      { identificacion: nueva.identificacion.trim(), descripcion: nueva.descripcion.trim(), tipo: nueva.tipo },
    ]);
    // Se conserva el tipo: suelen registrarse varias seguidas del mismo tipo
    setNueva({ ...NORMA_VACIA, tipo: nueva.tipo });
  };

  const guardarEdicion = () => {
    if (editando === null) return;
    if (borrador.descripcion.trim().length < MIN_DESCRIPCION) {
      toast.error(`La norma debe tener al menos ${MIN_DESCRIPCION} caracteres`);
      return;
    }
    onChange(
      normas.map((n, i) =>
        i === editando
          ? { identificacion: borrador.identificacion.trim(), descripcion: borrador.descripcion.trim(), tipo: borrador.tipo }
          : n,
      ),
    );
    setEditando(null);
  };

  // Solo quita la norma de esta auditoría (CA-02)
  const eliminar = (index: number) => {
    onChange(normas.filter((_, i) => i !== index));
    if (editando === index) setEditando(null);
  };

  const descargarPlantilla = async () => {
    try {
      await descargarPlantillaNormatividad();
    } catch (err) {
      console.error('[Normatividad] Error generando la plantilla:', err);
      toast.error('No se pudo generar la plantilla');
    }
  };

  const cargarPlantilla = async (archivo: File | undefined) => {
    if (!archivo) return;
    setCargando(true);
    setRechazadas([]);
    try {
      const resultado = await leerPlantillaNormatividad(archivo, normas);
      if (resultado.normas.length > 0) {
        onChange([...normas, ...resultado.normas]);
      }
      setRechazadas(resultado.rechazadas);
      if (resultado.normas.length > 0) {
        toast.success(`${resultado.normas.length} norma(s) cargada(s) desde la plantilla`, {
          description: resultado.rechazadas.length
            ? `${resultado.rechazadas.length} fila(s) no se cargaron; revise el detalle`
            : undefined,
        });
      } else {
        toast.warning('La plantilla no tiene normas válidas para cargar');
      }
    } catch (err) {
      console.error('[Normatividad] Error leyendo la plantilla:', err);
      toast.error('No se pudo leer la plantilla', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setCargando(false);
      if (inputArchivo.current) inputArchivo.current.value = '';
    }
  };

  const selectorTipo = (valor: TipoNorma, alCambiar: (t: TipoNorma) => void) => (
    <select
      value={valor}
      onChange={(e) => alCambiar(e.target.value as TipoNorma)}
      className={claseCampo}
      aria-label="Tipo de norma"
    >
      <option value="general">{ETIQUETA_TIPO_NORMA.general}</option>
      <option value="especifica">{ETIQUETA_TIPO_NORMA.especifica}</option>
    </select>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h4 className="font-bold text-gray-900">
          Normatividad Aplicable
          {normas.length > 0 && (
            <span className="ml-2 text-xs font-medium text-gray-500">
              {generales} general(es) · {especificas} específica(s)
            </span>
          )}
        </h4>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={descargarPlantilla}>
            <Download className="w-4 h-4 mr-1" />
            Descargar plantilla
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={cargando}
            onClick={() => inputArchivo.current?.click()}
          >
            <Upload className="w-4 h-4 mr-1" />
            {cargando ? 'Cargando...' : 'Cargar desde plantilla'}
          </Button>
          <input
            ref={inputArchivo}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => cargarPlantilla(e.target.files?.[0])}
          />
        </div>
      </div>

      {/* Filas de la plantilla que no se cargaron (CA-03) */}
      {rechazadas.length > 0 && (
        <div className="mb-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">
                {rechazadas.length} fila(s) de la plantilla no se cargaron
              </p>
              <ul className="mt-1 text-xs text-amber-800 space-y-0.5">
                {rechazadas.map((r) => (
                  <li key={`${r.fila}-${r.motivo}`}>Fila {r.fila}: {r.motivo}</li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setRechazadas([])}
              className="text-amber-700"
              aria-label="Cerrar detalle"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {normas.length > 0 && (
        <div className="space-y-2 mb-3">
          {normas.map((norma, index) =>
            editando === index ? (
              <div key={index} className="p-3 bg-purple-50 rounded-lg border border-purple-200 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <div className="w-40">
                    <Input
                      value={borrador.identificacion}
                      onChange={(e) => setBorrador({ ...borrador, identificacion: e.target.value })}
                      placeholder="Identificación"
                    />
                  </div>
                  <div className="w-40">{selectorTipo(borrador.tipo, (tipo) => setBorrador({ ...borrador, tipo }))}</div>
                </div>
                <textarea
                  value={borrador.descripcion}
                  onChange={(e) => setBorrador({ ...borrador, descripcion: e.target.value })}
                  rows={2}
                  className={`${claseCampo} resize-none`}
                />
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditando(null)}>
                    <X className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button type="button" size="sm" onClick={guardarEdicion} style={{ backgroundColor: '#003DA5' }}>
                    <Check className="w-4 h-4 mr-1" />
                    Guardar
                  </Button>
                </div>
              </div>
            ) : (
              <div
                key={index}
                className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200"
              >
                <BookOpen className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {norma.identificacion && (
                      <span className="text-sm font-semibold text-gray-900">{norma.identificacion}</span>
                    )}
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={COLOR_TIPO[norma.tipo]}
                    >
                      {ETIQUETA_TIPO_NORMA[norma.tipo]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{norma.descripcion}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditando(index);
                    setBorrador(norma);
                  }}
                  aria-label="Editar norma"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => eliminar(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  aria-label="Eliminar norma"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ),
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <div className="w-40">
          <Input
            value={nueva.identificacion}
            onChange={(e) => setNueva({ ...nueva, identificacion: e.target.value })}
            placeholder="Ej: Decreto 648 de 2017"
          />
        </div>
        <Input
          value={nueva.descripcion}
          onChange={(e) => setNueva({ ...nueva, descripcion: e.target.value })}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              agregar();
            }
          }}
          placeholder="Descripción de la norma"
          // En pantallas angostas pasa a su propia línea en vez de quedar apretada
          style={{ flex: '1 1 240px', minWidth: 0 }}
        />
        <div className="w-36">{selectorTipo(nueva.tipo, (tipo) => setNueva({ ...nueva, tipo }))}</div>
        <Button
          type="button"
          onClick={agregar}
          disabled={nueva.descripcion.trim().length < MIN_DESCRIPCION}
          style={{ backgroundColor: '#003DA5' }}
        >
          <Plus className="w-4 h-4 mr-1" />
          Agregar
        </Button>
      </div>
    </div>
  );
}
