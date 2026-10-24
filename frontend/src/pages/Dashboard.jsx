import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const DEFAULT_ENTITIES = [
  { id: 'products', label: '📦 Products' },
  { id: 'users', label: '👤 Users' },
  { id: 'orders', label: '🛒 Orders' },
  { id: 'inventory', label: '📊 Inventory' },
  { id: '_storage', label: '📁 File Storage' },
  { id: '_apikeys', label: '🔑 API Keys' }
];

export default function Dashboard() {
  const { user, logout, token } = useAuth() || {};
  const navigate = useNavigate();

  // Active collection entity
  const [entity, setEntity] = useState('products');
  const [customEntityInput, setCustomEntityInput] = useState('');
  
  // Data & Upload states
  const [records, setRecords] = useState([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // API Key Management states
  const [keyLabel, setKeyLabel] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');

  // Pagination & Search states
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');

  // Dynamic Key-Value Form Fields State
  const [fields, setFields] = useState([{ key: 'title', value: '' }, { key: 'description', value: '' }]);

  // Active token lookup fallback
  const activeToken = token || localStorage.getItem('nova_token') || localStorage.getItem('token');

  useEffect(() => {
    if (entity === '_storage') {
      fetchFiles();
    } else if (entity === '_apikeys') {
      fetchApiKeys();
    } else {
      fetchRecords();
    }
  }, [entity, page, search]);

  // 1. FETCH RECORDS
  const fetchRecords = async () => {
    try {
      setStatusMsg(`Fetching ${entity}...`);
      const url = `http://localhost:5000/api/records/${entity}?page=${page}&limit=5&search=${encodeURIComponent(search)}`;
      
      const res = await fetch(url, {
        headers: { 
          'Authorization': `Bearer ${activeToken}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok) {
        setRecords(data.data || []);
        setPagination(data.pagination || {});
        setStatusMsg('');
      } else {
        setStatusMsg(`Fetch Error (${res.status}): ${data.error || data.message || 'Unauthorized'}`);
      }
    } catch (err) {
      setStatusMsg(`Network Error: ${err.message}`);
    }
  };

  // 2. FETCH FILES
  const fetchFiles = async () => {
    try {
      setStatusMsg('Fetching media files...');
      const res = await fetch('http://localhost:5000/api/storage/files', {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRecords(data.files || []);
        setPagination({});
        setStatusMsg('');
      } else {
        setStatusMsg(`Storage Error: ${data.error || 'Failed to fetch files'}`);
      }
    } catch (err) {
      setStatusMsg(`Storage Network Error: ${err.message}`);
    }
  };

  // 3. FETCH API KEYS
  const fetchApiKeys = async () => {
    try {
      setStatusMsg('Fetching API keys...');
      const res = await fetch('http://localhost:5000/api/keys', {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRecords(data.keys || data.data || []);
        setPagination({});
        setStatusMsg('');
      } else {
        setStatusMsg(`Key Fetch Error: ${data.message || data.error || 'Failed to fetch API keys'}`);
      }
    } catch (err) {
      setStatusMsg(`API Key Network Error: ${err.message}`);
    }
  };

  // 4. HANDLE FILE UPLOAD
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setStatusMsg('Please select a file to upload!');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    setUploading(true);
    setStatusMsg('Uploading file...');

    try {
      const res = await fetch('http://localhost:5000/api/storage/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${activeToken}` },
        body: formData
      });
      const data = await res.json();

      if (res.ok) {
        setStatusMsg('File uploaded successfully!');
        setSelectedFile(null);
        fetchFiles();
      } else {
        setStatusMsg(`Upload Failed: ${data.error || data.details || 'Server error'}`);
      }
    } catch (err) {
      setStatusMsg(`Upload Network Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // 5. HANDLE API KEY GENERATION
  const handleGenerateApiKey = async (e) => {
    e.preventDefault();
    if (!keyLabel.trim()) {
      setStatusMsg('Please enter a label for the API key!');
      return;
    }

    try {
      setStatusMsg('Generating new API key...');
      const res = await fetch('http://localhost:5000/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({ name: keyLabel })
      });
      const data = await res.json();

      if (res.ok) {
        setGeneratedKey(data.apiKey || data.key || data.token);
        setKeyLabel('');
        setStatusMsg('New API key generated successfully!');
        fetchApiKeys();
      } else {
        setStatusMsg(`Key Generation Failed: ${data.message || data.error || 'Server error'}`);
      }
    } catch (err) {
      setStatusMsg(`Key Generation Exception: ${err.message}`);
    }
  };

  // Form Field Handlers
  const handleAddField = () => {
    setFields([...fields, { key: '', value: '' }]);
  };

  const handleRemoveField = (index) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index, prop, val) => {
    const updated = [...fields];
    updated[index][prop] = val;
    setFields(updated);
  };

  const resetForm = () => {
    setEditingId(null);
    setFields([{ key: 'title', value: '' }, { key: 'description', value: '' }]);
  };

  const constructPayload = () => {
    const obj = {};
    fields.forEach(({ key, value }) => {
      if (key.trim()) {
        if (!isNaN(value) && value.trim() !== '') {
          obj[key.trim()] = Number(value);
        } else if (value.toLowerCase() === 'true') {
          obj[key.trim()] = true;
        } else if (value.toLowerCase() === 'false') {
          obj[key.trim()] = false;
        } else {
          obj[key.trim()] = value;
        }
      }
    });
    return obj;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = constructPayload();
    if (Object.keys(payload).length === 0) {
      setStatusMsg('Please add at least one valid key-value pair!');
      return;
    }

    const isEdit = Boolean(editingId);
    const endpoint = isEdit 
      ? `http://localhost:5000/api/records/${entity}/${editingId}`
      : `http://localhost:5000/api/records/${entity}`;
    
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setStatusMsg(isEdit ? 'Record updated successfully!' : 'Record created successfully!');
        resetForm();
        fetchRecords();
      } else {
        const data = await res.json();
        setStatusMsg(`Operation Failed (${res.status}): ${data.error || data.message || 'Server error'}`);
      }
    } catch (err) {
      setStatusMsg(`Network Exception: ${err.message}`);
    }
  };

  const handleStartEdit = (rec) => {
    setEditingId(rec.id);
    const recData = typeof rec.data === 'string' ? JSON.parse(rec.data) : (rec.data || rec);
    
    const loadedFields = Object.entries(recData).map(([k, v]) => ({
      key: k,
      value: String(v)
    }));

    setFields(loadedFields.length > 0 ? loadedFields : [{ key: 'title', value: '' }, { key: 'description', value: '' }]);
    setStatusMsg(`Editing record #${rec.id}`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    let deleteEndpoint = `http://localhost:5000/api/records/${entity}/${id}`;
    if (entity === '_apikeys') {
      deleteEndpoint = `http://localhost:5000/api/keys/${id}`;
    }

    try {
      const res = await fetch(deleteEndpoint, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });

      if (res.ok) {
        setStatusMsg('Item deleted.');
        if (entity === '_storage') fetchFiles(); 
        else if (entity === '_apikeys') fetchApiKeys();
        else fetchRecords();
      } else {
        const data = await res.json();
        setStatusMsg(`Delete failed: ${data.error || data.message}`);
      }
    } catch (err) {
      setStatusMsg(`Delete Exception: ${err.message}`);
    }
  };

  const handleCustomEntitySubmit = (e) => {
    e.preventDefault();
    if (customEntityInput.trim()) {
      setEntity(customEntityInput.toLowerCase().trim());
      setCustomEntityInput('');
      setPage(1);
      resetForm();
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a', color: '#fff', fontFamily: 'sans-serif' }}>
      
      {/* SIDEBAR NAVIGATION */}
      <aside style={{ width: '240px', backgroundColor: '#1e293b', borderRight: '1px solid #334155', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h2 style={{ color: '#38bdf8', margin: '0 0 5px 0', fontSize: '1.25rem' }}>NOVA BaaS</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Enterprise Dashboard</p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>
            Collections
          </span>
          {DEFAULT_ENTITIES.map((ent) => (
            <button
              key={ent.id}
              onClick={() => {
                setEntity(ent.id);
                setPage(1);
                resetForm();
                setGeneratedKey('');
              }}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: entity === ent.id ? '#3b82f6' : 'transparent',
                color: entity === ent.id ? '#fff' : '#cbd5e1',
                fontWeight: entity === ent.id ? 'bold' : 'normal',
                cursor: 'pointer'
              }}
            >
              {ent.label}
            </button>
          ))}
        </nav>

        {/* Custom Entity Switcher */}
        <form onSubmit={handleCustomEntitySubmit} style={{ marginTop: 'auto' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Custom Entity</span>
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
            <input 
              type="text" 
              placeholder="e.g. logs"
              value={customEntityInput} 
              onChange={(e) => setCustomEntityInput(e.target.value)} 
              style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '0.85rem' }}
            />
            <button type="submit" style={{ padding: '6px 10px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Go
            </button>
          </div>
        </form>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main style={{ flex: 1, padding: '30px', maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', paddingBottom: '15px', borderBottom: '1px solid #334155' }}>
          <div>
            <h2 style={{ margin: 0, textTransform: 'capitalize' }}>
              {entity === '_storage' ? 'File Storage & Media Engine' : entity === '_apikeys' ? 'Developer API Keys' : `${entity} Collection`}
            </h2>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              User: {user?.email || localStorage.getItem('nova_user_email') || 'Logged In User'}
            </span>
          </div>
          <button 
            onClick={() => { if (logout) logout(); navigate('/login'); }} 
            style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Logout
          </button>
        </header>

        {/* STATUS ALERT */}
        {statusMsg && (
          <div style={{ padding: '12px', backgroundColor: '#334155', borderRadius: '6px', marginBottom: '20px', borderLeft: '4px solid #3b82f6', color: '#f8fafc', fontWeight: 'bold' }}>
            {statusMsg}
          </div>
        )}

        {/* SECTION A: API KEY MANAGER TAB */}
        {entity === '_apikeys' ? (
          <section style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #334155' }}>
            <h3 style={{ marginTop: 0 }}>Generate Developer API Key</h3>
            <form onSubmit={handleGenerateApiKey} style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="Key Label (e.g. Mobile Client, Staging App)" 
                value={keyLabel} 
                onChange={(e) => setKeyLabel(e.target.value)} 
                style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}
              />
              <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                Generate Key
              </button>
            </form>

            {generatedKey && (
              <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#064e3b', borderRadius: '6px', border: '1px solid #10b981' }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: '#a7f3d0', fontWeight: 'bold' }}>
                  🔑 Copy your new API key now (it won't be shown again):
                </p>
                <code style={{ fontSize: '1rem', color: '#34d399', wordBreak: 'break-all', fontWeight: 'bold' }}>{generatedKey}</code>
              </div>
            )}
          </section>
        ) : entity === '_storage' ? (
          /* SECTION B: FILE STORAGE TAB */
          <section style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #334155' }}>
            <h3 style={{ marginTop: 0 }}>Upload New Asset</h3>
            <form onSubmit={handleFileUpload} style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <input 
                type="file" 
                onChange={(e) => setSelectedFile(e.target.files[0])}
                style={{ padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#fff', flex: 1 }}
              />
              <button 
                type="submit" 
                disabled={uploading}
                style={{ padding: '10px 20px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {uploading ? 'Uploading...' : 'Upload File'}
              </button>
            </form>
          </section>
        ) : (
          /* SECTION C: DYNAMIC KEY-VALUE FORM BUILDER */
          <form onSubmit={handleSave} style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #334155' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>
              {editingId ? `Edit Record #${editingId}` : `Create Record in "${entity}"`}
            </h3>

            {fields.map((field, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input 
                  type="text" 
                  placeholder="Key (e.g. title, price)" 
                  value={field.key} 
                  onChange={(e) => handleFieldChange(idx, 'key', e.target.value)} 
                  style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}
                />
                <input 
                  type="text" 
                  placeholder="Value" 
                  value={field.value} 
                  onChange={(e) => handleFieldChange(idx, 'value', e.target.value)} 
                  style={{ flex: 2, padding: '10px', borderRadius: '4px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}
                />
                {fields.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => handleRemoveField(idx)} 
                    style={{ padding: '0 12px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button 
                type="button" 
                onClick={handleAddField} 
                style={{ padding: '8px 14px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                + Add Property
              </button>
              <button 
                type="submit" 
                style={{ padding: '8px 20px', backgroundColor: editingId ? '#eab308' : '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {editingId ? 'Update Record' : 'Add Record'}
              </button>
              {editingId && (
                <button 
                  type="button" 
                  onClick={resetForm} 
                  style={{ padding: '8px 14px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        {/* LIST DISPLAY SECTION */}
        <section style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>
              {entity === '_storage' 
                ? 'Uploaded Files & Assets' 
                : entity === '_apikeys' 
                ? 'Active API Keys' 
                : `Stored Records (${pagination.totalRecords !== undefined ? pagination.totalRecords : records.length})`}
            </h3>
            {entity !== '_storage' && entity !== '_apikeys' && (
              <input 
                type="text" 
                placeholder="Search records..." 
                value={search} 
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
                style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #334155', background: '#0f172a', color: '#fff', width: '200px' }}
              />
            )}
          </div>

          {records.length === 0 ? (
            <p style={{ color: '#94a3b8', margin: 0 }}>
              No {entity === '_storage' ? 'files' : entity === '_apikeys' ? 'API keys' : 'records'} found.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {records.map((rec) => {
                const recData = typeof rec.data === 'string' ? JSON.parse(rec.data) : (rec.data || rec);
                const isMediaFile = entity === '_storage' || rec.entity_type === '_storage';
                const isApiKey = entity === '_apikeys';

                return (
                  <div key={rec.id} style={{ backgroundColor: '#0f172a', padding: '15px', borderRadius: '6px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1, marginRight: '15px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 'bold' }}>
                        {isApiKey ? `KEY ID #${rec.id}` : `RECORD #${rec.id}`}
                      </span>
                      
                      {isApiKey ? (
                        <div style={{ marginTop: '5px' }}>
                          <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '1rem', color: '#f8fafc' }}>
                            {rec.name || rec.label || recData.name || 'API Key'}
                          </p>
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            Prefix: <code style={{ color: '#38bdf8' }}>{rec.key_prefix || rec.prefix || 'nova_...'}</code> | Created: {new Date(rec.created_at || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                      ) : isMediaFile ? (
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                          {recData.mimeType?.includes('image') ? (
                            <img src={recData.url} alt={recData.originalName} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                          ) : (
                            <div style={{ width: '60px', height: '60px', backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', fontSize: '1.2rem' }}>📁</div>
                          )}
                          <div>
                            <p style={{ margin: 0, fontWeight: 'bold' }}>{recData.originalName || recData.filename}</p>
                            <a href={recData.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: '#38bdf8', textDecoration: 'none' }}>
                              Open / Download Link
                            </a>
                          </div>
                        </div>
                      ) : (
                        <pre style={{ margin: '8px 0 0 0', background: '#1e293b', padding: '10px', borderRadius: '4px', fontSize: '0.85rem', color: '#f8fafc', overflowX: 'auto' }}>
                          {JSON.stringify(recData, null, 2)}
                        </pre>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {!isMediaFile && !isApiKey && (
                        <button onClick={() => handleStartEdit(rec)} style={{ padding: '6px 12px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                          Edit
                        </button>
                      )}
                      <button onClick={() => handleDelete(rec.id)} style={{ padding: '6px 12px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Revoke / Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PAGINATION CONTROLS */}
          {entity !== '_storage' && entity !== '_apikeys' && pagination.totalPages > 1 && (
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
              <button 
                disabled={page <= 1} 
                onClick={() => setPage(page - 1)} 
                style={{ padding: '6px 12px', backgroundColor: page <= 1 ? '#334155' : '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button 
                disabled={page >= pagination.totalPages} 
                onClick={() => setPage(page + 1)} 
                style={{ padding: '6px 12px', backgroundColor: page >= pagination.totalPages ? '#334155' : '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: page >= pagination.totalPages ? 'not-allowed' : 'pointer' }}
              >
                Next
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}