/**
 * ModalSeguimientoControl - Registro / edición del seguimiento cuatrimestral de un control (EFDS-2416)
 * Un seguimiento por control en cada cuatrimestre: si el cuatrimestre elegido ya tiene registro, se edita.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { Label } from '@esap-mfe/shared-ui/label';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import { ClipboardCheck, Loader2, Paperclip, X as XIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  riesgosService,
  type ControlSeguimientoAPI,
  type RiesgoSeguimientosAPI,
} from '../../../../services/api/legal.service';
import { authService } from '../../../../services/api/authService';
import {
  RESULTADO_OPCIONES,
  construirFormDataSeguimiento,
  formatearTamano,
  validarEvidenciasNuevas,
  validarFormularioSeguimiento,
  type ErroresSeguimiento,
  type FormularioSeguimiento,
} from './riesgoSeguimientoUtils';

interface ModalSeguimientoControlProps {
  open: boolean;
  onClose: () => void;
  riesgoId: string;
  control: ControlSeguimientoAPI | null;
  /** Cuatrimestre con el que se abre el formulario (el del botón pulsado). */
  cuatrimestreInicial?: number;
  vista: Pick<RiesgoSeguimientosAPI, 'hoy' | 'config'>;
  onGuardado: () => void | Promise<void>;
}

const FORM_VACIO: FormularioSeguimiento = { cuatrimestre: null, fechaEjecucion: '', comentarios: '', resultado: '', efectividad: '' };

