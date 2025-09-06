import { isNullish } from '@hyperlane-xyz/utils';
import { SpinnerIcon, useAccountAddressForChain, useAccounts } from '@hyperlane-xyz/widgets';
import BigNumber from 'bignumber.js';
import { Form, Formik, useFormikContext } from 'formik';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { addChain, switchChain } from 'viem/actions';
import { useConnectorClient } from 'wagmi';
import { ConnectAwareSubmitButton } from '../../components/buttons/ConnectAwareSubmitButton';
import { SolidButton } from '../../components/buttons/SolidButton';
import { TextField } from '../../components/input/TextField';
import { config } from '../../consts/config';
import tokenTransferIcon from '../../images/icons/swapIcon.svg';
import { ChainSelectField } from '../chains/ChainSelectField';
import { useMultiProvider } from '../chains/hooks';
import { useStore } from '../store';
import { useDestinationBalance, useOriginBalance } from '../tokens/balances';
import { useWarpCore } from '../tokens/hooks';
import { TokenSelectField } from '../tokens/TokenSelectField';
import { FreeBridgingModal } from './FreeBridgingModal';
import { useFetchMaxAmount } from './maxAmount';
import { TransferFormValues } from './types';
import { validateForm } from './utils';

const EDGEN_CHAIN = 'edgenchain';
const BSC_CHAIN = 'bsc';

function DisabledSwapArrow() {
  return (
    <div className="flex items-center rounded-full bg-[#DBE2FA0D] p-[8px] shadow-[0px_6px_24px_0px_#DBE2FA05_inset] backdrop-blur-[24px]">
      <Image src={tokenTransferIcon} width={20} height={20} alt="swap" className="opacity-40" />
    </div>
  );
}

function DisabledRecipientSection({ recipient }: { recipient: string }) {
  const { values } = useFormikContext<TransferFormValues>();
  const { balance } = useDestinationBalance(values);
  return (
    <div className="mt-4">
      <div className="flex justify-between pr-1">
        <label htmlFor="recipient" className="block pl-0.5 text-sm text-gray-600">
          Recipient address
        </label>
        <div className="text-right text-[12px] font-[500] text-[#707997]">
          Remote balance: {balance?.getDecimalFormattedAmount().toFixed(5) || '0'}
        </div>
      </div>
      <div className="relative mt-1 flex w-full items-center justify-center rounded-[24px] border-[1px] border-[#DBE2FA0D] px-[16px] py-[16px]">
        <span className="text-[16px] font-[500] text-[#707997]">Address:</span>
        <span className="ml-2 text-[16px] font-[500] text-[#fff]">
          {recipient.length > 6 ? recipient.slice(0, 6) + '...' + recipient.slice(-4) : recipient}
        </span>
      </div>
    </div>
  );
}

function ButtonSection({ isValidating }: { isValidating: boolean }) {
  const { values } = useFormikContext<TransferFormValues>();
  const multiProvider = useMultiProvider();
  const { data: client } = useConnectorClient();

  // Always EdgenChain -> BSC
  const origin = values.origin;
  const originChainMetadata = multiProvider.getChainMetadata(origin);
  const originChainId = Number(originChainMetadata.chainId);
  const currentChainId = client?.chain?.id;
  const isOnCorrectChain = currentChainId === originChainId;

  const handleChainSwitch = async () => {
    if (!client) return;
    const originChainMetadata = multiProvider.getChainMetadata(origin);
    const originChainId = Number(originChainMetadata.chainId);

    // First try to switch to the chain
    try {
      await switchChain(client, { id: originChainId });
    } catch (switchError: any) {
      // If the chain doesn't exist (error code 4902), add it first
      if (switchError.code === 4902) {
        await addChain(client, {
          chain: {
            id: originChainId,
            name: originChainMetadata.displayName || originChainMetadata.name,
            nativeCurrency: {
              name: originChainMetadata.nativeToken?.name || 'LayerEdge',
              symbol: originChainMetadata.nativeToken?.symbol || 'EDGEN',
              decimals: originChainMetadata.nativeToken?.decimals || 18,
            },
            rpcUrls: {
              default: {
                http: originChainMetadata.rpcUrls.map((url) => url.http),
              },
            },
            blockExplorers: originChainMetadata.blockExplorers
              ? {
                  default: {
                    name: originChainMetadata.blockExplorers[0].name,
                    url: originChainMetadata.blockExplorers[0].url,
                  },
                }
              : undefined,
          },
        });

        // Now try to switch to the chain again
        await switchChain(client, { id: originChainId });
      } else {
        throw switchError;
      }
    }
  };

  if (!isOnCorrectChain) {
    return (
      <SolidButton
        type="button"
        color="accent"
        onClick={handleChainSwitch}
        className="gradient-border-button relative mt-4 w-full px-[32px] py-[18px] font-[700] text-[#050917]"
      >
        <div className="z-1 relative">
          Switch to {originChainMetadata.displayName || originChainMetadata.name}
        </div>
      </SolidButton>
    );
  }

  return (
    <ConnectAwareSubmitButton
      chainName={values.origin}
      text={isValidating ? 'Validating...' : 'Bridge for Free (24h ETA)'}
      classes="mt-4 font-[700] text-[#050917] relative gradient-border-button px-[32px] py-[18px]"
    />
  );
}

