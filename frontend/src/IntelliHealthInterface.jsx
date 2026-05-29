import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 FiUpload,
 FiFileText,
 FiUser,
 FiActivity,
 FiLogOut,
 FiPlus,
 FiImage,
 FiClock,
 FiDownload,
 FiX,
 FiCheck,
 FiEye,
 FiAlertCircle,
 FiMic,
 FiMicOff
} from 'react-icons/fi';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { API_URL } from './apiConfig';


// Helper function to strip markdown for speech
const stripMarkdown = (text) => {
 if (!text) return '';
 return text
 .replace(/^[#\s*]+|[📋🔍⚠️💡🎯🔬🧪🧠📚💊🏥📅🔄🧬📊🚨]/g, '')
 .replace(/\*\*(.+?)\*\*/g, '$1')
 .replace(/^\s*[•\-\*]\s*/gm, '')
 .replace(/\n+/g, ' ')
 .trim();
};

// Logo as base64 (you can replace this with your actual logo base64)
// For now, we'll use a placeholder that loads from public folder or URL
const LOGO_BASE64 = null; // Will load from public folder

// Component to render AI response with bullet points
const ChatResponseContent = ({ response, isError }) => {
 if (!response) return null;

 if (isError) {
 return (
 <div className="text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
 <div className="flex items-start gap-2">
 <FiAlertCircle className="text-red-500 mt-0.5 flex-shrink-0" />
 <p>{response}</p>
 </div>
 </div>
 );
 }

 const lines = response.split('\n');

 return (
 <div className="text-gray-800 text-sm leading-relaxed space-y-2">
 {lines.map((line, idx) => {
 // Check for bullet points
 const bulletMatch = line.match(/^\s*[•\-\*]\s*(.+)$/);
 if (bulletMatch) {
 return (
 <div key={idx} className="flex items-start gap-2 ml-1">
 <span className="text-purple-600 font-bold flex-shrink-0">•</span>
 <span>{bulletMatch[1]}</span>
 </div>
 );
 }
 // Check for headings
 const headingMatch = line.match(/^#{2,3}\s*(.+)$/);
 if (headingMatch) {
 return (
 <h4 key={idx} className="font-bold text-purple-900 mt-3 mb-1">
 {headingMatch[1].replace(/[📋🔍⚠️💡🎯🔬🧪🧠📚💊🏥📅🔄🧬📊🚨]/g, '').trim()}
 </h4>
 );
 }
 // Check for bold text
 if (line.includes('**')) {
 const parts = line.split(/\*\*(.+?)\*\*/);
 return (
 <p key={idx} className="mb-1">
 {parts.map((part, i) =>
 i % 2 === 1 ? <strong key={i} className="font-bold text-purple-900">{part}</strong> : part
 )}
 </p>
 );
 }
 // Regular text
 if (line.trim()) {
 return <p key={idx} className="mb-1">{line}</p>;
 }
 return null;
 })}
 </div>
 );
};

const IntelliHealthInterface = ({ patientData, onBack, onLogout }) => {
 const [editableData, setEditableData] = useState({
 caseid: patientData?.caseid || '',
 patid: patientData?.patid || '',
 pname: patientData?.pname || '',
 patient_email: patientData?.patient_email || '',
 dob: patientData?.dob || '',
 age: patientData?.age || '',
 gender: patientData?.gender || '',
 disease: patientData?.disease || '',
 medication: patientData?.medication || '',
 presenting_complaint: patientData?.presenting_complaint || '',
 bp: patientData?.bp || '',
 pulse: patientData?.pulse || '',
 bmi: patientData?.bmi || '',
 family_history: patientData?.family_history || '',
 social_history: patientData?.social_history || '',
 allergies: patientData?.allergies || ''
 });
 
 const [query, setQuery] = useState('');
 const [selectedOption, setSelectedOption] = useState('Explain');
 const [isLoading, setIsLoading] = useState(false);
 const [isDemoLoading, setIsDemoLoading] = useState(false);
 const [showDemoModal, setShowDemoModal] = useState(false);
 const [demoCases, setDemoCases] = useState([]);
 const [selectedDemoCase, setSelectedDemoCase] = useState(null);
 const [isStreaming, setIsStreaming] = useState(false);
 const [showInitialLoader, setShowInitialLoader] = useState(false);
 const [aiResponse, setAiResponse] = useState('');
 const [chatHistory, setChatHistory] = useState([]);
 const [streamingResponseId, setStreamingResponseId] = useState(null);
 const [isSpeaking, setIsSpeaking] = useState(false);
 const [speakingChatId, setSpeakingChatId] = useState(null);
 const [enableVoiceResponse, setEnableVoiceResponse] = useState(false);
 const [speechSynth, setSpeechSynth] = useState(null);
 const [showHistoryModal, setShowHistoryModal] = useState(false);
 const [patientHistory, setPatientHistory] = useState([]);

 // Upload states - separate for each type
 const [uploadedImage, setUploadedImage] = useState(null);
 const [uploadedImageName, setUploadedImageName] = useState('');
 const [uploadedPdfText, setUploadedPdfText] = useState('');
 const [uploadedPdfName, setUploadedPdfName] = useState('');
 const [pdfContent, setPdfContent] = useState('');
 const [showPdfModal, setShowPdfModal] = useState(false);

 const chatContainerRef = useRef(null);
 const speechRef = useRef(null);

 // Initialize speech synthesis
 useEffect(() => {
 if (typeof window !== 'undefined' && window.speechSynthesis) {
 setSpeechSynth(window.speechSynthesis);
 }
 }, []);

 const handleChange = (e) => {
 const { name, value } = e.target;
 setEditableData(prev => ({ ...prev, [name]: value }));
 };

 // Streaming text effect - batch by batch like ChatGPT
 const streamResponse = (fullText, chatId) => {
 const words = fullText.split(' ');
 let currentIndex = 0;
 let streamedText = '';

 const streamInterval = setInterval(() => {
 if (currentIndex < words.length) {
 const nextBatch = words.slice(currentIndex, currentIndex + 4).join(' ');
 streamedText += (currentIndex > 0 ? ' ' : '') + nextBatch;

 // Update the streaming response in chat history
 setChatHistory(prev => prev.map(chat =>
 chat.id === chatId
 ? { ...chat, response: streamedText, isStreaming: true }
 : chat
 ));

 currentIndex += 4;

 // Auto-scroll to bottom
 if (chatContainerRef.current) {
 chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
 }
 } else {
 clearInterval(streamInterval);
 setIsStreaming(false);
 // Mark streaming as complete
 setChatHistory(prev => prev.map(chat =>
 chat.id === chatId
 ? { ...chat, isStreaming: false }
 : chat
 ));
 
 // If voice response was enabled, start speaking when streaming completes
 if (enableVoiceResponse && speechSynth) {
 const cleanText = stripMarkdown(fullText);
 const utterance = new SpeechSynthesisUtterance(cleanText);
 utterance.rate = 0.95;
 utterance.pitch = 1;
 utterance.volume = 1;

 utterance.onend = () => {
 setIsSpeaking(false);
 setSpeakingChatId(null);
 speechRef.current = null;
 };

 utterance.onerror = () => {
 setIsSpeaking(false);
 setSpeakingChatId(null);
 speechRef.current = null;
 };

 speechRef.current = utterance;
 speechSynth.speak(utterance);
 setIsSpeaking(true);
 setSpeakingChatId(chatId);
 // Reset voice response toggle for next query
 setEnableVoiceResponse(false);
 }
 }
 }, 20);

 return () => clearInterval(streamInterval);
 };

 // Toggle voice/speech for individual messages
 const toggleSpeech = (text, chatId) => {
 if (!speechSynth) return;

 const cleanText = stripMarkdown(text);

 // If clicking on the same message that's currently speaking, stop it
 if (isSpeaking && speakingChatId === chatId && speechRef.current) {
 speechSynth.cancel();
 setIsSpeaking(false);
 setSpeakingChatId(null);
 speechRef.current = null;
 } else {
 // Stop any current speech first
 if (speechRef.current) {
 speechSynth.cancel();
 }

 // Start speaking new message
 const utterance = new SpeechSynthesisUtterance(cleanText);
 utterance.rate = 0.95;
 utterance.pitch = 1;
 utterance.volume = 1;

 utterance.onend = () => {
 setIsSpeaking(false);
 setSpeakingChatId(null);
 speechRef.current = null;
 };

 utterance.onerror = () => {
 setIsSpeaking(false);
 setSpeakingChatId(null);
 speechRef.current = null;
 };

 speechRef.current = utterance;
 speechSynth.speak(utterance);
 setIsSpeaking(true);
 setSpeakingChatId(chatId);
 }
 };

 // Stop voice only (not the response, just the speech)
 const stopVoice = () => {
 if (speechSynth) {
 speechSynth.cancel();
 setIsSpeaking(false);
 setSpeakingChatId(null);
 speechRef.current = null;
 }
 };

 // Stop speech on unmount
 useEffect(() => {
 return () => {
 if (speechSynth) {
 speechSynth.cancel();
 }
 };
 }, [speechSynth]);

 // Fetch patient history from database
 const fetchPatientHistory = async () => {
 try {
 const response = await axios.get(`${API_URL}/patient-history`, {
 params: {
 caseid: editableData.caseid,
 patid: editableData.patid
 }
 });

 if (response.data.success) {
 setPatientHistory(response.data.history || []);
 setShowHistoryModal(true);
 } else {
 setPatientHistory([]);
 setShowHistoryModal(true);
 }
 } catch (error) {
 console.error('Error fetching history:', error);
 setPatientHistory([]);
 setShowHistoryModal(true);
 }
 };

 // Fetch demo cases list for current patient
 const fetchDemoCases = async () => {
 try {
 setIsDemoLoading(true);
 
 // Send current patient data to get demo options
 const response = await axios.post(`${API_URL}/demo-cases`, {
 caseid: editableData.caseid,
 patid: editableData.patid,
 pname: editableData.pname,
 age: parseInt(editableData.age) || 30,
 gender: editableData.gender,
 disease: editableData.disease || 'Unknown Condition',
 medication: editableData.medication || 'None',
 bp: editableData.bp || '120/80',
 pulse: editableData.pulse || '80',
 bmi: parseFloat(editableData.bmi) || 25,
 presenting_complaint: editableData.presenting_complaint || 'General checkup',
 family_history: editableData.family_history || 'None',
 social_history: editableData.social_history || 'None',
 allergies: editableData.allergies || 'None'
 });
 
 if (response.data.success) {
 setDemoCases(response.data.cases || []);
 setShowDemoModal(true);
 }
 } catch (error) {
 console.error('Error fetching demo cases:', error);
 alert('Failed to load demo cases. Please ensure the backend is running.');
 } finally {
 setIsDemoLoading(false);
 }
 };

 // Run selected demo case for current patient - Generate PDF Report
 const runDemoCase = async (demoCase) => {
 try {
 setIsDemoLoading(true);
 setShowDemoModal(false);
 
 const response = await axios.post(`${API_URL}/demo-case/run`, {
 patient_data: {
 caseid: editableData.caseid,
 patid: editableData.patid,
 pname: editableData.pname,
 age: parseInt(editableData.age) || 30,
 gender: editableData.gender,
 disease: editableData.disease || 'Unknown Condition',
 medication: editableData.medication || 'None',
 bp: editableData.bp || '120/80',
 pulse: editableData.pulse || '80',
 bmi: parseFloat(editableData.bmi) || 25,
 presenting_complaint: editableData.presenting_complaint || 'General checkup',
 family_history: editableData.family_history || 'None',
 social_history: editableData.social_history || 'None',
 allergies: editableData.allergies || 'None'
 },
 query_type: demoCase.query_type
 });
 
 if (response.data.success) {
 const demoData = response.data;
 
 // Generate PDF Report instead of showing in chat
 await generateDemoPDF(demoData);
 }
 } catch (error) {
 console.error('Error running demo case:', error);
 alert('Failed to run demo case. Please try again.');
 } finally {
 setIsDemoLoading(false);
 }
 };

 // Generate PDF for Demo Case Study
 const generateDemoPDF = async (demoData) => {
 try {
 const doc = new jsPDF();
 const pageWidth = doc.internal.pageSize.getWidth();
 const pageHeight = doc.internal.pageSize.getHeight();

 // ====== HEADER WITH LOGO AND BRANDING ======
 // Background gradient
 doc.setFillColor(147, 51, 234); // Purple-600
 doc.rect(0, 0, pageWidth, 40, 'F');
 
 // Decorative line
 doc.setFillColor(236, 72, 153); // Pink-600
 doc.rect(0, 38, pageWidth, 2, 'F');

 // Load logo from public folder
 const logoSize = 25;
 const logoX = 15;
 const logoY = 8;
 
 try {
 // Fetch logo from public folder
 const logoResponse = await fetch('/myimage.png');
 const logoBlob = await logoResponse.blob();
 const logoReader = new FileReader();
 
 await new Promise((resolve, reject) => {
 logoReader.onload = () => {
 const logoBase64 = logoReader.result;
 
 // Add logo to PDF
 doc.addImage(logoBase64, 'JPEG', logoX, logoY, logoSize, logoSize);
 
 // Brand name next to logo
 doc.setTextColor(255, 255, 255);
 doc.setFontSize(26);
 doc.setFont('helvetica', 'bold');
 doc.text('DiabAssist', logoX + logoSize + 8, 20, { align: 'left' });
 
 // Tagline
 doc.setFontSize(11);
 doc.setFont('helvetica', 'normal');
 doc.text('AI-Powered Clinical Decision Support', logoX + logoSize + 8, 27, { align: 'left' });
 
 resolve();
 };
 logoReader.onerror = reject;
 logoReader.readAsDataURL(logoBlob);
 });
 } catch (logoError) {
 // Fallback if logo fails to load
 console.log('Logo not loaded, using text fallback');
 doc.setTextColor(255, 255, 255);
 doc.setFontSize(24);
 doc.setFont('helvetica', 'bold');
 doc.text('DiabAssist', pageWidth / 2, 15, { align: 'center' });
 
 doc.setFontSize(12);
 doc.setFont('helvetica', 'normal');
 doc.text('AI-Powered Clinical Decision Support', pageWidth / 2, 24, { align: 'center' });
 }
 
 // Report title
 doc.setFontSize(11);
 doc.setFont('helvetica', 'bold');
 doc.text('DEMO CASE STUDY REPORT', pageWidth / 2, 33, { align: 'center' });

 // ====== PATIENT INFORMATION SECTION ======
 let yPos = 50;
 
 // Section header
 doc.setFillColor(147, 51, 234);
 doc.rect(14, yPos - 5, pageWidth - 28, 8, 'F');
 doc.setTextColor(255, 255, 255);
 doc.setFontSize(12);
 doc.setFont('helvetica', 'bold');
 doc.text('PATIENT INFORMATION', 20, yPos);

 yPos += 10;
 doc.setTextColor(0, 0, 0);
 doc.setFontSize(10);
 doc.setFont('helvetica', 'normal');

 // Patient info grid
 const patientInfo = [
 [`Name: ${demoData.patient_info.name}`, `Age: ${demoData.patient_info.age} years`],
 [`Gender: ${demoData.patient_info.gender}`, `Case ID: DEMO-${new Date().toISOString().split('T')[0]}`],
 [`Condition: ${demoData.patient_info.condition}`, `Analysis Type: ${demoData.query_type}`],
 [`Medication: ${demoData.patient_info.medication}`, `BP: ${demoData.patient_info.bp}`],
 [`Pulse: ${demoData.patient_info.pulse} bpm`, `BMI: ${demoData.patient_info.bmi}`],
 [`Presenting Complaint: ${demoData.patient_info.presenting_complaint}`, `Allergies: ${demoData.patient_info.allergies}`]
 ];

 autoTable(doc, {
 startY: yPos,
 body: patientInfo,
 theme: 'plain',
 styles: { fontSize: 9, cellPadding: 1.5, textColor: 40 },
 columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 90 } },
 margin: { left: 20, right: 20 }
 });

 yPos = doc.lastAutoTable.finalY + 10;

 // ====== FAMILY & SOCIAL HISTORY ======
 doc.setFillColor(236, 72, 153); // Pink
 doc.rect(14, yPos - 5, pageWidth - 28, 8, 'F');
 doc.setTextColor(255, 255, 255);
 doc.setFontSize(12);
 doc.setFont('helvetica', 'bold');
 doc.text('MEDICAL HISTORY', 20, yPos);

 yPos += 10;
 doc.setTextColor(0, 0, 0);
 doc.setFontSize(10);
 doc.setFont('helvetica', 'normal');

 const historyInfo = [
 [`Family History: ${demoData.patient_info.family_history}`, `Social History: ${demoData.patient_info.social_history}`]
 ];

 autoTable(doc, {
 startY: yPos,
 body: historyInfo,
 theme: 'plain',
 styles: { fontSize: 9, cellPadding: 1.5 },
 columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 90 } },
 margin: { left: 20, right: 20 }
 });

 yPos = doc.lastAutoTable.finalY + 15;

 // ====== AI ANALYSIS SECTION ======
 doc.setFillColor(147, 51, 234);
 doc.rect(14, yPos - 5, pageWidth - 28, 8, 'F');
 doc.setTextColor(255, 255, 255);
 doc.setFontSize(12);
 doc.setFont('helvetica', 'bold');
 doc.text('AI CLINICAL ANALYSIS', 20, yPos);

 yPos += 8;
 
 // Process AI response text for PDF
 const aiText = demoData.ai_analysis || '';
 const lines = aiText.split('\n');
 
 doc.setTextColor(0, 0, 0);
 doc.setFontSize(10);
 doc.setFont('helvetica', 'normal');
 
 let currentY = yPos;
 const leftMargin = 20;
 const rightMargin = 20;
 const maxWidth = pageWidth - leftMargin - rightMargin;
 
 lines.forEach((line) => {
 // Check for page break
 if (currentY > pageHeight - 30) {
 doc.addPage();
 currentY = 30;
 }
 
 // Clean the line
 const cleanLine = line.replace(/\*\*/g, '').replace(/^[#\s*]+/g, '').trim();
 
 if (cleanLine) {
 // Check if it's a heading (short line, all caps in original)
 const isHeading = cleanLine.length < 60 && (line.includes('**') || line.startsWith('#'));
 
 if (isHeading) {
 currentY += 5;
 doc.setFont('helvetica', 'bold');
 doc.setTextColor(147, 51, 234); // Purple
 doc.setFontSize(11);
 
 // Split long headings
 const headingLines = doc.splitTextToSize(cleanLine, maxWidth);
 doc.text(headingLines, leftMargin, currentY);
 currentY += headingLines.length * 5;
 
 doc.setFont('helvetica', 'normal');
 doc.setTextColor(0, 0, 0);
 doc.setFontSize(10);
 } else {
 // Regular text - split into bullet points if needed
 const bulletMatch = cleanLine.match(/^[\-\*•]\s*(.+)$/);
 if (bulletMatch) {
 doc.setFont('helvetica', 'bold');
 doc.text('•', leftMargin, currentY);
 doc.setFont('helvetica', 'normal');
 
 const bulletText = doc.splitTextToSize(bulletMatch[1], maxWidth - 5);
 doc.text(bulletText, leftMargin + 5, currentY);
 currentY += bulletText.length * 5;
 } else {
 const textLines = doc.splitTextToSize(cleanLine, maxWidth);
 doc.text(textLines, leftMargin, currentY);
 currentY += textLines.length * 5;
 }
 }
 currentY += 2;
 } else {
 currentY += 5; // Extra space for empty lines
 }
 });

 // ====== FOOTER ======
 const pageCount = doc.internal.getNumberOfPages();
 for (let i = 1; i <= pageCount; i++) {
 doc.setPage(i);
 
 // Footer background
 doc.setFillColor(249, 250, 251);
 doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
 
 // Footer line
 doc.setDrawColor(147, 51, 234);
 doc.setLineWidth(0.5);
 doc.line(0, pageHeight - 15, pageWidth, pageHeight - 15);
 
 // Footer text
 doc.setFontSize(8);
 doc.setTextColor(100, 100, 100);
 doc.text('Generated by DiabAssist - AI-Powered Clinical Decision Support', pageWidth / 2, pageHeight - 8, { align: 'center' });
 doc.text(`Page ${i} of ${pageCount} | Demo Report | ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
 }

 // Save PDF
 const filename = `Demo_${demoData.patient_info.name.replace(/\s+/g, '_')}_${demoData.query_type}_Report.pdf`;
 doc.save(filename);
 
 // Show success message
 alert(`✅ PDF Report Generated Successfully!\n\nPatient: ${demoData.patient_info.name}\nAnalysis: ${demoData.title}\n\nThe PDF has been downloaded to your computer.`);
 
 } catch (error) {
 console.error('Error generating PDF:', error);
 alert('Failed to generate PDF report.');
 }
 };

 // Generate comprehensive PDF report
 const generatePDFReport = async () => {
 try {
 // Fetch latest patient history from database
 const response = await axios.get(`${API_URL}/patient-history`, {
 params: {
 caseid: editableData.caseid,
 patid: editableData.patid
 }
 });

 const historyData = response.data.success ? (response.data.history || []) : [];

 const doc = new jsPDF();
 const pageWidth = doc.internal.pageSize.getWidth();
 const pageHeight = doc.internal.pageSize.getHeight();

 // ====== HEADER WITH LOGO ======
 // Background gradient
 doc.setFillColor(88, 28, 135); // Purple-900
 doc.rect(0, 0, pageWidth, 40, 'F');

 // Decorative line
 doc.setFillColor(168, 85, 247); // Purple-500
 doc.rect(0, 38, pageWidth, 2, 'F');

 // Load logo from public folder
 const logoSize = 30;
 const logoX = 15;
 const logoY = 8;
 
 try {
 const logoResponse = await fetch('/myimage.png');
 const logoBlob = await logoResponse.blob();
 const logoReader = new FileReader();
 
 await new Promise((resolve, reject) => {
 logoReader.onload = () => {
 const logoBase64 = logoReader.result;
 doc.addImage(logoBase64, 'JPEG', logoX, logoY, logoSize, logoSize);
 resolve();
 };
 logoReader.onerror = reject;
 logoReader.readAsDataURL(logoBlob);
 });
 
 // Brand name next to logo
 doc.setTextColor(255, 255, 255);
 doc.setFontSize(26);
 doc.setFont('helvetica', 'bold');
 doc.text('DiabAssist', logoX + logoSize + 8, 20, { align: 'left' });
 
 doc.setFontSize(11);
 doc.setFont('helvetica', 'normal');
 doc.text('Advanced Clinical Decision Support System', logoX + logoSize + 8, 28, { align: 'left' });
 
 doc.setFontSize(10);
 doc.text('Comprehensive Patient Clinical Report', logoX + logoSize + 8, 34, { align: 'left' });
 } catch (logoError) {
 // Fallback if logo fails to load
 console.log('Logo not loaded, using text fallback');
 doc.setTextColor(255, 255, 255);
 doc.setFontSize(22);
 doc.setFont('helvetica', 'bold');
 doc.text('DIABASSIST', pageWidth / 2, 15, { align: 'center' });

 doc.setFontSize(11);
 doc.setFont('helvetica', 'normal');
 doc.text('Advanced Clinical Decision Support System', pageWidth / 2, 23, { align: 'center' });

 doc.setFontSize(10);
 doc.text('Comprehensive Patient Clinical Report', pageWidth / 2, 30, { align: 'center' });
 }
 
 // Reset text color
 doc.setTextColor(0, 0, 0);
 
 let yPos = 45;
 
 // Patient Information Section
 doc.setFillColor(240, 253, 250); // Teal-50
 doc.rect(14, yPos - 5, pageWidth - 28, 35, 'F');
 
 doc.setFontSize(13);
 doc.setFont('helvetica', 'bold');
 doc.setTextColor(88, 28, 135);
 doc.text('PATIENT INFORMATION', 20, yPos);
 
 doc.setFontSize(10);
 doc.setFont('helvetica', 'normal');
 doc.setTextColor(0, 0, 0);
 
 const patientInfo = [
 [`Case ID: ${editableData.caseid || 'N/A'}`, `Patient ID: ${editableData.patid || 'N/A'}`],
 [`Name: ${editableData.pname || 'N/A'}`, `DOB: ${editableData.dob || 'N/A'}`],
 [`Age: ${editableData.age || 'N/A'} years`, `Gender: ${editableData.gender || 'N/A'}`],
 [`Blood Pressure: ${editableData.bp || 'N/A'}`, `BMI: ${editableData.bmi || 'N/A'}`]
 ];

 autoTable(doc, {
 startY: yPos + 2,
 body: patientInfo,
 theme: 'plain',
 styles: { fontSize: 9, cellPadding: 1 },
 columnStyles: { 0: { cellWidth: 85 }, 1: { cellWidth: 85 } },
 margin: { left: 20, right: 20 }
 });

 yPos = doc.lastAutoTable.finalY + 12;

 // Clinical Background Section
 doc.setFillColor(243, 244, 246); // Gray-100
 doc.rect(14, yPos - 5, pageWidth - 28, 50, 'F');

 doc.setFontSize(13);
 doc.setFont('helvetica', 'bold');
 doc.setTextColor(88, 28, 135);
 doc.text('CLINICAL BACKGROUND', 20, yPos);

 doc.setFontSize(10);
 doc.setFont('helvetica', 'normal');
 doc.setTextColor(0, 0, 0);

 const clinicalBackground = [
 ['Presenting Complaint:', editableData.presenting_complaint || 'Not specified'],
 ['Known Disease/Condition:', editableData.disease || 'Not specified'],
 ['Current Medication:', editableData.medication || 'Not specified'],
 ['Allergies:', editableData.allergies || 'None known'],
 ['Family History:', editableData.family_history || 'Not provided'],
 ['Social History:', editableData.social_history || 'Not provided']
 ];

 autoTable(doc, {
 startY: yPos + 2,
 body: clinicalBackground,
 theme: 'plain',
 styles: { fontSize: 9, cellPadding: 1.5 },
 columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { cellWidth: 120 } },
 margin: { left: 20, right: 20 }
 });
 
 yPos = doc.lastAutoTable.finalY + 12;
 
 // Consultation History Section
 doc.setFontSize(13);
 doc.setFont('helvetica', 'bold');
 doc.setTextColor(88, 28, 135);
 doc.text('CONSULTATION HISTORY & AI ANALYSIS', 20, yPos);
 
 doc.setFontSize(9);
 doc.setFont('helvetica', 'italic');
 doc.setTextColor(100, 100, 100);
 doc.text(`Total Consultations: ${historyData.length}`, 20, yPos + 5);
 
 doc.setFontSize(10);
 doc.setFont('helvetica', 'normal');
 doc.setTextColor(0, 0, 0);
 
 yPos += 10;
 
 // Add each consultation
 historyData.forEach((consultation, index) => {
 // Check if we need a new page
 if (yPos > 240) {
 doc.addPage();
 yPos = 20;
 }
 
 // Consultation header
 doc.setFillColor(240, 253, 250); // Teal-50
 doc.rect(14, yPos - 4, pageWidth - 28, 8, 'F');
 
 doc.setFontSize(11);
 doc.setFont('helvetica', 'bold');
 doc.setTextColor(88, 28, 135);
 const consultType = consultation.query_type || 'Consultation';
 const consultDate = consultation.timestamp ? new Date(consultation.timestamp).toLocaleString() : 'N/A';
 doc.text(`CONSULTATION ${index + 1}: ${consultType.toUpperCase()}`, 20, yPos);
 
 doc.setFontSize(9);
 doc.setFont('helvetica', 'normal');
 doc.setTextColor(100, 100, 100);
 doc.text(consultDate, pageWidth - 22, yPos, { align: 'right' });
 
 yPos += 6;
 
 // Query
 doc.setFontSize(10);
 doc.setFont('helvetica', 'bold');
 doc.setTextColor(0, 0, 0);
 doc.text('Query/Reasoning:', 20, yPos);
 
 yPos += 5;
 doc.setFont('helvetica', 'normal');
 const queryText = consultation.query || consultation.custom_query || 'No specific query';
 const splitQuery = doc.splitTextToSize(queryText, pageWidth - 40);
 doc.text(splitQuery, 20, yPos);
 yPos += (splitQuery.length * 5) + 3;
 
 // AI Response/Analysis
 doc.setFont('helvetica', 'bold');
 doc.text('AI Analysis & Recommendations:', 20, yPos);
 
 yPos += 5;
 doc.setFont('helvetica', 'normal');
 const responseText = consultation.response || consultation.ai_response || 'No response';
 const splitResponse = doc.splitTextToSize(responseText, pageWidth - 40);
 doc.text(splitResponse, 20, yPos);
 yPos += (splitResponse.length * 5) + 8;
 
 // Indicators for uploads
 if (consultation.has_image || consultation.has_pdf) {
 doc.setFont('helvetica', 'italic');
 doc.setTextColor(100, 100, 100);
 const attachments = [];
 if (consultation.has_image) attachments.push('Medical Image');
 if (consultation.has_pdf) attachments.push('PDF Report');
 doc.text(`Attachments: ${attachments.join(', ')}`, 20, yPos);
 yPos += 5;
 doc.setTextColor(0, 0, 0);
 }
 });
 
 // Add new page for summary and signature if needed
 if (yPos > 200) {
 doc.addPage();
 yPos = 20;
 }
 
 // Summary & Treatment Plan Section
 doc.setFillColor(240, 253, 244); // Green-50
 doc.rect(14, yPos - 5, pageWidth - 28, 40, 'F');
 
 doc.setFontSize(13);
 doc.setFont('helvetica', 'bold');
 doc.setTextColor(22, 163, 74); // Green-600
 doc.text('SUMMARY & TREATMENT PLAN', 20, yPos);
 
 doc.setFontSize(10);
 doc.setFont('helvetica', 'normal');
 doc.setTextColor(0, 0, 0);
 
 // Generate summary based on latest consultation
 const latestConsultation = historyData.length > 0 ? historyData[0] : null;
 const summaryText = latestConsultation 
 ? `Based on ${historyData.length} consultation(s), the patient has been evaluated for ${editableData.disease || 'presenting complaints'}. AI-assisted analysis has been provided for each consultation with detailed reasoning, differential diagnoses, and treatment recommendations.`
 : `Patient evaluation completed. Clinical data has been reviewed and documented.`;
 
 const splitSummary = doc.splitTextToSize(summaryText, pageWidth - 40);
 doc.text(splitSummary, 20, yPos + 7);
 
 yPos += (splitSummary.length * 5) + 10;
 
 // Key Recommendations
 doc.setFont('helvetica', 'bold');
 doc.text('Key Recommendations:', 20, yPos);
 
 doc.setFont('helvetica', 'normal');
 const recommendations = [
 '• Follow prescribed medication regimen as directed',
 '• Monitor symptoms and report any adverse reactions',
 '• Schedule follow-up appointment as recommended',
 '• Maintain healthy lifestyle modifications'
 ];
 
 yPos += 6;
 recommendations.forEach(rec => {
 doc.text(rec, 22, yPos);
 yPos += 5;
 });
 
 yPos += 10;
 
 // Signature Section
 doc.setFillColor(254, 242, 242); // Red-50
 doc.rect(14, yPos - 5, pageWidth - 28, 35, 'F');
 
 doc.setFontSize(13);
 doc.setFont('helvetica', 'bold');
 doc.setTextColor(185, 28, 28); // Red-700
 doc.text('PHYSICIAN VERIFICATION', 20, yPos);
 
 // Signature line
 doc.setDrawColor(0, 0, 0);
 doc.setLineWidth(0.5);
 doc.line(20, yPos + 20, 80, yPos + 20);
 doc.setFontSize(9);
 doc.setFont('helvetica', 'normal');
 doc.setTextColor(0, 0, 0);
 doc.text('Physician Signature', 20, yPos + 25);
 
 // Date line
 doc.line(120, yPos + 20, 180, yPos + 20);
 const currentDate = new Date().toLocaleDateString();
 doc.text(`Date: ${currentDate}`, 120, yPos + 25);
 
 // Medical license line
 doc.line(20, yPos + 32, 80, yPos + 32);
 doc.text('Medical License No.', 20, yPos + 37);
 
 // Stamp placeholder
 doc.setDrawColor(88, 28, 135);
 doc.setLineWidth(1);
 doc.rect(pageWidth - 50, yPos + 8, 30, 20);
 doc.setFontSize(8);
 doc.setFont('helvetica', 'bold');
 doc.setTextColor(88, 28, 135);
 doc.text('OFFICIAL', pageWidth - 35, yPos + 15, { align: 'center' });
 doc.text('STAMP', pageWidth - 35, yPos + 20, { align: 'center' });
 doc.setFont('helvetica', 'normal');
 
 // Footer
 doc.setFontSize(8);
 doc.setTextColor(150, 150, 150);
 doc.text('Generated by DiabAssist - Advanced Clinical Decision Support System', pageWidth / 2, pageHeight - 15, { align: 'center' });
 doc.text(`Report Generated: ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
 
 // Save PDF
 const fileName = `Patient_Report_${editableData.patid || 'Unknown'}_${new Date().toISOString().split('T')[0]}.pdf`;
 doc.save(fileName);
 
 alert('PDF report generated successfully!');
 } catch (error) {
 console.error('Error generating PDF:', error);
 alert('Failed to generate PDF report: ' + (error.response?.data?.detail || error.message));
 }
 };

 const handleAsk = async () => {
 if (!editableData.disease && !editableData.presenting_complaint) {
 alert('Please fill at least Disease or Presenting Complaint');
 return;
 }

 setIsLoading(true);
 setShowInitialLoader(true);

 const userQueryText = query.trim() || `${selectedOption} analysis`;
 const newChatId = Date.now();

 // Add placeholder to chat history with loader
 setChatHistory(prev => [...prev, {
 id: newChatId,
 query: userQueryText,
 queryType: selectedOption,
 response: '',
 timestamp: new Date().toLocaleTimeString(),
 hasImage: !!uploadedImage,
 hasPdf: !!uploadedPdfText,
 isLoading: true,
 isStreaming: false
 }]);

 try {
 const payload = {
 caseid: editableData.caseid,
 patid: editableData.patid,
 pname: editableData.pname,
 dob: editableData.dob,
 age: parseInt(editableData.age),
 gender: editableData.gender,
 disease: editableData.disease,
 medication: editableData.medication,
 query_type: selectedOption,
 custom_query: query,
 presenting_complaint: editableData.presenting_complaint,
 bp: editableData.bp,
 pulse: editableData.pulse,
 bmi: editableData.bmi,
 family_history: editableData.family_history,
 social_history: editableData.social_history,
 allergies: editableData.allergies,
 image_data: uploadedImage,
 image_name: uploadedImageName,
 pdf_text: uploadedPdfText,
 pdf_name: uploadedPdfName,
 // Email notification fields
 patient_email: editableData.patient_email || null,
 doctor_name: localStorage.getItem('doctorName') || 'Your Healthcare Provider'
 };

 // Debug log
 console.log('📧 Sending clinical query with patient_email:', payload.patient_email);
 console.log('📧 Doctor name:', payload.doctor_name);
 console.log('📧 Full editableData:', editableData);
 console.log('📧 Payload being sent:', JSON.stringify(payload, null, 2));

    const token = localStorage.getItem('authToken');
    const response = await axios.post(`${API_URL}/api/clinical-analysis`, payload, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

 console.log('✅ Response received:', response);
 console.log('✅ Response status:', response.status);
 console.log('✅ Response data:', response.data);

 // Hide initial loader after 1.5 seconds
 setTimeout(() => {
 setShowInitialLoader(false);
 }, 1500);

 if (response.data.success) {
 const fullResponse = response.data.content;
 console.log('✅ Success! Response content:', fullResponse);
 setAiResponse(fullResponse);
 setStreamingResponseId(newChatId);

 // Update chat history with actual response (remove loader flag)
 setChatHistory(prev => prev.map(chat =>
 chat.id === newChatId
 ? {
 ...chat,
 response: '',
 isLoading: false,
 isStreaming: true
 }
 : chat
 ));

 // Start streaming the response
 streamResponse(fullResponse, newChatId);

 // Clear query after sending
 setQuery('');
 } else {
 console.log('❌ Response success is false');
 console.log('❌ Full response object:', response.data);
 console.log('❌ Error field:', response.data.error);
 const errorMsg = 'Error: ' + (response.data.error || 'Unknown error');
 console.error('❌ Setting error message:', errorMsg);
 setAiResponse(errorMsg);
 // Update chat history with error
 setChatHistory(prev => prev.map(chat =>
 chat.id === newChatId
 ? {
 ...chat,
 response: errorMsg,
 isLoading: false,
 isError: true,
 isStreaming: false
 }
 : chat
 ));
 setQuery('');
 }

 } catch (error) {
 console.error('❌ Error caught in try-catch:', error);
 console.error('❌ Error response:', error.response);
 console.error('❌ Error response data:', error.response?.data);
 console.error('❌ Error message:', error.message);
 console.error('❌ Full error object:', JSON.stringify(error, null, 2));
 const errorMsg = 'Error: ' + (error.response?.data?.detail || error.message || 'Failed to get AI response');
 console.error('❌ Final error message:', errorMsg);
 setAiResponse(errorMsg);
 // Update chat history with error
 setChatHistory(prev => prev.map(chat =>
 chat.id === newChatId
 ? {
 ...chat,
 response: errorMsg,
 isLoading: false,
 isError: true,
 isStreaming: false
 }
 : chat
 ));
 setQuery('');
 } finally {
 setIsLoading(false);
 setShowInitialLoader(false);
 }
 };

 const handleImageUpload = async (e) => {
 const file = e.target.files[0];
 if (!file) return;

 console.log('🖼️ Uploading image:', file.name);

 const formData = new FormData();
 formData.append('file', file);

 try {
 const response = await axios.post(`${API_URL}/upload-image`, formData, {
 headers: { 'Content-Type': 'multipart/form-data' }
 });
 
 console.log('🖼️ Image upload response:', response.data);
 
 if (response.data.success) {
 setUploadedImage(response.data.image_data);
 setUploadedImageName(file.name);
 alert('Image uploaded! Click ASK AI to analyze.');
 } else {
 console.error('🖼️ Image upload failed - success false:', response.data);
 alert('Failed to upload image: ' + (response.data.error || 'Unknown error'));
 }
 } catch (error) {
 console.error('🖼️ Image upload error:', error);
 console.error('🖼️ Error response:', error.response?.data);
 alert('Failed to upload image: ' + (error.response?.data?.detail || error.message));
 }
 };

 const handlePdfUpload = async (e) => {
 const file = e.target.files[0];
 if (!file) return;

 console.log('📄 Uploading PDF:', file.name);

 const formData = new FormData();
 formData.append('file', file);

 try {
 const response = await axios.post(`${API_URL}/upload-pdf`, formData, {
 headers: { 'Content-Type': 'multipart/form-data' }
 });
 
 console.log('📄 PDF upload response:', response.data);
 
 if (response.data.success) {
 setUploadedPdfText(response.data.pdf_text);
 setUploadedPdfName(file.name);
 setPdfContent(response.data.pdf_text);
 setShowPdfModal(true);
 alert(`PDF uploaded (${response.data.pages_count} pages)! Click ASK AI to analyze.`);
 } else {
 console.error('📄 PDF upload failed - success false:', response.data);
 alert('Failed to upload PDF: ' + (response.data.error || 'Unknown error'));
 }
 } catch (error) {
 console.error('📄 PDF upload error:', error);
 console.error('📄 Error response:', error.response?.data);
 alert('Failed to upload PDF: ' + (error.response?.data?.detail || error.message));
 }
 };

 const clearImage = () => {
 setUploadedImage(null);
 setUploadedImageName('');
 };

 const clearPdf = () => {
 setUploadedPdfText('');
 setUploadedPdfName('');
 setPdfContent('');
 setShowPdfModal(false);
 };

 return (
 <div className="min-h-screen bg-purple-400">
 {/* Header */}
 <div className="bg-purple-400 px-6 py-3 flex items-center justify-between shadow-2xl border-b-4 border-purple-800">
 <div className="flex items-center gap-3">
 <img src="/myimage.png" alt="DiabAssist Logo" className="w-14 h-14 object-cover shadow-md" />
 <div>
 <h1 className="text-2xl font-bold text-white tracking-tight">DiabAssist</h1>
 <p className="text-teal-100 text-xs mt-0.5">Advanced Clinical Decision Support System</p>
 </div>
 </div>
 <button
 onClick={onLogout}
 className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg hover:shadow-xl border-2 border-red-800 text-sm"
 >
 Logout
 </button>
 </div>

 {/* Main Container */}
 <div className="p-4 max-w-[1800px] mx-auto space-y-4">

 {/* Patient Information Section */}
 <div className="bg-purple-200 rounded-xl p-4 shadow-xl border-2 border-purple-400">
 <h2 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
 <FiUser className="text-white text-lg" />
 </div>
 Patient Information
 </h2>

    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
 <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-purple-300 shadow-sm">
 <label className="block text-xs font-bold text-purple-800 mb-1.5 uppercase tracking-wide">Case ID:</label>
 <input
 type="text"
 name="caseid"
 value={editableData.caseid}
 onChange={handleChange}
 className="w-full px-3 py-2 bg-white border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-purple-900 font-semibold text-sm"
          placeholder="Case ID"
 />
 </div>

 <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-purple-300 shadow-sm">
 <label className="block text-xs font-bold text-purple-800 mb-1.5 uppercase tracking-wide">Patient ID:</label>
 <input
 type="text"
 name="patid"
 value={editableData.patid}
 onChange={handleChange}
 className="w-full px-3 py-2 bg-white border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-purple-900 font-semibold text-sm"
          placeholder="Patient ID"
 />
 </div>

 <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-purple-300 shadow-sm">
 <label className="block text-xs font-bold text-purple-800 mb-1.5 uppercase tracking-wide">Patient Name:</label>
 <input
 type="text"
 name="pname"
 value={editableData.pname}
 onChange={handleChange}
 className="w-full px-3 py-2 bg-white border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-purple-900 font-semibold text-sm"
          placeholder="Name"
 />
 </div>

 <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-purple-300 shadow-sm">
 <label className="block text-xs font-bold text-purple-800 mb-1.5 uppercase tracking-wide">Date of Birth:</label>
 <input
 type="date"
 name="dob"
 value={editableData.dob}
 onChange={handleChange}
 className="w-full px-3 py-2 bg-white border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-purple-900 font-semibold text-sm"
 />
 </div>

      <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-purple-300 shadow-sm">
        <label className="block text-xs font-bold text-purple-800 mb-1.5 uppercase tracking-wide">Age:</label>
        <input
          type="number"
          name="age"
          value={editableData.age}
          onChange={handleChange}
          className="w-full px-3 py-2 bg-white border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-purple-900 font-semibold text-sm"
          placeholder="Age"
        />
      </div>

      <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-purple-300 shadow-sm">
        <label className="block text-xs font-bold text-purple-800 mb-1.5 uppercase tracking-wide">Patient Email:</label>
        <input
          type="email"
          name="patient_email"
          value={editableData.patient_email}
          onChange={handleChange}
          className="w-full px-3 py-2 bg-white border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-purple-900 font-semibold text-sm"
          placeholder="Email for notifications"
        />
      </div>
 </div>

 {/* Upload Buttons - Moved to bottom of patient section */}
 <div className="flex justify-center gap-3">
 <label className="bg-purple-400 text-white px-5 py-2.5 rounded-xl cursor-pointer transition-all font-bold flex items-center gap-2 shadow-lg hover:shadow-xl border-2 border-purple-700 transform hover:scale-105 text-sm">
 <FiUpload className="text-base" />
 Upload PDF Report
 <input type="file" onChange={handlePdfUpload} accept=".pdf" className="hidden" />
 </label>

 <label className="bg-purple-400 text-white px-5 py-2.5 rounded-xl cursor-pointer transition-all font-bold flex items-center gap-2 shadow-lg hover:shadow-xl border-2 border-purple-700 transform hover:scale-105 text-sm">
 <FiImage className="text-base" />
 Upload Image
 <input type="file" onChange={handleImageUpload} accept="image/*" className="hidden" />
 </label>
 </div>
 </div>

 {/* AI Response Area */}
 <div className="bg-purple-100 rounded-xl p-4 shadow-xl border-2 border-purple-400">
 <div className="flex items-center justify-between mb-3">
 <h2 className="text-xl font-bold text-purple-900 flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg bg-purple-400 flex items-center justify-center">
 <FiActivity className="text-white text-lg" />
 </div>
 AI Clinical Analysis
 </h2>
 {isLoading && (
 <div className="flex items-center gap-2 bg-teal-100 px-3 py-1.5 rounded-lg">
 <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
 <span className="text-purple-800 font-semibold text-sm">AI is analyzing...</span>
 </div>
 )}
 </div>

 {/* Response Content Box */}
 <div className="bg-white rounded-xl border-4 border-purple-300 shadow-2xl overflow-hidden">
 {/* Box Header */}
 <div className="bg-purple-400 px-4 py-3 border-b-4 border-purple-800">
 <div className="flex items-center justify-between">
 <h3 className="text-base font-bold text-white flex items-center gap-2">
 <FiFileText className="text-lg" />
 AI Chat History
 </h3>
 <div className="flex items-center gap-2">
 {isSpeaking && (
 <button
 onClick={stopVoice}
 className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 animate-pulse"
 >
 <FiMicOff className="text-sm" />
 Stop Voice
 </button>
 )}
 <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg text-white text-xs font-semibold">
 {chatHistory.length} conversation{chatHistory.length !== 1 ? 's' : ''}
 </span>
 {chatHistory.length > 0 && (
 <button
 onClick={() => setChatHistory([])}
 className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
 >
 <FiX className="text-sm" />
 Clear Chat
 </button>
 )}
 </div>
 </div>
 </div>

 {/* Response Content */}
 <div
 ref={chatContainerRef}
 className="p-4 min-h-[320px] max-h-[320px] overflow-y-auto bg-transparent relative"
 >
 {/* Watermark overlay - extra large covering entire area */}
 <div
 className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden"
 style={{
 zIndex: 0
 }}
 >
 <img
 src="/myimage.png"
 alt="Watermark"
 className="min-w-[150%] min-h-[150%] object-cover opacity-[0.07]"
 />
 </div>

 <div className="relative z-10">
 {isLoading ? (
 <div className="flex flex-col items-center justify-center h-full space-y-4">
 <div className="relative">
 <div className="w-16 h-16 border-6 border-teal-100 border-t-purple-600 rounded-full animate-spin"></div>
 <div className="absolute inset-0 flex items-center justify-center">
 <FiActivity className="text-3xl text-purple-600" />
 </div>
 </div>
 <div className="text-center">
 <p className="text-lg font-bold text-purple-800 mb-1">AI is analyzing your query...</p>
 <p className="text-purple-600 text-sm">Generating comprehensive clinical response</p>
 </div>
 </div>
 ) : chatHistory && chatHistory.length > 0 ? (
 <div className="space-y-4">
 {chatHistory.map((chat, idx) => (
 <div key={chat.id} className="space-y-3">
 {/* User Query */}
 <div className="flex items-start gap-3">
 <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
 <FiUser className="text-white text-sm" />
 </div>
 <div className="flex-1 bg-teal-100 rounded-xl rounded-tl-none px-4 py-3 border border-purple-200">
 <div className="flex items-center gap-2 mb-1">
 <span className="text-xs font-bold text-purple-700">You</span>
 <span className="text-xs text-purple-500">• {chat.timestamp}</span>
 <span className="text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full">{chat.queryType}</span>
 {chat.hasImage && <span className="text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full">📷 Image</span>}
 {chat.hasPdf && <span className="text-xs bg-cyan-200 text-cyan-700 px-2 py-0.5 rounded-full">📄 PDF</span>}
 </div>
 <p className="text-purple-900 text-sm">{chat.query}</p>
 </div>
 </div>
 
 {/* AI Response */}
 <div className="flex items-start gap-3">
 <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${chat.isError ? 'bg-red-500' : 'bg-green-500'}`}>
 {chat.isError ? <FiAlertCircle className="text-white text-sm" /> : <FiActivity className="text-white text-sm" />}
 </div>
 <div className={`flex-1 rounded-xl rounded-tl-none px-4 py-3 border shadow-sm ${chat.isError ? 'bg-red-50 border-red-200' : 'bg-white border-purple-200'}`}>
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-2">
 <span className={`text-xs font-bold ${chat.isError ? 'text-red-700' : 'text-green-700'}`}>
 {chat.isError ? 'Error' : 'AI Assistant'}
 </span>
 <span className="text-xs text-gray-400">• {chat.timestamp}</span>
 {chat.isStreaming && (
 <span className="text-xs bg-teal-100 text-purple-600 px-2 py-0.5 rounded-full flex items-center gap-1">
 <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-pulse"></span>
 Streaming...
 </span>
 )}
 </div>
 {!chat.isError && chat.response && !chat.isLoading && (
 <button
 onClick={() => toggleSpeech(chat.response, chat.id)}
 className={`p-1.5 rounded-lg transition-all ${isSpeaking && speakingChatId === chat.id ? 'bg-green-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
 title={isSpeaking && speakingChatId === chat.id ? 'Stop speaking' : 'Read aloud'}
 >
 {isSpeaking && speakingChatId === chat.id ? <FiMicOff className="text-sm" /> : <FiMic className="text-sm" />}
 </button>
 )}
 </div>
 {chat.isLoading ? (
 <div className="flex items-center gap-2 py-4">
 <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
 <span className="text-purple-700 text-sm font-semibold">AI is thinking...</span>
 </div>
 ) : (
 <ChatResponseContent response={chat.response} isError={chat.isError} />
 )}
 </div>
 </div>

 {/* Divider between conversations */}
 {idx < chatHistory.length - 1 && (
 <div className="border-t-2 border-dashed border-purple-200 my-4"></div>
 )}
 </div>
 ))}
 </div>
 ) : (
 <div className="flex flex-col items-center justify-center h-48 text-center space-y-3">
 <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
 <FiActivity className="text-4xl text-purple-400" />
 </div>
 <div>
 <p className="text-xl font-bold text-purple-800 mb-1">Ready for Analysis</p>
 <p className="text-purple-600 text-sm">Upload reports/images and click ASK AI for comprehensive analysis</p>
 </div>
 </div>
 )}
 </div>
 </div>

 {/* Box Footer */}
 <div className="bg-teal-50 px-4 py-3 border-t-2 border-purple-200">
 <p className="text-xs text-purple-700 font-semibold">
 💡 Tip: Each query is saved in conversation history. Scroll to view previous analyses.
 </p>
 </div>
 </div>
 </div>

 {/* Query Input Section WITH UPLOAD STATUS */}
 <div className="bg-purple-200 rounded-xl p-4 shadow-xl border-2 border-purple-400">

 {/* Upload Status Indicators - INSIDE Query Section */}
 {(uploadedImage || uploadedPdfText) && (
 <div className="mb-3 p-3 bg-white/80 backdrop-blur-sm rounded-lg border-2 border-purple-300">
 <div className="flex items-center gap-2 mb-2">
 <FiCheck className="text-green-600 text-base" />
 <span className="text-purple-900 font-bold text-sm">Uploaded Files Ready for Analysis:</span>
 </div>
 <div className="flex flex-wrap gap-2">
 {uploadedImage && (
 <div className="bg-purple-400 border-2 border-purple-400 rounded-lg px-3 py-2 flex items-center gap-2 shadow-md min-w-[180px]">
 <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
 <FiImage className="text-white text-sm" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-purple-900 font-bold text-xs truncate">{uploadedImageName}</p>
 <p className="text-purple-600 text-xs">Medical Image</p>
 </div>
 <button
 onClick={clearImage}
 className="text-purple-600 hover:text-red-600 transition-colors p-1"
 >
 <FiX className="text-base" />
 </button>
 </div>
 )}

 {uploadedPdfText && (
 <div className="bg-purple-100 border-2 border-purple-400 rounded-lg px-3 py-2 flex items-center gap-2 shadow-md min-w-[180px]">
 <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
 <FiFileText className="text-white text-sm" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-purple-900 font-bold text-xs truncate">{uploadedPdfName}</p>
 <p className="text-purple-600 text-xs">PDF ({uploadedPdfText.length} chars)</p>
 </div>
 <button
 onClick={() => setShowPdfModal(true)}
 className="text-purple-600 hover:text-green-600 transition-colors p-1"
 >
 <FiEye className="text-base" />
 </button>
 <button
 onClick={clearPdf}
 className="text-purple-600 hover:text-red-600 transition-colors p-1"
 >
 <FiX className="text-base" />
 </button>
 </div>
 )}
 </div>
 </div>
 )}

 <div className="grid grid-cols-4 gap-3">
 {/* Query Input */}
 <div className="col-span-3 bg-white rounded-lg p-3 border-2 border-purple-300 shadow-md">
 <label className="block text-xs font-bold text-purple-900 mb-1.5 flex items-center gap-1.5">
 <FiFileText className="text-purple-600 text-sm" />
 Enter Your Specific Query (Optional):
 </label>
 <textarea
 value={query}
 onChange={(e) => setQuery(e.target.value)}
 placeholder="E.g., What do the lab results indicate? OR Analyze this X-ray for abnormalities... Leave blank for comprehensive analysis based on selected option above."
 className="w-full h-20 px-3 py-2 bg-teal-50 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-purple-900 resize-none text-sm"
 />
 <div className="flex items-center gap-1.5 mt-1.5 text-xs text-purple-600">
 <FiAlertCircle className="text-xs" />
 <span>AI will analyze your query along with selected option type, uploaded images/PDFs, and patient data for comprehensive response.</span>
 </div>
 </div>

 {/* Control Buttons */}
 <div className="space-y-2">
 <select
 value={selectedOption}
 onChange={(e) => setSelectedOption(e.target.value)}
 className="w-full px-4 py-3 bg-purple-900 hover:bg-purple-800 text-white rounded-lg font-bold border-2 border-purple-700 cursor-pointer transition-all shadow-lg text-sm"
 >
            <option value="Generic">📝 Generic Conversation</option>
 <option value="Explain">📋 Explain Condition</option>
 <option value="Diagnosis">🔬 Diagnosis & Differential</option>
 <option value="Treatment">💊 Treatment Plan</option>
 <option value="Side Effects">⚠️ Side Effects Analysis</option>
 </select>

 <button
 onClick={handleAsk}
 disabled={isLoading}
 className={`w-full px-4 py-3 rounded-lg font-bold border-2 transition-all disabled:opacity-50 shadow-xl transform hover:scale-105 text-sm flex items-center justify-center gap-1.5 bg-green-500 text-white border-green-800`}
 >
 {isLoading ? (
 <div className="flex items-center justify-center gap-1.5">
 <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
 Processing...
 </div>
 ) : (
 <div className="flex items-center justify-center gap-1.5">
 <FiActivity className="text-lg" />
 ASK AI
 </div>
 )}
 </button>

 <button
 onClick={() => setEnableVoiceResponse(!enableVoiceResponse)}
 className={`w-full px-4 py-3 rounded-lg font-bold border-2 transition-all shadow-lg transform hover:scale-105 text-sm flex items-center justify-center gap-1.5 ${
 enableVoiceResponse
 ? 'bg-purple-400 text-white border-purple-800'
 : 'bg-purple-400 text-white border-purple-800'
 }`}
 >
 {enableVoiceResponse ? (
 <>
 <FiMic className="text-lg" />
 Voice Response: ON
 </>
 ) : (
 <>
 <FiMicOff className="text-lg" />
 Get Voice Response
 </>
 )}
 </button>
 </div>
 </div>
 </div>

 {/* Bottom Action Buttons */}
 <div className="grid grid-cols-4 gap-3">
 <button
 onClick={onBack}
 className="bg-purple-400 text-white py-3 rounded-lg font-bold border-2 border-purple-800 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 text-base"
 >
 <FiPlus className="text-lg" />
 New Patient
 </button>

 <label className="bg-purple-400 text-white py-3 rounded-lg font-bold border-2 border-purple-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105 text-base">
 <FiImage className="text-lg" />
 Image Diagnosis
 <input type="file" onChange={handleImageUpload} accept="image/*" className="hidden" />
 </label>

 <button
 onClick={fetchPatientHistory}
 className="bg-purple-400 text-white py-3 rounded-lg font-bold border-2 border-purple-800 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 text-base"
 >
 <FiClock className="text-lg" />
 History
 </button>

 <button
 onClick={generatePDFReport}
 className="bg-purple-400 text-white py-3 rounded-lg font-bold border-2 border-purple-800 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 text-base"
 >
 <FiDownload className="text-lg" />
 Export / Print Report
 </button>
 </div>

 {/* Advertisement Section - Placeholder for future ads (Google Style) */}
 <div className="mt-8 pt-4">
 {/* EI Logo Ad - Google Style Sponsored Content with Background */}
 <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
 <a
 href="#"
 className="block group"
 onClick={(e) => {
 e.preventDefault();
 alert('EI Health Solutions - Advertisement click handler (to be implemented)');
 }}
 >
 <div className="flex items-center gap-3 py-1">
 <div className="flex items-center gap-2 flex-shrink-0">
 <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-medium">Ad</span>
 <div className="w-20 h-8 rounded overflow-hidden flex-shrink-0">
 <img
 src="/edited-photo.png"
 alt="EI Logo"
 className="w-full h-full object-cover"
 onError={(e) => {
 e.target.style.display = 'none';
 e.target.parentElement.innerHTML = '<img src="/edited-photo.png" class="w-full h-full object-cover" />';
 }}
 />
 </div>
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-semibold text-purple-600 group-hover:text-purple-800 truncate">EI Health Solutions</p>
 <p className="text-xs text-gray-600 truncate">Advanced Medical Technology for Modern Healthcare</p>
 </div>
 <div className="flex items-center gap-2 flex-shrink-0">
 <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors">Learn More</span>
 <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
 </svg>
 </div>
 </div>
 </a>
 </div>
 </div>
 </div>

 {/* PDF Content Modal */}
 <AnimatePresence>
 {showPdfModal && pdfContent && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
 onClick={() => setShowPdfModal(false)}
 >
 <motion.div
 initial={{ scale: 0.9, y: 20 }}
 animate={{ scale: 1, y: 0 }}
 exit={{ scale: 0.9, y: 20 }}
 className="bg-white rounded-xl max-w-5xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="bg-purple-400 px-6 py-4 flex items-center justify-between border-b-4 border-purple-800">
 <h3 className="text-xl font-bold text-white flex items-center gap-2">
 <FiFileText className="text-xl" />
 PDF Report: {uploadedPdfName}
 </h3>
 <button onClick={() => setShowPdfModal(false)} className="text-white/80 hover:text-white transition-colors">
 <FiX size={24} />
 </button>
 </div>
 <div className="p-6 overflow-y-auto max-h-[65vh] bg-gray-50">
 <div className="bg-white rounded-lg border-2 border-purple-200 p-4 shadow-md">
 <pre className="whitespace-pre-wrap text-gray-800 text-sm font-sans leading-relaxed">
 {pdfContent}
 </pre>
 </div>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Patient History Modal */}
 <AnimatePresence>
 {showHistoryModal && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
 onClick={() => setShowHistoryModal(false)}
 >
 <motion.div
 initial={{ scale: 0.9, y: 20 }}
 animate={{ scale: 1, y: 0 }}
 exit={{ scale: 0.9, y: 20 }}
 className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="bg-purple-400 px-6 py-4 flex items-center justify-between border-b-4 border-purple-800">
 <h3 className="text-xl font-bold text-white flex items-center gap-2">
 <FiClock className="text-xl" />
 Patient Consultation History
 </h3>
 <button 
 onClick={() => setShowHistoryModal(false)} 
 className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/20 rounded-lg"
 >
 <FiX size={24} />
 </button>
 </div>
 <div className="p-6 overflow-y-auto max-h-[65vh] bg-gray-50">
 {patientHistory && patientHistory.length > 0 ? (
 <div className="space-y-3">
 {patientHistory.map((history, idx) => (
 <div key={idx} className="bg-white rounded-lg border-2 border-purple-200 p-4 shadow-md">
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded-full">
 {history.query_type || 'Consultation'}
 </span>
 <span className="text-xs text-gray-500">
 {new Date(history.timestamp).toLocaleString()}
 </span>
 </div>
 {history.has_image && (
 <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full flex items-center gap-1">
 <FiImage className="text-xs" /> Image
 </span>
 )}
 {history.has_pdf && (
 <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded-full flex items-center gap-1">
 <FiFileText className="text-xs" /> PDF
 </span>
 )}
 </div>
 <div className="mb-2">
 <p className="text-xs font-bold text-gray-600 mb-1">Query:</p>
 <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{history.query || history.custom_query || 'No specific query'}</p>
 </div>
 <div>
 <p className="text-xs font-bold text-gray-600 mb-1">AI Response:</p>
 <div 
 className="text-sm text-gray-700 bg-teal-50 p-3 rounded border border-purple-100 whitespace-pre-wrap break-words overflow-hidden"
 style={{ display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical' }}
 >
 {history.response || history.ai_response || 'No response'}
 </div>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="flex flex-col items-center justify-center py-12 text-center">
 <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mb-4">
 <FiClock className="text-3xl text-purple-400" />
 </div>
 <p className="text-lg font-bold text-gray-600 mb-1">No History Found</p>
 <p className="text-sm text-gray-500">No previous consultations for this patient.</p>
 </div>
 )}
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Demo Case Studies Modal */}
 <AnimatePresence>
 {showDemoModal && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
 onClick={() => setShowDemoModal(false)}
 >
 <motion.div
 initial={{ scale: 0.9, y: 20 }}
 animate={{ scale: 1, y: 0 }}
 exit={{ scale: 0.9, y: 20 }}
 className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="bg-purple-400 px-6 py-4 flex items-center justify-between border-b-4 border-purple-800">
 <h3 className="text-xl font-bold text-white flex items-center gap-2">
 <FiActivity className="text-xl" />
 Demo Analysis for: {editableData.pname || 'Current Patient'}
 </h3>
 <button
 onClick={() => setShowDemoModal(false)}
 className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/20 rounded-lg"
 >
 <FiX size={24} />
 </button>
 </div>
 <div className="p-6 overflow-y-auto max-h-[65vh]">
 {demoCases && demoCases.length > 0 ? (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {demoCases.map((demoCase) => (
 <div
 key={demoCase.id}
 className="bg-white rounded-xl border-2 border-purple-200 p-5 shadow-lg hover:shadow-xl transition-all cursor-pointer transform hover:scale-105"
 onClick={() => runDemoCase(demoCase)}
 >
 <div className="flex items-center gap-3 mb-3">
 <div className="w-12 h-12 rounded-full bg-purple-400 flex items-center justify-center text-white font-bold text-xl">
 {demoCase.id}
 </div>
 <div className="flex-1">
 <h4 className="font-bold text-purple-900 text-sm">{demoCase.title}</h4>
 </div>
 </div>
 
 <div className="space-y-2 text-sm">
 <div className="flex items-center gap-2 text-gray-700">
 <FiFileText className="text-purple-600 text-xs" />
 <span className="font-medium">{demoCase.description}</span>
 </div>
 <div className="flex items-center gap-2 text-gray-600 text-xs">
 <span className="bg-teal-100 px-2 py-1 rounded font-semibold">{demoCase.query_type}</span>
 <span className="text-gray-500">Analysis Type</span>
 </div>
 </div>
 
 <div className="mt-4 pt-4 border-t border-purple-100">
 <button className="w-full py-2.5 bg-purple-400 text-white rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md">
 <FiActivity className="text-sm" />
 Run This Analysis
 </button>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="flex flex-col items-center justify-center py-16 text-center">
 <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mb-4">
 <FiActivity className="text-4xl text-purple-400" />
 </div>
 <p className="text-lg font-bold text-gray-700 mb-2">Loading Demo Cases...</p>
 <p className="text-sm text-gray-500">Please wait while we fetch the demo cases.</p>
 </div>
 )}
 </div>
 <div className="bg-purple-50 px-6 py-4 border-t-2 border-purple-200">
 <p className="text-xs text-purple-700 font-semibold">
 💡 Select any analysis type to see how AI evaluates this patient from different clinical perspectives.
 </p>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
};

export default IntelliHealthInterface;
