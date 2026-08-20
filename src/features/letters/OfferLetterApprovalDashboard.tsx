import { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle, XCircle, Clock, TrendingUp, Mail, Inbox, RefreshCw } from 'lucide-react';
import { PageHero, StatTile, Card, Pill, EmptyState, Skeleton, Tabs } from '../../ui';

interface OfferLetter {
  offer_letter_id: number;
  employee_id: string;
  employee_name: string;
  letter_type: string;
  effective_date: string;
  approval_status: 'pending' | 'accepted' | 'rejected' | 'under_review';
  accepted_at: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
}

interface DashboardData {
  total: number;
  accepted: number;
  rejected: number;
  pending: number;
  acceptance_rate: string;
  letters: OfferLetter[];
}

export default function OfferLetterApprovalDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'accepted' | 'rejected' | 'pending'>('all');

  useEffect(() => {
    fetchApprovals();
    const interval = setInterval(fetchApprovals, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchApprovals = async () => {
    try {
      const response = await axios.get('/api/pms/offer-letter/approvals/');
      setData(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch approval data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredLetters = () => {
    if (!data) return [];
    if (filter === 'all') return data.letters;
    return data.letters.filter(letter => letter.approval_status === filter);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-black"><CheckCircle size={13} /> Accepted</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-600 rounded-full text-[11px] font-black"><XCircle size={13} /> Rejected</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full text-[11px] font-black"><Clock size={13} /> Pending</span>;
      default:
        return <Pill>Under Review</Pill>;
    }
  };

  /* Skeletons rather than a spinner: the shape of the page is known, so show it
     filling in instead of a blank screen that jumps once data lands. */
  if (loading && !data) {
    return (
      <div className="min-h-full bg-[#f5f7fa] p-4 lg:p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="ih-skeleton h-24 rounded-2xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }, (_, i) => <div key={i} className="ih-skeleton h-24 rounded-2xl" style={{ animationDelay: `${i * 90}ms` }} />)}
          </div>
          <Skeleton rows={5} />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-full bg-[#f5f7fa] p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <Card tone="rose" interactive={false}>
            <EmptyState icon={XCircle} tone="rose" title="Couldn't load approval data" hint={error}
              action={<button onClick={fetchApprovals} className="ih-sheen px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-black inline-flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5" />Try again</button>} />
          </Card>
        </div>
      </div>
    );
  }

  const filteredLetters = getFilteredLetters();

  return (
    <div className="min-h-full bg-[#f5f7fa] p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <PageHero icon={Mail} tone="rose" title="Offer Letter Approvals"
          subtitle="Track employee acceptance and rejection of offer letters"
          badge={<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur text-[11px] font-black">
            <span className="ih-pulse-glow w-1.5 h-1.5 rounded-full bg-emerald-300" />Live
          </span>} />

        {data && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile label="Total Letters" value={data.total} icon={TrendingUp} tone="indigo" />
            <StatTile label="Accepted" value={data.accepted} icon={CheckCircle} tone="emerald" />
            <StatTile label="Rejected" value={data.rejected} icon={XCircle} tone="rose" />
            <StatTile label="Acceptance Rate" value={parseFloat(data.acceptance_rate) || 0} suffix="%"
              icon={TrendingUp} tone="cyan" hint={`of ${data.total} sent`} />
          </div>
        )}

        <Card interactive={false} className="p-3">
          <Tabs tone="rose" active={filter} onChange={setFilter}
            tabs={[
              { k: 'all' as const, label: `All${data ? ` (${data.total})` : ''}` },
              { k: 'accepted' as const, label: `Accepted${data ? ` (${data.accepted})` : ''}`, icon: CheckCircle },
              { k: 'rejected' as const, label: `Rejected${data ? ` (${data.rejected})` : ''}`, icon: XCircle },
              { k: 'pending' as const, label: `Pending${data ? ` (${data.pending})` : ''}`, icon: Clock },
            ]} />
        </Card>

        <Card interactive={false} className="overflow-hidden">
          {filteredLetters.length === 0 ? (
            <EmptyState icon={Inbox} tone="rose"
              title={filter === 'all' ? 'No letters yet' : `No ${filter} letters`}
              hint={filter === 'all'
                ? 'Letters you generate and send will show up here with their approval status.'
                : 'Try another filter to see the rest.'} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    {['Employee', 'Employee ID', 'Letter Type', 'Status', 'Approved On', 'Email'].map(h => (
                      <th key={h} className="px-5 py-2.5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="ih-stagger">
                  {filteredLetters.map(letter => (
                    <tr key={letter.offer_letter_id} className="border-b border-slate-100 last:border-0 hover:bg-cyan-50/40 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-black text-slate-800 text-sm">{letter.employee_name}</p>
                        <p className="text-[11px] text-slate-400 capitalize">{letter.letter_type}</p>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600 font-semibold">{letter.employee_id}</td>
                      <td className="px-5 py-3 text-sm text-slate-600 capitalize">{letter.letter_type}</td>
                      <td className="px-5 py-3">{getStatusBadge(letter.approval_status)}</td>
                      <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(letter.accepted_at)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black ${
                          letter.email_sent ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                          <Mail className="w-3 h-3" />{letter.email_sent ? 'Sent' : 'Not sent'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <p className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <span className="ih-pulse-glow w-1.5 h-1.5 rounded-full bg-emerald-400" />Auto-refreshing every 10 seconds
        </p>
      </div>
    </div>
  );
}
