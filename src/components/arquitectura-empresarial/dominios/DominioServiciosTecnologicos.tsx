/**
 * Dominio: Servicios Tecnológicos
 * Infraestructura y servicios de soporte TI
 */

import React from 'react';
import { Laptop, Cloud, HardDrive, Wifi, Shield, Activity } from 'lucide-react';
import { motion } from 'motion/react';

interface DominioServiciosTecnologicosProps {
  canEdit?: boolean;
}

export function DominioServiciosTecnologicos({ canEdit }: DominioServiciosTecnologicosProps) {
  const servicios = [
    { nombre: 'Cloud Computing (AWS)', categoria: 'Infraestructura', disponibilidad: 99.95, icon: Cloud, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { nombre: 'Servidores Virtuales', categoria: 'Compute', disponibilidad: 99.8, icon: HardDrive, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { nombre: 'Red y Conectividad', categoria: 'Networking', disponibilidad: 99.9, icon: Wifi, color: 'text-green-600', bgColor: 'bg-green-50' },
    { nombre: 'Seguridad Perimetral', categoria: 'Seguridad', disponibilidad: 100, icon: Shield, color: 'text-red-600', bgColor: 'bg-red-50' },
    { nombre: 'Mesa de Ayuda', categoria: 'Soporte', disponibilidad: 98.5, icon: Activity, color: 'text-orange-600', bgColor: 'bg-orange-50' }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-black text-gray-900 mb-6">Catálogo de Servicios Tecnológicos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {servicios.map((servicio, index) => {
            const Icon = servicio.icon;
            return (
              <motion.div
                key={servicio.nombre}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-all"
              >
                <div className={`p-3 ${servicio.bgColor} rounded-lg w-fit mb-3`}>
                  <Icon className={`w-6 h-6 ${servicio.color}`} />
                </div>
                <h4 className="font-bold text-gray-900 mb-1">{servicio.nombre}</h4>
                <p className="text-sm text-gray-600 mb-3">{servicio.categoria}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Disponibilidad</span>
                  <span className="text-sm font-black text-gray-900">{servicio.disponibilidad}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full"
                    style={{ width: `${servicio.disponibilidad}%` }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
