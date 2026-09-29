import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideFakeAuth } from '../../../auth/auth.testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { ShellDrawer } from './shell-drawer';

@Component({ template: '' })
class Dummy {}

describe('ShellDrawer', () => {
  let fixture: ComponentFixture<ShellDrawer>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShellDrawer],
      providers: [provideRouter([{ path: 'work-items', component: Dummy }]), provideFakeAuth()],
    }).compileComponents();
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(ShellDrawer);
    fixture.detectChanges();
  });

  const dialog = () => (fixture.nativeElement as HTMLElement).querySelector('dialog') as HTMLDialogElement;

  it('is closed until opened', () => {
    expect(dialog().open).toBe(false);
  });

  it('opens as a native modal dialog when told to', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(dialog().open).toBe(true);
  });

  it('closes when its own close button is clicked', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    dialog().querySelector('button')!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('closes on a backdrop click (a click landing on the <dialog> itself, not its content)', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    // A click on padding outside the content still targets the <dialog> element itself.
    const backdropClick = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(backdropClick, 'target', { value: dialog() });
    dialog().dispatchEvent(backdropClick);
    fixture.detectChanges();

    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('closes on navigation', async () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    await router.navigateByUrl('/work-items');
    fixture.detectChanges();

    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('passes axe while open', async () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await expectNoAxeViolations(dialog());
  });
});
