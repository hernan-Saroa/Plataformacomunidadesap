/**
 * COMPONENTE: Resumen del PTA con Prorrateo
 * Muestra totales, porcentajes y resultado del prorrateo si aplica
 */

import { TrendingUp, AlertTriangle, CheckCircle, Info, Eye, EyeOff } from 'lucide-react';
import { Card } from '../../ui/card';
import { Progress } from '../../ui/progress';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription } from '../../ui/alert';
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import type { ComponentesPTA, ResultadoProrrateo } from '../../../lib/pta/prorrateo';
import { TextWithTooltip, BadgeWithTooltip, PTATooltip } from './PTATooltips';
import { PTAProrrateoPreview } from './PTAProrrateoPreview';
import { useState } from 'react';

interface PTAResumenProps {
  horasBase: number;
  totales: ComponentesPTA;
  totalesFinales: ComponentesPTA;
  prorrateo?: ResultadoProrrateo;
  className?: string;
}

export function PTAResumen({ 
  horasBase, 
  totales, 
  totalesFinales, 
  prorrateo,
  className = '' 
}: PTAResumenProps) {
  const [mostrarProrrateoDetalle, setMostrarProrrateoDetalle] = useState(false);
  
  const totalOriginal = totales.docencia + totales.investigacion + totales.extension + totales.complementarias;
  const totalFinal = totalesFinales.docencia + totalesFinales.investigacion + totalesFinales.extension + totalesFinales.complementarias;
  const porcentajeUso = (totalFinal / horasBase) * 100;
  const seAplicoProrrateo = prorrateo?.seAplicoProrrateo || false;

  const getColorPorcentaje = (porcentaje: number) => {
    if (porcentaje < 80) return 'text-yellow-600';
    if (porcentaje > 100) return 'text-red-600';
    return 'text-green-600';
  };

  const getColorComponente = (valor: number, tope?: number) => {
    if (!tope) return 'text-gray-700';
    const porcentaje = (valor / tope) * 100;
    if (porcentaje > 100) return 'text-red-600';
    if (porcentaje > 90) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Totales Principales */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <TextWithTooltip tooltipId="horas-base" className="font-semibold text-lg">
              Resumen General
            </TextWithTooltip>
            <Badge 
              variant={porcentajeUso > 100 ? 'destructive' : porcentajeUso < 80 ? 'outline' : 'default'}
              className={porcentajeUso > 80 && porcentajeUso <= 100 ? 'bg-green-100 text-green-700' : ''}
            >
              {porcentajeUso.toFixed(1)}% de uso
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Horas Base</div>
              <div className="text-2xl font-bold text-[#003DA5]">{horasBase}h</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Programado</div>
              <div className={`text-2xl font-bold ${getColorPorcentaje(porcentajeUso)}`}>
                {totalFinal.toFixed(0)}h
              </div>
            </div>
          </div>

          <Progress value={Math.min(porcentajeUso, 100)} className="h-2" />
          
          {porcentajeUso < 80 && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700 text-sm">
                Está utilizando solo el {porcentajeUso.toFixed(1)}% de sus horas base. 
                Considere agregar más actividades.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </Card>

      {/* Desglose por Componente */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Desglose por Componente</h3>
        
        <div className="space-y-4">
          {/* Docencia */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <TextWithTooltip tooltipId="componente-docencia" className="font-medium">
                  Docencia
                </TextWithTooltip>
                {seAplicoProrrateo && (
                  <BadgeWithTooltip 
                    tooltipId="docencia-sagrada"
                    variant="outline" 
                    className="bg-green-50 text-green-700 text-xs"
                  >
                    INTOCABLE
                  </BadgeWithTooltip>
                )}
              </div>
              <span className={`font-semibold ${getColorComponente(totalesFinales.docencia)}`}>
                {totalesFinales.docencia.toFixed(0)}h
              </span>
            </div>
            <Progress 
              value={(totalesFinales.docencia / horasBase) * 100} 
              className="h-2"
            />
            <div className="text-xs text-gray-500 mt-1">
              Sin tope máximo
            </div>
          </div>

          {/* Investigación */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <TextWithTooltip tooltipId="componente-investigacion" className="font-medium">
                  Investigación
                </TextWithTooltip>
                {seAplicoProrrateo && totalesFinales.investigacion !== totales.investigacion && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 text-xs">
                    PRORRATEADO
                  </Badge>
                )}
              </div>
              <span className={`font-semibold ${getColorComponente(totalesFinales.investigacion, horasBase * 0.5)}`}>
                {totalesFinales.investigacion.toFixed(0)}h
                {seAplicoProrrateo && totalesFinales.investigacion !== totales.investigacion && (
                  <span className="text-xs text-gray-500 ml-1">
                    (era {totales.investigacion.toFixed(0)}h)
                  </span>
                )}
              </span>
            </div>
            <Progress 
              value={(totalesFinales.investigacion / (horasBase * 0.5)) * 100} 
              className="h-2"
            />
            <div className="text-xs text-gray-500 mt-1">
              Máximo: {(horasBase * 0.5).toFixed(0)}h (50%)
            </div>
          </div>

          {/* Extensión */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <TextWithTooltip tooltipId="componente-extension" className="font-medium">
                  Extensión
                </TextWithTooltip>
                {seAplicoProrrateo && totalesFinales.extension !== totales.extension && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 text-xs">
                    PRORRATEADO
                  </Badge>
                )}
              </div>
              <span className={`font-semibold ${getColorComponente(totalesFinales.extension, horasBase * 0.25)}`}>
                {totalesFinales.extension.toFixed(0)}h
                {seAplicoProrrateo && totalesFinales.extension !== totales.extension && (
                  <span className="text-xs text-gray-500 ml-1">
                    (era {totales.extension.toFixed(0)}h)
                  </span>
                )}
              </span>
            </div>
            <Progress 
              value={(totalesFinales.extension / (horasBase * 0.25)) * 100} 
              className="h-2"
            />
            <div className="text-xs text-gray-500 mt-1">
              Máximo: {(horasBase * 0.25).toFixed(0)}h (25%)
            </div>
          </div>

          {/* Complementarias */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <TextWithTooltip tooltipId="componente-complementarias" className="font-medium">
                  Complementarias
                </TextWithTooltip>
                {seAplicoProrrateo && totalesFinales.complementarias !== totales.complementarias && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 text-xs">
                    PRORRATEADO
                  </Badge>
                )}
              </div>
              <span className={`font-semibold ${getColorComponente(totalesFinales.complementarias, horasBase * 0.25)}`}>
                {totalesFinales.complementarias.toFixed(0)}h
                {seAplicoProrrateo && totalesFinales.complementarias !== totales.complementarias && (
                  <span className="text-xs text-gray-500 ml-1">
                    (era {totales.complementarias.toFixed(0)}h)
                  </span>
                )}
              </span>
            </div>
            <Progress 
              value={(totalesFinales.complementarias / (horasBase * 0.25)) * 100} 
              className="h-2"
            />
            <div className="text-xs text-gray-500 mt-1">
              Máximo: {(horasBase * 0.25).toFixed(0)}h (25%)
            </div>
          </div>
        </div>
      </Card>

      {/* Alerta de Prorrateo CON BOTÓN PARA VER DETALLE */}
      {seAplicoProrrateo && prorrateo && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold flex items-center gap-2">
                  ⚠️ Prorrateo Aplicado Automáticamente
                  <PTATooltip id="prorrateo" />
                </div>
                <Dialog open={mostrarProrrateoDetalle} onOpenChange={setMostrarProrrateoDetalle}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="bg-white">
                      <Eye className="w-4 h-4 mr-1" />
                      Ver Detalle Visual
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Vista Previa Detallada del Prorrateo</DialogTitle>
                    </DialogHeader>
                    <PTAProrrateoPreview
                      horasBase={horasBase}
                      totalesOriginales={totales}
                      totalesFinales={totalesFinales}
                      prorrateo={prorrateo}
                    />
                  </DialogContent>
                </Dialog>
              </div>
              <div className="text-sm">
                El total programado ({totalOriginal.toFixed(0)}h) excedía las horas base ({horasBase}h).
                <br />
                Se aplicó prorrateo respetando que <strong>DOCENCIA es SAGRADA</strong> y nunca se reduce.
              </div>
              <div className="text-xs bg-white/50 p-2 rounded mt-2 space-y-1">
                <div><strong>Factor de prorrateo:</strong> {((prorrateo?.factorProrrateo || 1) * 100).toFixed(1)}%</div>
                <div><strong>Reducción total:</strong> {(totalOriginal - totalFinal).toFixed(0)}h</div>
                <div className="text-green-600">
                  ✓ Docencia se mantuvo en {totalesFinales.docencia.toFixed(0)}h (intocable)
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Estado OK */}
      {!seAplicoProrrateo && totalFinal <= horasBase && totalFinal >= horasBase * 0.8 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-700">
            <div className="font-semibold">
              ✓ PTA en rango óptimo
            </div>
            <div className="text-sm">
              Está utilizando el {porcentajeUso.toFixed(1)}% de sus horas base ({totalFinal.toFixed(0)}h de {horasBase}h).
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
