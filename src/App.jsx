import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { motion, AnimatePresence } from 'framer-motion';
import { createSupabaseClient } from './supabaseClient';
import {
  Upload,
  RotateCcw,
  ShieldCheck,
  Search,
  X,
  Users,
  Copy,
  CheckCircle,
  BookmarkPlus,
  Download,
  Settings,
  Database,
  EyeOff,
  Trash2,
  Globe
} from 'lucide-react';
import './index.css';

// Curated list of current, multimodal-capable models for discovery
const DISCOVERY_MODELS = [
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-2.5-pro",
  "gemini-1.5-pro",
  "gemini-2.0-flash",
  "gemini-2.0-flash-exp",
  "gemini-1.5-flash-latest",
];

function App() {
  const [activeModelName, setActiveModelName] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [status, setStatus] = useState('Ready to scout');
  const [tripDetails, setTripDetails] = useState({ tripName: 'My Trip', leadPax: '' });
  const [travellers, setTravellers] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [debugLog, setDebugLog] = useState([]);
  const [copiedAllJson, setCopiedAllJson] = useState(false);
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [savedTrips, setSavedTrips] = useState([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);
  const [activeTripId, setActiveTripId] = useState(null);
  const [dbConfig, setDbConfig] = useState(() => {
    const saved = localStorage.getItem('passport_scout_db');
    return saved ? JSON.parse(saved) : {
      url: import.meta.env.VITE_SUPABASE_URL || '',
      key: import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    };
  });
  const [showDbKey, setShowDbKey] = useState(false);

  // Define bookmarklet code here so it can be used in the href
  const bookmarkletCode = `javascript:(function(){const jsonString=prompt("Paste Multi-Passenger JSON Data:");if(!jsonString)return;let data;try{data=JSON.parse(jsonString.replace(/\\\`\\\`\\\`json|\\\`\\\`\\\`/g,"").trim())}catch(e){alert("Error: Invalid JSON");return}async function fillField(el,val){if(!el)return;const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;s.call(el,val);el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));el.dispatchEvent(new Event("blur",{bubbles:true}));el.classList.remove("error-bordered-input")}async function run(){const passengers=data.travellers||[];for(let i=0;i<passengers.length;i++){let forms=document.querySelectorAll(".paxDetails");if(i>=forms.length){const addBtn=document.querySelector(".pax-control, .optnItem.cursorPointer p")||Array.from(document.querySelectorAll("p")).find(p=>p.innerText.includes("ADD NEW ADULT"));if(addBtn){addBtn.click();await new Promise(r=>setTimeout(r,600));forms=document.querySelectorAll(".paxDetails")}else{alert("Could not find '+ ADD NEW ADULT' button for passenger "+(i+1));break}}const f=forms[i];const p=passengers[i];const fn=f.querySelector(\`input[name*="ADULT.\${i}.rowFields.FIRST_NAME"]\`)||f.querySelector("input[placeholder*='First & Middle']");if(fn&&p.names)fillField(fn,p.names);const ln=f.querySelector(\`input[name*="ADULT.\${i}.rowFields.LAST_NAME"]\`)||f.querySelector("input[placeholder='Last Name']");if(ln)fillField(ln,p.surname||"");if(p.sex){const v=p.sex.toUpperCase().startsWith("F")?"FEMALE":"MALE";const r=Array.from(f.querySelectorAll('input[type="radio"]')).find(rad=>rad.value===v&&(rad.name.includes("ADULT."+i)||rad.name.includes("GENDER")));if(r){const lb=f.querySelector(\`label[for="\${r.id}"]\`)||r.closest("label")||r.parentElement;if(lb)lb.click();setTimeout(()=>{r.checked=true;r.dispatchEvent(new Event("change",{bubbles:true}));r.dispatchEvent(new Event("click",{bubbles:true}))},50)}}}alert("🎉 Multi-passenger auto-fill complete!")}run()})();`;

  const fileInputRef = useRef(null);

  const addLog = (msg) => setDebugLog(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${msg}`]);

  const fetchSavedTrips = async () => {
    const client = createSupabaseClient(dbConfig.url, dbConfig.key);
    if (!client) return;

    setIsLoadingTrips(true);
    try {
      const { data, error } = await client
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSavedTrips(data || []);
    } catch (err) {
      console.error('Fetch Trips Error:', err);
    } finally {
      setIsLoadingTrips(false);
    }
  };

  useEffect(() => {
    fetchSavedTrips();
  }, [dbConfig.url, dbConfig.key]);

  const loadTrip = async (trip) => {
    const client = createSupabaseClient(dbConfig.url, dbConfig.key);
    if (!client) return;

    setStatus(`Loading ${trip.trip_name}...`);
    try {
      const { data, error } = await client
        .from('passengers')
        .select('*')
        .eq('trip_id', trip.id);

      if (error) throw error;

      setTripDetails({ tripName: trip.trip_name, leadPax: trip.lead_pax || '' });
      setTravellers(data.map(p => ({ ...p, id: p.id })));
      setActiveTripId(trip.id);
      setStatus('Trip loaded!');
    } catch (err) {
      console.error('Load Trip Error:', err);
      setErrorMessage('Failed to load trip: ' + err.message);
    }
  };

  const deleteTrip = async (e, tripId) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this trip and all its passengers?')) return;

    const client = createSupabaseClient(dbConfig.url, dbConfig.key);
    if (!client) return;

    try {
      const { error } = await client
        .from('trips')
        .delete()
        .eq('id', tripId);

      if (error) throw error;
      fetchSavedTrips();
      if (activeTripId === tripId) reset();
    } catch (err) {
      console.error('Delete Trip Error:', err);
      setErrorMessage('Failed to delete trip: ' + err.message);
    }
  };

  const processFile = (selectedFile) => {
    if (!selectedFile.type.startsWith('image/')) {
      setErrorMessage('Please upload an image file (JPG, PNG).');
      return;
    }
    setErrorMessage('');
    setDebugLog([]);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target.result);
      setStatus('Document loaded. Ready for AI discovery.');
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) processFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const selectedFile = e.dataTransfer.files[0];
    if (selectedFile) processFile(selectedFile);
  };

  const startScan = async () => {
    if (!imagePreview) return;

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE' || apiKey.trim() === '') {
      setErrorMessage('API key is missing or invalid. Please check your .env file.');
      return;
    }

    setIsScanning(true);
    setErrorMessage('');
    setDebugLog([]);

    const genAIClient = new GoogleGenerativeAI(apiKey);
    const attemptOrder = activeModelName
      ? [activeModelName, ...DISCOVERY_MODELS.filter(m => m !== activeModelName)]
      : DISCOVERY_MODELS;

    try {
      let success = false;
      let lastError = null;
      const mimeType = imagePreview.match(/data:([^;]+);/)?.[1] || "image/jpeg";
      const base64Data = imagePreview.split(',')[1];

      for (const modelName of attemptOrder) {
        try {
          addLog(`Probing ${modelName}...`);
          setStatus(`Scanning with ${modelName}...`);
          const model = genAIClient.getGenerativeModel({ model: modelName });

          const imagePart = {
            inlineData: { data: base64Data, mimeType: mimeType }
          };

          const prompt = `
            Extract ALL identity data from this image. 
            Include: {surname, names, passport_number, nationality, dob, expiry, issuing_date, sex, issuing_country}.
            Format dates clearly (e.g., DD/MM/YYYY).
            Return ONLY the raw JSON.
          `;

          const result = await model.generateContent([prompt, imagePart]);
          const response = await result.response;
          const text = response.text();

          const jsonStart = text.indexOf('{');
          const jsonEnd = text.lastIndexOf('}') + 1;

          if (jsonStart !== -1 && jsonEnd !== 0) {
            const data = JSON.parse(text.substring(jsonStart, jsonEnd));

            setTravellers(prev => {
              const newList = [...prev, { ...data, id: Date.now() }];
              if (newList.length === 1) setTripDetails(p => ({ ...p, leadPax: `${data.names} ${data.surname}` }));
              return newList;
            });

            setActiveModelName(modelName);
            setStatus('Success!');
            addLog(`Success with ${modelName}`);
            success = true;
            setImagePreview(null);
            setScanSuccess(true);
            setTimeout(() => setScanSuccess(false), 2000);
            break;
          } else {
            throw new Error("AI response did not contain a valid data object.");
          }
        } catch (err) {
          addLog(`${modelName} failed: ${err.message.substring(0, 50)}...`);
          lastError = err;
          continue;
        }
      }

      if (!success) throw new Error(lastError?.message || "All discovery paths failed.");

    } catch (err) {
      console.error("Discovery Final Error:", err);
      setErrorMessage(err.message || 'Error occurred during AI processing');
      setStatus('Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const reset = () => {
    setTravellers([]);
    setTripDetails({ tripName: 'My Trip', leadPax: '' });
    setActiveTripId(null);
    setImagePreview(null);
    setErrorMessage('');
    setStatus('Ready to scout');
  };

  const handleUpdateTraveller = (idx, field, val) => {
    setTravellers(prev => prev.map((t, i) => i === idx ? { ...t, [field]: val } : t));
  };

  const removeTraveller = (idx) => {
    setTravellers(prev => prev.filter((_, i) => i !== idx));
  };

  const copyAllToClipboard = () => {
    if (travellers.length === 0) return;
    const payload = { ...tripDetails, travellers, exportedAt: new Date().toISOString() };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).then(() => {
      setCopiedAllJson(true);
      setTimeout(() => setCopiedAllJson(false), 2000);
    });
  };

  const copyBookmarkletToClipboard = () => {
    navigator.clipboard.writeText(bookmarkletCode).then(() => {
      setCopiedBookmarklet(true);
      setTimeout(() => setCopiedBookmarklet(false), 3000);
    });
  };

  const saveToSupabase = async () => {
    if (travellers.length === 0) return;

    const client = createSupabaseClient(dbConfig.url, dbConfig.key);
    if (!client) {
      setErrorMessage('Supabase URL and Key are required. Check settings.');
      setShowSettings(true);
      return;
    }

    setIsSaving(true);
    setSaveStatus('Saving to cloud...');

    try {
      let tripId = activeTripId;

      if (tripId) {
        // Update existing trip
        const { error: updateError } = await client
          .from('trips')
          .update({ trip_name: tripDetails.tripName, lead_pax: tripDetails.leadPax })
          .eq('id', tripId);

        if (updateError) throw updateError;

        // Delete old passengers and re-insert (Cleanest way for sync)
        const { error: delError } = await client
          .from('passengers')
          .delete()
          .eq('trip_id', tripId);

        if (delError) throw delError;
      } else {
        // Create new trip
        const { data: tripData, error: tripError } = await client
          .from('trips')
          .insert([{ trip_name: tripDetails.tripName, lead_pax: tripDetails.leadPax }])
          .select()
          .single();

        if (tripError) throw tripError;
        tripId = tripData.id;
        setActiveTripId(tripId);
      }

      const passengerPayload = travellers.map(t => ({
        trip_id: tripId,
        surname: t.surname,
        names: t.names,
        passport_number: t.passport_number,
        nationality: t.nationality,
        dob: t.dob,
        expiry: t.expiry,
        issuing_date: t.issuing_date,
        sex: t.sex,
        issuing_country: t.issuing_country
      }));

      const { error: paxError } = await client
        .from('passengers')
        .insert(passengerPayload);

      if (paxError) throw paxError;

      setSaveStatus(activeTripId ? '✅ Updated' : '✅ Saved');
      fetchSavedTrips(); // Refresh list
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      console.error('Supabase Save Error:', err);
      setErrorMessage('Database error: ' + err.message);
      setSaveStatus('❌ Failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="app-container">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1>Passport Scout Elite</h1>
        <p className="subtitle">Universal Multi-Engine Data Extraction</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
          <div className="badge">{activeModelName ? `Active: ${activeModelName}` : "Discovery Mode Active"}</div>
          <button
            className="btn-outline small"
            onClick={() => setShowSettings(!showSettings)}
            style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Settings size={14} /> Database Settings
          </button>
          <button
            className="btn-outline small"
            onClick={() => window.open('/sandbox.html', '_blank')}
            style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Globe size={14} /> Portal Sandbox
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass"
            style={{ maxWidth: '600px', margin: '0 auto 2rem auto', padding: '1.5rem', overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Database size={18} style={{ color: 'var(--primary-bright)' }} />
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Cloud Storage Configuration</h3>
            </div>
            <div className="results-grid">
              <div className="result-card">
                <label>Supabase Project URL</label>
                <input
                  className="edit-input"
                  placeholder="https://xyz.supabase.co"
                  value={dbConfig.url}
                  onChange={e => {
                    const newConfig = { ...dbConfig, url: e.target.value };
                    setDbConfig(newConfig);
                    localStorage.setItem('passport_scout_db', JSON.stringify(newConfig));
                  }}
                />
              </div>
              <div className="result-card">
                <label>Anon API Key</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showDbKey ? "text" : "password"}
                    className="edit-input"
                    placeholder="eyJhbG..."
                    value={dbConfig.key}
                    onChange={e => {
                      const newConfig = { ...dbConfig, key: e.target.value };
                      setDbConfig(newConfig);
                      localStorage.setItem('passport_scout_db', JSON.stringify(newConfig));
                    }}
                  />
                  <button
                    onClick={() => setShowDbKey(!showDbKey)}
                    style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                  >
                    {showDbKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
            <p style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '1rem' }}>
              These keys are stored locally in your browser and used only for sync. Empty them to use .env defaults.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="layout-grid">
        <motion.div
          className="upload-section"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div
            className={`drop-zone glass ${imagePreview ? 'has-image' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => !imagePreview && fileInputRef.current.click()}
          >
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} accept="image/*" />
            {!imagePreview ? (
              <div className="drop-prompt">
                <div className="icon"><Upload size={48} /></div>
                <p>Drop document here or <span>browse</span></p>
              </div>
            ) : (
              <div className="preview-wrap" style={{ position: 'relative' }}>
                <img src={imagePreview} alt="Preview" />
                {isScanning && <div className="scan-line" />}
                {scanSuccess && (
                  <motion.div
                    className="scan-success"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  >
                    <CheckCircle size={64} />
                  </motion.div>
                )}
                <div className="overlay" onClick={() => fileInputRef.current.click()}>
                  <RotateCcw size={24} style={{ marginRight: '8px' }} /> Update Image
                </div>
              </div>
            )}
          </div>

          <AnimatePresence>
            {imagePreview && (
              <motion.div className="controls" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
                {isScanning && <div className="shimmer-bar"><div className="shimmer-fill"></div></div>}
                <p className={`status-text ${errorMessage ? 'error' : ''}`} style={{ textAlign: 'center', margin: '1rem 0' }}>
                  {errorMessage ? `❌ ${errorMessage}` : status}
                </p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn-primary" onClick={startScan} disabled={isScanning}>
                    {isScanning ? <RotateCcw className="icon-pulse" /> : <Search size={20} />}
                    {isScanning ? 'Analyzing...' : 'Add Passenger'}
                  </button>
                  <button className="btn-outline" onClick={() => setImagePreview(null)} disabled={isScanning}>
                    <X size={18} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          className="results-container"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="results-section glass" style={{ minHeight: '520px', padding: '1.5rem' }}>
            {travellers.length > 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="section-header" style={{ marginBottom: '1.5rem' }}>
                  <h2 className="section-title">Trip Management</h2>
                  <div className="btn-success" style={{ cursor: 'default', fontSize: '0.8rem' }}>
                    <ShieldCheck size={14} /> Multi-Pax Ready
                  </div>
                </div>

                <div className="results-grid" style={{ marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1.5rem' }}>
                  <div className="result-card">
                    <label>Trip Name</label>
                    <input className="edit-input" value={tripDetails.tripName} onChange={e => setTripDetails(p => ({ ...p, tripName: e.target.value }))} />
                  </div>
                  <div className="result-card">
                    <label>Lead Passenger</label>
                    <input className="edit-input" value={tripDetails.leadPax} onChange={e => setTripDetails(p => ({ ...p, leadPax: e.target.value }))} />
                  </div>
                </div>

                <div className="traveller-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {travellers.map((traveller, idx) => (
                    <div key={traveller.id} className="glass" style={{ padding: '1rem', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div className="avatar" style={{ background: 'var(--accent-grad)', width: '30px', height: '30px', borderRadius: '50%', textAlign: 'center', lineHeight: '30px', fontWeight: 'bold' }}>{idx + 1}</div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{traveller.names} {traveller.surname}</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>{traveller.passport_number} • {traveller.sex}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn-outline small" onClick={() => setEditingIndex(editingIndex === idx ? null : idx)}>Edit</button>
                          <button className="btn-outline small" style={{ color: 'var(--error)' }} onClick={() => removeTraveller(idx)}><X size={14} /></button>
                        </div>
                      </div>

                      {editingIndex === idx && (
                        <div className="results-grid" style={{ marginTop: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                          <div className="result-card"><label>Names</label><input className="edit-input" value={traveller.names} onChange={e => handleUpdateTraveller(idx, 'names', e.target.value)} /></div>
                          <div className="result-card"><label>Surname</label><input className="edit-input" value={traveller.surname} onChange={e => handleUpdateTraveller(idx, 'surname', e.target.value)} /></div>
                          <div className="result-card"><label>Passport #</label><input className="edit-input" value={traveller.passport_number} onChange={e => handleUpdateTraveller(idx, 'passport_number', e.target.value)} /></div>
                          <div className="result-card"><label>Gender</label><input className="edit-input" value={traveller.sex} onChange={e => handleUpdateTraveller(idx, 'sex', e.target.value)} /></div>
                          <div className="result-card"><label>DOB</label><input className="edit-input" value={traveller.dob} onChange={e => handleUpdateTraveller(idx, 'dob', e.target.value)} /></div>
                          <div className="result-card"><label>Expiry</label><input className="edit-input" value={traveller.expiry} onChange={e => handleUpdateTraveller(idx, 'expiry', e.target.value)} /></div>
                          <div className="result-card wide"><label>Issuing Date</label><input className="edit-input" value={traveller.issuing_date || ''} onChange={e => handleUpdateTraveller(idx, 'issuing_date', e.target.value)} /></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '2.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <button className="btn-primary" onClick={copyAllToClipboard} style={{ flex: 1 }}>
                      {copiedAllJson ? <CheckCircle size={18} /> : <Copy size={18} />}
                      {copiedAllJson ? 'Copied!' : `Copy ${travellers.length} Pax JSON`}
                    </button>
                    <button
                      className="btn-outline"
                      onClick={saveToSupabase}
                      disabled={isSaving}
                      style={{ border: '1px solid var(--success)', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      {isSaving ? <RotateCcw className="icon-pulse" size={18} /> : <Download size={18} />}
                      {saveStatus || 'Save to Cloud'}
                    </button>
                    <button className="btn-outline" onClick={reset}><RotateCcw size={18} /></button>
                  </div>

                  <div className="glass" style={{ padding: '1.5rem', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BookmarkPlus size={18} /> Smart Multi-Fill</h3>
                    <button className="btn-outline" onClick={copyBookmarkletToClipboard} style={{ width: '100%', marginBottom: '0.75rem' }}>
                      {copiedBookmarklet ? 'Saved!' : 'Copy Multi-Pax Bookmarklet'}
                    </button>

                    <a
                      href={bookmarkletCode}
                      className="btn-primary"
                      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', width: '100%', marginBottom: '0.75rem', textDecoration: 'none', cursor: 'move', fontSize: '0.9rem' }}
                      title="Drag this button to your bookmarks bar"
                      onClick={(e) => e.preventDefault()}
                    >
                      <BookmarkPlus size={16} /> 🔖 Drag to Bookmark Bar
                    </a>

                    <button
                      className="btn-outline"
                      onClick={() => window.open('/sandbox.html', '_blank')}
                      style={{ width: '100%', marginBottom: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
                    >
                      <Globe size={16} /> Open Auto-Fill Sandbox
                    </button>

                    <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>Updated: Now auto-clicks "+ ADD NEW ADULT"</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="empty-results">
                <Users size={64} style={{ opacity: 0.1, marginBottom: '2rem' }} />
                <p style={{ marginBottom: '2rem' }}>Build your trip roster by scanning passports.</p>

                {savedTrips.length > 0 && (
                  <div style={{ width: '100%', textAlign: 'left' }}>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--primary-bright)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recently Saved Trips</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {savedTrips.map(trip => (
                        <div
                          key={trip.id}
                          className="glass"
                          style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)' }}
                          onClick={() => loadTrip(trip)}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{trip.trip_name}</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>{trip.lead_pax || 'No Lead Pax'} • {new Date(trip.created_at).toLocaleDateString()}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button
                              className="btn-outline small"
                              style={{ padding: '0.25rem', border: 'none', background: 'none', color: 'var(--primary-bright)', fontSize: '0.75rem' }}
                              onClick={(e) => { e.stopPropagation(); window.open('/sandbox.html', '_blank'); }}
                            >
                              Open Test
                            </button>
                            <button
                              className="btn-outline small"
                              style={{ padding: '0.25rem', border: 'none', background: 'none' }}
                              onClick={(e) => deleteTrip(e, trip.id)}
                            >
                              <Trash2 size={16} style={{ color: 'var(--error)', opacity: 0.6 }} />
                            </button>
                            <RotateCcw size={14} style={{ opacity: 0.4 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </main>

      <footer>
        <p>Zero Backend • AI Vision Processing</p>
      </footer>
    </div>
  );
}

export default App;
