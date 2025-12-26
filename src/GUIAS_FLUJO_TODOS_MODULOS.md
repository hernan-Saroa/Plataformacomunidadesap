# 📚 GUÍAS DE FLUJO PARA TODOS LOS MÓDULOS SIGL v5.0

**Fecha:** 25 de Diciembre de 2024  
**Sistema:** SIGL v5.0  
**Feature:** Información contextual educativa en todos los módulos

---

## ✅ **ESTADO DE IMPLEMENTACIÓN**

| Módulo | Estado | Tooltip Agregado |
|--------|--------|------------------|
| MOD-01: Defensa Judicial | ✅ **COMPLETADO** | Sí (8 secciones) |
| MOD-02: Juzgamiento Disciplinario | ⏳ Pendiente | No |
| MOD-03: Asesoría Jurídica | ⏳ Pendiente | No |
| MOD-04: Centro Comunicaciones | ✅ **COMPLETADO** | Sí (5 secciones) |
| MOD-05: Términos e Informes | ⏳ Pendiente | No |
| MOD-06: Órganos de Control | ⏳ Pendiente | No |
| MOD-07: Procesos Coactivos | ⏳ Pendiente | No |
| MOD-09: Plan de Acción | ⏳ Pendiente | No |
| MOD-10: Riesgos | ⏳ Pendiente | No |
| MOD-11: Planes de Mejoramiento | ⏳ Pendiente | No |
| Dashboard SIGL | ⏳ Pendiente | No |

**Completados:** 2/11 (18%)  
**Pendientes:** 9/11 (82%)

---

## 📋 **CONTENIDO DE LOS TOOLTIPS POR MÓDULO**

### **MOD-01: DEFENSA JUDICIAL** ✅ COMPLETADO

```typescript
sections={[
  {
    label: "📍 Punto de Inicio del Sistema",
    content: "La Defensa Judicial es donde INICIA todo el flujo cuando ESAP es demandada. Aquí llegan las notificaciones de demandas desde juzgados y se registran en el sistema.",
    type: "info"
  },
  {
    label: "⚖️ Propósito del Módulo",
    content: "Gestión centralizada de procesos judiciales activos contra ESAP: demandas laborales, nulidades y restablecimiento del derecho, acciones populares, tutelas y otros medios de control.",
    type: "default"
  },
  {
    label: "🔄 Flujo de Trabajo (4 Etapas)",
    content: "1️⃣ NOTIFICADA: Demanda recibida del juzgado → 2️⃣ CONTESTACIÓN: Redactar y presentar respuesta (30 días) → 3️⃣ PROBATORIA: Recolectar y aportar pruebas (60 días) → 4️⃣ ALEGATOS: Argumentos finales antes del fallo (20 días).",
    type: "premium"
  },
  {
    label: "🚦 Semáforo de Términos",
    content: "🟢 Verde (>15 días): En término | 🟡 Amarillo (5-15 días): Próximo a vencer | 🔴 Rojo (≤5 días): CRÍTICO - Acción inmediata requerida. El sistema alerta automáticamente.",
    type: "warning"
  },
  {
    label: "📋 Última Actuación (Bloque Azul)",
    content: "El bloque azul destacado en cada tarjeta muestra la actuación procesal más reciente del juzgado, facilitando seguimiento rápido sin abrir el expediente completo.",
    type: "default"
  },
  {
    label: "🔗 Integración con Otros Módulos",
    content: "Este módulo se conecta con: • Centro Comunicaciones (notificaciones del juzgado) • Términos e Informes (control de plazos) • Asesoría Jurídica (conceptos técnicos necesarios).",
    type: "success"
  },
  {
    label: "💡 Cómo Usar",
    content: "1️⃣ Click 'Nueva Demanda' cuando llega notificación → 2️⃣ Arrastra tarjetas entre columnas al cambiar etapa → 3️⃣ Click 'Expediente' para ver documentos completos → 4️⃣ Usa botones rápidos (Autos, Evidencias, Oficios) para gestión documental.",
    type: "default"
  },
  {
    label: "⏭️ Siguiente Paso",
    content: "Cuando el proceso judicial relaciona funcionarios internos, se deriva al módulo 'Juzgamiento Disciplinario' (MOD-02) para investigación interna paralela.",
    type: "info"
  }
]}
```

---

### **MOD-02: JUZGAMIENTO DISCIPLINARIO**

