import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { type Workspace } from "@shared/schema";

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  onWorkspaceChange: (workspace: Workspace) => void;
  onCreateWorkspace: (name: string) => void;
}

export function WorkspaceSwitcher({
  workspaces,
  currentWorkspace,
  onWorkspaceChange,
  onCreateWorkspace,
}: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

  const handleCreate = () => {
    if (newWorkspaceName.trim()) {
      onCreateWorkspace(newWorkspaceName);
      setNewWorkspaceName("");
      setShowCreateDialog(false);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between px-3 h-12 hover-elevate active-elevate-2"
            data-testid="button-workspace-switcher"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Avatar className="w-8 h-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-primary text-primary-foreground font-semibold">
                  {currentWorkspace?.name.charAt(0).toUpperCase() || "W"}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-base truncate">
                {currentWorkspace?.name || "Seleziona workspace"}
              </span>
            </div>
            <ChevronsUpDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="space-y-1">
            {workspaces.map((workspace) => (
              <Button
                key={workspace.id}
                variant="ghost"
                className="w-full justify-start gap-2 hover-elevate active-elevate-2"
                onClick={() => {
                  onWorkspaceChange(workspace);
                  setOpen(false);
                }}
                data-testid={`workspace-item-${workspace.id}`}
              >
                <Avatar className="w-7 h-7 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold text-sm">
                    {workspace.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate text-left">{workspace.name}</span>
                {currentWorkspace?.id === workspace.id && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </Button>
            ))}
            <div className="border-t border-border my-1" />
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 hover-elevate active-elevate-2"
              onClick={() => {
                setShowCreateDialog(true);
                setOpen(false);
              }}
              data-testid="button-create-workspace"
            >
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
              <span>Crea workspace</span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent data-testid="dialog-create-workspace">
          <DialogHeader>
            <DialogTitle>Crea nuovo workspace</DialogTitle>
            <DialogDescription>
              Crea un nuovo spazio di lavoro per il tuo team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Nome workspace</Label>
              <Input
                id="workspace-name"
                placeholder="Il mio team"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                data-testid="input-workspace-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              data-testid="button-cancel-workspace"
            >
              Annulla
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newWorkspaceName.trim()}
              data-testid="button-submit-workspace"
            >
              Crea workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
