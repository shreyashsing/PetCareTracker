/**
 * Test utility to validate Pet Assistant response formatting
 * This helps ensure that the AI responses are properly formatted without markdown
 */

import { formatResponseText } from './textFormatter';

export const testFormatting = () => {
  console.log('🧪 Testing Pet Assistant Formatting...\n');
  
  // Test cases with problematic formatting
  const testCases = [
    {
      name: 'Markdown Bold Removal',
      input: '**Feeding Schedule:** Dogs should eat **twice daily** for optimal health.',
      expected: 'Feeding Schedule: Dogs should eat twice daily for optimal health.'
    },
    {
      name: 'Markdown Italic Removal', 
      input: 'This is *very important* for your pet\'s *health and wellbeing*.',
      expected: 'This is very important for your pet\'s health and wellbeing.'
    },
    {
      name: 'Bullet Point Formatting',
      input: '- Feed at consistent times\n* Provide fresh water\n• Use high-quality food',
      expected: '• Feed at consistent times\n• Provide fresh water\n• Use high-quality food'
    },
    {
      name: 'Numbered List Formatting',
      input: '1.   First step\n2.    Second step\n3. Third step',
      expected: '1. First step\n2. Second step\n3. Third step'
    },
    {
      name: 'Complex Mixed Formatting',
      input: '**Important Health Tips:**\n\n- Monitor your pet\'s *weight* regularly\n- Watch for **warning signs** like:\n  * Loss of appetite\n  * **Lethargy**\n  * *Unusual behavior*',
      expected: 'Important Health Tips:\n\n• Monitor your pet\'s weight regularly\n• Watch for warning signs like:\n  • Loss of appetite\n  • Lethargy\n  • Unusual behavior'
    }
  ];
  
  let passedTests = 0;
  
  testCases.forEach((test, index) => {
    const result = formatResponseText(test.input);
    const passed = result.trim() === test.expected.trim();
    
    console.log(`Test ${index + 1}: ${test.name}`);
    console.log(`Input: "${test.input}"`);
    console.log(`Expected: "${test.expected}"`);
    console.log(`Result: "${result}"`);
    console.log(`Status: ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
    
    if (passed) passedTests++;
  });
  
  console.log(`\n📊 Test Results: ${passedTests}/${testCases.length} tests passed`);
  
  if (passedTests === testCases.length) {
    console.log('🎉 All formatting tests passed! Pet Assistant responses should now display properly.');
  } else {
    console.log('⚠️ Some tests failed. Response formatting may need additional work.');
  }
  
  return {
    passed: passedTests,
    total: testCases.length,
    success: passedTests === testCases.length
  };
};

// Example of how the improved Pet Assistant should respond
export const getFormattingGuidelines = () => {
  return `
Pet Assistant Formatting Guidelines:

Good Response Format:
"Diet Recommendations for Your Dog:

Your dog's nutritional needs depend on several factors including age, breed, and activity level.

Key Feeding Guidelines:
• Feed high-quality commercial dog food appropriate for your dog's life stage
• Divide daily food into 2-3 meals for adult dogs
• Provide fresh water at all times
• Avoid feeding table scraps and toxic foods

Foods to Avoid:
• Chocolate and caffeine
• Grapes and raisins  
• Onions and garlic
• Alcohol and artificial sweeteners

Weight Management Steps:
1. Consult your veterinarian for ideal weight assessment
2. Measure food portions accurately using a standard measuring cup
3. Monitor body condition regularly by feeling for ribs
4. Adjust portions based on activity level and age

If you notice sudden weight loss or gain, contact your veterinarian immediately for a health evaluation."

Bad Response Format (what we're fixing):
"**Diet Recommendations for Your Dog:**

Your dog's nutritional needs depend on several factors including *age*, *breed*, and *activity level*.

**Key Feeding Guidelines:**
- Feed **high-quality** commercial dog food appropriate for your dog's *life stage*
- Divide daily food into **2-3 meals** for adult dogs
- Provide *fresh water* at all times"
`;
};

export default { testFormatting, getFormattingGuidelines }; 