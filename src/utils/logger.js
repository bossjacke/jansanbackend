const info = (...args) => {
  console.log('[INFO]', ...args);
};

const warn = (...args) => {
  console.warn('[WARN]', ...args);
};

const error = (...args) => {
  console.error('[ERROR]', ...args);
};

export default {
  info,
  warn,
  error,
};

