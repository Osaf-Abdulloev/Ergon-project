import { api } from './api';
import { Resume, ResumeCreateRequest, ResumeUpdateRequest, AISuggestionsData } from '../types/resume';

export const resumeService = {
  // List all user resumes (drafts and published)
  getResumes: async (): Promise<Resume[]> => {
    try {
      const response = await api.get('/resumes');
      return response.data || [];
    } catch (err) {
      console.error('Error fetching resumes:', err);
      return [];
    }
  },

  // Get specific resume detail
  getResumeById: async (id: string): Promise<Resume | null> => {
    try {
      const response = await api.get(`/resumes/${id}`);
      return response.data;
    } catch (err) {
      console.error(`Error fetching resume ${id}:`, err);
      return null;
    }
  },

  // Get candidate's published resume for employers
  getCandidatePublishedResume: async (userId: string): Promise<Resume | null> => {
    try {
      const response = await api.get(`/resumes/candidate/${userId}`);
      return response.data;
    } catch (err) {
      console.error(`Error fetching published resume for candidate ${userId}:`, err);
      return null;
    }
  },

  // Create new draft resume
  createDraft: async (data: ResumeCreateRequest = {}): Promise<Resume | null> => {
    try {
      const response = await api.post('/resumes', data);
      return response.data;
    } catch (err) {
      console.error('Error creating draft resume:', err);
      return null;
    }
  },

  // Parse uploaded CV file or file_id
  parseCVFile: async (file?: File, fileId?: string): Promise<Resume | null> => {
    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file, file.name);
      }
      if (fileId) {
        formData.append('file_id', fileId);
      }

      const response = await api.post('/resumes/parse-cv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      return response.data;
    } catch (err) {
      console.error('Error parsing CV file:', err);
      throw err;
    }
  },

  // Update resume content or draft
  updateResume: async (id: string, data: ResumeUpdateRequest): Promise<Resume | null> => {
    try {
      const response = await api.put(`/resumes/${id}`, data);
      return response.data;
    } catch (err) {
      console.error(`Error updating resume ${id}:`, err);
      return null;
    }
  },

  // Publish resume
  publishResume: async (id: string): Promise<Resume | null> => {
    try {
      const response = await api.post(`/resumes/${id}/publish`);
      return response.data;
    } catch (err) {
      console.error(`Error publishing resume ${id}:`, err);
      throw err;
    }
  },

  // Duplicate resume
  duplicateResume: async (id: string): Promise<Resume | null> => {
    try {
      const response = await api.post(`/resumes/${id}/duplicate`);
      return response.data;
    } catch (err) {
      console.error(`Error duplicating resume ${id}:`, err);
      return null;
    }
  },

  // Fetch AI suggestions
  fetchAISuggestions: async (id: string): Promise<AISuggestionsData | null> => {
    try {
      const response = await api.post(`/resumes/${id}/ai-suggest`);
      return response.data;
    } catch (err) {
      console.error(`Error fetching AI suggestions for ${id}:`, err);
      return null;
    }
  },

  // Delete resume draft
  deleteResume: async (id: string): Promise<boolean> => {
    try {
      await api.delete(`/resumes/${id}`);
      return true;
    } catch (err) {
      console.error(`Error deleting resume ${id}:`, err);
      return false;
    }
  }
};
