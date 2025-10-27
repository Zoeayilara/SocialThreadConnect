import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { authenticatedFetch } from '@/utils/api';
import { formatRelativeTime } from '@/utils/dateUtils';
import { ArrowLeft, AlertTriangle, Trash2, Eye, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AccountReport {
  id: number;
  reported_user_id: number;
  reporter_id: number;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
  reporter_firstName: string;
  reporter_lastName: string;
  reporter_email: string;
  reported_firstName: string;
  reported_lastName: string;
  reported_email: string;
  reported_profileImageUrl?: string;
}

interface AdminAccountReportsProps {
  onBack: () => void;
}

export default function AdminAccountReports({ onBack }: AdminAccountReportsProps) {
  const [selectedReport, setSelectedReport] = useState<AccountReport | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [adminNotes, setAdminNotes] = useState('');
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all account reports
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['admin-account-reports', statusFilter],
    queryFn: async () => {
      const url = statusFilter === 'all' ? '/api/reports/accounts' : `/api/reports/accounts?status=${statusFilter}`;
      const response = await authenticatedFetch(url);
      if (!response.ok) throw new Error('Failed to fetch account reports');
      return response.json();
    },
  });

  // Update report status mutation
  const updateReportMutation = useMutation({
    mutationFn: async ({ reportId, status, notes }: { reportId: number; status: string; notes?: string }) => {
      const response = await authenticatedFetch(`/api/reports/accounts/${reportId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_notes: notes }),
      });
      if (!response.ok) throw new Error('Failed to update account report status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-account-reports'] });
      toast({
        title: "Report updated",
        description: "Account report status has been updated successfully.",
      });
      setSelectedReport(null);
      setAdminNotes('');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update account report status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await authenticatedFetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete account');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "The reported account has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-account-reports'] });
      setDeleteUserId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500">Pending</Badge>;
      case 'reviewed':
        return <Badge variant="outline" className="text-blue-500 border-blue-500">Reviewed</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="text-green-500 border-green-500">Resolved</Badge>;
      case 'dismissed':
        return <Badge variant="outline" className="text-gray-500 border-gray-500">Dismissed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getReasonLabel = (reason: string) => {
    const reasons: { [key: string]: string } = {
      'spam': 'Spam or fake account',
      'harassment': 'Harassment or bullying',
      'hate_speech': 'Hate speech or discrimination',
      'impersonation': 'Impersonation or fake identity',
      'inappropriate': 'Inappropriate content or behavior',
      'scam': 'Scam or fraudulent activity',
      'underage': 'Underage user',
      'other': 'Other'
    };
    return reasons[reason] || reason;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Loading account reports...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-black/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto w-full max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-400 hover:text-white p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-white">Account Reports</h1>
              <p className="text-sm text-gray-400">{reports.length} total reports</p>
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-gray-900 border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="all">All Reports</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reports List */}
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        {reports.length === 0 ? (
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Account Reports</h3>
              <p className="text-gray-400">No account reports found for the selected filter.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reports.map((report: AccountReport) => (
              <Card key={report.id} className="bg-gray-900 border-gray-700">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={report.reported_profileImageUrl} />
                        <AvatarFallback className="bg-gray-700 text-white">
                          {report.reported_firstName?.[0]}{report.reported_lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-white">
                          {report.reported_firstName} {report.reported_lastName}
                        </h3>
                        <p className="text-sm text-gray-400">{report.reported_email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(report.status)}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
                          <DropdownMenuItem 
                            onClick={() => setSelectedReport(report)}
                            className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setDeleteUserId(report.reported_user_id)}
                            className="text-red-400 hover:text-red-300 hover:bg-gray-800 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Reason:</span>
                      <span className="text-white">{getReasonLabel(report.reason)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Reported by:</span>
                      <span className="text-white">{report.reporter_firstName} {report.reporter_lastName}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Reported:</span>
                      <span className="text-white">{formatRelativeTime(report.created_at)}</span>
                    </div>
                    {report.description && (
                      <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-300">{report.description}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Report Details Dialog */}
      {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Account Report Details</DialogTitle>
              <DialogDescription className="text-gray-400">
                Review and manage this account report
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-gray-800 rounded-lg">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={selectedReport.reported_profileImageUrl} />
                  <AvatarFallback className="bg-gray-700 text-white">
                    {selectedReport.reported_firstName?.[0]}{selectedReport.reported_lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-white">
                    {selectedReport.reported_firstName} {selectedReport.reported_lastName}
                  </h3>
                  <p className="text-sm text-gray-400">{selectedReport.reported_email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">Reason</label>
                  <p className="text-white">{getReasonLabel(selectedReport.reason)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">Reported by</label>
                  <p className="text-white">{selectedReport.reporter_firstName} {selectedReport.reporter_lastName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">Reported</label>
                  <p className="text-white">{formatRelativeTime(selectedReport.created_at)}</p>
                </div>
              </div>

              {selectedReport.description && (
                <div>
                  <label className="text-sm font-medium text-gray-300">Description</label>
                  <p className="mt-1 p-3 bg-gray-800 rounded-lg text-white">{selectedReport.description}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Update Status</label>
                <Select 
                  value={selectedReport.status} 
                  onValueChange={(value) => setSelectedReport({...selectedReport, status: value as any})}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about your decision..."
                  className="bg-gray-800 border-gray-700 text-white"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedReport(null)}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={() => updateReportMutation.mutate({
                  reportId: selectedReport.id,
                  status: selectedReport.status,
                  notes: adminNotes
                })}
                disabled={updateReportMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {updateReportMutation.isPending ? 'Updating...' : 'Update Report'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Account Confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Account</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete this account? This action cannot be undone and will remove all of the user's posts, comments, and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && deleteAccountMutation.mutate(deleteUserId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
