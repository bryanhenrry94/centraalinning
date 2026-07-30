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
  Drawer,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";

import SettingsIcon from "@mui/icons-material/Settings";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AppsIcon from "@mui/icons-material/Apps";
import MenuIcon from "@mui/icons-material/Menu";
import CheckIcon from "@mui/icons-material/Check";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { HeaderMenuGroup, menuGroups } from "./menus";
import { UserRole } from "@/shared/constants/user-role";
import useClientRouter from "@/shared/hooks/useNavigations";
import { switchWorkspace } from "@/modules/auth/actions/workspace.actions";
import { notifyError } from "@/shared/ui/notifications";
import NotificationBell from "@/modules/notification/components/notification-bell";
import Link from "next/link";

export default function Header() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const { redirectToLogout, redirectToDashboard } = useClientRouter();

  const [avatarAnchorEl, setAvatarAnchorEl] = useState<null | HTMLElement>(
    null,
  );

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const [switchingTenantId, setSwitchingTenantId] = useState<string | null>(
    null,
  );

  const memberships = session?.user?.memberships ?? [];
  const activeTenantId = session?.user?.tenant_id;

  const handleSwitchWorkspace = async (tenantId: string, subdomain: string) => {
    if (tenantId === activeTenantId || !session?.user?.id) return;

    setSwitchingTenantId(tenantId);
    try {
      await switchWorkspace(session.user.id, tenantId);
      await update({ tenant_id: tenantId });
      redirectToDashboard(subdomain);
    } catch (error) {
      console.error(error);
      notifyError("Kon niet van werkruimte wisselen.");
      setSwitchingTenantId(null);
    }
  };

  const [activeGroup, setActiveGroup] = useState<HeaderMenuGroup | null>(null);

  const [mobileOpen, setMobileOpen] = useState(false);

  const userRoles = ((session?.user as any)?.roles as UserRole[]) ?? [];

  const STAFF_ROLES = [
    UserRole.PLATFORM_OWNER,
    UserRole.TENANT_ADMIN,
    UserRole.AGENT,
    UserRole.EMPLOYEE,
    UserRole.BAILIFF,
    UserRole.LAWYER,
    UserRole.BANK,
  ];

  const isPureDebtor =
    userRoles.includes(UserRole.DEBTOR) &&
    !userRoles.some((role) => STAFF_ROLES.includes(role));

  const availableGroups = menuGroups.filter((group) =>
    group.roles.some((role) => userRoles.includes(role)),
  );

  // "dossiers" (CFSB-Diensten) ya tiene su propio botón fijo hacia /workstation;
  // acá sólo mostramos los demás grupos (p.ej. el del deudor) como dropdown.
  const dropdownGroups = availableGroups.filter((group) => group.id !== "dossiers");

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
    <>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: "#0C284C",
          px: {
            xs: 1,
            sm: 2,
            md: 4,
          },
        }}
      >
        <Toolbar
          sx={{
            justifyContent: "space-between",
            minHeight: 70,
          }}
        >
          {/* Left */}
          <Box
            display="flex"
            alignItems="center"
            gap={{
              xs: 1,
              md: 3,
            }}
          >
            <IconButton
              color="inherit"
              sx={{
                display: {
                  xs: "flex",
                  md: "none",
                },
              }}
              onClick={() => setMobileOpen(true)}
            >
              <MenuIcon />
            </IconButton>

            <Link href="/dashboard" style={{ textDecoration: "none" }}>
              <Image
                src="/static/logo-cfsb-light.png"
                alt="Logo"
                width={50}
                height={50}
              />
            </Link>

            <Divider
              orientation="vertical"
              flexItem
              sx={{
                borderColor: "rgba(255,255,255,.4)",
                display: {
                  xs: "none",
                  md: "block",
                },
              }}
            />
            <Link href="/dashboard" style={{ textDecoration: "none" }}>
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{
                  color: "white",
                  display: {
                    xs: "none",
                    md: "block",
                  },
                }}
              >
                CI Systeem
              </Typography>
            </Link>
          </Box>

          {/* Desktop Navigation */}
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                display: {
                  xs: "none",
                  md: "flex",
                },
                alignItems: "center",
                gap: 2,
              }}
            >
              <Button
                color="inherit"
                onClick={() => router.push("/dashboard")}
                sx={{
                  textTransform: "none",
                  fontWeight: 500,
                }}
              >
                Dashboard
              </Button>

              {!isPureDebtor && (
                <Button
                  color="inherit"
                  onClick={() => router.push("/workstation")}
                  sx={{
                    textTransform: "none",
                    fontWeight: 500,
                  }}
                >
                  CFSB-Diensten
                </Button>
              )}

              {dropdownGroups.map((group) => (
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
                display: {
                  xs: "none",
                  sm: "block",
                },
              }}
            />

            <NotificationBell />

            <IconButton onClick={(e) => setAvatarAnchorEl(e.currentTarget)}>
              <Avatar
                src={session?.user?.image ?? undefined}
                alt={session?.user?.name ?? ""}
                sx={{
                  width: 36,
                  height: 36,
                }}
              />
            </IconButton>

            <Typography
              sx={{
                color: "white",
                fontWeight: 600,
                display: {
                  xs: "none",
                  sm: "block",
                },
                maxWidth: 180,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
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

              {memberships.length > 1 && (
                <>
                  <Typography
                    variant="caption"
                    sx={{ px: 2, pt: 1, display: "block", color: "text.secondary" }}
                  >
                    Werkruimte wisselen
                  </Typography>

                  {memberships.map((membership) => (
                    <MenuItem
                      key={membership.tenantId}
                      disabled={switchingTenantId !== null}
                      onClick={() =>
                        handleSwitchWorkspace(
                          membership.tenantId,
                          membership.subdomain,
                        )
                      }
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          width: 20,
                          mr: 1,
                        }}
                      >
                        {membership.tenantId === activeTenantId && (
                          <CheckIcon fontSize="small" color="primary" />
                        )}
                      </Box>
                      {membership.tenantName}
                    </MenuItem>
                  ))}

                  <Divider />
                </>
              )}

              <MenuItem onClick={() => router.push("/settings")}>
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

      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      >
        <Box
          sx={{
            width: 280,
            py: 2,
          }}
        >
          <Box
            sx={{
              px: 2,
              pb: 2,
            }}
          >
            <Typography variant="h6" fontWeight={700}>
              CI Systeem
            </Typography>
          </Box>

          <Divider />

          <List>
            <ListItemButton
              onClick={() => {
                router.push("/dashboard");
                setMobileOpen(false);
              }}
            >
              <DashboardIcon sx={{ mr: 2 }} />

              <ListItemText primary="Dashboard" />
            </ListItemButton>

            {!isPureDebtor && (
              <ListItemButton
                onClick={() => {
                  router.push("/workstation");
                  setMobileOpen(false);
                }}
              >
                <AppsIcon sx={{ mr: 2 }} />

                <ListItemText primary="CFSB-Diensten" />
              </ListItemButton>
            )}

            {dropdownGroups.map((group) => (
              <React.Fragment key={group.id}>
                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    fontWeight: 700,
                    color: "text.secondary",
                    fontSize: 13,
                    textTransform: "uppercase",
                  }}
                >
                  {group.label}
                </Box>

                {group.items.map((item) => (
                  <ListItemButton
                    key={item.href}
                    onClick={() => {
                      router.push(item.href);
                      setMobileOpen(false);
                    }}
                  >
                    <Box
                      sx={{
                        mr: 2,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {item.icon}
                    </Box>

                    <ListItemText primary={item.label} />
                  </ListItemButton>
                ))}
              </React.Fragment>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
}
