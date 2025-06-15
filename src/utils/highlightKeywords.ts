
export const highlightKeywords = (text: string, query: string): string => {
  if (!query.trim() || !text) return text;
  
  const keywords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  let highlightedText = text;
  
  keywords.forEach(keyword => {
    // Escape special regex characters
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedKeyword})`, 'gi');
    highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
  });
  
  return highlightedText;
};
