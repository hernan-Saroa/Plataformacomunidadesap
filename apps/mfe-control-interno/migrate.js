const fs = require('fs');

const file = 'c:/Users/Hernan_Buitrago/Documents/Platafomacomunidadesap/Plataformacomunidadesap/apps/mfe-control-interno/src/components/PlanAnualWizardDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const sIdx = content.indexOf('{/* ✅ NUEVO: Modal de edición de actividad (Decreto 648/2017) */}');
const eIdx = content.indexOf('{/* ✅ NUEVO: Modal de configuración de puntos de control (desde Edición) */}');

if (sIdx > -1 && eIdx > -1) {
    let block = content.substring(sIdx, eIdx);
    
    // Extractor of inner container
    const innerStart = block.indexOf('{/* Header del modal */}');
    const lastDiv = block.lastIndexOf('</div>');
    const secondLastDiv = block.lastIndexOf('</div>', lastDiv - 1);
    const motionDiv = block.lastIndexOf('</motion.div>', secondLastDiv);

    let inlineContent = block.substring(innerStart, motionDiv);

    // Style replacements
    inlineContent = inlineContent.replace(
        'className="px-6 py-5 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 shrink-0 relative overflow-hidden"',
        'className="px-6 py-4 bg-amber-50 shrink-0 relative overflow-hidden border-b-2 border-amber-200"'
    );
    inlineContent = inlineContent.replace(/text-white/g, 'text-amber-900').replace('text-amber-100', 'text-amber-700 bg-amber-200/50 px-2 py-0.5 rounded font-medium mt-1 inline-block');
    inlineContent = inlineContent.replace('<div className="absolute top-0 right-0 -translate-y-12 translate-x-8 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>', '');
    inlineContent = inlineContent.replace('<div className="absolute bottom-0 left-0 translate-y-8 -translate-x-8 w-32 h-32 bg-black/10 rounded-full blur-xl"></div>', '');
    inlineContent = inlineContent.replace('bg-white/20 backdrop-blur-md border border-white/20', 'bg-amber-100 border-2 border-amber-300');
    inlineContent = inlineContent.replace('onClick={() => setModalEdicion(null)}', 'onClick={() => { setActividadExpandida(null); setModoCardExpandida(\\'seguimiento\\'); }}');
    
    // Also remove the `max-h-[90vh]` and `overflow-y-auto flex-1`
    inlineContent = inlineContent.replace('p-6 overflow-y-auto flex-1 bg-gray-50/30', 'p-6 bg-amber-50/10');

    const wrapper = `                      {/* --- INACTIVE INLINE EDITOR --- */}
                      {modoCardExpandida === 'edicion' && modalEdicion?.actividad?.id === actividad.id && (
                        <div className="bg-white border-2 border-amber-300 shadow-inner flex flex-col mt-4 rounded-xl mx-4 mb-4 overflow-hidden">
` + inlineContent + `
                        </div>
                      )}
                      {/* --- END INLINE EDITOR --- */}
`;

    // 1. Strip the block out completely
    content = content.substring(0, sIdx) + content.substring(eIdx);
    
    // strip out the redundant <AnimatePresence> which wrapped it
    content = content.replace(/<AnimatePresence>[\s\n]+<\/AnimatePresence>/g, '');

    // 2. Insert into the map
    const tStart = 'className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-t-2 border-blue-200"';
    const trackStartI = content.indexOf(tStart);
    
    // we find the `<div className="p-6` around it
    const trackDivStartI = content.lastIndexOf('<div', trackStartI);

    if (trackDivStartI > -1) {
        let beforeTrack = content.substring(0, trackDivStartI);
        let afterTrack = content.substring(trackDivStartI);
        
        let newContent = beforeTrack + `                      {modoCardExpandida === 'seguimiento' && (\n` + afterTrack;
        
        // Find closing
        // The tracking div ends when we hit the Nota Informativa
        const note = 'manteniendo el cumplimiento del Decreto 648 de 2017.';
        const noteI = newContent.indexOf(note);
        
        // Find the closure of the motion.div
        const motionCloseI = newContent.indexOf('</motion.div>', noteI);

        if (motionCloseI > -1) {
            newContent = newContent.substring(0, motionCloseI) + `                      )}\n` + wrapper + `                    </motion.div>` + newContent.substring(motionCloseI + 13);
            
            fs.writeFileSync(file, newContent, 'utf8');
            console.log('Successfully completed inline migration');
        } else {
             console.log('Error finding motionCloseI');
        }
    } else {
         console.log('Error finding trackDivStartI');
    }
} else {
     console.log('Error finding markers');
}
