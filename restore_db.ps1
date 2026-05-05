# Script to restore DB state
$ErrorActionPreference = "Stop"
Write-Host "Running 009_auth_data..."
docker exec -i superapp-db psql -U postgres -d esap_db -f /docker-entrypoint-initdb.d/009_auth_data_20260129_211432.sql

Write-Host "Running fix_auth_schema..."
Get-Content db\fix_auth_schema.sql -Raw | docker exec -i superapp-db psql -U postgres -d esap_db

# Assuming there was a fix_add_jefe_oci.sql in db/
if (Test-Path db\fix_add_jefe_oci.sql) {
    Write-Host "Running fix_add_jefe_oci.sql..."
    Get-Content db\fix_add_jefe_oci.sql -Raw | docker exec -i superapp-db psql -U postgres -d esap_db
}

Write-Host "Running all migrations..."
$migrations = Get-ChildItem -Path "db\migrations" -Filter "*.sql" | Sort-Object Name
foreach ($migration in $migrations) {
    Write-Host "Executing $($migration.Name)..."
    Get-Content $migration.FullName -Raw | docker exec -i superapp-db psql -U postgres -q -d esap_db
}

Write-Host "Databases restored."