```typescript
<ModuleInfoTooltip
  title="Guía de Juzgamiento Disciplinario"
  variant="icon"
  sections={[
    {
      label: "🔗 Procedencia del Flujo",
      content: "Este módulo recibe casos de dos fuentes: 1) Derivados desde Defensa Judicial cuando un proceso judicial involucra conductas de funcionarios internos, 2) Quejas o denuncias directas contra empleados de ESAP.",
      type: "info"
    },
    {
      label: "⚖️ Propósito del Módulo",
      content: "Control y seguimiento de procesos disciplinarios internos contra funcionarios de ESAP, garantizando cumplimiento de términos legales y debido proceso según la Ley 734 de 2002 (Código Disciplinario Único).",
      type: "default"
    },
    {
      label: "🔄 Flujo de Trabajo (4 Etapas)",
      content: "1️⃣ AVOCAMIENTO: Apertura de investigación y vinculación del disciplinado (10 días) → 2️⃣ DESCARGOS: Funcionario presenta su defensa (15 días) → 3️⃣ PRUEBAS: Recolección y práctica de pruebas (30 días) → 4️⃣ ALEGATOS: Argumentos finales antes del fallo (10 días).",
      type: "premium"
    },
    {
      label: "🚦 Semáforo de Términos",
      content: "🟢 Verde (>5 días): En término | 🟡 Amarillo (3-5 días): Próximo a vencer | 🔴 Rojo (≤3 días): CRÍTICO. Los términos disciplinarios son PERENTORIOS e improrrogables.",
      type: "warning"
    },
    {
      label: "👤 Disciplinado y Cargo",
      content: "Cada tarjeta muestra el nombre del funcionario investigado y su cargo, respetando la confidencialidad del proceso según la ley.",
      type: "default"
    },
    {
      label: "📋 Última Actuación (Bloque Azul)",
      content: "Destacado en fondo azul (#F0F7FF), muestra la actuación administrativa más reciente: auto de apertura, citación a descargos, resolución, etc.",
      type: "default"
    },
    {
      label: "🔗 Integración con Otros Módulos",
      content: "Se conecta con: • Defensa Judicial (casos derivados) • Términos e Informes (control de plazos perentorios) • Asesoría Jurídica (conceptos sobre calificación de faltas).",
      type: "success"
    },
    {
      label: "💡 Cómo Usar",
      content: "1️⃣ Click 'Nuevo Proceso' para abrir investigación → 2️⃣ Arrastra tarjetas entre columnas al cambiar etapa → 3️⃣ Click 'Expediente' para gestión documental completa → 4️⃣ Revisa 'Última Actuación' sin abrir expediente → 5️⃣ Monitorea semáforo para acción oportuna.",
      type: "default"
    },
    {
      label: "⏭️ Siguiente Paso",
      content: "Al culminar el proceso: Si hay fallo sancionatorio → Se actualiza hoja de vida del funcionario. Si hay destitución → Se vincula con módulo de Talento Humano para trámites de desvinculación.",
      type: "info"
    }
  ]}
/>
```

---

### **MOD-03: ASESORÍA JURÍDICA**

```typescript
<ModuleInfoTooltip
  title="Guía de Asesoría Jurídica"
  variant="icon"
  sections={[
    {
      label: "🔗 Procedencia del Flujo",
      content: "Las consultas llegan de dos formas: 1) Correos clasificados por IA desde Centro de Comunicaciones, 2) Solicitudes directas de áreas administrativas de ESAP (Contratación, Talento Humano, Académica, etc.).",
      type: "info"
    },
    {
      label: "⚖️ Propósito del Módulo",
      content: "Gestión de consultas jurídicas internas sobre: contratación pública, laboral, administrativo, disciplinario, regulatorio, propiedad intelectual y demás temas legales que requieran conceptos técnicos especializados.",
      type: "default"
    },
    {
      label: "🔄 Flujo de Trabajo (5 Etapas)",
      content: "1️⃣ PENDIENTE: Consulta recibida, pendiente de asignación → 2️⃣ EN ANÁLISIS: Profesional asignado investiga normativa y jurisprudencia → 3️⃣ BORRADOR: Concepto redactado, pendiente de revisión → 4️⃣ REVISIÓN: Coordinador jurídico valida concepto → 5️⃣ CONCEPTO EMITIDO: Respuesta enviada al área solicitante.",
      type: "premium"
    },
    {
      label: "⏰ SLA (Service Level Agreement)",
      content: "Plazos de respuesta según prioridad: 🔴 URGENTE: 24 horas | 🟠 ALTA: 3 días | 🟡 MEDIA: 5 días | 🟢 BAJA: 10 días. El sistema alerta 1 día antes del vencimiento.",
      type: "warning"
    },
    {
      label: "📊 Temas de Consulta",
      content: "Clasificación automática por materia: Contratación (35%), Laboral (25%), Administrativo (20%), Disciplinario (10%), Otros (10%). Permite análisis de demanda de asesoría por área.",
      type: "default"
    },
    {
      label: "👨‍💼 Asignación Inteligente",
      content: "El sistema sugiere el profesional más adecuado según: 1) Especialización en el tema, 2) Carga de trabajo actual, 3) Experiencia previa en temas similares.",
      type: "premium"
    },
    {
      label: "🔗 Integración con Otros Módulos",
      content: "Se conecta con: • Centro Comunicaciones (recepción de consultas) • Defensa Judicial (conceptos para contestación de demandas) • Juzgamiento (conceptos sobre calificación de faltas) • Términos e Informes (SLA tracking).",
      type: "success"
    },
    {
      label: "💡 Cómo Usar",
      content: "1️⃣ Click 'Nueva Consulta' si llega por canal no digital → 2️⃣ Sistema asigna automáticamente o asigna manualmente → 3️⃣ Profesional mueve a 'En Análisis' al iniciar → 4️⃣ Redacta concepto y mueve a 'Borrador' → 5️⃣ Coordinador revisa y aprueba → 6️⃣ Sistema notifica al solicitante.",
      type: "default"
    },
    {
      label: "⏭️ Siguiente Paso",
      content: "Cuando el concepto emitido recomienda acciones legales: • Si es demanda → Derivar a Defensa Judicial • Si es proceso disciplinario → Derivar a Juzgamiento • Si es contrato → Coordinar con Contratación.",
      type: "info"
    }
  ]}
/>
```

