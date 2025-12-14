import React, { useState, useEffect, useRef } from 'react';
import './CampaignList.css';
import ConfirmationModal from './modals/ConfirmationModal';
import EditCampaignModal from './modals/EditCampaignModal';

/**
 * CampaignList Component
 * Displays all published campaigns with payout progress tracking.
 *
 * Props:
 *   - campaigns: array of campaign objects (required)
 *     Each campaign should contain:
 *       {
 *         id: string,
 *         name: string,
 *         description: string,
 *         imageUrl: string,
 *         platform: 'TikTok' | 'YouTube',
 *         total_payout: number (budget),
 *         distributed_payout: number (amount paid to creators),
 *         rpm: number,
 *         createdAt: ISO string
 *       }
 *   - onCreate: function called when "Create Campaign" button is clicked
 *   - onDelete: function called when delete is confirmed
 *   - onUpdate: async function(campaignId, updatedData) => void for updating campaigns
 *   - onBackToLanding: optional function called when back button is clicked (for browse mode)
 *   - onLearnMore: optional function called when "How Campaigns Work" button is clicked
 *
 * Features:
 *   - Responsive grid layout (1-3 columns based on screen size)
 *   - Payout progress bar showing distributed vs total budget
 *   - Smooth animations and hover effects
 *   - Full accessibility support
 *   - Expanded campaign details modal
 *
 * Example Usage:
 * <CampaignList campaigns={campaignArray} onCreate={() => openModal()} />
 */

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

// Edit Icon
const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

// Delete Icon
const DeleteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

// Target Icon
const Target = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
    <path fill="#000000" d="M12 4.75a7.25 7.25 0 0 0-6.724 9.969a.75.75 0 1 1-1.39.562a8.75 8.75 0 1 1 4.832 4.832a.75.75 0 0 1 .563-1.39A7.25 7.25 0 1 0 12 4.75"></path>
    <path fill="#000000" d="M6.25 12c0 1.317.443 2.531 1.188 3.501l-.469.469l-.029.03H5.77a1.5 1.5 0 0 0-1.06.44l-1.637 1.637a.75.75 0 0 0 .53 1.28h1.04v1.04a.75.75 0 0 0 1.28.53l1.637-1.638A1.5 1.5 0 0 0 8 18.23v-1.17l.03-.029l.469-.468A5.75 5.75 0 1 0 6.25 12M12 7.75a4.25 4.25 0 1 1-2.428 7.739l1.646-1.647a2 2 0 1 0-1.06-1.06L8.51 14.427A4.25 4.25 0 0 1 12 7.75M6.94 17l.06.059v1.17a.5.5 0 0 1-.147.353l-1.21 1.21v-.935a.5.5 0 0 0-.5-.5h-.936l1.21-1.21A.5.5 0 0 1 5.771 17z"></path>
  </svg>
);

