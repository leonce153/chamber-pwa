import { useState } from 'react';
import type { FeatureSettingsProps, PrivacyPolicySettingsData } from './types';
import { Shield, Mail, Calendar, Database, MapPin, Smartphone, BarChart, Target, Users, Copy, Check } from 'lucide-react';

export function PrivacyPolicySettings({ settings, onUpdateSettings }: FeatureSettingsProps) {
  const [copied, setCopied] = useState(false);

  const privacySettings: PrivacyPolicySettingsData = {
    appName: settings.appName as string ?? '',
    companyName: settings.companyName as string ?? '',
    contactEmail: settings.contactEmail as string ?? '',
    effectiveDate: settings.effectiveDate as string ?? new Date().toISOString().split('T')[0],
    collectsPersonalData: settings.collectsPersonalData as boolean ?? true,
    collectsLocationData: settings.collectsLocationData as boolean ?? false,
    collectsDeviceInfo: settings.collectsDeviceInfo as boolean ?? true,
    usesAnalytics: settings.usesAnalytics as boolean ?? true,
    usesAdvertising: settings.usesAdvertising as boolean ?? false,
    sharesWithThirdParties: settings.sharesWithThirdParties as boolean ?? false
  };

  const generatePolicy = () => {
    const name = privacySettings.appName || '[App Name]';
    const company = privacySettings.companyName || '[Company Name]';
    const email = privacySettings.contactEmail || '[contact@example.com]';
    const date = privacySettings.effectiveDate || '[Date]';

    let policy = `# Privacy Policy for ${name}

**Effective Date:** ${date}

${company} ("we", "our", or "us") operates ${name} (the "App"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our App.

## Information Collection and Use

We collect several types of information for various purposes to provide and improve our App.

### Types of Data Collected

`;

    if (privacySettings.collectsPersonalData) {
      policy += `**Personal Data**

While using our App, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you. This may include:
- Email address
- First name and last name
- Usage data

`;
    }

    if (privacySettings.collectsLocationData) {
      policy += `**Location Data**

We may use and store information about your location if you give us permission to do so. We use this data to provide features of our App and to improve and customize our service.

`;
    }

    if (privacySettings.collectsDeviceInfo) {
      policy += `**Device Information**

We may collect information about the device you use to access our App, including the type of device, operating system, unique device identifiers, and mobile network information.

`;
    }

    if (privacySettings.usesAnalytics) {
      policy += `## Analytics

We may use third-party service providers to monitor and analyze the use of our App. These services may collect information about your use of our App to help us improve functionality and user experience.

`;
    }

    if (privacySettings.usesAdvertising) {
      policy += `## Advertising

We may use third-party advertising services to display ads within our App. These services may use cookies or similar technologies to serve ads based on your prior visits to our App or other websites.

`;
    }

    if (privacySettings.sharesWithThirdParties) {
      policy += `## Third-Party Sharing

We may share your information with third-party service providers to:
- Facilitate our App
- Provide the App on our behalf
- Perform App-related services
- Assist us in analyzing how our App is used

`;
    }

    policy += `## Data Security

The security of your data is important to us, but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal data, we cannot guarantee its absolute security.

## Changes to This Privacy Policy

We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Effective Date" at the top.

## Contact Us

If you have any questions about this Privacy Policy, please contact us:
- By email: ${email}
`;

    return policy;
  };

  const copyPolicy = () => {
    const policy = generatePolicy();
    const textarea = document.createElement('textarea');
    textarea.value = policy;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div data-ev-id="ev_4d846a74f1" className="p-6 flex flex-col gap-8">
      {/* Basic Info */}
      <section data-ev-id="ev_aa5cb17f20">
        <h3 data-ev-id="ev_f3cc64d629" className="text-lg font-semibold text-text mb-2">Basic Information</h3>
        <p data-ev-id="ev_b316c06d48" className="text-sm text-muted mb-4">This information will be used to generate your privacy policy.</p>
        
        <div data-ev-id="ev_b737d0680c" className="grid grid-cols-2 gap-4">
          <div data-ev-id="ev_4c1187d9a9">
            <label data-ev-id="ev_f7e8f6c48c" className="block text-sm font-medium text-text mb-1.5">App Name</label>
            <input data-ev-id="ev_232ec73272"
            type="text"
            value={privacySettings.appName}
            onChange={(e) => onUpdateSettings({ appName: e.target.value })}
            className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted"
            placeholder="My Awesome App" />

          </div>
          <div data-ev-id="ev_5ecaadad98">
            <label data-ev-id="ev_7fc4ec0072" className="block text-sm font-medium text-text mb-1.5">Company Name</label>
            <input data-ev-id="ev_c51ad8b1fa"
            type="text"
            value={privacySettings.companyName}
            onChange={(e) => onUpdateSettings({ companyName: e.target.value })}
            className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted"
            placeholder="Acme Inc." />

          </div>
          <div data-ev-id="ev_26e60f30e5">
            <label data-ev-id="ev_abeef07cf4" className="block text-sm font-medium text-text mb-1.5">Contact Email</label>
            <input data-ev-id="ev_28bd1989c8"
            type="email"
            value={privacySettings.contactEmail}
            onChange={(e) => onUpdateSettings({ contactEmail: e.target.value })}
            className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted"
            placeholder="privacy@example.com" />

          </div>
          <div data-ev-id="ev_4b4bd5b52f">
            <label data-ev-id="ev_55b961afbe" className="block text-sm font-medium text-text mb-1.5">Effective Date</label>
            <input data-ev-id="ev_9c227f4729"
            type="date"
            value={privacySettings.effectiveDate}
            onChange={(e) => onUpdateSettings({ effectiveDate: e.target.value })}
            className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text" />

          </div>
        </div>
      </section>

      {/* Data Collection */}
      <section data-ev-id="ev_e9d3743170">
        <h3 data-ev-id="ev_7b4bb5a8bd" className="text-lg font-semibold text-text mb-2">Data Collection</h3>
        <p data-ev-id="ev_bdd1eb69ba" className="text-sm text-muted mb-4">Select what types of data your app collects.</p>
        
        <div data-ev-id="ev_6b3fc03e44" className="flex flex-col gap-3">
          {[
          { key: 'collectsPersonalData', label: 'Personal Data', description: 'Names, emails, account information', icon: Database },
          { key: 'collectsLocationData', label: 'Location Data', description: 'GPS coordinates, IP-based location', icon: MapPin },
          { key: 'collectsDeviceInfo', label: 'Device Information', description: 'Device type, OS, identifiers', icon: Smartphone }].
          map(({ key, label, description, icon: Icon }) =>
          <label data-ev-id="ev_becbadd527" key={key} className="flex items-start gap-4 cursor-pointer p-4 bg-surface-elevated rounded-xl">
              <Icon className="w-5 h-5 text-muted mt-0.5" />
              <div data-ev-id="ev_0fb714dafc" className="flex-1">
                <span data-ev-id="ev_7f735c6799" className="text-text font-medium">{label}</span>
                <p data-ev-id="ev_878319c570" className="text-sm text-muted mt-0.5">{description}</p>
              </div>
              <div data-ev-id="ev_21145280f5"
            onClick={() => onUpdateSettings({ [key]: !privacySettings[key as keyof PrivacyPolicySettingsData] })}
            className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
            privacySettings[key as keyof PrivacyPolicySettingsData] ? 'bg-primary' : 'bg-background'}`
            }>

                <div data-ev-id="ev_01e12aebf4"
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              privacySettings[key as keyof PrivacyPolicySettingsData] ? 'translate-x-5' : 'translate-x-0.5'}`
              } />

              </div>
            </label>
          )}
        </div>
      </section>

      {/* Third Party Services */}
      <section data-ev-id="ev_77ad3c7e43">
        <h3 data-ev-id="ev_905ddc7e18" className="text-lg font-semibold text-text mb-2">Third-Party Services</h3>
        <p data-ev-id="ev_9a3b129553" className="text-sm text-muted mb-4">Select which third-party services your app uses.</p>
        
        <div data-ev-id="ev_acbdb7f6f2" className="flex flex-col gap-3">
          {[
          { key: 'usesAnalytics', label: 'Analytics', description: 'Google Analytics, Mixpanel, etc.', icon: BarChart },
          { key: 'usesAdvertising', label: 'Advertising', description: 'AdMob, Facebook Ads, etc.', icon: Target },
          { key: 'sharesWithThirdParties', label: 'Third-Party Sharing', description: 'Share data with partners/vendors', icon: Users }].
          map(({ key, label, description, icon: Icon }) =>
          <label data-ev-id="ev_b77db55ae6" key={key} className="flex items-start gap-4 cursor-pointer p-4 bg-surface-elevated rounded-xl">
              <Icon className="w-5 h-5 text-muted mt-0.5" />
              <div data-ev-id="ev_3add2dc3fb" className="flex-1">
                <span data-ev-id="ev_3ea1ae8750" className="text-text font-medium">{label}</span>
                <p data-ev-id="ev_fef023e558" className="text-sm text-muted mt-0.5">{description}</p>
              </div>
              <div data-ev-id="ev_948df8afef"
            onClick={() => onUpdateSettings({ [key]: !privacySettings[key as keyof PrivacyPolicySettingsData] })}
            className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
            privacySettings[key as keyof PrivacyPolicySettingsData] ? 'bg-primary' : 'bg-background'}`
            }>

                <div data-ev-id="ev_0f4d544769"
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              privacySettings[key as keyof PrivacyPolicySettingsData] ? 'translate-x-5' : 'translate-x-0.5'}`
              } />

              </div>
            </label>
          )}
        </div>
      </section>

      {/* Generated Policy */}
      <section data-ev-id="ev_5c77a54b78">
        <div data-ev-id="ev_4a67841c6a" className="flex items-center justify-between mb-4">
          <div data-ev-id="ev_b9dac077bc">
            <h3 data-ev-id="ev_92923e18c9" className="text-lg font-semibold text-text">Generated Policy</h3>
            <p data-ev-id="ev_b02e53364b" className="text-sm text-muted">Preview of your auto-generated privacy policy.</p>
          </div>
          <button data-ev-id="ev_cc0d5e0e3b"
          onClick={copyPolicy}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors">

            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        
        <div data-ev-id="ev_289f5c18e7" className="bg-surface-elevated border border-border rounded-xl p-6 max-h-96 overflow-y-auto">
          <pre data-ev-id="ev_bd17a43f26" className="whitespace-pre-wrap text-sm text-text font-mono">
            {generatePolicy()}
          </pre>
        </div>
      </section>
    </div>);

}