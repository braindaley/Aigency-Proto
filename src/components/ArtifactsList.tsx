'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, FileText } from 'lucide-react';

interface Artifact {
  id: string;
  title: string;
  content: string;
}

interface ArtifactsListProps {
  artifacts: Artifact[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

export function ArtifactsList({ artifacts, currentIndex, onSelect }: ArtifactsListProps) {
  if (artifacts.length <= 1) {
    return null;
  }

  return (
    <Card className="mb-4 p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">
          Generated Documents ({artifacts.length})
        </h3>
      </div>
      <div className="space-y-2">
        {artifacts.map((artifact, index) => (
          <button
            key={artifact.id}
            onClick={() => onSelect(index)}
            className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
              index === currentIndex
                ? 'border-primary bg-primary/5 text-foreground'
                : 'border-border hover:border-primary/50 hover:bg-accent'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {artifact.title}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {Math.round(artifact.content.length / 1000)}k characters
                </div>
              </div>
              {index === currentIndex && (
                <Badge variant="default" className="ml-2 text-xs">
                  Viewing
                </Badge>
              )}
              {index !== currentIndex && (
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-2" />
              )}
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
