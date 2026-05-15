
/// <reference types="vite/client" />

/**
 * CRM Integration Service
 */

export interface CRMLeadData {
  name: string;
  email: string;
  phone: string;
  company?: string;
  leadScore: string;
  source: string;
  capturedAt: string;
}

export interface CRMChatSummary {
  leadEmail: string;
  summary: string;
  transcript: { role: string; content: string }[];
  status: string;
}

const CRM_ENDPOINT = import.meta.env.VITE_CRM_ENDPOINT || 'https://api.legaleasesolutions.com/crm/v1/leads';

export async function syncLeadToCRM(data: CRMLeadData) {
  console.log('--- Syncing Lead to CRM ---', data);
  
  if (!import.meta.env.VITE_CRM_ENDPOINT) {
    console.warn('CRM Endpoint not configured. Skipping sync.');
    return { success: true, simulated: true };
  }

  try {
    const response = await fetch(CRM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_CRM_API_KEY || ''}`
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error('CRM Sync Failed');
    return await response.json();
  } catch (error) {
    console.error('CRM Sync Error:', error);
    throw error;
  }
}

export async function syncChatSummaryToCRM(data: CRMChatSummary) {
  console.log('--- Syncing Chat Summary to CRM ---', data.leadEmail);
  
  // In a real implementation, this might hit a different endpoint or update the existing lead
  if (!import.meta.env.VITE_CRM_ENDPOINT) {
    return { success: true, simulated: true };
  }

  try {
    const response = await fetch(`${CRM_ENDPOINT}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error('CRM Summary Sync Failed');
    return await response.json();
  } catch (error) {
    console.error('CRM Summary Sync Error:', error);
    throw error;
  }
}
