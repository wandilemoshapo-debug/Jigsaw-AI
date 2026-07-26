/**
 * WEBSITE EVALUATION ENGINE (For businesses WITH websites)
 */
function evaluateWebsite(lead, report) {
  let score = 0;
  const breakdown = {};

  // 1. Design & Visual Quality (15 points)
  let designScore = 8; // Base score
  if (report) {
    if (report.hasMetaDescription) designScore += 2;
    if (report.hasViewport) designScore += 2;
    if (report.totalLinks > 10) designScore += 2;
    if (report.hasAboutPage) designScore += 1;
  }
  breakdown.design = { score: Math.min(15, designScore), max: 15 };

  // 2. Mobile Experience (10 points)
  let mobileScore = 0;
  if (report?.hasViewport) mobileScore += 10;
  else mobileScore += 2;
  breakdown.mobile = { score: mobileScore, max: 10 };

  // 3. Website Speed (10 points)
  let speedScore = 0;
  if (report?.loadTimeMs) {
    if (report.loadTimeMs < 2000) speedScore = 10;
    else if (report.loadTimeMs < 4000) speedScore = 7;
    else if (report.loadTimeMs < 6000) speedScore = 4;
    else speedScore = 2;
  } else {
    speedScore = 5;
  }
  breakdown.speed = { score: speedScore, max: 10 };

  // 4. SEO Foundations (10 points)
  let seoScore = 0;
  if (report?.hasMetaDescription) seoScore += 5;
  if (report?.title && report.title.length > 0) seoScore += 3;
  if (report?.totalLinks > 5) seoScore += 2;
  breakdown.seo = { score: Math.min(10, seoScore), max: 10 };

  // 5. User Experience (10 points)
  let uxScore = 4; // Base
  if (report?.hasContactPage) uxScore += 3;
  if (report?.hasAboutPage) uxScore += 3;
  breakdown.ux = { score: Math.min(10, uxScore), max: 10 };

  // 6. Call-To-Actions (10 points)
  let ctaScore = 0;
  if (report?.hasContactPage) ctaScore += 5;
  if (report?.totalLinks > 5) ctaScore += 3;
  if (lead.website) ctaScore += 2;
  breakdown.ctas = { score: Math.min(10, ctaScore), max: 10 };

  // 7. Trust & Credibility (10 points)
  let trustScore = 0;
  if (report?.hasSSL) trustScore += 5;
  if (report?.hasAboutPage) trustScore += 3;
  if (report?.hasContactPage) trustScore += 2;
  breakdown.trust = { score: Math.min(10, trustScore), max: 10 };

  // 8. Contact & Conversion (10 points)
  let contactScore = 0;
  if (report?.hasContactPage) contactScore += 5;
  if (lead.phone) contactScore += 3;
  if (lead.email) contactScore += 2;
  breakdown.contact = { score: Math.min(10, contactScore), max: 10 };

  // 9. Content Quality (5 points)
  let contentScore = 2; // Base
  if (report?.hasMetaDescription) contentScore += 2;
  if (report?.title && report.title.length > 0) contentScore += 1;
  breakdown.content = { score: Math.min(5, contentScore), max: 5 };

  // 10. Accessibility (5 points)
  let accessibilityScore = 0;
  if (report?.hasViewport) accessibilityScore += 3;
  if (report?.hasMetaDescription) accessibilityScore += 2;
  breakdown.accessibility = { score: Math.min(5, accessibilityScore), max: 5 };

  // 11. Security & Technical Health (5 points)
  let securityScore = 0;
  if (report?.hasSSL) securityScore += 5;
  breakdown.security = { score: securityScore, max: 5 };

  // 12. Business Growth Features (10 points)
  let growthScore = 0;
  if (report?.hasContactPage) growthScore += 3;
  if (report?.hasAboutPage) growthScore += 2;
  if (report?.totalLinks > 10) growthScore += 2;
  if (lead.website) growthScore += 3;
  breakdown.growth = { score: Math.min(10, growthScore), max: 10 };

  // Calculate total
  const totalScore = Object.values(breakdown).reduce((sum, cat) => sum + cat.score, 0);

  // Determine opportunity indicators
  const opportunityIndicators = [];
  if (!report?.hasSSL) opportunityIndicators.push('🔴 No SSL Certificate - Security Risk');
  if (!report?.hasViewport) opportunityIndicators.push('🔴 Not Mobile Optimized');
  if (report?.loadTimeMs && report.loadTimeMs > 4000) opportunityIndicators.push('🔴 Very Slow Loading');
  if (!report?.hasContactPage) opportunityIndicators.push('🔴 No Contact Page');
  if (!report?.hasAboutPage) opportunityIndicators.push('🔴 No About Page');
  if (!report?.hasMetaDescription) opportunityIndicators.push('🔴 Missing Meta Description for SEO');
  if (report?.totalLinks && report.totalLinks < 5) opportunityIndicators.push('🔴 Very Few Pages/Links');
  
  // Generate AI Summary
  const summary = generateWebsiteSummary(lead, report, breakdown, totalScore, opportunityIndicators);

  // Generate recommended solution
  const recommendedSolution = generateWebsiteSolution(lead, report, breakdown);

  return {
    total_score: Math.min(100, totalScore),
    breakdown: breakdown,
    opportunity_indicators: opportunityIndicators,
    ai_summary: summary,
    recommended_solution: recommendedSolution,
    evaluation_type: 'website'
  };
}

