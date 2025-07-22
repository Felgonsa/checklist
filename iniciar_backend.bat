@echo off
cd /d C:\sistemas\checklist\backend

:: Espera o sistema inicializar antes de rodar npm install (opcional)
timeout /t 5 /nobreak >nul

:: Garante que o npm está disponível (opcional: você pode remover se não precisar)
call npm install

:: Executa node diretamente, sem abrir nova janela
:: O 'start' pode atrapalhar o diretório atual
node app.js

:: Se quiser manter a janela aberta para debug:
:: pause
