import { useState, useCallback, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  X,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Calendar,
  Route,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { RutaItinerario, Geopolitica } from '../types/viaticos';
import {
  calcularDiasRuta,
  esHorarioMilitarValido,
  formatearHorarioMilitar,
  formatearDiasComision,
} from '../utils/viaticosUtils';
import SearchableSelect, { SearchableSelectOption } from './SearchableSelect';

const TRANSPORTE_OPTIONS = [
  { value: 'AEREO', label: 'Aéreo ✈️' },
  { value: 'TERRESTRE', label: 'Terrestre 🚌' },
];

const TRAYECTO_OPTIONS = [
  { value: 'SOLO_IDA', label: 'Solo Ida' },
  { value: 'IDA_Y_VUELTA', label: 'Ida y Vuelta' },
];

interface Props {
  itinerario: RutaItinerario[];
  onChange: (itinerario: RutaItinerario[]) => void;
  departamentos: Geopolitica[];
  ciudades: Geopolitica[];
  ciudadesDepto: string;
  cargandoCiudades: boolean;
}

let nextId = 1;
function generarId(): string {
  return `ruta-${nextId++}`;
}

function crearRutaVacia(origenCiudad: string = '', origenDepartamento: string = ''): RutaItinerario {
  return {
    id: generarId(),
    origenCiudad,
    origenDepartamento,
    destinoCiudad: '',
    destinoDepartamento: '',
    tipoTrayecto: 'IDA_Y_VUELTA',
    fechaSalida: '',
    fechaLlegada: '',
    diasRuta: 1,
    horarioEstimadoMilitar: '08:00',
    tipoTransporte: 'TERRESTRE',
    requiereTiquete: false,
  };
}

interface ValidationErrors {
  origenDepartamento?: string;
  origenCiudad?: string;
  destinoDepartamento?: string;
  destinoCiudad?: string;
  fechaSalida?: string;
  fechaLlegada?: string;
  horarioEstimadoMilitar?: string;
  tipoTrayecto?: string;
  tipoTransporte?: string;
  secuencia?: string;
}

function RutaForm({
  ruta,
  index,
  onChange,
  onDelete,
  canDelete,
  departamentos,
  ciudades,
  ciudadesDepto,
  cargandoCiudades,
  itinerarioCompleto,
}: {
  ruta: RutaItinerario;
  index: number;
  onChange: (ruta: RutaItinerario) => void;
  onDelete: () => void;
  canDelete: boolean;
  departamentos: Geopolitica[];
  ciudades: Geopolitica[];
  ciudadesDepto: string;
  cargandoCiudades: boolean;
  itinerarioCompleto: RutaItinerario[];
}) {
  const [expanded, setExpanded] = useState(true);
  const [editMode, setEditMode] = useState(true);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const rutaAnterior = itinerarioCompleto[index - 1];

  const deptOptions: SearchableSelectOption[] = useMemo(
    () =>
      departamentos
        .filter((d) => d.tipDivision === 'DEPTO')
        .map((d) => ({ value: d.nomDivGeopolitica, label: d.nomDivGeopolitica })),
    [departamentos],
  );

  const ciudadOptions: SearchableSelectOption[] = useMemo(
    () =>
      ciudades
        .filter((c) => c.tipDivision === 'CIUDAD')
        .map((c) => ({ value: c.nomDivGeopolitica, label: c.nomDivGeopolitica })),
    [ciudades],
  );

  const diasCalculados = calcularDiasRuta(ruta.fechaSalida, ruta.fechaLlegada);
  const horarioValido = esHorarioMilitarValido(ruta.horarioEstimadoMilitar);

  const validate = (): ValidationErrors => {
    const newErrors: ValidationErrors = {};

    if (!ruta.origenDepartamento) newErrors.origenDepartamento = 'Requerido';
    if (!ruta.origenCiudad) newErrors.origenCiudad = 'Requerido';
    if (!ruta.destinoDepartamento) newErrors.destinoDepartamento = 'Requerido';
    if (!ruta.destinoCiudad) newErrors.destinoCiudad = 'Requerido';
    if (!ruta.fechaSalida) newErrors.fechaSalida = 'Requerida';
    if (!ruta.fechaLlegada) newErrors.fechaLlegada = 'Requerida';
    if (!ruta.horarioEstimadoMilitar) newErrors.horarioEstimadoMilitar = 'Requerido';
    else if (!horarioValido) newErrors.horarioEstimadoMilitar = 'Formato HH:mm inválido';

    if (ruta.fechaSalida && ruta.fechaLlegada) {
      const inicio = new Date(ruta.fechaSalida);
      const fin = new Date(ruta.fechaLlegada);
      if (fin < inicio) newErrors.fechaLlegada = 'Debe ser posterior a fecha salida';
    }

    if (rutaAnterior && ruta.fechaSalida && rutaAnterior.fechaLlegada) {
      const inicioActual = new Date(ruta.fechaSalida);
      const finAnterior = new Date(rutaAnterior.fechaLlegada);
      if (inicioActual < finAnterior) {
        newErrors.secuencia = `La fecha de inicio debe ser posterior a la llegada del tramo anterior (${rutaAnterior.fechaLlegada})`;
      }
    }

    if (diasCalculados <= 0 && ruta.fechaSalida && ruta.fechaLlegada) {
      newErrors.fechaLlegada = 'Debe generar al menos 0.5 días';
    }

    return newErrors;
  };

  const update = (campo: keyof RutaItinerario, valor: any) => {
    onChange({ ...ruta, [campo]: valor });
    setSaved(false);
    setErrors((prev) => ({ ...prev, [campo]: undefined }));
  };

  const handleOrigenDeptoChange = (depto: string) => {
    update('origenDepartamento', depto);
    update('origenCiudad', '');
  };

  const handleDestinoDeptoChange = (depto: string) => {
    update('destinoDepartamento', depto);
    update('destinoCiudad', '');
  };

  const handleSave = () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setEditMode(false);
    }, 300);
  };

  const handleEdit = () => {
    setEditMode(true);
    setSaved(false);
  };

  const isValid = Object.keys(validate()).length === 0;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <div
        className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4 text-[#003DA5]" />
          <span className="text-xs font-black text-slate-800">Tramo {index + 1}</span>
          {ruta.origenCiudad && ruta.destinoCiudad ? (
            <span className="text-[10px] font-bold text-slate-600">
              {ruta.origenCiudad} → {ruta.destinoCiudad}
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 italic">Sin definir</span>
          )}
          {!horarioValido && ruta.horarioEstimadoMilitar && (
            <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Horario inválido</span>
          )}
          {saved && (
            <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Guardado
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-3">
          {editMode ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Origen (Departamento) <span className="text-red-500">*</span></label>
                  <SearchableSelect
                    options={deptOptions}
                    value={ruta.origenDepartamento}
                    onChange={handleOrigenDeptoChange}
                    placeholder="Seleccione departamento de origen..."
                    emptyText="Sin departamentos"
                    error={errors.origenDepartamento}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    <MapPin className="w-3 h-3 inline mr-1" /> Origen (Ciudad) <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={ciudadOptions}
                    value={ruta.origenCiudad}
                    onChange={(v) => update('origenCiudad', v)}
                    placeholder="Seleccione ciudad de origen..."
                    emptyText="Primero seleccione un departamento"
                    disabled={!ruta.origenDepartamento || cargandoCiudades}
                    loading={cargandoCiudades}
                    error={errors.origenCiudad}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Destino (Departamento) <span className="text-red-500">*</span></label>
                  <SearchableSelect
                    options={deptOptions}
                    value={ruta.destinoDepartamento}
                    onChange={handleDestinoDeptoChange}
                    placeholder="Seleccione departamento de destino..."
                    emptyText="Sin departamentos"
                    error={errors.destinoDepartamento}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    <MapPin className="w-3 h-3 inline mr-1" /> Destino (Ciudad) <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={ciudadOptions}
                    value={ruta.destinoCiudad}
                    onChange={(v) => update('destinoCiudad', v)}
                    placeholder="Seleccione ciudad de destino..."
                    emptyText="Primero seleccione un departamento"
                    disabled={!ruta.destinoDepartamento || cargandoCiudades}
                    loading={cargandoCiudades}
                    error={errors.destinoCiudad}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    <Calendar className="w-3 h-3 inline mr-1" /> Fecha Salida <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={ruta.fechaSalida}
                    onChange={(e) => {
                      update('fechaSalida', e.target.value);
                      const nuevosDias = calcularDiasRuta(e.target.value, ruta.fechaLlegada);
                      if (nuevosDias > 0) update('diasRuta', nuevosDias);
                    }}
                    min={rutaAnterior?.fechaLlegada ? (() => { const d = new Date(rutaAnterior.fechaLlegada); d.setDate(d.getDate() + 1); return d.toISOString().slice(0,10); })() : undefined}
                    className={`w-full px-3 py-2 border rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white ${errors.fechaSalida ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                  />
                  {errors.fechaSalida && <p className="text-[9px] text-red-600 mt-1">{errors.fechaSalida}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    <Calendar className="w-3 h-3 inline mr-1" /> Fecha Llegada <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={ruta.fechaLlegada}
                    onChange={(e) => {
                      update('fechaLlegada', e.target.value);
                      const nuevosDias = calcularDiasRuta(ruta.fechaSalida, e.target.value);
                      if (nuevosDias > 0) update('diasRuta', nuevosDias);
                    }}
                    min={ruta.fechaSalida}
                    className={`w-full px-3 py-2 border rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white ${errors.fechaLlegada ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                  />
                  {errors.fechaLlegada && <p className="text-[9px] text-red-600 mt-1">{errors.fechaLlegada}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    <Clock className="w-3 h-3 inline mr-1" /> Horario Militar (HH:mm) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={ruta.horarioEstimadoMilitar}
                    onChange={(e) => update('horarioEstimadoMilitar', e.target.value)}
                    placeholder="08:00"
                    maxLength={5}
                    className={`w-full px-3 py-2 border rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white ${errors.horarioEstimadoMilitar ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                  />
                  {errors.horarioEstimadoMilitar && <p className="text-[9px] text-red-600 mt-1">{errors.horarioEstimadoMilitar}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Días (auto-cálculo)</label>
                  <input
                    type="text"
                    value={formatearDiasComision(diasCalculados > 0 ? diasCalculados : (ruta.diasRuta || 1))}
                    readOnly
                    aria-readonly="true"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 bg-slate-50 cursor-not-allowed"
                    title="Calculado automáticamente a partir de las fechas"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tipo Trayecto</label>
                  <div className="flex gap-2">
                    {TRAYECTO_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => update('tipoTrayecto', opt.value as any)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${ruta.tipoTrayecto === opt.value ? 'bg-[#003DA5] text-white border-[#003DA5]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tipo Transporte</label>
                  <div className="flex gap-2">
                    {TRANSPORTE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => update('tipoTransporte', opt.value as any)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${ruta.tipoTransporte === opt.value ? 'bg-[#003DA5] text-white border-[#003DA5]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ruta.requiereTiquete || false}
                    onChange={(e) => update('requiereTiquete', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#003DA5] focus:ring-[#003DA5]"
                  />
                  Requiere tiquete
                </label>
                <div className="flex gap-2">
                  {canDelete && (
                    <button
                      type="button"
                      onClick={onDelete}
                      className="px-2 py-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar tramo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-1.5 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {saving ? 'Guardando...' : 'Guardar Ruta'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div><span className="text-slate-400">Origen:</span> <span className="font-bold ml-1">{ruta.origenCiudad}, {ruta.origenDepartamento}</span></div>
                <div><span className="text-slate-400">Destino:</span> <span className="font-bold ml-1">{ruta.destinoCiudad}, {ruta.destinoDepartamento}</span></div>
                <div><span className="text-slate-400">Fechas:</span> <span className="font-bold ml-1">{ruta.fechaSalida} → {ruta.fechaLlegada}</span></div>
                <div><span className="text-slate-400">Días:</span> <span className="font-bold ml-1">{formatearDiasComision(ruta.diasRuta)}</span></div>
                <div><span className="text-slate-400">Horario:</span> <span className="font-bold ml-1">{formatearHorarioMilitar(ruta.horarioEstimadoMilitar)}</span></div>
                <div><span className="text-slate-400">Trayecto:</span> <span className="font-bold ml-1">{ruta.tipoTrayecto === 'SOLO_IDA' ? 'Solo Ida' : 'Ida y Vuelta'}</span></div>
                <div><span className="text-slate-400">Transporte:</span> <span className="font-bold ml-1">{ruta.tipoTransporte}</span></div>
                <div><span className="text-slate-400">Tiquete:</span> <span className="font-bold ml-1">{ruta.requiereTiquete ? 'Sí' : 'No'}</span></div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleEdit}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Editar
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function ItinerarioBuilder({
  itinerario,
  onChange,
  departamentos,
  ciudades,
  ciudadesDepto,
  cargandoCiudades,
}: Props) {
  const [view, setView] = useState<'general' | 'detalle'>('detalle');

  const agregarRuta = useCallback(() => {
    const ultimaRuta = itinerario[itinerario.length - 1];
    const nuevaRuta = crearRutaVacia(
      ultimaRuta ? ultimaRuta.destinoCiudad : '',
      ultimaRuta ? ultimaRuta.destinoDepartamento : '',
    );
    onChange([...itinerario, nuevaRuta]);
  }, [itinerario, onChange]);

  const actualizarRuta = useCallback(
    (rutaActualizada: RutaItinerario) => {
      const actualizado = itinerario.map((r) =>
        r.id === rutaActualizada.id ? rutaActualizada : r,
      );
      onChange(actualizado);
    },
    [itinerario, onChange],
  );

  const eliminarRuta = useCallback(
    (id: string) => {
      onChange(itinerario.filter((r) => r.id !== id));
    },
    [itinerario, onChange],
  );

  const ordenarSubir = useCallback(
    (id: string) => {
      const idx = itinerario.findIndex((r) => r.id === id);
      if (idx <= 0) return;
      const nuevo = [...itinerario];
      [nuevo[idx - 1], nuevo[idx]] = [nuevo[idx], nuevo[idx - 1]];
      onChange(nuevo);
    },
    [itinerario, onChange],
  );

  const ordenarBajar = useCallback(
    (id: string) => {
      const idx = itinerario.findIndex((r) => r.id === id);
      if (idx >= itinerario.length - 1) return;
      const nuevo = [...itinerario];
      [nuevo[idx], nuevo[idx + 1]] = [nuevo[idx + 1], nuevo[idx]];
      onChange(nuevo);
    },
    [itinerario, onChange],
  );

  const allSaved = itinerario.length > 0 && itinerario.every((r) => r.fechaSalida && r.fechaLlegada && r.origenCiudad && r.destinoCiudad);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4 text-[#003DA5]" />
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Itinerario (Rutas / Tramos)</span>
          {itinerario.length > 0 && (
            <span className="text-[10px] font-bold text-[#003DA5] bg-blue-50 px-2 py-0.5 rounded-full">
              {itinerario.length} tramo{itinerario.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setView('general')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors ${view === 'general' ? 'bg-white text-[#003DA5] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              📋 General
            </button>
            <button
              type="button"
              onClick={() => setView('detalle')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors ${view === 'detalle' ? 'bg-white text-[#003DA5] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              🗂️ Desglose
            </button>
          </div>
          <button
            type="button"
            onClick={agregarRuta}
            className="px-3 py-1.5 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar Ruta
          </button>
        </div>
      </div>

      {view === 'general' && itinerario.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-slate-500 font-semibold uppercase">Resumen Consolidado</p>
          {itinerario.map((ruta, idx) => (
            <div key={ruta.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-[#003DA5] text-white flex items-center justify-center text-[10px] font-black shrink-0">{idx + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-800">{ruta.origenCiudad || 'Origen'} → {ruta.destinoCiudad || 'Destino'}</div>
                <div className="text-[10px] text-slate-500">
                  {ruta.fechaSalida} al {ruta.fechaLlegada} · {formatearHorarioMilitar(ruta.horarioEstimadoMilitar)} · {ruta.tipoTrayecto === 'SOLO_IDA' ? 'Solo Ida' : 'Ida y Vuelta'} · {ruta.diasRuta} d
                </div>
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${ruta.tipoTransporte === 'AEREO' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                {ruta.tipoTransporte}
              </span>
            </div>
          ))}
        </div>
      )}

      {view === 'detalle' && (
        <div className="space-y-3">
          {itinerario.length === 0 && (
            <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
              <Route className="w-6 h-6 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No hay rutas definidas. Haga clic en "Agregar Ruta" para comenzar.</p>
            </div>
          )}

          {itinerario.map((ruta, idx) => (
            <div key={ruta.id} className="relative">
              {itinerario.length > 1 && (
                <div className="absolute -left-3 top-0 flex flex-col items-center gap-0.5 z-10">
                  <button type="button" onClick={() => ordenarSubir(ruta.id)} disabled={idx === 0} className="p-0.5 rounded text-slate-400 hover:text-[#003DA5] disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => ordenarBajar(ruta.id)} disabled={idx === itinerario.length - 1} className="p-0.5 rounded text-slate-400 hover:text-[#003DA5] disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                </div>
              )}
              <RutaForm
                ruta={ruta}
                index={idx}
                onChange={actualizarRuta}
                onDelete={() => eliminarRuta(ruta.id)}
                canDelete={itinerario.length > 1}
                departamentos={departamentos}
                ciudades={ciudades}
                ciudadesDepto={ciudadesDepto}
                cargandoCiudades={cargandoCiudades}
                itinerarioCompleto={itinerario}
              />
            </div>
          ))}
        </div>
      )}

      {itinerario.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <Clock className="w-4 h-4 text-[#003DA5] shrink-0" />
          <span className="text-[10px] text-[#003DA5] font-semibold">
            Total de tramos: {itinerario.length} · Horarios validados: {itinerario.filter((r) => esHorarioMilitarValido(r.horarioEstimadoMilitar)).length}/{itinerario.length}
            {allSaved && <span className="ml-2 text-green-600">✓ Todas las rutas completas</span>}
          </span>
        </div>
      )}
    </div>
  );
}