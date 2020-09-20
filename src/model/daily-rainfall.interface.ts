import { Document } from 'mongoose';

export interface DailyRainfall extends Document {
  id: string;
  Rainfall: number;
  Date: Date;
  Location: string;
}