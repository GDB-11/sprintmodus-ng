import { UserRef } from '../../work-items/models/work-item.models';

/**
 * A mention is stored in a comment as `@[Full Name](userCode)`: the user's code, never a name or an e-mail, so a rename or two
 * people with the same name can never mention the wrong one. Same grammar as the backend's `MentionParser`; what does not
 * match it exactly is plain text. The people who write and read a comment never see the code: the textarea holds `@Full Name`
 * and the token is made on submit (`toMentionTokens`), and a comment is shown with `parseMentionText`.
 */
const TOKEN = /@\[([^[\]\r\n]{1,255})\]\(([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\)/g;

/** The longest text after an `@` that still counts as somebody typing a name. */
const MAX_QUERY_LENGTH = 30;
const MAX_NAME_LENGTH = 255;

export type MentionSegment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'mention'; readonly name: string; readonly userCode: string };

/** A comment split into plain text and mentions, in order. Never markup: the caller renders text as text. */
export function parseMentionText(content: string): MentionSegment[] {
  const segments: MentionSegment[] = [];
  let from = 0;
  for (const match of content.matchAll(TOKEN)) {
    if (match.index > from) {
      segments.push({ kind: 'text', text: content.slice(from, match.index) });
    }
    segments.push({ kind: 'mention', name: match[1], userCode: match[2] });
    from = match.index + match[0].length;
  }
  if (from < content.length) {
    segments.push({ kind: 'text', text: content.slice(from) });
  }
  return segments;
}

/** The text as a person reads it: every token reduced to `@Full Name`. */
export function plainMentionText(content: string): string {
  return content.replace(TOKEN, (_token, name: string) => `@${name}`);
}

/** A name that can sit inside a token: no brackets or line breaks, single spaces, at most 255 characters. */
export function mentionName(fullName: string): string {
  return fullName.replace(/[[\]\r\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH) || 'Usuario';
}

/** Somebody is typing a name right after an `@` at `start` (the position of the `@`). */
export interface MentionQuery {
  readonly start: number;
  readonly query: string;
}

/**
 * The mention being typed at the caret, if any: an `@` at the start of the text or after whitespace (so `a@b.c` is an
 * e-mail, not a mention), followed by up to 30 characters with no line break, no bracket (a finished token starts with `@[`)
 * and not starting with a space. Names have spaces, so a query may contain them.
 */
export function findMentionQuery(text: string, caret: number): MentionQuery | null {
  const before = text.slice(0, caret);
  const start = before.lastIndexOf('@');
  if (start < 0 || (start > 0 && !/\s/.test(before[start - 1]))) {
    return null;
  }
  const query = before.slice(start + 1);
  if (query.length > MAX_QUERY_LENGTH || /^\s|[\r\n[\]]/.test(query)) {
    return null;
  }
  return { start, query };
}

/** The text with the query at `caret` replaced by `@Full Name` and a space, and where the caret goes. */
export function insertMention(text: string, query: MentionQuery, caret: number, user: UserRef): { text: string; caret: number } {
  const inserted = `@${mentionName(user.fullName)} `;
  return { text: text.slice(0, query.start) + inserted + text.slice(caret), caret: query.start + inserted.length };
}

/** Whom a person picked from the list, by the name that went into the text. */
export function pickOf(user: UserRef): UserRef {
  return { userCode: user.userCode, fullName: mentionName(user.fullName) };
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The text to send: each `@Full Name` that a person picked from the list becomes its token. The n-th `@Name` in the text is
 * the n-th pick of that name (two people may share a name); a name typed by hand and never picked, or edited afterwards, stays
 * plain text, and so mentions nobody. `@Ana` in `@Anabel` is not a match: the name has to end there.
 */
export function toMentionTokens(text: string, picks: readonly UserRef[]): string {
  if (picks.length === 0) {
    return text;
  }
  const codesByName = new Map<string, string[]>();
  for (const pick of picks) {
    codesByName.set(pick.fullName, [...(codesByName.get(pick.fullName) ?? []), pick.userCode]);
  }
  const names = [...codesByName.keys()].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`@(${names.map(escapeRegExp).join('|')})(?![\\p{L}\\p{N}_])`, 'gu');
  const seen = new Map<string, number>();
  return text.replace(pattern, (whole, name: string) => {
    const codes = codesByName.get(name) ?? [];
    const index = seen.get(name) ?? 0;
    seen.set(name, index + 1);
    // beyond the picks, the same name typed again is unambiguous only when every pick of it was the same person
    const code = codes[index] ?? (new Set(codes).size === 1 ? codes[0] : undefined);
    return code ? `@[${name}](${code})` : whole;
  });
}
