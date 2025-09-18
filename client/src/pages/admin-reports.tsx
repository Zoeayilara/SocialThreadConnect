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
import { ArrowLeft, MessageSquare, AlertTriangle, CheckCircle, XCircle, MoreHorizontal, Trash2, Eye } from 'lucide-react';

interface Report {
  id: number;
  post_id: number;
  reporter_id: number;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
  reporter_firstName: string;
  reporter_lastName: string;
  reporter_email: string;
  post_content: string;
  post_created_at: string;
  author_firstName: string;
  author_lastName: string;
  author_email: string;
}

interface AdminReportsProps {
  onBack: () => void;
}

export default function AdminReports({ onBack }: AdminReportsProps) {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [adminNotes, setAdminNotes] = useState('');
  const [deletePostId, setDeletePostId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all reports
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['admin-reports', statusFilter],
    queryFn: async () => {
      const url = statusFilter === 'all' ? '/api/reports' : `/api/reports?status=${statusFilter}`;
      const response = await authenticatedFetch(url);
      if (!response.ok) throw new Error('Failed to fetch reports');
      return response.json();
    },
  });

  // Update report status mutation
  const updateReportMutation = useMutation({
    mutationFn: async ({ reportId, status, notes }: { reportId: number; status: string; notes?: string }) => {
      const response = await authenticatedFetch(`/api/reports/${reportId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNotes: notes }),
      });
      if (!response.ok) throw new Error('Failed to update report status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      toast({
        title: "Report updated",
        description: "Report status has been updated successfully.",
      });
      setSelectedReport(null);
      setAdminNotes('');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update report status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async (postId: number) => {
      const response = await authenticatedFetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete post');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Post Deleted",
        description: "The reported post has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      setDeletePostId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete post. Please try again.",
        variant: "destructive",
      });
      console.error('Delete post error:', error);
    },
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'destructive',
      reviewed: 'secondary',
      resolved: 'default',
      dismissed: 'outline'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'reviewed': return <Eye className="h-4 w-4 text-blue-500" />;
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'dismissed': return <XCircle className="h-4 w-4 text-gray-500" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const handleUpdateStatus = (status: string) => {
    if (!selectedReport) return;
    
    updateReportMutation.mutate({
      reportId: selectedReport.id,
      status,
      notes: adminNotes.trim() || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b sticky top-0 z-30 bg-black/95 backdrop-blur-sm border-gray-800">
        <div className="mx-auto w-full max-w-4xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-bold text-white">Reported Posts</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 bg-gray-900 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        {reports.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No reports found</h3>
            <p className="text-gray-500">
              {statusFilter === 'all' ? 'No reports have been submitted yet.' : `No ${statusFilter} reports found.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report: Report) => (
              <Card key={report.id} className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <span className="text-red-400 font-medium">
                          {report.reporter_firstName} {report.reporter_lastName} reported this post because of "{report.reason}"
                        </span>
                      </div>
                      {report.description && (
                        <p className="text-gray-400 text-sm ml-7">Additional details: "{report.description}"</p>
                      )}
                      <div className="flex items-center space-x-4 ml-7">
                        <p className="text-gray-500 text-xs">
                          Reported on {new Date(report.created_at).toLocaleDateString()}
                        </p>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(report.status)}
                          {getStatusBadge(report.status)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedReport(report)}
                        className="border-gray-600 text-gray-300 hover:bg-gray-800"
                      >
                        View Details
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                          <DropdownMenuItem 
                            onClick={() => setDeletePostId(report.post_id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Post
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-red-500">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-gray-300 text-sm font-medium">
                        By {report.author_firstName} {report.author_lastName}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {new Date(report.post_created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-gray-300">{report.post_content}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {selectedReport && getStatusIcon(selectedReport.status)}
              <span>Report #{selectedReport?.id}</span>
              {selectedReport && getStatusBadge(selectedReport.status)}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Review and update the status of this report
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-300 mb-1">Reporter:</p>
                  <p className="text-gray-400">{selectedReport.reporter_firstName} {selectedReport.reporter_lastName}</p>
                  <p className="text-xs text-gray-500">{selectedReport.reporter_email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300 mb-1">Post Author:</p>
                  <p className="text-gray-400">{selectedReport.author_firstName} {selectedReport.author_lastName}</p>
                  <p className="text-xs text-gray-500">{selectedReport.author_email}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-300 mb-1">Reason:</p>
                <p className="text-gray-400">{selectedReport.reason}</p>
              </div>
              
              {selectedReport.description && (
                <div>
                  <p className="text-sm font-medium text-gray-300 mb-1">Description:</p>
                  <p className="text-gray-400">{selectedReport.description}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium text-gray-300 mb-1">Reported Post:</p>
                <div className="bg-gray-800 p-3 rounded border-l-4 border-red-500">
                  <p className="text-gray-400">{selectedReport.post_content}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-300 mb-2">Admin Notes (optional):</p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about your decision..."
                  className="bg-gray-800 border-gray-600 text-white"
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setSelectedReport(null)}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleUpdateStatus('dismissed')}
              disabled={updateReportMutation.isPending}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Dismiss
            </Button>
            <Button
              variant="outline"
              onClick={() => handleUpdateStatus('reviewed')}
              disabled={updateReportMutation.isPending}
              className="border-blue-600 text-blue-300 hover:bg-blue-900"
            >
              Mark Reviewed
            </Button>
            <Button
              onClick={() => handleUpdateStatus('resolved')}
              disabled={updateReportMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Post Confirmation Dialog */}
      <AlertDialog open={!!deletePostId} onOpenChange={() => setDeletePostId(null)}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Post</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete this reported post? This action cannot be undone and will remove the post from everywhere in the app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePostId && deletePostMutation.mutate(deletePostId)}
              disabled={deletePostMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletePostMutation.isPending ? "Deleting..." : "Delete Post"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
