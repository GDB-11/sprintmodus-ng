import { TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { NotificationOutlet } from './notification-outlet';
import { NotificationService } from '../notification.service';

describe('NotificationOutlet', () => {
  it('announces notifications in a polite live region and lets the user dismiss them', async () => {
    const fixture = TestBed.createComponent(NotificationOutlet);
    const service = TestBed.inject(NotificationService);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('[aria-live="polite"]')).not.toBeNull();

    service.warning('EPIC is not a recommended parent for TASK.');
    service.success('Changes saved.');
    service.error('Nope.');
    service.info('FYI.');
    fixture.detectChanges();

    expect(root.textContent).toContain('Warning: EPIC is not a recommended parent for TASK.');
    expect(root.textContent).toContain('Done: Changes saved.');
    await expectNoAxeViolations(root);

    root.querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();

    expect(root.textContent).not.toContain('EPIC is not a recommended parent');
    expect(service.notifications()).toHaveLength(3);
  });
});
