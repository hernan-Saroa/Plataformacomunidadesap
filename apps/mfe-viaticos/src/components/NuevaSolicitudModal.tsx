import { FormEvent, useEffect, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plane,
  Search,
  Send,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Comisionado, FormNuevaSolicitud, SolicitudComisionResponse } from '../types/viaticos';
import viaticosService from '../services/api/viaticosService';
import {
  AYUDA_OBJETO_SIIF,
  calcularDiasComision,
  ciudadesDeDepartamento,
  departamentosDisponibles,
  formatearMoneda,
  formatearNombreComisionado,
  formInicialNuevaSolicitud,
  mapearARequestCreacion,
  sanitizeObjetoComision,
  soloNumeros,
  validarFechasSolicitud,
} from '../utils/viaticosUtils';

interface Props {
  abierta: boolean;
  onCerrar: () => void;
  onSolicitudCreada: (solicitud: SolicitudComisionResponse) => void;
}

const PASOS = ['Comisionado', 'Objeto y Destino', 'Confirmación'];

export default function NuevaSolicitudModal({ abierta, onCerrar, onSolicitudCreada }: Props) {
  const [paso, setPaso] = useState(1);
  const [form, setForm] = useState<FormNuevaSolicitud>(formInicialNuevaSolicitud());
  const [comisionado, setComisionado] = useState<Comisionado | null>(null);
  const [consultando, setConsultando] = useState(false);
  const [errorConsulta, setErrorConsulta] = useState<string | null>(null);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const [habeasPendiente, setHabeasPendiente] = useState(false);
  const [habeasMarcado, setHabeasMarcado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (abierta) {
      setPaso(1);
      setForm(formInicialNuevaSolicitud());
      setComisionado(null);
      setConsultando(false);
      setErrorConsulta(null);
      setErrorValidacion(null);
      setHabeasPendiente(false);
      setHabeasMarcado(false);
      setEnviando(false);
    }
  }, [abierta]);

  if (!abierta) return null;

  const actualizar = (campo: keyof FormNuevaSolicitud, valor: string | boolean | number) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const consultarComisionado = async () => {
    const documento = form.documentoComisionado.trim();
    if (!documento) {
      setErrorConsulta('Ingrese el número de documento del funcionario.');
      return;
    }
    setConsultando(true);
    setErrorConsulta(null);
    setComisionado(null);
    setHabeasPendiente(false);
    setHabeasMarcado(false);
    try {
      const resultado = await viaticosService.consultarComisionado(documento);
      if (!resultado) {
        setErrorConsulta('No se encontró un comisionado con ese documento.');
        return;
      }
      setComisionado(resultado);
      setForm((prev) => ({ ...prev, comisionadoId: resultado.id }));
      if (!resultado.autorizacionHabeasData) {
        setHabeasPendiente(true);
      }
    } catch (e) {
      console.error('Error consultando comisionado:', e);
      setErrorConsulta('Ocurrió un error al consultar el comisionado.');
    } finally {
      setConsultando(false);
    }
  };

  const aceptarHabeasData = () => {
    setForm((prev) => ({ ...prev, aceptaHabeasData: true }));
    setHabeasPendiente(false);
    setHabeasMarcado(false);
  };

  const tieneComisionadoAutorizado = Boolean(
    comisionado && (comisionado.autorizacionHabeasData || form.aceptaHabeasData),
  );

  const irPaso = (siguiente: number) => {
    if (siguiente === 2 && !tieneComisionadoAutorizado) return;
    if (siguiente === 3) {
      const error = validarFechasSolicitud(form.fechaInicio, form.fechaFin);
      if (error) {
        setErrorValidacion(error);
        return;
      }
    }
    setErrorValidacion(null);
    setPaso(siguiente);
  };

  const enviarSolicitud = async () => {
    const error = validarFechasSolicitud(form.fechaInicio, form.fechaFin);
    if (error) {
      setErrorValidacion(error);
      return;
    }
    if (!comisionado) {
      setErrorValidacion('Debe consultar el comisionado antes de radicar.');
      return;
    }
    setEnviando(true);
    setErrorValidacion(null);
    try {
      const payload = mapearARequestCreacion(form, comisionado);
      const creada = await viaticosService.crearSolicitudComision(payload);
      onSolicitudCreada(creada);
      onCerrar();
    } catch (e) {
      console.error('Error radicando solicitud:', e);
      setErrorValidacion('No fue posible radicar la solicitud. Verifique e intente nuevamente.');
    } finally {
      setEnviando(false);
    }
  };

  const onSubmitFormulario = (e: FormEvent) => {
    e.preventDefault();
    void enviarSolicitud();
  };

  const inputCls =
    'w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white';
  const labelCls = 'text-xs font-bold text-slate-700 block mb-1';

  return (
    <div className="min-h-full flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-[#003DA5] rounded-xl">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Nueva Solicitud de Comisión de Servicios</h3>
              <p className="text-xs text-slate-400">Paso {paso} de 3</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="text-slate-400 hover:text-slate-600 text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Indicador de pasos */}
        <div className="flex items-center gap-2 mb-5">
          {PASOS.map((nombre, idx) => {
            const n = idx + 1;
            const activo = n === paso;
            const completado = n < paso;
            return (
              <div key={nombre} className="flex items-center gap-2 flex-1">
                <div
                  className={`w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                    activo
                      ? 'bg-[#003DA5] text-white'
                      : completado
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {completado ? '✓' : n}
                </div>
                <span className={`text-[10px] font-bold hidden sm:block ${activo ? 'text-slate-800' : 'text-slate-400'}`}>
                  {nombre}
                </span>
                {idx < PASOS.length - 1 && <div className="flex-1 h-px bg-slate-200" />}
              </div>
            );
          })}
        </div>

        <form onSubmit={onSubmitFormulario} className="space-y-4">
          {/* ── PASO 1: Datos del comisionado ── */}
          {paso === 1 && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-blue-700">
                1. Datos del Funcionario Comisionado
              </h4>
              <div>
                <label className={labelCls} htmlFor="documentoComisionado">
                  Documento de Identidad *
                </label>
                <div className="flex gap-2">
                  <input
                    id="documentoComisionado"
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="Ej. 1019283746"
                    value={form.documentoComisionado}
                    onChange={(e) => actualizar('documentoComisionado', soloNumeros(e.target.value))}
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={consultarComisionado}
                    disabled={consultando}
                    className="px-4 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 shrink-0 transition-colors disabled:opacity-50"
                  >
                    <Search className="w-3.5 h-3.5" />
                    {consultando ? 'Consultando...' : 'Consultar'}
                  </button>
                </div>
                {errorConsulta && (
                  <p className="text-xs text-red-600 font-semibold mt-2" role="alert">
                    {errorConsulta}
                  </p>
                )}
              </div>

              {comisionado && !habeasPendiente && (
                <div className="border border-emerald-200 bg-emerald-50/60 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{formatearNombreComisionado(comisionado)}</p>
                      <p className="text-[11px] text-slate-500">
                        {comisionado.tipoComisionado} · {comisionado.email}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div>
                      <span className="text-slate-400 font-bold block">Documento</span>
                      {comisionado.numeroDocumento}
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block">Teléfono</span>
                      {comisionado.telefonoContacto}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => irPaso(2)}
                  disabled={!tieneComisionadoAutorizado}
                  className="px-4 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── PASO 2: Objeto y destino de la comisión ── */}
          {paso === 2 && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-blue-700">
                2. Objeto y Destino de la Comisión
              </h4>
              <div>
                <label className={labelCls} htmlFor="objetoComision">
                  Objeto / Justificación de la comisión *
                </label>
                <textarea
                  id="objetoComision"
                  required
                  rows={3}
                  placeholder="Describa el objetivo institucional de la comisión..."
                  value={form.objetoComision}
                  onChange={(e) => actualizar('objetoComision', sanitizeObjetoComision(e.target.value))}
                  className={inputCls}
                />
                <p className="text-[11px] text-amber-600 font-medium mt-1 flex items-start gap-1">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {AYUDA_OBJETO_SIIF}
                </p>
              </div>

              {/* Departamento → Ciudad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="destinoDepartamento">
                    Departamento *
                  </label>
                  <select
                    id="destinoDepartamento"
                    value={form.destinoDepartamento}
                    onChange={(e) => {
                      actualizar('destinoDepartamento', e.target.value);
                      actualizar('destinoCiudad', '');
                    }}
                    className={inputCls}
                  >
                    <option value="">Seleccione un departamento...</option>
                    {departamentosDisponibles().map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="destinoCiudad">
                    Ciudad *
                  </label>
                  <select
                    id="destinoCiudad"
                    value={form.destinoCiudad}
                    disabled={!form.destinoDepartamento}
                    onChange={(e) => actualizar('destinoCiudad', e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Seleccione una ciudad...</option>
                    {ciudadesDeDepartamento(form.destinoDepartamento).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="fechaInicio">
                    Fecha Inicio *
                  </label>
                  <input
                    id="fechaInicio"
                    type="date"
                    required
                    value={form.fechaInicio}
                    onChange={(e) => actualizar('fechaInicio', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="fechaFin">
                    Fecha Fin *
                  </label>
                  <input
                    id="fechaFin"
                    type="date"
                    required
                    value={form.fechaFin}
                    onChange={(e) => actualizar('fechaFin', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="rubroPresupuestal">
                    Rubro Presupuestal *
                  </label>
                  <input
                    id="rubroPresupuestal"
                    type="text"
                    required
                    placeholder="Ej. Rubro 01"
                    value={form.rubroPresupuestal}
                    onChange={(e) => actualizar('rubroPresupuestal', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="prioridad">
                    Prioridad
                  </label>
                  <select
                    id="prioridad"
                    value={form.prioridad}
                    onChange={(e) => actualizar('prioridad', e.target.value)}
                    className={inputCls}
                  >
                    <option value="ALTA">Alta</option>
                    <option value="MEDIA">Media</option>
                    <option value="BAJA">Baja</option>
                  </select>
                </div>
              </div>

              {/* Valores estimados */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Valores estimados (COP)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls} htmlFor="montoViaticos">
                      Viáticos *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">$</span>
                      <input
                        id="montoViaticos"
                        type="text"
                        inputMode="numeric"
                        value={formatearMoneda(form.montoViaticos)}
                        onChange={(e) => actualizar('montoViaticos', Number(soloNumeros(e.target.value)) || 0)}
                        className={`${inputCls} pl-7 text-right font-bold`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="montoGastosViaje">
                      Gastos de viaje *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">$</span>
                      <input
                        id="montoGastosViaje"
                        type="text"
                        inputMode="numeric"
                        value={formatearMoneda(form.montoGastosViaje)}
                        onChange={(e) => actualizar('montoGastosViaje', Number(soloNumeros(e.target.value)) || 0)}
                        className={`${inputCls} pl-7 text-right font-bold`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="diasComision">
                      Días *
                    </label>
                    <input
                      id="diasComision"
                      type="text"
                      inputMode="numeric"
                      value={form.diasComision}
                      onChange={(e) => actualizar('diasComision', Number(soloNumeros(e.target.value)) || 0)}
                      className={`${inputCls} text-right font-bold`}
                    />
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.requiereTiquetes}
                  onChange={(e) => actualizar('requiereTiquetes', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#003DA5] focus:ring-[#003DA5]"
                />
                La comisión requiere tiquetes aéreos / pasajes
              </label>

              {errorValidacion && (
                <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
                  {errorValidacion}
                </p>
              )}

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => irPaso(1)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 inline-flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Atrás
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => irPaso(3)}
                    className="px-4 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    Siguiente <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={enviando}
                    onClick={() => void enviarSolicitud()}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" /> Enviar Solicitud
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── PASO 3: Confirmación y envío ── */}
          {paso === 3 && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-blue-700">
                3. Confirmación de la Solicitud
              </h4>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-slate-400 font-bold">Comisionado</span>
                  <span className="font-semibold text-slate-800">
                    {comisionado ? formatearNombreComisionado(comisionado) : '-'}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-slate-400 font-bold">Destino</span>
                  <span className="font-semibold text-slate-800">
                    {form.destinoCiudad} ({form.destinoDepartamento})
                  </span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-slate-400 font-bold">Fechas</span>
                  <span className="font-semibold text-slate-800">
                    {form.fechaInicio} al {form.fechaFin} ·{' '}
                    {form.diasComision || calcularDiasComision(form.fechaInicio, form.fechaFin)} días
                  </span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-slate-400 font-bold">Rubro</span>
                  <span className="font-semibold text-slate-800">{form.rubroPresupuestal}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-slate-400 font-bold">Prioridad</span>
                  <span className="font-semibold text-slate-800">{form.prioridad}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-slate-400 font-bold">Viáticos</span>
                  <span className="font-semibold text-slate-800">{formatearMoneda(form.montoViaticos)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-slate-400 font-bold">Gastos de viaje</span>
                  <span className="font-semibold text-slate-800">{formatearMoneda(form.montoGastosViaje)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-slate-400 font-bold">Total estimado</span>
                  <span className="font-semibold text-slate-800">
                    {formatearMoneda(form.montoViaticos + form.montoGastosViaje)}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-slate-400 font-bold">Requiere tiquetes</span>
                  <span className="font-semibold text-slate-800">{form.requiereTiquetes ? 'Sí' : 'No'}</span>
                </div>
                <div className="px-4 py-2.5">
                  <span className="text-slate-400 font-bold block mb-1">Objeto</span>
                  <p className="bg-slate-50 rounded-lg p-2.5 text-slate-700 leading-relaxed">{form.objetoComision}</p>
                </div>
              </div>

              {errorValidacion && (
                <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
                  {errorValidacion}
                </p>
              )}

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => irPaso(2)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 inline-flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Atrás
                </button>
                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => void enviarSolicitud()}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" /> {enviando ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* ── MODAL HABEAS DATA ── */}
      {habeasPendiente && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
              <div className="p-2 bg-blue-50 text-[#003DA5] rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900">Autorización de Tratamiento de Datos</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              El comisionado no cuenta con autorización vigente para el tratamiento de datos semiprivados (correo
              electrónico y teléfono de contacto) conforme a la Ley 1581 de 2012 y la Sentencia T-254 de 2024.
            </p>
            <label className="flex items-start gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={habeasMarcado}
                onChange={(e) => setHabeasMarcado(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#003DA5] focus:ring-[#003DA5]"
              />
              Autorizo el tratamiento de los datos semiprivados del comisionado para la gestión de la comisión.
            </label>
            <div className="pt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setHabeasPendiente(false);
                  setHabeasMarcado(false);
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!habeasMarcado}
                onClick={aceptarHabeasData}
                className="px-4 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-40"
              >
                Aceptar y Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
