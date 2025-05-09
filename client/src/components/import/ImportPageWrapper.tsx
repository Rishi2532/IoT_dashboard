import React from 'react';
import ImportLayout from '@/components/dashboard/import-layout';

interface ImportPageWrapperProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

const ImportPageWrapper: React.FC<ImportPageWrapperProps> = ({ 
  title, 
  description, 
  children 
}) => {
  return (
    <ImportLayout>
      <div className="w-full">
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        {description && (
          <p className="mb-6 text-gray-600">{description}</p>
        )}
        {children}
      </div>
    </ImportLayout>
  );
};

export default ImportPageWrapper;