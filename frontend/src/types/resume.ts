export type ResumeStatus = 'draft' | 'published' | 'archived';

export interface PersonalInfo {
  full_name: string;
  desired_position: string;
  email: string;
  phone: string;
  city: string;
  photo_url?: string;
  summary: string;
}

export interface WorkExperienceItem {
  id: string;
  company_name: string;
  position: string;
  start_date: string;
  end_date?: string;
  is_current?: boolean;
  responsibilities: string[];
  achievements: string[];
  location?: string;
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  field_of_study: string;
  start_year: string;
  end_year?: string;
  location?: string;
}

export interface SkillsData {
  technical: string[];
  soft: string[];
}

export interface LanguageItem {
  name: string;
  proficiency: string; // 'Native' | 'Fluent' | 'Advanced' | 'Intermediate' | 'Basic'
}

export interface CertificateItem {
  id: string;
  title: string;
  issuer: string;
  year?: string;
  credential_url?: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  tech_stack: string[];
  link?: string;
}

export interface SocialLinks {
  linkedin?: string;
  github?: string;
  portfolio?: string;
  telegram?: string;
  website?: string;
}

export interface CustomSectionItem {
  id: string;
  title: string;
  items: string[];
}

export interface ResumeContent {
  personal_info: PersonalInfo;
  work_experience: WorkExperienceItem[];
  education: EducationItem[];
  skills: SkillsData;
  languages: LanguageItem[];
  certificates: CertificateItem[];
  projects: ProjectItem[];
  social_links: SocialLinks;
  custom_sections: CustomSectionItem[];
}

export interface AISuggestionItem {
  id: string;
  type: 'summary' | 'skills' | 'experience' | 'languages' | 'formatting';
  section: string;
  title: string;
  suggestion: string;
  action_type?: 'add_skill' | 'enhance_summary' | 'add_section';
  payload?: any;
}

export interface AISuggestionsData {
  completeness_score: number;
  suggestions: AISuggestionItem[];
}

export interface Resume {
  id: string;
  user_id: string;
  source_file_id?: string;
  title: string;
  target_position?: string;
  status: ResumeStatus;
  content: ResumeContent;
  ai_suggestions?: AISuggestionsData;
  completeness_score: number;
  is_published: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ResumeCreateRequest {
  title?: string;
  target_position?: string;
  content?: Partial<ResumeContent>;
  source_file_id?: string;
}

export interface ResumeUpdateRequest {
  title?: string;
  target_position?: string;
  status?: ResumeStatus;
  content?: Partial<ResumeContent>;
}
