import React from 'react';
import Navbar from '@/components/Navbar';
import UploadForm from '@/components/UploadForm';

const Upload: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-accent/5">
      <Navbar />
      <UploadForm />
    </div>
  );
};

export default Upload;