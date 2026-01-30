"use client";
import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useMemo,
} from "react";
import {
  ICompany,
  initialTenantSignUp,
  ITenantSignUp,
  IUser,
  iValidateSlugResponse,
} from "@/lib/validations/signup";
import { validaSubdomain } from "@/actions/tenant";
import { createAccount } from "@/actions/auth";

interface AuthContextProps {
  step: number;
  signUpData: ITenantSignUp;
  handleNext: () => void;
  handleBack: () => void;
  updateUserSignUpData: (userData: Partial<IUser>) => void;
  updateCompanySignUpData: (companyData: Partial<ICompany>) => void;
  validateSlug: (slug: string) => Promise<iValidateSlugResponse>;
  signUp: () => Promise<string>;
  loading: boolean;
  validateToken: (token: string) => Promise<boolean>;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [signUpData, setSignUpData] =
    useState<ITenantSignUp>(initialTenantSignUp);

  const updateUserSignUpData = (userData: Partial<IUser>) => {
    setSignUpData((prevData) => ({
      ...prevData,
      user: {
        ...prevData.user,
        ...userData,
      },
    }));
  };

  const updateCompanySignUpData = (companyData: Partial<ICompany>) => {
    setSignUpData((prevData) => ({
      ...prevData,
      company: {
        ...prevData.company,
        ...companyData,
      },
    }));
  };

  const handleNext = () => {
    setStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setStep((prevStep) => prevStep - 1);
  };

  const validateSlug = async (slug: string): Promise<iValidateSlugResponse> => {
    try {
      setLoading(true);

      const valid = await validaSubdomain(slug);
      if (!valid) {
        throw new Error("Validate slug failed, response is null");
      }

      return { is_valid: valid, subdomain: slug };
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const validateToken = async (token: string): Promise<boolean> => {
    // const authService = new AuthService();
    try {
      setLoading(true);
      // const response = await authService.validateToken(token);
      return true;
    } catch (error: any) {
      alert("Error validando el token: " + error.response?.data.error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (): Promise<string> => {
    try {
      setLoading(true);
      const response = await createAccount(signUpData);
      if (!response) {
        throw new Error("Sign up failed, response is null");
      }

      if (response.status) {
        return response.subdomain;
      }
      return "";
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const contextValue = useMemo(
    () => ({
      step,
      signUpData,
      loading,
      handleNext,
      handleBack,
      updateUserSignUpData,
      updateCompanySignUpData,
      signUp,
      validateSlug,
      validateToken,
    }),
    [step, signUpData, loading]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextProps => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};
