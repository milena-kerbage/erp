"use client";

import { useState } from "react";
import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { errorMessage } from "../client";
import type { WhatsAppMessage } from "../types";
import { Notice, Stack } from "./shared";

export function MediaDownloadButton({ message }: { message: WhatsAppMessage }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/whatsapp/media?messageId=${encodeURIComponent(message.id)}`, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error || `Não foi possível baixar a mídia (HTTP ${response.status}).`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const disposition = response.headers.get("Content-Disposition") || "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] || message.filename || `whatsapp-${message.type}`;
      link.download = filename.replace(/[\\/]/g, "_");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setLoading(false); }
  }

  return <Stack><Button variant="secondary" size="sm" icon={DownloadSimpleIcon} loading={loading} onClick={() => void download()}>Baixar mídia recebida</Button>{error && <Notice $error role="alert">{error}</Notice>}</Stack>;
}
