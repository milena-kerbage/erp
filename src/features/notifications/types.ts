export type NotificationTab = "inbox" | "general";

export type NotificationActor =
  | { kind: "member"; seed: string }
  | { kind: "lead"; leadId: string }
  | { kind: "system" };

export type AppNotification = {
  id: string;
  tab: NotificationTab;
  actor: NotificationActor;
  /** Frase: <quem> <verbo> <alvo> <complemento>. */
  who: string;
  verb: string;
  target?: string;
  suffix?: string;
  at: string;
  /** Onde aconteceu (funil, módulo...). */
  context: string;
  href?: string;
  read: boolean;
  archived: boolean;
  file?: string;
  /** Lead novo sem responsável: dá para assumir ou ignorar. */
  claimLeadId?: string;
};
