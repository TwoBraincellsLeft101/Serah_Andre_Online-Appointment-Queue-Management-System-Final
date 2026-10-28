/**
 * ValidationError.js - the user typed something that breaks a format rule
 * (for example an email without "@"). Carries the name of the field so a message can be
 * shown next to the right input.
 */
class ValidationError extends AppError {
  /**
   * @param {string} field    which input the problem belongs to, e.g. "email"
   * @param {string} message  friendly explanation shown to the user
   */
  constructor(field, message) {
    super(message);
    this.field = field;
  }
}
