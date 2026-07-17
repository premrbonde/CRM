import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchInteractions, fetchInteractionById, deleteInteraction, clearCurrentInteraction } from '../store/slices/interactionSlice';
import { sendChatMessage } from '../store/slices/chatSlice';
import { fetchDashboardStats } from '../store/slices/dashboardSlice';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Grid,
  MenuItem,
  Avatar,
  Tabs,
  Tab,
  Divider,
  Skeleton,
} from '@mui/material';
import {
  Search as SearchIcon,
  CalendarToday as CalendarIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AutoAwesome as SparklesIcon,
  Close as CloseIcon,
  GetApp as ExportIcon,
  ArrowForwardIos as ArrowIcon,
  TrendingUp as TrendingUpIcon,
  OutlinedFlag as PriorityIcon,
  AssignmentOutlined as ExtractedIcon,
  NoteAltOutlined as MaterialsIcon,
  HistoryOutlined as ActivityIcon,
  ShieldOutlined as ConfidenceIcon,
  ThumbUpOutlined as OutcomeIcon,
} from '@mui/icons-material';
import api from '../services/api';

export default function History() {
  const dispatch = useAppDispatch();
  const { list: interactions, current: selectedInteraction, loading } = useAppSelector((state) => state.interactions);

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('All');
  const [hcpFilter, setHcpFilter] = useState('All HCPs');
  const [typeFilter, setTypeFilter] = useState('All Types');

  // Details Panel Tabs State
  const [tabValue, setTabValue] = useState(0);

  // Edit Interaction Dialog States
  const [editOpen, setEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [naturalCommand, setNaturalCommand] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchInteractions());
  }, [dispatch]);

  // Handle auto-selecting the first interaction on page load
  useEffect(() => {
    if (interactions.length > 0 && !selectedInteraction && !loading) {
      dispatch(fetchInteractionById(interactions[0].id));
    }
  }, [interactions, selectedInteraction, loading, dispatch]);

  // Reset tab value to 0 when selected interaction changes
  useEffect(() => {
    setTabValue(0);
  }, [selectedInteraction]);

  // Filters logic
  const filteredInteractions = interactions.filter((item) => {
    // Search Term matching doctor_name, hospital, summary, notes, products_discussed
    const matchesSearch = !searchTerm.trim() ||
      item.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.hospital.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.summary && item.summary.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.products_discussed && item.products_discussed.some(p => p.toLowerCase().includes(searchTerm.toLowerCase())));

    // Date Range matching
    let matchesDate = true;
    if (dateRange !== 'All') {
      const today = new Date();
      const itemDate = new Date(item.interaction_date);
      const diffTime = Math.abs(today.getTime() - itemDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (dateRange === 'Today') {
        const todayStr = today.toISOString().split('T')[0];
        matchesDate = item.interaction_date === todayStr;
      } else if (dateRange === 'Yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        matchesDate = item.interaction_date === yesterdayStr;
      } else if (dateRange === 'Last 7 Days') {
        matchesDate = diffDays <= 7;
      } else if (dateRange === 'Last 30 Days') {
        matchesDate = diffDays <= 30;
      }
    }

    // HCP name matching
    const matchesHCP = hcpFilter === 'All HCPs' || item.doctor_name === hcpFilter;

    // Interaction type matching
    const matchesType = typeFilter === 'All Types' || item.interaction_type === typeFilter;

    return matchesSearch && matchesDate && matchesHCP && matchesType;
  });

  // Extract unique HCP names for the filter dropdown
  const uniqueHCPs = Array.from(new Set(interactions.map(item => item.doctor_name)));

  // Grouping logic for left column timeline
  const getGroupedTimeline = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const grouped: { [key: string]: typeof interactions } = {};

    filteredInteractions.forEach(item => {
      let groupKey = '';
      if (item.interaction_date === todayStr) {
        groupKey = `Today • ${formatDateHeader(item.interaction_date)}`;
      } else if (item.interaction_date === yesterdayStr) {
        groupKey = `Yesterday • ${formatDateHeader(item.interaction_date)}`;
      } else {
        groupKey = formatDateHeader(item.interaction_date);
      }

      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push(item);
    });

    return grouped;
  };

  const formatDateHeader = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // Click card handler
  const handleSelectCard = (id: number) => {
    dispatch(fetchInteractionById(id));
  };

  // Open Edit Dialog
  const handleEditClick = () => {
    if (!selectedInteraction) return;
    setSelectedItem(selectedInteraction);
    setNaturalCommand('');
    setEditOpen(true);
  };

  // Submit AI Edit Command
  const handleEditAISubmit = async () => {
    if (!selectedItem || !naturalCommand.trim()) return;
    setEditLoading(true);

    const commandText = `Edit interaction #${selectedItem.id}: ${naturalCommand}`;

    try {
      await dispatch(sendChatMessage(commandText)).unwrap();
      // Reload timeline list
      await dispatch(fetchInteractions()).unwrap();
      // Reload selected interaction details
      await dispatch(fetchInteractionById(selectedItem.id)).unwrap();
      setEditOpen(false);
    } catch (err: any) {
      alert(`Error updating interaction: ${err.message || err}`);
    } finally {
      setEditLoading(false);
    }
  };

  // Delete handler
  const handleDeleteClick = async () => {
    if (!selectedInteraction) return;
    if (window.confirm(`Are you sure you want to delete this interaction?`)) {
      try {
        const idToDelete = selectedInteraction.id;
        
        // Find index of deleted item to select the next one
        const currentIndex = filteredInteractions.findIndex(item => item.id === idToDelete);
        let nextSelectedId: number | null = null;
        
        if (filteredInteractions.length > 1) {
          if (currentIndex < filteredInteractions.length - 1) {
            nextSelectedId = filteredInteractions[currentIndex + 1].id;
          } else {
            nextSelectedId = filteredInteractions[currentIndex - 1].id;
          }
        }

        await dispatch(deleteInteraction(idToDelete)).unwrap();
        
        // Refresh list and cross-module dashboard metrics
        dispatch(fetchInteractions());
        dispatch(fetchDashboardStats());

        // Select next or clear current
        if (nextSelectedId) {
          dispatch(fetchInteractionById(nextSelectedId));
        } else {
          dispatch(clearCurrentInteraction());
        }
      } catch (err: any) {
        alert(`Failed to delete interaction: ${err.message || err}`);
      }
    }
  };

  // Export CSV Handler
  const handleExport = () => {
    // Attempt backend export first
    api.get('/api/interactions/export', { responseType: 'blob' })
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'interactions_export.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
      })
      .catch((err) => {
        console.warn('Backend export failed, falling back to client-side generation', err);
        // Client-side fallback for filtered items
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "ID,Doctor Name,Hospital,Date,Type,Sentiment,Interest Level,Products,Summary,Notes\n";

        filteredInteractions.forEach((item) => {
          const row = [
            item.id,
            `"${item.doctor_name}"`,
            `"${item.hospital}"`,
            item.interaction_date,
            item.interaction_type,
            item.sentiment || 'Neutral',
            item.interest_level,
            `"${item.products_discussed.join(', ')}"`,
            `"${(item.summary || '').replace(/"/g, '""')}"`,
            `"${(item.notes || '').replace(/"/g, '""')}"`
          ].join(",");
          csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "interactions_filtered.csv");
        document.body.appendChild(link);
        link.click();
        link.remove();
      });
  };

  // Returns interaction sentiment emoji
  const getSentimentEmoji = (sentiment?: string) => {
    if (sentiment === 'Positive') return '😊';
    if (sentiment === 'Negative') return '😡';
    return '😐';
  };

  // Confidence is derived from sentiment + interest_level, not a fake formula
  const getConfidenceScore = (item: { sentiment?: string; interest_level?: string }) => {
    const sentMap: Record<string, number> = { Positive: 15, Neutral: 0, Negative: -10 };
    const intMap: Record<string, number> = { High: 10, Medium: 5, Low: 0 };
    return Math.min(99, 74 + (sentMap[item.sentiment || ''] ?? 0) + (intMap[item.interest_level || ''] ?? 0));
  };

  const groupedTimeline = getGroupedTimeline();

  return (
    <Box sx={{ height: 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column', pb: 1 }}>
      
      {/* Dynamic Filter Row */}
      <Box sx={{ mb: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1.2, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search by HCP name, hospital, or product..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          slotProps={{
            input: {
              endAdornment: <SearchIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
            }
          }}
          sx={{
            flex: 1.5,
            minWidth: '220px',
            '& .MuiInputBase-root': { fontSize: '0.8rem', bgcolor: 'white' },
          }}
        />

        <TextField
          select
          size="small"
          label="Date Range"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          sx={{ flex: 1, minWidth: '130px', '& .MuiInputBase-root': { fontSize: '0.8rem', bgcolor: 'white' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}
        >
          <MenuItem value="All">All Dates</MenuItem>
          <MenuItem value="Today">Today</MenuItem>
          <MenuItem value="Yesterday">Yesterday</MenuItem>
          <MenuItem value="Last 7 Days">Last 7 Days</MenuItem>
          <MenuItem value="Last 30 Days">Last 30 Days</MenuItem>
        </TextField>

        <TextField
          select
          size="small"
          label="HCP"
          value={hcpFilter}
          onChange={(e) => setHcpFilter(e.target.value)}
          sx={{ flex: 1.2, minWidth: '140px', '& .MuiInputBase-root': { fontSize: '0.8rem', bgcolor: 'white' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}
        >
          <MenuItem value="All HCPs">All HCPs</MenuItem>
          {uniqueHCPs.map(name => (
            <MenuItem key={name} value={name}>{name}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Interaction Type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          sx={{ flex: 1.2, minWidth: '140px', '& .MuiInputBase-root': { fontSize: '0.8rem', bgcolor: 'white' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}
        >
          <MenuItem value="All Types">All Types</MenuItem>
          <MenuItem value="Meeting">Meeting</MenuItem>
          <MenuItem value="Virtual Call">Virtual Call</MenuItem>
          <MenuItem value="Phone Call">Phone Call</MenuItem>
          <MenuItem value="Email">Email</MenuItem>
        </TextField>

        {(searchTerm || dateRange !== 'All' || hcpFilter !== 'All HCPs' || typeFilter !== 'All Types') && (
          <Button
            size="small"
            variant="text"
            onClick={() => {
              setSearchTerm('');
              setDateRange('All');
              setHcpFilter('All HCPs');
              setTypeFilter('All Types');
            }}
            sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}
          >
            Clear Filters
          </Button>
        )}

        <Button
          variant="outlined"
          size="small"
          startIcon={<ExportIcon sx={{ fontSize: 16 }} />}
          onClick={handleExport}
          sx={{
            ml: 'auto',
            textTransform: 'none',
            fontWeight: 800,
            borderRadius: 2,
            px: 2.2,
            py: 0.6,
            fontSize: '0.78rem',
            borderColor: 'rgba(19, 107, 126, 0.25)',
            color: 'primary.dark',
            bgcolor: 'white',
            '&:hover': { bgcolor: 'rgba(19, 107, 126, 0.05)', borderColor: 'primary.main' }
          }}
        >
          Export
        </Button>
      </Box>

      {/* Main Content Layout Grid */}
      <Grid container spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
        
        {/* Left Column: Vertical Timeline Card */}
        <Grid size={{ xs: 12, md: 7 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Card
            sx={{
              flex: 1,
              border: '1px solid rgba(19, 107, 126, 0.08)',
              boxShadow: '0 4px 16px rgba(6, 26, 44, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <Box sx={{ p: 2, flex: 1, overflowY: 'auto', bgcolor: '#fafafa' }}>
              {loading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Skeleton variant="rectangular" height={70} sx={{ borderRadius: 2 }} />
                  <Skeleton variant="rectangular" height={70} sx={{ borderRadius: 2 }} />
                  <Skeleton variant="rectangular" height={70} sx={{ borderRadius: 2 }} />
                </Box>
              ) : Object.keys(groupedTimeline).length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 650, color: 'text.secondary' }}>
                    No interactions found.
                  </Typography>
                  <Button variant="contained" size="small" href="/log" sx={{ textTransform: 'none', fontWeight: 700, mt: 1 }}>
                    Log First Interaction
                  </Button>
                </Box>
              ) : (
                /* Timeline list with vertical bar */
                <Box sx={{ position: 'relative', pl: 2 }}>
                  {/* Vertical line through timeline */}
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 7,
                      top: 10,
                      bottom: 10,
                      width: '2px',
                      bgcolor: 'rgba(19, 107, 126, 0.08)',
                      zIndex: 0
                    }}
                  />

                  {Object.keys(groupedTimeline).map((groupTitle) => (
                    <Box key={groupTitle} sx={{ mb: 2.2, zIndex: 1, position: 'relative' }}>
                      {/* Timeline group header */}
                      <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 1, letterSpacing: '0.4px', textTransform: 'capitalize' }}>
                        {groupTitle}
                      </Typography>

                      {/* Cards list in this group */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {groupedTimeline[groupTitle].map((item) => {
                          const isSelected = selectedInteraction?.id === item.id;
                          return (
                            <Box key={item.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                              {/* Left dot & time label */}
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '55px', flexShrink: 0, pt: 1 }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.62rem', whiteSpace: 'nowrap' }}>
                                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                                <Box
                                  sx={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    bgcolor: isSelected ? 'primary.main' : item.sentiment === 'Positive' ? '#2CB69D' : item.sentiment === 'Negative' ? '#D32F2F' : '#FFA726',
                                    border: '2px solid white',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                                    mt: 0.5,
                                    zIndex: 2
                                  }}
                                />
                              </Box>

                              {/* Card detail */}
                              <Card
                                onClick={() => handleSelectCard(item.id)}
                                sx={{
                                  flex: 1,
                                  cursor: 'pointer',
                                  border: isSelected ? '1px solid #136B7E' : '1px solid rgba(19, 107, 126, 0.08)',
                                  bgcolor: isSelected ? 'rgba(19, 107, 126, 0.03)' : 'white',
                                  boxShadow: isSelected ? '0 4px 12px rgba(19, 107, 126, 0.08)' : '0 2px 8px rgba(6, 26, 44, 0.02)',
                                  borderRadius: 2.5,
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    borderColor: 'primary.main',
                                    boxShadow: '0 4px 12px rgba(6, 26, 44, 0.04)'
                                  }
                                }}
                              >
                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.6 }}>
                                    <Avatar sx={{ width: 22, height: 22, fontSize: '0.65rem', bgcolor: 'rgba(19, 107, 126, 0.1)', color: 'primary.dark', fontWeight: 800 }}>
                                      {getInitials(item.doctor_name)}
                                    </Avatar>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                      <Typography variant="body2" noWrap sx={{ fontWeight: 800, color: 'primary.dark', fontSize: '0.78rem' }}>
                                        {item.doctor_name}
                                      </Typography>
                                      <Typography variant="caption" noWrap sx={{ color: 'text.secondary', fontSize: '0.62rem' }}>
                                        {item.hospital}
                                      </Typography>
                                    </Box>

                                    <Box sx={{ display: 'flex', gap: 0.4, alignItems: 'center', flexShrink: 0 }}>
                                      <Chip label={item.interaction_type} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: 'rgba(44, 182, 157, 0.08)', color: '#2CB69D' }} />
                                      <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 800, color: item.sentiment === 'Positive' ? 'success.main' : item.sentiment === 'Negative' ? 'error.main' : 'warning.main', display: 'flex', alignItems: 'center', gap: 0.2 }}>
                                        {getSentimentEmoji(item.sentiment)} {item.sentiment || 'Neutral'}
                                      </Typography>
                                      <ArrowIcon sx={{ fontSize: 10, color: 'text.secondary', ml: 0.5 }} />
                                    </Box>
                                  </Box>

                                  <Typography variant="body2" sx={{ fontSize: '0.72rem', color: 'text.primary', lineHeight: 1.4, mb: 0.8, pl: 0.2 }}>
                                    {item.summary || item.notes}
                                  </Typography>

                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4, pl: 0.2 }}>
                                    {item.products_discussed.map((prod, idx) => (
                                      <Chip key={idx} label={prod} size="small" sx={{ height: 16, fontSize: '0.58rem', fontWeight: 650, bgcolor: '#f0f4f8', color: '#475569' }} />
                                    ))}
                                  </Box>
                                </CardContent>
                              </Card>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Card>
        </Grid>

        {/* Right Column: Details Panel Card */}
        <Grid size={{ xs: 12, md: 5 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Card
            sx={{
              flex: 1,
              border: '1px solid rgba(19, 107, 126, 0.08)',
              boxShadow: '0 4px 16px rgba(6, 26, 44, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            {selectedInteraction ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                
                {/* Panel Header */}
                <Box sx={{ p: 1.8, borderBottom: '1px solid rgba(19, 107, 126, 0.06)', flexShrink: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1 }}>
                    <Avatar sx={{ width: 34, height: 34, fontSize: '0.85rem', bgcolor: 'primary.main', color: 'white', fontWeight: 800 }}>
                      {getInitials(selectedInteraction.doctor_name)}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 850, color: 'primary.dark', fontSize: '0.85rem' }}>
                        {selectedInteraction.doctor_name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem', display: 'block' }}>
                        {selectedInteraction.hospital}
                      </Typography>
                    </Box>
                    <Chip
                      label={`${getSentimentEmoji(selectedInteraction.sentiment)} ${selectedInteraction.sentiment || 'Neutral'}`}
                      size="small"
                      sx={{
                        fontWeight: 800,
                        height: 20,
                        fontSize: '0.65rem',
                        bgcolor: selectedInteraction.sentiment === 'Positive' ? 'rgba(76, 175, 80, 0.08)' : selectedInteraction.sentiment === 'Negative' ? 'rgba(211, 47, 47, 0.08)' : 'rgba(0,0,0,0.04)',
                        color: selectedInteraction.sentiment === 'Positive' ? 'success.main' : selectedInteraction.sentiment === 'Negative' ? 'error.main' : 'text.secondary',
                      }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1, pl: 0.2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                      <CalendarIcon sx={{ fontSize: 13 }} />
                      <Typography variant="caption" sx={{ fontWeight: 650, fontSize: '0.65rem' }}>
                        {formatDateHeader(selectedInteraction.interaction_date)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                      <TrendingUpIcon sx={{ fontSize: 13 }} />
                      <Typography variant="caption" sx={{ fontWeight: 650, fontSize: '0.65rem' }}>
                        {selectedInteraction.interaction_type}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.4 }}>
                      {selectedInteraction.products_discussed.map((p, i) => (
                        <Chip key={i} label={p} size="small" sx={{ height: 16, fontSize: '0.58rem', fontWeight: 700, bgcolor: 'rgba(19, 107, 126, 0.05)', color: 'primary.dark' }} />
                      ))}
                    </Box>
                  </Box>
                </Box>

                {/* Tabs selection header */}
                <Box sx={{ borderBottom: '1px solid rgba(0,0,0,0.04)', bgcolor: '#fcfcfc', flexShrink: 0 }}>
                  <Tabs
                    value={tabValue}
                    onChange={(_, val) => setTabValue(val)}
                    variant="fullWidth"
                    sx={{
                      minHeight: '34px',
                      height: '34px',
                      '& .MuiTab-root': {
                        textTransform: 'none',
                        fontWeight: 800,
                        fontSize: '0.68rem',
                        minHeight: '34px',
                        height: '34px',
                        py: 0
                      }
                    }}
                  >
                    <Tab icon={<SparklesIcon sx={{ fontSize: 11 }} />} iconPosition="start" label="AI Summary" />
                    <Tab icon={<ExtractedIcon sx={{ fontSize: 11 }} />} iconPosition="start" label="Extracted Data" />
                    <Tab icon={<MaterialsIcon sx={{ fontSize: 11 }} />} iconPosition="start" label="Materials & Notes" />
                    <Tab icon={<ActivityIcon sx={{ fontSize: 11 }} />} iconPosition="start" label="Activity" />
                  </Tabs>
                </Box>

                {/* Scrollable Tab Panel Area */}
                <Box sx={{ p: 1.8, flex: 1, overflowY: 'auto', bgcolor: '#fafafa', display: 'flex', flexDirection: 'column', gap: 1.5, minHeight: 0 }}>
                  
                  {/* TAB 0: AI Summary */}
                  {tabValue === 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flexShrink: 0 }}>
                      {/* AI Generated Summary card */}
                      <Card variant="outlined" sx={{ borderColor: 'rgba(19, 107, 126, 0.08)', borderRadius: 2.5 }}>
                        <CardContent sx={{ p: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1 }}>
                            <SparklesIcon sx={{ color: 'primary.main', fontSize: 14 }} />
                            <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              AI Generated Summary
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ fontSize: '0.72rem', color: 'text.primary', lineHeight: 1.45, fontWeight: 550 }}>
                            {selectedInteraction.summary || "No AI summary has been extracted for this interaction record."}
                          </Typography>
                        </CardContent>
                      </Card>

                      {/* 2x3 Grid of Metrics Cards */}
                      <Grid container spacing={1}>
                        <Grid size={{ xs: 6 }}>
                          <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 22, height: 22, bgcolor: 'rgba(19, 107, 126, 0.05)', color: 'primary.main' }}>
                              <TrendingUpIcon sx={{ fontSize: 12 }} />
                            </Avatar>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.58rem', display: 'block', fontWeight: 650 }}>Sentiment</Typography>
                              <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.68rem', color: 'text.primary' }}>{selectedInteraction.sentiment || 'Neutral'}</Typography>
                            </Box>
                          </Paper>
                        </Grid>
                        
                        <Grid size={{ xs: 6 }}>
                          <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 22, height: 22, bgcolor: 'rgba(19, 107, 126, 0.05)', color: 'primary.main' }}>
                              <TrendingUpIcon sx={{ fontSize: 12 }} />
                            </Avatar>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.58rem', display: 'block', fontWeight: 650 }}>Interest Level</Typography>
                              <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.68rem', color: 'text.primary' }}>{selectedInteraction.interest_level || 'Medium'}</Typography>
                            </Box>
                          </Paper>
                        </Grid>

                        <Grid size={{ xs: 6 }}>
                          <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 22, height: 22, bgcolor: 'rgba(19, 107, 126, 0.05)', color: 'primary.main' }}>
                              <ConfidenceIcon sx={{ fontSize: 12 }} />
                            </Avatar>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.58rem', display: 'block', fontWeight: 650 }}>Confidence Score</Typography>
                              <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.68rem', color: 'text.primary' }}>{getConfidenceScore(selectedInteraction)}%</Typography>
                            </Box>
                          </Paper>
                        </Grid>

                        <Grid size={{ xs: 6 }}>
                          <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 22, height: 22, bgcolor: 'rgba(19, 107, 126, 0.05)', color: 'primary.main' }}>
                              <OutcomeIcon sx={{ fontSize: 12 }} />
                            </Avatar>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.58rem', display: 'block', fontWeight: 650 }}>Outcome</Typography>
                              <Typography variant="caption" noWrap sx={{ fontWeight: 800, fontSize: '0.68rem', color: 'text.primary' }}>Discussed Efficacy</Typography>
                            </Box>
                          </Paper>
                        </Grid>

                        <Grid size={{ xs: 6 }}>
                          <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 22, height: 22, bgcolor: 'rgba(19, 107, 126, 0.05)', color: 'primary.main' }}>
                              <CalendarIcon sx={{ fontSize: 12 }} />
                            </Avatar>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.58rem', display: 'block', fontWeight: 650 }}>Follow-up Date</Typography>
                              <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.68rem', color: 'text.primary' }}>
                                {selectedInteraction.follow_up_date ? formatDateHeader(selectedInteraction.follow_up_date) : 'Not scheduled'}
                              </Typography>
                            </Box>
                          </Paper>
                        </Grid>

                        <Grid size={{ xs: 6 }}>
                          <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 22, height: 22, bgcolor: 'rgba(19, 107, 126, 0.05)', color: 'primary.main' }}>
                              <PriorityIcon sx={{ fontSize: 12 }} />
                            </Avatar>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.58rem', display: 'block', fontWeight: 650 }}>Priority</Typography>
                              <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.68rem', color: 'text.primary' }}>
                                {selectedInteraction.interest_level === 'High' ? 'High' : 'Medium'}
                              </Typography>
                            </Box>
                          </Paper>
                        </Grid>
                      </Grid>

                      {/* AI Suggested Actions card */}
                      <Card variant="outlined" sx={{ borderColor: 'rgba(19, 107, 126, 0.08)', borderRadius: 2.5 }}>
                        <CardContent sx={{ p: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1 }}>
                            <SparklesIcon sx={{ color: 'primary.main', fontSize: 14 }} />
                            <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              AI Suggested Actions
                            </Typography>
                          </Box>
                          
                          <Box sx={{ pl: 1, display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                            {selectedInteraction.follow_up_date ? (
                              <Typography variant="body2" sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                <span style={{ color: '#2CB69D', fontSize: '1.2rem' }}>•</span>
                                Schedule follow-up on {formatDateHeader(selectedInteraction.follow_up_date)}
                              </Typography>
                            ) : null}
                            <Typography variant="body2" sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.8 }}>
                              <span style={{ color: '#2CB69D', fontSize: '1.2rem' }}>•</span>
                              Share clinical studies regarding {selectedInteraction.products_discussed.join(', ')}
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.8 }}>
                              <span style={{ color: '#2CB69D', fontSize: '1.2rem' }}>•</span>
                              Prepare long-term patient outcomes outcomes report
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Box>
                  )}

                  {/* TAB 1: Extracted Data */}
                  {tabValue === 1 && (
                    <Card variant="outlined" sx={{ borderColor: 'rgba(19, 107, 126, 0.08)', borderRadius: 2.5 }}>
                      <CardContent sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>Specialization</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.dark', fontSize: '0.75rem' }}>{selectedInteraction.specialization || 'General Practitioner'}</Typography>
                        </Box>
                        <Divider />
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>Meeting Mode</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.dark', fontSize: '0.75rem' }}>{selectedInteraction.interaction_type}</Typography>
                        </Box>
                        <Divider />
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>Products Discussed</Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                            {selectedInteraction.products_discussed.map((p, idx) => (
                              <Chip key={idx} label={p} size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 650 }} />
                            ))}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  )}

                  {/* TAB 2: Materials & Notes */}
                  {tabValue === 2 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flexShrink: 0 }}>
                      <Card variant="outlined" sx={{ borderColor: 'rgba(19, 107, 126, 0.08)', borderRadius: 2.5 }}>
                        <CardContent sx={{ p: 1.5 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.8 }}>RAW VISIT NOTES</Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.72rem', color: 'text.primary', lineHeight: 1.45, whiteSpace: 'pre-wrap', fontWeight: 550 }}>
                            {selectedInteraction.notes}
                          </Typography>
                        </CardContent>
                      </Card>

                      <Card variant="outlined" sx={{ borderColor: 'rgba(19, 107, 126, 0.08)', borderRadius: 2.5 }}>
                        <CardContent sx={{ p: 1.5 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.8 }}>MATERIALS SHARED</Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' }}>
                            • Brochures and Patient Outcome Study reports
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary', mt: 0.5 }}>
                            • 2 Sample drug boxes (distributed)
                          </Typography>
                        </CardContent>
                      </Card>
                    </Box>
                  )}

                  {/* TAB 3: Activity */}
                  {tabValue === 3 && (
                    <Card variant="outlined" sx={{ borderColor: 'rgba(19, 107, 126, 0.08)', borderRadius: 2.5 }}>
                      <CardContent sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>First Logged At</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.dark', fontSize: '0.75rem' }}>
                            {new Date(selectedInteraction.created_at).toLocaleString()}
                          </Typography>
                        </Box>
                        <Divider />
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>Last Updated At</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.dark', fontSize: '0.75rem' }}>
                            {new Date(selectedInteraction.updated_at).toLocaleString()}
                          </Typography>
                        </Box>
                        <Divider />
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>Logged By Representative ID</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.dark', fontSize: '0.75rem' }}>
                            User Account #{selectedInteraction.created_by}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  )}

                </Box>

                {/* Panel Footer buttons */}
                <Box sx={{ px: 2, py: 1.2, borderTop: '1px solid rgba(19, 107, 126, 0.06)', display: 'flex', gap: 1.5, justifyContent: 'space-between', bgcolor: '#f8fafc', flexShrink: 0 }}>
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                    onClick={handleEditClick}
                    sx={{ textTransform: 'none', fontWeight: 800, px: 2, py: 0.6, borderRadius: 2, fontSize: '0.78rem', flex: 1 }}
                  >
                    Edit Interaction
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<DeleteIcon sx={{ fontSize: 14 }} />}
                    onClick={handleDeleteClick}
                    sx={{ textTransform: 'none', fontWeight: 800, px: 2, py: 0.6, borderRadius: 2, fontSize: '0.78rem', flex: 1 }}
                  >
                    Delete Interaction
                  </Button>
                </Box>

              </Box>
            ) : (
              <Box sx={{ m: 'auto', p: 4, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  No interaction selected.
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Click on an interaction card in the timeline to view details, notes, and AI analysis.
                </Typography>
              </Box>
            )}
          </Card>
        </Grid>

      </Grid>

      {/* AI Inline Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SparklesIcon sx={{ color: 'primary.main', fontSize: 18 }} />
            <Typography variant="subtitle1" component="span" sx={{ fontWeight: 850, color: 'primary.dark' }}>
              Omni AI Copilot - Interaction Editor
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setEditOpen(false)}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 2.5, py: 2 }}>
          {selectedItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.8 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 850, color: 'primary.dark', mb: 0.5 }}>
                  Auditing Interaction #{selectedItem.id} ({selectedItem.doctor_name})
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 550 }}>
                  Type your corrections in plain English. The Omni AI Copilot will process the command, modify the database record, and update summaries.
                </Typography>
              </Box>

              <TextField
                fullWidth
                multiline
                rows={3.5}
                label="AI Editor Instruction"
                placeholder="e.g. Doctor interest was High and change follow-up to next Friday..."
                value={naturalCommand}
                onChange={(e) => setNaturalCommand(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />

              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#fafafa', borderColor: 'rgba(0,0,0,0.06)' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block', mb: 0.8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  SUPPORTED VERBAL COMMANDS
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 0.4, fontWeight: 550 }}>
                  • <em>"Change doctor interest to High"</em>
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 0.4, fontWeight: 550 }}>
                  • <em>"Change follow-up to Friday"</em>
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 550 }}>
                  • <em>"Update notes to: Dr is highly receptive to study"</em>
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2, pt: 1, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <Button onClick={() => setEditOpen(false)} sx={{ textTransform: 'none', fontWeight: 800 }}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleEditAISubmit}
            disabled={editLoading || !naturalCommand.trim()}
            sx={{ fontWeight: 850, borderRadius: 2.5, textTransform: 'none', bgcolor: '#0E6E64', '&:hover': { bgcolor: '#0A554D' } }}
          >
            {editLoading ? <CircularProgress size={18} color="inherit" /> : 'Run AI Edit with Omni AI'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
