import { useState, useEffect } from 'react';
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

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCampaigns();
  }, []);

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

  async function deleteCampaign(id, e) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    
    try {
      await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
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
    pre_foreclosure: { bg: '#fee2e2', color: '#dc2626' },
    cash_buyer: { bg: '#d1fae5', color: '#059669' },
    short_sale: { bg: '#fbf7e8', color: '#a67328' },
    live_verification: { bg: '#dbeafe', color: '#2563eb' },
    follow_up: { bg: '#ede9fe', color: '#7c3aed' },
    voicemail_drop: { bg: '#fef3c7', color: '#d97706' },
    sms_follow_up: { bg: '#e0e7ff', color: '#4f46e5' },
    appointment: { bg: '#cffafe', color: '#0891b2' },
    outreach: { bg: '#f3e8ff', color: '#9333ea' }
  };

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
          <h1 style={{ fontSize: '30px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30' }}>Campaigns</h1>
          <p style={{ color: '#8c735e', marginTop: '4px' }}>Manage your AI outreach campaigns</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '12px 24px',
            background: 'linear-gradient(to right, #deb040, #c8932f)',
            color: '#151c30',
            fontWeight: '600',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          <Plus style={{ width: '20px', height: '20px', marginRight: '8px' }} />
          New Campaign
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#ab9a82' }} />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 48px',
              border: '1px solid #dbd5ca',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Campaign Grid */}
      {filteredCampaigns.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '48px', textAlign: 'center', boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)' }}>
          <div style={{ width: '64px', height: '64px', backgroundColor: '#edeae5', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Sparkles style={{ width: '32px', height: '32px', color: '#ab9a82' }} />
          </div>
          <h3 style={{ fontSize: '20px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30', marginBottom: '8px' }}>
            {searchQuery ? 'No campaigns found' : 'Create your first campaign'}
          </h3>
          <p style={{ color: '#99826a', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
            {searchQuery ? 'Try adjusting your search terms' : 'Set up an AI-powered outreach campaign to start connecting with your clients.'}
          </p>
          {!searchQuery && (
            <button 
              onClick={() => setShowCreateModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '12px 24px',
                backgroundColor: '#1e2a45',
                color: 'white',
                fontWeight: '500',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Plus style={{ width: '20px', height: '20px', marginRight: '8px' }} />
              Create Campaign
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          {filteredCampaigns.map((campaign) => {
            const colors = typeColors[campaign.type] || { bg: '#edeae5', color: '#755f4e' };
            return (
              <Link
                key={campaign.id}
                to={`/campaigns/${campaign.id}`}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)',
                  overflow: 'hidden',
                  textDecoration: 'none',
                  display: 'block',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
              >
                <div style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <span style={{ 
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: colors.bg,
                        color: colors.color
                      }}>
                        {campaign.type.replace('_', ' ')}
                      </span>
                      <h3 style={{ fontSize: '18px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30', marginTop: '8px' }}>
                        {campaign.name}
                      </h3>
                      {campaign.description && (
                        <p style={{ fontSize: '14px', color: '#99826a', marginTop: '4px' }}>
                          {campaign.description.substring(0, 60)}...
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => deleteCampaign(campaign.id, e)}
                      style={{
                        padding: '8px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        color: '#ab9a82'
                      }}
                    >
                      <Trash2 style={{ width: '16px', height: '16px' }} />
                    </button>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '16px 0', borderTop: '1px solid #edeae5', borderBottom: '1px solid #edeae5' }}>
                    <div style={{ textAlign: 'center' }}>
                      <Users style={{ width: '16px', height: '16px', color: '#99826a', margin: '0 auto' }} />
                      <p style={{ fontSize: '18px', fontWeight: '600', color: '#1e2a45', marginTop: '4px' }}>{campaign.contact_count || 0}</p>
                      <p style={{ fontSize: '12px', color: '#ab9a82' }}>Contacts</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <Phone style={{ width: '16px', height: '16px', color: '#99826a', margin: '0 auto' }} />
                      <p style={{ fontSize: '18px', fontWeight: '600', color: '#1e2a45', marginTop: '4px' }}>{campaign.call_count || 0}</p>
                      <p style={{ fontSize: '12px', color: '#ab9a82' }}>Calls</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '18px', fontWeight: '600', color: '#1e2a45', marginTop: '4px' }}>{campaign.completed_calls || 0}</p>
                      <p style={{ fontSize: '12px', color: '#ab9a82' }}>Done</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
                    <span className={`status-badge status-${campaign.status}`}>
                      {campaign.status}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', color: '#deb040', fontWeight: '500' }}>
                      View Details <ChevronRight style={{ width: '16px', height: '16px' }} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Campaign Modal */}
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
