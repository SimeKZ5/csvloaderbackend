const mongoose = require("mongoose");
require("dotenv").config();

const constructMongoURL = () => {
  const username = encodeURIComponent(process.env.MONGO_USERNAME);
  const password = encodeURIComponent(process.env.MONGO_PASSWORD);
  const cluster = process.env.MONGO_CLUSTER;
  const dbName = process.env.MONGO_DB_NAME;
  const retryWrites = process.env.MONGO_RETRY_WRITES;
  const appName = encodeURIComponent(process.env.MONGO_APP_NAME);

  return `mongodb+srv://${username}:${password}@${cluster}?retryWrites=${retryWrites}&w=majority&appName=${appName}`;
};

const URL = constructMongoURL();

const connectCorpusDB = async () => {
  try {
    const conn = await mongoose.connect(URL);
    console.log("MongoDB Connected");
  } catch (err) {
    console.error(`Error ${err}`);
    process.exit(1);
  }
};

module.exports = connectCorpusDB;
