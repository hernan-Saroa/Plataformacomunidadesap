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
  Bus,
  Info,
  ArrowLeftRight,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { RutaItinerario, Geopolitica } from '../types/viaticos';
import {
  departamentosDisponibles,
  ciudadesDeDepartamento,
  calcularDiasRuta,
  esHorarioMilitarValido,
  formatearHorarioMilitar,
  formatearHorarioMilitarCon12h,
  formatearDiasComision,
  formatearMoneda,
  sincronizarItinerarioFormulario,
  validarSecuenciaItinerario,
  calcularTarifaTerminalAereoRuta,
} from '../utils/viaticosUtils';
import SearchableSelect, { SearchableSelectOption } from './SearchableSelect';
import viaticosService from '../services/api/viaticosService';

export const TRANSPORTE_OPTIONS = [
  { value: 'AEREO', label: 'Aéreo ✈️' },
  { value: 'TERRESTRE', label: 'Terrestre 🚌' },
  { value: 'MARITIMO', label: 'Marítimo 🚢' },
  { value: 'FLUVIAL', label: 'Fluvial 🚤' },
  { value: 'FERROVIARIO', label: 'Ferroviario 🚆' },
];

export function getLabelTransporte(tipo?: string): string {
  switch (tipo) {
    case 'AEREO':
      return '✈️ Aéreo';
    case 'TERRESTRE':
      return '🚌 Terrestre';
    case 'MARITIMO':
      return '🚢 Marítimo';
    case 'FLUVIAL':
      return '🚤 Fluvial';
    case 'FERROVIARIO':
      return '🚆 Ferroviario';
    default:
      return tipo ? `🚌 ${tipo}` : '🚌 Terrestre';
  }
}

/**
 * Franjas horarias para estructurar amigablemente el selector militar
 */
const FRANJAS_HORARIAS = [
  { grupo: '🌅 Mañana (06:00 – 11:45)', desde: 6, hasta: 11 },
  { grupo: '☀️ Tarde (12:00 – 17:45)', desde: 12, hasta: 17 },
  { grupo: '🌙 Noche (18:00 – 23:45)', desde: 18, hasta: 23 },
  { grupo: '🌌 Madrugada (00:00 – 05:45)', desde: 0, hasta: 5 },
];

