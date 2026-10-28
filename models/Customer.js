/**
 * Customer.js - A member of the public who books appointments.
 * Inheritance: extends Person and calls super() to set up the shared identity fields.
 */
class Customer extends Person {
  #appointments = [];   // private: changed only through bookAppointment / cancelAppointment / restoreAppointment
  static #nextAppointmentId = 1;

  constructor(id, name, email, phone) {
    super(id, name, email, phone);
  }

  /**
   * R2 + R3: book an appointment and receive a queue number.
   * All the rules live here (Model), not in the Controller. They run BEFORE a queue number is
   * requested, so a refused booking never uses up a number.
   * @param {ServiceType} serviceType
   * @param {string} dateTime
   * @returns {Appointment} the new, confirmed appointment
   * @throws {ValidationError} if no service is chosen, or the date/time is not a real future date and time
   * @throws {BusinessRuleError} if this customer already has that time booked
   */
  bookAppointment(serviceType, dateTime) {
    if (!(serviceType instanceof ServiceType)) throw new ValidationError('service', 'Please choose a service.');
    Validator.validateFutureDateTime(dateTime);          // no booking in the past

    const clash = this.#appointments.some(a => a.isActive() && a.dateTime === dateTime);
    if (clash) throw new BusinessRuleError('You already have an appointment at that date and time.');

    const queue = QueueManager.getInstance();           // Singleton: the one shared queue
    const appointment = new Appointment(
      Customer.#nextAppointmentId,
      this,
      serviceType,
      dateTime,
      queue.generateQueueNumber()
    );
    Customer.#nextAppointmentId += 1;

    appointment.setStatus('Confirmed');                 // auto-confirmed in this prototype
    this.#appointments.push(appointment);
    queue.addToQueue(appointment);
    return appointment;
  }

  /**
   * R5: cancel one of this customer's upcoming appointments.
   * @param {number} appointmentId
   * @returns {Appointment} the cancelled appointment
   * @throws {BusinessRuleError} if it is not found or can no longer be cancelled
   */
  cancelAppointment(appointmentId) {
    const appointment = this.#appointments.find(a => a.appointmentId === appointmentId);
    if (!appointment) throw new BusinessRuleError('That appointment could not be found.');
    appointment.cancel();
    return appointment;
  }

  /**
   * R4: current status of every appointment this customer has.
   * @returns {object[]} summaries (see Appointment.toSummary)
   */
  viewStatus() {
    return this.#appointments.map(a => a.toSummary());
  }

  /** @returns {Appointment[]} a copy of this customer's appointments */
  getAppointments() {
    return [...this.#appointments];
  }

  /**
   * Put an already-existing appointment back on this customer when saved data is loaded.
   * Used only by StorageService; new bookings must go through bookAppointment().
   * @param {Appointment} appointment
   * @throws {BusinessRuleError} if it belongs to someone else or is already listed
   */
  restoreAppointment(appointment) {
    if (appointment.customer !== this) throw new BusinessRuleError('That appointment belongs to a different customer.');
    if (this.#appointments.some(a => a.appointmentId === appointment.appointmentId)) {
      throw new BusinessRuleError('That appointment is already listed for this customer.');
    }
    this.#appointments.push(appointment);
  }

  /**
   * After loading saved data, make sure new appointments get ids that are not used yet.
   * @param {number} nextId
   */
  static restoreNextAppointmentId(nextId) {
    if (Number.isInteger(nextId) && nextId > Customer.#nextAppointmentId) Customer.#nextAppointmentId = nextId;
  }

  /**
   * Rebuild a Customer from saved JSON data (see Person.toJSON). Appointments are not stored here;
   * they come back from the queue's list and are re-attached with restoreAppointment().
   * @param {{id:number, name:string, email:string, phone:string}} data
   * @returns {Customer}
   * @throws {ValidationError} if any value is invalid
   */
  static fromJSON(data) {
    if (data === null || typeof data !== 'object') throw new ValidationError('customer', 'A saved customer is not valid.');
    return new Customer(data.id, data.name, data.email, data.phone);
  }
}
