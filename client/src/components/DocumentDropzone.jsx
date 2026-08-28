import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, X, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * DocumentDropzone component for PDF file selection & preview
 * @param {Object} props
 * @param {Array<File>} props.files - Currently selected files
 * @param {Function} props.onFilesChange - Callback when files change: (files) => void
 * @param {number} [props.maxFiles=5] - Maximum number of files
 * @param {number} [props.maxSizeMB=10] - Max size per file in MB
 * @param {boolean} [props.disabled=false] - Disabled state
 */
const DocumentDropzone = ({
  files = [],
  onFilesChange,
  maxFiles = 5,
  maxSizeMB = 10,
  disabled = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const fileInputRef = useRef(null);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const validateAndAddFiles = (newFiles) => {
    setErrorMessage(null);
    const validPdfFiles = [];
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (files.length + newFiles.length > maxFiles) {
      setErrorMessage(`You can upload a maximum of ${maxFiles} PDF files.`);
      return;
    }

    for (const file of newFiles) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setErrorMessage(`"${file.name}" is not a PDF file. Only PDF records are accepted.`);
        return;
      }
      if (file.size > maxSizeBytes) {
        setErrorMessage(`"${file.name}" exceeds the ${maxSizeMB}MB file size limit.`);
        return;
      }
      // Avoid exact duplicates by name and size
      const isDuplicate = files.some(
        (f) => f.name === file.name && f.size === file.size
      );
      if (!isDuplicate) {
        validPdfFiles.push(file);
      }
    }

    if (validPdfFiles.length > 0) {
      onFilesChange([...files, ...validPdfFiles]);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(Array.from(e.dataTransfer.files));
      e.dataTransfer.clearData();
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(Array.from(e.target.files));
      e.target.value = ''; // Reset input to allow re-selecting same file
    }
  };

  const handleRemoveFile = (indexToRemove) => {
    if (disabled) return;
    const updated = files.filter((_, idx) => idx !== indexToRemove);
    onFilesChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Drop Area */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition flex flex-col items-center justify-center ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-100 border-slate-300'
            : isDragOver
            ? 'border-cyan-500 bg-cyan-50/80 scale-[0.99] shadow-inner'
            : 'border-slate-300 bg-white/60 hover:bg-cyan-50/30 hover:border-cyan-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={handleFileInputChange}
          disabled={disabled}
          className="hidden"
        />

        <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center mb-3 shadow-sm">
          <UploadCloud className="w-6 h-6" />
        </div>

        <h4 className="text-sm font-bold text-slate-800 mb-1">
          Upload Lab Reports & Medical Records (PDF)
        </h4>
        <p className="text-xs text-slate-500 max-w-sm mb-3">
          Drag and drop your previous clinical summaries, lab results, or imaging reports here, or click to browse.
        </p>

        <div className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-400">
          <span>Max {maxFiles} files</span>
          <span>•</span>
          <span>Up to {maxSizeMB}MB each</span>
          <span>•</span>
          <span className="text-cyan-700 font-semibold">PDF only</span>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-xs font-medium animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Selected File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Attached Documents ({files.length}/{maxFiles})</span>
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Ready for extraction
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {files.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between gap-3 group hover:border-cyan-300 transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>

                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(idx);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition flex-shrink-0"
                    title="Remove document"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentDropzone;
