import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';

/**
 * Export quiz result to PDF with detailed formatting
 * Includes: Logo, Score Chart, Questions & Answers, AI Feedback
 */
export const exportQuizToPDF = (quiz, userName = 'Student') => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Colors
  const primaryColor = [99, 102, 241]; // Indigo
  const successColor = [34, 197, 94]; // Green
  const errorColor = [239, 68, 68]; // Red
  const grayColor = [107, 114, 128]; // Gray
  
  let yPos = 20;
  
  // Header with background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.text('EduVate', 14, 20);
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text('Quiz Result Report', 14, 30);
  
  // Date & User (top right)
  doc.setFontSize(10);
  const dateStr = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  doc.text(dateStr, pageWidth - 14, 20, { align: 'right' });
  doc.text(userName, pageWidth - 14, 27, { align: 'right' });
  
  yPos = 50;
  
  // Quiz Title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text(quiz.title || 'Quiz Result', 14, yPos);
  yPos += 12;
  
  // Score Section
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...grayColor);
  doc.text('Submitted on: ' + new Date(quiz.submitted_at).toLocaleString('en-US'), 14, yPos);
  yPos += 10;
  
  // Score Box
  const score = quiz.score || 0;
  const scoreColor = score >= 80 ? successColor : score >= 60 ? primaryColor : errorColor;
  
  doc.setFillColor(...scoreColor);
  doc.roundedRect(14, yPos, 50, 30, 3, 3, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont(undefined, 'bold');
  doc.text(score.toFixed(0) + '%', 39, yPos + 20, { align: 'center' });
  
  // Score Label
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Final Score', 70, yPos + 10);
  
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...grayColor);
  doc.text(`${quiz.questions?.length || 0} Questions`, 70, yPos + 18);
  
  const correctCount = quiz.questions?.filter(q => {
    if (q.type === 'MCQ') {
      return quiz.user_answers?.[q.id] === q.correct_answer;
    }
    return false;
  }).length || 0;
  
  doc.text(`${correctCount} Correct Answers`, 70, yPos + 25);
  
  yPos += 40;
  
  // Divider
  doc.setDrawColor(...grayColor);
  doc.setLineWidth(0.5);
  doc.line(14, yPos, pageWidth - 14, yPos);
  yPos += 10;
  
  // Questions & Answers Section
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Detailed Results', 14, yPos);
  yPos += 8;
  
  quiz.questions?.forEach((question, index) => {
    // Check if we need a new page
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }
    
    const userAnswer = quiz.user_answers?.[question.id];
    const isCorrect = question.type === 'MCQ' && userAnswer === question.correct_answer;
    const isWrong = question.type === 'MCQ' && userAnswer !== question.correct_answer;
    
    // Question Number & Type
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`${index + 1}. ${question.type === 'MCQ' ? 'Multiple Choice' : 'Essay'}`, 14, yPos);
    
    // Correct/Incorrect Badge
    if (question.type === 'MCQ') {
      const badgeX = pageWidth - 40;
      if (isCorrect) {
        doc.setFillColor(...successColor);
        doc.roundedRect(badgeX, yPos - 4, 26, 6, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text('CORRECT', badgeX + 13, yPos, { align: 'center' });
      } else {
        doc.setFillColor(...errorColor);
        doc.roundedRect(badgeX, yPos - 4, 26, 6, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text('INCORRECT', badgeX + 13, yPos, { align: 'center' });
      }
    }
    
    yPos += 6;
    
    // Question Text
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    const questionLines = doc.splitTextToSize(question.question, pageWidth - 28);
    doc.text(questionLines, 14, yPos);
    yPos += questionLines.length * 5;
    
    if (question.type === 'MCQ' && question.options) {
      yPos += 3;
      
      // Options
      ['A', 'B', 'C', 'D'].forEach(opt => {
        if (question.options[opt]) {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
          }
          
          const isUserAnswer = userAnswer === opt;
          const isCorrectAnswer = question.correct_answer === opt;
          
          // Option background
          if (isCorrectAnswer) {
            doc.setFillColor(220, 252, 231); // Light green
            doc.roundedRect(18, yPos - 4, pageWidth - 36, 7, 1, 1, 'F');
          } else if (isUserAnswer) {
            doc.setFillColor(254, 226, 226); // Light red
            doc.roundedRect(18, yPos - 4, pageWidth - 36, 7, 1, 1, 'F');
          }
          
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);
          const optionText = `${opt}. ${question.options[opt]}`;
          const optionLines = doc.splitTextToSize(optionText, pageWidth - 44);
          doc.text(optionLines, 20, yPos);
          
          // Markers
          if (isCorrectAnswer) {
            doc.setTextColor(...successColor);
            doc.setFont(undefined, 'bold');
            doc.text('✓', pageWidth - 20, yPos);
          } else if (isUserAnswer) {
            doc.setTextColor(...errorColor);
            doc.setFont(undefined, 'bold');
            doc.text('✗', pageWidth - 20, yPos);
          }
          
          doc.setFont(undefined, 'normal');
          yPos += optionLines.length * 5;
        }
      });
    } else if (question.type === 'ESSAY') {
      yPos += 3;
      
      // User Answer
      const answerText = userAnswer || 'No answer provided';
      const answerLines = doc.splitTextToSize(answerText, pageWidth - 44);
      const answerBoxHeight = answerLines.length * 5 + 6;
      
      doc.setFillColor(249, 250, 251); // Light gray
      doc.roundedRect(18, yPos - 3, pageWidth - 36, answerBoxHeight, 1, 1, 'F');
      
      doc.setFontSize(8);
      doc.setTextColor(...grayColor);
      doc.text('Your Answer:', 20, yPos);
      yPos += 5;
      
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      
      // Check page break for long answers
      if (yPos + answerLines.length * 5 > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.text(answerLines, 20, yPos);
      yPos += answerLines.length * 5 + 3;
      
      // AI Feedback
      if (question.ai_feedback) {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
        }
        
        const feedbackLines = doc.splitTextToSize(question.ai_feedback, pageWidth - 44);
        const feedbackBoxHeight = feedbackLines.length * 5 + 6;
        
        doc.setFillColor(239, 246, 255); // Light blue
        doc.roundedRect(18, yPos - 3, pageWidth - 36, feedbackBoxHeight, 1, 1, 'F');
        
        doc.setFontSize(8);
        doc.setTextColor(...primaryColor);
        doc.text('AI Feedback:', 20, yPos);
        yPos += 5;
        
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text(feedbackLines, 20, yPos);
        yPos += feedbackLines.length * 5 + 3;
      }
    }
    
    yPos += 8;
    
    // Separator
    if (index < quiz.questions.length - 1) {
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.3);
      doc.line(14, yPos, pageWidth - 14, yPos);
      yPos += 6;
    }
  });
  
  // Footer on last page
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...grayColor);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      'Generated by EduVate - AI-Powered Learning Platform',
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }
  
  // Save PDF
  const fileName = `${quiz.title?.replace(/[^a-z0-9]/gi, '_') || 'quiz'}_result_${Date.now()}.pdf`;
  doc.save(fileName);
};

