# 🎓 Backoffice ESAP

Sistema de gestión administrativa para la Comunidad Universitaria de ESAP (Escuela Superior de Administración Pública - Colombia).

## 🚀 Inicio Rápido

```bash
npm install
npm run dev
```

### Credenciales Demo
```bash
Email: admin@esap.edu.co
Password: cualquiera
```

## 🏗️ Stack Tecnológico

- **React 18** + **TypeScript**
- **Vite** - Build tool
- **Tailwind CSS 4.0**
- **Motion/React** - Animations
- **Shadcn/UI** - Components
- **Lucide React** - Icons

## 📦 Módulos Principales

1. **👥 Gestión de Personas** - Sistema Usuario-Persona
2. **🔐 Roles y Permisos** - RBAC completo
3. **⚖️ Gestión Legal (SIGL)** - 11 módulos jurídicos + Kanban
4. **👨‍🏫 Gestión Profesoral** - PTA, convocatorias, evaluaciones
5. **🔍 Control Interno** - Auditorías y mejoramiento
6. **📄 Certificados** - Generación con QR
7. **🌎 Territoriales** - 26 sedes nacionales
8. **📊 Reportes** - Constructor visual

## 🎯 Features Premium

- ✅ Command Palette (`⌘K`)
- ✅ Keyboard Shortcuts (15+)
- ✅ Toast Notifications
- ✅ 100% Responsive + Mobile-first
- ✅ WCAG AAA Compliant

## 🏢 Arquitectura

```
/components
├── esap/              # Módulos administrativos
│   ├── gestion-legal/ # SIGL (Kanban + 11 módulos)
│   ├── control-interno/
│   └── disciplinario/
├── portal/            # Portal transaccional
└── ui/               # Componentes base
```

## 📱 Responsive Design

```
Mobile:  < 768px
Tablet:  768px - 1023px
Desktop: 1024px+
```

## 🎨 Colores Corporativos

```css
--esap-primary: #003DA5    /* Azul ESAP */
--esap-success: #10B981
--esap-warning: #F59E0B
--esap-danger: #EF4444
```

## 🚀 Build

```bash
npm run build
npm run preview
```

---

**ESAP Colombia © 2025** | Desarrollado con React + TypeScript
