/**
 * ModalAutos - Gestión de Autos Procesales
 * Autos = Decisiones judiciales emitidas por el juzgado durante el proceso
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../ui/dialog';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { 
  Scale, Download, Eye, FileText, Calendar, 
  AlertCircle, CheckCircle, Clock, X, Upload, Plus
} from 'lucide-react';
import type { ExpedienteJudicial } from '../core/types';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';

interface ModalAutosProps {
  isOpen: boolean;
  onClose: () => void;
  expediente: ExpedienteJudicial;
}

// Tipos de autos judiciales
const tiposAuto = [
  'Auto Admisorio',
  'Auto de Pruebas',
  'Auto de Traslado',
  'Auto de Archivo',
  'Auto de Nulidad',
  'Auto de Corrección',
  'Auto Interlocutorio',
  'Auto de Sustanciación'
];

// Datos mock de autos
const autosMock = [
  {
    id: 1,
    tipo: 'Auto Admisorio',
    numero: 'AUTO-001-2024',
    fecha: '10/12/2024',
    juzgado: 'Juzgado 1° Administrativo',
    resumen: 'Se admite demanda presentada por el actor contra ESAP. Se ordena notificar al demandado y dar traslado para contestación en término de 30 días.',
    estado: 'Notificado',
    estadoColor: 'green',
    archivo: 'auto_admisorio_001.pdf',
    tamaño: '1.2 MB',
    cumplimiento: 'Completado',
    fechaNotificacion: '12/12/2024'
  },
  {
    id: 2,
    tipo: 'Auto de Traslado',
    numero: 'AUTO-002-2024',
    fecha: '15/12/2024',
    juzgado: 'Juzgado 1° Administrativo',
    resumen: 'Se concede traslado de la demanda por el término de ley (30 días calendario) para que la parte demandada presente su contestación y excepciones.',
    estado: 'En Término',
    estadoColor: 'blue',
    archivo: 'auto_traslado_002.pdf',
    tamaño: '890 KB',
    cumplimiento: 'En Curso',
    fechaNotificacion: '16/12/2024',
    diasRestantes: 22
  },
  {
    id: 3,
    tipo: 'Auto de Pruebas',
    numero: 'AUTO-003-2024',
    fecha: '20/12/2024',
    juzgado: 'Juzgado 1° Administrativo',
    resumen: 'Se admiten las pruebas solicitadas por ambas partes. Se ordena practicar inspección judicial y tomar declaración de testigos.',
    estado: 'Pendiente',
    estadoColor: 'orange',
    archivo: 'auto_pruebas_003.pdf',
    tamaño: '1.5 MB',
    cumplimiento: 'Pendiente',
    fechaNotificacion: null
  }
];

export function ModalAutos({ isOpen, onClose, expediente }: ModalAutosProps) {
  const [autos, setAutos] = useState(autosMock);
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');

  const handleDescargarAuto = (auto: typeof autosMock[0]) => {
    toast.success('Descargando auto procesal', {
      description: `${auto.numero} - ${auto.archivo}`
    });
  };

  const handleVerAuto = (auto: typeof autosMock[0]) => {
    toast.info('Abriendo visor de documento', {
      description: auto.numero
    });
  };

  const handleCargarNuevoAuto = () => {
    toast.info('Funcionalidad de carga', {
      description: 'Seleccione el archivo PDF del auto judicial'
    });
  };

  const getEstadoBadge = (estado: string, color: string) => {
    const colors: Record<string, string> = {
      green: 'bg-green-100 text-green-700 border-green-300',
      blue: 'bg-blue-100 text-blue-700 border-blue-300',
      orange: 'bg-orange-100 text-orange-700 border-orange-300',
      red: 'bg-red-100 text-red-700 border-red-300'
    };

    const icons: Record<string, JSX.Element> = {
      green: <CheckCircle className="w-3 h-3" />,
      blue: <Clock className="w-3 h-3" />,
      orange: <AlertCircle className="w-3 h-3" />,
      red: <AlertCircle className="w-3 h-3" />
    };

    return (
      <Badge className={`${colors[color]} font-semibold flex items-center gap-1`}>
        {icons[color]}
        {estado}
      </Badge>
    );
  };

  const autosFiltrados = filtroTipo === 'TODOS' 
    ? autos 
    : autos.filter(a => a.tipo === filtroTipo);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg" style={{ background: '#FFF3E0' }}>
                  <Scale className="w-5 h-5" style={{ color: '#F57C00' }} />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black" style={{ color: '#003DA5' }}>
                    Autos Procesales
                  </DialogTitle>
                  <p className="text-sm text-gray-600">
                    Decisiones judiciales - {expediente.id}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge style={{ background: '#003DA5', color: '#FFFFFF' }}>
                  {expediente.etapa}
                </Badge>
                <Badge className="bg-orange-100 text-orange-700 font-semibold">
                  <FileText className="w-3 h-3 mr-1" />
                  {autos.length} autos
                </Badge>
              </div>
            </div>

            <Button onClick={onClose} variant="ghost" size="sm" className="ml-4">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-2 mt-4">
            <Button
              size="sm"
              variant={filtroTipo === 'TODOS' ? 'default' : 'outline'}
              onClick={() => setFiltroTipo('TODOS')}
              className="text-xs"
            >
              Todos ({autos.length})
            </Button>
            {tiposAuto.slice(0, 4).map((tipo) => (
              <Button
                key={tipo}
                size="sm"
                variant={filtroTipo === tipo ? 'default' : 'outline'}
                onClick={() => setFiltroTipo(tipo)}
                className="text-xs"
              >
                {tipo}
              </Button>
            ))}
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Información contextual */}
          <Card className="p-4 mb-4 bg-orange-50 border-orange-200">
            <h4 className="text-sm font-bold text-orange-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              ¿Qué son los Autos Procesales?
            </h4>
            <p className="text-xs text-orange-800 leading-relaxed">
              Los <strong>autos</strong> son decisiones judiciales emitidas por el juzgado durante el proceso. 
              A diferencia de las sentencias (que resuelven el fondo), los autos resuelven asuntos de trámite 
              como admisión de demandas, traslados, decreto de pruebas, nulidades, etc. Es fundamental dar 
              cumplimiento oportuno a cada auto para evitar sanciones procesales.
            </p>
          </Card>

          {/* Lista de autos */}
          <div className="space-y-3">
            {autosFiltrados.length === 0 ? (
              <Card className="p-8 text-center">
                <Scale className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-bold text-gray-600 mb-1">
                  No hay autos de tipo "{filtroTipo}"
                </p>
                <p className="text-xs text-gray-500">
                  Intenta con otro filtro o carga un nuevo auto
                </p>
              </Card>
            ) : (
              autosFiltrados.map((auto) => (
                <Card key={auto.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    {/* Icono del tipo */}
                    <div className="p-3 rounded-lg bg-orange-50 flex-shrink-0">
                      <Scale className="w-6 h-6 text-orange-600" />
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-black text-gray-900">{auto.numero}</h4>
                            {getEstadoBadge(auto.estado, auto.estadoColor)}
                          </div>
                          <Badge variant="outline" className="text-xs mb-2">
                            {auto.tipo}
                          </Badge>
                        </div>
                      </div>

                      {/* Resumen */}
                      <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                        {auto.resumen}
                      </p>

                      {/* Metadata */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">📅 Fecha Auto</p>
                          <p className="text-xs font-bold text-gray-900">{auto.fecha}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">⚖️ Juzgado</p>
                          <p className="text-xs font-bold text-gray-900">Juzgado 1°</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">🔔 Notificación</p>
                          <p className="text-xs font-bold text-gray-900">
                            {auto.fechaNotificacion || 'Pendiente'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">✅ Cumplimiento</p>
                          <p className="text-xs font-bold text-gray-900">{auto.cumplimiento}</p>
                        </div>
                      </div>

                      {/* Alerta de días restantes */}
                      {auto.diasRestantes && (
                        <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 mb-3">
                          <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            Quedan {auto.diasRestantes} días para dar cumplimiento
                          </p>
                        </div>
                      )}

                      {/* Archivo */}
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200">
                        <FileText className="w-4 h-4 text-red-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">
                            {auto.archivo}
                          </p>
                          <p className="text-xs text-gray-500">{auto.tamaño}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleVerAuto(auto)}
                            title="Ver documento"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDescargarAuto(auto)}
                            title="Descargar"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-3">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleCargarNuevoAuto}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Cargar Auto Nuevo
              </Button>
              <Button style={{ background: '#003DA5', color: '#FFFFFF' }}>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Descargar Todos
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
