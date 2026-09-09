# Aprobaciones por actividad — propuesta para validar con Contratación

**Estado:** propuesta, pendiente de aprobación del área.
**Origen:** EFDS-1183 (RF-SIS-02), matriz de flujo v2 y «Formato usuario-roles-permisos Jun 2026».

---

## El problema

Las actividades que hoy exigen aprobación la exigen porque **alguien la programó para esa
actividad en concreto**: el estudio previo tiene su ciclo `BORRADOR → EN_REVISION →
APROBADO`, las garantías su revisión, el pago su aval. Funcionan bien y cada una comprueba
lo que le toca.

Lo que no existe es la posibilidad de **declarar que otra actividad también la exige**. Si
Contratación decide que la 5.7 debe aprobarse antes de continuar, hoy hay que escribir el
ciclo dentro de ese panel; y si decide que ya no, hay que quitarlo. La matriz gobierna qué
actividades aplican a cada modalidad, pero no cuáles necesitan un visto bueno.

Esta propuesta es sobre eso y solo sobre eso: llevar esa decisión de donde está —el
código— a donde ya viven las demás reglas del flujo.

---

## Lo que la matriz pide hoy

Once de las 63 actividades implican un acto de revisión o aprobación. Se leen del texto de
la propia matriz:

| Numeral | Actividad | Qué dice la matriz | Tipo |
| --- | --- | --- | --- |
| 1.4 | Validar matriz de necesidades | «priorización, depuración y aprobación del alcance» | aprueba |
| 2.2 | Aprobación del PAA | «aprueba comité de contratación» | aprueba |
| 3.3 | Radicación a la Dirección | «genera consecutivo… revisar proceso OTIC» | revisa |
| 3.4 | Revisión y reparto | «revisiones, mesas de trabajo y observaciones» | revisa |
| 3.6 | Comité de contratación | «va o no / observa o no / **aprueba o no**» | aprueba |
| 4.2 | Verificar disponibilidad presupuestal | «Financiera verifica disponibilidad» | revisa |
| 6.2 | Evaluación de ofertas | «el comité verifica requisitos jurídicos, financieros y técnicos» | revisa |
| 8.1 | Elaboración de contrato | «firma por representante legal de la entidad y el contratista» | firma |
| 8.4 | Constitución de garantías | «aprobación/rechazo en SECOP II o mediante documento» | aprueba |
| 9.1 | Reunión de inicio | «acta de inicio firmada por ambas partes» | firma |
| 10.2 | Liquidación | «acta de liquidación si el contrato lo requiere» | revisa |

Las de las etapas 1 y 2 están fuera del alcance de la fase actual.

---

## Lo primero: cada aprobación tiene su propia lógica

Catorce servicios implementan hoy alguna forma de aprobar, rechazar o devolver, y **no son
variantes de lo mismo**. Cada una comprueba condiciones que solo tienen sentido en su
contexto:

| Aprobación | Lo que exige, además del permiso |
| --- | --- |
| Estudio previo (3.1) | ciclo de versiones; la aprobación se ata a `version_revisada` |
| CDP (4.2 / 4.3) | verificar disponibilidad antes de expedir; el rechazo lleva motivo |
| Garantías (8.4) | contrato suscrito, y **quien cargó la póliza no puede aprobarla** |
| Pago (9.4) | contrato **en ejecución** y ser el **supervisor vigente de ese contrato** |
| Modificación (9.5) | dos aprobaciones distintas: el respaldo presupuestal y la modificación |
| Informe final (10.1) | ser el supervisor vigente; concluye sobre lo que se vigiló |

Esto **no es duplicación que convenga unificar**. Que el supervisor de otro contrato no
pueda avalar este pago, o que quien subió la póliza no la apruebe, son reglas de negocio
específicas; meterlas en un motor genérico las volvería un campo de configuración que nadie
sabría interpretar, y una de ellas mal puesta abriría un agujero de control interno.

**La propuesta no toca esa lógica.** Lo que sigue es solo sobre *qué actividades exigen
aprobación*, que es lo que hoy no es configurable.

---

## La propuesta: declarar dónde hace falta aprobación

