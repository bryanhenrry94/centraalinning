import { UserRole } from "@/constants/user-role";

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
    label: "Mijn dossiers",
    roles: [UserRole.TENANT_ADMIN],
    items: [
      {
        label: "Blok-Check",
        href: "/blok-checks",
        icon: <ShieldOutlined fontSize="small" />,
      },
      {
        label: "Overeenkomst registreren",
        href: "/overeenkomsten-registreren",
        icon: <DescriptionOutlined fontSize="small" />,
      },
      {
        label: "Administratieve opvolging",
        href: "/collections",
        icon: <ReceiptOutlined fontSize="small" />,
      },
      {
        label: "Directe economische blokkade",
        href: "/directe-economische-blokkade",
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
        href: "/verklaring",
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
