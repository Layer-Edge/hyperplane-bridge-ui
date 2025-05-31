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
import { TokenAmount } from '@hyperlane-xyz/sdk';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { toast } from 'react-toastify';
import { ChainLogo } from '../../components/icons/ChainLogo';
import { TokenIcon } from '../../components/icons/TokenIcon';
import copyIcon from '../../images/icons/copy-icon.svg';
import LinkIcon from '../../images/icons/external-link-icon.svg';
import tokenTransfer from '../../images/icons/token-select-icon.svg';
import tokenTransferSuccess from '../../images/icons/token-transfer-success.svg';
import transferFailed from '../../images/icons/transfer-failed.svg';
import { formatTimestamp } from '../../utils/date';
import { getHypExplorerLink } from '../../utils/links';
import { logger } from '../../utils/logger';
import { useMultiProvider } from '../chains/hooks';
import { hasPermissionlessChain } from '../chains/utils';
import { tryFindToken, useWarpCore } from '../tokens/hooks';
import { TransferContext, TransferStatus } from './types';
import {
    getTransferStatusLabel,
    isTransferFailed,
    isTransferSent,
} from './utils';

// Enhanced transfer completion stages
export enum TransferCompletionStage {
    INITIATED = 'initiated',
    TRANSACTION_SENT = 'transaction_sent',
    HYPERLANE_PROCESSING = 'hyperlane_processing',
    FUNDS_RECEIVED = 'funds_received',
    COMPLETED = 'completed'
}

export interface TransferProgress {
    stage: TransferCompletionStage;
    percentage: number;
    estimatedTimeRemaining?: number; // in seconds
    message: string;
}

