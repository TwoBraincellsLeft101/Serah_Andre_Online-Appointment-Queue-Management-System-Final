// Runs every unit test in Node (no packages needed).
//   node tests/run-tests.mjs            -> failures + summary
//   node tests/run-tests.mjs --verbose  -> every test, PASS / FAIL
//
// The application files are plain browser scripts (no import/export), so they are loaded the same way
// index.html loads them: in order, into one shared scope.
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');

const appFiles = [
  'models/AppError.js', 'models/ValidationError.js', 'models/BusinessRuleError.js', 'models/StorageError.js',
  'models/Validator.js', 'models/Person.js', 'models/ServiceType.js', 'models/Appointment.js',
  'models/QueueManager.js', 'models/Customer.js', 'models/Staff.js', 'models/CustomerRegistry.js',
  'services/StorageService.js'
];
const testFiles = [
  'tests/TestRunner.js', 'tests/helpers.js',
  'tests/validator.test.js', 'tests/errors.test.js', 'tests/person.test.js', 'tests/appointment.test.js',
  'tests/customer.test.js', 'tests/queue.test.js', 'tests/staff.test.js', 'tests/registry.test.js',
  'tests/storage.test.js', 'tests/regression.test.js'
];

const context = vm.createContext({ console });
for (const file of [...appFiles, ...testFiles]) {
  vm.runInContext(read(file), context, { filename: file });
}
const results = vm.runInContext('TestRunner.run()', context);

const verbose = process.argv.includes('--verbose');
let lastGroup = '';
for (const r of results) {
  if (verbose && r.group !== lastGroup) { console.log(`\n${r.group}`); lastGroup = r.group; }
  if (verbose) console.log(`  ${r.passed ? 'PASS' : 'FAIL'} - ${r.name}`);
  if (!r.passed) console.log(`${verbose ? '       ' : 'FAIL - '}${r.group} > ${r.name}\n       ${r.message}`);
}
const passed = results.filter(r => r.passed).length;
console.log(`\n${passed} of ${results.length} tests passed.`);
process.exit(passed === results.length ? 0 : 1);
