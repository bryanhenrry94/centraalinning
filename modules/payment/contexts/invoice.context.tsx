"use client";
import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useMemo,
} from "react";

interface InvoiceContextProps {
  loading: boolean;
}

interface InvoiceProviderProps {
  children: ReactNode;
}

const InvoiceContextInstance = createContext<InvoiceContextProps | undefined>(
  undefined
);

export const InvoiceProvider: React.FC<InvoiceProviderProps> = ({
  children,
}) => {
  const [loading, setLoading] = useState(false);

  const contextValue = useMemo(
    () => ({
      loading,
    }),
    [loading]
  );

  return (
    <InvoiceContextInstance.Provider value={contextValue}>
      {children}
    </InvoiceContextInstance.Provider>
  );
};

export const useVerdictContext = (): InvoiceContextProps => {
  const context = useContext(InvoiceContextInstance);
  if (!context) {
    throw new Error("VerdictContext must be used within an InvoiceProvider");
  }
  return context;
};
