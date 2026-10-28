/**
 * AppController.js - CONTROLLER (MVC)
 *
 * The coordinator. It never touches the page (the View does that) and holds no business
 * rules (the Model does that). Every user action follows the same flow:
 *
 *   View event -> Controller handler -> Validator / Model method -> save -> View shows the result
 *
 * Input validation (Week 7): the Controller checks the fields first so the user sees every
 * mistake beside the right field at once. The Model then checks again, because an object must
 * protect its own data even if something other than this page is using it.
 *
 * Error handling: every handler runs inside #run(). An AppError (ValidationError,
 * BusinessRuleError, StorageError) carries a friendly message that is shown to the user. Anything
 * else is a program bug: it is logged for the developer and the user sees a general message.
 *
 * Saving: after every change the whole state is saved as JSON (StorageService), and loaded again
 * when the page starts.
 */
class AppController {
  #viewedEmail = '';        // whose appointments are shown in "My appointments"
  #searchText = '';         // what is typed in the queue search box
  #saveWarningShown = false;

  /**
   * @param {CustomerRegistry} registry   Model: all customers
   * @param {QueueManager} queue          Model: the Singleton queue
   * @param {Staff} staff                 Model: the staff member using the desk
   * @param {Array} serviceMenu           Model: the services on offer, grouped in sections and subsections
   * @param {AppView} view                View
   * @param {StorageService} storage      saves and loads the data as JSON
   */
  constructor(registry, queue, staff, serviceMenu, view, storage) {
    this.registry = registry;
    this.queue = queue;
    this.staff = staff;
    this.serviceMenu = serviceMenu;
    // One flat list of every ServiceType, for finding a service by id and for loading saved data.
    this.services = serviceMenu.flatMap(section => section.groups.flatMap(group => group.services));
    this.view = view;
    this.storage = storage;

    // Register callbacks. Both styles are used on purpose:
    //  - a named handler made with .bind(this) so "this" still means the Controller
    //  - a short arrow function that calls the handler
    this.view.bindRegister(this.handleRegister.bind(this));
    this.view.bindBook((data) => this.handleBook(data));
    this.view.bindLookup((email) => this.handleLookup(email));
    this.view.bindCancel((appointmentId) => this.handleCancel(appointmentId));
    this.view.bindCallNext(() => this.handleCallNext());
    this.view.bindStatusChange((appointmentId, status) => this.handleUpdateStatus(appointmentId, status));
    this.view.bindSearch((text) => this.handleSearch(text));
    this.view.bindReset(() => this.handleReset());
    this.view.bindDownload(() => this.handleDownload());
    this.view.bindImport((text) => this.handleImport(text));
    this.view.bindFieldValidation(this.handleFieldCheck.bind(this));

    // First draw of the page
    this.view.setStaff(this.staff.getName(), this.staff.role);
    this.view.renderServices(this.serviceMenu);
    this.view.setMinDateTime();
    this.#loadSavedData();
    this.refreshView();
  }

  // ---------------- handlers (one per user action) ----------------

