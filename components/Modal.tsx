import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

interface ModalProps {
  show: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ show, onClose, children }) => {
  const [mounted, setMounted] = useState(false);

  // Mount the component on the client side only to avoid hydration errors
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // If not supposed to show or not mounted yet, return null
  if (!mounted || !show) return null;

  // Use React Portal to render modal at the end of the document
  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70"
      onClick={onClose} // clicking backdrop closes modal
    >
      <div 
        className="w-full max-w-lg bg-gray-900 p-6 rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()} // prevent closing if clicking inside modal
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Modal; 