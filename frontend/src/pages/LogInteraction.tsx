import React, { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { createInteraction } from '../store/slices/interactionSlice';
import { sendChatMessage, clearChat } from '../store/slices/chatSlice';
import { fetchSummary, fetchUpcoming, fetchEvents } from '../store/slices/calendarSlice';
import { fetchProducts, fetchProductsDashboard } from '../store/slices/productSlice';
import { fetchDoctors } from '../store/slices/doctorSlice';
import { fetchDashboardStats } from '../store/slices/dashboardSlice';
import {
  Box,
  Typography,
  Card,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  Paper,
  Alert,
  OutlinedInput,
  Chip,
  Avatar,
  IconButton,
} from '@mui/material';
import {
  Send as SendIcon,
  AutoAwesome as SparklesIcon,
  Close as CloseIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

export default function LogInteraction() {
  const dispatch = useAppDispatch();
  const { loading: formLoading, error: formError } = useAppSelector((state) => state.interactions);
  const { messages, loading: chatLoading, lastExtractedData } = useAppSelector((state) => state.chat);
  // Load product names dynamically from Redux
  const { list: productList } = useAppSelector((state) => state.products);
  const productOptions = productList.map((p) => p.name);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialise today's date once (avoids stale closures)
  const todayStr = new Date().toISOString().split('T')[0];

  // Structured Form Fields States — all blank/today on load
  const [docName, setDocName] = useState('');
  const [hospital, setHospital] = useState('');
  const [interactionType, setInteractionType] = useState('Meeting');
  const [meetingObjective, setMeetingObjective] = useState('Product Discussion');
  const [meetingDate, setMeetingDate] = useState(todayStr);
  const [meetingTime, setMeetingTime] = useState('10:30');
  const [meetingMode, setMeetingMode] = useState('In-Person');
  const [specialization, setSpecialization] = useState('');
  const [doctorCity, setDoctorCity] = useState('');
  
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [topics, setTopics] = useState('');
  const [materialsShared, setMaterialsShared] = useState('');
  const [samplesDistributed, setSamplesDistributed] = useState('');

  const [sentiment, setSentiment] = useState('Positive');
  const [interestLevel, setInterestLevel] = useState('High');
  const [outcomes, setOutcomes] = useState('');
  const [followupDate, setFollowupDate] = useState('');
  const [priority, setPriority] = useState('High');
  const [nextStep, setNextStep] = useState('');

  const [formSuccessMsg, setFormSuccessMsg] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');

  // Load products list on mount
  useEffect(() => {
    if (productList.length === 0) {
      dispatch(fetchProducts());
    }
  }, [dispatch, productList.length]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  // Helper to parse relative date keywords on frontend
  const parseRelativeDateFrontend = (dateStr: string): string => {
    if (!dateStr) return '';
    const ds = dateStr.toLowerCase().trim();
    const today = new Date();
    
    if (ds === 'today') {
      return today.toISOString().split('T')[0];
    } else if (ds === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    } else if (ds === 'next monday') {
      const resultDate = new Date(today);
      resultDate.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
      return resultDate.toISOString().split('T')[0];
    } else if (ds === 'next friday') {
      const resultDate = new Date(today);
      resultDate.setDate(today.getDate() + ((5 + 7 - today.getDay()) % 7 || 7));
      return resultDate.toISOString().split('T')[0];
    } else if (ds.includes('week')) {
      const match = ds.match(/(\d+|two|three|four)/);
      let weeks = 1;
      if (match) {
        const words: Record<string, number> = { two: 2, three: 3, four: 4 };
        weeks = parseInt(match[1]) || words[match[1]] || 1;
      }
      const resultDate = new Date(today);
      resultDate.setDate(today.getDate() + weeks * 7);
      return resultDate.toISOString().split('T')[0];
    }
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    return dateStr;
  };

  // Sync AI extraction to the structured state
  useEffect(() => {
    if (lastExtractedData) {
      if (lastExtractedData.doctor_name) {
        setDocName(lastExtractedData.doctor_name);
      }
      if (lastExtractedData.hospital) {
        setHospital(lastExtractedData.hospital);
      }
      if (lastExtractedData.specialization) {
        setSpecialization(lastExtractedData.specialization);
      }
      if (lastExtractedData.interaction_date) {
        setMeetingDate(parseRelativeDateFrontend(lastExtractedData.interaction_date));
      }
      if (lastExtractedData.interaction_time) {
        setMeetingTime(lastExtractedData.interaction_time);
      }
      if (lastExtractedData.interaction_type) {
        const it = lastExtractedData.interaction_type;
        if (['Meeting', 'Virtual Call', 'Phone Call', 'Email'].includes(it)) {
          setInteractionType(it);
        }
      }
      if (lastExtractedData.meeting_mode) {
        const mm = lastExtractedData.meeting_mode;
        if (['In-Person', 'Virtual'].includes(mm)) {
          setMeetingMode(mm);
        }
      }
      if (lastExtractedData.meeting_objective) {
        const mo = lastExtractedData.meeting_objective;
        if (['Product Discussion', 'Formulary Follow-up', 'Symposium Invitation', 'Sample Distribution'].includes(mo)) {
          setMeetingObjective(mo);
        }
      }
      if (lastExtractedData.products_discussed) {
        const extractedProds = Array.isArray(lastExtractedData.products_discussed)
          ? lastExtractedData.products_discussed
          : [lastExtractedData.products_discussed];
        const validExtracted = extractedProds.filter((p: string) => productOptions.includes(p));
        if (validExtracted.length > 0) {
          setSelectedProducts(validExtracted);
        }
      }
      if (lastExtractedData.topics_discussed) {
        setTopics(lastExtractedData.topics_discussed);
      } else if (lastExtractedData.notes) {
        setTopics(lastExtractedData.notes);
      }
      if (lastExtractedData.materials_shared) {
        if (Array.isArray(lastExtractedData.materials_shared)) {
          setMaterialsShared(lastExtractedData.materials_shared.join(', '));
        } else {
          setMaterialsShared(lastExtractedData.materials_shared);
        }
      }
      if (lastExtractedData.samples_distributed) {
        if (Array.isArray(lastExtractedData.samples_distributed)) {
          const formatted = lastExtractedData.samples_distributed
            .map((s: any) => typeof s === 'object' ? `${s.product} (${s.quantity || s.count || 1} units)` : s)
            .join(', ');
          setSamplesDistributed(formatted);
        } else {
          setSamplesDistributed(lastExtractedData.samples_distributed);
        }
      }
      if (lastExtractedData.sentiment) {
        const sent = lastExtractedData.sentiment;
        if (['Positive', 'Neutral', 'Negative'].includes(sent)) {
          setSentiment(sent);
        }
      }
      if (lastExtractedData.interest_level) {
        const interest = lastExtractedData.interest_level;
        if (['High', 'Medium', 'Low'].includes(interest)) {
          setInterestLevel(interest);
        }
      }
      if (lastExtractedData.key_outcomes) {
        setOutcomes(lastExtractedData.key_outcomes);
      }
      if (lastExtractedData.next_step) {
        setNextStep(lastExtractedData.next_step);
      }
      if (lastExtractedData.priority) {
        const prio = lastExtractedData.priority;
        if (['High', 'Medium', 'Low'].includes(prio)) {
          setPriority(prio);
        }
      }
      if (lastExtractedData.follow_up_date) {
        setFollowupDate(parseRelativeDateFrontend(lastExtractedData.follow_up_date));
      }
    }
  }, [lastExtractedData]);

  // Submit and Save visit
  const handleSaveVisit = async () => {
    setFormSuccessMsg(null);

    const payload = {
      doctor_name: docName,
      hospital: hospital,
      specialization: specialization || 'General Practitioner',
      interaction_date: meetingDate,
      interaction_type: interactionType,
      products_discussed: selectedProducts,
      notes: `Topics: ${topics}. Materials Shared: ${materialsShared}. Samples Distributed: ${samplesDistributed}. Outcomes: ${outcomes}. Next Step: ${nextStep}`,
      interest_level: interestLevel,
      follow_up_date: followupDate || null,
      doctor_email: '',
      doctor_phone: '',
      doctor_city: doctorCity || '',
    };

    const action = await dispatch(createInteraction(payload));
    if (createInteraction.fulfilled.match(action)) {
      setFormSuccessMsg(`Successfully saved interaction with ${docName} to CRM database!`);
      // Cross-module refresh — calendar, products, doctors, and dashboard
      dispatch(fetchSummary());
      dispatch(fetchUpcoming());
      dispatch(fetchEvents({}));
      dispatch(fetchProducts());
      dispatch(fetchProductsDashboard());
      dispatch(fetchDoctors());
      dispatch(fetchDashboardStats()); // Refresh dashboard metrics immediately
      // Reset Form State
      setDocName('');
      setHospital('');
      setSpecialization('');
      setDoctorCity('');
      setTopics('');
      setMaterialsShared('');
      setSamplesDistributed('');
      setOutcomes('');
      setNextStep('');
      setSelectedProducts([]);
      setFollowupDate('');
      setMeetingDate(new Date().toISOString().split('T')[0]);
    }
  };

  const handleClearForm = () => {
    setDocName('');
    setHospital('');
    setSpecialization('');
    setDoctorCity('');
    setTopics('');
    setMaterialsShared('');
    setSamplesDistributed('');
    setOutcomes('');
    setNextStep('');
    setSelectedProducts([]);
    setFollowupDate('');
    setMeetingDate(new Date().toISOString().split('T')[0]);
    setFormSuccessMsg(null);
  };

  // Send conversational chat message
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const text = chatInput;
    setChatInput('');

    dispatch({
      type: 'chat/addManualMessage',
      payload: {
        id: Math.random().toString(36).substring(7),
        sender: 'user',
        text: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    });

    dispatch(sendChatMessage(text));
  };

  return (
    <Box sx={{ pb: 1, height: 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column' }}>
      {/* Grid Layout splits Form (60%) and AI Panel (40%) */}
      <Grid container spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
        {/* Left Side: Structured Form */}
        <Grid size={{ xs: 12, md: 7.2 }} sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Card
            sx={{
              border: '1px solid rgba(19, 107, 126, 0.08)',
              boxShadow: '0 4px 16px rgba(6, 26, 44, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <Box sx={{ p: 2, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              {formSuccessMsg && <Alert severity="success" sx={{ mb: 1, borderRadius: 2 }}>{formSuccessMsg}</Alert>}
              {formError && <Alert severity="error" sx={{ mb: 1, borderRadius: 2 }}>{formError}</Alert>}

              {/* SECTION 1: Interaction Details */}
              <Box sx={{ mb: 0 }}>
                <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', mb: 1, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ bgcolor: '#2CB69D', width: 18, height: 18, fontSize: '0.65rem', fontWeight: 800 }}>1</Avatar>
                  Interaction Details
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="HCP Name *"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      required
                      sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}
                      slotProps={{
                        input: {
                          endAdornment: (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                              {docName && (
                                <IconButton size="small" onClick={() => setDocName('')} sx={{ p: 0.2 }}>
                                  <CloseIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              )}
                              <SearchIcon sx={{ fontSize: 14 }} />
                            </Box>
                          )
                        }
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <FormControl fullWidth size="small" sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}>
                      <InputLabel>Interaction Type *</InputLabel>
                      <Select value={interactionType} onChange={(e) => setInteractionType(e.target.value)} label="Interaction Type *">
                        <MenuItem value="Meeting">Meeting</MenuItem>
                        <MenuItem value="Virtual Call">Virtual Call</MenuItem>
                        <MenuItem value="Phone Call">Phone Call</MenuItem>
                        <MenuItem value="Email">Email</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <FormControl fullWidth size="small" sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}>
                      <InputLabel>Meeting Objective</InputLabel>
                      <Select value={meetingObjective} onChange={(e) => setMeetingObjective(e.target.value)} label="Meeting Objective">
                        <MenuItem value="Product Discussion">Product Discussion</MenuItem>
                        <MenuItem value="Formulary Follow-up">Formulary Follow-up</MenuItem>
                        <MenuItem value="Symposium Invitation">Symposium Invitation</MenuItem>
                        <MenuItem value="Sample Distribution">Sample Distribution</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField fullWidth size="small" label="Date *" type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} required sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField fullWidth size="small" label="Time *" type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} required sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <FormControl fullWidth size="small" sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}>
                      <InputLabel>Meeting Mode</InputLabel>
                      <Select value={meetingMode} onChange={(e) => setMeetingMode(e.target.value)} label="Meeting Mode">
                        <MenuItem value="In-Person">In-Person</MenuItem>
                        <MenuItem value="Virtual">Virtual</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>

              {/* SECTION 2: Discussion & Materials */}
              <Box sx={{ mb: 0 }}>
                <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', mb: 1, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ bgcolor: '#2CB69D', width: 18, height: 18, fontSize: '0.65rem', fontWeight: 800 }}>2</Avatar>
                  Discussion &amp; Materials
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth size="small" sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}>
                      <InputLabel>Products Discussed</InputLabel>
                      <Select
                        multiple
                        value={selectedProducts}
                        onChange={(e) => setSelectedProducts(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                        input={<OutlinedInput label="Products Discussed" />}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => (
                              <Chip key={value} label={value} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                            ))}
                          </Box>
                        )}
                      >
                        {productOptions.map((prod) => (
                          <MenuItem key={prod} value={prod}>{prod}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Topics Discussed *"
                      value={topics}
                      onChange={(e) => setTopics(e.target.value)}
                      placeholder="Discussed CardioPlus efficacy..."
                      required
                      sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'stretch' }}>
                      <TextField fullWidth size="small" label="Materials Shared" value={materialsShared} onChange={(e) => setMaterialsShared(e.target.value)} sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }} />
                      <Button variant="outlined" size="small" sx={{ textTransform: 'none', fontWeight: 700, minWidth: '100px', fontSize: '0.72rem', height: '40px', whiteSpace: 'nowrap', flexShrink: 0 }}>+ Add Material</Button>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'stretch' }}>
                      <TextField fullWidth size="small" label="Samples Distributed" value={samplesDistributed} onChange={(e) => setSamplesDistributed(e.target.value)} sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }} />
                      <Button variant="outlined" size="small" sx={{ textTransform: 'none', fontWeight: 700, minWidth: '100px', fontSize: '0.72rem', height: '40px', whiteSpace: 'nowrap', flexShrink: 0 }}>+ Add Sample</Button>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* SECTION 3: AI Analysis */}
              <Box sx={{ mb: 0 }}>
                <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', mb: 1, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ bgcolor: '#2CB69D', width: 18, height: 18, fontSize: '0.65rem', fontWeight: 800 }}>3</Avatar>
                  AI Analysis
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <FormControl fullWidth size="small" sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}>
                      <InputLabel>Sentiment *</InputLabel>
                      <Select value={sentiment} onChange={(e) => setSentiment(e.target.value)} label="Sentiment *">
                        <MenuItem value="Positive">😊 Positive</MenuItem>
                        <MenuItem value="Neutral">😐 Neutral</MenuItem>
                        <MenuItem value="Negative">😡 Negative</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <FormControl fullWidth size="small" sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}>
                      <InputLabel>HCP Interest Level *</InputLabel>
                      <Select value={interestLevel} onChange={(e) => setInterestLevel(e.target.value)} label="HCP Interest Level *">
                        <MenuItem value="High">📶 High</MenuItem>
                        <MenuItem value="Medium">📶 Medium</MenuItem>
                        <MenuItem value="Low">📶 Low</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField fullWidth size="small" label="Key Outcomes / Agreements" value={outcomes} onChange={(e) => setOutcomes(e.target.value)} sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField fullWidth size="small" label="Follow-up Date" type="date" value={followupDate} onChange={(e) => setFollowupDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <FormControl fullWidth size="small" sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}>
                      <InputLabel>Priority</InputLabel>
                      <Select value={priority} onChange={(e) => setPriority(e.target.value)} label="Priority">
                        <MenuItem value="High">🏳 High</MenuItem>
                        <MenuItem value="Medium">🏳 Medium</MenuItem>
                        <MenuItem value="Low">🏳 Low</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField fullWidth size="small" label="Next Step" value={nextStep} onChange={(e) => setNextStep(e.target.value)} sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }} />
                  </Grid>
                </Grid>
              </Box>
            </Box>

            {/* Footer Form triggers */}
            <Box sx={{ px: 2, py: 1, borderTop: '1px solid rgba(19, 107, 126, 0.06)', display: 'flex', gap: 1.5, justifyContent: 'flex-end', bgcolor: '#f8fafc' }}>
              <Button
                variant="outlined"
                onClick={handleClearForm}
                sx={{ textTransform: 'none', fontWeight: 800, px: 3, py: 0.6, borderRadius: 2, fontSize: '0.82rem' }}
              >
                Clear Form
              </Button>
              <Button
                variant="contained"
                disabled={formLoading}
                onClick={handleSaveVisit}
                sx={{ textTransform: 'none', fontWeight: 800, px: 3, py: 0.6, borderRadius: 2, fontSize: '0.82rem', bgcolor: '#0E6E64', '&:hover': { bgcolor: '#0A554D' } }}
              >
                {formLoading ? <CircularProgress size={18} color="inherit" /> : 'Save Interaction'}
              </Button>
            </Box>
          </Card>
        </Grid>

        {/* Right Side: AIVOA Sales Copilot */}
        <Grid size={{ xs: 12, md: 4.8 }} sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Card
            sx={{
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid rgba(19, 107, 126, 0.08)',
              boxShadow: '0 4px 16px rgba(6, 26, 44, 0.03)',
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <Box sx={{ px: 2, py: 1.2, borderBottom: '1px solid rgba(19, 107, 126, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SparklesIcon sx={{ color: 'primary.main', fontSize: 15 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 850, color: 'primary.dark', fontSize: '0.82rem' }}>
                  AIVOA Sales Copilot
                </Typography>
                <Chip label="Live" color="success" size="small" sx={{ fontWeight: 850, height: 16, fontSize: '0.58rem' }} />
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={() => dispatch(clearChat())}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, fontSize: '0.75rem', py: 0.3 }}
              >
                Clear Chat
              </Button>
            </Box>

            {/* Chat Conversation logs area */}
            <Box sx={{ height: 'calc(100vh - 265px)', overflowY: 'auto', p: 1.8, bgcolor: '#fafafa', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* Agent Greeting */}
              <Box sx={{ display: 'flex', gap: 1, alignSelf: 'flex-start', maxWidth: '88%' }}>
                <Avatar sx={{ width: 26, height: 26, bgcolor: '#2CB69D', color: 'white', boxShadow: '0 2px 6px rgba(44, 182, 157, 0.25)', flexShrink: 0 }}>
                  <SparklesIcon sx={{ fontSize: 13 }} />
                </Avatar>
                <Paper
                  variant="outlined"
                  sx={{ p: 1.2, borderRadius: '0px 12px 12px 12px', borderColor: 'rgba(0,0,0,0.06)', bgcolor: 'white' }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 550, color: 'primary.dark', fontSize: '0.75rem', lineHeight: 1.4 }}>
                    Hi Alex! I'm listening to your conversation. Share the details of your interaction and I'll extract the key information for you.
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.4, color: 'text.secondary', fontSize: '0.6rem', textAlign: 'right' }}>
                    10:21 AM
                  </Typography>
                </Paper>
              </Box>

              {/* User Narrative example bubble */}
              <Box sx={{ alignSelf: 'flex-end', maxWidth: '88%' }}>
                <Paper sx={{ p: 1.2, borderRadius: '12px 12px 0px 12px', bgcolor: 'primary.main', color: 'white', boxShadow: 'none', border: 'none' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem', lineHeight: 1.4 }}>
                    Met Dr. Smith at Apollo Hospital. We discussed CardioPlus efficacy in heart failure patients. He showed interest in the Phase III trial results. Shared brochures and gave 2 boxes of samples. He wants more long-term outcomes data. Follow up next Friday.
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.4, opacity: 0.8, fontSize: '0.6rem', textAlign: 'right' }}>
                    10:30 AM ✓
                  </Typography>
                </Paper>
              </Box>

              {messages.filter(m => m.id !== 'greeting').map((msg) => {
                const isAgent = msg.sender === 'agent';
                return (
                  <Box
                    key={msg.id}
                    sx={{
                      display: 'flex',
                      gap: 1,
                      alignSelf: isAgent ? 'flex-start' : 'flex-end',
                      maxWidth: '88%'
                    }}
                  >
                    {isAgent && (
                      <Avatar sx={{ width: 26, height: 26, bgcolor: '#2CB69D', color: 'white', boxShadow: '0 2px 6px rgba(44, 182, 157, 0.25)', flexShrink: 0 }}>
                        <SparklesIcon sx={{ fontSize: 13 }} />
                      </Avatar>
                    )}
                    <Paper
                      variant={isAgent ? 'outlined' : 'elevation'}
                      elevation={isAgent ? 0 : 2}
                      sx={{
                        p: 1.2,
                        borderRadius: isAgent ? '0px 12px 12px 12px' : '12px 12px 0px 12px',
                        bgcolor: isAgent ? 'white' : 'primary.main',
                        color: isAgent ? 'primary.dark' : 'white',
                        borderColor: 'rgba(0,0,0,0.06)',
                        border: isAgent ? '1px solid rgba(0,0,0,0.06)' : 'none'
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: isAgent ? 550 : 600, fontSize: '0.75rem', lineHeight: 1.4 }}>
                        {msg.text}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.4, opacity: 0.8, fontSize: '0.6rem', textAlign: 'right' }}>
                        {msg.timestamp}
                      </Typography>
                    </Paper>
                  </Box>
                );
              })}

              {chatLoading && (
                <Box sx={{ alignSelf: 'flex-start', display: 'flex', gap: 1, alignItems: 'center' }}>
                  <CircularProgress size={12} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.72rem' }}>Extracting...</Typography>
                </Box>
              )}
              <div ref={chatEndRef} />
            </Box>

            {/* Input narrative text box */}
            <Box sx={{ px: 1.5, py: 1, borderTop: '1px solid rgba(0,0,0,0.05)', bgcolor: 'white', flexShrink: 0 }}>
              <form onSubmit={handleSendChat}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Type your message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={chatLoading}
                    sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' } }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={chatLoading}
                    sx={{ borderRadius: '50%', height: 34, width: 34, minWidth: 34, p: 0 }}
                  >
                    <SendIcon sx={{ fontSize: 15 }} />
                  </Button>
                </Box>
              </form>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

