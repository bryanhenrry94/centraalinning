"use client";
import { useEffect, useRef, useState } from "react";
// mui
import {
  Box,
  Container,
  Paper,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Avatar,
} from "@mui/material";
// components
import ChatForm from "./chat-form";
import ChatMessage from "./chat-message";
import TypingIndicator from "./typ-ing-indicator";
// libs
import { socket } from "@/infrastructure/realtime/socket-client";
import {
  getAllChatRoomsByTenantId,
  getMessagesByRoomId,
  saveMessage,
} from "@/modules/chat/actions/chat.actions";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import { ChatWindowProps, ISelectedRoom, Sender } from "./types";
import { IChatMessage, IChatMessageCreate } from "@/modules/chat/services/chat.validators";

function ChatWindow({ room, sender }: ChatWindowProps) {
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [typingMessage, setTypingMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const loadMessagesForRoom = async (room_id: string) => {
      socket.emit("load_messages", { room: room_id });

      const messages: IChatMessage[] = await getMessagesByRoomId(room_id);
      setMessages(
        messages.map((msg) => ({
          id: msg.id ?? `${Date.now()}_${Math.random()}`,
          room_id: msg.room_id,
          sender_id: msg.sender_id,
          message: msg.message,
          file_url: msg.file_url,
          file_name: msg.file_name,
          sender: msg.sender,
          timestamp: msg.timestamp ?? msg.created_at,
          created_at: msg.created_at,
          updated_at: msg.updated_at,
        }))
      );
    };

    // Limpia los mensajes al cambiar de sala
    setMessages([]);
    loadMessagesForRoom(room.id);

    console.log(`sender: ${sender.fullname}`);
    console.log(`email: ${sender.email}`);
    console.log(`room: ${room.id}`);

    socket.emit("join-room", { room: room.id, sender: sender.fullname });

    // helper to ensure incoming data matches IChatMessage shape
    const normalizeToChatMessage = (d: any): IChatMessage => {
      // normalize sender into the expected shape { id, fullname, email }
      const resolvedSender = (() => {
        const s = d?.sender;
        if (s && typeof s === "object") {
          return {
            id: s.id ?? d?.sender_id ?? "",
            fullname:
              s.fullname ??
              d?.fullname ??
              String(s.id ?? d?.sender_id ?? "Usuario"),
            email: s.email ?? d?.email ?? "",
          };
        }
        // when sender is a string or missing, derive reasonable defaults
        const sender_id = d?.sender_id ?? (typeof s === "string" ? s : "");
        const fullname = d?.fullname ?? (typeof s === "string" ? s : "Usuario");
        const email = d?.email ?? "";
        return {
          id: sender_id,
          fullname,
          email,
        };
      })();

      return {
        id: d.id ?? `${Date.now()}_${Math.random()}`,
        room_id: d.room_id ?? room.id,
        sender_id:
          d.sender_id ??
          (typeof d.sender === "string" ? d.sender : resolvedSender.id),
        sender: resolvedSender,
        message: d.message ?? "",
        file_url: d.file_url ?? null,
        file_name: d.file_name ?? null,
        timestamp: d.timestamp
          ? new Date(d.timestamp)
          : d.created_at
          ? new Date(d.created_at)
          : new Date(),
        created_at: d.created_at ? new Date(d.created_at) : new Date(),
        updated_at: d.updated_at ? new Date(d.updated_at) : new Date(),
      };
    };

    socket.on("message", (data) => {
      setMessages((prev) => [...prev, normalizeToChatMessage(data)]);
    });

    socket.on("user_joined", ({ message }) => {
      setMessages((prev) => [
        ...prev,
        normalizeToChatMessage({
          message,
          created_at: new Date(),
          // minimal fields to satisfy IChatMessage
          id: `${Date.now()}_join`,
        }),
      ]);
    });

    socket.on("message_history", (history) => {
      console.log("history", history);
      if (Array.isArray(history)) {
        setMessages(history.map((h: any) => normalizeToChatMessage(h)));
      } else {
        // fallback: if history is a single item
        setMessages((prev) => [...prev, normalizeToChatMessage(history)]);
      }
    });

    socket.on("file", ({ sender, file_name, file_url }) => {
      setMessages((prev) => [
        ...prev,
        normalizeToChatMessage({
          sender,
          sender_id: typeof sender === "string" ? sender : sender?.id ?? "",
          file_url,
          file_name,
          message: `Archivo: ${file_name}`,
          created_at: new Date(),
        }),
      ]);
    });

    socket.on("user_typing", (message) => {
      setTypingMessage(message);
    });

    socket.on("user_stop_typing", () => {
      setTypingMessage("");
    });

    return () => {
      socket.off("user_joined");
      socket.off("message");
      socket.off("message_history");
      socket.off("file");
      socket.off("user_typing");
      socket.off("user_stop_typing");
    };
  }, [room.id, sender.fullname, sender.email]); // Dependencia de `room` para ejecutar este efecto al cambiar de sala

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const fileData = {
        room_id: room.id,
        sender_id: sender.id,
        file_name: file.name,
        file_url: reader.result,
      };

      socket.emit("file", fileData);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}_${Math.random()}`,
          room_id: room.id,
          sender_id: sender.id,
          message: `File: ${file.name}`,
          file_url: reader.result as string,
          file_name: file.name,
          sender: {
            id: sender.id,
            fullname: sender.fullname,
            email: sender.email,
          },
          timestamp: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      saveMessage({
        room_id: room.id,
        sender_id: sender.id,
        message: `Archivo: ${file.name}`,
        file_url: reader.result as string,
        file_name: file.name,
        sender: {
          id: sender.id,
          fullname: sender.fullname,
          email: sender.email,
        },
      });
    };
    reader.readAsDataURL(file);
  };

  const handleMessage = (message: string) => {
    const data: IChatMessageCreate = {
      room_id: room.id,
      sender_id: sender?.id,
      message,
      sender: {
        id: sender.id,
        fullname: sender.fullname,
        email: sender.email,
      },
    };
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}_${Math.random()}`,
        room_id: room.id,
        sender_id: sender.id,
        message,
        fullname: sender.fullname,
        email: sender.email,
        file_url: null,
        file_name: null,
        sender: {
          id: sender.id,
          fullname: sender.fullname,
          email: sender.email,
        },
        timestamp: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
    saveMessage(data);
    socket.emit("message", data);
    socket.emit("stop_typing", { room: room.id });
  };

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        // backgroundColor: "#f0f0f0",
        borderRadius: "8px", // Add border radius to the entire container
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: "1px solid #ddd",
          // backgroundColor: "primary.main",
          // color: "#fff",
          borderTopLeftRadius: "8px", // Add border radius to the top corners
          borderTopRightRadius: "8px",
        }}
      >
        <Typography variant="h6">Sala: {room.name}</Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 2,
          // backgroundColor: "#e5ddd5",
        }}
      >
        {messages.map((message, index) => (
          <ChatMessage
            key={index}
            sender={message.sender_id}
            fullname={message?.sender.fullname || "Usuario"}
            message={message.message}
            isOwnMessage={message.sender_id === sender?.id}
            file_url={message.file_url ?? ""}
            file_name={message.file_name ?? ""}
          />
        ))}
        <div ref={messagesEndRef} />
      </Box>
      <TypingIndicator message={typingMessage} />
      <Box
        sx={{
          p: 2,
          borderTop: "1px solid #ddd",
          // backgroundColor: "#ffffff",
          borderBottomLeftRadius: "8px", // Add border radius to the bottom corners
          borderBottomRightRadius: "8px",
        }}
      >
        <ChatForm
          onSendMessage={handleMessage}
          onSendFile={handleFileUpload}
          fullname={sender?.fullname || "Usuario"}
          room={room}
        />
      </Box>
    </Box>
  );
}

