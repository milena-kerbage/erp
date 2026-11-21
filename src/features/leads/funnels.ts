import {
  ArrowsClockwiseIcon,
  CalculatorIcon,
  CalendarCheckIcon,
  ChatCircleDotsIcon,
  CheckCircleIcon,
  CircleDashedIcon,
  CreditCardIcon,
  PackageIcon,
  PauseCircleIcon,
  PhoneCallIcon,
  SealCheckIcon,
  TruckIcon,
  UserPlusIcon,
  XCircleIcon,
  BabyIcon,
  ButterflyIcon,
  CakeIcon,
  CameraIcon,
  ChampagneIcon,
  CrownSimpleIcon,
  CurrencyCircleDollarIcon,
  DiamondIcon,
  DressIcon,
  FlowerLotusIcon,
  GiftIcon,
  GraduationCapIcon,
  HandCoinsIcon,
  HandshakeIcon,
  HeartIcon,
  HourglassIcon,
  MegaphoneIcon,
  NeedleIcon,
  PaletteIcon,
  RulerIcon,
  ScissorsIcon,
  ShoppingBagIcon,
  SparkleIcon,
  StarIcon,
  TargetIcon,
  TrophyIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import type { Tone } from "@/styles/theme";

export type FunnelStage = {
  id: string;
  label: string;
  tone: Tone;
  /** Nome do ícone (stageIcons); sem ele, o ícone é sugerido pelo nome da etapa. */
  icon?: string;
};

export type Funnel = {
  id: string;
  name: string;
  /** Ícone e cor identificam o funil no seletor. */
  icon: Icon;
  tone: Tone;
  /** Etapas na ordem do kanban. */
  stages: readonly FunnelStage[];
};

/** Ícones disponíveis para um funil, agrupados por tema. */
export const funnelIcons: readonly { name: string; group: string; icon: Icon }[] = [
  { name: "Vendas", group: "Comercial", icon: HandCoinsIcon },
  { name: "Dinheiro", group: "Comercial", icon: CurrencyCircleDollarIcon },
  { name: "Sacola", group: "Comercial", icon: ShoppingBagIcon },
  { name: "Acordo", group: "Comercial", icon: HandshakeIcon },
  { name: "Meta", group: "Comercial", icon: TargetIcon },
  { name: "Divulgação", group: "Comercial", icon: MegaphoneIcon },
  { name: "Retorno", group: "Comercial", icon: ArrowsClockwiseIcon },
  { name: "Clientes", group: "Comercial", icon: UsersThreeIcon },
  { name: "Conquista", group: "Comercial", icon: TrophyIcon },
  { name: "Em espera", group: "Comercial", icon: HourglassIcon },
  { name: "Vestido", group: "Ateliê", icon: DressIcon },
  { name: "Tesoura", group: "Ateliê", icon: ScissorsIcon },
  { name: "Agulha", group: "Ateliê", icon: NeedleIcon },
  { name: "Medidas", group: "Ateliê", icon: RulerIcon },
  { name: "Cores", group: "Ateliê", icon: PaletteIcon },
  { name: "Fotos", group: "Ateliê", icon: CameraIcon },
  { name: "Joia", group: "Ateliê", icon: DiamondIcon },
  { name: "Presente", group: "Ateliê", icon: GiftIcon },
  { name: "Coração", group: "Ocasiões", icon: HeartIcon },
  { name: "Brinde", group: "Ocasiões", icon: ChampagneIcon },
  { name: "Coroa", group: "Ocasiões", icon: CrownSimpleIcon },
  { name: "Formatura", group: "Ocasiões", icon: GraduationCapIcon },
  { name: "Bebê", group: "Ocasiões", icon: BabyIcon },
  { name: "Bolo", group: "Ocasiões", icon: CakeIcon },
  { name: "Flor", group: "Ocasiões", icon: FlowerLotusIcon },
  { name: "Borboleta", group: "Ocasiões", icon: ButterflyIcon },
  { name: "Brilho", group: "Ocasiões", icon: SparkleIcon },
  { name: "Estrela", group: "Ocasiões", icon: StarIcon },
];

/** Tons disponíveis para funis e etapas. */
export const funnelTones: readonly Tone[] = ["blue", "lavender", "peach", "rose", "green", "yellow", "teal", "neutral"];

/** Funil pelo id, ou o primeiro da lista. */
export function pickFunnel(list: readonly Funnel[], id: string | undefined): Funnel {
  return list.find((funnel) => funnel.id === id) ?? list[0];
}

/**
 * Ícones das etapas do funil (Configurações › Funis e etapas). O nome é o que fica gravado na etapa.
 * `pistas`: trechos do nome da etapa que sugerem o ícone quando ninguém escolheu um ("Orçamento" → calculadora).
 */
export const stageIcons: readonly { name: string; icon: Icon; pistas: readonly string[] }[] = [
  { name: "Novo", icon: UserPlusIcon, pistas: ["novo", "nova", "entrada", "chegou"] },
  { name: "Conversa", icon: ChatCircleDotsIcon, pistas: ["contato", "conversa", "atendimento", "respond"] },
  { name: "Ligação", icon: PhoneCallIcon, pistas: ["ligar", "ligacao", "retornar"] },
  { name: "Orçamento", icon: CalculatorIcon, pistas: ["orcamento", "proposta", "cotacao"] },
  { name: "Negociação", icon: HandshakeIcon, pistas: ["negocia", "acordo"] },
  { name: "Interesse", icon: HeartIcon, pistas: ["interesse", "interessad"] },
  { name: "Agendado", icon: CalendarCheckIcon, pistas: ["agend", "visita", "reuniao"] },
  { name: "Pagamento", icon: CreditCardIcon, pistas: ["pagamento", "sinal", "pix", "cobran"] },
  { name: "Confirmado", icon: CheckCircleIcon, pistas: ["confirmad", "aprovad"] },
  { name: "Fechado", icon: SealCheckIcon, pistas: ["fechad", "ganh", "vendid", "recuperad", "conclu"] },
  { name: "Medidas", icon: RulerIcon, pistas: ["medida", "prova"] },
  { name: "Corte", icon: ScissorsIcon, pistas: ["corte", "producao", "produzindo", "confec"] },
  { name: "Costura", icon: NeedleIcon, pistas: ["costura", "ajuste", "bordado", "acabamento"] },
  { name: "Pronto", icon: PackageIcon, pistas: ["pronto", "embala", "separad"] },
  { name: "Entrega", icon: TruckIcon, pistas: ["entreg", "envi", "despach", "retir"] },
  { name: "Presente", icon: GiftIcon, pistas: ["presente", "entregue"] },
  { name: "Reativar", icon: ArrowsClockwiseIcon, pistas: ["reativ", "retorno", "remarketing", "recontato"] },
  { name: "Aguardando", icon: HourglassIcon, pistas: ["aguard", "espera", "pendente"] },
  { name: "Pausado", icon: PauseCircleIcon, pistas: ["pausad", "parad", "frio"] },
  { name: "Perdido", icon: XCircleIcon, pistas: ["perdid", "cancelad", "desist", "sem resposta"] },
  { name: "Bebê", icon: BabyIcon, pistas: ["bebe", "nasc"] },
  { name: "Meta", icon: TargetIcon, pistas: ["qualific", "meta"] },
  { name: "Destaque", icon: StarIcon, pistas: ["vip", "priorid", "destaque"] },
  { name: "Brilho", icon: SparkleIcon, pistas: [] },
];

const semAcento = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Ícone da etapa: o escolhido nas configurações ou, sem escolha, o sugerido pelo nome; por fim o círculo. */
export function stageIcon(stage: Pick<FunnelStage, "label" | "icon"> | undefined | null): Icon {
  if (!stage) return CircleDashedIcon;
  const escolhido = stage.icon && stageIcons.find((item) => item.name === stage.icon);
  if (escolhido) return escolhido.icon;
  const nome = semAcento(stage.label);
  // "Entregue" bate em "entreg" (caminhão) antes de "entregue" (presente): a ordem da lista decide os empates.
  return stageIcons.find((item) => item.pistas.some((pista) => nome.includes(pista)))?.icon ?? CircleDashedIcon;
}

/** Nome do ícone em uso na etapa (para marcar o escolhido no seletor). */
export function stageIconName(stage: Pick<FunnelStage, "label" | "icon">): string | undefined {
  const icone = stageIcon(stage);
  return stageIcons.find((item) => item.icon === icone)?.name;
}
