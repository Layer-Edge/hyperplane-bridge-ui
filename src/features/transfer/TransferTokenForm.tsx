import { TokenAmount, WarpCore } from '@hyperlane-xyz/sdk';
import { ProtocolType, errorToString, isNullish, objKeys, toWei } from '@hyperlane-xyz/utils';
import {
  AccountInfo,
  HistoryIcon,
  IconButton,
  Modal,
  SpinnerIcon,
  WalletIcon,
  getAccountAddressAndPubKey,
  useAccountAddressForChain,
  useAccounts,
  useModal,
} from '@hyperlane-xyz/widgets';
import BigNumber from 'bignumber.js';
import { Form, Formik, useFormikContext } from 'formik';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { ConnectAwareSubmitButton } from '../../components/buttons/ConnectAwareSubmitButton';
import { SolidButton } from '../../components/buttons/SolidButton';
import { TextField } from '../../components/input/TextField';
import { WARP_QUERY_PARAMS } from '../../consts/args';
import { chainsRentEstimate } from '../../consts/chains';
import { config } from '../../consts/config';
import editIcon from '../../images/icons/edit-icon.svg';
import tokenTransferIcon from '../../images/icons/swapIcon.svg';
import { logger } from '../../utils/logger';
import { getQueryParams, updateQueryParam } from '../../utils/queryParams';
import { ChainConnectionWarning } from '../chains/ChainConnectionWarning';
import { ChainSelectField } from '../chains/ChainSelectField';
import { ChainWalletWarning } from '../chains/ChainWalletWarning';
import { useChainDisplayName, useMultiProvider } from '../chains/hooks';
import { getNumRoutesWithSelectedChain, tryGetValidChainName } from '../chains/utils';
import { useIsAccountSanctioned } from '../sanctions/hooks/useIsAccountSanctioned';
import { useStore } from '../store';
import { SelectOrInputTokenIds } from '../tokens/SelectOrInputTokenIds';
import { TokenSelectField } from '../tokens/TokenSelectField';
import { useIsApproveRequired } from '../tokens/approval';
import {
  getDestinationNativeBalance,
  useDestinationBalance,
  useOriginBalance,
} from '../tokens/balances';
import {
  getInitialTokenIndex,
  getTokenByIndex,
  getTokenIndexFromChains,
  useWarpCore,
} from '../tokens/hooks';
import { RecipientConfirmationModal } from './RecipientConfirmationModal';
import { useFetchMaxAmount } from './maxAmount';
import { TransferFormValues } from './types';
import { useRecipientBalanceWatcher } from './useBalanceWatcher';
import { useFeeQuotes } from './useFeeQuotes';
import { useTokenTransfer } from './useTokenTransfer';

export function TransferTokenForm() {
  const multiProvider = useMultiProvider();
  const warpCore = useWarpCore();
  const { originChainName, setOriginChainName } = useStore((s) => ({
    originChainName: s.originChainName,
    setOriginChainName: s.setOriginChainName,
  }));

  const initialValues = useFormInitialValues();
  const { accounts } = useAccounts(multiProvider, config.addressBlacklist);
  const { setIsSideBarOpen, isSideBarOpen } = useStore((s) => ({
    setIsSideBarOpen: s.setIsSideBarOpen,
    isSideBarOpen: s.isSideBarOpen,
  }));
  // Flag for if form is in input vs review mode
  const [isReview, setIsReview] = useState(false);
  // Flag for check current type of token
  const [isNft, setIsNft] = useState(false);
  // Modal for confirming address
  const {
    open: openConfirmationModal,
    close: closeConfirmationModal,
    isOpen: isConfirmationModalOpen,
  } = useModal();

  const validate = (values: TransferFormValues) => validateForm(warpCore, values, accounts);

  const onSubmitForm = async (values: TransferFormValues) => {
    logger.debug('Checking destination native balance for:', values.destination, values.recipient);
    const balance = await getDestinationNativeBalance(multiProvider, values);
    if (isNullish(balance)) return;
    else if (balance > 0n) {
      logger.debug('Reviewing transfer form values for:', values.origin, values.destination);
      setIsReview(true);
    } else {
      logger.debug('Recipient has no balance on destination. Confirming address.');
      openConfirmationModal();
    }
  };

  useEffect(() => {
    if (!originChainName) setOriginChainName(initialValues.origin);
  }, [initialValues.origin, originChainName, setOriginChainName]);

  return (
    <Formik<TransferFormValues>
      initialValues={initialValues}
      onSubmit={onSubmitForm}
      validate={validate}
      validateOnChange={false}
      validateOnBlur={false}
    >
      {({ isValidating }) => (
        <Form className="flex flex-col items-stretch w-full">
          <div className="flex justify-between items-center mb-4">
            <p className="gradient-text">Bridge</p>
            <IconButton
              className={`rounded-full bg-[#DBE2FA08] p-1`}
              title="History"
              onClick={() => setIsSideBarOpen(!isSideBarOpen)}
            >
              <HistoryIcon color="#fff" height={22} width={22} />
            </IconButton>
          </div>
          <WarningBanners />
          <ChainSelectSection isReview={isReview} />
          <AmountSection isNft={isNft} isReview={isReview} setIsNft={setIsNft} />
          <RecipientSection isReview={isReview} />
          <ReviewDetails visible={isReview} />
          <ButtonSection
            isReview={isReview}
            isValidating={isValidating}
            setIsReview={setIsReview}
          />
          <RecipientConfirmationModal
            isOpen={isConfirmationModalOpen}
            close={closeConfirmationModal}
            onConfirm={() => setIsReview(true)}
          />
        </Form>
      )}
    </Formik>
  );
}

