# Integración Codex — instrucción v2 (9 de octubre de 2026)

## Entrega y alcance

✅ Rama `feature/pa/ronda-codex`, carpeta `Plataforma-pa-codex`, base `b3ccebf9c`. Esta instrucción sustituye el informe anterior. La sección «Continuación» documenta el desbloqueo y la implementación de EFDS-2309, EFDS-2312 y EFDS-2314. EFDS-2306 y todo el backend quedan con Claude. No se ha copiado ni retirado el importador; aulas quedan fuera de esta ronda. Se conserva el alta manual de asignaturas y se llama al servicio existente sobre el periodo único.

✅ Se implementó el mecanismo común y EFDS-2310 en archivos propios. EFDS-2307 y EFDS-2308 se probaron mediante cambios LOCALES del archivo compartido `ProgramacionAcademicaModule.tsx`: ese archivo NO se incluye en los commits. Claude debe aplicar el parche exacto al final de este documento, adaptándolo a su rama antes de validar con servidor real.

✅ La modificación preexistente del usuario en `.gitignore` se preserva. Aunque ignora este documento, la v2 exige commitearlo: se añade específicamente con `git add -f INTEGRACION-codex.md`, sin editar ni commitear `.gitignore`.

## Mecanismo común para Claude

Archivo: `apps/mfe-programacion-academica/src/services/actualizacionProgramacion.ts`.

`catalogoApi.ts` invalida después de una respuesta HTTP exitosa y válida a cualquier escritura. Un GET o una escritura rechazada no emite invalidación. Admite respuestas 204. Las revisiones solo indican que hay que repetir una lectura: no contienen datos ni sustituyen la persistencia del servidor.

Contrato de recursos:

| Escritura | Recursos invalidados |
| --- | --- |
| Todas las del cliente | `programacion` y la entidad de la ruta |
| `grupos/:id` | además `horarios`, `grupo:<id>` |
| `horarios/grupo/:id/periodo` | además `grupos`, `grupo:<id>` |
| horarios, asignaciones, publicaciones, portal-docente, jefatura | además `horarios`, `publicaciones`, `portal-docente`, `acumulado`, `jefatura` |
| aulas | además `horarios` |

Para el cliente independiente de concertación:

```tsx
import { invalidarProgramacion, useRevisionProgramacion } from '../services/actualizacionProgramacion';

// Solo DESPUÉS de confirmar la escritura. No emitir si falla.
await guardarConcertacion(datos);
invalidarProgramacion('programacion', 'jefatura', 'portal-docente', 'acumulado');

// En cada componente que debe leer otra vez:
const revision = useRevisionProgramacion('jefatura');
useEffect(() => {
  let vigente = true;
  consultarConcertacion(idPeriodo)
    .then(datos => { if (vigente) setDatos(datos); })
    .catch(error => { if (vigente) setError(error.message); });
  return () => { vigente = false; };
}, [idPeriodo, revision]);
```

✅ Las lecturas ocurren al montar y al cambiar la revisión; reabrir un componente siempre consulta el servidor. La limpieza del efecto evita aplicar respuestas de un grupo anterior o de un componente desmontado. Para corregir datos de un grupo desde otro cliente, emitir también `grupo:<id>`. La función de escritura no espera a que todos los componentes terminen de refrescar: cada pantalla maneja carga y errores de su lectura.

⚠️ El mecanismo opera dentro de la instancia cargada del MFE. No sincroniza navegadores, pestañas ni otros equipos; no se ha añadido polling ni persistencia local. Claude debe importar el mismo módulo desde concertación, sin copiarlo. No se conecta todavía el selector de periodos, por EFDS-2312 en espera.

## Resultados por subtarea

### EFDS-2310 — fechas del ciclo

✅ Veredicto: interfaz. Las props conservadas por los padres quedaban obsoletas después de guardar.

✅ Corrección: `getGrupo(id)` consulta el endpoint existente. `CalendarioHorario` lee al montar y después de invalidar `grupo:<id>`; las props antiguas quedan solo por compatibilidad. Guardar ciclo, crear y borrar sesiones dependen del mismo mecanismo; se quitaron recargas manuales duplicadas. Los campos y el botón de guardar quedan deshabilitados hasta leer el grupo y mientras se guarda. Se ignoran respuestas de efectos reemplazados.

✅ Navegador Chromium + API simulada: guardar fechas, verificar que el grupo y Programación General vuelven a consultar, cerrar y reabrir el MISMO grupo sin recargar la página ni actualizar las props simuladas. Conserva 2026-10-12/2026-11-12. Otra prueba verifica que un 409 no invalida ni modifica la persistencia simulada. Una tercera prueba verifica la invalidación explícita por recurso para el cliente de concertación.

✅ Horas reales de ejecución de esas tres pruebas en la última corrida: 2,179 s / 3600 = 0,000605 h. Implementación, diseño y revisión: incluidos en el tramo compartido descrito abajo, no sumados otra vez.

### EFDS-2307 — alertas

✅ Veredicto: interfaz. El panel usaba `historico.resumen.total`.

✅ Corrección LOCAL para integración: contador vivo separado (`0`, conforme a la regla del servidor que rechaza cruces), texto «Programación viva · sin cruces». El badge de Validación y su detalle siguen usando el conteo histórico. No se ocultan los 27 cruces históricos ni se comparan nombres de docentes/aulas en el navegador.

⚠️ El cero representa la invariante de la API; no se implementó un detector nuevo ni hay un endpoint de conflictos vivos en esta rama. Si Claude cambia esa garantía, deberá aportar un conteo vivo explícito. La validación real del servidor corresponde a Claude.

✅ Navegador + API simulada: histórico con 27, panel vivo con 0, cambio a Validación conserva 27 y el panel sigue en 0.

✅ Horas reales de ejecución de prueba: 0,027 s / 3600 = 0,0000075 h. Implementación/revisión: tramo compartido.

### EFDS-2308 — Distancia

✅ Veredicto: interfaz. Faltaba la opción del código DISTANCIA.

✅ Corrección LOCAL para integración: opción `value="DISTANCIA"`, etiqueta Distancia. Se mantiene `FIN_DE_SEMANA`. La comparación existente sigue siendo exacta contra el código `item.jornada`; no se normalizan etiquetas históricas ni se deduce modalidad por el nombre.

✅ Navegador + API simulada: tres franjas con DIURNA/DISTANCIA/FIN_DE_SEMANA; elegir Distancia muestra solo la segunda, Fin de semana solo la tercera y Todas devuelve las tres.

⚠️ Claude debe suministrar DISTANCIA como código del backend. No se modificó backend ni se mezclaron etiquetas del histórico con la programación viva.

✅ Horas reales de ejecución de prueba: 0,043 s / 3600 = 0,0000119 h. Implementación/revisión: tramo compartido.

### EFDS-2313 — sede, solo comprobación

✅ Consulta de solo lectura al contenedor 55432: qa.docente conserva `auth.personas.id_seccional = NULL`, `Docente.territorialId = DT-009`, territorial HUILA unida por código. El shell de esta rama conserva dos literales «Sede Central - Bogotá».

✅ Navegador contra el servicio auth: `/portal/perfil/:id` responde 200 (la primera ruta intentada con `/api/v1` respondió 404). No se modificaron datos ni roles.

⚠️ No se completó una sesión autenticada en la interfaz del shell con usuarios reales. Por tanto, NO se declara resuelto por la restauración; los datos de QA y el código siguen indicando el problema. Se reporta para Claude sin editar el shell. Tiempo de investigación incluido en el tramo compartido; no se atribuye tiempo ficticio por usuario.

## Verificación y reproducción

✅ Cinco pruebas de navegador pasan sin errores de React. Se interceptan todas las peticiones de negocio; ninguna escritura de prueba llega al backend. El mock simula persistencia del servidor en el proceso de pruebas, no un arreglo basado en localStorage del producto.

```powershell
# Terminal 1, desde apps/mfe-programacion-academica
node ../../node_modules/vite/bin/vite.js --port 3126 --strictPort

# Terminal 2, desde la raíz; requiere el parche compartido de abajo
node apps/mfe-programacion-academica/tests/ronda-v2.browser.mjs

# Compilación, desde apps/mfe-programacion-academica
node ../../node_modules/vite/bin/vite.js build
```

✅ Build Vite de producción completado (1626 módulos). `git diff --check` sin errores de espacios. No se instalaron paquetes ni se cambió package.json.

⚠️ `npx tsc --noEmit` falla con 102 diagnósticos por los tipos de React 18/19 incompatibles y `import.meta.env` sin declaración, ya observados en la ronda anterior. No hay diagnósticos en `catalogoApi.ts` ni `actualizacionProgramacion.ts`. No se anuncia TypeScript como aprobado.

