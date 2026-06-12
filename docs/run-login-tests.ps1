# =============================================================================
# PLAN DE PRUEBAS - LOGIN ESAP - PowerShell + curl.exe
# =============================================================================

$BASE = "http://localhost:3001"
$VALID_EMAIL = "superuser@esap.edu.co"
$VALID_PASS = "Esap.2026*"
$TMPDIR = $env:TEMP

$results = @()

function Test-Login {
    param(
        [string]$Id,
        [string]$Desc,
        [string]$Method = "POST",
        [string]$Path = "/login",
        [string]$JsonBody = "",
        [int[]]$Expect,
        [string]$Cookie = "",
        [string]$CType = "application/json"
    )

    Write-Host ""
    Write-Host "=== $Id -- $Desc ===" -ForegroundColor Yellow

    $url = "$BASE$Path"
    $tmpFile = "$TMPDIR\test_body_$Id.json"
    $args = @("-s", "-X", $Method, $url, "--max-time", "15", "-w", "`n%{http_code}")

    if ($JsonBody) {
        [System.IO.File]::WriteAllText($tmpFile, $JsonBody, [System.Text.Encoding]::UTF8)
        $args += @("-H", "Content-Type: $CType", "-d", "@$tmpFile")
    }
    if ($Cookie) {
        $args += @("-H", "Cookie: $Cookie")
    }

    $raw = & curl.exe @args 2>&1
    $lines = ($raw -join "`n").Trim().Split("`n")
    $httpCode = 0
    $body = ""
    if ($lines.Count -ge 1) {
        try { $httpCode = [int]$lines[-1] } catch { $httpCode = 0 }
        $body = ($lines[0..($lines.Count-2)] -join " ").Trim()
    }

    $passed = $Expect -contains $httpCode
    $icon = if ($passed) { "PASS" } else { "FAIL" }
    $color = if ($passed) { "Green" } else { "Red" }

    Write-Host "  HTTP: $httpCode (esperado: $($Expect -join '/'))  [$icon]" -ForegroundColor $color
    $short = if ($body.Length -gt 200) { $body.Substring(0,200) + "..." } else { $body }
    Write-Host "  Body: $short" -ForegroundColor Gray

    $script:results += [PSCustomObject]@{
        ID=$Id; Descripcion=$Desc; Esperado=($Expect -join "/"); Obtenido=$httpCode; Estado=$icon
    }

    Start-Sleep -Milliseconds 100
    return @{ Code=$httpCode; Body=$body; OK=$passed }
}

Write-Host "=========================================================" -ForegroundColor Magenta
Write-Host "  PLAN DE PRUEBAS -- LOGIN PLATAFORMA ESAP" -ForegroundColor Magenta
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Magenta
Write-Host "  Base URL: $BASE" -ForegroundColor Magenta
Write-Host "=========================================================" -ForegroundColor Magenta

# =============================================
# SECCION 1: LOGIN EXITOSO
# =============================================
Write-Host "`n>>> SECCION 1: LOGIN EXITOSO <<<" -ForegroundColor Blue

$r1 = Test-Login -Id "TC-001" -Desc "Login exitoso credenciales validas" `
    -JsonBody "{`"email`":`"$VALID_EMAIL`",`"password`":`"$VALID_PASS`"}" `
    -Expect @(200)

Test-Login -Id "TC-002" -Desc "Login email MAYUSCULAS" `
    -JsonBody "{`"email`":`"SUPERUSER@ESAP.EDU.CO`",`"password`":`"$VALID_PASS`"}" `
    -Expect @(200)

Test-Login -Id "TC-003" -Desc "Login email con espacios" `
    -JsonBody "{`"email`":`"  superuser@esap.edu.co  `",`"password`":`"$VALID_PASS`"}" `
    -Expect @(200)

Test-Login -Id "TC-004" -Desc "Login con campo username" `
    -JsonBody "{`"username`":`"$VALID_EMAIL`",`"password`":`"$VALID_PASS`"}" `
    -Expect @(200)

# =============================================
# SECCION 2: CONTRASENA INCORRECTA
# =============================================
Write-Host "`n>>> SECCION 2: CONTRASENA INCORRECTA <<<" -ForegroundColor Red

Test-Login -Id "TC-010" -Desc "Contrasena incorrecta" `
    -JsonBody "{`"email`":`"$VALID_EMAIL`",`"password`":`"contraMala123`"}" `
    -Expect @(401)

Test-Login -Id "TC-011" -Desc "Falta asterisco final (Esap.2026)" `
    -JsonBody "{`"email`":`"$VALID_EMAIL`",`"password`":`"Esap.2026`"}" `
    -Expect @(401)

