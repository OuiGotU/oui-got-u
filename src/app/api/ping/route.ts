export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING';
  const anonKeySet = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return new Response(JSON.stringify({ url, anonKeySet }), { headers: { 'content-type': 'application/json' }});
}
