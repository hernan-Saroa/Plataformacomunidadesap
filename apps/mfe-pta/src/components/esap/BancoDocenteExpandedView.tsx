import React from 'react';
import {
  User,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Phone,
  Award,
  Briefcase,
  Hash,
  Clock,
  MessageSquare,
  GraduationCap,
  BookOpen,
  ClipboardList,
  Shield,
} from 'lucide-react';
import { sanitizeText } from '../../utils/textSanitizer';

interface BancoDocenteExpandedViewProps {
  user: any;
  onClose?: () => void;
}

function toDisplayText(value: unknown): string | null {
  if (value === undefined || value === null) return null;

  if (typeof value === 'string') {
    const normalized = sanitizeText(value).trim();
    return normalized === '' ? null : normalized;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null;
  }

  return String(value);
}

function formatDate(value: unknown): string | null {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return toDisplayText(value);
  }

  return date.toLocaleDateString('es-CO');
}

function formatNumeric(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;

  if (typeof value === 'number') {
    return value.toLocaleString('es-CO', { maximumFractionDigits: 2 });
  }

  const text = toDisplayText(value);
  if (!text) return null;

  const normalized = text.replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return text;

  return parsed.toLocaleString('es-CO', { maximumFractionDigits: 2 });
}

function buildFullName(user: any, bancoDocente: any): string {
  const fromBanco = toDisplayText(bancoDocente?.nombre_completo);
  if (fromBanco) return fromBanco;

  const parts = [
    user?.primer_nombre,
    user?.segundo_nombre,
    user?.primer_apellido,
    user?.segundo_apellido,
  ]
    .map((value) => toDisplayText(value))
    .filter(Boolean);

  if (parts.length > 0) return parts.join(' ');

  return (
    toDisplayText(user?.nombre) ||
    toDisplayText(user?.nombre_completo) ||
    toDisplayText(user?.fullName) ||
    'Sin nombre'
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  iconColor = 'text-blue-600',
  bgColor = 'bg-blue-50',
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
  iconColor?: string;
  bgColor?: string;
}) {
  const isEmpty = !value && value !== 0;

  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 shrink-0 rounded-lg p-1.5 ${bgColor}`}>
        <Icon size={14} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          {label}
        </p>
        {isEmpty ? (
          <span className="mt-0.5 block text-[13px] italic leading-tight text-gray-300">-</span>
        ) : (
          <span className="mt-0.5 block break-words text-[13px] font-medium leading-tight text-gray-700">
            {value}
          </span>
        )}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  iconColor,
  children,
}: {
  title: string;
  icon: any;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h4
        className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em]"
        style={{ color: '#64748B' }}
      >
        <Icon size={13} className={iconColor} /> {title}
      </h4>
      <div className="space-y-3 rounded-xl border border-gray-100 bg-white p-4 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.08)]">
        {children}
      </div>
    </div>
  );
}

export function BancoDocenteExpandedView({
  user,
  onClose,
}: BancoDocenteExpandedViewProps) {
  const bancoDocente = user?.banco_docente || user?.docente?.banco_docente || {};
  const nombreCompleto = buildFullName(user, bancoDocente);

  const documento = toDisplayText(
    bancoDocente?.documento_identidad || user?.identificacion || user?.documento || user?.document,
  );
  const territorial = toDisplayText(bancoDocente?.territorial || user?.territorial_nombre);
  const categoria = toDisplayText(
    bancoDocente?.categoria || user?.categoria_escalafon || user?.escalafon,
  );
  const dedicacion = toDisplayText(bancoDocente?.dedicacion || user?.dedicacion_label);
  const correoInstitucional = toDisplayText(
    bancoDocente?.correo_institucional || user?.correo_institucional || user?.email,
  );
  const correoPersonal = toDisplayText(
    bancoDocente?.correo_personal || user?.correo_alternativo,
  );
  const telefono = toDisplayText(bancoDocente?.telefono || user?.telefono || user?.phone);
  const nacimiento = formatDate(bancoDocente?.nacimiento || user?.fecha_nacimiento);
  const puntajeSalarial = formatNumeric(bancoDocente?.puntaje_salarial);

  return (
    <div className="relative m-4 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
      <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-600"></div>

      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-800"
          title="Cerrar detalles"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}

      <div className="mb-5 pr-8">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-2.5">
            <User size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Banco de Docentes ESAP
            </p>
            <p className="text-[17px] font-bold leading-tight text-gray-900">{nombreCompleto}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SectionCard title="Banco de Docentes" icon={ClipboardList} iconColor="text-blue-600">
          <InfoRow icon={Hash} label="Documento de identidad" value={documento} />
          <InfoRow
            icon={Briefcase}
            label="Vinculacion"
            value={toDisplayText(bancoDocente?.vinculacion || user?.tipoVinculacion_label)}
            bgColor="bg-blue-50"
            iconColor="text-blue-600"
          />
          <InfoRow
            icon={MapPin}
            label="Territorial"
            value={territorial}
            bgColor="bg-blue-50"
            iconColor="text-blue-600"
          />
          <InfoRow
            icon={Award}
            label="Categoria"
            value={categoria}
            bgColor="bg-blue-50"
            iconColor="text-blue-600"
          />
          <InfoRow
            icon={Clock}
            label="Dedicacion"
            value={dedicacion}
            bgColor="bg-blue-50"
            iconColor="text-blue-600"
          />
          <InfoRow
            icon={ClipboardList}
            label="Nucleo tematico"
            value={toDisplayText(bancoDocente?.nucleo_tematico)}
            bgColor="bg-blue-50"
            iconColor="text-blue-600"
          />
        </SectionCard>

        <SectionCard title="Perfil Academico" icon={GraduationCap} iconColor="text-purple-500">
          <InfoRow
            icon={GraduationCap}
            label="Nivel de formacion"
            value={toDisplayText(bancoDocente?.nivel_formacion)}
            bgColor="bg-purple-50"
            iconColor="text-purple-600"
          />
          <InfoRow
            icon={BookOpen}
            label="Perfil academico"
            value={toDisplayText(bancoDocente?.perfil_academico)}
            bgColor="bg-purple-50"
            iconColor="text-purple-600"
          />
          <InfoRow
            icon={GraduationCap}
            label="Pregrado"
            value={toDisplayText(bancoDocente?.pregrado)}
            bgColor="bg-purple-50"
            iconColor="text-purple-600"
          />
          <InfoRow
            icon={GraduationCap}
            label="Especializacion"
            value={toDisplayText(bancoDocente?.especializacion)}
            bgColor="bg-purple-50"
            iconColor="text-purple-600"
          />
          <InfoRow
            icon={GraduationCap}
            label="Maestria"
            value={toDisplayText(bancoDocente?.maestria)}
            bgColor="bg-purple-50"
            iconColor="text-purple-600"
          />
          <InfoRow
            icon={GraduationCap}
            label="Doctorado"
            value={toDisplayText(bancoDocente?.doctorado)}
            bgColor="bg-purple-50"
            iconColor="text-purple-600"
          />
          <InfoRow
            icon={GraduationCap}
            label="PosDoctorado"
            value={toDisplayText(bancoDocente?.posdoctorado)}
            bgColor="bg-purple-50"
            iconColor="text-purple-600"
          />
          <InfoRow
            icon={MessageSquare}
            label="Investigacion 2025"
            value={toDisplayText(bancoDocente?.investigacion)}
            bgColor="bg-purple-50"
            iconColor="text-purple-600"
          />
        </SectionCard>

        <SectionCard title="Vinculacion y Contacto" icon={FileText} iconColor="text-emerald-500">
          <InfoRow
            icon={FileText}
            label="Origen de vinculacion"
            value={toDisplayText(bancoDocente?.origen_vinculacion)}
            bgColor="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <InfoRow
            icon={FileText}
            label="Acto Administrativo de Vinculacion"
            value={toDisplayText(bancoDocente?.acto_administrativo_vinculacion)}
            bgColor="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <InfoRow
            icon={Mail}
            label="Correo institucional"
            value={correoInstitucional}
            bgColor="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <InfoRow
            icon={Mail}
            label="Correo personal"
            value={correoPersonal}
            bgColor="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <InfoRow
            icon={Phone}
            label="Telefono"
            value={telefono}
            bgColor="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <InfoRow
            icon={Award}
            label="Ultima evaluacion"
            value={toDisplayText(bancoDocente?.ultima_evaluacion)}
            bgColor="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <InfoRow
            icon={Shield}
            label="Situacion administrativa"
            value={toDisplayText(bancoDocente?.situacion_administrativa)}
            bgColor="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <InfoRow
            icon={Calendar}
            label="Inicio de vinculacion"
            value={formatDate(bancoDocente?.inicio_vinculacion)}
            bgColor="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <InfoRow
            icon={Calendar}
            label="Fin de vinculacion"
            value={formatDate(bancoDocente?.fin_vinculacion)}
            bgColor="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <InfoRow
            icon={Award}
            label="Puntaje salarial"
            value={puntajeSalarial}
            bgColor="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <InfoRow
            icon={User}
            label="Genero"
            value={toDisplayText(bancoDocente?.genero || user?.genero)}
            bgColor="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <InfoRow
            icon={Calendar}
            label="Nacimiento"
            value={nacimiento}
            bgColor="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <InfoRow
            icon={Clock}
            label="Edad"
            value={toDisplayText(bancoDocente?.edad)}
            bgColor="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <InfoRow
            icon={Clock}
            label="Rango de edad"
            value={toDisplayText(bancoDocente?.rango_edad)}
            bgColor="bg-emerald-50"
            iconColor="text-emerald-600"
          />
        </SectionCard>
      </div>
    </div>
  );
}
