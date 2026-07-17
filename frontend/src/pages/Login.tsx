import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { loginStart, loginSuccess, loginFailure } from '../store/slices/authSlice';
import api from '../services/api';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
} from '@mui/material';
import {
  People as PeopleIcon,
  CalendarToday as CalendarIcon,
  AutoAwesome as SparklesIcon,
  Security as ShieldIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ArrowForward as ArrowForwardIcon,
  Language as LanguageIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  Person as PersonIcon,
} from '@mui/icons-material';

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, loading, error: authError } = useAppSelector((state) => state.auth);
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    dispatch(loginStart());
    setLocalError(null);
    try {
      const response = await api.post('/api/auth/login', { email, password });
      dispatch(loginSuccess(response.data));
      navigate('/');
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || 'Invalid email or password';
      dispatch(loginFailure(errMsg));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setLocalError('Please fill in all fields');
      return;
    }

    dispatch(loginStart());
    setLocalError(null);
    try {
      await api.post('/api/auth/register', { name, email, password, role: 'Medical Representative' });
      // Automatically login after successful registration
      const loginRes = await api.post('/api/auth/login', { email, password });
      dispatch(loginSuccess(loginRes.data));
      navigate('/');
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || 'Registration failed';
      dispatch(loginFailure(errMsg));
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F9FAFB' }}>
      {/* Left Panel - Hero Grid */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '50%',
          p: 6,
          background: 'radial-gradient(circle at 10% 20%, #0A323F 0%, #061A2C 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '-20%',
            left: '-20%',
            width: '60%',
            height: '60%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(44, 182, 157, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }
        }}
      >
        {/* Branding */}
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900, color: 'white', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 1 }}>
            AIVOA <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2CB69D' }} />
          </Typography>
          <Typography variant="caption" sx={{ color: '#2CB69D', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.65rem', display: 'block', mt: -0.5 }}>
            Sales Copilot
          </Typography>
        </Box>

        {/* Hero Headlines */}
        <Box sx={{ my: 'auto', maxWidth: 480 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, lineHeight: 1.2 }}>
            AI-First <Box component="span" sx={{ color: '#2CB69D' }}>Healthcare CRM</Box>
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.1rem', mb: 0.5, fontWeight: 500 }}>
            Smart HCP Engagement.
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.1rem', fontWeight: 500 }}>
            Stronger Relationships. Better Outcomes.
          </Typography>
          <Box sx={{ width: 40, height: 3, bgcolor: '#2CB69D', mt: 3, borderRadius: 1 }} />
        </Box>

        {/* Features list & Copyright */}
        <Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3, mb: 6 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', color: '#2CB69D', display: 'flex' }}>
                <PeopleIcon sx={{ fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'white', mb: 0.5 }}>HCP Relationship Management</Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', color: '#2CB69D', display: 'flex' }}>
                <CalendarIcon sx={{ fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'white', mb: 0.5 }}>AI-Powered Scheduling</Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', color: '#2CB69D', display: 'flex' }}>
                <SparklesIcon sx={{ fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'white', mb: 0.5 }}>Smart Insights & Recommendations</Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', color: '#2CB69D', display: 'flex' }}>
                <ShieldIcon sx={{ fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'white', mb: 0.5 }}>Secure & Compliant</Typography>
              </Box>
            </Box>
          </Box>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', display: 'block' }}>
            © 2026 AIVOA. All rights reserved.
          </Typography>
        </Box>
      </Box>

      {/* Right Panel - Login/Register Form */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          width: { xs: '100%', md: '50%' },
          bgcolor: 'white',
          p: { xs: 4, md: 8 },
          position: 'relative',
        }}
      >
        {/* Language select top right */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: { xs: 4, md: 6 } }}>
          <Button
            size="small"
            startIcon={<LanguageIcon sx={{ fontSize: 16 }} />}
            endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 14 }} />}
            sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.8rem', textTransform: 'none' }}
          >
            English
          </Button>
        </Box>

        {/* Auth Box form */}
        <Box sx={{ my: 'auto', mx: 'auto', width: '100%', maxWidth: 400 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: '#061A2C' }}>
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4, fontWeight: 500 }}>
            {isRegistering ? 'Sign up to start using AIVOA Sales Copilot' : 'Sign in to continue to AIVOA Sales Copilot'}
          </Typography>

          <form onSubmit={isRegistering ? handleRegister : handleLogin}>
            {authError && <Alert severity="error" sx={{ mb: 3 }}>{authError}</Alert>}
            {localError && <Alert severity="error" sx={{ mb: 3 }}>{localError}</Alert>}

            {isRegistering && (
              <>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#061A2C', mb: 1, fontSize: '0.85rem' }}>
                  Full Name
                </Typography>
                <TextField
                  variant="outlined"
                  fullWidth
                  placeholder="Enter your full name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  sx={{ mb: 3 }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon sx={{ color: 'rgba(0,0,0,0.25)', fontSize: 18 }} />
                        </InputAdornment>
                      ),
                    }
                  }}
                />
              </>
            )}

            <Typography variant="body2" sx={{ fontWeight: 700, color: '#061A2C', mb: 1, fontSize: '0.85rem' }}>
              Email Address
            </Typography>
            <TextField
              variant="outlined"
              fullWidth
              placeholder="Enter your email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              sx={{ mb: 3 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: 'rgba(0,0,0,0.25)', fontSize: 18 }} />
                    </InputAdornment>
                  ),
                }
              }}
            />

            <Typography variant="body2" sx={{ fontWeight: 700, color: '#061A2C', mb: 1, fontSize: '0.85rem' }}>
              Password
            </Typography>
            <TextField
              variant="outlined"
              fullWidth
              placeholder="Enter your password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              sx={{ mb: 1 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: 'rgba(0,0,0,0.25)', fontSize: 18 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                        {showPassword ? <VisibilityOffIcon sx={{ fontSize: 18 }} /> : <VisibilityIcon sx={{ fontSize: 18 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }
              }}
            />

            {!isRegistering && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                <Typography
                  variant="body2"
                  onClick={() => alert("Forgot Password helper: Please contact your IT administrator to reset your credentials.")}
                  sx={{
                    color: '#136B7E',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  Forgot Password?
                </Typography>
              </Box>
            )}

            <Button
              fullWidth
              variant="contained"
              type="submit"
              disabled={loading}
              endIcon={!loading && <ArrowForwardIcon sx={{ fontSize: 16 }} />}
              sx={{
                mt: isRegistering ? 3 : 2,
                py: 1.5,
                fontWeight: 700,
                bgcolor: '#136B7E',
                color: 'white',
                '&:hover': { bgcolor: '#0A4253' },
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '0.95rem',
              }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : isRegistering ? 'Register' : 'Login'}
            </Button>
          </form>

          {!isRegistering && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', my: 3 }}>
                <Divider sx={{ flexGrow: 1, borderColor: 'rgba(0,0,0,0.06)' }} />
                <Typography variant="caption" sx={{ px: 2, color: 'text.secondary', fontWeight: 600 }}>
                  or
                </Typography>
                <Divider sx={{ flexGrow: 1, borderColor: 'rgba(0,0,0,0.06)' }} />
              </Box>

              <Button
                fullWidth
                variant="outlined"
                onClick={() => alert("Social Sign-In: SSO authentication is currently disabled for security reasons.")}
                startIcon={
                  <Box
                    component="img"
                    src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png"
                    sx={{ width: 18, height: 18 }}
                  />
                }
                sx={{
                  py: 1.5,
                  fontWeight: 600,
                  borderColor: 'rgba(0,0,0,0.12)',
                  color: 'text.primary',
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '0.9rem',
                  '&:hover': { borderColor: 'rgba(0,0,0,0.24)', bgcolor: 'rgba(0,0,0,0.01)' },
                }}
              >
                Continue with Google
              </Button>
            </>
          )}

          <Box sx={{ mt: 5, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              {isRegistering ? 'Already have an account? ' : "Don't have an account? "}
              <Typography
                component="span"
                variant="body2"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setLocalError(null);
                }}
                sx={{
                  color: '#136B7E',
                  fontWeight: 700,
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                {isRegistering ? 'Login here' : 'Register here'}
              </Typography>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
