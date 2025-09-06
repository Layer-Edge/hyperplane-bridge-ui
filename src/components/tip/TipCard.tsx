import { IconButton, XCircleIcon } from '@hyperlane-xyz/widgets';
import Image from 'next/image';
import { useState } from 'react';
import { config } from '../../consts/config';
import { links } from '../../consts/links';
import InfoCircle from '../../images/icons/info-circle.svg';
import { Card } from '../layout/Card';

export function TipCard() {
  const [show, setShow] = useState(config.showTipBox);
  if (!show) return null;
  return (
    <Card className="w-100 p-2 sm:w-[31rem]">
      <h2 className="text-white">Bridge Tokens with Hyperlane Warp Routes!</h2>
      <div className="flex justify-between items-end">
        <p className="mt-1 max-w-[75%] text-xs text-white">
          Warp Routes make it easy to permissionlessly take your tokens interchain. Fork this
          template to get started!
        </p>
        <a
          href={links.github}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 flex items-center rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-white transition-all hover:bg-gray-200 active:bg-gray-300 sm:text-sm"
        >
          <Image src={InfoCircle} width={12} alt="" />
          <span className="ml-1.5 hidden text-sm sm:inline">More</span>
        </a>
      </div>
      <div className="absolute top-3 right-3">
        <IconButton onClick={() => setShow(false)} title="Hide tip" className="hover:rotate-90">
          <XCircleIcon width={16} height={16} color="white" />
        </IconButton>
      </div>
    </Card>
  );
}
