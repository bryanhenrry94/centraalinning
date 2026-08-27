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
