import mongoose from 'mongoose';

export async function connectTestDB(): Promise<void> {
  const uri = process.env.MONGO_TEST_URI;
  if (!uri) {
    throw new Error('MONGO_TEST_URI is not set - is the Jest globalSetup configured?');
  }
  await mongoose.connect(uri);
}

export async function clearTestDB(): Promise<void> {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
}

export async function disconnectTestDB(): Promise<void> {
  await mongoose.disconnect();
}
