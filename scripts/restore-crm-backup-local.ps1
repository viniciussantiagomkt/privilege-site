# Local-only restore rehearsal. No remote credentials, migrations or cleanup.
[CmdletBinding()]
param(
    [string]$BackupDirectory = (Join-Path $env:LOCALAPPDATA 'PrivilegeCRM-Backups\staging-20261029-143447-eeea9907'),
    [ValidatePattern('^[A-Fa-f0-9]{64}$')]
    [string]$ExpectedArchiveSha256 = '0DCF13B6F547608D88A2C21FAE30EE5556EA867C4F25EE258E0A2E06F913B45A',
    [ValidateRange(1, [long]::MaxValue)]
    [long]$ExpectedArchiveBytes = 787769
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$expectedHash = $ExpectedArchiveSha256.ToUpperInvariant()
$expectedImage = 'supabase/postgres@sha256:f371b5f3f2ac0a05703f33d6e6134515fb2498cab708fb948a0aeb7481467c00'
$containerName = 'privilege-crm-restore-20261028'
$projectRef = 'sdpqphiooiuglywcmkxv'
$validationFile = $null
$targetDatabase = 'privilege_restore_' + [Guid]::NewGuid().ToString('N').Substring(0,12)
$stepNumber = 0

function Invoke-LocalDocker {
    param([string]$Step, [string[]]$ClientArguments)
    $script:stepNumber++
    $errorFile = Join-Path $BackupDirectory ('restore-step-' + $script:stepNumber + '.log')
    $previousPreference = $ErrorActionPreference
    try {
        # Native stderr stays in the existing private folder, never in chat output.
        $ErrorActionPreference = 'Continue'
        $result = & docker @ClientArguments 2> $errorFile
        $clientExit = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previousPreference }
    if ($clientExit -ne 0) {
        throw "$Step failed (exit $clientExit). Private diagnostics: $errorFile. Do not paste the entire log in chat."
    }
    if ((Get-Item -LiteralPath $errorFile).Length -eq 0) { Remove-Item -LiteralPath $errorFile -Force }
    return ($result -join "`n")
}
function Read-LocalQuery {
    param([string]$Database, [string]$Sql)
    return Invoke-LocalDocker 'Local SQL check' @('exec',$containerName,'psql','-U','supabase_admin','-d',$Database,'-X','-v','ON_ERROR_STOP=1','-t','-A','-c',$Sql)
}
try {
    if ($env:OS -ne 'Windows_NT') { throw 'This script is for Windows only.' }
    if (!(Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker command not found.' }
    if ($env:DOCKER_HOST -or $env:DOCKER_CONTEXT) { throw 'Custom DOCKER_HOST/DOCKER_CONTEXT detected. Stop and review the Docker endpoint first.' }
    $BackupDirectory = (Resolve-Path -LiteralPath $BackupDirectory).Path
    $archiveFile = Join-Path $BackupDirectory 'staging-database.dump'
    $manifestFile = Join-Path $BackupDirectory 'manifest.json'
    $manifest = Get-Content -LiteralPath $manifestFile -Raw | ConvertFrom-Json
    if ($manifest.project -ne $projectRef -or $manifest.archive_list_and_decode -ne 'PASS') { throw 'Backup manifest is not the expected staging backup.' }
    if ($manifest.archive_sha256 -ne $expectedHash -or (Get-FileHash -LiteralPath $archiveFile -Algorithm SHA256).Hash -ne $expectedHash) { throw 'Backup SHA-256 mismatch. Nothing will be restored.' }
    if ((Get-Item -LiteralPath $archiveFile).Length -ne $ExpectedArchiveBytes -or $manifest.archive_bytes -ne $ExpectedArchiveBytes) { throw 'Unexpected archive size.' }
    $contextName = (Invoke-LocalDocker 'Docker context check' @('context','show')).Trim()
    if ($contextName -ne 'desktop-linux') { throw 'Only the local desktop-linux Docker context is allowed.' }
    $endpoint = (Invoke-LocalDocker 'Local Docker endpoint check' @('context','inspect','desktop-linux','--format','{{.Endpoints.docker.Host}}')).Trim()
    if ($endpoint -notmatch '^npipe:') { throw 'Docker endpoint is not a Windows local named pipe.' }
    $network = (Invoke-LocalDocker 'Container network check' @('inspect','--format','{{.HostConfig.NetworkMode}}',$containerName)).Trim()
    $ports = (Invoke-LocalDocker 'Container port check' @('inspect','--format','{{json .HostConfig.PortBindings}}',$containerName)).Trim()
    $privileged = (Invoke-LocalDocker 'Container privilege check' @('inspect','--format','{{.HostConfig.Privileged}}',$containerName)).Trim()
    $binds = (Invoke-LocalDocker 'Container bind check' @('inspect','--format','{{json .HostConfig.Binds}}',$containerName)).Trim()
    $image = (Invoke-LocalDocker 'Container image check' @('inspect','--format','{{.Config.Image}}',$containerName)).Trim()
    if ($network -ne 'none' -or $ports -notin @('{}','null') -or $privileged -ne 'false' -or $binds -notin @('[]','null') -or $image -ne $expectedImage) {
        throw 'Container isolation or image differs from the agreed restore sandbox. Stop.'
    }
    $serverVersion = (Read-LocalQuery 'postgres' "select current_setting('server_version_num');").Trim()
    if ($serverVersion -notmatch '^17\d{4}$') { throw 'Local PostgreSQL must be version 17.' }
    Write-Host 'PASS: backup hash and local-only container isolation.'
    $containerArchive = '/tmp/privilege-staging-' + $expectedHash.Substring(0,12) + '.dump'
    [void](Invoke-LocalDocker 'Copy archive to isolated container' @('cp',$archiveFile,($containerName + ':' + $containerArchive)))
    $copiedHash = (Invoke-LocalDocker 'Container archive hash check' @('exec',$containerName,'sha256sum',$containerArchive)).Trim().Split(' ')[0]
    if ($copiedHash.ToUpperInvariant() -ne $expectedHash) { throw 'Copied archive hash mismatch.' }
    # A new database on every run. No overwrite, DROP, reset or remote host flags.
    [void](Invoke-LocalDocker 'Create fresh local database' @('exec',$containerName,'createdb','-U','supabase_admin','--template=template0',$targetDatabase))
    Write-Host "Restoring into a NEW LOCAL database: $targetDatabase"
    # --clean applies only inside this new local database, including its empty
    # default public schema. --single-transaction rolls back on any restore error.
    [void](Invoke-LocalDocker 'Transactional archive restore' @('exec',$containerName,'pg_restore','-U','supabase_admin',('--dbname=' + $targetDatabase),'--single-transaction','--exit-on-error','--clean','--if-exists',$containerArchive))
    $sql = @'
select json_build_object(
 'auth_users',(select count(*) from auth.users),
 'leads',(select count(*) from public.leads),
 'clients',(select count(*) from public.clients),
 'materials',(select count(*) from public.marketing_assets),
 'migration_count',(select count(*) from supabase_migrations.schema_migrations),
 'm5_present',exists(select 1 from supabase_migrations.schema_migrations where version='20261019170348'),
 'new_migration_present',to_regprocedure('public.crm_marketing_recipients()') is not null,
 'public_tables_without_rls',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and not c.relrowsecurity),
 'marketing_storage_policy_present',exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='marketing_storage_read'),
 'audience_function_present',to_regprocedure('public.crm_set_asset_audience(bigint,text,uuid[])') is not null
)::text;
'@
    $restored = (Read-LocalQuery $targetDatabase $sql) | ConvertFrom-Json
    $differences = @()
    foreach ($field in @('auth_users','leads','clients','materials','migration_count','m5_present','new_migration_present')) {
        if ($restored.$field -ne $manifest.source.$field) { $differences += $field }
    }
    if ($restored.public_tables_without_rls -ne 0 -or !$restored.marketing_storage_policy_present -or !$restored.audience_function_present) { $differences += 'schema_security_checks' }
    $archiveUnchanged = (Get-FileHash -LiteralPath $archiveFile -Algorithm SHA256).Hash -eq $expectedHash
    if (!$archiveUnchanged) { $differences += 'original_archive_hash' }
    $result = if ($differences.Count -eq 0) { 'PASS' } else { 'REVIEW_REQUIRED' }
    $validationFile = Join-Path $BackupDirectory ('restore-validation-' + $targetDatabase + '.json')
    [ordered]@{
        result = $result
        project = $projectRef
        verified_utc = [DateTime]::UtcNow.ToString('o')
        archive_sha256 = $expectedHash
        archive_unchanged = $archiveUnchanged
        container = $containerName
        local_database = $targetDatabase
        local_postgres_version_num = $serverVersion
        image = $expectedImage
        network = 'none'
        published_ports = @()
        restore_transaction_exit = 0
        comparison_differences = $differences
        restored_counts_and_checks = $restored
        source_manifest_counts = $manifest.source
        remote_connection_used = $false
        migration_executed = $false
        limits = @('Database restore only; no Auth login or HTTP Storage byte tests.','Storage file bytes and external project configuration are not included.','Row comparisons cover manifest counts; pg_restore must complete without errors.','No original backup or manifest was overwritten.')
    } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $validationFile -Encoding UTF8
    if ($result -ne 'PASS') { throw "Restore completed but comparison requires review: $($differences -join ', '). Do not apply the migration." }
    Write-Host 'RESTORE PASS: transaction completed; manifest counts and schema checks match.'
    Write-Host 'Original archive unchanged. Staging and production were not contacted.'
    Write-Host 'No migration was executed. The backup manifest was not overwritten.'
    Write-Host "Private verification report: $validationFile"
    Write-Host 'Send only the final PASS line or the generic failure message. Keep logs and database files private.'
} catch {
    Write-Host ('RESTORE NOT VALIDATED: ' + $_.Exception.Message)
    Write-Host "Local database (if created): $targetDatabase. It was not automatically deleted or reused."
    Write-Host 'Original backup retained. No remote migration was executed.'
    exit 1
}
