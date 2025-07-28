const axios = require('axios');

require('dotenv').config();

const { sendMessage } = require('../utils/message-utils');
const { saveTodayMarketPrice } = require('../utils/db-utils');

require('../utils/axios-utils');

const GOLD_MARKET_PRICE_API_URL = process.env.GOLD_MARKET_PRICE_API_URL || '';
const GOLD_MARKET_PRICE_API_BACKUP_URL =
  process.env.GOLD_MARKET_PRICE_API_BACKUP_URL || '';

const parsePrimaryApiResponse = (response) => {
  let position = null;

  if (response.data) {
    const commodityList = response.data.data?.list;

    if (
      commodityList &&
      Array.isArray(commodityList) &&
      commodityList.length > 0
    ) {
      const goldData = commodityList.find(
        (item) => item.symbol?.toLowerCase()?.replace(/\s/g, '') === 'gold'
      );

      if (goldData) {
        position = {
          price: Number(goldData.lastPrice),
          change: Number(goldData.priceChangePercentage),
          lastTradedDate: response.data.data.lastUpdated.replace('| ', ''),
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
  } else {
    console.error(`Invalid response data: ${JSON.stringify(response)}`);
  }

  return position;
};

const parseSecondaryApiResponse = (response) => {
  let position = null;

  if (
    response.data &&
    Array.isArray(response.data) &&
    response.data.length > 0
  ) {
    const goldData = response.data.flat().find((v) => v.GOLD);

    if (goldData) {
      position = {
        price: Number(goldData.GOLD.LastTradedPrice),
        change: Number(goldData.GOLD.PercentChange),
        lastTradedDate: goldData.GOLD.lasttradeddate,
      };

      console.info(`Today's gold market position: ${JSON.stringify(position)}`);
    } else {
      console.error(
        `Gold market data not found: ${JSON.stringify(response.data)}`
      );
    }
  } else {
    console.error(`Invalid response/market data: ${JSON.stringify(response)}`);
  }

  return position;
};

const getMarketPosition = async () => {
  let position = null;

  try {
    const response = await axios.get(GOLD_MARKET_PRICE_API_URL);

    position = parsePrimaryApiResponse(response);
  } catch (error) {
    console.error(`Error fetching market data: ${JSON.stringify(error)}`);
  }

  if (!position) {
    console.info('Primary API failed. Falling back to backup API...');

    try {
      const response = await axios.get(GOLD_MARKET_PRICE_API_BACKUP_URL);

      position = parseSecondaryApiResponse(response);
    } catch (error) {
      console.error(`Error fetching market data: ${JSON.stringify(error)}`);
    }
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
      lastTradedDate === today || todayMarketPosition.change === 0
        ? `The price _may_ *${
            todayMarketPosition.change > 0 ? 'increase' : 'reduce'
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

      process.exit(1);
    }
  } else {
    console.error('Market position is not valid!');

    process.exit(1);
  }
};

(async () => await init())();
