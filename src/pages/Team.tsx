import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeam, type TeamRole } from '@/hooks/useTeam';
import { AppLayout } from '@/components/layout/AppLayout';
import { ROLE_LABELS } from '@/types/auth';
import {
  Loader2, Users, Crown, Edit3, Send, Trash2, Mail, AlertCircle, Check, X, UserPlus, RotateCw, Clock, Copy } from
'lucide-react';

const ROLE_OPTIONS: {value: TeamRole;label: string;description: string;}[] = [
{ value: 'sender', label: 'Sender', description: 'Send notifications only' },
{ value: 'editor', label: 'Editor', description: 'Edit app content, send notifications, view stats' },
{ value: 'owner', label: 'Owner', description: 'Everything, including team and settings' }];


const ROLE_ICON = { owner: Crown, editor: Edit3, sender: Send } as const;

function copyText(text: string) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export default function Team() {
  const { user } = useAuth();
  const { members, loading, error, inviteMember, updateMemberRole, removeMember } = useTeam();
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('sender');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const resetInvite = () => {
    setShowInvite(false);
    setInviteEmail('');
    setInviteName('');
    setInviteRole('sender');
    setInviteError(null);
    setInviteLink(null);
    setCopied(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteError(null);
    const res = await inviteMember(inviteEmail.trim(), inviteRole, inviteName.trim() || undefined);
    setInviting(false);
    if (res.error) return setInviteError(res.error);
    if (res.emailSent) {
      flash(`Invite sent to ${inviteEmail.trim()}`);
      resetInvite();
    } else if (res.inviteLink) {
      setInviteLink(res.inviteLink);
    } else {
      flash(`${inviteEmail.trim()} now has ${ROLE_LABELS[inviteRole]} access`);
      resetInvite();
    }
  };

  const handleResend = async (email: string | null, role: TeamRole) => {
    if (!email) return;
    setActionError(null);
    setBusyId(email);
    const res = await inviteMember(email, role);
    setBusyId(null);
    if (res.error) return setActionError(res.error);
    if (res.inviteLink) {
      setInviteEmail(email);
      setInviteRole(role);
      setInviteLink(res.inviteLink);
      setShowInvite(true);
    } else {
      flash(`Invite resent to ${email}`);
    }
  };

  const handleRoleChange = async (userId: string, role: TeamRole) => {
    setActionError(null);
    setBusyId(userId);
    const err = await updateMemberRole(userId, role);
    setBusyId(null);
    if (err) setActionError(err);else
    flash('Role updated');
  };

  const handleRemove = async (userId: string) => {
    setActionError(null);
    setBusyId(userId);
    const err = await removeMember(userId);
    setBusyId(null);
    setConfirmRemove(null);
    if (err) setActionError(err);else
    flash('Team member removed');
  };

  if (loading) {
    return (
      <AppLayout>
        <div data-ev-id="ev_017f842bc8" className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>);
  }

  return (
    <AppLayout>
      <div data-ev-id="team_page" className="p-8 max-w-4xl">
        <div data-ev-id="ev_5d7b223113" className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div data-ev-id="team_heading">
            <h1 data-ev-id="ev_d4c3820312" className="text-[28px] font-display font-bold text-text tracking-tight">Team</h1>
            <p data-ev-id="ev_c0a8fb4bc8" className="text-text-secondary mt-1">Access is invite-only. Invite people and choose what they can do.</p>
          </div>
          <button data-ev-id="invite_btn"
          onClick={() => setShowInvite(true)}
          className="bg-primary hover:bg-primary-hover text-white font-medium px-5 py-2.5 rounded-[10px] flex items-center gap-2 transition-colors min-h-[44px]">
            <UserPlus className="w-4 h-4" />
            Invite member
          </button>
        </div>

        {(error || actionError) &&
        <div data-ev-id="ev_8baad3643f" className="bg-destructive/10 border border-destructive/20 rounded-[10px] p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <p data-ev-id="ev_4703110cd3" className="text-sm text-destructive">{actionError || error}</p>
          </div>
        }

        <div data-ev-id="ev_82436244fe" className="bg-card border border-border rounded-[16px] overflow-hidden">
          <div data-ev-id="ev_d79a792578" className="p-5 border-b border-border flex items-center gap-3">
            <Users className="w-5 h-5 text-text-tertiary" />
            <h2 data-ev-id="ev_4b245ce3d7" className="text-lg font-display font-bold text-text">Team members</h2>
            <span data-ev-id="ev_d767dc6796" className="text-sm text-text-tertiary">({members.length})</span>
          </div>

          {members.length === 0 ?
          <div data-ev-id="ev_90ece9bfc2" className="p-12 text-center">
              <Users className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
              <p data-ev-id="ev_b494e05e16" className="text-text-secondary">No team members yet</p>
            </div> :

          <div data-ev-id="ev_6b7da1e6f6" className="divide-y divide-border">
              {members.map((member) => {
              const isMe = member.id === user?.id;
              const RoleIcon = ROLE_ICON[member.role];
              const busy = busyId === member.id || busyId === member.email;
              return (
                <div data-ev-id="ev_cb99485e51" key={member.id} className="p-5 flex items-center gap-4 flex-wrap">
                    <div data-ev-id="ev_58a5434368" className="w-12 h-12 rounded-[12px] bg-icon-tile-bg flex items-center justify-center text-icon-tile-text font-display font-semibold text-lg shrink-0">
                      {(member.full_name || member.email || 'U').charAt(0).toUpperCase()}
                    </div>

                    <div data-ev-id="ev_75edd65faf" className="flex-1 min-w-[180px]">
                      <p data-ev-id="ev_fbfa2f338d" className="font-medium text-text flex items-center gap-2 flex-wrap">
                        {member.full_name || member.email?.split('@')[0] || 'Unnamed user'}
                        {isMe && <span data-ev-id="ev_dd31fa973a" className="text-text-tertiary text-sm">(you)</span>}
                        {member.pending &&
                      <span data-ev-id="pending_badge" className="text-xs font-medium px-2 py-0.5 rounded-[6px] bg-warning/10 text-warning flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Invite pending
                          </span>
                      }
                      </p>
                      <p data-ev-id="ev_2a192b8509" className="text-sm text-text-secondary flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        {member.email || 'No email'}
                      </p>
                    </div>

                    <div data-ev-id="ev_fa1d1741fc" className="flex items-center gap-2">
                      {isMe ?
                    <span data-ev-id="ev_69063befab" className="px-3 py-1.5 rounded-[8px] text-xs font-medium flex items-center gap-1.5 bg-primary/10 text-primary">
                          <RoleIcon className="w-3.5 h-3.5" />
                          {ROLE_LABELS[member.role]}
                        </span> :
                    <select data-ev-id="ev_e74e74c80f"
                    aria-label={`Role for ${member.email}`}
                    value={member.role}
                    disabled={busy}
                    onChange={(e) => handleRoleChange(member.id, e.target.value as TeamRole)}
                    className="bg-input border border-border rounded-[8px] px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary min-h-[40px] disabled:opacity-50">
                          {ROLE_OPTIONS.map((o) => <option data-ev-id="ev_76a5b5e297" key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    }

                      {member.pending && !isMe &&
                    <button data-ev-id="resend_btn"
                    onClick={() => handleResend(member.email, member.role)}
                    disabled={busy}
                    className="p-2 text-text-tertiary hover:text-text rounded-[8px] hover:bg-surface-elevated transition-colors disabled:opacity-50"
                    title="Resend invite">
                          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                        </button>
                    }

                      {!isMe &&
                    <button data-ev-id="ev_42297dcb50"
                    onClick={() => setConfirmRemove(member.id)}
                    disabled={busy}
                    className="p-2 text-text-tertiary hover:text-destructive rounded-[8px] hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    title="Remove member">
                          <Trash2 className="w-4 h-4" />
                        </button>
                    }
                    </div>
                  </div>);
            })}
            </div>
          }
        </div>

        {/* Role explanation */}
        <div data-ev-id="ev_7d8c207d15" className="mt-8 bg-surface-raised border border-border rounded-[16px] p-6">
          <h3 data-ev-id="ev_0d7bee3dae" className="text-lg font-display font-bold text-text mb-4">Role permissions</h3>
          <div data-ev-id="ev_9f0d90e56b" className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
            { role: 'owner' as const, yes: ['Everything editors can do', 'Invite and remove team members', 'Change roles', 'App settings and distribution'], no: [] },
            { role: 'editor' as const, yes: ['Edit app content and features', 'Send notifications', 'View stats and audience'], no: ['Team, settings, distribution'] },
            { role: 'sender' as const, yes: ['Write and send notifications', 'Send tests to themselves', 'See notification history'], no: ['App content, stats, settings, team'] }].
            map(({ role, yes, no }) => {
              const Icon = ROLE_ICON[role];
              return (
                <div data-ev-id="role_col" key={role}>
                  <div data-ev-id="ev_72345e01ca" className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-primary" />
                    <span data-ev-id="ev_7fbff7234d" className="font-medium text-text">{ROLE_LABELS[role]}</span>
                  </div>
                  <ul data-ev-id="ev_c4e37ebfb2" className="text-sm text-text-secondary flex flex-col gap-1.5">
                    {yes.map((t) => <li data-ev-id="ev_b5d7e4173a" key={t} className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" /> {t}</li>)}
                    {no.map((t) => <li data-ev-id="ev_cc5144068a" key={t} className="flex items-start gap-2"><X className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" /> {t}</li>)}
                  </ul>
                </div>);
            })}
          </div>
        </div>

        {/* Invite modal */}
        {showInvite &&
        <div data-ev-id="invite_modal" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div data-ev-id="invite_modal_card" className="bg-card border border-border rounded-[16px] w-full max-w-md p-7">
              <div data-ev-id="invite_modal_head" className="flex items-center justify-between mb-5">
                <h2 data-ev-id="invite_modal_title" className="text-[22px] font-display font-bold text-text tracking-tight">
                  {inviteLink ? 'Share invite link' : 'Invite a team member'}
                </h2>
                <button data-ev-id="invite_modal_close" onClick={resetInvite} className="p-2 text-text-tertiary hover:text-text rounded-[8px]" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {inviteLink ?
            <div data-ev-id="invite_link_view" className="flex flex-col gap-4">
                  <p data-ev-id="invite_link_text" className="text-sm text-text-secondary text-pretty">
                    The invite was created for <span data-ev-id="ev_b5712a892d" className="text-text">{inviteEmail}</span>, but the email couldn't be sent. Send them this one-time link yourself:
                  </p>
                  <div data-ev-id="invite_link_box" className="bg-input border border-border rounded-[10px] p-3 text-xs text-text-secondary break-all max-h-28 overflow-auto">{inviteLink}</div>
                  <button data-ev-id="invite_link_copy"
              onClick={() => {copyText(inviteLink);setCopied(true);}}
              className="bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-4 rounded-[10px] flex items-center justify-center gap-2 min-h-[44px]">
                    {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy link</>}
                  </button>
                  <p data-ev-id="invite_link_hint" className="text-xs text-text-tertiary text-pretty">
                    To send invites by email automatically, set up Custom SMTP in Cloud → Auth users → Authentication Settings.
                  </p>
                </div> :

            <form data-ev-id="invite_form" onSubmit={handleInvite} className="flex flex-col gap-4">
                  {inviteError &&
              <div data-ev-id="invite_error" className="bg-destructive/10 border border-destructive/20 rounded-[10px] p-3 flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      <p data-ev-id="invite_error_text" className="text-sm text-destructive">{inviteError}</p>
                    </div>
              }
                  <div data-ev-id="invite_email_field">
                    <label data-ev-id="invite_email_label" className="block text-sm font-medium text-text mb-1.5">Email</label>
                    <input data-ev-id="invite_email_input" type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@example.com"
                className="w-full bg-input border border-border rounded-[10px] px-4 py-3 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]" />
                  </div>
                  <div data-ev-id="invite_name_field">
                    <label data-ev-id="invite_name_label" className="block text-sm font-medium text-text mb-1.5">Name (optional)</label>
                    <input data-ev-id="invite_name_input" type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Full name"
                className="w-full bg-input border border-border rounded-[10px] px-4 py-3 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]" />
                  </div>
                  <fieldset data-ev-id="invite_role_field" className="flex flex-col gap-2">
                    <legend data-ev-id="invite_role_label" className="block text-sm font-medium text-text mb-1.5">Role</legend>
                    {ROLE_OPTIONS.map((o) => {
                  const Icon = ROLE_ICON[o.value];
                  const active = inviteRole === o.value;
                  return (
                    <label data-ev-id="invite_role_option" key={o.value}
                    className={`flex items-start gap-3 p-3 rounded-[10px] border cursor-pointer transition-colors ${active ? 'border-primary bg-primary/5' : 'border-border hover:bg-surface-elevated'}`}>
                          <input data-ev-id="ev_9ba547c163" type="radio" name="role" value={o.value} checked={active} onChange={() => setInviteRole(o.value)} className="sr-only" />
                          <Icon className={`w-4 h-4 mt-0.5 ${active ? 'text-primary' : 'text-text-tertiary'}`} />
                          <span data-ev-id="invite_role_text" className="flex-1">
                            <span data-ev-id="ev_70adff40e3" className="block text-sm font-medium text-text">{o.label}</span>
                            <span data-ev-id="ev_bdb6853f1b" className="block text-xs text-text-secondary">{o.description}</span>
                          </span>
                          {active && <Check className="w-4 h-4 text-primary mt-0.5" />}
                        </label>);
                })}
                  </fieldset>
                  <button data-ev-id="invite_submit" type="submit" disabled={inviting || !inviteEmail.trim()}
              className="bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-4 rounded-[10px] flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50 mt-1">
                    {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Mail className="w-4 h-4" /> Send invite</>}
                  </button>
                </form>
            }
            </div>
          </div>
        }

        {/* Remove confirmation */}
        {confirmRemove &&
        <div data-ev-id="ev_79ca9f431f" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div data-ev-id="ev_68f4897b3c" className="bg-card border border-border rounded-[16px] w-full max-w-md p-7">
              <h2 data-ev-id="ev_97e039fad5" className="text-[22px] font-display font-bold text-text mb-3 tracking-tight">Remove team member?</h2>
              <p data-ev-id="ev_736274176d" className="text-text-secondary mb-6 text-pretty">
                Their admin access ends immediately and their login is deleted. You can invite them again later.
              </p>
              <div data-ev-id="ev_d7810ba297" className="flex gap-3">
                <button data-ev-id="ev_e7ae347c58" onClick={() => setConfirmRemove(null)}
              className="flex-1 bg-surface-raised hover:bg-border-strong text-text font-medium py-2.5 px-4 rounded-[10px] transition-colors min-h-[44px] border border-border">
                  Cancel
                </button>
                <button data-ev-id="ev_47843dbbfc" onClick={() => handleRemove(confirmRemove)} disabled={busyId === confirmRemove}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-white font-medium py-2.5 px-4 rounded-[10px] transition-colors min-h-[44px] disabled:opacity-50 flex items-center justify-center">
                  {busyId === confirmRemove ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove member'}
                </button>
              </div>
            </div>
          </div>
        }

        {notice &&
        <div data-ev-id="team_notice" className="fixed bottom-6 right-6 bg-success text-white px-5 py-3 rounded-[10px] flex items-center gap-2 shadow-lg">
            <Check className="w-5 h-5" />
            {notice}
          </div>
        }
      </div>
    </AppLayout>);
}