function SwapChainsButton({
  disabled,
  onSwapChain,
}: {
  disabled?: boolean;
  onSwapChain: (origin: string, destination: string) => void;
}) {
  const { values, setFieldValue } = useFormikContext<TransferFormValues>();
  const { origin, destination } = values;

  const onClick = () => {
    if (disabled) return;
    setFieldValue('origin', destination);
    setFieldValue('destination', origin);
    // Reset other fields on chain change
    setFieldValue('recipient', '');
    onSwapChain(destination, origin);
  };

  return (
    <IconButton
      width={20}
      height={20}
      title="Swap chains"
      className={!disabled ? 'hover:rotate-180' : undefined}
      onClick={onClick}
      disabled={disabled}
    >
      <Image src={tokenTransferIcon} width={20} height={20} alt="" />
    </IconButton>
  );
}

function ChainSelectSection({ isReview }: { isReview: boolean }) {
  const warpCore = useWarpCore();

  const { setOriginChainName } = useStore((s) => ({
    setOriginChainName: s.setOriginChainName,
  }));

  const { values, setFieldValue } = useFormikContext<TransferFormValues>();

  const originRouteCounts = useMemo(() => {
    return getNumRoutesWithSelectedChain(warpCore, values.origin, true);
  }, [values.origin, warpCore]);

  const destinationRouteCounts = useMemo(() => {
    return getNumRoutesWithSelectedChain(warpCore, values.destination, false);
  }, [values.destination, warpCore]);

  const setTokenOnChainChange = (origin: string, destination: string) => {
    const tokenIndex = getTokenIndexFromChains(warpCore, null, origin, destination);
    const token = getTokenByIndex(warpCore, tokenIndex);
    updateQueryParam(WARP_QUERY_PARAMS.TOKEN, token?.addressOrDenom);
    setFieldValue('tokenIndex', tokenIndex);
  };

  const handleChange = (chainName: string, fieldName: string) => {
    if (fieldName === WARP_QUERY_PARAMS.ORIGIN) {
      setTokenOnChainChange(chainName, values.destination);
      setOriginChainName(chainName);
    } else if (fieldName === WARP_QUERY_PARAMS.DESTINATION) {
      setTokenOnChainChange(values.origin, chainName);
    }
    updateQueryParam(fieldName, chainName);
  };

  const onSwapChain = (origin: string, destination: string) => {
    updateQueryParam(WARP_QUERY_PARAMS.ORIGIN, origin);
    updateQueryParam(WARP_QUERY_PARAMS.DESTINATION, destination);
    setTokenOnChainChange(origin, destination);
    setOriginChainName(origin);
  };

  return (
    <div className="flex gap-4 justify-between items-center mt-2">
      <ChainSelectField
        name="origin"
        label="From"
        disabled={isReview}
        customListItemField={destinationRouteCounts}
        onChange={handleChange}
      />
      <div className="flex items-center rounded-full bg-[#DBE2FA0D] p-[8px] shadow-[0px_6px_24px_0px_#DBE2FA05_inset] backdrop-blur-[24px]">
        <SwapChainsButton disabled={isReview} onSwapChain={onSwapChain} />
      </div>
      <ChainSelectField
        name="destination"
        label="To"
        disabled={isReview}
        customListItemField={originRouteCounts}
        onChange={handleChange}
      />
    </div>
  );
}

