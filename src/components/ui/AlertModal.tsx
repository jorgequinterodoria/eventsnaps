import React from 'react';
import { AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertModalProps {
  isOpen: boolean;
  type: 'alert' | 'confirm';
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function AlertModal({ isOpen, type, title, message, onConfirm, onCancel }: AlertModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity" 
        onClick={type === 'alert' ? onCancel : undefined}
      />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        <div className="p-6">
          <div className="flex items-start mb-4 relative text-center flex-col">
             <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 mb-4">
                {type === 'confirm' ? (
                  <AlertCircle className="h-6 w-6 text-blue-600" aria-hidden="true" />
                ) : (
                  <Info className="h-6 w-6 text-blue-600" aria-hidden="true" />
                )}
             </div>
             <h3 className="text-lg font-medium leading-6 text-gray-900 mx-auto" id="modal-title">
               {title}
             </h3>
             {type === 'alert' && (
                <button 
                  onClick={onCancel} 
                  className="absolute top-0 right-0 -m-2 p-2 text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
             )}
          </div>
          <p className="text-sm text-gray-500 text-center">{message}</p>
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
          <button
            type="button"
            className={cn(
               "inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto",
               type === 'confirm' ? "bg-red-600 hover:bg-red-500" : "bg-blue-600 hover:bg-blue-500",
               "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            )}
            onClick={onConfirm}
          >
            {type === 'confirm' ? 'Sí, continuar' : 'Entendido'}
          </button>
          {type === 'confirm' && (
            <button
              type="button"
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
              onClick={onCancel}
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
