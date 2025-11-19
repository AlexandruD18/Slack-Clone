import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";
import { PresenceIndicator } from "./presence-indicator";
import { type User } from "@shared/schema";
import { useState } from "react";

interface UserProfilePanelProps {
  user: User;
  isCurrentUser: boolean;
  isOnline: boolean;
  onClose: () => void;
  onUpdateProfile?: (data: { name: string; customStatus?: string }) => void;
}

export function UserProfilePanel({
  user,
  isCurrentUser,
  isOnline,
  onClose,
  onUpdateProfile,
}: UserProfilePanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [customStatus, setCustomStatus] = useState(user.customStatus || "");

  const handleSave = () => {
    if (onUpdateProfile) {
      onUpdateProfile({ name, customStatus: customStatus || undefined });
      setIsEditing(false);
    }
  };

  return (
    <div className="w-80 border-l bg-background flex flex-col h-full" data-testid="panel-user-profile">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Profilo</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          data-testid="button-close-profile"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <Avatar className="w-24 h-24 rounded-lg">
              <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-3xl font-bold">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <PresenceIndicator
              status={isOnline ? "online" : "offline"}
              size="lg"
            />
          </div>
          <h3 className="text-xl font-bold mt-4" data-testid="text-profile-name">
            {user.name}
          </h3>
          <p className="text-sm text-muted-foreground" data-testid="text-profile-email">
            {user.email}
          </p>
        </div>

        <Separator />

        {isCurrentUser && isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome visualizzato</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-edit-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Stato personalizzato</Label>
              <Input
                id="edit-status"
                placeholder="Cosa stai facendo?"
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                data-testid="input-edit-status"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1" data-testid="button-save-profile">
                Salva
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setName(user.name);
                  setCustomStatus(user.customStatus || "");
                }}
                className="flex-1"
                data-testid="button-cancel-edit"
              >
                Annulla
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Stato</Label>
              <p className="text-sm mt-1" data-testid="text-user-status">
                {user.customStatus || "Nessuno stato impostato"}
              </p>
            </div>
            {isCurrentUser && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsEditing(true)}
                data-testid="button-edit-profile"
              >
                Modifica profilo
              </Button>
            )}
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Informazioni</Label>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stato connessione:</span>
              <span className="font-medium" data-testid="text-connection-status">
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
