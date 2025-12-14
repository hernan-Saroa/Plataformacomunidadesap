/**
 * COMPONENTE: Panel de Validaciones del PTA (MEJORADO)
 * Muestra todas las validaciones, advertencias y errores en tiempo real
 * CON TOOLTIPS Y DETALLES CONTEXTUALES
 */

import { AlertCircle, AlertTriangle, Info, CheckCircle, XCircle, HelpCircle, Lightbulb } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { Badge } from '../../ui/badge';
import { Card } from '../../ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';
import type { ReglaNegocioResult } from '../../../lib/pta/reglasNegocio';
import { PTATooltip } from './PTATooltips';

interface PTAValidacionesProps {
  validaciones: ReglaNegocioResult[];
  className?: string;
}

export function PTAValidaciones({ validaciones, className = '' }: PTAValidacionesProps) {
  const erroresDuros = validaciones.filter(v => !v.valida && v.tipo === 'DURO');
  const advertencias = validaciones.filter(v => v.tipo === 'ADVERTENCIA');
  const infos = validaciones.filter(v => v.tipo === 'INFO' && v.valida);

  const getIcon = (tipo: 'DURO' | 'ADVERTENCIA' | 'INFO') => {
    switch (tipo) {
      case 'DURO':
        return <AlertCircle className="w-4 h-4" />;
      case 'ADVERTENCIA':
        return <AlertTriangle className="w-4 h-4" />;
      case 'INFO':
        return <Info className="w-4 h-4" />;
    }
  };

  const getVariant = (tipo: 'DURO' | 'ADVERTENCIA' | 'INFO'): 'destructive' | 'default' => {
    return tipo === 'DURO' ? 'destructive' : 'default';
  };

  // Mapa de tooltips por código de regla
  const getTooltipId = (codigo: string): string | null => {
    const map: Record<string, string> = {
      'RN-PTA-002': 'pre-requisito-3-creditos',
      'RN-INV-001': 'exclusion-mutua-inv',
      'RN-INV-002': 'tope-50-investigacion',
      'RN-EXT-001': 'tope-25-extension',
      'RN-COMP-001': 'tope-25-complementarias'
    };
    return map[codigo] || null;
  };

  // Obtener soluciones sugeridas
  const getSolucion = (codigo: string): string | null => {
    const soluciones: Record<string, string> = {
      'RN-PTA-002': 'Agregue al menos una asignatura de mínimo 3 créditos en Docencia',
      'RN-INV-001': 'Elimine el Proyecto Formal O las Necesidades del Servicio (solo puede tener uno)',
      'RN-INV-002': 'Reduzca horas de Investigación o elimine algunas actividades',
      'RN-EXT-001': 'Reduzca horas de Extensión o elimine algunas actividades',
      'RN-COMP-001': 'Reduzca horas de Complementarias o elimine algunas actividades',
      'RN-PTA-003': 'Agregue más actividades para acercarse al 100% de uso'
    };
    return soluciones[codigo] || null;
  };

  if (validaciones.length === 0) {
    return (
      <Card className={`p-6 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-green-800">¡Todo en orden!</div>
              <div className="text-sm text-green-600">Sin validaciones pendientes • PTA listo para enviar</div>
            </div>
          </div>
          <Badge className="bg-green-600 text-white">✓ VÁLIDO</Badge>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Summary Header */}
      <Card className="p-4 bg-gray-50 border-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {erroresDuros.length > 0 && (
              <Badge variant="destructive" className="text-sm px-3 py-1">
                <XCircle className="w-4 h-4 mr-1" />
                {erroresDuros.length} Error{erroresDuros.length > 1 ? 'es' : ''}
              </Badge>
            )}
            {advertencias.length > 0 && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-sm px-3 py-1">
                <AlertTriangle className="w-4 h-4 mr-1" />
                {advertencias.length} Advertencia{advertencias.length > 1 ? 's' : ''}
              </Badge>
            )}
            {infos.length > 0 && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-sm px-3 py-1">
                <Info className="w-4 h-4 mr-1" />
                {infos.length} Info
              </Badge>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {erroresDuros.length > 0 ? 'Corrija errores para enviar' : 'Advertencias no bloquean envío'}
          </div>
        </div>
      </Card>

      {/* Errores Duros - EXPANDIDOS */}
      {erroresDuros.length > 0 && (
        <div className="space-y-2">
          {erroresDuros.map((v, idx) => {
            const tooltipId = getTooltipId(v.codigo);
            const solucion = getSolucion(v.codigo);

            return (
              <Alert key={`error-${idx}`} variant="destructive" className="border-2">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <XCircle className="w-5 h-5 mt-0.5" />
                    <div className="flex-1">
                      <AlertTitle className="flex items-center gap-2 mb-2">
                        <span className="font-bold">[{v.codigo}]</span>
                        {tooltipId && <PTATooltip id={tooltipId as any} />}
                      </AlertTitle>
                      <AlertDescription className="text-sm">
                        {v.mensaje}
                      </AlertDescription>
                    </div>
                  </div>

                  {/* Solución sugerida */}
                  {solucion && (
                    <div className="bg-red-50 border-t border-red-200 -mx-4 -mb-4 p-3 mt-2">
                      <div className="flex items-start gap-2 text-xs">
                        <Lightbulb className="w-4 h-4 text-red-600 mt-0.5" />
                        <div>
                          <div className="font-semibold text-red-800 mb-1">Solución:</div>
                          <div className="text-red-700">{solucion}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Alert>
            );
          })}
        </div>
      )}

      {/* Advertencias - MEJORADAS */}
      {advertencias.length > 0 && (
        <Collapsible defaultOpen={true}>
          <CollapsibleTrigger className="w-full">
            <Card className="p-3 bg-yellow-50 border-yellow-300 hover:bg-yellow-100 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <span className="font-semibold text-yellow-800">
                    {advertencias.length} Advertencia{advertencias.length > 1 ? 's' : ''} (No bloquean envío)
                  </span>
                </div>
                <span className="text-xs text-yellow-600">Click para expandir/colapsar</span>
              </div>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {advertencias.map((v, idx) => {
              const tooltipId = getTooltipId(v.codigo);
              const solucion = getSolucion(v.codigo);

              return (
                <Alert key={`warn-${idx}`} className="border-2 border-yellow-200 bg-yellow-50">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-yellow-800">
                      <AlertTriangle className="w-4 h-4 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">[{v.codigo}]</span>
                          {tooltipId && <PTATooltip id={tooltipId as any} />}
                        </div>
                        <AlertDescription className="text-yellow-700 text-sm">
                          {v.mensaje}
                        </AlertDescription>
                      </div>
                    </div>

                    {solucion && (
                      <div className="bg-yellow-100 rounded p-2 text-xs text-yellow-800 flex items-start gap-2">
                        <Lightbulb className="w-3 h-3 mt-0.5" />
                        <span><strong>Recomendación:</strong> {solucion}</span>
                      </div>
                    )}
                  </div>
                </Alert>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Información - MEJORADA */}
      {infos.length > 0 && (
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger className="w-full">
            <Card className="p-3 bg-blue-50 border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-blue-800">
                    {infos.length} Información{infos.length > 1 ? ' adicional' : ''}
                  </span>
                </div>
                <span className="text-xs text-blue-600">Click para ver detalles</span>
              </div>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {infos.map((v, idx) => {
              const tooltipId = getTooltipId(v.codigo);

              return (
                <Alert key={`info-${idx}`} className="border border-blue-200 bg-blue-50">
                  <div className="flex items-start gap-2 text-blue-700">
                    <Info className="w-4 h-4 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">[{v.codigo}]</span>
                        {tooltipId && <PTATooltip id={tooltipId as any} />}
                      </div>
                      <AlertDescription className="text-blue-700 text-sm">
                        {v.mensaje}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
