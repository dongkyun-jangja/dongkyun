# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language

모든 응답, 설명, 결과물은 반드시 한국어로 작성한다. 코드 내 식별자(변수명, 함수명 등)와 코드 주석은 예외로 영어를 유지한다.

## Project Overview

This is a single-file, standalone web calculator application. There are no build tools, package managers, or external dependencies.

## Running the App

Open `claude/calculator.html` directly in any web browser — no server or build step required.

## Architecture

The entire application lives in `claude/calculator.html` as a single self-contained file with inline CSS and JavaScript.

**State variables** (in the `<script>` block):
- `current`, `previous` — operands (strings; parsed to float on arithmetic)
- `operator` — pending operation (`'+'`, `'−'`, `'×'`, `'÷'`, or `null`)
- `waitNext` — boolean flag; when `true`, the next digit starts a fresh number rather than appending
- `exprStr` — history line shown in `.display-expression` above the main display

**Key logic areas:**
- Button clicks use event delegation on `.buttons`; keyboard events go through `document.addEventListener('keydown')`; both call the same handler functions (`handleDigit`, `handleOperator`, `calculate`, etc.)
- `calculate()` performs the arithmetic and sets `current = 'Error'` on division-by-zero
- `updateDisplay()` switches to `toExponential(4)` when the string representation exceeds 10 characters
- `handleOperator()` chains calculations: if an operator is already pending and `waitNext` is `false`, it calls `calculate()` first before storing the new operator

**Operators in the HTML use Unicode symbols** (`÷`, `×`, `−`) stored as `data-op` attributes and matched in the `switch` statement — do not substitute ASCII `-`, `*`, `/`.

**Layout:** CSS Grid 4-column button grid; macOS-style window chrome (colored dots header); dark theme (`#111111` background). The zero button spans 2 columns via `.span2`.

**Keyboard mappings:** digits and operators map directly; `/` is `preventDefault`'d to avoid browser find; `Enter`/`=` = calculate, `Escape` = clear, `Backspace` = delete last digit (resets to `'0'` when only one character remains).
