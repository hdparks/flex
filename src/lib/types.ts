export interface User {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  is_admin?: number;
  created_at: string;
  workout_count?: number;
  total_minutes?: number;
}

export interface Workout {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description?: string;
  duration_minutes?: number;
  completed_at?: string;
  image?: string;
  created_at: string;
  username?: string;
  avatar_url?: string;
  cheer_count?: number;
  participants?: WorkoutParticipant[];
  cheers?: Cheer[];
}

export interface WorkoutParticipant {
  id?: string;
  workout_id?: string;
  user_id: string;
  username?: string;
  avatar_url?: string;
}

export interface Cheer {
  id: string;
  from_user_id?: string;
  workout_id?: string;
  message?: string;
  image?: string;
  created_at: string;
  username?: string;
  avatar_url?: string;
}

export interface Comment {
  id: string;
  user_id: string;
  workout_id: string;
  content: string;
  created_at: string;
  username?: string;
  avatar_url?: string;
}

export interface Team {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  username?: string;
  avatar_url?: string;
}