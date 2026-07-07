"use client";

import { FC } from "react";
import {
  Box,
  Breadcrumbs,
  Button,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Upload,
  Add,
  Delete,
  FileDownload,
  PictureAsPdf,
  Refresh,
} from "@mui/icons-material";
import Link from "next/link";
import HomeIcon from "@mui/icons-material/Home";

export interface ActionToolbarProps {
  title: string;
  navigation?: Array<{ title: string; href: string }>;
  onRefresh?: () => void;
  onImport?: () => void;
  onCreate?: () => void;
  onDelete?: () => void;
  onExportExcel?: () => void;
  onExportPDF?: () => void;
  disabledRefresh?: boolean;
  disabledImport?: boolean;
  disabledCreate?: boolean;
  disabledDelete?: boolean;
  disabledExportExcel?: boolean;
  disabledExportPDF?: boolean;
}

const ActionToolbar: FC<ActionToolbarProps> = ({
  title,
  navigation,
  onRefresh,
  onImport,
  onCreate,
  onDelete,
  onExportExcel,
  onExportPDF,
  disabledRefresh = false,
  disabledImport = false,
  disabledCreate = false,
  disabledDelete = false,
  disabledExportExcel = false,
  disabledExportPDF = false,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        justifyContent: "space-between",
        alignItems: "left",
        mb: 2,
      }}
    >
      <Box sx={{ flexGrow: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Breadcrumbs aria-label="breadcrumb">
            <Link color="inherit" href="/">
              <HomeIcon />
            </Link>
            {navigation?.map((item) => (
              <Link key={item.title} color="inherit" href={item.href}>
                {item.title}
              </Link>
            ))}
            <Typography sx={{ color: "text.primary" }}>{title}</Typography>
          </Breadcrumbs>
        </Box>
      </Box>
      <div className="flex gap-2 items-center">
        {onRefresh && (
          <Tooltip title="Refrescar">
            <span>
              <IconButton
                color="primary"
                onClick={onRefresh}
                disabled={disabledRefresh}
              >
                <Refresh />
              </IconButton>
            </span>
          </Tooltip>
        )}
        {onImport && (
          <Tooltip title="Importar">
            <span>
              <IconButton
                color="primary"
                onClick={onImport}
                disabled={disabledImport}
              >
                <Upload />
              </IconButton>
            </span>
          </Tooltip>
        )}
        {onCreate && (
          <Tooltip title="Nuevo">
            <span>
              <Button
                color="primary"
                variant="contained"
                onClick={onCreate}
                disabled={disabledCreate}
                startIcon={<Add />}
                size="small"
                sx={{ textTransform: "none" }}
              >
                Nuevo
              </Button>
            </span>
          </Tooltip>
        )}

        {onDelete && (
          <Tooltip title="Eliminar">
            <span>
              <IconButton
                color="primary"
                onClick={onDelete}
                disabled={disabledDelete}
              >
                <Delete />
              </IconButton>
            </span>
          </Tooltip>
        )}

        {onExportExcel && (
          <Tooltip title="Exportar Excel">
            <span>
              <IconButton
                color="primary"
                onClick={onExportExcel}
                disabled={disabledExportExcel}
              >
                <FileDownload />
              </IconButton>
            </span>
          </Tooltip>
        )}

        {onExportPDF && (
          <Tooltip title="Exportar PDF">
            <span>
              <IconButton
                color="primary"
                onClick={onExportPDF}
                disabled={disabledExportPDF}
              >
                <PictureAsPdf />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </div>
    </Box>
  );
};

export default ActionToolbar;
