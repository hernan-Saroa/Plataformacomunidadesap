# 🔄 REORGANIZACIÓN: Plan Anual de Auditoría

**Fecha:** 31 Enero 2026  
**Acción:** Mover módulo `plan-anual-auditoria` dentro de `control-interno-gestion`

---

## ✅ COMPLETADO

### 1. Archivos YA creados en nueva ubicación:

- ✅ `/components/esap/control-interno-gestion/plan-anual-auditoria/index.ts`
- ✅ `/components/esap/control-interno-gestion/plan-anual-auditoria/PlanAnualAuditoriaModule.tsx`

### 2. Imports actualizados:

- ✅ `/components/esap/control-interno-gestion/ControlInternoGestionFull.tsx`
  - Cambio: `from '../plan-anual-auditoria'` → `from './plan-anual-auditoria'`
  - Cambio: `from '../plan-anual-auditoria/types'` → `from './plan-anual-auditoria/types'`

---

## 📋 ARCHIVOS PENDIENTES POR COPIAR

Debido a la gran cantidad de archivos (~20 archivos), necesitas copiar MANUALMENTE la estructura completa.

### Estructura completa a copiar:

```
ORIGEN: /components/esap/plan-anual-auditoria/
DESTINO: /components/esap/control-interno-gestion/plan-anual-auditoria/

├── components/
│   ├── DashboardPAI.tsx                     ← COPIAR
│   └── CalendarioInformesLey.tsx            ← COPIAR
│
├── constants/
│   ├── rolesDecreto648Oficial.ts            ← COPIAR
│   └── informesDeLeyOficiales.ts            ← COPIAR
│
├── wizard/
│   ├── WizardCrearPAI.tsx                   ← COPIAR
│   ├── Paso1DatosGenerales.tsx              ← COPIAR
│   ├── Paso2UniversoAuditable.tsx           ← COPIAR
│   ├── Paso3EvaluacionRiesgos.tsx           ← COPIAR
│   ├── Paso4RecursosOCI.tsx                 ← COPIAR
│   ├── Paso5CronogramaAuditorias.tsx        ← COPIAR
│   └── Paso6MatrizDecreto648.tsx            ← COPIAR
│
├── services/
│   ├── exportacionPAI.ts                    ← COPIAR
│   ├── exportarExcelEMFO001.ts              ← COPIAR
│   └── exportarPDFCorporativo.ts            ← COPIAR
│
└── types/
    ├── index.ts                             ← COPIAR
    ├── planAnual.types.ts                   ← COPIAR
    ├── recursos.types.ts                    ← COPIAR
    ├── riesgos.types.ts                     ← COPIAR
    └── universoAuditable.types.ts           ← COPIAR
```

---

## 🛠️ INSTRUCCIONES MANUALES

### Opción 1: Copiar carpetas completas (Recomendado)

1. Copia la carpeta completa:
   ```
   /components/esap/plan-anual-auditoria/*
   ```

2. Pégala en:
   ```
   /components/esap/control-interno-gestion/plan-anual-auditoria/
   ```

3. **IMPORTANTE:** Ya existen estos archivos en destino (NO sobreescribir):
   - `index.ts` (ya actualizado)
   - `PlanAnualAuditoriaModule.tsx` (ya actualizado)

4. Elimina la carpeta antigua:
   ```
   /components/esap/plan-anual-auditoria/
   ```

---

### Opción 2: Script de Copia (Terminal/CMD)

#### En Linux/Mac:
```bash
# Copiar carpetas
cp -r /components/esap/plan-anual-auditoria/components /components/esap/control-interno-gestion/plan-anual-auditoria/
cp -r /components/esap/plan-anual-auditoria/constants /components/esap/control-interno-gestion/plan-anual-auditoria/
cp -r /components/esap/plan-anual-auditoria/wizard /components/esap/control-interno-gestion/plan-anual-auditoria/
cp -r /components/esap/plan-anual-auditoria/services /components/esap/control-interno-gestion/plan-anual-auditoria/
cp -r /components/esap/plan-anual-auditoria/types /components/esap/control-interno-gestion/plan-anual-auditoria/

# Eliminar carpeta antigua
rm -rf /components/esap/plan-anual-auditoria/
```

