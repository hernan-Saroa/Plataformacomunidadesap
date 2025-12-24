/**
 * ModuloAsesoriaJuridicaV3 - MOD-03: Asesoría Jurídica
 * DISEÑO DATATABLE PROFESIONAL CON FILTROS AVANZADOS
 */

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Scale, FileText, Clock, AlertTriangle, CheckCircle, User, Building,
  Eye, Edit, Plus, Download, Filter, Search, Calendar, TrendingUp,
  Archive, MessageSquare, History, Send, FileCheck, Mail, Columns3, List,
  AlertCircle, FolderOpen, FileQuestion, SortAsc, SortDesc, XCircle
} from 'lucide-react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { Input } from '../../../ui/input';
import { ConsultaJuridica } from '../core/types';
import { consultasJuridicasMock, estadisticasAsesoriaJuridica } from '../data/datosConsultasJuridicas';
import { toast } from 'sonner@2.0.3';

type VistaModulo = 'tabla' | 'tarjetas';
type OrdenColumna = 'id' | 'fecha' | 'dias' | 'tema';

export function ModuloAsesoriaJuridicaV3() {
  const [tipoVista, setTipoVista] = useState<VistaModulo>('tabla');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState<string>('TODAS');
  const [filtroSemaforo, setFiltroSemaforo] = useState<string>('TODOS');
  const [orden, setOrden] = useState<OrdenColumna>('dias');
  const [direccionOrden, setDireccionOrden] = useState<'asc' | 'desc'>('asc');

  const consultasFiltradas = useMemo(() => {
    let resultado = [...consultasJuridicasMock];

    // Filtro de búsqueda
    if (busqueda) {
      resultado = resultado.filter(c => 
        c.id.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.temaJuridico.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.solicitante.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.abogadoAsignado.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    // Filtro por etapa
    if (filtroEtapa !== 'TODAS') {
      resultado = resultado.filter(c => c.etapa === filtroEtapa);
    }

    // Filtro por semáforo
    if (filtroSemaforo !== 'TODOS') {
      resultado = resultado.filter(c => {
        if (filtroSemaforo === 'ROJO') return c.diasRestantes <= 3;
        if (filtroSemaforo === 'AMARILLO') return c.diasRestantes > 3 && c.diasRestantes <= 5;
        if (filtroSemaforo === 'VERDE') return c.diasRestantes > 5;
        return true;
      });
    }

    // Ordenamiento
    resultado.sort((a, b) => {
      let comparacion = 0;
      switch (orden) {
        case 'id':
          comparacion = a.id.localeCompare(b.id);
          break;
        case 'fecha':
          comparacion = new Date(a.fechaRadicacion).getTime() - new Date(b.fechaRadicacion).getTime();
          break;
        case 'dias':
          comparacion = a.diasRestantes - b.diasRestantes;
          break;
        case 'tema':
          comparacion = a.temaJuridico.localeCompare(b.temaJuridico);
          break;
      }
      return direccionOrden === 'asc' ? comparacion : -comparacion;
    });

    return resultado;
  }, [busqueda, filtroEtapa, filtroSemaforo, orden, direccionOrden]);

  const handleOrdenar = (columna: OrdenColumna) => {
    if (orden === columna) {
      setDireccionOrden(direccionOrden === 'asc' ? 'desc' : 'asc');
    } else {
      setOrden(columna);
      setDireccionOrden('asc');
    }
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroEtapa('TODAS');
    setFiltroSemaforo('TODOS');
  };

  const consultasCriticas = consultasJuridicasMock.filter(c => c.diasRestantes <= 3).length;
  const consultasEnTermino = consultasJuridicasMock.filter(c => c.diasRestantes > 5).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex-1">
          <h2 className="font-black leading-tight" style={{ color: '#003DA5', fontSize: '1.5rem' }}>
            Asesoría Jurídica Institucional
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Gestión de consultas y conceptos jurídicos internos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: '#F3F4F6' }}>
            <button
              onClick={() => setTipoVista('tabla')}
              className={`px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-1.5 transition-all ${
                tipoVista === 'tabla' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
              style={{ color: tipoVista === 'tabla' ? '#003DA5' : '#6B7280' }}
            >
              <List className="w-4 h-4" />Tabla
            </button>
            <button
              onClick={() => setTipoVista('tarjetas')}
              className={`px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-1.5 transition-all ${
                tipoVista === 'tarjetas' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
              style={{ color: tipoVista === 'tarjetas' ? '#003DA5' : '#6B7280' }}
            >
              <Columns3 className="w-4 h-4" />Tarjetas
            </button>
          </div>
          <button className="px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-400 transition-all" style={{ color: '#003DA5' }}>
            <Plus className="w-4 h-4" />Nueva Consulta
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 p-3">
            <div className="p-2.5 rounded-lg bg-purple-50 flex-shrink-0">
              <FileQuestion className="w-5 h-5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-gray-900 leading-none" style={{ fontSize: '1.75rem' }}>
                {consultasJuridicasMock.length}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Consultas Totales</p>
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 p-3">
            <div className="p-2.5 rounded-lg bg-red-50 flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-gray-900 leading-none" style={{ fontSize: '1.75rem' }}>
                {consultasCriticas}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Críticas</p>
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 p-3">
            <div className="p-2.5 rounded-lg bg-green-50 flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-gray-900 leading-none" style={{ fontSize: '1.75rem' }}>
                {consultasEnTermino}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">En Término</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros y búsqueda */}
      <Card className="bg-white border border-gray-200">
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <h3 className="font-bold text-sm text-gray-900">Filtros de búsqueda</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Búsqueda global */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por ID, tema, solicitante, abogado..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Filtro por etapa */}
            <div>
              <select
                value={filtroEtapa}
                onChange={(e) => setFiltroEtapa(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="TODAS">Todas las etapas</option>
                <option value="RADICADA">Radicada</option>
                <option value="ANÁLISIS">En Análisis</option>
                <option value="RESPUESTA">En Respuesta</option>
                <option value="ENVIADA">Enviada</option>
              </select>
            </div>

            {/* Filtro por prioridad */}
            <div>
              <select
                value={filtroSemaforo}
                onChange={(e) => setFiltroSemaforo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="TODOS">Todas las prioridades</option>
                <option value="ROJO">🔴 Críticas (≤3 días)</option>
                <option value="AMARILLO">🟡 Urgentes (4-5 días)</option>
                <option value="VERDE">🟢 En término (&gt;5 días)</option>
              </select>
            </div>
          </div>

          {/* Contador y limpiar */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Mostrando <span className="font-bold">{consultasFiltradas.length}</span> de <span className="font-bold">{consultasJuridicasMock.length}</span> consultas
            </p>
            {(busqueda || filtroEtapa !== 'TODAS' || filtroSemaforo !== 'TODOS') && (
              <Button
                onClick={limpiarFiltros}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <XCircle className="w-3 h-3 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Tabla o Tarjetas */}
      {tipoVista === 'tabla' ? (
        <TablaConsultas 
          consultas={consultasFiltradas}
          orden={orden}
          direccionOrden={direccionOrden}
          onOrdenar={handleOrdenar}
        />
      ) : (
        <TarjetasConsultas consultas={consultasFiltradas} />
      )}
    </div>
  );
}

interface TablaConsultasProps {
  consultas: ConsultaJuridica[];
  orden: OrdenColumna;
  direccionOrden: 'asc' | 'desc';
  onOrdenar: (columna: OrdenColumna) => void;
}

function TablaConsultas({ consultas, orden, direccionOrden, onOrdenar }: TablaConsultasProps) {
  return (
    <Card className="bg-white border border-gray-200">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">
              <button
                className="flex items-center gap-1"
                onClick={() => onOrdenar('id')}
              >
                ID
                {orden === 'id' && (
                  <span className="text-xs">
                    {direccionOrden === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />}
                  </span>
                )}
              </button>
            </th>
            <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">
              <button
                className="flex items-center gap-1"
                onClick={() => onOrdenar('fecha')}
              >
                Fecha
                {orden === 'fecha' && (
                  <span className="text-xs">
                    {direccionOrden === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />}
                  </span>
                )}
              </button>
            </th>
            <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">
              <button
                className="flex items-center gap-1"
                onClick={() => onOrdenar('dias')}
              >
                Días Restantes
                {orden === 'dias' && (
                  <span className="text-xs">
                    {direccionOrden === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />}
                  </span>
                )}
              </button>
            </th>
            <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">
              <button
                className="flex items-center gap-1"
                onClick={() => onOrdenar('tema')}
              >
                Tema Jurídico
                {orden === 'tema' && (
                  <span className="text-xs">
                    {direccionOrden === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />}
                  </span>
                )}
              </button>
            </th>
            <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Solicitante</th>
            <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Abogado Asignado</th>
            <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {consultas.map((consulta) => (
            <tr key={consulta.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-500">{consulta.id}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{new Date(consulta.fechaRadicacion).toLocaleDateString()}</td>
              <td className="px-4 py-3 text-sm text-gray-500">
                <Badge
                  className="text-xs flex items-center gap-1 font-semibold"
                  style={{ color: consulta.diasRestantes <= 3 ? '#DC2626' : consulta.diasRestantes <= 5 ? '#F59E0B' : '#10B981' }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ background: consulta.diasRestantes <= 3 ? '#DC2626' : consulta.diasRestantes <= 5 ? '#F59E0B' : '#10B981' }} />
                  {consulta.diasRestantes} días
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">{consulta.temaJuridico}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{consulta.solicitante}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{consulta.abogadoAsignado}</td>
              <td className="px-4 py-3 text-sm text-gray-500">
                <Button
                  onClick={(e) => { e.stopPropagation(); toast.success('Consulta Jurídica', { description: `Abriendo ${consulta.id}` }); }}
                  size="sm"
                  className="w-full text-xs font-bold truncate"
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                >
                  <Archive className="w-3 h-3 mr-1 flex-shrink-0" /><span className="truncate">Expediente</span>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

interface TarjetasConsultasProps {
  consultas: ConsultaJuridica[];
}

function TarjetasConsultas({ consultas }: TarjetasConsultasProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {consultas.map((consulta) => (
        <Card key={consulta.id} className="bg-white border border-gray-200 hover:shadow-md transition-all flex flex-col w-full" style={{ height: '680px', minHeight: '680px', maxHeight: '680px' }}>
          <div className="h-1 flex-shrink-0" style={{ background: '#003DA5' }} />

          <div className="p-2.5 flex-1 flex flex-col overflow-y-auto min-h-0">
            <div className="flex items-start justify-between mb-1.5">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: '#E0EDFF' }}>
                  <FileQuestion className="w-4 h-4" style={{ color: '#003DA5' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm truncate" style={{ color: '#003DA5' }}>{consulta.id}</h4>
                  <p className="text-xs text-gray-600 truncate">{consulta.temaJuridico}</p>
                </div>
              </div>
            </div>

            <div className="mb-1.5 pb-1.5 border-b border-gray-200">
              <p className="text-xs text-gray-500 mb-0.5">👤 Solicitante:</p>
              <p className="font-bold text-sm text-gray-900 line-clamp-1">{consulta.solicitante}</p>
              <p className="text-xs text-gray-600">{consulta.funcionarioSolicitante}</p>
            </div>

            <div className="mb-1.5 pb-1.5 border-b border-gray-200">
              <p className="text-xs text-gray-500 mb-0.5">📋 Consulta:</p>
              <p className="font-bold text-sm text-gray-900 line-clamp-2">{consulta.consulta?.substring(0, 100) || 'Sin descripción'}...</p>
            </div>

            <div className="mb-1.5 pb-1.5 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6 flex-shrink-0">
                  <AvatarFallback className="text-xs" style={{ background: '#E0EDFF', color: '#003DA5' }}>
                    {consulta.abogadoAsignado.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">👨‍💼 Profesional:</p>
                  <p className="font-bold text-sm text-gray-900 line-clamp-1">{consulta.abogadoAsignado}</p>
                  <p className="text-xs text-gray-600">CC 80123456</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <Badge
                className="text-xs flex items-center gap-1 font-semibold"
                style={{ color: consulta.diasRestantes <= 3 ? '#DC2626' : consulta.diasRestantes <= 5 ? '#F59E0B' : '#10B981' }}
              >
                <div className="w-2 h-2 rounded-full" style={{ background: consulta.diasRestantes <= 3 ? '#DC2626' : consulta.diasRestantes <= 5 ? '#F59E0B' : '#10B981' }} />
                {consulta.diasRestantes} días
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-1.5 mb-1.5">
              <div className="text-center p-1.5 rounded-lg bg-gray-50 border border-gray-100">
                <p className="text-xs font-bold text-gray-700">{consulta.documentosAdjuntos?.length || 0}</p>
                <p className="text-xs text-gray-500">Docs</p>
              </div>
              <div className="text-center p-1.5 rounded-lg bg-gray-50 border border-gray-100">
                <p className="text-xs font-bold text-gray-700">{consulta.normativaAplicable?.length || 0}</p>
                <p className="text-xs text-gray-500">Normas</p>
              </div>
              <div className="text-center p-1.5 rounded-lg bg-gray-50 border border-gray-100">
                <p className="text-xs font-bold text-gray-700">{Math.round(((consulta.diasTotales - consulta.diasRestantes) / consulta.diasTotales) * 100)}%</p>
                <p className="text-xs text-gray-500">Tiempo</p>
              </div>
            </div>

            <div className="mb-1.5">
              <p className="text-xs text-gray-500 mb-0.5">Normativa:</p>
              <p className="text-xs text-gray-700 line-clamp-1">{consulta.normativaAplicable?.[0] || 'N/A'}</p>
            </div>

            <div className="space-y-1 pt-2 border-t border-gray-200 mt-auto flex-shrink-0">
              <Button
                onClick={(e) => { e.stopPropagation(); toast.success('Consulta Jurídica', { description: `Abriendo ${consulta.id}` }); }}
                size="sm"
                className="w-full text-xs font-bold truncate"
                style={{ background: '#003DA5', color: '#FFFFFF' }}
              >
                <Archive className="w-3 h-3 mr-1 flex-shrink-0" /><span className="truncate">Expediente</span>
              </Button>

              <div className="space-y-1">
                <div className="grid grid-cols-2 gap-1">
                  <Button
                    onClick={(e) => { e.stopPropagation(); toast.info('Documentos Soporte', { description: consulta.id }); }}
                    size="sm"
                    variant="outline"
                    className="text-[11px] px-2 justify-start truncate min-w-0"
                  >
                    <FileText className="w-3 h-3 mr-0.5 flex-shrink-0" /><span className="truncate">Soporte</span>
                  </Button>
                  <Button
                    onClick={(e) => { e.stopPropagation(); toast.info('Normativa Aplicable', { description: consulta.id }); }}
                    size="sm"
                    variant="outline"
                    className="text-[11px] px-2 justify-start truncate min-w-0"
                  >
                    <Archive className="w-3 h-3 mr-0.5 flex-shrink-0" /><span className="truncate">Normativa</span>
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-1">
                  <Button
                    onClick={(e) => { e.stopPropagation(); toast.info('Oficios', { description: consulta.id }); }}
                    size="sm"
                    variant="outline"
                    className="text-[11px] px-2 justify-start truncate min-w-0"
                  >
                    <Mail className="w-3 h-3 mr-0.5 flex-shrink-0" /><span className="truncate">Oficios</span>
                  </Button>
                  <Button
                    onClick={(e) => { e.stopPropagation(); toast.info('Respuesta', { description: consulta.id }); }}
                    size="sm"
                    variant="outline"
                    className="text-[11px] px-2 justify-start truncate min-w-0"
                  >
                    <Send className="w-3 h-3 mr-0.5 flex-shrink-0" /><span className="truncate">Respuesta</span>
                  </Button>
                </div>

                <Button
                  onClick={(e) => { e.stopPropagation(); toast.info('Comentarios de la Consulta', { description: consulta.id }); }}
                  size="sm"
                  className="w-full text-[11px] py-2 font-bold"
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                  <span className="truncate">💬 Comentarios de la Consulta</span>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}