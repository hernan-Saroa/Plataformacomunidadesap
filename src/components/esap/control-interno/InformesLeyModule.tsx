import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Calendar,
  Clock,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Send,
  Edit2,
  Trash2,
  Archive
} from 'lucide-react';
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/Button';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';
import { ModalSIGL } from '../gestion-legal/design-system/ModalSIGL';
import { InputSIGL } from '../gestion-legal/design-system/Input';
import { toast } from 'sonner';
import { CATALOGO_INFORMES_LEY, InformeLeyNormativo, PeriodicidadInforme } from './CatalogoInformesLey';

// ====================================
// TIPOS
// ====================================

interface InformeGenerado {
  id: string;
  informeLeyId: string;
  informeNombre: string;
  periodo: string;
  fechaGeneracion: string;
  fechaVencimiento: string;
  estado: 'BORRADOR' | 'GENERADO' | 'ENVIADO' | 'ATRASADO';
  generadoPor: string;
  archivoUrl?: string;
  observaciones?: string;
}

type VistaActual = 'CATALOGO' | 'GENERADOS' | 'PROXIMOS';
type FiltroPeriodicidad = PeriodicidadInforme | 'todos';

// ====================================
// COMPONENTE PRINCIPAL
// ====================================

export const InformesLeyModule: React.FC = () => {
  const [vistaActual, setVistaActual] = useState<VistaActual>('CATALOGO');
  const [busqueda, setBusqueda] = useState('');
  const [filtroPeriodicidad, setFiltroPeriodicidad] = useState<FiltroPeriodicidad>('todos');
  const [modalDetalle, setModalDetalle] = useState<{ abierto: boolean; informe?: InformeLeyNormativo }>({ abierto: false });
  const [modalGenerar, setModalGenerar] = useState<{ abierto: boolean; informe?: InformeLeyNormativo }>({ abierto: false });

  // Informes generados (mock - después conectar con backend)
  const [informesGenerados] = useState<InformeGenerado[]>([
    {
      id: 'gen1',
      informeLeyId: 'inf-ley-001',
      informeNombre: 'Informe Pormenorizado',
      periodo: '2025-S1',
      fechaGeneracion: '2025-02-20',
      fechaVencimiento: '2025-02-28',
      estado: 'ENVIADO',
      generadoPor: 'Fernando Ávila',
      archivoUrl: '/mock/informes/pormenorizado-2025-s1.pdf'
    },
    {
      id: 'gen2',
      informeLeyId: 'inf-ley-002',
      informeNombre: 'Informe Anual OCI',
      periodo: '2024',
      fechaGeneracion: '2025-02-15',
      fechaVencimiento: '2025-02-28',
      estado: 'ENVIADO',
      generadoPor: 'Fernando Ávila',
      archivoUrl: '/mock/informes/anual-oci-2024.pdf'
    }
  ]);

  // Filtrado de catálogo
  const informesFiltrados = useMemo(() => {
    let resultado = CATALOGO_INFORMES_LEY.filter(inf => inf.activo);

    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase();
      resultado = resultado.filter(inf =>
        inf.nombre.toLowerCase().includes(termino) ||
        inf.nombreCorto.toLowerCase().includes(termino) ||
        inf.baseNormativa.toLowerCase().includes(termino)
      );
    }

    if (filtroPeriodicidad !== 'todos') {
      resultado = resultado.filter(inf => inf.periodicidad === filtroPeriodicidad);
    }

    return resultado;
  }, [busqueda, filtroPeriodicidad]);

  // Próximos informes (próximos 60 días)
  const proximosInformes = useMemo(() => {
    const ahora = new Date();
    const dentro60Dias = new Date(ahora.getTime() + 60 * 24 * 60 * 60 * 1000);

    return CATALOGO_INFORMES_LEY
      .filter(inf => inf.activo)
      .map(inf => {
        const fechasProximas = calcularProximasFechas(inf, ahora, dentro60Dias);
        return {
          ...inf,
          proximaFecha: fechasProximas[0] || null,
          diasRestantes: fechasProximas[0] ? Math.ceil((new Date(fechasProximas[0]).getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)) : null
        };
      })
      .filter(inf => inf.proximaFecha !== null)
      .sort((a, b) => (a.diasRestantes || 999) - (b.diasRestantes || 999));
  }, []);

  // Estadísticas
  const estadisticas = useMemo(() => {
    const totalInformes = CATALOGO_INFORMES_LEY.filter(i => i.activo).length;
    const informesEnviados = informesGenerados.filter(i => i.estado === 'ENVIADO').length;
    const informesPendientes = proximosInformes.filter(i => (i.diasRestantes || 0) <= 30).length;
    const informesAtrasados = informesGenerados.filter(i => i.estado === 'ATRASADO').length;

    return {
      totalInformes,
      informesEnviados,
      informesPendientes,
      informesAtrasados
    };
  }, [informesGenerados, proximosInformes]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Informes de Ley</h1>
                  <p className="text-sm text-gray-500">Gestión del catálogo normativo de informes obligatorios</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <ButtonSIGL
                variant={vistaActual === 'CATALOGO' ? 'primary' : 'default'}
                onClick={() => setVistaActual('CATALOGO')}
              >
                <FileText className="w-4 h-4" />
                Catálogo
              </ButtonSIGL>
              <ButtonSIGL
                variant={vistaActual === 'GENERADOS' ? 'primary' : 'default'}
                onClick={() => setVistaActual('GENERADOS')}
              >
                <Archive className="w-4 h-4" />
                Generados
              </ButtonSIGL>
              <ButtonSIGL
                variant={vistaActual === 'PROXIMOS' ? 'primary' : 'default'}
                onClick={() => setVistaActual('PROXIMOS')}
              >
                <Clock className="w-4 h-4" />
                Próximos
              </ButtonSIGL>
            </div>
          </div>
        </motion.div>

        {/* ESTADÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CardSIGL>
            <div className="p-6">
              <FileText className="w-8 h-8 text-indigo-600 mb-2" />
              <div className="text-3xl font-bold text-gray-900 mb-1">{estadisticas.totalInformes}</div>
              <div className="text-sm text-gray-600">Total Informes</div>
            </div>
          </CardSIGL>

          <CardSIGL>
            <div className="p-6">
              <CheckCircle2 className="w-8 h-8 text-green-600 mb-2" />
              <div className="text-3xl font-bold text-gray-900 mb-1">{estadisticas.informesEnviados}</div>
              <div className="text-sm text-gray-600">Enviados este Año</div>
            </div>
          </CardSIGL>

          <CardSIGL>
            <div className="p-6">
              <Clock className="w-8 h-8 text-yellow-600 mb-2" />
              <div className="text-3xl font-bold text-gray-900 mb-1">{estadisticas.informesPendientes}</div>
              <div className="text-sm text-gray-600">Próximos 30 Días</div>
            </div>
          </CardSIGL>

          <CardSIGL>
            <div className="p-6">
              <AlertTriangle className="w-8 h-8 text-red-600 mb-2" />
              <div className="text-3xl font-bold text-gray-900 mb-1">{estadisticas.informesAtrasados}</div>
              <div className="text-sm text-gray-600">Atrasados</div>
            </div>
          </CardSIGL>
        </div>

        {/* CONTENIDO DINÁMICO */}
        <AnimatePresence mode="wait">
          <motion.div
            key={vistaActual}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {vistaActual === 'CATALOGO' && (
              <VistaCatalogo
                informes={informesFiltrados}
                busqueda={busqueda}
                setBusqueda={setBusqueda}
                filtroPeriodicidad={filtroPeriodicidad}
                setFiltroPeriodicidad={setFiltroPeriodicidad}
                onVerDetalle={(informe) => setModalDetalle({ abierto: true, informe })}
                onGenerar={(informe) => setModalGenerar({ abierto: true, informe })}
              />
            )}

            {vistaActual === 'GENERADOS' && (
              <VistaGenerados informes={informesGenerados} />
            )}

            {vistaActual === 'PROXIMOS' && (
              <VistaProximos
                informes={proximosInformes}
                onGenerar={(informe) => setModalGenerar({ abierto: true, informe })}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* MODAL DETALLE */}
        {modalDetalle.abierto && modalDetalle.informe && (
          <ModalDetalleInforme
            informe={modalDetalle.informe}
            onClose={() => setModalDetalle({ abierto: false })}
            onGenerar={() => {
              setModalDetalle({ abierto: false });
              setModalGenerar({ abierto: true, informe: modalDetalle.informe });
            }}
          />
        )}

        {/* MODAL GENERAR */}
        {modalGenerar.abierto && modalGenerar.informe && (
          <ModalGenerarInforme
            informe={modalGenerar.informe}
            onClose={() => setModalGenerar({ abierto: false })}
            onGenerar={() => {
              toast.success('Informe generado exitosamente');
              setModalGenerar({ abierto: false });
            }}
          />
        )}
      </div>
    </div>
  );
};

