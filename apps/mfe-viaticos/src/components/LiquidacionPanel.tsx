import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Calculator,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  HelpCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { LiquidacionResponse, CalcularLiquidacionRequest } from '../types/viaticos';
import viaticosService from '../services/api/viaticosService';
import { formatearMoneda } from '../utils/viaticosUtils';

interface LiquidacionPanelProps {
  fechaInicio: string;
  fechaFin: string;
  tipoComisionado: string;
  destinoCiudad?: string;
  destinoDepartamento?: string;
  aplicaExcepcionRegional?: boolean;
  categoriaInvestigador?: string;
  asignacionesBasicas?: number[];
  onAplicarValor?: (montoViaticos: number, diasComision: number) => void;
}

export default function LiquidacionPanel({
  fechaInicio,
  fechaFin,
  tipoComisionado,
  destinoCiudad,
  destinoDepartamento,
  aplicaExcepcionRegional,
  categoriaInvestigador,
  asignacionesBasicas,
  onAplicarValor,
}: LiquidacionPanelProps) {
  const [expandido, setExpandido] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<LiquidacionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  // Evita re-aplicar el mismo resultado (feedback) cuando el padre re-renderiza.
  const autoRef = useRef<string | null>(null);

  const puedeCalcular =
    fechaInicio &&
    fechaFin &&
    tipoComisionado &&
    (tipoComisionado !== 'INVESTIGADOR' || categoriaInvestigador);

  useEffect(() => {
    if (!puedeCalcular) {
      setResultado(null);
      setError(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setCargando(true);
      setError(null);
      try {
        const payload: CalcularLiquidacionRequest = {
          tipoComisionado: tipoComisionado as any,
          fechaInicio,
          fechaFin,
          pernocta: fechaInicio !== fechaFin,
          destinoCiudad,
          destinoDepartamento,
          aplicaExcepcionRegional,
          categoriaInvestigador: categoriaInvestigador as any,
          asignacionesBasicas,
        };
        const res = await viaticosService.calcularLiquidacion(payload);
        setResultado(res);
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || 'Error calculando liquidación.');
        setResultado(null);
      } finally {
        setCargando(false);
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fechaInicio, fechaFin, tipoComisionado, destinoCiudad, destinoDepartamento, aplicaExcepcionRegional, categoriaInvestigador, asignacionesBasicas, puedeCalcular]);

  // Aplicación AUTOMÁTICA del resultado: en cuanto el Autoliquidador recalcula,
  // el total de viáticos y los días se aplican solos al expediente (el campo
  // "Viáticos" es de solo lectura). RF-LIQ-004.
  useEffect(() => {
    if (!resultado?.data || !onAplicarValor) return;
    const clave = `${resultado.data.valorTotalViaticos}|${resultado.data.numeroDiasNoches}`;
    if (autoRef.current === clave) return;
    autoRef.current = clave;
    onAplicarValor(resultado.data.valorTotalViaticos, resultado.data.numeroDiasNoches);
  }, [resultado, onAplicarValor]);

  const esSinPernocta = resultado?.data?.factorPernocta === 0.5;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      <button
        type="button"
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 text-[#003DA5] rounded-lg">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-900">Liquidación Automática de Viáticos</p>
            <p className="text-[11px] text-slate-500">Cálculo proactivo según Decreto 314 de 2026</p>
          </div>
        </div>
        {expandido ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {expandido && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
          {/* Ayuda: explica la norma y por qué se define ese valor. */}
          <details className="group text-[11px] text-slate-600">
            <summary className="cursor-pointer list-none flex items-center gap-1.5 py-2 font-bold text-slate-700 hover:text-slate-900 select-none">
              <HelpCircle className="w-3.5 h-3.5 text-[#003DA5] shrink-0" />
              ¿Cómo se define el valor de viáticos? (Decreto 314 de 2026)
              <ChevronDown className="w-3.5 h-3.5 ml-auto text-slate-400 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="space-y-1.5 bg-slate-50 border border-slate-200 rounded-xl p-3 leading-relaxed">
              <p>
                El sistema aplica automáticamente el <strong>Decreto 314 de 2026</strong>{' '}
                (escala salarial de viáticos) según los datos de la comisión:
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  <strong>Tarifa diaria base:</strong> se ubica según su asignación básica
                  mensual (si hay doble rol se usa el mayor salario). Los{' '}
                  <em>estudiantes</em> usan el SMMLV y los <em>investigadores</em> la tarifa
                  de su categoría (Junior / Asociado / Senior).
                </li>
                <li>
                  <strong>Factor por tipo de comisionado:</strong> los{' '}
                  <em>contratistas</em> aplican el 80 % (deducción del 20 %).
                </li>
                <li>
                  <strong>Factor por pernocta:</strong> si la comisión <strong>no</strong>{' '}
                  pernocta se reconoce el 50 % (día de viaje sin noche).
                </li>
                <li>
                  <strong>Excepción regional (Art. 5):</strong> si el destino es un
                  departamento nuevo creado por la Constitución, se usa su tarifa especial.
                </li>
                <li>
                  <strong>Días/noches a liquidar:</strong> se calculan desde las fechas
                  indicadas y la pernocta.
                </li>
              </ul>
              <p className="text-slate-500">
                El total se <strong>aplica automáticamente</strong> al campo “Viáticos”
                (no editable). Modifique fechas, pernocta, salario o categoría para ver
                cómo se recalcula.
              </p>
            </div>
          </details>

          {!puedeCalcular ? (
            <p className="text-xs text-slate-400 py-2">
              Complete las fechas y el tipo de comisionado para calcular la liquidación.
            </p>
          ) : cargando ? (
            <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Calculando liquidación...
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 py-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          ) : resultado ? (
            <>
              {esSinPernocta && (
                <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  Comisión sin pernoctación: Se aplicará el 50% de la tarifa.
                </div>
              )}

              {resultado.data.alertas && resultado.data.alertas.length > 0 && (
                <div className="space-y-1">
                  {resultado.data.alertas.map((alerta, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      {alerta}
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Tarifa Base</p>
                  <p className="text-sm font-black text-slate-800">{formatearMoneda(resultado.data.tarifaDiariaBase)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Factor Tipo</p>
                  <p className="text-sm font-black text-slate-800">{resultado.data.factorComisionado * 100}%</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Factor Pernocta</p>
                  <p className="text-sm font-black text-slate-800">{resultado.data.factorPernocta * 100}%</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Tarifa Final/Día</p>
                  <p className="text-sm font-black text-slate-800">{formatearMoneda(resultado.data.tarifaFinalAplicadaDia)}</p>
                </div>
              </div>

              {resultado.data.factorComisionado < 1 && (
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  Deducción por contratista: 20% de descuento aplicado sobre la tarifa base.
                </div>
              )}

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Total Proyectado SIIF Nación</p>
                    <p className="text-xl font-black text-blue-900">{formatearMoneda(resultado.data.valorTotalViaticos)}</p>
                    <p className="text-[11px] text-blue-600">{resultado.data.numeroDiasNoches} día(s) a liquidar</p>
                  </div>
                  {onAplicarValor && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Aplicación automática a Viáticos
                    </span>
                  )}
                </div>
              </div>

              <details className="text-xs">
                <summary className="cursor-pointer text-slate-600 font-semibold hover:text-slate-800">
                  Ver desglose diario
                </summary>
                <div className="mt-2 space-y-1">
                  {resultado.data.desgloseCalculo.map((dia) => (
                    <div key={dia.dia} className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-100">
                      <span className="text-slate-600 min-w-0">
                        Día {dia.dia} · {dia.fecha} {dia.pernocta ? '· Pernocta' : '· Sin pernocta'}
                      </span>
                      <span className="font-bold text-slate-800">{formatearMoneda(dia.valor)}</span>
                    </div>
                  ))}
                </div>
              </details>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
