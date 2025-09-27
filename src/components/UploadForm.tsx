import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { usePosts } from '@/context/PostsContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import PostCard from '@/components/PostCard';

const UploadForm: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { addPost, posts } = usePosts();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const userPosts = posts.filter(post => post.user.id === user?.id);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file.",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB.",
          variant: "destructive"
        });
        return;
      }

      setSelectedFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: "No image selected",
        description: "Please select an image to upload.",
        variant: "destructive"
      });
      return;
    }

    if (!caption.trim()) {
      toast({
        title: "Caption required",
        description: "Please add a caption to your post.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      const result = await addPost(selectedFile, caption.trim());
      
      if (result.success) {
        toast({
          title: "Post uploaded!",
          description: "Your post has been shared to your feed.",
        });
        
        // Reset form
        setSelectedFile(null);
        setPreviewUrl(null);
        setCaption('');
        
        // Navigate to feed
        navigate('/feed');
      } else {
        toast({
          title: "Upload failed",
          description: result.message || "Failed to upload post",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const clearImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4">
      <div className="flex justify-center mb-8">
        <Card className="w-full max-w-md bg-gradient-card border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold text-gradient">
              Share a moment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Image Upload Area */}
              <div className="space-y-4">
                {!previewUrl ? (
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                    />
                    <div className="flex h-64 w-full items-center justify-center rounded-lg border-2 border-dashed border-border bg-gradient-subtle transition-colors hover:bg-secondary/50">
                      <div className="text-center">
                        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">
                          Click to upload an image
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, GIF up to 10MB
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Selected"
                      className="h-64 w-full rounded-lg object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute right-2 top-2"
                      onClick={clearImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Caption Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Caption
                </label>
                <Textarea
                  placeholder="Write a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="min-h-[80px] resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {caption.length}/500
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-gradient-instagram text-white hover:opacity-90"
                disabled={isUploading || !selectedFile || !caption.trim()}
              >
                {isUploading ? 'Uploading...' : 'Share Post'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* User's Posts Section */}
      <div className="w-full max-w-4xl mx-auto">
        <h2 className="mb-6 text-center text-2xl font-bold text-foreground">Your Posts</h2>
        {userPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
            <p className="text-muted-foreground">No posts yet. Share your first moment!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadForm;