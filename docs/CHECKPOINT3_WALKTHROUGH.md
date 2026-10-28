# Checkpoint 3 walkthrough – how the new parts work

Read this before the demonstration. It follows the Week 7 (Regex), Week 9 (JSON) and Week 10 (testing) notes.

## 1. Validation (Week 7)

```
View event  ->  Controller callback  ->  Validator (regex)  ->  Model update  ->  View feedback
```
- Leave a field -> `AppView` reports the `blur` event -> `AppController.handleFieldCheck()` asks `Validator.validate(kind, value)`
  -> a `ValidationError` makes the View show the message under the field.
- Submit -> `#checkFields()` checks every field, shows all problems and focuses the first. Only valid data reaches the Model.
- The Model checks again (`Person`, `Appointment`, `Customer.bookAppointment`) because an object must protect its own data.
- The rules (patterns) are only written in `models/Validator.js`. See `docs/CP3_PART1_VALIDATION.md` for the table.

## 2. Saving: objects -> JSON text -> localStorage

1. A handler changes the Model (for example `customer.bookAppointment()`), shows its message, then calls `#changed()`.
2. `#changed()` calls `StorageService.save(registry, queue)`.
3. `JSON.stringify()` needs data it can see. `#private` fields are invisible to it, so each class has a `toJSON()`
   that returns a plain object (`Person`, `Appointment`, `QueueManager`, `CustomerRegistry`). `JSON.stringify` calls them itself.
4. Appointments store `customerId` and `serviceId` instead of copies, so the file has no circular references.
5. The text goes into `localStorage` under the key `appointease.data`.

## 3. Loading: localStorage -> JSON text -> real objects

1. On start-up `AppController` calls `StorageService.load()`.
2. `JSON.parse()` (inside `try/catch`) turns the text into **plain objects**. They look right but have no methods
   (the Week 9 lesson: `parsed instanceof Student` is `false`).
3. Every item is rebuilt through its constructor (`Customer.fromJSON`, `Appointment.fromJSON`), so all validation runs again.
   Saved text can be edited or damaged, so it is never trusted.
4. Nothing is replaced until everything has been checked (all-or-nothing). Damaged text is kept under `appointease.data.backup`.

## 4. Error handling

- `AppError` (extends `Error`) -> `ValidationError`, `BusinessRuleError`, `StorageError`. Their messages are written for the user.
- Every Controller handler runs inside `#run()`: an `AppError` is shown as a message; anything else is a bug, so it is
  written to the console and the user sees "Something went wrong".
- `app.js` also listens for uncaught errors so the page never fails silently.
- A failed save only shows a warning; the user can keep working.

## 5. Backup and restore

- **Download backup (JSON)**: `JSON.stringify(snapshot, null, 2)` -> `Blob` -> temporary link (`AppView.downloadFile`).
- **Load backup file**: `FileReader` (`onload` callback) -> `StorageService.restoreFromText()` -> same safe loading as above.

## 6. Tests (Week 10)

- `npm test` (Node) or `tests/tests.html` (browser). 151 tests in 10 files, Jest style: `describe`, `test`, `expect`.
- Arrange (prepare) -> Act (call) -> Assert (`expect`). Each rule has normal, boundary and invalid cases.
- `tests/regression.test.js` holds one test for each problem found while testing (see the Checkpoint 3 document, section 11).
- To prove the tests work: change `{7}` to `{6}` in `Validator.phonePattern` and run them; many fail. Put it back.

## 7. A five-minute demonstration

1. Show the bank services menu. Submit the empty registration form -> messages beside each field.
2. Register, book a Home Mortgage, call next, mark completed.
3. Refresh -> the data is still there. Open *Saved data (JSON)* and explain `toJSON()`.
4. In the console run `localStorage.setItem('appointease.data', '{ broken')`, refresh -> friendly message, app starts empty.
5. Open *Run unit tests* -> 151 of 151. Break a pattern on purpose and show tests failing.
6. Open GitHub: commits from both members, branches and merges.

## 8. Questions you may be asked

- *Why does `JSON.stringify(customer)` not give `{}`?* Because `Person.toJSON()` returns the data that private fields hide.
- *Why rebuild objects instead of using the parsed objects?* The parsed objects have no methods and skip validation.
- *Why validate in the Controller and the Model?* The Controller gives fast messages beside the field; the Model protects itself when used from anywhere.
- *Why a custom `AppError`?* So the Controller can tell an expected problem (show the message) from a bug (log it).
- *Why plain `<script>` tags?* The labs load files this way and it works however the page is opened.
