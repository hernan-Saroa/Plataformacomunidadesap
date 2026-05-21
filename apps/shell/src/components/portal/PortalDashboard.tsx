/**
 * Portal Dashboard - Orchestrator (Legacy PTA)
 *
 * Migrado desde `PlataformaDeGestion-PTA-mergue_full` para que el layout académico
 * quede idéntico al portal transaccional original.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RoleSelector } from './RoleSelector';
import { AuthenticatedPortalNavbar } from './AuthenticatedPortalNavbar';
import { PortalTransaccional } from './PortalTransaccional';
import { MapPin, Mail, Phone } from 'lucide-react';
import { ESAPLogo } from '../assets/ESAPLogo';

interface PortalDashboardProps {
  userName: string;
  userEmail: string;
  userPersonId: string;
  userRoles: string[];
  userPermissions?: string[];
  userData?: any;
  onActiveRoleChange?: (role: string) => void;
  onLogout?: () => void;
  hasBothSystemsAccess?: boolean;
  onSystemChange?: (system: 'backoffice' | 'portal') => void;
}

const normalizePortalRoleCode = (role?: string | null) =>
  String(role || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');

const displayPortalRoleFromCode = (roleCode?: string | null) => {
  const code = normalizePortalRoleCode(roleCode);
  const labels: Record<string, string> = {
    DOCENTE: 'Docente',
    ESTUDIANTE: 'Estudiante',
    GRADUADO: 'Graduado',
    EGRESADO: 'Graduado',
    ASPIRANTE: 'Aspirante',
    ADMINISTRATIVO: 'Administrativo',
    FUNCIONARIO: 'Administrativo',
    SUPER_ADMIN: 'Super Administrador',
  };
  return labels[code] || roleCode || 'Estudiante';
};

export function PortalDashboard({
  userName,
  userEmail,
  userPersonId,
  userRoles,
  userPermissions,
  userData,
  onActiveRoleChange,
  onLogout,
  hasBothSystemsAccess = false,
  onSystemChange,
}: PortalDashboardProps) {
  const portalRoleCodes = useMemo(
    () =>
      Array.from(
        new Set(((Array.isArray(userData?.roles) && userData.roles.length ? userData.roles : userRoles) || []).map(normalizePortalRoleCode).filter(Boolean)),
      ),
    [userData?.roles, userRoles],
  );
  const initialRoleCode = normalizePortalRoleCode(userData?.rol_principal || portalRoleCodes[0] || 'ESTUDIANTE');
  console.log('🚀 Initial role code:', initialRoleCode, userData);
  const [activeRoleCode, setActiveRoleCode] = useState<string>(initialRoleCode);
  const activeRole = displayPortalRoleFromCode(activeRoleCode);
  const [navbarNavigateTo, setNavbarNavigateTo] = useState<string | null>(null);
  const navCounter = useRef(0);
  const [currentSection, setCurrentSection] = useState<string>('inicio');

  useEffect(() => {
    const storageKey = `portal_active_role_${userPersonId}`;
    const savedRole = localStorage.getItem(storageKey);

    const savedRoleCode = normalizePortalRoleCode(savedRole);
    const savedRoleMatches = savedRoleCode && portalRoleCodes.includes(savedRoleCode);

    if (savedRoleMatches) {
      setActiveRoleCode(savedRoleCode);
      onActiveRoleChange?.(displayPortalRoleFromCode(savedRoleCode));
    } else {
      const validRoleCode = portalRoleCodes.find((roleCode) =>
        ['ESTUDIANTE', 'DOCENTE', 'GRADUADO', 'EGRESADO', 'ASPIRANTE', 'ADMINISTRATIVO'].includes(roleCode),
      );
      if (validRoleCode) {
        setActiveRoleCode(validRoleCode);
        onActiveRoleChange?.(displayPortalRoleFromCode(validRoleCode));
      }
    }
  }, [userPersonId, portalRoleCodes, onActiveRoleChange]);

  useEffect(() => {
    const storageKey = `portal_active_role_${userPersonId}`;
    localStorage.setItem(storageKey, activeRoleCode);
    onActiveRoleChange?.(activeRole);
  }, [activeRoleCode, activeRole, userPersonId, onActiveRoleChange]);

  const handleRoleChange = (newRole: string) => {
    const selectedCode =
      portalRoleCodes.find((roleCode) => displayPortalRoleFromCode(roleCode) === newRole) ||
      normalizePortalRoleCode(newRole);
    setActiveRoleCode(selectedCode);
    onActiveRoleChange?.(displayPortalRoleFromCode(selectedCode));
  };

  const handleNavbarNavigate = useCallback((section: string) => {
    navCounter.current += 1;
    setCurrentSection(section === 'dashboard' ? 'inicio' : section);
    setNavbarNavigateTo(`${section}::${navCounter.current}`);
  }, []);

  const roleData = userData?.datos_por_rol || {};
  const portalDisplayRoles = Array.from(new Set(portalRoleCodes.map(displayPortalRoleFromCode)));

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9' }}>
      <AuthenticatedPortalNavbar
        userName={userName}
        userEmail={userEmail}
        userRoles={userRoles}
        activeRole={activeRole}
        onLogout={onLogout || (() => {})}
        onNavigate={handleNavbarNavigate}
        currentSection={currentSection}
        hasBothSystemsAccess={hasBothSystemsAccess}
        onSystemChange={onSystemChange}
      />

      <RoleSelector
        roles={portalDisplayRoles}
        userRoles={portalDisplayRoles}
        activeRole={activeRole}
        onRoleChange={handleRoleChange}
      />

      <AnimatePresence mode="wait">
        <motion.div
          id="portal-transaccional-content"
          key={activeRole}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="min-h-screen bg-[#F0F2F5] pb-24 lg:pb-0 font-sans"
        >
          <PortalTransaccional
            userName={userName}
            userEmail={userEmail}
            userPersonId={userPersonId}
            activeRole={activeRole}
            activeRoleCode={activeRoleCode}
            userPermissions={userPermissions}
            adminData={roleData?.Administrativo}
            onLogout={onLogout}
            navbarNavigateTo={navbarNavigateTo}
          />
        </motion.div>
      </AnimatePresence>
      {/* ═══════════════════════════════════════════════════
        FOOTER — consistent with Landing Page
        ═══════════════════════════════════════════════════ */}
      <footer className="bg-[#1e5da8] text-white py-10">
        <div className="max-w-5xl mx-auto px-5 lg:px-8">

          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-8 pb-6 border-b border-white/20">
            <div className="flex items-start gap-3">
              <ESAPLogo variant="white" className="h-8 sm:h-9 md:h-10 w-auto" />
              <div>
                <h3 className="text-[15px] font-bold mb-1">Escuela Superior de Administración Pública</h3>
                <p className="text-[13px] text-blue-100 mb-2">Formando líderes de excelencia al servicio del Estado desde 1958.</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center h-5 px-2 bg-white/10 rounded-[6px] text-[11px] text-blue-100">Educación Pública</span>
                  <span className="inline-flex items-center h-5 px-2 bg-white/10 rounded-[6px] text-[11px] text-blue-100">Acreditación de Alta Calidad</span>
                  <span className="hidden sm:inline-flex items-center h-5 px-2 bg-white/10 rounded-[6px] text-[11px] text-blue-100">Investigación</span>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0">
              <p className="text-[13px] font-semibold mb-2">Síguenos:</p>
              {/* Social icons */}
              <div className="flex gap-2">
                {[
                  'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
                  'M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z',
                  'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z'
                ].map((d, i) => (
                  <a key={i} href="#" className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-[10px] flex items-center justify-center transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d={d} /></svg>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Links grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-6 mb-8">
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-wider text-white/70 mb-3">Institucional</h4>
              <ul className="space-y-1.5 text-[13px] text-blue-100">
                {['Acerca de ESAP', 'Misión y Visión', 'Directivos', 'Sedes y Regionales', 'Trabaje con Nosotros'].map(l => (
                  <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-wider text-white/70 mb-3">Académico</h4>
              <ul className="space-y-1.5 text-[13px] text-blue-100">
                {['Programas de Pregrado', 'Posgrados', 'Educación Continua', 'Investigación', 'Biblioteca Virtual'].map(l => (
                  <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-wider text-white/70 mb-3">Servicios</h4>
              <ul className="space-y-1.5 text-[13px] text-blue-100">
                {['Portal Transaccional', 'Certificados', 'PQRS', 'Trámites y Servicios', 'Soporte Técnico'].map(l => (
                  <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-wider text-white/70 mb-3">Legal</h4>
              <ul className="space-y-1.5 text-[13px] text-blue-100">
                {['Políticas de Privacidad', 'Términos y Condiciones', 'Tratamiento de Datos', 'Transparencia', 'Accesibilidad'].map(l => (
                  <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <h4 className="text-[12px] font-bold uppercase tracking-wider text-white/70 mb-3">Contacto</h4>
              <ul className="space-y-2 text-[13px] text-blue-100">
                <li className="flex items-start gap-1.5"><MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>Bogotá D.C.<br />Diagonal 40 No. 46A-37</span></li>
                <li className="flex items-center gap-1.5"><Phone className="w-4 h-4 flex-shrink-0" />(601) 220 0700</li>
                <li className="flex items-center gap-1.5"><Mail className="w-4 h-4 flex-shrink-0" /><span className="break-all">correspondencia@esap.edu.co</span></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-4 border-t border-white/20 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-[12px] text-blue-100 text-center sm:text-left">© 2025 ESAP — Escuela Superior de Administración Pública. Todos los derechos reservados.</p>
            <div className="inline-flex items-center gap-1.5 h-6 px-2.5 bg-green-500/20 rounded-full text-green-300 text-[11px] flex-shrink-0">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              {/* Última actualización: {__APP_UPDATE_DATE__} */}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
