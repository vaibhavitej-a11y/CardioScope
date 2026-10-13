# Select an existing runtime with the model dependencies, independent of PATH.
$ErrorActionPreference = 'Stop'
$runtimeCandidates = @(
    (Join-Path $PSScriptRoot '.venv\Scripts\python.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python313\python.exe')
)
$pathPython = Get-Command python.exe -ErrorAction SilentlyContinue
if ($pathPython) { $runtimeCandidates += $pathPython.Source }
$apiPython = $null
$runtimeProbe = @'
import importlib.util, importlib.metadata, json, sys
required = ['uvicorn', 'fastapi', 'catboost', 'shap', 'sklearn', 'pandas', 'joblib']
if not all(importlib.util.find_spec(name) for name in required):
    sys.exit(1)
with open(sys.argv[1], encoding='utf-8') as source:
    expected = json.load(source)['versions']
try:
    matches = all(importlib.metadata.version(name) == version for name, version in expected.items())
except importlib.metadata.PackageNotFoundError:
    matches = False
sys.exit(0 if matches else 1)
'@
foreach ($candidate in $runtimeCandidates | Select-Object -Unique) {
    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) { continue }
    & $candidate -c $runtimeProbe (Join-Path $PSScriptRoot 'ml\artifacts\manifest.json')
    if ($LASTEXITCODE -eq 0) { $apiPython = $candidate; break }
}
if (-not $apiPython) {
    throw 'No Python runtime matches the saved model versions. Create .venv and install the pinned requirements.txt first.'
}
Write-Host "Starting CardioScope API with $apiPython"
Push-Location (Join-Path $PSScriptRoot 'api')
try { & $apiPython -m uvicorn app.main:app --host 127.0.0.1 --port 8001 }
finally { Pop-Location }
