import { providers } from 'ethers';
import { useMemo } from 'react';
import { useConnectorClient } from 'wagmi';
import { useMultiProvider } from '../chains/hooks';

// Hook to get an ethers signer
export function useEthersSigner(chainName?: string) {
  const { data: client } = useConnectorClient();
  const multiProvider = useMultiProvider();

  return useMemo(() => {
    if (!client) return undefined;

    const { account, transport } = client;
    const provider = new providers.Web3Provider(transport);
    return provider.getSigner(account.address);
  }, [client, multiProvider, chainName]);
}

// Function to get a signer for a specific chain
export function getEthersSigner(client: any, multiProvider: any, chainName: string) {
  if (!client) return undefined;

  const { account, transport } = client;
  const provider = new providers.Web3Provider(transport);
  return provider.getSigner(account.address);
}
