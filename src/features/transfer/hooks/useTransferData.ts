import { useQuery } from '@tanstack/react-query';
import { get } from '../../api';
import { BridgeTransferResponse } from '../transferApi';

/**
 * Hook to fetch transfer details by transaction hash
 * @param hash The transaction hash to query
 * @param enabled Whether the query should run
 * @returns Query result with transfer details
 */
export function useTransferData(hash: string | undefined, enabled = true) {
  return useQuery<BridgeTransferResponse | null, Error>({
    queryKey: ['transferData', hash],
    queryFn: async () => {
      if (!hash) return null;

      try {
        return await get<BridgeTransferResponse>(`api/bridge/transfers/${hash}`);
      } catch (error) {
        console.error('Error fetching transfer details:', error);
        return null;
      }
    },
    enabled: !!hash && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });
}
