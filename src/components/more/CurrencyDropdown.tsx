import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import { useState } from "react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { ChevronDown } from "lucide-react";

interface CurrencyDropdownProps {
  compact?: boolean;
}

export default function CurrencyDropdown({ compact = false }: CurrencyDropdownProps) {
  const { currency, supported, setCurrencyCode } = useCurrency();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {compact ? (
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <span>{currency.symbol}</span>
            <span>{currency.code}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button className="w-full text-left rounded-md border px-3 py-2 bg-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{currency.code}</span>
                <span className="text-sm text-muted-foreground">{currency.name}</span>
              </div>
              <div className="text-lg">{currency.symbol}</div>
            </div>
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[320px]">
        <Command>
          <CommandInput placeholder="Search currency..." />
          <CommandList>
            <CommandEmpty>No currencies found.</CommandEmpty>
            {supported.map((c) => (
              <CommandItem
                key={c.code}
                onSelect={() => {
                  setCurrencyCode(c.code);
                  setOpen(false);
                }}
              >
                <div className="flex w-full justify-between items-center">
                  <div>
                    <div className="font-medium">
                      {c.code} — {c.name}
                    </div>
                    <div className="text-xs text-muted-foreground">{c.locale}</div>
                  </div>
                  <div className="ml-4">{c.symbol}</div>
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
