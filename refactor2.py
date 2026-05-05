import os
import re

file_path = "c:/Users/Hernan_Buitrago/Documents/Platafomacomunidadesap/Plataformacomunidadesap/apps/mfe-control-interno/src/components/PlanAnualWizardDashboard.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

with open('inline.txt', 'r', encoding='utf-8') as f:
    inline_content = f.read()

# 1. DELETE MODAL
start_marker = "{/* ✅ NUEVO: Modal de edición de actividad (Decreto 648/2017) */}"
end_marker = "{/* ✅ NUEVO: Modal de configuración de puntos de control (desde Edición) */}"
s_idx = content.find(start_marker)
e_idx = content.find(end_marker)

if s_idx > -1 and e_idx > -1:
    anim_start = content.rfind('<AnimatePresence>', 0, s_idx)
    anim_end = content.find('</AnimatePresence>', s_idx)
    content = content[:anim_start] + content[anim_end + 18:]

# 2. INJECT INLINE HTML
track_start = '<div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-t-2 border-blue-200">'
content = content.replace(
    track_start,
    "                      {modoCardExpandida === 'seguimiento' && (\n                        " + track_start
)

note = 'manteniendo el cumplimiento del Decreto 648 de 2017.'
note_idx = content.find(note)
motion_close_idx = content.find('</motion.div>', note_idx)

content = content[:motion_close_idx] + "                      )}\n" + inline_content + "                    " + content[motion_close_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS injected')
