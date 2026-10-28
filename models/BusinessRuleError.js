/**
 * BusinessRuleError.js - the input is well-formed but the action is not allowed
 * (double booking, cancelling an appointment that is already finished, duplicate email ...).
 */
class BusinessRuleError extends AppError {}
