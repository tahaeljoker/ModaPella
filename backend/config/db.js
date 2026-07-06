const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectionString = process.env.MONGO_URI || 'mongodb://localhost:27017/modapella';

const connectDB = async () => {
  try {
    await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