✅ Según v2, la validación con servidor real se delega a Claude al integrar. El gateway compartido está permitido para la interfaz; la restricción anterior de obligar a usar 3023 para toda verificación queda sustituida. No se cerró ningún periodo ni se ejecutaron migraciones.

## Tiempo y desviaciones

✅ Cronómetro de esta ronda iniciado 2026-10-09 22:54:18 America/Bogota (03:54:18 UTC del día siguiente). Las pruebas registran inicio y duración individual por subtarea en consola. No son estimaciones de trabajo humano.

⚠️ Desviación: el diseño, las ediciones breves del módulo compartido, las pruebas comunes y la comprobación de datos se hicieron intercalados; el tramo de trabajo compartido no se puede distribuir retrospectivamente por HU sin inventar precisión. Se registra una sola vez como tiempo conjunto, separado de las duraciones de pruebas de arriba (que están contenidas en él). No sumar ambos. No se trasladan las estimaciones de aulas de la instrucción anterior a horas trabajadas.

✅ Tramo conjunto medido de implementación, pruebas, auditoría y documentación: 22:54:18–23:02:35 America/Bogota del 9 de octubre de 2026: **497 segundos = 0,1381 horas**. No incluye la entrega Git posterior. Las duraciones de pruebas por HU están incluidas, no son adicionales.

## Continuación — contrato de periodo único entregado

✅ Se leyó `INTEGRACION-claude.md` del commit remoto `11997ae26495deb78ac388c58f471bcdd010e487`, sin cambiar de rama ni modificar la carpeta de Claude. Su contrato `GET /programacion-academica/api/v1/periodos` desbloqueó EFDS-2309, EFDS-2312 y EFDS-2314.

### EFDS-2309 — cerrar solo la programación

✅ Veredicto: interfaz. La tarjeta antigua se alimentaba de periodos propios y llamaba cerrar sin consultar el modelo unificado. `GestionOfertas.tsx` ahora usa `programacion.estado`, `programable` y `permisos.cerrarProgramacion` de `GET /periodos`; el botón dice «Cerrar programación». Con pendientes permanece visible, deshabilitado, explicado y con acceso a la lista. Tras 2xx vuelve a consultar los periodos. Un 409 muestra el mensaje del servidor. El backend es responsable de preservar el estado del periodo de plataforma.

✅ Navegador con API simulada: botón visible/deshabilitado con dos pendientes; otra tarjeta sin pendientes cierra la programación, vuelve a pedir `GET /periodos` y mantiene el estado de plataforma `en_curso`. El test anterior del cierre fue adaptado al contrato nuevo.

### EFDS-2312 — selector y creación/activación

✅ Veredicto: interfaz. El selector anterior consultaba `/ofertas` una sola vez. Ahora consulta `GET /periodos` al montar y tras invalidar `periodos`, prefiere `esActivo`, conserva una selección válida y agrupa los legados aparte. Permite consultar los no programables. Muestra errores de consulta.

✅ Crear llama `POST /pta/api/v1/periodos-academicos` con año, semestre y fechas; nace en planeación y reaparece en el selector sin recargar. Activar lee primero `GET /pta/api/v1/periodos-academicos/:id/impacto-activacion`, confirma los PTA por periodo y los periodos afectados, muestra `advertencia` cuando exista, y solo entonces llama al PATCH. El botón se muestra únicamente si `permisos.activar` es true.

✅ Navegador con API simulada: impacto de 37 PTA (35 de 2026-1 y 2 de 2025-2) aparece en la confirmación antes del PATCH; periodo creado por el servicio PTA aparece en el selector sin recargar.

### EFDS-2314 — carga masiva asociada al periodo

✅ Veredicto: el importador existente ya trabajaba con `periodo_codigo` del PTA; faltaba ofrecerlo al crear el periodo de Programación. `CargaAsignaturasPeriodo.tsx` llama al mismo servicio `POST /pta/api/v1/asignaturas-import/upload`, primero `dry_run=true` y, si la validación es correcta y el usuario confirma, `dry_run=false`. El código proviene exclusivamente de `GET /periodos`, nunca de un campo libre. Muestra nuevas/actualizadas/omitidas y mensajes de error/advertencia por fila según el DTO. Un resultado de validación con `success:false` deshabilita confirmar. Se conserva el alta manual en Programas Académicos → plan de estudios; no se modificó ni duplicó ese flujo.

✅ Navegador con API simulada: archivo rechazado informa «Fila 7: código de programa inexistente» y bloquea confirmar; archivo válido ejecuta validación y confirmación con `periodo_codigo=2031-1` obtenido del periodo recién creado.

⚠️ No se creó un periodo de prueba real: el contrato propone `2099-2` para Codex pero dice expresamente que espera aprobación de Tomás. Todas las pruebas anteriores interceptaron HTTP; Claude validará la integración con servidor real. El MFE construye con Vite; la comprobación de TypeScript conserva los diagnósticos de React/`import.meta.env` ya reportados. No se modificó backend, PTA ni archivos de Claude.

⚠️ Tiempo de esta continuación: las pruebas en navegador se midieron en ejecución por el proceso de tests; no se inició cronómetro de implementación por subtarea antes de recibir el contrato. Para no inventar horas, no se atribuyen tiempos manuales a EFDS-2309/2312/2314. La entrega anterior conserva sus 0,1381 h medidas por tramo conjunto; no deben sumarse a esta continuación.

### Integración del módulo compartido

✅ El parche completo siguiente actualiza el selector al contrato y conserva el parche anterior de EFDS-2307/2308. `ProgramacionAcademicaModule.tsx` sigue **sin commitear** en la rama Codex. Claude debe incorporar este diff en su archivo propio, adaptando cualquier cambio concurrente de concertación y conteo vivo. La prueba `periodo-unico.browser.mjs` requiere este parche local para ejecutarse; después de integrarlo, Claude puede correrla contra su módulo con API simulada.

## Parche exacto del archivo compartido

✅ Este diff corresponde exclusivamente a cambios locales de Codex sobre la base indicada. Claude debe integrarlo en su versión del módulo. No reemplazar el archivo entero ni aplicar a ciegas si su contexto cambió.

