import { HistoryIcon, IconButton } from '@hyperlane-xyz/widgets';
import { useFormikContext } from 'formik';
import { TransferFormValues } from './types';
import { checkIsEdgenToBsc } from './utils';

const Header = ({ setIsSideBarOpen, isSideBarOpen }) => {
  const { values } = useFormikContext<TransferFormValues>();
  const { origin, destination } = values;
  const isEdgenToBsc = checkIsEdgenToBsc(origin, destination);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="gradient-text">{isEdgenToBsc ? 'Feeless Bridge' : 'Bridge'}</p>
        <IconButton
          className={`rounded-full bg-[#DBE2FA08] p-1`}
          title="History"
          onClick={() => setIsSideBarOpen(!isSideBarOpen)}
        >
          <HistoryIcon color="#fff" height={22} width={22} />
        </IconButton>
      </div>
      {isEdgenToBsc && (
        <div className="flex items-center justify-center pb-4">
          <p className="text-sm text-white">Feeless Bridge from EDGEN to BSC chain</p>
        </div>
      )}
    </div>
  );
};

export default Header;
