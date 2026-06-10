"use client";

import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Divider,
  Stack,
  Button,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";

import SettingsIcon from "@mui/icons-material/Settings";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import DashboardIcon from "@mui/icons-material/Dashboard";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { HeaderMenuGroup, menuGroups } from "./menus";
import { UserRole } from "@/constants/user-role";
import useClientRouter from "@/hooks/useNavigations";

export default function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const { redirectToLogout } = useClientRouter();

  const [avatarAnchorEl, setAvatarAnchorEl] = useState<null | HTMLElement>(
    null,
  );
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [activeGroup, setActiveGroup] = React.useState<HeaderMenuGroup | null>(
    null,
  );

  const userRoles = ((session?.user as any)?.roles as UserRole[]) ?? [];

  const availableGroups = menuGroups.filter((group) =>
    group.roles.some((role) => userRoles.includes(role)),
  );

  const handleSignOut = () => {
    redirectToLogout();
  };

  const handleOpenMenu = (
    event: React.MouseEvent<HTMLElement>,
    group: HeaderMenuGroup,
  ) => {
    setAnchorEl(event.currentTarget);
    setActiveGroup(group);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setActiveGroup(null);
  };

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        bgcolor: "#0C284C",
        px: 4,
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between" }}>
        <Box display="flex" alignItems="center" gap={3}>
          <Image
            src="/static/logo-cfsb-light.png"
            alt="Logo"
            width={50}
            height={50}
          />

          <Divider
            orientation="vertical"
            flexItem
            sx={{
              borderColor: "rgba(255,255,255,.4)",
            }}
          />

          <Typography
            variant="h6"
            fontWeight={700}
            sx={{
              color: "white",
              display: { xs: "none", md: "block" },
            }}
          >
            CI Systeem
          </Typography>
        </Box>

        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Button
              key={"dashboard"}
              color="inherit"
              // endIcon={<DashboardIcon />}
              onClick={() => router.push("/dashboard")}
              sx={{
                textTransform: "none",
                fontWeight: 500,
              }}
            >
              Dashboard
            </Button>
            {availableGroups.map((group) => (
              <Button
                key={group.id}
                color="inherit"
                endIcon={<ArrowDropDownIcon />}
                onClick={(event) => handleOpenMenu(event, group)}
                sx={{
                  textTransform: "none",
                  fontWeight: 500,
                }}
              >
                {group.label}
              </Button>
            ))}
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleCloseMenu}
          >
            {activeGroup?.items.map((item) => (
              <MenuItem
                key={item.href}
                onClick={() => {
                  router.push(item.href);
                  handleCloseMenu();
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    mr: 1,
                  }}
                >
                  {item.icon}
                </Box>

                {item.label}
              </MenuItem>
            ))}
          </Menu>

          <Divider
            orientation="vertical"
            flexItem
            sx={{
              borderColor: "rgba(255,255,255,.4)",
            }}
          />

          <IconButton onClick={(e) => setAvatarAnchorEl(e.currentTarget)}>
            <Avatar
              src={session?.user?.image ?? undefined}
              alt={session?.user?.name ?? ""}
              sx={{
                width: 32,
                height: 32,
              }}
            />
          </IconButton>

          <Typography
            sx={{
              color: "white",
              fontWeight: 600,
            }}
          >
            {session?.user?.name}
          </Typography>

          <Menu
            anchorEl={avatarAnchorEl}
            open={Boolean(avatarAnchorEl)}
            onClose={() => setAvatarAnchorEl(null)}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography fontWeight={600}>{session?.user?.name}</Typography>

              <Typography variant="body2" color="text.secondary">
                {session?.user?.email}
              </Typography>
            </Box>

            <Divider />

            <MenuItem onClick={() => router.push("/dashboard/settings")}>
              <SettingsIcon fontSize="small" sx={{ mr: 1 }} />
              Configuratie
            </MenuItem>

            <MenuItem onClick={handleSignOut}>
              <ExitToAppIcon fontSize="small" sx={{ mr: 1 }} />
              Afmelden
            </MenuItem>
          </Menu>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
