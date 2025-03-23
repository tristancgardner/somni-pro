import React from 'react';

interface SpeakerTagProps {
  name: string;
  role?: string;
}

const SpeakerTag: React.FC<SpeakerTagProps> = ({ name, role }) => {
  // Determine background color based on role
  const getBgColor = () => {
    if (!role) return 'bg-blue-600';
    
    const role_lower = role.toLowerCase();
    if (role_lower.includes('interviewer')) return 'bg-purple-600';
    if (role_lower.includes('interviewee')) return 'bg-green-600';
    if (role_lower.includes('host')) return 'bg-purple-600';
    if (role_lower.includes('guest')) return 'bg-green-600';
    if (role_lower.includes('facilitator')) return 'bg-purple-600';
    if (role_lower.includes('speaker a')) return 'bg-purple-600';
    if (role_lower.includes('speaker b')) return 'bg-green-600';
    
    return 'bg-blue-600';
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white ${getBgColor()} mr-1`}>
      {name}
    </span>
  );
};

export default SpeakerTag; 