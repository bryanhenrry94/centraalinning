"use client";

import React, { useState, useRef } from "react";
import { Box, Button, IconButton, TextField } from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { socket } from "@/infrastructure/realtime/socket-client";
import { ISelectedRoom } from "./types";

interface ChatFormProps {
    onSendMessage: (message: string) => void;
    onSendFile: (file: File) => void;
    fullname: string;
    room: ISelectedRoom;
}

const ChatForm = ({ onSendMessage, onSendFile, fullname, room }: ChatFormProps) => {
    const [message, setMessage] = useState("");
    const typingTimeout = useRef<NodeJS.Timeout | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim() !== "") {
            onSendMessage(message);
            setMessage("");
            socket.emit("stop_typing", { room: room.id });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onSendFile(file);
        }
    };

    const handleTyping = () => {
        socket.emit("typing", { room: room.id, fullname: fullname });

        if (typingTimeout.current) clearTimeout(typingTimeout.current);

        typingTimeout.current = setTimeout(() => {
            socket.emit("stop_typing", { room: room.id });
        }, 2000); // 2 segundos sin escribir
    };

    return (
        <form onSubmit={handleSubmit}>
            <Box display="flex" gap={1} alignItems="center">
                <TextField
                    size="small"
                    sx={{ flex: 1, minWidth: 0 }}
                    value={message}
                    onChange={(e) => {
                        setMessage(e.target.value);
                        handleTyping();
                    }}
                    placeholder="Typ een bericht..."
                />
                <IconButton component="label" sx={{ flexShrink: 0 }}>
                    <AttachFileIcon />
                    <input type="file" hidden onChange={handleFileChange} />
                </IconButton>
                <Button type="submit" variant="contained" sx={{ flexShrink: 0 }}>
                    Verzenden
                </Button>
            </Box>
        </form>
    );
};

export default ChatForm;
