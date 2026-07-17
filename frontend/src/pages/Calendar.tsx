import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchEvents,
  fetchUpcoming,
  fetchSummary,
  fetchRouteOptimization,
  optimizeRoutes,
  createEvent,
  updateEvent,
  deleteEvent,
  completeEvent
} from '../store/slices/calendarSlice';
import type { CalendarEvent } from '../store/slices/calendarSlice';
import { fetchDoctors } from '../store/slices/doctorSlice';
import { fetchProducts } from '../store/slices/productSlice';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Paper,
  Divider,
  Avatar,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Drawer,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
} from '@mui/material';
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  AutoAwesome as SparklesIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  CheckCircleOutlined as CompleteIcon,
  Search as SearchIcon,
  TrendingUp as TrendingIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function CalendarPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  
  // State from Redux
  const { events, upcoming, summary, routeOptimization, loading, nbaLoading } = useAppSelector((state) => state.calendar);
  const { list: doctors } = useAppSelector((state) => state.doctors);
  const { list: products } = useAppSelector((state) => state.products);

  // Month navigation state
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-11
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Selected visit details drawer
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);

  // Add / Edit Modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);

  // Form states
  const [formDocName, setFormDocName] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('10:30');
  const [formType, setFormType] = useState('In-Person');
  const [formAgenda, setFormAgenda] = useState('');
  const [formProducts, setFormProducts] = useState<string[]>([]);
  const [formPriority, setFormPriority] = useState('Medium');
  const [formNotes, setFormNotes] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Load basic data
  useEffect(() => {
    dispatch(fetchDoctors());
    dispatch(fetchProducts()); // load dynamic product list for forms
    dispatch(fetchUpcoming());
    dispatch(fetchSummary());
    dispatch(fetchRouteOptimization());
  }, [dispatch]);

  // Load events for selected month & year
  useEffect(() => {
    dispatch(fetchEvents({ month: currentMonth + 1, year: currentYear }));
  }, [dispatch, currentMonth, currentYear]);

  // Calendar cell generator
  const getDaysGrid = () => {
    const grid = [];
    const firstDay = new Date(currentYear, currentMonth, 1).getDay(); // 0-6
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthTotalDays = new Date(currentYear, currentMonth, 0).getDate();
    
    // Trailing days from previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      grid.push({
        day: prevMonthTotalDays - i,
        month: currentMonth === 0 ? 11 : currentMonth - 1,
        year: currentMonth === 0 ? currentYear - 1 : currentYear,
        isCurrentMonth: false
      });
    }
    
    // Days in current month
    for (let i = 1; i <= totalDays; i++) {
      grid.push({
        day: i,
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true
      });
    }
    
    // Leading days from next month
    const remainingCells = 42 - grid.length;
    for (let i = 1; i <= remainingCells; i++) {
      grid.push({
        day: i,
        month: currentMonth === 11 ? 0 : currentMonth + 1,
        year: currentMonth === 11 ? currentYear + 1 : currentYear,
        isCurrentMonth: false
      });
    }
    
    return grid;
  };

  // Nav actions
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // Filter events client-side instantly
  const filteredEvents = events.filter(e => {
    const matchesSearch = !searchTerm.trim() ||
      e.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.hospital.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.agenda.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.product_focus && e.product_focus.some(p => p.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesPriority = priorityFilter === 'All' || e.priority === priorityFilter;
    const matchesType = typeFilter === 'All' || e.visit_type === typeFilter;
    const matchesStatus = statusFilter === 'All' || e.status === statusFilter;

    return matchesSearch && matchesPriority && matchesType && matchesStatus;
  });

  // Optimize routes handler
  const handleOptimizeRoutes = async () => {
    try {
      await dispatch(optimizeRoutes()).unwrap();
      // Reload events to reflect optimized priorities/order
      dispatch(fetchEvents({ month: currentMonth + 1, year: currentYear }));
    } catch (err: any) {
      alert(`Optimization failed: ${err}`);
    }
  };

  // Click event handler
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDetailsDrawerOpen(true);
  };

  // Complete visit handler
  const handleCompleteVisit = async (id: number) => {
    try {
      await dispatch(completeEvent(id)).unwrap();
      // Auto-update details view if selected
      if (selectedEvent && selectedEvent.id === id) {
        setSelectedEvent({ ...selectedEvent, status: 'Completed' });
      }
      // Reload dashboard summaries/agendas
      dispatch(fetchSummary());
      dispatch(fetchUpcoming());
      dispatch(fetchEvents({ month: currentMonth + 1, year: currentYear }));
    } catch (err) {
      alert("Failed to complete scheduled visit");
    }
  };

  // Delete visit handler
  const handleDeleteVisit = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this scheduled visit?")) {
      try {
        await dispatch(deleteEvent(id)).unwrap();
        setDetailsDrawerOpen(false);
        // Refresh summaries
        dispatch(fetchSummary());
        dispatch(fetchUpcoming());
      } catch (err) {
        alert("Failed to delete event");
      }
    }
  };

  // Open modals
  const handleOpenAddModal = () => {
    setFormDocName(doctors.length > 0 ? doctors[0].name : '');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormTime('10:30');
    setFormType('In-Person');
    setFormAgenda('');
    setFormProducts([]);
    setFormPriority('Medium');
    setFormNotes('');
    setAddModalOpen(true);
  };

  const handleAddSubmit = async () => {
    if (!formDocName || !formDate || !formAgenda) {
      alert("Please fill in doctor name, date, and objective.");
      return;
    }
    setFormLoading(true);
    try {
      await dispatch(createEvent({
        doctor_name: formDocName,
        visit_date: formDate,
        visit_time: formTime,
        visit_type: formType,
        agenda: formAgenda,
        priority: formPriority,
        products: formProducts,
        notes: formNotes
      })).unwrap();

      // Refresh calendar & dependencies
      dispatch(fetchEvents({ month: currentMonth + 1, year: currentYear }));
      dispatch(fetchUpcoming());
      dispatch(fetchSummary());
      setAddModalOpen(false);
    } catch (err: any) {
      alert(`Failed to schedule: ${err.message || err}`);
    } finally {
      setFormLoading(false);
    }
  };

  // Edit visit handler
  const handleOpenEditModal = () => {
    if (!selectedEvent) return;
    setEditingEventId(selectedEvent.id);
    setFormDocName(selectedEvent.doctor_name);
    setFormDate(selectedEvent.visit_date);
    setFormTime(selectedEvent.visit_time || '10:30');
    setFormType(selectedEvent.visit_type || 'In-Person');
    setFormAgenda(selectedEvent.agenda || '');
    setFormProducts(selectedEvent.product_focus || []);
    setFormPriority(selectedEvent.priority || 'Medium');
    setFormNotes('');
    setDetailsDrawerOpen(false);
    setEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingEventId) return;
    setFormLoading(true);
    try {
      await dispatch(updateEvent({
        id: editingEventId,
        data: {
          doctor_name: formDocName,
          visit_date: formDate,
          visit_time: formTime,
          visit_type: formType,
          agenda: formAgenda,
          priority: formPriority,
          products: formProducts,
          notes: formNotes
        }
      })).unwrap();

      // Refresh calendar & dependencies
      dispatch(fetchEvents({ month: currentMonth + 1, year: currentYear }));
      dispatch(fetchUpcoming());
      dispatch(fetchSummary());
      setEditModalOpen(false);
    } catch (err: any) {
      alert(`Failed to update scheduled visit: ${err.message || err}`);
    } finally {
      setFormLoading(false);
    }
  };

  // Get initials helper
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // Grid details
  const daysGrid = getDaysGrid();

  return (
    <Box sx={{ height: 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column', pb: 1 }}>
      
      {/* Top Filter Bar */}
      <Box sx={{ mb: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1.2, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search visits by doctor, hospital, agenda..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          slotProps={{
            input: {
              endAdornment: <SearchIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
            }
          }}
          sx={{ flex: 1.5, minWidth: '220px', '& .MuiInputBase-root': { fontSize: '0.8rem', bgcolor: 'white' } }}
        />

        <TextField
          select
          size="small"
          label="Priority"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          sx={{ flex: 1, minWidth: '100px', '& .MuiInputBase-root': { fontSize: '0.8rem', bgcolor: 'white' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}
        >
          <MenuItem value="All">All Priorities</MenuItem>
          <MenuItem value="High">High</MenuItem>
          <MenuItem value="Medium">Medium</MenuItem>
          <MenuItem value="Low">Low</MenuItem>
        </TextField>

        <TextField
          select
          size="small"
          label="Visit Type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          sx={{ flex: 1, minWidth: '120px', '& .MuiInputBase-root': { fontSize: '0.8rem', bgcolor: 'white' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}
        >
          <MenuItem value="All">All Types</MenuItem>
          <MenuItem value="In-Person">In-Person</MenuItem>
          <MenuItem value="Virtual">Virtual</MenuItem>
          <MenuItem value="Phone Call">Phone Call</MenuItem>
          <MenuItem value="Email">Email</MenuItem>
        </TextField>

        <TextField
          select
          size="small"
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ flex: 1, minWidth: '110px', '& .MuiInputBase-root': { fontSize: '0.8rem', bgcolor: 'white' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}
        >
          <MenuItem value="All">All Statuses</MenuItem>
          <MenuItem value="Pending">Pending</MenuItem>
          <MenuItem value="Completed">Completed</MenuItem>
          <MenuItem value="Overdue">Overdue</MenuItem>
        </TextField>

        {(searchTerm || priorityFilter !== 'All' || typeFilter !== 'All' || statusFilter !== 'All') && (
          <Button
            size="small"
            variant="text"
            onClick={() => {
              setSearchTerm('');
              setPriorityFilter('All');
              setTypeFilter('All');
              setStatusFilter('All');
            }}
            sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}
          >
            Clear Filters
          </Button>
        )}
      </Box>

      {/* Main Grid splits Calendar (left) and Panel analytics (right) */}
      <Grid container spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
        
        {/* Left Side: Calendar month grid */}
        <Grid size={{ xs: 12, md: 8.2 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
            {/* Header controls toolbar */}
            <Box sx={{ px: 2, py: 1.2, borderBottom: '1px solid rgba(19, 107, 126, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#fcfcfc', flexShrink: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'primary.dark' }}>
                  {monthNames[currentMonth]} {currentYear}
                </Typography>
                
                <Button
                  variant="contained"
                  size="small"
                  disabled={nbaLoading}
                  startIcon={<SparklesIcon sx={{ fontSize: 13 }} />}
                  onClick={handleOptimizeRoutes}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 800,
                    borderRadius: 2,
                    fontSize: '0.75rem',
                    bgcolor: '#0E6E64',
                    '&:hover': { bgcolor: '#0A554D' }
                  }}
                >
                  {nbaLoading ? <CircularProgress size={14} color="inherit" /> : 'Optimize My Routes'}
                </Button>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <IconButton size="small" onClick={handlePrevMonth} sx={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 2 }}>
                  <PrevIcon fontSize="small" />
                </IconButton>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleToday}
                  sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, px: 2, fontSize: '0.75rem', borderColor: 'rgba(0,0,0,0.1)' }}
                >
                  Today
                </Button>
                <IconButton size="small" onClick={handleNextMonth} sx={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 2 }}>
                  <NextIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* Week headers */}
            <Box sx={{ borderBottom: '1px solid rgba(0,0,0,0.03)', py: 0.5, bgcolor: '#f8fafc', flexShrink: 0 }}>
              <Grid container spacing={0} sx={{ textAlign: 'center' }}>
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
                  <Grid size={1.71} key={d}>
                    <Typography variant="caption" sx={{ fontWeight: 850, color: 'text.secondary', fontSize: '0.62rem', letterSpacing: '0.5px' }}>
                      {d}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Main Calendar Grid cells */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 1, bgcolor: '#fafafa', minHeight: 0 }}>
              {loading && events.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <CircularProgress size={40} />
                </Box>
              ) : (
                <Grid container spacing={0.8} sx={{ height: '100%', alignContent: 'flex-start' }}>
                  {daysGrid.map((cell, idx) => {
                    // Filter events occurring on this cell's date
                    const cellDateStr = `${cell.year}-${String(cell.month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
                    const dayEvents = filteredEvents.filter(e => e.visit_date === cellDateStr);

                    return (
                      <Grid size={1.71} key={idx} sx={{ height: '95px' }}>
                        <Paper
                          variant="outlined"
                          sx={{
                            height: '100%',
                            p: 0.8,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            borderRadius: 2.2,
                            borderColor: cell.isCurrentMonth ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.02)',
                            bgcolor: cell.isCurrentMonth ? 'white' : 'rgba(0,0,0,0.01)',
                            opacity: cell.isCurrentMonth ? 1 : 0.45,
                            transition: 'all 0.15s ease',
                            '&:hover': {
                              borderColor: 'primary.main',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                            }
                          }}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 800, color: cell.isCurrentMonth ? 'text.primary' : 'text.secondary', fontSize: '0.68rem' }}>
                            {cell.day}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4, overflow: 'hidden', flex: 1, mt: 0.4 }}>
                            {dayEvents.slice(0, 2).map((ev) => (
                              <Box
                                key={ev.id}
                                onClick={() => handleEventClick(ev)}
                                sx={{
                                  p: 0.4,
                                  borderRadius: 1,
                                  bgcolor: ev.status === 'Completed' ? 'rgba(0,0,0,0.02)' : 'rgba(19, 107, 126, 0.04)',
                                  borderLeft: `2.5px solid ${ev.color}`,
                                  cursor: 'pointer',
                                  textOverflow: 'ellipsis',
                                  overflow: 'hidden',
                                  whiteSpace: 'nowrap',
                                  transition: 'background 0.2s',
                                  textDecoration: ev.status === 'Completed' ? 'line-through' : 'none',
                                  '&:hover': { bgcolor: 'rgba(19, 107, 126, 0.08)' }
                                }}
                              >
                                <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.55rem', display: 'block', color: 'primary.dark' }}>
                                  {ev.doctor_name}
                                </Typography>
                              </Box>
                            ))}
                            {dayEvents.length > 2 && (
                              <Typography variant="caption" sx={{ fontSize: '0.55rem', fontWeight: 700, color: 'text.secondary', pl: 0.3 }}>
                                +{dayEvents.length - 2} more
                              </Typography>
                            )}
                          </Box>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </Box>
          </Card>
        </Grid>

        {/* Right Side Panels: Upcoming visits, summary, and optimization */}
        <Grid size={{ xs: 12, md: 3.8 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1.5, overflowY: 'auto', minHeight: 0 }}>
          
          {/* UPCOMING VISIT AGENDAS */}
          <Card sx={{ border: '1px solid rgba(19, 107, 126, 0.08)', boxShadow: '0 4px 16px rgba(6, 26, 44, 0.03)', flexShrink: 0 }}>
            <CardContent sx={{ p: 1.8 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Upcoming Visit Agendas
                </Typography>
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, cursor: 'pointer' }} onClick={() => navigate('/calendar')}>
                  View All
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.8 }}>
                {upcoming.length === 0 ? (
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>No upcoming visits planned.</Typography>
                ) : (
                  upcoming.slice(0, 3).map((item) => (
                    <Box
                      key={item.id}
                      onClick={() => handleEventClick(item)}
                      sx={{ display: 'flex', gap: 1.2, alignItems: 'flex-start', cursor: 'pointer', '&:hover': { opacity: 0.85 } }}
                    >
                      <Avatar sx={{ bgcolor: 'rgba(19, 107, 126, 0.08)', color: 'primary.dark', width: 28, height: 28, fontSize: '0.72rem', fontWeight: 800 }}>
                        {getInitials(item.doctor_name)}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" noWrap sx={{ fontWeight: 800, color: 'primary.dark', fontSize: '0.75rem' }}>{item.doctor_name}</Typography>
                        <Typography variant="caption" noWrap color="text.secondary" sx={{ display: 'block', fontSize: '0.6rem', mt: 0.1 }}>{item.hospital}</Typography>
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.4, color: 'primary.main', fontWeight: 700, fontSize: '0.62rem' }}>
                          Task: {item.agenda}
                        </Typography>
                      </Box>
                    </Box>
                  ))
                )}
              </Box>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<AddIcon sx={{ fontSize: 13 }} />}
                onClick={handleOpenAddModal}
                sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, fontSize: '0.75rem', mt: 2, py: 0.6, borderColor: 'rgba(0,0,0,0.08)', color: 'primary.dark' }}
              >
                + Add Visit
              </Button>
            </CardContent>
          </Card>

          {/* CALENDAR SUMMARY */}
          <Card sx={{ border: '1px solid rgba(19, 107, 126, 0.08)', boxShadow: '0 4px 16px rgba(6, 26, 44, 0.03)', flexShrink: 0 }}>
            <CardContent sx={{ p: 1.8 }}>
              <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', display: 'block', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Calendar Summary
              </Typography>
              
              <Grid container spacing={1}>
                <Grid size={{ xs: 4 }}>
                  <Paper variant="outlined" sx={{ p: 0.8, borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block', fontWeight: 650 }}>Total Visits</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 850, color: 'primary.dark', fontSize: '0.78rem' }}>{summary?.total_visits || 0}</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Paper variant="outlined" sx={{ p: 0.8, borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block', fontWeight: 650 }}>Completed</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 850, color: 'success.main', fontSize: '0.78rem' }}>{summary?.completed_visits || 0}</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Paper variant="outlined" sx={{ p: 0.8, borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block', fontWeight: 650 }}>Upcoming</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 850, color: 'primary.main', fontSize: '0.78rem' }}>{summary?.upcoming_visits || 0}</Typography>
                  </Paper>
                </Grid>
                
                <Grid size={{ xs: 4 }}>
                  <Paper variant="outlined" sx={{ p: 0.8, borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block', fontWeight: 650 }}>This Week</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 850, color: 'primary.dark', fontSize: '0.78rem' }}>{summary?.this_week || 0}</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Paper variant="outlined" sx={{ p: 0.8, borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block', fontWeight: 650 }}>Next Week</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 850, color: 'primary.dark', fontSize: '0.78rem' }}>{summary?.next_week || 0}</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Paper variant="outlined" sx={{ p: 0.8, borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block', fontWeight: 650 }}>Overdue</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 850, color: 'error.main', fontSize: '0.78rem' }}>{summary?.overdue_followups || 0}</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* ROUTE OPTIMIZATION */}
          <Card sx={{ border: '1px solid rgba(19, 107, 126, 0.08)', boxShadow: '0 4px 16px rgba(6, 26, 44, 0.03)', flexShrink: 0 }}>
            <CardContent sx={{ p: 1.8 }}>
              <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', display: 'block', mb: 1.2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Route Optimization
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.62rem' }}>Efficiency Score</Typography>
                <Typography variant="body2" sx={{ fontWeight: 850, color: '#0E6E64', fontSize: '0.78rem' }}>{routeOptimization?.efficiency_score || 0}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={routeOptimization?.efficiency_score || 0} sx={{ height: 6, borderRadius: 1, mb: 1.8, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: '#0E6E64' } }} />

              <Grid container spacing={1}>
                <Grid size={{ xs: 4 }}>
                  <Paper variant="outlined" sx={{ p: 0.8, borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.52rem', display: 'block', fontWeight: 650 }}>Travel Saved</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 850, color: 'primary.dark', fontSize: '0.75rem', mt: 0.2 }}>{routeOptimization?.travel_time_saved || 0} hrs</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Paper variant="outlined" sx={{ p: 0.8, borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.52rem', display: 'block', fontWeight: 650 }}>Distance Saved</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 850, color: 'primary.dark', fontSize: '0.75rem', mt: 0.2 }}>{routeOptimization?.distance_saved || 0} km</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Paper variant="outlined" sx={{ p: 0.8, borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.52rem', display: 'block', fontWeight: 650 }}>Optimized</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 850, color: 'primary.dark', fontSize: '0.75rem', mt: 0.2 }}>{routeOptimization?.visits_optimized || 0}</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

        </Grid>
      </Grid>

      {/* Visit Details Drawer */}
      <Drawer anchor="right" open={detailsDrawerOpen} onClose={() => setDetailsDrawerOpen(false)}>
        {selectedEvent && (
          <Box sx={{ width: 340, p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', bgcolor: '#fafafa' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.06)', pb: 1.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 850, color: 'primary.dark' }}>
                  Visit Details
                </Typography>
                <IconButton size="small" onClick={() => setDetailsDrawerOpen(false)}>
                  <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, my: 0.5 }}>
                <Avatar sx={{ width: 34, height: 34, fontSize: '0.85rem', bgcolor: 'primary.main', color: 'white', fontWeight: 800 }}>
                  {getInitials(selectedEvent.doctor_name)}
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 850, color: 'primary.dark', fontSize: '0.82rem' }}>
                    {selectedEvent.doctor_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                    {selectedEvent.hospital}
                  </Typography>
                </Box>
              </Box>

              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>Date &amp; Time</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 650, fontSize: '0.75rem', color: 'text.primary', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                      <CalendarIcon sx={{ fontSize: 13 }} />
                      {selectedEvent.visit_date} • {selectedEvent.visit_time}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>Visit Type / Mode</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 650, fontSize: '0.75rem', color: 'text.primary', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                      <TrendingIcon sx={{ fontSize: 13 }} />
                      {selectedEvent.visit_type}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>Priority / Status</Typography>
                    <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'center', mt: 0.2 }}>
                      <Chip label={selectedEvent.priority} size="small" color={selectedEvent.priority === 'High' ? 'error' : selectedEvent.priority === 'Medium' ? 'warning' : 'success'} sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800 }} />
                      <Chip label={selectedEvent.status} size="small" variant="outlined" color={selectedEvent.status === 'Completed' ? 'success' : 'primary'} sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800 }} />
                    </Box>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>Agenda Objective</Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.72rem', color: 'text.primary', mt: 0.3, lineHeight: 1.4 }}>
                      {selectedEvent.agenda}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>Products Focus</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                      {selectedEvent.product_focus && selectedEvent.product_focus.length > 0 ? (
                        selectedEvent.product_focus.map((p: string, idx: number) => (
                          <Chip key={idx} label={p} size="small" sx={{ height: 16, fontSize: '0.58rem', fontWeight: 700 }} />
                        ))
                      ) : (
                        <Typography variant="caption" color="text.secondary">None specified</Typography>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {selectedEvent.status !== 'Completed' && (
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<CompleteIcon />}
                  onClick={() => handleCompleteVisit(selectedEvent.id)}
                  sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, bgcolor: '#0E6E64', '&:hover': { bgcolor: '#0A554D' } }}
                >
                  Mark Completed
                </Button>
              )}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={handleOpenEditModal}
                  startIcon={<EditIcon sx={{ fontSize: 13 }} />}
                  sx={{ textTransform: 'none', fontWeight: 800, flex: 1, borderRadius: 2 }}
                >
                  Edit
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => handleDeleteVisit(selectedEvent.id)}
                  startIcon={<DeleteIcon sx={{ fontSize: 13 }} />}
                  sx={{ textTransform: 'none', fontWeight: 800, flex: 1, borderRadius: 2 }}
                >
                  Delete
                </Button>
              </Box>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Schedule Visit Modal Dialogue */}
      <Dialog open={addModalOpen} onClose={() => setAddModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 850, color: 'primary.dark', display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarIcon sx={{ color: '#2CB69D' }} />
          Schedule New Doctor Visit
        </DialogTitle>
        <DialogContent sx={{ pb: 1, pt: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          
          <TextField
            select
            fullWidth
            size="small"
            label="Select HCP *"
            value={formDocName}
            onChange={(e) => setFormDocName(e.target.value)}
          >
            {doctors.map((d) => (
              <MenuItem key={d.id} value={d.name}>{d.name} ({d.specialization})</MenuItem>
            ))}
          </TextField>

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Date *"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="time"
                label="Time *"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
          </Grid>

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Visit Type *"
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
              >
                <MenuItem value="In-Person">In-Person</MenuItem>
                <MenuItem value="Virtual">Virtual</MenuItem>
                <MenuItem value="Phone Call">Phone Call</MenuItem>
                <MenuItem value="Email">Email</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Priority *"
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value)}
              >
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="Low">Low</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          <FormControl fullWidth size="small">
            <InputLabel>Products Focus</InputLabel>
            <Select
              multiple
              value={formProducts}
              onChange={(e) => setFormProducts(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              input={<OutlinedInput label="Products Focus" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" sx={{ height: 18, fontSize: '0.62rem' }} />
                  ))}
                </Box>
              )}
            >
              {products.map((p) => (
                <MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            size="small"
            label="Meeting Agenda / Objective *"
            placeholder="Discuss CardioPlus efficacy study outcomes..."
            value={formAgenda}
            onChange={(e) => setFormAgenda(e.target.value)}
          />

          <TextField
            fullWidth
            size="small"
            multiline
            rows={2.5}
            label="Additional Notes / Reminders"
            placeholder="Provide booklets, schedule follow-ups..."
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setAddModalOpen(false)} sx={{ textTransform: 'none', fontWeight: 800 }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddSubmit}
            disabled={formLoading}
            sx={{ textTransform: 'none', fontWeight: 800, bgcolor: '#0E6E64', '&:hover': { bgcolor: '#0A554D' } }}
          >
            {formLoading ? <CircularProgress size={18} color="inherit" /> : 'Schedule Visit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Visit Modal Dialogue */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 850, color: 'primary.dark', display: 'flex', alignItems: 'center', gap: 1 }}>
          <EditIcon sx={{ color: 'primary.main' }} />
          Edit Scheduled Visit
        </DialogTitle>
        <DialogContent sx={{ pb: 1, pt: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          
          <TextField
            select
            fullWidth
            size="small"
            label="Select HCP *"
            value={formDocName}
            onChange={(e) => setFormDocName(e.target.value)}
          >
            {doctors.map((d) => (
              <MenuItem key={d.id} value={d.name}>{d.name} ({d.specialization})</MenuItem>
            ))}
          </TextField>

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Date *"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="time"
                label="Time *"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
          </Grid>

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Visit Type *"
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
              >
                <MenuItem value="In-Person">In-Person</MenuItem>
                <MenuItem value="Virtual">Virtual</MenuItem>
                <MenuItem value="Phone Call">Phone Call</MenuItem>
                <MenuItem value="Email">Email</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Priority *"
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value)}
              >
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="Low">Low</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          <FormControl fullWidth size="small">
            <InputLabel>Products Focus</InputLabel>
            <Select
              multiple
              value={formProducts}
              onChange={(e) => setFormProducts(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              input={<OutlinedInput label="Products Focus" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" sx={{ height: 18, fontSize: '0.62rem' }} />
                  ))}
                </Box>
              )}
            >
              {products.map((p) => (
                <MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            size="small"
            label="Meeting Agenda / Objective *"
            value={formAgenda}
            onChange={(e) => setFormAgenda(e.target.value)}
          />

          <TextField
            fullWidth
            size="small"
            multiline
            rows={2.5}
            label="Additional Notes / Reminders"
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setEditModalOpen(false)} sx={{ textTransform: 'none', fontWeight: 800 }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleEditSubmit}
            disabled={formLoading}
            sx={{ textTransform: 'none', fontWeight: 800, bgcolor: '#0E6E64', '&:hover': { bgcolor: '#0A554D' } }}
          >
            {formLoading ? <CircularProgress size={18} color="inherit" /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