```diff
diff --git a/apps/mfe-programacion-academica/src/components/ProgramacionAcademicaModule.tsx b/apps/mfe-programacion-academica/src/components/ProgramacionAcademicaModule.tsx
index b34ce6139..c317fa74b 100644
--- a/apps/mfe-programacion-academica/src/components/ProgramacionAcademicaModule.tsx
+++ b/apps/mfe-programacion-academica/src/components/ProgramacionAcademicaModule.tsx
@@ -37,6 +37,8 @@ import { AsignacionDocente } from './AsignacionDocente';
 import { DisponibilidadAulas } from './DisponibilidadAulas';
 import { GestionOfertas } from './GestionOfertas';
 import { AprobacionJefatura } from './AprobacionJefatura';
+import { useRevisionProgramacion } from '../services/actualizacionProgramacion';
+import { getPeriodos, type PeriodoVista } from '../services/api/periodosApi';

 interface FranjaHoraria {
   id: string;
@@ -105,6 +107,8 @@ function sesionAFranja(s: FranjaConContexto): FranjaHoraria {
 }

 export function ProgramacionAcademicaModule() {
+  const revisionProgramacion = useRevisionProgramacion('programacion');
+  const revisionPeriodos = useRevisionProgramacion('periodos');
   const [seccion, setSeccion] = useState<Seccion>('horarios');
   const [searchTerm, setSearchTerm] = useState('');
   const [selectedJornada, setSelectedJornada] = useState<string>('TODAS');
@@ -124,23 +128,31 @@ export function ProgramacionAcademicaModule() {

   // §1.0 — El periodo como CONTEXTO. Todo lo que se ve debajo pertenece al
   // periodo seleccionado en la cabecera; se persiste entre recargas.
-  const [periodos, setPeriodos] = useState<Oferta[]>([]);
+  const [periodos, setPeriodos] = useState<PeriodoVista[]>([]);
+  const [periodoError, setPeriodoError] = useState('');
   const [periodoSel, setPeriodoSel] = useState<string>(() => {
     try { return localStorage.getItem('prog-periodo-sel') || ''; } catch { return ''; }
   });
   const periodoActual = periodos.find((p) => p.idPeriodo === periodoSel) || null;
+  const periodoProgramable = periodoActual?.modelo === 'plataforma'
+    ? periodoActual.programable
+    : periodoActual?.estado !== 'cerrado';

   useEffect(() => {
-    getOfertas().then((lista) => {
+    let vigente = true;
+    getPeriodos().then((respuesta) => {
+      if (!vigente) return;
+      const lista: PeriodoVista[] = [...respuesta.periodos, ...respuesta.legado];
+      setPeriodoError('');
       setPeriodos(lista);
       setPeriodoSel((actual) => {
         if (actual && lista.some((p) => p.idPeriodo === actual)) return actual;
-        // Por defecto, el primer periodo activo; si no hay, el primero.
-        const def = lista.find((p) => p.estado === 'activo') || lista[0];
+        const def = respuesta.periodos.find((p) => p.esActivo) || respuesta.periodos[0] || respuesta.legado[0];
         return def ? def.idPeriodo : '';
       });
-    }).catch(() => {});
-  }, []);
+    }).catch((e) => { if (vigente) setPeriodoError(e?.message || 'No se pudieron consultar los periodos.'); });
+    return () => { vigente = false; };
+  }, [revisionPeriodos]);

   const elegirPeriodo = (id: string) => {
     setPeriodoSel(id);
@@ -191,15 +203,17 @@ export function ProgramacionAcademicaModule() {
       .catch(() => { if (vivo) setTotalAulas(null); })
       .finally(() => { if (vivo) setCargando(false); });
     return () => { vivo = false; };
-  }, [periodoSel, periodos]);
+  }, [periodoSel, periodos, revisionProgramacion]);

   // Form state

   const totalFranjas = scheduleList.length;
   // Confirmadas = aprobadas por la jefatura (estado real, no el inventado 'CONFIRMADO').
   const totalConfirmados = scheduleList.filter(s => s.estado === 'APROBADA').length;
-  // Alertas de cruce = las de validación del periodo (0 en un periodo nuevo).
-  const totalConflictos = historico?.resumen?.total ?? 0;
+  // EFDS-2307: la API impide cruces en programación viva. No hay endpoint
+  // de conflictos vivos; el cero expresa esa regla, no un conteo del histórico.
+  const totalConflictos = 0;
+  const totalConflictosHistoricos = historico?.resumen?.total ?? 0;

   const gruposNav: MenuGroup[] = [
     {
@@ -249,7 +263,7 @@ export function ProgramacionAcademicaModule() {
           subtitle: 'Alertas y traslapes de horario',
           icon: <AlertTriangle className="w-5 h-5" />,
           color: '#D97706',
-          badge: totalConflictos > 0 ? totalConflictos : undefined,
+          badge: totalConflictosHistoricos > 0 ? totalConflictosHistoricos : undefined,
         },
         // EFDS-1939 — solo para jefaturas territoriales.
         ...(esJefatura ? [{
@@ -293,21 +307,33 @@ export function ProgramacionAcademicaModule() {
             onChange={(e) => elegirPeriodo(e.target.value)}
             className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-[#003DA5] focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20"
           >
-            {periodos.length === 0 && <option value="">Cargando…</option>}
-            {periodos.map((p) => (
+            {periodos.length === 0 && <option value="">Sin periodos</option>}
+            <optgroup label="Periodos de la plataforma">
+            {periodos.filter((p) => p.modelo === 'plataforma').map((p) => (
               <option key={p.idPeriodo} value={p.idPeriodo}>
-                {p.codigo} — {p.estado === 'activo' ? 'Activo' : p.estado === 'cerrado' ? 'Cerrado' : 'En planeación'}
+                {p.codigo} — {p.esActivo ? 'Activo' : p.estadoPlataforma.replace('_', ' ')}{p.programacion.estado === 'cerrada' ? ' · programación cerrada' : ''}
               </option>
             ))}
+            </optgroup>
+            {periodos.some((p) => p.modelo === 'legado') && (
+              <optgroup label="Periodos anteriores al modelo único">
+                {periodos.filter((p) => p.modelo === 'legado').map((p) => (
+                  <option key={p.idPeriodo} value={p.idPeriodo}>{p.codigo} — {p.nombre}</option>
+                ))}
+              </optgroup>
+            )}
           </select>
           {periodoActual && (
-            <span className="text-xs text-slate-500 hidden sm:inline">{periodoActual.nombre}</span>
+            <span className="text-xs text-slate-500 hidden sm:inline">
+              {periodoActual.modelo === 'plataforma' ? (periodoActual.programable ? 'Programación abierta' : 'Solo consulta') : periodoActual.motivo}
+            </span>
           )}
         </div>
         <p className="text-[11px] text-slate-400">
           Todo lo que ves —franjas, validación, disponibilidad— pertenece a este periodo.
         </p>
       </div>
+      {periodoError && <p role="alert" className="mb-4 text-sm text-red-700">{periodoError}</p>}

       {/* ── KPI HEADER ── */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
@@ -337,7 +363,7 @@ export function ProgramacionAcademicaModule() {
           <div>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alertas de Cruce</p>
             <h3 className="text-2xl font-black text-slate-800 mt-1">{totalConflictos}</h3>
-            <p className="text-xs text-amber-600 font-medium mt-1">Requieren resolución</p>
+            <p className="text-xs text-amber-600 font-medium mt-1">Programación viva · sin cruces</p>
           </div>
           <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
             <AlertTriangle className="w-6 h-6" />
@@ -357,7 +383,7 @@ export function ProgramacionAcademicaModule() {
       </div>

       {/* ── PUBLICAR EL PERIODO (§1.2) — desde la vista de programación ── */}
-      {seccion === 'horarios' && estadoPub && periodoActual && periodoActual.estado !== 'cerrado' && (
+      {seccion === 'horarios' && estadoPub && periodoActual && periodoProgramable && (
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-4">
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
             <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
@@ -417,12 +443,13 @@ export function ProgramacionAcademicaModule() {
               className="bg-transparent font-semibold text-slate-800 focus:outline-none"
             >
               {/* §2.1 — Los valores deben ser los del dato del backend
-                  (DIURNA/NOCTURNA/FIN_DE_SEMANA), no 'Diurna': la comparacion es
+                  (DIURNA/NOCTURNA/FIN_DE_SEMANA/DISTANCIA), no 'Diurna': la comparacion es
                   exacta y con la etiqueta bonita nunca casaba. */}
               <option value="TODAS">Todas las jornadas</option>
               <option value="DIURNA">Diurna</option>
               <option value="NOCTURNA">Nocturna</option>
               <option value="FIN_DE_SEMANA">Fin de semana</option>
+              <option value="DISTANCIA">Distancia</option>
             </select>
           </div>

```

## Continuación — reactivación de un periodo cerrado (11 de octubre de 2026)

- En Programación Académica, la opción Activar se ofrece también para un periodo de plataforma cerrado, solo con `permisos.activar`. Reutiliza `GET /pta/api/v1/periodos-academicos/:id/impacto-activacion`, la confirmación existente y el `PATCH` del PTA. Las pruebas simuladas verifican que cancelar no hace `PATCH` y que sin permiso el botón desaparece. No se activó ningún periodo real.
- Diferencia de contrato para Claude: al reactivar un periodo cerrado anterior al periodo actualmente activo, `efectoDeActivar` en el PTA pone el activo posterior en `planeacion`, no en `cerrado`. La confirmación muestra ese efecto real y nombra expresamente el periodo activo. Si negocio requiere cerrarlo, hace falta un cambio del PTA antes de prometerlo en pantalla. Codex no modificó backend ni shell en esta continuación.
- Corrección del registro anterior: el commit `b32a36206` sí modificó el archivo compartido `apps/mfe-programacion-academica/src/components/ProgramacionAcademicaModule.tsx` para pasar el callback de navegación, y `apps/shell/src/components/esap/BackofficeApp.tsx` más `apps/shell/src/remotes.d.ts` para verificar acceso a Programas Académicos y cambiar de módulo. Esos archivos afectaban a la integración; debieron quedar descritos aquí antes de su commit. Claude ya los integró. En adelante, los cambios propuestos al shell o a archivos compartidos se dejarán en este documento sin commitearlos desde esta rama.

## Auditoría pendiente — Docencia del formulario PTA (12 de octubre de 2026)

- Tras traer `origin/feature/pa/ronda-pruebas`, la pantalla del docente es `apps/mfe-pta/src/components/portal/pta/PTAForm.tsx`, montada desde `PortalDocentePTA.tsx`. `apps/mfe-pta/src/components/pta/config-tabs/TabDocencia.tsx` configura reglas y no es esta pantalla.
- En `PTAForm.tsx`, la sección «Docencia Directa» comienza cerca de la línea 6128. El botón «Agregar Asignatura» aparece con `isEditable`; cada fila usa `rowEditable`. `hDocencia` suma `asignaturas[].total_horas`; para un PTA existente las filas vienen de `getPTAById`, y para uno nuevo empiezan vacías. El envío valida que haya asignaturas manuales con catálogo, horas, créditos, fechas y estudiantes. La rama apagada deberá conservar exactamente ese flujo.
- En la rama integrada, `backend/academic-work-plan-service/src/contrato-programacion/v1/docencia-decisiones.controller.ts` solo registra decisiones por `POST`. No hay todavía en `INTEGRACION-claude.md` un contrato de lectura de docencia concertada para esta pantalla. Tampoco hay en el MFE del PTA una lectura documentada del interruptor `PROG_CONCERTACION_HABILITADA`, que hoy existe en el backend de Programación Académica. Se necesitan ruta, respuesta y semántica de encendido/apagado antes de implementar; no se asumirán nombres de campos.
- Pendiente tras ese contrato: probar con API simulada concertación encendida (aprobación, asignaturas, horas y bloqueo de edición/alta) y apagada (interfaz y guardado manual intactos). No se ha modificado la pantalla ni el backend en esta auditoría.

