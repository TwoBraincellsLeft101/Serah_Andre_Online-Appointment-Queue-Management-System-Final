// Unit tests: StorageService (JSON.stringify / JSON.parse, rebuilding objects, damaged data).
describe('StorageService - saving and loading', () => {
  let world;
  let storage;
  let service;
  beforeEach(() => {
    world = freshWorld();
    storage = fakeStorage();
    service = new StorageService(storage);
  });

  /** Arrange a small but realistic day: 2 customers, 3 bookings, one being served. */
  const arrangeBusyDay = () => {
    const serah = newCustomer(world);
    const andre = newCustomer(world, 'Andre B', 'andre@example.com', '5559999');
    serah.bookAppointment(world.services[0], FUTURE);
    andre.bookAppointment(world.services[1], FUTURE);
    serah.bookAppointment(world.services[1], FUTURE_LATER);
    world.staff.callNextCustomer();                      // serah's first booking is Now Serving
    return { serah, andre };
  };
  /** Pretend to reload the page: new empty registry, empty queue, then load. */
  const reload = () => {
    world.queue.reset();
    const registry = new CustomerRegistry();
    const loaded = service.load(registry, world.queue, world.services);
    return { registry, loaded };
  };

  test('save() writes valid JSON text under the storage key', () => {
    arrangeBusyDay();
    service.save(world.registry, world.queue);
    const data = JSON.parse(storage.data[StorageService.STORAGE_KEY]);
    expect(data.app).toBe('AppointEase');
    expect(data.version).toBe(1);
    expect(data.registry.customers).toHaveLength(2);
    expect(data.queue.appointments).toHaveLength(3);
  });
  test('the saved text is a string; parsing it gives a plain object (JSON carries data, not methods)', () => {
    arrangeBusyDay();
    const text = service.toJsonText(world.registry, world.queue);
    const parsed = JSON.parse(text);
    expect(typeof text).toBe('string');
    expect(typeof parsed).toBe('object');
    expect(parsed.registry.customers[0] instanceof Customer).toBe(false);   // the Week 9 lesson
    expect(typeof parsed.registry.customers[0].getName).toBe('undefined');
  });
  test('toJsonText(..., true) is indented for people to read', () => {
    arrangeBusyDay();
    expect(service.toJsonText(world.registry, world.queue, true)).toContain('\n  ');
  });
  test('round trip: after a reload the customers and queue are back', () => {
    arrangeBusyDay();
    service.save(world.registry, world.queue);
    const { registry, loaded } = reload();
    expect(loaded).toBe(true);
    expect(registry.getAll().map(c => c.getName())).toEqual(['Serah Morris', 'Andre B']);
    expect(world.queue.getQueueList().map(a => [a.queueNumber, a.getStatus()])).toEqual([
      [1, 'Now Serving'], [2, 'Confirmed'], [3, 'Confirmed']
    ]);
  });
  test('after loading the objects are REAL class instances again, with working methods', () => {
    arrangeBusyDay();
    service.save(world.registry, world.queue);
    const { registry } = reload();
    const serah = registry.findByEmail('serah@example.com');
    expect(serah).toBeInstanceOf(Customer);
    expect(serah.getAppointments()).toHaveLength(2);
    expect(serah.getAppointments()[0]).toBeInstanceOf(Appointment);
    expect(world.queue.getNowServing().customer).toBe(serah);          // same object, not a copy
    expect(world.staff.callNextCustomer().queueNumber).toBe(2);        // the queue carries on
  });
  test('after loading, a restored customer can still cancel, and new numbers carry on', () => {
    arrangeBusyDay();
    service.save(world.registry, world.queue);
    const { registry } = reload();
    const andre = registry.findByEmail('andre@example.com');
    andre.cancelAppointment(andre.getAppointments()[0].appointmentId);
    expect(andre.getAppointments()[0].getStatus()).toBe('Cancelled');
    const existingIds = world.queue.getQueueList().map(a => a.appointmentId);
    const next = andre.bookAppointment(world.services[0], '2099-02-01T10:00');
    expect(next.queueNumber).toBe(4);                                  // numbering carries on
    expect(existingIds).not.toContain(next.appointmentId);             // and the id is not one already in use
  });
  test('after loading, customer ids carry on', () => {
    arrangeBusyDay();
    service.save(world.registry, world.queue);
    const { registry } = reload();
    expect(registry.register('Mary Tari', 'mary@example.com', '5557777').id).toBe(3);
  });
  test('load() returns false when nothing has been saved yet', () => {
    expect(service.load(new CustomerRegistry(), world.queue, world.services)).toBe(false);
  });
  test('clear() deletes the saved data', () => {
    arrangeBusyDay();
    service.save(world.registry, world.queue);
    service.clear();
    expect(storage.data[StorageService.STORAGE_KEY]).toBeUndefined();
  });
  test('an empty system saves and loads fine', () => {
    service.save(world.registry, world.queue);
    expect(reload().loaded).toBe(true);
    expect(world.queue.getQueueList()).toHaveLength(0);
  });
});

