[CmdletBinding()]
param(
  [string]$EnvId = "magicj-web-d5g9yvowj6862f7a2",
  [string]$FunctionName = "youversion-verse",
  [string]$BibleId = "3283"
)

$ErrorActionPreference = "Stop"

try {
  $appKey = [string](Get-Clipboard -Raw)
  $appKey = $appKey.Trim()
  if ($appKey.Length -lt 20 -or $appKey.Length -gt 256 -or $appKey -notmatch "^[\x21-\x7E]+$") {
    throw "The clipboard does not contain a valid App Key. Copy the key and try again."
  }
  if ($BibleId -notmatch "^\d+$") {
    throw "BibleId must be numeric."
  }

  $body = @{
    FunctionName = $FunctionName
    Namespace = $EnvId
    Environment = @{
      Variables = @(
        @{ Key = "YVP_APP_KEY"; Value = $appKey },
        @{ Key = "YVP_BIBLE_ID"; Value = $BibleId }
      )
    }
  } | ConvertTo-Json -Depth 6 -Compress
  $escapedBody = $body.Replace('"', '\"')

  $previousErrorAction = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $commandOutput = (& cloudbase.cmd -e $EnvId api scf UpdateFunctionConfiguration --api-version 2018-04-16 --body $escapedBody --json 2>&1 | Out-String)
  $updateExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorAction
  if ($updateExitCode -ne 0) {
    $safeOutput = $commandOutput.Replace($appKey, "[REDACTED]").Trim()
    throw "Could not update the CloudBase function environment variables. $safeOutput"
  }

  $ErrorActionPreference = "Continue"
  $detailOutput = (& cloudbase.cmd -e $EnvId fn detail $FunctionName --json 2>$null | Out-String)
  $detailExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorAction
  if ($detailExitCode -ne 0) {
    throw "CloudBase updated the function, but the environment verification request failed."
  }
  $details = $detailOutput | ConvertFrom-Json
  $variableKeys = @($details.data.Environment.Variables | ForEach-Object { $_.Key })
  if ($variableKeys -notcontains "YVP_APP_KEY" -or $variableKeys -notcontains "YVP_BIBLE_ID") {
    throw "CloudBase did not retain the required YouVersion environment variables."
  }

  Write-Output "CloudBase YouVersion environment variables updated and verified securely."
}
finally {
  $appKey = $null
  $body = $null
  $escapedBody = $null
  $commandOutput = $null
  $safeOutput = $null
  $detailOutput = $null
  $details = $null
}
