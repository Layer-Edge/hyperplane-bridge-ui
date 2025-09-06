import Image from 'next/image';
import Link from 'next/link';
import { useStore } from '../../features/store';
import { ConnectWalletButton } from '../../features/wallet/ConnectWalletButton';
import Logo from '../../images/logos/logo.svg';

export function Header() {
  const { selectedBridgeTab, setSelectedBridgeTab } = useStore((s) => ({
    selectedBridgeTab: s.selectedBridgeTab,
    setSelectedBridgeTab: s.setSelectedBridgeTab,
  }));

  return (
    <header className="w-full px-2 pb-2 pt-3 sm:px-6 lg:px-12">
      <div className="flex items-start justify-between">
        <Link href="/" className="flex items-center py-2">
          <Image src={Logo} width={150} alt="" />
        </Link>
        <div className="flex flex-col items-end gap-2 md:flex-row-reverse md:items-start">
          <ConnectWalletButton />
        </div>
      </div>
      <div className="mt-6 flex gap-2">
        <button
          className={`focus:ring-accent/40 rounded-[16px] border border-white/10 px-6 py-2 font-semibold shadow-md backdrop-blur-md transition-colors focus:outline-none focus:ring-2 ${
            selectedBridgeTab === 'bridge'
              ? 'bg-white/10 text-white shadow-lg'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
          onClick={() => setSelectedBridgeTab('bridge')}
        >
          Bridge
        </button>
        <button
          className={`focus:ring-accent/40 rounded-[16px] border border-white/10 px-6 py-2 font-semibold shadow-md backdrop-blur-md transition-colors focus:outline-none focus:ring-2 ${
            selectedBridgeTab === 'gasless'
              ? 'bg-white/10 text-white shadow-lg'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
          onClick={() => setSelectedBridgeTab('gasless')}
        >
          Feeless Bridge
        </button>
      </div>
    </header>
  );
}