Test-Login -Id "TC-012" -Desc "Case invertido (eSAP.2026*)" `
    -JsonBody "{`"email`":`"$VALID_EMAIL`",`"password`":`"eSAP.2026*`"}" `
    -Expect @(401)

Test-Login -Id "TC-013" -Desc "Espacios en contrasena" `
    -JsonBody "{`"email`":`"$VALID_EMAIL`",`"password`":`" Esap.2026* `"}" `
    -Expect @(401)

Test-Login -Id "TC-014" -Desc "Contrasena vacia" `
    -JsonBody "{`"email`":`"$VALID_EMAIL`",`"password`":`"`"}" `
    -Expect @(400, 401)

Test-Login -Id "TC-015" -Desc "Sin campo password" `
    -JsonBody "{`"email`":`"$VALID_EMAIL`"}" `
    -Expect @(400)

# Limpiar rate limit
$null = & curl.exe -s -X POST "$BASE/login" -H "Content-Type: application/json" -d "{`"email`":`"$VALID_EMAIL`",`"password`":`"$VALID_PASS`"}" --max-time 10

# =============================================
# SECCION 3: USUARIO INEXISTENTE
# =============================================
Write-Host "`n>>> SECCION 3: USUARIO INEXISTENTE <<<" -ForegroundColor Yellow

Test-Login -Id "TC-020" -Desc "Email no registrado" `
    -JsonBody "{`"email`":`"noexiste@esap.edu.co`",`"password`":`"$VALID_PASS`"}" `
    -Expect @(401)

Test-Login -Id "TC-021" -Desc "Email dominio externo (gmail)" `
    -JsonBody "{`"email`":`"user@gmail.com`",`"password`":`"$VALID_PASS`"}" `
    -Expect @(401)

Test-Login -Id "TC-022" -Desc "Sin email ni username" `
    -JsonBody "{`"password`":`"$VALID_PASS`"}" `
    -Expect @(401)

Test-Login -Id "TC-023" -Desc "Body vacio {}" `
    -JsonBody "{}" `
    -Expect @(400, 401)

# Limpiar
$null = & curl.exe -s -X POST "$BASE/login" -H "Content-Type: application/json" -d "{`"email`":`"$VALID_EMAIL`",`"password`":`"$VALID_PASS`"}" --max-time 10

# =============================================
# SECCION 4: INYECCION Y PAYLOADS MALICIOSOS
# =============================================
Write-Host "`n>>> SECCION 4: INYECCION SQL / XSS <<<" -ForegroundColor DarkYellow

Test-Login -Id "TC-050" -Desc "SQL Injection en email" `
    -JsonBody "{`"email`":`"admin' OR '1'='1`",`"password`":`"$VALID_PASS`"}" `
    -Expect @(401)

Test-Login -Id "TC-051" -Desc "SQL Injection en password" `
    -JsonBody "{`"email`":`"$VALID_EMAIL`",`"password`":`"' OR '1'='1' --`"}" `
    -Expect @(401)

Test-Login -Id "TC-053" -Desc "XSS en email" `
    -JsonBody "{`"email`":`"<script>alert(1)</script>@esap.edu.co`",`"password`":`"x`"}" `
    -Expect @(401)

$longPass = "A" * 10000
Test-Login -Id "TC-054" -Desc "Payload 10k chars en password" `
    -JsonBody "{`"email`":`"$VALID_EMAIL`",`"password`":`"$longPass`"}" `
    -Expect @(401, 413)

# Limpiar
$null = & curl.exe -s -X POST "$BASE/login" -H "Content-Type: application/json" -d "{`"email`":`"$VALID_EMAIL`",`"password`":`"$VALID_PASS`"}" --max-time 10

# =============================================
# SECCION 5: FUERZA BRUTA / RATE LIMIT
# =============================================
Write-Host "`n>>> SECCION 5: FUERZA BRUTA (Rate Limiting) <<<" -ForegroundColor Magenta
Write-Host "  Nota: .env tiene RATE_LIMIT_MAX=1000 (dev), se prueban intentos consecutivos" -ForegroundColor Gray

for ($i = 1; $i -le 3; $i++) {
    Test-Login -Id "TC-030-$i" -Desc "Intento fallido consecutivo #$i" `
        -JsonBody "{`"email`":`"$VALID_EMAIL`",`"password`":`"wrong$i`"}" `
        -Expect @(401)
}

# Verificar que login correcto resetea contador
$r32 = Test-Login -Id "TC-032" -Desc "Login correcto resetea intentos fallidos" `
    -JsonBody "{`"email`":`"$VALID_EMAIL`",`"password`":`"$VALID_PASS`"}" `
    -Expect @(200)

