import { parseChartFile } from 'scan-chart';

export enum Difficulty {
  easy = 'easy',
  medium = 'medium',
  hard = 'hard',
  expert = 'expert',
}

export type ParsedChart = ReturnType<typeof parseChartFile>;
