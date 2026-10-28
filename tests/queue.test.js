// Unit tests: QueueManager (Singleton, queue numbers, calling customers, search, JSON restore).
describe('QueueManager', () => {
  let world;
  let serah;
  let andre;
  beforeEach(() => {
    world = freshWorld();
    serah = newCustomer(world);
    andre = newCustomer(world, 'Andre B', 'andre@example.com', '5559999');
  });
  const book = (customer, time = FUTURE, serviceIndex = 0) => customer.bookAppointment(world.services[serviceIndex], time);

  // ---- Singleton ----
  test('Singleton: getInstance() always returns the same object', () => {
    expect(QueueManager.getInstance()).toBe(QueueManager.getInstance());
  });
  test('Singleton: "new QueueManager()" is refused with a plain Error (a programming mistake)', () => {
    expect(() => new QueueManager()).toThrow(Error, 'Singleton');
    expect(() => new QueueManager()).not.toThrow(AppError);
  });
  test('Singleton: customers and staff share the same queue', () => {
    const a = book(serah);
    expect(world.staff.viewQueue()).toContain(a);
  });

  // ---- numbers + adding ----
  test('generateQueueNumber() counts 1, 2, 3', () => {
    expect([world.queue.generateQueueNumber(), world.queue.generateQueueNumber(), world.queue.generateQueueNumber()]).toEqual([1, 2, 3]);
  });
  test('addToQueue() refuses things that are not appointments, and repeats', () => {
    expect(() => world.queue.addToQueue(null)).toThrow(Error);
    expect(() => world.queue.addToQueue({ queueNumber: 1 })).toThrow(Error);
    const a = book(serah);
    expect(() => world.queue.addToQueue(a)).toThrow(Error, 'already in the queue');
  });

  // ---- calling customers ----
  test('callNext() serves the lowest waiting number first', () => {
    const a = book(serah);
    const b = book(andre);
    expect(world.queue.callNext()).toBe(a);
    expect(a.getStatus()).toBe('Now Serving');
    expect(b.getStatus()).toBe('Confirmed');
  });
  test('callNext() completes the customer who was being served', () => {
    const a = book(serah);
    const b = book(andre);
    world.queue.callNext();
    world.queue.callNext();
    expect(a.getStatus()).toBe('Completed');
    expect(b.getStatus()).toBe('Now Serving');
  });
  test('callNext() on an empty queue returns null', () => {
    expect(world.queue.callNext()).toBeNull();
  });
  test('callNext() when only the current customer is left: completes them and returns null', () => {
    const a = book(serah);
    world.queue.callNext();
    expect(world.queue.callNext()).toBeNull();
    expect(a.getStatus()).toBe('Completed');
  });
  test('cancelled and no-show customers are skipped', () => {
    const a = book(serah);
    const b = book(andre);
    serah.cancelAppointment(a.appointmentId);
    expect(world.queue.callNext()).toBe(b);
  });
  test('getNowServing() and getWaitingList() reflect the queue', () => {
    const a = book(serah);
    const b = book(andre);
    expect(world.queue.getNowServing()).toBeNull();
    expect(world.queue.getWaitingList()).toEqual([a, b]);
    world.queue.callNext();
    expect(world.queue.getNowServing()).toBe(a);
    expect(world.queue.getWaitingList()).toEqual([b]);
  });
  test('encapsulation: getQueueList() returns a copy', () => {
    book(serah);
    world.queue.getQueueList().length = 0;
    expect(world.queue.getQueueList()).toHaveLength(1);
  });

  // ---- search + stats ----
  test('search() finds by customer name, service, queue number and status', () => {
    const a = book(serah, FUTURE, 0);
    const b = book(andre, FUTURE, 1);
    expect(world.queue.search('andre')).toEqual([b]);
    expect(world.queue.search('mortgage')).toEqual([b]);
    expect(world.queue.search('#1')).toEqual([a]);
    expect(world.queue.search('2')).toEqual([b]);
    expect(world.queue.search('confirmed')).toHaveLength(2);
  });
  test('search() with empty text returns everything, with no match returns nothing', () => {
    book(serah);
    expect(world.queue.search('')).toHaveLength(1);
    expect(world.queue.search('   ')).toHaveLength(1);
    expect(world.queue.search('zzz')).toHaveLength(0);
  });
  test('getStats() counts waiting, completed and the last number issued', () => {
    book(serah);
    book(andre);
    world.queue.callNext();
    world.queue.callNext();
    expect(world.queue.getStats()).toEqual({ waiting: 0, completed: 1, lastNumber: 2 });
  });
  test('reset() empties the queue and numbering starts at 1 again', () => {
    book(serah);
    world.queue.reset();
    expect(world.queue.getQueueList()).toHaveLength(0);
    expect(world.queue.generateQueueNumber()).toBe(1);
  });

  // ---- JSON ----
  test('toJSON() lists the appointments and the last number', () => {
    book(serah);
    const data = JSON.parse(JSON.stringify(world.queue));
    expect(data.lastQueueNumber).toBe(1);
    expect(data.appointments).toHaveLength(1);
  });
  test('restore() replaces the queue and keeps the numbering', () => {
    const a = book(serah);
    const b = book(andre);
    world.queue.reset();
    world.queue.restore([b, a], 2);                  // given out of order on purpose
    expect(world.queue.getQueueList()).toEqual([a, b]);   // restored in queue-number order
    expect(world.queue.generateQueueNumber()).toBe(3);
  });
  test('restore() refuses repeated queue numbers or ids, and non-appointments', () => {
    const a = book(serah);
    expect(() => world.queue.restore([a, a], 1)).toThrow(BusinessRuleError, 'twice');
    expect(() => world.queue.restore([{}], 1)).toThrow(BusinessRuleError);
  });
  test('restore() refuses two customers being served at once', () => {
    const a = book(serah);
    const b = book(andre);
    world.queue.callNext();                           // a is Now Serving
    b.setStatus('Now Serving');                       // force an impossible state
    expect(() => world.queue.restore([a, b], 2)).toThrow(BusinessRuleError, 'Now Serving');
  });
  test('restore() refuses a last number lower than a number already used', () => {
    const a = book(serah);
    expect(() => world.queue.restore([a], 0)).toThrow(BusinessRuleError, 'numbering');
  });
  test('a refused restore leaves the current queue untouched (all-or-nothing)', () => {
    const a = book(serah);
    expect(() => world.queue.restore([a, a], 1)).toThrow(BusinessRuleError);
    expect(world.queue.getQueueList()).toEqual([a]);
    expect(world.queue.getStats().lastNumber).toBe(1);
  });
});
