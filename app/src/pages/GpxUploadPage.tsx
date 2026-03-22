import { useState, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { importGpx, ApiError } from "../lib/api.js";
import { ACTIVITY_LABELS } from "../lib/format.js";

const ACTIVITY_OPTIONS = Object.entries(ACTIVITY_LABELS) as [string, string][];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function GpxUploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [activityType, setActivityType] = useState("hike");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((f: File) => {
    setError(null);
    if (!f.name.toLowerCase().endsWith(".gpx")) {
      setError("Please select a .gpx file");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError("File exceeds 10 MB size limit");
      return;
    }
    setFile(f);
    // Pre-fill name from filename (strip extension)
    if (!name) {
      setName(f.name.replace(/\.gpx$/i, ""));
    }
  }, [name]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const result = await importGpx(file, {
        name: name || undefined,
        activityType,
      });
      navigate(`/routes/${result.data.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to import GPX file");
      }
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-neutral-500">
        <Link to="/routes" className="hover:text-primary">Routes</Link>
        <span className="mx-2">/</span>
        <span className="text-neutral-800">Import GPX</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-neutral-900">Import GPX</h1>

      <form onSubmit={handleSubmit}>
        {/* Drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`mb-6 flex cursor-pointer flex-col items-center justify-center rounded-button border-2 border-dashed p-12 transition ${
            dragOver
              ? "border-primary bg-primary/5"
              : file
                ? "border-green-300 bg-green-50"
                : "border-neutral-300 bg-white hover:border-primary/50"
          }`}
          role="button"
          aria-label="Upload GPX file"
        >
          {/* Upload icon */}
          <svg
            className={`mb-3 h-10 w-10 ${file ? "text-green-500" : "text-neutral-400"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          {file ? (
            <div className="text-center">
              <p className="font-medium text-green-700">{file.name}</p>
              <p className="mt-1 text-sm text-neutral-500">
                {(file.size / 1024).toFixed(1)} KB
              </p>
              <p className="mt-1 text-xs text-neutral-400">Click or drop to replace</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="font-medium text-neutral-600">
                Drop a .gpx file here or click to browse
              </p>
              <p className="mt-1 text-sm text-neutral-400">Max 10 MB</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".gpx"
            onChange={handleInputChange}
            className="hidden"
            data-testid="gpx-file-input"
          />
        </div>

        {/* Name input */}
        {file && (
          <div className="mb-4">
            <label htmlFor="route-name" className="mb-1 block text-sm font-medium text-neutral-700">
              Route name
            </label>
            <input
              id="route-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name for this route"
              className="w-full rounded-button border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        {/* Activity type */}
        {file && (
          <div className="mb-6">
            <label htmlFor="activity-type" className="mb-1 block text-sm font-medium text-neutral-700">
              Activity type
            </label>
            <select
              id="activity-type"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              className="w-full rounded-button border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {ACTIVITY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mb-4 rounded-button bg-error/10 px-4 py-2 text-sm text-error" role="alert">
            {error}
          </p>
        )}

        {/* Submit */}
        {file && (
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-button bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Importing..." : "Import Route"}
          </button>
        )}
      </form>
    </div>
  );
}
