import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export interface Product {
  id: number;
  name: string;
  code: string;
  therapeutic_area: string;
  clinical_indication: string;
  formulation: string;
  formulary_status: string;
  sample_inventory: number;
  description?: string;
  market_segment: string;
  launch_date?: string;
  mrp: number;
  warehouse_location: string;
  last_restocked?: string;
  last_updated: string;
}

export interface ProductDashboard {
  total_products: number;
  formulary_active: number;
  pending_approval: number;
  out_of_stock: number;
}

export interface ProductPerformance {
  total_interactions: number;
  samples_distributed: number;
  prescriptions_influenced: number;
  conversion_rate: number;
}

export interface ProductInventory {
  available_inventory: number;
  reserved_stock: number;
  expired_stock: number;
  warehouse_location: string;
  last_restocked: string;
  stock_status: string;
}

export interface ProductDocument {
  id: number;
  title: string;
  category: string;
  url: string;
  download_count: number;
}

export interface ProductActivity {
  id: number;
  activity_type: string;
  description: string;
  date: string;
}

export interface ProductTopHCP {
  doctor_name: string;
  hospital: string;
  interactions_count: number;
  interest_level: string;
}

interface ProductState {
  list: Product[];
  selectedId: number | null;
  currentProduct: Product | null;
  dashboard: ProductDashboard | null;
  performance: ProductPerformance | null;
  inventory: ProductInventory | null;
  documents: ProductDocument[];
  activity: ProductActivity[];
  topHcps: ProductTopHCP[];
  loading: boolean;
  detailLoading: boolean;
  error: string | null;
}

const initialState: ProductState = {
  list: [],
  selectedId: null,
  currentProduct: null,
  dashboard: null,
  performance: null,
  inventory: null,
  documents: [],
  activity: [],
  topHcps: [],
  loading: false,
  detailLoading: false,
  error: null,
};

export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<Product[]>('/api/products');
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch products');
    }
  }
);

export const fetchProductsDashboard = createAsyncThunk(
  'products/fetchProductsDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<ProductDashboard>('/api/products/dashboard');
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch product dashboard summary');
    }
  }
);

export const fetchProductProfile = createAsyncThunk(
  'products/fetchProductProfile',
  async (productId: number, { rejectWithValue }) => {
    try {
      const [profileRes, perfRes, invRes, docRes, actRes, hcpRes] = await Promise.all([
        api.get<Product>(`/api/products/${productId}`),
        api.get<ProductPerformance>(`/api/products/${productId}/performance`),
        api.get<ProductInventory>(`/api/products/${productId}/inventory`),
        api.get<ProductDocument[]>(`/api/products/${productId}/documents`),
        api.get<ProductActivity[]>(`/api/products/${productId}/activity`),
        api.get<ProductTopHCP[]>(`/api/products/${productId}/top-hcps`),
      ]);
      return {
        profile: profileRes.data,
        performance: perfRes.data,
        inventory: invRes.data,
        documents: docRes.data,
        activity: actRes.data,
        topHcps: hcpRes.data,
      };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch product intelligence profile');
    }
  }
);

export const createProduct = createAsyncThunk(
  'products/createProduct',
  async (data: any, { rejectWithValue }) => {
    try {
      const response = await api.post<Product>('/api/products', data);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to create product');
    }
  }
);

export const updateProduct = createAsyncThunk(
  'products/updateProduct',
  async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
    try {
      const response = await api.put<Product>(`/api/products/${id}`, data);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to update product');
    }
  }
);

export const deleteProduct = createAsyncThunk(
  'products/deleteProduct',
  async (id: number, { rejectWithValue }) => {
    try {
      await api.delete(`/api/products/${id}`);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to delete product');
    }
  }
);

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    selectProduct: (state, action) => {
      state.selectedId = action.payload;
    },
  },
  extraReducers: (builder) => {
    // fetchProducts
    builder.addCase(fetchProducts.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchProducts.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload;
    });
    builder.addCase(fetchProducts.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // fetchProductsDashboard
    builder.addCase(fetchProductsDashboard.fulfilled, (state, action) => {
      state.dashboard = action.payload;
    });

    // fetchProductProfile
    builder.addCase(fetchProductProfile.pending, (state) => {
      state.detailLoading = true;
    });
    builder.addCase(fetchProductProfile.fulfilled, (state, action) => {
      state.detailLoading = false;
      state.currentProduct = action.payload.profile;
      state.performance = action.payload.performance;
      state.inventory = action.payload.inventory;
      state.documents = action.payload.documents;
      state.activity = action.payload.activity;
      state.topHcps = action.payload.topHcps;
    });
    builder.addCase(fetchProductProfile.rejected, (state) => {
      state.detailLoading = false;
    });

    // createProduct
    builder.addCase(createProduct.fulfilled, (state, action) => {
      state.list.push(action.payload);
      state.list.sort((a, b) => a.name.localeCompare(b.name));
      state.selectedId = action.payload.id;
      state.currentProduct = action.payload;
    });

    // updateProduct
    builder.addCase(updateProduct.fulfilled, (state, action) => {
      const idx = state.list.findIndex(p => p.id === action.payload.id);
      if (idx !== -1) {
        state.list[idx] = action.payload;
      }
      if (state.selectedId === action.payload.id) {
        state.currentProduct = action.payload;
      }
    });

    // deleteProduct
    builder.addCase(deleteProduct.fulfilled, (state, action) => {
      state.list = state.list.filter(p => p.id !== action.payload);
      if (state.selectedId === action.payload) {
        if (state.list.length > 0) {
          state.selectedId = state.list[0].id;
        } else {
          state.selectedId = null;
          state.currentProduct = null;
        }
      }
    });
  },
});

export const { selectProduct } = productSlice.actions;
export default productSlice.reducer;
