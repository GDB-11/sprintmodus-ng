import {
  findMentionQuery,
  insertMention,
  mentionName,
  parseMentionText,
  pickOf,
  plainMentionText,
  toMentionTokens,
} from './mention-text';

const ANA = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const token = (name: string, code: string) => `@[${name}](${code})`;

describe('parseMentionText', () => {
  it('splits a comment into text and mentions, in order', () => {
    expect(parseMentionText(`Hola ${token('Ana Diaz', ANA)}, mira esto ${token('Bob', BOB)}`)).toEqual([
      { kind: 'text', text: 'Hola ' },
      { kind: 'mention', name: 'Ana Diaz', userCode: ANA },
      { kind: 'text', text: ', mira esto ' },
      { kind: 'mention', name: 'Bob', userCode: BOB },
    ]);
  });

  it('keeps everything that is not exactly a token as plain text', () => {
    for (const text of ['@Ana', '@[Ana]', '@[Ana](nope)', `@[Ana](${ANA}`, `[Ana](${ANA})`, `@[](${ANA})`, `@[An\na](${ANA})`, 'a@b.c']) {
      expect(parseMentionText(text), text).toEqual([{ kind: 'text', text }]);
    }
  });

  it('is empty for an empty comment and never treats markup as anything but text', () => {
    expect(parseMentionText('')).toEqual([]);
    expect(parseMentionText(`<img src=x onerror=alert(1)> ${token('<b>Ana</b>', ANA)}`)).toEqual([
      { kind: 'text', text: '<img src=x onerror=alert(1)> ' },
      { kind: 'mention', name: '<b>Ana</b>', userCode: ANA },
    ]);
  });
});

describe('plainMentionText', () => {
  it('reduces every token to @Full Name', () => {
    expect(plainMentionText(`Hi ${token('Ana Diaz', ANA)} and ${token('Bob', BOB)}!`)).toBe('Hi @Ana Diaz and @Bob!');
    expect(plainMentionText('no mentions here')).toBe('no mentions here');
  });
});

describe('mentionName', () => {
  it('makes a name that fits inside a token', () => {
    expect(mentionName('Ana [the] Diaz')).toBe('Ana the Diaz');
    expect(mentionName('  Ana\n  Diaz ')).toBe('Ana Diaz');
    expect(mentionName('x'.repeat(300))).toHaveLength(255);
    expect(mentionName('[]')).toBe('Usuario');
  });
});

describe('findMentionQuery', () => {
  it('finds the name typed after an @ at the start or after whitespace', () => {
    expect(findMentionQuery('@an', 3)).toEqual({ start: 0, query: 'an' });
    expect(findMentionQuery('hola @', 6)).toEqual({ start: 5, query: '' });
    expect(findMentionQuery('hola\n@Ana Di', 12)).toEqual({ start: 5, query: 'Ana Di' });
  });

  it('only looks at what is before the caret', () => {
    expect(findMentionQuery('hola @Ana Diaz y más', 8)).toEqual({ start: 5, query: 'An' });
    expect(findMentionQuery('hola @Ana', 3)).toBeNull();
  });

  it('is not a mention in an e-mail, after a space, after a line break, in a finished token or when it is too long', () => {
    expect(findMentionQuery('mail a@b.c', 10)).toBeNull();
    expect(findMentionQuery('a @ b', 5)).toBeNull();
    expect(findMentionQuery('@Ana\nsigue', 10)).toBeNull();
    expect(findMentionQuery(`@[Ana](${ANA})`, 5 + ANA.length)).toBeNull();
    expect(findMentionQuery(`@${'x'.repeat(31)}`, 32)).toBeNull();
    expect(findMentionQuery(`@${'x'.repeat(30)}`, 31)).not.toBeNull();
    expect(findMentionQuery('sin arroba', 5)).toBeNull();
  });

  it('uses the last @ before the caret', () => {
    expect(findMentionQuery('@Ana Diaz y @Bo', 15)).toEqual({ start: 12, query: 'Bo' });
  });
});

describe('insertMention', () => {
  it('replaces the query with @Full Name and a space, and says where the caret goes', () => {
    const text = 'Hola @an, gracias';
    const query = findMentionQuery(text, 8)!;

    expect(insertMention(text, query, 8, { userCode: ANA, fullName: 'Ana Diaz' })).toEqual({
      text: 'Hola @Ana Diaz , gracias',
      caret: 15,
    });
  });

  it('never puts brackets or line breaks in the name', () => {
    const query = findMentionQuery('@a', 2)!;

    expect(insertMention('@a', query, 2, { userCode: ANA, fullName: 'Ana [Boss]\nDiaz' }).text).toBe('@Ana Boss Diaz ');
  });
});

describe('toMentionTokens', () => {
  const ana = pickOf({ userCode: ANA, fullName: 'Ana Diaz' });
  const bob = pickOf({ userCode: BOB, fullName: 'Bob' });

  it('turns each picked @Name into its token', () => {
    expect(toMentionTokens('Hola @Ana Diaz y @Bob, ¿ok?', [ana, bob])).toBe(`Hola ${token('Ana Diaz', ANA)} y ${token('Bob', BOB)}, ¿ok?`);
  });

  it('is the text itself when nobody was picked', () => {
    expect(toMentionTokens('Hola @Ana Diaz', [])).toBe('Hola @Ana Diaz');
  });

  it('leaves a name that was edited afterwards, or typed by hand and never picked, as plain text', () => {
    expect(toMentionTokens('Hola @Ana Dia', [ana])).toBe('Hola @Ana Dia');
    expect(toMentionTokens('Hola @Carla', [ana])).toBe('Hola @Carla');
  });

  it('needs the name to end there: @Bob is not @Bobby', () => {
    expect(toMentionTokens('@Bobby y @Bob', [bob])).toBe(`@Bobby y ${token('Bob', BOB)}`);
    expect(toMentionTokens('@Bob-el-otro', [bob])).toBe(`${token('Bob', BOB)}-el-otro`);
  });

  it('prefers the longer name when one is a prefix of another', () => {
    const anaLong = pickOf({ userCode: BOB, fullName: 'Ana Diaz Ruiz' });

    expect(toMentionTokens('@Ana Diaz Ruiz y @Ana Diaz', [ana, anaLong])).toBe(`${token('Ana Diaz Ruiz', BOB)} y ${token('Ana Diaz', ANA)}`);
  });

  it('maps two people with the same name by the order they were picked', () => {
    const other = pickOf({ userCode: BOB, fullName: 'Ana Diaz' });

    expect(toMentionTokens('@Ana Diaz y @Ana Diaz', [ana, other])).toBe(`${token('Ana Diaz', ANA)} y ${token('Ana Diaz', BOB)}`);
    expect(toMentionTokens('@Ana Diaz, @Ana Diaz y @Ana Diaz', [ana, other])).toBe(
      `${token('Ana Diaz', ANA)}, ${token('Ana Diaz', BOB)} y @Ana Diaz`,
    );
  });

  it('reuses the person when the same name was picked once and typed again', () => {
    expect(toMentionTokens('@Ana Diaz y otra vez @Ana Diaz', [ana])).toBe(`${token('Ana Diaz', ANA)} y otra vez ${token('Ana Diaz', ANA)}`);
  });

  it('copes with names that mean something to a regular expression', () => {
    const odd = pickOf({ userCode: ANA, fullName: 'Ana (Jr.) $1+' });

    expect(toMentionTokens('hola @Ana (Jr.) $1+ ok', [odd])).toBe(`hola ${token('Ana (Jr.) $1+', ANA)} ok`);
  });
});
