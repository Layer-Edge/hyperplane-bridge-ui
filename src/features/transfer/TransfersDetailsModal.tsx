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
import {
  TransferCompletionStage,
  TransferContext,
  TransferProgress,
  TransferStatus,
} from './types';
import { useRecipientBalanceWatcher } from './useBalanceWatcher';
import { getTransferStatusLabel, isTransferFailed, isTransferSent } from './utils';

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

  // Add the missing state variables
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
    status,
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

  // Enhanced logic: use transferCompleted from balance watcher as the primary success indicator
  const isSent = transferCompleted || (isTransferSent(status) && !recipientBalance);
  const isFailed = isTransferFailed(status) && !transferCompleted;
  const isFinal = transferCompleted || isSent || isFailed;

  const statusDescription = getTransferStatusLabel(
    balanceConfirmedSuccess ? TransferStatus.ConfirmedTransfer : status,
    connectorName,
    isPermissionlessRoute,
    isAccountReady,
  );
  const showSignWarning = useSignIssueWarning(status);

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

      {/* Progress Section */}
      {!isFinal && isMonitoring && (
        <div className="mb-4 mt-6">
          <TransferProgressBar progress={progress} className="mb-4" />

          {/* Live Status Indicator */}
          <div className="flex items-center justify-center space-x-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
            <span className="text-sm text-gray-400">Monitoring transfer progress...</span>
          </div>
        </div>
      )}

      {/* Completion Status */}
      {isFinal ? (
        <div>
          <p className="mb-2 mt-5 text-center text-[22px] font-[700] text-[#FFFFFF]">
            Your Last Transfer Was
            {isSent ? (
              <span className="ml-1 text-[#00FF6F]">
                {balanceConfirmedSuccess ? ' Successfully Completed' : ' Successful'}
              </span>
            ) : (
              <span className="ml-1 text-[#FF8787]"> Unsuccessful</span>
            )}
          </p>

          {balanceConfirmedSuccess && (
            <div className="mb-2 text-center">
              <p className="text-[14px] font-[400] text-[#00FF6F]">
                ✓ Funds confirmed in recipient wallet
              </p>
              {timestamp && (
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
            {msgId && <TransferProperty name="Message ID" value={msgId} />}
            {explorerLink && (
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
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-4">
          <div
            className={`mt-5 text-center text-[24px] font-[500] ${isFailed ? 'text-red-600' : 'text-[#707997]'}`}
          >
            {progress.message || statusDescription}
          </div>
          {showSignWarning && (
            <div className="mt-3 text-center text-sm text-gray-600">
              If your wallet does not show a transaction request or never confirms, please try the
              transfer again.
            </div>
          )}
        </div>
      )}
    </Modal>
  );
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

function TransferProperty({ name, value, url }: { name: string; value: string; url?: string }) {
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
