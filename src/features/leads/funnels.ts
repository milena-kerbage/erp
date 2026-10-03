import {
  ArrowsClockwiseIcon,
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

/**
 * Funis iniciais: vendas (quem ainda não comprou), clientes (quem comprou, do
 * pedido à entrega) e remarketing (quem esfriou). Depois disso eles vivem no
 * estado do ateliê (`useFunnels()` em `features/settings/store`) e são
 * editados em Configurações > Funis e etapas. EXEMPLOS até existir o back-end.
 */
export const defaultFunnels: readonly Funnel[] = [
  {
    id: "vendas",
    name: "Vendas",
    icon: HandCoinsIcon,
    tone: "green",
    stages: [
      { id: "novo", label: "Novo lead", tone: "blue" },
      { id: "contato", label: "Em contato", tone: "lavender" },
      { id: "orcamento", label: "Orçamento", tone: "peach" },
      { id: "negociacao", label: "Negociação", tone: "rose" },
      { id: "fechado", label: "Fechado", tone: "green" },
    ],
  },
  {
    id: "clientes",
    name: "Clientes",
    icon: DressIcon,
    tone: "rose",
    stages: [
      { id: "confirmado", label: "Pedido confirmado", tone: "blue" },
      { id: "provas", label: "Em provas", tone: "lavender" },
      { id: "ajustes", label: "Ajustes", tone: "peach" },
      { id: "pronto", label: "Pronto para retirar", tone: "teal" },
      { id: "entregue", label: "Entregue", tone: "green" },
    ],
  },
  {
    id: "remarketing",
    name: "Remarketing",
    icon: ArrowsClockwiseIcon,
    tone: "lavender",
    stages: [
      { id: "reativar", label: "Para reativar", tone: "neutral" },
      { id: "contato", label: "Contato feito", tone: "lavender" },
      { id: "interesse", label: "Com interesse", tone: "peach" },
      { id: "recuperado", label: "Recuperado", tone: "green" },
    ],
  },
];

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
