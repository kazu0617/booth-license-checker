import { useCallback, useState, type DragEvent } from 'react';
import { FileUp } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Props {
  onFile(file: File): void;
  disabled?: boolean;
}

export function PdfDropzone({ onFile, disabled }: Props) {
  const [over, setOver] = useState(false);

  const onDrop = useCallback(
    (e: DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      setOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) onFile(file);
    },
    [disabled, onFile],
  );

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        'block cursor-pointer rounded-lg border-2 border-dashed border-soft px-6 py-10 text-center transition-colors',
        over && 'border-accent/60 bg-accent/5',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <input
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
      <FileUp size={28} className="mx-auto mb-3 text-faint" />
      <div className="text-sm font-medium">PDF をここにドロップ</div>
      <div className="mt-1 text-xs text-muted">またはクリックしてファイルを選択</div>
    </label>
  );
}
