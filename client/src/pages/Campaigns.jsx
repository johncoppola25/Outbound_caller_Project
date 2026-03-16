import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Users,
  Phone,
  ChevronRight,
  Sparkles,
  Trash2
} from 'lucide-react';
import CreateCampaignModal from '../components/CreateCampaignModal';
import AdminUserFilter from '../components/AdminUserFilter';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Campaigns() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [selectedUserId]);

  async function fetchCampaigns() {
    try {
      const res = await apiFetch(`/api/campaigns${selectedUserId ? `?userId=${selectedUserId}` : ''}`);
      const data = await res.json();
      setCampaigns(data);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteCampaign(id, e) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await apiFetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      setCampaigns(campaigns.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting campaign:', err);
    }
  }

  const filteredCampaigns = campaigns.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const typeColors = {
    pre_foreclosure: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    cash_buyer: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
    short_sale: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
    live_verification: { bg: '#eef2ff', color: '#4f46e5', border: '#c7d2fe' },
    follow_up: { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
    voicemail_drop: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
    sms_follow_up: { bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe' },
    appointment: { bg: '#ecfeff', color: '#0891b2', border: '#a5f3fc' },
    outreach: { bg: '#faf5ff', color: '#9333ea', border: '#e9d5ff' }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
      <Helmet>
        <title>Campaigns - OutReach AI</title>
        <meta name="description" content="Create and manage AI outbound calling campaigns for your real estate business." />
      </Helmet>
        <div style={{ width: '36px', height: '36px', border: '3px solid #e5e7eb', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#111827', letterSpacing: '-0.03em' }}>Campaigns</h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Manage your AI outreach campaigns</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px',
            background: '#4f46e5',
            color: 'white', fontWeight: '600', borderRadius: '10px',
            border: 'none', cursor: 'pointer', fontSize: '14px',
            boxShadow: '0 1px 3px rgba(79,70,229,0.3)',
            transition: 'all 0.2s'
          }}
        >
          <Plus style={{ width: '18px', height: '18px' }} />
          New Campaign
        </button>
      </div>

      {/* Search + Admin Filter */}
      <div style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
        {isAdmin && (
          <AdminUserFilter selectedUserId={selectedUserId} onUserChange={setSelectedUserId} />
        )}
        <div style={{ position: 'relative', maxWidth: isMobile ? '100%' : '400px', flex: 1 }}>
          <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '10px 16px 10px 42px',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '10px', fontSize: '14px', outline: 'none',
              color: '#111827', transition: 'border-color 0.2s'
            }}
            onFocus={e => e.target.style.borderColor = '#4f46e5'}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          />
        </div>
      </div>

      {/* Campaign Grid */}
      {filteredCampaigns.length === 0 ? (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px', padding: '60px', textAlign: 'center',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '12px',
            background: '#f9fafb', border: '1px solid #e5e7eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <Sparkles style={{ width: '28px', height: '28px', color: '#9ca3af' }} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
            {searchQuery ? 'No campaigns found' : 'Create your first campaign'}
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px', fontSize: '14px' }}>
            {searchQuery ? 'Try adjusting your search terms' : 'Set up an AI-powered outreach campaign to start connecting with your clients.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px',
                background: '#4f46e5',
                color: 'white', fontWeight: '600', borderRadius: '10px',
                border: 'none', cursor: 'pointer', fontSize: '14px'
              }}
            >
              <Plus style={{ width: '18px', height: '18px' }} />
              Create Campaign
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {filteredCampaigns.map((campaign, i) => {
            const colors = typeColors[campaign.type] || { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' };
            return (
              <Link
                key={campaign.id}
                to={`/campaigns/${campaign.id}`}
                style={{
                  background: '#ffffff',
                  borderRadius: '12px', overflow: 'hidden', textDecoration: 'none',
                  display: 'block', border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s ease',
                  animation: `fadeIn 0.4s ease-out ${i * 0.05}s both`
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ padding: '22px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px',
                        borderRadius: '6px', fontSize: '11px', fontWeight: '600',
                        backgroundColor: colors.bg, color: colors.color,
                        border: `1px solid ${colors.border}`,
                        letterSpacing: '0.03em', textTransform: 'uppercase'
                      }}>
                        {campaign.type.replace('_', ' ')}
                      </span>
                      <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#111827', marginTop: '10px', letterSpacing: '-0.02em' }}>
                        {campaign.name}
                      </h3>
                      {campaign.description && (
                        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px', lineHeight: '1.4' }}>
                          {campaign.description.substring(0, 60)}...
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => deleteCampaign(campaign.id, e)}
                      style={{
                        padding: '6px', background: 'transparent', border: 'none',
                        cursor: 'pointer', borderRadius: '6px', color: '#d1d5db',
                        transition: 'color 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}
                    >
                      <Trash2 style={{ width: '15px', height: '15px' }} />
                    </button>
                  </div>

                  {/* Stats */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px',
                    padding: '14px 0',
                    borderTop: '1px solid #f3f4f6',
                    borderBottom: '1px solid #f3f4f6'
                  }}>
                    {[
                      { icon: Users, value: campaign.contact_count || 0, label: 'Contacts' },
                      { icon: Phone, value: campaign.call_count || 0, label: 'Calls' },
                      { icon: null, value: campaign.completed_calls || 0, label: 'Done' }
                    ].map((stat) => (
                      <div key={stat.label} style={{ textAlign: 'center' }}>
                        {stat.icon && <stat.icon style={{ width: '14px', height: '14px', color: '#9ca3af', margin: '0 auto 4px' }} />}
                        <p style={{ fontSize: '18px', fontWeight: '700', color: '#111827' }}>{stat.value}</p>
                        <p style={{ fontSize: '11px', color: '#9ca3af' }}>{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px' }}>
                    <span className={`status-badge status-${campaign.status}`}>
                      {campaign.status}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#4f46e5', fontWeight: '500' }}>
                      Details <ChevronRight style={{ width: '14px', height: '14px' }} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <CreateCampaignModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(campaign) => {
            setCampaigns([campaign, ...campaigns]);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}