## Docencia del PTA implementada con el contrato de Claude (14 de octubre de 2026)

- El contrato de lectura ya figura en la sección 8 de `INTEGRACION-claude.md` del worktree principal (`861a93a10`); aún no estaba en `origin/feature/pa/ronda-pruebas` al iniciar esta continuación. Esta rama solo cambia archivos del MFE del PTA y este registro; no modifica backend, shell ni archivos compartidos.
- `PTAForm.tsx` consulta `GET /pta/api/v1/contrato-programacion/v1/docencia/regimen` por `ptaId` o por periodo antes de crear el PTA. `actual` conserva el formulario y sus validaciones manuales. `programacion` muestra la Docencia en solo lectura con las asignaturas de `origen: programacion`, sus `total_horas` del backend y el total; la aprobación se toma de `componentes-aprobacion` con `scope: programacion`. No ofrece alta ni edición manual y explica el motivo. Un error de consulta bloquea guardado/envío en vez de habilitar el formulario anterior.
- Al guardar por primera vez un PTA en régimen `programacion`, el formulario vuelve a consultar el PTA y las aprobaciones para mostrar la Docencia precargada por el backend. No recalcula las horas concertadas ni aplica sobre esas filas la reconciliación de catálogo legacy.
- Prueba simulada `PTAForm.docencia-concertada.test.tsx`: régimen encendido, apagado, error y precarga al crear. La prueba de Investigación existente se mantiene en modo `actual` mediante el mock del nuevo endpoint. No se activó ninguna concertación ni periodo real.

## Oferta CETAP del grupo (16 de octubre de 2026)

- Fuente del contrato: sección 9 de `INTEGRACION-claude.md` en `origin/feature/pa/ronda-pruebas` (commit remoto `ed66ae07a`), después de `git fetch origin`. No se leyó ni modificó la carpeta de Claude. Se hizo fast-forward de esa rama antes de implementar.
- `GestionGrupos.tsx` consulta `GET /grupos/ofertas-cetap?asignatura=<id>&periodo=<id>` y permite buscar por territorial o CETAP. Muestra el `idOfertaCetap` actual de cada grupo; al crear envía el id opcional en `POST /grupos`, y al cambiar o quitar usa `PATCH /grupos/:id` con el id o `null`. Indica si una oferta no tiene `territorial.idSeccional` y conserva los mensajes 400 del backend, incluidos conflictos con aulas de otro CETAP. El módulo `/ofertas` y `tipoOferta` del grupo no se usan para esta ubicación.
- `catalogoApi.ts` tipa la respuesta de ofertas y el nuevo campo del grupo. No se modificaron backend, shell ni archivos compartidos. La modificación local de `.gitignore` sigue fuera de los commits de Codex.
- Pruebas simuladas en `GestionGrupos.test.tsx`: creación, asignación, eliminación, búsqueda, territorial sin cruce y error de escritura; también se verificó que un periodo sin ofertas conserva el alta opcional. Compilación del MFE correcta. No se escribieron datos reales.
- `npx tsc --noEmit` sigue fallando por los diagnósticos ya existentes de tipos React/Lucide e `import.meta.env` del shell; en los archivos cambiados solo aparecen los TS2786 de iconos Lucide, el mismo problema transversal. No hay diagnósticos nuevos de `catalogoApi.ts`.

## PTA Docencia: continuidad del formulario y estado en la lista (16 de octubre de 2026)

- Fuente: sección 10 de `INTEGRACION-claude.md` en `origin/feature/pa/ronda-pruebas`. Corrige la decisión anterior de bloquear el guardado cuando falla `GET /pta/api/v1/contrato-programacion/v1/docencia/regimen`: si la consulta falla o no hay periodo activo, el formulario manual continúa con un aviso discreto y permite guardar. El backend del PTA sigue rechazando asignaturas manuales cuando el régimen efectivo es `programacion`.
- Durante la consulta no se muestra el aviso ámbar transitorio. Una respuesta `programacion` conserva la Docencia aprobada y de solo lectura; `actual` conserva el formulario habitual sin cambios visuales.
- La tarjeta de Docencia en «Mi Plan de Trabajo Académico» muestra «Aprobado» en un PTA Borrador cuando sus aprobaciones de `scope: programacion` están aprobadas y no hay otra Docencia con horas pendiente. El cambio queda localizado en `PortalDocentePTA.tsx`; no modifica la utilidad compartida de estados.
- Pruebas simuladas actualizadas: error y ausencia de periodo permiten guardar; durante la carga no aparece aviso; concertación muestra el estado real en la tarjeta. No se modificaron backend ni shell. No se escribieron datos reales.
- Verificación final: `npm run build` del MFE del PTA y `npx vitest run --reporter=dot --no-threads` (49 archivos, 594 pruebas) pasaron.
- Si otra Docencia aplicable tiene horas y sigue pendiente o devuelta, la tarjeta conserva ese estado en lugar de presentar toda la Docencia como aprobada.

## Ajustes tras la verificación real de Claude (17 de octubre de 2026)

- Fuente: sección 11 de `INTEGRACION-claude.md` publicada en `origin/feature/pa/ronda-pruebas`. Esta rama solo cambia los MFE de Programación Académica y PTA, sus pruebas y este registro; no toca backend, shell ni archivos compartidos. La modificación local de `.gitignore` continúa fuera del commit.
- `GestionGrupos`: crear grupos ya no depende de `GET /grupos/ofertas-cetap`; durante la carga o ante un error envía `idOfertaCetap: null` y avisa que la oferta se puede asignar después. Búsqueda y selector tienen nombres accesibles distintos. Un PATCH rechazado vuelve a mostrar la oferta persistida, sin ocultar el error del servidor. Se retiró el uso nuevo de `MapPin` que añadía diagnósticos TS2786.
- `GestionGrupos.test.tsx` declara jsdom en el archivo y cubre la creación durante la carga y el fallo de ofertas, además de la reversión visual tras un PATCH rechazado.
- `PTAForm`: el aviso de régimen no confirmado ya no promete que el guardado funcione. `savePTA` conserva el código HTTP de los errores; ante 503 en un régimen no confirmado o de programación, la pantalla explica que Programación Académica no está disponible y que los datos siguen en el formulario. Con régimen `actual` se conserva el flujo habitual. Pruebas simuladas cubren el texto, el 503 y la permanencia de los datos.
- No se escribieron datos reales ni se dejaron servidores de desarrollo corriendo.

## Interfaz de Programación Académica, hallazgos de Tomás (18 de octubre de 2026)

- Se integró `origin/feature/pa/ronda-pruebas` (`42b62e5ed`) antes de editar. Esta rama cambia solo archivos del MFE de Programación Académica, su prueba de navegador y este documento. No se tocaron backend, base, shell ni archivos compartidos. `.gitignore` sigue modificado localmente y fuera del commit.
- `ModalConfirmacion.tsx` sustituye los tres `window.confirm` de `GestionOfertas`: activar, cerrar programación y marcar excepción. Presenta el impacto de PTA por periodo, el cambio del periodo activo y la advertencia completa del backend; contiene el foco, cierra con Escape y devuelve el foco al botón que lo abrió.
- La carga Excel ahora tiene zona de arrastre y búsqueda, pasos Elegir/Validar/Confirmar, archivo elegido con tamaño y botón de quitar, tarjetas de catálogo y ofertas, errores en tabla por fila, estados de procesamiento y resultado. `periodosApi.ts` conserva `errors` del HTTP 400 como lista para esa tabla. La respuesta simulada de la prueba usa la forma real del importador: éxito directo con `carga.ofertas_cetap_programa`, rechazo 400 con `errors`.
- El catálogo vacío y el grupo sin ofertas explican la carga y enlazan a la importación del periodo elegido.
- La sección 14 de `INTEGRACION-claude.md` llegó después, desde `origin/feature/pa/ronda-pruebas` (`4a50eaa66`). Se integró con merge, sin leer la carpeta de Claude. El catálogo ahora filtra programas y asignaturas por `idPeriodo` mediante el cambio integrado de Claude; el estado vacío conserva el acceso a la carga.
- La respuesta exacta del importador usa `carga.asignaturas.sin_cambios` para asignaturas idénticas, `ofertas.{por_crear,ya_existentes,rechazadas,detalle}` para oferta CETAP y `resumen_periodo` solo después de confirmar. La pantalla distingue de forma prominente **vista previa, aún no guardada** de **importación terminada, datos guardados**, y coloca «Importar ahora» como botón verde de ancho completo junto al resumen, en el paso 3. Al terminar de validar, mueve el foco a ese botón y lo lleva a la vista; al importar, enfoca el resultado. Incluye tabla buscable de ofertas y estado por CETAP/programa. `ALL_IDENTICAL` no ofrece confirmar.
- `DisponibilidadAulas` muestra territorial y CETAP en la lista y la tabla, con filtros combinables. `CalendarioHorario` pide `GET /aulas?grupo=<id>`: con oferta existente el backend limita al CETAP; sin oferta, cada aula válida trae `idOfertaCetap` y al guardar una sesión presencial se asigna esa oferta primero. `GestionGrupos` actualiza su tarjeta con la oferta que devuelve el PATCH. Un aula virtual o mediada no desencadena esta asignación.
- Validación sin servicios reales: `periodo-unico.browser.mjs` usa red API interceptada con la forma del contrato 14 y pasó 9 escenarios, incluidos vista previa→«Importar ahora»→respuesta final y filtros de aulas. `CalendarioHorario.aulaOferta.test.tsx` prueba los dos regímenes de oferta y el orden PATCH→POST; las cinco suites del MFE pasaron (23/23). `npm run build` pasó. Vite local se detuvo tras la prueba. `tsc --noEmit` sigue con los errores transversales React/Lucide e `import.meta.env` previamente reportados.

