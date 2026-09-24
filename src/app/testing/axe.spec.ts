import { expectNoAxeViolations } from './axe';

it('axe helper really fails on a violation', async () => {
  const div = document.createElement('div');
  div.innerHTML = '<button></button><img src="x.png"><select></select>';
  document.body.appendChild(div);
  await expect(expectNoAxeViolations(div)).rejects.toThrow(/button-name|image-alt|select-name/);
  div.remove();
});
