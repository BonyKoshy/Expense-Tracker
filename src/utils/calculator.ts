/**
 * FinTrack Calculator Engine
 *
 * Provides safe arithmetic expression evaluation (+, -, *, /),
 * input processing for tactile keypads, and Indian currency-aware formatting.
 * Strictly avoids eval() or Function constructors for sandboxed security.
 */

/**
 * Safely evaluates a basic math expression string (+, -, *, /) with standard operator precedence.
 * Strips trailing operators to support live real-time evaluation while typing.
 */
export function evaluateExpression(rawExpr: string): number {
  if (!rawExpr || !rawExpr.trim()) return 0;

  // Normalize operators: replace × with *, ÷ with /
  let expr = rawExpr.replace(/×/g, "*").replace(/÷/g, "/").trim();

  // Strip trailing operators, open parenthesis, or spaces (e.g. "50 + " -> "50")
  expr = expr.replace(/[+\-*/\s]+$/, "");
  if (!expr) return 0;

  try {
    // Tokenize numbers and operators
    const tokens: string[] = [];
    let currentNum = "";

    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];
      if ((char >= "0" && char <= "9") || char === ".") {
        currentNum += char;
      } else if (char === "+" || char === "-" || char === "*" || char === "/") {
        // Handle negative numbers: if '-' occurs at start or directly after an operator
        if (
          char === "-" &&
          (tokens.length === 0 ||
            ["+", "-", "*", "/"].includes(tokens[tokens.length - 1])) &&
          !currentNum
        ) {
          currentNum = "-";
          continue;
        }
        if (currentNum) {
          tokens.push(currentNum);
          currentNum = "";
        }
        tokens.push(char);
      }
    }
    if (currentNum) {
      tokens.push(currentNum);
    }

    if (tokens.length === 0) return 0;

    // First pass: handle * and / (higher precedence)
    const intermediateTokens: (number | string)[] = [];
    let idx = 0;
    while (idx < tokens.length) {
      const token = tokens[idx];
      if (token === "*" || token === "/") {
        const prev = Number(intermediateTokens.pop());
        const next = Number(tokens[idx + 1]);
        if (isNaN(prev) || isNaN(next)) return 0;
        const res = token === "*" ? prev * next : next === 0 ? 0 : prev / next;
        intermediateTokens.push(res);
        idx += 2;
      } else if (token === "+" || token === "-") {
        intermediateTokens.push(token);
        idx++;
      } else {
        intermediateTokens.push(Number(token));
        idx++;
      }
    }

    // Second pass: handle + and -
    if (intermediateTokens.length === 0) return 0;
    let result = Number(intermediateTokens[0]);
    if (isNaN(result)) return 0;

    idx = 1;
    while (idx < intermediateTokens.length) {
      const op = intermediateTokens[idx];
      const next = Number(intermediateTokens[idx + 1]);
      if (isNaN(next)) break;
      if (op === "+") {
        result += next;
      } else if (op === "-") {
        result -= next;
      }
      idx += 2;
    }

    // Avoid floating point inaccuracies (e.g. 0.1 + 0.2 = 0.30000000000000004)
    return Math.round(result * 100) / 100;
  } catch {
    return 0;
  }
}

/**
 * Handles keypad inputs for the transaction calculator.
 */
export function handleKeypadInput(currentExpr: string, key: string): string {
  // Clear
  if (key === "C" || key === "AC") {
    return "0";
  }

  // Backspace
  if (key === "⌫" || key === "Backspace") {
    if (!currentExpr || currentExpr.length <= 1 || currentExpr === "0") {
      return "0";
    }
    const trimmed = currentExpr.trimEnd();
    // If ending with operator like " + ", trim the operator and spaces
    if (
      trimmed.endsWith("+") ||
      trimmed.endsWith("-") ||
      trimmed.endsWith("×") ||
      trimmed.endsWith("÷") ||
      trimmed.endsWith("*") ||
      trimmed.endsWith("/")
    ) {
      const withoutOp = trimmed.slice(0, -1).trimEnd();
      return withoutOp || "0";
    }
    return currentExpr.slice(0, -1) || "0";
  }

  // Equals
  if (key === "=") {
    const val = evaluateExpression(currentExpr);
    return val <= 0 ? "0" : val.toString();
  }

  // Decimal
  if (key === ".") {
    const parts = currentExpr.split(/[\s+\-×÷*/]+/);
    const lastPart = parts[parts.length - 1] || "";
    if (lastPart.includes(".")) {
      return currentExpr;
    }
    if (currentExpr === "0" || !currentExpr) {
      return "0.";
    }
    const trimmed = currentExpr.trimEnd();
    if (["+", "-", "×", "÷", "*", "/"].some((op) => trimmed.endsWith(op))) {
      return currentExpr + " 0.";
    }
    return currentExpr + ".";
  }

  // Preset additions (e.g. "+100", "+500")
  if (key.length > 1 && key.startsWith("+") && !isNaN(Number(key.slice(1)))) {
    const addVal = Number(key.slice(1));
    const currentVal = evaluateExpression(currentExpr);
    const newVal = Math.round((currentVal + addVal) * 100) / 100;
    return newVal.toString();
  }

  // Operators: +, -, ×, ÷
  const isOperator = ["+", "-", "×", "÷", "*", "/"].includes(key);
  if (isOperator) {
    const displayOp = key === "*" ? "×" : key === "/" ? "÷" : key;
    if (!currentExpr || currentExpr === "0") {
      if (key === "-") return "-";
      return `0 ${displayOp} `;
    }
    const trimmed = currentExpr.trimEnd();
    if (["+", "-", "×", "÷", "*", "/"].some((op) => trimmed.endsWith(op))) {
      const base = trimmed.slice(0, -1).trimEnd();
      return `${base} ${displayOp} `;
    }
    return `${trimmed} ${displayOp} `;
  }

  // Double zero
  if (key === "00") {
    if (currentExpr === "0" || !currentExpr) return "0";
    // If ending with operator, don't append 00 directly
    const trimmed = currentExpr.trimEnd();
    if (["+", "-", "×", "÷", "*", "/"].some((op) => trimmed.endsWith(op))) {
      return currentExpr + " 0";
    }
    return currentExpr + "00";
  }

  // Digits (single or multi-digit numbers)
  if (/^[0-9]+$/.test(key)) {
    if (currentExpr === "0") {
      return key;
    }
    return currentExpr + key;
  }

  return currentExpr;
}
