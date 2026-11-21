import { describe, it, expect } from 'vitest';
import { evaluateExpression, handleKeypadInput } from './calculator';

describe('Calculator Engine', () => {
  describe('evaluateExpression', () => {
    it('evaluates basic single numbers', () => {
      expect(evaluateExpression('0')).toBe(0);
      expect(evaluateExpression('450')).toBe(450);
      expect(evaluateExpression('1500.50')).toBe(1500.5);
    });

    it('evaluates basic addition and subtraction', () => {
      expect(evaluateExpression('50 + 30')).toBe(80);
      expect(evaluateExpression('100 - 25')).toBe(75);
      expect(evaluateExpression('250 + 150 - 50')).toBe(350);
    });

    it('evaluates multiplication and division with correct operator precedence', () => {
      expect(evaluateExpression('50 * 3')).toBe(150);
      expect(evaluateExpression('50 × 3')).toBe(150);
      expect(evaluateExpression('100 / 4')).toBe(25);
      expect(evaluateExpression('100 ÷ 4')).toBe(25);
      expect(evaluateExpression('10 + 20 * 3')).toBe(70); // 10 + 60 = 70, not 90
      expect(evaluateExpression('100 - 40 / 2')).toBe(80); // 100 - 20 = 80
    });

    it('gracefully handles live typing with trailing operators', () => {
      expect(evaluateExpression('50 + ')).toBe(50);
      expect(evaluateExpression('100 - ')).toBe(100);
      expect(evaluateExpression('25 * ')).toBe(25);
    });

    it('eliminates binary floating-point inaccuracies', () => {
      expect(evaluateExpression('0.1 + 0.2')).toBe(0.3);
      expect(evaluateExpression('12.45 + 34.55')).toBe(47);
    });

    it('safely handles zero division without throwing or Infinity', () => {
      expect(evaluateExpression('100 / 0')).toBe(0);
      expect(evaluateExpression('100 ÷ 0')).toBe(0);
    });

    it('handles empty or malformed strings gracefully', () => {
      expect(evaluateExpression('')).toBe(0);
      expect(evaluateExpression('   ')).toBe(0);
      expect(evaluateExpression('++--')).toBe(0);
    });
  });

  describe('handleKeypadInput', () => {
    it('appends digits correctly', () => {
      let expr = '0';
      expr = handleKeypadInput(expr, '5');
      expect(expr).toBe('5');
      expr = handleKeypadInput(expr, '0');
      expect(expr).toBe('50');
      expr = handleKeypadInput(expr, '00');
      expect(expr).toBe('5000');
    });

    it('handles decimal inputs without duplicate dots', () => {
      let expr = '5';
      expr = handleKeypadInput(expr, '.');
      expect(expr).toBe('5.');
      expr = handleKeypadInput(expr, '5');
      expect(expr).toBe('5.5');
      expr = handleKeypadInput(expr, '.'); // ignored
      expect(expr).toBe('5.5');
    });

    it('handles operators and replaces consecutive operators', () => {
      let expr = '50';
      expr = handleKeypadInput(expr, '+');
      expect(expr).toBe('50 + ');
      // Replace with minus
      expr = handleKeypadInput(expr, '-');
      expect(expr).toBe('50 - ');
      expr = handleKeypadInput(expr, '10');
      expect(expr).toBe('50 - 10');
    });

    it('handles backspace and clear', () => {
      let expr = '150';
      expr = handleKeypadInput(expr, '⌫');
      expect(expr).toBe('15');
      expr = handleKeypadInput(expr, 'C');
      expect(expr).toBe('0');
    });

    it('handles equals to collapse calculation', () => {
      const expr = '150 + 50 * 2';
      const result = handleKeypadInput(expr, '=');
      expect(result).toBe('250');
    });

    it('handles quick preset additions', () => {
      let expr = '50';
      expr = handleKeypadInput(expr, '+100');
      expect(expr).toBe('150');
      expr = handleKeypadInput(expr, '+500');
      expect(expr).toBe('650');
    });
  });
});
