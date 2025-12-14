/**
 * COMPONENTE PRINCIPAL: Editor de PTA con Motor Completo
 * Integra el hook usePTA con todos los componentes visuales
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  FlaskConical, 
  Users, 
  Briefcase,
  Save,
  Send,
  AlertCircle,
  Lock,
  CheckCircle,
  Eye
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription } from '../../ui/alert';
import { usePTA } from '../../../hooks/usePTA';
import { PTAValidaciones } from './PTAValidaciones';
import { PTAResumen } from './PTAResumen';
import { PTADocenciaForm } from './PTADocenciaForm';
import { PTAInvestigacionForm } from './PTAInvestigacionForm';
import { PTAExtensionForm } from './PTAExtensionForm';
import { PTAComplementariasForm } from './PTAComplementariasForm';

interface PTAEditorProps {
  ptaId?: number;
  docenteId?: number;
  periodoId?: number;
  horasBase?: number;
  onGuardar?: () => void;
  onEnviar?: () => void;
  className?: string;
}

export function PTAEditor({ 
  ptaId,
  docenteId,
  periodoId,
  horasBase = 1600,
  onGuardar,
  onEnviar,
  className = ''
}: PTAEditorProps) {
  const [tabActivo, setTabActivo] = useState('docencia');
  const [mostrarResumen, setMostrarResumen] = useState(false);

  // Hook principal con toda la lógica
  const pta = usePTA({
    ptaId,
    docenteId,
    periodoId,
    horasBase,
    modoEdicion: true
  });

  const tabs = [
    {
      id: 'docencia',
      label: 'Docencia',
      icon: BookOpen,
      color: 'blue',
      bloqueado: false,
      descripcion: 'Sin tope • SAGRADA'
    },
    {
      id: 'investigacion',
      label: 'Investigación',
      icon: FlaskConical,
      color: 'orange',
      bloqueado: pta.tabsBloqueados.investigacion,
      descripcion: 'Máx. 50%'
    },
    {
      id: 'extension',
      label: 'Extensión',
      icon: Users,
      color: 'purple',
      bloqueado: pta.tabsBloqueados.extension,
      descripcion: 'Máx. 25%'
    },
    {
      id: 'complementarias',
      label: 'Complementarias',
      icon: Briefcase,
      color: 'green',
      bloqueado: pta.tabsBloqueados.complementarias,
      descripcion: 'Máx. 25%'
    }
  ];

  const handleGuardar = async () => {
    try {
      // TODO: Implementar guardado
      onGuardar?.();
    } catch (error) {
      console.error('Error al guardar:', error);
    }
  };

  const handleEnviar = async () => {
    try {
      await pta.enviarAAprobacion();
      onEnviar?.();
    } catch (error) {
      console.error('Error al enviar:', error);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#003DA5]">
              Plan de Trabajo Académico (PTA)
            </h2>
            <p className="text-gray-600 mt-1">
              Docente ID: {docenteId || 'N/A'} • Periodo: {periodoId || 'N/A'} • 
              Horas Base: {horasBase}h
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className="bg-white text-lg px-4 py-2"
            >
              {pta.estado}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMostrarResumen(!mostrarResumen)}
            >
              <Eye className="w-4 h-4 mr-1" />
              {mostrarResumen ? 'Ocultar' : 'Ver'} Resumen
            </Button>
          </div>
        </div>
      </Card>

      {/* Resumen (colapsable) */}
      {mostrarResumen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <PTAResumen
            horasBase={pta.horasBase}
            totales={pta.totales}
            totalesFinales={pta.totalesFinales}
            prorrateo={pta.prorrateo}
          />
        </motion.div>
      )}

      {/* Validaciones */}
      <PTAValidaciones validaciones={pta.validaciones} />

      {/* Tabs Principales */}
      <Card className="p-6">
        <Tabs value={tabActivo} onValueChange={setTabActivo}>
          <TabsList className="grid grid-cols-4 gap-2 mb-6">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const total = pta.totalesFinales[
                tab.id === 'docencia' ? 'docencia' :
                tab.id === 'investigacion' ? 'investigacion' :
                tab.id === 'extension' ? 'extension' :
                'complementarias'
              ];

              return (
                <TabsTrigger 
                  key={tab.id}
                  value={tab.id}
                  disabled={tab.bloqueado}
                  className="relative"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <div className="text-left">
                      <div className="font-medium">{tab.label}</div>
                      <div className="text-xs text-gray-500">{tab.descripcion}</div>
                    </div>
                    {tab.bloqueado && (
                      <Lock className="w-3 h-3 text-gray-400 ml-1" />
                    )}
                    {total > 0 && (
                      <Badge 
                        variant="outline" 
                        className={`ml-auto bg-${tab.color}-50 text-${tab.color}-700 border-${tab.color}-200`}
                      >
                        {total.toFixed(0)}h
                      </Badge>
                    )}
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Tab Content: Docencia */}
          <TabsContent value="docencia">
            <PTADocenciaForm
              docencias={pta.docencias}
              onAgregar={pta.agregarDocencia}
              onEliminar={pta.eliminarDocencia}
              bloqueado={pta.estado !== 'EN_CONSTRUCCION'}
            />
          </TabsContent>

          {/* Tab Content: Investigación */}
          <TabsContent value="investigacion">
            <PTAInvestigacionForm
              data={pta.investigacion}
              onChange={(data) => {
                // TODO: Integrar con el hook usePTA
                console.log('Investigación actualizada:', data);
              }}
              readonly={pta.estado !== 'EN_CONSTRUCCION'}
            />
          </TabsContent>

          {/* Tab Content: Extensión */}
          <TabsContent value="extension">
            <PTAExtensionForm
              data={pta.extension}
              onChange={(data) => {
                // TODO: Integrar con el hook usePTA
                console.log('Extensión actualizada:', data);
              }}
              readonly={pta.estado !== 'EN_CONSTRUCCION'}
            />
          </TabsContent>

          {/* Tab Content: Complementarias */}
          <TabsContent value="complementarias">
            <PTAComplementariasForm
              data={pta.complementarias}
              onChange={(data) => {
                // TODO: Integrar con el hook usePTA
                console.log('Complementarias actualizadas:', data);
              }}
              readonly={pta.estado !== 'EN_CONSTRUCCION'}
            />
          </TabsContent>
        </Tabs>
      </Card>

      {/* Actions Footer */}
      <Card className="p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {pta.resumen.erroresDuros.length > 0 ? (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span>Hay {pta.resumen.erroresDuros.length} error(es) que corregir</span>
              </div>
            ) : pta.puedeEnviar ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span>PTA listo para enviar</span>
              </div>
            ) : (
              <span>Continue agregando actividades</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleGuardar}
              disabled={pta.loading}
            >
              <Save className="w-4 h-4 mr-1" />
              Guardar Borrador
            </Button>
            
            <Button
              onClick={handleEnviar}
              disabled={!pta.puedeEnviar || pta.loading}
            >
              <Send className="w-4 h-4 mr-1" />
              Enviar a Aprobación
            </Button>
          </div>
        </div>
      </Card>

      {/* Debug Info (solo en desarrollo) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="text-xs">
          <summary className="cursor-pointer font-mono text-gray-500">
            🔧 Debug Info
          </summary>
          <pre className="mt-2 p-4 bg-gray-900 text-green-400 rounded overflow-auto">
            {JSON.stringify(pta.resumen, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
