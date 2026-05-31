# ==============================================================================
# ESAP SuperApp - Entorno LOCAL (Windows PowerShell)
# ==============================================================================
# Este script provee las mismas capacidades que deploy.local.sh en Windows,
# sin necesidad de Git Bash o WSL.
#
# Uso:
#   .\deploy.local.ps1 up
#   .\deploy.local.ps1 down
#   .\deploy.local.ps1 status
#   .\deploy.local.ps1 health
#   .\deploy.local.ps1 db-test
#   .\deploy.local.ps1 logs [servicio]
#   .\deploy.local.ps1 rebuild
#   .\deploy.local.ps1 rebuild-service [servicio]
#   .\deploy.local.ps1 rebuild-mfe [mfe]
# ==============================================================================

param (
    [string]$Command,
    [string]$SubCommand
)

$COMPOSE_FILE_LOCAL = "docker-compose.local.yml"
$ENV_FILE_LOCAL = ".env.local"

# Colores en consola
function Show-Title ($text) {
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "  $text" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
}

function Show-Success ($text) {
    Write-Host $text -ForegroundColor Green
}

function Show-Warning ($text) {
    Write-Host $text -ForegroundColor Yellow
}

function Show-Error ($text) {
    Write-Host $text -ForegroundColor Red
}

# Validación de Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Show-Error "Error: Docker no está instalado o no se encuentra en el PATH."
    exit 1
}

# Crear .env.local si no existe
if (-not (Test-Path $ENV_FILE_LOCAL)) {
    Show-Warning "No existe $ENV_FILE_LOCAL. Creándolo desde .env.example..."
    Copy-Item ".env.example" $ENV_FILE_LOCAL
    
    $localEnvContent = @"

# ================= LOCAL DATABASE =================
# Base de datos ya existente fuera de este compose
LOCAL_DB_HOST=host.docker.internal
LOCAL_DB_PORT=5432
LOCAL_DB_USER=postgres
LOCAL_DB_PASSWORD=postgres
LOCAL_DB_NAME=esap_db

# ================= LOCAL URLS =====================
LOCAL_CORS_ORIGIN=http://localhost
FRONTEND_VITE_API_URL=http://localhost/services
FRONTEND_VITE_ONLYOFFICE_URL=http://localhost:9000
"@
    Add-Content $ENV_FILE_LOCAL $localEnvContent
    Show-Warning "Se ha creado $ENV_FILE_LOCAL. Revisa el archivo antes de continuar."
}

# Cargar variables de entorno del archivo .env.local al proceso
function Load-EnvFile ($filePath) {
    if (Test-Path $filePath) {
        Get-Content $filePath | ForEach-Object {
            $line = $_.Trim()
            if ($line -and -not $line.StartsWith("#")) {
                $parts = $line -split '=', 2
                if ($parts.Length -eq 2) {
                    $key = $parts[0].Trim()
                    $val = $parts[1].Trim()
                    # Remover comillas si existen
                    if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
                        $val = $val.Substring(1, $val.Length - 2)
                    }
                    [Environment]::SetEnvironmentVariable($key, $val, [EnvironmentVariableTarget]::Process)
                }
            }
        }
    }
}

Load-EnvFile $ENV_FILE_LOCAL

# Configurar variables locales fijas requeridas por Docker Compose local
$env:FRONTEND_NETWORK_KEY = "superapp-net"
$env:FRONTEND_CONTAINER_SUFFIX = "-local"
if (-not $env:FRONTEND_VITE_API_URL) { $env:FRONTEND_VITE_API_URL = "http://localhost:3000/services" }
if (-not $env:FRONTEND_VITE_ONLYOFFICE_URL) { $env:FRONTEND_VITE_ONLYOFFICE_URL = "http://localhost:9000" }

# Wrapper para docker compose local
function Invoke-ComposeLocal {
    param (
        [string[]]$Arguments
    )
    docker compose -f $COMPOSE_FILE_LOCAL --env-file $ENV_FILE_LOCAL $Arguments
}

