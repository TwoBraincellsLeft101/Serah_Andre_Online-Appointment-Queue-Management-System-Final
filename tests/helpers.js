/**
 * helpers.js - small builders shared by the test files, so each test can ARRANGE quickly
 * and every test starts from a clean, independent world.
 */

/** A date far in the future, so "not in the past" never fails on the day tests are run. */
const FUTURE = '2099-01-15T09:00';
const FUTURE_LATER = '2099-01-15T09:30';

/** Fresh registry + services + staff, and the Singleton queue emptied. */
function freshWorld() {
  const queue = QueueManager.getInstance();
  queue.reset();
  return {
    queue,
    registry: new CustomerRegistry(),
    services: [
      new ServiceType(1, 'Savings Account', 20),
      new ServiceType(2, 'Home Mortgage', 45)
    ],
    staff: new Staff(100, 'Alex Rivera', 'alex@appointease.test', '5550100', 'Customer Service Officer')
  };
}

/** A registered customer: register(name, email, phone) with sensible defaults. */
function newCustomer(world, name = 'Serah Morris', email = 'serah@example.com', phone = '5551234') {
  return world.registry.register(name, email, phone);
}

/** A stand-in for localStorage that lives in memory (so tests never touch a real browser). */
function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value); },
    removeItem: (key) => { delete data[key]; }
  };
}

/** A storage that always fails, like a full or blocked localStorage. */
function brokenStorage() {
  const problem = () => { throw new Error('QuotaExceededError'); };
  return { getItem: problem, setItem: problem, removeItem: problem };
}
