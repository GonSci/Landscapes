import React, { useState } from 'react';
import './CampaignList.css';

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

const CampaignList = ({ campaigns, onCreate }) => {
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  // If campaigns is empty or not provided, return null
  if (!campaigns || campaigns.length === 0) {
    return null;
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

  // Campaigns Grid
  return (
    <div className="campaign-list">
      <div className="campaigns-grid">
        {/* Create Campaign Button - First Item in Grid */}
        {onCreate && (
          <div className="campaign-create-card" onClick={onCreate} role="button" tabIndex={0} aria-label="Create a new campaign" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCreate(); } }}>
            <div className="create-card-icon">✨</div>
            <h3>Create New Campaign</h3>
            <p>Launch a new marketing campaign</p>
          </div>
        )}
        
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
                  {campaign.platform === 'TikTok' ? '🎵' : '▶️'} {campaign.platform}
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
                    <span className="metadata-value">₱{campaign.rpm.toFixed(2)}</span>
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
                    {selectedCampaign.platform === 'TikTok' ? '🎵' : '▶️'} {selectedCampaign.platform}
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
                    <span className="details-value">₱{selectedCampaign.rpm.toFixed(2)}</span>
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignList;
