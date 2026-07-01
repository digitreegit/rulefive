import { ChevronDownIcon } from "@heroicons/react/24/outline";

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
  placeholder?: string;
};

export default function SymbolSelect({
  value,
  onChange,
  options,
  disabled = false,
  placeholder = "Loading symbols…",
}: Props) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || options.length === 0}
        className="symbol-select w-full cursor-pointer appearance-none rounded-lg bg-ink py-2 pl-3 pr-10 outline-none ring-1 ring-white/10 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {options.length === 0 ? (
          <option value="">{placeholder}</option>
        ) : (
          options.map((sym) => (
            <option key={sym} value={sym}>
              {sym}
            </option>
          ))
        )}
      </select>
      <ChevronDownIcon
        className="pointer-events-none absolute right-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-white/70"
        aria-hidden
      />
    </div>
  );
}
