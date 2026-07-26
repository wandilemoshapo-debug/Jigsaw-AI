/**
 * DIGITAL PRESENCE EVALUATION (For businesses with NO website)
 * Focuses on OPPORTUNITY - HOT LEADS get high scores
 */
function evaluateDigitalPresence(lead) {
  let score = 0;
  const details = {
    google_business: { score: 0, max: 25, details: [] },
    social_media: { score: 0, max: 20, details: [] },
    credibility: { score: 0, max: 15, details: [] },
    accessibility: { score: 0, max: 10, details: [] },
    missing_opportunities: { score: 0, max: 30, details: [] }
  };

  // 1. GOOGLE BUSINESS PROFILE (25 points)
  const hasGoogleBusiness = lead.has_google_business || false;
  const googleRating = lead.google_rating || 0;
  const googleReviews = lead.google_reviews_count || 0;
  
  if (hasGoogleBusiness) {
    details.google_business.details.push('✅ Has Google Business Profile');
    details.google_business.score += 10;
    if (googleRating >= 4.0) {
      details.google_business.details.push(`⭐ ${googleRating}/5 rating - good reputation`);
      details.google_business.score += 8;
    } else if (googleRating > 0) {
      details.google_business.details.push(`⭐ ${googleRating}/5 rating`);
      details.google_business.score += 4;
    }
    if (googleReviews >= 10) {
      details.google_business.details.push(`📊 ${googleReviews} reviews - social proof`);
      details.google_business.score += 7;
    } else if (googleReviews >= 3) {
      details.google_business.details.push(`📊 ${googleReviews} reviews`);
      details.google_business.score += 3;
    }
  } else {
    details.google_business.details.push('❌ No Google Business Profile');
  }

  // 2. SOCIAL MEDIA PRESENCE (20 points)
  const hasFacebook = lead.has_facebook_page || false;
  const hasInstagram = lead.has_instagram_account || false;
  const hasLinkedIn = lead.has_linkedin_page || false;
  
  let socialCount = 0;
  if (hasFacebook) { socialCount++; details.social_media.details.push('✅ Facebook page found'); }
  if (hasInstagram) { socialCount++; details.social_media.details.push('✅ Instagram account found'); }
  if (hasLinkedIn) { socialCount++; details.social_media.details.push('✅ LinkedIn page found'); }
  
  details.social_media.score += socialCount * 7;
  
  if (socialCount >= 2) {
    details.social_media.details.push('📱 Active social media presence');
    details.social_media.score += 6;
  }

  // 3. BUSINESS CREDIBILITY (15 points)
  const yearsInBusiness = lead.years_in_business || 0;
  
  if (yearsInBusiness >= 5) {
    details.credibility.details.push(`🏆 Established business: ${yearsInBusiness}+ years`);
    details.credibility.score += 10;
  } else if (yearsInBusiness >= 2) {
    details.credibility.details.push(`📈 Growing business: ${yearsInBusiness} years`);
    details.credibility.score += 6;
  } else if (yearsInBusiness > 0) {
    details.credibility.details.push(`🆕 New business: ${yearsInBusiness} years`);
    details.credibility.score += 3;
  }
  
  if (googleReviews >= 20) {
    details.credibility.details.push(`⭐ ${googleReviews} reviews - strong reputation`);
    details.credibility.score += 5;
  }

  // 4. CUSTOMER ACCESSIBILITY (10 points)
  const hasPhone = lead.phone && lead.phone.length > 0;
  const hasEmail = lead.email && lead.email.length > 0;
  const hasWhatsApp = lead.whatsapp_number && lead.whatsapp_number.length > 0;
  
  if (hasPhone) { details.accessibility.details.push('📞 Phone available'); details.accessibility.score += 4; }
  if (hasEmail) { details.accessibility.details.push('✉️ Email available'); details.accessibility.score += 3; }
  if (hasWhatsApp) { details.accessibility.details.push('💬 WhatsApp available'); details.accessibility.score += 3; }

  // 5. MISSING OPPORTUNITIES (30 points) - HIGHEST score for no website
  const missingItems = [];
  let oppScore = 25; // BASE: NO WEBSITE = HIGH OPPORTUNITY
  
  if (!hasGoogleBusiness) {
    missingItems.push('No Google Business Profile - customers can\'t find you on Google Maps');
    oppScore += 3;
  }
  if (socialCount < 2) {
    missingItems.push('Limited social media presence - missing online visibility');
    oppScore += 2;
  }
  if (!hasPhone) {
    missingItems.push('No phone number listed - customers can\'t call you');
    oppScore += 2;
  }
  
  missingItems.push('❌ NO WEBSITE - customers cannot find you online');
  missingItems.push('Customers cannot book or enquire online');
  missingItems.push('No professional online presence - missing credibility');
  missingItems.push('Competitors with websites have an advantage');
  
  details.missing_opportunities.details = missingItems;
  details.missing_opportunities.score = Math.min(30, oppScore + 5);

  // Calculate total score
  const totalScore = 
    details.google_business.score +
    details.social_media.score +
    details.credibility.score +
    details.accessibility.score +
    details.missing_opportunities.score;

  // ✅ FIX: Determine opportunity level correctly
  let level = 'Cool';
  if (totalScore >= 75) level = '🔥 Hot';
  else if (totalScore >= 55) level = '🟠 Warm';
  else if (totalScore >= 30) level = '🔵 Cool';

  // Generate summary
  const businessName = lead.business_name || 'This business';
  const industry = lead.industry_category || 'business';
  const location = lead.suburb || 'their area';
  
  let summary = `🔥 ${businessName} is a ${industry} business in ${location} `;
  
  if (totalScore >= 75) {
    summary += `with EXCELLENT opportunity. They have a strong reputation and active customers, but NO website. Customers searching for ${industry} in ${location} go straight to competitors. A website would capture these customers immediately.`;
  } else if (totalScore >= 55) {
    summary += `with GOOD opportunity. They're active in ${location} but missing a website. Customers can't find them online, can't see their work, can't contact them easily. A website would solve all of this.`;
  } else {
    summary += `with OPPORTUNITY. They have some presence, but without a website they're invisible to customers searching online. A professional website would build credibility and generate leads.`;
  }

  const features = [
    'Mobile Responsive Design',
    'Professional Branding',
    'Fast Performance',
    'Contact Form',
    'WhatsApp Integration',
    'Google Maps Integration',
    'SEO Setup'
  ];

  const recommendedSolution = {
    package_type: 'Business Website',
    features: features,
    estimated_pages: 5,
    recommended_price: 3000,
    deposit: 1500
  };

  return {
    total_score: Math.min(100, totalScore),
    opportunity_level: level,
    details: details,
    missed_opportunities: missingItems,
    recommended_solution: recommendedSolution,
    ai_summary: summary,
    evaluation_type: 'digital_presence'
  };
}

