/**
 * Staff.js - A service agent who runs the queue.
 * Inheritance: extends Person and calls super() before adding the private #role.
 */
class Staff extends Person {
  #role;

  constructor(id, name, email, phone, role) {
    super(id, name, email, phone);
    this.#role = String(role ?? '').trim() || 'Service Agent';
  }

  get role() {
    return this.#role;
  }

  /**
   * R6: call the next waiting customer.
   * @returns {Appointment|null} the appointment now being served, or null if nobody is waiting
   */
  callNextCustomer() {
    return QueueManager.getInstance().callNext();
  }

  /**
   * R6: mark an appointment Completed or No-show.
   * @param {Appointment} appointment
   * @param {string} newStatus  "Completed" or "No-show"
   * @throws {BusinessRuleError} for any other status, or if the appointment is not being served
   */
  updateAppointmentStatus(appointment, newStatus) {
    if (!['Completed', 'No-show'].includes(newStatus)) {
      throw new BusinessRuleError('Staff can only mark an appointment Completed or No-show.');
    }
    if (appointment.getStatus() !== 'Now Serving') {
      throw new BusinessRuleError('Only the customer who is Now Serving can be marked Completed or No-show.');
    }
    appointment.setStatus(newStatus);
  }

  /** R7: @returns {Appointment[]} the whole queue (a copy) */
  viewQueue() {
    return QueueManager.getInstance().getQueueList();
  }

  /** Same data as Person plus the role (polymorphism: toJSON is overridden and calls super). */
  toJSON() {
    return { ...super.toJSON(), role: this.#role };
  }
}