# Resolver nombre de MFE a contenedor
function Resolve-MfeService ($name) {
    switch ($name) {
        "gateway" { return "frontend" }
        "frontend" { return "frontend" }
        "shell" { return "frontend-shell" }
        "frontend-shell" { return "frontend-shell" }
        "estructura-org" { return "frontend-mfe-estructura-org" }
        "mfe-estructura-org" { return "frontend-mfe-estructura-org" }
        "frontend-mfe-estructura-org" { return "frontend-mfe-estructura-org" }
        "gestion-profesoral" { return "frontend-mfe-gestion-profesoral" }
        "mfe-gestion-profesoral" { return "frontend-mfe-gestion-profesoral" }
        "frontend-mfe-gestion-profesoral" { return "frontend-mfe-gestion-profesoral" }
        "programas-academicos" { return "frontend-mfe-programas-academicos" }
        "mfe-programas-academicos" { return "frontend-mfe-programas-academicos" }
        "frontend-mfe-programas-academicos" { return "frontend-mfe-programas-academicos" }
        "gestion-personas" { return "frontend-mfe-gestion-personas" }
        "mfe-gestion-personas" { return "frontend-mfe-gestion-personas" }
        "frontend-mfe-gestion-personas" { return "frontend-mfe-gestion-personas" }
        "auditoria" { return "frontend-mfe-auditoria" }
        "mfe-auditoria" { return "frontend-mfe-auditoria" }
        "frontend-mfe-auditoria" { return "frontend-mfe-auditoria" }
        "reportes" { return "frontend-mfe-reportes" }
        "mfe-reportes" { return "frontend-mfe-reportes" }
        "frontend-mfe-reportes" { return "frontend-mfe-reportes" }
        "registro-academico" { return "frontend-mfe-registro-academico" }
        "mfe-registro-academico" { return "frontend-mfe-registro-academico" }
        "frontend-mfe-registro-academico" { return "frontend-mfe-registro-academico" }
        "certificados-laborales" { return "frontend-mfe-certificados-laborales" }
        "mfe-certificados-laborales" { return "frontend-mfe-certificados-laborales" }
        "frontend-mfe-certificados-laborales" { return "frontend-mfe-certificados-laborales" }
        "firma-electronica" { return "frontend-mfe-firma-electronica" }
        "mfe-firma-electronica" { return "frontend-mfe-firma-electronica" }
        "frontend-mfe-firma-electronica" { return "frontend-mfe-firma-electronica" }
        "control-interno" { return "frontend-mfe-control-interno" }
        "mfe-control-interno" { return "frontend-mfe-control-interno" }
        "frontend-mfe-control-interno" { return "frontend-mfe-control-interno" }
        "control-disciplinario" { return "frontend-mfe-control-disciplinario" }
        "mfe-control-disciplinario" { return "frontend-mfe-control-disciplinario" }
        "frontend-mfe-control-disciplinario" { return "frontend-mfe-control-disciplinario" }
        "gestion-legal" { return "frontend-mfe-gestion-legal" }
        "mfe-gestion-legal" { return "frontend-mfe-gestion-legal" }
        "frontend-mfe-gestion-legal" { return "frontend-mfe-gestion-legal" }
        "pta" { return "frontend-mfe-pta" }
        "mfe-pta" { return "frontend-mfe-pta" }
        "frontend-mfe-pta" { return "frontend-mfe-pta" }
        default { return $null }
    }
}

# Validación de puertos TCP
function Test-TcpPort {
    param (
        [string]$HostName,
        [int]$Port,
        [string]$Label
    )
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connection = $tcpClient.BeginConnect($HostName, $Port, $null, $null)
        $success = $connection.AsyncWaitHandle.WaitOne(2000, $false)
        if ($success) {
            $tcpClient.EndConnect($connection)
            $tcpClient.Close()
            Write-Host "  [OK] " -NoNewline -ForegroundColor Green
            Write-Host "$Label ($($HostName):$($Port))"
            return $true
        } else {
            $tcpClient.Close()
            Write-Host "  [FALLO] " -NoNewline -ForegroundColor Red
            Write-Host "$Label ($($HostName):$($Port))"
            return $false
        }
    } catch {
        Write-Host "  [FALLO] " -NoNewline -ForegroundColor Red
        Write-Host "$Label ($($HostName):$($Port)) - Error: $($_.Exception.Message)"
        return $false
    }
}

