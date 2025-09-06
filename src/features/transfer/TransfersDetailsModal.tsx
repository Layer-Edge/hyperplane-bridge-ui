import { ProtocolType } from '@hyperlane-xyz/utils';
import {
  IconButton,
  MessageStatus,
  MessageTimeline,
  Modal,
  useAccountForChain,
  useMessageTimeline,
  useTimeout,
  useWalletDetails,
} from '@hyperlane-xyz/widgets';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChainLogo } from '../../components/icons/ChainLogo';
import { TokenIcon } from '../../components/icons/TokenIcon';
import { WARP_QUERY_PARAMS } from '../../consts/args';
import { config } from '../../consts/config';
import copyIcon from '../../images/icons/copy-icon.svg';
import LinkIcon from '../../images/icons/external-link-icon.svg';
import tokenTransfer from '../../images/icons/token-select-icon.svg';
import tokenTransferSuccess from '../../images/icons/token-transfer-success.svg';
import transferFailed from '../../images/icons/transfer-failed.svg';
import { formatTimestamp } from '../../utils/date';
import { getHypExplorerLink } from '../../utils/links';
import { logger } from '../../utils/logger';
import { getQueryParams } from '../../utils/queryParams';
import { useMultiProvider } from '../chains/hooks';
import { hasPermissionlessChain } from '../chains/utils';
import { useDestinationBalance } from '../tokens/balances';
import { getInitialTokenIndex, tryFindToken, useWarpCore } from '../tokens/hooks';
import { useTransferData } from './hooks';
import {
  TransferCompletionStage,
  TransferContext,
  TransferProgress,
  TransferStatus,
} from './types';
import { useRecipientBalanceWatcher } from './useBalanceWatcher';
import {
  checkIsEdgenToBsc,
  getTransferStatusLabel,
  isTransferFailed,
  isTransferSent,
  mapBridgeStatusToTransferStatus,
} from './utils';

// Progress Bar Component
export function TransferProgressBar({
  progress,
  showEstimatedTime = true,
  className = '',
}: {
  progress: TransferProgress;
  showEstimatedTime?: boolean;
  className?: string;
}) {
  const formatTimeRemaining = (seconds?: number) => {
    if (!seconds || seconds <= 0) return null;

    if (seconds < 60) {
      return `~${Math.ceil(seconds)}s remaining`;
    } else {
      const minutes = Math.ceil(seconds / 60);
      return `~${minutes}m remaining`;
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">{progress.message}</span>
        {showEstimatedTime && progress.estimatedTimeRemaining && (
          <span className="text-xs text-gray-400">
            {formatTimeRemaining(progress.estimatedTimeRemaining)}
          </span>
        )}
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-700">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ease-out ${
            progress.stage === TransferCompletionStage.COMPLETED ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{
            width: `${Math.min(progress.percentage, 100)}%`,
            boxShadow: progress.percentage > 0 ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none',
          }}
        />
      </div>

      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-gray-500">{progress.percentage.toFixed(0)}% complete</span>
        {progress.stage === TransferCompletionStage.COMPLETED && (
          <span className="text-xs font-medium text-green-400">✓ Completed</span>
        )}
      </div>
    </div>
  );
}

