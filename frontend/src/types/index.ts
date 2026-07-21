export interface User {
  id: number;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: 'guest' | 'host' | 'admin';
  phone: string | null;
  locale: string;
  idVerified: boolean;
  fastResponse: boolean;
  createdAt: string;
}

export interface HostProfile {
  legalName: string | null;
  documentId: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountType: 'savings' | 'checking' | null;
  commissionRate: number;
  approvalStatus: 'pending_approval' | 'approved' | 'rejected';
  createdAt: string;
}

export interface PropertyPhoto {
  [key: string]: any
  id: number
  url: string
  thumbnail_url: string | null
  thumbnailUrl: string | null
  sort_order: number
  sortOrder: number
}

export interface PropertyVideo {
  [key: string]: any
  id: number
  source: string
  url: string
  thumbnail_url: string | null
  thumbnailUrl: string | null
}

export interface Amenity {
  id: number;
  category: string;
  name: string;
  icon: string;
  allowsDetail: boolean;
  detail?: string | null;
}

export interface PropertyTranslation {
  locale: string;
  title: string;
  description: string | null;
  isAutoTranslated: boolean;
}

export interface Property {
  [key: string]: any
  id: number
  host_id: number
  hostId: number
  title: string
  description: string | null
  city: string
  address: string | null
  neighborhood: string | null
  latitude: number | null
  longitude: number | null
  show_exact_location: boolean
  showExactLocation: boolean
  directions_note: string | null
  directionsNote: string | null
  area_note: string | null
  areaNote: string | null
  property_type: string
  propertyType: string
  max_guests: number
  maxGuests: number
  bedrooms: number
  beds: number
  bathrooms: number
  area_m2: number | null
  areaM2: number | null
  base_price_per_night: number
  basePricePerNight: number
  cancellation_policy: string
  cancellationPolicy: string
  status: string
  main_photo_url?: string | null
  mainPhotoUrl?: string | null
  main_thumbnail_url?: string | null
  avg_rating: number
  review_count: number
  host_name?: string
  host_avatar?: string
  host_id_verified?: boolean
  photos?: PropertyPhoto[]
  videos?: PropertyVideo[]
  amenities?: Amenity[]
  translations?: PropertyTranslation[]
}

export interface SearchResult {
  properties: Property[];
  count: number;
}

export interface City {
  city: string;
  property_count: number;
}

export interface SearchFilters {
  city?: string;
  startDate?: string;
  endDate?: string;
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
  amenities?: number[];
  type?: 'apartamento' | 'apartaestudio' | 'casa' | 'suite' | 'habitacion';
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
  details?: any[];
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ProfileResponse {
  user: User;
  hostProfile: HostProfile | null;
}

export interface Booking {
  [key: string]: any
  booking_id: number
  property_id: number
  guest_id: number
  start_date: string
  end_date: string
  guests_count: number
  price_per_night: number
  total_amount: number
  status: 'pending_payment' | 'confirmed' | 'cancelled' | 'completed'
  expires_at: string | null
  cancellation_reason: string | null
  cancelled_by: number | null
  cancelled_at: string | null
  booking_created_at: string
  booking_updated_at: string
  property_title: string
  property_city: string
  property_neighborhood: string | null
  property_type: string
  property_max_guests: number
  property_bedrooms: number
  property_host_id: number
  guest_name: string
  guest_email: string
  guest_phone: string | null
  guest_avatar: string | null
  host_name: string
  host_email: string
  total_nights: number
  is_completed: boolean
  can_be_cancelled: boolean
}

export interface CreateBookingData {
  propertyId: number
  startDate: string
  endDate: string
  guestsCount: number
}

export interface BookingCancellation {
  booking_id: number
  status: string
  cancellation_reason: string
  cancelled_at: string
  refund_amount: number
  refund_percentage: number
  policy_applied: string
  days_until_checkin: number
}

export interface Payment {
  id: number
  booking_id: number
  wompi_transaction_id: string | null
  amount: number
  status: 'pending' | 'approved' | 'declined' | 'refunded'
  payment_method: string | null
  created_at: string
}

export interface PaymentIntent {
  payment_id: number
  booking_id: number
  amount: number
  reference: string
  currency: string
}

export interface PaymentIntentResponse {
  paymentIntent: PaymentIntent
  publicKey: string
}
