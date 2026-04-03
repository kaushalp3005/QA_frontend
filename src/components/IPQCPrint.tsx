"use client";
import { printRecord } from "@/lib/printRecord";
import { IPQCRecord } from "@/types";

interface Props {
  record: IPQCRecord;
}

export default function IPQCPrint({ record }: Props) {
  return (
    <button
      type="button"
      onClick={() => printRecord(record as any)}
      className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all"
    >
      Print
    </button>
  );
}
