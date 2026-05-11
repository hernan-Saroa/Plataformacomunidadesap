import { Fragment, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { motion } from 'motion/react';
import {
  Shield,
  Check,
  X,
  Search,
  Save,
  RotateCcw,
  CheckCircle,
  Circle,
  MinusCircle,
  Users,
  GraduationCap,
  Award,
  FileText,
  MessageSquare,
  Briefcase,
  ClipboardList,
  FolderOpen,
  BarChart3,
  ScrollText,
  Cog,
  TrendingUp,
  Building2,
  BookOpen,
  CalendarDays,
  FileCheck,
  UserPlus,
  Activity,
  Database,
  Settings,
  Bell,
  Scale,
  Clock,
  Loader2,
  CheckSquare
} from 'lucide-react';
import { toast } from 'sonner';

// Importar configuración centralizada de permisos (fallback)
import { PERMISSION_MODULES } from '../../data/permissions-config-updated';
import type { Permission, PermissionModule } from '../../data/permissions-config-updated';
import { modulesService } from '../../services/api/modules.service';
import { rolesService } from '../../services/api';

interface SystemRole {
  id: string;
  name: string;
  code?: string;
  description?: string;
  icon: string;
  color: string;
}

interface RolePermissionsEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: SystemRole;
  onSaved?: () => void;
}

type PermissionWithCode = Permission & { code?: string };
type PermissionModuleWithCodes = Omit<PermissionModule, 'permissions' | 'permissionGroups'> & {
  permissions: PermissionWithCode[];
  permissionGroups?: { group: string; permissions: PermissionWithCode[] }[];
};

type AcademicProfileId = 'head' | 'approver' | 'reviewer';

interface AcademicProfile {
  id: AcademicProfileId;
  label: string;
  required: string[];
  allowed: string[];
}

const GRADUATES_PERMISSION_CODES = [
  'graduates.edit',
  'graduates.export',
  'graduates.verify_certificate',
];

const TITLE_VERIFICATION_PERMISSION_CODES = [
  'graduates-certificates.solicitude.aprobar',
  'graduates-certificates.certificates.view',
  'graduates-certificates.certificates.edit',
  'graduates-certificates.solicitude.review',
  'graduates-certificates.certificates.export',
  'graduates-certificates.solicitude.rechazar',
  'graduates-certificates.certificates.reenviar',
  'graduates-certificates.solicitude.view',
];

const ACADEMIC_PERMISSION_CODES = new Set([
  ...GRADUATES_PERMISSION_CODES,
  ...TITLE_VERIFICATION_PERMISSION_CODES,
]);

const ACADEMIC_PROFILES: AcademicProfile[] = [
  {
    id: 'head',
    label: 'Jefe',
    allowed: [...GRADUATES_PERMISSION_CODES, ...TITLE_VERIFICATION_PERMISSION_CODES],
    required: [
      'graduates.edit',
      'graduates.export',
      'graduates.verify_certificate',
      'graduates-certificates.solicitude.aprobar',
      'graduates-certificates.certificates.view',
      'graduates-certificates.certificates.edit',
      'graduates-certificates.certificates.export',
      'graduates-certificates.solicitude.rechazar',
      'graduates-certificates.certificates.reenviar',
    ],
  },
  {
    id: 'approver',
    label: 'Aprobador',
    allowed: [
      'graduates.verify_certificate',
      'graduates-certificates.solicitude.aprobar',
      'graduates-certificates.certificates.view',
      'graduates-certificates.solicitude.review',
      'graduates-certificates.solicitude.rechazar',
      'graduates-certificates.certificates.reenviar',
      'graduates-certificates.solicitude.view',
    ],
    required: [
      'graduates.verify_certificate',
      'graduates-certificates.solicitude.aprobar',
      'graduates-certificates.certificates.view',
      'graduates-certificates.solicitude.review',
      'graduates-certificates.solicitude.rechazar',
      'graduates-certificates.certificates.reenviar',
      'graduates-certificates.solicitude.view',
    ],
  },
  {
    id: 'reviewer',
    label: 'Revisor',
    allowed: [
      'graduates.verify_certificate',
      'graduates-certificates.certificates.view',
      'graduates-certificates.solicitude.review',
      'graduates-certificates.certificates.reenviar',
      'graduates-certificates.solicitude.view',
    ],
    required: [
      'graduates.verify_certificate',
      'graduates-certificates.certificates.view',
      'graduates-certificates.solicitude.review',
      'graduates-certificates.solicitude.view',
    ],
  },
];

const getPermissionCode = (permission: PermissionWithCode) => permission.code || permission.id;

const MOJIBAKE_PATTERN = /[ÃÂâ�]/;

const KNOWN_MOJIBAKE_REPLACEMENTS: Array<[string, string]> = [
  ['Ã¡', 'á'],
  ['Ã©', 'é'],
  ['Ã­', 'í'],
  ['Ã³', 'ó'],
  ['Ãº', 'ú'],
  ['Ã±', 'ñ'],
  ['Ã¼', 'ü'],
  ['Ã', 'Á'],
  ['Ã‰', 'É'],
  ['Ã', 'Í'],
  ['Ã“', 'Ó'],
  ['Ãš', 'Ú'],
  ['Ã‘', 'Ñ'],
  ['Ãœ', 'Ü'],
  ['Â¿', '¿'],
  ['Â¡', '¡'],
  ['Â°', '°'],
  ['Âº', 'º'],
  ['â€“', '–'],
  ['â€”', '—'],
  ['â€˜', '‘'],
  ['â€™', '’'],
  ['â€œ', '“'],
  ['â€', '”'],
  ['â€¢', '•'],
  ['â€¦', '…'],
  ['âœ…', '✅'],
  ['âŒ', '❌'],
];

