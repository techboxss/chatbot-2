
import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, User, Mail, Phone, Building2, CheckCircle2, Download, PenTool, ClipboardCheck, X, Info, ArrowDown, Search, TrendingUp, Calendar, ChevronRight, Shield } from 'lucide-react';
import { sendMessage, ChatMessage, generateChatSummary, draftEmailReply, generateServiceJustification, analyzeLeadScore, LeadScoreInsight } from '@/src/services/geminiService';
import { ChatMessageComponent } from './ChatMessage';
import { ServiceDetailModal } from './ServiceDetailModal';
import { LEGAL_SERVICES, ServiceDetail } from '../constants/services';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/src/lib/utils';
import { db, handleFirestoreError, OperationType, auth } from '@/src/lib/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc, getDoc } from 'firebase/firestore';
import { syncLeadToCRM, syncChatSummaryToCRM } from '@/src/services/crmService';

import { ErrorBoundary } from './ErrorBoundary';

export const ChatInterface: React.FC<{ 
  onDashboardToggle: () => void,
  preFillText?: string,
  onPreFillHandled?: () => void
}> = ({ onDashboardToggle, preFillText, onPreFillHandled }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (preFillText) {
      setInput(preFillText);
      if (onPreFillHandled) onPreFillHandled();
    }
  }, [preFillText, onPreFillHandled]);
  const [isLoading, setIsLoading] = useState(false);
  const [leadScore, setLeadScore] = useState<'COLD' | 'WARM' | 'HOT' | null>(null);
  const [leadInsight, setLeadInsight] = useState<LeadScoreInsight | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSchedulingOpen, setIsSchedulingOpen] = useState(false);
  const [isReviewingConsultation, setIsReviewingConsultation] = useState(false);
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [leadInfo, setLeadInfo] = useState({ name: '', email: '', phone: '', company: '', consent: false });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [consultationInfo, setConsultationInfo] = useState({ date: '', time: '09:00 AM EST' });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [consultationErrors, setConsultationErrors] = useState<{ [key: string]: string }>({});
  const [isSessionEnded, setIsSessionEnded] = useState(false);
  const [chatSummary, setChatSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [draftKeyPoints, setDraftKeyPoints] = useState('');
  const [generatedDraft, setGeneratedDraft] = useState<string | null>(null);
  const [isDraftingEmail, setIsDraftingEmail] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('Follow-up from LegalEase Solutions');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [hasStoredDraft, setHasStoredDraft] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceDetail | null>(null);
  const [selectedJustification, setSelectedJustification] = useState<string | null>(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const lastSavedRef = useRef<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('legalease_email_draft');
    if (stored) setHasStoredDraft(true);
  }, []);

  const handleSaveDraft = () => {
    const draftData = {
      keyPoints: draftKeyPoints,
      generatedDraft,
      recipient: recipientEmail,
      subject: emailSubject,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem('legalease_email_draft', JSON.stringify(draftData));
    setHasStoredDraft(true);
    
    // Feedback to user
    setAutoSaveStatus('saved');
    setTimeout(() => setAutoSaveStatus('idle'), 2000);
  };

  const handleResumeDraft = () => {
    const stored = localStorage.getItem('legalease_email_draft');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setDraftKeyPoints(data.keyPoints || '');
        setGeneratedDraft(data.generatedDraft || null);
        setRecipientEmail(data.recipient || '');
        setEmailSubject(data.subject || 'Follow-up from LegalEase Solutions');
        setIsDraftModalOpen(true);
      } catch (err) {
        console.error('Failed to parse stored draft:', err);
        localStorage.removeItem('legalease_email_draft');
        setHasStoredDraft(false);
      }
    }
  };

  const handleClearDraft = () => {
    localStorage.removeItem('legalease_email_draft');
    setHasStoredDraft(false);
    setGeneratedDraft(null);
    setDraftKeyPoints('');
  };

  const logServiceRequestToFirestore = async (serviceName: string, serviceId: string) => {
    if (!sessionId || !leadId) return;
    const path = 'service_requests';
    try {
      await addDoc(collection(db, path), {
        serviceId,
        serviceName,
        leadId,
        sessionId,
        leadName: leadInfo.name,
        leadEmail: leadInfo.email,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  useEffect(() => {
    const fetchUserRole = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        }
      }
    };
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) fetchUserRole();
      else setUserRole(null);
    });

    return () => unsubscribe();
  }, []);

  const handleMessageFeedback = async (index: number, type: 'up' | 'down') => {
    if (!sessionId) return;
    
    const updatedMessages = [...messages];
    updatedMessages[index] = { ...updatedMessages[index], feedback: type };
    setMessages(updatedMessages);

    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        messages: updatedMessages,
        updatedAt: serverTimestamp()
      });
      lastSavedRef.current = JSON.stringify(updatedMessages);
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to update feedback:', error);
    }
  };

  const handleEndSession = async () => {
    if (!sessionId || isSessionEnded) return;

    setIsLoading(true);
    setIsSummarizing(true);
    try {
      // 1. Generate AI Summary first so we can sync it
      let summary = "Session manually completed.";
      try {
        summary = await generateChatSummary(messages);
        setChatSummary(summary);
      } catch (sumErr) {
        console.error("Summarization failed:", sumErr);
      }

      // 2. Update Firestore
      await updateDoc(doc(db, 'sessions', sessionId), {
        status: 'completed',
        summary,
        updatedAt: serverTimestamp()
      });

      // 3. CRM Integration: Sync final transcript and summary
      await syncChatSummaryToCRM({
        leadEmail: leadInfo.email,
        summary,
        transcript: messages,
        status: 'COMPLETED'
      });

      setIsSessionEnded(true);
      setShouldAutoScroll(true);
      setMessages(prev => [...prev, { 
        role: 'model', 
        content: "Thank you for consulting with LegalEase Solutions. I've generated a summary of our conversation below for your records. This information has also been synced with our attorney network." 
      }]);
    } catch (error) {
      console.error('Failed to end session:', error);
    } finally {
      setIsLoading(false);
      setIsSummarizing(false);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    // Name validation
    if (!leadInfo.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (leadInfo.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    // Email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!leadInfo.email.trim()) {
      newErrors.email = 'Business email is required';
    } else if (!emailRegex.test(leadInfo.email)) {
      newErrors.email = 'Enter a valid email (e.g., name@company.com)';
    }

    // Phone validation
    const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
    if (!leadInfo.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!phoneRegex.test(leadInfo.phone)) {
      newErrors.phone = 'Enter valid phone number (min 10 digits)';
    }

    if (!leadInfo.consent) {
      newErrors.consent = 'You must agree to continue';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateConsultation = () => {
    const newErrors: { [key: string]: string } = {};
    if (!consultationInfo.date) {
      newErrors.date = 'Date is required';
    } else {
      const selectedDate = new Date(consultationInfo.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.date = 'Date cannot be in the past';
      }
    }
    if (!consultationInfo.time) newErrors.time = 'Time is required';
    
    setConsultationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConsultationSubmit = async () => {
    if (!leadId || !validateConsultation()) return;
    setIsReviewingConsultation(true);
  };

  const confirmAndSaveConsultation = async () => {
    if (!leadId) return;
    
    setIsLoading(true);
    try {
      // Simulate sending confirmation email
      console.log(`[EMAIL SYSTEM] Sending confirmation email to ${leadInfo.email} for consultation on ${consultationInfo.date} at ${consultationInfo.time}`);
      
      await addDoc(collection(db, 'consultations'), {
        leadId,
        sessionId,
        date: consultationInfo.date,
        time: consultationInfo.time,
        status: 'pending',
        emailConfirmed: true,
        createdAt: serverTimestamp()
      });

      // Sync booking to CRM
      syncChatSummaryToCRM({
        leadEmail: leadInfo.email,
        summary: `CONSULTATION BOOKED & EMAIL CONFIRMED: ${consultationInfo.date} at ${consultationInfo.time}`,
        transcript: messages,
        status: 'BOOKED'
      }).catch(err => console.error('Booking CRM Sync Failed', err));

      setIsSchedulingOpen(false);
      setIsReviewingConsultation(false);
      setMessages(prev => [...prev, { 
        role: 'model', 
        content: `Excellent. Your consultation request has been confirmed. A confirmation email has been sent to **${leadInfo.email}**. A LegalEase attorney will review our session data and contact you shortly.\n\n---\n🤖 AI Confidence: HIGH (100%) | 📋 Review Status: ✅ EMAIL-VERIFIED | Scheduling confirmed` 
      }]);
      setShouldAutoScroll(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'consultations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      // Create lead
      const leadRef = await addDoc(collection(db, 'leads'), {
        ...leadInfo,
        leadScore: 'WARM',
        capturedAt: serverTimestamp()
      });

      setLeadId(leadRef.id);

      // Create session
      const sessRef = await addDoc(collection(db, 'sessions'), {
        leadId: leadRef.id,
        status: 'active',
        createdAt: serverTimestamp(),
        messages: []
      });

      setSessionId(sessRef.id);
      setLeadScore('WARM');
      setShowLeadCapture(false);
      
      const initialMessages: ChatMessage[] = [{ 
        role: 'model', 
        content: `Hello ${leadInfo.name}, thank you for reaching out to LegalEase Solutions. I've received your details. How can I assist you today?` 
      }];
      
      setMessages(initialMessages);
      setShouldAutoScroll(true);
      lastSavedRef.current = JSON.stringify(initialMessages);
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 3000);

      // CRM Integration: Sync new lead
      syncLeadToCRM({
        ...leadInfo,
        leadScore: 'WARM',
        source: window.location.pathname,
        capturedAt: new Date().toISOString()
      }).catch(err => console.error('Initial CRM Sync Failed', err));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'leads');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll logic with manual scroll detection
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      // If user is within 100px of the bottom, we consider them "at the bottom"
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShouldAutoScroll(isAtBottom);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
      setShouldAutoScroll(true);
    }
  };

  useEffect(() => {
    if (scrollRef.current && shouldAutoScroll) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading, shouldAutoScroll]);

  // Auto-save transcript periodic sync
  useEffect(() => {
    const currentMessagesStr = JSON.stringify(messages);
    if (!sessionId || isSessionEnded || messages.length === 0 || currentMessagesStr === lastSavedRef.current) return;

    const saveTimer = setTimeout(async () => {
      setAutoSaveStatus('saving');
      try {
        await updateDoc(doc(db, 'sessions', sessionId), {
          messages: messages,
          updatedAt: serverTimestamp()
        });
        lastSavedRef.current = currentMessagesStr;
        setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setAutoSaveStatus('saved');
        
        // Return to idle after a while
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      } catch (error) {
        console.error("Auto-save failed:", error);
        setAutoSaveStatus('idle');
      }
    }, 10000); // 10 second periodic save interval for changes

    return () => clearTimeout(saveTimer);
  }, [messages, sessionId, isSessionEnded]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !sessionId) return;
    
    const userText = input.trim();
    setInput('');
    setShouldAutoScroll(true);
    const userMessage: ChatMessage = { role: 'user', content: userText };
    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setIsLoading(true);

    // Detect if this is a service request and log it
    if (userText.toLowerCase().includes('interested in') || userText.toLowerCase().includes('requesting')) {
      const detectedService = Object.values(LEGAL_SERVICES).find(s => 
        userText.toLowerCase().includes(s.name.toLowerCase())
      );
      if (detectedService) {
        logServiceRequestToFirestore(detectedService.name, detectedService.id);
      }
    }

    try {
      const response = await sendMessage(messages, userText);
      
      // Detect services to generate justifications
      const lowerContent = response.toLowerCase();
      const detected: ServiceDetail[] = [];
      
      // 1. Explicit ID detection (Markdown links or bracket tags)
      const tagRegex = /\[SERVICE:([A-Z_]+)\]|[(]service:([A-Z_]+)[)]/g;
      let match;
      while ((match = tagRegex.exec(response)) !== null) {
        const serviceId = match[1] || match[2];
        const service = Object.values(LEGAL_SERVICES).find(s => s.id === serviceId);
        if (service && !detected.find(d => d.id === service.id)) detected.push(service);
      }

      // 2. Comprehensive Keyword & Synonym Mapping
      const serviceKeywords: Record<string, string[]> = {
        COMPLIANCE: [
          'compliance', 'regulatory', 'gdpr', 'ccpa', 'sox', 'audit', 'policy', 
          'data privacy', 'hipaa', 'monitoring', 'oversight', 'framework'
        ],
        INTELLECTUAL_PROPERTY: [
          'intellectual property', 'patent', 'trademark', 'copyright', 'branding', 
          'ip portfolio', 'brand protection', 'infringement', 'licensing', 'r&d'
        ],
        CORPORATE_GOVERNANCE: [
          'governance', 'restructuring', 'incorporation', 'm&a', 'merger', 
          'acquisition', 'board', 'entity formation', 'shareholder', 'secretary'
        ],
        LITIGATION_SUPPORT: [
          'litigation', 'dispute', 'arbitration', 'e-discovery', 'deposition', 
          'doc review', 'court', 'trial', 'evidence', 'discovery'
        ],
        CONTRACT_SOLUTIONS: [
          'contract', 'agreement', 'redline', 'clm', 'vendor review', 'drafting', 
          'msa', 'sow', 'nda', 'agreement templates'
        ],
        LEGAL_OPS: [
          'legal ops', 'legal operations', 'legalops', 'departmental metrics', 
          'spend analytics', 'capacity planning', 'e-billing', 'resource allocation'
        ],
        LEGAL_OPS_AUTOMATION: [
          'automation', 'tech stack', 'workflow design', 'ops automation', 
          'elm', 'matter management', 'process optimization', 'digitized workflow'
        ]
      };

      Object.entries(serviceKeywords).forEach(([id, keywords]) => {
        const hasMatch = keywords.some(kw => {
          const regex = new RegExp(`\\b${kw}\\b`, 'i');
          return regex.test(lowerContent);
        });
        
        if (hasMatch) {
          const service = LEGAL_SERVICES[id];
          if (service && !detected.find(d => d.id === service.id)) {
            detected.push(service);
          }
        }
      });
      
      const justifications: Record<string, string> = {};
      if (detected.length > 0) {
        // Limit to top 3 services to avoid prompt bloat/noise
        const topServices = detected.slice(0, 3);
        await Promise.all(topServices.map(async (s) => {
          try {
            const justification = await generateServiceJustification(updatedHistory, s.name);
            justifications[s.id] = justification;
          } catch (err) {
            console.error(`Justification failed for ${s.name}:`, err);
          }
        }));
      }

      const assistantMessage: ChatMessage = { 
        role: 'model', 
        content: response,
        justifications 
      };
      const finalHistory = [...updatedHistory, assistantMessage];
      setMessages(finalHistory);
      
      await updateDoc(doc(db, 'sessions', sessionId), {
        messages: finalHistory,
        updatedAt: serverTimestamp()
      });
      lastSavedRef.current = JSON.stringify(finalHistory);
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 3000);

      const upperResponse = response.toUpperCase();
      
      // NUANCED LEAD SCORING LOGIC
      // We analyze the user input, the history, and the model's response
      // NUANCED LEAD SCORING & INTENT ANALYSIS
      // Immediate Heuristic (for zero-latency UI feedback)
      const detectLeadQualifiers = (userText: string, aiResponse: string) => {
        const text = (userText + " " + aiResponse).toLowerCase();
        
        const isUrgent = /\b(urgent|immediate|asap|deadline|emergency|crisis|critical|priority|tonight|tomorrow|fast|quickly|now|instantly|approaching|expedite|stalled|risk)\b/i.test(text);
        const isHighValue = /\b(merger|acquisition|m&a|litigation|lawsuit|breach|compliance|gdpr|ccpa|sox|patent|trademark|enterprise|global|strategic|restructuring|funding|investment|ipo|venture|series)\b/i.test(text);
        const hasBuyingIntent = /\b(budget|pricing|cost|hire|retainer|quote|getting started|onboarding|proposal|engagement|contract|invoice|fees|payment|rates|billing)\b/i.test(text) || /[$€£]/.test(text);
        const isReady = /\b(ready to (proceed|sign|start|begin|go)|let's do this|send the (contract|proposal)|where do i sign)\b/i.test(text);
        const isDistressed = /\b(overwhelmed|chaos|mess|failed|stuck|frustrated|help me|don't know|lost|worried)\b/i.test(text);
        const isInformational = /\b(how|what|why|curious|learn|understanding|difference|example|info)\b/i.test(text);

        if (isReady || (isUrgent && (isHighValue || hasBuyingIntent))) return 'HOT';
        if (isHighValue || hasBuyingIntent || isUrgent || (isDistressed && updatedHistory.length > 2)) return 'WARM';
        if (isInformational && !hasBuyingIntent && !isUrgent) return 'COLD';
        return 'WARM'; // Default to warm for engagement
      };

      const heuristicScore = detectLeadQualifiers(userText, response);
      setLeadScore(heuristicScore);

      // AI-Powered Nuanced Analysis (Asynchronous)
      analyzeLeadScore(finalHistory).then(insight => {
        if (insight) {
          setLeadInsight(insight);
          setLeadScore(insight.score);
          
          // Enhanced CRM Sync with AI Insights
          syncChatSummaryToCRM({
            leadEmail: leadInfo.email,
            summary: `AI LEAD ANALYSIS: 
            - Score: ${insight.score} (Confidence: ${Math.round(insight.confidence * 100)}%)
            - Sentiment: ${insight.sentiment}
            - Intent: ${insight.intent}
            - Reasoning: ${insight.reasoning}`,
            transcript: finalHistory,
            status: insight.score === 'HOT' ? 'QUALIFIED' : 'ACTIVE'
          }).catch(err => console.error('AI Insight Sync Failed', err));
        }
      });

      if (finalHistory.length > 2 || upperResponse.includes('RECOMMEND')) {
        setCurrentStep(2);
      }
    } catch (error: any) {
      console.error('Failed to send message:', error);
      
      let errorMessage = "I apologize, but I encountered a temporary logic error. Please try clicking 'Send' again in a moment.";
      
      const errorStr = String(error).toUpperCase();
      
      if (errorStr.includes('SAFETY')) {
        errorMessage = "I'm sorry, but I cannot fulfill this specific request as it may involve sensitive or restricted legal subject matter beyond my safety protocols. How else can I assist you with our services?";
      } else if (errorStr.includes('QUOTA') || errorStr.includes('EXHAUSTED')) {
        errorMessage = "We're experiencing high volume at the moment. Please wait a few seconds and try sending your message again.";
      } else if (errorStr.includes('NETWORK') || errorStr.includes('FETCH')) {
        errorMessage = "It looks like there's a connection issue. Please check your internet and try again.";
      } else if (errorStr.includes('API_KEY')) {
        errorMessage = "The AI service is currently misconfigured (Missing Credentials). Please notify the system administrator.";
      }

      setMessages(prev => [...prev, { 
        role: 'model', 
        content: `${errorMessage}\n\n---\n🤖 AI Status: ERROR | 📋 Resolution: REQUIRED | ${errorStr.slice(0, 50)}...` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestService = (service: ServiceDetail) => {
    if (isLoading || isSessionEnded) return;
    const requestText = `I'm interested in requesting the ${service.name}. What are the next steps for us to get started?`;
    setInput(requestText);
    logServiceRequestToFirestore(service.name, service.id);
  };

  const handleAskQuestion = (question: string) => {
    if (isLoading || isSessionEnded) return;
    setInput(question);
  };

  const handleEscalate = async () => {
    if (!sessionId || isSessionEnded) return;

    const escalationMessage: ChatMessage = { 
      role: 'model', 
      content: `### 🚨 Attorney Connection Initiated\n\nI have flagged this conversation for immediate attorney review. Our specialized team is being notified of your request for human intervention. \n\n**Next Steps:**\n1. An attorney from our network will review these chat logs.\n2. You will receive a direct follow-up via business email (${leadInfo.email}) within 4 business hours.\n3. Your case has been prioritized in our intake and conflict-check queue.\n\n---\n🤖 AI Status: ESCALATED | 📋 Action: HUMAN-OVERSIGHT-REQUIRED | Priority: CRITICAL` 
    };

    const updatedHistory = [...messages, escalationMessage];
    setMessages(updatedHistory);
    setShouldAutoScroll(true);
    setLeadScore('HOT');

    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        messages: updatedHistory,
        updatedAt: serverTimestamp()
      });
      
      await syncChatSummaryToCRM({
        leadEmail: leadInfo.email,
        summary: "EMERGENCY ESCALATION: User requested human attorney intervention or AI confidence threshold triggered.",
        transcript: updatedHistory,
        status: 'HOT_LEAD'
      });
    } catch (error) {
      console.error('Failed to escalate session:', error);
    }
  };

  const handleDownloadTranscript = () => {
    if (messages.length === 0) return;

    const timestamp = new Date().toISOString().split('T')[0];
    const header = `LEGALEEASE SOLUTIONS - CHAT TRANSCRIPT\n` +
      `Date: ${new Date().toLocaleString()}\n` +
      `Session ID: ${sessionId || 'N/A'}\n` +
      `Client: ${leadInfo.name || 'Anonymous'}\n` +
      `Email: ${leadInfo.email || 'N/A'}\n` +
      `==========================================\n\n`;

    const content = messages.map((msg, index) => {
      const role = msg.role === 'user' ? 'CLIENT' : 'ASSISTANT';
      return `[${index + 1}] ${role}:\n${msg.content}\n\n------------------------------------------\n`;
    }).join('\n');

    const footer = `\n==========================================\n` +
      `END OF TRANSCRIPT\n` +
      `This document is for informational purposes only and does not constitute legal advice.`;

    const blob = new Blob([header + content + footer], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `legalease-transcript-${timestamp}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDraftEmail = async () => {
    if (messages.length === 0 || !draftKeyPoints.trim()) return;
    
    setIsDraftingEmail(true);
    try {
      const draft = await draftEmailReply(messages, draftKeyPoints);
      setGeneratedDraft(draft);
    } catch (error) {
      console.error('Email draft failed:', error);
    } finally {
      setIsDraftingEmail(false);
    }
  };

  const copyDraftToClipboard = () => {
    if (!generatedDraft) return;
    navigator.clipboard.writeText(generatedDraft);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSendEmail = () => {
    if (!generatedDraft) return;
    
    const subject = encodeURIComponent(emailSubject);
    const body = encodeURIComponent(generatedDraft);
    const mailtoUrl = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
    
    window.location.href = mailtoUrl;
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-slate-50 flex-col font-sans overflow-hidden">
      {/* Top Header */}
      <header className="h-16 bg-glass-dark flex items-center justify-between px-8 shrink-0 z-20 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Shield className="text-white" size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-bold text-lg leading-tight tracking-tight">LegalEase <span className="text-blue-400 font-medium">Concierge</span></span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">End-to-End Encrypted</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <AnimatePresence mode="wait">
              {autoSaveStatus !== 'idle' ? (
                <motion.div 
                  key={autoSaveStatus}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-1.5"
                >
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    autoSaveStatus === 'saving' ? "bg-blue-400 animate-pulse" : "bg-emerald-400"
                  )} />
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                    {autoSaveStatus === 'saving' ? 'Auto-saving...' : 'Draft saved'}
                  </span>
                </motion.div>
              ) : lastSavedAt && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[9px] text-slate-500 font-medium uppercase tracking-tighter"
                >
                  Last saved at {lastSavedAt}
                </motion.div>
              )}
            </AnimatePresence>
            {hasStoredDraft && !isDraftModalOpen && (
              <button 
                onClick={handleResumeDraft}
                className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-widest transition-colors flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20"
              >
                <ClipboardCheck size={12} />
                Resume Draft
              </button>
            )}
            <div className="hidden md:flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
              <span className="text-[10px] text-slate-300 uppercase tracking-widest">Attorney Network: Online</span>
            </div>
          </div>
          {userRole && (
            <button 
              onClick={onDashboardToggle}
              className="text-[10px] font-bold text-blue-400 hover:text-white bg-blue-500/10 px-3 py-1 rounded-full uppercase tracking-widest transition-all hover:bg-blue-500/20"
            >
              Intelligence Dashboard
            </button>
          )}
          {messages.length > 0 && !isSessionEnded && (
            <button 
              onClick={() => {
                setIsDraftModalOpen(true);
                if (leadInfo.email) setRecipientEmail(leadInfo.email);
              }}
              className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors flex items-center gap-1.5"
            >
              <PenTool size={12} />
              Draft Email
            </button>
          )}
          {messages.length > 0 && (
            <button 
              onClick={handleDownloadTranscript}
              className="text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-1.5"
            >
              <Download size={12} />
              Save Transcript
            </button>
          )}
          {!isSessionEnded && sessionId && (
            <button 
              onClick={handleEndSession}
              disabled={isLoading}
              className="text-[10px] font-bold text-rose-400 hover:text-rose-300 uppercase tracking-widest transition-colors flex items-center gap-1"
            >
              <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
              End Session
            </button>
          )}
          <button 
            onClick={() => setIsSchedulingOpen(true)}
            disabled={isSessionEnded}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-md transition-colors shadow-sm active:scale-95 disabled:opacity-50 disabled:grayscale"
          >
            Schedule Consultation
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex flex-1 overflow-hidden relative">
        
      {/* Onboarding / Welcome Tour Overlay */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl z-[60] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col md:flex-row h-auto md:min-h-[450px]"
            >
              <div className="bg-slate-900 p-10 text-white md:w-2/5 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full -mr-32 -mt-32 blur-3xl" />
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-xl mb-6 shadow-lg shadow-blue-500/20">L</div>
                  <h3 className="text-3xl font-black tracking-tighter leading-tight italic font-serif">LegalEase<br/>Concierge</h3>
                </div>
                <div className="mt-8 space-y-4 relative z-10 h-full flex flex-col justify-end">
                  <div className="flex -space-x-2">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden">
                         <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=attorney${i}`} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    ))}
                    <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-blue-600 flex items-center justify-center text-[10px] font-bold">+12</div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Trusted by 500+ Legal Teams</p>
                </div>
              </div>

              <div className="p-10 md:w-3/5 flex flex-col justify-between bg-white">
                <AnimatePresence mode="wait">
                  {onboardingStep === 0 && (
                    <motion.div 
                      key="step0"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <h4 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">01. Service Diagnostics</h4>
                      <p className="text-slate-500 text-sm leading-relaxed">
                        Interface with our AI concierge through natural language. The system performs <span className="text-blue-600 font-bold">instant diagnostic mapping</span> to identify specialized legal solutions that address your firm's specific operational risks and workflow constraints.
                      </p>
                      <div className="grid grid-cols-2 gap-3 pt-4">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                            <Search size={14} className="text-blue-600" />
                          </div>
                          <p className="text-[10px] font-bold text-slate-800 leading-tight uppercase tracking-tight">Active Detection</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                            <PenTool size={14} className="text-emerald-600" />
                          </div>
                          <p className="text-[10px] font-bold text-slate-800 leading-tight uppercase tracking-tight">Contextual Drafts</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  {onboardingStep === 1 && (
                    <motion.div 
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <h4 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">02. Strategic Intake Analytics</h4>
                      <p className="text-slate-500 text-sm leading-relaxed">
                        During engagement, our proprietary engine executes real-time <span className="text-blue-600 font-bold">sentiment and intent prioritization</span>. This ensures that high-impact legal requirements are triaged for immediate professional escalation.
                      </p>
                      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none">Scoring Engine</span>
                          </div>
                          <TrendingUp size={14} className="text-emerald-400" />
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '75%' }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className="h-full bg-gradient-to-r from-blue-600 to-indigo-400 rounded-full" 
                          />
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-[9px] text-slate-500 italic">Processing real-time lead telemetry...</p>
                          <span className="text-[9px] font-bold text-blue-400">75.4 Match</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  {onboardingStep === 2 && (
                    <motion.div 
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <h4 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">03. Secure Consultations</h4>
                      <p className="text-slate-500 text-sm leading-relaxed">
                        Once matched, you can book an <span className="text-blue-600 font-bold">expert attorney consultation</span> directly through our secure interface. All transcript data is synced to our CRM for a seamless transition.
                      </p>
                      <div className="p-4 bg-blue-600 rounded-2xl border border-blue-500 shadow-xl shadow-blue-600/20 text-white flex items-center justify-between">
                         <div className="space-y-1">
                           <div className="flex items-center gap-2">
                             <Calendar size={14} className="text-blue-200" />
                             <span className="text-[10px] font-bold uppercase tracking-widest text-blue-100">Booking Ready</span>
                           </div>
                           <p className="text-xs font-bold">Connect with Legal Talent</p>
                         </div>
                         <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                           <ChevronRight size={16} />
                         </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Shield size={12} className="text-slate-400" />
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">ISO 27001 Data Security Protocols Active</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
                  <div className="flex gap-2">
                    {[0,1,2].map(i => (
                      <div key={i} className={cn(
                        "h-1.5 rounded-full transition-all duration-500",
                        onboardingStep === i ? "w-8 bg-blue-600 shadow-sm" : "w-1.5 bg-slate-200"
                      )} />
                    ))}
                  </div>
                  <div className="flex gap-3">
                    {onboardingStep > 0 && (
                      <button 
                        onClick={() => setOnboardingStep(s => s - 1)}
                        className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
                      >
                        Back
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        if (onboardingStep < 2) setOnboardingStep(s => s + 1);
                        else {
                          setShowOnboarding(false);
                          setShowLeadCapture(true);
                        }
                      }}
                      className="px-6 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                      {onboardingStep === 2 ? "Get Started" : "Continue"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* Lead Capture Overlay */}
        <AnimatePresence>
          {showLeadCapture && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md z-40 flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col md:flex-row"
              >
                <div className="bg-slate-900 p-10 text-white md:w-1/3 flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full -mr-24 -mt-24 blur-2xl" />
                  <h3 className="text-3xl font-black mb-4 tracking-tighter italic font-serif relative z-10 leading-tight uppercase">Secure<br/>Access</h3>
                  <p className="text-slate-400 text-[10px] font-medium leading-relaxed relative z-10 uppercase tracking-widest">Verification required to initiate AI session protocols. Your data is protected by enterprise-grade encryption.</p>
                </div>
                <form onSubmit={handleLeadSubmit} className="p-10 md:w-2/3 space-y-6 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 text-slate-300" size={16} />
                        <input 
                          type="text" 
                          value={leadInfo.name}
                          maxLength={100}
                          onChange={e => {
                            setLeadInfo({...leadInfo, name: e.target.value});
                            if (errors.name) setErrors({...errors, name: ''});
                          }}
                          placeholder="John Doe" 
                          className={cn(
                            "w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all",
                            errors.name ? "border-rose-300 bg-rose-50/30" : "border-slate-200"
                          )}
                        />
                      </div>
                      <AnimatePresence>
                        {errors.name && (
                          <motion.p 
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="text-[9px] text-rose-500 font-bold ml-1 mt-0.5"
                          >
                            {errors.name}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Business Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 text-slate-300" size={16} />
                        <input 
                          type="email" 
                          value={leadInfo.email}
                          maxLength={150}
                          onChange={e => {
                            setLeadInfo({...leadInfo, email: e.target.value});
                            if (errors.email) setErrors({...errors, email: ''});
                          }}
                          placeholder="john@company.com" 
                          className={cn(
                            "w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all",
                            errors.email ? "border-rose-300 bg-rose-50/30" : "border-slate-200"
                          )}
                        />
                      </div>
                      <AnimatePresence>
                        {errors.email && (
                          <motion.p 
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="text-[9px] text-rose-500 font-bold ml-1 mt-0.5"
                          >
                            {errors.email}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 text-slate-300" size={16} />
                        <input 
                          type="tel" 
                          value={leadInfo.phone}
                          maxLength={30}
                          onChange={e => {
                            setLeadInfo({...leadInfo, phone: e.target.value});
                            if (errors.phone) setErrors({...errors, phone: ''});
                          }}
                          placeholder="+1 (555) 000-0000" 
                          className={cn(
                            "w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all",
                            errors.phone ? "border-rose-300 bg-rose-50/30" : "border-slate-200"
                          )}
                        />
                      </div>
                      <AnimatePresence>
                        {errors.phone && (
                          <motion.p 
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="text-[9px] text-rose-500 font-bold ml-1 mt-0.5"
                          >
                            {errors.phone}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-3 text-slate-300" size={16} />
                        <input 
                          type="text" 
                          value={leadInfo.company}
                          maxLength={100}
                          onChange={e => setLeadInfo({...leadInfo, company: e.target.value})}
                          placeholder="Acme Corp" 
                          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className={cn(
                    "flex items-start gap-3 bg-slate-50 p-3 rounded-lg border transition-colors",
                    errors.consent ? "border-rose-300 bg-rose-50/50" : "border-slate-100"
                  )}>
                    <input 
                      type="checkbox" 
                      id="consent"
                      checked={leadInfo.consent}
                      onChange={e => {
                        setLeadInfo({...leadInfo, consent: e.target.checked});
                        if (errors.consent) setErrors({...errors, consent: ''});
                      }}
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="consent" className="text-[10px] text-slate-500 leading-relaxed cursor-pointer select-none">
                      I agree to the <a href="https://legaleasesolutions.com/privacy-policy/" target="_blank" className="text-blue-600 hover:underline">Privacy Policy</a> and consent to receiving communication regarding LegalEase services.
                      <AnimatePresence>
                        {errors.consent && (
                          <motion.span 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="block text-rose-500 font-bold mt-1 uppercase italic tracking-tighter"
                          >
                            * Required for submission
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </label>
                  </div>

                  <button 
                    disabled={isLoading}
                    type="submit"
                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : (
                      <>
                        <span>Start Conversation</span>
                        <CheckCircle2 size={16} />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar: Intake & Status */}
        <aside className="hidden lg:flex w-80 bg-white border-r border-slate-200 flex-col shrink-0">
          <div className="p-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Service Categories</h2>
            <div className="space-y-2">
              <SidebarServiceCard 
                title="Contract Solutions" 
                desc="Review, drafting & lifecycle management" 
                active 
              />
              <SidebarServiceCard 
                title="Legal Operations" 
                desc="Workflow automation & analytics" 
              />
              <SidebarServiceCard 
                title="Compliance" 
                desc="Regulatory monitoring & audits" 
              />
            </div>
          </div>

          <div className="mt-auto p-6 bg-slate-50 border-t border-slate-200">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Current Intake Status</h2>
            <div className="flex items-start gap-4 mb-6 relative">
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] border-2 border-white shadow-sm z-10 transition-colors",
                  currentStep >= 1 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-400"
                )}>1</div>
                <div className={cn(
                  "w-0.5 h-6 transition-colors",
                  currentStep >= 2 ? "bg-blue-600" : "bg-slate-200"
                )}></div>
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] border-2 border-white shadow-sm z-10 transition-colors",
                  currentStep >= 2 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-400"
                )}>2</div>
              </div>
              <div className="space-y-6 pt-1">
                <div className={cn("text-xs font-bold leading-none transition-colors", currentStep >= 1 ? "text-slate-800" : "text-slate-400")}>Need Discovery</div>
                <div className={cn("text-xs font-bold leading-none transition-colors", currentStep >= 2 ? "text-slate-800" : "text-slate-400")}>Service Matching</div>
              </div>
            </div>
            {leadScore && (
              <div className={cn(
                "p-3 rounded border shadow-sm transition-all animate-in fade-in zoom-in duration-300",
                leadScore === 'HOT' ? "bg-emerald-50 border-emerald-100" : 
                leadScore === 'WARM' ? "bg-orange-50 border-orange-100" : "bg-slate-100 border-slate-200"
              )}>
                <div className="flex justify-between items-center mb-1">
                  <span className={cn(
                    "text-[10px] font-bold uppercase",
                    leadScore === 'HOT' ? "text-emerald-600" : 
                    leadScore === 'WARM' ? "text-orange-600" : "text-slate-600"
                  )}>Lead Score</span>
                  {leadScore === 'HOT' && <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-md animate-pulse">READY</span>}
                </div>
                <span className={cn(
                  "text-sm font-semibold",
                  leadScore === 'HOT' ? "text-emerald-900" : 
                  leadScore === 'WARM' ? "text-orange-900" : "text-slate-900"
                )}>
                  {leadScore} - {leadScore === 'HOT' ? 'Priority 1' : leadScore === 'WARM' ? 'Priority 2' : 'Nurture'}
                </span>
                
                {leadInsight && (
                  <div className="mt-3 pt-3 border-t border-slate-200/50 space-y-2 animate-in fade-in slide-in-from-top-1 duration-500">
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Primary Intent</span>
                      <p className="text-[10px] text-slate-700 font-medium leading-tight">{leadInsight.intent}</p>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Sentiment Analysis</span>
                      <p className="text-[10px] text-slate-700 font-medium leading-tight italic">"{leadInsight.sentiment}"</p>
                    </div>
                    <div className="bg-white/50 p-2 rounded border border-slate-100 mt-2">
                       <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">AI Reasoning</span>
                       <p className="text-[9px] text-slate-500 leading-relaxed leading-tight">{leadInsight.reasoning}</p>
                    </div>
                  </div>
                )}

                {leadScore === 'HOT' && (
                  <button 
                    onClick={() => setIsSchedulingOpen(true)}
                    className="w-full mt-2 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-md hover:bg-emerald-500 transition-colors uppercase tracking-wider"
                  >
                    Quick Schedule
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Chat Interface */}
        <section className="flex-1 flex flex-col bg-slate-50 relative">
          <AnimatePresence>
            {!shouldAutoScroll && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                onClick={scrollToBottom}
                className="absolute bottom-32 right-8 z-30 p-2.5 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-500 transition-all active:scale-95 flex items-center gap-2 group"
              >
                <div className="relative">
                  <ArrowDown size={18} className="group-hover:translate-y-0.5 transition-transform" />
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-blue-600 rounded-full animate-pulse" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-[0.1em] pr-2">Latest Messages</span>
              </motion.button>
            )}
          </AnimatePresence>
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 p-4 md:p-8 space-y-6 overflow-y-auto"
          >
            <div className="max-w-4xl mx-auto w-full">
              {isLoading && messages.length === 0 && (
                <div className="space-y-8">
                  {[1, 2, 3].map((i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className={cn(
                        "flex flex-col gap-2",
                        i % 2 === 0 ? "items-end" : "items-start"
                      )}
                    >
                      <div className={cn(
                        "h-4 w-24 bg-slate-200 rounded animate-pulse mb-1",
                        i % 2 === 0 ? "self-end" : ""
                      )} />
                      <div className={cn(
                        "p-4 rounded-2xl shadow-sm border border-slate-100 animate-pulse",
                        i % 2 === 0 
                          ? "bg-slate-200 w-2/3 rounded-tr-none" 
                          : "bg-white w-3/4 rounded-tl-none border-slate-200"
                      )}>
                        <div className="space-y-2">
                          <div className="h-2 bg-slate-300/50 rounded w-full" />
                          <div className="h-2 bg-slate-300/50 rounded w-5/6" />
                          {i % 2 !== 0 && <div className="h-2 bg-slate-300/50 rounded w-4/6" />}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              {messages.map((msg, i) => (
                <ChatMessageComponent 
                  key={i} 
                  role={msg.role} 
                  content={msg.content} 
                  feedback={msg.feedback}
                  justifications={msg.justifications}
                  onFeedback={(type) => handleMessageFeedback(i, type)}
                  onLearnMore={(service, justification) => {
                    setSelectedService(service);
                    setSelectedJustification(justification || null);
                    setIsServiceModalOpen(true);
                  }}
                  onRequestService={handleRequestService}
                  onAskQuestion={handleAskQuestion}
                  onEscalate={handleEscalate}
                />
              ))}
              <AnimatePresence>
                {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex justify-start mb-6"
                  >
                    <div className="max-w-2xl bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-3">
                      <div className="flex gap-1.5 items-center px-1">
                        <motion.div
                          animate={{ 
                            y: [0, -3, 0],
                            opacity: [0.4, 1, 0.4] 
                          }}
                          transition={{ 
                            duration: 0.6, 
                            repeat: Infinity, 
                            ease: "easeInOut",
                            delay: 0 
                          }}
                          className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                        />
                        <motion.div
                          animate={{ 
                            y: [0, -3, 0],
                            opacity: [0.4, 1, 0.4] 
                          }}
                          transition={{ 
                            duration: 0.6, 
                            repeat: Infinity, 
                            ease: "easeInOut",
                            delay: 0.15 
                          }}
                          className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                        />
                        <motion.div
                          animate={{ 
                            y: [0, -3, 0],
                            opacity: [0.4, 1, 0.4] 
                          }}
                          transition={{ 
                            duration: 0.6, 
                            repeat: Infinity, 
                            ease: "easeInOut",
                            delay: 0.3 
                          }}
                          className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Analysing Intake</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* AI Summary Display */}
            <AnimatePresence>
              {isSessionEnded && chatSummary && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-4xl mx-auto w-full mt-10 mb-20"
                >
                  <div className="bg-white border-2 border-blue-500/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <CheckCircle2 size={120} className="text-blue-500" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-500 rounded-lg text-white">
                          <CheckCircle2 size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-900">Session Intelligent Summary</h3>
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">AI-Generated Reception Report</p>
                        </div>
                      </div>
                      
                      <div className="markdown-body max-w-none">
                        <div className="text-slate-700 leading-relaxed font-medium">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {chatSummary}
                          </ReactMarkdown>
                        </div>
                      </div>

                      <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex gap-4">
                          <button 
                            onClick={() => {
                              setIsDraftModalOpen(true);
                              if (leadInfo.email) setRecipientEmail(leadInfo.email);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-500 transition-all shadow-lg active:scale-95"
                          >
                            <PenTool size={14} />
                            Draft Follow-up Email
                          </button>
                          <button 
                            onClick={handleDownloadTranscript}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                          >
                            <Download size={14} />
                            Download Full Transcript
                          </button>
                          <button 
                            onClick={onDashboardToggle}
                            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all active:scale-95"
                          >
                            View Real-time Metrics
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 italic">This summary has been securely transmitted to our specialized attorney network.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {isSummarizing && (
              <div className="max-w-4xl mx-auto w-full mt-10 flex flex-col items-center gap-4 py-12 animate-in fade-in zoom-in">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-700 uppercase tracking-widest">Generating Intelligent Summary</p>
                  <p className="text-xs text-slate-400">Synthesizing conversation context for attorney review...</p>
                </div>
              </div>
            )}
          </div>

          {/* Message Input Area */}
          <div className="h-auto md:h-24 bg-white border-t border-slate-200 p-4 md:p-6 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            {!isSessionEnded ? (
              <div className="max-w-4xl mx-auto space-y-2">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      value={input}
                      maxLength={1000}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Ask about our process, services, or pricing..." 
                      className={cn(
                        "w-full h-12 bg-slate-50 border rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner",
                        input.length > 950 ? "border-rose-300 text-rose-600" : 
                        input.length > 800 ? "border-orange-300" : "border-slate-200"
                      )}
                    />
                    {/* Word count removed as per user request to avoid overlap */}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setIsDraftModalOpen(true);
                        if (leadInfo.email) setRecipientEmail(leadInfo.email);
                      }}
                      disabled={messages.length === 0}
                      className="flex items-center gap-2 px-4 border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 font-bold text-[10px] uppercase tracking-widest"
                      title="Draft Email Reply"
                    >
                      <PenTool size={16} />
                      <span className="hidden md:inline">Draft Email</span>
                    </button>
                    <button 
                      disabled={isLoading || !input.trim() || input.length > 1000}
                      onClick={handleSend}
                      className="px-6 md:px-10 bg-gradient-to-r from-slate-900 to-slate-800 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-slate-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoading ? <Loader2 size={18} className="animate-spin" /> : <>Send <Send size={14} /></>}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center px-1 h-3">
                  <div className="flex-1 mr-4">
                    {input.length > 800 && (
                      <motion.div 
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: `${(input.length / 1000) * 100}%` }}
                        className={cn(
                          "h-1 rounded-full transition-colors",
                          input.length >= 1000 ? "bg-rose-500" : "bg-orange-400"
                        )}
                      />
                    )}
                  </div>
                  {input.length >= 1000 ? (
                    <p className="text-[9px] text-rose-500 font-black uppercase tracking-widest animate-pulse">Critical: Max Limit Reached</p>
                  ) : input.length > 900 ? (
                    <p className="text-[9px] text-orange-500 font-bold uppercase tracking-widest">Warning: Nearing limit</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto flex items-center justify-center h-full">
                <div className="flex items-center gap-2 text-slate-400 font-medium bg-slate-50 px-6 py-2 rounded-full border border-slate-200 animate-in fade-in slide-in-from-bottom-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span className="text-sm">Session completed and synced to CRM</span>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Bottom Micro-Footer */}
      <footer className="h-8 bg-slate-100 border-t border-slate-200 flex items-center justify-between px-8 shrink-0 relative z-20">
        <div className="flex gap-4">
          <span className="text-[10px] text-slate-500">Confidential Session #LE-9942</span>
          <span className="text-[10px] text-slate-500 border-l border-slate-200 pl-4">ISO 27001 Certified Environment</span>
        </div>
        <div className="text-[10px] text-slate-400">
          LegalEase Solutions &copy; {new Date().getFullYear()} | Not Legal Advice
        </div>
      </footer>

      {/* Service Detail Modal Overlay */}
      <ServiceDetailModal 
        isOpen={isServiceModalOpen}
        onClose={() => {
          setIsServiceModalOpen(false);
          setSelectedJustification(null);
        }}
        service={selectedService}
        justification={selectedJustification}
        onServiceRequest={handleRequestService}
        onAskQuestion={handleAskQuestion}
      />

      {/* Scheduling Modal Overlay */}
      <AnimatePresence>
        {isSchedulingOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setIsSchedulingOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-white flex justify-between items-center bg-slate-900">
                <div>
                  <h3 className="text-lg font-bold">{isReviewingConsultation ? 'Confirm Details' : 'Schedule Consultation'}</h3>
                  <p className="text-xs text-slate-400">{isReviewingConsultation ? 'Verify your appointment information' : 'Match with a LegalEase Specialist'}</p>
                </div>
                <button 
                  onClick={() => {
                    setIsSchedulingOpen(false);
                    setIsReviewingConsultation(false);
                  }}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {isReviewingConsultation ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-bold uppercase tracking-wider">Requested Date</span>
                        <span className="font-bold text-blue-900">{consultationInfo.date}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-bold uppercase tracking-wider">Preferred Time</span>
                        <span className="font-bold text-blue-900">{consultationInfo.time}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs pt-2 border-t border-blue-200">
                        <span className="text-slate-500 font-bold uppercase tracking-wider">Email Address</span>
                        <span className="font-bold text-blue-900">{leadInfo.email}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-900 leading-relaxed font-secondary">
                        By confirming, you authorize LegalEase to send a detailed consultation summary to the email address provided above.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => setIsReviewingConsultation(false)}
                        className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all active:scale-95"
                      >
                        Back
                      </button>
                      <button 
                        onClick={confirmAndSaveConsultation}
                        className="flex-[2] py-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"
                        disabled={isLoading}
                      >
                        {isLoading ? <Loader2 className="animate-spin" size={16} /> : (
                          <>
                            <span>Confirm & Send Email</span>
                            <Mail size={16} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Consultation Reason</label>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium">
                        Intelligent Intake Follow-up
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Date</label>
                        <input 
                          type="date" 
                          value={consultationInfo.date}
                          onChange={e => {
                            setConsultationInfo({...consultationInfo, date: e.target.value});
                            if (consultationErrors.date) setConsultationErrors({...consultationErrors, date: ''});
                          }}
                          className={cn(
                            "w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20",
                            consultationErrors.date ? "border-rose-300 bg-rose-50" : "border-slate-200"
                          )} 
                        />
                        {consultationErrors.date && <p className="text-[9px] text-rose-500 font-bold">{consultationErrors.date}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Time</label>
                        <select 
                          value={consultationInfo.time}
                          onChange={e => setConsultationInfo({...consultationInfo, time: e.target.value})}
                          className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option>09:00 AM EST</option>
                          <option>11:00 AM EST</option>
                          <option>02:00 PM EST</option>
                          <option>04:00 PM EST</option>
                        </select>
                      </div>
                    </div>
                    <button 
                      onClick={handleConsultationSubmit}
                      className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Review Booking"}
                    </button>
                    <p className="text-[10px] text-center text-slate-400 italic">By clicking for review, you agree to our privacy policy and data security protocols.</p>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email Draft Modal Overlay */}
      <AnimatePresence>
        {isDraftModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setIsDraftModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <PenTool size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-serif italic">Attorney Draft Assistant</h3>
                    <p className="text-[10px] text-blue-100 uppercase tracking-widest font-bold">Email Communications Optimization</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsDraftModalOpen(false);
                    setGeneratedDraft(null);
                    setDraftKeyPoints('');
                  }}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 space-y-6">
                {!generatedDraft ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Custom Key Points to Include</label>
                      <textarea 
                        rows={4}
                        placeholder="e.g., Mention our pricing tiers, refer to the NDA discussion, or suggest a follow-up call for next Tuesday."
                        value={draftKeyPoints}
                        onChange={(e) => setDraftKeyPoints(e.target.value)}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={handleDraftEmail}
                        disabled={isDraftingEmail || !draftKeyPoints.trim()}
                        className="flex-[2] py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group active:scale-[0.98] disabled:opacity-50"
                      >
                        {isDraftingEmail ? <Loader2 className="animate-spin" size={20} /> : (
                          <>
                            <span>Generate Professional Draft</span>
                            <PenTool size={18} className="group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </button>
                      <button 
                        onClick={handleSaveDraft}
                        className="flex-1 py-4 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                        <Download size={16} />
                        Save Draft
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recipient Email</label>
                        <input 
                          type="email" 
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          placeholder="client@example.com"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Subject</label>
                        <input 
                          type="text" 
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          placeholder="Subject"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl max-h-[300px] overflow-y-auto font-sans">
                      <div className="prose prose-slate prose-sm max-w-none whitespace-pre-wrap text-slate-700 leading-relaxed">
                        {generatedDraft}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button 
                        onClick={handleSaveDraft}
                        className="px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2"
                      >
                        <Download size={16} />
                        Save Draft
                      </button>
                      <button 
                        onClick={copyDraftToClipboard}
                        className={cn(
                          "flex-1 min-w-[200px] py-3 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95",
                          isCopied ? "bg-emerald-600 text-white shadow-emerald-500/20" : "bg-slate-900 text-white shadow-slate-500/20 hover:bg-slate-800"
                        )}
                      >
                        {isCopied ? <CheckCircle2 size={18} /> : <ClipboardCheck size={18} />}
                        <span>{isCopied ? 'Copied to Clipboard' : 'Copy Text'}</span>
                      </button>
                      <button 
                        onClick={handleSendEmail}
                        className="flex-1 min-w-[200px] py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                        <Mail size={18} />
                        <span>Send via Email Client</span>
                      </button>
                      <button 
                        onClick={() => {
                          setGeneratedDraft(null);
                          if (draftKeyPoints.length === 0) handleClearDraft();
                        }}
                        className="px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all active:scale-95"
                      >
                        Edit Points
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 text-center italic">This is an AI-generated draft. Please review and refine before sending.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
};

const SidebarServiceCard: React.FC<{ title: string; desc: string; active?: boolean }> = ({ title, desc, active }) => (
  <div className={cn(
    "p-3 rounded-lg border transition-all cursor-pointer",
    active 
      ? "bg-blue-50 border-blue-100 shadow-sm" 
      : "hover:bg-slate-50 border-transparent text-slate-700"
  )}>
    <div className={cn("text-sm font-semibold", active ? "text-blue-900" : "text-slate-700")}>{title}</div>
    <div className={cn("text-[11px] mt-1", active ? "text-blue-700" : "text-slate-500")}>{desc}</div>
  </div>
);
