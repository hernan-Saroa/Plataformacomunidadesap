import { useState } from 'react';
import { Shield, User, Calendar, FileText, Download, Filter } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface AuditoriaLogProps {
  className?: string;
}

interface LogEntry {
  id: string;
  accion: string;
  usuario: string;
  modulo: string;
  entidad_afectada: string;
  detalles: string;
  fecha: string;
  ip: string;
}

export function AuditoriaLog({ className = '' }: AuditoriaLogProps) {
  const [filtroModulo, setFiltroModulo] = useState('todos');

  const logs: LogEntry[] = [
    {
      id: '1',
      accion: 'Crear',
      usuario: 'admin@esap.edu.co',
      modulo: 'Docentes',
      entidad_afectada: 'Docente #1234',
      detalles: 'Creó nuevo registro de docente: María López Gómez',
      fecha: '2025-02-20 10:30:15',
      ip: '192.168.1.100'
    },
    {
      id: '2',
      accion: 'Actualizar',
      usuario: 'coordinador@esap.edu.co',
      modulo: 'PTAs',
      entidad_afectada: 'PTA #5678',
      detalles: 'Aprobó PTA de María López - Periodo 2025-I',
      fecha: '2025-02-20 09:45:22',
      ip: '192.168.1.101'
    },
    {
      id: '3',
      accion: 'Eliminar',
      usuario: 'admin@esap.edu.co',
      modulo: 'Convocatorias',
      entidad_afectada: 'Convocatoria #9999',
      detalles: 'Eliminó convocatoria: CONV-2024-999',
      fecha: '2025-02-19 16:20:33',
      ip: '192.168.1.100'
    },
    {
      id: '4',
      accion: 'Consultar',
      usuario: 'docente@esap.edu.co',
      modulo: 'Evaluación',
      entidad_afectada: 'Resultados',
      detalles: 'Consultó resultados de evaluación docente',
      fecha: '2025-02-19 14:10:45',
      ip: '192.168.1.150'
    }
  ];

  const getAccionColor = (accion: string) => {
    switch (accion) {
      case 'Crear': return 'bg-green-100 text-green-700';
      case 'Actualizar': return 'bg-blue-100 text-blue-700';
      case 'Eliminar': return 'bg-red-100 text-red-700';
      case 'Consultar': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const logsFiltrados = filtroModulo === 'todos'
    ? logs
    : logs.filter(l => l.modulo === filtroModulo);

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auditoría</h1>
          <p className="text-gray-600 mt-1">Registro de actividades del sistema</p>
        </div>
        <Button size="sm" variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar Log
        </Button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {['todos', 'Docentes', 'PTAs', 'Convocatorias', 'Evaluación'].map((modulo) => (
          <button
            key={modulo}
            onClick={() => setFiltroModulo(modulo)}
            className={`px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap ${
              filtroModulo === modulo ? 'bg-[#1e5da8] text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {modulo}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {logsFiltrados.map((log) => (
          <Card key={log.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={getAccionColor(log.accion)}>{log.accion}</Badge>
                  <Badge variant="secondary">{log.modulo}</Badge>
                  <span className="text-xs text-gray-500">{log.entidad_afectada}</span>
                </div>
                <p className="text-sm text-gray-900 mb-2">{log.detalles}</p>
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{log.usuario}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{log.fecha}</span>
                  </div>
                  <span>IP: {log.ip}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
