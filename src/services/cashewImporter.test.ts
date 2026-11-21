import { describe, it, expect } from 'vitest';
import { parseCSV, parseDynamicSplits } from './cashewImporter';
import type { Person } from '../types';

describe('Cashew Importer Engine (cashewImporter.ts)', () => {
  it('parses standard and escaped RFC 4180 CSV rows correctly', () => {
    const csvContent =
      'Date,Amount,Title,Category,Account\n' +
      '2024-11-20,150.00,Lunch,Food,HDFC\n' +
      '2024-11-20,1505.00,"DMart, Groceries & Rice",Groceries,"HDFC, Credit Card"\n' +
      '2024-11-20,500.00,"Dinner at ""Tandoor"" restaurant",Dining,Cash';

    const rows = parseCSV(csvContent);
    expect(rows.length).toBe(4);

    expect(rows[1]).toEqual(['2024-11-20', '150.00', 'Lunch', 'Food', 'HDFC']);
    expect(rows[2]).toEqual([
      '2024-11-20',
      '1505.00',
      'DMart, Groceries & Rice',
      'Groceries',
      'HDFC, Credit Card',
    ]);
    expect(rows[3]).toEqual([
      '2024-11-20',
      '500.00',
      'Dinner at "Tandoor" restaurant',
      'Dining',
      'Cash',
    ]);
  });

  it('dynamically parses equal splits pattern from notes (e.g. ₹X each)', () => {
    const personMap = new Map<string, Person>();
    personMap.set('sreerag', { id: 'p_sreerag', name: 'Sreerag', netBalance: 0, createdAt: '', updatedAt: '' });
    personMap.set('alan', { id: 'p_alan', name: 'Alan', netBalance: 0, createdAt: '', updatedAt: '' });

    const note = 'DMart split for 4 people: ₹350 each';
    const result = parseDynamicSplits(note, 1400, personMap);

    // 1400 bill, ₹350 personal share, ₹1050 split among friends
    expect(result.userPersonalShare).toBe(350);
    expect(result.splits.length).toBeGreaterThan(0);
  });

  it('dynamically parses named split amounts from notes', () => {
    const personMap = new Map<string, Person>();
    personMap.set('sreerag', { id: 'p_sreerag', name: 'Sreerag', netBalance: 0, createdAt: '', updatedAt: '' });
    personMap.set('alan', { id: 'p_alan', name: 'Alan', netBalance: 0, createdAt: '', updatedAt: '' });

    const note = 'Dinner: Sreerag ₹250, Alan ₹150';
    const result = parseDynamicSplits(note, 1000, personMap);

    // Total friend shares = 400, personal share = 1000 - 400 = 600
    expect(result.userPersonalShare).toBe(600);
    expect(result.splits.some((s) => s.personId === 'p_sreerag' && s.amount === 250)).toBe(true);
    expect(result.splits.some((s) => s.personId === 'p_alan' && s.amount === 150)).toBe(true);
  });

  it('returns default full personal share when notes contain no split metadata', () => {
    const personMap = new Map<string, Person>();
    const note = 'Personal metro card recharge';
    const result = parseDynamicSplits(note, 200, personMap);

    expect(result.userPersonalShare).toBe(200);
    expect(result.splits).toEqual([
      {
        personId: 'user',
        amount: 200,
        isSettled: true,
      },
    ]);
  });
});
