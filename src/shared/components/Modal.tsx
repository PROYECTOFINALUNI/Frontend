import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

/** Diálogo basado en `<dialog>`, con gestión del foco, cierre con Escape y bloqueo de la interacción con el contenido del fondo.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Se ejecuta también al cerrar con Escape, manteniendo sincronizado el estado de React.
    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg p-0 shadow-xl backdrop:bg-slate-900/40"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 id={titleId} className="text-base font-semibold text-slate-900">
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className="mt-0.5 text-sm text-slate-600">
            {description}
          </p>
        )}
      </div>

      {children && <div className="px-4 py-4">{children}</div>}

      {footer && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
          {footer}
        </div>
      )}
    </dialog>
  );
}
