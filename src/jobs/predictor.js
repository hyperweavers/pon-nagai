const axios = require('axios');

require('dotenv').config();

const {
  composePredictionMessage,
  sendMessage,
} = require('../utils/message-utils');
const { saveTodayMarketPrice } = require('../utils/db-utils');

require('../utils/axios-utils');

const GOLD_MARKET_PRICE_API_URL = process.env.GOLD_MARKET_PRICE_API_URL || '';
const GOLD_MARKET_PRICE_API_BACKUP_URL =
  process.env.GOLD_MARKET_PRICE_API_BACKUP_URL || '';

const parsePrimaryApiResponse = (response) => {
  let position = [];

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
      const silverData = commodityList.find(
        (item) => item.symbol?.toLowerCase()?.replace(/\s/g, '') === 'silver'
      );

      if (goldData) {
        position.push({
          metal: 'Gold',
          price: Number(goldData.lastPrice),
          change: Number(goldData.priceChangePercentage),
          lastTradedDate: response.data.data.lastUpdated.replace('| ', ''),
        });

        console.info(
          `Today's gold market position: ${JSON.stringify(
            position[position.length - 1]
          )}`
        );
      } else {
        throw new Error(
          `Gold market data not found: ${JSON.stringify(response.data)}`
        );
      }

      if (silverData) {
        position.push({
          metal: 'Silver',
          price: Number(silverData.lastPrice),
          change: Number(silverData.priceChangePercentage),
          lastTradedDate: response.data.data.lastUpdated.replace('| ', ''),
        });

        console.info(
          `Today's silver market position: ${JSON.stringify(
            position[position.length - 1]
          )}`
        );
      } else {
        throw new Error(
          `Silver market data not found: ${JSON.stringify(response.data)}`
        );
      }
    } else {
      throw new Error(`Invalid market data: ${JSON.stringify(response)}`);
    }
  } else {
    throw new Error(`Invalid response data: ${JSON.stringify(response)}`);
  }

  return position;
};

const parseSecondaryApiResponse = (response) => {
  let position = [];

  if (response.data) {
    try {
      const data = JSON.parse(response.data.replace('var etmarketdata=', ''));

      position = data.map((item) => ({
        metal: item.NewDataSet.Table.CommodityName,
        price: item.NewDataSet.Table.LastTradedPrice,
        change: item.NewDataSet.Table.PercentChange,
        lastTradedDate: item.NewDataSet.Table.DateTime,
      }));
    } catch (error) {
      throw new Error(
        `Unable to parse response data: ${JSON.stringify(response.data)}`
      );
    }
  } else {
    throw new Error(
      `Invalid response/market data: ${JSON.stringify(response)}`
    );
  }

  return position;
};

const getMarketPosition = async () => {
  let position = [];

  try {
    const response = await axios.get(GOLD_MARKET_PRICE_API_URL);

    position = parsePrimaryApiResponse(response);
  } catch (error) {
    console.error(
      `Error fetching primary market data: ${JSON.stringify(error)}`
    );
  }

  if (position.length <= 0) {
    console.info('Primary API failed. Falling back to backup API...');

    try {
      const response = await axios.get(GOLD_MARKET_PRICE_API_BACKUP_URL);

      position = parseSecondaryApiResponse(response);
    } catch (error) {
      console.error(
        `Error fetching secondary market data: ${JSON.stringify(error)}`
      );
    }
  }

  return position;
};

const init = async () => {
  const todayMarketPosition = await getMarketPosition();

  if (todayMarketPosition?.length > 0) {
    const isSaved = await saveTodayMarketPrice(todayMarketPosition);
    const isSent = await sendMessage(
      composePredictionMessage(todayMarketPosition)
    );

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
