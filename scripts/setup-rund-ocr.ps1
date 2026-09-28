param([switch]$Start, [switch]$CpuOnly, [string]$Model = 'qwen3.5:4b')
$ErrorActionPreference = 'Stop'
if ($Model -notmatch '^qwen3\.5:4b(?:-[a-zA-Z0-9_.-]+)?$' -or $Model -match 'cloud') { throw 'Seleccione la etiqueta local qwen3.5:4b validada para RUND.' }
$rundRoot = Split-Path -Parent $PSScriptRoot
$rundConfig = Join-Path $rundRoot '.env.rund-ocr.local'
if (-not (Test-Path -LiteralPath $rundConfig)) {
  $rundBytes = New-Object byte[] 32
  $rundRng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $rundRng.GetBytes($rundBytes)
  $rundRng.Dispose()
  $rundToken = [Convert]::ToBase64String($rundBytes)
  @"
RUND_OCR_TOKEN=$rundToken
RUND_OCR_URL=http://localhost:8091
RUND_OLLAMA_URL=http://localhost:11435
RUND_OLLAMA_MODEL=$Model
RUND_OCR_ENABLED=false
"@ | Set-Content -LiteralPath $rundConfig -Encoding ascii
}
Write-Host 'Configuración local preparada. El token no se muestra en pantalla.'
if (-not $Start) { Write-Host 'Para instalar motores y modelos: .\scripts\setup-rund-ocr.ps1 -Start'; exit 0 }
$rundMemory = Get-CimInstance Win32_OperatingSystem
$rundGpu = $false
if (-not $CpuOnly -and (Get-Command nvidia-smi -ErrorAction SilentlyContinue)) {
  $rundGpuMemory = @(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>$null)
  $rundGpu = $LASTEXITCODE -eq 0 -and @($rundGpuMemory | Where-Object { [int]$_ -ge 6000 }).Count -gt 0
}
Write-Host ('RAM libre: {0:N1} GB. GPU NVIDIA compatible detectada: {1}.' -f ($rundMemory.FreePhysicalMemory / 1MB), $rundGpu)
if (-not $rundGpu -and $rundMemory.FreePhysicalMemory -lt 8GB / 1KB) {
  Write-Warning 'La RAM disponible es reducida para CPU. Ollama comprobará si puede cargar el modelo; cierre aplicaciones si solicita más memoria.'
}
$rundValues = Get-Content -LiteralPath $rundConfig
$rundValues = $rundValues -replace '^RUND_OLLAMA_MODEL=.*$', "RUND_OLLAMA_MODEL=$Model"
$rundValues | Set-Content -LiteralPath $rundConfig -Encoding ascii
$rundCompose = @('compose','--env-file',$rundConfig,'-f',(Join-Path $rundRoot 'docker-compose.rund-ocr.yml'))
if ($rundGpu) { $rundCompose += @('-f',(Join-Path $rundRoot 'docker-compose.rund-ocr.gpu.yml')) }
docker info --format '{{.ServerVersion}}'
if ($LASTEXITCODE -ne 0) { throw 'Inicie Docker Desktop con contenedores Linux antes de continuar.' }
docker @rundCompose up -d --build
if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar la infraestructura OCR local.' }
docker @rundCompose exec -T rund-ollama ollama pull $Model
if ($LASTEXITCODE -ne 0) { throw 'No se pudo descargar Qwen 3.5 local.' }
docker @rundCompose exec -T rund-ocr python warmup.py
if ($LASTEXITCODE -ne 0) { throw 'No se pudieron preparar los modelos de PaddleOCR.' }
node (Join-Path $rundRoot 'scripts/warm-rund-ollama.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Qwen 3.5 no pudo inicializar el contexto de extracción local.' }
# El reemplazo se hace al final: solo se eliminan los pesos anteriores cuando
# Qwen y PP-OCRv6 ya quedaron descargados y respondieron correctamente.
$installedModels = @(docker @rundCompose exec -T rund-ollama ollama list)
if ($LASTEXITCODE -ne 0) { throw 'No fue posible consultar los modelos locales instalados.' }
foreach ($oldModel in @('gemma4:rund-e2b-text', 'gemma4:e2b-it-qat')) {
  if ($installedModels -match ('^' + [regex]::Escape($oldModel) + '\s')) {
    docker @rundCompose exec -T rund-ollama ollama rm $oldModel
    if ($LASTEXITCODE -ne 0) { throw "No fue posible eliminar el modelo anterior $oldModel." }
  }
}
Write-Host 'Motores preparados. Aplique la migración 656 y cargue las variables locales en el servicio PTA antes de habilitar RUND_OCR_ENABLED=true.'
