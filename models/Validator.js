/**
 * Validator.js - every validation rule and Regular Expression in the application, in ONE place.
 *
 * Method used (Week 7): start from a plain-English requirement, then write the pattern.
 * Each validateXxx() method CLEANS the value (trim, remove spaces...) and then either
 *   - returns the cleaned value, or
 *   - throws a ValidationError with a friendly message.
 *
 * Who calls it:
 *   - the Model classes (Person, Appointment, Customer) so an object can never hold bad data, and
 *   - the Controller, so the user sees a message beside the field before anything is submitted.
 * The rule itself lives only here, so it is never copied.
 */
class Validator {
  // ---------------------------------------------------------------
  // Patterns (named by what they check, as taught in Week 7)
  // ---------------------------------------------------------------

  /**
   * NAME - 2 to 50 characters. Letters from any language (\p{L} needs the "u" flag, so
   * names like José or Hélène work), spaces, hyphens and apostrophes. Must start and end with a letter.
   * Valid: Serah Morris, Mary-Jane, O'Neil   Invalid: John3, A, <b>
   */
  static namePattern = /^\p{L}[\p{L} '\-]{0,48}\p{L}$/u;

  /**
   * EMAIL - simple classroom rule: something@something.something, no spaces and one @.
   * Extra checks (no "..", max length) are separate small steps, see validateEmail().
   * Valid: serah@example.com   Invalid: serah@, serah@example, a b@x.com
   */
  static emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /**
   * PHONE (Vanuatu local number) - exactly 7 digits, after spaces and hyphens are removed.
   * Valid: 5551234, 555 1234, 555-1234   Invalid: 55512, 55512345, 555A234
   */
  static phonePattern = /^[0-9]{7}$/;

  /** Optional country code removed before checking the phone: +678 */
  static countryCodePattern = /^\+678/;

  /**
   * DATE AND TIME as the browser date picker gives it: YYYY-MM-DDTHH:MM
   * Valid: 2026-11-02T09:30   Invalid: 2026-11-02, 02/11/2026 09:30
   */
  static dateTimePattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

  // ---------------------------------------------------------------
  // Validation methods
  // ---------------------------------------------------------------

  /** @returns {string} the cleaned name @throws {ValidationError} */
  static validateName(value) {
    const name = String(value ?? '').trim().replace(/\s+/g, ' ');   // tidy extra spaces
    if (name === '') throw new ValidationError('name', 'Please enter your full name.');
    if (!Validator.namePattern.test(name)) {
      throw new ValidationError('name',
        'Use 2–50 letters (spaces, - and \' are allowed).');
    }
    return name;
  }

  /** @returns {string} the cleaned (lower-case) email @throws {ValidationError} */
  static validateEmail(value) {
    const email = String(value ?? '').trim().toLowerCase();
    if (email === '') throw new ValidationError('email', 'Please enter your email address.');
    if (!Validator.emailPattern.test(email) || email.includes('..') || email.length > 254) {
      throw new ValidationError('email', 'Enter a valid email, e.g. name@example.com.');
    }
    return email;
  }

  /** @returns {string} the 7 digits only (e.g. "5551234") @throws {ValidationError} */
  static validatePhone(value) {
    const raw = String(value ?? '').trim();
    if (raw === '') throw new ValidationError('phone', 'Please enter your phone number.');
    // Clean first: remove spaces/hyphens and an optional +678, then check what is left.
    const digits = raw.replace(/[\s-]/g, '').replace(Validator.countryCodePattern, '');
    if (!Validator.phonePattern.test(digits)) {
      throw new ValidationError('phone', 'Phone must be 7 digits, e.g. 555 1234.');
    }
    return digits;
  }

  /**
   * Format check plus a real-calendar check. Regex alone cannot catch 31 February
   * (JavaScript would quietly turn it into 3 March), so ordinary logic finishes the job.
   * @returns {string} the same value, now known to be a real date and time
   * @throws {ValidationError}
   */
  static validateDateTime(value) {
    const text = String(value ?? '').trim();
    if (text === '') throw new ValidationError('dateTime', 'Please choose a date and time.');

    const parts = Validator.dateTimePattern.exec(text);          // exec() gives us the pieces
    const problem = new ValidationError('dateTime', 'Please choose a real date and time.');
    if (!parts) throw problem;

    const [, year, month, day, hour, minute] = parts.map(Number);
    const date = new Date(year, month - 1, day, hour, minute);
    const isRealDate = date.getFullYear() === year && date.getMonth() === month - 1 &&
                       date.getDate() === day && date.getHours() === hour && date.getMinutes() === minute;
    if (!isRealDate) throw problem;
    return text;
  }

  /**
   * Same as validateDateTime() and also refuses a time that has already passed.
   * The current minute is still allowed (the date picker only has minute accuracy).
   * @param {string} value
   * @param {Date} [now]  injectable so tests can use a fixed "now"
   */
  static validateFutureDateTime(value, now = new Date()) {
    const text = Validator.validateDateTime(value);
    const startOfThisMinute = new Date(now);
    startOfThisMinute.setSeconds(0, 0);
    if (new Date(text) < startOfThisMinute) {
      throw new ValidationError('dateTime', 'That time has passed. Choose a future time.');
    }
    return text;
  }

  /**
   * One entry point for the Controller: validate a value by the kind of field it came from.
   * @param {"name"|"email"|"phone"|"dateTime"|"futureDateTime"} kind
   * @returns {string} the cleaned value
   */
  static validate(kind, value) {
    switch (kind) {
      case 'name': return Validator.validateName(value);
      case 'email': return Validator.validateEmail(value);
      case 'phone': return Validator.validatePhone(value);
      case 'dateTime': return Validator.validateDateTime(value);
      case 'futureDateTime': return Validator.validateFutureDateTime(value);
      default: throw new Error(`Unknown field type: ${kind}`);
    }
  }
}