El módulo ya tiene un motor de reglas por actividad —`hiring.reglas_actividad`— que declara
qué hay que cumplir para dar una actividad por terminada: qué campo es obligatorio, qué
documento se exige, qué plazo debe transcurrir. Los tipos existentes son:

```
CAMPO_OBLIGATORIO · DOCUMENTO_REQUERIDO · RANGO_VALOR
PLAZO_MINIMO · BLOQUEA_AVANCE · REGLA_DERIVADA
```

Se propone un tipo más, con el mismo alcance que los otros —declarar una condición, no
ejecutarla—:

```
EXIGE_APROBACION
```

```json
{ "permiso": "contratacion.actividad.approve" }
```

### Qué hace y qué no hace

**Hace** tres cosas, todas sobre actividades que hoy no tienen ciclo propio:

- Marca que la actividad no se cierra sin un acto de aprobación registrado.
- Dice qué permiso lo habilita, sin nombrar un rol.
- Permite que Contratación añada o quite esa exigencia sin desplegar.

**No hace** ninguna de estas:

- No sustituye los ciclos existentes. El estudio previo, las garantías, el pago y la
  adjudicación siguen con su lógica; la regla, si acaso, los describe.
- No decide quién aprueba. Eso es la asignación rol → permiso, que es donde debe estar.
- No cubre las aprobaciones sobre objetos —modificación contractual, sancionatorio—, que
  tienen su propio permiso y su propia máquina de estados.

### Por qué en esa tabla y no en una nueva

Porque la vigencia ya está resuelta ahí. `reglas_actividad` tiene `vigente_desde` y
`vigente_hasta` justamente para esto: un proceso aprobado en enero se audita con las reglas
de enero, y cambiar hoy una exigencia no reescribe la historia de lo ya decidido. Una tabla
nueva tendría que reimplementar eso mismo.

---

## Preguntas para el área

Estas no son decisiones técnicas y no deberían resolverse en el código:

**1. ¿Quién aprueba una actividad?**
El formato de roles marca «Aprobar» **solo para el Jefe de Oficina**. Hoy el sistema se lo
concede también al `REVISOR_CONTRATACION`, heredado del catálogo anterior. Si el formato
manda, hay que retirárselo al Revisor.

**2. ¿Los Abogados borran y archivan?**
El formato les marca «Archivar» y «Borrar». El sistema es hoy más restrictivo: borrar un
proceso es solo del superadministrador, y archivar el expediente es del Archivo de Gestión.
Se implementó así a propósito —reabrir un expediente archivado toca algo ya declarado ante
entes de control— pero contradice el formato.

**3. ¿Cómo se corresponden los nombres?**
El formato habla de «Radicador», «Abogado» y «Jefe Oficina». El sistema usa
`GESTOR_CONTRATACION`, `REVISOR_CONTRATACION` y `DIRECTOR_CONTRATACION`. Hay que confirmar
si son los mismos roles con otro nombre o si falta alguno.

**4. ¿Cuáles de las once actividades exigen aprobación formal?**
La tabla de arriba las deduce del texto de la matriz. Conviene que el área confirme cuáles
exigen realmente un acto de aprobación registrado y cuáles son solo un trámite interno.

**5. ¿La aprobación exige documento?**
Hoy el estudio previo no se envía a revisión sin el documento firmado. ¿Debe aplicarse el
mismo criterio a las demás, o hay actividades que se aprueban sin soporte?

---

## Lo que ya está funcionando

Para que la conversación parta de lo que hay, no de cero:

- **El ciclo de aprobación existe y bloquea.** Verificado sobre un proceso real: no deja
  enviar a revisión sin el documento firmado, ni aprobar lo que no está en revisión.
- **Cada aprobación deja evidencia.** `hiring.revisiones` guarda la decisión, las
  observaciones, quién revisó, cuándo y —lo importante— `version_revisada`: la aprobación
  queda atada a la versión exacta que se aprobó, así que editar el documento después no
  arrastra la aprobación.
- **Las competencias están separadas.** Quien solicita una modificación no la aprueba; quien
  instruye un sancionatorio no lo decide; quien carga una póliza no la aprueba. Verificado
  contra la API.
