/**
 * PortalSettings - Panel de configuración del portal (Legacy PTA)
 */

import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Sun,
  Moon,
  Monitor,
  Type,
  Eye,
  BellRing,
  Shield,
  Clock,
  Check,
  Palette,
  Accessibility,
  Volume2,
  VolumeX,
  Mail,
  Save,
  RotateCcw,
  Minus,
  Plus,
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface PortalSettingsProps {
  userName: string;
  userEmail: string;
  onBack: () => void;
}

type SettingsTab = 'apariencia' | 'accesibilidad' | 'notificaciones' | 'sesion';

interface SettingsState {
  fontSize: number;
  colorScheme: 'light' | 'dark' | 'system';
  compactMode: boolean;
  animationsEnabled: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  focusIndicators: boolean;
  screenReaderMode: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  soundEnabled: boolean;
  notifyDocuments: boolean;
  notifyCertificates: boolean;
  notifySystem: boolean;
  digestFrequency: 'realtime' | 'daily' | 'weekly';
  sessionTimeout: number;
  rememberSession: boolean;
  showActivityStatus: boolean;
}

const DEFAULT_SETTINGS: SettingsState = {
  fontSize: 15,
  colorScheme: 'light',
  compactMode: false,
  animationsEnabled: true,
  highContrast: false,
  reducedMotion: false,
  focusIndicators: true,
  screenReaderMode: false,
  emailNotifications: true,
  pushNotifications: true,
  soundEnabled: true,
  notifyDocuments: true,
  notifyCertificates: true,
  notifySystem: true,
  digestFrequency: 'realtime',
  sessionTimeout: 15,
  rememberSession: true,
  showActivityStatus: true,
};

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'apariencia', label: 'Apariencia', icon: <Palette style={{ width: 18, height: 18 }} />, desc: 'Tema, tamaño de fuente y diseño' },
  { id: 'accesibilidad', label: 'Accesibilidad', icon: <Accessibility style={{ width: 18, height: 18 }} />, desc: 'Contraste, movimiento y asistencia' },
  { id: 'notificaciones', label: 'Notificaciones', icon: <BellRing style={{ width: 18, height: 18 }} />, desc: 'Alertas, correos y preferencias' },
  { id: 'sesion', label: 'Sesión y Seguridad', icon: <Shield style={{ width: 18, height: 18 }} />, desc: 'Timeout, actividad y privacidad' },
];

function loadSettings(): SettingsState {
  try {
    const saved = localStorage.getItem('esap-portal-settings');
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: SettingsState) {
  localStorage.setItem('esap-portal-settings', JSON.stringify(settings));
}

export function PortalSettings({ userName, userEmail, onBack }: PortalSettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('apariencia');
  const [settings, setSettings] = useState<SettingsState>(loadSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedSettings, setSavedSettings] = useState<SettingsState>(loadSettings);

  useEffect(() => {
    setHasChanges(JSON.stringify(settings) !== JSON.stringify(savedSettings));
  }, [settings, savedSettings]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${settings.fontSize}px`;
    localStorage.setItem('esap-font-size-preference', `${settings.fontSize}px`);
  }, [settings.fontSize]);

  useEffect(() => {
    if (settings.reducedMotion) {
      document.documentElement.style.setProperty('--animation-duration', '0.01ms');
    } else {
      document.documentElement.style.setProperty('--animation-duration', '300ms');
    }
  }, [settings.reducedMotion]);

  useEffect(() => {
    if (settings.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [settings.highContrast]);

  const handleSave = () => {
    saveSettings(settings);
    setSavedSettings(settings);
    toast.success('Configuración guardada');
  };

  const handleReset = () => {
    setSettings(loadSettings());
    toast.info('Configuración restaurada');
  };

  const SettingRow = ({
    title,
    desc,
    right,
  }: {
    title: string;
    desc: string;
    right: React.ReactNode;
  }) => (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-gray-100 last:border-0">
      <div>
        <div className="text-[14px] font-black text-gray-900">{title}</div>
        <div className="text-[12px] text-gray-500 mt-0.5">{desc}</div>
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4 text-gray-700" />
        </button>
        <div className="flex-1">
          <div className="text-[18px] font-black text-gray-900 tracking-tight">Configuración</div>
          <div className="text-[12px] text-gray-500">Preferencias del portal para {userName}</div>
        </div>
        {hasChanges && (
          <button
            onClick={handleSave}
            className="h-10 px-4 rounded-xl bg-[#003DA5] hover:bg-[#002868] text-white text-sm font-bold flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Guardar
          </button>
        )}
        <button
          onClick={handleReset}
          className="h-10 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-bold text-gray-700 flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" /> Restablecer
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === t.id ? 'bg-[#003DA5] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="text-[16px] font-black text-gray-900">{TABS.find((t) => t.id === activeTab)?.label}</div>
          <div className="text-[12px] text-gray-500 mt-1">{TABS.find((t) => t.id === activeTab)?.desc}</div>
        </div>

        <div className="p-6">
          {activeTab === 'apariencia' && (
            <div>
              <SettingRow
                title="Tema"
                desc="Selecciona esquema de color"
                right={
                  <div className="flex items-center gap-1">
                    {(['light', 'dark', 'system'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setSettings((s) => ({ ...s, colorScheme: mode }))}
                        className={`h-10 px-3 rounded-xl border text-sm font-bold flex items-center gap-2 ${
                          settings.colorScheme === mode
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {mode === 'light' ? <Sun className="w-4 h-4" /> : mode === 'dark' ? <Moon className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                        {mode === 'light' ? 'Claro' : mode === 'dark' ? 'Oscuro' : 'Sistema'}
                      </button>
                    ))}
                  </div>
                }
              />

              <SettingRow
                title="Tamaño de fuente"
                desc="Ajusta legibilidad (13–19)"
                right={
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSettings((s) => ({ ...s, fontSize: Math.max(13, s.fontSize - 1) }))}
                      className="w-10 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="min-w-[44px] text-center text-sm font-black text-gray-900">{settings.fontSize}</div>
                    <button
                      onClick={() => setSettings((s) => ({ ...s, fontSize: Math.min(19, s.fontSize + 1) }))}
                      className="w-10 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                }
              />

              <SettingRow
                title="Modo compacto"
                desc="Reduce espacios y densidad visual"
                right={
                  <button
                    onClick={() => setSettings((s) => ({ ...s, compactMode: !s.compactMode }))}
                    className={`h-10 px-3 rounded-xl border text-sm font-bold ${
                      settings.compactMode ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {settings.compactMode ? 'Activo' : 'Inactivo'}
                  </button>
                }
              />

              <SettingRow
                title="Animaciones"
                desc="Habilita transiciones y micro-interacciones"
                right={
                  <button
                    onClick={() => setSettings((s) => ({ ...s, animationsEnabled: !s.animationsEnabled }))}
                    className={`h-10 px-3 rounded-xl border text-sm font-bold ${
                      settings.animationsEnabled ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {settings.animationsEnabled ? 'Activo' : 'Inactivo'}
                  </button>
                }
              />
            </div>
          )}

          {activeTab === 'accesibilidad' && (
            <div>
              <SettingRow
                title="Alto contraste"
                desc="Mejora visibilidad en pantallas"
                right={
                  <button
                    onClick={() => setSettings((s) => ({ ...s, highContrast: !s.highContrast }))}
                    className={`h-10 px-3 rounded-xl border text-sm font-bold ${
                      settings.highContrast ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {settings.highContrast ? <Check className="w-4 h-4 inline-block mr-1" /> : null}
                    {settings.highContrast ? 'Activado' : 'Desactivado'}
                  </button>
                }
              />
              <SettingRow
                title="Reducir movimiento"
                desc="Minimiza animaciones"
                right={
                  <button
                    onClick={() => setSettings((s) => ({ ...s, reducedMotion: !s.reducedMotion }))}
                    className={`h-10 px-3 rounded-xl border text-sm font-bold ${
                      settings.reducedMotion ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {settings.reducedMotion ? 'Activado' : 'Desactivado'}
                  </button>
                }
              />
              <SettingRow
                title="Indicadores de foco"
                desc="Resalta elementos al navegar con teclado"
                right={
                  <button
                    onClick={() => setSettings((s) => ({ ...s, focusIndicators: !s.focusIndicators }))}
                    className={`h-10 px-3 rounded-xl border text-sm font-bold ${
                      settings.focusIndicators ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {settings.focusIndicators ? 'Activado' : 'Desactivado'}
                  </button>
                }
              />
              <SettingRow
                title="Modo lector"
                desc="Mejor compatibilidad con lectores de pantalla"
                right={
                  <button
                    onClick={() => setSettings((s) => ({ ...s, screenReaderMode: !s.screenReaderMode }))}
                    className={`h-10 px-3 rounded-xl border text-sm font-bold ${
                      settings.screenReaderMode ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {settings.screenReaderMode ? 'Activado' : 'Desactivado'}
                  </button>
                }
              />
            </div>
          )}

          {activeTab === 'notificaciones' && (
            <div>
              <SettingRow
                title="Notificaciones por correo"
                desc="Recibe alertas en tu email"
                right={
                  <button
                    onClick={() => setSettings((s) => ({ ...s, emailNotifications: !s.emailNotifications }))}
                    className={`h-10 px-3 rounded-xl border text-sm font-bold ${
                      settings.emailNotifications ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Mail className="w-4 h-4 inline-block mr-2" />
                    {settings.emailNotifications ? 'Activado' : 'Desactivado'}
                  </button>
                }
              />
              <SettingRow
                title="Sonidos"
                desc="Activa sonidos de notificación"
                right={
                  <button
                    onClick={() => setSettings((s) => ({ ...s, soundEnabled: !s.soundEnabled }))}
                    className={`h-10 px-3 rounded-xl border text-sm font-bold ${
                      settings.soundEnabled ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {settings.soundEnabled ? <Volume2 className="w-4 h-4 inline-block mr-2" /> : <VolumeX className="w-4 h-4 inline-block mr-2" />}
                    {settings.soundEnabled ? 'Activado' : 'Desactivado'}
                  </button>
                }
              />
            </div>
          )}

          {activeTab === 'sesion' && (
            <div>
              <SettingRow
                title="Timeout de sesión"
                desc="Minutos de inactividad antes de cerrar sesión"
                right={
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <div className="text-sm font-black text-gray-900">{settings.sessionTimeout} min</div>
                  </div>
                }
              />
              <SettingRow
                title="Recordar sesión"
                desc="Mantén sesión iniciada en este dispositivo"
                right={
                  <button
                    onClick={() => setSettings((s) => ({ ...s, rememberSession: !s.rememberSession }))}
                    className={`h-10 px-3 rounded-xl border text-sm font-bold ${
                      settings.rememberSession ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {settings.rememberSession ? 'Activado' : 'Desactivado'}
                  </button>
                }
              />
              <SettingRow
                title="Estado de actividad"
                desc="Mostrar estado en el portal"
                right={
                  <button
                    onClick={() => setSettings((s) => ({ ...s, showActivityStatus: !s.showActivityStatus }))}
                    className={`h-10 px-3 rounded-xl border text-sm font-bold ${
                      settings.showActivityStatus ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {settings.showActivityStatus ? 'Activado' : 'Desactivado'}
                  </button>
                }
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-400">
        Preferencias guardadas localmente. Email: <span className="font-mono">{userEmail}</span>
      </div>
    </motion.div>
  );
}

