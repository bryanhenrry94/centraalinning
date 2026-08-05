"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CircularProgress, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { getAllJurisdictions } from "@/modules/jurisdiction/actions/jurisdiction.actions";

type Jurisdiction = {
  id: string;
  islandCode: string;
  islandName: string;
  isActive: boolean;
};

// Selector de isla/jurisdicción para las pantallas del Superadministrador
// (punto 14 del análisis CFSB): la isla seleccionada viaja en la URL
// (?jurisdictionId=...) para que cada categoría filtre sus Settings por esa
// isla, sin ningún nombre de isla hardcodeado en el código (punto 13).
export function JurisdictionSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [loading, setLoading] = useState(true);
  const current = searchParams.get("jurisdictionId") ?? "";

  useEffect(() => {
    let active = true;

    getAllJurisdictions().then((data) => {
      if (!active) return;
      setJurisdictions(data);
      setLoading(false);

      if (!searchParams.get("jurisdictionId")) {
        const defaultJurisdiction = data.find((j) => j.isActive) ?? data[0];
        if (defaultJurisdiction) {
          const params = new URLSearchParams(searchParams.toString());
          params.set("jurisdictionId", defaultJurisdiction.id);
          router.replace(`${pathname}?${params.toString()}`);
        }
      }
    });

    return () => {
      active = false;
    };
  }, []);

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("jurisdictionId", value);
    else params.delete("jurisdictionId");
    router.replace(`${pathname}?${params.toString()}`);
  }

  if (loading) return <CircularProgress size={20} />;

  return (
    <FormControl size="small" sx={{ minWidth: 240 }}>
      <InputLabel id="jurisdiction-select-label">Isla / Jurisdictie</InputLabel>
      <Select
        labelId="jurisdiction-select-label"
        label="Isla / Jurisdictie"
        value={current}
        onChange={(e) => handleChange(e.target.value)}
      >
        <MenuItem value="">Alleen globale waarden</MenuItem>
        {jurisdictions.map((j) => (
          <MenuItem key={j.id} value={j.id}>
            {j.islandName}
            {!j.isActive ? " (voorbereid, inactief)" : ""}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
