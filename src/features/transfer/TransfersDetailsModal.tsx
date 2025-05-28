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
import copyIcon from '../../images/icons/copy-icon.svg';
import LinkIcon from '../../images/icons/external-link-icon.svg';
import tokenTransfer from '../../images/icons/token-select-icon.svg';
import tokenTransferSuccess from '../../images/icons/token-transfer-success.svg';
import transferFailed from '../../images/icons/transfer-failed.svg';
// import { Color } from '../../styles/Color';
import { formatTimestamp } from '../../utils/date';
import { getHypExplorerLink } from '../../utils/links';
import { logger } from '../../utils/logger';
import { useMultiProvider } from '../chains/hooks';
import { hasPermissionlessChain } from '../chains/utils';
import { tryFindToken, useWarpCore } from '../tokens/hooks';
import { TransferContext, TransferStatus } from './types';
import {
  // getIconByTransferStatus,
  getTransferStatusLabel,
  isTransferFailed,
  isTransferSent,
} from './utils';

export function TransfersDetailsModal({
  isOpen,
  onClose,
  transfer,
}: {
  isOpen: boolean;
  onClose: () => void;
  transfer: TransferContext;
}) {
  const [fromUrl, setFromUrl] = useState<string>('');
  const [toUrl, setToUrl] = useState<string>('');
  const [originTxUrl, setOriginTxUrl] = useState<string>('');

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
  const isSent = isTransferSent(status);
  const isFailed = isTransferFailed(status);
  const isFinal = isSent || isFailed;
  const statusDescription = getTransferStatusLabel(
    status,
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
      <div className="flex justify-center items-center p-3 w-full">
        <TokenIcon token={token} size={48} />
        <div className="items ml-2 flex items-baseline text-[36px] font-[500] text-white">
          <span>{amount}</span>
          <span className="ml-1">{token?.symbol}</span>
        </div>
      </div>

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

      {isFinal ? (
        <div>
          <p className="mb-2 mt-5 text-center text-[22px] font-[700] text-[#FFFFFF]">
            Your Last Transfer Was
            {isSent ? (
              <span className="ml-1 text-[#00FF6F]"> Successful</span>
            ) : (
              <span className="ml-1 text-[#FF8787]"> Unsuccesfull</span>
            )}
          </p>
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
            {statusDescription}
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

// TODO consider re-enabling timeline
export function Timeline({
  transferStatus,
  originTxHash,
}: {
  transferStatus: TransferStatus;
  originTxHash?: string;
}) {
  const isFailed = transferStatus === TransferStatus.Failed;
  const multiProtocolProvider = useMultiProvider();
  const { stage, timings, message } = useMessageTimeline({
    originTxHash: isFailed ? undefined : originTxHash,
    multiProvider: multiProtocolProvider.toMultiProvider(),
  });
  const messageStatus = isFailed ? MessageStatus.Failing : message?.status || MessageStatus.Pending;

  return (
    <div className="flex flex-col justify-center items-center mt-6 mb-2 w-full timeline-container">
      <MessageTimeline
        status={messageStatus}
        stage={stage}
        timings={timings}
        timestampSent={message?.origin?.timestamp}
        hideDescriptions={true}
      />
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

// function WideChevron() {
//   return (
//     <WideChevronIcon
//       width="16"
//       height="100%"
//       direction="e"
//       color={Color.gray['300']}
//       rounded={true}
//     />
//   );
// }

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
