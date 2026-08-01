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
    id: "deurwaarder",
    label: "Deurwaarder",
    roles: [UserRole.BAILIFF],
    items: [
      {
        label: "Nieuwe overdrachten",
        href: "/legal-processes?tab=pending",
        icon: <MoveToInboxOutlined fontSize="small" />,
      },
      {
        label: "Expedienten GOP",
        href: "/legal-processes",
        icon: <GavelOutlined fontSize="small" />,
      },
      {
        label: "Documenten",
        href: "/documents",
        icon: <DescriptionOutlined fontSize="small" />,
      },
      {
        label: "Facturen",
        href: "/invoices",
        icon: <ReceiptOutlined fontSize="small" />,
      },
    ],
  },
];
