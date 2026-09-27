Write-Host "Setting up Local AI Coding IDE..."
Set-Location $PSScriptRoot\..
npm install
Set-Location shared; npm install; npm run build; Set-Location ..
Set-Location backend; npm install; Set-Location ..
Set-Location frontend; npm install; Set-Location ..
Write-Host "Setup complete! Run 'npm run dev' to start."
