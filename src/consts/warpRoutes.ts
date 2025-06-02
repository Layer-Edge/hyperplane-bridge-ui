import { TokenStandard, WarpCoreConfig } from '@hyperlane-xyz/sdk';

export const warpRouteConfigs: WarpCoreConfig = {
  tokens: [
    // MAINNET EDGEN Token Configuration
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
    // WETH Token Configuration
    {
      chainName: 'ethereum',
      standard: TokenStandard.EvmHypNative,
      decimals: 18,
      symbol: 'WETH',
      name: 'Wrapped Ether',
      addressOrDenom: '0xBeD6af5a688aC3F535d4E352D40d2ae67D22Ef24',
      connections: [
        {
          token: 'ethereum|edgenchain|0x4B0B28523e239A518Be03A0957299FBE87fa353C',
        },
      ],
    },
    {
      chainName: 'edgenchain',
      standard: TokenStandard.EvmHypSynthetic,
      decimals: 18,
      symbol: 'WETH',
      name: 'Wrapped Ether',
      addressOrDenom: '0x4B0B28523e239A518Be03A0957299FBE87fa353C',
      connections: [
        {
          token: 'ethereum|ethereum|0xBeD6af5a688aC3F535d4E352D40d2ae67D22Ef24',
        },
      ],
    },
  ],
  options: {},
};
