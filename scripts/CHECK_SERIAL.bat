@echo off
set SERIAL=PF3A3Y09
echo Checking if %SERIAL% exists in Supabase...

curl "https://xqsatwytjzvlhdmckfsb.supabase.co/rest/v1/inventory_items?serial_number=eq.%SERIAL%&select=*" ^
  -H "apikey: sb_publishable_LbkFFWSkr91XApWL5NJBew_rAIkyI5J" ^
  -H "Authorization: Bearer sb_publishable_LbkFFWSkr91XApWL5NJBew_rAIkyI5J"

echo.
pause
