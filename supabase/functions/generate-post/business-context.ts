
export const buildBusinessContext = (profile: any, audience: string): string => {
  const targetAudience = audience || (profile?.ideal_client || 'families needing care');
  
  return profile ? `
Business Name: ${profile.business_name || 'Home Care Business'}
Services: ${profile.services || profile.core_service || 'Home care services'}
Location: ${profile.location || 'Local area'}
Phone Number: ${profile.phone_number || 'Contact us for more information'}
Target Client: ${targetAudience}
Main Offer: ${profile.main_offer || 'Professional home care'}
Differentiator: ${profile.differentiator || 'Compassionate, professional care'}
Big Promise: ${profile.big_promise || 'Exceptional care for your loved ones'}
Client Pain Points: ${Array.isArray(profile.pain_points) ? profile.pain_points.join(', ') : profile.pain_points || 'Finding reliable care'}
Audience Problems: ${profile.audience_problem || 'Caregiving challenges'}
Objections: ${Array.isArray(profile.objections) ? profile.objections.join(', ') : profile.objections || 'Cost and trust concerns'}
Testimonial: ${profile.testimonial || 'Trusted by families in our community'}
` : 'Home Care Business providing professional care services';
};

export const personalizeContent = (text: string, profile: any, targetAudience: string, tone: string, platform: string): string => {
  if (!profile || !text) return text;
  
  return text
    .replace(/\{business_name\}/gi, profile.business_name || 'our business')
    .replace(/\{location\}/gi, profile.location || 'your area')
    .replace(/\{services\}/gi, profile.services || 'our services')
    .replace(/\{core_service\}/gi, profile.core_service || 'our services')
    .replace(/\{phone_number\}/gi, profile.phone_number || 'contact us')
    .replace(/\{ideal_client\}/gi, targetAudience)
    .replace(/\{main_offer\}/gi, profile.main_offer || 'our services')
    .replace(/\{differentiator\}/gi, profile.differentiator || 'professional care')
    .replace(/\{big_promise\}/gi, profile.big_promise || 'exceptional care')
    .replace(/\{pain_points\}/gi, Array.isArray(profile.pain_points) ? profile.pain_points.join(', ') : 'common challenges')
    .replace(/\{audience_problem\}/gi, profile.audience_problem || 'caregiving challenges')
    .replace(/\{objections\}/gi, Array.isArray(profile.objections) ? profile.objections.join(', ') : 'common concerns')
    .replace(/\{audience\}/gi, targetAudience)
    .replace(/\{tone\}/gi, tone || 'professional')
    .replace(/\{platform\}/gi, platform || 'social media')
    .replace(/\{testimonial\}/gi, profile.testimonial || 'trusted by our community');
};
