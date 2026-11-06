import React from 'react';
import { PublicChatbotModule } from './PublicChatbotModule';
import './ChatbotModule.css';

// Se conservan las props del remoto para no romper los contenedores existentes.
export interface ChatbotModuleProps {
  mode?: 'authenticated' | 'public';
  onLogin?: () => void;
  apiBaseUrl?: string;
  userEmail?: string;
  userId?: string;
  userName?: string;
  initialConversationId?: string;
  onClose?: () => void;
  isWidget?: boolean;
}

export const ChatbotModule: React.FC<ChatbotModuleProps> = ({ apiBaseUrl, isWidget }) =>
  <PublicChatbotModule apiBaseUrl={apiBaseUrl} isWidget={isWidget} />;

export default ChatbotModule;
