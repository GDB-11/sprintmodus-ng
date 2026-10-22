import { ITEM_TYPE_LABELS, ItemType, Priority } from './work-item.models';

/** Every diagnostic code the backend's import can emit (`ImportDiagnostic.Code`); a spec checks each has wording. */
export const IMPORT_DIAGNOSTIC_CODES = [
  'FILE_TOO_LARGE',
  'NO_ITEMS',
  'TOO_MANY_ITEMS',
  'EPIC_NOT_ROOT',
  'ROOT_TYPE_MISMATCH',
  'EMPTY_TITLE',
  'INVALID_NUMBER',
  'TITLE_TOO_LONG',
  'TEXT_TOO_LONG',
  'UNKNOWN_PRIORITY',
  'UNKNOWN_SPRINT',
  'UNKNOWN_ASSIGNEE',
  'NON_STANDARD_HIERARCHY',
  'CRITERIA_IGNORED',
  'SECTION_IGNORED',
  'BUG_SKIPPED',
  'KEY_IGNORED',
] as const;
export type ImportDiagnosticCode = (typeof IMPORT_DIAGNOSTIC_CODES)[number];

export interface ImportDiagnostic {
  code: ImportDiagnosticCode;
  severity: 'ERROR' | 'WARNING';
  /** 1-based line of the file, 0 when it concerns the whole file. */
  line: number;
  params: Record<string, string>;
}

export interface ImportItem {
  type: ItemType;
  title: string;
  line: number;
  priority: Priority | null;
  points: number | null;
  hours: number | null;
  sprint: string | null;
  assignee: string | null;
  hasDescription: boolean;
  criteria: number;
  children: ImportItem[];
}

export interface ImportCreatedRoot {
  workItemCode: string;
  displayKey: string;
  type: ItemType;
  title: string;
}

/** The answer to an import, whether it was a dry run or the real thing. */
export interface ImportPreview {
  dryRun: boolean;
  imported: boolean;
  total: number;
  counts: Partial<Record<ItemType, number>>;
  items: ImportItem[];
  diagnostics: ImportDiagnostic[];
  created: ImportCreatedRoot[];
}

/** What an import file may contain, by the type of its top-level items. */
export const IMPORT_CHAIN: readonly ItemType[] = ['EPIC', 'FEATURE', 'PBI', 'TASK'];

export const IMPORT_PLURAL_LABELS: Record<ItemType, string> = {
  EPIC: 'Épicas',
  FEATURE: 'Características',
  PBI: 'Elementos del backlog',
  BUG: 'Errores',
  TASK: 'Tareas',
};

/** The type of the top-level items for an import opened from a screen whose item is `parentType` (null = the project). */
export function importRootFor(parentType: ItemType | null): ItemType | null {
  if (parentType === null) {
    return IMPORT_CHAIN[0];
  }
  const index = IMPORT_CHAIN.indexOf(parentType);
  return index >= 0 && index < IMPORT_CHAIN.length - 1 ? IMPORT_CHAIN[index + 1] : null;
}

/** The depths a file can have under `root`: 1 = only the roots, up to every type below them. */
export function importLevels(root: ItemType): { levels: number; label: string }[] {
  const start = IMPORT_CHAIN.indexOf(root);
  const available = IMPORT_CHAIN.slice(start);
  return available.map((_, index) => {
    const included = available.slice(0, index + 1).map((type) => IMPORT_PLURAL_LABELS[type]);
    const label =
      included.length === 1
        ? `Solo ${included[0]}`
        : `${included.slice(0, -1).join(', ')} y ${included[included.length - 1]}`;
    return { levels: index + 1, label };
  });
}

const typeName = (type: string | undefined): string =>
  (ITEM_TYPE_LABELS[type as ItemType] ?? type ?? '').toLowerCase();

