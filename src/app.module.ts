import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import * as model from './model';

const URI = 'mongodb://localhost/RainfallData';

@Module({
  imports: [
    MongooseModule.forRoot(URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    }),
    MongooseModule.forFeature([
      { name: 'DailyRainfall', schema: model.dailyRainfallSchema },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
