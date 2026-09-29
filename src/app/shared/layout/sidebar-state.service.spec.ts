import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { stubLocalStorage } from '../../auth/utils/testing';
import { SidebarStateService } from './sidebar-state.service';

@Component({ template: '' })
class Dummy {}

function setup() {
  TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', component: Dummy }])] });
  return { service: TestBed.inject(SidebarStateService), router: TestBed.inject(Router) };
}

describe('SidebarStateService', () => {
  beforeEach(() => stubLocalStorage());

  it('starts expanded when nothing was remembered', () => {
    const { service } = setup();
    expect(service.collapsed()).toBe(false);
  });

  it('restores a remembered collapsed choice', () => {
    localStorage.setItem('sprintmodus.sidebar.collapsed', 'true');
    const { service } = setup();
    expect(service.collapsed()).toBe(true);
  });

  it('toggling remembers the choice for next time', () => {
    const { service } = setup();
    service.toggle();
    expect(service.collapsed()).toBe(true);
    expect(localStorage.getItem('sprintmodus.sidebar.collapsed')).toBe('true');
  });

  it('defaults to collapsed (a rail) on the board, even when "expanded" is remembered', async () => {
    localStorage.setItem('sprintmodus.sidebar.collapsed', 'false');
    const { service, router } = setup();
    expect(service.collapsed()).toBe(false);

    await router.navigateByUrl('/board');
    TestBed.tick();
    expect(service.collapsed()).toBe(true);
  });

  it('a toggle on the board is a session-only override that clears the moment the board is left', async () => {
    const { service, router } = setup();
    await router.navigateByUrl('/board');
    TestBed.tick();
    expect(service.collapsed()).toBe(true); // auto-rail

    service.toggle(); // override: expand while on the board
    expect(service.collapsed()).toBe(false);
    expect(localStorage.getItem('sprintmodus.sidebar.collapsed')).toBeNull();

    await router.navigateByUrl('/dashboard');
    TestBed.tick();

    await router.navigateByUrl('/board');
    TestBed.tick();
    expect(service.collapsed()).toBe(true); // the override didn't survive leaving the board: auto-rail again
  });
});