/**
 * Export quiz result to CSV with analytics data
 * Includes: All questions, user answers, correct answers, feedback, timestamps
 */
export const exportQuizToCSV = (quiz) => {
  const rows = [];
  
  // Add metadata rows
  rows.push(['Quiz Report - EduVate']);
  rows.push(['Quiz Title', quiz.title || 'N/A']);
  rows.push(['Submitted At', new Date(quiz.submitted_at).toLocaleString('en-US')]);
  rows.push(['Final Score', `${quiz.score?.toFixed(2) || 0}%`]);
  rows.push(['Total Questions', quiz.questions?.length || 0]);
  rows.push([]); // Empty row
  
  // Column headers
  rows.push([
    'Question #',
    'Type',
    'Question',
    'Your Answer',
    'Correct Answer',
    'Status',
    'Points Earned',
    'Max Points',
    'AI Feedback',
    'Page Reference'
  ]);
  
  // Question data
  quiz.questions?.forEach((question, index) => {
    const userAnswer = quiz.user_answers?.[question.id];
    let userAnswerText = userAnswer || 'No answer';
    let correctAnswerText = question.correct_answer || 'N/A';
    let status = 'N/A';
    
    if (question.type === 'MCQ') {
      // Format MCQ answers
      if (userAnswer && question.options?.[userAnswer]) {
        userAnswerText = `${userAnswer}. ${question.options[userAnswer]}`;
      }
      if (question.correct_answer && question.options?.[question.correct_answer]) {
        correctAnswerText = `${question.correct_answer}. ${question.options[question.correct_answer]}`;
      }
      status = userAnswer === question.correct_answer ? 'Correct' : 'Incorrect';
    } else {
      status = 'Essay - See Feedback';
      correctAnswerText = 'Subjective';
    }
    
    rows.push([
      index + 1,
      question.type === 'MCQ' ? 'Multiple Choice' : 'Essay',
      question.question,
      userAnswerText,
      correctAnswerText,
      status,
      question.type === 'MCQ' ? (status === 'Correct' ? question.points : 0) : 'See Feedback',
      question.points,
      question.ai_feedback || 'No feedback',
      question.page_reference || 'N/A'
    ]);
  });
  
  // Add summary section
  rows.push([]);
  rows.push(['Summary Statistics']);
  
  const mcqQuestions = quiz.questions?.filter(q => q.type === 'MCQ') || [];
  const essayQuestions = quiz.questions?.filter(q => q.type === 'ESSAY') || [];
  const correctMcq = mcqQuestions.filter(q => quiz.user_answers?.[q.id] === q.correct_answer).length;
  
  rows.push(['Total MCQ Questions', mcqQuestions.length]);
  rows.push(['Correct MCQ Answers', correctMcq]);
  rows.push(['MCQ Accuracy', mcqQuestions.length > 0 ? `${((correctMcq / mcqQuestions.length) * 100).toFixed(2)}%` : 'N/A']);
  rows.push(['Total Essay Questions', essayQuestions.length]);
  
  // Convert to CSV
  const csv = Papa.unparse(rows, {
    quotes: true,
    delimiter: ',',
    newline: '\n'
  });
  
  // Download CSV
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const fileName = `${quiz.title?.replace(/[^a-z0-9]/gi, '_') || 'quiz'}_result_${Date.now()}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export quiz list to CSV (for analytics)
 */
export const exportQuizListToCSV = (quizzes) => {
  const rows = [];
  
  // Metadata
  rows.push(['Quiz History Export - EduVate']);
  rows.push(['Exported At', new Date().toLocaleString('en-US')]);
  rows.push(['Total Quizzes', quizzes.length]);
  rows.push([]);
  
  // Headers
  rows.push([
    'Quiz Title',
    'Subject',
    'Total Questions',
    'Score (%)',
    'Status',
    'Created At',
    'Submitted At'
  ]);
  
  // Data
  quizzes.forEach(quiz => {
    rows.push([
      quiz.title,
      quiz.subject_id || 'N/A',
      quiz.total_questions,
      quiz.score?.toFixed(2) || 'Not Submitted',
      quiz.submitted_at ? 'Completed' : 'Pending',
      new Date(quiz.created_at).toLocaleString('en-US'),
      quiz.submitted_at ? new Date(quiz.submitted_at).toLocaleString('en-US') : 'N/A'
    ]);
  });
  
  // Statistics
  const completedQuizzes = quizzes.filter(q => q.submitted_at);
  const avgScore = completedQuizzes.length > 0
    ? completedQuizzes.reduce((sum, q) => sum + (q.score || 0), 0) / completedQuizzes.length
    : 0;
  
  rows.push([]);
  rows.push(['Statistics']);
  rows.push(['Completed Quizzes', completedQuizzes.length]);
  rows.push(['Average Score', `${avgScore.toFixed(2)}%`]);
  
  // Convert and download
  const csv = Papa.unparse(rows, {
    quotes: true,
    delimiter: ',',
    newline: '\n'
  });
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `quiz_history_${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
