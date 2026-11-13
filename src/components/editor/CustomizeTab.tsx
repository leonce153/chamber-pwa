import { useState, useRef, useEffect } from 'react';
import type { Tables } from '@/integrations/supabase/helpers';
import { Info, Upload, Mail, Lock, Shield, FileText, ExternalLink, Trash2, Loader2, Globe, Key, Users, Send, Eye, EyeOff, Plus, X } from 'lucide-react';

type App = Tables<'apps'>;

interface CustomizeTabProps {
  app: App;
  onUpdate: (updates: Partial<App>) => void;
}

export function CustomizeTab({ app, onUpdate }: CustomizeTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'info' | 'emails' | 'access' | 'privacy'>('info');
  const [saving, setSaving] = useState<string | null>(null);
  const [localName, setLocalName] = useState(app.name);
  const [localDescription, setLocalDescription] = useState(app.description ?? '');
  const [localSubdomain, setLocalSubdomain] = useState(app.subdomain ?? '');
  const [subdomainError, setSubdomainError] = useState('');
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Email settings state
  const [emailSenderName, setEmailSenderName] = useState(app.email_sender_name ?? '');
  const [emailReplyTo, setEmailReplyTo] = useState(app.email_reply_to ?? '');
  const [emailWelcomeEnabled, setEmailWelcomeEnabled] = useState(app.email_welcome_enabled ?? false);
  const [emailWelcomeSubject, setEmailWelcomeSubject] = useState(app.email_welcome_subject ?? 'Welcome to {{app_name}}!');
  const [emailWelcomeBody, setEmailWelcomeBody] = useState(app.email_welcome_body ?? 'Thank you for installing {{app_name}}. We\'re excited to have you!');

  // Access settings state
  const [accessType, setAccessType] = useState<'public' | 'password' | 'authenticated'>(app.access_type as 'public' | 'password' | 'authenticated' ?? 'public');
  const [accessPassword, setAccessPassword] = useState(app.access_password ?? '');
  const [showPassword, setShowPassword] = useState(false);
  const [allowedDomains, setAllowedDomains] = useState<string[]>(app.access_allowed_domains ?? []);
  const [newDomain, setNewDomain] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
      alert('Please select a PNG, JPG, or GIF image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      onUpdate({ icon_url: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (field: 'name' | 'description', value: string) => {
    setSaving(field);
    await onUpdate({ [field]: value });
    setSaving(null);
  };

  // Get base domain for subdomain preview
  const baseDomain = window.location.hostname.split('.').slice(-2).join('.');
  const isLocalhost = window.location.hostname === 'localhost';
  const previewDomain = isLocalhost ? 'yourdomain.com' : baseDomain;

  const handleSubdomainChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setLocalSubdomain(cleaned);
    validateSubdomain(cleaned);
  };

  const validateSubdomain = (value: string): boolean => {
    if (!value) {
      setSubdomainError('');
      return true;
    }
    if (value.length < 3) {
      setSubdomainError('Must be at least 3 characters');
      return false;
    }
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(value)) {
      setSubdomainError('Must start and end with a letter or number');
      return false;
    }
    if (value.includes('--')) {
      setSubdomainError('Cannot contain consecutive hyphens');
      return false;
    }
    setSubdomainError('');
    return true;
  };

  const handleSaveSubdomain = async () => {
    if (localSubdomain && !validateSubdomain(localSubdomain)) return;
    
    setSaving('subdomain');
    setCheckingSubdomain(true);
    
    try {
      await onUpdate({ subdomain: localSubdomain || null });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
        setSubdomainError('This subdomain is already taken');
      }
    } finally {
      setSaving(null);
      setCheckingSubdomain(false);
    }
  };

  const removeIcon = () => {
    onUpdate({ icon_url: null });
  };

  // Sync local state when app prop changes
  useEffect(() => {
    setLocalName(app.name);
    setLocalDescription(app.description ?? '');
    setLocalSubdomain(app.subdomain ?? '');
    setEmailSenderName(app.email_sender_name ?? '');
    setEmailReplyTo(app.email_reply_to ?? '');
    setEmailWelcomeEnabled(app.email_welcome_enabled ?? false);
    setEmailWelcomeSubject(app.email_welcome_subject ?? 'Welcome to {{app_name}}!');
    setEmailWelcomeBody(app.email_welcome_body ?? 'Thank you for installing {{app_name}}. We\'re excited to have you!');
    setAccessType(app.access_type as 'public' | 'password' | 'authenticated' ?? 'public');
    setAccessPassword(app.access_password ?? '');
    setAllowedDomains(app.access_allowed_domains ?? []);
  }, [app]);

  const handleSaveEmailSettings = async () => {
    setSaving('emails');
    await onUpdate({
      email_sender_name: emailSenderName || null,
      email_reply_to: emailReplyTo || null,
      email_welcome_enabled: emailWelcomeEnabled,
      email_welcome_subject: emailWelcomeSubject,
      email_welcome_body: emailWelcomeBody
    });
    setSaving(null);
  };

  const handleSaveAccessSettings = async () => {
    setSaving('access');
    await onUpdate({
      access_type: accessType,
      access_password: accessType === 'password' ? accessPassword : null,
      access_allowed_domains: accessType === 'authenticated' && allowedDomains.length > 0 ? allowedDomains : null
    });
    setSaving(null);
  };

  const addDomain = () => {
    const domain = newDomain.trim().toLowerCase();
    if (domain && !allowedDomains.includes(domain)) {
      setAllowedDomains([...allowedDomains, domain]);
      setNewDomain('');
    }
  };

  const removeDomain = (domain: string) => {
    setAllowedDomains(allowedDomains.filter((d) => d !== domain));
  };

  const subTabs = [
  { id: 'info' as const, label: 'App Info', icon: Info },
  { id: 'emails' as const, label: 'Emails', icon: Mail },
  { id: 'access' as const, label: 'App Access', icon: Lock },
  { id: 'privacy' as const, label: 'Privacy Policy', icon: Shield }];


  return (
    <div data-ev-id="ev_c2e15d69b6" className="max-w-4xl">
      {/* Sub Tabs */}
      <div data-ev-id="ev_f2572a0d11" className="flex items-center gap-6 border-b border-border mb-8">
        {subTabs.map((tab) =>
        <button data-ev-id="ev_d91ac6cb80"
        key={tab.id}
        onClick={() => setActiveSubTab(tab.id)}
        className={`flex items-center gap-2 pb-4 border-b-2 transition-colors ${
        activeSubTab === tab.id ?
        'border-primary text-primary' :
        'border-transparent text-muted hover:text-text'}`
        }>

            <tab.icon className="w-4 h-4" />
            <span data-ev-id="ev_deab3aef85" className="font-medium">{tab.label}</span>
          </button>
        )}
        <div data-ev-id="ev_e42fd45a8f" className="flex-1" />
        <a data-ev-id="ev_b0b34a9349" href="#" className="flex items-center gap-1 text-muted hover:text-text text-sm">
          <FileText className="w-4 h-4" />
          Docs
        </a>
      </div>

      {activeSubTab === 'info' &&
      <div data-ev-id="ev_7e2d66f6d6" className="flex flex-col gap-8">
          {/* General Information */}
          <section data-ev-id="ev_cdb4548fd7" className="bg-surface border border-border rounded-xl overflow-hidden">
            <div data-ev-id="ev_9577021bd6" className="px-6 py-4 border-b border-border border-l-4 border-l-primary flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              <h2 data-ev-id="ev_4653be1e35" className="text-lg font-semibold text-text">General Information</h2>
            </div>
            <div data-ev-id="ev_82a7c1a0f9" className="p-6 flex flex-col gap-6">
              <div data-ev-id="ev_47c8baf1d3">
                <label data-ev-id="ev_b75f0584b8" className="block text-sm font-medium text-muted mb-1">Application ID</label>
                <div data-ev-id="ev_fe9ad97de4" className="bg-primary/10 text-primary font-mono px-4 py-2 rounded-lg inline-block">
                  #{app.id.slice(0, 6).toUpperCase()}
                </div>
              </div>

              <div data-ev-id="ev_c1f88b27a5">
                <label data-ev-id="ev_b442fe4003" className="block text-sm font-medium text-text mb-2">
                  Application Name <span data-ev-id="ev_50006f6dd5" className="text-muted">(max 30 characters)</span>
                </label>
                <div data-ev-id="ev_e35a3f50e0" className="flex gap-3">
                  <input data-ev-id="ev_1574943104"
                type="text"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                maxLength={30}
                className="flex-1 bg-input border border-border rounded-lg px-4 py-2.5 text-text focus:outline-none focus:ring-2 focus:ring-primary" />

                  <button
                  data-ev-id="ev_b25707ed6c"
                  onClick={() => handleSave('name', localName)}
                  disabled={saving === 'name' || localName === app.name}
                  className="bg-primary hover:bg-primary-hover text-white font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    {saving === 'name' && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save
                  </button>
                </div>
              </div>

              {/* Subdomain */}
              <div data-ev-id="ev_subdomain_field">
                <label data-ev-id="ev_subdomain_label" className="block text-sm font-medium text-text mb-2">
                  <Globe className="w-4 h-4 inline mr-1" />
                  Subdomain
                </label>
                <div data-ev-id="ev_subdomain_input_wrap" className="flex items-center gap-3">
                  <div data-ev-id="ev_subdomain_input_container" className="flex-1 flex items-center">
                    <input
                      data-ev-id="ev_subdomain_input"
                      type="text"
                      value={localSubdomain}
                      onChange={(e) => handleSubdomainChange(e.target.value)}
                      maxLength={63}
                      placeholder="myapp"
                      className={`flex-1 bg-input border rounded-l-lg px-4 py-2.5 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary ${
                        subdomainError ? 'border-destructive' : 'border-border'
                      }`}
                    />
                    <span data-ev-id="ev_subdomain_suffix" className="bg-surface-elevated border border-l-0 border-border rounded-r-lg px-4 py-2.5 text-muted text-sm">
                      .{previewDomain}
                    </span>
                  </div>
                  <button
                    data-ev-id="ev_subdomain_save"
                    onClick={handleSaveSubdomain}
                    disabled={saving === 'subdomain' || localSubdomain === (app.subdomain ?? '') || !!subdomainError}
                    className="bg-primary hover:bg-primary-hover text-white font-medium px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving === 'subdomain' && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save
                  </button>
                </div>
                {subdomainError ? (
                  <p data-ev-id="ev_subdomain_error" className="text-xs text-destructive mt-1">{subdomainError}</p>
                ) : localSubdomain ? (
                  <p data-ev-id="ev_subdomain_preview" className="text-xs text-success mt-1">
                    Your app will be available at: {localSubdomain}.{previewDomain}
                  </p>
                ) : (
                  <p data-ev-id="ev_subdomain_hint" className="text-xs text-muted mt-1">
                    Set a subdomain where users can access your PWA
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* App Icon */}
          <section data-ev-id="ev_f70d08a4eb" className="bg-surface border border-border rounded-xl overflow-hidden">
            <div data-ev-id="ev_69dd0aed8c" className="px-6 py-4 border-b border-border border-l-4 border-l-primary flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              <h2 data-ev-id="ev_f10a586262" className="text-lg font-semibold text-text">App Icon</h2>
            </div>
            <div data-ev-id="ev_59582b36f0" className="p-6">
              <p data-ev-id="ev_f096409a49" className="text-muted mb-4">Square icon used on the device home screen and app store listings. Recommended: 512×512 px PNG.</p>
              
              <div data-ev-id="ev_127429c4c6" className="flex items-center gap-6">
                <div data-ev-id="ev_52bebf7331"
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold relative overflow-hidden"
              style={{ backgroundColor: (app.theme_color ?? '#B8956B') + '30', color: app.theme_color ?? '#B8956B' }}>

                  {app.icon_url ?
                <img data-ev-id="ev_6b9a2450a2" src={app.icon_url} alt="App Icon" className="w-full h-full object-cover" /> :

                app.name.charAt(0).toUpperCase()
                }
                </div>

                <div data-ev-id="ev_1051f31ab4">
                  <input data-ev-id="ev_d613dfc842"
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif"
                onChange={handleImageUpload}
                className="hidden" />

                  <div data-ev-id="ev_52a6dd9cea" className="flex items-center gap-2">
                    <button
                    data-ev-id="ev_fc23a20022"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-surface-elevated hover:bg-border text-text font-medium px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors border border-border">
                      <Upload className="w-4 h-4" />
                      Choose Image
                    </button>
                    {app.icon_url &&
                  <button data-ev-id="ev_3b4936e667"
                  onClick={removeIcon}
                  className="p-2.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Remove icon">
                        <Trash2 className="w-4 h-4" />
                      </button>
                  }
                  </div>
                  <p data-ev-id="ev_0e809996c2" className="text-xs text-muted mt-2">PNG, JPG or GIF · max 5 MB · 1:1 ratio recommended</p>
                </div>
              </div>
            </div>
          </section>

          {/* App Description */}
          <section data-ev-id="ev_42de280c71" className="bg-surface border border-border rounded-xl overflow-hidden">
            <div data-ev-id="ev_4e997ac400" className="px-6 py-4 border-b border-border border-l-4 border-l-primary flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h2 data-ev-id="ev_c3d5258725" className="text-lg font-semibold text-text">App Description</h2>
            </div>
            <div data-ev-id="ev_063fba0550" className="p-6">
              <textarea data-ev-id="ev_d21ef4350c"
            value={localDescription}
            onChange={(e) => setLocalDescription(e.target.value)}
            placeholder="Describe your app..."
            rows={4}
            className="w-full bg-input border border-border rounded-lg px-4 py-3 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none" />

              <div data-ev-id="ev_af0ec59c01" className="flex justify-end mt-3">
                <button
                data-ev-id="ev_5c87945e55"
                onClick={() => handleSave('description', localDescription)}
                disabled={saving === 'description' || localDescription === (app.description ?? '')}
                className="bg-primary hover:bg-primary-hover text-white font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  {saving === 'description' && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          </section>
        </div>
      }

      {activeSubTab === 'emails' &&
      <div data-ev-id="ev_c6cce1ca89" className="flex flex-col gap-8">
          {/* Email Sender Settings */}
          <section data-ev-id="ev_9b4e7d9cbc" className="bg-surface border border-border rounded-xl overflow-hidden">
            <div data-ev-id="ev_2ef19ef667" className="px-6 py-4 border-b border-border border-l-4 border-l-primary flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              <h2 data-ev-id="ev_2683e5f640" className="text-lg font-semibold text-text">Sender Settings</h2>
            </div>
            <div data-ev-id="ev_8ec0826d63" className="p-6 flex flex-col gap-6">
              <div data-ev-id="ev_1f8477d7e5">
                <label data-ev-id="ev_d52c4328c1" className="block text-sm font-medium text-text mb-2">Sender Name</label>
                <input data-ev-id="ev_958e259720"
              type="text"
              value={emailSenderName}
              onChange={(e) => setEmailSenderName(e.target.value)}
              placeholder={app.name}
              className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary" />

                <p data-ev-id="ev_a16d93c57d" className="text-xs text-muted mt-1">The name that appears as the sender in emails. Defaults to your app name.</p>
              </div>
              
              <div data-ev-id="ev_298bcbc9ce">
                <label data-ev-id="ev_87e511cb10" className="block text-sm font-medium text-text mb-2">Reply-To Email</label>
                <input data-ev-id="ev_254c8b9dbb"
              type="email"
              value={emailReplyTo}
              onChange={(e) => setEmailReplyTo(e.target.value)}
              placeholder="support@yourcompany.com"
              className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary" />

                <p data-ev-id="ev_b49f7761e2" className="text-xs text-muted mt-1">When users reply to emails, responses go to this address.</p>
              </div>
            </div>
          </section>

          {/* Welcome Email */}
          <section data-ev-id="ev_87c4131a0d" className="bg-surface border border-border rounded-xl overflow-hidden">
            <div data-ev-id="ev_3b75646c4a" className="px-6 py-4 border-b border-border border-l-4 border-l-primary flex items-center justify-between">
              <div data-ev-id="ev_17b2e3a55b" className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                <h2 data-ev-id="ev_4d9b47897e" className="text-lg font-semibold text-text">Welcome Email</h2>
              </div>
              <button data-ev-id="ev_178200c3fa"
            onClick={() => setEmailWelcomeEnabled(!emailWelcomeEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            emailWelcomeEnabled ? 'bg-primary' : 'bg-border'}`
            }>

                <span data-ev-id="ev_b901f3f10f"
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              emailWelcomeEnabled ? 'translate-x-6' : 'translate-x-1'}`
              } />

              </button>
            </div>
            <div data-ev-id="ev_e711ab4890" className="p-6 flex flex-col gap-6">
              <p data-ev-id="ev_2af28a80a7" className="text-muted text-sm">
                {emailWelcomeEnabled ?
              'A welcome email will be sent to users when they first install your app.' :
              'Enable to send a welcome email when users install your app.'}
              </p>
              
              {emailWelcomeEnabled &&
            <>
                  <div data-ev-id="ev_22f40fa0df">
                    <label data-ev-id="ev_f2e3d4fe48" className="block text-sm font-medium text-text mb-2">Subject Line</label>
                    <input data-ev-id="ev_fbf8300674"
                type="text"
                value={emailWelcomeSubject}
                onChange={(e) => setEmailWelcomeSubject(e.target.value)}
                placeholder="Welcome to {{app_name}}!"
                className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary" />

                    <p data-ev-id="ev_2340650bfb" className="text-xs text-muted mt-1">Use {`{{app_name}}`} to insert your app name.</p>
                  </div>
                  
                  <div data-ev-id="ev_fff6ff7d07">
                    <label data-ev-id="ev_21c0e86e68" className="block text-sm font-medium text-text mb-2">Email Body</label>
                    <textarea data-ev-id="ev_3486e29e9f"
                value={emailWelcomeBody}
                onChange={(e) => setEmailWelcomeBody(e.target.value)}
                placeholder="Thank you for installing {{app_name}}..."
                rows={4}
                className="w-full bg-input border border-border rounded-lg px-4 py-3 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none" />

                    <p data-ev-id="ev_88d655b44e" className="text-xs text-muted mt-1">The main content of your welcome email. Use {`{{app_name}}`} to insert your app name.</p>
                  </div>
                </>
            }
            </div>
          </section>

          {/* Save Button */}
          <div data-ev-id="ev_164cff3046" className="flex justify-end">
            <button data-ev-id="ev_5c31dc436c"
          onClick={handleSaveEmailSettings}
          disabled={saving === 'emails'}
          className="bg-primary hover:bg-primary-hover text-white font-medium px-8 py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">

              {saving === 'emails' && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Email Settings
            </button>
          </div>
        </div>
      }

      {activeSubTab === 'access' &&
      <div data-ev-id="ev_a373f97c8f" className="flex flex-col gap-8">
          {/* Access Type Selection */}
          <section data-ev-id="ev_8f427a70f7" className="bg-surface border border-border rounded-xl overflow-hidden">
            <div data-ev-id="ev_9aaf3414a2" className="px-6 py-4 border-b border-border border-l-4 border-l-primary flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              <h2 data-ev-id="ev_fc4f2d2074" className="text-lg font-semibold text-text">Access Control</h2>
            </div>
            <div data-ev-id="ev_6d4833e700" className="p-6">
              <p data-ev-id="ev_742c96879b" className="text-muted mb-6">Choose who can access your app. This applies to the published PWA.</p>
              
              <div data-ev-id="ev_ba9c89814e" className="flex flex-col gap-4">
                {/* Public Access */}
                <label data-ev-id="ev_c38dbda13a"
              className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
              accessType === 'public' ?
              'border-primary bg-primary/5' :
              'border-border hover:border-muted'}`
              }>

                  <input data-ev-id="ev_e66958f4df"
                type="radio"
                name="accessType"
                checked={accessType === 'public'}
                onChange={() => setAccessType('public')}
                className="mt-1 accent-primary" />

                  <div data-ev-id="ev_f79b0d43a8" className="flex-1">
                    <div data-ev-id="ev_35003e9191" className="flex items-center gap-2 mb-1">
                      <Globe className="w-5 h-5 text-primary" />
                      <span data-ev-id="ev_90047f34b9" className="font-medium text-text">Public</span>
                    </div>
                    <p data-ev-id="ev_a067e53590" className="text-sm text-muted">Anyone can access your app without restrictions.</p>
                  </div>
                </label>

                {/* Password Protected */}
                <label data-ev-id="ev_3eb2016fd7"
              className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
              accessType === 'password' ?
              'border-primary bg-primary/5' :
              'border-border hover:border-muted'}`
              }>

                  <input data-ev-id="ev_a0e44263f1"
                type="radio"
                name="accessType"
                checked={accessType === 'password'}
                onChange={() => setAccessType('password')}
                className="mt-1 accent-primary" />

                  <div data-ev-id="ev_028b1bd176" className="flex-1">
                    <div data-ev-id="ev_bf58a81755" className="flex items-center gap-2 mb-1">
                      <Key className="w-5 h-5 text-warning" />
                      <span data-ev-id="ev_6788f3c568" className="font-medium text-text">Password Protected</span>
                    </div>
                    <p data-ev-id="ev_bfabe8ab86" className="text-sm text-muted">Users must enter a password to access your app.</p>
                  </div>
                </label>

                {/* Authenticated Users */}
                <label data-ev-id="ev_c367ca0423"
              className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
              accessType === 'authenticated' ?
              'border-primary bg-primary/5' :
              'border-border hover:border-muted'}`
              }>

                  <input data-ev-id="ev_d9af1fc4d5"
                type="radio"
                name="accessType"
                checked={accessType === 'authenticated'}
                onChange={() => setAccessType('authenticated')}
                className="mt-1 accent-primary" />

                  <div data-ev-id="ev_bac358e421" className="flex-1">
                    <div data-ev-id="ev_9b106da60d" className="flex items-center gap-2 mb-1">
                      <Users className="w-5 h-5 text-success" />
                      <span data-ev-id="ev_4e20ef768b" className="font-medium text-text">Authenticated Users Only</span>
                    </div>
                    <p data-ev-id="ev_cf6a65210a" className="text-sm text-muted">Only signed-in users can access your app. Optionally restrict to specific email domains.</p>
                  </div>
                </label>
              </div>
            </div>
          </section>

          {/* Password Settings (shown when password selected) */}
          {accessType === 'password' &&
        <section data-ev-id="ev_26f9ace3a3" className="bg-surface border border-border rounded-xl overflow-hidden">
              <div data-ev-id="ev_b4593fe397" className="px-6 py-4 border-b border-border border-l-4 border-l-warning flex items-center gap-2">
                <Key className="w-5 h-5 text-warning" />
                <h2 data-ev-id="ev_87ca21ce38" className="text-lg font-semibold text-text">Password Settings</h2>
              </div>
              <div data-ev-id="ev_a21edcf33a" className="p-6">
                <label data-ev-id="ev_e33d1871f9" className="block text-sm font-medium text-text mb-2">Access Password</label>
                <div data-ev-id="ev_f7b52add3c" className="relative">
                  <input data-ev-id="ev_809a765b60"
              type={showPassword ? 'text' : 'password'}
              value={accessPassword}
              onChange={(e) => setAccessPassword(e.target.value)}
              placeholder="Enter a secure password"
              className="w-full bg-input border border-border rounded-lg px-4 py-2.5 pr-12 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary" />

                  <button data-ev-id="ev_b39845146f"
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text">

                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p data-ev-id="ev_e043ced303" className="text-xs text-muted mt-2">Share this password with users who should have access to your app.</p>
              </div>
            </section>
        }

          {/* Domain Restrictions (shown when authenticated selected) */}
          {accessType === 'authenticated' &&
        <section data-ev-id="ev_4c845e07ba" className="bg-surface border border-border rounded-xl overflow-hidden">
              <div data-ev-id="ev_7f98a0bdf2" className="px-6 py-4 border-b border-border border-l-4 border-l-success flex items-center gap-2">
                <Users className="w-5 h-5 text-success" />
                <h2 data-ev-id="ev_97481b89fb" className="text-lg font-semibold text-text">Allowed Email Domains</h2>
              </div>
              <div data-ev-id="ev_10a3075a58" className="p-6">
                <p data-ev-id="ev_f11eada7a8" className="text-muted mb-4">Optionally restrict access to users with specific email domains. Leave empty to allow all authenticated users.</p>
                
                <div data-ev-id="ev_2203c8a04b" className="flex gap-2 mb-4">
                  <input data-ev-id="ev_c9f46b856d"
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addDomain()}
              placeholder="company.com"
              className="flex-1 bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary" />

                  <button data-ev-id="ev_5058f6f8e3"
              onClick={addDomain}
              disabled={!newDomain.trim()}
              className="bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">

                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>

                {allowedDomains.length > 0 &&
            <div data-ev-id="ev_cac1d1f520" className="flex flex-wrap gap-2">
                    {allowedDomains.map((domain) =>
              <div data-ev-id="ev_4ce454631e"
              key={domain}
              className="flex items-center gap-2 bg-surface-elevated px-3 py-1.5 rounded-full text-sm">

                        <span data-ev-id="ev_f1d3b9bdbd" className="text-text">{domain}</span>
                        <button data-ev-id="ev_2e72127d8c"
                onClick={() => removeDomain(domain)}
                className="text-muted hover:text-destructive">

                          <X className="w-4 h-4" />
                        </button>
                      </div>
              )}
                  </div>
            }

                {allowedDomains.length === 0 &&
            <p data-ev-id="ev_5eee52a2b8" className="text-sm text-muted italic">No domain restrictions. All authenticated users can access.</p>
            }
              </div>
            </section>
        }

          {/* Save Button */}
          <div data-ev-id="ev_8bbf322694" className="flex justify-end">
            <button data-ev-id="ev_40173f7cc6"
          onClick={handleSaveAccessSettings}
          disabled={saving === 'access' || accessType === 'password' && !accessPassword.trim()}
          className="bg-primary hover:bg-primary-hover text-white font-medium px-8 py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">

              {saving === 'access' && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Access Settings
            </button>
          </div>
        </div>
      }

      {activeSubTab === 'privacy' &&
      <div data-ev-id="ev_724fb65395" className="bg-surface border border-border rounded-xl overflow-hidden">
          <div data-ev-id="ev_1193cb1cec" className="px-6 py-4 border-b border-border border-l-4 border-l-primary flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 data-ev-id="ev_9828f29f9d" className="text-lg font-semibold text-text">Privacy Policy</h2>
          </div>
          <div data-ev-id="ev_ab4377ca05" className="p-6">
            <p data-ev-id="ev_803b1e4edd" className="text-muted mb-6">A privacy policy is required for App Store and Google Play. We can generate one for you based on your app's features.</p>
            
            <div data-ev-id="ev_1ad007fb6d" className="flex gap-4">
              <button data-ev-id="ev_e9cb045ede" className="bg-primary hover:bg-primary-hover text-white font-medium px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors">
                Generate Privacy Policy
              </button>
              <button data-ev-id="ev_eec3fb938c" className="bg-surface-elevated hover:bg-border text-text font-medium px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors border border-border">
                <ExternalLink className="w-4 h-4" />
                View Current Policy
              </button>
            </div>
          </div>
        </div>
      }
    </div>);

}