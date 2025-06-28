"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { getAuth } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';

interface Project {
  id: string;
  name: string;
  displayName: string;
  type: 'personal' | 'team';
  role: 'owner' | 'admin' | 'member';
  memberCount: number;
  createdAt: Date | null;
}

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  currentProjectId: string | null;
  loading: boolean;
  error: string | null;
  switchProject: (projectId: string) => void;
  refetch: () => void;
}

const ProjectContext = createContext<ProjectContextType>({
  projects: [],
  currentProject: null,
  currentProjectId: null,
  loading: true,
  error: null,
  switchProject: () => {},
  refetch: () => {},
});

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

interface ProjectProviderProps {
  children: React.ReactNode;
}

const STORAGE_KEY = 'selectedProjectId';

async function fetchProjects() {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error('No auth token available');
  }

  const response = await fetch('/api/v1/projects', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch projects');
  }

  const data = await response.json();
  return data.projects as Project[];
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // Use TanStack Query to fetch projects
  const { data: projects = [], isLoading, error, refetch } = useQuery({
    queryKey: ['projects', user?.uid],
    queryFn: fetchProjects,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Derive current project from projects and currentProjectId
  const currentProject = projects.find(p => p.id === currentProjectId) || null;

  // Initialize project selection when projects are loaded
  useEffect(() => {
    if (projects.length > 0 && !currentProjectId) {
      // Get stored project ID
      const storedProjectId = localStorage.getItem(STORAGE_KEY);
      
      // Priority: stored selection > first project
      let selectedProjectId: string | null = null;
      
      if (storedProjectId && projects.some(p => p.id === storedProjectId)) {
        selectedProjectId = storedProjectId;
      } else if (projects.length > 0) {
        selectedProjectId = projects[0].id;
      }

      if (selectedProjectId) {
        setCurrentProjectId(selectedProjectId);
        localStorage.setItem(STORAGE_KEY, selectedProjectId);
      }
    }
  }, [projects, currentProjectId]);

  // Handle case where user has no projects
  useEffect(() => {
    if (!isLoading && user && projects.length === 0 && pathname !== '/onboarding') {
      router.push('/onboarding');
    }
  }, [isLoading, user, projects, pathname, router]);

  // Switch to a different project
  const switchProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setCurrentProjectId(projectId);
      localStorage.setItem(STORAGE_KEY, projectId);
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProject,
        currentProjectId,
        loading: isLoading,
        error: error ? error.message : null,
        switchProject,
        refetch,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};