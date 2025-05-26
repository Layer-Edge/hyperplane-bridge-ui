// import { DiscordIcon, GithubIcon, HyperlaneLogo, TwitterIcon } from '@hyperlane-xyz/widgets';
// import { links } from '../../consts/links';
// import { Color } from '../../styles/Color';

// type FooterLink = {
//   title: string;
//   url: string;
//   external: boolean;
//   icon?: ReactNode;
// };

export function Footer() {
  return (
    <footer className="relative mb-[30px]">
      <div className="text-center">
        <p className="text-[12px] font-[400] text-[#707997]">
          LayerEdge Foundations © 2023-2025. All rights reserveds.
        </p>
      </div>
    </footer>
  );
}

// function FooterLogo() {
//   return (
//     <div className="flex items-center justify-center">
//       <div className="w-12 h-12 ml-2 sm:h-14 sm:w-14">
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
