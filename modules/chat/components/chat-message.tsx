"use client";

import React from "react";
import {
  Box,
  Typography,
  Paper,
  Avatar,
  Stack,
  useTheme,
  IconButton,
} from "@mui/material";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import DownloadIcon from "@mui/icons-material/Download";

interface ChatMessageProps {
  message: string;
  sender: string;
  fullname: string;
  isOwnMessage: boolean;
  file_url?: string;
  file_name?: string;
}

const ChatMessage = ({
  sender,
  message,
  fullname,
  isOwnMessage,
  file_url,
  file_name,
}: ChatMessageProps) => {
  const isSystemMessage = sender === "System";
  const theme = useTheme();

  if (isSystemMessage) {
    return (
      <Box display="flex" justifyContent="center" my={1}>
        <Typography variant="caption" color="text.secondary">
          {message}
        </Typography>
      </Box>
    );
  }

  const bubbleColor = isOwnMessage
    ? theme.palette.primary.main
    : theme.palette.grey[100];

  const textColor = isOwnMessage ? "#fff" : "#000";

  return (
    <Box
      display="flex"
      justifyContent={isOwnMessage ? "flex-end" : "flex-start"}
      my={1}
    >
      <Stack
        direction={isOwnMessage ? "row-reverse" : "row"}
        spacing={1}
        alignItems="flex-start"
      >
        <Avatar
          sx={{
            bgcolor: isOwnMessage ? "primary.main" : "secondary.main",
            width: 32,
            height: 32,
          }}
        >
          {fullname ? fullname.charAt(0).toUpperCase() : "?"}
        </Avatar>

        <Box
          sx={{
            position: "relative",
            maxWidth: 300,
            "&::before": {
              content: '""',
              position: "absolute",
              top: 12,
              width: 0,
              height: 0,
              border: "8px solid transparent",
              ...(isOwnMessage
                ? {
                  right: -16,
                  borderLeftColor: bubbleColor,
                }
                : {
                  left: -16,
                  borderRightColor: bubbleColor,
                }),
            },
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 1.5,
              backgroundColor: bubbleColor,
              color: textColor,
              borderRadius: 2,
            }}
          >
            <Typography
              variant="subtitle2"
              fontWeight="bold"
              sx={{
                color: isOwnMessage ? "#fff" : theme.palette.secondary.main,
              }}
            >
              {fullname}
            </Typography>

            {file_url ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  mt: 1,
                  p: 1,
                  borderRadius: 2,
                  backgroundColor: isOwnMessage ? "rgba(255,255,255,0.15)" : "#fff",
                  border: "1px solid",
                  borderColor: isOwnMessage ? "primary.light" : "grey.300",
                }}
              >
                <InsertDriveFileIcon
                  sx={{
                    fontSize: 40,
                    color: isOwnMessage ? "#fff" : "grey.700",
                  }}
                />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: isOwnMessage ? "#fff" : "text.primary",
                    }}
                  >
                    {file_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Archivo adjunto
                  </Typography>
                </Box>
                <IconButton
                  component="a"
                  href={file_url}
                  download={file_name}
                  sx={{
                    color: isOwnMessage ? "#fff" : "primary.main",
                  }}
                >
                  <DownloadIcon />
                </IconButton>
              </Box>
            ) : (
              <Typography variant="body2">{message}</Typography>
            )}
          </Paper>
        </Box>
      </Stack>
    </Box>
  );
};

export default ChatMessage;
