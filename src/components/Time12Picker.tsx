"use client";
import { useState, useEffect } from "react";

const to24Hour = (hour: number, minute: number, period: string): string => {
  let h = hour;
  if (period === "AM" && h === 12) h = 0;
  else if (period === "PM" && h !== 12) h += 12;
  return `${h.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
};

const format12 = (time24: string): string => {
  if (!time24 || !time24.includes(":")) return "";
  const [h, m] = time24.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return "";
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
};

const parseInput = (raw: string): string | null => {
  const s = raw.trim().toUpperCase().replace(/\s+/g, " ");
  if (!s) return "";
  const m = s.match(/^(\d{1,2})[:.\s]?(\d{2})\s*(AM|PM|A|P)?\.?M?\.?$/);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  let period = m[3];
  if (period === "A") period = "AM";
  else if (period === "P") period = "PM";
  if (minute < 0 || minute > 59) return null;
  if (period) {
    if (hour < 1 || hour > 12) return null;
    return to24Hour(hour, minute, period);
  }
  if (hour < 0 || hour > 23) return null;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
};

interface Props {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export default function Time12Picker({ value, onChange, disabled, className, placeholder = "hh:mm AM/PM" }: Props) {
  const [text, setText] = useState(format12(value));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setText(format12(value));
  }, [value]);

  const commit = (raw: string) => {
    const parsed = parseInput(raw);
    if (parsed === null) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onChange(parsed);
    setText(format12(parsed));
  };

  return (
    <input
      type="text"
      value={text}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        setInvalid(false);
      }}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit((e.target as HTMLInputElement).value);
        }
      }}
      className={
        (className ?? "w-full border rounded px-2 py-1 text-sm") +
        (invalid ? " border-red-500" : "")
      }
    />
  );
}
