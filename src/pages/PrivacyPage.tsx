import React from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
          
          <p className="text-gray-600 mb-8">
            This Privacy Policy was created to help you understand how HOMTECH, LLC/Caregrowth AI, DBA ("Caregrowth AI," "we," "our," or "us") uses and protects the data you provide when you visit and use caregrowthai.com and our related services (including our web application). Please continue reading to understand our policies regarding the collection, use, protection, and disclosure of personal information that we receive. We reserve the right to update and change this policy at our discretion, and will update you accordingly.
          </p>

          <p className="text-gray-600 mb-8">
            By using this site or our application, you agree to the collection and use of personally identifiable information in accordance with this policy.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Information We Collect</h2>
          <p className="text-gray-600 mb-4">We may collect Personally Identifiable Information (PII) when you:</p>
          <ul className="list-disc pl-6 text-gray-600 mb-6">
            <li>Place an order,</li>
            <li>Fill out a form, or</li>
            <li>Use our web application.</li>
          </ul>

          <p className="text-gray-600 mb-4">
            According to US Privacy Law and Information Security, Personally Identifiable Information (PII) is any information that can be used to identify, contact, or locate an individual person. We may ask you to provide:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-6">
            <li>Name</li>
            <li>Email address</li>
            <li>Phone number</li>
          </ul>

          <p className="text-gray-600 mb-8">
            We collect this information for the primary purpose of providing services, information, and marketing to you and our clients.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">How We Use This Information</h2>
          <p className="text-gray-600 mb-4">This allows us to:</p>
          <ul className="list-disc pl-6 text-gray-600 mb-6">
            <li>Better understand your needs,</li>
            <li>Personalize your experience,</li>
            <li>Improve our services and website,</li>
            <li>Send you more relevant information.</li>
          </ul>

          <p className="text-gray-600 mb-8">
            We may contact you via email or phone in the future to inform you about new services, promotions, or changes to this Privacy Policy. If at any time you would like to unsubscribe from receiving future emails, or opt out of being contacted, you can follow the instructions at the bottom of each email, or change your account settings, and we will remove you from ALL correspondence.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Google User Data (Required for Drive Integration)</h2>
          <p className="text-gray-600 mb-4">
            Caregrowth AI integrates with Google APIs to provide certain features of our service, including document search, AI-powered responses, and content generation.
          </p>

          <p className="text-gray-600 mb-4">When you connect your Google Account, we may request the following permissions:</p>
          <p className="text-gray-600 mb-6">
            <strong>Google Drive (read-only):</strong> We request drive.readonly access so we can retrieve and process the documents you select or store in a specific folder.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">How we use Google data:</h3>
          <ul className="list-disc pl-6 text-gray-600 mb-6">
            <li>We only access Google Drive files that you explicitly select or grant access to.</li>
            <li>We use the content of those files solely to provide our services (e.g., search, AI analysis, and content generation).</li>
            <li>We do not use your Google data for advertising.</li>
            <li>We do not sell or trade your Google data.</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">How you control your data:</h3>
          <ul className="list-disc pl-6 text-gray-600 mb-8">
            <li>You may disconnect Google Drive access at any time by visiting your Google Account settings (Security → Third-party apps with account access) and revoking Caregrowth AI's access.</li>
            <li>You may also request account deletion or data removal by contacting us at support@caregrowth.ai</li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Third-Party Disclosure</h2>
          <p className="text-gray-600 mb-6">
            We do not sell or trade your Personally Identifiable Information with third parties unless otherwise noted and specified in advance. This excludes third parties who assist us in our primary operations, including but not limited to: website hosting partners, payment processors, and service providers.
          </p>
          <p className="text-gray-600 mb-8">
            Information may be released in order to comply with the law or protect our rights, safety, and property. Non-personally identifiable information may be provided to third parties for marketing or other uses.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Security</h2>
          <p className="text-gray-600 mb-6">
            HOMTECH, LLC/Caregrowth AI, DBA is committed to securing your data and keeping it confidential. We take all necessary precautions to protect your information both online and offline. Our website and services are regularly scanned for vulnerabilities, and we do everything in our power to safeguard your data.
          </p>
          <p className="text-gray-600 mb-8">
            It is important to remember that no system is 100% secure. When disclosing sensitive information you can verify that the site is secure by looking for "https" in the web address or the lock icon in your browser.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Cookies</h2>
          <p className="text-gray-600 mb-6">
            Cookies are small pieces of data used to improve your access and identify repeat visits. Cookies allow Caregrowth AI to collect information, track and target visitor interests, and enable features such as remembering your login session.
          </p>
          <p className="text-gray-600 mb-8">
            You may disable cookies in your browser, but this may limit certain features of our site or app.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Changes to This Policy</h2>
          <p className="text-gray-600 mb-8">
            We may update this Privacy Policy from time to time. When we do, we will update the "Effective Date" at the top of this page.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Contact</h2>
          <p className="text-gray-600 mb-4">
            If you have any questions or concerns regarding this Privacy Policy, please contact us at:
          </p>
          <div className="bg-gray-50 p-6 rounded-lg">
            <p className="font-semibold text-gray-900 mb-2">Caregrowth AI</p>
            <p className="text-gray-600">📧 support@caregrowth.ai</p>
            <p className="text-gray-600">📞 954-866-7875</p>
            <p className="text-gray-600">🏢 3301 N University Dr Suite 100, Coral Springs, FL 33065</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPage;