/**
 * AppError.js - base class for every EXPECTED problem in AppointEase.
 *
 * Inheritance: Error -> AppError -> ValidationError / BusinessRuleError / StorageError.
 * The message of an AppError is always written for the user in plain English, so the
 * Controller can show it as it is. Any error that is NOT an AppError is a program bug:
 * the Controller logs it and shows a general "something went wrong" message instead.
 */
class AppError extends Error {
  /** @param {string} message  friendly text for the user */
  constructor(message) {
    super(message);
    this.name = this.constructor.name;   // "ValidationError", "StorageError", ...
  }
}
