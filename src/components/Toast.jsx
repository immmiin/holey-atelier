import { AnimatePresence, motion } from 'motion/react';
import { useCart } from '../context/CartContext.jsx';

export default function Toast() {
  const { toast } = useCart();
  return (
    <div aria-live="polite" role="status">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className="toast"
            initial={{ opacity: 0, y: 30, rotate: -3 }}
            animate={{ opacity: 1, y: 0, rotate: [0, -3, 3, -2, 0] }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.45 }}
          >
            <img src="/logo/holey_03_nail-icon-H.svg" alt="" width="26" height="30" />
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
