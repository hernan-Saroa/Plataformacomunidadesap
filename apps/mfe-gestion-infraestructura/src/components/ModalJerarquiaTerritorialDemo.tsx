import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin, Building, Home, Layers, ArrowRight, CheckCircle2,
  Info, AlertTriangle, X, Compass, Globe, Sparkles, Filter,
  ChevronRight, BookmarkCheck, FileText, CornerDownRight
} from 'lucide-react';
import { infraestructuraService } from '../services/infraestructuraService';

interface ModalJerarquiaTerritorialDemoProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModalJerarquiaTerritorialDemo: React.FC<ModalJerarquiaTerritorialDemoProps> = ({
  isOpen,
  onClose,
}) => {
  const [tabActivo, setTabActivo] = useState<'propuesto' | 'actual' | 'comparativa'>('propuesto');
  const [cargando, setCargando] = useState<boolean>(true);
  const [datos, setDatos] = useState<{ sedesActuales: any[]; territorialesNacionales: any[] }>({
    sedesActuales: [],
    territorialesNacionales: [],
  });

  // Estado para la Pestaña 1: Esquema Actual (Sede -> Bloque -> Espacio)
  const [sedeActualId, setSedeActualId] = useState<string>('');
  const [bloqueActualId, setBloqueActualId] = useState<string>('');
  const [espacioActualId, setEspacioActualId] = useState<string>('');

  // Estado para la Pestaña 2: Esquema Propuesto (Territorial -> CETAP -> Dependencia/Bloque -> Espacio)
  const [territorialId, setTerritorialId] = useState<string>('');
  const [cetapId, setCetapId] = useState<string>('');
  const [bloquePropuesto, setBloquePropuesto] = useState<string>('BLQ-01');
  const [espacioPropuesto, setEspacioPropuesto] = useState<string>('ESP-TIC');

  useEffect(() => {
    if (!isOpen) return;
    let cancelado = false;
    setCargando(true);
    infraestructuraService
      .getJerarquiaSedesDemo()
      .then((res) => {
        if (cancelado) return;
        setDatos(res);
        // Pre-seleccionar Sede Central en el actual
        if (res.sedesActuales && res.sedesActuales.length > 0) {
          const central = res.sedesActuales.find((s: any) => s.codigo === 'SEDE-CENTRAL') || res.sedesActuales[0];
          setSedeActualId(central.idSede);
          if (central.bloques && central.bloques.length > 0) {
            setBloqueActualId(central.bloques[0].idBloque);
            if (central.bloques[0].espacios && central.bloques[0].espacios.length > 0) {
              setEspacioActualId(central.bloques[0].espacios[0].idEspacio);
            }
          }
        }
        // Pre-seleccionar Atlántico o Antioquia en el propuesto
        if (res.territorialesNacionales && res.territorialesNacionales.length > 0) {
          const atl = res.territorialesNacionales.find((t: any) => t.nombre.toLowerCase().includes('atl')) || res.territorialesNacionales[0];
          setTerritorialId(atl.id);
          if (atl.cetaps && atl.cetaps.length > 0) {
            setCetapId(atl.cetaps[0].id);
          }
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [isOpen]);

  // Derivados Esquema Actual
  const sedeSeleccionada = useMemo(() => {
    return datos.sedesActuales.find((s) => s.idSede === sedeActualId) || null;
  }, [datos.sedesActuales, sedeActualId]);

  const bloquesActuales = useMemo(() => {
    return sedeSeleccionada?.bloques || [];
  }, [sedeSeleccionada]);

  const bloqueSeleccionado = useMemo(() => {
    return bloquesActuales.find((b: any) => b.idBloque === bloqueActualId) || null;
  }, [bloquesActuales, bloqueActualId]);

  const espaciosActuales = useMemo(() => {
    return bloqueSeleccionado?.espacios || [];
  }, [bloqueSeleccionado]);

  const espacioSeleccionado = useMemo(() => {
    return espaciosActuales.find((e: any) => e.idEspacio === espacioActualId) || null;
  }, [espaciosActuales, espacioActualId]);

  // Derivados Esquema Propuesto
  const territorialSeleccionada = useMemo(() => {
    return datos.territorialesNacionales.find((t) => t.id === territorialId) || null;
  }, [datos.territorialesNacionales, territorialId]);

  const cetapsDisponibles = useMemo(() => {
    return territorialSeleccionada?.cetaps || [];
  }, [territorialSeleccionada]);

  const cetapSeleccionado = useMemo(() => {
    return cetapsDisponibles.find((c: any) => c.id === cetapId) || null;
  }, [cetapsDisponibles, cetapId]);

  const opcionesBloquePropuesto = [
    { id: 'BLQ-01', nombre: 'Bloque Aulas y Laboratorios Principal' },
    { id: 'BLQ-02', nombre: 'Sede Administrativa / Decanatura Territorial' },
    { id: 'BLQ-03', nombre: 'Módulo de Servicios Comunes y Bienestar' },
  ];

  const opcionesEspacioPropuesto = [
    { id: 'ESP-TIC', nombre: 'Laboratorio TIC y Sistemas', piso: 2, tipo: 'LABORATORIO' },
    { id: 'ESP-AUD', nombre: 'Auditorio Institucional Magistral', piso: 1, tipo: 'AUDITORIO' },
    { id: 'ESP-OFI', nombre: 'Oficina Coordinación Territorial', piso: 1, tipo: 'OFICINA' },
    { id: 'ESP-AUL', nombre: 'Aula de Posgrados 201', piso: 2, tipo: 'AULA' },
    { id: 'ESP-BA', nombre: 'Batería de Baños Estudiantes Módulo Norte', piso: 1, tipo: 'LOCATIVO' },
  ];

  const espacioPropuestoSeleccionado = opcionesEspacioPropuesto.find((e) => e.id === espacioPropuesto);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 border border-blue-400/30 rounded-xl backdrop-blur-md">
              <Compass className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Simulador de Jerarquía y Estructura Territorial</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-400/20 text-blue-200 border border-blue-400/30">
                  Fase 4 · Req. #8
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Evaluación comparativa: Modelo Actual UMI vs. Modelo Jerárquico Nacional (Territorial ➔ CETAP ➔ Bloque ➔ Espacio)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Pestañas */}
        <div className="px-6 border-b border-slate-200 bg-slate-50 flex items-center gap-2 pt-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setTabActivo('propuesto')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
              tabActivo === 'propuesto'
                ? 'border-blue-600 text-blue-700 bg-white shadow-sm'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Globe className="w-4 h-4 text-blue-600" />
            <span>1. Modelo Propuesto Nacional (Territorial ➔ CETAP)</span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
              Recomendado
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTabActivo('actual')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
              tabActivo === 'actual'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-sm'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building className="w-4 h-4 text-indigo-600" />
            <span>2. Modelo Actual UMI (Sede ➔ Bloque ➔ Espacio)</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActivo('comparativa')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
              tabActivo === 'comparativa'
                ? 'border-amber-600 text-amber-700 bg-white shadow-sm'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-600" />
            <span>3. Matriz y Puntos para tu Reunión</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {cargando ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold">Cargando jerarquías y datos territoriales...</p>
            </div>
          ) : (
            <>
              {/* ========================================================= */}
              {/* PESTAÑA 1: MODELO PROPUESTO (TERRITORIAL -> CETAP -> BLOQUE -> ESPACIO) */}
              {/* ========================================================= */}
              {tabActivo === 'propuesto' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-700 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-blue-950 leading-relaxed">
                      <p className="font-bold text-sm text-blue-900 mb-0.5">
                        Simulación de Radicación en Cascada a Nivel Nacional
                      </p>
                      Este esquema resuelve el caso que planteaste: el solicitante parte de la{' '}
                      <strong>Dirección Territorial</strong>, selecciona el <strong>Municipio / CETAP local</strong>, luego el{' '}
                      <strong>Edificio / Bloque</strong> y finalmente el <strong>Espacio exacto</strong> donde se originó el daño.
                    </div>
                  </div>

                  {/* Selectores en Cascada */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Nivel 1: Territorial */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-blue-600" />
                        1. Territorial ({datos.territorialesNacionales.length})
                      </label>
                      <select
                        value={territorialId}
                        onChange={(e) => {
                          const tId = e.target.value;
                          setTerritorialId(tId);
                          const terr = datos.territorialesNacionales.find((t) => t.id === tId);
                          if (terr && terr.cetaps && terr.cetaps.length > 0) {
                            setCetapId(terr.cetaps[0].id);
                          } else {
                            setCetapId('');
                          }
                        }}
                        className="w-full text-xs font-semibold px-2.5 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-800"
                      >
                        {datos.territorialesNacionales.map((t: any) => (
                          <option key={t.id} value={t.id}>
                            {t.nombre} {t.codigo ? `(${t.codigo})` : ''} · {t.num_cetaps} CETAPs
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400">Dirección regional de la ESAP</p>
                    </div>

                    {/* Nivel 2: CETAP / Municipio */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                        2. CETAP / Sede Local ({cetapsDisponibles.length})
                      </label>
                      <select
                        value={cetapId}
                        onChange={(e) => setCetapId(e.target.value)}
                        disabled={cetapsDisponibles.length === 0}
                        className="w-full text-xs font-semibold px-2.5 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-slate-800 disabled:opacity-50"
                      >
                        {cetapsDisponibles.length === 0 ? (
                          <option value="">Sin CETAPs registrados</option>
                        ) : (
                          cetapsDisponibles.map((c: any) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre} ({c.municipio})
                            </option>
                          ))
                        )}
                      </select>
                      <p className="text-[10px] text-slate-400">Centro municipal o subsede</p>
                    </div>

                    {/* Nivel 3: Bloque / Edificio */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-amber-600" />
                        3. Bloque / Edificio
                      </label>
                      <select
                        value={bloquePropuesto}
                        onChange={(e) => setBloquePropuesto(e.target.value)}
                        className="w-full text-xs font-semibold px-2.5 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 text-slate-800"
                      >
                        {opcionesBloquePropuesto.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.nombre}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400">Edificio físico del CETAP</p>
                    </div>

                    {/* Nivel 4: Espacio Específico */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-emerald-600" />
                        4. Espacio Físico / Salón
                      </label>
                      <select
                        value={espacioPropuesto}
                        onChange={(e) => setEspacioPropuesto(e.target.value)}
                        className="w-full text-xs font-semibold px-2.5 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 text-slate-800"
                      >
                        {opcionesEspacioPropuesto.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.nombre} (Piso {e.piso})
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400">Punto exacto de la intervención</p>
                    </div>
                  </div>

                  {/* Visualizador de la Cadena Jerárquica Resultante */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-blue-400" />
                        Cadena de Ubicación Resultante en la Solicitud
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Precisión Máxima
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 font-mono text-xs sm:text-sm text-blue-100 flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white bg-blue-600/40 px-2 py-1 rounded">
                        {territorialSeleccionada?.nombre || 'Territorial'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-blue-300 flex-shrink-0" />
                      <span className="font-bold text-indigo-200 bg-indigo-600/40 px-2 py-1 rounded">
                        {cetapSeleccionado?.nombre || 'CETAP Municipal'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-blue-300 flex-shrink-0" />
                      <span className="text-amber-200 bg-amber-600/30 px-2 py-1 rounded">
                        {opcionesBloquePropuesto.find((b) => b.id === bloquePropuesto)?.nombre}
                      </span>
                      <ChevronRight className="w-4 h-4 text-blue-300 flex-shrink-0" />
                      <span className="text-emerald-200 font-bold bg-emerald-600/30 px-2 py-1 rounded">
                        Piso {espacioPropuestoSeleccionado?.piso} · {espacioPropuestoSeleccionado?.nombre}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 pt-1 flex items-center gap-2">
                      <CornerDownRight className="w-3.5 h-3.5 text-blue-400" />
                      <span>
                        <strong>Beneficio clave:</strong> El técnico UMI o contratista local sabe inmediatamente a qué municipio desplazarse y a qué salón ingresar sin tener que llamar al funcionario.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* PESTAÑA 2: MODELO ACTUAL UMI (SEDE -> BLOQUE -> ESPACIO) */}
              {/* ========================================================= */}
              {tabActivo === 'actual' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 flex items-start gap-3">
                    <Info className="w-5 h-5 text-indigo-700 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-indigo-950 leading-relaxed">
                      <p className="font-bold text-sm text-indigo-900 mb-0.5">
                        Estructura Actual en Base de Datos (Módulo Infraestructura)
                      </p>
                      Actualmente la tabla <code>infrastructure-management.sede</code> tiene 7 sedes planas. Las
                      sedes de Bogotá tienen bloques detallados, mientras que las Territoriales no tienen CETAPs y
                      están marcadas con <code>alcance_umi = false</code>.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Sede Actual */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-indigo-600" />
                        1. Sede Actual ({datos.sedesActuales.length})
                      </label>
                      <select
                        value={sedeActualId}
                        onChange={(e) => {
                          const sId = e.target.value;
                          setSedeActualId(sId);
                          const s = datos.sedesActuales.find((x) => x.idSede === sId);
                          if (s && s.bloques && s.bloques.length > 0) {
                            setBloqueActualId(s.bloques[0].idBloque);
                            if (s.bloques[0].espacios && s.bloques[0].espacios.length > 0) {
                              setEspacioActualId(s.bloques[0].espacios[0].idEspacio);
                            }
                          } else {
                            setBloqueActualId('');
                            setEspacioActualId('');
                          }
                        }}
                        className="w-full text-xs font-semibold px-2.5 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-slate-800"
                      >
                        {datos.sedesActuales.map((s: any) => (
                          <option key={s.idSede} value={s.idSede}>
                            {s.nombre} ({s.tipo}) {s.alcanceUmi ? '· [UMI OK]' : '· [Sin Alcance UMI]'}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400">
                        Alcance UMI:{' '}
                        <span className={sedeSeleccionada?.alcanceUmi ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                          {sedeSeleccionada?.alcanceUmi ? 'Habilitado en Radicación' : 'Bloqueado para Solicitudes'}
                        </span>
                      </p>
                    </div>

                    {/* Bloque Actual */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-amber-600" />
                        2. Bloque / Edificio ({bloquesActuales.length})
                      </label>
                      <select
                        value={bloqueActualId}
                        onChange={(e) => {
                          const bId = e.target.value;
                          setBloqueActualId(bId);
                          const b = bloquesActuales.find((x: any) => x.idBloque === bId);
                          if (b && b.espacios && b.espacios.length > 0) {
                            setEspacioActualId(b.espacios[0].idEspacio);
                          } else {
                            setEspacioActualId('');
                          }
                        }}
                        disabled={bloquesActuales.length === 0}
                        className="w-full text-xs font-semibold px-2.5 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 text-slate-800 disabled:opacity-50"
                      >
                        {bloquesActuales.length === 0 ? (
                          <option value="">Sin bloques creados</option>
                        ) : (
                          bloquesActuales.map((b: any) => (
                            <option key={b.idBloque} value={b.idBloque}>
                              {b.nombre} ({b.codigo}) · {b.pisos} pisos
                            </option>
                          ))
                        )}
                      </select>
                      <p className="text-[10px] text-slate-400">Estructura física ligada</p>
                    </div>

                    {/* Espacio Actual */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Home className="w-3.5 h-3.5 text-emerald-600" />
                        3. Espacio Físico ({espaciosActuales.length})
                      </label>
                      <select
                        value={espacioActualId}
                        onChange={(e) => setEspacioActualId(e.target.value)}
                        disabled={espaciosActuales.length === 0}
                        className="w-full text-xs font-semibold px-2.5 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 text-slate-800 disabled:opacity-50"
                      >
                        {espaciosActuales.length === 0 ? (
                          <option value="">Sin espacios creados</option>
                        ) : (
                          espaciosActuales.map((e: any) => (
                            <option key={e.idEspacio} value={e.idEspacio}>
                              {e.nombre} (Piso {e.piso}) · {e.tipo}
                            </option>
                          ))
                        )}
                      </select>
                      <p className="text-[10px] text-slate-400">Salón, oficina o laboratorio</p>
                    </div>
                  </div>

                  {/* Breadcrumb Actual */}
                  <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-mono text-xs flex items-center gap-2">
                    <span className="font-bold text-indigo-700">{sedeSeleccionada?.nombre || 'Sede'}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                    <span>{bloqueSeleccionado?.nombre || 'Bloque'}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                    <span className="font-bold text-emerald-700">
                      Piso {espacioSeleccionado?.piso ?? '—'} · {espacioSeleccionado?.nombre || 'Espacio'}
                    </span>
                  </div>

                  {/* Alerta de limitación */}
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Limitación del modelo actual:</strong> Si seleccionas <em>Territorial Santander</em>, no hay forma de saber si el daño ocurrió en el CETAP de Barrancabermeja, San Gil o Bucaramanga, porque el modelo actual no contempla los municipios/CETAPs intermedios.
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* PESTAÑA 3: MATRIZ Y PUNTOS CLAVE PARA LA REUNIÓN */}
              {/* ========================================================= */}
              {tabActivo === 'comparativa' && (
                <div className="space-y-6 animate-in fade-in duration-200 text-xs">
                  <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
                    <h4 className="text-sm font-bold text-blue-300 flex items-center gap-2">
                      <BookmarkCheck className="w-4 h-4 text-blue-400" />
                      Propuesta de Estandarización para la Mesa Técnica
                    </h4>
                    <p className="text-slate-300 leading-relaxed">
                      Lleva estos tres puntos estratégicos a tu reunión para definir el estándar institucional definitivo:
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <th className="p-3 w-1/4">Aspecto</th>
                          <th className="p-3 w-1/3 text-indigo-900 bg-indigo-50/50">Modelo Actual (UMI)</th>
                          <th className="p-3 w-5/12 text-blue-900 bg-blue-50/50">Modelo Propuesto (Nacional)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="p-3 font-bold text-slate-800">Cadena de Selección</td>
                          <td className="p-3 text-slate-600 bg-indigo-50/20">
                            Sede ➔ Bloque ➔ Espacio (3 niveles)
                          </td>
                          <td className="p-3 text-emerald-800 font-semibold bg-blue-50/20">
                            Territorial ➔ Sede/CETAP ➔ Bloque ➔ Espacio (4 niveles)
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-bold text-slate-800">Cobertura Municipal</td>
                          <td className="p-3 text-rose-700 bg-indigo-50/20">
                            Solo Bogotá (Central, Rosales, Teusaquillo). Territoriales bloqueadas por <code>alcance_umi=false</code>.
                          </td>
                          <td className="p-3 text-emerald-800 font-semibold bg-blue-50/20">
                            Cobertura total: 16 Territoriales y más de 200 CETAPs en Colombia ya existentes en el esquema académico.
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-bold text-slate-800">Homologación</td>
                          <td className="p-3 text-slate-600 bg-indigo-50/20">
                            Tabla aislada con solo 7 sedes creadas manualmente.
                          </td>
                          <td className="p-3 text-emerald-800 font-semibold bg-blue-50/20">
                            Unificada con <code>academic_work_plan.Territorial</code> y <code>Sede</code>, garantizando un solo catálogo maestro institucional.
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-bold text-slate-800">Asignación de Técnicos</td>
                          <td className="p-3 text-slate-600 bg-indigo-50/20">
                            Técnicos centralizados en Bogotá.
                          </td>
                          <td className="p-3 text-emerald-800 font-semibold bg-blue-50/20">
                            Permite asignar técnicos locales por Dirección Territorial o cuadrillas itinerantes.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2">
                    <p className="font-bold text-sm text-amber-900 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-amber-700" />
                      Pregunta Clave para la Reunión:
                    </p>
                    <p className="leading-relaxed">
                      <em>"¿Deseamos que el formulario de radicación en regiones permita seleccionar directamente el CETAP municipal (ej. CETAP Ciénaga en Atlántico-Magdalena) o nos quedamos radicando solo a nombre general de la Territorial?"</em>
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Datos en tiempo real consultados de la base de datos de la plataforma ESAP</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm"
          >
            Cerrar Simulador
          </button>
        </div>
      </div>
    </div>
  );
};
