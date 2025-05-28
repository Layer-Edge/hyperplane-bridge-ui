import { TokenStandard, WarpCoreConfig } from '@hyperlane-xyz/sdk';

// A list of Warp Route token configs
// These configs will be merged with the warp routes in the configured registry
// The input here is typically the output of the Hyperlane CLI warp deploy command
export const warpRouteConfigs: WarpCoreConfig = {
  tokens: [
    // EDGEN Token Configuration
    {
      chainName: 'basesepolia',
      standard: TokenStandard.EvmHypCollateral,
      decimals: 18,
      symbol: 'EDGEN',
      logoURI: '/edge-logo.png',
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
      logoURI: '/edge-logo.png',
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
      logoURI: '/edge-logo.png',
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
    // USDC Token Configuration
    {
      chainName: 'basesepolia',
      standard: TokenStandard.EvmHypCollateral,
      decimals: 18,
      symbol: 'USDC',
      name: 'USDC',
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
