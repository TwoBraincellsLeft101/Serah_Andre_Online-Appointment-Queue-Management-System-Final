/**
 * StorageService.js - saves the application as JSON and loads it back.
 *
 *   SAVE:  objects --JSON.stringify()--> text --> browser storage (localStorage)
 *   LOAD:  browser storage --> text --JSON.parse()--> plain data --validate--> real objects
 *
 * Why rebuild objects? JSON only carries DATA. After JSON.parse() you get plain objects
 * with no methods and no private fields (Week 9 lab: "parsed object instanceof Student is false").
 * So every saved item is turned back into a real class instance through its constructor,
 * which also runs the validation rules again. Saved text can be edited or damaged, so it is never trusted.
 *
 * The storage object is passed in (default: the browser's localStorage) so tests can use a fake one.
 */
class StorageService {
  static STORAGE_KEY = 'appointease.data';
  static FORMAT_VERSION = 1;

  #storage;

  /** @param {Storage|null} [storage]  anything with getItem / setItem / removeItem */
  constructor(storage) {
    this.#storage = storage !== undefined ? storage : StorageService.#browserStorage();
  }

  /** The browser can refuse access to localStorage (privacy settings), so reading it is guarded. */
  static #browserStorage() {
    try {
      return globalThis.localStorage ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Turn the whole application state into JSON text.
   * @param {CustomerRegistry} registry
   * @param {QueueManager} queue
   * @param {boolean} [pretty=false]  true gives indented text for people to read
   * @returns {string}
   */
  toJsonText(registry, queue, pretty = false) {
    const snapshot = {
      app: 'AppointEase',
      version: StorageService.FORMAT_VERSION,
      savedAt: new Date().toISOString(),
      registry,        // JSON.stringify calls registry.toJSON() and queue.toJSON() for us
      queue
    };
    return pretty ? JSON.stringify(snapshot, null, 2) : JSON.stringify(snapshot);
  }

  /**
   * Save to browser storage.
   * @throws {StorageError} if storage is blocked or full
   */
  save(registry, queue) {
    const text = this.toJsonText(registry, queue);
    try {
      this.#requireStorage().setItem(StorageService.STORAGE_KEY, text);
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError('Your changes could not be saved in this browser. They will be lost when the page is closed.', error);
    }
  }

  /**
   * Load from browser storage into the registry and queue.
   * @param {CustomerRegistry} registry
   * @param {QueueManager} queue
   * @param {ServiceType[]} services  the services that exist (saved appointments refer to them by id)
   * @returns {boolean} true if saved data was loaded, false if nothing was saved yet
   * @throws {StorageError} if storage is blocked or the saved data is damaged. In the damaged case a
   *         backup copy of the bad text is kept and the registry and queue are left unchanged.
   */
  load(registry, queue, services) {
    let text;
    try {
      text = this.#requireStorage().getItem(StorageService.STORAGE_KEY);
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError('Saved data could not be read in this browser.', error);
    }
    if (text === null || text === undefined) return false;

    try {
      this.restoreFromText(text, registry, queue, services);
      return true;
    } catch (error) {
      this.#keepBackup(text);
      throw error;
    }
  }

  /**
   * Replace the registry and queue with the data in a JSON text (used by load() and by "Load backup file").
   * All-or-nothing: if anything is wrong a StorageError is thrown and nothing has changed.
   * @param {string} text
   * @param {CustomerRegistry} registry
   * @param {QueueManager} queue
   * @param {ServiceType[]} services
   * @throws {StorageError}
   */
  restoreFromText(text, registry, queue, services) {
    try {
      const data = StorageService.#parse(text);

      // 1. Rebuild real Customer objects (constructors validate every field again).
      const customers = data.registry.customers.map(c => Customer.fromJSON(c));
      const customersById = new Map(customers.map(c => [c.id, c]));

      // 2. Rebuild real Appointment objects and attach each to its customer.
      const appointments = data.queue.appointments.map((a, index) => {
        if (a === null || typeof a !== 'object') throw new BusinessRuleError(`Appointment ${index + 1} is not valid.`);
        const customer = customersById.get(a.customerId);
        if (!customer) throw new BusinessRuleError(`Appointment ${index + 1} refers to a customer that does not exist.`);
        const service = services.find(s => s.serviceId === a.serviceId);
        if (!service) throw new BusinessRuleError(`Appointment ${index + 1} refers to a service that does not exist.`);
        const appointment = Appointment.fromJSON(a, customer, service);
        customer.restoreAppointment(appointment);
        return appointment;
      });

      // 3. Check everything before changing anything: a throw-away registry runs the same checks as
      //    the real one, and queue.restore() checks before it changes. Only then is the real data replaced.
      new CustomerRegistry().restore(customers, data.registry.nextId);
      queue.restore(appointments, data.queue.lastQueueNumber);
      registry.restore(customers, data.registry.nextId);

      const highestId = appointments.reduce((max, a) => Math.max(max, a.appointmentId), 0);
      Customer.restoreNextAppointmentId(highestId + 1);
    } catch (error) {
      if (error instanceof StorageError) throw error;
      if (error instanceof AppError) {
        throw new StorageError(`The saved data is not valid (${error.message})`, error);
      }
      throw error;   // a real bug: do not hide it
    }
  }

  /** Delete the saved data. */
  clear() {
    try {
      this.#requireStorage().removeItem(StorageService.STORAGE_KEY);
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError('The saved data could not be cleared.', error);
    }
  }

  // ---------------- private helpers ----------------

  #requireStorage() {
    if (!this.#storage) throw new StorageError('This browser does not allow saving data, so changes will be lost when the page is closed.');
    return this.#storage;
  }

  /** Keep a copy of damaged text so it is not lost when new data is saved over it. */
  #keepBackup(text) {
    try {
      this.#storage.setItem(`${StorageService.STORAGE_KEY}.backup`, text);
    } catch {
      // Nothing more can be done; the original is still there until the next save.
    }
  }

  /**
   * JSON.parse() inside try/catch (malformed text throws), then check the shape of the result.
   * @returns {object} the parsed data, known to have the expected structure
   * @throws {StorageError}
   */
  static #parse(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new StorageError('The saved data is not valid JSON, so it could not be read.', error);
    }
    const isObject = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
    if (!isObject(data) || data.app !== 'AppointEase') {
      throw new StorageError('The data is not an AppointEase file.');
    }
    if (data.version !== StorageService.FORMAT_VERSION) {
      throw new StorageError(`This data uses version ${data.version}, which this app cannot read.`);
    }
    if (!isObject(data.registry) || !Array.isArray(data.registry.customers) ||
        !isObject(data.queue) || !Array.isArray(data.queue.appointments)) {
      throw new StorageError('The saved data is missing parts, so it could not be read.');
    }
    return data;
  }
}
