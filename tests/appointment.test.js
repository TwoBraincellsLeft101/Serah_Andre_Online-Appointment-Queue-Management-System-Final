// Unit tests: Appointment (status life-cycle, validation, JSON).
describe('Appointment', () => {
  let customer;
  let service;
  beforeEach(() => {
    customer = new Customer(1, 'Serah Morris', 'serah@example.com', '5551234');
    service = new ServiceType(1, 'Savings Account', 20);
  });
  const make = (id = 1, n = 1) => new Appointment(id, customer, service, FUTURE, n);

  test('constructor stores its values and starts as Pending', () => {
    const a = make(5, 3);
    expect(a.appointmentId).toBe(5);
    expect(a.queueNumber).toBe(3);
    expect(a.dateTime).toBe(FUTURE);
    expect(a.customer).toBe(customer);
    expect(a.getStatus()).toBe('Pending');
  });
  test('constructor refuses bad ids, queue numbers, customers, services and dates', () => {
    expect(() => new Appointment(0, customer, service, FUTURE, 1)).toThrow(ValidationError);
    expect(() => new Appointment(1, customer, service, FUTURE, 0)).toThrow(ValidationError);
    expect(() => new Appointment(1, null, service, FUTURE, 1)).toThrow(ValidationError);
    expect(() => new Appointment(1, customer, null, FUTURE, 1)).toThrow(ValidationError);
    expect(() => new Appointment(1, customer, service, '2099-02-31T10:00', 1)).toThrow(ValidationError);
    expect(() => new Appointment(1, customer, service, 'garbage', 1)).toThrow(ValidationError);
  });
  test('setStatus() accepts a valid status', () => {
    const a = make();
    a.setStatus('Confirmed');
    expect(a.getStatus()).toBe('Confirmed');
  });
  test('setStatus() refuses a status that does not exist', () => {
    expect(() => make().setStatus('Banana')).toThrow(ValidationError);
  });
  test('encapsulation: status cannot be assigned directly', () => {
    const a = make();
    a.status = 'Completed';                           // only creates a harmless new property
    expect(a.getStatus()).toBe('Pending');
  });
  test('a finished appointment cannot change again', () => {
    ['Completed', 'Cancelled', 'No-show'].forEach(finalStatus => {
      const a = make();
      a.setStatus(finalStatus);
      expect(() => a.setStatus('Confirmed')).toThrow(BusinessRuleError);
    });
  });
  test('isWaiting() and isActive() follow the status', () => {
    const a = make();
    a.setStatus('Confirmed');
    expect(a.isWaiting()).toBe(true);
    a.setStatus('Now Serving');
    expect(a.isWaiting()).toBe(false);
    expect(a.isActive()).toBe(true);
    a.setStatus('Completed');
    expect(a.isActive()).toBe(false);
  });
  test('cancel() works while waiting', () => {
    const a = make();
    a.setStatus('Confirmed');
    a.cancel();
    expect(a.getStatus()).toBe('Cancelled');
  });
  test('cancel() is refused once the customer is being served', () => {
    const a = make();
    a.setStatus('Now Serving');
    expect(() => a.cancel()).toThrow(BusinessRuleError, 'can no longer be cancelled');
  });
  test('toSummary() gives the View plain data', () => {
    expect(make(2, 7).toSummary()).toEqual({
      appointmentId: 2, queueNumber: 7, customerName: 'Serah Morris',
      serviceName: 'Savings Account', dateTime: FUTURE, status: 'Pending'
    });
  });
  test('toJSON() stores the customer and service by id (no copies, no circular references)', () => {
    expect(JSON.parse(JSON.stringify(make(2, 7)))).toEqual({
      appointmentId: 2, customerId: 1, serviceId: 1, dateTime: FUTURE, queueNumber: 7, status: 'Pending'
    });
  });
  test('fromJSON() rebuilds a real Appointment, keeping a Completed status', () => {
    const original = make(2, 7);
    original.setStatus('Completed');
    const copy = Appointment.fromJSON(JSON.parse(JSON.stringify(original)), customer, service);
    expect(copy).toBeInstanceOf(Appointment);
    expect(copy.getStatus()).toBe('Completed');
    expect(copy.queueNumber).toBe(7);
  });
  test('fromJSON() refuses a made-up status', () => {
    const data = { ...make().toJSON(), status: 'Teleported' };
    expect(() => Appointment.fromJSON(data, customer, service)).toThrow(ValidationError);
  });
});
