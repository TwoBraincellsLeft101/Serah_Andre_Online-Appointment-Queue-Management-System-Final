// Unit tests: Customer booking rules.
describe('Customer.bookAppointment / cancelAppointment', () => {
  let world;
  let customer;
  beforeEach(() => {
    world = freshWorld();
    customer = newCustomer(world);
  });
  const service = () => world.services[0];

  test('books a confirmed appointment with queue number #1', () => {
    const a = customer.bookAppointment(service(), FUTURE);
    expect(a.getStatus()).toBe('Confirmed');
    expect(a.queueNumber).toBe(1);
    expect(a.customer).toBe(customer);
  });
  test('the booking joins the shared queue and the customer\'s own list', () => {
    const a = customer.bookAppointment(service(), FUTURE);
    expect(world.queue.getQueueList()).toContain(a);
    expect(customer.getAppointments()).toContain(a);
  });
  test('different bookings get different, increasing queue numbers', () => {
    const a = customer.bookAppointment(service(), FUTURE);
    const b = customer.bookAppointment(service(), FUTURE_LATER);
    expect([a.queueNumber, b.queueNumber]).toEqual([1, 2]);
  });
  test('appointment ids are unique', () => {
    const a = customer.bookAppointment(service(), FUTURE);
    const b = customer.bookAppointment(service(), FUTURE_LATER);
    expect(a.appointmentId).not.toBe(b.appointmentId);
  });
  test('refuses a booking without a service', () => {
    expect(() => customer.bookAppointment(null, FUTURE)).toThrow(ValidationError, 'choose a service');
  });
  test('refuses a time in the past and an impossible date', () => {
    expect(() => customer.bookAppointment(service(), '2020-01-01T09:00')).toThrow(ValidationError);
    expect(() => customer.bookAppointment(service(), '2099-02-31T10:00')).toThrow(ValidationError);
  });
  test('refuses a double booking at the same time', () => {
    customer.bookAppointment(service(), FUTURE);
    expect(() => customer.bookAppointment(service(), FUTURE)).toThrow(BusinessRuleError, 'already have an appointment');
  });
  test('a refused booking does not use up a queue number', () => {
    customer.bookAppointment(service(), FUTURE);
    expect(() => customer.bookAppointment(service(), FUTURE)).toThrow(BusinessRuleError);
    expect(() => customer.bookAppointment(service(), '2020-01-01T09:00')).toThrow(ValidationError);
    expect(customer.bookAppointment(service(), FUTURE_LATER).queueNumber).toBe(2);
  });
  test('two different customers may book the same time', () => {
    const other = newCustomer(world, 'Andre B', 'andre@example.com', '5559999');
    customer.bookAppointment(service(), FUTURE);
    expect(other.bookAppointment(service(), FUTURE).queueNumber).toBe(2);
  });
  test('a cancelled time slot can be booked again', () => {
    const a = customer.bookAppointment(service(), FUTURE);
    customer.cancelAppointment(a.appointmentId);
    expect(() => customer.bookAppointment(service(), FUTURE)).not.toThrow();
  });
  test('cancelAppointment() cancels and returns the appointment', () => {
    const a = customer.bookAppointment(service(), FUTURE);
    expect(customer.cancelAppointment(a.appointmentId)).toBe(a);
    expect(a.getStatus()).toBe('Cancelled');
  });
  test('cancelAppointment() refuses an unknown id', () => {
    expect(() => customer.cancelAppointment(999)).toThrow(BusinessRuleError, 'could not be found');
  });
  test('a customer cannot cancel someone else\'s appointment', () => {
    const other = newCustomer(world, 'Andre B', 'andre@example.com', '5559999');
    const a = other.bookAppointment(service(), FUTURE);
    expect(() => customer.cancelAppointment(a.appointmentId)).toThrow(BusinessRuleError);
  });
  test('cancelAppointment() refuses an appointment that is already finished', () => {
    const a = customer.bookAppointment(service(), FUTURE);
    world.staff.callNextCustomer();
    world.staff.callNextCustomer();            // a is now Completed
    expect(() => customer.cancelAppointment(a.appointmentId)).toThrow(BusinessRuleError);
  });
  test('viewStatus() lists summaries of the customer\'s appointments', () => {
    customer.bookAppointment(service(), FUTURE);
    expect(customer.viewStatus()).toHaveLength(1);
    expect(customer.viewStatus()[0].status).toBe('Confirmed');
  });
  test('encapsulation: getAppointments() returns a copy', () => {
    customer.bookAppointment(service(), FUTURE);
    customer.getAppointments().length = 0;
    expect(customer.getAppointments()).toHaveLength(1);
  });
  test('restoreAppointment() refuses an appointment of another customer, and duplicates', () => {
    const other = newCustomer(world, 'Andre B', 'andre@example.com', '5559999');
    const mine = customer.bookAppointment(service(), FUTURE);
    const theirs = other.bookAppointment(service(), FUTURE);
    expect(() => customer.restoreAppointment(theirs)).toThrow(BusinessRuleError);
    expect(() => customer.restoreAppointment(mine)).toThrow(BusinessRuleError, 'already listed');
  });
});
