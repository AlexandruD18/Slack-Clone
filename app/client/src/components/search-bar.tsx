import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="justify-start gap-2 text-muted-foreground px-3"
        onClick={() => setOpen(true)}
        data-testid="button-open-search"
      >
        <Search className="w-4 h-4" />
        <span className="hidden md:inline">Cerca...</span>
        <kbd className="hidden md:inline-flex ml-auto pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0" data-testid="dialog-search">
          <DialogHeader className="px-4 pt-4 pb-0">
            <DialogTitle className="sr-only">Cerca messaggi e canali</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <Input
              type="search"
              placeholder="Cerca messaggi, canali..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border-0 focus-visible:ring-0 px-0"
              autoFocus
              data-testid="input-search"
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0"
                onClick={() => setQuery("")}
                data-testid="button-clear-search"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="px-4 py-6">
            <p className="text-sm text-muted-foreground text-center">
              Digita per cercare messaggi e canali
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
