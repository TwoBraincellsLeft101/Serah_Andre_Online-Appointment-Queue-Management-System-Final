// Unit tests: Staff actions on the queue.
describe('Staff', () => {
  let world;
  let customer;
  beforeEach(() => {
    world = freshWorld();
    customer = newCustomer(world);
  });

  test('has a role, with a default when none is given', () => {
    expect(world.staff.role).toBe('Customer Service Officer');
    expect(new Staff(101, 'Sam Lee', 'sam@appointease.test', '5550101').role).toBe('Service Agent');
  });
  test('callNextCustomer() returns the appointment now being served', () => {
    const a = customer.bookAppointment(world.services[0], FUTURE);
    expect(world.staff.callNextCustomer()).toBe(a);
  });
  test('callNextCustomer() returns null when nobody is waiting', () => {
    expect(world.staff.callNextCustomer()).toBeNull();
  });
  test('updateAppointmentStatus() marks the current customer Completed or No-show', () => {
    const a = customer.bookAppointment(world.services[0], FUTURE);
    world.staff.callNextCustomer();
    world.staff.updateAppointmentStatus(a, 'No-show');
    expect(a.getStatus()).toBe('No-show');
  });
  test('updateAppointmentStatus() refuses any other status', () => {
    const a = customer.bookAppointment(world.services[0], FUTURE);
    world.staff.callNextCustomer();
    ['Pending', 'Cancelled', 'Banana'].forEach(s => expect(() => world.staff.updateAppointmentStatus(a, s)).toThrow(BusinessRuleError));
  });
  test('updateAppointmentStatus() refuses a customer who is not being served', () => {
    const a = customer.bookAppointment(world.services[0], FUTURE);
    expect(() => world.staff.updateAppointmentStatus(a, 'Completed')).toThrow(BusinessRuleError, 'Now Serving');
  });
  test('viewQueue() returns the whole queue', () => {
    customer.bookAppointment(world.services[0], FUTURE);
    expect(world.staff.viewQueue()).toHaveLength(1);
  });
});