// ====================================
// VISTA: CATÁLOGO
// ====================================

const VistaCatalogo: React.FC<{
  informes: InformeLeyNormativo[];
  busqueda: string;
  setBusqueda: (v: string) => void;
  filtroPeriodicidad: FiltroPeriodicidad;
  setFiltroPeriodicidad: (v: FiltroPeriodicidad) => void;
  onVerDetalle: (informe: InformeLeyNormativo) => void;
  onGenerar: (informe: InformeLeyNormativo) => void;
}> = ({ informes, busqueda, setBusqueda, filtroPeriodicidad, setFiltroPeriodicidad, onVerDetalle, onGenerar }) => {
  return (
    <>
      {/* Filtros */}
      <CardSIGL>
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, normativa..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <select
                value={filtroPeriodicidad}
                onChange={(e) => setFiltroPeriodicidad(e.target.value as FiltroPeriodicidad)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="todos">Todas las periodicidades</option>
                <option value="mensual">Mensual</option>
                <option value="bimestral">Bimestral</option>
                <option value="trimestral">Trimestral</option>
                <option value="cuatrimestral">Cuatrimestral</option>
                <option value="semestral">Semestral</option>
                <option value="anual">Anual</option>
              </select>
            </div>
          </div>
        </div>
      </CardSIGL>

      {/* Lista de Informes */}
      <div className="space-y-3">
        {informes.map((informe, index) => (
          <motion.div
            key={informe.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <CardSIGL>
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-indigo-600" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{informe.nombreCorto}</h3>
                        <BadgeSIGL variant="info">{informe.codigo}</BadgeSIGL>
                        <BadgeSIGL variant="default">
                          <Calendar className="w-3 h-3" />
                          {informe.periodicidad}
                        </BadgeSIGL>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">{informe.baseNormativa} - {informe.articuloEspecifico}</p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Destinatarios:</span>
                          <p className="text-gray-600">{informe.destinatarios.join(', ')}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Plazo de Entrega:</span>
                          <p className="text-gray-600">{informe.plazoEntrega}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Responsable:</span>
                          <p className="text-gray-600">{informe.responsableRol}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0 ml-4">
                    <ButtonSIGL variant="default" onClick={() => onVerDetalle(informe)}>
                      <Eye className="w-4 h-4" />
                      Ver Detalle
                    </ButtonSIGL>
                    <ButtonSIGL variant="primary" onClick={() => onGenerar(informe)}>
                      <Plus className="w-4 h-4" />
                      Generar
                    </ButtonSIGL>
                  </div>
                </div>
              </div>
            </CardSIGL>
          </motion.div>
        ))}

        {informes.length === 0 && (
          <CardSIGL>
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron informes</h3>
              <p className="text-gray-600">Intenta ajustar los filtros de búsqueda</p>
            </div>
          </CardSIGL>
        )}
      </div>
    </>
  );
};

// ====================================
// VISTA: GENERADOS
// ====================================

const VistaGenerados: React.FC<{ informes: InformeGenerado[] }> = ({ informes }) => {
  return (
    <div className="space-y-3">
      {informes.map((informe, index) => (
        <motion.div
          key={informe.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <CardSIGL>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    informe.estado === 'ENVIADO' ? 'bg-green-100' :
                    informe.estado === 'ATRASADO' ? 'bg-red-100' :
                    'bg-yellow-100'
                  }`}>
                    <FileText className={`w-6 h-6 ${
                      informe.estado === 'ENVIADO' ? 'text-green-600' :
                      informe.estado === 'ATRASADO' ? 'text-red-600' :
                      'text-yellow-600'
                    }`} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{informe.informeNombre}</h3>
                      <BadgeSIGL variant={
                        informe.estado === 'ENVIADO' ? 'success' :
                        informe.estado === 'ATRASADO' ? 'danger' :
                        informe.estado === 'GENERADO' ? 'warning' : 'default'
                      }>
                        {informe.estado}
                      </BadgeSIGL>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Período:</span>
                        <p className="text-gray-600">{informe.periodo}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Generado:</span>
                        <p className="text-gray-600">{new Date(informe.fechaGeneracion).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Vencimiento:</span>
                        <p className="text-gray-600">{new Date(informe.fechaVencimiento).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Generado por:</span>
                        <p className="text-gray-600">{informe.generadoPor}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <ButtonSIGL variant="default">
                    <Eye className="w-4 h-4" />
                    Ver
                  </ButtonSIGL>
                  <ButtonSIGL variant="default">
                    <Download className="w-4 h-4" />
                    Descargar
                  </ButtonSIGL>
                </div>
              </div>
            </div>
          </CardSIGL>
        </motion.div>
      ))}

      {informes.length === 0 && (
        <CardSIGL>
          <div className="p-12 text-center">
            <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay informes generados</h3>
            <p className="text-gray-600">Los informes que generes aparecerán aquí</p>
          </div>
        </CardSIGL>
      )}
    </div>
  );
};

// ====================================
// VISTA: PRÓXIMOS
// ====================================

const VistaProximos: React.FC<{
  informes: any[];
  onGenerar: (informe: InformeLeyNormativo) => void;
}> = ({ informes, onGenerar }) => {
  return (
    <div className="space-y-3">
      {informes.map((informe, index) => (
        <motion.div
          key={informe.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <CardSIGL>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    informe.diasRestantes <= 7 ? 'bg-red-100' :
                    informe.diasRestantes <= 15 ? 'bg-yellow-100' :
                    'bg-blue-100'
                  }`}>
                    <Clock className={`w-6 h-6 ${
                      informe.diasRestantes <= 7 ? 'text-red-600' :
                      informe.diasRestantes <= 15 ? 'text-yellow-600' :
                      'text-blue-600'
                    }`} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{informe.nombreCorto}</h3>
                      <BadgeSIGL variant={
                        informe.diasRestantes <= 7 ? 'danger' :
                        informe.diasRestantes <= 15 ? 'warning' : 'info'
                      }>
                        {informe.diasRestantes} días
                      </BadgeSIGL>
                      <BadgeSIGL variant="default">
                        <Calendar className="w-3 h-3" />
                        {informe.periodicidad}
                      </BadgeSIGL>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Próxima Fecha:</span>
                        <p className="text-gray-600">{informe.proximaFecha}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Base Normativa:</span>
                        <p className="text-gray-600">{informe.baseNormativa}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Responsable:</span>
                        <p className="text-gray-600">{informe.responsableRol}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <ButtonSIGL variant="primary" onClick={() => onGenerar(informe)}>
                  <Plus className="w-4 h-4" />
                  Generar Ahora
                </ButtonSIGL>
              </div>
            </div>
          </CardSIGL>
        </motion.div>
      ))}

      {informes.length === 0 && (
        <CardSIGL>
          <div className="p-12 text-center">
            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay informes próximos</h3>
            <p className="text-gray-600">No hay informes programados para los próximos 60 días</p>
          </div>
        </CardSIGL>
      )}
    </div>
  );
};

// ====================================
// MODAL: DETALLE INFORME
// ====================================

const ModalDetalleInforme: React.FC<{
  informe: InformeLeyNormativo;
  onClose: () => void;
  onGenerar: () => void;
}> = ({ informe, onClose, onGenerar }) => {
  return (
    <ModalSIGL isOpen={true} onClose={onClose} title="Detalle del Informe" size="large">
      <div className="space-y-4">
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <h3 className="font-bold text-indigo-900 mb-2">{informe.nombre}</h3>
          <p className="text-sm text-indigo-700">{informe.codigo}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-700">Base Normativa:</p>
            <p className="text-gray-900">{informe.baseNormativa}</p>
            <p className="text-gray-600">{informe.articuloEspecifico}</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Periodicidad:</p>
            <p className="text-gray-900 capitalize">{informe.periodicidad}</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Plazo de Entrega:</p>
            <p className="text-gray-900">{informe.plazoEntrega}</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Responsable:</p>
            <p className="text-gray-900">{informe.responsableRol}</p>
          </div>
        </div>

        <div>
          <p className="font-medium text-gray-700 mb-2">Destinatarios:</p>
          <div className="flex flex-wrap gap-2">
            {informe.destinatarios.map((dest, i) => (
              <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                {dest}
              </span>
            ))}
          </div>
        </div>

        {informe.observaciones && (
          <div>
            <p className="font-medium text-gray-700 mb-2">Observaciones:</p>
            <p className="text-sm text-gray-600 bg-gray-50 rounded p-3">{informe.observaciones}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <ButtonSIGL variant="default" onClick={onClose}>
            Cerrar
          </ButtonSIGL>
          <ButtonSIGL variant="primary" onClick={onGenerar}>
            <Plus className="w-4 h-4" />
            Generar Informe
          </ButtonSIGL>
        </div>
      </div>
    </ModalSIGL>
  );
};

// ====================================
// MODAL: GENERAR INFORME
// ====================================

const ModalGenerarInforme: React.FC<{
  informe: InformeLeyNormativo;
  onClose: () => void;
  onGenerar: () => void;
}> = ({ informe, onClose, onGenerar }) => {
  const [periodo, setPeriodo] = useState('');
  const [observaciones, setObservaciones] = useState('');

  return (
    <ModalSIGL isOpen={true} onClose={onClose} title="Generar Informe" size="medium">
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-medium text-blue-900">{informe.nombreCorto}</p>
          <p className="text-sm text-blue-700">{informe.periodicidad}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Período *
          </label>
          <InputSIGL
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            placeholder={informe.periodicidad === 'anual' ? '2025' : '2025-T1'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observaciones (Opcional)
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Agregue comentarios adicionales..."
          />
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            El sistema generará el informe automáticamente con los datos disponibles. Puede editarlo después.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <ButtonSIGL variant="default" onClick={onClose}>
            Cancelar
          </ButtonSIGL>
          <ButtonSIGL variant="primary" onClick={onGenerar} disabled={!periodo.trim()}>
            <Plus className="w-4 h-4" />
            Generar Informe
          </ButtonSIGL>
        </div>
      </div>
    </ModalSIGL>
  );
};

// ====================================
// FUNCIONES AUXILIARES
// ====================================

function calcularProximasFechas(informe: InformeLeyNormativo, desde: Date, hasta: Date): string[] {
  const fechas: string[] = [];
  const meses = Array.isArray(informe.mesGeneracion) ? informe.mesGeneracion : [informe.mesGeneracion];
  
  for (let year = desde.getFullYear(); year <= hasta.getFullYear() + 1; year++) {
    for (const mes of meses) {
      const fecha = new Date(year, mes - 1, 15); // Día 15 del mes
      if (fecha >= desde && fecha <= hasta) {
        fechas.push(fecha.toISOString().split('T')[0]);
      }
    }
  }

  return fechas.sort();
}

export default InformesLeyModule;
