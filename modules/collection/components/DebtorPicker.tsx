"use client";

import { useEffect, useState } from "react";
import { TextField, Button, Stack, IconButton } from "@mui/material";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { DebtorResponse } from "@/modules/collection/services/debtor.validators";
import { DebtorSearchDialog } from "./DebtorSearchDialog";
import SearchIcon from "@mui/icons-material/Search";
import PersonIcon from "@mui/icons-material/Person";
import { ModalFormDebtor } from "@/modules/collection/components/modal-debtor-form";

interface DebtorPickerProps {
  value?: DebtorResponse | null;
  disabled?: boolean;
  minChars?: number;

  onChange?: (debtor: DebtorResponse | null) => void;

  onSearch: (query: string) => Promise<DebtorResponse[]>;
}

export function DebtorPicker({
  value,
  disabled,
  minChars = 2,

  onChange,
  onSearch,
}: DebtorPickerProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DebtorResponse[]>([]);
  const [query, setQuery] = useState(
    `${value?.person?.first_name || ""} ${value?.person?.last_name || ""}`.trim(),
  );
  const [open, setOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [openModalDebtor, setOpenModalDebtor] = useState(false);

  const searchDebounced = useDebounce(query, 400);

  useEffect(() => {
    if (searchDebounced.trim().length < minChars) {
      setLoading(false);
      setResults([]);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        const data = await onSearch(searchDebounced);

        setResults(data);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchDebounced, minChars, onSearch]);

  const handleSelect = (debtor: DebtorResponse) => {
    setQuery(
      `${debtor.person?.first_name || ""} ${debtor.person?.last_name || ""}`.trim(),
    );

    onChange?.(debtor);

    setOpen(false);
    setOpenModalDebtor(false);
  };

  useEffect(() => {
    setQuery(
      `${value?.person?.first_name || ""} ${value?.person?.last_name || ""}`.trim(),
    );
    setOpen(false);
  }, [value]);

  const getDebtorName = (debtor?: DebtorResponse | null) =>
    `${debtor?.person?.first_name ?? ""} ${debtor?.person?.last_name ?? ""}`.trim();

  return (
    <>
      <div className="flex w-full items-start gap-2">
        <div className="relative flex-1">
          <TextField
            value={query}
            placeholder="Selecteer een debiteur..."
            disabled={disabled}
            autoComplete="off"
            size="small"
            fullWidth
            onChange={(e) => {
              const value = e.target.value;

              setQuery(value);
              onChange?.(null);

              setOpen(value.trim().length >= minChars);
            }}
            onFocus={() => {
              if (query.trim().length >= minChars && results.length > 0) {
                setOpen(true);
              }
            }}
          />

          {open && (
            <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-lg border bg-background shadow-md">
              {loading && (
                <div className="flex items-center justify-center p-4">
                  <span className="text-xs text-muted-foreground">
                    Zoeken...
                  </span>
                </div>
              )}

              {!loading && results.length > 0 && (
                <>
                  <div className="border-b bg-muted/30 px-3 py-2">
                    <span className="text-xs text-muted-foreground">
                      {results.length}{" "}
                      {results.length === 1 ? "resultaat" : "resultaten"}
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto py-1">
                    {results.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className="flex w-full px-3 py-2 text-left transition-colors hover:bg-accent"
                        onClick={() => handleSelect(option)}
                      >
                        <div className="truncate text-sm font-medium">
                          {getDebtorName(option)}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {!loading && results.length === 0 && (
                <div className="flex flex-col items-center justify-center p-6">
                  <p className="text-sm font-medium">
                    Geen resultaten gevonden
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Probeer een andere zoekterm
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <Stack direction="row" spacing={1}>
          <IconButton type="button" onClick={() => setAdvancedOpen(true)}>
            <SearchIcon />
          </IconButton>

          <IconButton
            type="button"
            onClick={() => setOpenModalDebtor(true)}
            sx={{
              bgcolor: "background.paper",
              borderRadius: 1,
            }}
          >
            <PersonIcon />
          </IconButton>
        </Stack>
      </div>

      {/* Dialogs */}
      <DebtorSearchDialog
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        onSelect={(debtor) => {
          setQuery(
            `${debtor.person?.first_name || ""} ${debtor.person?.last_name || ""}`.trim(),
          );
          onChange?.(debtor);
        }}
      />

      <ModalFormDebtor
        open={openModalDebtor}
        onClose={() => setOpenModalDebtor(false)}
        id={value?.id} // Aquí puedes pasar el ID del deudor si estás editando
        onSave={handleSelect}
      />
    </>
  );
}
