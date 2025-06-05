import { TokenAmount } from '@hyperlane-xyz/sdk';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import { useMultiProvider } from '../chains/hooks';
import { getDestinationNativeBalance } from '../tokens/balances';
import { TransferCompletionStage, TransferProgress, TransferStatus } from './types';

export function useRecipientBalanceWatcher(
  destination?: ChainName,
  recipient?: Address,
  balance?: TokenAmount,
  transferStatus?: TransferStatus,
  onTransferComplete?: () => void,
  onProgressUpdate?: (progress: TransferProgress) => void,
) {
  const multiProvider = useMultiProvider();
  const [transferCompleted, setTransferCompleted] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<TransferProgress>({
    stage: TransferCompletionStage.INITIATED,
    percentage: 0,
    message: 'Transfer initiated...',
  });

  const prevRecipientBalance = useRef<{ balance?: TokenAmount; recipient?: string }>({
    balance,
    recipient,
  });

  const startTime = useRef<number>(Date.now());
  const pollInterval = useRef<NodeJS.Timeout>();
  const balanceCheckInterval = useRef<NodeJS.Timeout>();

  // Progress calculation based on status and time elapsed
  const calculateProgress = useCallback(
    (status?: TransferStatus, timeElapsed: number = 0): TransferProgress => {
      const maxEstimatedTime = 180; // 3 minutes in seconds
      const timeProgress = Math.min(timeElapsed / maxEstimatedTime, 0.9); // Cap at 90% for time-based progress

      if (!status) {
        return {
          stage: TransferCompletionStage.INITIATED,
          percentage: 5,
          estimatedTimeRemaining: maxEstimatedTime,
          message: 'Preparing transfer...',
        };
      }

      switch (status) {
        case TransferStatus.Preparing:
        case TransferStatus.CreatingTxs:
          return {
            stage: TransferCompletionStage.INITIATED,
            percentage: 5,
            estimatedTimeRemaining: maxEstimatedTime,
            message: 'Preparing transfer...',
          };

        case TransferStatus.SigningApprove:
          return {
            stage: TransferCompletionStage.INITIATED,
            percentage: 10,
            estimatedTimeRemaining: maxEstimatedTime - 10,
            message: 'Please sign the approval transaction in your wallet...',
          };
        case TransferStatus.SigningRevoke:
        case TransferStatus.SigningTransfer:
          return {
            stage: TransferCompletionStage.INITIATED,
            percentage: 10,
            estimatedTimeRemaining: maxEstimatedTime - 10,
            message: 'Please sign the remote transfer transaction in your wallet...',
          };

        case TransferStatus.ConfirmingApprove:
        case TransferStatus.ConfirmingRevoke:
        case TransferStatus.ConfirmingTransfer:
          return {
            stage: TransferCompletionStage.TRANSACTION_SENT,
            percentage: 25,
            estimatedTimeRemaining: maxEstimatedTime - 30,
            message: 'Transaction confirmed, processing through Hyperlane...',
          };

        case TransferStatus.ConfirmedTransfer:
          return {
            stage: TransferCompletionStage.HYPERLANE_PROCESSING,
            percentage: Math.max(50, timeProgress * 100),
            estimatedTimeRemaining: Math.max(0, maxEstimatedTime - timeElapsed),
            message: 'Processing cross-chain transfer...',
          };

        case TransferStatus.Delivered:
          return {
            stage: TransferCompletionStage.COMPLETED,
            percentage: 100,
            message: 'Transfer completed successfully!',
          };

        case TransferStatus.Failed:
          return {
            stage: TransferCompletionStage.INITIATED,
            percentage: 0,
            message: 'Transfer failed',
          };

        default:
          return {
            stage: TransferCompletionStage.HYPERLANE_PROCESSING,
            percentage: Math.max(30, timeProgress * 100),
            estimatedTimeRemaining: Math.max(0, maxEstimatedTime - timeElapsed),
            message: 'Transfer in progress...',
          };
      }
    },
    [],
  );

  // Update progress based on transfer status
  useEffect(() => {
    if (!transferStatus || transferCompleted) return;

    const timeElapsed = (Date.now() - startTime.current) / 1000;
    const newProgress = calculateProgress(transferStatus, timeElapsed);

    setCurrentProgress(newProgress);
    if (onProgressUpdate) {
      onProgressUpdate(newProgress);
    }
  }, [transferStatus, calculateProgress, onProgressUpdate, transferCompleted]);

  // Monitor balance changes for completion
  useEffect(() => {
    if (transferCompleted) return;

    if (
      recipient &&
      balance &&
      prevRecipientBalance.current.balance &&
      prevRecipientBalance.current.recipient === recipient &&
      balance.token.equals(prevRecipientBalance.current.balance.token) &&
      balance.amount > prevRecipientBalance.current.balance.amount
    ) {
      // Funds received!
      setTransferCompleted(true);

      const completionProgress: TransferProgress = {
        stage: TransferCompletionStage.COMPLETED,
        percentage: 100,
        message: 'Transfer completed successfully!',
      };

      setCurrentProgress(completionProgress);
      if (onProgressUpdate) {
        onProgressUpdate(completionProgress);
      }

      toast.success('🎉 Recipient has received funds, transfer complete!');
      onTransferComplete?.();

      // Clear any polling intervals
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }

      if (balanceCheckInterval.current) {
        clearInterval(balanceCheckInterval.current);
      }
    }

    prevRecipientBalance.current = { balance, recipient };
  }, [balance, recipient, onTransferComplete, onProgressUpdate, transferCompleted]);

  // Active balance polling for transfers in progress
  useEffect(() => {
    if (!destination || !recipient || transferCompleted) return;

    // Only start active polling for confirmed or confirming transfers
    if (
      transferStatus === TransferStatus.ConfirmedTransfer ||
      transferStatus === TransferStatus.ConfirmingTransfer
    ) {
      // Set up polling to check recipient balance
      balanceCheckInterval.current = setInterval(async () => {
        try {
          if (!destination || !recipient) return;

          // Create a transfer form values object for the getDestinationNativeBalance function
          const transferFormValues = {
            origin: destination, // We need to provide this even though it's not used
            destination,
            recipient,
            amount: '0', // Placeholder value
            tokenIndex: 0, // Placeholder value
          };

          // Check the current balance
          const currentBalance = await getDestinationNativeBalance(
            multiProvider,
            transferFormValues,
          );

          // If we have a previous balance to compare with
          if (prevRecipientBalance.current.balance && currentBalance) {
            // Check if balance has increased
            if (currentBalance > prevRecipientBalance.current.balance.amount) {
              // Funds received!
              setTransferCompleted(true);

              const completionProgress: TransferProgress = {
                stage: TransferCompletionStage.COMPLETED,
                percentage: 100,
                message: 'Transfer completed successfully!',
              };

              setCurrentProgress(completionProgress);
              if (onProgressUpdate) {
                onProgressUpdate(completionProgress);
              }

              toast.success('🎉 Recipient has received funds, transfer complete!');
              onTransferComplete?.();

              // Clear polling intervals
              if (balanceCheckInterval.current) {
                clearInterval(balanceCheckInterval.current);
              }

              if (pollInterval.current) {
                clearInterval(pollInterval.current);
              }
            }
          }
        } catch (error) {
          console.error('Error checking recipient balance:', error);
        }
      }, 5000); // Check every 5 seconds

      return () => {
        if (balanceCheckInterval.current) {
          clearInterval(balanceCheckInterval.current);
        }
      };
    }
    return () => {
      if (balanceCheckInterval.current) {
        clearInterval(balanceCheckInterval.current);
      }
    };
  }, [
    destination,
    recipient,
    transferStatus,
    transferCompleted,
    multiProvider,
    onTransferComplete,
    onProgressUpdate,
  ]);

  // Polling for UI progress updates
  useEffect(() => {
    if (!recipient || transferCompleted) return;

    // Start polling when transfer is in progress
    if (
      transferStatus === TransferStatus.ConfirmedTransfer ||
      transferStatus === TransferStatus.ConfirmingTransfer
    ) {
      pollInterval.current = setInterval(() => {
        const timeElapsed = (Date.now() - startTime.current) / 1000;
        const newProgress = calculateProgress(transferStatus, timeElapsed);

        setCurrentProgress(newProgress);
        if (onProgressUpdate) {
          onProgressUpdate(newProgress);
        }
      }, 2000); // Update every 2 seconds
    }

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [recipient, transferStatus, transferCompleted, calculateProgress, onProgressUpdate]);

  return {
    transferCompleted,
    progress: currentProgress,
    isMonitoring: !transferCompleted && !!recipient,
  };
}