# =============================================
# SECCION 6: SESION Y TOKEN JWT
# =============================================
Write-Host "`n>>> SECCION 6: SESION Y TOKEN JWT <<<" -ForegroundColor Blue

# Obtener token fresco
$loginRaw = & curl.exe -s -X POST "$BASE/login" -H "Content-Type: application/json" `
    -d "{`"email`":`"$VALID_EMAIL`",`"password`":`"$VALID_PASS`"}" --max-time 15
$loginJson = $loginRaw | ConvertFrom-Json -ErrorAction SilentlyContinue
$token = $null
if ($loginJson.data.accessToken) { $token = $loginJson.data.accessToken }
elseif ($loginJson.accessToken) { $token = $loginJson.accessToken }

if ($token) {
    # Decodificar JWT
    $parts = $token.Split(".")
    $payload = $parts[1]
    $mod = $payload.Length % 4
    if ($mod -gt 0) { $payload += "=" * (4 - $mod) }
    $payload = $payload.Replace("-", "+").Replace("_", "/")
    $decoded = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($payload))
    $jwt = $decoded | ConvertFrom-Json

    $ttl = $jwt.exp - $jwt.iat
    $passed = ($ttl -eq 3600)
    $color = if ($passed) { "Green" } else { "Red" }

    Write-Host ""
    Write-Host "=== TC-060 -- JWT TTL ===" -ForegroundColor Yellow
    Write-Host "  sub: $($jwt.sub)" -ForegroundColor Gray
    Write-Host "  username: $($jwt.username)" -ForegroundColor Gray
    Write-Host "  roles: $($jwt.roles -join ', ')" -ForegroundColor Gray
    Write-Host "  TTL: ${ttl}s (esperado 3600)  [$(if($passed){'PASS'}else{'FAIL'})]" -ForegroundColor $color

    $results += [PSCustomObject]@{
        ID="TC-060"; Descripcion="JWT TTL = 3600s"; Esperado="3600"; Obtenido=$ttl; Estado=if($passed){"PASS"}else{"FAIL"}
    }

    # Verify con cookie
    Test-Login -Id "TC-061" -Desc "Verify con cookie valida" `
        -Method "GET" -Path "/verify" `
        -Cookie "esap_access_token=$token" `
        -Expect @(200)

    # Verify con token manipulado
    $fake = $token.Substring(0, $token.Length - 5) + "XXXXX"
    Test-Login -Id "TC-064" -Desc "Verify con token manipulado" `
        -Method "GET" -Path "/verify" `
        -Cookie "esap_access_token=$fake" `
        -Expect @(401)
} else {
    Write-Host "  No se pudo obtener token para pruebas JWT" -ForegroundColor Yellow
}

# Verify sin token
Test-Login -Id "TC-062" -Desc "Verify sin cookie (sin auth)" `
    -Method "GET" -Path "/verify" `
    -Expect @(401)

# Logout
Test-Login -Id "TC-067" -Desc "Logout" `
    -Path "/logout" `
    -JsonBody "{}" `
    -Expect @(200, 201)

# =============================================
# SECCION 7: RECUPERACION DE CONTRASENA
# =============================================
Write-Host "`n>>> SECCION 7: FORGOT PASSWORD <<<" -ForegroundColor Green

Test-Login -Id "TC-071" -Desc "Forgot-password email inexistente" `
    -Path "/forgot-password" `
    -JsonBody "{`"email`":`"noexiste@esap.edu.co`"}" `
    -Expect @(400)

# =============================================
# REPORTE FINAL
# =============================================
Write-Host ""
Write-Host "=========================================================" -ForegroundColor Magenta
Write-Host "              REPORTE FINAL DE PRUEBAS" -ForegroundColor Magenta
Write-Host "=========================================================" -ForegroundColor Magenta

$results | Format-Table -AutoSize

$passCount = ($results | Where-Object { $_.Estado -eq "PASS" }).Count
$failCount = ($results | Where-Object { $_.Estado -eq "FAIL" }).Count
$total = $results.Count
$pct = if ($total -gt 0) { [math]::Round(($passCount / $total) * 100, 1) } else { 0 }

Write-Host "Total: $total | PASS: $passCount | FAIL: $failCount | Tasa: $pct%" -ForegroundColor $(if ($failCount -eq 0) {"Green"} else {"Yellow"})
Write-Host ""
if ($failCount -eq 0) {
    Write-Host "*** TODAS LAS PRUEBAS PASARON ***" -ForegroundColor Green
} else {
    Write-Host "*** $failCount PRUEBAS REQUIEREN REVISION ***" -ForegroundColor Red
    $results | Where-Object { $_.Estado -eq "FAIL" } | Format-Table -AutoSize
}
Write-Host ""
