import { ChainMetadata, mergeChainMetadataMap } from '@hyperlane-xyz/sdk';
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
  const { chainMetadata, chainMetadataOverrides } = useStore((s) => ({
    chainMetadata: s.chainMetadata,
    chainMetadataOverrides: s.chainMetadataOverrides,
    setChainMetadataOverrides: s.setChainMetadataOverrides,
  }));
  const { mergedMetadata } = useMemo(() => {
    const mergedMetadata = mergeChainMetadataMap(chainMetadata, chainMetadataOverrides);
    return {
      mergedMetadata,
    };
  }, [chainMetadata, chainMetadataOverrides]);
  const mainnetNetworks = Object.fromEntries(
    Object.entries(mergedMetadata).filter(([key]) => mergedMetadata[key].isTestnet !== true),
  );
  const queryFormatted = query.trim().toLowerCase();
  const filteredObj = Object.fromEntries(
    Object.entries(mainnetNetworks).filter(
      ([key]) =>
        mainnetNetworks[key].name.includes(queryFormatted) ||
        mainnetNetworks[key].displayName?.toLowerCase().includes(queryFormatted) ||
        mainnetNetworks[key].chainId.toString().includes(queryFormatted),
    ),
  );
  const onSelectChain = (chain: ChainMetadata) => {
    onSelect(chain.name);
    close();
  };

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
        {Object.keys(filteredObj).map((key) => (
          <div
            key={key}
            className="mb-[20px] flex cursor-pointer items-center"
            onClick={() => onSelectChain(filteredObj[key])}
          >
            <img
              src={filteredObj[key].logoURI}
              alt={filteredObj[key].name}
              className="chain-icon rounded-[50%]"
              width={32}
              height={32}
            />
            <p className="ml-[10px] text-[18px] font-[700] text-white">
              {filteredObj[key].displayName}
            </p>
          </div>
        ))}
      </div>
      {/* <div className="search-menu-container">
        <ChainSearchMenu
          chainMetadata={chainMetadata}
          onClickChain={onSelectChain}
          overrideChainMetadata={chainMetadataOverrides}
          onChangeOverrideMetadata={setChainMetadataOverrides}
          customListItemField={customListItemField}
          defaultSortField="custom"
          // showChainDetails={showChainDetails}
          // shouldDisableChains={config.shouldDisableChains}
          // showAddChainButton={config.showAddChainButton}
        />
      </div> */}
    </Modal>
  );
}
