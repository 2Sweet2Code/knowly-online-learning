import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Database } from '@/integrations/supabase/types';
import { useNavigate } from 'react-router-dom';

type QuestionRow = Database['public']['Tables']['questions']['Row'];
type QuestionWithCourseTitle = QuestionRow & {
  courses: { title: string } | null;
};

type Question = Omit<QuestionRow, 'instructor_id'> & {
  course_title: string;
  question: string; // added question property
};

export const DashboardQuestions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [isCreatingComment, setIsCreatingComment] = useState(false);

  // Fetch questions
  const { data: questions = [], isLoading, isError, error } = useQuery<Question[], Error>({
    queryKey: ['instructorQuestions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          courses (
            title
          )
        `)
        .eq('instructor_id', user.id)
        .order('created_at', { ascending: false })
        .returns<QuestionWithCourseTitle[]>();
      
      if (error) {
        console.error("Error fetching questions:", error);
        if (error.code === '42P01') {
          console.warn("'questions' table not found, returning empty array.");
          return [];
        } else {
          throw error;
        }
      }
      
      const formattedData: Question[] = data?.map((q) => {
        const { courses, ...restOfQuestion } = q;
        return {
          ...restOfQuestion,
          course_title: courses?.title || 'Kurs i panjohur'
        };
      }) || [];
      
      return formattedData;
    },
    enabled: !!user?.id,
    retry: 1,
    retryDelay: 1000
  });

  // Create a comment from a question
  const createCommentFromQuestion = async (question: Question) => {
    if (!user) return;
    
    setIsCreatingComment(true);
    try {
      // First create the comment
      const { data: comment, error: commentError } = await supabase
        .from('comments')
        .insert({
          content: question.question,
          user_id: question.student_id,
          course_id: question.course_id,
          parent_id: null,
          is_question: true
        })
        .select()
        .single();
      
      if (commentError) throw commentError;
      
      // Then update the question with the comment ID
      const { error: updateError } = await supabase
        .from('questions')
        .update({ 
          status: 'converted_to_comment',
          linked_comment_id: comment.id 
        })
        .eq('id', question.id);
      
      if (updateError) throw updateError;
      
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['instructorQuestions', user.id] });
      
      toast({
        title: 'Sukses!',
        description: 'Pyetja u konvertua në koment me sukses.',
      });
      
      // Navigate to the course discussion
      navigate(`/courses/${question.course_id}/discussion`);
      
    } catch (error) {
      console.error('Error converting question to comment:', error);
      toast({
        title: 'Gabim',
        description: 'Ndodhi një gabim gjatë konvertimit të pyetjes në koment.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingComment(false);
    }
  };

  // Answer question mutation
  const answerMutation = useMutation({
    mutationFn: async ({ questionId, answer }: { questionId: string; answer: string }) => {
      const updatePayload = {
        answer,
        status: 'answered' as const,
        updated_at: new Date().toISOString()
      };

      try {
        const { data, error } = await supabase
          .from('questions')
          .update(updatePayload)
          .eq('id', questionId)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } catch (err) {
        console.error("Error answering question:", err);
        
        // Skip localStorage in SSR/SSG environments
        if (typeof window !== 'undefined') {
          try {
            const localQuestions: Question[] = JSON.parse(
              localStorage.getItem('instructor-questions') || '[]'
            );
            const updatedQuestions = localQuestions.map((q) =>
              q.id === questionId
                ? { ...q, answer, status: 'answered', updated_at: new Date().toISOString() }
                : q
            );
            
            localStorage.setItem('instructor-questions', JSON.stringify(updatedQuestions));
            return { id: questionId, answer, status: 'answered' } as Partial<Question>;
          } catch (localError) {
            console.error("Error saving answer to localStorage:", localError);
            // Continue to throw the original error instead of the localStorage error
          }
        }
        
        // Re-throw the original error if we get here
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructorQuestions', user?.id] });
      toast({
        title: 'Sukses!',
        description: 'Përgjigja u dërgua me sukses.',
      });
      setSelectedQuestion(null);
      setAnswerText('');
    },
    onError: () => {
      toast({
        title: 'Gabim',
        description: 'Ndodhi një gabim gjatë dërgimit të përgjigjes. Ju lutemi provoni përsëri.',
        variant: 'destructive',
      });
    }
  });

  const handleAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedQuestion || !answerText.trim()) {
      toast({
        title: 'Gabim',
        description: 'Ju lutemi shkruani një përgjigje para se ta dërgoni.',
        variant: 'destructive',
      });
      return;
    }
    
    answerMutation.mutate({ 
      questionId: selectedQuestion.id, 
      answer: answerText.trim() 
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-brown" />
        <span className="ml-2 text-lg">Po ngarkohen pyetjet...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-10 bg-red-50 border border-red-200 rounded-lg p-6">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
        <h4 className="text-lg font-semibold text-red-700 mb-2">Gabim gjatë ngarkimit të pyetjeve</h4>
        <p className="text-red-600 mb-4">
          {error?.message || "Ndodhi një gabim i papritur. Ju lutemi provoni përsëri më vonë."}
        </p>
        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => queryClient.refetchQueries({ queryKey: ['instructorQuestions', user?.id] })}
        >
          Provo Përsëri
        </button>
      </div>
    );
  }

  const pendingQuestions = questions.filter((q) => q.status === 'pending');
  const answeredQuestions = questions.filter((q) => q.status === 'answered');

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <h3 className="text-2xl font-playfair font-bold mb-6">Pyetjet e Studentëve</h3>
      
      {questions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Nuk ka pyetje të dërguara ende.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-xl font-semibold mb-4">Pyetje Pa Përgjigje ({pendingQuestions.length})</h4>
            
            {pendingQuestions.length === 0 ? (
              <p className="text-gray-600">Nuk ka pyetje pa përgjigje.</p>
            ) : (
              <div className="space-y-4">
                {pendingQuestions.map((question) => (
                  <div 
                    key={question.id} 
                    className={`p-4 border rounded-md cursor-pointer transition-all ${
                      selectedQuestion?.id === question.id 
                        ? 'border-brown bg-brown/5' 
                        : 'border-lightGray hover:border-brown/50'
                    }`}
                    onClick={() => setSelectedQuestion(question)}
                  >
                    <p className="font-semibold">{question.student_name}</p>
                    <p className="text-sm text-gray-600 mb-2">
                      Kursi: {question.course_title}
                    </p>
                    <p className="mb-2">{question.question}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(question.created_at).toLocaleDateString('sq-AL')}
                    </p>
                    <div className="mt-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedQuestion(question);
                            setAnswerText(question.answer || '');
                          }}
                          className="btn btn-primary btn-sm w-full"
                        >
                          {question.answer ? 'Shiko Përgjigjen' : 'Përgjigju'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            createCommentFromQuestion(question);
                          }}
                          className="btn btn-outline btn-sm w-full flex items-center justify-center gap-1"
                          disabled={isCreatingComment}
                        >
                          <MessageSquare className="h-4 w-4" />
                          {isCreatingComment ? 'Po krijohet...' : 'Konverto në Koment'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div>
            {selectedQuestion ? (
              <div className="border border-lightGray rounded-md p-4">
                <h4 className="text-xl font-semibold mb-4">Përgjigju Pyetjes</h4>
                
                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                  <p className="font-semibold">{selectedQuestion.student_name}</p>
                  <p className="text-sm text-gray-600 mb-2">
                    Kursi: {selectedQuestion.course_title}
                  </p>
                  <p className="mb-2">{selectedQuestion.question}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(selectedQuestion.created_at).toLocaleDateString('sq-AL')}
                  </p>
                </div>
                
                <form onSubmit={handleAnswerSubmit}>
                  <div className="mb-4">
                    <label htmlFor="answer" className="block mb-2 font-semibold text-brown">
                      Përgjigja juaj:
                    </label>
                    <textarea
                      id="answer"
                      className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown min-h-[150px]"
                      placeholder="Shkruani përgjigjen tuaj këtu..."
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setSelectedQuestion(null);
                        setAnswerText('');
                      }}
                    >
                      Anulo
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary flex items-center justify-center"
                      disabled={answerMutation.isPending}
                    >
                      {answerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Duke dërguar...
                        </>
                      ) : (
                        "Dërgo Përgjigjen"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="border border-dashed border-lightGray rounded-md p-6 flex flex-col items-center justify-center h-full">
                <p className="text-gray-600 mb-2">Zgjidhni një pyetje për t'iu përgjigjur</p>
                <p className="text-sm text-gray-500">Klikoni në një pyetje nga lista e pyetjeve pa përgjigje</p>
              </div>
            )}
            
            {answeredQuestions.length > 0 && (
              <div className="mt-8">
                <h4 className="text-xl font-semibold mb-4">Pyetje të Përgjigjura së Fundmi</h4>
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {answeredQuestions.slice(0, 5).map((question) => (
                    <div key={question.id} className="p-4 border border-lightGray rounded-md">
                      <p className="font-semibold">{question.student_name}</p>
                      <p className="text-sm text-gray-600 mb-2">
                        Kursi: {question.course_title}
                      </p>
                      <p className="mb-2">{question.question}</p>
                      <div className="p-3 bg-gray-50 rounded-md mb-2">
                        <p className="text-sm font-medium">Përgjigja juaj:</p>
                        <p>{question.answer}</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        Përgjigje më: {new Date(question.updated_at || '').toLocaleDateString('sq-AL')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