describe('StorageService - damaged or tampered data is never trusted', () => {
  let world;
  let storage;
  let service;
  beforeEach(() => {
    world = freshWorld();
    storage = fakeStorage();
    service = new StorageService(storage);
  });

  /** A correct snapshot (as a plain object) to damage in different ways. */
  const goodSnapshot = () => {
    const serah = newCustomer(world);
    serah.bookAppointment(world.services[0], FUTURE);
    return JSON.parse(service.toJsonText(world.registry, world.queue));
  };
  const tryLoad = (text) => service.restoreFromText(text, new CustomerRegistry(), world.queue, world.services);

  test('text that is not JSON gives a friendly StorageError', () => {
    expect(() => tryLoad('{ this is not json')).toThrow(StorageError, 'not valid JSON');
    expect(() => tryLoad('')).toThrow(StorageError);
  });

  const tamperings = [
    ['JSON that is not an object (a number)', () => 42],
    ['JSON "null"', () => null],
    ['an array instead of an object', () => []],
    ['a file from a different app', (d) => ({ ...d, app: 'SomethingElse' })],
    ['an unsupported version', (d) => ({ ...d, version: 99 })],
    ['the registry missing', (d) => ({ ...d, registry: undefined })],
    ['customers that are not a list', (d) => ({ ...d, registry: { ...d.registry, customers: 'no' } })],
    ['the queue missing', (d) => ({ ...d, queue: undefined })],
    ['a customer with an invalid email', (d) => { d.registry.customers[0].email = 'not-an-email'; return d; }],
    ['a customer name containing HTML', (d) => { d.registry.customers[0].name = '<img src=x onerror=alert(1)>'; return d; }],
    ['a customer that is null', (d) => { d.registry.customers[0] = null; return d; }],
    ['an appointment that is null', (d) => { d.queue.appointments[0] = null; return d; }],
    ['an appointment for a customer that does not exist', (d) => { d.queue.appointments[0].customerId = 999; return d; }],
    ['an appointment for a service that does not exist', (d) => { d.queue.appointments[0].serviceId = 999; return d; }],
    ['an appointment with an impossible date', (d) => { d.queue.appointments[0].dateTime = '2099-02-31T10:00'; return d; }],
    ['an appointment with a made-up status', (d) => { d.queue.appointments[0].status = 'Teleported'; return d; }],
    ['a repeated queue number', (d) => { d.queue.appointments.push({ ...d.queue.appointments[0], appointmentId: 77 }); return d; }],
    ['a last queue number lower than the numbers used', (d) => { d.queue.lastQueueNumber = 0; return d; }],
    ['two customers with the same email', (d) => { d.registry.customers.push({ ...d.registry.customers[0], id: 2 }); d.registry.nextId = 3; return d; }]
  ];
  tamperings.forEach(([description, damage]) => {
    test(`refuses: ${description}`, () => {
      const damaged = damage(goodSnapshot());
      expect(() => tryLoad(JSON.stringify(damaged))).toThrow(StorageError);
    });
  });

  test('a refused load changes nothing (all-or-nothing)', () => {
    const damaged = goodSnapshot();                       // the world now holds Serah and one booking
    damaged.queue.appointments[0].status = 'Teleported';
    const withoutTime = () => service.toJsonText(world.registry, world.queue).replace(/"savedAt":"[^"]*",/, '');
    const before = withoutTime();
    expect(() => service.restoreFromText(JSON.stringify(damaged), world.registry, world.queue, world.services)).toThrow(StorageError);
    expect(withoutTime()).toBe(before);                   // identical: nothing was changed
  });
  test('load() keeps a BACKUP of damaged saved text and reports the problem', () => {
    storage.setItem(StorageService.STORAGE_KEY, '{ broken');
    expect(() => service.load(new CustomerRegistry(), world.queue, world.services)).toThrow(StorageError);
    expect(storage.data[`${StorageService.STORAGE_KEY}.backup`]).toBe('{ broken');
  });
  test('the friendly message says what was wrong', () => {
    const damaged = goodSnapshot();
    damaged.registry.customers[0].email = 'bad';
    expect(() => tryLoad(JSON.stringify(damaged))).toThrow(StorageError, 'not valid');
  });
});

describe('StorageService - storage that fails', () => {
  test('save() gives a StorageError when storage is full or blocked', () => {
    const world = freshWorld();
    const service = new StorageService(brokenStorage());
    expect(() => service.save(world.registry, world.queue)).toThrow(StorageError, 'could not be saved');
  });
  test('load() and clear() give a StorageError too', () => {
    const world = freshWorld();
    const service = new StorageService(brokenStorage());
    expect(() => service.load(world.registry, world.queue, world.services)).toThrow(StorageError);
    expect(() => service.clear()).toThrow(StorageError);
  });
  test('no storage at all (null) gives a friendly StorageError', () => {
    const world = freshWorld();
    const service = new StorageService(null);
    expect(() => service.save(world.registry, world.queue)).toThrow(StorageError, 'does not allow saving');
  });
  test('a failed save does not damage the data in memory', () => {
    const world = freshWorld();
    const serah = newCustomer(world);
    serah.bookAppointment(world.services[0], FUTURE);
    expect(() => new StorageService(brokenStorage()).save(world.registry, world.queue)).toThrow(StorageError);
    expect(world.queue.getQueueList()).toHaveLength(1);
  });
});
