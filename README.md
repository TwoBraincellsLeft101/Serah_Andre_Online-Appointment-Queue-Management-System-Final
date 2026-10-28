# AppointEase – Online Appointment & Queue Management System

**ITDI110 – Object-Oriented Programming & Software Development – Major Programming Project**
**Checkpoint 3 – Validation, Data, Testing & Version Control**
Group: Serah Morris & Andre Banvuhavuha

AppointEase is an appointment and queue management system for a **bank branch**. Customers create an account,
book an appointment for a banking service and receive a queue number. Bank staff (a customer service officer)
run the live queue: call the next customer and mark them Completed or No-show.
Everything is saved in the browser as JSON, so it is still there after a refresh.

**Banking services (16)**, in the sections and subsections of the system design:

| Section | Subsection | Services |
|---------|------------|----------|
| Core Banking Services | Deposit Accounts | Checking Account, Savings Account, Money Market Account, Certificate of Deposit (CD) |
| Core Banking Services | Loans and Credit | Personal Loan, Auto Loan, Home Mortgage, Business Loan, Credit Card |
| Core Banking Services | Payment and Access Services | Debit Card and ATM Support, Online and Mobile Banking Help |
| Additional Services | Safe Deposit Boxes | Safe Deposit Box |
| Additional Services | Investment and Insurance | Investment and Insurance Advice |
| Additional Services | Business Banking | Business Checking and Savings, Cash Management and Payroll, Commercial Real Estate Financing |

The list lives in `js/app.js` (`serviceMenu`). Each service is one `ServiceType` object; the grouping only organises the menu.

Built with plain HTML, CSS and object-oriented JavaScript (no frameworks, nothing to install).

---

## How to run

**In VS Code (easiest):** open the project folder, press **F5** and choose **Run AppointEase (Chrome)**
(or Edge). The browser opens `index.html` directly. No extension and no server are needed.

Other ways, all equally fine:
- double-click `index.html`;
- right-click `index.html` in VS Code → **Open with Live Server** (extension by Ritwick Dey);
- `python -m http.server 8080` in the project folder, then open `http://localhost:8080`.

> The scripts are loaded with ordinary `<script>` tags in dependency order (the same way as the Week 5, 6 and 10
> labs), so it does not matter how the page is opened.

**Saved data is per address.** The browser keeps the data for each address separately, so what you saved while
opening the file directly will not appear at `http://127.0.0.1:5500` (Live Server) and vice versa.
Use **Download backup (JSON)** and **Load backup file** in the page footer to move data between them.

**Quick demo:** create an account → book an appointment → press **Call next customer** → mark the customer
completed → refresh the page (the data is still there) → open *Saved data (JSON)* to see what was stored.

## How to run the tests

- **In the browser:** press F5 and choose *Run unit tests in the browser*, or click **Run unit tests** in the page
  footer. The results page shows every test with PASS or FAIL.
- **In the terminal** (needs Node.js 18 or newer): `npm test` (or `node tests/run-tests.mjs --verbose`).

There are **151 unit tests**, written in the Jest style taught in Week 10 (Arrange → Act → Assert; normal,
boundary and invalid cases). They check the Validator, every Model class, JSON saving and loading, damaged data and error handling.

---

## Project structure (MVC)