const CampaignList = ({ campaigns, onCreate, onDelete, onUpdate, onBackToLanding, onLearnMore }) => {
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, campaignId: null });
  const [editingCampaign, setEditingCampaign] = useState(null);

  // If no campaigns, still render the component to show the button and create option
  if (!campaigns) {
    campaigns = [];
  }

  /**
   * Compute distributed payout if not provided by backend.
   * Formula: total_impressions * rpm / 1000
   * If neither distributed_payout nor impressions available, returns 0.
   */
  const getDistributedPayout = (campaign) => {
    if (campaign.distributed_payout !== undefined && campaign.distributed_payout !== null) {
      return campaign.distributed_payout;
    }
    // Fallback: compute from impressions and RPM if available
    if (campaign.total_impressions && campaign.rpm) {
      return (campaign.total_impressions * campaign.rpm) / 1000;
    }
    // Default: no payout distributed yet
    return 0;
  };

  /**
   * Calculate payout percentage for progress bar.
   */
  const getPayoutPercentage = (campaign) => {
    const distributed = getDistributedPayout(campaign);
    const total = campaign.total_payout || campaign.budget || 0;
    if (total === 0) return 0;
    return Math.min((distributed / total) * 100, 100);
  };

  /**
   * Format date to readable format (e.g., "Dec 12, 2024")
   */
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  /**
   * Truncate text to specified length with ellipsis.
   */
  const truncateText = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const handleViewDetails = (campaign, e) => {
    e.stopPropagation();
    setSelectedCampaign(campaign);
  };

  const handleCloseDetails = () => {
    setSelectedCampaign(null);
  };

  const handleMenuToggle = (campaignId, e) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === campaignId ? null : campaignId);
  };

  const handleEditCampaign = (campaign, e) => {
    e.stopPropagation();
    setEditingCampaign(campaign);
    setOpenMenuId(null);
  };

  const handleDeleteCampaign = (campaignId, e) => {
    e.stopPropagation();
    setDeleteConfirm({ isOpen: true, campaignId });
    setOpenMenuId(null);
  };

  const handleConfirmDelete = () => {
    const campaignId = deleteConfirm.campaignId;
    if (onDelete && typeof onDelete === 'function') {
      const success = onDelete(campaignId);
      if (success) {
        console.log('Campaign deleted successfully:', campaignId);
        // Close details modal if it's open for this campaign
        if (selectedCampaign?.id === campaignId) {
          setSelectedCampaign(null);
        }
      } else {
        alert('Failed to delete campaign. Please try again.');
      }
    } else {
      console.error('onDelete callback not provided or not a function');
    }
    setDeleteConfirm({ isOpen: false, campaignId: null });
  };

  const handleCancelDelete = () => {
    setDeleteConfirm({ isOpen: false, campaignId: null });
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
    };

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  // Campaigns Grid
  return (
    <div className="campaign-list">
      <div className="campaigns-grid">
        {campaigns.map((campaign) => {
          const distributedPayout = getDistributedPayout(campaign);
          const totalPayout = campaign.total_payout || campaign.budget || 0;
          const payoutPercentage = getPayoutPercentage(campaign);

          return (
            <article
              key={campaign.id}
              className="campaign-card"
              role="region"
              aria-label={`Campaign: ${campaign.name}`}
            >
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

              {/* Campaign Content */}
              <div className="campaign-content">
                {/* Platform Badge */}
                <div className="campaign-platform-badge">
                  {campaign.platform === 'TikTok' ? <TikTokIcon /> : <YouTubeIcon />}
                  <span>{campaign.platform}</span>
                </div>

                {/* Campaign Name */}
                <h3 className="campaign-name">{campaign.name}</h3>

                {/* Campaign Metadata */}
                <div className="campaign-metadata">
                  <div className="metadata-item">
                    <span className="metadata-label">Budget:</span>
                    <span className="metadata-value">₱{totalPayout.toLocaleString()}</span>
                  </div>
                  <div className="metadata-item">
                    <span className="metadata-label">Price per 1K Views:</span>
                    <span className="metadata-value">₱{campaign.rpm && Number.isInteger(campaign.rpm) ? campaign.rpm : campaign.rpm?.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payout Progress Bar */}
                <div className="payout-section">
                  <div className="payout-label">
                    <span className="payout-title">Payout Progress</span>
                    <span className="payout-amount">
                      ₱{distributedPayout.toLocaleString(undefined, { maximumFractionDigits: 2 })} / ₱{totalPayout.toLocaleString()}
                    </span>
                  </div>
                  <div
                    className="payout-progress-container"
                    role="progressbar"
                    aria-valuenow={Math.round(payoutPercentage)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Payout progress: ${Math.round(payoutPercentage)}%`}
                  >
                    <div className="payout-progress-background">
                      <div
                        className="payout-progress-fill"
                        style={{ width: `${payoutPercentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="payout-percentage">
                    {Math.round(payoutPercentage)}% distributed
                  </div>
                </div>

                {/* View Details Button */}
                <button
                  onClick={(e) => handleViewDetails(campaign, e)}
                  className="view-details-btn"
                  aria-label={`View details for campaign: ${campaign.name}`}
                >
                  View Details
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Campaign Details Modal */}
      {selectedCampaign && (
        <div className="campaign-details-overlay" onClick={handleCloseDetails} onKeyDown={(e) => { if (e.key === 'Escape') handleCloseDetails(); }}>
          <div className="campaign-details-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="campaign-details-close"
              onClick={(e) => { e.stopPropagation(); handleCloseDetails(); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); handleCloseDetails(); } }}
              aria-label="Close campaign details"
              type="button"
            >
              ✕
            </button>

            {/* Modal Content */}
            <div className="campaign-details-content">
              {/* Campaign Image - Large */}
              <div className="details-image-container">
                {selectedCampaign.imageUrl ? (
                  <img
                    src={selectedCampaign.imageUrl}
                    alt={`Campaign: ${selectedCampaign.name}`}
                    className="details-image"
                  />
                ) : (
                  <div className="details-image-placeholder">📸</div>
                )}
              </div>

              {/* Campaign Info */}
              <div className="details-info">
                {/* Header Section */}
                <div className="details-header">
                  <div className="details-platform-badge">
                    {selectedCampaign.platform === 'TikTok' ? <TikTokIcon /> : <YouTubeIcon />}
                    <span>{selectedCampaign.platform}</span>
                  </div>
                  <h2 className="details-title">{selectedCampaign.name}</h2>
                  <p className="details-created">Created: {formatDate(selectedCampaign.createdAt)}</p>
                </div>

                {/* Description Section */}
                <div className="details-section">
                  <h3 className="details-section-title">Description</h3>
                  <p className="details-description">{selectedCampaign.description}</p>
                </div>

                {/* Campaign Details Grid */}
                <div className="details-grid">
                  <div className="details-item">
                    <span className="details-label">Total Budget</span>
                    <span className="details-value">₱{(selectedCampaign.total_payout || selectedCampaign.budget || 0).toLocaleString()}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Revenue Per 1K Views</span>
                    <span className="details-value">₱{selectedCampaign.rpm && Number.isInteger(selectedCampaign.rpm) ? selectedCampaign.rpm : selectedCampaign.rpm?.toFixed(2)}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Distributed Payout</span>
                    <span className="details-value">₱{getDistributedPayout(selectedCampaign).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Remaining Budget</span>
                    <span className="details-value">₱{((selectedCampaign.total_payout || selectedCampaign.budget || 0) - getDistributedPayout(selectedCampaign)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Payout Progress Section */}
                <div className="details-payout-section">
                  <h3 className="details-section-title">Payout Progress</h3>
                  <div className="payout-label">
                    <span className="payout-title">Distribution Status</span>
                    <span className="payout-amount">
                      ₱{getDistributedPayout(selectedCampaign).toLocaleString(undefined, { maximumFractionDigits: 2 })} / ₱{(selectedCampaign.total_payout || selectedCampaign.budget || 0).toLocaleString()}
                    </span>
                  </div>
                  <div
                    className="payout-progress-container"
                    role="progressbar"
                    aria-valuenow={Math.round(getPayoutPercentage(selectedCampaign))}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Payout progress: ${Math.round(getPayoutPercentage(selectedCampaign))}%`}
                  >
                    <div className="payout-progress-background">
                      <div
                        className="payout-progress-fill"
                        style={{ width: `${getPayoutPercentage(selectedCampaign)}%` }}
                      />
                    </div>
                  </div>
                  <div className="payout-percentage">
                    {Math.round(getPayoutPercentage(selectedCampaign))}% distributed
                  </div>
                </div>

                {/* Join Campaign Button */}
                <button className="join-campaign-btn" type="button">
                  Join Campaign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Empty State Message */}
      {campaigns.length === 0 && (
        <div className="campaigns-empty-state">
          <div className="empty-state-content">
            <div className="empty-state-icon" style={{ fontSize: '3.5rem' }}>
              <Target />
            </div>
            <h3>No campaigns available right now</h3>
            <p>New campaigns from businesses will appear here.</p>
            {onLearnMore && (
              <button 
                className="empty-state-learn-btn"
                onClick={onLearnMore}
                aria-label="Learn how campaigns work"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 16v-4"></path>
                  <path d="M12 8h.01"></path>
                </svg>
                <span>Learn How Campaigns Work</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
      isOpen={deleteConfirm.isOpen}
      title="Delete Campaign"
      message="Are you sure you want to delete this campaign? This action cannot be undone and all campaign data will be permanently removed."
      confirmText="Delete Campaign"
      cancelText="Keep Campaign"
      confirmButtonType="danger"
      onConfirm={handleConfirmDelete}
      onCancel={handleCancelDelete}
    />

    {/* Edit Campaign Modal */}
    <EditCampaignModal
      campaign={editingCampaign}
      isOpen={!!editingCampaign}
      onClose={() => setEditingCampaign(null)}
      onUpdate={onUpdate}
    />

    {/* How Campaigns Work Floating Button - Only when campaigns are available */}
    {campaigns.length > 0 && onLearnMore && (
      <button 
        className="how-campaigns-work-btn"
        onClick={onLearnMore}
        aria-label="Learn how campaigns work"
        title="How Campaigns Work"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 16v-4"></path>
          <path d="M12 8h.01"></path>
        </svg>
        <span>How it Works</span>
      </button>
    )}
    </div>
  );
};

export default CampaignList;
