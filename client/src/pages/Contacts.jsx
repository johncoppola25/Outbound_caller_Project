import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Search, Upload, Users, Phone, Mail, Trash2, Edit3, X, UserPlus, Eye, MapPin, FileText
} from 'lucide-react';
import { apiFetch } from '../utils/api';

const inputStyle = {
  width: '100%', padding: '10px 14px',
  background: '#ffffff', border: '1px solid #d1d5db',
  borderRadius: '8px', fontSize: '14px', outline: 'none', color: '#111827',
  boxSizing: 'border-box'
};

const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#4b5563', marginBottom: '6px' };

const modalOverlay = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 };

const modalBox = {
  background: '#ffffff',
  border: '1px solid #e5e7eb', borderRadius: '12px',
  padding: '28px', width: 'min(500px, calc(100vw - 32px))', maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
};

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', phone: '', email: '', property_address: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ first_name: '', last_name: '', phone: '', email: '', property_address: '', notes: '', campaign_id: '' });
  const [adding, setAdding] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingContact, setViewingContact] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadCampaignId, setUploadCampaignId] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  function showToast(message, type = 'success') {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  }

  useEffect(() => { fetchCampaigns(); }, []);
  useEffect(() => { if (campaigns.length > 0) fetchAllContacts(); }, [campaigns, selectedCampaign, statusFilter]);

  async function fetchCampaigns() {
    try { const res = await apiFetch('/api/campaigns'); const data = await res.json(); setCampaigns(data); } catch (err) { console.error('Error:', err); } finally { setLoading(false); }
  }

  async function fetchAllContacts() {
    try {
      if (selectedCampaign !== 'all') {
        const url = `/api/contacts/campaign/${selectedCampaign}?limit=200` + (statusFilter !== 'all' ? `&status=${statusFilter}` : '');
        const res = await apiFetch(url); const data = await res.json(); setContacts(data.contacts || []);
      } else {
        const allContacts = [];
        for (const campaign of campaigns) {
          const url = `/api/contacts/campaign/${campaign.id}?limit=100` + (statusFilter !== 'all' ? `&status=${statusFilter}` : '');
          const res = await apiFetch(url); const data = await res.json();
          allContacts.push(...(data.contacts || []).map(c => ({ ...c, campaign_name: campaign.name })));
        }
        setContacts(allContacts);
      }
    } catch (err) { console.error('Error:', err); }
  }

  async function deleteContact(id) {
    if (!confirm('Delete this contact?')) return;
    try { await apiFetch(`/api/contacts/${id}`, { method: 'DELETE' }); setContacts(contacts.filter(c => c.id !== id)); } catch (err) { console.error('Error:', err); }
  }

  function openEditModal(contact) {
    setEditingContact(contact);
    setEditForm({ first_name: contact.first_name || '', last_name: contact.last_name || '', phone: contact.phone || '', email: contact.email || '', property_address: contact.property_address || '', notes: contact.notes || '' });
    setShowEditModal(true);
  }

  async function handleSaveEdit(e) {
    e.preventDefault(); if (!editingContact) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/contacts/${editingContact.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
      if (res.ok) { const updated = await res.json(); setContacts(contacts.map(c => c.id === editingContact.id ? { ...c, ...updated } : c)); setShowEditModal(false); setEditingContact(null); showToast('Contact saved!'); }
      else { const error = await res.json(); showToast(error.error || 'Failed', 'error'); }
    } catch (err) { showToast('Error updating contact', 'error'); } finally { setSaving(false); }
  }

  async function handleAddContact(e) {
    e.preventDefault();
    if (!addForm.first_name || !addForm.phone || !addForm.campaign_id) { showToast('First name, phone, and campaign required', 'error'); return; }
    setAdding(true);
    try {
      const res = await apiFetch('/api/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(addForm) });
      if (res.ok) { const nc = await res.json(); const camp = campaigns.find(c => c.id === addForm.campaign_id); setContacts([{ ...nc, campaign_name: camp?.name }, ...contacts]); setShowAddModal(false); setAddForm({ first_name: '', last_name: '', phone: '', email: '', property_address: '', notes: '', campaign_id: '' }); showToast('Contact added!'); }
      else { const error = await res.json(); showToast(error.error || 'Failed', 'error'); }
    } catch (err) { showToast('Error adding contact', 'error'); } finally { setAdding(false); }
  }

  async function handleUploadContacts(e) {
    e.preventDefault();
    if (!uploadFile || !uploadCampaignId) { showToast('Select campaign and CSV', 'error'); return; }
    setUploading(true); setUploadResult(null);
    try {
      const formData = new FormData(); formData.append('file', uploadFile);
      const res = await apiFetch(`/api/contacts/upload/${uploadCampaignId}`, { method: 'POST', body: formData });
      const result = await res.json();
      if (res.ok) { setUploadResult(result); showToast(`Uploaded ${result.imported} contacts!`); fetchAllContacts(); }
      else showToast(result.error || 'Upload failed', 'error');
    } catch (err) { showToast('Error uploading', 'error'); } finally { setUploading(false); }
  }

  const filteredContacts = contacts.filter(c => !searchQuery || `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone?.includes(searchQuery) || c.email?.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
      <Helmet>
        <title>Contacts - EstateReach AI</title>
        <meta name="description" content="Manage your contact lists and lead database for AI outbound campaigns." />
      </Helmet>
        <div style={{ width: '36px', height: '36px', border: '3px solid rgba(79,70,229,0.2)', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#111827', letterSpacing: '-0.03em' }}>Contacts</h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Manage your client contact lists</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowUploadModal(true)} disabled={campaigns.length === 0}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: campaigns.length === 0 ? '#f3f4f6' : '#ffffff', border: '1px solid #e5e7eb', color: campaigns.length === 0 ? '#9ca3af' : '#4b5563', fontWeight: '500', borderRadius: '10px', cursor: campaigns.length === 0 ? 'not-allowed' : 'pointer', fontSize: '13px' }}>
            <Upload style={{ width: '16px', height: '16px' }} /> Upload
          </button>
          <button onClick={() => setShowAddModal(true)} disabled={campaigns.length === 0}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: campaigns.length === 0 ? '#f3f4f6' : '#4f46e5', color: campaigns.length === 0 ? '#9ca3af' : 'white', fontWeight: '600', borderRadius: '10px', border: 'none', cursor: campaigns.length === 0 ? 'not-allowed' : 'pointer', fontSize: '13px', boxShadow: campaigns.length > 0 ? '0 4px 12px rgba(79,70,229,0.3)' : 'none' }}>
            <UserPlus style={{ width: '16px', height: '16px' }} /> Add Contact
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: '#ffffff', borderRadius: '12px', padding: '14px', border: '1px solid #e5e7eb', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }} />
            <input type="text" placeholder="Search contacts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '36px' }}
              onFocus={e => e.target.style.borderColor = '#4f46e5'} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
          </div>
          <select value={selectedCampaign} onChange={(e) => setSelectedCampaign(e.target.value)}
            style={{ ...inputStyle, width: 'auto', minWidth: '180px' }}>
            <option value="all">All Campaigns</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            style={{ ...inputStyle, width: 'auto', minWidth: '130px' }}>
            <option value="all">All Statuses</option>
            {['pending', 'queued', 'called', 'callback', 'converted', 'not_interested'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          {selectedIds.size > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#4b5563' }}>{selectedIds.size} selected</span>
              <select value={bulkAction}
                onChange={async (e) => {
                  const action = e.target.value; e.target.value = '';
                  if (action === 'dnc') {
                    for (const id of selectedIds) { const c = contacts.find(x => x.id === id); if (c?.phone) await apiFetch('/api/dnc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: c.phone, reason: 'Bulk add' }) }); }
                    showToast(`${selectedIds.size} added to DNC list`);
                  } else if (action === 'export') {
                    const sel = contacts.filter(c => selectedIds.has(c.id));
                    const escapeCsvCell = (cell) => {
                      const str = String(cell || '');
                      if (/^[=+\-@\t\r]/.test(str)) return "'" + str;
                      if (str.includes(',') || str.includes('"') || str.includes('\n')) return '"' + str.replace(/"/g, '""') + '"';
                      return str;
                    };
                    const csv = ['first_name,last_name,phone,email,property_address,status'].concat(sel.map(c => [c.first_name, c.last_name, c.phone, c.email, c.property_address, c.status].map(escapeCsvCell).join(','))).join('\n');
                    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent('\uFEFF' + csv); a.download = 'contacts-export.csv'; a.click(); showToast('Exported to CSV');
                  }
                  setSelectedIds(new Set());
                }}
                style={{ ...inputStyle, width: 'auto', minWidth: '120px', padding: '6px 10px', fontSize: '13px' }}>
                <option value="">Bulk action...</option>
                <option value="dnc">Add to DNC</option>
                <option value="export">Export CSV</option>
              </select>
              <button onClick={() => setSelectedIds(new Set())} style={{ padding: '6px 12px', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#4b5563' }}>Clear</button>
            </div>
          )}
        </div>
      </div>

      {/* Contacts Table */}
      {filteredContacts.length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '60px', textAlign: 'center', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#eef2ff', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Users style={{ width: '24px', height: '24px', color: '#4f46e5' }} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>No contacts found</h3>
          <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '14px' }}>
            {campaigns.length === 0 ? 'Create a campaign first, then upload contacts.' : 'Upload contacts to get started.'}
          </p>
          {campaigns.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setShowUploadModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#ffffff', border: '1px solid #e5e7eb', color: '#4b5563', fontWeight: '500', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}>
                <Upload style={{ width: '16px', height: '16px' }} /> Upload
              </button>
              <button onClick={() => setShowAddModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#4f46e5', color: 'white', fontWeight: '600', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px' }}>
                <UserPlus style={{ width: '16px', height: '16px' }} /> Add Contact
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: '#ffffff', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 14px', width: '40px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  <input type="checkbox" checked={selectedIds.size === filteredContacts.length && filteredContacts.length > 0} onChange={(e) => setSelectedIds(e.target.checked ? new Set(filteredContacts.map(c => c.id)) : new Set())} style={{ accentColor: '#4f46e5' }} />
                </th>
                {['Contact', 'Phone', 'Email', ...(selectedCampaign === 'all' ? ['Campaign'] : []), 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact, idx) => (
                <tr key={contact.id} style={{ borderBottom: idx < filteredContacts.length - 1 ? '1px solid #f3f4f6' : 'none', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 14px' }}>
                    <input type="checkbox" checked={selectedIds.has(contact.id)} onChange={(e) => setSelectedIds(prev => { const s = new Set(prev); if (e.target.checked) s.add(contact.id); else s.delete(contact.id); return s; })} style={{ accentColor: '#4f46e5' }} />
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '34px', height: '34px', background: '#4f46e5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: 'white', flexShrink: 0 }}>
                        {contact.first_name?.[0]}{contact.last_name?.[0]}
                      </div>
                      <span style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{contact.first_name} {contact.last_name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4b5563', fontSize: '13px' }}>
                      <Phone style={{ width: '14px', height: '14px' }} /> {contact.phone}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {contact.email ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4b5563', fontSize: '13px' }}>
                        <Mail style={{ width: '14px', height: '14px' }} /> {contact.email}
                      </div>
                    ) : <span style={{ color: '#9ca3af' }}>-</span>}
                  </td>
                  {selectedCampaign === 'all' && <td style={{ padding: '12px 14px', fontSize: '13px', color: '#6b7280' }}>{contact.campaign_name}</td>}
                  <td style={{ padding: '12px 14px' }}><span className={`status-badge status-${contact.status}`}>{contact.status?.replace('_', ' ')}</span></td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => { setViewingContact(contact); setShowViewModal(true); }} style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '6px', color: '#4f46e5' }} title="View"><Eye style={{ width: '15px', height: '15px' }} /></button>
                      <button onClick={() => openEditModal(contact)} style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '6px', color: '#d97706' }} title="Edit"><Edit3 style={{ width: '15px', height: '15px' }} /></button>
                      <button onClick={() => deleteContact(contact.id)} style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '6px', color: '#9ca3af', transition: 'color 0.2s' }} title="Delete"
                        onMouseEnter={e => e.currentTarget.style.color = '#dc2626'} onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}>
                        <Trash2 style={{ width: '15px', height: '15px' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6', background: '#f9fafb' }}>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>Showing {filteredContacts.length} contacts</p>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {showEditModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>Edit Contact</h2>
              <button onClick={() => { setShowEditModal(false); setEditingContact(null); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: '#9ca3af' }}><X style={{ width: '20px', height: '20px' }} /></button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div><label style={labelStyle}>First Name *</label><input type="text" value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} required style={inputStyle} /></div>
                <div><label style={labelStyle}>Last Name</label><input type="text" value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} style={inputStyle} /></div>
              </div>
              <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Phone *</label><input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} required style={inputStyle} /></div>
              <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Email</label><input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} style={inputStyle} /></div>
              <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Property Address</label><input type="text" value={editForm.property_address} onChange={(e) => setEditForm({ ...editForm, property_address: e.target.value })} style={inputStyle} /></div>
              <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Notes</label><textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowEditModal(false); setEditingContact(null); }} style={{ padding: '10px 18px', background: '#ffffff', border: '1px solid #e5e7eb', color: '#4b5563', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '10px 18px', background: '#4f46e5', color: 'white', fontWeight: '600', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px' }}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>Add Contact</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: '#9ca3af' }}><X style={{ width: '20px', height: '20px' }} /></button>
            </div>
            <form onSubmit={handleAddContact}>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Campaign *</label>
                <select value={addForm.campaign_id} onChange={(e) => setAddForm({ ...addForm, campaign_id: e.target.value })} required style={{ ...inputStyle, backgroundColor: '#ffffff' }}>
                  <option value="">-- Select campaign --</option>
                  {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div><label style={labelStyle}>First Name *</label><input type="text" value={addForm.first_name} onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })} required style={inputStyle} /></div>
                <div><label style={labelStyle}>Last Name</label><input type="text" value={addForm.last_name} onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })} style={inputStyle} /></div>
              </div>
              <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Phone *</label><input type="tel" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} required placeholder="+1234567890" style={inputStyle} /></div>
              <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Email</label><input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} placeholder="email@example.com" style={inputStyle} /></div>
              <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Property Address</label><input type="text" value={addForm.property_address} onChange={(e) => setAddForm({ ...addForm, property_address: e.target.value })} placeholder="123 Main St" style={inputStyle} /></div>
              <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Notes</label><textarea value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} rows={3} placeholder="Notes..." style={{ ...inputStyle, resize: 'vertical' }} /></div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '10px 18px', background: '#ffffff', border: '1px solid #e5e7eb', color: '#4b5563', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                <button type="submit" disabled={adding} style={{ padding: '10px 18px', background: adding ? '#e5e7eb' : '#4f46e5', color: adding ? '#9ca3af' : 'white', fontWeight: '600', borderRadius: '8px', border: 'none', cursor: adding ? 'not-allowed' : 'pointer', fontSize: '13px' }}>{adding ? 'Adding...' : 'Add Contact'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Contact Modal */}
      {showViewModal && viewingContact && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>Contact Details</h2>
              <button onClick={() => { setShowViewModal(false); setViewingContact(null); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: '#9ca3af' }}><X style={{ width: '20px', height: '20px' }} /></button>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '20px', padding: '20px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: '20px', fontWeight: '700', color: 'white' }}>
                {viewingContact.first_name?.[0]?.toUpperCase()}{viewingContact.last_name?.[0]?.toUpperCase()}
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '6px' }}>{viewingContact.first_name} {viewingContact.last_name}</h3>
              <span className={`status-badge status-${viewingContact.status}`}>{viewingContact.status?.replace('_', ' ')}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { icon: Phone, label: 'Phone', value: viewingContact.phone, color: '#4f46e5' },
                { icon: Mail, label: 'Email', value: viewingContact.email, color: '#7c3aed' },
                { icon: MapPin, label: 'Address', value: viewingContact.property_address, color: '#059669' },
                ...(viewingContact.campaign_name ? [{ icon: Users, label: 'Campaign', value: viewingContact.campaign_name, color: '#d97706' }] : [])
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <Icon style={{ width: '16px', height: '16px', color, flexShrink: 0 }} />
                  <div><p style={{ fontSize: '11px', color: '#9ca3af' }}>{label}</p><p style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>{value || '-'}</p></div>
                </div>
              ))}
              {viewingContact.notes && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
                  <FileText style={{ width: '16px', height: '16px', color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                  <div><p style={{ fontSize: '11px', color: '#d97706' }}>Notes</p><p style={{ fontSize: '13px', color: '#111827', whiteSpace: 'pre-wrap' }}>{viewingContact.notes}</p></div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => { setShowViewModal(false); openEditModal(viewingContact); }}
                style={{ flex: 1, padding: '10px 18px', background: '#4f46e5', color: 'white', fontWeight: '600', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}>
                <Edit3 style={{ width: '15px', height: '15px' }} /> Edit
              </button>
              <button onClick={() => { setShowViewModal(false); setViewingContact(null); }}
                style={{ padding: '10px 18px', background: '#ffffff', border: '1px solid #e5e7eb', color: '#4b5563', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Contacts Modal */}
      {showUploadModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>Upload Contacts</h2>
              <button onClick={() => { setShowUploadModal(false); setUploadFile(null); setUploadResult(null); setUploadCampaignId(''); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: '#9ca3af' }}><X style={{ width: '20px', height: '20px' }} /></button>
            </div>
            <form onSubmit={handleUploadContacts}>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Campaign *</label>
                <select value={uploadCampaignId} onChange={(e) => setUploadCampaignId(e.target.value)} required style={{ ...inputStyle, backgroundColor: '#ffffff' }}>
                  <option value="">-- Select campaign --</option>
                  {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>CSV File *</label>
                <div
                  style={{ border: '2px dashed #d1d5db', borderRadius: '12px', padding: '28px', textAlign: 'center', cursor: 'pointer', background: uploadFile ? '#ecfdf5' : '#f9fafb', transition: 'all 0.2s' }}
                  onClick={() => document.getElementById('csv-upload-input').click()}>
                  <input id="csv-upload-input" type="file" accept=".csv" onChange={(e) => { setUploadFile(e.target.files[0]); setUploadResult(null); }} style={{ display: 'none' }} />
                  {uploadFile ? (
                    <div><FileText style={{ width: '32px', height: '32px', color: '#059669', margin: '0 auto 8px' }} /><p style={{ fontWeight: '600', color: '#059669', fontSize: '14px' }}>{uploadFile.name}</p><p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{(uploadFile.size / 1024).toFixed(1)} KB</p></div>
                  ) : (
                    <div><Upload style={{ width: '32px', height: '32px', color: '#9ca3af', margin: '0 auto 8px' }} /><p style={{ fontWeight: '500', color: '#111827', fontSize: '14px' }}>Click to select a CSV file</p><p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>or drag and drop</p></div>
                  )}
                </div>
              </div>
              <div style={{ marginBottom: '12px', padding: '10px 12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '12px', color: '#6b7280' }}><strong style={{ color: '#4b5563' }}>CSV Format:</strong></p>
                <p style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace' }}>first_name, last_name, phone, email, property_address, notes</p>
              </div>
              {uploadResult && (
                <div style={{ marginBottom: '12px', padding: '12px', borderRadius: '8px', background: uploadResult.errors > 0 ? '#fffbeb' : '#ecfdf5', border: `1px solid ${uploadResult.errors > 0 ? '#fde68a' : '#a7f3d0'}` }}>
                  <p style={{ fontWeight: '600', color: uploadResult.errors > 0 ? '#d97706' : '#059669', fontSize: '14px' }}>Upload Complete</p>
                  <p style={{ fontSize: '13px', color: uploadResult.errors > 0 ? '#d97706' : '#059669' }}>{uploadResult.imported} imported{uploadResult.errors > 0 ? `, ${uploadResult.errors} errors` : ''}</p>
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowUploadModal(false); setUploadFile(null); setUploadResult(null); setUploadCampaignId(''); }}
                  style={{ padding: '10px 18px', background: '#ffffff', border: '1px solid #e5e7eb', color: '#4b5563', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>{uploadResult ? 'Done' : 'Cancel'}</button>
                {!uploadResult && (
                  <button type="submit" disabled={uploading || !uploadFile || !uploadCampaignId}
                    style={{ padding: '10px 18px', background: (uploading || !uploadFile || !uploadCampaignId) ? '#e5e7eb' : '#4f46e5', color: (uploading || !uploadFile || !uploadCampaignId) ? '#9ca3af' : 'white', fontWeight: '600', borderRadius: '8px', border: 'none', cursor: (uploading || !uploadFile || !uploadCampaignId) ? 'not-allowed' : 'pointer', fontSize: '13px' }}>
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', padding: '12px 20px',
          borderRadius: '10px',
          background: '#ffffff',
          borderLeft: `4px solid ${toast.type === 'success' ? '#059669' : '#dc2626'}`,
          color: toast.type === 'success' ? '#059669' : '#dc2626', fontWeight: '600', fontSize: '14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: '10px',
          zIndex: 100, animation: 'fadeIn 0.3s ease',
          border: `1px solid ${toast.type === 'success' ? '#a7f3d0' : '#fecaca'}`
        }}>
          {toast.type === 'success' ? (
            <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}
