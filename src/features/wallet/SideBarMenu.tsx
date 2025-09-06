import {
  HistoryIcon,
  SpinnerIcon,
  useAccounts,
  useDisconnectFns,
  useWalletDetails,
  WalletLogo,
} from '@hyperlane-xyz/widgets';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChainLogo } from '../../components/icons/ChainLogo';
import CollapseIcon from '../../images/icons/collapse-icon.svg';
import DisconnectIcon from '../../images/icons/disconnect.svg';
import { useMultiProvider } from '../chains/hooks';
import { getChainDisplayName } from '../chains/utils';
import { useStore } from '../store';
import { tryFindToken, useWarpCore } from '../tokens/hooks';
import { TransfersDetailsModal } from '../transfer/TransfersDetailsModal';
import { useTransferData } from '../transfer/hooks';
import { TransferContext, TransferStatus } from '../transfer/types';
import { checkIsEdgenToBsc, getIconByTransferStatus, STATUSES_WITH_ICON } from '../transfer/utils';

export function SideBarMenu({
  // onClickConnectWallet,
  isOpen,
  onClose,
}: {
  onClickConnectWallet: () => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const didMountRef = useRef(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferContext | null>(null);

  const multiProvider = useMultiProvider();
  const { readyAccounts } = useAccounts(multiProvider);
  const disconnectFns = useDisconnectFns();
  const walletDetails = useWalletDetails();
  const { transfers, resetTransfers, transferLoading, updateTransferStatus } = useStore((s) => ({
    transfers: s.transfers,
    resetTransfers: s.resetTransfers,
    updateTransferStatus: s.updateTransferStatus,
    transferLoading: s.transferLoading,
    originChainName: s.originChainName,
  }));
  const transferIndex = transfers.length;

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
    } else if (transferLoading) {
      setSelectedTransfer(transfers[transfers.length - 1]);
      setIsModalOpen(true);
    }
  }, [transfers, transferLoading]);

  useEffect(() => {
    setIsMenuOpen(isOpen);
  }, [isOpen]);

  const sortedTransfers = useMemo(
    () => [...transfers].sort((a, b) => b.timestamp - a.timestamp) || [],
    [transfers],
  );

  // const onCopySuccess = () => {
  //   toast.success('Address copied to clipboard', { autoClose: 2000 });
  // };
  return (
    <>
      <div
        className={`sidebar-container fixed right-[10px] top-[10px] h-full w-88 transform shadow-lg transition-transform duration-100 ease-in ${
          isMenuOpen ? 'z-10 translate-x-0' : 'z-0 translate-x-full'
        }`}
      >
        {isMenuOpen && (
          <button
            className="absolute left-0 top-0 flex w-9 -translate-x-full items-center justify-center rounded-l-md transition-all"
            onClick={() => onClose()}
          >
            <Image src={CollapseIcon} width={15} height={24} alt="" />
          </button>
        )}
        <div className="flex h-full w-full flex-col overflow-y-auto pb-[30px]">
          <div className="mt-[40px] w-full px-3.5 py-2 text-base font-normal tracking-wider text-white">
            Connected Wallets
          </div>
          {readyAccounts.length > 0 &&
            readyAccounts.map((account) => (
              <div
                key={account.protocol}
                className="mb-[10px] px-3.5 py-2"
                style={{
                  borderBottom: '1px solid #DBE2FA08',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <WalletLogo walletDetails={walletDetails[account.protocol]} size={30} />
                    <div className="ml-2 flex flex-col">
                      <span className="text-[12px] font-[500] text-[#707997]">
                        {walletDetails[account.protocol].name || account.protocol}
                      </span>
                      <span className="text-[16px] font-[500] text-[#DBE2FA]">
                        {account.addresses[0].address.slice(0, 6) +
                          '...' +
                          account.addresses[0].address.slice(-4)}
                      </span>
                    </div>
                  </div>
                  <Image
                    src={DisconnectIcon}
                    width={20}
                    height={20}
                    alt=""
                    className="pointer"
                    onClick={() => disconnectFns[account.protocol]()}
                  />
                </div>
              </div>
            ))}
          <div className="h-full rounded-[32px] border-[1px] border-[#DBE2FA08] bg-[#DBE2FA08] p-[5px]">
            <div className="mb-4 w-full px-3.5 py-2 font-[700] text-[#DBE2FA]">
              Transfer History
            </div>
            <div className="flex grow flex-col">
              <div className="flex w-full grow flex-col">
                {sortedTransfers?.length > 0 &&
                  sortedTransfers.map((t, i) => (
                    <TransferSummary
                      key={i}
                      transfer={t}
                      onClick={() => {
                        setSelectedTransfer(t);
                        setIsModalOpen(true);
                      }}
                      isVisible={isMenuOpen}
                    />
                  ))}
              </div>
              {sortedTransfers?.length > 0 && (
                <button onClick={resetTransfers} className={`${styles.btn} mx-2 my-5`}>
                  <HistoryIcon color="#fff" height={22} width={22} />
                  <span className="ml-2 text-sm font-normal text-white">
                    Reset transaction history
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {selectedTransfer && (
        <TransfersDetailsModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTransfer(null);
            updateTransferStatus(transferIndex, TransferStatus.Preparing);
          }}
          transfer={selectedTransfer}
        />
      )}
    </>
  );
}

function TransferSummary({
  transfer,
  onClick,
  isVisible,
}: {
  transfer: TransferContext;
  onClick: () => void;
  isVisible: boolean;
}) {
  const multiProvider = useMultiProvider();
  const warpCore = useWarpCore();

  const {
    amount,
    origin,
    destination,
    status,
    timestamp,
    originTokenAddressOrDenom,
    originTxHash,
    isGasless,
  } = transfer;
  const isEdgenToBsc = checkIsEdgenToBsc(origin, destination);

  // Use the custom hook to fetch transfer data
  const { data: bridgeTransferData, isLoading } = useTransferData(
    originTxHash,
    isEdgenToBsc && isVisible,
  );

  const token = tryFindToken(warpCore, origin, originTokenAddressOrDenom);

  // For Edgen to BSC transfers, show a custom status icon based on bridge data
  const getStatusIcon = () => {
    if (isEdgenToBsc) {
      // Check if bridgeTransferData is null (Indicates that the transfer hasn't been recorded on the backend yet)
      if (bridgeTransferData === null) {
        return null;
      }
      if (bridgeTransferData) {
        // Use custom icons based on bridge transfer status
        switch (bridgeTransferData?.status) {
          case 'distributed':
            return getIconByTransferStatus(TransferStatus.ConfirmedTransfer);
          case 'pending':
            return null; // Will show spinner
          case 'failed':
            return getIconByTransferStatus(TransferStatus.Failed);
          default:
            return null;
        }
      }
    }

    // Use default status icon for normal transfers
    return STATUSES_WITH_ICON.includes(status) ? getIconByTransferStatus(status) : null;
  };

  const statusIcon = getStatusIcon();

  return (
    <button key={timestamp} onClick={onClick} className={`${styles.btn} justify-between py-3`}>
      <div className="flex gap-2.5">
        <div className="rounded-fullpx-1.5 flex h-[2.25rem] w-[2.25rem] flex-col items-center justify-center">
          <ChainLogo chainName={origin} size={20} />
        </div>
        <div className="flex flex-col">
          <div className="flex flex-col">
            <div className="items flex items-baseline text-[16px] font-[700] text-white">
              <span>{amount}</span>
              <span className="ml-1">{token?.symbol || ''}</span>
            </div>
            <div className="mt-1 flex flex-row items-center">
              <span className="mr-1 text-[12px] font-[500] text-[#707997]">
                {getChainDisplayName(multiProvider, origin, true)}
              </span>
              <span className="text-[12px] font-[500] text-[#707997]">
                {` to ${getChainDisplayName(multiProvider, destination, true)}`}
              </span>
              {isGasless && (
                <span className="ml-1 rounded-sm bg-blue-500 bg-opacity-20 px-1 py-0.5 text-[10px] font-medium text-blue-300">
                  Feeless
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex h-5 w-5">
        {isLoading || (!statusIcon && isEdgenToBsc) ? (
          <SpinnerIcon color="white" className="-ml-1 mr-3 h-6 w-6" />
        ) : statusIcon ? (
          <Image src={statusIcon} width={25} height={25} alt="" />
        ) : (
          <SpinnerIcon color="white" className="-ml-1 mr-3 h-6 w-6" />
        )}
      </div>
    </button>
  );
}

const styles = {
  btn: 'w-full flex items-center px-1 py-2 text-sm active:scale-95 transition-all duration-500 cursor-pointer border-none',
};
