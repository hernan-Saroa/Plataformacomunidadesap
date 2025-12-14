/**
 * COMPONENTE: Vista Previa Visual del Prorrateo
 * Muestra comparación ANTES vs DESPUÉS del prorrateo de forma visual
 */

import { TrendingDown, ArrowRight, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';
import { Alert, AlertDescription } from '../../ui/alert';
import { Separator } from '../../ui/separator';
import type { ComponentesPTA, ResultadoProrrateo } from '../../../lib/pta/prorrateo';
import { PTATooltip, BadgeWithTooltip } from './PTATooltips';

interface PTAProrrateoPreviewProps {
  horasBase: number;
  totalesOriginales: ComponentesPTA;
  totalesFinales: ComponentesPTA;
  prorrateo: ResultadoProrrateo;
  className?: string;
}

export function PTAProrrateoPreview({
  horasBase,
  totalesOriginales,
  totalesFinales,
  prorrateo,
  className = ''
}: PTAProrrateoPreviewProps) {
  const totalOriginal = 
    totalesOriginales.docencia + 
    totalesOriginales.investigacion + 
    totalesOriginales.extension + 
    totalesOriginales.complementarias;

  const totalFinal = 
    totalesFinales.docencia + 
    totalesFinales.investigacion + 
    totalesFinales.extension + 
    totalesFinales.complementarias;

  const exceso = totalOriginal - horasBase;
  const porcentajeExceso = (exceso / horasBase) * 100;

  const componentes = [
    {
      id: 'docencia',
      nombre: 'Docencia',
      color: 'blue',
      original: totalesOriginales.docencia,
      final: totalesFinales.docencia,
      icon: '📘',
      intocable: true
    },
    {
      id: 'investigacion',
      nombre: 'Investigación',
      color: 'orange',
      original: totalesOriginales.investigacion,
      final: totalesFinales.investigacion,
      icon: '🔬',
      intocable: false
    },
    {
      id: 'extension',
      nombre: 'Extensión',
      color: 'purple',
      original: totalesOriginales.extension,
      final: totalesFinales.extension,
      icon: '🤝',
      intocable: false
    },
    {
      id: 'complementarias',
      nombre: 'Complementarias',
      color: 'green',
      original: totalesOriginales.complementarias,
      final: totalesFinales.complementarias,
      icon: '⚙️',
      intocable: false
    }
  ];

  const horasDisponiblesParaProrrateo = horasBase - totalesFinales.docencia;
  const totalNoPriorizado = totalesOriginales.investigacion + totalesOriginales.extension + totalesOriginales.complementarias;
  const reduccionTotal = totalOriginal - totalFinal;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header Alert */}
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertTriangle className="w-5 h-5 text-yellow-600" />
        <AlertDescription>
          <div className="space-y-2 text-yellow-800">
            <div className="font-bold text-base flex items-center gap-2">
              ⚠️ Prorrateo Necesario
              <PTATooltip id="prorrateo" />
            </div>
            <div className="text-sm">
              El total programado ({totalOriginal.toFixed(0)}h) excede las horas base ({horasBase}h) 
              por <strong className="text-red-600">{exceso.toFixed(0)}h ({porcentajeExceso.toFixed(1)}%)</strong>.
              El sistema aplicará prorrateo automático respetando que <strong>DOCENCIA es SAGRADA</strong>.
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Visual Comparison */}
      <Card className="p-6 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="space-y-6">
          {/* Title */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800">Comparación Visual del Prorrateo</h3>
            <Badge variant="outline" className="bg-blue-100 text-blue-700">
              Factor: {(prorrateo.factorProrrateo * 100).toFixed(1)}%
            </Badge>
          </div>

          {/* Componentes */}
          <div className="space-y-4">
            {componentes.map(comp => {
              const cambio = comp.final - comp.original;
              const porcentajeCambio = comp.original > 0 ? (cambio / comp.original) * 100 : 0;
              const seReducio = cambio < 0;

              return (
                <div key={comp.id} className="bg-white p-4 rounded-lg border-2 border-gray-200">
                  <div className="space-y-3">
                    {/* Header del componente */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{comp.icon}</span>
                        <div>
                          <div className="font-semibold text-gray-800 flex items-center gap-2">
                            {comp.nombre}
                            {comp.intocable && (
                              <BadgeWithTooltip 
                                tooltipId="docencia-sagrada"
                                variant="outline" 
                                className="bg-green-100 text-green-700 border-green-300"
                              >
                                <Shield className="w-3 h-3 mr-1" />
                                INTOCABLE
                              </BadgeWithTooltip>
                            )}
                          </div>
                        </div>
                      </div>
                      {seReducio && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <TrendingDown className="w-3 h-3 mr-1" />
                          {porcentajeCambio.toFixed(1)}%
                        </Badge>
                      )}
                    </div>

                    {/* Visual ANTES → DESPUÉS */}
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                      {/* ANTES */}
                      <div className="space-y-2">
                        <div className="text-xs text-gray-500 font-medium">ANTES</div>
                        <div className={`text-2xl font-bold ${seReducio ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                          {comp.original.toFixed(0)}h
                        </div>
                        <Progress 
                          value={(comp.original / horasBase) * 100} 
                          className={`h-3 ${seReducio ? 'opacity-50' : ''}`}
                        />
                        <div className="text-xs text-gray-500">
                          {((comp.original / horasBase) * 100).toFixed(1)}% del PTA
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex flex-col items-center">
                        <ArrowRight className={`w-6 h-6 ${seReducio ? 'text-red-500' : 'text-green-500'}`} />
                        {seReducio && (
                          <div className="text-xs text-red-600 font-medium mt-1">
                            -{Math.abs(cambio).toFixed(0)}h
                          </div>
                        )}
                      </div>

                      {/* DESPUÉS */}
                      <div className="space-y-2">
                        <div className="text-xs text-gray-500 font-medium">DESPUÉS</div>
                        <div className={`text-2xl font-bold ${
                          comp.intocable ? 'text-green-600' : 
                          seReducio ? 'text-red-600' : 'text-gray-700'
                        }`}>
                          {comp.final.toFixed(0)}h
                        </div>
                        <Progress 
                          value={(comp.final / horasBase) * 100} 
                          className="h-3"
                        />
                        <div className="text-xs text-gray-500">
                          {((comp.final / horasBase) * 100).toFixed(1)}% del PTA
                        </div>
                      </div>
                    </div>

                    {/* Explicación */}
                    {comp.intocable ? (
                      <div className="bg-green-50 p-2 rounded text-xs text-green-700 flex items-center gap-2">
                        <CheckCircle className="w-3 h-3" />
                        <span>
                          <strong>Mantenido intacto:</strong> Docencia nunca se reduce en el prorrateo
                        </span>
                      </div>
                    ) : seReducio ? (
                      <div className="bg-red-50 p-2 rounded text-xs text-red-700">
                        <strong>Reducido por prorrateo:</strong> {comp.original.toFixed(0)}h × {(prorrateo.factorProrrateo).toFixed(4)} = {comp.final.toFixed(0)}h
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Totales */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 bg-red-50 border-red-200">
              <div className="space-y-2">
                <div className="text-sm text-red-600 font-medium">Total ANTES del Prorrateo</div>
                <div className="text-3xl font-bold text-red-700">{totalOriginal.toFixed(0)}h</div>
                <div className="text-xs text-red-600">
                  Excede {exceso.toFixed(0)}h las horas base
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-green-50 border-green-200">
              <div className="space-y-2">
                <div className="text-sm text-green-600 font-medium">Total DESPUÉS del Prorrateo</div>
                <div className="text-3xl font-bold text-green-700">{totalFinal.toFixed(0)}h</div>
                <div className="text-xs text-green-600">
                  ✓ Ajustado exactamente a {horasBase}h
                </div>
              </div>
            </Card>
          </div>
        </div>
      </Card>

      {/* Detalles del Algoritmo */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <h4 className="font-semibold text-blue-900">Detalles del Algoritmo de Prorrateo</h4>
          </div>

          <div className="space-y-3 text-sm text-blue-800">
            <div className="flex items-start gap-2">
              <div className="font-mono bg-white px-2 py-1 rounded min-w-[60px] text-center">
                Paso 1
              </div>
              <div className="flex-1">
                <strong>Proteger Docencia:</strong> {totalesFinales.docencia.toFixed(0)}h se mantienen intactas (SAGRADAS)
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="font-mono bg-white px-2 py-1 rounded min-w-[60px] text-center">
                Paso 2
              </div>
              <div className="flex-1">
                <strong>Calcular espacio disponible:</strong> {horasBase}h (base) - {totalesFinales.docencia.toFixed(0)}h (docencia) = {horasDisponiblesParaProrrateo.toFixed(0)}h disponibles
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="font-mono bg-white px-2 py-1 rounded min-w-[60px] text-center">
                Paso 3
              </div>
              <div className="flex-1">
                <strong>Sumar componentes a prorratear:</strong> {totalesOriginales.investigacion.toFixed(0)}h (inv) + {totalesOriginales.extension.toFixed(0)}h (ext) + {totalesOriginales.complementarias.toFixed(0)}h (comp) = {totalNoPriorizado.toFixed(0)}h
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="font-mono bg-white px-2 py-1 rounded min-w-[60px] text-center">
                Paso 4
              </div>
              <div className="flex-1">
                <strong>Calcular factor:</strong> {horasDisponiblesParaProrrateo.toFixed(0)}h ÷ {totalNoPriorizado.toFixed(0)}h = {prorrateo.factorProrrateo.toFixed(4)}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="font-mono bg-white px-2 py-1 rounded min-w-[60px] text-center">
                Paso 5
              </div>
              <div className="flex-1">
                <strong>Aplicar factor:</strong> Multiplicar cada componente × {prorrateo.factorProrrateo.toFixed(4)}
                <div className="ml-4 mt-1 space-y-1 text-xs font-mono">
                  <div>• Inv: {totalesOriginales.investigacion.toFixed(0)}h × {prorrateo.factorProrrateo.toFixed(4)} = {totalesFinales.investigacion.toFixed(0)}h</div>
                  <div>• Ext: {totalesOriginales.extension.toFixed(0)}h × {prorrateo.factorProrrateo.toFixed(4)} = {totalesFinales.extension.toFixed(0)}h</div>
                  <div>• Comp: {totalesOriginales.complementarias.toFixed(0)}h × {prorrateo.factorProrrateo.toFixed(4)} = {totalesFinales.complementarias.toFixed(0)}h</div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="font-mono bg-green-100 px-2 py-1 rounded min-w-[60px] text-center text-green-700">
                ✓ Final
              </div>
              <div className="flex-1">
                <strong className="text-green-700">Verificar total:</strong> {totalesFinales.docencia.toFixed(0)}h + {totalesFinales.investigacion.toFixed(0)}h + {totalesFinales.extension.toFixed(0)}h + {totalesFinales.complementarias.toFixed(0)}h = <strong className="text-green-700">{totalFinal.toFixed(0)}h</strong> ✓
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <div className="text-xs text-gray-600 mb-1">Reducción Total</div>
          <div className="text-2xl font-bold text-red-600">
            -{reduccionTotal.toFixed(0)}h
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {((reduccionTotal / totalOriginal) * 100).toFixed(1)}% del total
          </div>
        </Card>

        <Card className="p-4 text-center">
          <div className="text-xs text-gray-600 mb-1">Factor de Prorrateo</div>
          <div className="text-2xl font-bold text-blue-600">
            {(prorrateo.factorProrrateo * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Aplicado a Inv/Ext/Comp
          </div>
        </Card>

        <Card className="p-4 text-center">
          <div className="text-xs text-gray-600 mb-1">Docencia Protegida</div>
          <div className="text-2xl font-bold text-green-600">
            {totalesFinales.docencia.toFixed(0)}h
          </div>
          <div className="text-xs text-gray-500 mt-1">
            100% preservada ✓
          </div>
        </Card>
      </div>
    </div>
  );
}
