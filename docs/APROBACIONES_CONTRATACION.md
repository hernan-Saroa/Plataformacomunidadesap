# Aprobaciones por actividad — propuesta para validar con Contratación

**Estado:** propuesta, pendiente de aprobación del área.
**Origen:** EFDS-1183 (RF-SIS-02), matriz de flujo v2 y «Formato usuario-roles-permisos Jun 2026».

---

## El problema

Hoy el módulo sabe **quién puede aprobar** —el permiso `contratacion.actividad.approve` lo
tienen el Revisor y el Director— pero no sabe **qué actividades exigen aprobación**. Eso
está repartido entre el código de cada panel: la etapa 3 tiene su ciclo
`BORRADOR → EN_REVISION → APROBADO`, las garantías tienen su propia revisión, la
adjudicación su acto. Cada una lo resolvió a su manera.

La consecuencia es que **la matriz no gobierna las aprobaciones**. Si Contratación decide
mañana que la actividad 5.7 debe aprobarse antes de continuar, hoy hay que tocar código;
y si decide que la 8.4 ya no, también.

Esta propuesta traslada esa decisión de donde está —el código— a donde ya viven las demás
reglas del flujo: la base de datos, editable desde el módulo de configuración.

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

## La propuesta: la aprobación como regla, no como código

El módulo ya tiene un motor de reglas por actividad —`hiring.reglas_actividad`— que declara
qué hay que cumplir para dar una actividad por terminada: qué campo es obligatorio, qué
documento se exige, qué plazo debe transcurrir. Los tipos existentes son:

```
CAMPO_OBLIGATORIO · DOCUMENTO_REQUERIDO · RANGO_VALOR
PLAZO_MINIMO · BLOQUEA_AVANCE · REGLA_DERIVADA
```

**La aprobación es una condición más de esa misma naturaleza**, así que entra como un tipo
nuevo en vez de como una tabla aparte:

```
EXIGE_APROBACION
```

Con su `config` en JSON, igual que las demás:

```json
{
  "permiso": "contratacion.actividad.approve",
  "exigeDocumento": true,
  "puedeDevolver": true
}
```

### Qué se gana

**El permiso no se quema, se declara.** La regla dice qué permiso hace falta; quién tiene
ese permiso lo decide el administrador desde el backoffice de roles. Es el mismo principio
que aplicamos al retirar las listas `ROLES_*`: el código nombra facultades, la entidad
decide quién las ejerce.

**Contratación lo cambia sin desplegar.** Añadir la aprobación a una actividad es una fila
en `reglas_actividad`, y quitarla es cerrarle la vigencia. El módulo de configuración ya
edita esa tabla.

**La vigencia protege lo ya aprobado.** `reglas_actividad` tiene `vigente_desde` y
`vigente_hasta` justamente para esto: un proceso aprobado en enero se audita con las reglas
de enero. Cambiar hoy quién aprueba no reescribe la historia de lo ya decidido.

**Nada de lo que hoy funciona se rompe.** Los ciclos que ya existen —estudio previo,
garantías, adjudicación— siguen igual; la regla los describe en vez de sustituirlos.

### Qué no resuelve

La regla dice **que** hace falta aprobación y **qué permiso** la habilita. No dice quién en
concreto: eso sigue siendo la asignación rol → permiso, que es donde debe estar.

Tampoco cubre las aprobaciones que no son de una actividad sino de un objeto —aprobar una
modificación contractual, decidir un sancionatorio—, que ya tienen su propio permiso y su
propia máquina de estados.

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
