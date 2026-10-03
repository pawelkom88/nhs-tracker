/**
 * Rule: kyw/no-ranking-by-statistic
 * Enforces PRD rule: Never rank Reporting Units by any Statistic.
 * Lists must remain alphabetical (or chronological by reportingPeriod).
 */

const FORBIDDEN_EXACT = new Set(['value', 'statistic', 'figures', 'figure']);
const FORBIDDEN_PATTERN = /^(median|longWait|withinWaitingStandard|total)/i;
const ALLOWED_EXACT = new Set(['displayName', 'officialName', 'name', 'reportingPeriod']);

function isForbiddenName(name) {
  if (ALLOWED_EXACT.has(name)) return false;
  if (FORBIDDEN_EXACT.has(name)) return true;
  return FORBIDDEN_PATTERN.test(name);
}

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow sorting or ranking by wait statistics (ADR-0003, ADR-0006).',
    },
    schema: [],
    messages: {
      noRankingByStatistic:
        'Sorting or ranking by statistic ("{{name}}") is forbidden (ADR-0003, ADR-0006). Lists must remain alphabetical or chronological by reporting period.',
    },
  },
  create(context) {
    function checkNodeForForbiddenProperty(node) {
      if (!node) return;
      if (node.type === 'MemberExpression') {
        const prop = node.property;
        if (!node.computed && prop.type === 'Identifier' && isForbiddenName(prop.name)) {
          context.report({
            node: prop,
            messageId: 'noRankingByStatistic',
            data: { name: prop.name },
          });
        } else if (
          node.computed &&
          prop.type === 'Literal' &&
          typeof prop.value === 'string' &&
          isForbiddenName(prop.value)
        ) {
          context.report({
            node: prop,
            messageId: 'noRankingByStatistic',
            data: { name: prop.value },
          });
        }
      } else if (
        node.type === 'Literal' &&
        typeof node.value === 'string' &&
        isForbiddenName(node.value)
      ) {
        context.report({
          node,
          messageId: 'noRankingByStatistic',
          data: { name: node.value },
        });
      }
    }

    function walkComparator(node) {
      if (!node) return;
      if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
        traverse(node.body);
      } else if (node.type === 'ArrayExpression') {
        node.elements.forEach(walkComparator);
      } else if (node.type === 'Literal') {
        checkNodeForForbiddenProperty(node);
      }
    }

    function traverse(node) {
      if (!node || typeof node !== 'object') return;
      checkNodeForForbiddenProperty(node);
      for (const key of Object.keys(node)) {
        if (key === 'parent') continue;
        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach((c) => {
            if (c && typeof c === 'object' && c.type) traverse(c);
          });
        } else if (child && typeof child === 'object' && child.type) {
          traverse(child);
        }
      }
    }

    return {
      CallExpression(node) {
        const callee = node.callee;
        // Case 1: x.sort(fn) or x.toSorted(fn)
        if (
          callee.type === 'MemberExpression' &&
          !callee.computed &&
          (callee.property.name === 'sort' || callee.property.name === 'toSorted')
        ) {
          if (node.arguments.length > 0) {
            walkComparator(node.arguments[0]);
          }
        }
        // Case 2: sortBy(arr, iteratee) or orderBy(arr, iteratees)
        // or lodash.sortBy / _.sortBy / lodash.orderBy / _.orderBy
        else if (
          (callee.type === 'Identifier' &&
            (callee.name === 'sortBy' || callee.name === 'orderBy')) ||
          (callee.type === 'MemberExpression' &&
            !callee.computed &&
            (callee.property.name === 'sortBy' || callee.property.name === 'orderBy'))
        ) {
          const args = node.arguments.slice(1);
          args.forEach(walkComparator);
        }
      },
    };
  },
};

export default rule;