## Ronda 3b — pantallas y datos (24 de octubre de 2026)

Contratos leídos de origin, secciones 19 y 21; integración de ronda3 y del documento publicado en 814c564d4. Trabajo en Plataforma-pa-codex3, rama feature/pa/ronda3-codex.

**Cobertura primero:** la base local 55432 no contiene franjas de 2026-1, así que no se certifica cobertura del sistema. Sobre el Excel fuente: 535 franjas con día; 26 (4,86 %) con área compatible usando solo RUND y 531 (99,25 %) usando RUND o puente. Son 113 docentes, 20 con núcleo RUND reconocido, 113 con puente y ninguno sin ambos. Quedan cuatro franjas de Opción de grado APT_52 sin cruce exacto. Las 40 filas sin día se reportan fuera del denominador. No se asumen los porcentajes anteriores.

- EFDS-2344: árbol plegable con docentes múltiples, vinculación, oferta/territorial, horas, estados y faltantes; filtro por nivel permitido y pendientes. Usa vistaApi sin modificarlo. Acciones y menú condicionados a getMisPermisos.
- EFDS-2343: buscador y calendario semanal docente, modo de solo lectura de CalendarioHorario; reserva oculta detalles; horas null explícitas. Se reutiliza en el portal y en GruposAsignados.
- Sección 21: generador y resultados en esap/programacion. CSV BOM/separador punto y coma: 56 equivalencias, 278 filas del puente y tres exclusiones. Área original conservada. No se escribió ni se importó nada en base; conexión READ ONLY. Todos los docentes incluidos existen en auth.personas.
- Catálogo: libro de conciliación de 421 filas, NO importable, con NT existentes y candidatos a duplicado. Faltan reglas concretas del catálogo/posgrado de la instrucción anterior, que no está en origin ni en los adjuntos. Tomás recibió la consulta. Áreas sin código equivalente: Opción de grado y Finanzas Públicas.
- EFDS-2341 y EFDS-2374 esperan contratos publicados: no se añadieron acciones ni estados supuestos.
- Verificación: navegador con respuestas interceptadas de sección 19 (incluidos error, vacío, horas null, permisos y reserva); MFE 33/33; datos 3/3; build correcto. tsc conserva los problemas transversales React/Lucide y shell ya conocidos.
- Compartidos/shell: no requieren cambios para esta entrega. npm install alteró package-lock.json; se revirtió únicamente ese cambio generado y no se incluye. .gitignore no se editó ni se commitea. Backend y API/types de Claude sin cambios propios.

Detalle, comandos y esfuerzo estimado (9 h) en esap/programacion/REPORTE-RONDA3B.md. No incluye como terminados los pendientes anteriores.

## Continuación Ronda 3b — cierre del 25 de octubre de 2026

- Base integrada: origin/feature/pa/ronda3, 2cc71ca32. Se consumieron los contratos publicados de las secciones 21–26, sin leer la carpeta de Claude.
- EFDS-2341 terminado: acceso «Asignar docente» desde el árbol (nivel asignable y periodo programable). AsignacionAreaModal y asignacionAreaApi usan exclusivamente candidatos del endpoint de área. Todas las franjas por defecto; subconjuntos recalculan candidatos/horas. Sugerencia con razones, vinculación, perfil/títulos, origen RUND/puente, tope, cruces y bloqueos. No hay documento libre para asignar. Un 200 con asignado:false no invalida datos. El modal mantiene visibles título/botones, foco contenido, Escape y retorno al disparador.
- EFDS-2374 terminado: el docente acepta con firma OTP o reporta tipo y justificación mínima de 10 caracteres, solo en POR_ACEPTAR. Un error conserva lo ingresado. NOVEDAD/ACEPTADA quedan en consulta. Se retira el envío del docente y se refrescan calendario, grupos y concertación tras la decisión. Interruptor apagado: se conserva el flujo previo del portal.
- Regresión §26.2: se restituyó el filtro de jornada en ProgramacionAcademicaModule con los valores DIURNA/NOCTURNA/FIN_DE_SEMANA/DISTANCIA. El árbol filtra por grupos y conserva el grupo completo al mostrarlo; no se modificó la prueba del backend.
- Catálogo importable en esap/programacion/resultados/2026-1/catalogo-importable-2026-1.xlsx: 427 asignaturas, 14 programas, 325 ofertas; cero códigos nuevos/retirados, 65 áreas actualizadas, 160 asignaturas de posgrado conservadas campo por campo. Hojas REVISION_CATALOGO (63 casos conservados para revisión) y REVISION_OPCION_GRADO (las cuatro franjas APT_52). NT conocido en columna de trazabilidad; AF nunca sustituye a NT. Nombres y códigos ambiguos no se fusionan.
- La instrucción anterior no apareció en la ubicación indicada ni en origin: se aplicaron las reglas expresas de Tomás y el formato real publicado. La conexión a 55432 rechazó al retomar: archivo generado con exportación/snapshots conocidos; validación de persistencia y carga real pendientes de Claude. AF-04/AF-17 sí estaban en la consulta previa; faltaban sus NT en ese snapshot. No se escribieron datos ni se levantaron servicios reales.
- Cobertura vigente: 463/535 (86,54 %) con el intérprete puro de Claude y la tabla activa consultada. El puente solo se usa sin núcleo RUND; quedan 68 franjas con RUND de otra área y cuatro sin cruce exacto del plan. La unión anterior de fuentes (99,25 %) queda como comparación histórica, no como cobertura vigente.
- Pruebas: MFE 38/38, datos/catálogo 7/7, canario de rutas del cliente 3/3 (incluida jornada), navegador simulado de asignación/aceptación y regresiones de árbol/calendario y de nueve escenarios de periodos/carga/aulas. Parser y validador R1-R6 reales sin backend; build correcto. Detalle y comandos en REPORTE-RONDA3B.md. Esfuerzo adicional estimado: 7 h.

### Para Claude: archivos compartidos y revisión interna

No se editaron shell, paquetes compartidos, catalogoApi, vistaApi ni backend. Quedan descritos para su dueño los textos de ConcertacionBandeja/EtapasConcertacion que todavía dicen «envía el docente» y «devolver al docente»: con el orden nuevo deben referir al programador y a la posterior aceptación. La sección 23.3 también requiere el acceso del programador a enviar/reenviar su programación y a su bandeja de novedades; esta entrega implementa el modal de asignación y la aceptación del docente pedidos, no duplica esa bandeja compartida. .gitignore y package-lock.json fuera de los cambios propios.

## EFDS-2346 — Gestión de Periodos y seguimiento de candidatos (25 de octubre de 2026)

