export interface TransferFormValues {
  origin: ChainName;
  destination: ChainName;
  tokenIndex: number | undefined;
  amount: string;
  recipient: Address;
}

export enum TransferStatus {
  Preparing = 'preparing',
  CreatingTxs = 'creating-txs',
  SigningApprove = 'signing-approve',
  SigningRevoke = 'signing-revoke',
  ConfirmingRevoke = 'confirming-revoke',
  ConfirmingApprove = 'confirming-approve',
  SigningTransfer = 'signing-transfer',
  ConfirmingTransfer = 'confirming-transfer',
  ConfirmedTransfer = 'confirmed-transfer',
  Delivered = 'delivered',
  Failed = 'failed',
}

export const SentTransferStatuses = [TransferStatus.ConfirmedTransfer, TransferStatus.Delivered];

// Statuses considered not pending
export const FinalTransferStatuses = [...SentTransferStatuses, TransferStatus.Failed];

export interface TransferContext {
  status: TransferStatus;
  origin: ChainName;
  destination: ChainName;
  originTokenAddressOrDenom?: string;
  destTokenAddressOrDenom?: string;
  amount: string;
  sender: Address;
  recipient: Address;
  originTxHash?: string;
  msgId?: string;
  timestamp: number;
}

// Enhanced transfer completion stages
export enum TransferCompletionStage {
  INITIATED = 'initiated',
  TRANSACTION_SENT = 'transaction_sent',
  HYPERLANE_PROCESSING = 'hyperlane_processing',
  FUNDS_RECEIVED = 'funds_received',
  COMPLETED = 'completed',
}

// Progress tracking interface
export interface TransferProgress {
  stage: TransferCompletionStage;
  percentage: number;
  estimatedTimeRemaining?: number; // in seconds
  message: string;
}
