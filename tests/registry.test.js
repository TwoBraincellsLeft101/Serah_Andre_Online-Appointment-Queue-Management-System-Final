// Unit tests: CustomerRegistry (registration rules + JSON).
describe('CustomerRegistry', () => {
  let registry;
  beforeEach(() => { registry = new CustomerRegistry(); });

  test('register() creates customers with ids 1, 2, ...', () => {
    const a = registry.register('Serah Morris', 'serah@example.com', '5551234');
    const b = registry.register('Andre B', 'andre@example.com', '5559999');
    expect([a.id, b.id]).toEqual([1, 2]);
    expect(a).toBeInstanceOf(Customer);
  });
  test('register() refuses a duplicate email, whatever the capital letters', () => {
    registry.register('Serah Morris', 'serah@example.com', '5551234');
    expect(() => registry.register('Other Person', 'SERAH@Example.com', '5550000')).toThrow(BusinessRuleError, 'already exists');
  });
  test('register() passes validation errors on', () => {
    expect(() => registry.register('', 'a@b.com', '5551234')).toThrow(ValidationError);
    expect(() => registry.register('Ann', 'bad', '5551234')).toThrow(ValidationError);
    expect(() => registry.register('Ann', 'a@b.com', '1')).toThrow(ValidationError);
  });
  test('a failed registration does not use up a customer id', () => {
    registry.register('Serah Morris', 'serah@example.com', '5551234');
    expect(() => registry.register('Serah Again', 'serah@example.com', '5551234')).toThrow(BusinessRuleError);
    expect(registry.register('Andre B', 'andre@example.com', '5559999').id).toBe(2);
  });
  test('findByEmail() ignores capitals and spaces; unknown email gives undefined', () => {
    const a = registry.register('Serah Morris', 'serah@example.com', '5551234');
    expect(registry.findByEmail('  SERAH@example.com ')).toBe(a);
    expect(registry.findByEmail('nobody@example.com')).toBeUndefined();
  });
  test('findById() and getAll() (a copy)', () => {
    const a = registry.register('Serah Morris', 'serah@example.com', '5551234');
    expect(registry.findById(1)).toBe(a);
    registry.getAll().length = 0;
    expect(registry.getAll()).toHaveLength(1);
  });
  test('clear() removes everyone and numbering restarts', () => {
    registry.register('Serah Morris', 'serah@example.com', '5551234');
    registry.clear();
    expect(registry.getAll()).toHaveLength(0);
    expect(registry.register('Andre B', 'andre@example.com', '5559999').id).toBe(1);
  });
  test('toJSON() holds the next id and the customers', () => {
    registry.register('Serah Morris', 'serah@example.com', '5551234');
    const data = JSON.parse(JSON.stringify(registry));
    expect(data.nextId).toBe(2);
    expect(data.customers[0].email).toBe('serah@example.com');
  });
  test('restore() replaces the customers and carries on numbering', () => {
    const c = Customer.fromJSON({ id: 4, name: 'Mary Tari', email: 'mary@example.com', phone: '5557777' });
    registry.restore([c], 5);
    expect(registry.findById(4)).toBe(c);
    expect(registry.register('Andre B', 'andre@example.com', '5559999').id).toBe(5);
  });
  test('restore() refuses duplicate emails, duplicate ids and a too-small next id', () => {
    const a = Customer.fromJSON({ id: 1, name: 'Mary Tari', email: 'mary@example.com', phone: '5557777' });
    const b = Customer.fromJSON({ id: 2, name: 'Mary Two', email: 'mary@example.com', phone: '5557778' });
    const c = Customer.fromJSON({ id: 1, name: 'Other Per', email: 'other@example.com', phone: '5557779' });
    expect(() => registry.restore([a, b], 3)).toThrow(BusinessRuleError, 'twice');
    expect(() => registry.restore([a, c], 3)).toThrow(BusinessRuleError, 'twice');
    expect(() => registry.restore([a], 1)).toThrow(BusinessRuleError, 'numbering');
  });
  test('a refused restore leaves the current customers untouched', () => {
    const existing = registry.register('Serah Morris', 'serah@example.com', '5551234');
    const a = Customer.fromJSON({ id: 1, name: 'Mary Tari', email: 'mary@example.com', phone: '5557777' });
    expect(() => registry.restore([a, a], 3)).toThrow(BusinessRuleError);
    expect(registry.getAll()).toEqual([existing]);
  });
});
