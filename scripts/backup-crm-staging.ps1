# Read-only manual PostgreSQL backup. Never restores or applies migrations.
# Run on Windows PowerShell 5.1 or PowerShell 7 with PostgreSQL 17 client tools.
[CmdletBinding()]
param([string]$PgBin = 'C:\Program Files\PostgreSQL\17\bin')
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$projectRef = 'sdpqphiooiuglywcmkxv'
$expectedMigrationVersions = '20261008144426,20261008144813,20261008145320,20261008150501,20261008163217,20261008163432,20261008163623,20261009142538,20261009144156,20261009174757,20261013180730,20261019165011,20261019165034,20261019165057,20261019165119,20261019170348,20261028143926,20261028180043'
$backupDirectory = $null
$completed = $false
$priorEnvironment = @{}
$environmentKeys = @('PGPASSWORD','PGSSLMODE','PGCONNECT_TIMEOUT','PGOPTIONS','PGPASSFILE','PGSERVICE','PGSERVICEFILE')
foreach ($key in $environmentKeys) { $priorEnvironment[$key] = [Environment]::GetEnvironmentVariable($key, 'Process') }

function Invoke-PgClient {
    param([string]$Program, [string[]]$ClientArguments, [string]$OutputFile)
    $errorFile = Join-Path $backupDirectory ($Program + '-last-error.txt')
    $previousPreference = $ErrorActionPreference
    try {
        # Password is inherited through the child environment, never a CLI argument.
        $ErrorActionPreference = 'Continue'
        & (Join-Path $PgBin ($Program + '.exe')) @ClientArguments 1> $OutputFile 2> $errorFile
        $clientExit = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previousPreference }
    if ($clientExit -ne 0) {
        throw "$Program failed (exit $clientExit). Inspect the local error file in the private backup folder. Do not send database dumps or credentials in chat."
    }
    Remove-Item -LiteralPath $errorFile -Force -ErrorAction SilentlyContinue
}

try {
    if ($env:OS -ne 'Windows_NT') { throw 'This script requires Windows. No database operation was executed.' }
    foreach ($name in @('pg_dump','pg_dumpall','pg_restore','psql')) {
        $tool = Join-Path $PgBin ($name + '.exe')
        if (!(Test-Path -LiteralPath $tool)) { throw "Install PostgreSQL 17 client tools first. Missing: $tool" }
        $version = & $tool --version
        if ($version -notmatch '\b17\.') { throw "$name must be version 17 for this staging database." }
    }
    Write-Host 'Source project: privilege-imoveis-staging / sdpqphiooiuglywcmkxv'
    Write-Host 'In Supabase Connect, use Direct connection or Session pooler (port 5432).'
    Write-Host 'Enter only the host and username below, never an entire connection URL.'
    $databaseHost = (Read-Host 'Host from staging Connect (Enter for direct connection)').Trim()
    if (!$databaseHost) { $databaseHost = "db.$projectRef.supabase.co" }
    if ($databaseHost -eq "db.$projectRef.supabase.co") {
        $databaseUser = 'postgres'
    } elseif ($databaseHost -match '^aws-[a-z0-9-]+\.pooler\.supabase\.com$') {
        $databaseUser = "postgres.$projectRef"
    } else { throw 'Host rejected. Only this staging direct host or a Supabase session pooler is allowed.' }
    $destinationRoot = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'PrivilegeCRM-Backups'
    $backupDirectory = Join-Path $destinationRoot ('staging-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N').Substring(0,8))
    [void](New-Item -ItemType Directory -Path $backupDirectory -Force)
    # Dedicated folder: only the current Windows user and SYSTEM can access it.
    $acl = New-Object System.Security.AccessControl.DirectorySecurity
    $acl.SetAccessRuleProtection($true, $false)
    $currentSid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
    $systemSid = New-Object System.Security.Principal.SecurityIdentifier('S-1-5-18')
    foreach ($sid in @($currentSid, $systemSid)) {
        $rule = New-Object System.Security.AccessControl.FileSystemAccessRule($sid, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
        [void]$acl.AddAccessRule($rule)
    }
    Set-Acl -LiteralPath $backupDirectory -AclObject $acl
    Write-Host "Private output folder: $backupDirectory"
    Write-Host 'Backup contains private data and Auth password hashes. Keep it out of Git, chat, shared folders and email.'
    $passwordInput = Read-Host 'Staging DATABASE password (not an API key; input hidden)' -AsSecureString
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($passwordInput)
    try { $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer) }
    $env:PGSSLMODE = 'require'
    $env:PGCONNECT_TIMEOUT = '20'
    $env:PGOPTIONS = '-c default_transaction_read_only=on'
    $env:PGPASSFILE = Join-Path $backupDirectory 'unused-password-file'
    $env:PGSERVICE = $null
    $env:PGSERVICEFILE = $null
    $connection = @('--host', $databaseHost, '--port', '5432', '--username', $databaseUser, '--no-password')
    $inspection = @'
