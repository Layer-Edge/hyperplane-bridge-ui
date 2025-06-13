import { HistoryIcon, IconButton } from '@hyperlane-xyz/widgets';

const Header = ({ setIsSideBarOpen, isSideBarOpen }) => {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="gradient-text">Bridge</p>
        <IconButton
          className={`rounded-full bg-[#DBE2FA08] p-1`}
          title="History"
          onClick={() => setIsSideBarOpen(!isSideBarOpen)}
        >
          <HistoryIcon color="#fff" height={22} width={22} />
        </IconButton>
      </div>
    </div>
  );
};

export default Header;
