const fs = require('fs');
const file = 'c:/Users/Hernan_Buitrago/Documents/Platafomacomunidadesap/Plataformacomunidadesap/apps/mfe-control-interno/src/components/PlanAnualWizardDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const startMarker = '{/* ✅ NUEVO: Modal de edición de actividad (Decreto 648/2017) */}';
const endMarker = '{/* ✅ NUEVO: Modal de configuración de puntos de control (desde Edición) */}';

const modalStartIdx = content.indexOf(startMarker);
const modalEndIdx = content.indexOf(endMarker);

if (modalStartIdx !== -1 && modalEndIdx !== -1) {
    let block = content.substring(modalStartIdx, modalEndIdx);
    
    const innerStart = block.indexOf('{/* Header del modal */}');
    const innerEnd = block.lastIndexOf('</div>', block.lastIndexOf('</motion.div>'));
    
    let inlineContent = block.substring(innerStart, innerEnd);
    
    // Style replacements to make it inline
    inlineContent = inlineContent.replace('className="px-6 py-5 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 shrink-0 relative overflow-hidden"', 
        'className="px-6 py-4 bg-gradient-to-r from-amber-50 to-amber-100 border-b border-amber-200 shrink-0 relative overflow-hidden"');
    inlineContent = inlineContent.replace(/text-white/g, 'text-amber-900').replace('text-amber-100', 'text-amber-700');
    inlineContent = inlineContent.replace('<div className="absolute top-0 right-0 -translate-y-12 translate-x-8 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>', '');
    inlineContent = inlineContent.replace('<div className="absolute bottom-0 left-0 translate-y-8 -translate-x-8 w-32 h-32 bg-black/10 rounded-full blur-xl"></div>', '');
    inlineContent = inlineContent.replace('bg-white/20 backdrop-blur-md border border-white/20', 'bg-amber-200 border border-amber-400');
    inlineContent = inlineContent.replace('onClick={() => setModalEdicion(null)}', 'onClick={() => { setActividadExpandida(null); setModoCardExpandida(\"seguimiento\"); }}');

    let fullInlineEditor = `
                      {/* --- INLINE EDITOR INYECTADO --- */}
                      {modoCardExpandida === 'edicion' && modalEdicion?.actividad?.id === actividad.id && (
                        <div className="bg-white border-2 border-amber-300 rounded-b-xl overflow-hidden shadow-[inset_0px_2px_4px_rgba(0,0,0,0.05)] flex flex-col mt-0 border-t-0">
` + inlineContent + `
                        </div>
                      )}
                      {/* --- FIN INLINE EDITOR --- */}
`;

    // 1. Remove the old modal code completely
    content = content.substring(0, modalStartIdx) + content.substring(modalEndIdx);
    // Remove the redundant AnimatePresence
    content = content.replace(/<AnimatePresence>[\s\n]*<\/AnimatePresence>/g, '');

    // 2. Inject conditional rendering in tracking block
    const trackStart = '<div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-t-2 border-blue-200">';
    const trackIdx = content.indexOf(trackStart);
    
    if (trackIdx !== -1) {
        content = content.substring(0, trackIdx) + `                      {modoCardExpandida === 'seguimiento' && (\n` + content.substring(trackIdx);
        
        // Find closing of tracking block logic
        const trackingEndMarker = 'Las actividades del Plan Anual pueden editarse para ajustarlas a las necesidades específicas de la entidad, manteniendo el cumplimiento del Decreto 648 de 2017';
        const trackingEndIdx = content.indexOf(trackingEndMarker);
        
        if (trackingEndIdx !== -1) {
            // we find the next </motion.div> which ends the accordion
            const motionEndIdx = content.indexOf('</motion.div>', trackingEndIdx);
            
            if (motionEndIdx !== -1) {
                // insert the } closing of the tracking block, then the inline editor, then let it close the motion.div
                content = content.substring(0, motionEndIdx) + `                      )}\n` + fullInlineEditor + `\n                    ` + content.substring(motionEndIdx);
                fs.writeFileSync(file, content, 'utf8');
                console.log('Successfully completed inline migration!');
            } else { console.log('Failed to find motionEndIdx'); }
        } else { console.log('Failed to find trackingEndIdx'); }
    } else { console.log('Failed to find trackIdx'); }
} else { console.log('Failed to find modal margins'); }
