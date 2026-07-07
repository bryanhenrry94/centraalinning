"use client";

import TextField from "@mui/material/TextField";

import { Controller, useFormContext } from "react-hook-form";

interface Props {
  name: string;
  label: string;
  type?: string;
}

export default function ParameterInput({ name, label, type = "text" }: Props) {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      defaultValue=""
      render={({ field }) => (
        <TextField
          {...field}
          fullWidth
          label={label}
          type={type}
          error={!!errors[name]}
          helperText={errors[name]?.message as string}
        />
      )}
    />
  );
}
