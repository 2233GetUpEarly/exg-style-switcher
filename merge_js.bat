@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM merge_js.bat - 按清单合并多个 JS 文件
REM
REM 用法:
REM   merge_js.bat <输出文件> <清单文件>
REM
REM 清单文件格式:
REM   - 每行一个路径
REM   - 支持 .js 文件、目录（递归收集 .js）、通配符 *.js
REM   - # 开头为注释，空行忽略
REM   - 相对路径相对于清单文件所在目录
REM   - 支持绝对路径
REM ============================================================

REM ---- 检查参数 ----
if "%~1"=="" (
    echo [错误] 未指定输出文件
    echo 用法: %~nx0 ^<输出文件^> ^<清单文件^>
    exit /b 1
)
if "%~2"=="" (
    echo [错误] 未指定清单文件
    echo 用法: %~nx0 ^<输出文件^> ^<清单文件^>
    exit /b 1
)

set "JS_OUTPUT_FILE=%~1"
set "MANIFEST=%~2"

if not exist "%MANIFEST%" (
    echo [错误] 找不到清单文件: %MANIFEST%
    exit /b 1
)

REM ---- 输出目录 ----
set "OUTPUT_DIR=%~dp1"
if "%OUTPUT_DIR:~-1%"=="\" set "OUTPUT_DIR=%OUTPUT_DIR:~0,-1%"
if not "%OUTPUT_DIR%"=="" (
    if not exist "%OUTPUT_DIR%" (
        mkdir "%OUTPUT_DIR%" 2>nul
        if errorlevel 1 (
            echo [错误] 无法创建目录: %OUTPUT_DIR%
            exit /b 1
        )
    )
)

REM ---- 清空/创建输出文件 ----
> "%JS_OUTPUT_FILE%" echo.

REM ---- 项目根目录（用于生成相对路径注释）----
if defined PROJECT_ROOT (
    set "ROOT=%PROJECT_ROOT%"
) else (
    set "ROOT=%CD%"
)

REM ---- 临时文件收集最终 JS 列表 ----
set "LIST_FILE=%TEMP%\merge_js_list_%RANDOM%%RANDOM%.txt"
if exist "%LIST_FILE%" del "%LIST_FILE%" >nul 2>&1

REM ---- 展开清单 ----
call :read_manifest "%MANIFEST%"

REM ---- 遍历列表合并 ----
set "COUNT=0"
for /f "usebackq delims=" %%F in ("%LIST_FILE%") do (
    set "JS_FILE=%%F"
    if not "!JS_FILE!"=="" (
        if not exist "!JS_FILE!" (
            echo [错误] 找不到 JS 文件: !JS_FILE!
            del "%LIST_FILE%" >nul 2>&1
            exit /b 1
        )

        set "JS_FILE_REL=!JS_FILE!"
        call :relpath "%ROOT%" "!JS_FILE!" JS_FILE_REL

        >> "%JS_OUTPUT_FILE%" echo /* ===== !JS_FILE_REL! ===== */
        >> "%JS_OUTPUT_FILE%" type "!JS_FILE!"
        >> "%JS_OUTPUT_FILE%" echo.

        set /a COUNT+=1
    )
)

del "%LIST_FILE%" >nul 2>&1

echo [信息] 已合并 %COUNT% 个 JS 文件 -^> %JS_OUTPUT_FILE%
endlocal
exit /b 0

REM ============================================================
REM 读取清单，展开为最终 JS 列表写入 %LIST_FILE%
REM ============================================================
:read_manifest
setlocal enabledelayedexpansion
set "MF=%~1"
set "MF_DIR=%~dp1"
if "%MF_DIR:~-1%"=="\" set "MF_DIR=%MF_DIR:~0,-1%"

for /f "usebackq eol=# tokens=* delims=" %%L in ("%MF%") do (
    set "LINE=%%L"
    REM 去掉首尾空格
    for /f "tokens=* delims= " %%A in ("!LINE!") do set "LINE=%%A"
    if not "!LINE!"=="" (
        set "P=!LINE!"
        REM 判断是否绝对路径（形如 C:\ 或 D:/）
        echo !P! | findstr /r "^[A-Za-z]:[\\/]" >nul
        if errorlevel 1 (
            REM 相对路径：相对清单目录
            if not "!P:~0,1!"=="\" (
                set "P=%MF_DIR%\!P!"
            )
        )

        REM 判断目录 / 通配符 / 普通文件
        if exist "!P!\" (
            for /r "!P!" %%J in (*.js) do >> "%LIST_FILE%" echo %%J
        ) else (
            echo !P! | findstr /r "\*" >nul
            if not errorlevel 1 (
                for %%J in ("!P!") do >> "%LIST_FILE%" echo %%~fJ
            ) else (
                >> "%LIST_FILE%" echo !P!
            )
        )
    )
)
endlocal
exit /b 0

REM ============================================================
REM 计算相对路径：:relpath <base> <target> <outVar>
REM 仅支持 target 位于 base 之下；否则返回原路径
REM ============================================================
:relpath
setlocal enabledelayedexpansion
set "BASE=%~1"
set "TARGET=%~2"
if "%BASE:~-1%"=="\" set "BASE=%BASE:~0,-1%"

set "RESULT=%TARGET%"
call set "RESULT=%%TARGET:%BASE%\=%%"

endlocal & set "%~3=%RESULT%"
exit /b 0