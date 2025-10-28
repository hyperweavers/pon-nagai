const axios = require('axios');

require('dotenv').config();

const TELEGRAM_API_TOKEN = process.env.TELEGRAM_API_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

const MESSAGE_FORMAT = 'Markdown';

const NEW_LINE = '%0A';

const composeNotificationMessage = (metalPrices, comparisonPrices) => {
  if (!Array.isArray(metalPrices) || metalPrices.length === 0) {
    return '';
  }

  let comparisonPriceMap;

  if (comparisonPrices) {
    comparisonPriceMap = Object.fromEntries(
      comparisonPrices.map((item) => [
        `${item.metal}-${item.purity}`,
        item.price,
      ])
    );
  }

  // Header
  let message = `*Today's Price/Gram:* ${NEW_LINE}${NEW_LINE}`;

  // Table-like body
  metalPrices
    .map((mp) => ({
      ...mp,
      previousPrice:
        comparisonPriceMap && Object.keys(comparisonPriceMap).length > 0
          ? comparisonPriceMap[`${mp.metal}-${mp.purity}`] ?? null
          : null,
    }))
    .forEach((item) => {
      const { metal, purity, price, previousPrice } = item;

      if (metal.toLowerCase() === 'silver') {
        message += `${NEW_LINE}`;
      } else if (metal.toLowerCase() === 'platinum') {
        message += `${NEW_LINE}`;
      }

      message += `*${metal}* `;

      if (metal.toLowerCase() === 'gold') {
        message += `_(${purity})_ `;
      }

      message += `- *₹${price.toLocaleString('en-IN')}*`;

      const change = price - previousPrice;
      if (change) {
        message += ` (${change.toLocaleString('en-IN')} ${
          change > 0 ? '🔼' : '🔽'
        })`;
      }

      message += `${NEW_LINE}`;
    });

  // Footer
  message += `${NEW_LINE}*Disclaimer*: Prices are indicative and may vary slightly across jewellers and locations.`;

  return message;
};

const composePredictionMessage = (marketPosition) => {
  const lastTradedDate = new Date(
    marketPosition[0].lastTradedDate
  ).toLocaleDateString();
  const today = new Date().toLocaleDateString();

  let message = `*Tomorrow's Price Expectation:* ${NEW_LINE}${NEW_LINE}`;

  if (lastTradedDate === today) {
    marketPosition.forEach((item) => {
      const { metal, change, ..._ } = item;

      if (metal.toLowerCase() === 'silver') {
        message += `${NEW_LINE}`;
      }

      message += `*${metal}* - `;

      message +=
        change.toLocaleString('en-IN') === '0'.toLocaleString('en-IN')
          ? 'No Change'
          : `*${Math.abs(change)}%* ${change > 0 ? '🔼' : '🔽'}`;
    });
  } else {
    message += 'No change expected in gold and silver prices.';
  }

  // Footer
  message += `${NEW_LINE}${NEW_LINE}*Disclaimer*: Changes are estimated based on market trends and may inaccurate and change anytime.`;

  return message;
};

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
  composeNotificationMessage,
  composePredictionMessage,
  sendMessage,
};
