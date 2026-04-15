export type VouchStatus = 0 | 1 | 2 | 3;

export interface VouchData {
  status: VouchStatus;
  category: number;
  timestamp: bigint;
  updatedAt: bigint;
  hidden: boolean;
}