// Enhanced balance watcher hook with progress tracking
export function useRecipientBalanceWatcher(
    recipient?: string,
    balance?: TokenAmount,
    transferStatus?: TransferStatus,
    onTransferComplete?: () => void,
    onProgressUpdate?: (progress: TransferProgress) => void
) {
    const [transferCompleted, setTransferCompleted] = useState(false);
    const [currentProgress, setCurrentProgress] = useState<TransferProgress>({
        stage: TransferCompletionStage.INITIATED,
        percentage: 0,
        message: 'Transfer initiated...'
    });

    const prevRecipientBalance = useRef<{ balance?: TokenAmount; recipient?: string }>({
        recipient: '',
    });

    const startTime = useRef<number>(Date.now());
    const pollInterval = useRef<NodeJS.Timeout>();

    // Progress calculation based on status and time elapsed
    const calculateProgress = useCallback((status: TransferStatus, timeElapsed: number): TransferProgress => {
        const maxEstimatedTime = 180; // 3 minutes in seconds
        const timeProgress = Math.min(timeElapsed / maxEstimatedTime, 0.9); // Cap at 90% for time-based progress

        switch (status) {
            case TransferStatus.Preparing:
                return {
                    stage: TransferCompletionStage.INITIATED,
                    percentage: 5,
                    estimatedTimeRemaining: maxEstimatedTime,
                    message: 'Preparing transfer...'
                };

            case TransferStatus.SigningTransfer:
                return {
                    stage: TransferCompletionStage.INITIATED,
                    percentage: 10,
                    estimatedTimeRemaining: maxEstimatedTime - 10,
                    message: 'Please sign the transaction in your wallet...'
                };

            case TransferStatus.ConfirmingTransfer:
                return {
                    stage: TransferCompletionStage.TRANSACTION_SENT,
                    percentage: 25,
                    estimatedTimeRemaining: maxEstimatedTime - 30,
                    message: 'Transaction confirmed, processing through Hyperlane...'
                };

            case TransferStatus.ConfirmedTransfer:
                return {
                    stage: TransferCompletionStage.HYPERLANE_PROCESSING,
                    percentage: Math.max(50, timeProgress * 100),
                    estimatedTimeRemaining: Math.max(0, maxEstimatedTime - timeElapsed),
                    message: 'Processing cross-chain transfer...'
                };

            default:
                return {
                    stage: TransferCompletionStage.HYPERLANE_PROCESSING,
                    percentage: Math.max(30, timeProgress * 100),
                    estimatedTimeRemaining: Math.max(0, maxEstimatedTime - timeElapsed),
                    message: 'Transfer in progress...'
                };
        }
    }, []);

    // Update progress based on transfer status
    useEffect(() => {
        if (!transferStatus || transferCompleted) return;

        const timeElapsed = (Date.now() - startTime.current) / 1000;
        const newProgress = calculateProgress(transferStatus, timeElapsed);

        setCurrentProgress(newProgress);
        onProgressUpdate?.(newProgress);
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
                message: 'Transfer completed successfully!'
            };

            setCurrentProgress(completionProgress);
            onProgressUpdate?.(completionProgress);

            toast.success('🎉 Recipient has received funds, transfer complete!');
            onTransferComplete?.();

            // Clear any polling intervals
            if (pollInterval.current) {
                clearInterval(pollInterval.current);
            }
        }

        prevRecipientBalance.current = { balance, recipient };
    }, [balance, recipient, onTransferComplete, onProgressUpdate, transferCompleted]);

    // Polling for balance updates during transfer
    useEffect(() => {
        if (!recipient || transferCompleted) return;

        // Start polling when transfer is in progress
        if (transferStatus === TransferStatus.ConfirmedTransfer ||
            transferStatus === TransferStatus.ConfirmingTransfer) {

            pollInterval.current = setInterval(() => {
                const timeElapsed = (Date.now() - startTime.current) / 1000;
                const newProgress = calculateProgress(transferStatus, timeElapsed);

                setCurrentProgress(newProgress);
                onProgressUpdate?.(newProgress);
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
        isMonitoring: !transferCompleted && !!recipient
    };
}

// Progress Bar Component
export function TransferProgressBar({
                                        progress,
                                        showEstimatedTime = true,
                                        className = ""
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
            <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-300">
          {progress.message}
        </span>
                {showEstimatedTime && progress.estimatedTimeRemaining && (
                    <span className="text-xs text-gray-400">
            {formatTimeRemaining(progress.estimatedTimeRemaining)}
          </span>
                )}
            </div>

            <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                <div
                    className={`h-2.5 rounded-full transition-all duration-300 ease-out ${
                        progress.stage === TransferCompletionStage.COMPLETED
                            ? 'bg-green-500'
                            : 'bg-blue-500'
                    }`}
                    style={{
                        width: `${Math.min(progress.percentage, 100)}%`,
                        boxShadow: progress.percentage > 0 ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none'
                    }}
                />
            </div>

            <div className="flex justify-between items-center mt-1">
        <span className="text-xs text-gray-500">
          {progress.percentage.toFixed(0)}% complete
        </span>
                {progress.stage === TransferCompletionStage.COMPLETED && (
                    <span className="text-xs text-green-400 font-medium">
            ✓ Completed
          </span>
                )}
            </div>
        </div>
    );
}

export function TransfersDetailsModal({
                                          isOpen,
                                          onClose,
                                          transfer,
                                          recipientBalance, // Add this prop to pass recipient balance
                                      }: {
    isOpen: boolean;
    onClose: () => void;
    transfer: TransferContext;
    recipientBalance?: TokenAmount; // Optional recipient balance
}) {
    const [fromUrl, setFromUrl] = useState<string>('');
    const [toUrl, setToUrl] = useState<string>('');
    const [originTxUrl, setOriginTxUrl] = useState<string>('');

    // Add the missing state variables
    const [balanceConfirmedSuccess, setBalanceConfirmedSuccess] = useState(false);
    const [transferProgress, setTransferProgress] = useState<TransferProgress>({
        stage: TransferCompletionStage.INITIATED,
        percentage: 0,
        message: 'Transfer initiated...'
    });

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

    const multiProvider = useMultiProvider();
    const warpCore = useWarpCore();

    const isChainKnown = multiProvider.hasChain(origin);
    const account = useAccountForChain(multiProvider, isChainKnown ? origin : undefined);
    const walletDetails = useWalletDetails()[account?.protocol || ProtocolType.Ethereum];

    // Use the enhanced balance watcher to detect when transfer is truly complete
    const { transferCompleted, isMonitoring } = useRecipientBalanceWatcher(
        recipient,
        recipientBalance,
        status,
        () => {
            setBalanceConfirmedSuccess(true);
        },
        (progress) => {
            setTransferProgress(progress);
        }
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
            <div className="flex justify-center items-center p-3 w-full">
                <TokenIcon token={token} size={48} />
                <div className="items ml-2 flex items-baseline text-[36px] font-[500] text-white">
                    <span>{amount}</span>
                    <span className="ml-1">{token?.symbol}</span>
                </div>
            </div>

            {/* Transfer Visual */}
            <div className="flex justify-center items-center mt-4">
                <div className="flex flex-col items-center mr-2">
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
                <div className="flex flex-col items-center ml-2">
                    <div className="rounded-full p-[2px]" style={{ border: '2px solid #707997' }}>
                        <ChainLogo chainName={destination} size={40} />
                    </div>
                </div>
            </div>

            {/* Progress Section */}
            {!isFinal && isMonitoring && (
                <div className="mt-6 mb-4">
                    <TransferProgressBar
                        progress={transferProgress}
                        className="mb-4"
                    />

                    {/* Live Status Indicator */}
                    <div className="flex items-center justify-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-gray-400">
              Monitoring transfer progress...
            </span>
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
                                <p className="text-xs text-gray-400 mt-1">
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
                <span className="text-xs tracking-wider leading-normal text-gray-350">
                  <a
                      className="text-xs tracking-wider leading-normal underline text-gray-350 underline-offset-2 hover:opacity-80 active:opacity-70"
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
                <div className="flex flex-col justify-center items-center py-4">
                    <div
                        className={`mt-5 text-center text-[24px] font-[500] ${isFailed ? 'text-red-600' : 'text-[#707997]'}`}
                    >
                        {transferProgress.message || statusDescription}
                    </div>
                    {showSignWarning && (
                        <div className="mt-3 text-sm text-center text-gray-600">
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
        <div className="flex flex-col justify-center items-center mt-6 mb-2 w-full timeline-container">
            <MessageTimeline
                status={messageStatus}
                stage={stage}
                timings={timings}
                timestampSent={message?.origin?.timestamp}
                hideDescriptions={true}
            />
            {balanceConfirmed && (
                <div className="mt-2 text-sm text-green-500 text-center">
                    ✓ Balance confirmed in recipient wallet
                </div>
            )}
        </div>
    );
}

function TransferProperty({ name, value, url }: { name: string; value: string; url?: string }) {
    return (
        <div>
            <div className="flex justify-between items-center w-full">
                <label className="text-sm leading-normal tracking-wider text-[#707997]">{name}</label>
                <div className="flex items-center space-x-2">
                    <div className="mt-1 text-sm tracking-wider leading-normal text-white truncate">
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
