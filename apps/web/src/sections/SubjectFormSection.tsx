import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { Button } from "@self-study/ui/Button";
import { ErrorState } from "@self-study/ui/ErrorState";
import { Input } from "@self-study/ui/Input";
import { Loader } from "@self-study/ui/Loader";
import { Textarea } from "@self-study/ui/Textarea";
import { useToast } from "@self-study/ui/useToast";

import { SubjectLearningPanel } from "@/components/SubjectLearningPanel";
import { createSubject, getSubject, updateSubject } from "@/lib/api-client";

export interface SubjectFormSectionProps {
  mode: "create" | "edit";
}

export function SubjectFormSection({ mode }: SubjectFormSectionProps) {
  const router = useRouter();
  const { push } = useToast();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"ready" | "loading" | "error">(mode === "edit" ? "loading" : "ready");

  useEffect(() => {
    if (mode !== "edit" || !id) return;
    let live = true;
    getSubject(id)
      .then((row) => {
        if (!live) return;
        setName(row.name);
        setDescription(row.description ?? "");
        setStatus("ready");
      })
      .catch(() => {
        if (live) setStatus("error");
      });
    return () => {
      live = false;
    };
  }, [mode, id]);

  async function submit() {
    const input = { name, description: description.trim() === "" ? null : description };
    try {
      if (mode === "create") await createSubject(input);
      else await updateSubject(id, input);
      await router.push("/subjects/");
    } catch {
      push("Could not save subject", "error");
    }
  }

  if (status === "loading") return <Loader label="Loading subject" />;
  if (status === "error") {
    return <ErrorState title="Subject unavailable" message="That subject could not be loaded." />;
  }

  return (
    <section className="flex max-w-xl flex-col gap-md">
      <h1 className="font-heading text-3xl font-semibold">{mode === "create" ? "New subject" : "Edit subject"}</h1>
      <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} data-testid="subject-name" />
      <Textarea
        label="Description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        data-testid="subject-description"
      />
      <Button onClick={submit} data-testid="subject-submit">
        Save
      </Button>
      {mode === "edit" && id ? <SubjectLearningPanel subjectId={id} /> : null}
    </section>
  );
}
