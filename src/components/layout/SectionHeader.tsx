// components/SectionHeader.tsx
import React from 'react';
import { Badge } from '@/components/ui/badge'; // Adjust the import path if needed

interface SectionHeaderProps {
  title: string;
  badge?: string;
  description?: string;
  alignment?: 'center' | 'start' | 'end';
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  badge,
  alignment = 'center',
  description,
}) => {
  return (
    <div className={`mb-10 relative z-10 flex flex-col items-${alignment}`}>
      {badge && (
        <Badge>
          <span className="text-brand font-semibold">{badge}</span>
        </Badge>
      )}
      <h2 className="md:text-4xl text-2xl tracking-tighter mt-4 font-bold text-gray-800 relative">
        {title}
      </h2>
      {description && (
        <p
          className={`text-gray-600 mt-4 max-w-3xl ${alignment === 'center' ? 'text-center' : ''} `}
        >
          {description}
        </p>
      )}
    </div>
  );
};

export default SectionHeader;
