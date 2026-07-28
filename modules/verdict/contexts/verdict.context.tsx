"use client";
import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useMemo,
} from "react";
import { AlertService } from "@/shared/ui/alerts";
import { generateUUID } from "@/shared/utils/uuid";
import { embargoTipos } from "@/modules/blockade/constants/embargo";
import {
  VerdictEmbargo,
  VerdictEmbargoCreate,
} from "@/modules/verdict/services/verdict-embargo.validators";
import { VerdictInterestDetail } from "@/modules/verdict/services/verdict-interest-details.validators";

interface VerdictContextProps {
  loading: boolean;
  embargoData: VerdictEmbargo[];
  interesDetails: VerdictInterestDetail[];
  saveEmbargo: (data: VerdictEmbargo) => void;
  deleteEmbargo: (id: number) => Promise<VerdictEmbargo[]>;
  saveInteresDetails: (data: VerdictInterestDetail) => VerdictInterestDetail[];
}

interface VerdictProviderProps {
  children: ReactNode;
}

const VerdictContextInstance = createContext<VerdictContextProps | undefined>(
  undefined
);

export const VerdictProvider: React.FC<VerdictProviderProps> = ({
  children,
}) => {
  const [loading, setLoading] = useState(false);
  const [embargoData, setEmbargoData] = useState<VerdictEmbargo[]>([]);
  const [interesDetails, setInteresDetails] = useState<VerdictInterestDetail[]>(
    []
  );

  const saveEmbargo = (data: VerdictEmbargoCreate): VerdictEmbargo[] => {
    try {
      setLoading(true);

      // Simulate an API call
      setTimeout(() => {
        setLoading(false);
      }, 1000);

      const embargoTipo = embargoTipos.find(
        (tipo) => String(tipo.id) === data.embargo_type
      );

      const newEmbargo: VerdictEmbargo = {
        ...data,
        id: generateUUID(), // Simulate a UUID string ID
        embargo_type: embargoTipo?.nombre || "Desconocido",
        created_at: new Date(),
        updated_at: new Date(),
      };

      setEmbargoData((prevData) => [...prevData, newEmbargo]);
      return [...embargoData, newEmbargo];
    } catch (error) {
      console.error("Error saving embargo:", error);
      // Throw an error to satisfy the return type contract
      throw new Error("Failed to save embargo");
    } finally {
      setLoading(false);
    }
  };

  const deleteEmbargo = async (id: number): Promise<VerdictEmbargo[]> => {
    try {
      const confirmed = await AlertService.showConfirm(
        "Confirmar eliminación",
        "¿Estás seguro de que deseas eliminar este registro de embargo?",
        "Sí, eliminar",
        "Cancelar"
      );

      if (confirmed) {
        setLoading(true);
        // Simulate an API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const updatedData = embargoData.filter(
          (item) => item.id !== String(id)
        );
        setEmbargoData(updatedData);
        return updatedData;
      } else {
        return embargoData;
      }
    } catch (error) {
      console.error("Error deleting embargo:", error);
      AlertService.showError("No se pudo eliminar el registro.");
      throw new Error("Failed to delete embargo");
    } finally {
      setLoading(false);
    }
  };

  const saveInteresDetails = (
    data: VerdictInterestDetail
  ): VerdictInterestDetail[] => {
    try {
      setLoading(true);

      // Simulate an API call
      setTimeout(() => {
        setLoading(false);
      }, 1000);

      const newDetail: VerdictInterestDetail = {
        ...data,
      };

      setInteresDetails((prevDetails) => [...prevDetails, newDetail]);
      return [...interesDetails, newDetail];
    } catch (error) {
      console.error("Error saving interest details:", error);
      throw new Error("Failed to save interest details");
    } finally {
      setLoading(false);
    }
  };

  const contextValue = useMemo(
    () => ({
      loading,
      embargoData,
      saveEmbargo,
      deleteEmbargo,
      saveInteresDetails,
      interesDetails,
    }),
    [loading, embargoData, interesDetails]
  );

  return (
    <VerdictContextInstance.Provider value={contextValue}>
      {children}
    </VerdictContextInstance.Provider>
  );
};

export const useVerdictContext = (): VerdictContextProps => {
  const context = useContext(VerdictContextInstance);
  if (!context) {
    throw new Error("VerdictContext must be used within an VerdictProvider");
  }
  return context;
};