# Validación HTTP
function Test-HttpUrl {
    param (
        [string]$Url,
        [string]$Label
    )
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        $statusCode = $response.StatusCode
        if ($statusCode -ge 200 -and $statusCode -lt 400) {
            Write-Host "  [OK] " -NoNewline -ForegroundColor Green
            Write-Host "$Label ($Url)"
            return $true
        } else {
            Write-Host "  [FALLO] " -NoNewline -ForegroundColor Red
            Write-Host "$Label ($Url) - Código: $statusCode"
            return $false
        }
    } catch {
        # Si la respuesta es de error http (ej: 401, 403, 404), la excepción contiene la respuesta
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
            if ($statusCode -eq 401 -or $statusCode -eq 403 -or $statusCode -eq 404 -or $statusCode -eq 405) {
                Write-Host "  [OK (HTTP $statusCode)] " -NoNewline -ForegroundColor Green
                Write-Host "$Label ($Url)"
                return $true
            }
            Write-Host "  [FALLO] " -NoNewline -ForegroundColor Red
            Write-Host "$Label ($Url) - Código: $statusCode"
            return $false
        }
        
        # En PowerShell, la propiedad Response puede estar en $_.Exception.InnerException.Response
        if ($_.Exception.InnerException -and $_.Exception.InnerException.Response) {
            $statusCode = [int]$_.Exception.InnerException.Response.StatusCode
            if ($statusCode -eq 401 -or $statusCode -eq 403 -or $statusCode -eq 404 -or $statusCode -eq 405) {
                Write-Host "  [OK (HTTP $statusCode)] " -NoNewline -ForegroundColor Green
                Write-Host "$Label ($Url)"
                return $true
            }
        }
        
        # Intentar obtener código de estado por regex del mensaje de error
        if ($_.Exception.Message -match "(\d{3})") {
            $statusCode = [int]$Matches[1]
            if ($statusCode -eq 401 -or $statusCode -eq 403 -or $statusCode -eq 404 -or $statusCode -eq 405) {
                Write-Host "  [OK (HTTP $statusCode)] " -NoNewline -ForegroundColor Green
                Write-Host "$Label ($Url)"
                return $true
            }
        }

        Write-Host "  [FALLO] " -NoNewline -ForegroundColor Red
        Write-Host "$Label ($Url) - Error: $($_.Exception.Message)"
        return $false
    }
}

