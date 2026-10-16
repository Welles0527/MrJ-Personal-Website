[CmdletBinding()]
param([string]$InstallDirectory = '')
$ErrorActionPreference = 'Stop'
if (-not $InstallDirectory) { $InstallDirectory = Join-Path $PSScriptRoot '../tmp/barca-reminders' }
$taskName = 'MagicJ-Barcelona-MatchReminder'
$source = Join-Path $PSScriptRoot 'barca-windows-reminder.ps1'
$launcherSource = Join-Path $PSScriptRoot 'run-barca-reminder-hidden.cs'
New-Item -ItemType Directory -Path $InstallDirectory -Force | Out-Null
$InstallDirectory = [IO.Path]::GetFullPath($InstallDirectory)
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$launcherHash = (Get-FileHash -LiteralPath $launcherSource -Algorithm SHA256).Hash.Substring(0, 12).ToLowerInvariant()
$launcher = Join-Path $InstallDirectory "run-barca-reminder-hidden-$launcherHash.exe"
if (-not (Test-Path -LiteralPath $launcher)) {
    $compiler = Join-Path $env:SystemRoot 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
    & $compiler /nologo /target:winexe "/out:$launcher" $launcherSource
    if ($LASTEXITCODE -ne 0) { throw 'Failed to build hidden reminder launcher' }
}
$action = New-ScheduledTaskAction -Execute $launcher -Argument ('"' + $source + '" "' + $InstallDirectory + '"')
$triggers = @(
    (New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1)),
    (New-ScheduledTaskTrigger -AtLogOn -User $identity)
)
$principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $triggers -Principal $principal -Settings $settings -Description 'Barcelona matches before 02:00 Beijing time: Windows popups 36 hours and 15 minutes before kickoff; browser independent.' -Force | Out-Null
Start-ScheduledTask -TaskName $taskName
Get-ScheduledTask -TaskName $taskName | Select-Object TaskName,State
