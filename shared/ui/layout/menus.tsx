import { UserRole } from "@/shared/constants/user-role";

import {
  ShieldOutlined,
  DescriptionOutlined,
  ReceiptOutlined,
  GavelOutlined,
  HandshakeOutlined,
  AssignmentOutlined,
  CreditCardOutlined,
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
    label: "CFSB Diensten",
    roles: [UserRole.TENANT_ADMIN],
    items: [
      {
        label: "Blok-Check",
        href: "/block-check",
        icon: <ShieldOutlined fontSize="small" />,
      },
      {
        label: "Financiële afspraak registreren",
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
        label: "Gerechtelijke opvolging",
        href: "/verdicts",
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
        label: "Dossier bekijken",
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
        label: "Financiële verklaring aanvragen",
        href: "/financial-report",
        icon: <DescriptionOutlined fontSize="small" />,
      },
      {
        label: "Status economische blokkade bekijken",
        href: "/block-status",
        icon: <ShieldOutlined fontSize="small" />,
      },
    ],
  },
];
