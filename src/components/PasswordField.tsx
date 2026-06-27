"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface Props {
  name: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  autoFocus?: boolean;
  defaultValue?: string;
  className?: string;
}

// Ports password_visibility_controller.
export default function PasswordField({
  name,
  placeholder,
  autoComplete,
  required,
  autoFocus,
  defaultValue,
  className = "w-full border border-[var(--line)] text-[var(--text)] bg-[var(--field-bg)] px-3 py-[15px] outline-none",
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative block">
      <input
        type={visible ? "text" : "password"}
        name={name}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        autoFocus={autoFocus}
        defaultValue={defaultValue}
        className={`${className} pr-10`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-px top-px bottom-px w-9 border-0 bg-transparent text-[var(--muted)] grid place-items-center cursor-pointer p-0 font-inherit transition-colors duration-150 hover:text-white"
        tabIndex={-1}
        aria-label="Mostrar senha"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </span>
  );
}