#### En Windows (PowerShell):
```powershell
# Copiar carpetas
Copy-Item -Path "components\esap\plan-anual-auditoria\components" -Destination "components\esap\control-interno-gestion\plan-anual-auditoria\" -Recurse
Copy-Item -Path "components\esap\plan-anual-auditoria\constants" -Destination "components\esap\control-interno-gestion\plan-anual-auditoria\" -Recurse
Copy-Item -Path "components\esap\plan-anual-auditoria\wizard" -Destination "components\esap\control-interno-gestion\plan-anual-auditoria\" -Recurse
Copy-Item -Path "components\esap\plan-anual-auditoria\services" -Destination "components\esap\control-interno-gestion\plan-anual-auditoria\" -Recurse
Copy-Item -Path "components\esap\plan-anual-auditoria\types" -Destination "components\esap\control-interno-gestion\plan-anual-auditoria\" -Recurse

# Eliminar carpeta antigua
Remove-Item -Path "components\esap\plan-anual-auditoria\" -Recurse -Force
```

---

## ⚠️ VERIFICACIONES POST-MIGRACIÓN

Después de copiar los archivos, verifica:

### 1. Estructura correcta:
```
/components/esap/control-interno-gestion/plan-anual-auditoria/
├── index.ts                          ✅ YA EXISTE
├── PlanAnualAuditoriaModule.tsx      ✅ YA EXISTE
├── components/                       ← VERIFICAR
├── constants/                        ← VERIFICAR
├── wizard/                           ← VERIFICAR
├── services/                         ← VERIFICAR
└── types/                            ← VERIFICAR
```

### 2. Imports funcionando:
- El módulo `ControlInternoGestionFull.tsx` debe importar correctamente
- No deben existir errores de TypeScript
- La aplicación debe compilar sin errores

### 3. Carpeta antigua eliminada:
- `/components/esap/plan-anual-auditoria/` debe NO existir

---

## 🎯 RESULTADO FINAL

### Estructura ANTES:
```
/components/esap/
├── control-interno/              (operativo)
├── control-interno-gestion/      (home CIG)
│   └── ControlInternoGestionFull.tsx
└── plan-anual-auditoria/         ❌ Separado (mal)
```

### Estructura DESPUÉS:
```
/components/esap/
├── control-interno/                    (operativo)
└── control-interno-gestion/            (home CIG + PAI) ✅
    ├── ControlInternoGestionFull.tsx
    ├── index.ts
    └── plan-anual-auditoria/           ✅ Integrado
        ├── PlanAnualAuditoriaModule.tsx
        ├── index.ts
        ├── components/
        ├── constants/
        ├── wizard/
        ├── services/
        └── types/
```

---

## 📊 ESTADÍSTICAS

| Concepto | Cantidad |
|----------|----------|
| Archivos a copiar | ~20 |
| Carpetas a copiar | 5 |
| Archivos ya creados | 2 |
| Imports actualizados | 1 archivo |
| Archivos a eliminar (carpeta antigua) | ~22 |

---

## ✅ CHECKLIST FINAL

- [ ] Copiar carpeta `components/`
- [ ] Copiar carpeta `constants/`
- [ ] Copiar carpeta `wizard/`
- [ ] Copiar carpeta `services/`
- [ ] Copiar carpeta `types/`
- [ ] Verificar que la app compile sin errores
- [ ] Eliminar carpeta antigua `/plan-anual-auditoria/`
- [ ] Probar que el módulo funcione correctamente
- [ ] Actualizar documentación si es necesario

---

**NOTA:** Los archivos `index.ts` y `PlanAnualAuditoriaModule.tsx` ya fueron creados y actualizados 
en la nueva ubicación con los imports corregidos. NO los sobreescribas al copiar.

---

**Última actualización:** 31 Enero 2026
