import { useState, useMemo } from 'react';
import { X, Download, Filter } from 'lucide-react';
import { Button } from '@esap-mfe/shared-ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@esap-mfe/shared-ui/dialog';

interface ExpedienteParaFiltro {
  medioControl?: string;
  fechaAdmision?: string | Date;
  provisionContable?: number;
  nivelRiesgo?: string;
  ubicacionFisica?: string;
  estado?: string;
  [key: string]: any;
}

interface FiltrosReporte {
  medioControl: string;
  fechaAdmisionDesde: string;
  fechaAdmisionHasta: string;
  provisionMin: string;
  provisionMax: string;
  nivelRiesgo: string[];
  sedeTerritoriales: string;
  estado: 'TODOS' | 'ACTIVO' | 'INACTIVO';
}

interface Props {
  open: boolean;
  onClose: () => void;
  expedientes: ExpedienteParaFiltro[];
  filtroTipoActual: string;
  nombreTipoActual: string;
  onGenerar: (expedientesFiltrados: ExpedienteParaFiltro[], descripcionFiltros: string) => void;
}

const NIVELES_RIESGO = ['EXTREMO', 'ALTO', 'MODERADO', 'BAJO'];

const RANGOS_PROVISION = [
  { label: 'Sin provisión', min: 0, max: 0 },
  { label: 'Menos de $50M', min: 1, max: 50_000_000 },
  { label: '$50M – $200M', min: 50_000_001, max: 200_000_000 },
  { label: '$200M – $1.000M', min: 200_000_001, max: 1_000_000_000 },
  { label: 'Más de $1.000M', min: 1_000_000_001, max: Infinity },
];

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

