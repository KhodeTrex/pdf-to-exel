
export enum ConversionStatus {
  IDLE,
  MERGING,
  POST_MERGE,
  PROCESSING,
  SUCCESS,
  ERROR,
  MERGE_SUCCESS,
}

export interface TableData {
  headers: string[];
  rows: string[][];
}
