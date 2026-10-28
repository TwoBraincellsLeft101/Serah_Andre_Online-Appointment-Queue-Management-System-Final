# Checkpoint 3 – Part 1: Regular Expression validation

Method (Week 7): start from the requirement in plain English, decide the allowed characters and
length, then write the pattern. All patterns live in **one class**, `models/Validator.js`.

## 1. The rules

| Field | Requirement (plain English) | Pattern | Valid | Invalid |
|-------|-----------------------------|---------|-------|---------|
| Name | 2–50 characters. Letters from any language, spaces, hyphens, apostrophes. Starts and ends with a letter. | `/^\p{L}[\p{L} '\-]{0,48}\p{L}$/u` | Serah Morris, Mary-Jane, O'Neil, José | John3, A, `<b>x</b>`, -Ann |
| Email | Something, one `@`, something, a dot, something. No spaces. No `..`. Max 254 characters. | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` plus two small extra checks | serah@example.com, a.b+c@mail.co.vu | serah@, serah@example, a b@x.com, a@x..com |
| Phone | Vanuatu local number: exactly 7 digits. Spaces, hyphens and a leading +678 are allowed and removed first. | `/^[0-9]{7}$/` after cleaning | 5551234, 555 1234, 555-1234, +678 555 1234 | 55512, 55512345, 555A234, +679 5551234 |
| Date and time | Format `YYYY-MM-DDTHH:MM`, a real calendar date. For bookings it must also not be in the past. | `/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/` plus calendar logic | 2099-12-31T23:59, leap day 2096-02-29 | 2099-02-31T10:00, 2099-13-01T10:00, 2099-11-02, empty |

**Why some rules use extra logic as well:** the Week 7 notes say to use several small checks when one
expression would be too complicated, and to add normal program logic when Regex cannot express the rule.
A regex can check the *shape* of a date but not that 31 February doesn't exist, and "not in the past" is
a comparison, not a pattern.

**Cleaning (`replace`, `trim`, `toLowerCase`):** values are tidied before they are stored. Extra spaces in
a name collapse to one, emails become lower-case, phone numbers become just the 7 digits.

JavaScript methods used: `test()` (is it valid?), `exec()` (pull out the year, month, day, hour, minute),
`replace()` (clean the input).

## 2. Where validation happens (Week 7 flow)

```
View event  ->  Controller callback  ->  Validator (regex)  ->  Model update  ->  View feedback
```

1. **View** – `AppView.bindFieldValidation()` listens for `blur` (leaving a field) and `input` (typing).
2. **Controller** – `AppController.handleFieldCheck()` asks `Validator.validate(kind, value)`.
3. **Validator** – returns the cleaned value or throws a `ValidationError` with a friendly message.
4. **View** – `showFieldError()` writes the message under the field and turns the border red.
   On submit, `#checkFields()` checks every field, shows all the problems at once and moves the cursor
   to the first one. Only when everything is valid does the Controller call the Model.

**The Model checks again** (`Person`, `Appointment`, `Customer.bookAppointment` all call the Validator).
Reason from Week 7: "an object should protect its own valid state". The rule is written once, in
`Validator`, and only *called* from several places, so there is no duplicated code.

## 3. `ValidationError` (inheritance reused)

`class ValidationError extends Error` carries a friendly message and the name of the field. The Controller
uses `instanceof ValidationError` to tell "the user typed something wrong" (show it beside the field)
from a real program bug (do not hide it).

## 4. Problems found while testing, and what was improved

| # | Problem found | How it was found | Improvement |
|---|---------------|------------------|-------------|
| 1 | Browser's own pop-up messages (`type="email"`) appeared instead of our regex messages, so our rules were never shown. | Typed a bad email and submitted. | Added `novalidate` to the forms; our Validator now produces every message. |
| 2 | 31 February was accepted by JavaScript and quietly turned into 3 March. | Boundary test on dates. | `validateDateTime()` rebuilds the date and compares each part, so impossible dates are refused. |
| 3 | After typing a bad value and clicking Submit straight away, the **first click did nothing**. The error message appeared under the field, pushed the button down, and the click missed it. | Browser test (simulated click right after typing). | A line for each error message is always reserved in the layout, so nothing moves; messages shortened to one line. |
| 4 | A name like `<img src=x onerror=...>` could have been stored. | Security-style test input. | Name pattern allows letters only; the page also builds all text with `textContent`, never `innerHTML`. |

## 5. How to check it

- Run `npm test` (or open `tests/tests.html`). `tests/validator.test.js` has valid, invalid and boundary cases for every rule.
- In the browser: leave a field and watch the message; submit the empty form; try `John3`, `serah@`, `123`, and a date in the past.
