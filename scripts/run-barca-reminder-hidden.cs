using System;
using System.Diagnostics;
using System.IO;

internal static class HiddenReminderLauncher
{
    private static int Main(string[] args)
    {
        if (args.Length != 2) return 2;

        var powershell = Path.Combine(Environment.SystemDirectory, @"WindowsPowerShell\v1.0\powershell.exe");
        var start = new ProcessStartInfo(powershell);
        start.Arguments = "-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File \"" + args[0] + "\" -DataDirectory \"" + args[1] + "\"";
        start.UseShellExecute = false;
        start.CreateNoWindow = true;
        start.WindowStyle = ProcessWindowStyle.Hidden;
        using (var process = Process.Start(start))
        {
            process.WaitForExit();
            return process.ExitCode;
        }
    }
}
