const axios = require('axios');

require('dotenv').config();

const { sendMessage } = require('../utils/message-utils');
const { saveTodayMarketPrice } = require('../utils/db-utils');

const GOLD_MARKET_PRICE_API_URL = process.env.GOLD_MARKET_PRICE_API_URL || '';

const getMarketPosition = async () => {
  let position = null;

  try {
    const response = await axios.get(GOLD_MARKET_PRICE_API_URL);

    if (response.data && response.data.length > 0) {
      const goldData = response.data.flat().find((v) => v.GOLD);

      if (goldData) {
        position = {
          price: Number(goldData.GOLD.LastTradedPrice),
          change: Number(goldData.GOLD.PercentChange),
          lastTradedDate: goldData.GOLD.lasttradeddate,
        };

        console.info(
          `Today's gold market position: ${JSON.stringify(position)}`
        );
      } else {
        console.error(
          `Gold market data not found: ${JSON.stringify(response.data)}`
        );
      }
    } else {
      console.error(`Invalid market data: ${JSON.stringify(response)}`);
    }
  } catch (error) {
    console.error(`Error fetching market data: ${JSON.stringify(error)}`);
  }

  return position;
};

const init = async () => {
  const todayMarketPosition = await getMarketPosition();

  if (todayMarketPosition) {
    const lastTradedDate = new Date(
      todayMarketPosition.lastTradedDate
    ).toLocaleDateString();
    const today = new Date().toLocaleDateString();

    const message =
      lastTradedDate === today
        ? `The price _may_ *${
            todayMarketPosition.change >= 0 ? 'increase' : 'reduce'
          }* _approximately_ by *${Math.abs(
            todayMarketPosition.change
          )}%* tomorrow!`
        : 'The price _expected_ to remain *same* tomorrow!';

    const isSaved = await saveTodayMarketPrice(`${todayMarketPosition.price}`);
    const isSent = await sendMessage(message);

    if (isSaved) {
      console.info('Message saved successfully!');
    } else {
      console.error('Message saving failed!');
    }

    if (isSent) {
      console.info('Message sent successfully!');
    } else {
      console.error('Message sending failed!');
    }
  } else {
    console.error('Market position is not valid!');
  }
};

(async () => await init())();
