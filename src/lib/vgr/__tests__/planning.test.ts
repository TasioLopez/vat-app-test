import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultPlanningPhases,
  normalizeVgrActivityLabel,
  planningFromTpBijlage1,
  VGR_PLANNING_PHASE_DEFS,
} from '@/lib/vgr/planning-defaults';

describe('normalizeVgrActivityLabel', () => {
  it('remaps TP Bijlage1 wording to VGR 04 labels', () => {
    assert.equal(normalizeVgrActivityLabel('Kwaliteiten en vaardigheden onderzoek'), 'Kwaliteiten en vaardigheden onderzoeken');
    assert.equal(normalizeVgrActivityLabel('Beroeps-en arbeidsmarktoriëntatie'), 'Beroeps-en arbeidsmarkt oriëntatie');
    assert.equal(normalizeVgrActivityLabel('Solliciteren via Social Media'), 'Solliciteren via Social Media en/of netwerken');
    assert.equal(normalizeVgrActivityLabel('Activering/ werkervaringsplaats'), 'Activering / werkervaring');
    assert.equal(normalizeVgrActivityLabel('Jobhunten'), 'Jobhunten en bemiddeling');
    assert.equal(normalizeVgrActivityLabel('Webinar, gericht op WIA-aanvraag'), 'Webinar (gericht op eventuele WIA-aanvraag)');
    assert.equal(normalizeVgrActivityLabel('Netwerken'), 'Netwerken');
  });
});

describe('planningFromTpBijlage1', () => {
  it('returns null for empty input', () => {
    assert.equal(planningFromTpBijlage1(null), null);
    assert.equal(planningFromTpBijlage1([]), null);
  });

  it('keeps adviser statuses and remaps labels; Netwerken stays in the phase it came from', () => {
    const out = planningFromTpBijlage1(
      [
        {
          title: 'Oriëntatie',
          period_from: '2026-01-01',
          period_to: '2026-03-31',
          activities: [
            { name: 'Empowerment', status: 'G' },
            { name: 'Kwaliteiten en vaardigheden onderzoek', status: 'U' },
          ],
        },
        {
          title: 'Activering',
          activities: [
            { name: 'Netwerken', status: 'P' },
            { name: 'Solliciteren via Social Media', status: 'N' },
          ],
        },
      ],
      '2026-01-01',
      '2026-09-30'
    );
    assert.ok(out);
    assert.equal(out[0].goal, 'Oriëntatie');
    assert.equal(out[0].activities[1].name, 'Kwaliteiten en vaardigheden onderzoeken');
    assert.equal(out[0].activities[1].status, 'U');
    assert.equal(out[1].activities[0].name, 'Netwerken');
    assert.equal(out[1].activities[1].name, 'Solliciteren via Social Media en/of netwerken');
    assert.equal(out[1].activities[1].status, 'N');
  });
});

describe('createDefaultPlanningPhases', () => {
  it('uses exact VGR-04 activity lists and default status P', () => {
    const phases = createDefaultPlanningPhases();
    assert.equal(phases.length, 3);
    assert.deepEqual(
      phases[0].activities.map((a) => a.name),
      VGR_PLANNING_PHASE_DEFS[0].activities
    );
    assert.ok(phases.every((p) => p.activities.every((a) => a.status === 'P')));
    assert.ok(phases[0].activities.some((a) => a.name === 'Netwerken'));
    assert.ok(phases[2].activities.some((a) => a.name === 'Activering / werkervaring'));
  });
});
