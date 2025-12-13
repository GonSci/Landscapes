import React, { useState, useRef, useEffect } from 'react';
import './CampaignSection.css';

/**
 * SVG Icons for Campaign Landing Page
 */
const CreateCampaignIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1"></circle>
    <path d="M12 1v6m0 6v6"></path>
    <path d="M4.22 4.22l4.24 4.24m2.12 2.12l4.24 4.24"></path>
    <path d="M1 12h6m6 0h6"></path>
    <path d="M4.22 19.78l4.24-4.24m2.12-2.12l4.24-4.24"></path>
  </svg>
);

const BrowseCampaignsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
    <polyline points="17 2 12 7 7 2"></polyline>
  </svg>
);

const BusinessOwnerIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
    <polyline points="13 2 13 9 20 9"></polyline>
    <path d="M9 15h2"></path>
    <path d="M13 15h2"></path>
    <path d="M9 19h2"></path>
    <path d="M13 19h2"></path>
  </svg>
);

const CreatorIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"></path>
  </svg>
);

const VideoIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"></polygon>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
  </svg>
);

const AnalyticsIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="12 3 20 7.5 20 16.5 12 21 4 16.5 4 7.5 12 3"></polyline>
    <polyline points="12 12.5 20 7.5"></polyline>
    <polyline points="12 21 12 12.5"></polyline>
    <polyline points="4 7.5 12 12.5"></polyline>
  </svg>
);

const EarningsIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1"></circle>
    <path d="M12 1v6m0 6v6"></path>
    <path d="M4.22 4.22l4.24 4.24m2.12 2.12l4.24 4.24"></path>
    <path d="M1 12h6m6 0h6"></path>
    <path d="M4.22 19.78l4.24-4.24m2.12-2.12l4.24-4.24"></path>
  </svg>
);

const ArrowIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="5 12 19 12"></polyline>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);

const ViewTrackingIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const PayoutIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="22"></line>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    <path d="M6 21l3-3"></path>
    <path d="M18 3l3 3"></path>
  </svg>
);

const PlatformIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"></polygon>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
  </svg>
);

const OnboardingIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="12 3 20 7.5 20 16.5 12 21 4 16.5 4 7.5 12 3"></polyline>
    <polyline points="12 12.5 20 7.5"></polyline>
    <polyline points="12 21 12 12.5"></polyline>
    <polyline points="4 7.5 12 12.5"></polyline>
  </svg>
);

/**
 * CampaignLandingPage Component
 * Main landing page for the Campaigns section featuring dual-sided portal concept.
 * Presents separate value propositions for business owners and creators.
 * 
 * Props:
 *   - onCreateCampaign: function() => void
 *     Called when "Create Campaign" button is clicked
 *   - onBrowseCampaigns: function() => void
 *     Called when "Browse Campaigns" button is clicked
 */
