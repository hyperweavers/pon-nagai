const axios = require('axios');

require('dotenv').config();

const TELEGRAM_API_TOKEN = process.env.TELEGRAM_API_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

const MESSAGE_FORMAT = 'Markdown';

const sendMessage = async (message) => {
  let isSuccess = false;

  if (typeof message === 'string' && message.length > 0) {
    const response = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_API_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&parse_mode=${MESSAGE_FORMAT}&text=${message}`
    );

    if (response.status === 200) {
      isSuccess = true;
    }
  } else {
    console.error('Message is empty!');
  }

  return isSuccess;
};

module.exports = {
  sendMessage,
};
