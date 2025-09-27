import React from 'react';
import { Heart, MessageCircle, Send, Bookmark, User, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { usePosts } from '@/context/PostsContext';
import { useAuth } from '@/context/AuthContext';
import { Post } from '@/services/api';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { deletePost } = usePosts();
  const { user } = useAuth();
  const { toast } = useToast();
  const isOwner = user?.id === post.user.id;

  const handleDelete = async () => {
    if (!isOwner) return;
    
    const result = await deletePost(post.id);
    if (result.success) {
      toast({
        title: "Post Deleted",
        description: "Your post has been deleted successfully.",
      });
    } else {
      toast({
        title: "Delete Failed",
        description: result.message || "Failed to delete post",
        variant: "destructive",
      });
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const postTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - postTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getImageUrl = (imagePath: string) => {
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    return `http://localhost:8000${imagePath}`;
  };

  return (
    <Card className="w-full max-w-lg mx-auto bg-gradient-card border-border/50 shadow-lg">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <Link 
            to={`/profile/${post.user.username}`}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-instagram">
              <User className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">@{post.user.username}</p>
              <p className="text-xs text-muted-foreground">{formatTimestamp(post.created_at)}</p>
            </div>
          </Link>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Bookmark className="h-4 w-4" />
            </Button>
            
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Post
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Image */}
        <div className="relative">
          <img
            src={getImageUrl(post.image)}
            alt={post.caption}
            className="aspect-square w-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder.svg';
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="p-0 text-muted-foreground hover:text-like-heart transition-colors"
            >
              <Heart className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="sm" className="p-0 text-muted-foreground hover:text-foreground">
              <MessageCircle className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="sm" className="p-0 text-muted-foreground hover:text-foreground">
              <Send className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Caption */}
        <div className="px-4 pb-4">
          <p className="text-sm text-foreground">
            <Link 
              to={`/profile/${post.user.username}`}
              className="font-semibold hover:opacity-80"
            >
              @{post.user.username}
            </Link>
            <span className="ml-2">{post.caption}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PostCard;