function TokenSection({
  setIsNft,
  isReview,
}: {
  setIsNft: (b: boolean) => void;
  isReview: boolean;
}) {
  return (
    <div className="w-[30%]">
      <TokenSelectField name="tokenIndex" disabled={isReview} setIsNft={setIsNft} />
    </div>
  );
}

function AmountSection({
  isNft,
  isReview,
  setIsNft,
}: {
  isNft: boolean;
  isReview: boolean;
  setIsNft: (b: boolean) => void;
}) {
  const { values } = useFormikContext<TransferFormValues>();
  const { balance } = useOriginBalance(values);

  return (
    <div className="mt-3.5 space-x-4 rounded-[24px] bg-[#DBE2FA08] pb-[16px] pl-[16px] pr-[16px] pt-[0px]">
      <div className="flex justify-between items-end w-full">
        <div className="w-[70%]">
          {isNft ? (
            <SelectOrInputTokenIds disabled={isReview} />
          ) : (
            <div className="relative w-full">
              <TextField
                name="amount"
                placeholder="0.00"
                className="w-full"
                type="number"
                step="any"
                disabled={isReview}
              />
            </div>
          )}
        </div>
        <TokenSection setIsNft={setIsNft} isReview={isReview} />
      </div>
      <div className="mt-[20px] flex items-center justify-end gap-2">
        <TokenBalance label="My balance" balance={balance} />
        <MaxButton disabled={isReview} />
      </div>
    </div>
  );
}

function RecipientSection({ isReview }: { isReview: boolean }) {
  const { values, setFieldValue } = useFormikContext<TransferFormValues>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { balance } = useDestinationBalance(values);
  const [addressText, setAddressText] = useState(values.recipient);
  useRecipientBalanceWatcher(values.recipient, balance);
  const multiProvider = useMultiProvider();
  const { originChainName } = useStore((s) => ({
    originChainName: s.originChainName,
  }));
  const address = useAccountAddressForChain(multiProvider, originChainName);
  useEffect(() => {
    if (address && values.recipient === '') {
      setFieldValue('recipient', address);
    }
  }, [values.recipient, address, setFieldValue]);
  return (
    <div className="mt-4">
      <Modal
        dialogClassname="dialog-container"
        panelClassname="p-4 sm:p-5 max-w-lg min-h-[40vh] modal-conainer"
        isOpen={isModalOpen}
        close={() => setIsModalOpen(false)}
      >
        <div>
          <p className="mb-[20px] text-[24px] font-[400] text-[#fff]">Send To</p>
          <div className="relative mt-1 flex w-full items-center rounded-[24px] border-[1px] border-[#DBE2FA0D] px-[16px] py-[4px]">
            <WalletIcon color="#707997" width={20} height={20} />
            <TextField
              name="recipient"
              placeholder="0x123456..."
              className="w-full"
              style={{ fontSize: '12px' }}
              disabled={isReview}
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="relative mt-4 w-full rounded-[24px] bg-[#DBE2FA0D] px-[32px] py-[18px] font-[700] text-[#717A97]"
          >
            Cancel
          </button>
          <SolidButton
            type="button"
            color="accent"
            onClick={() => {
              setIsModalOpen(false);
              setFieldValue('recipient', addressText);
            }}
            className="gradient-border-button relative mt-4 w-full px-[32px] py-[18px] font-[700] text-[#050917]"
          >
            <div className="relative z-1">Save</div>
          </SolidButton>
        </div>
      </Modal>
      <div className="flex justify-between pr-1">
        <label htmlFor="recipient" className="block pl-0.5 text-sm text-gray-600">
          Recipient address
        </label>
        <TokenBalance label="Remote balance" balance={balance} />
      </div>
      <div className="relative mt-1 flex w-full items-center justify-center rounded-[24px] border-[1px] border-[#DBE2FA0D] px-[16px] py-[16px]">
        {/* <WalletIcon color="#707997" width={20} height={20} /> */}
        {/* <TextField
          name="recipient"
          placeholder="0x123456..."
          className="w-full"
          style={{ fontSize: '12px' }}
          disabled={isReview}
          value={values.recipient}
        /> */}
        {/* <SelfButton disabled={isReview} /> */}
        <span className="text-[16px] font-[500] text-[#707997]">Address:</span>
        <span className="ml-2 text-[16px] font-[500] text-[#fff]">
          {values.recipient.length > 6
            ? values.recipient.slice(0, 6) + '...' + values.recipient.slice(-4)
            : values.recipient}
        </span>
        <IconButton className="ml-2" onClick={() => setIsModalOpen(true)} disabled={isReview}>
          <Image src={editIcon} width={20} height={20} alt="edit" />
        </IconButton>
      </div>
    </div>
  );
}

