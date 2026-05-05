/**
 * ═══════════════════════════════════════════════════════════════════════
 * PANEL DE DEMOSTRACIÓN - SISTEMA DE NOMENCLATURA
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Panel interactivo para probar y visualizar el sistema de nomenclatura única
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Scale, FileText, Archive, FileSignature, RefreshCw, Download,
  TrendingUp, Calendar, Hash, CheckCircle, Info, Sparkles,
  BarChart3, Copy, Eye
} from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Button } from '@esap-mfe/shared-ui/button';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { toast } from 'sonner';
import {
  generarNomenclatura,
  previsualizarNomenclatura,
  obtenerContadoresActuales,
  obtenerEstadisticas,
  exportarNomenclaturas,
  type TipoDocumento
} from '../utils/nomenclaturaDocumentos';
import {
  BadgeNomenclatura,
  BadgeNomenclaturaCompacta,
  BadgeNomenclaturaLista
} from './BadgeNomenclatura';

// ==================== CONFIGURACIÓN ====================
const TIPOS_DOCUMENTOS: Array<{
  tipo: TipoDocumento;
  nombre: string;
  descripcion: string;
  icon: any;
  color: string;
  ejemplos: string[];
}> = [
  {
    tipo: 'AUTO',
    nombre: 'Autos',
    descripcion: 'Autos y providencias disciplinarias',
    icon: Scale,
    color: '#8B5CF6',
    ejemplos: [
      'Auto de Apertura de Investigación',
      'Auto de Formulación de Cargos',
      'Auto de Archivo Definitivo'
    ]
  },
  {
    tipo: 'OFICIO',
    nombre: 'Oficios',
    descripcion: 'Oficios y comunicaciones oficiales',
    icon: FileText,
    color: '#2563EB',
    ejemplos: [
      'Oficio de Solicitud de Información',
      'Oficio de Notificación',
      'Oficio de Traslado'
    ]
  },
  {
    tipo: 'EVIDENCIA',
    nombre: 'Evidencias',
    descripcion: 'Material probatorio y evidencias',
    icon: Archive,
    color: '#10B981',
    ejemplos: [
      'Declaración testimonial',
      'Fotografías del lugar',
      'Videos de seguridad'
    ]
  },
  {
    tipo: 'ACTA',
    nombre: 'Actas',
    descripcion: 'Actas de diligencias y audiencias',
    icon: FileSignature,
    color: '#F59E0B',
    ejemplos: [
      'Acta de Diligencia de Descargos',
      'Acta de Recepción de Pruebas',
      'Acta de Versión Libre'
    ]
  }
];

// ==================== COMPONENTE ====================
export function PanelDemostracionNomenclatura() {
  const [vistaActual, setVistaActual] = useState<'demo' | 'estadisticas'>('demo');
  const [ultimasGeneradas, setUltimasGeneradas] = useState<Array<{
    nomenclatura: string;
    tipo: TipoDocumento;
    timestamp: string;
  }>>([]);

  // Generar nomenclatura de prueba
  const handleGenerarPrueba = (tipo: TipoDocumento) => {
    const nomenclatura = generarNomenclatura(
      tipo,
      `proceso-demo-${Date.now()}`,
      `P-DEMO-2025`
    );

    setUltimasGeneradas(prev => [
      {
        nomenclatura: nomenclatura.nomenclatura,
        tipo,
        timestamp: new Date().toISOString()
      },
      ...prev.slice(0, 9) // Mantener solo las últimas 10
    ]);

    toast.success('Nomenclatura Generada', {
      description: nomenclatura.nomenclatura,
      duration: 3000
    });
  };

  // Obtener estadísticas
  const stats = obtenerEstadisticas();
  const contadores = obtenerContadoresActuales();

  // Exportar datos
  const handleExportar = () => {
    const data = exportarNomenclaturas();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nomenclaturas-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Datos Exportados', {
      description: 'Archivo JSON descargado correctamente'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black" style={{ color: '#003DA5' }}>
            Sistema de Nomenclatura Única
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Panel de demostración y estadísticas del sistema
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            onClick={() => setVistaActual('demo')}
            variant={vistaActual === 'demo' ? 'default' : 'outline'}
            size="sm"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Demostración
          </Button>
          <Button
            onClick={() => setVistaActual('estadisticas')}
            variant={vistaActual === 'estadisticas' ? 'default' : 'outline'}
            size="sm"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Estadísticas
          </Button>
        </div>
      </div>

      {/* Contenido */}
      {vistaActual === 'demo' ? (
        <div className="space-y-6">
          {/* Información del Sistema */}
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-white shadow-sm">
                <Info className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Formato de Nomenclatura
                </h3>
                <p className="text-sm text-gray-700 mb-3">
                  Cada documento recibe un identificador único con el formato:{' '}
                  <code className="px-2 py-1 bg-white rounded font-mono text-blue-700">
                    PREFIJO-NNN-YYYY
                  </code>
                </p>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-blue-600" />
                    <span className="text-gray-600">
                      <strong>Consecutivo:</strong> 001, 002, 003...
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-gray-600">
                      <strong>Año actual:</strong> {contadores.añoActual}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-gray-600">
                      <strong>Reinicio:</strong> Automático cada año
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span className="text-gray-600">
                      <strong>Unicidad:</strong> Garantizada por tipo
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Generadores por Tipo */}
          <div className="grid grid-cols-2 gap-4">
            {TIPOS_DOCUMENTOS.map((tipoDoc) => {
              const Icon = tipoDoc.icon;
              const proximaNomenclatura = previsualizarNomenclatura(tipoDoc.tipo);

              return (
                <Card key={tipoDoc.tipo} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className="p-3 rounded-xl"
                      style={{ backgroundColor: tipoDoc.color + '20' }}
                    >
                      <Icon className="w-6 h-6" style={{ color: tipoDoc.color }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{tipoDoc.nombre}</h3>
                      <p className="text-xs text-gray-600 mt-1">
                        {tipoDoc.descripcion}
                      </p>
                    </div>
                  </div>

                  {/* Vista Previa */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-600 mb-2">Próxima nomenclatura:</p>
                    <BadgeNomenclatura
                      nomenclatura={proximaNomenclatura}
                      tipo={tipoDoc.tipo}
                      size="sm"
                      showIcon={false}
                      showCopy={false}
                    />
                  </div>

                  {/* Ejemplos */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-600 mb-2">Ejemplos de uso:</p>
                    <ul className="space-y-1">
                      {tipoDoc.ejemplos.map((ejemplo, idx) => (
                        <li key={idx} className="text-xs text-gray-700 flex items-start gap-1">
                          <span className="text-gray-400">•</span>
                          <span>{ejemplo}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Botón Generar */}
                  <Button
                    onClick={() => handleGenerarPrueba(tipoDoc.tipo)}
                    className="w-full"
                    style={{
                      backgroundColor: tipoDoc.color,
                      color: 'white'
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Generar {tipoDoc.nombre}
                  </Button>
                </Card>
              );
            })}
          </div>

          {/* Últimas Generadas */}
          {ultimasGeneradas.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Últimas Nomenclaturas Generadas
                </h3>
                <Badge variant="outline">{ultimasGeneradas.length}</Badge>
              </div>

              <div className="space-y-2">
                {ultimasGeneradas.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <BadgeNomenclatura
                      nomenclatura={item.nomenclatura}
                      tipo={item.tipo}
                      size="sm"
                      showIcon={true}
                      showCopy={true}
                    />
                    <span className="text-xs text-gray-500">
                      {new Date(item.timestamp).toLocaleTimeString('es-CO')}
                    </span>
                  </motion.div>
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : (
        // Vista de Estadísticas
        <div className="space-y-6">
          {/* Contadores Actuales */}
          <div className="grid grid-cols-4 gap-4">
            {TIPOS_DOCUMENTOS.map((tipoDoc) => {
              const Icon = tipoDoc.icon;
              const contador = contadores[`${tipoDoc.tipo}S` as keyof typeof contadores];

              return (
                <Card key={tipoDoc.tipo} className="p-6 text-center">
                  <div
                    className="inline-flex p-4 rounded-full mb-3"
                    style={{ backgroundColor: tipoDoc.color + '20' }}
                  >
                    <Icon className="w-8 h-8" style={{ color: tipoDoc.color }} />
                  </div>
                  <h3 className="text-3xl font-black mb-1" style={{ color: tipoDoc.color }}>
                    {contador}
                  </h3>
                  <p className="text-sm text-gray-600">{tipoDoc.nombre}</p>
                </Card>
              );
            })}
          </div>

          {/* Información General */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-blue-100">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Año Actual</p>
                  <p className="text-2xl font-black text-gray-900">
                    {contadores.añoActual}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                Los contadores se reinician automáticamente el 1 de enero
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-green-100">
                  <BarChart3 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Documentos</p>
                  <p className="text-2xl font-black text-gray-900">
                    {stats.total}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                Nomenclaturas registradas en el sistema
              </p>
            </Card>
          </div>

          {/* Últimas 10 Nomenclaturas */}
          {stats.ultimasNomenclaturas && stats.ultimasNomenclaturas.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Nomenclaturas Recientes
                </h3>
                <Badge variant="outline">{stats.ultimasNomenclaturas.length}</Badge>
              </div>

              <BadgeNomenclaturaLista
                nomenclaturas={stats.ultimasNomenclaturas.map(n => ({
                  nomenclatura: n.nomenclatura,
                  tipo: n.tipoDocumento
                }))}
                maxVisible={10}
              />
            </Card>
          )}

          {/* Acciones */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Acciones Administrativas
            </h3>
            <div className="flex gap-3">
              <Button
                onClick={handleExportar}
                variant="outline"
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Datos (JSON)
              </Button>
              <Button
                onClick={() => {
                  const data = JSON.stringify(stats, null, 2);
                  navigator.clipboard.writeText(data);
                  toast.success('Estadísticas Copiadas');
                }}
                variant="outline"
                className="flex-1"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Estadísticas
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
