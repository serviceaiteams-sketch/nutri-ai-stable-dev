import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { FaBarcode, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaInfoCircle, FaUpload, FaCamera, FaStop, FaImage } from 'react-icons/fa';

const StatusBadge = ({ status }) => {
  const map = {
    Approved: 'bg-green-100 text-green-700 border-green-200',
    Caution: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Not Approved': 'bg-red-100 text-red-700 border-red-200',
    Unknown: 'bg-gray-100 text-gray-700 border-gray-200'
  };
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium border rounded-full ${map[status] || map.Unknown}`}>
      {status === 'Approved' && <FaCheckCircle className="mr-1" />}
      {status === 'Caution' && <FaExclamationTriangle className="mr-1" />}
      {status === 'Not Approved' && <FaTimesCircle className="mr-1" />}
      {status === 'Unknown' && <FaInfoCircle className="mr-1" />}
      {status}
    </span>
  );
};

export default function HealthApprovedIndia() {
  const [gtin, setGtin] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submission, setSubmission] = useState({ gtin: '', brand: '', name: '', ingredients_raw: '', nutrition: {} });

  // Scanner state
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);

  // Image upload state
  const [imagePreview, setImagePreview] = useState('');
  const [imageDecoding, setImageDecoding] = useState(false);
  const [imageDecodeError, setImageDecodeError] = useState('');

  const lookup = async () => {
    setErr('');
    setResult(null);
    if (!gtin.trim()) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/health-approved/lookup`, { params: { gtin: gtin.trim() } });
      setResult(data);
    } catch (e) {
      setErr('Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  const submitProduct = async () => {
    setErr('');
    try {
      const { data } = await axios.post('/api/health-approved/submit', { ...submission, gtin: submission.gtin || gtin });
      setSubmitOpen(false);
      alert(`Thanks! Submission #${data.submission_id} received.`);
    } catch (e) {
      setErr('Submit failed');
    }
  };

  // Start barcode scanning using @zxing/browser
  const startScan = async () => {
    setScanError('');
    setScanning(true);
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      controlsRef.current = await reader.decodeFromVideoDevice(null, videoRef.current, (result, err, controls) => {
        if (result) {
          const text = result.getText();
          setGtin(text);
          setScanning(false);
          try { controls.stop(); } catch {}
          try { reader.reset(); } catch {}
          readerRef.current = null;
          controlsRef.current = null;
        }
      });
    } catch (e) {
      setScanError('Camera access or scanner initialization failed.');
      setScanning(false);
    }
  };

  const stopScan = () => {
    try { controlsRef.current && controlsRef.current.stop(); } catch {}
    try { readerRef.current && readerRef.current.reset(); } catch {}
    controlsRef.current = null;
    readerRef.current = null;
    setScanning(false);
  };

  // Decode barcode from uploaded image
  const handleImageChange = async (e) => {
    setImageDecodeError('');
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    setImageDecoding(true);
    try {
      // Stop live scan if running
      if (scanning) stopScan();
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      const result = await reader.decodeFromImageUrl(url);
      const text = result.getText();
      setGtin(text || '');
    } catch (e2) {
      setImageDecodeError('Could not detect a barcode in this image. Try a clearer photo.');
    } finally {
      setImageDecoding(false);
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      try { controlsRef.current && controlsRef.current.stop(); } catch {}
      try { readerRef.current && readerRef.current.reset(); } catch {}
      controlsRef.current = null;
      readerRef.current = null;
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const renderHighlights = () => {
    if (!result?.score?.highlights?.length) return null;
    return (
      <div className="space-y-2">
        {result.score.highlights.map((h, idx) => (
          <div key={idx} className={`flex items-start p-2 rounded-md border ${h.level === 'red' ? 'border-red-200 bg-red-50' : h.level === 'amber' ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'}`}>
            <div className={`w-2 h-2 rounded-full mt-2 mr-2 ${h.level === 'red' ? 'bg-red-500' : h.level === 'amber' ? 'bg-yellow-500' : 'bg-green-500'}`} />
            <div>
              <div className="font-medium text-sm">{h.name}</div>
              <div className="text-xs text-gray-600">{h.note}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-[2px] bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500">
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <FaBarcode className="text-gray-600" />
            <div className="font-semibold">Health Approved (India)</div>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <input value={gtin} onChange={e => setGtin(e.target.value)} placeholder="Enter barcode (GTIN) e.g. 8901063011080" className="flex-1 border rounded-lg px-3 py-2" />
            <button onClick={lookup} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-60">{loading ? 'Checking…' : 'Check'}</button>
            {!scanning ? (
              <button onClick={startScan} className="px-4 py-2 bg-gray-100 rounded-lg border inline-flex items-center gap-2"><FaCamera /> Scan</button>
            ) : (
              <button onClick={stopScan} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg border inline-flex items-center gap-2"><FaStop /> Stop</button>
            )}
            <label className="px-4 py-2 bg-gray-100 rounded-lg border inline-flex items-center gap-2 cursor-pointer">
              <FaImage /> Upload
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
            <button onClick={() => setSubmitOpen(true)} className="px-4 py-2 bg-gray-100 rounded-lg border">Submit product</button>
          </div>
          {err && <div className="mt-2 text-sm text-red-600">{err}</div>}
        </div>
      </div>

      {(imagePreview || imageDecoding || imageDecodeError) && (
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-sm text-gray-700 mb-2">Upload a clear photo of the barcode or label. We will try to auto-read the barcode to fill the GTIN.</div>
          {imageDecodeError && <div className="text-sm text-red-600 mb-2">{imageDecodeError}</div>}
          {imagePreview && (
            <div className="rounded-lg overflow-hidden border bg-gray-50">
              <img src={imagePreview} alt="Uploaded preview" className="w-full max-h-64 object-contain" />
            </div>
          )}
          {imageDecoding && <div className="text-sm text-gray-500 mt-2">Reading barcode…</div>}
          {!imageDecoding && imagePreview && (
            <div className="text-xs text-gray-500 mt-2">If GTIN didn’t populate, try another angle, better lighting, or a closer crop.</div>
          )}
        </div>
      )}

      {scanning && (
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-sm text-gray-700 mb-2">Point your camera at the barcode. Grant camera permission if prompted.</div>
          {scanError && <div className="text-sm text-red-600 mb-2">{scanError}</div>}
          <div className="aspect-video bg-black/90 rounded-lg overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" muted autoPlay playsInline />
          </div>
          <div className="mt-2 text-xs text-gray-500">Tip: Ensure good lighting and hold steady for 1-2 seconds.</div>
        </div>
      )}

      {result && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Product</div>
                <div className="font-semibold text-gray-900">{result.product?.brand} {result.product?.name}</div>
                <div className="text-xs text-gray-500">GTIN: {gtin}</div>
              </div>
              <StatusBadge status={result.status || 'Unknown'} />
            </div>
            {result.score && (
              <div className="mt-4">
                <div className="text-sm text-gray-500">Health Score</div>
                <div className="text-3xl font-bold">{result.score.score}/100</div>
                {result.score.reasons?.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
                    {result.score.reasons.slice(0, 5).map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="text-sm text-gray-500 mb-2">Ingredient highlights</div>
            {renderHighlights() || <div className="text-gray-500 text-sm">No highlights available.</div>}
          </div>
        </div>
      )}

      {submitOpen && (
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="font-semibold mb-2">Submit new product</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input className="border rounded-lg px-3 py-2" placeholder="GTIN" value={submission.gtin} onChange={e => setSubmission({ ...submission, gtin: e.target.value })} />
            <input className="border rounded-lg px-3 py-2" placeholder="Brand" value={submission.brand} onChange={e => setSubmission({ ...submission, brand: e.target.value })} />
            <input className="border rounded-lg px-3 py-2" placeholder="Name" value={submission.name} onChange={e => setSubmission({ ...submission, name: e.target.value })} />
            <textarea className="border rounded-lg px-3 py-2 sm:col-span-2" rows={3} placeholder="Ingredients (as on pack)" value={submission.ingredients_raw} onChange={e => setSubmission({ ...submission, ingredients_raw: e.target.value })} />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={submitProduct} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Submit</button>
            <button onClick={() => setSubmitOpen(false)} className="px-4 py-2 bg-gray-100 rounded-lg border">Cancel</button>
          </div>
          <div className="mt-3 text-xs text-gray-500 flex items-center gap-2"><FaUpload /> Add label photos in the next step (coming soon).</div>
        </div>
      )}
    </div>
  );
} 