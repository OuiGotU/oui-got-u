'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useLocale } from 'next-intl';

type Listing = { id: string; title: string; description: string };
type I18nRow = { listing_id: string; locale: 'en'|'fr'; title: string; description: string };

export default function TranslationsPage() {
  const [email, setEmail] = useState('');
  const [session, setSession] = useState<any>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [rows, setRows] = useState<Record<'en'|'fr', I18nRow | null>>({ en: null, fr: null });
  const [base, setBase] = useState<Listing | null>(null);
  const [saving, setSaving] = useState(false);
  const uiLocale = useLocale();
  const editLocale = useMemo(() => (uiLocale === 'fr' ? 'fr' : 'en') as 'en'|'fr', [uiLocale]);

  useEffect(() => {
    supabase.auth.getSession().then(({data}) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('id,title,description')
        .eq('seller_id', session.user.id)
        .order('created_at', { ascending: false });
      if (!error) {
        setListings(data as Listing[]);
        setSelected(prev => prev || (data?.[0]?.id ?? ''));
      }
    })();
  }, [session]);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      const [{ data: b }, { data: i18n }] = await Promise.all([
        supabase.from('listings').select('id,title,description').eq('id', selected).single(),
        supabase.from('listings_i18n').select('listing_id,locale,title,description').eq('listing_id', selected)
      ]);
      setBase(b as Listing);
      const map: Record<'en'|'fr', I18nRow | null> = { en: null, fr: null };
      (i18n || []).forEach((r: any) => { map[r.locale as 'en'|'fr'] = r; });
      setRows(map);
    })();
  }, [selected]);

  async function sendMagicLink() {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } });
    if (error) alert(error.message); else alert('Check your email for the sign-in link.');
  }

  async function save(locale: 'en'|'fr') {
    if (!selected) return;
    const r = rows[locale];
    if (!r) return;
    setSaving(true);
    const { error } = await supabase.from('listings_i18n').upsert({
      listing_id: selected,
      locale,
      title: r.title,
      description: r.description
    });
    setSaving(false);
    if (error) alert(error.message); else alert('Saved');
  }

  const editing = rows[editLocale] ?? { listing_id: selected, locale: editLocale, title: '', description: '' } as I18nRow;
  const fallbackTitle = base?.title ?? '';
  const fallbackDesc = base?.description ?? '';

  if (!session) {
    return (
      <main className="max-w-md mx-auto p-6 space-y-3">
        <h1 className="text-xl font-semibold">Sign in to edit translations</h1>
        <input className="border rounded-xl px-3 py-2 w-full" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
        <button onClick={sendMagicLink} className="rounded-xl px-3 py-2 border">Send magic link</button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Listing translations</h1>
        <span className="ml-auto text-sm opacity-60">Signed in as {session.user.email}</span>
        <button className="text-sm underline" onClick={()=>supabase.auth.signOut()}>Sign out</button>
      </div>

      <div className="grid gap-3">
        <label className="text-sm">Your listings</label>
        <select className="border rounded-xl px-3 py-2" value={selected} onChange={e=>setSelected(e.target.value)}>
          {listings.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
        </select>
      </div>

      <div className="rounded-2xl border p-4 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-sm">Editing locale:</span>
          <button className={`px-3 py-1 rounded-full border ${editLocale==='en'?'bg-gray-100':''}`} onClick={()=>{}} disabled>EN</button>
          <button className={`px-3 py-1 rounded-full border ${editLocale==='fr'?'bg-gray-100':''}`} onClick={()=>{}} disabled>FR</button>
          <span className="text-xs opacity-60">(switch the site locale in the header to change)</span>
        </div>

        <div className="grid gap-2">
          <label className="text-sm">Title ({editLocale})</label>
          <input className="border rounded-xl px-3 py-2" value={editing.title}
            onChange={e=>setRows(prev=>({...prev, [editLocale]: {...editing, title: e.target.value}}))}
            placeholder={`Fallback: ${fallbackTitle}`} />
        </div>

        <div className="grid gap-2">
          <label className="text-sm">Description ({editLocale})</label>
          <textarea className="border rounded-xl px-3 py-2 min-h-[120px]" value={editing.description}
            onChange={e=>setRows(prev=>({...prev, [editLocale]: {...editing, description: e.target.value}}))}
            placeholder={`Fallback: ${fallbackDesc}`} />
        </div>

        <div className="flex gap-3">
          <button disabled={saving} onClick={()=>save(editLocale)} className="rounded-xl px-4 py-2 border">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className="rounded-xl px-4 py-2 border"
            onClick={()=>setRows(prev=>({...prev, [editLocale]: { listing_id: selected, locale: editLocale, title: '', description: '' }}))}>Clear</button>
        </div>

        <p className="text-xs opacity-60">RLS ensures you can only edit translations for your own listings.</p>
      </div>
    </main>
  );
}
