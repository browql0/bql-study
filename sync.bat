@echo off
chcp 65001 >nul

:: ============================================
::        GIT PRO SYNC - VERSION AVANCÉE
:: ============================================

echo.
echo ============================================
echo            GIT PRO SYNC MENU
echo ============================================
echo  1. Sync automatique (push ou pull)
echo  2. Push manuel (choisir message)
echo  3. Pull manuel
echo  4. Afficher le statut
echo  5. Quitter
echo ============================================
set /p choice=Choix : 

:: ================================
:: Détection automatique branche
:: ================================
for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do (
    set branch=%%b
)

if "%branch%"=="" (
    echo ❌ Impossible de détecter la branche.
    pause
    exit /b
)

:: =========================================================
:: Fonction PUSH (avec message demandé + date/heure optionnelle)
:: =========================================================
:pushFunction
echo.
set /p commitmsg=✏️  Message du commit : 

if "%commitmsg%"=="" (
    echo ❌ Message vide → Annulation.
    pause
    exit /b
)

set addDateTime=0
set /p addDateTime=Ajouter date/heure au commit ? (1=oui / 0=non) : 

if "%addDateTime%"=="1" (
    for /f "tokens=1-3 delims=/ " %%a in ("%date%") do (
        set today=%%c-%%b-%%a
    )
    for /f "tokens=1-2 delims=: " %%a in ("%time%") do (
        set now=%%a-%%b
    )
    set commitmsg=%commitmsg% (%today%_%now%)
)

echo.
echo 🚀 Push en cours sur la branche "%branch%"...
git add .
git commit -m "%commitmsg%"
git push origin %branch%

echo.
echo ✔ Push terminé !
pause
exit /b


:: ================================
:: Fonction PULL
:: ================================
:pullFunction
echo.
echo 📥 Pull sur la branche "%branch%"...
git pull origin %branch%
echo ✔ Pull terminé !
pause
exit /b


:: ================================
:: Fonction STATUS
:: ================================
:statusFunction
echo.
git status
pause
exit /b


:: ================================
:: Mode automatique
:: ================================
:autoSync
echo.
echo 🔍 Analyse des changements locaux...

set changes=

for /f "delims=" %%i in ('git status --porcelain') do (
    set changes=1
)

if defined changes (
    echo ✨ Changements détectés → PUSH automatique.
    goto pushFunction
) else (
    echo 🔄 Aucun changement local → PULL automatique.
    goto pullFunction
)

:: ================================
:: MENU
:: ================================
if "%choice%"=="1" goto autoSync
if "%choice%"=="2" goto pushFunction
if "%choice%"=="3" goto pullFunction
if "%choice%"=="4" goto statusFunction
if "%choice%"=="5" exit /b

echo ❌ Choix invalide.
pause
exit /b
