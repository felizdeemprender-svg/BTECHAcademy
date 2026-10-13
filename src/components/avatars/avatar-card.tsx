"use client";

import * as React from "react";
import { Avatar, findVoiceById } from "@/domain/avatars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Edit, Mic, Play, Square, Trash2, Volume2 } from "lucide-react";

export interface AvatarCardProps {
  avatar: Avatar;
  onEdit?: (avatar: Avatar) => void;
  onDelete?: (avatar: Avatar) => void;
  onSelect?: (avatar: Avatar) => void;
  isSelected?: boolean;
}

export function AvatarCard({
  avatar,
  onEdit,
  onDelete,
  onSelect,
  isSelected,
}: AvatarCardProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const voice = findVoiceById(avatar.voiceId);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
      return;
    }

    if (!voice) return;

    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }

      setIsPlaying(true);
      const previewUrl = `/api/tts/preview?voiceId=${encodeURIComponent(voice.id)}&text=${encodeURIComponent(voice.sampleText)}`;
      const audio = new Audio(previewUrl);
      audioRef.current = audio;

      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsPlaying(false);
      };

      audio.play().catch(() => {
        setIsPlaying(false);
      });
    } catch {
      setIsPlaying(false);
    }
  };

  return (
    <div
      onClick={() => onSelect?.(avatar)}
      className={`relative group rounded-lg border p-4 bg-card transition-all ${
        isSelected
          ? "border-primary ring-2 ring-primary/20 bg-primary/5"
          : "border-border hover:border-border/80 hover:bg-muted/10"
      } ${onSelect ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start gap-3.5">
        {/* Avatar Image */}
        <div className="relative flex-shrink-0">
          <img
            src={avatar.imageUrl || "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&auto=format&fit=crop&q=80"}
            alt={avatar.name}
            className="w-16 h-16 rounded-md object-cover border border-border"
          />
          {avatar.isDefault && (
            <Badge
              variant="default"
              className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0 h-4 bg-primary text-primary-foreground font-semibold"
            >
              Principal
            </Badge>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-sm text-foreground truncate">
              {avatar.name}
            </h4>
          </div>

          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {avatar.role || "Mentor / Presentador"}
          </p>

          {/* Voice pill */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {avatar.voiceProvider === "cloned" ? (
              <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0.5 font-normal">
                <Mic className="h-2.5 w-2.5 text-primary" />
                Voz Real (Clonada)
              </Badge>
            ) : voice ? (
              <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0.5 font-normal">
                <span>{voice.flag}</span>
                <span>{voice.name} ({voice.accentName})</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] font-normal">
                {avatar.voiceId}
              </Badge>
            )}

            {voice && (
              <button
                type="button"
                onClick={handleTogglePlay}
                className="text-[11px] text-primary hover:underline flex items-center gap-0.5 ml-1 font-medium"
              >
                {isPlaying ? (
                  <>
                    <Square className="h-3 w-3 fill-current text-destructive" />
                    <span className="text-destructive">Parar</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 fill-current" />
                    <span>Oír</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Acciones */}
      {(onEdit || onDelete) && (
        <div className="flex items-center justify-end gap-1 mt-3 pt-2.5 border-t border-border">
          {onEdit && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(avatar);
              }}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Edit className="h-3.5 w-3.5 mr-1" />
              Editar
            </Button>
          )}

          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(avatar);
              }}
              className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Eliminar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
