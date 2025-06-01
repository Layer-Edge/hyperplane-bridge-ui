// import { DiscordIcon, GithubIcon, HyperlaneLogo, TwitterIcon } from '@hyperlane-xyz/widgets';
// import { links } from '../../consts/links';
// import { Color } from '../../styles/Color';
import Image from 'next/image';
import hyperlane from '../../images/icons/hyperlane.svg';
import { useIsMobile } from '../../styles/mediaQueries';
// type FooterLink = {
//   title: string;
//   url: string;
//   external: boolean;
//   icon?: ReactNode;
// };

export function Footer() {
  const isMobile = useIsMobile();
  return (
    <footer className="relative mb-[30px] w-full">
      <div className="relative w-full px-4">
        <p className="absolute left-1/2 -translate-x-1/2 transform text-center text-[12px] font-[400] text-[#707997]">
          LayerEdge © 2023-2025. All rights reserved.
        </p>
        <div
          className={
            isMobile
              ? 'ml-auto mr-[10px] flex w-fit items-center'
              : 'ml-auto mr-[30px] flex w-fit items-center'
          }
        >
          <a
            href="https://hyperlane.xyz/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <p className="mr-2 hidden text-[12px] font-[400] text-[#707997] sm:block lg:block xl:block">
              Powered by
            </p>
            <Image src={hyperlane} alt="Hyperlane" width={isMobile ? 50 : 80} />
          </a>
        </div>
      </div>
    </footer>
  );
}

// function FooterLogo() {
//   return (
//     <div className="flex justify-center items-center">
//       <div className="ml-2 w-12 h-12 sm:h-14 sm:w-14">
//         <HyperlaneLogo color={Color.white} />
//       </div>
//       <div className="ml-6 space-y-1 text-lg font-medium sm:text-xl">
//         <div>Go interchain</div>
//         <div>with Hyperlane</div>
//       </div>
//     </div>
//   );
// }

// function FooterNav() {
//   return (
//     <nav className="text-[12px] font-[400] text-[#707997]">
//       LayerEdge Foundations © 2023-2025. All rights reserveds.
//     </nav>
//   );
// }
