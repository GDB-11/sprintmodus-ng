import { describeChange } from './history-description';
import { ChangeType, HistoryEntry } from './work-item.models';

const entry = (changeType: ChangeType, rest: Partial<HistoryEntry> = {}): HistoryEntry => ({
  changeType,
  additionalData: {},
  createdAt: '2026-09-25T10:00:00Z',
  changedBy: { userCode: 'u1', fullName: 'Mia Member' },
  ...rest,
});

describe('describeChange', () => {
  it('says a creation, with the type when it is known', () => {
    expect(describeChange(entry('CREATED', { newValue: 'Story', additionalData: { type: 'PBI' } })).text).toBe(
      'creó este elemento (elemento del backlog)',
    );
    expect(describeChange(entry('CREATED')).text).toBe('creó este elemento');
  });

  it('names both statuses by the names they had when the change was made, else by their codes', () => {
    const named = entry('STATE_CHANGED', {
      field: 'Status',
      oldValue: 'NEW',
      newValue: 'APPROVED',
      additionalData: { from: 'Nuevo', to: 'Aprobado' },
    });
    expect(describeChange(named).text).toBe('cambió el estado de «Nuevo» a «Aprobado»');
    expect(describeChange({ ...named, additionalData: {} }).text).toBe('cambió el estado de «NEW» a «APPROVED»');
  });

  it('says who was assigned and in which role, and who was taken off', () => {
    const data = { fullName: 'Ana Diaz', role: 'QA' };
    expect(describeChange(entry('ASSIGNED', { newValue: 'Ana Diaz (QA)', additionalData: data })).text).toBe(
      'asignó a Ana Diaz (Calidad (QA))',
    );
    expect(describeChange(entry('UNASSIGNED', { oldValue: 'Ana Diaz (QA)', additionalData: data })).text).toBe(
      'quitó a Ana Diaz (Calidad (QA)) de la asignación',
    );
    // an entry written before the name was kept still reads
    expect(describeChange(entry('ASSIGNED', { newValue: 'Ana Diaz (QA)' })).text).toBe('asignó a Ana Diaz (QA)');
  });

  it('says a change of a number, a title and a priority in a sentence', () => {
    expect(describeChange(entry('EFFORT_CHANGED', { field: 'EffortPoints', oldValue: '3', newValue: '8' })).text).toBe(
      'cambió los puntos de esfuerzo de 3 a 8',
    );
    expect(describeChange(entry('EFFORT_CHANGED', { field: 'RemainingHours', oldValue: '4', newValue: '2.5' })).text).toBe(
      'cambió las horas restantes de 4 a 2.5',
    );
    expect(describeChange(entry('FIELD_CHANGED', { field: 'Title', oldValue: 'Old', newValue: 'New' })).text).toBe(
      'cambió el título de «Old» a «New»',
    );
    expect(describeChange(entry('FIELD_CHANGED', { field: 'Priority', oldValue: 'MEDIUM', newValue: 'CRITICAL' })).text).toBe(
      'cambió la prioridad de Media a Crítica',
    );
    expect(describeChange(entry('FIELD_CHANGED', { field: 'BoardRank', newValue: '2' })).text).toBe(
      'cambió su posición en el tablero de sin valor a 2',
    );
  });

  it('shows a long text apart, before and after, instead of in the sentence', () => {
    const edited = describeChange(entry('DESCRIPTION_EDITED', { field: 'Description', oldValue: 'Before', newValue: 'After' }));
    expect(edited).toEqual({ text: 'editó la descripción', before: 'Before', after: 'After' });

    const cleared = describeChange(entry('FIELD_CHANGED', { field: 'AcceptanceCriteria', oldValue: 'Was here' }));
    expect(cleared).toEqual({ text: 'editó los criterios de aceptación', before: 'Was here', after: null });
  });

  it('names an unknown field rather than hiding the change', () => {
    expect(describeChange(entry('FIELD_CHANGED', { field: 'Whatever', oldValue: 'a', newValue: 'b' })).text).toBe(
      'cambió el campo Whatever de a a b',
    );
  });

  it('says a parent change with the keys of the items involved', () => {
    expect(describeChange(entry('PARENT_CHANGED', { additionalData: { from: 'WAR-1', to: 'WAR-2' } })).text).toBe(
      'cambió el elemento superior de WAR-1 a WAR-2',
    );
    expect(describeChange(entry('PARENT_CHANGED', { additionalData: { to: 'WAR-2' } })).text).toBe(
      'puso WAR-2 como elemento superior',
    );
    expect(describeChange(entry('PARENT_CHANGED', { additionalData: { from: 'WAR-1' } })).text).toBe(
      'quitó su elemento superior (WAR-1)',
    );
    expect(describeChange(entry('PARENT_CHANGED')).text).toBe('cambió el elemento superior');
  });

  describe('a sprint change', () => {
    const names = { s1: 'Sprint 1', s2: 'Sprint 2' };

    it('names the sprint it went to and where it was before', () => {
      const moved = entry('SPRINT_CHANGED', { oldValue: 's1', newValue: 's2', additionalData: { sprint: 'Sprint 2' } });
      expect(describeChange(moved, names).text).toBe('movió el elemento al sprint «Sprint 2» (antes en «Sprint 1»)');
    });

    it('says when it was in no sprint, or in one that is not known', () => {
      expect(describeChange(entry('SPRINT_CHANGED', { newValue: 's2', additionalData: { sprint: 'Sprint 2' } })).text).toBe(
        'movió el elemento al sprint «Sprint 2» (antes sin sprint)',
      );
      expect(describeChange(entry('SPRINT_CHANGED', { oldValue: 'gone', newValue: 's2' }), names).text).toBe(
        'movió el elemento al sprint «Sprint 2» (antes en otro sprint)',
      );
    });

    it('says it went back to the backlog', () => {
      expect(describeChange(entry('SPRINT_CHANGED', { oldValue: 's1' }), names).text).toBe(
        'devolvió el elemento al backlog (antes en «Sprint 1»)',
      );
    });
  });

  it('quotes a comment', () => {
    expect(describeChange(entry('COMMENTED', { field: 'Comment', newValue: 'Looks good' }))).toEqual({
      text: 'comentó',
      quote: 'Looks good',
    });
    expect(describeChange(entry('COMMENT_EDITED', { newValue: 'Better' }))).toEqual({ text: 'editó un comentario', quote: 'Better' });
    expect(describeChange(entry('COMMENT_DELETED', { oldValue: 'Oops' }))).toEqual({ text: 'eliminó un comentario', quote: 'Oops' });
  });

  it('links to the item at the other end of a relation', () => {
    const data = { targetCode: 'item-2', targetKey: 'WAR-1001', type: 'BLOCKS' };
    expect(describeChange(entry('LINKED', { newValue: 'WAR-1001 (BLOCKS)', additionalData: data }))).toEqual({
      text: 'agregó la relación «Bloquea a» con',
      item: { code: 'item-2', key: 'WAR-1001' },
    });
    expect(describeChange(entry('UNLINKED', { oldValue: 'WAR-1001 (BLOCKS)', additionalData: data })).text).toBe(
      'quitó la relación «Bloquea a» con',
    );
  });

  it('still reads a relation written before its key was kept', () => {
    expect(describeChange(entry('LINKED', { newValue: 'WAR-1001 (BLOCKS)' }))).toEqual({
      text: 'agregó la relación con WAR-1001 (BLOCKS)',
    });
  });

  it('says a deletion and a restoration', () => {
    expect(describeChange(entry('DELETED', { oldValue: 'Story' })).text).toBe('eliminó este elemento');
    expect(describeChange(entry('RESTORED')).text).toBe('restauró este elemento');
  });
});