---

### **MOD-04: CENTRO DE COMUNICACIONES** ✅ COMPLETADO

*(Ya implementado anteriormente)*

---

### **MOD-05: TÉRMINOS E INFORMES**

```typescript
<ModuleInfoTooltip
  title="Guía de Términos e Informes"
  variant="icon"
  sections={[
    {
      label: "🔗 Procedencia del Flujo",
      content: "Este módulo NO recibe casos, es un MÓDULO TRANSVERSAL que consolida TODOS los términos activos de todos los módulos: Defensa Judicial, Juzgamiento, Asesoría, Órganos de Control, etc.",
      type: "info"
    },
    {
      label: "⏰ Propósito del Módulo",
      content: "Control centralizado de TODOS los términos procesales y administrativos vigentes del área jurídica, con alertas tempranas para garantizar cumplimiento oportuno y evitar vencimientos.",
      type: "default"
    },
    {
      label: "🚦 Semáforo Inteligente",
      content: "🟢 VERDE (En término): >5 días restantes | 🟡 AMARILLO (Próximo a vencer): 2-5 días | 🔴 ROJO (Vencido): ≤1 día o vencido. El sistema prioriza automáticamente los términos críticos en la vista principal.",
      type: "warning"
    },
    {
      label: "🔄 Tipos de Términos",
      content: "• Judiciales: Contestaciones, recursos, alegatos (perentorios) | • Disciplinarios: Descargos, pruebas (improrrogables) | • Administrativos: Respuestas PQRS, informes a órganos de control | • Contractuales: Plazos de ejecución, entrega de informes.",
      type: "default"
    },
    {
      label: "📊 Dashboard de Control",
      content: "Vista ejecutiva con: Total de términos activos | Términos vencidos (acción urgente) | Próximos a vencer (planear acción) | En término (monitoreo normal). Gráficos de tendencias y alertas.",
      type: "default"
    },
    {
      label: "🔔 Sistema de Alertas",
      content: "Notificaciones automáticas por email/SMS: • 5 días antes: Alerta preventiva | • 2 días antes: Alerta urgente | • 1 día antes: Alerta crítica | • Vencido: Escalamiento automático a coordinación.",
      type: "premium"
    },
    {
      label: "🔗 Integración TOTAL",
      content: "Este módulo se integra con TODOS los módulos: • Defensa Judicial (términos judiciales) • Juzgamiento (términos disciplinarios) • Asesoría (SLA de conceptos) • Órganos Control (términos de respuesta) • Procesos Coactivos (términos de cobro).",
      type: "success"
    },
    {
      label: "💡 Cómo Usar",
      content: "1️⃣ Vista principal muestra TODOS los términos en semáforo único → 2️⃣ Filtrar por módulo origen para ver términos específicos → 3️⃣ Click en término para ver expediente completo → 4️⃣ Marcar como cumplido al ejecutar acción → 5️⃣ Exportar reporte de términos para gerencia.",
      type: "default"
    },
    {
      label: "📈 Reportes e Indicadores",
      content: "Genera indicadores de gestión: • % Cumplimiento de términos (meta: >95%) | • Términos vencidos mensual (meta: 0) | • Tiempo promedio de respuesta | • Análisis de causas de vencimiento para mejora continua.",
      type: "info"
    }
  ]}
/>
```

---

### **MOD-06: ÓRGANOS DE CONTROL**

