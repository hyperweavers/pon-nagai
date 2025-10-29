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

const getYesterday = (today) => {
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  return yesterday;
}

const formatDateForDatabase = (date) => date.toISOString().split('T')[0];

module.exports = {
  convertToIST,
  formatDateForDatabase,
  getMeridiem,
  getYesterday,
};
