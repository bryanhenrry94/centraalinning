"use client";
import { formatDate } from "@/utils/formatters";
import {
  Box,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";

interface Document {
  id: string | number;
  file_name: string;
  created_at?: string | Date;
}

interface DocumentsListProps {
  documents: Document[];
}

export const DocumentsList: React.FC<DocumentsListProps> = ({ documents }) => {
  return (
    <List disablePadding>
      {documents.map((doc, index) => (
        <Box key={doc.id}>
          <ListItem
            secondaryAction={
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  href={`/api/contracts/documents/${doc.id}/download`}
                >
                  Download
                </Button>
              </Stack>
            }
          >
            <ListItemText
              primary={doc.file_name}
              secondary={
                doc.created_at ? formatDate(doc.created_at.toString()) : ""
              }
            />
          </ListItem>

          {index < documents.length - 1 && <Divider />}
        </Box>
      ))}
    </List>
  );
};
