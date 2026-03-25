/**
 * ============================================
 * PASO 2: UNIVERSO AUDITABLE
 * ============================================
 * 
 * Gestión de unidades auditables:
 * - Agregar unidades
 * - Clasificar por tipo
 * - Asignar responsables
 * - Presupuesto y recursos
 * 
 * ÚLTIMA ACTUALIZACIÓN: 31 Enero 2026
 */

'use client';

import React, { useState } from 'react';
import { Building2, Plus, Trash2, Edit, Search } from 'lucide-react';
import { useWizardPAI } from './WizardCrearPAI';
import type { UnidadAuditable, TipoUnidadAuditable } from '../types';

export function Paso2UniversoAuditable() {
  const { universoAuditable, setUniversoAuditable } = useWizardPAI();
  
  const [mostrarModal, setMostrarModal] = useState(false);
  const [unidadEditando, setUnidadEditando] = useState<UnidadAuditable | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const tiposUnidad: TipoUnidadAuditable[] = [
    'Proceso Estratégico',
    'Proceso Misional',
    'Proceso de Apoyo',
    'Proceso de Evaluación',
    'Unidad Administrativa',
    'Territorial',
    'Proyecto',
    'Sistema',
    'Programa'
  ];

  const agregarUnidad = () => {
    const nuevaUnidad: UnidadAuditable = {
      id: `UA-${Date.now()}`,
      codigo: `UA-${(universoAuditable.length + 1).toString().padStart(3, '0')}`,
      nombre: '',
      descripcion: '',
      tipo: 'Proceso de Apoyo',
      responsable: { nombre: '', cargo: '', email: '', fechaAsignacion: new Date().toISOString().split('T')[0] },
      dependencia: '',
      area: '',
      presupuestoAnual: 0,
      numeroEmpleados: 0,
      activos: {
        sistemasInformaticos: [],
        infraestructuraTI: '',
        inmuebles: [],
        vehiculos: 0,
        equipos: '',
        cuentasBancarias: 0,
        fondosPropios: 0,
        archivos: '',
        baseDatos: []
      },
      objetivos: [],
      funciones: [],
      servicios: [],
      parteInteresadas: [],
      frecuenciaAuditoriaRecomendada: 'Anual',
      prioridadAuditoria: 5,
      activa: true,
      observaciones: ''
    };
    setUnidadEditando(nuevaUnidad);
    setMostrarModal(true);
  };

  const guardarUnidad = (unidad: UnidadAuditable) => {
    const existe = universoAuditable.findIndex(u => u.id === unidad.id);
    if (existe >= 0) {
      const actualizado = [...universoAuditable];
      actualizado[existe] = unidad;
      setUniversoAuditable(actualizado);
    } else {
      setUniversoAuditable([...universoAuditable, unidad]);
    }
    setMostrarModal(false);
    setUnidadEditando(null);
  };

  const eliminarUnidad = (id: string) => {
    if (confirm('¿Está seguro de eliminar esta unidad?')) {
      setUniversoAuditable(universoAuditable.filter(u => u.id !== id));
    }
  };

  const unidadesFiltradas = universoAuditable.filter(u =>
    u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.tipo.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#003DA5] flex items-center mb-2">
          <Building2 className="w-7 h-7 mr-3" />
          🏢 Universo Auditable
        </h2>
        <p className="text-gray-600">
          Defina las unidades, procesos y áreas que serán objeto de auditoría
        </p>
      </div>

      {/* Barra de acciones */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar unidad..."
            className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#003DA5] transition-all"
          />
        </div>
        <button
          onClick={agregarUnidad}
          className="px-4 py-2 bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Agregar Unidad</span>
        </button>
      </div>

      {/* Lista de unidades */}
      <div className="grid grid-cols-1 gap-4">
        {unidadesFiltradas.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-semibold">No hay unidades auditables</p>
            <p className="text-sm text-gray-400">Haga clic en "Agregar Unidad" para comenzar</p>
          </div>
        ) : (
          unidadesFiltradas.map(unidad => (
            <div key={unidad.id} className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-[#003DA5] transition-all">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-bold text-[#003DA5]">{unidad.nombre || 'Sin nombre'}</h3>
                    <span className="px-3 py-1 bg-[#E0EDFF] text-[#003DA5] rounded-full text-xs font-semibold">
                      {unidad.tipo}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Dependencia:</span>
                      <p className="font-semibold">{unidad.dependencia || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Responsable:</span>
                      <p className="font-semibold">{unidad.responsable.nombre || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Presupuesto:</span>
                      <p className="font-semibold">${(unidad.presupuestoAnual / 1000000).toFixed(1)}M</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Empleados:</span>
                      <p className="font-semibold">{unidad.numeroEmpleados}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => { setUnidadEditando(unidad); setMostrarModal(true); }}
                    className="p-2 text-[#003DA5] hover:bg-[#E0EDFF] rounded-lg transition-all"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => eliminarUnidad(unidad.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal edición (simplificado) */}
      {mostrarModal && unidadEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-xl font-bold text-[#003DA5] mb-4">
              {unidadEditando.nombre ? 'Editar Unidad' : 'Nueva Unidad'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={unidadEditando.nombre}
                  onChange={(e) => setUnidadEditando({...unidadEditando, nombre: e.target.value})}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo *</label>
                <select
                  value={unidadEditando.tipo}
                  onChange={(e) => setUnidadEditando({...unidadEditando, tipo: e.target.value as TipoUnidadAuditable})}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                >
                  {tiposUnidad.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Dependencia</label>
                  <input
                    type="text"
                    value={unidadEditando.dependencia}
                    onChange={(e) => setUnidadEditando({...unidadEditando, dependencia: e.target.value})}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Área</label>
                  <input
                    type="text"
                    value={unidadEditando.area}
                    onChange={(e) => setUnidadEditando({...unidadEditando, area: e.target.value})}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => { setMostrarModal(false); setUnidadEditando(null); }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => guardarUnidad(unidadEditando)}
                  className="px-4 py-2 bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white rounded-lg hover:shadow-lg"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
