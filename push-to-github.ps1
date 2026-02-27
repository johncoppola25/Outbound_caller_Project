# Push Outbound_caller_Project to GitHub
# Run this AFTER installing Git from https://git-scm.com/download/win
# Usage: .\push-to-github.ps1
#    or: .\push-to-github.ps1 -Token "ghp_your_token"

param([string]$Token = $env:GITHUB_TOKEN)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# GitHub details
$repo = "Outbound_caller_Project"
$user = "johncoppola25"
if (-not $Token) {
    Write-Host "Usage: .\push-to-github.ps1 -Token 'ghp_your_token'" -ForegroundColor Yellow
    exit 1
}

$remoteUrl = "https://${user}:${Token}@github.com/${user}/${repo}.git"

# Initialize if needed
if (-not (Test-Path ".git")) {
    git init
}
git add .
$changes = git status --porcelain
if ($changes) {
    $msg = if ((git rev-list --count HEAD 2>$null) -eq "0") { "Initial commit" } else { "Update" }
    git commit -m $msg
}

# Add remote (remove if exists to update URL)
git remote remove origin 2>$null
git remote add origin $remoteUrl
git branch -M main
git push -u origin main

Write-Host "Push complete!" -ForegroundColor Green
