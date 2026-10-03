"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styled from "@emotion/styled";
import { CaretDownIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { GroupLabel, Surface } from "@/components/ui/Popover/styles";
import {
  usePopover,
  type PopoverAlign,
  type PopoverTriggerProps,
} from "@/components/ui/Popover/usePopover";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { transientOptions } from "@/lib/emotion/transient";

type DatePickerProps = {
  /** Data selecionada (AAAA-MM-DD). */
  value: string | undefined;
  onChange: (value: string) => void;
  /** Nome do campo (acessibilidade e título do calendário). */
  label: string;
  align?: PopoverAlign;
  trigger: (props: PopoverTriggerProps & { open: boolean }) => ReactNode;
};

type View = "days" | "months" | "years";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const CELL = "2.25rem";

/* ---------- Datas ---------- */

const pad = (value: number) => String(value).padStart(2, "0");
const toKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const fromKey = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};
const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
/** Mesmo dia em outro mês (31/jan + 1 mês → 28/fev). */
const addMonths = (date: Date, months: number) => {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay));
};

/** 6 semanas a partir do domingo antes do dia 1: a grade não muda de altura. */
function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

/* ---------- Estilos ---------- */

const Calendar = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
  padding: ${({ theme }) => theme.spacing(1.5)};
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(2)};
`;

const HeadGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing(1.5)};
`;

/** "Setembro ⌄" / "2026 ⌄": troca a grade por meses ou anos. */
const PeriodButton = styled("button", transientOptions)<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1.5)};
  height: 2rem;
  padding: ${({ theme }) => theme.spacing(0, 2.5)};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme, $active }) =>
    $active ? theme.colors.interactive.pressed : theme.colors.interactive.hover};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme }) => theme.colors.interactive.pressed};
  }

  svg {
    color: ${({ theme }) => theme.colors.text.muted};
    transform: rotate(${({ $active }) => ($active ? "180deg" : "0deg")});
    transition: transform ${({ theme }) => theme.transitions.fast};
  }
`;

const Arrow = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme }) => theme.colors.interactive.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const Grid = styled("div", transientOptions)<{ $columns: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $columns }) => $columns}, 1fr);
  gap: 2px;
  width: calc(${CELL} * 7 + 12px);
`;

const Weekday = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 1.75rem;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Cell = styled("button", transientOptions)<{
  $selected: boolean;
  $today: boolean;
  $outside: boolean;
  $tall?: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: ${({ $tall }) => ($tall ? "2.75rem" : CELL)};
  border: 1px solid
    ${({ theme, $today, $selected }) => ($today && !$selected ? theme.colors.border.strong : "transparent")};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme, $selected }) => ($selected ? theme.colors.text.primary : "transparent")};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme, $selected, $today }) =>
    $selected || $today ? theme.fontWeights.semibold : theme.fontWeights.regular};
  color: ${({ theme, $selected, $outside }) =>
    $selected ? theme.palette.neutral[0] : $outside ? theme.palette.neutral[400] : theme.colors.text.primary};
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme, $selected }) =>
      $selected ? theme.colors.text.primary : theme.colors.interactive.hover};
  }
