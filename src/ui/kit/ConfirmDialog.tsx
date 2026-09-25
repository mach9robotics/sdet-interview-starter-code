import { Button, Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { t } from "../../i18n/strings";

interface Props {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly isOpen: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

const button =
  "rounded-md px-3 py-1 text-sm outline-none data-[focus-visible]:ring-1 data-[focus-visible]:ring-line-focus";

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  isOpen,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => !open && onCancel()}
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <Modal className="w-80 rounded-lg bg-panel p-4 shadow-elevation-300 outline-none">
        <Dialog role="alertdialog" className="outline-none">
          <Heading slot="title" className="text-md font-semibold text-fg">
            {title}
          </Heading>
          <p className="mt-1 text-sm text-fg-muted">{message}</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button onPress={onCancel} className={`${button} text-fg data-[hovered]:bg-hover`}>
              {t("dialog.cancel")}
            </Button>
            <Button
              autoFocus
              onPress={onConfirm}
              className={`${button} bg-danger text-fg-on-brand data-[hovered]:brightness-110`}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
