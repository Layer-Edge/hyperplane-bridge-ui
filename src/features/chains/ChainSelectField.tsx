import { ChainSearchMenuProps, ChevronIcon } from '@hyperlane-xyz/widgets';
import { useField, useFormikContext } from 'formik';
import { useState } from 'react';
import { ChainLogo } from '../../components/icons/ChainLogo';
import { TransferFormValues } from '../transfer/types';
import { ChainSelectListModal } from './ChainSelectModal';
import { useChainDisplayName } from './hooks';

type Props = {
  name: string;
  label: string;
  onChange?: (id: ChainName, fieldName: string) => void;
  disabled?: boolean;
  customListItemField: ChainSearchMenuProps['customListItemField'];
};

export function ChainSelectField({ name, label, onChange, disabled, customListItemField }: Props) {
  const [field, , helpers] = useField<ChainName>(name);
  const { setFieldValue } = useFormikContext<TransferFormValues>();

  const displayName = useChainDisplayName(field.value, true);

  const handleChange = (chainName: ChainName) => {
    helpers.setValue(chainName);
    // Reset other fields on chain change
    setFieldValue('recipient', '');
    setFieldValue('amount', '');
    if (onChange) onChange(chainName, name);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);

  const onClick = () => {
    if (!disabled) setIsModalOpen(true);
  };

  return (
    <div className="flex-[4]">
      <button
        type="button"
        name={field.name}
        className={`${styles.base} ${disabled ? styles.disabled : styles.enabled}`}
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          <div className="max-w-[1.4rem] sm:max-w-fit">
            <ChainLogo chainName={field.value} size={32} />
          </div>
          <div className="flex flex-col items-start gap-1">
            <label htmlFor={name} className="text-[12px] text-[#707997]">
              {label}
            </label>
            <span className="text-[18px] font-semibold text-white">{displayName}</span>
          </div>
        </div>
        <ChevronIcon width={12} height={8} direction="s" color="#fff" />
      </button>
      <ChainSelectListModal
        isOpen={isModalOpen}
        close={() => setIsModalOpen(false)}
        onSelect={handleChange}
        customListItemField={customListItemField}
      />
    </div>
  );
}

const styles = {
  base: 'bg-[#DBE2FA08] px-[16px] py-[16px] w-full flex items-center justify-between text-sm rounded-[24px] outline-none transition-colors duration-500',
  enabled: 'active:scale-95',
  disabled: 'cursor-default',
};
