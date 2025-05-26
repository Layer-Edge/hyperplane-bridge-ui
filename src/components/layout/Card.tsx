import { PropsWithChildren } from 'react';

interface Props {
  className?: string;
}

export function Card({ className, children }: PropsWithChildren<Props>) {
  return (
    <div
      className={`bg-custom-gradient relative overflow-auto rounded-[32px] p-1.5 xs:p-2 sm:p-3 md:p-4 ${className}`}
    >
      {children}
    </div>
  );
}
