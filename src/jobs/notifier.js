const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

require('dotenv').config();

const {
  composeNotificationMessage,
  sendMessage,
} = require('../utils/message-utils');
const { getPriceByDate, saveTodayRetailPrice } = require('../utils/db-utils');
const {
  convertToIST,
  getMeridiem,
  getYesterday,
} = require('../utils/date-utils');

require('../utils/axios-utils');

const GOLD_RETAIL_PRICE_API_URL = process.env.GOLD_RETAIL_PRICE_API_URL || '';
const GOLD_RETAIL_PRICE_API_BACKUP_URL =
  process.env.GOLD_RETAIL_PRICE_API_BACKUP_URL || '';

const parsePrimaryApiResponse = (response) => {
  let price = [];

  if (response.data?.data?.getgoldrates?.Data?.length > 0) {
    const chennaiRates = response.data.data.getgoldrates.Data.find(
      (rate) => rate.BRANCH_CODE === 'CNN'
    );

    if (chennaiRates) {
      if (chennaiRates.GOLD_22KT_RATE) {
        price.push({
          metal: 'Gold',
          purity: '22KT',
          price: chennaiRates.GOLD_22KT_RATE,
        });
      } else {
        console.warn('22KT gold price is not found.');
      }

      if (chennaiRates.GOLD_24KT_RATE) {
        price.push({
          metal: 'Gold',
          purity: '24KT',
          price: chennaiRates.GOLD_24KT_RATE,
        });
      } else {
        console.warn('24KT gold price is not found.');
      }

      if (chennaiRates.GOLD_18KT_RATE) {
        price.push({
          metal: 'Gold',
          purity: '18KT',
          price: chennaiRates.GOLD_18KT_RATE,
        });
      } else {
        console.warn('18KT gold price is not found.');
      }

      if (chennaiRates.SILVER_RATE) {
        price.push({
          metal: 'Silver',
          purity: '92.50',
          price: chennaiRates.SILVER_RATE,
        });
      } else {
        console.warn('Silver price is not found.');
      }

      if (chennaiRates.PLATINUM_RATE) {
        price.push({
          metal: 'Platinum',
          purity: '95.00',
          price: chennaiRates.PLATINUM_RATE,
        });
      } else {
        console.warn('Platinum price is not found.');
      }

      console.info(`Today's rates: ${JSON.stringify(price)}`);
    } else {
      throw new Error(
        `Chennai rates are not available: ${JSON.stringify(
          response.data.data.getgoldrates.Data
        )}`
      );
    }
  } else {
    throw new Error(`Invalid response: ${JSON.stringify(response.data)}`);
  }

  return price;
};

const parseSecondaryApiResponse = (response) => {
  let price = [];

  if (response.data?.Success === true && response.data?.Data) {
    if (response.data.Data.R22KT) {
      price.push({
        metal: 'Gold',
        purity: '22KT',
        price: response.data.Data.R22KT,
      });
    } else {
      console.warn('22KT gold price is not found.');
    }

    if (response.data.Data.R24KT) {
      price.push({
        metal: 'Gold',
        purity: '24KT',
        price: response.data.Data.R24KT,
      });
    } else {
      console.warn('24KT gold price is not found.');
    }

    if (response.data.Data.R18KT) {
      price.push({
        metal: 'Gold',
        purity: '18KT',
        price: response.data.Data.R18KT,
      });
    } else {
      console.warn('18KT gold price is not found.');
    }

    if (response.data.Data.RS925) {
      price.push({
        metal: 'Silver',
        purity: '92.50',
        price: response.data.Data.RS925,
      });
    } else {
      console.warn('Silver price is not found.');
    }

    if (response.data.Data.PT950) {
      price.push({
        metal: 'Platinum',
        purity: '95.00',
        price: response.data.Data.PT950,
      });
    } else {
      console.warn('Platinum price is not found.');
    }

    console.info(`Today's rates: ${JSON.stringify(price)}`);
  } else {
    throw new Error(`Invalid response: ${JSON.stringify(response.data)}`);
  }

  return price;
};

const getRetailPrice = async () => {
  const jar = new CookieJar();
  const client = wrapper(axios.create({ jar }));

  let price = [];

  try {
    const response = await client.get(GOLD_RETAIL_PRICE_API_URL);

    price = parsePrimaryApiResponse(response);
  } catch (error) {
    console.error(
      `Error fetching primary retail data: ${JSON.stringify(error)}`
    );
  }

  if (price.length <= 0) {
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
      console.error(
        `Error fetching secondary retail data: ${JSON.stringify(error)}`
      );
    }
  }

  return price;
};

const init = async () => {
  const price = await getRetailPrice();

  if (price?.length > 0) {
    let previousPrice = await getPriceByDate();
    if (!previousPrice) {
      previousPrice = await getPriceByDate(
        getYesterday(convertToIST(new Date()))
      );
    }

    const session = getMeridiem(convertToIST(new Date()));

    const isSaved = await saveTodayRetailPrice({
      session,
      price,
    });

    let comparisonPrice;

    if (previousPrice && previousPrice.retailPrice.length > 0) {
      comparisonPrice =
        previousPrice.retailPrice.length === 1
          ? previousPrice.retailPrice[0].price
          : previousPrice.retailPrice.find((price) => price.session === 'PM')
              ?.price;
    }

    const isSent = await sendMessage(
      composeNotificationMessage(session, price, comparisonPrice)
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
    console.error('Retail price is not valid!');

    process.exit(1);
  }
};

(async () => await init())();
