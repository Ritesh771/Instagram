import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ArrowLeft, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import apiService, { FollowRequest } from '@/services/api';

const FollowRequests: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const response = await apiService.getPendingFollowRequests();
        setRequests(response.data);
      } catch (error) {
        console.error('Error fetching follow requests:', error);
        toast({
          title: 'Error',
          description: 'Failed to load follow requests',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [toast]);

  const handleAccept = async (requesterId: number) => {
    try {
      setProcessingId(requesterId);
      await apiService.acceptFollowRequest(requesterId);
      setRequests((prev) => prev.filter((req) => req.requester.id !== requesterId));
      toast({
        title: 'Request Accepted',
        description: 'Follow request accepted successfully',
      });
    } catch (error) {
      console.error('Error accepting request:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept follow request',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requesterId: number) => {
    try {
      setProcessingId(requesterId);
      await apiService.rejectFollowRequest(requesterId);
      setRequests((prev) => prev.filter((req) => req.requester.id !== requesterId));
      toast({
        title: 'Request Rejected',
        description: 'Follow request rejected',
      });
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject follow request',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-accent/5">
        <Navbar />
        <main className="container mx-auto max-w-2xl px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <p>Loading requests...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-accent/5">
      <Navbar />

      <main className="container mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Follow Requests</h1>
        </div>

        {/* Requests List */}
        <Card className="bg-gradient-card border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle>
              {requests.length} {requests.length === 1 ? 'Request' : 'Requests'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-subtle">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">No pending requests</h3>
                <p className="text-muted-foreground">
                  When people request to follow you, they'll appear here.
                </p>
              </div>
            ) : (
              requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-instagram shadow-md">
                      {request.requester.profile_pic ? (
                        <img
                          src={request.requester.profile_pic}
                          alt={request.requester.username}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">
                        @{request.requester.username}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {request.requester.first_name} {request.requester.last_name}
                      </p>
                      {request.requester.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {request.requester.bio}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2 ml-4">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleAccept(request.requester.id)}
                      disabled={processingId === request.requester.id}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(request.requester.id)}
                      disabled={processingId === request.requester.id}
                      className="border-red-600 text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default FollowRequests;