export function ModalFiltrosReporte({ open, onClose, expedientes, filtroTipoActual, nombreTipoActual, onGenerar }: Props) {
  const [filtros, setFiltros] = useState<FiltrosReporte>({
    medioControl: 'TODOS',
    fechaAdmisionDesde: '',
    fechaAdmisionHasta: '',
    provisionMin: '',
    provisionMax: '',
    nivelRiesgo: [],
    sedeTerritoriales: 'TODAS',
    estado: 'TODOS',
  });

  const mediosControlDisponibles = useMemo(() => {
    const valores = expedientes
      .map(e => e.medioControl)
      .filter((v): v is string => !!v);
    return ['TODOS', ...Array.from(new Set(valores)).sort()];
  }, [expedientes]);

  const sedesDisponibles = useMemo(() => {
    const valores = expedientes
      .map(e => e.ubicacionFisica)
      .filter((v): v is string => !!v);
    return ['TODAS', ...Array.from(new Set(valores)).sort()];
  }, [expedientes]);

  const set = (campo: keyof FiltrosReporte, valor: any) =>
    setFiltros(prev => ({ ...prev, [campo]: valor }));

  const toggleNivelRiesgo = (nivel: string) => {
    setFiltros(prev => ({
      ...prev,
      nivelRiesgo: prev.nivelRiesgo.includes(nivel)
        ? prev.nivelRiesgo.filter(n => n !== nivel)
        : [...prev.nivelRiesgo, nivel],
    }));
  };

  const expedientesFiltrados = useMemo(() => {
    return expedientes.filter(exp => {
      // Medio de control
      if (filtros.medioControl !== 'TODOS' && exp.medioControl !== filtros.medioControl) return false;

      // Fecha de admisión
      if (filtros.fechaAdmisionDesde || filtros.fechaAdmisionHasta) {
        const fecha = exp.fechaAdmision ? new Date(exp.fechaAdmision) : null;
        if (!fecha) return false;
        if (filtros.fechaAdmisionDesde && fecha < new Date(filtros.fechaAdmisionDesde)) return false;
        if (filtros.fechaAdmisionHasta && fecha > new Date(filtros.fechaAdmisionHasta + 'T23:59:59')) return false;
      }

      // Provisión contable
      const pMin = filtros.provisionMin ? Number(filtros.provisionMin) : null;
      const pMax = filtros.provisionMax ? Number(filtros.provisionMax) : null;
      if (pMin !== null && (exp.provisionContable ?? 0) < pMin) return false;
      if (pMax !== null && (exp.provisionContable ?? 0) > pMax) return false;

      // Nivel de riesgo
      if (filtros.nivelRiesgo.length > 0) {
        const nivel = (exp.nivelRiesgo || '').toUpperCase();
        const coincide = filtros.nivelRiesgo.some(n => nivel.includes(n));
        if (!coincide) return false;
      }

      // Sede territorial
      if (filtros.sedeTerritoriales !== 'TODAS' && exp.ubicacionFisica !== filtros.sedeTerritoriales) return false;

      // Estado
      if (filtros.estado !== 'TODOS') {
        const esActivo = (exp.estado || 'ACTIVO') === 'ACTIVO';
        if (filtros.estado === 'ACTIVO' && !esActivo) return false;
        if (filtros.estado === 'INACTIVO' && esActivo) return false;
      }

      return true;
    });
  }, [expedientes, filtros]);

  const limpiarFiltros = () => {
    setFiltros({
      medioControl: 'TODOS',
      fechaAdmisionDesde: '',
      fechaAdmisionHasta: '',
      provisionMin: '',
      provisionMax: '',
      nivelRiesgo: [],
      sedeTerritoriales: 'TODAS',
      estado: 'TODOS',
    });
  };

  const handleGenerar = () => {
    const partes: string[] = [`Tipo: ${nombreTipoActual}`];
    if (filtros.medioControl !== 'TODOS') partes.push(`Medio: ${filtros.medioControl}`);
    if (filtros.fechaAdmisionDesde || filtros.fechaAdmisionHasta) {
      partes.push(`Admisión: ${filtros.fechaAdmisionDesde || '...'} – ${filtros.fechaAdmisionHasta || '...'}`);
    }
    if (filtros.nivelRiesgo.length > 0) partes.push(`Riesgo: ${filtros.nivelRiesgo.join(', ')}`);
    if (filtros.sedeTerritoriales !== 'TODAS') partes.push(`Sede: ${filtros.sedeTerritoriales}`);
    if (filtros.estado !== 'TODOS') partes.push(`Estado: ${filtros.estado}`);

    onGenerar(expedientesFiltrados, partes.join(' | '));
    onClose();
  };

  const coloresSemaforo: Record<string, string> = {
    EXTREMO: 'bg-red-100 border-red-400 text-red-800',
    ALTO: 'bg-orange-100 border-orange-400 text-orange-800',
    MODERADO: 'bg-yellow-100 border-yellow-400 text-yellow-800',
    BAJO: 'bg-green-100 border-green-400 text-green-800',
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#003DA5]">
            <Filter className="w-5 h-5" />
            Filtros del Reporte
          </DialogTitle>
        </DialogHeader>

        {/* Contexto de tipo de proceso */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm">
          <span className="text-blue-600 font-semibold">Tipo de proceso base:</span>{' '}
          <span className="font-bold text-blue-800">{nombreTipoActual}</span>
          <span className="text-blue-500 ml-2">({expedientes.length} expedientes)</span>
        </div>

        <div className="space-y-5 mt-2">

          {/* Medio de Control */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Medio de Control</label>
            <select
              value={filtros.medioControl}
              onChange={e => set('medioControl', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {mediosControlDisponibles.map(m => (
                <option key={m} value={m}>{m === 'TODOS' ? 'Todos los medios de control' : m}</option>
              ))}
            </select>
          </div>

          {/* Fecha de Admisión */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fecha de Admisión</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Desde</label>
                <input
                  type="date"
                  value={filtros.fechaAdmisionDesde}
                  onChange={e => set('fechaAdmisionDesde', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                <input
                  type="date"
                  value={filtros.fechaAdmisionHasta}
                  onChange={e => set('fechaAdmisionHasta', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Provisión Contable */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Provisión Contable (COP)</label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {RANGOS_PROVISION.map(rango => {
                const activo =
                  filtros.provisionMin === String(rango.min) &&
                  filtros.provisionMax === (rango.max === Infinity ? '' : String(rango.max));
                return (
                  <button
                    key={rango.label}
                    type="button"
                    onClick={() => {
                      set('provisionMin', String(rango.min));
                      set('provisionMax', rango.max === Infinity ? '' : String(rango.max));
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      activo
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
                    }`}
                  >
                    {rango.label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Mínimo personalizado</label>
                <input
                  type="number"
                  placeholder="Ej: 10000000"
                  value={filtros.provisionMin}
                  onChange={e => set('provisionMin', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Máximo personalizado</label>
                <input
                  type="number"
                  placeholder="Sin límite"
                  value={filtros.provisionMax}
                  onChange={e => set('provisionMax', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Probabilidad de Fallo (Nivel de Riesgo) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Probabilidad de Fallo</label>
            <div className="flex flex-wrap gap-2">
              {NIVELES_RIESGO.map(nivel => (
                <button
                  key={nivel}
                  type="button"
                  onClick={() => toggleNivelRiesgo(nivel)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                    filtros.nivelRiesgo.includes(nivel)
                      ? coloresSemaforo[nivel] + ' border-2'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {nivel}
                </button>
              ))}
              {filtros.nivelRiesgo.length > 0 && (
                <button
                  type="button"
                  onClick={() => set('nivelRiesgo', [])}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-400 hover:text-gray-600"
                >
                  Limpiar
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">Si no seleccionas ninguno, se incluyen todos los niveles.</p>
          </div>

          {/* Sede Territorial */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sede Territorial</label>
            <select
              value={filtros.sedeTerritoriales}
              onChange={e => set('sedeTerritoriales', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {sedesDisponibles.map(s => (
                <option key={s} value={s}>{s === 'TODAS' ? 'Todas las sedes' : s}</option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estado del proceso</label>
            <div className="flex gap-3">
              {(['TODOS', 'ACTIVO', 'INACTIVO'] as const).map(op => (
                <button
                  key={op}
                  type="button"
                  onClick={() => set('estado', op)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                    filtros.estado === op
                      ? op === 'ACTIVO'
                        ? 'bg-green-600 border-green-600 text-white'
                        : op === 'INACTIVO'
                        ? 'bg-gray-500 border-gray-500 text-white'
                        : 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
                  }`}
                >
                  {op === 'TODOS' ? 'Todos' : op === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer con conteo y acciones */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className={`text-sm font-semibold mb-4 px-3 py-2 rounded-lg ${
            expedientesFiltrados.length === 0
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {expedientesFiltrados.length === 0
              ? 'Ningún expediente coincide con los filtros seleccionados.'
              : `${expedientesFiltrados.length} expediente${expedientesFiltrados.length !== 1 ? 's' : ''} se incluirán en el reporte.`}
          </div>

          <div className="flex gap-3 justify-between">
            <Button
              variant="outline"
              onClick={limpiarFiltros}
              className="text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              Limpiar filtros
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleGenerar}
                disabled={expedientesFiltrados.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4 mr-1" />
                Generar Reporte
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
