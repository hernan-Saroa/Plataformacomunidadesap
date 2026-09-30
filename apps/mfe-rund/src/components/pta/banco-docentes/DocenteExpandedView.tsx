import React from 'react';
import { User, Mail, FileText, MapPin, Briefcase, Clock, CheckCircle, XCircle, Award } from 'lucide-react';

export function DocenteExpandedView({ docente, onEdit }: { docente: any, onEdit: () => void }) {
  return (
    <div style={{ padding: '24px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, borderBottom: '1px solid #e2e8f0', boxShadow: 'inset 0 4px 6px -4px rgba(0,0,0,0.05)', animation: 'expandIn 0.2s ease-out' }}>
      {/* Left Column: Información Profesional */}
      <div>
         <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <User size={20} color="#3b82f6" />
            </div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
               Información Personal
            </h4>
         </div>
         <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <FileText size={18} color="#64748b" style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Documento de Identidad</div>
                <div style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 500, marginTop: 2 }}>{docente.tipo_documento || 'CC'} {docente.documento_identidad}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <Mail size={18} color="#64748b" style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Correo Electrónico</div>
                <div style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 500, marginTop: 2 }}>{docente.correo_institucional || 'Sin correo asignado'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <Award size={18} color="#64748b" style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categoría / Nivel</div>
                <div style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 500, marginTop: 2 }}>{docente.categoria || 'Sin categoría especificada'}</div>
              </div>
            </div>
         </div>
      </div>

      {/* Right Column: Vinculación y Estado */}
      <div>
         <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Briefcase size={20} color="#10b981" />
            </div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
               Activación y Vinculación
            </h4>
         </div>
         <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <MapPin size={18} color="#64748b" style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unidad Organizacional</div>
                <div style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 500, marginTop: 2 }}>
                  <span style={{ fontWeight: 700, color: '#10b981' }}>{docente.territorial || 'Sede Central'}</span>
                  {docente.cetap ? ` • ${docente.cetap}` : ''}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <Clock size={18} color="#64748b" style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dedicación y Régimen</div>
                <div style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 500, marginTop: 2 }}>{docente.vinculacion || 'Sin régimen'} • {docente.dedicacion || 'Sin dedicación'}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginTop: 4, display: 'inline-block', background: '#f1f5f9', padding: '2px 8px', borderRadius: 10 }}>{docente.horas_asignables || 0}h programables asignadas</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {docente.activo ? <CheckCircle size={18} color="#10b981" style={{ marginTop: 2 }} /> : <XCircle size={18} color="#ef4444" style={{ marginTop: 2 }} />}
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado Actual</div>
                <div style={{ fontSize: '0.85rem', color: docente.activo ? '#059669' : '#be123c', fontWeight: 700, padding: '4px 10px', background: docente.activo ? '#d1fae5' : '#ffe4e6', borderRadius: 16, display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: docente.activo ? '#059669' : '#be123c' }} />
                  {docente.activo ? 'Vigente (Activo)' : 'Inactivo'}
                </div>
              </div>
            </div>
         </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes expandIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}
