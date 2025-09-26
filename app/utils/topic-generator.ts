// Simple type definitions for TopicSelectionModal
export interface TopicCategory {
  id: string;
  name: string;
  title: string;
  description?: string;
  topics?: string[];
  selected?: boolean;
  color: string;
  emoji: string;
  questions: any[];
}

// Placeholder for topic generation logic
export const generateTopics = async (): Promise<TopicCategory[]> => {
  return [];
};