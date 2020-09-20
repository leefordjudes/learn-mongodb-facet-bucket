
import { Schema } from 'mongoose';

export const dailyRainfallSchema = new Schema({
  Rainfall: {
    type: Number,
  },
  Date: {
    type: Date,
    index: true,
  },
  Location: {
    type: String,
    index: true,
  },
});