import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';

interface ResolucionConflictosProps {
  className?: string;
  conflictoId?: string;
}

export function ResolucionConflictos({ className = '', conflictoId = '1' }: ResolucionConflictosProps) {
  const [solucionSeleccionada, setSolucionSeleccionada] = useState<string | null>(null);
  const [justificacion, setJustificacion] = useState('');

  const conflicto = {
    id: '1',
    tipo: 'Cruce Horario',
    descripcion: 'Juan Torres tiene asignadas dos clases simultáneas el Lunes 08:00-10:00',
    docente: 'Juan Torres Ramírez',
    asignaturas: ['Teoría Política (Grupo A)', 'Historia Política (Grupo B)']
  };

  const soluciones = [
    {
      id: '1',
      titulo: 'Reasignar Historia Política a otro horario',
      descripcion: 'Mover Historia Política (Grupo B) a Miércoles 14:00-16:00',
      impacto: 'Bajo',
      viabilidad: 'Alta',
      recomendada: true
    },
    {
      id: '2',
      titulo: 'Asignar otro docente a Historia Política',
      descripcion: 'Buscar docente disponible para Historia Política',
      impacto: 'Medio',
      viabilidad: 'Media',
      recomendada: false
    },
    {
      id: '3',
      titulo: 'Dividir grupo de Teoría Política',
      descripcion: 'Crear dos grupos más pequeños en horarios diferentes',
      impacto: 'Alto',
      viabilidad: 'Baja',
      recomendada: false
    }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      <h1 className="text-2xl font-bold text-gray-900">Resolución de Conflicto</h1>

      <Card className="p-6 bg-red-50 border-red-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-red-900 mb-1">{conflicto.tipo}</h3>
            <p className="text-red-700 mb-2">{conflicto.descripcion}</p>
            <div className="flex items-center gap-2">
              <Badge className="bg-red-100 text-red-700">{conflicto.docente}</Badge>
              {conflicto.asignaturas.map((asig, i) => (
                <Badge key={i} variant="secondary">{asig}</Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div>
        <h3 className="font-bold text-gray-900 mb-4">Soluciones Propuestas</h3>
        <div className="space-y-3">
          {soluciones.map((solucion) => (
            <Card
              key={solucion.id}
              className={`p-6 cursor-pointer transition-all ${
                solucionSeleccionada === solucion.id ? 'border-2 border-[#1e5da8] shadow-lg' : ''
              } ${solucion.recomendada ? 'border-green-300 bg-green-50' : ''}`}
              onClick={() => setSolucionSeleccionada(solucion.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-bold text-gray-900">{solucion.titulo}</h4>
                    {solucion.recomendada && (
                      <Badge className="bg-green-100 text-green-700">Recomendada</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mb-3">{solucion.descripcion}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600">Impacto: <strong>{solucion.impacto}</strong></span>
                    <span className="text-gray-600">Viabilidad: <strong>{solucion.viabilidad}</strong></span>
                  </div>
                </div>
                {solucionSeleccionada === solucion.id && (
                  <CheckCircle className="w-6 h-6 text-[#1e5da8]" />
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {solucionSeleccionada && (
        <Card className="p-6">
          <h3 className="font-bold text-gray-900 mb-3">Justificación</h3>
          <Textarea
            value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)}
            placeholder="Explica por qué seleccionaste esta solución..."
            rows={4}
          />
        </Card>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline">Cancelar</Button>
        <Button 
          disabled={!solucionSeleccionada}
          className="bg-[#1e5da8]"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Aplicar Solución
        </Button>
      </div>
    </div>
  );
}
