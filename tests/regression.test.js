// Regression tests: one test for each problem that was found while testing Checkpoint 3.
// If a test here ever fails again, an old problem has come back.
describe('Regression - problems found during testing', () => {
  test('FOUND-1: 31 February used to be accepted (JavaScript turns it into 3 March)', () => {
    expect(new Date('2099-02-31T10:00').getMonth()).toBe(2);                 // the trap: it becomes March
    expect(() => Validator.validateDateTime('2099-02-31T10:00')).toThrow(ValidationError);
  });
  test('FOUND-2: private fields are invisible to JSON, so a naive save would store "{}"', () => {
    class Naive { #secret = 'data'; }
    expect(JSON.stringify(new Naive())).toBe('{}');                           // the trap
    const c = new Customer(1, 'Serah Morris', 'serah@example.com', '5551234');
    expect(JSON.stringify(c)).not.toBe('{}');                                 // the fix: toJSON()
  });
  test('FOUND-3: a name containing HTML must be refused (it could run as code on the page)', () => {
    expect(() => new Customer(1, '<img src=x onerror=alert(1)>', 'a@b.com', '5551234')).toThrow(ValidationError);
  });
  test('FOUND-4: damaged saved data containing null entries must give a friendly error, not a crash', () => {
    const world = freshWorld();
    const service = new StorageService(fakeStorage());
    const text = JSON.stringify({
      app: 'AppointEase', version: 1,
      registry: { nextId: 1, customers: [] },
      queue: { lastQueueNumber: 0, appointments: [null] }
    });
    expect(() => service.restoreFromText(text, new CustomerRegistry(), world.queue, world.services)).toThrow(StorageError);
  });
  test('FOUND-5: a refused booking must not use up a queue number (no gaps)', () => {
    const world = freshWorld();
    const c = newCustomer(world);
    c.bookAppointment(world.services[0], FUTURE);
    expect(() => c.bookAppointment(world.services[0], FUTURE)).toThrow(BusinessRuleError);
    expect(world.queue.getStats().lastNumber).toBe(1);
  });
  test('FOUND-6: restoring saved data must be all-or-nothing, never half-applied', () => {
    const world = freshWorld();
    const c = newCustomer(world);
    c.bookAppointment(world.services[0], FUTURE);
    const service = new StorageService(fakeStorage());
    const bad = JSON.parse(service.toJsonText(world.registry, world.queue));
    bad.queue.appointments[0].status = 'Teleported';
    expect(() => service.restoreFromText(JSON.stringify(bad), world.registry, world.queue, world.services)).toThrow(StorageError);
    expect(world.registry.getAll()).toHaveLength(1);
    expect(world.queue.getQueueList()).toHaveLength(1);
  });
});