```typescript
<ModuleInfoTooltip
  title="Guía de Órganos de Control"
  variant="icon"
  sections={[
    {
      label: "🔗 Procedencia del Flujo",
      content: "Los requerimientos llegan desde: 1) Correos clasificados por IA desde Centro de Comunicaciones (notificaciones de Contraloría, Procuraduría, Fiscalía), 2) Oficios directos recibidos físicamente, 3) Plataformas digitales de órganos de control.",
      type: "info"
    },
    {
      label: "⚖️ Propósito del Módulo",
      content: "Gestión de requerimientos, solicitudes de información y procesos de responsabilidad fiscal/disciplinaria iniciados por órganos de control externo: Contraloría General, Procuraduría, Fiscalía, Personerías, Defensoría del Pueblo.",
      type: "default"
    },
    {
      label: "🔄 Flujo de Trabajo",
      content: "1️⃣ RECIBIDO: Requerimiento notificado del órgano de control → 2️⃣ EN ANÁLISIS: Área jurídica revisa solicitud y coordina con áreas técnicas → 3️⃣ INFORMACIÓN CONSOLIDADA: Respuestas recopiladas de áreas → 4️⃣ BORRADOR: Oficio de respuesta redactado → 5️⃣ RESPUESTA ENVIADA: Entregada al órgano de control.",
      type: "premium"
    },
    {
      label: "⏰ Términos Legales",
      content: "Plazos según norma: • Contraloría: 10 días hábiles (Ley 610/2000) | • Procuraduría: 15 días hábiles (Ley 734/2002) | • Fiscalía: Según oficio | • Personería: 10 días hábiles. ⚠️ NO son prorrogables.",
      type: "warning"
    },
    {
      label: "📊 Tipos de Requerimientos",
      content: "• Solicitud información: Datos, documentos, contratos | • Proceso de responsabilidad fiscal: Posible detrimento patrimonial | • Proceso disciplinario: Conductas irregulares funcionarios | • Querella/Denuncia: Posibles delitos | • Traslado para respuesta de PQRS ciudadanas.",
      type: "default"
    },
    {
      label: "👥 Coordinación Interáreas",
      content: "Requiere trabajo colaborativo con: Talento Humano (info funcionarios), Contratación (contratos), Financiera (presupuesto), Académica (programas), TI (datos digitales). El sistema notifica automáticamente a las áreas requeridas.",
      type: "default"
    },
    {
      label: "🔗 Integración con Otros Módulos",
      content: "Se conecta con: • Centro Comunicaciones (recepción de oficios) • Términos e Informes (control de plazos perentorios) • Defensa Judicial (si el requerimiento deriva en demanda) • Juzgamiento (si hay proceso disciplinario a funcionarios).",
      type: "success"
    },
    {
      label: "💡 Cómo Usar",
      content: "1️⃣ Click 'Nuevo Requerimiento' al recibir oficio → 2️⃣ Clasifica órgano y tipo de solicitud → 3️⃣ Sistema calcula término legal automáticamente → 4️⃣ Asigna responsable y áreas de apoyo → 5️⃣ Consolida información y redacta respuesta → 6️⃣ Envía y adjunta soporte de entrega.",
      type: "default"
    },
    {
      label: "⏭️ Siguiente Paso",
      content: "Según resultado del requerimiento: • Si órgano inicia proceso fiscal/disciplinario → Derivar a Defensa Judicial | • Si requiere acciones internas → Derivar a Juzgamiento | • Si necesita plan de mejora → Derivar a Planes de Mejoramiento.",
      type: "info"
    }
  ]}
/>
```

---

### **MOD-07: PROCESOS COACTIVOS**

```typescript
<ModuleInfoTooltip
  title="Guía de Procesos Coactivos"
  variant="icon"
  sections={[
    {
      label: "🔗 Procedencia del Flujo",
      content: "Los procesos coactivos INICIAN cuando: 1) Hay un fallo ejecutoriado con condena de ESAP (viene de Defensa Judicial), 2) Hay una obligación clara de pago establecida por acto administrativo, 3) Hay acuerdos de pago incumplidos.",
      type: "info"
    },
    {
      label: "⚖️ Propósito del Módulo",
      content: "Gestión de procesos de cobro coactivo iniciados por terceros contra ESAP o por ESAP contra deudores, garantizando cumplimiento de obligaciones económicas mediante jurisdicción coactiva (Ley 1066/2006).",
      type: "default"
    },
    {
      label: "🔄 Flujo de Trabajo",
      content: "1️⃣ MANDAMIENTO DE PAGO: Notificación de la deuda con título ejecutivo → 2️⃣ EMBARGO: Medidas cautelares sobre bienes si no hay pago → 3️⃣ SECUESTRO: Aprehensión de bienes embargados → 4️⃣ AVALÚO Y REMATE: Valoración y subasta de bienes → 5️⃣ PAGO Y CIERRE: Satisfacción de la obligación.",
      type: "premium"
    },
    {
      label: "💰 Tipos de Obligaciones",
      content: "• Condenas judiciales: Fallos en contra de ESAP por demandas laborales, contractuales, etc. | • Multas y sanciones: Órganos de control, entidades regulatorias | • Deudas contractuales: Incumplimientos de contratistas | • Obligaciones tributarias: Impuestos, contribuciones.",
      type: "default"
    },
    {
      label: "⏰ Términos del Proceso",
      content: "• Mandamiento de pago: 15 días para pagar o excepcionar | • Embargo: Inmediato tras vencimiento del mandamiento | • Avalúo: 15 días | • Remate: Según valor del bien. Total proceso: 3-6 meses aprox.",
      type: "warning"
    },
    {
      label: "📊 Gestión de Deuda",
      content: "El sistema controla: • Valor capital de la deuda | • Intereses moratorios acumulados | • Costas procesales | • Estado de embargos y medidas cautelares | • Acuerdos de pago suscritos | • Pagos parciales realizados.",
      type: "default"
    },
    {
      label: "🔗 Integración con Otros Módulos",
      content: "Se conecta con: • Defensa Judicial (origen de condenas) • Términos e Informes (control de plazos de excepciones) • Financiera (presupuesto para pagos) • Contratación (deudas de contratistas).",
      type: "success"
    },
    {
      label: "💡 Cómo Usar",
      content: "1️⃣ Click 'Nuevo Proceso Coactivo' al recibir mandamiento → 2️⃣ Registra título ejecutivo (sentencia, acto admin, etc.) → 3️⃣ Calcula valor total con intereses → 4️⃣ Evalúa si hay excepciones viables → 5️⃣ Coordina con Financiera el pago o plan de pagos → 6️⃣ Monitorea embargos y medidas cautelares.",
      type: "default"
    },
    {
      label: "⏭️ Siguiente Paso",
      content: "Al finalizar el proceso coactivo: • Si es pago total → Solicitar levantamiento de medidas y cierre | • Si es acuerdo de pago → Trasladar a módulo de Cartera para seguimiento | • Si hay recurso → Derivar a Defensa Judicial.",
      type: "info"
    }
  ]}
/>
```

