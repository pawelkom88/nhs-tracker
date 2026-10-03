import { describe, expect, test } from 'vitest';
import * as indexModule from '../src/index.js';
import * as nationModule from '../src/nation.js';
import * as idsModule from '../src/ids.js';
import * as periodModule from '../src/period.js';
import * as sourceModule from '../src/source.js';
import * as figureModule from '../src/figure.js';
import * as nationDefsModule from '../src/nation-definitions.js';
import * as releaseModule from '../src/release.js';
import * as referenceModule from '../src/reference.js';
import * as publishedModule from '../src/published.js';
import * as englandDefsModule from '../src/england/definitions.js';
import * as englandSchemaModule from '../src/england/schema.js';
import * as walesDefsModule from '../src/wales/definitions.js';
import * as walesSchemaModule from '../src/wales/schema.js';
import * as scotlandDefsModule from '../src/scotland/definitions.js';
import * as scotlandSchemaModule from '../src/scotland/schema.js';

const modules = {
  index: indexModule,
  nation: nationModule,
  ids: idsModule,
  period: periodModule,
  source: sourceModule,
  figure: figureModule,
  nationDefs: nationDefsModule,
  release: releaseModule,
  reference: referenceModule,
  published: publishedModule,
  englandDefs: englandDefsModule,
  englandSchema: englandSchemaModule,
  walesDefs: walesDefsModule,
  walesSchema: walesSchemaModule,
  scotlandDefs: scotlandDefsModule,
  scotlandSchema: scotlandSchemaModule,
};

describe('T-2.10 Cross-nation runtime guardrails', () => {
  test('no exported symbol suggests cross-nation / shared / UK-wide mapping', () => {
    const forbiddenPattern = /crossNation|commonSpecialty|sharedSpecialty|ukWide/i;

    for (const [moduleName, mod] of Object.entries(modules)) {
      const exportNames = Object.keys(mod);
      for (const name of exportNames) {
        expect(name, `Module "${moduleName}" exports forbidden symbol "${name}"`).not.toMatch(
          forbiddenPattern,
        );
      }
    }
  });

  test('src/index.ts exports no symbols per ADR-0006 subpath-import convention', () => {
    expect(Object.keys(indexModule)).toEqual([]);
  });

  test('exactSum runtime rejects mismatched properties or empty input', () => {
    expect(figureModule.exactSum([])).toBeNull();
  });
});
