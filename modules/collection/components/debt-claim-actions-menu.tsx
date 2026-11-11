"use client";

import React, { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import VisibilityIcon from "@mui/icons-material/Visibility";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import HandshakeIcon from "@mui/icons-material/Handshake";
import GavelIcon from "@mui/icons-material/Gavel";
import GroupIcon from "@mui/icons-material/Group";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { DebtClaimResponse } from "@/modules/collection/services/collection.type";
import { isAgreementPending } from "@/modules/agreement/constants/agreement-status";
import { TransferToLawyerDialog } from "@/modules/legal-process/components/transfer-to-lawyer-dialog";
import { StartCopDialog } from "@/modules/collective-follow-up/components/start-cop-dialog";

interface DebtClaimActionsMenuProps {
  row: DebtClaimResponse;
  onReviewAgreement?: (debtClaimId: string) => void;
  onRefresh?: () => void;
}

// Extraído verbatim de collection-table.tsx (sin cambios de comportamiento)
// para poder reutilizarlo también en el "Mijn dossiers"-overzicht
// (modules/dossier) sin duplicar la lógica de transferencia/COP.
export const DebtClaimActionsMenu = ({
  row,
  onReviewAgreement,
  onRefresh,
}: DebtClaimActionsMenuProps) => {
  const router = useRouter();
  const [transferDebtClaimId, setTransferDebtClaimId] = React.useState<
    string | null
  >(null);
  const [startCopRow, setStartCopRow] = React.useState<DebtClaimResponse | null>(
    null,
  );
  const [menuAnchorEl, setMenuAnchorEl] = React.useState<HTMLElement | null>(
    null,
  );

  const handleMenuOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setMenuAnchorEl(e.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuAnchorEl(null);
  }, []);

  const handleView = useCallback(
    () => router.push(`/collections/${row.id}`),
    [router, row.id],
  );

  const isPending = row.status === "OPEN";

  return (
    <>
      {!isPending ? (
        <IconButton size="small" onClick={handleMenuOpen}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
      ) : row.paymentLink ? (
        <Tooltip title="Link de pago pendiente">
          <IconButton
            size="small"
            component="a"
            href={row.paymentLink}
            target="_blank"
            rel="noopener noreferrer"
            color="primary"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : (
        <Tooltip title="Wacht op betalingsbevestiging">
          <HourglassEmptyIcon fontSize="small" color="disabled" />
        </Tooltip>
      )}

      {transferDebtClaimId && (
        <TransferToLawyerDialog
          open={!!transferDebtClaimId}
          onClose={() => setTransferDebtClaimId(null)}
          debtClaimId={transferDebtClaimId}
          onTransferred={() => onRefresh?.()}
        />
      )}

      {startCopRow && (
        <StartCopDialog
          open={!!startCopRow}
          onClose={() => setStartCopRow(null)}
          debtClaimId={startCopRow.id}
          principalAmount={Number(startCopRow.principalAmount) || 0}
          onStarted={(collectionId) => {
            setStartCopRow(null);
            router.push(`/collective-follow-up/${collectionId}`);
          }}
        />
      )}

      <Menu
        anchorEl={menuAnchorEl}
        open={!!menuAnchorEl}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem
          key="view"
          onClick={() => {
            handleView();
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Bekijken</ListItemText>
        </MenuItem>

        {row.agreementStatus && (
          <MenuItem
            key="agreement"
            onClick={() => {
              onReviewAgreement?.(row.id);
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <HandshakeIcon
                fontSize="small"
                color={
                  isAgreementPending(row.agreementStatus)
                    ? "warning"
                    : "inherit"
                }
              />
            </ListItemIcon>
            <ListItemText>
              {isAgreementPending(row.agreementStatus)
                ? "Betalingsregeling te beoordelen"
                : "Betalingsregeling bekijken"}
            </ListItemText>
          </MenuItem>
        )}

        {row.legalProcessId ? (
          <MenuItem
            key="gop"
            onClick={() => {
              router.push(`/legal-processes/${row.legalProcessId}`);
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <GavelIcon fontSize="small" color="secondary" />
            </ListItemIcon>
            <ListItemText>GOP-dossier bekijken</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem
            key="gop-transfer"
            disabled={row.aopStep !== "BLK_NOTIFICATION"}
            onClick={() => {
              setTransferDebtClaimId(row.id);
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <SwapHorizIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              Dossieroverdracht
              {row.aopStep !== "BLK_NOTIFICATION" &&
                " (vereist AOP-fase Blokkade)"}
            </ListItemText>
          </MenuItem>
        )}

        {row.collectiveCollectionId ? (
          <MenuItem
            key="cop"
            onClick={() => {
              router.push(`/collective-follow-up/${row.collectiveCollectionId}`);
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <GroupIcon fontSize="small" color="secondary" />
            </ListItemIcon>
            <ListItemText>COP-dossier bekijken</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem
            key="cop-start"
            disabled={row.aopStep !== "BLK_NOTIFICATION"}
            onClick={() => {
              setStartCopRow(row);
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <GroupIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              Collectieve Opvolging starten
              {row.aopStep !== "BLK_NOTIFICATION" &&
                " (vereist AOP-fase Blokkade)"}
            </ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};
