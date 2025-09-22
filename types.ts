
export enum ConversionStatus {
  IDLE,
  MERGING,
  PROCESSING,
  SUCCESS,
  ERROR,
}

export interface TableData {
  headers: string[];
  rows: string[][];
}
