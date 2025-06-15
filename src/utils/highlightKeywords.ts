
export const highlightKeywords = (text: string, query: string): string => {
  if (!query.trim()) return text;
  
  const keywords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  let highlightedText = text;
  
  keywords.forEach(keyword => {
    const regex = new RegExp(`(${keyword})`, 'gi');
    highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
  });
  
  return highlightedText;
};
