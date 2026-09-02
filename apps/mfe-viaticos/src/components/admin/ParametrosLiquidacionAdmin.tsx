import { useState, useEffect } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import viaticosService from '../../services/api/viaticosService';
import { LiquidationParam } from '../../types/parametrizacion';
import { formatearMoneda, soloNumeros } from '../../utils/viaticosUtils';

const PARAMETROS_MONETARIOS = new Set(['SMMLV_2026']);

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

  useEffect(() => { cargar(); }, []);

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
      if (params['SMMLV_2026']) dto.smmlv = Number(params['SMMLV_2026'].valor);
      if (params['FACTOR_CONTRATISTA']) dto.factorContratista = Number(params['FACTOR_CONTRATISTA'].valor);
      if (params['FACTOR_SIN_PERNOCTA']) dto.factorSinPernocta = Number(params['FACTOR_SIN_PERNOCTA'].valor);
      if (params['CACHE_TTL_MINUTES']) dto.cacheTtlMinutes = Number(params['CACHE_TTL_MINUTES'].valor);

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
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">SMMLV 2026</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={formatearMoneda(Number(getParam('SMMLV_2026')?.valor || '1423500'))}
                onChange={(e) => cambiar('SMMLV_2026', String(Number(soloNumeros(e.target.value)) || 0))}
                className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-right font-bold"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">{formatearValor('SMMLV_2026', getParam('SMMLV_2026')?.valor || '1423500')}</p>
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
