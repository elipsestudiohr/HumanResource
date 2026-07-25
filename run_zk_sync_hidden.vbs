Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' 1. Check relative path based on where this script is located
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
cmdPath = scriptDir & "\START_ZK_SYNC_AGENT.cmd"

If fso.FileExists(cmdPath) Then
    WshShell.Run Chr(34) & cmdPath & Chr(34), 0
ElseIf fso.FileExists("C:\Elipse\HRPortal\START_ZK_SYNC_AGENT.cmd") Then
    WshShell.Run Chr(34) & "C:\Elipse\HRPortal\START_ZK_SYNC_AGENT.cmd" & Chr(34), 0
ElseIf fso.FileExists("D:\Elipse\HRPortal\START_ZK_SYNC_AGENT.cmd") Then
    WshShell.Run Chr(34) & "D:\Elipse\HRPortal\START_ZK_SYNC_AGENT.cmd" & Chr(34), 0
End If

Set fso = Nothing
Set WshShell = Nothing

