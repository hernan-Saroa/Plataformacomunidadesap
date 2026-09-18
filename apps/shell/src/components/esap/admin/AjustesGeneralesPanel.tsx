import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Calendar,
  RefreshCw,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Search,
  Sparkles,
  Info,
  SlidersHorizontal,
  X,
  Save,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ajustesGeneralesService,
  type SalarioMinimoData,
  type FestivoColombia,
} from '../../../services/api/ajustesGenerales.service';

/**
 * Formateador de moneda colombiana (COP)
 */
function formatCOP(val: number): string {
  if (isNaN(val)) return '$ 0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val);
}

/**
 * Formateador de fecha amigable (ej: "Lunes, 12 de enero de 2026")
 */
function formatFechaAmigable(fechaStr: string): { fechaCorta: string; diaSemana: string; mesAnio: string } {
  if (!fechaStr) return { fechaCorta: '', diaSemana: '', mesAnio: '' };
  try {
    const [y, m, d] = fechaStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const diaSemana = dias[date.getDay()];
    const mes = meses[date.getMonth()];
    const diaNum = String(d).padStart(2, '0');

    return {
      fechaCorta: `${diaNum}/${String(m).padStart(2, '0')}/${y}`,
      diaSemana,
      mesAnio: `${diaNum} de ${mes} de ${y}`,
    };
  } catch {
    return { fechaCorta: fechaStr, diaSemana: '', mesAnio: fechaStr };
  }
}