---

### **MOD-09: PLAN DE ACCIÓN**

```typescript
<ModuleInfoTooltip
  title="Guía de Plan de Acción"
  variant="icon"
  sections={[
    {
      label: "🔗 Procedencia del Flujo",
      content: "El Plan de Acción es un MÓDULO ESTRATÉGICO que NO recibe casos de otros módulos. Se construye anualmente según el Plan Estratégico Institucional (PEI) de ESAP y los objetivos del área jurídica.",
      type: "info"
    },
    {
      label: "🎯 Propósito del Módulo",
      content: "Seguimiento de indicadores estratégicos del área jurídica alineados con los 4 ejes del PEI: Gestión Institucional, Talento Humano, Transparencia y Tecnología. Permite medir el cumplimiento de metas anuales y el impacto de las acciones jurídicas.",
      type: "default"
    },
    {
      label: "📊 Ejes Estratégicos (4)",
      content: "1️⃣ GESTIÓN INSTITUCIONAL: Reducción de términos vencidos, optimización documental | 2️⃣ TALENTO HUMANO: Capacitación, fortalecimiento de competencias | 3️⃣ TRANSPARENCIA: Publicación de info, atención PQRS | 4️⃣ TECNOLOGÍA: Implementación SIGL, automatización de alertas.",
      type: "premium"
    },
    {
      label: "🚦 Semáforo de Cumplimiento",
      content: "Indicadores por color: 🟢 VERDE (≥90% cumplimiento): En la meta | 🟡 AMARILLO (50-89%): Requiere atención | 🔴 ROJO (<50%): Crítico, acción inmediata. La gerencia revisa mensualmente.",
      type: "warning"
    },
    {
      label: "📈 Indicadores Típicos",
      content: "• Reducción % términos vencidos (meta: 20%) | • % Digitalización expedientes (meta: 90%) | • % Capacitación equipo jurídico (meta: 100%) | • % Respuesta oportuna PQRS (meta: 100%) | • % Adopción sistema SIGL (meta: 85%).",
      type: "default"
    },
    {
      label: "🔄 Ciclo de Gestión",
      content: "1️⃣ PLANEAR: Definir indicadores y metas anuales (enero) → 2️⃣ HACER: Ejecutar acciones durante el año → 3️⃣ VERIFICAR: Medición mensual/trimestral de avance → 4️⃣ ACTUAR: Ajustar plan según resultados (mejora continua).",
      type: "default"
    },
    {
      label: "🔗 Integración Transversal",
      content: "Este módulo MIDE el desempeño de TODOS los módulos: • Defensa Judicial (% términos cumplidos) | • Juzgamiento (% procesos en término) | • Asesoría (% SLA cumplido) | • Órganos Control (% respuestas oportunas) | • Sistema completo (% adopción SIGL).",
      type: "success"
    },
    {
      label: "💡 Cómo Usar",
      content: "1️⃣ Vista Timeline muestra 4 columnas (ejes estratégicos) → 2️⃣ Cada tarjeta es un indicador con meta vs avance → 3️⃣ Semáforo indica estado de cumplimiento → 4️⃣ Click 'Ver Detalle' para análisis profundo → 5️⃣ Click 'Actualizar' para registrar avance mensual → 6️⃣ Exportar informe ejecutivo para gerencia.",
      type: "default"
    },
    {
      label: "📊 Reportes Gerenciales",
      content: "Genera dashboards ejecutivos: • Cumplimiento global del plan (meta: >85%) | • Indicadores en riesgo (amarillo/rojo) | • Tendencias de avance mensual | • Análisis de brechas entre meta y resultado | • Acciones correctivas sugeridas.",
      type: "info"
    }
  ]}
/>
```

