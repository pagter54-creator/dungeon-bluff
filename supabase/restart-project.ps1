param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectRef = 'lktjmuhbfnahdghidqfa',

    [Parameter(Mandatory = $false)]
    [ValidateSet('Restart', 'Health', 'UpgradeEligibility', 'RefreshServices', 'Pause', 'Restore')]
    [string]$Action = 'Restart'
)

$ErrorActionPreference = 'Stop'

Add-Type @'
using System;
using System.Runtime.InteropServices;

public static class WinCredentialReader
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CREDENTIAL
    {
        public UInt32 Flags;
        public UInt32 Type;
        public IntPtr TargetName;
        public IntPtr Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public UInt32 CredentialBlobSize;
        public IntPtr CredentialBlob;
        public UInt32 Persist;
        public UInt32 AttributeCount;
        public IntPtr Attributes;
        public IntPtr TargetAlias;
        public IntPtr UserName;
    }

    [DllImport("Advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credentialPtr);

    [DllImport("Advapi32.dll", SetLastError = true)]
    private static extern void CredFree(IntPtr credentialPtr);

    public static string ReadGenericSecret(string target)
    {
        IntPtr credentialPtr;
        if (!CredRead(target, 1, 0, out credentialPtr))
            throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());

        try
        {
            var credential = Marshal.PtrToStructure<CREDENTIAL>(credentialPtr);
            if (credential.CredentialBlob == IntPtr.Zero || credential.CredentialBlobSize == 0)
                throw new InvalidOperationException("The stored Supabase CLI credential is empty.");

            var secretBytes = new byte[credential.CredentialBlobSize];
            Marshal.Copy(credential.CredentialBlob, secretBytes, 0, secretBytes.Length);
            return System.Text.Encoding.UTF8.GetString(secretBytes).TrimEnd('\0');
        }
        finally
        {
            CredFree(credentialPtr);
        }
    }
}
'@

$accessToken = $null
try {
    $accessToken = [WinCredentialReader]::ReadGenericSecret('Supabase CLI:supabase')
    $headers = @{
        Authorization = "Bearer $accessToken"
        Accept        = 'application/json'
    }

    if ($Action -eq 'Health') {
        $health = Invoke-RestMethod `
            -Method Get `
            -Uri "https://api.supabase.com/v1/projects/$ProjectRef/health?services=auth&services=db&services=db_postgres_user&services=pooler&services=realtime&services=rest&services=storage&services=pg_bouncer" `
            -Headers $headers
        $health | ConvertTo-Json -Depth 8
    }
    elseif ($Action -eq 'UpgradeEligibility') {
        $eligibility = Invoke-RestMethod `
            -Method Get `
            -Uri "https://api.supabase.com/v1/projects/$ProjectRef/upgrade/eligibility" `
            -Headers $headers
        $eligibility | ConvertTo-Json -Depth 8
    }
    elseif ($Action -eq 'RefreshServices') {
        $authBody = @{
            mailer_autoconfirm = $true
            external_anonymous_users_enabled = $true
        } | ConvertTo-Json
        Invoke-RestMethod `
            -Method Patch `
            -Uri "https://api.supabase.com/v1/projects/$ProjectRef/config/auth" `
            -Headers $headers `
            -ContentType 'application/json' `
            -Body $authBody | Out-Null

        $restBody = @{
            db_schema = 'public,graphql_public'
            db_extra_search_path = 'public,extensions'
        } | ConvertTo-Json
        Invoke-RestMethod `
            -Method Patch `
            -Uri "https://api.supabase.com/v1/projects/$ProjectRef/postgrest" `
            -Headers $headers `
            -ContentType 'application/json' `
            -Body $restBody | Out-Null

        Write-Output 'Auth and PostgREST configuration refresh accepted.'
    }
    elseif ($Action -in @('Pause', 'Restore')) {
        Add-Type -AssemblyName System.Net.Http
        $client = [System.Net.Http.HttpClient]::new()
        try {
            $client.DefaultRequestHeaders.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $accessToken)
            $content = [System.Net.Http.StringContent]::new('{}', [System.Text.Encoding]::UTF8, 'application/json')
            $operation = $Action.ToLowerInvariant()
            $response = $client.PostAsync("https://api.supabase.com/v1/projects/$ProjectRef/$operation", $content).GetAwaiter().GetResult()
            if (-not $response.IsSuccessStatusCode) {
                $errorBody = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
                throw "Supabase $operation failed: HTTP $([int]$response.StatusCode) $errorBody"
            }
            Write-Output "Supabase $operation accepted: HTTP $([int]$response.StatusCode)"
        }
        finally {
            if ($null -ne $client) { $client.Dispose() }
        }
    }
    else {
        Add-Type -AssemblyName System.Net.Http
        $client = [System.Net.Http.HttpClient]::new()
        try {
            $client.DefaultRequestHeaders.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $accessToken)
            $content = [System.Net.Http.StringContent]::new('{}', [System.Text.Encoding]::UTF8, 'application/json')
            $response = $client.PostAsync("https://api.supabase.com/v1/projects/$ProjectRef/restart", $content).GetAwaiter().GetResult()
            if (-not $response.IsSuccessStatusCode) {
                $errorBody = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
                throw "Supabase restart failed: HTTP $([int]$response.StatusCode) $errorBody"
            }
            Write-Output "Supabase restart accepted: HTTP $([int]$response.StatusCode)"
        }
        finally {
            if ($null -ne $client) { $client.Dispose() }
        }
    }
}
finally {
    $accessToken = $null
    [GC]::Collect()
}
