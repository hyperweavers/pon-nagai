const formatDateForDatabase = (date) => date.toISOString().split('T')[0];

module.exports = {
  formatDateForDatabase,
};
