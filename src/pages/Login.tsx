import { useState } from 'react';
import {
  Box, Typography, TextField, Button,
  Stack, Alert, CircularProgress, InputAdornment, Link
} from '@mui/material';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import LockIcon from '@mui/icons-material/Lock';
import { api } from '../api';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [showServerInput, setShowServerInput] = useState(false);
  const [serverUrl, setServerUrl] = useState(api.getBaseUrl());

  const sendCode = async () => {
    if (!phone || phone.length !== 11) {
      setError('请输入 11 位手机号');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.sendCode(phone);
      setStep('code');
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(timer); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    if (!code || code.length < 4) {
      setError('请输入验证码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.login(phone, code);
      api.setToken(res.jwt_token);
      if (res.user) api.cacheUser(res.user);
      onLogin();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleServerChange = () => {
    if (serverUrl && serverUrl !== api.getBaseUrl()) {
      api.setBaseUrl(serverUrl.replace(/\/$/, ''));
    }
    setShowServerInput(false);
  };

  return (
    <Box sx={{
      height: '100vh',
      display: 'flex',
      background: '#FFFFFF',
      overflow: 'hidden',
    }}>
      {/* ─── Left Brand Panel ─── */}
      <Box sx={{
        flex: '0 0 50%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        background: 'linear-gradient(160deg, #C02E0E 0%, #9B230A 50%, #7A1B07 100%)',
        overflow: 'hidden',
      }}>
        {/* Subtle geometric accent */}
        <Box sx={{
          position: 'absolute',
          top: -120,
          right: -120,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
        }} />
        <Box sx={{
          position: 'absolute',
          bottom: -80,
          left: -80,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        }} />

        {/* Horizontal JARVIS logo */}
        <img
          src="/logo-jarvis-white.png"
          alt="JARVIS"
          style={{
            width: 260,
            objectFit: 'contain',
            marginBottom: 24,
          }}
        />

        {/* Tagline */}
        <Typography sx={{
          fontSize: 16,
          fontWeight: 300,
          color: 'rgba(255,255,255,0.85)',
          letterSpacing: 3,
        }}>
          SPACE
        </Typography>

        <Typography sx={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.5)',
          mt: 3,
          letterSpacing: 1.5,
        }}>
          智能项目协作云空间
        </Typography>
      </Box>

      {/* ─── Right Login Form ─── */}
      <Box sx={{
        flex: '0 0 50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F7F7FA',
      }}>
        <Box sx={{ width: 340 }}>
          {/* ZJ logo icon */}
          <Box sx={{ textAlign: 'center', mb: 5 }}>
            <Box sx={{
              width: 56, height: 56,
              borderRadius: 2.5,
              overflow: 'hidden',
              display: 'inline-block',
              boxShadow: '0 4px 16px rgba(232,69,28,0.25)',
            }}>
              <img
                src="/logo-icon.png"
                alt="Jarvis"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Box>
            <Typography sx={{
              mt: 2,
              fontSize: 14,
              fontWeight: 500,
              color: '#3C3C43',
              letterSpacing: 0.5,
            }}>
              登录到 Jarvis Space
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{
              mb: 2.5,
              bgcolor: 'rgba(255,59,48,0.06)',
              border: '1px solid rgba(255,59,48,0.15)',
              '& .MuiAlert-message': { fontSize: 13, color: '#FF3B30' },
            }}>
              {error}
            </Alert>
          )}

          <Stack spacing={2.5}>
            {/* Phone */}
            <TextField
              fullWidth
              placeholder="手机号"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
              disabled={step === 'code'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneAndroidIcon sx={{ fontSize: 18, color: '#6B7280' }} />
                  </InputAdornment>
                ),
              }}
              inputProps={{ maxLength: 11 }}
              sx={inputSx}
            />

            {/* Code */}
            {step === 'code' && (
              <TextField
                fullWidth
                placeholder="验证码"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ fontSize: 18, color: '#6B7280' }} />
                    </InputAdornment>
                  ),
                }}
                inputProps={{ maxLength: 6 }}
                onKeyDown={e => e.key === 'Enter' && login()}
                sx={inputSx}
              />
            )}

            {/* Button */}
            {step === 'phone' ? (
              <Button
                fullWidth variant="contained" size="large"
                onClick={sendCode} disabled={loading || !phone}
                sx={btnSx}
              >
                {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : '获取验证码'}
              </Button>
            ) : (
              <>
                <Button
                  fullWidth variant="contained" size="large"
                  onClick={login} disabled={loading || !code}
                  sx={btnSx}
                >
                  {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : '登 录'}
                </Button>
                <Button
                  fullWidth variant="text" size="small" disabled={countdown > 0}
                  onClick={sendCode}
                  sx={{ color: '#6B7280', fontSize: 12 }}
                >
                  {countdown > 0 ? `重新发送 (${countdown}s)` : '重新发送验证码'}
                </Button>
              </>
            )}
          </Stack>

          {/* Server config */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            {showServerInput ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  size="small"
                  fullWidth
                  value={serverUrl}
                  onChange={e => setServerUrl(e.target.value)}
                  placeholder="http://localhost:3100"
                  onKeyDown={e => e.key === 'Enter' && handleServerChange()}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#FFFFFF',
                      borderRadius: 1.5,
                      fontSize: 12,
                      '& fieldset': { borderColor: 'rgba(60,60,67,0.15)' },
                    },
                    '& .MuiInputBase-input': { py: 0.8, color: '#000' },
                  }}
                />
                <Button size="small" onClick={handleServerChange}
                  sx={{ color: '#E8451C', fontSize: 12, whiteSpace: 'nowrap' }}>
                  确定
                </Button>
              </Stack>
            ) : (
              <Link
                component="button"
                underline="hover"
                onClick={() => setShowServerInput(true)}
                sx={{ fontSize: 11, color: 'rgba(60,60,67,0.3)' }}
              >
                服务器: {api.getBaseUrl()}
              </Link>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// Shared styles
const inputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#FFFFFF',
    borderRadius: 2,
    '& fieldset': { borderColor: 'rgba(60,60,67,0.15)' },
    '&:hover fieldset': { borderColor: 'rgba(232,69,28,0.4)' },
    '&.Mui-focused fieldset': { borderColor: '#E8451C' },
  },
  '& .MuiInputBase-input': { fontSize: 14, py: 1.4, color: '#000000' },
};

const btnSx = {
  py: 1.4,
  borderRadius: 2,
  background: '#E8451C',
  fontSize: 15,
  fontWeight: 600,
  boxShadow: '0 4px 16px rgba(232,69,28,0.3)',
  '&:hover': {
    background: '#D63A15',
    boxShadow: '0 6px 24px rgba(232,69,28,0.4)',
  },
  '&.Mui-disabled': {
    background: 'rgba(232,69,28,0.25)',
    color: 'rgba(255,255,255,0.6)',
  },
};