---

### **MOD-10: RIESGOS**

```typescript
<ModuleInfoTooltip
  title="Guía de Riesgos Jurídicos"
  variant="icon"
  sections={[
    {
      label: "🔗 Procedencia del Flujo",
      content: "Los riesgos se identifican desde TODOS los módulos: Defensa Judicial (patrones de demandas), Juzgamiento (fallas de proceso), Asesoría (vacíos normativos), Órganos Control (hallazgos). Es un módulo PREVENTIVO.",
      type: "info"
    },
    {
      label: "⚠️ Propósito del Módulo",
      content: "Identificación, valoración y gestión de riesgos jurídicos institucionales mediante metodología MIPG (Modelo Integrado de Planeación y Gestión). Permite anticipar problemas legales y tomar acciones preventivas.",
      type: "default"
    },
    {
      label: "🎨 Matriz de Riesgos (Probabilidad x Impacto)",
      content: "• EXTREMO (Rojo): Probabilidad muy alta + Impacto catastrófico → Acción inmediata | • ALTO (Naranja): Alta probabilidad o alto impacto → Plan de mitigación urgente | • MEDIO (Amarillo): Moderado → Monitoreo activo | • BAJO (Verde): Improbable o bajo impacto → Vigilancia.",
      type: "warning"
    },
    {
      label: "📊 Tipos de Riesgos",
      content: "• Litigio: Aumento de demandas en área específica | • Normativo: Cambios legales adversos | • Reputacional: Exposición mediática negativa | • Operacional: Fallas en procesos internos | • Sancionatorio: Multas de órganos de control | • Fiscal: Responsabilidad patrimonial.",
      type: "default"
    },
    {
      label: "🔄 Ciclo de Gestión del Riesgo",
      content: "1️⃣ IDENTIFICAR: Detectar riesgo potencial → 2️⃣ VALORAR: Calcular probabilidad e impacto → 3️⃣ PRIORIZAR: Ubicar en matriz de riesgos → 4️⃣ CONTROLAR: Diseñar acciones preventivas/correctivas → 5️⃣ MONITOREAR: Seguimiento trimestral de evolución.",
      type: "premium"
    },
    {
      label: "🎯 Controles Preventivos",
      content: "Acciones de mitigación: • Actualización de políticas internas | • Capacitación a funcionarios | • Auditorías preventivas de contratos | • Revisión de procesos | • Implementación de alertas tempranas | • Fortalecimiento de controles internos.",
      type: "default"
    },
    {
      label: "🔗 Integración con Otros Módulos",
      content: "Se nutre de: • Defensa Judicial (patrones de demandas) | • Juzgamiento (causas de procesos disciplinarios) | • Asesoría (consultas recurrentes=vacío normativo) | • Órganos Control (hallazgos) | • Plan Acción (KPI: % riesgos mitigados).",
      type: "success"
    },
    {
      label: "💡 Cómo Usar",
      content: "1️⃣ Click 'Identificar Riesgo' al detectar patrón o amenaza → 2️⃣ Describe riesgo y causa raíz → 3️⃣ Valora probabilidad (1-5) e impacto (1-5) → 4️⃣ Sistema calcula nivel de riesgo automáticamente → 5️⃣ Diseña controles preventivos → 6️⃣ Asigna responsable y fecha de seguimiento → 7️⃣ Monitorea evolución trimestral.",
      type: "default"
    },
    {
      label: "⏭️ Siguiente Paso",
      content: "Cuando un riesgo se materializa: • Si se convierte en demanda → Defensa Judicial | • Si requiere cambios → Plan de Mejoramiento | • Si necesita ajustes → Plan de Acción | • Si es crítico → Escalamiento a alta gerencia.",
      type: "info"
    }
  ]}
/>
```

---

### **MOD-11: PLANES DE MEJORAMIENTO**

