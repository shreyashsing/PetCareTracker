import React from 'react';
import { Text, TextStyle } from 'react-native';

/**
 * Simple text formatter to convert basic markdown to React Native Text components
 * Handles: **bold**, *italic*, bullet points, and numbered lists
 */

interface FormattedTextProps {
  text: string;
  style?: TextStyle;
  boldStyle?: TextStyle;
  italicStyle?: TextStyle;
}

export const formatTextToComponents = (
  text: string, 
  baseStyle?: TextStyle,
  boldStyle?: TextStyle,
  italicStyle?: TextStyle
): React.ReactNode[] => {
  const lines = text.split('\n');
  const components: React.ReactNode[] = [];
  
  lines.forEach((line, lineIndex) => {
    if (line.trim() === '') {
      // Empty line - add spacing
      components.push(
        React.createElement(Text, 
          { key: `empty-${lineIndex}`, style: { height: 8 } }, 
          ''
        )
      );
      return;
    }
    
    // Handle bullet points
    if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
      const bulletText = line.replace(/^[\s]*[•\-\*][\s]*/, '');
      components.push(
        React.createElement(Text, 
          { key: `bullet-${lineIndex}`, style: [baseStyle, { marginLeft: 16, marginVertical: 2 }] },
          `• ${formatInlineText(bulletText, baseStyle, boldStyle, italicStyle)}`
        )
      );
      return;
    }
    
    // Handle numbered lists
    const numberedMatch = line.match(/^[\s]*(\d+)\.[\s]*(.*)/);
    if (numberedMatch) {
      const [, number, listText] = numberedMatch;
      components.push(
        React.createElement(Text, 
          { key: `numbered-${lineIndex}`, style: [baseStyle, { marginLeft: 16, marginVertical: 2 }] },
          `${number}. ${formatInlineText(listText, baseStyle, boldStyle, italicStyle)}`
        )
      );
      return;
    }
    
    // Regular text with inline formatting
    const formattedLine = formatInlineText(line, baseStyle, boldStyle, italicStyle);
    components.push(
      React.createElement(Text, 
        { key: `line-${lineIndex}`, style: [baseStyle, { marginVertical: 1 }] },
        formattedLine
      )
    );
  });
  
  return components;
};

const formatInlineText = (
  text: string, 
  baseStyle?: TextStyle,
  boldStyle?: TextStyle,
  italicStyle?: TextStyle
): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;
  let partIndex = 0;
  
  // Find all bold (**text**) and italic (*text*) patterns
  const patterns = [
    { regex: /\*\*(.*?)\*\*/g, style: boldStyle || { fontWeight: 'bold' }, type: 'bold' },
    { regex: /\*(.*?)\*/g, style: italicStyle || { fontStyle: 'italic' }, type: 'italic' }
  ];
  
  // Simple approach: handle bold first, then italic within remaining text
  let remainingText = text;
  const segments: Array<{ text: string; style?: TextStyle; start: number; end: number }> = [];
  
  // Find bold patterns first
  let match;
  const boldRegex = /\*\*(.*?)\*\*/g;
  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before bold
    if (match.index > currentIndex) {
      segments.push({
        text: text.substring(currentIndex, match.index),
        start: currentIndex,
        end: match.index
      });
    }
    
    // Add bold text
    segments.push({
      text: match[1],
      style: boldStyle || { fontWeight: 'bold' },
      start: match.index,
      end: match.index + match[0].length
    });
    
    currentIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (currentIndex < text.length) {
    segments.push({
      text: text.substring(currentIndex),
      start: currentIndex,
      end: text.length
    });
  }
  
  // Convert segments to React components
  segments.forEach((segment, index) => {
    if (segment.text.trim()) {
      parts.push(
        React.createElement(Text,
          { 
            key: `part-${partIndex++}`,
            style: segment.style ? [baseStyle, segment.style] : baseStyle
          },
          segment.text
        )
      );
    }
  });
  
  return parts.length > 0 ? parts : [text];
};

/**
 * Simple function to strip markdown formatting for plain text display
 */
export const stripMarkdown = (text: string): string => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1')     // Remove italic
    .replace(/^[\s]*[•\-\*][\s]*/gm, '• ') // Normalize bullet points
    .replace(/^[\s]*(\d+)\.[\s]*/gm, '$1. '); // Normalize numbered lists
};

/**
 * Format text with proper spacing and structure for better readability
 */
export const formatResponseText = (text: string): string => {
  return text
    // Replace ** with nothing for bold (since we can't render bold in plain text easily)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // Replace * with nothing for italic
    .replace(/\*(.*?)\*/g, '$1')
    // Ensure proper bullet point formatting
    .replace(/^[\s]*[-*•][\s]*/gm, '• ')
    // Ensure proper numbered list formatting
    .replace(/^[\s]*(\d+)\.[\s]*/gm, '$1. ')
    // Add proper line spacing for better readability
    .replace(/\n\n/g, '\n\n')
    // Ensure sentences end properly
    .replace(/([.!?])([A-Z])/g, '$1 $2')
    // Clean up extra whitespace
    .replace(/[ \t]+/g, ' ')
    .trim();
};

export default { formatTextToComponents, stripMarkdown, formatResponseText }; 