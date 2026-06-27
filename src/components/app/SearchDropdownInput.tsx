"use client";

import { useRef, useState, useEffect } from "react";

function normalize(value: string): string {
  return value.toString().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Ports search_dropdown_controller: filters suggestions, submits the form on select.
export default function SearchDropdownInput({
  name,
  defaultValue,
  placeholder,
  className,
  suggestions,
  id,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  className: string;
  suggestions: string[];
  id?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [filtered, setFiltered] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  function search(v: string) {
    const query = normalize(v);
    if (query.length < 1) {
      setOpen(false);
      return;
    }
    const matches = suggestions.filter((s) => normalize(s).includes(query)).slice(0, 8);
    setFiltered(matches);
    setOpen(matches.length > 0);
  }

  function select(item: string) {
    setValue(item);
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.form?.requestSubmit());
  }

  return (
    <div className="relative" ref={wrapRef}>
      <input
        ref={inputRef}
        id={id}
        type="search"
        name={name}
        value={value}
        autoComplete="off"
        placeholder={placeholder}
        className={className}
        onChange={(e) => {
          setValue(e.target.value);
          search(e.target.value);
        }}
        onFocus={(e) => search(e.target.value)}
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 border border-[var(--line)] border-t-0 bg-[var(--panel-bg)] max-h-[280px] overflow-y-auto">
          {filtered.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => select(item)}
              className="block w-full min-h-[42px] px-4 text-left border-0 border-b border-[var(--line)] bg-[var(--panel-bg)] text-[var(--text)] text-[12px] tracking-[.04em] cursor-pointer hover:bg-[var(--hover-bg)] last:border-b-0"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
