import { IRegistry } from '@hyperlane-xyz/registry';
import {
  ChainMap,
  ChainMetadata,
  ChainMetadataSchema,
  mergeChainMetadataMap,
  RpcUrlSchema,
} from '@hyperlane-xyz/sdk';
import {
  objMap,
  ProtocolType,
  tryParseJsonOrYaml,
} from '@hyperlane-xyz/utils';
import { z } from 'zod';
import { chains as ChainsTS } from '../../consts/chains.ts';
import ChainsYaml from '../../consts/chains.yaml';
import { config } from '../../consts/config.ts';
import { logger } from '../../utils/logger.ts';

export async function assembleChainMetadata(
    chainsInTokens: ChainName[],
    registry: IRegistry,
    storeMetadataOverrides?: ChainMap<Partial<ChainMetadata | undefined>>,
) {
  // Chains must include a cosmos chain or CosmosKit throws errors
  // @ts-ignore
  const result = z.record(ChainMetadataSchema).safeParse({
    ...ChainsYaml,
    ...ChainsTS,
  });
  if (!result.success) {
    logger.warn('Invalid chain metadata', result.error);
    throw new Error(`Invalid chain metadata: ${result.error.toString()}`);
  }
  const filesystemMetadata = result.data as ChainMap<ChainMetadata>;

  // Set registryChainMetadata to empty object to only use custom chains
  const registryChainMetadata: ChainMap<ChainMetadata> = {};


  // Skip registry fetching since we want empty registry metadata
  logger.debug('Using only custom chains from filesystem, skipping registry');

  // Since registryChainMetadata is empty, merging will only use filesystemMetadata
  const mergedChainMetadata = mergeChainMetadataMap(registryChainMetadata, filesystemMetadata);

  const parsedRpcOverridesResult = tryParseJsonOrYaml(config.rpcOverrides);
  // @ts-ignore
  const rpcOverrides = z.record(RpcUrlSchema)
      .safeParse(parsedRpcOverridesResult.success && parsedRpcOverridesResult.data);
  if (config.rpcOverrides && !rpcOverrides.success) {
    logger.warn('Invalid RPC overrides config', rpcOverrides.error);
  }

  const chainMetadata = objMap(mergedChainMetadata, (chainName, metadata) => {
    const overridesUrl =
        rpcOverrides.success && rpcOverrides.data[chainName]
            ? rpcOverrides.data[chainName]
            : undefined;

    if (!overridesUrl) return metadata;

    // Only EVM supports fallback transport, so we are putting the override at the end
    const rpcUrls =
        metadata.protocol === ProtocolType.Ethereum
            ? [...metadata.rpcUrls, overridesUrl]
            : [overridesUrl, ...metadata.rpcUrls];

    return { ...metadata, rpcUrls };
  });

  const chainMetadataWithOverrides = mergeChainMetadataMap(chainMetadata, storeMetadataOverrides);
  return { chainMetadata, chainMetadataWithOverrides };
}
