import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(', ');

interface ModalProps {
    /** Controls visibility and triggers enter/exit animation */
    open: boolean;
    /** Called on backdrop click or Escape key */
    onClose: () => void;
    /** id of the heading element inside the modal (for aria-labelledby) */
    labelId: string;
    children: React.ReactNode;
    /** Extra Tailwind classes for the white content box, e.g. "max-w-md" */
    className?: string;
    /** Tailwind z-index class, defaults to "z-50" */
    zIndex?: string;
}

/**
 * Accessible modal shell.
 *
 * Provides:
 * - role="dialog" + aria-modal + aria-labelledby
 * - Focus trap (Tab / Shift+Tab cycle within modal)
 * - Auto-focus first focusable element on open
 * - Escape key to close
 * - Body scroll lock while open
 * - Focus restoration to trigger element on close
 */
const Modal = ({
    open,
    onClose,
    labelId,
    children,
    className = '',
    zIndex = 'z-50',
}: ModalProps) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<Element | null>(null);

    // Lock body scroll and save the trigger element when opening
    useEffect(() => {
        if (open) {
            triggerRef.current = document.activeElement;
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            if (triggerRef.current instanceof HTMLElement) {
                triggerRef.current.focus();
            }
            triggerRef.current = null;
        }
    }, [open]);

    // Auto-focus first focusable element on open (after animation starts)
    useEffect(() => {
        if (!open) return;
        const id = setTimeout(() => {
            const el = contentRef.current?.querySelector<HTMLElement>(FOCUSABLE);
            el?.focus();
        }, 50);
        return () => clearTimeout(id);
    }, [open]);

    // Escape to close
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    // Focus trap: Tab / Shift+Tab cycle through focusable elements in the modal
    const trapFocus = (e: React.KeyboardEvent) => {
        if (e.key !== 'Tab' || !contentRef.current) return;
        const focusable = Array.from(
            contentRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`fixed inset-0 bg-black/40 backdrop-blur-sm ${zIndex} flex items-center justify-center p-4`}
                    onClick={onClose}
                    // Backdrop is presentation-only; the dialog role is on the content div
                    aria-hidden="true"
                >
                    <motion.div
                        ref={contentRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={labelId}
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        onClick={e => e.stopPropagation()}
                        onKeyDown={trapFocus}
                        // Must NOT be aria-hidden since this IS the dialog
                        aria-hidden="false"
                        className={`bg-white rounded-2xl shadow-2xl w-full overflow-hidden ${className}`}
                    >
                        {children}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Modal;