/**
 * WEBSITE EVALUATION (For businesses WITH websites)
 * WARM LEADS = outdated/broken websites get HIGH scores
 * COOL LEADS = decent websites get MEDIUM scores
 */
function evaluateWebsite(lead, report) {
  let score = 0;
  const issues = [];

  // Check for website issues
  if (!report) {
    issues.push('Website is not reachable or broken');
    score += 50;
  } else {
    if (!report.reachable) {
      issues.push('Website is not reachable');
      score += 40;
    }
    if (!report.hasSSL) {
      issues.push('No SSL certificate - security risk');
      score += 15;
    }
    if (!report.hasViewport) {
      issues.push('Not mobile-friendly - customers can\'t view on phones');
      score += 20;
    }
    if (!report.hasContactPage) {
      issues.push('No contact page - customers can\'t reach you');
      score += 15;
    }
    if (!report.hasAboutPage) {
      issues.push('No about page - missing credibility');
      score += 5;
    }
    if (report.loadTimeMs && report.loadTimeMs > 5000) {
      issues.push(`Very slow loading (${report.loadTimeMs}ms) - customers will leave`);
      score += 15;
    } else if (report.loadTimeMs && report.loadTimeMs > 3000) {
      issues.push(`Slow loading (${report.loadTimeMs}ms)`);
      score += 8;
    }
    if (!report.hasMetaDescription) {
      issues.push('Missing meta description - poor SEO');
      score += 5;
    }
  }

  const issueCount = issues.length;
  
  // ✅ FIX: Score based on issues found
  if (issueCount === 0) {
    // GOOD WEBSITE = COOL LEAD (low opportunity)
    score = 20;
    issues.push('Website is decent - low opportunity');
  } else {
    // HAS ISSUES = WARM LEAD (opportunity)
    // Base score + bonus for issues
    score = Math.min(100, 30 + (issueCount * 8));
  }

  // ✅ FIX: Determine level correctly
  let level = '🔵 Cool';
  if (score >= 55) level = '🟠 Warm';
  else if (score >= 30) level = '🔵 Cool';

  // Generate summary
  const businessName = lead.business_name || 'This business';
  
  let summary = '';
  if (level === '🟠 Warm') {
    summary = `🟠 ${businessName} has a website but it has issues: ${issues.slice(0, 3).join(', ')}. This is a GOOD opportunity for a redesign.`;
  } else if (level === '🔵 Cool') {
    summary = `🔵 ${businessName} has a website with some minor issues. Could be improved but not urgent.`;
  } else {
    summary = `⚪ ${businessName} has a decent website. This is a LOW opportunity.`;
  }

  // Recommended solution
  const features = [
    'Mobile Optimization',
    'Speed Improvement',
    'Security Fixes'
  ];

  if (!report?.hasContactPage) features.push('Contact Page with Form');
  if (!report?.hasViewport) features.push('Mobile Responsive Design');
  if (!report?.hasSSL) features.push('SSL Certificate Installation');
  
  const recommendedSolution = {
    package_type: level === '🟠 Warm' ? 'Website Redesign' : 'Website Optimization',
    features: features,
    estimated_pages: 5,
    recommended_price: level === '🟠 Warm' ? 3500 : 2000,
    deposit: level === '🟠 Warm' ? 1750 : 1000
  };

  return {
    total_score: Math.min(100, score),
    opportunity_level: level,
    missed_opportunities: issues,
    recommended_solution: recommendedSolution,
    ai_summary: summary,
    evaluation_type: 'website'
  };
}

module.exports = { evaluateDigitalPresence, evaluateWebsite };