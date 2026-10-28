/**
 * ServiceType.js - A banking service a customer can book an appointment for (e.g. "Savings Account" or "Home Mortgage").
 */
class ServiceType {
  #serviceId;
  #serviceName;
  #estimatedDuration; // minutes

  /**
   * @param {number} serviceId
   * @param {string} serviceName
   * @param {number} estimatedDuration  minutes
   */
  constructor(serviceId, serviceName, estimatedDuration) {
    if (!String(serviceName ?? '').trim()) throw new Error('A service needs a name.');
    if (!(estimatedDuration > 0)) throw new Error('Duration must be more than 0 minutes.');
    this.#serviceId = serviceId;
    this.#serviceName = serviceName;
    this.#estimatedDuration = estimatedDuration;
  }

  get serviceId() { return this.#serviceId; }
  get serviceName() { return this.#serviceName; }
  get estimatedDuration() { return this.#estimatedDuration; }

  /** @returns {{serviceId: number, serviceName: string, estimatedDuration: number}} (also used by JSON.stringify) */
  toJSON() {
    return this.getDetails();
  }

  /** @returns {{serviceId: number, serviceName: string, estimatedDuration: number}} */
  getDetails() {
    return {
      serviceId: this.#serviceId,
      serviceName: this.#serviceName,
      estimatedDuration: this.#estimatedDuration
    };
  }
}
