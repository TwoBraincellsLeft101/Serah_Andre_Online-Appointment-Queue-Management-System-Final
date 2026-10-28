// Unit tests: Person (base class), Customer and Staff (inheritance, encapsulation).
describe('Person / Customer / Staff', () => {
  test('Customer and Staff inherit from Person', () => {
    const c = new Customer(1, 'Serah Morris', 'serah@example.com', '5551234');
    const s = new Staff(100, 'Alex Rivera', 'alex@appointease.test', '5550100', 'Customer Service Officer');
    expect(c).toBeInstanceOf(Person);
    expect(s).toBeInstanceOf(Person);
  });
  test('constructor stores CLEANED values', () => {
    const c = new Customer(1, '  Test   User ', ' TEST@Example.com ', '555 1234');
    expect(c.getName()).toBe('Test User');
    expect(c.getContact()).toEqual({ email: 'test@example.com', phone: '5551234' });
  });
  test('constructor refuses a bad name, email, phone or id', () => {
    expect(() => new Customer(1, 'J0hn', 'a@b.com', '5551234')).toThrow(ValidationError);
    expect(() => new Customer(1, 'John', 'nope', '5551234')).toThrow(ValidationError);
    expect(() => new Customer(1, 'John', 'a@b.com', '123')).toThrow(ValidationError);
    expect(() => new Customer(0, 'John', 'a@b.com', '5551234')).toThrow(ValidationError);
    expect(() => new Customer(1.5, 'John', 'a@b.com', '5551234')).toThrow(ValidationError);
  });
  test('encapsulation: private fields cannot be read or changed from outside', () => {
    const c = new Customer(1, 'Serah Morris', 'serah@example.com', '5551234');
    expect(c.name).toBeUndefined();
    expect(c.email).toBeUndefined();
    c.email = 'hacked@evil.com';                       // creates a harmless new property, not the private one
    expect(c.getContact().email).toBe('serah@example.com');
  });
  test('getContact() returns a copy', () => {
    const c = new Customer(1, 'Serah Morris', 'serah@example.com', '5551234');
    const contact = c.getContact();
    contact.email = 'changed';
    expect(c.getContact().email).toBe('serah@example.com');
  });
  test('setContact() changes both values when both are valid', () => {
    const c = new Customer(1, 'Serah Morris', 'old@example.com', '5551234');
    c.setContact('new@example.com', '555 9999');
    expect(c.getContact()).toEqual({ email: 'new@example.com', phone: '5559999' });
  });
  test('setContact() is all-or-nothing: a bad phone leaves the email unchanged', () => {
    const c = new Customer(1, 'Serah Morris', 'old@example.com', '5551234');
    expect(() => c.setContact('new@example.com', 'bad')).toThrow(ValidationError);
    expect(c.getContact().email).toBe('old@example.com');
  });
  test('JSON.stringify() works even though the fields are private (toJSON)', () => {
    const c = new Customer(7, 'Serah Morris', 'serah@example.com', '5551234');
    expect(JSON.parse(JSON.stringify(c))).toEqual({ id: 7, name: 'Serah Morris', email: 'serah@example.com', phone: '5551234' });
  });
  test('Staff.toJSON() adds the role to the Person data', () => {
    const s = new Staff(100, 'Alex Rivera', 'alex@appointease.test', '5550100', 'Customer Service Officer');
    expect(JSON.parse(JSON.stringify(s)).role).toBe('Customer Service Officer');
  });
  test('Customer.fromJSON() rebuilds a real Customer, and refuses bad data', () => {
    const c = Customer.fromJSON({ id: 3, name: 'Mary Tari', email: 'mary@example.com', phone: '5557777' });
    expect(c).toBeInstanceOf(Customer);
    expect(c.getName()).toBe('Mary Tari');
    expect(() => Customer.fromJSON(null)).toThrow(ValidationError);
    expect(() => Customer.fromJSON({ id: 3, name: 'Mary', email: 'bad', phone: '5557777' })).toThrow(ValidationError);
  });
});