export function TransfersDetailsModal({
  isOpen,
  onClose,
  transfer,
  // recipientBalance, // Add this prop to pass recipient balance
}: {
  isOpen: boolean;
  onClose: () => void;
  transfer: TransferContext;
  // recipientBalance?: TokenAmount; // Optional recipient balance
}) {
  const multiProvider = useMultiProvider();
  const [fromUrl, setFromUrl] = useState<string>('');
  const [toUrl, setToUrl] = useState<string>('');
  const [originTxUrl, setOriginTxUrl] = useState<string>('');

  // Add state for balance confirmation
  const [balanceConfirmedSuccess, setBalanceConfirmedSuccess] = useState(false);

  const {
    status,
    origin,
    destination,
    amount,
    sender,
    recipient,
    originTokenAddressOrDenom,
    originTxHash,
    msgId,
    timestamp,
  } = transfer || {};

  // Check if this is an Edgen to BSC route
  const isEdgenToBsc = useMemo(() => {
    return checkIsEdgenToBsc(origin, destination);
  }, [origin, destination]);

  // Use the custom hook to fetch transfer data
  const { data: bridgeTransferData, isLoading: isLoadingBridgeData } = useTransferData(
    originTxHash,
    isEdgenToBsc && isOpen,
  );

  // Map the bridge API status and transfer status together for Edgen to BSC transfers
  const effectiveStatus = useMemo(() => {
    // For Edgen to BSC, show the original transfer status during signing/preparing stages
    if (isEdgenToBsc) {
      // If we're in an early stage (preparing, signing, confirming), use the transfer status
      if (
        status === TransferStatus.Preparing ||
        status === TransferStatus.SigningTransfer ||
        status === TransferStatus.ConfirmingTransfer
      ) {
        return status;
      }

      // If we have bridge data and we're past the initial stages, use the bridge status
      if (bridgeTransferData) {
        return mapBridgeStatusToTransferStatus(bridgeTransferData.status);
      }

      // If we're in confirmed stage but no bridge data yet, keep showing confirmed
      if (status === TransferStatus.ConfirmedTransfer) {
        return status;
      }
    }

    return status;
  }, [isEdgenToBsc, bridgeTransferData, status]);

  const warpCore = useWarpCore();
  const params = getQueryParams();

  const isChainKnown = multiProvider.hasChain(origin);
  const account = useAccountForChain(multiProvider, isChainKnown ? origin : undefined);
  const walletDetails = useWalletDetails()[account?.protocol || ProtocolType.Ethereum];
  const defaultOriginToken = config.defaultOriginChain
    ? warpCore.getTokensForChain(config.defaultOriginChain)?.[0]
    : undefined;
  const tokenIndex = getInitialTokenIndex(
    warpCore,
    params.get(WARP_QUERY_PARAMS.TOKEN),
    origin,
    destination,
    defaultOriginToken,
    config.defaultDestinationChain,
  );

  const { balance: recipientBalance } = useDestinationBalance({
    destination,
    recipient,
    tokenIndex,
    origin,
    amount: '0',
  });

  const setBalanceConfirmedSuccessCallback = useCallback(() => {
    setBalanceConfirmedSuccess(true);
  }, []);

  // Use the enhanced balance watcher to detect when transfer is truly complete
  const { transferCompleted, progress, isMonitoring } = useRecipientBalanceWatcher(
    destination,
    recipient,
    recipientBalance,
    effectiveStatus, // Use the effective status that might come from bridge API
    setBalanceConfirmedSuccessCallback,
  );

  const getMessageUrls = useCallback(async () => {
    try {
      if (originTxHash) {
        const originTxUrl = multiProvider.tryGetExplorerTxUrl(origin, { hash: originTxHash });
        if (originTxUrl) setOriginTxUrl(fixDoubleSlash(originTxUrl));
      }
      const [fromUrl, toUrl] = await Promise.all([
        multiProvider.tryGetExplorerAddressUrl(origin, sender),
        multiProvider.tryGetExplorerAddressUrl(destination, recipient),
      ]);
      if (fromUrl) setFromUrl(fixDoubleSlash(fromUrl));
      if (toUrl) setToUrl(fixDoubleSlash(toUrl));
    } catch (error) {
      logger.error('Error fetching URLs:', error);
    }
  }, [sender, recipient, originTxHash, multiProvider, origin, destination]);

  useEffect(() => {
    if (!transfer) return;
    getMessageUrls().catch((err) =>
      logger.error('Error getting message URLs for details modal', err),
    );
  }, [transfer, getMessageUrls]);

  const isAccountReady = !!account?.isReady;
  const connectorName = walletDetails.name || 'wallet';
  const token = tryFindToken(warpCore, origin, originTokenAddressOrDenom);
  const isPermissionlessRoute = hasPermissionlessChain(multiProvider, [destination, origin]);

  // Enhanced logic: consider both normal transfer completion and bridge API status
  const isSent =
    transferCompleted ||
    (isTransferSent(effectiveStatus) && !recipientBalance) ||
    (isEdgenToBsc && bridgeTransferData?.status === 'distributed');

  const isFailed =
    (isTransferFailed(effectiveStatus) && !transferCompleted) ||
    (isEdgenToBsc && bridgeTransferData?.status === 'failed');

  // Determine if transfer is in a final state
  const isFinal =
    transferCompleted ||
    isSent ||
    isFailed ||
    (isEdgenToBsc &&
      (bridgeTransferData?.status === 'distributed' || bridgeTransferData?.status === 'failed'));

  // Check if the transfer is in early stages (preparing, signing, confirming)
  const isEarlyStage =
    effectiveStatus === TransferStatus.Preparing ||
    effectiveStatus === TransferStatus.SigningTransfer ||
    effectiveStatus === TransferStatus.ConfirmingTransfer;

  // In-progress state for Edgen-BSC when transaction confirmed but distribution pending
  const isPendingDistribution =
    isEdgenToBsc &&
    effectiveStatus === TransferStatus.ConfirmedTransfer &&
    (!bridgeTransferData || bridgeTransferData.status === 'pending');

  // Get the status description based on bridge data if available
  const statusDescription = useMemo(() => {
    if (isEdgenToBsc) {
      // For early stages, show appropriate wallet action messages
      if (effectiveStatus === TransferStatus.Preparing) {
        return 'Preparing transaction...';
      } else if (effectiveStatus === TransferStatus.SigningTransfer) {
        return `Please sign the transaction with your ${connectorName}`;
      } else if (effectiveStatus === TransferStatus.ConfirmingTransfer) {
        return 'Confirming transaction...';
      }

      // For confirmed or later stages, use bridge data status
      if (bridgeTransferData) {
        return getEdgenToBscStatusDescription(bridgeTransferData.status);
      } else if (effectiveStatus === TransferStatus.ConfirmedTransfer) {
        return 'Transaction confirmed. Waiting for distribution...';
      }
    }

    return getTransferStatusLabel(
      balanceConfirmedSuccess ? TransferStatus.ConfirmedTransfer : effectiveStatus,
      connectorName,
      isPermissionlessRoute,
      isAccountReady,
    );
  }, [
    isEdgenToBsc,
    effectiveStatus,
    bridgeTransferData,
    balanceConfirmedSuccess,
    connectorName,
    isPermissionlessRoute,
    isAccountReady,
  ]);

  // Calculate progress for feeless bridge stages
  const gaslessBridgeProgress = useMemo(() => {
    if (!isEdgenToBsc) return null;

    // Define progress for each early stage
    if (effectiveStatus === TransferStatus.Preparing) {
      return {
        message: 'Preparing your transfer',
        percentage: 10,
        stage: TransferCompletionStage.INITIATED,
        estimatedTimeRemaining: 10,
      };
    } else if (effectiveStatus === TransferStatus.SigningTransfer) {
      return {
        message: 'Please sign with your wallet',
        percentage: 20,
        stage: TransferCompletionStage.INITIATED,
        estimatedTimeRemaining: 30,
      };
    } else if (effectiveStatus === TransferStatus.ConfirmingTransfer) {
      return {
        message: 'Confirming transaction',
        percentage: 30,
        stage: TransferCompletionStage.TRANSACTION_SENT,
        estimatedTimeRemaining: 20,
      };
    } else if (isPendingDistribution) {
      return {
        message: 'Waiting for distribution',
        percentage: 50,
        stage: TransferCompletionStage.HYPERLANE_PROCESSING,
        estimatedTimeRemaining: undefined, // Unknown time for distribution
      };
    }

    return null;
  }, [isEdgenToBsc, effectiveStatus, isPendingDistribution]);

  const showSignWarning = useSignIssueWarning(effectiveStatus);

  const date = useMemo(
    () => (timestamp ? formatTimestamp(timestamp) : formatTimestamp(new Date().getTime())),
    [timestamp],
  );

  const explorerLink = getHypExplorerLink(multiProvider, origin, msgId);

  return (
    <Modal
      isOpen={isOpen}
      dialogClassname="dialog-container"
      close={onClose}
      panelClassname="p-4 md:p-5 max-w-sm modal-conainer"
    >
      {/* Token Amount Display */}
      <div className="flex w-full items-center justify-center p-3">
        <TokenIcon token={token} size={48} />
        <div className="items ml-2 flex items-baseline text-[36px] font-[500] text-white">
          <span>{amount}</span>
          <span className="ml-1">{token?.symbol}</span>
        </div>
      </div>

      {/* Transfer Visual */}
      <div className="mt-4 flex items-center justify-center">
        <div className="mr-2 flex flex-col items-center">
          <div className="rounded-full p-[2px]" style={{ border: '2px solid #707997' }}>
            <ChainLogo chainName={origin} size={40} />
          </div>
        </div>
        <div className="flex">
          {isFinal ? (
            <Image
              src={isFailed ? transferFailed : tokenTransferSuccess}
              width={100}
              alt="Token transfer icon"
            />
          ) : (
            <Image src={tokenTransfer} width={100} alt="Token transfer icon" />
          )}
        </div>
        <div className="ml-2 flex flex-col items-center">
          <div className="rounded-full p-[2px]" style={{ border: '2px solid #707997' }}>
            <ChainLogo chainName={destination} size={40} />
          </div>
        </div>
      </div>

      {/* Progress Section - Show for all in-progress transfers including early stages of Edgen-BSC */}
      {!isFinal && (
        <div className="mb-4 mt-6">
          {/* For Edgen-BSC early stages, show custom progress */}
          {isEdgenToBsc && gaslessBridgeProgress && (
            <TransferProgressBar progress={gaslessBridgeProgress} className="mb-4" />
          )}

          {/* For non-Edgen-BSC or when no gasless progress available, use regular progress */}
          {!isEdgenToBsc && isMonitoring && (
            <TransferProgressBar progress={progress} className="mb-4" />
          )}

          {/* Live Status Indicator */}
          <div className="flex items-center justify-center space-x-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
            <span className="text-sm text-gray-400">
              {isEdgenToBsc && isEarlyStage
                ? 'Processing your transaction...'
                : isEdgenToBsc && isPendingDistribution
                  ? 'Waiting for distribution (up to 24 hours)...'
                  : 'Monitoring transfer progress...'}
            </span>
          </div>
        </div>
      )}

      {/* Show loading indicator when fetching bridge data */}
      {isEdgenToBsc && isLoadingBridgeData && !isEarlyStage && !isFinal && (
        <div className="mb-4 mt-6 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <span className="ml-2 text-sm text-gray-400">Checking transfer status...</span>
        </div>
      )}

      {/* Completion Status */}
      {isFinal ? (
        <div>
          <p className="mb-2 mt-5 text-center text-[22px] font-[700] text-[#FFFFFF]">
            Your Last Transfer Was
            {isSent ? (
              <span className="ml-1 text-[#00FF6F]">
                {balanceConfirmedSuccess ||
                (isEdgenToBsc && bridgeTransferData?.status === 'distributed')
                  ? ' Successfully Completed'
                  : ' Successful'}
              </span>
            ) : (
              <span className="ml-1 text-[#FF8787]"> Unsuccessful</span>
            )}
          </p>

          {(balanceConfirmedSuccess ||
            (isEdgenToBsc && bridgeTransferData?.status === 'distributed')) && (
            <div className="mb-2 text-center">
              <p className="text-[14px] font-[400] text-[#00FF6F]">
                ✓{' '}
                {isEdgenToBsc
                  ? 'Funds have been distributed to your wallet'
                  : 'Funds confirmed in recipient wallet'}
              </p>
              {timestamp && !isEdgenToBsc && (
                <p className="mt-1 text-xs text-gray-400">
                  Transfer completed in {Math.round((Date.now() - timestamp) / 1000)}s
                </p>
              )}
            </div>
          )}

          <p className="mb-5 mt-1 text-center text-[16px] font-[500] text-[#707997]">{date}</p>

          <div className="mt-5 flex flex-col space-y-4 rounded-[24px] bg-[#DBE2FA08] p-4">
            <TransferProperty name="Sender Address" value={sender} url={fromUrl} />
            <TransferProperty name="Recipient Address" value={recipient} url={toUrl} />
            {token?.addressOrDenom && (
              <TransferProperty name="Token Address or Denom" value={token.addressOrDenom} />
            )}
            {originTxHash && (
              <TransferProperty
                name="Origin Transaction Hash"
                value={originTxHash}
                url={originTxUrl}
              />
            )}
            {/* Show BSC transaction hash if available from bridge API */}
            {isEdgenToBsc && bridgeTransferData?.binanceTxHash && (
              <TransferProperty
                name="BSC Transaction Hash"
                value={bridgeTransferData.binanceTxHash}
                url={multiProvider.tryGetExplorerTxUrl('bsc', {
                  hash: bridgeTransferData.binanceTxHash,
                })}
              />
            )}
            {msgId && !isEdgenToBsc && <TransferProperty name="Message ID" value={msgId} />}
            {explorerLink && !isEdgenToBsc && (
              <div className="flex justify-between">
                <span className="text-xs leading-normal tracking-wider text-gray-350">
                  <a
                    className="text-xs leading-normal tracking-wider text-gray-350 underline underline-offset-2 hover:opacity-80 active:opacity-70"
                    href={explorerLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View message in Hyperlane Explorer
                  </a>
                </span>
              </div>
            )}
            {/* Show estimated processing time for pending Edgen to BSC transfers */}
            {isEdgenToBsc && bridgeTransferData?.status === 'pending' && (
              <div className="mt-2 rounded-md bg-blue-500 bg-opacity-10 p-2 text-center">
                <p className="text-sm text-blue-300">
                  Your transfer is being processed. Funds will be distributed within 24 hours.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-4">
          <div
            className={`mt-5 text-center text-[24px] font-[500] ${
              isFailed ? 'text-red-600' : isEarlyStage ? 'text-blue-400' : 'text-[#707997]'
            }`}
          >
            {statusDescription}
          </div>
          {showSignWarning && effectiveStatus === TransferStatus.SigningTransfer && (
            <div className="mt-3 text-center text-sm text-gray-600">
              If your wallet does not show a transaction request or never confirms, please try the
              transfer again.
            </div>
          )}
          {isEdgenToBsc && isPendingDistribution && (
            <div className="mt-3 text-center text-sm text-gray-600">
              Your transaction has been confirmed on Edgen. Tokens will be distributed to BSC within
              24 hours.
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// Helper function to get status description for Edgen to BSC transfers
function getEdgenToBscStatusDescription(status: string): string {
  switch (status) {
    case 'distributed':
      return 'Your transfer has been successfully distributed to BSC';
    case 'pending':
      return 'Your transfer is being processed and will be distributed within 24 hours';
    case 'failed':
      return 'Your transfer could not be processed. Please contact support.';
    default:
      return 'Processing your transfer...';
  }
}

// Timeline component remains the same but can now show balance-confirmed status
export function Timeline({
  transferStatus,
  originTxHash,
  balanceConfirmed,
}: {
  transferStatus: TransferStatus;
  originTxHash?: string;
  balanceConfirmed?: boolean;
}) {
  const isFailed = transferStatus === TransferStatus.Failed && !balanceConfirmed;
  const multiProtocolProvider = useMultiProvider();
  const { stage, timings, message } = useMessageTimeline({
    originTxHash: isFailed ? undefined : originTxHash,
    multiProvider: multiProtocolProvider.toMultiProvider(),
  });

  // Override message status if balance is confirmed
  let messageStatus = isFailed ? MessageStatus.Failing : message?.status || MessageStatus.Pending;
  if (balanceConfirmed) {
    messageStatus = MessageStatus.Delivered;
  }

  return (
    <div className="timeline-container mb-2 mt-6 flex w-full flex-col items-center justify-center">
      <MessageTimeline
        status={messageStatus}
        stage={stage}
        timings={timings}
        timestampSent={message?.origin?.timestamp}
        hideDescriptions={true}
      />
      {balanceConfirmed && (
        <div className="mt-2 text-center text-sm text-green-500">
          ✓ Balance confirmed in recipient wallet
        </div>
      )}
    </div>
  );
}

function TransferProperty({
  name,
  value,
  url,
}: {
  name: string;
  value: string;
  url?: string | null;
}) {
  return (
    <div>
      <div className="flex w-full items-center justify-between">
        <label className="text-sm leading-normal tracking-wider text-[#707997]">{name}</label>
        <div className="flex items-center space-x-2">
          <div className="mt-1 truncate text-sm leading-normal tracking-wider text-white">
            {value.length > 10 ? `${value.slice(0, 4)}...${value.slice(-4)}` : value}
          </div>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer">
              <Image src={LinkIcon} width={14} height={14} alt="" />
            </a>
          )}
          <IconButton onClick={() => navigator.clipboard.writeText(value)}>
            <Image src={copyIcon} width={14} height={14} alt="" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

// https://github.com/wagmi-dev/wagmi/discussions/2928
function useSignIssueWarning(status: TransferStatus) {
  const [showWarning, setShowWarning] = useState(false);
  const warningCallback = useCallback(() => {
    if (status === TransferStatus.SigningTransfer || status === TransferStatus.ConfirmingTransfer)
      setShowWarning(true);
  }, [status, setShowWarning]);
  useTimeout(warningCallback, 20_000);
  return showWarning;
}

// TODO cosmos fix double slash problem in ChainMetadataManager
// Occurs when baseUrl has not other path (e.g. for manta explorer)
function fixDoubleSlash(url: string) {
  return url.replace(/([^:]\/)\/+/g, '$1');
}
