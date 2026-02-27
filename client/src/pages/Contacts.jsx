import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Upload,
  Users,
  Phone,
  Mail,
  Trash2,
  Edit3,
  X,
  UserPlus,
  Eye,
  MapPin,
  FileText
} from 'lucide-react';

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');

  // Edit Contact Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    property_address: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  // Add Contact Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    property_address: '',
    notes: '',
    campaign_id: ''
  });
  const [adding, setAdding] = useState(false);

  // View Contact Modal State
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingContact, setViewingContact] = useState(null);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadCampaignId, setUploadCampaignId] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Show toast helper
  function showToast(message, type = 'success') {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  }

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (campaigns.length > 0) {
      fetchAllContacts();
    }
  }, [campaigns, selectedCampaign, statusFilter]);

  async function fetchCampaigns() {
    try {
      const res = await fetch('/api/campaigns');
      const data = await res.json();
      setCampaigns(data);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllContacts() {
    try {
      if (selectedCampaign !== 'all') {
        const url = `/api/contacts/campaign/${selectedCampaign}?limit=200` + (statusFilter !== 'all' ? `&status=${statusFilter}` : '');
        const res = await fetch(url);
        const data = await res.json();
        setContacts(data.contacts || []);
      } else {
        const allContacts = [];
        for (const campaign of campaigns) {
          const url = `/api/contacts/campaign/${campaign.id}?limit=100` + (statusFilter !== 'all' ? `&status=${statusFilter}` : '');
          const res = await fetch(url);
          const data = await res.json();
          const contactsWithCampaign = (data.contacts || []).map(c => ({
            ...c,
            campaign_name: campaign.name
          }));
          allContacts.push(...contactsWithCampaign);
        }
        setContacts(allContacts);
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
    }
  }

  async function deleteContact(id) {
    if (!confirm('Delete this contact?')) return;
    try {
      await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
      setContacts(contacts.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting contact:', err);
    }
  }

  function openEditModal(contact) {
    setEditingContact(contact);
    setEditForm({
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      phone: contact.phone || '',
      email: contact.email || '',
      property_address: contact.property_address || '',
      notes: contact.notes || ''
    });
    setShowEditModal(true);
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingContact) return;
    
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${editingContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      
      if (res.ok) {
        const updated = await res.json();
        setContacts(contacts.map(c => 
          c.id === editingContact.id 
            ? { ...c, ...updated }
            : c
        ));
        setShowEditModal(false);
        setEditingContact(null);
        showToast('Contact saved successfully!', 'success');
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to update contact', 'error');
      }
    } catch (err) {
      console.error('Error updating contact:', err);
      showToast('Error updating contact', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddContact(e) {
    e.preventDefault();
    if (!addForm.first_name || !addForm.phone || !addForm.campaign_id) {
      showToast('First name, phone, and campaign are required', 'error');
      return;
    }
    
    setAdding(true);
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm)
      });
      
      if (res.ok) {
        const newContact = await res.json();
        // Add campaign name to the new contact
        const campaign = campaigns.find(c => c.id === addForm.campaign_id);
        setContacts([{ ...newContact, campaign_name: campaign?.name }, ...contacts]);
        setShowAddModal(false);
        setAddForm({
          first_name: '',
          last_name: '',
          phone: '',
          email: '',
          property_address: '',
          notes: '',
          campaign_id: ''
        });
        showToast('Contact added successfully!', 'success');
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to add contact', 'error');
      }
    } catch (err) {
      console.error('Error adding contact:', err);
      showToast('Error adding contact', 'error');
    } finally {
      setAdding(false);
    }
  }

  async function handleUploadContacts(e) {
    e.preventDefault();
    if (!uploadFile || !uploadCampaignId) {
      showToast('Please select a campaign and a CSV file', 'error');
      return;
    }

    setUploading(true);
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const res = await fetch(`/api/contacts/upload/${uploadCampaignId}`, {
        method: 'POST',
        body: formData
      });

      const result = await res.json();
      if (res.ok) {
        setUploadResult(result);
        showToast(`Uploaded ${result.imported} contacts successfully!`, 'success');
        fetchAllContacts();
      } else {
        showToast(result.error || 'Upload failed', 'error');
      }
    } catch (err) {
      console.error('Error uploading contacts:', err);
      showToast('Error uploading contacts', 'error');
    } finally {
      setUploading(false);
    }
  }

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = !searchQuery || 
      `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone?.includes(searchQuery) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <div style={{ width: '32px', height: '32px', border: '4px solid #deb040', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '30px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30' }}>Contacts</h1>
          <p style={{ color: '#8c735e', marginTop: '4px' }}>Manage your client contact lists</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowUploadModal(true)}
            disabled={campaigns.length === 0}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              padding: '12px 24px', 
              backgroundColor: campaigns.length === 0 ? '#dbd5ca' : '#1e2a45',
              color: campaigns.length === 0 ? '#99826a' : 'white', 
              fontWeight: '500', 
              borderRadius: '8px', 
              border: 'none', 
              cursor: campaigns.length === 0 ? 'not-allowed' : 'pointer' 
            }}
          >
            <Upload style={{ width: '20px', height: '20px', marginRight: '8px' }} />
            Upload Contacts
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={campaigns.length === 0}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              padding: '12px 24px', 
              background: campaigns.length === 0 ? '#dbd5ca' : 'linear-gradient(to right, #deb040, #c8932f)', 
              color: campaigns.length === 0 ? '#99826a' : '#151c30', 
              fontWeight: '600', 
              borderRadius: '8px', 
              border: 'none', 
              cursor: campaigns.length === 0 ? 'not-allowed' : 'pointer' 
            }}
          >
            <UserPlus style={{ width: '20px', height: '20px', marginRight: '8px' }} />
            Add Contact
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#ab9a82' }} />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 16px 10px 40px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
            />
          </div>

          <select
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            style={{ padding: '10px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', minWidth: '200px' }}
          >
            <option value="all">All Campaigns</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '10px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', minWidth: '140px' }}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="queued">Queued</option>
            <option value="called">Called</option>
            <option value="callback">Callback</option>
            <option value="converted">Converted</option>
            <option value="not_interested">Not Interested</option>
          </select>
          {selectedIds.size > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: '#755f4e' }}>{selectedIds.size} selected</span>
              <select
                value={bulkAction}
                onChange={async (e) => {
                  const action = e.target.value;
                  e.target.value = '';
                  if (action === 'dnc') {
                    for (const id of selectedIds) {
                      const c = contacts.find(x => x.id === id);
                      if (c?.phone) {
                        await fetch('/api/dnc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: c.phone, reason: 'Bulk add' }) });
                      }
                    }
                    showToast(`${selectedIds.size} added to DNC list`);
                  } else if (action === 'export') {
                    const sel = contacts.filter(c => selectedIds.has(c.id));
                    const csv = ['first_name,last_name,phone,email,property_address,status'].concat(sel.map(c => `${c.first_name || ''},${c.last_name || ''},${c.phone || ''},${c.email || ''},${c.property_address || ''},${c.status || ''}`)).join('\n');
                    const a = document.createElement('a');
                    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent('\uFEFF' + csv);
                    a.download = 'contacts-export.csv';
                    a.click();
                    showToast('Exported to CSV');
                  }
                  setSelectedIds(new Set());
                }}
                style={{ padding: '8px 12px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px' }}
              >
                <option value="">Bulk action...</option>
                <option value="dnc">Add to DNC list</option>
                <option value="export">Export to CSV</option>
              </select>
              <button onClick={() => setSelectedIds(new Set())} style={{ padding: '8px 12px', backgroundColor: '#edeae5', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>Clear</button>
            </div>
          )}
        </div>
      </div>

      {/* Contacts Table */}
      {filteredContacts.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '48px', textAlign: 'center', boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)' }}>
          <Users style={{ width: '64px', height: '64px', color: '#c4b9a7', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '20px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30', marginBottom: '8px' }}>No contacts found</h3>
          <p style={{ color: '#99826a', marginBottom: '24px' }}>
            {campaigns.length === 0 ? 'Create a campaign first, then upload contacts.' : 'Upload contacts to a campaign to get started.'}
          </p>
          {campaigns.length > 0 && (
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowUploadModal(true)}
                style={{ display: 'inline-flex', alignItems: 'center', padding: '12px 24px', backgroundColor: '#1e2a45', color: 'white', fontWeight: '500', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
              >
                <Upload style={{ width: '20px', height: '20px', marginRight: '8px' }} />
                Upload Contacts
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                style={{ display: 'inline-flex', alignItems: 'center', padding: '12px 24px', background: 'linear-gradient(to right, #deb040, #c8932f)', color: '#151c30', fontWeight: '600', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
              >
                <UserPlus style={{ width: '20px', height: '20px', marginRight: '8px' }} />
                Add Contact
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f7f6f4' }}>
                <th style={{ padding: '12px 16px', width: '40px' }}>
                  <input type="checkbox" checked={selectedIds.size === filteredContacts.length && filteredContacts.length > 0} onChange={(e) => setSelectedIds(e.target.checked ? new Set(filteredContacts.map(c => c.id)) : new Set())} />
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#755f4e', textTransform: 'uppercase' }}>Contact</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#755f4e', textTransform: 'uppercase' }}>Phone</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#755f4e', textTransform: 'uppercase' }}>Email</th>
                {selectedCampaign === 'all' && <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#755f4e', textTransform: 'uppercase' }}>Campaign</th>}
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#755f4e', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#755f4e', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact, idx) => (
                <tr key={contact.id} style={{ borderBottom: idx < filteredContacts.length - 1 ? '1px solid #edeae5' : 'none' }}>
                  <td style={{ padding: '16px' }}>
                    <input type="checkbox" checked={selectedIds.has(contact.id)} onChange={(e) => setSelectedIds(prev => { const s = new Set(prev); if (e.target.checked) s.add(contact.id); else s.delete(contact.id); return s; })} />
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', background: 'linear-gradient(to bottom right, #dbd5ca, #c4b9a7)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#755f4e' }}>
                          {contact.first_name?.[0]}{contact.last_name?.[0]}
                        </span>
                      </div>
                      <span style={{ fontWeight: '500', color: '#1e2a45' }}>{contact.first_name} {contact.last_name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#755f4e' }}>
                      <Phone style={{ width: '16px', height: '16px' }} />
                      {contact.phone}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    {contact.email ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#755f4e' }}>
                        <Mail style={{ width: '16px', height: '16px' }} />
                        {contact.email}
                      </div>
                    ) : (
                      <span style={{ color: '#ab9a82' }}>-</span>
                    )}
                  </td>
                  {selectedCampaign === 'all' && (
                    <td style={{ padding: '16px', fontSize: '14px', color: '#755f4e' }}>{contact.campaign_name}</td>
                  )}
                  <td style={{ padding: '16px' }}>
                    <span className={`status-badge status-${contact.status}`}>
                      {contact.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => { setViewingContact(contact); setShowViewModal(true); }}
                        style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '8px', color: '#3b82f6' }}
                        title="View contact details"
                      >
                        <Eye style={{ width: '16px', height: '16px' }} />
                      </button>
                      <button
                        onClick={() => openEditModal(contact)}
                        style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '8px', color: '#deb040' }}
                        title="Edit contact"
                      >
                        <Edit3 style={{ width: '16px', height: '16px' }} />
                      </button>
                      <button
                        onClick={() => deleteContact(contact.id)}
                        style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '8px', color: '#ab9a82' }}
                        title="Delete contact"
                      >
                        <Trash2 style={{ width: '16px', height: '16px' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ padding: '16px 24px', borderTop: '1px solid #edeae5', backgroundColor: '#f7f6f4' }}>
            <p style={{ fontSize: '14px', color: '#99826a' }}>
              Showing {filteredContacts.length} contacts
            </p>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30' }}>Edit Contact</h2>
              <button onClick={() => { setShowEditModal(false); setEditingContact(null); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X style={{ width: '24px', height: '24px', color: '#99826a' }} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>First Name *</label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    required
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Last Name</label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Phone Number *</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  required
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Property Address</label>
                <input
                  type="text"
                  value={editForm.property_address}
                  onChange={(e) => setEditForm({ ...editForm, property_address: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingContact(null); }}
                  style={{ padding: '12px 24px', backgroundColor: '#f7f6f4', color: '#1e2a45', fontWeight: '500', borderRadius: '8px', border: '1px solid #dbd5ca', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '12px 24px', background: 'linear-gradient(to right, #deb040, #c8932f)', color: '#151c30', fontWeight: '600', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30' }}>Add Contact</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X style={{ width: '24px', height: '24px', color: '#99826a' }} />
              </button>
            </div>

            <form onSubmit={handleAddContact}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Campaign *</label>
                <select
                  value={addForm.campaign_id}
                  onChange={(e) => setAddForm({ ...addForm, campaign_id: e.target.value })}
                  required
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white' }}
                >
                  <option value="">-- Select a campaign --</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>First Name *</label>
                  <input
                    type="text"
                    value={addForm.first_name}
                    onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })}
                    required
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Last Name</label>
                  <input
                    type="text"
                    value={addForm.last_name}
                    onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })}
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Phone Number *</label>
                <input
                  type="tel"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  required
                  placeholder="+1234567890"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Email</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="email@example.com"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Property Address</label>
                <input
                  type="text"
                  value={addForm.property_address}
                  onChange={(e) => setAddForm({ ...addForm, property_address: e.target.value })}
                  placeholder="123 Main St, City, State"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Notes</label>
                <textarea
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  rows={3}
                  placeholder="Any additional notes..."
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '12px 24px', backgroundColor: '#f7f6f4', color: '#1e2a45', fontWeight: '500', borderRadius: '8px', border: '1px solid #dbd5ca', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  style={{ 
                    padding: '12px 24px', 
                    background: adding ? '#dbd5ca' : 'linear-gradient(to right, #deb040, #c8932f)', 
                    color: adding ? '#99826a' : '#151c30', 
                    fontWeight: '600', 
                    borderRadius: '8px', 
                    border: 'none', 
                    cursor: adding ? 'not-allowed' : 'pointer',
                    minWidth: '120px'
                  }}
                >
                  {adding ? 'Adding...' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Contact Modal */}
      {showViewModal && viewingContact && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30' }}>Contact Details</h2>
              <button onClick={() => { setShowViewModal(false); setViewingContact(null); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X style={{ width: '24px', height: '24px', color: '#99826a' }} />
              </button>
            </div>

            {/* Contact Name Header */}
            <div style={{ textAlign: 'center', marginBottom: '24px', padding: '20px', backgroundColor: '#f7f6f4', borderRadius: '12px' }}>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #deb040, #c8932f)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 12px',
                fontSize: '24px',
                fontWeight: '600',
                color: 'white'
              }}>
                {viewingContact.first_name?.[0]?.toUpperCase()}{viewingContact.last_name?.[0]?.toUpperCase()}
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#151c30', marginBottom: '4px' }}>
                {viewingContact.first_name} {viewingContact.last_name}
              </h3>
              <span style={{ 
                display: 'inline-block',
                padding: '4px 12px', 
                backgroundColor: viewingContact.status === 'completed' ? '#d1fae5' : viewingContact.status === 'called' ? '#fef3c7' : '#e9ecf5',
                color: viewingContact.status === 'completed' ? '#059669' : viewingContact.status === 'called' ? '#d97706' : '#1e2a45',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                {viewingContact.status?.replace('_', ' ')}
              </span>
            </div>

            {/* Contact Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#f7f6f4', borderRadius: '8px' }}>
                <Phone style={{ width: '20px', height: '20px', color: '#deb040' }} />
                <div>
                  <p style={{ fontSize: '12px', color: '#99826a', marginBottom: '2px' }}>Phone</p>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#1e2a45' }}>{viewingContact.phone || '-'}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#f7f6f4', borderRadius: '8px' }}>
                <Mail style={{ width: '20px', height: '20px', color: '#deb040' }} />
                <div>
                  <p style={{ fontSize: '12px', color: '#99826a', marginBottom: '2px' }}>Email</p>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#1e2a45' }}>{viewingContact.email || '-'}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', backgroundColor: '#f7f6f4', borderRadius: '8px' }}>
                <MapPin style={{ width: '20px', height: '20px', color: '#deb040', flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: '12px', color: '#99826a', marginBottom: '2px' }}>Property Address</p>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#1e2a45' }}>{viewingContact.property_address || '-'}</p>
                </div>
              </div>

              {viewingContact.campaign_name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#f7f6f4', borderRadius: '8px' }}>
                  <Users style={{ width: '20px', height: '20px', color: '#deb040' }} />
                  <div>
                    <p style={{ fontSize: '12px', color: '#99826a', marginBottom: '2px' }}>Campaign</p>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#1e2a45' }}>{viewingContact.campaign_name}</p>
                  </div>
                </div>
              )}

              {viewingContact.notes && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
                  <FileText style={{ width: '20px', height: '20px', color: '#d97706', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '12px', color: '#92400e', marginBottom: '2px' }}>Notes</p>
                    <p style={{ fontSize: '14px', color: '#78350f', whiteSpace: 'pre-wrap' }}>{viewingContact.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => { setShowViewModal(false); openEditModal(viewingContact); }}
                style={{ flex: 1, padding: '12px 24px', background: 'linear-gradient(to right, #deb040, #c8932f)', color: '#151c30', fontWeight: '600', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Edit3 style={{ width: '16px', height: '16px' }} /> Edit Contact
              </button>
              <button
                onClick={() => { setShowViewModal(false); setViewingContact(null); }}
                style={{ padding: '12px 24px', backgroundColor: '#f7f6f4', color: '#1e2a45', fontWeight: '500', borderRadius: '8px', border: '1px solid #dbd5ca', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Contacts Modal */}
      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30' }}>Upload Contacts</h2>
              <button onClick={() => { setShowUploadModal(false); setUploadFile(null); setUploadResult(null); setUploadCampaignId(''); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X style={{ width: '24px', height: '24px', color: '#99826a' }} />
              </button>
            </div>

            <form onSubmit={handleUploadContacts}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Campaign *</label>
                <select
                  value={uploadCampaignId}
                  onChange={(e) => setUploadCampaignId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white' }}
                >
                  <option value="">-- Select a campaign --</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>CSV File *</label>
                <div 
                  style={{ 
                    border: '2px dashed #dbd5ca', 
                    borderRadius: '12px', 
                    padding: '32px', 
                    textAlign: 'center', 
                    cursor: 'pointer',
                    backgroundColor: uploadFile ? '#f0fdf4' : '#f7f6f4',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => document.getElementById('csv-upload-input').click()}
                >
                  <input
                    id="csv-upload-input"
                    type="file"
                    accept=".csv"
                    onChange={(e) => { setUploadFile(e.target.files[0]); setUploadResult(null); }}
                    style={{ display: 'none' }}
                  />
                  {uploadFile ? (
                    <div>
                      <FileText style={{ width: '40px', height: '40px', color: '#059669', margin: '0 auto 8px' }} />
                      <p style={{ fontWeight: '500', color: '#059669' }}>{uploadFile.name}</p>
                      <p style={{ fontSize: '12px', color: '#99826a', marginTop: '4px' }}>{(uploadFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <Upload style={{ width: '40px', height: '40px', color: '#ab9a82', margin: '0 auto 8px' }} />
                      <p style={{ fontWeight: '500', color: '#1e2a45' }}>Click to select a CSV file</p>
                      <p style={{ fontSize: '12px', color: '#99826a', marginTop: '4px' }}>or drag and drop</p>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f7f6f4', borderRadius: '8px' }}>
                <p style={{ fontSize: '13px', color: '#755f4e', marginBottom: '4px' }}><strong>CSV Format:</strong></p>
                <p style={{ fontSize: '12px', color: '#99826a', fontFamily: 'monospace' }}>first_name, last_name, phone, email, property_address, notes</p>
              </div>

              {uploadResult && (
                <div style={{ 
                  marginBottom: '20px', 
                  padding: '16px', 
                  borderRadius: '8px', 
                  backgroundColor: uploadResult.errors > 0 ? '#fef3c7' : '#d1fae5',
                  border: `1px solid ${uploadResult.errors > 0 ? '#fde68a' : '#6ee7b7'}`
                }}>
                  <p style={{ fontWeight: '600', color: uploadResult.errors > 0 ? '#92400e' : '#065f46', marginBottom: '4px' }}>
                    Upload Complete
                  </p>
                  <p style={{ fontSize: '14px', color: uploadResult.errors > 0 ? '#a16207' : '#047857' }}>
                    {uploadResult.imported} contacts imported{uploadResult.errors > 0 ? `, ${uploadResult.errors} errors` : ''}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setShowUploadModal(false); setUploadFile(null); setUploadResult(null); setUploadCampaignId(''); }}
                  style={{ padding: '12px 24px', backgroundColor: '#f7f6f4', color: '#1e2a45', fontWeight: '500', borderRadius: '8px', border: '1px solid #dbd5ca', cursor: 'pointer' }}
                >
                  {uploadResult ? 'Done' : 'Cancel'}
                </button>
                {!uploadResult && (
                  <button
                    type="submit"
                    disabled={uploading || !uploadFile || !uploadCampaignId}
                    style={{ 
                      padding: '12px 24px', 
                      background: (uploading || !uploadFile || !uploadCampaignId) ? '#dbd5ca' : 'linear-gradient(to right, #deb040, #c8932f)', 
                      color: (uploading || !uploadFile || !uploadCampaignId) ? '#99826a' : '#151c30', 
                      fontWeight: '600', 
                      borderRadius: '8px', 
                      border: 'none', 
                      cursor: (uploading || !uploadFile || !uploadCampaignId) ? 'not-allowed' : 'pointer',
                      minWidth: '140px'
                    }}
                  >
                    {uploading ? 'Uploading...' : 'Upload Contacts'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div 
          style={{ 
            position: 'fixed', 
            bottom: '24px', 
            right: '24px', 
            padding: '16px 24px', 
            borderRadius: '12px', 
            backgroundColor: toast.type === 'success' ? '#059669' : '#dc2626',
            color: 'white',
            fontWeight: '500',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 100,
            animation: 'slideIn 0.3s ease'
          }}
        >
          {toast.type === 'success' ? (
            <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toast.message}
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
