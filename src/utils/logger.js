const getTimestamp = () => {
  return new Date().toISOString();
};

const info = (...args) => {
  console.log('[INFO]', getTimestamp(), ...args);
};

const warn = (...args) => {
  console.warn('[WARN]', getTimestamp(), ...args);
};

const error = (...args) => {
  console.error('[ERROR]', getTimestamp(), ...args);
};

export default {
  info,
  warn,
  error,
};
