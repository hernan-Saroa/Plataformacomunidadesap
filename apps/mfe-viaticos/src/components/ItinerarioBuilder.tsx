import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
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
  Plane,
} from 'lucide-react';
import { RutaItinerario, Geopolitica } from '../types/viaticos';
import {
  departamentosDisponibles,
  ciudadesDeDepartamento,
  calcularDiasRuta,
  esHorarioMilitarValido,
  formatearHorarioMilitar,
  formatearDiasComision,
  formatearMoneda,
  sincronizarItinerarioFormulario,
  validarSecuenciaItinerario,
  calcularTarifaTerminalAereoRuta,
} from '../utils/viaticosUtils';
import SearchableSelect, { SearchableSelectOption } from './SearchableSelect';
import viaticosService from '../services/api/viaticosService';

const TRANSPORTE_OPTIONS = [
  { value: 'AEREO', label: 'Aéreo ✈️' },
  { value: 'TERRESTRE', label: 'Terrestre 🚌' },
];

interface Props {
  itinerario: RutaItinerario[];
  onChange: (itinerario: RutaItinerario[]) => void;
  departamentos: Geopolitica[];
  ciudades?: Geopolitica[];
  ciudadesDepto?: string;
  cargandoCiudades?: boolean;
}

let nextId = 1;
function generarId(): string {
  return `ruta-${Date.now()}-${nextId++}`;
}

