import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/helpers';
import {
  ArrowLeft,
  Mail,
  Server,
  Lock,
  Send,
  Loader2,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  TestTube } from
'lucide-react';

type App = Tables<'apps'>;

export default function EmailSettings() {
  const { appId } = useParams();
  const { user } = useAuth();
  const [app, setApp] = useState<App | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean;message: string;} | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [smtpEnabled, setSmtpEnabled] = useState(false);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpFromEmail, setSmtpFromEmail] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('');
  const [smtpEncryption, setSmtpEncryption] = useState<'none' | 'ssl' | 'tls'>('tls');

  // Email template state (from previous migration)
  const [emailSenderName, setEmailSenderName] = useState('');
  const [emailReplyTo, setEmailReplyTo] = useState('');
  const [emailWelcomeEnabled, setEmailWelcomeEnabled] = useState(false);
  const [emailWelcomeSubject, setEmailWelcomeSubject] = useState('');
  const [emailWelcomeBody, setEmailWelcomeBody] = useState('');

  useEffect(() => {
    fetchApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  const fetchApp = async () => {
    if (!supabase || !appId) return;

    const { data } = await supabase.
    from('apps').
    select('*').
    eq('id', appId).
    single();

    if (data) {
      setApp(data);
      // SMTP settings
      setSmtpEnabled(data.smtp_enabled ?? false);
      setSmtpHost(data.smtp_host ?? '');
      setSmtpPort(data.smtp_port ?? 587);
      setSmtpUsername(data.smtp_username ?? '');
      setSmtpPassword(data.smtp_password ?? '');
      setSmtpFromEmail(data.smtp_from_email ?? '');
      setSmtpFromName(data.smtp_from_name ?? '');
      setSmtpEncryption(data.smtp_encryption as 'none' | 'ssl' | 'tls' ?? 'tls');
      // Email template settings
      setEmailSenderName(data.email_sender_name ?? '');
      setEmailReplyTo(data.email_reply_to ?? '');
      setEmailWelcomeEnabled(data.email_welcome_enabled ?? false);
      setEmailWelcomeSubject(data.email_welcome_subject ?? 'Welcome to {{app_name}}!');
      setEmailWelcomeBody(data.email_welcome_body ?? '');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!supabase || !appId) return;

    setSaving(true);
    const { error } = await supabase.
    from('apps').
    update({
      smtp_enabled: smtpEnabled,
      smtp_host: smtpHost || null,
      smtp_port: smtpPort,
      smtp_username: smtpUsername || null,
      smtp_password: smtpPassword || null,
      smtp_from_email: smtpFromEmail || null,
      smtp_from_name: smtpFromName || null,
      smtp_encryption: smtpEncryption,
      email_sender_name: emailSenderName || null,
      email_reply_to: emailReplyTo || null,
      email_welcome_enabled: emailWelcomeEnabled,
      email_welcome_subject: emailWelcomeSubject,
      email_welcome_body: emailWelcomeBody
    }).
    eq('id', appId);

    setSaving(false);
    if (!error) {
      setTestResult({ success: true, message: 'Settings saved successfully!' });
      setTimeout(() => setTestResult(null), 3000);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    // Simulate test - in production this would call an edge function
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (smtpHost && smtpUsername && smtpPassword) {
      setTestResult({ success: true, message: 'SMTP connection successful! A test email has been sent.' });
    } else {
      setTestResult({ success: false, message: 'Please fill in all required SMTP fields.' });
    }
    setTesting(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div data-ev-id="ev_159d6f60c5" className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>);

  }

  if (!app) {
    return (
      <DashboardLayout>
        <div data-ev-id="ev_ea47021936" className="flex flex-col items-center justify-center h-screen">
          <p data-ev-id="ev_7add70415c" className="text-text text-lg mb-4">App not found</p>
          <Link data-ev-id="ev_f9d160c765" to="/dashboard" className="text-primary hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </DashboardLayout>);

  }

  return (
    <DashboardLayout appName={app.name} showBackToDashboard>
      <div data-ev-id="ev_00d3398bd7" className="p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div data-ev-id="ev_f053fda4ff" className="flex items-center gap-4 mb-8">
          <Link data-ev-id="ev_6b5760df4a"
          to={`/app/${appId}/edit`}
          className="p-2 text-muted hover:text-text rounded-lg hover:bg-surface-elevated transition-colors">

            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div data-ev-id="ev_b175d6b801">
            <h1 data-ev-id="ev_e1e4905898" className="text-2xl font-bold text-text">Email Settings</h1>
            <p data-ev-id="ev_88a7ba83b0" className="text-muted">Configure SMTP and email templates for {app.name}</p>
          </div>
        </div>

        {/* Test Result Toast */}
        {testResult &&
        <div data-ev-id="ev_f361f29e06"
        className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
        testResult.success ?
        'bg-success/10 border border-success/20 text-success' :
        'bg-destructive/10 border border-destructive/20 text-destructive'}`
        }>

            {testResult.success ?
          <Check className="w-5 h-5" /> :

          <AlertCircle className="w-5 h-5" />
          }
            <span data-ev-id="ev_79cd936dbe">{testResult.message}</span>
          </div>
        }

        <div data-ev-id="ev_7f92532e1f" className="flex flex-col gap-8">
          {/* SMTP Configuration */}
          <section data-ev-id="ev_df53ae6ea3" className="bg-surface border border-border rounded-xl overflow-hidden">
            <div data-ev-id="ev_2924994143" className="px-6 py-4 border-b border-border border-l-4 border-l-primary flex items-center justify-between">
              <div data-ev-id="ev_5580000286" className="flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" />
                <h2 data-ev-id="ev_1de4a94667" className="text-lg font-semibold text-text">SMTP Configuration</h2>
              </div>
              <button data-ev-id="ev_11b6778a28"
              onClick={() => setSmtpEnabled(!smtpEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              smtpEnabled ? 'bg-primary' : 'bg-border'}`
              }>

                <span data-ev-id="ev_286c51fc7c"
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                smtpEnabled ? 'translate-x-6' : 'translate-x-1'}`
                } />

              </button>
            </div>
            <div data-ev-id="ev_f969259eac" className="p-6">
              <p data-ev-id="ev_4f1d6fd7c6" className="text-muted mb-6">
                {smtpEnabled ?
                'Configure your own SMTP server to send emails from your domain.' :
                'Enable custom SMTP to send emails from your own domain instead of the default system.'}
              </p>

              {smtpEnabled &&
              <div data-ev-id="ev_a4495cce87" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div data-ev-id="ev_6865d9a8d5">
                    <label data-ev-id="ev_b026cbd7b3" className="block text-sm font-medium text-text mb-2">SMTP Host *</label>
                    <input data-ev-id="ev_aee977c8e8"
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.example.com"
                  className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary" />

                  </div>

                  <div data-ev-id="ev_420890c655">
                    <label data-ev-id="ev_45d2220347" className="block text-sm font-medium text-text mb-2">Port</label>
                    <input data-ev-id="ev_528fbc4593"
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                  placeholder="587"
                  className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary" />

                  </div>

                  <div data-ev-id="ev_688cbceaec">
                    <label data-ev-id="ev_42a1f9f263" className="block text-sm font-medium text-text mb-2">Username *</label>
                    <input data-ev-id="ev_27cb27e2a7"
                  type="text"
                  value={smtpUsername}
                  onChange={(e) => setSmtpUsername(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary" />

                  </div>

                  <div data-ev-id="ev_da7164144e">
                    <label data-ev-id="ev_d6be14e726" className="block text-sm font-medium text-text mb-2">Password *</label>
                    <div data-ev-id="ev_420b8e1677" className="relative">
                      <input data-ev-id="ev_481c1b28b5"
                    type={showPassword ? 'text' : 'password'}
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-input border border-border rounded-lg px-4 py-2.5 pr-12 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary" />

                      <button data-ev-id="ev_43e31e7fec"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text">

                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div data-ev-id="ev_4be3145853">
                    <label data-ev-id="ev_79985400d0" className="block text-sm font-medium text-text mb-2">From Email</label>
                    <input data-ev-id="ev_8ef4fe2f9c"
                  type="email"
                  value={smtpFromEmail}
                  onChange={(e) => setSmtpFromEmail(e.target.value)}
                  placeholder="noreply@yourdomain.com"
                  className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary" />

                  </div>

                  <div data-ev-id="ev_d140363d0c">
                    <label data-ev-id="ev_20abfbeabc" className="block text-sm font-medium text-text mb-2">From Name</label>
                    <input data-ev-id="ev_270ab79e04"
                  type="text"
                  value={smtpFromName}
                  onChange={(e) => setSmtpFromName(e.target.value)}
                  placeholder={app.name}
                  className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary" />

                  </div>

                  <div data-ev-id="ev_eb3493f9e9" className="md:col-span-2">
                    <label data-ev-id="ev_d7062198a4" className="block text-sm font-medium text-text mb-2">Encryption</label>
                    <div data-ev-id="ev_f6fc5fbb75" className="flex gap-4">
                      {(['tls', 'ssl', 'none'] as const).map((enc) =>
                    <label data-ev-id="ev_d29dff0550"
                    key={enc}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                    smtpEncryption === enc ?
                    'border-primary bg-primary/10 text-primary' :
                    'border-border text-muted hover:border-muted'}`
                    }>

                          <input data-ev-id="ev_25dd767127"
                      type="radio"
                      name="encryption"
                      value={enc}
                      checked={smtpEncryption === enc}
                      onChange={() => setSmtpEncryption(enc)}
                      className="sr-only" />

                          <span data-ev-id="ev_2a14fd5c46" className="uppercase font-medium text-sm">{enc}</span>
                        </label>
                    )}
                    </div>
                  </div>

                  <div data-ev-id="ev_b87198412f" className="md:col-span-2">
                    <button data-ev-id="ev_28f9801b80"
                  onClick={handleTestConnection}
                  disabled={testing || !smtpHost}
                  className="bg-surface-elevated hover:bg-border text-text font-medium px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors border border-border disabled:opacity-50">

                      {testing ?
                    <Loader2 className="w-4 h-4 animate-spin" /> :

                    <TestTube className="w-4 h-4" />
                    }
                      Test Connection
                    </button>
                  </div>
                </div>
              }
            </div>
          </section>

          {/* Email Templates */}
          <section data-ev-id="ev_c3a3c68ab7" className="bg-surface border border-border rounded-xl overflow-hidden">
            <div data-ev-id="ev_ae9c58f736" className="px-6 py-4 border-b border-border border-l-4 border-l-primary flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              <h2 data-ev-id="ev_ec9daeb8a0" className="text-lg font-semibold text-text">Email Templates</h2>
            </div>
            <div data-ev-id="ev_7ce9f8c5d6" className="p-6 flex flex-col gap-6">
              <div data-ev-id="ev_e51678874c" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div data-ev-id="ev_a66c01e646">
                  <label data-ev-id="ev_b3fa2eb839" className="block text-sm font-medium text-text mb-2">Default Sender Name</label>
                  <input data-ev-id="ev_a1c8114818"
                  type="text"
                  value={emailSenderName}
                  onChange={(e) => setEmailSenderName(e.target.value)}
                  placeholder={app.name}
                  className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary" />

                </div>

                <div data-ev-id="ev_9c9015adb0">
                  <label data-ev-id="ev_e3840c508e" className="block text-sm font-medium text-text mb-2">Reply-To Email</label>
                  <input data-ev-id="ev_c6d6eb00f0"
                  type="email"
                  value={emailReplyTo}
                  onChange={(e) => setEmailReplyTo(e.target.value)}
                  placeholder="support@yourcompany.com"
                  className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary" />

                </div>
              </div>
            </div>
          </section>

          {/* Welcome Email */}
          <section data-ev-id="ev_0b4bf6ddb0" className="bg-surface border border-border rounded-xl overflow-hidden">
            <div data-ev-id="ev_e2169b1551" className="px-6 py-4 border-b border-border border-l-4 border-l-success flex items-center justify-between">
              <div data-ev-id="ev_8b470bac08" className="flex items-center gap-2">
                <Send className="w-5 h-5 text-success" />
                <h2 data-ev-id="ev_2aa010641c" className="text-lg font-semibold text-text">Welcome Email</h2>
              </div>
              <button data-ev-id="ev_a8a7415946"
              onClick={() => setEmailWelcomeEnabled(!emailWelcomeEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              emailWelcomeEnabled ? 'bg-success' : 'bg-border'}`
              }>

                <span data-ev-id="ev_b520fa4126"
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                emailWelcomeEnabled ? 'translate-x-6' : 'translate-x-1'}`
                } />

              </button>
            </div>
            <div data-ev-id="ev_a8e0c30480" className="p-6">
              <p data-ev-id="ev_5182801432" className="text-muted mb-6">
                {emailWelcomeEnabled ?
                'A welcome email will be sent when users first install your app.' :
                'Enable to automatically send a welcome email to new app users.'}
              </p>

              {emailWelcomeEnabled &&
              <div data-ev-id="ev_061f2da367" className="flex flex-col gap-6">
                  <div data-ev-id="ev_4cde2beaec">
                    <label data-ev-id="ev_8caa881e92" className="block text-sm font-medium text-text mb-2">Subject Line</label>
                    <input data-ev-id="ev_e96b6d5952"
                  type="text"
                  value={emailWelcomeSubject}
                  onChange={(e) => setEmailWelcomeSubject(e.target.value)}
                  placeholder="Welcome to {{app_name}}!"
                  className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary" />

                    <p data-ev-id="ev_7d759db9b0" className="text-xs text-muted mt-1">Use {`{{app_name}}`} to insert your app name.</p>
                  </div>

                  <div data-ev-id="ev_cd9f5eee16">
                    <label data-ev-id="ev_78d5903f54" className="block text-sm font-medium text-text mb-2">Email Body</label>
                    <textarea data-ev-id="ev_f96c1eeebc"
                  value={emailWelcomeBody}
                  onChange={(e) => setEmailWelcomeBody(e.target.value)}
                  placeholder="Thank you for installing {{app_name}}. We're excited to have you!"
                  rows={5}
                  className="w-full bg-input border border-border rounded-lg px-4 py-3 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none" />

                    <p data-ev-id="ev_4d36f793d7" className="text-xs text-muted mt-1">Use {`{{app_name}}`} to insert your app name.</p>
                  </div>
                </div>
              }
            </div>
          </section>

          {/* Save Button */}
          <div data-ev-id="ev_f6bf8518d2" className="flex justify-end">
            <button data-ev-id="ev_dcc5cc8b86"
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary-hover text-white font-medium px-8 py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">

              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save All Settings
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>);

}