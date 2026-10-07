/**
 * Helpers for specs that drive `app-select-menu` / `app-searchable-select`: the trigger is a button named
 * "<label>: <current value>", and its list is a listbox in the CDK overlay container (outside the fixture's element).
 */
const clean = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

/** The trigger button of the select whose label starts with `label` (an exact label, or its start). */
export function selectTrigger(root: ParentNode, label: string): HTMLButtonElement {
  const trigger = root.querySelector<HTMLButtonElement>(`button[aria-label^="${label}:"], button[aria-label="${label}"]`);
  if (!trigger) {
    throw new Error(`No select labelled "${label}"`);
  }
  return trigger;
}

/** What the trigger shows (the chosen option's label, or the placeholder). */
export const selectedText = (trigger: HTMLElement) => optionText(trigger);

export const openOptions = () => [...document.querySelectorAll<HTMLElement>('[role="option"]')];

/** The options of the open list, as text (label and hint). */
export const openOptionTexts = () => openOptions().map(optionText);

/** An option's label and hint, separated by a space (they are sibling spans, so `textContent` alone would glue them). */
function optionText(option: HTMLElement): string {
  const parts = [...option.querySelectorAll('span')].map((span) => clean(span.textContent)).filter(Boolean);
  return parts.length ? parts.join(' ') : clean(option.textContent);
}


/** Opens the list of `trigger` (a click) and returns its options' texts. `detect` runs change detection after the click. */
export function openSelect(trigger: HTMLElement, detect: () => void): string[] {
  trigger.click();
  detect();
  return openOptionTexts();
}

/** Opens `trigger`'s list and clicks the option whose text starts with `optionText`. */
export function chooseOption(trigger: HTMLElement, text: string, detect: () => void): void {
  trigger.click();
  detect();
  const option = openOptions().find((candidate) => optionText(candidate).startsWith(text));
  if (!option) {
    throw new Error(`No option "${text}" in [${openOptionTexts().join(', ')}]`);
  }
  option.click();
  detect();
}

/** Closes an open list the way a keyboard user does, without choosing anything. */
export function closeSelect(trigger: HTMLElement, detect: () => void): void {
  trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  detect();
}