export default function ChatUI() {
  const { user } = useAuthSession();
  const [sender, setSender] = useState<Sender>({
    id: user?.id || "",
    fullname: user?.name || "Nombre no disponible",
    email: user?.email || "Email no disponible",
  });

  const [rooms, setRooms] = useState<
    {
      id: string;
      name: string;
    }[]
  >([]);

  useEffect(() => {
    setSender({
      id: user?.id || "",
      fullname: user?.name || "Nombre no disponible",
      email: user?.email || "Email no disponible",
    });
  }, [user]);

  useEffect(() => {
    // Simula la obtención de las salas desde datos locales
    fetchChatRooms();
  }, []);

  const fetchChatRooms = async () => {
    const data = await getAllChatRoomsByTenantId(
      "8ee10d9e-8591-4216-abf5-50f310fb61d4"
    );
    console.log("Chat rooms fetched:", data);
    const formattedRooms = data.map((room: any) => ({
      id: room.id,
      name: room.name,
    }));
    setRooms(formattedRooms);
  };

  const [selectedRoom, setSelectedRoom] = useState<ISelectedRoom>();

  return (
    <Container maxWidth="lg" sx={{ mt: 2, display: "flex", height: "70vh" }}>
      <Paper
        elevation={3}
        sx={{
          width: 300,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid #ddd",
            // backgroundColor: "primary.main",
            // color: "#fff",
          }}
        >
          <Typography variant="h6">Chats</Typography>
        </Box>
        <Box sx={{ p: 2, borderBottom: "1px solid #ddd" }}>
          <TextField
            fullWidth
            placeholder="Zoek chat..."
            variant="outlined"
            size="small"
            onChange={(e) => {
              const searchTerm = e.target.value.toLowerCase();
              if (searchTerm === "") {
                // Reset rooms to the original list when the search term is empty
                setRooms(rooms);
              } else {
                setRooms((prevRooms) =>
                  prevRooms.filter((room) =>
                    room.name.toLowerCase().includes(searchTerm)
                  )
                );
              }
            }}
          />
        </Box>
        <List sx={{ flex: 1, overflowY: "auto" }}>
          {rooms.map((room) => (
            <ListItem key={room.id} disablePadding>
              <ListItemButton
                selected={selectedRoom?.id === room.id}
                onClick={() =>
                  setSelectedRoom({
                    id: room.id,
                    name: room.name,
                  })
                }
              >
                <Avatar
                  sx={{
                    bgcolor: "primary.main",
                    width: 25,
                    height: 25,
                    mr: 2, // Add some margin to the right of the avatar
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: "0.90rem" }}>
                    {room?.name.charAt(0).toUpperCase()}
                  </Typography>
                </Avatar>
                <ListItemText primary={room.name} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Paper>
      <Paper
        elevation={3}
        sx={{
          flex: 1,
          ml: 2,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {selectedRoom ? (
          <ChatWindow room={selectedRoom} sender={sender} />
        ) : (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Typography variant="h6" color="textSecondary">
              Selecteer een chat om te beginnen met typen.
            </Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
}
