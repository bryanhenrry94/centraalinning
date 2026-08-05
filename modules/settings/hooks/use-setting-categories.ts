"use client";

import useSWR from "swr";

const fetcher = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Error loading categories");
  }

  return response.json();
};

export function useSettingCategories(jurisdictionId?: string | null) {
  const key = jurisdictionId
    ? `/api/admin/settings/categories?jurisdictionId=${jurisdictionId}`
    : "/api/admin/settings/categories";

  const { data, error, isLoading, mutate } = useSWR(key, fetcher);

  return {
    categories: data || [],
    isLoading,
    error,
    mutate,
  };
}
