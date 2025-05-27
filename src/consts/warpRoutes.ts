import { TokenStandard, WarpCoreConfig } from '@hyperlane-xyz/sdk';

// A list of Warp Route token configs
// These configs will be merged with the warp routes in the configured registry
// The input here is typically the output of the Hyperlane CLI warp deploy command
export const warpRouteConfigs: WarpCoreConfig = {
    tokens: [
        {
            chainName: 'basesepolia',
            standard: TokenStandard.EvmHypCollateral,
            decimals: 18,
            symbol: 'EDGEN',
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
    ],
    options: {},
};
