const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

require('dotenv').config();

const { composeNotificationMessage, sendMessage } = require('../utils/message-utils');
const { saveTodayRetailPrice } = require('../utils/db-utils');

require('../utils/axios-utils');

const GOLD_RETAIL_PRICE_API_URL = process.env.GOLD_RETAIL_PRICE_API_URL || '';
const GOLD_RETAIL_PRICE_API_BACKUP_URL =
  process.env.GOLD_RETAIL_PRICE_API_BACKUP_URL || '';

const parsePrimaryApiResponse = (response) => {
  let price = [];

  if (response.data?.status === 'OK' && response.data?.payload) {
    let responseJson = '';

    try {
      responseJson = JSON.parse(response.data.payload);
    } catch (error) {
      console.error(
        `Error parsing price data.\nData: ${
          response.data.payload
        }\nError: ${JSON.stringify(error)}`
      );
    }

    if (responseJson && responseJson?.payload?.metalRateList?.length > 0) {
      price = responseJson.payload.metalRateList.map((data) => ({
        metal: data.metalTypeName,
        purity:
          data.metalTypeName.toLowerCase() === 'platinum'
            ? '95.00'
            : data.purityName,
        price: data.rate,
      }));
    }
  }

  return price;
};

const parseSecondaryApiResponse = (response) => {
  let price = [];

  if (response.data?.Success === true && response.data?.Data) {
    if (response.data.Data.R24KT) {
      price.push({
        metal: 'Gold',
        purity: '24KT',
        price: response.data.Data.R24KT,
      });
    }

    if (response.data.Data.R22KT) {
      price.push({
        metal: 'Gold',
        purity: '22KT',
        price: response.data.Data.R22KT,
      });
    }

    if (response.data.Data.R18KT) {
      price.push({
        metal: 'Gold',
        purity: '18KT',
        price: response.data.Data.R18KT,
      });
    }

    if (response.data.Data.RS925) {
      price.push({
        metal: 'Silver',
        purity: '92.50',
        price: response.data.Data.RS925,
      });
    }

    if (response.data.Data.PT950) {
      price.push({
        metal: 'Platinum',
        purity: '95.00',
        price: response.data.Data.PT950,
      });
    }
  }

  return price;
};

const getRetailPrice = async () => {
  const jar = new CookieJar();
  const client = wrapper(axios.create({ jar }));

  let price = [];

  try {
    const response = await client.post(
      GOLD_RETAIL_PRICE_API_URL,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    price = parsePrimaryApiResponse(response);
  } catch (error) {
    console.error(`Error fetching retail data: ${JSON.stringify(error)}`);
  }

  if (!price) {
    console.info('Primary API failed. Falling back to backup API...');

    try {
      const response = await client.post(
        GOLD_RETAIL_PRICE_API_BACKUP_URL,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      price = parseSecondaryApiResponse(response);
    } catch (error) {
      console.error(`Error fetching retail data: ${JSON.stringify(error)}`);
    }
  }

  return price;
};

const init = async () => {
  const price = await getRetailPrice();

  if (price?.length > 0) {
    const isSaved = await saveTodayRetailPrice(price);
    const isSent = await sendMessage(composeNotificationMessage(price));

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
    console.error('Retail price is not valid!');

    process.exit(1);
  }
};

(async () => await init())();
