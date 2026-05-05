/**
 * AyudaView - Centro de ayuda y soporte del portal (Legacy PTA)
 */

import { useState } from 'react';
import {
  ArrowLeft,
  HelpCircle,
  MessageCircle,
  Mail,
  Phone,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderOpen,
  Shield,
  Settings,
  Search,
  ExternalLink,
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface AyudaViewProps {
  onBack: () => void;
  onNavigate?: (section: string) => void;
}

interface FAQ {
  q: string;
  a: string;
}

const FAQS: FAQ[] = [
  {
    q: '¿Cómo solicito un certificado laboral?',
    a: 'Ve a "Mis Servicios" > "Certificado Laboral" y haz clic en "Solicitar nuevo certificado".',
  },
  {
    q: '¿Cómo accedo a mi carpeta digital?',
    a: 'Desde el dashboard, haz clic en la tarjeta "Carpeta Digital" en la sección Mis Servicios.',
  },
  {
    q: '¿Por qué se cierra mi sesión automáticamente?',
    a: 'Por seguridad, la sesión se cierra después de un tiempo de inactividad. Ajusta esto en Configuración.',
  },
  {
    q: '¿Cómo cambio mi foto de perfil?',
    a: 'En el dashboard, pasa el cursor sobre tu avatar y usa el ícono de cámara.',
  },
];

const QUICK_GUIDES = [
  {
    icon: <FileText style={{ width: 20, height: 20 }} />,
    title: 'Certificados Laborales',
    desc: 'Solicitar, descargar y verificar certificados',
    section: 'certificado-laboral',
    color: '#2563EB',
    bg: '#EFF6FF',
  },
  {
    icon: <FolderOpen style={{ width: 20, height: 20 }} />,
    title: 'Carpeta Digital',
    desc: 'Gestiona tus documentos institucionales',
    section: 'carpeta-digital',
    color: '#059669',
    bg: '#ECFDF5',
  },
  {
    icon: <Settings style={{ width: 20, height: 20 }} />,
    title: 'Configuración',
    desc: 'Personaliza tu experiencia en el portal',
    section: 'configuracion',
    color: '#6B7280',
    bg: '#F3F4F6',
  },
  {
    icon: <Shield style={{ width: 20, height: 20 }} />,
    title: 'Seguridad',
    desc: 'Gestión de sesión y privacidad',
    section: 'configuracion',
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
];

export function AyudaView({ onBack, onNavigate }: AyudaViewProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaqs = searchQuery.trim()
    ? FAQS.filter((f) => f.q.toLowerCase().includes(searchQuery.toLowerCase()) || f.a.toLowerCase().includes(searchQuery.toLowerCase()))
    : FAQS;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={onBack}
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            border: '1px solid #E5E7EB',
            background: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft style={{ width: 18, height: 18, color: '#374151' }} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#111827', margin: 0 }}>Centro de Ayuda</h1>
          <p style={{ fontSize: '0.9rem', color: '#6B7280', margin: 0 }}>Guías, preguntas frecuentes y soporte técnico</p>
        </div>
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: 14,
          padding: '20px 24px',
          marginBottom: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: 44,
            borderRadius: 10,
            border: '1px solid #E5E7EB',
            background: '#F9FAFB',
            paddingLeft: 14,
          }}
        >
          <Search style={{ width: 16, height: 16, color: '#9CA3AF', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="¿En qué podemos ayudarte?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '1rem',
              color: '#1F2937',
              height: '100%',
              flex: 1,
              padding: '0 12px',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 22 }}>
        {QUICK_GUIDES.map((g) => (
          <button
            key={g.title}
            onClick={() => onNavigate?.(g.section)}
            style={{
              background: 'white',
              borderRadius: 14,
              padding: 18,
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              transition: 'transform 0.2s',
            }}
          >
            <div style={{ width: 42, height: 42, borderRadius: 12, background: g.bg, color: g.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {g.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: '#111827' }}>{g.title}</div>
              <div style={{ fontSize: '0.82rem', color: '#6B7280', marginTop: 2 }}>{g.desc}</div>
            </div>
            <ChevronRight style={{ width: 18, height: 18, color: '#9CA3AF' }} />
          </button>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10 }}>
          <HelpCircle style={{ width: 18, height: 18, color: '#6B7280' }} />
          <div style={{ fontWeight: 800, color: '#111827' }}>Preguntas Frecuentes</div>
        </div>
        <div>
          {filteredFaqs.map((f, idx) => {
            const open = openFaq === idx;
            return (
              <div key={f.q} style={{ borderBottom: '1px solid #F9FAFB' }}>
                <button
                  onClick={() => setOpenFaq(open ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    background: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ fontWeight: 800, color: '#111827', textAlign: 'left' }}>{f.q}</div>
                  <ChevronDown style={{ width: 18, height: 18, color: '#9CA3AF', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
                </button>
                {open && (
                  <div style={{ padding: '0 20px 16px', color: '#4B5563', fontSize: '0.92rem', lineHeight: 1.5 }}>{f.a}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        <div style={{ background: 'white', borderRadius: 14, padding: 18, border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Mail style={{ width: 18, height: 18, color: '#2563EB' }} />
            <div style={{ fontWeight: 800, color: '#111827' }}>Soporte por correo</div>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: 8 }}>soporte@esap.edu.co</div>
          <button
            onClick={() => toast.success('Solicitud enviada', { description: 'Te contactaremos pronto.' })}
            style={{ marginTop: 10, height: 38, padding: '0 14px', borderRadius: 10, border: 'none', background: '#003DA5', color: 'white', fontWeight: 700, cursor: 'pointer' }}
          >
            Enviar correo
          </button>
        </div>

        <div style={{ background: 'white', borderRadius: 14, padding: 18, border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Phone style={{ width: 18, height: 18, color: '#059669' }} />
            <div style={{ fontWeight: 800, color: '#111827' }}>Soporte telefónico</div>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: 8 }}>Extensión 5000</div>
          <button
            onClick={() => toast.info('Llamada', { description: 'Marca la extensión 5000.' })}
            style={{ marginTop: 10, height: 38, padding: '0 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: 'white', color: '#111827', fontWeight: 700, cursor: 'pointer' }}
          >
            Ver instrucciones
          </button>
        </div>

        <div style={{ background: 'white', borderRadius: 14, padding: 18, border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MessageCircle style={{ width: 18, height: 18, color: '#7C3AED' }} />
            <div style={{ fontWeight: 800, color: '#111827' }}>Recursos</div>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: 8 }}>Documentación y guías</div>
          <button
            onClick={() => toast.info('Recurso externo', { description: 'Abrir documentación.' })}
            style={{ marginTop: 10, height: 38, padding: '0 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: 'white', color: '#111827', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <ExternalLink style={{ width: 14, height: 14, color: '#6B7280' }} />
            Abrir
          </button>
        </div>
      </div>
    </motion.div>
  );
}

