/**
 * ALERTA DE PRORRATEO - Componente Visual
 * 
 * Muestra alertas visuales cuando el PTA requiere prorrateo automático
 * Incluye detalles del ajuste y permite al usuario ver el cálculo completo
 * 
 * Fecha: 23 de diciembre de 2024
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  Info,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Calculator,
  FileText
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import type { ResultadoProrrateo } from '../../lib/pta/prorrateo';

interface PTAAlertaProrrateoProps {
  resultado: ResultadoProrrateo;
  mostrarSiempre?: boolean;
}

export function PTAAlertaProrrateo({ resultado, mostrarSiempre = false }: PTAAlertaProrrateoProps) {
  
  const [expandido, setExpandido] = useState(false);
  const [mostrarCalculos, setMostrarCalculos] = useState(false);
  
  // Si no hay prorrateo y no se debe mostrar siempre, no renderizar
  if (!resultado.seAplicoProrrateo && !mostrarSiempre) {
    return null;
  }
  
  // Si no hay prorrateo pero se debe mostrar, mostrar mensaje positivo
  if (!resultado.seAplicoProrrateo) {
    return (
      <Card className="p-4 border-l-4 border-green-500 bg-green-50">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-bold text-green-900 mb-1">
              PTA dentro del límite
            </h4>
            <p className="text-sm text-green-700">
              Tu PTA utiliza {resultado.totalOriginal}h de {resultado.horasBase}h disponibles. 
              No se requiere ningún ajuste.
            </p>
          </div>
        </div>
      </Card>
    );
  }
  
  // Calcular porcentajes de reducción
  const { original, prorrateado, exceso, reduccionAplicada } = resultado;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Alerta Principal */}
      <Card className="p-5 border-l-4 border-orange-500 bg-orange-50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-orange-900">
                Ajuste Automático Aplicado
              </h4>
              <Badge className="bg-orange-600 text-white">
                -{exceso.toFixed(0)}h
              </Badge>
            </div>
            
            <p className="text-sm text-orange-800 mb-3">
              Tu PTA excedía el límite de <span className="font-bold">{resultado.horasBase}h</span> en <span className="font-bold">{exceso.toFixed(0)}h</span>. 
              Se ha aplicado un prorrateo automático según la normativa ESAP para ajustar las horas dentro del límite permitido.
            </p>
            
            {/* Resumen de cambios */}
            <div className="space-y-2 mb-3">
              {reduccionAplicada.investigacion > 0 && (
                <div className="flex items-center justify-between p-2 bg-white rounded">
                  <span className="text-sm text-gray-700">Investigación</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{original.investigacion}h</span>
                    <span className="text-xs text-gray-400">→</span>
                    <span className="text-sm font-bold text-orange-700">{prorrateado.investigacion}h</span>
                    <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                      -{reduccionAplicada.investigacion.toFixed(0)}h
                    </Badge>
                  </div>
                </div>
              )}
              
              {reduccionAplicada.extension > 0 && (
                <div className="flex items-center justify-between p-2 bg-white rounded">
                  <span className="text-sm text-gray-700">Extensión Académica</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{original.extension}h</span>
                    <span className="text-xs text-gray-400">→</span>
                    <span className="text-sm font-bold text-orange-700">{prorrateado.extension}h</span>
                    <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                      -{reduccionAplicada.extension.toFixed(0)}h
                    </Badge>
                  </div>
                </div>
              )}
              
              {reduccionAplicada.complementarias > 0 && (
                <div className="flex items-center justify-between p-2 bg-white rounded">
                  <span className="text-sm text-gray-700">Actividades Complementarias</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{original.complementarias}h</span>
                    <span className="text-xs text-gray-400">→</span>
                    <span className="text-sm font-bold text-orange-700">{prorrateado.complementarias}h</span>
                    <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                      -{reduccionAplicada.complementarias.toFixed(0)}h
                    </Badge>
                  </div>
                </div>
              )}
              
              {/* Docencia (no cambia) */}
              <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                <span className="text-sm text-gray-700">Docencia</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-green-700">{prorrateado.docencia}h</span>
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
                    ✓ Sin cambios
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Info adicional */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-800">
                <span className="font-bold">Nota:</span> Tu componente de Docencia ({prorrateado.docencia}h) no fue modificado. 
                El prorrateo solo afecta Investigación, Extensión y Complementarias según los límites establecidos en la Circular 003/2025.
              </p>
            </div>
            
            {/* Botones de acción */}
            <div className="flex items-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandido(!expandido)}
                className="text-orange-700 border-orange-300 hover:bg-orange-100"
              >
                {expandido ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-2" />
                    Ocultar Detalle
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-2" />
                    Ver Detalle Completo
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMostrarCalculos(!mostrarCalculos)}
                className="text-blue-700 border-blue-300 hover:bg-blue-100"
              >
                <Calculator className="w-4 h-4 mr-2" />
                {mostrarCalculos ? 'Ocultar' : 'Ver'} Cálculos
              </Button>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Panel expandible con tabla detallada */}
      <AnimatePresence>
        {expandido && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-5">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Tabla Comparativa del Prorrateo
              </h4>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-2 px-3 font-bold text-gray-900">Componente</th>
                      <th className="text-right py-2 px-3 font-bold text-gray-900">Original</th>
                      <th className="text-center py-2 px-3 font-bold text-gray-900">→</th>
                      <th className="text-right py-2 px-3 font-bold text-gray-900">Ajustado</th>
                      <th className="text-right py-2 px-3 font-bold text-gray-900">Cambio</th>
                      <th className="text-right py-2 px-3 font-bold text-gray-900">% Original</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Docencia */}
                    <tr className="border-b border-gray-200 bg-green-50">
                      <td className="py-2 px-3 font-medium">Docencia</td>
                      <td className="py-2 px-3 text-right">{original.docencia}h</td>
                      <td className="py-2 px-3 text-center text-green-600">✓</td>
                      <td className="py-2 px-3 text-right font-bold text-green-700">{prorrateado.docencia}h</td>
                      <td className="py-2 px-3 text-right text-green-600">0h</td>
                      <td className="py-2 px-3 text-right text-gray-500">
                        {((original.docencia / resultado.totalOriginal) * 100).toFixed(1)}%
                      </td>
                    </tr>
                    
                    {/* Investigación */}
                    <tr className="border-b border-gray-200">
                      <td className="py-2 px-3 font-medium">Investigación</td>
                      <td className="py-2 px-3 text-right">{original.investigacion}h</td>
                      <td className="py-2 px-3 text-center">→</td>
                      <td className="py-2 px-3 text-right font-bold">{prorrateado.investigacion}h</td>
                      <td className="py-2 px-3 text-right text-orange-600">
                        {reduccionAplicada.investigacion > 0 ? `-${reduccionAplicada.investigacion.toFixed(1)}h` : '0h'}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-500">
                        {((original.investigacion / resultado.totalOriginal) * 100).toFixed(1)}%
                      </td>
                    </tr>
                    
                    {/* Extensión */}
                    <tr className="border-b border-gray-200">
                      <td className="py-2 px-3 font-medium">Extensión</td>
                      <td className="py-2 px-3 text-right">{original.extension}h</td>
                      <td className="py-2 px-3 text-center">→</td>
                      <td className="py-2 px-3 text-right font-bold">{prorrateado.extension}h</td>
                      <td className="py-2 px-3 text-right text-orange-600">
                        {reduccionAplicada.extension > 0 ? `-${reduccionAplicada.extension.toFixed(1)}h` : '0h'}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-500">
                        {((original.extension / resultado.totalOriginal) * 100).toFixed(1)}%
                      </td>
                    </tr>
                    
                    {/* Complementarias */}
                    <tr className="border-b border-gray-200">
                      <td className="py-2 px-3 font-medium">Complementarias</td>
                      <td className="py-2 px-3 text-right">{original.complementarias}h</td>
                      <td className="py-2 px-3 text-center">→</td>
                      <td className="py-2 px-3 text-right font-bold">{prorrateado.complementarias}h</td>
                      <td className="py-2 px-3 text-right text-orange-600">
                        {reduccionAplicada.complementarias > 0 ? `-${reduccionAplicada.complementarias.toFixed(1)}h` : '0h'}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-500">
                        {((original.complementarias / resultado.totalOriginal) * 100).toFixed(1)}%
                      </td>
                    </tr>
                    
                    {/* Total */}
                    <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                      <td className="py-2 px-3">TOTAL</td>
                      <td className="py-2 px-3 text-right">{resultado.totalOriginal}h</td>
                      <td className="py-2 px-3 text-center">→</td>
                      <td className="py-2 px-3 text-right text-purple-700">{resultado.totalFinal}h</td>
                      <td className="py-2 px-3 text-right text-orange-600">
                        -{(resultado.totalOriginal - resultado.totalFinal).toFixed(1)}h
                      </td>
                      <td className="py-2 px-3 text-right text-gray-700">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-800">
                  <span className="font-bold">Límite base:</span> {resultado.horasBase}h • 
                  <span className="font-bold ml-2">Exceso original:</span> {exceso.toFixed(0)}h • 
                  <span className="font-bold ml-2">Reducción total:</span> {(resultado.totalOriginal - resultado.totalFinal).toFixed(1)}h ({(((resultado.totalOriginal - resultado.totalFinal) / resultado.totalOriginal) * 100).toFixed(1)}%)
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Panel de cálculos detallados */}
      <AnimatePresence>
        {mostrarCalculos && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-5 bg-gray-50">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                Detalle de Cálculos del Prorrateo
              </h4>
              
              <div className="space-y-2 font-mono text-xs bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
                {resultado.detalles.map((linea, index) => (
                  <div key={index}>{linea}</div>
                ))}
              </div>
              
              <div className="mt-3 text-xs text-gray-600">
                <p>
                  <span className="font-bold">Algoritmo:</span> Documento Maestro Integrado PTA ESAP v3.0 - Sección 14.2
                </p>
                <p className="mt-1">
                  <span className="font-bold">Base normativa:</span> Circular Dispositiva 003/2025 - Lineamientos PTA
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
