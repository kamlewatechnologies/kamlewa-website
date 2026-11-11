'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Button from '@/components/Button';
import {
  HiMail, HiUpload, HiX, HiUsers, HiCheck, HiExclamation, HiLink,
} from 'react-icons/hi';
import { MdOutlineAlternateEmail } from 'react-icons/md';

function parseEmails(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

function isValidUrl(url: string) {
  try { new URL(url); return true; } catch { return false; }
}

export default function BroadcastPage() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [pastedEmails, setPastedEmails] = useState('');
  const [csvEmails, setCsvEmails] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [driveLink, setDriveLink] = useState('');
  const [driveLinkLabel, setDriveLinkLabel] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState<number | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Recipients handed over from the Registrations page ("Email these people")
  useEffect(() => {
    try {
      const handoff = sessionStorage.getItem('broadcastRecipients');
      if (handoff) {
        sessionStorage.removeItem('broadcastRecipients');
        const list = JSON.parse(handoff) as string[];
        if (Array.isArray(list) && list.length) {
          setPastedEmails(list.join(', '));
          toast.success(`${list.length} recipient(s) added from Registrations`);
        }
      }
    } catch { /* storage unavailable */ }
  }, []);

  const pastedCount = parseEmails(pastedEmails).length;
  const csvCount = csvEmails.length;
  const allEmails = Array.from(new Set([...parseEmails(pastedEmails), ...csvEmails]));
  const invalidCount = pastedEmails
    .split(/[\n,;]+/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)).length;
  const driveLinkValid = driveLink === '' || isValidUrl(driveLink);

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const emails = parseEmails(text);
      setCsvEmails(emails);
      toast.success(`${emails.length} email(s) loaded from CSV`);
    };
    reader.readAsText(file);
  };

  const handleRemoveCSV = () => {
    setCsvEmails([]);
    setCsvFileName('');
    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  const handleSend = async () => {
    if (!subject.trim()) { toast.error('Please enter a subject'); return; }
    if (!body.trim()) { toast.error('Please enter a message body'); return; }
    if (allEmails.length === 0) { toast.error('Please add at least one valid email address'); return; }
    if (driveLink && !isValidUrl(driveLink)) { toast.error('Please enter a valid Google Drive URL'); return; }

    const confirm = window.confirm(
      `You are about to send this email to ${allEmails.length} recipient(s).\n\nSubject: "${subject}"${driveLink ? `\nDocument link included` : ''}\n\nProceed?`
    );
    if (!confirm) return;

    setIsSending(true);
    setSent(null);
    const loadingToast = toast.loading(`Sending to ${allEmails.length} recipient(s)...`);

    try {
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: allEmails,
          subject,
          body,
          driveLink: driveLink.trim() || null,
          driveLinkLabel: driveLinkLabel.trim() || 'Download Document',
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSent(data.sent);
        toast.success(`Successfully sent to ${data.sent} recipient(s)!`, { id: loadingToast });
        setSubject('');
        setBody('');
        setPastedEmails('');
        setCsvEmails([]);
        setCsvFileName('');
        setDriveLink('');
        setDriveLinkLabel('');
        if (csvInputRef.current) csvInputRef.current.value = '';
      } else {
        toast.error(data.error || 'Failed to send', { id: loadingToast });
      }
    } catch {
      toast.error('Something went wrong', { id: loadingToast });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="pb-8 border-b border-white/10">
        <p className="tagline text-yellow-400 text-sm font-semibold uppercase tracking-wider mb-2">Communications</p>
        <h1 className="text-4xl md:text-5xl font-bold" style={{ fontFamily: 'var(--font-nourd), sans-serif' }}>Broadcast Email</h1>
        <p className="text-gray-400 mt-3 text-base">Send announcements, impact reports, or updates to partners and stakeholders.</p>
      </motion.div>

      {/* Success Banner */}
      {sent !== null && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 p-4">
          <HiCheck className="w-5 h-5 text-green-400 shrink-0" />
          <p className="text-green-400 font-semibold">Email sent successfully to {sent} recipient(s).</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* Left — Compose */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-3 space-y-6">
          <div className="bg-white/5 border border-white/10 p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <div className="p-2 bg-yellow-400/10 border border-yellow-400/20 rounded">
                <HiMail className="w-5 h-5 text-yellow-400" />
              </div>
              <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-nourd), sans-serif' }}>Compose Message</h2>
            </div>

            {/* From */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">From</label>
              <div className="w-full px-4 py-3 bg-white/5 border border-white/10 text-gray-400 text-sm select-none">
                KAMLEWA Technologies &lt;noreply@kamlewa.org&gt;
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Subject <span className="text-red-400">*</span></label>
              <input
                type="text"
                placeholder="e.g. KAMLEWA Impact Report – Q2 2026"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition-colors text-sm"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Message Body <span className="text-red-400">*</span></label>
              <textarea
                placeholder="Write your message here. This will appear inside a branded KAMLEWA email exactly as written."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition-colors text-sm resize-y leading-relaxed"
              />
            </div>

            {/* Google Drive Link */}
            <div className="space-y-3 pt-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                <HiLink className="w-4 h-4 text-yellow-400" />
                <label className="text-sm font-medium text-gray-400">
                  Google Drive Document <span className="text-gray-500 font-normal">(optional)</span>
                </label>
              </div>
              <p className="text-xs text-gray-500">
                Paste a shareable Google Drive link. Recipients will see a download button in the email.
              </p>
              <input
                type="url"
                placeholder="https://drive.google.com/file/d/..."
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                className={`w-full px-4 py-3 bg-white/5 border text-white placeholder-gray-500 focus:outline-none transition-colors text-sm ${
                  !driveLinkValid ? 'border-red-500/50 focus:border-red-400' : 'border-white/20 focus:border-yellow-400'
                }`}
              />
              {!driveLinkValid && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <HiExclamation className="w-3.5 h-3.5" /> Please enter a valid URL
                </p>
              )}
              {driveLink && driveLinkValid && (
                <input
                  type="text"
                  placeholder='Button label, e.g. "Download Impact Report Q2 2026"'
                  value={driveLinkLabel}
                  onChange={(e) => setDriveLinkLabel(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition-colors text-sm"
                />
              )}
              {driveLink && driveLinkValid && (
                <div className="flex items-center gap-2 bg-yellow-400/5 border border-yellow-400/20 px-4 py-3">
                  <HiCheck className="w-4 h-4 text-yellow-400 shrink-0" />
                  <p className="text-xs text-yellow-400">
                    A <strong>"{driveLinkLabel || 'Download Document'}"</strong> button will appear in the email.
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Right — Recipients */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2 space-y-6">

          {/* Paste Emails */}
          <div className="bg-white/5 border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-400/10 border border-yellow-400/20 rounded">
                  <MdOutlineAlternateEmail className="w-5 h-5 text-yellow-400" />
                </div>
                <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-nourd), sans-serif' }}>Paste Emails</h2>
              </div>
              {pastedCount > 0 && (
                <span className="text-xs font-semibold px-2 py-1 bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                  {pastedCount} valid
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">Separate emails by comma, semicolon, or new line.</p>
            <textarea
              placeholder={`john@example.com\njane@partner.org\nteam@org.com`}
              value={pastedEmails}
              onChange={(e) => setPastedEmails(e.target.value)}
              rows={7}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition-colors text-sm resize-none font-mono"
            />
            {invalidCount > 0 && (
              <div className="flex items-center gap-2 text-yellow-400 text-xs">
                <HiExclamation className="w-4 h-4 shrink-0" />
                {invalidCount} invalid email(s) will be ignored
              </div>
            )}
          </div>

          {/* CSV Upload */}
          <div className="bg-white/5 border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-400/10 border border-yellow-400/20 rounded">
                  <HiUpload className="w-5 h-5 text-yellow-400" />
                </div>
                <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-nourd), sans-serif' }}>Upload CSV</h2>
              </div>
              {csvCount > 0 && (
                <span className="text-xs font-semibold px-2 py-1 bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                  {csvCount} loaded
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">One email per row or comma-separated. Column headers are ignored.</p>
            {csvFileName ? (
              <div className="flex items-center justify-between bg-yellow-400/10 border border-yellow-400/20 px-4 py-3">
                <div>
                  <p className="text-yellow-400 text-sm font-semibold">{csvFileName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{csvCount} email(s) loaded</p>
                </div>
                <button onClick={handleRemoveCSV} className="text-gray-400 hover:text-white transition-colors" aria-label="Remove CSV">
                  <HiX className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button onClick={() => csvInputRef.current?.click()} className="w-full border border-dashed border-white/20 hover:border-yellow-400/50 py-6 flex flex-col items-center gap-2 text-gray-400 hover:text-yellow-400 transition-colors">
                <HiUpload className="w-6 h-6" />
                <span className="text-sm">Click to upload CSV</span>
              </button>
            )}
            <input title='Upload CSV'
             ref={csvInputRef} type="file" accept=".csv,.txt" onChange={handleCSVUpload} className="hidden" />
          </div>

          {/* Summary */}
          <div className="bg-white/5 border border-white/10 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <HiUsers className="w-5 h-5 text-yellow-400" />
              <h3 className="font-bold">Summary</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>From paste</span>
                <span className={`font-semibold ${pastedCount > 0 ? 'text-white' : 'text-gray-600'}`}>{pastedCount}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>From CSV</span>
                <span className={`font-semibold ${csvCount > 0 ? 'text-white' : 'text-gray-600'}`}>{csvCount}</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between">
                <span className="text-gray-300 font-medium">Total unique recipients</span>
                <span className={`font-bold text-base ${allEmails.length > 0 ? 'text-yellow-400' : 'text-gray-600'}`}>
                  {allEmails.length}
                </span>
              </div>
              {driveLink && driveLinkValid && (
                <div className="border-t border-white/10 pt-2 flex justify-between text-gray-400 items-center">
                  <span>Document</span>
                  <span className="text-yellow-400 font-semibold text-xs">Link included ✓</span>
                </div>
              )}
            </div>
            {allEmails.length > 100 && (
              <div className="flex items-start gap-2 text-yellow-400 text-xs bg-yellow-400/5 border border-yellow-400/20 p-3">
                <HiExclamation className="w-4 h-4 shrink-0 mt-0.5" />
                <span>More than 100 recipients — emails will be sent in batches automatically.</span>
              </div>
            )}
          </div>

          {/* Send Button */}
          <Button
            type="button"
            variant="primary"
            onClick={handleSend}
            disabled={isSending || allEmails.length === 0 || !subject.trim() || !body.trim() || !driveLinkValid}
            className="w-full"
          >
            {isSending ? 'Sending...' : `Send to ${allEmails.length} Recipient${allEmails.length !== 1 ? 's' : ''}`}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}