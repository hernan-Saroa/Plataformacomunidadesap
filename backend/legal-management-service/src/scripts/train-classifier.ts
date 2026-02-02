import * as natural from 'natural';
import * as path from 'path';
import * as fs from 'fs';

const classifier = new natural.BayesClassifier();
const MODEL_PATH = path.resolve(process.cwd(), 'ml_models', 'classifier.json');

const trainingData = [
    // JUDICIAL
    { text: 'Notificación de fallo judicial tutela', category: 'JUDICIAL' },
    { text: 'Sentencia primera instancia juzgado administrativo', category: 'JUDICIAL' },
    { text: 'Auto admisorio demanda nulidad y restablecimiento', category: 'JUDICIAL' },
    { text: 'Audiencia de pruebas proceso ejecutivo', category: 'JUDICIAL' },
    { text: 'Notificación estado proceso penal', category: 'JUDICIAL' },

    // OFICIO (Entes Control)
    { text: 'Requerimiento contraloría general de la república', category: 'OFICIO' },
    { text: 'Solicitud de información procuraduría', category: 'OFICIO' },
    { text: 'Traslado por competencia fiscalía', category: 'OFICIO' },
    { text: 'Hallazgo auditoría interna solicitud plan mejoramiento', category: 'OFICIO' },
    { text: 'Petición defensoría del pueblo', category: 'OFICIO' },

    // CONSULTA (Asesoría)
    { text: 'Concepto jurídico sobre contratación estatal', category: 'CONSULTA' },
    { text: 'Duda sobre viabilidad jurídica convenio', category: 'CONSULTA' },
    { text: 'Solicitud revisión legal contrato', category: 'CONSULTA' },
    { text: 'Alcance normativo decreto 1082', category: 'CONSULTA' },

    // CORREO (General)
    { text: 'Invitación capacitación jurídica', category: 'CORREO' },
    { text: 'Recordatorio reunión comité', category: 'CORREO' },
    { text: ' Boletín normativo semanal', category: 'CORREO' },
    { text: 'Actualización datos personales', category: 'CORREO' }
];

console.log('Training classifier with initial data...');
trainingData.forEach(doc => {
    classifier.addDocument(doc.text, doc.category);
});

classifier.train();

const dir = path.dirname(MODEL_PATH);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

classifier.save(MODEL_PATH, (err) => {
    if (err) {
        console.error('Error saving model:', err);
        process.exit(1);
    }
    console.log('Classifier trained and saved to:', MODEL_PATH);
});
