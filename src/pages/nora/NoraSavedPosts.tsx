import React from 'react';
import SavedPostsList from '@/components/social-media/SavedPostsList';

const NoraSavedPosts = () => {
  return (
    <div className="p-6">
      <SavedPostsList refreshTrigger={0} />
    </div>
  );
};

export default NoraSavedPosts;