- Pantalla autorizada en este pedido: apps/mfe-programas-academicos/src/components/GestionPeriodos.tsx. Se usó el contrato publicado en origin, sección 25 (rama integrada 2cc71ca32); no se leyó la carpeta de Claude.
- Lista, tarjetas móviles y detalle distinguen «Principal en curso» y «Extraordinario en curso». Los personalizados muestran nombre/año y no «Semestre —». Se conservan los campos reales estado, tipo, extraordinario y motivoExtraordinario de la API.
- «Activar como extraordinario» usa hasPermission('pta.periodos.activar_extraordinario') del hook existente. Mientras se verifican permisos no se ofrece; tampoco para periodos en curso o cerrados. Si ya existe un extraordinario en curso, se deshabilita para los demás y se explica cuál debe cerrarse primero.
- ActivarExtraordinarioModal pide motivo obligatorio (mínimo 10 caracteres después de trim) y una confirmación destacada que identifica al principal y dice expresamente que no lo cierra, no mueve otros periodos y no termina PTA. El diálogo usa foco contenido/Escape/retorno al botón. Un error 403/409 conserva motivo y modal; no refresca la lista. Al confirmar con éxito refresca GET de periodos y notifica al padre.
- Se llama únicamente a POST /pta/api/v1/periodos-academicos/:id/activar-extraordinario con { motivo }, sin reintentos de escritura. No se llama al PATCH de activación principal. Nuevo cliente local periodoExtraordinarioApi.ts; no se editaron hooks, API comunes, shell, paquetes compartidos ni backend.
- Verificación: 28/28 pruebas de Programas Académicos (seis nuevas); navegador Chromium con API interceptada, respuestas reales de la sección 25 (GET devuelve arreglo directo), permisos y rechazos; inspección visual a 1440 y 390 px. Build de Programas Académicos correcto. Capturas y script en apps/mfe-programas-academicos/tests/periodo-extraordinario.browser.mjs.
- Esfuerzo estimado de EFDS-2346: 3 h (pantalla/modal/permiso 1,5 h; pruebas e inspección 1 h; integración/documentación 0,5 h). No se imputa implementación del aviso pendiente.

### Pendiente de contrato de Claude: situación administrativa sin clasificar

Tomás aprobó que el docente sin situación administrativa pueda asignarse, con aviso visible en su tarjeta. Al último fetch, origin/feature/pa/ronda3-claude seguía en 7aefb1ac9 y el contrato de candidatos de la sección 22 aún no incluía el campo de aviso. Necesito nombre, tipo y un ejemplo de respuesta (incluido el candidato asignable con aviso) para mostrarlo sin convertirlo en bloqueo. No se inventó el campo ni se cambió localmente asignable o motivos. Queda listo para retomarlo cuando Claude publique el contrato.

La instrucción anterior del catálogo queda resuelta: Tomás confirmó que nunca se copió y que no hace falta. Las tres reglas aplicadas y el archivo entregado se mantienen.

## Corrección del catálogo y envío por programador — 25 de octubre de 2026

Base integrada: merge `f7890b0d4` de `origin/feature/pa/ronda3`. Contratos consultados desde origin, sin leer la carpeta de Claude.

### Catálogo: conservación comprobada después de escribir el Excel

La plantilla anterior ya contenía los ocho nombres sin tilde y las tres celdas vacías de horas; compararla consigo misma no detectaba el problema. Se obtuvo una exportación actual con una transacción REPEATABLE READ READ ONLY (incluida comprobación de `transaction_read_only`), sin importar ni modificar datos. `exportar-catalogo-base.mjs` reproduce esa consulta y conserva su procedencia/huella en `catalogo-base-verificado.xlsx.json`.

El generador clona las celdas originales y cambia únicamente el área de pregrado, con sus columnas de trazabilidad. Antes de publicar el archivo, lo vuelve a abrir y compara 11.995 campos originales, por código y con sus tipos, en PROGRAMAS, ASIGNATURAS y MATRIZ_OFERTA. Rechaza horas vacías en la base, sin convertirlas silenciosamente a cero. La prueba altera cada columna ajena al área para comprobar que se detecta, y protege expresamente Público y los ceros de ASIG-00139, ASIG-00218 y ASIG-00427.

Resultado vigente: 427 asignaturas, 14 programas, 325 ofertas, cero códigos nuevos/retirados y 160 asignaturas de posgrado conservadas campo por campo. Cero cambios de área frente al snapshot actual: Claude ya aplicó los 65 de la entrega anterior. NT-034 Finanzas Públicas y NT-035 Opción de grado ya figuran en el snapshot. Siguen los 63 casos de revisión del catálogo y las cuatro franjas de Opción de grado para decisión manual. Esta sección sustituye el diagnóstico anterior de base no disponible y la comparación contra la plantilla defectuosa; no se confirmó ninguna importación.

### Envío por docente y etiqueta del portal

`EnvioRevisionDocente` queda junto al calendario del docente elegido en Disponibilidad Docente. Usa las asignaturas/franjas y `horasPorGrupo` del contrato §19, sin calcular horas en el cliente ni revelar reservas. Las horas de carga asignada se distinguen de las horas de la foto enviada. GET `/concertacion/programador` y POST `/concertacion/enviar` usan §23.3 y el cuerpo exacto `{idPeriodo, documento}`. El servicio decide qué TOMADA entra; no se pide OTP al programador. Muestra estado por nivel, devolución/novedad, error sin falso éxito y reintento. Solo aparece con concertación encendida, permiso de asignación y periodo programable. No necesita un endpoint nuevo: queda resuelta la consulta inicial sobre un contrato adicional.

Mi programación consulta las fotos de concertación: POR_ACEPTAR dice «Por aceptar»; si afecta solo parte del grupo dice «Parte por aceptar». Error de consulta no inventa un estado. Apagado conserva el flujo y no hace esa consulta. `avisos` ya venía renderizado por Claude en la tarjeta y en la confirmación del candidato; se comprobó con simulación, sin duplicarlo ni bloquear la asignación.

### Único cambio compartido para que aplique Claude (NO incluido en el commit)

En `apps/mfe-programacion-academica/src/components/ProgramacionAcademicaModule.tsx`, sustituir la invocación existente:

```tsx
{seccion === 'docentes' && misPermisos?.disponibilidad && <DisponibilidadDocente periodo={periodoSel} />}
```

por:

```tsx
{seccion === 'docentes' && misPermisos?.disponibilidad && <DisponibilidadDocente periodo={periodoSel} nivelesAsignables={misPermisos.asignar} concertacionHabilitada={!!concertacion?.habilitada} programable={!!periodoProgramable} />}
```

Se probó este cambio localmente; se deja sin commitear por la propiedad compartida. Claude debe aplicar esa conexión al integrar para que aparezca el envío y para ejecutar el recorrido completo de `vistas-ronda3.browser.mjs`. No hay cambios propios de shell, backend, `.gitignore` ni lockfile.

### Validación y esfuerzo

49/49 pruebas del MFE; 11/11 de datos/catálogo; navegador con API interceptada para asignación/avisos, aceptación/etiqueta y calendario/envío (409, reintento exitoso, permisos y apagado). Build del MFE correcto. TypeScript sigue con los errores existentes TS2786 de iconos/React y `ImportMeta.env`; no aparecen diagnósticos adicionales al excluir esas familias. Las simulaciones siguen §§19 y 23.3. Captura: `apps/mfe-programacion-academica/tests/envio-revision-docente.png`. No se levantó backend ni se escribió la base; Vite se usa solo durante la prueba y se detiene al terminar.

Esfuerzo estimado de esta entrega: **6 h adicionales** (catálogo y prueba de conservación 3 h; envío por docente 2 h; etiqueta, regresiones y documentación 1 h). No es tiempo de reloj ni incluye horas de rondas anteriores.

## Decisiones editables por asignatura y puente en suma — 25 de octubre de 2026

Se integró `origin/feature/pa/ronda3` (incluido §28.3) antes de esta continuación. No se leyeron archivos de la carpeta de Claude ni se hicieron escrituras en la base.

- Archivo editable: `esap/programacion/areas-por-asignatura.csv` (UTF-8, separador `;`; código de asignatura, área canónica y motivo). Contiene 28 decisiones: todas las Estadísticas y Matemáticas del catálogo, incluidos los distintos planes y Métodos Matemáticos para Economistas; Metodología de investigación APT; ASIG-00064; ASIG-00065 y ASIG-00001. Se lee por defecto y admite `--areas-por-asignatura <archivo>`. Prevalece sobre el área del plan, incluso si el nombre no cruza con el plan. Se rechazan códigos inexistentes/duplicados, áreas no canónicas y motivos vacíos. Se conservan todos los campos ajenos al área y los 160 registros de posgrado.
- **ASIG-00001:** el nombre probablemente debe ser **Construcción del Territorio**. Pendiente de confirmar; el generador conserva el nombre actual, Constitución Del Territorio, y solo aplica Desarrollo y Gestión Territorial.
- `resultados/2026-1/datos/nucleos/nucleo_equivalencia.csv`: Estado, Gobierno y Sociedad pasa a variante de Estado y Poder. Sus variantes quedan bajo la misma área canónica al regenerar. No se modificó la tabla del servidor.
- **Catálogo para Claude:** `esap/programacion/resultados/2026-1/catalogo-importable-2026-1.xlsx`. 427 asignaturas, 14 programas, 325 ofertas; 26 valores de área cambian frente al snapshot verificado; cero códigos nuevos/retirados. El parser/validador publicado lo acepta sin errores ni advertencias. Se comparan de nuevo 11.995 campos ajenos al área. `DECISIONES_POR_ASIGNATURA` y el reporte JSON conservan las 28 decisiones y la huella del CSV. Quedan 48 casos de catálogo y las cuatro franjas de Opción de grado para revisión manual.
- **Cobertura 2026-1: 531/535 = 99,25 %**, con `--puente suma`: 44 por RUND y 487 adicionales por puente. Son las franjas del Excel, no programación viva: la base consultada no tiene franjas de 2026-1. Las 40 filas sin día se excluyen del denominador. Las cuatro no cubiertas siguen siendo Opción de grado APT_52 (35, 36, 440, 441); no se fuerza ningún cruce.
- `cobertura-regla-vigente.json` ejecuta el intérprete puro publicado por Claude con las equivalencias leídas de la base y la decisión nueva proyectada en memoria. La consulta es READ ONLY. `modoPuente: suma` queda explícito. El generador sigue admitiendo `solo_sin_rund` (predeterminado) y `apagado`; no cambia ningún interruptor del servidor. `cobertura.json` mantiene su medición auxiliar por unión normalizada, distinta del intérprete, y no debe usarse para atribuir la cobertura RUND del contrato.