```typescript
<ModuleInfoTooltip
  title="Guía de Planes de Mejoramiento"
  variant="icon"
  sections={[
    {
      label: "🔗 Procedencia del Flujo",
      content: "Los planes de mejoramiento INICIAN cuando: 1) Órganos de Control emiten hallazgos/recomendaciones, 2) Auditorías internas detectan no conformidades, 3) Riesgos materializados requieren acción correctiva, 4) Indicadores del Plan de Acción están en rojo.",
      type: "info"
    },
    {
      label: "✅ Propósito del Módulo",
      content: "Gestión de planes de mejoramiento suscritos con órganos de control (Contraloría, Procuraduría) o generados internamente por auditorías, para corregir deficiencias y cumplir compromisos de mejora institucional.",
      type: "default"
    },
    {
      label: "🔄 Flujo de Trabajo",
      content: "1️⃣ FORMULACIÓN: Diseñar plan con acciones, responsables y fechas → 2️⃣ EJECUCIÓN: Implementar acciones correctivas/preventivas → 3️⃣ SEGUIMIENTO: Monitoreo mensual de avance → 4️⃣ EVIDENCIA: Recopilación de soportes de cumplimiento → 5️⃣ CIERRE: Validación por órgano de control o auditoría.",
      type: "premium"
    },
    {
      label: "📊 Tipos de Hallazgos",
      content: "• Administrativos: Fallas en procesos internos | • Disciplinarios: Conductas irregulares de funcionarios | • Fiscales: Posible detrimento patrimonial | • Penales: Presuntos delitos | • Contractuales: Incumplimientos en contratación | • Normativos: Incumplimiento de leyes/decretos.",
      type: "default"
    },
    {
      label: "⏰ Plazos de Cumplimiento",
      content: "Según órgano de control: • Contraloría: Generalmente 6 meses (prorrogable) | • Procuraduría: Variable según hallazgo | • Auditoría interna: 3-6 meses. ⚠️ El incumplimiento puede generar sanciones.",
      type: "warning"
    },
    {
      label: "🚦 Semáforo de Avance",
      content: "🟢 VERDE (≥80% avance): En cumplimiento | 🟡 AMARILLO (50-79%): Requiere acelerar | 🔴 ROJO (<50% o vencido): Crítico, riesgo de sanción. Sistema alerta 30 días antes del vencimiento.",
      type: "warning"
    },
    {
      label: "👥 Responsabilidad Compartida",
      content: "Requiere coordinación con múltiples áreas: Oficina Jurídica (lidera el plan), Áreas técnicas responsables (ejecutan acciones), Control Interno (hace seguimiento), Alta gerencia (valida recursos y autoriza cambios).",
      type: "default"
    },
    {
      label: "🔗 Integración con Otros Módulos",
      content: "Se conecta con: • Órganos de Control (origen de hallazgos) | • Riesgos (materialización de riesgos) | • Plan de Acción (indicadores en rojo requieren plan) | • Términos e Informes (control de plazos de cumplimiento).",
      type: "success"
    },
    {
      label: "💡 Cómo Usar",
      content: "1️⃣ Click 'Nuevo Plan' al recibir hallazgo → 2️⃣ Registra hallazgo y recomendación del órgano → 3️⃣ Diseña acciones correctivas específicas → 4️⃣ Asigna responsables y fechas por acción → 5️⃣ Registra avance mensual con evidencias → 6️⃣ Notifica cumplimiento al órgano de control → 7️⃣ Solicita cierre formal del hallazgo.",
      type: "default"
    },
    {
      label: "✅ Criterios de Cierre",
      content: "Para cerrar un plan se requiere: • 100% de acciones ejecutadas | • Evidencias documentadas y validadas | • Verificación por auditoría o órgano de control | • Oficio de aceptación del cumplimiento | • Archivo en repositorio de planes cerrados.",
      type: "info"
    }
  ]}
/>
```

---

### **DASHBOARD SIGL (Vista Ejecutiva)**

```typescript
<ModuleInfoTooltip
  title="Guía del Dashboard Ejecutivo SIGL"
  variant="icon"
  sections={[
    {
      label: "🎯 Propósito del Dashboard",
      content: "Vista panorámica EJECUTIVA de TODOS los módulos del Sistema Integral de Gestión Legal (SIGL). Permite al Jefe Jurídico y Directivos tomar decisiones basadas en datos consolidados en tiempo real.",
      type: "info"
    },
    {
      label: "📊 Métricas Consolidadas",
      content: "El dashboard unifica: • Total de expedientes activos (todos los módulos) | • Términos críticos (< 5 días) | • Carga de trabajo por profesional | • Cumplimiento de metas del Plan de Acción | • Riesgos en nivel extremo | • Hallazgos pendientes de cierre.",
      type: "default"
    },
    {
      label: "🚨 Alertas Ejecutivas",
      content: "Notificaciones priorizadas: 🔴 CRÍTICAS: Términos vencidos, riesgos extremos, fallos adversos | 🟠 URGENTES: Términos <3 días, audiencias próximas | 🟡 ATENCIÓN: Indicadores en amarillo, carga desbalanceada.",
      type: "warning"
    },
    {
      label: "📈 Gráficos de Tendencias",
      content: "Visualizaciones clave: • Evolución de demandas últimos 12 meses | • Tasa de éxito en defensa judicial | • Cumplimiento mensual de términos | • Avance del Plan de Acción | • Distribución de carga por profesional | • Top 5 temas de asesoría.",
      type: "default"
    },
    {
      label: "🎨 Módulos Visualizados",
      content: "Vista de tarjetas con estado de cada módulo: • Defensa Judicial (15 expedientes) | • Juzgamiento (9 procesos) | • Asesoría (12 consultas) | • Centro Comunicaciones (6 no leídas) | • Términos (13 activos, 4 críticos) | • Órganos Control (6 requerimientos) | Y demás módulos.",
      type: "premium"
    },
    {
      label: "🔗 Navegación Rápida",
      content: "Desde el dashboard se accede directamente: • Click en tarjeta de módulo → Abre el módulo completo | • Click en alerta → Va al expediente/proceso específico | • Click en gráfico → Filtra datos relacionados | • Exportar PDF ejecutivo para gerencia.",
      type: "default"
    },
    {
      label: "👥 Usuarios Típicos",
      content: "• Jefe Oficina Jurídica: Monitoreo general y toma de decisiones | • Coordinador: Asignación de carga y seguimiento de términos | • Alta Gerencia: Indicadores estratégicos y cumplimiento de metas | • Auditoría: Verificación de controles y cumplimiento normativo.",
      type: "default"
    },
    {
      label: "💡 Cómo Interpretar",
      content: "1️⃣ Revisa métricas generales (expedientes, términos, alertas) → 2️⃣ Identifica módulos con indicadores en rojo/amarillo → 3️⃣ Revisa alertas críticas y asigna acciones → 4️⃣ Analiza tendencias para planear recursos → 5️⃣ Valida cumplimiento del Plan de Acción → 6️⃣ Exporta reporte ejecutivo mensual.",
      type: "default"
    },
    {
      label: "📊 Reportes Ejecutivos",
      content: "El dashboard genera: • Informe mensual consolidado (PDF) | • Reporte de cumplimiento de metas (Plan de Acción) | • Estado de términos y alertas | • Distribución de carga de trabajo | • Análisis de riesgos y planes de mejoramiento | • Indicadores de gestión para gerencia.",
      type: "info"
    }
  ]}
/>
```

