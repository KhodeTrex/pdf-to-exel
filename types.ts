export enum ConversionStatus {
  IDLE,
  MERGING,
  POST_MERGE,
  PROCESSING,
  SUCCESS,
  ERROR,
}

export interface TableData {
  headers: string[];
  rows: string[][];
  isMock?: boolean;
}