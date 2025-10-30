const axios = require('axios');

require('dotenv').config();

const TELEGRAM_API_TOKEN = process.env.TELEGRAM_API_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

const MESSAGE_FORMAT = 'Markdown';

const NEW_LINE = '%0A';

const GRAMS_PER_SAVARAN = 8;
const GRAMS_PER_KG = 1000;

const composeNotificationMessage = (session, metalPrices, comparisonPrices) => {
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

  const messageBody = {
    gold: [],
    silver: [],
    platinum: [],
  };

  // Header
  const sessionText =
    session === 'AM' ? ' Morning' : session === 'PM' ? ' Evening' : '';
  let message = `*Today's${sessionText} Price:* ${NEW_LINE}${NEW_LINE}`;

  // Body
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

      const diff = price - previousPrice;
      const arrow = diff > 0 ? '⬆️' : '⬇️';
      const change =
        previousPrice && diff !== 0
          ? ` (${arrow} ₹${Math.abs(diff).toLocaleString('en-IN')})`
          : '';
      const priceGram = `₹${price.toLocaleString('en-IN')}`;

      // Price per gram and savaran (8g)
      if (metal.toLowerCase() === 'gold') {
        const priceSavaran = `₹${(price * GRAMS_PER_SAVARAN).toLocaleString(
          'en-IN'
        )}`;
        const previousPriceSavaran = previousPrice * GRAMS_PER_SAVARAN;
        const savaranDiff = price * GRAMS_PER_SAVARAN - previousPriceSavaran;
        const savaranChange =
          previousPrice && savaranDiff !== 0
            ? ` (${arrow} ₹${Math.abs(savaranDiff).toLocaleString('en-IN')})`
            : '';

        let purityText = purity;
        if (purity.toLowerCase() === '22kt') {
          purityText += ' - 916';
        }

        messageBody.gold.push(
          `*${metal} (${purityText}):*${NEW_LINE}1 Gram - *${priceGram}*${change}${NEW_LINE}1 Savaran - *${priceSavaran}*${savaranChange}${NEW_LINE}${NEW_LINE}`
        );
      } else if (metal.toLowerCase() === 'silver') {
        const priceKg = `₹${(price * GRAMS_PER_KG).toLocaleString('en-IN')}`;
        const previousPriceKg = previousPrice * GRAMS_PER_KG;
        const kgDiff = price * GRAMS_PER_KG - previousPriceKg;
        const kgChange =
          previousPrice && kgDiff !== 0
            ? ` (${arrow} ₹${Math.abs(kgDiff).toLocaleString('en-IN')})`
            : '';

        messageBody.silver.push(
          `*${metal}:*${NEW_LINE}1 Gram - *${priceGram}*${change}${NEW_LINE}1 KG - *${priceKg}*${kgChange}${NEW_LINE}${NEW_LINE}`
        );
      } else if (metal.toLowerCase() === 'platinum') {
        messageBody.platinum.push(
          `*${metal}:*${NEW_LINE}1 Gram - *${priceGram}*${change}${NEW_LINE}${NEW_LINE}`
        );
      }
    });

  message += Object.values(messageBody).flat().join('');

  // Footer
  message += `*Disclaimer*: Prices are indicative and may vary slightly across jewellers and locations.`;

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
          : `${change > 0 ? '⬆️' : '⬇️'} *${Math.abs(change)}%*`;
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
