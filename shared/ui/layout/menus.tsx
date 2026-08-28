import { UserRole } from "@/shared/constants/user-role";

import {
  ShieldOutlined,
  DescriptionOutlined,
  ReceiptOutlined,
  GavelOutlined,
  HandshakeOutlined,
  AssignmentOutlined,
  CreditCardOutlined,
  MoveToInboxOutlined,
  GroupOutlined,
  HelpOutlineOutlined,
  DashboardOutlined,
  BusinessOutlined,
  BadgeOutlined,
  BalanceOutlined,
  FolderOutlined,
  PaymentsOutlined,
  AccountBalanceWalletOutlined,
  TuneOutlined,
  MapOutlined,
  ArticleOutlined,
  NotificationsOutlined,
  ManageAccountsOutlined,
  HistoryOutlined,
  ReportProblemOutlined,
  MonitorHeartOutlined,
} from "@mui/icons-material";

export type HeaderMenuItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

export type HeaderMenuGroup = {
  id: string;
  label: string;
  roles: UserRole[];
  items: {
    label: string;
    href: string;
    icon: React.ReactNode;
  }[];
};

export const menuGroups: HeaderMenuGroup[] = [
  {
    id: "dossiers",
    label: "Diensten",
    roles: [UserRole.TENANT_ADMIN],
    items: [
      {
        label: "Blok-Check",
        href: "/block-check",
        icon: <ShieldOutlined fontSize="small" />,
      },
      {
        label: "FAR — Financiële Afspraken Registreren",
        href: "/financial-agreements",
        icon: <DescriptionOutlined fontSize="small" />,
      },
      {
        // Antes etiquetado como "Financiële afspraak registreren" — ese
        // nombre ahora corresponde al servicio FAR real (ver arriba). Esta
        // entrada sigue siendo el módulo Contract existente.
        label: "Overeenkomst registreren",
        href: "/contracts",
        icon: <DescriptionOutlined fontSize="small" />,
      },
      {
        label: "Administratieve opvolging",
        href: "/collections",
        icon: <ReceiptOutlined fontSize="small" />,
      },
      {
        label: "Blokkade",
        href: "/blocks",
        icon: <ShieldOutlined fontSize="small" />,
      },
      {
        label: "Collectieve opvolging",
        href: "/collective-follow-up",
        icon: <GroupOutlined fontSize="small" />,
      },
      {
        label: "Dossieroverdracht",
        href: "/legal-processes",
        icon: <GavelOutlined fontSize="small" />,
      },
    ],
  },

  {
    id: "verplichtingen",
    label: "Mijn verplichtingen",
    roles: [UserRole.DEBTOR],
    items: [
      {
        label: "Mijn dossiers",
        href: "/dashboard",
        icon: <AssignmentOutlined fontSize="small" />,
      },
      {
        label: "Betalen",
        href: "/payments",
        icon: <CreditCardOutlined fontSize="small" />,
      },
      {
        label: "Betalingsregeling aanvragen",
        href: "/agreements",
        icon: <HandshakeOutlined fontSize="small" />,
      },
      {
        label: "Collectieve opvolging",
        href: "/collective-follow-up",
        icon: <GroupOutlined fontSize="small" />,
      },
      {
        label: "Mijn financiële verklaring",
        href: "/financial-report",
        icon: <DescriptionOutlined fontSize="small" />,
      },
      {
        label: "Economische blokkade",
        href: "/block-status",
        icon: <ShieldOutlined fontSize="small" />,
      },
    ],
  },

  {
    id: "advocaat",
    label: "Advocaat",
    roles: [UserRole.LAWYER],
    items: [
      {
        label: "Nieuwe dossieroverdrachten",
        href: "/legal-processes?tab=pending",
        icon: <MoveToInboxOutlined fontSize="small" />,
      },
      {
        label: "Mijn gerechtelijke dossiers",
        href: "/legal-processes",
        icon: <GavelOutlined fontSize="small" />,
      },
      {
        label: "Documenten",
        href: "/documents",
        icon: <DescriptionOutlined fontSize="small" />,
      },
    ],
  },

  {
    // Sin submenú desplegable: un solo botón fijo hacia /legal-processes —
    // ver canAccessBailiffDossiers en header.tsx.
    id: "deurwaarder",
    label: "Mijn dossiers",
    roles: [UserRole.BAILIFF],
    items: [
      {
        label: "Mijn dossiers",
        href: "/legal-processes",
        icon: <GavelOutlined fontSize="small" />,
      },
    ],
  },

  {
    // CFSB Admin — cross-tenant, alleen voor PLATFORM_OWNER. Lijst plat
    // (geen sub-headers ondersteund door HeaderMenuGroup), zelfde patroon
    // als "dossiers" hierboven maar met de 5 groepen van de sponsor-Screen
    // Map achter elkaar.
    id: "admin-cfsb",
    label: "CFSB Admin",
    roles: [UserRole.PLATFORM_OWNER],
    items: [
      { label: "Dashboard", href: "/admin", icon: <DashboardOutlined fontSize="small" /> },
      { label: "Deelnemers", href: "/admin/tenants", icon: <BusinessOutlined fontSize="small" /> },
      { label: "Personenregister", href: "/admin/persons", icon: <BadgeOutlined fontSize="small" /> },
      { label: "Advocaten", href: "/admin/lawyers", icon: <BalanceOutlined fontSize="small" /> },
      { label: "Deurwaarders", href: "/admin/bailiffs", icon: <GavelOutlined fontSize="small" /> },
      { label: "Alle dossiers", href: "/admin/case-files", icon: <FolderOutlined fontSize="small" /> },
      { label: "FAR-register", href: "/admin/far-register", icon: <DescriptionOutlined fontSize="small" /> },
      { label: "BLC-register", href: "/admin/blc-register", icon: <ShieldOutlined fontSize="small" /> },
      { label: "AOP-register", href: "/admin/aop-register", icon: <ReceiptOutlined fontSize="small" /> },
      { label: "BLK-register", href: "/admin/blk-register", icon: <ShieldOutlined fontSize="small" /> },
      { label: "COP-register", href: "/admin/cop-register", icon: <GroupOutlined fontSize="small" /> },
      { label: "Dossieroverdrachten", href: "/admin/transfers-register", icon: <MoveToInboxOutlined fontSize="small" /> },
      { label: "GOP-register", href: "/admin/gop-register", icon: <GavelOutlined fontSize="small" /> },
      { label: "CFSB-facturen", href: "/invoices", icon: <ReceiptOutlined fontSize="small" /> },
      { label: "Betalingen", href: "/admin/payments", icon: <PaymentsOutlined fontSize="small" /> },
      { label: "Financiële verplichtingen", href: "/admin/obligations", icon: <AccountBalanceWalletOutlined fontSize="small" /> },
      { label: "Tariefinstellingen", href: "/admin/settings/parameters", icon: <TuneOutlined fontSize="small" /> },
      { label: "Plannen", href: "/admin/plans", icon: <AssignmentOutlined fontSize="small" /> },
      { label: "Eilanden/landen", href: "/admin/jurisdictions", icon: <MapOutlined fontSize="small" /> },
      { label: "Systeemparameters", href: "/admin/settings/parameters", icon: <TuneOutlined fontSize="small" /> },
      { label: "Document-/briefinstellingen", href: "/admin/document-settings", icon: <ArticleOutlined fontSize="small" /> },
      { label: "Notificatiebeheer", href: "/admin/settings/parameters", icon: <NotificationsOutlined fontSize="small" /> },
      { label: "Gebruikers & rollen", href: "/admin/users", icon: <ManageAccountsOutlined fontSize="small" /> },
      { label: "Auditlog", href: "/admin/audit-log", icon: <HistoryOutlined fontSize="small" /> },
      { label: "Overtredingen/vergoedingen", href: "/admin/administrative-fees", icon: <ReportProblemOutlined fontSize="small" /> },
      { label: "Werkgeverbevestigingen", href: "/admin/employer-confirmations", icon: <HandshakeOutlined fontSize="small" /> },
      { label: "Systeem-/procescontrole", href: "/admin/system-control", icon: <MonitorHeartOutlined fontSize="small" /> },
    ],
  },

  // Zichtbaar voor iedereen — geen enkele rol wordt uitgesloten.
  {
    id: "ondersteuning",
    label: "Ondersteuning",
    roles: Object.values(UserRole),
    items: [
      {
        label: "Feedback & Ondersteuning",
        href: "/support",
        icon: <HelpOutlineOutlined fontSize="small" />,
      },
    ],
  },
];
