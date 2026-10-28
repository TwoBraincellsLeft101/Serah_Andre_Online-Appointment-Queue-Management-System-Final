# Checkpoint 2 walkthrough – how the code fits together

Use this to prepare for the demonstration. Everything here matches what was taught in Weeks 2–6.

## 1. The three MVC parts (Week 5)

| Part | Files | Its one job | It must NOT |
|------|-------|-------------|-------------|
| Model | `models/*.js` | Know the data and the rules (e.g. "no double booking", "status must be valid") | touch the page |
| View | `index.html`, `css/style.css`, `views/AppView.js` | Show things and report what the user did | contain rules or keep data |
| Controller | `controllers/AppController.js` | Decide what happens next: call the Model, then tell the View | touch the DOM or hold rules |

`js/app.js` just creates the objects and connects them: `new AppController(registry, queue, staff, services, view)`.

## 2. Follow one click: "Book and get my queue number"

1. **View** – `AppView.bindBook()` listens for the form's `submit` event. It stops the page reloading
   (`event.preventDefault()`), reads the three inputs, and calls the handler it was given.
2. **Controller** – `AppController.handleBook(data)` receives `{ email, serviceId, dateTime }`.
   It finds the customer in the registry and the chosen service.
3. **Model** – `customer.bookAppointment(service, dateTime)` applies the rules: service chosen? no
   clash at that time? Then it asks the Singleton `QueueManager` for the next queue number, creates an
   `Appointment`, sets it to Confirmed, and adds it to the queue. It returns the appointment.
4. **Controller** – receives the appointment and calls `view.clearBookForm()`, `refreshView()`
   and `view.showMessage("Booked! Your queue number is #2.")`.
5. **View** – `renderBoard()`, `renderQueue()` and `renderMyAppointments()` redraw the page.

If the Model refuses (e.g. double booking) it **throws an Error**. The Controller's `catch` passes
`error.message` to `view.showMessage(..., 'error')`. The rule itself is never written in the Controller.

## 3. Where each required concept lives

- **Class / object / constructor** – every file in `models/`; objects are created in `app.js`.
- **Encapsulation** – `#` private fields. Example: `Appointment.#status` can only be changed by `setStatus()`,
  which rejects values not in `STATUSES` and refuses changes once an appointment is finished.
  `QueueManager.getQueueList()` returns a *copy*, so outside code cannot edit the real queue.
- **Getters / setters** – `get id`, `get queueNumber`, `getName()`, `getContact()`; controlled setter `setContact()`.
- **Inheritance** – `Customer extends Person` and `Staff extends Person`; each constructor calls `super(...)` first.
- **Singleton** – `QueueManager`: private static `#instance`, `getInstance()`, and a constructor that throws if you
  try `new QueueManager()` a second time. *Why:* the booking side and the staff side must share one queue so
  numbers never repeat and "Now Serving" is always in sync.
- **Events** – `submit` (forms), `click` (buttons), `input` (search box), all registered in `AppView.bind...()`.
- **Callbacks** – the Controller's handler is passed *into* the View (`view.bindBook(data => this.handleBook(data))`)
  and the View calls it when the event happens. `setTimeout(() => ..., 4500)` is a callback that hides the message.
- **Event delegation** – Cancel / Completed / No-show buttons are created after the page loads, so one listener on
  the container catches clicks from all of them (same technique as the Week 6 lab).

## 3b. A note on the Singleton style

The Week 4 slides show a Singleton whose constructor *returns* the existing instance. AppointEase uses the other
common version, from Checkpoint 1: the constructor *throws* if an instance already exists and callers use
`getInstance()`. Both guarantee exactly one object; be ready to say which one you used and why.

## 4. Questions you may be asked

- *Why is `AppView` a class and not just functions?* It groups everything about the page in one place and the
  Controller receives it as an object, so the View could be swapped without touching the rules.
- *Why does the Controller catch errors instead of the Model?* The Model's job is to refuse bad actions
  (throw); deciding how to tell the user is presentation, so the View shows it and the Controller connects them.
- *What happens if you refresh the page?* Data is kept in memory in Checkpoint 2, so it resets. Saving as JSON is Checkpoint 3.
- *How do you know Singleton works?* `tests/queue.test.js`: `getInstance()` twice returns the same object and
  `new QueueManager()` throws.