function convertirA12h(hhmm: string): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim());
  if (!match) return hhmm;
  const h = parseInt(match[1], 10);
  const m = match[2];
  const h12 = h === 0 ? 12 : (h > 12 ? h - 12 : h);
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${String(h12).padStart(2, '0')}:${m} ${ampm}`;
}

/**
 * Calcula la duración estimada entre hora de salida y llegada en formato amigable
 */
export function calcularDuracionEstimada(horaSalida?: string, horaLlegada?: string): string | null {
  if (!horaSalida || !horaLlegada) return null;
  const matchSalida = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(horaSalida.trim());
  const matchLlegada = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(horaLlegada.trim());
  if (!matchSalida || !matchLlegada) return null;

  const mSalida = parseInt(matchSalida[1], 10) * 60 + parseInt(matchSalida[2], 10);
  const mLlegada = parseInt(matchLlegada[1], 10) * 60 + parseInt(matchLlegada[2], 10);

  let dif = mLlegada - mSalida;
  if (dif === 0) return 'Misma hora';
  if (dif < 0) {
    dif += 24 * 60; // cruce de medianoche o trayecto nocturno
  }
  const horas = Math.floor(dif / 60);
  const mins = dif % 60;
  if (horas === 0) return `${mins} min`;
  if (mins === 0) return `${horas} hora${horas > 1 ? 's' : ''}`;
  return `${horas}h ${mins}m`;
}

export interface FranjaHorariaOpciones {
  grupo: string;
  opciones: { valor: string; label: string }[];
}

/**
 * Mantenido para compatibilidad con módulos externos
 */
export function generarOpcionesHorarioMilitar(valorActual?: string): FranjaHorariaOpciones[] {
  const map: Record<string, { valor: string; label: string }[]> = {};
  FRANJAS_HORARIAS.forEach((f) => {
    map[f.grupo] = [];
  });

  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      const valor = `${hh}:${mm}`;
      const eq12 = convertirA12h(valor);
      const label = `${valor} h (${eq12})`;

      const franja = FRANJAS_HORARIAS.find((f) => h >= f.desde && h <= f.hasta) || FRANJAS_HORARIAS[0];
      map[franja.grupo].push({ valor, label });
    }
  }

  // Preservar valores existentes personalizados que no sean múltiplos de 15 min (ej: 08:05, 09:20)
  if (valorActual && esHorarioMilitarValido(valorActual)) {
    const hh = parseInt(valorActual.slice(0, 2), 10);
    const franja = FRANJAS_HORARIAS.find((f) => hh >= f.desde && hh <= f.hasta) || FRANJAS_HORARIAS[0];
    const yaExiste = map[franja.grupo].some((o) => o.valor === valorActual);
    if (!yaExiste) {
      const eq12 = convertirA12h(valorActual);
      map[franja.grupo].push({
        valor: valorActual,
        label: `${valorActual} h (${eq12}) — Personalizado`,
      });
      map[franja.grupo].sort((a, b) => a.valor.localeCompare(b.valor));
    }
  }

  return FRANJAS_HORARIAS.map((f) => ({
    grupo: f.grupo,
    opciones: map[f.grupo],
  }));
}

/**
 * Selector de Horario Militar Inteligente (24 Horas)
 * Permite escritura numérica directa (inputMode="numeric" con auto-formateo HH:mm),
 * ajuste rápido con botones stepper ▲/▼, chip de hora civil dinámico (Mañana, Tarde, Noche)
 * y select accesible sincronizado.
 */
export function SelectorHoraMilitar({
  ariaLabel,
  valor,
  onChange,
  error,
}: {
  ariaLabel: string;
  valor: string;
  onChange: (val: string) => void;
  error?: string;
}) {
  const valorLimpio = valor && esHorarioMilitarValido(valor) ? valor : '08:00';
  const [texto, setTexto] = useState(valorLimpio);

  // Mantener sincronizado el input con el prop externo
  useEffect(() => {
    if (valor && esHorarioMilitarValido(valor) && valor !== texto) {
      setTexto(valor);
    }
  }, [valor]);

  const [hh, mm] = (esHorarioMilitarValido(texto) ? texto : valorLimpio).split(':');
  const horaNum = parseInt(hh || '0', 10);
  const minNum = parseInt(mm || '0', 10);

  // Chip de momento del día dinámico
  const momento = useMemo(() => {
    const eq = convertirA12h(`${hh}:${mm}`);
    if (horaNum >= 5 && horaNum < 12) {
      return { icon: '🌅', label: `${eq} · Mañana`, estilo: 'bg-amber-50 text-amber-900 border-amber-200' };
    }
    if (horaNum >= 12 && horaNum < 18) {
      return { icon: '☀️', label: `${eq} · Tarde`, estilo: 'bg-blue-50 text-[#003DA5] border-blue-200' };
    }
    if (horaNum >= 18 && horaNum <= 23) {
      return { icon: '🌙', label: `${eq} · Noche`, estilo: 'bg-indigo-50 text-indigo-900 border-indigo-200' };
    }
    return { icon: '🌌', label: `${eq} · Madrugada`, estilo: 'bg-purple-50 text-purple-900 border-purple-200' };
  }, [hh, mm, horaNum]);

  // Manejo de escritura numérica directa con máscara inteligente
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^\d:]/g, '');

    // Auto-completar los dos puntos después de los dos primeros dígitos
    if (!raw.includes(':') && raw.length >= 3) {
      raw = `${raw.slice(0, 2)}:${raw.slice(2, 4)}`;
    }
    if (raw.length > 5) raw = raw.slice(0, 5);

    setTexto(raw);

    // Si ya completó un formato HH:mm válido, propagar cambio
    if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(raw)) {
      onChange(raw);
    }
  };

  const handleBlur = () => {
    if (!esHorarioMilitarValido(texto)) {
      const soloNum = texto.replace(/\D/g, '');
      if (soloNum.length === 1 || soloNum.length === 2) {
        const h = Math.min(23, parseInt(soloNum, 10));
        const val = `${String(h).padStart(2, '0')}:00`;
        setTexto(val);
        onChange(val);
      } else if (soloNum.length === 3 || soloNum.length === 4) {
        const h = Math.min(23, parseInt(soloNum.slice(0, 2), 10));
        const m = Math.min(59, parseInt(soloNum.slice(2, 4).padEnd(2, '0'), 10));
        const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        setTexto(val);
        onChange(val);
      } else {
        setTexto(valorLimpio);
      }
    }
  };

  // Steppers para ajustar horas o minutos con un toque
  const stepHora = (delta: number) => {
    const nuevaHora = (horaNum + delta + 24) % 24;
    const nuevoVal = `${String(nuevaHora).padStart(2, '0')}:${mm}`;
    setTexto(nuevoVal);
    onChange(nuevoVal);
  };

  const stepMinuto = (delta: number) => {
    let nuevoMin = minNum + delta;
    let nuevaHora = horaNum;
    if (nuevoMin >= 60) {
      nuevoMin = 0;
      nuevaHora = (nuevaHora + 1) % 24;
    } else if (nuevoMin < 0) {
      nuevoMin = 45;
      nuevaHora = (nuevaHora - 1 + 24) % 24;
    }
    const nuevoVal = `${String(nuevaHora).padStart(2, '0')}:${String(nuevoMin).padStart(2, '0')}`;
    setTexto(nuevoVal);
    onChange(nuevoVal);
  };

  // Opciones completas sincronizadas para accesibilidad y tests
  const todasLasOpciones: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      todasLasOpciones.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  if (!todasLasOpciones.includes(valorLimpio)) {
    todasLasOpciones.push(valorLimpio);
    todasLasOpciones.sort();
  }

  return (
    <div className="space-y-1.5">
      <div
        className={`relative flex items-center justify-between p-2.5 bg-gradient-to-r from-slate-50/90 via-white to-blue-50/30 border rounded-2xl shadow-2xs transition-all ${
          error
            ? 'border-red-300 ring-2 ring-red-100 bg-red-50/20'
            : 'border-slate-200/90 focus-within:border-[#003DA5] focus-within:ring-2 focus-within:ring-blue-100 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {/* Icono de Reloj con micro-gradiente */}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#003DA5] to-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Clock className="w-4 h-4" />
          </div>

          {/* Campo Numérico Inteligente */}
          <div className="flex items-center bg-white border border-slate-200/90 rounded-xl px-2 py-0.5 shadow-2xs focus-within:border-[#003DA5] focus-within:ring-1 focus-within:ring-[#003DA5]">
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={texto}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder="00:00"
              className="w-16 font-mono font-black text-slate-900 text-base sm:text-lg tracking-wider text-center bg-transparent focus:outline-none"
              title="Puede digitar o escribir la hora militar (ej: 08:30) o usar las flechas seleccionadoras"
            />
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider pr-1">h</span>

            {/* Steppers ▲ / ▼ para horas */}
            <div className="flex flex-col border-l border-slate-200 pl-1.5 py-0.5">
              <button
                type="button"
                onClick={() => stepHora(1)}
                className="text-slate-400 hover:text-[#003DA5] hover:bg-blue-50 rounded px-1 text-[9px] font-black transition-colors leading-none py-0.5 cursor-pointer"
                title="Avanzar 1 hora (▲)"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => stepHora(-1)}
                className="text-slate-400 hover:text-[#003DA5] hover:bg-blue-50 rounded px-1 text-[9px] font-black transition-colors leading-none py-0.5 cursor-pointer"
                title="Retroceder 1 hora (▼)"
              >
                ▼
              </button>
            </div>

            {/* Steppers :15 min */}
            <div className="flex flex-col border-l border-slate-100 pl-1 py-0.5">
              <button
                type="button"
                onClick={() => stepMinuto(15)}
                className="text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded px-1 text-[8px] font-black transition-colors leading-none py-0.5 cursor-pointer"
                title="Avanzar 15 minutos (+15)"
              >
                +15
              </button>
              <button
                type="button"
                onClick={() => stepMinuto(-15)}
                className="text-slate-400 hover:text-red-700 hover:bg-red-50 rounded px-1 text-[8px] font-black transition-colors leading-none py-0.5 cursor-pointer"
                title="Retroceder 15 minutos (-15)"
              >
                -15
              </button>
            </div>
          </div>
        </div>

        {/* Chip Dinámico con Icono de Momento y Hora Civil */}
        <div className="flex items-center pl-2">
          <span
            className={`text-[11px] font-extrabold px-2.5 py-1 rounded-xl border flex items-center gap-1.5 shadow-2xs whitespace-nowrap ${momento.estilo}`}
          >
            <span>{momento.icon}</span>
            <span>{momento.label}</span>
          </span>
        </div>

        {/* Select accesible oculto sincronizado con todos los valores para tests y automatización */}
        <select
          aria-label={ariaLabel}
          value={valorLimpio}
          onChange={(e) => {
            setTexto(e.target.value);
            onChange(e.target.value);
          }}
          className="sr-only"
          tabIndex={-1}
        >
          {todasLasOpciones.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="text-[10px] text-red-600 font-semibold mt-0.5">{error}</p>
      ) : (
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium px-1">
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Puede digitar o escribir la hora directamente o usar las flechas seleccionadoras (▲▼ / ±15)
          </span>
          <span className="text-slate-400">24 horas</span>
        </div>
      )}
    </div>
  );
}

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
    tipoTransporte: 'TERRESTRE',
    valorTransporte: 0,
    montoTransporteTerrestre: 0,
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

    const hViaje = ruta.horaEstimadaSalida || ruta.horarioEstimadoMilitar;
    if (!hViaje) newErrors.horaEstimadaSalida = 'Digite o seleccione la hora estimada del viaje en formato militar';
    else if (!esHorarioMilitarValido(hViaje)) newErrors.horaEstimadaSalida = 'Formato militar HH:mm inválido (ej: 08:00)';

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
        newErrors.horarioEstimadoMilitar = `Para la misma fecha, la hora estimada (${ruta.horarioEstimadoMilitar}) no puede ser anterior a ${rutaAnterior.horarioEstimadoMilitar}`;
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
    if (campo === 'tipoTransporte') {
      if (valor === 'AEREO') {
        nuevaRuta.valorTransporte = 0;
        nuevaRuta.montoTransporteTerrestre = 0;
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
    } else if (campo === 'valorTransporte' || campo === 'montoTransporteTerrestre') {
      const num = Number(valor) || 0;
      nuevaRuta.valorTransporte = num;
      nuevaRuta.montoTransporteTerrestre = num;
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

  const intercambiarOrigenDestino = () => {
    const origCiudad = ruta.origenCiudad;
    const origDepto = ruta.origenDepartamento;
    const origDeptoId = ruta.origenDepartamentoId;

    const destCiudad = ruta.destinoCiudad;
    const destDepto = ruta.destinoDepartamento;
    const destDeptoId = ruta.destinoDepartamentoId;

    const tarifa = ruta.tipoTransporte === 'AEREO'
      ? calcularTarifaTerminalAereoRuta(origDepto || '', origCiudad || '', ruta.tipoTrayecto, undefined, origDeptoId).totalTramo
      : 0;

    onChange({
      ...ruta,
      origenCiudad: destCiudad,
      origenDepartamento: destDepto,
      origenDepartamentoId: destDeptoId,
      destinoCiudad: origCiudad,
      destinoDepartamento: origDepto,
      destinoDepartamentoId: origDeptoId,
      tarifaTerminalAereo: tarifa,
      guardada: false,
    });
    setSaved(false);
    if (destDepto) void cargarCiudadesDepto(destDepto);
    if (origDepto) void cargarCiudadesDepto(origDepto);
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
      const costoTransporte = ruta.tipoTransporte !== 'AEREO'
        ? Number(ruta.valorTransporte ?? ruta.montoTransporteTerrestre ?? 0)
        : 0;
      onChange({
        ...ruta,
        tarifaTerminalAereo: tarifa,
        valorTransporte: costoTransporte,
        montoTransporteTerrestre: costoTransporte,
        guardada: true,
      });
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
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#003DA5]" />
                    Trayecto del Tramo {index + 1}
                  </span>
                  {itinerarioCompleto.length === 1 && (ruta.origenCiudad || ruta.destinoCiudad) && (
                    <button
                      type="button"
                      onClick={intercambiarOrigenDestino}
                      className="px-2.5 py-1 text-xs font-bold text-[#003DA5] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      title="Invertir origen y destino de este tramo"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>Invertir ruta (⇄ Swap)</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Columna Origen */}
                  <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 pb-1 border-b border-slate-200/60">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Punto de Origen</span>
                    </div>

                  <div>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Departamento de Origen <span className="text-red-500">*</span>
                    </span>
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
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Ciudad de Origen <span className="text-red-500">*</span>
                    </span>
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
                    <label
                      htmlFor="destinoDepartamento"
                      className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5"
                    >
                      Departamento de Destino <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      id="destinoDepartamento"
                      options={deptOptions}
                      value={ruta.destinoDepartamento}
                      onChange={handleDestinoDeptoChange}
                      placeholder="Seleccione departamento..."
                      emptyText="Sin departamentos"
                      error={errors.destinoDepartamento}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="destinoCiudad"
                      className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5"
                    >
                      Ciudad de Destino <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      id="destinoCiudad"
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
            </div>

            {/* Bloque 2: Fechas y Horario Militar de la Ruta */}
              <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#003DA5]" />
                    <span className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
                      Fechas y Horario Militar de la Ruta
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                    Formato GF-FO-023
                  </span>
                </div>

                {/* Subsección 1: Fechas de Desplazamiento */}
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
                          // Auto-sugerir misma fecha para llegada si está vacía o es menor
                          const nuevaFechaLlegada = (!ruta.fechaLlegada || ruta.fechaLlegada < val) ? val : ruta.fechaLlegada;
                          const nuevosDias = calcularDiasRuta(val, nuevaFechaLlegada);
                          onChange({
                            ...ruta,
                            fechaSalida: val,
                            fechaLlegada: nuevaFechaLlegada,
                            ...(nuevosDias > 0 ? { diasRuta: nuevosDias } : {}),
                            guardada: false,
                          });
                          setSaved(false);
                          setErrors((prev) => ({ ...prev, fechaSalida: undefined, fechaLlegada: undefined, secuencia: undefined }));
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

                {/* Aviso Destacado de Horario Militar y Selector Único de Hora Estimada del Viaje */}
                <div className="flex items-center gap-2.5 px-3 py-2 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-slate-700 shadow-2xs">
                  <Clock className="w-4 h-4 text-[#003DA5] shrink-0" />
                  <span className="leading-snug text-[11px] sm:text-xs">
                    <strong className="text-slate-900">Aviso: Horario de Rutas en Formato Militar (24 Horas)</strong> · Registro exclusivo de hora (no sugiere ni admite fechas). Puede digitar o escribir la hora del viaje directamente o usar las flechas seleccionadoras.
                  </span>
                </div>

                {/* Subsección 2: Selector Único de Hora Estimada del Viaje */}
                <div className="pt-1">
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                      <Clock className="w-3.5 h-3.5 text-[#003DA5]" /> Hora estimada del viaje <span className="text-red-500">*</span>
                    </label>
                    <p className="text-[11px] text-slate-500 mb-2 leading-snug">
                      ℹ️ Puede <strong>digitar o escribir</strong> directamente la hora en formato militar (ej: <span className="font-mono font-semibold text-slate-800">08:00</span> o <span className="font-mono font-semibold text-slate-800">14:30</span>) o usar las <strong>flechas seleccionadoras</strong> (▲/▼ para horas y +15/-15 para minutos).
                    </p>
                    <div className="max-w-md">
                      <SelectorHoraMilitar
                        ariaLabel="Hora estimada del viaje"
                        valor={ruta.horaEstimadaSalida || ruta.horarioEstimadoMilitar || '08:00'}
                        onChange={(val) => {
                          onChange({
                            ...ruta,
                            horaEstimadaSalida: val,
                            horarioEstimadoMilitar: val,
                            guardada: false,
                          });
                          setSaved(false);
                          setErrors((prev) => ({ ...prev, horaEstimadaSalida: undefined, horarioEstimadoMilitar: undefined }));
                        }}
                        error={errors.horaEstimadaSalida}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloque 3: Modalidad de Transporte */}
              <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Tipo de Transporte para este Trayecto
                  </label>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {TRANSPORTE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update('tipoTransporte', opt.value as any)}
                      className={`py-2 px-2.5 rounded-xl text-xs sm:text-sm font-bold border text-center transition-all cursor-pointer ${
                        ruta.tipoTransporte === opt.value
                          ? 'bg-[#003DA5] text-white border-[#003DA5] shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Campo Transporte terrestre / fluvial / ferroviario / otros cuando no es aéreo */}
                {ruta.tipoTransporte !== 'AEREO' && (
                  <div className="pt-3 border-t border-slate-200/70">
                    <div className="p-3 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-200/80 rounded-xl space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <label
                            htmlFor={`costo-transporte-${index}`}
                            className="text-xs font-bold text-slate-800 block"
                          >
                            Transporte terrestre / fluvial / ferroviario / otros
                          </label>
                          <p className="text-[11px] text-slate-500">
                            Ingrese el costo de transporte adicional
                          </p>
                        </div>
                        <div className="relative w-full sm:w-48">
                          <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">$</span>
                          <input
                            id={`costo-transporte-${index}`}
                            aria-label="Costo de transporte adicional"
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={formatearMoneda(ruta.valorTransporte ?? ruta.montoTransporteTerrestre ?? 0)}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, '');
                              const val = raw ? parseInt(raw, 10) : 0;
                              update('valorTransporte', val);
                            }}
                            className="w-full pl-7 pr-3 py-2 text-right font-bold text-slate-800 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003DA5] shadow-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
                      Valor a reconocer máximo por trayecto: <strong>{formatearMoneda(tarifaTerminalInfo.valorMaximoPorTrayecto)}</strong> ·{' '}
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
                    className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50 ${
                      ruta.origenCiudad && ruta.destinoCiudad && ruta.fechaSalida && ruta.fechaLlegada
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-200'
                        : 'bg-[#003DA5] hover:bg-[#002b75] text-white'
                    }`}
                  >
                    {saving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {saving
                        ? 'Guardando...'
                        : ruta.origenCiudad && ruta.destinoCiudad && ruta.fechaSalida && ruta.fechaLlegada
                        ? '✓ Listo para Guardar Tramo'
                        : 'Guardar Tramo'}
                    </span>
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
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Fechas de Desplazamiento</span>
                  <span className="font-bold text-slate-800 block">{ruta.fechaSalida} al {ruta.fechaLlegada}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Hora Estimada del Viaje</span>
                  <span className="font-bold text-[#003DA5] block">
                    {formatearHorarioMilitar(ruta.horaEstimadaSalida || ruta.horarioEstimadoMilitar)}
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    {getLabelTransporte(ruta.tipoTransporte)}
                  </span>
                  {ruta.tipoTransporte === 'AEREO' && tarifaTerminalInfo && (
                    <span className="inline-block mt-1 text-[10px] font-bold text-blue-900 bg-blue-100/80 px-1.5 py-0.5 rounded">
                      Terminal: {formatearMoneda(tarifaTerminalInfo.totalTramo)}
                    </span>
                  )}
                  {ruta.tipoTransporte !== 'AEREO' && Number(ruta.valorTransporte ?? ruta.montoTransporteTerrestre ?? 0) > 0 && (
                    <span className="inline-block mt-1 text-[10px] font-bold text-emerald-900 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                      Transporte: {formatearMoneda(Number(ruta.valorTransporte ?? ruta.montoTransporteTerrestre ?? 0))}
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

  const agregarTramoRegreso = useCallback(() => {
    const primerTramo = itinerario[0];
    const ultimoTramo = itinerario[itinerario.length - 1];
    if (!primerTramo || !ultimoTramo?.destinoCiudad) return;

    const ciudadSalidaRegreso = ultimoTramo.destinoCiudad;
    const deptoSalidaRegreso = ultimoTramo.destinoDepartamento;
    const deptoIdSalidaRegreso = ultimoTramo.destinoDepartamentoId ?? null;

    const ciudadDestinoRegreso = primerTramo.origenCiudad || '';
    const deptoDestinoRegreso = primerTramo.origenDepartamento || '';
    const deptoIdDestinoRegreso = primerTramo.origenDepartamentoId ?? null;

    const fechaSalidaRegreso = ultimoTramo.fechaLlegada || ultimoTramo.fechaSalida || '';

    const tarifa = ultimoTramo.tipoTransporte === 'AEREO'
      ? calcularTarifaTerminalAereoRuta(deptoDestinoRegreso, ciudadDestinoRegreso, 'SOLO_IDA', undefined, deptoIdDestinoRegreso).totalTramo
      : 0;

    const nuevoTramo: RutaItinerario = {
      id: generarId(),
      origenCiudad: ciudadSalidaRegreso,
      origenDepartamento: deptoSalidaRegreso,
      origenDepartamentoId: deptoIdSalidaRegreso,
      destinoCiudad: ciudadDestinoRegreso,
      destinoDepartamento: deptoDestinoRegreso,
      destinoDepartamentoId: deptoIdDestinoRegreso,
      tipoTrayecto: 'SOLO_IDA',
      fechaSalida: fechaSalidaRegreso,
      fechaLlegada: fechaSalidaRegreso,
      diasRuta: 1,
      horarioEstimadoMilitar: '14:00',
      horaEstimadaSalida: '14:00',
      tipoTransporte: ultimoTramo.tipoTransporte || 'TERRESTRE',
      valorTransporte: ultimoTramo.valorTransporte || 0,
      montoTransporteTerrestre: ultimoTramo.montoTransporteTerrestre || 0,
      tarifaTerminalAereo: tarifa,
      requiereTiquete: ultimoTramo.requiereTiquete || false,
      guardada: false,
    };

    if (deptoSalidaRegreso) void cargarCiudadesDepto(deptoSalidaRegreso);
    if (deptoDestinoRegreso) void cargarCiudadesDepto(deptoDestinoRegreso);

    onChange([...itinerario, nuevoTramo]);
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

        <div className="flex items-center gap-2 flex-wrap">
          {itinerario.length === 1 && Boolean(itinerario[0]?.destinoCiudad) && (
            <button
              type="button"
              onClick={agregarTramoRegreso}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title="Crea automáticamente el tramo de retorno invirtiendo origen y destino"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>+ Tramo de Regreso</span>
            </button>
          )}

          <button
            type="button"
            onClick={agregarRuta}
            className="px-3.5 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Tramo</span>
          </button>
        </div>
      </div>

      {/* ========== TIMELINE VISUAL DE LA RUTA ========== */}
      {itinerario.some((r) => r.origenCiudad || r.destinoCiudad) && (
        <div className="my-3 p-4 sm:p-5 bg-gradient-to-r from-slate-50/90 via-white to-blue-50/30 border border-slate-200/90 rounded-2xl shadow-xs overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center gap-3 sm:gap-4 min-w-max py-1 px-1 pr-8">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1.5 shrink-0">
              <Route className="w-3.5 h-3.5 text-[#003DA5]" />
              Recorrido:
            </span>
            {itinerario.map((r, i) => {
              const iconTransporte =
                r.tipoTransporte === 'AEREO'
                  ? '✈️'
                  : r.tipoTransporte === 'MARITIMO'
                  ? '🚢'
                  : r.tipoTransporte === 'FLUVIAL'
                  ? '🚤'
                  : r.tipoTransporte === 'FERROVIARIO'
                  ? '🚆'
                  : '🚌';
              return (
                <div key={r.id} className="flex items-center gap-2 shrink-0">
                  {i === 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/90 border border-blue-200 text-blue-950 font-bold text-xs shadow-2xs">
                      <MapPin className="w-3.5 h-3.5 text-[#003DA5]" />
                      <span>{r.origenCiudad || 'Origen'}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1 px-1">
                    <span className="text-xs text-slate-300 font-bold">───</span>
                    <span
                      className="p-1 rounded-lg bg-white border border-slate-200 text-xs shadow-2xs"
                      title={r.tipoTransporte ? `Transporte: ${r.tipoTransporte}` : 'Transporte: Terrestre'}
                    >
                      {iconTransporte}
                    </span>
                    <span className="text-xs text-slate-300 font-bold">──▶</span>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 text-slate-900 font-bold text-xs shadow-2xs hover:border-slate-300 transition-colors">
                    <MapPin className="w-3.5 h-3.5 text-slate-600" />
                    <span>{r.destinoCiudad || 'Destino'}</span>
                    {r.fechaSalida && (
                      <span className="text-[10px] text-slate-500 font-medium ml-1 bg-slate-100 px-1.5 py-0.5 rounded-md">
                        {r.fechaSalida}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          </div>

          {rutasGuardadas.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-blue-100 text-[11px]">
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
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">Fechas de la Comisión</span>
                  <span className="font-bold text-slate-800 block">
                    {sync.fechaInicio} al {sync.fechaFin}
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
              {sync.transporteTerrestreOtros > 0 && (
                <div className="pt-2 border-t border-blue-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Bus className="w-3.5 h-3.5 text-[#003DA5]" />
                    Total Transporte Terrestre / Fluvial / Ferroviario / Otros:
                  </span>
                  <span className="font-black text-slate-900 bg-white border border-blue-200 px-2.5 py-1 rounded-lg">
                    {formatearMoneda(sync.transporteTerrestreOtros)}
                  </span>
                </div>
              )}
              {sync.transporteTerminalesAereos > 0 && sync.transporteTerrestreOtros > 0 && (
                <div className="pt-2 border-t border-blue-100 flex items-center justify-between flex-wrap gap-2 text-xs bg-blue-100/40 p-2 rounded-xl">
                  <span className="text-[11px] font-black text-blue-950 uppercase tracking-wide">
                    Total Gastos de Desplazamiento (Itinerario):
                  </span>
                  <span className="font-black text-[#003DA5] text-sm">
                    {formatearMoneda(sync.totalGastosDesplazamiento)}
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