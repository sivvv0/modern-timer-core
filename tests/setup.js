// Silence console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Increase timeout for async tests
jest.setTimeout(30000);

// Use fake timers for all tests
beforeEach(() => {
  jest.useFakeTimers({
    doNotFake: ['nextTick', 'setImmediate'],
    timerLimit: 1000
  });
});

// Clean up after each test
afterEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
});

// Restore real timers after all tests
afterAll(() => {
  jest.useRealTimers();
});
