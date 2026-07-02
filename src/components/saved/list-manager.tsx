"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  createReadingList,
  deleteReadingList,
  renameReadingList,
} from "@/lib/actions/engagement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ListManager({
  lists,
  activeListId,
}: {
  lists: Array<{ id: string; name: string }>;
  activeListId: string | null;
}) {
  const router = useRouter();
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const activeList = lists.find((l) => l.id === activeListId);

  return (
    <div className="space-y-2">
      {creating ? (
        <form
          className="flex gap-1.5"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            await createReadingList(name);
            setPending(false);
            setName("");
            setCreating(false);
            router.refresh();
          }}
        >
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="List name…"
            className="h-8 text-sm"
            required
            maxLength={50}
          />
          <Button type="submit" size="sm" variant="accent" disabled={pending}>
            Add
          </Button>
        </form>
      ) : (
        <Button variant="outline" size="sm" className="w-full" onClick={() => setCreating(true)}>
          <Plus />
          New reading list
        </Button>
      )}

      {activeList && (
        <div className="flex gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            disabled={pending}
            onClick={async () => {
              const newName = window.prompt("Rename list:", activeList.name);
              if (!newName) return;
              setPending(true);
              await renameReadingList(activeList.id, newName);
              setPending(false);
              router.refresh();
            }}
          >
            <Pencil />
            Rename
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-destructive"
            disabled={pending}
            onClick={async () => {
              if (!window.confirm(`Delete "${activeList.name}"? Saved articles stay in All saved.`)) return;
              setPending(true);
              await deleteReadingList(activeList.id);
              setPending(false);
              router.push("/saved");
              router.refresh();
            }}
          >
            <Trash2 />
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}