function crearRutaVacia(
  origenCiudad: string = '',
  origenDepartamento: string = '',
  origenDepartamentoId?: number | null,
): RutaItinerario {
  return {
    id: generarId(),
    origenCiudad,
    origenDepartamento,
    origenDepartamentoId: origenDepartamentoId ?? null,
    destinoCiudad: '',
    destinoDepartamento: '',
    tipoTrayecto: 'SOLO_IDA',
    fechaSalida: '',
    fechaLlegada: '',
    diasRuta: 1,
    horarioEstimadoMilitar: '08:00',
    horaEstimadaSalida: '08:00',
    horaEstimadaLlegada: '14:30',
    tipoTransporte: 'TERRESTRE',
    requiereTiquete: false,
    guardada: false,
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
  horaEstimadaSalida?: string;
  horaEstimadaLlegada?: string;
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
  itinerarioCompleto,
  cargarCiudadesDepto,
  ciudadesPorDepto,
  cargandoDepto,
}: {
  ruta: RutaItinerario;
  index: number;
  onChange: (ruta: RutaItinerario) => void;
  onDelete: () => void;
  canDelete: boolean;
  departamentos: Geopolitica[];
  itinerarioCompleto: RutaItinerario[];
  cargarCiudadesDepto: (depto: string) => Promise<void>;
  ciudadesPorDepto: Record<string, Geopolitica[]>;
  cargandoDepto: Record<string, boolean>;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editMode, setEditMode] = useState(!ruta.guardada);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(Boolean(ruta.guardada));

  const rutaAnterior = itinerarioCompleto[index - 1];

  // Carga inicial y reactiva de ciudades al tener departamento
  useEffect(() => {
    if (ruta.origenDepartamento) {
      void cargarCiudadesDepto(ruta.origenDepartamento);
    }
  }, [ruta.origenDepartamento, cargarCiudadesDepto]);

  useEffect(() => {
    if (ruta.destinoDepartamento) {
      void cargarCiudadesDepto(ruta.destinoDepartamento);
    }
  }, [ruta.destinoDepartamento, cargarCiudadesDepto]);

  const deptOptions: SearchableSelectOption[] = useMemo(() => {
    const nombres = new Set<string>();
    (departamentos || []).forEach((d) => {
      if (d.nomDivGeopolitica?.trim()) nombres.add(d.nomDivGeopolitica.trim());
    });
    departamentosDisponibles().forEach((d) => nombres.add(d));

    return Array.from(nombres)
      .sort((a, b) => a.localeCompare(b, 'es'))
      .map((nom) => ({ value: nom, label: nom }));
  }, [departamentos]);

  const ciudadOrigenOptions: SearchableSelectOption[] = useMemo(() => {
    if (!ruta.origenDepartamento?.trim()) return [];
    const key = ruta.origenDepartamento.trim();
    const nombres = new Set<string>();

    const listApi = ciudadesPorDepto[key] || [];
    listApi.forEach((c) => {
      if (c.nomDivGeopolitica?.trim()) nombres.add(c.nomDivGeopolitica.trim());
    });

    const fallback = ciudadesDeDepartamento(key);
    fallback.forEach((c) => nombres.add(c));

    if (ruta.origenCiudad?.trim()) nombres.add(ruta.origenCiudad.trim());

    return Array.from(nombres)
      .sort((a, b) => a.localeCompare(b, 'es'))
      .map((c) => ({ value: c, label: c }));
  }, [ruta.origenDepartamento, ruta.origenCiudad, ciudadesPorDepto]);

  const ciudadDestinoOptions: SearchableSelectOption[] = useMemo(() => {
    if (!ruta.destinoDepartamento?.trim()) return [];
    const key = ruta.destinoDepartamento.trim();
    const nombres = new Set<string>();

    const listApi = ciudadesPorDepto[key] || [];
    listApi.forEach((c) => {
      if (c.nomDivGeopolitica?.trim()) nombres.add(c.nomDivGeopolitica.trim());
    });

    const fallback = ciudadesDeDepartamento(key);
    fallback.forEach((c) => nombres.add(c));

    if (ruta.destinoCiudad?.trim()) nombres.add(ruta.destinoCiudad.trim());

    return Array.from(nombres)
      .sort((a, b) => a.localeCompare(b, 'es'))
      .map((c) => ({ value: c, label: c }));
  }, [ruta.destinoDepartamento, ruta.destinoCiudad, ciudadesPorDepto]);

  const cargandoOrigen = Boolean(ruta.origenDepartamento && cargandoDepto[ruta.origenDepartamento.trim()]);
  const cargandoDestino = Boolean(ruta.destinoDepartamento && cargandoDepto[ruta.destinoDepartamento.trim()]);

  const diasCalculados = calcularDiasRuta(ruta.fechaSalida, ruta.fechaLlegada);
  const horarioValido = esHorarioMilitarValido(ruta.horarioEstimadoMilitar);

  const validate = (): ValidationErrors => {
    const newErrors: ValidationErrors = {};

    if (!ruta.origenDepartamento) newErrors.origenDepartamento = 'Seleccione departamento';
    if (!ruta.origenCiudad) newErrors.origenCiudad = 'Seleccione ciudad';
    if (!ruta.destinoDepartamento) newErrors.destinoDepartamento = 'Seleccione departamento';
    if (!ruta.destinoCiudad) newErrors.destinoCiudad = 'Seleccione ciudad';
    if (!ruta.fechaSalida) newErrors.fechaSalida = 'Requerida';
    if (!ruta.fechaLlegada) newErrors.fechaLlegada = 'Requerida';

    const hSalida = ruta.horaEstimadaSalida || ruta.horarioEstimadoMilitar;
    if (!hSalida) newErrors.horaEstimadaSalida = 'Requerida';
    else if (!esHorarioMilitarValido(hSalida)) newErrors.horaEstimadaSalida = 'Formato HH:mm inválido (ej: 08:00)';

    if (!ruta.horaEstimadaLlegada) newErrors.horaEstimadaLlegada = 'Requerida';
    else if (!esHorarioMilitarValido(ruta.horaEstimadaLlegada)) newErrors.horaEstimadaLlegada = 'Formato HH:mm inválido (ej: 14:30)';

    if (ruta.fechaSalida && ruta.fechaLlegada) {
      if (ruta.fechaLlegada < ruta.fechaSalida) {
        newErrors.fechaLlegada = 'Debe ser posterior o igual a la salida';
      }
    }

    if (rutaAnterior && ruta.fechaSalida) {
      if (rutaAnterior.fechaSalida && ruta.fechaSalida < rutaAnterior.fechaSalida) {
        newErrors.fechaSalida = `No puede ser inferior al tramo anterior (${rutaAnterior.fechaSalida})`;
      } else if (rutaAnterior.fechaLlegada && ruta.fechaSalida < rutaAnterior.fechaLlegada) {
        newErrors.fechaSalida = `No puede ser inferior a la llegada anterior (${rutaAnterior.fechaLlegada})`;
      } else if (
        rutaAnterior.fechaLlegada &&
        ruta.fechaSalida === rutaAnterior.fechaLlegada &&
        ruta.horarioEstimadoMilitar &&
        rutaAnterior.horarioEstimadoMilitar &&
        ruta.horarioEstimadoMilitar < rutaAnterior.horarioEstimadoMilitar
      ) {
        newErrors.horarioEstimadoMilitar = `Para la misma fecha, el tiempo no puede ser anterior a ${rutaAnterior.horarioEstimadoMilitar}`;
      }
    }

    if (diasCalculados <= 0 && ruta.fechaSalida && ruta.fechaLlegada) {
      newErrors.fechaLlegada = 'Debe generar al menos 0.5 días';
    }

    return newErrors;
  };

  const tarifaTerminalInfo = useMemo(() => {
    if (ruta.tipoTransporte !== 'AEREO') return null;
    return calcularTarifaTerminalAereoRuta(
      ruta.destinoDepartamento,
      ruta.destinoCiudad,
      ruta.tipoTrayecto,
      undefined,
      ruta.destinoDepartamentoId,
    );
  }, [
    ruta.tipoTransporte,
    ruta.destinoDepartamento,
    ruta.destinoCiudad,
    ruta.tipoTrayecto,
    ruta.destinoDepartamentoId,
  ]);

  const update = (campo: keyof RutaItinerario, valor: any) => {
    const nuevaRuta = { ...ruta, [campo]: valor, guardada: false };
    if (nuevaRuta.tipoTransporte === 'AEREO') {
      const tarifa = calcularTarifaTerminalAereoRuta(
        nuevaRuta.destinoDepartamento,
        nuevaRuta.destinoCiudad,
        nuevaRuta.tipoTrayecto,
        undefined,
        nuevaRuta.destinoDepartamentoId,
      );
      nuevaRuta.tarifaTerminalAereo = tarifa.totalTramo;
    } else {
      nuevaRuta.tarifaTerminalAereo = 0;
    }
    onChange(nuevaRuta);
    setSaved(false);
    setErrors((prev) => ({ ...prev, [campo]: undefined }));
  };

  const handleOrigenDeptoChange = (depto: string) => {
    const deptoObj = (departamentos || []).find(
      (d) => d.nomDivGeopolitica?.trim().toLowerCase() === depto.trim().toLowerCase(),
    );
    const deptoId = deptoObj
      ? Number(deptoObj.codDepartamento ?? deptoObj.codGeopolitica ?? deptoObj.idGeopolitica) || null
      : null;

    onChange({
      ...ruta,
      origenDepartamento: depto,
      origenDepartamentoId: deptoId,
      origenCiudad: '',
      guardada: false,
    });
    setSaved(false);
    setErrors((prev) => ({ ...prev, origenDepartamento: undefined, origenCiudad: undefined }));
    void cargarCiudadesDepto(depto);
  };

  const handleDestinoDeptoChange = (depto: string) => {
    const deptoObj = (departamentos || []).find(
      (d) => d.nomDivGeopolitica?.trim().toLowerCase() === depto.trim().toLowerCase(),
    );
    const deptoId = deptoObj
      ? Number(deptoObj.codDepartamento ?? deptoObj.codGeopolitica ?? deptoObj.idGeopolitica) || null
      : null;

    const tarifa = ruta.tipoTransporte === 'AEREO'
      ? calcularTarifaTerminalAereoRuta(depto, '', ruta.tipoTrayecto, undefined, deptoId).totalTramo
      : undefined;

    onChange({
      ...ruta,
      destinoDepartamento: depto,
      destinoDepartamentoId: deptoId,
      destinoCiudad: '',
      tarifaTerminalAereo: tarifa,
      guardada: false,
    });
    setSaved(false);
    setErrors((prev) => ({ ...prev, destinoDepartamento: undefined, destinoCiudad: undefined }));
    void cargarCiudadesDepto(depto);
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
      const tarifa = ruta.tipoTransporte === 'AEREO'
        ? calcularTarifaTerminalAereoRuta(
            ruta.destinoDepartamento,
            ruta.destinoCiudad,
            ruta.tipoTrayecto,
            undefined,
            ruta.destinoDepartamentoId,
          ).totalTramo
        : 0;
      onChange({ ...ruta, tarifaTerminalAereo: tarifa, guardada: true });
    }, 200);
  };

  const handleEdit = () => {
    setEditMode(true);
    setSaved(false);
    onChange({ ...ruta, guardada: false });
  };

  return (
    <div className="border border-slate-200/90 rounded-2xl bg-white shadow-sm transition-all hover:border-slate-300">
      {/* Cabecera del tramo */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 via-blue-50/20 to-white border-b border-slate-100 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#003DA5] text-white text-[10px] font-black shadow-xs">
            {index + 1}
          </span>
          <span className="text-sm font-black text-slate-900">Tramo {index + 1}</span>

          {ruta.origenCiudad || ruta.destinoCiudad ? (
            <span className="text-xs font-bold text-slate-800 bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-2xs">
              {ruta.origenCiudad || 'Origen'} → {ruta.destinoCiudad || 'Destino'}
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 italic">Ruta sin configurar</span>
          )}

          {ruta.fechaSalida && (
            <span className="text-[10px] text-slate-500 hidden sm:inline-block">
              📅 {ruta.fechaSalida} {ruta.fechaLlegada ? `al ${ruta.fechaLlegada}` : ''}
            </span>
          )}

          {saved && !editMode && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-600" /> Guardado
            </span>
          )}
          {editMode && (
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
              Editando
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Contenido expandido del tramo */}
      {expanded && (
        <div className="p-4 space-y-4">
          {editMode ? (
            <>
              {/* Bloque 1: Ubicación Origen y Destino */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Columna Origen */}
                <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 pb-1 border-b border-slate-200/60">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Punto de Origen</span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Departamento de Origen <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      options={deptOptions}
                      value={ruta.origenDepartamento}
                      onChange={handleOrigenDeptoChange}
                      placeholder="Seleccione departamento..."
                      emptyText="Sin departamentos"
                      error={errors.origenDepartamento}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Ciudad de Origen <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      options={ciudadOrigenOptions}
                      value={ruta.origenCiudad}
                      onChange={(v) => update('origenCiudad', v)}
                      placeholder={
                        !ruta.origenDepartamento
                          ? 'Primero seleccione departamento'
                          : cargandoOrigen && ciudadOrigenOptions.length === 0
                          ? 'Cargando ciudades...'
                          : 'Seleccione ciudad de origen...'
                      }
                      emptyText={
                        !ruta.origenDepartamento
                          ? 'Primero elija un departamento'
                          : cargandoOrigen && ciudadOrigenOptions.length === 0
                          ? 'Cargando ciudades...'
                          : 'No se encontraron ciudades'
                      }
                      disabled={!ruta.origenDepartamento}
                      loading={cargandoOrigen && ciudadOrigenOptions.length === 0}
                      error={errors.origenCiudad}
                    />
                  </div>
                </div>

                {/* Columna Destino */}
                <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 pb-1 border-b border-slate-200/60">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>Punto de Destino</span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Departamento de Destino <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      options={deptOptions}
                      value={ruta.destinoDepartamento}
                      onChange={handleDestinoDeptoChange}
                      placeholder="Seleccione departamento..."
                      emptyText="Sin departamentos"
                      error={errors.destinoDepartamento}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Ciudad de Destino <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      options={ciudadDestinoOptions}
                      value={ruta.destinoCiudad}
                      onChange={(v) => update('destinoCiudad', v)}
                      placeholder={
                        !ruta.destinoDepartamento
                          ? 'Primero seleccione departamento'
                          : cargandoDestino && ciudadDestinoOptions.length === 0
                          ? 'Cargando ciudades...'
                          : 'Seleccione ciudad de destino...'
                      }
                      emptyText={
                        !ruta.destinoDepartamento
                          ? 'Primero elija un departamento'
                          : cargandoDestino && ciudadDestinoOptions.length === 0
                          ? 'Cargando ciudades...'
                          : 'No se encontraron ciudades'
                      }
                      disabled={!ruta.destinoDepartamento}
                      loading={cargandoDestino && ciudadDestinoOptions.length === 0}
                      error={errors.destinoCiudad}
                    />
                  </div>
                </div>
              </div>

              {/* Bloque 2: Fechas y Tiempo de la Ruta */}
              <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-3">
                <p className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
                  Fechas y Tiempo de la Ruta
                </p>

                {/* Fila de Fechas con amplio espacio horizontal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#003DA5]" /> Fecha de Salida <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={ruta.fechaSalida ? String(ruta.fechaSalida).slice(0, 10) : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const nuevosDias = calcularDiasRuta(val, ruta.fechaLlegada);
                          onChange({
                            ...ruta,
                            fechaSalida: val,
                            ...(nuevosDias > 0 ? { diasRuta: nuevosDias } : {}),
                            guardada: false,
                          });
                          setSaved(false);
                          setErrors((prev) => ({ ...prev, fechaSalida: undefined, secuencia: undefined }));
                        }}
                        min={rutaAnterior?.fechaLlegada ? String(rutaAnterior.fechaLlegada).slice(0, 10) : (rutaAnterior?.fechaSalida ? String(rutaAnterior.fechaSalida).slice(0, 10) : undefined)}
                        className={`w-full px-4 py-2.5 border rounded-xl text-sm sm:text-base text-slate-800 bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-[#003DA5] ${errors.fechaSalida || errors.secuencia ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                      />
                    </div>
                    {ruta.fechaSalida && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-[#003DA5] bg-blue-50/80 border border-blue-200/80 px-2.5 py-1 rounded-lg">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Salida seleccionada: <strong className="text-slate-900">{ruta.fechaSalida}</strong></span>
                      </div>
                    )}
                    {errors.fechaSalida && <p className="text-[10px] text-red-600 font-semibold mt-1">{errors.fechaSalida}</p>}
                    {errors.secuencia && <p className="text-[10px] text-red-600 font-semibold mt-1">{errors.secuencia}</p>}
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#003DA5]" /> Fecha de Fin / Llegada <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={ruta.fechaLlegada ? String(ruta.fechaLlegada).slice(0, 10) : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const nuevosDias = calcularDiasRuta(ruta.fechaSalida, val);
                          onChange({
                            ...ruta,
                            fechaLlegada: val,
                            ...(nuevosDias > 0 ? { diasRuta: nuevosDias } : {}),
                            guardada: false,
                          });
                          setSaved(false);
                          setErrors((prev) => ({ ...prev, fechaLlegada: undefined }));
                        }}
                        min={ruta.fechaSalida ? String(ruta.fechaSalida).slice(0, 10) : undefined}
                        className={`w-full px-4 py-2.5 border rounded-xl text-sm sm:text-base text-slate-800 bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-[#003DA5] ${errors.fechaLlegada ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                      />
                    </div>
                    {ruta.fechaLlegada && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-[#003DA5] bg-blue-50/80 border border-blue-200/80 px-2.5 py-1 rounded-lg">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Llegada seleccionada: <strong className="text-slate-900">{ruta.fechaLlegada}</strong></span>
                      </div>
                    )}
                    {errors.fechaLlegada && <p className="text-[10px] text-red-600 font-semibold mt-1">{errors.fechaLlegada}</p>}
                  </div>
                </div>

                {/* Fila de Horarios Estimados (Salida y Llegada) y Días */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#003DA5]" /> Hora estimada salida <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="HH:mm"
                      maxLength={5}
                      pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
                      value={ruta.horaEstimadaSalida ? ruta.horaEstimadaSalida.slice(0, 5) : ''}
                      onChange={(e) => {
                        // Permitir solo dígitos y «:», y auto-insertar «:» tras los dos primeros dígitos
                        let val = e.target.value.replace(/[^0-9:]/g, '');
                        if (val.length === 2 && !val.includes(':') && e.nativeEvent instanceof InputEvent && e.nativeEvent.inputType !== 'deleteContentBackward') {
                          val = val + ':';
                        }
                        onChange({
                          ...ruta,
                          horaEstimadaSalida: val,
                          horarioEstimadoMilitar: val,
                          guardada: false,
                        });
                        setSaved(false);
                        setErrors((prev) => ({ ...prev, horaEstimadaSalida: undefined, horarioEstimadoMilitar: undefined }));
                      }}
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-sm sm:text-base text-slate-800 bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-[#003DA5] font-mono tracking-widest ${errors.horaEstimadaSalida ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                    />
                    {errors.horaEstimadaSalida ? (
                      <p className="text-[10px] text-red-600 font-semibold mt-1">{errors.horaEstimadaSalida}</p>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-1">Formato 24h militar — ej: 08:30, 14:00, 23:59</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#003DA5]" /> Hora estimada llegada <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="HH:mm"
                      maxLength={5}
                      pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
                      value={ruta.horaEstimadaLlegada ? ruta.horaEstimadaLlegada.slice(0, 5) : ''}
                      onChange={(e) => {
                        let val = e.target.value.replace(/[^0-9:]/g, '');
                        if (val.length === 2 && !val.includes(':') && e.nativeEvent instanceof InputEvent && e.nativeEvent.inputType !== 'deleteContentBackward') {
                          val = val + ':';
                        }
                        onChange({
                          ...ruta,
                          horaEstimadaLlegada: val,
                          guardada: false,
                        });
                        setSaved(false);
                        setErrors((prev) => ({ ...prev, horaEstimadaLlegada: undefined }));
                      }}
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-sm sm:text-base text-slate-800 bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-[#003DA5] font-mono tracking-widest ${errors.horaEstimadaLlegada ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                    />
                    {errors.horaEstimadaLlegada ? (
                      <p className="text-[10px] text-red-600 font-semibold mt-1">{errors.horaEstimadaLlegada}</p>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-1">Formato 24h militar — ej: 14:30, 18:00, 07:45</p>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                      Días calculados para este tramo
                    </label>
                    <div className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-700 bg-slate-100 flex items-center justify-between font-bold h-[44px]">
                      <span>{formatearDiasComision(diasCalculados > 0 ? diasCalculados : (ruta.diasRuta || 1))}</span>
                      <span className="text-[10px] text-[#003DA5] bg-blue-100/80 px-2 py-0.5 rounded font-black">
                        Automático
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloque 3: Modalidad de Transporte */}
              <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Tipo de Transporte para este Trayecto
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    (Cada tramo representa un trayecto directo)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  {TRANSPORTE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update('tipoTransporte', opt.value as any)}
                      className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold border text-center transition-all cursor-pointer ${
                        ruta.tipoTransporte === opt.value
                          ? 'bg-[#003DA5] text-white border-[#003DA5] shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tarifa automática de Transporte a Terminal Aérea */}
              {ruta.tipoTransporte === 'AEREO' && tarifaTerminalInfo && (
                <div className="p-3.5 bg-gradient-to-r from-blue-50/90 via-sky-50/40 to-slate-50 border border-blue-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-[#003DA5]">
                      <Plane className="w-4 h-4 text-[#003DA5]" />
                      <span>Transporte a Terminal Aérea: {tarifaTerminalInfo.ciudadAeropuerto}</span>
                    </div>
                    <span className="text-xs font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                      {formatearMoneda(tarifaTerminalInfo.totalTramo)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-600 pt-1 border-t border-blue-100">
                    <span>
                      Tarifa oficial por trayecto: <strong>{formatearMoneda(tarifaTerminalInfo.valorMaximoPorTrayecto)}</strong> ·{' '}
                      {tarifaTerminalInfo.factorTrayecto === 2 ? 'Ida y Vuelta (x2)' : 'Solo Ida (x1)'}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Asignada automáticamente
                    </span>
                  </div>
                </div>
              )}

              {/* Checkbox tiquete y acciones */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
                <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ruta.requiereTiquete || false}
                    onChange={(e) => update('requiereTiquete', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#003DA5] focus:ring-[#003DA5]"
                  />
                  <span>Este tramo requiere tiquete aéreo o pasaje</span>
                </label>

                <div className="flex items-center gap-2">
                  {canDelete && (
                    <button
                      type="button"
                      onClick={onDelete}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                      title="Eliminar este tramo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{saving ? 'Guardando...' : 'Guardar Tramo'}</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Modo Vista Resumida */
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Origen</span>
                  <span className="font-bold text-slate-800">{ruta.origenCiudad}</span>
                  <span className="text-[10px] text-slate-500 block truncate">{ruta.origenDepartamento}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Destino</span>
                  <span className="font-bold text-slate-800">{ruta.destinoCiudad}</span>
                  <span className="text-[10px] text-slate-500 block truncate">{ruta.destinoDepartamento}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Fechas</span>
                  <span className="font-bold text-slate-800 block">{ruta.fechaSalida} al {ruta.fechaLlegada}</span>
                  <span className="text-[10px] text-slate-500">{formatearDiasComision(ruta.diasRuta)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Horas Estimadas</span>
                  <span className="font-bold text-[#003DA5] block">
                    {formatearHorarioMilitar(ruta.horaEstimadaSalida || ruta.horarioEstimadoMilitar)}
                    {ruta.horaEstimadaLlegada ? ` → ${formatearHorarioMilitar(ruta.horaEstimadaLlegada)}` : ''}
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    {ruta.tipoTransporte === 'AEREO' ? '✈️ Aéreo' : '🚌 Terrestre'} · Trayecto directo
                  </span>
                  {ruta.tipoTransporte === 'AEREO' && tarifaTerminalInfo && (
                    <span className="inline-block mt-1 text-[10px] font-bold text-blue-900 bg-blue-100/80 px-1.5 py-0.5 rounded">
                      Terminal: {formatearMoneda(tarifaTerminalInfo.totalTramo)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                {canDelete && (
                  <button
                    type="button"
                    onClick={onDelete}
                    className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleEdit}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Modificar</span>
                </button>
              </div>
            </div>
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
}: Props) {
  // Caché de ciudades por departamento
  const [ciudadesPorDepto, setCiudadesPorDepto] = useState<Record<string, Geopolitica[]>>({});
  const [cargandoDepto, setCargandoDepto] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (itinerario.length === 0) {
      onChange([crearRutaVacia()]);
    }
  }, [itinerario.length, onChange]);

  const cargarCiudadesDepto = useCallback(
    async (nombreDepto: string) => {
      if (!nombreDepto?.trim()) return;
      const key = nombreDepto.trim();
      if (ciudadesPorDepto[key]?.length) return;

      // Poblar inmediatamente con las ciudades del catálogo local
      const ciudadesLocales = ciudadesDeDepartamento(key).map((c, idx) => ({
        idGeopolitica: idx + 1,
        nomDivGeopolitica: c,
        tipDivision: 'CIUDAD',
      } as Geopolitica));
      if (ciudadesLocales.length > 0) {
        setCiudadesPorDepto((prev) => ({ ...prev, [key]: ciudadesLocales }));
      }

      // Enriquecer con el backend si hay conectividad
      const depto = (departamentos || []).find(
        (d) => d.nomDivGeopolitica?.trim().toLowerCase() === key.toLowerCase(),
      );
      const codDepto = Number(depto?.codDepartamento ?? depto?.codGeopolitica ?? depto?.idGeopolitica);
      if (!codDepto) return;

      setCargandoDepto((prev) => ({ ...prev, [key]: true }));
      try {
        const data = await viaticosService.obtenerCiudadesPorDepartamento(codDepto);
        if (data && data.length > 0) {
          setCiudadesPorDepto((prev) => ({ ...prev, [key]: data }));
        }
      } catch (e) {
        console.warn('Error cargando ciudades para', key, e);
      } finally {
        setCargandoDepto((prev) => ({ ...prev, [key]: false }));
      }
    },
    [departamentos, ciudadesPorDepto],
  );

  const agregarRuta = useCallback(() => {
    const ultimaRuta = itinerario[itinerario.length - 1];
    const nuevaRuta = crearRutaVacia(
      ultimaRuta ? (ultimaRuta.destinoCiudad || '') : '',
      ultimaRuta ? (ultimaRuta.destinoDepartamento || '') : '',
      ultimaRuta ? (ultimaRuta.destinoDepartamentoId ?? null) : null,
    );
    // Pre-cargar ciudades del origen heredado
    if (ultimaRuta?.destinoDepartamento) {
      void cargarCiudadesDepto(ultimaRuta.destinoDepartamento);
    }
    onChange([...itinerario, nuevaRuta]);
  }, [itinerario, onChange, cargarCiudadesDepto]);

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
      if (itinerario.length <= 1) return;
      const filtrado = itinerario.filter((r) => r.id !== id);
      onChange(filtrado);
    },
    [itinerario, onChange],
  );

  const rutasGuardadas = useMemo(() => {
    return itinerario.filter(
      (r) =>
        r.guardada &&
        Boolean(r.fechaSalida && r.fechaLlegada && r.origenCiudad && r.destinoCiudad),
    );
  }, [itinerario]);

  const allSaved = itinerario.length > 0 && itinerario.every((r) => r.guardada);
  const sync = useMemo(() => sincronizarItinerarioFormulario(rutasGuardadas), [rutasGuardadas]);
  const validacionSecuencia = useMemo(() => validarSecuenciaItinerario(itinerario), [itinerario]);

  return (
    <div className="space-y-4">
      {/* Encabezado del builder */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#003DA5]/10 text-[#003DA5] flex items-center justify-center">
            <Route className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Itinerario de la Comisión (Multiruta)
            </h4>
            <p className="text-[11px] text-slate-500">
              Configure cada tramo de viaje. Las fechas y destinos consolidados se calculan automáticamente al guardar los tramos.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={agregarRuta}
          className="px-3.5 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Tramo</span>
        </button>
      </div>

      {/* Banner explicativo amigable de configuración por trayectos */}
      <div className="p-4 bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-indigo-50/60 border border-blue-200/80 rounded-2xl flex items-start gap-3.5 shadow-2xs">
        <div className="w-9 h-9 rounded-xl bg-[#003DA5] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
          <Route className="w-5 h-5" />
        </div>
        <div className="text-xs text-slate-700 space-y-1">
          <p className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
            <span>¿Cómo registrar su itinerario de viaje?</span>
          </p>
          <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
            Se debe registrar <strong>una ruta individual por cada trayecto</strong> de su desplazamiento.
            Por ejemplo, si su comisión es de <strong>ida y vuelta</strong>, agregue primero el trayecto de ida (ej: <em>Bogotá → Medellín</em>) y luego pulse <strong>"Agregar Tramo"</strong> para registrar la ruta de regreso (ej: <em>Medellín → Bogotá</em>) en orden cronológico. El sistema consolidará automáticamente los días, horas y tarifas correspondientes.
          </p>
        </div>
      </div>

      {/* ========== TARJETA DE RUTA GENERAL (CÁLCULO AUTOMÁTICO) ========== */}
      {itinerario.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-slate-50 border border-blue-200 rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black tracking-wider uppercase bg-[#003DA5] text-white px-2 py-0.5 rounded-md">
                Ruta General Calculada
              </span>
              <span className="text-xs font-black text-slate-800">
                {rutasGuardadas.length > 0
                  ? (sync.rutaGeneral || `${sync.origenCiudad || 'Origen'} → ${sync.destinoCiudad || 'Destino'}`)
                  : 'Pendiente de guardar tramos'}
              </span>
            </div>
            {rutasGuardadas.length > 0 && sync.horaEstimadaGeneral && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-900 bg-white border border-blue-200 px-2.5 py-1 rounded-lg shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-[#003DA5]" /> Tiempo estimado completo: <strong>{sync.horaEstimadaGeneral}</strong>
              </span>
            )}
          </div>

          {rutasGuardadas.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-blue-100 text-[11px]">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">Origen Inicial</span>
                  <span className="font-bold text-slate-800 truncate block">
                    {sync.origenCiudad || '—'} {sync.origenDepartamento ? `(${sync.origenDepartamento})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">Destino Final</span>
                  <span className="font-bold text-slate-800 truncate block">
                    {sync.destinoCiudad || '—'} {sync.destinoDepartamento ? `(${sync.destinoDepartamento})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">Fechas Generales</span>
                  <span className="font-bold text-slate-800 block">
                    {sync.fechaInicio} al {sync.fechaFin}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">Días Totales</span>
                  <span className="font-bold text-[#003DA5] block">
                    {formatearDiasComision(sync.diasComision)} ({sync.diasComision} d)
                  </span>
                </div>
              </div>
              {sync.transporteTerminalesAereos > 0 && (
                <div className="pt-2 border-t border-blue-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Plane className="w-3.5 h-3.5 text-[#003DA5]" />
                    Total Transporte a Terminales Aéreas (Itinerario):
                  </span>
                  <span className="font-black text-slate-900 bg-white border border-blue-200 px-2.5 py-1 rounded-lg">
                    {formatearMoneda(sync.transporteTerminalesAereos)}
                  </span>
                </div>
              )}
            </>
          ) : (
            <p className="text-[11px] text-slate-500 italic pt-1 border-t border-blue-100">
              ℹ️ Configure las fechas y ciudades del tramo y presione <strong>"Guardar Tramo"</strong> para consolidar y calcular la ruta general y los días de viáticos.
            </p>
          )}

          {!validacionSecuencia.valida && (
            <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[11px] font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{validacionSecuencia.error}</span>
            </div>
          )}
        </div>
      )}

      {/* Lista de tramos */}
      <div className="space-y-3.5">
        {itinerario.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
            <Route className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-500">
              No hay tramos registrados en el itinerario.
            </p>
            <p className="text-[11px] text-slate-400">
              Haga clic en "Agregar Tramo" para registrar el recorrido de la comisión.
            </p>
          </div>
        )}

        {itinerario.map((ruta, idx) => (
          <RutaForm
            key={ruta.id}
            ruta={ruta}
            index={idx}
            onChange={actualizarRuta}
            onDelete={() => eliminarRuta(ruta.id)}
            canDelete={itinerario.length > 1}
            departamentos={departamentos}
            itinerarioCompleto={itinerario}
            cargarCiudadesDepto={cargarCiudadesDepto}
            ciudadesPorDepto={ciudadesPorDepto}
            cargandoDepto={cargandoDepto}
          />
        ))}
      </div>

      {/* Pie con estado del itinerario */}
      {itinerario.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2 p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-[#003DA5]">
          <div className="flex items-center gap-1.5 font-semibold">
            <Clock className="w-4 h-4 text-[#003DA5] shrink-0" />
            <span>
              Total de tramos: {itinerario.length} · Tiempos estimados validados: {itinerario.filter((r) => esHorarioMilitarValido(r.horarioEstimadoMilitar)).length}/{itinerario.length}
            </span>
          </div>
          {allSaved && validacionSecuencia.valida && (
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-emerald-600" /> Todas las rutas completas y validadas
            </span>
          )}
        </div>
      )}
    </div>
  );
}