`;

/* ---------- Componente ---------- */

/** Calendário em dropdown: mês e ano clicáveis, setas para navegar, teclado completo. */
export function DatePicker({ value, onChange, label, align = "start", trigger }: DatePickerProps) {
  const popover = usePopover({ side: "bottom", align, offset: 8, role: "dialog" });
  const { open, position, contentRef, close } = popover;
  const gridRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const todayKey = toKey(today);
  const [view, setView] = useState<View>("days");
  /** Dia com o foco do teclado; também define o mês exibido. */
  const [cursor, setCursor] = useState(() => (value ? fromKey(value) : today));

  // Ao abrir: volta para a grade de dias, no mês da data escolhida (ou de hoje).
  useEffect(() => {
    if (!open) return;
    setView("days");
    setCursor(value ? fromKey(value) : new Date());
  }, [open, value]);

  // Foco acompanha o dia do cursor.
  const ready = open && position !== null;
  const cursorKey = toKey(cursor);
  useEffect(() => {
    if (!ready || view !== "days") return;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${cursorKey}"]`)?.focus();
  }, [ready, view, cursorKey]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const yearStart = year - (year % 12);

  const choose = (date: Date) => {
    onChange(toKey(date));
    close(true);
  };

  const step = (direction: 1 | -1) => {
    if (view === "days") setCursor((current) => addMonths(current, direction));
    if (view === "months") setCursor((current) => addMonths(current, direction * 12));
    if (view === "years") setCursor((current) => addMonths(current, direction * 144));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (view !== "days") setView("days");
      else close(true);
      return;
    }
    if (view !== "days" || !(event.target as HTMLElement).dataset.day) return;

    const moves: Record<string, (date: Date) => Date> = {
      ArrowLeft: (date) => addDays(date, -1),
      ArrowRight: (date) => addDays(date, 1),
      ArrowUp: (date) => addDays(date, -7),
      ArrowDown: (date) => addDays(date, 7),
      Home: (date) => addDays(date, -date.getDay()),
      End: (date) => addDays(date, 6 - date.getDay()),
      PageUp: (date) => addMonths(date, -1),
      PageDown: (date) => addMonths(date, 1),
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      setCursor(move);
    }
  };

  const periodLabel =
    view === "years" ? `${yearStart} a ${yearStart + 11}` : view === "months" ? String(year) : MONTHS[month];

  return (
    <>
      {trigger({ ...popover.triggerProps, open })}
      {open &&
        createPortal(
          <Surface
            ref={contentRef}
            id={popover.contentId}
            role="dialog"
            aria-label={label}
            $side={position?.side ?? "bottom"}
            $width="auto"
            $ready={position !== null}
            style={position ? { top: position.top, left: position.left } : { top: 0, left: 0 }}
            onKeyDown={handleKeyDown}
          >
            <GroupLabel>{label}</GroupLabel>
            <Calendar>
              <Head>
                <HeadGroup>
                  <PeriodButton
                    type="button"
                    $active={view === "months"}
                    aria-expanded={view === "months"}
                    onClick={() => setView(view === "months" ? "days" : "months")}
                  >
                    {MONTHS[month]}
                    <CaretDownIcon size={12} weight="bold" aria-hidden />
                  </PeriodButton>
                  <PeriodButton
                    type="button"
                    $active={view === "years"}
                    aria-expanded={view === "years"}
                    onClick={() => setView(view === "years" ? "days" : "years")}
                  >
                    {year}
                    <CaretDownIcon size={12} weight="bold" aria-hidden />
                  </PeriodButton>
                </HeadGroup>
                <HeadGroup>
                  <Arrow type="button" aria-label="Anterior" onClick={() => step(-1)}>
                    <CaretLeftIcon size={16} aria-hidden />
                  </Arrow>
                  <Arrow type="button" aria-label="Próximo" onClick={() => step(1)}>
                    <CaretRightIcon size={16} aria-hidden />
                  </Arrow>
                </HeadGroup>
              </Head>

              <VisuallyHidden aria-live="polite">{periodLabel}</VisuallyHidden>

              {view === "days" && (
                <Grid ref={gridRef} $columns={7} role="group" aria-label={`${MONTHS[month]} de ${year}`}>
                  {WEEKDAYS.map((weekday) => (
                    <Weekday key={weekday} aria-hidden>
                      {weekday}
                    </Weekday>
                  ))}
                  {monthGrid(year, month).map((date) => {
                    const key = toKey(date);
                    const selected = key === value;
                    return (
                      <Cell
                        key={key}
                        type="button"
                        data-day={key}
                        tabIndex={key === cursorKey ? 0 : -1}
                        $selected={selected}
                        $today={key === todayKey}
                        $outside={date.getMonth() !== month}
                        aria-pressed={selected}
                        aria-label={date.toLocaleDateString("pt-BR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                        onClick={() => choose(date)}
                      >
                        {date.getDate()}
                      </Cell>
                    );
                  })}
                </Grid>
              )}

              {view === "months" && (
                <Grid $columns={3}>
                  {MONTHS.map((name, index) => (
                    <Cell
                      key={name}
                      type="button"
                      $tall
                      $selected={index === month}
                      $today={index === today.getMonth() && year === today.getFullYear()}
                      $outside={false}
                      onClick={() => {
                        setCursor((current) => addMonths(current, index - current.getMonth()));
                        setView("days");
                      }}
                    >
                      {name.slice(0, 3)}
                    </Cell>
                  ))}
                </Grid>
              )}

              {view === "years" && (
                <Grid $columns={3}>
                  {Array.from({ length: 12 }, (_, index) => yearStart + index).map((option) => (
                    <Cell
                      key={option}
                      type="button"
                      $tall
                      $selected={option === year}
                      $today={option === today.getFullYear()}
                      $outside={false}
                      onClick={() => {
                        setCursor((current) => addMonths(current, (option - current.getFullYear()) * 12));
                        setView("months");
                      }}
                    >
                      {option}
                    </Cell>
                  ))}
                </Grid>
              )}
            </Calendar>
          </Surface>,
          document.body,
        )}
    </>
  );
}
