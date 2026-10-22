import {
  IMPORT_DIAGNOSTIC_CODES,
  IMPORT_DIAGNOSTIC_MESSAGES,
  describeCounts,
  diagnosticMessage,
  diagnosticMessages,
  importLevels,
  importRootFor,
} from './markdown-interchange';

describe('markdown-interchange', () => {
  it('has Spanish wording for every diagnostic code the backend can emit', () => {
    expect(Object.keys(IMPORT_DIAGNOSTIC_MESSAGES).sort()).toEqual([...IMPORT_DIAGNOSTIC_CODES].sort());
    for (const code of IMPORT_DIAGNOSTIC_CODES) {
      const text = IMPORT_DIAGNOSTIC_MESSAGES[code]({
        max: '200',
        type: 'TASK',
        parent: 'FEATURE',
        expected: 'EPIC',
        found: 'PBI',
        key: 'prioridad',
        value: 'x',
        section: 'Notas',
        sprint: 'Sprint 3',
        assignee: 'Ana',
      });
      expect(text.length, code).toBeGreaterThan(10);
      expect(text, code).not.toContain('undefined');
    }
  });

  it('prefixes the line when the problem is on one', () => {
    expect(diagnosticMessage({ code: 'EPIC_NOT_ROOT', severity: 'ERROR', line: 14, params: { expected: 'EPIC', found: 'EPIC' } })).toBe(
      'Línea 14: una Épica no puede estar dentro de otro elemento; muévela al nivel superior.',
    );
    expect(diagnosticMessage({ code: 'NO_ITEMS', severity: 'ERROR', line: 0, params: {} })).not.toContain('Línea');
  });

  it('folds a key ignored on many lines into one sentence', () => {
    const ignored = (line: number, key: string) => ({ code: 'KEY_IGNORED' as const, severity: 'WARNING' as const, line, params: { key } });
    const messages = diagnosticMessages([ignored(2, 'clave'), ignored(3, 'estado'), ignored(7, 'clave'), ignored(14, 'clave')]);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain('se ignora en 3 líneas (2, 7, 14)');
    expect(messages[1]).toBe('Línea 3: «estado» no se importa (es de solo lectura o este tipo de elemento no lo admite); se ignora.');
  });

  it('decides the type of the top-level items from the screen', () => {
    expect(importRootFor(null)).toBe('EPIC');
    expect(importRootFor('EPIC')).toBe('FEATURE');
    expect(importRootFor('FEATURE')).toBe('PBI');
    expect(importRootFor('PBI')).toBe('TASK');
    expect(importRootFor('TASK')).toBeNull();
    expect(importRootFor('BUG')).toBeNull();
  });

  it('offers only the depths that exist under a root', () => {
    expect(importLevels('EPIC').map((level) => level.label)).toEqual([
      'Solo Épicas',
      'Épicas y Características',
      'Épicas, Características y Elementos del backlog',
      'Épicas, Características, Elementos del backlog y Tareas',
    ]);
    expect(importLevels('FEATURE')).toHaveLength(3);
    expect(importLevels('PBI')).toHaveLength(2);
    expect(importLevels('TASK').map((level) => level.label)).toEqual(['Solo Tareas']);
  });

  it('counts in words, singular and plural', () => {
    expect(describeCounts({ EPIC: 1, FEATURE: 3, PBI: 8, TASK: 14 })).toBe('1 épica, 3 características, 8 elementos del backlog, 14 tareas');
    expect(describeCounts({ TASK: 1 })).toBe('1 tarea');
  });
});
