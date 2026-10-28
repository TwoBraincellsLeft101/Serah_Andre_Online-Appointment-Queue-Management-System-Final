/**
 * Appointment.js - One booking. Holds its own status life-cycle.
 *
 * Encapsulation: #status can only change through setStatus(), which only accepts
 * a value from STATUSES, so an appointment can never end up with a misspelled status.
 */
class Appointment {
  static STATUSES = ['Pending', 'Confirmed', 'Now Serving', 'Completed', 'Cancelled', 'No-show'];
  /** Once an appointment reaches one of these it is finished and cannot change again. */
  static FINAL_STATUSES = ['Completed', 'Cancelled', 'No-show'];

  #appointmentId;
  #customer;
  #serviceType;
  #dateTime;
  #status;
  #queueNumber;

  /**
   * @param {number} appointmentId  whole number, 1 or more
   * @param {Person} customer       the Customer who booked
   * @param {ServiceType} serviceType
   * @param {string} dateTime       e.g. "2026-11-02T09:30"
   * @param {number} queueNumber    whole number, 1 or more, issued by QueueManager
   * @throws {ValidationError} if any value is invalid
   */
  constructor(appointmentId, customer, serviceType, dateTime, queueNumber) {
    if (!Number.isInteger(appointmentId) || appointmentId < 1) throw new ValidationError('appointment', 'Invalid appointment id.');
    if (!Number.isInteger(queueNumber) || queueNumber < 1) throw new ValidationError('appointment', 'Invalid queue number.');
    if (!(customer instanceof Person)) throw new ValidationError('appointment', 'An appointment needs a customer.');
    if (!(serviceType instanceof ServiceType)) throw new ValidationError('service', 'Please choose a service.');
    Validator.validateDateTime(dateTime);   // format + real calendar date

    this.#appointmentId = appointmentId;
    this.#customer = customer;
    this.#serviceType = serviceType;
    this.#dateTime = dateTime;
    this.#queueNumber = queueNumber;
    this.#status = 'Pending';
  }

  get appointmentId() { return this.#appointmentId; }
  get customer() { return this.#customer; }
  get serviceType() { return this.#serviceType; }
  get dateTime() { return this.#dateTime; }
  get queueNumber() { return this.#queueNumber; }

  /** @returns {string} current status */
  getStatus() {
    return this.#status;
  }

  /**
   * Change the status. Validates the new value and the life-cycle rule.
   * @param {string} newStatus  one of Appointment.STATUSES
   * @throws {ValidationError} if the value is not a known status
   * @throws {BusinessRuleError} if the appointment is already finished
   */
  setStatus(newStatus) {
    if (!Appointment.STATUSES.includes(newStatus)) {
      throw new ValidationError('status', `"${newStatus}" is not a valid status.`);
    }
    if (Appointment.FINAL_STATUSES.includes(this.#status)) {
      throw new BusinessRuleError(`This appointment is already ${this.#status} and cannot be changed.`);
    }
    this.#status = newStatus;
  }

  /** @returns {boolean} true while the customer is still waiting to be called */
  isWaiting() {
    return this.#status === 'Pending' || this.#status === 'Confirmed';
  }

  /** @returns {boolean} true if the appointment is not finished yet (waiting or being served) */
  isActive() {
    return !Appointment.FINAL_STATUSES.includes(this.#status);
  }

  /**
   * Cancel this appointment. Only allowed while the customer is still waiting.
   * @throws {BusinessRuleError} if the customer is already being served or finished
   */
  cancel() {
    if (!this.isWaiting()) {
      throw new BusinessRuleError(`An appointment that is "${this.#status}" can no longer be cancelled.`);
    }
    this.#status = 'Cancelled';
  }

  /** @returns {object} a plain summary the View can display */
  toSummary() {
    return {
      appointmentId: this.#appointmentId,
      queueNumber: this.#queueNumber,
      customerName: this.#customer.getName(),
      serviceName: this.#serviceType.serviceName,
      dateTime: this.#dateTime,
      status: this.#status
    };
  }

  /**
   * Data for JSON. The customer and service are stored by id (not copied inside) so the saved
   * file has no circular references and each customer is stored only once.
   */
  toJSON() {
    return {
      appointmentId: this.#appointmentId,
      customerId: this.#customer.id,
      serviceId: this.#serviceType.serviceId,
      dateTime: this.#dateTime,
      queueNumber: this.#queueNumber,
      status: this.#status
    };
  }

  /**
   * Rebuild an Appointment from saved JSON data (JSON only carries data, not methods or the
   * private fields, so a real object has to be created again).
   * It goes through the normal constructor, so every validation rule runs again.
   * The status is set directly because a saved "Completed" appointment must come back as
   * "Completed", not walk through the whole life-cycle.
   * @param {object} data           one entry from the saved file
   * @param {Person} customer       the already-rebuilt customer with id data.customerId
   * @param {ServiceType} serviceType  the service with id data.serviceId
   * @returns {Appointment}
   */
  static fromJSON(data, customer, serviceType) {
    const appointment = new Appointment(data.appointmentId, customer, serviceType, data.dateTime, data.queueNumber);
    if (!Appointment.STATUSES.includes(data.status)) {
      throw new ValidationError('status', `"${data.status}" is not a valid status.`);
    }
    appointment.#status = data.status;
    return appointment;
  }
}
