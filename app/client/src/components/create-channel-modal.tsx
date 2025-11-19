import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Hash, Lock } from "lucide-react";

interface CreateChannelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateChannel: (data: { name: string; description?: string; isPrivate: boolean }) => void;
}

export function CreateChannelModal({
  open,
  onOpenChange,
  onCreateChannel,
}: CreateChannelModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const handleCreate = () => {
    if (name.trim()) {
      onCreateChannel({
        name: name.trim(),
        description: description.trim() || undefined,
        isPrivate,
      });
      setName("");
      setDescription("");
      setIsPrivate(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="dialog-create-channel">
        <DialogHeader>
          <DialogTitle>Crea un canale</DialogTitle>
          <DialogDescription>
            I canali sono dove il tuo team comunica. È meglio crearli per argomento.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="channel-name">Nome</Label>
            <Input
              id="channel-name"
              placeholder="es. marketing"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              data-testid="input-channel-name"
            />
            <p className="text-xs text-muted-foreground">
              I nomi dei canali devono essere in minuscolo, senza spazi o punti.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="channel-description">Descrizione (opzionale)</Label>
            <Textarea
              id="channel-description"
              placeholder="A cosa serve questo canale?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              data-testid="input-channel-description"
            />
          </div>
          <div className="space-y-3">
            <Label>Visibilità</Label>
            <RadioGroup
              value={isPrivate ? "private" : "public"}
              onValueChange={(value) => setIsPrivate(value === "private")}
            >
              <div className="flex items-start space-x-3 p-3 rounded-md border hover-elevate">
                <RadioGroupItem value="public" id="public" data-testid="radio-public" />
                <div className="flex-1">
                  <label
                    htmlFor="public"
                    className="flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <Hash className="w-4 h-4" />
                    Pubblico
                  </label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tutti nel workspace possono vedere e partecipare
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 rounded-md border hover-elevate">
                <RadioGroupItem value="private" id="private" data-testid="radio-private" />
                <div className="flex-1">
                  <label
                    htmlFor="private"
                    className="flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    Privato
                  </label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Solo le persone specifiche possono vedere e partecipare
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-channel"
          >
            Annulla
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim()}
            data-testid="button-submit-channel"
          >
            Crea canale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