const CampaignLandingPage = ({ onCreateCampaign = () => {}, onBrowseCampaigns = () => {} }) => {
  const handleCreateCampaign = () => {
    onCreateCampaign();
  };

  const handleBrowseCampaigns = () => {
    onBrowseCampaigns();
  };

  // Drag-to-scroll functionality with scale effect
  useEffect(() => {
    const scrollContainer = document.querySelector('.flow-steps-scroll');
    const cards = document.querySelectorAll('.flow-step-card');
    
    if (!scrollContainer || cards.length === 0) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    const onMouseDown = (e) => {
      isDown = true;
      startX = e.pageX - scrollContainer.offsetLeft;
      scrollLeft = scrollContainer.scrollLeft;
      scrollContainer.style.cursor = 'grabbing';
      scrollContainer.style.scrollBehavior = 'auto';
    };

    const onMouseLeave = () => {
      isDown = false;
      scrollContainer.style.cursor = 'grab';
      scrollContainer.style.scrollBehavior = 'smooth';
    };

    const onMouseUp = () => {
      isDown = false;
      scrollContainer.style.cursor = 'grab';
      scrollContainer.style.scrollBehavior = 'smooth';
    };

    const onMouseMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - scrollContainer.offsetLeft;
      const walk = (x - startX) * 1.5;
      scrollContainer.scrollLeft = scrollLeft - walk;
    };

    // Update card scales based on scroll position
    const updateCardScales = () => {
      const containerWidth = scrollContainer.clientWidth;
      const containerCenter = containerWidth / 2;

      cards.forEach((card) => {
        const cardRect = card.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();
        
        // Calculate card's position relative to container
        const cardCenter = cardRect.left - containerRect.left + cardRect.width / 2;
        
        // Calculate distance from viewport center
        const distance = Math.abs(cardCenter - containerCenter);
        
        // Calculate scale: 1 at center, smaller as distance increases
        const maxDistance = containerWidth / 2;
        const scale = Math.max(0.7, 1 - (distance / maxDistance) * 0.3);
        
        // Apply transform with smooth transition
        card.style.transform = `scale(${scale})`;

        // Enhanced glow for center card
        const article = card.querySelector('article');
        if (article) {
          const isNearCenter = distance < containerWidth * 0.15; // 15% of container width
          if (isNearCenter) {
            article.style.boxShadow = `
              0 8px 32px rgba(102, 126, 234, 0.25),
              0 0 20px rgba(102, 126, 234, 0.15)
            `;
          } else {
            article.style.boxShadow = '';
          }
        }
      });
    };

    // Listen to scroll events
    scrollContainer.addEventListener('scroll', updateCardScales, { passive: true });
    scrollContainer.addEventListener('mousedown', onMouseDown);
    scrollContainer.addEventListener('mouseleave', onMouseLeave);
    scrollContainer.addEventListener('mouseup', onMouseUp);
    scrollContainer.addEventListener('mousemove', onMouseMove);

    // Initial scale update
    updateCardScales();

    return () => {
      scrollContainer.removeEventListener('scroll', updateCardScales);
      scrollContainer.removeEventListener('mousedown', onMouseDown);
      scrollContainer.removeEventListener('mouseleave', onMouseLeave);
      scrollContainer.removeEventListener('mouseup', onMouseUp);
      scrollContainer.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <div className="campaign-landing-container">
      {/* Hero Section - Dual Sided Portal */}
      <section className="campaign-hero">
        <div className="campaign-hero-left">
          <h2>Run High-Performance Video Campaigns</h2>
          <p>Connect with talented creators and showcase your brand to thousands of viewers. Manage everything in one place.</p>
          <button onClick={handleCreateCampaign} className="campaign-hero-btn campaign-hero-btn-left">
            <CreateCampaignIcon /> Create a Campaign
          </button>
        </div>
        <div className="campaign-hero-divider"></div>
        <div className="campaign-hero-right">
          <h2>Earn Money by Posting Videos</h2>
          <p>Join campaigns that match your style and audience. Get paid for every 1000 views and grow your income stream.</p>
          <button onClick={handleBrowseCampaigns} className="campaign-hero-btn campaign-hero-btn-right">
            <BrowseCampaignsIcon /> Browse Campaigns
          </button>
        </div>
      </section>

      {/* What Are Campaigns Section */}
      <section className="campaign-info-section">
        <div className="campaign-info-content">
          <h2>What Are Campaigns?</h2>
          <p>
            Campaigns are collaboration opportunities between businesses and content creators. Business owners define the scope, 
            audience, and compensation. Creators join campaigns that align with their niche, create engaging videos, and earn 
            payments based on performance metrics. It's a win-win: brands get authentic content, creators get paid.
          </p>
        </div>
      </section>

      {/* Campaign Flow Section - Grid Layout */}
      <section className="campaign-flow">
        <h2>How It Works</h2>
        <div className="flow-container">
          <ul className="flow-steps-scroll">
            <li className="flow-step-card">
              <article>
                <div className="step-icon"><BusinessOwnerIcon /></div>
                <a href="#"><span className="step-number">01</span> Create Campaign</a>
                <p>Business owners set budget, target audience, and video requirements</p>
              </article>
            </li>
            <li className="flow-step-card">
              <article>
                <div className="step-icon"><CreatorIcon /></div>
                <a href="#"><span className="step-number">02</span> Creators Apply</a>
                <p>Content creators browse and apply to campaigns matching their style</p>
              </article>
            </li>
            <li className="flow-step-card">
              <article>
                <div className="step-icon"><VideoIcon /></div>
                <a href="#"><span className="step-number">03</span> Upload Content</a>
                <p>Creators produce and upload high-quality video content</p>
              </article>
            </li>
            <li className="flow-step-card">
              <article>
                <div className="step-icon"><AnalyticsIcon /></div>
                <a href="#"><span className="step-number">04</span> Track Views</a>
                <p>Real-time analytics track views, engagement, and performance metrics</p>
              </article>
            </li>
            <li className="flow-step-card">
              <article>
                <div className="step-icon"><EarningsIcon /></div>
                <a href="#"><span className="step-number">05</span> Receive Earnings</a>
                <p>Creators earn and withdraw their payments once milestones are reached</p>
              </article>
            </li>
          </ul>
        </div>
      </section>

      {/* Campaign Highlights Section */}
      <section className="campaign-highlights">
        <h2>Campaign Highlights</h2>
        <div className="highlights-grid">
          <div className="highlight-card">
            <div className="highlight-icon"><ViewTrackingIcon /></div>
            <h3>Real-Time View Tracking</h3>
            <p>Monitor your video performance with live analytics. Track views, engagement, and ROI in real time.</p>
          </div>
          <div className="highlight-card">
            <div className="highlight-icon"><PayoutIcon /></div>
            <h3>Automatic Payout Progress</h3>
            <p>See your earnings grow as views accumulate. Progress bars show exactly when you'll reach payment thresholds.</p>
          </div>
          <div className="highlight-card">
            <div className="highlight-icon"><PlatformIcon /></div>
            <h3>Multi-Platform Support</h3>
            <p>Create campaigns for TikTok, YouTube, and more. Reach audiences wherever they spend their time.</p>
          </div>
          <div className="highlight-card">
            <div className="highlight-icon"><OnboardingIcon /></div>
            <h3>Easy Creator Onboarding</h3>
            <p>Simple application process. Creators can start earning within minutes of joining a campaign.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

/**
 * CampaignSection Component
 * Provides a UI for business owners to create marketing campaigns.
 * 
 * Props:
 *   - onCreate: async function(formData) => void
 *     Called when campaign form is submitted.
 *     formData contains: { name, description, budget, rpm, platform, imageFile, imagePreviewUrl }
 *     If not provided, logs formData to console.
 * 
 * Example Usage:
 * <CampaignSection onCreate={async (data) => {
 *   // Upload image to Firebase Storage or backend
 *   // const uploadedImageUrl = await uploadToFirebase(data.imageFile);
 *   // Then save campaign to backend:
 *   // await fetch("/api/campaigns", {
 *   //   method: "POST",
 *   //   headers: { "Content-Type": "application/json" },
 *   //   body: JSON.stringify({
 *   //     name: data.name,
 *   //     description: data.description,
 *   //     budget: data.budget,
 *   //     rpm: data.rpm,
 *   //     platform: data.platform,
 *   //     imageUrl: uploadedImageUrl
 *   //   })
 *   // });
 * }} />
 */

// Image Upload Icon
const ImageUploadIcon = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
);

const CampaignSection = ({ onCreate, hideHeader = false, onClose }) => {
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(hideHeader ? true : false);
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budget: '',
    rpm: '',
    platform: 'TikTok',
    imageFile: null
  });

  // Validation State
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Refs for focus management
  const createButtonRef = useRef(null);
  const modalContentRef = useRef(null);
  const nameInputRef = useRef(null);

  // Modal open handler - focus on first input
  const handleOpenModal = () => {
    setIsModalOpen(true);
    setErrors({});
    setTouched({});
    // Focus on first input after modal opens
    setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, 100);
  };

  // Modal close handler - return focus to button
  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
    // Always call parent's onClose callback if provided
    if (onClose) {
      onClose();
    }
    if (createButtonRef.current && !hideHeader) {
      createButtonRef.current.focus();
    }
  };

  // Consolidated effect for keyboard and modal focus handling
  useEffect(() => {
    if (!isModalOpen && !hideHeader) return;

    // Handle ESC key to close modal
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      }
    };

    // Focus on name input when modal opens
    const focusTimer = setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, 100);

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      clearTimeout(focusTimer);
    };
  }, [isModalOpen, hideHeader]);

  // Handle click outside modal
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      e.stopPropagation();
      handleCloseModal();
    }
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Campaign name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Campaign name must be 100 characters or less';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    if (!formData.budget) {
      newErrors.budget = 'Budget is required';
    } else if (isNaN(parseFloat(formData.budget)) || parseFloat(formData.budget) <= 0) {
      newErrors.budget = 'Budget must be a positive number';
    }

    if (!formData.rpm) {
      newErrors.rpm = 'RPM is required';
    } else if (isNaN(parseFloat(formData.rpm)) || parseFloat(formData.rpm) <= 0) {
      newErrors.rpm = 'RPM must be a positive number';
    }

    return newErrors;
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (touched[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle field blur to mark as touched
  const handleFieldBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    // Run validation on this field
    const newErrors = validateForm();
    if (newErrors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: newErrors[name]
      }));
    }
  };

  // Handle image file selection
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file is an image
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({
          ...prev,
          image: 'Please select a valid image file'
        }));
        return;
      }

      // Clean up previous preview URL
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }

      // Create new preview and update both states together
      const previewUrl = URL.createObjectURL(file);
      setImagePreviewUrl(previewUrl);
      setImageFile(file);
      // Only update error if there was one
      setErrors(prev => prev.image ? { ...prev, image: '' } : prev);
      
      // Reset file input
      e.target.value = '';
    }
  };

  // Handle image replacement
  const handleRemoveImage = (e) => {
    if (e) {
      e.preventDefault();
    }
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(null);
    setImageFile(null);
    
    // Reset the file input
    const fileInput = document.getElementById('campaign-image');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      budget: '',
      rpm: '',
      platform: 'TikTok',
      imageFile: null
    });
    setErrors({});
    setTouched({});
    handleRemoveImage();
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all fields as touched to show validation errors
    const allFields = ['name', 'description', 'budget', 'rpm'];
    setTouched(allFields.reduce((acc, field) => ({ ...acc, [field]: true }), {}));

    // Validate form
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Prepare form data for submission
    const submissionData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      budget: parseFloat(formData.budget),
      rpm: parseFloat(formData.rpm),
      platform: formData.platform,
      imageFile: imageFile  // Pass the actual file object
    };

    try {
      setIsLoading(true);

      // Call onCreate callback if provided, otherwise log to console
      if (typeof onCreate === 'function') {
        await onCreate(submissionData);
      } else {
        console.log('Campaign form submitted:', submissionData);
      }

      // Close modal and reset form on success
      handleCloseModal();
    } catch (error) {
      console.error('Error submitting campaign:', error);
      setErrors(prev => ({
        ...prev,
        submit: error.message || 'Failed to create campaign. Please try again.'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Determine if submit button should be disabled
  const isSubmitDisabled = isLoading || !formData.name.trim() || !formData.description.trim() || !formData.budget || !formData.rpm;

  return (
    <div className="campaign-section">
      {/* Campaign Header Section - Hidden when hideHeader is true */}
      {!hideHeader && (
        <div className="campaign-header">
          <div className="campaign-header-content">
            <h1>Marketing Campaigns</h1>
            <p>Create and manage your brand marketing campaigns with creators</p>
            <button
              ref={createButtonRef}
              onClick={handleOpenModal}
              className="create-campaign-btn"
              aria-label="Create a new marketing campaign"
            >
              ✨ Create Campaign
            </button>
          </div>
        </div>
      )}

      {/* Modal Overlay - Always show when hideHeader is true */}
      {(isModalOpen || hideHeader) && (
        <div
          className="campaign-modal-overlay"
          onClick={handleBackdropClick}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); handleCloseModal(); } }}
          role="presentation"
          tabIndex={-1}
        >
          {/* Modal Content */}
          <div
            className="campaign-modal"
            ref={modalContentRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="campaign-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="campaign-modal-header">
              <h2 id="campaign-modal-title">Create Marketing Campaign</h2>
              <button
                className="campaign-modal-close"
                onClick={(e) => { e.stopPropagation(); handleCloseModal(); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); handleCloseModal(); } }}
                aria-label="Close dialog"
                type="button"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="campaign-modal-body">
              <form onSubmit={handleSubmit} className="campaign-form">
                {/* Campaign Name */}
                <div className="form-group">
                  <label htmlFor="campaign-name">Campaign Name *</label>
                  <input
                    ref={nameInputRef}
                    id="campaign-name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    onBlur={handleFieldBlur}
                    maxLength="100"
                    placeholder="e.g., Summer Beach Collection"
                    className={errors.name ? 'input-error' : ''}
                    required
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? 'name-error' : undefined}
                  />
                  <div className="char-counter">
                    {formData.name.length}/100
                  </div>
                  {errors.name && (
                    <p className="error-message" id="name-error">{errors.name}</p>
                  )}
                </div>

                {/* Campaign Image */}
                <div className="form-group">
                  <label htmlFor="campaign-image">Campaign Image</label>
                  <div className="image-upload-container">
                    {imagePreviewUrl ? (
                      <div className="image-preview-wrapper">
                        <img
                          src={imagePreviewUrl}
                          alt="Campaign preview"
                          className="image-preview"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="remove-image-btn"
                          aria-label="Remove image"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label htmlFor="campaign-image" className="image-upload-label">
                        <ImageUploadIcon />
                        <p>Click to upload image</p>
                        <span className="image-upload-hint">JPG, PNG (max 5MB)</span>
                        <span className="image-upload-hint">Recommended: 1200x680px</span>
                      </label>
                    )}
                    <input
                      id="campaign-image"
                      type="file"
                      name="image"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="image-input"
                      aria-describedby={errors.image ? 'image-error' : undefined}
                    />
                  </div>
                  {errors.image && (
                    <p className="error-message" id="image-error">{errors.image}</p>
                  )}
                </div>

                {/* Description */}
                <div className="form-group">
                  <label htmlFor="campaign-description">Description / Requirements *</label>
                  <textarea
                    id="campaign-description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    onBlur={handleFieldBlur}
                    maxLength="500"
                    placeholder="Describe your campaign, target audience, and specific requirements..."
                    rows="6"
                    className={errors.description ? 'input-error' : ''}
                    required
                    aria-invalid={!!errors.description}
                    aria-describedby={errors.description ? 'description-error' : undefined}
                  />
                  <div className="char-counter">
                    {formData.description.length}/500
                  </div>
                  {errors.description && (
                    <p className="error-message" id="description-error">{errors.description}</p>
                  )}
                </div>

                {/* Budget and RPM in two columns */}
                <div className="form-row">
                  {/* Budget */}
                  <div className="form-group">
                    <label htmlFor="campaign-budget">Total Payout / Budget (₱) *</label>
                    <input
                      id="campaign-budget"
                      type="number"
                      name="budget"
                      value={formData.budget}
                      onChange={handleInputChange}
                      onBlur={handleFieldBlur}
                      step="0.01"
                      min="0"
                      placeholder="e.g., 5000.00"
                      className={errors.budget ? 'input-error' : ''}
                      required
                      aria-invalid={!!errors.budget}
                      aria-describedby={errors.budget ? 'budget-error' : undefined}
                    />
                    {errors.budget && (
                      <p className="error-message" id="budget-error">{errors.budget}</p>
                    )}
                  </div>

                  {/* RPM */}
                  <div className="form-group">
                    <div className="label-with-tooltip">
                      <label htmlFor="campaign-rpm">RPM (₱) *</label>
                      <span
                        className="tooltip-icon"
                        title="Revenue Per 1000 views. Example: 15.00 = ₱15 per 1000 views"
                        role="tooltip"
                      >
                        ⓘ
                      </span>
                    </div>
                    <input
                      id="campaign-rpm"
                      type="number"
                      name="rpm"
                      value={formData.rpm}
                      onChange={handleInputChange}
                      onBlur={handleFieldBlur}
                      step="0.01"
                      min="0"
                      placeholder="e.g., 15.00"
                      className={errors.rpm ? 'input-error' : ''}
                      required
                      aria-invalid={!!errors.rpm}
                      aria-describedby={errors.rpm ? 'rpm-error' : undefined}
                    />
                    <p className="rpm-hint">
                      Revenue per 1000 views (e.g., 15.00 = ₱15 per 1k views)
                    </p>
                    {errors.rpm && (
                      <p className="error-message" id="rpm-error">{errors.rpm}</p>
                    )}
                  </div>
                </div>

                {/* Platform Selector */}
                <div className="form-group">
                  <label htmlFor="campaign-platform">Platform *</label>
                  <select
                    id="campaign-platform"
                    name="platform"
                    value={formData.platform}
                    onChange={handleInputChange}
                    className="platform-select"
                  >
                    <option value="TikTok">TikTok</option>
                    <option value="YouTube">YouTube</option>
                  </select>
                </div>

                {/* Submit Error */}
                {errors.submit && (
                  <div className="error-alert">
                    <p>{errors.submit}</p>
                  </div>
                )}

                {/* Form Actions */}
                <div className="form-actions">
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCloseModal(); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); handleCloseModal(); } }}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={isSubmitDisabled}
                    aria-busy={isLoading}
                  >
                    {isLoading ? 'Creating...' : 'Create Campaign'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignSection;
export { CampaignLandingPage };