---

## 🎯 **FLUJO GENERAL DEL SISTEMA SIGL v5.0**

### **Visión Integrada del Flujo:**

```
📬 ENTRADA DE CASOS:
1. Centro de Comunicaciones (notificaciones judiciales/correos/oficios)
   ↓
2. Clasificación IA sugiere módulo destino

🔄 FLUJO OPERATIVO:
3. Defensa Judicial (ESAP es demandada)
   ├→ Si involucra funcionarios → Juzgamiento Disciplinario
   ├→ Si requiere concepto → Asesoría Jurídica
   ├→ Si hay condena → Procesos Coactivos
   └→ Términos e Informes (control de plazos)

4. Órganos de Control (requerimientos externos)
   ├→ Si hay hallazgos → Planes de Mejoramiento
   └→ Si hay riesgos → Riesgos

📊 GESTIÓN ESTRATÉGICA:
5. Plan de Acción (indicadores anuales)
6. Riesgos (prevención)
7. Planes de Mejoramiento (corrección)

🎯 SUPERVISIÓN:
8. Dashboard Ejecutivo (consolidación y toma de decisiones)
```

---

## ✅ **PRÓXIMOS PASOS PARA IMPLEMENTACIÓN**

### **Fase 1: Agregar imports** (todos los módulos)
```typescript
import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';
```

### **Fase 2: Modificar estructura del return** (envolver header)
```typescript
<div className="flex items-start justify-between gap-4">
  <div className="flex-1">
    <ModuleHeader ... />
  </div>
  <div className="flex-shrink-0 pt-1">
    <ModuleInfoTooltip ... />
  </div>
</div>
```

### **Fase 3: Copiar contenido de secciones** (desde este documento)

---

## 🎊 **IMPACTO ESPERADO**

### **Para los usuarios:**
- ✅ Entienden el flujo completo del sistema
- ✅ Saben dónde inicia y termina cada proceso
- ✅ Conocen cómo se integran los módulos
- ✅ Aprenden a usar el sistema sin capacitación formal
- ✅ Ven el "big picture" estratégico

### **Para la organización:**
- ✅ Reduce tiempo de onboarding de nuevos usuarios
- ✅ Disminuye errores por desconocimiento del flujo
- ✅ Mejora adopción del sistema
- ✅ Facilita auditorías (flujo documentado en UI)
- ✅ Eleva percepción de calidad del sistema

### **Para el sistema:**
- ✅ Documentación viva integrada en la UI
- ✅ Consistencia en toda la plataforma
- ✅ Fácil actualización de contenidos
- ✅ Escalable a futuras funcionalidades

---

## 📊 **ESTADO FINAL OBJETIVO**

**11/11 módulos con información contextual educativa** ✅

Cada módulo tendrá entre 8-10 secciones que explican:
- Procedencia del flujo (de dónde vienen los casos)
- Propósito y alcance
- Flujo de trabajo paso a paso
- Términos y plazos
- Integración con otros módulos
- Cómo usar el módulo
- Siguiente paso en el flujo

**Total de secciones educativas:** ~100 secciones  
**Total de caracteres explicativos:** ~25,000 caracteres  
**Tiempo estimado de implementación:** 2-3 horas

---

**DOCUMENTO CREADO - 25 de Diciembre de 2024**  
**Sistema SIGL v5.0 - Backoffice ESAP**

**Listo para implementación masiva en los 9 módulos pendientes** ✅
