# Aprobación configurable por actividad

**Estado:** diseño, pendiente de validar con el área.
**Origen:** EFDS-1183 (RF-SIS-02), matriz de flujo, «Formato usuario-roles-permisos Jun 2026».

---

## El problema

El jefe de Contratación necesita poder decir que una actividad requiere aprobación —y que
otra deje de requerirla— sin que eso sea un desarrollo. Hoy no puede: las siete actividades
que se aprueban lo hacen porque alguien programó ese ciclo dentro de su panel.

La consecuencia práctica: si mañana se decide que la 3.5 «Definir modalidad» debe pasar por
el Director, hay que escribir el ciclo en ese panel, probarlo y desplegar. Y si en seis
meses se decide que ya no, otra vez.

---

## Qué se configura y qué no

Esta es la separación que sostiene todo el diseño, y conviene fijarla antes de entrar en
detalle:

| | Configurable | Por qué |
| --- | --- | --- |
| **Si una actividad requiere aprobación** | ✅ sí | Es una decisión de proceso, y cambia. |
| **Quién la aprueba** | ✅ sí | Cambia con la estructura del área. |
| **Que quien ejecutó no pueda aprobarla** | ❌ no | Es control interno. Si se puede desmarcar desde una pantalla, deja de ser un control. |
| **Qué protege cada endpoint de la API** | ❌ no | Los 174 decoradores `@Permisos` son control de acceso; sin ellos se llamaría a la API saltándose el flujo. |

La configuración **enruta**: dice a quién le llega la aprobación. El permiso **controla**:
dice quién puede llamar al endpoint. Son cosas distintas y mezclarlas fue el error de la
primera versión de este análisis.

---

## Por qué por rol y no creando un permiso por actividad

La primera propuesta fue crear un permiso específico por cada aprobación
—`contratacion.modalidad.aprobar`— y descartarla tiene fundamento, no es preferencia:

