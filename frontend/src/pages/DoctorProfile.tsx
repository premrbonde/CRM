import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchDoctors,
  fetchDoctorProfile,
  createDoctor,
  updateDoctor,
  deleteDoctor
} from '../store/slices/doctorSlice';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Avatar,
  Chip,
  Paper,
  CircularProgress,
  LinearProgress,
  Button,
  MenuItem,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton
} from '@mui/material';
import {
  Search as SearchIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AutoAwesome as SparklesIcon,
  ArrowForwardIos as ArrowIcon,
  ThumbUpOutlined as OutcomeIcon,
  AddCircleOutlined as AddCircleIcon
} from '@mui/icons-material';

export default function DoctorProfile() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list: doctors, currentProfile, loading } = useAppSelector((state) => state.doctors);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('All Specialties');
  const [hospitalFilter, setHospitalFilter] = useState('All Hospitals');
  const [relationshipFilter, setRelationshipFilter] = useState('All');
  const [opportunityFilter, setOpportunityFilter] = useState('All');

  // URL Query search params
  const [searchParams] = useSearchParams();
  const selectParam = searchParams.get('select');

  // UI States
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // Add / Edit Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formSpecialization, setFormSpecialization] = useState('');
  const [formHospital, setFormHospital] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchDoctors());
  }, [dispatch]);

  // Handle select doctor profile
  useEffect(() => {
    if (doctors.length > 0) {
      if (selectParam) {
        const found = doctors.find(doc => doc.name.toLowerCase().includes(selectParam.toLowerCase()));
        if (found) {
          setSelectedId(found.id);
          dispatch(fetchDoctorProfile(found.id));
          return;
        }
      }
      if (selectedId === null) {
        setSelectedId(doctors[0].id);
        dispatch(fetchDoctorProfile(doctors[0].id));
      }
    }
  }, [doctors, selectedId, dispatch, selectParam]);

  const handleDoctorClick = (id: number) => {
    setSelectedId(id);
    dispatch(fetchDoctorProfile(id));
  };

  // Client-side search and filters combined instantly
  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch = !searchTerm.trim() ||
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.hospital.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSpecialty = specialtyFilter === 'All Specialties' || doc.specialization === specialtyFilter;
    const matchesHospital = hospitalFilter === 'All Hospitals' || doc.hospital === hospitalFilter;
    
    let matchesRelationship = true;
    if (relationshipFilter !== 'All') {
      const score = doc.relationship_score || 0;
      if (relationshipFilter === 'High') matchesRelationship = score >= 85;
      else if (relationshipFilter === 'Medium') matchesRelationship = score >= 60 && score < 85;
      else if (relationshipFilter === 'Low') matchesRelationship = score < 60;
    }

    const matchesOpportunity = opportunityFilter === 'All' || doc.sales_opportunity === opportunityFilter;

    return matchesSearch && matchesSpecialty && matchesHospital && matchesRelationship && matchesOpportunity;
  });

  // Extract unique values for filtering dropdowns
  const uniqueSpecialties = Array.from(new Set(doctors.map(d => d.specialization)));
  const uniqueHospitals = Array.from(new Set(doctors.map(d => d.hospital)));

  // Relationship Badge helpers
  const getRelationshipStatus = (score: number) => {
    if (score >= 85) return { text: 'High', color: 'success' };
    if (score >= 60) return { text: 'Medium', color: 'warning' };
    return { text: 'Low', color: 'error' };
  };

  // Initials generator
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // Add HCP handler
  const handleOpenAddModal = () => {
    setFormName('');
    setFormSpecialization('');
    setFormHospital('');
    setFormCity('');
    setFormEmail('');
    setFormPhone('');
    setAddModalOpen(true);
  };

  const handleAddSubmit = async () => {
    if (!formName || !formSpecialization || !formHospital || !formCity) {
      alert('Please fill in all required fields.');
      return;
    }
    setModalLoading(true);
    try {
      const result = await dispatch(createDoctor({
        name: formName,
        specialization: formSpecialization,
        hospital: formHospital,
        city: formCity,
        email: formEmail || undefined,
        phone: formPhone || undefined
      })).unwrap();

      // Refresh directory and select new HCP
      await dispatch(fetchDoctors()).unwrap();
      setSelectedId(result.id);
      dispatch(fetchDoctorProfile(result.id));
      setAddModalOpen(false);
    } catch (err: any) {
      alert(`Failed to add HCP: ${err.message || err}`);
    } finally {
      setModalLoading(false);
    }
  };

  // Edit HCP handler
  const handleOpenEditModal = () => {
    if (!currentProfile) return;
    const { name, specialization, hospital, city, email, phone } = currentProfile.profile;
    setFormName(name);
    setFormSpecialization(specialization);
    setFormHospital(hospital);
    setFormCity(city);
    setFormEmail(email || '');
    setFormPhone(phone || '');
    setEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!currentProfile) return;
    if (!formName || !formSpecialization || !formHospital || !formCity) {
      alert('Please fill in all required fields.');
      return;
    }
    setModalLoading(true);
    try {
      await dispatch(updateDoctor({
        id: currentProfile.profile.id,
        data: {
          name: formName,
          specialization: formSpecialization,
          hospital: formHospital,
          city: formCity,
          email: formEmail || undefined,
          phone: formPhone || undefined
        }
      })).unwrap();

      // Refresh directory and profile details
      await dispatch(fetchDoctors()).unwrap();
      dispatch(fetchDoctorProfile(currentProfile.profile.id));
      setEditModalOpen(false);
    } catch (err: any) {
      alert(`Failed to update HCP: ${err.message || err}`);
    } finally {
      setModalLoading(false);
    }
  };

  // Delete HCP handler
  const handleDeleteClick = async () => {
    if (!currentProfile) return;
    if (window.confirm(`Are you sure you want to delete ${currentProfile.profile.name}?`)) {
      try {
        const idToDelete = currentProfile.profile.id;
        const currentIndex = filteredDoctors.findIndex(d => d.id === idToDelete);
        let nextSelectedId: number | null = null;
        
        if (filteredDoctors.length > 1) {
          if (currentIndex < filteredDoctors.length - 1) {
            nextSelectedId = filteredDoctors[currentIndex + 1].id;
          } else {
            nextSelectedId = filteredDoctors[currentIndex - 1].id;
          }
        }

        await dispatch(deleteDoctor(idToDelete)).unwrap();
        await dispatch(fetchDoctors()).unwrap();

        if (nextSelectedId) {
          setSelectedId(nextSelectedId);
          dispatch(fetchDoctorProfile(nextSelectedId));
        } else {
          setSelectedId(null);
          dispatch(fetchDoctorProfile(0)); // force clear or placeholder
        }
      } catch (err: any) {
        alert(`Failed to delete HCP: ${err.message || err}`);
      }
    }
  };

  // Dynamic calculations based on interaction history
  const getHistoryAnalytics = () => {
    if (!currentProfile || !currentProfile.history) {
      return {
        totalInteractions: 0,
        lastInteractionDate: 'N/A',
        firstInteractionDate: 'N/A',
        sentimentTrend: 'Neutral',
        avgInterestLevel: 'Medium',
        productsDiscussed: [] as { name: string; count: number; pct: number }[],
        preferredEngagement: [] as { type: string; pct: number }[],
      };
    }

    const history = currentProfile.history;
    const totalInteractions = history.length;
    
    // Dates
    let lastInteractionDate = 'N/A';
    let firstInteractionDate = 'N/A';
    if (totalInteractions > 0) {
      const dates = history.map(item => new Date(item.date).getTime());
      lastInteractionDate = new Date(Math.max(...dates)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      firstInteractionDate = new Date(Math.min(...dates)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    // Sentiment Trend
    const sentiments = history.map(item => item.sentiment).filter(Boolean);
    const positiveCount = sentiments.filter(s => s === 'Positive').length;
    const negativeCount = sentiments.filter(s => s === 'Negative').length;
    let sentimentTrend = 'Neutral';
    if (positiveCount > negativeCount) sentimentTrend = 'Positive';
    else if (negativeCount > positiveCount) sentimentTrend = 'Negative';

    // Average Interest Level
    const interests = history.map(item => item.interest_level);
    const interestCounts = { High: 0, Medium: 0, Low: 0 };
    interests.forEach(i => {
      if (i === 'High' || i === 'Medium' || i === 'Low') {
        interestCounts[i as 'High' | 'Medium' | 'Low']++;
      }
    });
    let avgInterestLevel = 'Medium';
    if (interestCounts.High >= interestCounts.Medium && interestCounts.High >= interestCounts.Low) avgInterestLevel = 'High';
    else if (interestCounts.Low > interestCounts.High && interestCounts.Low >= interestCounts.Medium) avgInterestLevel = 'Low';

    // Top Products Discussed
    const productCounts: { [key: string]: number } = {};
    history.forEach(item => {
      (item.products || []).forEach((prod: string) => {
        const name = prod.trim();
        if (name) productCounts[name] = (productCounts[name] || 0) + 1;
      });
    });
    const totalProductMentions = Object.values(productCounts).reduce((a, b) => a + b, 0) || 1;
    const productsDiscussed = Object.keys(productCounts)
      .map(name => ({
        name,
        count: productCounts[name],
        pct: Math.round((productCounts[name] / totalProductMentions) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    // Preferred Engagement
    const engagementCounts: { [key: string]: number } = {};
    history.forEach(item => {
      const type = item.type || 'In-Person';
      engagementCounts[type] = (engagementCounts[type] || 0) + 1;
    });
    const preferredEngagement = Object.keys(engagementCounts).map(type => ({
      type,
      pct: Math.round((engagementCounts[type] / (totalInteractions || 1)) * 100)
    })).sort((a, b) => b.pct - a.pct);

    return {
      totalInteractions,
      lastInteractionDate,
      firstInteractionDate,
      sentimentTrend,
      avgInterestLevel,
      productsDiscussed,
      preferredEngagement
    };
  };

  const analytics = getHistoryAnalytics();

  const recommendedActions = currentProfile?.next_best_action ? [
    ...(currentProfile.next_best_action.ai_rationale ? [{
      title: `Promote ${currentProfile.next_best_action.recommended_product || 'Recommended Product'}`,
      rationale: currentProfile.next_best_action.ai_rationale,
      impact: 'High'
    }] : []),
    ...(currentProfile.next_best_action.clinical_paper ? [{
      title: `Share ${currentProfile.next_best_action.clinical_paper}`,
      rationale: `Expected outcome: ${currentProfile.next_best_action.expected_outcome || 'Provide clinical brief.'}`,
      impact: 'Medium'
    }] : []),
    ...(currentProfile.next_best_action.suggested_samples && currentProfile.next_best_action.suggested_samples !== 'None' ? [{
      title: `Distribute Samples: ${currentProfile.next_best_action.suggested_samples}`,
      rationale: `Hand out sample units to evaluate patient tolerance and efficacy.`,
      impact: 'High'
    }] : []),
    ...(currentProfile.next_best_action.cross_selling && currentProfile.next_best_action.cross_selling !== 'None' ? [{
      title: `Cross-sell Portfolio`,
      rationale: currentProfile.next_best_action.cross_selling,
      impact: 'Medium'
    }] : [])
  ] : [];

  return (
    <Box sx={{ height: 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column', pb: 1 }}>
      
      {/* Top Filter Bar + Actions */}
      <Box sx={{ mb: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1.2, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search by HCP name, specialty, hospital..."
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
          label="Specialty"
          value={specialtyFilter}
          onChange={(e) => setSpecialtyFilter(e.target.value)}
          sx={{ flex: 1, minWidth: '130px', '& .MuiInputBase-root': { fontSize: '0.8rem', bgcolor: 'white' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}
        >
          <MenuItem value="All Specialties">All Specialties</MenuItem>
          {uniqueSpecialties.map(spec => (
            <MenuItem key={spec} value={spec}>{spec}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Hospital"
          value={hospitalFilter}
          onChange={(e) => setHospitalFilter(e.target.value)}
          sx={{ flex: 1.2, minWidth: '140px', '& .MuiInputBase-root': { fontSize: '0.8rem', bgcolor: 'white' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}
        >
          <MenuItem value="All Hospitals">All Hospitals</MenuItem>
          {uniqueHospitals.map(hosp => (
            <MenuItem key={hosp} value={hosp}>{hosp}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Relationship"
          value={relationshipFilter}
          onChange={(e) => setRelationshipFilter(e.target.value)}
          sx={{ flex: 1, minWidth: '110px', '& .MuiInputBase-root': { fontSize: '0.8rem', bgcolor: 'white' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}
        >
          <MenuItem value="All">All Scores</MenuItem>
          <MenuItem value="High">High (85%+)</MenuItem>
          <MenuItem value="Medium">Medium (60%-84%)</MenuItem>
          <MenuItem value="Low">Low (&lt;60%)</MenuItem>
        </TextField>

        <TextField
          select
          size="small"
          label="Opportunity"
          value={opportunityFilter}
          onChange={(e) => setOpportunityFilter(e.target.value)}
          sx={{ flex: 1, minWidth: '110px', '& .MuiInputBase-root': { fontSize: '0.8rem', bgcolor: 'white' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}
        >
          <MenuItem value="All">All Opportunities</MenuItem>
          <MenuItem value="High">High</MenuItem>
          <MenuItem value="Medium">Medium</MenuItem>
          <MenuItem value="Low">Low</MenuItem>
        </TextField>

        {(searchTerm || specialtyFilter !== 'All Specialties' || hospitalFilter !== 'All Hospitals' || relationshipFilter !== 'All' || opportunityFilter !== 'All') && (
          <Button
            size="small"
            variant="text"
            onClick={() => {
              setSearchTerm('');
              setSpecialtyFilter('All Specialties');
              setHospitalFilter('All Hospitals');
              setRelationshipFilter('All');
              setOpportunityFilter('All');
            }}
            sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}
          >
            Clear Filters
          </Button>
        )}

        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleOpenAddModal}
          sx={{
            ml: 'auto',
            textTransform: 'none',
            fontWeight: 800,
            borderRadius: 2,
            px: 2,
            py: 0.6,
            fontSize: '0.78rem',
            bgcolor: '#0E6E64',
            '&:hover': { bgcolor: '#0A554D' }
          }}
        >
          + Add New HCP
        </Button>
      </Box>

      {/* Grid splits directory list and profile details */}
      <Grid container spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
        
        {/* Left Side: Directory Table */}
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
            {/* Counter */}
            <Box sx={{ px: 2.2, py: 1.2, borderBottom: '1px solid rgba(19, 107, 126, 0.06)', bgcolor: '#fcfcfc', flexShrink: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.dark' }}>
                Total HCPs ({filteredDoctors.length})
              </Typography>
            </Box>

            {/* Scrollable table content */}
            <TableContainer sx={{ flex: 1, overflowY: 'auto' }}>
              {loading && doctors.length === 0 ? (
                <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Skeleton variant="rectangular" height={50} />
                  <Skeleton variant="rectangular" height={50} />
                  <Skeleton variant="rectangular" height={50} />
                </Box>
              ) : filteredDoctors.length === 0 ? (
                <Box sx={{ py: 8, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 650, color: 'text.secondary' }}>
                    No Healthcare Professionals Found
                  </Typography>
                  <Button variant="outlined" size="small" onClick={handleOpenAddModal} sx={{ textTransform: 'none', fontWeight: 700, mt: 1 }}>
                    Add First HCP
                  </Button>
                </Box>
              ) : (
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontSize: '0.68rem', fontWeight: 800, color: 'text.secondary', bgcolor: '#f8fafc', py: 1 } }}>
                      <TableCell>HCP</TableCell>
                      <TableCell>Specialty</TableCell>
                      <TableCell>Hospital</TableCell>
                      <TableCell align="center">Relationship Score</TableCell>
                      <TableCell align="right">Last Interaction</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredDoctors.map((doc) => {
                      const isSelected = selectedId === doc.id;
                      const rel = getRelationshipStatus(doc.relationship_score || 75);
                      return (
                        <TableRow
                          key={doc.id}
                          onClick={() => handleDoctorClick(doc.id)}
                          sx={{
                            cursor: 'pointer',
                            bgcolor: isSelected ? 'rgba(19, 107, 126, 0.03)' : 'inherit',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.015)' },
                            '& td': {
                              py: 1,
                              fontSize: '0.72rem',
                              borderBottom: '1px solid rgba(19, 107, 126, 0.04)',
                              borderColor: isSelected ? 'primary.main' : 'rgba(19, 107, 126, 0.04)'
                            }
                          }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 22, height: 22, fontSize: '0.62rem', fontWeight: 800, bgcolor: 'rgba(19, 107, 126, 0.08)', color: 'primary.dark' }}>
                                {getInitials(doc.name)}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.dark', fontSize: '0.72rem' }}>
                                  {doc.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.58rem' }}>
                                  {doc.specialization}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          
                          <TableCell sx={{ color: 'text.primary', fontWeight: 550 }}>
                            {doc.specialization}
                          </TableCell>
                          
                          <TableCell sx={{ color: 'text.secondary' }}>
                            <Typography variant="body2" sx={{ fontSize: '0.72rem', fontWeight: 550 }}>{doc.hospital}</Typography>
                            <Typography variant="caption" sx={{ fontSize: '0.58rem', display: 'block' }}>{doc.city}</Typography>
                          </TableCell>
                          
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                              <Typography sx={{ fontWeight: 800, fontSize: '0.72rem', color: 'primary.dark' }}>
                                {doc.relationship_score}%
                              </Typography>
                              <Chip label={rel.text} size="small" color={rel.color as any} sx={{ height: 16, fontSize: '0.55rem', fontWeight: 700 }} />
                            </Box>
                          </TableCell>
                          
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.68rem' }}>
                                {doc.next_best_action || 'None'}
                              </Typography>
                              <ArrowIcon sx={{ fontSize: 9, color: 'text.secondary', ml: 0.5 }} />
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TableContainer>
          </Card>
        </Grid>

        {/* Right Side: Profile Intelligence Panel */}
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
            {currentProfile ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                
                {/* Header Information */}
                <Box sx={{ p: 1.8, borderBottom: '1px solid rgba(19, 107, 126, 0.06)', flexShrink: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1.2 }}>
                    <Avatar sx={{ width: 36, height: 36, fontSize: '0.9rem', bgcolor: 'primary.main', color: 'white', fontWeight: 800 }}>
                      {getInitials(currentProfile.profile.name)}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 850, color: 'primary.dark', fontSize: '0.88rem' }}>
                        {currentProfile.profile.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.6, alignItems: 'center', flexWrap: 'wrap', mt: 0.2 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.62rem', fontWeight: 650 }}>
                          {currentProfile.profile.specialization}
                        </Typography>
                        <span style={{ color: 'rgba(0,0,0,0.15)', fontSize: '0.6rem' }}>•</span>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.62rem', fontWeight: 650 }}>
                          {currentProfile.profile.hospital}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                      <Typography variant="h6" sx={{ fontWeight: 900, color: '#2CB69D', fontSize: '1rem', lineHeight: 1.1 }}>
                        {currentProfile.profile.relationship_score}%
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.55rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.2px' }}>
                        Relationship Score
                      </Typography>
                    </Box>
                  </Box>

                  {/* Details subheader icons */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, pl: 0.2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                      <EmailIcon sx={{ fontSize: 13 }} />
                      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.62rem' }}>
                        {currentProfile.profile.email || 'N/A'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                      <PhoneIcon sx={{ fontSize: 13 }} />
                      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.62rem' }}>
                        {currentProfile.profile.phone || 'N/A'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                      <LocationIcon sx={{ fontSize: 13 }} />
                      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.62rem' }}>
                        {currentProfile.profile.city}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Tabs Panel Selector */}
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
                    <Tab label="Overview" />
                    <Tab label="Interaction History" />
                    <Tab label="Insights" />
                    <Tab label="Next Best Action" />
                    <Tab label="Notes & Tasks" />
                  </Tabs>
                </Box>

                {/* Scrollable Tab panel container */}
                <Box sx={{ p: 1.8, flex: 1, overflowY: 'auto', bgcolor: '#fafafa', display: 'flex', flexDirection: 'column', gap: 1.5, minHeight: 0 }}>
                  
                  {/* TAB 0: Overview */}
                  {tabValue === 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flexShrink: 0 }}>
                      
                      {/* AI Summary card */}
                      <Card variant="outlined" sx={{ borderColor: 'rgba(19, 107, 126, 0.08)', borderRadius: 2.5 }}>
                        <CardContent sx={{ p: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1 }}>
                            <SparklesIcon sx={{ color: 'primary.main', fontSize: 14 }} />
                            <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              AI Relationship Summary
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ fontSize: '0.72rem', color: 'text.primary', lineHeight: 1.45, fontWeight: 550 }}>
                            {currentProfile.relationship_intelligence?.relationship_summary ||
                              currentProfile.profile.ai_summary ||
                              `${currentProfile.profile.name} is a key stakeholder at ${currentProfile.profile.hospital} with High value prescription potential. Maintain active clinical engagement.`}
                          </Typography>
                        </CardContent>
                      </Card>

                      {/* Overview Metrics grid */}
                      <Grid container spacing={1}>
                        <Grid size={{ xs: 4 }}>
                          <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block', fontWeight: 650 }}>Total Interactions</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 850, color: 'primary.dark', fontSize: '0.8rem', mt: 0.2 }}>{analytics.totalInteractions}</Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 4 }}>
                          <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block', fontWeight: 650 }}>Last Interaction</Typography>
                            <Typography variant="caption" noWrap sx={{ fontWeight: 800, color: 'primary.dark', fontSize: '0.65rem', display: 'block', mt: 0.2 }}>{analytics.lastInteractionDate}</Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 4 }}>
                          <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block', fontWeight: 650 }}>First Interaction</Typography>
                            <Typography variant="caption" noWrap sx={{ fontWeight: 800, color: 'primary.dark', fontSize: '0.65rem', display: 'block', mt: 0.2 }}>{analytics.firstInteractionDate}</Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 4 }}>
                          <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block', fontWeight: 650 }}>Sentiment Trend</Typography>
                            <Chip label={analytics.sentimentTrend} size="small" color={analytics.sentimentTrend === 'Positive' ? 'success' : 'default'} sx={{ height: 16, fontSize: '0.58rem', fontWeight: 700, mt: 0.2 }} />
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 4 }}>
                          <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block', fontWeight: 650 }}>Interest Level</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 850, color: 'primary.dark', fontSize: '0.8rem', mt: 0.2 }}>{analytics.avgInterestLevel}</Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 4 }}>
                          <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block', fontWeight: 650 }}>Opportunity Score</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 850, color: 'primary.dark', fontSize: '0.8rem', mt: 0.2 }}>
                              {currentProfile.profile.sales_opportunity === 'High' ? '85%' : currentProfile.profile.sales_opportunity === 'Medium' ? '60%' : '35%'}
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>

                      {/* Split dynamic product analytics & engagement pref */}
                      <Grid container spacing={1.5}>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark', display: 'block', mb: 0.5 }}>Top Products Discussed</Typography>
                          <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 0.8, bgcolor: 'white' }}>
                            {analytics.productsDiscussed.length === 0 ? (
                              <Typography variant="caption" color="text.secondary">No product records logged</Typography>
                            ) : (
                              analytics.productsDiscussed.slice(0, 3).map((prod) => (
                                <Box key={prod.name}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 750, color: 'text.primary', fontSize: '0.62rem' }}>{prod.name}</Typography>
                                    <Typography variant="caption" sx={{ fontSize: '0.58rem', color: 'text.secondary' }}>{prod.count} visits ({prod.pct}%)</Typography>
                                  </Box>
                                  <LinearProgress variant="determinate" value={prod.pct} sx={{ height: 4, borderRadius: 1, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: '#2CB69D' } }} />
                                </Box>
                              ))
                            )}
                          </Paper>
                        </Grid>

                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark', display: 'block', mb: 0.5 }}>Preferred Engagement</Typography>
                          <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 0.8, bgcolor: 'white' }}>
                            {analytics.preferredEngagement.length === 0 ? (
                              <Typography variant="caption" color="text.secondary">No engagement records logged</Typography>
                            ) : (
                              analytics.preferredEngagement.slice(0, 3).map((eng) => (
                                <Box key={eng.type}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 750, color: 'text.primary', fontSize: '0.62rem' }}>{eng.type}</Typography>
                                    <Typography variant="caption" sx={{ fontSize: '0.58rem', color: 'text.secondary' }}>{eng.pct}%</Typography>
                                  </Box>
                                  <LinearProgress variant="determinate" value={eng.pct} sx={{ height: 4, borderRadius: 1, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' } }} />
                                </Box>
                              ))
                            )}
                          </Paper>
                        </Grid>
                      </Grid>

                      {/* Next Best Actions row */}
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark', display: 'block', mb: 0.6 }}>Next Best Actions</Typography>
                        <Grid container spacing={1}>
                          {recommendedActions.length > 0 ? (
                            recommendedActions.map((act: any, idx: number) => (
                              <Grid size={{ xs: 12 }} key={idx}>
                                <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 750, fontSize: '0.7rem', color: 'primary.dark' }}>
                                      {act.title}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.58rem' }}>
                                      {act.rationale}
                                    </Typography>
                                  </Box>
                                  <Chip label={`${act.impact || 'High'} Impact`} size="small" color={act.impact === 'High' ? 'success' : 'primary'} sx={{ height: 16, fontSize: '0.55rem', fontWeight: 800 }} />
                                </Paper>
                              </Grid>
                            ))
                          ) : (
                            <Box sx={{ py: 1.5, textAlign: 'center', width: '100%' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                No AI recommendations yet.
                              </Typography>
                              <Typography
                                variant="caption"
                                color="primary.main"
                                sx={{ fontSize: '0.6rem', cursor: 'pointer', fontWeight: 700 }}
                                onClick={() => dispatch(fetchDoctorProfile(currentProfile.profile.id))}
                              >
                                Run the AI engine to generate next best actions →
                              </Typography>
                            </Box>
                          )}
                        </Grid>
                      </Box>
                    </Box>
                  )}

                  {/* TAB 1: Interaction History */}
                  {tabValue === 1 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                      {currentProfile.history.length === 0 ? (
                        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>No historical interactions logged.</Typography>
                      ) : (
                        currentProfile.history.map((h, i) => (
                          <Paper key={i} variant="outlined" sx={{ p: 1.2, borderRadius: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark' }}>{h.date}</Typography>
                              <Chip label={h.type} size="small" sx={{ height: 16, fontSize: '0.55rem' }} />
                            </Box>
                            <Typography variant="body2" sx={{ fontSize: '0.7rem', color: 'text.primary', mb: 0.5 }}>{h.summary || h.notes}</Typography>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {h.products.map((p: string, j: number) => (
                                <Chip key={j} label={p} size="small" sx={{ height: 14, fontSize: '0.55rem', bgcolor: '#f1f5f9' }} />
                              ))}
                            </Box>
                          </Paper>
                        ))
                      )}
                    </Box>
                  )}

                  {/* TAB 2: Insights */}
                  {tabValue === 2 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, flexShrink: 0 }}>
                      <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardContent sx={{ p: 1.5 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}>AI PRESCRIPTION INSIGHTS</Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.72rem', color: 'text.primary', lineHeight: 1.45 }}>
                            {currentProfile.relationship_intelligence?.prescription_insights ||
                              `${currentProfile.profile.name} exhibits positive adoption signals for CardioPlus. Formulary inclusion status is pending review.`}
                          </Typography>
                        </CardContent>
                      </Card>
                      
                      <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardContent sx={{ p: 1.5 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}>COMPLIANCE & BRAND SENTIMENT</Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.72rem', color: 'text.primary', lineHeight: 1.45 }}>
                            {currentProfile.relationship_intelligence?.compliance_sentiment ||
                              "Doctor displays high scientific compliance and is receptive to research-backed clinical documentation."}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Box>
                  )}

                  {/* TAB 3: Next Best Action Rationale */}
                  {tabValue === 3 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, flexShrink: 0 }}>
                      <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardContent sx={{ p: 1.5 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block', mb: 0.8 }}>RECOMMENDED NEXT VISIT</Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800 }}>Suggested Date:</Typography>
                            <Typography variant="caption" color="primary" sx={{ fontWeight: 800 }}>
                              {currentProfile.next_best_action?.next_visit_date || 'Next week Friday'}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800 }}>Target Product:</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 800 }}>
                              {currentProfile.next_best_action?.recommended_product || 'CardioPlus'}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>

                      <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardContent sx={{ p: 1.5 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}>STRATEGIC RATIONALE</Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.72rem', color: 'text.primary', lineHeight: 1.45 }}>
                            {currentProfile.next_best_action?.rationale ||
                              `Initiate a product demonstration focusing on long-term safety metrics to reinforce confidence.`}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Box>
                  )}

                  {/* TAB 4: Notes & Tasks */}
                  {tabValue === 4 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, flexShrink: 0 }}>
                      <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardContent sx={{ p: 1.5 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}>REP NOTES</Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.72rem', color: 'text.primary', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                            {currentProfile.profile.ai_summary || "No active rep notes. Add interactions to auto-update intelligence."}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Box>
                  )}

                </Box>

                {/* Panel Footer triggers */}
                <Box sx={{ px: 2, py: 1.2, borderTop: '1px solid rgba(19, 107, 126, 0.06)', display: 'flex', gap: 1.5, justifyContent: 'space-between', bgcolor: '#f8fafc', flexShrink: 0 }}>
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                    onClick={handleOpenEditModal}
                    sx={{ textTransform: 'none', fontWeight: 800, px: 2, py: 0.6, borderRadius: 2, fontSize: '0.78rem', flex: 1 }}
                  >
                    Edit Profile
                  </Button>
                  
                  <Button
                    variant="contained"
                    startIcon={<OutcomeIcon sx={{ fontSize: 14 }} />}
                    onClick={() => navigate(`/log?doctor=${encodeURIComponent(currentProfile.profile.name)}`)}
                    sx={{ textTransform: 'none', fontWeight: 800, px: 2, py: 0.6, borderRadius: 2, fontSize: '0.78rem', flex: 1, bgcolor: '#0E6E64', '&:hover': { bgcolor: '#0A554D' } }}
                  >
                    Log Interaction
                  </Button>
                </Box>

              </Box>
            ) : (
              <Box sx={{ m: 'auto', p: 4, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  No HCP profile selected.
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Select a healthcare professional in the directory list to see detailed AI relationship intelligence.
                </Typography>
              </Box>
            )}
          </Card>
        </Grid>

      </Grid>

      {/* Add New HCP Dialog Modal */}
      <Dialog open={addModalOpen} onClose={() => setAddModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 850, color: 'primary.dark', display: 'flex', alignItems: 'center', gap: 1 }}>
          <AddCircleIcon sx={{ color: '#2CB69D' }} />
          Create New HCP Profile
        </DialogTitle>
        <DialogContent sx={{ pb: 1, pt: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            size="small"
            label="Doctor Name *"
            placeholder="e.g. Dr. Rahul Sharma"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Specialization *"
                placeholder="e.g. Cardiologist"
                value={formSpecialization}
                onChange={(e) => setFormSpecialization(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Hospital *"
                placeholder="e.g. Apollo Hospital"
                value={formHospital}
                onChange={(e) => setFormHospital(e.target.value)}
              />
            </Grid>
          </Grid>
          <TextField
            fullWidth
            size="small"
            label="City *"
            placeholder="e.g. Mumbai"
            value={formCity}
            onChange={(e) => setFormCity(e.target.value)}
          />
          <TextField
            fullWidth
            size="small"
            label="Email Address"
            placeholder="e.g. name@hospital.com"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
          />
          <TextField
            fullWidth
            size="small"
            label="Phone Number"
            placeholder="e.g. +91 98765 43210"
            value={formPhone}
            onChange={(e) => setFormPhone(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setAddModalOpen(false)} sx={{ textTransform: 'none', fontWeight: 800 }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddSubmit}
            disabled={modalLoading}
            sx={{ textTransform: 'none', fontWeight: 800, bgcolor: '#0E6E64', '&:hover': { bgcolor: '#0A554D' } }}
          >
            {modalLoading ? <CircularProgress size={18} color="inherit" /> : 'Create Profile'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit HCP Dialog Modal */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 850, color: 'primary.dark', display: 'flex', alignItems: 'center', gap: 1 }}>
          <EditIcon sx={{ color: 'primary.main' }} />
          Edit HCP Profile
        </DialogTitle>
        <DialogContent sx={{ pb: 1, pt: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            size="small"
            label="Doctor Name *"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Specialization *"
                value={formSpecialization}
                onChange={(e) => setFormSpecialization(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Hospital *"
                value={formHospital}
                onChange={(e) => setFormHospital(e.target.value)}
              />
            </Grid>
          </Grid>
          <TextField
            fullWidth
            size="small"
            label="City *"
            value={formCity}
            onChange={(e) => setFormCity(e.target.value)}
          />
          <TextField
            fullWidth
            size="small"
            label="Email Address"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
          />
          <TextField
            fullWidth
            size="small"
            label="Phone Number"
            value={formPhone}
            onChange={(e) => setFormPhone(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="text"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => {
              setEditModalOpen(false);
              handleDeleteClick();
            }}
            sx={{ textTransform: 'none', fontWeight: 800 }}
          >
            Delete Profile
          </Button>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button onClick={() => setEditModalOpen(false)} sx={{ textTransform: 'none', fontWeight: 800 }}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleEditSubmit}
              disabled={modalLoading}
              sx={{ textTransform: 'none', fontWeight: 800, bgcolor: '#0E6E64', '&:hover': { bgcolor: '#0A554D' } }}
            >
              {modalLoading ? <CircularProgress size={18} color="inherit" /> : 'Save Changes'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