Reproducción desde la raíz (sustituir las rutas fuente por las locales):

```powershell
node esap/programacion/generar-datos.mjs --programacion "ruta\programacion.xlsx" --rund "ruta\rund.xlsx" --env "ruta\servicio.env" --periodo 2026-1 --puente suma
node esap/programacion/generar-catalogo.mjs --catalogo-base esap/programacion/resultados/2026-1/catalogo-base-verificado.xlsx --programacion "ruta\programacion.xlsx" --periodo 2026-1
node --test esap/programacion/validar-datos.test.mjs esap/programacion/catalogo-importable.test.mjs
```

### Corrección compartida para Claude: no consultar jefatura con concertación encendida

La llamada que causaba el 409 está en `ProgramacionAcademicaModule.tsx`, no en `ConcertacionBandeja`. Se probó localmente pero **no se incluye ese archivo compartido en el commit**, según el acuerdo. Además de la conexión de envío documentada en la entrega anterior, Claude debe quitar este efecto de montaje:

```tsx
useEffect(() => { getPendientesJefatura().then(() => setEsJefatura(true)).catch(() => {}); }, []);
```

Y colocar este efecto después de declarar el estado `concertacion`:

```tsx
useEffect(() => {
  let vigente = true;
  setEsJefatura(false);
  if (concertacion && !concertacion.habilitada) {
    getPendientesJefatura().then(() => { if (vigente) setEsJefatura(true); }).catch(() => {});
  }
  return () => { vigente = false; };
}, [concertacion]);
```

Así espera la configuración antes de consultar: encendida no llama; apagada conserva la detección anterior. Si falla la configuración, no se consulta un régimen desconocido. La prueba de navegador comprueba ambas ramas con APIs interceptadas y la conexión compartida local. Sin aplicar estos dos parches compartidos, Claude no debe considerar integrado el acceso al envío ni la corrección de consola.

Pruebas de datos/catálogo: 14/14. Incluyen prioridad de las 28 decisiones sobre el plan, integridad de campos, CSV inválidos, equivalencia nueva y contabilidad de la cobertura sin forzar Opción de grado. Navegador: pasa el recorrido de árbol, calendario, envío y encendido/apagado, incluida ausencia de llamadas a jefatura con concertación encendida. No se confirmó una carga ni se levantó backend.

Esfuerzo estimado adicional de esta continuación: **2,5 h** (CSV/generador/pruebas 1,5 h; cobertura 0,5 h; consola, navegador y documentación 0,5 h). No incluye la entrega anterior ni es tiempo de reloj.

Verificación final de esta continuación: MFE **51/51**, datos/catálogo **14/14**, navegador con API simulada correcto y build correcto. Vite detenido al terminar.

## Bugs QA — preparación y contratos pendientes (12 de noviembre de 2026)

Carpeta `Plataforma-pa-codex4`, rama `feature/pa/bugs-qa-codex`, base publicada `78a1644cd`. La carpeta anterior se dejó intacta, incluido su parche compartido sin commitear. Dependencias instaladas; el cambio de lockfile generado por la instalación no forma parte de la entrega.

Auditoría: `esap/programacion/AUDITORIA-BUGS-QA-CODEX.md`. La instrucción exige leer primero los comentarios completos de Javier en las HU EFDS-1370, 1371, 1372 y 1941; se solicitó a Tomás acceso a Jira o una exportación. Aún no se implementaron ni se declaran resueltas subtareas. No se consultó ni escribió la base ni se iniciaron servicios reales.

Para Claude, pendientes de publicar en origin:

- EFDS-2430: creación y validación previa multidía, campos exactos, conflictos por día, atomicidad/resultado parcial y fuente de las horas actualizadas.
- EFDS-2432: edición y eliminación de sesión, cuerpos/respuestas/errores y reglas según estado, especialmente APROBADA.
- EFDS-2434: candidatos disponibles y bloqueados con motivo, contrato del reparto de varias franjas/docentes y resultado de asignación parcial o atómica.
- EFDS-2429: diagnóstico del programa ofertado solo en Sede Central y campos que permiten explicarlo; distinguir ese caso de una falla de consulta.

EFDS-2428 también afecta el detalle montado en `ProgramacionAcademicaModule.tsx`; Codex describirá el parche para Claude y no commiteará ese archivo compartido. EFDS-2427 autoriza solo la pantalla de periodos de Programas Académicos; el cambio se documentará para Julián. No se cambiará shell, permisos ni backend.

Todas las subtareas siguen **no verificadas en condiciones de QA**. La matriz planificada incluye build/preview, es-CO/en-US, Bogotá/UTC y resoluciones 1920×1080, 1366×768, 1280×720 y móvil. Las simulaciones se basarán en contratos publicados, no en respuestas inventadas.

## Bugs QA — entrega Codex (12 de noviembre de 2026)

Se recibieron y leyeron los comentarios completos de Javier exportados por Tomás. Esto desbloquea la preparación anterior. Contratos: `origin/feature/pa/bugs-qa-claude` `3fe8ab542`, §38. Las reglas de devolución de §38.3 fueron aprobadas por Tomás en el chat. No se leyeron archivos de la carpeta de Claude.

Reporte por subtarea, capturas, límites de QA y horas: `esap/programacion/REPORTE-BUGS-QA-CODEX.md`. Ocho correcciones de pantalla implementadas. EFDS-2435, configuración del PTA, permisos, auditoría, migraciones y backend quedan con Claude.

- EFDS-2431: CampoHora24 en los cuatro campos que eran nativos; teclado y valores HH:mm independientes de idioma/zona.
- EFDS-2428: PanelGrupos con portal, encabezado/pie fijos, X/Cerrar/Escape, foco, confirmación de borradores y bloqueo al guardar. Catálogo ya lo monta. Cambiar grupo reinicia el editor por key.
- EFDS-2433: calendario de consulta contraíble, con docente/periodo/horas/tope siempre visibles.
- EFDS-2427: Programas Académicos → Periodos solo consulta y enlace de mismo origen usando el `?module=` existente del shell. Sin nuevas URL de remoto. PA conserva creación regular y personalizada; comprobadas en build/preview. **Para Julián:** se retiraron de la pantalla de consulta las acciones de crear, editar, activar, cerrar/desactivar, importar y eliminar. Se conserva la consulta del detalle de programas y CETAP; los tests de escritura en ese punto se sustituyeron por tests de consulta. No se modificó ProgramasAcademicosModule ni el shell.
- EFDS-2430/2432: lote/validación por día y edición/eliminación por §38; solo se envían en PATCH los campos cambiados. Confirmaciones separadas para eliminar y para quitar asignación/devolver concertación. Horas del servidor y errores sin cerrar el formulario. El guardado de la oferta del aula se difiere hasta confirmar la creación, nunca durante validar.
- EFDS-2434: todos los candidatos, disponibles/bloqueados y motivos. Reparto por franjas y POST /asignaciones/multiple atómico; no invalidar con asignado:false. Se conserva la ruta compatible virtual sin horario.
- EFDS-2429: `unicaSede`/`motivo` bajo el selector; errores explícitos de lista/diagnóstico, sin inferir territoriales ni bloquear la creación opcional sin oferta.

### Único parche compartido pendiente: ProgramacionAcademicaModule.tsx (solo Claude)

No edité ni commiteo este archivo. El acceso al horario desde el árbol todavía monta el contenedor antiguo; necesita el mismo PanelGrupos que ya usa SelectorCatalogo. Agregar:

```tsx
import { PanelGrupos } from './PanelGrupos';
```

