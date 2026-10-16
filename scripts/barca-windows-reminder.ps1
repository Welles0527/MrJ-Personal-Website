[CmdletBinding()]
param(
    [string]$DataDirectory = '',
    [switch]$TestPopup,
    [switch]$SelfTest
)
$ErrorActionPreference = 'Stop'
if (-not $DataDirectory) { $DataDirectory = Join-Path $PSScriptRoot '../tmp/barca-reminders' }
function Get-DueReminder($Match, [DateTimeOffset]$Now) {
    if ($null -ne $Match.score -or $Match.dateTentative -or $Match.time -notmatch '^(?:1[89]|2[0-3]|0[01]):[0-5][0-9]$') { return $null }
    $kickoff = [DateTimeOffset]::ParseExact(($Match.start + 'T' + $Match.time + ':00+08:00'), 'yyyy-MM-ddTHH:mm:sszzz', [Globalization.CultureInfo]::InvariantCulture)
    $minutes = ($kickoff - $Now).TotalMinutes
    if ($minutes -le 0 -or $minutes -gt 2160) { return $null }
    $stage = if ($minutes -le 15) { '15m' } else { '36h' }
    return @{ Key = "$($Match.id)|$($kickoff.ToUnixTimeSeconds())|$stage"; Stage = $stage; Kickoff = $kickoff; Minutes = $minutes }
}
if ($SelfTest) {
    $m = [pscustomobject]@{ id='test'; start='2026-10-20'; time='01:30'; score=$null; dateTentative=$false }
    $start = [DateTimeOffset]::Parse('2026-10-20T01:30:00+08:00')
    foreach ($case in @(@(2161,$null),@(2160,'36h'),@(16,'36h'),@(15,'15m'),@(1,'15m'),@(0,$null))) {
        $due = Get-DueReminder $m ($start.AddMinutes(-$case[0]))
        if ($due.Stage -ne $case[1]) { throw "Boundary check failed: $($case[0])" }
    }
    $m.time='02:00'; if ($null -ne (Get-DueReminder $m $start.AddHours(-1))) { throw '02:00 must be excluded' }
    $m.time='00:00'; if ($null -eq (Get-DueReminder $m ([DateTimeOffset]::Parse('2026-10-19T23:50:00+08:00')))) { throw 'Midnight must be included' }
    foreach ($hour in @('18:00','21:00','22:00','23:00','01:59')) { $m.time=$hour; $k=[DateTimeOffset]::Parse($m.start+'T'+$hour+':00+08:00'); if ($null -eq (Get-DueReminder $m ($k.AddHours(-1)))) { throw ('Eligible kickoff excluded: '+$hour) } }
    foreach ($hour in @('02:00','03:00','17:59')) { $m.time=$hour; $k=[DateTimeOffset]::Parse($m.start+'T'+$hour+':00+08:00'); if ($null -ne (Get-DueReminder $m ($k.AddHours(-1)))) { throw ('Excluded kickoff included: '+$hour) } }
    $m.score=@(1,4); if ($null -ne (Get-DueReminder $m $start.AddHours(-1))) { throw 'Finished match must be excluded' }
    Write-Output 'PASS: Beijing time, 36h/15m boundaries, kickoff cutoff and finished-match exclusion'
    exit 0
}
$popup = 'C:\Users\huawei\.codex\scripts\codex-alert.ps1'
if (-not (Test-Path -LiteralPath $popup)) { throw 'Shared popup script is missing' }
if ($TestPopup) {
    & powershell.exe -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -File $popup -Mode Reminder -TaskName '巴萨比赛提醒测试' -Title '测试：巴萨比赛提醒' -Message '这是右下角缓慢升起的 Windows 提醒测试，不是真实比赛通知。点击确认后才关闭。此窗口由本机任务启动，浏览器关闭也可以显示。正式提醒只针对北京时间18:00至次日01:59开球的巴萨比赛，在赛前36小时和15分钟各提醒一次。' -OptionsText '测试弹窗已正常显示'
    exit $LASTEXITCODE
}
New-Item -ItemType Directory -Path $DataDirectory -Force | Out-Null
$lock = [Threading.Mutex]::new($false, 'Local\MagicJ.Barcelona.MatchReminder')
$held = $false
try {
    try { $held = $lock.WaitOne(0) } catch [Threading.AbandonedMutexException] { $held = $true }
    if (-not $held) { exit 0 }
    $cachePath = Join-Path $DataDirectory 'schedule.json'
    $statePath = Join-Path $DataDirectory 'reminded.json'
    $snapshot = $null
    if (Test-Path -LiteralPath $cachePath) { try { $snapshot = Get-Content -Raw -LiteralPath $cachePath | ConvertFrom-Json } catch {} }
    if ($null -eq $snapshot -or (Get-Item -LiteralPath $cachePath).LastWriteTimeUtc -lt [DateTime]::UtcNow.AddMinutes(-5)) {
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            $fresh = Invoke-RestMethod -Uri 'https://magicj-web-d5g9yvowj6862f7a2-1439083941.ap-shanghai.app.tcloudbase.com/api/football-snapshot' -TimeoutSec 20
            if ($fresh.version -ne 1 -or $fresh.season -ne '2026-2027' -or @($fresh.matches).Count -lt 10) { throw 'Invalid cloud snapshot' }
            $snapshot = $fresh
            $fresh | ConvertTo-Json -Depth 20 -Compress | Set-Content -LiteralPath $cachePath -Encoding UTF8
        } catch { if ($null -eq $snapshot) { throw } }
    }
    if ([DateTimeOffset]::Parse($snapshot.updatedAt) -lt [DateTimeOffset]::UtcNow.AddHours(-24)) { throw 'Cloud schedule is older than 24 hours; skipping potentially outdated reminders' }
    $sent = @{}
    if (Test-Path -LiteralPath $statePath) {
        $saved = Get-Content -Raw -LiteralPath $statePath | ConvertFrom-Json
        foreach ($item in $saved.PSObject.Properties) { $sent[$item.Name] = $item.Value }
    }
    foreach ($match in $snapshot.matches) {
        if ($match.calendar -ne 'sports' -or $match.category -ne '足球') { continue }
        $due = Get-DueReminder $match ([DateTimeOffset]::UtcNow)
        if ($null -eq $due -or $sent.ContainsKey($due.Key)) { continue }
        $label = if ($due.Stage -eq '15m') { '赛前15分钟提醒' } else { '赛前36小时提醒' }
        $message = "$($match.name)`n北京时间：$($due.Kickoff.ToString('MM月dd日 HH:mm'))`n$(if ($due.Stage -eq '15m') { '赛前15分钟提醒' } else { '赛前36小时提醒' })。"
        $quote = { param($s) "'" + $s.Replace("'", "''") + "'" }
        $command = "& $(& $quote $popup) -Mode Reminder -TaskName '巴萨比赛提醒' -Title $(& $quote $label) -Message $(& $quote $message) -OptionsText '确认'"
        $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))
        Start-Process -FilePath powershell.exe -WindowStyle Hidden -ArgumentList @('-NoLogo','-NoProfile','-STA','-ExecutionPolicy','Bypass','-EncodedCommand',$encoded) -ErrorAction Stop | Out-Null
        $sent[$due.Key] = [DateTimeOffset]::UtcNow.ToString('o')
        if ($due.Stage -eq '15m') { $sent[($due.Key -replace '\|15m$', '|36h')] = $sent[$due.Key] }
        $sent | ConvertTo-Json -Compress | Set-Content -LiteralPath $statePath -Encoding UTF8
    }
    @{ checkedAt=[DateTimeOffset]::UtcNow.ToString('o'); cloudUpdatedAt=$snapshot.updatedAt; matches=@($snapshot.matches).Count; ok=$true } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $DataDirectory 'status.json') -Encoding UTF8
} catch {
    @{ checkedAt=[DateTimeOffset]::UtcNow.ToString('o'); ok=$false; error=$_.Exception.Message } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $DataDirectory 'status.json') -Encoding UTF8
    exit 1
} finally {
    if ($held) { $lock.ReleaseMutex() }
    $lock.Dispose()
}
