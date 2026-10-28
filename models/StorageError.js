/**
 * StorageError.js - saving or loading data failed (storage blocked or full, damaged JSON, wrong file).
 */
class StorageError extends AppError {
  /**
   * @param {string} message  friendly text for the user
   * @param {Error} [cause]   the technical error underneath, kept for debugging
   */
  constructor(message, cause) {
    super(message);
    if (cause) this.cause = cause;
  }
}
