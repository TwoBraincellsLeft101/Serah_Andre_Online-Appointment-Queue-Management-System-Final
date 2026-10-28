/**
 * CustomerRegistry.js - Keeps every registered Customer for the session.
 * Rule enforced here (Model, not Controller): each email can register only once.
 */
class CustomerRegistry {
  #customers = [];
  #nextId = 1;

  /**
   * R1: register a new customer.
   * @returns {Customer}
   * @throws {ValidationError} if the name, email or phone breaks a rule
   * @throws {BusinessRuleError} if the email is already registered
   */
  register(name, email, phone) {
    const customer = new Customer(this.#nextId, name, email, phone); // validates the fields
    if (this.findByEmail(customer.getContact().email)) {
      throw new BusinessRuleError('An account with that email already exists. Use "Look up" to see your appointments.');
    }
    this.#nextId += 1;           // only used up when registration succeeds
    this.#customers.push(customer);
    return customer;
  }

  /** @returns {Customer|undefined} the customer with this email (not case-sensitive) */
  findByEmail(email) {
    const wanted = String(email ?? '').trim().toLowerCase();
    return this.#customers.find(c => c.getContact().email === wanted);
  }

  /** @returns {Customer|undefined} the customer with this id */
  findById(id) {
    return this.#customers.find(c => c.id === id);
  }

  /** @returns {Customer[]} a copy of the list of customers */
  getAll() {
    return [...this.#customers];
  }

  /** Remove everyone (demo reset). */
  clear() {
    this.#customers = [];
    this.#nextId = 1;
  }

  /** @returns {{nextId:number, customers:object[]}} data for JSON */
  toJSON() {
    return { nextId: this.#nextId, customers: this.#customers.map(c => c.toJSON()) };
  }

  /**
   * Replace everyone with customers rebuilt from saved data. All-or-nothing: if anything is wrong
   * an error is thrown and the current customers are left untouched.
   * @param {Customer[]} customers
   * @param {number} nextId  the id the next new customer will get
   * @throws {BusinessRuleError} on duplicate emails or ids, or a nextId that is too small
   */
  restore(customers, nextId) {
    const emails = new Set();
    const ids = new Set();
    for (const customer of customers) {
      const email = customer.getContact().email;
      if (emails.has(email)) throw new BusinessRuleError(`The email ${email} appears twice.`);
      if (ids.has(customer.id)) throw new BusinessRuleError(`Customer id ${customer.id} appears twice.`);
      emails.add(email);
      ids.add(customer.id);
    }
    const highest = customers.reduce((max, c) => Math.max(max, c.id), 0);
    if (!Number.isInteger(nextId) || nextId <= highest) {
      throw new BusinessRuleError('The saved customer numbering does not match the customers.');
    }
    this.#customers = [...customers];
    this.#nextId = nextId;
  }
}
