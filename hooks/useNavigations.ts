"use client";
import { protocol, rootDomain } from "@/lib/config";
import { useRouter } from "next/navigation";

const useClientRouter = () => {
  const router = useRouter();

  const redirectTo = (path: string) => {
    router.push(path);
  };

  const redirectToSlug = (slug: string) => {
    router.push(`${protocol}://${slug}.${rootDomain}/`);
  };

  const redirectToLoginCompany = () => {
    router.push(`${protocol}://auth.${rootDomain}/`);
  };

  const redirectToSlugLoginCompany = (subdomain: string, email?: string) => {
    let baseUrl = `${protocol}://${subdomain}.${rootDomain}/login`;
    // Si se proporciona un correo electrónico, lo agregamos como parámetro de consulta
    if (email) {
      baseUrl += `?email=${email}`;
    }
    router.push(baseUrl);
  };

  const redirectToSignUp = () => {
    router.push(`${protocol}://auth.${rootDomain}/signup`);
  };

  const redirectToDashboardByRole = (role: string) => {
    console.log("Redirecting based on role:", role);

    switch (role) {
      case "ADMIN":
        return "/admin";
      case "MANAGER":
        return "/company";
      case "ACCOUNTANT":
        return "/accountant";
      case "BAILIFF":
        return "/bailiff";
      case "VIEWER":
        return "/viewer";
      default:
        return "/auth/login";
    }
  };

  return {
    redirectTo,
    redirectToSlug,
    redirectToLoginCompany,
    redirectToSlugLoginCompany,
    redirectToSignUp,
    redirectToDashboardByRole,
  };
};

export default useClientRouter;