function TokenBalance({ label, balance }: { label: string; balance?: TokenAmount | null }) {
  const value = balance?.getDecimalFormattedAmount().toFixed(5) || '0';
  return (
    <div className="text-right text-[12px] font-[500] text-[#707997]">{`${label}: ${value}`}</div>
  );
}

function ButtonSection({
  isReview,
  isValidating,
  setIsReview,
}: {
  isReview: boolean;
  isValidating: boolean;
  setIsReview: (b: boolean) => void;
}) {
  const { values } = useFormikContext<TransferFormValues>();
  const chainDisplayName = useChainDisplayName(values.destination);

  const isSanctioned = useIsAccountSanctioned();

  const onDoneTransactions = () => {
    setIsReview(false);
    setTransferLoading(false);
    // resetForm();
  };
  const { triggerTransactions } = useTokenTransfer(onDoneTransactions);

  const { setTransferLoading } = useStore((s) => ({
    setTransferLoading: s.setTransferLoading,
  }));

  const triggerTransactionsHandler = async () => {
    if (isSanctioned) {
      return;
    }
    setIsReview(false);
    setTransferLoading(true);
    await triggerTransactions(values);
  };

  if (!isReview) {
    return (
      <ConnectAwareSubmitButton
        chainName={values.origin}
        text={isValidating ? 'Validating...' : 'Continue'}
        classes="mt-4 font-[700] text-[#050917] relative gradient-border-button px-[32px] py-[18px]"
      />
    );
  }

  return (
    <div>
      <SolidButton
        type="button"
        color="accent"
        onClick={triggerTransactionsHandler}
        className="gradient-border-button relative mt-4 w-full px-[32px] py-[18px] font-[700] text-[#050917]"
      >
        <div className="relative z-1">{`Send to ${chainDisplayName}`}</div>
      </SolidButton>
    </div>
  );
}

function MaxButton({ balance, disabled }: { balance?: TokenAmount; disabled?: boolean }) {
  const { values, setFieldValue } = useFormikContext<TransferFormValues>();
  const { origin, destination, tokenIndex } = values;
  const multiProvider = useMultiProvider();
  const { accounts } = useAccounts(multiProvider);
  const { fetchMaxAmount, isLoading } = useFetchMaxAmount();

  const onClick = async () => {
    if (!balance || isNullish(tokenIndex) || disabled) return;
    const maxAmount = await fetchMaxAmount({ balance, origin, destination, accounts });
    if (isNullish(maxAmount)) return;
    const decimalsAmount = maxAmount.getDecimalFormattedAmount();
    const roundedAmount = new BigNumber(decimalsAmount).toFixed(4, BigNumber.ROUND_FLOOR);
    setFieldValue('amount', roundedAmount);
  };

  return (
    <SolidButton
      type="button"
      onClick={onClick}
      color="transparent"
      disabled={disabled}
      className="rounded-[50px] bg-[#DBE2FA0D] px-[12px] py-[4px] text-[12px] font-[700]"
    >
      {isLoading ? (
        <div className="flex items-center">
          <SpinnerIcon className="w-5 h-5" color="white" />
        </div>
      ) : (
        'Max'
      )}
    </SolidButton>
  );
}

