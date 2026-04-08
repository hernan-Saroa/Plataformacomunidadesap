/**
 * PASO 4: RECURSOS OCI
 * Personal, presupuesto y horas disponibles
 */

'use client';

import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { useWizardPAI } from './WizardCrearPAI';

export function Paso4RecursosOCI() {
  const { recursosOCI, setRecursosOCI } = useWizardPAI();
  
  const [totalAuditores, setTotalAuditores] = useState(recursosOCI.totalAuditores || 5);
  const [horasPorAuditor, setHorasPorAuditor] = useState(1800);
  const [presupuestoAnual, setPresupuestoAnual] = useState(recursosOCI.presupuestoAnual || 250000000);

  React.useEffect(() => {
    setRecursosOCI({
      ...recursosOCI,
      totalAuditores,
      horasTotalesDisponibles: totalAuditores * horasPorAuditor,
      horasTotalesAsignadas: 0,
      porcentajeUtilizacion: 0,
      presupuestoAnual,
      presupuestoEjecutado: 0,
      presupuestoDisponible: presupuestoAnual,
      personalOCI: [],
      distribucionPresupuesto: {
        personal: presupuestoAnual * 0.70,
        capacitacion: presupuestoAnual * 0.10,
        tecnologia: presupuestoAnual * 0.10,
        desplazamientos: presupuestoAnual * 0.05,
        papeleria: presupuestoAnual * 0.03,
        otros: presupuestoAnual * 0.02
      },
      herramientas: [],
      sistemas: [],
      oficinas: [],
      equipos: [],
      planCapacitacion: {
        cursosProgramados: [],
        presupuestoTotal: presupuestoAnual * 0.10,
        horasTotales: 0
      },
      presupuestoCapacitacion: presupuestoAnual * 0.10
    });
  }, [totalAuditores, horasPorAuditor, presupuestoAnual]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#003DA5] flex items-center mb-2">
          <Users className="w-7 h-7 mr-3" />
          👥 Recursos de la OCI
        </h2>
        <p className="text-gray-600">
          Configure el personal, presupuesto y recursos disponibles
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border-2 border-[#003DA5] border-opacity-20 rounded-xl p-6">
          <h3 className="font-bold text-[#003DA5] mb-4">👥 Recursos Humanos</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Total Auditores
              </label>
              <input
                type="number"
                min="1"
                value={totalAuditores}
                onChange={(e) => setTotalAuditores(Number(e.target.value))}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Horas Anuales por Auditor
              </label>
              <input
                type="number"
                min="1"
                value={horasPorAuditor}
                onChange={(e) => setHorasPorAuditor(Number(e.target.value))}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl"
              />
            </div>
            <div className="bg-[#E0EDFF] rounded-lg p-3">
              <div className="text-sm text-gray-600">Total Horas Disponibles</div>
              <div className="text-2xl font-bold text-[#003DA5]">
                {(totalAuditores * horasPorAuditor).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-[#003DA5] border-opacity-20 rounded-xl p-6">
          <h3 className="font-bold text-[#003DA5] mb-4">💰 Presupuesto</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Presupuesto Anual (COP)
              </label>
              <input
                type="number"
                min="0"
                step="1000000"
                value={presupuestoAnual}
                onChange={(e) => setPresupuestoAnual(Number(e.target.value))}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl"
              />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Personal (70%)</span>
                <span className="font-semibold">${(presupuestoAnual * 0.70 / 1000000).toFixed(1)}M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Capacitación (10%)</span>
                <span className="font-semibold">${(presupuestoAnual * 0.10 / 1000000).toFixed(1)}M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tecnología (10%)</span>
                <span className="font-semibold">${(presupuestoAnual * 0.10 / 1000000).toFixed(1)}M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Otros (10%)</span>
                <span className="font-semibold">${(presupuestoAnual * 0.10 / 1000000).toFixed(1)}M</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
