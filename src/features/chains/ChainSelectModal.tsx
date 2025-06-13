import { ChainMetadata } from '@hyperlane-xyz/sdk';
import { ChainSearchMenuProps, Modal } from '@hyperlane-xyz/widgets';
import { useMemo, useState } from 'react';
import { useStore } from '../store';

export function ChainSelectListModal({
  isOpen,
  close,
  onSelect,
  // customListItemField,
  // showChainDetails,
}: {
  isOpen: boolean;
  close: () => void;
  onSelect: (chain: ChainName) => void;
  customListItemField?: ChainSearchMenuProps['customListItemField'];
  showChainDetails?: ChainSearchMenuProps['showChainDetails'];
}) {
  const [query, setQuery] = useState('');
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const { chainMetadata } = useStore((s) => ({
    chainMetadata: s.chainMetadata,
  }));

  const { filteredMetadata } = useMemo(() => {
    // Only use chainMetadata, not the overrides
    const metadata = chainMetadata || {};

    const queryFormatted = query.trim().toLowerCase();

    if (!queryFormatted) {
      return { filteredMetadata: metadata };
    }

    const filteredObj = Object.fromEntries(
      Object.entries(metadata).filter(([chainName, chainData]) => {
        if (!chainData) return false;

        const name = chainData.name?.toLowerCase() || '';
        const displayName = chainData.displayName?.toLowerCase() || '';
        const chainId = chainData.chainId?.toString() || '';

        return (
          name.includes(queryFormatted) ||
          displayName.includes(queryFormatted) ||
          chainId.includes(queryFormatted)
        );
      }),
    );

    return { filteredMetadata: filteredObj };
  }, [chainMetadata, query]);

  const onSelectChain = (chain: ChainMetadata) => {
    onSelect(chain.name);
    close();
  };

  // Add loading state if chainMetadata is not yet available
  if (!chainMetadata) {
    return (
      <Modal
        isOpen={isOpen}
        close={close}
        dialogClassname="dialog-container"
        panelClassname="p-4 sm:p-5 max-w-lg min-h-[40vh] modal-conainer"
      >
        <div className="text-white">Loading chains...</div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      close={close}
      dialogClassname="dialog-container"
      panelClassname="p-4 sm:p-5 max-w-lg min-h-[40vh] modal-conainer"
    >
      <div>
        <input
          type="text"
          value={query}
          onChange={handleSearchChange}
          placeholder="Chain name or ID"
          className="mb-[20px] w-full rounded-[80px] border-[1px] border-[#DBE2FA0D] bg-[#DBE2FA08] p-[16px] text-white focus:outline-none"
        />
        {Object.entries(filteredMetadata).map(([chainName, chainData]) => {
          // Add safety checks
          if (!chainData) return null;

          return (
            <div
              key={chainName}
              className="mb-[20px] flex cursor-pointer items-center"
              onClick={() => onSelectChain(chainData)}
            >
              <img
                src={chainData.logoURI || '/default-chain-logo.svg'}
                alt={chainData.name || chainName}
                className="chain-icon rounded-[50%]"
                width={32}
                height={32}
                onError={(e) => {
                  // Fallback if image fails to load
                  e.currentTarget.src = '/default-chain-logo.svg';
                }}
              />
              <p className="ml-[10px] text-[18px] font-[700] text-white">
                {chainData.displayName || chainData.name || chainName}
              </p>
            </div>
          );
        })}
        {Object.keys(filteredMetadata).length === 0 && (
          <div className="py-4 text-center text-white">
            {query ? 'No chains found matching your search' : 'No chains available'}
          </div>
        )}
      </div>
    </Modal>
  );
}
