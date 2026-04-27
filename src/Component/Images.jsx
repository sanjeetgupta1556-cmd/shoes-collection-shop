 import React, { useState, useRef, useEffect, useCallback } from "react";
import imageCompression from "browser-image-compression";

const ImageCompressor = () => {
  // State declarations
  const [targetKB, setTargetKB] = useState(50);
  const [outputFormat, setOutputFormat] = useState("image/jpeg");
  const [originalFile, setOriginalFile] = useState(null);
  const [originalPreview, setOriginalPreview] = useState(null);
  const [compressedPreview, setCompressedPreview] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [finalSize, setFinalSize] = useState(null);
  const [originalSize, setOriginalSize] = useState(null);
  const [compressing, setCompressing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState(null);

  // Refs
  const fileInputRef = useRef(null);
  const toastTimer = useRef(null);
  const urlsToCleanup = useRef([]); 
  const isProcessingRef = useRef(false); 

  // Constants
  const quickSizes = [50, 100, 200, 500, 1024];
  const formats = [
    { mime: "image/jpeg", label: "JPEG", ext: "jpg" },
    { mime: "image/webp", label: "WebP", ext: "webp" },
    { mime: "image/png", label: "PNG", ext: "png" },
  ];

  // Helper: Safely create and track a URL
  const createTrackedUrl = useCallback((blob) => {
    const url = URL.createObjectURL(blob);
    urlsToCleanup.current.push(url);
    return url;
  }, []);

  // Helper: Safely revoke a specific URL
  const revokeUrl = useCallback((url) => {
    if (url) {
      URL.revokeObjectURL(url);
      urlsToCleanup.current = urlsToCleanup.current.filter((u) => u !== url);
    }
  }, []);

  // Helper: Revoke ALL tracked URLs
  const revokeAllUrls = useCallback(() => {
    urlsToCleanup.current.forEach((url) => URL.revokeObjectURL(url));
    urlsToCleanup.current = [];
  }, []);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      revokeAllUrls();
      clearTimeout(toastTimer.current);
    };
  }, [revokeAllUrls]);

  // Toast notification handler
  const showToast = useCallback((msg, type) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // Main compression function
  const compressImage = useCallback(
    async (file, sizeKB, format) => {
      if (!file || !sizeKB) return null;

      setCompressing(true);
      isProcessingRef.current = true;

      try {
        const options = {
          maxSizeMB: sizeKB / 1024,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: format,
        };

        const compressedFile = await imageCompression(file, options);
        return compressedFile;
      } catch (err) {
        console.error("Compression error:", err);
        showToast("Compression failed. Try a different image.", "error");
        return null;
      } finally {
        setCompressing(false);
        isProcessingRef.current = false;
      }
    },
    [showToast]
  );

  // Process a new file
  const processFile = useCallback(
    async (file) => {
      if (!file || !file.type.startsWith("image/")) {
        showToast("Please select a valid image file.", "error");
        return;
      }

      if (isProcessingRef.current) return;

      setOriginalFile(file);
      setOriginalSize(file.size);

      revokeUrl(originalPreview);
      const newOriginalUrl = createTrackedUrl(file);
      setOriginalPreview(newOriginalUrl);

      setCompressedPreview(null);
      setFinalSize(null);
      revokeUrl(downloadUrl);
      setDownloadUrl(null);

      const validTargetKB = typeof targetKB === "string" ? 200 : Math.max(1, targetKB);

      const compressedFile = await compressImage(file, validTargetKB, outputFormat);

      if (compressedFile) {
        const newDownloadUrl = createTrackedUrl(compressedFile);
        setCompressedPreview(newDownloadUrl);
        setDownloadUrl(newDownloadUrl);
        setFinalSize(compressedFile.size);

        const savedPercent = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
        showToast(`Success! Reduced by ${savedPercent}%`, "success");
      }
    },
    [targetKB, outputFormat, originalPreview, downloadUrl, compressImage, createTrackedUrl, revokeUrl, showToast]
  );

  // Auto-recompress when settings change
  useEffect(() => {
    if (originalFile && !isProcessingRef.current) {
      processFile(originalFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKB, outputFormat]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleNewImage = () => {
    revokeAllUrls();
    setOriginalFile(null);
    setOriginalPreview(null);
    setCompressedPreview(null);
    setDownloadUrl(null);
    setFinalSize(null);
    setOriginalSize(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return "—";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const getReduction = () => {
    if (!originalSize || !finalSize) return 0;
    return Math.max(0, ((1 - finalSize / originalSize) * 100)).toFixed(1);
  };

  const getDownloadName = () => {
    if (!originalFile) return "compressed.jpg";
    const baseName = originalFile.name.replace(/\.[^.]+$/, "");
    const format = formats.find((f) => f.mime === outputFormat);
    return `${baseName}_optimized.${format?.ext || "jpg"}`;
  };

  return (
    <>
      {/* Standard CSS Animations (Replaces tailwindcss-animate plugin) */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 80px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.7s ease-out forwards; }
        .animate-zoom-in { animation: zoomIn 0.5s ease-out forwards; }
        .animate-toast { animation: slideUp 0.5s ease-out forwards; }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight">
            Image{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              Optimizer
            </span>
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
            Lightning-fast browser-side compression. No uploads, total privacy, perfect quality.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Settings Card */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 space-y-8 sticky top-24">
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-slate-900 font-bold text-lg">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                  </svg>
                </div>
                Compression Settings
              </div>

              {/* Target Size Input */}
              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1">
                  Target Size
                </label>
                <div className="relative group">
                  <input
                    type="number"
                    min="1"
                    value={targetKB}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setTargetKB("");
                      } else {
                        setTargetKB(Math.max(1, parseInt(val) || 1));
                      }
                    }}
                    className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-600 focus:bg-white focus:ring-0 outline-none rounded-2xl px-6 py-4 font-mono font-bold text-xl transition-all"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg font-bold text-sm pointer-events-none">
                    KB
                  </div>
                </div>

                {/* Quick Size Buttons */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {quickSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setTargetKB(size)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        targetKB === size
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {size >= 1024 ? `${size / 1024}MB` : `${size}KB`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Output Format Selection */}
              <div className="space-y-4 pt-2">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1">
                  Output Format
                </label>
                <div className="flex gap-3">
                  {formats.map((f) => (
                    <button
                      key={f.mime}
                      onClick={() => setOutputFormat(f.mime)}
                      className={`flex-grow py-4 rounded-2xl text-sm font-bold border-2 transition-all ${
                        outputFormat === f.mime
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-inner"
                          : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Upload/Result Card */}
          <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative min-h-[500px] flex flex-col">
            {!originalFile ? (
              /* Upload Area */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex-grow flex flex-col items-center justify-center p-12 cursor-pointer transition-all duration-300 ${
                  dragOver ? "bg-indigo-50/50" : "bg-white"
                }`}
              >
                <div
                  className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mb-8 transition-all duration-500 ${
                    dragOver
                      ? "bg-indigo-600 text-white scale-110 rotate-6 shadow-2xl shadow-indigo-300"
                      : "bg-indigo-50 text-indigo-600"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2 text-center">
                  Drop image here
                </h3>
                <p className="text-slate-500 font-medium text-center">
                  or click to browse your library
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              /* Result Area */
              <div className="flex flex-col h-full animate-zoom-in">
                {/* Image Preview */}
                <div className="relative group bg-slate-50 border-b border-slate-100">
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={compressedPreview || originalPreview}
                      alt="Preview"
                      className={`w-full h-full object-contain transition-all duration-500 ${
                        compressing ? "opacity-40 blur-sm scale-95" : "opacity-100 scale-100"
                      }`}
                    />
                  </div>

                  {/* Loading Overlay */}
                  {compressing && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin shadow-lg"></div>
                        <span className="text-indigo-600 font-black text-sm uppercase tracking-widest animate-pulse">
                          Optimizing
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-6 left-6 flex gap-2">
                    <span className="bg-white/90 backdrop-blur-sm shadow-sm text-slate-900 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border border-slate-100">
                      {compressing ? "Processing" : "Result Preview"}
                    </span>
                  </div>
                </div>

                {/* Stats and Actions */}
                <div className="p-8 space-y-8 flex-grow flex flex-col justify-between">
                  {/* Size Statistics */}
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-black text-slate-400 tracking-tighter">Original</div>
                      <div className="text-lg font-mono font-bold text-slate-700 leading-none">{formatBytes(originalSize)}</div>
                    </div>
                    <div className="space-y-1 border-x border-slate-100 px-6">
                      <div className="text-[10px] uppercase font-black text-slate-400 tracking-tighter">Optimized</div>
                      <div className="text-lg font-mono font-bold text-indigo-600 leading-none">{formatBytes(finalSize)}</div>
                    </div>
                    <div className="space-y-1 text-right">
                      <div className="text-[10px] uppercase font-black text-slate-400 tracking-tighter">Saved</div>
                      <div className="text-lg font-mono font-bold text-emerald-600 leading-none">-{getReduction()}%</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <a
                      href={downloadUrl || "#"}
                      download={downloadUrl ? getDownloadName() : undefined}
                      onClick={(e) => {
                        if (!downloadUrl || compressing) e.preventDefault();
                      }}
                      className={`flex-grow flex items-center justify-center gap-3 py-5 rounded-[1.5rem] font-black text-lg transition-all ${
                        !downloadUrl || compressing
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none"
                          : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200 active:scale-95"
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </a>
                    <button
                      onClick={handleNewImage}
                      className="p-5 rounded-[1.5rem] bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all active:scale-90"
                      title="Upload new image"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 px-8 py-4 rounded-[2rem] shadow-2xl backdrop-blur-2xl border-2 animate-toast ${
              toast.type === "error"
                ? "bg-rose-50/90 border-rose-100 text-rose-700"
                : "bg-emerald-50/90 border-emerald-100 text-emerald-700"
            }`}
          >
            <div className={`w-3 h-3 rounded-full animate-pulse shadow-sm ${
              toast.type === "error" ? "bg-rose-500" : "bg-emerald-500"
            }`} />
            <span className="text-sm font-black tracking-tight uppercase">{toast.msg}</span>
          </div>
        )}
      </div>
    </>
  );
};

export default ImageCompressor;