import { Label } from '@/components/ui/label'
import { useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'
import { Monitor, Moon, Sun } from 'lucide-react'

export function AppearanceTab() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="max-w-3xl space-y-4">
      <div className="space-y-3 rounded-lg border p-4">
        <div>
          <Label className="text-sm font-medium">Theme</Label>
          <p className="text-muted-foreground mt-1 text-xs">
            Choose how Talon looks. "System" follows your OS setting.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { value: 'system', label: 'System', icon: Monitor },
              { value: 'light', label: 'Light', icon: Sun },
              { value: 'dark', label: 'Dark', icon: Moon }
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-sm transition-colors',
                theme === value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted/50'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
