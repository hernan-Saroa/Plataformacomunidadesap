/**
 * Resultados de la auditoría en la etapa de Ejecución (EFDS-1636).
 *
 * El equipo auditor consolida aquí Fortalezas, Hallazgos, Recomendaciones y Conclusiones
 * antes de comunicar los resultados. Los hallazgos se gestionan en su propia sección;
 * aquí solo se resumen. Comunicación y los informes leen lo registrado.
 */
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Award, CheckCircle, Lightbulb, Loader2, Plus, Save, ScrollText, Trash2 } from 'lucide-react';
import { Button } from '@esap-mfe/shared-ui/button';
import { controlInternoService } from '../../../services/api/controlInternoService';

interface Props {
  auditoriaId: string;
  /** Hallazgos ya cargados por el expediente, para el resumen */
  hallazgos?: Array<{ id: string; estado?: string; categoria?: string }>;
  readOnly?: boolean;
}

const listaDesde = (valor: unknown): string[] =>
  Array.isArray(valor) ? valor.map((v) => String(v ?? '')).filter((v) => v.trim().length > 0) : [];

function ListaEditable({
  titulo,
  descripcion,
  icono,
  items,
  placeholder,
  readOnly,
  onChange,
}: {
  titulo: string;
  descripcion: string;
  icono: React.ReactNode;
  items: string[];
  placeholder: string;
  readOnly?: boolean;
  onChange: (items: string[]) => void;
}) {
  const [nuevo, setNuevo] = useState('');

  const agregar = () => {
    const texto = nuevo.trim();
    if (!texto) return;
    onChange([...items, texto]);
    setNuevo('');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        {icono}
        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">{titulo}</h4>
        <span className="text-[10px] text-gray-500">({items.length})</span>
      </div>
      <p className="text-[11px] text-gray-500 mb-2">{descripcion}</p>

      {items.length === 0 ? (
        <p className="text-[11px] text-gray-400 italic mb-2">Sin registros.</p>
      ) : (
        <ul className="space-y-1.5 mb-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs text-gray-800 bg-gray-50 border border-gray-100 rounded-md px-2 py-1.5">
              <span className="font-semibold text-gray-500 shrink-0">{idx + 1}.</span>
              {readOnly ? (
                <span className="flex-1 whitespace-pre-wrap">{item}</span>
              ) : (
                <textarea
                  value={item}
                  rows={Math.min(4, Math.max(1, Math.ceil(item.length / 90)))}
                  onChange={(e) => onChange(items.map((it, i) => (i === idx ? e.target.value : it)))}
                  className="flex-1 bg-transparent resize-y text-xs focus:outline-none"
                  aria-label={`${titulo} ${idx + 1}`}
                />
              )}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, i) => i !== idx))}
                  className="text-gray-400 hover:text-red-600 shrink-0"
                  title="Quitar"
                  aria-label={`Quitar ${titulo.toLowerCase()} ${idx + 1}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <div className="flex gap-2">
          <input
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                agregar();
              }
            }}
            placeholder={placeholder}
            className="flex-1 h-8 px-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:border-[#003DA5]"
          />
          <Button type="button" variant="outline" size="sm" onClick={agregar} disabled={!nuevo.trim()} className="h-8 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Agregar
          </Button>
        </div>
      )}
    </div>
  );
}

export function SeccionResultadosAuditoria({ auditoriaId, hallazgos = [], readOnly }: Props) {
  const [fortalezas, setFortalezas] = useState<string[]>([]);
  const [recomendaciones, setRecomendaciones] = useState<string[]>([]);
  const [conclusiones, setConclusiones] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [modificado, setModificado] = useState(false);

  useEffect(() => {
    let activo = true;
    if (!auditoriaId) return;
    setCargando(true);
    controlInternoService
      .getAuditoriaById(auditoriaId)
      .then((data: any) => {
        if (!activo) return;
        setFortalezas(listaDesde(data?.fortalezas));
        setRecomendaciones(listaDesde(data?.recomendacionesGenerales));
        setConclusiones(String(data?.conclusiones ?? ''));
        setModificado(false);
      })
      .catch(() => {
        if (activo) toast.error('No se pudieron cargar los resultados de la auditoría');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [auditoriaId]);

  const marcar = <T,>(setter: (v: T) => void) => (valor: T) => {
    setter(valor);
    setModificado(true);
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const res = await controlInternoService.actualizarResultadosAuditoria(auditoriaId, {
        fortalezas: fortalezas.map((f) => f.trim()).filter(Boolean),
        recomendacionesGenerales: recomendaciones.map((r) => r.trim()).filter(Boolean),
        conclusiones: conclusiones.trim(),
      });
      setFortalezas(listaDesde(res?.fortalezas));
      setRecomendaciones(listaDesde(res?.recomendacionesGenerales));
      setConclusiones(String(res?.conclusiones ?? ''));
      setModificado(false);
      toast.success('Resultados de la auditoría guardados', {
        description: 'Quedan disponibles para la etapa de Comunicación.',
      });
    } catch (error: any) {
      const status = error?.response?.status ?? error?.status;
      toast.error('No se pudieron guardar los resultados', {
        description:
          status === 403
            ? 'Su rol no tiene permiso para editar la auditoría ni registrar hallazgos.'
            : error?.response?.data?.message || error?.message || 'Intente nuevamente.',
      });
    } finally {
      setGuardando(false);
    }
  };

  const hallazgosVigentes = hallazgos.filter((h) => (h.estado || '').toLowerCase() !== 'retirado');
  const hallazgosPorCategoria = hallazgosVigentes.reduce<Record<string, number>>((acc, h) => {
    const cat = (h.categoria || 'sin categoría').toLowerCase();
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-gray-200 bg-gray-50/50">
        <div className="min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">Resultados de la auditoría</h3>
          <p className="text-[11px] text-gray-500">Consolidación de fortalezas, hallazgos, recomendaciones y conclusiones antes de la Comunicación</p>
        </div>
        {!readOnly && (
          <Button
            type="button"
            size="sm"
            onClick={guardar}
            disabled={guardando || cargando || !modificado}
            className="h-8 text-xs bg-[#003DA5] hover:bg-[#002f80] text-white shrink-0"
          >
            {guardando ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            Guardar resultados
          </Button>
        )}
      </div>

      {cargando ? (
        <div className="p-6 flex items-center justify-center gap-2 text-xs text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Cargando resultados...
        </div>
      ) : (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ListaEditable
            titulo="Fortalezas"
            descripcion="Aspectos positivos identificados en el proceso auditado."
            icono={<Award className="w-4 h-4 text-green-600" />}
            items={fortalezas}
            placeholder="Escriba una fortaleza y presione Agregar"
            readOnly={readOnly}
            onChange={marcar(setFortalezas)}
          />

          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Hallazgos</h4>
              <span className="text-[10px] text-gray-500">({hallazgosVigentes.length})</span>
            </div>
            <p className="text-[11px] text-gray-500 mb-2">
              Se registran y editan en la sección «Hallazgos de Auditoría» de esta etapa.
            </p>
            {hallazgosVigentes.length === 0 ? (
              <p className="text-[11px] text-gray-400 italic">Sin hallazgos registrados.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(hallazgosPorCategoria).map(([cat, total]) => (
                  <span key={cat} className="px-2 py-0.5 rounded-full bg-red-50 border border-red-100 text-[11px] text-red-800 capitalize">
                    {cat}: {total}
                  </span>
                ))}
              </div>
            )}
          </div>

          <ListaEditable
            titulo="Recomendaciones"
            descripcion="Recomendaciones generales de la auditoría, adicionales a las de cada hallazgo."
            icono={<Lightbulb className="w-4 h-4 text-amber-600" />}
            items={recomendaciones}
            placeholder="Escriba una recomendación y presione Agregar"
            readOnly={readOnly}
            onChange={marcar(setRecomendaciones)}
          />

          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <ScrollText className="w-4 h-4 text-[#003DA5]" />
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Conclusiones</h4>
              {conclusiones.trim() && <CheckCircle className="w-3.5 h-3.5 text-green-600" />}
            </div>
            <p className="text-[11px] text-gray-500 mb-2">Se usan como conclusiones de los informes de Comunicación.</p>
            {readOnly ? (
              <p className="text-xs text-gray-800 whitespace-pre-wrap">{conclusiones || 'Sin conclusiones registradas.'}</p>
            ) : (
              <textarea
                value={conclusiones}
                onChange={(e) => marcar(setConclusiones)(e.target.value)}
                rows={6}
                placeholder="Conclusiones de la auditoría"
                className="w-full p-2 text-xs border border-gray-300 rounded-md resize-y focus:outline-none focus:border-[#003DA5]"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
