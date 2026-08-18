/**
 * LAYOUT UNIFICADO PARA MÓDULOS
 * Mismo patrón que Gestión Legal, Control Interno y Control Disciplinario:
 * sub-sidebar colapsable con los submódulos y contenido a la derecha.
 *
 * Diferencia con las otras copias: las transiciones van con CSS en vez de
 * `motion/react`, que no está declarado en ningún package.json — hoy resuelve
 * por hoisting y se rompe cuando el árbol de dependencias cambia.
 */

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
  /** Aún sin backend: se ve en gris y no navega. */
  disabled?: boolean;
  /** Etiqueta corta a la derecha (ej. "Próx."). */
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

  // El shell oculta su sidebar bajo 1024px; el del módulo hace lo mismo.
  const esMovil = ancho < 1024;

  // Un sub-menú de 230px para una sola opción cuesta más de lo que aporta: el
  // shell ya ocupa 260px a la izquierda y en un portátil de 1366px el contenido
  // se queda sin aire. Con una sola sección navegable se muestra solo la barra
  // de identidad del módulo y el contenido ocupa todo el ancho. Cuando haya dos
  // o más, el sub-menú vuelve solo.
  const navegables = groups
    .flatMap((g) => g.items)
    .filter((i) => i.visible !== false && !i.disabled);
  const conSubmenu = navegables.length > 1;

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
        title={item.subtitle ? `${item.label} — ${item.subtitle}` : item.label}
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
          // Una línea por opción: el subtítulo repetía el nombre con otras
          // palabras —«Procesos» / «Procesos contractuales»— y doblaba el alto
          // de cada entrada para no añadir nada. Queda en el `title`, para
          // quien no reconozca la opción por el nombre.
          <div className="flex items-center gap-3">
            <span className="flex-shrink-0">{item.icon}</span>
            <span className="min-w-0 flex-1 font-semibold text-[13px] leading-tight truncate">
              {item.label}
            </span>
            {item.tag && (
              <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wide text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                {item.tag}
              </span>
            )}
            {item.badge !== undefined && item.badge > 0 && (
              <span
                className="flex-shrink-0 text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full tabular-nums"
                style={{ background: color }}
              >
                {item.badge}
              </span>
            )}
          </div>
        )}

        {activo && (
          <span
            className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full"
            style={{ background: color }}
          />
        )}
      </button>
    );
  };

  const navegacion = (compacto: boolean) => (
    <nav className="flex-1 overflow-y-auto px-2 py-2.5">
      {groups.map((grupo, idx) => {
        const visibles = grupo.items.filter((i) => i.visible !== false);
        if (visibles.length === 0) return null;
        return (
          <div key={grupo.title ?? idx} className={idx > 0 ? 'mt-4' : ''}>
            {grupo.title && !compacto && (
              <p className="px-3 mb-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400 m-0">
                {grupo.title}
              </p>
            )}
            {grupo.title && compacto && idx > 0 && (
              <div className="mx-2 mb-2 border-t border-gray-100" />
            )}
            <div className="space-y-0.5">
              {visibles.map((item) => pintarItem(item, compacto))}
            </div>
          </div>
        );
      })}
    </nav>
  );

  // Barra de identidad para cuando no hay sub-menú: sin ella el módulo perdería
  // su nombre y su icono al entrar, que es lo único que el sidebar aportaba.
  const barraIdentidad = (
    <div className="bg-white border-b-2 border-gray-200 px-4 md:px-6 py-3 flex items-center gap-3">
      <div className="p-2 rounded-xl flex-shrink-0" style={{ background: `${moduleColor}15` }}>
        <span style={{ color: moduleColor }}>{moduleIcon}</span>
      </div>
      <div className="min-w-0">
        <h2 className="font-black text-sm leading-tight m-0 truncate" style={{ color: moduleColor }}>
          {moduleName}
        </h2>
        {moduleDescription && (
          <p className="text-[11px] text-gray-400 m-0 leading-tight mt-0.5 truncate">
            {moduleDescription}
          </p>
        )}
      </div>
    </div>
  );

  if (!conSubmenu) {
    return (
      /* overflow-x-auto y no -hidden: si algo llegara a desbordar, se puede
         desplazar hasta ello. Recortarlo dejaba campos del formulario
         inalcanzables, que es peor que una barra de desplazamiento. */
      <div
        className="w-full min-w-0 overflow-x-auto -m-3 md:-m-4"
        style={{ background: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}
      >
        {barraIdentidad}
        {/* Más aire que la rama con sub-menú: allí el sidebar ya separaba el
            contenido del borde; aquí el contenido llega hasta él. */}
        <div className="p-4 md:p-6 min-w-0">{children}</div>
      </div>
    );
  }

  return (
    // -m-3/-m-4 anula el padding que el shell aplica al contenedor del módulo:
    // sin esto el sub-sidebar queda flotando con margen blanco alrededor en vez
    // de pegarse al borde, como sí lo hace el de Gestión Legal.
    <div
      className="flex w-full min-w-0 -m-3 md:-m-4"
      style={{ background: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}
    >
      {/* Sidebar móvil */}
      {esMovil && mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed left-0 top-0 bottom-0 w-[280px] bg-white z-50 flex flex-col border-r-2 border-gray-200">
            <div className="p-4 border-b-2 border-gray-200 flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: `${moduleColor}15` }}>
                <span style={{ color: moduleColor }}>{moduleIcon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-black text-sm leading-tight m-0" style={{ color: moduleColor }}>
                  {moduleName}
                </h2>
                {moduleDescription && (
                  <p className="text-xs text-gray-400 m-0 truncate">{moduleDescription}</p>
                )}
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100"
                style={{ color: moduleColor }}
                aria-label="Cerrar menú"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {navegacion(false)}
          </aside>
        </>
      )}

      {/* Sidebar escritorio */}
      <aside
        className="hidden lg:flex flex-shrink-0 border-r border-gray-200 bg-white flex-col relative"
        style={{
          // 230px: el shell ya ocupa una columna a la izquierda; más ancho
          // deja poco espacio al contenido en pantallas de 1366px.
          width: collapsed ? 64 : 230,
          transition: 'width .2s cubic-bezier(.4,0,.2,1)',
        }}
      >
        {/* Borde de una línea y menos alto: el de dos líneas con el nombre y
            la descripción del módulo empujaba las opciones hacia abajo y
            repetía lo que el shell ya dice en su propio menú. */}
        <div className="px-3 py-3 border-b border-gray-200 relative">
          {collapsed ? (
            <div className="w-full flex items-center justify-center">
              <div className="p-2 rounded-lg" style={{ background: `${moduleColor}15` }}>
                <span style={{ color: moduleColor }}>{moduleIcon}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div
                className="p-1.5 rounded-lg flex-shrink-0"
                style={{ background: `${moduleColor}15` }}
              >
                <span style={{ color: moduleColor }}>{moduleIcon}</span>
              </div>
              <h2
                className="font-bold text-[13px] leading-tight m-0 truncate min-w-0"
                style={{ color: moduleColor }}
                title={moduleDescription}
              >
                {moduleName}
              </h2>
            </div>
          )}

          <button
            onClick={() => setCollapsed((c) => !c)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-7 h-7 bg-white rounded-full
              flex items-center justify-center shadow-lg border-2 border-gray-200 z-10
              hover:scale-110 transition-transform"
            style={{ color: moduleColor }}
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            <ChevronLeft
              className="w-4 h-4"
              strokeWidth={2.5}
              style={{
                transform: collapsed ? 'rotate(180deg)' : 'none',
                transition: 'transform .2s',
              }}
            />
          </button>
        </div>

        {navegacion(collapsed)}
      </aside>

      {/* Contenido */}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        {esMovil && (
          <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-3 py-2 flex items-center gap-2">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-lg hover:bg-gray-100"
              style={{ color: moduleColor }}
              aria-label="Abrir menú del módulo"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-black text-sm" style={{ color: moduleColor }}>
              {moduleName}
            </span>
          </div>
        )}
        <div className="p-3 md:p-4">{children}</div>
      </main>
    </div>
  );
}
