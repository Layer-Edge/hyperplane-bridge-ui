import { TokenStandard, WarpCoreConfig } from '@hyperlane-xyz/sdk';

export const warpRouteConfigs: WarpCoreConfig = {
  tokens: [
    // Testnet configurations
    {
      chainName: 'basesepolia',
      standard: TokenStandard.EvmHypCollateral,
      decimals: 18,
      symbol: 'EDGEN',
      logoURI: 'https://d3b1ytuf3cg77l.cloudfront.net/img/layeredge_logo.svg',
      name: 'LayerEdge',
      addressOrDenom: '0x35c8cD01312257e98c70c2e6cdC1a3aE6e338769',
      collateralAddressOrDenom: '0xaCB36D5ff50D3A811282b7E334c418A8D37D29b8',
      connections: [
        {
          token: 'ethereum|bsctestnet|0x0bd1e41fD7fBC3A41daA33fd9B8eE36D832C3677',
        },
        {
          token: 'ethereum|edgentestnet|0x37ec16e00C39a84A082dFAb74Af450DedD50Bf77',
        },
      ],
    },
    {
      chainName: 'bsctestnet',
      standard: TokenStandard.EvmHypSynthetic,
      decimals: 18,
      symbol: 'EDGEN',
      logoURI: 'https://d3b1ytuf3cg77l.cloudfront.net/img/layeredge_logo.svg',
      name: 'LayerEdge',
      addressOrDenom: '0x0bd1e41fD7fBC3A41daA33fd9B8eE36D832C3677',
      connections: [
        {
          token: 'ethereum|basesepolia|0x35c8cD01312257e98c70c2e6cdC1a3aE6e338769',
        },
        {
          token: 'ethereum|edgentestnet|0x37ec16e00C39a84A082dFAb74Af450DedD50Bf77',
        },
      ],
    },
    {
      chainName: 'edgentestnet',
      standard: TokenStandard.EvmHypNative,
      decimals: 18,
      symbol: 'EDGEN',
      logoURI: 'https://d3b1ytuf3cg77l.cloudfront.net/img/layeredge_logo.svg',
      name: 'LayerEdge',
      addressOrDenom: '0x37ec16e00C39a84A082dFAb74Af450DedD50Bf77',
      connections: [
        {
          token: 'ethereum|basesepolia|0x35c8cD01312257e98c70c2e6cdC1a3aE6e338769',
        },
        {
          token: 'ethereum|bsctestnet|0x0bd1e41fD7fBC3A41daA33fd9B8eE36D832C3677',
        },
      ],
    },

    // MAINNET EDGEN Token Configuration - Updated
    {
      chainName: 'ethereum',
      standard: TokenStandard.EvmHypCollateral,
      decimals: 18,
      symbol: 'EDGEN',
      logoURI: 'https://d3b1ytuf3cg77l.cloudfront.net/img/layeredge_logo.svg',
      name: 'LayerEdge',
      addressOrDenom: '0xB8bB85FD0836691a64aFc23199566F898a1d6f4a',
      collateralAddressOrDenom: '0xAa9806c938836627Ed1a41Ae871c7E1889AE02Ca',
      connections: [
        {
          token: 'ethereum|bsc|0x0C808F0464C423d5Ea4F4454fcc23B6E2Ae75562',
        },
        {
          token: 'ethereum|edgenchain|0x22EacED1774e0e24D6F4c3b1e593488Be21Ac34f',
        },
      ],
    },
    {
      chainName: 'bsc',
      standard: TokenStandard.EvmHypSynthetic,
      decimals: 18,
      symbol: 'EDGEN',
      logoURI: 'https://d3b1ytuf3cg77l.cloudfront.net/img/layeredge_logo.svg',
      name: 'LayerEdge',
      addressOrDenom: '0x0C808F0464C423d5Ea4F4454fcc23B6E2Ae75562',
      connections: [
        {
          token: 'ethereum|ethereum|0xB8bB85FD0836691a64aFc23199566F898a1d6f4a',
        },
        {
          token: 'ethereum|edgenchain|0x22EacED1774e0e24D6F4c3b1e593488Be21Ac34f',
        },
      ],
    },
    {
      chainName: 'edgenchain',
      standard: TokenStandard.EvmHypNative,
      decimals: 18,
      symbol: 'EDGEN',
      logoURI: 'https://d3b1ytuf3cg77l.cloudfront.net/img/layeredge_logo.svg',
      name: 'LayerEdge',
      addressOrDenom: '0x22EacED1774e0e24D6F4c3b1e593488Be21Ac34f',
      connections: [
        {
          token: 'ethereum|ethereum|0xB8bB85FD0836691a64aFc23199566F898a1d6f4a',
        },
        {
          token: 'ethereum|bsc|0x0C808F0464C423d5Ea4F4454fcc23B6E2Ae75562',
        },
      ],
    },

    // USDC Token Configuration - Testnet
    {
      chainName: 'basesepolia',
      standard: TokenStandard.EvmHypCollateral,
      decimals: 18,
      symbol: 'USDC',
      name: 'USDC',
      logoURI: '/deployments/warp_routes/USDC/logo.svg',
      addressOrDenom: '0xab32a15707CC3078b060E5492155a1961d30512D',
      collateralAddressOrDenom: '0xC5F1c4fD247Bc71EA3E8754A3978c7f8011f4881',
      connections: [
        {
          token: 'ethereum|edgentestnet|0xaEc2Cf484dbfc8659EE86D033880dD0a2a7942Be',
        },
      ],
    },
    {
      chainName: 'bsctestnet',
      standard: TokenStandard.EvmHypCollateral,
      decimals: 18,
      symbol: 'USDC',
      name: 'USDC',
      logoURI: '/deployments/warp_routes/USDC/logo.svg',
      addressOrDenom: '0x555FB3b9a1725025F1FA25af5D0C363e2dc4e3B1',
      collateralAddressOrDenom: '0x7D076bE48425D3556f6622880B8e6483b8dd01E8',
      connections: [
        {
          token: 'ethereum|edgentestnet|0xaEc2Cf484dbfc8659EE86D033880dD0a2a7942Be',
        },
      ],
    },
    {
      chainName: 'edgentestnet',
      standard: TokenStandard.EvmHypSynthetic,
      decimals: 18,
      symbol: 'USDC',
      name: 'USDC',
      logoURI: '/deployments/warp_routes/USDC/logo.svg',
      addressOrDenom: '0xaEc2Cf484dbfc8659EE86D033880dD0a2a7942Be',
      connections: [
        {
          token: 'ethereum|basesepolia|0xab32a15707CC3078b060E5492155a1961d30512D',
        },
        {
          token: 'ethereum|bsctestnet|0x555FB3b9a1725025F1FA25af5D0C363e2dc4e3B1',
        },
      ],
    },
  ],
  options: {},
};
