import { ProtocolType } from '@hyperlane-xyz/utils';
import {
  useAccountForChain,
  // ConnectWalletButton as ConnectWalletButtonInner,
  useConnectFns,
  useDisconnectFns,
  useWalletDetails,
  WalletLogo,
} from '@hyperlane-xyz/widgets';
import Image from 'next/image';
import { SolidButton } from '../../components/buttons/SolidButton';
import DisconnectIcon from '../../images/icons/disconnect.svg';
import { useChainProtocol, useMultiProvider } from '../chains/hooks';
import { useStore } from '../store';

export function ConnectWalletButton() {
  const { originChainName } = useStore((s) => ({
    originChainName: s.originChainName,
  }));
  const protocol = useChainProtocol(originChainName) || ProtocolType.Ethereum;
  const walletDetails = useWalletDetails();
  const multiProvider = useMultiProvider();
  const disconnectFns = useDisconnectFns();
  const account = useAccountForChain(multiProvider, originChainName);
  const isAccountReady = account?.isReady;
  const connectFns = useConnectFns();
  const connectFn = connectFns[protocol];
  const { setIsSideBarOpen } = useStore((s) => ({
    // setShowEnvSelectModal: s.setShowEnvSelectModal,
    setIsSideBarOpen: s.setIsSideBarOpen,
  }));
  const onClick = () => {
    if (isAccountReady) {
      setIsSideBarOpen(true);
    } else {
      connectFn();
      // setShowEnvSelectModal(true);
    }
  };
  return (
    <div>
      {/* <ConnectWalletButtonInner
        multiProvider={multiProvider}
        onClickWhenUnconnected={() => setShowEnvSelectModal(true)}
        onClickWhenConnected={() => setIsSideBarOpen(true)}
        className="relative text-[14px] font-[700] text-[#050917]"
        countClassName="bg-accent-500"
        chainName={originChainName}
      /> */}
      {isAccountReady ? (
        <div className="account-button" onClick={onClick}>
          <div className="button-inner">
            <div className="flex items-center">
              <WalletLogo walletDetails={walletDetails[account.protocol]} size={28} />
              <div className="ml-2 flex flex-col">
                <span className="text-[12px] font-[500] text-[#707997]">
                  {walletDetails[account.protocol].name || account.protocol}
                </span>
                {`${account.addresses[0].address.slice(0, 4)}...${account.addresses[0].address.slice(-4)}`}
              </div>
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
      ) : (
        <SolidButton
          // type={type}
          // color={color}
          onClick={onClick}
          className="gradient-border-button relative mt-4 px-[16px] py-[15px] font-[700] text-[#050917]"
        >
          <div className="z-1 relative">
            {isAccountReady
              ? `${account.addresses[0].address.slice(0, 4)}...${account.addresses[0].address.slice(-4)}`
              : 'Connect Wallet'}
          </div>
        </SolidButton>
      )}
    </div>
  );
}
