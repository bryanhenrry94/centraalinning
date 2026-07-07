import React, { useState } from "react";
import { useFormContext, Controller, FieldValues } from "react-hook-form";
import TextField from "@mui/material/TextField";
import FormHelperText from "@mui/material/FormHelperText";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

interface InputHookFormProps {
  name: string;
  type?: string;
  readonly?: boolean;
  [key: string]: any;
}

const InputHookForm: React.FC<InputHookFormProps> = (props) => {
  const {
    control,
    formState: { errors },
  } = useFormContext<FieldValues>(); // retrieve all hook methods

  const [showPassword, setShowPassword] = useState(false);

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
  };

  return (
    <>
      <Controller
        name={props.name}
        control={control}
        defaultValue={props.defaultValue ?? ""}
        render={({ field: { ref, ...field } }) => (
          <TextField
            inputRef={ref}
            {...field}
            fullWidth
            label={props.label}
            size="small"
            variant="outlined"
            error={!!errors[props.name]}
            type={
              props.type === "password"
                ? showPassword
                  ? "text"
                  : "password"
                : props.type === "date"
                ? "date"
                : props.type || "text"
            }
            InputProps={{
              ...(props.type === "password"
                ? {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={
                            showPassword
                              ? "hide the password"
                              : "display the password"
                          }
                          onClick={handleClickShowPassword}
                          onMouseDown={handleMouseDownPassword}
                          edge="end"
                          style={{
                            border: "none",
                            background: "transparent",
                          }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }
                : {}),
              readOnly: props.readonly,
            }}
            InputLabelProps={{ shrink: true }}
            {...(props.inputProps ? { inputProps: props.inputProps } : {})}
          />
        )}
      />

      <FormHelperText error>
        {errors[props.name]?.message?.toString()}
      </FormHelperText>
    </>
  );
};

export default InputHookForm;
