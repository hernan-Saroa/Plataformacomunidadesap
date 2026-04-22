import os

file_path = "c:/Users/Hernan_Buitrago/Documents/Platafomacomunidadesap/Plataformacomunidadesap/apps/mfe-control-interno/src/components/PlanAnualWizardDashboard.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "{/* ✅ NUEVO: Modal de edición de actividad (Decreto 648/2017) */}"
end_marker = "{/* ✅ NUEVO: Modal de configuración de puntos de control (desde Edición) */}"

s_idx = content.find(start_marker)
e_idx = content.find(end_marker)

if s_idx > -1 and e_idx > -1:
    block = content[s_idx:e_idx]
    
    # Extract inner
    inner_start = block.find('{/* Header del modal */}')
    inner_end = block.rfind('</div>', 0, block.rfind('</motion.div>'))
    
    inline_content = block[inner_start:inner_end]
    
    # Style replacements
    inline_content = inline_content.replace(
        'className="px-6 py-5 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 shrink-0 relative overflow-hidden"',
        'className="px-6 py-4 bg-amber-50 shrink-0 relative overflow-hidden border-b border-amber-200"'
    )
    inline_content = inline_content.replace('text-white', 'text-amber-900').replace('text-amber-100', 'text-amber-700 bg-amber-200/50 px-2 py-0.5 rounded font-medium inline-block mt-1')
    inline_content = inline_content.replace('<div className="absolute top-0 right-0 -translate-y-12 translate-x-8 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>', '')
    inline_content = inline_content.replace('<div className="absolute bottom-0 left-0 translate-y-8 -translate-x-8 w-32 h-32 bg-black/10 rounded-full blur-xl"></div>', '')
    inline_content = inline_content.replace('bg-white/20 backdrop-blur-md border border-white/20', 'bg-amber-100 border border-amber-300')
    inline_content = inline_content.replace('onClick={() => setModalEdicion(null)}', 'onClick={() => { setActividadExpandida(null); setModoCardExpandida(\'seguimiento\'); }}')
    inline_content = inline_content.replace('p-6 overflow-y-auto flex-1 bg-gray-50/30', 'p-6 bg-amber-50/20')
    
    wrapper = """                      {/* --- INLINE EDITOR --- */}
                      {modoCardExpandida === 'edicion' && modalEdicion?.actividad?.id === actividad.id && (
                        <div className="bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] flex flex-col mt-4 rounded-xl mx-4 mb-4 overflow-hidden border-2 border-amber-300">
""" + inline_content + """
                        </div>
                      )}
                      {/* --- END INLINE EDITOR --- */}
"""
    with open('inline.txt', 'w', encoding='utf-8') as f:
        f.write(wrapper)
else:
    print("No markers found")
