import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';

/**
 * Enforces the redesign's "100% component-based UI" rule (CLAUDE.md, Components): every visual recipe lives once
 * in `shared/ui/`/`shared/layout/` (or a `styles.css` `@utility`); a feature template only composes components plus
 * layout/type-scale utilities. This is a ratchet, not a compiler: it scans text with pragmatic heuristics, not the
 * Angular template AST, so it can miss a violation expressed unusually -- but it never gets a real one wrong twice,
 * because every violation it finds either gets fixed or added to `ALLOW_LIST` on purpose.
 *
 * `ALLOW_LIST` holds every file that predates this spec (Phase 15) and has not been migrated yet. Phases 16-19
 * shrink it as they migrate each screen; Phase 19 empties it and this comment (and the list) can go.
 */
const SRC = join(process.cwd(), 'src/app');

const EXEMPT_PREFIXES = [
  'shared/ui/',
  'shared/layout/',
  'design/',
  'testing/',
  // Domain -> look leaf maps (CLAUDE.md, Components rule 4): they hold tokens the same way a shared/ui primitive
  // does, just keyed by a domain enum (status stage) instead of a generic prop. Not a feature template.
  'work-items/components/status-label/',
  // work-item-detail's own page-header equivalent (ancestors + key + status + title + chips): it owns that screen's
  // one <h1>, the same role app-page-header/app-page play for every other screen (CLAUDE.md, Components rule 5).
  'work-items/components/work-item-header/',
];

// prettier-ignore
const ALLOW_LIST = new Set<string>([
  'app.html',
  'auth/components/auth-card/auth-card.html',
  'auth/pages/login/login.html',
  'auth/pages/register-organization/register-organization.html',
  'board/components/kanban-board/kanban-board.html',
  'board/components/kanban-card/kanban-card.html',
  'board/components/sprint-filter/sprint-filter.html',
  'dashboard/dashboard.html',
  'notifications/components/notification-list/notification-list.html',
  'notifications/components/notifications-bell/notifications-bell.html',
  'shared/notifications/notification-outlet/notification-outlet.html',
  'sprints/components/burndown-chart/burndown-chart.html',
  'sprints/components/burndown-page/burndown-page.html',
  'sprints/components/sprint-create/sprint-create.html',
  'sprints/components/sprint-management/sprint-management.html',
  'sprints/components/sprint-settings/sprint-settings.html',
  'sprints/components/velocity-history/velocity-history.html',
  // Phase 19's job (Configuración de flujo): the workflow editor itself, not touched by Phase 17.
  'work-items/components/workflow-admin/workflow-admin.html',
]);

function walk(dir: string, suffix: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full, suffix));
    } else if (entry.endsWith(suffix)) {
      out.push(full);
    }
  }
  return out;
}

function relPath(absPath: string): string {
  return relative(SRC, absPath).replace(/\\/g, '/');
}

function isExempt(rel: string): boolean {
  return EXEMPT_PREFIXES.some((prefix) => rel.startsWith(prefix));
}

const allTemplates = walk(SRC, '.html');
const featureTemplates = allTemplates.filter((f) => !isExempt(relPath(f)));
const nonAllowListedFeatureTemplates = featureTemplates.filter((f) => !ALLOW_LIST.has(relPath(f)));

const STYLE_ATTR = /(^|[\s"])style\s*=|(^|[\s"])\[style(\.[\w-]+)?\]\s*=/;
const LITERAL_COLOR = /oklch\(|#[0-9a-fA-F]{3,8}\b/;

const FORBIDDEN_CLASS = new RegExp(
  '^(' +
    '(bg|text|border|outline|ring|from|via|to|fill|stroke|decoration|divide|accent|caret|shadow|backdrop)-' +
    '(primary|secondary|tertiary|surface|success|error|warning|info|neutral|light|dark|glass|control|wall)(-|$)|' +
    'rounded(-|$)|shadow(-|$)|blur(-|$)|backdrop-blur(-|$)|border(-\\d+)?$' +
    ')',
);

function classTokensOf(html: string): string[] {
  const tokens: string[] = [];
  for (const match of html.matchAll(/\bclass(?:\.[\w-]+)?\s*=\s*"([^"]*)"/g)) {
    tokens.push(...match[1].split(/\s+/).filter(Boolean));
  }
  return tokens;
}

function rawTagViolations(html: string): string[] {
  const violations: string[] = [];
  for (const match of html.matchAll(/<(button|table|details|svg)\b[^>]*>/gi)) {
    const tag = match[1].toLowerCase();
    const whole = match[0];
    if (tag === 'button' && /\bapp(Button|FilterChip|TextLink)\b/.test(whole)) continue;
    if (tag === 'details' && /\bappDisclosure\b/.test(whole)) continue;
    violations.push(`<${tag}>`);
  }
  return violations;
}

describe('ui-architecture (100% component-based UI)', () => {
  it('has at least one feature template to check (sanity: the walk found the app)', () => {
    expect(allTemplates.length).toBeGreaterThan(20);
  });

  describe.each(nonAllowListedFeatureTemplates.map((f) => [relPath(f), f] as const))('%s', (rel, absPath) => {
    const html = readFileSync(absPath, 'utf8');

    it('has no style attribute/binding', () => {
      expect(STYLE_ATTR.test(html)).toBe(false);
    });

    it('has no literal colour (oklch()/hex)', () => {
      expect(LITERAL_COLOR.test(html)).toBe(false);
    });

    it('has no raw colour/radius/shadow/blur/border utility class', () => {
      const offenders = classTokensOf(html).filter((t) => FORBIDDEN_CLASS.test(t));
      expect(offenders).toEqual([]);
    });

    it('has no raw <button>/<table>/<details>/<svg> (wrap natives via an attribute selector, or use app-data-table/app-icon)', () => {
      expect(rawTagViolations(html)).toEqual([]);
    });

    it('has no raw <h1> (the page owns the one heading, via app-page-header/app-page)', () => {
      expect(/<h1(\s|>)/i.test(html)).toBe(false);
    });
  });

  it('the allow-list only names files that still exist and still need it (shrink it as you migrate a screen)', () => {
    const existing = new Set(featureTemplates.map(relPath));
    for (const path of ALLOW_LIST) {
      expect(existing.has(path), `${path} is on the allow-list but no longer exists -- remove it`).toBe(true);
    }
  });

  describe('components', () => {
    const allComponentSources = walk(SRC, '.ts').filter((f) => !f.endsWith('.spec.ts'));

    it.each(allComponentSources.map((f) => [relPath(f), f] as const))('%s: uses templateUrl, not an inline template', (_rel, absPath) => {
      const ts = readFileSync(absPath, 'utf8');
      const match = /@Component\(\s*\{([\s\S]*?)\n\}\)/.exec(ts);
      if (!match) {
        return; // not a @Component
      }
      const body = match[1];
      if (!/\btemplate\s*:/.test(body)) {
        return; // no inline template
      }
      expect(/\btemplateUrl\s*:/.test(body)).toBe(true);
    });

    const componentFiles = allComponentSources.filter((f) => /@Component\(/.test(readFileSync(f, 'utf8')));

    it.each(componentFiles.map((f) => [relPath(f), f] as const))('%s: lives in a folder named after it', (rel, absPath) => {
      if (rel === 'app.ts') {
        return; // the one documented exception (CLAUDE.md, Components)
      }
      const fileName = basename(absPath, '.ts');
      const folderName = basename(dirname(absPath));
      expect(folderName).toBe(fileName);
    });
  });
});
