/**
 * ModalActas - Gestión de Actas de Audiencias y Diligencias
 * Actas = Registro oficial de lo acontecido en audiencias y diligencias procesales
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../ui/dialog';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { 
  FileCheck, Download, Eye, FileText, Calendar, 
  Users, Clock, X, Upload, CheckCircle, AlertCircle, Play
} from 'lucide-react';
import type { ExpedienteJudicial } from '../core/types';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';

interface ModalActasProps {
  isOpen: boolean;
  onClose: () => void;
  expediente: ExpedienteJudicial;
}

// Tipos de actas
const tiposActa = [
  'TODAS',
  'Audiencia Inicial',
  'Audiencia de Conciliación',
  'Audiencia de Pruebas',
  'Inspección Judicial',
  'Declaración de Testigos',
  'Audiencia de Fallo'
];

// Datos mock de actas
const actasMock = [
  {
    id: 1,
    tipo: 'Audiencia Inicial',
    numero: 'ACTA-AUD-001-2024',
    fecha: '12/12/2024',
    hora: '10:00 AM - 11:30 AM',
    lugar: 'Juzgado 1° Administrativo - Sala 3',
    presidente: 'Dra. María Fernanda Torres',
    participantes: [
      'Dra. María Fernanda Torres (Jueza)',
      'Dr. Juan Pérez López (Apoderado ESAP)',
      'Dr. Carlos Gómez (Apoderado Demandante)',
      'Secretaria Judicial'
    ],
    resumen: 'Se llevó a cabo la audiencia inicial del proceso. Se verificó la competencia del juzgado, se fijó como objeto del proceso las pretensiones del demandante. Se concedió traslado para contestación de demanda por 30 días.',
    decisiones: [
      'Se admite la demanda presentada',
      'Se ordena traslado a la parte demandada por 30 días',
      'Se programa audiencia de conciliación para el 15/01/2025'
    ],
    estado: 'Firmada',
    estadoColor: 'green',
    archivo: 'acta_audiencia_inicial_001.pdf',
    tamaño: '1.8 MB',
    duracion: '1h 30min'
  },
  {
    id: 2,
    tipo: 'Audiencia de Conciliación',
    fecha: '15/01/2025',
    numero: 'ACTA-CONC-002-2025',
    hora: '09:00 AM - 10:30 AM',
    lugar: 'Juzgado 1° Administrativo - Sala 2',
    presidente: 'Dra. María Fernanda Torres',
    participantes: [
      'Dra. María Fernanda Torres (Jueza)',
      'Dr. Juan Pérez López (Apoderado ESAP)',
      'Dr. Carlos Gómez (Apoderado Demandante)',
      'Gloria Ramírez Ortiz (Demandante)',
      'Secretaria Judicial'
    ],
    resumen: 'Se adelantó audiencia de conciliación entre las partes. Se expusieron las posiciones de cada parte. No fue posible llegar a un acuerdo conciliatorio. Se ordena continuar con el trámite ordinario del proceso.',
    decisiones: [
      'No hay acuerdo conciliatorio',
      'Se ordena continuar el proceso',
      'Se fija audiencia de pruebas para el 05/02/2025'
    ],
    estado: 'Programada',
    estadoColor: 'blue',
    archivo: null,
    tamaño: null,
    duracion: '1h 30min'
  },
  {
    id: 3,
    tipo: 'Inspección Judicial',
    fecha: '20/01/2025',
    numero: 'ACTA-INSP-003-2025',
    hora: '02:00 PM - 04:00 PM',
    lugar: 'Instalaciones ESAP - Sede Bogotá',
    presidente: 'Dra. María Fernanda Torres',
    participantes: [
      'Dra. María Fernanda Torres (Jueza)',
      'Perito Judicial',
      'Dr. Juan Pérez López (Apoderado ESAP)',
      'Dr. Carlos Gómez (Apoderado Demandante)',
      'Secretaria Judicial'
    ],
    resumen: 'Se realizó inspección judicial en las instalaciones de ESAP para verificar las condiciones del puesto de trabajo del demandante y contrastar con sus afirmaciones en la demanda.',
    decisiones: [
      'Se dejó constancia de las instalaciones visitadas',
      'Se tomó registro fotográfico',
      'Se ordenó anexar informe pericial al expediente'
    ],
    estado: 'Programada',
    estadoColor: 'orange',
    archivo: null,
    tamaño: null,
    duracion: '2h'
  }
];

export function ModalActas({ isOpen, onClose, expediente }: ModalActasProps) {
  const [actas, setActas] = useState(actasMock);
  const [filtroTipo, setFiltroTipo] = useState<string>('TODAS');

  const handleDescargarActa = (acta: typeof actasMock[0]) => {
    if (!acta.archivo) {
      toast.warning('Acta no disponible', {
        description: 'Esta acta aún no ha sido firmada y digitalizada'
      });
      return;
    }
    toast.success('Descargando acta', {
      description: acta.numero
    });
  };

  const handleVerActa = (acta: typeof actasMock[0]) => {
    if (!acta.archivo) {
      toast.warning('Acta no disponible', {
        description: 'Esta acta aún no ha sido firmada y digitalizada'
      });
      return;
    }
    toast.info('Abriendo visor', {
      description: acta.numero
    });
  };

  const handleCargarActa = () => {
    toast.info('Cargar acta', {
      description: 'Seleccione el archivo PDF del acta firmada'
    });
  };

  const getEstadoBadge = (estado: string, color: string) => {
    const colors: Record<string, string> = {
      green: 'bg-green-100 text-green-700 border-green-300',
      blue: 'bg-blue-100 text-blue-700 border-blue-300',
      orange: 'bg-orange-100 text-orange-700 border-orange-300'
    };

    const icons: Record<string, JSX.Element> = {
      green: <CheckCircle className="w-3 h-3" />,
      blue: <Clock className="w-3 h-3" />,
      orange: <AlertCircle className="w-3 h-3" />
    };

    return (
      <Badge className={`${colors[color]} font-semibold flex items-center gap-1 text-xs`}>
        {icons[color]}
        {estado}
      </Badge>
    );
  };

  const actasFiltradas = filtroTipo === 'TODAS' 
    ? actas 
    : actas.filter(a => a.tipo === filtroTipo);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg" style={{ background: '#F3E5F5' }}>
                  <FileCheck className="w-5 h-5" style={{ color: '#7B1FA2' }} />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black" style={{ color: '#003DA5' }}>
                    Actas de Audiencias
                  </DialogTitle>
                  <p className="text-sm text-gray-600">
                    Registro de diligencias - {expediente.id}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge style={{ background: '#003DA5', color: '#FFFFFF' }}>
                  {expediente.etapa}
                </Badge>
                <Badge className="bg-purple-100 text-purple-700 font-semibold">
                  <FileCheck className="w-3 h-3 mr-1" />
                  {actas.length} actas
                </Badge>
                <Badge className="bg-green-100 text-green-700 font-semibold">
                  {actas.filter(a => a.estado === 'Firmada').length} firmadas
                </Badge>
              </div>
            </div>

            <Button onClick={onClose} variant="ghost" size="sm" className="ml-4">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            {tiposActa.map((tipo) => (
              <Button
                key={tipo}
                size="sm"
                variant={filtroTipo === tipo ? 'default' : 'outline'}
                onClick={() => setFiltroTipo(tipo)}
                className="text-xs whitespace-nowrap"
              >
                {tipo}
              </Button>
            ))}
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Información contextual */}
          <Card className="p-4 mb-4 bg-purple-50 border-purple-200">
            <h4 className="text-sm font-bold text-purple-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              ¿Qué son las Actas Procesales?
            </h4>
            <p className="text-xs text-purple-800 leading-relaxed">
              Las <strong>actas</strong> son documentos que registran oficialmente lo acontecido en 
              audiencias, inspecciones judiciales y demás diligencias procesales. Deben ser firmadas 
              por el juez, las partes y la secretaria judicial. Son prueba de lo actuado en el proceso.
            </p>
          </Card>

          {/* Lista de actas */}
          <div className="space-y-4">
            {actasFiltradas.length === 0 ? (
              <Card className="p-8 text-center">
                <FileCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-bold text-gray-600 mb-1">
                  No hay actas de tipo "{filtroTipo}"
                </p>
                <p className="text-xs text-gray-500">
                  Intenta con otro filtro
                </p>
              </Card>
            ) : (
              actasFiltradas.map((acta) => (
                <Card key={acta.id} className="p-5 hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
                  <div className="flex items-start gap-4">
                    {/* Icono */}
                    <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 flex-shrink-0">
                      <FileCheck className="w-7 h-7 text-purple-600" />
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-black text-gray-900 text-lg">{acta.numero}</h4>
                            {getEstadoBadge(acta.estado, acta.estadoColor)}
                          </div>
                          <Badge 
                            variant="outline" 
                            className="text-xs mb-2 bg-purple-50 text-purple-700 border-purple-300"
                          >
                            {acta.tipo}
                          </Badge>
                        </div>
                      </div>

                      {/* Info de la audiencia */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Fecha
                          </p>
                          <p className="text-xs font-bold text-gray-900">{acta.fecha}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Horario
                          </p>
                          <p className="text-xs font-bold text-gray-900">{acta.hora}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                            <Play className="w-3 h-3" />
                            Duración
                          </p>
                          <p className="text-xs font-bold text-gray-900">{acta.duracion}</p>
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-0.5">📍 Lugar</p>
                        <p className="text-xs font-bold text-gray-900">{acta.lugar}</p>
                      </div>

                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">⚖️ Presidente</p>
                        <p className="text-xs font-bold text-gray-900">{acta.presidente}</p>
                      </div>

                      {/* Participantes */}
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Participantes
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                          {acta.participantes.map((participante, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-xs text-gray-700">
                              <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                              {participante}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Resumen */}
                      <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs font-bold text-blue-900 mb-1">📝 Resumen</p>
                        <p className="text-sm text-blue-800 leading-relaxed">
                          {acta.resumen}
                        </p>
                      </div>

                      {/* Decisiones */}
                      <div className="mb-3">
                        <p className="text-xs font-bold text-gray-700 mb-2">✅ Decisiones Tomadas</p>
                        <ul className="space-y-1">
                          {acta.decisiones.map((decision, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                              <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                              <span>{decision}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Archivo */}
                      {acta.archivo ? (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                          <FileText className="w-5 h-5 text-red-600" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate">
                              {acta.archivo}
                            </p>
                            <p className="text-xs text-gray-500">{acta.tamaño}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleVerActa(acta)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDescargarActa(acta)}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                          <p className="text-xs font-bold text-orange-900 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Acta pendiente de firma y digitalización
                          </p>
                        </div>
                      )}
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
                onClick={handleCargarActa}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Cargar Acta
              </Button>
              <Button style={{ background: '#003DA5', color: '#FFFFFF' }}>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Descargar Todas
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}