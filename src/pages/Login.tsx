import React, { useState, useEffect } from 'react';
import { Camera, User, Lock, Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const Login: React.FC = () => {
  const [step, setStep] = useState<'login' | 'verify2fa'>('login');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [otpData, setOtpData] = useState({
    username: '',
    code: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { login, verify2FA, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/feed');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username.trim() || !formData.password) {
      setErrors({ general: 'Username and password are required' });
      return;
    }

    setIsLoading(true);
    setErrors({});
    
    const result = await login(formData.username, formData.password);
    
    if (result.success) {
      navigate('/feed');
    } else if (result.requires2FA) {
      setOtpData({ ...otpData, username: formData.username });
      setStep('verify2fa');
      toast({
        title: "2FA Required",
        description: result.message,
      });
    } else {
      setErrors({ general: result.message || 'Login failed' });
      toast({
        title: "Login Failed",
        description: result.message,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otpData.code.trim()) {
      setErrors({ code: 'Verification code is required' });
      return;
    }

    setIsLoading(true);
    setErrors({});
    
    const result = await verify2FA(otpData.username, otpData.code);
    
    if (result.success) {
      navigate('/feed');
    } else {
      setErrors({ code: result.message || 'Verification failed' });
      toast({
        title: "Verification Failed",
        description: result.message,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field] || errors.general) {
      setErrors(prev => ({ ...prev, [field]: '', general: '' }));
    }
  };

  const handleOtpChange = (field: string, value: string) => {
    if (field === 'code') {
      // Only allow digits for the code field
      value = value.replace(/\D/g, '');
    }
    setOtpData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-secondary to-accent/10 p-4">
      <Card className="w-full max-w-md bg-gradient-card border-border/50 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-instagram">
            <Camera className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-gradient">
            {step === 'login' ? 'Welcome Back' : 'Verify 2FA'}
          </CardTitle>
          <p className="text-muted-foreground">
            {step === 'login' 
              ? 'Sign in to your account' 
              : 'Enter the verification code from your email'
            }
          </p>
        </CardHeader>
        <CardContent>
          {step === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-6">
              {errors.general && (
                <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                  {errors.general}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-instagram text-white font-semibold text-lg hover:opacity-90 transition-opacity"
                disabled={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify2FA} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otpData.code}
                  onChange={(e) => handleOtpChange('code', e.target.value)}
                  className={`text-center text-lg tracking-widest ${errors.code ? 'border-red-500' : ''}`}
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  required
                />
                {errors.code && (
                  <p className="text-sm text-red-500">{errors.code}</p>
                )}
                <p className="text-xs text-muted-foreground text-center">
                  Check your email for the verification code
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-instagram text-white font-semibold text-lg hover:opacity-90 transition-opacity"
                disabled={isLoading}
              >
                {isLoading ? 'Verifying...' : 'Verify & Sign In'}
              </Button>
            </form>
          )}

          <div className="mt-6 space-y-4">
            {step === 'login' && (
              <div className="text-center">
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-primary hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
            )}
            
            {step === 'verify2fa' && (
              <div className="text-center">
                <button
                  onClick={() => setStep('login')}
                  className="text-sm text-primary hover:underline flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to login
                </button>
              </div>
            )}

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;