const SPANISH_TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bGestionar (?:\?\?|�)rganos de Control\b/g, 'Gestionar Órganos de Control'],
  [/\bAdministrar (?:\?\?|�)rganos de control\b/g, 'Administrar órganos de control'],
  [/\bde (?:\?\?|�)rganos de control\b/g, 'de órganos de control'],
  [/(^|[\s([{¿¡"'`-])(?:\?\?|�)rganos\b/g, '$1órganos'],
  [/(^|[\s([{¿¡"'`-])(?:\?\?|�)rgano\b/g, '$1órgano'],
  [/\bSoliciar\b/g, 'Solicitar'],
  [/\bsoliciar\b/g, 'solicitar'],
  [/\bCambiar Estado (?:\?\?|�)rea\b/g, 'Cambiar Estado Área'],
  [/\bCrear (?:\?\?|�)rea\b/g, 'Crear Área'],
  [/\bEditar (?:\?\?|�)rea\b/g, 'Editar Área'],
  [/\bPermite cambiar el estado una (?:\?\?|�)rea\b/g, 'Permite cambiar el estado de un área'],
  [/\bPermite cambiar el estado de una (?:\?\?|�)rea\b/g, 'Permite cambiar el estado de un área'],
  [/\bPermite crear una nueva (?:\?\?|�)rea\b/g, 'Permite crear una nueva área'],
  [/\bPermite editar una (?:\?\?|�)rea\b/g, 'Permite editar un área'],
  [/(^|[\s([{¿¡"'`-])(?:\?\?|�)rea\b/g, '$1área'],
  [/(^|[\s([{¿¡"'`-])(?:\?\?|�)reas\b/g, '$1áreas'],
  [/\b([A-Za-zÁÉÍÓÚáéíóúÑñÜü]+)ci(?:\?\?|�)n\b/g, '$1ción'],
  [/\b([A-Za-zÁÉÍÓÚáéíóúÑñÜü]+)Ci(?:\?\?|�)n\b/g, '$1Ción'],
  [/\bLe(?:\?\?|�)da\b/g, 'Leída'],
  [/\ble(?:\?\?|�)da\b/g, 'leída'],
  [/\bLe(?:\?\?|�)do\b/g, 'Leído'],
  [/\ble(?:\?\?|�)do\b/g, 'leído'],
  [/\bLe(?:\?\?|�)das\b/g, 'Leídas'],
  [/\ble(?:\?\?|�)das\b/g, 'leídas'],
  [/\bLe(?:\?\?|�)dos\b/g, 'Leídos'],
  [/\ble(?:\?\?|�)dos\b/g, 'leídos'],
  [/\bGesti(?:\?\?|�)n\b/g, 'Gestión'],
  [/\bgesti(?:\?\?|�)n\b/g, 'gestión'],
  [/\bVerificaci(?:\?\?|�)n\b/g, 'Verificación'],
  [/\bverificaci(?:\?\?|�)n\b/g, 'verificación'],
  [/\bValidaci(?:\?\?|�)n\b/g, 'Validación'],
  [/\bvalidaci(?:\?\?|�)n\b/g, 'validación'],
  [/\bRevisi(?:\?\?|�)n\b/g, 'Revisión'],
  [/\brevisi(?:\?\?|�)n\b/g, 'revisión'],
  [/\bAprobaci(?:\?\?|�)n\b/g, 'Aprobación'],
  [/\baprobaci(?:\?\?|�)n\b/g, 'aprobación'],
  [/\bConfiguraci(?:\?\?|�)n\b/g, 'Configuración'],
  [/\bconfiguraci(?:\?\?|�)n\b/g, 'configuración'],
  [/\bAuditor(?:\?\?|�)a\b/g, 'Auditoría'],
  [/\bauditor(?:\?\?|�)a\b/g, 'auditoría'],
  [/\bEjecuci(?:\?\?|�)n\b/g, 'Ejecución'],
  [/\bejecuci(?:\?\?|�)n\b/g, 'ejecución'],
  [/\bM(?:\?\?|�)dulo\b/g, 'Módulo'],
  [/\bm(?:\?\?|�)dulo\b/g, 'módulo'],
  [/\bPar(?:\?\?|�)metros\b/g, 'Parámetros'],
  [/\bpar(?:\?\?|�)metros\b/g, 'parámetros'],
  [/\bEstad(?:\?\?|�)sticas\b/g, 'Estadísticas'],
  [/\bestad(?:\?\?|�)sticas\b/g, 'estadísticas'],
  [/\bM(?:\?\?|�)tricas\b/g, 'Métricas'],
  [/\bm(?:\?\?|�)tricas\b/g, 'métricas'],
  [/\bPol(?:\?\?|�)ticas\b/g, 'Políticas'],
  [/\bpol(?:\?\?|�)ticas\b/g, 'políticas'],
  [/\bContrase(?:\?\?|�)a\b/g, 'Contraseña'],
  [/\bcontrase(?:\?\?|�)a\b/g, 'contraseña'],
  [/\bContrase(?:\?\?|�)as\b/g, 'Contraseñas'],
  [/\bcontrase(?:\?\?|�)as\b/g, 'contraseñas'],
  [/\bT(?:\?\?|�)rmino\b/g, 'Término'],
  [/\bt(?:\?\?|�)rmino\b/g, 'término'],
  [/\bT(?:\?\?|�)rminos\b/g, 'Términos'],
  [/\bt(?:\?\?|�)rminos\b/g, 'términos'],
  [/\bElectr(?:\?\?|�)nico\b/g, 'Electrónico'],
  [/\belectr(?:\?\?|�)nico\b/g, 'electrónico'],
  [/\bAcad(?:\?\?|�)mico\b/g, 'Académico'],
  [/\bacad(?:\?\?|�)mico\b/g, 'académico'],
  [/\bAcad(?:\?\?|�)micos\b/g, 'Académicos'],
  [/\bacad(?:\?\?|�)micos\b/g, 'académicos'],
  [/\bT(?:\?\?|�)tulo\b/g, 'Título'],
  [/\bt(?:\?\?|�)tulo\b/g, 'título'],
  [/\bT(?:\?\?|�)tulos\b/g, 'Títulos'],
  [/\bt(?:\?\?|�)tulos\b/g, 'títulos'],
  [/\bInformaci(?:\?\?|�)n\b/g, 'Información'],
  [/\binformaci(?:\?\?|�)n\b/g, 'información'],
  [/\bPublicaci(?:\?\?|�)n\b/g, 'Publicación'],
  [/\bpublicaci(?:\?\?|�)n\b/g, 'publicación'],
  [/\bEvaluaci(?:\?\?|�)n\b/g, 'Evaluación'],
  [/\bevaluaci(?:\?\?|�)n\b/g, 'evaluación'],
  [/\bSanci(?:\?\?|�)n\b/g, 'Sanción'],
  [/\bsanci(?:\?\?|�)n\b/g, 'sanción'],
  [/\bEmisi(?:\?\?|�)n\b/g, 'Emisión'],
  [/\bemisi(?:\?\?|�)n\b/g, 'emisión'],
  [/\bM(?:\?\?|�)xima\b/g, 'Máxima'],
  [/\bm(?:\?\?|�)xima\b/g, 'máxima'],
  [/\bM(?:\?\?|�)ltiples\b/g, 'Múltiples'],
  [/\bm(?:\?\?|�)ltiples\b/g, 'múltiples'],
  [/\b(?:\?\?|�)rganos\b/g, 'Órganos'],
  [/\b(?:\?\?|�)rea\b/g, 'Área'],
  [/\b(?:\?\?|�)reas\b/g, 'Áreas'],
  [/\bDirecci(?:\?\?|�)n\b/g, 'Dirección'],
  [/\bdirecci(?:\?\?|�)n\b/g, 'dirección'],
  [/\bPlaneaci(?:\?\?|�)n\b/g, 'Planeación'],
  [/\bplaneaci(?:\?\?|�)n\b/g, 'planeación'],
  [/\bValoraci(?:\?\?|�)n\b/g, 'Valoración'],
  [/\bvaloraci(?:\?\?|�)n\b/g, 'valoración'],
  [/\bIndagaci(?:\?\?|�)n\b/g, 'Indagación'],
  [/\bindagaci(?:\?\?|�)n\b/g, 'indagación'],
  [/\bInvestigaci(?:\?\?|�)n\b/g, 'Investigación'],
  [/\binvestigaci(?:\?\?|�)n\b/g, 'investigación'],
  [/\bAdministraci(?:\?\?|�)n\b/g, 'Administración'],
  [/\badministraci(?:\?\?|�)n\b/g, 'administración'],
  [/\bAutenticaci(?:\?\?|�)n\b/g, 'Autenticación'],
  [/\bautenticaci(?:\?\?|�)n\b/g, 'autenticación'],
  [/\bVisualizaci(?:\?\?|�)n\b/g, 'Visualización'],
  [/\bvisualizaci(?:\?\?|�)n\b/g, 'visualización'],
  [/\bNotificaci(?:\?\?|�)n\b/g, 'Notificación'],
  [/\bnotificaci(?:\?\?|�)n\b/g, 'notificación'],
  [/\bRemisi(?:\?\?|�)n\b/g, 'Remisión'],
  [/\bremisi(?:\?\?|�)n\b/g, 'remisión'],
  [/\bRecepci(?:\?\?|�)n\b/g, 'Recepción'],
  [/\brecepci(?:\?\?|�)n\b/g, 'recepción'],
  [/\bCertificaci(?:\?\?|�)n\b/g, 'Certificación'],
  [/\bcertificaci(?:\?\?|�)n\b/g, 'certificación'],
  [/\bVinculaci(?:\?\?|�)n\b/g, 'Vinculación'],
  [/\bvinculaci(?:\?\?|�)n\b/g, 'vinculación'],
  [/\bAsignaci(?:\?\?|�)n\b/g, 'Asignación'],
  [/\basignaci(?:\?\?|�)n\b/g, 'asignación'],
  [/\bProgramaci(?:\?\?|�)n\b/g, 'Programación'],
  [/\bprogramaci(?:\?\?|�)n\b/g, 'programación'],
  [/\bC(?:\?\?|�)digo\b/g, 'Código'],
  [/\bc(?:\?\?|�)digo\b/g, 'código'],
  [/\bC(?:\?\?|�)dula\b/g, 'Cédula'],
  [/\bc(?:\?\?|�)dula\b/g, 'cédula'],
  [/\bT(?:\?\?|�)cnica\b/g, 'Técnica'],
  [/\bt(?:\?\?|�)cnica\b/g, 'técnica'],
  [/\bAsesor(?:\?\?|�)a\b/g, 'Asesoría'],
  [/\basesor(?:\?\?|�)a\b/g, 'asesoría'],
  [/\bJur(?:\?\?|�)dica\b/g, 'Jurídica'],
  [/\bjur(?:\?\?|�)dica\b/g, 'jurídica'],
  [/\bJur(?:\?\?|�)dico\b/g, 'Jurídico'],
  [/\bjur(?:\?\?|�)dico\b/g, 'jurídico'],
  [/\bJur(?:\?\?|�)dicas\b/g, 'Jurídicas'],
  [/\bjur(?:\?\?|�)dicas\b/g, 'jurídicas'],
  [/\bJur(?:\?\?|�)dicos\b/g, 'Jurídicos'],
  [/\bjur(?:\?\?|�)dicos\b/g, 'jurídicos'],
  [/\bCorrecci(?:\?\?|�)n\b/g, 'Corrección'],
  [/\bcorrecci(?:\?\?|�)n\b/g, 'corrección'],
  [/\bGestion\b/g, 'Gestión'],
  [/\bgestion\b/g, 'gestión'],
  [/\bVerificacion\b/g, 'Verificación'],
  [/\bverificacion\b/g, 'verificación'],
  [/\bValidacion\b/g, 'Validación'],
  [/\bvalidacion\b/g, 'validación'],
  [/\bRevision\b/g, 'Revisión'],
  [/\brevision\b/g, 'revisión'],
  [/\bAprobacion\b/g, 'Aprobación'],
  [/\baprobacion\b/g, 'aprobación'],
  [/\bConfiguracion\b/g, 'Configuración'],
  [/\bconfiguracion\b/g, 'configuración'],
  [/\bAuditoria\b/g, 'Auditoría'],
  [/\bauditoria\b/g, 'auditoría'],
  [/\bEjecucion\b/g, 'Ejecución'],
  [/\bejecucion\b/g, 'ejecución'],
  [/\bModulo\b/g, 'Módulo'],
  [/\bmodulo\b/g, 'módulo'],
  [/\bParametros\b/g, 'Parámetros'],
  [/\bparametros\b/g, 'parámetros'],
  [/\bEstadisticas\b/g, 'Estadísticas'],
  [/\bestadisticas\b/g, 'estadísticas'],
  [/\bMetricas\b/g, 'Métricas'],
  [/\bmetricas\b/g, 'métricas'],
  [/\bPoliticas\b/g, 'Políticas'],
  [/\bpoliticas\b/g, 'políticas'],
  [/\bContrasena\b/g, 'Contraseña'],
  [/\bcontrasena\b/g, 'contraseña'],
  [/\bContrasenas\b/g, 'Contraseñas'],
  [/\bcontrasenas\b/g, 'contraseñas'],
  [/\bTermino\b/g, 'Término'],
  [/\btermino\b/g, 'término'],
  [/\bTerminos\b/g, 'Términos'],
  [/\bterminos\b/g, 'términos'],
  [/\bElectronico\b/g, 'Electrónico'],
  [/\belectronico\b/g, 'electrónico'],
  [/\bAcademico\b/g, 'Académico'],
  [/\bacademico\b/g, 'académico'],
  [/\bAcademicos\b/g, 'Académicos'],
  [/\bacademicos\b/g, 'académicos'],
  [/\bTitulo\b/g, 'Título'],
  [/\btitulo\b/g, 'título'],
  [/\bTitulos\b/g, 'Títulos'],
  [/\btitulos\b/g, 'títulos'],
  [/\bInformacion\b/g, 'Información'],
  [/\binformacion\b/g, 'información'],
  [/\bPublicacion\b/g, 'Publicación'],
  [/\bpublicacion\b/g, 'publicación'],
  [/\bEvaluacion\b/g, 'Evaluación'],
  [/\bevaluacion\b/g, 'evaluación'],
  [/\bSancion\b/g, 'Sanción'],
  [/\bsancion\b/g, 'sanción'],
  [/\bEmision\b/g, 'Emisión'],
  [/\bemision\b/g, 'emisión'],
  [/\bMaxima\b/g, 'Máxima'],
  [/\bmaxima\b/g, 'máxima'],
  [/\bMultiples\b/g, 'Múltiples'],
  [/\bmultiples\b/g, 'múltiples'],
  [/\bOrganos\b/g, 'Órganos'],
  [/\borganos\b/g, 'órganos'],
  [/\bArea\b/g, 'Área'],
  [/\barea\b/g, 'área'],
  [/\bAreas\b/g, 'Áreas'],
  [/\bareas\b/g, 'áreas'],
  [/\bDireccion\b/g, 'Dirección'],
  [/\bdireccion\b/g, 'dirección'],
  [/\bDirecciones\b/g, 'Direcciones'],
  [/\bdirecciones\b/g, 'direcciones'],
  [/\bPlaneacion\b/g, 'Planeación'],
  [/\bplaneacion\b/g, 'planeación'],
  [/\bValoracion\b/g, 'Valoración'],
  [/\bvaloracion\b/g, 'valoración'],
  [/\bIndagacion\b/g, 'Indagación'],
  [/\bindagacion\b/g, 'indagación'],
  [/\bInvestigacion\b/g, 'Investigación'],
  [/\binvestigacion\b/g, 'investigación'],
  [/\bAdministracion\b/g, 'Administración'],
  [/\badministracion\b/g, 'administración'],
  [/\bAutenticacion\b/g, 'Autenticación'],
  [/\bautenticacion\b/g, 'autenticación'],
  [/\bVisualizacion\b/g, 'Visualización'],
  [/\bvisualizacion\b/g, 'visualización'],
  [/\bNotificacion\b/g, 'Notificación'],
  [/\bnotificacion\b/g, 'notificación'],
  [/\bNotificaciones\b/g, 'Notificaciones'],
  [/\bnotificaciones\b/g, 'notificaciones'],
  [/\bRemision\b/g, 'Remisión'],
  [/\bremision\b/g, 'remisión'],
  [/\bRecepcion\b/g, 'Recepción'],
  [/\brecepcion\b/g, 'recepción'],
  [/\bCertificacion\b/g, 'Certificación'],
  [/\bcertificacion\b/g, 'certificación'],
  [/\bVinculacion\b/g, 'Vinculación'],
  [/\bvinculacion\b/g, 'vinculación'],
  [/\bAsignacion\b/g, 'Asignación'],
  [/\basignacion\b/g, 'asignación'],
  [/\bProgramacion\b/g, 'Programación'],
  [/\bprogramacion\b/g, 'programación'],
  [/\bCodigo\b/g, 'Código'],
  [/\bcodigo\b/g, 'código'],
  [/\bCedula\b/g, 'Cédula'],
  [/\bcedula\b/g, 'cédula'],
  [/\bTecnica\b/g, 'Técnica'],
  [/\btecnica\b/g, 'técnica'],
];

const applySpanishTextCorrections = (value: string) =>
  SPANISH_TEXT_REPLACEMENTS.reduce(
    (text, [pattern, fixed]) => text.replace(pattern, fixed),
    value,
  );

const repairMojibakeText = (value?: string) => {
  if (!value) return '';
  if (!MOJIBAKE_PATTERN.test(value)) return applySpanishTextCorrections(value);

  const isLatin1Only = Array.from(value).every((char) => char.charCodeAt(0) <= 255);
  if (isLatin1Only) {
    try {
      const bytes = Uint8Array.from(
        Array.from(value),
        (char) => char.charCodeAt(0) & 0xff,
      );
      const repaired = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      if (!repaired.includes('\uFFFD')) return applySpanishTextCorrections(repaired);
    } catch {
      // Fallback manual below.
    }
  }

  const repaired = KNOWN_MOJIBAKE_REPLACEMENTS.reduce(
    (text, [broken, fixed]) => text.split(broken).join(fixed),
    value,
  );
  return applySpanishTextCorrections(repaired);
};

const normalizePermissionModulesText = (
  modules: PermissionModuleWithCodes[],
): PermissionModuleWithCodes[] =>
  modules.map((module) => {
    const normalizePermission = (permission: PermissionWithCode): PermissionWithCode => ({
      ...permission,
      name: repairMojibakeText(permission.name),
      description: repairMojibakeText(permission.description),
    });

    const permissions = module.permissions.map(normalizePermission);

    return {
      ...module,
      name: repairMojibakeText(module.name),
      permissions,
      permissionGroups: module.permissionGroups?.map((permissionGroup) => ({
        ...permissionGroup,
        group: repairMojibakeText(permissionGroup.group),
        permissions: permissionGroup.permissions.map(normalizePermission),
      })),
    };
  });

const getFallbackPermissionModules = () =>
  normalizePermissionModulesText(PERMISSION_MODULES as PermissionModuleWithCodes[]);

const GROUP_LABELS: Record<string, string> = {
  plan: 'Plan Anual',
  'plan-anual': 'Plan Anual',
  listas: 'Listas',
  'listas-chequeo': 'Listas de Chequeo',
  'listas chequeo': 'Listas de Chequeo',
  'listas de chequeo': 'Listas de Chequeo',
  auditoria: 'Auditoría',
  auditorias: 'Auditorías',
  revision: 'Revisión',
  'revision-aprobacion': 'Revisión y Aprobación',
  aprobacion: 'Aprobación',
  terminos: 'Términos',
  configuraciones: 'Configuraciones',
  'organos-control': 'Órganos de Control',
  expediente: 'Expediente',
  'expediente-electronico': 'Expediente Electrónico',
  expedientes: 'Expedientes',
  'informes-de-ley': 'Informes de Ley',
  'planes-mejoramiento': 'Planes de Mejoramiento',
  'procesos-coactivos': 'Procesos Coactivos',
  'config-auditorias': 'Configuración de Auditorías',
  'noticia-disciplinaria': 'Noticia Disciplinaria',
  'juzgamiento-disciplinario': 'Juzgamiento Disciplinario',
  planeacion: 'Planeación',
  valoracion: 'Valoración',
  indagacion: 'Indagación',
  investigacion: 'Investigación',
};

const getPermissionMaps = (modules: PermissionModuleWithCodes[]) => {
  const idToCode = new Map<string, string>();
  const codeToId = new Map<string, string>();

  modules.forEach((module) => {
    module.permissions.forEach((permission) => {
      const code = getPermissionCode(permission);
      idToCode.set(permission.id, code);
      codeToId.set(code, permission.id);
    });
  });

  return { idToCode, codeToId };
};

const getSelectedPermissionCodes = (
  selectedIds: Set<string>,
  modules: PermissionModuleWithCodes[],
) => {
  const { idToCode } = getPermissionMaps(modules);
  return Array.from(selectedIds)
    .map((permissionId) => idToCode.get(permissionId))
    .filter((code): code is string => Boolean(code));
};

const matchesAcademicProfile = (
  profile: AcademicProfile,
  selectedCodes: string[],
) => {
  const selectedCodeSet = new Set(selectedCodes);
  const hasRequired = profile.required.every((code) => selectedCodeSet.has(code));
  if (!hasRequired) return false;

  return selectedCodes.every((code) => {
    if (!ACADEMIC_PERMISSION_CODES.has(code)) return true;
    return profile.allowed.includes(code);
  });
};

const getActiveAcademicProfile = (
  selectedIds: Set<string>,
  modules: PermissionModuleWithCodes[],
) => {
  const selectedCodes = getSelectedPermissionCodes(selectedIds, modules);
  return ACADEMIC_PROFILES.find((profile) =>
    matchesAcademicProfile(profile, selectedCodes),
  ) || null;
};

const isSuperAdminRole = (role: SystemRole) =>
  role.code === 'SUPER_ADMIN' ||
  role.name.toLowerCase().includes('super admin') ||
  role.name.toLowerCase().includes('super administrador');

const selectAllPermissions = (
  modules: PermissionModuleWithCodes[],
): { permissions: Set<string>; academicProfile: AcademicProfileId } => {
  const headProfile = ACADEMIC_PROFILES.find((p) => p.id === 'head')!;
  const { codeToId } = getPermissionMaps(modules);
  const allIds = new Set(modules.flatMap((m) => m.permissions.map((p) => p.id)));
  headProfile.required.forEach((code) => {
    const id = codeToId.get(code);
    if (id) allIds.add(id);
  });
  return { permissions: allIds, academicProfile: 'head' };
};

export function RolePermissionsEditor({
  open,
  onOpenChange,
  role,
  onSaved
}: RolePermissionsEditorProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [permissionModules, setPermissionModules] = useState<PermissionModuleWithCodes[]>(
    () => getFallbackPermissionModules(),
  );
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeAcademicProfileId, setActiveAcademicProfileId] = useState<AcademicProfileId | null>(null);
  const activeAcademicProfile = activeAcademicProfileId
    ? ACADEMIC_PROFILES.find((profile) => profile.id === activeAcademicProfileId) || null
    : null;
  const isSuperAdmin = isSuperAdminRole(role);

  const iconMap: Record<string, any> = {
    Shield,
    Users,
    GraduationCap,
    Award,
    FileText,
    MessageSquare,
    Briefcase,
    ClipboardList,
    FolderOpen,
    BarChart3,
    ScrollText,
    Cog,
    TrendingUp,
    Building2,
    BookOpen,
    CalendarDays,
    FileCheck,
    UserPlus,
    Activity,
    Database,
    Settings,
    Bell,
    Scale,
    Clock
  };

  const resolveIcon = (icon: any) => {
    if (typeof icon === 'string') {
      return iconMap[icon] || Shield;
    }
    return icon || Shield;
  };

  const formatGroupName = (group: string) => {
    const normalizedGroup = repairMojibakeText(group || '').trim();
    const mappedGroup = GROUP_LABELS[normalizedGroup.toLowerCase()];
    if (mappedGroup) return mappedGroup;

    return normalizedGroup
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
      .trim() || 'Grupo';
  };

  useEffect(() => {
    if (!open || !role?.id) return;

    let cancelled = false;
    const loadPermissions = async () => {
      setPermissionsLoading(true);
      try {
        const [modules, rolePermissions] = await Promise.all([
          modulesService.getModulesWithPermissions({ is_active: true }),
          rolesService.getRolePermissions(role.id),
        ]);

        if (cancelled) return;
        const mappedModules = normalizePermissionModulesText(
          modulesService.mapToPermissionModules(modules) as PermissionModuleWithCodes[],
        );

        if (isSuperAdmin) {
          // Super Admin: marcar todos los permisos con perfil Jefe para Registro Académico
          const { permissions: allIds, academicProfile } = selectAllPermissions(mappedModules);
          setPermissionModules(mappedModules);
          setSelectedPermissions(allIds);
          setActiveAcademicProfileId(academicProfile);
          setHasChanges(true);
        } else {
          const loadedPermissions = new Set(rolePermissions.map((permission) => permission.id));
          const loadedAcademicProfile = getActiveAcademicProfile(loadedPermissions, mappedModules);
          setPermissionModules(mappedModules);
          setSelectedPermissions(loadedPermissions);
          setActiveAcademicProfileId(loadedAcademicProfile?.id || null);
          setHasChanges(false);
        }
      } catch (error) {
        console.error('Error loading permissions:', error);
        toast.error('Error al cargar permisos', {
          description: 'No se pudo obtener la lista de permisos desde el servidor'
        });
        if (!cancelled) {
          setPermissionModules(getFallbackPermissionModules());
          setActiveAcademicProfileId(null);
        }
      } finally {
        if (!cancelled) setPermissionsLoading(false);
      }
    };

    loadPermissions();

    return () => {
      cancelled = true;
    };
  }, [open, role.id]);

  const getPermissionAcademicState = (
    permission: PermissionWithCode,
  ): 'required' | 'optional' | 'outside' | 'profile-required' | null => {
    const code = getPermissionCode(permission);
    if (!ACADEMIC_PERMISSION_CODES.has(code)) return null;
    if (!activeAcademicProfile) return 'profile-required';
    if (activeAcademicProfile.required.includes(code)) return 'required';
    if (activeAcademicProfile.allowed.includes(code)) return 'optional';
    return 'outside';
  };

  const removeAcademicPermissions = (permissionSet: Set<string>) => {
    const { idToCode } = getPermissionMaps(permissionModules);
    Array.from(permissionSet).forEach((permissionId) => {
      const selectedCode = idToCode.get(permissionId);
      if (selectedCode && ACADEMIC_PERMISSION_CODES.has(selectedCode)) {
        permissionSet.delete(permissionId);
      }
    });
  };

  // Toggle permission
  const togglePermission = (permission: PermissionWithCode) => {
    const code = getPermissionCode(permission);
    const isAcademicPermission = ACADEMIC_PERMISSION_CODES.has(code);

    if (
      isAcademicPermission &&
      !activeAcademicProfile &&
      !selectedPermissions.has(permission.id)
    ) {
      toast.warning('Selecciona un perfil de Registro Académico', {
        description: 'Primero elige Jefe, Aprobador o Revisor. Luego puedes marcar los opcionales de ese perfil.',
      });
      return;
    }

    if (
      activeAcademicProfile &&
      isAcademicPermission &&
      !activeAcademicProfile.allowed.includes(code) &&
      !selectedPermissions.has(permission.id)
    ) {
      toast.warning('Permiso fuera del perfil', {
        description: `Ese permiso no hace parte del máximo permitido para ${activeAcademicProfile.label}. Selecciona otro perfil que lo permita.`,
      });
      return;
    }

    const newPermissions = new Set(selectedPermissions);
    if (newPermissions.has(permission.id)) {
      newPermissions.delete(permission.id);
      if (activeAcademicProfile?.required.includes(code)) {
        removeAcademicPermissions(newPermissions);
        setActiveAcademicProfileId(null);
        toast.warning('Permiso necesario', {
          description: `Ese permiso es necesario para ser ${activeAcademicProfile.label}. Al quitarlo se desmarca el perfil y se retiran los permisos de Registro Académico.`,
        });
      }
    } else {
      newPermissions.add(permission.id);
    }
    setSelectedPermissions(newPermissions);
    setHasChanges(true);
  };

  // Toggle all permissions in module
  const toggleModulePermissions = (modulePermissions: PermissionWithCode[]) => {
    const isAcademicPermission = (permission: PermissionWithCode) =>
      ACADEMIC_PERMISSION_CODES.has(getPermissionCode(permission));
    const academicPermissions = modulePermissions.filter(isAcademicPermission);
    const selectedAcademicPermissions = academicPermissions.filter((permission) =>
      selectedPermissions.has(permission.id),
    );
    const toggleablePermissions =
      activeAcademicProfile
        ? modulePermissions.filter((permission) => {
            const code = getPermissionCode(permission);
            return (
              !ACADEMIC_PERMISSION_CODES.has(code) ||
              activeAcademicProfile.allowed.includes(code)
            );
          })
        : modulePermissions.filter((permission) => !isAcademicPermission(permission));
    const blockedAcademicCount = activeAcademicProfile
      ? modulePermissions.length - toggleablePermissions.length
      : academicPermissions.length;

    if (!activeAcademicProfile && academicPermissions.length > 0 && toggleablePermissions.length === 0) {
      if (selectedAcademicPermissions.length > 0) {
        const newPermissions = new Set(selectedPermissions);
        selectedAcademicPermissions.forEach((permission) => newPermissions.delete(permission.id));
        setSelectedPermissions(newPermissions);
        setHasChanges(true);
        toast.info('Permisos de Registro Académico retirados', {
          description: 'Para volver a asignarlos, selecciona primero Jefe, Aprobador o Revisor.',
        });
        return;
      }

      toast.warning('Selecciona un perfil de Registro Académico', {
        description: 'Primero elige Jefe, Aprobador o Revisor para marcar permisos de este módulo.',
      });
      return;
    }

    if (activeAcademicProfile && toggleablePermissions.length === 0 && blockedAcademicCount > 0) {
      toast.warning('Permisos fuera del perfil', {
        description: `Este módulo no tiene permisos disponibles para ${activeAcademicProfile.label}.`,
      });
      return;
    }

    const modulePermissionIds = toggleablePermissions.map(p => p.id);
    const allSelected = modulePermissionIds.every(id => selectedPermissions.has(id));
    
    const newPermissions = new Set(selectedPermissions);
    if (allSelected) {
      modulePermissionIds.forEach(id => newPermissions.delete(id));
      if (
        activeAcademicProfile &&
        toggleablePermissions.some((permission) =>
          activeAcademicProfile.required.includes(getPermissionCode(permission)),
        )
      ) {
        removeAcademicPermissions(newPermissions);
        setActiveAcademicProfileId(null);
        toast.warning('Perfil desmarcado', {
          description: `Quitaste permisos necesarios para ser ${activeAcademicProfile.label}. Se retiraron los permisos de Registro Académico.`,
        });
      }
    } else {
      modulePermissionIds.forEach(id => newPermissions.add(id));
      if (blockedAcademicCount > 0) {
        toast.info(activeAcademicProfile ? 'Permisos fuera del perfil omitidos' : 'Permisos académicos omitidos', {
          description: activeAcademicProfile
            ? `No se marcaron ${blockedAcademicCount} permisos fuera del máximo de ${activeAcademicProfile.label}.`
            : `No se marcaron ${blockedAcademicCount} permisos de Registro Académico porque requieren Jefe, Aprobador o Revisor.`,
        });
      }
    }
    setSelectedPermissions(newPermissions);
    setHasChanges(true);
  };

  const applyAcademicProfile = (profile: AcademicProfile) => {
    const { idToCode, codeToId } = getPermissionMaps(permissionModules);
    const newPermissions = new Set(selectedPermissions);

    if (activeAcademicProfile?.id === profile.id) {
      removeAcademicPermissions(newPermissions);
      setActiveAcademicProfileId(null);
      toast.info(`${profile.label} desmarcado`, {
        description: 'Se retiraron los permisos de Registro Académico. Selecciona otro perfil para volver a asignarlos.',
      });
    } else {
      Array.from(newPermissions).forEach((permissionId) => {
        const code = idToCode.get(permissionId);
        if (code && ACADEMIC_PERMISSION_CODES.has(code)) {
          newPermissions.delete(permissionId);
        }
      });

      profile.required.forEach((code) => {
        const permissionId = codeToId.get(code);
        if (permissionId) newPermissions.add(permissionId);
      });
      setActiveAcademicProfileId(profile.id);

      toast.success(`${profile.label} seleccionado`, {
        description: 'Se aplicaron los permisos necesarios; los opcionales quedan disponibles para elegir.',
      });
    }

    setSelectedPermissions(newPermissions);
    setHasChanges(true);
  };

  // Marcar todos los permisos (perfil Jefe para Registro Académico)
  const handleSelectAll = () => {
    const { permissions: allIds, academicProfile } = selectAllPermissions(permissionModules);
    setSelectedPermissions(allIds);
    setActiveAcademicProfileId(academicProfile);
    setHasChanges(true);
    toast.success('Todos los permisos marcados', {
      description: 'Se seleccionaron todos los permisos. Perfil "Jefe" aplicado para Registro Académico.',
    });
  };

  // Save permissions
  const handleSave = async () => {
    if (selectedPermissions.size === 0) {
      toast.warning('Sin permisos asignados', {
        description: 'Debes asignar al menos un permiso al rol antes de guardar.',
      });
      return;
    }
    try {
      setIsSaving(true);
      await rolesService.updateRolePermissions(role.id, Array.from(selectedPermissions));
      toast.success('Permisos Guardados', {
        description: `Se actualizaron ${selectedPermissions.size} permisos para el rol "${role.name}"`
      });
      setHasChanges(false);
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Error al guardar permisos', {
        description: 'No se pudieron guardar los permisos del rol'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset permissions
  const handleReset = () => {
    setSelectedPermissions(new Set());
    setActiveAcademicProfileId(null);
    setHasChanges(selectedPermissions.size > 0);
    toast.info('Permisos limpiados', {
      description: 'Recuerda asignar al menos un permiso antes de guardar.',
    });
  };

  // Filter modules
  const filteredModules = permissionModules.filter(module =>
    module.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    module.permissions.some(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const totalPermissions = permissionModules.reduce((acc, m) => acc + m.permissions.length, 0);
  const selectedCount = selectedPermissions.size;
  const progressPercent = totalPermissions > 0 ? (selectedCount / totalPermissions) * 100 : 0;
  const firstAcademicModuleId = filteredModules.find((module) =>
    module.permissions.some((permission) =>
      ACADEMIC_PERMISSION_CODES.has(getPermissionCode(permission)),
    ),
  )?.id;

  const renderAcademicProfileSelector = () => (
    <div className="rounded-xl border-2 border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-slate-900">
            Perfil de Registro Académico
          </p>
          <p className="text-xs font-semibold text-slate-500">
            {activeAcademicProfile
              ? `${activeAcademicProfile.label} activo`
              : 'Sin perfil activo'}
          </p>
        </div>
        {activeAcademicProfile && (
          <Badge className="bg-green-100 text-green-700 border border-green-200">
            {activeAcademicProfile.required.length} necesarios
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {ACADEMIC_PROFILES.map((profile) => {
          const isActive = activeAcademicProfile?.id === profile.id;
          const optionalCount = profile.allowed.length - profile.required.length;

          return (
            <button
              key={profile.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => applyAcademicProfile(profile)}
              className={`min-h-[72px] rounded-lg border-2 p-3 text-left transition-all ${
                isActive
                  ? 'border-green-400 bg-green-50 shadow-sm'
                  : 'border-slate-200 bg-slate-50 hover:border-[#1e5da8] hover:bg-white'
              }`}
            >
              <div className="flex items-start gap-2">
                <span
                  className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border ${
                    isActive
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-slate-300 bg-white text-transparent'
                  }`}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold text-slate-900">
                    {profile.label}
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-slate-500">
                    {profile.required.length} necesarios / {optionalCount} opcionales
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold text-[--esap-gray-900] flex items-center gap-3">
            <Shield className="w-7 h-7" style={{ color: role.color }} />
            Permisos: {role.name}
          </DialogTitle>
          <DialogDescription className="text-base font-medium">
            Selecciona los permisos específicos que tendrá este rol en cada módulo del sistema
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-900">
              Permisos Asignados
            </span>
            <Badge className="bg-[#1e5da8] text-white font-bold">
              {selectedCount} / {totalPermissions}
            </Badge>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              className="h-full bg-gradient-to-r from-[#1e5da8] to-blue-600"
            />
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar permisos por módulo o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 border-2 border-gray-300 focus:border-[#1e5da8] font-medium"
            />
          </div>
        </div>

        {/* Permissions List */}
        <div className="flex-1 overflow-y-auto px-6 space-y-4">
          {permissionsLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-500">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Cargando permisos...
            </div>
          ) : (
            filteredModules.map((module) => {
              const Icon = resolveIcon(module.icon);
              const modulePermissions = module.permissions;
              const modulePermissionsGroups = module.permissionGroups || [];  
              const enabledCount = modulePermissions.filter(p => 
                selectedPermissions.has(p.id)
              ).length;
              const allSelected = enabledCount === modulePermissions.length;
              const someSelected = enabledCount > 0 && enabledCount < modulePermissions.length;

              return (
                <Fragment key={module.id}>
                  {module.id === firstAcademicModuleId && renderAcademicProfileSelector()}
                  <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-5 border-2 border-gray-200 hover:border-[#1e5da8] transition-all"
                >
                  {/* Module Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${module.bgColor}`}>
                        <Icon className={`w-5 h-5 ${module.color}`} strokeWidth={2} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-[--esap-gray-900]">{module.name}</h3>
                        <p className="text-xs font-medium text-[--esap-gray-600]">
                          {enabledCount}/{modulePermissions.length} permisos activos
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleModulePermissions(modulePermissions)}
                      className={`p-2 rounded-lg transition-all ${
                        allSelected
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : someSelected
                          ? 'bg-amber-500 text-white hover:bg-amber-600'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                      title={allSelected ? 'Desmarcar todo' : 'Marcar todo'}
                    >
                      {allSelected ? (
                        <CheckCircle className="w-5 h-5" strokeWidth={2} />
                      ) : someSelected ? (
                        <MinusCircle className="w-5 h-5" strokeWidth={2} />
                      ) : (
                        <Circle className="w-5 h-5" strokeWidth={2} />
                      )}
                    </button>
                  </div>

                  {/* Permissions */}
                  {modulePermissionsGroups.length > 0 ? (
                    <div className="space-y-4">
                      {modulePermissionsGroups.map((permissionGroup) => (
                        <div key={permissionGroup.group} className="space-y-2">
                          <p className="text-md font-bold text-gray-800" style={{ margin: 0 }}>
                            {formatGroupName(permissionGroup.group)}
                          </p>
                          <hr></hr>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 px-3">
                            {permissionGroup.permissions.map((permission) => {
                              const isEnabled = selectedPermissions.has(permission.id);
                              const academicState = getPermissionAcademicState(permission);
                              const isBlockedByProfile =
                                (academicState === 'outside' || academicState === 'profile-required') && !isEnabled;
                              const inactiveClass =
                                academicState === 'optional'
                                  ? 'bg-slate-50 border-slate-300 hover:border-slate-400 hover:bg-slate-100'
                                  : academicState === 'outside'
                                    ? 'bg-amber-50 border-amber-200 opacity-75 cursor-not-allowed'
                                    : academicState === 'profile-required'
                                      ? 'bg-slate-50 border-slate-200 opacity-75 cursor-not-allowed'
                                      : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-gray-100';
                              return (
                                <button
                                  key={permission.id}
                                  type="button"
                                  disabled={isBlockedByProfile}
                                  title={
                                    academicState === 'profile-required'
                                      ? 'Selecciona Jefe, Aprobador o Revisor para habilitar permisos de Registro Académico'
                                      : academicState === 'outside'
                                        ? `Permiso fuera del máximo de ${activeAcademicProfile?.label}`
                                        : undefined
                                  }
                                  onClick={() => togglePermission(permission)}
                                  className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                                    isEnabled
                                      ? 'bg-green-50 border-green-300 hover:bg-green-100'
                                      : inactiveClass
                                  }`}
                                >
                                  <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                    isEnabled ? 'bg-green-500' : 'bg-gray-300'
                                  }`}>
                                    {isEnabled && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <p className="font-bold text-sm text-[--esap-gray-900]">{permission.name}</p>
                                      {academicState === 'required' && (
                                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-normal text-green-700">
                                          Necesario
                                        </span>
                                      )}
                                      {academicState === 'optional' && (
                                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-normal text-slate-600">
                                          Opcional
                                        </span>
                                      )}
                                      {academicState === 'outside' && (
                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-normal text-amber-700">
                                          Fuera del perfil
                                        </span>
                                      )}
                                      {academicState === 'profile-required' && (
                                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-normal text-slate-600">
                                          Requiere perfil
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs font-medium text-[--esap-gray-600] mt-0.5">
                                      {permission.description}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) :(
                  <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {modulePermissions.map((permission) => {
                      const isEnabled = selectedPermissions.has(permission.id);
                      const academicState = getPermissionAcademicState(permission);
                      const isBlockedByProfile =
                        (academicState === 'outside' || academicState === 'profile-required') && !isEnabled;
                      const inactiveClass =
                        academicState === 'optional'
                          ? 'bg-slate-50 border-slate-300 hover:border-slate-400 hover:bg-slate-100'
                          : academicState === 'outside'
                            ? 'bg-amber-50 border-amber-200 opacity-75 cursor-not-allowed'
                            : academicState === 'profile-required'
                              ? 'bg-slate-50 border-slate-200 opacity-75 cursor-not-allowed'
                              : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-gray-100';

                      return (
                        <button
                          key={permission.id}
                          type="button"
                          disabled={isBlockedByProfile}
                          title={
                            academicState === 'profile-required'
                              ? 'Selecciona Jefe, Aprobador o Revisor para habilitar permisos de Registro Académico'
                              : academicState === 'outside'
                                ? `Permiso fuera del máximo de ${activeAcademicProfile?.label}`
                                : undefined
                          }
                          onClick={() => togglePermission(permission)}
                          className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                            isEnabled
                              ? 'bg-green-50 border-green-300 hover:bg-green-100'
                              : inactiveClass
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isEnabled ? 'bg-green-500' : 'bg-gray-300'
                          }`}>
                            {isEnabled && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="font-bold text-sm text-[--esap-gray-900]">{permission.name}</p>
                              {academicState === 'required' && (
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-normal text-green-700">
                                  Necesario
                                </span>
                              )}
                              {academicState === 'optional' && (
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-normal text-slate-600">
                                  Opcional
                                </span>
                              )}
                              {academicState === 'outside' && (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-normal text-amber-700">
                                  Fuera del perfil
                                </span>
                              )}
                              {academicState === 'profile-required' && (
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-normal text-slate-600">
                                  Requiere perfil
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-medium text-[--esap-gray-600] mt-0.5">
                              {permission.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  </>
                  )}
                  </motion.div>
                </Fragment>
              );
            })
          )}
        </div>

        {/* Actions Footer */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex-1 sm:flex-none font-bold border-2 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Limpiar Todo
              </Button>
              <Button
                variant="outline"
                onClick={handleSelectAll}
                className="flex-1 sm:flex-none font-bold border-2 border-green-400 text-green-700 hover:bg-green-50 hover:border-green-500"
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Marcar Todo
              </Button>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 sm:flex-none font-bold border-2"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="flex-1 sm:flex-none bg-gradient-to-r from-[#1e5da8] to-blue-600 hover:from-[#1a4d8a] hover:to-blue-700 text-white font-bold shadow-lg disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Permisos
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