> «Puedes asignar **roles de aprobación** y luego asignarlos como aprobadores de los pasos
> del workflow. **Este enfoque se recomienda sobre crear permisos individuales para cada
> paso**.» — [Deltek Vision](https://help.deltek.com/product/Vision/7.6/cfg_approv_Approval_Workflows_Configuration_Overview.html)

> «Las aprobaciones están diseñadas para usar **asignación dinámica de revisores: equipos,
> roles o supervisores**. Si alguien cambia de puesto o se va, actualizas la membresía en
> vez de editar cada workflow que lo referencia.» —
> [Casebook](https://gohub.casebook.net/knowledge/understanding-workflow-step-approvals)

> «La práctica recomendada es apuntar a **roles y permisos reducidos y manejables** […] en
> vez de un número grande de roles.» —
> [TechPrescient](https://www.techprescient.com/blogs/role-based-access-control-best-practices/)

Además, un permiso por actividad no resolvía el problema: crear permisos exige migración
—`auth.permission` no tiene endpoint de creación— así que cada decisión del área seguiría
siendo un ticket de desarrollo. Y para el usuario, elegir entre
`contratacion.modalidad.aprobar` y `contratacion.actividad.approve` es peor que elegir
entre «Director de Contratación» y «Revisor de Contratación».

---

## El diseño

### Rol o persona, según el caso

El área tiene dos realidades distintas y el diseño soporta las dos:

- **Por rol** — lo normal. «La 3.5 la aprueba el Director de Contratación». Sobrevive a que
  cambie quién ocupa el cargo.
- **Por persona** — el caso puntual. «Esta la aprueba Ana Lucía Osorio». Útil cuando el
  formato nombra a alguien en concreto, como hace con la Directora.

El estándar recomienda rol, y por eso es la opción por defecto; la persona queda para el
caso en que el área lo pida explícitamente.

```
Configuración → Matriz de actividades → 3.5

  ☑ Requiere aprobación

     Aprueba:  (•) Un rol          [✓] Director de Contratación
                                   [✓] Revisor de Contratación
                                   [ ] Ordenador del Gasto

               ( ) Una persona     [ buscar por nombre…          ]
```

Se admiten **varios aprobadores** porque es lo que evita que el flujo se trabe cuando el
único aprobador no está — la misma razón por la que el estándar los contempla. Basta con
que apruebe uno.

### Cómo queda la regla

Se guarda en `hiring.reglas_actividad`, la tabla que ya declara qué exige cada actividad
(`CAMPO_OBLIGATORIO`, `DOCUMENTO_REQUERIDO`, `PLAZO_MINIMO`…). Un tipo más:

```json
{ "numeral": "3.5",
  "tipo": "EXIGE_APROBACION",
  "config": { "roles": ["DIRECTOR_CONTRATACION", "REVISOR_CONTRATACION"] } }
```

o, en el caso puntual:

```json
{ "config": { "personas": ["uuid-de-la-persona"] } }
```

**Por qué en esa tabla y no en una nueva:** ya resuelve la vigencia. Tiene `vigente_desde` y
`vigente_hasta`, así que un proceso aprobado en marzo se sigue auditando con la regla de
marzo. Cambiar hoy quién aprueba no reescribe lo que se decidió antes, que es exactamente
lo que un ente de control pregunta. Una tabla nueva tendría que reimplementar eso.

### El desplegable de roles

Mostrarlos todos no sirve: hay 41 roles activos y entre ellos «Revisor Verificacion
Titulos», «Auditor Sénior» y uno llamado literalmente «asd». El jefe de Contratación no
debería tener que distinguir.

Se ordena en dos bloques:

```
Roles de Contratación            ← tienen permisos del módulo
  Director de Contratación
  Revisor de Contratación
  Gestor de Contratación
  Ordenador del Gasto
  …

Otros roles del sistema          ← plegado
  ⚠ Sin permisos en Contratación
  Auditor Sénior
  Jefe OCI
  …
```

El primer bloque sale de una consulta —roles con al menos un permiso del módulo—, así que
**un rol nuevo que el área cree y al que asigne permisos de contratación aparece solo**. El
segundo existe para no dejar al jefe sin opción si el rol todavía no tiene permisos, pero
avisa de que ese rol no podrá entrar al módulo.

### Qué pasa en el riel

```
El abogado diligencia la 3.5
        ↓
  ¿tiene regla EXIGE_APROBACION vigente?
        │
        ├── no  → la actividad se cierra
        │
        └── sí  → queda «En revisión · pendiente de aprobación»
                  aparece para los aprobadores configurados
                        ↓
                  aprobar  → cerrada
                  devolver → vuelve al abogado con observaciones
```

Es el mismo estado que hoy muestra la 3.1 en el riel, así que el gestor no aprende nada
nuevo.

### Basta con que apruebe uno

Con varios aprobadores configurados —sean roles, personas o una mezcla— **basta con que uno
apruebe**. No se exige unanimidad.

La razón es la misma por la que se admiten varios: que el proceso no dependa de una persona.
Exigir que aprueben todos convertiría cada ausencia en un bloqueo, y en la práctica llevaría
a configurar un solo aprobador para evitarlo, perdiendo el respaldo.

Si en algún caso el área necesitara aprobación conjunta —dos firmas sobre el mismo acto— eso
no es este mecanismo: es un flujo de doble aprobación y tendría que modelarse aparte.

### Todas empiezan sin aprobación

Ninguna actividad nace marcada. La regla `EXIGE_APROBACION` **no se siembra para nadie**: el
área la activa donde decida, cuando lo decida.

Es deliberado. Sembrar once actividades «porque la matriz las sugiere» sería convertir una
lectura nuestra del texto del Excel en el comportamiento por defecto del sistema, y nadie
habría confirmado que esas once son las correctas. Es más fácil activar una que descubrir
por qué el flujo se trabó en una que nadie pidió.

Consecuencia: el día que esto se despliegue, **el flujo sigue comportándose igual que hoy**.
Lo que cambia es que el jefe ya puede marcar la primera.

### Quién aprueba, cómo se entera y cómo lo ve

**Cómo se entera**

Sobre `notifications-service`, el mismo que ya usa el aviso diario de vencimientos:

| Cuándo | A quién | Qué dice |
| --- | --- | --- |
| Una actividad queda pendiente | a los aprobadores configurados | «El proceso CTO-2026-0001 tiene la actividad 3.5 esperando aprobación» |
| Se aprueba | a quien la ejecutó | «Tu actividad 3.5 fue aprobada» |
| Se devuelve | a quien la ejecutó | «Tu actividad 3.5 fue devuelta: <observaciones>» |

Cuando el aprobador es un rol, el aviso va a **todos los que lo tengan**. Con «basta uno»,
el primero que entra la resuelve y al resto le desaparece de la bandeja.

**Cómo lo visualiza cada uno**

El menú del módulo ya reserva la sección **«Revisión · Aprobación de documentos»**, hoy
marcada como «Próx.». Es exactamente su sitio:

```
CONTRATACIÓN
  Procesos
  Revisión        ← aquí, con el número de pendientes
  Expedientes
```

| Quién | Qué ve |
| --- | --- |
| **Quien ejecuta** (abogado, gestor) | La actividad queda «En revisión · pendiente de aprobación» en el riel —el mismo estado que hoy muestra la 3.1—. No puede seguir con ella; sí con las demás. |
| **El aprobador** | La sección Revisión con las actividades que le esperan: proceso, actividad, quién la envió y desde cuándo. Al abrir una, ve lo diligenciado y sus adjuntos, y decide: aprobar o devolver con observaciones. |
| **Quien solo consulta** (ente de control, auditoría) | En el expediente, la actividad con su estado y, en la trazabilidad, quién aprobó o devolvió, cuándo y con qué observaciones. |

**Las observaciones**

Al devolver son **obligatorias** —es la regla que ya aplica el estudio previo: devolver sin
decir qué corregir deja al gestor adivinando—. Al aprobar son opcionales.

Se guardan en `hiring.revisiones`, que ya tiene `decision`, `observaciones`,
`version_revisada`, `revisado_por` y fecha. El `version_revisada` es lo que ata la
aprobación a la versión exacta que se aprobó: editar después no la arrastra.

Y quedan visibles en dos sitios: en el riel para quien tiene que corregir, y en la
trazabilidad del expediente para quien audita.

### La regla que no se configura

Quien ejecutó una actividad no puede aprobarla, aunque tenga el rol. Va en código, aplicada
donde la regla esté activa, comparando por `userId` y no por nombre —el nombre cambia si
alguien corrige su correo—.

Hoy esto solo lo comprueba la aprobación de garantías:

```
// Quien cargó la póliza no la aprueba: si la misma cuenta hiciera las dos
// cosas, la revisión que pide el criterio 1 no sería una revisión.
```

El estudio previo **no lo comprueba**: un gestor con permiso de aprobación puede
diligenciarlo, enviarlo y aprobárselo. Es un hueco que este trabajo debería cerrar de forma
uniforme.

---

## Lo que hay que hacer

| # | Qué | Alcance |
| --- | --- | --- |
| 1 | `EXIGE_APROBACION` en `TIPOS_REGLA` y en el CHECK de la tabla | migración pequeña |
| 2 | Interruptor y selector en el panel de configuración de la actividad | front |
| 3 | **Que el cierre de actividad consulte la regla** | el de más alcance |
| 4 | Guard genérico: verifica rol/persona y que no sea quien ejecutó | backend |
| 5 | La separación «quien ejecuta no aprueba» en las aprobaciones existentes | corrección transversal |

El **3 es el crítico**: hoy ningún panel lee `reglas_actividad` al cerrar una actividad. Sin
eso, lo que el jefe configure no tendría efecto.

---

## Preguntas para el área

1. **¿Y si la Dirección es una sola persona?** En una territorial pequeña el mismo abogado
   tramita y aprueba. ¿Se bloquea —y el proceso espera a la Dirección central— o se permite
   dejando constancia explícita? La recomendación es lo primero: la segunda opción convierte
   el control en un registro de que se saltó.
2. **¿Qué actividades se marcan primero?** El sistema arranca sin ninguna. La matriz sugiere
   once, pero esa lista es una lectura del texto del Excel, no un dato confirmado.
3. **¿El aviso va por correo, por la campana de la plataforma, o ambos?**
   `notifications-service` soporta las dos; hoy el módulo solo usa correo para vencimientos.

Ya resueltas con el área:

- **Rol o persona:** los dos. Se elige por actividad.
- **Cuántos aprueban:** basta con uno.
- **Qué se marca de entrada:** nada. Todas las actividades empiezan sin aprobación.

---

## Higiene pendiente en el catálogo de roles

Detectado al revisar la lista, no es parte de este diseño pero afecta al desplegable:

- **`ASD` — «asd»**: rol de pruebas, activo. Debería borrarse.
- **`PRUEBA_CONTRATISTA`**: creado para verificar los permisos; pendiente de borrar.
- **`APOYO_SUPERVISION`**: es el rol 13 del formato y **no existe**. Hoy alguien podría
  confundirlo con `apoyo-tecnico`, que es de otro módulo.
- **`SECRETARIA_RADICADOR` — «Radicador Disciplinario»**: no es el «Radicador» del formato
  de contratación, aunque el nombre lo sugiera.
