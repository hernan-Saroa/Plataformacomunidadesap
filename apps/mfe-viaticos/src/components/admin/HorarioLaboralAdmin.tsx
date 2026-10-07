import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Save,
  X,
  Check,
  Calendar,
  Sparkles,
  Info,
} from 'lucide-react';
import viaticosService from '../../services/api/viaticosService';
import {
  ConfigJornadaLaboral,
  CrearConfigJornadaLaboralDTO,
  ActualizarConfigJornadaLaboralDTO,
} from '../../types/parametrizacion';

const DIAS_SEMANA = [
  { id: 1, nombre: 'Lunes', corto: 'Lun' },
  { id: 2, nombre: 'Martes', corto: 'Mar' },
  { id: 3, nombre: 'Miércoles', corto: 'Mié' },
  { id: 4, nombre: 'Jueves', corto: 'Jue' },
  { id: 5, nombre: 'Viernes', corto: 'Vie' },
  { id: 6, nombre: 'Sábado', corto: 'Sáb' },
  { id: 0, nombre: 'Domingo', corto: 'Dom' },
];

export default function HorarioLaboralAdmin() {
  const [jornadas, setJornadas] = useState<ConfigJornadaLaboral[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  // Modal Crear / Editar
  const [modalAbierto, setModalAbierto] = useState(false);
  const [esEdicion, setEsEdicion] = useState(false);
  const [jornadaEditandoId, setJornadaEditandoId] = useState<number | null>(null);

  // Formulario
  const [formCodigo, setFormCodigo] = useState('');
  const [formNombre, setFormNombre] = useState('');
  const [formHoraInicio, setFormHoraInicio] = useState('08:00');
  const [formHoraFin, setFormHoraFin] = useState('16:30');
  const [formDiasLaborales, setFormDiasLaborales] = useState<number[]>([1, 2, 3, 4, 5]);
  const [formDiasAnticipacion, setFormDiasAnticipacion] = useState(14);
  const [formDiasUmbralAvance, setFormDiasUmbralAvance] = useState(5);
  const [formActivo, setFormActivo] = useState(false);
  const [formDescripcion, setFormDescripcion] = useState('');

  // Confirmación eliminar
  const [jornadaAEliminar, setJornadaAEliminar] = useState<ConfigJornadaLaboral | null>(null);

  const cargarJornadas = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await viaticosService.obtenerConfiguracionesJornada();
      setJornadas(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Error cargando las jornadas laborales');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarJornadas();
  }, [cargarJornadas]);

  const abrirCrear = () => {
    setEsEdicion(false);
    setJornadaEditandoId(null);
    setFormCodigo('');
    setFormNombre('');
    setFormHoraInicio('08:00');
    setFormHoraFin('16:30');
    setFormDiasLaborales([1, 2, 3, 4, 5]);
    setFormDiasAnticipacion(14);
    setFormDiasUmbralAvance(5);
    setFormActivo(jornadas.length === 0);
    setFormDescripcion('');
    setError(null);
    setModalAbierto(true);
  };

  const abrirEditar = (j: ConfigJornadaLaboral) => {
    setEsEdicion(true);
    setJornadaEditandoId(j.id);
    setFormCodigo(j.codigo);
    setFormNombre(j.nombre);
    setFormHoraInicio(j.horaInicio || '08:00');
    setFormHoraFin(j.horaFin || '16:30');
    setFormDiasLaborales(Array.isArray(j.diasLaborales) ? j.diasLaborales : [1, 2, 3, 4, 5]);
    setFormDiasAnticipacion(j.diasAnticipacionMinima || 14);
    setFormDiasUmbralAvance(j.diasUmbralAvance || 5);
    setFormActivo(j.activo);
    setFormDescripcion(j.descripcion || '');
    setError(null);
    setModalAbierto(true);
  };

  const toggleDia = (diaId: number) => {
    setFormDiasLaborales((prev) => {
      if (prev.includes(diaId)) {
        if (prev.length === 1) return prev; // Al menos un día laboral
        return prev.filter((d) => d !== diaId);
      }
      return [...prev, diaId].sort((a, b) => {
        const orden = [1, 2, 3, 4, 5, 6, 0];
        return orden.indexOf(a) - orden.indexOf(b);
      });
    });
  };

  const guardarJornada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim()) {
      setError('El nombre de la jornada es obligatorio');
      return;
    }
    if (!formHoraInicio || !formHoraFin) {
      setError('Las horas de inicio y fin son obligatorias');
      return;
    }
    if (formDiasLaborales.length === 0) {
      setError('Debe seleccionar al menos un día laboral');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      if (esEdicion && jornadaEditandoId) {
        const dto: ActualizarConfigJornadaLaboralDTO = {
          nombre: formNombre.trim(),
          horaInicio: formHoraInicio,
          horaFin: formHoraFin,
          diasLaborales: formDiasLaborales,
          diasAnticipacionMinima: formDiasAnticipacion,
          diasUmbralAvance: formDiasUmbralAvance,
          activo: formActivo,
          descripcion: formDescripcion.trim() || undefined,
        };
        await viaticosService.actualizarConfigJornada(jornadaEditandoId, dto);
        setExito('Jornada laboral actualizada satisfactoriamente');
      } else {
        const dto: CrearConfigJornadaLaboralDTO = {
          codigo: (formCodigo.trim() || `JORNADA_${Date.now()}`).toUpperCase(),
          nombre: formNombre.trim(),
          horaInicio: formHoraInicio,
          horaFin: formHoraFin,
          diasLaborales: formDiasLaborales,
          diasAnticipacionMinima: formDiasAnticipacion,
          diasUmbralAvance: formDiasUmbralAvance,
          activo: formActivo,
          descripcion: formDescripcion.trim() || undefined,
        };
        await viaticosService.crearConfigJornada(dto);
        setExito('Nueva jornada laboral registrada satisfactoriamente');
      }
      setModalAbierto(false);
      await cargarJornadas();
      setTimeout(() => setExito(null), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Error guardando la jornada');
    } finally {
      setGuardando(false);
    }
  };

  const activarJornada = async (id: number) => {
    setGuardando(true);
    setError(null);
    try {
      await viaticosService.activarConfigJornada(id);
      setExito('Jornada laboral activada como configuración institucional principal');
      await cargarJornadas();
      setTimeout(() => setExito(null), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Error activando la jornada');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!jornadaAEliminar) return;
    setGuardando(true);
    setError(null);
    try {
      await viaticosService.eliminarConfigJornada(jornadaAEliminar.id);
      setExito('Jornada laboral eliminada satisfactoriamente');
      setJornadaAEliminar(null);
      await cargarJornadas();
      setTimeout(() => setExito(null), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Error eliminando la jornada');
    } finally {
      setGuardando(false);
    }
  };

  const jornadaActiva = jornadas.find((j) => j.activo);

  return (
    <div className="space-y-6">
      {/* Cabecera y botón Crear */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#003DA5]" />
            Jornada Laboral y Días Hábiles
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Parametrización dinámica del horario institucional de radicación, días hábiles y umbrales de anticipación.
          </p>
        </div>
        <button
          type="button"
          onClick={abrirCrear}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-lg text-xs font-bold shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nueva Jornada Laboral
        </button>
      </div>

      {/* Alertas */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {exito && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{exito}</span>
          <button type="button" onClick={() => setExito(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tarjeta destacada de la Jornada Activa */}
      {jornadaActiva && (
        <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50 border border-blue-200/80 rounded-xl p-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Jornada Institucional Activa
                </span>
                <span className="text-xs font-mono font-semibold text-slate-500">[{jornadaActiva.codigo}]</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">{jornadaActiva.nombre}</h3>
              {jornadaActiva.descripcion && (
                <p className="text-xs text-slate-600 max-w-2xl">{jornadaActiva.descripcion}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200">
              <div className="bg-white/80 border border-slate-200 rounded-lg px-3 py-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Horario de Corte</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {jornadaActiva.horaInicio} - {jornadaActiva.horaFin} h
                </span>
              </div>
              <div className="bg-white/80 border border-slate-200 rounded-lg px-3 py-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Anticipación Mínima</span>
                <span className="font-semibold text-[#003DA5] text-sm">
                  {jornadaActiva.diasAnticipacionMinima} días hábiles
                </span>
              </div>
              <div className="bg-white/80 border border-slate-200 rounded-lg px-3 py-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Umbral Avance RP</span>
                <span className="font-semibold text-indigo-700 text-sm">
                  {jornadaActiva.diasUmbralAvance} días hábiles
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de Configuraciones */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Código / Nombre</th>
                <th className="py-3 px-4">Horario (Inicio - Fin)</th>
                <th className="py-3 px-4">Días Laborales</th>
                <th className="py-3 px-4 text-center">Anticipación Mín.</th>
                <th className="py-3 px-4 text-center">Umbral RP</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Cargando configuraciones de jornada laboral...
                  </td>
                </tr>
              ) : jornadas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No hay jornadas configuradas. Haga clic en "Nueva Jornada Laboral" para registrar una.
                  </td>
                </tr>
              ) : (
                jornadas.map((j) => {
                  const dias = Array.isArray(j.diasLaborales) ? j.diasLaborales : [1, 2, 3, 4, 5];
                  return (
                    <tr
                      key={j.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        j.activo ? 'bg-blue-50/20 font-medium' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        {j.activo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <Check className="w-3 h-3" /> Activa
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                            Inactiva
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{j.nombre}</div>
                        <div className="text-[11px] font-mono text-slate-400">{j.codigo}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-700">
                          {j.horaInicio} - {j.horaFin} h
                        </div>
                        <div className="text-[10px] text-slate-400">Corte a las {j.horaFin}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {DIAS_SEMANA.map((d) => {
                            const esLaboral = dias.includes(d.id);
                            return (
                              <span
                                key={d.id}
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  esLaboral
                                    ? 'bg-blue-100 text-[#003DA5]'
                                    : 'bg-slate-100 text-slate-300'
                                }`}
                                title={d.nombre}
                              >
                                {d.corto}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-md font-bold bg-slate-100 text-slate-700">
                          {j.diasAnticipacionMinima} d
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-md font-bold bg-slate-100 text-slate-700">
                          {j.diasUmbralAvance} d
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {!j.activo && (
                            <button
                              type="button"
                              onClick={() => activarJornada(j.id)}
                              disabled={guardando}
                              className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors"
                              title="Activar como jornada institucional"
                            >
                              Activar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => abrirEditar(j)}
                            className="p-1.5 text-slate-500 hover:text-[#003DA5] hover:bg-blue-50 rounded transition-colors"
                            title="Editar jornada"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {!j.activo && (
                            <button
                              type="button"
                              onClick={() => setJornadaAEliminar(j)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Eliminar jornada"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear / Editar */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#003DA5]" />
                <h3 className="text-sm font-bold text-slate-800">
                  {esEdicion ? 'Editar Jornada Laboral' : 'Nueva Jornada Laboral'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={guardarJornada} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Código <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formCodigo}
                    onChange={(e) => setFormCodigo(e.target.value.toUpperCase())}
                    placeholder="Ej. JORNADA_ORDINARIA"
                    disabled={esEdicion}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-[#003DA5] focus:outline-none disabled:bg-slate-100"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nombre Descriptivo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    placeholder="Ej. Jornada Institucional Sede Central"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#003DA5] focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Horas */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Hora de Inicio
                  </label>
                  <input
                    type="time"
                    value={formHoraInicio}
                    onChange={(e) => setFormHoraInicio(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-[#003DA5] focus:outline-none bg-white"
                    required
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Apertura de radicación</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Hora de Fin / Corte <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formHoraFin}
                    onChange={(e) => setFormHoraFin(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-[#003DA5] focus:outline-none bg-white"
                    required
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Límite para correr el mismo día</span>
                </div>
              </div>

              {/* Selector de Días Laborales */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Días Hábiles / Laborales de la Semana <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {DIAS_SEMANA.map((d) => {
                    const seleccionado = formDiasLaborales.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleDia(d.id)}
                        className={`py-2 px-1 rounded-lg text-center font-bold text-xs border transition-all ${
                          seleccionado
                            ? 'bg-[#003DA5] text-white border-[#003DA5] shadow-xs'
                            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600'
                        }`}
                      >
                        <div className="text-[9px] uppercase tracking-wider">{d.corto}</div>
                        <div className="text-[11px] mt-0.5">{seleccionado ? '✓' : '—'}</div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Los días seleccionados se considerarán hábiles para el conteo de términos y radicación.
                </p>
              </div>

              {/* Términos */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Anticipación Mínima (Días Hábiles)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={formDiasAnticipacion}
                    onChange={(e) => setFormDiasAnticipacion(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#003DA5] focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Menor a este valor clasifica como Extemporánea (RF-EXT-001).
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Umbral Pago Avance (Días Hábiles)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={formDiasUmbralAvance}
                    onChange={(e) => setFormDiasUmbralAvance(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#003DA5] focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Mayor o igual a este valor se expide como AVANCE en RP.
                  </span>
                </div>
              </div>

              {/* Switch Activar */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="font-bold text-slate-800 block text-xs">Jornada Activa Principal</span>
                  <span className="text-[10px] text-slate-400 block">
                    Al activar esta jornada, reemplazará a la actual como la regla oficial.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formActivo}
                    onChange={(e) => setFormActivo(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#003DA5]"></div>
                </label>
              </div>

              {/* Descripción */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción / Justificación</label>
                <textarea
                  rows={2}
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  placeholder="Detalles sobre resolución institucional o ámbito de aplicación..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#003DA5] focus:outline-none"
                />
              </div>

              {/* Botones */}
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  disabled={guardando}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-lg text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {guardando ? 'Guardando...' : esEdicion ? 'Actualizar' : 'Crear Jornada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminar */}
      {jornadaAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Eliminar Configuración</h3>
            </div>
            <p className="text-xs text-slate-600">
              ¿Está seguro de eliminar la jornada{' '}
              <strong className="text-slate-900">{jornadaAEliminar.nombre}</strong> ({jornadaAEliminar.codigo})? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setJornadaAEliminar(null)}
                disabled={guardando}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminar}
                disabled={guardando}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-sm"
              >
                {guardando ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
