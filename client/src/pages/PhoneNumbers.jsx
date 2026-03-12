import { useState, useEffect } from 'react';
import { Phone, Search, Plus, Trash2, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function PhoneNumbers() {
  const [areaCode, setAreaCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [myNumbers, setMyNumbers] = useState([]);
  const [purchasing, setPurchasing] = useState(null);
  const [releasing, setReleasing] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchMyNumbers();
  }, []);

  const fetchMyNumbers = async () => {
    try {
      const res = await apiFetch('/api/phone-numbers/my-numbers');
      if (res.ok) {
        const data = await res.json();
        setMyNumbers(data);
      }
    } catch (e) { /* ignore */ }
  };

  const searchNumbers = async () => {
    if (!areaCode || areaCode.length !== 3) {
      setError('Please enter a 3-digit area code.');
      return;
    }
    setError('');
    setSuccess('');
    setSearching(true);
    setAvailableNumbers([]);
    try {
      const res = await apiFetch(`/api/phone-numbers/search?area_code=${areaCode}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableNumbers(data);
        if (data.length === 0) setError('No numbers available for this area code. Try another.');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to search numbers.');
      }
    } catch (e) {
      setError('Failed to search numbers.');
    }
    setSearching(false);
  };

  const purchaseNumber = async (phoneNumber) => {
    setPurchasing(phoneNumber);
    setError('');
    setSuccess('');
    try {
      const res = await apiFetch('/api/phone-numbers/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Successfully purchased ${phoneNumber}`);
        setAvailableNumbers(prev => prev.filter(n => n.phone_number !== phoneNumber));
        fetchMyNumbers();
      } else {
        setError(data.error || 'Failed to purchase number.');
      }
    } catch (e) {
      setError('Failed to purchase number.');
    }
    setPurchasing(null);
  };

  const releaseNumber = async (id) => {
    if (!confirm('Are you sure you want to release this number? This cannot be undone.')) return;
    setReleasing(id);
    setError('');
    setSuccess('');
    try {
      const res = await apiFetch(`/api/phone-numbers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('Number released successfully.');
        fetchMyNumbers();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to release number.');
      }
    } catch (e) {
      setError('Failed to release number.');
    }
    setReleasing(null);
  };

  const formatPhone = (num) => {
    if (!num) return '';
    const cleaned = num.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned[0] === '1') {
      return `(${cleaned.slice(1,4)}) ${cleaned.slice(4,7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
    }
    return num;
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: 0 }}>Phone Numbers</h1>
        <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>Search and purchase phone numbers for your campaigns</p>
      </div>

      {/* Messages */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px',
          background: '#fef2f2', borderRadius: '10px', marginBottom: '16px',
          border: '1px solid #fecaca'
        }}>
          <AlertCircle size={16} color="#dc2626" />
          <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: '500' }}>{error}</span>
        </div>
      )}
      {success && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px',
          background: '#ecfdf5', borderRadius: '10px', marginBottom: '16px',
          border: '1px solid #a7f3d0'
        }}>
          <CheckCircle size={16} color="#059669" />
          <span style={{ fontSize: '13px', color: '#059669', fontWeight: '500' }}>{success}</span>
        </div>
      )}

      {/* My Numbers */}
      <div style={{
        background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginBottom: '24px', overflow: 'hidden'
      }}>
        <div style={{
          padding: '18px 20px', borderBottom: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <Phone size={18} color="#4f46e5" />
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>My Numbers</h2>
          <span style={{
            fontSize: '11px', fontWeight: '600', background: '#eef2ff', color: '#4f46e5',
            padding: '2px 8px', borderRadius: '10px'
          }}>{myNumbers.length}</span>
        </div>
        {myNumbers.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af' }}>
            <Phone size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontSize: '14px', fontWeight: '500' }}>No numbers purchased yet</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Search by area code below to find and purchase numbers</p>
          </div>
        ) : (
          <div style={{ padding: '8px' }}>
            {myNumbers.map(num => (
              <div key={num.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: '10px', marginBottom: '4px',
                background: '#f9fafb', border: '1px solid #f3f4f6'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Phone size={16} color="#059669" />
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>
                      {formatPhone(num.phone_number)}
                    </p>
                    <p style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0 0' }}>
                      {num.status === 'active' ? 'Active' : num.status} &middot; Purchased {new Date(num.purchased_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => releaseNumber(num.id)}
                  disabled={releasing === num.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '7px 12px', borderRadius: '8px', border: '1px solid #fecaca',
                    background: '#fff', cursor: 'pointer', fontSize: '12px',
                    color: '#dc2626', fontWeight: '500', transition: 'background 0.1s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  {releasing === num.id ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
                  Release
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search Numbers */}
      <div style={{
        background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden'
      }}>
        <div style={{
          padding: '18px 20px', borderBottom: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <Search size={18} color="#4f46e5" />
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>Search Available Numbers</h2>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input
              type="text"
              value={areaCode}
              onChange={e => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
              placeholder="Area code (e.g. 212)"
              onKeyDown={e => e.key === 'Enter' && searchNumbers()}
              style={{
                flex: 1, maxWidth: '200px', padding: '10px 14px', borderRadius: '10px',
                border: '1.5px solid #e5e7eb', fontSize: '14px', outline: 'none',
                transition: 'border-color 0.15s'
              }}
              onFocus={e => e.target.style.borderColor = '#4f46e5'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
            <button
              onClick={searchNumbers}
              disabled={searching}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px', borderRadius: '10px', border: 'none',
                background: '#4f46e5', color: '#fff', fontSize: '13px',
                fontWeight: '600', cursor: 'pointer', transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#4338ca'}
              onMouseLeave={e => e.currentTarget.style.background = '#4f46e5'}
            >
              {searching ? <Loader2 size={15} className="spin" /> : <Search size={15} />}
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Results */}
          {availableNumbers.length > 0 && (
            <div>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px', fontWeight: '500' }}>
                {availableNumbers.length} numbers available
              </p>
              <div style={{ display: 'grid', gap: '8px' }}>
                {availableNumbers.map(num => (
                  <div key={num.phone_number} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: '10px',
                    border: '1px solid #e5e7eb', background: '#fafafa',
                    transition: 'border-color 0.1s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#4f46e5'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                  >
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>
                        {formatPhone(num.phone_number)}
                      </p>
                      <p style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0 0' }}>
                        {num.region}{num.rate_center ? ` - ${num.rate_center}` : ''}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#059669' }}>
                        $1.00
                      </span>
                      <button
                        onClick={() => purchaseNumber(num.phone_number)}
                        disabled={purchasing === num.phone_number}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '8px 14px', borderRadius: '8px', border: 'none',
                          background: '#059669', color: '#fff', fontSize: '12px',
                          fontWeight: '600', cursor: 'pointer', transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#047857'}
                        onMouseLeave={e => e.currentTarget.style.background = '#059669'}
                      >
                        {purchasing === num.phone_number ? (
                          <Loader2 size={13} className="spin" />
                        ) : (
                          <Plus size={13} />
                        )}
                        {purchasing === num.phone_number ? 'Purchasing...' : 'Purchase'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
