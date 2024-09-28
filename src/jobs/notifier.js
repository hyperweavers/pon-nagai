const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

require('dotenv').config();

const { sendMessage } = require('../utils/message-utils');
const { saveTodayRetailPrice } = require('../utils/db-utils');

const GOLD_RETAIL_PRICE_API_URL = process.env.GOLD_RETAIL_PRICE_API_URL || '';

const GRAMS_PER_SAVARAN = 8;
const NEW_LINE = '%0A';

const getRetailPrice = async () => {
  const jar = new CookieJar();
  const client = wrapper(axios.create({ jar }));

  let price = '';

  try {
    const response = await client.get(GOLD_RETAIL_PRICE_API_URL);
    if (response.data && response.data['22kt']) {
      price = response.data['22kt'].match(/[\d]+/g).slice(0, -1).join('');

      console.info(`Today's gold retail price: Rs.${price}/gram`);
    } else {
      console.error(`Invalid retail data: ${JSON.stringify(response)}`);
    }
  } catch (error) {
    console.error(`Error fetching retail data: ${JSON.stringify(error)}`);
  }

  return price;
};

const init = async () => {
  const price = await getRetailPrice();

  if (price) {
    const isSaved = await saveTodayRetailPrice(price);
    const isSent = await sendMessage(
      `Today's 22K 916 Gold Price:${NEW_LINE}*Rs.${price}/Gram*${NEW_LINE}*Rs.${
        price * GRAMS_PER_SAVARAN
      }/Savaran*`
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
    }
  } else {
    console.error('Retail price is not valid!');
  }
};

(async () => await init())();