# Comandos
switch ($Command) {
    "up" {
        Show-Title "Levantando app local completa sin PostgreSQL..."
        Invoke-ComposeLocal @("up", "-d", "--build")
        Show-Success "`nAplicación local levantada con éxito."
        Write-Host "`nURLs locales:" -ForegroundColor Yellow
        Write-Host "  Frontend:    http://localhost:3000"
        Write-Host "  API Gateway: http://localhost:3000/services"
        Write-Host "  OnlyOffice:  http://localhost:9000"
    }

    "down" {
        Show-Title "Deteniendo app local..."
        Invoke-ComposeLocal @("down")
        Show-Success "Aplicación detenida."
    }

    "restart" {
        Show-Title "Reiniciando app local..."
        Invoke-ComposeLocal @("restart")
        Show-Success "Aplicación reiniciada."
    }

    "up-backend" {
        Show-Title "Levantando backend local sin PostgreSQL..."
        $backendServices = @("redis", "onlyoffice", "auth-service", "academic-registration-service", 
                             "academic-work-plan-service", "certification-service", "internal-disciplinary-control-service", 
                             "interoperability-service", "internal-institutional-control-service", "legal-management-service", 
                             "notifications-service", "travel-expenses-service", "audit-service", "api-gateway")
        Invoke-ComposeLocal (@("up", "-d", "--build") + $backendServices)
    }

    "up-frontend" {
        Show-Title "Levantando frontend MFE local..."
        $frontendServices = @("frontend", "frontend-shell", "frontend-mfe-estructura-org", "frontend-mfe-gestion-profesoral", 
                              "frontend-mfe-programas-academicos", "frontend-mfe-gestion-personas", "frontend-mfe-auditoria", 
                              "frontend-mfe-reportes", "frontend-mfe-registro-academico", "frontend-mfe-certificados-laborales", 
                              "frontend-mfe-firma-electronica", "frontend-mfe-control-interno", "frontend-mfe-control-disciplinario", 
                              "frontend-mfe-gestion-legal", "frontend-mfe-pta")
        Invoke-ComposeLocal (@("up", "-d", "--build") + $frontendServices)
    }

    "logs" {
        if ($SubCommand) {
            Invoke-ComposeLocal @("logs", "-f", $SubCommand)
        } else {
            Invoke-ComposeLocal @("logs", "-f")
        }
    }

    "status" {
        Show-Title "Estado de servicios locales"
        Invoke-ComposeLocal @("ps", "-a")
    }

    "health" {
        Show-Title "Estado de contenedores"
        Invoke-ComposeLocal @("ps")
        
        Write-Host "`nValidando puertos publicados:" -ForegroundColor Yellow
        $hasErrors = $false
        if (-not (Test-TcpPort "localhost" 3000 "Frontend gateway")) { $hasErrors = $true }
        if (-not (Test-TcpPort "localhost" 3300 "API Gateway")) { $hasErrors = $true }
        if (-not (Test-TcpPort "localhost" 9000 "OnlyOffice")) { $hasErrors = $true }
        if (-not (Test-TcpPort "localhost" 3001 "Auth Service")) { $hasErrors = $true }
        if (-not (Test-TcpPort "localhost" 3005 "Disciplinary Control Service")) { $hasErrors = $true }
        if (-not (Test-TcpPort "localhost" 3011 "Audit Service")) { $hasErrors = $true }

        Write-Host "`nValidando respuestas HTTP básicas:" -ForegroundColor Yellow
        if (-not (Test-HttpUrl "http://localhost:3000/" "Frontend")) { $hasErrors = $true }
        if (-not (Test-HttpUrl "http://localhost:3000/services/" "API Gateway")) { $hasErrors = $true }
        if (-not (Test-HttpUrl "http://localhost:3005/health" "Disciplinary Health")) { $hasErrors = $true }
        if (-not (Test-HttpUrl "http://localhost:3011/health" "Audit Health")) { $hasErrors = $true }
        if (-not (Test-HttpUrl "http://localhost:9000/" "OnlyOffice")) { $hasErrors = $true }

        if ($hasErrors) {
            Show-Error "`nSe detectaron fallos en la validación local."
            exit 1
        } else {
            Show-Success "`nValidación local completada correctamente."
        }
    }

    "db-test" {
        Show-Title "Probando conexión TCP a la base de datos externa desde auth-service..."
        $dbHost = if ($env:LOCAL_DB_HOST) { $env:LOCAL_DB_HOST } else { "host.docker.internal" }
        $dbPort = if ($env:LOCAL_DB_PORT) { $env:LOCAL_DB_PORT } else { "5432" }
        $dbName = if ($env:LOCAL_DB_NAME) { $env:LOCAL_DB_NAME } else { "esap_db" }
        $dbUser = if ($env:LOCAL_DB_USER) { $env:LOCAL_DB_USER } else { "postgres" }

        Write-Host "  Host: $dbHost" -ForegroundColor Yellow
        Write-Host "  Port: $dbPort" -ForegroundColor Yellow
        Write-Host "  DB:   $dbName" -ForegroundColor Yellow
        Write-Host "  User: $dbUser`n" -ForegroundColor Yellow

        $nodeTestScript = "const net=require('net'); const host=process.env.DB_HOST; const port=Number(process.env.DB_PORT || 5432); const socket=net.createConnection({host, port}); socket.setTimeout(5000); socket.on('connect', () => { console.log('DB TCP OK ' + host + ':' + port); socket.end(); process.exit(0); }); socket.on('timeout', () => { console.error('DB TCP timeout ' + host + ':' + port); socket.destroy(); process.exit(1); }); socket.on('error', (err) => { console.error('DB TCP FAIL ' + host + ':' + port + ' -> ' + err.message); process.exit(1); });"

        Invoke-ComposeLocal @("run", "--rm", "--no-deps", "auth-service", "node", "-e", $nodeTestScript)
    }

    "rebuild" {
        Show-Title "Reconstruyendo toda la app local..."
        Invoke-ComposeLocal @("build")
        Invoke-ComposeLocal @("up", "-d")
    }

    "rebuild-service" {
        if (-not $SubCommand) {
            Show-Error "Debes indicar un servicio. Ejemplo: rebuild-service auth-service"
            exit 1
        }
        Show-Title "Reconstruyendo servicio backend o infra: $SubCommand"
        Invoke-ComposeLocal @("build", $SubCommand)
        Invoke-ComposeLocal @("up", "-d", "--no-deps", $SubCommand)
    }

    "rebuild-mfe" {
        if (-not $SubCommand) {
            Show-Error "Debes indicar gateway, shell o un MFE. Ejemplo: rebuild-mfe auditoria"
            exit 1
        }
        $resolvedService = Resolve-MfeService $SubCommand
        if (-not $resolvedService) {
            Show-Error "MFE no reconocido: $SubCommand"
            exit 1
        }
        Show-Title "Reconstruyendo microfrontend: $resolvedService ($SubCommand)"
        Invoke-ComposeLocal @("build", $resolvedService)
        Invoke-ComposeLocal @("up", "-d", "--no-deps", $resolvedService)
    }

    default {
        Write-Host "Uso: .\deploy.local.ps1 [comando]`n" -ForegroundColor Yellow
        Write-Host "Comandos disponibles:"
        Write-Host "  up                 - Levantar toda la app local sin PostgreSQL"
        Write-Host "  down               - Detener toda la app local"
        Write-Host "  restart            - Reiniciar toda la app local"
        Write-Host "  up-backend         - Levantar sólo backend + redis + onlyoffice"
        Write-Host "  up-frontend        - Levantar sólo gateway + shell + MFEs"
        Write-Host "  logs [servicio]    - Ver logs (Ctrl+C para salir)"
        Write-Host "  status             - Ver estado de servicios"
        Write-Host "  health             - Validar puertos y URLs base"
        Write-Host "  db-test            - Probar conexión TCP a la BD externa desde el contenedor"
        Write-Host "  rebuild            - Reconstruir toda la app local"
        Write-Host "  rebuild-service <s - Reconstruir un servicio backend o infra"
        Write-Host "  rebuild-mfe <nombr - Reconstruir shell, gateway o un MFE"
    }
}
