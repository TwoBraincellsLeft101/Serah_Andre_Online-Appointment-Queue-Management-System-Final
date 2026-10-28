// Unit tests: Validator (Regular Expressions) - normal, boundary and invalid cases.
describe('Validator.validateName', () => {
  test('accepts normal names', () => {
    ['Serah Morris', 'Mary-Jane', "O'Neil", 'José'].forEach(n => expect(Validator.validateName(n)).toBe(n));
  });
  test('boundary: 2 letters and 50 letters are accepted', () => {
    expect(Validator.validateName('Al')).toBe('Al');
    expect(Validator.validateName('A'.repeat(50))).toHaveLength(50);
  });
  test('boundary: 1 letter and 51 letters are rejected', () => {
    expect(() => Validator.validateName('A')).toThrow(ValidationError);
    expect(() => Validator.validateName('A'.repeat(51))).toThrow(ValidationError);
  });
  test('rejects digits, symbols, HTML and a leading hyphen', () => {
    ['John3', '<b>x</b>', '<img src=x onerror=alert(1)>', '-Ann', 'Ann-'].forEach(n =>
      expect(() => Validator.validateName(n)).toThrow(ValidationError));
  });
  test('rejects empty, blank, null and undefined', () => {
    ['', '   ', null, undefined].forEach(n => expect(() => Validator.validateName(n)).toThrow(ValidationError));
  });
  test('tidies extra spaces', () => {
    expect(Validator.validateName('  Serah    Morris ')).toBe('Serah Morris');
  });
  test('the error names the field', () => {
    try { Validator.validateName(''); } catch (error) { expect(error.field).toBe('name'); }
  });
});

describe('Validator.validateEmail', () => {
  test('accepts normal addresses', () => {
    ['serah@example.com', 'a.b+c@mail.co.vu', 'x@y.vu'].forEach(e => expect(Validator.validateEmail(e)).toBe(e));
  });
  test('rejects missing parts, spaces and double dots', () => {
    ['serah@', 'serah@example', 'a b@x.com', '@x.com', 'a@x..com', 'plain', ''].forEach(e =>
      expect(() => Validator.validateEmail(e)).toThrow(ValidationError));
  });
  test('is trimmed and lower-cased', () => {
    expect(Validator.validateEmail('  Serah@Example.COM ')).toBe('serah@example.com');
  });
  test('boundary: longer than 254 characters is rejected', () => {
    expect(() => Validator.validateEmail('a'.repeat(250) + '@x.com')).toThrow(ValidationError);
  });
});

describe('Validator.validatePhone', () => {
  test('accepts 7 digits with or without spaces, hyphens or +678', () => {
    ['5551234', '555 1234', '555-1234', '+678 555 1234'].forEach(p => expect(Validator.validatePhone(p)).toBe('5551234'));
  });
  test('boundary: 6 digits rejected, 7 accepted, 8 rejected', () => {
    expect(() => Validator.validatePhone('555123')).toThrow(ValidationError);
    expect(Validator.validatePhone('5551234')).toBe('5551234');
    expect(() => Validator.validatePhone('55512345')).toThrow(ValidationError);
  });
  test('rejects letters, another country code and empty', () => {
    ['555A234', '+679 5551234', 'abcdefg', ''].forEach(p => expect(() => Validator.validatePhone(p)).toThrow(ValidationError));
  });
});

describe('Validator.validateDateTime', () => {
  test('accepts real dates, including a leap day', () => {
    ['2099-12-31T23:59', '2099-02-28T10:00', '2096-02-29T09:00'].forEach(d => expect(Validator.validateDateTime(d)).toBe(d));
  });
  test('rejects impossible dates and times (31 February, month 13, hour 25, 29 Feb in a non-leap year)', () => {
    ['2099-02-31T10:00', '2099-13-01T10:00', '2099-11-02T25:00', '2099-02-29T09:00'].forEach(d =>
      expect(() => Validator.validateDateTime(d)).toThrow(ValidationError));
  });
  test('rejects the wrong format and empty', () => {
    ['2099-11-02', '02/11/2099 09:30', 'garbage', ''].forEach(d => expect(() => Validator.validateDateTime(d)).toThrow(ValidationError));
  });
});

describe('Validator.validateFutureDateTime', () => {
  const now = new Date('2026-10-21T10:00:30');   // a fixed "now", so the result is the same every day
  test('boundary: the current minute is accepted', () => {
    expect(Validator.validateFutureDateTime('2026-10-21T10:00', now)).toBe('2026-10-21T10:00');
  });
  test('boundary: one minute earlier is rejected', () => {
    expect(() => Validator.validateFutureDateTime('2026-10-21T09:59', now)).toThrow(ValidationError, 'passed');
  });
  test('a later time is accepted and an old date is rejected', () => {
    expect(Validator.validateFutureDateTime('2026-10-21T10:01', now)).toBe('2026-10-21T10:01');
    expect(() => Validator.validateFutureDateTime('2020-01-01T09:00', now)).toThrow(ValidationError);
  });
});

describe('Validator.validate (entry point used by the Controller)', () => {
  test('chooses the rule by field kind and returns the cleaned value', () => {
    expect(Validator.validate('phone', '555 1234')).toBe('5551234');
    expect(Validator.validate('email', ' A@B.com ')).toBe('a@b.com');
  });
  test('an unknown kind is a programming mistake (plain Error, not AppError)', () => {
    expect(() => Validator.validate('colour', 'red')).toThrow(Error, 'Unknown field type');
    expect(() => Validator.validate('colour', 'red')).not.toThrow(AppError);
  });
});
