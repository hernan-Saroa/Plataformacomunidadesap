import React, { useEffect, useMemo, useState } from 'react';
import { X, Save, Building2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Sede, infraestructuraService } from '../services/infraestructuraService';

export type TipoSede = 'SEDE_CENTRAL' | 'SEDE_ALTERNA' | 'TERRITORIAL' | 'CETAP';

export const OPCIONES_TIPO_SEDE: Array<{ valor: TipoSede; label: string }> = [
  { valor: 'SEDE_CENTRAL', label: 'SEDE CENTRAL' },
  { valor: 'SEDE_ALTERNA', label: 'SEDE ALTERNA' },
  { valor: 'TERRITORIAL', label: 'TERRITORIAL' },
  { valor: 'CETAP', label: 'CETAP' },
];

export interface FormularioNuevaSede {
  codigo: string;
  nombre: string;
  tipo: TipoSede;
  departamento: string;
  municipio: string;
  direccion: string;
  telefono: string;
  emailContacto: string;
  alcanceUmi: boolean;
  isActivo: boolean;
}

const FORM_VACIO: FormularioNuevaSede = {
  codigo: '',
  nombre: '',
  tipo: 'TERRITORIAL',
  departamento: '',
  municipio: '',
  direccion: '',
  telefono: '',
  emailContacto: '',
  alcanceUmi: false,
  isActivo: true,
};

