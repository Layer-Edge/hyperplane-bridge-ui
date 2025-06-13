import { toWei } from '@hyperlane-xyz/utils';
import {
  getAccountAddressForChain,
  useAccounts,
  useActiveChains,
  useTransactionFns,
} from '@hyperlane-xyz/widgets';
import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { switchChain } from 'viem/actions';
import { useConnectorClient } from 'wagmi';
import { toastTxSuccess } from '../../components/toast/TxSuccessToast';
import { logger } from '../../utils/logger';
import { useMultiProvider } from '../chains/hooks';
import { getChainDisplayName } from '../chains/utils';
import { useStore } from '../store';
import { getTokenByIndex, useWarpCore } from '../tokens/hooks';
import { TransferFormValues, TransferStatus } from './types';
import { getEthersSigner } from './useEthersSigner';

const GASLESS_BRIDGE_ADDRESS = '0xaA713C497e491e615283b9B127f0390839611287';
const CHAIN_MISMATCH_ERROR = 'ChainMismatchError';

// Visually, we have used the term "feeless" instead of "gasless" for our users
export function useGaslessBridge(onDone?: () => void) {
  const { transfers, addTransfer, updateTransferStatus } = useStore((s) => ({
    transfers: s.transfers,
    addTransfer: s.addTransfer,
    updateTransferStatus: s.updateTransferStatus,
  }));
  const transferIndex = transfers.length;

  const multiProvider = useMultiProvider();
  const warpCore = useWarpCore(); // Still needed to get token info
  const activeAccounts = useAccounts(multiProvider);
  const activeChains = useActiveChains(multiProvider);
  const transactionFns = useTransactionFns(multiProvider);
  const { data: client } = useConnectorClient();

  const [isLoading, setIsLoading] = useState(false);

  const executeGasslessBridge = useCallback(
    async (values: TransferFormValues) => {
      logger.debug('Preparing feeless bridge transaction');
      setIsLoading(true);
      let transferStatus: TransferStatus = TransferStatus.Preparing;
      updateTransferStatus(transferIndex, transferStatus);

      const { origin, destination, tokenIndex, amount, recipient } = values;

      // Get the signer for the specific origin chain
      const signer = getEthersSigner(client, multiProvider, origin);

      if (!signer || !client) {
        toast.error('Signer not available. Please connect your wallet.');
        setIsLoading(false);
        updateTransferStatus(transferIndex, TransferStatus.Failed);
        return;
      }

      try {
        // Validate that user is on the correct chain
        const networkInfo = await signer.provider.getNetwork();
        const originChainId = multiProvider.getChainMetadata(origin).chainId;

        // Convert chainIds to numbers for comparison
        const signerChainId = parseInt(networkInfo.chainId.toString());
        const expectedChainId = parseInt(originChainId.toString());

        if (signerChainId !== expectedChainId) {
          // Switch chain
          await switchChain(client, { id: expectedChainId });
        }

        // Still use warpCore to get token information
        const originToken = getTokenByIndex(warpCore, tokenIndex);
        if (!originToken) throw new Error('Token not found');

        const connection = originToken?.getConnectionForChain(destination);
        if (!connection) throw new Error('No token route found between chains');

        const weiAmount = toWei(amount, originToken.decimals);
        const sender = getAccountAddressForChain(multiProvider, origin, activeAccounts.accounts);

        if (!sender) throw new Error('No active account found');

        // Add the transfer to the store before executing
        addTransfer({
          timestamp: new Date().getTime(),
          status: TransferStatus.Preparing,
          origin,
          destination,
          originTokenAddressOrDenom: originToken.addressOrDenom,
          destTokenAddressOrDenom: connection.token.addressOrDenom,
          sender,
          recipient,
          amount,
        });

        updateTransferStatus(transferIndex, (transferStatus = TransferStatus.SigningTransfer));

        // Create a transaction to send native Edgen to the bridge address
        const tx = {
          to: GASLESS_BRIDGE_ADDRESS,
          value: weiAmount,
          // Set gasLimit explicitly to ensure transaction doesn't fail due to estimation issues
          gasLimit: 21000, // Standard gas limit for a simple transfer
        };

        // Send the transaction using ethers signer
        const txResponse = await signer.sendTransaction(tx);

        updateTransferStatus(transferIndex, (transferStatus = TransferStatus.ConfirmingTransfer));

        // Wait for the transaction to be confirmed
        const receipt = await txResponse.wait();
        const hash = receipt.transactionHash;

        logger.debug('Feeless bridge transaction confirmed, hash:', hash);
        toastTxSuccess('Feeless bridge transaction sent!', hash, origin);

        // Update transfer status with hash
        updateTransferStatus(transferIndex, (transferStatus = TransferStatus.ConfirmedTransfer), {
          originTxHash: hash,
        });

        toast.success('Your tokens will be delivered within 24 hours');
      } catch (error: any) {
        logger.error(`Error at stage ${transferStatus}`, error);
        const errorDetails = error.message || error.toString();
        updateTransferStatus(transferIndex, TransferStatus.Failed);

        if (errorDetails.includes(CHAIN_MISMATCH_ERROR)) {
          toast.error(
            `Please connect your wallet to ${getChainDisplayName(multiProvider, origin)}`,
          );
        } else {
          toast.error('Failed to initiate feeless bridge: ' + errorDetails);
        }
      }

      setIsLoading(false);
      if (onDone) onDone();
    },
    [
      warpCore,
      transferIndex,
      activeAccounts,
      activeChains,
      transactionFns,
      multiProvider,
      setIsLoading,
      addTransfer,
      updateTransferStatus,
      onDone,
      client,
    ],
  );

  return {
    isLoading,
    executeGasslessBridge,
  };
}
