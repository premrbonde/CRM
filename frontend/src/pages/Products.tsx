import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchProducts,
  fetchProductsDashboard,
  fetchProductProfile,
  createProduct,
  updateProduct,
  deleteProduct,
  selectProduct
} from '../store/slices/productSlice';
import type { Product as ProductType } from '../store/slices/productSlice';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Menu,
  Skeleton,
  LinearProgress
} from '@mui/material';
import {
  Favorite as HeartIcon,
  Psychology as BrainIcon,
  LocalHospital as MedIcon,
  FitnessCenter as BoneIcon,
  Air as LungIcon,
  Security as ShieldIcon,
  BookmarkBorder as RibbonIcon,
  Visibility as EyeIcon,
  Search as SearchIcon,
  MoreVert as MoreIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  TrendingUp as TrendingIcon,
  LocalShipping as BoxIcon,
  Description as DocIcon,
  History as ActIcon,
  CheckCircle as ValidIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon
} from '@mui/icons-material';

export default function ProductsPage() {
  const dispatch = useAppDispatch();
  const { list: products, selectedId, currentProduct, dashboard, performance, inventory, documents, activity, topHcps, loading, detailLoading } = useAppSelector((state) => state.products);

  // Filters and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [therapeuticArea, setTherapeuticArea] = useState('All');
  const [formularyStatus, setFormularyStatus] = useState('All');
  const [stockStatus, setStockStatus] = useState('All');

  // Detail panel tab
  const [activeTab, setActiveTab] = useState(0);

  // Pagination states
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

  // Dialog states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formTherapeutic, setFormTherapeutic] = useState('Cardiology');
  const [formIndication, setFormIndication] = useState('');
  const [formFormulation, setFormFormulation] = useState('');
  const [formStatus, setFormStatus] = useState('Formulary Active');
  const [formInventory, setFormInventory] = useState(50);
  const [formDescription, setFormDescription] = useState('');
  const [formMrp, setFormMrp] = useState(50);
  const [formSegment, setFormSegment] = useState('Prescription');

  // Menu action state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [actionProductId, setActionProductId] = useState<number | null>(null);

  // Fetch basic lists
  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchProductsDashboard());
  }, [dispatch]);

  // Auto-select first product if none selected
  useEffect(() => {
    if (products.length > 0 && selectedId === null) {
      dispatch(selectProduct(products[0].id));
    }
  }, [products, selectedId, dispatch]);

  // Fetch selected product profile details
  useEffect(() => {
    if (selectedId !== null) {
      dispatch(fetchProductProfile(selectedId));
    }
  }, [selectedId, dispatch]);

  // Filter products client-side instantly
  const filteredProducts = products.filter((p) => {
    const matchesSearch = !searchTerm.trim() ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.clinical_indication.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.therapeutic_area.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTherapeutic = therapeuticArea === 'All' || p.therapeutic_area === therapeuticArea;
    const matchesFormulary = formularyStatus === 'All' || p.formulary_status === formularyStatus;
    
    let matchesStock = true;
    if (stockStatus !== 'All') {
      const isOut = p.sample_inventory === 0;
      const isLow = p.sample_inventory > 0 && p.sample_inventory <= 30;
      const isIn = p.sample_inventory > 30;
      if (stockStatus === 'Out of Stock') matchesStock = isOut;
      else if (stockStatus === 'Low Stock') matchesStock = isLow;
      else if (stockStatus === 'In Stock') matchesStock = isIn;
    }

    return matchesSearch && matchesTherapeutic && matchesFormulary && matchesStock;
  });

  const getTherapeuticIcon = (area: string) => {
    switch (area) {
      case 'Cardiology': return <HeartIcon sx={{ color: '#e91e63', fontSize: 18 }} />;
      case 'Neurology': return <BrainIcon sx={{ color: '#673ab7', fontSize: 18 }} />;
      case 'Diabetology': return <MedIcon sx={{ color: '#00bcd4', fontSize: 18 }} />;
      case 'Orthopedics': return <BoneIcon sx={{ color: '#ff9800', fontSize: 18 }} />;
      case 'Pulmonology': return <LungIcon sx={{ color: '#4caf50', fontSize: 18 }} />;
      case 'Gastroenterology': return <ShieldIcon sx={{ color: '#2196f3', fontSize: 18 }} />;
      case 'Oncology': return <RibbonIcon sx={{ color: '#e91e63', fontSize: 18 }} />;
      case 'Ophthalmology': return <EyeIcon sx={{ color: '#009688', fontSize: 18 }} />;
      default: return <MedIcon sx={{ color: 'text.secondary', fontSize: 18 }} />;
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'Formulary Active') return 'success';
    if (status === 'Pending Review') return 'warning';
    return 'default';
  };

  // Row selection handler
  const handleProductSelect = (id: number) => {
    dispatch(selectProduct(id));
    setActiveTab(0); // Reset to overview tab
  };

  // CRUD actions
  const handleOpenAddModal = () => {
    setFormName('');
    setFormCode('');
    setFormTherapeutic('Cardiology');
    setFormIndication('');
    setFormFormulation('');
    setFormStatus('Formulary Active');
    setFormInventory(100);
    setFormDescription('');
    setFormMrp(45);
    setFormSegment('Prescription');
    setAddModalOpen(true);
  };

  const handleAddSubmit = async () => {
    if (!formName || !formCode || !formIndication || !formFormulation) {
      alert("Please fill in required fields.");
      return;
    }
    setFormLoading(true);
    try {
      await dispatch(createProduct({
        name: formName,
        code: formCode,
        therapeutic_area: formTherapeutic,
        clinical_indication: formIndication,
        formulation: formFormulation,
        formulary_status: formStatus,
        sample_inventory: formInventory,
        description: formDescription,
        mrp: formMrp,
        market_segment: formSegment
      })).unwrap();
      dispatch(fetchProductsDashboard());
      setAddModalOpen(false);
    } catch (err: any) {
      alert(`Error creating product: ${err}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleOpenEditModal = (p: ProductType) => {
    setFormName(p.name);
    setFormCode(p.code);
    setFormTherapeutic(p.therapeutic_area);
    setFormIndication(p.clinical_indication);
    setFormFormulation(p.formulation);
    setFormStatus(p.formulary_status);
    setFormInventory(p.sample_inventory);
    setFormDescription(p.description || '');
    setFormMrp(p.mrp);
    setFormSegment(p.market_segment);
    setEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    if (selectedId === null) return;
    setFormLoading(true);
    try {
      await dispatch(updateProduct({
        id: selectedId,
        data: {
          name: formName,
          code: formCode,
          therapeutic_area: formTherapeutic,
          clinical_indication: formIndication,
          formulation: formFormulation,
          formulary_status: formStatus,
          sample_inventory: formInventory,
          description: formDescription,
          mrp: formMrp,
          market_segment: formSegment
        }
      })).unwrap();
      dispatch(fetchProductsDashboard());
      setEditModalOpen(false);
    } catch (err: any) {
      alert(`Error updating product: ${err}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await dispatch(deleteProduct(id)).unwrap();
        dispatch(fetchProductsDashboard());
      } catch (err: any) {
        alert(`Error deleting product: ${err}`);
      }
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>, id: number) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setActionProductId(id);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setActionProductId(null);
  };

  // Compute indices for pagination
  const startIndex = page * rowsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + rowsPerPage);

  return (
    <Box sx={{ height: 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column', pb: 1 }}>
      
      {/* Top Banner & Header */}
      <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900, color: 'text.primary', fontSize: '1.25rem' }}>
            Product Portfolio
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.72rem' }}>
            Track product performance, inventory, and clinical insights
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon sx={{ fontSize: 13 }} />}
          onClick={handleOpenAddModal}
          sx={{
            textTransform: 'none',
            fontWeight: 800,
            borderRadius: 2,
            fontSize: '0.75rem',
            bgcolor: '#0E6E64',
            '&:hover': { bgcolor: '#0A554D' }
          }}
        >
          + Add New Product
        </Button>
      </Box>

      {/* Summary Metrics Cards */}
      <Grid container spacing={1.2} sx={{ mb: 1.8, flexShrink: 0 }}>
        <Grid size={{ xs: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2.2, boxShadow: '0 2px 8px rgba(6, 26, 44, 0.02)' }}>
            <CardContent sx={{ p: 1.2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: 'rgba(21, 101, 192, 0.08)', color: 'primary.main', width: 34, height: 34 }}>
                <BoxIcon sx={{ fontSize: 18 }} />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', display: 'block', fontWeight: 650 }}>Total Products</Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.1, mt: 0.1, fontSize: '1.1rem' }}>{dashboard?.total_products || 0}</Typography>
                <Typography variant="caption" sx={{ fontSize: '0.52rem', color: 'text.secondary', fontWeight: 600 }}>Active in portfolio</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2.2, boxShadow: '0 2px 8px rgba(6, 26, 44, 0.02)' }}>
            <CardContent sx={{ p: 1.2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: 'rgba(76, 175, 80, 0.08)', color: 'success.main', width: 34, height: 34 }}>
                <ValidIcon sx={{ fontSize: 18 }} />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', display: 'block', fontWeight: 650 }}>Formulary Active</Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.1, mt: 0.1, fontSize: '1.1rem' }}>{dashboard?.formulary_active || 0}</Typography>
                <Typography variant="caption" sx={{ fontSize: '0.52rem', color: 'text.secondary', fontWeight: 600 }}>
                  {dashboard && dashboard.total_products ? Math.round((dashboard.formulary_active / dashboard.total_products) * 100) : 0}% of total
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2.2, boxShadow: '0 2px 8px rgba(6, 26, 44, 0.02)' }}>
            <CardContent sx={{ p: 1.2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: 'rgba(255, 152, 0, 0.08)', color: 'warning.main', width: 34, height: 34 }}>
                <TrendingIcon sx={{ fontSize: 18 }} />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', display: 'block', fontWeight: 650 }}>Pending Approval</Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.1, mt: 0.1, fontSize: '1.1rem' }}>{dashboard?.pending_approval || 0}</Typography>
                <Typography variant="caption" sx={{ fontSize: '0.52rem', color: 'text.secondary', fontWeight: 600 }}>
                  {dashboard && dashboard.total_products ? Math.round((dashboard.pending_approval / dashboard.total_products) * 100) : 0}% of total
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2.2, boxShadow: '0 2px 8px rgba(6, 26, 44, 0.02)' }}>
            <CardContent sx={{ p: 1.2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: 'rgba(244, 67, 54, 0.08)', color: 'error.main', width: 34, height: 34 }}>
                <BoxIcon sx={{ fontSize: 18 }} />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', display: 'block', fontWeight: 650 }}>Out of Stock</Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.1, mt: 0.1, fontSize: '1.1rem' }}>{dashboard?.out_of_stock || 0}</Typography>
                <Typography variant="caption" sx={{ fontSize: '0.52rem', color: 'text.secondary', fontWeight: 600 }}>
                  {dashboard && dashboard.total_products ? Math.round((dashboard.out_of_stock / dashboard.total_products) * 100) : 0}% of total
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Split Grid (Products Table left, Profile Panel right) */}
      <Grid container spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
        
        {/* Left Table Panel */}
        <Grid size={{ xs: 12, md: 7.8 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Card sx={{ flex: 1, border: '1px solid rgba(19, 107, 126, 0.08)', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            
            {/* Table Filters header */}
            <Box sx={{ p: 1.2, borderBottom: '1px solid rgba(19, 107, 126, 0.06)', display: 'flex', flexWrap: 'wrap', gap: 1.2, alignItems: 'center', bgcolor: '#fcfcfc', flexShrink: 0 }}>
              <TextField
                size="small"
                placeholder="Search by product name, indication..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                slotProps={{
                  input: {
                    endAdornment: <SearchIcon sx={{ color: 'text.secondary', fontSize: 15 }} />
                  }
                }}
                sx={{ flex: 1.5, minWidth: '180px', '& .MuiInputBase-root': { fontSize: '0.78rem', bgcolor: 'white' } }}
              />

              <TextField
                select
                size="small"
                label="Therapeutic Area"
                value={therapeuticArea}
                onChange={(e) => setTherapeuticArea(e.target.value)}
                sx={{ flex: 1, minWidth: '120px', '& .MuiInputBase-root': { fontSize: '0.78rem', bgcolor: 'white' }, '& .MuiInputLabel-root': { fontSize: '0.78rem' } }}
              >
                <MenuItem value="All">All Areas</MenuItem>
                <MenuItem value="Cardiology">Cardiology</MenuItem>
                <MenuItem value="Neurology">Neurology</MenuItem>
                <MenuItem value="Diabetology">Diabetology</MenuItem>
                <MenuItem value="Orthopedics">Orthopedics</MenuItem>
                <MenuItem value="Pulmonology">Pulmonology</MenuItem>
                <MenuItem value="Gastroenterology">Gastroenterology</MenuItem>
                <MenuItem value="Oncology">Oncology</MenuItem>
                <MenuItem value="Ophthalmology">Ophthalmology</MenuItem>
              </TextField>

              <TextField
                select
                size="small"
                label="Formulary Status"
                value={formularyStatus}
                onChange={(e) => setFormularyStatus(e.target.value)}
                sx={{ flex: 1, minWidth: '120px', '& .MuiInputBase-root': { fontSize: '0.78rem', bgcolor: 'white' }, '& .MuiInputLabel-root': { fontSize: '0.78rem' } }}
              >
                <MenuItem value="All">All Statuses</MenuItem>
                <MenuItem value="Formulary Active">Formulary Active</MenuItem>
                <MenuItem value="Pending Review">Pending Review</MenuItem>
                <MenuItem value="Not Submitted">Not Submitted</MenuItem>
              </TextField>

              <TextField
                select
                size="small"
                label="Stock Status"
                value={stockStatus}
                onChange={(e) => setStockStatus(e.target.value)}
                sx={{ flex: 1, minWidth: '110px', '& .MuiInputBase-root': { fontSize: '0.78rem', bgcolor: 'white' }, '& .MuiInputLabel-root': { fontSize: '0.78rem' } }}
              >
                <MenuItem value="All">All Stock</MenuItem>
                <MenuItem value="In Stock">In Stock</MenuItem>
                <MenuItem value="Low Stock">Low Stock</MenuItem>
                <MenuItem value="Out of Stock">Out of Stock</MenuItem>
              </TextField>
            </Box>

            {/* Table Container */}
            <TableContainer sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {loading && products.length === 0 ? (
                <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} variant="rectangular" height={36} sx={{ borderRadius: 1 }} />
                  ))}
                </Box>
              ) : filteredProducts.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No Products Available matching filters.</Typography>
                  <Button size="small" variant="outlined" onClick={handleOpenAddModal} sx={{ mt: 1.5, textTransform: 'none', fontWeight: 800 }}>
                    Add New Product
                  </Button>
                </Box>
              ) : (
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontSize: '0.68rem', fontWeight: 800, color: 'primary.dark', py: 1 }}>Product</TableCell>
                      <TableCell sx={{ fontSize: '0.68rem', fontWeight: 800, color: 'primary.dark', py: 1 }}>Therapeutic Area</TableCell>
                      <TableCell sx={{ fontSize: '0.68rem', fontWeight: 800, color: 'primary.dark', py: 1 }}>Clinical Indication</TableCell>
                      <TableCell sx={{ fontSize: '0.68rem', fontWeight: 800, color: 'primary.dark', py: 1 }}>Formulation</TableCell>
                      <TableCell sx={{ fontSize: '0.68rem', fontWeight: 800, color: 'primary.dark', py: 1 }}>Formulary Status</TableCell>
                      <TableCell sx={{ fontSize: '0.68rem', fontWeight: 800, color: 'primary.dark', py: 1 }}>Sample Inventory</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.68rem', fontWeight: 800, color: 'primary.dark', py: 1 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedProducts.map((p) => {
                      const isSelected = selectedId === p.id;
                      return (
                        <TableRow
                          key={p.id}
                          hover
                          onClick={() => handleProductSelect(p.id)}
                          selected={isSelected}
                          sx={{
                            cursor: 'pointer',
                            '&.Mui-selected': {
                              bgcolor: 'rgba(19, 107, 126, 0.06)',
                              '&:hover': { bgcolor: 'rgba(19, 107, 126, 0.08)' }
                            }
                          }}
                        >
                          <TableCell sx={{ py: 0.8 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                              {getTherapeuticIcon(p.therapeutic_area)}
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.dark', fontSize: '0.75rem' }}>{p.name}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{p.code}</Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ py: 0.8 }}>
                            <Typography variant="caption" sx={{ fontWeight: 650, color: 'text.primary', fontSize: '0.7rem' }}>
                              {p.therapeutic_area}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 0.8 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.68rem' }}>
                              {p.clinical_indication}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 0.8 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>
                              {p.formulation}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 0.8 }}>
                            <Chip
                              label={p.formulary_status}
                              size="small"
                              color={getStatusColor(p.formulary_status)}
                              sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800 }}
                            />
                          </TableCell>
                          <TableCell sx={{ py: 0.8 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: p.sample_inventory === 0 ? 'error.main' : 'primary.main', fontSize: '0.7rem' }}>
                              {p.sample_inventory} {p.formulation.includes('Tablets') || p.formulation.includes('Capsules') ? 'boxes' : p.formulation.includes('Inhaler') ? 'units' : p.formulation.includes('Drops') ? 'bottles' : 'vials'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ py: 0.8 }}>
                            <IconButton size="small" onClick={(e) => handleMenuClick(e, p.id)}>
                              <MoreIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TableContainer>

            {/* Custom Pagination Footer */}
            <Box sx={{ px: 2, py: 0.8, borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#fcfcfc', flexShrink: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', fontWeight: 600 }}>
                Showing {startIndex + 1} to {Math.min(startIndex + rowsPerPage, filteredProducts.length)} of {filteredProducts.length} products
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                  size="small"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                  sx={{ border: '1px solid rgba(0,0,0,0.05)', borderRadius: 1.5 }}
                >
                  <PrevIcon sx={{ fontSize: 13 }} />
                </IconButton>
                <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.68rem', px: 0.5 }}>
                  {page + 1}
                </Typography>
                <IconButton
                  size="small"
                  disabled={startIndex + rowsPerPage >= filteredProducts.length}
                  onClick={() => setPage(page + 1)}
                  sx={{ border: '1px solid rgba(0,0,0,0.05)', borderRadius: 1.5 }}
                >
                  <NextIcon sx={{ fontSize: 13 }} />
                </IconButton>
              </Box>
            </Box>

          </Card>
        </Grid>

        {/* Right Product Intelligence Panel */}
        <Grid size={{ xs: 12, md: 4.2 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
            {detailLoading ? (
              <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Skeleton variant="rectangular" height={24} width="60%" />
                <Skeleton variant="rectangular" height={100} />
                <Skeleton variant="rectangular" height={150} />
              </Box>
            ) : currentProduct ? (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                
                {/* Panel Header */}
                <Box sx={{ p: 2, borderBottom: '1px solid rgba(19, 107, 126, 0.06)', display: 'flex', alignItems: 'center', justifyBetween: 'center', gap: 1.5, bgcolor: '#fcfcfc', flexShrink: 0 }}>
                  <Avatar sx={{ bgcolor: 'rgba(19, 107, 126, 0.08)', color: 'primary.main', width: 38, height: 38 }}>
                    {getTherapeuticIcon(currentProduct.therapeutic_area)}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'primary.dark', fontSize: '0.88rem' }}>
                        {currentProduct.name}
                      </Typography>
                      <Chip
                        label={currentProduct.formulary_status}
                        size="small"
                        color={getStatusColor(currentProduct.formulary_status)}
                        sx={{ height: 16, fontSize: '0.55rem', fontWeight: 800 }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.62rem', mt: 0.1 }}>
                      {currentProduct.code} • <span style={{ color: '#e91e63', fontWeight: 700 }}>{currentProduct.therapeutic_area}</span>
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => dispatch(selectProduct(null))}>
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>

                {/* Tabs selection bar */}
                <Box sx={{ borderBottom: '1px solid rgba(0,0,0,0.04)', flexShrink: 0, bgcolor: 'white' }}>
                  <Tabs
                    value={activeTab}
                    onChange={(_, val) => setActiveTab(val)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                      minHeight: 34,
                      height: 34,
                      '& .MuiTab-root': {
                        minHeight: 34,
                        py: 0.5,
                        px: 1.5,
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        textTransform: 'none'
                      }
                    }}
                  >
                    <Tab label="Overview" />
                    <Tab label="Performance" />
                    <Tab label="Inventory" />
                    <Tab label="Documents" />
                    <Tab label="Activity" />
                  </Tabs>
                </Box>

                {/* Tab Contents Viewport */}
                <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#fafafa', minHeight: 0 }}>
                  
                  {/* OVERVIEW TAB */}
                  {activeTab === 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', display: 'block', mb: 0.5 }}>Product Overview</Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.72rem', color: 'text.secondary', lineHeight: 1.45 }}>
                          {currentProduct.description || 'No description available.'}
                        </Typography>
                      </Box>

                      <Grid container spacing={1}>
                        <Grid size={{ xs: 6 }}>
                          <Paper variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block', fontWeight: 650 }}>Therapeutic Area</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark', fontSize: '0.68rem' }}>{currentProduct.therapeutic_area}</Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Paper variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block', fontWeight: 650 }}>Clinical Indication</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark', fontSize: '0.68rem' }} noWrap>{currentProduct.clinical_indication}</Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Paper variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block', fontWeight: 650 }}>Formulation</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark', fontSize: '0.68rem' }}>{currentProduct.formulation}</Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Paper variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block', fontWeight: 650 }}>MRP (Per Unit)</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark', fontSize: '0.7rem' }}>₹{currentProduct.mrp}.00</Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Paper variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block', fontWeight: 650 }}>Launch Date</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark', fontSize: '0.68rem' }}>{currentProduct.launch_date || 'N/A'}</Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Paper variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block', fontWeight: 650 }}>Market Segment</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark', fontSize: '0.68rem' }}>{currentProduct.market_segment}</Typography>
                          </Paper>
                        </Grid>
                      </Grid>

                      {/* Key Metrics Sub-card */}
                      {performance && (
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', display: 'block', mb: 0.8 }}>Key Metrics (Last 90 Days)</Typography>
                          <Grid container spacing={1}>
                            <Grid size={{ xs: 3 }}>
                              <Paper variant="outlined" sx={{ p: 0.8, borderRadius: 2, textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.52rem', display: 'block' }}>Interactions</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 850, color: 'primary.dark', fontSize: '0.72rem', mt: 0.2 }}>{performance.total_interactions}</Typography>
                                <Chip label="↑ 12%" size="small" color="success" sx={{ height: 12, fontSize: '0.45rem', fontWeight: 800, mt: 0.4 }} />
                              </Paper>
                            </Grid>
                            <Grid size={{ xs: 3 }}>
                              <Paper variant="outlined" sx={{ p: 0.8, borderRadius: 2, textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.52rem', display: 'block' }}>Distributed</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 850, color: 'primary.dark', fontSize: '0.72rem', mt: 0.2 }}>{performance.samples_distributed}</Typography>
                                <Chip label="↑ 8%" size="small" color="success" sx={{ height: 12, fontSize: '0.45rem', fontWeight: 800, mt: 0.4 }} />
                              </Paper>
                            </Grid>
                            <Grid size={{ xs: 3 }}>
                              <Paper variant="outlined" sx={{ p: 0.8, borderRadius: 2, textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.52rem', display: 'block' }}>Influenced</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 850, color: 'primary.dark', fontSize: '0.72rem', mt: 0.2 }}>{performance.prescriptions_influenced}</Typography>
                                <Chip label="↑ 15%" size="small" color="success" sx={{ height: 12, fontSize: '0.45rem', fontWeight: 800, mt: 0.4 }} />
                              </Paper>
                            </Grid>
                            <Grid size={{ xs: 3 }}>
                              <Paper variant="outlined" sx={{ p: 0.8, borderRadius: 2, textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.52rem', display: 'block' }}>Conversion</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 850, color: 'primary.dark', fontSize: '0.72rem', mt: 0.2 }}>{performance.conversion_rate}%</Typography>
                                <Chip label="↑ 10%" size="small" color="success" sx={{ height: 12, fontSize: '0.45rem', fontWeight: 800, mt: 0.4 }} />
                              </Paper>
                            </Grid>
                          </Grid>
                        </Box>
                      )}

                      {/* Top Doctors & Recent Activity Side-by-Side */}
                      <Grid container spacing={1.5}>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', display: 'block', mb: 0.8 }}>Top Doctors</Typography>
                          <Paper variant="outlined" sx={{ p: 1, borderRadius: 2.2, display: 'flex', flexDirection: 'column', gap: 1, bgcolor: 'white' }}>
                            {topHcps.length === 0 ? (
                              <Typography variant="caption" color="text.secondary">No interaction records yet.</Typography>
                            ) : (
                              topHcps.map((hcp, idx) => (
                                <Box key={idx} sx={{ display: 'flex', justifyBetween: 'center', alignItems: 'center', gap: 0.8 }}>
                                  <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', color: 'primary.dark', fontSize: '0.62rem' }} noWrap>{hcp.doctor_name}</Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.5rem' }} noWrap>{hcp.hospital}</Typography>
                                  </Box>
                                  <Chip label={`${hcp.interactions_count} Inters`} size="small" sx={{ height: 14, fontSize: '0.48rem', fontWeight: 700, bgcolor: 'rgba(19, 107, 126, 0.06)' }} />
                                </Box>
                              ))
                            )}
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', display: 'block', mb: 0.8 }}>Recent Activity</Typography>
                          <Paper variant="outlined" sx={{ p: 1, borderRadius: 2.2, display: 'flex', flexDirection: 'column', gap: 1.2, bgcolor: 'white' }}>
                            {activity.length === 0 ? (
                              <Typography variant="caption" color="text.secondary">No activities logged.</Typography>
                            ) : (
                              activity.slice(0, 3).map((act) => (
                                <Box key={act.id} sx={{ borderLeft: '1.8px solid rgba(19, 107, 126, 0.15)', pl: 1 }}>
                                  <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: 'primary.dark', fontSize: '0.58rem' }}>{act.activity_type}</Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.5rem', lineHeight: 1.2 }}>{act.description}</Typography>
                                </Box>
                              ))
                            )}
                          </Paper>
                        </Grid>
                      </Grid>

                    </Box>
                  )}

                  {/* PERFORMANCE TAB */}
                  {activeTab === 1 && performance && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.2 }}>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.2, bgcolor: 'white' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Prescriptions Influenced</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.dark', mt: 0.5 }}>{performance.prescriptions_influenced} Rx</Typography>
                        <Typography variant="caption" color="success.main" sx={{ fontWeight: 700, display: 'block', mt: 0.5 }}>↑ 15% increase vs last 90 days</Typography>
                      </Paper>

                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.2, bgcolor: 'white' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Samples Distributed</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.dark', mt: 0.5 }}>{performance.samples_distributed} units</Typography>
                        <Typography variant="caption" color="success.main" sx={{ fontWeight: 700, display: 'block', mt: 0.5 }}>↑ 8% volume growth</Typography>
                      </Paper>

                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.2, bgcolor: 'white' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>HCP Conversion Rate</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.dark', mt: 0.5 }}>{performance.conversion_rate}%</Typography>
                        <LinearProgress variant="determinate" value={performance.conversion_rate} sx={{ height: 6, borderRadius: 1, mt: 1, bgcolor: '#f0f0f0', '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' } }} />
                      </Paper>
                    </Box>
                  )}

                  {/* INVENTORY TAB */}
                  {activeTab === 2 && inventory && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.8 }}>
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 850, color: 'primary.dark', display: 'block', mb: 0.8 }}>Stock Level Details</Typography>
                        <Grid container spacing={1}>
                          <Grid size={{ xs: 4 }}>
                            <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, textAlign: 'center', bgcolor: 'white' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.52rem', display: 'block' }}>Available</Typography>
                              <Typography variant="subtitle2" sx={{ fontWeight: 850, color: 'success.main', fontSize: '0.82rem', mt: 0.2 }}>{inventory.available_inventory}</Typography>
                            </Paper>
                          </Grid>
                          <Grid size={{ xs: 4 }}>
                            <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, textAlign: 'center', bgcolor: 'white' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.52rem', display: 'block' }}>Reserved</Typography>
                              <Typography variant="subtitle2" sx={{ fontWeight: 850, color: 'warning.main', fontSize: '0.82rem', mt: 0.2 }}>{inventory.reserved_stock}</Typography>
                            </Paper>
                          </Grid>
                          <Grid size={{ xs: 4 }}>
                            <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, textAlign: 'center', bgcolor: 'white' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.52rem', display: 'block' }}>Expired</Typography>
                              <Typography variant="subtitle2" sx={{ fontWeight: 850, color: 'error.main', fontSize: '0.82rem', mt: 0.2 }}>{inventory.expired_stock}</Typography>
                            </Paper>
                          </Grid>
                        </Grid>
                      </Box>

                      <Card variant="outlined" sx={{ borderRadius: 2.2 }}>
                        <CardContent sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">Warehouse Location</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark' }}>{inventory.warehouse_location}</Typography>
                          </Box>
                          <Divider />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">Last Restocked</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark' }}>{inventory.last_restocked}</Typography>
                          </Box>
                          <Divider />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">Status</Typography>
                            <Chip label={inventory.stock_status} size="small" color={inventory.stock_status === 'In Stock' ? 'success' : 'warning'} sx={{ height: 16, fontSize: '0.55rem', fontWeight: 800 }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Box>
                  )}

                  {/* DOCUMENTS TAB */}
                  {activeTab === 3 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {documents.length === 0 ? (
                        <Typography variant="caption" color="text.secondary">No clinical documentation uploads.</Typography>
                      ) : (
                        documents.map((doc) => (
                          <Paper
                            key={doc.id}
                            variant="outlined"
                            sx={{
                              p: 1.2,
                              borderRadius: 2.2,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                              cursor: 'pointer',
                              bgcolor: 'white',
                              '&:hover': { bgcolor: 'rgba(0,0,0,0.01)' }
                            }}
                          >
                            <Avatar sx={{ bgcolor: 'rgba(19, 107, 126, 0.06)', color: 'primary.dark', width: 28, height: 28 }}>
                              <DocIcon sx={{ fontSize: 15 }} />
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark', display: 'block' }} noWrap>{doc.title}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.52rem' }}>{doc.category} • {doc.download_count} Downloads</Typography>
                            </Box>
                          </Paper>
                        ))
                      )}
                    </Box>
                  )}

                  {/* ACTIVITY TAB */}
                  {activeTab === 4 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {activity.length === 0 ? (
                        <Typography variant="caption" color="text.secondary">No product activity logged.</Typography>
                      ) : (
                        activity.map((act) => (
                          <Box key={act.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                            <Avatar sx={{ bgcolor: 'rgba(19, 107, 126, 0.08)', color: 'primary.dark', width: 26, height: 26 }}>
                              <ActIcon sx={{ fontSize: 13 }} />
                            </Avatar>
                            <Box>
                              <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark', display: 'block' }}>{act.activity_type}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.58rem', display: 'block', mt: 0.1 }}>{act.description}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.5rem', display: 'block', mt: 0.2 }}>{act.date}</Typography>
                            </Box>
                          </Box>
                        ))
                      )}
                    </Box>
                  )}

                </Box>

                {/* Panel Footer buttons */}
                <Box sx={{ p: 2, borderTop: '1px solid rgba(19, 107, 126, 0.06)', display: 'flex', gap: 1, bgcolor: '#fcfcfc', flexShrink: 0 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<EditIcon sx={{ fontSize: 13 }} />}
                    onClick={() => handleOpenEditModal(currentProduct)}
                    sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, fontSize: '0.75rem', py: 0.8 }}
                  >
                    Edit Product
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleDelete(currentProduct.id)}
                    startIcon={<DeleteIcon sx={{ fontSize: 13 }} />}
                    sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, fontSize: '0.75rem', py: 0.8, bgcolor: '#0E6E64', '&:hover': { bgcolor: '#0A554D' } }}
                  >
                    Delete Product
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box sx={{ p: 4, textAlign: 'center', my: 'auto' }}>
                <Typography variant="body2" color="text.secondary">Select a product to view intelligence metrics.</Typography>
              </Box>
            )}
          </Card>
        </Grid>

      </Grid>

      {/* Row action drop menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            const p = products.find(prod => prod.id === actionProductId);
            if (p) handleOpenEditModal(p);
            handleMenuClose();
          }}
          sx={{ fontSize: '0.75rem', fontWeight: 650 }}
        >
          <EditIcon sx={{ fontSize: 14, mr: 1 }} /> Edit Product
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (actionProductId !== null) handleDelete(actionProductId);
            handleMenuClose();
          }}
          sx={{ fontSize: '0.75rem', color: 'error.main', fontWeight: 650 }}
        >
          <DeleteIcon sx={{ fontSize: 14, mr: 1 }} /> Delete Product
        </MenuItem>
      </Menu>

      {/* Add Product Modal */}
      <Dialog open={addModalOpen} onClose={() => setAddModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 850, color: 'primary.dark' }}>Add New Product</DialogTitle>
        <DialogContent sx={{ pt: 1.5, pb: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Product Name *"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Product Code *"
                placeholder="e.g. CP-100"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
              />
            </Grid>
          </Grid>

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Therapeutic Area *"
                value={formTherapeutic}
                onChange={(e) => setFormTherapeutic(e.target.value)}
              >
                <MenuItem value="Cardiology">Cardiology</MenuItem>
                <MenuItem value="Neurology">Neurology</MenuItem>
                <MenuItem value="Diabetology">Diabetology</MenuItem>
                <MenuItem value="Orthopedics">Orthopedics</MenuItem>
                <MenuItem value="Pulmonology">Pulmonology</MenuItem>
                <MenuItem value="Gastroenterology">Gastroenterology</MenuItem>
                <MenuItem value="Oncology">Oncology</MenuItem>
                <MenuItem value="Ophthalmology">Ophthalmology</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Clinical Indication *"
                placeholder="Hypertension, Heart Failure"
                value={formIndication}
                onChange={(e) => setFormIndication(e.target.value)}
              />
            </Grid>
          </Grid>

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Formulation *"
                placeholder="10mg/20mg Tablets"
                value={formFormulation}
                onChange={(e) => setFormFormulation(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Formulary Status *"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
              >
                <MenuItem value="Formulary Active">Formulary Active</MenuItem>
                <MenuItem value="Pending Review">Pending Review</MenuItem>
                <MenuItem value="Not Submitted">Not Submitted</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 4 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Inventory Level *"
                value={formInventory}
                onChange={(e) => setFormInventory(Number(e.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="MRP (₹) *"
                value={formMrp}
                onChange={(e) => setFormMrp(Number(e.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Segment"
                value={formSegment}
                onChange={(e) => setFormSegment(e.target.value)}
              >
                <MenuItem value="Prescription">Prescription</MenuItem>
                <MenuItem value="Specialist Prescription">Specialist Prescription</MenuItem>
                <MenuItem value="OTC">OTC</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          <TextField
            fullWidth
            size="small"
            multiline
            rows={2.5}
            label="Product Description"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
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
            {formLoading ? <CircularProgress size={18} color="inherit" /> : 'Create Product'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Product Modal */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 850, color: 'primary.dark' }}>Edit Product Details</DialogTitle>
        <DialogContent sx={{ pt: 1.5, pb: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Product Name *"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Product Code *"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
              />
            </Grid>
          </Grid>

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Therapeutic Area *"
                value={formTherapeutic}
                onChange={(e) => setFormTherapeutic(e.target.value)}
              >
                <MenuItem value="Cardiology">Cardiology</MenuItem>
                <MenuItem value="Neurology">Neurology</MenuItem>
                <MenuItem value="Diabetology">Diabetology</MenuItem>
                <MenuItem value="Orthopedics">Orthopedics</MenuItem>
                <MenuItem value="Pulmonology">Pulmonology</MenuItem>
                <MenuItem value="Gastroenterology">Gastroenterology</MenuItem>
                <MenuItem value="Oncology">Oncology</MenuItem>
                <MenuItem value="Ophthalmology">Ophthalmology</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Clinical Indication *"
                value={formIndication}
                onChange={(e) => setFormIndication(e.target.value)}
              />
            </Grid>
          </Grid>

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Formulation *"
                value={formFormulation}
                onChange={(e) => setFormFormulation(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Formulary Status *"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
              >
                <MenuItem value="Formulary Active">Formulary Active</MenuItem>
                <MenuItem value="Pending Review">Pending Review</MenuItem>
                <MenuItem value="Not Submitted">Not Submitted</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 4 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Inventory Level *"
                value={formInventory}
                onChange={(e) => setFormInventory(Number(e.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="MRP (₹) *"
                value={formMrp}
                onChange={(e) => setFormMrp(Number(e.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Segment"
                value={formSegment}
                onChange={(e) => setFormSegment(e.target.value)}
              >
                <MenuItem value="Prescription">Prescription</MenuItem>
                <MenuItem value="Specialist Prescription">Specialist Prescription</MenuItem>
                <MenuItem value="OTC">OTC</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          <TextField
            fullWidth
            size="small"
            multiline
            rows={2.5}
            label="Product Description"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
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
