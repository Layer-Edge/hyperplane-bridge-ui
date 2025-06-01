import { ChainMap, ChainMetadata, ExplorerFamily } from '@hyperlane-xyz/sdk';
import { Address, ProtocolType } from '@hyperlane-xyz/utils';

// A map of chain names to ChainMetadata
// Chains can be defined here, in chains.json, or in chains.yaml
// Chains already in the SDK need not be included here unless you want to override some fields
// Schema here: https://github.com/hyperlane-xyz/hyperlane-monorepo/blob/main/typescript/sdk/src/metadata/chainMetadataTypes.ts
export const chains: ChainMap<
  ChainMetadata & { mailbox?: Address; interchainGasPaymaster?: Address }
> = {
  ethereum: {
    protocol: ProtocolType.Ethereum,
    chainId: 1,
    domainId: 1,
    name: 'ethereum',
    displayName: 'Ethereum',
    nativeToken: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [{ http: 'https://ethereum.publicnode.com' }],
    blockExplorers: [
      {
        name: 'Etherscan',
        url: 'https://etherscan.io',
        apiUrl: 'https://api.etherscan.io/api',
        family: ExplorerFamily.Etherscan,
      },
    ],
    blocks: {
      confirmations: 3,
      reorgPeriod: 14,
      estimateBlockTime: 13,
    },
    interchainGasPaymaster: '0x13113bd4429735a0e7c398e455f7b39f35e38b52',
    mailbox: '0xc005dc82818d67AF737725bD4bf75435d065D239',
    logoURI: '/ethereum-logo.png',
  },
  bsc: {
    protocol: ProtocolType.Ethereum,
    chainId: 56,
    domainId: 56,
    name: 'bsc',
    displayName: 'BSC',
    nativeToken: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: [{ http: 'https://bsc-dataseed1.binance.org' }],
    blockExplorers: [
      {
        name: 'BscScan',
        url: 'https://bscscan.com',
        apiUrl: 'https://api.bscscan.com/api',
        family: ExplorerFamily.Etherscan,
      },
    ],
    blocks: {
      confirmations: 3,
      reorgPeriod: 15,
      estimateBlockTime: 3,
    },
    interchainGasPaymaster: '0x2e49da0dc6bfac19f522da4a5379dff4cafa3b34',
    mailbox: '0x2971b9Aec44bE4eb673DF1B88cDB57b96eefe8a4',
    logoURI: '/bsc-logo.svg',
  },
  basesepolia: {
    protocol: ProtocolType.Ethereum,
    chainId: 84532,
    domainId: 84532,
    name: 'basesepolia',
    displayName: 'Base',
    nativeToken: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [{ http: 'https://sepolia.base.org' }],
    blockExplorers: [
      {
        name: 'BaseScan',
        url: 'https://sepolia.basescan.org',
        apiUrl: 'https://api-sepolia.basescan.org/api',
        family: ExplorerFamily.Etherscan,
      },
    ],
    blocks: {
      confirmations: 1,
      reorgPeriod: 1,
      estimateBlockTime: 2,
    },
    mailbox: '0x6966b0E55883d49BFB24539356a2f8A673E02039',
    interchainGasPaymaster: '0x99d3b8002107d1c1924f7a5092ba373f4a8924fb',
    logoURI: '/base-logo.svg',
  },
  bsctestnet: {
    protocol: ProtocolType.Ethereum,
    chainId: 97,
    domainId: 97,
    name: 'bsctestnet',
    displayName: 'BSC Testnet',
    nativeToken: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: [{ http: 'https://data-seed-prebsc-1-s1.binance.org:8545' }],
    blockExplorers: [
      {
        name: 'BscScan',
        url: 'https://testnet.bscscan.com',
        apiUrl: 'https://api-testnet.bscscan.com/api',
        family: ExplorerFamily.Etherscan,
      },
    ],
    blocks: {
      confirmations: 1,
      reorgPeriod: 9,
      estimateBlockTime: 3,
    },
    mailbox: '0xF9F6F5646F478d5ab4e20B0F910C92F1CCC9Cc6D',
    logoURI: '/bsc-logo.svg',
  },
  edgentestnet: {
    protocol: ProtocolType.Ethereum,
    chainId: 3456,
    domainId: 3456,
    name: 'edgentestnet',
    displayName: 'EdgeTestnet',
    nativeToken: { name: 'LayerEdge', symbol: 'EDGEN', decimals: 18 },
    rpcUrls: [{ http: 'https://testnet-rpc.layeredge.io' }],
    blockExplorers: [
      {
        name: 'EdgeExplorer',
        url: 'https://testnet-explorer.layeredge.io',
        apiUrl: 'https://testnet-explorer.layeredge.io/api',
        family: ExplorerFamily.Blockscout,
      },
    ],
    blocks: {
      confirmations: 1,
      reorgPeriod: 1,
      estimateBlockTime: 2,
    },
    mailbox: '0x9Af611a6Fa2DAC0C3C63D1B1b448Bbc44Bd5b8a3',
    logoURI: '/edge-logo.png',
  },
  edgenchain: {
    protocol: ProtocolType.Ethereum,
    chainId: 4207,
    domainId: 4207,
    name: 'edgenchain',
    displayName: 'Edgen Chain',
    nativeToken: { name: 'LayerEdge', symbol: 'EDGEN', decimals: 18 },
    rpcUrls: [{ http: 'https://rpc.layeredge.io' }],
    blockExplorers: [
      {
        name: 'EdgeExplorer',
        url: 'https://edgenscan.io',
        apiUrl: 'https://edgenscan.io/api',
        family: ExplorerFamily.Blockscout,
      },
    ],
    blocks: {
      confirmations: 1,
      reorgPeriod: 1,
      estimateBlockTime: 2,
    },
    mailbox: '0xef07FAE1a6912C8d333F72E01A03CE3bb18E12a1',
    interchainGasPaymaster: '0x8badaacd60824c5db01e9c3616e4906ca90b7c02',
    logoURI: '/edge-logo.png',
  },
};

export const chainsRentEstimate: ChainMap<bigint> = {
  eclipsemainnet: BigInt(Math.round(0.00004019 * 10 ** 9)),
  solanamainnet: BigInt(Math.round(0.00411336 * 10 ** 9)),
  sonicsvm: BigInt(Math.round(0.00411336 * 10 ** 9)),
  soon: BigInt(Math.round(0.00000355 * 10 ** 9)),
};
