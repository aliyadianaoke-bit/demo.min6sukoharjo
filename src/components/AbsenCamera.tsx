import React, { useRef, useState } from 'react';
import { Camera, Upload, Check, RefreshCw, AlertCircle } from 'lucide-react';

interface AbsenCameraProps {
  onCapture: (base64Image: string) => void;
  onCancel: () => void;
}

export default function AbsenCamera({ onCapture, onCancel }: AbsenCameraProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate if it is actually an image
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Berkas yang dipilih harus berupa gambar.');
      return;
    }

    setErrorMessage('');
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onloadend = () => {
      setCapturedImage(reader.result as string);
      setIsProcessing(false);
    };
    reader.onerror = () => {
      setErrorMessage('Gagal memuat gambar, silakan coba lagi.');
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const triggerCameraInput = () => {
    if (fileInputRef.current) {
      // Clear the previous value to allow selecting the same photo/retaking
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    triggerCameraInput();
  };

  return (
    <div className="flex flex-col items-center space-y-4 w-full max-w-sm">
      {/* Hidden File Input configured to trigger native mobile front camera directly */}
      <input 
        type="file" 
        ref={fileInputRef}
        accept="image/*" 
        capture="user" 
        onChange={handleFileChange} 
        className="hidden" 
      />

      {/* Viewport Card Container */}
      <div 
        onClick={!capturedImage && !isProcessing ? triggerCameraInput : undefined}
        className={`relative w-full aspect-square bg-slate-950 rounded-3xl overflow-hidden border-2 border-slate-200/80 shadow-inner flex flex-col items-center justify-center transition duration-200 ${
          !capturedImage && !isProcessing ? 'cursor-pointer hover:border-emerald-500 hover:bg-slate-900 group' : ''
        }`}
      >
        {isProcessing ? (
          <div className="text-center text-slate-400 p-4 space-y-2">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
            <p className="text-xs font-bold text-slate-300">Memproses Foto...</p>
          </div>
        ) : capturedImage ? (
          <img 
            src={capturedImage} 
            alt="Pratinjau Foto Selfie" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="text-center p-6 space-y-3.5 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 group-hover:bg-emerald-500/20 transition duration-300">
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-200 group-hover:text-emerald-400 transition">Ambil Foto Selfie Sekarang</p>
              <p className="text-[10px] text-slate-500 max-w-[220px] mx-auto mt-1 leading-relaxed">
                Ketuk di sini untuk membuka kamera selfie HP Anda secara langsung dan aman.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white text-[11px] font-extrabold rounded-xl transition shadow-xs">
              <Camera className="w-3.5 h-3.5" />
              <span>Buka Kamera HP</span>
            </span>
          </div>
        )}

        {/* Floating helper text for captured image */}
        {capturedImage && (
          <div className="absolute bottom-3 left-3 bg-black/65 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] text-white font-bold pointer-events-none">
            Pratinjau Hasil Selfie
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="flex items-center gap-1.5 text-[10px] text-rose-600 font-bold bg-rose-50 px-3.5 py-2 rounded-xl border border-rose-100 w-full">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Control Buttons below viewport */}
      <div className="flex items-center justify-center gap-3 w-full">
        {capturedImage ? (
          <div className="flex gap-2.5 w-full">
            <button
              type="button"
              onClick={handleRetake}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl border border-slate-200 transition cursor-pointer"
            >
              Ambil Ulang
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-md shadow-emerald-600/20"
            >
              <Check className="w-4 h-4" />
              <span>Gunakan Foto</span>
            </button>
          </div>
        ) : (
          <div className="flex gap-2.5 w-full">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-black rounded-xl border border-slate-200 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={triggerCameraInput}
              className="flex-2 inline-flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-md shadow-emerald-600/15"
            >
              <Camera className="w-4 h-4" />
              <span>Ambil Foto Selfie</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
