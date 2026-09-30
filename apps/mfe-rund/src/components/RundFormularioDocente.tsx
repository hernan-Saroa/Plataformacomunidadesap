import React, { useState } from 'react';
import { ArrowLeft, Save, User, Building, Award, CheckCircle } from 'lucide-react';
import { DocenteRund } from '../types/rund.types';
import { rundService } from '../services/api/rundService';

interface Props {
  initialDocente?: DocenteRund | null;
  onBack: () => void;
  onSaved: (docente: DocenteRund) => void;
}

export const RundFormularioDocente: React.FC<Props> = ({
  initialDocente,
  onBack,
  onSaved,
}) => {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<DocenteRund>>(
    initialDocente || {
      numeroDocumento: '',
      tipoDocumento: 'CC',
      nombres: '',
      apellidos: '',
      correoInstitucional: '',
      correoPersonal: '',
      telefono: '',
      celular: '',
      direccion: '',
      departamentoNombre: 'Bogotá D.C.',
      municipioNombre: 'Bogotá D.C.',
      escalafonDocente: 'INSTRUCTOR',
      categoriaMinciencias: 'SIN_CATEGORIA',
      estadoRund: 'ACTIVO',
      horasSemanalesMax: 40,
      sedePrincipalNombre: 'Sede Central Bogotá',
      esParEvaluador: false,
    },
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      let result: DocenteRund;
      if (initialDocente?.idDocente) {
        result = await rundService.updateDocente(initialDocente.idDocente, formData);
      } else {
        result = await rundService.createDocente(formData);
      }
      onSaved(result);
    } catch (err: any) {
      alert(err.message || 'Error al guardar docente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#003DA5] transition"
        >
          <ArrowLeft className="w-4 h-4" /> Cancelar y Volver
        </button>
        <h2 className="text-base font-bold text-slate-900">
          {initialDocente ? 'Actualizar Docente RUND' : 'Registro de Nuevo Docente en el RUND'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        {/* Datos de Identificación */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2 border-b pb-2">
            <User className="w-4 h-4 text-[#003DA5]" /> 1. Datos Personales y de Identificación
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Documento *</label>
              <select
                value={formData.tipoDocumento}
                onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white focus:ring-2 focus:ring-[#003DA5]"
                required
              >
                <option value="CC">Cédula de Ciudadanía (CC)</option>
                <option value="CE">Cédula de Extranjería (CE)</option>
                <option value="PA">Pasaporte (PA)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Número de Documento *</label>
              <input
                type="text"
                value={formData.numeroDocumento}
                onChange={(e) => setFormData({ ...formData, numeroDocumento: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-[#003DA5]"
                placeholder="Ej: 1020304050"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nombres *</label>
              <input
                type="text"
                value={formData.nombres}
                onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-[#003DA5]"
                placeholder="Nombres completos"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Apellidos *</label>
              <input
                type="text"
                value={formData.apellidos}
                onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-[#003DA5]"
                placeholder="Apellidos completos"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Institucional</label>
              <input
                type="email"
                value={formData.correoInstitucional}
                onChange={(e) => setFormData({ ...formData, correoInstitucional: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-[#003DA5]"
                placeholder="docente@esap.edu.co"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Celular / Teléfono</label>
              <input
                type="text"
                value={formData.celular}
                onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-[#003DA5]"
                placeholder="300 000 0000"
              />
            </div>
          </div>
        </div>

        {/* Clasificación Académica */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2 border-b pb-2">
            <Award className="w-4 h-4 text-[#003DA5]" /> 2. Clasificación en Escalafón & Minciencias
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Escalafón Docente *</label>
              <select
                value={formData.escalafonDocente}
                onChange={(e) => setFormData({ ...formData, escalafonDocente: e.target.value as any })}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white focus:ring-2 focus:ring-[#003DA5]"
              >
                <option value="INSTRUCTOR">Instructor</option>
                <option value="ASISTENTE">Asistente</option>
                <option value="ASOCIADO">Asociado</option>
                <option value="TITULAR">Titular</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría Minciencias</label>
              <select
                value={formData.categoriaMinciencias}
                onChange={(e) => setFormData({ ...formData, categoriaMinciencias: e.target.value as any })}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white focus:ring-2 focus:ring-[#003DA5]"
              >
                <option value="SIN_CATEGORIA">Sin Categoría</option>
                <option value="INVESTIGADOR_JUNIOR">Investigador Junior</option>
                <option value="ASOCIADO">Asociado</option>
                <option value="INVESTIGADOR_SENIOR">Investigador Senior</option>
                <option value="EMERITO">Emérito</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sede Principal ESAP</label>
              <input
                type="text"
                value={formData.sedePrincipalNombre}
                onChange={(e) => setFormData({ ...formData, sedePrincipalNombre: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-[#003DA5]"
                placeholder="Ej: Sede Central Bogotá"
              />
            </div>
          </div>
        </div>

        {/* Botón Guardar */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white text-xs font-bold rounded-lg shadow transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar Docente RUND'}
          </button>
        </div>
      </form>
    </div>
  );
};