function generateWebsiteSummary(lead, report, breakdown, score, indicators) {
  const businessName = lead.business_name || 'This business';
  const industry = lead.industry_category || 'business';
  
  let summary = `**Overall Assessment:** ${businessName} has a website `;
  
  if (score >= 80) {
    summary += `that is well-optimized and professional. However, there are still opportunities to improve. `;
  } else if (score >= 60) {
    summary += `that is functional but has several areas needing improvement. `;
  } else if (score >= 40) {
    summary += `that is outdated and missing key elements for customer conversion. `;
  } else {
    summary += `that needs significant improvement to be effective. `;
  }

  // Add specific findings
  const weakAreas = [];
  if (breakdown.mobile.score < 5) weakAreas.push('mobile experience');
  if (breakdown.speed.score < 5) weakAreas.push('loading speed');
  if (breakdown.seo.score < 5) weakAreas.push('SEO optimization');
  if (breakdown.ctas.score < 5) weakAreas.push('call-to-actions');
  if (breakdown.contact.score < 5) weakAreas.push('contact options');
  if (breakdown.trust.score < 5) weakAreas.push('trust signals');
  
  if (weakAreas.length > 0) {
    summary += `\n\n**Key Issues:** ${weakAreas.join(', ')} need attention. `;
  }

  if (indicators.length > 0) {
    summary += `\n\n**Opportunity Indicators:**\n${indicators.map(i => `- ${i}`).join('\n')}`;
  }

  summary += `\n\n**Recommendation:** ${businessName} would benefit from a ${score >= 70 ? 'targeted' : 'comprehensive'} website improvement project focusing on ${weakAreas.slice(0, 3).join(', ')}. A well-optimized site would significantly increase customer enquiries and trust.`;

  return summary;
}

function generateWebsiteSolution(lead, report, breakdown) {
  const features = [
    'Mobile Responsive Design',
    'Fast Performance Optimization',
    'Professional Branding'
  ];

  if (!report?.hasSSL) features.push('SSL Certificate Installation');
  if (!report?.hasViewport) features.push('Mobile Optimization');
  if (breakdown.seo.score < 5) features.push('SEO Setup and Optimization');
  if (!report?.hasContactPage) features.push('Contact Page with Form');
  if (!report?.hasAboutPage) features.push('About Page');
  if (breakdown.ctas.score < 5) features.push('Clear Call-to-Action Strategy');
  
  features.push('WhatsApp Integration', 'Google Analytics Setup');

  let packageType = 'Website Redesign';
  if (score >= 70) {
    packageType = 'Website Optimization Package';
  } else if (score < 40) {
    packageType = 'Complete Website Redesign';
  }

  return {
    package_type: packageType,
    features: features,
    estimated_pages: 5,
    recommended_price: score >= 70 ? 2500 : 3500,
    deposit: score >= 70 ? 1250 : 1750
  };
}

module.exports = { evaluateWebsite };