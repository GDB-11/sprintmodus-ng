import axe from 'axe-core';

/**
 * Fails when axe finds an accessibility violation in the rendered element. jsdom has no layout, so the rules that need one
 * are off: colour contrast is guaranteed instead by using only theme tokens whose pairs were checked against WCAG AA in
 * light and dark mode, and `region` is about whole pages, not the component under test.
 */
export async function expectNoAxeViolations(element: HTMLElement): Promise<void> {
  const results = await axe.run(element, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  const report = results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.help}\n` + violation.nodes.map((node) => `  ${node.html}`).join('\n'),
  );
  expect(report, `accessibility violations:\n${report.join('\n')}`).toEqual([]);
}
