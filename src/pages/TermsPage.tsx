import React from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service – Caregrowth AI</h1>
          
          <p className="text-gray-600 mb-8">
            <strong>Effective Date:</strong> January 1, 2025
          </p>

          <p className="text-gray-600 mb-8">
            Please read these Terms of Service carefully before using our website, application, or services (collectively, the "Service").
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. Acknowledgment</h2>
          <p className="text-gray-600 mb-4">
            These Terms of Service ("Terms") govern the use of the Service and form a legally binding agreement between you ("You," "User") and HOMTECH, LLC / Caregrowth AI, DBA ("Caregrowth AI," "Company," "We," "Our").
          </p>
          <p className="text-gray-600 mb-4">
            Your access to and use of the Service is conditioned on your acceptance of and compliance with these Terms and our Privacy Policy. If you do not agree, you may not use the Service.
          </p>
          <p className="text-gray-600 mb-8">
            By accessing or using the Service, you represent that you are over 18 years old.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. User Accounts</h2>
          <p className="text-gray-600 mb-4">
            When you create an account with us, you must provide accurate, complete, and current information. You are responsible for safeguarding your account credentials and all activities under your account.
          </p>
          <p className="text-gray-600 mb-8">
            You agree not to share your password with third parties and to notify us immediately of any unauthorized use of your account.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. Google Drive and API Data Access</h2>
          <p className="text-gray-600 mb-4">
            Caregrowth AI may request access to your Google Account via the Google Drive API to provide certain features of our Service.
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-4">
            <li>We request read-only access (drive.readonly) to files or folders you explicitly authorize.</li>
            <li>We use this access solely to enable features such as document search, AI-powered analysis, and content generation.</li>
            <li>We do not modify, delete, or share your Google Drive files.</li>
            <li>We do not sell or use your Google user data for advertising.</li>
          </ul>

          <p className="text-gray-600 mb-4">You may revoke Caregrowth AI's access to your Google Account at any time by:</p>
          <ul className="list-disc pl-6 text-gray-600 mb-6">
            <li>Visiting your Google Account settings (Security → Third-party apps with account access), or</li>
            <li>Contacting us at support@caregrowth.ai.</li>
          </ul>

          <p className="text-gray-600 mb-8">
            By connecting your Google Account, you acknowledge and agree that we process your data in accordance with these Terms, our Privacy Policy, and the Google API Services User Data Policy.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. Content and User Responsibilities</h2>
          <p className="text-gray-600 mb-4">
            You retain ownership of all documents, content, and materials you upload or connect to our Service. By using the Service, you grant us a limited license to process and analyze that content solely for providing functionality within the Service.
          </p>
          <p className="text-gray-600 mb-8">
            You may not use the Service to upload or distribute unlawful, harmful, or infringing content. You are solely responsible for the legality and appropriateness of your content.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. Intellectual Property</h2>
          <p className="text-gray-600 mb-8">
            The Service, including its software, features, and branding, is the exclusive property of Caregrowth AI and its licensors. Nothing in these Terms grants you the right to use our trademarks, logos, or proprietary materials without prior written permission.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. Termination</h2>
          <p className="text-gray-600 mb-8">
            We reserve the right to suspend or terminate your account without prior notice if you violate these Terms. Upon termination, your right to use the Service will immediately cease.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">7. Limitation of Liability</h2>
          <p className="text-gray-600 mb-6">
            The Service is provided "as is" and "as available." Caregrowth AI disclaims all warranties, express or implied. To the maximum extent permitted by law, we shall not be liable for indirect, incidental, or consequential damages.
          </p>
          <p className="text-gray-600 mb-8">
            Some jurisdictions do not allow certain warranty exclusions or liability limitations, so parts of this section may not apply to you.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">8. Governing Law and Disputes</h2>
          <p className="text-gray-600 mb-4">
            These Terms are governed by the laws of the State of Florida, United States, excluding conflict of laws principles.
          </p>
          <p className="text-gray-600 mb-8">
            Any disputes shall first be attempted to be resolved informally by contacting us. If unresolved, disputes will be subject to the jurisdiction of courts located in Florida, USA.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">9. Changes to Terms</h2>
          <p className="text-gray-600 mb-8">
            We may update these Terms at any time. If changes are material, we will provide notice (via email or in-app). Continued use of the Service after changes take effect means you accept the new Terms.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">10. Contact Us</h2>
          <p className="text-gray-600 mb-4">
            If you have any questions about these Terms of Service, please contact us at:
          </p>
          <div className="bg-gray-50 p-6 rounded-lg">
            <p className="font-semibold text-gray-900 mb-2">Caregrowth AI</p>
            <p className="text-gray-600">🌐 caregrowthai.com</p>
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

export default TermsPage;