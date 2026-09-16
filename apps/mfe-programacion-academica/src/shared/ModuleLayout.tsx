import { ReactNode, useEffect, useState } from 'react';
import { ChevronLeft, Menu, X } from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  subtitle?: string;
  icon: ReactNode;
  badge?: number;
  color?: string;
  visible?: boolean;
  disabled?: boolean;
  tag?: string;
}

export interface MenuGroup {
  title?: string;
  items: MenuItem[];
}

interface Props {
  moduleName: string;
  moduleDescription?: string;
  moduleIcon: ReactNode;
  moduleColor?: string;
  groups: MenuGroup[];
  activeSection: string;
  onSectionChange: (section: string) => void;
  children: ReactNode;
}

export function ModuleLayout({
  moduleName,
  moduleDescription,
  moduleIcon,
  moduleColor = '#003DA5',
  groups,
  activeSection,
  onSectionChange,
  children,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ancho, setAncho] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1280,
  );

  useEffect(() => {
    const alCambiar = () => setAncho(window.innerWidth);
    window.addEventListener('resize', alCambiar);
    return () => window.removeEventListener('resize', alCambiar);
  }, []);

  const esMovil = ancho < 1024;

  const navegar = (id: string) => {
    onSectionChange(id);
    setMobileOpen(false);
  };

  const pintarItem = (item: MenuItem, compacto: boolean) => {
    if (item.visible === false) return null;

    const activo = activeSection === item.id;
    const color = item.color ?? moduleColor;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => !item.disabled && navegar(item.id)}
        disabled={item.disabled}
        title={compacto ? `${item.label}${item.subtitle ? ` — ${item.subtitle}` : ''}` : undefined}
        aria-current={activo ? 'page' : undefined}
        className={`w-full rounded-xl relative text-left transition-colors
          ${compacto ? 'p-2.5 flex justify-center' : 'px-3 py-2.5'}
          ${item.disabled ? 'cursor-not-allowed opacity-45' : 'hover:bg-slate-50'}
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1`}
        style={{
          background: activo ? `${color}15` : 'transparent',
          color: activo ? color : '#6B7280',
        }}
      >
        {compacto ? (
          <span className="flex-shrink-0">{item.icon}</span>
        ) : (
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg transition-transform flex-shrink-0"
              style={{
                background: activo ? `${color}20` : '#F3F4F6',
                color: activo ? color : '#9CA3AF',
              }}
            >
              {item.icon}
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center justify-between gap-1">
                <span className="text-sm font-semibold truncate leading-tight">
                  {item.label}
                </span>
                {item.tag && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex-shrink-0"
                    style={{ background: `${color}20`, color }}
                  >
                    {item.tag}
                  </span>
                )}
              </div>
              {item.subtitle && (
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {item.subtitle}
                </p>
              )}
            </div>
            {typeof item.badge === 'number' && item.badge > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-bold text-white flex-shrink-0"
                style={{ backgroundColor: color }}
              >
                {item.badge}
              </span>
            )}
          </div>
        )}
      </button>
    );
  };

  const pintarMenu = (compacto: boolean) => (
    <div className="space-y-4">
      {groups.map((grupo, idx) => (
        <div key={grupo.title ?? idx} className="space-y-1">
          {grupo.title && !compacto && (
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-1 block">
              {grupo.title}
            </span>
          )}
          {grupo.items.map((item) => pintarItem(item, compacto))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      {/* Botón flotante para móvil */}
      {esMovil && (
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg text-white"
              style={{ backgroundColor: moduleColor }}
            >
              {moduleIcon}
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-sm">{moduleName}</h1>
              {moduleDescription && (
                <p className="text-xs text-slate-500">{moduleDescription}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
            aria-label="Abrir menú de viáticos"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar escritorio */}
        {!esMovil && (
          <aside
            className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-300 relative z-20 ${
              collapsed ? 'w-16' : 'w-64'
            }`}
          >
            {/* Cabecera del módulo */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
              {!collapsed && (
                <div className="flex items-center gap-3 overflow-hidden">
                  <div
                    className="p-2.5 rounded-xl text-white shadow-sm flex-shrink-0"
                    style={{ backgroundColor: moduleColor }}
                  >
                    {moduleIcon}
                  </div>
                  <div className="truncate">
                    <h2 className="font-bold text-slate-800 text-sm tracking-tight truncate">
                      {moduleName}
                    </h2>
                    {moduleDescription && (
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {moduleDescription}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {collapsed && (
                <div
                  className="p-2.5 rounded-xl text-white shadow-sm mx-auto"
                  style={{ backgroundColor: moduleColor }}
                >
                  {moduleIcon}
                </div>
              )}
              <button
                type="button"
                onClick={() => setCollapsed(!collapsed)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
                title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
              >
                <ChevronLeft
                  className={`w-4 h-4 transition-transform duration-300 ${
                    collapsed ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {/* Lista de navegación */}
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
              {pintarMenu(collapsed)}
            </div>
          </aside>
        )}

        {/* Sidebar móvil en Overlay */}
        {esMovil && mobileOpen && (
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40"
            onClick={() => setMobileOpen(false)}
          >
            <div
              className="w-72 bg-white h-full shadow-2xl p-4 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg text-white"
                    style={{ backgroundColor: moduleColor }}
                  >
                    {moduleIcon}
                  </div>
                  <span className="font-bold text-slate-800">{moduleName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {pintarMenu(false)}
            </div>
          </div>
        )}

        {/* Contenido principal del módulo */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