// function SelfButton({ disabled }: { disabled?: boolean }) {
//   const { values, setFieldValue } = useFormikContext<TransferFormValues>();
//   const multiProvider = useMultiProvider();
//   const chainDisplayName = useChainDisplayName(values.destination);
//   const address = useAccountAddressForChain(multiProvider, values.destination);
//   const onClick = () => {
//     if (disabled) return;
//     if (address) setFieldValue('recipient', address);
//     else
//       toast.warn(`No account found for for chain ${chainDisplayName}, is your wallet connected?`);
//   };
//   return (
//     <SolidButton
//       type="button"
//       onClick={onClick}
//       color="transparent"
//       disabled={disabled}
//       className="absolute bottom-1 right-[16px] top-2.5 m-auto h-fit rounded-[50px] bg-[#DBE2FA0D] px-[12px] py-[4px] text-[12px] text-xs font-[700] opacity-90"
//     >
//       Self
//     </SolidButton>
//   );
// }

function ReviewDetails({ visible }: { visible: boolean }) {
  const { values } = useFormikContext<TransferFormValues>();
  const { amount, destination, tokenIndex } = values;
  const warpCore = useWarpCore();
  const originToken = getTokenByIndex(warpCore, tokenIndex);
  const originTokenSymbol = originToken?.symbol || '';
  const connection = originToken?.getConnectionForChain(destination);
  const destinationToken = connection?.token;
  const isNft = originToken?.isNft();

  const amountWei = isNft ? amount.toString() : toWei(amount, originToken?.decimals);

  const { isLoading: isApproveLoading, isApproveRequired } = useIsApproveRequired(
    originToken,
    amountWei,
    visible,
  );
  const { isLoading: isQuoteLoading, fees } = useFeeQuotes(values, visible);

  const isLoading = isApproveLoading || isQuoteLoading;

  const interchainQuote =
    originToken && objKeys(chainsRentEstimate).includes(originToken.chainName)
      ? fees?.interchainQuote.plus(chainsRentEstimate[originToken.chainName])
      : fees?.interchainQuote;

  return (
    <div
      className={`${
        visible ? 'max-h-screen duration-1000 ease-in' : 'max-h-0 duration-500'
      } overflow-hidden transition-all`}
    >
      <label className="mt-4 block pl-0.5 text-sm text-gray-600">Transactions</label>
      <div className="mt-1.5 space-y-2 break-all rounded-[24px] bg-[#DBE2FA08] px-2.5 py-2 text-sm">
        {isLoading ? (
          <div className="flex justify-center items-center py-6">
            <SpinnerIcon className="w-5 h-5" />
          </div>
        ) : (
          <>
            {isApproveRequired && (
              <div>
                <h4 className="text-[20px] text-white">Transaction 1: Approve Transfer</h4>
                <div className="ml-1.5 mt-1.5 space-y-1.5 pl-2 text-xs text-white">
                  <p>{`Router Address: ${originToken?.addressOrDenom}`}</p>
                  {originToken?.collateralAddressOrDenom && (
                    <p>{`Collateral Address: ${originToken.collateralAddressOrDenom}`}</p>
                  )}
                </div>
              </div>
            )}
            <div>
              <h4 className="text-[20px] text-white">{`Transaction${isApproveRequired ? ' 2' : ''}: Transfer Remote`}</h4>
              <div className="ml-1.5 mt-1.5 space-y-1.5 pl-2 text-xs text-white">
                {destinationToken?.addressOrDenom && (
                  <p className="flex justify-between text-[16px]">
                    <span className="min-w-[6.5rem] text-[#707997]">Remote Token</span>
                    <span className="text-white">{`${destinationToken.addressOrDenom.slice(0, 4)}...${destinationToken.addressOrDenom.slice(-4)}`}</span>
                  </p>
                )}
                <p className="flex justify-between">
                  <span className="min-w-[6.5rem] text-[16px] text-[#707997]">
                    {isNft ? 'Token ID' : 'Amount'}
                  </span>
                  <span className="text-white">{`${amount} ${originTokenSymbol}`}</span>
                </p>
                {fees?.localQuote && fees.localQuote.amount > 0n && (
                  <p className="flex justify-between text-[16px]">
                    <span className="min-w-[6.5rem] text-[#707997]">Local Gas (est.)</span>
                    <span className="text-white">{`${fees.localQuote.getDecimalFormattedAmount().toFixed(4) || '0'} ${
                      fees.localQuote.token.symbol || ''
                    }`}</span>
                  </p>
                )}
                {interchainQuote && interchainQuote.amount > 0n && (
                  <p className="flex justify-between text-[16px]">
                    <span className="min-w-[6.5rem] text-[#707997]">Interchain Gas</span>
                    <span className="text-white">{`${interchainQuote.getDecimalFormattedAmount().toFixed(4) || '0'} ${
                      interchainQuote.token.symbol || ''
                    }`}</span>
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function WarningBanners() {
  const { values } = useFormikContext<TransferFormValues>();
  return (
    // Max height to prevent double padding if multiple warnings are visible
    <div className="max-h-10">
      <ChainWalletWarning origin={values.origin} />
      <ChainConnectionWarning origin={values.origin} destination={values.destination} />
    </div>
  );
}

function useFormInitialValues(): TransferFormValues {
  const warpCore = useWarpCore();
  const params = getQueryParams();

  const originQuery = tryGetValidChainName(
    params.get(WARP_QUERY_PARAMS.ORIGIN),
    warpCore.multiProvider,
  );
  const destinationQuery = tryGetValidChainName(
    params.get(WARP_QUERY_PARAMS.DESTINATION),
    warpCore.multiProvider,
  );
  const defaultOriginToken = config.defaultOriginChain
    ? warpCore.getTokensForChain(config.defaultOriginChain)?.[0]
    : undefined;

  const tokenIndex = getInitialTokenIndex(
    warpCore,
    params.get(WARP_QUERY_PARAMS.TOKEN),
    originQuery,
    destinationQuery,
    defaultOriginToken,
    config.defaultDestinationChain,
  );
  const multiProvider = useMultiProvider();
  const firstToken = defaultOriginToken || warpCore.tokens[0];
  const connectedToken = firstToken.connections?.[0];
  const chainsValid = originQuery && destinationQuery;
  const address = useAccountAddressForChain(
    multiProvider,
    chainsValid
      ? destinationQuery
      : config.defaultDestinationChain || connectedToken?.token?.chainName || '',
  );
  return useMemo(() => {
    const firstToken = defaultOriginToken || warpCore.tokens[0];
    const connectedToken = firstToken.connections?.[0];
    const chainsValid = originQuery && destinationQuery;

    return {
      origin: chainsValid ? originQuery : firstToken.chainName,
      destination: chainsValid
        ? destinationQuery
        : config.defaultDestinationChain || connectedToken?.token?.chainName || '',
      tokenIndex: tokenIndex,
      amount: '',
      recipient: address || '',
    };
  }, [warpCore, destinationQuery, originQuery, tokenIndex, defaultOriginToken, address]);
}

const insufficientFundsErrMsg = /insufficient.[funds|lamports]/i;
const emptyAccountErrMsg = /AccountNotFound/i;

async function validateForm(
  warpCore: WarpCore,
  values: TransferFormValues,
  accounts: Record<ProtocolType, AccountInfo>,
) {
  try {
    const { origin, destination, tokenIndex, amount, recipient } = values;
    const token = getTokenByIndex(warpCore, tokenIndex);
    if (!token) return { token: 'Token is required' };
    const amountWei = toWei(amount, token.decimals);
    const { address, publicKey: senderPubKey } = getAccountAddressAndPubKey(
      warpCore.multiProvider,
      origin,
      accounts,
    );
    const result = await warpCore.validateTransfer({
      originTokenAmount: token.amount(amountWei),
      destination,
      recipient,
      sender: address || '',
      senderPubKey: await senderPubKey,
    });
    return result;
  } catch (error: any) {
    logger.error('Error validating form', error);
    let errorMsg = errorToString(error, 40);
    const fullError = `${errorMsg} ${error.message}`;
    if (insufficientFundsErrMsg.test(fullError) || emptyAccountErrMsg.test(fullError)) {
      errorMsg = 'Insufficient funds for gas fees';
    }
    return { form: errorMsg };
  }
}
