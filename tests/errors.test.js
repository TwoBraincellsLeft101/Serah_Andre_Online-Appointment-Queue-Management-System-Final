// Unit tests: the error classes (inheritance reused for errors).
describe('Error classes', () => {
  test('ValidationError, BusinessRuleError and StorageError all extend AppError', () => {
    expect(new ValidationError('x', 'm')).toBeInstanceOf(AppError);
    expect(new BusinessRuleError('m')).toBeInstanceOf(AppError);
    expect(new StorageError('m')).toBeInstanceOf(AppError);
  });
  test('AppError is itself an Error, so try/catch and stack traces work as usual', () => {
    expect(new AppError('m')).toBeInstanceOf(Error);
  });
  test('each error has its own name and keeps the friendly message', () => {
    const e = new BusinessRuleError('Nope');
    expect(e.name).toBe('BusinessRuleError');
    expect(e.message).toBe('Nope');
  });
  test('ValidationError remembers which field it belongs to', () => {
    expect(new ValidationError('email', 'bad').field).toBe('email');
  });
  test('StorageError keeps the technical cause for debugging', () => {
    const cause = new Error('disk full');
    expect(new StorageError('Could not save', cause).cause).toBe(cause);
  });
  test('a plain Error is NOT an AppError (the Controller treats it as a bug)', () => {
    expect(new Error('bug') instanceof AppError).toBe(false);
  });
});