interface ModalNuevaSedeProps {
  open: boolean;
  onClose: () => void;
  onExito: (nuevaSede: Sede) => void;
  onError?: (mensaje: string) => void;
  sedeAEditar?: Sede | null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ModalNuevaSede: React.FC<ModalNuevaSedeProps> = ({ open, onClose, onExito, onError, sedeAEditar }) => {
  const [form, setForm] = useState<FormularioNuevaSede>(FORM_VACIO);
  const [errores, setErrores] = useState<Partial<Record<keyof FormularioNuevaSede, string>>>({});
  const [cargando, setCargando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);

  const MODO_EDICION = Boolean(sedeAEditar);

  useEffect(() => {
    if (open) {
      if (sedeAEditar) {
        setForm({
          codigo: sedeAEditar.codigo ?? '',
          nombre: sedeAEditar.nombre ?? '',
          tipo: (sedeAEditar.tipo as TipoSede) ?? 'TERRITORIAL',
          departamento: sedeAEditar.departamento ?? '',
          municipio: sedeAEditar.municipio ?? '',
          direccion: sedeAEditar.direccion ?? '',
          telefono: sedeAEditar.telefono ?? '',
          emailContacto: sedeAEditar.emailContacto ?? '',
          alcanceUmi: Boolean(sedeAEditar.alcanceUmi),
          isActivo: sedeAEditar.isActivo !== false,
        });
      } else {
        setForm(FORM_VACIO);
      }
      setErrores({});
      setFeedback(null);
    }
  }, [open, sedeAEditar]);

  const setField = <K extends keyof FormularioNuevaSede>(key: K, valor: FormularioNuevaSede[K]) => {
    setForm((f) => ({ ...f, [key]: valor }));
    setErrores((e) => {
      if (!e[key]) return e;
      const copia = { ...e };
      delete copia[key];
      return copia;
    });
  };

  const validar = (): boolean => {
    const errs: Partial<Record<keyof FormularioNuevaSede, string>> = {};
    if (!String(form.codigo).trim()) errs.codigo = 'Código es obligatorio (ej. TERR-BOYACA).';
    else if (form.codigo.trim().length > 30) errs.codigo = 'Máx 30 caracteres.';
    if (!String(form.nombre).trim()) errs.nombre = 'Nombre es obligatorio.';
    if (!String(form.departamento).trim()) errs.departamento = 'Departamento es obligatorio.';
    if (!String(form.municipio).trim()) errs.municipio = 'Municipio es obligatorio.';
    if (!String(form.direccion).trim()) errs.direccion = 'Dirección es obligatoria.';
    const email = String(form.emailContacto).trim().toLowerCase();
    if (email && !EMAIL_REGEX.test(email)) errs.emailContacto = 'Formato correo inválido.';
    setErrores(errs);
    return Object.keys(errs).length === 0;
  };

  const esValido = useMemo(() => {
    return (
      String(form.codigo).trim().length > 0 &&
      String(form.nombre).trim().length > 0 &&
      String(form.departamento).trim().length > 0 &&
      String(form.municipio).trim().length > 0 &&
      String(form.direccion).trim().length > 0 &&
      (String(form.emailContacto).trim() === '' || EMAIL_REGEX.test(String(form.emailContacto).trim().toLowerCase()))
    );
  }, [form]);

  const submit = async () => {
    if (!validar()) return;
    setCargando(true);
    setFeedback(null);
    try {
      const payload = {
        codigo: form.codigo.trim().toUpperCase(),
        nombre: form.nombre.trim(),
        tipo: form.tipo,
        departamento: form.departamento.trim(),
        municipio: form.municipio.trim(),
        direccion: form.direccion.trim(),
        telefono: form.telefono.trim() || undefined,
        emailContacto: form.emailContacto.trim() || undefined,
        alcanceUmi: !!form.alcanceUmi,
        isActivo: !!form.isActivo,
      };
      let result: Sede;
      if (MODO_EDICION && sedeAEditar) {
        result = await infraestructuraService.actualizarSede(sedeAEditar.idSede, payload);
        setFeedback({ tipo: 'ok', texto: 'Sede actualizada correctamente.' });
      } else {
        result = await infraestructuraService.crearSede(payload);
        setFeedback({ tipo: 'ok', texto: 'Sede creada correctamente.' });
      }
      setTimeout(() => {
        onExito(result);
      }, 500);
    } catch (err: any) {
      const m = err?.message || 'Error guardando sede.';
      setFeedback({ tipo: 'err', texto: m });
      onError?.(m);
    } finally {
      setCargando(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 animate-in zoom-in-95 fade-in">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                {MODO_EDICION ? 'Editar sede territorial' : 'Crear nueva sede'}
              </h3>
              <p className="text-xs text-slate-500">
                {MODO_EDICION ? 'Actualiza los datos de la sede existente.' : 'Registra una nueva sede en la red ESAP.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={cargando}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {feedback && (
            <div className={`rounded-xl p-3 border shadow-sm text-xs font-bold flex items-start gap-2 animate-in slide-in-from-top fade-in ${
              feedback.tipo === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              {feedback.tipo === 'ok' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span className="leading-5">{feedback.texto}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Código <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={form.codigo}
                onChange={(e) => setField('codigo', e.target.value.toUpperCase() as any)}
                placeholder="TERR-BOYACA"
                maxLength={30}
                disabled={cargando}
                className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-medium text-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ${
                  errores.codigo ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/30' : 'border-slate-300'
                }`}
              />
              {errores.codigo && <p className="text-[11px] font-semibold text-rose-600">{errores.codigo}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Tipo <span className="text-rose-600">*</span>
              </label>
              <select
                value={form.tipo}
                onChange={(e) => setField('tipo', e.target.value as TipoSede)}
                disabled={cargando}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                {OPCIONES_TIPO_SEDE.map((op) => (
                  <option key={op.valor} value={op.valor}>{op.label}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Nombre <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setField('nombre', e.target.value)}
                placeholder="Territorial Boyacá - Casanare"
                maxLength={150}
                disabled={cargando}
                className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-medium text-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ${
                  errores.nombre ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/30' : 'border-slate-300'
                }`}
              />
              {errores.nombre && <p className="text-[11px] font-semibold text-rose-600">{errores.nombre}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Departamento <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={form.departamento}
                onChange={(e) => setField('departamento', e.target.value)}
                placeholder="Boyacá"
                maxLength={100}
                disabled={cargando}
                className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-medium text-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ${
                  errores.departamento ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/30' : 'border-slate-300'
                }`}
              />
              {errores.departamento && <p className="text-[11px] font-semibold text-rose-600">{errores.departamento}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Municipio <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={form.municipio}
                onChange={(e) => setField('municipio', e.target.value)}
                placeholder="Tunja"
                maxLength={100}
                disabled={cargando}
                className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-medium text-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ${
                  errores.municipio ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/30' : 'border-slate-300'
                }`}
              />
              {errores.municipio && <p className="text-[11px] font-semibold text-rose-600">{errores.municipio}</p>}
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Dirección <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={form.direccion}
                onChange={(e) => setField('direccion', e.target.value)}
                placeholder="Calle 20 # 9 - 45"
                maxLength={255}
                disabled={cargando}
                className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-medium text-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ${
                  errores.direccion ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/30' : 'border-slate-300'
                }`}
              />
              {errores.direccion && <p className="text-[11px] font-semibold text-rose-600">{errores.direccion}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Teléfono</label>
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) => setField('telefono', e.target.value)}
                placeholder="(608) 7421234"
                maxLength={50}
                disabled={cargando}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Email de contacto</label>
              <input
                type="email"
                value={form.emailContacto}
                onChange={(e) => setField('emailContacto', e.target.value)}
                placeholder="sede@esap.edu.co"
                maxLength={100}
                disabled={cargando}
                className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-medium text-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ${
                  errores.emailContacto ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/30' : 'border-slate-300'
                }`}
              />
              {errores.emailContacto && <p className="text-[11px] font-semibold text-rose-600">{errores.emailContacto}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-60">
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-slate-800">Alcance UMI</p>
                <p className="text-[11px] text-slate-500 font-medium">Incluir en rango de Unidad de Mantenimiento Institucional</p>
              </div>
              <button
                type="button"
                onClick={() => setField('alcanceUmi', !form.alcanceUmi as any)}
                disabled={cargando}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed ${
                  form.alcanceUmi ? 'bg-blue-600' : 'bg-slate-300'
                }`}
                role="switch"
                aria-checked={form.alcanceUmi}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ${
                    form.alcanceUmi ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>

            <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer">
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-slate-800">Sede activa</p>
                <p className="text-[11px] text-slate-500 font-medium">Desactivar para ocultar de listados predeterminados</p>
              </div>
              <button
                type="button"
                onClick={() => setField('isActivo', !form.isActivo as any)}
                disabled={cargando}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed ${
                  form.isActivo ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
                role="switch"
                aria-checked={form.isActivo}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ${
                    form.isActivo ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-white/95 backdrop-blur">
          <button
            type="button"
            onClick={onClose}
            disabled={cargando}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-sm transition-all active:scale-95 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed disabled:scale-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={cargando || !esValido}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black shadow-sm shadow-blue-500/20 transition-all active:scale-95 disabled:bg-slate-300 disabled:text-slate-800 disabled:shadow-none disabled:cursor-not-allowed disabled:scale-100"
          >
            <Save className="w-4 h-4" />
            {cargando ? (MODO_EDICION ? 'Guardando…' : 'Creando…') : (MODO_EDICION ? 'Guardar cambios' : 'Crear sede')}
          </button>
        </div>
      </div>
    </div>
  );
};
