import { useState, useEffect } from 'react';
import { Save, AlertCircle, Lock } from 'lucide-react';
import viaticosService from '../../services/api/viaticosService';
import { LiquidationParam } from '../../types/parametrizacion';
import { formatearMoneda } from '../../utils/viaticosUtils';

const PARAMETROS_MONETARIOS = new Set(['SMMLV_2026', 'TARIFA_TERMINAL_AEREO']);

export default function ParametrosLiquidacionAdmin() {
  const [params, setParams] = useState<Record<string, LiquidationParam>>({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await viaticosService.obtenerParametrosLiquidacion();
      const map: Record<string, LiquidationParam> = {};
      data.forEach((p) => { map[p.clave] = p; });
      setParams(map);
    } catch (e) {
      setError('Error cargando parámetros');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const cambiar = (clave: string, valor: string) => {
    setParams((prev) => ({
      ...prev,
      [clave]: { ...prev[clave], valor } as LiquidationParam,
    }));
  };

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    setExito(null);
    try {
      const dto: any = {};
      if (params['FACTOR_CONTRATISTA']) dto.factorContratista = Number(params['FACTOR_CONTRATISTA'].valor);
      if (params['FACTOR_SIN_PERNOCTA']) dto.factorSinPernocta = Number(params['FACTOR_SIN_PERNOCTA'].valor);
      if (params['CACHE_TTL_MINUTES']) dto.cacheTtlMinutes = Number(params['CACHE_TTL_MINUTES'].valor);
      if (params['TARIFA_TERMINAL_AEREO']) dto.tarifaTerminalAereo = Number(params['TARIFA_TERMINAL_AEREO'].valor);

      const res = await viaticosService.actualizarParametrosLiquidacion(dto);
      setExito(`Parámetros actualizados correctamente (${res.length} valores guardados)`);
      cargar();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Error actualizando parámetros';
      setError(msg);
    } finally {
      setGuardando(false);
    }
  };

  const getParam = (clave: string) => params[clave];

  const formatearValor = (clave: string, valor: string) => {
    const num = Number(valor);
    if (PARAMETROS_MONETARIOS.has(clave) && Number.isFinite(num)) {
      return formatearMoneda(num);
    }
    return valor;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-slate-500">Parámetros globales del cálculo de viáticos.</p>
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="inline-flex items-center gap-2 px-3 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          {guardando ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}

      {exito && (
        <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-4">
          {exito}
        </div>
      )}

      {cargando ? (
        <div className="py-10 text-center text-xs text-slate-500">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-slate-400" />
                SMMLV 2026
              </label>
              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium" title="Parámetro maestro centralizado en Auth">
                Solo Lectura (Auth)
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">$</span>
              <input
                type="text"
                readOnly
                disabled
                value={formatearMoneda(Number(getParam('SMMLV_2026')?.valor || '1423500'))}
                className="w-full pl-7 pr-3 py-2 bg-slate-100/70 border border-slate-200 rounded-xl text-xs text-right font-bold text-slate-600 cursor-not-allowed select-all"
                title="El salario mínimo se administra exclusivamente desde Ajustes Generales de Auth"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
              <span>Gestionado en <strong>Configuración General &gt; Ajustes Generales</strong></span>
            </p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Factor Contratista</label>
            <input
              type="number"
              step="0.01"
              value={getParam('FACTOR_CONTRATISTA')?.valor || '0.8'}
              onChange={(e) => cambiar('FACTOR_CONTRATISTA', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
            />
            <p className="text-[10px] text-slate-500 mt-1">{getParam('FACTOR_CONTRATISTA')?.valor || '0.8'}</p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Factor Sin Pernocta</label>
            <input
              type="number"
              step="0.01"
              value={getParam('FACTOR_SIN_PERNOCTA')?.valor || '0.5'}
              onChange={(e) => cambiar('FACTOR_SIN_PERNOCTA', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
            />
            <p className="text-[10px] text-slate-500 mt-1">{getParam('FACTOR_SIN_PERNOCTA')?.valor || '0.5'}</p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Año Vigencia Escalas</label>
            <input
              type="number"
              value={getParam('ANO_VIGENCIA_ESCALAS')?.valor || '2026'}
              onChange={(e) => cambiar('ANO_VIGENCIA_ESCALAS', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
            />
            <p className="text-[10px] text-slate-500 mt-1">{getParam('ANO_VIGENCIA_ESCALAS')?.valor || '2026'}</p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Tarifa Terminales Aéreos (Resolución de Viáticos)
            </label>
            <input
              type="number"
              value={getParam('TARIFA_TERMINAL_AEREO')?.valor || '162634'}
              onChange={(e) => cambiar('TARIFA_TERMINAL_AEREO', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              {formatearMoneda(Number(getParam('TARIFA_TERMINAL_AEREO')?.valor || '162634'))}
            </p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Cache TTL (minutos)</label>
            <input
              type="number"
              value={getParam('CACHE_TTL_MINUTES')?.valor || '5'}
              onChange={(e) => cambiar('CACHE_TTL_MINUTES', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
            />
            <p className="text-[10px] text-slate-500 mt-1">{getParam('CACHE_TTL_MINUTES')?.valor || '5'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
