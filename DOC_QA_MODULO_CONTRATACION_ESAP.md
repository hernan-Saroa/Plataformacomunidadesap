# DOSSIER MAESTRO DE QA: MÓDULO DE GESTIÓN DE CONTRATACIÓN
## Plataforma Institucional ESAP · Fábrica de Software & Aseguramiento de Calidad

> **Documento de Referencia y Transferencia de Contexto entre Sesiones (QA Handover Document)**  
> **Fecha de creación:** 12 de Noviembre de 2026  
> **Versión:** 1.0.0  
> **Sistema:** SuperApp ESAP / Plataforma Institucional Comunidadesap  
> **Módulo:** Gestión de Contratación y Adquisiciones (Ley 80/1993, Ley 1150/2007, Dec. 1082/2015)  

---

## 1. ENTORNO DE PRUEBAS Y CREDENCIALES DE ACCESO

| Parámetro | Detalle / Valor |
| :--- | :--- |
| **Ambiente de Pruebas** | QA / Staging Fábrica de Software |
| **URL del Sistema** | [https://esap-qa.fabricasoftware.co/](https://esap-qa.fabricasoftware.co/) |
| **Usuario Administrador** | `superuser@esap.edu.co` |
| **Contraseña** | `Esap.2026*` |
| **Perfil Asignado** | Administrador (`superuser` / Control Total) |
| **Alcance en Ambiente** | Parametrización, roles, flujos contractuales, cargue de expedientes, supervisión y liquidación |

---

## 2. DOCUMENTOS FUENTE DEL PROYECTO (RUTAS ABSOLUTAS)

Los siguientes archivos son los insumos oficiales base para el aseguramiento de calidad del módulo:

1. **Matriz de Trazabilidad de Formatos y Procedimiento BS-PT-002 v2:**  
   [Trazabilidad_Formatos_Matriz_Flujo_Contratacion.xlsx](file:///c:/Users/juanc/Downloads/Trazabilidad_Formatos_Matriz_Flujo_Contratacion.xlsx)  
   *Contenido:* Mapeo de las 10 etapas del flujo vs. formatos SIG ESAP (BS-FO), Procedimiento BS-PT-002 v2, matriz RACI (11 roles), 35 brechas/hallazgos y catálogo de formatos.

2. **Estándar Oficial de Plan de Pruebas Fábrica de Software ESAP:**  
   [Gestion Infraestructura Plan Pruebas.docx](file:///c:/Users/juanc/Downloads/Gestion%20Infraestructura%20Plan%20Pruebas.docx)  
   *Contenido:* Estructura estándar institucional de casos de prueba (`CP-XX-NNN`), matriz de severidad, criterios de aceptación, formato de evidencias y ciclo de pruebas de la ESAP.

3. **Flujograma y Arquitectura del Proceso de Contratación:**  
   [Flujo_Contratación_09072026.pptx](file:///c:/Users/juanc/Downloads/Flujo_Contrataci%C3%B3n_09072026.pptx)  
   *Contenido:* 25 diapositivas con el levantamiento de sesiones técnicas, definición de las 10 fases, tipologías contractuales, alcance Fase 1 vs. Fuera de Alcance y prioridad de Contratación Directa.

4. **Manual de Contratación Institucional ESAP (Vigente):**  
   [2025-08-29RESOL1559MANUALDECONTRATACIONESAP2025.pdf](file:///c:/Users/juanc/Downloads/2025-08-29RESOL1559MANUALDECONTRATACIONESAP2025.pdf)  
   *Contenido:* Resolución No. SC-1559 del 29 de agosto de 2025 (Código: `BS-MA-001`, Versión 2). Marco normativo, directrices precontractuales, contractuales y poscontractuales.

---

## 3. MARCO NORMATIVO Y ALCANCE FUNCIONAL

### 3.1 Fundamento Jurídico
- **Ley 80 de 1993:** Estatuto General de Contratación de la Administración Pública.
- **Ley 1150 de 2007:** Medidas para la eficiencia y transparencia en la contratación con recursos públicos.
- **Decreto 1082 de 2015:** Reglamentación única del sector administrativo de planeación nacional (modalidades, plazos y cuantías).
- **Resolución SC-1559 de 2025 (BS-MA-001 v2):** Manual de Contratación oficial de la ESAP.
- **Procedimiento BS-PT-002 v2 (Isolución 04/08/2026):** Procedimiento operativo de gestión de contratación.
- **Manual de Supervisión e Interventoría MP-A-CT-001 (2023):** Reglas para supervisores e interventores.

### 3.2 Alcance Fase 1 vs. Fuera de Alcance
| Componente / Etapa | Estado en Desarrollo | Decisión QA / Regla de Negocio |
| :--- | :--- | :--- |
| **Etapa 1: Identificación y Planeación (1.1 - 1.4)** | **FUERA DE ALCANCE FASE 1** | Pertenece a planeación interna (BS-PT-001). En el sistema inicia con verificación de necesidad/PAA. |
| **Etapa 2: Plan Anual de Adquisiciones - PAA (2.1 - 2.4)** | **FUERA DE ALCANCE FASE 1** | Se gestiona por SECOP II / Excel institucional. El módulo valida el código/línea del PAA existente. |
| **Etapa 3 a 10 (Flujo Contractual Completo)** | **EN ALCANCE PRIORITARIO** | Flujo completo desde Estudios Previos hasta Liquidación y Archivo. |
| **Modalidad Prioritaria 1** | **Contratación Directa (PSPAG)** | Prestación de Servicios Profesionales y Apoyo a la Gestión (Personas Naturales). Mayor volumen de la ESAP. |
| **Modalidades Secundarias** | Licitación Pública, SAMC, SASI, CM, Bolsa Mercantil, TVEC | Flujos complejos con publicación de pliegos, audiencias y comités asesores. |

---

## 4. LAS 10 ETAPAS DEL FLUJO CONTRACTUAL INSTITUCIONAL

```
[1. Identificación] ──► [2. PAA] ──► [3. Estudios Previos] ──► [4. CDP] ──► [5. Elaboración & Publicación]
                                                                                        │
[10. Liquidación]   ◄── [9. Ejecución] ◄── [8. Legalización] ◄── [7. Adjudicación] ◄── [6. Evaluación Ofertas]
```

1. **Etapa 1: Identificación y Planeación:** Determinación de bienes, obras o servicios requeridos por las áreas misionales y territoriales. *(Fuera de Fase 1)*.
2. **Etapa 2: Plan Anual de Adquisiciones (PAA):** Consolidación institucional y publicación en SECOP II. *(Fuera de Fase 1; el módulo solicita el código del PAA)*.
3. **Etapa 3: Estudios Previos y Sector:**
   - Elaboración de Estudios Previos (`BS-FO-046` para PSPAG persona natural).
   - Análisis del sector y estudio de mercado (`BS-DE-002` / `IdArticulo 5941`).
   - Certificado de inexistencia de personal de planta (Talento Humano).
   - Matriz de riesgos precontractuales (Guía Colombia Compra Eficiente).
   - Radicación a la Dirección de Contratación con lista de chequeo respectiva (`BS-FO-036`, `BS-FO-008`, etc.).
4. **Etapa 4: Certificado de Disponibilidad Presupuestal (CDP):**
   - Solicitud formal de CDP ante la Dirección Financiera.
   - Verificación de suficiencia presupuestal frente al estudio de mercado.
   - Expedición del CDP (integración o registro de soporte KLIC / SIIF).
5. **Etapa 5: Elaboración y Publicación del Proceso:**
   - Proyecto de pliegos, aviso de convocatoria y cronograma.
   - Aprobación de limitación a MiPymes (cuando aplique).
   - Publicación en SECOP II y portal web ESAP.
   - Observaciones al proyecto de pliegos y respuestas oficiales.
   - Acto de apertura y pliegos definitivos.
6. **Etapa 6: Recepción y Evaluación de Ofertas:**
   - Cierre del proceso y recepción de propuestas vía SECOP II.
   - Memorando de designación del Comité Asesor Evaluador (firmado por Ordenador del Gasto).
   - Evaluación de requisitos habilitantes: Jurídico (`BS-FO-058`), Financiero y Técnico.
   - Publicación de informe de evaluación preliminar (traslado de ofertas).
   - Recepción de subsanaciones y publicación de respuestas.
7. **Etapa 7: Adjudicación:**
   - Audiencia de adjudicación (con apertura de sobre económico en licitaciones de obra).
   - Informe de evaluación definitivo (`BS-FO-017`).
   - Expedición del acto administrativo de adjudicación o declaratoria de desierto.
8. **Etapa 8: Perfeccionamiento y Legalización:**
   - Elaboración y firma de la minuta del contrato (Representante legal/delegado y contratista).
   - Designación formal de supervisión por parte del Ordenador del Gasto.
   - Expedición del Registro Presupuestal (RP) por la Dirección Financiera.
   - Aprobación de garantías contractuales (`BS-FO-004`).
   - Afiliación o verificación de ARL (obligatorio para personas naturales PSPAG).
   - Comunicación formal de inicio de ejecución al supervisor.
9. **Etapa 9: Ejecución y Supervisión:**
   - Reunión de inicio y suscripción de Acta de Inicio (`BS-FO-022`), si fue pactada.
   - Informes periódicos de ejecución de supervisión y solicitud de trámite de pago (`BS-FO-025`).
   - Reasignación de supervisión en caso de novedades de personal.
   - Modificaciones contractuales (`BS-FO-059`): Adición en valor, Prórroga en tiempo, Suspensión temporal, Cesión o Modificación de cláusulas.
10. **Etapa 10: Seguimiento, Control y Liquidación:**
    - Informe final de supervisión y paz y salvo general (`BS-FO-025`).
    - Control de entrega de bienes y desactivación de accesos tecnológicos.
    - Elaboración y firma de Acta de Liquidación (`BS-FO-060`) para contratos que la requieran.
    - Acta de cierre del expediente contractual (`BS-FO-051`).
    - Archivo y custodia definitiva del expediente conforme a listas de chequeo SIG (`BS-FO-036`).

---

## 5. MATRIZ DE ROLES Y RESPONSABILIDADES (RACI BS-PT-002)

Para la ejecución de pruebas de permisos, seguridad y flujos de aprobación, se deben considerar los siguientes perfiles institucionales:

| Rol Institucional | Abreviatura | Responsabilidad Principal en el Módulo |
| :--- | :---: | :--- |
| **Ordenador del Gasto** | **OG** | Máxima autoridad delegada; aprueba CDP/RP, designa comités y supervisores, adjudica, firma contratos y liquidaciones. |
| **Jefe Dependencia Solicitante** | **JDS** | Radica la necesidad, aprueba estudios previos y análisis del sector; gestiona novedades contractuales. |
| **Gestor Contratación Dependencia** | **GCD** | Operador de la dependencia; redacta estudios previos, carga soportes y diligencia listas de chequeo. |
| **Director de Contratación** | **DC** | Revisa y aprueba términos de referencia, pliegos, resoluciones de apertura y minutas. |
| **Profesional Dir. Contratación** | **PDC** | Abogado asignado; elabora proyectos de pliegos, minutas, proyecta respuestas a observaciones y actos. |
| **Director Financiero / Presupuesto** | **DF** | Valida imputación presupuestal, expide y anula CDPs y Registros Presupuestales (RP). |
| **Jefe Talento Humano** | **JTH** | Revisa solicitudes y expide el Certificado de Inexistencia de Personal de Planta (vital para PSPAG). |
| **Jefe Oficina Asesora Planeación** | **OAP** | Verifica y certifica la inclusión de la adquisición en las líneas y metas del PAA. |
| **Comité Asesor Evaluador** | **CAE** | Equipo interdisciplinario (Jurídico, Técnico, Financiero); evalúa propuestas y emite informes. |
| **Supervisor / Interventor** | **SUP** | Realiza control técnico, administrativo y financiero; aprueba pagos (`BS-FO-025`) y proyecta liquidación. |
| **Contratista / Proponente** | **CTR** | Postula ofertas, aporta subsanaciones, firma contrato, aporta pólizas y radica cuentas de cobro. |

---

## 6. CATÁLOGO MAESTRO DE FORMATOS SIG ESAP

| Código SIG | Nombre Oficial del Formato | Tipo de Documento | Uso Principal en el Módulo |
| :--- | :--- | :--- | :--- |
| **BS-FO-004** | Aprobación de garantía | Formato SIG ESAP | Verificación y aprobación de pólizas en Etapa 8 y modificaciones. |
| **BS-FO-005** | Lista de chequeo – Prestación de servicios prof. (PJ) | Formato SIG ESAP | Control documental previo y posterior a contratación personas jurídicas. |
| **BS-FO-006** | Lista de chequeo – Subasta inversa | Formato SIG ESAP | Verificación documental para selección abreviada por subasta inversa. |
| **BS-FO-007** | Lista de chequeo – Mínima cuantía | Formato SIG ESAP | Expediente de mínima cuantía. |
| **BS-FO-008** | Lista de chequeo – PSPAG (Persona Natural) | Formato SIG ESAP | Control obligatorio para contratos de prestación de servicios profesionales. |
| **BS-FO-009** | Acta de terminación por mutuo acuerdo | Formato SIG ESAP | Terminación anticipada voluntaria entre las partes. |
| **BS-FO-017** | Consolidado de evaluación definitiva | Formato SIG ESAP | Ponderación final de puntajes para adjudicación. |
| **BS-FO-022** | Acta de inicio | Formato SIG ESAP | Perfeccionamiento del inicio formal de labores con el supervisor. |
| **BS-FO-025** | Informe de supervisión y solicitud de pago | Formato SIG ESAP | Habilitación de desembolsos periódicos y soporte de cuenta de cobro. |
| **BS-FO-028** | Lista de chequeo – Concurso de méritos | Formato SIG ESAP | Expediente para consultorías y estudios técnicos. |
| **BS-FO-036** | Lista de chequeo – Licitación pública | Formato SIG ESAP | Verificación integral de expedientes licitatorios. |
| **BS-FO-044** | Lista de chequeo – Contratación interadministrativa | Formato SIG ESAP | Control para contratos/convenios con otras entidades públicas. |
| **BS-FO-046** | Estudios previos – PSPAG (Persona Natural) | Formato SIG ESAP | Insumo obligatorio para contratación directa de personas naturales. |
| **BS-FO-049** | Solicitud modificación al Plan Anual de Adquisiciones | Formato SIG ESAP | Trámite de inclusión, ajuste o cancelación de líneas PAA. |
| **BS-FO-051** | Acta de cierre del expediente contractual | Formato SIG ESAP | Constancia formal del archivo y culminación de obligaciones. |
| **BS-FO-054** | Paz y salvo de supervisión | Formato SIG ESAP | Requisito previo para el último pago o liquidación. |
| **BS-FO-058** | Evaluación de documentos jurídicos habilitantes | Formato SIG ESAP | Calificación de capacidad jurídica de oferentes. |
| **BS-FO-059** | Solicitud de modificación contractual | Formato SIG ESAP | Trámite para adiciones, prórrogas, suspensiones o cesiones. |
| **BS-FO-060** | Acta de liquidación de contratos y/o convenios | Formato SIG ESAP | Finiquito económico y técnico del contrato bilateral. |
| **BS-FO-063** | Lista de chequeo – Selección abreviada menor cuantía | Formato SIG ESAP | Control del proceso de SAMC. |
| **BS-FO-064** | Lista de chequeo – Acuerdo Marco de Precios (CCE) | Formato SIG ESAP | Compras por Tienda Virtual del Estado Colombiano (TVEC). |

---

## 7. MATRIZ DE BRECHAS Y PUNTOS CRÍTICOS A AUDITAR EN QA

Al realizar pruebas en el ambiente QA, prestar especial atención a los siguientes 10 focos identificados en la matriz de brechas institucional:

1. **Gestión de CDP sin formato único (Brecha #1):** El sistema debe permitir radicar la solicitud presupuestal y capturar el número de CDP oficial de KLIC/SIIF sin bloquear el flujo por falta de plantilla física.
2. **Validación de ARL en PSPAG (Brecha #2):** El sistema debe hacer obligatorio el campo/soporte de afiliación a riesgos laborales para personas naturales antes de habilitar el acta de inicio.
3. **Certificado de Inexistencia de Planta (Brecha #4):** Verificar si el rol de Talento Humano expide este certificado de forma nativa o si se adjunta como soporte PDF.
4. **Matriz de Riesgos (Brecha #6):** Evaluar si el sistema implementa una matriz estructurada con cálculo de probabilidad x impacto (estándar CCE) o si se maneja como anexo descargable.
5. **Designaciones Automáticas (Brecha #8):** Auditar que los memorandos de designación de supervisores y comités evaluadores se generen automáticamente con los datos del proceso y no requieran redacción manual externa.
6. **Informes de Evaluación Consolidada (Brecha #9):** Validar si se genera un único informe consolidado (Isolución 5904) que unifica conceptos jurídicos, técnicos y económicos.
7. **Reglas de Garantías en Contratación Directa (Brecha #20):** Por ley y manual, en contratación directa las pólizas no son legalmente obligatorias a menos que el área estructuradora lo justifique. El sistema **no debe** exigir póliza obligatoria en CD salvo que se marque la casilla correspondiente.
8. **Subflujo para Bolsa Mercantil y TVEC (Brechas #32 y #35):** Verificar que para compras por TVEC / Tienda Virtual no se exijan pliegos ni audiencias de adjudicación estándar de licitación.
9. **Trazabilidad de Modificaciones Contractuales (Brecha #19):** Si hay una adición en dinero, el sistema debe exigir un nuevo CDP previo y actualizar el valor total acumulado del contrato (sin superar el límite legal del 50%).
10. **Desactivación de Accesos TIC en la Liquidación (Brecha #28):** Verificar que al emitir el paz y salvo / cierre de contrato, se genere la alerta o registro de control para desactivación de correos y permisos del contratista.

---

## 8. PLAN ESTÁNDAR DE CASOS DE PRUEBA (QA TEST SUITE)

Adoptando la estructura oficial del documento *«Gestión Infraestructura Plan Pruebas.docx»* de la Fábrica de Software ESAP, se establece la siguiente codificación: **`CP-GC-NNN`** (*Casos de Prueba - Gestión de Contratación*).

### Resumen de la Suite de Pruebas
| Grupo | Módulo / Funcionalidad | Rango de Casos | Tipo Principal |
| :---: | :--- | :---: | :--- |
| **G1** | Acceso, Autenticación y Control de Roles | `CP-GC-001` a `CP-GC-005` | Seguridad / Permisos |
| **G2** | Contratación Directa PSPAG (Etapa Precontractual) | `CP-GC-006` a `CP-GC-012` | Funcional Positivo / Negativo |
| **G3** | Presupuesto: Solicitud y Vinculación de CDP | `CP-GC-013` a `CP-GC-016` | Integración / Negocio |
| **G4** | Perfeccionamiento, Legalización y Garantías | `CP-GC-017` a `CP-GC-022` | Funcional / Validaciones |
| **G5** | Ejecución, Informes de Supervisión y Pagos | `CP-GC-023` a `CP-GC-028` | Funcional / Flujo |
| **G6** | Modificaciones Contractuales (Adición y Prórroga) | `CP-GC-029` a `CP-GC-034` | Reglas de Negocio / Cálculos |
| **G7** | Liquidación, Cierre y Archivo del Expediente | `CP-GC-035` a `CP-GC-040` | Funcional / Integración E2E |

---

### Detalle de Casos de Prueba Clave

#### `CP-GC-001`: Acceso con credenciales de Administrador en ambiente QA
- **Funcionalidad:** Acceso y autenticación
- **Rol:** Administrador / Superuser
- **Tipo / Prioridad:** Funcional – positivo · Prioridad Alta
- **Objetivo:** Verificar que el usuario administrador puede autenticarse satisfactoriamente y visualizar el módulo de Contratación.
- **Precondiciones:** Plataforma disponible en `https://esap-qa.fabricasoftware.co/`.
- **Datos de prueba:** Usuario: `superuser@esap.edu.co` | Contraseña: `Esap.2026*`
- **Pasos:**
  1. Abrir el navegador e ingresar a la URL del ambiente QA.
  2. Digitar el usuario y contraseña suministrados.
  3. Hacer clic en «Iniciar Sesión».
  4. Navegar por el menú lateral buscando el módulo «Gestión de Contratación» o «Contratación».
- **Resultado esperado:** Acceso exitoso, visualización del Dashboard institucional y acceso sin restricciones a los submenús del módulo.
- **Postcondiciones:** Sesión de superusuario iniciada.

#### `CP-GC-002`: Validación de Matriz de Permisos por Rol (Seguridad)
- **Funcionalidad:** Gestión de permisos y perfiles
- **Rol:** Gestor Contratación vs. Ordenador del Gasto
- **Tipo / Prioridad:** Seguridad funcional · Prioridad Alta
- **Objetivo:** Validar que un usuario sin rol de Ordenador del Gasto no tenga habilitada la opción de adjudicación o firma de contratos.
- **Precondiciones:** Usuarios configurados con los perfiles `Gestor Contratación Dependencia` y `Ordenador del Gasto`.
- **Pasos:**
  1. Iniciar sesión como Gestor de Contratación.
  2. Abrir un proceso en estado «Listo para Adjudicar».
  3. Verificar visibilidad de botones de acción decisoria.
- **Resultado esperado:** Los botones «Adjudicar», «Firmar Contrato» o «Aprobar Liquidación» deben estar deshabilitados o no visibles.

#### `CP-GC-006`: Radicación de Estudios Previos para PSPAG (Persona Natural)
- **Funcionalidad:** Estudios Previos - Contratación Directa
- **Rol:** Gestor Contratación / Jefe Dependencia
- **Tipo / Prioridad:** Funcional – positivo · Prioridad Alta
- **Objetivo:** Registrar un proceso de contratación de servicios profesionales diligenciando los campos obligatorios del formato `BS-FO-046`.
- **Precondiciones:** CDP disponible y línea PAA identificada.
- **Datos de prueba:** Objeto contractual, plazo en meses (ej: 10 meses), valor mensual y valor total, requisitos de idoneidad, perfil académico.
- **Pasos:**
  1. Ingresar a «Nuevo Proceso Contractual».
  2. Seleccionar modalidad «Contratación Directa - PSPAG Persona Natural».
  3. Completar formulario de Estudios Previos.
  4. Adjuntar o registrar Matriz de Riesgos y Certificado de Inexistencia de Planta.
  5. Enviar a revisión de la Dirección de Contratación.
- **Resultado esperado:** El sistema genera el identificador único del proceso, cambia el estado a «En Revisión Jurídica» y emite constancia con lista de chequeo `BS-FO-008`.

#### `CP-GC-014`: Validación presupuestal - Imposibilidad de avanzar sin CDP suficiente (Negativo)
- **Funcionalidad:** Vinculación de CDP
- **Rol:** Gestor Contratación
- **Tipo / Prioridad:** Funcional – negativo · Prioridad Alta
- **Objetivo:** Comprobar que el sistema rechaza un proceso si el valor estimado en el estudio de mercado supera el saldo disponible del CDP.
- **Datos de prueba:** Valor del contrato: $50.000.000 COP | Saldo del CDP: $40.000.000 COP.
- **Pasos:**
  1. Asociar un CDP con saldo menor al valor total del proceso.
  2. Intentar guardar o avanzar a la siguiente etapa de aprobación.
- **Resultado esperado:** El sistema bloquea el avance y despliega una alerta clara: *«El valor estimado supera la disponibilidad presupuestal del CDP asignado»*.

#### `CP-GC-020`: Aprobación de Garantías y Verificación de ARL
- **Funcionalidad:** Perfeccionamiento y Legalización
- **Rol:** Profesional Dir. Contratación
- **Tipo / Prioridad:** Funcional – positivo · Prioridad Alta
- **Objetivo:** Verificar que el sistema permita registrar y validar la póliza contractual (`BS-FO-004`) y la manifestación de afiliación a ARL del contratista.
- **Pasos:**
  1. Ingresar al contrato suscrito en estado «Por Legalizar».
  2. Cargar número de póliza, aseguradora, vigencias y amparos (cumplimiento, salarios, calidad).
  3. Cargar constancia de afiliación a la ARL.
  4. Aprobar garantías.
- **Resultado esperado:** El contrato pasa a estado «Legalizado / En Espera de Inicio» y se notifica automáticamente al supervisor designado.

#### `CP-GC-024`: Presentación y Aprobación de Informe de Supervisión y Pago (`BS-FO-025`)
- **Funcionalidad:** Ejecución y Trámite de Pagos
- **Rol:** Supervisor / Interventor
- **Tipo / Prioridad:** Funcional – positivo · Prioridad Alta
- **Objetivo:** Registrar el cumplimiento de actividades del periodo, avalar la planilla de seguridad social y autorizar el pago mensual.
- **Pasos:**
  1. Ingresar con rol de Supervisor al expediente contractual.
  2. Crear nuevo informe en la pestaña «Supervisión».
  3. Ingresar periodo evaluado, porcentaje de avance (ej: 10%), certificación de cumplimiento y soporte de pago de aportes (Planilla PILA).
  4. Firmar y remitir a la Dirección Financiera.
- **Resultado esperado:** Se genera el formato `BS-FO-025`, el estado del pago cambia a «Autorizado para Desembolso» y queda trazabilidad cronológica en el expediente.

#### `CP-GC-030`: Regla de Negocio - Control de Adición Presupuestal máxima del 50%
- **Funcionalidad:** Modificaciones Contractuales
- **Rol:** Jefe Dependencia / Profesional Contratación
- **Tipo / Prioridad:** Regla de negocio / Negativo · Prioridad Alta
- **Objetivo:** Verificar que el sistema impida adiciones económicas que superen el 50% del valor inicial del contrato (Ley 80 de 1993, Art. 40).
- **Datos de prueba:** Contrato inicial: $100.000.000 COP. Intento de adición: $55.000.000 COP (55%).
- **Pasos:**
  1. Solicitar modificación contractual tipo «Adición Presupuestal».
  2. Ingresar un monto equivalente al 55% del contrato.
  3. Intentar guardar la solicitud.
- **Resultado esperado:** El sistema bloquea la operación y notifica: *«La adición supera el límite legal del 50% del valor inicial del contrato ($50.000.000 COP)»*.

#### `CP-GC-036`: Flujo Extremo a Extremo de Liquidación y Cierre Contractual
- **Funcionalidad:** Liquidación y Cierre
- **Rol:** Supervisor y Ordenador del Gasto
- **Tipo / Prioridad:** Integración E2E · Prioridad Alta
- **Objetivo:** Completar el ciclo de vida del contrato generando el Acta de Liquidación (`BS-FO-060`) y el Acta de Cierre (`BS-FO-051`).
- **Pasos:**
  1. Verificar que se hayan tramitado todos los pagos del contrato y no existan saldos pendientes sin justificar.
  2. Generar el Acta de Liquidación Bilateral con cruce de cuentas financiero (valor ejecutado vs. pagado vs. liberado).
  3. Cargar las firmas del contratista y del Ordenador del Gasto.
  4. Emitir el Acta de Cierre definitivo del expediente.
- **Resultado esperado:** El estado final del contrato pasa a «Liquidado y Cerrado», se deshabilitan modificaciones posteriores y el expediente pasa a custodia histórica.

---

## 9. CICLO DE REPORTES DE DEFECTOS (BUG TRACKING)

Todo defecto detectado en QA debe ser registrado con la siguiente plantilla estandarizada:

```markdown
### [BUG-GC-NNN] Título descriptivo y concreto del defecto
- **Severidad:** Crítica | Alta | Media | Baja
- **Prioridad:** P1 (Bloqueante) | P2 (Urgente) | P3 (Normal) | P4 (Baja)
- **Módulo / Etapa:** (ej: Etapa 8 - Perfeccionamiento / ARL)
- **Rol Ejecutor:** (ej: Profesional Dir. Contratación)
- **URL / Pantalla:** https://esap-qa.fabricasoftware.co/...
- **Datos de Prueba Utilizados:** (IDs de contrato, cédulas, números de CDP)
- **Pasos para Reproducir:**
  1. ...
  2. ...
  3. ...
- **Resultado Obtenido (Fallo):** Lo que el sistema hizo incorrectamente.
- **Resultado Esperado:** Lo que el Manual de Contratación / Procedimiento BS-PT-002 exige.
- **Soporte Normativo / SIG:** (ej: Resolución SC-1559 Art. 4.2 / Formato BS-FO-004)
- **Evidencia Adjunta:** Captura de pantalla, respuesta JSON o log de consola.
```

---

## 10. SNIPPET DE TRASPASO DIRECTO (PROMPT PARA NUEVOS CHATS)

> *Copia y pega el siguiente bloque en un nuevo chat para transferir todo el contexto al instante:*

```text
Actúa como Senior QA Lead del Módulo de Gestión de Contratación de la ESAP (Plataforma Comunidadesap / SuperApp ESAP).

Acceso QA:
- URL: https://esap-qa.fabricasoftware.co/
- Usuario: superuser@esap.edu.co (Administrador)
- Clave: Esap.2026*

Insumos oficiales de consulta:
1. Matriz & Brechas: c:\Users\juanc\Downloads\Trazabilidad_Formatos_Matriz_Flujo_Contratacion.xlsx
2. Estándar Plan de Pruebas: c:\Users\juanc\Downloads\Gestion Infraestructura Plan Pruebas.docx
3. Flujo y Alcance: c:\Users\juanc\Downloads\Flujo_Contratación_09072026.pptx
4. Manual Contratación (Res. SC-1559/2025): c:\Users\juanc\Downloads\2025-08-29RESOL1559MANUALDECONTRATACIONESAP2025.pdf
5. Dossier Maestro QA: docs/qa/DOSSIER_QA_MODULO_CONTRATACION_ESAP.md

Directrices clave:
- Marco: Ley 80/1993, Ley 1150/2007, Dec 1082/2015, Res SC-1559/2025, Proc BS-PT-002 v2.
- Fases 1 (Necesidades) y 2 (PAA) están fuera de alcance de desarrollo en Fase 1.
- Prioridad #1: Contratación Directa - PSPAG (Prestación de Servicios Profesionales Persona Natural).
- Nomenclatura de casos: CP-GC-NNN y defectos BUG-GC-NNN.
- Control de formatos SIG (BS-FO-046, BS-FO-004, BS-FO-025, BS-FO-059, BS-FO-060, etc.).
Ayúdame a continuar con el aseguramiento de calidad, diseño o ejecución de casos de prueba.
```

