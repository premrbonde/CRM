import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchConfiguration,
  patchConfiguration,
  fetchModels,
  saveModelSettings,
  fetchTools,
  patchTool,
  updateApiKey,
  validateApiKey,
  fetchStatus,
  fetchUsage,
  fetchInfo,
  runAIEngineTest,
  resetConfiguration,
  clearTestResult
} from '../store/slices/systemSlice';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  Button,
  IconButton,
  TextField,
  MenuItem,
  CircularProgress,
  Switch,
  Slider,
  LinearProgress,
  Tooltip,
  InputAdornment,
  Alert,
  Skeleton
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  HelpOutlined as InfoIcon,
  Visibility as EyeIcon,
  VisibilityOff as EyeOffIcon,
  Lock as LockIcon,
  SettingsBackupRestore as ResetIcon,
  Save as SaveIcon,
} from '@mui/icons-material';

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const {
    configuration,
    models,
    tools,
    status,
    usage,
    info,
    testResult,
    loading,
    testLoading,
    validationLoading,
    saveLoading
  } = useAppSelector((state) => state.system);

  // Visibility toggler for Groq API key
  const [showKey, setShowKey] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [validationSuccess, setValidationSuccess] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Model parameters local state
  const [activeModel, setActiveModel] = useState('');
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [topP, setTopP] = useState(0.9);
  const [frequencyPenalty, setFrequencyPenalty] = useState(0.0);
  const [presencePenalty, setPresencePenalty] = useState(0.0);

  // AI test engine states
  const [testTool, setTestTool] = useState('log_interaction');
  const [testPrompt, setTestPrompt] = useState('Summarize a doctor visit where we discussed CardioPlus.');

  // Load configuration on mount
  useEffect(() => {
    dispatch(fetchConfiguration());
    dispatch(fetchModels());
    dispatch(fetchTools());
    dispatch(fetchStatus());
    dispatch(fetchUsage());
    dispatch(fetchInfo());
  }, [dispatch]);

  // Synchronize local parameters state
  useEffect(() => {
    if (configuration) {
      setActiveModel(configuration.active_model);
      setTemperature(configuration.temperature);
      setMaxTokens(configuration.max_tokens);
      setTopP(configuration.top_p);
      setFrequencyPenalty(configuration.frequency_penalty);
      setPresencePenalty(configuration.presence_penalty);
      setKeyInput(configuration.api_key || '');
    }
  }, [configuration]);

  // Toggle mock run evaluation state
  const handleEvaluationToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const mockState = e.target.checked;
    dispatch(patchConfiguration({ evaluation_mode: mockState }));
    // Instantly refresh connectivity status
    setTimeout(() => dispatch(fetchStatus()), 300);
  };

  // Toggle single system tool state
  const handleToolToggle = (id: string, currentlyEnabled: boolean) => {
    dispatch(patchTool({ id, enabled: !currentlyEnabled }));
  };

  // Validate API key handler
  const handleValidateKey = async () => {
    if (!keyInput.trim()) {
      setValidationError("Please enter an API Key to validate.");
      return;
    }
    setValidationSuccess(null);
    setValidationError(null);
    try {
      await dispatch(validateApiKey(keyInput)).unwrap();
      setValidationSuccess("Groq Cloud API Key validated successfully!");
      dispatch(fetchStatus());
    } catch (err: any) {
      setValidationError(err || "Validation failed.");
    }
  };


  // Run AI prompt test
  const handleRunTest = () => {
    dispatch(runAIEngineTest({ tool_id: testTool, prompt: testPrompt }));
  };

  // Save overall configurations handler
  const handleSaveConfigs = async () => {
    try {
      await dispatch(saveModelSettings({
        active_model: activeModel,
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty
      })).unwrap();

      // Save key if changed
      if (keyInput !== configuration?.api_key) {
        await dispatch(updateApiKey(keyInput)).unwrap();
      }

      alert("AI settings and parameters saved successfully.");
      dispatch(fetchStatus());
      dispatch(fetchUsage());
    } catch (err: any) {
      alert(`Failed to save configurations: ${err}`);
    }
  };

  // Reset configurations to default
  const handleResetDefaults = async () => {
    if (window.confirm("Are you sure you want to reset all AI Configurations to default values?")) {
      try {
        await dispatch(resetConfiguration()).unwrap();
        // Reload all data
        dispatch(fetchTools());
        dispatch(fetchStatus());
        dispatch(fetchUsage());
        dispatch(fetchInfo());
        dispatch(clearTestResult());
        alert("Configuration reset successful.");
      } catch (err: any) {
        alert(`Reset failed: ${err}`);
      }
    }
  };

  if (loading && !configuration) {
    return (
      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
        <Grid container spacing={3}>
          <Grid size={{ xs: 6 }}><Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} /></Grid>
          <Grid size={{ xs: 6 }}><Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} /></Grid>
        </Grid>
      </Box>
    );
  }

  if (!configuration) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>Unable to load AI Configuration.</Typography>
        <Button variant="contained" onClick={() => dispatch(fetchConfiguration())} sx={{ textTransform: 'none', fontWeight: 800 }}>Retry</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column', pb: 1, overflowY: 'auto' }}>

      {/* Top Banner Header */}
      <Box sx={{ mb: 1.5, flexShrink: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 900, color: 'text.primary', fontSize: '1.25rem' }}>
          AI Configurations
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.72rem' }}>
          Manage Groq API, models and engine run modes
        </Typography>
      </Box>

      {/* Top Row: Switch Engine & Model Status Cards */}
      <Grid container spacing={1.5} sx={{ mb: 1.8, flexShrink: 0 }}>
        {/* Left Side: Mock Toggle & Api key input */}
        <Grid size={{ xs: 12, md: 7.2 }}>
          <Card variant="outlined" sx={{ borderRadius: 2.2, boxShadow: '0 2px 8px rgba(6, 26, 44, 0.02)', height: '100%' }}>
            <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', justifyBetween: 'center', height: '100%', gap: 1.8 }}>

              {/* Toggle switch */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Switch
                  checked={configuration.evaluation_mode}
                  onChange={handleEvaluationToggle}
                  color="primary"
                />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 850, color: 'primary.dark', fontSize: '0.78rem' }}>
                    Run in Evaluation (Mock) Mode
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', display: 'block', mt: 0.1 }}>
                    When enabled, the system uses local NLP and mock responses. Groq API key is not required.
                  </Typography>
                </Box>
              </Box>

              <Divider />

              {/* API Key input block */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.8 }}>
                  <LockIcon sx={{ fontSize: 11 }} /> GROQ API CREDENTIAL KEY
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    fullWidth
                    type={showKey ? "text" : "password"}
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    disabled={configuration.evaluation_mode || validationLoading}
                    placeholder="gsk_..."
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setShowKey(!showKey)} disabled={configuration.evaluation_mode}>
                              {showKey ? <EyeOffIcon sx={{ fontSize: 15 }} /> : <EyeIcon sx={{ fontSize: 15 }} />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }
                    }}
                    sx={{ '& .MuiInputBase-root': { fontSize: '0.78rem', bgcolor: 'white' } }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleValidateKey}
                    disabled={configuration.evaluation_mode || validationLoading}
                    sx={{ textTransform: 'none', fontWeight: 800, px: 2, fontSize: '0.72rem', borderRadius: 2 }}
                  >
                    {validationLoading ? <CircularProgress size={12} color="inherit" /> : 'Validate Key'}
                  </Button>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', display: 'block', mt: 0.5 }}>
                  Your API key is encrypted and stored securely on the backend.
                </Typography>
                {validationSuccess && <Alert severity="success" sx={{ mt: 1, py: 0, fontSize: '0.65rem' }}>{validationSuccess}</Alert>}
                {validationError && <Alert severity="error" sx={{ mt: 1, py: 0, fontSize: '0.65rem' }}>{validationError}</Alert>}
              </Box>

            </CardContent>
          </Card>
        </Grid>

        {/* Right Side: Connectivity Status Card */}
        <Grid size={{ xs: 12, md: 4.8 }}>
          <Card variant="outlined" sx={{ borderRadius: 2.2, boxShadow: '0 2px 8px rgba(6, 26, 44, 0.02)', height: '100%', display: 'flex', flexDirection: 'column', justifyBetween: 'center' }}>
            <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.8 }}>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Model Connectivity Status
                </Typography>
                <Chip
                  label={configuration.evaluation_mode ? "Connected (Evaluation)" : status?.connection_status || "Disconnected"}
                  size="small"
                  color={configuration.evaluation_mode || status?.connection_status === 'Connected' ? 'success' : 'warning'}
                  sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800 }}
                />
              </Box>

              <Grid container spacing={1.5}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block' }}>Target Provider</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.dark', fontSize: '0.78rem' }}>{status?.target_provider || 'Groq API Gateway'}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block' }}>Active Model</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.dark', fontSize: '0.78rem' }}>{configuration.active_model}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block' }}>Last Checked</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.dark', fontSize: '0.78rem' }}>{status?.last_checked || 'Just now'}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block' }}>Response Time</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.dark', fontSize: '0.78rem' }}>{configuration.evaluation_mode ? '45 ms' : `${status?.response_time || 0} ms`}</Typography>
                </Grid>
              </Grid>

              {/* Global Save Configurations Trigger */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                <Button
                  variant="contained"
                  size="small"
                  disabled={saveLoading}
                  startIcon={<SaveIcon sx={{ fontSize: 13 }} />}
                  onClick={handleSaveConfigs}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 800,
                    borderRadius: 2,
                    fontSize: '0.75rem',
                    bgcolor: '#0E6E64',
                    '&:hover': { bgcolor: '#0A554D' }
                  }}
                >
                  {saveLoading ? <CircularProgress size={14} color="inherit" /> : 'Save Configurations'}
                </Button>
              </Box>

            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Grid: Parameters, Tools toggles, limits, test console */}
      <Grid container spacing={1.5} sx={{ mt: 0.5 }}>

        {/* MODEL CONFIGURATION Sliders */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2.2, boxShadow: '0 2px 8px rgba(6, 26, 44, 0.02)', height: '100%' }}>
            <CardContent sx={{ p: 1.8, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
              <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Model Configuration
              </Typography>

              {/* Model Select */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>Active Model</Typography>
                <TextField
                  select
                  size="small"
                  fullWidth
                  value={activeModel}
                  onChange={(e) => setActiveModel(e.target.value)}
                  sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem', bgcolor: 'white' } }}
                >
                  {models.map((m) => (
                    <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                  ))}
                </TextField>
              </Box>

              {/* Temperature */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Temperature <Tooltip title="Controls randomness of output. Low is deterministic."><InfoIcon sx={{ fontSize: 10, cursor: 'help' }} /></Tooltip>
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800 }}>{temperature}</Typography>
                </Box>
                <Slider
                  size="small"
                  min={0}
                  max={1}
                  step={0.1}
                  value={temperature}
                  onChange={(_, val) => setTemperature(val as number)}
                  sx={{ py: 0.5 }}
                />
              </Box>

              {/* Max Tokens */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Max Tokens <Tooltip title="Maximum length of generated response token counts."><InfoIcon sx={{ fontSize: 10, cursor: 'help' }} /></Tooltip>
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800 }}>{maxTokens}</Typography>
                </Box>
                <Slider
                  size="small"
                  min={256}
                  max={8192}
                  step={256}
                  value={maxTokens}
                  onChange={(_, val) => setMaxTokens(val as number)}
                  sx={{ py: 0.5 }}
                />
              </Box>

              {/* Top P */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Top P <Tooltip title="Nucleus sampling probability filter."><InfoIcon sx={{ fontSize: 10, cursor: 'help' }} /></Tooltip>
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800 }}>{topP}</Typography>
                </Box>
                <Slider
                  size="small"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={topP}
                  onChange={(_, val) => setTopP(val as number)}
                  sx={{ py: 0.5 }}
                />
              </Box>

              {/* Frequency Penalty */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Frequency Penalty <Tooltip title="Penalizes verbatim repetition of common tokens."><InfoIcon sx={{ fontSize: 10, cursor: 'help' }} /></Tooltip>
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800 }}>{frequencyPenalty}</Typography>
                </Box>
                <Slider
                  size="small"
                  min={0}
                  max={2}
                  step={0.1}
                  value={frequencyPenalty}
                  onChange={(_, val) => setFrequencyPenalty(val as number)}
                  sx={{ py: 0.5 }}
                />
              </Box>

              {/* Presence Penalty */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Presence Penalty <Tooltip title="Encourages introducing novel subjects in outputs."><InfoIcon sx={{ fontSize: 10, cursor: 'help' }} /></Tooltip>
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800 }}>{presencePenalty}</Typography>
                </Box>
                <Slider
                  size="small"
                  min={0}
                  max={2}
                  step={0.1}
                  value={presencePenalty}
                  onChange={(_, val) => setPresencePenalty(val as number)}
                  sx={{ py: 0.5 }}
                />
              </Box>

            </CardContent>
          </Card>
        </Grid>

        {/* ENGINE TOOLS Toggle List */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2.2, boxShadow: '0 2px 8px rgba(6, 26, 44, 0.02)', height: '100%' }}>
            <CardContent sx={{ p: 1.8, display: 'flex', flexDirection: 'column', height: '100%', gap: 1.2 }}>
              <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Engine Tools
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, flex: 1, overflowY: 'auto' }}>
                {tools.map((t) => (
                  <Box key={t.id} sx={{ display: 'flex', justifyBetween: 'center', alignItems: 'center', gap: 1.2 }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark', fontSize: '0.65rem' }}>{t.name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.55rem', lineHeight: 1.25 }} noWrap>{t.description}</Typography>
                    </Box>
                    <Switch
                      size="small"
                      checked={t.enabled}
                      onChange={() => handleToolToggle(t.id, t.enabled)}
                    />
                  </Box>
                ))}
              </Box>

              <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, cursor: 'pointer', mt: 0.5 }} onClick={() => alert("Manage tools menu coming soon.")}>
                Manage Tools &gt;
              </Typography>

            </CardContent>
          </Card>
        </Grid>

        {/* API LIMITS & Usage rates */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2.2, boxShadow: '0 2px 8px rgba(6, 26, 44, 0.02)', height: '100%' }}>
            <CardContent sx={{ p: 1.8, display: 'flex', flexDirection: 'column', height: '100%', gap: 1.8 }}>

              <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                API &amp; Rate Limits
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>

                {/* Daily limit */}
                <Box>
                  <Box sx={{ display: 'flex', justifyBetween: 'center', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.58rem' }}>Daily Token Limit</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.58rem' }}>{usage?.daily_token_limit.toLocaleString()} / day</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyBetween: 'center', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.58rem' }}>Tokens Used Today</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.58rem' }}>{usage?.tokens_used_today.toLocaleString()} / day</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={usage ? Math.round((usage.tokens_used_today / usage.daily_token_limit) * 100) : 0}
                    sx={{ height: 6, borderRadius: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2, fontSize: '0.5rem', textAlign: 'right' }}>
                    {usage ? Math.round((usage.tokens_used_today / usage.daily_token_limit) * 100) : 0}% used
                  </Typography>
                </Box>

                {/* RPM limit */}
                <Box>
                  <Box sx={{ display: 'flex', justifyBetween: 'center', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.58rem' }}>Requests Per Minute</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.58rem' }}>{usage?.requests_per_minute} / min</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyBetween: 'center', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.58rem' }}>Current RPM Usage</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.58rem' }}>{usage?.current_rpm_usage} / min</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={usage ? Math.round((usage.current_rpm_usage / usage.requests_per_minute) * 100) : 0}
                    sx={{ height: 6, borderRadius: 1, bgcolor: '#f0f0f0', '& .MuiLinearProgress-bar': { bgcolor: '#0E6E64' } }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2, fontSize: '0.5rem', textAlign: 'right' }}>
                    {usage ? Math.round((usage.current_rpm_usage / usage.requests_per_minute) * 100) : 0}% capacity
                  </Typography>
                </Box>

              </Box>

              <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, cursor: 'pointer', mt: 0.5 }} onClick={() => alert("Usage analytics dashboard coming soon.")}>
                View Usage Analytics &gt;
              </Typography>

            </CardContent>
          </Card>
        </Grid>

        {/* AI ENGINE TEST CONSOLE */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2.2, boxShadow: '0 2px 8px rgba(6, 26, 44, 0.02)', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 1.8, display: 'flex', flexDirection: 'column', height: '100%', gap: 1.2 }}>
              <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                AI Engine Test
              </Typography>

              <TextField
                select
                size="small"
                fullWidth
                label="Select Tool"
                value={testTool}
                onChange={(e) => setTestTool(e.target.value)}
                sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem', bgcolor: 'white' } }}
              >
                {tools.map((t) => (
                  <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                ))}
              </TextField>

              <TextField
                size="small"
                fullWidth
                multiline
                rows={2}
                label="Test Prompt"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                sx={{ '& .MuiInputBase-root': { fontSize: '0.72rem', bgcolor: 'white' } }}
              />

              <Button
                variant="outlined"
                size="small"
                disabled={testLoading}
                startIcon={<PlayIcon sx={{ fontSize: 13 }} />}
                onClick={handleRunTest}
                sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, py: 0.6, fontSize: '0.72rem' }}
              >
                {testLoading ? <CircularProgress size={12} color="inherit" /> : 'Run Test'}
              </Button>

              {testResult && (
                <Box sx={{ mt: 0.5, bgcolor: '#fbfbfb', p: 1, borderRadius: 1.5, border: '1px solid rgba(0,0,0,0.04)' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">Status</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'success.main' }}>{testResult.status}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">Response Time</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800 }}>{testResult.response_time} ms</Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.52rem', lineHeight: 1.3, mt: 0.5, maxHeight: '60px', overflowY: 'auto' }}>
                    {testResult.generated_response}
                  </Typography>
                </Box>
              )}

              <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, cursor: 'pointer', mt: 'auto' }} onClick={() => alert("Full connection response logs logged in console.")}>
                View Full Response &gt;
              </Typography>

            </CardContent>
          </Card>
        </Grid>

      </Grid>

      {/* Footer System Info metadata bar */}
      {info && (
        <Box sx={{ mt: 2, p: 1.5, borderTop: '1px solid rgba(0,0,0,0.06)', bgcolor: '#fcfcfc', flexShrink: 0, borderRadius: 1.8 }}>
          <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block' }}>AI Engine Version</Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark', fontSize: '0.62rem' }}>{info.ai_engine_version}</Typography>
            </Grid>
            <Grid size={{ xs: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block' }}>Last Updated</Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark', fontSize: '0.62rem' }}>{info.last_updated}</Typography>
            </Grid>
            <Grid size={{ xs: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block' }}>Environment</Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark', fontSize: '0.62rem' }}>{info.environment}</Typography>
            </Grid>
            <Grid size={{ xs: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block' }}>Region</Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark', fontSize: '0.62rem' }}>{info.region}</Typography>
            </Grid>
            <Grid size={{ xs: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block' }}>Encryption</Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark', fontSize: '0.62rem' }}>{info.encryption}</Typography>
            </Grid>
            <Grid size={{ xs: 2 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="text"
                color="error"
                size="small"
                onClick={handleResetDefaults}
                startIcon={<ResetIcon sx={{ fontSize: 13 }} />}
                sx={{ textTransform: 'none', fontWeight: 800, fontSize: '0.65rem' }}
              >
                Reset to Defaults
              </Button>
            </Grid>
          </Grid>
        </Box>
      )}

    </Box>
  );
}
