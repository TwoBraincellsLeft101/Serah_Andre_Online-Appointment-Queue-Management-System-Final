/**
 * Person.js - Base class for everyone in the system (Customer and Staff extend it).
 *
 * Demonstrates: constructor, private fields (#), getters, controlled setter.
 * The identity fields are private, so no other code can change them directly, and every
 * value is checked by the Validator before it is stored, so a Person can never hold bad data.
 */
class Person {
  #id;
  #name;
  #email;
  #phone;

  /**
   * @param {number} id     unique id
   * @param {string} name   full name
   * @param {string} email  email address
   * @param {string} phone  7-digit phone number
   * @throws {ValidationError} if the name, email or phone breaks a rule (see Validator)
   */
  constructor(id, name, email, phone) {
    if (!Number.isInteger(id) || id < 1) throw new ValidationError('id', 'A person needs a whole-number id of 1 or more.');
    this.#id = id;
    this.#name = Validator.validateName(name);
    this.#email = Validator.validateEmail(email);
    this.#phone = Validator.validatePhone(phone);
  }

  get id() {
    return this.#id;
  }

  /** @returns {string} the person's name */
  getName() {
    return this.#name;
  }

  /** @returns {{email: string, phone: string}} a copy of the contact details */
  getContact() {
    return { email: this.#email, phone: this.#phone };
  }

  /**
   * Controlled way to change contact details (no direct assignment possible).
   * Both values are checked before anything is stored (all-or-nothing).
   * @param {string} email
   * @param {string} phone
   * @throws {ValidationError}
   */
  setContact(email, phone) {
    const newEmail = Validator.validateEmail(email);
    const newPhone = Validator.validatePhone(phone);
    this.#email = newEmail;
    this.#phone = newPhone;
  }

  /**
   * JSON.stringify() cannot see #private fields, so each class describes its own data here and
   * JSON.stringify() calls this method automatically.
   * @returns {{id:number, name:string, email:string, phone:string}}
   */
  toJSON() {
    return { id: this.#id, name: this.#name, email: this.#email, phone: this.#phone };
  }

  toString() {
    return `${this.#name} (${this.#email})`;
  }
}