  /** R1 – register a new customer. */
  handleRegister(data) {
    this.#run(() => {
      const fieldsAreValid = this.#checkFields([
        ['reg-name', 'name', data.name],
        ['reg-email', 'email', data.email],
        ['reg-phone', 'phone', data.phone]
      ]);
      if (!fieldsAreValid) return;

      const customer = this.registry.register(data.name, data.email, data.phone);
      const { email } = customer.getContact();

      this.#viewedEmail = email;
      this.view.clearRegisterForm();
      this.view.setEmail(email);
      this.view.showMessage(`Welcome, ${customer.getName()}! Your account is ready. You can book an appointment now.`, 'success');
      this.#changed();
    });
  }

  /** R2 + R3 – book an appointment and receive a queue number. */
  handleBook(data) {
    this.#run(() => {
      const fieldsAreValid = this.#checkFields([
        ['book-email', 'email', data.email],
        ['book-datetime', 'futureDateTime', data.dateTime]
      ]);
      // The dropdown only needs a choice (no regex), so it is checked here.
      if (!data.serviceId) {
        this.view.showFieldError('book-service', 'Please choose a service.');
        if (fieldsAreValid) this.view.focusField('book-service');
        this.view.showMessage('Please fix the highlighted fields.', 'error');
        return;
      }
      if (!fieldsAreValid) return;

      const customer = this.registry.findByEmail(data.email);
      if (!customer) throw new BusinessRuleError('No account found for that email. Please create an account first.');

      const service = this.services.find(s => String(s.serviceId) === data.serviceId);
      const appointment = customer.bookAppointment(service, data.dateTime);   // Model applies the rules

      const { email } = customer.getContact();
      this.#viewedEmail = email;
      this.view.clearBookForm(email);
      this.view.setEmail(email);
      this.view.showMessage(`Booked! Your queue number is #${appointment.queueNumber}.`, 'success');
      this.#changed();
    });
  }

  /** R4 – show a customer's appointments and their status. */
  handleLookup(email) {
    this.#run(() => {
      if (!this.#checkFields([['lookup-email', 'email', email]])) return;
      this.#viewedEmail = String(email).trim().toLowerCase();
      this.refreshView();
      if (!this.registry.findByEmail(this.#viewedEmail)) {
        this.view.showMessage('No account found for that email.', 'error');
      }
    });
  }

  /** R5 – cancel an upcoming appointment. */
  handleCancel(appointmentId) {
    this.#run(() => {
      const customer = this.registry.findByEmail(this.#viewedEmail);
      if (!customer) throw new BusinessRuleError('Look up your account first.');
      const appointment = customer.cancelAppointment(appointmentId);

      this.view.showMessage(`Queue #${appointment.queueNumber} was cancelled.`, 'success');
      this.#changed();
    });
  }

  /** R6 – staff calls the next customer. */
  handleCallNext() {
    this.#run(() => {
      const next = this.staff.callNextCustomer();
      if (next) this.view.showMessage(`Now serving #${next.queueNumber} – ${next.customer.getName()}.`, 'success');
      else this.view.showMessage('Nobody is waiting in the queue.', 'info');
      this.#changed();
    });
  }

  /** R6 – staff marks the current customer Completed or No-show. */
  handleUpdateStatus(appointmentId, newStatus) {
    this.#run(() => {
      const appointment = this.queue.getQueueList().find(a => a.appointmentId === appointmentId);
      if (!appointment) throw new BusinessRuleError('That appointment could not be found.');

      this.staff.updateAppointmentStatus(appointment, newStatus);
      this.view.showMessage(`Queue #${appointment.queueNumber} marked ${newStatus}.`, 'success');
      this.#changed();
    });
  }

  /**
   * Called by the View while the user types in a validated field.
   * Shows the rule's message beside the field, or clears it when the value is fine.
   */
  handleFieldCheck(fieldId, kind, value) {
    this.#run(() => {
      try {
        Validator.validate(kind, value);
        this.view.clearFieldError(fieldId);
      } catch (error) {
        if (!(error instanceof ValidationError)) throw error;   // a real bug should not be hidden
        this.view.showFieldError(fieldId, error.message);
      }
    });
  }

  /** Search the live queue as the user types. */
  handleSearch(text) {
    this.#searchText = text;
    this.refreshView();
  }

  /** Give the user a JSON backup file of all the data. */
  handleDownload() {
    this.#run(() => {
      const text = this.storage.toJsonText(this.registry, this.queue, true);   // indented for people
      this.view.downloadFile('appointease-backup.json', text);
      this.view.showMessage('Backup file downloaded.', 'success');
    });
  }

  /** Replace the current data with a backup file the user chose. */
  handleImport(text) {
    this.#run(() => {
      this.storage.restoreFromText(text, this.registry, this.queue, this.services);   // all-or-nothing
      this.#viewedEmail = '';
      this.view.clearAllInputs();
      this.view.showMessage('Backup loaded. The data on screen now matches the file.', 'success');
      this.#changed();
    });
  }

  /** Demo helper – clear everything, including the saved copy. */
  handleReset() {
    this.#run(() => {
      if (!this.view.confirm('Clear all customers and appointments?')) return;
      this.registry.clear();
      this.queue.reset();
      this.#viewedEmail = '';
      this.#searchText = '';
      this.view.clearAllInputs();
      this.storage.clear();
      this.refreshView();
      this.view.showMessage('Demo data cleared.', 'info');
    });
  }

  // ---------------- error handling + saving helpers ----------------

  /**
   * Run a handler's work safely.
   * - AppError (expected problem): show its friendly message.
   * - anything else (a bug): log it for the developer, show a general message.
   */
  #run(action) {
    try {
      action();
    } catch (error) {
      if (error instanceof AppError) {
        this.view.showMessage(error.message, 'error');
      } else {
        console.error('Unexpected error:', error);
        this.view.showMessage('Something went wrong. Please try again. Your saved data was not changed.', 'error');
      }
    }
  }

  /**
   * After any change to the data: save it, then redraw the page.
   * Call this AFTER showing the success message, so that if saving fails, the warning is the message
   * the user is left looking at (a later message replaces an earlier one).
   */
  #changed() {
    this.#save();
    this.refreshView();
  }

  /** Save as JSON. A save problem must never stop the user working, so it only shows a warning (once). */
  #save() {
    try {
      this.storage.save(this.registry, this.queue);
      this.#saveWarningShown = false;
    } catch (error) {
      if (!(error instanceof AppError)) throw error;
      if (!this.#saveWarningShown) {
        this.view.showMessage(error.message, 'error');
        this.#saveWarningShown = true;
      }
    }
  }

  /** On start-up: load the saved data. Damaged data is reported, and the app starts empty. */
  #loadSavedData() {
    try {
      this.storage.load(this.registry, this.queue, this.services);
    } catch (error) {
      if (!(error instanceof AppError)) throw error;
      this.view.showMessage(`${error.message} The app has started empty and a backup copy was kept.`, 'error');
    }
  }

  // ---------------- validation helper ----------------

  /**
   * Check several fields at once. Every problem is shown, the cursor goes to the first one.
   * @param {Array<[string, string, string]>} fields  [fieldId, kind, value] for each field
   * @returns {boolean} true only if all fields are valid
   */
  #checkFields(fields) {
    let firstBadField = null;
    for (const [fieldId, kind, value] of fields) {
      try {
        Validator.validate(kind, value);
        this.view.clearFieldError(fieldId);
      } catch (error) {
        if (!(error instanceof ValidationError)) throw error;
        this.view.showFieldError(fieldId, error.message);
        firstBadField ??= fieldId;
      }
    }
    if (firstBadField) {
      this.view.focusField(firstBadField);
      this.view.showMessage('Please fix the highlighted fields.', 'error');
      return false;
    }
    return true;
  }

  // ---------------- redraw ----------------

  /** Ask the Model for the current data and tell the View to draw it. */
  refreshView() {
    const serving = this.queue.getNowServing();

    this.view.renderBoard(serving, this.queue.getStats());
    this.view.renderServingControls(serving);
    this.view.renderQueue(this.queue.search(this.#searchText), this.#searchText.trim() !== '');
    this.view.renderJson(this.storage.toJsonText(this.registry, this.queue, true));
    this.#refreshMyAppointments();
  }

  #refreshMyAppointments() {
    if (!this.#viewedEmail) {
      this.view.showMyAppointmentsHint('Enter your email to see your appointments and queue numbers.');
      return;
    }
    const customer = this.registry.findByEmail(this.#viewedEmail);
    if (!customer) {
      this.view.showMyAppointmentsHint('No account found for that email.');
      return;
    }
    const appointments = customer.getAppointments();
    if (appointments.length === 0) {
      this.view.showMyAppointmentsHint(`Hello ${customer.getName()}. You have no appointments yet.`);
      return;
    }
    this.view.renderMyAppointments(appointments);
  }
}