export default function AjustesGeneralesPanel() {
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // Estado SMMLV
  const [smmlvData, setSmmlvData] = useState<SalarioMinimoData | null>(null);
  const [smmlvInput, setSmmlvInput] = useState<string>('1423500');
  const [guardandoSmmlv, setGuardandoSmmlv] = useState<boolean>(false);
  const [smmlvExito, setSmmlvExito] = useState<boolean>(false);

  // Estado Festivos
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [festivos, setFestivos] = useState<FestivoColombia[]>([]);
  const [cargandoFestivos, setCargandoFestivos] = useState<boolean>(true);
  const [sincronizando, setSincronizando] = useState<boolean>(false);
  const [filtroBusqueda, setFiltroBusqueda] = useState<string>('');

  // Modal Manual Festivo
  const [modalAbierto, setModalAbierto] = useState<boolean>(false);
  const [festivoEditando, setFestivoEditando] = useState<FestivoColombia | null>(null);
  const [formFecha, setFormFecha] = useState<string>('');
  const [formDescripcion, setFormDescripcion] = useState<string>('');
  const [formOrigen, setFormOrigen] = useState<string>('Ley 51/1983');
  const [guardandoFestivo, setGuardandoFestivo] = useState<boolean>(false);

  // 1. Cargar datos iniciales
  useEffect(() => {
    void cargarSmmlv();
    void cargarFestivos(selectedYear);
  }, []);

  useEffect(() => {
    void cargarFestivos(selectedYear);
  }, [selectedYear]);

  const cargarSmmlv = async () => {
    try {
      const data = await ajustesGeneralesService.getSalarioMinimo();
      setSmmlvData(data);
      setSmmlvInput(String(data.salarioMinimo || 1423500));
    } catch (error) {
      console.error('Error al cargar SMMLV:', error);
      setSmmlvData({
        salarioMinimo: 1423500,
        moneda: 'COP',
        anioVigente: currentYear,
        actualizadoEn: new Date().toISOString(),
      });
      setSmmlvInput('1423500');
    }
  };

  const cargarFestivos = async (year: number) => {
    setCargandoFestivos(true);
    try {
      const list = await ajustesGeneralesService.getFestivos(year);
      setFestivos(list);
    } catch (error) {
      console.error('Error al cargar festivos:', error);
      toast.error('No se pudieron cargar los festivos nacionales');
    } finally {
      setCargandoFestivos(false);
    }
  };

  // 2. Manejo de SMMLV
  const handleSmmlvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, '');
    setSmmlvInput(clean);
  };

  const handleGuardarSmmlv = async () => {
    const valor = parseInt(smmlvInput, 10);
    if (!valor || valor <= 0) {
      toast.error('Ingrese un valor monetario válido mayor a cero');
      return;
    }

    setGuardandoSmmlv(true);
    try {
      const res = await ajustesGeneralesService.updateSalarioMinimo(valor, selectedYear);
      setSmmlvData(res);
      setSmmlvExito(true);
      toast.success(`Salario Mínimo actualizado a ${formatCOP(valor)} COP`);
      setTimeout(() => setSmmlvExito(false), 3000);
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar el salario mínimo');
    } finally {
      setGuardandoSmmlv(false);
    }
  };

  // 3. Sincronización con API oficial
  const handleSincronizarFestivos = async () => {
    setSincronizando(true);
    try {
      const res = await ajustesGeneralesService.sincronizarFestivos(selectedYear);
      setFestivos(res.festivos);
      toast.success(res.mensaje || `Festivos de ${selectedYear} sincronizados`);
    } catch (error: any) {
      toast.error(error.message || 'Error al sincronizar festivos con la API oficial');
    } finally {
      setSincronizando(false);
    }
  };

  // 4. Modal Crear/Editar Festivo
  const abrirModalNuevo = () => {
    setFestivoEditando(null);
    setFormFecha(`${selectedYear}-01-01`);
    setFormDescripcion('');
    setFormOrigen('Ley 51/1983');
    setModalAbierto(true);
  };

  const abrirModalEditar = (item: FestivoColombia) => {
    setFestivoEditando(item);
    setFormFecha(item.fecha);
    setFormDescripcion(item.descripcion);
    setFormOrigen(item.origen || 'Ley 51/1983');
    setModalAbierto(true);
  };

  const handleGuardarFestivo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFecha || !formDescripcion.trim()) {
      toast.error('Complete la fecha y descripción del festivo');
      return;
    }

    setGuardandoFestivo(true);
    try {
      if (festivoEditando) {
        await ajustesGeneralesService.actualizarFestivo(festivoEditando.id, {
          fecha: formFecha,
          descripcion: formDescripcion.trim(),
          origen: formOrigen.trim(),
        });
        toast.success('Festivo actualizado exitosamente');
      } else {
        await ajustesGeneralesService.crearFestivo({
          fecha: formFecha,
          descripcion: formDescripcion.trim(),
          origen: formOrigen.trim(),
          regla: 'manual',
        });
        toast.success('Festivo creado exitosamente');
      }
      setModalAbierto(false);
      await cargarFestivos(selectedYear);
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar el festivo');
    } finally {
      setGuardandoFestivo(false);
    }
  };

  const handleEliminarFestivo = async (id: number, descripcion: string) => {
    if (!window.confirm(`¿Está seguro de eliminar el festivo "${descripcion}"?`)) {
      return;
    }

    try {
      await ajustesGeneralesService.eliminarFestivo(id);
      toast.success('Festivo eliminado');
      setFestivos((prev) => prev.filter((f) => f.id !== id));
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar el festivo');
    }
  };

  // Festivos filtrados
  const festivosFiltrados = useMemo(() => {
    if (!filtroBusqueda.trim()) return festivos;
    const q = filtroBusqueda.toLowerCase();
    return festivos.filter(
      (f) =>
        f.descripcion.toLowerCase().includes(q) ||
        f.fecha.toLowerCase().includes(q) ||
        (f.origen && f.origen.toLowerCase().includes(q)),
    );
  }, [festivos, filtroBusqueda]);

  const valorSmmlvNum = parseInt(smmlvInput, 10) || 0;
  const valorDiaSmmlv = Math.round(valorSmmlvNum / 30);

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER DECORATIVO CON GARANTÍA DE CONTRASTE */}
      <div
        className="rounded-2xl p-6 sm:p-8 shadow-lg relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #002B7A 0%, #003DA5 60%, #1E40AF 100%)',
          color: '#FFFFFF',
          border: '1px solid #1E3A8A',
        }}
      >
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className="p-3 rounded-xl shadow-inner flex items-center justify-center"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                }}
              >
                <SlidersHorizontal className="w-6 h-6 text-white" />
              </div>
              <div>
                <span
                  className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full inline-block"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                  }}
                >
                  Dato Maestro Institucional
                </span>
                <h2
                  className="text-xl sm:text-2xl font-extrabold tracking-tight mt-1"
                  style={{ color: '#FFFFFF' }}
                >
                  Ajustes Generales y Parámetros Nacionales
                </h2>
              </div>
            </div>

            <div
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#FFFFFF',
              }}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Esquema Maestro: <strong className="font-mono underline decoration-amber-300">auth</strong></span>
            </div>
          </div>

          <p
            className="text-xs sm:text-sm max-w-3xl mt-3 leading-relaxed font-normal"
            style={{ color: '#E2E8F0' }}
          >
            Gestión centralizada del Salario Mínimo Mensual Legal Vigente (SMMLV) y la tabla oficial de 
            festivos de Colombia. Estos parámetros son consumidos en tiempo real por los módulos de Viáticos 
            (cálculo de días hábiles y modalidad de pago), Contratación y Control Interno.
          </p>
        </div>
      </div>

      {/* SECCIÓN 1: SALARIO MÍNIMO LEGAL VIGENTE (CAMPO MONETARIO) */}
      <div
        className="rounded-2xl p-6 sm:p-7 shadow-sm transition-all"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
        }}
      >
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5"
          style={{ borderBottom: '1px solid #F1F5F9' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0',
              }}
            >
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3
                className="text-base sm:text-lg font-bold flex items-center gap-2"
                style={{ color: '#0F172A' }}
              >
                Salario Mínimo Mensual Legal Vigente (SMMLV)
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: '#D1FAE5',
                    color: '#065F46',
                    border: '1px solid #6EE7B7',
                  }}
                >
                  Campo Monetario
                </span>
              </h3>
              <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                Valor mensual en pesos colombianos fijado por el Gobierno Nacional.
              </p>
            </div>
          </div>

          {smmlvData?.actualizadoEn && (
            <div
              className="text-xs font-medium px-3 py-1 rounded-lg"
              style={{ backgroundColor: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0' }}
            >
              Última actualización: {new Date(smmlvData.actualizadoEn).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Input monetario */}
          <div className="lg:col-span-2 space-y-2.5">
            <label
              className="block text-xs font-bold uppercase tracking-wider"
              style={{ color: '#334155' }}
            >
              Valor Oficial Mensual (COP)
            </label>
            
            <div className="relative flex items-center max-w-lg">
              <span
                className="absolute left-4 font-bold select-none text-xl"
                style={{ color: '#003DA5' }}
              >
                $
              </span>
              <input
                type="text"
                value={valorSmmlvNum > 0 ? valorSmmlvNum.toLocaleString('es-CO') : ''}
                onChange={handleSmmlvChange}
                placeholder="1.423.500"
                className="w-full pl-9 pr-20 py-3 rounded-xl font-bold text-xl sm:text-2xl transition-all shadow-inner outline-none tracking-tight"
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '2px solid #CBD5E1',
                  color: '#0F172A',
                }}
              />
              <span
                className="absolute right-3.5 text-xs font-extrabold uppercase px-2.5 py-1 rounded-md"
                style={{
                  backgroundColor: '#E2E8F0',
                  color: '#1E293B',
                }}
              >
                COP
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs" style={{ color: '#475569' }}>
              <span
                className="px-2.5 py-1 rounded-md font-semibold"
                style={{ backgroundColor: '#F1F5F9', color: '#0F172A', border: '1px solid #E2E8F0' }}
              >
                Equivalencia diaria: <strong style={{ color: '#059669' }}>{formatCOP(valorDiaSmmlv)}</strong>
              </span>
              <span>•</span>
              <span>Vigencia aplicable: <strong>{selectedYear}</strong></span>
            </div>
          </div>

          {/* Botón de guardado */}
          <div className="flex flex-col gap-2.5 justify-end items-start lg:items-end">
            <button
              onClick={handleGuardarSmmlv}
              disabled={guardandoSmmlv}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all duration-150 w-full sm:w-auto"
              style={{
                backgroundColor: smmlvExito ? '#059669' : '#003DA5',
                color: '#FFFFFF',
                border: 'none',
              }}
            >
              {guardandoSmmlv ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Guardando...</span>
                </>
              ) : smmlvExito ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>¡Actualizado con Éxito!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-white" />
                  <span>Guardar Salario Mínimo</span>
                </>
              )}
            </button>

            <p className="text-[11px] text-left lg:text-right max-w-xs font-normal" style={{ color: '#64748B' }}>
              Los cambios se aplican de forma inmediata en las fórmulas de cálculo de viáticos y contratos.
            </p>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: CALENDARIO DE DÍAS FESTIVOS NACIONALES */}
      <div
        className="rounded-2xl p-6 sm:p-7 shadow-sm transition-all"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
        }}
      >
        {/* Cabecera con controles de año y sincronización */}
        <div
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5"
          style={{ borderBottom: '1px solid #F1F5F9' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: '#EFF6FF',
                color: '#003DA5',
                border: '1px solid #BFDBFE',
              }}
            >
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3
                className="text-base sm:text-lg font-bold flex items-center gap-2"
                style={{ color: '#0F172A' }}
              >
                Días Festivos Oficiales de Colombia
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: '#DBEAFE',
                    color: '#1E40AF',
                    border: '1px solid #93C5FD',
                  }}
                >
                  {festivos.length} festivos en {selectedYear}
                </span>
              </h3>
              <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                Dato maestro para cómputo de días hábiles en modalidad de pago (RF-PRE-003).
              </p>
            </div>
          </div>

          {/* Acciones principales: selector de año + botón de actualización */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Selector de año */}
            <div
              className="flex items-center gap-1.5 p-1 rounded-xl"
              style={{ backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0' }}
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((yr) => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all"
                  style={
                    selectedYear === yr
                      ? {
                          backgroundColor: '#003DA5',
                          color: '#FFFFFF',
                          boxShadow: '0 1px 3px rgba(0, 61, 165, 0.3)',
                        }
                      : {
                          backgroundColor: 'transparent',
                          color: '#475569',
                        }
                  }
                >
                  {yr} {yr === currentYear && '(Vigente)'}
                </button>
              ))}
            </div>

            {/* Botón de Sincronización Automática con la API */}
            <button
              onClick={handleSincronizarFestivos}
              disabled={sincronizando}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition-all"
              style={{
                backgroundColor: '#003DA5',
                color: '#FFFFFF',
                border: 'none',
              }}
              title="Llama a https://calendariosnacionales.com/co/v1/{year}/nacionales.json y actualiza la base de datos"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-white ${sincronizando ? 'animate-spin' : ''}`} />
              <span>{sincronizando ? 'Sincronizando API...' : 'Actualizar Festivos'}</span>
            </button>

            {/* Botón manual */}
            <button
              onClick={abrirModalNuevo}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all"
              style={{
                backgroundColor: '#F8FAFC',
                color: '#334155',
                border: '1px solid #CBD5E1',
              }}
            >
              <Plus className="w-3.5 h-3.5 text-slate-600" />
              <span>Nuevo Festivo</span>
            </button>
          </div>
        </div>

        {/* Barra de búsqueda y fuente */}
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
            <input
              type="text"
              value={filtroBusqueda}
              onChange={(e) => setFiltroBusqueda(e.target.value)}
              placeholder="Buscar por nombre, fecha o norma..."
              className="w-full pl-9 pr-3 py-2 rounded-lg text-xs outline-none transition-all"
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                color: '#0F172A',
              }}
            />
          </div>

          <div
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0' }}
          >
            <Info className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
            <span>Fuente oficial: <strong>Ley 51 de 1983 (Ley Emiliani)</strong> • Función Pública</span>
          </div>
        </div>

        {/* Tabla de Festivos */}
        <div
          className="mt-4 rounded-xl overflow-hidden shadow-sm"
          style={{ border: '1px solid #E2E8F0' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" style={{ borderCollapse: 'collapse' }}>
              <thead
                style={{
                  backgroundColor: '#F8FAFC',
                  color: '#334155',
                  borderBottom: '2px solid #E2E8F0',
                }}
              >
                <tr>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider">#</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider">Fecha</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider">Día</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider">Descripción del Festivo</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider">Norma / Origen</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider">Regla Aplicable</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody style={{ backgroundColor: '#FFFFFF' }}>
                {cargandoFestivos ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center" style={{ color: '#64748B' }}>
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                      Cargando festivos nacionales de {selectedYear}...
                    </td>
                  </tr>
                ) : festivosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center" style={{ color: '#64748B' }}>
                      <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-bold text-sm" style={{ color: '#0F172A' }}>
                        No se encontraron festivos para el año {selectedYear}
                      </p>
                      <p className="text-xs mt-1" style={{ color: '#64748B' }}>
                        Haga clic en el botón <strong>"Actualizar Festivos"</strong> para sincronizarlos automáticamente desde la API oficial.
                      </p>
                    </td>
                  </tr>
                ) : (
                  festivosFiltrados.map((item, idx) => {
                    const info = formatFechaAmigable(item.fecha);
                    const esEmiliani = item.regla?.includes('emiliani');
                    const esPascua = item.regla?.includes('easter');

                    return (
                      <tr
                        key={item.id || item.fecha}
                        className="transition-colors hover:bg-blue-50/40"
                        style={{ borderBottom: '1px solid #F1F5F9' }}
                      >
                        <td className="py-3 px-4 font-mono font-semibold" style={{ color: '#94A3B8' }}>
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold" style={{ color: '#0F172A' }}>
                          {item.fecha}
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          <span
                            className="px-2.5 py-0.5 rounded-md font-medium"
                            style={{
                              backgroundColor: '#F1F5F9',
                              color: '#1E293B',
                              border: '1px solid #E2E8F0',
                            }}
                          >
                            {info.diaSemana}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-sm" style={{ color: '#0F172A' }}>
                          {item.descripcion}
                        </td>
                        <td className="py-3 px-4 font-medium" style={{ color: '#64748B' }}>
                          {item.origen || 'Ley 51/1983'}
                        </td>
                        <td className="py-3 px-4">
                          {esEmiliani ? (
                            <span
                              className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                              style={{
                                backgroundColor: '#FAF5FF',
                                color: '#7E22CE',
                                border: '1px solid #E9D5FF',
                              }}
                            >
                              Ley Emiliani (Lunes)
                            </span>
                          ) : esPascua ? (
                            <span
                              className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                              style={{
                                backgroundColor: '#FFFBEB',
                                color: '#B45309',
                                border: '1px solid #FDE68A',
                              }}
                            >
                              Semana Santa
                            </span>
                          ) : (
                            <span
                              className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                              style={{
                                backgroundColor: '#F0FDF4',
                                color: '#15803D',
                                border: '1px solid #BBF7D0',
                              }}
                            >
                              Fecha Fija
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => abrirModalEditar(item)}
                              className="p-1.5 rounded-lg transition-colors hover:bg-blue-50"
                              style={{ color: '#003DA5' }}
                              title="Editar festivo"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEliminarFestivo(item.id, item.descripcion)}
                              className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                              style={{ color: '#DC2626' }}
                              title="Eliminar festivo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
      </div>

      {/* MODAL CREAR / EDITAR FESTIVO MANUAL */}
      <AnimatePresence>
        {modalAbierto && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0' }}
            >
              <button
                onClick={() => setModalAbierto(false)}
                className="absolute right-4 top-4 p-1.5 rounded-lg transition-colors hover:bg-slate-100"
                style={{ color: '#64748B' }}
              >
                <X className="w-4 h-4" />
              </button>

              <h4
                className="text-base font-bold flex items-center gap-2"
                style={{ color: '#0F172A' }}
              >
                <Calendar className="w-4 h-4 text-blue-600" />
                {festivoEditando ? 'Editar Festivo' : 'Nuevo Festivo'}
              </h4>
              <p className="text-xs mt-1" style={{ color: '#64748B' }}>
                Ajuste manual para días festivos o cívicos en el catálogo maestro.
              </p>

              <form onSubmit={handleGuardarFestivo} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#334155' }}>
                    Fecha (YYYY-MM-DD)
                  </label>
                  <input
                    type="date"
                    value={formFecha}
                    onChange={(e) => setFormFecha(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{
                      border: '1px solid #CBD5E1',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#334155' }}>
                    Nombre / Descripción
                  </label>
                  <input
                    type="text"
                    value={formDescripcion}
                    onChange={(e) => setFormDescripcion(e.target.value)}
                    placeholder="Ej. Día Cívico Extraordinario"
                    required
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{
                      border: '1px solid #CBD5E1',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#334155' }}>
                    Norma u Origen Jurídico
                  </label>
                  <input
                    type="text"
                    value={formOrigen}
                    onChange={(e) => setFormOrigen(e.target.value)}
                    placeholder="Ej. Decreto Presidencial 0123 de 2026"
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{
                      border: '1px solid #CBD5E1',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                </div>

                <div
                  className="flex items-center justify-end gap-2 pt-4"
                  style={{ borderTop: '1px solid #F1F5F9' }}
                >
                  <button
                    type="button"
                    onClick={() => setModalAbierto(false)}
                    className="px-4 py-2 text-xs font-bold rounded-lg transition-colors hover:bg-slate-100"
                    style={{ color: '#475569', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardandoFestivo}
                    className="px-4 py-2 text-xs font-bold rounded-lg shadow-sm"
                    style={{ backgroundColor: '#003DA5', color: '#FFFFFF', border: 'none' }}
                  >
                    {guardandoFestivo ? 'Guardando...' : 'Guardar Festivo'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
