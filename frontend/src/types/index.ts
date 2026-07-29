export type UserRole = "worker" | "employer" | "admin";
export type EmploymentType = "full_time" | "part_time" | "remote" | "contract" | "internship";
export type JobStatus = "draft" | "open" | "closed";
export type ApplicationStatus = "pending" | "reviewed" | "accepted" | "rejected";
export type FavoriteTargetType = "job" | "worker";
export type MessageType = "text" | "image" | "voice";
export type NotificationType = "new_application" | "new_message" | "status_change" | "ai_recommendation" | "system";

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
  city?: string;
  is_email_verified: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Skill {
  id: string;
  name: string;
}

export interface Experience {
  id: string;
  company_name: string;
  role_title: string;
  start_date: string;
  end_date?: string;
  description?: string;
}

export interface WorkerProfile {
  id: string;
  user_id: string;
  desired_position?: string;
  desired_salary?: number;
  bio?: string;
  education?: string;
  portfolio_links?: any;
  skills: Skill[];
  experiences: Experience[];
  user?: User;
}

export interface Company {
  id: string;
  employer_id: string;
  company_name: string;
  description?: string;
  logo_url?: string;
  website?: string;
  industry?: string;
  is_verified: boolean;
  created_at: string;
}

export interface Job {
  id: string;
  company_id: string;
  title: string;
  description: string;
  salary_min?: number;
  salary_max?: number;
  currency: string;
  location: string;
  category: string;
  employment_type: EmploymentType;
  status: JobStatus;
  created_at: string;
  updated_at: string;
  company?: Company;
}

export interface Application {
  id: string;
  worker_id: string;
  job_id: string;
  status: ApplicationStatus;
  cover_note?: string;
  created_at: string;
  updated_at: string;
  worker?: User;
  job?: Job;
}

export interface Favorite {
  id: string;
  user_id: string;
  target_type: FavoriteTargetType;
  target_id: string;
  created_at: string;
  target_details?: any;
}

export interface ChatParticipant {
  user_id: string;
  user?: User;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  type: MessageType;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Chat {
  id: string;
  created_at: string;
  participants: ChatParticipant[];
  last_message?: Message;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  payload: any;
  is_read: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  role: UserRole;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
