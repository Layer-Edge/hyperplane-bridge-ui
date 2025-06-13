// src/features/transfer/FreeBridgingModal.tsx
import { Modal } from '@hyperlane-xyz/widgets';
import { useFormikContext } from 'formik';
import { SolidButton } from '../../components/buttons/SolidButton';
import { useStore } from '../store';
import { TransferFormValues } from './types';
import { useGaslessBridge } from './useGasslessBridge';

export function FreeBridgingModal({
  isOpen,
  close,
  onConfirm,
}: {
  isOpen: boolean;
  close: () => void;
  onConfirm: () => void;
}) {
  const { values } = useFormikContext<TransferFormValues>();
  const { executeGasslessBridge, isLoading } = useGaslessBridge(onConfirm);
  const { setTransferLoading } = useStore((s) => ({
    setTransferLoading: s.setTransferLoading,
  }));

  const handleConfirm = async () => {
    close();
    setTransferLoading(true);
    await executeGasslessBridge(values);
    setTransferLoading(false);
    onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      close={close}
      dialogClassname="dialog-container"
      panelClassname="p-6 sm:p-8 max-w-lg min-h-[40vh] modal-container bg-[#1a1d29] rounded-[24px] border border-[#DBE2FA0D]"
    >
      <div className="flex flex-col items-center gap-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="mb-2 text-[24px] font-[400] text-white">Free Bridging to BSC Chain</h2>
        </div>

        {/* Main Content */}
        <div className="w-full space-y-6">
          <div className="text-center">
            <p className="text-[16px] leading-relaxed text-[#707997]">
              This is a free bridge from Edgen Chain to BSC Chain. Once you initiate, your transfer
              will be queued for processing and delivered within ~24 hours.
            </p>
          </div>

          {/* Time Information */}
          <div className="space-y-2 rounded-[16px] bg-[#DBE2FA08] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-[#707997]">Request Time (UTC):</span>
              <span className="text-[14px] font-[500] text-white">
                {new Date().toLocaleString('en-US', {
                  timeZone: 'UTC',
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-[#707997]">Estimated Arrival:</span>
              <span className="text-[14px] font-[500] text-white">
                {new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString('en-US', {
                  timeZone: 'UTC',
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* Gas Information */}
          <div className="text-center">
            <p className="text-[14px] text-[#707997]">You won't need gas to claim.</p>
          </div>

          {/* Token Import Information */}
          <div className="space-y-3 rounded-[16px] bg-[#DBE2FA08] p-4">
            <p className="text-center text-[14px] text-white">
              To view your $EDGEN on BSC Chain, import the token manually:
            </p>
            <div className="rounded-[12px] border border-[#DBE2FA0D] bg-[#DBE2FA0D] p-3">
              <code className="break-all font-mono text-[12px] text-[#fff]">
                0x0c808f464c423d5ea4f44554fcc23b62ae75562
              </code>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex w-full gap-4">
          <button
            type="button"
            onClick={close}
            className="flex-1 rounded-[24px] border border-[#DBE2FA0D] bg-[#DBE2FA0D] px-[32px] py-[18px] font-[700] text-[#717A97] transition-colors hover:bg-[#DBE2FA15]"
          >
            Cancel
          </button>
          <SolidButton
            type="button"
            color="accent"
            onClick={handleConfirm}
            disabled={isLoading}
            className="gradient-border-button flex-1 px-[32px] py-[18px] font-[700] text-[#050917]"
          >
            <div className="z-1 relative">Confirm Bridge</div>
          </SolidButton>
        </div>
      </div>
    </Modal>
  );
}
