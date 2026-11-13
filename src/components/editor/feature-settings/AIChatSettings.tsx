import type { FeatureSettingsProps, AIChatSettingsData } from './types';
import { MessageSquare, Bot, History, Sparkles } from 'lucide-react';

export function AIChatSettings({ settings, onUpdateSettings }: FeatureSettingsProps) {
  const aiSettings: AIChatSettingsData = {
    systemPrompt: settings.systemPrompt as string ?? 'You are a helpful assistant.',
    welcomeMessage: settings.welcomeMessage as string ?? 'Hi! How can I help you today?',
    placeholder: settings.placeholder as string ?? 'Type your message...',
    enableHistory: settings.enableHistory as boolean ?? true,
    maxMessages: settings.maxMessages as number ?? 50
  };

  return (
    <div data-ev-id="ev_dc03f7d184" className="p-6 flex flex-col gap-8">
      {/* System Prompt */}
      <section data-ev-id="ev_75e04468e9">
        <h3 data-ev-id="ev_63f60b276b" className="text-lg font-semibold text-text mb-2">System Prompt</h3>
        <p data-ev-id="ev_4c1454077a" className="text-sm text-muted mb-4">Define the AI's personality and behavior. This is sent at the start of every conversation.</p>
        
        <textarea data-ev-id="ev_7e498241bd"
        value={aiSettings.systemPrompt}
        onChange={(e) => onUpdateSettings({ systemPrompt: e.target.value })}
        className="w-full bg-input border border-border rounded-lg px-4 py-3 text-text placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        rows={6}
        placeholder="You are a helpful assistant..." />

        <p data-ev-id="ev_0338f8df73" className="text-xs text-muted mt-2">Tip: Be specific about the AI's role, tone, and any restrictions.</p>
      </section>

      {/* Welcome Message */}
      <section data-ev-id="ev_7f071de38d">
        <h3 data-ev-id="ev_9f717d87f4" className="text-lg font-semibold text-text mb-2">Welcome Message</h3>
        <p data-ev-id="ev_ad757eb0c5" className="text-sm text-muted mb-4">The first message users see when opening the chat.</p>
        
        <input data-ev-id="ev_09f667da22"
        type="text"
        value={aiSettings.welcomeMessage}
        onChange={(e) => onUpdateSettings({ welcomeMessage: e.target.value })}
        className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted"
        placeholder="Hi! How can I help you today?" />

      </section>

      {/* Input Placeholder */}
      <section data-ev-id="ev_24cf0f1caa">
        <h3 data-ev-id="ev_020c995ad6" className="text-lg font-semibold text-text mb-2">Input Placeholder</h3>
        <p data-ev-id="ev_3e1ed56b6c" className="text-sm text-muted mb-4">Placeholder text shown in the message input field.</p>
        
        <input data-ev-id="ev_fa45ac33cd"
        type="text"
        value={aiSettings.placeholder}
        onChange={(e) => onUpdateSettings({ placeholder: e.target.value })}
        className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted"
        placeholder="Type your message..." />

      </section>

      {/* Chat Options */}
      <section data-ev-id="ev_aac9598bde">
        <h3 data-ev-id="ev_f866663569" className="text-lg font-semibold text-text mb-4">Chat Options</h3>
        
        <div data-ev-id="ev_6d2d1abcc5" className="flex flex-col gap-4">
          <label data-ev-id="ev_4fa1cfbf71" className="flex items-start gap-4 cursor-pointer p-4 bg-surface-elevated rounded-xl">
            <History className="w-5 h-5 text-muted mt-0.5" />
            <div data-ev-id="ev_28f29f2301" className="flex-1">
              <span data-ev-id="ev_d666bdea3d" className="text-text font-medium">Enable Chat History</span>
              <p data-ev-id="ev_c11883e206" className="text-sm text-muted mt-0.5">Save conversation history locally on the user's device</p>
            </div>
            <div data-ev-id="ev_7405e9e9a6"
            onClick={() => onUpdateSettings({ enableHistory: !aiSettings.enableHistory })}
            className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
            aiSettings.enableHistory ? 'bg-primary' : 'bg-background'}`
            }>

              <div data-ev-id="ev_43ba0d9b78"
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              aiSettings.enableHistory ? 'translate-x-5' : 'translate-x-0.5'}`
              } />

            </div>
          </label>
        </div>
      </section>

      {/* Max Messages */}
      <section data-ev-id="ev_bd7e2a8d7c">
        <h3 data-ev-id="ev_c348804345" className="text-lg font-semibold text-text mb-2">Max Stored Messages</h3>
        <p data-ev-id="ev_9422d89e86" className="text-sm text-muted mb-4">Maximum number of messages to keep in conversation history.</p>
        
        <div data-ev-id="ev_8d97e417a3" className="flex items-center gap-4">
          <input data-ev-id="ev_dab4c0bc61"
          type="range"
          min="10"
          max="200"
          step="10"
          value={aiSettings.maxMessages}
          onChange={(e) => onUpdateSettings({ maxMessages: parseInt(e.target.value) })}
          className="flex-1" />

          <span data-ev-id="ev_b245bb5f3a" className="text-text font-medium w-24 text-right">
            {aiSettings.maxMessages} messages
          </span>
        </div>
      </section>

      {/* API Note */}
      <section data-ev-id="ev_63b09a365b" className="bg-primary/10 border border-primary/30 rounded-xl p-4">
        <div data-ev-id="ev_f9086752e2" className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-primary mt-0.5" />
          <div data-ev-id="ev_50f43b89a6">
            <p data-ev-id="ev_84868f5b57" className="text-sm text-primary font-medium mb-1">AI API Required</p>
            <p data-ev-id="ev_42c891ce26" className="text-sm text-muted">
              To enable AI chat, configure an OpenAI, Anthropic, or compatible API key in your app secrets. The AI will use GPT-4 or your configured model.
            </p>
          </div>
        </div>
      </section>
    </div>);

}