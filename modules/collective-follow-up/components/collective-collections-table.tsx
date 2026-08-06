"use client";
import React from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { getCollectiveCollectionStatusInfo } from "@/modules/collective-follow-up/utils/collective-collection-status";

type CollectiveCollectionRow = {
  id: string;
  status: string;
  startedAt: Date;
  debtClaim: {
    reference: string | null;
    principalAmount: number;
    debtor: {
      person?: { first_name: string | null; last_name: string | null; business_name: string | null } | null;
    };
  };
};

interface CollectiveCollectionsTableProps {
  collections: CollectiveCollectionRow[];
}

const debtorName = (row: CollectiveCollectionRow) => {
  const person = row.debtClaim.debtor.person;
  if (!person) return "-";
  return (
    `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() || person.business_name || "-"
  );
};

export const CollectiveCollectionsTable: React.FC<CollectiveCollectionsTableProps> = ({
  collections,
}) => {
  const router = useRouter();

  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table size="small" aria-label="tabel met collectieve opvolgingen">
        <TableHead>
          <TableRow>
            {["Referentie", "Debiteur", "Bedrag", "Status", "Gestart op"].map((col) => (
              <TableCell
                key={col}
                sx={{ backgroundColor: "secondary.main", color: "#fff", fontWeight: "bold" }}
              >
                {col}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {collections.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ fontStyle: "italic" }}>
                <Typography variant="body2" color="text.secondary">
                  Geen dossiers gevonden.
                </Typography>
              </TableCell>
            </TableRow>
          )}
          {collections.map((collection) => {
            const statusInfo = getCollectiveCollectionStatusInfo(collection.status);
            return (
              <TableRow
                key={collection.id}
                hover
                sx={{ cursor: "pointer" }}
                onClick={() => router.push(`/collective-follow-up/${collection.id}`)}
              >
                <TableCell>{collection.debtClaim.reference || "-"}</TableCell>
                <TableCell>{debtorName(collection)}</TableCell>
                <TableCell align="right">{formatCurrency(collection.debtClaim.principalAmount)}</TableCell>
                <TableCell>
                  <Chip size="small" label={statusInfo.label} color={statusInfo.color} />
                </TableCell>
                <TableCell>{formatDate(collection.startedAt.toString())}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