function MaxButton({ balance, disabled }: { balance?: any; disabled?: boolean }) {
  const { values, setFieldValue } = useFormikContext<TransferFormValues>();
  const { origin, destination, tokenIndex } = values;
  const multiProvider = useWarpCore().multiProvider;
  const { accounts } = useAccounts(multiProvider);
  const { fetchMaxAmount, isLoading } = useFetchMaxAmount();

  const onClick = async () => {
    if (disabled || !balance || isNullish(tokenIndex)) {
      return;
    }
    try {
      const maxAmount = await fetchMaxAmount({ balance, origin, destination, accounts });
      if (isNullish(maxAmount)) return;
      const decimalsAmount = maxAmount.getDecimalFormattedAmount();
      const roundedAmount = new BigNumber(decimalsAmount).toFixed(4, BigNumber.ROUND_FLOOR);
      setFieldValue('amount', roundedAmount);
    } catch (error) {
      // handle error
    }
  };
  if (!balance) return null;
  return (
    <SolidButton
      type="button"
      onClick={onClick}
      color="transparent"
      disabled={disabled || isLoading}
      className="rounded-[50px] bg-[#DBE2FA0D] px-[12px] py-[4px] text-[12px] font-[700]"
    >
      {isLoading ? (
        <div className="flex items-center">
          <SpinnerIcon className="h-5 w-5" color="white" />
        </div>
      ) : (
        'Max'
      )}
    </SolidButton>
  );
}

export function FeelessTokenForm() {
  const warpCore = useWarpCore();
  const { setOriginChainName } = useStore((s) => ({ setOriginChainName: s.setOriginChainName }));
  const { accounts } = useAccounts(warpCore.multiProvider, config.addressBlacklist);
  const [isFreeBridgingModalOpen, setFreeBridgingModalOpen] = useState(false);
  const tokensWithRoute = warpCore.getTokensForRoute(EDGEN_CHAIN, BSC_CHAIN);
  const token = tokensWithRoute[0];
  const tokenIndex = warpCore.tokens.indexOf(token);
  const multiProvider = warpCore.multiProvider;
  const originChainName = EDGEN_CHAIN;
  const address = useAccountAddressForChain(multiProvider, originChainName);

  useEffect(() => {
    setOriginChainName(EDGEN_CHAIN);
  }, [setOriginChainName]);

  const initialValues: TransferFormValues = {
    origin: EDGEN_CHAIN,
    destination: BSC_CHAIN,
    tokenIndex,
    amount: '',
    recipient: address || '',
  };

  const validate = (values: TransferFormValues) => validateForm(warpCore, values, accounts);

  return (
    <Formik<TransferFormValues>
      initialValues={initialValues}
      validate={validate}
      onSubmit={() => setFreeBridgingModalOpen(true)}
      enableReinitialize
    >
      {({ isValidating, values }) => {
        const { balance } = useOriginBalance(values);
        return (
          <Form className="flex w-full flex-col items-stretch">
            {/* Header */}
            <div className="mb-2 mt-2 text-[1.5rem] font-bold text-white">Feeless Bridge</div>
            <div className="mb-4 text-sm text-gray-400">Feeless Bridge from EDGEN to BSC chain</div>
            {/* Chain selection section (disabled) */}
            <div className="mt-2 flex items-center justify-between gap-4">
              <ChainSelectField name="origin" label="From" disabled={true} />
              <DisabledSwapArrow />
              <ChainSelectField name="destination" label="To" disabled={true} />
            </div>
            {/* Token and amount section */}
            <div className="mt-3.5 space-x-4 rounded-[24px] bg-[#DBE2FA08] pb-[16px] pl-[16px] pr-[16px] pt-[0px]">
              <div className="flex w-full items-end justify-between">
                <div className="w-[70%]">
                  <div className="relative w-full">
                    <TextField
                      name="amount"
                      placeholder="0.00"
                      className="w-full"
                      type="number"
                      step="any"
                      min="0"
                      autoComplete="off"
                    />
                  </div>
                </div>
                <div className="w-[30%]">
                  <TokenSelectField name="tokenIndex" disabled={true} setIsNft={() => {}} />
                </div>
              </div>
              <div className="mt-[20px] flex items-center justify-end gap-2">
                <div className="text-right text-[12px] font-[500] text-[#707997]">
                  My balance: <span>{balance?.getDecimalFormattedAmount().toFixed(5) || '0'}</span>
                </div>
                <MaxButton balance={balance} disabled={false} />
              </div>
            </div>
            {/* Info banner */}
            <div className="relative mb-4 mt-4 flex w-full items-center justify-center">
              <span className="text-[12px] font-[500] text-[#707997]">
                This is a feeless bridge experience. You'll receive your funds within 24 hours.
                <br />
                You won't need gas to claim.
              </span>
            </div>
            {/* Recipient section (disabled) */}
            <DisabledRecipientSection recipient={values.recipient} />
            {/* Button */}
            <ButtonSection isValidating={isValidating} />
            <FreeBridgingModal
              isOpen={isFreeBridgingModalOpen}
              close={() => setFreeBridgingModalOpen(false)}
              onConfirm={() => setFreeBridgingModalOpen(false)}
            />
          </Form>
        );
      }}
    </Formik>
  );
}
