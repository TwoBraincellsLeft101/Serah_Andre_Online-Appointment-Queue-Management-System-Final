/**
 * TestRunner.js - a very small unit-test framework.
 *
 * It copies the style of Jest, which Week 10 introduced (test("...", () => { expect(x).toBe(y) })), so the
 * tests read the same and could be moved to Jest later. It works in two places:
 *   - in the browser: tests/tests.html shows the results as a page,
 *   - in Node:        node tests/run-tests.mjs prints them in the terminal.
 *
 * Every test follows ARRANGE (prepare objects) -> ACT (call the method) -> ASSERT (expect(...)).
 */
class TestRunner {
  static #groups = [];
  static #current = null;

  /** Group related tests under a name. */
  static describe(name, body) {
    const group = { name, tests: [], setups: [] };
    TestRunner.#groups.push(group);
    TestRunner.#current = group;
    body();
    TestRunner.#current = null;
  }

  /** Register one test. */
  static test(name, body) {
    if (!TestRunner.#current) throw new Error('test() must be called inside describe().');
    TestRunner.#current.tests.push({ name, body });
  }

  /** Register code that runs before EACH test in the current group (keeps tests independent). */
  static beforeEach(setup) {
    if (!TestRunner.#current) throw new Error('beforeEach() must be called inside describe().');
    TestRunner.#current.setups.push(setup);
  }

  /** Run everything and return the results. */
  static run() {
    const results = [];
    for (const group of TestRunner.#groups) {
      for (const t of group.tests) {
        try {
          group.setups.forEach(setup => setup());
          t.body();
          results.push({ group: group.name, name: t.name, passed: true });
        } catch (error) {
          results.push({ group: group.name, name: t.name, passed: false, message: error.message });
        }
      }
    }
    return results;
  }

  /** Build the object returned by expect(): the matchers (toBe, toEqual ...) plus ".not". */
  static expect(actual) {
    const fail = (message) => { throw new Error(message); };
    const show = (value) => {
      if (value === undefined) return 'undefined';
      if (typeof value === 'function') return '[function]';
      try { return JSON.stringify(value); } catch { return String(value); }
    };
    const same = (a, b) => {
      if (Object.is(a, b)) return true;
      if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
      if (Array.isArray(a) !== Array.isArray(b)) return false;
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      return keysA.length === keysB.length && keysA.every(k => same(a[k], b[k]));
    };

    const build = (negate) => {
      const check = (passed, expectation) => {
        if (negate ? passed : !passed) fail(`Expected ${negate ? 'NOT ' : ''}${expectation}`);
      };
      return {
        toBe: (expected) => check(Object.is(actual, expected), `${show(actual)} to be ${show(expected)}`),
        toEqual: (expected) => check(same(actual, expected), `${show(actual)} to equal ${show(expected)}`),
        toBeNull: () => check(actual === null, `${show(actual)} to be null`),
        toBeUndefined: () => check(actual === undefined, `${show(actual)} to be undefined`),
        toBeTruthy: () => check(Boolean(actual), `${show(actual)} to be truthy`),
        toBeFalsy: () => check(!actual, `${show(actual)} to be falsy`),
        toContain: (item) => check(actual.includes(item), `${show(actual)} to contain ${show(item)}`),
        toHaveLength: (n) => check(actual.length === n, `length ${actual.length} to be ${n}`),
        toBeInstanceOf: (type) => check(actual instanceof type, `${show(actual)} to be an instance of ${type.name}`),
        toMatch: (pattern) => check(pattern.test(actual), `${show(actual)} to match ${pattern}`),
        /** expect(() => ...).toThrow(ErrorClass, "part of the message") */
        toThrow: (type, messagePart) => {
          let thrown = null;
          try { actual(); } catch (error) { thrown = error; }
          const matches = thrown !== null &&
            (!type || thrown instanceof type) &&
            (!messagePart || String(thrown.message).includes(messagePart));
          const wanted = `${type ? type.name : 'an error'}${messagePart ? ` containing "${messagePart}"` : ''}`;
          const got = thrown ? `${thrown.name}: ${thrown.message}` : 'nothing thrown';
          if (negate ? matches : !matches) fail(`Expected ${negate ? 'NOT ' : ''}to throw ${wanted}, got ${got}`);
        }
      };
    };
    const api = build(false);
    api.not = build(true);
    return api;
  }
}

const describe = (name, body) => TestRunner.describe(name, body);
const test = (name, body) => TestRunner.test(name, body);
const beforeEach = (setup) => TestRunner.beforeEach(setup);
const expect = (actual) => TestRunner.expect(actual);
