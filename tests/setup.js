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

// Use fake timers by default
beforeEach(() => {
  jest.useFakeTimers();
});

// Clean up after each test
afterEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
  // Don't use real timers here to avoid conflicts
});

// Restore real timers after all tests
afterAll(() => {
  jest.useRealTimers();
});
