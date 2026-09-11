import React, { useEffect, useState } from 'react';
import {
  X,
  Send,
  MapPin,
  Building2,
  Layers,
  Wrench,
  FileText,
  User,
  AlertCircle,
  CheckCircle2,
  ImagePlus,
} from 'lucide-react';
import {
  infraestructuraService,
  Sede,
  SolicitudMantenimiento,
  CreateMantenimientoPayload,
} from '../services/infraestructuraService';

interface NuevaSolicitudFormProps {
  onClose: () => void;
  onExito: (solicitud: SolicitudMantenimiento) => void;
}

const TIPOS_MANTENIMIENTO = [
  { valor: 'PREVENTIVO', etiqueta: 'Preventivo' },
  { valor: 'CORRECTIVO', etiqueta: 'Correctivo' },
  { valor: 'LOCATIVO', etiqueta: 'Locativo' },
  { valor: 'URGENCIA', etiqueta: 'Urgencia' },
];

const PRIORIDADES = [
  { valor: 'BAJA', etiqueta: 'Baja' },
  { valor: 'MEDIA', etiqueta: 'Media' },
  { valor: 'ALTA', etiqueta: 'Alta' },
  { valor: 'URGENTE', etiqueta: 'Urgente' },
];

export const NuevaSolicitudForm: React.FC<NuevaSolicitudFormProps> = ({ onClose, onExito }) => {
  const [sedesAlcance, setSedesAlcance] = useState<Sede[]>([]);
  const [cargandoSedes, setCargandoSedes] = useState<boolean>(true);

  const [idSede, setIdSede] = useState<string>('');
  const [nombreAreaSolicitante, setNombreAreaSolicitante] = useState<string>('');
  const [piso, setPiso] = useState<string>('');
  const [salon, setSalon] = useState<string>('');
  const [ubicacionDetalle, setUbicacionDetalle] = useState<string>('');
  const [tipoMantenimiento, setTipoMantenimiento] = useState<string>('CORRECTIVO');
  const [prioridad, setPrioridad] = useState<string>('MEDIA');
  const [descripcion, setDescripcion] = useState<string>('');
  const [evidenciaInicialUrl, setEvidenciaInicialUrl] = useState<string>('');

  const [enviando, setEnviando] = useState<boolean>(false);
  const [errorMensaje, setErrorMensaje] = useState<string>('');
  const [errores, setErrores] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        setCargandoSedes(true);
        const listado = await infraestructuraService.getSedesAlcanceUMI();
        setSedesAlcance(listado);
        if (listado.length === 1) {
          setIdSede(listado[0].idSede);
        }
      } catch (err) {
        console.error('No se pudieron cargar las sedes de alcance UMI', err);
      } finally {
        setCargandoSedes(false);
      }
    })();
  }, []);

  const validar = (): boolean => {
    const nuevosErrores: Record<string, string> = {};
    if (!idSede) nuevosErrores.idSede = 'Seleccione la sede';
    if (!nombreAreaSolicitante.trim() || nombreAreaSolicitante.trim().length < 3) {
      nuevosErrores.nombreAreaSolicitante = 'Ingrese el nombre del área solicitante (mínimo 3 caracteres)';
    }
    if (!piso.trim()) nuevosErrores.piso = 'Ingrese el piso';
    if (!salon.trim()) nuevosErrores.salon = 'Ingrese el salón, oficina o ubicación';
    if (!tipoMantenimiento) nuevosErrores.tipoMantenimiento = 'Seleccione un tipo de mantenimiento';
    if (!descripcion.trim() || descripcion.trim().length < 10) {
      nuevosErrores.descripcion = 'Describa la solicitud con al menos 10 caracteres';
    }
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMensaje('');
    if (!validar()) return;
    setEnviando(true);
    try {
      const payload: CreateMantenimientoPayload = {
        idSede,
        nombreAreaSolicitante: nombreAreaSolicitante.trim(),
        piso: piso.trim(),
        salon: salon.trim(),
        ubicacionDetalle: ubicacionDetalle.trim() || undefined,
        tipoMantenimiento,
        prioridad,
        descripcion: descripcion.trim(),
        evidenciaInicialUrl: evidenciaInicialUrl.trim() || undefined,
      };
      const resultado = await infraestructuraService.createMantenimiento(payload);
      onExito(resultado);
    } catch (err: any) {
      setErrorMensaje(err?.message || 'No se pudo radicar la solicitud. Intente nuevamente.');
    } finally {
      setEnviando(false);
    }
  };

  const inputClase = (campo: string) =>
    `w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:ring-2 ${
      errores[campo]
        ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-500'
        : 'border-slate-200 focus:ring-amber-200 focus:border-amber-500'
    }`;

  const labelClase = 'block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 sm:p-6">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-white">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Radicar Solicitud de Mantenimiento
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Gestión de Infraestructura UMI — Sede Central y Sedes Alternas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={manejarEnvio} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {errorMensaje && (
              <div className="flex items-start gap-3 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold mb-0.5">No se pudo radicar la solicitud</p>
                  <p>{errorMensaje}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClase}>
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    Sede
                  </span>
                  <span className="text-rose-500 ml-1">*</span>
                </label>
                <select
                  value={idSede}
                  onChange={(e) => setIdSede(e.target.value)}
                  disabled={cargandoSedes}
                  className={inputClase('idSede')}
                >
                  <option value="">{cargandoSedes ? 'Cargando sedes...' : 'Seleccione una sede'}</option>
                  {sedesAlcance.map((s) => (
                    <option key={s.idSede} value={s.idSede}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
                {errores.idSede && <p className="mt-1 text-xs text-rose-600 font-medium">{errores.idSede}</p>}
              </div>

              <div>
                <label className={labelClase}>
                  <span className="inline-flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Área solicitante
                  </span>
                  <span className="text-rose-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={nombreAreaSolicitante}
                  onChange={(e) => setNombreAreaSolicitante(e.target.value)}
                  placeholder="Ej: Dirección Académica, Vicerrectoría, Coordinación de Posgrados..."
                  className={inputClase('nombreAreaSolicitante')}
                />
                {errores.nombreAreaSolicitante && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errores.nombreAreaSolicitante}</p>
                )}
              </div>

              <div>
                <label className={labelClase}>
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    Piso / Nivel
                  </span>
                  <span className="text-rose-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={piso}
                  onChange={(e) => setPiso(e.target.value)}
                  placeholder="Ej: 1, 2, 3, 5, PB, Mezzanine"
                  className={inputClase('piso')}
                />
                {errores.piso && <p className="mt-1 text-xs text-rose-600 font-medium">{errores.piso}</p>}
              </div>

              <div>
                <label className={labelClase}>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Salón / Oficina
                  </span>
                  <span className="text-rose-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={salon}
                  onChange={(e) => setSalon(e.target.value)}
                  placeholder="Ej: Aula 204, Oficina 301, Auditorio Principal"
                  className={inputClase('salon')}
                />
                {errores.salon && <p className="mt-1 text-xs text-rose-600 font-medium">{errores.salon}</p>}
              </div>

              <div>
                <label className={labelClase}>
                  <span className="inline-flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-slate-400" />
                    Tipo de mantenimiento
                  </span>
                  <span className="text-rose-500 ml-1">*</span>
                </label>
                <select
                  value={tipoMantenimiento}
                  onChange={(e) => setTipoMantenimiento(e.target.value)}
                  className={inputClase('tipoMantenimiento')}
                >
                  {TIPOS_MANTENIMIENTO.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClase}>
                  <span className="inline-flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                    Prioridad
                  </span>
                </label>
                <select
                  value={prioridad}
                  onChange={(e) => setPrioridad(e.target.value)}
                  className={inputClase('prioridad')}
                >
                  {PRIORIDADES.map((p) => (
                    <option key={p.valor} value={p.valor}>
                      {p.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className={labelClase}>
                  Detalle adicional de ubicación
                  <span className="text-slate-400 font-normal ml-2">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={ubicacionDetalle}
                  onChange={(e) => setUbicacionDetalle(e.target.value)}
                  placeholder="Ej: Frente al ascensor, Edificio A, al lado de la biblioteca..."
                  className={inputClase('ubicacionDetalle')}
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClase}>
                  Descripción de la solicitud
                  <span className="text-rose-500 ml-1">*</span>
                </label>
                <textarea
                  rows={5}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Describa detalladamente la novedad: síntoma, momento en que se detectó, personas afectadas, intentos de solución, etc."
                  className={`${inputClase('descripcion')} resize-none leading-relaxed`}
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-slate-400">Mínimo 10 caracteres</p>
                  {errores.descripcion ? (
                    <p className="text-xs text-rose-600 font-medium">{errores.descripcion}</p>
                  ) : (
                    <p className="text-xs text-slate-400">{descripcion.length} caracteres</p>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className={labelClase}>
                  <span className="inline-flex items-center gap-1.5">
                    <ImagePlus className="w-3.5 h-3.5 text-slate-400" />
                    Evidencia inicial
                  </span>
                  <span className="text-slate-400 font-normal ml-2">(opcional, ST-09: adjuntar archivos vendrá luego)</span>
                </label>
                <input
                  type="text"
                  value={evidenciaInicialUrl}
                  onChange={(e) => setEvidenciaInicialUrl(e.target.value)}
                  placeholder="Puede pegar aquí una URL de referencia o evidencia (screenshot, documento, etc.)"
                  className={inputClase('evidenciaInicialUrl')}
                />
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900 space-y-1">
                <p className="font-bold">Antes de radicar</p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                  <li>El consecutivo, fecha y hora de radicación se generan automáticamente en el servidor.</li>
                  <li>Su solicitud quedará en estado <strong>RECIBIDA</strong> y será analizada por el equipo UMI.</li>
                  <li>Podrá consultar el estado en la sección <strong>Mis Solicitudes</strong>.</li>
                </ul>
              </div>
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100 bg-slate-50/60">
          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando}
            onClick={manejarEnvio}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-sm shadow-amber-500/20 transition-all active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
          >
            {enviando ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                Radicando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Radicar solicitud
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
