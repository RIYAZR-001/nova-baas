import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Package,
  Users,
  ShoppingCart,
  BarChart3,
  FolderOpen,
  KeyRound,
  Database,
  LogOut,
  Plus,
  X,
  Search,
  Upload,
  ExternalLink,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check
} from 'lucide-react';

const rawBaseUrl = import.meta.env.VITE_API_URL || 'https://nova-baas.onrender.com';
const normalizedBase = rawBaseUrl.replace(/\/+$/, '');
const API_BASE = normalizedBase.endsWith('/api')
  ? normalizedBase
  : `${normalizedBase}/api`;

const DEFAULT_ENTITIES = [
  { id: 'products', label: 'Products', icon: Package },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'inventory', label: 'Inventory', icon: BarChart3 },
  { id: '_storage', label: 'File Storage', icon: FolderOpen },
  { id: '_apikeys', label: 'API Keys', icon: KeyRound }
];

const ui = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    width: '100%',
    color: '#f5f7fa'
  },
  sidebar: {
    width: '248px',
    flexShrink: 0,
    backgroundColor: 'rgba(16, 18, 22, 0.92)',
    backdropFilter: 'blur(12px)',
    borderRight: '1px solid rgba(255, 255, 255, 0.09)',
    padding: '20px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '22px'
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  brandBadge: {
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    backgroundColor: '#181b20',
    border: '1px solid rgba(255, 255, 255, 0.16)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#f5f7fa'
  },
  sectionLabel: {
    fontSize: '0.6875rem',
    color: '#7d8592',
    textTransform: 'uppercase',
    fontWeight: 600,
    letterSpacing: '0.07em',
    padding: '0 8px'
  },
  navList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: '8px'
  },
  panel: {
    backgroundColor: '#141619',
    border: '1px solid rgba(255, 255, 255, 0.09)',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '22px'
  },
  input: {
    backgroundColor: '#101215',
    border: '1px solid rgba(255, 255, 255, 0.09)',
    borderRadius: '7px',
    color: '#f5f7fa',
    padding: '9px 12px',
    fontSize: '0.875rem',
    outline: 'none'
  },
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
    backgroundColor: '#ffffff',
    color: '#0c0d0e',
    border: '1px solid #ffffff',
    borderRadius: '7px',
    padding: '9px 16px',
    fontSize: '0.84rem',
    fontWeight: 600,
    cursor: 'pointer'
  },
  btnSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
    backgroundColor: '#181b20',
    color: '#f5f7fa',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '7px',
    padding: '9px 14px',
    fontSize: '0.84rem',
    fontWeight: 500,
    cursor: 'pointer'
  },
  btnDanger: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    backgroundColor: 'rgba(248, 81, 73, 0.12)',
    color: '#ff7b72',
    border: '1px solid rgba(248, 81, 73, 0.35)',
    borderRadius: '7px',
    padding: '7px 12px',
    fontSize: '0.8rem',
    fontWeight: 500,
    cursor: 'pointer'
  }
};

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
  const [copiedKey, setCopiedKey] = useState(false);

  // Pagination & Search states
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');

  // Dynamic Key-Value Form Fields State
  const [fields, setFields] = useState([
    { key: 'title', value: '' },
    { key: 'description', value: '' }
  ]);

  // Active token lookup fallback
  const activeToken =
    token ||
    user?.token ||
    localStorage.getItem('token') ||
    localStorage.getItem('nova_token');

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
      const url = `${API_BASE}/records/${entity}?page=${page}&limit=5&search=${encodeURIComponent(search)}`;

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
      const res = await fetch(`${API_BASE}/storage/files`, {
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
      const res = await fetch(`${API_BASE}/keys`, {
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
      const res = await fetch(`${API_BASE}/storage/upload`, {
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
      const res = await fetch(`${API_BASE}/keys/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({ name: keyLabel })
      });
      const data = await res.json();

      if (res.ok) {
        const createdKey =
          data.apiKey?.key_value ||
          data.key_value ||
          (typeof data.apiKey === 'string' ? data.apiKey : data.key || data.token || '');
        setGeneratedKey(createdKey);
        setCopiedKey(false);
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

  const handleCopyKey = async () => {
    if (!generatedKey) return;
    try {
      await navigator.clipboard.writeText(generatedKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 1800);
    } catch {
      setCopiedKey(false);
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
      ? `${API_BASE}/records/${entity}/${editingId}`
      : `${API_BASE}/records/${entity}`;

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

    let deleteEndpoint = `${API_BASE}/records/${entity}/${id}`;
    if (entity === '_apikeys') {
      deleteEndpoint = `${API_BASE}/keys/${id}`;
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

  const isDefaultEntity = DEFAULT_ENTITIES.some((item) => item.id === entity);

  return (
    <div className="nova-shell">
      <div className="nova-shell-content" style={ui.page}>
        {/* SIDEBAR NAVIGATION */}
        <aside style={ui.sidebar}>
          <div style={ui.brandRow}>
            <span style={ui.brandBadge}>
              <Zap size={16} strokeWidth={1.7} />
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.06em', color: '#f5f7fa' }}>
                NOVA
              </h2>
              <p style={{ margin: '1px 0 0 0', fontSize: '0.72rem', color: '#7d8592' }}>
                BaaS Console
              </p>
            </div>
          </div>

          <nav>
            <span style={ui.sectionLabel}>Collections</span>
            <div style={ui.navList}>
              {DEFAULT_ENTITIES.map((ent) => {
                const IconComponent = ent.icon;
                const active = entity === ent.id;
                return (
                  <button
                    key={ent.id}
                    type="button"
                    onClick={() => {
                      setEntity(ent.id);
                      setPage(1);
                      resetForm();
                      setGeneratedKey('');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      textAlign: 'left',
                      padding: '9px 10px',
                      borderRadius: '7px',
                      border: active
                        ? '1px solid rgba(255, 255, 255, 0.16)'
                        : '1px solid transparent',
                      backgroundColor: active ? '#181b20' : 'transparent',
                      color: active ? '#f5f7fa' : '#8b929e',
                      fontWeight: active ? 600 : 400,
                      fontSize: '0.86rem',
                      cursor: 'pointer'
                    }}
                  >
                    <IconComponent size={16} strokeWidth={1.6} />
                    <span>{ent.label}</span>
                  </button>
                );
              })}

              {!isDefaultEntity && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 10px',
                    borderRadius: '7px',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    backgroundColor: '#181b20',
                    color: '#f5f7fa',
                    fontWeight: 600,
                    fontSize: '0.86rem',
                    textTransform: 'capitalize'
                  }}
                >
                  <Database size={16} strokeWidth={1.6} />
                  <span>{entity}</span>
                </div>
              )}
            </div>
          </nav>

          {/* Custom Entity Switcher */}
          <form onSubmit={handleCustomEntitySubmit} style={{ marginTop: 'auto' }}>
            <span style={ui.sectionLabel}>Custom Entity</span>
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <input
                type="text"
                placeholder="e.g. logs"
                value={customEntityInput}
                onChange={(e) => setCustomEntityInput(e.target.value)}
                style={{ ...ui.input, width: '100%', padding: '7px 10px', fontSize: '0.82rem' }}
              />
              <button type="submit" style={{ ...ui.btnSecondary, padding: '7px 12px' }}>
                Go
              </button>
            </div>
          </form>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main style={{ flex: 1, padding: '28px 32px', maxWidth: '1040px', margin: '0 auto', width: '100%' }}>
          {/* HEADER */}
          <header
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.09)'
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 600, letterSpacing: '-0.02em', textTransform: 'capitalize' }}>
                {entity === '_storage'
                  ? 'File Storage & Media Engine'
                  : entity === '_apikeys'
                  ? 'Developer API Keys'
                  : `${entity} Collection`}
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#7d8592' }}>
                {user?.email || localStorage.getItem('nova_user_email') || 'Logged In User'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                if (logout) logout();
                navigate('/login');
              }}
              style={ui.btnSecondary}
            >
              <LogOut size={15} strokeWidth={1.6} />
              <span>Logout</span>
            </button>
          </header>

          {/* STATUS ALERT */}
          {statusMsg && (
            <div
              style={{
                padding: '11px 14px',
                backgroundColor: '#141619',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                color: '#d8dee9',
                fontSize: '0.84rem'
              }}
            >
              {statusMsg}
            </div>
          )}

          {/* SECTION A: API KEY MANAGER TAB */}
          {entity === '_apikeys' ? (
            <section style={ui.panel}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem', fontWeight: 600 }}>
                Generate Developer API Key
              </h3>
              <form onSubmit={handleGenerateApiKey} style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Key Label (e.g. Hola Storefront, Staging App)"
                  value={keyLabel}
                  onChange={(e) => setKeyLabel(e.target.value)}
                  style={{ ...ui.input, flex: 1 }}
                />
                <button type="submit" style={ui.btnPrimary}>
                  <KeyRound size={15} strokeWidth={1.7} />
                  <span>Generate Key</span>
                </button>
              </form>

              {generatedKey && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '14px',
                    backgroundColor: '#101215',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.16)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#8b929e' }}>
                      Copy your new API key now (it won&apos;t be shown again):
                    </span>
                    <button type="button" onClick={handleCopyKey} style={{ ...ui.btnSecondary, padding: '5px 10px', fontSize: '0.78rem' }}>
                      {copiedKey ? <Check size={14} strokeWidth={1.6} /> : <Copy size={14} strokeWidth={1.6} />}
                      <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <code style={{ fontSize: '0.92rem', color: '#f5f7fa', wordBreak: 'break-all' }}>
                    {generatedKey}
                  </code>
                </div>
              )}
            </section>
          ) : entity === '_storage' ? (
            /* SECTION B: FILE STORAGE TAB */
            <section style={ui.panel}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem', fontWeight: 600 }}>
                Upload New Asset
              </h3>
              <form onSubmit={handleFileUpload} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  style={{ ...ui.input, flex: 1, padding: '8px 10px', fontSize: '0.83rem' }}
                />
                <button type="submit" disabled={uploading} style={ui.btnPrimary}>
                  <Upload size={15} strokeWidth={1.7} />
                  <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
                </button>
              </form>
            </section>
          ) : (
            /* SECTION C: DYNAMIC KEY-VALUE FORM BUILDER */
            <form onSubmit={handleSave} style={ui.panel}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 600 }}>
                {editingId ? `Edit Record #${editingId}` : `Create Record in "${entity}"`}
              </h3>

              {fields.map((field, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="text"
                    placeholder="Key (e.g. title, price)"
                    value={field.key}
                    onChange={(e) => handleFieldChange(idx, 'key', e.target.value)}
                    style={{ ...ui.input, flex: 1 }}
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={field.value}
                    onChange={(e) => handleFieldChange(idx, 'value', e.target.value)}
                    style={{ ...ui.input, flex: 2 }}
                  />
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveField(idx)}
                      style={{ ...ui.btnDanger, padding: '0 12px' }}
                      aria-label="Remove property"
                    >
                      <X size={15} strokeWidth={1.6} />
                    </button>
                  )}
                </div>
              ))}

              <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
                <button type="button" onClick={handleAddField} style={ui.btnSecondary}>
                  <Plus size={15} strokeWidth={1.6} />
                  <span>Add Property</span>
                </button>
                <button type="submit" style={ui.btnPrimary}>
                  <span>{editingId ? 'Update Record' : 'Add Record'}</span>
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} style={ui.btnSecondary}>
                    <span>Cancel</span>
                  </button>
                )}
              </div>
            </form>
          )}

          {/* LIST DISPLAY SECTION */}
          <section style={ui.panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', gap: '12px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                {entity === '_storage'
                  ? 'Uploaded Files & Assets'
                  : entity === '_apikeys'
                  ? 'Active API Keys'
                  : `Stored Records (${pagination.totalRecords !== undefined ? pagination.totalRecords : records.length})`}
              </h3>
              {entity !== '_storage' && entity !== '_apikeys' && (
                <div style={{ position: 'relative', width: '230px' }}>
                  <Search
                    size={14}
                    strokeWidth={1.6}
                    style={{
                      position: 'absolute',
                      left: '11px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#7d8592',
                      pointerEvents: 'none'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search records..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    style={{ ...ui.input, width: '100%', padding: '8px 12px 8px 32px', fontSize: '0.83rem' }}
                  />
                </div>
              )}
            </div>

            {records.length === 0 ? (
              <p style={{ color: '#7d8592', margin: 0, fontSize: '0.88rem' }}>
                No {entity === '_storage' ? 'files' : entity === '_apikeys' ? 'API keys' : 'records'} found.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {records.map((rec) => {
                  const recData = typeof rec.data === 'string' ? JSON.parse(rec.data) : (rec.data || rec);
                  const isMediaFile = entity === '_storage' || rec.entity_type === '_storage';
                  const isApiKey = entity === '_apikeys';

                  return (
                    <div
                      key={rec.id}
                      style={{
                        backgroundColor: '#101215',
                        padding: '15px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.09)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '16px'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '0.72rem', color: '#8b929e', fontWeight: 600, letterSpacing: '0.04em' }}>
                          {isApiKey ? `KEY ID #${rec.id}` : `RECORD #${rec.id}`}
                        </span>

                        {isApiKey ? (
                          <div style={{ marginTop: '5px' }}>
                            <p style={{ margin: '0 0 4px 0', fontWeight: 600, fontSize: '0.95rem', color: '#f5f7fa' }}>
                              {rec.name || rec.label || recData.name || 'API Key'}
                            </p>
                            <span style={{ fontSize: '0.8rem', color: '#7d8592' }}>
                              Key: <code style={{ color: '#d8dee9' }}>{rec.key_value || rec.key_prefix || rec.prefix || 'nova_...'}</code> | Created:{' '}
                              {new Date(rec.created_at || Date.now()).toLocaleDateString()}
                            </span>
                          </div>
                        ) : isMediaFile ? (
                          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                            {recData.mimeType?.includes('image') ? (
                              <img
                                src={recData.url}
                                alt={recData.originalName}
                                style={{
                                  width: '60px',
                                  height: '60px',
                                  objectFit: 'cover',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '60px',
                                  height: '60px',
                                  backgroundColor: '#181b20',
                                  border: '1px solid rgba(255, 255, 255, 0.09)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '6px',
                                  color: '#8b929e'
                                }}
                              >
                                <FolderOpen size={20} strokeWidth={1.6} />
                              </div>
                            )}
                            <div>
                              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>
                                {recData.originalName || recData.filename}
                              </p>
                              <a
                                href={recData.url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  marginTop: '4px',
                                  fontSize: '0.8rem',
                                  color: '#b4bcc8',
                                  textDecoration: 'none'
                                }}
                              >
                                <span>Open / Download Link</span>
                                <ExternalLink size={13} strokeWidth={1.6} />
                              </a>
                            </div>
                          </div>
                        ) : (
                          <pre
                            style={{
                              margin: '8px 0 0 0',
                              background: '#141619',
                              border: '1px solid rgba(255, 255, 255, 0.07)',
                              padding: '12px',
                              borderRadius: '7px',
                              fontSize: '0.82rem',
                              color: '#e5e7eb',
                              overflowX: 'auto'
                            }}
                          >
                            {JSON.stringify(recData, null, 2)}
                          </pre>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        {!isMediaFile && !isApiKey && (
                          <button type="button" onClick={() => handleStartEdit(rec)} style={ui.btnSecondary}>
                            <Pencil size={14} strokeWidth={1.6} />
                            <span>Edit</span>
                          </button>
                        )}
                        <button type="button" onClick={() => handleDelete(rec.id)} style={ui.btnDanger}>
                          <Trash2 size={14} strokeWidth={1.6} />
                          <span>Revoke / Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* PAGINATION CONTROLS */}
            {entity !== '_storage' && entity !== '_apikeys' && pagination.totalPages > 1 && (
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '14px' }}>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  style={{
                    ...ui.btnSecondary,
                    opacity: page <= 1 ? 0.45 : 1,
                    cursor: page <= 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ChevronLeft size={15} strokeWidth={1.6} />
                  <span>Previous</span>
                </button>
                <span style={{ fontSize: '0.85rem', color: '#8b929e' }}>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                  style={{
                    ...ui.btnSecondary,
                    opacity: page >= pagination.totalPages ? 0.45 : 1,
                    cursor: page >= pagination.totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={15} strokeWidth={1.6} />
                </button>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}