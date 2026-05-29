"use client";

import useSWR from "swr";

const fetcher = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Error loading categories");
  }

  return response.json();
};

export function useSettingCategories() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/admin/settings/categories",
    fetcher,
  );

  return {
    categories: data || [],
    isLoading,
    error,
    mutate,
  };
}
