// Service for interacting with the Python chart generation API

// Base URL for the chart API
const API_BASE_URL = process.env.NEXT_PUBLIC_CHART_API_URL || 'http://localhost:8000';

// Chart types
export type ChartType = 'bar' | 'pie' | 'line';

// Interface for chart generation request
export interface ChartRequest {
  chart_type: ChartType;
  title: string;
  data: Record<string, any>;
  labels?: string[];
  x_axis?: string | string[];
  y_axis?: string;
  colors?: string[];
  theme?: 'light' | 'dark';
}

// Interface for chart response
export interface ChartResponse {
  image: string; // base64 encoded image
  chart_type: ChartType;
  title: string;
}

/**
 * Generate a custom chart based on provided data
 */
export async function generateChart(request: ChartRequest): Promise<ChartResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-chart/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to generate chart');
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating chart:', error);
    throw error;
  }
}

/**
 * Get election data chart for a specific year and type
 */
export async function getElectionChart(
  year: string,
  chartType: 'presidential' | 'turnout',
  theme: 'light' | 'dark' = 'light'
): Promise<ChartResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/election-chart/${year}/${chartType}?theme=${theme}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to get election chart');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting election chart:', error);
    throw error;
  }
}

/**
 * Get governance indicator chart
 */
export async function getGovernanceChart(
  indicator: string,
  theme: 'light' | 'dark' = 'light'
): Promise<ChartResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/governance-chart/${indicator}?theme=${theme}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to get governance chart');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting governance chart:', error);
    throw error;
  }
}

/**
 * Get county budget allocation chart
 */
export async function getCountyBudgetChart(
  county: string,
  theme: 'light' | 'dark' = 'light'
): Promise<ChartResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/county-budget-chart/${county}?theme=${theme}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to get county budget chart');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting county budget chart:', error);
    throw error;
  }
}

// Helper method to identify chart-related requests in user messages
export function identifyChartRequest(message: string): {
  type: 'election' | 'governance' | 'budget' | null;
  params: Record<string, string>;
} {
  message = message.toLowerCase();
  
  // Common visualization terms that indicate chart requests
  const visualTerms = [
    'show', 'display', 'visualize', 'graph', 'chart', 'plot', 'draw',
    'illustrate', 'visual', 'statistics', 'stats', 'figures', 'numbers',
    'percentage', 'distribution', 'breakdown', 'comparison'
  ];
  
  // Detect if this is likely a visualization request
  const isVisualizationRequest = visualTerms.some(term => message.includes(term));
  
  // Election charts detection
  if (
    (message.includes('election') || message.includes('voting') || 
     message.includes('poll') || message.includes('ballot') ||
     message.includes('vote') || message.includes('presidential') ||
     (message.includes('2017') || message.includes('2022')) && isVisualizationRequest)
  ) {
    const params: Record<string, string> = {};
    
    // Detect year
    const yearMatch = message.match(/\b(2017|2022)\b/);
    if (yearMatch) {
      params.year = yearMatch[1];
    } else {
      params.year = '2022'; // Default to most recent
    }
    
    // Detect chart type
    if (message.includes('presidential') || message.includes('president') || 
        message.includes('winner') || message.includes('results') ||
        message.includes('candidate') || message.includes('win')) {
      params.chartType = 'presidential';
    } else if (message.includes('turnout') || message.includes('voter') ||
              message.includes('participation') || message.includes('attendance')) {
      params.chartType = 'turnout';
    } else {
      // If the query mentions turnout-related words implicitly
      if (message.includes('how many') || message.includes('percentage') ||
          message.includes('region') || message.includes('county')) {
        params.chartType = 'turnout';
      } else {
        params.chartType = 'presidential'; // Default
      }
    }
    
    return { type: 'election', params };
  }
  
  // Governance charts detection
  if (
    message.includes('governance') || message.includes('index') || 
    message.includes('indicator') || message.includes('transparency') || 
    message.includes('accountability') || message.includes('rule of law') ||
    message.includes('corruption') || message.includes('governance score') ||
    (message.includes('public') && message.includes('participation'))
  ) {
    const params: Record<string, string> = {};
    
    if (message.includes('transparency')) {
      params.indicator = 'transparency';
    } else if (message.includes('accountability')) {
      params.indicator = 'accountability'; 
    } else if (message.includes('rule of law') || message.includes('justice') ||
              message.includes('legal system')) {
      params.indicator = 'rule_of_law';
    } else if (message.includes('participation') || message.includes('citizen involvement') ||
              message.includes('civic engagement')) {
      params.indicator = 'public_participation';
    } else {
      params.indicator = 'all'; // Show all indicators
    }
    
    return { type: 'governance', params };
  }
  
  // Budget allocation charts detection
  if (
    message.includes('budget') || message.includes('spending') || 
    message.includes('allocation') || message.includes('expenditure') ||
    message.includes('funds') || message.includes('money') ||
    message.includes('financial') || message.includes('fiscal') ||
    (message.includes('county') && isVisualizationRequest)
  ) {
    const params: Record<string, string> = {};
    
    // Detect county
    const counties = ['nairobi', 'mombasa', 'kisumu', 'nakuru', 'eldoret'];
    for (const county of counties) {
      if (message.includes(county)) {
        params.county = county.charAt(0).toUpperCase() + county.slice(1);
        break;
      }
    }
    
    if (!params.county) {
      if (message.includes('all') || message.includes('compare') || 
          message.includes('counties') || message.includes('comparison')) {
        params.county = 'all';
      } else {
        // Check if query mentions a county without the full name
        if (message.includes('county')) {
          for (const county of counties) {
            // Try to find partial matches
            const countyPattern = new RegExp(`\\b${county.slice(0, 4)}\\w*\\b`, 'i');
            if (countyPattern.test(message)) {
              params.county = county.charAt(0).toUpperCase() + county.slice(1);
              break;
            }
          }
        }
        
        // Default to capital if no match
        if (!params.county) {
          params.county = 'Nairobi';
        }
      }
    }
    
    return { type: 'budget', params };
  }
  
  // Catch-all for statistical questions that should generate charts
  // This helps when users ask indirectly for visual data
  if (isVisualizationRequest) {
    // Try to classify the request based on context
    if (message.includes('2017') || message.includes('2022') || 
        message.includes('president') || message.includes('vote')) {
      return { 
        type: 'election', 
        params: { 
          year: message.includes('2017') ? '2017' : '2022',
          chartType: 'presidential' 
        } 
      };
    }
    
    if (message.includes('county') || message.includes('budget') || 
        message.includes('spending')) {
      return { 
        type: 'budget', 
        params: { county: 'Nairobi' } 
      };
    }
    
    if (message.includes('governance') || message.includes('corruption') || 
        message.includes('transparency')) {
      return { 
        type: 'governance', 
        params: { indicator: 'all' } 
      };
    }
  }
  
  return { type: null, params: {} };
} 