import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { MentionText } from './mention-text';

const ANA = '11111111-1111-4111-8111-111111111111';

describe('MentionText', () => {
  let fixture: ComponentFixture<MentionText>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MentionText);
  });

  const show = (content: string) => {
    fixture.componentRef.setInput('content', content);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('shows a mention as a highlighted @Full Name, never the code', () => {
    const root = show(`Hola @[Ana Diaz](${ANA}), gracias`);

    expect(root.textContent).toBe('Hola @Ana Diaz, gracias');
    expect(root.textContent).not.toContain(ANA);
    const mention = root.querySelector('span.font-semibold')!;
    expect(mention.textContent).toBe('@Ana Diaz');
  });

  it('keeps the spaces and line breaks of the text as they were written', () => {
    const root = show(`  uno\n  @[Ana](${ANA})  dos `);

    expect(root.textContent).toBe('  uno\n  @Ana  dos ');
  });

  it('shows plain text as plain text, and markup as text', () => {
    const root = show('<img src=x onerror=alert(1)> @sin_token');

    expect(root.querySelector('img')).toBeNull();
    expect(root.textContent).toBe('<img src=x onerror=alert(1)> @sin_token');
  });

  it('has nothing for an empty comment and passes axe', async () => {
    expect(show('').textContent).toBe('');
    await expectNoAxeViolations(show(`Hola @[Ana Diaz](${ANA})`));
  });
});
