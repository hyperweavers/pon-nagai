const { MongoClient, ServerApiVersion } = require('mongodb');

require('dotenv').config();

const { formatDateForDatabase } = require('../utils/date-utils');

const DB_URL = process.env.DB_URL || '';
const DB_NAME = process.env.DB_NAME || '';
const DB_COLLECTION = process.env.DB_COLLECTION || '';

const saveTodayRetailPrice = async (price) => {
  const client = new MongoClient(DB_URL, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  const date = formatDateForDatabase(new Date());

  let result;

  try {
    await client.connect();

    const db = client.db(DB_NAME);

    result = await db.collection(DB_COLLECTION).insertOne({
      date,
      retailPrice: price,
    });
  } catch (error) {
    console.error(`Error querying retail price: ${JSON.stringify(error)}`);
  } finally {
    await client.close();
  }

  return !!result;
};

const saveTodayMarketPrice = async (price) => {
  const client = new MongoClient(DB_URL, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  const date = formatDateForDatabase(new Date());

  let result;

  try {
    await client.connect();

    const db = client.db(DB_NAME);

    result = await db.collection(DB_COLLECTION).findOneAndUpdate(
      {
        date,
      },
      {
        $set: { marketPrice: price },
      }
    );
  } catch (error) {
    console.error(`Error querying market price: ${JSON.stringify(error)}`);
  } finally {
    await client.close();
  }

  return !!result;
};

module.exports = {
  saveTodayRetailPrice,
  saveTodayMarketPrice,
};
