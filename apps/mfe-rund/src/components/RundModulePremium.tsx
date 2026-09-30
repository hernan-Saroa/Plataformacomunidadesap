import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  FileCheck,
  Award,
  UserPlus,
  Layers,
} from 'lucide-react';
import { DocenteRund } from '../types/rund.types';
import { RundDashboard } from './RundDashboard';
import { RundDocentesList } from './RundDocentesList';
import { RundDocente360Detail } from './RundDocente360Detail';
import { RundFormularioDocente } from './RundFormularioDocente';
import { RundValidacionDocumental } from './RundValidacionDocumental';
import { RundTarjetaDigitalModal } from './RundTarjetaDigitalModal';

export const RundModulePremium: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'docentes' | 'nuevo' | 'detalle' | 'validacion'>('dashboard');
  const [selectedDocente, setSelectedDocente] = useState<DocenteRund | null>(null);
  const [tarjetaModalDocente, setTarjetaModalDocente] = useState<DocenteRund | null>(null);

  const handleSelectDocente = (docente: DocenteRund) => {
    setSelectedDocente(docente);
    setCurrentTab('detalle');
  };

  const handleEditDocente = (docente: DocenteRund) => {
    setSelectedDocente(docente);
    setCurrentTab('nuevo');
  };

  const handleCreateNew = () => {
    setSelectedDocente(null);
    setCurrentTab('nuevo');
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 lg:p-8 space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#003DA5] uppercase tracking-wider mb-1">
            <Award className="w-4 h-4" /> Módulo de Talento Docente
          </div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">
            Registro Único Nacional Docente (RUND)
          </h1>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              currentTab === 'dashboard'
                ? 'bg-[#003DA5] text-white shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </button>

          <button
            onClick={() => setCurrentTab('docentes')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              currentTab === 'docentes' || currentTab === 'detalle'
                ? 'bg-[#003DA5] text-white shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" /> Directorio RUND
          </button>

          <button
            onClick={() => setCurrentTab('validacion')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              currentTab === 'validacion'
                ? 'bg-[#003DA5] text-white shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileCheck className="w-4 h-4" /> Validación Soportes
          </button>

          <button
            onClick={handleCreateNew}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              currentTab === 'nuevo'
                ? 'bg-[#003DA5] text-white shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <UserPlus className="w-4 h-4" /> {selectedDocente ? 'Editar Docente' : 'Nuevo Registro'}
          </button>
        </div>
      </div>

      {/* Main View Render */}
      {currentTab === 'dashboard' && (
        <RundDashboard
          onNavigateTab={(tab) => setCurrentTab(tab as any)}
          onSelectDocente={(id) => {
            setCurrentTab('docentes');
          }}
        />
      )}

      {currentTab === 'docentes' && (
        <RundDocentesList
          onSelectDocente={handleSelectDocente}
          onEditDocente={handleEditDocente}
          onCreateNew={handleCreateNew}
          onEmitirTarjeta={(docente) => setTarjetaModalDocente(docente)}
        />
      )}

      {currentTab === 'detalle' && selectedDocente && (
        <RundDocente360Detail
          docente={selectedDocente}
          onBack={() => setCurrentTab('docentes')}
          onEdit={handleEditDocente}
          onEmitirTarjeta={(docente) => setTarjetaModalDocente(docente)}
        />
      )}

      {currentTab === 'nuevo' && (
        <RundFormularioDocente
          initialDocente={selectedDocente}
          onBack={() => setCurrentTab('docentes')}
          onSaved={(docente) => {
            setSelectedDocente(docente);
            setCurrentTab('detalle');
          }}
        />
      )}

      {currentTab === 'validacion' && <RundValidacionDocumental />}

      {/* Modal Tarjeta Digital RUND */}
      {tarjetaModalDocente && (
        <RundTarjetaDigitalModal
          docente={tarjetaModalDocente}
          onClose={() => setTarjetaModalDocente(null)}
        />
      )}
    </div>
  );
};

export default RundModulePremium;
