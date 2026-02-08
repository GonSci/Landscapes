import React, { useState } from 'react';
import './BusinessDashboard.css';
import EditCampaignModal from './modals/EditCampaignModal';

/**
 * BusinessDashboard Component
 * Displays the dashboard for business owners to view and manage all their campaigns.
 * 
 * Props:
 *   - campaigns: array - Array of all campaigns created by the business owner
 *   - onCreateAnother: function() => void - Called when user wants to create another campaign
 *   - onBack: function() => void - Called when user wants to go back to landing page
 *   - onEdit: function(campaignId) => void - Called when user wants to edit a campaign
 *   - onDelete: function(campaignId) => void - Called when user wants to delete a campaign
 */

// Edit Icon
const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

// Delete Icon
const DeleteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

// TikTok Logo Icon
const TikTokIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02c.08 1.53.63 3.09 1.75 4.17c1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97c-.57-.26-1.1-.59-1.62-.93c-.01 2.92.01 5.84-.02 8.75c-.08 1.4-.54 2.79-1.35 3.94c-1.31 1.92-3.58 3.17-5.91 3.21c-1.43.08-2.86-.31-4.08-1.03c-2.02-1.19-3.44-3.37-3.65-5.71c-.02-.5-.03-1-.01-1.49c.18-1.9 1.12-3.72 2.58-4.96c1.66-1.44 3.98-2.13 6.15-1.72c.02 1.48-.04 2.96-.04 4.44c-.99-.32-2.15-.23-3.02.37c-.63.41-1.11 1.04-1.36 1.75c-.21.51-.15 1.07-.14 1.61c.24 1.64 1.82 3.02 3.5 2.87c1.12-.01 2.19-.66 2.77-1.61c.19-.33.4-.67.41-1.06c.1-1.79.06-3.57.07-5.36c.01-4.03-.01-8.05.02-12.07z"/>
  </svg>
);

// YouTube Logo Icon
const YouTubeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

// Target Icon
const Target = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
    <path fill="currentColor" d="M12 4.75a7.25 7.25 0 0 0-6.724 9.969a.75.75 0 1 1-1.39.562a8.75 8.75 0 1 1 4.832 4.832a.75.75 0 0 1 .563-1.39A7.25 7.25 0 1 0 12 4.75"></path>
    <path fill="currentColor" d="M6.25 12c0 1.317.443 2.531 1.188 3.501l-.469.469l-.029.03H5.77a1.5 1.5 0 0 0-1.06.44l-1.637 1.637a.75.75 0 0 0 .53 1.28h1.04v1.04a.75.75 0 0 0 1.28.53l1.637-1.638A1.5 1.5 0 0 0 8 18.23v-1.17l.03-.029l.469-.468A5.75 5.75 0 1 0 6.25 12M12 7.75a4.25 4.25 0 1 1-2.428 7.739l1.646-1.647a2 2 0 1 0-1.06-1.06L8.51 14.427A4.25 4.25 0 0 1 12 7.75M6.94 17l.06.059v1.17a.5.5 0 0 1-.147.353l-1.21 1.21v-.935a.5.5 0 0 0-.5-.5h-.936l1.21-1.21A.5.5 0 0 1 5.771 17z"></path>
  </svg>
);

const BusinessDashboard = ({ campaigns = [], onCreateAnother, onBack, onEdit, onDelete }) => {
  const [editingCampaign, setEditingCampaign] = useState(null);

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="business-dashboard">
        <div className="dashboard-error">
          <div className="error-icon">
            <Target />
          </div>
          <h2>No Campaigns Yet</h2>
          <p>Create your first campaign to get started.</p>
          <div className="error-actions">
            <button className="btn-primary" onClick={onCreateAnother}>
              Create Campaign
            </button>
            <button className="btn-secondary" onClick={onBack}>
              How It Works
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="business-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Campaign Dashboard</h1>
        <p>Manage and track all your campaigns</p>
      </div>

      {/* All Campaigns */}
      <div className="campaigns-list">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="dashboard-campaign-card">
            {/* Campaign Image */}
            <div className="campaign-image-container">
              {campaign.imageUrl ? (
                <img
                  src={campaign.imageUrl}
                  alt={`Campaign: ${campaign.name}`}
                  className="campaign-image"
                />
              ) : (
                <div className="campaign-image-placeholder">📸</div>
              )}
            </div>

            {/* Campaign Info */}
            <div className="campaign-info">
              {/* Platform Badge */}
              <div className="campaign-platform-badge">
                {campaign.platform === 'TikTok' ? <TikTokIcon /> : <YouTubeIcon />}
                <span>{campaign.platform}</span>
              </div>

              {/* Campaign Name */}
              <h2 className="campaign-name">{campaign.name}</h2>

              {/* Campaign Description */}
              <p className="campaign-description">{campaign.description}</p>

              {/* Campaign Metadata */}
              <div className="campaign-metadata">
                <div className="metadata-item">
                  <span className="metadata-label">Total Budget:</span>
                  <span className="metadata-value">₱{campaign.total_payout?.toLocaleString() || '0'}</span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Price per 1K Views:</span>
                  <span className="metadata-value">₱{campaign.rpm && Number.isInteger(campaign.rpm) ? campaign.rpm : campaign.rpm?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Created:</span>
                  <span className="metadata-value">{new Date(campaign.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="payout-section">
                <div className="payout-label">
                  <span>Distributed Payout</span>
                  <span className="payout-amount">
                    ₱{campaign.distributed_payout?.toLocaleString() || '0'} / ₱{campaign.total_payout?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{
                      width: `${campaign.total_payout > 0 ? (campaign.distributed_payout / campaign.total_payout * 100) : 0}%`
                    }}
                  ></div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="campaign-actions">
                {onEdit && (
                  <button className="btn-action btn-edit" onClick={() => setEditingCampaign(campaign)}>
                    <EditIcon />
                    <span>Edit Campaign</span>
                  </button>
                )}
                {onDelete && (
                  <button className="btn-action btn-delete" onClick={() => onDelete(campaign.id)}>
                    <DeleteIcon />
                    <span>Delete Campaign</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Call to Action Buttons */}
      <div className="dashboard-actions">
        <button className="btn-primary btn-create-another" onClick={onCreateAnother}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Create Another Campaign
        </button>
        {onBack && (
          <button className="btn-secondary btn-back" onClick={onBack}>
            How It Works
          </button>
        )}
      </div>

      {/* Tips Section */}
      <div className="dashboard-tips">
        <h3>Tips for Campaign Success</h3>
        <ul>
          <li>Monitor your campaign performance regularly</li>
          <li>Track engagement metrics to optimize future campaigns</li>
          <li>Respond quickly to creator inquiries</li>
          <li>Provide clear guidelines for content creators</li>
        </ul>
      </div>

      {/* Edit Campaign Modal */}
      <EditCampaignModal
        campaign={editingCampaign}
        isOpen={!!editingCampaign}
        onClose={() => setEditingCampaign(null)}
        onUpdate={onEdit}
      />
    </div>
  );
};

export default BusinessDashboard;
