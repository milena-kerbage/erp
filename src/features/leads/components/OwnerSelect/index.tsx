"use client";

import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Select, type SelectTriggerProps } from "@/components/ui/Select";
import { useTeam } from "@/features/settings/store";
import type { Member } from "@/features/settings/types";
import type { Person } from "../../types";

type OwnerSelectProps = {
  value: Person;
  onChange: (member: Member) => void;
  align?: "start" | "end";
  trigger: (props: SelectTriggerProps) => ReactNode;
};

/** Troca de responsável ("Quem responde"), com avatar e função de cada pessoa da equipe. */
export function OwnerSelect({ value, onChange, align = "start", trigger }: OwnerSelectProps) {
  const team = useTeam();
  return (
    <Select
      label="Responsável"
      heading="Quem responde"
      align={align}
      width="15.5rem"
      value={value.seed}
      onChange={(seed) => {
        const member = team.find((item) => item.seed === seed);
        if (member && member.seed !== value.seed) onChange(member);
      }}
      options={team.map((member) => ({
        value: member.seed,
        label: member.name,
        meta: member.role,
        leading: (
          <Avatar name={member.name} seed={member.seed} src={member.avatarUrl} size="xs" shape="circle" />
        ),
      }))}
      trigger={trigger}
    />
  );
}
