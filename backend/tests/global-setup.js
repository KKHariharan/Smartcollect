const { MongoMemoryReplSet } = require('mongodb-memory-server');

module.exports = async function globalSetup() {
  const mongod = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  globalThis.__MONGOD__ = mongod;
  process.env.MONGO_TEST_URI = mongod.getUri();
};