export function ModalSeguimientoControl({ open, onClose, riesgoId, control, cuatrimestreInicial, vista, onGuardado }: ModalSeguimientoControlProps) {
  const [form, setForm] = useState<FormularioSeguimiento>(FORM_VACIO);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [conservar, setConservar] = useState<string[]>([]);
  const [errores, setErrores] = useState<ErroresSeguimiento>({});
  const [guardando, setGuardando] = useState(false);
  const inputArchivos = useRef<HTMLInputElement>(null);

  const habilitados = useMemo(() => (control?.cortes ?? []).filter(c => c.puedeRegistrar), [control]);
  const corte = useMemo(
    () => (control?.cortes ?? []).find(c => c.cuatrimestre === form.cuatrimestre) ?? null,
    [control, form.cuatrimestre],
  );
  const existente = corte?.seguimiento ?? null;

  // Al abrir: precarga el cuatrimestre pedido (o el primero habilitado).
  useEffect(() => {
    if (!open || !control) return;
    const inicial = habilitados.find(c => c.cuatrimestre === cuatrimestreInicial) ?? habilitados[0] ?? null;
    seleccionarCuatrimestre(inicial?.cuatrimestre ?? null);
    setErrores({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, control?.controlId, cuatrimestreInicial]);

  function seleccionarCuatrimestre(numero: number | null) {
    const c = (control?.cortes ?? []).find(x => x.cuatrimestre === numero);
    const s = c?.seguimiento ?? null;
    setArchivos([]);
    setConservar(s ? s.evidencias.map(e => e.archivo) : []);
    setForm(s
      ? { cuatrimestre: numero, fechaEjecucion: s.fechaEjecucion.slice(0, 10), comentarios: s.comentarios, resultado: s.resultado, efectividad: String(s.efectividad) }
      : { ...FORM_VACIO, cuatrimestre: numero });
  }

  const cambiar = <K extends keyof FormularioSeguimiento>(campo: K, valor: FormularioSeguimiento[K]) => {
    setForm(f => ({ ...f, [campo]: valor }));
    setErrores(e => ({ ...e, [campo]: undefined }));
  };

  // La fecha se valida al escribirla: una fecha futura o fuera del cuatrimestre se ve de inmediato.
  const cambiarFecha = (valor: string) => {
    setForm(f => ({ ...f, fechaEjecucion: valor }));
    const errorFecha = valor
      ? validarFormularioSeguimiento({ ...form, fechaEjecucion: valor }, {
          hoy: vista.hoy, inicio: corte?.inicio ?? null, fin: corte?.fin ?? null,
          archivos: [], maxMb: vista.config.maxMb, extensiones: vista.config.extensiones,
        }).fechaEjecucion
      : undefined;
    setErrores(e => ({ ...e, fechaEjecucion: errorFecha }));
  };

  const agregarArchivos = (lista: FileList | null) => {
    if (!lista) return;
    // Se valida al elegir: el archivo inválido no se agrega y el error se ve de inmediato.
    const aceptados: File[] = [];
    let error: string | undefined;
    for (const archivo of Array.from(lista)) {
      const motivo = validarEvidenciasNuevas([archivo], vista.config.maxMb, vista.config.extensiones);
      if (motivo) error = error ?? motivo;
      else aceptados.push(archivo);
    }
    if (aceptados.length > 0) setArchivos(prev => [...prev, ...aceptados]);
    setErrores(e => ({ ...e, evidencias: error }));
    if (inputArchivos.current) inputArchivos.current.value = '';
  };

  const guardar = async () => {
    if (!control) return;
    const nuevos = validarFormularioSeguimiento(form, {
      hoy: vista.hoy,
      inicio: corte?.inicio ?? null,
      fin: corte?.fin ?? null,
      archivos,
      maxMb: vista.config.maxMb,
      extensiones: vista.config.extensiones,
    });
    setErrores(nuevos);
    if (Object.values(nuevos).some(Boolean)) return;

    setGuardando(true);
    try {
      if (existente) {
        await riesgosService.actualizarSeguimiento(riesgoId, existente.id, construirFormDataSeguimiento(form, archivos, conservar));
      } else {
        await riesgosService.crearSeguimiento(riesgoId, control.controlId, construirFormDataSeguimiento(form, archivos));
      }
      toast.success(existente ? 'Seguimiento actualizado' : 'Seguimiento registrado');
      await onGuardado();
      onClose();
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo guardar el seguimiento';
      toast.error(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  if (!control) return null;
  const responsable = authService.getCurrentUser()?.fullName || 'Usuario autenticado';
  const fechaMax = corte ? (corte.fin < vista.hoy ? corte.fin : vista.hoy) : vista.hoy;

  return (
    <Dialog open={open} onOpenChange={(abierto) => { if (!abierto && !guardando) onClose(); }}>
      <DialogContent className="w-[95vw] max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-blue-600" />
          {existente ? 'Editar seguimiento del control' : 'Registrar seguimiento del control'}
        </DialogTitle>
        <DialogDescription className="text-sm text-gray-600">{control.descripcion}</DialogDescription>

        {habilitados.length === 0 ? (
          <p className="text-sm text-gray-600 py-4">No hay ningún cuatrimestre abierto para registrar seguimiento.</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="seg-cuatrimestre">Cuatrimestre <span className="text-red-500">*</span></Label>
              <select
                id="seg-cuatrimestre"
                value={form.cuatrimestre ?? ''}
                onChange={(e) => seleccionarCuatrimestre(e.target.value ? Number(e.target.value) : null)}
                className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm bg-white"
              >
                <option value="">Seleccione…</option>
                {habilitados.map(c => (
                  <option key={c.cuatrimestre} value={c.cuatrimestre}>
                    {c.label} ({c.inicio.slice(5, 7)}/{c.inicio.slice(0, 4)} – {c.fin.slice(5, 7)}/{c.fin.slice(0, 4)}){c.seguimiento ? ' · ya registrado' : ''}
                  </option>
                ))}
              </select>
              {existente && <p className="text-xs text-amber-700">Este cuatrimestre ya tiene seguimiento: se editará el existente.</p>}
              {errores.cuatrimestre && <p role="alert" className="text-xs text-red-600">{errores.cuatrimestre}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="seg-fecha">Fecha de ejecución del seguimiento <span className="text-red-500">*</span></Label>
                <Input
                  id="seg-fecha"
                  type="date"
                  value={form.fechaEjecucion}
                  min={corte?.inicio}
                  max={fechaMax}
                  onChange={(e) => cambiarFecha(e.target.value)}
                />
                {errores.fechaEjecucion && <p role="alert" className="text-xs text-red-600">{errores.fechaEjecucion}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="seg-efectividad">Efectividad evaluada en el corte (%) <span className="text-red-500">*</span></Label>
                <Input
                  id="seg-efectividad"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={form.efectividad}
                  onChange={(e) => cambiar('efectividad', e.target.value)}
                />
                {errores.efectividad && <p role="alert" className="text-xs text-red-600">{errores.efectividad}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="seg-resultado">Resultado del control <span className="text-red-500">*</span></Label>
              <select
                id="seg-resultado"
                value={form.resultado}
                onChange={(e) => cambiar('resultado', e.target.value as FormularioSeguimiento['resultado'])}
                className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm bg-white"
              >
                <option value="">Seleccione…</option>
                {RESULTADO_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {errores.resultado && <p role="alert" className="text-xs text-red-600">{errores.resultado}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="seg-comentarios">Comentarios / observaciones <span className="text-red-500">*</span></Label>
              <Textarea
                id="seg-comentarios"
                value={form.comentarios}
                onChange={(e) => cambiar('comentarios', e.target.value)}
                rows={4}
              />
              {errores.comentarios && <p role="alert" className="text-xs text-red-600">{errores.comentarios}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="seg-evidencias">Evidencias</Label>
              <input
                id="seg-evidencias"
                ref={inputArchivos}
                type="file"
                multiple
                accept={vista.config.extensiones.map(e => `.${e}`).join(',')}
                onChange={(e) => agregarArchivos(e.target.files)}
                className="block w-full text-sm text-gray-700"
              />
              <p className="text-xs text-gray-500">PDF, Word, Excel o imágenes. Tamaño máximo por archivo: {vista.config.maxMb} MB.</p>
              {existente && existente.evidencias.length > 0 && (
                <ul className="space-y-1">
                  {existente.evidencias.map(e => {
                    const activa = conservar.includes(e.archivo);
                    return (
                      <li key={e.archivo} className="flex items-center justify-between gap-2 text-xs bg-gray-50 border rounded px-2 py-1">
                        <span className={`flex items-center gap-1 truncate ${activa ? '' : 'line-through text-gray-400'}`}>
                          <Paperclip className="w-3 h-3 flex-shrink-0" />{e.nombre} ({formatearTamano(e.tamano)})
                        </span>
                        <button
                          type="button"
                          className="text-red-600 hover:underline flex-shrink-0"
                          onClick={() => setConservar(c => activa ? c.filter(x => x !== e.archivo) : [...c, e.archivo])}
                        >
                          {activa ? 'Quitar' : 'Restaurar'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {archivos.length > 0 && (
                <ul className="space-y-1">
                  {archivos.map((a, i) => (
                    <li key={`${a.name}-${i}`} className="flex items-center justify-between gap-2 text-xs bg-blue-50 border border-blue-200 rounded px-2 py-1">
                      <span className="flex items-center gap-1 truncate"><Paperclip className="w-3 h-3 flex-shrink-0" />{a.name} ({formatearTamano(a.size)})</span>
                      <button type="button" aria-label={`Quitar ${a.name}`} onClick={() => setArchivos(prev => prev.filter((_, j) => j !== i))}>
                        <XIcon className="w-3 h-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {errores.evidencias && <p role="alert" className="text-xs text-red-600">{errores.evidencias}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="seg-responsable">Responsable del seguimiento</Label>
              <Input id="seg-responsable" value={existente?.responsable ?? responsable} readOnly disabled />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={guardando}>Cancelar</Button>
          {habilitados.length > 0 && (
            <Button onClick={guardar} disabled={guardando} className="bg-blue-600 hover:bg-blue-700 text-white">
              {guardando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {existente ? 'Guardar cambios' : 'Guardar seguimiento'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
