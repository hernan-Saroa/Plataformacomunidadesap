param(
    [ValidateRange(1024, 65535)][int]$Port = 3015,
    [switch]$ReplaceRunning
)
$ErrorActionPreference = 'Stop'
$chatbotRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$chatbotServicePath = Join-Path $chatbotRoot 'backend/chatbot-service'
$chatbotRuntimePath = Join-Path $chatbotRoot '.local/chatbot-runtime'
if (-not (Test-Path -LiteralPath (Join-Path $chatbotServicePath 'dist/main.js'))) {
    throw 'Compile primero backend/chatbot-service con npm run build.'
}
# Solo el proceso hijo recibe los secretos. No se guardan en archivos ni argumentos.
$chatbotKeys = @('CHATBOT_ISOLUCION_PASSWORD', 'CHATBOT_ISOLUCION_WEB_PASSWORD', 'CHATBOT_AI_ENABLED', 'PORT')
$chatbotOriginal = @{}
foreach ($chatbotKey in $chatbotKeys) { $chatbotOriginal[$chatbotKey] = [Environment]::GetEnvironmentVariable($chatbotKey, 'Process') }
try {
    foreach ($chatbotSecretKey in @('CHATBOT_ISOLUCION_PASSWORD', 'CHATBOT_ISOLUCION_WEB_PASSWORD')) {
        if (-not [Environment]::GetEnvironmentVariable($chatbotSecretKey, 'Process')) {
            $chatbotLabel = if ($chatbotSecretKey -eq 'CHATBOT_ISOLUCION_PASSWORD') { 'Clave SQL (solo memoria)' } else { 'Clave de la cuenta web de consulta (solo memoria)' }
            $chatbotSecret = Read-Host $chatbotLabel -AsSecureString
            $chatbotPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($chatbotSecret)
            try { [Environment]::SetEnvironmentVariable($chatbotSecretKey, [Runtime.InteropServices.Marshal]::PtrToStringBSTR($chatbotPointer), 'Process') }
            finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($chatbotPointer) }
        }
    }
    $chatbotListeners = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
    if ($chatbotListeners.Count) {
        if (-not $ReplaceRunning) { throw "El puerto $Port esta ocupado. Use otro puerto para revisar o -ReplaceRunning para reemplazar solo el chatbot verificado." }
        $chatbotHealth = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 5
        if ($chatbotHealth.service -ne 'chatbot-service') { throw 'El proceso existente no se identifica como chatbot-service; no se detuvo.' }
        foreach ($chatbotProcessId in @($chatbotListeners.OwningProcess | Select-Object -Unique)) {
            $chatbotProcess = Get-Process -Id $chatbotProcessId
            if ($chatbotProcess.ProcessName -ne 'node') { throw 'El puerto no pertenece a un proceso Node del chatbot; no se detuvo.' }
            $chatbotInfo = Get-CimInstance Win32_Process -Filter ("ProcessID = " + $chatbotProcessId)
            $chatbotParent = Get-CimInstance Win32_Process -Filter ("ProcessID = " + $chatbotInfo.ParentProcessId)
            if ($chatbotParent.Name -eq 'cmd.exe') {
                $chatbotSupervisor = Get-CimInstance Win32_Process -Filter ("ProcessID = " + $chatbotParent.ParentProcessId)
                if ($chatbotSupervisor.Name -eq 'node.exe' -and $chatbotSupervisor.CommandLine.Contains($chatbotServicePath) -and $chatbotSupervisor.CommandLine -match 'nest\.js.*start.*--watch') {
                    Stop-Process -Id $chatbotSupervisor.ProcessId
                }
            }
            Stop-Process -Id $chatbotProcessId -ErrorAction SilentlyContinue
        }
    }
    [void](New-Item -ItemType Directory -Force -Path $chatbotRuntimePath)
    $env:CHATBOT_AI_ENABLED = 'true'
    $env:PORT = [string]$Port
    $chatbotNode = (Get-Command node.exe).Source
    $chatbotChild = Start-Process -FilePath $chatbotNode -ArgumentList 'dist/main.js' -WorkingDirectory $chatbotServicePath -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $chatbotRuntimePath "chatbot-$Port.log") -RedirectStandardError (Join-Path $chatbotRuntimePath "chatbot-$Port.error.log")
    $chatbotStarted = $false
    for ($chatbotAttempt = 0; $chatbotAttempt -lt 30; $chatbotAttempt++) {
        if ($chatbotChild.HasExited) { throw 'El chatbot termino al arrancar. Revise el registro local de errores.' }
        try {
            $chatbotStatus = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 1
            if ($chatbotStatus.service -eq 'chatbot-service') { $chatbotStarted = $true; break }
        } catch { Start-Sleep -Milliseconds 500 }
    }
    if (-not $chatbotStarted) { throw 'No se pudo verificar el arranque del chatbot.' }
    [PSCustomObject]@{ service = 'chatbot-service'; port = $Port; processId = $chatbotChild.Id; secretsStored = $false } | ConvertTo-Json -Compress
} finally {
    foreach ($chatbotKey in $chatbotKeys) { [Environment]::SetEnvironmentVariable($chatbotKey, $chatbotOriginal[$chatbotKey], 'Process') }
}
