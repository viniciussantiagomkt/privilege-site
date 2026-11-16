# Recovery-only contract. Never applies migrations, grants or role changes.
$RecoveryFingerprintVersion = 'crm-recovery-catalog-v2'
$RecoveryCategories = @('columns','constraints','function_grants','functions','policies','schemas','table_grants','tables','triggers','views')
$RecoveryCrmVersions = '20261008144426,20261008144813,20261008145320,20261008150501,20261008163217,20261008163432,20261008163623,20261009142538,20261009144156,20261009174757,20261013180730,20261019165011,20261019165034,20261019165057,20261019165119,20261019170348,20261028143926,20261028180043,20261029173752,20261029184222,20261030185925,20261105172215'
function Assert-RecoveryFingerprint {
    param([object]$Fingerprint)
    if (!$Fingerprint -or $Fingerprint.algorithm_version -ne $RecoveryFingerprintVersion) { throw 'Unsupported fingerprint algorithm. Preserve the original evidence; do not reinterpret legacy hashes.' }
    $names = @($Fingerprint.categories.PSObject.Properties.Name | Sort-Object)
    if (($names -join ',') -ne ($RecoveryCategories -join ',')) { throw 'Fingerprint must contain exactly the ten approved categories.' }
    foreach ($name in $RecoveryCategories) {
        $part = $Fingerprint.categories.$name
        if ($part.count -isnot [ValueType] -or $part.count -lt 1 -or $part.md5 -notmatch '^[a-f0-9]{32}$') { throw "Malformed fingerprint category: $name" }
    }
}
function Assert-RecoveryHistory {
    param([object]$Platform)
    if (($Platform.crm_history.version -join ',') -ne $RecoveryCrmVersions -or @($Platform.crm_history).Count -ne 22) { throw 'CRM history differs from the approved 22 versions.' }
    $history = @($Platform.storage_history)
    $last = $history | Select-Object -Last 1
    # Storage starts at id 0: 81 records are expected through version 80.
    if ($history.Count -ne 81 -or ($history.id -join ',') -ne ((0..80) -join ',') -or $last.id -ne 80 -or $last.name -ne 'revoke-extra-lifecycle-postgres-grants' -or $last.hash -ne '18cfbf5c5b356469e1e95f3aa1b59ba111d82a06') { throw 'Storage history differs from the specifically audited Storage 80 baseline. Stop and investigate.' }
}
function Assert-RecoveryEqual {
    param([object]$Expected, [object]$Actual, [string]$Label)
    # Queries emit ordered arrays and canonical jsonb objects, not locale-dependent text.
    if (($Expected | ConvertTo-Json -Depth 30 -Compress) -cne ($Actual | ConvertTo-Json -Depth 30 -Compress)) { throw "$Label differs from the reviewed recovery baseline. Stop and investigate." }
}
