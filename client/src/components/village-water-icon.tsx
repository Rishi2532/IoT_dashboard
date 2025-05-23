import React from 'react';
import { Building2 } from 'lucide-react';

interface VillageWaterIconProps {
  onClick?: () => void;
}

const VillageWaterIcon: React.FC<VillageWaterIconProps> = ({ onClick }) => {
  return (
    <div 
      className="village-water-icon" 
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="relative">
        <Building2 
          className="h-10 w-10 text-teal-500" 
          style={{ opacity: 0.9 }}
        />
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10"
          style={{ marginTop: '5px' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M12 6.75C10.75 6.75 10 7.25 9 8C7.79 8.94 7 10.6 7 12C7 13.78 8.19 20 9.75 20C10.37 20 10.75 19 11 18.25C11.25 17.5 11.5 17 12 17C12.5 17 12.75 17.5 13 18.25C13.25 19 13.63 20 14.25 20C15.81 20 17 13.78 17 12C17 10.6 16.21 8.94 15 8C14 7.25 13.25 6.75 12 6.75Z" 
              fill="#3B82F6" 
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default VillageWaterIcon;