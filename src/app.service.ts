import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as _ from 'lodash';
import * as model from './model';
@Injectable()
export class AppService {
  constructor(
    @InjectModel('DailyRainfall')
    private dailyRainfallModel: Model<model.DailyRainfall>,
  ) { }

  async test() {
    // return await this.dailyRainfallModel.collection.name;
    // const rainfall = {
    //   Rainfall: 0.2,
    //   Date: new Date(Date.UTC(1930, 1, 1, 0, 0, 0, 0)),
    //   Location: 'SEE'
    // };
    // await this.dailyRainfallModel.create(rainfall);
    const rainfalls = await this.dailyRainfallModel.find({}).limit(10);
    console.log(rainfalls);
    return _.map(rainfalls, elm => _.pick(elm, ['id', 'Rainfall', 'Date', 'Location']));
  }

  async learnAggregate(stage: string) {

    const query1 = () => {
      // just adding fields Month, Year, MonthYear to use below stages
      return [
        {
          $addFields: {
            Month: {
              $month: '$Date'
            },
            Year: {
              $year: '$Date'
            },
            MonthYear: {
              $dateToString: {
                format: '%m:%Y',
                date: '$Date'
              }
            }
          }
        },
        {
          $unset: '_id'
        },
      ];
    };
    const query2 = () => {
      // grand totals for the entire series
      return [
        {
          $group: {
            _id: null,
            averageRain: {
              $avg: '$Rainfall'
            },
            maxRain: {
              $max: '$Rainfall'
            },
            totalRain: {
              $sum: '$Rainfall'
            }
          }
        },
        {
          $unset: '_id'
        },
      ];
    };

    const query3 = () => {
      // column totals getting aggregation of each month 
      return [
        {
          $group: {
            _id: '$Month',
            averageRain: {
              $avg: '$Rainfall'
            },
            Rainfall: {
              $sum: '$Rainfall'
            },
            maxRain: {
              $max: '$Rainfall'
            }
          }
        },
        { $sort: { '_id': 1 } },
        {
          $addFields: {
            month: {
              $let: {
                vars: {
                  monthsInString: [, 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                },
                in: {
                  $arrayElemAt: ['$$monthsInString', '$_id']
                }
              }
            }
          }
        },
        {
          $unset: '_id'
        },
      ];
    };
    const query4 = () => {
      // column totals getting aggregation of each year 
      return [
        {
          $group: {
            _id: '$Year',
            averageRain: {
              $avg: '$Rainfall'
            },
            Rainfall: {
              $sum: '$Rainfall'
            },
            maxRain: {
              $max: '$Rainfall'
            }
          }
        },
        { $sort: { '_id': 1 } },
        { $addFields: { Year: '$_id' } },
        {
          $unset: '_id'
        },
      ];
    };

    const query5 = () => {
      // column totals getting aggregation of each month and year 
      return [
        {
          $group: {
            _id: '$MonthYear',
            averageRain: {
              $avg: '$Rainfall'
            },
            Rainfall: {
              $sum: '$Rainfall'
            },
            maxRain: {
              $max: '$Rainfall'
            }
          }
        },
        { $sort: { '_id': 1 } },
        { $addFields: { MonthYear: '$_id' } },
        {
          $unset: '_id'
        },
      ];
    };

    const query6 = () => {
      // using $facet, we can do the following in one stage.
      // grand totals for the entire series
      // column totals getting aggregation of each month
      // column totals getting aggregation of each year
      // column totals getting aggregation of each month and year
      return [
        {
          $facet: {
            Totals: [
              ...query2(),
            ],
            Monthly: [
              ...query3(),
            ],
            Yearly: [
              ...query4(),
            ],
            MonthYear: [
              ...query5(),
            ],
          },
        },
      ];
    };
    const boundaries = [0, 5, 10, 15, 20, 25, 30, 35, 40];
    const query7 = () => {
      // The $bucket aggregation can provide some features that are hard to do any other way
      return [
        {
          $bucket: {
            groupBy: "$Rainfall", // group by daily rainfall
            boundaries: [...boundaries], // bucket size is 0-to-5, 5-to-10, ... 40-to-45
            default: `Above ${boundaries[boundaries.length - 1]}`, // just a description for values that not falls on boundries, its like default case in switch-case
            output: { count: { $sum: 1 } } // the number in each category
          },
        },
        {
          $addFields: { min: '$_id' },
        },
        {
          $unset: '_id',
        },
        {
          $addFields: {
            minIndex: { $indexOfArray: [boundaries, '$min'] },
          },
        },
        {
          $addFields: {
            maxIndex: {
              $cond: {
                if: { $ne: ['$minIndex', -1] },
                then: { $add: ['$minIndex', 1] },
                else: -1,
              },
            },
          },
        },
        {
          $addFields: {
            max: {
              $cond: {
                if: { $ne: ['$maxIndex', -1] },
                then: { $arrayElemAt: [[...boundaries], '$maxIndex'] },
                else: { $concat: ['Above ', { $toString: boundaries[boundaries.length - 1] }] },
              },
            },
          },
        },
        {
          $project: {
            min: {
              $cond: {
                if: { $eq: ['$maxIndex', '$minIndex'] },
                then: boundaries[boundaries.length - 1],
                else: '$min',
              },
            },
            max: 1,
            count: 1,
          },
        }
      ];
    };

    const query7a = () => {
      // The $bucket aggregation can provide some features that are hard to do any other way
      return [
        {
          $bucket: {
            groupBy: "$Rainfall", // group by daily rainfall
            boundaries: [...boundaries], // bucket size is 0-to-5, 5-to-10, ... 40-to-45
            default: `Above ${boundaries[boundaries.length - 1]}`, // just a description for values that not falls on boundries, its like default case in switch-case
            output: { count: { $sum: 1 } } // the number in each category
          },
        },
        {
          $addFields: { min: '$_id' },
        },
        {
          $unset: '_id',
        }
      ];
    };

    const query8 = () => {
      // The $bucketAuto aggregation can provide same feature of bucket, but boundries decides by mongodb automatically
      return [
        {
          $bucketAuto: {
            groupBy: "$Rainfall", // group by daily rainfall
            buckets: 3,
          },
        },
        {
          $addFields: { min: '$_id.min', max: '$_id.max' },
        },
        {
          $unset: '_id'
        },
      ];
    };

    const query9 = () => {
      // Pipeline
      return [
        // Stage 1
        {
          $addFields: {
            Month: { $month: '$Date' }, Year: { $year: '$Date' }
          }
        },

        // Stage 2
        {
          $facet: {// average rainfall and max rainfall of the series
            // the weather by the quarter      
            ByQuarter: [
              {
                $bucket: {
                  groupBy: '$Month',
                  boundaries: [0, 4, 7, 10, 13],
                  default: 'Other',
                  output: {
                    TotalRainfall: { $sum: '$Rainfall' }
                  }
                }
              }
            ],
            //The weather for each decade
            ByDecade: [
              {
                $bucket: {
                  groupBy: '$Year',
                  boundaries: [1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020],
                  default: 'later',
                  output: {
                    TotalRainfall: { $sum: '$Rainfall' },
                    MaxRainfall: { $max: '$Rainfall' },
                    AvgRainfall: { $avg: '$Rainfall' }
                  }
                }
              }
            ],
            //The histogram for weather
            'Rainfall Frequency': [
              {
                $bucket: {
                  groupBy: '$Rainfall', // group by daily rainfall
                  boundaries: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45],
                  default: 'Above 45', // just in case!
                  output: { count: { $sum: 1 } } // the number in each category
                }
              }
            ]

          }
        },
      ];
    };

    let result = [];
    let description = '';
    let summary = {};
    switch (stage) {
      case '1':
        result = await this.dailyRainfallModel.aggregate(query1()).limit(100);
        summary = {
          NoOfRecords: result.length,
          description: 'Added fields of Month, Year, MonthYear',
        };
        break;
      case '2':
        result = await this.dailyRainfallModel.aggregate([...query1(), ...query2()]);
        summary = {
          NoOfRecords: result.length,
          description: `Added fields of Month, Year, MonthYear 
          \n and aggregated result of grand totals for the entire series`,
        };
        break;
      case '3':
        result = await this.dailyRainfallModel.aggregate([...query1(), ...query3()]);
        summary = {
          NoOfRecords: result.length,
          description: `Added fields of Month, Year, MonthYear 
          \n and aggregated result of column totals of each month`,
        };
        break;
      case '4':
        result = await this.dailyRainfallModel.aggregate([...query1(), ...query4()]);
        summary = {
          NoOfRecords: result.length,
          description: `Added fields of Month, Year, MonthYear 
          \n and aggregated result of column totals of each year`,
        };
        break;
      case '5':
        result = await this.dailyRainfallModel.aggregate([...query1(), ...query5()]);
        summary = {
          NoOfRecords: result.length,
          description: `Added fields of Month, Year, MonthYear 
          \n and aggregated result of column totals of each month and year`,
        };
        break;
      case 'facet':
        result = await this.dailyRainfallModel.aggregate([...query1(), ...query6()]);
        summary = {
          NoOfRecords: result.length,
          NoOfRecordsInTotals: result[0].Totals.length,
          NoOfRecordsInMonthly: result[0].Monthly.length,
          NoOfRecordsInYearly: result[0].Yearly.length,
          NoOfRecordsInMonthYear: result[0].MonthYear.length,
          description: `Added fields of Month, Year, MonthYear,
          and aggregated result of grand totals for the entire series,
          and aggregated result of column totals of each month,
          and aggregated result of column totals of each year,
          and aggregated result of column totals of each month and year`,
        };
        break;
      case 'bucket':
        result = await this.dailyRainfallModel.aggregate([...query1(), ...query7()]);
        summary = {
          NoOfRecords: result.length,
          description: `The $bucket aggregation can provide some features that are hard to do any other way`,
        };
        break;
      case 'simple-bucket':
        result = await this.dailyRainfallModel.aggregate([...query1(), ...query7a()]);
        summary = {
          NoOfRecords: result.length,
          description: `The $bucket aggregation can provide some features that are hard to do any other way`,
        };
        break;
      case 'bucket-auto':
        result = await this.dailyRainfallModel.aggregate([...query8()]);
        summary = {
          NoOfRecords: result.length,
          description: `The $bucket aggregation can provide some features that are hard to do any other way`,
        };
        break;
      case 'facet-and-bucket':
        result = await this.dailyRainfallModel.aggregate([...query9()]);
        summary = {
          NoOfRecords: result.length,
          description: `Using $facet and $bucket together`,
        };
        break;
      default:
        break;
    }
    return { summary, result };
  }
}