select json_build_object(
 'server_version',current_setting('server_version'),
 'migration_count',(select count(*) from supabase_migrations.schema_migrations),
 'migration_versions',(select string_agg(version,',' order by version) from supabase_migrations.schema_migrations),
 'm5_present',exists(select 1 from supabase_migrations.schema_migrations where version='20261019170348'),
 'new_migration_present',to_regprocedure('public.crm_marketing_recipients()') is not null,
 'auth_users',(select count(*) from auth.users),
 'leads',(select count(*) from public.leads),
 'clients',(select count(*) from public.clients),
 'materials',(select count(*) from public.marketing_assets)
)::text;
'@
    $inspectionFile = Join-Path $backupDirectory 'source-counts.json'
    Invoke-PgClient 'psql' ($connection + @('--dbname','postgres','-X','--set','ON_ERROR_STOP=1','--tuples-only','--no-align','--command',$inspection)) $inspectionFile
    $source = Get-Content -LiteralPath $inspectionFile -Raw | ConvertFrom-Json
    if ($source.server_version -notmatch '^17\.' -or !$source.m5_present -or $source.migration_count -ne $expectedMigrationVersions.Split(',').Count -or !$source.new_migration_present -or $source.migration_versions -ne $expectedMigrationVersions) {
        throw 'Source history differs from the authorized baseline. Stop; do not apply or repeat any migration.'
    }
    $dumpFile = Join-Path $backupDirectory 'staging-database.dump'
    Invoke-PgClient 'pg_dump' ($connection + @('--dbname','postgres','--format=custom','--lock-wait-timeout=5s','--file',$dumpFile)) (Join-Path $backupDirectory 'dump-output.txt')
    if (!(Test-Path -LiteralPath $dumpFile) -or (Get-Item -LiteralPath $dumpFile).Length -lt 1024) { throw 'Database archive missing or unexpectedly small.' }
    Invoke-PgClient 'pg_dumpall' ($connection + @('--database','postgres','--roles-only','--no-role-passwords','--file',(Join-Path $backupDirectory 'roles.sql'))) (Join-Path $backupDirectory 'roles-output.txt')
    # Archive enumeration and full SQL decoding are useful integrity checks,
    # but are deliberately NOT reported as a successful database restore.
    Invoke-PgClient 'pg_restore' @('--list',$dumpFile) (Join-Path $backupDirectory 'archive-toc.txt')
    $decoded = Join-Path $backupDirectory 'archive-decoding-check.sql'
    Invoke-PgClient 'pg_restore' @('--file',$decoded,$dumpFile) (Join-Path $backupDirectory 'decode-output.txt')
    $toc = Get-Content -LiteralPath (Join-Path $backupDirectory 'archive-toc.txt') -Raw
    foreach ($entry in @('TABLE DATA public leads ', 'TABLE DATA public marketing_assets ', 'TABLE DATA auth users ', 'FUNCTION crm_private asset_readable', 'POLICY storage objects marketing_storage_read')) {
        if (!$toc.Contains($entry)) { throw "Required backup entry missing: $entry" }
    }
    Remove-Item -LiteralPath $decoded -Force
    $manifest = [ordered]@{
        project = $projectRef
        created_utc = [DateTime]::UtcNow.ToString('o')
        source = $source
        archive = 'staging-database.dump'
        archive_bytes = (Get-Item -LiteralPath $dumpFile).Length
        archive_sha256 = (Get-FileHash -LiteralPath $dumpFile -Algorithm SHA256).Hash
        roles_sha256 = (Get-FileHash -LiteralPath (Join-Path $backupDirectory 'roles.sql') -Algorithm SHA256).Hash
        archive_list_and_decode = 'PASS'
        test_restore = 'NOT_EXECUTED'
        storage_file_bytes = 'NOT_INCLUDED'
        external_service_configuration = 'NOT_INCLUDED'
        source_modified = $false
    }
    $manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $backupDirectory 'manifest.json') -Encoding UTF8
    $completed = $true
    Write-Host 'BACKUP FILES CREATED; archive listing and decoding passed.'
    Write-Host 'Restore verification is still pending. No migration or restore was executed.'
    Write-Host "Keep this folder private: $backupDirectory"
    Write-Host 'You may report creation time, archive size, SHA-256 and PASS status. Do not upload the dump, roles or decoded SQL.'
} catch {
    Write-Host ('Backup not confirmed: ' + $_.Exception.Message)
    if ($backupDirectory) { Write-Host 'Partial files were retained in the private output folder for local inspection. Do not treat them as a completed backup.' }
    exit 1
} finally {
    foreach ($key in $environmentKeys) { [Environment]::SetEnvironmentVariable($key, $priorEnvironment[$key], 'Process') }
    if (Get-Variable passwordInput -ErrorAction SilentlyContinue) { $passwordInput.Dispose() }
    $passwordInput = $null
    $passwordPointer = [IntPtr]::Zero
}
