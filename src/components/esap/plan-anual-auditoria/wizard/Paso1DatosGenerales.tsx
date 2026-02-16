/**
 * ============================================
 * PASO 1: DATOS GENERALES DEL PAI
 * ============================================
 * 
 * Formulario para capturar:
 * - Vigencia
 * - Jefe OCI
 * - Objetivo General
 * - Objetivos Específicos
 * - Alcance
 * - Fechas
 * 
 * ÚLTIMA ACTUALIZACIÓN: 31 Enero 2026
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, User, Target, FileText, Plus, Trash2, AlertCircle } from 'lucide-react';
import { useWizardPAI } from './WizardCrearPAI';
import type { JefeOCI } from '../types';

export function Paso1DatosGenerales() {
  const { datosGenerales, setDatosGenerales } = useWizardPAI();
  
  // ============================================
  // ESTADO LOCAL
  // ============================================
  const [vigencia, setVigencia] = useState(datosGenerales.vigencia || new Date().getFullYear());
  const [objetivoGeneral, setObjetivoGeneral] = useState(datosGenerales.objetivoGeneral || '');
  const [objetivosEspecificos, setObjetivosEspecificos] = useState<string[]>(
    datosGenerales.objetivosEspecificos || ['', '', '', '']
  );
  const [alcance, setAlcance] = useState(datosGenerales.alcance || '');
  
  // Jefe OCI
  const [nombreJefe, setNombreJefe] = useState(datosGenerales.jefeOCI?.nombreCompleto || '');
  const [cargoJefe, setCargoJefe] = useState(datosGenerales.jefeOCI?.cargo || 'Jefe Oficina Control Interno');
  const [emailJefe, setEmailJefe] = useState(datosGenerales.jefeOCI?.email || '');
  const [telefonoJefe, setTelefonoJefe] = useState(datosGenerales.jefeOCI?.telefono || '');
  const [resolucionNombramiento, setResolucionNombramiento] = useState(
    datosGenerales.jefeOCI?.resolucionNombramiento || ''
  );
  const [fechaNombramiento, setFechaNombramiento] = useState(
    datosGenerales.jefeOCI?.fechaNombramiento || ''
  );
  const [perfilProfesional, setPerfilProfesional] = useState(
    datosGenerales.jefeOCI?.perfilProfesional || ''
  );

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    // Actualizar context cuando cambien los datos
    const jefeOCI: JefeOCI = {
      id: 'OCI-001',
      nombreCompleto: nombreJefe,
      cargo: cargoJefe,
      email: emailJefe,
      telefono: telefonoJefe,
      activo: true,
      fechaNombramiento,
      resolucionNombramiento,
      perfilProfesional
    };

    setDatosGenerales({
      vigencia,
      version: 1,
      codigoPlan: `PAI-${vigencia}-V1`,
      nombreInstitucion: 'ESAP',
      nit: '899.999.061-6',
      sector: 'Educación Superior',
      naturalezaJuridica: 'Establecimiento Público',
      jefeOCI,
      fechaElaboracion: new Date().toISOString().split('T')[0],
      objetivoGeneral,
      objetivosEspecificos: objetivosEspecificos.filter(obj => obj.trim() !== ''),
      alcance,
      misionESAP: 'Formar servidores públicos y desarrollar conocimiento especializado en administración pública.',
      visionESAP: 'Ser la institución líder en formación y conocimiento en administración pública en Colombia.',
      objetivosEstrategicosInstitucionales: [
        'Excelencia académica',
        'Investigación de alto impacto',
        'Gestión eficiente',
        'Transparencia y control'
      ]
    });
  }, [
    vigencia, nombreJefe, cargoJefe, emailJefe, telefonoJefe,
    resolucionNombramiento, fechaNombramiento, perfilProfesional,
    objetivoGeneral, objetivosEspecificos, alcance
  ]);

  // ============================================
  // FUNCIONES
  // ============================================
  const agregarObjetivoEspecifico = () => {
    setObjetivosEspecificos([...objetivosEspecificos, '']);
  };

  const eliminarObjetivoEspecifico = (index: number) => {
    const nuevos = objetivosEspecificos.filter((_, i) => i !== index);
    setObjetivosEspecificos(nuevos);
  };

  const actualizarObjetivoEspecifico = (index: number, valor: string) => {
    const nuevos = [...objetivosEspecificos];
    nuevos[index] = valor;
    setObjetivosEspecificos(nuevos);
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-8">
      
      {/* Header del paso */}
      <div>
        <h2 className="text-2xl font-bold text-[#003DA5] flex items-center mb-2">
          <FileText className="w-7 h-7 mr-3" />
          📋 Datos Generales del Plan Anual
        </h2>
        <p className="text-gray-600">
          Configure la información básica del Plan Anual de Auditoría Interna
        </p>
      </div>

      {/* Sección: Vigencia */}
      <div className="bg-gradient-to-r from-[#E0EDFF] to-white rounded-xl p-6 border-2 border-[#003DA5] border-opacity-20">
        <h3 className="text-lg font-bold text-[#003DA5] mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Vigencia del Plan
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Año Fiscal <span className="text-red-500">*</span>
            </label>
            <select
              value={vigencia}
              onChange={(e) => setVigencia(Number(e.target.value))}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5] focus:ring-opacity-20 transition-all text-lg"
            >
              {[2024, 2025, 2026, 2027, 2028].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Código del Plan
            </label>
            <input
              type="text"
              value={`PAI-${vigencia}-V1`}
              disabled
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-600 text-lg"
            />
          </div>
        </div>
      </div>

      {/* Sección: Jefe OCI */}
      <div className="bg-gradient-to-r from-[#E0EDFF] to-white rounded-xl p-6 border-2 border-[#003DA5] border-opacity-20">
        <h3 className="text-lg font-bold text-[#003DA5] mb-4 flex items-center">
          <User className="w-5 h-5 mr-2" />
          Jefe de la Oficina de Control Interno
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre Completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombreJefe}
              onChange={(e) => setNombreJefe(e.target.value)}
              placeholder="Ej: Mario Oswaldo Bernal"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5] focus:ring-opacity-20 transition-all text-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Cargo
            </label>
            <input
              type="text"
              value={cargoJefe}
              onChange={(e) => setCargoJefe(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5] focus:ring-opacity-20 transition-all text-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Correo Electrónico <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={emailJefe}
              onChange={(e) => setEmailJefe(e.target.value)}
              placeholder="ejemplo@esap.edu.co"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5] focus:ring-opacity-20 transition-all text-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Teléfono
            </label>
            <input
              type="tel"
              value={telefonoJefe}
              onChange={(e) => setTelefonoJefe(e.target.value)}
              placeholder="601-2222800"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5] focus:ring-opacity-20 transition-all text-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Resolución de Nombramiento
            </label>
            <input
              type="text"
              value={resolucionNombramiento}
              onChange={(e) => setResolucionNombramiento(e.target.value)}
              placeholder="Ej: Resolución 001-2020"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5] focus:ring-opacity-20 transition-all text-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Fecha de Nombramiento
            </label>
            <input
              type="date"
              value={fechaNombramiento}
              onChange={(e) => setFechaNombramiento(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5] focus:ring-opacity-20 transition-all text-lg"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Perfil Profesional
            </label>
            <textarea
              value={perfilProfesional}
              onChange={(e) => setPerfilProfesional(e.target.value)}
              placeholder="Ej: Contador Público, Especialista en Control Interno"
              rows={2}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5] focus:ring-opacity-20 transition-all text-lg"
            />
          </div>
        </div>
      </div>

      {/* Sección: Objetivos */}
      <div className="bg-gradient-to-r from-[#E0EDFF] to-white rounded-xl p-6 border-2 border-[#003DA5] border-opacity-20">
        <h3 className="text-lg font-bold text-[#003DA5] mb-4 flex items-center">
          <Target className="w-5 h-5 mr-2" />
          Objetivos del Plan
        </h3>
        
        <div className="space-y-6">
          {/* Objetivo General */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Objetivo General <span className="text-red-500">*</span>
            </label>
            <textarea
              value={objetivoGeneral}
              onChange={(e) => setObjetivoGeneral(e.target.value)}
              placeholder="Evaluar la gestión institucional mediante auditorías internas con enfoque preventivo..."
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5] focus:ring-opacity-20 transition-all text-lg"
            />
            <div className="text-sm text-gray-500 mt-1">
              {objetivoGeneral.length} caracteres
            </div>
          </div>
          
          {/* Objetivos Específicos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-700">
                Objetivos Específicos
              </label>
              <button
                onClick={agregarObjetivoEspecifico}
                className="px-3 py-1 bg-[#003DA5] text-white rounded-lg text-sm font-semibold hover:bg-[#2962FF] transition-all flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar</span>
              </button>
            </div>
            
            <div className="space-y-3">
              {objetivosEspecificos.map((objetivo, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="flex-shrink-0 w-8 h-8 bg-[#003DA5] text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    value={objetivo}
                    onChange={(e) => actualizarObjetivoEspecifico(index, e.target.value)}
                    placeholder={`Objetivo específico ${index + 1}`}
                    className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5] focus:ring-opacity-20 transition-all"
                  />
                  {objetivosEspecificos.length > 1 && (
                    <button
                      onClick={() => eliminarObjetivoEspecifico(index)}
                      className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Alcance */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Alcance del Plan <span className="text-red-500">*</span>
            </label>
            <textarea
              value={alcance}
              onChange={(e) => setAlcance(e.target.value)}
              placeholder="Ej: Todos los procesos estratégicos, misionales y de apoyo de la ESAP"
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5] focus:ring-opacity-20 transition-all text-lg"
            />
          </div>
        </div>
      </div>

      {/* Ayuda contextual */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">💡 Consejos para completar este paso:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>El objetivo general debe ser claro, medible y alcanzable</li>
              <li>Los objetivos específicos deben ser SMART (Específicos, Medibles, Alcanzables, Relevantes, Temporales)</li>
              <li>El alcance define qué procesos y áreas se incluyen en el PAI</li>
              <li>Verifique que los datos del Jefe OCI sean correctos</li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
}
