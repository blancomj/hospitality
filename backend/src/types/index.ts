import { RowDataPacket, ResultSetHeader } from 'mysql2';

// ===========================
// Database Row Types
// ===========================

export interface UserRow extends RowDataPacket {
  id: number;
  google_id: string | null;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: 'guest' | 'host' | 'admin';
  phone: string | null;
  locale: string;
  status: 'active' | 'suspended';
  id_verified: boolean;
  fast_response: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface HostProfileRow extends RowDataPacket {
  user_id: number;
  legal_name: string | null;
  document_id: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_type: 'savings' | 'checking' | null;
  commission_rate: number;
  approval_status: 'pending_approval' | 'approved' | 'rejected';
  approved_by: number | null;
  approved_at: Date | null;
  created_at: Date;
}

export interface PropertyRow extends RowDataPacket {
  id: number;
  host_id: number;
  title: string;
  description: string | null;
  city: string;
  address: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  show_exact_location: boolean;
  directions_note: string | null;
  area_note: string | null;
  property_type: 'apartamento' | 'apartaestudio' | 'casa' | 'suite' | 'habitacion';
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  area_m2: number | null;
  base_price_per_night: number;
  cancellation_policy: 'flexible' | 'moderada' | 'estricta';
  ical_export_token: string;
  status: 'draft' | 'published' | 'paused';
  created_at: Date;
  updated_at: Date;
}

export interface PropertyPhotoRow extends RowDataPacket {
  id: number;
  property_id: number;
  url: string;
  thumbnail_url: string | null;
  sort_order: number;
  created_at: Date;
}

export interface PropertyVideoRow extends RowDataPacket {
  id: number;
  property_id: number;
  source: string;
  url: string;
  thumbnail_url: string | null;
  created_at: Date;
}

export interface AmenityCatalogRow extends RowDataPacket {
  id: number;
  category: string;
  name: string;
  icon: string;
  allows_detail: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface PropertyAmenityRow extends RowDataPacket {
  property_id: number;
  amenity_id: number;
  detail: string | null;
}

export interface PropertyTranslationRow extends RowDataPacket {
  id: number;
  property_id: number;
  locale: string;
  title: string;
  description: string | null;
  is_auto_translated: boolean;
  created_at: Date;
}

export interface AvailabilityOverrideRow extends RowDataPacket {
  id: number;
  property_id: number;
  date: string;
  is_blocked: boolean;
  special_price: number | null;
  created_at: Date;
}

export interface BookingRow extends RowDataPacket {
  id: number;
  property_id: number;
  guest_id: number;
  start_date: string;
  end_date: string;
  guests_count: number;
  price_per_night: number;
  total_amount: number;
  status: 'pending_payment' | 'confirmed' | 'cancelled' | 'completed';
  expires_at: Date | null;
  cancellation_reason: string | null;
  cancelled_by: number | null;
  cancelled_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface PaymentRow extends RowDataPacket {
  id: number;
  booking_id: number;
  wompi_transaction_id: string | null;
  amount: number;
  status: 'pending' | 'approved' | 'declined' | 'refunded';
  payment_method: string | null;
  raw_webhook_payload: any;
  created_at: Date;
}

export interface PayoutRow extends RowDataPacket {
  id: number;
  booking_id: number;
  host_id: number;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  wompi_payout_reference: string | null;
  paid_at: Date | null;
  created_at: Date;
}

export interface BookingDetailView extends RowDataPacket {
  booking_id: number;
  property_id: number;
  guest_id: number;
  start_date: string;
  end_date: string;
  guests_count: number;
  price_per_night: number;
  total_amount: number;
  status: string;
  expires_at: Date | null;
  cancellation_reason: string | null;
  cancelled_by: number | null;
  cancelled_at: Date | null;
  booking_created_at: Date;
  booking_updated_at: Date;
  property_title: string;
  property_city: string;
  property_neighborhood: string | null;
  property_type: string;
  property_max_guests: number;
  property_bedrooms: number;
  property_host_id: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  guest_avatar: string | null;
  host_name: string;
  host_email: string;
  total_nights: number;
  is_completed: boolean;
  can_be_cancelled: boolean;
}

// ===========================
// API Response Types
// ===========================

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
  createdAt: Date;
}

export interface HostProfile {
  legalName: string | null;
  documentId: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountType: 'savings' | 'checking' | null;
  commissionRate: number;
  approvalStatus: 'pending_approval' | 'approved' | 'rejected';
  createdAt: Date;
}

export interface PropertyPhoto {
  id: number;
  url: string;
  thumbnailUrl: string | null;
  sortOrder: number;
}

export interface PropertyVideo {
  id: number;
  source: string;
  url: string;
  thumbnailUrl: string | null;
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
  id: number;
  hostId: number;
  title: string;
  description: string | null;
  city: string;
  address: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  showExactLocation: boolean;
  directionsNote: string | null;
  areaNote: string | null;
  propertyType: 'apartamento' | 'apartaestudio' | 'casa' | 'suite' | 'habitacion';
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  areaM2: number | null;
  basePricePerNight: number;
  cancellationPolicy: 'flexible' | 'moderada' | 'estricta';
  status: 'draft' | 'published' | 'paused';
  mainPhotoUrl?: string | null;
  photos?: PropertyPhoto[];
  videos?: PropertyVideo[];
  amenities?: Amenity[];
  translations?: PropertyTranslation[];
}

export interface SearchResult {
  properties: Property[];
  count: number;
}

export interface City {
  city: string;
  property_count: number;
}

// ===========================
// Request Types
// ===========================

export interface CreatePropertyData {
  title: string;
  description?: string;
  city: string;
  address?: string;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
  showExactLocation?: boolean;
  directionsNote?: string;
  areaNote?: string;
  propertyType: 'apartamento' | 'apartaestudio' | 'casa' | 'suite' | 'habitacion';
  maxGuests?: number;
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
  areaM2?: number;
  basePricePerNight: number;
  cancellationPolicy?: 'flexible' | 'moderada' | 'estricta';
}

export interface UpdatePropertyData {
  title?: string;
  description?: string;
  city?: string;
  address?: string;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
  showExactLocation?: boolean;
  directionsNote?: string;
  areaNote?: string;
  propertyType?: 'apartamento' | 'apartaestudio' | 'casa' | 'suite' | 'habitacion';
  maxGuests?: number;
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
  areaM2?: number;
  basePricePerNight?: number;
  cancellationPolicy?: 'flexible' | 'moderada' | 'estricta';
  status?: 'draft' | 'published' | 'paused';
}

export interface UpdateLocationData {
  latitude: number;
  longitude: number;
  address?: string;
  neighborhood?: string;
  showExactLocation?: boolean;
  directionsNote?: string;
  areaNote?: string;
}

export interface AmenityUpdate {
  amenityId: number;
  detail?: string | null;
}

export interface AvailabilityOverride {
  date: string;
  isBlocked?: boolean;
  specialPrice?: number | null;
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

// ===========================
// Google Auth Types
// ===========================

export interface GoogleUserInfo {
  googleId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  emailVerified: boolean;
}

export interface JwtPayload {
  userId: number;
}

// ===========================
// Express Extended Types
// ===========================

import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: UserRow;
}