```
appointease/
├── index.html                     VIEW        page structure, forms, tables
├── css/style.css                  VIEW        styling
├── views/AppView.js               VIEW        class: DOM elements, event binding, drawing, messages, file download
├── controllers/AppController.js   CONTROLLER  class: one handler per action; validates, calls the Model, saves, tells the View
├── js/app.js                      start-up    creates Model + View + Controller and connects them
├── models/                        MODEL       data + business rules
│   ├── AppError.js                base of all expected errors (extends Error)
│   ├── ValidationError.js         bad input (knows which field)
│   ├── BusinessRuleError.js       valid input, but the action is not allowed
│   ├── StorageError.js            saving or loading problems
│   ├── Validator.js               every Regular Expression and validation rule
│   ├── Person.js                  base class (private #id, #name, #email, #phone)
│   ├── Customer.js                extends Person   bookAppointment, cancelAppointment, viewStatus
│   ├── Staff.js                   extends Person   callNextCustomer, updateAppointmentStatus, viewQueue
│   ├── Appointment.js             private status life-cycle, setStatus(), cancel()
│   ├── ServiceType.js             services offered
│   ├── QueueManager.js            SINGLETON – the one shared queue (also search + stats)
│   └── CustomerRegistry.js        registered customers, one account per email
├── services/StorageService.js     saves/loads everything as JSON (JSON.stringify / JSON.parse)
├── tests/                         151 unit tests (TestRunner.js, *.test.js, tests.html, run-tests.mjs)
└── docs/                          walkthroughs, validation rules, Git workflow, contribution record
```

## Requirements covered (from Checkpoint 1)

| Req | Feature | Where |
|-----|---------|-------|
| R1 | Register with name, email, phone | `CustomerRegistry.register()` |
| R2 | Book a service at a date/time | `Customer.bookAppointment()` |
| R3 | Automatic unique queue number | `QueueManager.generateQueueNumber()` |
| R4 | View appointment status | `Customer.viewStatus()`, "My appointments" |
| R5 | Cancel an upcoming appointment | `Customer.cancelAppointment()` |
| R6 | Staff call next / update status | `Staff.callNextCustomer()`, `updateAppointmentStatus()` |
| R7 | Live queue list | Now-serving board + Live queue table (with search) |
| R8 | Input validation | `Validator` (Regular Expressions), messages beside each field |

## OOP concepts demonstrated

- **Classes, objects, constructors, parameters, return values** – every file in `models/`.
- **Encapsulation** – private `#` fields everywhere; `Appointment.#status` only changes through `setStatus()`; `getQueueList()` returns a copy.
- **Inheritance** – `Customer` and `Staff` extend `Person`; `ValidationError`, `BusinessRuleError` and `StorageError` extend `AppError`, which extends `Error`.
- **Design pattern: Singleton** – `QueueManager.getInstance()` gives the booking side and the staff side the same queue, so numbers never repeat.
- **MVC** – Model holds data and rules, `AppView` does all the page work, `AppController` only coordinates.
- **Events and callbacks** – `submit`, `click`, `input`, `blur` and `change` listeners; named handlers with `.bind(this)`, arrow callbacks, event delegation, `FileReader` callbacks, `setTimeout`.

## Checkpoint 3 features

- **Regular Expressions** – name, email, phone and date/time rules in `Validator`; see `docs/CP3_PART1_VALIDATION.md`.
- **Input validation in three places** – live messages beside each field (Controller), and again inside the Model so an object can never hold bad data.
- **JSON** – `JSON.stringify()` saves; `JSON.parse()` loads. Each class has `toJSON()` (private fields are invisible to JSON) and loading rebuilds real objects through the constructors, so every rule runs again. Saved text is never trusted: 19 kinds of tampering are tested.
- **Error handling** – expected problems are `AppError`s with friendly messages; anything else is logged and the user sees a general message; a global handler stops silent failures; a failed save never stops the user working.
- **Comments and documentation** – a file header, JSDoc (`@param`, `@returns`, `@throws`) on classes and public methods, and "why" comments for non-obvious decisions.
- **Unit tests** – 151 tests, plus regression tests for problems found while testing.
- **Git/GitHub** – see `docs/GIT_WORKFLOW.md`.

## Known limits

- The queue is one shared day's queue; there is no login and no real "today" (use *Reset demo data* to start fresh).
- Saved data lives in this browser only (localStorage); backup files move it between browsers.
- Notifications are on-screen messages (no email or SMS).

## Next (Checkpoint 4)

Final UML diagram, product backlog, user stories, sprint evidence, individual contribution statements, user guide and demonstration.