/** The Spanish wording of every diagnostic. Each says what is wrong and what to do; the line is added by `diagnosticMessage`. */
export const IMPORT_DIAGNOSTIC_MESSAGES: Record<ImportDiagnosticCode, (params: Record<string, string>) => string> = {
  FILE_TOO_LARGE: (p) => `El archivo es demasiado grande (máximo ${Math.round(Number(p['max']) / 1024)} KB). Divídelo en varios.`,
  NO_ITEMS: () => 'No se encontró ningún elemento. Cada elemento empieza con un encabezado como «# Épica: Título».',
  TOO_MANY_ITEMS: (p) => `El archivo tiene demasiados elementos (máximo ${p['max']}). Divídelo en varios.`,
  EPIC_NOT_ROOT: (p) =>
    p['expected'] && p['expected'] !== 'EPIC'
      ? `una Épica no puede importarse aquí (esta pantalla crea ${typeName(p['expected'])}s); quítala del archivo.`
      : 'una Épica no puede estar dentro de otro elemento; muévela al nivel superior.',
  ROOT_TYPE_MISMATCH: (p) =>
    `aquí se esperaba ${typeName(p['expected'])} en el nivel superior y se encontró ${typeName(p['found'])}; corrige el encabezado o importa desde otra pantalla.`,
  EMPTY_TITLE: (p) => `falta el título de ${typeName(p['type']) ? 'la ' + typeName(p['type']) : 'un elemento'}; escríbelo después de los dos puntos.`,
  INVALID_NUMBER: (p) => `«${p['value'] ?? p['field'] ?? ''}» no es un número válido para «${p['key'] ?? p['field'] ?? ''}»; usa un número positivo.`,
  TITLE_TOO_LONG: (p) => `el título supera los ${p['max']} caracteres; acórtalo.`,
  TEXT_TOO_LONG: (p) => `la descripción supera los ${p['max']} caracteres; acórtala.`,
  UNKNOWN_PRIORITY: (p) => `la prioridad «${p['value']}» no existe; usa baja, media, alta o crítica.`,
  UNKNOWN_SPRINT: (p) => `no se encontró un sprint abierto llamado «${p['sprint']}» (o no tienes permiso para planificar); el elemento se creará sin sprint.`,
  UNKNOWN_ASSIGNEE: (p) => `no se encontró a «${p['assignee']}» (usa su correo o su nombre completo exacto); el elemento se creará sin asignar.`,
  NON_STANDARD_HIERARCHY: (p) =>
    `${typeName(p['type'])} dentro de ${typeName(p['parent'])} no es la jerarquía recomendada; se creará de todos modos.`,
  CRITERIA_IGNORED: (p) => `los criterios de aceptación no se usan en ${typeName(p['type'])}s; se ignoran.`,
  SECTION_IGNORED: (p) => `la sección «${p['section']}» no se importa; se ignora.`,
  BUG_SKIPPED: () => 'los errores no se importan; se omite. Para relacionar un error con una historia usa un enlace.',
  KEY_IGNORED: (p) => `«${p['key']}» no se importa (es de solo lectura o este tipo de elemento no lo admite); se ignora.`,
};

/** "Línea 14: …" or, for a problem with the whole file, just the sentence. */
export function diagnosticMessage(diagnostic: ImportDiagnostic): string {
  const text = IMPORT_DIAGNOSTIC_MESSAGES[diagnostic.code]?.(diagnostic.params) ?? diagnostic.code;
  if (diagnostic.line <= 0) {
    return text;
  }
  return `Línea ${diagnostic.line}: ${text}`;
}

/**
 * One sentence per problem, except that a key ignored on many lines (re-importing an export repeats `clave` and `estado`
 * on every item) becomes a single sentence naming the lines.
 */
export function diagnosticMessages(diagnostics: readonly ImportDiagnostic[]): string[] {
  const ignoredKeyLines = new Map<string, number[]>();
  const messages: string[] = [];
  for (const diagnostic of diagnostics) {
    const key = diagnostic.params['key'];
    if (diagnostic.code === 'KEY_IGNORED' && key !== undefined) {
      const lines = ignoredKeyLines.get(key);
      if (lines) {
        lines.push(diagnostic.line);
        continue;
      }
      ignoredKeyLines.set(key, [diagnostic.line]);
    }
    messages.push(diagnosticMessage(diagnostic));
  }
  for (const [key, lines] of ignoredKeyLines) {
    if (lines.length > 1) {
      const first = diagnosticMessage({ code: 'KEY_IGNORED', severity: 'WARNING', line: lines[0], params: { key } });
      const index = messages.indexOf(first);
      messages[index] = `«${key}» no se importa (es de solo lectura o este tipo de elemento no lo admite); se ignora en ${lines.length} líneas (${lines.join(', ')}).`;
    }
  }
  return messages;
}

/** "1 épica, 3 características, 8 elementos del backlog, 14 tareas". */
export function describeCounts(counts: Partial<Record<ItemType, number>>): string {
  const words: Record<ItemType, [string, string]> = {
    EPIC: ['épica', 'épicas'],
    FEATURE: ['característica', 'características'],
    PBI: ['elemento del backlog', 'elementos del backlog'],
    BUG: ['error', 'errores'],
    TASK: ['tarea', 'tareas'],
  };
  return IMPORT_CHAIN.filter((type) => (counts[type] ?? 0) > 0)
    .map((type) => `${counts[type]} ${words[type][counts[type] === 1 ? 0 : 1]}`)
    .join(', ');
}
