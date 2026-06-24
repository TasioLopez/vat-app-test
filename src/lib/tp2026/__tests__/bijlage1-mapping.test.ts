import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ensureTP2026Shape } from '@/lib/tp2026/mapping';

describe('bijlage1 activity rename', () => {
  it('renames legacy Social Media activity label on shape', () => {
    const shaped = ensureTP2026Shape({
      bijlage1_phases: [
        {
          title: 'Activering',
          period_from: '2026-01-01',
          period_to: '2026-04-01',
          activities: [
            {
              name: 'Solliciteren en/of netwerken via Social Media',
              status: 'G',
            },
          ],
        },
      ],
    });

    const activity = shaped.bijlage1_phases[0].activities[0];
    assert.equal(activity.name, 'Solliciteren via Social Media');
    assert.equal(activity.status, 'G');
  });
});
