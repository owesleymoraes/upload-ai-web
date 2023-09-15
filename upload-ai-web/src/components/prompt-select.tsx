import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { api } from "@/lib/axios";

interface PromptProps {
  onPromptSelected: (template: string) => void;
}

type Prompt = {
  id: string;
  title: string;
  template: string;
};

export function PromptSelect(props: PromptProps) {
  const [prompts, setPrompts] = useState<Prompt[] | null>(null);

  function handlePromptSelected(promptId: string) {
    const selectPrompt = prompts?.find((prompt) => prompt.id === promptId);
    if (!selectPrompt) {
      return;
    }
    props.onPromptSelected(selectPrompt.template);
  }

  useEffect(() => {
    api.get("/prompts").then((response) => {
      setPrompts(response.data);
    });
  }, []);

  return (
    <Select onValueChange={handlePromptSelected}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione um prompt..." />
      </SelectTrigger>
      <SelectContent>
        {prompts?.map((item, key) => {
          return (
            <SelectItem value={item.id} key={key}>
              {item.title}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
