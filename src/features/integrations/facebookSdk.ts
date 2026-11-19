"use client";

// SDK de JavaScript do Facebook, só para o cadastro incorporado do WhatsApp (o mesmo do ERP da Le Ange): abre a
// janela oficial da Meta e devolve o `code` que o servidor troca pelo acesso. Carrega uma vez, quando a tela abre.

export const FACEBOOK_SDK_URL = "https://connect.facebook.net/pt_BR/sdk.js";

export type RespostaLogin = { authResponse?: { code?: string } | null; status?: string };
type SdkFacebook = {
  init: (opcoes: { appId: string; autoLogAppEvents: boolean; xfbml: boolean; version: string }) => void;
  login: (callback: (resposta: RespostaLogin) => void, opcoes: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    FB?: SdkFacebook;
    fbAsyncInit?: () => void;
  }
}

let carregando: Promise<SdkFacebook> | null = null;

export function carregarSdkFacebook(appId: string, versao: string) {
  carregando ??= new Promise<SdkFacebook>((resolver, rejeitar) => {
    const pronto = () => {
      window.FB!.init({ appId, autoLogAppEvents: true, xfbml: false, version: versao });
      resolver(window.FB!);
    };
    if (window.FB) return pronto();
    const desistir = (script?: HTMLScriptElement) => {
      carregando = null;
      script?.remove();
      rejeitar(new Error("sdk_indisponivel"));
    };
    window.fbAsyncInit = pronto;
    const script = document.createElement("script");
    script.src = FACEBOOK_SDK_URL;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => desistir(script);
    document.body.appendChild(script);
    // Bloqueador de anúncio costuma segurar o facebook.net sem erro: depois de 15 s, desiste e avisa.
    window.setTimeout(() => window.FB || desistir(script), 15_000);
  });
  return carregando;
}

/** Opções do FB.login para o cadastro incorporado v4. Coexistência mantém o número no app do celular. */
export function opcoesCadastro(configId: string, coexistencia: boolean) {
  return {
    config_id: configId,
    response_type: "code",
    override_default_response_type: true,
    extras: { setup: {}, featureType: coexistencia ? "whatsapp_business_app_onboarding" : "", sessionInfoVersion: "3" },
  };
}

export type AvisoCadastro =
  | { tipo: "fim"; wabaId?: string; phoneNumberId?: string }
  | { tipo: "cancelado"; etapa?: string }
  | { tipo: "erro"; mensagem?: string };

/** Ouve a janela da Meta (só origens exatas do Facebook): conta e número escolhidos, ou onde a pessoa parou. */
export function ouvirCadastro(aoAvisar: (aviso: AvisoCadastro) => void) {
  const ouvir = (evento: MessageEvent) => {
    if (!["https://www.facebook.com", "https://web.facebook.com", "https://m.facebook.com"].includes(evento.origin)) return;
    let dados: unknown = evento.data;
    if (typeof dados === "string") {
      if (dados.length > 32768) return;
      try { dados = JSON.parse(dados); } catch { return; }
    }
    const valor = dados && typeof dados === "object" && !Array.isArray(dados) ? dados as { type?: unknown; event?: unknown; data?: unknown } : null;
    if (!valor || valor.type !== "WA_EMBEDDED_SIGNUP" || typeof valor.event !== "string") return;
    const info = (valor.data && typeof valor.data === "object" ? valor.data : {}) as Record<string, string | undefined>;
    if (valor.event.startsWith("FINISH")) aoAvisar({ tipo: "fim", wabaId: info.waba_id, phoneNumberId: info.phone_number_id });
    else if (valor.event === "CANCEL") aoAvisar({ tipo: "cancelado", etapa: info.current_step });
    else if (valor.event === "ERROR") aoAvisar({ tipo: "erro", mensagem: info.error_message });
  };
  window.addEventListener("message", ouvir);
  return () => window.removeEventListener("message", ouvir);
}
