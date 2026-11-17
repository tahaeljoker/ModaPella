const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectionString = process.env.MONGO_URI || 'mongodb://localhost:27017/modapella';

/**
 * Global cache for MongoDB connection across serverless invocations.
 * Prevents opening new connection pools on each serverless function request.
 */
let cached = global.mongooseCache;
if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      useNewUrlParser: true,
      useUnifiedTopology: true
    };

    cached.promise = mongoose.connect(connectionString, opts).then((mongooseInstance) => {
      console.log('MongoDB connected successfully');
      return mongooseInstance;
    }).catch((err) => {
      cached.promise = null;
      console.error('MongoDB connection failed:', err.message);
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
};

/**
 * Executes a function inside a MongoDB ACID transaction if the deployment supports it
 * (e.g. MongoDB Atlas Replica Set), or gracefully falls back to executing without a session
 * on standalone instances (e.g. local dev / testing).
 * 
 * @param {Function} fn - async (session) => { ... }
 * @returns {Promise<any>}
 */
const runInTransaction = async (fn) => {
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }

  let session = null;
  let supportsTransactions = true;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch (err) {
    supportsTransactions = false;
    if (session) {
      try { await session.endSession(); } catch (_) {}
      session = null;
    }
  }

  if (!supportsTransactions || !session) {
    // Standalone fallback: execute without session
    return await fn(null);
  }

  try {
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    // Check if error is due to MongoDB deployment not supporting transactions
    const isUnsupported =
      error.message &&
      (error.message.includes('Transactions are not supported') ||
       error.message.includes('replica set') ||
       error.code === 20 ||
       error.codeName === 'IllegalOperation');

    try {
      await session.abortTransaction();
    } catch (_) {}

    if (isUnsupported) {
      // Re-run once without transaction session
      return await fn(null);
    }

    throw error;
  } finally {
    try {
      await session.endSession();
    } catch (_) {}
  }
};

connectDB.connectDB = connectDB;
connectDB.runInTransaction = runInTransaction;

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.runInTransaction = runInTransaction;
