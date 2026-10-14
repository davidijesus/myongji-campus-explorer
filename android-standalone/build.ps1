#Requires -Version 7.0
[CmdletBinding()]
param(
    [string]$Sdk = "$env:LOCALAPPDATA\Android\Sdk",
    [string]$Jdk = 'C:\Program Files\Java\jdk-18.0.2.1',
    [string]$BuildRoot,
    [string]$OutputApk,
    [string]$Keystore,
    [string]$CommunityEndpoint = ''
)
$ErrorActionPreference = 'Stop'
# This option is explicit and is never populated from the environment or UI.
if ($CommunityEndpoint) {
    $endpointUri = $null
    if ($CommunityEndpoint -cnotmatch '^https://[a-z0-9.-]+/[A-Za-z0-9_./-]+$' -or
        ![Uri]::TryCreate($CommunityEndpoint, [UriKind]::Absolute, [ref]$endpointUri) -or
        $endpointUri.HostNameType -ne [UriHostNameType]::Dns -or !$endpointUri.Host.Contains('.') -or
        $endpointUri.Host.EndsWith('.') -or $endpointUri.Host.EndsWith('.localhost') -or
        $endpointUri.AbsolutePath.Contains('//') -or $CommunityEndpoint -match '/(?:\.|\.\.)(?:/|$)') {
        throw 'CommunityEndpoint must be a fixed canonical HTTPS URL with a DNS host and path, without credentials, port, query, fragment or dot segments.'
    }
}
$project = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$work = [IO.Path]::GetFullPath((Join-Path $project '..'))
if (!$BuildRoot) { $BuildRoot = Join-Path $work ('android-standalone-build\' + (Get-Date -Format 'yyyyMMdd-HHmmss')) }
if (!$OutputApk) { $OutputApk = Join-Path $BuildRoot 'myongji-campus-explorer-v0.6.2-development.apk' }
if (!$Keystore) { throw 'Pass the existing authorized development keystore explicitly. This build never creates keys.' }
$BuildRoot = [IO.Path]::GetFullPath($BuildRoot)
$OutputApk = [IO.Path]::GetFullPath($OutputApk)
$Keystore = [IO.Path]::GetFullPath($Keystore)
if (!(Test-Path -LiteralPath $Keystore -PathType Leaf)) { throw 'The existing authorized keystore is missing. No replacement key will be created.' }
if ($Keystore.StartsWith($project + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Keep the private signing key outside distributable project sources.' }
$tools = Join-Path $Sdk 'build-tools\36.0.0'
$androidJar = Join-Path $Sdk 'platforms\android-36\android.jar'
foreach ($tool in @("$tools\aapt.exe","$tools\aapt2.exe","$tools\d8.bat","$tools\zipalign.exe","$tools\apksigner.bat","$Jdk\bin\javac.exe","$Jdk\bin\java.exe",$androidJar)) {
    if (!(Test-Path -LiteralPath $tool)) { throw "Missing build tool: $tool" }
}
$expectedHash = 'e3b968f148d76971dd474b3ba885420e2806cb9f28b28f3c74388858f0981455'
$html = Join-Path $project 'preview.html'
if ((Get-FileHash -LiteralPath $html -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedHash) { throw 'The HTML differs from the reviewed v0.6.2 bundle. Review before changing expectedHash.' }
$previousJavaHome = $env:JAVA_HOME
$env:JAVA_HOME = $Jdk
function Run([string]$Executable, [string[]]$Arguments) {
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Executable failed with exit code $LASTEXITCODE" }
}
try {
    $classes = Join-Path $BuildRoot 'classes'; $dex = Join-Path $BuildRoot 'dex'; $assets = Join-Path $BuildRoot 'assets'; $resources = Join-Path $BuildRoot 'res'
    foreach ($directory in @($classes,$dex,$assets,$resources,(Split-Path $OutputApk))) { New-Item -ItemType Directory -Path $directory -Force | Out-Null }
    Copy-Item -LiteralPath $html -Destination (Join-Path $assets 'index.html')
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'res\values') -Destination $resources -Recurse
    New-Item -ItemType Directory -Path (Join-Path $resources 'mipmap-nodpi') -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $project 'mobile\assets\icon.png') -Destination (Join-Path $resources 'mipmap-nodpi\ic_launcher.png')
    $generatedSources = Join-Path $BuildRoot 'generated-sources'
    New-Item -ItemType Directory -Path $generatedSources -Force | Out-Null
    $endpointSource = Join-Path $generatedSources 'CommunityEndpoint.java'
    # Regenerate even when empty: a reused build directory cannot retain a test URL.
    Set-Content -LiteralPath $endpointSource -Encoding utf8 -Value ('package dev.student.myongjiexplorer.standalone; public final class CommunityEndpoint { public static final String URL = "' + $CommunityEndpoint + '"; private CommunityEndpoint() {} }')
    $sources = @(Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'src') -Filter '*.java' -Recurse | Where-Object Name -ne 'CommunityEndpoint.java' | ForEach-Object FullName) + @($endpointSource)
    Run "$Jdk\bin\javac.exe" (@('--release','8','-encoding','UTF-8','-classpath',$androidJar,'-d',$classes) + $sources)
    Run "$Jdk\bin\javac.exe" @('--release','8','-encoding','UTF-8','-classpath',$classes,'-d',(Join-Path $BuildRoot 'test-classes'),(Join-Path $PSScriptRoot 'tests\ExternalLinkPolicyTest.java'))
    Run "$Jdk\bin\java.exe" @('-classpath',($classes+';'+(Join-Path $BuildRoot 'test-classes')),'ExternalLinkPolicyTest')
    Run 'node' @((Join-Path $project 'scripts\naver-fixtures.cjs'),(Join-Path $BuildRoot 'naver-destinations.tsv'))
    Run "$Jdk\bin\javac.exe" @('--release','8','-encoding','UTF-8','-classpath',$classes,'-d',(Join-Path $BuildRoot 'test-classes'),(Join-Path $PSScriptRoot 'tests\NaverMapLinkTest.java'))
    Run "$Jdk\bin\java.exe" @('-classpath',($classes+';'+(Join-Path $BuildRoot 'test-classes')),'NaverMapLinkTest',(Join-Path $BuildRoot 'naver-destinations.tsv'))
    Run "$Jdk\bin\javac.exe" @('--release','8','-encoding','UTF-8','-classpath',($classes+';'+$androidJar),'-d',(Join-Path $BuildRoot 'test-classes'),(Join-Path $PSScriptRoot 'tests\NativeLocationPolicyTest.java'))
    Run "$Jdk\bin\java.exe" @('-classpath',($classes+';'+(Join-Path $BuildRoot 'test-classes')+';'+$androidJar),'NativeLocationPolicyTest',$project)
    Run "$Jdk\bin\javac.exe" @('--release','8','-encoding','UTF-8','-classpath',$classes,'-d',(Join-Path $BuildRoot 'test-classes'),(Join-Path $PSScriptRoot 'tests\CommunitySnapshotTest.java'),(Join-Path $PSScriptRoot 'tests\CommunityRefreshClientTest.java'))
    Run "$Jdk\bin\java.exe" @('-classpath',($classes+';'+(Join-Path $BuildRoot 'test-classes')),'dev.student.myongjiexplorer.standalone.CommunitySnapshotTest',(Join-Path $project 'docs\v055-validation\community-interop'))
    Run "$Jdk\bin\java.exe" @('-classpath',($classes+';'+(Join-Path $BuildRoot 'test-classes')),'dev.student.myongjiexplorer.standalone.CommunityRefreshClientTest')
    $classFiles = @(Get-ChildItem -LiteralPath $classes -Filter '*.class' -Recurse | ForEach-Object FullName)
    Run "$tools\d8.bat" (@('--release','--min-api','24','--lib',$androidJar,'--output',$dex) + $classFiles)
    $compiled = Join-Path $BuildRoot 'resources.zip'; $unsigned = Join-Path $BuildRoot 'unsigned.apk'; $aligned = Join-Path $BuildRoot 'aligned.apk'
    Run "$tools\aapt2.exe" @('compile','--dir',$resources,'-o',$compiled)
    Run "$tools\aapt2.exe" @('link','-I',$androidJar,'--manifest',(Join-Path $PSScriptRoot 'AndroidManifest.xml'),'-A',$assets,'-o',$unsigned,$compiled)
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::Open($unsigned,[IO.Compression.ZipArchiveMode]::Update)
    try { [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,(Join-Path $dex 'classes.dex'),'classes.dex',[IO.Compression.CompressionLevel]::Optimal) | Out-Null } finally { $archive.Dispose() }
    Run "$tools\zipalign.exe" @('-P','16','-f','4',$unsigned,$aligned)
    Run "$tools\apksigner.bat" @('sign','--ks',$Keystore,'--ks-key-alias','standalone-demo','--ks-pass','pass:android','--key-pass','pass:android','--v1-signing-enabled','true','--v2-signing-enabled','true','--v3-signing-enabled','true','--out',$OutputApk,$aligned)
    Run "$tools\zipalign.exe" @('-c','-P','16','4',$OutputApk)
    Run "$tools\apksigner.bat" @('verify','--verbose','--print-certs',$OutputApk)
    Run "$tools\aapt.exe" @('dump','badging',$OutputApk)
    $archive = [IO.Compression.ZipFile]::OpenRead($OutputApk)
    try {
        $native = @($archive.Entries | Where-Object { $_.FullName.EndsWith('.so') })
        if ($native.Count -ne 0) { throw 'Unexpected bundled native library' }
        $entry = $archive.GetEntry('assets/index.html'); if (!$entry) { throw 'Missing offline HTML' }
        $stream = $entry.Open(); $sha = [Security.Cryptography.SHA256]::Create()
        try { $assetHash = [Convert]::ToHexString($sha.ComputeHash($stream)).ToLowerInvariant() } finally { $sha.Dispose(); $stream.Dispose() }
        if ($assetHash -ne $expectedHash) { throw 'Packaged HTML bytes do not match frozen source' }
    } finally { $archive.Dispose() }
    Write-Host ('APK: ' + $OutputApk)
    Write-Host ('SHA256: ' + (Get-FileHash -LiteralPath $OutputApk -Algorithm SHA256).Hash.ToLowerInvariant())
    Write-Host 'Verified: matching offline HTML; zero .so libraries; alignment; signature; reviewed external-link and foreground-location policies. Device execution remains untested.'
} finally { $env:JAVA_HOME = $previousJavaHome }
