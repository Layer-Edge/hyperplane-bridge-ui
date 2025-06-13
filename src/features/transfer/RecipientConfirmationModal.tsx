import { Modal } from '@hyperlane-xyz/widgets';
import { useFormikContext } from 'formik';
import { SolidButton } from '../../components/buttons/SolidButton';
import { TransferFormValues } from './types';

export function RecipientConfirmationModal({
  isOpen,
  close,
  onConfirm,
}: {
  isOpen: boolean;
  close: () => void;
  onConfirm: () => void;
}) {
  const { values } = useFormikContext<TransferFormValues>();

  return (
    <Modal
      isOpen={isOpen}
      close={close}
      title="Confirm Recipient Address"
      dialogClassname="dialog-container"
      panelClassname="flex flex-col items-center p-4 gap-5 modal-conainer"
    >
      <div>
        <p className="text-center text-sm text-[#707997]">
          The recipient address has no funds on the destination chain. Is this address correct?
        </p>
        <p className="text-center text-sm text-white">{values.recipient}</p>
        <div className="mt-[15px] flex items-center justify-center gap-12">
          <SolidButton onClick={close} color="gray" className="min-w-24 px-4 py-1">
            Cancel
          </SolidButton>
          <SolidButton
            onClick={() => {
              close();
              onConfirm();
            }}
            color="primary"
            className="min-w-24 px-4 py-1"
          >
            Continue
          </SolidButton>
        </div>
      </div>
    </Modal>
  );
}
