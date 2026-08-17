import { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';

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
        return <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium"><CheckCircle size={16} /> Accepted</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium"><XCircle size={16} /> Rejected</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium"><Clock size={16} /> Pending</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">Under Review</span>;
    }
  };

  if (loading && !data) {
    return <div className="p-6 text-center">Loading approval data...</div>;
  }

  if (error && !data) {
    return <div className="p-6 text-red-600">Error: {error}</div>;
  }

  const filteredLetters = getFilteredLetters();

  return (
    <div className="min-h-full bg-[#f5f7fa] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Offer Letter Approvals</h1>
          <p className="text-gray-600 mt-2">Track employee acceptance and rejection of offer letters</p>
        </div>

        {/* Stats Cards */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Letters</p>
                  <p className="text-3xl font-bold text-gray-900">{data.total}</p>
                </div>
                <TrendingUp className="text-blue-500" size={32} />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Accepted</p>
                  <p className="text-3xl font-bold text-green-600">{data.accepted}</p>
                </div>
                <CheckCircle className="text-green-500" size={32} />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Rejected</p>
                  <p className="text-3xl font-bold text-red-600">{data.rejected}</p>
                </div>
                <XCircle className="text-red-500" size={32} />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Acceptance Rate</p>
                  <p className="text-3xl font-bold text-blue-600">{data.acceptance_rate}</p>
                </div>
                <TrendingUp className="text-blue-500" size={32} />
              </div>
            </div>
          </div>
        )}

        {/* Filter Buttons */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {(['all', 'accepted', 'rejected', 'pending'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Letters Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Employee</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Employee ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Letter Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Approved On</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email Sent</th>
                </tr>
              </thead>
              <tbody>
                {filteredLetters.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No letters found
                    </td>
                  </tr>
                ) : (
                  filteredLetters.map(letter => (
                    <tr key={letter.offer_letter_id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{letter.employee_name}</p>
                          <p className="text-sm text-gray-500">{letter.letter_type}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{letter.employee_id}</td>
                      <td className="px-6 py-4 text-gray-700 capitalize">{letter.letter_type}</td>
                      <td className="px-6 py-4">{getStatusBadge(letter.approval_status)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(letter.accepted_at)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          letter.email_sent
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {letter.email_sent ? '✓ Sent' : '✗ Not Sent'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Auto-refresh indicator */}
        <div className="mt-4 text-center text-sm text-gray-500">
          Auto-refreshing every 10 seconds
        </div>
      </div>
    </div>
  );
}
