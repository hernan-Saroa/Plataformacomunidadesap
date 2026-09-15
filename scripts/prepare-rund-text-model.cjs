// Reutiliza los pesos oficiales de Gemma 4 con su renderer/parser, solo para texto OCR.
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const service=path.join(root,'backend/academic-work-plan-service');
const file=path.join(root,'.env.rund-ocr.local');
const env=require(path.join(service,'node_modules/dotenv')).parse(fs.readFileSync(file));
const source=process.argv[2]||env.RUND_OLLAMA_MODEL;
const target='gemma4:rund-e2b-text';
if(source===target){console.log('Modelo de texto RUND ya configurado.');process.exit(0);}
if(source!=='gemma4:e2b-it-qat')throw new Error('La preparación de texto se limita al modelo oficial e2b-it-qat validado.');
const compose=['compose','--env-file',file,'-f',path.join(root,'docker-compose.rund-ocr.yml')];
const container=execFileSync('docker',[...compose,'ps','-q','rund-ollama'],{encoding:'utf8'}).trim();
if(!container)throw new Error('Inicie Ollama local antes de preparar el modelo.');
const original=execFileSync('docker',['exec',container,'ollama','show',source,'--modelfile'],{encoding:'utf8'});
let layers=0;
const text=original.split(/\r?\n/).filter(line=>!/^FROM\s/.test(line)||++layers===1).join('\n');
if(layers!==2||!text.includes('RENDERER gemma4')||!text.includes('PARSER gemma4'))throw new Error('El formato del modelo cambió. Revise los pesos antes de continuar.');
const output=path.join(root,'.local/rund-extraction-real');fs.mkdirSync(output,{recursive:true});
const modelfile=path.join(output,'Gemma4-text.Modelfile');fs.writeFileSync(modelfile,text);
execFileSync('docker',['cp',modelfile,`${container}:/tmp/rund-text.Modelfile`]);
execFileSync('docker',['exec',container,'ollama','create',target,'-f','/tmp/rund-text.Modelfile'],{stdio:'inherit'});
fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace(/^RUND_OLLAMA_MODEL=.*$/m,`RUND_OLLAMA_MODEL=${target}`));
console.log('Gemma 4 para texto OCR preparado; se conservan los pesos, la plantilla y la licencia oficiales.');
