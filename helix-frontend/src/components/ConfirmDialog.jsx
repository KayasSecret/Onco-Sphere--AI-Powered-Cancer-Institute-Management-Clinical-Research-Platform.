import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'

/**
 * <ConfirmDialog open={isOpen} onOpenChange={setOpen} onConfirm={handleDelete} title="Delete Record?" description="This action is irreversible." />
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title = 'Are you sure?',
  description = 'This action cannot be undone. Please confirm.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-surface-card">
        <DialogHeader>
          <DialogTitle className="text-ink-primary font-bold text-lg">
            {title}
          </DialogTitle>
          <DialogDescription className="text-ink-secondary text-sm pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            className="border-surface-border text-ink-primary hover:bg-surface-hover"
            onClick={() => onOpenChange(false)}
          >
            {cancelText}
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'default'}
            className={
              isDestructive
                ? 'bg-status-critical hover:bg-status-critical/90 text-ink-inverse'
                : 'bg-brand-blue hover:bg-brand-blue-dark text-ink-inverse'
            }
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
