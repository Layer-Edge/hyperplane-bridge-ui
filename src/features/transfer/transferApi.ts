/**
 * API client functions for bridge transfer operations
 */

/**
 * Response type for bridge transfer API
 */
export interface BridgeTransferResponse {
  id: number;
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  amountFormatted: string;
  timestamp: number;
  status: 'pending' | 'distributed' | 'failed';
  edgenTxHash: string;
  binanceTxHash: string | null;
  distributionTxHash: string | null;
  createdAt: string;
  updatedAt: string;
}
