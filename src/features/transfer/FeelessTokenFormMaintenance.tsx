export function FeelessTokenFormMaintenance() {
  return (
    <div className="flex w-full flex-col items-stretch">
      {/* Header */}
      <div className="mb-2 mt-2 text-[1.5rem] font-bold text-white">Feeless Bridge</div>
      <div className="mt-3.5 space-x-4 rounded-[24px] bg-[#DBE2FA08] p-[20px]">
        <div className="w-full space-x-6">
          <div className="w-full text-center text-[1.75rem] font-semibold text-white">Under Maintenance</div>
          <p className="w-full text-white">
            We are currently updating our system to serve you better. Please
            check back soon.
          </p>
        </div>
      </div>
    </div>
  );
}
