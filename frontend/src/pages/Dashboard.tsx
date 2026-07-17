import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchDashboardStats } from '../store/slices/dashboardSlice';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Chip,
  Paper,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Avatar,
  TextField,
  LinearProgress,
  Skeleton,
  MenuItem
} from '@mui/material';
import {
  AutoAwesome as SparklesIcon,
  Close as CloseIcon,
  TrendingUp as TrendingIcon,
  Favorite as HeartIcon,
  People as PeopleIcon,
  Lightbulb as LightbulbIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  CalendarMonth as CalendarIcon,
  Schedule as ScheduleIcon,
  PlayArrow as PlayIcon,
  AssignmentInd as ProfileIcon,
  TrendingFlat as NormalIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

export default function Dashboard() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { stats, loading } = useAppSelector((state) => state.dashboard);

  // Coaching recommendations popup state
  const [coachingOpen, setCoachingOpen] = useState(false);
  const [coachingText, setCoachingText] = useState('');
  const [coachingTitle, setCoachingTitle] = useState('');

  // Initial load
  useEffect(() => {
    dispatch(fetchDashboardStats());
  }, [dispatch]);

  const triggerCoachingDialog = (title: string, text: string) => {
    setCoachingTitle(title);
    setCoachingText(text);
    setCoachingOpen(true);
  };

  // Renders skeleton loaders if loading
  if (loading && !stats) {
    return (
      <Box sx={{ pb: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 8 }}><Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} /></Grid>
          <Grid size={{ xs: 4 }}><Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} /></Grid>
          <Grid size={{ xs: 4 }}><Skeleton variant="rectangular" height={320} sx={{ borderRadius: 2 }} /></Grid>
          <Grid size={{ xs: 4 }}><Skeleton variant="rectangular" height={320} sx={{ borderRadius: 2 }} /></Grid>
          <Grid size={{ xs: 4 }}><Skeleton variant="rectangular" height={320} sx={{ borderRadius: 2 }} /></Grid>
        </Grid>
      </Box>
    );
  }

  // Dynamic data from Redux — all sourced from live backend APIs
  const dailyBrief = stats?.daily_brief || {
    doctor_name: "—",
    hospital: "—",
    specialization: "—",
    relationship_score: 0,
    opportunity_score: "—",
    last_visit: "No visits logged",
    recommended_product: "—",
    expected_success: 0,
    ai_summary: "Log your first interaction to generate AI insights.",
    reason: "No data available"
  };

  const insights = stats?.insights || [];
  const schedule = stats?.schedule || [];
  const followups = stats?.followups || [];
  const highPriorityHcps = stats?.high_priority_hcps || [];
  const productOpportunity = stats?.product_opportunity || {
    recommended_product: "—",
    interest_pct: 0,
    doctors_discussing: 0,
    expected_conversion: 0,
    weekly_trend: 0,
    top_region: "—",
    opportunity: "No data yet"
  };

  const performance = stats?.performance || {
    today_visits: 0,
    completed_visits: 0,
    pending_visits: 0,
    monthly_target: 24,
    achievement_pct: 0,
    active_doctors: 0,
    interactions_this_week: 0,
    followups_pending: 0
  };

  const recentActivities = stats?.recent_activities || [];
  const notifications = stats?.notifications || [];

  return (
    <Box sx={{ height: 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column', pb: 1, overflowY: 'auto' }}>



      {/* Row 1: AI Daily Brief & AI Insights */}
      <Grid container spacing={1.5} sx={{ mb: 1.8, flexShrink: 0 }}>
        {/* Left Side: AI Daily Brief */}
        <Grid size={{ xs: 12, md: 7.2 }}>
          <Card variant="outlined" sx={{ borderRadius: 2.2, boxShadow: '0 2px 8px rgba(6, 26, 44, 0.02)', height: '100%' }}>
            <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>

              {/* Card Title */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <SparklesIcon sx={{ color: 'primary.main', fontSize: 16 }} />
                  <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    AI DAILY BRIEF
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton size="small" sx={{ p: 0.2, border: '1px solid rgba(0,0,0,0.05)', borderRadius: 1.5 }}>
                    <PrevIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                  <IconButton size="small" sx={{ p: 0.2, border: '1px solid rgba(0,0,0,0.05)', borderRadius: 1.5 }}>
                    <NextIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.62rem', mt: -1.2 }}>
                Your AI coach has prepared your priority actions for today.
              </Typography>

              <Grid container spacing={2} sx={{ alignItems: 'center' }}>

                {/* Doctor Core Briefing */}
                <Grid size={{ xs: 12, sm: 8.2 }}>
                  <Box sx={{ display: 'flex', gap: 1.8, alignItems: 'flex-start', mb: 1.5 }}>
                    <Box sx={{ position: 'relative' }}>
                      <Avatar
                        sx={{
                          width: 44,
                          height: 44,
                          bgcolor: 'primary.main',
                          color: 'white',
                          fontWeight: 900,
                          fontSize: '1.05rem',
                          border: '2px solid white',
                          boxShadow: '0 2px 10px rgba(19, 107, 126, 0.15)'
                        }}
                      >
                        {dailyBrief.doctor_name.replace('Dr. ', '').substring(0, 2).toUpperCase()}
                      </Avatar>
                      <Box sx={{ position: 'absolute', bottom: -2, right: -2, bgcolor: '#2CB69D', border: '1.5px solid white', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <SparklesIcon sx={{ fontSize: 8, color: 'white' }} />
                      </Box>
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'primary.dark', fontSize: '0.85rem' }}>
                        Visit {dailyBrief.doctor_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, fontSize: '0.65rem', mb: 0.8 }}>
                        {dailyBrief.hospital}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                        <Chip
                          label={`${dailyBrief.opportunity_score} Opportunity`}
                          size="small"
                          sx={{ bgcolor: 'rgba(44, 182, 157, 0.08)', color: '#2CB69D', fontWeight: 800, height: 18, fontSize: '0.6rem' }}
                        />
                        <Chip
                          label={`Relationship Score: ${dailyBrief.relationship_score}%`}
                          size="small"
                          sx={{ bgcolor: 'rgba(26, 115, 232, 0.08)', color: 'secondary.main', fontWeight: 800, height: 18, fontSize: '0.6rem' }}
                        />
                        <Chip
                          label={`Last Visit: ${dailyBrief.last_visit}`}
                          size="small"
                          sx={{ bgcolor: 'rgba(0,0,0,0.04)', color: 'text.secondary', fontWeight: 800, height: 18, fontSize: '0.6rem' }}
                        />
                      </Box>
                    </Box>
                  </Box>

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem', lineHeight: 1.45, mb: 1.8 }}>
                    {dailyBrief.ai_summary}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1.2 }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<PlayIcon sx={{ fontSize: 13 }} />}
                      onClick={() => navigate(`/log?doctor=${encodeURIComponent(dailyBrief.doctor_name)}`)}
                      sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, px: 2, py: 0.6, fontSize: '0.72rem', bgcolor: '#0E6E64', '&:hover': { bgcolor: '#0A554D' } }}
                    >
                      Start Visit
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ProfileIcon sx={{ fontSize: 13 }} />}
                      onClick={() => navigate(`/doctors?select=${encodeURIComponent(dailyBrief.doctor_name)}`)}
                      sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, px: 2, py: 0.6, fontSize: '0.72rem', color: 'primary.dark', borderColor: 'rgba(14,110,100,0.2)' }}
                    >
                      View Profile
                    </Button>
                  </Box>
                </Grid>

                {/* Right side circular expected success gauge */}
                <Grid size={{ xs: 12, sm: 3.8 }} sx={{ borderLeft: '1px solid rgba(0,0,0,0.06)', pl: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                  <Box sx={{ mb: 1.8 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
                      <TrendingIcon sx={{ fontSize: 12, color: 'primary.main' }} />
                      <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', fontSize: '0.55rem' }}>
                        RECOMMENDED FOCUS
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.dark', display: 'flex', alignItems: 'center', gap: 0.3 }}>
                      <HeartIcon sx={{ color: '#e91e63', fontSize: 12 }} />
                      {dailyBrief.recommended_product}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.55rem', mt: 0.1, lineHeight: 1.25 }}>
                      {dailyBrief.reason}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Box sx={{ position: 'relative', display: 'inline-flex', justifyContent: 'center', alignItems: 'center' }}>
                      <CircularProgress
                        variant="determinate"
                        value={dailyBrief.expected_success}
                        size={60}
                        thickness={5}
                        sx={{ color: '#2CB69D' }}
                      />
                      <Box sx={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ fontWeight: 900, fontSize: '0.75rem', color: 'primary.dark' }}>
                          {dailyBrief.expected_success}%
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.45rem', fontWeight: 900, color: 'success.main', textTransform: 'uppercase', mt: -0.3 }}>
                          High
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.55rem', mt: 1 }}>
                      Expected Success
                    </Typography>
                  </Box>
                </Grid>

              </Grid>

            </CardContent>
          </Card>
        </Grid>

        {/* Right Side: AI Insights */}
        <Grid size={{ xs: 12, md: 4.8 }}>
          <Card variant="outlined" sx={{ borderRadius: 2.2, boxShadow: '0 2px 8px rgba(6, 26, 44, 0.02)', height: '100%' }}>
            <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', justify: 'space-between', gap: 1.5 }}>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <SparklesIcon sx={{ color: 'primary.main', fontSize: 16 }} />
                  <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    AI INSIGHTS
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, cursor: 'pointer' }} onClick={() => navigate('/doctors')}>
                  View all
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, overflowY: 'auto' }}>
                {insights.map((item) => (
                  <Paper
                    key={item.id}
                    variant="outlined"
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      borderColor: 'rgba(0,0,0,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      bgcolor: 'white'
                    }}
                  >
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1.5,
                        bgcolor: item.category === 'RISK' ? 'rgba(211,47,47,0.06)' : item.category === 'TREND' ? 'rgba(44,182,157,0.06)' : 'rgba(26,115,232,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {item.category === 'RISK' ? <PeopleIcon sx={{ fontSize: 14, color: '#d32f2f' }} /> : item.category === 'TREND' ? <TrendingIcon sx={{ fontSize: 14, color: '#2CB69D' }} /> : <LightbulbIcon sx={{ fontSize: 14, color: '#1a73e8' }} />}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark', display: 'block', fontSize: '0.68rem', lineHeight: 1.25 }}>
                        {item.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: 'primary.main', cursor: 'pointer', fontWeight: 800, fontSize: '0.62rem', '&:hover': { textDecoration: 'underline' } }}
                        onClick={() => triggerCoachingDialog(item.category === 'RISK' ? 'Relationship Risk Alert' : 'Market Trend Information', item.summary)}
                      >
                        {item.link_label}
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>

            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Row 2: Today's Schedule, Pending Follow-ups, High Priority HCPs */}
      <Grid container spacing={1.5} sx={{ mb: 1.8, flexShrink: 0 }}>
        {/* Today's Schedule (1/3) */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 2.2, boxShadow: '0 2px 8px rgba(6, 26, 44, 0.02)', height: 260, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 1.5, display: 'flex', flexDirection: 'column', height: '100%', gap: 0.8 }}>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <CalendarIcon sx={{ color: 'primary.main', fontSize: 16 }} />
                  <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    TODAY'S SCHEDULE
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, cursor: 'pointer' }} onClick={() => navigate('/calendar')}>
                  View Calendar
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1, overflowY: 'auto' }}>
                {schedule.map((item) => (
                  <Box
                    key={item.id}
                    onClick={() => navigate(`/calendar?doctor=${encodeURIComponent(item.doctor_name)}`)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 0.4,
                      borderRadius: 2,
                      cursor: 'pointer',
                      bgcolor: 'rgba(0,0,0,0.01)',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
                      <Box sx={{ bgcolor: 'rgba(44,182,157,0.08)', color: '#2CB69D', px: 1, py: 0.3, borderRadius: 1, minWidth: 58, textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ fontWeight: 900, fontSize: '0.62rem' }}>{item.time}</Typography>
                      </Box>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: '0.72rem', fontWeight: 800 }}>
                        {item.doctor_name.replace('Dr. ', '').substring(0, 2).toUpperCase()}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark', display: 'block' }} noWrap>{item.doctor_name}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.58rem' }} noWrap>{item.hospital}</Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={item.visit_type}
                      size="small"
                      sx={{ height: 16, fontSize: '0.55rem', fontWeight: 800, bgcolor: 'rgba(103,58,183,0.06)', color: '#673ab7' }}
                    />
                  </Box>
                ))}
              </Box>

              <Divider />
              <Typography
                variant="caption"
                sx={{ color: 'primary.main', cursor: 'pointer', fontWeight: 800, display: 'block', textAlign: 'center', '&:hover': { textDecoration: 'underline' } }}
                onClick={() => navigate('/calendar')}
              >
                View Full Calendar →
              </Typography>

            </CardContent>
          </Card>
        </Grid>

        {/* Pending Follow-ups (1/3) */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 2.2, boxShadow: '0 2px 8px rgba(6, 26, 44, 0.02)', height: 260, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 1.5, display: 'flex', flexDirection: 'column', height: '100%', gap: 0.8 }}>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <ScheduleIcon sx={{ color: 'primary.main', fontSize: 16 }} />
                  <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    PENDING FOLLOW-UPS
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, cursor: 'pointer' }} onClick={() => navigate('/history')}>
                  View All
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1, overflowY: 'auto' }}>
                {followups.map((item) => (
                  <Box
                    key={item.id}
                    onClick={() => navigate(`/calendar?doctor=${encodeURIComponent(item.doctor_name)}`)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 0.4,
                      borderRadius: 2,
                      cursor: 'pointer',
                      bgcolor: 'rgba(0,0,0,0.01)',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: 'rgba(0,0,0,0.06)', color: 'text.primary', fontSize: '0.72rem', fontWeight: 800 }}>
                        {item.doctor_name.replace('Dr. ', '').substring(0, 2).toUpperCase()}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark', display: 'block' }} noWrap>{item.doctor_name}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.58rem' }} noWrap>{item.hospital}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', fontSize: '0.62rem', mb: 0.1 }}>{item.due_date}</Typography>
                      <Chip
                        label={item.priority}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: '0.52rem',
                          fontWeight: 900,
                          bgcolor: item.priority === 'High' ? 'rgba(211,47,47,0.06)' : 'rgba(0,0,0,0.04)',
                          color: item.priority === 'High' ? 'error.main' : 'text.secondary'
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>

              <Divider />
              <Typography
                variant="caption"
                sx={{ color: 'primary.main', cursor: 'pointer', fontWeight: 800, display: 'block', textAlign: 'center', '&:hover': { textDecoration: 'underline' } }}
                onClick={() => navigate('/history')}
              >
                View All Follow-ups →
              </Typography>

            </CardContent>
          </Card>
        </Grid>

        {/* High Priority HCPs (1/3) */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 2.2, boxShadow: '0 2px 8px rgba(6, 26, 44, 0.02)', height: 260, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 1.5, display: 'flex', flexDirection: 'column', height: '100%', gap: 0.8 }}>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <PeopleIcon sx={{ color: 'primary.main', fontSize: 16 }} />
                  <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    HIGH PRIORITY HCPS
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, cursor: 'pointer' }} onClick={() => navigate('/doctors')}>
                  View All
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1, overflowY: 'auto' }}>
                {highPriorityHcps.map((item) => (
                  <Box
                    key={item.id}
                    onClick={() => navigate(`/doctors?select=${encodeURIComponent(item.doctor_name)}`)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 0.4,
                      borderRadius: 2,
                      cursor: 'pointer',
                      bgcolor: 'rgba(0,0,0,0.01)',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: 'rgba(19, 107, 126, 0.08)', color: 'primary.main', fontSize: '0.72rem', fontWeight: 800 }}>
                        {item.doctor_name.replace('Dr. ', '').substring(0, 2).toUpperCase()}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark', display: 'block' }} noWrap>{item.doctor_name}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.58rem' }} noWrap>{item.hospital}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ position: 'relative', display: 'inline-flex', justifyContent: 'center', alignItems: 'center' }}>
                        <CircularProgress
                          variant="determinate"
                          value={item.relationship_score}
                          size={36}
                          thickness={3}
                          sx={{ color: '#2CB69D' }}
                        />
                        <Box sx={{ position: 'absolute', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <Typography sx={{ fontWeight: 800, fontSize: '0.68rem', color: 'primary.dark' }}>
                            {item.relationship_score}%
                          </Typography>
                        </Box>
                      </Box>
                      {item.trend === 'up' ? <TrendingIcon sx={{ color: 'success.main', fontSize: 14 }} /> : <NormalIcon sx={{ color: 'text.secondary', fontSize: 14 }} />}
                    </Box>
                  </Box>
                ))}
              </Box>

              <Divider />
              <Typography
                variant="caption"
                sx={{ color: 'primary.main', cursor: 'pointer', fontWeight: 800, display: 'block', textAlign: 'center', '&:hover': { textDecoration: 'underline' } }}
                onClick={() => navigate('/doctors')}
              >
                View All HCPs →
              </Typography>

            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Row 3: Product Opportunity, Performance Summary, Recent Activities, Notifications */}
      <Grid container spacing={1.5} sx={{ mb: 2, flexShrink: 0 }}>

        {/* Product Opportunity (1/4) */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2.2, boxShadow: '0 2px 8px rgba(6, 26, 44, 0.02)', height: 260, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 1.8, display: 'flex', flexDirection: 'column', height: '100%', justify: 'space-between', gap: 1 }}>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  PRODUCT OPPORTUNITY
                </Typography>
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, cursor: 'pointer' }} onClick={() => navigate('/products')}>
                  View All
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 1.5 }}>
                <Avatar sx={{ bgcolor: 'rgba(233, 30, 99, 0.08)', color: '#e91e63', width: 36, height: 36 }}>
                  <HeartIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.dark', fontSize: '0.78rem', display: 'block' }}>{productOpportunity.recommended_product}</Typography>
                  <Chip
                    label={productOpportunity.opportunity}
                    size="small"
                    sx={{ height: 16, fontSize: '0.52rem', fontWeight: 900, bgcolor: 'rgba(44,182,157,0.08)', color: '#2CB69D' }}
                  />
                </Box>
              </Box>

              <Grid container spacing={1.2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.55rem' }}>Interest Trend (7D)</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 900, color: 'success.main', display: 'flex', alignItems: 'center', gap: 0.3, fontSize: '0.75rem' }}>
                    <TrendingIcon sx={{ fontSize: 13 }} /> +{productOpportunity.weekly_trend}%
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.55rem' }}>Doctors Discussing</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.dark', fontSize: '0.75rem' }}>{productOpportunity.doctors_discussing}</Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.55rem' }}>Expected Conversion</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.dark', fontSize: '0.75rem' }}>{productOpportunity.expected_conversion}%</Typography>
                </Grid>
              </Grid>

            </CardContent>
          </Card>
        </Grid>

        {/* Performance Summary (2/4) */}
        <Grid size={{ xs: 12, md: 4.8 }}>
          <Card variant="outlined" sx={{ borderRadius: 2.2, boxShadow: '0 2px 8px rgba(6, 26, 44, 0.02)', height: 260, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 1.8, display: 'flex', flexDirection: 'column', height: '100%', justify: 'space-between', gap: 1.2 }}>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  PERFORMANCE SUMMARY
                </Typography>
                <TextField
                  select
                  size="small"
                  value="This Month"
                  slotProps={{ select: { readOnly: true } }}
                  sx={{ '& .MuiInputBase-root': { fontSize: '0.62rem', height: 22, borderRadius: 1.5, minWidth: 80, bgcolor: 'rgba(0,0,0,0.02)' } }}
                >
                  <MenuItem value="This Month">This Month</MenuItem>
                </TextField>
              </Box>

              <Grid container spacing={1.2}>
                <Grid size={{ xs: 3 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.55rem' }}>Today's Visits</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'primary.dark', fontSize: '0.85rem' }}>{performance.today_visits}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.5rem', display: 'flex', alignItems: 'center', gap: 0.2 }}>
                    <TrendingIcon sx={{ fontSize: 9, color: 'success.main' }} /> 2 vs yesterday
                  </Typography>
                </Grid>
                <Grid size={{ xs: 3 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.55rem' }}>Completed Visits</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'primary.dark', fontSize: '0.85rem' }}>{performance.completed_visits}</Typography>
                  <Typography variant="caption" color="success.main" sx={{ fontSize: '0.5rem', fontWeight: 800 }}>75%</Typography>
                </Grid>
                <Grid size={{ xs: 3 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.55rem' }}>Pending Visits</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'primary.dark', fontSize: '0.85rem' }}>{performance.pending_visits}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.5rem' }}>25%</Typography>
                </Grid>
                <Grid size={{ xs: 3 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.55rem' }}>Monthly Target</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'primary.dark', fontSize: '0.85rem' }}>{performance.monthly_target}</Typography>
                </Grid>
              </Grid>

              <Divider />

              <Grid container spacing={1.2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.55rem', mb: 0.3 }}>Achievement</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={performance.achievement_pct}
                      sx={{ height: 6, borderRadius: 1, flex: 1, bgcolor: '#f0f0f0', '& .MuiLinearProgress-bar': { bgcolor: '#0E6E64' } }}
                    />
                    <Typography variant="caption" sx={{ fontWeight: 900, fontSize: '0.62rem' }}>{performance.achievement_pct}%</Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.55rem' }}>Active Doctors</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 900, display: 'block', fontSize: '0.68rem' }}>{performance.active_doctors}</Typography>
                  <Typography variant="caption" color="success.main" sx={{ fontSize: '0.5rem', fontWeight: 800 }}>▲ 12%</Typography>
                </Grid>
                <Grid size={{ xs: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.55rem' }}>Interactions</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 900, display: 'block', fontSize: '0.68rem' }}>{performance.interactions_this_week}</Typography>
                  <Typography variant="caption" color="success.main" sx={{ fontSize: '0.5rem', fontWeight: 800 }}>▲ 15%</Typography>
                </Grid>
                <Grid size={{ xs: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.55rem' }}>Pending F-ups</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 900, display: 'block', fontSize: '0.68rem' }}>{performance.followups_pending}</Typography>
                  <Typography variant="caption" color="success.main" sx={{ fontSize: '0.5rem', fontWeight: 800 }}>▲ 15%</Typography>
                </Grid>
              </Grid>

            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activities (1/4) */}
        <Grid size={{ xs: 12, md: 2.1 }}>
          <Card variant="outlined" sx={{ borderRadius: 2.2, boxShadow: '0 2px 8px rgba(6, 26, 44, 0.02)', height: 260, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 1.8, display: 'flex', flexDirection: 'column', height: '100%', justify: 'space-between', gap: 1 }}>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  RECENT ACTIVITIES
                </Typography>
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, cursor: 'pointer' }} onClick={() => navigate('/history')}>
                  View All
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, flex: 1, overflowY: 'auto', mt: 1 }}>
                {recentActivities.map((act) => (
                  <Box key={act.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, borderBottom: '1px solid rgba(0,0,0,0.02)', pb: 0.5 }}>
                    <Box sx={{ width: 6, height: 6, bgcolor: '#2CB69D', borderRadius: '50%', mt: 0.6, flexShrink: 0 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', fontSize: '0.58rem', lineHeight: 1.2, color: 'primary.dark' }} noWrap>{act.description}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.52rem' }}>{act.time}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>

            </CardContent>
          </Card>
        </Grid>

        {/* Notifications (1/4) */}
        <Grid size={{ xs: 12, md: 2.1 }}>
          <Card variant="outlined" sx={{ borderRadius: 2.2, boxShadow: '0 2px 8px rgba(6, 26, 44, 0.02)', height: 260, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 1.8, display: 'flex', flexDirection: 'column', height: '100%', justify: 'space-between', gap: 1 }}>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  NOTIFICATIONS
                </Typography>
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, cursor: 'pointer' }} onClick={() => alert("Notification details coming soon.")}>
                  View All
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, flex: 1, overflowY: 'auto', mt: 1 }}>
                {notifications.map((n) => (
                  <Box key={n.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, borderBottom: '1px solid rgba(0,0,0,0.02)', pb: 0.5 }}>
                    <Box sx={{ width: 6, height: 6, bgcolor: n.type === 'WARNING' ? '#ff9800' : n.type === 'SUCCESS' ? '#2CB69D' : '#1a73e8', borderRadius: '50%', mt: 0.6, flexShrink: 0 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', fontSize: '0.58rem', lineHeight: 1.2, color: 'primary.dark' }} noWrap>{n.message}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.52rem' }}>{n.time}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>

            </CardContent>
          </Card>
        </Grid>

      </Grid>

      {/* Footer Status Metadata Row */}
      <Box sx={{ mt: 'auto', borderTop: '1px solid rgba(0,0,0,0.06)', p: 1, bgcolor: '#fcfcfc', borderRadius: 1.8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.58rem' }}>
            Last data refresh: May 16, 2026, 09:45 AM
          </Typography>
          <IconButton size="small" onClick={() => dispatch(fetchDashboardStats())} sx={{ p: 0.2 }}>
            <RefreshIcon sx={{ fontSize: 12 }} />
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.58rem' }}>
            All times are in IST
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 6, height: 6, bgcolor: '#2CB69D', borderRadius: '50%' }} />
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'success.main', fontSize: '0.58rem' }}>
              AI Engine: Active
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* AI Coaching popup dialog */}
      <Dialog open={coachingOpen} onClose={() => setCoachingOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 850, m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SparklesIcon sx={{ color: 'primary.main', fontSize: 18 }} />
            <Typography variant="subtitle1" component="span" sx={{ fontWeight: 850, color: 'primary.dark' }}>
              {coachingTitle}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setCoachingOpen(false)}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 2.5, pb: 2.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6, fontWeight: 600, display: 'block' }}>
            {coachingText}
          </Typography>
        </DialogContent>
      </Dialog>

    </Box>
  );
}