Sustituir TODO el bloque final `{detalle && detalle.idGrupo && (...)}` (el contenedor antiguo role=dialog y su botón X) por:

```tsx
{detalle && detalle.idGrupo && (
  <PanelGrupos
    titulo={`Horario del grupo ${Number(detalle.grupo) || 1} · ${detalle.asignatura || detalle.programa || 'Grupo'}`}
    onCerrar={() => setDetalle(null)}
  >
    <CalendarioHorario
      key={detalle.idGrupo}
      idGrupo={detalle.idGrupo}
      numeroGrupo={Number(detalle.grupo) || 1}
      nombreAsignatura={detalle.asignatura || detalle.programa || 'Grupo'}
      fechaInicioGrupo={detalle.fechaInicioGrupo}
      fechaFinGrupo={detalle.fechaFinGrupo}
    />
  </PanelGrupos>
)}
```

**No anidar el nuevo panel dentro del anterior:** duplicaría diálogo, foco y manejadores de cierre. Este parche es necesario para completar EFDS-2428 en el segundo acceso; no se considera aplicado por tenerlo escrito aquí. Respetar los datos adicionales de modalidad que Claude agregue al integrar.

### Comprobaciones y despliegue

- 74/74 pruebas del alcance. Build normal de PA y Programas correcto.
- Build + preview del MFE real (`qa-remoto-produccion.browser.mjs`), aplicación real y assets de producción, sin TSX dev; APIs interceptadas.
- Arnés adicional construido y servido con preview: 16 combinaciones de es-CO/en-US × Bogotá/UTC × cuatro resoluciones y dos grupos adicionales de escenarios (edición/devolución, eliminación, conflictos, reparto, periodos, error y vacío). Capturas y JSON en `apps/mfe-programacion-academica/tests/evidencia-qa/`.
- Todas las subtareas: **no verificado en condiciones de QA remoto**. No hay acceso al despliegue ni se probó auditoría/persistencia con el backend real. El arnés no valida autorización de las cuentas reales. No se declara terminado remoto ni se cambia el estado de Jira.
- El reporte identifica fallos de suites ajenas en la corrida conjunta y los errores transversales de TypeScript; no se presenta esa corrida como verde.
- Desplegar las rutas, permisos, auditoría y migraciones de Claude junto a las pantallas. Reconstruir **ambos MFE**, publicar assets y remoteEntry juntos y renovar la caché de entradas según la política del ambiente. No hay variables ni datos locales para copiar. El enlace a PA usa el enrutamiento existente del shell; el shell no se modifica.
- Completar QA real por rol, CETAP, validación por día, topes, devolución/aprobadas, horas, auditoría y exportaciones 24 h antes de cerrar las subtareas.

Esfuerzo adicional estimado: **15,5 h**, desglosado por subtarea en el reporte (no tiempo de reloj). No hay cambios propios de .gitignore, package.json, lockfile, backend, migraciones ni shell. Push solo a `feature/pa/bugs-qa-codex`.

## verificación-final

### Cierre documental — 13 de noviembre de 2026

**Regla de esta ronda:** ningún cambio ni commit de código. Claude conserva la propiedad de todas las pantallas y del backend. Esta sección y la guía son documentación; no se corrigió ninguna aplicación ni se alteraron pruebas.

**Guía para Javier:** `esap/programacion/VERIFICACION-QA-bugs.md`. Contiene las nueve subtareas EFDS-2427 a EFDS-2435, usuarios por perfil, pasos numerados, resultados esperados, casos que deben fallar, evidencias a conservar, limpieza y una comprobación de cinco minutos. Ya se publicó una primera versión en `51aef89de`, en `origin/feature/pa/bugs-qa-codex`.

**Fuentes y decisiones prudentes:** se usó la exportación completa de los comentarios de Javier entregada por Tomás en el chat. No aparecen `REPORTES-JAVIER-QA.md` ni `INSTRUCCION-claude-bugs-QA-PA-v2-interoperabilidad.md` en las ramas publicadas consultadas ni en los insumos externos disponibles. No se leyó la carpeta de Claude. Para no detener la guía, EFDS-2435 sigue la instrucción final explícita de Tomás: interruptor en PTA → Configuración, PTA manual al apagarlo y concertación que puede seguir completándose. No se presenta el contrato antiguo §38.7 como si fuera la v2; la fuente exacta de esa v2 sigue sin poder contrastarse. Se incluyen cancelación, permisos y auditoría del reporte de Javier, restauración del estado inicial y protección de la docencia manual.

No se inventan cuentas habilitadas en QA: la guía identifica cada usuario por su perfil y la cuenta de administrador documentada, sin publicar claves. Si falta un perfil, datos o selección de 2050-2, Javier marca el tramo No ejecutado. No se activa ni se elimina un periodo existente para fabricar una prueba de creación.

### Control de publicación

La verificación real está condicionada a la marca **PUBLICADO** en **§40 de `INTEGRACION-claude.md` de `origin/feature/pa/bugs-qa`**. Se ejecutaron varios `git fetch origin` y se leyó el documento desde esa referencia, sin sustituirla por el contenido local o por otra rama.

Comprobaciones registradas, hora de Bogotá del 13 de noviembre: 12:32, 12:37, 12:40, 12:42 y 12:43:53. En todas, la referencia continuó en `78a1644cd56665539c9ad3ac5a3d204f3edcabf2`, el documento terminaba en §37 y §40 estaba ausente. El control final de esta ejecución se añade al final de esta sección.

### Resultado con servidor real por subtarea

| Subtarea | Resultado | Evidencia / comprobación pendiente |
| --- | --- | --- |
| EFDS-2427 | No ejecutado | No se habilitó el recorrido del stack: falta PUBLICADO en la sección requerida. Pendiente contrastar consulta en Programas y creación únicamente en PA. |
| EFDS-2428 | No ejecutado | Misma condición. Pendientes ambos accesos al panel, resoluciones, cierre y borradores. |
| EFDS-2429 | No ejecutado | Misma condición. Pendientes oferta real, diagnóstico de Sede Central y errores de consulta. |
| EFDS-2430 | No ejecutado | Misma condición. Pendientes validación por día, creación, contador y limpieza con datos reales de 2050-2. |
| EFDS-2431 | No ejecutado | Misma condición. Pendientes las horas de 24 h del stack real y su recorrido en ambos idiomas. |
| EFDS-2432 | No ejecutado | Misma condición. Pendientes edición, eliminación, confirmaciones, reglas por estado, horas y auditoría reales. |
| EFDS-2433 | No ejecutado | Misma condición. Pendientes los usuarios reales Docente, Revisor y Aprobador. |
| EFDS-2434 | No ejecutado | Misma condición. Pendientes candidatos, bloqueos, reparto atómico y topes reales. |

EFDS-2435: guía escrita; implementación y cierre de Claude. No se verificó contra servidor en esta ronda.

**No ejecutado no significa Pasa ni No pasa.** Tampoco se ejecutó nuevamente el arnés de producción en esta ronda, porque forma parte de la etapa posterior a PUBLICADO. Los resultados y capturas simulados del 12 de noviembre no se reutilizan como prueba real de cierre del 13 de noviembre.

No se abrió el stack ni se hicieron peticiones de verificación antes de la marca. No se hizo merge de `origin/micro-frontend` antes de esa habilitación. No se crearon registros: no hay grupos, sesiones, PTA ni periodos de esta ronda pendientes de borrar.

### Defectos encontrados

No hay defectos nuevos observados en el servidor: no se ejecutó el recorrido real. No sería válido concluir por ello que el sistema no tiene defectos. Las limitaciones de publicación y de fuentes anteriores son dependencias de verificación, no defectos de aplicación reproducidos; por tanto no se adjuntan capturas de una aplicación que no se abrió.

### Esfuerzo

Estimación por esfuerzo: **1,5 h**, guía y revisión 1,25 h; control de publicación y registro de pendientes 0,25 h. La espera no se cuenta como horas de desarrollo. Verificación real: 0 h ejecutadas.

**Control final: 13 de noviembre de 2026, 12:46:22, hora de Bogotá.** Tras el último `git fetch origin`, `origin/feature/pa/bugs-qa` continúa en `78a1644cd56665539c9ad3ac5a3d204f3edcabf2`; §40 no existe y no apareció la marca PUBLICADO requerida. La guía quedó terminada y se cierra esta entrega documental con las ocho comprobaciones reales No ejecutadas. No se inicia ninguna prueba sobre un stack cuya habilitación no está publicada. Este registro corresponde al estado observado hasta esa hora; no afirma que la publicación no pueda ocurrir después.

Los únicos archivos modificados en esta ronda son `esap/programacion/VERIFICACION-QA-bugs.md` e `INTEGRACION-codex.md`. Ningún commit de código, cambio de configuración ni verificación con datos simulados se presenta como cierre real de QA.
