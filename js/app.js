/**
 * app.js - starts the application (like the lab's app.js).
 * Loaded last by index.html, after all the classes it uses.
 *
 * Creates the Model objects, the View and the Controller, and connects them:
 *     const controller = new AppController(model..., view, storage);
 * From here on the Controller reacts to the user's actions.
 */

// MODEL
const registry = new CustomerRegistry();
const queue = QueueManager.getInstance();      // Singleton: the one shared queue
const staff = new Staff(100, 'Alex Rivera', 'alex@appointease.test', '5550100', 'Customer Service Officer');

// The services the bank offers, in the sections and subsections of the system design.
// ServiceType is unchanged (id, name, estimated minutes); the grouping is only used to
// lay the menu out on the page, so the View can show headings and the Controller can find a service by id.
const serviceMenu = [
  {
    section: 'Core Banking Services',
    groups: [
      { name: 'Deposit Accounts', services: [
        new ServiceType(1, 'Checking Account', 20),
        new ServiceType(2, 'Savings Account', 20),
        new ServiceType(3, 'Money Market Account', 25),
        new ServiceType(4, 'Certificate of Deposit (CD)', 25)
      ] },
      { name: 'Loans and Credit', services: [
        new ServiceType(5, 'Personal Loan', 40),
        new ServiceType(6, 'Auto Loan', 40),
        new ServiceType(7, 'Home Mortgage', 45),
        new ServiceType(8, 'Business Loan', 40),
        new ServiceType(9, 'Credit Card', 20)
      ] },
      { name: 'Payment and Access Services', services: [
        new ServiceType(10, 'Debit Card and ATM Support', 15),
        new ServiceType(11, 'Online and Mobile Banking Help', 20)
      ] }
    ]
  },
  {
    section: 'Additional Services',
    groups: [
      { name: 'Safe Deposit Boxes', services: [
        new ServiceType(12, 'Safe Deposit Box', 15)
      ] },
      { name: 'Investment and Insurance', services: [
        new ServiceType(13, 'Investment and Insurance Advice', 30)
      ] },
      { name: 'Business Banking', services: [
        new ServiceType(14, 'Business Checking and Savings', 25),
        new ServiceType(15, 'Cash Management and Payroll', 35),
        new ServiceType(16, 'Commercial Real Estate Financing', 45)
      ] }
    ]
  }
];

// STORAGE (JSON in the browser's localStorage)
const storage = new StorageService();

// VIEW + CONTROLLER
const view = new AppView();
const controller = new AppController(registry, queue, staff, serviceMenu, view, storage);

// Safety net: an error nobody caught must never leave the user with a silent, frozen page.
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error ?? event.message);
  view.showMessage('Something went wrong. Please reload the page.', 'error');
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  view.showMessage('Something went wrong. Please reload the page.', 'error');
});

// Handy for the browser console while demonstrating / debugging: window.appointease.queue ...
window.appointease = { controller, storage };
