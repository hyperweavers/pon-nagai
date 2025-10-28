const convertToIST = (date) => {
  const offset =
    date.getTimezoneOffset() == 0 ? 0 : -1 * date.getTimezoneOffset();

  let normalized = new Date(date.getTime() + offset * 60000);
  return new Date(
    normalized.toLocaleString('en-US', { timeZone: 'Asia/Calcutta' })
  );
};

const getMeridiem = (date) => {
  return date
    .toLocaleTimeString([], { hour: '2-digit', hour12: true })
    .slice(-2);
};

const formatDateForDatabase = (date) => date.toISOString().split('T')[0];

module.exports = {
  convertToIST,
  formatDateForDatabase,
  getMeridiem,
};
